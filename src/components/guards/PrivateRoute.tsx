/**
 * SmartLab Store — Guardián de Rutas Privadas de Cliente (<PrivateRoute>)
 * docs/08_PLAN_SPRINTS.md (Sprint 03) & docs/07_SEGURIDAD.md
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const PrivateRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="smartlab-container py-16 flex flex-col items-center justify-center text-slate-600">
        <div className="w-8 h-8 border-3 border-[#0A68FF] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-medium">Verificando sesión de tu cuenta...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
