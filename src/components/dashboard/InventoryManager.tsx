import React, { useState, useEffect } from 'react';
import { fetchProducts, adjustVariantStock } from '../../api/adminApi';
import { Boxes, Plus, Minus, Search, AlertCircle, RefreshCw } from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleAdjust = async (variantId: string, delta: number) => {
    setUpdatingVariantId(variantId);
    try {
      await adjustVariantStock(variantId, delta);
      // Update stock locally
      setProducts(prev =>
        prev.map(p => ({
          ...p,
          variants: p.variants.map((v: any) =>
            v.id === variantId ? { ...v, stockQuantity: Math.max(0, v.stockQuantity + delta) } : v
          ),
        }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setUpdatingVariantId(null);
    }
  };

  // Flatten all variants across products for inventory view
  const allVariants = products.flatMap(p =>
    (p.variants || []).map((v: any) => ({
      ...v,
      productTitle: p.title,
      productCategory: p.category,
      productImage: p.images?.[0],
    }))
  );

  const filteredVariants = allVariants.filter(v =>
    v.productTitle.toLowerCase().includes(search.toLowerCase()) ||
    v.sku.toLowerCase().includes(search.toLowerCase()) ||
    v.size.toLowerCase().includes(search.toLowerCase()) ||
    v.color.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Inventory Control & Stock Adjustments</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time stock management across all sizes, colors, and product SKUs
          </p>
        </div>

        <button
          onClick={loadInventory}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock Levels</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by SKU, Product Title, Size, or Color..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Loading variant inventory...</div>
        ) : filteredVariants.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">No variant inventory found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-4">SKU & Item</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Color</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4 text-right">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredVariants.map(v => (
                  <tr key={v.id} className="hover:bg-zinc-800/40 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.productImage}
                          alt={v.productTitle}
                          className="w-10 h-10 rounded-lg object-cover bg-zinc-950 border border-zinc-800"
                        />
                        <div>
                          <div className="font-bold text-zinc-100">{v.productTitle}</div>
                          <div className="font-mono text-[10px] text-zinc-500 mt-0.5">{v.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-zinc-200">{v.size}</td>
                    <td className="p-4 text-zinc-300">{v.color}</td>
                    <td className="p-4 font-semibold text-zinc-200">KES {v.price.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        v.stockQuantity === 0 ? 'bg-rose-950 text-rose-400 border border-rose-800/60' :
                        v.stockQuantity <= 5 ? 'bg-amber-950 text-amber-400 border border-amber-800/60' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                      }`}>
                        {v.stockQuantity} units
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          disabled={updatingVariantId === v.id || v.stockQuantity === 0}
                          onClick={() => handleAdjust(v.id, -1)}
                          className="p-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 transition disabled:opacity-30"
                          title="Deduct 1 Unit"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          disabled={updatingVariantId === v.id}
                          onClick={() => handleAdjust(v.id, 1)}
                          className="p-1.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg text-rose-300 transition"
                          title="Add 1 Unit"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          disabled={updatingVariantId === v.id}
                          onClick={() => handleAdjust(v.id, 10)}
                          className="px-2 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-bold text-zinc-300 rounded-lg transition"
                          title="Restock +10 Units"
                        >
                          +10
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
    </div>
  );
};
