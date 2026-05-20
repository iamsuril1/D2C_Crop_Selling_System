import express from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  deleteMe,
  updateMyLocation,
  clearMyLocation,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

router.put("/update-profile", protect, updateProfile);

router.put("/location", protect, authorize("farmer", "consumer"), updateMyLocation);
router.put("/location/clear", protect, clearMyLocation);
router.delete("/me", protect, deleteMe);

export default router;