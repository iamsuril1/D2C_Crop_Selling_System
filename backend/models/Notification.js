import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Fast lookups by user
  },
  type: {
    type: String,
    enum: [
      "order_placed",      // New order for farmer
      "order_confirmed",   // Farmer confirmed
      "order_shipped",     // Farmer shipped
      "order_delivered",   // Delivered to consumer
      "order_cancelled",   // Cancelled
      "new_product_like",  // Consumer liked product
      "payment_received",  // Payment confirmed
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // orderId, productId, etc.
  isRead: { type: Boolean, default: false },
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
}, { 
  timestamps: true 
});

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
