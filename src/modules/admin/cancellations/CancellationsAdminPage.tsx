/**
 * SmartLab Store — Gestión de Vencimientos (72h), Cancelaciones Manuales, Resoluciones y Reembolsos
 * docs/08_PLAN_SPRINTS.md (Sprint 10), docs/04_BASE_DATOS.md, docs/05_PEDIDOS_PAGOS.md y docs/07_SEGURIDAD.md
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Scale,
  Clock,
  Ban,
  Banknote,
  FileCheck2,
  Search,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Lock,
  RotateCcw,
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { OrderItem, OrderStatus, PaymentMethod } from '../../../types/order.types';
import { OrderWithDetails } from '../../../services/orders.service';
import { getAllAdminOrders } from '../../../services/payments.service';
import {
  AdministrativeResolutionRecord,
  CancellationType,
  OrderCancellationRecord,
  RefundRecord,
  cancelOrderManuallyAdmin,
  completeExistingRefundAdmin,
  getAdministrativeResolutions,
  getAllAdminRefunds,
  getOrderCancellations,
  getRefundedAmountForItem,
  markOrderAsExpiredAdmin,
  reactivateExpiredOrderAdmin,
} from '../../../services/cancellations.service';
import { formatCurrencyPEN } from '../../../utils/currency';
import { RefundModal } from './RefundModal';

const STATUS_BADGE: Record<OrderStatus, { label: string; className: string }> = {
  PENDIENTE_PAGO: {
    label: 'Pendiente de Pago',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  PAGO_EN_REVISION: {
    label: 'Pago en Revisión',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  PAGO_PARCIAL: {
    label: 'Pago Parcial',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  PAGO_VERIFICADO: {
    label: 'Pago Verificado (100%)',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  COMPLETADO: {
    label: 'Completado',
    className: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  OBSERVADO: {
    label: 'Observado',
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  VENCIDO: {
    label: 'Vencido (Saldos Preservados)',
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  CANCELADO: {
    label: 'Cancelado (Entregas Bloqueadas)',
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  REEMBOLSADO: {
    label: 'Reembolsado',
    className: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

export const CancellationsAdminPage: React.FC = () => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'ORDERS' | 'REFUNDS' | 'RESOLUTIONS'>('ORDERS');
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [resolutions, setResolutions] = useState<AdministrativeResolutionRecord[]>([]);
  const [cancellations, setCancellations] = useState<OrderCancellationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Estado para Modal de Cancelación Manual con Resolución Obligatoria
  const [orderToCancel, setOrderToCancel] = useState<OrderWithDetails | null>(null);
  const [cancellationType, setCancellationType] =
    useState<CancellationType>('CLIENTE_SOLICITUD');
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [cancelDecisionSummary, setCancelDecisionSummary] = useState<string>('');
  const [cancelResolutionNotes, setCancelResolutionNotes] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Estado para Modal de Reactivación de Pedido Vencido (72h)
  const [orderToReactivate, setOrderToReactivate] = useState<OrderWithDetails | null>(null);
  const [reactivateHours, setReactivateHours] = useState<number>(72);
  const [reactivateSummary, setReactivateSummary] = useState<string>('');
  const [reactivateNotes, setReactivateNotes] = useState<string>('');
  const [isReactivating, setIsReactivating] = useState<boolean>(false);

  // Estado para Modal de Reembolso por Producto
  const [refundTarget, setRefundTarget] = useState<{
    order: OrderWithDetails;
    item: OrderItem;
  } | null>(null);

  // Estado para Completar un Reembolso Pendiente de Devolución
  const [refundToComplete, setRefundToComplete] = useState<RefundRecord | null>(null);
  const [completeMethod, setCompleteMethod] = useState<PaymentMethod>('YAPE');
  const [completeDestinationAccount, setCompleteDestinationAccount] = useState<string>('');
  const [completeHolderName, setCompleteHolderName] = useState<string>('');
  const [completeOperationRef, setCompleteOperationRef] = useState<string>('');
  const [isCompletingRefund, setIsCompletingRefund] = useState<boolean>(false);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ordData, refData, resData, cancData] = await Promise.all([
        getAllAdminOrders(),
        getAllAdminRefunds(),
        getAdministrativeResolutions(),
        getOrderCancellations(),
      ]);
      setOrders(ordData);
      setRefunds(refData);
      setResolutions(resData);
      setCancellations(cancData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const notifySuccess = (msg: string) => {
    setFeedbackError(null);
    setFeedbackSuccess(msg);
    setTimeout(() => setFeedbackSuccess(null), 6000);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      return (
        o.order_code.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.buyer_email.toLowerCase().includes(q) ||
        o.buyer_phone.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, searchTerm]);

  const kpis = useMemo(() => {
    const expiredOrders = orders.filter((o) => o.status === 'VENCIDO');
    const preservedInExpiredPen = expiredOrders.reduce(
      (acc, o) => acc + Number(o.total_paid_verified_pen || 0),
      0
    );
    const completedRefunds = refunds.filter((r) => r.refund_status === 'COMPLETADO');
    const totalRefundedPen = completedRefunds.reduce(
      (acc, r) => acc + Number(r.refund_amount_pen || 0),
      0
    );

    return {
      expiredCount: expiredOrders.length,
      preservedInExpiredPen,
      cancellationsCount: cancellations.length,
      completedRefundsCount: completedRefunds.length,
      totalRefundedPen,
      resolutionsCount: resolutions.length,
    };
  }, [orders, refunds, cancellations, resolutions]);

  const openCancelModal = (order: OrderWithDetails) => {
    setFeedbackError(null);
    setOrderToCancel(order);
    setCancellationType('CLIENTE_SOLICITUD');
    setCancellationReason(
      'Desistimiento comercial / Anulación solicitada antes del despacho de enlaces pendientes.'
    );
    setCancelDecisionSummary(
      `Resolución de Cancelación Manual del Pedido ${order.order_code} con bloqueo de entregas pendientes`
    );
    setCancelResolutionNotes(
      `Se procede a cancelar manualmente el pedido ${order.order_code} del cliente ${order.buyer_name}. Se bloquean de inmediato todas las entregas pendientes (REVOCADO) y se preserva el historial contable (Pagado verificado: S/ ${order.total_paid_verified_pen.toFixed(2)}).`
    );
  };

  const handleConfirmManualCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToCancel) return;
    setIsCancelling(true);
    setFeedbackError(null);

    try {
      const result = await cancelOrderManuallyAdmin({
        orderId: orderToCancel.id,
        cancellationType,
        cancellationReason,
        decisionSummary: cancelDecisionSummary,
        resolutionNotes: cancelResolutionNotes,
        adminUserId: profile?.id,
        adminName: profile?.full_name,
      });

      if (result.error) {
        setFeedbackError(result.error);
        return;
      }

      setOrderToCancel(null);
      await loadAllData();
      notifySuccess(
        `Pedido ${orderToCancel.order_code} cancelado manualmente. Todas las entregas pendientes fueron bloqueadas (REVOCADO) y se registró la resolución administrativa.`
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const openReactivateModal = (order: OrderWithDetails) => {
    setFeedbackError(null);
    setOrderToReactivate(order);
    setReactivateHours(72);
    setReactivateSummary(
      `Reactivación administrativa de pedido vencido ${order.order_code} (+72 horas)`
    );
    setReactivateNotes(
      `El cliente ${order.buyer_name} se comunicó por WhatsApp para completar el saldo pendiente de S/ ${order.balance_due_pen.toFixed(2)}. Se conserva íntegramente su abono verificado histórico de S/ ${order.total_paid_verified_pen.toFixed(2)} y se amplía la vigencia por 72 horas.`
    );
  };

  const handleConfirmReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToReactivate) return;
    setIsReactivating(true);
    setFeedbackError(null);

    try {
      const result = await reactivateExpiredOrderAdmin({
        orderId: orderToReactivate.id,
        extensionHours: reactivateHours,
        decisionSummary: reactivateSummary,
        notes: reactivateNotes,
        adminUserId: profile?.id,
        adminName: profile?.full_name,
      });

      if (result.error) {
        setFeedbackError(result.error);
        return;
      }

      setOrderToReactivate(null);
      await loadAllData();
      notifySuccess(
        `Pedido ${orderToReactivate.order_code} reactivado por +${reactivateHours} horas conservando intacto su saldo pagado verificado de ${formatCurrencyPEN(
          orderToReactivate.total_paid_verified_pen
        )}.`
      );
    } finally {
      setIsReactivating(false);
    }
  };

  const handleMarkExpired = async (order: OrderWithDetails) => {
    setFeedbackError(null);
    const result = await markOrderAsExpiredAdmin({
      orderId: order.id,
      adminUserId: profile?.id,
      adminName: profile?.full_name,
    });

    if (result.error) {
      setFeedbackError(result.error);
      return;
    }

    await loadAllData();
    notifySuccess(
      `Pedido ${order.order_code} marcado como VENCIDO. Sus pagos verificados (${formatCurrencyPEN(
        order.total_paid_verified_pen
      )}) y saldos por producto se conservan sin alteración.`
    );
  };

  const openCompleteRefundModal = (refund: RefundRecord) => {
    setRefundToComplete(refund);
    setCompleteMethod(refund.refund_method || 'YAPE');
    setCompleteDestinationAccount(refund.destination_account || refund.buyer_phone || '');
    setCompleteHolderName(refund.destination_holder_name || refund.buyer_name || '');
    setCompleteOperationRef(refund.operation_reference || '');
  };

  const handleConfirmCompleteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundToComplete) return;
    setIsCompletingRefund(true);
    setFeedbackError(null);

    try {
      const res = await completeExistingRefundAdmin({
        refundId: refundToComplete.id,
        refundMethod: completeMethod,
        destinationAccount: completeDestinationAccount,
        destinationHolderName: completeHolderName,
        operationReference: completeOperationRef,
        adminUserId: profile?.id,
        adminName: profile?.full_name,
      });

      if (res.error) {
        setFeedbackError(res.error);
        return;
      }

      setRefundToComplete(null);
      await loadAllData();
      notifySuccess(
        `Reembolso ${refundToComplete.order_code} marcado como COMPLETADO tras registrar la devolución efectiva de ${formatCurrencyPEN(
          refundToComplete.refund_amount_pen
        )} (Op. ${completeOperationRef}).`
      );
    } finally {
      setIsCompletingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Control de Excepciones Financieras • Moneda PEN (S/)
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#0A68FF]" />
            Vencimientos (72h), Cancelaciones, Resoluciones y Reembolsos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Preservación de saldos en pedidos vencidos, bloqueo automático de entregas en
            cancelaciones y reembolsos exclusivos para productos NO entregados.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllData}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar Bandeja
        </button>
      </div>

      {/* Tarjetas KPI de Integridad Financiera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Pedidos Vencidos (72h)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpis.expiredCount}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            Abonos preservados: {formatCurrencyPEN(kpis.preservedInExpiredPen)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Cancelaciones Manuales</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpis.cancellationsCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            100% con entregas pendientes bloqueadas
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Reembolsos Completados</span>
            <Banknote className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatCurrencyPEN(kpis.totalRefundedPen)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {kpis.completedRefundsCount} devoluciones efectivas en S/
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Resoluciones Emitidas</span>
            <FileCheck2 className="w-4 h-4 text-[#0A68FF]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {kpis.resolutionsCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Sustento obligatorio en base de datos
          </p>
        </div>
      </div>

      {feedbackSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {feedbackError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Pestañas Operativas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ORDERS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'ORDERS'
              ? 'bg-[#0A68FF] text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          1. Pedidos, Vencimientos (72h), Cancelación y Reembolsos por Ítem ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('REFUNDS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'REFUNDS'
              ? 'bg-[#0A68FF] text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          2. Bandeja de Reembolsos y Devolución Efectiva ({refunds.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('RESOLUTIONS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'RESOLUTIONS'
              ? 'bg-[#0A68FF] text-white shadow-2xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          3. Actas y Resoluciones Administrativas ({resolutions.length})
        </button>
      </div>

      {/* TAB 1: CONTROL DE PEDIDOS, VENCIMIENTOS 72H, CANCELACIÓN Y REEMBOLSO POR PRODUCTO */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código SL-2026-..., cliente, correo o teléfono WhatsApp..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#0A68FF]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'VENCIDO', 'PAGO_PARCIAL', 'CANCELADO', 'REEMBOLSADO'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL' ? 'Todos' : st.replace('_', ' ')}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Lista de Pedidos con Desglose de Ítems */}
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const badge = STATUS_BADGE[order.status];
              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4"
                >
                  {/* Encabezado del Pedido */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900">
                          {order.order_code}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Vencimiento: {new Date(order.expires_at).toLocaleString('es-PE')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Cliente: <strong>{order.buyer_name}</strong> ({order.buyer_email}) •
                        WhatsApp: <span className="font-mono">{order.buyer_phone}</span>
                      </p>
                    </div>

                    {/* Acciones de Nivel Pedido (Vencimiento / Reactivación / Cancelación Manual) */}
                    <div className="flex flex-wrap items-center gap-2">
                      {order.status === 'VENCIDO' && (
                        <button
                          type="button"
                          onClick={() => openReactivateModal(order)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reactivar Plazo (+72h Conservando Saldos)
                        </button>
                      )}

                      {(order.status === 'PENDIENTE_PAGO' ||
                        order.status === 'PAGO_PARCIAL' ||
                        order.status === 'OBSERVADO') && (
                        <button
                          type="button"
                          onClick={() => handleMarkExpired(order)}
                          className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                          title="Simular o aplicar vencimiento de 72h preservando pagos verificados"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Marcar Vencido (Preservar Saldos)
                        </button>
                      )}

                      {order.status !== 'CANCELADO' && order.status !== 'REEMBOLSADO' && (
                        <button
                          type="button"
                          onClick={() => openCancelModal(order)}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Cancelar Pedido (Bloquear Entregas)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resumen Financiero del Pedido (Conservado en VENCIDO / CANCELADO) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-500 block">Importe Neto Pedido:</span>
                      <strong className="text-slate-900 text-sm">
                        {formatCurrencyPEN(order.total_net_pen)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Pagado Verificado (Histórico Inalterable):
                      </span>
                      <strong className="text-emerald-700 text-sm">
                        {formatCurrencyPEN(order.total_paid_verified_pen)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Saldo Pendiente Pedido:</span>
                      <strong className="text-amber-700 text-sm">
                        {formatCurrencyPEN(order.balance_due_pen)}
                      </strong>
                    </div>
                  </div>

                  {/* Tabla de Productos del Pedido y Elegibilidad de Reembolso */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                          <th className="py-2 pr-3">Producto (Snapshot)</th>
                          <th className="py-2 px-3">Precio Neto</th>
                          <th className="py-2 px-3">Abonado Asignado</th>
                          <th className="py-2 px-3">Reembolsado</th>
                          <th className="py-2 px-3">Estado Entrega</th>
                          <th className="py-2 pl-3 text-right">Regla de Reembolso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(order.items || []).map((item) => {
                          const isDelivered =
                            item.delivery_status === 'ENTREGADO' ||
                            Boolean(item.delivery?.delivered_at);
                          const itemRefundedPen = getRefundedAmountForItem(item.id);
                          const remainingRefundablePen = Math.max(
                            0,
                            Number((item.allocated_paid_pen - itemRefundedPen).toFixed(2))
                          );

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 pr-3">
                                <div className="font-bold text-slate-900">
                                  {item.product_name_snapshot}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Versión {item.product_version_snapshot} •{' '}
                                  {item.product_modalidad_snapshot}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {formatCurrencyPEN(item.final_item_price_pen)}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-700">
                                {formatCurrencyPEN(item.allocated_paid_pen)}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-purple-700">
                                {formatCurrencyPEN(itemRefundedPen)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] ${
                                    isDelivered
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : item.delivery_status === 'REVOCADO'
                                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {item.delivery_status}
                                </span>
                              </td>
                              <td className="py-2.5 pl-3 text-right">
                                {isDelivered ? (
                                  <button
                                    type="button"
                                    onClick={() => setRefundTarget({ order, item })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 transition cursor-pointer"
                                    title="Producto entregado por WhatsApp: No reembolsable"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    No Reembolsable (Enlace Enviado)
                                  </button>
                                ) : remainingRefundablePen > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setRefundTarget({ order, item })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-[11px] font-bold transition cursor-pointer"
                                  >
                                    <Banknote className="w-3.5 h-3.5" />
                                    Evaluar / Reembolsar ({formatCurrencyPEN(remainingRefundablePen)})
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    Sin saldo pagado reembolsable
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BANDEJA DE REEMBOLSOS */}
      {activeTab === 'REFUNDS' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Registro de Reembolsos (Exclusivo para Productos NO Entregados)
              </h2>
              <p className="text-xs text-slate-500">
                Un reembolso solo se considera COMPLETADO cuando se registra la devolución efectiva
                del dinero (Yape, Plin o Transferencia Bancaria).
              </p>
            </div>
          </div>

          {refunds.length === 0 ? (
            <div className="py-10 text-center text-xs sm:text-sm text-slate-500">
              Aún no se han registrado reembolsos. Puedes evaluar o ejecutar un reembolso sobre
              cualquier producto no entregado con saldo pagado desde la pestaña 1.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                    <th className="py-2.5 pr-3">Fecha / Código</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Producto (No Entregado)</th>
                    <th className="py-2.5 px-3">Monto S/</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3">Prueba de Devolución Efectiva</th>
                    <th className="py-2.5 pl-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-3">
                        <div className="font-mono font-bold text-slate-900">
                          {ref.order_code}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(ref.created_at).toLocaleString('es-PE')}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{ref.buyer_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ref.buyer_phone}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">
                          {ref.product_name_snapshot}
                        </div>
                        <div className="text-[11px] text-slate-500">{ref.reason}</div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-purple-700">
                        {formatCurrencyPEN(ref.refund_amount_pen)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold text-[11px] border ${
                            ref.refund_status === 'COMPLETADO'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {ref.refund_status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {ref.refund_status === 'COMPLETADO' ? (
                          <div className="text-[11px] text-slate-700">
                            <div>
                              <strong>{ref.refund_method}</strong> • Op.{' '}
                              <span className="font-mono font-bold">
                                {ref.operation_reference}
                              </span>
                            </div>
                            <div className="text-slate-500">
                              Destino: {ref.destination_account} ({ref.destination_holder_name})
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-semibold">
                            Pendiente de transferencia efectiva
                          </span>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {ref.refund_status !== 'COMPLETADO' ? (
                          <button
                            type="button"
                            onClick={() => openCompleteRefundModal(ref)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer"
                          >
                            Registrar Devolución Efectiva
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-bold">
                            Devolución Verificada
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESOLUCIONES ADMINISTRATIVAS Y CANCELACIONES */}
      {activeTab === 'RESOLUTIONS' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Registro Formal de Resoluciones Administrativas (administrative_resolutions)
            </h2>
            <p className="text-xs text-slate-500">
              Sustento obligatorio de cada cancelación manual, evaluación de reembolso y
              reactivación de pedidos vencidos.
            </p>
          </div>

          {resolutions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No hay resoluciones administrativas registradas todavía.
            </div>
          ) : (
            <div className="space-y-3">
              {resolutions.map((res) => (
                <div
                  key={res.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-[#0A68FF] font-bold text-[11px]">
                        {res.resolution_type}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {res.order_code}
                      </span>
                      <span className="text-slate-600">• Cliente: {res.buyer_name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(res.resolved_at).toLocaleString('es-PE')} • {res.admin_name}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900">{res.decision_summary}</div>
                  <p className="text-slate-600">{res.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CANCELACIÓN MANUAL CON BLOQUEO DE ENTREGAS Y RESOLUCIÓN OBLIGATORIA */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="bg-rose-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-200 block">
                  Bloqueo Inmediato de Entregas Pendientes • {orderToCancel.order_code}
                </span>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-300" />
                  Cancelación Manual y Resolución Administrativa Obligatoria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="p-1 rounded-lg text-rose-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmManualCancellation} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                <div className="font-bold">Efectos automáticos de la cancelación manual:</div>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    Bloquea y revoca de inmediato todas las entregas pendientes del pedido (
                    <code className="font-mono">REVOCADO</code>).
                  </li>
                  <li>
                    Exige vincular una Resolución Administrativa en{' '}
                    <code className="font-mono">administrative_resolutions</code>.
                  </li>
                  <li>
                    Conserva intacto el historial contable (Pagado verificado:{' '}
                    <strong>{formatCurrencyPEN(orderToCancel.total_paid_verified_pen)}</strong>).
                  </li>
                </ul>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tipo de Cancelación *
                </label>
                <select
                  value={cancellationType}
                  onChange={(e) => setCancellationType(e.target.value as CancellationType)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="CLIENTE_SOLICITUD">SOLICITUD DEL CLIENTE</option>
                  <option value="COMPROBANTE_INVALIDO">COMPROBANTE INVÁLIDO / FRAUDE</option>
                  <option value="ACUERDO_ADMINISTRATIVO">ACUERDO ADMINISTRATIVO</option>
                  <option value="OTRO">OTRO MOTIVO OPERATIVO</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Motivo de la Cancelación (order_cancellations.cancellation_reason) *
                </label>
                <input
                  type="text"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Resumen de la Resolución Administrativa (decision_summary) *
                </label>
                <input
                  type="text"
                  value={cancelDecisionSummary}
                  onChange={(e) => setCancelDecisionSummary(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sustento Detallado de la Resolución (administrative_resolutions.notes) *
                </label>
                <textarea
                  rows={3}
                  value={cancelResolutionNotes}
                  onChange={(e) => setCancelResolutionNotes(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setOrderToCancel(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  {isCancelling
                    ? 'Cancelando y bloqueando entregas...'
                    : 'Confirmar Cancelación y Bloquear Entregas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REACTIVACIÓN DE PEDIDO VENCIDO (72H) CONSERVANDO ABONOS HISTÓRICOS */}
      {orderToReactivate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Preservación de Saldos Históricos • {orderToReactivate.order_code}
                </span>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-emerald-400" />
                  Reactivar Pedido Vencido con Resolución Administrativa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderToReactivate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReactivate} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                El pedido <strong>{orderToReactivate.order_code}</strong> conserva intactos sus
                abonos verificados por{' '}
                <strong>
                  {formatCurrencyPEN(orderToReactivate.total_paid_verified_pen)}
                </strong>{' '}
                y su saldo pendiente de{' '}
                <strong>{formatCurrencyPEN(orderToReactivate.balance_due_pen)}</strong>.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Horas de Ampliación de Plazo (Predeterminado: 72 horas) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={reactivateHours}
                  onChange={(e) => setReactivateHours(Number(e.target.value))}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Resumen de la Resolución (decision_summary) *
                </label>
                <input
                  type="text"
                  value={reactivateSummary}
                  onChange={(e) => setReactivateSummary(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sustento de Reactivación (notes) *
                </label>
                <textarea
                  rows={3}
                  value={reactivateNotes}
                  onChange={(e) => setReactivateNotes(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setOrderToReactivate(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isReactivating}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {isReactivating ? 'Reactivando...' : 'Reactivar Pedido Conservando Abonos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETAR REEMBOLSO CON PRUEBA DE DEVOLUCIÓN EFECTIVA */}
      {refundToComplete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Cierre de Reembolso • {refundToComplete.order_code}
                </span>
                <h3 className="text-base font-bold">
                  Registrar Devolución Efectiva ({formatCurrencyPEN(refundToComplete.refund_amount_pen)})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundToComplete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCompleteRefund} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Medio de Devolución *
                </label>
                <select
                  value={completeMethod}
                  onChange={(e) => setCompleteMethod(e.target.value as PaymentMethod)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="YAPE">YAPE</option>
                  <option value="PLIN">PLIN</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  N° de Operación de la Transferencia Efectiva *
                </label>
                <input
                  type="text"
                  value={completeOperationRef}
                  onChange={(e) => setCompleteOperationRef(e.target.value)}
                  placeholder="Ej. YAPE-8830192"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cuenta o Celular Receptor del Cliente *
                </label>
                <input
                  type="text"
                  value={completeDestinationAccount}
                  onChange={(e) => setCompleteDestinationAccount(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre del Titular Receptor *
                </label>
                <input
                  type="text"
                  value={completeHolderName}
                  onChange={(e) => setCompleteHolderName(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRefundToComplete(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCompletingRefund}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {isCompletingRefund
                    ? 'Registrando...'
                    : 'Confirmar Devolución y Marcar COMPLETADO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REEMBOLSO POR PRODUCTO */}
      {refundTarget && (
        <RefundModal
          order={refundTarget.order}
          item={refundTarget.item}
          adminUserId={profile?.id}
          adminName={profile?.full_name}
          onClose={() => setRefundTarget(null)}
          onSuccess={async (msg) => {
            setRefundTarget(null);
            await loadAllData();
            notifySuccess(msg);
          }}
        />
      )}
    </div>
  );
};
