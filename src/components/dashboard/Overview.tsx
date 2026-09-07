import React, { useEffect, useState } from 'react';
import { fetchAdminStats } from '../../api/adminApi';
import { ShoppingBag, Package, TrendingUp, AlertTriangle, CreditCard, Smartphone, Ticket } from 'lucide-react';

export const Overview: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats()
      .then(res => setStats(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        <span className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading Store KPI Analytics...
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Active Products',
      value: stats?.totalProducts ?? 0,
      icon: ShoppingBag,
      color: 'from-rose-600 to-pink-600',
      sub: 'Visible in Live Storefront',
    },
    {
      title: 'Total Orders Placed',
      value: stats?.totalOrders ?? 0,
      icon: Package,
      color: 'from-amber-500 to-orange-600',
      sub: `${stats?.pendingOrders ?? 0} Pending Fulfillment`,
    },
    {
      title: 'Total Sales Revenue',
      value: `KES ${(stats?.totalRevenue ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-600',
      sub: `Avg Order KES ${Math.round(stats?.avgOrderValue ?? 0).toLocaleString()}`,
    },
    {
      title: 'Active Coupons',
      value: stats?.activeCoupons ?? 0,
      icon: Ticket,
      color: 'from-purple-600 to-indigo-600',
      sub: 'Active Promotional Codes',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Store Analytics & Operational Overview</h1>
          <p className="text-xs text-zinc-400 mt-1">Real-time metrics connected directly to live SQLite database</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          REST API Online (Port 4000)
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{kpi.title}</span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${kpi.color} text-white shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-black text-white">{kpi.value}</div>
                <div className="text-xs text-zinc-400 mt-1 font-medium">{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Channels Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>M-Pesa Collections</span>
            </h2>
            <span className="text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-full">
              Mobile Money Kenya
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400">
            KES {(stats?.mpesaRevenue ?? 0).toLocaleString()}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Direct STK Push & Till payments recorded from storefront orders.
          </p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-rose-400" />
              <span>Card Collections</span>
            </h2>
            <span className="text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800/60 px-2.5 py-1 rounded-full">
              Visa & Mastercard
            </span>
          </div>
          <div className="text-3xl font-black text-rose-400">
            KES {(stats?.cardRevenue ?? 0).toLocaleString()}
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            International & local debit/credit card checkouts.
          </p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Low Stock Inventory Alerts (≤ 5 units)</h2>
          </div>
          <span className="text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-full">
            {stats?.lowStockVariants?.length ?? 0} Item Variants
          </span>
        </div>

        {!stats?.lowStockVariants || stats.lowStockVariants.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">All product variants have healthy stock levels.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Size / Color</th>
                  <th className="p-3 text-right">Qty Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {stats.lowStockVariants.map((item: any) => (
                  <tr key={item.variantId} className="hover:bg-zinc-800/40">
                    <td className="p-3 font-semibold text-zinc-200">{item.productTitle}</td>
                    <td className="p-3 text-zinc-400">{item.productCategory}</td>
                    <td className="p-3 font-mono text-zinc-400">{item.sku}</td>
                    <td className="p-3 text-zinc-300">{item.size} / {item.color}</td>
                    <td className="p-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                        item.stockQuantity === 0 ? 'bg-rose-950 text-rose-400 border border-rose-800/60' : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      }`}>
                        {item.stockQuantity} units
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
