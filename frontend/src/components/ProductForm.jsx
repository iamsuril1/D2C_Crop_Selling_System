import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

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
    shelfLife: "",
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) =>
        formData.append(key, form[key])
      );
      if (image) formData.append("image", image);

      await api.post("/api/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/farmer");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to add product"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Main form container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-10 bg-green-600 rounded-full"></div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add New Product
                  </h2>
                  <p className="text-sm text-gray-500">
                    Upload product fresh to reach more customers
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product info row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Fresh Organic Tomatoes"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="fruits">Fruits</option>
                      <option value="grains">Grains</option>
                      <option value="herbs">Herbs</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory
                    </label>
                    <select
                      name="subcategory"
                      value={form.subcategory}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select Subcategory</option>
                      <option value="organic">Organic</option>
                      <option value="conventional">Conventional</option>
                      <option value="heirloom">Heirloom</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-sm">₨</span>
                        </div>
                        <input
                          type="number"
                          name="price"
                          placeholder="0"
                          value={form.price}
                          onChange={handleChange}
                          className="w-full pl-8 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        placeholder="0"
                        value={form.quantity}
                        onChange={handleChange}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
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
                      Harvest Date
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shelf Life
                  </label>
                  <input
                    type="number"
                    name="shelfLife"
                    placeholder="Days"
                    value={form.shelfLife}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
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

                {/* Image upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files[0])}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        Click to upload
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 10MB
                      </p>
                    </label>
                  </div>
                  {image && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {image.name} selected
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/farmer")}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Adding...
                      </>
                    ) : (
                      "Add Product"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick tips sidebar */}
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
                  Add relevant tags for better search ranking
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 leading-relaxed">
                  Set competitive pricing based on market rates
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
