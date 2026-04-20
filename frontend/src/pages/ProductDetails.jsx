/* src/pages/ProductDetails.jsx
   Changes:
   - qty state starts at NORMAL_MIN_KG (20) instead of 1
   - "Add to Cart" passes quantity: qty (so cart gets 20 by default)
   - Platform charge (Rs. 25) shown in the price breakdown
*/

import { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import { CartContext } from "../context/CartContext";
import { NORMAL_MIN_KG } from "../utils/orderConstants";
import AlertModal from "../components/AlertModal";

const PLATFORM_CHARGE = 25; // Rs. — must match backend

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
  const [qty,     setQty]     = useState(NORMAL_MIN_KG); // start at 20
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

  /* subtotal + platform charge */
  const subtotal        = useMemo(() => Number(p?.price || 0) * qty, [p?.price, qty]);
  const platformCharge  = PLATFORM_CHARGE;
  const total           = subtotal + platformCharge;

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
      showAlert(
        "Failed to Load Product",
        err.response?.data?.message || "Failed to load product.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  /* qty input handlers */
  const handleQtyChange = (e) => {
    const raw    = e.target.value;
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
    setQty(next);
    setRawQty(String(next));
  };

  const increment = () => {
    const next = qty + 1;
    setQty(next);
    setRawQty(String(next));
  };

  const handleAdd = () => {
    if (!p) return;
    addToCart({
      id:       p.id || p._id,
      name:     p.name,
      price:    p.price,
      unit:     p.unit,
      quantity: qty,          // passes the chosen qty (default 20)
      image:    p.image,
      farmer:   p.farmer,
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
          isOpen={alertModal.isOpen}
          onClose={closeAlert}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
          confirmText="Retry"
          onConfirm={load}
        />
        <div className="bg-white border rounded-xl p-6 w-full max-w-md text-center">
          <p className="text-gray-600">Product not found.</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const availableQty  = Number(p?.quantity || 0);
  const inStock       = availableQty > 0;
  const harvestDate   = fmtDate(p?.harvestDate);
  const expiryDate    = p?.expiresAt ? fmtDate(p.expiresAt) : "No expiry";
  const createdAt     = fmtDate(p?.createdAt);
  const updatedAt     = fmtDate(p?.updatedAt);

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
      />

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-500">
          <button className="hover:underline" onClick={() => navigate("/")}>Home</button>
          <span className="mx-2">›</span>
          <span>{p?.category || "Products"}</span>
          {p?.subcategory ? (
            <><span className="mx-2">›</span><span>{p.subcategory}</span></>
          ) : null}
          <span className="mx-2">›</span>
          <span className="text-gray-800 font-medium">{p?.name}</span>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid md:grid-cols-2">

          {/* Image panel */}
          <div className="p-4 md:p-6">
            <div className="bg-gray-50 rounded-2xl overflow-hidden">
              <img
                src={imgSrc}
                alt={p?.name}
                className="w-full h-80 object-cover"
                onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
              />
            </div>

            {/* Thumbnail strip */}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((k) => (
                <button key={k} type="button" className="bg-gray-50 rounded-xl overflow-hidden border hover:border-green-300 transition">
                  <img
                    src={imgSrc}
                    alt={`${p?.name} ${k + 1}`}
                    className="w-full h-16 object-cover"
                    onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Details panel */}
          <div className="p-4 md:p-6 space-y-5">

            {/* Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold text-gray-900 truncate">{p?.name}</h1>
                <p className="text-sm text-gray-500 mt-1 truncate">{farmName}</p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                type="button"
                aria-label="Add to wishlist"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>

            {/* Price */}
            <div className="text-3xl font-extrabold text-gray-900">
              Rs. {p?.price}
              <span className="text-base font-semibold text-gray-500"> /{p?.unit}</span>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{p?.category}</span>
              {p?.subcategory && (
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{p.subcategory}</span>
              )}
              <span className={`px-3 py-1 rounded-full ${inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-gray-500">Available</div>
                <div className="font-semibold text-gray-900">{availableQty} {p?.unit}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-gray-500">Unit</div>
                <div className="font-semibold text-gray-900">{p?.unit || "kg"}</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-gray-500">Harvest Date</div>
                <div className="font-semibold text-gray-900">{harvestDate}</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <div className="text-gray-500">Expires</div>
                <div className="font-semibold text-gray-900">{expiryDate}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-gray-500">Shelf Life</div>
                <div className="font-semibold text-gray-900">{Number(p?.shelfLife || 0)} days</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-gray-500">Last Updated</div>
                <div className="font-semibold text-gray-900">{updatedAt}</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="font-semibold text-gray-900 mb-1">Description</div>
              <p className="text-gray-600 leading-relaxed">{p?.description || "No description available."}</p>
            </div>

            {/* ── Quantity selector ── */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">
                Quantity
                <span className="ml-2 text-xs font-normal text-gray-400">(min {NORMAL_MIN_KG} {p?.unit})</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={decrement}
                    disabled={qty <= NORMAL_MIN_KG}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold"
                  >
                    –
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={rawQty}
                    onChange={handleQtyChange}
                    onBlur={handleQtyBlur}
                    min={NORMAL_MIN_KG}
                    className="w-16 text-center font-bold text-gray-900 border-none outline-none py-2 text-sm bg-white"
                    aria-label="Quantity"
                  />
                  <button
                    type="button"
                    onClick={increment}
                    disabled={!inStock}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* ── Price breakdown ── */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>
                  Rs. {p?.price} × {qty} {p?.unit}
                </span>
                <span>Rs. {subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform charge</span>
                <span>Rs. {platformCharge}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
                <span>Total (excl. delivery)</span>
                <span>Rs. {total.toFixed(0)}</span>
              </div>
              <p className="text-xs text-gray-400">Delivery fee calculated at checkout based on distance.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!inStock}
                className={`flex-1 font-semibold py-3 rounded-xl transition ${
                  inStock
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Add to Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!inStock) return;
                  handleAdd();
                  navigate("/cart");
                }}
                disabled={!inStock}
                className={`flex-1 font-semibold py-3 rounded-xl transition ${
                  inStock
                    ? "bg-gray-900 hover:bg-black text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>

        {/* Farmer card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="font-bold text-gray-900 mb-3">Meet your farmer</div>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {p?.farmer?.profileImage && (
                <img
                  src={`${APIBASEURL}${p.farmer.profileImage}`}
                  alt={farmName}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{farmName}</div>
              <div className="text-sm text-gray-500 truncate">{p?.farmer?.email}</div>
            </div>
          </div>
        </div>

        {/* Related products */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-gray-900">You may also like</h2>
            <button
              className="text-sm text-green-700 hover:underline"
              onClick={() => navigate("/")}
              type="button"
            >
              View all
            </button>
          </div>

          {related.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
              No related products available
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((rp) => {
                const rid  = rp?.id || rp?._id;
                const rimg = rp?.image ? `${APIBASEURL}${rp.image}` : "/placeholder-product.jpg";
                return (
                  <button
                    key={rid}
                    type="button"
                    onClick={() => navigate(`/product/${rid}`)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md transition"
                  >
                    <img
                      src={rimg}
                      alt={rp?.name}
                      className="h-40 w-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                    />
                    <div className="p-4">
                      <div className="font-semibold text-gray-900 truncate">{rp?.name}</div>
                      <div className="text-sm text-gray-500 truncate">{rp?.category}</div>
                      <div className="mt-2 font-bold text-gray-900">
                        Rs. {rp?.price}
                        <span className="text-sm font-medium text-gray-500"> /{rp?.unit}</span>
                      </div>
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