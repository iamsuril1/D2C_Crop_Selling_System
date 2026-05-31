import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  getNearbyFarmersForMe,
  getNearbyProductsForMe,
} from "../controllers/geoController.js";

const router = express.Router();

router.get("/nearby-farmers", protect, authorize("consumer"), getNearbyFarmersForMe);
router.get("/nearby-products", protect, authorize("consumer"), getNearbyProductsForMe);

export default router;
