/**
 * SmartLab Store — Bandeja Administrativa de Solicitudes Personalizadas (`custom_requests`)
 * docs/08_PLAN_SPRINTS.md (Sprint 08)
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquarePlus,
  MessageCircle,
  Save,
  CheckCircle2,
  Mail,
  Phone,
} from 'lucide-react';
import {
  AdminCustomRequestExtended,
  getAdminCustomRequests,
  updateAdminCustomRequest,
} from '../../../services/admin.service';
import { formatPEN } from '../../../utils/currency';
import { sanitizeWhatsAppPhone } from '../../../utils/whatsapp';

export const CustomRequestsAdminPage: React.FC = () => {
  const [requests, setRequests] = useState<AdminCustomRequestExtended[]>([]);
  const [draftQuotes, setDraftQuotes] = useState<
    Record<
      string,
      {
        status: AdminCustomRequestExtended['status'];
        quoted_price_pen: string;
        admin_notes: string;
      }
    >
  >({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const loadData = async () => {
    const list = await getAdminCustomRequests();
    setRequests(list);

    const map: typeof draftQuotes = {};
    for (const r of list) {
      map[r.id] = {
        status: r.status,
        quoted_price_pen:
          r.quoted_price_pen !== null && r.quoted_price_pen !== undefined
            ? String(r.quoted_price_pen)
            : r.estimated_budget_pen
              ? String(r.estimated_budget_pen)
              : '',
        admin_notes: r.admin_notes || '',
      };
    }
    setDraftQuotes(map);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (req: AdminCustomRequestExtended) => {
    const draft = draftQuotes[req.id];
    if (!draft) return;

    const updated = await updateAdminCustomRequest(req.id, {
      status: draft.status,
      quoted_price_pen: draft.quoted_price_pen.trim()
        ? Number(draft.quoted_price_pen)
        : null,
      admin_notes: draft.admin_notes.trim() || null,
    });
    setRequests(updated);
    setSavedNotice(
      `Solicitud de "${req.requester_name}" actualizada a estado ${draft.status}.`
    );
    setTimeout(() => setSavedNotice(null), 4000);
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
          Soluciones a Medida • Cotizaciones en Soles (PEN / S/)
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquarePlus className="w-6 h-6 text-[#0A68FF]" />
          Bandeja de Solicitudes Personalizadas
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Evalúa requerimientos de software, macros Excel o apps a medida, define la cotización en Soles (`S/`) y envía la propuesta por WhatsApp.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{savedNotice}</span>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((req) => {
          const draft = draftQuotes[req.id] || {
            status: req.status,
            quoted_price_pen: '',
            admin_notes: '',
          };

          const waPhone = sanitizeWhatsAppPhone(req.requester_phone);
          const quotedText = draft.quoted_price_pen
            ? formatPEN(Number(draft.quoted_price_pen))
            : 'por definir';
          const waMsg =
            `👋 Hola *${req.requester_name}*, te saludamos de *SmartLab Store* respecto a tu solicitud de desarrollo personalizado.\n\n` +
            `📋 *Requerimiento:* ${req.requirements_detail}\n` +
            `💰 *Cotización estimada (PEN):* ${quotedText}\n\n` +
            `Quedamos atentos para coordinar los alcances y tiempos de entrega.`;
          const waHref = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`;

          return (
            <div
              key={req.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {req.requester_name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 text-[#0A68FF] border border-blue-200 text-xs font-bold">
                      {req.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {req.requester_email}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      WhatsApp: {req.requester_phone}
                    </span>
                    {req.estimated_budget_pen && (
                      <span>
                        Presupuesto referencial cliente:{' '}
                        <strong>{formatPEN(req.estimated_budget_pen)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar Propuesta por WhatsApp
                </a>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-xs sm:text-sm text-slate-700">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
                  Detalle Técnico Solicitado:
                </span>
                {req.requirements_detail}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de Evaluación
                  </label>
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraftQuotes((prev) => ({
                        ...prev,
                        [req.id]: {
                          ...draft,
                          status: e.target.value as AdminCustomRequestExtended['status'],
                        },
                      }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                  >
                    <option value="RECIBIDA">RECIBIDA</option>
                    <option value="EN_EVALUACION">EN EVALUACIÓN</option>
                    <option value="COTIZADA">COTIZADA</option>
                    <option value="ACEPTADA">ACEPTADA</option>
                    <option value="DESCARTADA">DESCARTADA</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Precio Cotizado en Soles (S/)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.quoted_price_pen}
                    onChange={(e) =>
                      setDraftQuotes((prev) => ({
                        ...prev,
                        [req.id]: {
                          ...draft,
                          quoted_price_pen: e.target.value,
                        },
                      }))
                    }
                    placeholder="Ej. 950.00"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm font-bold text-[#0A68FF]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas Internas del Administrador
                  </label>
                  <input
                    type="text"
                    value={draft.admin_notes}
                    onChange={(e) =>
                      setDraftQuotes((prev) => ({
                        ...prev,
                        [req.id]: {
                          ...draft,
                          admin_notes: e.target.value,
                        },
                      }))
                    }
                    placeholder="Acuerdos, alcance o plazos..."
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => handleSave(req)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
