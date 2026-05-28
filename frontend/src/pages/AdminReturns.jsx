// src/pages/AdminReturns.jsx

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import AlertModal   from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

const REASON_LABELS = {
  damaged_item:             "Item arrived damaged",
  wrong_item:               "Wrong item received",
  quality_not_as_described: "Quality not as described",
  item_missing:             "Item was missing",
  changed_mind:             "Changed my mind",
  other:                    "Other",
};

const STATUS_STYLES = {
  pending:  { badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-400",  label: "Pending Farmer Review" },
  approved: { badge: "bg-green-100 text-green-800",   dot: "bg-green-500",   label: "Approved by Farmer"   },
  rejected: { badge: "bg-red-100 text-red-800",       dot: "bg-red-400",     label: "Rejected by Farmer"   },
};

const REFUND_STYLES = {
  pending:   { badge: "bg-orange-100 text-orange-800", label: "Refund Pending"   },
  processed: { badge: "bg-green-100 text-green-800",   label: "Refund Processed" },
  skipped:   { badge: "bg-gray-100 text-gray-600",     label: "Refund Skipped"   },
};

const METHOD_LABELS = {
  esewa:         "eSewa",
  bank_transfer: "Bank Transfer",
  cash:          "Cash",
};

/* ── Refund process modal ── */
const RefundModal = ({ returnDoc, onClose, onSuccess }) => {
  const [method,     setMethod]     = useState(returnDoc.refundMethod || "cash");
  const [reference,  setReference]  = useState("");
  const [note,       setNote]       = useState("");
  const [processing, setProcessing] = useState(false);
  const [error,      setError]      = useState("");

  const consumerName = returnDoc.consumer
    ? `${returnDoc.consumer.firstName} ${returnDoc.consumer.lastName}`
    : "Consumer";

  const detail = returnDoc.refundPaymentDetail || {};

  const handleProcess = async () => {
    setError("");
    setProcessing(true);
    try {
      await api.put(`/api/returns/${returnDoc.id || returnDoc._id}/refund`, {
        method,
        reference,
        note,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process refund.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet slides up on mobile, centered modal on sm+ */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">

        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 py-4 text-white flex-shrink-0">
          <h2 className="text-lg font-bold">Process Refund</h2>
          <p className="text-green-100 text-sm mt-0.5">
            {consumerName} · Rs.{" "}
            <span className="font-bold text-white text-base">
              {Math.round(returnDoc.refundAmount).toLocaleString()}
            </span>
          </p>
        </div>

        {/* Scrollable body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Consumer's requested refund details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Consumer's requested refund details
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                returnDoc.refundMethod === "esewa"         ? "bg-green-100 text-green-800" :
                returnDoc.refundMethod === "bank_transfer" ? "bg-blue-100 text-blue-800"   :
                "bg-amber-100 text-amber-800"
              }`}>
                {METHOD_LABELS[returnDoc.refundMethod] || returnDoc.refundMethod}
              </span>
            </div>
            {returnDoc.refundMethod === "esewa" && detail.esewaId && (
              <p className="text-sm font-mono font-bold text-gray-900 break-all">eSewa ID: {detail.esewaId}</p>
            )}
            {returnDoc.refundMethod === "bank_transfer" && (
              <div className="text-sm space-y-0.5">
                <p><span className="text-gray-500">Bank: </span><span className="font-semibold">{detail.bankName}</span></p>
                <p><span className="text-gray-500">Account: </span><span className="font-mono font-bold break-all">{detail.accountNumber}</span></p>
                <p><span className="text-gray-500">Name: </span><span className="font-semibold">{detail.accountName}</span></p>
              </div>
            )}
            {returnDoc.refundMethod === "cash" && (
              <p className="text-sm text-amber-700">Cash handover required</p>
            )}
          </div>

          {/* Farmer deduction note */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
            <p className="font-semibold mb-0.5">⚠ Farmer payout impact</p>
            <p>
              Processing this refund will automatically deduct{" "}
              <strong>Rs. {Math.round(returnDoc.refundAmount).toLocaleString()}</strong>{" "}
              from the farmer's payout for this order. If they've already been paid, the deduction
              will be applied to their next payout cycle.
            </p>
          </div>

          {/* Actual payment method used */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment method used
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["esewa", "bank_transfer", "cash"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-2.5 px-2 rounded-xl border-2 text-xs font-semibold transition text-center ${
                    method === m
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {METHOD_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Transaction reference{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                method === "esewa"         ? "eSewa transaction ID…" :
                method === "bank_transfer" ? "UTR / reference number…" :
                "Cash handover note…"
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Internal note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Any notes for record-keeping…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pb-safe">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProcess}
              disabled={processing}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : (
                `✓ Mark Refunded — Rs. ${Math.round(returnDoc.refundAmount).toLocaleString()}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main page ── */
const AdminReturns = () => {
  const navigate = useNavigate();
  const [returns,      setReturns]      = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("all");
  const [expanded,     setExpanded]     = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });
  const showAlert  = (title, message, type = "success") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [retRes, statsRes] = await Promise.all([
        api.get("/api/returns/admin"),
        api.get("/api/returns/admin/stats"),
      ]);
      setReturns(Array.isArray(retRes.data) ? retRes.data : []);
      setStats(statsRes.data);
    } catch (err) {
      showAlert("Load Failed", err.response?.data?.message || "Failed to load returns", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);

  const handleRefundSuccess = () => {
    setRefundTarget(null);
    showAlert("Refund Processed", "The refund has been recorded and the farmer's payout has been adjusted.", "success");
    loadAll();
  };

  const filtered = returns.filter((r) => {
    if (filter === "all")            return true;
    if (filter === "pending")        return r.status === "pending";
    if (filter === "approved")       return r.status === "approved";
    if (filter === "rejected")       return r.status === "rejected";
    if (filter === "refund_pending") return r.status === "approved" && r.refundStatus === "pending";
    if (filter === "refund_done")    return r.refundStatus === "processed";
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 px-3 sm:px-6 md:px-8 py-5 sm:py-8">

      <AlertModal
        isOpen={alertModal.isOpen}  onClose={closeAlert}
        type={alertModal.type}      title={alertModal.title}
        message={alertModal.message} confirmText="OK"
      />

      {refundTarget && (
        <RefundModal
          returnDoc={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={handleRefundSuccess}
        />
      )}

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Returns & Refunds</h1>
            <p className="text-gray-500 mt-0.5 text-xs sm:text-sm">
              Manage consumer return requests and process refunds
            </p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-2 sm:px-4 rounded-xl whitespace-nowrap flex-shrink-0"
          >
            ← Dashboard
          </button>
        </div>

        {/* Stats — 3 cols on mobile, 6 on lg */}
        {stats && (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
            {[
              { label: "Total",          value: stats.total,           color: "text-gray-900",   bg: "bg-white",       border: "border-gray-200"   },
              { label: "Pending",        value: stats.pendingApproval, color: "text-yellow-700", bg: "bg-yellow-50",   border: "border-yellow-200" },
              { label: "Approved",       value: stats.approved,        color: "text-green-700",  bg: "bg-green-50",    border: "border-green-200"  },
              { label: "Refund Due",     value: stats.refundPending,   color: "text-orange-700", bg: "bg-orange-50",   border: "border-orange-200" },
              { label: "Refunded",       value: stats.refundProcessed, color: "text-blue-700",   bg: "bg-blue-50",     border: "border-blue-200"   },
              { label: "Total Refunded", value: `Rs.${Math.round(stats.totalRefunded).toLocaleString()}`, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border-2 ${s.border} rounded-xl sm:rounded-2xl p-2.5 sm:p-4 text-center shadow-sm`}>
                <p className={`text-lg sm:text-2xl font-bold ${s.color} leading-tight`}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 font-medium leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs — horizontally scrollable */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-5 sm:mb-6 flex gap-1 overflow-x-auto scrollbar-none">
          {[
            { value: "all",            label: "All",             count: returns.length },
            { value: "pending",        label: "Pending",         count: returns.filter(r => r.status === "pending").length },
            { value: "approved",       label: "Approved",        count: returns.filter(r => r.status === "approved").length },
            { value: "refund_pending", label: "Refund Due",      count: returns.filter(r => r.status === "approved" && r.refundStatus === "pending").length },
            { value: "refund_done",    label: "Refund Done",     count: returns.filter(r => r.refundStatus === "processed").length },
            { value: "rejected",       label: "Rejected",        count: returns.filter(r => r.status === "rejected").length },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                filter === t.value ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  filter === t.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Returns list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No returns in this category.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ret) => {
              const retId        = ret.id || ret._id;
              const isExpanded   = expanded === retId;
              const st           = STATUS_STYLES[ret.status] || STATUS_STYLES.pending;
              const rs           = REFUND_STYLES[ret.refundStatus] || REFUND_STYLES.pending;
              const consumerName = ret.consumer
                ? `${ret.consumer.firstName} ${ret.consumer.lastName}`
                : "Consumer";
              const farmerName   = ret.farmer
                ? `${ret.farmer.firstName} ${ret.farmer.lastName}`
                : "Farmer";
              const orderSnippet = ret.order?._id?.toString().slice(-6)
                                || ret.order?.toString().slice(-6) || "------";
              const needsRefund  = ret.status === "approved" && ret.refundStatus === "pending";

              return (
                <div
                  key={retId}
                  className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                    needsRefund
                      ? "border-orange-300"
                      : isExpanded
                      ? "border-green-400"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : retId)}
                    className="w-full text-left px-4 sm:px-5 py-3.5 sm:py-4"
                  >
                    {/* Mobile: stacked layout; sm+: single row */}
                    <div className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${st.dot}`} />

                      <div className="flex-1 min-w-0">
                        {/* Name row */}
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {consumerName}
                          <span className="text-gray-400 font-normal text-xs ml-1.5">→ {farmerName}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Order #{orderSnippet} ·{" "}
                          {REASON_LABELS[ret.reason] || ret.reason}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>

                        {/* Badges + amount — stacked on mobile */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-sm font-bold text-gray-900">
                            Rs. {Math.round(ret.refundAmount || 0).toLocaleString()}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>
                            {st.label}
                          </span>
                          {ret.status === "approved" && (
                            <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${rs.badge}`}>
                              {rs.label}
                            </span>
                          )}
                        </div>

                        {/* Process Refund CTA — full-width on mobile */}
                        {needsRefund && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRefundTarget(ret); }}
                            className="mt-2.5 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                          >
                            Process Refund — Rs. {Math.round(ret.refundAmount || 0).toLocaleString()}
                          </button>
                        )}
                      </div>

                      {/* Chevron */}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 mt-1 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 sm:px-5 py-4 sm:py-5 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">

                      {/* Left: items + return info */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Returned items
                          </p>
                          <div className="space-y-1.5">
                            {ret.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                <span className="font-medium text-gray-900">
                                  {item.name}
                                  <span className="text-gray-400 font-normal ml-1">×{item.quantity}</span>
                                </span>
                                <span>Rs. {((item.price || 0) * (item.quantity || 0)).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-sm font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                            <span>Refund amount</span>
                            <span className="text-green-700">Rs. {Math.round(ret.refundAmount || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-orange-700 mb-1">Return reason</p>
                          <p className="text-sm text-orange-900 font-medium">{REASON_LABELS[ret.reason] || ret.reason}</p>
                          {ret.reasonDetail && <p className="text-xs text-orange-700 mt-1">{ret.reasonDetail}</p>}
                        </div>

                        {ret.farmerNote && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Farmer's note</p>
                            <p className="text-sm text-blue-900">{ret.farmerNote}</p>
                          </div>
                        )}

                        {ret.status === "approved" && (
                          <div className={`rounded-xl p-3 border ${ret.farmerDeducted ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                            <p className={`text-xs font-semibold mb-0.5 ${ret.farmerDeducted ? "text-red-700" : "text-gray-500"}`}>
                              Farmer payout deduction
                            </p>
                            <p className={`text-sm ${ret.farmerDeducted ? "text-red-800" : "text-gray-600"}`}>
                              {ret.farmerDeducted
                                ? `✓ Rs. ${Math.round(ret.refundAmount).toLocaleString()} deducted from ${farmerName}'s payout`
                                : "Deduction will happen when refund is processed"}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: refund payment details + status */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Consumer's refund details
                          </p>
                          <div className={`rounded-xl p-4 border ${
                            ret.refundMethod === "esewa"         ? "bg-green-50 border-green-200" :
                            ret.refundMethod === "bank_transfer" ? "bg-blue-50 border-blue-200"   :
                            "bg-amber-50 border-amber-200"
                          }`}>
                            <p className="text-xs font-bold uppercase tracking-wide mb-2 text-gray-600">
                              {METHOD_LABELS[ret.refundMethod] || ret.refundMethod || "Not specified"}
                            </p>
                            {ret.refundMethod === "esewa" && ret.refundPaymentDetail?.esewaId && (
                              <p className="text-sm font-mono font-bold text-gray-900 break-all">
                                {ret.refundPaymentDetail.esewaId}
                              </p>
                            )}
                            {ret.refundMethod === "bank_transfer" && ret.refundPaymentDetail && (
                              <div className="text-sm space-y-0.5">
                                <p><span className="text-gray-500">Bank: </span><span className="font-semibold">{ret.refundPaymentDetail.bankName}</span></p>
                                <p><span className="text-gray-500">Acc: </span><span className="font-mono font-bold break-all">{ret.refundPaymentDetail.accountNumber}</span></p>
                                <p><span className="text-gray-500">Name: </span><span className="font-semibold">{ret.refundPaymentDetail.accountName}</span></p>
                              </div>
                            )}
                            {ret.refundMethod === "cash" && (
                              <p className="text-sm text-amber-700">Contact consumer to arrange handover</p>
                            )}
                            {!ret.refundMethod && (
                              <p className="text-sm text-gray-400 italic">No refund method specified</p>
                            )}
                          </div>
                        </div>

                        {ret.refundStatus === "processed" && ret.refundRecord && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-green-700 mb-2">✓ Refund processed</p>
                            <div className="text-sm space-y-0.5 text-green-800">
                              <p><span className="text-gray-500">Method: </span><span className="font-semibold">{METHOD_LABELS[ret.refundRecord.method] || ret.refundRecord.method}</span></p>
                              {ret.refundRecord.reference && (
                                <p><span className="text-gray-500">Ref: </span><span className="font-mono font-bold break-all">{ret.refundRecord.reference}</span></p>
                              )}
                              {ret.refundRecord.note && (
                                <p><span className="text-gray-500">Note: </span>{ret.refundRecord.note}</p>
                              )}
                              <p><span className="text-gray-500">Date: </span>{new Date(ret.refundRecord.processedAt).toLocaleString()}</p>
                            </div>
                          </div>
                        )}

                        {needsRefund && (
                          <button
                            type="button"
                            onClick={() => setRefundTarget(ret)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
                          >
                            💸 Process Refund — Rs. {Math.round(ret.refundAmount).toLocaleString()}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReturns;