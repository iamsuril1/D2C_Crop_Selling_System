import { useEffect, useState } from "react";
import api from "../api/axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // default tab
  const orderTabs = ["active", "pending", "received", "cancelled"];

  // Load all data
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [pRes, oRes, uRes] = await Promise.all([
        api.get("/api/admin/products"),
        api.get("/api/admin/orders"),
        api.get("/api/admin/users"),
      ]);

      setProducts(pRes.data);
      setOrders(oRes.data);
      setUsers(uRes.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Delete product
  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/api/products/${id}`);
      loadAdminData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete product");
    }
  };

  // Filter orders by tab
  const filteredOrders = orders.filter((o) => {
    switch (activeTab) {
      case "pending":
        return o.status === "pending";
      case "active":
        return ["confirmed", "shipped"].includes(o.status);
      case "received":
        return o.status === "delivered";
      case "cancelled":
        return o.status === "cancelled";
      default:
        return true;
    }
  });

  // Map status to CSS class
  const getOrderStatusClass = (status) => {
    if (status === "pending") return "order-pending";
    if (["confirmed", "shipped"].includes(status)) return "order-active";
    if (status === "delivered") return "order-received";
    if (status === "cancelled") return "order-cancelled";
    return "";
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-8">
      <h1 className="text-2xl font-bold text-center">Admin Dashboard</h1>

      {/* USERS */}
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b hover:bg-gray-50">
                  <td className="py-2">
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-4 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Products</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div
              key={p._id}
              className="border rounded-lg overflow-hidden bg-white shadow-sm"
            >
              {p.image && (
                <img
                  src={`${API_BASE_URL}${p.image}`}
                  alt={p.name}
                  className="h-40 w-full object-cover"
                />
              )}
              <div className="p-4 space-y-2">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-sm text-gray-600">{p.category}</p>
                <p className="font-medium">Rs. {p.price}</p>
                <p className="text-xs text-gray-500">
                  Farmer: {p.farmer?.firstName || "N/A"}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    className="flex-1 bg-blue-600 text-white py-1 rounded text-sm"
                    onClick={() => setSelectedProduct(p)}
                  >
                    View
                  </button>
                  <button
                    className="flex-1 bg-red-600 text-white py-1 rounded text-sm"
                    onClick={() => deleteProduct(p._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-gray-500 col-span-full">No products available.</p>
          )}
        </div>
      </section>

      {/* ORDER TABS */}
      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Orders</h2>

        {/* Tabs */}
        <div className="flex justify-center space-x-4 mb-4">
          {orderTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 rounded font-semibold ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 && (
          <p className="text-center text-gray-500">No orders in this category.</p>
        )}
        {filteredOrders.map((o) => (
          <div
            key={o._id}
            className={`order-status ${getOrderStatusClass(o.status)}`}
          >
            <p className="font-medium">Order #{o._id.slice(-6)}</p>
            <p className="text-sm">Status: {o.status}</p>
            <p className="text-xs text-gray-700">
              Product(s): {o.items.map((i) => i.name).join(", ")}
            </p>
            <p className="text-xs text-gray-700">
              Consumer: {o.consumer?.email}
            </p>
            {o.status === "cancelled" && (
              <p className="text-xs">Cancelled by: {o.cancelledBy}</p>
            )}
          </div>
        ))}
      </section>

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-500 font-bold text-xl"
              >
                ×
              </button>
            </div>
            {selectedProduct.image && (
              <img
                src={`${API_BASE_URL}${selectedProduct.image}`}
                alt={selectedProduct.name}
                className="w-full h-40 object-cover rounded mb-3"
              />
            )}
            <p>
              <strong>Category:</strong> {selectedProduct.category}
            </p>
            <p>
              <strong>Price:</strong> Rs. {selectedProduct.price}
            </p>
            <p>
              <strong>Quantity:</strong> {selectedProduct.quantity}{" "}
              {selectedProduct.unit}
            </p>
            <p>
              <strong>Description:</strong>{" "}
              {selectedProduct.description || "N/A"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
