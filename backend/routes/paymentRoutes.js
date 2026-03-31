import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import path from "path";
import fs from "fs";
import upload from "../middleware/uploadMiddleware.js";
import {
  getFarmerPaymentMethods,
  updateMyPaymentMethods,
  uploadPaymentQR,
  submitPaymentProof,
  verifyPayment,
} from "../controllers/paymentController.js";
const router = express.Router();
router.get("/farmer/:farmerId", getFarmerPaymentMethods);
router.put("/my-methods", protect, authorize("farmer"), updateMyPaymentMethods);
router.post("/upload-qr", protect, authorize("farmer"), upload.single("qrCode"), uploadPaymentQR);
router.post("/submit-proof", protect, authorize("consumer"), upload.single("paymentProof"), submitPaymentProof);
router.put("/verify", protect, authorize("farmer"), verifyPayment);
router.get("/files/:filename", protect, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(process.cwd(), "uploads", "private", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }

  res.sendFile(filePath);
});
export default router;