import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import { CartContext } from "../context/CartContext";
import { NORMAL_MIN_KG } from "../utils/orderConstants";
import AlertModal from "../components/AlertModal";

const PLATFORM_CHARGE = 25;

const fmtDate = (v) => {
  if (!v) return "Not specified";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Not specified";
  return d.toLocaleDateString("en-IN");
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const [p,       setP]       = useState(null);
  const [qty,     setQty]     = useState(NORMAL_MIN_KG);
  const [rawQty,  setRawQty]  = useState(String(NORMAL_MIN_KG));
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });
  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((prev) => ({ ...prev, isOpen: false }));

  const imgSrc   = p?.image ? `${APIBASEURL}${p.image}` : "/placeholder-product.jpg";
  const farmName = [p?.farmer?.firstName, p?.farmer?.lastName].filter(Boolean).join(" ") || "Farm";
  const hasBulk  = p?.bulkPrice && Number(p.bulkPrice) > 0;
  const saving   = hasBulk ? Math.round((1 - Number(p.bulkPrice) / Number(p.price)) * 100) : null;

  const subtotal = useMemo(() => Number(p?.price || 0) * qty, [p?.price, qty]);
  const total    = subtotal + PLATFORM_CHARGE;

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/products/${id}`);
      setP(data);
      const currentId = data?.id || data?._id;
      const relRes    = await api.get("/api/products?limit=60");
      const list      = Array.isArray(relRes.data) ? relRes.data : (relRes.data?.products || []);
      const pool      = list.filter((x) => (x?.id || x?._id) !== currentId);
      setRelated(shuffle(pool).slice(0, 4));
    } catch (err) {
      showAlert("Failed to Load Product", err.response?.data?.message || "Failed to load product.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleQtyChange = (e) => {
    const raw = e.target.value;
    setRawQty(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1) setQty(parsed);
  };

  const handleQtyBlur = () => {
    const parsed  = parseInt(rawQty, 10);
    const clamped = isNaN(parsed) || parsed < 1 ? NORMAL_MIN_KG : parsed;
    setQty(clamped);
    setRawQty(String(clamped));
  };

  const decrement = () => {
    const next = Math.max(NORMAL_MIN_KG, qty - 1);
    setQty(next); setRawQty(String(next));
  };
  const increment = () => {
    const next = qty + 1;
    setQty(next); setRawQty(String(next));
  };

  const handleAdd = () => {
    if (!p) return;
    addToCart({
      id:        p.id || p._id,
      name:      p.name,
      price:     p.price,
      bulkPrice: p.bulkPrice ?? null,
      unit:      p.unit,
      quantity:  qty,
      image:     p.image,
      farmer:    p.farmer,
    });
    showAlert(
      "Added to Cart",
      `${qty} ${p.unit} of ${p.name} added to your cart.`,
      "success"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <AlertModal
          isOpen={alertModal.isOpen} onClose={closeAlert}
          type={alertModal.type}     title={alertModal.title}
          message={alertModal.message} confirmText="Retry"
          onConfirm={load}
        />
        <div className="bg-white border rounded-xl p-6 w-full max-w-md text-center">
          <p className="text-gray-600">Product not found.</p>
          <button type="button" onClick={load}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-xl">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const availableQty = Number(p?.quantity || 0);
  const inStock      = availableQty > 0;
  const harvestDate  = fmtDate(p?.harvestDate);
  const expiryDate   = p?.expiresAt ? fmtDate(p.expiresAt) : "No expiry";
  const updatedAt    = fmtDate(p?.updatedAt);

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-4 md:px-8 py-4 sm:py-8">

      <AlertModal
        isOpen={alertModal.isOpen} onClose={closeAlert}
        type={alertModal.type}     title={alertModal.title}
        message={alertModal.message} confirmText="OK"
      />

      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">

        {/* Breadcrumb — hide middle segments on very small screens */}
        <div className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-0.5">
          <button className="hover:underline" onClick={() => navigate("/")}>Home</button>
          <span className="mx-1.5">›</span>
          <span className="hidden xs:inline">{p?.category || "Products"}</span>
          {p?.subcategory && (
            <>
              <span className="hidden xs:inline mx-1.5">›</span>
              <span className="hidden sm:inline">{p.subcategory}</span>
            </>
          )}
          <span className="hidden xs:inline mx-1.5">›</span>
          <span className="text-gray-800 font-medium truncate max-w-[160px] sm:max-w-none">{p?.name}</span>
        </div>

        {/* Main card — stacks vertically on mobile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">

          {/* Image panel */}
          <div className="p-3 sm:p-4 md:p-6">
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <img
                src={imgSrc} alt={p?.name}
                className="w-full h-56 sm:h-72 md:h-80 object-cover"
                onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
              />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
              {[0,1,2,3].map((k) => (
                <button key={k} type="button"
                  className="bg-gray-50 rounded-xl overflow-hidden border hover:border-green-300 transition">
                  <img src={imgSrc} alt={`${p?.name} ${k+1}`}
                    className="w-full h-12 sm:h-16 object-cover"
                    onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Details panel */}
          <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5">

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">{p?.name}</h1>
                <p className="text-sm text-gray-500 mt-1 truncate">{farmName}</p>
              </div>
              <button className="text-gray-400 hover:text-red-500 transition flex-shrink-0 mt-1" type="button">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>

            {/* Pricing section */}
            <div className="bg-gray-50 rounded-2xl p-3 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  Rs. {p?.price}
                  <span className="text-sm sm:text-base font-semibold text-gray-500"> /{p?.unit}</span>
                </div>
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                  Normal (20–99 {p?.unit})
                </span>
              </div>
              {hasBulk && (
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div className="text-lg sm:text-xl font-bold text-amber-700">
                    Rs. {p.bulkPrice}
                    <span className="text-xs sm:text-sm font-semibold text-gray-500"> /{p?.unit}</span>
                  </div>
                  <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                    Bulk (≥100 {p?.unit}) — save {saving}%
                  </span>
                </div>
              )}
              {!hasBulk && (
                <p className="text-xs text-gray-400">No bulk price set by farmer</p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs sm:text-sm">{p?.category}</span>
              {p?.subcategory && (
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs sm:text-sm">{p.subcategory}</span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs sm:text-sm ${inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            {/* Info grid — 2 cols on all sizes */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3">
                <div className="text-gray-500 text-xs">Available</div>
                <div className="font-semibold text-gray-900 text-sm">{availableQty} {p?.unit}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3">
                <div className="text-gray-500 text-xs">Unit</div>
                <div className="font-semibold text-gray-900 text-sm">{p?.unit || "kg"}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-2.5 sm:p-3">
                <div className="text-gray-500 text-xs">Harvest Date</div>
                <div className="font-semibold text-gray-900 text-sm">{harvestDate}</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-2.5 sm:p-3">
                <div className="text-gray-500 text-xs">Expires</div>
                <div className="font-semibold text-gray-900 text-sm">{expiryDate}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-2.5 sm:p-3">
                <div className="text-gray-500 text-xs">Shelf Life</div>
                <div className="font-semibold text-gray-900 text-sm">{Number(p?.shelfLife || 0)} days</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3">
                <div className="text-gray-500 text-xs">Last Updated</div>
                <div className="font-semibold text-gray-900 text-sm">{updatedAt}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Description</div>
              <p className="text-gray-600 leading-relaxed text-sm">{p?.description || "No description available."}</p>
            </div>

            {/* Quantity selector */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">
                Quantity
                <span className="ml-2 text-xs font-normal text-gray-400">(min {NORMAL_MIN_KG} {p?.unit})</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button type="button" onClick={decrement}
                    disabled={qty <= NORMAL_MIN_KG}
                    className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-lg leading-none">
                    –
                  </button>
                  <input
                    type="number" inputMode="numeric"
                    value={rawQty}
                    onChange={handleQtyChange}
                    onBlur={handleQtyBlur}
                    min={NORMAL_MIN_KG}
                    className="w-14 sm:w-16 text-center font-bold text-gray-900 border-none outline-none py-2 text-sm bg-white"
                  />
                  <button type="button" onClick={increment}
                    disabled={!inStock}
                    className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold text-lg leading-none">
                    +
                  </button>
                </div>
                {hasBulk && qty >= 100 && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                    Bulk price applies in cart
                  </span>
                )}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 text-xs sm:text-sm">
                <span>Rs. {p?.price} × {qty} {p?.unit} (regular)</span>
                <span className="font-medium">Rs. {subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-xs sm:text-sm">
                <span>Platform charge</span>
                <span>Rs. {PLATFORM_CHARGE}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-sm sm:text-base">
                <span>Total (excl. delivery)</span>
                <span>Rs. {total.toFixed(0)}</span>
              </div>
              {hasBulk && (
                <p className="text-xs text-amber-600 font-medium">
                  💡 Add ≥100 {p?.unit} to cart and switch to Bulk to pay Rs. {p.bulkPrice}/{p?.unit}
                </p>
              )}
              <p className="text-xs text-gray-400">Delivery fee calculated at checkout based on distance.</p>
            </div>

            {/* Actions — full width on mobile, side by side */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button type="button" onClick={handleAdd} disabled={!inStock}
                className={`flex-1 font-semibold py-3.5 sm:py-3 rounded-xl transition text-sm sm:text-base ${
                  inStock
                    ? "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}>
                Add to Cart
              </button>
              <button type="button"
                onClick={() => { if (!inStock) return; handleAdd(); navigate("/cart"); }}
                disabled={!inStock}
                className={`flex-1 font-semibold py-3.5 sm:py-3 rounded-xl transition text-sm sm:text-base ${
                  inStock
                    ? "bg-gray-900 hover:bg-black active:bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}>
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Farmer card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="font-bold text-gray-900 mb-3 text-sm sm:text-base">Meet your farmer</div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {p?.farmer?.profileImage && (
                <img
                  src={`${APIBASEURL}${p.farmer.profileImage}`}
                  alt={farmName}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate text-sm sm:text-base">{farmName}</div>
              <div className="text-xs sm:text-sm text-gray-500 truncate">{p?.farmer?.email}</div>
            </div>
          </div>
        </div>

        {/* Related products */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">You may also like</h2>
            <button className="text-xs sm:text-sm text-green-700 hover:underline" onClick={() => navigate("/")} type="button">
              View all
            </button>
          </div>
          {related.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-10 text-center text-gray-500 text-sm">
              No related products available
            </div>
          ) : (
            /* 2 cols on mobile, 4 on large */
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {related.map((rp) => {
                const rid  = rp?.id || rp?._id;
                const rimg = rp?.image ? `${APIBASEURL}${rp.image}` : "/placeholder-product.jpg";
                return (
                  <button key={rid} type="button"
                    onClick={() => navigate(`/product/${rid}`)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md active:scale-95 transition">
                    <img src={rimg} alt={rp?.name}
                      className="h-32 sm:h-40 w-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                    />
                    <div className="p-2.5 sm:p-4">
                      <div className="font-semibold text-gray-900 truncate text-sm">{rp?.name}</div>
                      <div className="text-xs text-gray-500 truncate">{rp?.category}</div>
                      <div className="mt-1.5 font-bold text-gray-900 text-sm">
                        Rs. {rp?.price}
                        <span className="text-xs font-medium text-gray-500"> /{rp?.unit}</span>
                      </div>
                      {rp?.bulkPrice && Number(rp.bulkPrice) > 0 && (
                        <div className="text-xs text-amber-600 font-medium mt-0.5">
                          Bulk Rs. {rp.bulkPrice}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;