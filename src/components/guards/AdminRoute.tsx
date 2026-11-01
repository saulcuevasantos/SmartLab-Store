/**
 * SmartLab Store — Guardián de Rutas Administrativas (<AdminRoute>)
 * docs/08_PLAN_SPRINTS.md (Sprint 03) & docs/07_SEGURIDAD.md
 *
 * Criterio de aceptación verificable #3:
 * Un usuario sin rol `admin` no puede acceder a ninguna ruta `/admin/*`.
 */

import React from 'react';
import { Navigate, Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-200">
        <div className="w-8 h-8 border-3 border-[#0A68FF] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-medium">Validando permisos administrativos...</span>
      </div>
    );
  }

  // 1. Si no existe sesión activa, redirigir al inicio de sesión (/login)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname, requireAdmin: true }} replace />;
  }

  // 2. Si existe sesión activa pero el perfil NO tiene rol ADMIN, denegar el acceso explícitamente
  if (!isAdmin) {
    const handleSwitchToAdminAccount = async () => {
      await logout();
      navigate('/login', { state: { from: location.pathname, requireAdmin: true }, replace: true });
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] p-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-md max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 mb-2">
            Acceso Denegado (RBAC — 403)
          </span>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Permisos Administrativos Requeridos
          </h1>
          <p className="text-sm text-slate-600 mb-5">
            Tu cuenta actual (<strong>{profile?.email}</strong>) tiene el rol{' '}
            <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-semibold">
              {profile?.role_id}
            </code>{' '}
            y no cuenta con privilegios de administrador (<code className="text-xs">ADMIN</code>) para acceder a{' '}
            <code className="text-xs">{location.pathname}</code>.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleSwitchToAdminAccount}
              className="touch-target w-full px-4 py-2.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión e ingresar como Administrador
            </button>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                to="/mi-cuenta/perfil"
                className="touch-target flex-1 px-4 py-2.5 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Ir a Mi Cuenta
              </Link>
              <Link
                to="/"
                className="touch-target flex-1 px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium flex items-center justify-center gap-2 transition"
              >
                <LogIn className="w-4 h-4" />
                Volver a la Tienda
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
