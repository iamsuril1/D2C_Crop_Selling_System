import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const ProductForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    quantity: "",
    unit: "kg",
    description: "",
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow w-full max-w-lg space-y-4"
      >
        <h2 className="text-xl font-bold text-gray-800">
          Add New Product
        </h2>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <input
          type="text"
          name="name"
          placeholder="Product name"
          value={form.name}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="text"
          name="category"
          placeholder="Category"
          value={form.category}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={form.price}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          />

          <input
            type="number"
            name="quantity"
            placeholder="Quantity"
            value={form.quantity}
            onChange={handleChange}
            className="border p-2 rounded"
            required
          />
        </div>

        <select
          name="unit"
          value={form.unit}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        >
          <option value="kg">Kg</option>
          <option value="piece">Piece</option>
          <option value="dozen">Dozen</option>
        </select>

        <textarea
          name="description"
          placeholder="Description (optional)"
          value={form.description}
          onChange={handleChange}
          className="w-full border p-2 rounded"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />

        <button
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          {loading ? "Adding..." : "Add Product"}
        </button>
      </form>
    </div>
  );
};

export default ProductForm;
 