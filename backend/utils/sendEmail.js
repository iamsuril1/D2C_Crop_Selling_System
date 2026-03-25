import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});
export const sendOtpEmail = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"MeroBari" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your MeroBari Verification Code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;">
        <h2 style="color:#1E9C17;">MeroBari Email Verification</h2>
        <p>Use the code below to verify your email. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1D1D1D;margin:24px 0;">${otp}</div>
        <p style="color:#828282;font-size:12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};