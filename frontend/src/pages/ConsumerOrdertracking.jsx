import { useEffect, useState } from "react";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import { useNavigate } from "react-router-dom";

const ConsumerOrderTracking = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [cancellingOrder, setCancellingOrder] = useState(null);

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

  const cancelOrder = async (orderId) => {
    if (!orderId || cancellingOrder) return;

    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      setCancellingOrder(orderId);
      await api.put(`/api/orders/${orderId}/cancel`);
      await loadOrders();
      alert("Order cancelled successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingOrder(null);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        message: "Order is being processed by farmer",
      },
      confirmed: {
        color: "bg-blue-100 text-blue-800 border-blue-300",
        message: "Order confirmed! Farmer is preparing your items",
      },
      shipped: {
        color: "bg-purple-100 text-purple-800 border-purple-300",
        message: "Your order is on the way!",
      },
      delivered: {
        color: "bg-green-100 text-green-800 border-green-300",
        message: "Order delivered successfully",
      },
      cancelled: {
        color: "bg-red-100 text-red-800 border-red-300",
        message: "Order was cancelled",
      },
    };
    return statusMap[status] || statusMap.pending;
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active") return !["delivered", "cancelled"].includes(o.status);
    return o.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">Track your orders and view delivery status</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
            <p className="text-sm text-gray-600">Total Orders</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length}
            </p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {orders.filter((o) => o.status === "delivered").length}
            </p>
            <p className="text-sm text-gray-600">Delivered</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {orders.filter((o) => o.status === "cancelled").length}
            </p>
            <p className="text-sm text-gray-600">Cancelled</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2 overflow-x-auto">
          {[
            { value: "all", label: "All Orders" },
            { value: "active", label: "Active" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === tab.value
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600 mb-6">
              {filter === "all"
                ? "You haven't placed any orders yet"
                : `No ${filter} orders at the moment`}
            </p>
            <button
              onClick={() => navigate("/consumer")}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const orderId = order._id || order.id;
              const orderDisplayId = orderId?.toString().slice(-6);
              const statusInfo = getStatusInfo(order.status);
              const canCancel = !["delivered", "cancelled"].includes(order.status);

              return (
                <div
                  key={orderId}
                  className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden hover:shadow-lg transition"
                >
                  {/* Order Header */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-5 border-b">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">
                            Order #{orderDisplayId}
                          </h3>
                          <span
                            className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 ${statusInfo.color}`}
                          >
                            {statusInfo.icon} {order.status?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-sm font-medium text-gray-700 mt-1">
                          {statusInfo.message}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                        <div className="text-3xl font-bold text-gray-900">
                          Rs. {order.totalAmount?.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Tracker */}
                  <div className="px-6 py-5 bg-gray-50 border-b">
                    <div className="relative">
                      <div className="flex justify-between mb-3">
                        {["pending", "confirmed", "shipped", "delivered"].map((step, idx) => {
                          const isActive =
                            ["pending", "confirmed", "shipped", "delivered"].indexOf(
                              order.status
                            ) >= idx;
                          const isCurrent = order.status === step;

                          return (
                            <div key={step} className="flex-1 text-center relative">
                              <div
                                className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold text-sm transition ${
                                  isActive
                                    ? "bg-green-600 text-white ring-4 ring-green-100"
                                    : "bg-gray-200 text-gray-500"
                                } ${isCurrent ? "ring-8 ring-green-200 scale-110" : ""}`}
                              >
                                {isActive ? "✓" : idx + 1}
                              </div>
                              <div
                                className={`text-xs mt-2 font-medium ${
                                  isActive ? "text-gray-900" : "text-gray-500"
                                }`}
                              >
                                {step.charAt(0).toUpperCase() + step.slice(1)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Progress Line */}
                      <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10">
                        <div
                          className="h-full bg-green-600 transition-all duration-500"
                          style={{
                            width: `${
                              (["pending", "confirmed", "shipped", "delivered"].indexOf(
                                order.status
                              ) /
                                3) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Shipments */}
                  <div className="px-6 py-5">
                    <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                      Order Details ({order.shipments?.length || 0} shipment
                      {(order.shipments?.length || 0) !== 1 ? "s" : ""})
                    </h4>

                    <div className="space-y-4">
                      {order.shipments?.map((shipment, idx) => {
                        const farmer = shipment.farmer;
                        const farmerName = farmer
                          ? `${farmer.firstName || ""} ${farmer.lastName || ""}`.trim()
                          : "Farmer";

                        return (
                          <div
                            key={idx}
                            className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-300 transition"
                          >
                            {/* Farmer Info */}
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                                {farmerName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{farmerName}</p>
                                <p className="text-sm text-gray-500">
                                  Shipment {idx + 1} of {order.shipments.length}
                                </p>
                              </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-2 mb-4">
                              {shipment.items?.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="flex justify-between items-center bg-gray-50 rounded-lg p-3"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-sm text-gray-500">
                                      Quantity: {item.quantity} × Rs. {item.price}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-gray-900">
                                    Rs. {(item.price * item.quantity).toFixed(0)}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* Payment Status */}
                            <div className="bg-blue-50 rounded-lg p-3 mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-900">
                                  Payment Method:
                                </span>
                                <span className="text-sm font-bold text-blue-900 capitalize">
                                  {shipment.paymentMethod || "Not selected"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-900">
                                  Payment Status:
                                </span>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${getPaymentStatusColor(
                                    shipment.paymentStatus
                                  )}`}
                                >
                                  {shipment.paymentStatus?.toUpperCase() || "PENDING"}
                                </span>
                              </div>
                            </div>

                            {/* Shipment Total */}
                            <div className="flex justify-between items-center pt-3 border-t">
                              <span className="text-gray-600">Shipment Total:</span>
                              <span className="text-xl font-bold text-gray-900">
                                Rs.{" "}
                                {(
                                  (shipment.subtotal || 0) + (shipment.deliveryFee || 0)
                                ).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="px-6 py-5 bg-gray-50 border-t">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-gray-700">
                        <span>Items Subtotal:</span>
                        <span>Rs. {order.itemsSubtotal?.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>Delivery Charges:</span>
                        <span>Rs. {order.deliveryTotal?.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                        <span>Total Amount:</span>
                        <span>Rs. {order.totalAmount?.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-4">
                      {canCancel && (
                        <button
                          onClick={() => cancelOrder(orderId)}
                          disabled={cancellingOrder === orderId}
                          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-4 py-2 rounded-lg transition"
                        >
                          {cancellingOrder === orderId ? "Cancelling..." : "Cancel Order"}
                        </button>
                      )}
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition">
                        Contact Farmer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsumerOrderTracking;