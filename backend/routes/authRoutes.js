// routes/authRoutes.js
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
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

router.put("/update-profile", protect, upload.single("profileImage"), updateProfile);

// UPDATED: allow farmer + consumer to set location
router.put("/location", protect, authorize("farmer", "consumer"), updateMyLocation);

router.delete("/me", protect, deleteMe);

export default router;
