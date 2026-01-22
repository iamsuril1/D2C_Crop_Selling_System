import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    subcategory: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    unit: {
      type: String,
      enum: ["kg", "g", "piece", "dozen", "liter", "ml"],
      default: "kg",
    },
    description: { type: String, default: "" },
    image: { type: String, default: "" },

    // harvestDate optional, shelfLife required
    harvestDate: { type: Date, default: null },
    shelfLife: { type: Number, required: true },

    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * ✅ NO next() USED
 * Mongoose runs this as synchronous document middleware. [web:19]
 */
productSchema.pre("save", function () {
  // Ensure shelfLife is positive (required)
  const shelf = Number(this.shelfLife);
  if (!Number.isFinite(shelf) || shelf <= 0) {
    // `invalidate` triggers a ValidationError and stops save()
    this.invalidate("shelfLife", "Shelf life must be a positive number");
    return;
  }

  // harvestDate optional: if missing/invalid => no expiry
  const hd = this.harvestDate ? new Date(this.harvestDate) : null;
  if (!hd || Number.isNaN(hd.getTime())) {
    this.expiresAt = null;
    return;
  }

  // Both valid => calculate expiry
  const ms = shelf * 24 * 60 * 60 * 1000;
  this.expiresAt = new Date(hd.getTime() + ms);
});

// TTL index: MongoDB will delete when expiresAt is reached
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
