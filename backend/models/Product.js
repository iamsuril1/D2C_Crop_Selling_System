import mongoose from "mongoose";

const bulkTierSchema = new mongoose.Schema(
  {
    minQty: { type: Number, required: true }, // e.g. 100
    price:  { type: Number, required: true }, // discounted price per unit
    label:  { type: String, default: ""    }, // e.g. "Bulk (100kg+)"
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    farmer:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name:       { type: String, required: true, trim: true },
    category:   { type: String, required: true },
    subcategory:{ type: String, default: "" },
    price:      { type: Number, required: true }, // regular price per unit
    bulkPrice:  { type: Number, default: null  }, // price per unit for 100kg+
    minOrderQty:{ type: Number, default: 10    }, // minimum order quantity (default 10)
    quantity:   { type: Number, required: true },
    unit: {
      type: String,
      enum: ["kg", "g", "piece", "dozen", "liter", "ml"],
      default: "kg",
    },
    description: { type: String, default: "" },
    image:       { type: String, default: "" },
    harvestDate: { type: Date,   default: null },
    shelfLife:   { type: Number, required: true },
    expiresAt:   { type: Date,   default: null },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.pre("save", function () {
  const shelf = Number(this.shelfLife);
  if (!Number.isFinite(shelf) || shelf <= 0) {
    this.invalidate("shelfLife", "Shelf life must be a positive number");
    return;
  }
  const hd = this.harvestDate ? new Date(this.harvestDate) : null;
  if (!hd || Number.isNaN(hd.getTime())) {
    this.expiresAt = null;
    return;
  }
  this.expiresAt = new Date(hd.getTime() + shelf * 24 * 60 * 60 * 1000);
});

productSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

productSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Product", productSchema);