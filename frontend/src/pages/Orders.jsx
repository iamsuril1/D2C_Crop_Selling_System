import React, { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";

const Orders = () => {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQty, clearCart } = useContext(CartContext);

  const [estimate, setEstimate] = useState(null);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [error, setError] = useState("");

  // ✅ FIXED: Build items array for backend API
  const buildOrderItems = useMemo(() => {
    return (cartItems || []).map((it) => ({
      productId: it.id || it.productId || it._id,
      quantity: Math.max(1, Number(it?.quantity || 1)),
    })).filter(it => it.productId); // Only valid items
  }, [cartItems]);

  // Call backend estimate API
  const fetchEstimate = async () => {
    if (buildOrderItems.length === 0) return;
    
    setLoadingEstimate(true);
    setError("");
    try {
      const res = await api.post("/api/orders/estimate", { items: buildOrderItems });
      setEstimate(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to calculate delivery");
    } finally {
      setLoadingEstimate(false);
    }
  };

  // Auto-fetch estimate when cart changes
  useEffect(() => {
    if (buildOrderItems.length > 0) {
      fetchEstimate();
    }
  }, [buildOrderItems.length]);

  // Fallback frontend calculation (if backend fails)
  const fallbackSubtotal = useMemo(() => {
    return (cartItems || []).reduce((sum, it) => {
      const price = Number(it?.price || 0);
      const qty = Number(it?.quantity || 0);
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const subtotal = estimate?.itemsSubtotal || fallbackSubtotal;
  const deliveryTotal = estimate?.deliveryTotal || 0;
  const grandTotal = estimate?.grandTotal || subtotal + deliveryTotal;
  const shipmentCount = estimate?.shipments?.length || 1;

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === "SAVE10") {
      setAppliedPromo("SAVE10");
    } else {
      setAppliedPromo("");
    }
  };

  const buildImgSrc = (item) => {
    if (!item?.image) return "/placeholder-product.jpg";
    const img = String(item.image);
    if (img.startsWith("http")) return img;
    return `${APIBASEURL}${img.startsWith("/") ? img : `/${img}`}`;
  };

  const handleCheckout = async () => {
    if (placingOrder || buildOrderItems.length === 0) return;

    setError("");
    setPlacingOrder(true);

    try {
      const res = await api.post("/api/orders", { items: buildOrderItems });
      
      // ✅ Clear THIS user's cart only
      clearCart();
      
      navigate("/orders-success", { 
        state: { order: res.data } 
      });
    } catch (err) {
      setError(err.response?.data?.message || "Checkout failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart</h1>
          <p className="text-gray-600 mb-8">Your cart is empty.</p>
          <button
            onClick={() => navigate("/consumer")}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition"
          >
            Continue Shopping →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-gray-600 mt-1">
              {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate("/consumer")}
            className="text-green-600 hover:underline font-medium"
          >
            ← Continue Shopping
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => {
              const imgSrc = buildImgSrc(item);
              const key = item?.id || item?.productId || index;

              return (
                <div key={key} className="bg-white border rounded-2xl p-6 flex gap-4 items-start hover:shadow-md transition">
                  <img
                    src={imgSrc}
                    alt={item?.name}
                    className="h-24 w-24 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-product.jpg";
                    }}
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
                            : "Local farm"
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item?.id)}
                        className="text-gray-400 hover:text-red-500 p-1 -m-1 rounded-full hover:bg-red-50 transition"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 border rounded-xl p-1 bg-gray-50">
                        <button
                          type="button"
                          className="px-3 py-2 hover:bg-white rounded-lg transition"
                          onClick={() => updateQty(item?.id, Number(item?.quantity || 1) - 1)}
                          disabled={Number(item?.quantity || 1) <= 1}
                        >
                          −
                        </button>
                        <span className="px-4 py-2 font-bold bg-white rounded-lg min-w-[3rem] text-center">
                          {item?.quantity || 1}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-2 hover:bg-white rounded-lg transition"
                          onClick={() => updateQty(item?.id, Number(item?.quantity || 1) + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right font-bold text-xl text-gray-900">
                        Rs. {(Number(item?.price || 0) * Number(item?.quantity || 1)).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="bg-white border rounded-2xl p-6 lg:sticky lg:top-8 h-fit shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>Rs. {subtotal.toFixed(0)}</span>
              </div>
              
              <div className="flex justify-between text-sm font-medium">
                <span>Delivery ({shipmentCount} shipment{shipmentCount > 1 ? 's' : ''})</span>
                <span className="text-green-600">Rs. {deliveryTotal.toFixed(0)}</span>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Promo code"
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button
                onClick={applyPromo}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                Apply
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
                {error}
              </div>
            )}

            <div className="border-t pt-6 space-y-4">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total</span>
                <span className="text-green-600">Rs. {grandTotal.toFixed(0)}</span>
              </div>
              
              <button
                disabled={placingOrder || loadingEstimate || buildOrderItems.length === 0}
                onClick={handleCheckout}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition shadow-lg disabled:cursor-not-allowed"
              >
                {placingOrder 
                  ? "Placing Order..." 
                  : loadingEstimate 
                    ? "Calculating Delivery..." 
                    : "Place Order"
                }
              </button>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <div>🛡️ Secure checkout</div>
                <div>📱 Order tracking enabled</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
