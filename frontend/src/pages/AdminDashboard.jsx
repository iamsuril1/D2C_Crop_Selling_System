/* src/pages/AdminDashboard.jsx
   SIMPLIFIED FLOW:
   - "Release" tab REMOVED entirely
   - "Pay Farmers" tab now shows all orders where consumer paid but farmer not yet paid
   - No adminPayout step needed
   - Refunds tab unchanged (deducts from farmer payout)
   - Overview shows simplified stats
*/

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal   from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

/* ── QR image helper ── */
const QRImage = ({ src }) => {
  if (!src) return null;
  const full = src.startsWith("http") ? src : `${APIBASEURL}${src}`;
  return (
    <img src={full} alt="QR" className="w-24 h-24 object-contain rounded-xl border border-gray-200 bg-white p-1"
      onError={(e) => { e.currentTarget.style.display = "none"; }} />
  );
};

/* ── Farmer payment details ── */
const PaymentDetails = ({ details }) => {
  if (!details) return <p className="text-xs text-gray-400">No payment methods set</p>;
  const { preferred, esewa, bankQr, bankTransfer } = details;
  const hasAny = esewa || bankQr || bankTransfer;
  if (!hasAny) return <p className="text-xs text-gray-400">No payment methods configured</p>;
  return (
    <div className="space-y-2">
      {esewa && (
        <div className={`rounded-lg p-2.5 border text-xs ${preferred === "esewa" ? "border-green-300 bg-green-50" : "border-gray-100 bg-gray-50"}`}>
          <span className="font-bold text-green-700">eSewa</span>
          {preferred === "esewa" && <span className="ml-1 text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full">Preferred</span>}
          <p className="font-mono font-bold text-gray-900 mt-0.5 break-all">{esewa.esewaId}</p>
        </div>
      )}
      {bankQr && (
        <div className={`rounded-lg p-2.5 border text-xs ${preferred === "bank_qr" ? "border-purple-300 bg-purple-50" : "border-gray-100 bg-gray-50"}`}>
          <span className="font-bold text-purple-700">Bank QR</span>
          {preferred === "bank_qr" && <span className="ml-1 text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded-full">Preferred</span>}
          <p className="font-semibold text-gray-900 mt-0.5">{bankQr.bankName}</p>
          <QRImage src={bankQr.qrCodeImage} />
        </div>
      )}
      {bankTransfer && (
        <div className={`rounded-lg p-2.5 border text-xs ${preferred === "bank_transfer" ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
          <span className="font-bold text-blue-700">Bank Transfer</span>
          {preferred === "bank_transfer" && <span className="ml-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Preferred</span>}
          {/* FIX: break-all on account number so it doesn't overflow on mobile */}
          <p className="text-gray-700 mt-0.5">{bankTransfer.bankName}</p>
          <p className="font-mono font-bold break-all">{bankTransfer.accountNumber}</p>
          <p className="text-gray-600">{bankTransfer.accountName}</p>
        </div>
      )}
    </div>
  );
};

/* ── Pay Farmer Modal ── */
const PayFarmerModal = ({ farmer, onClose, onPaid }) => {
  const { paymentDetails, cooldown } = farmer;
  const blocked = cooldown && !cooldown.allowed;

  const availableMethods = [];
  if (paymentDetails?.esewa)        availableMethods.push({ value: "esewa",         label: "eSewa",         detail: paymentDetails.esewa.esewaId });
  if (paymentDetails?.bankQr)       availableMethods.push({ value: "bank_qr",       label: "Bank QR",       detail: paymentDetails.bankQr.bankName });
  if (paymentDetails?.bankTransfer) availableMethods.push({ value: "bank_transfer", label: "Bank Transfer", detail: `${paymentDetails.bankTransfer.bankName} · ${paymentDetails.bankTransfer.accountNumber}` });
  availableMethods.push({ value: "cash", label: "Cash", detail: "Hand-delivered" });

  const defaultMethod = availableMethods.find((m) => m.value === paymentDetails?.preferred)?.value || availableMethods[0]?.value || "cash";
  const [method,    setMethod]    = useState(defaultMethod);
  const [reference, setReference] = useState("");
  const [paying,    setPaying]    = useState(false);
  const [error,     setError]     = useState("");

  const handlePay = async () => {
    if (blocked) return;
    setError(""); setPaying(true);
    try {
      await api.put(`/api/farmer-payouts/${farmer.farmerId}/pay`, { method, reference });
      onPaid();
    } catch (err) {
      setError(err.response?.status === 429
        ? `⏳ ${err.response.data?.message}`
        : err.response?.data?.message || "Payment failed.");
    } finally { setPaying(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* FIX: On mobile slides up from bottom (rounded-t-2xl), on sm+ is centered card */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 py-4 sm:px-6 sm:py-5 text-white">
          <h2 className="text-lg sm:text-xl font-bold">Pay {farmer.farmerName}</h2>
          <p className="text-green-100 text-sm mt-0.5">
            Rs. <span className="text-white font-bold text-base sm:text-lg">{farmer.pendingAmount.toLocaleString()}</span>
            {" "}· {farmer.pendingOrderCount} order{farmer.pendingOrderCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {blocked && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
              <p className="font-bold text-orange-800 text-sm mb-1">⏳ 15-Day Cooldown Active</p>
              <p className="text-sm text-orange-700">
                Last paid {new Date(cooldown.lastPaidAt).toLocaleDateString()} · 
                <strong> {cooldown.daysLeft} day{cooldown.daysLeft !== 1 ? "s" : ""} remaining</strong>
              </p>
            </div>
          )}
          {farmer.pendingShipments?.some((s) => s.returnDeduction > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
              <p className="font-semibold mb-1">⚠ Return deductions applied</p>
              {farmer.pendingShipments.filter((s) => s.returnDeduction > 0).map((s, i) => (
                <p key={i}>Order #{s.orderDisplayId}: Rs.{s.originalSubtotal} − Rs.{s.returnDeduction} = Rs.{s.shipmentSubtotal}</p>
              ))}
            </div>
          )}
          <div className={blocked ? "opacity-40 pointer-events-none" : ""}>
            {availableMethods.map((m) => (
              <label key={m.value} className={`flex items-center gap-3 border-2 rounded-xl px-3 sm:px-4 py-3 mb-2 cursor-pointer transition ${
                method === m.value ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
              }`}>
                <input type="radio" name="payMethod" value={m.value} checked={method === m.value} onChange={() => setMethod(m.value)} className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${method === m.value ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                  {method === m.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                  {/* FIX: truncate long detail strings */}
                  <p className="text-xs text-gray-500 truncate">{m.detail}</p>
                </div>
                {paymentDetails?.preferred === m.value && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">Preferred</span>}
              </label>
            ))}
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="Transaction reference (optional)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={paying}
              className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handlePay} disabled={paying || blocked}
              className={`flex-1 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 ${
                blocked ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white transition"
              }`}
            >
              {paying ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
                : blocked ? `Cooldown: ${cooldown.daysLeft}d`
                : `✓ Pay Rs. ${farmer.pendingAmount.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
══════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const navigate   = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const [users,    setUsers]    = useState([]);
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [stats,    setStats]    = useState({ totalUsers:0, farmers:0, consumers:0, activeProducts:0, totalProducts:0, totalOrders:0, totalRevenue:0, orderStatuses:{} });

  const [farmerPayoutTab,     setFarmerPayoutTab]     = useState("pending");
  const [farmerPayoutList,    setFarmerPayoutList]    = useState([]);
  const [farmerPayoutHistory, setFarmerPayoutHistory] = useState([]);
  const [farmerPayoutStats,   setFarmerPayoutStats]   = useState(null);
  const [farmerPayoutLoading, setFarmerPayoutLoading] = useState(false);
  const [expandedFarmer,      setExpandedFarmer]      = useState(null);
  const [payingFarmer,        setPayingFarmer]        = useState(null);

  const [refunds,          setRefunds]         = useState([]);
  const [refundsLoading,   setRefundsLoading]  = useState(false);
  const [refundStats,      setRefundStats]      = useState(null);
  const [refundTab,        setRefundTab]        = useState("pending_refund");
  const [processingRefund, setProcessingRefund] = useState(null);
  const [expandedRefund,   setExpandedRefund]   = useState(null);
  const [refundForms,      setRefundForms]      = useState({});

  const [orderSearch,       setOrderSearch]       = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  const [alertModal,   setAlertModal]   = useState({ isOpen:false, title:"", message:"", type:"info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen:false, action:null, type:"warning", title:"", message:"" });

  const showAlert    = (title, message, type="error") => setAlertModal({ isOpen:true, title, message, type });
  const closeAlert   = () => setAlertModal(p => ({ ...p, isOpen:false }));
  const closeConfirm = () => setConfirmModal(p => ({ ...p, isOpen:false, action:null }));

  /* ── LOADERS ── */
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [uRes, pRes, oRes] = await Promise.all([
        api.get("/api/admin/users").catch(() => ({ data:[] })),
        api.get("/api/admin/products").catch(() => ({ data:[] })),
        api.get("/api/admin/orders").catch(() => ({ data:[] })),
      ]);
      const ud = uRes.data||[], pd = pRes.data||[], od = oRes.data||[];
      setUsers(ud); setProducts(pd); setOrders(od);
      const orderStatuses = od.reduce((acc,o) => { const s=o.status||"pending"; acc[s]=(acc[s]||0)+1; return acc; }, {});
      setStats({ totalUsers:ud.length, farmers:ud.filter(u=>u.role==="farmer").length, consumers:ud.filter(u=>u.role==="consumer").length, activeProducts:pd.filter(p=>p.isActive).length, totalProducts:pd.length, totalOrders:od.length, totalRevenue:od.reduce((s,o)=>s+(o.totalAmount||0),0), orderStatuses });
    } catch { showAlert("Load Failed","Failed to load dashboard data.","error"); }
    finally { setLoading(false); }
  };

  const loadFarmerPayoutStats = async () => {
    try { const r = await api.get("/api/farmer-payouts/stats"); setFarmerPayoutStats(r.data); } catch {}
  };

  const loadFarmerPayouts = async () => {
    setFarmerPayoutLoading(true);
    try {
      const r = await api.get("/api/farmer-payouts");
      setFarmerPayoutList(Array.isArray(r.data) ? r.data : []);
    } catch (err) { showAlert("Load Failed", err.response?.data?.message||"Failed.", "error"); }
    finally { setFarmerPayoutLoading(false); }
  };

  const loadFarmerPayoutHistoryData = async () => {
    setFarmerPayoutLoading(true);
    try {
      const r = await api.get("/api/farmer-payouts/history");
      setFarmerPayoutHistory(Array.isArray(r.data) ? r.data : []);
    } catch (err) { showAlert("Load Failed", err.response?.data?.message||"Failed.", "error"); }
    finally { setFarmerPayoutLoading(false); }
  };

  const loadRefunds = async (tab=refundTab) => {
    setRefundsLoading(true);
    try {
      const r = await api.get("/api/returns/admin");
      let list = Array.isArray(r.data) ? r.data : [];
      if (tab === "pending_refund") list = list.filter(r => r.status==="approved" && r.refundStatus==="pending");
      else if (tab === "processed") list = list.filter(r => r.refundStatus==="processed");
      setRefunds(list);
    } catch (err) { showAlert("Load Failed", err.response?.data?.message||"Failed.", "error"); }
    finally { setRefundsLoading(false); }
  };

  const loadRefundStats = async () => {
    try { const r = await api.get("/api/returns/admin/stats"); setRefundStats(r.data); } catch {}
  };

  useEffect(() => {
    loadDashboard();
    loadFarmerPayoutStats();
    loadRefundStats();
  }, []);

  useEffect(() => {
    if (activeTab === "farmer-payouts") {
      if (farmerPayoutTab === "pending") loadFarmerPayouts();
      else loadFarmerPayoutHistoryData();
    }
  }, [activeTab, farmerPayoutTab]);

  useEffect(() => {
    if (activeTab === "refunds") loadRefunds(refundTab);
  }, [activeTab, refundTab]);

  /* ── Farmer payout actions ── */
  const handleFarmerPaid = () => {
    setPayingFarmer(null);
    showAlert("Payment recorded","The farmer has been notified.","success");
    loadFarmerPayoutStats();
    loadFarmerPayouts();
  };

  /* ── Refund actions ── */
  const getRefundForm = (retId, ret) => {
    if (refundForms[retId]) return refundForms[retId];
    const totalAmt = ret.items?.reduce((s,i) => s+(i.price||0)*(i.quantity||0), 0)||0;
    return { method: ret.refundMethod||"esewa", reference:"", amount: totalAmt };
  };
  const setRefundForm = (retId, patch) => setRefundForms(prev => ({ ...prev, [retId]: { ...getRefundForm(retId,{}), ...prev[retId], ...patch } }));

  const handleProcessRefund = async (retId, ret) => {
    const form = getRefundForm(retId, ret);
    if (!form.method) { showAlert("Missing","Please select a payment method.","warning"); return; }
    if (ret.refundStatus === "processed") { showAlert("Already Processed","This refund has already been processed.","info"); return; }
    setConfirmModal({
      isOpen:true, type:"warning",
      title:"Confirm Refund",
      message:`Mark Rs. ${Number(form.amount).toFixed(0)} as refunded to ${ret.consumer?.firstName} via ${form.method.replace(/_/g," ")}?`,
      action: async () => {
        try {
          setProcessingRefund(retId);
          await api.put(`/api/returns/${retId}/refund`, { method:form.method, reference:form.reference||"", amount:Number(form.amount) });
          showAlert("Refund Processed","Consumer has been notified.","success");
          loadRefunds(refundTab);
          loadRefundStats();
          loadFarmerPayoutStats();
        } catch (err) { showAlert("Failed", err.response?.data?.message||"Refund failed.", "error"); }
        finally { setProcessingRefund(null); }
      },
    });
  };

  /* ── Filtered orders ── */
  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (orderStatusFilter !== "all") list = list.filter(o=>o.status===orderStatusFilter);
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o =>
        o._id?.toString().slice(-6).toLowerCase().includes(q) ||
        o.consumer?.firstName?.toLowerCase().includes(q) ||
        o.consumer?.lastName?.toLowerCase().includes(q) ||
        o.consumer?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, orderStatusFilter, orderSearch]);

  /* Tabs */
  const TABS = [
    { id:"overview",       label:"Overview",    icon:"📊" },
    { id:"farmer-payouts", label:"Pay Farmers", icon:"💸" },
    { id:"refunds",        label:"Refunds",     icon:"↩️" },
    { id:"orders",         label:"Orders",      icon:"📦" },
    { id:"users",          label:"Users",       icon:"👥" },
    { id:"products",       label:"Products",    icon:"🌾" },
  ];

  const statusBadge = (status) => ({
    delivered:"bg-green-100 text-green-800", cancelled:"bg-red-100 text-red-800",
    confirmed:"bg-blue-100 text-blue-800",   shipped:"bg-purple-100 text-purple-800",
    pending:"bg-yellow-100 text-yellow-800",
  }[status]||"bg-gray-100 text-gray-700");

  const REFUND_METHOD_LABELS = { esewa:"eSewa", cash_on_delivery:"Cash", bank_transfer:"Bank Transfer", bank_qr:"Bank QR" };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Loading Dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <AlertModal  isOpen={alertModal.isOpen}   onClose={closeAlert}   title={alertModal.title}   message={alertModal.message}   type={alertModal.type} confirmText="OK" />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.action} type={confirmModal.type} title={confirmModal.title} message={confirmModal.message} confirmText="Confirm" cancelText="Cancel" />
      {payingFarmer && <PayFarmerModal farmer={payingFarmer} onClose={() => setPayingFarmer(null)} onPaid={handleFarmerPaid} />}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-8">

        {/* ── Header ── */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            {/* FIX: smaller title on mobile */}
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-0.5 text-sm">MeroBari platform management</p>
          </div>
          {/* FIX: alert buttons wrap cleanly, full width on xs */}
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
            {farmerPayoutStats?.pendingFarmers > 0 && (
              <button onClick={() => setActiveTab("farmer-payouts")}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm animate-pulse text-sm">
                💸 {farmerPayoutStats.pendingFarmers} farmer{farmerPayoutStats.pendingFarmers!==1?"s":""} to pay
              </button>
            )}
            {refundStats?.refundPending > 0 && (
              <button onClick={() => setActiveTab("refunds")}
                className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-sm text-sm">
                ↩️ {refundStats.refundPending} refund{refundStats.refundPending!==1?"s":""} pending
              </button>
            )}
          </div>
        </div>

        {/* ── Tab bar ──
            FIX: On mobile show only icon (no label/badge) to fit all 6 tabs.
            On sm+ show icon + label + badge as before. */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 sm:mb-8 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 whitespace-nowrap transition min-w-0 ${
                activeTab===t.id ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}>
              <span className="text-base">{t.icon}</span>
              {/* Label hidden on very small screens */}
              <span className="hidden xs:inline sm:inline">{t.label}</span>
              {/* Badges: always visible as dot on mobile */}
              {t.id==="farmer-payouts" && farmerPayoutStats?.pendingFarmers>0 && (
                <span className="hidden sm:inline bg-green-400 text-green-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{farmerPayoutStats.pendingFarmers}</span>
              )}
              {t.id==="farmer-payouts" && farmerPayoutStats?.pendingFarmers>0 && (
                <span className="sm:hidden absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full" />
              )}
              {t.id==="refunds" && refundStats?.refundPending>0 && (
                <span className="hidden sm:inline bg-orange-400 text-orange-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{refundStats.refundPending}</span>
              )}
              {t.id==="refunds" && refundStats?.refundPending>0 && (
                <span className="sm:hidden absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full" />
              )}
              {t.id==="orders" && (
                <span className="hidden sm:inline bg-gray-200 text-gray-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{stats.totalOrders}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {activeTab==="overview" && (
          <div className="space-y-4 sm:space-y-6">
            {/* FIX: 2-col on xs, 4-col on lg */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label:"Total Users",    value:stats.totalUsers,                             sub:`${stats.farmers} farmers · ${stats.consumers} consumers`, icon:"👥", bg:"bg-green-50",   text:"text-green-700"   },
                { label:"Active Products",value:stats.activeProducts,                         sub:`${stats.totalProducts} total`,                            icon:"🌾", bg:"bg-blue-50",    text:"text-blue-700"    },
                { label:"Total Orders",   value:stats.totalOrders,                            sub:`${stats.orderStatuses["delivered"]||0} delivered`,        icon:"📦", bg:"bg-purple-50",  text:"text-purple-700"  },
                { label:"Total Revenue",  value:`Rs. ${stats.totalRevenue.toLocaleString()}`, sub:"All orders combined",                                     icon:"💰", bg:"bg-emerald-50", text:"text-emerald-700" },
              ].map(c => (
                <div key={c.label} className={`${c.bg} rounded-2xl p-4 sm:p-6 border border-white shadow-sm`}>
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 leading-tight">{c.label}</p>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/60 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0">{c.icon}</div>
                  </div>
                  {/* FIX: smaller number on mobile */}
                  <p className={`text-2xl sm:text-3xl font-bold ${c.text} truncate`}>{c.value}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Quick cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {farmerPayoutStats && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900">Farmer Payments</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Pay farmers their balance</p>
                    </div>
                    <button onClick={() => setActiveTab("farmer-payouts")} className="text-sm text-green-600 hover:underline font-medium">Pay →</button>
                  </div>
                  {/* FIX: mini stats — col-3 with smaller text on mobile */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label:"To Pay",   value:farmerPayoutStats.pendingFarmers,                              color:"text-orange-600", bg:"bg-orange-50" },
                      { label:"Pending",  value:`Rs. ${farmerPayoutStats.pendingAmount?.toLocaleString()}`,    color:"text-orange-700", bg:"bg-orange-50" },
                      { label:"Paid Out", value:`Rs. ${farmerPayoutStats.paidAmount?.toLocaleString()}`,       color:"text-green-600",  bg:"bg-green-50"  },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-2 sm:p-3 text-center`}>
                        <p className={`text-base sm:text-xl font-bold ${s.color} truncate`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {refundStats && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-gray-900">Consumer Refunds</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Approved returns</p>
                    </div>
                    <button onClick={() => setActiveTab("refunds")} className="text-sm text-orange-600 hover:underline font-medium">Manage →</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { label:"Need Refund",   value:refundStats.refundPending||0,                              color:"text-orange-600", bg:"bg-orange-50" },
                      { label:"Total Refunded",value:`Rs. ${(refundStats.totalRefunded||0).toLocaleString()}`,  color:"text-green-700",  bg:"bg-green-50"  },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-2 sm:p-3 text-center`}>
                        <p className={`text-base sm:text-xl font-bold ${s.color} truncate`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {(refundStats.refundPending||0) > 0 && (
                    <button onClick={() => setActiveTab("refunds")}
                      className="mt-4 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                      ↩️ Process {refundStats.refundPending} Refund{refundStats.refundPending!==1?"s":""} Now
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Orders</h3>
                <button onClick={() => setActiveTab("orders")} className="text-sm text-green-600 hover:underline font-medium">View all →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Order ID","Customer","Amount","Status","Date"].map(h => (
                        <th key={h} className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.slice(0,8).map(order => (
                      <tr key={order._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900 font-mono">#{order._id?.toString().slice(-6)}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(order.consumer?.firstName||"N")[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{order.consumer?.firstName} {order.consumer?.lastName}</p>
                              {/* FIX: hide email on xs to save space */}
                              <p className="text-xs text-gray-400 truncate hidden sm:block">{order.consumer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">Rs. {(order.totalAmount||0).toLocaleString()}</td>
                        <td className="px-4 sm:px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge(order.status)}`}>{order.status?.toUpperCase()||"PENDING"}</span></td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {orders.length===0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ PAY FARMERS ══ */}
        {activeTab==="farmer-payouts" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Pay Farmers</h2>
                <p className="text-sm text-gray-500 mt-1">Pay each farmer their balance · 15-day cooldown</p>
              </div>
              <button onClick={() => { loadFarmerPayouts(); loadFarmerPayoutStats(); }}
                className="text-sm border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition text-gray-600 self-start sm:self-auto">↻ Refresh</button>
            </div>

            {farmerPayoutStats && (
              /* FIX: 3-col even on mobile — tighter padding + smaller text */
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { label:"Awaiting",  value:farmerPayoutStats.pendingFarmers,                           color:"text-yellow-600", bg:"bg-yellow-50",  border:"border-l-yellow-400" },
                  { label:"Pending",   value:`Rs. ${farmerPayoutStats.pendingAmount?.toLocaleString()}`, color:"text-orange-600", bg:"bg-orange-50",  border:"border-l-orange-400" },
                  { label:"Paid Out",  value:`Rs. ${farmerPayoutStats.paidAmount?.toLocaleString()}`,   color:"text-green-600",  bg:"bg-green-50",   border:"border-l-green-500"  },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-2xl p-3 sm:p-5 border border-gray-100 border-l-4 ${s.border} shadow-sm`}>
                    <p className={`text-lg sm:text-2xl font-bold ${s.color} truncate`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
              <span className="text-blue-500 text-base sm:text-lg mt-0.5 flex-shrink-0">ℹ</span>
              <div className="text-xs sm:text-sm text-blue-800">
                <span className="font-semibold">How it works: </span>
                When a consumer pays, the order appears here. Pay via the farmer's preferred method.
                Returns auto-deducted. 15-day cooldown prevents duplicate payments.
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
              {[{value:"pending",label:"Pending Payouts"},{value:"history",label:"History"}].map(t => (
                <button key={t.value} onClick={() => setFarmerPayoutTab(t.value)}
                  className={`flex-1 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition text-center ${farmerPayoutTab===t.value ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                  {t.label}
                  {t.value==="pending" && farmerPayoutStats?.pendingFarmers>0 && (
                    <span className="ml-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{farmerPayoutStats.pendingFarmers}</span>
                  )}
                </button>
              ))}
            </div>

            {farmerPayoutLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" /></div>
            ) : farmerPayoutTab==="pending" ? (
              farmerPayoutList.length===0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <div className="text-4xl mb-3">✓</div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">All farmers paid</p>
                  <p className="text-sm text-gray-400">No pending balances right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {farmerPayoutList.map((farmer) => {
                    const isExpanded = expandedFarmer===farmer.farmerId;
                    const blocked    = farmer.cooldown && !farmer.cooldown.allowed;
                    const hasDeduct  = farmer.pendingShipments?.some(s => s.returnDeduction>0);
                    return (
                      <div key={farmer.farmerId} className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${isExpanded?"border-green-400":blocked?"border-orange-200":"border-gray-100 hover:border-gray-200"}`}>
                        {/* FIX: stack vertically on mobile */}
                        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${blocked?"bg-orange-400":"bg-gradient-to-br from-green-400 to-emerald-500"}`}>
                              {farmer.farmerName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 truncate">{farmer.farmerName}</p>
                              <p className="text-xs text-gray-400 truncate">{farmer.farmerEmail}</p>
                            </div>
                          </div>
                          {/* Amount + actions row */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-wrap">
                            <div className="text-left sm:text-right">
                              <p className={`text-xl sm:text-2xl font-black ${blocked?"text-gray-400":"text-green-700"}`}>Rs. {farmer.pendingAmount.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">{farmer.pendingOrderCount} order{farmer.pendingOrderCount!==1?"s":""}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {hasDeduct && <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">⚠ Deduct</span>}
                              {blocked && (
                                <span className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1">⏳ {farmer.cooldown.daysLeft}d</span>
                              )}
                              <button onClick={() => setExpandedFarmer(isExpanded ? null : farmer.farmerId)}
                                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition">
                                {isExpanded?"Hide":"Details"}
                              </button>
                              <button onClick={() => setPayingFarmer(farmer)} disabled={blocked}
                                title={blocked ? `Cooldown: ${farmer.cooldown?.daysLeft} days remaining` : "Pay farmer"}
                                className={`font-bold px-4 py-1.5 rounded-lg text-sm transition shadow-sm ${blocked?"bg-gray-200 text-gray-400 cursor-not-allowed":"bg-green-600 hover:bg-green-700 text-white"}`}>
                                {blocked ? `${farmer.cooldown?.daysLeft}d` : "Pay Now"}
                              </button>
                            </div>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment details</p>
                              <PaymentDetails details={farmer.paymentDetails} />
                              {blocked && (
                                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
                                  <p className="text-xs font-bold text-orange-700 mb-1">⏳ Cooldown Active</p>
                                  <p className="text-sm text-orange-800">Last paid: {new Date(farmer.cooldown.lastPaidAt).toLocaleDateString()}</p>
                                  <p className="text-sm font-bold text-orange-900">Next: {farmer.cooldown.nextPayoutAt ? new Date(farmer.cooldown.nextPayoutAt).toLocaleDateString() : "—"}</p>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Pending shipments</p>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {farmer.pendingShipments?.map((s, idx) => (
                                  <div key={idx} className="bg-gray-50 rounded-xl px-3 sm:px-4 py-3">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-bold text-gray-700">#{s.orderDisplayId}</span>
                                      <div className="text-right">
                                        {s.returnDeduction>0 ? (
                                          <div>
                                            <span className="text-xs line-through text-gray-400">Rs.{s.originalSubtotal}</span>
                                            <span className="text-sm font-bold text-green-700 ml-1">Rs.{s.shipmentSubtotal}</span>
                                            <p className="text-xs text-red-500">−Rs.{s.returnDeduction}</p>
                                          </div>
                                        ) : (
                                          <span className="text-sm font-bold text-green-700">Rs.{s.shipmentSubtotal?.toLocaleString()}</span>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-400">{s.consumerName} · {new Date(s.createdAt).toLocaleDateString()}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
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
              )
            ) : (
              farmerPayoutHistory.length===0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                  <p className="text-gray-400 text-sm">No payment history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {farmerPayoutHistory.map((farmer) => {
                    const isExpanded = expandedFarmer===farmer.farmerId+"-h";
                    return (
                      <div key={farmer.farmerId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedFarmer(isExpanded ? null : farmer.farmerId+"-h")}
                          className="w-full text-left px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 hover:bg-gray-50 transition">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{farmer.farmerName.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{farmer.farmerName}</p>
                            <p className="text-xs text-gray-400 truncate">{farmer.farmerEmail}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base sm:text-lg font-black text-green-700">Rs. {farmer.totalPaid.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">total paid</p>
                          </div>
                          <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded?"rotate-180":""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {isExpanded && farmer.payments?.length>0 && (
                          <div className="border-t border-gray-100 px-4 sm:px-6 py-4 space-y-2">
                            {farmer.payments.map((p,i) => (
                              <div key={i} className="flex items-start sm:items-center justify-between bg-gray-50 rounded-xl px-3 sm:px-4 py-3 text-sm gap-3">
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{p.method}</span>
                                  {p.reference && <p className="text-xs font-mono text-gray-600 mt-0.5 break-all">Ref: {p.reference}</p>}
                                  <p className="text-xs text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}</p>
                                </div>
                                <span className="font-bold text-green-700 whitespace-nowrap flex-shrink-0">Rs. {Math.round(p.amount).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* ══ REFUNDS ══ */}
        {activeTab==="refunds" && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Consumer Refunds</h2>
              <button onClick={() => loadRefunds(refundTab)} className="text-sm border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition">↻ Refresh</button>
            </div>
            {refundStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label:"Need Refund",   value:refundStats.refundPending||0,                              color:"text-orange-600", bg:"bg-orange-50",  border:"border-l-orange-400" },
                  { label:"Total Refunded",value:`Rs. ${(refundStats.totalRefunded||0).toLocaleString()}`,  color:"text-green-700",  bg:"bg-green-50",   border:"border-l-green-500"  },
                  { label:"Total Returns", value:refundStats.total||0,                                      color:"text-gray-900",   bg:"bg-white",      border:"border-l-gray-300"   },
                  { label:"Processed",     value:refundStats.refundProcessed||0,                            color:"text-blue-700",   bg:"bg-blue-50",    border:"border-l-blue-500"   },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-3 sm:p-5 border border-gray-100 border-l-4 ${s.border} shadow-sm text-center`}>
                    <p className={`text-xl sm:text-2xl font-bold ${s.color} truncate`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {/* FIX: sub-tabs fill width on mobile */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
              {[{value:"pending_refund",label:"Needs Refund"},{value:"processed",label:"Refunded"},{value:"all",label:"All"}].map(t => (
                <button key={t.value} onClick={() => setRefundTab(t.value)}
                  className={`flex-1 px-2 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition text-center ${refundTab===t.value ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
                  {t.label}
                  {t.value==="pending_refund" && (refundStats?.refundPending||0)>0 && (
                    <span className="ml-1.5 bg-orange-300 text-orange-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{refundStats.refundPending}</span>
                  )}
                </button>
              ))}
            </div>

            {refundsLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" /></div>
            ) : refunds.length===0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <p className="text-lg font-semibold text-gray-900 mb-1">{refundTab==="pending_refund" ? "No pending refunds ✓" : "No records found"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {refunds.map((ret) => {
                  const retId     = ret._id||ret.id;
                  const isOpen    = expandedRefund===retId;
                  const totalAmt  = ret.items?.reduce((s,i) => s+(i.price||0)*(i.quantity||0), 0)||0;
                  const form      = getRefundForm(retId, ret);
                  const processed = ret.refundStatus==="processed";
                  return (
                    <div key={retId} className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${isOpen?"border-orange-400":"border-gray-100 hover:border-gray-200"}`}>
                      <button onClick={() => setExpandedRefund(isOpen ? null : retId)} className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${processed?"bg-green-500":"bg-orange-400 animate-pulse"}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {ret.consumer?.firstName} {ret.consumer?.lastName}
                              {/* FIX: email hidden on mobile */}
                              <span className="ml-2 text-xs text-gray-400 hidden sm:inline">{ret.consumer?.email}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{new Date(ret.updatedAt||ret.createdAt).toLocaleDateString()} · {ret.reason?.replace(/_/g," ")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-orange-600 text-sm">Rs. {totalAmt.toFixed(0)}</span>
                          <span className={`text-xs font-semibold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${processed?"bg-green-100 text-green-800":"bg-orange-100 text-orange-800"}`}>
                            {processed ? "✓ Done" : "Refund"}
                          </span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen?"rotate-180":""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-100 px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                          <div className="space-y-4">
                            <div className={`rounded-xl p-3 sm:p-4 border ${ret.refundMethod==="esewa"?"bg-green-50 border-green-200":"bg-blue-50 border-blue-200"}`}>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Consumer wants refund via</p>
                              {ret.refundMethod==="esewa" ? (
                                <div>
                                  <p className="text-xs font-bold text-green-700">eSewa</p>
                                  {/* FIX: break-all on eSewa ID */}
                                  <p className="font-mono font-bold text-gray-900 text-lg sm:text-xl break-all">{ret.refundPaymentDetail?.esewaId||"—"}</p>
                                </div>
                              ) : ret.refundMethod==="bank_transfer" ? (
                                <div className="text-sm space-y-0.5">
                                  <p><span className="text-gray-500">Bank: </span><span className="font-semibold">{ret.refundPaymentDetail?.bankName}</span></p>
                                  <p><span className="text-gray-500">Acc: </span><span className="font-mono font-bold break-all">{ret.refundPaymentDetail?.accountNumber}</span></p>
                                  <p><span className="text-gray-500">Name: </span><span className="font-semibold">{ret.refundPaymentDetail?.accountName}</span></p>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-700">Cash · Rs. {totalAmt.toFixed(0)}</p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {ret.items?.map((item,i) => (
                                <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 gap-2">
                                  <span className="font-medium text-gray-900 min-w-0 truncate">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                                  <span className="flex-shrink-0">Rs. {((item.price||0)*(item.quantity||0)).toFixed(0)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                                <span>Total to refund</span><span className="text-orange-600">Rs. {totalAmt.toFixed(0)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400">Farmer: {ret.farmer?.firstName} {ret.farmer?.lastName}</p>
                          </div>
                          <div>
                            {processed ? (
                              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 sm:p-5">
                                <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-3">Refund processed ✓</p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between gap-2">
                                    <span className="text-gray-500">Method</span>
                                    <span className="font-semibold">{REFUND_METHOD_LABELS[ret.refundRecord?.method]||ret.refundRecord?.method||"—"}</span>
                                  </div>
                                  {ret.refundRecord?.reference && (
                                    <div className="flex justify-between gap-2">
                                      <span className="text-gray-500">Reference</span>
                                      <span className="font-mono break-all text-right">{ret.refundRecord.reference}</span>
                                    </div>
                                  )}
                                  {ret.refundRecord?.processedAt && (
                                    <div className="flex justify-between gap-2">
                                      <span className="text-gray-500">Date</span>
                                      <span className="text-right">{new Date(ret.refundRecord.processedAt).toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                                {ret.farmerDeducted && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">✓ Farmer payout deducted</div>}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Process refund</p>
                                <select value={form.method} onChange={e => setRefundForm(retId, {method:e.target.value})}
                                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                                  <option value="esewa">eSewa</option>
                                  <option value="cash_on_delivery">Cash</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                </select>
                                <input type="text" value={form.reference||""} onChange={e => setRefundForm(retId, {reference:e.target.value})}
                                  placeholder="Transaction reference (optional)"
                                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                <button onClick={() => handleProcessRefund(retId, ret)} disabled={processingRefund===retId}
                                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2">
                                  {processingRefund===retId
                                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
                                    : `✓ Mark Refund Sent — Rs. ${totalAmt.toFixed(0)}`}
                                </button>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                                  ⚠ Processing this refund will deduct Rs.{totalAmt.toFixed(0)} from the farmer's payout.
                                </div>
                              </div>
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
        )}

        {/* ══ ORDERS ══ */}
        {activeTab==="orders" && (
          <div className="space-y-4 sm:space-y-6">
            {/* FIX: status filter — 3-col on mobile → 6-col on lg */}
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {[
                { label:"All",       value:orders.length,                                   filter:"all",       color:"text-gray-900",   bg:"bg-white"     },
                { label:"Pending",   value:orders.filter(o=>o.status==="pending").length,   filter:"pending",   color:"text-yellow-700", bg:"bg-yellow-50" },
                { label:"Confirmed", value:orders.filter(o=>o.status==="confirmed").length, filter:"confirmed", color:"text-blue-700",   bg:"bg-blue-50"   },
                { label:"Shipped",   value:orders.filter(o=>o.status==="shipped").length,   filter:"shipped",   color:"text-purple-700", bg:"bg-purple-50" },
                { label:"Delivered", value:orders.filter(o=>o.status==="delivered").length, filter:"delivered", color:"text-green-700",  bg:"bg-green-50"  },
                { label:"Cancelled", value:orders.filter(o=>o.status==="cancelled").length, filter:"cancelled", color:"text-red-700",    bg:"bg-red-50"    },
              ].map(s => (
                <button key={s.filter} onClick={() => setOrderStatusFilter(s.filter)}
                  className={`${s.bg} border-2 rounded-2xl p-3 sm:p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md ${orderStatusFilter===s.filter?"border-green-400 shadow-md":"border-transparent"}`}>
                  <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Orders <span className="text-sm font-normal text-gray-400">({filteredOrders.length})</span></h2>
                <input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search by ID, name or email…"
                  className="w-full sm:w-64 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Order ID","Customer","Amount","Type","Payment","Status","Date"].map(h => (
                        <th key={h} className="px-3 sm:px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-50 transition">
                        <td className="px-3 sm:px-5 py-4 text-sm font-semibold text-gray-900 font-mono whitespace-nowrap">#{order._id?.toString().slice(-6)}</td>
                        <td className="px-3 sm:px-5 py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(order.consumer?.firstName||"?")[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{order.consumer?.firstName} {order.consumer?.lastName}</p>
                              <p className="text-xs text-gray-400 truncate hidden sm:block">{order.consumer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">Rs. {(order.totalAmount||0).toLocaleString()}</td>
                        <td className="px-3 sm:px-5 py-4"><span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${order.orderType==="bulk"?"bg-amber-100 text-amber-800":"bg-gray-100 text-gray-700"}`}>{order.orderType||"normal"}</span></td>
                        <td className="px-3 sm:px-5 py-4"><span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${order.paymentStatus==="paid"?"bg-green-100 text-green-800":"bg-yellow-100 text-yellow-800"}`}>{order.paymentStatus||"pending"}</span></td>
                        <td className="px-3 sm:px-5 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge(order.status)}`}>{order.status?.toUpperCase()||"PENDING"}</span></td>
                        <td className="px-3 sm:px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}</td>
                      </tr>
                    ))}
                    {filteredOrders.length===0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No orders match your filter.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ USERS ══ */}
        {activeTab==="users" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Users ({stats.totalUsers})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Name","Email","Phone","Role","Joined"].map(h => (
                      <th key={h} className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(u.firstName||"U")[0]}
                          </div>
                          <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{u.firstName} {u.lastName}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 max-w-[160px] truncate">{u.email}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{u.phone||"—"}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${u.role==="farmer"?"bg-green-100 text-green-800":u.role==="admin"?"bg-purple-100 text-purple-800":"bg-blue-100 text-blue-800"}`}>{u.role}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}</td>
                    </tr>
                  ))}
                  {users.length===0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ PRODUCTS ══ */}
        {activeTab==="products" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Products ({stats.activeProducts} active / {stats.totalProducts} total)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["Product","Farmer","Price","Bulk Price","Qty","Category","Status"].map(h => (
                      <th key={h} className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition">
                      <td className="px-4 sm:px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{p.name}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{p.farmer?.firstName} {p.farmer?.lastName}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">Rs. {p.price}/{p.unit}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm whitespace-nowrap">{p.bulkPrice ? <span className="text-amber-700 font-semibold">Rs. {p.bulkPrice}/{p.unit}</span> : <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{p.quantity} {p.unit}</td>
                      <td className="px-4 sm:px-6 py-4"><span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium capitalize whitespace-nowrap">{p.category}</span></td>
                      <td className="px-4 sm:px-6 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${p.isActive?"bg-green-100 text-green-800":"bg-gray-100 text-gray-600"}`}>{p.isActive?"Active":"Disabled"}</span></td>
                    </tr>
                  ))}
                  {products.length===0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No products found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;