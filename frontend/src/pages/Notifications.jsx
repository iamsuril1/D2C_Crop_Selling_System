import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationContext } from "../context/NotificationContext";

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead, refetch, unreadCount } =
    useContext(NotificationContext);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getNotificationIcon = (type) => {
    const iconMap = {
      order_placed: "📦",
      order_confirmed: "✓",
      order_shipped: "🚚",
      order_delivered: "✓✓",
      order_cancelled: "✗",
      payment_submitted: "💳",
      payment_paid: "✓",
      payment_failed: "✗",
      payment_received: "💰",
      new_product_like: "❤️",
    };
    return iconMap[type] || "🔔";
  };

  const getNotificationColor = (type) => {
    if (type.includes("cancelled") || type.includes("failed")) {
      return "bg-red-50 border-red-200";
    }
    if (type.includes("delivered") || type.includes("paid") || type.includes("received")) {
      return "bg-green-50 border-green-200";
    }
    if (type.includes("shipped")) {
      return "bg-purple-50 border-purple-200";
    }
    if (type.includes("confirmed")) {
      return "bg-blue-50 border-blue-200";
    }
    return "bg-gray-50 border-gray-200";
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigate based on notification type and data
    if (notification.data?.orderId) {
      navigate("/consumer"); // or specific order page
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">
              Stay updated with your orders and activities
              {unreadCount > 0 && (
                <span className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>

          {notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-xl transition"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition hover:shadow-md ${
                  getNotificationColor(notification.type)
                } ${!notification.isRead ? "border-l-4 border-l-green-600" : ""}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        !notification.isRead ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3
                        className={`font-semibold text-gray-900 ${
                          !notification.isRead ? "font-bold" : ""
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-2">{notification.message}</p>

                    {/* Related Order Info */}
                    {notification.relatedOrder && (
                      <div className="mt-3 bg-white bg-opacity-50 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Order Amount:</span>
                          <span className="font-semibold text-gray-900">
                            Rs. {notification.relatedOrder.totalAmount?.toFixed(0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-semibold text-gray-900 capitalize">
                            {notification.relatedOrder.status}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Indicators */}
                    <div className="mt-3 flex items-center gap-3">
                      {!notification.isRead && (
                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                          NEW
                        </span>
                      )}
                      <span className="text-xs text-gray-500 capitalize">
                        {notification.type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Unread Indicator */}
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More (if needed in future) */}
        {notifications.length >= 50 && (
          <div className="mt-6 text-center">
            <button className="text-green-600 hover:text-green-700 font-medium">
              Load more notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;