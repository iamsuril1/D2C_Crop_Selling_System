import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  createOrder,
  getFarmerOrders,
  updateOrderStatus,
  getMyOrders,
  cancelOrderConsumer,
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", protect, authorize("consumer"), createOrder);
router.get("/farmer", protect, authorize("farmer"), getFarmerOrders);
router.put("/:id/status", protect, authorize("farmer"), updateOrderStatus);

router.get("/my", protect, authorize("consumer"), getMyOrders);
router.put("/:id/cancel", protect, authorize("consumer"), cancelOrderConsumer);

export default router;
