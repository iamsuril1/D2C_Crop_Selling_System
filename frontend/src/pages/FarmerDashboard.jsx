import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const FarmerDashboard = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state
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

  const activeOrders = orders.filter(o => o.status !== "delivered");
  const deliveredOrders = orders.filter(o => o.status === "delivered");

  /* ---------------- PRODUCT ACTIONS ---------------- */

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
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Farmer Dashboard</h1>
        <button
          onClick={() => navigate("/add-product")}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          + Add Product
        </button>
      </div>

      {/* PRODUCTS */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">My Products</h2>

        {products.length === 0 ? (
          <p className="text-gray-500">No products added.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p._id} className="border rounded p-4 space-y-2">
                {p.image && (
                  <img
                    src={`http://localhost:5000${p.image}`}
                    className="h-32 w-full object-cover rounded"
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
                      className="border p-1 w-full"
                    />
                    <input
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                      className="border p-1 w-full"
                    />
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: e.target.value })
                      }
                      className="border p-1 w-full"
                    />
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) =>
                        setEditForm({ ...editForm, quantity: e.target.value })
                      }
                      className="border p-1 w-full"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() => submitEdit(p._id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-400 px-3 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm">{p.category}</p>
                    <p className="text-sm">
                      Rs. {p.price} / {p.unit}
                    </p>
                    <p className="text-sm text-green-600">
                      Qty: {p.quantity}
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(p)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProduct(p._id)}
                        className="bg-red-600 text-white px-3 py-1 rounded"
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

      {/* ORDERS */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="font-semibold mb-3">Active Orders</h2>
          {activeOrders.map((o) => (
            <div key={o._id} className="border p-3 mb-2 rounded">
              <p>Order #{o._id.slice(-6)}</p>
              <p>Status: {o.status}</p>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="font-semibold mb-3">Delivered Orders</h2>
          {deliveredOrders.map((o) => (
            <div key={o._id} className="border p-3 mb-2 rounded">
              <p>Order #{o._id.slice(-6)}</p>
              <p>Status: Delivered</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;
