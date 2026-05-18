/* src/pages/Orders.jsx
   Per-item Normal / Bulk order type.
   - Each cart row has its own Normal | Bulk toggle
   - Price shown updates live (bulk price when available + quantity ≥ 100)
   - No global OrderTypePicker at the bottom
   - Backend receives items: [{ productId, quantity, orderType }]
*/

import React, { useContext, useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { CartContext } from "../context/CartContext";
import { AuthContext }  from "../context/AuthContext";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";
import {
  ORDER_TYPES,
  NORMAL_MIN_KG,
  NORMAL_MAX_KG,
  BULK_MIN_KG,
  validateItemOrderType,
} from "../utils/orderConstants";

const PLATFORM_CHARGE = 25;

/* ─────────────────────────────────────────────────────────────
   INLINE ORDER-TYPE TOGGLE — shown inside each cart row
───────────────────────────────────────────────────────────── */
const ItemTypePicker = ({ item, itemType, onTypeChange }) => {
  const hasBulkPrice = item?.bulkPrice && Number(item.bulkPrice) > 0;
  const qty          = Number(item?.quantity || 0);

  const normalError = validateItemOrderType(ORDER_TYPES.NORMAL, qty, item?.unit || "kg");
  const bulkError   = validateItemOrderType(ORDER_TYPES.BULK,   qty, item?.unit || "kg");

  const currentError = itemType === ORDER_TYPES.BULK ? bulkError : normalError;

  return (
    <div className="mt-3 space-y-2">
      {/* Toggle buttons */}
      <div className="flex gap-2">
        {/* Normal */}
        <button
          type="button"
          onClick={() => onTypeChange(ORDER_TYPES.NORMAL)}
          className={`flex-1 flex flex-col items-center py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all ${
            itemType === ORDER_TYPES.NORMAL
              ? "border-green-500 bg-green-50 text-green-800"
              : "border-gray-200 text-gray-500 hover:border-green-300"
          }`}
        >
          <span className="text-base mb-0.5">🛒</span>
          <span>Normal</span>
          <span className="font-normal opacity-70">{NORMAL_MIN_KG}–{NORMAL_MAX_KG} {item?.unit || "kg"}</span>
          <span className="font-bold mt-0.5">
            Rs. {Number(item?.price || 0).toFixed(0)}/{item?.unit || "kg"}
          </span>
        </button>

        {/* Bulk */}
        <button
          type="button"
          onClick={() => onTypeChange(ORDER_TYPES.BULK)}
          className={`flex-1 flex flex-col items-center py-2 px-3 rounded-xl border-2 text-xs font-semibold transition-all ${
            itemType === ORDER_TYPES.BULK
              ? "border-amber-500 bg-amber-50 text-amber-800"
              : "border-gray-200 text-gray-500 hover:border-amber-300"
          }`}
        >
          <span className="text-base mb-0.5">🏭</span>
          <span>Bulk</span>
          <span className="font-normal opacity-70">≥ {BULK_MIN_KG} {item?.unit || "kg"}</span>
          {hasBulkPrice ? (
            <span className="font-bold mt-0.5 text-amber-700">
              Rs. {Number(item.bulkPrice).toFixed(0)}/{item?.unit || "kg"}
              <span className="ml-1 text-green-600 text-[10px]">
                (-{Math.round((1 - item.bulkPrice / item.price) * 100)}%)
              </span>
            </span>
          ) : (
            <span className="font-normal mt-0.5 opacity-60">No bulk price</span>
          )}
        </button>
      </div>

      {/* Validation error for this item */}
      {currentError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
          ⚠ {currentError}
        </p>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   EFFECTIVE PRICE — uses bulk price when type=bulk and available
───────────────────────────────────────────────────────────── */
const effectiveUnitPrice = (item, itemType) => {
  if (
    itemType === ORDER_TYPES.BULK &&
    item?.bulkPrice &&
    Number(item.bulkPrice) > 0
  ) {
    return Number(item.bulkPrice);
  }
  return Number(item?.price || 0);
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
const Orders = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQty, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  /* Per-item order types: { [itemId]: "normal" | "bulk" } */
  const [itemTypes, setItemTypes] = useState({});
  /* Per-item raw qty strings for the input */
  const [rawQtys,   setRawQtys]   = useState({});

  const [estimate,        setEstimate]        = useState(null);
  const [placingOrder,    setPlacingOrder]    = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });
  const showAlert  = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  /* Seed per-item state for new items */
  useEffect(() => {
    if (!cartItems?.length) return;
    setItemTypes((prev) => {
      const next = { ...prev };
      cartItems.forEach((it) => {
        const id = it?.id || it?.productId;
        if (id && !next[id]) next[id] = ORDER_TYPES.NORMAL;
      });
      return next;
    });
    setRawQtys((prev) => {
      const next = { ...prev };
      cartItems.forEach((it) => {
        const id = it?.id || it?.productId;
        if (id && next[id] === undefined)
          next[id] = String(it?.quantity || NORMAL_MIN_KG);
      });
      return next;
    });
  }, [cartItems?.length]);

  /* Build items array for API */
  const buildOrderItems = useMemo(() =>
    (cartItems || [])
      .map((it) => {
        const id      = it?.id || it?.productId || it?._id;
        const type    = itemTypes[id] || ORDER_TYPES.NORMAL;
        return {
          productId: id,
          quantity:  Math.max(1, Number(it?.quantity || 1)),
          orderType: type,
        };
      })
      .filter((it) => it.productId),
    [cartItems, itemTypes]
  );

  /* Validation: check every item */
  const itemErrors = useMemo(() => {
    const errs = {};
    (cartItems || []).forEach((it) => {
      const id   = it?.id || it?.productId;
      const type = itemTypes[id] || ORDER_TYPES.NORMAL;
      const qty  = Number(it?.quantity || 0);
      const err  = validateItemOrderType(type, qty, it?.unit || "kg");
      if (err) errs[id] = err;
    });
    return errs;
  }, [cartItems, itemTypes]);

  const hasErrors = Object.keys(itemErrors).length > 0;

  /* Estimate */
  const fetchEstimate = useCallback(async (items) => {
    if (!items?.length) return;
    setLoadingEstimate(true);
    try {
      const res = await api.post("/api/orders/estimate", { items });
      setEstimate(res.data);
    } catch (err) {
      showAlert("Delivery Estimate Failed", err.response?.data?.message || "Failed to calculate delivery.", "error");
    } finally {
      setLoadingEstimate(false);
    }
  }, []);

  useEffect(() => {
    if (hasErrors || !buildOrderItems.length) { setEstimate(null); return; }
    const t = setTimeout(() => fetchEstimate(buildOrderItems), 450);
    return () => clearTimeout(t);
  }, [JSON.stringify(buildOrderItems), hasErrors]);

  /* Qty handlers */
  const handleQtyChange = (itemId, raw) => {
    setRawQtys((prev) => ({ ...prev, [itemId]: raw }));
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 1) updateQty(itemId, parsed);
  };

  const handleQtyBlur = (itemId) => {
    const raw     = rawQtys[itemId] ?? "1";
    const parsed  = parseInt(raw, 10);
    const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    updateQty(itemId, clamped);
    setRawQtys((prev) => ({ ...prev, [itemId]: String(clamped) }));
  };

  /* Type change: also snap quantity to the type's minimum */
  const handleTypeChange = (itemId, newType) => {
    setItemTypes((prev) => ({ ...prev, [itemId]: newType }));
    const item     = cartItems?.find((it) => (it?.id || it?.productId) === itemId);
    const qty      = Number(item?.quantity || 0);
    const snapQty  = newType === ORDER_TYPES.BULK
      ? Math.max(qty, BULK_MIN_KG)
      : Math.max(Math.min(qty, NORMAL_MAX_KG), NORMAL_MIN_KG);
    if (snapQty !== qty) {
      updateQty(itemId, snapQty);
      setRawQtys((prev) => ({ ...prev, [itemId]: String(snapQty) }));
    }
    setEstimate(null);
  };

  /* Price summary */
  const fallbackSubtotal = useMemo(() =>
    (cartItems || []).reduce((sum, it) => {
      const id    = it?.id || it?.productId;
      const type  = itemTypes[id] || ORDER_TYPES.NORMAL;
      const price = effectiveUnitPrice(it, type);
      return sum + price * Number(it?.quantity || 0);
    }, 0),
    [cartItems, itemTypes]
  );

  const subtotal       = estimate?.itemsSubtotal   ?? fallbackSubtotal;
  const deliveryTotal  = estimate?.deliveryTotal    ?? 0;
  const platformCharge = estimate?.platformCharge   ?? PLATFORM_CHARGE;
  const grandTotal     = estimate?.grandTotal       ?? subtotal + deliveryTotal + platformCharge;

  const buildImgSrc = (item) => {
    if (!item?.image) return "/placeholder-product.jpg";
    const img = String(item.image);
    return img.startsWith("http") ? img : `${APIBASEURL}${img.startsWith("/") ? img : `/${img}`}`;
  };

  /* Checkout */
  const handleCheckout = async () => {
    if (placingOrder || !buildOrderItems.length || hasErrors) return;
    setPlacingOrder(true);
    try {
      const res = await api.post("/api/orders", { items: buildOrderItems });
      clearCart();
      navigate("/payment", { state: { order: res.data } });
    } catch (err) {
      showAlert("Checkout Failed", err.response?.data?.message || "Checkout failed. Please try again.", "error");
    } finally {
      setPlacingOrder(false);
    }
  };

  const hasLocation = !!user?.location?.coordinates;

  if (!cartItems?.length) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart</h1>
          <p className="text-gray-600 mb-8">Your cart is empty.</p>
          <button onClick={() => navigate("/consumer")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
      <AlertModal isOpen={alertModal.isOpen} onClose={closeAlert}
        type={alertModal.type} title={alertModal.title}
        message={alertModal.message} confirmText="OK" />

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-1">
              {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} — choose Normal or Bulk per product
            </p>
          </div>
          <button onClick={() => navigate("/consumer")}
            className="text-green-600 hover:underline font-medium text-sm">
            Continue Shopping
          </button>
        </div>

        {/* No location warning */}
        {!hasLocation && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <span className="text-xl mt-0.5">📍</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Location not set — delivery fee is estimated</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Set your location in{" "}
                <button onClick={() => navigate("/profile")} className="underline font-semibold">Profile</button>
                {" "}for accurate distance-based delivery.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Cart items ── */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => {
              const itemId   = item?.id || item?.productId;
              const key      = itemId || index;
              const rawVal   = rawQtys[itemId] ?? String(item?.quantity || NORMAL_MIN_KG);
              const itemType = itemTypes[itemId] || ORDER_TYPES.NORMAL;
              const unitPrice = effectiveUnitPrice(item, itemType);
              const rowTotal  = unitPrice * Number(item?.quantity || 1);
              const imgSrc   = buildImgSrc(item);
              const isBulk   = itemType === ORDER_TYPES.BULK;

              return (
                <div
                  key={key}
                  className={`bg-white border-2 rounded-2xl p-5 hover:shadow-sm transition ${
                    isBulk ? "border-amber-200" : "border-gray-100"
                  }`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Image */}
                    <img
                      src={imgSrc} alt={item?.name}
                      className="h-20 w-20 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                      onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{item?.name || "Product"}</h3>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {item?.farmer?.firstName
                              ? `${item.farmer.firstName} ${item.farmer.lastName}`
                              : "Local farm"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item?.id)}
                          className="text-gray-300 hover:text-red-500 transition p-1 flex-shrink-0"
                          aria-label="Remove"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Price + qty row */}
                      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                        {/* Unit price (live) */}
                        <div>
                          <span className="text-sm font-bold text-gray-900">
                            Rs. {unitPrice.toFixed(0)}
                          </span>
                          <span className="text-xs text-gray-400"> /{item?.unit || "kg"}</span>
                          {isBulk && item?.bulkPrice && Number(item.bulkPrice) > 0 && (
                            <span className="ml-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full">
                              Bulk price
                            </span>
                          )}
                          {!isBulk && (
                            <span className="ml-1.5 text-xs text-green-700 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">
                              Regular price
                            </span>
                          )}
                        </div>

                        {/* Qty input */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-400">Qty ({item?.unit || "kg"})</label>
                          <input
                            type="number" inputMode="numeric"
                            value={rawVal}
                            onChange={(e) => handleQtyChange(itemId, e.target.value)}
                            onBlur={() => handleQtyBlur(itemId)}
                            min={1}
                            className="w-20 text-center font-bold text-gray-900 border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-green-500 transition"
                          />
                        </div>

                        {/* Row total */}
                        <div className="text-right">
                          <p className="font-bold text-gray-900">Rs. {rowTotal.toFixed(0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-item Normal / Bulk picker */}
                  <ItemTypePicker
                    item={item}
                    itemType={itemType}
                    onTypeChange={(type) => handleTypeChange(itemId, type)}
                  />
                </div>
              );
            })}

            {/* Delivery breakdown */}
            {estimate?.shipments?.length > 0 && (
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
                          {sh.distanceKm !== null
                            ? `${sh.distanceKm} km away`
                            : "Distance unknown — base rate"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">Rs. {sh.deliveryFee}</p>
                        {sh.distanceKm !== null && (
                          <p className="text-xs text-gray-400">
                            {sh.distanceKm <= 10
                              ? "≤ 10 km (base)"
                              : `+${Math.ceil(sh.distanceKm) - 10} km × Rs.5`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                  First 10 km → Rs. 50 · Every extra km → +Rs. 5 · Max Rs. 500
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Summary ── */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 lg:sticky lg:top-8 h-fit shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Order Summary</h2>

            {/* Per-item type chips */}
            <div className="space-y-1.5 mb-4">
              {cartItems.map((it) => {
                const id   = it?.id || it?.productId;
                const type = itemTypes[id] || ORDER_TYPES.NORMAL;
                const unitPrice = effectiveUnitPrice(it, type);
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate mr-2 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        type === ORDER_TYPES.BULK ? "bg-amber-400" : "bg-green-400"
                      }`} />
                      {it?.name}
                      <span className="text-xs text-gray-400">
                        ({type === ORDER_TYPES.BULK ? "Bulk" : "Normal"})
                      </span>
                    </span>
                    <span className="font-medium flex-shrink-0">
                      Rs. {(unitPrice * Number(it?.quantity || 1)).toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Recalculating */}
            {loadingEstimate && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 px-1">
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Recalculating…
              </div>
            )}

            <div className="space-y-2.5 mb-5 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">Rs. {subtotal.toFixed(0)}</span>
              </div>

              {/* Per-shipment delivery */}
              {estimate?.shipments?.map((sh, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1 truncate mr-2">
                    <span className="text-xs">🚚</span>
                    <span className="truncate">{sh.farmerName}</span>
                    {sh.distanceKm !== null && (
                      <span className="text-gray-400 text-xs flex-shrink-0">· {sh.distanceKm} km</span>
                    )}
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

              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-600">Total Delivery</span>
                <span className="text-green-600">Rs. {deliveryTotal.toFixed(0)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  Platform charge
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">MeroBari</span>
                </span>
                <span className="font-medium text-gray-700">Rs. {platformCharge}</span>
              </div>

              <div className="border-t border-gray-200 pt-2.5 flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span className={`transition-all duration-300 ${loadingEstimate ? "opacity-40" : "text-green-600"}`}>
                  Rs. {grandTotal.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Item errors summary */}
            {hasErrors && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-1">
                <p className="font-semibold">Fix quantity issues before checkout:</p>
                {Object.values(itemErrors).map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <button
              disabled={placingOrder || loadingEstimate || !buildOrderItems.length || hasErrors}
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition shadow-sm"
            >
              {placingOrder
                ? "Placing Order…"
                : loadingEstimate
                ? "Recalculating…"
                : hasErrors
                ? "Fix quantity errors"
                : "Proceed to Payment"}
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              Normal: {NORMAL_MIN_KG}–{NORMAL_MAX_KG} kg · Bulk: ≥{BULK_MIN_KG} kg · Rs. {PLATFORM_CHARGE} platform fee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;