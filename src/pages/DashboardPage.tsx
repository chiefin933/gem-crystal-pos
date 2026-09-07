import React, { useState } from 'react';
import { PosTerminal } from '../components/pos/PosTerminal';
import { HardwareDevicesManager } from '../components/pos/HardwareDevicesManager';
import { Tablet, Settings, LogOut, ShieldCheck, Store, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'terminal' | 'hardware'>('terminal');
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top POS Header Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-600/20">
            <Tablet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-base text-white tracking-wide">
                GEM & CRYSTAL — TABLET POS TERMINAL
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                Roysambu Boutique Hub
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Shared Real-Time Inventory • Port 5175
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                viewMode === 'terminal'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Checkout Counter</span>
            </button>
            <button
              onClick={() => setViewMode('hardware')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                viewMode === 'hardware'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Hardware Specs</span>
            </button>
          </div>

          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 rounded-xl transition"
          >
            <Store className="w-3.5 h-3.5 text-rose-400" />
            <span>Storefront</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <button
            onClick={logout}
            className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition border border-transparent hover:border-rose-950"
            title="Cashier Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Full-Screen POS Content */}
      <main className="flex-1 overflow-y-auto p-6 max-w-[1600px] w-full mx-auto">
        {viewMode === 'terminal' ? <PosTerminal /> : <HardwareDevicesManager />}
      </main>
    </div>
  );
};
