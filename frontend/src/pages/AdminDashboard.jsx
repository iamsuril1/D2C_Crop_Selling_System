import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  const orderTabs = ["active", "pending", "received", "cancelled"];

  const loadAdminData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product permanently?")) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch {
      alert("Failed to delete product");
    }
  };

  /* -------------------- CHART DATA -------------------- */

  const consumerCount = users.filter(
    (u) => u.role === "consumer"
  ).length;
  const farmerCount = users.filter(
    (u) => u.role === "farmer"
  ).length;

  const userPieData = [
    { name: "Consumers", value: consumerCount },
    { name: "Farmers", value: farmerCount },
  ];

  const deliveredOrders = orders.filter(
    (o) => o.status === "delivered"
  ).length;
  const cancelledOrders = orders.filter(
    (o) => o.status === "cancelled"
  ).length;

  const orderBarData = [
    { status: "Delivered", count: deliveredOrders },
    { status: "Cancelled", count: cancelledOrders },
  ];

  const COLORS = ["#16a34a", "#2563eb"];

  /* -------------------- FILTER ORDERS -------------------- */

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "pending") return o.status === "pending";
    if (activeTab === "active")
      return ["confirmed", "shipped"].includes(o.status);
    if (activeTab === "received") return o.status === "delivered";
    if (activeTab === "cancelled") return o.status === "cancelled";
    return true;
  });

  const statusBadge = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    shipped: "bg-green-100 text-green-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-10">

      {/* ================= ANALYTICS ================= */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Analytics</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* USER PIE */}
          <div className="h-80">
            <h3 className="text-sm font-medium text-gray-600 mb-4">
              User Distribution
            </h3>

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userPieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {userPieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* ORDER BAR */}
          <div className="h-80">
            <h3 className="text-sm font-medium text-gray-600 mb-4">
              Delivered vs Cancelled Orders
            </h3>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderBarData}>
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ================= USERS ================= */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.role}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="3" className="py-6 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================= PRODUCTS ================= */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Products</h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div key={p._id} className="border rounded-xl overflow-hidden">
              {p.image && (
                <img
                  src={`${API_BASE_URL}${p.image}`}
                  alt={p.name}
                  className="h-44 w-full object-cover"
                />
              )}

              <div className="p-4 space-y-2">
                <h3 className="font-semibold truncate">{p.name}</h3>
                <p className="text-xs text-gray-500">{p.category}</p>

                <div className="flex justify-between">
                  <span className="font-semibold text-green-700">
                    Rs. {p.price}
                  </span>
                  <span className="text-xs text-gray-400">
                    {p.farmer?.firstName || "N/A"}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedProduct(p)}
                    className="flex-1 bg-green-600 text-white py-1 rounded"
                  >
                    View
                  </button>
                  <button
                    onClick={() => deleteProduct(p._id)}
                    className="flex-1 bg-red-500 text-white py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= ORDERS ================= */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Orders</h2>

        <div className="flex gap-3 mb-6">
          {orderTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm ${
                activeTab === tab
                  ? "bg-green-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredOrders.map((o) => (
            <div key={o._id} className="border rounded-lg p-4 flex justify-between">
              <div>
                <p className="font-medium">Order #{o._id.slice(-6)}</p>
                <p className="text-xs text-gray-500">
                  {(o.items || []).map((i) => i.name).join(", ")}
                </p>
                <p className="text-xs text-gray-400">
                  {o.consumer?.email}
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  statusBadge[o.status]
                }`}
              >
                {o.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
