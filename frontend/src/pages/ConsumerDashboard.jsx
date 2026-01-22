import { useEffect, useMemo, useState, useContext } from "react";
import { useContext as useRouterContext } from "react"; // Not used but for completeness
import api from "../api/axios";
import { CartContext } from "../context/CartContext";
import { APIBASEURL } from "../utils/config";

// Normalize helper
const normalize = (v) => v?.toString().toLowerCase().trim();

const ConsumerDashboard = () => {
  const { addToCart, cartItems } = useContext(CartContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Products");
  const [sortBy, setSortBy] = useState("Featured");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  // Modal
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/api/products");
      setProducts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(
    () => [
      "All Products",
      "Vegetables",
      "Fruits",
      "Herbs",
      "Organic Only",
      "Local Farms",
    ],
    []
  );

  // Infer organic/local from text (no model flags)
  const isOrganic = (p) => {
    const hay = [
      p?.name,
      p?.description,
      p?.category,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes("organic");
  };

  const isLocalFarm = (p) => {
    const hay = [
      p?.description,
      p?.category,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes("local") || hay.includes("farm");
  };

  const filteredProducts = useMemo(() => {
    const q = normalize(query);
    let list = [...products].filter((p) => {
      const hay = [
        p?.name,
        p?.category,
        p?.farmer?.firstName,
        p?.farmer?.lastName,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || hay.includes(q);

      let matchesChip = true;
      if (["Vegetables", "Fruits", "Herbs"].includes(activeFilter)) {
        matchesChip =
          normalize(p?.category).includes(
            normalize(activeFilter)
          );
      } else if (activeFilter === "Organic Only") {
        matchesChip = isOrganic(p);
      } else if (activeFilter === "Local Farms") {
        matchesChip = isLocalFarm(p);
      }

      return matchesSearch && matchesChip;
    });

    // Sort
    if (sortBy === "Price Low to High")
      list.sort((a, b) => (a?.price || 0) - (b?.price || 0));
    if (sortBy === "Price High to Low")
      list.sort((a, b) => (b?.price || 0) - (a?.price || 0));
    if (sortBy === "Newest")
      list.sort(
        (a, b) =>
          new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
      );

    return list;
  }, [products, query, activeFilter, sortBy]);

  const cartCount = Array.isArray(cartItems) ? cartItems.length : 0;

  const handleAddToCart = (p) => {
    // CartContext expects item.id, so store id properly
    addToCart({
      id: p.id || p._id,
      name: p.name,
      price: p.price,
      unit: p.unit,
      quantity: 1,
      image: p.image,
      farmer: p.farmer,
    });
  };

  // ProductBadge (Organic/Local labels)
  const ProductBadge = ({ p }) => {
    const organic = isOrganic(p);
    const local = isLocalFarm(p);

    let label = "Fresh";
    let cls = "bg-sky-50 text-sky-700";

    if (organic) {
      label = "Organic";
      cls = "bg-emerald-50 text-emerald-700";
    } else if (local) {
      label = "Local Farm";
      cls = "bg-amber-50 text-amber-700";
    }

    return (
      <span className={`absolute left-3 top-3 px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>
        {label}
      </span>
    );
  };

  // ProductCard (Grid view)
  const ProductCard = ({ p }) => {
    const imgSrc = p?.image ? `${APIBASEURL}${p.image}` : "placeholder-product.jpg";
    const farmName = [p?.farmer?.firstName, p?.farmer?.lastName]
      .filter(Boolean)
      .join(" ") || "Farm";

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
        <div className="relative">
          <ProductBadge p={p} />
          <button
            type="button"
            onClick={() => setSelectedProduct(p)}
            className="w-full text-left"
            aria-label={`View ${p?.name}`}
          >
            <img
              src={imgSrc}
              alt={p?.name}
              className="h-48 w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "placeholder-product.jpg";
              }}
            />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <div>
            <h3 className="font-semibold text-gray-900 truncate">{p?.name}</h3>
            <p className="text-sm text-gray-500 truncate">{farmName}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-gray-900">
              Rs. {p?.price}
              <span className="text-sm font-medium text-gray-500"> /{p?.unit}</span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            {p?.quantity} {p?.unit}
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

  // ProductRow (List view)
  const ProductRow = ({ p }) => {
    const imgSrc = p?.image ? `${APIBASEURL}${p.image}` : "placeholder-product.jpg";
    const farmName = [p?.farmer?.firstName, p?.farmer?.lastName]
      .filter(Boolean)
      .join(" ") || "Farm";

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-center">
        <button
          type="button"
          onClick={() => setSelectedProduct(p)}
          className="shrink-0"
        >
          <img
            src={imgSrc}
            alt={p?.name}
            className="h-20 w-28 object-cover rounded-xl"
            onError={(e) => {
              e.currentTarget.src = "placeholder-product.jpg";
            }}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{p?.name}</h3>
            <span className="text-xs text-gray-500">{p?.category}</span>
          </div>

          <p className="text-sm text-gray-500 truncate">{farmName}</p>

          <p className="text-sm text-gray-600 line-clamp-1">
            {p?.description || "No description"}
          </p>
        </div>

        <div className="text-right space-y-2">
          <div className="text-lg font-bold text-gray-900">
            Rs. {p?.price}
            <span className="text-sm font-medium text-gray-500"> /{p?.unit}</span>
          </div>

          <button
            type="button"
            onClick={() => handleAddToCart(p)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition"
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  };

  // ✅ FULL FEATURED ProductModal - shows ALL product details
  const ProductModal = ({ p }) => {
    if (!p) return null;

    const imgSrc = p?.image ? `${APIBASEURL}${p.image}` : "placeholder-product.jpg";
    const farmName =
      [p?.farmer?.firstName, p?.farmer?.lastName]
        .filter(Boolean)
        .join(" ") || "Farm";

    const harvestDate = p.harvestDate
      ? new Date(p.harvestDate).toLocaleDateString("en-IN")
      : "Not specified";
    const expiryDate = p.expiresAt
      ? new Date(p.expiresAt).toLocaleDateString("en-IN")
      : "No expiry";

    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {p?.name}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="grid md:grid-cols-2 gap-0">
            <div className="bg-gray-50">
              <img
                src={imgSrc}
                alt={p?.name}
                className="w-full h-72 md:h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "placeholder-product.jpg";
                }}
              />
            </div>

            <div className="p-6 space-y-4">
              {/* Category & Farmer */}
              <div className="flex items-center justify-between">
                <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                  {p?.category}
                </span>
                <span className="text-sm text-gray-500">{farmName}</span>
              </div>

              {/* Price */}
              <div className="text-3xl font-extrabold text-gray-900">
                Rs. {p?.price}
                <span className="text-base font-semibold text-gray-500">
                  {" "} /{p?.unit}
                </span>
              </div>

              {/* Availability & Status */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Available</div>
                  <div className="font-semibold text-gray-900">
                    {p?.quantity} {p?.unit}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Status</div>
                  <div className="font-semibold text-gray-900">
                    {p?.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-gray-500">Harvest Date</div>
                  <div className="font-semibold text-gray-900">{harvestDate}</div>
                </div>

                <div className="bg-orange-50 rounded-xl p-3">
                  <div className="text-gray-500">Expires</div>
                  <div className="font-semibold text-gray-900">{expiryDate}</div>
                </div>
              </div>

              {/* Shelf Life */}
              {p?.shelfLife && (
                <div className="bg-green-50 rounded-xl p-3">
                  <div className="text-gray-500">Shelf Life</div>
                  <div className="font-semibold text-gray-900">
                    {p.shelfLife} days
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div className="font-semibold text-gray-900 mb-1">Description</div>
                <p className="text-gray-600 leading-relaxed">
                  {p?.description || "No description available."}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleAddToCart(p)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition"
                >
                  Add to Cart
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition"
                >
                  Close
                </button>
              </div>

              {/* Cart info */}
              <p className="text-xs text-gray-400">
                Cart items: {cartCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Loading products...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded-xl p-6 max-w-md w-full text-center">
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            type="button"
            onClick={loadProducts}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );

  return (
    <>
      <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Fresh Products
              </h1>
              <p className="text-gray-600 mt-1">
                Discover our selection of fresh produce from local farms
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
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
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2.5 text-sm ${
                  viewMode === "grid"
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600"
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-2.5 text-sm ${
                  viewMode === "list"
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600"
                }`}
              >
                List
              </button>
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

          {/* Products */}
          <div className="mt-8">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
                No products match your {query && "search/filter."}
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
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal p={selectedProduct} />
    </>
  );
};

export default ConsumerDashboard;
