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

// Both farmers and consumers can set their location
router.put("/location", protect, authorize("farmer", "consumer"), updateMyLocation);

// FIX: register the clearMyLocation route that existed in the controller but had no route
router.put("/location/clear", protect, clearMyLocation);

// FIX: deleteMe now requires password in request body
router.delete("/me", protect, deleteMe);

export default router;