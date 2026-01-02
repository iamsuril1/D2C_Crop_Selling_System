import express from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  deleteMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/update-profile", protect, upload.single("profileImage"), updateProfile);
router.delete("/me", protect, deleteMe);

export default router;
