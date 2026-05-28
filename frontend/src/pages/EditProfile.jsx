import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
import AlertModal from "../components/AlertModal";

const getCoords = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });

const EditProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading,    setLoading]    = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [location,   setLocation]   = useState({
    lat: "", lng: "", addressText: "",
  });
  const [formData, setFormData] = useState({
    firstName: "",
    lastName:  "",
    email:     "",
    phone:     "",
    password:  "",
  });
  const [alertModal, setAlertModal] = useState({
    isOpen: false, title: "", message: "", type: "info",
  });

  const isFarmer = user?.role === "farmer";

  const showAlert = (title, message, type = "error") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert = () =>
    setAlertModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (!user) { navigate("/login"); return; }

    setFormData({
      firstName: user.firstName || "",
      lastName:  user.lastName  || "",
      email:     user.email     || "",
      phone:     user.phone     || "",
      password:  "",
    });

    const coords = user?.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      const [lng, lat] = coords;
      setLocation({
        lat:         String(lat),
        lng:         String(lng),
        addressText: user.addressText || "",
      });
    } else {
      setLocation((prev) => ({ ...prev, addressText: user.addressText || "" }));
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocation((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocLoading(true);
      const c = await getCoords();
      setLocation((prev) => ({ ...prev, lat: String(c.lat), lng: String(c.lng) }));
    } catch (err) {
      if      (err?.code === 1) showAlert("Permission Denied",    "Location permission denied. Please allow location access.", "warning");
      else if (err?.code === 2) showAlert("Location Unavailable", "Location unavailable. Please try again.", "warning");
      else if (err?.code === 3) showAlert("Location Timeout",     "Location request timed out. Please try again.", "warning");
      else                      showAlert("Location Error",       err?.message || "Failed to get current location.", "error");
    } finally {
      setLocLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    try {
      setLocLoading(true);
      const latNum = Number(location.lat);
      const lngNum = Number(location.lng);

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        showAlert("Invalid Coordinates", "Latitude and longitude are required.", "warning");
        return;
      }

      await api.put("/api/auth/location", {
        lat:         latNum,
        lng:         lngNum,
        addressText: location.addressText,
      });

      const meRes = await api.get("/api/auth/me");
      setUser(meRes.data.user);
      navigate("/profile", { replace: true });
    } catch (err) {
      showAlert(
        "Save Failed",
        err.response?.data?.message || "Failed to update location.",
        "error"
      );
    } finally {
      setLocLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = {
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        phone:     formData.phone,
      };
      if (formData.password) payload.password = formData.password;

      const res = await api.put("/api/auth/update-profile", payload);
      setUser(res.data.user);
      navigate("/profile");
    } catch (err) {
      showAlert(
        "Update Failed",
        err.response?.data?.message || "Failed to update profile. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12 px-3 sm:px-4">
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText="OK"
      />

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-5 sm:px-8 py-5 sm:py-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Edit Profile</h2>
            <p className="text-green-100 text-sm mt-1">
              Update your account information
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

              {/* Name row — stacks on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <FormField
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                />
                <FormField
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                />
              </div>

              {/* Email */}
              <FormField
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />

              {/* Phone */}
              <FormField
                label="Phone number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength={10}
              />

              {/* Password */}
              <FormField
                label="New password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
              />

              {/* Farmer location section */}
              {isFarmer && (
                <div className="border border-gray-200 rounded-xl p-4 sm:p-5 space-y-4 bg-gray-50">
                  {/* Section header — stacks on small mobile */}
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Farm location</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Used for geo-based product discovery
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locLoading}
                      className="self-start xs:self-auto text-sm border border-gray-300 bg-white px-4 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60 font-medium min-h-[44px] whitespace-nowrap"
                    >
                      {locLoading ? "Getting location…" : "📍 Use current location"}
                    </button>
                  </div>

                  {/* Lat/lng — stacks on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Latitude"
                      name="lat"
                      value={location.lat}
                      onChange={handleLocationChange}
                      placeholder="e.g. 27.67"
                    />
                    <FormField
                      label="Longitude"
                      name="lng"
                      value={location.lng}
                      onChange={handleLocationChange}
                      placeholder="e.g. 85.32"
                    />
                  </div>

                  <FormField
                    label="Address label (optional)"
                    name="addressText"
                    value={location.addressText}
                    onChange={handleLocationChange}
                    placeholder="e.g. Patan, Lalitpur"
                  />

                  <button
                    type="button"
                    onClick={handleSaveLocation}
                    disabled={locLoading}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-60 text-sm font-semibold min-h-[44px]"
                  >
                    {locLoading ? "Saving location…" : "Save location"}
                  </button>
                </div>
              )}

              {/* Actions — stacks on mobile (save on top, cancel below) */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  disabled={loading}
                  className="flex-1 border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition disabled:opacity-60 min-h-[48px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-xl font-semibold text-sm transition disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving…
                    </>
                  ) : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormField = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
    </label>
    <input
      {...props}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white placeholder-gray-400 transition min-h-[44px]"
    />
  </div>
);

export default EditProfile;