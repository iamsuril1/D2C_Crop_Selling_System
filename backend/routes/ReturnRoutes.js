import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  createReturn,
  getMyReturns,
  getFarmerReturns,
  approveReturn,
  rejectReturn,
  serveReturnFile,
} from "../controllers/returnController.js";

const router = express.Router();
router.post(  "/",         protect, authorize("consumer"), upload.single("evidencePhoto"), createReturn);
router.get(   "/my",       protect, authorize("consumer"), getMyReturns);
router.get(   "/farmer",   protect, authorize("farmer"),   getFarmerReturns);
router.put(   "/:id/approve", protect, authorize("farmer"), approveReturn);
router.put(   "/:id/reject",  protect, authorize("farmer"), rejectReturn);
router.get(   "/files/:filename", protect, serveReturnFile);

export default router;