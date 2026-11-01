import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { OrderWithDetails } from '../../../services/orders.service';
import {
  AdminPaymentWithContext,
  allocateVerifiedPaymentToItems,
  loadAdminLocalAllocations,
  loadAdminLocalPayments,
} from '../../../services/payments.service';
import { formatCurrencyPEN } from '../../../utils/currency';

interface PaymentAllocationModalProps {
  payment: AdminPaymentWithContext;
  order: OrderWithDetails;
  onClose: () => void;
  onSuccess: (updatedOrder: OrderWithDetails) => void;
}

export const PaymentAllocationModal: React.FC<PaymentAllocationModalProps> = ({
  payment,
  order,
  onClose,
  onSuccess,
}) => {
  const [draftAmounts, setDraftAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calcular cuánto ya tienen asignado los ítems por OTROS comprobantes verificados del mismo pedido
  const otherPaymentsAllocatedByItem = useMemo(() => {
    const allPayments = loadAdminLocalPayments();
    const allAllocations = loadAdminLocalAllocations();

    const otherVerifiedIds = new Set(
      allPayments
        .filter(
          (p) =>
            p.order_id === order.id &&
            p.id !== payment.id &&
            p.verification_status === 'VERIFICADO'
        )
        .map((p) => p.id)
    );

    const map: Record<string, number> = {};
    for (const item of order.items || []) {
      const sumOther = allAllocations
        .filter((a) => a.order_item_id === item.id && otherVerifiedIds.has(a.payment_id))
        .reduce((acc, a) => acc + Number(a.amount_allocated_pen || 0), 0);
      map[item.id] = Number(sumOther.toFixed(2));
    }
    return map;
  }, [order, payment.id]);

  // Inicializar con las asignaciones actuales de este comprobante
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const item of order.items || []) {
      const found = (payment.allocations || []).find((a) => a.order_item_id === item.id);
      initial[item.id] = found ? Number(found.amount_allocated_pen).toFixed(2) : '0.00';
    }
    setDraftAmounts(initial);
  }, [order.items, payment.allocations]);

  const verifiedBudgetPen = Number((payment.amount_verified_pen || 0).toFixed(2));

  const currentAllocatedSumPen = useMemo(() => {
    const total = Object.values(draftAmounts).reduce((acc: number, val) => {
      const num = parseFloat(String(val));
      return acc + (Number.isFinite(num) && num > 0 ? num : 0);
    }, 0);
    return Number(total.toFixed(2));
  }, [draftAmounts]);

  const remainingToAllocatePen = Number(
    (verifiedBudgetPen - currentAllocatedSumPen).toFixed(2)
  );

  // Auto-distribuir secuencialmente cubriendo el 100% de los primeros productos hasta agotar el monto verificado
  const handleAutoDistributeSequential = () => {
    setErrorMsg(null);
    let available = verifiedBudgetPen;
    const nextDraft: Record<string, string> = {};

    for (const item of order.items || []) {
      const paidByOthers = otherPaymentsAllocatedByItem[item.id] || 0;
      const maxNeed = Number(Math.max(0, item.final_item_price_pen - paidByOthers).toFixed(2));
      const toAssign = Number(Math.min(available, maxNeed).toFixed(2));
      nextDraft[item.id] = toAssign.toFixed(2);
      available = Number(Math.max(0, available - toAssign).toFixed(2));
    }

    setDraftAmounts(nextDraft);
  };

  const handleCoverSingleItemFull = (itemId: string, maxNeedForThisPayment: number) => {
    setErrorMsg(null);
    const otherCurrentSum = Object.entries(draftAmounts).reduce((acc, [id, val]) => {
      if (id === itemId) return acc;
      const num = parseFloat(String(val));
      return acc + (Number.isFinite(num) && num > 0 ? num : 0);
    }, 0);

    const budgetLeftForThisItem = Math.max(0, verifiedBudgetPen - otherCurrentSum);
    const targetAmount = Number(Math.min(maxNeedForThisPayment, budgetLeftForThisItem).toFixed(2));

    setDraftAmounts((prev) => ({
      ...prev,
      [itemId]: targetAmount.toFixed(2),
    }));
  };

  const handleResetZero = () => {
    setErrorMsg(null);
    const cleared: Record<string, string> = {};
    for (const item of order.items || []) {
      cleared[item.id] = '0.00';
    }
    setDraftAmounts(cleared);
  };

  const handleSaveAllocations = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const lines = (order.items || []).map((item) => {
      const parsed = parseFloat(draftAmounts[item.id] || '0');
      return {
        order_item_id: item.id,
        amount_allocated_pen: Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0,
      };
    });

    setSubmitting(true);
    try {
      const { order: updatedOrder, error } = await allocateVerifiedPaymentToItems({
        paymentId: payment.id,
        allocations: lines,
      });

      if (error || !updatedOrder) {
        setErrorMsg(error || 'No se pudo guardar la asignación del pago.');
        return;
      }

      onSuccess(updatedOrder);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full overflow-hidden shadow-xl my-8">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold">
                Asignación de Pago Verificado por Producto (payment_allocations)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Pedido <span className="font-mono font-semibold">{order.order_code}</span> • Comprobante{' '}
              {payment.payment_method} ({payment.operation_number || 'Sin N° Op'})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveAllocations} className="p-6 space-y-5">
          {/* Resumen del presupuesto del comprobante */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-emerald-800 font-medium">
                Monto Verificado del Voucher
              </p>
              <p className="text-xl font-bold text-emerald-900 mt-0.5">
                {formatCurrencyPEN(verifiedBudgetPen)}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-800 font-medium">
                Suma Asignada a Productos
              </p>
              <p className="text-xl font-bold text-blue-900 mt-0.5">
                {formatCurrencyPEN(currentAllocatedSumPen)}
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                remainingToAllocatePen < 0
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : remainingToAllocatePen === 0
                  ? 'bg-slate-50 border-slate-200 text-slate-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <p className="text-xs font-medium">Saldo del Voucher sin Asignar</p>
              <p className="text-xl font-bold mt-0.5">
                {formatCurrencyPEN(remainingToAllocatePen)}
              </p>
            </div>
          </div>

          {/* Acciones rápidas de distribución */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600">
              Un producto solo habilita su enlace de entrega cuando alcanza el{' '}
              <strong>100% de su precio neto</strong>.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoDistributeSequential}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-distribuir por prioridad
              </button>
              <button
                type="button"
                onClick={handleResetZero}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-100"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Lista de productos del pedido */}
          <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
            {(order.items || []).map((item, idx) => {
              const paidByOthers = otherPaymentsAllocatedByItem[item.id] || 0;
              const maxAllowedFromThisPayment = Number(
                Math.max(0, item.final_item_price_pen - paidByOthers).toFixed(2)
              );
              const currentDraftNum = parseFloat(draftAmounts[item.id] || '0') || 0;
              const resultingTotalPaidOnItem = Number(
                (paidByOthers + currentDraftNum).toFixed(2)
              );
              const resultingBalanceOnItem = Number(
                Math.max(0, item.final_item_price_pen - resultingTotalPaidOnItem).toFixed(2)
              );
              const willBeFullyPaid =
                resultingBalanceOnItem === 0 &&
                resultingTotalPaidOnItem <= item.final_item_price_pen + 0.001;
              const isOverItemLimit = currentDraftNum > maxAllowedFromThisPayment + 0.001;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isOverItemLimit
                      ? 'border-rose-300 bg-rose-50/40'
                      : willBeFullyPaid
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                          Ítem #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.product_name_snapshot}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>
                          Precio Neto: <strong>{formatCurrencyPEN(item.final_item_price_pen)}</strong>
                        </span>
                        <span>
                          Cubierto por otros vouchers:{' '}
                          <strong>{formatCurrencyPEN(paidByOthers)}</strong>
                        </span>
                        <span>
                          Máximo asignable aquí:{' '}
                          <strong className="text-blue-700">
                            {formatCurrencyPEN(maxAllowedFromThisPayment)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleCoverSingleItemFull(item.id, maxAllowedFromThisPayment)
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 whitespace-nowrap"
                      >
                        Cubrir 100%
                      </button>

                      <div className="relative w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          S/
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={maxAllowedFromThisPayment}
                          value={draftAmounts[item.id] ?? '0.00'}
                          onChange={(e) => {
                            setErrorMsg(null);
                            setDraftAmounts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }));
                          }}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-right font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Estado proyectado del ítem tras la asignación */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {isOverItemLimit ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Excede el saldo pendiente del producto por{' '}
                          {formatCurrencyPEN(currentDraftNum - maxAllowedFromThisPayment)}
                        </span>
                      ) : willBeFullyPaid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Quedará 100% PAGADO_TOTAL (Habilitado como LISTO_ENTREGA por WhatsApp)
                        </span>
                      ) : resultingTotalPaidOnItem > 0 ? (
                        <span className="text-amber-800 font-medium">
                          Quedará en PAGO_PARCIAL (Entrega bloqueada hasta cubrir los{' '}
                          {formatCurrencyPEN(resultingBalanceOnItem)} restantes)
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Sin pago asignado (SIN_PAGO — Entrega bloqueada)
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-xs text-slate-700">
                      Acumulado: <strong>{formatCurrencyPEN(resultingTotalPaidOnItem)}</strong> /{' '}
                      {formatCurrencyPEN(item.final_item_price_pen)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Moneda oficial: Soles Peruanos (PEN / S/)</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || remainingToAllocatePen < -0.001}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando Asignación...' : 'Guardar Asignación por Producto'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
