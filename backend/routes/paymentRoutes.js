import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  getFarmerPaymentMethods,
  updateMyPaymentMethods,
  uploadPaymentQR,
  submitPaymentProof,
  verifyPayment,
  servePaymentFile,   // FIX: use the new authorized handler
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/farmer/:farmerId", getFarmerPaymentMethods);
router.put("/my-methods",  protect, authorize("farmer"),   updateMyPaymentMethods);
router.post("/upload-qr",  protect, authorize("farmer"),   upload.single("qrCode"),       uploadPaymentQR);
router.post("/submit-proof", protect, authorize("consumer"), upload.single("paymentProof"), submitPaymentProof);
router.put("/verify",      protect, authorize("farmer"),   verifyPayment);

// FIX: was an inline handler with no ownership check;
// now calls servePaymentFile which verifies the requesting user
// is the order's consumer or the shipment's farmer.
router.get("/files/:filename", protect, servePaymentFile);

export default router;