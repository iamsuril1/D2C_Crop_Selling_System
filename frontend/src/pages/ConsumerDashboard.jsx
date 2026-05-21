import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { CartContext } from "../context/CartContext";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";

/* ── helpers ── */
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

const isOrganic   = (p) => [p?.name, p?.description, p?.category].join(" ").toLowerCase().includes("organic");
const isLocalFarm = (p) => [p?.description, p?.category].join(" ").toLowerCase().match(/local|farm/);

const CATEGORIES = ["Vegetables", "Fruits", "Grains", "Herbs", "Dairy"];
const SORT_OPTIONS = [
  { value: "featured",   label: "Featured"           },
  { value: "newest",     label: "Newest first"       },
  { value: "price_asc",  label: "Price: low → high"  },
  { value: "price_desc", label: "Price: high → low"  },
  { value: "name_asc",   label: "Name: A → Z"        },
];

const DEFAULT_FILTERS = {
  categories: [],
  sort:       "featured",
};

/* ── Filter Panel ── */
const FilterPanel = ({ filters, onChange, onReset, productCount }) => {
  const set = (key, val) => onChange({ ...filters, [key]: val });
  const toggleCat = (cat) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    set("categories", next);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="font-bold text-gray-900 text-sm">Filters</span>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-green-600 hover:text-green-700 font-semibold hover:underline transition"
        >
          Reset all
        </button>
      </div>

      <div className="p-5 space-y-6">

        {/* Sort */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Sort by</p>
          <div className="space-y-1.5">
            {SORT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2 transition ${
                  filters.sort === opt.value ? "bg-green-50" : "hover:bg-gray-50"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                  filters.sort === opt.value ? "border-green-500 bg-green-500" : "border-gray-300"
                }`}>
                  {filters.sort === opt.value && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="radio"
                  name="sort"
                  value={opt.value}
                  checked={filters.sort === opt.value}
                  onChange={() => set("sort", opt.value)}
                  className="sr-only"
                />
                <span className={`text-sm ${filters.sort === opt.value ? "font-semibold text-green-800" : "text-gray-600"}`}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100" />

        {/* Categories */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = filters.categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition ${
                    active
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result count */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
          <p className="text-sm font-bold text-gray-900">{productCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">products match</p>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ── */
const ConsumerDashboard = () => {
  const { addToCart, cartItems } = useContext(CartContext);
  const navigate = useNavigate();

  const [products,    setProducts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [productMode, setProductMode] = useState("all");
  const [coords,      setCoords]      = useState(null);

  /* search */
  const [query, setQuery] = useState("");

  /* filter panel */
  const [showFilters, setShowFilters] = useState(false);
  const [filters,     setFilters]     = useState(DEFAULT_FILTERS);

  /* view */
  const [viewMode, setViewMode] = useState("grid");

  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: "", message: "", type: "info",
  });
  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((prev) => ({ ...prev, isOpen: false }));

  /* ── count active filters ── */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length)   count += filters.categories.length;
    if (filters.sort !== "featured") count += 1;
    return count;
  }, [filters]);

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
      showAlert("Failed to Load Products", err.response?.data?.message || err.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts("all"); }, []);

  /* ── filtered + sorted products ── */
  const filteredProducts = useMemo(() => {
    const q = normalize(query);

    return products
      .filter((p) => {
        /* search */
        if (q) {
          const hay = [p?.name, p?.category, p?.farmer?.firstName, p?.farmer?.lastName, p?.description].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }

        /* categories */
        if (filters.categories.length > 0) {
          if (!filters.categories.some((c) => normalize(p?.category) === normalize(c))) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "price_asc":  return (a?.price || 0) - (b?.price || 0);
          case "price_desc": return (b?.price || 0) - (a?.price || 0);
          case "newest":     return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
          case "name_asc":   return (a?.name || "").localeCompare(b?.name || "");
          default:           return 0;
        }
      });
  }, [products, query, filters]);

  const cartCount = Array.isArray(cartItems) ? cartItems.length : 0;

  const handleAddToCart = (p) => {
    addToCart({
      id:        p.id || p._id,
      name:      p.name,
      price:     p.price,
      bulkPrice: p.bulkPrice ?? null,
      unit:      p.unit,
      image:     p.image,
      farmer:    p.farmer,
    });
  };

  const openProduct = (p) => {
    const id = p?.id || p?._id;
    if (!id) return;
    navigate(`/product/${id}`);
  };

  /* ── Badge helper ── */
  const ProductBadge = ({ p }) => {
    const organic = isOrganic(p);
    const local   = isLocalFarm(p);
    let label = "Fresh", cls = "bg-sky-50 text-sky-700 border border-sky-200";
    if (organic)    { label = "Organic";    cls = "bg-emerald-50 text-emerald-700 border border-emerald-200"; }
    else if (local) { label = "Local Farm"; cls = "bg-amber-50 text-amber-700 border border-amber-200";    }
    return (
      <span className={`absolute left-3 top-3 px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide ${cls}`}>
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
    const inStock  = Number(p?.quantity || 0) > 0;

    return (
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <div className="relative overflow-hidden">
          <ProductBadge p={p} />
          {!inStock && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <span className="bg-gray-800/80 text-white text-xs font-bold px-3 py-1 rounded-full">Out of stock</span>
            </div>
          )}
          <button type="button" onClick={() => openProduct(p)} className="w-full text-left block">
            <img
              src={imgSrc} alt={p?.name}
              className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
            />
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          <div>
            <h3 className="font-bold text-gray-900 truncate leading-snug">{p?.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{farmName}</p>
          </div>

          {/* Prices */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-lg font-extrabold text-gray-900">
              Rs.{p?.price}
              <span className="text-xs font-medium text-gray-400 ml-0.5">/{p?.unit}</span>
            </div>
            {hasBulk && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Bulk Rs.{p.bulkPrice} (–{saving}%)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{p?.quantity} {p?.unit} available</span>
            {p?.category && (
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{p.category}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleAddToCart(p)}
            disabled={!inStock}
            className={`w-full font-bold py-2.5 rounded-xl text-sm transition ${
              inStock
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {inStock ? "Add to Cart" : "Unavailable"}
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
    const inStock  = Number(p?.quantity || 0) > 0;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-center hover:shadow-md transition-shadow">
        <button type="button" onClick={() => openProduct(p)} className="shrink-0">
          <img
            src={imgSrc} alt={p?.name}
            className="h-20 w-28 object-cover rounded-xl"
            onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate">{p?.name}</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{p?.category}</span>
          </div>
          <p className="text-xs text-gray-400 truncate">{farmName}</p>
          <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">{p?.description || "No description"}</p>
        </div>

        <div className="text-right space-y-1.5 flex-shrink-0">
          <div className="text-lg font-extrabold text-gray-900">
            Rs.{p?.price}
            <span className="text-xs font-medium text-gray-400 ml-0.5">/{p?.unit}</span>
          </div>
          {hasBulk && (
            <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Bulk –{saving}%
            </div>
          )}
          <button
            type="button"
            onClick={() => handleAddToCart(p)}
            disabled={!inStock}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition ${
              inStock
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {inStock ? "Add to Cart" : "Unavailable"}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-green-600 rounded-full animate-spin" style={{ borderWidth: 3 }} />
          <p className="text-sm text-gray-500 font-medium">Loading fresh products…</p>
        </div>
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

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Fresh Products</h1>
            <p className="text-gray-500 mt-1 text-sm">Discover fresh produce from local farms</p>
          </div>
          {/* All / Nearby toggle */}
          <div className="flex gap-2">
            {[{ mode: "all", label: "All products" }, { mode: "nearby", label: "📍 Near me" }].map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setProductMode(mode); loadProducts(mode); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${
                  productMode === mode
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-green-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search + Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">

          {/* Search input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, category, or farmer…"
              className="w-full bg-white border-2 border-gray-200 focus:border-green-500 rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none transition shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-2.5 px-5 py-3 rounded-2xl border-2 font-semibold text-sm transition shadow-sm flex-shrink-0 ${
              showFilters || activeFilterCount > 0
                ? "bg-green-600 border-green-600 text-white"
                : "bg-white border-gray-200 text-gray-700 hover:border-green-400"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                showFilters ? "bg-white text-green-700" : "bg-green-600 text-white"
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* View mode */}
          <div className="flex bg-white border-2 border-gray-200 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
            {[
              { mode: "grid", icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
                </svg>
              )},
              { mode: "list", icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )},
            ].map(({ mode, icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-2.5 transition ${
                  viewMode === mode ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Active filter chips ── */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {filters.categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, categories: f.categories.filter((c) => c !== cat) }))}
                className="flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-green-200 transition"
              >
                {cat}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
            {filters.sort !== "featured" && (
              <button type="button" onClick={() => setFilters((f) => ({ ...f, sort: "featured" }))}
                className="flex items-center gap-1.5 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-blue-200 transition">
                Sort: {SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.priceMin && (
              <button type="button" onClick={() => setFilters((f) => ({ ...f, priceMin: "" }))}
                className="flex items-center gap-1.5 bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-purple-200 transition">
                Min Rs.{filters.priceMin}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.priceMax && (
              <button type="button" onClick={() => setFilters((f) => ({ ...f, priceMax: "" }))}
                className="flex items-center gap-1.5 bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-purple-200 transition">
                Max Rs.{filters.priceMax}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.inStockOnly && (
              <button type="button" onClick={() => setFilters((f) => ({ ...f, inStockOnly: false }))}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-gray-200 transition">
                In stock
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.organicOnly && (
              <button type="button" onClick={() => setFilters((f) => ({ ...f, organicOnly: false }))}
                className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-emerald-200 transition">
                🌱 Organic
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.bulkOnly && (
              <button type="button" onClick={() => setFilters((f) => ({ ...f, bulkOnly: false }))}
                className="flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-amber-200 transition">
                🏭 Bulk price
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline px-1 py-1.5 transition"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Main layout: sidebar + products ── */}
        <div className="flex gap-6 items-start">

          {/* Filter sidebar */}
          {showFilters && (
            <div className="w-64 flex-shrink-0 sticky top-24">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onReset={() => setFilters(DEFAULT_FILTERS)}
                productCount={filteredProducts.length}
              />
            </div>
          )}

          {/* Products area */}
          <div className="flex-1 min-w-0">

            {/* Result summary */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{filteredProducts.length}</span> products
                {query && (
                  <span> for <span className="font-semibold text-green-700">"{query}"</span></span>
                )}
              </p>
              {(query || activeFilterCount > 0) && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setFilters(DEFAULT_FILTERS); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline transition"
                >
                  Show all
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">No products found</h3>
                <p className="text-sm text-gray-500 mb-5">
                  {query
                    ? `No results for "${query}". Try a different search.`
                    : "No products match your current filters."}
                </p>
                <button
                  type="button"
                  onClick={() => { setQuery(""); setFilters(DEFAULT_FILTERS); }}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition"
                >
                  Clear filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              <div className={`grid gap-5 ${
                showFilters
                  ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}>
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id || p._id} p={p} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((p) => (
                  <ProductRow key={p.id || p._id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ConsumerDashboard; 