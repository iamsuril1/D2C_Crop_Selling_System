import Otp from "../models/Otp.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendOtpEmail } from "../utils/sendEmail.js";

export const sendForgotOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "No account found with this email" });

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email });
    await Otp.create({ email, code, expiresAt });
    await sendOtpEmail(email, code);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const verifyForgotOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "Email and code required" });

    const otp = await Otp.findOne({ email });
    if (!otp) return res.status(400).json({ message: "OTP not found or expired" });
    if (otp.code !== code) return res.status(400).json({ message: "Invalid OTP" });
    if (otp.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired" });

    otp.verified = true;
    await otp.save();

    res.json({ message: "OTP verified", verified: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const otp = await Otp.findOne({ email });
    if (!otp || !otp.verified) return res.status(400).json({ message: "Please verify OTP first" });
    if (otp.code !== code) return res.status(400).json({ message: "Invalid OTP" });
    if (otp.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired, request a new one" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashed });
    await Otp.deleteMany({ email });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};