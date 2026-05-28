
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";

const FarmerPaymentSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const [alertModal, setAlertModal] = useState({ isOpen: false, type: "", title: "", message: "" });

  const [paymentMethods, setPaymentMethods] = useState([
    { type: "esewa",         enabled: false, esewaId: "" },
    { type: "bank_qr",       enabled: false, bankName: "", qrCodeImage: "" },
    { type: "bank_transfer", enabled: false, bankName: "", accountNumber: "", accountName: "", bankBranch: "" },
  ]);

  const [preferredMethod, setPreferredMethod] = useState("esewa");

  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () => setAlertModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => { loadPaymentMethods(); }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/auth/me");
      const user = res.data.user;

      if (user.paymentMethods && user.paymentMethods.length > 0) {
        const receivable = user.paymentMethods.filter(
          (m) => ["esewa", "bank_qr", "bank_transfer"].includes(m.type)
        );
        if (receivable.length > 0) {
          setPaymentMethods((prev) =>
            prev.map((p) => {
              const saved = receivable.find((m) => m.type === p.type);
              return saved ? { ...p, ...saved } : p;
            })
          );
          const bankQR = receivable.find((m) => m.type === "bank_qr");
          if (bankQR?.qrCodeImage) setQrPreview(`${APIBASEURL}${bankQR.qrCodeImage}`);
        }
      }

      if (
        user.preferredPaymentMethod &&
        ["esewa", "bank_qr", "bank_transfer"].includes(user.preferredPaymentMethod)
      ) {
        setPreferredMethod(user.preferredPaymentMethod);
      }
    } catch (err) {
      showAlert("Load Failed", "Failed to load payment settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleMethod = (type) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.type === type ? { ...m, enabled: !m.enabled } : m))
    );
    setErrors((prev) => {
      const e = { ...prev };
      delete e[type];
      return e;
    });
  };

  const updateMethodField = (type, field, value) => {
    setPaymentMethods((prev) =>
      prev.map((m) => (m.type === type ? { ...m, [field]: value } : m))
    );
    setErrors((prev) => {
      const e = { ...prev };
      delete e[`${type}_${field}`];
      return e;
    });
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, qr: "File size must be less than 5MB" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, qr: "Please upload an image file" }));
      return;
    }
    setQrPreview(URL.createObjectURL(file));
    setErrors((prev) => { const e = { ...prev }; delete e.qr; return e; });
    try {
      const formData = new FormData();
      formData.append("qrCode", file);
      const res = await api.post("/api/payments/upload-qr", formData);
      updateMethodField("bank_qr", "qrCodeImage", res.data.qrCodeImage);
      showAlert("Uploaded", "QR code uploaded successfully.", "success");
    } catch (err) {
      setErrors((prev) => ({ ...prev, qr: "Failed to upload QR code" }));
      showAlert("Upload Failed", "Failed to upload QR code.", "error");
    }
  };

  const validate = () => {
    const newErrors = {};
    paymentMethods.forEach((method) => {
      if (!method.enabled) return;
      switch (method.type) {
        case "esewa":
          if (!method.esewaId?.trim()) {
            newErrors[`${method.type}_esewaId`] = "eSewa ID is required";
          } else if (!/^[0-9]{10}$/.test(method.esewaId.trim())) {
            newErrors[`${method.type}_esewaId`] = "eSewa ID must be 10 digits";
          }
          break;
        case "bank_qr":
          if (!method.bankName?.trim())  newErrors[`${method.type}_bankName`]    = "Bank name is required";
          if (!method.qrCodeImage)       newErrors[`${method.type}_qrCodeImage`] = "QR code image is required";
          break;
        case "bank_transfer":
          if (!method.bankName?.trim())      newErrors[`${method.type}_bankName`]      = "Bank name is required";
          if (!method.accountNumber?.trim()) newErrors[`${method.type}_accountNumber`] = "Account number is required";
          if (!method.accountName?.trim())   newErrors[`${method.type}_accountName`]   = "Account name is required";
          break;
      }
    });
    if (!paymentMethods.some((m) => m.enabled))
      newErrors.general = "Enable at least one payment method";
    if (!paymentMethods.find((m) => m.type === preferredMethod)?.enabled)
      newErrors.preferred = "Preferred method must be enabled";
    return newErrors;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showAlert("Validation Error", "Please fix the errors before saving.", "warning");
      return;
    }
    setSaving(true);
    try {
      const withCod = [
        { type: "cash_on_delivery", enabled: true },
        ...paymentMethods,
      ];
      await api.put("/api/payments/my-methods", {
        paymentMethods: withCod,
        preferredPaymentMethod: preferredMethod,
      });
      showAlert("Saved", "Payment methods updated successfully.", "success");
      navigate("/farmer");
    } catch (err) {
      showAlert("Save Failed", err.response?.data?.message || "Failed to update payment methods.", "error");
    } finally {
      setSaving(false);
    }
  };

  const esewaMethod        = paymentMethods.find((m) => m.type === "esewa");
  const bankQRMethod       = paymentMethods.find((m) => m.type === "bank_qr");
  const bankTransferMethod = paymentMethods.find((m) => m.type === "bank_transfer");

  const BANKS = [
    "Nabil Bank", "NIC Asia Bank", "Global IME Bank", "Himalayan Bank",
    "Nepal Investment Bank", "Standard Chartered Bank", "Sanima Bank",
    "Prabhu Bank", "Other",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12 px-3 sm:px-4">
      <AlertModal
        isOpen={alertModal.isOpen} onClose={closeAlert}
        type={alertModal.type}    title={alertModal.title}
        message={alertModal.message} confirmText="OK"
      />

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-8">

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Payment Settings
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Configure how you receive payouts from MeroBari admin.
            </p>
          </div>

          {/* Info banner */}
          <div className="mb-6 sm:mb-8 bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-3">
            <p className="text-sm font-semibold text-blue-900">How admin payouts work</p>
            <p className="text-sm text-blue-800">
              Once an order is delivered and verified, admin will release your earnings and send them to you
              using the payment method you configure below. Make sure at least one method is set up and
              your preferred method is selected.
            </p>
            <div className="flex items-start gap-2 text-sm text-blue-800">
              <span className="text-base mt-0.5 flex-shrink-0">💵</span>
              <div>
                <p className="font-semibold">Cash on Delivery</p>
                <p className="text-blue-700 text-xs mt-0.5">
                  Buyers can always pay cash — no setup needed from you. You collect it on delivery.
                  This does not affect how admin pays your earnings.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">

            {/* ── eSewa ── */}
            <div className={`border rounded-xl p-4 sm:p-6 transition ${esewaMethod?.enabled ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}>
              <div className="flex items-start gap-3 mb-3 sm:mb-4">
                <input
                  type="checkbox"
                  checked={esewaMethod?.enabled || false}
                  onChange={() => toggleMethod("esewa")}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-base sm:text-lg">eSewa</h3>
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Receive payments directly to your eSewa wallet
                  </p>
                </div>
              </div>

              {esewaMethod?.enabled && (
                <div className="ml-8 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      eSewa ID / Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={esewaMethod.esewaId || ""}
                      onChange={(e) => updateMethodField("esewa", "esewaId", e.target.value)}
                      placeholder="98XXXXXXXX (10 digits)"
                      maxLength={10}
                      className={`w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm ${
                        errors.esewa_esewaId ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.esewa_esewaId && (
                      <p className="text-red-500 text-xs mt-1">{errors.esewa_esewaId}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your eSewa registered mobile number. Admin will send your earnings to this ID.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bank QR ── */}
            <div className={`border rounded-xl p-4 sm:p-6 transition ${bankQRMethod?.enabled ? "bg-purple-50 border-purple-300" : "bg-white border-gray-200"}`}>
              <div className="flex items-start gap-3 mb-3 sm:mb-4">
                <input
                  type="checkbox"
                  checked={bankQRMethod?.enabled || false}
                  onChange={() => toggleMethod("bank_qr")}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg">Bank QR Code</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Admin scans your QR code to send your earnings via mobile banking.
                  </p>
                </div>
              </div>

              {bankQRMethod?.enabled && (
                <div className="ml-8 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bankQRMethod.bankName || ""}
                      onChange={(e) => updateMethodField("bank_qr", "bankName", e.target.value)}
                      className={`w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm ${
                        errors.bank_qr_bankName ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Bank</option>
                      {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    {errors.bank_qr_bankName && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_qr_bankName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Upload QR Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQRUpload}
                      className="w-full border rounded-lg px-3 sm:px-4 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-sm hover:file:bg-green-100"
                    />
                    {errors.qr && <p className="text-red-500 text-xs mt-1">{errors.qr}</p>}
                    {errors.bank_qr_qrCodeImage && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_qr_qrCodeImage}</p>
                    )}
                    {(qrPreview || bankQRMethod.qrCodeImage) && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">QR Preview:</p>
                        <img
                          src={qrPreview || `${APIBASEURL}${bankQRMethod.qrCodeImage}`}
                          alt="QR Code"
                          className="w-36 h-36 sm:w-40 sm:h-40 object-contain border rounded-lg bg-white p-2"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium mb-1">How to get your QR code:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
                      <li>Open your mobile banking app</li>
                      <li>Find "Receive Money" or "QR Code"</li>
                      <li>Screenshot your QR code and upload it here</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* ── Bank Transfer ── */}
            <div className={`border rounded-xl p-4 sm:p-6 transition ${bankTransferMethod?.enabled ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"}`}>
              <div className="flex items-start gap-3 mb-3 sm:mb-4">
                <input
                  type="checkbox"
                  checked={bankTransferMethod?.enabled || false}
                  onChange={() => toggleMethod("bank_transfer")}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg">Bank Transfer</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Receive via direct bank account transfer (UTR/NEFT)
                  </p>
                </div>
              </div>

              {bankTransferMethod?.enabled && (
                <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bankTransferMethod.bankName || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "bankName", e.target.value)}
                      className={`w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm ${
                        errors.bank_transfer_bankName ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Bank</option>
                      {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    {errors.bank_transfer_bankName && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_transfer_bankName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bankTransferMethod.accountNumber || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "accountNumber", e.target.value)}
                      placeholder="XXXXXXXXXXXX"
                      className={`w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm ${
                        errors.bank_transfer_accountNumber ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.bank_transfer_accountNumber && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_transfer_accountNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankTransferMethod.accountName || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "accountName", e.target.value)}
                      placeholder="Your full name"
                      className={`w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm ${
                        errors.bank_transfer_accountName ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.bank_transfer_accountName && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_transfer_accountName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Branch (Optional)</label>
                    <input
                      type="text"
                      value={bankTransferMethod.bankBranch || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "bankBranch", e.target.value)}
                      placeholder="e.g. Patan Branch"
                      className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Preferred method ── */}
            <div className="border-t pt-5 sm:pt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5">
                <h3 className="font-semibold mb-1">Preferred payout method</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Admin will use this method by default when paying out your earnings.
                  They can still choose any other enabled method.
                </p>
                <select
                  value={preferredMethod}
                  onChange={(e) => setPreferredMethod(e.target.value)}
                  className={`w-full border rounded-lg px-3 sm:px-4 py-2.5 text-sm ${
                    errors.preferred ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="esewa">eSewa</option>
                  <option value="bank_qr">Bank QR</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
                {errors.preferred && (
                  <p className="text-red-500 text-xs mt-1">{errors.preferred}</p>
                )}
              </div>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {errors.general}
              </div>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition text-sm sm:text-base"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Saving...
                </span>
              ) : (
                "Save Payment Settings"
              )}
            </button>
            <button
              onClick={() => navigate("/farmer")}
              disabled={saving}
              className="sm:px-6 py-3 sm:py-0 border border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerPaymentSettings;