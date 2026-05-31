import express    from "express";
import { protect }   from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  getPayoutStats,
  getPendingPayouts,
  getAllPayouts,
  releasePayoutForOrder,
  releasePayoutForShipment,
} from "../controllers/payoutController.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/stats",                      getPayoutStats);
router.get("/pending",                    getPendingPayouts);
router.get("/all",                        getAllPayouts);
router.put("/:orderId/release",           releasePayoutForOrder);
router.put("/:orderId/release/:farmerId", releasePayoutForShipment);

export default router;