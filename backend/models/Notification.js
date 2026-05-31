import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      "order_placed",
      "order_confirmed",
      "order_shipped",
      "order_delivered",
      "order_cancelled",
      "new_product_like",
      "payment_submitted",
      "payment_received",
      "payment_paid",
      "payment_failed",
      "return_requested",
      "return_approved",
      "return_rejected",
    ],
    required: true,
  },
  title:        { type: String, required: true },
  message:      { type: String, required: true },
  data:         { type: mongoose.Schema.Types.Mixed },
  isRead:       { type: Boolean, default: false },
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);