import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";
import AlertModal from "../components/AlertModal";

const PaymentSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state?.order;

  const [shipmentPayments, setShipmentPayments] = useState([]);
  const [paymentProofs, setPaymentProofs] = useState({});
  const [proofPreviews, setProofPreviews] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [alertModal, setAlertModal] = useState({ isOpen: false, type: "", title: "", message: "", onConfirm: null });

  const showAlert = (title, message, type = "error", onConfirm = null) => {
    setAlertModal({ isOpen: true, title, message, type, onConfirm });
  };

  // FIX: closeAlert now accepts an optional callback so success alerts can
  // trigger navigation AFTER the user dismisses the modal, not before.
  const closeAlert = () => {
    const cb = alertModal.onConfirm;
    setAlertModal((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
    if (cb) cb();
  };

  useEffect(() => {
    if (!order) {
      navigate("/cart", { replace: true });
    }
  }, [order, navigate]);

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to cart...</p>
        </div>
      </div>
    );
  }

  const orderId = order?._id || order?.id;

  useEffect(() => {
    if (!order || !Array.isArray(order.shipments)) return;

    const initial = order.shipments.map(s => {
      const farmerPaymentInfo = s.farmerPaymentInfo || {};
      const availableMethods = ["cash_on_delivery"];
      if (farmerPaymentInfo.esewaId)       availableMethods.push("esewa");
      if (farmerPaymentInfo.qrCodeImage)   availableMethods.push("bank_qr");
      if (farmerPaymentInfo.accountNumber) availableMethods.push("bank_transfer");

      return {
        farmerId: s.farmer?._id || s.farmer,
        farmerName: s.farmer?.firstName ? `${s.farmer.firstName} ${s.farmer.lastName}` : "Farmer",
        amount: (s.subtotal || 0) + (s.deliveryFee || 0),
        selectedMethod: "cash_on_delivery",
        availableMethods,
        farmerPaymentInfo,
        transactionId: "",
        items: s.items || [],
      };
    });

    setShipmentPayments(initial);
  }, [order]);

  const updatePaymentMethod = (farmerId, method) => {
    setShipmentPayments(prev =>
      prev.map(sp => sp.farmerId === farmerId ? { ...sp, selectedMethod: method } : sp)
    );
    setErrors(prev => {
      const e = { ...prev };
      delete e[farmerId];
      delete e[`${farmerId}_transactionId`];
      delete e[`${farmerId}_proof`];
      return e;
    });
  };

  const updateTransactionId = (farmerId, transactionId) => {
    setShipmentPayments(prev =>
      prev.map(sp => sp.farmerId === farmerId ? { ...sp, transactionId } : sp)
    );
    setErrors(prev => { const e = { ...prev }; delete e[`${farmerId}_transactionId`]; return e; });
  };

  const handleProofUpload = (farmerId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [`${farmerId}_proof`]: "File size must be less than 5MB" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrors(prev => ({ ...prev, [`${farmerId}_proof`]: "Please upload an image file" }));
      return;
    }
    setPaymentProofs(prev => ({ ...prev, [farmerId]: file }));
    setProofPreviews(prev => ({ ...prev, [farmerId]: URL.createObjectURL(file) }));
    setErrors(prev => { const e = { ...prev }; delete e[`${farmerId}_proof`]; return e; });
  };

  const validatePayments = () => {
    const newErrors = {};
    shipmentPayments.forEach(sp => {
      if (sp.selectedMethod !== "cash_on_delivery") {
        if (!sp.transactionId?.trim()) {
          newErrors[`${sp.farmerId}_transactionId`] = "Transaction ID is required for online payment";
        }
        if (!paymentProofs[sp.farmerId]) {
          newErrors[`${sp.farmerId}_proof`] = "Payment proof screenshot is required";
        }
      }
    });
    return newErrors;
  };

  const handleSubmitPayments = async () => {
    const validationErrors = validatePayments();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showAlert("Incomplete Payment Info", "Please complete all required payment information.", "warning");
      return;
    }

    setSubmitting(true);

    try {
      const byMethod = shipmentPayments.reduce((acc, sp) => {
        if (!acc[sp.selectedMethod]) acc[sp.selectedMethod] = [];
        acc[sp.selectedMethod].push(sp);
        return acc;
      }, {});

      for (const [method, shipments] of Object.entries(byMethod)) {
        if (method === "cash_on_delivery") {
          await api.post("/api/payments/submit-proof", {
            orderId,
            farmerIds: shipments.map(s => s.farmerId),
            paymentMethod: "cash_on_delivery",
          });
        } else {
          for (const shipment of shipments) {
            const formData = new FormData();
            formData.append("orderId", orderId);
            formData.append("farmerIds", JSON.stringify([shipment.farmerId]));
            formData.append("paymentMethod", method);
            formData.append("transactionId", shipment.transactionId || "");
            const proof = paymentProofs[shipment.farmerId];
            if (proof) formData.append("paymentProof", proof);
            await api.post("/api/payments/submit-proof", formData);
          }
        }
      }

      const orderDisplayId = orderId?.toString().slice(-6) || "unknown";

      // FIX: Show alert first; navigate to /consumer only AFTER user dismisses it.
      // Previously: navigate() was called before showAlert(), so the modal appeared
      // on the consumer dashboard instead of the payment page.
      showAlert(
        "Payment Submitted",
        `Order #${orderDisplayId} has been placed and is being processed.`,
        "success",
        () => navigate("/consumer", { replace: true })
      );
    } catch (err) {
      showAlert("Payment Failed", err.response?.data?.message || "Failed to submit payment. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = shipmentPayments.reduce((sum, sp) => sum + sp.amount, 0);
  const hasCOD = shipmentPayments.some(sp => sp.selectedMethod === "cash_on_delivery");
  const hasOnline = shipmentPayments.some(sp => sp.selectedMethod !== "cash_on_delivery");
  const orderDisplayId = orderId?.toString().slice(-6) || "N/A";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
      />

      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <span>Order #{orderDisplayId}</span>
              <span>•</span>
              <span>{shipmentPayments.length} farmer{shipmentPayments.length > 1 ? "s" : ""}</span>
              <span>•</span>
              <span>Total: Rs. {totalAmount.toFixed(0)}</span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Select your preferred payment method for each farmer</li>
                <li>For online payments: Complete the payment and upload proof</li>
                <li>For Cash on Delivery: No action needed, pay when you receive</li>
                <li>Click "Confirm Payment" to complete your order</li>
              </ol>
            </div>

            <div className="mb-6 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-600">
                {hasCOD && (
                  <span className="mr-4">
                    {shipmentPayments.filter(sp => sp.selectedMethod === "cash_on_delivery").length} COD
                  </span>
                )}
                {hasOnline && (
                  <span>
                    {shipmentPayments.filter(sp => sp.selectedMethod !== "cash_on_delivery").length} Online
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-2xl font-bold text-gray-900">Rs. {totalAmount.toFixed(0)}</div>
              </div>
            </div>

            <div className="space-y-6">
              {shipmentPayments.map((sp, index) => (
                <div key={sp.farmerId} className="border-2 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{sp.farmerName}</h3>
                      <p className="text-sm text-gray-500">
                        {sp.items.length} item{sp.items.length !== 1 ? "s" : ""} • Shipment {index + 1}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Amount</div>
                      <div className="text-xl font-bold text-green-600">Rs. {sp.amount.toFixed(0)}</div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Order Items:</p>
                      <div className="space-y-1">
                        {sp.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.name}</span>
                            <span className="text-gray-600">{item.quantity}x Rs. {item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Select Payment Method</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Cash on Delivery */}
                        <button
                          type="button"
                          onClick={() => updatePaymentMethod(sp.farmerId, "cash_on_delivery")}
                          className={`border-2 rounded-xl p-4 text-left transition ${
                            sp.selectedMethod === "cash_on_delivery"
                              ? "border-green-500 bg-green-50 shadow-md"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              sp.selectedMethod === "cash_on_delivery" ? "border-green-500 bg-green-500" : "border-gray-300"
                            }`}>
                              {sp.selectedMethod === "cash_on_delivery" && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <div className="font-semibold">Cash on Delivery</div>
                          </div>
                          <div className="text-xs text-gray-500 ml-8">Pay Rs. {sp.amount.toFixed(0)} when you receive</div>
                        </button>

                        {sp.farmerPaymentInfo?.esewaId && (
                          <button
                            type="button"
                            onClick={() => updatePaymentMethod(sp.farmerId, "esewa")}
                            className={`border-2 rounded-xl p-4 text-left transition ${
                              sp.selectedMethod === "esewa" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                sp.selectedMethod === "esewa" ? "border-blue-500 bg-blue-500" : "border-gray-300"
                              }`}>
                                {sp.selectedMethod === "esewa" && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <div className="font-semibold">eSewa</div>
                            </div>
                            <div className="text-xs text-gray-500 ml-8">ID: {sp.farmerPaymentInfo.esewaId}</div>
                          </button>
                        )}

                        {sp.farmerPaymentInfo?.qrCodeImage && (
                          <button
                            type="button"
                            onClick={() => updatePaymentMethod(sp.farmerId, "bank_qr")}
                            className={`border-2 rounded-xl p-4 text-left transition ${
                              sp.selectedMethod === "bank_qr" ? "border-purple-500 bg-purple-50 shadow-md" : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                sp.selectedMethod === "bank_qr" ? "border-purple-500 bg-purple-500" : "border-gray-300"
                              }`}>
                                {sp.selectedMethod === "bank_qr" && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <div className="font-semibold">Bank QR</div>
                            </div>
                            <div className="text-xs text-gray-500 ml-8">{sp.farmerPaymentInfo.bankName}</div>
                          </button>
                        )}

                        {sp.farmerPaymentInfo?.accountNumber && (
                          <button
                            type="button"
                            onClick={() => updatePaymentMethod(sp.farmerId, "bank_transfer")}
                            className={`border-2 rounded-xl p-4 text-left transition ${
                              sp.selectedMethod === "bank_transfer" ? "border-green-500 bg-green-50 shadow-md" : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                sp.selectedMethod === "bank_transfer" ? "border-green-500 bg-green-500" : "border-gray-300"
                              }`}>
                                {sp.selectedMethod === "bank_transfer" && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                              <div className="font-semibold">Bank Transfer</div>
                            </div>
                            <div className="text-xs text-gray-500 ml-8">{sp.farmerPaymentInfo.bankName}</div>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* eSewa Instructions */}
                    {sp.selectedMethod === "esewa" && sp.farmerPaymentInfo?.esewaId && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-900 mb-3">eSewa Payment Instructions:</h4>
                        <ol className="text-sm space-y-2 list-decimal list-inside text-blue-800 mb-4">
                          <li>Open eSewa app and go to "Send Money"</li>
                          <li>Enter eSewa ID: <strong>{sp.farmerPaymentInfo.esewaId}</strong></li>
                          <li>Enter amount: <strong>Rs. {sp.amount.toFixed(0)}</strong></li>
                          <li>Complete the payment and upload screenshot below</li>
                        </ol>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-blue-900">
                              Transaction ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Enter transaction ID from eSewa"
                              value={sp.transactionId}
                              onChange={(e) => updateTransactionId(sp.farmerId, e.target.value)}
                              className={`w-full border rounded-lg px-4 py-2 ${errors[`${sp.farmerId}_transactionId`] ? "border-red-500" : "border-gray-300"}`}
                            />
                            {errors[`${sp.farmerId}_transactionId`] && (
                              <p className="text-red-500 text-xs mt-1">{errors[`${sp.farmerId}_transactionId`]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-blue-900">
                              Payment Screenshot <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProofUpload(sp.farmerId, e.target.files[0])}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700"
                            />
                            {errors[`${sp.farmerId}_proof`] && (
                              <p className="text-red-500 text-xs mt-1">{errors[`${sp.farmerId}_proof`]}</p>
                            )}
                            {proofPreviews[sp.farmerId] && (
                              <img src={proofPreviews[sp.farmerId]} alt="Payment proof" className="mt-3 w-full max-w-sm rounded-lg border" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank QR Instructions */}
                    {sp.selectedMethod === "bank_qr" && sp.farmerPaymentInfo?.qrCodeImage && (
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                        <h4 className="font-semibold text-purple-900 mb-3">Scan QR Code to Pay:</h4>
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                          <img
                            src={`${APIBASEURL}${sp.farmerPaymentInfo.qrCodeImage}`}
                            alt="QR Code"
                            className="w-48 h-48 object-contain border-2 border-purple-300 rounded-lg bg-white p-2"
                          />
                          <ol className="text-sm space-y-2 list-decimal list-inside text-purple-800">
                            <li>Open {sp.farmerPaymentInfo.bankName} mobile banking</li>
                            <li>Scan the QR code</li>
                            <li>Verify amount: <strong>Rs. {sp.amount.toFixed(0)}</strong></li>
                            <li>Upload screenshot below</li>
                          </ol>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-purple-900">Transaction ID (Optional)</label>
                            <input
                              type="text"
                              placeholder="Enter transaction ID if available"
                              value={sp.transactionId}
                              onChange={(e) => updateTransactionId(sp.farmerId, e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-purple-900">
                              Payment Screenshot <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProofUpload(sp.farmerId, e.target.files[0])}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-50 file:text-purple-700"
                            />
                            {errors[`${sp.farmerId}_proof`] && (
                              <p className="text-red-500 text-xs mt-1">{errors[`${sp.farmerId}_proof`]}</p>
                            )}
                            {proofPreviews[sp.farmerId] && (
                              <img src={proofPreviews[sp.farmerId]} alt="Payment proof" className="mt-3 w-full max-w-sm rounded-lg border" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer Instructions */}
                    {sp.selectedMethod === "bank_transfer" && sp.farmerPaymentInfo?.accountNumber && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <h4 className="font-semibold text-green-900 mb-3">Bank Transfer Details:</h4>
                        <div className="bg-white rounded-lg p-4 mb-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bank:</span>
                            <span className="font-semibold">{sp.farmerPaymentInfo.bankName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Account Number:</span>
                            <span className="font-semibold">{sp.farmerPaymentInfo.accountNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Account Name:</span>
                            <span className="font-semibold">{sp.farmerPaymentInfo.accountName}</span>
                          </div>
                          {sp.farmerPaymentInfo.bankBranch && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Branch:</span>
                              <span className="font-semibold">{sp.farmerPaymentInfo.bankBranch}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-bold text-green-700 text-lg">Rs. {sp.amount.toFixed(0)}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-green-900">
                              Transaction ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Enter transaction ID from your bank"
                              value={sp.transactionId}
                              onChange={(e) => updateTransactionId(sp.farmerId, e.target.value)}
                              className={`w-full border rounded-lg px-4 py-2 ${errors[`${sp.farmerId}_transactionId`] ? "border-red-500" : "border-gray-300"}`}
                            />
                            {errors[`${sp.farmerId}_transactionId`] && (
                              <p className="text-red-500 text-xs mt-1">{errors[`${sp.farmerId}_transactionId`]}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2 text-green-900">
                              Transfer Screenshot <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleProofUpload(sp.farmerId, e.target.files[0])}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700"
                            />
                            {errors[`${sp.farmerId}_proof`] && (
                              <p className="text-red-500 text-xs mt-1">{errors[`${sp.farmerId}_proof`]}</p>
                            )}
                            {proofPreviews[sp.farmerId] && (
                              <img src={proofPreviews[sp.farmerId]} alt="Payment proof" className="mt-3 w-full max-w-sm rounded-lg border" />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* COD Confirmation */}
                    {sp.selectedMethod === "cash_on_delivery" && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <h4 className="font-semibold text-green-900 mb-2">Cash on Delivery</h4>
                        <p className="text-sm text-green-800">
                          You will pay <strong>Rs. {sp.amount.toFixed(0)}</strong> to the farmer when you receive your order.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total & Submit */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Order Amount</div>
                  <div className="text-4xl font-bold text-gray-900">Rs. {totalAmount.toFixed(0)}</div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>{shipmentPayments.length} shipment{shipmentPayments.length > 1 ? "s" : ""}</div>
                </div>
              </div>

              <button
                onClick={handleSubmitPayments}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg text-lg"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Processing Payment...
                  </span>
                ) : (
                  "Confirm Payment and Place Order"
                )}
              </button>

              <p className="text-center text-xs text-gray-500 mt-4">
                By confirming, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;