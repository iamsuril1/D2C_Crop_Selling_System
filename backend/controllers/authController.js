import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email exists" });

  const hashed = await bcrypt.hash(password, 10);

  const safeRole = role === "farmer" ? "farmer" : "consumer";

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashed,
    role: safeRole,
  });

  res.status(201).json({ message: "Registered", userId: user._id });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    },
  });
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const updateProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  user.firstName = req.body.firstName || user.firstName;
  user.lastName = req.body.lastName || user.lastName;
  user.email = req.body.email || user.email;

  if (req.body.password) {
    user.password = await bcrypt.hash(req.body.password, 10);
  }

  if (req.file) {
    user.profileImage = `/uploads/${req.file.filename}`;
  }

  await user.save();
  res.json({ message: "Profile updated", user });
};

export const deleteMe = async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  res.json({ message: "Account deleted" });
};
