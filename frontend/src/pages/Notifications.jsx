import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationContext } from "../context/NotificationContext";
import { AuthContext } from "../context/AuthContext";

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { notifications, loading, markAsRead, markAllAsRead, refetch, unreadCount } =
    useContext(NotificationContext);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getNotificationIcon = (type) => {
    const iconMap = {
      order_placed:      "ti-package",
      order_confirmed:   "ti-circle-check",
      order_shipped:     "ti-truck",
      order_delivered:   "ti-checks",
      order_cancelled:   "ti-circle-x",
      payment_submitted: "ti-credit-card",
      payment_paid:      "ti-circle-check",
      payment_failed:    "ti-circle-x",
      payment_received:  "ti-coin",
      new_product_like:  "ti-heart",
      return_requested:  "ti-arrow-back-up",
      return_approved:   "ti-circle-check",
      return_rejected:   "ti-circle-x",
    };
    return iconMap[type] || "ti-bell";
  };

  const getNotificationColor = (type) => {
    if (type?.includes("cancelled") || type?.includes("failed") || type?.includes("rejected")) {
      return "bg-red-50 border-red-200";
    }
    if (
      type?.includes("delivered") ||
      type?.includes("paid") ||
      type?.includes("received") ||
      type?.includes("approved")
    ) {
      return "bg-green-50 border-green-200";
    }
    if (type?.includes("shipped")) {
      return "bg-purple-50 border-purple-200";
    }
    if (type?.includes("confirmed")) {
      return "bg-blue-50 border-blue-200";
    }
    if (type?.includes("return")) {
      return "bg-orange-50 border-orange-200";
    }
    return "bg-gray-50 border-gray-200";
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    const isConsumer = user?.role === "consumer";
    const isFarmer   = user?.role === "farmer";

    if (notification.data?.returnId) {
      if (isConsumer) navigate("/my-orders");
      else if (isFarmer) navigate("/farmer/returns");
      return;
    }

    if (notification.data?.orderId) {
      if (isConsumer) navigate("/my-orders");
      else if (isFarmer) navigate("/farmer/orders");
      return;
    }
  };

  const formatTime = (dateString) => {
    const date      = new Date(dateString);
    const now       = new Date();
    const diffMs    = now - date;
    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);

    if (diffMins < 1)   return "Just now";
    if (diffMins < 60)  return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7)   return `${diffDays}d ago`;
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
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Notifications
            </h1>
            <p className="text-sm sm:text-base text-gray-600 flex flex-wrap items-center gap-2">
              Stay updated with your orders and activities
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs sm:text-sm font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </p>
          </div>

          {notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="self-start sm:self-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-4 sm:px-6 py-2 rounded-xl transition text-sm sm:text-base whitespace-nowrap"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-4">
              <i className="ti ti-bell text-gray-300" style={{ fontSize: "3rem" }} aria-hidden="true" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white rounded-xl shadow-sm border-2 p-4 sm:p-5 cursor-pointer transition hover:shadow-md ${
                  getNotificationColor(notification.type)
                } ${!notification.isRead ? "border-l-4 border-l-green-600" : ""}`}
              >
                <div className="flex items-start gap-3 sm:gap-4">

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                        !notification.isRead ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <i
                        className={`ti ${getNotificationIcon(notification.type)} ${
                          !notification.isRead ? "text-green-700" : "text-gray-500"
                        }`}
                        style={{ fontSize: "1.25rem" }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3
                        className={`text-sm sm:text-base text-gray-900 leading-snug ${
                          !notification.isRead ? "font-bold" : "font-semibold"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-gray-600 text-xs sm:text-sm mb-2 leading-relaxed">
                      {notification.message}
                    </p>

                    {/* Related Order Info */}
                    {notification.relatedOrder && (
                      <div className="mt-2 sm:mt-3 bg-white bg-opacity-50 rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm">
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

                    <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
                      {!notification.isRead && (
                        <span className="px-2.5 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                          NEW
                        </span>
                      )}
                      <span className="text-xs text-gray-500 capitalize">
                        {notification.type?.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notification.isRead && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length >= 50 && (
          <div className="mt-6 text-center">
            <button className="text-green-600 hover:text-green-700 font-medium text-sm sm:text-base">
              Load more notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;