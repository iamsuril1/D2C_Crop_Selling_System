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

// ─── POST /api/returns ───────────────────────────────────────────────────────

export const createReturn = async (req, res) => {
  try {
    const { orderId, farmerId, reason, reasonDetail } = req.body;

    if (!orderId || !farmerId || !reason) {
      return res.status(400).json({ message: "orderId, farmerId and reason are required" });
    }

    const farmerIdStr = String(farmerId).trim();

    // Validate format before hitting the DB — a Mongoose ObjectId is 24 hex chars
    if (!/^[a-f\d]{24}$/i.test(farmerIdStr)) {
      console.error(`[createReturn] Bad farmerId format: "${farmerIdStr}"`);
      return res.status(400).json({ message: "Invalid farmerId format" });
    }

    console.log(`[createReturn] orderId="${orderId}" farmerId="${farmerIdStr}"`);


    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.consumer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Returns are only allowed on delivered orders" });
    }

    const daysSinceDelivery = (Date.now() - new Date(order.updatedAt).getTime()) / 86_400_000;
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      return res.status(400).json({
        message: `Return window has closed. Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery.`,
      });
    }

    // FIX: s.farmer may be either a raw ObjectId (when the order is fetched
    // without .populate()) or a populated object (if populate was called).
    // In both cases we call .toString() to get the hex string, then compare
    // against farmerIdStr which we already normalised above.
    const shipment = order.shipments.find((s) => {
      const sid = s.farmer?._id
        ? s.farmer._id.toString()   // populated object
        : s.farmer?.toString();      // raw ObjectId
      return sid === farmerIdStr;
    });

    if (!shipment) {
      // Emit diagnostic info in dev so the mismatch is visible in server logs
      const available = order.shipments.map((s) =>
        s.farmer?._id ? s.farmer._id.toString() : s.farmer?.toString()
      );
      console.error(
        `[createReturn] Shipment not found. farmerId sent: "${farmerIdStr}", ` +
        `available farmer IDs in order: [${available.join(", ")}]`
      );
      return res.status(404).json({
        message: "Shipment not found for this farmer",
      });
    }

    const existing = await Return.findOne({ order: orderId, farmer: farmerIdStr });
    if (existing) {
      return res.status(409).json({ message: "A return request already exists for this shipment" });
    }

    let evidencePhoto = null;
    if (req.file) {
      evidencePhoto = moveToPrivate(req.file.filename);
    }

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
      reasonDetail: reasonDetail || "",
      evidencePhoto,
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
      .populate("order",  "totalAmount createdAt status")
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
      .populate("order",    "totalAmount createdAt status")
      .populate("consumer", "firstName lastName email")
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
        : "Your return request has been approved.",
      { returnId: returnDoc._id, orderId: returnDoc.order }
    );

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

// ─── GET /api/returns/files/:filename ────────────────────────────────────────

export const serveReturnFile = (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(PRIVATE_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  res.sendFile(filePath);
};