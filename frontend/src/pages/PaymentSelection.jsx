import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";

const PaymentSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order;

  const [shipmentPayments, setShipmentPayments] = useState([]);
  const [paymentProofs, setPaymentProofs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!order) {
      navigate("/cart");
      return;
    }

    // Initialize payment selection for each shipment
    const initial = order.shipments.map(s => ({
      farmerId: s.farmer._id || s.farmer,
      farmerName: s.farmer.firstName ? `${s.farmer.firstName} ${s.farmer.lastName}` : "Farmer",
      amount: s.subtotal + s.deliveryFee,
      selectedMethod: "cash_on_delivery",
      farmerPaymentInfo: s.farmerPaymentInfo || {},
      transactionId: ""
    }));
    
    setShipmentPayments(initial);
  }, [order, navigate]);

  const updatePaymentMethod = (farmerId, method) => {
    setShipmentPayments(prev =>
      prev.map(sp => sp.farmerId === farmerId ? { ...sp, selectedMethod: method } : sp)
    );
  };

  const updateTransactionId = (farmerId, transactionId) => {
    setShipmentPayments(prev =>
      prev.map(sp => sp.farmerId === farmerId ? { ...sp, transactionId } : sp)
    );
  };

  const handleProofUpload = (farmerId, file) => {
    setPaymentProofs(prev => ({ ...prev, [farmerId]: file }));
  };

  const handleSubmitPayments = async () => {
    setSubmitting(true);
    
    try {
      // Group farmers by payment method
      const byMethod = shipmentPayments.reduce((acc, sp) => {
        if (!acc[sp.selectedMethod]) acc[sp.selectedMethod] = [];
        acc[sp.selectedMethod].push(sp);
        return acc;
      }, {});

      // Submit payment for each method group
      for (const [method, shipments] of Object.entries(byMethod)) {
        if (method === "cash_on_delivery") {
          // No proof needed for COD
          await api.post("/api/payments/submit-proof", {
            orderId: order._id,
            farmerIds: shipments.map(s => s.farmerId),
            paymentMethod: "cash_on_delivery"
          });
        } else {
          // For online payments, upload proof
          for (const shipment of shipments) {
            const formData = new FormData();
            formData.append("orderId", order._id);
            formData.append("farmerIds", JSON.stringify([shipment.farmerId]));
            formData.append("paymentMethod", method);
            formData.append("transactionId", shipment.transactionId || "");
            
            const proof = paymentProofs[shipment.farmerId];
            if (proof) formData.append("paymentProof", proof);
            
            await api.post("/api/payments/submit-proof", formData);
          }
        }
      }

      navigate("/consumer", { replace: true });
      alert("Payment submitted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment</h1>
          <p className="text-gray-600 mb-8">
            Order #{order._id.slice(-6)} - {shipmentPayments.length} farmer{shipmentPayments.length > 1 ? 's' : ''}
          </p>

          <div className="space-y-6">
            {shipmentPayments.map((sp, index) => (
              <div key={sp.farmerId} className="border rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{sp.farmerName}</h3>
                    <p className="text-sm text-gray-500">Shipment {index + 1}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      Rs. {sp.amount}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => updatePaymentMethod(sp.farmerId, "cash_on_delivery")}
                        className={`border rounded-lg p-4 text-left transition ${
                          sp.selectedMethod === "cash_on_delivery"
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold">Cash on Delivery</div>
                        <div className="text-xs text-gray-500 mt-1">Pay when you receive</div>
                      </button>

                      {sp.farmerPaymentInfo?.esewaId && (
                        <button
                          onClick={() => updatePaymentMethod(sp.farmerId, "esewa")}
                          className={`border rounded-lg p-4 text-left transition ${
                            sp.selectedMethod === "esewa"
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-semibold">eSewa</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {sp.farmerPaymentInfo.esewaId}
                          </div>
                        </button>
                      )}

                      {sp.farmerPaymentInfo?.qrCodeImage && (
                        <button
                          onClick={() => updatePaymentMethod(sp.farmerId, "bank_qr")}
                          className={`border rounded-lg p-4 text-left transition ${
                            sp.selectedMethod === "bank_qr"
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-semibold">Bank QR</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {sp.farmerPaymentInfo.bankName}
                          </div>
                        </button>
                      )}

                      {sp.farmerPaymentInfo?.accountNumber && (
                        <button
                          onClick={() => updatePaymentMethod(sp.farmerId, "bank_transfer")}
                          className={`border rounded-lg p-4 text-left transition ${
                            sp.selectedMethod === "bank_transfer"
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-semibold">Bank Transfer</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {sp.farmerPaymentInfo.bankName}
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  {sp.selectedMethod === "esewa" && sp.farmerPaymentInfo?.esewaId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">eSewa Payment Instructions:</h4>
                      <ol className="text-sm space-y-1 list-decimal list-inside">
                        <li>Open eSewa app</li>
                        <li>Send Rs. {sp.amount} to: <strong>{sp.farmerPaymentInfo.esewaId}</strong></li>
                        <li>Enter transaction ID below</li>
                        <li>Upload screenshot as proof</li>
                      </ol>
                      
                      <input
                        type="text"
                        placeholder="Transaction ID"
                        value={sp.transactionId}
                        onChange={(e) => updateTransactionId(sp.farmerId, e.target.value)}
                        className="w-full mt-3 border rounded-lg px-4 py-2"
                      />
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProofUpload(sp.farmerId, e.target.files[0])}
                        className="w-full mt-3 border rounded-lg px-4 py-2"
                      />
                    </div>
                  )}

                  {sp.selectedMethod === "bank_qr" && sp.farmerPaymentInfo?.qrCodeImage && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Scan QR Code:</h4>
                      <img
                        src={`${APIBASEURL}${sp.farmerPaymentInfo.qrCodeImage}`}
                        alt="QR Code"
                        className="w-64 h-64 object-contain border rounded-lg mx-auto my-4"
                      />
                      <p className="text-sm text-center mb-3">
                        Scan with {sp.farmerPaymentInfo.bankName} mobile banking
                      </p>
                      
                      <input
                        type="text"
                        placeholder="Transaction ID (optional)"
                        value={sp.transactionId}
                        onChange={(e) => updateTransactionId(sp.farmerId, e.target.value)}
                        className="w-full border rounded-lg px-4 py-2"
                      />
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProofUpload(sp.farmerId, e.target.files[0])}
                        className="w-full mt-3 border rounded-lg px-4 py-2"
                      />
                    </div>
                  )}

                  {sp.selectedMethod === "bank_transfer" && sp.farmerPaymentInfo?.accountNumber && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Bank Transfer Details:</h4>
                      <div className="text-sm space-y-1">
                        <div><strong>Bank:</strong> {sp.farmerPaymentInfo.bankName}</div>
                        <div><strong>Account Number:</strong> {sp.farmerPaymentInfo.accountNumber}</div>
                        <div><strong>Account Name:</strong> {sp.farmerPaymentInfo.accountName}</div>
                        {sp.farmerPaymentInfo.bankBranch && (
                          <div><strong>Branch:</strong> {sp.farmerPaymentInfo.bankBranch}</div>
                        )}
                        <div><strong>Amount:</strong> Rs. {sp.amount}</div>
                      </div>
                      
                      <input
                        type="text"
                        placeholder="Transaction ID"
                        value={sp.transactionId}
                        onChange={(e) => updateTransactionId(sp.farmerId, e.target.value)}
                        className="w-full mt-3 border rounded-lg px-4 py-2"
                      />
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProofUpload(sp.farmerId, e.target.files[0])}
                        className="w-full mt-3 border rounded-lg px-4 py-2"
                      />
                    </div>
                  )}

                  {sp.selectedMethod === "cash_on_delivery" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Cash on Delivery</h4>
                      <p className="text-sm">
                        Pay Rs. {sp.amount} to the farmer when you receive your order. 
                        Make sure to have exact change ready.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t pt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold">Total Amount</span>
              <span className="text-3xl font-bold text-green-600">
                Rs. {shipmentPayments.reduce((sum, sp) => sum + sp.amount, 0)}
              </span>
            </div>

            <button
              onClick={handleSubmitPayments}
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl disabled:opacity-50"
            >
              {submitting ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;