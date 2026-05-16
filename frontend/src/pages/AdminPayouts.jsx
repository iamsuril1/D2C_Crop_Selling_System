import { useEffect, useState } from "react";
import api from "../api/axios";
import AlertModal   from "../components/AlertModal";
import ConfirmModal from "../components/ConfirmModal";

const AdminPayouts = () => {
  const [tab,          setTab]          = useState("pending");
  const [orders,       setOrders]       = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState(null);
  const [releasing,    setReleasing]    = useState(null);

  const [alertModal,   setAlertModal]   = useState({ isOpen: false, type: "", title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: "", message: "" });

  const showAlert  = (title, message, type = "info") =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert  = () => setAlertModal((p) => ({ ...p, isOpen: false }));
  const closeConfirm = () => setConfirmModal((p) => ({ ...p, isOpen: false, action: null }));

  const loadStats = async () => {
    try {
      const res = await api.get("/api/payouts/stats");
      setStats(res.data);
    } catch { /* non-critical */ }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const endpoint = tab === "pending" ? "/api/payouts/pending" : "/api/payouts/all";
      const res = await api.get(endpoint);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      showAlert("Load Failed", err.response?.data?.message || "Failed to load payouts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadOrders(); }, [tab]);

  const confirmRelease = (orderId, farmerId = null) => {
    const isAll    = !farmerId;
    const title    = isAll ? "Release Full Order Payout" : "Release Shipment Payout";
    const message  = isAll
      ? "Release payments to ALL farmers for this order? Admin keeps delivery fees + platform charge."
      : "Release payment to this farmer? Admin keeps their delivery fee.";

    setConfirmModal({
      isOpen: true,
      title,
      message,
      action: async () => {
        try {
          setReleasing(orderId + (farmerId || ""));
          const url = farmerId
            ? `/api/payouts/${orderId}/release/${farmerId}`
            : `/api/payouts/${orderId}/release`;
          await api.put(url);
          showAlert("Released", "Payment released successfully.", "success");
          await Promise.all([loadOrders(), loadStats()]);
        } catch (err) {
          showAlert("Failed", err.response?.data?.message || "Release failed.", "error");
        } finally {
          setReleasing(null);
        }
      },
    });
  };

  const adminKeeps = (order) =>
    (order.deliveryTotal || 0) + (order.platformCharge || 25);

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-8 py-8">

      <AlertModal
        isOpen={alertModal.isOpen}  onClose={closeAlert}
        type={alertModal.type}      title={alertModal.title}
        message={alertModal.message} confirmText="OK"
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen} onClose={closeConfirm}
        onConfirm={confirmModal.action}
        type="warning"
        title={confirmModal.title}   message={confirmModal.message}
        confirmText="Yes, Release"   cancelText="Cancel"
      />

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Payout Management</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Pending Payouts",   value: stats.pendingCount,              color: "text-yellow-600" },
              { label: "Pending Amount",    value: `Rs. ${stats.pendingAmount}`,    color: "text-yellow-700" },
              { label: "Released Payouts",  value: stats.releasedCount,             color: "text-green-600"  },
              { label: "Admin Revenue",     value: `Rs. ${stats.adminRevenue}`,     color: "text-blue-600"   },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-1.5 mb-6 flex gap-1 border border-gray-100 w-fit">
          {[
            { value: "pending",  label: "Pending Release" },
            { value: "all",      label: "All Payouts"     },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.value ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No {tab === "pending" ? "pending" : ""} payouts found.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const oid        = order._id || order.id;
              const isExpanded = expanded === oid;
              const released   = order.adminPayout?.released;

              return (
                <div
                  key={oid}
                  className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${
                    isExpanded ? "border-green-400" : "border-gray-100"
                  }`}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : oid)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        released ? "bg-green-500" : "bg-yellow-400"
                      }`} />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          Order #{oid?.toString().slice(-6)}
                          <span className="ml-2 text-gray-400 font-normal text-xs">
                            {order.consumer?.firstName} {order.consumer?.lastName}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                          {order.shipments?.length} shipment(s) · {order.orderType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right text-sm hidden sm:block">
                        <p className="text-gray-500">Farmers get</p>
                        <p className="font-bold text-green-700">Rs. {order.itemsSubtotal}</p>
                      </div>
                      <div className="text-right text-sm hidden sm:block">
                        <p className="text-gray-500">Admin keeps</p>
                        <p className="font-bold text-blue-700">Rs. {adminKeeps(order)}</p>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        released
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {released ? "Released" : "Pending"}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-6 py-5 space-y-4">

                      {/* Order money breakdown */}
                      <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-sm text-center">
                        <div>
                          <p className="text-gray-500 text-xs">Consumer Paid</p>
                          <p className="font-bold text-gray-900 text-lg">Rs. {order.totalAmount}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Farmers Receive</p>
                          <p className="font-bold text-green-700 text-lg">Rs. {order.itemsSubtotal}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Admin Keeps</p>
                          <p className="font-bold text-blue-700 text-lg">Rs. {adminKeeps(order)}</p>
                          <p className="text-xs text-gray-400">
                            Delivery Rs.{order.deliveryTotal} + Platform Rs.{order.platformCharge || 25}
                          </p>
                        </div>
                      </div>

                      {/* Per-shipment breakdown */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Shipments
                        </p>
                        {order.shipments?.map((shipment, idx) => {
                          const fid          = (shipment.farmer?._id || shipment.farmer)?.toString();
                          const farmerName   = shipment.farmer
                            ? `${shipment.farmer.firstName} ${shipment.farmer.lastName}`
                            : "Farmer";
                          const isPaid       = shipment.paymentStatus === "paid";
                          const releaseKey   = oid + fid;

                          return (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4">
                              <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                  <p className="font-semibold text-sm text-gray-900">{farmerName}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {shipment.items?.length} item(s) ·
                                    Payment: <span className="capitalize">{shipment.paymentMethod || "pending"}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-right">
                                    <p className="text-gray-500 text-xs">Farmer gets</p>
                                    <p className="font-bold text-green-700">Rs. {shipment.subtotal}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-gray-500 text-xs">Delivery (admin)</p>
                                    <p className="font-bold text-blue-600">Rs. {shipment.deliveryFee}</p>
                                  </div>

                                  {isPaid ? (
                                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                                      ✓ Released
                                    </span>
                                  ) : (
                                    !released && (
                                      <button
                                        onClick={() => confirmRelease(oid, fid)}
                                        disabled={releasing === releaseKey}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                                      >
                                        {releasing === releaseKey ? "..." : "Release"}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Items */}
                              <div className="mt-3 space-y-1">
                                {shipment.items?.map((item, i) => (
                                  <div key={i} className="flex justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                                    <span>{item.name} × {item.quantity}</span>
                                    <span>Rs. {(item.price * item.quantity).toFixed(0)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Release all button */}
                      {!released && (
                        <button
                          onClick={() => confirmRelease(oid)}
                          disabled={!!releasing}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 rounded-xl text-sm transition"
                        >
                          {releasing === oid ? "Releasing..." : "Release All Farmers for This Order"}
                        </button>
                      )}

                      {released && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 text-center font-medium">
                          ✓ All payouts released on {new Date(order.adminPayout.releasedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayouts;