import { useEffect, useState } from "react";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";
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
  pending:  { badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-400",  label: "Pending"  },
  approved: { badge: "bg-green-100 text-green-800",  dot: "bg-green-500",   label: "Approved" },
  rejected: { badge: "bg-red-100 text-red-800",      dot: "bg-red-400",     label: "Rejected" },
};

const FarmerReturns = () => {
  const [returns,    setReturns]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [expanded,   setExpanded]   = useState(null);
  const [farmerNote, setFarmerNote] = useState("");
  const [acting,     setActing]     = useState(null);

  const [alertModal,   setAlertModal]   = useState({ isOpen: false, type: "", title: "", message: "", onConfirm: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: "", title: "", message: "", confirmText: "" });

  const showAlert = (title, message, type = "error", onConfirm = null) =>
    setAlertModal({ isOpen: true, title, message, type, onConfirm });

  const closeAlert = () => {
    const cb = alertModal.onConfirm;
    setAlertModal((p) => ({ ...p, isOpen: false, onConfirm: null }));
    if (cb) cb();
  };

  const closeConfirm = () =>
    setConfirmModal((p) => ({ ...p, isOpen: false, action: null }));

  const loadReturns = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/returns/farmer");
      setReturns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Failed to load", err.response?.data?.message || "Could not load returns", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReturns(); }, []);

  const handleExpand = (id) => {
    setExpanded((prev) => (prev === id ? null : id));
    setFarmerNote("");
  };

  const confirmAction = (returnId, action) => {
    const isApprove = action === "approve";
    setConfirmModal({
      isOpen: true,
      type: isApprove ? "warning" : "danger",
      title: isApprove ? "Approve return" : "Reject return",
      message: isApprove
        ? "Approve this return? The product stock will be restored."
        : "Reject this return? The consumer will be notified.",
      confirmText: isApprove ? "Yes, approve" : "Yes, reject",
      action: async () => {
        try {
          setActing(returnId);
          await api.put(`/api/returns/${returnId}/${action}`, { farmerNote });
          await loadReturns();
          setExpanded(null);
          showAlert(
            isApprove ? "Return approved" : "Return rejected",
            isApprove ? "Stock has been restored." : "Consumer has been notified.",
            isApprove ? "success" : "info"
          );
        } catch (err) {
          showAlert("Action failed", err.response?.data?.message || "Please try again.", "error");
        } finally {
          setActing(null);
        }
      },
    });
  };

  const filteredReturns = returns.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  const pendingCount = returns.filter((r) => r.status === "pending").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-6 md:px-8 py-6 sm:py-8">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.action}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText="Cancel"
      />

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">
              Return requests
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              {pendingCount > 0
                ? `${pendingCount} pending request${pendingCount > 1 ? "s" : ""} need your attention`
                : "No pending requests"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
          {[
            { label: "Pending",  value: returns.filter((r) => r.status === "pending").length,  color: "text-yellow-600", border: "border-l-yellow-400" },
            { label: "Approved", value: returns.filter((r) => r.status === "approved").length, color: "text-green-600",  border: "border-l-green-500"  },
            { label: "Rejected", value: returns.filter((r) => r.status === "rejected").length, color: "text-red-600",    border: "border-l-red-400"    },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-white rounded-xl shadow-sm p-3 sm:p-4 text-center border border-gray-100 border-l-4 ${s.border}`}
            >
              <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs — scrollable on very small screens */}
        <div className="bg-white rounded-xl shadow-sm p-1.5 mb-5 sm:mb-6 flex gap-1 border border-gray-100 overflow-x-auto">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 min-w-[64px] px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition capitalize whitespace-nowrap ${
                filter === f ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {f}
              {f === "pending" && pendingCount > 0 && (
                <span className="ml-1 sm:ml-1.5 bg-orange-500 text-white text-xs px-1 sm:px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filteredReturns.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 sm:p-12 text-center border border-gray-100">
            <p className="text-base sm:text-lg font-semibold text-gray-800 mb-1">No returns found</p>
            <p className="text-gray-500 text-sm">
              {filter === "all" ? "No return requests yet." : `No ${filter} returns.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReturns.map((ret) => {
              const retId        = ret._id || ret.id;
              const isExpanded   = expanded === retId;
              const st           = STATUS_STYLES[ret.status] || STATUS_STYLES.pending;
              const consumerName = ret.consumer
                ? `${ret.consumer.firstName} ${ret.consumer.lastName}`
                : "Consumer";
              const orderSnippet =
                ret.order?._id?.toString().slice(-6) ||
                ret.order?.toString().slice(-6) ||
                "------";

              return (
                <div
                  key={retId}
                  className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                    isExpanded ? "border-green-400" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => handleExpand(retId)}
                    className="w-full text-left px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {consumerName}
                          <span className="ml-1.5 text-gray-400 font-normal text-xs hidden sm:inline">
                            Order #{orderSnippet}
                          </span>
                        </p>
                        {/* Order snippet on its own line on mobile */}
                        <p className="text-xs text-gray-400 sm:hidden">Order #{orderSnippet}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {REASON_LABELS[ret.reason] || ret.reason}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full ${st.badge}`}>
                        {st.label}
                      </span>
                      <p className="text-xs text-gray-400 hidden sm:block">
                        {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 sm:px-5 py-4 sm:py-5 space-y-4 sm:space-y-5">

                      {/* Date on mobile (hidden in summary row) */}
                      <p className="text-xs text-gray-400 sm:hidden">
                        {new Date(ret.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>

                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Returned items
                        </p>
                        <div className="space-y-1.5">
                          {ret.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
                            >
                              <span className="font-medium text-gray-900 truncate mr-2">
                                {item.name}
                                <span className="text-gray-400 font-normal ml-1">×{item.quantity}</span>
                              </span>
                              <span className="flex-shrink-0">Rs. {(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reason + detail */}
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 sm:p-4">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                          Return reason
                        </p>
                        <p className="text-sm font-medium text-orange-900">
                          {REASON_LABELS[ret.reason] || ret.reason}
                        </p>
                        {ret.reasonDetail && (
                          <p className="text-sm text-orange-800 mt-1">{ret.reasonDetail}</p>
                        )}
                      </div>

                      {/* Evidence photo */}
                      {ret.evidencePhoto && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Evidence photo
                          </p>
                          <a
                            href={
                              ret.evidencePhoto.startsWith("/api")
                                ? ret.evidencePhoto
                                : `${APIBASEURL}${ret.evidencePhoto}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={
                                ret.evidencePhoto.startsWith("/api")
                                  ? ret.evidencePhoto
                                  : `${APIBASEURL}${ret.evidencePhoto}`
                              }
                              alt="Evidence"
                              className="w-full max-w-xs rounded-xl border-2 border-gray-200 hover:border-green-400 transition cursor-pointer"
                            />
                          </a>
                        </div>
                      )}

                      {/* Consumer info */}
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-gray-800">{consumerName}</span>
                        {ret.consumer?.email && (
                          <span className="ml-1 text-gray-400 break-all">({ret.consumer.email})</span>
                        )}
                      </div>

                      {/* Farmer note + actions (pending only) */}
                      {ret.status === "pending" && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Your response to the consumer{" "}
                              <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <textarea
                              value={farmerNote}
                              onChange={(e) => setFarmerNote(e.target.value)}
                              rows={2}
                              placeholder="e.g. Sorry for the inconvenience, the return is approved."
                              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                              onClick={() => confirmAction(retId, "approve")}
                              disabled={acting === retId}
                              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                            >
                              {acting === retId ? "Processing..." : "Approve return"}
                            </button>
                            <button
                              onClick={() => confirmAction(retId, "reject")}
                              disabled={acting === retId}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                            >
                              {acting === retId ? "Processing..." : "Reject return"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Decision already made */}
                      {ret.status !== "pending" && (
                        <div
                          className={`rounded-xl p-3 sm:p-4 ${
                            ret.status === "approved"
                              ? "bg-green-50 border border-green-200"
                              : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                              ret.status === "approved" ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {ret.status === "approved"
                              ? "You approved this return"
                              : "You rejected this return"}
                          </p>
                          {ret.farmerNote && (
                            <p
                              className={`text-sm ${
                                ret.status === "approved" ? "text-green-800" : "text-red-800"
                              }`}
                            >
                              {ret.farmerNote}
                            </p>
                          )}
                          {ret.decidedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(ret.decidedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
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

export default FarmerReturns;