import { useEffect, useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const ConsumerOrderTracking = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/orders/my");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const cancelOrder = async (orderId, e) => {
    e.stopPropagation();
    if (!orderId || cancellingOrder) return;
    if (!window.confirm("Cancel this order?")) return;
    try {
      setCancellingOrder(orderId);
      await api.put(`/api/orders/${orderId}/cancel`);
      await loadOrders();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingOrder(null);
    }
  };

  const getStatusInfo = (status) => {
    const map = {
      pending:   { color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-400", label: "Pending",   icon: "⏳" },
      confirmed: { color: "bg-blue-100 text-blue-800",     dot: "bg-blue-500",   label: "Confirmed", icon: "✓"  },
      shipped:   { color: "bg-purple-100 text-purple-800", dot: "bg-purple-500", label: "Shipped",   icon: "📦" },
      delivered: { color: "bg-green-100 text-green-800",   dot: "bg-green-500",  label: "Delivered", icon: "✓✓" },
      cancelled: { color: "bg-red-100 text-red-800",       dot: "bg-red-400",    label: "Cancelled", icon: "✗"  },
    };
    return map[status] || map.pending;
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid":    return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed":  return "bg-red-100 text-red-800";
      default:        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active") return !["delivered", "cancelled"].includes(o.status);
    return o.status === filter;
  });

  const statusSteps = ["pending", "confirmed", "shipped", "delivered"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My Orders</h1>
          <p className="text-gray-500 text-sm">Click any order card to view details</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",     value: orders.length,                                                             color: "text-gray-900"   },
            { label: "Active",    value: orders.filter(o => !["delivered","cancelled"].includes(o.status)).length,  color: "text-yellow-600" },
            { label: "Delivered", value: orders.filter(o => o.status === "delivered").length,                       color: "text-green-600"  },
            { label: "Cancelled", value: orders.filter(o => o.status === "cancelled").length,                       color: "text-red-600"    },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-1.5 mb-6 flex gap-1 border border-gray-100">
          {[
            { value: "all",       label: "All"       },
            { value: "active",    label: "Active"    },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium flex-1 transition ${
                filter === tab.value ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <div className="text-5xl mb-3">📦</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Orders Found</h3>
            <p className="text-gray-500 text-sm mb-5">
              {filter === "all" ? "You haven't placed any orders yet" : `No ${filter} orders`}
            </p>
            <button onClick={() => navigate("/consumer")} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition">
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            {/* ── Square Cards Grid: 4 per row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {filteredOrders.map((order) => {
                const orderId = order._id || order.id;
                const orderDisplayId = orderId?.toString().slice(-6);
                const si = getStatusInfo(order.status);
                const isSelected = expandedOrder === orderId;
                const canCancel = !["delivered", "cancelled"].includes(order.status);

                return (
                  <div key={orderId} className="relative">
                    <button
                      onClick={() => setExpandedOrder(isSelected ? null : orderId)}
                      className={`w-full aspect-square flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-200 border-2 ${
                        isSelected
                          ? "border-green-500 shadow-lg bg-white"
                          : "border-gray-100 bg-white hover:border-green-300 hover:shadow-md"
                      }`}
                    >
                      {/* Top */}
                      <div className="flex items-start justify-between">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${si.dot}`} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${si.color}`}>
                          {si.label}
                        </span>
                      </div>

                      {/* Middle */}
                      <div>
                        <div className="text-xl font-bold text-gray-900">#{orderDisplayId}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      </div>

                      {/* Bottom */}
                      <div>
                        <div className="text-base font-bold text-gray-900">Rs.{order.totalAmount?.toFixed(0)}</div>
                        <div className="text-xs text-gray-400">
                          {order.shipments?.length || 0} shipment{(order.shipments?.length || 0) !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>

                    {/* Cancel button overlaid at bottom */}
                    {canCancel && (
                      <button
                        onClick={(e) => cancelOrder(orderId, e)}
                        disabled={cancellingOrder === orderId}
                        className="absolute bottom-3 right-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2 py-1 rounded-lg transition disabled:opacity-50"
                      >
                        {cancellingOrder === orderId ? "..." : "Cancel"}
                      </button>
                    )}

                    {/* Arrow pointer */}
                    {isSelected && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-green-500 z-10" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Expanded Detail Panel (below the grid) ── */}
            {expandedOrder && (() => {
              const order = filteredOrders.find(o => (o._id || o.id) === expandedOrder);
              if (!order) return null;
              const orderId = order._id || order.id;
              const si = getStatusInfo(order.status);
              const stepIndex = statusSteps.indexOf(order.status);
              const canCancel = !["delivered", "cancelled"].includes(order.status);

              return (
                <div className="bg-white rounded-2xl border-2 border-green-500 shadow-xl overflow-hidden mt-2">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-5 border-b flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">Order #{orderId?.toString().slice(-6)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${si.color}`}>
                          {si.icon} {order.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total Amount</div>
                        <div className="text-2xl font-bold text-gray-900">Rs. {order.totalAmount?.toFixed(0)}</div>
                      </div>
                      <button
                        onClick={() => setExpandedOrder(null)}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Progress Tracker */}
                  {order.status !== "cancelled" && (
                    <div className="px-6 py-5 bg-gray-50 border-b">
                      <div className="relative flex justify-between items-start">
                        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0">
                          <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${Math.max(0, (stepIndex / (statusSteps.length - 1)) * 100)}%` }}
                          />
                        </div>
                        {statusSteps.map((step, idx) => {
                          const active = stepIndex >= idx;
                          const current = order.status === step;
                          return (
                            <div key={step} className="flex-1 flex flex-col items-center relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                active ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                              } ${current ? "ring-4 ring-green-100 scale-110" : ""}`}>
                                {active ? "✓" : idx + 1}
                              </div>
                              <div className={`text-xs mt-1.5 font-medium capitalize ${active ? "text-gray-800" : "text-gray-400"}`}>{step}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shipments & Summary */}
                  <div className="px-6 py-5 space-y-4">
                    <h4 className="font-semibold text-gray-800 text-sm">Shipment Details ({order.shipments?.length || 0})</h4>

                    {order.shipments?.map((shipment, idx) => {
                      const farmer = shipment.farmer;
                      const farmerName = farmer ? `${farmer.firstName || ""} ${farmer.lastName || ""}`.trim() : "Farmer";
                      return (
                        <div key={idx} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">{farmerName.charAt(0)}</div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{farmerName}</p>
                              <p className="text-xs text-gray-400">Shipment {idx + 1} of {order.shipments.length}</p>
                            </div>
                          </div>
                          <div className="space-y-1.5 mb-3">
                            {shipment.items?.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                <span className="font-medium text-gray-900">{item.name} <span className="text-gray-400 font-normal">×{item.quantity}</span></span>
                                <span className="font-semibold">Rs. {(item.price * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-3 py-2 mb-2">
                            <span className="text-blue-700 font-medium capitalize">{shipment.paymentMethod || "Pending"}</span>
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${getPaymentStatusColor(shipment.paymentStatus)}`}>
                              {shipment.paymentStatus?.toUpperCase() || "PENDING"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                            <span className="text-gray-500">Shipment total</span>
                            <span className="font-bold">Rs. {((shipment.subtotal || 0) + (shipment.deliveryFee || 0)).toFixed(0)}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-600"><span>Items subtotal</span><span>Rs. {order.itemsSubtotal?.toFixed(0)}</span></div>
                      <div className="flex justify-between text-sm text-gray-600"><span>Delivery</span><span>Rs. {order.deliveryTotal?.toFixed(0)}</span></div>
                      <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200 text-sm"><span>Total</span><span>Rs. {order.totalAmount?.toFixed(0)}</span></div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {canCancel && (
                        <button
                          onClick={(e) => cancelOrder(orderId, e)}
                          disabled={cancellingOrder === orderId}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition"
                        >
                          {cancellingOrder === orderId ? "Cancelling..." : "Cancel Order"}
                        </button>
                      )}
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition">
                        Contact Farmer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default ConsumerOrderTracking;