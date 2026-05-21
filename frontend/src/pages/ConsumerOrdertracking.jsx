import { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";
import { NotificationContext } from "../context/NotificationContext";

const toFarmerIdStr = (farmer) => {
  if (!farmer) return "";
  if (typeof farmer === "string") return farmer.trim();
  if (farmer._id) return farmer._id.toString().trim();
  if (farmer.id)  return farmer.id.toString().trim();
  return "";
};

const RETURN_WINDOW_DAYS = 2;

const ConsumerOrderTracking = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const notifCtx  = useContext(NotificationContext);

  const [orders,          setOrders]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [filter,          setFilter]          = useState("all");
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [expandedOrder,   setExpandedOrder]   = useState(null);
  const [retryingPayment, setRetryingPayment] = useState(null);

  const [existingReturns, setExistingReturns] = useState({});
  const [returnsLoaded,   setReturnsLoaded]   = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: "", message: "", type: "info",
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, orderId: null,
  });

  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/orders/my");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Failed to load orders", err.response?.data?.message || "Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMyReturns = async () => {
    setReturnsLoaded(false);
    try {
      const res = await api.get("/api/returns/my");
      const map = {};
      (res.data || []).forEach((r) => {
        const oid = r.order?._id?.toString() || r.order?.toString();
        const fid = toFarmerIdStr(r.farmer);
        if (oid && fid) map[`${oid}_${fid}`] = r.status;
      });
      setExistingReturns(map);
    } catch {
      // non-critical
    } finally {
      setReturnsLoaded(true);
    }
  };

  useEffect(() => {
    loadOrders();
    loadMyReturns();
  }, [location.pathname, location.key]);

  const canRetryPayment = (order) => {
    return order.status !== "cancelled" && order.paymentStatus === "pending";
  };

  const handleRetryPayment = async (order, method) => {
    const orderId = (order._id || order.id)?.toString();

    if (method === "esewa") {
      navigate("/payment", { state: { order } });
      return;
    }

    try {
      setRetryingPayment(orderId);
      const farmerIds = order.shipments?.map((s) => toFarmerIdStr(s.farmer)).filter(Boolean);

      if (method === "cod") {
        await api.post("/api/payments/cod/confirm", { orderId, farmerIds });
        showAlert(
          "Order Confirmed",
          `Order #${orderId.slice(-6)} confirmed! Pay cash when your order arrives.`,
          "success"
        );
      } else if (method === "fonepay") {
        await api.post("/api/payments/fonepay/confirm", { orderId, farmerIds });
        showAlert(
          "Order Confirmed",
          `Order #${orderId.slice(-6)} confirmed! Pay via FonePay QR scan on delivery.`,
          "success"
        );
      }

      await loadOrders();
      notifCtx?.refetch?.();
    } catch (err) {
      showAlert(
        "Payment Failed",
        err.response?.data?.message || "Failed to confirm payment. Please try again.",
        "error"
      );
    } finally {
      setRetryingPayment(null);
    }
  };

  const requestCancel = (orderId, e) => {
    e.stopPropagation();
    if (!orderId || cancellingOrder) return;
    setConfirmModal({ isOpen: true, orderId });
  };

  const confirmCancel = async () => {
    const orderId = confirmModal.orderId;
    if (!orderId) return;
    try {
      setCancellingOrder(orderId);
      await api.put(`/api/orders/${orderId}/cancel`);
      await loadOrders();
      notifCtx?.refetch?.();
    } catch (err) {
      showAlert("Cancel failed", err.response?.data?.message || "Failed to cancel.", "error");
    } finally {
      setCancellingOrder(null);
      setConfirmModal({ isOpen: false, orderId: null });
    }
  };

  const handleRequestReturn = (order, shipment) => {
    const farmer     = shipment.farmer;
    const farmerName = farmer
      ? `${farmer.firstName || ""} ${farmer.lastName || ""}`.trim()
      : "Farmer";

    const farmerId = toFarmerIdStr(farmer);
    const orderId  = (order._id ?? order.id)?.toString() ?? "";

    navigate("/return-request", {
      state: {
        farmerId,
        orderId,
        farmerName,
        orderDisplayId: orderId.slice(-6),
        items: (shipment.items ?? []).map((i) => ({
          name:     String(i.name     ?? ""),
          quantity: Number(i.quantity ?? 0),
          price:    Number(i.price    ?? 0),
        })),
      },
    });
  };

  const getStatusInfo = (status) => {
    const map = {
      pending:   { color: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-400", label: "Pending"   },
      confirmed: { color: "bg-blue-100 text-blue-800",     dot: "bg-blue-500",   label: "Confirmed" },
      shipped:   { color: "bg-purple-100 text-purple-800", dot: "bg-purple-500", label: "Shipped"   },
      delivered: { color: "bg-green-100 text-green-800",   dot: "bg-green-500",  label: "Delivered" },
      cancelled: { color: "bg-red-100 text-red-800",       dot: "bg-red-400",    label: "Cancelled" },
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

  const getReturnBadge = (status) => {
    switch (status) {
      case "pending":  return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default:         return "bg-gray-100 text-gray-800";
    }
  };

  const makeReturnKey = (order, shipment) => {
    const oid = (order._id ?? order.id)?.toString() ?? "";
    const fid = toFarmerIdStr(shipment.farmer);
    return `${oid}_${fid}`;
  };

  const canRequestReturn = (order, shipment) => {
    if (order.status !== "delivered") return false;
    if (!returnsLoaded) return false;
    const deliveredTimestamp = order.deliveredAt || order.updatedAt;
    const daysSince = (Date.now() - new Date(deliveredTimestamp).getTime()) / 86_400_000;
    if (daysSince > RETURN_WINDOW_DAYS) return false;
    return !existingReturns[makeReturnKey(order, shipment)];
  };

  const getReturnStatus = (order, shipment) =>
    existingReturns[makeReturnKey(order, shipment)] || null;

  const filteredOrders = orders.filter((o) => {
    if (filter === "all")    return true;
    if (filter === "active") return !["delivered", "cancelled"].includes(o.status);
    return o.status === filter;
  });

  const statusSteps       = ["pending", "confirmed", "shipped", "delivered"];
  const canConsumerCancel = (status) => ["pending", "confirmed"].includes(status);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText="OK"
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, orderId: null })}
        onConfirm={confirmCancel}
        title="Cancel order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Yes, cancel"
        cancelText="Keep order"
        type="danger"
      />

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">My orders</h1>
          <p className="text-gray-500 text-sm">Click any card to view details</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",     value: orders.length,                                                            color: "text-gray-900"   },
            { label: "Active",    value: orders.filter(o => !["delivered","cancelled"].includes(o.status)).length, color: "text-yellow-600" },
            { label: "Delivered", value: orders.filter(o => o.status === "delivered").length,                      color: "text-green-600"  },
            { label: "Cancelled", value: orders.filter(o => o.status === "cancelled").length,                      color: "text-red-600"    },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
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

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-500 text-sm mb-5">
              {filter === "all" ? "You haven't placed any orders yet." : `No ${filter} orders.`}
            </p>
            <button
              onClick={() => navigate("/consumer")}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
            >
              Start shopping
            </button>
          </div>
        ) : (
          <>
            {/* Order cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {filteredOrders.map((order) => {
                const orderId        = order._id || order.id;
                const orderDisplayId = orderId?.toString().slice(-6);
                const si             = getStatusInfo(order.status);
                const isSelected     = expandedOrder === orderId;
                const cancellable    = canConsumerCancel(order.status);
                const hasReturn      = order.status === "delivered" &&
                  order.shipments?.some((s) => getReturnStatus(order, s));
                const needsPayment   = canRetryPayment(order);

                return (
                  <div key={orderId} className="relative">
                    <button
                      onClick={() => setExpandedOrder(isSelected ? null : orderId)}
                      className={`w-full aspect-square flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-200 border-2 ${
                        isSelected
                          ? "border-green-500 shadow-lg bg-white"
                          : needsPayment
                          ? "border-amber-300 bg-amber-50 hover:border-amber-400 hover:shadow-md"
                          : "border-gray-100 bg-white hover:border-green-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${si.dot}`} />
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${si.color}`}>
                            {si.label}
                          </span>
                          {needsPayment && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 animate-pulse">
                              Pay Now
                            </span>
                          )}
                          {hasReturn && !needsPayment && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                              Return
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">#{orderDisplayId}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-gray-900">Rs.{order.totalAmount?.toFixed(0)}</div>
                        <div className="text-xs text-gray-400">
                          {order.shipments?.length || 0} shipment{(order.shipments?.length || 0) !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>

                    {cancellable && (
                      <button
                        onClick={(e) => requestCancel(orderId, e)}
                        disabled={cancellingOrder === orderId}
                        className="absolute bottom-3 right-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2 py-1 rounded-lg transition disabled:opacity-50"
                      >
                        {cancellingOrder === orderId ? "..." : "Cancel"}
                      </button>
                    )}

                    {isSelected && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-green-500 z-10" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expanded detail panel */}
            {expandedOrder && (() => {
              const order = filteredOrders.find(o => (o._id || o.id) === expandedOrder);
              if (!order) return null;
              const orderId     = order._id || order.id;
              const si          = getStatusInfo(order.status);
              const stepIndex   = statusSteps.indexOf(order.status);
              const cancellable = canConsumerCancel(order.status);
              const needsPayment = canRetryPayment(order);
              const orderIdStr  = orderId?.toString();

              return (
                <div className="bg-white rounded-2xl border-2 border-green-500 shadow-xl overflow-hidden mt-2">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-5 border-b flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="text-xl font-bold text-gray-900">Order #{orderIdStr?.slice(-6)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${si.color}`}>
                          {order.status?.toUpperCase()}
                        </span>
                        {needsPayment && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                            PAYMENT PENDING
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-2xl font-bold text-gray-900">Rs. {order.totalAmount?.toFixed(0)}</div>
                      </div>
                      <button
                        onClick={() => setExpandedOrder(null)}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition"
                      >
                        X
                      </button>
                    </div>
                  </div>

                  {/* Payment pending banner */}
                  {needsPayment && (
                    <div className="bg-amber-50 border-b-2 border-amber-200 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl flex-shrink-0">⏳</span>
                        <div>
                          <p className="font-bold text-amber-900">Payment not completed</p>
                          <p className="text-sm text-amber-700 mt-0.5">
                            Your order is saved but needs payment to proceed. Choose a method below.
                            Orders without payment are automatically cancelled after 1 hour.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
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
                          const active  = stepIndex >= idx;
                          const current = order.status === step;
                          return (
                            <div key={step} className="flex-1 flex flex-col items-center relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                active ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                              } ${current ? "ring-4 ring-green-100 scale-110" : ""}`}>
                                {active ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : idx + 1}
                              </div>
                              <div className={`text-xs mt-1.5 font-medium capitalize ${active ? "text-gray-800" : "text-gray-400"}`}>{step}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shipments */}
                  <div className="px-6 py-5 space-y-4">
                    <h4 className="font-semibold text-gray-800 text-sm">
                      Shipment details ({order.shipments?.length || 0})
                    </h4>

                    {order.shipments?.map((shipment, idx) => {
                      const farmer       = shipment.farmer;
                      const farmerName   = farmer
                        ? `${farmer.firstName || ""} ${farmer.lastName || ""}`.trim()
                        : "Farmer";
                      const canReturn    = canRequestReturn(order, shipment);
                      const returnStatus = getReturnStatus(order, shipment);

                      const deliveredTimestamp = order.deliveredAt || order.updatedAt;
                      const daysSince = order.status === "delivered"
                        ? (Date.now() - new Date(deliveredTimestamp).getTime()) / 86_400_000
                        : Infinity;
                      const windowOpen = daysSince <= RETURN_WINDOW_DAYS;

                      return (
                        <div key={idx} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                              {farmerName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900">{farmerName}</p>
                              <p className="text-xs text-gray-400">Shipment {idx + 1} of {order.shipments.length}</p>
                            </div>
                            {returnStatus && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getReturnBadge(returnStatus)}`}>
                                Return: {returnStatus}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 mb-3">
                            {shipment.items?.map((item, i) => (
                              <div key={i} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                <span className="font-medium text-gray-900">
                                  {item.name} <span className="text-gray-400 font-normal">×{item.quantity}</span>
                                  {item.orderType === "bulk" && (
                                    <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">Bulk</span>
                                  )}
                                </span>
                                <span className="font-semibold">Rs. {(item.price * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Payment status — only show if payment done */}
                          {!needsPayment && (
                            <div className="flex items-center justify-between text-xs bg-blue-50 rounded-lg px-3 py-2 mb-2">
                              <span className="text-blue-700 font-medium capitalize">
                                {shipment.paymentMethod === "cash_on_delivery"
                                  ? "Cash on Delivery"
                                  : shipment.paymentMethod === "fonepay"
                                  ? "FonePay on Delivery"
                                  : shipment.paymentMethod || "Pending"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-semibold ${getPaymentStatusColor(shipment.paymentStatus)}`}>
                                {shipment.paymentStatus?.toUpperCase() || "PENDING"}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between text-sm pt-2 border-t border-gray-100 mb-3">
                            <span className="text-gray-500">Shipment total</span>
                            <span className="font-bold">Rs. {((shipment.subtotal || 0) + (shipment.deliveryFee || 0)).toFixed(0)}</span>
                          </div>

                          {/* Return action area */}
                          {order.status === "delivered" && (
                            <>
                              {!returnsLoaded && windowOpen && (
                                <div className="w-full py-2 rounded-xl text-sm text-center text-gray-400 border-2 border-gray-100 animate-pulse">
                                  Checking return status…
                                </div>
                              )}
                              {returnsLoaded && canReturn && (
                                <button
                                  onClick={() => handleRequestReturn(order, shipment)}
                                  className="w-full border-2 border-orange-400 text-orange-600 hover:bg-orange-50 font-semibold py-2 rounded-xl text-sm transition"
                                >
                                  Request return
                                </button>
                              )}
                              {returnsLoaded && !canReturn && returnStatus && (
                                <div className={`w-full text-center py-2 rounded-xl text-sm font-semibold border-2 border-transparent ${getReturnBadge(returnStatus)}`}>
                                  {returnStatus === "pending"  && "⏳ Return request pending"}
                                  {returnStatus === "approved" && "✓ Return approved"}
                                  {returnStatus === "rejected" && "✗ Return rejected"}
                                </div>
                              )}
                              {returnsLoaded && !canReturn && !returnStatus && (
                                <p className="text-xs text-center text-gray-400 py-1">
                                  Return window closed (2 days after delivery)
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Order summary */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-600"><span>Items subtotal</span><span>Rs. {order.itemsSubtotal?.toFixed(0)}</span></div>
                      <div className="flex justify-between text-sm text-gray-600"><span>Delivery</span><span>Rs. {order.deliveryTotal?.toFixed(0)}</span></div>
                      <div className="flex justify-between text-sm text-gray-600"><span>Platform charge</span><span>Rs. {order.platformCharge?.toFixed(0) || "25"}</span></div>
                      <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200 text-sm"><span>Total</span><span>Rs. {order.totalAmount?.toFixed(0)}</span></div>
                    </div>

                    {/* ── PAYMENT OPTIONS (shown when payment is pending) ── */}
                    {needsPayment && (
                      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-2xl">💳</span>
                          <div>
                            <p className="font-bold text-amber-900 text-base">Complete your payment</p>
                            <p className="text-sm text-amber-700 mt-0.5">
                              Choose how you'd like to pay for this order.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                          {/* eSewa */}
                          <button
                            onClick={() => handleRetryPayment(order, "esewa")}
                            disabled={retryingPayment === orderIdStr}
                            className="flex flex-col items-center gap-2 border-2 border-green-400 bg-white hover:bg-green-50 rounded-xl p-4 transition disabled:opacity-50 group"
                          >
                            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:bg-green-700 transition">
                              <span className="text-white font-black text-xs">eSewa</span>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-green-800 text-sm">Pay via eSewa</p>
                              <p className="text-xs text-gray-500 mt-0.5">Secure online payment</p>
                            </div>
                          </button>

                          {/* Cash on Delivery */}
                          <button
                            onClick={() => handleRetryPayment(order, "cod")}
                            disabled={retryingPayment === orderIdStr}
                            className="flex flex-col items-center gap-2 border-2 border-blue-400 bg-white hover:bg-blue-50 rounded-xl p-4 transition disabled:opacity-50 group"
                          >
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-700 transition">
                              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-blue-800 text-sm">Cash on Delivery</p>
                              <p className="text-xs text-gray-500 mt-0.5">Pay when it arrives</p>
                            </div>
                          </button>

                          {/* FonePay */}
                          <button
                            onClick={() => handleRetryPayment(order, "fonepay")}
                            disabled={retryingPayment === orderIdStr}
                            className="flex flex-col items-center gap-2 border-2 border-red-300 bg-white hover:bg-red-50 rounded-xl p-4 transition disabled:opacity-50 group"
                          >
                            <div className="w-12 h-12 bg-[#8B1A1A] rounded-xl flex items-center justify-center group-hover:bg-[#6d1414] transition">
                              <span className="text-white font-black text-[10px] text-center leading-tight">Fone<br/>Pay</span>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-red-900 text-sm">FonePay Delivery</p>
                              <p className="text-xs text-gray-500 mt-0.5">Scan QR on delivery</p>
                            </div>
                          </button>
                        </div>

                        {/* Loading state */}
                        {retryingPayment === orderIdStr && (
                          <div className="flex items-center justify-center gap-2 py-2 text-amber-700 text-sm">
                            <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin" />
                            Processing your payment selection...
                          </div>
                        )}

                        {/* Info note */}
                        <div className="bg-white border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                          <span className="font-semibold">Note: </span>
                          Orders without payment are automatically cancelled after 1 hour.
                          Cash on Delivery and FonePay confirm your order immediately.
                        </div>
                      </div>
                    )}

                    {/* Order-level actions */}
                    <div className="flex gap-2">
                      {cancellable && !needsPayment && (
                        <button
                          onClick={(e) => requestCancel(orderIdStr, e)}
                          disabled={cancellingOrder === orderIdStr}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition"
                        >
                          {cancellingOrder === orderIdStr ? "Cancelling..." : "Cancel order"}
                        </button>
                      )}
                      {cancellable && needsPayment && (
                        <button
                          onClick={(e) => requestCancel(orderIdStr, e)}
                          disabled={cancellingOrder === orderIdStr}
                          className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 font-semibold px-4 py-2.5 rounded-lg text-sm transition"
                        >
                          {cancellingOrder === orderIdStr ? "Cancelling..." : "Cancel order instead"}
                        </button>
                      )}
                      {!needsPayment && (
                        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition">
                          Contact farmer
                        </button>
                      )}
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