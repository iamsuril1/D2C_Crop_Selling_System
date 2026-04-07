import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields including phone number are required" });
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(409).json({ message: "Email already registered" });

    const phoneExists = await User.findOne({ phone: phone.trim() });
    if (phoneExists) return res.status(409).json({ message: "Phone number already registered" });

    const hashed  = await bcrypt.hash(password, 10);
    const safeRole = role === "farmer" ? "farmer" : "consumer";

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashed,
      role: safeRole,
      phone: phone.trim(),
    });

    res.status(201).json({ message: "Registered", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    let user = null;

    if (email && email.trim()) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    } else if (phone && phone.trim()) {
      user = await User.findOne({ phone: phone.trim() });
    } else {
      return res.status(400).json({ message: "Email or phone number is required" });
    }

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
        _id:          user._id,
        firstName:    user.firstName,
        lastName:     user.lastName,
        email:        user.email,
        phone:        user.phone,
        role:         user.role,
        profileImage: user.profileImage,
        location:     user.location,
        addressText:  user.addressText,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.firstName = req.body.firstName || user.firstName;
    user.lastName  = req.body.lastName  || user.lastName;
    user.email     = req.body.email     || user.email;

    if (req.body.phone !== undefined && req.body.phone.trim() !== "") {
      const newPhone = req.body.phone.trim();
      if (!/^[0-9]{10}$/.test(newPhone)) {
        return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
      }
      if (newPhone !== user.phone) {
        const taken = await User.findOne({ phone: newPhone, _id: { $ne: user._id } });
        if (taken) return res.status(409).json({ message: "Phone number already in use" });
      }
      user.phone = newPhone;
    }

    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
    }

    if (req.file) {
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    await user.save();
    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMyLocation = async (req, res) => {
  try {
    const { lat, lng, addressText } = req.body;

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ message: "Invalid lat/lng range" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.location = { type: "Point", coordinates: [lngNum, latNum] };
    if (addressText !== undefined) user.addressText = String(addressText);

    await user.save();

    res.json({
      message:     "Location updated",
      location:    user.location,
      addressText: user.addressText,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteMe = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};