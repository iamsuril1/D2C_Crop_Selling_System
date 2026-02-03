import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";
import {
  getFarmerPaymentMethods,
  updateMyPaymentMethods,
  uploadPaymentQR,
  submitPaymentProof,
  verifyPayment
} from "../controllers/paymentController.js";

const router = express.Router();

// Public: Get farmer payment methods
router.get("/farmer/:farmerId", getFarmerPaymentMethods);

// Farmer: Update payment methods
router.put("/my-methods", protect, authorize("farmer"), updateMyPaymentMethods);
router.post("/upload-qr", protect, authorize("farmer"), upload.single("qrCode"), uploadPaymentQR);

// Consumer: Submit payment proof
router.post("/submit-proof", protect, authorize("consumer"), upload.single("paymentProof"), submitPaymentProof);

// Farmer: Verify payment
router.put("/verify", protect, authorize("farmer"), verifyPayment);

export default router;