import User from "../models/User.js";
import Order from "../models/Order.js";
import fs from "fs";
import path from "path";
import { sendNotification } from "../utils/notificationHelpers.js";

const PRIVATE_DIR = path.join(process.cwd(), "uploads", "private");
if (!fs.existsSync(PRIVATE_DIR)) {
  fs.mkdirSync(PRIVATE_DIR, { recursive: true });
}

const moveToPrivate = (filename) => {
  if (!filename) return null;
  const src = path.join(process.cwd(), "uploads", filename);
  const dest = path.join(PRIVATE_DIR, filename);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
  }
  return `/api/payments/files/${filename}`;
};

export const getFarmerPaymentMethods = async (req, res) => {
  try {
    const farmer = await User.findById(req.params.farmerId).select(
      "paymentMethods preferredPaymentMethod firstName lastName"
    );
    if (!farmer || farmer.role !== "farmer") {
      return res.status(404).json({ message: "Farmer not found" });
    }
    res.json({
      farmerId: farmer._id,
      farmerName: `${farmer.firstName} ${farmer.lastName}`,
      paymentMethods: farmer.paymentMethods,
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
    if (!farmer || farmer.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can set payment methods" });
    }
    if (paymentMethods) farmer.paymentMethods = paymentMethods;
    if (preferredPaymentMethod) farmer.preferredPaymentMethod = preferredPaymentMethod;
    await farmer.save();
    res.json({
      message: "Payment methods updated",
      paymentMethods: farmer.paymentMethods,
      preferredPaymentMethod: farmer.preferredPaymentMethod,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const uploadPaymentQR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const qrPath = `/uploads/${req.file.filename}`;
    res.json({ message: "QR code uploaded", qrCodeImage: qrPath });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const submitPaymentProof = async (req, res) => {
  try {
    const { orderId, paymentMethod, transactionId } = req.body;

    let farmerIds;
    try {
      farmerIds = typeof req.body.farmerIds === "string"
        ? JSON.parse(req.body.farmerIds)
        : req.body.farmerIds;
    } catch {
      farmerIds = req.body.farmerIds;
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.consumer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // FIX: move proof to private directory
    let paymentProofPath = null;
    if (req.file) {
      paymentProofPath = moveToPrivate(req.file.filename);
    }

    order.shipments = order.shipments.map((shipment) => {
      if (farmerIds.includes(shipment.farmer.toString())) {
        shipment.paymentMethod = paymentMethod;
        shipment.paymentStatus = paymentMethod === "cash_on_delivery" ? "paid" : "pending";
        shipment.paymentProof = paymentProofPath;
        shipment.transactionId = transactionId;
        shipment.paymentDate = new Date();
      }
      return shipment;
    });

    await order.save();

    for (const farmerId of farmerIds) {
      const notifMessage = paymentMethod === "cash_on_delivery"
        ? "Customer will pay on delivery"
        : "Customer submitted payment proof";

      await sendNotification(
        farmerId,
        "payment_submitted",
        "Payment update",
        `${notifMessage} for order #${order._id.toString().slice(-6)}`,
        { orderId: order._id, paymentMethod }
      );
    }

    res.json({ message: "Payment proof submitted", order });
  } catch (err) {
    console.error("Submit payment proof error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const shipmentIndex = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (shipmentIndex === -1) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    order.shipments[shipmentIndex].paymentStatus = status;
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