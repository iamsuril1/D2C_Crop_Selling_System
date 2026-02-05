import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";

const FarmerPaymentSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [errors, setErrors] = useState({});
  
  const [paymentMethods, setPaymentMethods] = useState([
    {
      type: "cash_on_delivery",
      enabled: true
    },
    {
      type: "esewa",
      enabled: false,
      esewaId: ""
    },
    {
      type: "bank_qr",
      enabled: false,
      bankName: "",
      qrCodeImage: ""
    },
    {
      type: "bank_transfer",
      enabled: false,
      bankName: "",
      accountNumber: "",
      accountName: "",
      bankBranch: ""
    }
  ]);
  
  const [preferredMethod, setPreferredMethod] = useState("cash_on_delivery");

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/auth/me");
      const user = res.data.user;
      
      if (user.paymentMethods && user.paymentMethods.length > 0) {
        setPaymentMethods(user.paymentMethods);
        
        // Set QR preview if exists
        const bankQR = user.paymentMethods.find(m => m.type === "bank_qr");
        if (bankQR?.qrCodeImage) {
          setQrPreview(`${APIBASEURL}${bankQR.qrCodeImage}`);
        }
      }
      
      if (user.preferredPaymentMethod) {
        setPreferredMethod(user.preferredPaymentMethod);
      }
    } catch (err) {
      console.error("Failed to load payment methods", err);
      alert("Failed to load payment settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleMethod = (type) => {
    setPaymentMethods(prev =>
      prev.map(m => m.type === type ? { ...m, enabled: !m.enabled } : m)
    );
    // Clear errors when toggling
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[type];
      return newErrors;
    });
  };

  const updateMethodField = (type, field, value) => {
    setPaymentMethods(prev =>
      prev.map(m => m.type === type ? { ...m, [field]: value } : m)
    );
    // Clear field-specific error
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${type}_${field}`];
      return newErrors;
    });
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, qr: "File size must be less than 5MB" }));
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, qr: "Please upload an image file" }));
      return;
    }
    
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.qr;
      return newErrors;
    });
    
    try {
      const formData = new FormData();
      formData.append("qrCode", file);
      
      const res = await api.post("/api/payments/upload-qr", formData);
      
      updateMethodField("bank_qr", "qrCodeImage", res.data.qrCodeImage);
      alert("QR code uploaded successfully!");
    } catch (err) {
      setErrors(prev => ({ ...prev, qr: "Failed to upload QR code" }));
      alert("Failed to upload QR code");
    }
  };

  const validatePaymentMethods = () => {
    const newErrors = {};
    
    paymentMethods.forEach(method => {
      if (!method.enabled) return; // Skip disabled methods
      
      switch (method.type) {
        case "esewa":
          if (!method.esewaId || method.esewaId.trim() === "") {
            newErrors[`${method.type}_esewaId`] = "eSewa ID is required";
          } else if (!/^[0-9]{10}$/.test(method.esewaId.trim())) {
            newErrors[`${method.type}_esewaId`] = "eSewa ID must be 10 digits";
          }
          break;
          
        case "bank_qr":
          if (!method.bankName || method.bankName.trim() === "") {
            newErrors[`${method.type}_bankName`] = "Bank name is required";
          }
          if (!method.qrCodeImage) {
            newErrors[`${method.type}_qrCodeImage`] = "QR code image is required";
          }
          break;
          
        case "bank_transfer":
          if (!method.bankName || method.bankName.trim() === "") {
            newErrors[`${method.type}_bankName`] = "Bank name is required";
          }
          if (!method.accountNumber || method.accountNumber.trim() === "") {
            newErrors[`${method.type}_accountNumber`] = "Account number is required";
          }
          if (!method.accountName || method.accountName.trim() === "") {
            newErrors[`${method.type}_accountName`] = "Account name is required";
          }
          break;
      }
    });
    
    // Ensure at least one method is enabled
    const hasEnabled = paymentMethods.some(m => m.enabled);
    if (!hasEnabled) {
      newErrors.general = "At least one payment method must be enabled";
    }
    
    // Ensure preferred method is enabled
    const preferredMethodObj = paymentMethods.find(m => m.type === preferredMethod);
    if (!preferredMethodObj?.enabled) {
      newErrors.preferred = "Preferred payment method must be enabled";
    }
    
    return newErrors;
  };

  const handleSave = async () => {
    // Validate
    const validationErrors = validatePaymentMethods();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      alert("Please fix the errors before saving");
      return;
    }
    
    setSaving(true);
    try {
      await api.put("/api/payments/my-methods", {
        paymentMethods,
        preferredPaymentMethod: preferredMethod
      });
      
      alert("Payment methods updated successfully!");
      navigate("/farmer");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update payment methods");
    } finally {
      setSaving(false);
    }
  };

  const esewaMethod = paymentMethods.find(m => m.type === "esewa");
  const bankQRMethod = paymentMethods.find(m => m.type === "bank_qr");
  const bankTransferMethod = paymentMethods.find(m => m.type === "bank_transfer");
  const codMethod = paymentMethods.find(m => m.type === "cash_on_delivery");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Settings</h1>
            <p className="text-gray-600">Configure how customers can pay you for orders</p>
          </div>

          {/* General Errors */}
          {errors.general && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {errors.general}
            </div>
          )}

          <div className="space-y-6">
            {/* Cash on Delivery */}
            <div className="border rounded-xl p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={codMethod?.enabled}
                    onChange={() => toggleMethod("cash_on_delivery")}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">Cash on Delivery</h3>
                    <p className="text-sm text-gray-500">Customer pays when they receive the order</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </div>
              
              <div className="ml-8 text-sm text-gray-600">
                <p>✓ No online transaction needed</p>
                <p>✓ Customer can verify product before payment</p>
                <p>✓ Most trusted method in Nepal</p>
              </div>
            </div>

            {/* eSewa */}
            <div className={`border rounded-xl p-6 transition ${esewaMethod?.enabled ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={esewaMethod?.enabled}
                  onChange={() => toggleMethod("esewa")}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">eSewa</h3>
                  <p className="text-sm text-gray-500">Digital wallet payment (instant)</p>
                </div>
              </div>
              
              {esewaMethod?.enabled && (
                <div className="ml-8 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      eSewa ID / Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={esewaMethod.esewaId || ""}
                      onChange={(e) => updateMethodField("esewa", "esewaId", e.target.value)}
                      placeholder="98XXXXXXXX (10 digits)"
                      className={`w-full border rounded-lg px-4 py-2 ${
                        errors.esewa_esewaId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      maxLength={10}
                    />
                    {errors.esewa_esewaId && (
                      <p className="text-red-500 text-xs mt-1">{errors.esewa_esewaId}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your eSewa registered mobile number
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bank QR */}
            <div className={`border rounded-xl p-6 transition ${bankQRMethod?.enabled ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={bankQRMethod?.enabled}
                  onChange={() => toggleMethod("bank_qr")}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Bank QR Code</h3>
                  <p className="text-sm text-gray-500">Scan & pay via mobile banking</p>
                </div>
              </div>
              
              {bankQRMethod?.enabled && (
                <div className="ml-8 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bankQRMethod.bankName || ""}
                      onChange={(e) => updateMethodField("bank_qr", "bankName", e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2 ${
                        errors.bank_qr_bankName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Bank</option>
                      <option value="Nabil Bank">Nabil Bank</option>
                      <option value="NIC Asia Bank">NIC Asia Bank</option>
                      <option value="Global IME Bank">Global IME Bank</option>
                      <option value="Himalayan Bank">Himalayan Bank</option>
                      <option value="Nepal Investment Bank">Nepal Investment Bank</option>
                      <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                      <option value="Sanima Bank">Sanima Bank</option>
                      <option value="Prabhu Bank">Prabhu Bank</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.bank_qr_bankName && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_qr_bankName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Upload QR Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQRUpload}
                      className="w-full border rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {errors.qr && (
                      <p className="text-red-500 text-xs mt-1">{errors.qr}</p>
                    )}
                    {errors.bank_qr_qrCodeImage && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_qr_qrCodeImage}</p>
                    )}
                    
                    {(qrPreview || bankQRMethod.qrCodeImage) && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">QR Code Preview:</p>
                        <img
                          src={qrPreview || `${APIBASEURL}${bankQRMethod.qrCodeImage}`}
                          alt="QR Code"
                          className="w-48 h-48 object-contain border rounded-lg bg-white p-2"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 How to get your QR code:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open your mobile banking app</li>
                      <li>Find "Receive Money" or "QR Code" option</li>
                      <li>Take a screenshot of your QR code</li>
                      <li>Upload it here</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Bank Transfer */}
            <div className={`border rounded-xl p-6 transition ${bankTransferMethod?.enabled ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={bankTransferMethod?.enabled}
                  onChange={() => toggleMethod("bank_transfer")}
                  className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Bank Transfer</h3>
                  <p className="text-sm text-gray-500">Direct bank account transfer</p>
                </div>
              </div>
              
              {bankTransferMethod?.enabled && (
                <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bankTransferMethod.bankName || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "bankName", e.target.value)}
                      className={`w-full border rounded-lg px-4 py-2 ${
                        errors.bank_transfer_bankName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Bank</option>
                      <option value="Nabil Bank">Nabil Bank</option>
                      <option value="NIC Asia Bank">NIC Asia Bank</option>
                      <option value="Global IME Bank">Global IME Bank</option>
                      <option value="Himalayan Bank">Himalayan Bank</option>
                      <option value="Nepal Investment Bank">Nepal Investment Bank</option>
                      <option value="Standard Chartered Bank">Standard Chartered Bank</option>
                      <option value="Sanima Bank">Sanima Bank</option>
                      <option value="Prabhu Bank">Prabhu Bank</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.bank_transfer_bankName && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_transfer_bankName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankTransferMethod.accountNumber || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "accountNumber", e.target.value)}
                      placeholder="XXXXXXXXXXXX"
                      className={`w-full border rounded-lg px-4 py-2 ${
                        errors.bank_transfer_accountNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.bank_transfer_accountNumber && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_transfer_accountNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bankTransferMethod.accountName || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "accountName", e.target.value)}
                      placeholder="Your Name"
                      className={`w-full border rounded-lg px-4 py-2 ${
                        errors.bank_transfer_accountName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.bank_transfer_accountName && (
                      <p className="text-red-500 text-xs mt-1">{errors.bank_transfer_accountName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Branch (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankTransferMethod.bankBranch || ""}
                      onChange={(e) => updateMethodField("bank_transfer", "bankBranch", e.target.value)}
                      placeholder="e.g. Patan Branch"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preferred Method */}
            <div className="border-t pt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <span>⭐</span>
                  <span>Preferred Payment Method</span>
                </h3>
                <select
                  value={preferredMethod}
                  onChange={(e) => setPreferredMethod(e.target.value)}
                  className={`w-full border rounded-lg px-4 py-2 ${
                    errors.preferred ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="cash_on_delivery">Cash on Delivery</option>
                  <option value="esewa">eSewa</option>
                  <option value="bank_qr">Bank QR</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
                {errors.preferred && (
                  <p className="text-red-500 text-xs mt-1">{errors.preferred}</p>
                )}
                <p className="text-xs text-gray-600 mt-2">
                  This will be shown first to customers, but they can choose any enabled method
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </span>
              ) : (
                "Save Payment Settings"
              )}
            </button>
            
            <button
              onClick={() => navigate("/farmer")}
              disabled={saving}
              className="px-6 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">💡 Tips for setting up payment methods:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Enable at least 2-3 payment methods for better customer convenience</li>
              <li>Cash on Delivery is the most trusted method in Nepal</li>
              <li>Double-check your account details before saving</li>
              <li>You can update these settings anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerPaymentSettings;
