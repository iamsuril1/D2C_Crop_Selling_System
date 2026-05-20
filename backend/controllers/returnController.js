// backend/controllers/returnController.js
// FIXES:
//  - createReturn: refundAmount now = items subtotal + delivery fee + platform charge
//                  farmerDeductionAmount stored separately = items subtotal only
//  - processAdminRefund: consumer gets full refundAmount (items+delivery+platform)
//                        farmer deducted only farmerDeductionAmount (items only)
//  - getAdminReturns: also returns /all with status query param for dashboard
//  - getAdminReturnStats: added pendingRefund and pendingAmount fields

import Return  from "../models/Return.js";
import Order   from "../models/Order.js";
import Product from "../models/Product.js";
import path    from "path";
import fs      from "fs";
import { sendNotification } from "../utils/notificationHelpers.js";

const PRIVATE_DIR = path.join(process.cwd(), "uploads", "private");
if (!fs.existsSync(PRIVATE_DIR)) fs.mkdirSync(PRIVATE_DIR, { recursive: true });

const moveToPrivate = (filename) => {
  if (!filename) return null;
  const src  = path.join(process.cwd(), "uploads", filename);
  const dest = path.join(PRIVATE_DIR, filename);
  if (fs.existsSync(src)) fs.renameSync(src, dest);
  return `/api/returns/files/${filename}`;
};

const RETURN_WINDOW_DAYS = 2;
const PLATFORM_CHARGE    = 25;

// ─── POST /api/returns ───────────────────────────────────────────────────────

export const createReturn = async (req, res) => {
  try {
    const {
      orderId,
      farmerId,
      reason,
      reasonDetail,
      refundMethod,
      esewaId,
      bankName,
      accountNumber,
      accountName,
    } = req.body;

    if (!orderId || !farmerId || !reason) {
      return res.status(400).json({ message: "orderId, farmerId and reason are required" });
    }

    const validRefundMethods = ["esewa", "bank_transfer", "cash"];
    if (!refundMethod || !validRefundMethods.includes(refundMethod)) {
      return res.status(400).json({ message: "A valid refund method is required (esewa, bank_transfer, or cash)" });
    }

    if (refundMethod === "esewa" && !esewaId?.trim()) {
      return res.status(400).json({ message: "eSewa ID is required for eSewa refund" });
    }
    if (refundMethod === "bank_transfer") {
      if (!bankName?.trim() || !accountNumber?.trim() || !accountName?.trim()) {
        return res.status(400).json({ message: "Bank name, account number and account name are required for bank transfer refund" });
      }
    }

    const farmerIdStr = String(farmerId).trim();
    if (!/^[a-f\d]{24}$/i.test(farmerIdStr)) {
      return res.status(400).json({ message: "Invalid farmerId format" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.consumer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Returns are only allowed on delivered orders" });
    }

    const deliveredTimestamp = order.deliveredAt || order.updatedAt;
    const daysSinceDelivery  = (Date.now() - new Date(deliveredTimestamp).getTime()) / 86_400_000;

    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      return res.status(400).json({
        message: `Return window has closed. Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery.`,
      });
    }

    const shipment = order.shipments.find((s) => {
      const sid = s.farmer?._id ? s.farmer._id.toString() : s.farmer?.toString();
      return sid === farmerIdStr;
    });

    if (!shipment) {
      return res.status(404).json({ message: "Shipment not found for this farmer" });
    }

    const existing = await Return.findOne({ order: orderId, farmer: farmerIdStr });
    if (existing) {
      return res.status(409).json({ message: "A return request already exists for this shipment" });
    }

    let evidencePhoto = null;
    if (req.file) evidencePhoto = moveToPrivate(req.file.filename);

    const refundPaymentDetail = {};
    if (refundMethod === "esewa")         refundPaymentDetail.esewaId       = esewaId?.trim();
    if (refundMethod === "bank_transfer") {
      refundPaymentDetail.bankName      = bankName?.trim();
      refundPaymentDetail.accountNumber = accountNumber?.trim();
      refundPaymentDetail.accountName   = accountName?.trim();
    }

    // ── FIXED: Full refund amount = items + delivery for this shipment + platform charge
    // Platform charge is shared across all shipments; for a single-shipment return
    // we include the full platform charge. If multiple shipments exist, prorate it.
    const shipmentCount          = order.shipments.length || 1;
    const itemsSubtotal          = shipment.subtotal       || 0;
    const deliveryFee            = shipment.deliveryFee    || 0;
    const proratedPlatformCharge = Math.round((order.platformCharge || PLATFORM_CHARGE) / shipmentCount);

    // Full amount consumer paid for this shipment
    const refundAmount = itemsSubtotal + deliveryFee + proratedPlatformCharge;

    // Only items are deducted from farmer (delivery & platform stay with admin/platform)
    const farmerDeductionAmount = itemsSubtotal;

    const returnDoc = await Return.create({
      order:    orderId,
      consumer: req.user._id,
      farmer:   farmerIdStr,
      items:    shipment.items.map((i) => ({
        product:  i.product,
        name:     i.name,
        quantity: i.quantity,
        price:    i.price,
      })),
      reason,
      reasonDetail:        reasonDetail || "",
      evidencePhoto,
      refundMethod,
      refundPaymentDetail,
      refundAmount,               // full amount consumer gets back
      farmerDeductionAmount,      // only items deducted from farmer
    });

    await sendNotification(
      farmerIdStr,
      "return_requested",
      `Return request for order #${order._id.toString().slice(-6)}`,
      `${req.user.firstName} requested a return: ${reason.replace(/_/g, " ")}`,
      { orderId, returnId: returnDoc._id }
    );

    res.status(201).json(returnDoc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A return request already exists for this shipment" });
    }
    console.error("createReturn error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/returns/my ─────────────────────────────────────────────────────

export const getMyReturns = async (req, res) => {
  try {
    const returns = await Return.find({ consumer: req.user._id })
      .populate("order",  "totalAmount createdAt status deliveredAt")
      .populate("farmer", "firstName lastName")
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/returns/farmer ─────────────────────────────────────────────────

export const getFarmerReturns = async (req, res) => {
  try {
    const returns = await Return.find({ farmer: req.user._id })
      .populate("order",    "totalAmount createdAt status deliveredAt")
      .populate("consumer", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/returns/admin ──────────────────────────────────────────────────

export const getAdminReturns = async (req, res) => {
  try {
    const returns = await Return.find({})
      .populate("order",    "totalAmount createdAt status deliveredAt itemsSubtotal")
      .populate("consumer", "firstName lastName email")
      .populate("farmer",   "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/returns/admin/all?status=pending_refund|processed|all ──────────
// Used by AdminDashboard refunds tab

export const getAdminReturnsFiltered = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};

    if (status === "pending_refund") {
      filter = { status: "approved", refundStatus: "pending" };
    } else if (status === "processed") {
      filter = { refundStatus: "processed" };
    }
    // else "all" = no filter

    const returns = await Return.find(filter)
      .populate("order",    "totalAmount createdAt status deliveredAt itemsSubtotal")
      .populate("consumer", "firstName lastName email")
      .populate("farmer",   "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(returns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/returns/:id/approve ────────────────────────────────────────────

export const approveReturn = async (req, res) => {
  try {
    const returnDoc = await Return.findById(req.params.id);
    if (!returnDoc) return res.status(404).json({ message: "Return not found" });

    if (returnDoc.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (returnDoc.status !== "pending") {
      return res.status(400).json({ message: "Return has already been decided" });
    }

    // Restore stock
    await Promise.all(
      returnDoc.items.map((item) =>
        Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: item.quantity } },
          { new: true }
        )
      )
    );

    returnDoc.status     = "approved";
    returnDoc.farmerNote = req.body.farmerNote || "";
    returnDoc.decidedAt  = new Date();
    await returnDoc.save();

    const orderSnippet = returnDoc.order.toString().slice(-6);

    await sendNotification(
      returnDoc.consumer,
      "return_approved",
      `Return approved for order #${orderSnippet}`,
      req.body.farmerNote
        ? `Farmer note: ${req.body.farmerNote}`
        : "Your return request has been approved. Admin will process your refund shortly.",
      { returnId: returnDoc._id, orderId: returnDoc.order }
    );

    console.log(`[Return Approved] Return ${returnDoc._id} approved — refund pending for consumer`);
    res.json(returnDoc);
  } catch (err) {
    console.error("approveReturn error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/returns/:id/reject ─────────────────────────────────────────────

export const rejectReturn = async (req, res) => {
  try {
    const returnDoc = await Return.findById(req.params.id);
    if (!returnDoc) return res.status(404).json({ message: "Return not found" });

    if (returnDoc.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (returnDoc.status !== "pending") {
      return res.status(400).json({ message: "Return has already been decided" });
    }

    returnDoc.status     = "rejected";
    returnDoc.farmerNote = req.body.farmerNote || "";
    returnDoc.decidedAt  = new Date();
    await returnDoc.save();

    const orderSnippet = returnDoc.order.toString().slice(-6);
    await sendNotification(
      returnDoc.consumer,
      "return_rejected",
      `Return rejected for order #${orderSnippet}`,
      req.body.farmerNote
        ? `Reason: ${req.body.farmerNote}`
        : "Your return request has been rejected.",
      { returnId: returnDoc._id, orderId: returnDoc.order }
    );

    res.json(returnDoc);
  } catch (err) {
    console.error("rejectReturn error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/returns/:id/refund (admin only) ────────────────────────────────
// Consumer refund = refundAmount (items + delivery + platform portion)
// Farmer deduction = farmerDeductionAmount (items only)

export const processAdminRefund = async (req, res) => {
  try {
    const returnDoc = await Return.findById(req.params.id)
      .populate("consumer", "firstName lastName email")
      .populate("farmer",   "firstName lastName email");

    if (!returnDoc) return res.status(404).json({ message: "Return not found" });

    if (returnDoc.status !== "approved") {
      return res.status(400).json({ message: "Return must be approved before processing refund" });
    }

    if (returnDoc.refundStatus === "processed") {
      return res.status(400).json({ message: "Refund has already been processed" });
    }

    const { method, reference = "", amount, note = "" } = req.body;
    if (!method) return res.status(400).json({ message: "Payment method is required" });

    // Use provided amount or fall back to stored refundAmount
    const actualRefundAmount = amount ? Number(amount) : returnDoc.refundAmount;

    // Farmer deduction = items only (NOT delivery, NOT platform charge)
    const farmerDeductAmount = returnDoc.farmerDeductionAmount || returnDoc.refundAmount;

    // Mark refund processed
    returnDoc.refundStatus  = "processed";
    returnDoc.refundRecord  = {
      processedAt: new Date(),
      processedBy: req.user._id,
      method,
      reference,
      amount:      actualRefundAmount,
      note,
    };

    // ── Deduct from farmer payout (items only) ────────────────────────────
    const farmerId = returnDoc.farmer._id?.toString() || returnDoc.farmer.toString();
    const orderId  = returnDoc.order._id?.toString()  || returnDoc.order.toString();

    const order = await Order.findById(orderId);
    if (order) {
      const shipIdx = order.shipments.findIndex(
        (s) => (s.farmer?._id || s.farmer).toString() === farmerId
      );
      if (shipIdx !== -1) {
        // Record deduction on the shipment
        order.shipments[shipIdx].returnDeduction =
          (order.shipments[shipIdx].returnDeduction || 0) + farmerDeductAmount;

        // If farmer hasn't been paid yet, reduce their subtotal by items amount only
        if (!order.shipments[shipIdx].farmerPaid) {
          const originalSubtotal = order.shipments[shipIdx].subtotal || 0;
          order.shipments[shipIdx].subtotal = Math.max(0, originalSubtotal - farmerDeductAmount);
        }
        await order.save();
      }

      returnDoc.farmerDeducted   = true;
      returnDoc.farmerDeductedAt = new Date();
    }

    await returnDoc.save();

    // Notify consumer — full refund amount
    await sendNotification(
      returnDoc.consumer._id || returnDoc.consumer,
      "payment_paid",
      `Refund processed for your return`,
      `Rs. ${Math.round(actualRefundAmount)} has been refunded to you via ${method.replace(/_/g, " ")}${reference ? ` (Ref: ${reference})` : ""}.`,
      { returnId: returnDoc._id, orderId: returnDoc.order }
    );

    // Notify farmer — items deduction only
    await sendNotification(
      farmerId,
      "payment_failed",
      `Return deduction on order #${orderId.slice(-6)}`,
      `Rs. ${Math.round(farmerDeductAmount)} (item cost) has been deducted from your payout for this order due to an approved return. Delivery fee and platform charge are absorbed by the platform.`,
      { returnId: returnDoc._id, orderId: returnDoc.order }
    );

    res.json({
      message:              "Refund processed successfully",
      refundAmount:         actualRefundAmount,
      farmerDeductAmount,
      returnDoc,
    });
  } catch (err) {
    console.error("processAdminRefund error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/returns/admin/stats ────────────────────────────────────────────

export const getAdminReturnStats = async (req, res) => {
  try {
    const [total, pendingApproval, approved, refundPending, refundProcessed] = await Promise.all([
      Return.countDocuments({}),
      Return.countDocuments({ status: "pending" }),
      Return.countDocuments({ status: "approved" }),
      Return.countDocuments({ status: "approved", refundStatus: "pending" }),
      Return.countDocuments({ status: "approved", refundStatus: "processed" }),
    ]);

    const totalRefundedResult = await Return.aggregate([
      { $match: { refundStatus: "processed" } },
      { $group: { _id: null, total: { $sum: "$refundRecord.amount" } } },
    ]);
    const totalRefunded = totalRefundedResult[0]?.total || 0;

    // Pending refund total amount (what admin still needs to pay consumers)
    const pendingRefundAmountResult = await Return.aggregate([
      { $match: { status: "approved", refundStatus: "pending" } },
      { $group: { _id: null, total: { $sum: "$refundAmount" } } },
    ]);
    const pendingAmount = pendingRefundAmountResult[0]?.total || 0;

    res.json({
      total,
      pendingApproval,
      approved,
      refundPending,     // count of approved returns still needing refund
      pendingRefund:     refundPending,   // alias used by AdminDashboard
      refundProcessed,
      processed:         refundProcessed, // alias used by AdminDashboard
      totalRefunded,
      pendingAmount,
      processedAmount:   totalRefunded,   // alias used by AdminDashboard
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const serveReturnFile = (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(PRIVATE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  res.sendFile(filePath);
};