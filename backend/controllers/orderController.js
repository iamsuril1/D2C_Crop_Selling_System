/* backend/controllers/orderController.js
   Per-item order type.
   Each item in the cart carries its own orderType: "normal" | "bulk".
   The effective price is determined per-item (bulk price if type=bulk and available).
   The order document now stores the per-item type inside each shipment item.
*/

import Order   from "../models/Order.js";
import Product from "../models/Product.js";
import User    from "../models/User.js";
import { sendNotification } from "../utils/notificationHelpers.js";

const toNum = (v) => Number(v);

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
export const ORDER_TYPES     = { NORMAL: "normal", BULK: "bulk" };
export const NORMAL_MIN_KG   = 20;
export const NORMAL_MAX_KG   = 99;
export const BULK_MIN_KG     = 100;
export const PLATFORM_CHARGE = 25;

/* ─────────────────────────────────────────────────────────────
   PER-ITEM QUANTITY VALIDATION
───────────────────────────────────────────────────────────── */
export const validateItemOrderType = (orderType, qty, unit = "kg") => {
  if (orderType === ORDER_TYPES.NORMAL) {
    if (qty < NORMAL_MIN_KG)
      return `Normal orders require ≥ ${NORMAL_MIN_KG} ${unit} (item has ${qty})`;
    if (qty > NORMAL_MAX_KG)
      return `Normal orders allow ≤ ${NORMAL_MAX_KG} ${unit}. Switch to Bulk for ${qty} ${unit}`;
  } else if (orderType === ORDER_TYPES.BULK) {
    if (qty < BULK_MIN_KG)
      return `Bulk orders require ≥ ${BULK_MIN_KG} ${unit} (item has ${qty})`;
  } else {
    return `Invalid order type "${orderType}". Choose "normal" or "bulk"`;
  }
  return null;
};

/* Legacy alias */
export const validateOrderTypeQty = validateItemOrderType;

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
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
  const ids      = items.map((x) => x.productId);
  const products = await Product.find({ _id: { $in: ids } }).populate(
    "farmer", "firstName lastName email location"
  );
  return new Map(products.map((p) => [p._id.toString(), p]));
};

/**
 * Effective price per unit for a single item.
 * Uses bulkPrice when orderType=bulk and bulkPrice is set and > 0.
 */
const effectivePrice = (product, orderType) => {
  if (
    orderType === ORDER_TYPES.BULK &&
    product.bulkPrice != null &&
    Number(product.bulkPrice) > 0
  ) {
    return Number(product.bulkPrice);
  }
  return Number(product.price);
};

/* ── Delivery fee (distance-based) ── */
const BASE_FEE     = 50;
const BASE_KM      = 10;
const RATE_PER_KM  = 5;
const MIN_FEE      = 50;
const MAX_FEE      = 500;
const FALLBACK_FEE = 100;

const haversineKm = (c1, c2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const [lng1, lat1] = c1;
  const [lng2, lat2] = c2;
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calcDeliveryFee = (farmerCoords, consumerCoords) => {
  if (!farmerCoords || !consumerCoords) return FALLBACK_FEE;
  const distKm  = haversineKm(farmerCoords, consumerCoords);
  const extraKm = Math.max(0, Math.ceil(distKm) - BASE_KM);
  const fee     = BASE_FEE + extraKm * RATE_PER_KM;
  return Math.min(MAX_FEE, Math.max(MIN_FEE, Math.round(fee)));
};

/**
 * Normalize cart items, resolving product details and per-item effective price.
 * Each incoming item must have: { productId, quantity, orderType }
 */
const normalizeItems = (items, productById) =>
  items.map((it) => {
    const p         = productById.get(it.productId);
    if (!p) return null;
    const qty       = Math.max(1, toNum(it.quantity || 1));
    const itemType  = [ORDER_TYPES.NORMAL, ORDER_TYPES.BULK].includes(it.orderType)
      ? it.orderType
      : ORDER_TYPES.NORMAL;
    const unitPrice = effectivePrice(p, itemType);
    return {
      farmerId:   p.farmer?._id?.toString(),
      farmer:     p.farmer,
      product:    p._id,
      productDoc: p,
      name:       p.name,
      price:      unitPrice,
      basePrice:  Number(p.price),
      bulkPrice:  p.bulkPrice ? Number(p.bulkPrice) : null,
      quantity:   qty,
      unit:       p.unit,
      orderType:  itemType,
    };
  });

/* Restore stock */
const restoreStock = async (order) => {
  try {
    await Promise.all(
      order.shipments.flatMap((s) =>
        s.items.map((item) =>
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
   ESTIMATE — POST /api/orders/estimate
   Body: { items: [{ productId, quantity, orderType }] }
───────────────────────────────────────────────────────────── */
export const estimateDeliveryMultiOrigin = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    const productById = await loadProductsForCart(items);
    const normalized  = normalizeItems(items, productById);

    if (normalized.some((x) => !x || !x.farmerId))
      return res.status(400).json({ message: "One or more products are invalid" });

    /* Validate each item individually */
    for (const item of normalized) {
      const err = validateItemOrderType(item.orderType, item.quantity, item.unit);
      if (err) return res.status(400).json({ message: err, itemName: item.name });
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
          productId: x.product.toString(),
          name:      x.name,
          quantity:  x.quantity,
          price:     x.price,
          basePrice: x.basePrice,
          bulkPrice: x.bulkPrice,
          orderType: x.orderType,
          isBulk:    x.orderType === ORDER_TYPES.BULK,
          unit:      x.unit,
        })),
      });
    }

    const deliveryTotal = shipments.reduce((s, sh) => s + sh.deliveryFee, 0);
    const grandTotal    = itemsSubtotal + deliveryTotal + PLATFORM_CHARGE;

    res.json({
      consumerLocationSet: !!consumerCoords,
      shipments,
      itemsSubtotal,
      deliveryTotal,
      platformCharge:  PLATFORM_CHARGE,
      grandTotal,
      normalRange:     { min: NORMAL_MIN_KG, max: NORMAL_MAX_KG },
      bulkMin:         BULK_MIN_KG,
    });
  } catch (err) {
    console.error("Estimate error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   CREATE ORDER — POST /api/orders
   Body: { items: [{ productId, quantity, orderType }] }
───────────────────────────────────────────────────────────── */
export const createOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "No items provided" });

    const productById = await loadProductsForCart(items);
    const normalized  = normalizeItems(items, productById);

    if (normalized.some((x) => !x || !x.farmerId))
      return res.status(400).json({ message: "One or more products are invalid" });

    /* Per-item validation */
    for (const item of normalized) {
      const err = validateItemOrderType(item.orderType, item.quantity, item.unit);
      if (err) return res.status(400).json({ message: err, itemName: item.name });
    }

    /* Stock check */
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
        farmer:       farmerId,
        items: arr.map((x) => ({
          product:   x.product,
          name:      x.name,
          quantity:  x.quantity,
          price:     x.price,           // effective price (may be bulk price)
          basePrice: x.basePrice,       // always the regular price
          orderType: x.orderType,       // "normal" | "bulk" per item
        })),
        distanceKm:    distKm,
        deliveryFee,
        subtotal:      sub,
        paymentMethod: "pending",
        paymentStatus: "pending",
        farmerPaymentInfo,
      });
    }

    const deliveryTotal = shipments.reduce((s, sh) => s + sh.deliveryFee, 0);
    const totalAmount   = itemsSubtotal + deliveryTotal + PLATFORM_CHARGE;

    /* Determine the dominant order type for the order-level field
       (kept for compatibility; use item.orderType for per-item accuracy) */
    const bulkItemCount   = normalized.filter((x) => x.orderType === ORDER_TYPES.BULK).length;
    const dominantType    = bulkItemCount > normalized.length / 2
      ? ORDER_TYPES.BULK
      : ORDER_TYPES.NORMAL;

    const order = await Order.create({
      consumer:       req.user._id,
      orderType:      dominantType,
      shipments,
      itemsSubtotal,
      deliveryTotal,
      platformCharge: PLATFORM_CHARGE,
      totalAmount,
    });

    /* Deduct stock */
    await Promise.all(
      normalized.map((item) =>
        Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        )
      )
    );

    /* Notifications */
    const hasBulk = normalized.some((x) => x.orderType === ORDER_TYPES.BULK);
    await sendNotification(
      req.user._id,
      "order_placed",
      `Order #${order._id.toString().slice(-6)} placed!`,
      `Your order${hasBulk ? " (includes bulk items)" : ""} is being processed`,
      { orderId: order._id }
    );
    for (const shipment of shipments) {
      const hasBulkInShipment = shipment.items.some((i) => i.orderType === ORDER_TYPES.BULK);
      await sendNotification(
        shipment.farmer,
        "order_placed",
        `New order #${order._id.toString().slice(-6)}`,
        `${req.user.firstName || "Consumer"} placed an order for ${shipment.items.length} item(s)${hasBulkInShipment ? " (bulk)" : ""}`,
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
───────────────────────────────────────────────────────────── */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed    = ["confirmed", "shipped", "delivered"];
    if (!allowed.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "cancelled")
      return res.status(400).json({ message: "Cannot update a cancelled order" });
    if (order.status === "delivered")
      return res.status(400).json({ message: "Cannot update a delivered order" });

    const shipmentIndex = order.shipments.findIndex(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (shipmentIndex === -1)
      return res.status(403).json({ message: "Unauthorized" });

    const validProgressions = {
      pending:   ["confirmed"],
      confirmed: ["shipped"],
      shipped:   ["delivered"],
    };
    if (!validProgressions[order.status]?.includes(status))
      return res.status(400).json({
        message: `Cannot transition from '${order.status}' to '${status}'`,
      });

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
    if (order.consumer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Unauthorized" });

    const nonCancellable = ["shipped", "delivered", "cancelled"];
    if (nonCancellable.includes(order.status)) {
      const reason =
        order.status === "shipped"   ? "Order has already been shipped" :
        order.status === "delivered" ? "Delivered orders cannot be cancelled" :
                                       "Order is already cancelled";
      return res.status(400).json({ message: reason });
    }

    await restoreStock(order);
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

    await restoreStock(order);
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