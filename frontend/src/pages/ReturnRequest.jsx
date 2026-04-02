import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import AlertModal from "../components/AlertModal";

const REASON_LABELS = {
  damaged_item:             "Item arrived damaged",
  wrong_item:               "Wrong item received",
  quality_not_as_described: "Quality not as described",
  item_missing:             "Item was missing",
  changed_mind:             "Changed my mind",
  other:                    "Other",
};

const ReturnRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state ?? {};
  const {
    farmerId       = "",
    orderId        = "",
    farmerName     = "Farmer",
    items          = [],
    orderDisplayId = "",
  } = state;

  const [reason,       setReason]       = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [photo,        setPhoto]        = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState({});

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "", onConfirm: null,
  });

  const showAlert = (title, message, type = "error", onConfirm = null) => {
    setAlertModal({ isOpen: true, title, message, type, onConfirm });
  };
  const closeAlert = () => {
    const cb = alertModal.onConfirm;
    setAlertModal((p) => ({ ...p, isOpen: false, onConfirm: null }));
    if (cb) cb();
  };

  // Guard inline — no useEffect, no redirect race.
  // If state is missing (direct URL visit, stale history) show a plain error
  // with a button back to My Orders rather than silently redirecting.
  const isValidId = (id) => /^[a-f\d]{24}$/i.test(String(id));
  if (!isValidId(farmerId) || !isValidId(orderId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full">
          <p className="text-gray-600 mb-4">
            Return details could not be loaded. Please go back and try again.
          </p>
          <button
            onClick={() => navigate("/my-orders", { replace: true })}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
          >
            Back to my orders
          </button>
        </div>
      </div>
    );
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, photo: "Photo must be under 5 MB" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((p) => ({ ...p, photo: "Please upload an image file" }));
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrors((p) => { const e = { ...p }; delete e.photo; return e; });
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!reason) { setErrors({ reason: "Please select a reason" }); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("orderId",      orderId);
      formData.append("farmerId",     farmerId);
      formData.append("reason",       reason);
      formData.append("reasonDetail", reasonDetail);
      if (photo) formData.append("evidencePhoto", photo);

      await api.post("/api/returns", formData);

      showAlert(
        "Return submitted",
        "Your request has been sent to the farmer. You'll be notified once they review it.",
        "success",
        () => navigate("/my-orders", { replace: true })
      );
    } catch (err) {
      showAlert(
        "Submission failed",
        err.response?.data?.message || "Failed to submit return. Please try again.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
      />

      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/my-orders")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to my orders
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-b px-6 py-5">
            <h1 className="text-2xl font-bold text-gray-900">Request a return</h1>
            <p className="text-sm text-gray-500 mt-1">
              Order #{orderDisplayId || orderId.slice(-6)} · {farmerName}
            </p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Items summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Items in this shipment
              </p>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400">No items found.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-800 font-medium">
                        {item.name}
                        <span className="text-gray-400 font-normal ml-1">×{item.quantity}</span>
                      </span>
                      <span className="text-gray-700">Rs. {((item.price ?? 0) * (item.quantity ?? 0)).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between text-sm font-semibold text-gray-800">
                <span>Shipment total</span>
                <span>Rs. {totalAmount.toFixed(0)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Reason picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for return <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(REASON_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setReason(value);
                        setErrors((p) => { const e = { ...p }; delete e.reason; return e; });
                      }}
                      className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition ${
                        reason === value
                          ? "border-orange-500 bg-orange-50 text-orange-800 font-medium"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors.reason && (
                  <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
                )}
              </div>

              {/* Detail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional details{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue in more detail..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              {/* Evidence photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence photo{" "}
                  <span className="text-gray-400 font-normal">(strongly recommended)</span>
                </label>
                {photoPreview ? (
                  <div className="space-y-2">
                    <img
                      src={photoPreview}
                      alt="Evidence"
                      className="w-full max-w-sm rounded-xl border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-400 transition">
                    <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-400">Click to upload photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                )}
                {errors.photo && (
                  <p className="text-red-500 text-xs mt-1">{errors.photo}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">What happens next</p>
                <ul className="space-y-0.5 list-disc list-inside text-blue-700">
                  <li>Your request is sent to the farmer for review</li>
                  <li>The farmer has up to 2 days to approve or reject</li>
                  <li>You'll receive a notification with their decision</li>
                  <li>If approved, stock is restored on their end</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/my-orders")}
                  disabled={submitting}
                  className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit return request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnRequest;