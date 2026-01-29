import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { sendNotification } from "../utils/notificationHelpers.js"; // ✅ NEW

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
  const products = await Product.find({ _id: { $in: productIds } }).populate(
    "farmer",
    "firstName lastName email"
  );
  return new Map(products.map((p) => [p._id.toString(), p]));
};

const DELIVERY_FEE_PER_SHIPMENT = 200;

export const estimateDeliveryMultiOrigin = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items" });
    }

    const productById = await loadProductsForCart(items);

    const normalized = items.map((it) => {
      const p = productById.get(it.productId);
      if (!p) return null;

      const qty = Math.max(1, toNum(it.quantity || 1));
      return {
        farmerId: p.farmer?._id?.toString(),
        farmer: p.farmer,
        productId: p._id.toString(),
        name: p.name,
        price: toNum(p.price || 0),
        quantity: qty,
      };
    });

    if (normalized.some((x) => !x || !x.farmerId)) {
      return res.status(400).json({ message: "Invalid products/farmers" });
    }

    const grouped = groupBy(normalized, (x) => x.farmerId);

    let itemsSubtotal = 0;
    const shipments = [];

    for (const [farmerId, arr] of grouped.entries()) {
      const farmer = arr[0].farmer;

      const sub = arr.reduce((s, it) => s + it.price * it.quantity, 0);
      itemsSubtotal += sub;

      shipments.push({
        farmerId,
        farmerName: `${farmer.firstName} ${farmer.lastName}`,
        deliveryFee: DELIVERY_FEE_PER_SHIPMENT,
        subtotal: sub,
        items: arr.map((x) => ({
          productId: x.productId,
          name: x.name,
          quantity: x.quantity,
          price: x.price,
        })),
      });
    }

    const deliveryTotal = shipments.length * DELIVERY_FEE_PER_SHIPMENT;
    const grandTotal = itemsSubtotal + deliveryTotal;

    res.json({ shipments, itemsSubtotal, deliveryTotal, grandTotal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ FIXED: Complete createOrder with notifications
export const createOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items" });
    }

    const productById = await loadProductsForCart(items);

    const normalized = items.map((it) => {
      const p = productById.get(it.productId);
      if (!p) return null;

      const qty = Math.max(1, toNum(it.quantity || 1));
      return {
        farmerId: p.farmer?._id?.toString(),
        farmerDoc: p.farmer,
        product: p._id,
        name: p.name,
        price: toNum(p.price || 0),
        quantity: qty,
      };
    });

    if (normalized.some((x) => !x || !x.farmerId)) {
      return res.status(400).json({ message: "Invalid products/farmers" });
    }

    const grouped = groupBy(normalized, (x) => x.farmerId);

    let itemsSubtotal = 0;
    const shipments = [];

    for (const [farmerId, arr] of grouped.entries()) {
      const sub = arr.reduce((s, it) => s + it.price * it.quantity, 0);
      itemsSubtotal += sub;

      shipments.push({
        farmer: farmerId,
        items: arr.map((x) => ({
          product: x.product,
          name: x.name,
          quantity: x.quantity,
          price: x.price,
        })),
        deliveryFee: DELIVERY_FEE_PER_SHIPMENT,
        subtotal: sub,
      });
    }

    const deliveryTotal = shipments.length * DELIVERY_FEE_PER_SHIPMENT;
    const totalAmount = itemsSubtotal + deliveryTotal;

    const order = await Order.create({
      consumer: req.user._id,
      shipments,
      itemsSubtotal,
      deliveryTotal,
      totalAmount,
    });

    // ✅ NOTIFICATIONS: Notify consumer + all farmers
    await sendNotification(
      req.user._id, // consumer
      "order_placed",
      `Order #${order._id.slice(-6)} placed!`,
      "Your order is being processed by farmers",
      { orderId: order._id }
    );

    // Notify each farmer
    for (const shipment of shipments) {
      await sendNotification(
        shipment.farmer,
        "order_placed",
        `New order #${order._id.slice(-6)}`,
        `${req.user.firstName || "Consumer"} ordered ${shipment.items.length} items`,
        { orderId: order._id }
      );
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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

// ✅ FIXED: updateOrderStatus with notifications
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowed = ["pending", "confirmed", "shipped", "delivered"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const shipment = order.shipments.find(
      (s) => s.farmer.toString() === req.user._id.toString()
    );
    if (!shipment) return res.status(403).json({ message: "Unauthorized" });

    const oldStatus = order.status;
    order.status = status;
    await order.save();

    // ✅ NOTIFICATION: Notify consumer of status change
    await sendNotification(
      order.consumer._id,
      `order_${status}`,
      `Order #${order._id.slice(-6)} ${status}`,
      `Your order has been ${status}`,
      { orderId: order._id, status }
    );

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const cancelOrderConsumer = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.consumer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    if (order.status === "delivered") {
      return res
        .status(400)
        .json({ message: "Delivered orders cannot be cancelled" });
    }

    order.status = "cancelled";
    order.cancelledBy = "consumer";
    order.cancelledAt = new Date();
    await order.save();

    // ✅ NOTIFY FARMERS
    for (const shipment of order.shipments) {
      await sendNotification(
        shipment.farmer,
        "order_cancelled",
        `Order #${order._id.slice(-6)} cancelled`,
        "Consumer cancelled their order",
        { orderId: order._id }
      );
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel order" });
  }
};
