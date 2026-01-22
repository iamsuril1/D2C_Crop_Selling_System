import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const ProductForm = () => {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    price: "",
    quantity: "",
    unit: "kg",
    description: "",
    harvestDate: "",
    shelfLife: ""  // ✅ Required
  });
  
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) { // 10MB
      setError("Image size must be less than 10MB");
      return;
    }
    setImage(file);
    setError("");
  };

  // ✅ FIXED: shelfLife required, harvestDate optional
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      // Frontend validation
      if (!form.shelfLife || Number(form.shelfLife) <= 0) {
        setError("Shelf life is required and must be a positive number");
        setLoading(false);
        return;
      }
      
      if (!form.name?.trim() || !form.category) {
        setError("Name and category are required");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      
      // Clean data
      const cleanData = {
        name: form.name.trim(),
        category: form.category,
        subcategory: form.subcategory?.trim() || "",
        price: Number(form.price),
        quantity: Number(form.quantity),
        unit: form.unit || "kg",
        description: form.description?.trim() || "",
        harvestDate: form.harvestDate || null,     // Optional → null
        shelfLife: Number(form.shelfLife)          // Required → number
      };
      
      Object.entries(cleanData).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      if (image) formData.append("image", image);
      
      console.log("📤 Creating product:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      
      const response = await api.post("/api/products", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      console.log("✅ Created:", response.data);
      navigate("/farmer", { replace: true });
    } catch (err) {
      console.error("❌ Error:", err.response?.data || err);
      setError(err.response?.data?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-10 bg-green-600 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload fresh products to reach more customers directly
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name & Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Fresh Organic Tomatoes"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent required"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent required"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="fruits">Fruits</option>
                      <option value="grains">Grains</option>
                      <option value="herbs">Herbs</option>
                      <option value="dairy">Dairy</option>
                    </select>
                  </div>
                </div>

                {/* Price & Quantity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (Rs.) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">Rs.</span>
                      </div>
                      <input
                        type="number"
                        name="price"
                        placeholder="0.00"
                        value={form.price}
                        onChange={handleChange}
                        className="w-full pl-8 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent required"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      placeholder="0"
                      value={form.quantity}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent required"
                      min="0"
                      required
                    />
                  </div>
                </div>

                {/* Unit & Harvest Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={form.unit}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="piece">piece</option>
                      <option value="dozen">dozen</option>
                      <option value="liter">liter</option>
                      <option value="ml">ml</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harvest Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="harvestDate"
                      value={form.harvestDate}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Shelf Life & Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shelf Life (days) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="shelfLife"
                      placeholder="Days"
                      value={form.shelfLife}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      placeholder="Describe your product quality, farming methods, benefits..."
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images (PNG, JPG up to 10MB)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-all duration-200">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2 group">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto group-hover:bg-gray-200 transition-colors">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                    </label>
                  </div>
                  
                  {image && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-sm text-green-700 font-medium">{image.name}</p>
                      <p className="text-xs text-green-600">
                        {(image.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/farmer")}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-60"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.name || !form.category || 
                             !form.price || !form.quantity || !form.shelfLife}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      "Add Product"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick Tips Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sticky top-12 h-fit">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-10 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-900">Quick Tips</h3>
              </div>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 leading-relaxed">
                    Use crisp, high-quality photos of your produce for better visibility
                  </p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 leading-relaxed">
                    Add relevant details about organic farming, certifications, or unique qualities
                  </p>
                </div>
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700 leading-relaxed">
                    Set competitive pricing based on local market rates for better sales
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
