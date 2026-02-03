import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { APIBASEURL } from "../utils/config";

const FarmerPaymentSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  
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
      const res = await api.get("/api/auth/me");
      const user = res.data.user;
      
      if (user.paymentMethods && user.paymentMethods.length > 0) {
        setPaymentMethods(user.paymentMethods);
      }
      
      if (user.preferredPaymentMethod) {
        setPreferredMethod(user.preferredPaymentMethod);
      }
    } catch (err) {
      console.error("Failed to load payment methods", err);
    }
  };

  const toggleMethod = (type) => {
    setPaymentMethods(prev =>
      prev.map(m => m.type === type ? { ...m, enabled: !m.enabled } : m)
    );
  };

  const updateMethodField = (type, field, value) => {
    setPaymentMethods(prev =>
      prev.map(m => m.type === type ? { ...m, [field]: value } : m)
    );
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
    
    try {
      const formData = new FormData();
      formData.append("qrCode", file);
      
      const res = await api.post("/api/payments/upload-qr", formData);
      
      updateMethodField("bank_qr", "qrCodeImage", res.data.qrCodeImage);
    } catch (err) {
      alert("Failed to upload QR code");
    }
  };

  const handleSave = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const esewaMethod = paymentMethods.find(m => m.type === "esewa");
  const bankQRMethod = paymentMethods.find(m => m.type === "bank_qr");
  const bankTransferMethod = paymentMethods.find(m => m.type === "bank_transfer");
  const codMethod = paymentMethods.find(m => m.type === "cash_on_delivery");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Settings</h1>
          <p className="text-gray-600 mb-8">Configure how customers can pay you</p>

          {/* Cash on Delivery */}
          <div className="border rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={codMethod?.enabled}
                  onChange={() => toggleMethod("cash_on_delivery")}
                  className="w-5 h-5 text-green-600"
                />
                <div>
                  <h3 className="font-semibold text-lg">Cash on Delivery</h3>
                  <p className="text-sm text-gray-500">Customer pays when they receive the order</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Recommended</span>
            </div>
          </div>

          {/* eSewa */}
          <div className="border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={esewaMethod?.enabled}
                onChange={() => toggleMethod("esewa")}
                className="w-5 h-5 text-green-600"
              />
              <div>
                <h3 className="font-semibold text-lg">eSewa</h3>
                <p className="text-sm text-gray-500">Digital wallet payment</p>
              </div>
            </div>
            
            {esewaMethod?.enabled && (
              <div className="ml-8">
                <label className="block text-sm font-medium mb-2">eSewa ID</label>
                <input
                  type="text"
                  value={esewaMethod.esewaId || ""}
                  onChange={(e) => updateMethodField("esewa", "esewaId", e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            )}
          </div>

          {/* Bank QR */}
          <div className="border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={bankQRMethod?.enabled}
                onChange={() => toggleMethod("bank_qr")}
                className="w-5 h-5 text-green-600"
              />
              <div>
                <h3 className="font-semibold text-lg">Bank QR Code</h3>
                <p className="text-sm text-gray-500">Scan & pay via mobile banking</p>
              </div>
            </div>
            
            {bankQRMethod?.enabled && (
              <div className="ml-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={bankQRMethod.bankName || ""}
                    onChange={(e) => updateMethodField("bank_qr", "bankName", e.target.value)}
                    placeholder="e.g. Nabil Bank"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Upload QR Code</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQRUpload}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                  {(qrPreview || bankQRMethod.qrCodeImage) && (
                    <img
                      src={qrPreview || `${APIBASEURL}${bankQRMethod.qrCodeImage}`}
                      alt="QR Code"
                      className="mt-4 w-48 h-48 object-contain border rounded-lg"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bank Transfer */}
          <div className="border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={bankTransferMethod?.enabled}
                onChange={() => toggleMethod("bank_transfer")}
                className="w-5 h-5 text-green-600"
              />
              <div>
                <h3 className="font-semibold text-lg">Bank Transfer</h3>
                <p className="text-sm text-gray-500">Direct bank account transfer</p>
              </div>
            </div>
            
            {bankTransferMethod?.enabled && (
              <div className="ml-8 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={bankTransferMethod.bankName || ""}
                    onChange={(e) => updateMethodField("bank_transfer", "bankName", e.target.value)}
                    placeholder="e.g. Nabil Bank"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Account Number</label>
                  <input
                    type="text"
                    value={bankTransferMethod.accountNumber || ""}
                    onChange={(e) => updateMethodField("bank_transfer", "accountNumber", e.target.value)}
                    placeholder="XXXXXXXXXXXX"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Account Name</label>
                  <input
                    type="text"
                    value={bankTransferMethod.accountName || ""}
                    onChange={(e) => updateMethodField("bank_transfer", "accountName", e.target.value)}
                    placeholder="Your Name"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Branch</label>
                  <input
                    type="text"
                    value={bankTransferMethod.bankBranch || ""}
                    onChange={(e) => updateMethodField("bank_transfer", "bankBranch", e.target.value)}
                    placeholder="e.g. Patan Branch"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preferred Method */}
          <div className="border rounded-xl p-6 mb-6 bg-gray-50">
            <h3 className="font-semibold mb-3">Preferred Payment Method</h3>
            <select
              value={preferredMethod}
              onChange={(e) => setPreferredMethod(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="cash_on_delivery">Cash on Delivery</option>
              <option value="esewa">eSewa</option>
              <option value="bank_qr">Bank QR</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">This will be suggested to customers first</p>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Payment Settings"}
            </button>
            
            <button
              onClick={() => navigate("/farmer")}
              className="px-6 border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerPaymentSettings;