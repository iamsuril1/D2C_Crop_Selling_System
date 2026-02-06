import { useEffect, useState } from "react";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";

const FarmerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, confirmed, shipped, delivered
  const [error, setError] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/orders/farmer");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const getMyShipment = (order, farmerId) => {
    return order.shipments?.find(
      (s) => s.farmer?._id?.toString() === farmerId || s.farmer?.toString() === farmerId
    );
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!orderId || updatingOrder) return;

    if (!window.confirm(`Update order status to ${newStatus}?`)) return;

    try {
      setUpdatingOrder(orderId);
      await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
      await loadOrders();
      alert(`Order status updated to ${newStatus}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const verifyPayment = async (orderId, status) => {
    if (!orderId || updatingOrder) return;

    const action = status === "paid" ? "verify" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this payment?`)) return;

    try {
      setUpdatingOrder(orderId);
      await api.put("/api/payments/verify", { orderId, status });
      await loadOrders();
      alert(`Payment ${status === "paid" ? "verified" : "rejected"} successfully`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to verify payment");
    } finally {
      setUpdatingOrder(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "shipped":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
          <p className="text-gray-600">Manage your orders, verify payments, and update delivery status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500 mb-1">Pending Orders</p>
            <p className="text-3xl font-bold text-gray-900">
              {orders.filter((o) => o.status === "pending").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 mb-1">Confirmed</p>
            <p className="text-3xl font-bold text-gray-900">
              {orders.filter((o) => o.status === "confirmed").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
            <p className="text-sm text-gray-500 mb-1">Shipped</p>
            <p className="text-3xl font-bold text-gray-900">
              {orders.filter((o) => o.status === "shipped").length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
            <p className="text-sm text-gray-500 mb-1">Delivered</p>
            <p className="text-3xl font-bold text-gray-900">
              {orders.filter((o) => o.status === "delivered").length}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-2 mb-6 flex gap-2 overflow-x-auto">
          {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                filter === status
                  ? "bg-green-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === "all" && ` (${orders.length})`}
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
            <p className="text-gray-600">
              {filter === "all"
                ? "You haven't received any orders yet"
                : `No ${filter} orders at the moment`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const orderId = order._id || order.id;
              const orderDisplayId = orderId?.toString().slice(-6);
              
              // Find this farmer's shipment in the order
              const myShipment = order.shipments?.find(
                (s) => s.farmer?._id || s.farmer
              );

              const consumer = order.consumer;
              const consumerName = consumer
                ? `${consumer.firstName || ""} ${consumer.lastName || ""}`.trim()
                : "Customer";

              return (
                <div
                  key={orderId}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md transition overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          Order #{orderDisplayId}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Customer: <span className="font-medium">{consumerName}</span>
                        {consumer?.email && (
                          <span className="ml-2 text-gray-500">({consumer.email})</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Placed: {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total Amount</div>
                      <div className="text-2xl font-bold text-gray-900">
                        Rs. {order.totalAmount?.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-6">
                    {myShipment && (
                      <>
                        {/* Items */}
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-900 mb-3">Order Items:</h4>
                          <div className="space-y-2">
                            {myShipment.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">{item.name}</p>
                                  <p className="text-sm text-gray-500">
                                    Quantity: {item.quantity}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">
                                    Rs. {item.price} each
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Total: Rs. {(item.price * item.quantity).toFixed(0)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Shipment Total */}
                          <div className="mt-3 pt-3 border-t flex justify-between items-center">
                            <span className="text-gray-600">Subtotal + Delivery:</span>
                            <span className="text-lg font-bold text-gray-900">
                              Rs. {((myShipment.subtotal || 0) + (myShipment.deliveryFee || 0)).toFixed(0)}
                            </span>
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            💳 Payment Information
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-blue-700">Method:</span>
                              <span className="ml-2 font-semibold text-blue-900 capitalize">
                                {myShipment.paymentMethod || "Not selected"}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-700">Status:</span>
                              <span
                                className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(
                                  myShipment.paymentStatus
                                )}`}
                              >
                                {myShipment.paymentStatus?.toUpperCase() || "PENDING"}
                              </span>
                            </div>

                            {myShipment.transactionId && (
                              <div className="md:col-span-2">
                                <span className="text-blue-700">Transaction ID:</span>
                                <span className="ml-2 font-semibold text-blue-900">
                                  {myShipment.transactionId}
                                </span>
                              </div>
                            )}

                            {myShipment.paymentDate && (
                              <div className="md:col-span-2">
                                <span className="text-blue-700">Payment Date:</span>
                                <span className="ml-2 font-medium text-blue-900">
                                  {new Date(myShipment.paymentDate).toLocaleString()}
                                </span>
                              </div>
                            )}

                            {myShipment.paymentProof && (
                              <div className="md:col-span-2">
                                <span className="text-blue-700 block mb-2">Payment Proof:</span>
                                <a
                                  href={`${APIBASEURL}${myShipment.paymentProof}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                >
                                  <img
                                    src={`${APIBASEURL}${myShipment.paymentProof}`}
                                    alt="Payment proof"
                                    className="max-w-xs rounded-lg border-2 border-blue-300 hover:border-blue-500 transition cursor-pointer"
                                  />
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Payment Verification Buttons */}
                          {myShipment.paymentStatus === "pending" &&
                            myShipment.paymentMethod !== "cash_on_delivery" && (
                              <div className="mt-4 pt-4 border-t border-blue-200 flex gap-3">
                                <button
                                  onClick={() => verifyPayment(orderId, "paid")}
                                  disabled={updatingOrder === orderId}
                                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-4 py-2 rounded-lg transition"
                                >
                                  ✓ Verify Payment
                                </button>
                                <button
                                  onClick={() => verifyPayment(orderId, "failed")}
                                  disabled={updatingOrder === orderId}
                                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-4 py-2 rounded-lg transition"
                                >
                                  ✗ Reject Payment
                                </button>
                              </div>
                            )}
                        </div>

                        {/* Order Status Actions */}
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Update Order Status:</h4>
                          
                          {order.status === "cancelled" ? (
                            <div className="text-red-600 font-medium">
                              This order has been cancelled
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {order.status === "pending" && (
                                <button
                                  onClick={() => updateOrderStatus(orderId, "confirmed")}
                                  disabled={updatingOrder === orderId}
                                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2 rounded-lg transition"
                                >
                                  ✓ Confirm Order
                                </button>
                              )}

                              {order.status === "confirmed" && (
                                <button
                                  onClick={() => updateOrderStatus(orderId, "shipped")}
                                  disabled={updatingOrder === orderId}
                                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold px-6 py-2 rounded-lg transition"
                                >
                                  📦 Mark as Shipped
                                </button>
                              )}

                              {order.status === "shipped" && (
                                <button
                                  onClick={() => updateOrderStatus(orderId, "delivered")}
                                  disabled={updatingOrder === orderId}
                                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-6 py-2 rounded-lg transition"
                                >
                                  ✓ Mark as Delivered
                                </button>
                              )}

                              {updatingOrder === orderId && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                                  <span>Updating...</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Status Timeline */}
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-gray-500 mb-2">Order Progress:</p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`flex-1 h-2 rounded-full ${
                                  ["pending", "confirmed", "shipped", "delivered"].includes(
                                    order.status
                                  )
                                    ? "bg-green-500"
                                    : "bg-gray-200"
                                }`}
                              ></div>
                              <div
                                className={`flex-1 h-2 rounded-full ${
                                  ["confirmed", "shipped", "delivered"].includes(order.status)
                                    ? "bg-green-500"
                                    : "bg-gray-200"
                                }`}
                              ></div>
                              <div
                                className={`flex-1 h-2 rounded-full ${
                                  ["shipped", "delivered"].includes(order.status)
                                    ? "bg-green-500"
                                    : "bg-gray-200"
                                }`}
                              ></div>
                              <div
                                className={`flex-1 h-2 rounded-full ${
                                  order.status === "delivered" ? "bg-green-500" : "bg-gray-200"
                                }`}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Pending</span>
                              <span>Confirmed</span>
                              <span>Shipped</span>
                              <span>Delivered</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
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

export default FarmerOrders;