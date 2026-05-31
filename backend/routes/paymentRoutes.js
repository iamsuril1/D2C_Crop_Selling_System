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

router.get("/farmer/:farmerId",   getFarmerPaymentMethods);
router.put("/my-methods",  protect, authorize("farmer"), updateMyPaymentMethods);
router.post("/upload-qr",  protect, authorize("farmer"), upload.single("qrCode"), uploadPaymentQR);

router.post("/esewa/initiate", protect, authorize("consumer"), initiateEsewa);
router.post("/esewa/verify",   protect, authorize("consumer"), verifyEsewa);

router.post("/cod/confirm",    protect, authorize("consumer"), confirmCOD);
router.put ("/cod/received",   protect, authorize("farmer"),   markCODReceived);

router.post("/fonepay/confirm",   protect, authorize("consumer"), confirmFonePay);
router.put ("/fonepay/received",  protect, authorize("farmer"),   markFonePayReceived);

router.put("/verify", protect, authorize("farmer"), verifyPayment);

router.get("/files/:filename", protect, servePaymentFile);

export default router;