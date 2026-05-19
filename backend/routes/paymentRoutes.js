/* backend/routes/paymentRoutes.js */

import express from "express";
import { protect }    from "../middleware/authMiddleware.js";
import { authorize }  from "../middleware/roleMiddleware.js";
import upload         from "../middleware/uploadMiddleware.js";
import {
  getFarmerPaymentMethods,
  updateMyPaymentMethods,
  uploadPaymentQR,
  initiateEsewa,
  verifyEsewa,
  confirmCOD,
  markCODReceived,
  confirmFonePay,
  markFonePayReceived,
  verifyPayment,
  servePaymentFile,
} from "../controllers/paymentController.js";

const router = express.Router();

/* ── Farmer payment settings ── */
router.get("/farmer/:farmerId",   getFarmerPaymentMethods);
router.put("/my-methods",  protect, authorize("farmer"), updateMyPaymentMethods);
router.post("/upload-qr",  protect, authorize("farmer"), upload.single("qrCode"), uploadPaymentQR);

/* ── eSewa (pre-payment) ── */
router.post("/esewa/initiate", protect, authorize("consumer"), initiateEsewa);
router.post("/esewa/verify",   protect, authorize("consumer"), verifyEsewa);

/* ── Cash on Delivery (post-payment, pay cash on delivery) ── */
router.post("/cod/confirm",    protect, authorize("consumer"), confirmCOD);
router.put ("/cod/received",   protect, authorize("farmer"),   markCODReceived);

/* ── FonePay on Delivery (post-payment, pay via FonePay QR scan on delivery) ── */
router.post("/fonepay/confirm",   protect, authorize("consumer"), confirmFonePay);
router.put ("/fonepay/received",  protect, authorize("farmer"),   markFonePayReceived);

/* ── Farmer verifies manual payment proof ── */
router.put("/verify", protect, authorize("farmer"), verifyPayment);

/* ── Serve private files ── */
router.get("/files/:filename", protect, servePaymentFile);

export default router;