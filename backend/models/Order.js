import mongoose from "mongoose";

const shipmentItemSchema = new mongoose.Schema(
  {
    product:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name:      String,
    quantity:  Number,
    price:     Number,     
    basePrice: Number,    
    bulkPrice: Number,      
    orderType: {            
      type:    String,
      enum:    ["normal", "bulk"],
      default: "normal",
    },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    farmer:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items:       [shipmentItemSchema],
    distanceKm:  { type: Number, default: null },
    deliveryFee: { type: Number, required: true, default: 50 },
    subtotal:    { type: Number, required: true, default: 0 },
    paymentMethod: {
      type:    String,
      enum:    ["esewa", "fonepay", "cash_on_delivery", "pending"],
      default: "pending",
    },
    paymentStatus: {
      type:    String,
      enum:    ["pending", "paid", "failed", "refunded", "pending_admin_release"],
      default: "pending",
    },
    paymentProof:  String,
    paymentDate:   Date,
    transactionId: String,
    farmerPaymentInfo: {
      esewaId:       String,
      bankName:      String,
      accountNumber: String,
      accountName:   String,
      bankBranch:    String,
      qrCodeImage:   String,
    },
    farmerPaid: {
      type:    Boolean,
      default: false,
    },
    farmerPaymentRecord: {
      method:    { type: String },
      reference: { type: String },
      paidAt:    { type: Date   },
      paidBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    consumer:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderType: {
      type:     String,
      enum:     ["normal", "bulk"],
      default:  "normal",
      required: true,
    },

    paymentType: {
      type:    String,
      enum:    ["pre_payment", "post_payment"],
      default: null,
    },
    paymentStatus: {
      type:    String,
      enum:    ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    esewaTransactionUuid: { type: String, default: null },

    shipments:      { type: [shipmentSchema], default: [] },
    itemsSubtotal:  { type: Number, required: true, default: 0 },
    deliveryTotal:  { type: Number, required: true, default: 0 },
    platformCharge: { type: Number, required: true, default: 25 },
    totalAmount:    { type: Number, required: true },

    status: {
      type:    String,
      enum:    ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    cancelledBy: {
      type: String,
      enum: ["admin", "farmer", "consumer", "system"],
    },
    cancelledAt: Date,
    deliveredAt: Date,

    adminPayout: {
      released:   { type: Boolean, default: false },
      releasedAt: { type: Date,    default: null  },
      releasedBy: {
        type:    mongoose.Schema.Types.ObjectId,
        ref:     "User",
        default: null,
      },
      shipmentPayouts: {
        type: [
          {
            farmer:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            amount:     { type: Number },
            releasedAt: { type: Date   },
            _id: false,
          },
        ],
        default: [],
      },
    },
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