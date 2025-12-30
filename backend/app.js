import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import path from "path";

const app = express();

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/auth", authRoutes);

export default app;
