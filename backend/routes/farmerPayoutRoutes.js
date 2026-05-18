/* backend/routes/farmerPayoutRoutes.js */
import express    from "express";
import { protect }   from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  getFarmerPayouts,
  getFarmerPayoutHistory,
  markFarmerPaid,
  getFarmerPayoutStats,
} from "../controllers/farmerPayoutController.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/",           getFarmerPayouts);
router.get("/history",    getFarmerPayoutHistory);
router.get("/stats",      getFarmerPayoutStats);
router.put("/:farmerId/pay", markFarmerPaid);

export default router;