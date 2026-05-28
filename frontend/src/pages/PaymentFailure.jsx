// PaymentFailure.jsx
import { useNavigate, useSearchParams } from "react-router-dom";

const PaymentFailure = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId  = params.get("order_id") || "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 max-w-md w-full text-center">

        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h2>
        <p className="text-gray-600 text-sm mb-2">
          Your payment was not completed. No money has been deducted.
        </p>
        {orderId && (
          <p className="text-gray-400 text-xs mb-4 sm:mb-6">Order reference: #{orderId.slice(-6)}</p>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 text-sm text-amber-800 mb-4 sm:mb-6 text-left">
          <p className="font-semibold mb-1">What happened?</p>
          <p>You cancelled the payment or an error occurred. Your order is still saved — you can try again or choose a different payment method.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/my-orders")}
            className="border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-50 transition w-full sm:w-auto"
          >
            My Orders
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition w-full sm:w-auto"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;