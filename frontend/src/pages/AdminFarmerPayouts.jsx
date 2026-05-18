/* src/pages/AdminFarmerPayouts.jsx
   Per-farmer accumulated payout management.

   - Shows each farmer with their total pending balance
   - Displays their saved payment details (eSewa ID / Bank QR / Bank Transfer)
   - Single "Pay Now" button opens a confirm modal where admin picks method + enters reference
   - History tab shows already-paid farmers
*/

import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal   from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

/* ── Payment method badge colours ── */
const METHOD_META = {
  esewa:        { label: "eSewa",         color: "bg-green-100 text-green-800"   },
  bank_qr:      { label: "Bank QR",       color: "bg-purple-100 text-purple-800" },
  bank_transfer:{ label: "Bank Transfer", color: "bg-blue-100 text-blue-800"     },
  cash:         { label: "Cash",          color: "bg-gray-100 text-gray-700"     },
  cash_on_delivery: { label: "COD",       color: "bg-yellow-100 text-yellow-800" },
};

const Badge = ({ method }) => {
  const m = METHOD_META[method] || { label: method, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>
      {m.label}
    </span>
  );
};

/* ── QR image helper ── */
const QRImage = ({ src }) => {
  if (!src) return null;
  const full = src.startsWith("http") ? src : `${APIBASEURL}${src}`;
  return (
    <img
      src={full}
      alt="QR code"
      className="w-28 h-28 object-contain rounded-xl border border-gray-200 bg-white p-1"
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
};

/* ── Payment details card ── */
const PaymentDetails = ({ details }) => {
  if (!details) return <p className="text-xs text-gray-400">No payment methods set</p>;

  const { preferred, esewa, bankQr, bankTransfer } = details;
  const hasAny = esewa || bankQr || bankTransfer;

  if (!hasAny) return <p className="text-xs text-gray-400">No payment methods configured</p>;

  return (
    <div className="space-y-3">
      {/* eSewa */}
      {esewa && (
        <div className={`rounded-xl p-3 border ${preferred === "esewa" ? "border-green-300 bg-green-50" : "border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">eSewa</span>
            {preferred === "esewa" && (
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Preferred</span>
            )}
          </div>
          <p className="text-sm font-mono font-bold text-gray-900">{esewa.esewaId}</p>
          <p className="text-xs text-gray-500 mt-0.5">Send to this eSewa ID</p>
        </div>
      )}

      {/* Bank QR */}
      {bankQr && (
        <div className={`rounded-xl p-3 border ${preferred === "bank_qr" ? "border-purple-300 bg-purple-50" : "border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Bank QR</span>
            {preferred === "bank_qr" && (
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Preferred</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-2">{bankQr.bankName}</p>
          <QRImage src={bankQr.qrCodeImage} />
          <p className="text-xs text-gray-500 mt-1.5">Scan QR to transfer</p>
        </div>
      )}

      {/* Bank Transfer */}
      {bankTransfer && (
        <div className={`rounded-xl p-3 border ${preferred === "bank_transfer" ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Bank Transfer</span>
            {preferred === "bank_transfer" && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Preferred</span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Bank</span>
              <span className="font-semibold text-gray-900">{bankTransfer.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Account no.</span>
              <span className="font-mono font-bold text-gray-900">{bankTransfer.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-semibold text-gray-900">{bankTransfer.accountName}</span>
            </div>
            {bankTransfer.bankBranch && (
              <div className="flex justify-between">
                <span className="text-gray-500">Branch</span>
                <span className="text-gray-700">{bankTransfer.bankBranch}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PAY MODAL — choose method + enter reference
═══════════════════════════════════════════════════════════ */
const PayModal = ({ farmer, onClose, onPaid }) => {
  const { paymentDetails } = farmer;

  /* Build available methods from what farmer has configured */
  const availableMethods = [];
  if (paymentDetails?.esewa)        availableMethods.push({ value: "esewa",         label: "eSewa",          detail: paymentDetails.esewa.esewaId });
  if (paymentDetails?.bankQr)       availableMethods.push({ value: "bank_qr",       label: "Bank QR",        detail: paymentDetails.bankQr.bankName });
  if (paymentDetails?.bankTransfer) availableMethods.push({ value: "bank_transfer", label: "Bank Transfer",  detail: `${paymentDetails.bankTransfer.bankName} · ${paymentDetails.bankTransfer.accountNumber}` });
  availableMethods.push({ value: "cash", label: "Cash", detail: "Hand-delivered" });

  const preferred = paymentDetails?.preferred;
  const defaultMethod = availableMethods.find((m) => m.value === preferred)?.value
    || availableMethods[0]?.value
    || "cash";

  const [method,    setMethod]    = useState(defaultMethod);
  const [reference, setReference] = useState("");
  const [paying,    setPaying]    = useState(false);
  const [error,     setError]     = useState("");

  const handlePay = async () => {
    setError("");
    setPaying(true);
    try {
      await api.put(`/api/farmer-payouts/${farmer.farmerId}/pay`, { method, reference });
      onPaid();
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const selectedMethodMeta = availableMethods.find((m) => m.value === method);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 text-white">
          <h2 className="text-xl font-bold">Pay {farmer.farmerName}</h2>
          <p className="text-green-100 text-sm mt-0.5">
            Total: <span className="text-white font-bold text-lg">Rs. {farmer.pendingAmount.toLocaleString()}</span>
            {" "}across {farmer.pendingOrderCount} order{farmer.pendingOrderCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="p-6 space-y-5">

          {/* Method selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Payment method</label>
            <div className="space-y-2">
              {availableMethods.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition ${
                    method === m.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    value={m.value}
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    method === m.value ? "border-green-500 bg-green-500" : "border-gray-300"
                  }`}>
                    {method === m.value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                    <p className="text-xs text-gray-500 truncate">{m.detail}</p>
                  </div>
                  {preferred === m.value && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                      Preferred
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Payment detail reminder */}
          {method !== "cash" && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">Send to</p>
              {method === "esewa" && paymentDetails?.esewa && (
                <p className="text-sm font-mono font-bold text-gray-900">{paymentDetails.esewa.esewaId}</p>
              )}
              {method === "bank_qr" && paymentDetails?.bankQr && (
                <div className="flex items-center gap-3">
                  <QRImage src={paymentDetails.bankQr.qrCodeImage} />
                  <p className="text-sm font-semibold text-gray-900">{paymentDetails.bankQr.bankName}</p>
                </div>
              )}
              {method === "bank_transfer" && paymentDetails?.bankTransfer && (
                <div className="text-sm space-y-0.5">
                  <p><span className="text-gray-500">Bank: </span><span className="font-semibold">{paymentDetails.bankTransfer.bankName}</span></p>
                  <p><span className="text-gray-500">Acc: </span><span className="font-mono font-bold">{paymentDetails.bankTransfer.accountNumber}</span></p>
                  <p><span className="text-gray-500">Name: </span><span className="font-semibold">{paymentDetails.bankTransfer.accountName}</span></p>
                </div>
              )}
            </div>
          )}

          {/* Reference input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Transaction reference
              <span className="text-gray-400 font-normal ml-1">(optional but recommended)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                method === "esewa"         ? "eSewa transaction ID…" :
                method === "bank_qr"       ? "Bank reference number…" :
                method === "bank_transfer" ? "UTR / reference no…" :
                "Note about payment…"
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={paying}
              className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {paying ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
              ) : (
                <>✓ Confirm Payment — Rs. {farmer.pendingAmount.toLocaleString()}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const AdminFarmerPayouts = () => {
  const [tab,          setTab]          = useState("pending");  // "pending" | "history"
  const [farmers,      setFarmers]      = useState([]);
  const [history,      setHistory]      = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState(null);
  const [payingFarmer, setPayingFarmer] = useState(null);  // farmer object to pay

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });

  const showAlert = (title, message, type = "success") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/api/farmer-payouts/stats");
      setStats(res.data);
    } catch { /* non-critical */ }
  }, []);

  const loadFarmers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/farmer-payouts");
      setFarmers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Load Failed", err.response?.data?.message || "Failed to load payouts", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/farmer-payouts/history");
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Load Failed", err.response?.data?.message || "Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    if (tab === "pending") loadFarmers();
    else                   loadHistory();
  }, [tab]);

  const handlePaid = () => {
    setPayingFarmer(null);
    showAlert("Payment recorded", "The farmer has been notified and their balance cleared.", "success");
    loadStats();
    loadFarmers();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-4 md:px-8 py-8">

      <AlertModal
        isOpen={alertModal.isOpen} onClose={closeAlert}
        type={alertModal.type}     title={alertModal.title}
        message={alertModal.message} confirmText="OK"
      />

      {payingFarmer && (
        <PayModal
          farmer={payingFarmer}
          onClose={() => setPayingFarmer(null)}
          onPaid={handlePaid}
        />
      )}

      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Farmer Payouts</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Pay each farmer their accumulated balance in one transfer
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Farmers awaiting payment", value: stats.pendingFarmers,                        color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-l-yellow-400" },
              { label: "Total pending amount",      value: `Rs. ${stats.pendingAmount.toLocaleString()}`, color: "text-orange-600", bg: "bg-orange-50",  border: "border-l-orange-400" },
              { label: "Total paid out",            value: `Rs. ${stats.paidAmount.toLocaleString()}`,   color: "text-green-600",  bg: "bg-green-50",   border: "border-l-green-500"  },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-gray-100 border-l-4 ${s.border} shadow-sm`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-6 flex gap-1 w-fit">
          {[
            { value: "pending", label: "Pending Payouts" },
            { value: "history", label: "Payment History" },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.value ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.label}
              {t.value === "pending" && stats?.pendingFarmers > 0 && (
                <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {stats.pendingFarmers}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── PENDING TAB ── */}
        {tab === "pending" && (
          <>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
              </div>
            ) : farmers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-lg font-semibold text-gray-900 mb-1">All farmers paid</p>
                <p className="text-sm text-gray-400">No pending balances right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {farmers.map((farmer) => {
                  const isExpanded = expanded === farmer.farmerId;

                  return (
                    <div
                      key={farmer.farmerId}
                      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                        isExpanded ? "border-green-400" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {/* Summary row */}
                      <div className="px-6 py-5 flex items-center gap-4 flex-wrap">

                        {/* Avatar + name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {farmer.farmerName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 truncate">{farmer.farmerName}</p>
                            <p className="text-xs text-gray-400 truncate">{farmer.farmerEmail}</p>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className="text-2xl font-black text-green-700">
                            Rs. {farmer.pendingAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {farmer.pendingOrderCount} order{farmer.pendingOrderCount !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* Preferred method badge */}
                        <Badge method={farmer.paymentDetails?.preferred} />

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => setExpanded(isExpanded ? null : farmer.farmerId)}
                            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition"
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </button>
                          <button
                            onClick={() => setPayingFarmer(farmer)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition shadow-sm"
                          >
                            Pay Now
                          </button>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-6 py-5 grid md:grid-cols-2 gap-6">

                          {/* Left: payment details */}
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                              Farmer payment details
                            </p>
                            <PaymentDetails details={farmer.paymentDetails} />
                          </div>

                          {/* Right: pending shipments */}
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                              Pending shipments ({farmer.pendingShipments.length})
                            </p>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {farmer.pendingShipments.map((s, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-xl px-4 py-3">
                                  <div className="flex justify-between items-start mb-1">
                                    <div>
                                      <span className="text-xs font-bold text-gray-700">
                                        Order #{s.orderDisplayId}
                                      </span>
                                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                        s.orderType === "bulk"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-gray-100 text-gray-600"
                                      }`}>
                                        {s.orderType}
                                      </span>
                                    </div>
                                    <span className="text-sm font-bold text-green-700">
                                      Rs. {s.shipmentSubtotal.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400">
                                    {s.consumerName} · {new Date(s.createdAt).toLocaleDateString()}
                                  </p>
                                  <div className="mt-1.5 space-y-0.5">
                                    {s.items.map((item, i) => (
                                      <p key={i} className="text-xs text-gray-600">
                                        {item.name} × {item.quantity} — Rs. {(item.price * item.quantity).toFixed(0)}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Sub-total */}
                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold text-gray-900">
                              <span>Total to pay</span>
                              <span className="text-green-700">Rs. {farmer.pendingAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <>
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <p className="text-gray-400 text-sm">No payment history yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((farmer) => {
                  const isExpanded = expanded === farmer.farmerId + "-h";
                  return (
                    <div
                      key={farmer.farmerId}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => setExpanded(isExpanded ? null : farmer.farmerId + "-h")}
                        className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {farmer.farmerName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900">{farmer.farmerName}</p>
                          <p className="text-xs text-gray-400">{farmer.farmerEmail}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-green-700">
                            Rs. {farmer.totalPaid.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">total paid</p>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && farmer.payments.length > 0 && (
                        <div className="border-t border-gray-100 px-6 py-4 space-y-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                            Payment history
                          </p>
                          {farmer.payments.map((p, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
                              <div className="flex items-center gap-3">
                                <Badge method={p.method} />
                                <div>
                                  {p.reference && (
                                    <p className="text-xs font-mono text-gray-600">Ref: {p.reference}</p>
                                  )}
                                  <p className="text-xs text-gray-400">
                                    {p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}
                                  </p>
                                </div>
                              </div>
                              <span className="font-bold text-green-700">
                                Rs. {Math.round(p.amount).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminFarmerPayouts;