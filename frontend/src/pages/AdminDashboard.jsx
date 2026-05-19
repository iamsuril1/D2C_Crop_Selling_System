import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AlertModal   from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';

/* ── tiny bar chart ── */
const Bar = ({ pct, color }) => (
  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
    />
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');

  /* ── data ── */
  const [users,    setUsers]    = useState([]);
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [stats,    setStats]    = useState({
    totalUsers: 0, farmers: 0, consumers: 0,
    activeProducts: 0, totalProducts: 0,
    totalOrders: 0, totalRevenue: 0, orderStatuses: {},
  });

  /* ── payout data ── */
  const [payoutTab,     setPayoutTab]     = useState('pending');
  const [payoutOrders,  setPayoutOrders]  = useState([]);
  const [payoutStats,   setPayoutStats]   = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [expandedPay,   setExpandedPay]   = useState(null);
  const [releasing,     setReleasing]     = useState(null);

  /* ── farmer payout stats ── */
  const [farmerPayoutStats, setFarmerPayoutStats] = useState(null);

  /* ── orders tab local state ── */
  const [orderSearch,      setOrderSearch]      = useState('');
  const [orderStatusFilter,setOrderStatusFilter] = useState('all');

  /* ── modals ── */
  const [alertModal,   setAlertModal]   = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, type: 'warning', title: '', message: '' });

  const showAlert    = (title, message, type = 'error') =>
    setAlertModal({ isOpen: true, title, message, type });
  const closeAlert   = () => setAlertModal(p => ({ ...p, isOpen: false }));
  const closeConfirm = () => setConfirmModal(p => ({ ...p, isOpen: false, action: null }));

  /* ── loaders ── */
  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [uRes, pRes, oRes] = await Promise.all([
        api.get('/api/admin/users').catch(() => ({ data: [] })),
        api.get('/api/admin/products').catch(() => ({ data: [] })),
        api.get('/api/admin/orders').catch(() => ({ data: [] })),
      ]);
      const ud = uRes.data || [];
      const pd = pRes.data || [];
      const od = oRes.data || [];
      setUsers(ud); setProducts(pd); setOrders(od);

      const orderStatuses = od.reduce((acc, o) => {
        const s = o.status || 'pending';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalUsers:     ud.length,
        farmers:        ud.filter(u => u.role === 'farmer').length,
        consumers:      ud.filter(u => u.role === 'consumer').length,
        activeProducts: pd.filter(p => p.isActive).length,
        totalProducts:  pd.length,
        totalOrders:    od.length,
        totalRevenue:   od.reduce((s, o) => s + (o.totalAmount || 0), 0),
        orderStatuses,
      });
    } catch {
      showAlert('Load Failed', 'Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutStats = async () => {
    try { const r = await api.get('/api/payouts/stats'); setPayoutStats(r.data); } catch {}
  };
  const loadFarmerPayoutStats = async () => {
    try { const r = await api.get('/api/farmer-payouts/stats'); setFarmerPayoutStats(r.data); } catch {}
  };
  const loadPayoutOrders = async (tab = payoutTab) => {
    setPayoutLoading(true);
    try {
      const r = await api.get(tab === 'pending' ? '/api/payouts/pending' : '/api/payouts/all');
      setPayoutOrders(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      showAlert('Load Failed', err.response?.data?.message || 'Failed to load payouts.', 'error');
    } finally { setPayoutLoading(false); }
  };

  useEffect(() => { loadDashboard(); loadPayoutStats(); loadFarmerPayoutStats(); }, []);
  useEffect(() => { if (activeTab === 'payouts') loadPayoutOrders(payoutTab); }, [activeTab, payoutTab]);

  /* ── release payout ── */
  const confirmRelease = (orderId, farmerId = null) => {
    const isAll = !farmerId;
    setConfirmModal({
      isOpen: true, type: 'warning',
      title:   isAll ? 'Release Full Order Payout' : 'Release Shipment Payout',
      message: isAll
        ? 'Release payments to ALL farmers for this order?'
        : 'Release payment to this farmer?',
      action: async () => {
        const key = orderId + (farmerId || '');
        try {
          setReleasing(key);
          const url = farmerId
            ? `/api/payouts/${orderId}/release/${farmerId}`
            : `/api/payouts/${orderId}/release`;
          await api.put(url);
          showAlert('Released', 'Payment released successfully.', 'success');
          await Promise.all([loadPayoutOrders(payoutTab), loadPayoutStats(), loadFarmerPayoutStats()]);
        } catch (err) {
          showAlert('Failed', err.response?.data?.message || 'Release failed.', 'error');
        } finally { setReleasing(null); }
      },
    });
  };

  const adminKeeps = (o) => (o.deliveryTotal || 0) + (o.platformCharge || 25);

  /* ── order analytics ── */
  const categoryAnalytics = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      order.shipments?.forEach(shipment => {
        shipment.items?.forEach(item => {
        
          const prod = products.find(p =>
            p.name?.toLowerCase() === item.name?.toLowerCase()
          );
          const cat = prod?.category || 'other';
          if (!map[cat]) map[cat] = { count: 0, revenue: 0, orders: new Set() };
          map[cat].count++;
          map[cat].revenue += (item.price || 0) * (item.quantity || 0);
          map[cat].orders.add(order._id || order.id);
        });
      });
    });
    const total = Object.values(map).reduce((s, v) => s + v.count, 0) || 1;
    return Object.entries(map)
      .map(([cat, v]) => ({
        cat,
        count:   v.count,
        revenue: Math.round(v.revenue),
        orders:  v.orders.size,
        pct:     Math.round((v.count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders, products]);

  const CAT_COLORS = {
    vegetables: '#1E9C17',
    fruits:     '#E8A020',
    grains:     '#C4846A',
    herbs:      '#60a5fa',
    dairy:      '#a78bfa',
    other:      '#94a3b8',
  };

  /* ── order type analytics ── */
  const orderTypeAnalytics = useMemo(() => {
    const normal = orders.filter(o => o.orderType === 'normal').length;
    const bulk   = orders.filter(o => o.orderType === 'bulk').length;
    const total  = orders.length || 1;
    return [
      { label: 'Normal', count: normal, pct: Math.round((normal / total) * 100), color: '#1E9C17' },
      { label: 'Bulk',   count: bulk,   pct: Math.round((bulk   / total) * 100), color: '#E8A020' },
    ];
  }, [orders]);

  /* ── filtered orders for the Orders tab ── */
  const filteredOrders = useMemo(() => {
    let list = [...orders];
    if (orderStatusFilter !== 'all')
      list = list.filter(o => o.status === orderStatusFilter);
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      list = list.filter(o =>
        o._id?.toString().slice(-6).toLowerCase().includes(q) ||
        o.consumer?.firstName?.toLowerCase().includes(q) ||
        o.consumer?.lastName?.toLowerCase().includes(q) ||
        o.consumer?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, orderStatusFilter, orderSearch]);

  /* ── tabs ── */
  const TABS = [
    { id: 'overview',       label: 'Overview',    icon: '📊' },
    { id: 'payouts',        label: 'Release',      icon: '🔓' },
    { id: 'farmer-payouts', label: 'Pay Farmers',  icon: '💸' },
    { id: 'orders',         label: 'Orders',       icon: '📦' },
    { id: 'users',          label: 'Users',        icon: '👥' },
    { id: 'products',       label: 'Products',     icon: '🌾' },
  ];

  const handleTabClick = (id) => {
    if (id === 'farmer-payouts') { navigate('/admin/farmer-payouts'); return; }
    setActiveTab(id);
  };

  const statusBadge = (status) => {
    const map = {
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped:   'bg-purple-100 text-purple-800',
      pending:   'bg-yellow-100 text-yellow-800',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading Dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <AlertModal  isOpen={alertModal.isOpen}   onClose={closeAlert}   title={alertModal.title}   message={alertModal.message}   type={alertModal.type}   confirmText="OK" />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={closeConfirm} onConfirm={confirmModal.action} type={confirmModal.type} title={confirmModal.title} message={confirmModal.message} confirmText="Confirm" cancelText="Cancel" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">MeroBari platform management</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {payoutStats?.pendingCount > 0 && (
              <button onClick={() => handleTabClick('payouts')}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm">
                🔓 {payoutStats.pendingCount} to release
              </button>
            )}
            {farmerPayoutStats?.pendingFarmers > 0 && (
              <button onClick={() => navigate('/admin/farmer-payouts')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-xl transition shadow-sm animate-pulse">
                💸 {farmerPayoutStats.pendingFarmers} farmer{farmerPayoutStats.pendingFarmers !== 1 ? 's' : ''} to pay
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-8 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabClick(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center whitespace-nowrap transition ${
                activeTab === t.id ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              <span>{t.icon}</span><span>{t.label}</span>
              {t.id === 'payouts'        && payoutStats?.pendingCount > 0     && <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{payoutStats.pendingCount}</span>}
              {t.id === 'farmer-payouts' && farmerPayoutStats?.pendingFarmers > 0 && <span className="bg-green-400 text-green-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{farmerPayoutStats.pendingFarmers}</span>}
              {t.id === 'orders'         && <span className="bg-gray-200 text-gray-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{stats.totalOrders}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Users',    value: stats.totalUsers,                            sub: `${stats.farmers} farmers · ${stats.consumers} consumers`, icon: '👥', bg: 'bg-green-50',   iconBg: 'bg-green-100',  text: 'text-green-700'   },
                { label: 'Active Products',value: stats.activeProducts,                        sub: `${stats.totalProducts} total`,                            icon: '🌾', bg: 'bg-blue-50',    iconBg: 'bg-blue-100',   text: 'text-blue-700'    },
                { label: 'Total Orders',   value: stats.totalOrders,                           sub: `${stats.orderStatuses['delivered'] || 0} delivered`,       icon: '📦', bg: 'bg-purple-50',  iconBg: 'bg-purple-100', text: 'text-purple-700'  },
                { label: 'Total Revenue',  value: `Rs. ${stats.totalRevenue.toLocaleString()}`,sub: 'All orders combined',                                      icon: '💰', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100',text: 'text-emerald-700' },
              ].map(c => (
                <div key={c.label} className={`${c.bg} rounded-2xl p-6 border border-white shadow-sm`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-600">{c.label}</p>
                    <div className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center text-xl`}>{c.icon}</div>
                  </div>
                  <p className={`text-3xl font-bold ${c.text}`}>{c.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Payout quick-actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payoutStats && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="text-base font-bold text-gray-900">Order Payout Release</h3><p className="text-xs text-gray-400 mt-0.5">Consumer paid → admin releases to farmers</p></div>
                    <button onClick={() => handleTabClick('payouts')} className="text-sm text-green-600 hover:underline font-medium">Manage →</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Pending Release', value: payoutStats.pendingCount,             color: 'text-yellow-600', bg: 'bg-yellow-50' },
                      { label: 'Pending Amount',  value: `Rs. ${payoutStats.pendingAmount}`,   color: 'text-yellow-700', bg: 'bg-yellow-50' },
                      { label: 'Released',        value: payoutStats.releasedCount,            color: 'text-green-600',  bg: 'bg-green-50'  },
                      { label: 'Admin Revenue',   value: `Rs. ${payoutStats.adminRevenue}`,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {farmerPayoutStats && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="text-base font-bold text-gray-900">Farmer Payments</h3><p className="text-xs text-gray-400 mt-0.5">Accumulated balances paid to farmers</p></div>
                    <button onClick={() => navigate('/admin/farmer-payouts')} className="text-sm text-green-600 hover:underline font-medium">Pay Farmers →</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Farmers to Pay',  value: farmerPayoutStats.pendingFarmers,                          color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'Pending Amount',  value: `Rs. ${farmerPayoutStats.pendingAmount?.toLocaleString()}`, color: 'text-orange-700', bg: 'bg-orange-50' },
                      { label: 'Total Paid Out',  value: `Rs. ${farmerPayoutStats.paidAmount?.toLocaleString()}`,   color: 'text-green-600',  bg: 'bg-green-50'  },
                    ].map(s => (
                      <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {farmerPayoutStats.pendingFarmers > 0 && (
                    <button onClick={() => navigate('/admin/farmer-payouts')}
                      className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                      💸 Pay {farmerPayoutStats.pendingFarmers} Farmer{farmerPayoutStats.pendingFarmers !== 1 ? 's' : ''} Now
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Status breakdown + user distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-5">Order Status Breakdown</h3>
                {Object.keys(stats.orderStatuses).length === 0
                  ? <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>
                  : <div className="space-y-3">
                      {Object.entries(stats.orderStatuses).map(([status, count]) => (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-900 capitalize">{status}</span>
                            <span className="font-bold text-gray-700">{count}</span>
                          </div>
                          <Bar pct={(count / stats.totalOrders) * 100} color={
                            status === 'delivered' ? '#10B981' :
                            status === 'cancelled' ? '#EF4444' :
                            status === 'confirmed' ? '#3B82F6' :
                            status === 'shipped'   ? '#8B5CF6' : '#F59E0B'
                          } />
                        </div>
                      ))}
                    </div>
                }
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-5">User Distribution</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Farmers',   value: stats.farmers,   color: 'bg-green-500', bg: 'bg-green-50',  text: 'text-green-700' },
                    { label: 'Consumers', value: stats.consumers, color: 'bg-blue-500',  bg: 'bg-blue-50',   text: 'text-blue-700'  },
                  ].map(u => (
                    <div key={u.label} className={`${u.bg} rounded-xl p-4 flex items-center justify-between`}>
                      <div>
                        <p className="font-semibold text-gray-900">{u.label}</p>
                        <p className={`text-2xl font-bold ${u.text}`}>{u.value}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {((u.value / stats.totalUsers) * 100 || 0).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
                <button onClick={() => setActiveTab('orders')} className="text-sm text-green-600 hover:underline font-medium">View all →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>{['Order ID','Customer','Amount','Status','Date'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.slice(0, 8).map(order => (
                      <tr key={order._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">#{order._id?.toString().slice(-6)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {(order.consumer?.firstName || 'N')[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{order.consumer?.firstName} {order.consumer?.lastName}</p>
                              <p className="text-xs text-gray-400">{order.consumer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">Rs. {(order.totalAmount || 0).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(order.status)}`}>
                            {order.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No orders yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">

            {/* Status summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'All',       value: orders.length,                                            filter: 'all',       color: 'text-gray-900',   bg: 'bg-white',       border: 'border-gray-200'   },
                { label: 'Pending',   value: orders.filter(o => o.status === 'pending').length,        filter: 'pending',   color: 'text-yellow-700', bg: 'bg-yellow-50',   border: 'border-yellow-200' },
                { label: 'Confirmed', value: orders.filter(o => o.status === 'confirmed').length,      filter: 'confirmed', color: 'text-blue-700',   bg: 'bg-blue-50',     border: 'border-blue-200'   },
                { label: 'Shipped',   value: orders.filter(o => o.status === 'shipped').length,        filter: 'shipped',   color: 'text-purple-700', bg: 'bg-purple-50',   border: 'border-purple-200' },
                { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length,      filter: 'delivered', color: 'text-green-700',  bg: 'bg-green-50',    border: 'border-green-200'  },
                { label: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length,      filter: 'cancelled', color: 'text-red-700',    bg: 'bg-red-50',      border: 'border-red-200'    },
              ].map(s => (
                <button
                  key={s.filter}
                  onClick={() => setOrderStatusFilter(s.filter)}
                  className={`${s.bg} border-2 rounded-2xl p-4 text-center transition hover:-translate-y-0.5 hover:shadow-md ${
                    orderStatusFilter === s.filter ? s.border + ' shadow-md' : 'border-transparent'
                  }`}
                >
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Analytics row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Category analytics */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-5">Orders by Crop Category</h3>
                {categoryAnalytics.length === 0
                  ? <p className="text-gray-400 text-sm text-center py-6">No data yet</p>
                  : <div className="space-y-4">
                      {categoryAnalytics.slice(0, 6).map(c => (
                        <div key={c.cat}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: CAT_COLORS[c.cat] || CAT_COLORS.other }}
                              />
                              <span className="font-medium text-gray-800 capitalize">{c.cat}</span>
                              <span className="text-xs text-gray-400">{c.orders} order{c.orders !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500">Rs. {c.revenue.toLocaleString()}</span>
                              <span className="font-bold text-gray-800">{c.pct}%</span>
                            </div>
                          </div>
                          <Bar pct={c.pct} color={CAT_COLORS[c.cat] || CAT_COLORS.other} />
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Order type analytics */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-5">Normal vs Bulk Orders</h3>
                <div className="space-y-4 mb-6">
                  {orderTypeAnalytics.map(t => (
                    <div key={t.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-800 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
                          {t.label}
                        </span>
                        <span className="font-bold text-gray-800">{t.count} ({t.pct}%)</span>
                      </div>
                      <Bar pct={t.pct} color={t.color} />
                    </div>
                  ))}
                </div>

                {/* Revenue breakdown */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Revenue breakdown</p>
                  {[
                    { label: 'Items subtotal', value: orders.reduce((s, o) => s + (o.itemsSubtotal  || 0), 0) },
                    { label: 'Delivery fees',  value: orders.reduce((s, o) => s + (o.deliveryTotal  || 0), 0) },
                    { label: 'Platform fees',  value: orders.reduce((s, o) => s + (o.platformCharge || 25), 0) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.label}</span>
                      <span className="font-semibold text-gray-800">Rs. {r.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total Revenue</span>
                    <span>Rs. {stats.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  {orderStatusFilter === 'all' ? 'All' : orderStatusFilter.charAt(0).toUpperCase() + orderStatusFilter.slice(1)} Orders
                  <span className="ml-2 text-sm font-normal text-gray-400">({filteredOrders.length})</span>
                </h2>
                <input
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="Search by ID, name or email…"
                  className="w-full sm:w-64 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>{['Order ID','Customer','Amount','Type','Status','Shipments','Date'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 font-mono">
                          #{order._id?.toString().slice(-6)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(order.consumer?.firstName || '?')[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {order.consumer?.firstName} {order.consumer?.lastName}
                              </p>
                              <p className="text-xs text-gray-400">{order.consumer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-gray-900">
                          Rs. {(order.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            order.orderType === 'bulk' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {order.orderType || 'normal'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(order.status)}`}>
                            {order.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {order.shipments?.length || 0} shipment{(order.shipments?.length || 0) !== 1 ? 's' : ''}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                        No orders match your filter.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-2xl font-bold text-gray-900">Release Order Payouts</h2>
              <p className="text-sm text-gray-500">
                After releasing, pay farmers via{' '}
                <button onClick={() => navigate('/admin/farmer-payouts')} className="text-green-600 hover:underline font-semibold">Pay Farmers →</button>
              </p>
            </div>

            {payoutStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Pending Payouts', value: payoutStats.pendingCount,           color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-l-yellow-400' },
                  { label: 'Pending Amount',  value: `Rs. ${payoutStats.pendingAmount}`, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-l-yellow-400' },
                  { label: 'Released',        value: payoutStats.releasedCount,          color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-l-green-500'  },
                  { label: 'Admin Revenue',   value: `Rs. ${payoutStats.adminRevenue}`,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-l-blue-500'   },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-xl p-5 border border-gray-100 border-l-4 ${s.border} shadow-sm text-center`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 flex gap-1 w-fit">
              {[{ value: 'pending', label: 'Pending Release' }, { value: 'all', label: 'All Payouts' }].map(t => (
                <button key={t.value} onClick={() => setPayoutTab(t.value)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition ${payoutTab === t.value ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {t.label}
                  {t.value === 'pending' && payoutStats?.pendingCount > 0 && (
                    <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">{payoutStats.pendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            {payoutLoading
              ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" /></div>
              : payoutOrders.length === 0
              ? <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><p className="text-gray-400 text-sm">No {payoutTab === 'pending' ? 'pending' : ''} payouts found.</p></div>
              : (
                <div className="space-y-3">
                  {payoutOrders.map(order => {
                    const oid        = order._id || order.id;
                    const isExpanded = expandedPay === oid;
                    const released   = order.adminPayout?.released;
                    return (
                      <div key={oid} className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${isExpanded ? 'border-green-400' : 'border-gray-100 hover:border-gray-200'}`}>
                        <button onClick={() => setExpandedPay(isExpanded ? null : oid)}
                          className="w-full text-left px-6 py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${released ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 text-sm">
                                Order #{oid?.toString().slice(-6)}
                                <span className="ml-2 text-gray-400 font-normal text-xs">{order.consumer?.firstName} {order.consumer?.lastName}</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString()} · {order.shipments?.length} shipment(s) · {order.orderType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className="text-right hidden sm:block"><p className="text-xs text-gray-400">Farmers get</p><p className="font-bold text-green-700 text-sm">Rs. {order.itemsSubtotal}</p></div>
                            <div className="text-right hidden sm:block"><p className="text-xs text-gray-400">Admin keeps</p><p className="font-bold text-blue-700 text-sm">Rs. {adminKeeps(order)}</p></div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${released ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{released ? 'Released' : 'Pending'}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 px-6 py-5 space-y-5">
                            <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-2xl p-5 text-center">
                              <div><p className="text-xs text-gray-500 mb-1">Consumer Paid</p><p className="text-2xl font-bold text-gray-900">Rs. {order.totalAmount}</p></div>
                              <div><p className="text-xs text-gray-500 mb-1">Farmers Receive</p><p className="text-2xl font-bold text-green-700">Rs. {order.itemsSubtotal}</p></div>
                              <div><p className="text-xs text-gray-500 mb-1">Admin Keeps</p><p className="text-2xl font-bold text-blue-700">Rs. {adminKeeps(order)}</p><p className="text-xs text-gray-400">Delivery Rs.{order.deliveryTotal} + Platform Rs.{order.platformCharge || 25}</p></div>
                            </div>
                            <div className="space-y-3">
                              {order.shipments?.map((shipment, idx) => {
                                const fid        = (shipment.farmer?._id || shipment.farmer)?.toString();
                                const farmerName = shipment.farmer ? `${shipment.farmer.firstName} ${shipment.farmer.lastName}` : 'Farmer';
                                const isPaid     = shipment.paymentStatus === 'paid';
                                const releaseKey = oid + fid;
                                return (
                                  <div key={idx} className="border border-gray-200 rounded-xl p-4">
                                    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                                      <div>
                                        <p className="font-semibold text-sm text-gray-900">{farmerName}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{shipment.items?.length} item(s)</p>
                                      </div>
                                      <div className="flex items-center gap-3 text-sm">
                                        <div className="text-right"><p className="text-xs text-gray-400">Farmer gets</p><p className="font-bold text-green-700">Rs. {shipment.subtotal}</p></div>
                                        <div className="text-right"><p className="text-xs text-gray-400">Delivery</p><p className="font-bold text-blue-600">Rs. {shipment.deliveryFee}</p></div>
                                        {isPaid
                                          ? <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg">✓ Released</span>
                                          : !released
                                          ? <button onClick={() => confirmRelease(oid, fid)} disabled={releasing === releaseKey}
                                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">
                                              {releasing === releaseKey ? '…' : 'Release'}
                                            </button>
                                          : null}
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {shipment.items?.map((item, i) => (
                                        <div key={i} className="flex justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                                          <span className="font-medium">{item.name} <span className="text-gray-400 font-normal">×{item.quantity}</span></span>
                                          <span>Rs. {(item.price * item.quantity).toFixed(0)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {!released
                              ? <button onClick={() => confirmRelease(oid)} disabled={!!releasing}
                                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm">
                                  {releasing === oid ? 'Releasing…' : '✓ Release All Farmers for This Order'}
                                </button>
                              : <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 text-center font-medium">
                                  ✓ Released on {new Date(order.adminPayout.releasedAt).toLocaleString()}
                                </div>
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">All Users ({stats.totalUsers})</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50"><tr>{['Name','Email','Phone','Role','Joined'].map(h => <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{(u.firstName || 'U')[0]}</div>
                          <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.phone || '—'}</td>
                      <td className="px-6 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role === 'farmer' ? 'bg-green-100 text-green-800' : u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{u.role}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">All Products ({stats.activeProducts} active / {stats.totalProducts} total)</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50"><tr>{['Product','Farmer','Price','Bulk Price','Quantity','Category','Status'].map(h => <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{p.farmer?.firstName} {p.farmer?.lastName}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">Rs. {p.price}/{p.unit}</td>
                      <td className="px-6 py-4 text-sm">
                        {p.bulkPrice
                          ? <span className="text-amber-700 font-semibold">Rs. {p.bulkPrice}/{p.unit}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{p.quantity} {p.unit}</td>
                      <td className="px-6 py-4"><span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium capitalize">{p.category}</span></td>
                      <td className="px-6 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{p.isActive ? 'Active' : 'Disabled'}</span></td>
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No products found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;