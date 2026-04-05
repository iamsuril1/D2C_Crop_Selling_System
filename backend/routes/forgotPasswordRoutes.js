import express from "express";
import rateLimit from "express-rate-limit";
import {
  sendForgotOtp,
  verifyForgotOtp,
  resetPassword,
} from "../controllers/forgotPasswordController.js";

const router = express.Router();

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many password reset requests. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/send-otp",    forgotLimiter, sendForgotOtp);
router.post("/verify-otp",  forgotLimiter, verifyForgotOtp);
router.post("/reset",       forgotLimiter, resetPassword);

export default router;