import React, { useState, useEffect, useRef } from 'react';
import { fetchProducts, createProduct, deleteProduct, uploadProductImages, ProductPayload } from '../../api/adminApi';
import { Plus, Search, Trash2, Tag, Check, Image as ImageIcon, Filter, UploadCloud, X, Loader2 } from 'lucide-react';

export const ProductsManager: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New product form state
  const [title, setTitle] = useState('');
  const [gender, setGender] = useState<'women' | 'men' | 'unisex'>('women');
  const [category, setCategory] = useState('Denim & Mom Jeans');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [sizesInput, setSizesInput] = useState('S, M, L, XL');
  const [colorsInput, setColorsInput] = useState('Classic Black (#18181b), Vintage Blue (#4b6b94)');
  const [stockPerVariant, setStockPerVariant] = useState('10');
  const [isNew, setIsNew] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts({ search, category: categoryFilter });
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const parsedPrice = parseFloat(price);
      const parsedSalePrice = salePrice ? parseFloat(salePrice) : undefined;
      const sizes = sizesInput.split(',').map(s => s.trim()).filter(Boolean);
      
      // Parse colors string e.g. "Black (#000), Blue (#00f)"
      const colors = colorsInput.split(',').map(c => {
        const match = c.match(/([^(]+)\s*(?:\(([^)]+)\))?/);
        return {
          name: match ? match[1].trim() : c.trim(),
          hex: (match && match[2]) ? match[2].trim() : '#18181b',
        };
      });

      if (uploadedImages.length === 0) {
        throw new Error('Please select and upload at least one image from your device.');
      }

      const payload: ProductPayload = {
        title: title.trim(),
        gender,
        category: category.trim(),
        price: parsedPrice,
        salePrice: parsedSalePrice,
        description: description.trim(),
        images: uploadedImages,
        sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L'],
        colors: colors.length > 0 ? colors : [{ name: 'Default', hex: '#18181b' }],
        isNew,
        isFeatured,
        stockPerVariant: parseInt(stockPerVariant) || 10,
      };

      await createProduct(payload);
      setStatusMsg({ type: 'success', text: `Product "${title}" created and published to live store!` });
      setShowAddModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, prodTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${prodTitle}"?`)) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setStatusMsg({ type: 'success', text: `Removed "${prodTitle}"` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete' });
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    setUploadError('');

    try {
      const urls = await uploadProductImages(Array.from(files));
      setUploadedImages(prev => [...prev, ...urls]);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image file(s)');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setSalePrice('');
    setDescription('');
    setUploadedImages([]);
    setUploadError('');
  };

  const categoriesList = [
    'All',
    'Denim & Mom Jeans',
    'Tops & Crop Tops',
    'Dresses',
    'Blazers & Jackets',
    'Heels & Women Footwear',
    "Men's Apparel",
    "Men's Footwear",
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Product Catalog Management</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Add or modify items in SQLite — changes sync instantly to the live storefront
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          statusMsg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or category..."
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                categoryFilter === cat ? 'bg-rose-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Loading catalog from database...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">No products found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="p-4">Item</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Gender</th>
                  <th className="p-4">Price (KES)</th>
                  <th className="p-4">Variants & Stock</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {products.map(p => {
                  const totalStock = p.variants?.reduce((sum: number, v: any) => sum + v.stockQuantity, 0) ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images?.[0]}
                            alt={p.title}
                            className="w-12 h-12 rounded-xl object-cover border border-zinc-800 bg-zinc-950"
                          />
                          <div>
                            <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                              <span>{p.title}</span>
                              {p.isNew && (
                                <span className="bg-rose-950 text-rose-400 border border-rose-800/60 text-[9px] font-bold px-1.5 py-0.5 rounded">NEW</span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">{p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">{p.category}</td>
                      <td className="p-4 capitalize text-zinc-400">{p.gender}</td>
                      <td className="p-4">
                        <div className="font-bold text-zinc-100">KES {p.price.toLocaleString()}</div>
                        {p.salePrice && (
                          <div className="text-[11px] text-rose-400 font-semibold">Sale: KES {p.salePrice.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          totalStock > 10 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}>
                          {totalStock} units ({p.variants?.length ?? 0} variants)
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD NEW PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-white">Add New Fashion Item to Storefront</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Silk Satin Halter Top"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Gender Category *
                  </label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    <option value="women">Women</option>
                    <option value="men">Men</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Store Category *
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    <option value="Denim & Mom Jeans">Denim & Mom Jeans</option>
                    <option value="Tops & Crop Tops">Tops & Crop Tops</option>
                    <option value="Dresses">Dresses</option>
                    <option value="Blazers & Jackets">Blazers & Jackets</option>
                    <option value="Heels & Women Footwear">Heels & Women Footwear</option>
                    <option value="Men's Apparel">Men's Apparel</option>
                    <option value="Men's Footwear">Men's Footwear</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Price (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="4500"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Sale Price (Optional KES)
                  </label>
                  <input
                    type="number"
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value)}
                    placeholder="3800"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Stock Per Variant *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={stockPerVariant}
                    onChange={e => setStockPerVariant(e.target.value)}
                    placeholder="10"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cloudinary Device Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Product Images (Import from device to Cloudinary) *
                </label>

                {/* File picker button drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-rose-500/80 bg-zinc-950/60 hover:bg-zinc-950 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {isUploadingImages ? (
                    <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs py-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Optimizing & Uploading to Cloudinary CDN...</span>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-200">
                          Click to select photos from your phone or computer
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Supports PNG, JPG, WEBP • Auto-compressed & delivered via CDN
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400 font-semibold mt-2">
                    ⚠️ {uploadError}
                  </p>
                )}

                {/* Uploaded Images Gallery Preview */}
                {uploadedImages.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Uploaded Product Images ({uploadedImages.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uploadedImages.map((url, idx) => (
                        <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950">
                          <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-black/80 text-rose-400 hover:text-white rounded-full transition opacity-90 hover:opacity-100"
                            title="Remove image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 bg-rose-600/90 text-white text-[9px] font-extrabold text-center py-0.5 uppercase">
                              Main
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Available Sizes (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={sizesInput}
                    onChange={e => setSizesInput(e.target.value)}
                    placeholder="S, M, L, XL"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Colors (Name and optional #hex)
                  </label>
                  <input
                    type="text"
                    value={colorsInput}
                    onChange={e => setColorsInput(e.target.value)}
                    placeholder="Black (#000), Blush Pink (#fbcfe8)"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Product Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Write editorial description..."
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-xs text-zinc-100 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={e => setIsNew(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span>Mark as "New Arrival"</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span>Feature on Homepage</span>
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-rose-600/25 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving to Database...' : 'Publish Product Live'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
