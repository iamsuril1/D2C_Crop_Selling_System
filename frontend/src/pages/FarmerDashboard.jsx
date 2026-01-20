import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { API_BASE_URL } from "../utils/config";

const FarmerDashboard = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    unit: "kg",
    description: "",
  });

  const loadDashboard = async () => {
    try {
      const [pRes, oRes] = await Promise.all([
        api.get("/api/products/my-products"),
        api.get("/api/orders/farmer"),
      ]);
      setProducts(pRes.data);
      setOrders(oRes.data);
    } catch (err) {
      console.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeOrders = orders.filter((o) => o.status !== "delivered");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  const startEdit = (product) => {
    setEditingProduct(product._id);
    setEditForm({
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: product.quantity,
      unit: product.unit,
      description: product.description,
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
  };

  const submitEdit = async (id) => {
    try {
      await api.put(`/api/products/${id}`, editForm);
      setEditingProduct(null);
      loadDashboard();
    } catch (err) {
      alert("Failed to update product");
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      await api.delete(`/api/products/${id}`);
      loadDashboard();
    } catch (err) {
      alert("Failed to delete product");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-600 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500">Welcome back, Farmer</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/add-product")}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">Total Products</p>
          <p className="text-2xl font-semibold">{products.length}</p>
          <p className="text-xs text-gray-400 mt-1">Currently listed</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">Active Orders</p>
          <p className="text-2xl font-semibold">{activeOrders.length}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting completion</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">
            Delivered Orders
          </p>
          <p className="text-2xl font-semibold">{deliveredOrders.length}</p>
          <p className="text-xs text-gray-400 mt-1">Completed successfully</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">
            Inventory Items
          </p>
          <p className="text-2xl font-semibold">
            {products.reduce((sum, p) => sum + Number(p.quantity || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total stock units</p>
        </div>
      </section>

      {/* Products and orders layout */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products list */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              My Products
            </h2>
          </div>

          {products.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No products added yet. Click "Add Product" to create one.
            </p>
          ) : (
            <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p._id}
                  className="border border-gray-100 rounded-lg p-3 flex flex-col gap-2 hover:shadow-sm transition"
                >
                  {p.image && (
                    <img
                      src={`${API_BASE_URL}${p.image}`}
                      className="h-28 w-full object-cover rounded-md"
                      alt={p.name}
                    />
                  )}

                  {editingProduct === p._id ? (
                    <>
                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="border border-gray-200 rounded px-2 py-1 text-sm"
                        placeholder="Name"
                      />
                      <input
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            category: e.target.value,
                          })
                        }
                        className="border border-gray-200 rounded px-2 py-1 text-sm"
                        placeholder="Category"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              price: e.target.value,
                            })
                          }
                          className="border border-gray-200 rounded px-2 py-1 text-sm w-1/2"
                          placeholder="Price"
                        />
                        <input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              quantity: e.target.value,
                            })
                          }
                          className="border border-gray-200 rounded px-2 py-1 text-sm w-1/2"
                          placeholder="Qty"
                        />
                      </div>

                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => submitEdit(p._id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-2 py-1.5 rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1.5 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900">
                            {p.name}
                          </h3>
                          <p className="text-xs text-gray-500">{p.category}</p>
                        </div>
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          ₹{p.price} / {p.unit}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600">
                        Qty:{" "}
                        <span className="font-semibold text-green-700">
                          {p.quantity}
                        </span>{" "}
                        {p.unit}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="flex-1 border border-yellow-400 text-yellow-700 text-xs font-medium px-2 py-1.5 rounded hover:bg-yellow-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteProduct(p._id)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-2 py-1.5 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders side panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Active Orders
              </h2>
              <span className="text-xs text-gray-500">
                {activeOrders.length} orders
              </span>
            </div>

            {activeOrders.length === 0 ? (
              <p className="text-xs text-gray-500">
                No active orders at the moment.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {activeOrders.map((o) => (
                  <div
                    key={o._id}
                    className="border border-gray-100 rounded-lg px-3 py-2 text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        Order #{o._id.slice(-6)}
                      </p>
                      <p className="text-gray-500 capitalize">
                        Status: {o.status}
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
                      In progress
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Delivered Orders
              </h2>
              <span className="text-xs text-gray-500">
                {deliveredOrders.length} orders
              </span>
            </div>

            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-gray-500">No delivered orders yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {deliveredOrders.map((o) => (
                  <div
                    key={o._id}
                    className="border border-gray-100 rounded-lg px-3 py-2 text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        Order #{o._id.slice(-6)}
                      </p>
                      <p className="text-gray-500">Status: Delivered</p>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded-full bg-green-50 text-green-700">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FarmerDashboard;
