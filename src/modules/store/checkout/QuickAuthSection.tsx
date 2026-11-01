/**
 * SmartLab Store — Sección de Autenticación y Registro Rápido Integrado en el Checkout
 * docs/08_PLAN_SPRINTS.md (Sprint 07) y docs/06_DISENO_VISUAL_UX_UI.md (Sección 5.3)
 */

import React from 'react';
import { CheckCircle2, Phone, Mail, User, FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { QuickRegisterForm } from '../account/QuickRegisterForm';
import { DocumentType } from '../../../types/user.types';

export interface CheckoutCustomerContact {
  fullName: string;
  email: string;
  phoneNumber: string;
  documentType: DocumentType | '';
  documentNumber: string;
}

export interface QuickAuthSectionProps {
  contact: CheckoutCustomerContact;
  onContactChange: (updated: CheckoutCustomerContact) => void;
  onAuthComplete?: () => void;
}

export const QuickAuthSection: React.FC<QuickAuthSectionProps> = ({
  contact,
  onContactChange,
  onAuthComplete,
}) => {
  const { isAuthenticated, profile } = useAuth();

  if (!isAuthenticated || !profile) {
    return (
      <div className="space-y-3">
        <QuickRegisterForm onSuccess={onAuthComplete} />
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-[#0A68FF] shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-900">¿Por qué pedimos cuenta rápida?</strong> Tus licencias y archivos digitales quedan vinculados a tu correo único y número de WhatsApp para que puedas consultar estados, saldos por producto y enlaces autorizados en <strong>Mis Pedidos</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Paso 1 Completado — Cuenta Activa
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Datos del Comprador y WhatsApp de Entrega
            </h3>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          Sesión verificada
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nombre completo o Razón Social <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={contact.fullName}
              onChange={(e) =>
                onContactChange({
                  ...contact,
                  fullName: e.target.value,
                })
              }
              placeholder="Nombre completo"
              className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Correo electrónico de la cuenta
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              disabled
              value={contact.email}
              className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Teléfono / WhatsApp de Contacto y Entrega <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              inputMode="tel"
              required
              value={contact.phoneNumber}
              onChange={(e) =>
                onContactChange({
                  ...contact,
                  phoneNumber: e.target.value,
                })
              }
              placeholder="Ej. 987 654 321"
              className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            A este número de WhatsApp enviaremos los enlaces de descarga tras verificar el pago.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Doc. (Opcional)
            </label>
            <select
              value={contact.documentType}
              onChange={(e) =>
                onContactChange({
                  ...contact,
                  documentType: e.target.value as DocumentType | '',
                })
              }
              className="w-full h-11 px-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
            >
              <option value="">Ninguno</option>
              <option value="DNI">DNI</option>
              <option value="RUC">RUC</option>
              <option value="CE">CE</option>
            </select>
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              N° Documento
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                inputMode="numeric"
                value={contact.documentNumber}
                onChange={(e) =>
                  onContactChange({
                    ...contact,
                    documentNumber: e.target.value,
                  })
                }
                placeholder="DNI o RUC"
                className="w-full h-11 pl-9 pr-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
