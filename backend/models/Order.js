import mongoose from "mongoose";

const shipmentItemSchema = new mongoose.Schema(
  {
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name:     String,
    quantity: Number,
    price:    Number,
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items:  [shipmentItemSchema],

    distanceKm:  { type: Number, default: null },   // ← NEW: km between farmer & consumer
    deliveryFee: { type: Number, required: true, default: 50 },
    subtotal:    { type: Number, required: true, default: 0  },

    paymentMethod: {
      type: String,
      enum: ["esewa", "bank_qr", "bank_transfer", "cash_on_delivery", "pending"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentProof:      String,
    paymentDate:       Date,
    transactionId:     String,
    farmerPaymentInfo: {
      esewaId:       String,
      bankName:      String,
      accountNumber: String,
      accountName:   String,
      bankBranch:    String,
      qrCodeImage:   String,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shipments: { type: [shipmentSchema], default: [] },

    itemsSubtotal: { type: Number, required: true, default: 0 },
    deliveryTotal: { type: Number, required: true, default: 0 },
    totalAmount:   { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    cancelledBy: { type: String, enum: ["admin", "farmer", "consumer"] },
    cancelledAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

orderSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
orderSchema.set("toObject", { virtuals: true });

export default mongoose.model("Order", orderSchema);