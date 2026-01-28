import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Profile = () => {
  const { user, logout, setUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteBox, setShowDeleteBox] = useState(false);

  // ✅ Important: only redirect AFTER auth boot finished
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Optional: refresh /me when entering profile (keeps location updated)
  useEffect(() => {
    const refreshMe = async () => {
      try {
        if (!user) return;
        const res = await api.get("/api/auth/me");
        if (res.data?.user) setUser(res.data.user);
      } catch {
        // ignore
      }
    };
    refreshMe();
  }, [setUser]);

  const coords = user?.location?.coordinates;
  const hasCoords = useMemo(
    () => Array.isArray(coords) && coords.length === 2,
    [coords]
  );

  // GeoJSON: [lng, lat]
  const lat = hasCoords ? coords[1] : null;
  const lng = hasCoords ? coords[0] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  if (!user) return null;

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      await api.delete("/api/auth/me");
      logout();
    } catch {
      alert("Failed to delete account");
    } finally {
      setDeleteLoading(false);
      setShowDeleteBox(false);
    }
  };

  const profileImageUrl = user.profileImage
    ? `${API_BASE_URL}${user.profileImage}`
    : "/avatar.png";

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#1E9C17] to-[#27AE60] p-8 text-white">
          <div className="flex items-center gap-6">
            <img
              src={profileImageUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-white object-cover"
              onError={(e) => (e.currentTarget.src = "/avatar.png")}
            />

            <div>
              <h1 className="text-2xl font-bold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm opacity-90">{user.email}</p>

              <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-white/20">
                {user.role?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10">
          <div className="grid sm:grid-cols-2 gap-6">
            <Info label="User ID" value={user.id || user._id} />
            <Info label="Email" value={user.email} />
            <Info label="Role" value={user.role} />
            <Info label="Status" value="Active" green />

            <Info label="Address" value={user.addressText || "Not set"} />
            <Info
              label="Location"
              value={hasCoords ? `Lat: ${lat}, Lng: ${lng}` : "Not set"}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {/* ✅ Make sure it's a button, not submit */}
            <button
              type="button"
              onClick={() => navigate("/profile/edit")}
              className="bg-[#1E9C17] text-white px-6 py-2 rounded-md hover:bg-[#158212] transition"
            >
              Edit Profile
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteBox(true)}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition"
            >
              Delete Account
            </button>
          </div>

          {showDeleteBox && (
            <div className="border border-red-300 bg-red-50 rounded-lg p-6">
              <h3 className="text-red-700 font-semibold text-lg">
                Confirm Account Deletion
              </h3>

              <p className="text-sm text-red-600 mt-2">
                This action will permanently delete your account and all associated data.
              </p>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition disabled:opacity-60"
                >
                  {deleteLoading ? "Deleting..." : "Yes, Delete"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteBox(false)}
                  className="border px-6 py-2 rounded-md hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value, green }) => (
  <div>
    <label className="text-sm text-gray-500">{label}</label>
    <p className={`font-medium ${green ? "text-green-600" : "text-gray-800"}`}>
      {value}
    </p>
  </div>
);

export default Profile;
