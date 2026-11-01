/**
 * SmartLab Store — Gestión Administrativa de Precios en Soles (PEN / S/) y Promociones
 * docs/08_PLAN_SPRINTS.md (Sprint 08)
 */

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import {
  AdminProductWithLinks,
  getAdminProducts,
  updateProductPricingPEN,
} from '../../../services/admin.service';
import { formatPEN } from '../../../utils/currency';

interface EditablePricingRow {
  price_regular_pen: string;
  price_sale_pen: string;
  is_on_promotion: boolean;
  is_deal_of_the_day: boolean;
}

export const PricingAdminPage: React.FC = () => {
  const [products, setProducts] = useState<AdminProductWithLinks[]>([]);
  const [drafts, setDrafts] = useState<Record<string, EditablePricingRow>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    const prods = await getAdminProducts();
    setProducts(prods);

    const map: Record<string, EditablePricingRow> = {};
    for (const p of prods) {
      map[p.id] = {
        price_regular_pen: p.price_regular_pen.toFixed(2),
        price_sale_pen: p.price_sale_pen !== null ? p.price_sale_pen.toFixed(2) : '',
        is_on_promotion: p.is_on_promotion,
        is_deal_of_the_day: p.is_deal_of_the_day,
      };
    }
    setDrafts(map);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRow = async (product: AdminProductWithLinks) => {
    const row = drafts[product.id];
    if (!row) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingId(product.id);

    try {
      await updateProductPricingPEN(product.id, {
        price_regular_pen: Number(row.price_regular_pen || 0),
        price_sale_pen:
          row.is_on_promotion && row.price_sale_pen !== ''
            ? Number(row.price_sale_pen)
            : null,
        is_on_promotion: row.is_on_promotion,
        is_deal_of_the_day: row.is_deal_of_the_day,
        deal_expires_at: row.is_deal_of_the_day
          ? product.deal_expires_at ||
            new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString()
          : null,
      });

      await loadData();
      setSuccessMsg(
        `Precios en S/ actualizados para "${product.name}". Los pedidos anteriores conservan su precio histórico.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al actualizar el precio.'
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
          Tarifario Oficial • Moneda Única PEN (S/)
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Gestión de Precios en Soles (`S/`) y Promociones
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Ajusta precios regulares, descuentos promocionales y ofertas relámpago (`Deal of the Day`) en tiempo real.
        </p>
      </div>

      {/* Regla de Inmutabilidad de Snapshots */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-slate-700">
        <ShieldCheck className="w-4 h-4 text-[#0A68FF] shrink-0" />
        <span>
          <strong>Integridad Financiera:</strong> La modificación del precio de un producto en catálogo rige para nuevas compras y <strong>no altera los importes ni snapshots (`order_items`) de los pedidos creados previamente</strong>.
        </span>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabla de Edición Rápida de Precios en S/ */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="table-scroll-container">
          <table className="w-full text-left border-collapse min-w-[820px] text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                <th className="py-3 px-4">Producto / SKU</th>
                <th className="py-3 px-3 text-center">Modalidad</th>
                <th className="py-3 px-3">Precio Regular (S/)</th>
                <th className="py-3 px-3 text-center">En Promoción</th>
                <th className="py-3 px-3">Precio Oferta (S/)</th>
                <th className="py-3 px-3 text-center">Deal of the Day</th>
                <th className="py-3 px-3 text-right">Precio Vigente</th>
                <th className="py-3 px-4 text-right">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((prod) => {
                const draft = drafts[prod.id] || {
                  price_regular_pen: prod.price_regular_pen.toFixed(2),
                  price_sale_pen:
                    prod.price_sale_pen !== null ? prod.price_sale_pen.toFixed(2) : '',
                  is_on_promotion: prod.is_on_promotion,
                  is_deal_of_the_day: prod.is_deal_of_the_day,
                };

                const isFree = prod.modalidad === 'FREE';
                const effectivePen =
                  isFree
                    ? 0
                    : draft.is_on_promotion && draft.price_sale_pen !== ''
                      ? Number(draft.price_sale_pen)
                      : Number(draft.price_regular_pen || 0);

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 max-w-xs truncate">
                        {prod.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {prod.sku} • {prod.current_version}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {prod.modalidad}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isFree}
                        value={isFree ? '0.00' : draft.price_regular_pen}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [prod.id]: {
                              ...draft,
                              price_regular_pen: e.target.value,
                            },
                          }))
                        }
                        className="w-28 h-9 px-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs font-bold text-slate-900"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        disabled={isFree}
                        checked={!isFree && draft.is_on_promotion}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [prod.id]: {
                              ...draft,
                              is_on_promotion: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 rounded border-slate-300 text-[#0A68FF]"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isFree || !draft.is_on_promotion}
                        value={isFree ? '' : draft.price_sale_pen}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [prod.id]: {
                              ...draft,
                              price_sale_pen: e.target.value,
                            },
                          }))
                        }
                        placeholder="S/ Oferta"
                        className="w-28 h-9 px-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs font-bold text-[#0A68FF]"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.is_deal_of_the_day}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [prod.id]: {
                                ...draft,
                                is_deal_of_the_day: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 rounded border-slate-300 text-[#FF6B00]"
                        />
                        <Flame className="w-3.5 h-3.5 text-[#FF6B00]" />
                      </label>
                    </td>

                    <td className="py-3 px-3 text-right font-extrabold text-[#0A68FF]">
                      {formatPEN(effectivePen)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={savingId === prod.id}
                        onClick={() => handleSaveRow(prod)}
                        className="px-3 py-1.5 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {savingId === prod.id ? (
                          'Guardando...'
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            Aplicar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5" />
        <span>
          Todos los precios se expresan en Soles Peruanos (`PEN / S/`). Los productos con `Deal of the Day` activo se destacan en la sección de oferta relámpago de la portada.
        </span>
      </div>
    </div>
  );
};
