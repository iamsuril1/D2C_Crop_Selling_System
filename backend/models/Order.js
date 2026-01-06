import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    cancelledBy: {
      type: String,
      enum: ["admin", "farmer", "consumer"],
    },
    cancelledAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
