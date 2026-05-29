/* backend/controllers/paymentController.js
   SIMPLIFIED:
   - Supports single orderId OR array of orderIds for all payment methods
   - When consumer pays (eSewa / COD / FonePay), shipment.paymentStatus → "paid"
   - Order.paymentStatus → "paid"
   - Farmer payout queue picks up all orders where paymentStatus = "paid"
     and shipments.farmerPaid = false  (no release step needed)
*/

import crypto   from "crypto";
import Order    from "../models/Order.js";
import User     from "../models/User.js";
import fs       from "fs";
import path     from "path";
import { sendNotification } from "../utils/notificationHelpers.js";

const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";
const ESEWA_SECRET_KEY    = process.env.ESEWA_SECRET_KEY    || "8gBm/:&EnhH.1/q";
const ESEWA_BASE_URL      = process.env.ESEWA_BASE_URL      || "https://rc-epay.esewa.com.np";
const FRONTEND_URL        = process.env.FRONTEND_URL        || "http://localhost:5173";

const PRIVATE_DIR = path.join(process.cwd(), "uploads", "private");
if (!fs.existsSync(PRIVATE_DIR)) fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const generateEsewaSignature = (totalAmount, transactionUuid, productCode) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac("sha256", ESEWA_SECRET_KEY).update(message).digest("base64");
};

const verifyEsewaSignature = (responseData) => {
  const { signed_field_names, signature } = responseData;
  if (!signed_field_names || !signature) return false;
  const fields   = signed_field_names.split(",");
  const message  = fields.map((f) => `${f}=${responseData[f] ?? ""}`).join(",");
  const expected = crypto.createHmac("sha256", ESEWA_SECRET_KEY).update(message).digest("base64");
  return expected === signature;
};

/* ── Farmer Payment Methods ── */
export const getFarmerPaymentMethods = async (req, res) => {
  try {
    const farmer = await User.findById(req.params.farmerId).select(
      "paymentMethods preferredPaymentMethod firstName lastName"
    );
    if (!farmer || farmer.role !== "farmer")
      return res.status(404).json({ message: "Farmer not found" });
    res.json({
      farmerId:               farmer._id,
      farmerName:             `${farmer.firstName} ${farmer.lastName}`,
      paymentMethods:         farmer.paymentMethods,
      preferredPaymentMethod: farmer.preferredPaymentMethod,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMyPaymentMethods = async (req, res) => {
  try {
    const { paymentMethods, preferredPaymentMethod } = req.body;
    const farmer = await User.findById(req.user._id);
    if (!farmer || farmer.role !== "farmer")
      return res.status(403).json({ message: "Only farmers can set payment methods" });
    if (paymentMethods)         farmer.paymentMethods         = paymentMethods;
    if (preferredPaymentMethod) farmer.preferredPaymentMethod = preferredPaymentMethod;
    await farmer.save();
    res.json({ message: "Payment methods updated", paymentMethods: farmer.paymentMethods });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const uploadPaymentQR = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ message: "QR code uploaded", qrCodeImage: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   INITIATE ESEWA — supports single orderId OR array of orderIds
───────────────────────────────────────────────────────────── */
export const initiateEsewa = async (req, res) => {
  try {
    const { orderId, orderIds } = req.body;
    const ids = orderIds?.length ? orderIds : [orderId];

    const orders = await Order.find({ _id: { $in: ids } });
    if (!orders.length) return res.status(404).json({ message: "Orders not found" });

    // Verify all belong to this consumer
    for (const order of orders) {
      if (order.consumer.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Unauthorized" });
      if (order.status === "cancelled")
        return res.status(400).json({ message: `Order #${order._id.toString().slice(-6)} has been cancelled` });
    }

    const totalAmount      = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const itemsAndDelivery = orders.reduce((s, o) => s + (o.itemsSubtotal || 0) + (o.deliveryTotal || 0), 0);
    const platformCharge   = orders.reduce((s, o) => s + (o.platformCharge ?? 25), 0);

    // Combined transaction UUID encodes all order IDs
    const transactionUuid = `${ids.join("_")}-${Date.now()}`;

    // Save transactionUuid on all orders
    for (const order of orders) {
      order.esewaTransactionUuid = transactionUuid;
      await order.save();
    }

    const signature = generateEsewaSignature(totalAmount, transactionUuid, ESEWA_MERCHANT_CODE);

    res.json({
      paymentUrl:              `${ESEWA_BASE_URL}/api/epay/main/v2/form`,
      amount:                  itemsAndDelivery,
      tax_amount:              0,
      total_amount:            totalAmount,
      transaction_uuid:        transactionUuid,
      product_code:            ESEWA_MERCHANT_CODE,
      product_service_charge:  platformCharge,
      product_delivery_charge: 0,
      success_url:             `${FRONTEND_URL}/payment/esewa/success`,
      failure_url:             `${FRONTEND_URL}/payment/esewa/failure`,
      signed_field_names:      "total_amount,transaction_uuid,product_code",
      signature,
    });
  } catch (err) {
    console.error("[eSewa initiate] error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const verifyEsewa = async (req, res) => {
  try {
    const { data: encodedData } = req.body;
    if (!encodedData)
      return res.status(400).json({ message: "Missing payment data" });

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf8"));
    } catch (e) {
      return res.status(400).json({ message: "Invalid payment data encoding" });
    }

    if (!verifyEsewaSignature(decoded))
      return res.status(400).json({ message: "Invalid payment signature" });

    if ((decoded.status || "").toUpperCase().trim() !== "COMPLETE")
      return res.status(400).json({ message: `Payment not complete. Status: ${decoded.status}` });

    const txUuid = decoded.transaction_uuid || "";

    const withoutTimestamp = txUuid.replace(/-\d+$/, "");
    const orderIdParts     = withoutTimestamp.split("_");

    const orders = await Order.find({ _id: { $in: orderIdParts } });
    if (!orders.length) return res.status(404).json({ message: "Orders not found" });

    for (const order of orders) {
      order.shipments = order.shipments.map((s) => ({
        ...s.toObject(),
        paymentMethod: "esewa",
        paymentStatus: "paid",
        paymentDate:   new Date(),
        transactionId: decoded.transaction_code,
      }));
      order.paymentType   = "pre_payment";
      order.paymentStatus = "paid";
      await order.save();

      await sendNotification(
        order.consumer,
        "payment_paid",
        `Payment received for order #${order._id.toString().slice(-6)}`,
        "Your eSewa payment was successful. The farmer will prepare your order.",
        { orderId: order._id }
      );
      for (const shipment of order.shipments) {
        await sendNotification(
          shipment.farmer,
          "payment_submitted",
          `Payment received for order #${order._id.toString().slice(-6)}`,
          "Consumer paid via eSewa. You'll receive your payout from admin.",
          { orderId: order._id }
        );
      }
    }

    res.json({ message: "eSewa payment verified.", orders });
  } catch (err) {
    console.error("[eSewa verify] error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const confirmCOD = async (req, res) => {
  try {
    const { orderId, orderIds } = req.body;
    const ids = orderIds?.length ? orderIds : [orderId];

    const orders = await Order.find({ _id: { $in: ids } });
    if (!orders.length) return res.status(404).json({ message: "Orders not found" });

    for (const order of orders) {
      if (order.consumer.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Unauthorized" });
      if (order.status === "cancelled")
        return res.status(400).json({ message: `Order #${order._id.toString().slice(-6)} has been cancelled` });

      order.shipments = order.shipments.map((s) => ({
        ...s.toObject(),
        paymentMethod: "cash_on_delivery",
        paymentStatus: "paid",
      }));
      order.paymentType   = "post_payment";
      order.paymentStatus = "paid";
      await order.save();

      for (const shipment of order.shipments) {
        await sendNotification(
          shipment.farmer,
          "payment_submitted",
          `COD order #${order._id.toString().slice(-6)}`,
          "Consumer selected Cash on Delivery. Prepare the order for delivery.",
          { orderId: order._id }
        );
      }
    }

    res.json({ message: "Cash on delivery confirmed", orders });
  } catch (err) {
    console.error("[COD confirm] error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const confirmFonePay = async (req, res) => {
  try {
    const { orderId, orderIds } = req.body;
    const ids = orderIds?.length ? orderIds : [orderId];

    const orders = await Order.find({ _id: { $in: ids } });
    if (!orders.length) return res.status(404).json({ message: "Orders not found" });

    for (const order of orders) {
      if (order.consumer.toString() !== req.user._id.toString())
        return res.status(403).json({ message: "Unauthorized" });
      if (order.status === "cancelled")
        return res.status(400).json({ message: `Order #${order._id.toString().slice(-6)} has been cancelled` });

      order.shipments = order.shipments.map((s) => ({
        ...s.toObject(),
        paymentMethod: "fonepay",
        paymentStatus: "paid",
      }));
      order.paymentType   = "post_payment";
      order.paymentStatus = "paid";
      await order.save();

      for (const shipment of order.shipments) {
        await sendNotification(
          shipment.farmer,
          "payment_submitted",
          `FonePay order #${order._id.toString().slice(-6)}`,
          "Consumer selected FonePay on Delivery. Prepare the order.",
          { orderId: order._id }
        );
      }
    }

    res.json({ message: "FonePay on delivery confirmed", orders });
  } catch (err) {
    console.error("[FonePay confirm] error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Mark FonePay received (farmer) ── */
export const markFonePayReceived = async (req, res) => {
  try {
    const { orderId, transactionId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const idx = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (idx === -1) return res.status(403).json({ message: "Unauthorized" });
    order.shipments[idx].paymentDate = new Date();
    if (transactionId) order.shipments[idx].transactionId = transactionId;
    await order.save();
    await sendNotification(
      order.consumer,
      "payment_paid",
      `FonePay payment confirmed for order #${order._id.toString().slice(-6)}`,
      "The farmer has confirmed your FonePay payment.",
      { orderId: order._id }
    );
    res.json({ message: "FonePay marked as received", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Mark COD received (farmer) ── */
export const markCODReceived = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const idx = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (idx === -1) return res.status(403).json({ message: "Unauthorized" });
    order.shipments[idx].paymentDate = new Date();
    await order.save();
    await sendNotification(
      order.consumer,
      "payment_paid",
      `Cash received for order #${order._id.toString().slice(-6)}`,
      "The farmer has confirmed cash payment.",
      { orderId: order._id }
    );
    res.json({ message: "COD marked as received", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Serve private files ── */
export const servePaymentFile = async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(PRIVATE_DIR, filename);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: "File not found" });
    const order = await Order.findOne({
      $or: [
        { consumer: req.user._id, "shipments.paymentProof": { $regex: filename } },
        { shipments: { $elemMatch: { farmer: req.user._id, paymentProof: { $regex: filename } } } },
      ],
    });
    if (!order) return res.status(403).json({ message: "Forbidden" });
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Farmer verifies manual payment ── */
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const idx = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (idx === -1) return res.status(403).json({ message: "Unauthorized" });
    order.shipments[idx].paymentStatus = status;
    await order.save();
    await sendNotification(
      order.consumer,
      `payment_${status}`,
      `Payment ${status}`,
      `Your payment for order #${order._id.toString().slice(-6)} has been ${status}`,
      { orderId: order._id }
    );
    res.json({ message: `Payment ${status}`, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};