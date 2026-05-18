/* backend/jobs/orderExpiryJob.js
   Runs every 5 minutes via node-cron.
   Finds orders that are:
     - status: "pending"
     - paymentStatus: "pending"  (consumer never paid)
     - createdAt older than 1 hour
   Then for each one:
     1. Restores stock for every item in every shipment
     2. Sets status → "cancelled", cancelledBy → "system"
     3. Notifies the consumer
     4. Notifies every farmer whose shipment is in the order
*/

import cron    from "node-cron";
import Order   from "../models/Order.js";
import Product from "../models/Product.js";
import { sendNotification } from "../utils/notificationHelpers.js";

const EXPIRY_MINUTES = 60; // cancel after this many minutes of being pending + unpaid

const cancelExpiredOrders = async () => {
  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);

  let expiredOrders;
  try {
    expiredOrders = await Order.find({
      status:        "pending",
      paymentStatus: "pending",   // consumer never completed payment
      createdAt:     { $lt: cutoff },
    }).populate("shipments.farmer", "firstName lastName");
  } catch (err) {
    console.error("[orderExpiryJob] DB query failed:", err.message);
    return;
  }

  if (expiredOrders.length === 0) return;

  console.log(`[orderExpiryJob] Found ${expiredOrders.length} expired order(s) — cancelling…`);

  for (const order of expiredOrders) {
    try {
      /* ── 1. Restore stock ── */
      const stockOps = order.shipments.flatMap((shipment) =>
        shipment.items.map((item) =>
          Product.findByIdAndUpdate(
            item.product,
            { $inc: { quantity: item.quantity } },
            { new: true }
          )
        )
      );
      await Promise.all(stockOps);

      /* ── 2. Cancel the order ── */
      order.status      = "cancelled";
      order.cancelledBy = "system";
      order.cancelledAt = new Date();
      await order.save();

      /* ── 3. Notify consumer ── */
      await sendNotification(
        order.consumer,
        "order_cancelled",
        `Order #${order._id.toString().slice(-6)} cancelled`,
        "Your order was automatically cancelled because payment was not completed within 1 hour. Stock has been released.",
        { orderId: order._id }
      );

      /* ── 4. Notify each farmer ── */
      const farmerIds = [
        ...new Set(order.shipments.map((s) =>
          (s.farmer?._id || s.farmer).toString()
        )),
      ];

      for (const farmerId of farmerIds) {
        await sendNotification(
          farmerId,
          "order_cancelled",
          `Order #${order._id.toString().slice(-6)} cancelled`,
          "This order was automatically cancelled — the consumer did not complete payment within 1 hour. Stock has been restored.",
          { orderId: order._id }
        );
      }

      console.log(`[orderExpiryJob] Cancelled order ${order._id} (consumer: ${order.consumer})`);
    } catch (err) {
      /* Log per-order errors but keep processing the rest */
      console.error(`[orderExpiryJob] Failed to cancel order ${order._id}:`, err.message);
    }
  }
};

export const startOrderExpiryJob = () => {
  cron.schedule("*/5 * * * *", () => {
    cancelExpiredOrders().catch((err) =>
      console.error("[orderExpiryJob] Unhandled error:", err)
    );
  });

  console.log("[orderExpiryJob] Started — checking for expired orders every 5 minutes");

  /* Run once immediately on startup so you don't have to wait 5 min */
  cancelExpiredOrders().catch((err) =>
    console.error("[orderExpiryJob] Startup run error:", err)
  );
};