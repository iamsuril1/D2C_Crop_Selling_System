import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../utils/config";

const getCoords = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });

const EditProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  // Location state
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");
  const [location, setLocation] = useState({
    lat: "",
    lng: "",
    addressText: "",
  });

  const isFarmer = useMemo(() => user?.role === "farmer", [user]);

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

    if (user.profileImage) setPreview(`${API_BASE_URL}${user.profileImage}`);

    // Prefill saved location (GeoJSON: [lng, lat]) [web:59]
    const coords = user?.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords;
      setLocation({
        lat: String(lat),
        lng: String(lng),
        addressText: user.addressText || "",
      });
    } else {
      setLocation((prev) => ({ ...prev, addressText: user.addressText || "" }));
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "profileImage") {
      const file = files?.[0];
      setFormData((prev) => ({ ...prev, profileImage: file || null }));
      if (file) setPreview(URL.createObjectURL(file));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocError("");
    setLocation((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocLoading(true);
      setLocError("");

      const c = await getCoords();
      setLocation((prev) => ({ ...prev, lat: String(c.lat), lng: String(c.lng) }));
    } catch (err) {
      if (err?.code === 1) setLocError("Location permission denied. Please allow location access.");
      else if (err?.code === 2) setLocError("Location unavailable. Try again.");
      else if (err?.code === 3) setLocError("Location timeout. Try again.");
      else setLocError(err?.message || "Failed to get current location");
    } finally {
      setLocLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    try {
      setLocLoading(true);
      setLocError("");

      const latNum = Number(location.lat);
      const lngNum = Number(location.lng);

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        setLocError("Latitude and longitude are required");
        return;
      }

      await api.put("/api/auth/location", {
        lat: latNum,
        lng: lngNum,
        addressText: location.addressText,
      });

      // Refresh user and go to profile
      const meRes = await api.get("/api/auth/me");
      setUser(meRes.data.user);

      navigate("/profile", { replace: true });
    } catch (err) {
      setLocError(err.response?.data?.message || "Failed to update location");
    } finally {
      setLocLoading(false);
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
        <h2 className="text-2xl font-bold mb-6 text-[#1D1D1D]">Edit Profile</h2>

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

          {/* FARMER LOCATION */}
          {isFarmer && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-gray-900">Farm Location</h3>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locLoading}
                  className="border px-4 py-2 rounded-md hover:bg-gray-50 transition disabled:opacity-60"
                >
                  {locLoading ? "Getting location..." : "Use current location"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  name="lat"
                  value={location.lat}
                  onChange={handleLocationChange}
                  placeholder="27.67"
                />
                <Input
                  label="Longitude"
                  name="lng"
                  value={location.lng}
                  onChange={handleLocationChange}
                  placeholder="85.32"
                />
              </div>

              <Input
                label="Address (optional)"
                name="addressText"
                value={location.addressText}
                onChange={handleLocationChange}
                placeholder="Patan, Lalitpur"
              />

              {locError && <p className="text-sm text-red-600">{locError}</p>}

              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={locLoading}
                className="bg-[#1E9C17] text-white px-6 py-2 rounded-md hover:bg-[#158212] transition disabled:opacity-60"
              >
                {locLoading ? "Saving..." : "Save Location"}
              </button>
            </div>
          )}

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
    <label className="block text-sm font-medium text-[#4F4F4F] mb-1">{label}</label>
    <input
      {...props}
      className="w-full border border-[#BDBDBD] rounded-md px-3 py-2 text-[#1D1D1D] focus:outline-none"
      style={{ boxShadow: "0 0 0 2px rgba(30,156,23,0.25)" }}
    />
  </div>
);

export default EditProfile;
