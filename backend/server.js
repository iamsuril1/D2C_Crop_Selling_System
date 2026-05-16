/* backend/server.js */
import connectDB from "./config/db.js";
import app from "./app.js";
import dotenv from "dotenv";
import { startOrderExpiryJob } from "./jobs/orderExpiryJob.js";   // ← NEW

dotenv.config();
await connectDB();

/* Start background jobs after the DB is ready */
startOrderExpiryJob();   // ← NEW — auto-cancels unpaid pending orders after 1 hour

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));