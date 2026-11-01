/**
 * SmartLab Store — Pantalla de Registro de Clientes (/registro)
 * docs/08_PLAN_SPRINTS.md (Sprint 03) & docs/07_SEGURIDAD.md
 *
 * Reglas aprobadas:
 * - Autenticación mediante correo electrónico + contraseña.
 * - El correo electrónico es obligatorio y único.
 * - El número de teléfono es obligatorio para el checkout y contacto por WhatsApp.
 * - La verificación SMS está desactivada inicialmente.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { DocumentType } from '../../../types/user.types';

export const RegisterPage: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isAuthenticated) {
    return (
      <div className="smartlab-container py-12">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Tu cuenta está activa</h2>
          <p className="text-sm text-slate-600 mb-5">
            Ya has iniciado sesión en SmartLab Store.
          </p>
          <Link
            to="/mi-cuenta/perfil"
            className="touch-target px-5 py-2.5 bg-[#0A68FF] hover:bg-[#0854D1] text-white font-semibold rounded-lg text-sm transition"
          >
            Ir a Mi Perfil y Pedidos
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        fullName,
        email,
        phoneNumber,
        password,
        documentType: documentType ? (documentType as DocumentType) : null,
        documentNumber: documentNumber || null,
      });
      navigate('/mi-cuenta/perfil', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo completar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="smartlab-container py-8 sm:py-12">
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8">
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0A68FF] mb-2">
            Cuenta de Cliente SmartLab
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Crear Cuenta</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Registra tu correo electrónico único y tu número de WhatsApp para gestionar tus pedidos y descargas.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nombre completo o Razón Social <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. María Quispe o Negocios Digitales SAC"
                className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Correo Electrónico (Obligatorio y único) <span className="text-red-500">*</span>
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
              Teléfono / WhatsApp (Obligatorio) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                inputMode="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ej. 987 654 321"
                className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Aquí coordinaremos tu pago y te enviaremos los enlaces individuales de descarga (sin verificación SMS).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contraseña (Mín. 8 caracteres) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tipo de Documento (Opcional)
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType | '')}
                className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base text-slate-800 bg-white focus:outline-none focus:border-[#0A68FF]"
              >
                <option value="">Sin especificar</option>
                <option value="DNI">DNI</option>
                <option value="RUC">RUC</option>
                <option value="CE">Carné de Extranjería</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Número de Documento (Opcional)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="DNI o RUC"
                className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta en SmartLab Store'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-600">
          ¿Ya tienes una cuenta registrada?{' '}
          <Link to="/login" className="font-semibold text-[#0A68FF] hover:underline">
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
};
