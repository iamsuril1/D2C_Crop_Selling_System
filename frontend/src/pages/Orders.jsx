import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import CartContext from "../context/CartContext";
import APIBASEURL from "../utils/config"; // in your paste you use APIBASEURL in many places [file:31]

export default function Orders() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQty } = useContext(CartContext);

  // Optional promo (UI only)
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");

  const subtotal = useMemo(() => {
    return (cartItems || []).reduce((sum, it) => {
      const price = Number(it.price || 0);
      const qty = Number(it.quantity || 0);
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const packagingFee = 10;
  const deliveryCharge = 0;

  const discount = useMemo(() => {
    if (appliedPromo?.toUpperCase() === "SAVE10") return Math.round(subtotal * 0.1);
    return 0;
  }, [appliedPromo, subtotal]);

  const total = Math.max(0, subtotal + packagingFee + deliveryCharge - discount);

  const applyPromo = () => {
    setAppliedPromo(promo.trim().toUpperCase());
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border p-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600 mt-2">Your cart is empty.</p>
          <button
            type="button"
            onClick={() => navigate("/consumer")}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900">Shopping Cart</h1>
        <p className="text-gray-500 mt-1">Review your items and proceed to checkout</p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: cart items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const imgSrc = item.image ? `${APIBASEURL}${item.image}` : "/placeholder-product.jpg";

              return (
                <div
                  key={item.id}
                  className="bg-white border rounded-2xl p-4 flex gap-4 items-center"
                >
                  <img
                    src={imgSrc}
                    alt={item.name}
                    className="h-20 w-20 rounded-xl object-cover bg-gray-100"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-product.jpg";
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {item?.farmer?.firstName ? `Fresh from ${item.farmer.firstName}` : "Fresh produce"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border rounded-xl overflow-hidden">
                        <button
                          type="button"
                          className="px-3 py-2 hover:bg-gray-50"
                          onClick={() => updateQty(item.id, Number(item.quantity || 1) - 1)}
                        >
                          -
                        </button>
                        <div className="px-4 py-2 min-w-12 text-center font-semibold">
                          {item.quantity}
                        </div>
                        <button
                          type="button"
                          className="px-3 py-2 hover:bg-gray-50"
                          onClick={() => updateQty(item.id, Number(item.quantity || 1) + 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          ₹{Number(item.price || 0) * Number(item.quantity || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ₹{Number(item.price || 0)} per {item.unit || "unit"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="bg-white border rounded-2xl p-4 flex items-center justify-between">
              <div className="text-gray-600">Want to add more items?</div>
              <button
                type="button"
                onClick={() => navigate("/consumer")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-5 py-2 rounded-xl"
              >
                Continue Shopping
              </button>
            </div>
          </div>

          {/* Right: summary */}
          <div className="bg-white border rounded-2xl p-5 h-fit">
            <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

            <div className="mt-4 space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Subtotal ({cartItems.length} items)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="text-green-700 font-semibold">
                  {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Packaging Fee</span>
                <span>₹{packagingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount</span>
                <span className="text-green-700 font-semibold">-₹{discount.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 border-t pt-4 flex justify-between text-base font-extrabold">
              <span>Total Amount</span>
              <span className="text-green-700">₹{total.toFixed(2)}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Enter promo code"
                className="flex-1 border rounded-xl px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={applyPromo}
                className="bg-gray-100 hover:bg-gray-200 px-4 rounded-xl text-sm font-semibold"
              >
                Apply
              </button>
            </div>

            <div className="mt-4 bg-green-50 border border-green-100 rounded-2xl p-4">
              <div className="font-semibold text-green-800">Free Delivery</div>
              <div className="text-xs text-green-700 mt-1">
                Your order qualifies for free delivery!
              </div>
              <div className="text-xs text-green-600 mt-1">
                Estimated delivery: 2-3 business days
              </div>
            </div>

            <button
              type="button"
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-2xl"
              onClick={() => alert("Checkout not implemented yet")}
            >
              Proceed to Checkout →
            </button>

            <div className="mt-3 text-xs text-gray-500 flex justify-center gap-4">
              <span>Secure</span>
              <span>Encrypted</span>
              <span>Safe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
