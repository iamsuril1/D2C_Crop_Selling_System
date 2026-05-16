import { useEffect, useState, useContext } from "react";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";
import { AuthContext } from "../context/AuthContext";

const FarmerOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("all");
  const [updatingOrder,setUpdatingOrder]= useState(null);
  const [expandedOrder,setExpandedOrder]= useState(null);

  const [alertModal,   setAlertModal]   = useState({ isOpen: false, type: "", title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: "", title: "", message: "", confirmText: "" });

  const showAlert  = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert   = () => setAlertModal((p) => ({ ...p, isOpen: false }));
  const closeConfirm = () => setConfirmModal((p) => ({ ...p, isOpen: false, action: null }));

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

  // Find the shipment that belongs to the logged-in farmer
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

  // Payment status label + colour
  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case "paid":
        return { text: "Paid",           color: "text-green-600",  bg: "bg-green-100 text-green-800"  };
      case "pending_admin_release":
        return { text: "Held by admin",  color: "text-blue-600",   bg: "bg-blue-100 text-blue-800"    };
      case "failed":
        return { text: "Failed",         color: "text-red-600",    bg: "bg-red-100 text-red-800"      };
      case "pending":
      default:
        return { text: "Pending",        color: "text-yellow-600", bg: "bg-yellow-100 text-yellow-800" };
    }
  };

  const filteredOrders = orders.filter((o) =>
    filter === "all" ? true : o.status === filter
  );

  const getStatusDot = (status) => {
    const map = {
      pending:   "bg-yellow-400",
      confirmed: "bg-blue-500",
      shipped:   "bg-purple-500",
      delivered: "bg-green-500",
      cancelled: "bg-red-400",
    };
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

  const statusSteps    = ["pending", "confirmed", "shipped", "delivered"];
  const canFarmerCancel = (status) => ["pending", "confirmed"].includes(status);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">

      <AlertModal
        isOpen={alertModal.isOpen}  onClose={closeAlert}
        type={alertModal.type}      title={alertModal.title}
        message={alertModal.message} confirmText="OK"
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen} onClose={closeConfirm}
        onConfirm={confirmModal.action}
        type={confirmModal.type}     title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText}
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
            { label: "Pending",   value: orders.filter((o) => o.status === "pending").length,   color: "text-yellow-600", border: "border-l-yellow-400" },
            { label: "Confirmed", value: orders.filter((o) => o.status === "confirmed").length, color: "text-blue-600",   border: "border-l-blue-500"   },
            { label: "Shipped",   value: orders.filter((o) => o.status === "shipped").length,   color: "text-purple-600", border: "border-l-purple-500"  },
            { label: "Delivered", value: orders.filter((o) => o.status === "delivered").length, color: "text-green-600",  border: "border-l-green-500"   },
          ].map((s) => (
            <div key={s.label} className={`bg-white rounded-xl shadow-sm p-3 text-center border border-gray-100 border-l-4 ${s.border}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="bg-white rounded-xl shadow-sm p-1.5 mb-6 flex gap-1 overflow-x-auto border border-gray-100">
          {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => (
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
            <p className="text-gray-500 text-sm">
              {filter === "all" ? "No orders received yet" : `No ${filter} orders`}
            </p>
          </div>
        ) : (
          <>
            {/* Order cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {filteredOrders.map((order) => {
                const orderId        = order._id || order.id;
                const orderDisplayId = orderId?.toString().slice(-6);
                const isSelected     = expandedOrder === orderId;
                const myShipment     = getMyShipment(order);
                const consumer       = order.consumer;
                const consumerName   = consumer
                  ? `${consumer.firstName || ""} ${consumer.lastName || ""}`.trim()
                  : "Customer";
                const cancellable    = canFarmerCancel(order.status);

                // Show a dot if payment is held by admin (needs attention)
                const paymentHeld = myShipment?.paymentStatus === "pending_admin_release";

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
                          {paymentHeld && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Pay Held
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-900">#{orderDisplayId}</div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">{consumerName}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short",
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-base font-bold text-gray-900">
                          Rs.{order.totalAmount?.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {myShipment?.items?.length || 0} item
                          {(myShipment?.items?.length || 0) !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>

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

            {/* Expanded detail panel */}
            {expandedOrder && (() => {
              const order = filteredOrders.find(
                (o) => (o._id || o.id) === expandedOrder
              );
              if (!order) return null;

              const orderId      = order._id || order.id;
              const myShipment   = getMyShipment(order);
              const consumer     = order.consumer;
              const consumerName = consumer
                ? `${consumer.firstName || ""} ${consumer.lastName || ""}`.trim()
                : "Customer";
              const stepIndex    = statusSteps.indexOf(order.status);
              const cancellable  = canFarmerCancel(order.status);
              const payLabel     = myShipment
                ? getPaymentStatusLabel(myShipment.paymentStatus)
                : null;

              return (
                <div className="bg-white rounded-2xl border-2 border-green-500 shadow-xl overflow-hidden mt-2">

                  {/* Header */}
                  <div className="bg-gray-50 px-6 py-5 border-b flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          Order #{orderId?.toString().slice(-6)}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(order.status)}`}>
                          {order.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Customer:{" "}
                        <span className="font-medium text-gray-700">{consumerName}</span>
                        {consumer?.email && (
                          <span className="ml-1 text-gray-400">({consumer.email})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Order Total</div>
                        <div className="text-2xl font-bold text-gray-900">
                          Rs. {order.totalAmount?.toFixed(0)}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedOrder(null)}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition"
                      >
                        X
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {order.status !== "cancelled" && (
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        {statusSteps.map((s) => (
                          <span
                            key={s}
                            className={`capitalize font-medium ${
                              statusSteps.indexOf(order.status) >= statusSteps.indexOf(s)
                                ? "text-gray-800"
                                : ""
                            }`}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all duration-500"
                          style={{
                            width: `${Math.max(5, (stepIndex / (statusSteps.length - 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-6 space-y-4">

                    {/* Items */}
                    {myShipment && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Order Items
                        </p>
                        <div className="space-y-1.5">
                          {myShipment.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2.5 text-sm"
                            >
                              <div>
                                <span className="font-medium text-gray-900">{item.name}</span>
                                <span className="text-gray-400 text-xs ml-2">
                                  x{item.quantity} · Rs.{item.price} each
                                </span>
                              </div>
                              <span className="font-semibold text-gray-900">
                                Rs. {(item.price * item.quantity).toFixed(0)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-sm font-semibold text-gray-700 mt-2 pt-2 border-t border-gray-100">
                          <span>Subtotal + Delivery</span>
                          <span>
                            Rs. {((myShipment.subtotal || 0) + (myShipment.deliveryFee || 0)).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ── Payment info — NO verify/reject buttons ── */}
                    {myShipment && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
                          Payment Info
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-xs text-gray-500">Method</span>
                            <p className="font-semibold text-gray-900 capitalize">
                              {myShipment.paymentMethod || "Not selected"}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Status</span>
                            <p>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${payLabel?.bg}`}>
                                {payLabel?.text?.toUpperCase() || "PENDING"}
                              </span>
                            </p>
                          </div>
                          {myShipment.transactionId && (
                            <div className="col-span-2">
                              <span className="text-xs text-gray-500">Transaction ID</span>
                              <p className="font-semibold text-gray-900 text-sm">
                                {myShipment.transactionId}
                              </p>
                            </div>
                          )}
                          {myShipment.paymentDate && (
                            <div className="col-span-2">
                              <span className="text-xs text-gray-500">Payment Date</span>
                              <p className="font-medium text-gray-800 text-sm">
                                {new Date(myShipment.paymentDate).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Payment proof image (view only) */}
                        {myShipment.paymentProof && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Payment Proof</p>
                            <a
                              href={`${APIBASEURL}${myShipment.paymentProof}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={`${APIBASEURL}${myShipment.paymentProof}`}
                                alt="Payment proof"
                                className="max-w-xs rounded-lg border-2 border-blue-300 hover:border-blue-500 transition cursor-pointer"
                              />
                            </a>
                          </div>
                        )}

                        {/* ── Status messages (replaces verify/reject buttons) ── */}
                        {myShipment.paymentStatus === "pending_admin_release" && (
                          <div className="bg-blue-100 border border-blue-300 rounded-xl px-4 py-3 text-sm text-blue-800 text-center">
                            ⏳ Payment received by platform — admin will release{" "}
                            <span className="font-bold">Rs. {myShipment.subtotal}</span>{" "}
                            to your account shortly
                          </div>
                        )}

                        {myShipment.paymentStatus === "paid" && (
                          <div className="bg-green-100 border border-green-300 rounded-xl px-4 py-3 text-sm text-green-800 text-center">
                            ✓ <span className="font-bold">Rs. {myShipment.subtotal}</span> has been
                            released to your account
                          </div>
                        )}

                        {myShipment.paymentStatus === "pending" && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 text-center">
                            ⏳ Awaiting payment from consumer
                          </div>
                        )}

                        {myShipment.paymentStatus === "failed" && (
                          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 text-center">
                            ✗ Payment failed or rejected
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Order actions ── */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Actions
                      </p>
                      {order.status === "cancelled" ? (
                        <p className="text-red-600 text-sm font-medium">
                          This order has been cancelled.
                        </p>
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
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
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