import React, { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";

const Orders = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQty, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [estimate,        setEstimate]        = useState(null);
  const [placingOrder,    setPlacingOrder]    = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "",
  });

  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((p) => ({ ...p, isOpen: false }));

  const buildOrderItems = useMemo(() => {
    return (cartItems || [])
      .map((it) => ({
        productId: it.id || it.productId || it._id,
        quantity:  Math.max(1, Number(it?.quantity || 1)),
      }))
      .filter((it) => it.productId);
  }, [cartItems]);

  const fetchEstimate = async () => {
    if (buildOrderItems.length === 0) return;
    setLoadingEstimate(true);
    try {
      const res = await api.post("/api/orders/estimate", { items: buildOrderItems });
      setEstimate(res.data);
    } catch (err) {
      showAlert(
        "Delivery Calculation Failed",
        err.response?.data?.message || "Failed to calculate delivery.",
        "error"
      );
    } finally {
      setLoadingEstimate(false);
    }
  };

  useEffect(() => {
    if (buildOrderItems.length > 0) fetchEstimate();
  }, [buildOrderItems.length]);

  const fallbackSubtotal = useMemo(() =>
    (cartItems || []).reduce((sum, it) =>
      sum + Number(it?.price || 0) * Number(it?.quantity || 0), 0
    ), [cartItems]);

  const subtotal      = estimate?.itemsSubtotal || fallbackSubtotal;
  const deliveryTotal = estimate?.deliveryTotal  || 0;
  const grandTotal    = estimate?.grandTotal     || subtotal + deliveryTotal;

  const buildImgSrc = (item) => {
    if (!item?.image) return "/placeholder-product.jpg";
    const img = String(item.image);
    return img.startsWith("http") ? img : `${APIBASEURL}${img.startsWith("/") ? img : `/${img}`}`;
  };

  const handleCheckout = async () => {
    if (placingOrder || buildOrderItems.length === 0) return;
    setPlacingOrder(true);
    try {
      const res = await api.post("/api/orders", { items: buildOrderItems });
      clearCart();
      navigate("/payment", { state: { order: res.data } });
    } catch (err) {
      showAlert(
        "Checkout Failed",
        err.response?.data?.message || "Checkout failed. Please try again.",
        "error"
      );
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
          <button
            onClick={() => navigate("/consumer")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold
                       px-8 py-3 rounded-xl transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
      />

      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-1">
              {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => navigate("/consumer")}
            className="text-green-600 hover:underline font-medium"
          >
            Continue Shopping
          </button>
        </div>

        {/* No location warning */}
        {!hasLocation && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200
                          rounded-2xl px-5 py-4">
            <span className="text-xl mt-0.5">📍</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                Location not set — delivery fee is estimated
              </p>
              <p className="text-amber-700 text-xs mt-0.5">
                Set your location in your{" "}
                <button
                  onClick={() => navigate("/profile")}
                  className="underline font-semibold"
                >
                  Profile
                </button>{" "}
                for an accurate distance-based delivery fee.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => {
              const imgSrc = buildImgSrc(item);
              const key    = item?.id || item?.productId || index;
              return (
                <div key={key}
                     className="bg-white border rounded-2xl p-6 flex gap-4
                                items-start hover:shadow-md transition">
                  <img
                    src={imgSrc}
                    alt={item?.name}
                    className="h-24 w-24 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                    onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 truncate pr-4">
                          {item?.name || "Product"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {item?.farmer?.firstName
                            ? `From ${item.farmer.firstName} ${item.farmer.lastName}`
                            : "Local farm"}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item?.id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-full
                                   hover:bg-red-50 transition"
                        aria-label="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 border rounded-xl p-1 bg-gray-50">
                        <button
                          type="button"
                          className="px-3 py-2 hover:bg-white rounded-lg transition"
                          onClick={() => updateQty(item?.id, Number(item?.quantity || 1) - 1)}
                          disabled={Number(item?.quantity || 1) <= 1}
                        >–</button>
                        <span className="px-4 py-2 font-bold bg-white rounded-lg
                                         min-w-[3rem] text-center">
                          {item?.quantity || 1}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-2 hover:bg-white rounded-lg transition"
                          onClick={() => updateQty(item?.id, Number(item?.quantity || 1) + 1)}
                        >+</button>
                      </div>
                      <div className="text-right font-bold text-xl text-gray-900">
                        Rs. {(Number(item?.price || 0) * Number(item?.quantity || 1)).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Delivery breakdown per shipment */}
            {estimate?.shipments && estimate.shipments.length > 0 && (
              <div className="bg-white border rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🚚</span> Delivery Breakdown
                </h3>
                <div className="space-y-3">
                  {estimate.shipments.map((sh, i) => (
                    <div key={i}
                         className="flex items-center justify-between text-sm
                                    bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-semibold text-gray-800">{sh.farmerName}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {sh.distanceKm !== null
                            ? `${sh.distanceKm} km away`
                            : "Distance unknown — using base rate"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">Rs. {sh.deliveryFee}</p>
                        {sh.distanceKm !== null && (
                          <p className="text-xs text-gray-400">
                            {sh.distanceKm <= 10
                              ? "≤ 10 km (base rate)"
                              : `10 km base + ${Math.ceil(sh.distanceKm) - 10} km × Rs.5`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pricing legend */}
                <div className="mt-4 bg-green-50 border border-green-200
                                rounded-xl px-4 py-3 text-xs text-green-800">
                  <p className="font-semibold mb-1">📏 Delivery pricing</p>
                  <p>First 10 km → Rs. 50 flat</p>
                  <p>Every additional km → +Rs. 5</p>
                  <p>Maximum charge → Rs. 500</p>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white border rounded-2xl p-6 lg:sticky lg:top-8
                          h-fit shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>Rs. {subtotal.toFixed(0)}</span>
              </div>

              {estimate?.shipments?.map((sh, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="text-xs">🚚</span>
                    {sh.farmerName}
                    {sh.distanceKm !== null && (
                      <span className="text-gray-400">· {sh.distanceKm} km</span>
                    )}
                  </span>
                  <span>Rs. {sh.deliveryFee}</span>
                </div>
              ))}

              {!estimate && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery</span>
                  <span>{loadingEstimate ? "Calculating…" : "Rs. 0"}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3 flex justify-between
                              text-sm font-semibold">
                <span>Total Delivery</span>
                <span className="text-green-600">Rs. {deliveryTotal.toFixed(0)}</span>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span className="text-green-600">Rs. {grandTotal.toFixed(0)}</span>
              </div>

              <button
                disabled={placingOrder || loadingEstimate || buildOrderItems.length === 0}
                onClick={handleCheckout}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400
                           text-white font-bold py-4 px-6 rounded-xl text-lg transition
                           shadow-lg disabled:cursor-not-allowed"
              >
                {placingOrder
                  ? "Placing Order…"
                  : loadingEstimate
                  ? "Calculating Delivery…"
                  : "Proceed to Payment"}
              </button>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <div>Distance-based delivery fee</div>
                <div>Secure checkout · Order tracking enabled</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;