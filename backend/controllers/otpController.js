import Otp from "../models/Otp.js";
import User from "../models/User.js";
import { sendOtpEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Delete any previous OTP for this email
    await Otp.deleteMany({ email });

    await Otp.create({ email, code, expiresAt });
    await sendOtpEmail(email, code);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Email and code required" });

    const otp = await Otp.findOne({ email });

    if (!otp) return res.status(400).json({ message: "OTP not found or expired" });
    if (otp.code !== code) return res.status(400).json({ message: "Invalid OTP" });
    if (otp.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    await Otp.deleteOne({ _id: otp._id });

    res.json({ message: "OTP verified", verified: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};