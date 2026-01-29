import Notification from "../models/Notification.js";

export const sendNotification = async (userId, type, title, message, data = {}) => {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      data,
    });
  } catch (err) {
    console.error("Notification creation failed:", err);
  }
};
