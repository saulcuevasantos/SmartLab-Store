/**
 * SmartLab Store — Modal de Evaluación y Ejecución de Reembolso Efectivo (RefundModal.tsx)
 * docs/08_PLAN_SPRINTS.md (Sprint 10), docs/04_BASE_DATOS.md y docs/07_SEGURIDAD.md
 *
 * Reglas de negocio aplicadas:
 * 1. BLOQUEO ESTRICTO: Un producto cuyo enlace ya fue enviado (ENTREGADO) NO es reembolsable.
 * 2. Solo se pueden reembolsar productos NO entregados que cuenten con saldo pagado verificado (allocated_paid_pen > 0).
 * 3. Todo reembolso exige registrar una Resolución Administrativa obligatoria.
 * 4. Un reembolso solo pasa a COMPLETADO cuando se registran los datos reales de la devolución efectiva del dinero
 *    (método Yape/Plin/Transferencia, cuenta o celular de destino, titular y número de operación).
 */

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  FileCheck2,
} from 'lucide-react';
import { OrderItem, PaymentMethod } from '../../../types/order.types';
import { OrderWithDetails } from '../../../services/orders.service';
import {
  getRefundedAmountForItem,
  registerOrCompleteRefundAdmin,
} from '../../../services/cancellations.service';
import { formatCurrencyPEN } from '../../../utils/currency';

export interface RefundModalProps {
  order: OrderWithDetails;
  item: OrderItem;
  adminUserId?: string;
  adminName?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  order,
  item,
  adminUserId,
  adminName,
  onClose,
  onSuccess,
}) => {
  const alreadyRefundedPen = getRefundedAmountForItem(item.id);
  const maxRefundablePen = Number(
    Math.max(0, item.allocated_paid_pen - alreadyRefundedPen).toFixed(2)
  );
  const isAlreadyDelivered =
    item.delivery_status === 'ENTREGADO' || Boolean(item.delivery?.delivered_at);

  const [refundAmountPen, setRefundAmountPen] = useState<string>(
    maxRefundablePen > 0 ? maxRefundablePen.toFixed(2) : '0.00'
  );
  const [refundStatus, setRefundStatus] = useState<
    'COMPLETADO' | 'APROBADO_PENDIENTE_DEVOLUCION' | 'EN_EVALUACION'
  >('COMPLETADO');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(
    order.payment_method_selected || 'YAPE'
  );
  const [destinationAccount, setDestinationAccount] = useState<string>(
    order.buyer_phone || ''
  );
  const [destinationHolderName, setDestinationHolderName] = useState<string>(
    order.buyer_name || ''
  );
  const [operationReference, setOperationReference] = useState<string>('');
  const [receiptStoragePath, setReceiptStoragePath] = useState<string>('');
  const [reason, setReason] = useState<string>(
    'Devolución de abono verificado sobre producto no entregado a solicitud del cliente.'
  );
  const [decisionSummary, setDecisionSummary] = useState<string>(
    `Resolución de reembolso sobre ítem no entregado (${item.product_name_snapshot})`
  );
  const [resolutionNotes, setResolutionNotes] = useState<string>(
    `Se verificó que el enlace de descarga del producto "${item.product_name_snapshot}" NUNCA fue enviado al cliente (estado: ${item.delivery_status}) y cuenta con S/ ${item.allocated_paid_pen.toFixed(2)} abonados y verificados.`
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const result = await registerOrCompleteRefundAdmin({
        orderId: order.id,
        orderItemId: item.id,
        refundAmountPen: Number(refundAmountPen),
        refundStatus,
        refundMethod: refundStatus === 'COMPLETADO' ? refundMethod : null,
        destinationAccount: refundStatus === 'COMPLETADO' ? destinationAccount : null,
        destinationHolderName:
          refundStatus === 'COMPLETADO' ? destinationHolderName : null,
        operationReference: refundStatus === 'COMPLETADO' ? operationReference : null,
        receiptStoragePath: receiptStoragePath.trim() || null,
        reason,
        decisionSummary,
        resolutionNotes,
        adminUserId,
        adminName,
      });

      if (result.error) {
        setErrorMsg(result.error);
        return;
      }

      onSuccess(
        refundStatus === 'COMPLETADO'
          ? `Reembolso efectivo COMPLETADO por ${formatCurrencyPEN(
              Number(refundAmountPen)
            )} (Op. ${operationReference}) para "${item.product_name_snapshot}".`
          : `Evaluación de reembolso registrada en estado ${refundStatus} para "${item.product_name_snapshot}".`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Cabecera */}
        <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
              Gestión de Reembolsos por Ítem • Pedido {order.order_code}
            </span>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Evaluar / Registrar Devolución Efectiva de Dinero (PEN S/)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar modal de reembolso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Resumen del Producto e Integridad de Entrega */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  Producto seleccionado del pedido {order.order_code}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {item.product_name_snapshot}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({item.product_version_snapshot})
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cliente: <strong>{order.buyer_name}</strong> • WhatsApp:{' '}
                  <span className="font-mono">{order.buyer_phone}</span>
                </p>
              </div>

              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                  isAlreadyDelivered
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                Estado Entrega: {item.delivery_status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Precio Neto Ítem</span>
                <strong className="text-slate-900 font-bold">
                  {formatCurrencyPEN(item.final_item_price_pen)}
                </strong>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Pagado Asignado</span>
                <strong className="text-emerald-700 font-bold">
                  {formatCurrencyPEN(item.allocated_paid_pen)}
                </strong>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Reembolsado Previo</span>
                <strong className="text-purple-700 font-bold">
                  {formatCurrencyPEN(alreadyRefundedPen)}
                </strong>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Saldo Reembolsable</span>
                <strong className="text-[#0A68FF] font-bold">
                  {formatCurrencyPEN(maxRefundablePen)}
                </strong>
              </div>
            </div>
          </div>

          {/* Alerta de Bloqueo si el Producto ya fue ENTREGADO */}
          {isAlreadyDelivered && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
                <Lock className="w-4 h-4 shrink-0" />
                BLOQUEO DE SEGURIDAD: Producto con Enlace Enviado (ENTREGADO)
              </div>
              <p>
                De acuerdo con las reglas financieras de SmartLab Store (
                <code className="font-mono">trg_prevent_delivered_refund</code>),{' '}
                <strong>
                  un producto cuyo enlace de descarga ya fue enviado al cliente NO es
                  reembolsable bajo ninguna circunstancia
                </strong>
                . Si intentas procesar el formulario, el sistema rechazará la operación.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Datos de Importe y Estado del Reembolso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monto a Reembolsar en Soles (S/) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundablePen > 0 ? maxRefundablePen : undefined}
                value={refundAmountPen}
                onChange={(e) => setRefundAmountPen(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#0A68FF]"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Máximo disponible para este ítem: {formatCurrencyPEN(maxRefundablePen)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estado de la Operación de Reembolso *
              </label>
              <select
                value={refundStatus}
                onChange={(e) =>
                  setRefundStatus(
                    e.target.value as
                      | 'COMPLETADO'
                      | 'APROBADO_PENDIENTE_DEVOLUCION'
                      | 'EN_EVALUACION'
                  )
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#0A68FF]"
              >
                <option value="COMPLETADO">
                  COMPLETADO (Con devolución efectiva de dinero ejecutada)
                </option>
                <option value="APROBADO_PENDIENTE_DEVOLUCION">
                  APROBADO PENDIENTE DE DEVOLUCIÓN (Por transferir)
                </option>
                <option value="EN_EVALUACION">EN EVALUACIÓN ADMINISTRATIVA</option>
              </select>
            </div>
          </div>

          {/* 2. Constancia Obligatoria de Devolución Efectiva de Dinero (cuando es COMPLETADO) */}
          {refundStatus === 'COMPLETADO' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Datos Obligatorios de la Devolución Efectiva del Dinero (chk_refund_completed_requires_proof)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medio de Devolución Utilizado *
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as PaymentMethod)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="YAPE">YAPE (Devolución a celular)</option>
                    <option value="PLIN">PLIN (Devolución a celular)</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA (CCI / Cuenta S/)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° de Operación de la Transferencia Efectiva *
                  </label>
                  <input
                    type="text"
                    value={operationReference}
                    onChange={(e) => setOperationReference(e.target.value)}
                    placeholder="Ej. YAPE-9940218 o BCP-7712904"
                    required={refundStatus === 'COMPLETADO'}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cuenta Bancaria o Celular Receptor del Cliente *
                  </label>
                  <input
                    type="text"
                    value={destinationAccount}
                    onChange={(e) => setDestinationAccount(e.target.value)}
                    placeholder="Ej. 987 654 321 o 191-0000000-0-00"
                    required={refundStatus === 'COMPLETADO'}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Titular Receptor *
                  </label>
                  <input
                    type="text"
                    value={destinationHolderName}
                    onChange={(e) => setDestinationHolderName(e.target.value)}
                    placeholder="Nombre completo del cliente titular"
                    required={refundStatus === 'COMPLETADO'}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ruta / URL del Comprobante de Devolución (Bucket privado payment-receipts)
                </label>
                <input
                  type="text"
                  value={receiptStoragePath}
                  onChange={(e) => setReceiptStoragePath(e.target.value)}
                  placeholder="Opcional: receipts/refunds/constancia-devolucion.png"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                />
              </div>
            </div>
          )}

          {/* 3. Resolución Administrativa Obligatoria (administrative_resolutions) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4 text-[#0A68FF] shrink-0" />
              Resolución Administrativa Obligatoria (EVALUACION_REEMBOLSO)
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo del Reembolso *
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resumen de la Decisión Administrativa *
              </label>
              <input
                type="text"
                value={decisionSummary}
                onChange={(e) => setDecisionSummary(e.target.value)}
                required
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sustento Detallado en Acta (administrative_resolutions.notes) *
              </label>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900"
              />
            </div>
          </div>

          {!isAlreadyDelivered && maxRefundablePen <= 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Este ítem no entregado aún no registra saldo pagado verificado disponible para
                reembolsar (S/ 0.00).
              </span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              {submitting
                ? 'Procesando resolución...'
                : refundStatus === 'COMPLETADO'
                ? 'Confirmar Devolución Efectiva y Completar Reembolso'
                : 'Guardar Evaluación de Reembolso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
