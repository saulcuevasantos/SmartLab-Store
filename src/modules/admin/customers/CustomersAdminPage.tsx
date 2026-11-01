/**
 * SmartLab Store — Directorio e Historial de Clientes (Panel Administrativo)
 * docs/08_PLAN_SPRINTS.md (Sprint 08)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MessageCircle,
  Power,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import {
  AdminCustomerRecord,
  getAdminCustomers,
  toggleAdminCustomerActive,
} from '../../../services/admin.service';
import { formatPEN } from '../../../utils/currency';
import { sanitizeWhatsAppPhone } from '../../../utils/whatsapp';

export const CustomersAdminPage: React.FC = () => {
  const [customers, setCustomers] = useState<AdminCustomerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadCustomers = async () => {
    setIsLoading(true);
    const list = await getAdminCustomers();
    setCustomers(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.trim().toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone_number.toLowerCase().includes(q) ||
        (c.document_number?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, searchQuery]);

  const handleToggleActive = async (userId: string) => {
    const updated = await toggleAdminCustomerActive(userId);
    setCustomers(updated);
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
          CRM Operativo • Cuentas y Contacto WhatsApp
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Directorio e Historial de Clientes
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Consulta compradores registrados, correos únicos, teléfonos de WhatsApp, compras verificadas en Soles (`S/`) y saldos pendientes.
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente por nombre, correo, WhatsApp o DNI/RUC..."
            className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Total: {filtered.length} cuentas
        </span>
      </div>

      {/* Tabla de Clientes */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Cargando directorio de clientes...
          </div>
        ) : (
          <div className="table-scroll-container">
            <table className="w-full text-left border-collapse min-w-[820px] text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Cliente / Documento</th>
                  <th className="py-3 px-3">Correo Único</th>
                  <th className="py-3 px-3">WhatsApp</th>
                  <th className="py-3 px-3 text-center">Pedidos</th>
                  <th className="py-3 px-3 text-right">Gastado Verif. (PEN)</th>
                  <th className="py-3 px-3 text-right">Saldo Pend. (PEN)</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Contacto / Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((cust) => {
                  const waDigits = sanitizeWhatsAppPhone(cust.phone_number);
                  const waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(
                    `Hola ${cust.full_name}, te escribimos del área de atención al cliente de SmartLab Store.`
                  )}`;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{cust.full_name}</span>
                          {cust.role_id === 'admin' && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#0A68FF] text-[10px] font-bold inline-flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" /> ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {cust.document_type && cust.document_number
                            ? `${cust.document_type}: ${cust.document_number}`
                            : 'Sin documento registrado'}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {cust.email}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-xs font-semibold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          {cust.phone_number}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-slate-900">
                        {cust.total_orders_count}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                        {formatPEN(cust.total_verified_spent_pen)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-amber-800">
                        {formatPEN(cust.pending_balance_pen)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            cust.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {cust.is_active ? 'ACTIVO' : 'SUSPENDIDO'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold inline-flex items-center gap-1 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>

                          {cust.role_id !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(cust.id)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                              title={
                                cust.is_active
                                  ? 'Suspender cuenta'
                                  : 'Reactivar cuenta'
                              }
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
