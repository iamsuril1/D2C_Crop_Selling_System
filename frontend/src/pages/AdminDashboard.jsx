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
import { APIBASEURL } from "../utils/config";

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const orderTabs = ["active", "pending", "received", "cancelled"];

  // ✅ robust product id getter
  const getPid = (p) => p?.id || p?._id;

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, oRes, uRes] = await Promise.all([
        api.get("/api/admin/products"),
        api.get("/api/admin/orders"),
        api.get("/api/admin/users"),
      ]);

      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setOrders(Array.isArray(oRes.data) ? oRes.data : []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
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
    const pid = id;
    if (!pid) {
      alert("Product id missing");
      return;
    }

    if (!window.confirm("Delete this product permanently?")) return;

    try {
      await api.delete(`/api/admin/products/${pid}`);
      setProducts((prev) => prev.filter((p) => getPid(p) !== pid));
      loadAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete product");
    }
  };

  // CHART DATA
  const consumerCount = users.filter((u) => u.role === "consumer").length;
  const farmerCount = users.filter((u) => u.role === "farmer").length;
  const userPieData = [
    { name: "Consumers", value: consumerCount },
    { name: "Farmers", value: farmerCount },
  ];

  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
  const orderBarData = [
    { status: "Delivered", count: deliveredOrders },
    { status: "Cancelled", count: cancelledOrders },
  ];

  const COLORS = ["#16a34a", "#2563eb"];

  // FILTER ORDERS
  const filteredOrders = orders.filter((o) => {
    if (activeTab === "pending") return o.status === "pending";
    if (activeTab === "active") return ["confirmed", "shipped"].includes(o.status);
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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading dashboard...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );

  // SEARCH FILTER
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8 space-y-10">
      {/* ANALYTICS */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Analytics</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-80">
            <h3 className="text-sm font-medium text-gray-600 mb-4">User Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userPieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label
                >
                  {userPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="h-80">
            <h3 className="text-sm font-medium text-gray-600 mb-4">
              Delivered vs Cancelled Orders
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderBarData}>
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* USERS */}
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
                <tr key={u.id || u._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.role}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PRODUCTS WITH SEARCH */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-6">Products</h2>

        {/* SEARCH INPUT */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-1E9C17 focus:border-transparent"
          />
        </div>

        <h3 className="text-lg font-medium mb-4">
          Showing {filteredProducts.length} of {products.length} products
        </h3>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const pid = getPid(p);
            const imgSrc = p.image ? `${APIBASEURL}${p.image}` : "";

            return (
              <div
                key={pid || `${p.name}-${Math.random()}`}
                className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {p.image ? (
                  <img
                    src={imgSrc}
                    alt={p.name}
                    className="h-44 w-full object-cover"
                    onError={(e) => {
                      e.target.src = "placeholder.jpg";
                    }}
                  />
                ) : null}

                <div className="p-4 space-y-2">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.category}</p>

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-700">
                      Rs. {p.price} / {p.unit}
                    </span>
                    <span className="text-xs text-gray-400">
                      {p.farmer?.firstName || "N/A"}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 bg-green-600 text-white py-1 rounded text-xs hover:bg-green-700">
                      View
                    </button>

                    <button
                      onClick={() => deleteProduct(pid)}
                      className="flex-1 bg-red-500 text-white py-1 rounded text-xs hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              {search ? "No products match your search" : "No products found"}
            </div>
          )}
        </div>
      </section>

      {/* ORDERS */}
      <section className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Orders</h2>

        <div className="flex gap-3 mb-6 flex-wrap">
          {orderTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredOrders.map((o) => {
            const oid = o.id || o._id;

            return (
              <div
                key={oid}
                className="border rounded-lg p-4 flex flex-col md:flex-row md:justify-between md:items-center hover:shadow-sm transition-shadow"
              >
                <div className="mb-2 md:mb-0">
                  <p className="font-medium text-sm">
                    Order {oid?.toString().slice(-6)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {o.items.map((i) => i.name).join(", ")}
                  </p>
                  <p className="text-xs text-gray-400">{o.consumer?.email}</p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge[o.status]}`}
                >
                  {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                </span>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No orders in this status
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
