import express    from "express";
import rateLimit  from "express-rate-limit";
import { submitContact } from "../controllers/contactController.js";

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   
  max: 5,                     
  message: {
    message: "Too many messages sent from this IP. Please wait an hour before trying again.",
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

router.post("/", contactLimiter, submitContact);

export default router;