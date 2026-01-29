import { useContext, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { NotificationContext } from "../context/NotificationContext";
import { 
  FaBell, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaSpinner 
} from "react-icons/fa";

const Notifications = () => {
  const { user } = useContext(AuthContext);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    refetch, 
    markAsRead, 
    markAllAsRead,
    hasUnread 
  } = useContext(NotificationContext);

  const [filter, setFilter] = useState("all"); // all, unread, orders
  const [search, setSearch] = useState("");


  const filteredNotifications = notifications
    .filter(notif => {
      if (filter === "unread" && notif.isRead) return false;
      if (filter === "orders" && !notif.type.includes("order_")) return false;
      
      if (search && !(
        notif.title.toLowerCase().includes(search.toLowerCase()) ||
        notif.message.toLowerCase().includes(search.toLowerCase())
      )) return false;
      
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getTypeIcon = (type) => {
    if (type.includes("order_placed")) return { icon: FaCheckCircle, color: "green" };
    if (type.includes("order_confirmed")) return { icon: FaCheckCircle, color: "blue" };
    if (type.includes("order_shipped")) return { icon: FaTruck, color: "orange" };
    if (type.includes("order_delivered")) return { icon: FaCheckCircle, color: "green" };
    if (type.includes("order_cancelled")) return { icon: FaExclamationCircle, color: "red" };
    return { icon: FaBell, color: "gray" };
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <Link to="/login" className="text-blue-600 hover:underline">Login to view notifications</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{notifications.length} total</span>
              {hasUnread && <span>• {unreadCount} unread</span>}
            </div>
          </div>
          
          {hasUnread && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 font-medium rounded-xl transition-all text-sm"
            >
              <FaCheckCircle className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filter tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[
                { key: "all", label: "All", count: notifications.length },
                { key: "unread", label: "Unread", count: unreadCount },
                { key: "orders", label: "Orders", count: notifications.filter(n => n.type.includes("order_")).length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === key
                      ? "bg-white shadow-sm text-green-700"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] ml-auto">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>

            <button
              onClick={refetch}
              disabled={loading}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <FaSpinner className="animate-spin w-4 h-4" /> : null}
              Refresh
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border shadow-sm p-16 text-center">
              <FaBell className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No notifications {filter !== "all" ? `in ${filter}` : "yet"}
              </h3>
              <p className="text-gray-500">
                {search ? "Try adjusting your search" : "Notifications will appear here"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const { icon: Icon, color } = getTypeIcon(notif.type);
              const isUnread = !notif.isRead;
              
              return (
                <div
                  key={notif._id}
                  className={`bg-white rounded-2xl border shadow-sm p-6 hover:shadow-md transition-all cursor-pointer group ${
                    isUnread 
                      ? "border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50" 
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                  onClick={() => !isUnread && markAsRead(notif._id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-${color}-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-6 h-6 text-${color}-600`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-bold text-lg text-gray-900 truncate pr-8">
                          {notif.title}
                        </h4>
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-2 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatDate(notif.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          {notif.type.split("_").map(word => 
                            <span key={word} className="px-2 py-1 bg-gray-100 rounded-full text-xs capitalize">
                              {word}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {notif.data?.orderId && (
                    <Link 
                      to={`/order/${notif.data.orderId}`}
                      className="block mt-3 pt-3 border-t border-gray-100 text-sm font-medium text-blue-600 hover:text-blue-700 transition-all"
                    >
                      View order details →
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Load more if needed */}
        {filteredNotifications.length > 0 && (
          <div className="text-center mt-8 p-8">
            <button
              onClick={refetch}
              disabled={loading}
              className="px-8 py-3 border border-gray-300 rounded-2xl hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh for more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
