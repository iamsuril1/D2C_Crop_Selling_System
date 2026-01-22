import express from "express";
import {
  createProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
  getPublicProducts,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("farmer"), upload.single("image"), createProduct);
router.get("/my-products", protect, authorize("farmer"), getMyProducts);
router.put("/:id", protect, authorize("farmer"), upload.single("image"), updateProduct);
router.delete("/:id", protect, authorize("farmer"), deleteProduct);

// public list
router.get("/", getPublicProducts);

export default router;
