import mongoose from "mongoose";

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
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

    // NEW: used for farmer location (and can be used for consumer too)
    location: { type: pointSchema, default: null },
    addressText: { type: String, default: "" },
  },
  { timestamps: true }
);

// Required for $near / proximity queries [web:40]
userSchema.index({ location: "2dsphere" }); // [web:34]

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
