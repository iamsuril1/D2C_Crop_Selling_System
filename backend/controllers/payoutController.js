import Order from "../models/Order.js";
import { sendNotification } from "../utils/notificationHelpers.js";

/* ─────────────────────────────────────────────────────────────
   GET STATS — GET /api/payouts/stats
───────────────────────────────────────────────────────────── */
export const getPayoutStats = async (req, res) => {
  try {
    const [pending, released] = await Promise.all([
      Order.find({
        paymentStatus:          "paid",
        "adminPayout.released": { $ne: true },
        status:                 { $nin: ["cancelled"] },
      }),
      Order.find({
        paymentStatus:          "paid",
        "adminPayout.released": true,
      }),
    ]);

    const pendingAmount  = pending.reduce((s, o) => s + (o.itemsSubtotal  || 0), 0);
    const releasedAmount = released.reduce((s, o) => s + (o.itemsSubtotal || 0), 0);
    const adminRevenue   = [...pending, ...released].reduce(
      (s, o) => s + (o.deliveryTotal || 0) + (o.platformCharge || 25),
      0
    );

    res.json({
      pendingCount:   pending.length,
      pendingAmount,
      releasedCount:  released.length,
      releasedAmount,
      adminRevenue,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET PENDING — GET /api/payouts/pending
   Orders where consumer paid but admin has not yet released.
───────────────────────────────────────────────────────────── */
export const getPendingPayouts = async (req, res) => {
  try {
    const orders = await Order.find({
      paymentStatus:          "paid",
      "adminPayout.released": { $ne: true },
      status:                 { $nin: ["cancelled"] },
    })
      .populate("consumer",          "firstName lastName email")
      .populate("shipments.farmer",  "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL — GET /api/payouts/all
   All paid orders regardless of release status.
───────────────────────────────────────────────────────────── */
export const getAllPayouts = async (req, res) => {
  try {
    const orders = await Order.find({ paymentStatus: "paid" })
      .populate("consumer",         "firstName lastName email")
      .populate("shipments.farmer", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   RELEASE FULL ORDER — PUT /api/payouts/:orderId/release
   Releases payment to ALL farmers in one order at once.
   Farmer receives: shipment.subtotal (items only)
   Admin keeps:     shipment.deliveryFee + platformCharge
───────────────────────────────────────────────────────────── */
export const releasePayoutForOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("shipments.farmer", "firstName lastName");

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.adminPayout?.released)
      return res.status(400).json({ message: "Payout already released for this order" });

    if (order.paymentStatus !== "paid")
      return res.status(400).json({ message: "Consumer has not paid yet" });

    const shipmentPayouts = order.shipments.map((s) => ({
      farmer:     s.farmer._id || s.farmer,
      amount:     s.subtotal,
      releasedAt: new Date(),
    }));

    order.adminPayout = {
      released:        true,
      releasedAt:      new Date(),
      releasedBy:      req.user._id,
      shipmentPayouts,
    };

    order.shipments = order.shipments.map((s) => ({
      ...s.toObject(),
      paymentStatus: "paid",
      paymentDate:   new Date(),
    }));

    await order.save();

    for (const payout of shipmentPayouts) {
      await sendNotification(
        payout.farmer,
        "payment_paid",
        `Payment released for order #${order._id.toString().slice(-6)}`,
        `Admin released Rs. ${payout.amount} to your account.`,
        { orderId: order._id }
      );
    }

    res.json({ message: "Payout released successfully", order });
  } catch (err) {
    console.error("releasePayoutForOrder error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   RELEASE SINGLE SHIPMENT — PUT /api/payouts/:orderId/release/:farmerId
   Releases payment to one specific farmer's shipment.
───────────────────────────────────────────────────────────── */
export const releasePayoutForShipment = async (req, res) => {
  try {
    const { orderId, farmerId } = req.params;
    const order = await Order.findById(orderId);

    if (!order)
      return res.status(404).json({ message: "Order not found" });

    if (order.paymentStatus !== "paid")
      return res.status(400).json({ message: "Consumer has not paid yet" });

    const idx = order.shipments.findIndex(
      (s) => (s.farmer._id || s.farmer).toString() === farmerId
    );
    if (idx === -1)
      return res.status(404).json({ message: "Shipment not found for this farmer" });

    if (order.shipments[idx].paymentStatus === "paid")
      return res.status(400).json({ message: "This shipment payout already released" });

    order.shipments[idx].paymentStatus = "paid";
    order.shipments[idx].paymentDate   = new Date();

    if (!order.adminPayout) {
      order.adminPayout = { released: false, shipmentPayouts: [] };
    }

    order.adminPayout.shipmentPayouts.push({
      farmer:     farmerId,
      amount:     order.shipments[idx].subtotal,
      releasedAt: new Date(),
    });

    // If every shipment is now paid, mark the whole order as fully released
    const allPaid = order.shipments.every((s) => s.paymentStatus === "paid");
    if (allPaid) {
      order.adminPayout.released   = true;
      order.adminPayout.releasedAt = new Date();
      order.adminPayout.releasedBy = req.user._id;
    }

    await order.save();

    await sendNotification(
      farmerId,
      "payment_paid",
      `Payment released for order #${order._id.toString().slice(-6)}`,
      `Admin released Rs. ${order.shipments[idx].subtotal} to your account.`,
      { orderId: order._id }
    );

    res.json({ message: "Shipment payout released", order });
  } catch (err) {
    console.error("releasePayoutForShipment error:", err);
    res.status(500).json({ message: err.message });
  }
};