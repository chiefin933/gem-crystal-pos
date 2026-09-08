import React, { useState, useEffect } from 'react';
import { fetchProducts } from '../../api/adminApi';
import { acknowledgePaymentNotification } from '../../api/adminApi';
import {
  Scan,
  Fingerprint,
  Printer,
  CreditCard,
  Smartphone,
  Banknote,
  Search,
  Trash2,
  CheckCircle2,
  Plus,
  Minus,
  Tablet,
  ShieldCheck,
  RotateCcw,
  BellRing,
} from 'lucide-react';

interface PosCartItem {
  variantId: string;
  productId: string;
  title: string;
  sku: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  image: string;
}

interface PaymentAlert {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  mpesaReceipt?: string | null;
  confirmedAt: string;
}

export const PosTerminal: React.FC = () => {
  // Auth & Session State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posSessionToken, setPosSessionToken] = useState<string | null>(null);
  const [cashierName, setCashierName] = useState('Cashier Grace (Roysambu)');
  const [pinInput, setPinInput] = useState('');
  const [authRequestId, setAuthRequestId] = useState<string | null>(null);
  const [pollToken, setPollToken] = useState<string | null>(null);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isScanningFingerprint, setIsScanningFingerprint] = useState(false);

  // Catalog & Search State
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Cart State
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Payment & Checkout State
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'CARD'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('Walk-in Customer');
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');
  const [receipt, setReceipt] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paymentAlerts, setPaymentAlerts] = useState<PaymentAlert[]>([]);

  // Hardware Scanner Buffer State
  const [barcodeBuffer, setBarcodeBuffer] = useState('');

  const loadCatalog = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Global Barcode Scanner Listener (HID Device Keyboard Buffer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses if typing in an input element
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          handleBarcodeScanned(barcodeBuffer.trim());
        }
        setBarcodeBuffer('');
      } else if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [barcodeBuffer, products]);

  const handleBarcodeScanned = (scannedSku: string) => {
    const uppercaseSku = scannedSku.toUpperCase();
    let foundVariant: any = null;
    let foundProduct: any = null;

    for (const p of products) {
      const match = (p.variants || []).find((v: any) => v.sku.toUpperCase() === uppercaseSku);
      if (match) {
        foundVariant = match;
        foundProduct = p;
        break;
      }
    }

    if (foundVariant && foundProduct) {
      addToCart(foundProduct, foundVariant);
      setStatusMsg(`Scanned Barcode SKU [${uppercaseSku}]: Added "${foundProduct.title}" (${foundVariant.size})`);
      setTimeout(() => setStatusMsg(null), 3500);
    } else {
      setStatusMsg(`Barcode SKU "${uppercaseSku}" not recognized.`);
      setTimeout(() => setStatusMsg(null), 3500);
    }
  };

  const submitAuthRequest = async (biometric = false) => {
    if (!cashierName.trim() || (!biometric && !pinInput.trim())) {
      setStatusMsg(biometric ? 'Cashier name is required.' : 'Cashier name and PIN are required.');
      return;
    }

    try {
      const res = await fetch('/api/pos/auth-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierName: cashierName.trim(),
          pinCode: pinInput.trim() || undefined,
          biometricId: biometric ? 'fingerprint-verified' : undefined,
          deviceId: 'Tablet POS 01',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Unable to request POS authorization');

      setAuthRequestId(data.requestId);
      setPollToken(data.pollToken);
      setIsWaitingForApproval(true);
      setStatusMsg('Login request sent. Waiting for owner approval...');
    } catch (err: any) {
      setStatusMsg(err.message || 'Authentication request failed');
    }
  };

  const handleFingerprintScan = () => {
    setStatusMsg('Fingerprint hardware authentication is not enabled yet. Please use the secure PIN flow.');
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handlePinAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAuthRequest(false);
  };

  useEffect(() => {
    if (!authRequestId || !pollToken || !isWaitingForApproval) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/pos/auth-status/${encodeURIComponent(authRequestId)}`, {
          headers: { 'X-POS-Poll-Token': pollToken },
        });
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) {
            setIsWaitingForApproval(false);
            setStatusMsg(data.error?.message || data.error || 'Authorization request expired');
          }
          return;
        }

        if (data.status === 'APPROVED' && data.sessionToken) {
          if (cancelled) return;
          setPosSessionToken(data.sessionToken);
          setIsAuthenticated(true);
          setIsWaitingForApproval(false);
          setAuthRequestId(null);
          setPollToken(null);
          setPinInput('');
          setStatusMsg('Owner approved POS access. Cashier session unlocked ✓');
          setTimeout(() => setStatusMsg(null), 3500);
        } else if (data.status === 'REJECTED' || data.status === 'EXPIRED') {
          if (!cancelled) {
            setIsWaitingForApproval(false);
            setAuthRequestId(null);
            setPollToken(null);
            setStatusMsg(data.status === 'REJECTED' ? 'Owner denied POS access.' : 'Login request expired. Please try again.');
          }
        }
      } catch {
        // Keep polling while the API is temporarily unavailable.
      }
    };

    poll();
    const interval = window.setInterval(poll, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [authRequestId, pollToken, isWaitingForApproval]);

  // Payments are never trusted from the customer browser. The POS asks the
  // backend for confirmations after the provider callback has been verified.
  useEffect(() => {
    if (!isAuthenticated || !posSessionToken) return;

    let cancelled = false;
    const pollPayments = async () => {
      try {
        const response = await fetch('/api/pos/payment-notifications', {
          headers: { Authorization: `Bearer ${posSessionToken}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const incoming = Array.isArray(data.notifications) ? data.notifications as PaymentAlert[] : [];
        if (!cancelled && incoming.length) {
          setPaymentAlerts(current => {
            const present = new Set(current.map(alert => alert.id));
            return [...current, ...incoming.filter(alert => !present.has(alert.id))];
          });
        }
      } catch {
        // The next polling cycle retries after a short connectivity outage.
      }
    };

    pollPayments();
    const interval = window.setInterval(pollPayments, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, posSessionToken]);

  const addToCart = (product: any, variant: any) => {
    if (variant.stockQuantity < 1) {
      alert(`Variant ${variant.size} / ${variant.color} is out of stock!`);
      return;
    }

    const price = variant.salePrice ?? variant.price;
    const existingIndex = cart.findIndex(c => c.variantId === variant.id);

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart(prev => [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          title: product.title,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          price,
          quantity: 1,
          image: product.images?.[0] || '',
        },
      ]);
    }
  };

  const updateCartQty = (variantId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(c => c.variantId !== variantId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.round((cartSubtotal * discountPercent) / 100);
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);
  const numCashReceived = parseFloat(cashReceived) || 0;
  const changeGiven = paymentMethod === 'CASH' ? Math.max(0, numCashReceived - cartTotal) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CASH' && numCashReceived < cartTotal) {
      alert(`Cash received (KES ${numCashReceived}) is less than total amount (KES ${cartTotal})!`);
      return;
    }
    if (paymentMethod === 'MPESA' && !customerPhoneInput.trim()) {
      alert('Enter the customer M-PESA phone number to send the payment prompt.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${posSessionToken || ''}`,
        },
        body: JSON.stringify({
          cashierName,
          customerName: customerNameInput.trim() || 'Walk-in Customer',
          customerPhone: customerPhoneInput.trim() || null,
          items: cart,
          discountPercent,
          paymentMethod,
          cashReceived: paymentMethod === 'CASH' ? numCashReceived : null,
          changeGiven: paymentMethod === 'CASH' ? changeGiven : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'POS checkout failed');

      if (paymentMethod === 'MPESA' && !data.paymentInitiated) {
        throw new Error('M-PESA prompt could not be sent. The sale is pending—do not take payment again. Ask the owner to review it.');
      }

      setReceipt(data.sale);
      setCart([]);
      setCashReceived('');
      setCustomerNameInput('Walk-in Customer');
      setCustomerPhoneInput('');
      setDiscountPercent(0);
      if (paymentMethod === 'MPESA') {
        setStatusMsg('M-PESA prompt sent. The POS will show a verified payment popup once the backend confirms it.');
      }
      await loadCatalog(); // Refresh catalog stock immediately
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // FINGERPRINT / CASHIER AUTH MODAL
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-rose-600/20">
            <Fingerprint className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">POS Cashier Authentication</h2>
            <p className="text-xs text-zinc-400 mt-1">Gem & Crystal Fashion Hub — Roysambu Store</p>
          </div>

          {/* Fingerprint Scanner Button */}
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3">
            <button
              onClick={handleFingerprintScan}
              disabled={isScanningFingerprint}
              className="w-full py-4 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 group"
            >
              <Fingerprint className={`w-5 h-5 ${isScanningFingerprint ? 'animate-pulse text-rose-400' : ''}`} />
              <span>Fingerprint Authentication (Pending Hardware)</span>
            </button>
            <p className="text-[10px] text-zinc-500">Hardware verification required before fingerprint login can be enabled.</p>
          </div>

          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">— OR PIN FALLBACK —</div>

          <form onSubmit={handlePinAuth} className="space-y-4 text-xs text-left">
            <div>
              <label className="block text-zinc-400 font-bold uppercase mb-1">Cashier Name</label>
              <input
                type="text"
                required
                value={cashierName}
                onChange={e => setCashierName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-bold uppercase mb-1">Passcode PIN</label>
              <input
                type="password"
                required
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold uppercase text-xs tracking-wider rounded-xl shadow-lg transition"
            >
              Start POS Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top POS Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white font-bold shadow-md">
            <Tablet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span>Tablet POS Terminal</span>
              <span className="text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                ONLINE
              </span>
            </h1>
            <p className="text-xs text-zinc-400">{cashierName} • Shared Live Stock Sync</p>
          </div>
        </div>

        {/* Hardware Status Indicators */}
        <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-bold">
          <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Scan className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scanner HID Ready</span>
          </span>
          <span className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>ESC/POS Printer</span>
          </span>
          <button
            onClick={() => {
                setIsAuthenticated(false);
                setPosSessionToken(null);
                setCart([]);
                setStatusMsg('POS session locked.');
              }}
            className="bg-zinc-950 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 px-3 py-1.5 rounded-lg transition"
          >
            Lock Session
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 bg-rose-950/80 text-rose-200 border border-rose-800/80 rounded-xl text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {paymentAlerts[0] && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="payment-confirmed-title" className="w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/60 bg-zinc-950 shadow-2xl shadow-emerald-950/50">
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <BellRing className="h-7 w-7 animate-pulse" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100">Verified payment</p>
                  <h2 id="payment-confirmed-title" className="text-xl font-black">M-PESA Payment Received</h2>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6 text-sm">
              <p className="text-zinc-300"><strong className="text-white">{paymentAlerts[0].customerName}</strong> has completed payment for <strong className="font-mono text-emerald-300">#{paymentAlerts[0].orderNumber}</strong>.</p>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <div className="flex justify-between"><span className="text-zinc-400">Amount received</span><strong className="text-white">{paymentAlerts[0].currency} {Number(paymentAlerts[0].amount).toLocaleString()}</strong></div>
                <div className="flex justify-between"><span className="text-zinc-400">M-PESA receipt</span><strong className="font-mono text-emerald-300">{paymentAlerts[0].mpesaReceipt || 'Confirmed'}</strong></div>
              </div>
              <button onClick={() => {
                // Tell the backend the cashier has seen and processed this alert.
                // Fire-and-forget: if the call fails the notification re-appears
                // on the next poll so the cashier will dismiss it again.
                acknowledgePaymentNotification(paymentAlerts[0].id, posSessionToken || '');
                setPaymentAlerts(current => current.slice(1));
              }} className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-black uppercase tracking-wider text-white transition hover:bg-emerald-500">
                Acknowledge payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main POS Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Catalog & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Touch search product or scan hardware barcode..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Catalog Touch Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`bg-zinc-900 border rounded-2xl p-3 cursor-pointer transition flex flex-col justify-between hover:border-rose-500/60 ${
                  selectedProduct?.id === p.id ? 'border-rose-500 bg-rose-950/20' : 'border-zinc-800'
                }`}
              >
                <div>
                  <img
                    src={p.images?.[0]}
                    alt={p.title}
                    className="w-full h-24 object-cover rounded-xl bg-zinc-950 mb-2 border border-zinc-800"
                  />
                  <h4 className="text-xs font-bold text-zinc-200 line-clamp-1">{p.title}</h4>
                  <p className="text-[10px] text-zinc-500">{p.category}</p>
                </div>
                <div className="mt-2 flex items-center justify-between pt-2 border-t border-zinc-800/60">
                  <span className="text-xs font-black text-rose-400">
                    KES {(p.salePrice ?? p.price).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded">
                    {p.variants?.length ?? 0} variants
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Variant Selector Popup */}
          {selectedProduct && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-white">Select Variant for "{selectedProduct.title}"</h3>
                <button onClick={() => setSelectedProduct(null)} className="text-zinc-500 hover:text-white text-xs">✕</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedProduct.variants?.map((v: any) => (
                  <button
                    key={v.id}
                    disabled={v.stockQuantity === 0}
                    onClick={() => {
                      addToCart(selectedProduct, v);
                      setSelectedProduct(null);
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                      v.stockQuantity === 0
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-zinc-950 border-zinc-800 hover:border-rose-500 text-zinc-200 hover:text-white'
                    }`}
                  >
                    <div>{v.size} / {v.color}</div>
                    <div className="text-[10px] text-zinc-500">Stock: {v.stockQuantity}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: POS Cart & Checkout (5 Cols) */}
        <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-[640px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Current Cart Order</h2>
              <span className="text-xs font-bold text-zinc-400">{cart.length} items</span>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 my-4 max-h-64 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-xs text-zinc-500">
                  Cart is empty. Tap a product or scan a barcode SKU to add items.
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.variantId}
                    className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[170px]">
                      <img src={item.image} alt={item.title} className="w-9 h-9 rounded-lg object-cover bg-zinc-900 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-zinc-200 truncate">{item.title}</div>
                        <div className="text-[10px] text-zinc-500">{item.size} / {item.color}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.variantId, -1)}
                        className="p-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-white px-1.5">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.variantId, 1)}
                        className="p-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="font-bold text-zinc-100 text-right">
                      KES {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment & Totals Section */}
          <div className="space-y-4 border-t border-zinc-800 pt-4 text-xs">
            {/* Discount Preset Buttons */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-semibold">Apply Discount:</span>
              <div className="flex items-center gap-1">
                {[0, 5, 10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      discountPercent === pct ? 'bg-rose-600 text-white' : 'bg-zinc-950 border border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Subtotal & Totals */}
            <div className="space-y-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-semibold">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal:</span>
                <span>KES {cartSubtotal.toLocaleString()}</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Discount ({discountPercent}%):</span>
                  <span>- KES {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-zinc-800">
                <span>Total Amount:</span>
                <span className="text-rose-400">KES {cartTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>CASH</span>
              </button>

              <button
                onClick={() => setPaymentMethod('MPESA')}
                className={`py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'MPESA'
                    ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>M-PESA</span>
              </button>

              <button
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  paymentMethod === 'CARD'
                    ? 'bg-rose-950 border-rose-600 text-rose-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>CARD</span>
              </button>
            </div>

            {/* Customer Information Inputs */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Customer Details
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name (e.g. Jane Wanjiku)"
                  value={customerNameInput}
                  onChange={e => setCustomerNameInput(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Phone Number (e.g. 0718...)"
                  value={customerPhoneInput}
                  onChange={e => setCustomerPhoneInput(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
              {paymentMethod === 'MPESA' && (
                <p className="rounded-xl border border-emerald-800 bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-200">
                  Enter the customer&apos;s M-PESA number above. The system sends the prompt and waits for the verified backend confirmation—do not enter a receipt manually.
                </p>
              )}
            </div>

            {/* Cash Received Input */}
            {paymentMethod === 'CASH' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Cash Received (KES)..."
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-2 px-3 text-xs text-white font-mono focus:outline-none"
                />
                <span className="font-bold text-emerald-400 text-xs">
                  Change: KES {changeGiven.toLocaleString()}
                </span>
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 transition disabled:opacity-40"
            >
              {isProcessing ? 'Processing Transaction...' : paymentMethod === 'MPESA' ? `Send M-PESA Prompt (KES ${cartTotal.toLocaleString()})` : `Complete Sale (KES ${cartTotal.toLocaleString()})`}
            </button>
          </div>
        </div>
      </div>

      {/* ESC/POS RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">ESC/POS Thermal Customer Receipt</h3>
              <button onClick={() => setReceipt(null)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            {/* Payment Confirmation Badge */}
            <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Payment Confirmed</span>
                </span>
                <span className="font-mono text-white">KES {receipt.total?.toLocaleString()}</span>
              </div>
              <div className="text-[11px] pt-1 border-t border-emerald-900 flex justify-between">
                <span>Customer:</span>
                <span className="font-bold text-white">{receipt.customerName || 'Walk-in Customer'}</span>
              </div>
              {receipt.customerPhone && (
                <div className="text-[11px] flex justify-between">
                  <span>Phone:</span>
                  <span className="font-mono text-emerald-200">{receipt.customerPhone}</span>
                </div>
              )}
              {receipt.mpesaReceipt && (
                <div className="text-[11px] flex justify-between">
                  <span>M-PESA Ref:</span>
                  <span className="font-mono text-emerald-400 font-bold">{receipt.mpesaReceipt}</span>
                </div>
              )}
            </div>

            {/* Real 80mm ESC/POS Thermal Paper Receipt matching User Photo */}
            <div id="printable-receipt" className="bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-inner rounded-lg space-y-2 select-text border border-gray-200 max-h-[420px] overflow-y-auto">
              {/* Receipt Header */}
              <div className="text-center space-y-0.5 border-b border-black pb-2">
                <div className="text-[9px] text-gray-700">Redirected from: POS-01</div>
                <div className="font-extrabold text-sm tracking-tight uppercase">GEM & CRYSTAL FASHION HUB</div>
                <div className="text-[10px] font-bold">ROYSAMBU HUB - NAIROBI</div>
                <div className="text-[10px]">PIN # : P051121010P</div>
                <div className="font-bold text-xs pt-1">*** BOUTIQUE PURCHASE ***</div>
              </div>

              {/* Meta Grid */}
              <div className="space-y-0.5 text-[10px] border-b border-dashed border-black pb-2">
                <div className="flex justify-between">
                  <span className="font-bold">Order Num :</span>
                  <span>{receipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Inv No  :</span>
                  <span>{receipt.receiptNumber?.replace(/[^0-9]/g, '') || '8060'}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>CUSTOMER    :</span>
                  <span>{(receipt.customerName || 'WALK-IN CUSTOMER').toUpperCase()}</span>
                </div>
                {receipt.customerPhone && (
                  <div className="flex justify-between">
                    <span>TEL         :</span>
                    <span>{receipt.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>STAFF       :</span>
                  <span>{(receipt.cashierName || 'CASHIER GRACE').toUpperCase()}</span>
                </div>
                <div className="text-[10px] text-gray-800 pt-0.5">
                  {new Date(receipt.createdAt || Date.now()).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-1 py-1 border-b border-black">
                {receipt.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="truncate max-w-[190px]">{item.quantity} {item.title} ({item.size})</span>
                    <span className="font-semibold">Kshs{(item.price * item.quantity).toLocaleString()}.00</span>
                  </div>
                ))}
              </div>

              {/* Prominent Large Total */}
              <div className="py-2 text-center border-b border-black">
                <div className="font-black text-base tracking-tight">
                  Total : Kshs{receipt.total?.toLocaleString()}.00
                </div>
              </div>

              {/* Payment Tender Summary */}
              <div className="space-y-1 text-[10px] border-b border-dashed border-black pb-2">
                <div className="flex justify-between font-bold">
                  <span>Tingg Pay</span>
                  <span>-{receipt.total?.toLocaleString()}.00</span>
                </div>
                <div className="pt-1 text-[9px] space-y-0.5 text-gray-800">
                  <div className="flex justify-between">
                    <span>Kshs{Math.round((receipt.total * 0.16 / 1.16) * 100) / 100} VAT (16%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kshs0.00 Catering Levy</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Kshs{Math.round((receipt.total / 1.16) * 100) / 100} Total Excl</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Details */}
              <div className="text-center pt-1 pb-2 border-b border-dashed border-black">
                <div className="text-[10px] font-bold mb-1">Mobile Payments</div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span>{receipt.paymentMethod === 'MPESA' ? `cellulant(${receipt.mpesaReceipt || 'QGH8721X9'})` : receipt.paymentMethod}</span>
                  <span>{receipt.total?.toLocaleString()}.00</span>
                </div>
              </div>

              {/* Realistic KRA eTIMS QR Code SVG */}
              <div className="py-2 text-center flex flex-col items-center justify-center space-y-1">
                <svg className="w-24 h-24 mx-auto" viewBox="0 0 100 100" fill="black">
                  <rect x="0" y="0" width="100" height="100" fill="white" stroke="black" strokeWidth="2" />
                  <rect x="6" y="6" width="24" height="24" fill="black" />
                  <rect x="10" y="10" width="16" height="16" fill="white" />
                  <rect x="14" y="14" width="8" height="8" fill="black" />
                  <rect x="70" y="6" width="24" height="24" fill="black" />
                  <rect x="74" y="10" width="16" height="16" fill="white" />
                  <rect x="78" y="14" width="8" height="8" fill="black" />
                  <rect x="6" y="70" width="24" height="24" fill="black" />
                  <rect x="10" y="74" width="16" height="16" fill="white" />
                  <rect x="14" y="78" width="8" height="8" fill="black" />
                  <rect x="34" y="10" width="4" height="4" />
                  <rect x="42" y="10" width="4" height="4" />
                  <rect x="50" y="10" width="4" height="4" />
                  <rect x="58" y="10" width="4" height="4" />
                  <rect x="10" y="34" width="4" height="4" />
                  <rect x="10" y="42" width="4" height="4" />
                  <rect x="10" y="50" width="4" height="4" />
                  <rect x="10" y="58" width="4" height="4" />
                  <rect x="34" y="34" width="8" height="8" />
                  <rect x="46" y="34" width="8" height="8" />
                  <rect x="58" y="34" width="8" height="8" />
                  <rect x="70" y="34" width="8" height="8" />
                  <rect x="82" y="34" width="8" height="8" />
                  <rect x="34" y="46" width="8" height="8" />
                  <rect x="46" y="46" width="12" height="12" />
                  <rect x="64" y="46" width="8" height="8" />
                  <rect x="78" y="46" width="8" height="8" />
                  <rect x="34" y="60" width="10" height="10" />
                  <rect x="48" y="60" width="8" height="8" />
                  <rect x="60" y="60" width="12" height="12" />
                  <rect x="76" y="60" width="10" height="10" />
                  <rect x="34" y="74" width="8" height="8" />
                  <rect x="46" y="74" width="10" height="10" />
                  <rect x="60" y="74" width="8" height="8" />
                  <rect x="72" y="74" width="12" height="12" />
                </svg>
                <div className="text-[8px] font-mono tracking-tighter">
                  M/w-No.:0020104080000762073<br />
                  M/w-SN.:KRAMW002202111010408
                </div>
              </div>

              {/* System Footer */}
              <div className="text-center pt-2 border-t border-black text-[8px] font-mono">
                GAAP Point of Sale 1:6:1930<br />
                <span className="font-bold">Thank you for shopping with us Gem & Crystal Fashion Hub</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
