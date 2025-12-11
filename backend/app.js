import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: "http://localhost:5173", 
  credentials: true,
}));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "D2C Backend is running successfully",
  });
});

export default app;
