/**
 * SmartLab Store — Componente Reutilizable de Registro Rápido Integrado para el Checkout
 * docs/08_PLAN_SPRINTS.md (Sprint 03 & Sprint 07) y docs/06_DISENO_VISUAL_UX_UI.md (Sección 5.3)
 *
 * Permite al visitante crear su cuenta (Correo obligatorio y único + Contraseña + Teléfono obligatorio
 * para WhatsApp, sin verificación SMS) o iniciar sesión directamente dentro del Checkout.
 */

import React, { useState } from 'react';
import { Eye, EyeOff, UserPlus, LogIn, CheckCircle2, AlertCircle, Phone, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { DocumentType } from '../../../types/user.types';

export interface QuickRegisterFormProps {
  onSuccess?: () => void;
}

export const QuickRegisterForm: React.FC<QuickRegisterFormProps> = ({ onSuccess }) => {
  const { isAuthenticated, profile, register, login } = useAuth();
  const [mode, setMode] = useState<'register' | 'login'>('register');

  // Campos de Registro Rápido
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isAuthenticated && profile) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-semibold text-slate-900">
              Sesión activa para tu pedido: {profile.full_name}
            </h4>
            <p className="text-slate-600 text-xs mt-1">
              Correo de cuenta: <strong className="break-safe">{profile.email}</strong> • WhatsApp de contacto y entrega:{' '}
              <strong>{profile.phone_number}</strong>
            </p>
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
      if (mode === 'register') {
        await register({
          fullName,
          email,
          phoneNumber,
          password,
          documentType: documentType ? (documentType as DocumentType) : null,
          documentNumber: documentNumber || null,
        });
      } else {
        await login({ email, password });
      }
      onSuccess?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs">
      {/* Selector de pestañas: Registro Rápido vs Iniciar Sesión */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Paso 1 — Cuenta del Comprador
          </span>
          <h3 className="text-base sm:text-lg font-bold text-slate-900">
            {mode === 'register'
              ? 'Registro Rápido Integrado en el Checkout'
              : 'Iniciar Sesión con tu Cuenta'}
          </h3>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
              mode === 'register'
                ? 'bg-white text-[#0A68FF] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Crear Cuenta Rápida
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
              mode === 'login'
                ? 'bg-white text-[#0A68FF] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Ya tengo cuenta
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
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
                placeholder="Ej. Juan Pérez o Inversiones Perú SAC"
                className="w-full h-12 pl-10 pr-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={mode === 'login' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Correo electrónico (Obligatorio y único) <span className="text-red-500">*</span>
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

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Teléfono / WhatsApp <span className="text-red-500">*</span>
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
                Aquí coordinaremos tu pago y te enviaremos los enlaces de descarga (sin verificación por SMS).
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Contraseña {mode === 'register' && '(Mínimo 8 caracteres)'}{' '}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={mode === 'register' ? 8 : 1}
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

        {mode === 'register' && (
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
                placeholder="DNI (8 dígitos) o RUC (11 dígitos)"
                className="w-full h-12 px-3.5 rounded-lg border border-slate-300 text-base text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2"
        >
          {isSubmitting
            ? 'Procesando...'
            : mode === 'register'
              ? 'Crear Cuenta Rápida y Continuar en Checkout'
              : 'Iniciar Sesión y Continuar en Checkout'}
        </button>
      </form>
    </div>
  );
};
