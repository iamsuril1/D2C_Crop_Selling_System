import express from "express";
import {
  sendForgotOtp,
  verifyForgotOtp,
  resetPassword,
} from "../controllers/forgotPasswordController.js";

const router = express.Router();

router.post("/send-otp", sendForgotOtp);
router.post("/verify-otp", verifyForgotOtp);
router.post("/reset", resetPassword);

export default router;