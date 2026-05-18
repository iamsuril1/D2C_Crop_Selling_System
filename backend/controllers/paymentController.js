/* backend/controllers/paymentController.js
   Fixes applied:
   1. ES704 — initiateEsewa: platformCharge moved to product_service_charge
      so amount + service_charge = total_amount exactly.
   2. verifyEsewa — added console.error logging at every 400 branch so you
      can see exactly which check fails in your server terminal.
   3. verifyEsewa — orderId extraction: uses slice(0,24) instead of split("-")[0]
      because MongoDB ObjectIds are always exactly 24 hex chars with no dashes.
   4. verifyEsewa — status check is now case-insensitive (sandbox may return
      "COMPLETE" or "complete" depending on API version).
   5. verifyEsewa — signature verification logs the exact message string being
      signed so you can compare it against eSewa's signed_field_names payload.
*/

import crypto   from "crypto";
import axios    from "axios";
import Order    from "../models/Order.js";
import User     from "../models/User.js";
import fs       from "fs";
import path     from "path";
import { sendNotification } from "../utils/notificationHelpers.js";

/* ─────────────────────────────────────────────────────────────
   ENV CONSTANTS
───────────────────────────────────────────────────────────── */
const ESEWA_MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE || "EPAYTEST";
const ESEWA_SECRET_KEY    = process.env.ESEWA_SECRET_KEY    || "8gBm/:&EnhH.1/q";
const ESEWA_BASE_URL      = process.env.ESEWA_BASE_URL      || "https://rc-epay.esewa.com.np";
const KHALTI_SECRET_KEY   = process.env.KHALTI_SECRET_KEY   || "test_secret_key_dc74e0fd57cb46cd93832aee0a390234";
const KHALTI_BASE_URL     = process.env.KHALTI_BASE_URL     || "https://a.khalti.com";
const FRONTEND_URL        = process.env.FRONTEND_URL        || "http://localhost:5173";

const PRIVATE_DIR = path.join(process.cwd(), "uploads", "private");
if (!fs.existsSync(PRIVATE_DIR)) fs.mkdirSync(PRIVATE_DIR, { recursive: true });

/* ─────────────────────────────────────────────────────────────
   ESEWA SIGNATURE HELPERS
───────────────────────────────────────────────────────────── */

/**
 * Generate HMAC-SHA256 signature for eSewa v2.
 * Message format: "total_amount=X,transaction_uuid=Y,product_code=Z"
 */
const generateEsewaSignature = (totalAmount, transactionUuid, productCode) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");
};

/**
 * Verify eSewa response signature.
 * Rebuilds the signed message using signed_field_names from the decoded response,
 * then compares HMAC with the received signature.
 */
const verifyEsewaSignature = (responseData) => {
  const { signed_field_names, signature } = responseData;

  if (!signed_field_names || !signature) {
    console.error("[eSewa verify] Missing signed_field_names or signature in decoded payload");
    return false;
  }

  const fields  = signed_field_names.split(",");
  const message = fields.map((f) => `${f}=${responseData[f] ?? ""}`).join(",");

  console.log("[eSewa verify] Reconstructed signed message :", message);
  console.log("[eSewa verify] ESEWA_SECRET_KEY (first 4)   :", ESEWA_SECRET_KEY.slice(0, 4) + "…");

  const expected = crypto
    .createHmac("sha256", ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");

  console.log("[eSewa verify] Expected signature :", expected);
  console.log("[eSewa verify] Received signature :", signature);
  console.log("[eSewa verify] Match              :", expected === signature);

  return expected === signature;
};

/* ─────────────────────────────────────────────────────────────
   GET FARMER PAYMENT METHODS
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

   FIX ES704:
     amount                  = itemsSubtotal + deliveryTotal
     tax_amount              = 0
     product_service_charge  = platformCharge (Rs. 25)  ← was 0
     product_delivery_charge = 0
     total_amount            = order.totalAmount
     ──────────────────────────────────────────────────────────
     amount + 0 + platformCharge + 0 = total_amount  ✓
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

    console.log("[eSewa initiate] itemsAndDelivery  :", itemsAndDelivery);
    console.log("[eSewa initiate] platformCharge    :", platformCharge);
    console.log("[eSewa initiate] total_amount      :", totalAmount);
    console.log("[eSewa initiate] sum check (should equal total_amount):", itemsAndDelivery + platformCharge);

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

   eSewa redirects to /payment/esewa/success?data=<base64>
   PaymentSuccess.jsx POSTs { data } to this endpoint.

   Every 400 branch now has a console.error so you can see in
   your terminal exactly which guard is failing.
───────────────────────────────────────────────────────────── */
export const verifyEsewa = async (req, res) => {
  try {
    const { data: encodedData } = req.body;

    console.log("[eSewa verify] req.body keys   :", Object.keys(req.body));
    console.log("[eSewa verify] encodedData      :", encodedData ? encodedData.slice(0, 40) + "…" : "MISSING");

    // ── Guard 1: data param must be present ─────────────────────────────────
    if (!encodedData) {
      console.error("[eSewa verify] 400 → data param missing from request body");
      return res.status(400).json({ message: "Missing payment data" });
    }

    // ── Decode base64 → JSON ─────────────────────────────────────────────────
    let decoded;
    try {
      const jsonStr = Buffer.from(encodedData, "base64").toString("utf8");
      console.log("[eSewa verify] Decoded JSON :", jsonStr);
      decoded = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("[eSewa verify] 400 → base64 decode / JSON.parse failed:", parseErr.message);
      return res.status(400).json({ message: "Invalid payment data encoding" });
    }

    console.log("[eSewa verify] decoded keys         :", Object.keys(decoded));
    console.log("[eSewa verify] decoded.status       :", decoded.status);
    console.log("[eSewa verify] transaction_uuid     :", decoded.transaction_uuid);
    console.log("[eSewa verify] transaction_code     :", decoded.transaction_code);
    console.log("[eSewa verify] signed_field_names   :", decoded.signed_field_names);

    // ── Guard 2: signature must be valid ─────────────────────────────────────
    const isValid = verifyEsewaSignature(decoded);
    if (!isValid) {
      console.error("[eSewa verify] 400 → Signature mismatch — verify ESEWA_SECRET_KEY in .env");
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // ── Guard 3: payment must be COMPLETE ────────────────────────────────────
    // Case-insensitive so "COMPLETE" and "complete" both work
    const status = (decoded.status || "").toUpperCase().trim();
    if (status !== "COMPLETE") {
      console.error(`[eSewa verify] 400 → status="${decoded.status}" is not COMPLETE`);
      return res.status(400).json({
        message: `Payment not complete. Status: ${decoded.status}`,
      });
    }

    // ── Extract orderId ───────────────────────────────────────────────────────
    // transaction_uuid = "${orderId}-${Date.now()}"
    // MongoDB ObjectIds are exactly 24 hex chars, no dashes, so slice(0,24) is safe.
    const txUuid  = decoded.transaction_uuid || "";
    const orderId = txUuid.slice(0, 24);

    console.log("[eSewa verify] Extracted orderId :", orderId);

    if (!orderId || orderId.length !== 24) {
      console.error("[eSewa verify] 400 → Could not extract valid orderId from transaction_uuid:", txUuid);
      return res.status(400).json({ message: "Could not determine order from transaction" });
    }

    // ── Guard 4: order must exist ─────────────────────────────────────────────
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`[eSewa verify] 404 → Order not found for id="${orderId}"`);
      return res.status(404).json({ message: "Order not found" });
    }

    console.log("[eSewa verify] Order found, updating shipments…");

    // ── Mark shipments — consumer paid, admin holds funds ─────────────────────
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

    console.log("[eSewa verify] Order saved. Sending notifications…");

    await sendNotification(
      order.consumer,
      "payment_paid",
      `Payment received for order #${order._id.toString().slice(-6)}`,
      "Your eSewa payment was successful. Funds will be released to the farmer after admin review.",
      { orderId: order._id }
    );

    for (const shipment of order.shipments) {
      await sendNotification(
        shipment.farmer,
        "payment_submitted",
        `Payment held for order #${order._id.toString().slice(-6)}`,
        "Consumer paid via eSewa. Funds are held by admin and will be released to you shortly.",
        { orderId: order._id }
      );
    }

    console.log("[eSewa verify] Done ✓");

    res.json({
      message: "eSewa payment verified. Funds held pending admin release.",
      order,
    });
  } catch (err) {
    console.error("[eSewa verify] Unexpected error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   INITIATE KHALTI — POST /api/payments/khalti/initiate
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
      amount:              order.totalAmount * 100,
      purchase_order_id:   orderId,
      purchase_order_name: `MeroBari Order #${order._id.toString().slice(-6)}`,
      customer_info: {
        name:  `${order.consumer.firstName} ${order.consumer.lastName}`,
        email: order.consumer.email,
        phone: order.consumer.phone || "9800000000",
      },
    };

    const response = await axios.post(
      `${KHALTI_BASE_URL}/api/v2/epayment/initiate/`,
      payload,
      {
        headers: {
          Authorization:  `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

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
      message: err.response?.data?.detail || "Failed to initiate Khalti payment",
    });
  }
};

/* ─────────────────────────────────────────────────────────────
   VERIFY KHALTI — POST /api/payments/khalti/verify
───────────────────────────────────────────────────────────── */
export const verifyKhalti = async (req, res) => {
  try {
    const { pidx, orderId } = req.body;
    if (!pidx || !orderId)
      return res.status(400).json({ message: "pidx and orderId are required" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.consumer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });
    if (order.khaltiPidx !== pidx)
      return res.status(400).json({ message: "pidx mismatch" });

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

    const { status, transaction_id } = response.data;

    if (status !== "Completed")
      return res.status(400).json({
        message: `Khalti payment not completed. Status: ${status}`,
      });

    order.shipments = order.shipments.map((s) => ({
      ...s.toObject(),
      paymentMethod: "khalti",
      paymentStatus: "pending_admin_release",
      paymentDate:   new Date(),
      transactionId: transaction_id,
    }));
    order.paymentType   = "pre_payment";
    order.paymentStatus = "paid";
    await order.save();

    await sendNotification(
      order.consumer,
      "payment_paid",
      `Payment received for order #${order._id.toString().slice(-6)}`,
      "Your Khalti payment was successful. Funds will be released to the farmer after admin review.",
      { orderId: order._id }
    );

    for (const shipment of order.shipments) {
      await sendNotification(
        shipment.farmer,
        "payment_submitted",
        `Payment held for order #${order._id.toString().slice(-6)}`,
        "Consumer paid via Khalti. Funds are held by admin and will be released to you shortly.",
        { orderId: order._id }
      );
    }

    res.json({ message: "Khalti payment verified. Funds held pending admin release.", order });
  } catch (err) {
    console.error("[Khalti verify] error:", err.response?.data || err.message);
    res.status(500).json({
      message: err.response?.data?.detail || "Failed to verify Khalti payment",
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
        return {
          ...s.toObject(),
          paymentMethod: "cash_on_delivery",
          paymentStatus: "pending_admin_release",
        };
      }
      return s;
    });
    order.paymentType   = "post_payment";
    order.paymentStatus = "paid";
    await order.save();

    for (const farmerId of targetFarmers) {
      await sendNotification(
        farmerId,
        "payment_submitted",
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
   FARMER MARKS COD AS RECEIVED — PUT /api/payments/cod/received
───────────────────────────────────────────────────────────── */
export const markCODReceived = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const shipmentIndex = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (shipmentIndex === -1)
      return res.status(403).json({ message: "Unauthorized" });

    order.shipments[shipmentIndex].paymentStatus = "paid";
    order.shipments[shipmentIndex].paymentDate   = new Date();
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
        {
          shipments: {
            $elemMatch: {
              farmer:       req.user._id,
              paymentProof: { $regex: filename },
            },
          },
        },
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