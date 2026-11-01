/**
 * SmartLab Store — Sidebar Operativa del Panel Administrativo (AdminSidebar.tsx)
 * docs/06_DISENO_VISUAL_UX_UI.md (Sección 8) & docs/08_PLAN_SPRINTS.md (Sprint 04)
 *
 * Comportamiento responsive:
 * - Desktop amplio (>= 1280px): Fija desplegada (260px)
 * - Laptop (1024px - 1279px): Colapsable a modo icono (72px) o expandible
 * - Tablet y Móvil (< 1024px): Drawer flotante off-canvas
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutTemplate,
  FolderTree,
  Package,
  FileText,
  CreditCard,
  MessageSquareShare,
  Scale,
  ShieldCheck,
  BarChart3,
  Settings,
  Users,
  TicketPercent,
  Tag,
  ArrowLeft,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Cpu,
  X,
} from 'lucide-react';

export interface AdminNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    path: '/admin',
    label: 'Dashboard Comercial',
    icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    exact: true,
  },
  {
    path: '/admin/home',
    label: 'Portada y Hero Banner',
    icon: <LayoutTemplate className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/categories',
    label: 'Categorías',
    icon: <FolderTree className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/products',
    label: 'Productos y Versiones',
    icon: <Package className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/pricing',
    label: 'Precios y Promociones',
    icon: <Tag className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/orders',
    label: 'Pedidos y Vencimientos',
    icon: <FileText className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/payments',
    label: 'Pagos y Asignación',
    icon: <CreditCard className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/deliveries',
    label: 'Entregas WhatsApp',
    icon: <MessageSquareShare className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/customers',
    label: 'Directorio de Clientes',
    icon: <Users className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/custom-requests',
    label: 'Solicitudes a Medida',
    icon: <MessageSquareShare className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/coupons',
    label: 'Cupones de Descuento',
    icon: <TicketPercent className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/cancellations',
    label: 'Cancelaciones y Reembolsos',
    icon: <Scale className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/audit',
    label: 'Bitácora de Auditoría',
    icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/reports',
    label: 'Reportes Comerciales',
    icon: <BarChart3 className="w-4 h-4 shrink-0" />,
  },
  {
    path: '/admin/settings',
    label: 'Configuración General',
    icon: <Settings className="w-4 h-4 shrink-0" />,
  },
];

export interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const location = useLocation();

  const isRouteActive = (item: AdminNavItem) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  const renderLinks = (collapsedMode: boolean, closeOnClick = false) => (
    <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = isRouteActive(item);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={closeOnClick ? onCloseMobile : undefined}
            title={collapsedMode ? item.label : undefined}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
              active
                ? 'bg-[#0A68FF] text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
              collapsedMode ? 'justify-center' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {item.icon}
            {!collapsedMode && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Sidebar Fija en Laptop y Desktop (>= 1024px) */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0F172A] text-slate-200 border-r border-slate-800 shrink-0 transition-all duration-200 ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#0A68FF] text-white flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="leading-none truncate">
                <span className="font-bold text-white text-base">
                  <span className="text-[#0A68FF]">SmartLab</span> Admin
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">
                  Control Operativo PEN (S/)
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {renderLinks(isCollapsed, false)}

        <div className="p-3 border-t border-slate-800 space-y-1 text-xs">
          <Link
            to="/"
            title={isCollapsed ? 'Volver a la Tienda Pública' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Tienda Pública</span>}
          </Link>
          <button
            type="button"
            onClick={onLogout}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Drawer Lateral Off-Canvas en Móvil y Tablet (< 1024px) */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex"
          onClick={onCloseMobile}
        >
          <aside
            className="w-[82%] max-w-[280px] bg-[#0F172A] text-slate-200 h-full flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0A68FF] text-white flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-base">
                  <span className="text-[#0A68FF]">SmartLab</span> Admin
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="touch-target -mr-2 text-slate-400 hover:text-white"
                aria-label="Cerrar menú administrativo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderLinks(false, true)}

            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <Link
                to="/"
                onClick={onCloseMobile}
                className="px-3 py-2 rounded-lg text-slate-300 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Tienda Pública</span>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 rounded-lg text-red-400 hover:text-red-300 flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
