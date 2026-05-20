import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    type:        { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined },
  },
  { _id: false }
);

const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["esewa", "bank_qr", "bank_transfer", "cash_on_delivery"],
      required: true,
    },
    enabled:       { type: Boolean, default: false },
    esewaId:       String,
    bankName:      String,
    qrCodeImage:   String,
    accountNumber: String,
    accountName:   String,
    bankBranch:    String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    phone: {
      type:  String,
      trim:  true,
    },
    // FIX: select: false means password is NEVER returned unless explicitly
    // requested with .select("+password") — prevents accidental exposure
    password: {
      type:     String,
      required: true,
      select:   false,
    },
    role: {
      type:    String,
      enum:    ["consumer", "farmer", "admin"],
      default: "consumer",
    },
    profileImage: { type: String, default: "" },
    location:     { type: pointSchema, default: null },
    addressText:  { type: String, default: "" },
    paymentMethods: {
      type:    [paymentMethodSchema],
      default: [],
    },
    preferredPaymentMethod: {
      type:    String,
      enum:    ["esewa", "bank_qr", "bank_transfer", "cash_on_delivery"],
      default: "cash_on_delivery",
    },
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password; // extra safety net
    return ret;
  },
});
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);