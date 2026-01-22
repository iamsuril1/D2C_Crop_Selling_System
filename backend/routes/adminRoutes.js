import express from "express";
import {
  getAllUsers,
  createUser,
  deleteUser,
  getAllProducts,
  toggleProduct,
  getAllOrders,
  cancelOrderAdmin,
  deleteProductAdmin,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);

router.get("/products", getAllProducts);
router.put("/products/:id/toggle", toggleProduct);
router.delete("/products/:id", deleteProductAdmin);

router.get("/orders", getAllOrders);
router.put("/orders/:id/cancel", cancelOrderAdmin);

export default router;
