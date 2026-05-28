/* src/pages/FarmerEarnings.jsx */
import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

const METHOD_LABELS = {
  esewa:            { label: "eSewa",        color: "bg-green-100 text-green-800"   },
  bank_qr:          { label: "Bank QR",      color: "bg-purple-100 text-purple-800" },
  bank_transfer:    { label: "Bank Transfer",color: "bg-blue-100 text-blue-800"     },
  cash_on_delivery: { label: "Cash",         color: "bg-gray-100 text-gray-700"     },
  pending:          { label: "Pending",      color: "bg-yellow-100 text-yellow-800" },
};

const PayBadge = ({ method }) => {
  const m = METHOD_LABELS[method] || { label: method || "Unknown", color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>
      {m.label}
    </span>
  );
};

/* ── Mini bar chart ── */
const MiniBar = ({ value, max, color = "#1E9C17" }) => {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4;
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
};

const StatCard = ({ label, value, sub, color, border, icon }) => (
  <div className={`bg-white rounded-2xl border-2 ${border} p-4 shadow-sm`}>
    <div className="flex items-start justify-between mb-2">
      <span className="text-xl sm:text-2xl">{icon}</span>
    </div>
    <p className={`text-lg sm:text-2xl font-bold ${color} leading-tight`}>{value}</p>
    <p className="text-xs sm:text-sm font-medium text-gray-700 mt-1">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const FarmerEarnings = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [expanded, setExpanded] = useState(null);

  const myId = useMemo(
    () => user?._id?.toString() || user?.id?.toString() || "",
    [user]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/orders/farmer");
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load earnings", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getFarmerId = useCallback((farmerField) => {
    if (!farmerField) return "";
    if (typeof farmerField === "string") return farmerField;
    if (farmerField._id) return farmerField._id.toString();
    if (farmerField.id)  return farmerField.id.toString();
    return String(farmerField);
  }, []);

  const getMyShipment = useCallback((order) => {
    if (!myId || !order?.shipments) return null;
    return order.shipments.find((s) => getFarmerId(s.farmer) === myId) || null;
  }, [myId, getFarmerId]);

  /* Enrich orders with my shipment data */
  const enriched = useMemo(() => {
    if (!myId) return [];
    return orders
      .filter((o) => o.status !== "cancelled")
      .map((o) => {
        const s = getMyShipment(o);
        if (!s) return null;
        return {
          orderId:        o._id || o.id,
          createdAt:      o.createdAt,
          orderType:      o.orderType,
          status:         o.status,
          shipmentStatus: s.paymentStatus,
          farmerPaid:     s.farmerPaid || false,
          subtotal:       s.subtotal || 0,
          deliveryFee:    s.deliveryFee || 0,
          paymentMethod:  s.paymentMethod || "pending",
          items:          s.items || [],
          paidRecord:     s.farmerPaymentRecord || null,
          adminReleased:  o.adminPayout?.released || false,
        };
      })
      .filter(Boolean);
  }, [orders, myId, getMyShipment]);

  /* ── Stats ── */
  const totalReceived   = useMemo(() => enriched.filter((e) => e.farmerPaid).reduce((s, e) => s + e.subtotal, 0), [enriched]);
  const pendingRelease  = useMemo(() => enriched.filter((e) => !e.adminReleased && e.shipmentStatus !== "paid" && e.shipmentStatus !== "failed").reduce((s, e) => s + e.subtotal, 0), [enriched]);
  const releasedNotPaid = useMemo(() => enriched.filter((e) => e.adminReleased && !e.farmerPaid).reduce((s, e) => s + e.subtotal, 0), [enriched]);
  const totalEarned     = totalReceived + releasedNotPaid + pendingRelease;

  /* ── Analytics: Monthly earnings ── */
  const monthlyData = useMemo(() => {
    const map = {};
    enriched.forEach((e) => {
      const d   = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { key, label, total: 0, received: 0, pending: 0, count: 0 };
      map[key].total += e.subtotal;
      map[key].count += 1;
      if (e.farmerPaid) map[key].received += e.subtotal;
      else              map[key].pending  += e.subtotal;
    });
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6);
  }, [enriched]);

  /* ── Analytics: Crop breakdown ── */
  const cropBreakdown = useMemo(() => {
    const map = {};
    enriched.forEach((e) => {
      e.items.forEach((item) => {
        const name = item.name || "Unknown";
        if (!map[name]) map[name] = { name, revenue: 0, qty: 0, orders: 0 };
        map[name].revenue += (item.price || 0) * (item.quantity || 0);
        map[name].qty     += item.quantity || 0;
        map[name].orders  += 1;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [enriched]);

  /* ── Analytics: Payment method breakdown ── */
  const paymentBreakdown = useMemo(() => {
    const map = {};
    enriched.forEach((e) => {
      const m = e.paymentMethod || "pending";
      if (!map[m]) map[m] = { method: m, count: 0, amount: 0 };
      map[m].count  += 1;
      map[m].amount += e.subtotal;
    });
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [enriched]);

  const maxMonthly = useMemo(() => Math.max(...monthlyData.map((m) => m.total), 1), [monthlyData]);
  const maxCrop    = useMemo(() => Math.max(...cropBreakdown.map((c) => c.revenue), 1), [cropBreakdown]);

  /* ── Filter ── */
  const filtered = useMemo(() => {
    switch (filter) {
      case "received":        return enriched.filter((e) => e.farmerPaid);
      case "pending_release": return enriched.filter((e) => !e.adminReleased);
      case "released":        return enriched.filter((e) => e.adminReleased && !e.farmerPaid);
      default:                return enriched;
    }
  }, [enriched, filter]);

  const statusInfo = (e) => {
    if (e.farmerPaid)    return { label: "Received",         color: "bg-green-100 text-green-800",  dot: "bg-green-500"   };
    if (e.adminReleased) return { label: "Awaiting payment", color: "bg-amber-100 text-amber-800",  dot: "bg-amber-500 animate-pulse" };
    return                      { label: "Pending release",  color: "bg-blue-100 text-blue-800",    dot: "bg-blue-400"    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your earnings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Earnings</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {enriched.length > 0
                ? `${enriched.length} shipment${enriched.length !== 1 ? "s" : ""} across all orders`
                : "No shipments yet — start selling to see your earnings here"}
            </p>
          </div>
          <button
            onClick={() => navigate("/farmer/payment-settings")}
            className="text-sm bg-white border border-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition whitespace-nowrap"
          >
            Payment Settings →
          </button>
        </div>

        {/* ── Empty state ── */}
        {enriched.length === 0 && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 sm:p-16 text-center">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No earnings yet</h3>
            <p className="text-gray-500 text-sm mb-6">
              Once consumers place orders for your products, your earnings will appear here.
            </p>
            <button
              onClick={() => navigate("/farmer")}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {enriched.length > 0 && (
          <>
            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                icon="💼"
                label="Total earned"
                value={`Rs. ${Math.round(totalEarned).toLocaleString()}`}
                sub={`${enriched.length} shipment${enriched.length !== 1 ? "s" : ""}`}
                color="text-gray-900"
                border="border-gray-200"
              />
              <StatCard
                icon="✅"
                label="Received"
                value={`Rs. ${Math.round(totalReceived).toLocaleString()}`}
                sub="Admin has paid you"
                color="text-green-700"
                border="border-green-300"
              />
              <StatCard
                icon="⏳"
                label="Released, awaiting"
                value={`Rs. ${Math.round(releasedNotPaid).toLocaleString()}`}
                sub="Admin will pay soon"
                color="text-amber-700"
                border="border-amber-300"
              />
              <StatCard
                icon="🔒"
                label="Pending release"
                value={`Rs. ${Math.round(pendingRelease).toLocaleString()}`}
                sub="Held by platform"
                color="text-blue-700"
                border="border-blue-300"
              />
            </div>

            {/* ── Progress bar ── */}
            {totalEarned > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Earnings flow</p>
                <div className="flex rounded-full overflow-hidden h-4 sm:h-5 gap-px mb-3">
                  {totalReceived > 0 && (
                    <div className="bg-green-500 transition-all flex items-center justify-center" style={{ flex: totalReceived }}>
                      {totalReceived / totalEarned > 0.15 && <span className="text-white text-[10px] font-bold">{Math.round((totalReceived / totalEarned) * 100)}%</span>}
                    </div>
                  )}
                  {releasedNotPaid > 0 && (
                    <div className="bg-amber-400 transition-all flex items-center justify-center" style={{ flex: releasedNotPaid }}>
                      {releasedNotPaid / totalEarned > 0.15 && <span className="text-white text-[10px] font-bold">{Math.round((releasedNotPaid / totalEarned) * 100)}%</span>}
                    </div>
                  )}
                  {pendingRelease > 0 && (
                    <div className="bg-blue-300 transition-all flex items-center justify-center" style={{ flex: pendingRelease }}>
                      {pendingRelease / totalEarned > 0.15 && <span className="text-white text-[10px] font-bold">{Math.round((pendingRelease / totalEarned) * 100)}%</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Received (Rs. {Math.round(totalReceived).toLocaleString()})</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400" />Awaiting (Rs. {Math.round(releasedNotPaid).toLocaleString()})</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-300" />Pending (Rs. {Math.round(pendingRelease).toLocaleString()})</span>
                </div>
              </div>
            )}

            {/* ── Analytics Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

              {/* Monthly Earnings Chart */}
              {monthlyData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Monthly Earnings</h3>
                  <p className="text-xs text-gray-400 mb-4 sm:mb-5">Last 6 months of shipment revenue</p>
                  <div className="space-y-3">
                    {monthlyData.map((m) => (
                      <div key={m.key}>
                        <div className="flex justify-between text-sm mb-1.5 gap-2">
                          <span className="font-medium text-gray-700 text-xs sm:text-sm">{m.label}</span>
                          <div className="flex items-center gap-2 text-xs flex-shrink-0">
                            <span className="text-green-600 font-semibold">Rs. {Math.round(m.total).toLocaleString()}</span>
                            <span className="text-gray-400 hidden sm:inline">{m.count} order{m.count !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MiniBar value={m.received} max={maxMonthly} color="#22c55e" />
                          <MiniBar value={m.pending}  max={maxMonthly} color="#93c5fd" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" />Received</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300" />Pending</span>
                  </div>
                </div>
              )}

              {/* Crop Revenue Breakdown */}
              {cropBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Top Selling Crops</h3>
                  <p className="text-xs text-gray-400 mb-4 sm:mb-5">Revenue by product across all orders</p>
                  <div className="space-y-4">
                    {cropBreakdown.map((c, i) => (
                      <div key={c.name}>
                        <div className="flex justify-between text-sm mb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-green-100 text-green-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-medium text-gray-800 truncate text-xs sm:text-sm">{c.name}</span>
                          </div>
                          <div className="text-right text-xs flex-shrink-0">
                            <p className="font-bold text-gray-900">Rs. {Math.round(c.revenue).toLocaleString()}</p>
                            <p className="text-gray-400">{c.orders} order{c.orders !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MiniBar value={c.revenue} max={maxCrop} color="#1E9C17" />
                          <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">
                            {Math.round((c.revenue / (enriched.reduce((s, e) => s + e.subtotal, 1))) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Method Breakdown */}
              {paymentBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Payment Methods</h3>
                  <p className="text-xs text-gray-400 mb-4 sm:mb-5">How consumers paid for your orders</p>
                  <div className="space-y-3">
                    {paymentBreakdown.map((p) => {
                      const meta = METHOD_LABELS[p.method] || { label: p.method, color: "bg-gray-100 text-gray-600" };
                      return (
                        <div key={p.method} className="flex items-center gap-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${meta.color}`}>
                            {meta.label}
                          </span>
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <MiniBar value={p.amount} max={Math.max(...paymentBreakdown.map(x => x.amount), 1)} color="#1E9C17" />
                          </div>
                          <div className="text-right text-xs flex-shrink-0">
                            <p className="font-bold text-gray-800">Rs. {Math.round(p.amount).toLocaleString()}</p>
                            <p className="text-gray-400">{p.count} order{p.count !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4 sm:mb-5">Quick Stats</h3>
                <div className="space-y-3">
                  {[
                    {
                      label: "Average order value",
                      value: enriched.length > 0 ? `Rs. ${Math.round(enriched.reduce((s, e) => s + e.subtotal, 0) / enriched.length).toLocaleString()}` : "—",
                      icon: "📊",
                    },
                    {
                      label: "Normal orders",
                      value: `${enriched.filter((e) => e.orderType === "normal").length}`,
                      sub: `${enriched.length > 0 ? Math.round((enriched.filter((e) => e.orderType === "normal").length / enriched.length) * 100) : 0}% of total`,
                      icon: "🛒",
                    },
                    {
                      label: "Bulk orders",
                      value: `${enriched.filter((e) => e.orderType === "bulk").length}`,
                      sub: `${enriched.length > 0 ? Math.round((enriched.filter((e) => e.orderType === "bulk").length / enriched.length) * 100) : 0}% of total`,
                      icon: "🏭",
                    },
                    {
                      label: "Completed & paid",
                      value: `${enriched.filter((e) => e.farmerPaid).length}`,
                      sub: "Fully settled shipments",
                      icon: "✅",
                    },
                    {
                      label: "Platform commission",
                      value: `Rs. ${(enriched.length * 25).toLocaleString()}`,
                      sub: "Rs. 25 per order",
                      icon: "🏢",
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <span className="text-lg sm:text-xl flex-shrink-0">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">{s.label}</p>
                        {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
                      </div>
                      <p className="font-bold text-gray-900 text-sm flex-shrink-0">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Filter tabs ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
              {[
                { value: "all",             label: "All",             labelFull: "All Orders",        count: enriched.length },
                { value: "received",        label: "Received",        labelFull: "Received",          count: enriched.filter((e) => e.farmerPaid).length },
                { value: "released",        label: "Awaiting",        labelFull: "Awaiting Payment",  count: enriched.filter((e) => e.adminReleased && !e.farmerPaid).length },
                { value: "pending_release", label: "Pending",         labelFull: "Pending Release",   count: enriched.filter((e) => !e.adminReleased).length },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFilter(t.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                    filter === t.value ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="hidden sm:inline">{t.labelFull}</span>
                  <span className="sm:hidden">{t.label}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    filter === t.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* ── Order list ── */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 sm:p-12 text-center shadow-sm">
                <p className="text-gray-400 text-sm">No orders in this category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((e) => {
                  const si        = statusInfo(e);
                  const isOpen    = expanded === e.orderId?.toString();
                  const displayId = e.orderId?.toString().slice(-6);

                  return (
                    <div
                      key={e.orderId?.toString()}
                      className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                        isOpen ? "border-green-400" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      {/* Summary row */}
                      <button
                        onClick={() => setExpanded(isOpen ? null : e.orderId?.toString())}
                        className="w-full text-left px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${si.dot}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">
                              Order #{displayId}
                              <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                e.orderType === "bulk" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                              }`}>
                                {e.orderType || "normal"}
                              </span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {" · "}{e.items.length} item{e.items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-400">Your earnings</p>
                            <p className="font-bold text-gray-900">Rs. {e.subtotal.toLocaleString()}</p>
                          </div>
                          {/* On mobile show earnings inline */}
                          <p className="font-bold text-gray-900 text-sm sm:hidden">Rs. {e.subtotal.toLocaleString()}</p>
                          <PayBadge method={e.paymentMethod} />
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full hidden sm:inline ${si.color}`}>
                            {si.label}
                          </span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="border-t border-gray-100 px-4 sm:px-5 py-4 sm:py-5 space-y-4">
                          {/* Items */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items in your shipment</p>
                            <div className="space-y-1.5">
                              {e.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                  <span className="font-medium text-gray-900 text-xs sm:text-sm">
                                    {item.name}
                                    <span className="text-gray-400 font-normal ml-1">×{item.quantity}</span>
                                    {item.orderType === "bulk" && (
                                      <span className="ml-1.5 text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-semibold">bulk</span>
                                    )}
                                  </span>
                                  <span className="text-xs sm:text-sm flex-shrink-0">Rs. {((item.price || 0) * (item.quantity || 0)).toFixed(0)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between text-sm font-bold text-gray-900 mt-2 pt-2 border-t border-gray-100">
                              <span>Your earnings</span>
                              <span className="text-green-700">Rs. {e.subtotal.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Payment journey */}
                          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment journey</p>

                            {[
                              {
                                step: 1,
                                title: "Consumer paid",
                                desc: e.shipmentStatus !== "pending"
                                  ? `Via ${METHOD_LABELS[e.paymentMethod]?.label || e.paymentMethod}`
                                  : "Waiting for payment",
                                done: e.shipmentStatus !== "pending",
                              },
                              {
                                step: 2,
                                title: "Admin released payout",
                                desc: "Platform verifies and releases funds",
                                done: e.adminReleased,
                              },
                              {
                                step: 3,
                                title: `Rs. ${e.subtotal.toLocaleString()} paid to you`,
                                desc: e.farmerPaid && e.paidRecord
                                  ? `Via ${METHOD_LABELS[e.paidRecord.method]?.label || e.paidRecord.method}${e.paidRecord.reference ? ` · Ref: ${e.paidRecord.reference}` : ""}`
                                  : "Admin will pay via your configured payment settings",
                                done: e.farmerPaid,
                              },
                            ].map((step) => (
                              <div key={step.step} className="flex items-start gap-3 text-sm">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                  step.done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                                }`}>
                                  {step.done ? "✓" : step.step}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-xs sm:text-sm">{step.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{step.desc}</p>
                                </div>
                                <div className="flex-shrink-0">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                    step.done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                  }`}>
                                    {step.done ? "Done" : "Pending"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Payout record if received */}
                          {e.farmerPaid && e.paidRecord && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 text-sm">
                              <p className="font-semibold text-green-800 mb-2">✓ Payment received</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-green-700">
                                <div><span className="text-gray-500">Method: </span><span className="font-medium">{METHOD_LABELS[e.paidRecord.method]?.label || e.paidRecord.method}</span></div>
                                {e.paidRecord.reference && <div><span className="text-gray-500">Ref: </span><span className="font-mono font-medium break-all">{e.paidRecord.reference}</span></div>}
                                {e.paidRecord.paidAt && <div className="sm:col-span-2"><span className="text-gray-500">Date: </span><span className="font-medium">{new Date(e.paidRecord.paidAt).toLocaleString()}</span></div>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* How payouts work */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 text-sm text-gray-600 space-y-2">
              <p className="font-semibold text-gray-800">How payouts work</p>
              <p>1. Consumer pays via eSewa, Bank QR, or Cash on Delivery. Funds go to the MeroBari platform.</p>
              <p>2. Admin reviews and releases your earnings — this usually happens within 1–2 business days of delivery.</p>
              <p>3. Admin sends money to you using the payment method you configured in your <button onClick={() => navigate("/farmer/payment-settings")} className="text-green-600 hover:underline font-medium">Payment Settings</button>.</p>
              <p className="text-xs text-gray-400 pt-2">Delivery fees and the Rs. 25 platform charge are kept by MeroBari. You receive your items subtotal in full.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FarmerEarnings;