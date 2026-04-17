import Order   from "../models/Order.js";
import Product from "../models/Product.js";
import User    from "../models/User.js";
import { sendNotification } from "../utils/notificationHelpers.js";

const toNum = (v) => Number(v);

const groupBy = (arr, keyFn) => {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
};

const loadProductsForCart = async (items) => {
  const productIds = items.map((x) => x.productId);
  const products   = await Product.find({ _id: { $in: productIds } }).populate(
    "farmer",
    "firstName lastName email location"
  );
  return new Map(products.map((p) => [p._id.toString(), p]));
};

/* ─────────────────────────────────────────────────────────────
   DELIVERY FEE CALCULATION
   Base  : Rs. 50 for the first 10 km
   Extra : Rs. 5  per km beyond 10 km  (rounded up to next km)
   Min   : Rs. 50
   Max   : Rs. 500
───────────────────────────────────────────────────────────── */
const BASE_FEE     = 50;
const BASE_KM      = 10;
const RATE_PER_KM  = 5;
const MIN_FEE      = 50;
const MAX_FEE      = 500;
const FALLBACK_FEE = 100;

const haversineKm = (coords1, coords2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calcDeliveryFee = (farmerCoords, consumerCoords) => {
  if (!farmerCoords || !consumerCoords) return FALLBACK_FEE;
  const distKm  = haversineKm(farmerCoords, consumerCoords);
  const extraKm = Math.max(0, Math.ceil(distKm) - BASE_KM);
  const fee     = BASE_FEE + extraKm * RATE_PER_KM;
  return Math.min(MAX_FEE, Math.max(MIN_FEE, Math.round(fee)));
};

/* ─────────────────────────────────────────────────────────────
   BULK PRICING HELPER
   FIX: shared between estimate AND createOrder so they always agree
───────────────────────────────────────────────────────────── */
const BULK_THRESHOLD = 100;

const effectivePrice = (product, qty) => {
  if (qty >= BULK_THRESHOLD && product.bulkPrice != null && product.bulkPrice > 0) {
    return product.bulkPrice;
  }
  return product.price;
};

/* ─────────────────────────────────────────────────────────────
   HELPER: restore stock
───────────────────────────────────────────────────────────── */
const restoreStock = async (order) => {
  try {
    await Promise.all(
      order.shipments.flatMap((shipment) =>
        shipment.items.map((item) =>
          Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: item.quantity } },
            { new: true }
          )
        )
      )
    );
    return { success: true };
  } catch (err) {
    console.error("Stock restore error:", err);
    return { success: false, error: err };
  }
};

/* ─────────────────────────────────────────────────────────────
   ESTIMATE — GET /api/orders/estimate
───────────────────────────────────────────────────────────── */
export const estimateDeliveryMultiOrigin = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items" });
    }

    const productById = await loadProductsForCart(items);

    const normalized = items.map((it) => {
      const p         = productById.get(it.productId);
      if (!p) return null;
      const qty       = Math.max(Number(p.minOrderQty || 10), toNum(it.quantity || 1));
      const unitPrice = effectivePrice(p, qty);
      return {
        farmerId:    p.farmer?._id?.toString(),
        farmer:      p.farmer,
        productId:   p._id.toString(),
        name:        p.name,
        price:       unitPrice,
        basePrice:   p.price,
        bulkPrice:   p.bulkPrice,
        minOrderQty: p.minOrderQty || 10,
        isBulk:      qty >= BULK_THRESHOLD && !!p.bulkPrice,
        quantity:    qty,
        unit:        p.unit,
      };
    });

    if (normalized.some((x) => !x || !x.farmerId)) {
      return res.status(400).json({ message: "Invalid products/farmers" });
    }

    const consumerCoords = req.user?.location?.coordinates || null;
    const grouped        = groupBy(normalized, (x) => x.farmerId);

    let itemsSubtotal = 0;
    const shipments   = [];

    for (const [farmerId, arr] of grouped.entries()) {
      const farmer       = arr[0].farmer;
      const farmerCoords = farmer?.location?.coordinates || null;
      const distKm       = farmerCoords && consumerCoords
        ? Math.round(haversineKm(farmerCoords, consumerCoords) * 10) / 10
        : null;
      const deliveryFee  = calcDeliveryFee(farmerCoords, consumerCoords);
      const sub          = arr.reduce((s, it) => s + it.price * it.quantity, 0);
      itemsSubtotal     += sub;

      shipments.push({
        farmerId,
        farmerName:  `${farmer.firstName} ${farmer.lastName}`,
        distanceKm:  distKm,
        deliveryFee,
        subtotal:    sub,
        items: arr.map((x) => ({
          productId:   x.productId,
          name:        x.name,
          quantity:    x.quantity,
          price:       x.price,
          basePrice:   x.basePrice,
          bulkPrice:   x.bulkPrice,
          isBulk:      x.isBulk,
          minOrderQty: x.minOrderQty,
          unit:        x.unit,
        })),
      });
    }

    const deliveryTotal = shipments.reduce((s, sh) => s + sh.deliveryFee, 0);
    const grandTotal    = itemsSubtotal + deliveryTotal;

    res.json({
      consumerLocationSet: !!consumerCoords,
      shipments,
      itemsSubtotal,
      deliveryTotal,
      grandTotal,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   CREATE ORDER — POST /api/orders
   FIX: now applies effectivePrice (bulk pricing) same as estimate
───────────────────────────────────────────────────────────── */
export const createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items" });
    }

    const productById = await loadProductsForCart(items);

    const normalized = items.map((it) => {
      const p   = productById.get(it.productId);
      if (!p) return null;
      // FIX: enforce minOrderQty and apply bulk pricing — same logic as estimate
      const qty = Math.max(Number(p.minOrderQty || 1), Math.max(1, toNum(it.quantity || 1)));
      const unitPrice = effectivePrice(p, qty);
      return {
        farmerId:   p.farmer?._id?.toString(),
        farmerDoc:  p.farmer,
        product:    p._id,
        productDoc: p,
        name:       p.name,
        price:      unitPrice,
        quantity:   qty,
      };
    });

    if (normalized.some((x) => !x || !x.farmerId)) {
      return res.status(400).json({ message: "Invalid products/farmers" });
    }

    // stock check
    for (const item of normalized) {
      if (item.productDoc.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.name}. Available: ${item.productDoc.quantity} ${item.productDoc.unit}`,
        });
      }
    }

    const consumerCoords = req.user?.location?.coordinates || null;
    const grouped        = groupBy(normalized, (x) => x.farmerId);

    let itemsSubtotal = 0;
    const shipments   = [];

    for (const [farmerId, arr] of grouped.entries()) {
      const sub = arr.reduce((s, it) => s + it.price * it.quantity, 0);
      itemsSubtotal += sub;

      const farmer       = await User.findById(farmerId).select(
        "paymentMethods preferredPaymentMethod firstName lastName location"
      );
      const farmerCoords = farmer?.location?.coordinates || null;
      const distKm       = farmerCoords && consumerCoords
        ? Math.round(haversineKm(farmerCoords, consumerCoords) * 10) / 10
        : null;
      const deliveryFee  = calcDeliveryFee(farmerCoords, consumerCoords);

      const farmerPaymentInfo = {
        esewaId:       farmer.paymentMethods?.find((p) => p.type === "esewa"         && p.enabled)?.esewaId       || null,
        bankName:      farmer.paymentMethods?.find((p) => (p.type === "bank_qr" || p.type === "bank_transfer") && p.enabled)?.bankName || null,
        accountNumber: farmer.paymentMethods?.find((p) => p.type === "bank_transfer" && p.enabled)?.accountNumber || null,
        accountName:   farmer.paymentMethods?.find((p) => p.type === "bank_transfer" && p.enabled)?.accountName   || null,
        bankBranch:    farmer.paymentMethods?.find((p) => p.type === "bank_transfer" && p.enabled)?.bankBranch    || null,
        qrCodeImage:   farmer.paymentMethods?.find((p) => p.type === "bank_qr"       && p.enabled)?.qrCodeImage   || null,
      };

      shipments.push({
        farmer:         farmerId,
        items: arr.map((x) => ({
          product:  x.product,
          name:     x.name,
          quantity: x.quantity,
          price:    x.price,
        })),
        distanceKm:     distKm,
        deliveryFee,
        subtotal:       sub,
        paymentMethod:  "pending",
        paymentStatus:  "pending",
        farmerPaymentInfo,
      });
    }

    const deliveryTotal = shipments.reduce((s, sh) => s + sh.deliveryFee, 0);
    const totalAmount   = itemsSubtotal + deliveryTotal;

    const order = await Order.create({
      consumer: req.user._id,
      shipments,
      itemsSubtotal,
      deliveryTotal,
      totalAmount,
    });

    // deduct stock
    await Promise.all(
      normalized.map((item) =>
        Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        )
      )
    );

    await sendNotification(
      req.user._id,
      "order_placed",
      `Order #${order._id.toString().slice(-6)} placed!`,
      "Your order is being processed by farmers",
      { orderId: order._id }
    );

    for (const shipment of shipments) {
      await sendNotification(
        shipment.farmer,
        "order_placed",
        `New order #${order._id.toString().slice(-6)}`,
        `${req.user.firstName || "Consumer"} ordered ${shipment.items.length} item(s)`,
        { orderId: order._id }
      );
    }

    res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET FARMER ORDERS
───────────────────────────────────────────────────────────── */
export const getFarmerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ "shipments.farmer": req.user._id })
      .populate("consumer", "firstName lastName email")
      .populate("shipments.farmer", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET MY ORDERS (consumer)
───────────────────────────────────────────────────────────── */
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ consumer: req.user._id })
      .populate("shipments.farmer", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   UPDATE ORDER STATUS (farmer)
   FIX: cleaner status progression check — no misleading rank for 'cancelled'
───────────────────────────────────────────────────────────── */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["confirmed", "shipped", "delivered"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // FIX: guard cancelled and delivered separately — don't use rank for cancelled
    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Cannot update a cancelled order" });
    }
    if (order.status === "delivered") {
      return res.status(400).json({ message: "Cannot update a delivered order" });
    }

    const shipmentIndex = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (shipmentIndex === -1) return res.status(403).json({ message: "Unauthorized" });

    // FIX: explicit valid progression table — no rank-based comparisons
    const validProgressions = {
      pending:   ["confirmed"],
      confirmed: ["shipped"],
      shipped:   ["delivered"],
    };

    if (!validProgressions[order.status]?.includes(status)) {
      return res.status(400).json({
        message: `Cannot transition from '${order.status}' to '${status}'`,
      });
    }

    order.status = status;
    if (status === "delivered") order.deliveredAt = new Date();

    await order.save();

    await sendNotification(
      order.consumer,
      `order_${status}`,
      `Order #${order._id.toString().slice(-6)} ${status}`,
      `Your order has been ${status}`,
      { orderId: order._id, status }
    );

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   CANCEL ORDER (consumer)
───────────────────────────────────────────────────────────── */
export const cancelOrderConsumer = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.consumer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const nonCancellable = ["shipped", "delivered", "cancelled"];
    if (nonCancellable.includes(order.status)) {
      const reason =
        order.status === "shipped"   ? "Order has already been shipped" :
        order.status === "delivered" ? "Delivered orders cannot be cancelled" :
                                       "Order is already cancelled";
      return res.status(400).json({ message: reason });
    }

    const { success } = await restoreStock(order);
    if (!success) console.error("Partial stock restore on consumer cancel");

    order.status      = "cancelled";
    order.cancelledBy = "consumer";
    order.cancelledAt = new Date();
    await order.save();

    for (const shipment of order.shipments) {
      await sendNotification(
        shipment.farmer,
        "order_cancelled",
        `Order #${order._id.toString().slice(-6)} cancelled`,
        "Consumer cancelled their order",
        { orderId: order._id }
      );
    }

    res.json(order);
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
};

/* ─────────────────────────────────────────────────────────────
   CANCEL ORDER (farmer)
───────────────────────────────────────────────────────────── */
export const cancelOrderFarmer = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const hasShipment = order.shipments.some(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (!hasShipment) return res.status(403).json({ message: "Unauthorized" });

    const nonCancellable = ["shipped", "delivered", "cancelled"];
    if (nonCancellable.includes(order.status)) {
      return res.status(400).json({
        message:
          order.status === "shipped"   ? "Order has already been shipped" :
          order.status === "delivered" ? "Delivered orders cannot be cancelled" :
                                         "Order is already cancelled",
      });
    }

    const { success } = await restoreStock(order);
    if (!success) console.error("Partial stock restore on farmer cancel");

    order.status      = "cancelled";
    order.cancelledBy = "farmer";
    order.cancelledAt = new Date();
    await order.save();

    await sendNotification(
      order.consumer,
      "order_cancelled",
      `Order #${order._id.toString().slice(-6)} cancelled`,
      "The farmer has cancelled your order",
      { orderId: order._id }
    );

    res.json(order);
  } catch (err) {
    console.error("Farmer cancel order error:", err);
    res.status(500).json({ message: "Failed to cancel order" });
  }
};