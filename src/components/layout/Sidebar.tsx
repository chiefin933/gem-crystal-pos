import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  Ticket,
  LogOut,
  ShieldCheck,
  ExternalLink,
  Store,
  Tablet,
  Settings,
} from 'lucide-react';

export type AdminTab = 'overview' | 'pos' | 'products' | 'orders' | 'inventory' | 'coupons' | 'hardware';

interface SidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const menuItems: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview & KPIs', icon: LayoutDashboard },
    { id: 'pos', label: 'Tablet POS Terminal', icon: Tablet },
    { id: 'products', label: 'Product Catalog', icon: ShoppingBag },
    { id: 'orders', label: 'Customer Orders', icon: Package },
    { id: 'inventory', label: 'Inventory Control', icon: Boxes },
    { id: 'coupons', label: 'Promos & Coupons', icon: Ticket },
    { id: 'hardware', label: 'Hardware & Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-zinc-900/90 backdrop-blur-xl border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-600/20 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">Gem & Crystal</h1>
          <p className="text-[10px] uppercase tracking-wider text-rose-400 font-semibold">Admin & POS Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-zinc-500">
          Store & In-Person POS
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-rose-600/15 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* View Live Storefront */}
      <div className="p-4 border-t border-zinc-800/80">
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition group"
        >
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-rose-400" />
            <span>Open Live Store</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition" />
        </a>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
        <div className="truncate">
          <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || 'Store Owner'}</p>
          <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
