import mongoose from "mongoose";
import bcrypt   from "bcryptjs";
import dotenv   from "dotenv";
import User     from "./models/User.js";
dotenv.config();
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set in your .env file.");
  process.exit(1);
}
const seedUsers = [
  {
    firstName: "Admin",
    lastName:  "MeroBari",
    email:     "admin@merobari.com",
    phone:     "9800000001",
    password:  "admin123",
    role:      "admin",
  },
  {
    firstName: "Hari",
    lastName:  "Farmer",
    email:     "farmer@merobari.com",
    phone:     "9800000002",
    password:  "farmer123",
    role:      "farmer",
    location: {
      type:        "Point",
      coordinates: [85.3240, 27.7172], 
    },
    addressText: "Kathmandu, Bagmati Province, Nepal",
    paymentMethods: [
      { type: "cash_on_delivery", enabled: true },
      { type: "esewa",            enabled: false },
      { type: "bank_qr",         enabled: false },
      { type: "bank_transfer",   enabled: false },
    ],
    preferredPaymentMethod: "cash_on_delivery",
  },
  {
    firstName: "Ram",
    lastName:  "Consumer",
    email:     "consumer@merobari.com",
    phone:     "9800000003",
    password:  "consumer123",
    role:      "consumer",
  
    location: {
      type:        "Point",
      coordinates: [85.3157, 27.6588], 
    },
    addressText: "Lalitpur, Bagmati Province, Nepal",
  },
];
const hashPassword = (plain) => bcrypt.hash(plain, 10);

const upsertUser = async (data) => {
  const { password, ...rest } = data;
  const hashed = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    { email: rest.email },
    { ...rest, password: hashed },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
 
  return user;
};
const seed = async () => {
  try {
    console.log("🔌  Connecting to MongoDB…");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.\n");

    console.log("Seeding accounts…\n");

    for (const data of seedUsers) {
      const user = await upsertUser(data);
      console.log(
        `   ✓  ${user.role.padEnd(8)}  ${user.email.padEnd(30)}  password: ${data.password}`
      );
    }
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log(" Disconnected from MongoDB.");
    process.exit(0);
  }
};
seed();