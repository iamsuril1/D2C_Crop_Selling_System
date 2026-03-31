import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  createOrder,
  getFarmerOrders,
  updateOrderStatus,
  getMyOrders,
  cancelOrderConsumer,
  cancelOrderFarmer,       // FIX: import the new dedicated farmer cancel handler
  estimateDeliveryMultiOrigin,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/estimate", protect, authorize("consumer"), estimateDeliveryMultiOrigin);
router.post("/", protect, authorize("consumer"), createOrder);

router.get("/farmer", protect, authorize("farmer"), getFarmerOrders);
router.put("/:id/status", protect, authorize("farmer"), updateOrderStatus);
// FIX: Farmer cancel now uses cancelOrderFarmer (with shipped/delivered guard)
// instead of reusing the consumer cancel endpoint.
router.put("/:id/cancel/farmer", protect, authorize("farmer"), cancelOrderFarmer);

router.get("/my", protect, authorize("consumer"), getMyOrders);
router.put("/:id/cancel", protect, authorize("consumer"), cancelOrderConsumer);

export default router;