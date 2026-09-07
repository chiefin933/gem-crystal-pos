import React, { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus } from '../../api/adminApi';
import { Package, Clock, CheckCircle2, Truck, RefreshCw, Smartphone, CreditCard, Search, User, MapPin } from 'lucide-react';

export const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, fulfillmentStatus: string, paymentStatus?: string) => {
    try {
      const updated = await updateOrderStatus(orderId, { fulfillmentStatus, paymentStatus });
      setOrders(prev => prev.map(o => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'ALL' || o.fulfillmentStatus === statusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Customer Orders & Dispatch</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time orders placed via M-Pesa STK push and Card Checkout
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Order #, Customer, or Phone..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st ? 'bg-rose-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Fetching live orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Total (KES)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Update Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-zinc-800/40 transition">
                    <td className="p-4">
                      <div className="font-mono font-bold text-zinc-100">{o.orderNumber}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(o.createdAt).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-200">{o.customerName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{o.customerPhone}</div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-xs">{o.customerCounty}, {o.customerTownCity}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
                        {o.paymentMethod === 'MPESA' ? (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{o.paymentMethod}</span>
                      </div>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        o.paymentStatus === 'PAID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      }`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-zinc-100">
                      KES {o.total.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        o.fulfillmentStatus === 'DELIVERED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        o.fulfillmentStatus === 'SHIPPED' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        o.fulfillmentStatus === 'PROCESSING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-zinc-950 text-rose-300 border border-rose-800'
                      }`}>
                        {o.fulfillmentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {o.fulfillmentStatus === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'PROCESSING', 'PAID')}
                            className="bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700/60 font-semibold px-2.5 py-1 rounded text-[11px] transition"
                          >
                            Process Order
                          </button>
                        )}
                        {o.fulfillmentStatus === 'PROCESSING' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'SHIPPED')}
                            className="bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700/60 font-semibold px-2.5 py-1 rounded text-[11px] transition"
                          >
                            Mark Shipped
                          </button>
                        )}
                        {o.fulfillmentStatus === 'SHIPPED' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'DELIVERED')}
                            className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 font-semibold px-2.5 py-1 rounded text-[11px] transition"
                          >
                            Mark Delivered
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded text-[11px] font-semibold transition ml-1"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white font-mono">Order {selectedOrder.orderNumber}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            {/* Customer info */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs space-y-1">
              <div className="font-bold text-zinc-200 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-rose-400" />
                <span>{selectedOrder.customerName}</span> ({selectedOrder.customerPhone})
              </div>
              <div className="text-zinc-400 flex items-center gap-2 pt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{selectedOrder.customerAddress}, {selectedOrder.customerTownCity}, {selectedOrder.customerCounty}</span>
              </div>
              {selectedOrder.customerNotes && (
                <div className="text-zinc-500 italic pt-1">Note: "{selectedOrder.customerNotes}"</div>
              )}
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Order Items</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {selectedOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 text-xs">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover bg-zinc-900" />
                      <div>
                        <div className="font-bold text-zinc-200">{item.title}</div>
                        <div className="text-[10px] text-zinc-500">{item.size} / {item.color} × {item.quantity}</div>
                      </div>
                    </div>
                    <div className="font-bold text-zinc-100">KES {(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total summary */}
            <div className="border-t border-zinc-800 pt-4 flex justify-between items-center text-xs">
              <div className="text-zinc-400">
                Method: <span className="font-bold text-zinc-200">{selectedOrder.paymentMethod}</span> ({selectedOrder.paymentStatus})
              </div>
              <div className="text-right">
                <span className="text-zinc-400 mr-2">Total Amount:</span>
                <span className="text-base font-black text-rose-400">KES {selectedOrder.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
