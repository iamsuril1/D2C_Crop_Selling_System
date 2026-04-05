import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

const FarmerDashboard = () => {
  const navigate   = useNavigate();
  const { user }   = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", category: "", price: "", quantity: "", unit: "kg", description: "",
  });

  const [alertModal,   setAlertModal]   = useState({ isOpen: false, type: "", title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: "", title: "", message: "" });

  const showAlert = (title, message, type = "error") => {
    setAlertModal({ isOpen: true, title, message, type });
  };
  const closeAlert   = () => setAlertModal((p) => ({ ...p, isOpen: false }));
  const closeConfirm = () => setConfirmModal((p) => ({ ...p, isOpen: false, action: null }));

  const getPid = (p) => p?.id || p?._id;

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [pRes, oRes] = await Promise.all([
        api.get("/api/products/my-products"),
        api.get("/api/orders/farmer"),
      ]);
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
      setOrders(Array.isArray(oRes.data)   ? oRes.data   : []);
    } catch (err) {
      console.error("Failed to load dashboard", err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const activeOrders    = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  const startEdit = (product) => {
    const pid = getPid(product);
    if (!pid) { showAlert("Error", "Product id missing", "error"); return; }
    setEditingProduct(pid);
    setEditForm({
      name:        product.name        || "",
      category:    product.category    || "",
      price:       product.price       ?? "",
      quantity:    product.quantity    ?? "",
      unit:        product.unit        || "kg",
      description: product.description || "",
    });
  };

  const cancelEdit = () => setEditingProduct(null);

  const submitEdit = async (id) => {
    if (!id) { showAlert("Error", "Product id missing", "error"); return; }
    try {
      await api.put(`/api/products/${id}`, editForm);
      setEditingProduct(null);
      await loadDashboard();
    } catch (err) {
      showAlert("Update Failed", err.response?.data?.message || "Failed to update product", "error");
    }
  };

  const deleteProduct = (id) => {
    if (!id) { showAlert("Error", "Product id missing", "error"); return; }
    setConfirmModal({
      isOpen: true,
      type: "danger",
      title: "Delete Product",
      message: "Are you sure you want to delete this product? This action cannot be undone.",
      action: async () => {
        try {
          await api.delete(`/api/products/${id}`);
          await loadDashboard();
          showAlert("Success", "Product deleted successfully", "success");
        } catch (err) {
          showAlert("Delete Failed", err.response?.data?.message || "Failed to delete product", "error");
        }
      },
    });
  };

  // FIX: find the shipment that belongs to the currently logged-in farmer,
  // not just the first shipment. The old code used
  // `s.farmer?._id || s.farmer` which always returned the first truthy value.
  const getMyShipment = (order) => {
    const myId = user?._id?.toString() || user?.id?.toString();
    return order.shipments?.find((s) => {
      const farmerId = s.farmer?._id?.toString() || s.farmer?.toString();
      return farmerId === myId;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-600 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  // Separate active vs inactive for display
  const activeProducts   = products.filter((p) => p.isActive);
  const inactiveProducts = products.filter((p) => !p.isActive);

  return (
    <div className="min-h-screen bg-gray-50 px-8 py-6 space-y-6">

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
        confirmText="Confirm"
        cancelText="Cancel"
      />

      {/* Top bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500">Welcome back, {user?.firstName || "Farmer"}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/farmer/payment-settings")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Payment Settings
          </button>
          <button
            onClick={() => navigate("/add-product")}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Add Product
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">Active Products</p>
          <p className="text-2xl font-semibold">{activeProducts.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            {inactiveProducts.length > 0 ? `${inactiveProducts.length} disabled` : "All active"}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">Active Orders</p>
          <p className="text-2xl font-semibold">{activeOrders.length}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting completion</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">Delivered Orders</p>
          <p className="text-2xl font-semibold">{deliveredOrders.length}</p>
          <p className="text-xs text-gray-400 mt-1">Completed successfully</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs uppercase text-gray-500 mb-1">Inventory Items</p>
          <p className="text-2xl font-semibold">
            {activeProducts.reduce((sum, p) => sum + Number(p.quantity || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total active stock units</p>
        </div>
      </section>

      {/* Products + Orders */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              My Products
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({activeProducts.length} active{inactiveProducts.length > 0 ? `, ${inactiveProducts.length} disabled` : ""})
              </span>
            </h2>
          </div>

          {products.length === 0 ? (
            <p className="text-gray-500 text-sm">No products added yet. Click Add Product to create one.</p>
          ) : (
            <>
              <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((p) => {
                  const pid    = getPid(p);
                  const imgSrc = p.image ? `${APIBASEURL}${p.image}` : "";

                  return (
                    <div
                      key={pid || `${p.name}-${Math.random()}`}
                      className={`border rounded-lg p-3 flex flex-col gap-2 hover:shadow-sm transition ${
                        !p.isActive ? "opacity-60 border-gray-200 bg-gray-50" : "border-gray-100"
                      }`}
                    >
                      {/* Disabled badge */}
                      {!p.isActive && (
                        <span className="self-start text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          Disabled
                        </span>
                      )}

                      {p.image ? (
                        <img
                          src={imgSrc}
                          className="h-28 w-full object-cover rounded-md"
                          alt={p.name}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : null}

                      {editingProduct === pid ? (
                        <>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            className="border border-gray-200 rounded px-2 py-1 text-sm"
                            placeholder="Name"
                          />
                          <input
                            value={editForm.category}
                            onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                            className="border border-gray-200 rounded px-2 py-1 text-sm"
                            placeholder="Category"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                              className="border border-gray-200 rounded px-2 py-1 text-sm w-1/2"
                              placeholder="Price"
                            />
                            <input
                              type="number"
                              value={editForm.quantity}
                              onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                              className="border border-gray-200 rounded px-2 py-1 text-sm w-1/2"
                              placeholder="Qty"
                            />
                          </div>
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => submitEdit(pid)}
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
                              <h3 className="font-semibold text-sm text-gray-900">{p.name}</h3>
                              <p className="text-xs text-gray-500">{p.category}</p>
                            </div>
                            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              Rs. {p.price} / {p.unit}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            Qty: <span className="font-semibold text-green-700">{p.quantity}</span> {p.unit}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(p)}
                              className="flex-1 border border-yellow-400 text-yellow-700 text-xs font-medium px-2 py-1.5 rounded hover:bg-yellow-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteProduct(pid)}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-2 py-1.5 rounded"
                            >
                              {p.isActive ? "Disable" : "Disabled"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Orders side panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-900">Active Orders</h2>
              <span className="text-xs text-gray-500">{activeOrders.length} orders</span>
            </div>

            {activeOrders.length === 0 ? (
              <p className="text-xs text-gray-500">No active orders at the moment.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {activeOrders.map((o) => {
                  // FIX: use corrected shipment lookup
                  const myShipment = getMyShipment(o);

                  return (
                    <div key={o.id || o._id} className="border border-gray-100 rounded-lg px-3 py-2 text-xs">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-800">
                            Order #{(o.id || o._id)?.toString().slice(-6)}
                          </p>
                          <p className="text-gray-500 capitalize">Status: {o.status}</p>
                        </div>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
                          In progress
                        </span>
                      </div>

                      {myShipment && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-[11px] text-gray-600">
                            Payment: <span className="font-semibold capitalize">{myShipment.paymentMethod || "pending"}</span>
                          </p>
                          <p className="text-[11px] text-gray-600">
                            Status:{" "}
                            <span className={`font-semibold capitalize ${
                              myShipment.paymentStatus === "paid"   ? "text-green-600" :
                              myShipment.paymentStatus === "failed" ? "text-red-600"   : "text-yellow-600"
                            }`}>
                              {myShipment.paymentStatus || "pending"}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-900">Delivered Orders</h2>
              <span className="text-xs text-gray-500">{deliveredOrders.length} orders</span>
            </div>

            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-gray-500">No delivered orders yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {deliveredOrders.map((o) => (
                  <div
                    key={o.id || o._id}
                    className="border border-gray-100 rounded-lg px-3 py-2 text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        Order #{(o.id || o._id)?.toString().slice(-6)}
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