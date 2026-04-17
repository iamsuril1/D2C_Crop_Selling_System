import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const BULK_THRESHOLD = 100;

const ProductForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:        "",
    category:    "",
    subcategory: "",
    price:       "",
    bulkPrice:   "",      // price for 100kg+ orders
    minOrderQty: "10",    // default 10
    quantity:    "",
    unit:        "kg",
    description: "",
    harvestDate: "",
    shelfLife:   "",
  });

  const [image,   setImage]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB"); return;
    }
    setImage(file);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!form.shelfLife || Number(form.shelfLife) <= 0) {
        setError("Shelf life is required"); setLoading(false); return;
      }
      if (!form.name?.trim() || !form.category) {
        setError("Name and category are required"); setLoading(false); return;
      }
      if (Number(form.minOrderQty) < 1) {
        setError("Minimum order must be at least 1"); setLoading(false); return;
      }
      if (form.bulkPrice && Number(form.bulkPrice) >= Number(form.price)) {
        setError(`Bulk price (Rs. ${form.bulkPrice}) must be less than regular price (Rs. ${form.price})`);
        setLoading(false); return;
      }

      const fd = new FormData();
      const clean = {
        name:        form.name.trim(),
        category:    form.category,
        subcategory: form.subcategory?.trim() || "",
        price:       Number(form.price),
        bulkPrice:   form.bulkPrice ? Number(form.bulkPrice) : "",
        minOrderQty: Number(form.minOrderQty) || 10,
        quantity:    Number(form.quantity),
        unit:        form.unit || "kg",
        description: form.description?.trim() || "",
        harvestDate: form.harvestDate || "",
        shelfLife:   Number(form.shelfLife),
      };

      Object.entries(clean).forEach(([k, v]) => fd.append(k, v));
      if (image) fd.append("image", image);

      await api.post("/api/products", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/farmer", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const showBulkSaving = form.price && form.bulkPrice &&
    Number(form.bulkPrice) < Number(form.price);
  const bulkSavingPct = showBulkSaving
    ? Math.round((1 - Number(form.bulkPrice) / Number(form.price)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-10 bg-green-600 rounded-full" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Product</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload fresh products to reach more customers directly
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700
                                px-4 py-3 rounded-xl mb-6 text-sm">
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
                      type="text" name="name" value={form.name}
                      placeholder="e.g. Fresh Organic Tomatoes"
                      onChange={handleChange} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3
                                 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="category" value={form.category}
                      onChange={handleChange} required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3
                                 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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

                {/* Quantity + Unit + Min Order */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" name="quantity" value={form.quantity}
                      placeholder="0" onChange={handleChange}
                      min="0" required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3
                                 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <select
                      name="unit" value={form.unit} onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3
                                 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      Min. Order ({form.unit || "kg"})
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" name="minOrderQty" value={form.minOrderQty}
                      placeholder="10" onChange={handleChange} min="1"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3
                                 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* ── PRICING SECTION ── */}
                <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-gray-900">Pricing</span>
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5
                                     rounded-full font-medium">
                      Bulk discount optional
                    </span>
                  </div>

                  {/* Regular price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Regular Price (Rs. per {form.unit || "kg"})
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2
                                       text-gray-500 text-sm font-medium">Rs.</span>
                      <input
                        type="number" name="price" value={form.price}
                        placeholder="0.00" onChange={handleChange}
                        step="0.01" min="0" required
                        className="w-full pl-12 border border-gray-200 rounded-xl
                                   px-4 py-3 text-sm focus:outline-none
                                   focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Applied for orders under {BULK_THRESHOLD} {form.unit || "kg"}
                    </p>
                  </div>

                  {/* Bulk price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bulk Price (Rs. per {form.unit || "kg"}) — for {BULK_THRESHOLD}+ {form.unit || "kg"}
                      <span className="ml-2 text-xs text-gray-400 font-normal">Optional</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2
                                       text-gray-500 text-sm font-medium">Rs.</span>
                      <input
                        type="number" name="bulkPrice" value={form.bulkPrice}
                        placeholder="Leave empty for no bulk discount"
                        onChange={handleChange} step="0.01" min="0"
                        className="w-full pl-12 border border-gray-200 rounded-xl
                                   px-4 py-3 text-sm focus:outline-none
                                   focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Must be lower than the regular price. Leave empty to use the same price for all quantities.
                    </p>
                  </div>

                  {/* Live preview */}
                  {form.price && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Pricing Preview
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Under {BULK_THRESHOLD} {form.unit || "kg"}
                        </span>
                        <span className="font-bold text-gray-900">
                          Rs. {Number(form.price).toFixed(2)} / {form.unit || "kg"}
                        </span>
                      </div>
                      {showBulkSaving ? (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {BULK_THRESHOLD}+ {form.unit || "kg"} (bulk)
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-700">
                              Rs. {Number(form.bulkPrice).toFixed(2)} / {form.unit || "kg"}
                            </span>
                            <span className="text-xs bg-green-100 text-green-700
                                             font-bold px-2 py-0.5 rounded-full">
                              -{bulkSavingPct}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {BULK_THRESHOLD}+ {form.unit || "kg"} (bulk)
                          </span>
                          <span className="text-gray-400 italic text-xs">
                            No bulk discount set
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Harvest Date + Shelf Life */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harvest Date (Optional)
                    </label>
                    <input
                      type="date" name="harvestDate" value={form.harvestDate}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3
                                 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shelf Life (days) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" name="shelfLife" value={form.shelfLife}
                      placeholder="Days" onChange={handleChange} min="0"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3
                                 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description" value={form.description}
                    placeholder="Describe your product quality, farming methods, benefits..."
                    onChange={handleChange} rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3
                               text-sm focus:outline-none focus:ring-2 focus:ring-green-500
                               resize-vertical"
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Image (PNG, JPG up to 10MB)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl
                                  p-8 text-center hover:border-green-400 transition">
                    <input
                      type="file" accept="image/jpeg,image/png,image/jpg"
                      onChange={handleImageChange} className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload"
                           className="cursor-pointer flex flex-col items-center gap-2 group">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center
                                      justify-center mx-auto group-hover:bg-gray-200 transition">
                        <svg className="w-8 h-8 text-gray-400" fill="none"
                             stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900
                                    group-hover:text-green-600 transition">
                        Click to upload or drag & drop
                      </p>
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

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button" onClick={() => navigate("/farmer")}
                    disabled={loading}
                    className="flex-1 bg-white border border-gray-200 text-gray-700
                               text-sm font-medium py-3 px-6 rounded-xl hover:bg-gray-50
                               transition disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.name || !form.category ||
                              !form.price || !form.quantity || !form.shelfLife}
                    className="flex-1 bg-green-600 hover:bg-green-700
                               disabled:bg-green-400 disabled:cursor-not-allowed
                               text-white text-sm font-semibold py-3 px-6 rounded-xl
                               transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10"
                                  stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating…
                      </>
                    ) : "Add Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar tips */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100
                            p-8 sticky top-24 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-10 bg-blue-500 rounded-full" />
                <h3 className="text-lg font-bold text-gray-900">Quick Tips</h3>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-700 text-sm leading-relaxed">
                  <strong>Minimum order</strong> prevents very small orders that aren't economical for delivery. Default is 10 kg.
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-700 text-sm leading-relaxed">
                  <strong>Bulk price</strong> kicks in automatically for orders of {BULK_THRESHOLD} kg or more. Attracts restaurants, hotels and traders.
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-700 text-sm leading-relaxed">
                  A <strong>10–15% bulk discount</strong> is a sweet spot that keeps large buyers coming back without hurting your margins.
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-700 text-sm leading-relaxed">
                  Use crisp, well-lit photos. Products with photos get <strong>3× more views</strong>.
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