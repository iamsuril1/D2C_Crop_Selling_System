import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "D2C Backend is running successfully",
  });
});

app.use("/api/auth", authRoutes);

export default app;
