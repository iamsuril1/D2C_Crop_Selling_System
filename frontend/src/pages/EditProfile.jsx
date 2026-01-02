import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

import { AuthContext } from "../context/AuthContext";

const EditProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    profileImage: null,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
    }));

    if (user.profileImage) {
      setPreview(`${BASE_URL}${user.profileImage}`);
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "profileImage") {
      const file = files[0];
      setFormData((prev) => ({ ...prev, profileImage: file }));
      if (file) setPreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) data.append(key, value);
      });

      const res = await api.put("/api/auth/update-profile", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUser(res.data.user);
      navigate("/profile");
    } catch {
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">

        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Edit Profile
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* IMAGE */}
          <div className="flex items-center gap-6">
            <img
              src={preview || "/avatar.png"}
              alt="Preview"
              className="w-24 h-24 rounded-full border object-cover"
            />

            <label className="cursor-pointer text-sm font-medium text-[#1E9C17]">
              Change Photo
              <input
                type="file"
                name="profileImage"
                accept="image/*"
                hidden
                onChange={handleChange}
              />
            </label>
          </div>

          <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} />
          <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} />
          <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
          <Input
            label="New Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Leave blank to keep current password"
          />

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#1E9C17] text-white px-6 py-2 rounded-md hover:bg-[#158212] transition"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="border px-6 py-2 rounded-md hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E9C17]"
    />
  </div>
);

export default EditProfile;
