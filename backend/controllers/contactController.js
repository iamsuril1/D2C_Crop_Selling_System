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

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Name, email, and message are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ message: "Message must be at least 10 characters" });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ message: "Message must be under 2000 characters" });
    }

    const subjectLabels = {
      farmer_support:   "Farmer Support",
      consumer_support: "Consumer Support",
      payment_issue:    "Payment Issue",
      order_issue:      "Order Issue",
      return_request:   "Return / Refund",
      general:          "General Inquiry",
      other:            "Other",
    };

    const subjectLabel = subjectLabels[subject] || subject || "General Inquiry";

    // ── Email to admin ──────────────────────────────────────────────────────
    await transporter.sendMail({
      from:    `"MeroBari Contact" <${process.env.EMAIL_USER}>`,
      to:      process.env.EMAIL_USER,
      replyTo: email.trim(),
      subject: `[MeroBari Contact] ${subjectLabel} — from ${name.trim()}`,
      html: `
        <div style="font-family:sans-serif;max-width:620px;margin:auto;padding:0;
                    border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1E9C17,#27AE60);
                      padding:28px 32px;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;
                       letter-spacing:-0.3px;">
              New Contact Form Submission
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">
              MeroBari — Direct to Consumer Marketplace
            </p>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px;background:#fff;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;
                          color:#1D1D1D;">
              <tr>
                <td style="padding:10px 14px;font-weight:600;background:#F7FAF7;
                           border-radius:6px 0 0 6px;width:110px;
                           border-bottom:1px solid #f0f0f0;">
                  Name
                </td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
                  ${name.trim()}
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;background:#F7FAF7;
                           border-bottom:1px solid #f0f0f0;">
                  Email
                </td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
                  <a href="mailto:${email.trim()}"
                     style="color:#1E9C17;text-decoration:none;">
                    ${email.trim()}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;background:#F7FAF7;
                           border-bottom:1px solid #f0f0f0;">
                  Subject
                </td>
                <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
                  ${subjectLabel}
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;background:#F7FAF7;
                           vertical-align:top;">
                  Message
                </td>
                <td style="padding:10px 14px;white-space:pre-wrap;
                           line-height:1.6;">
                  ${message.trim()}
                </td>
              </tr>
            </table>

            <div style="margin-top:24px;padding:14px 16px;
                        background:#FFF8E7;border-radius:8px;
                        border-left:4px solid #FDB933;">
              <p style="margin:0;font-size:13px;color:#7a6000;">
                <strong>Reply directly</strong> to this email to respond to
                <strong>${name.trim()}</strong> at
                <a href="mailto:${email.trim()}"
                   style="color:#1E9C17;">${email.trim()}</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding:16px 32px;background:#F7FAF7;
                      border-top:1px solid #e8e8e8;">
            <p style="margin:0;color:#9e9e9e;font-size:12px;">
              Sent via MeroBari contact form ·
              ${new Date().toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
      `,
    });

    // ── Auto-reply to user ──────────────────────────────────────────────────
    await transporter.sendMail({
      from:    `"MeroBari Support" <${process.env.EMAIL_USER}>`,
      to:      email.trim(),
      subject: "We received your message — MeroBari",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:0;
                    border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">

          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1E9C17,#27AE60);
                      padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">
              MeroBari
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
              Direct to Consumer Marketplace
            </p>
          </div>

          <!-- Body -->
          <div style="padding:32px;background:#fff;">
            <h2 style="margin:0 0 12px;font-size:20px;color:#1D1D1D;">
              Thank you, ${name.trim()}! 👋
            </h2>
            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.7;">
              We've received your message and our support team will get back
              to you within <strong>24 hours</strong>.
            </p>

            <!-- Message echo -->
            <div style="background:#F7FAF7;border-radius:10px;
                        padding:20px 24px;margin-bottom:24px;
                        border-left:4px solid #1E9C17;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;
                        text-transform:uppercase;letter-spacing:0.08em;
                        color:#1E9C17;">
                Your message
              </p>
              <p style="margin:0;font-size:14px;color:#444;
                        font-style:italic;line-height:1.6;white-space:pre-wrap;">
                "${message.trim()}"
              </p>
            </div>

            <!-- Subject badge -->
            <p style="margin:0 0 8px;font-size:13px;color:#777;">
              Topic:
              <span style="display:inline-block;background:#E8F5E9;
                           color:#1E9C17;font-weight:600;
                           padding:2px 10px;border-radius:20px;
                           font-size:12px;margin-left:6px;">
                ${subjectLabel}
              </span>
            </p>

            <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;" />

            <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
              If you have additional information to share, simply reply to
              this email.<br/>
              We're here to help every farmer and consumer on MeroBari.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding:16px 32px;background:#F7FAF7;
                      border-top:1px solid #e8e8e8;text-align:center;">
            <p style="margin:0;color:#bbb;font-size:11px;">
              © ${new Date().getFullYear()} MeroBari · Nepal's D2C Agriculture Platform<br/>
              If you did not submit this form, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    res.json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ message: "Failed to send message. Please try again." });
  }
};