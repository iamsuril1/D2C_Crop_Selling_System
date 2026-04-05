import express from "express";
import rateLimit from "express-rate-limit";
import { sendOtp, verifyOtp } from "../controllers/otpController.js";

const router = express.Router();
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many verification attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/send",   sendLimiter,   sendOtp);
router.post("/verify", verifyLimiter, verifyOtp);

export default router;