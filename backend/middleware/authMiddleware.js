import jwt  from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    if (
      user.role === "pending_google" &&
      !req.path.endsWith("/set-role")
    ) {
      return res.status(403).json({
        message: "Please complete registration by selecting your role.",
        code:    "ROLE_REQUIRED",
      });
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};