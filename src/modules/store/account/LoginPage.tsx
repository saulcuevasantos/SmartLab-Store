/**
 * SmartLab Store — Pantalla de Inicio de Sesión (/login)
 * docs/08_PLAN_SPRINTS.md (Sprint 03) & docs/07_SEGURIDAD.md
 *
 * Autenticación mediante correo electrónico obligatorio + contraseña.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { isSupabaseConfigured } from '../../../config/supabaseClient';
import { isAdminRole } from '../../../services/auth.service';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stateData = location.state as { from?: string; requireAdmin?: boolean } | null;
  const redirectTarget = stateData?.from || (isAdmin ? '/admin' : '/mi-cuenta/perfil');

  if (isAuthenticated) {
    return (
      <div className="smartlab-container py-12">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Ya tienes una sesión activa</h2>
          <p className="text-sm text-slate-600 mb-5">
            Puedes gestionar tu perfil, consultar tus pedidos o explorar el catálogo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/mi-cuenta/perfil"
              className="touch-target px-5 py-2.5 bg-[#0A68FF] hover:bg-[#0854D1] text-white font-semibold rounded-lg text-sm transition"
            >
              Ir a Mi Cuenta
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="touch-target px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition"
              >
                Panel Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const loggedProfile = await login({ email, password });
      const userIsAdmin = isAdminRole(loggedProfile.role_id);

      if (stateData?.from) {
        navigate(stateData.from, { replace: true });
      } else if (userIsAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectTarget, { replace: true });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <div className="smartlab-container py-8 sm:py-12">
      <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8">
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0A68FF] mb-2">
            Acceso Seguro SmartLab
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Iniciar Sesión</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Ingresa con tu correo electrónico y contraseña para consultar tus pedidos y descargas.
          </p>
        </div>

        {stateData?.requireAdmin && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            Inicia sesión con una cuenta de rol <strong>admin</strong> para acceder al Panel Administrativo.
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Correo Electrónico <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@dominio.com"
                className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-10 pr-11 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="touch-target absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Mostrar u ocultar contraseña"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {isSubmitting ? 'Verificando credenciales...' : 'Ingresar a Mi Cuenta'}
          </button>
        </form>

        {/* Accesos de prueba cuando el entorno local usa credenciales de respaldo */}
        {!isSupabaseConfigured() && (
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Cuentas de Verificación RBAC (Sprint 03):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoCredentials('cliente@smartlab.pe', 'Cliente2026!')}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-[#0A68FF] bg-slate-50 hover:bg-blue-50/40 text-left transition"
              >
                <span className="font-semibold text-slate-800 block">Rol: Cliente</span>
                <span className="text-[11px] text-slate-500">cliente@smartlab.pe</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin@smartlab.pe', 'AdminSmartLab2026!')}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-[#0A68FF] bg-slate-50 hover:bg-blue-50/40 text-left transition"
              >
                <span className="font-semibold text-slate-800 block">Rol: Admin</span>
                <span className="text-[11px] text-slate-500">admin@smartlab.pe</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-600">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-[#0A68FF] hover:underline">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
};
