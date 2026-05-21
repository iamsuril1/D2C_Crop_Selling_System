import express from "express";
import passport from "passport";
import {
  register,
  login,
  getMe,
  updateProfile,
  deleteMe,
  updateMyLocation,
  clearMyLocation,
  googleCallback,
  setGoogleRole,
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

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`, session: false }),
  googleCallback
);

router.put("/set-role", protect, setGoogleRole);

export default router;