/**
 * SmartLab Store — Visor de Bitácora Inmutable de Auditoría (AuditLogsAdminPage.tsx)
 * docs/08_PLAN_SPRINTS.md (Sprint 10), docs/04_BASE_DATOS.md (11.3 audit_logs) y docs/07_SEGURIDAD.md (Sección 8)
 */

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Eye,
  Lock,
  X,
  FileCode2,
} from 'lucide-react';
import {
  AuditLogRecord,
  getAuditLogs,
} from '../../../services/cancellations.service';

const ACTION_BADGE_MAP: Record<string, string> = {
  VERIFY_PAYMENT: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ALLOCATE_PAYMENT: 'bg-blue-50 text-blue-800 border-blue-200',
  SEND_LINK_WHATSAPP: 'bg-teal-50 text-teal-800 border-teal-200',
  REVOKE_DELIVERY: 'bg-rose-50 text-rose-800 border-rose-200',
  CANCEL_ORDER: 'bg-rose-50 text-rose-800 border-rose-200',
  COMPLETE_REFUND: 'bg-purple-50 text-purple-800 border-purple-200',
  INSERT: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  UPDATE: 'bg-amber-50 text-amber-800 border-amber-200',
  DELETE: 'bg-red-50 text-red-800 border-red-200',
};

export const AuditLogsAdminPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        entityType: entityFilter,
        action: actionFilter,
        search: searchQuery,
      });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter, actionFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Seguridad y Trazabilidad Forense • Tabla public.audit_logs
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0A68FF]" />
            Bitácora Inmutable de Auditoría (Solo Lectura)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Registro inalterable de verificaciones de pago, asignaciones por ítem, envíos de
            enlaces por WhatsApp, vencimientos, cancelaciones manuales y reembolsos efectivos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            Inmutable (UPDATE / DELETE Bloqueados en RLS)
          </span>
          <button
            type="button"
            onClick={loadLogs}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>
      </div>

      {/* Filtros de Auditoría */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por pedido SL-2026-..., operación, usuario o resumen..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#0A68FF]"
          />
        </div>

        <div>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="ALL">Todas las Entidades (entity_type)</option>
            <option value="ORDER">ORDER (Pedidos y Vencimientos)</option>
            <option value="PAYMENT">PAYMENT (Comprobantes)</option>
            <option value="ALLOCATION">ALLOCATION (Asignación por Ítem)</option>
            <option value="DELIVERY">DELIVERY (Entregas WhatsApp)</option>
            <option value="CANCELLATION">CANCELLATION (Cancelación Manual)</option>
            <option value="RESOLUTION">RESOLUTION (Resolución Administrativa)</option>
            <option value="REFUND">REFUND (Reembolsos)</option>
            <option value="CONFIG">CONFIG (Seguridad / Configuración)</option>
          </select>
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="ALL">Todas las Acciones (action)</option>
            <option value="VERIFY_PAYMENT">VERIFY_PAYMENT</option>
            <option value="ALLOCATE_PAYMENT">ALLOCATE_PAYMENT</option>
            <option value="SEND_LINK_WHATSAPP">SEND_LINK_WHATSAPP</option>
            <option value="CANCEL_ORDER">CANCEL_ORDER</option>
            <option value="COMPLETE_REFUND">COMPLETE_REFUND</option>
            <option value="REVOKE_DELIVERY">REVOKE_DELIVERY</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
          </select>
        </div>
      </div>

      {/* Tabla de Eventos Auditados */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-3 px-4">Fecha / Hora</th>
                <th className="py-3 px-3">Actor / IP</th>
                <th className="py-3 px-3">Entidad</th>
                <th className="py-3 px-3">Acción</th>
                <th className="py-3 px-3">Referencia y Detalle Auditado</th>
                <th className="py-3 px-4 text-right">Snapshots JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const badgeClass =
                  ACTION_BADGE_MAP[log.action] ||
                  'bg-slate-100 text-slate-700 border-slate-200';
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.actor_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        IP: {log.ip_address || '127.0.0.1'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-[11px]">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded border font-mono font-bold text-[11px] ${badgeClass}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.entity_label}</div>
                      <div className="text-slate-600 mt-0.5">{log.summary}</div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#0A68FF] text-slate-700 hover:text-[#0A68FF] font-semibold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver JSON
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Inspección de Snapshots old_data / new_data */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-blue-400 block">
                  ID Evento: {selectedLog.id} • {selectedLog.entity_type} / {selectedLog.action}
                </span>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-blue-400" />
                  {selectedLog.entity_label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <p className="text-slate-700 font-medium">{selectedLog.summary}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block font-bold text-slate-700 mb-1.5">
                    Estado Previo (old_data JSONB)
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>

                <div>
                  <span className="block font-bold text-slate-700 mb-1.5">
                    Estado Posterior (new_data JSONB)
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
                >
                  Cerrar Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
