/* backend/controllers/orderController.js
   Added: PLATFORM_CHARGE = 25 (Rs.) applied once per order.
   Both estimateDeliveryMultiOrigin and createOrder now include it
   in grandTotal / totalAmount.
   The Order schema also stores platformCharge so it appears in
   receipts and the admin view.
*/

import Order   from "../models/Order.js";
import Product from "../models/Product.js";
import User    from "../models/User.js";
import { sendNotification } from "../utils/notificationHelpers.js";

const toNum = (v) => Number(v);

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
export const ORDER_TYPES = { NORMAL: "normal", BULK: "bulk" };
export const NORMAL_MIN_KG   = 20;
export const NORMAL_MAX_KG   = 99;
export const BULK_MIN_KG     = 100;
export const PLATFORM_CHARGE = 25;   // Rs. — flat fee per order

/* ─────────────────────────────────────────────────────────────
   QUANTITY VALIDATION
───────────────────────────────────────────────────────────── */
export const validateOrderTypeQty = (orderType, totalQty, unit = "kg") => {
  if (orderType === ORDER_TYPES.NORMAL) {
    if (totalQty < NORMAL_MIN_KG)
      return `Normal orders require at least ${NORMAL_MIN_KG} ${unit}. You have ${totalQty} ${unit}.`;
    if (totalQty > NORMAL_MAX_KG)
      return `Normal orders allow up to ${NORMAL_MAX_KG} ${unit}. Switch to Bulk for 100 ${unit}+.`;
  } else if (orderType === ORDER_TYPES.BULK) {
    if (totalQty < BULK_MIN_KG)
      return `Bulk orders require at least ${BULK_MIN_KG} ${unit}. You have ${totalQty} ${unit}.`;
  } else {
    return `Invalid order type. Choose "normal" or "bulk".`;
  }
  return null;
};

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

/* ── Bulk pricing ── */
const effectivePrice = (product, qty, orderType) => {
  if (
    orderType === ORDER_TYPES.BULK &&
    product.bulkPrice != null &&
    product.bulkPrice > 0
  ) {
    return product.bulkPrice;
  }
  return product.price;
};

/* ── Delivery fee (distance-based, same for Normal & Bulk) ── */
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

/* ── Normalize cart items ── */
const normalizeItems = (items, productById, orderType) =>
  items.map((it) => {
    const p         = productById.get(it.productId);
    if (!p) return null;
    const qty       = Math.max(1, toNum(it.quantity || 1));
    const unitPrice = effectivePrice(p, qty, orderType);
    return {
      farmerId:   p.farmer?._id?.toString(),
      farmer:     p.farmer,
      farmerDoc:  p.farmer,
      product:    p._id,
      productDoc: p,
      name:       p.name,
      price:      unitPrice,
      basePrice:  p.price,
      bulkPrice:  p.bulkPrice,
      quantity:   qty,
      unit:       p.unit,
    };
  });

/* ── Restore stock ── */
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
───────────────────────────────────────────────────────────── */
export const estimateDeliveryMultiOrigin = async (req, res) => {
  try {
    const { items, orderType = ORDER_TYPES.NORMAL } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "No items provided" });
    if (![ORDER_TYPES.NORMAL, ORDER_TYPES.BULK].includes(orderType))
      return res.status(400).json({ message: `Invalid orderType. Must be "normal" or "bulk"` });

    const productById = await loadProductsForCart(items);
    const normalized  = normalizeItems(items, productById, orderType);

    if (normalized.some((x) => !x || !x.farmerId))
      return res.status(400).json({ message: "One or more products are invalid" });

    const totalQty = normalized.reduce((s, x) => s + x.quantity, 0);
    const qtyError = validateOrderTypeQty(orderType, totalQty, normalized[0]?.unit || "kg");
    if (qtyError) return res.status(400).json({ message: qtyError, orderType, totalQty });

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
          productId:  x.product.toString(),
          name:       x.name,
          quantity:   x.quantity,
          price:      x.price,
          basePrice:  x.basePrice,
          bulkPrice:  x.bulkPrice,
          isBulk:     orderType === ORDER_TYPES.BULK,
          unit:       x.unit,
        })),
      });
    }

    const deliveryTotal = shipments.reduce((s, sh) => s + sh.deliveryFee, 0);
    // FIX: platform charge added to grand total
    const grandTotal    = itemsSubtotal + deliveryTotal + PLATFORM_CHARGE;

    res.json({
      orderType,
      totalQty,
      normalRange:         { min: NORMAL_MIN_KG, max: NORMAL_MAX_KG },
      bulkMin:             BULK_MIN_KG,
      consumerLocationSet: !!consumerCoords,
      shipments,
      itemsSubtotal,
      deliveryTotal,
      platformCharge:      PLATFORM_CHARGE,
      grandTotal,
    });
  } catch (err) {
    console.error("Estimate error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   CREATE ORDER — POST /api/orders
───────────────────────────────────────────────────────────── */
export const createOrder = async (req, res) => {
  try {
    const { items, orderType = ORDER_TYPES.NORMAL } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "No items provided" });
    if (![ORDER_TYPES.NORMAL, ORDER_TYPES.BULK].includes(orderType))
      return res.status(400).json({ message: `Invalid orderType. Must be "normal" or "bulk"` });

    const productById = await loadProductsForCart(items);
    const normalized  = normalizeItems(items, productById, orderType);

    if (normalized.some((x) => !x || !x.farmerId))
      return res.status(400).json({ message: "One or more products are invalid" });

    const totalQty = normalized.reduce((s, x) => s + x.quantity, 0);
    const qtyError = validateOrderTypeQty(orderType, totalQty, normalized[0]?.unit || "kg");
    if (qtyError) return res.status(400).json({ message: qtyError, orderType, totalQty });

    // Stock check
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
    // FIX: platform charge included in total stored on the order
    const totalAmount   = itemsSubtotal + deliveryTotal + PLATFORM_CHARGE;

    const order = await Order.create({
      consumer:       req.user._id,
      orderType,
      shipments,
      itemsSubtotal,
      deliveryTotal,
      platformCharge: PLATFORM_CHARGE,
      totalAmount,
    });

    // Deduct stock
    await Promise.all(
      normalized.map((item) =>
        Product.findByIdAndUpdate(
          item.product,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        )
      )
    );

    const label = orderType === ORDER_TYPES.BULK ? "Bulk o" : "O";
    await sendNotification(
      req.user._id,
      "order_placed",
      `${label}rder #${order._id.toString().slice(-6)} placed!`,
      `Your ${orderType} order is being processed`,
      { orderId: order._id }
    );
    for (const shipment of shipments) {
      await sendNotification(
        shipment.farmer,
        "order_placed",
        `New ${orderType} order #${order._id.toString().slice(-6)}`,
        `${req.user.firstName || "Consumer"} placed a ${orderType} order for ${shipment.items.length} item(s)`,
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
      return res.status(400).json({ message: `Cannot transition from '${order.status}' to '${status}'` });

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