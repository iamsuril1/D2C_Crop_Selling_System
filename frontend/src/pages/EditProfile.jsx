import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../utils/config";

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
      setPreview(`${API_BASE_URL}${user.profileImage}`);
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
    <div className="min-h-screen bg-[#E0E0E0] py-12 px-4">
      <div className="max-w-2xl mx-auto bg-[#FFFFFF] rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-[#1D1D1D]">
          Edit Profile
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IMAGE */}
          <div className="flex items-center gap-6">
            <img
              src={preview || "/avatar.png"}
              alt="Preview"
              className="w-24 h-24 rounded-full border border-[#BDBDBD] object-cover"
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

          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
          />

          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />

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
              className="bg-[#1E9C17] text-[#FFFFFF] px-6 py-2 rounded-md transition disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="border border-[#BDBDBD] text-[#333333] px-6 py-2 rounded-md transition hover:bg-[#E0E0E0]"
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
    <label className="block text-sm font-medium text-[#4F4F4F] mb-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full border border-[#BDBDBD] rounded-md px-3 py-2 text-[#1D1D1D] focus:outline-none"
      style={{ boxShadow: "0 0 0 2px rgba(30,156,23,0.25)" }}
    />
  </div>
);

export default EditProfile;
