import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser (for JWT in cookies)
app.use(cookieParser());
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

export default app;
