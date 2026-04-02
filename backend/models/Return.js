import mongoose from "mongoose";
const returnItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name:     { type: String, required: true },
    quantity: { type: Number, required: true },
    price:    { type: Number, required: true },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {

    order:    { type: mongoose.Schema.Types.ObjectId, ref: "Order",   required: true },
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    farmer:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    items: { type: [returnItemSchema], required: true },
    reason: {
      type: String,
      enum: [
        "damaged_item",
        "wrong_item",
        "quality_not_as_described",
        "item_missing",
        "changed_mind",
        "other",
      ],
      required: true,
    },
    reasonDetail: { type: String, default: "" },   
    evidencePhoto: { type: String, default: "" },   
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    farmerNote: { type: String, default: "" },

    decidedAt: { type: Date },
  },
  { timestamps: true }
);


returnSchema.index({ order: 1, farmer: 1 }, { unique: true });

returnSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Return", returnSchema);