/**
 * SmartLab Store — Layout Operativo del Panel Administrativo (AdminLayout.tsx)
 * docs/06_DISENO_VISUAL_UX_UI.md (Sección 8) & docs/08_PLAN_SPRINTS.md (Sprint 04)
 */

import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { AdminSidebar } from './AdminSidebar';

export const AdminLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [adminQuickSearch, setAdminQuickSearch] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminQuickSearch.trim()) return;
    navigate(`/admin/orders?q=${encodeURIComponent(adminQuickSearch.trim())}`);
  };

  return (
    <div className="min-h-screen flex bg-[#F4F6F8] text-[#1E293B]">
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Contenedor Principal de Trabajo de Alta Densidad */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Operativa */}
        <header className="bg-white border-b border-[#E2E8F0] h-16 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="touch-target lg:hidden -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Abrir menú administrativo"
            >
              <Menu className="w-5 h-5" />
            </button>

            <form onSubmit={handleQuickSearch} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={adminQuickSearch}
                onChange={(e) => setAdminQuickSearch(e.target.value)}
                placeholder="Buscar pedido (SL-2026-...), teléfono WhatsApp o N° operación..."
                className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
            </form>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/admin/payments')}
              className="touch-target px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#0A68FF] bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
              title="Revisar comprobantes pendientes"
            >
              <Bell className="w-4 h-4 text-[#FF6B00]" />
              <span className="hidden sm:inline">Comprobantes</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-[#0A68FF] text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline truncate max-w-[140px]">
                {profile?.full_name || 'Administrador'}
              </span>
              <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#0A68FF] text-white font-bold">
                {profile?.role_id || 'admin'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
