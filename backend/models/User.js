import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
  },
  { _id: false }
);

const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["esewa", "bank_qr", "bank_transfer", "cash_on_delivery"],
      required: true
    },
    enabled: { type: Boolean, default: false },
    
    // For eSewa
    esewaId: String,
    
    // For Bank QR
    bankName: String,
    qrCodeImage: String, // path to uploaded QR image
    
    // For Bank Transfer
    accountNumber: String,
    accountName: String,
    bankBranch: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["consumer", "farmer", "admin"],
      default: "consumer",
    },
    profileImage: { type: String, default: "" },

    // Location (for farmer and consumer)
    location: { type: pointSchema, default: null },
    addressText: { type: String, default: "" },
    
    // Payment information (farmer only)
    paymentMethods: {
      type: [paymentMethodSchema],
      default: []
    },
    
    // Default payment preference
    preferredPaymentMethod: {
      type: String,
      enum: ["esewa", "bank_qr", "bank_transfer", "cash_on_delivery"],
      default: "cash_on_delivery"
    }
  },
  { timestamps: true }
);

// Required for $near / proximity queries
userSchema.index({ location: "2dsphere" });

userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);