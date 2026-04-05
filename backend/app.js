import express from "express";
import cors    from "cors";
import path    from "path";
import fs      from "fs";

import authRoutes           from "./routes/authRoutes.js";
import productRoutes        from "./routes/productRoutes.js";
import orderRoutes          from "./routes/orderRoutes.js";
import adminRoutes          from "./routes/adminRoutes.js";
import geoRoutes            from "./routes/geoRoutes.js";
import notificationRoutes   from "./routes/notificationRoutes.js";
import paymentRoutes        from "./routes/paymentRoutes.js";
import otpRoutes            from "./routes/otpRoutes.js";
import forgotPasswordRoutes from "./routes/forgotPasswordRoutes.js";
import returnRoutes         from "./routes/returnRoutes.js";

import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

// Ensure upload directories exist
for (const dir of ["uploads", "uploads/private"]) {
  const p = path.join(process.cwd(), dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin, credentials: true }));


app.use(
  "/uploads",
  (req, res, next) => {
    const normalised = path.normalize(req.path);
    if (normalised.startsWith("/private")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  },
  express.static(path.join(process.cwd(), "uploads"))
);

app.use("/api/auth",            authRoutes);
app.use("/api/products",        productRoutes);
app.use("/api/orders",          orderRoutes);
app.use("/api/admin",           adminRoutes);
app.use("/api/geo",             geoRoutes);
app.use("/api/notifications",   notificationRoutes);
app.use("/api/payments",        paymentRoutes);
app.use("/api/otp",             otpRoutes);
app.use("/api/forgot-password", forgotPasswordRoutes);
app.use("/api/returns",         returnRoutes);

app.use(errorHandler);

export default app;