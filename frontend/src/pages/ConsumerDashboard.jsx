import { useEffect, useState } from "react";
import { fetchMyOrders, cancelMyOrder } from "../api/orders";

const ConsumerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const { data } = await fetchMyOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const cancelOrder = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    await cancelMyOrder(id);
    loadOrders();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading orders...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <div className="bg-white p-6 rounded shadow">
          No orders found.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white p-6 rounded shadow"
            >
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-semibold">
                    Farmer: {order.farmer.firstName} {order.farmer.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    order.status === "delivered"
                      ? "bg-green-100 text-green-700"
                      : order.status === "cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {order.items.map((item, i) => (
                  <li key={i} className="text-sm">
                    {item.name} × {item.quantity} — Rs. {item.price}
                  </li>
                ))}
              </ul>

              <div className="flex justify-between items-center mt-4">
                <p className="font-bold">
                  Total: Rs. {order.totalAmount}
                </p>

                {order.status !== "delivered" &&
                  order.status !== "cancelled" && (
                    <button
                      onClick={() => cancelOrder(order._id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Cancel Order
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsumerDashboard;
