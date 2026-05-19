import crypto   from "crypto";
import axios    from "axios";
import Order    from "../models/Order.js";
import User     from "../models/User.js";
import fs       from "fs";
import path     from "path";
import { sendNotification } from "../utils/notificationHelpers.js";

const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";
const ESEWA_SECRET_KEY    = process.env.ESEWA_SECRET_KEY    || "8gBm/:&EnhH.1/q";
const ESEWA_BASE_URL      = process.env.ESEWA_BASE_URL      || "https://rc-epay.esewa.com.np";

const KHALTI_SECRET_KEY   = process.env.KHALTI_SECRET_KEY   || "test_secret_key_dc74e0fd57cb46cd93832aee0a390234";
const KHALTI_BASE_URL     = process.env.KHALTI_BASE_URL     || "https://dev.khalti.com";

const FRONTEND_URL        = process.env.FRONTEND_URL        || "http://localhost:5173";

const PRIVATE_DIR = path.join(process.cwd(), "uploads", "private");
if (!fs.existsSync(PRIVATE_DIR)) fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const generateEsewaSignature = (totalAmount, transactionUuid, productCode) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac("sha256", ESEWA_SECRET_KEY).update(message).digest("base64");
};

const verifyEsewaSignature = (responseData) => {
  const { signed_field_names, signature } = responseData;
  if (!signed_field_names || !signature) {
    console.error("[eSewa verify] Missing signed_field_names or signature");
    return false;
  }
  const fields  = signed_field_names.split(",");
  const message = fields.map((f) => `${f}=${responseData[f] ?? ""}`).join(",");
  console.log("[eSewa verify] Signed message:", message);
  const expected = crypto.createHmac("sha256", ESEWA_SECRET_KEY).update(message).digest("base64");
  console.log("[eSewa verify] Expected:", expected, "| Received:", signature, "| Match:", expected === signature);
  return expected === signature;
};

/* ─────────────────────────────────────────────────────────────
   FARMER PAYMENT METHODS
───────────────────────────────────────────────────────────── */
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
   INITIATE ESEWA — POST /api/payments/esewa/initiate
   FIX ES704: platformCharge goes into product_service_charge
   so: amount + 0 + platformCharge + 0 = total_amount exactly
───────────────────────────────────────────────────────────── */
export const initiateEsewa = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.consumer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    const transactionUuid  = `${orderId}-${Date.now()}`;
    const itemsAndDelivery = (order.itemsSubtotal || 0) + (order.deliveryTotal || 0);
    const platformCharge   = order.platformCharge ?? 25;
    const totalAmount      = order.totalAmount;

    console.log("[eSewa initiate] items+delivery:", itemsAndDelivery, "+ platform:", platformCharge, "= total:", totalAmount);

    const signature = generateEsewaSignature(totalAmount, transactionUuid, ESEWA_MERCHANT_CODE);
    order.esewaTransactionUuid = transactionUuid;
    await order.save();

    res.json({
      paymentUrl:               `${ESEWA_BASE_URL}/api/epay/main/v2/form`,
      amount:                   itemsAndDelivery,
      tax_amount:               0,
      total_amount:             totalAmount,
      transaction_uuid:         transactionUuid,
      product_code:             ESEWA_MERCHANT_CODE,
      product_service_charge:   platformCharge,
      product_delivery_charge:  0,
      success_url:              `${FRONTEND_URL}/payment/esewa/success`,
      failure_url:              `${FRONTEND_URL}/payment/esewa/failure`,
      signed_field_names:       "total_amount,transaction_uuid,product_code",
      signature,
    });
  } catch (err) {
    console.error("[eSewa initiate] error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   VERIFY ESEWA — POST /api/payments/esewa/verify
───────────────────────────────────────────────────────────── */
export const verifyEsewa = async (req, res) => {
  try {
    const { data: encodedData } = req.body;
    console.log("[eSewa verify] req.body keys:", Object.keys(req.body));

    if (!encodedData) {
      console.error("[eSewa verify] 400: data param missing");
      return res.status(400).json({ message: "Missing payment data" });
    }

    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf8"));
      console.log("[eSewa verify] decoded:", JSON.stringify(decoded));
    } catch (e) {
      console.error("[eSewa verify] 400: base64 decode failed:", e.message);
      return res.status(400).json({ message: "Invalid payment data encoding" });
    }

    if (!verifyEsewaSignature(decoded)) {
      console.error("[eSewa verify] 400: signature mismatch");
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    if ((decoded.status || "").toUpperCase().trim() !== "COMPLETE") {
      console.error("[eSewa verify] 400: status not COMPLETE:", decoded.status);
      return res.status(400).json({ message: `Payment not complete. Status: ${decoded.status}` });
    }

    const txUuid  = decoded.transaction_uuid || "";
    const orderId = txUuid.slice(0, 24);
    console.log("[eSewa verify] orderId:", orderId);

    if (orderId.length !== 24) {
      return res.status(400).json({ message: "Could not extract orderId from transaction" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.shipments = order.shipments.map((s) => ({
      ...s.toObject(),
      paymentMethod: "esewa",
      paymentStatus: "pending_admin_release",
      paymentDate:   new Date(),
      transactionId: decoded.transaction_code,
    }));
    order.paymentType   = "pre_payment";
    order.paymentStatus = "paid";
    await order.save();

    await sendNotification(
      order.consumer, "payment_paid",
      `Payment received for order #${order._id.toString().slice(-6)}`,
      "Your eSewa payment was successful. Funds will be released to the farmer after admin review.",
      { orderId: order._id }
    );
    for (const shipment of order.shipments) {
      await sendNotification(
        shipment.farmer, "payment_submitted",
        `Payment held for order #${order._id.toString().slice(-6)}`,
        "Consumer paid via eSewa. Admin will release to you shortly.",
        { orderId: order._id }
      );
    }

    res.json({ message: "eSewa payment verified.", order });
  } catch (err) {
    console.error("[eSewa verify] error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   INITIATE KHALTI — POST /api/payments/khalti/initiate

   FIX: sandbox URL is https://dev.khalti.com/api/v2/
        (NOT https://a.khalti.com which is old/wrong)
   FIX: Authorization header must be "Key <secret>" exactly
───────────────────────────────────────────────────────────── */
export const initiateKhalti = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate(
      "consumer", "firstName lastName email phone"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.consumer._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    const payload = {
      return_url:          `${FRONTEND_URL}/payment/khalti/success`,
      website_url:         FRONTEND_URL,
      amount:              Math.round(order.totalAmount * 100), // paisa, must be integer
      purchase_order_id:   orderId.toString(),
      purchase_order_name: `MeroBari Order #${order._id.toString().slice(-6)}`,
      customer_info: {
        name:  `${order.consumer.firstName} ${order.consumer.lastName}`,
        email: order.consumer.email,
        phone: order.consumer.phone || "9800000001",
      },
    };

    console.log("[Khalti initiate] payload:", JSON.stringify(payload));
    console.log("[Khalti initiate] URL:", `${KHALTI_BASE_URL}/api/v2/epayment/initiate/`);
    console.log("[Khalti initiate] Authorization: Key", KHALTI_SECRET_KEY.slice(0, 10) + "…");

    const response = await axios.post(
      `${KHALTI_BASE_URL}/api/v2/epayment/initiate/`,
      payload,
      {
        headers: {
          /* FIX: must be "Key <secret>" — Khalti rejects any other format */
          Authorization:  `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("[Khalti initiate] response:", JSON.stringify(response.data));

    order.khaltiPidx = response.data.pidx;
    await order.save();

    res.json({
      pidx:       response.data.pidx,
      paymentUrl: response.data.payment_url,
      expiresAt:  response.data.expires_at,
    });
  } catch (err) {
    console.error("[Khalti initiate] error:", err.response?.data || err.message);
    res.status(500).json({
      message: err.response?.data?.detail
        || JSON.stringify(err.response?.data)
        || "Failed to initiate Khalti payment",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   VERIFY KHALTI — POST /api/payments/khalti/verify

   Called by PaymentSuccess.jsx after Khalti redirects to
   /payment/khalti/success?pidx=…&purchase_order_id=…&status=Completed

   FIX: pidx mismatch is fault-tolerant — if khaltiPidx was not
        saved (race) we still verify via lookup and trust Khalti
   FIX: status === "Completed" (Khalti's exact casing per docs)
   FIX: correct sandbox URL dev.khalti.com
───────────────────────────────────────────────────────────── */
export const verifyKhalti = async (req, res) => {
  try {
    const { pidx, orderId } = req.body;
    console.log("[Khalti verify] pidx:", pidx, "orderId:", orderId);

    if (!pidx || !orderId)
      return res.status(400).json({ message: "pidx and orderId are required" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.consumer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    /* FIX: fault-tolerant pidx mismatch — only reject if we saved a pidx
       AND it doesn't match. If khaltiPidx was never saved (race condition
       between save() and redirect), trust Khalti's own lookup response. */
    if (order.khaltiPidx && order.khaltiPidx !== pidx) {
      console.error("[Khalti verify] pidx mismatch. Saved:", order.khaltiPidx, "Received:", pidx);
      return res.status(400).json({ message: "pidx mismatch" });
    }

    console.log("[Khalti verify] calling lookup:", `${KHALTI_BASE_URL}/api/v2/epayment/lookup/`);

    const response = await axios.post(
      `${KHALTI_BASE_URL}/api/v2/epayment/lookup/`,
      { pidx },
      {
        headers: {
          Authorization:  `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("[Khalti verify] lookup response:", JSON.stringify(response.data));

    const { status, transaction_id, total_amount } = response.data;

    /* FIX: Khalti returns "Completed" (capital C) per official docs */
    if (status !== "Completed") {
      console.error("[Khalti verify] status not Completed:", status);
      return res.status(400).json({
        message: `Payment not completed. Status: ${status}`,
      });
    }

    /* Optional: verify amount matches order (prevent amount tampering) */
    const expectedPaisa = Math.round(order.totalAmount * 100);
    if (total_amount && total_amount !== expectedPaisa) {
      console.error("[Khalti verify] amount mismatch. Expected:", expectedPaisa, "Got:", total_amount);
      return res.status(400).json({ message: "Payment amount mismatch" });
    }

    order.shipments = order.shipments.map((s) => ({
      ...s.toObject(),
      paymentMethod: "khalti",
      paymentStatus: "pending_admin_release",
      paymentDate:   new Date(),
      transactionId: transaction_id,
    }));
    order.paymentType   = "pre_payment";
    order.paymentStatus = "paid";
    /* Ensure pidx is stored even if it wasn't saved during initiate */
    order.khaltiPidx    = pidx;
    await order.save();

    await sendNotification(
      order.consumer, "payment_paid",
      `Payment received for order #${order._id.toString().slice(-6)}`,
      "Your Khalti payment was successful. Funds will be released to the farmer after admin review.",
      { orderId: order._id }
    );
    for (const shipment of order.shipments) {
      await sendNotification(
        shipment.farmer, "payment_submitted",
        `Payment held for order #${order._id.toString().slice(-6)}`,
        "Consumer paid via Khalti. Admin will release to you shortly.",
        { orderId: order._id }
      );
    }

    res.json({ message: "Khalti payment verified.", order });
  } catch (err) {
    console.error("[Khalti verify] error:", err.response?.data || err.message);
    res.status(500).json({
      message: err.response?.data?.detail
        || JSON.stringify(err.response?.data)
        || "Failed to verify Khalti payment",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   CASH ON DELIVERY — POST /api/payments/cod/confirm
───────────────────────────────────────────────────────────── */
export const confirmCOD = async (req, res) => {
  try {
    const { orderId, farmerIds } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.consumer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    const targetFarmers =
      Array.isArray(farmerIds) && farmerIds.length > 0
        ? farmerIds
        : order.shipments.map((s) => s.farmer.toString());

    order.shipments = order.shipments.map((s) => {
      if (targetFarmers.includes(s.farmer.toString())) {
        return { ...s.toObject(), paymentMethod: "cash_on_delivery", paymentStatus: "pending_admin_release" };
      }
      return s;
    });
    order.paymentType   = "post_payment";
    order.paymentStatus = "paid";
    await order.save();

    for (const farmerId of targetFarmers) {
      await sendNotification(
        farmerId, "payment_submitted",
        `COD order #${order._id.toString().slice(-6)}`,
        "Consumer will pay cash on delivery. Admin will release your payment after confirmation.",
        { orderId: order._id }
      );
    }
    res.json({ message: "Cash on delivery confirmed", order });
  } catch (err) {
    console.error("[COD confirm] error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   FARMER MARKS COD RECEIVED — PUT /api/payments/cod/received
───────────────────────────────────────────────────────────── */
export const markCODReceived = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const idx = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (idx === -1) return res.status(403).json({ message: "Unauthorized" });

    order.shipments[idx].paymentStatus = "paid";
    order.shipments[idx].paymentDate   = new Date();
    await order.save();

    await sendNotification(
      order.consumer, "payment_paid",
      `Cash received for order #${order._id.toString().slice(-6)}`,
      "The farmer has confirmed cash payment.",
      { orderId: order._id }
    );
    res.json({ message: "COD marked as received", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   SERVE PRIVATE FILE — GET /api/payments/files/:filename
───────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────
   FARMER VERIFIES MANUAL PAYMENT — PUT /api/payments/verify
───────────────────────────────────────────────────────────── */
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
      order.consumer, `payment_${status}`,
      `Payment ${status}`,
      `Your payment for order #${order._id.toString().slice(-6)} has been ${status}`,
      { orderId: order._id }
    );
    res.json({ message: `Payment ${status}`, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};