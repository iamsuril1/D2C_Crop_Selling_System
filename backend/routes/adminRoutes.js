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

// Apply protection & admin role
router.use(protect, authorize("admin"));

// USERS
router.get("/users", getAllUsers);
router.post("/users", createUser);
router.delete("/users/:id", deleteUser);

// PRODUCTS
router.get("/products", getAllProducts);
router.put("/products/:id/toggle", toggleProduct);

// ORDERS
router.get("/orders", getAllOrders);
router.put("/orders/:id/cancel", cancelOrderAdmin);
router.delete("/products/:id", deleteProductAdmin);


export default router;
