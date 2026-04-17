import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
import AlertModal from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/* ── Leaflet loader ── */
const useLeaflet = () => {
  const [ready, setReady] = useState(typeof window !== "undefined" && !!window.L);
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
};

/* ── Map component ── */
const LocationMap = ({ lat, lng, onLocationChange }) => {
  const mapRef     = useRef(null);
  const leafletMap = useRef(null);
  const markerRef  = useRef(null);
  const leafletReady = useLeaflet();

  useEffect(() => {
    if (!leafletReady || !mapRef.current || leafletMap.current) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { center: [lat || 27.7172, lng || 85.3240], zoom: 15, zoomControl: true });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:#1E9C17;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(30,156,23,0.5);"></div>`,
      iconSize: [36, 36], iconAnchor: [18, 36],
    });

    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e) => {
        const { lat: newLat, lng: newLng } = e.target.getLatLng();
        onLocationChange?.(newLat, newLng);
      });
    }

    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], { icon, draggable: true }).addTo(map);
        markerRef.current.on("dragend", (ev) => {
          const { lat: dLat, lng: dLng } = ev.target.getLatLng();
          onLocationChange?.(dLat, dLng);
        });
      }
      onLocationChange?.(clickLat, clickLng);
    });

    leafletMap.current = map;
  }, [leafletReady]);

  useEffect(() => {
    if (!leafletMap.current || !window.L || !lat || !lng) return;
    markerRef.current?.setLatLng([lat, lng]);
    leafletMap.current.setView([lat, lng], 15);
  }, [lat, lng]);

  if (!leafletReady) {
    return (
      <div className="h-64 rounded-2xl bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-[#1E9C17] rounded-full animate-spin" />
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-72 w-full rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm z-0" style={{ position: "relative" }} />;
};

/* ─────────────────────────────────────────────────────────────
   MAIN PROFILE PAGE
───────────────────────────────────────────────────────────── */
const Profile = () => {
  const { user, logout, setUser, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [savingLocation,  setSavingLocation]  = useState(false);
  const [locationDenied,  setLocationDenied]  = useState(false);

  const [pendingLat,   setPendingLat]   = useState(null);
  const [pendingLng,   setPendingLng]   = useState(null);
  const [addressText,  setAddressText]  = useState("");

  // FIX: password required for account deletion
  const [deletePassword, setDeletePassword] = useState("");

  const [alertModal,   setAlertModal]   = useState({ isOpen: false, type: "", title: "", message: "", onConfirm: null });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: "", title: "", message: "", extra: null });

  const showAlert = (title, message, type = "error", onConfirm = null) =>
    setAlertModal({ isOpen: true, title, message, type, onConfirm });
  const closeAlert = () => {
    const cb = alertModal.onConfirm;
    setAlertModal((p) => ({ ...p, isOpen: false, onConfirm: null }));
    if (cb) cb();
  };
  const closeConfirm = () =>
    setConfirmModal((p) => ({ ...p, isOpen: false, action: null, extra: null }));

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    const refresh = async () => {
      try {
        if (!user) return;
        const res = await api.get("/api/auth/me");
        if (res.data?.user) setUser(res.data.user);
      } catch { /* ignore */ }
    };
    refresh();
  }, []);

  useEffect(() => {
    const coords = user?.location?.coordinates;
    if (Array.isArray(coords) && coords.length === 2) {
      setPendingLng(coords[0]);
      setPendingLat(coords[1]);
    }
    if (user?.addressText) setAddressText(user.addressText);
  }, [user]);

  const savedCoords  = user?.location?.coordinates;
  const hasCoords    = Array.isArray(savedCoords) && savedCoords.length === 2;
  const savedLat     = hasCoords ? savedCoords[1] : null;
  const savedLng     = hasCoords ? savedCoords[0] : null;
  const mapLat       = pendingLat ?? savedLat;
  const mapLng       = pendingLng ?? savedLng;
  const hasMapLocation = mapLat !== null && mapLng !== null;

  const reverseGeocode = async (lat, lng) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data?.display_name) setAddressText(data.display_name);
    } catch { /* non-critical */ }
  };

  // Debounce ref to avoid spamming Nominatim on map drag
  const geocodeTimer = useRef(null);
  const handleMapLocationChange = (lat, lng) => {
    setPendingLat(lat);
    setPendingLng(lng);
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => reverseGeocode(lat, lng), 600);
  };

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      showAlert("Not Supported", "Geolocation is not supported by your browser.", "error");
      return;
    }
    setLocationLoading(true);
    setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPendingLat(lat);
        setPendingLng(lng);
        setLocationLoading(false);
        await reverseGeocode(lat, lng);
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) {
          setLocationDenied(true);
          showAlert("Location Permission Denied", "Allow location access in your browser, or click the map to set it manually.", "warning");
        } else {
          showAlert("Location Error", "Could not get your location. Try clicking the map instead.", "error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveLocation = async () => {
    if (pendingLat === null || pendingLng === null) {
      showAlert("No Location", "Please select a location first.", "warning");
      return;
    }
    setSavingLocation(true);
    try {
      const res = await api.put("/api/auth/location", { lat: pendingLat, lng: pendingLng, addressText });
      setUser((prev) => ({ ...prev, location: res.data.location, addressText: res.data.addressText }));
      showAlert("Location Saved", "Your location has been updated successfully.", "success");
    } catch (err) {
      showAlert("Save Failed", err.response?.data?.message || "Failed to save location.", "error");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleClearLocation = () => {
    setConfirmModal({
      isOpen: true, type: "danger", title: "Clear Location", message: "Remove your saved location from your profile?",
      action: async () => {
        try {
          // FIX: calls the now-registered /api/auth/location/clear endpoint
          await api.put("/api/auth/location/clear");
          setUser((prev) => ({ ...prev, location: null, addressText: "" }));
          setPendingLat(null);
          setPendingLng(null);
          setAddressText("");
          showAlert("Cleared", "Your location has been removed.", "info");
        } catch (err) {
          showAlert("Failed", err.response?.data?.message || "Could not clear location.", "error");
        }
      },
    });
  };

  /* ── Delete account — FIX: now requires password confirmation ── */
  const handleDeleteAccount = () => {
    setDeletePassword("");
    setConfirmModal({
      isOpen: true, type: "danger",
      title: "Delete Account",
      message: "This will permanently delete your account. Enter your password to confirm.",
      extra: "password",
      action: async (password) => {
        if (!password) {
          showAlert("Password Required", "Please enter your password to delete your account.", "warning");
          return;
        }
        try {
          setDeleteLoading(true);
          await api.delete("/api/auth/me", { data: { password } });
          showAlert("Account Deleted", "Your account has been deleted.", "success", () => {
            logout();
            navigate("/login", { replace: true });
          });
        } catch (err) {
          showAlert("Deletion Failed", err.response?.data?.message || "Failed to delete account.", "error");
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading profile…</div>
      </div>
    );
  }
  if (!user) return null;

  const profileImageUrl = user.profileImage ? `${API_BASE_URL}${user.profileImage}` : "/avatar.png";
  const locationChanged = pendingLat !== null && pendingLng !== null && (pendingLat !== savedLat || pendingLng !== savedLng);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">

      <AlertModal isOpen={alertModal.isOpen} onClose={closeAlert} type={alertModal.type} title={alertModal.title} message={alertModal.message} confirmText="OK" onConfirm={alertModal.onConfirm} />

      {/* Custom confirm modal that handles the password-for-delete case */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-2xl text-red-600">⚠</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{confirmModal.title}</h3>
            </div>
            <div className="px-6 py-6 space-y-4">
              <p className="text-gray-700">{confirmModal.message}</p>
              {confirmModal.extra === "password" && (
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button onClick={closeConfirm} className="border border-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition">
                Cancel
              </button>
              <button
                onClick={() => {
                  closeConfirm();
                  confirmModal.action?.(deletePassword);
                }}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition disabled:opacity-60"
              >
                {deleteLoading ? "Deleting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">

        {/* Profile card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#1E9C17] to-[#27AE60] p-8 text-white">
            <div className="flex items-center gap-6">
              <img src={profileImageUrl} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white object-cover" onError={(e) => (e.currentTarget.src = "/avatar.png")} />
              <div>
                <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
                <p className="text-sm opacity-90">{user.email}</p>
                {user.phone && <p className="text-sm opacity-80 mt-0.5">📞 {user.phone}</p>}
                <span className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-white/20">{user.role?.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              <Info label="User ID" value={user.id || user._id} />
              <Info label="Email"   value={user.email} />
              <Info label="Phone"   value={user.phone || "Not set"} />
              <Info label="Role"    value={user.role} />
              <Info label="Status"  value="Active" green />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate("/profile/edit")} className="bg-[#1E9C17] text-white px-6 py-2.5 rounded-xl hover:bg-[#158212] transition font-semibold text-sm">
                Edit Profile
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition font-semibold text-sm disabled:opacity-60"
              >
                {deleteLoading ? "Deleting…" : "Delete Account"}
              </button>
            </div>
          </div>
        </div>

        {/* Location card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 pt-7 pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">My Location</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {hasMapLocation ? "Click the map or drag the pin to update your position" : "Share your location to discover nearby farms and products"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasCoords && (
                  <button type="button" onClick={handleClearLocation} className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition font-medium">
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-2 bg-[#1E9C17] hover:bg-[#158212] disabled:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                >
                  {locationLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Locating…</>
                  ) : (
                    <>📍 Use My Location</>
                  )}
                </button>
              </div>
            </div>
            {locationDenied && (
              <div className="mt-3 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-base mt-0.5">⚠️</span>
                <span>Location access was denied. You can still <strong>click anywhere on the map</strong> to set your location manually.</span>
              </div>
            )}
          </div>

          <div className="p-8 space-y-5">
            {hasMapLocation ? (
              <LocationMap lat={mapLat} lng={mapLng} onLocationChange={handleMapLocationChange} />
            ) : (
              <button
                type="button"
                onClick={handleRequestLocation}
                className="w-full h-64 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-green-50 hover:border-[#1E9C17]/50 flex flex-col items-center justify-center gap-3 transition group"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition">
                  <span className="text-3xl">📍</span>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700 group-hover:text-[#1E9C17] transition text-sm">Click to share your location</p>
                  <p className="text-xs text-gray-400 mt-1">Or deny and click anywhere on the map once it loads</p>
                </div>
              </button>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address label</label>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="e.g. Lalitpur, Bagmati Province, Nepal"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E9C17]/40 focus:border-[#1E9C17]"
              />
              <p className="text-xs text-gray-400 mt-1">Auto-filled from the map, but you can edit it.</p>
            </div>

            {hasMapLocation && (
              <div className="flex gap-3">
                <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Latitude</span>
                  <span className="font-mono font-semibold text-gray-800">{mapLat.toFixed(6)}</span>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Longitude</span>
                  <span className="font-mono font-semibold text-gray-800">{mapLng.toFixed(6)}</span>
                </div>
              </div>
            )}

            {hasMapLocation && (
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={savingLocation || (!locationChanged && hasCoords)}
                className={`w-full font-semibold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2 ${
                  locationChanged || !hasCoords
                    ? "bg-[#1E9C17] hover:bg-[#158212] text-white shadow-lg shadow-green-900/20"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                } disabled:opacity-60`}
              >
                {savingLocation ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Saving…</>
                ) : locationChanged || !hasCoords ? (
                  <>✓ Save Location</>
                ) : (
                  "Location saved ✓"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value, green }) => (
  <div>
    <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
    <p className={`font-semibold mt-0.5 ${green ? "text-[#1E9C17]" : "text-gray-800"}`}>{value}</p>
  </div>
);

export default Profile;