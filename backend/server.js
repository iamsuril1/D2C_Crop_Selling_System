import "./config/env.js";
import connectDB from "./config/db.js";
import app from "./app.js";
import { startOrderExpiryJob } from "./jobs/orderExpiryJob.js";

await connectDB();
startOrderExpiryJob();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));