import React, { useState, useEffect } from 'react';
import { Tablet, Scan, Fingerprint, Printer, ShieldAlert, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';

export const HardwareDevicesManager: React.FC = () => {
  const [hardware, setHardware] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Settings form state
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [deliveryDisclaimer, setDeliveryDisclaimer] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [hwRes, setRes] = await Promise.all([
        fetch('/api/pos/hardware').then(r => r.json()),
        fetch('/api/settings').then(r => r.json()),
      ]);
      setHardware(hwRes);
      setSettings(setRes);
      setWhatsappNumber(setRes?.whatsappNumber || '254700123456');
      setDeliveryDisclaimer(setRes?.deliveryFeeDisclaimer || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving...');
    try {
      const token = localStorage.getItem('gc_admin_token');
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...settings,
          whatsappNumber,
          deliveryFeeDisclaimer: deliveryDisclaimer,
        }),
      });

      if (!res.ok) throw new Error('Failed to update settings');
      setSaveStatus('Settings updated successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err: any) {
      setSaveStatus(err.message || 'Error saving settings');
    }
  };

  const devices = [
    {
      name: 'POS Touch Tablet',
      model: hardware?.tabletName || 'Gem & Crystal POS Tablet 01 (Roysambu)',
      icon: Tablet,
      isConnected: !!hardware?.tabletConnected,
      type: 'Primary Terminal',
    },
    {
      name: 'USB / Bluetooth Barcode Scanner',
      model: 'Omnidirectional Laser Scanner (HID Mode)',
      icon: Scan,
      isConnected: !!hardware?.barcodeScanner,
      type: 'SKU Reader',
    },
    {
      name: 'Biometric Fingerprint Reader',
      model: 'Optical Cashier Authenticator (USB SDK)',
      icon: Fingerprint,
      isConnected: !!hardware?.fingerprintReader,
      type: 'Cashier Authorization',
    },
    {
      name: 'Thermal Receipt Printer',
      model: 'ESC/POS 80mm High Speed Printer',
      icon: Printer,
      isConnected: !!hardware?.receiptPrinter,
      type: 'Customer Receipt',
    },
    {
      name: 'Automatic Cash Drawer',
      model: 'RJ11 Solenoid Kickout Cash Drawer',
      icon: ShieldAlert,
      isConnected: !!hardware?.cashDrawer,
      type: 'Physical Cash Storage',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Hardware Peripherals & Store Settings</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Status of in-store POS peripherals and customer contact preferences
          </p>
        </div>

        <button
          onClick={loadData}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Hardware Status</span>
        </button>
      </div>

      {/* Hardware Peripherals Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
          Connected POS Hardware Peripherals (Roysambu Hub)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((dev, idx) => {
            const Icon = dev.icon;
            return (
              <div
                key={idx}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                      {dev.type}
                    </span>
                    {loading ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-zinc-800/60 border border-zinc-700 px-2.5 py-0.5 rounded-full">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Checking...</span>
                      </span>
                    ) : dev.isConnected ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Connected</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-zinc-900 border border-zinc-700 px-2.5 py-0.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                        <span>Not Connected</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2.5 bg-zinc-950 border rounded-xl ${
                      dev.isConnected ? 'border-emerald-900/60 text-emerald-400' : 'border-zinc-800 text-zinc-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${
                        dev.isConnected ? 'text-white' : 'text-zinc-500'
                      }`}>{dev.name}</h3>
                      <p className="text-xs text-zinc-500">{dev.model}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Store Settings Form */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <Smartphone className="w-5 h-5 text-rose-400" />
          <h2 className="text-base font-bold text-white">Store Configuration & WhatsApp Settings</h2>
        </div>

        {saveStatus && (
          <div className="p-3 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold">
            {saveStatus}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-2">
                Official WhatsApp Business Number (International Format) *
              </label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={e => setWhatsappNumber(e.target.value)}
                placeholder="254700123456"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 px-4 text-white font-mono focus:outline-none"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Automated order alerts and floating storefront button will direct to this WhatsApp number.
              </p>
            </div>

            <div>
              <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-2">
                Physical Store Location *
              </label>
              <input
                type="text"
                readOnly
                value="Roysambu, Nairobi, Kenya"
                className="w-full bg-zinc-950/60 border border-zinc-800 text-zinc-400 rounded-xl py-3 px-4 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-bold uppercase tracking-wider mb-2">
              Delivery Fee Disclaimer (Displayed at Storefront Checkout) *
            </label>
            <textarea
              rows={3}
              required
              value={deliveryDisclaimer}
              onChange={e => setDeliveryDisclaimer(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500 rounded-xl py-3 px-4 text-white focus:outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg shadow-rose-600/25 transition-all"
            >
              Save Store Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
