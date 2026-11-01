/**
 * SmartLab Store — Gestión Administrativa de Cupones de Descuento en Soles (PEN / S/)
 * docs/08_PLAN_SPRINTS.md (Sprint 08)
 */

import React, { useState, useEffect } from 'react';
import {
  TicketPercent,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Power,
} from 'lucide-react';
import { Coupon } from '../../../types/order.types';
import {
  getAdminCoupons,
  saveAdminCoupon,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
} from '../../../services/admin.service';
import { formatPEN } from '../../../utils/currency';

export const CouponsAdminPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>(
    'PERCENTAGE'
  );
  const [discountValue, setDiscountValue] = useState('15');
  const [minimumOrderPen, setMinimumOrderPen] = useState('50');
  const [usageLimit, setUsageLimit] = useState('100');
  const [expiresAt, setExpiresAt] = useState('2027-12-31');
  const [isActive, setIsActive] = useState(true);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCoupons = async () => {
    const list = await getAdminCoupons();
    setCoupons(list);
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setEditingId(undefined);
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('15');
    setMinimumOrderPen('50');
    setUsageLimit('100');
    setExpiresAt('2027-12-31');
    setIsActive(true);
  };

  const handleEdit = (c: Coupon) => {
    setEditingId(c.id);
    setCode(c.code);
    setDescription(c.description || '');
    setDiscountType(c.discount_type);
    setDiscountValue(String(c.discount_value));
    setMinimumOrderPen(String(c.minimum_order_pen));
    setUsageLimit(c.usage_limit !== null ? String(c.usage_limit) : '');
    setExpiresAt(c.expires_at ? c.expires_at.slice(0, 10) : '');
    setIsActive(c.is_active);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const saved = await saveAdminCoupon({
        id: editingId,
        code,
        description,
        discount_type: discountType,
        discount_value: Number(discountValue),
        minimum_order_pen: Number(minimumOrderPen || 0),
        usage_limit: usageLimit.trim() ? Number(usageLimit) : null,
        expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59Z`).toISOString() : null,
        is_active: isActive,
      });

      await loadCoupons();
      setSuccessMsg(
        `El cupón ${saved.code} fue ${editingId ? 'actualizado' : 'creado'} y ya está operativo en el carrito.`
      );
      resetForm();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al guardar el cupón.'
      );
    }
  };

  const handleToggle = async (id: string) => {
    const updated = await toggleAdminCouponStatus(id);
    setCoupons(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = await deleteAdminCoupon(id);
    setCoupons(updated);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
          Promociones y Campañas • Moneda PEN (S/)
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Gestión de Cupones de Descuento
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Configura cupones porcentuales o de monto fijo en Soles (`S/`), compra mínima, fecha de expiración y límite de usos.
        </p>
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

      {/* Formulario de Creación / Edición */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <TicketPercent className="w-4 h-4 text-[#0A68FF]" />
            {editingId ? `Editando Cupón: ${code}` : 'Crear Nuevo Cupón de Descuento'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código del Cupón <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej. INGENIERIA25"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono font-bold uppercase text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo de Descuento
            </label>
            <select
              value={discountType}
              onChange={(e) =>
                setDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')
              }
              className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
            >
              <option value="PERCENTAGE">Porcentaje (%)</option>
              <option value="FIXED_AMOUNT">Monto Fijo (S/)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor ({discountType === 'PERCENTAGE' ? '%' : 'S/'})
            </label>
            <input
              type="number"
              step="0.01"
              min="0.1"
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm font-bold text-[#0A68FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Compra Mínima (S/)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minimumOrderPen}
              onChange={(e) => setMinimumOrderPen(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Límite de Usos
            </label>
            <input
              type="number"
              min="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="Ilimitado"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción Comercial
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. 25% de descuento en plantillas Excel y sistemas"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Válido hasta
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
            />
          </div>

          <div className="sm:col-span-3 flex items-center justify-end gap-3">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-[#0A68FF]"
              />
              Activo
            </label>

            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {editingId ? 'Actualizar Cupón' : 'Guardar Cupón'}
            </button>
          </div>
        </div>
      </form>

      {/* Tabla de Cupones */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="table-scroll-container">
          <table className="w-full text-left border-collapse min-w-[760px] text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-3">Beneficio</th>
                <th className="py-3 px-3 text-right">Mínimo (PEN)</th>
                <th className="py-3 px-3 text-center">Usos</th>
                <th className="py-3 px-3 text-center">Vencimiento</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {coupons.map((c) => {
                const isExpired =
                  c.expires_at !== null &&
                  new Date(c.expires_at).getTime() < Date.now();
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                        {c.code}
                      </span>
                      {c.description && (
                        <div className="text-xs text-slate-500 mt-1">
                          {c.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-bold text-[#0A68FF]">
                      {c.discount_type === 'PERCENTAGE'
                        ? `${c.discount_value}% OFF`
                        : `-${formatPEN(c.discount_value)}`}
                    </td>

                    <td className="py-3.5 px-3 text-right font-semibold text-slate-800">
                      {formatPEN(c.minimum_order_pen)}
                    </td>

                    <td className="py-3.5 px-3 text-center text-xs font-semibold text-slate-700">
                      {c.current_usage_count} / {c.usage_limit ?? '∞'}
                    </td>

                    <td className="py-3.5 px-3 text-center text-xs">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString('es-PE')
                        : 'Sin vencimiento'}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          !c.is_active
                            ? 'bg-slate-200 text-slate-700'
                            : isExpired
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {!c.is_active ? 'INACTIVO' : isExpired ? 'EXPIRADO' : 'ACTIVO'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0A68FF] hover:border-[#0A68FF]"
                          title="Editar cupón"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggle(c.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                          title={c.is_active ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
