import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";

const METHOD_META = {
  esewa:            { label: "eSewa",         color: "bg-green-100 text-green-800"   },
  bank_qr:          { label: "Bank QR",       color: "bg-purple-100 text-purple-800" },
  bank_transfer:    { label: "Bank Transfer", color: "bg-blue-100 text-blue-800"     },
  cash:             { label: "Cash",          color: "bg-gray-100 text-gray-700"     },
  cash_on_delivery: { label: "COD",           color: "bg-yellow-100 text-yellow-800" },
};

const Badge = ({ method }) => {
  const m = METHOD_META[method] || { label: method, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>
      {m.label}
    </span>
  );
};

const QRImage = ({ src }) => {
  if (!src) return null;
  const full = src.startsWith("http") ? src : `${APIBASEURL}${src}`;
  return (
    <img
      src={full}
      alt="QR code"
      className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-xl border border-gray-200 bg-white p-1"
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  );
};

const PaymentDetails = ({ details }) => {
  if (!details) return <p className="text-xs text-gray-400">No payment methods set</p>;
  const { preferred, esewa, bankQr, bankTransfer } = details;
  const hasAny = esewa || bankQr || bankTransfer;
  if (!hasAny) return <p className="text-xs text-gray-400">No payment methods configured</p>;

  return (
    <div className="space-y-3">
      {esewa && (
        <div className={`rounded-xl p-3 border ${preferred === "esewa" ? "border-green-300 bg-green-50" : "border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">eSewa</span>
            {preferred === "esewa" && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Preferred</span>}
          </div>
          <p className="text-sm font-mono font-bold text-gray-900 break-all">{esewa.esewaId}</p>
        </div>
      )}
      {bankQr && (
        <div className={`rounded-xl p-3 border ${preferred === "bank_qr" ? "border-purple-300 bg-purple-50" : "border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Bank QR</span>
            {preferred === "bank_qr" && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Preferred</span>}
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-2">{bankQr.bankName}</p>
          <QRImage src={bankQr.qrCodeImage} />
        </div>
      )}
      {bankTransfer && (
        <div className={`rounded-xl p-3 border ${preferred === "bank_transfer" ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Bank Transfer</span>
            {preferred === "bank_transfer" && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Preferred</span>}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-2"><span className="text-gray-500 flex-shrink-0">Bank</span><span className="font-semibold text-right">{bankTransfer.bankName}</span></div>
            <div className="flex justify-between gap-2"><span className="text-gray-500 flex-shrink-0">Account no.</span><span className="font-mono font-bold text-right break-all">{bankTransfer.accountNumber}</span></div>
            <div className="flex justify-between gap-2"><span className="text-gray-500 flex-shrink-0">Name</span><span className="font-semibold text-right">{bankTransfer.accountName}</span></div>
            {bankTransfer.bankBranch && <div className="flex justify-between gap-2"><span className="text-gray-500 flex-shrink-0">Branch</span><span className="text-gray-700 text-right">{bankTransfer.bankBranch}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Cooldown Badge ── */
const CooldownBadge = ({ cooldown }) => {
  if (!cooldown) return null;
  if (cooldown.allowed) return null;
  return (
    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
      <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-xs font-semibold text-orange-700">
        {cooldown.daysLeft}d cooldown
      </span>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   PAY MODAL
══════════════════════════════════════════════════════════════ */
const PayModal = ({ farmer, onClose, onPaid }) => {
  const { paymentDetails, cooldown } = farmer;

  const availableMethods = [];
  if (paymentDetails?.esewa)        availableMethods.push({ value: "esewa",         label: "eSewa",         detail: paymentDetails.esewa.esewaId });
  if (paymentDetails?.bankQr)       availableMethods.push({ value: "bank_qr",       label: "Bank QR",       detail: paymentDetails.bankQr.bankName });
  if (paymentDetails?.bankTransfer) availableMethods.push({ value: "bank_transfer", label: "Bank Transfer", detail: `${paymentDetails.bankTransfer.bankName} · ${paymentDetails.bankTransfer.accountNumber}` });
  availableMethods.push({ value: "cash", label: "Cash", detail: "Hand-delivered" });

  const preferred     = paymentDetails?.preferred;
  const defaultMethod = availableMethods.find((m) => m.value === preferred)?.value || availableMethods[0]?.value || "cash";

  const [method,    setMethod]    = useState(defaultMethod);
  const [reference, setReference] = useState("");
  const [paying,    setPaying]    = useState(false);
  const [error,     setError]     = useState("");

  const blocked = cooldown && !cooldown.allowed;

  const handlePay = async () => {
    if (blocked) return;
    setError("");
    setPaying(true);
    try {
      await api.put(`/api/farmer-payouts/${farmer.farmerId}/pay`, { method, reference });
      onPaid();
    } catch (err) {
      const msg = err.response?.data?.message || "Payment failed. Please try again.";
      if (err.response?.status === 429) {
        setError(`⏳ ${msg}`);
      } else {
        setError(msg);
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 py-4 text-white flex-shrink-0">
          <h2 className="text-lg font-bold truncate">Pay {farmer.farmerName}</h2>
          <p className="text-green-100 text-sm mt-0.5">
            Total: <span className="text-white font-bold text-base">Rs. {farmer.pendingAmount.toLocaleString()}</span>
            {" "}· {farmer.pendingOrderCount} order{farmer.pendingOrderCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Cooldown warning */}
          {blocked && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-bold text-orange-800 text-sm">3-Day Cooldown Active</p>
              </div>
              <p className="text-sm text-orange-700">
                Last paid on {new Date(cooldown.lastPaidAt).toLocaleDateString()}.
                Next payout in <strong>{cooldown.daysLeft} day{cooldown.daysLeft !== 1 ? "s" : ""}</strong>
                {cooldown.nextPayoutAt && ` (${new Date(cooldown.nextPayoutAt).toLocaleDateString()})`}.
              </p>
              <p className="text-xs text-orange-600 mt-2">
                Prevents duplicate payments. One consolidated payout per 3-day cycle.
              </p>
            </div>
          )}

          {/* Return deductions info */}
          {farmer.pendingShipments?.some((s) => s.returnDeduction > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">⚠ Return deductions applied</p>
              {farmer.pendingShipments.filter((s) => s.returnDeduction > 0).map((s, i) => (
                <p key={i} className="text-xs text-red-600 break-words">
                  Order #{s.orderDisplayId}: Rs.{s.originalSubtotal} − Rs.{s.returnDeduction} = Rs.{s.shipmentSubtotal}
                </p>
              ))}
            </div>
          )}

          {/* Method selector */}
          <div className={blocked ? "opacity-50 pointer-events-none" : ""}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Payment method</label>
            <div className="space-y-2">
              {availableMethods.map((m) => (
                <label key={m.value}
                  className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition ${
                    method === m.value ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input type="radio" name="payMethod" value={m.value}
                    checked={method === m.value} onChange={() => setMethod(m.value)} className="sr-only" />
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
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Preferred</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className={blocked ? "opacity-50 pointer-events-none" : ""}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Transaction reference <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder={method === "esewa" ? "eSewa transaction ID…" : method === "bank_transfer" ? "UTR / reference no…" : "Note…"}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Fixed footer buttons */}
        <div className="flex gap-3 p-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={paying}
            className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
            Cancel
          </button>
          <button type="button" onClick={handlePay}
            disabled={paying || blocked}
            className={`flex-1 font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 ${
              blocked
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white"
            }`}
          >
            {paying ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
            ) : blocked ? (
              `Cooldown: ${cooldown.daysLeft}d left`
            ) : (
              <>✓ Pay Rs. {farmer.pendingAmount.toLocaleString()}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const AdminFarmerPayouts = () => {
  const navigate = useNavigate();
  const [tab,          setTab]          = useState("pending");
  const [farmers,      setFarmers]      = useState([]);
  const [history,      setHistory]      = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState(null);
  const [payingFarmer, setPayingFarmer] = useState(null);

  const [alertModal, setAlertModal] = useState({ isOpen: false, type: "", title: "", message: "" });
  const showAlert  = (title, message, type = "success") => setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () => setAlertModal((p) => ({ ...p, isOpen: false }));

  const loadStats = useCallback(async () => {
    try { const res = await api.get("/api/farmer-payouts/stats"); setStats(res.data); } catch {}
  }, []);

  const loadFarmers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/farmer-payouts");
      setFarmers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Load Failed", err.response?.data?.message || "Failed to load payouts", "error");
    } finally { setLoading(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/farmer-payouts/history");
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Load Failed", err.response?.data?.message || "Failed to load history", "error");
    } finally { setLoading(false); }
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

  const blockedCount = farmers.filter((f) => f.cooldown && !f.cooldown.allowed).length;
  const readyCount   = farmers.filter((f) => !f.cooldown || f.cooldown.allowed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-3 sm:px-6 md:px-8 py-5 sm:py-8">
      <AlertModal isOpen={alertModal.isOpen} onClose={closeAlert}
        type={alertModal.type} title={alertModal.title} message={alertModal.message} confirmText="OK" />

      {payingFarmer && (
        <PayModal farmer={payingFarmer} onClose={() => setPayingFarmer(null)} onPaid={handlePaid} />
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Farmer Payouts</h1>
            <p className="text-gray-500 mt-1 text-xs sm:text-sm">Pay each farmer their accumulated balance · 3-day cooldown enforced</p>
          </div>
          <button onClick={() => navigate("/admin")}
            className="text-xs sm:text-sm border border-gray-200 px-3 sm:px-4 py-2 rounded-xl hover:bg-gray-50 transition text-gray-600 flex-shrink-0">
            ← Dashboard
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              { label: "Farmers awaiting",  value: stats.pendingFarmers,                           color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-l-yellow-400" },
              { label: "Ready to pay",       value: readyCount,                                     color: "text-green-600",  bg: "bg-green-50",   border: "border-l-green-500"  },
              { label: "On cooldown",        value: blockedCount,                                   color: "text-orange-600", bg: "bg-orange-50",  border: "border-l-orange-400" },
              { label: "Total pending",      value: `Rs. ${stats.pendingAmount.toLocaleString()}`,  color: "text-blue-600",   bg: "bg-blue-50",    border: "border-l-blue-500"   },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-3 sm:p-5 border border-gray-100 border-l-4 ${s.border} shadow-sm`}>
                <p className={`text-xl sm:text-2xl font-bold ${s.color} leading-tight`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cooldown info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-5 sm:mb-6 flex items-start gap-2.5">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs sm:text-sm text-blue-800">
            <p className="font-semibold">3-Day Payout Cooldown Policy</p>
            <p className="text-blue-700 mt-0.5">Each farmer can only receive a payout once every 3 days to prevent duplicate payments and ensure balances are settled in one transfer.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-5 sm:mb-6 flex gap-1 w-full sm:w-fit overflow-x-auto">
          {[
            { value: "pending", label: "Pending Payouts" },
            { value: "history", label: "Payment History" },
          ].map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                tab === t.value ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.label}
              {t.value === "pending" && stats?.pendingFarmers > 0 && (
                <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{stats.pendingFarmers}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── PENDING TAB ── */}
        {tab === "pending" && (
          <>
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" /></div>
            ) : farmers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 sm:p-12 text-center shadow-sm">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-lg font-semibold text-gray-900 mb-1">All farmers paid</p>
                <p className="text-sm text-gray-400">No pending balances right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {farmers.map((farmer) => {
                  const isExpanded   = expanded === farmer.farmerId;
                  const blocked      = farmer.cooldown && !farmer.cooldown.allowed;
                  const hasDeductions = farmer.pendingShipments?.some((s) => s.returnDeduction > 0);

                  return (
                    <div key={farmer.farmerId}
                      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                        isExpanded ? "border-green-400" : blocked ? "border-orange-200" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {/* Summary row */}
                      <div className="px-4 sm:px-6 py-4 sm:py-5">
                        {/* Top row: avatar + name + amount */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                            blocked ? "bg-orange-400" : "bg-gradient-to-br from-green-400 to-emerald-500"
                          }`}>
                            {farmer.farmerName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate text-sm sm:text-base">{farmer.farmerName}</p>
                            <p className="text-xs text-gray-400 truncate">{farmer.farmerEmail}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xl sm:text-2xl font-black ${blocked ? "text-gray-400" : "text-green-700"}`}>
                              Rs. {farmer.pendingAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">
                              {farmer.pendingOrderCount} order{farmer.pendingOrderCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        {/* Bottom row: badges + actions */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge method={farmer.paymentDetails?.preferred} />
                            {hasDeductions && (
                              <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">
                                Deductions
                              </span>
                            )}
                            <CooldownBadge cooldown={farmer.cooldown} />
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setExpanded(isExpanded ? null : farmer.farmerId)}
                              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                              {isExpanded ? "Hide" : "Details"}
                            </button>
                            <button
                              onClick={() => setPayingFarmer(farmer)}
                              disabled={blocked}
                              title={blocked ? `Cooldown: ${farmer.cooldown?.daysLeft} days remaining` : "Pay farmer"}
                              className={`font-bold px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm transition shadow-sm ${
                                blocked
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }`}
                            >
                              {blocked ? `${farmer.cooldown?.daysLeft}d` : "Pay Now"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Farmer payment details</p>
                            <PaymentDetails details={farmer.paymentDetails} />
                            {farmer.cooldown && !farmer.cooldown.allowed && (
                              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                                <p className="text-xs font-bold text-orange-700 mb-1">⏳ Cooldown Active</p>
                                <p className="text-sm text-orange-800">
                                  Last paid: {new Date(farmer.cooldown.lastPaidAt).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-orange-800">
                                  Next payout: {farmer.cooldown.nextPayoutAt ? new Date(farmer.cooldown.nextPayoutAt).toLocaleDateString() : "—"}
                                </p>
                                <p className="text-sm font-bold text-orange-900 mt-1">
                                  {farmer.cooldown.daysLeft} day{farmer.cooldown.daysLeft !== 1 ? "s" : ""} remaining
                                </p>
                              </div>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                              Pending shipments ({farmer.pendingShipments.length})
                            </p>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {farmer.pendingShipments.map((s, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-xl px-3 sm:px-4 py-3">
                                  <div className="flex justify-between items-start mb-1 gap-2">
                                    <div className="min-w-0">
                                      <span className="text-xs font-bold text-gray-700">Order #{s.orderDisplayId}</span>
                                      <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                        s.orderType === "bulk" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                                      }`}>{s.orderType}</span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      {s.returnDeduction > 0 ? (
                                        <div>
                                          <span className="text-xs line-through text-gray-400">Rs. {s.originalSubtotal}</span>
                                          <span className="text-sm font-bold text-green-700 ml-1">Rs. {s.shipmentSubtotal}</span>
                                          <p className="text-xs text-red-500">-Rs.{s.returnDeduction} deducted</p>
                                        </div>
                                      ) : (
                                        <span className="text-sm font-bold text-green-700">Rs. {s.shipmentSubtotal.toLocaleString()}</span>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">
                                    {s.consumerName} · {new Date(s.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              ))}
                            </div>
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
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" /></div>
            ) : history.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <p className="text-gray-400 text-sm">No payment history yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((farmer) => {
                  const isExpanded = expanded === farmer.farmerId + "-h";
                  return (
                    <div key={farmer.farmerId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <button onClick={() => setExpanded(isExpanded ? null : farmer.farmerId + "-h")}
                        className="w-full text-left px-4 sm:px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {farmer.farmerName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{farmer.farmerName}</p>
                          <p className="text-xs text-gray-400 truncate">{farmer.farmerEmail}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base sm:text-lg font-black text-green-700">Rs. {farmer.totalPaid.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">total paid</p>
                        </div>
                        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && farmer.payments.length > 0 && (
                        <div className="border-t border-gray-100 px-4 sm:px-6 py-4 space-y-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment history</p>
                          {farmer.payments.map((p, i) => (
                            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 sm:px-4 py-3 text-sm gap-3">
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <Badge method={p.method} />
                                <div className="min-w-0">
                                  {p.reference && <p className="text-xs font-mono text-gray-600 truncate">Ref: {p.reference}</p>}
                                  <p className="text-xs text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}</p>
                                </div>
                              </div>
                              <span className="font-bold text-green-700 flex-shrink-0">Rs. {Math.round(p.amount).toLocaleString()}</span>
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