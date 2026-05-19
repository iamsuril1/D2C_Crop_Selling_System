/* src/pages/PaymentSuccess.jsx
   Handles redirect from eSewa after successful payment.
   eSewa  → GET /payment/esewa/success?data=<base64>
   
   Khalti has been removed. FonePay is post-payment (handled via confirm, no redirect).
*/

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";

const PaymentSuccess = () => {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const [status,       setStatus]       = useState("verifying"); // "verifying"|"success"|"error"
  const [message,      setMessage]      = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        /* ── eSewa callback ── */
        const esewaData = params.get("data");
        if (esewaData) {
          const res = await api.post("/api/payments/esewa/verify", { data: esewaData });
          setStatus("success");
          setMessage(`eSewa payment verified for order #${res.data.order?.id?.slice(-6) || ""}`);
          return;
        }

        setStatus("error");
        setMessage("Unknown payment callback. Please check your orders.");
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Payment verification failed. Please contact support.");
      }
    };

    verify();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">

        {status === "verifying" && (
          <>
            <svg className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Verifying payment…</h2>
            <p className="text-gray-500 text-sm">Please wait while we confirm your transaction.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 text-sm mb-6">{message}</p>
            <button
              onClick={() => navigate("/my-orders", { replace: true })}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition"
            >
              View My Orders
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
            <p className="text-gray-600 text-sm mb-6">{message}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/my-orders", { replace: true })}
                className="border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-gray-50 transition"
              >
                My Orders
              </button>
              <button
                onClick={() => navigate("/contact")}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl transition"
              >
                Contact Support
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;