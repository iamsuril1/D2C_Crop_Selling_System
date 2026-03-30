import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Profile = () => {
  const { user, logout, setUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [alertModal, setAlertModal] = useState({ isOpen: false, type: "", title: "", message: "", onConfirm: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: "", title: "", message: "" });

  const showAlert = (title, message, type = "error", onConfirm = null) => {
    setAlertModal({ isOpen: true, title, message, type, onConfirm });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  };

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false, action: null }));
  };

  // Only redirect after auth boot finishes
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Refresh /me on mount to keep location updated
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleDeleteAccount = () => {
    setConfirmModal({
      isOpen: true,
      type: "danger",
      title: "Delete Account",
      message: "This action will permanently delete your account and all associated data. Are you sure you want to continue?",
      action: async () => {
        try {
          setDeleteLoading(true);
          await api.delete("/api/auth/me");
          showAlert(
            "Account Deleted",
            "Your account has been successfully deleted.",
            "success",
            () => {
              logout();
              navigate("/login", { replace: true });
            }
          );
        } catch (err) {
          showAlert(
            "Deletion Failed",
            err.response?.data?.message || "Failed to delete account. Please try again.",
            "error"
          );
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  const profileImageUrl = user.profileImage
    ? `${API_BASE_URL}${user.profileImage}`
    : "/avatar.png";

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={alertModal.onConfirm}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.action}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Confirm"
        cancelText="Cancel"
      />

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
            <Info label="User ID"   value={user.id || user._id} />
            <Info label="Email"     value={user.email} />
            <Info label="Role"      value={user.role} />
            <Info label="Status"    value="Active" green />
            <Info label="Address"   value={user.addressText || "Not set"} />
            <Info
              label="Location"
              value={hasCoords ? `Lat: ${lat}, Lng: ${lng}` : "Not set"}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate("/profile/edit")}
              className="bg-[#1E9C17] text-white px-6 py-2 rounded-md hover:bg-[#158212] transition"
            >
              Edit Profile
            </button>

            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition disabled:opacity-60"
            >
              {deleteLoading ? "Deleting..." : "Delete Account"}
            </button>
          </div>
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