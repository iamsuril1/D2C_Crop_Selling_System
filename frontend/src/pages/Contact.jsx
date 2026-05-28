import { useState } from "react";
import api from "../api/axios";
import AlertModal from "../components/AlertModal";

const subjects = [
  { value: "", label: "Select a topic" },
  { value: "farmer_support",   label: "🌾  Farmer Support"    },
  { value: "consumer_support", label: "🛒  Consumer Support"  },
  { value: "payment_issue",    label: "💳  Payment Issue"     },
  { value: "order_issue",      label: "📦  Order Issue"       },
  { value: "return_request",   label: "↩️  Return / Refund"  },
  { value: "general",          label: "💬  General Inquiry"   },
  { value: "other",            label: "✉️  Other"             },
];

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [focused, setFocused] = useState(null);
  const [sending, setSending] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });

  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      showAlert("Missing Fields", "Please fill in all required fields.", "warning");
      return;
    }

    setSending(true);
    try {
      await api.post("/api/contact", {
        name:    form.name.trim(),
        email:   form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
      });
      setForm({ name: "", email: "", subject: "", message: "" });
      showAlert(
        "Message Sent!",
        "Thank you for reaching out. We'll get back to you within 24 hours.",
        "success"
      );
    } catch (err) {
      showAlert(
        "Failed to Send",
        err.response?.data?.message || "Something went wrong. Please try emailing us directly.",
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  const inputClass = (field) =>
    `w-full bg-[#F7FAF7] border-2 rounded-xl px-4 py-3 text-sm text-[#1D1D1D] placeholder-gray-400 outline-none transition-all duration-200 min-h-[44px] ${
      focused === field
        ? "border-[#1E9C17] bg-white shadow-[0_0_0_4px_rgba(30,156,23,0.08)]"
        : "border-transparent hover:border-gray-200"
    }`;

  return (
    <div className="min-h-screen font-[Poppins] bg-[#F4F6F3] flex items-center justify-center px-3 sm:px-4 py-10 sm:py-16">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
      />

      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#1E9C17] mb-2 sm:mb-3">
            MeroBari Support
          </span>
          <h1 className="font-[Montserrat] text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1D1D1D] leading-tight">
            How can we<br />
            <span className="text-[#1E9C17]">help you?</span>
          </h1>
          <p className="mt-2 sm:mt-3 text-sm text-gray-500">
            Send us a message and we'll respond within 24 hours.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-green-900/5 border border-gray-100 overflow-hidden">

          <div className="h-1.5 w-full bg-gradient-to-r from-[#1E9C17] via-[#27AE60] to-[#FDB933]" />

          <div className="p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

              {/* Name + Email — stacks on mobile, side-by-side on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    placeholder="Your name"
                    className={inputClass("name")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    placeholder="you@email.com"
                    className={inputClass("email")}
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Subject
                </label>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  onFocus={() => setFocused("subject")}
                  onBlur={() => setFocused(null)}
                  className={inputClass("subject")}
                >
                  {subjects.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  onFocus={() => setFocused("message")}
                  onBlur={() => setFocused(null)}
                  rows={5}
                  placeholder="Describe your issue or question..."
                  className={`${inputClass("message")} resize-none`}
                />
                <p className="text-right text-xs text-gray-400">
                  {form.message.length} characters
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={sending}
                className="group relative w-full overflow-hidden bg-[#1E9C17] hover:bg-[#188514] disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-4 sm:py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 hover:shadow-green-900/30 hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base min-h-[48px]"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {sending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer strip — stacks on mobile */}
          <div className="bg-[#F7FAF7] border-t border-gray-100 px-5 sm:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 sm:justify-between">
            <p className="text-xs text-gray-400">
              Or email us at{" "}
              <a href="mailto:support@merobari.com" className="text-[#1E9C17] font-medium hover:underline">
                support@merobari.com
              </a>
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1E9C17] animate-pulse" />
              <span className="text-xs text-gray-400">Online</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5 sm:mt-6">
          Average response time · <span className="text-[#1D1D1D] font-medium">under 24 hours</span>
        </p>
      </div>
    </div>
  );
};

export default Contact;