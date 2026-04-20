/* src/pages/Orders.jsx — shows platform charge in the order summary */

import React, { useContext, useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { CartContext } from "../context/CartContext";
import { AuthContext }  from "../context/AuthContext";
import { APIBASEURL } from "../utils/config";
import AlertModal      from "../components/AlertModal";
import OrderTypePicker from "../components/OrderTypePicker";
import {
  ORDER_TYPES,
  NORMAL_MIN_KG,
  NORMAL_MAX_KG,
  BULK_MIN_KG,
  validateOrderTypeQty,
} from "../utils/orderConstants";

const PLATFORM_CHARGE = 25; // Rs. — must match backend constant

const distributeQty = (total, count) => {
  if (count === 0) return [];
  const base      = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, i) =>
    i < remainder ? base + 1 : base
  );
};

const Orders = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQty, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [orderType,       setOrderType]       = useState(ORDER_TYPES.NORMAL);
  const [estimate,        setEstimate]        = useState(null);
  const [placingOrder,    setPlacingOrder]    = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [qtyError,        setQtyError]        = useState(null);
  const [rawQtys,         setRawQtys]         = useState({});

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });
  const showAlert  = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  // Seed rawQtys for new items
  useEffect(() => {
    const additions = {};
    (cartItems || []).forEach((it) => {
      const id = it?.id || it?.productId;
      if (id && rawQtys[id] === undefined) {
        additions[id] = String(it?.quantity || NORMAL_MIN_KG);
      }
    });
    if (Object.keys(additions).length > 0)
      setRawQtys((prev) => ({ ...prev, ...additions }));
  }, [cartItems?.length]);

  const buildOrderItems = useMemo(() =>
    (cartItems || [])
      .map((it) => ({
        productId: it.id || it.productId || it._id,
        quantity:  Math.max(1, Number(it?.quantity || 1)),
      }))
      .filter((it) => it.productId),
    [cartItems]
  );

  const totalQty = useMemo(() =>
    (cartItems || []).reduce((sum, it) => sum + Number(it?.quantity || 0), 0),
    [cartItems]
  );

  useEffect(() => {
    setQtyError(validateOrderTypeQty(orderType, totalQty));
  }, [orderType, totalQty]);

  /* estimate */
  const fetchEstimate = useCallback(async (type, items) => {
    if (!items || items.length === 0) return;
    setLoadingEstimate(true);
    try {
      const res = await api.post("/api/orders/estimate", { items, orderType: type });
      setEstimate(res.data);
    } catch (err) {
      showAlert("Delivery Calculation Failed", err.response?.data?.message || "Failed to calculate delivery.", "error");
    } finally {
      setLoadingEstimate(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (validateOrderTypeQty(orderType, totalQty)) { setEstimate(null); return; }
      fetchEstimate(orderType, buildOrderItems);
    }, 400);
    return () => clearTimeout(t);
  }, [buildOrderItems.length, orderType, totalQty, fetchEstimate]);

  /* type card click → snap qty */
  const handleTypeChange = useCallback((type, snapQty) => {
    setOrderType(type);
    setEstimate(null);
    if (!cartItems || cartItems.length === 0) return;

    const distributed = distributeQty(snapQty, cartItems.length);
    const newRaw      = {};
    cartItems.forEach((it, idx) => {
      const id  = it?.id || it?.productId;
      const qty = Math.max(1, distributed[idx] || 1);
      if (id) { updateQty(id, qty); newRaw[id] = String(qty); }
    });
    setRawQtys((prev) => ({ ...prev, ...newRaw }));

    const newItems = cartItems.map((it, idx) => ({
      productId: it.id || it.productId || it._id,
      quantity:  Math.max(1, distributed[idx] || 1),
    })).filter((it) => it.productId);
    fetchEstimate(type, newItems);
  }, [cartItems, updateQty, fetchEstimate]);

  /* per-item typeable qty */
  const handleQtyInputChange = (itemId, raw) => {
    setRawQtys((prev) => ({ ...prev, [itemId]: raw }));
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1) updateQty(itemId, parsed);
  };
  const handleQtyInputBlur = (itemId) => {
    const raw     = rawQtys[itemId] ?? "1";
    const parsed  = parseInt(raw, 10);
    const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    updateQty(itemId, clamped);
    setRawQtys((prev) => ({ ...prev, [itemId]: String(clamped) }));
  };

  /* price summary — platform charge from estimate or local constant */
  const fallbackSubtotal = useMemo(() =>
    (cartItems || []).reduce((sum, it) => sum + Number(it?.price || 0) * Number(it?.quantity || 0), 0),
    [cartItems]
  );
  const subtotal        = estimate?.itemsSubtotal   ?? fallbackSubtotal;
  const deliveryTotal   = estimate?.deliveryTotal    ?? 0;
  const platformCharge  = estimate?.platformCharge   ?? PLATFORM_CHARGE;
  const grandTotal      = estimate?.grandTotal       ?? subtotal + deliveryTotal + platformCharge;

  const buildImgSrc = (item) => {
    if (!item?.image) return "/placeholder-product.jpg";
    const img = String(item.image);
    return img.startsWith("http") ? img : `${APIBASEURL}${img.startsWith("/") ? img : `/${img}`}`;
  };

  /* checkout */
  const handleCheckout = async () => {
    if (placingOrder || buildOrderItems.length === 0) return;
    const localError = validateOrderTypeQty(orderType, totalQty);
    if (localError) { showAlert("Invalid Quantity", localError, "warning"); return; }
    setPlacingOrder(true);
    try {
      const res = await api.post("/api/orders", { items: buildOrderItems, orderType });
      clearCart();
      navigate("/payment", { state: { order: res.data } });
    } catch (err) {
      showAlert("Checkout Failed", err.response?.data?.message || "Checkout failed. Please try again.", "error");
    } finally {
      setPlacingOrder(false);
    }
  };

  const hasLocation = !!user?.location?.coordinates;

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart</h1>
          <p className="text-gray-600 mb-8">Your cart is empty.</p>
          <button onClick={() => navigate("/consumer")} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
      <AlertModal isOpen={alertModal.isOpen} onClose={closeAlert} type={alertModal.type} title={alertModal.title} message={alertModal.message} confirmText="OK" />

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-1">{cartItems.length} item{cartItems.length !== 1 ? "s" : ""} · {totalQty} kg total</p>
          </div>
          <button onClick={() => navigate("/consumer")} className="text-green-600 hover:underline font-medium">Continue Shopping</button>
        </div>

        {/* No location warning */}
        {!hasLocation && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <span className="text-xl mt-0.5">📍</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Location not set — delivery fee is estimated</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Set your location in your{" "}
                <button onClick={() => navigate("/profile")} className="underline font-semibold">Profile</button>{" "}
                for an accurate distance-based fee.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left */}
          <div className="lg:col-span-2 space-y-4">

            {/* Cart items */}
            {cartItems.map((item, index) => {
              const imgSrc = buildImgSrc(item);
              const itemId = item?.id || item?.productId;
              const key    = itemId || index;
              const rawVal = rawQtys[itemId] ?? String(item?.quantity || NORMAL_MIN_KG);

              return (
                <div key={key} className="bg-white border border-gray-100 rounded-2xl p-5 flex gap-4 items-center hover:shadow-sm transition">
                  <img
                    src={imgSrc} alt={item?.name}
                    className="h-20 w-20 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                    onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{item?.name || "Product"}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {item?.farmer?.firstName ? `${item.farmer.firstName} ${item.farmer.lastName}` : "Local farm"}
                    </p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      Rs. {Number(item?.price || 0).toFixed(0)}
                      <span className="font-normal text-gray-400"> /{item?.unit || "kg"}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <label className="text-xs text-gray-400">Qty ({item?.unit || "kg"})</label>
                    <input
                      type="number" inputMode="numeric"
                      value={rawVal}
                      onChange={(e) => handleQtyInputChange(itemId, e.target.value)}
                      onBlur={() => handleQtyInputBlur(itemId)}
                      min={1}
                      className="w-20 text-center font-bold text-gray-900 border-2 border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-green-500 transition"
                      aria-label={`Quantity of ${item?.name}`}
                    />
                  </div>
                  <div className="text-right flex-shrink-0 w-20">
                    <p className="font-bold text-gray-900">
                      Rs. {(Number(item?.price || 0) * Number(item?.quantity || 1)).toFixed(0)}
                    </p>
                  </div>
                  <button onClick={() => removeFromCart(item?.id)} className="text-gray-300 hover:text-red-500 transition p-1 flex-shrink-0" aria-label="Remove item">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}

            {/* Order type picker */}
            <OrderTypePicker
              orderType={orderType}
              onTypeChange={handleTypeChange}
              totalQty={totalQty}
              unit="kg"
              validationError={qtyError}
            />

            {/* Delivery breakdown */}
            {estimate?.shipments && estimate.shipments.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🚚</span> Delivery Breakdown
                </h3>
                <div className="space-y-3">
                  {estimate.shipments.map((sh, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-800">{sh.farmerName}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {sh.distanceKm !== null ? `${sh.distanceKm} km away` : "Distance unknown — using base rate"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">Rs. {sh.deliveryFee}</p>
                        {sh.distanceKm !== null && (
                          <p className="text-xs text-gray-400">
                            {sh.distanceKm <= 10 ? "≤ 10 km (base)" : `+${Math.ceil(sh.distanceKm) - 10} km × Rs.5`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                  <p className="font-semibold mb-0.5">📏 Same delivery fee for Normal and Bulk</p>
                  <p>First 10 km → Rs. 50 · Every extra km → +Rs. 5 · Max Rs. 500</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 lg:sticky lg:top-8 h-fit shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Order Summary</h2>

            {/* Order type badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold mb-4 ${
              orderType === ORDER_TYPES.BULK
                ? "bg-amber-50 text-amber-800 border border-amber-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}>
              <span>{orderType === ORDER_TYPES.BULK ? "🏭" : "🛒"}</span>
              <span>{orderType === ORDER_TYPES.BULK ? "Bulk order" : "Normal order"}</span>
              <span className="ml-auto font-normal text-xs opacity-70">{totalQty} kg</span>
            </div>

            {/* Recalculating indicator */}
            {loadingEstimate && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 px-1">
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Recalculating…
              </div>
            )}

            <div className="space-y-2.5 mb-5">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal ({cartItems.length} items)</span>
                <span className="font-medium">Rs. {subtotal.toFixed(0)}</span>
              </div>

              {/* Per-shipment delivery */}
              {estimate?.shipments?.map((sh, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1 truncate mr-2">
                    <span className="text-xs">🚚</span>
                    <span className="truncate">{sh.farmerName}</span>
                    {sh.distanceKm !== null && <span className="text-gray-400 text-xs flex-shrink-0">· {sh.distanceKm} km</span>}
                  </span>
                  <span className="flex-shrink-0">Rs. {sh.deliveryFee}</span>
                </div>
              ))}
              {!estimate && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Delivery</span>
                  <span>{loadingEstimate ? "Calculating…" : "—"}</span>
                </div>
              )}

              {/* Delivery subtotal */}
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-600">Total Delivery</span>
                <span className="text-green-600">Rs. {deliveryTotal.toFixed(0)}</span>
              </div>

              {/* Platform charge */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  Platform charge
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">MeroBari</span>
                </span>
                <span className="font-medium text-gray-700">Rs. {platformCharge}</span>
              </div>

              {/* Divider + Grand total */}
              <div className="border-t border-gray-200 pt-2.5 flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span className={`transition-all duration-300 ${loadingEstimate ? "opacity-40" : "text-green-600"}`}>
                  Rs. {grandTotal.toFixed(0)}
                </span>
              </div>
            </div>

            <button
              disabled={placingOrder || loadingEstimate || buildOrderItems.length === 0 || !!qtyError}
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition shadow-sm"
            >
              {placingOrder
                ? "Placing Order…"
                : loadingEstimate
                ? "Recalculating…"
                : qtyError
                ? "Fix quantity to continue"
                : "Proceed to Payment"}
            </button>

            {qtyError && <p className="text-xs text-red-600 text-center leading-snug mt-2">{qtyError}</p>}

            <p className="text-xs text-gray-400 text-center mt-3">
              Distance-based delivery · Rs. {PLATFORM_CHARGE} platform charge
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;