import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";
import { AuthContext } from "../context/AuthContext";

// FIX: myShipment was found with `order.shipments?.find(s => s.farmer?._id || s.farmer)`
// which always returns the FIRST shipment regardless of ownership, because
// `s.farmer?._id || s.farmer` is truthy for any populated farmer field.
// Now we compare against the logged-in user's _id from AuthContext.
//
// FIX: cancelOrderByFarmer now calls PUT /:id/cancel/farmer (the new dedicated
// farmer cancel endpoint) instead of the consumer cancel endpoint /:id/cancel.

const FarmerOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);

  const [alertModal, setAlertModal] = useState({ isOpen: false, type: "", title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: "", title: "", message: "", confirmText: "" });

  const showAlert = (title, message, type = "error") => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false, action: null }));
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/orders/farmer");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Failed to Load Orders", err.response?.data?.message || "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  // FIX: find the shipment that belongs to the logged-in farmer
  const getMyShipment = (order) => {
    const myId = user?._id?.toString() || user?.id?.toString();
    return order.shipments?.find((s) => {
      const farmerId = s.farmer?._id?.toString() || s.farmer?.toString();
      return farmerId === myId;
    });
  };

  const updateOrderStatus = (orderId, newStatus) => {
    if (!orderId || updatingOrder) return;
    setConfirmModal({
      isOpen: true,
      type: "warning",
      title: "Update Order Status",
      message: `Update this order to "${newStatus}"?`,
      confirmText: "Yes, Update",
      action: async () => {
        try {
          setUpdatingOrder(orderId);
          await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
          await loadOrders();
          showAlert("Updated", `Order updated to ${newStatus}`, "success");
        } catch (err) {
          showAlert("Update Failed", err.response?.data?.message || "Failed to update", "error");
        } finally {
          setUpdatingOrder(null);
        }
      },
    });
  };

  const cancelOrderByFarmer = (orderId, e) => {
    e?.stopPropagation();
    if (!orderId || updatingOrder) return;
    setConfirmModal({
      isOpen: true,
      type: "danger",
      title: "Cancel Order",
      message: "Are you sure you want to cancel this order? This cannot be undone.",
      confirmText: "Yes, Cancel",
      action: async () => {
        try {
          setUpdatingOrder(orderId);
          // FIX: use dedicated farmer cancel endpoint
          await api.put(`/api/orders/${orderId}/cancel/farmer`);
          await loadOrders();
          showAlert("Cancelled", "Order cancelled successfully", "success");
        } catch (err) {
          showAlert("Cancel Failed", err.response?.data?.message || "Failed to cancel order", "error");
        } finally {
          setUpdatingOrder(null);
        }
      },
    });
  };

  const verifyPayment = (orderId, status) => {
    if (!orderId || updatingOrder) return;
    const isVerify = status === "paid";
    setConfirmModal({
      isOpen: true,
      type: isVerify ? "warning" : "danger",
      title: `${isVerify ? "Verify" : "Reject"} Payment`,
      message: `Are you sure you want to ${isVerify ? "verify" : "reject"} this payment?`,
      confirmText: `Yes, ${isVerify ? "Verify" : "Reject"}`,
      action: async () => {
        try {
          setUpdatingOrder(orderId);
          await api.put("/api/payments/verify", { orderId, status });
          await loadOrders();
          showAlert(
            isVerify ? "Verified" : "Rejected",
            `Payment ${isVerify ? "verified" : "rejected"}`,
            isVerify ? "success" : "warning"
          );
        } catch (err) {
          showAlert("Failed", err.response?.data?.message || "Failed", "error");
        } finally {
          setUpdatingOrder(null);
        }
      },
    });
  };

  const filteredOrders = orders.filter(o => filter === "all" ? true : o.status === filter);

  const getStatusDot = (status) => {
    const map = { pending: "bg-yellow-400", confirmed: "bg-blue-500", shipped: "bg-purple-500", delivered: "bg-green-500", cancelled: "bg-red-400" };
    return map[status] || "bg-gray-400";
  };

  const getStatusBadge = (status) => {
    const map = {
      pending:   "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      shipped:   "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid":    return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "failed":  return "bg-red-100 text-red-800";
      default:        return "bg-gray-100 text-gray-800";
    }
  };

  const statusSteps = ["pending", "confirmed", "shipped", "delivered"];

  // FIX: only pending and confirmed can be cancelled (mirrors backend guard)
  const canFarmerCancel = (status) => ["pending", "confirmed"].includes(status);

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
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
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

      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Order Management</h1>
          <p className="text-gray-500 text-sm">Click any order card to manage it</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Pending",   value: orders.filter(o => o.status === "pending").length,   color: "text-yellow-600", border: "border-l-yellow-400" },
            { label: "Confirmed", value: orders.filter(o => o.status === "confirmed").length, color: "text-blue-600",   border: "border-l-blue-500"   },
            { label: "Shipped",   value: orders.filter(o => o.status === "shipped").length,   color: "text-purple-600", border: "border-l-purple-500"  },
            { label: "Delivered", value: orders.filter(o => o.status === "delivered").length, color: "text-green-600",  border: "border-l-green-500"   },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100 border-l-4 ${s.border}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-1.5 mb-6 flex gap-1 overflow-x-auto border border-gray-100">
          {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-1 transition ${
                filter === status ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Orders Found</h3>
            <p className="text-gray-500 text-sm">{filter === "all" ? "No orders received yet" : `No ${filter} orders`}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {filteredOrders.map((order) => {
                const orderId = order._id || order.id;
                const orderDisplayId = orderId?.toString().slice(-6);
                const isSelected = expandedOrder === orderId;
                // FIX: use corrected shipment lookup
                const myShipment = getMyShipment(order);
                const consumer = order.consumer;
                const consumerName = consumer ? `${consumer.firstName || ""} ${consumer.lastName || ""}`.trim() : "Customer";
                const cancellable = canFarmerCancel(order.status);
                const needsPaymentVerification = myShipment?.paymentStatus === "pending" && myShipment?.paymentMethod !== "cash_on_delivery";

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
                      <div className="flex items-start justify-between gap-1">
                        <div className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${getStatusDot(order.status)}`} />
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(order.status)}`}>
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                          </span>
                          {needsPaymentVerification && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 animate-pulse">
                              Pay Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">#{orderDisplayId}</div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{consumerName}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-gray-900">Rs.{order.totalAmount?.toFixed(0)}</div>
                        <div className="text-xs text-gray-400">
                          {myShipment?.items?.length || 0} item{(myShipment?.items?.length || 0) !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>

                    {/* FIX: only show cancel for pending/confirmed */}
                    {cancellable && (
                      <button
                        onClick={(e) => cancelOrderByFarmer(orderId, e)}
                        disabled={updatingOrder === orderId}
                        className="absolute bottom-3 right-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2 py-1 rounded-lg transition disabled:opacity-50"
                      >
                        {updatingOrder === orderId ? "..." : "Cancel"}
                      </button>
                    )}

                    {isSelected && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-green-500 z-10" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Expanded Detail Panel */}
            {expandedOrder && (() => {
              const order = filteredOrders.find(o => (o._id || o.id) === expandedOrder);
              if (!order) return null;
              const orderId = order._id || order.id;
              // FIX: use corrected shipment lookup
              const myShipment = getMyShipment(order);
              const consumer = order.consumer;
              const consumerName = consumer ? `${consumer.firstName || ""} ${consumer.lastName || ""}`.trim() : "Customer";
              const stepIndex = statusSteps.indexOf(order.status);
              const cancellable = canFarmerCancel(order.status);
              const needsPaymentVerification = myShipment?.paymentStatus === "pending" && myShipment?.paymentMethod !== "cash_on_delivery";

              return (
                <div className="bg-white rounded-2xl border-2 border-green-500 shadow-xl overflow-hidden mt-2">
                  <div className="bg-gray-50 px-6 py-5 border-b flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">Order #{orderId?.toString().slice(-6)}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(order.status)}`}>
                          {order.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Customer: <span className="font-medium text-gray-700">{consumerName}</span>
                        {consumer?.email && <span className="ml-1 text-gray-400">({consumer.email})</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleString()}</p>
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

                  {order.status !== "cancelled" && (
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        {statusSteps.map(s => (
                          <span key={s} className={`capitalize font-medium ${statusSteps.indexOf(order.status) >= statusSteps.indexOf(s) ? "text-gray-800" : ""}`}>
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.max(5, (stepIndex / (statusSteps.length - 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    {myShipment && (
                      <>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Items</p>
                          <div className="space-y-1.5">
                            {myShipment.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
                                <div>
                                  <span className="font-medium text-gray-900">{item.name}</span>
                                  <span className="text-gray-400 text-xs ml-2">x{item.quantity} · Rs.{item.price} each</span>
                                </div>
                                <span className="font-semibold text-gray-900">Rs. {(item.price * item.quantity).toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-sm font-semibold text-gray-700 mt-2 pt-2 border-t border-gray-100">
                            <span>Subtotal + Delivery</span>
                            <span>Rs. {((myShipment.subtotal || 0) + (myShipment.deliveryFee || 0)).toFixed(0)}</span>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Payment Info</p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-xs text-gray-500">Method</span>
                              <p className="font-semibold text-gray-900 capitalize">{myShipment.paymentMethod || "Not selected"}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Status</span>
                              <p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPaymentStatusColor(myShipment.paymentStatus)}`}>
                                  {myShipment.paymentStatus?.toUpperCase() || "PENDING"}
                                </span>
                              </p>
                            </div>
                            {myShipment.transactionId && (
                              <div className="col-span-2">
                                <span className="text-xs text-gray-500">Transaction ID</span>
                                <p className="font-semibold text-gray-900 text-sm">{myShipment.transactionId}</p>
                              </div>
                            )}
                            {myShipment.paymentDate && (
                              <div className="col-span-2">
                                <span className="text-xs text-gray-500">Payment Date</span>
                                <p className="font-medium text-gray-800 text-sm">{new Date(myShipment.paymentDate).toLocaleString()}</p>
                              </div>
                            )}
                          </div>

                          {myShipment.paymentProof && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-1">Payment Proof</p>
                              <a href={`${APIBASEURL}${myShipment.paymentProof}`} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={`${APIBASEURL}${myShipment.paymentProof}`}
                                  alt="Payment proof"
                                  className="max-w-xs rounded-lg border-2 border-blue-300 hover:border-blue-500 transition cursor-pointer"
                                />
                              </a>
                            </div>
                          )}

                          {needsPaymentVerification && (
                            <div className="flex gap-2 mt-3 pt-3 border-t border-blue-200">
                              <button
                                onClick={() => verifyPayment(orderId, "paid")}
                                disabled={updatingOrder === orderId}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                              >
                                Verify Payment
                              </button>
                              <button
                                onClick={() => verifyPayment(orderId, "failed")}
                                disabled={updatingOrder === orderId}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</p>
                      {order.status === "cancelled" ? (
                        <p className="text-red-600 text-sm font-medium">This order has been cancelled.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {order.status === "pending" && (
                            <button
                              onClick={() => updateOrderStatus(orderId, "confirmed")}
                              disabled={updatingOrder === orderId}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
                            >
                              Confirm Order
                            </button>
                          )}
                          {order.status === "confirmed" && (
                            <button
                              onClick={() => updateOrderStatus(orderId, "shipped")}
                              disabled={updatingOrder === orderId}
                              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
                            >
                              Mark as Shipped
                            </button>
                          )}
                          {order.status === "shipped" && (
                            <button
                              onClick={() => updateOrderStatus(orderId, "delivered")}
                              disabled={updatingOrder === orderId}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
                            >
                              Mark as Delivered
                            </button>
                          )}
                          {cancellable && (
                            <button
                              onClick={() => cancelOrderByFarmer(orderId)}
                              disabled={updatingOrder === orderId}
                              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
                            >
                              Cancel Order
                            </button>
                          )}
                          {updatingOrder === orderId && (
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              Updating...
                            </div>
                          )}
                        </div>
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

export default FarmerOrders;