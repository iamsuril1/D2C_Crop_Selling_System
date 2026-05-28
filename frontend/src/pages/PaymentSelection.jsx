// PaymentSelection.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import AlertModal from "../components/AlertModal";

const PAYMENT_MODES = {
  PRE:  "pre_payment",
  POST: "post_payment",
};

const POST_METHODS = {
  COD:     "cash_on_delivery",
  FONEPAY: "fonepay",
};

const PaymentSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order    = location.state?.order;

  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES.PRE);
  const [postMethod,  setPostMethod]  = useState(POST_METHODS.COD);
  const [submitting,  setSubmitting]  = useState(false);

  const [alertModal, setAlertModal] = useState({
    isOpen: false, type: "", title: "", message: "", onConfirm: null,
  });

  const showAlert = (title, message, type = "error", onConfirm = null) =>
    setAlertModal({ isOpen: true, title, message, type, onConfirm });
  const closeAlert = () => {
    const cb = alertModal.onConfirm;
    setAlertModal((p) => ({ ...p, isOpen: false, onConfirm: null }));
    if (cb) cb();
  };

  useEffect(() => {
    if (!order) navigate("/cart", { replace: true });
  }, [order, navigate]);

  if (!order) return null;

  const orderId        = order._id || order.id;
  const orderDisplayId = orderId?.toString().slice(-6) || "N/A";
  const farmerIds      = order.shipments?.map((s) =>
    s.farmer?._id || s.farmer?.id || s.farmer
  ) || [];

  const handleEsewa = async () => {
    setSubmitting(true);
    try {
      const res = await api.post("/api/payments/esewa/initiate", { orderId });
      const d   = res.data;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = d.paymentUrl;

      const fields = {
        amount:                    d.amount,
        tax_amount:                d.tax_amount,
        total_amount:              d.total_amount,
        transaction_uuid:          d.transaction_uuid,
        product_code:              d.product_code,
        product_service_charge:    d.product_service_charge,
        product_delivery_charge:   d.product_delivery_charge,
        success_url:               d.success_url,
        failure_url:               d.failure_url,
        signed_field_names:        d.signed_field_names,
        signature:                 d.signature,
      };

      Object.entries(fields).forEach(([key, val]) => {
        const input = document.createElement("input");
        input.type  = "hidden";
        input.name  = key;
        input.value = val;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      showAlert("eSewa Error", err.response?.data?.message || "Failed to initiate eSewa payment.", "error");
      setSubmitting(false);
    }
  };

  const handleCOD = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/payments/cod/confirm", { orderId, farmerIds });
      showAlert(
        "Order Confirmed",
        `Order #${orderDisplayId} placed! Pay cash when your order arrives.`,
        "success",
        () => navigate("/my-orders", { replace: true })
      );
    } catch (err) {
      showAlert("COD Error", err.response?.data?.message || "Failed to confirm COD.", "error");
      setSubmitting(false);
    }
  };

  const handleFonePay = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/payments/fonepay/confirm", { orderId, farmerIds });
      showAlert(
        "Order Confirmed",
        `Order #${orderDisplayId} placed! Pay via FonePay QR scan when your order arrives.`,
        "success",
        () => navigate("/my-orders", { replace: true })
      );
    } catch (err) {
      showAlert("FonePay Error", err.response?.data?.message || "Failed to confirm FonePay order.", "error");
      setSubmitting(false);
    }
  };

  const handlePay = () => {
    if (paymentMode === PAYMENT_MODES.PRE) {
      handleEsewa();
    } else {
      if (postMethod === POST_METHODS.FONEPAY) handleFonePay();
      else handleCOD();
    }
  };

  const total = order.totalAmount || 0;

  const payButtonLabel = () => {
    if (submitting) return null;
    if (paymentMode === PAYMENT_MODES.PRE)
      return `Pay Rs. ${total.toFixed(0)} via eSewa`;
    if (postMethod === POST_METHODS.FONEPAY)
      return `Confirm FonePay on Delivery — Rs. ${total.toFixed(0)}`;
    return `Confirm Cash on Delivery — Rs. ${total.toFixed(0)}`;
  };

  const payButtonColor = () => {
    if (paymentMode === PAYMENT_MODES.PRE) return "bg-green-600 hover:bg-green-700";
    if (postMethod === POST_METHODS.FONEPAY) return "bg-[#8B1A1A] hover:bg-[#6d1414]";
    return "bg-blue-600 hover:bg-blue-700";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3 sm:py-12 sm:px-4">
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
      />

      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-4 sm:p-6 text-white mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">Complete Payment</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-green-100">
            <span>Order #{orderDisplayId}</span>
            <span>·</span>
            <span>{order.shipments?.length} shipment{order.shipments?.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span className="font-bold text-white">Rs. {total.toFixed(0)}</span>
          </div>
        </div>

        {/* Order breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-4 sm:mb-5">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Order Summary</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Items subtotal</span>
              <span>Rs. {(order.itemsSubtotal || 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery total</span>
              <span>Rs. {(order.deliveryTotal || 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform charge</span>
              <span>Rs. {(order.platformCharge || 25).toFixed(0)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>Rs. {total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Payment mode tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4 sm:mb-5">

          {/* Tab headers */}
          <div className="grid grid-cols-2 border-b border-gray-100">
            <button
              type="button"
              onClick={() => setPaymentMode(PAYMENT_MODES.PRE)}
              className={`py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all ${
                paymentMode === PAYMENT_MODES.PRE
                  ? "bg-green-50 text-green-700 border-b-2 border-green-500"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span className="block text-base mb-0.5">💳</span>
              Pre Payment
              <span className="block text-xs font-normal opacity-70 mt-0.5 hidden sm:block">Pay before delivery</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode(PAYMENT_MODES.POST)}
              className={`py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all border-l border-gray-100 ${
                paymentMode === PAYMENT_MODES.POST
                  ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span className="block text-base mb-0.5">🚪</span>
              Post Payment
              <span className="block text-xs font-normal opacity-70 mt-0.5 hidden sm:block">Pay on delivery</span>
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4 sm:p-6">

            {/* Pre Payment */}
            {paymentMode === PAYMENT_MODES.PRE && (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs text-gray-500">
                  Pay securely online before your order is processed. Farmers confirm immediately after payment.
                </p>

                <div className="flex items-center gap-3 sm:gap-4 border-2 border-green-500 bg-green-50 rounded-2xl p-3 sm:p-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-xs sm:text-sm">eSewa</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm sm:text-base">eSewa</p>
                    <p className="text-xs text-gray-500 mt-0.5">Nepal's most popular digital wallet</p>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-800">
                  <p className="font-semibold mb-0.5">✓ Benefits of pre-payment</p>
                  <p>Order is confirmed instantly · Farmer prioritises pre-paid orders · Secure encrypted transaction</p>
                </div>
              </div>
            )}

            {/* Post Payment */}
            {paymentMode === PAYMENT_MODES.POST && (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs text-gray-500">
                  Choose how you'd like to pay when your order arrives at your door.
                </p>

                {/* Cash on Delivery */}
                <label
                  className={`flex items-center gap-3 sm:gap-4 border-2 rounded-2xl p-3 sm:p-4 cursor-pointer transition-all ${
                    postMethod === POST_METHODS.COD
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="postMethod"
                    value={POST_METHODS.COD}
                    checked={postMethod === POST_METHODS.COD}
                    onChange={() => setPostMethod(POST_METHODS.COD)}
                    className="sr-only"
                  />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm sm:text-base">Cash on Delivery</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Hand cash of Rs. {total.toFixed(0)} to the farmer on arrival
                    </p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    postMethod === POST_METHODS.COD ? "border-blue-500 bg-blue-500" : "border-gray-300"
                  }`}>
                    {postMethod === POST_METHODS.COD && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </label>

                {/* FonePay on Delivery */}
                <label
                  className={`flex items-center gap-3 sm:gap-4 border-2 rounded-2xl p-3 sm:p-4 cursor-pointer transition-all ${
                    postMethod === POST_METHODS.FONEPAY
                      ? "border-[#8B1A1A] bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="postMethod"
                    value={POST_METHODS.FONEPAY}
                    checked={postMethod === POST_METHODS.FONEPAY}
                    onChange={() => setPostMethod(POST_METHODS.FONEPAY)}
                    className="sr-only"
                  />
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#8B1A1A] flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-xs leading-tight text-center">Fone<br/>Pay</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <p className="font-bold text-gray-900 text-sm sm:text-base">FonePay on Delivery</p>
                      <span className="text-xs bg-red-100 text-[#8B1A1A] font-semibold px-2 py-0.5 rounded-full">
                        Digital
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Scan the farmer's FonePay QR code when your order arrives
                    </p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    postMethod === POST_METHODS.FONEPAY ? "border-[#8B1A1A] bg-[#8B1A1A]" : "border-gray-300"
                  }`}>
                    {postMethod === POST_METHODS.FONEPAY && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </label>

                {postMethod === POST_METHODS.COD && (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                      <p className="font-semibold mb-0.5">ℹ How it works</p>
                      <p>1. Order placed → Farmer prepares your items</p>
                      <p>2. Farmer delivers → You hand over cash</p>
                      <p>3. Farmer marks payment as received</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                      <p className="font-semibold mb-0.5">⚠ Please note</p>
                      <p>Keep exact change ready. Pre-paid orders may be processed faster.</p>
                    </div>
                  </div>
                )}

                {postMethod === POST_METHODS.FONEPAY && (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-[#8B1A1A]">
                      <p className="font-semibold mb-0.5">ℹ How FonePay on Delivery works</p>
                      <p>1. Order placed → Farmer prepares your items</p>
                      <p>2. Farmer arrives with a FonePay QR code</p>
                      <p>3. Scan the QR in your FonePay app and pay Rs. {total.toFixed(0)}</p>
                      <p>4. Show the farmer your payment confirmation</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                      <p className="font-semibold mb-0.5">⚠ Before placing this order</p>
                      <p>Make sure you have the FonePay app installed and your account is topped up with at least Rs. {total.toFixed(0)}.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={submitting}
          className={`w-full font-bold py-3.5 sm:py-4 rounded-2xl text-white text-base sm:text-lg transition shadow-lg ${
            submitting
              ? "bg-gray-400 cursor-not-allowed"
              : payButtonColor()
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : (
            payButtonLabel()
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3 sm:mt-4">
          By confirming you agree to MeroBari's terms and conditions.
        </p>
      </div>
    </div>
  );
};

export default PaymentSelection;