/* src/pages/ConsumerDashboard.jsx
   Fix: handleAddToCart now passes bulkPrice so Orders.jsx can
   show the correct bulk price toggle on each cart row.
*/

import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { CartContext } from "../context/CartContext";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";

const normalize = (v) => v?.toString().toLowerCase().trim();

const extractProducts = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  return [];
};

const getCoords = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });

const ConsumerDashboard = () => {
  const { addToCart, cartItems } = useContext(CartContext);
  const navigate = useNavigate();

  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [productMode,  setProductMode]  = useState("all");
  const [coords,       setCoords]       = useState(null);
  const [query,        setQuery]        = useState("");
  const [activeFilter, setActiveFilter] = useState("All Products");
  const [sortBy,       setSortBy]       = useState("Featured");
  const [viewMode,     setViewMode]     = useState("grid");

  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: "", message: "", type: "info",
  });
  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((prev) => ({ ...prev, isOpen: false }));

  const loadProducts = async (mode = "all") => {
    try {
      setLoading(true);
      if (mode === "nearby") {
        let c;
        try {
          c = coords || (await getCoords());
          setCoords(c);
        } catch (geoErr) {
          if      (geoErr?.code === 1) showAlert("Location Permission Denied", "Please allow location access to view nearby products.", "warning");
          else if (geoErr?.code === 2) showAlert("Location Unavailable", "Your location could not be determined. Please try again.", "warning");
          else if (geoErr?.code === 3) showAlert("Location Timeout", "The location request timed out. Please try again.", "warning");
          else                         showAlert("Location Error", geoErr?.message || "Failed to get your location.", "error");
          setLoading(false);
          return;
        }
        const res = await api.get("/api/products", {
          params: { lat: c.lat, lng: c.lng, maxDistance: 5000, limit: 50 },
        });
        setProducts(extractProducts(res.data));
        return;
      }
      const res = await api.get("/api/products", { params: { limit: 50 } });
      setProducts(extractProducts(res.data));
    } catch (err) {
      showAlert(
        "Failed to Load Products",
        err.response?.data?.message || err.message || "Something went wrong.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts("all"); }, []);

  const categories = useMemo(() => [
    "All Products", "Vegetables", "Fruits", "Herbs", "Organic Only", "Local Farms",
  ], []);

  const isOrganic   = (p) => [p?.name, p?.description, p?.category].join(" ").toLowerCase().includes("organic");
  const isLocalFarm = (p) => [p?.description, p?.category].join(" ").toLowerCase().match(/local|farm/);

  const filteredProducts = useMemo(() => {
    const q = normalize(query);
    let list = [...products].filter((p) => {
      const hay = [p?.name, p?.category, p?.farmer?.firstName, p?.farmer?.lastName].join(" ").toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      let matchesChip = true;
      if      (["Vegetables","Fruits","Herbs"].includes(activeFilter)) matchesChip = normalize(p?.category).includes(normalize(activeFilter));
      else if (activeFilter === "Organic Only") matchesChip = isOrganic(p);
      else if (activeFilter === "Local Farms")  matchesChip = isLocalFarm(p);
      return matchesSearch && matchesChip;
    });
    if (sortBy === "Price Low to High") list.sort((a, b) => (a?.price || 0) - (b?.price || 0));
    if (sortBy === "Price High to Low") list.sort((a, b) => (b?.price || 0) - (a?.price || 0));
    if (sortBy === "Newest")            list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    return list;
  }, [products, query, activeFilter, sortBy]);

  const cartCount = Array.isArray(cartItems) ? cartItems.length : 0;

  /* ─────────────────────────────────────────────────────────────
     FIX: pass bulkPrice so the cart row can show the bulk toggle
  ───────────────────────────────────────────────────────────── */
  const handleAddToCart = (p) => {
    addToCart({
      id:        p.id || p._id,
      name:      p.name,
      price:     p.price,
      bulkPrice: p.bulkPrice ?? null,   // ← FIX
      unit:      p.unit,
      image:     p.image,
      farmer:    p.farmer,
      // quantity intentionally omitted → defaults to NORMAL_MIN_KG (20) in CartContext
    });
  };

  const openProduct = (p) => {
    const id = p?.id || p?._id;
    if (!id) return;
    navigate(`/product/${id}`);
  };

  /* ── Badge ── */
  const ProductBadge = ({ p }) => {
    const organic = isOrganic(p);
    const local   = isLocalFarm(p);
    let label = "Fresh", cls = "bg-sky-50 text-sky-700";
    if (organic)    { label = "Organic";    cls = "bg-emerald-50 text-emerald-700"; }
    else if (local) { label = "Local Farm"; cls = "bg-amber-50 text-amber-700";    }
    return (
      <span className={`absolute left-3 top-3 px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>
        {label}
      </span>
    );
  };

  /* ── Grid card ── */
  const ProductCard = ({ p }) => {
    const imgSrc   = p?.image ? `${APIBASEURL}${p.image}` : "/placeholder-product.jpg";
    const farmName = [p?.farmer?.firstName, p?.farmer?.lastName].filter(Boolean).join(" ") || "Farm";
    const hasBulk  = p?.bulkPrice && Number(p.bulkPrice) > 0;
    const saving   = hasBulk ? Math.round((1 - Number(p.bulkPrice) / Number(p.price)) * 100) : null;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
        <div className="relative">
          <ProductBadge p={p} />
          <button type="button" onClick={() => openProduct(p)} className="w-full text-left">
            <img
              src={imgSrc} alt={p?.name}
              className="h-48 w-full object-cover"
              onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
            />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <div>
            <h3 className="font-semibold text-gray-900 truncate">{p?.name}</h3>
            <p className="text-sm text-gray-500 truncate">{farmName}</p>
          </div>

          {/* Prices */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-lg font-bold text-gray-900">
              Rs. {p?.price}
              <span className="text-sm font-medium text-gray-500"> /{p?.unit}</span>
            </div>
            {hasBulk && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Bulk Rs. {p.bulkPrice} (-{saving}%)
              </span>
            )}
          </div>

          <div className="text-sm text-gray-500">
            {p?.quantity} {p?.unit} available
          </div>

          <button
            type="button"
            onClick={() => handleAddToCart(p)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition"
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  };

  /* ── List row ── */
  const ProductRow = ({ p }) => {
    const imgSrc   = p?.image ? `${APIBASEURL}${p.image}` : "/placeholder-product.jpg";
    const farmName = [p?.farmer?.firstName, p?.farmer?.lastName].filter(Boolean).join(" ") || "Farm";
    const hasBulk  = p?.bulkPrice && Number(p.bulkPrice) > 0;
    const saving   = hasBulk ? Math.round((1 - Number(p.bulkPrice) / Number(p.price)) * 100) : null;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-center">
        <button type="button" onClick={() => openProduct(p)} className="shrink-0">
          <img
            src={imgSrc} alt={p?.name}
            className="h-20 w-28 object-cover rounded-xl"
            onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{p?.name}</h3>
            <span className="text-xs text-gray-500">{p?.category}</span>
          </div>
          <p className="text-sm text-gray-500 truncate">{farmName}</p>
          <p className="text-sm text-gray-600 line-clamp-1">{p?.description || "No description"}</p>
        </div>

        <div className="text-right space-y-1 flex-shrink-0">
          <div className="text-lg font-bold text-gray-900">
            Rs. {p?.price}
            <span className="text-sm font-medium text-gray-500"> /{p?.unit}</span>
          </div>
          {hasBulk && (
            <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Bulk Rs. {p.bulkPrice} (-{saving}%)
            </div>
          )}
          <button
            type="button"
            onClick={() => handleAddToCart(p)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition text-sm"
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Loading products...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText="OK"
      />

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Fresh Products</h1>
            <p className="text-gray-600 mt-1">Discover fresh produce from local farms</p>
          </div>
        </div>

        {/* All / Nearby toggle */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[
            { mode: "all",    label: "All"    },
            { mode: "nearby", label: "Nearby" },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setProductMode(mode); loadProducts(mode); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                productMode === mode
                  ? "bg-green-100 border-green-200 text-green-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search + Sort + View */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center mt-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full sm:w-72 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option>Featured</option>
              <option>Newest</option>
              <option>Price Low to High</option>
              <option>Price High to Low</option>
            </select>
          </div>
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
            {[
              { mode: "grid", label: "Grid" },
              { mode: "list", label: "List" },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2.5 text-sm ${viewMode === mode ? "bg-green-50 text-green-700" : "text-gray-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-3 mt-6">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveFilter(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                activeFilter === c
                  ? "bg-green-100 border-green-200 text-green-700"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product grid / list */}
        <div className="mt-8">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
              No products match your search or filter.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id || p._id} p={p} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((p) => (
                <ProductRow key={p.id || p._id} p={p} />
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-6">Cart items: {cartCount}</p>
      </div>
    </div>
  );
};

export default ConsumerDashboard;