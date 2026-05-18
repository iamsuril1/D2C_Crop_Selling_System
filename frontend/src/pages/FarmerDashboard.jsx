import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { APIBASEURL } from "../utils/config";
import AlertModal   from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

const FarmerDashboard = () => {
  const navigate   = useNavigate();
  const { user }   = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", category: "", price: "", bulkPrice: "", quantity: "", unit: "kg", description: "",
  });
  const [editPriceError, setEditPriceError] = useState("");

  const [alertModal,   setAlertModal]   = useState({ isOpen: false, type: "", title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: "", title: "", message: "" });

  const showAlert  = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
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

  /* ── Edit helpers ── */
  const startEdit = (product) => {
    const pid = getPid(product);
    if (!pid) { showAlert("Error", "Product id missing", "error"); return; }
    setEditingProduct(pid);
    setEditPriceError("");
    setEditForm({
      name:        product.name        || "",
      category:    product.category    || "",
      price:       product.price       ?? "",
      bulkPrice:   product.bulkPrice   ?? "",
      quantity:    product.quantity    ?? "",
      unit:        product.unit        || "kg",
      description: product.description || "",
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditPriceError("");
  };

  const validateEditPrices = () => {
    const reg  = Number(editForm.price);
    const bulk = editForm.bulkPrice !== "" ? Number(editForm.bulkPrice) : null;
    if (!reg || reg <= 0) return "Regular price must be a positive number";
    if (bulk !== null && bulk <= 0) return "Bulk price must be a positive number";
    if (bulk !== null && bulk >= reg)
      return `Bulk price (Rs. ${bulk}) must be less than regular price (Rs. ${reg})`;
    return "";
  };

  const submitEdit = async (id) => {
    if (!id) { showAlert("Error", "Product id missing", "error"); return; }
    const err = validateEditPrices();
    if (err) { setEditPriceError(err); return; }
    setEditPriceError("");
    try {
      const payload = {
        name:      editForm.name,
        category:  editForm.category,
        price:     Number(editForm.price),
        bulkPrice: editForm.bulkPrice !== "" ? Number(editForm.bulkPrice) : "",
        quantity:  Number(editForm.quantity),
        unit:      editForm.unit,
        description: editForm.description,
      };
      await api.put(`/api/products/${id}`, payload);
      setEditingProduct(null);
      setEditPriceError("");
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
          showAlert("Success", "Product disabled successfully", "success");
        } catch (err) {
          showAlert("Delete Failed", err.response?.data?.message || "Failed to delete product", "error");
        }
      },
    });
  };

  /* ── Payment label ── */
  const getMyShipment = (order) => {
    const myId = user?._id?.toString() || user?.id?.toString();
    return order.shipments?.find((s) => {
      const farmerId = s.farmer?._id?.toString() || s.farmer?.toString();
      return farmerId === myId;
    });
  };

  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case "paid":                  return { text: "Paid",          color: "text-green-600" };
      case "pending_admin_release": return { text: "Held by admin", color: "text-blue-600"  };
      case "failed":                return { text: "Failed",        color: "text-red-600"   };
      default:                      return { text: "Pending",       color: "text-yellow-600" };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-600 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  const activeProducts   = products.filter((p) => p.isActive);
  const inactiveProducts = products.filter((p) => !p.isActive);

  /* ── Bulk discount saving pct ── */
  const bulkSavingPct = () => {
    const reg  = Number(editForm.price);
    const bulk = Number(editForm.bulkPrice);
    if (!reg || !bulk || bulk >= reg) return null;
    return Math.round((1 - bulk / reg) * 100);
  };

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
          <p className="text-xs uppercase text-gray-500 mb-1">Inventory Units</p>
          <p className="text-2xl font-semibold">
            {activeProducts.reduce((sum, p) => sum + Number(p.quantity || 0), 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total active stock</p>
        </div>
      </section>

      {/* Products + Orders */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Products ── */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              My Products
              <span className="ml-2 text-xs text-gray-400 font-normal">
                ({activeProducts.length} active
                {inactiveProducts.length > 0 ? `, ${inactiveProducts.length} disabled` : ""})
              </span>
            </h2>
          </div>

          {products.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No products yet. Click "Add Product" to create one.
            </p>
          ) : (
            <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((p) => {
                const pid    = getPid(p);
                const imgSrc = p.image ? `${APIBASEURL}${p.image}` : "";
                const saving = p.bulkPrice && p.price
                  ? Math.round((1 - Number(p.bulkPrice) / Number(p.price)) * 100)
                  : null;

                return (
                  <div
                    key={pid || `${p.name}-${Math.random()}`}
                    className={`border rounded-xl p-3 flex flex-col gap-2 hover:shadow-sm transition ${
                      !p.isActive ? "opacity-60 border-gray-200 bg-gray-50" : "border-gray-100"
                    }`}
                  >
                    {!p.isActive && (
                      <span className="self-start text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        Disabled
                      </span>
                    )}

                    {p.image && (
                      <img
                        src={imgSrc}
                        className="h-28 w-full object-cover rounded-lg"
                        alt={p.name}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}

                    {editingProduct === pid ? (
                      /* ── EDIT FORM ── */
                      <div className="space-y-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="Product name"
                        />
                        <input
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                          placeholder="Category"
                        />

                        {/* ── Price fields ── */}
                        <div className="bg-gray-50 rounded-lg p-2.5 space-y-2 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pricing</p>

                          {/* Regular price */}
                          <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">
                              Regular price (Rs./{editForm.unit || "kg"}) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rs.</span>
                              <input
                                type="number"
                                value={editForm.price}
                                onChange={(e) => {
                                  setEditForm((f) => ({ ...f, price: e.target.value }));
                                  setEditPriceError("");
                                }}
                                className="w-full border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-sm"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Applied for Normal orders (20–99 {editForm.unit || "kg"})
                            </p>
                          </div>

                          {/* Bulk price */}
                          <div>
                            <label className="text-xs text-gray-500 mb-0.5 block">
                              Bulk price (Rs./{editForm.unit || "kg"}) — 100+ {editForm.unit || "kg"}
                              <span className="ml-1 text-gray-400">(optional)</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Rs.</span>
                              <input
                                type="number"
                                value={editForm.bulkPrice}
                                onChange={(e) => {
                                  setEditForm((f) => ({ ...f, bulkPrice: e.target.value }));
                                  setEditPriceError("");
                                }}
                                className="w-full border border-gray-200 rounded-lg pl-7 pr-2 py-1.5 text-sm"
                                placeholder="Leave empty for no bulk discount"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Must be lower than regular price
                            </p>
                          </div>

                          {/* Live discount preview */}
                          {bulkSavingPct() !== null && (
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              <span className="text-xs text-amber-800 font-semibold">
                                🏭 Bulk discount: {bulkSavingPct()}% off
                              </span>
                              <span className="text-xs text-gray-500">
                                (Rs. {Number(editForm.price).toFixed(0)} → Rs. {Number(editForm.bulkPrice).toFixed(0)})
                              </span>
                            </div>
                          )}

                          {/* Price validation error */}
                          {editPriceError && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                              ⚠ {editPriceError}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-0.5 block">Quantity</label>
                            <input
                              type="number"
                              value={editForm.quantity}
                              onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-0.5 block">Unit</label>
                            <select
                              value={editForm.unit}
                              onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                            >
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="piece">piece</option>
                              <option value="dozen">dozen</option>
                              <option value="liter">liter</option>
                              <option value="ml">ml</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => submitEdit(pid)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2 py-2 rounded-lg transition"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold px-2 py-2 rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── DISPLAY ── */
                      <>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-sm text-gray-900">{p.name}</h3>
                            <p className="text-xs text-gray-500">{p.category}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full block">
                              Rs. {p.price} / {p.unit}
                            </span>
                            {p.bulkPrice && Number(p.bulkPrice) > 0 && (
                              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-1 block">
                                Bulk Rs. {p.bulkPrice}
                                {saving ? ` (-${saving}%)` : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-gray-600">
                          Stock: <span className="font-semibold text-green-700">{p.quantity}</span> {p.unit}
                        </p>

                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => startEdit(p)}
                            className="flex-1 border border-yellow-400 text-yellow-700 text-xs font-medium px-2 py-1.5 rounded-lg hover:bg-yellow-50 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteProduct(pid)}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-2 py-1.5 rounded-lg transition"
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
          )}
        </div>

        {/* ── Orders side panel ── */}
        <div className="space-y-4">

          {/* Active orders */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-900">Active Orders</h2>
              <span className="text-xs text-gray-500">{activeOrders.length}</span>
            </div>

            {activeOrders.length === 0 ? (
              <p className="text-xs text-gray-500">No active orders at the moment.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {activeOrders.map((o) => {
                  const myShipment   = getMyShipment(o);
                  const paymentLabel = myShipment ? getPaymentStatusLabel(myShipment.paymentStatus) : null;

                  return (
                    <div key={o.id || o._id} className="border border-gray-100 rounded-lg px-3 py-2 text-xs">
                      <div className="flex justify-between items-start mb-1">
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
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                          <p className="text-[11px] text-gray-600">
                            Method: <span className="font-semibold capitalize">{myShipment.paymentMethod || "pending"}</span>
                          </p>
                          <p className="text-[11px] text-gray-600">
                            Payment: <span className={`font-semibold ${paymentLabel?.color}`}>{paymentLabel?.text}</span>
                          </p>
                          {myShipment.paymentStatus === "pending_admin_release" && (
                            <div className="mt-1 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 text-[11px] text-blue-700">
                              ⏳ Funds held — releasing soon
                            </div>
                          )}
                          {myShipment.paymentStatus === "paid" && (
                            <div className="mt-1 bg-green-50 border border-green-100 rounded-lg px-2 py-1 text-[11px] text-green-700">
                              ✓ Rs. {myShipment.subtotal} released
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delivered orders */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-semibold text-gray-900">Delivered Orders</h2>
              <span className="text-xs text-gray-500">{deliveredOrders.length}</span>
            </div>

            {deliveredOrders.length === 0 ? (
              <p className="text-xs text-gray-500">No delivered orders yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {deliveredOrders.map((o) => {
                  const myShipment   = getMyShipment(o);
                  const paymentLabel = myShipment ? getPaymentStatusLabel(myShipment.paymentStatus) : null;
                  return (
                    <div key={o.id || o._id} className="border border-gray-100 rounded-lg px-3 py-2 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <p className="font-medium text-gray-800">
                            Order #{(o.id || o._id)?.toString().slice(-6)}
                          </p>
                          <p className="text-gray-500">Delivered</p>
                        </div>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-green-50 text-green-700">
                          Completed
                        </span>
                      </div>
                      {paymentLabel && (
                        <p className="text-[11px] text-gray-600 mt-1">
                          Payment: <span className={`font-semibold ${paymentLabel.color}`}>{paymentLabel.text}</span>
                        </p>
                      )}
                      {myShipment?.paymentStatus === "pending_admin_release" && (
                        <div className="mt-1 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 text-[11px] text-blue-700">
                          ⏳ Pending release
                        </div>
                      )}
                      {myShipment?.paymentStatus === "paid" && (
                        <div className="mt-1 bg-green-50 border border-green-100 rounded-lg px-2 py-1 text-[11px] text-green-700">
                          ✓ Rs. {myShipment.subtotal} released
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
};

export default FarmerDashboard;