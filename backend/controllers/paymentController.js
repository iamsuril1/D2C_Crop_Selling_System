import User from "../models/User.js";
import Order from "../models/Order.js";
import { sendNotification } from "../utils/notificationHelpers.js";

// Get farmer's payment methods
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
      preferredPaymentMethod: farmer.preferredPaymentMethod
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update farmer's payment methods (farmer only)
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
      preferredPaymentMethod: farmer.preferredPaymentMethod
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload QR code image for farmer
export const uploadPaymentQR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const qrPath = `/uploads/${req.file.filename}`;
    
    res.json({
      message: "QR code uploaded",
      qrCodeImage: qrPath
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Consumer: Submit payment proof for a shipment
export const submitPaymentProof = async (req, res) => {
  try {
    const { orderId, paymentMethod, transactionId } = req.body;
    
    // farmerIds might be a JSON string or array
    let farmerIds;
    try {
      farmerIds = typeof req.body.farmerIds === 'string' 
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
    
    const paymentProof = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Update payment for specific shipments
    order.shipments = order.shipments.map(shipment => {
      if (farmerIds.includes(shipment.farmer.toString())) {
        shipment.paymentMethod = paymentMethod;
        shipment.paymentStatus = paymentMethod === "cash_on_delivery" ? "paid" : "pending";
        shipment.paymentProof = paymentProof;
        shipment.transactionId = transactionId;
        shipment.paymentDate = new Date();
      }
      return shipment;
    });
    
    await order.save();
    
    // Notify farmers
    for (const farmerId of farmerIds) {
      const notifMessage = paymentMethod === "cash_on_delivery"
        ? "Customer will pay on delivery"
        : "Customer submitted payment proof";
        
      await sendNotification(
        farmerId,
        "payment_submitted",
        "Payment update",
        notifMessage + ` for order #${order._id.toString().slice(-6)}`,
        { orderId: order._id, paymentMethod }
      );
    }
    
    res.json({ message: "Payment proof submitted", order });
  } catch (err) {
    console.error("Submit payment proof error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Farmer: Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, status } = req.body; // status: "paid" or "failed"
    
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    
    // Find shipment for this farmer
    const shipmentIndex = order.shipments.findIndex(
      s => s.farmer.toString() === req.user._id.toString()
    );
    
    if (shipmentIndex === -1) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    order.shipments[shipmentIndex].paymentStatus = status;
    await order.save();
    
    // Notify consumer
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