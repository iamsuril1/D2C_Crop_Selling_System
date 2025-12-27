import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../context/api";

const Profile = () => {
  const { user, loading } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");

    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setProfile(res.data.user);
      } catch (err) {
        console.error(err);
      }
    };

    if (user) fetchProfile();
  }, [user, loading, navigate]);

  if (loading || !profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-[Poppins]">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-8">

        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
            <p className="text-sm text-gray-500">Manage your personal information</p>
          </div>

          <span
            className={`px-4 py-1 rounded-full text-sm font-medium ${
              profile.role === "admin"
                ? "bg-red-100 text-red-600"
                : profile.role === "farmer"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {profile.role.toUpperCase()}
          </span>
        </div>

        {/* Profile Info */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center">
            <label className="text-sm text-gray-500 mb-2">Profile Image</label>
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-xl">
              IMG
            </div>
          </div>

          {/* User Info */}
          <div className="grid gap-4">
            <div>
              <label className="text-sm text-gray-500">User ID</label>
              <p className="text-gray-800 font-medium break-all">{profile._id}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Name</label>
              <p className="text-gray-800 font-medium">{profile.firstName} {profile.lastName}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="text-gray-800 font-medium">{profile.email}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500">Account Status</label>
              <p className="text-green-600 font-medium">Active</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex gap-4">
          <button
            className="bg-[#1E9C17] text-white px-6 py-2 rounded-md hover:bg-[#158212] transition"
            onClick={() => alert("Edit profile – backend coming next")}
          >
            Edit Profile
          </button>

          <button
            className="border border-gray-300 px-6 py-2 rounded-md hover:bg-gray-100 transition"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
