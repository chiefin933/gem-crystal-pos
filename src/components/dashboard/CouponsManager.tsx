import React, { useState, useEffect } from 'react';
import { fetchCoupons, createCoupon, toggleCoupon, deleteCoupon } from '../../api/adminApi';
import { Ticket, Plus, Trash2, Power, Check } from 'lucide-react';

export const CouponsManager: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('3000');
  const [expiryDate, setExpiryDate] = useState('2028-12-31');
  const [usageLimit, setUsageLimit] = useState('500');

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const data = await fetchCoupons();
      setCoupons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createCoupon({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        expiryDate,
        usageLimit: parseInt(usageLimit) || 100,
      });
      setShowModal(false);
      setCode('');
      setDiscountValue('');
      await loadCoupons();
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (cCode: string) => {
    try {
      const updated = await toggleCoupon(cCode);
      setCoupons(prev => prev.map(c => (c.code === cCode ? updated : c)));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle coupon');
    }
  };

  const handleDelete = async (cCode: string) => {
    if (!window.confirm(`Delete coupon ${cCode}?`)) return;
    try {
      await deleteCoupon(cCode);
      setCoupons(prev => prev.filter(c => c.code !== cCode));
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Promotional Coupons & Discounts</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage promo codes redeemed during storefront checkout
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Promo Code</span>
        </button>
      </div>

      {/* Coupons Grid */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Loading coupons...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">No coupons active.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Min. Order</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {coupons.map(c => (
                  <tr key={c.code} className="hover:bg-zinc-800/40 transition">
                    <td className="p-4 font-mono font-bold text-rose-400 text-sm">
                      {c.code}
                    </td>
                    <td className="p-4 font-bold text-zinc-100">
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `KES ${c.discountValue.toLocaleString()} OFF`}
                    </td>
                    <td className="p-4 text-zinc-300">
                      KES {c.minOrderAmount.toLocaleString()}
                    </td>
                    <td className="p-4 text-zinc-400 font-mono">{c.expiryDate}</td>
                    <td className="p-4 text-zinc-300 font-semibold">
                      {c.usageCount} / {c.usageLimit}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
                      }`}>
                        {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggle(c.code)}
                          className={`p-1.5 rounded-lg border transition ${
                            c.isActive ? 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60' : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                          }`}
                          title={c.isActive ? 'Deactivate Coupon' : 'Activate Coupon'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.code)}
                          className="p-1.5 bg-zinc-950 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-800 rounded-lg transition"
                          title="Delete Coupon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* CREATE COUPON MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">Create Promo Coupon</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold uppercase mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GEMVIP30"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-zinc-100 uppercase font-mono focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold uppercase mb-1">Type *</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-zinc-100 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed KES (Amount)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold uppercase mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'PERCENTAGE' ? '20' : '1000'}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold uppercase mb-1">Min. Order (KES)</label>
                  <input
                    type="number"
                    value={minOrderAmount}
                    onChange={e => setMinOrderAmount(e.target.value)}
                    placeholder="3000"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold uppercase mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={e => setUsageLimit(e.target.value)}
                    placeholder="500"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold uppercase mb-1">Expiry Date *</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold px-5 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
