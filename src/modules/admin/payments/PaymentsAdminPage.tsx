import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Layers,
  Image as ImageIcon,
  X,
  Send,
  FileCheck2,
  Eye,
} from 'lucide-react';
import {
  AdminPaymentWithContext,
  getAllAdminOrders,
  getAllAdminPayments,
  registerAdminPaymentReceipt,
  verifyAdminPayment,
} from '../../../services/payments.service';
import { OrderWithDetails } from '../../../services/orders.service';
import { PaymentMethod, PaymentVerificationStatus } from '../../../types/order.types';
import { formatCurrencyPEN } from '../../../utils/currency';
import { PaymentAllocationModal } from './PaymentAllocationModal';

const VERIFICATION_BADGE: Record<
  PaymentVerificationStatus,
  { label: string; className: string }
> = {
  EN_REVISION: {
    label: 'En Revisión Manual',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  VERIFICADO: {
    label: 'Verificado (Aprobado)',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  RECHAZADO: {
    label: 'Rechazado',
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  ANULADO: {
    label: 'Anulado',
    className: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

export const PaymentsAdminPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderFilter = searchParams.get('order') || '';

  const [payments, setPayments] = useState<AdminPaymentWithContext[]>([]);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>(initialOrderFilter);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modal de previsualización de comprobante y decisión administrativa
  const [reviewTarget, setReviewTarget] = useState<{
    payment: AdminPaymentWithContext;
    decision: 'VERIFICADO' | 'OBSERVADO' | 'RECHAZADO';
    amountVerifiedInput: string;
    reasonInput: string;
  } | null>(null);
  const [processingReview, setProcessingReview] = useState<boolean>(false);

  // Modal de asignación por producto (payment_allocations)
  const [allocationTarget, setAllocationTarget] = useState<{
    payment: AdminPaymentWithContext;
    order: OrderWithDetails;
  } | null>(null);

  // Modal para registrar un nuevo comprobante recibido por WhatsApp
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [newReceiptOrderId, setNewReceiptOrderId] = useState<string>('');
  const [newReceiptMethod, setNewReceiptMethod] = useState<PaymentMethod>('YAPE');
  const [newReceiptAmountPen, setNewReceiptAmountPen] = useState<string>('');
  const [newReceiptOpNumber, setNewReceiptOpNumber] = useState<string>('');
  const [newReceiptOriginPhone, setNewReceiptOriginPhone] = useState<string>('');
  const [newReceiptBankName, setNewReceiptBankName] = useState<string>('');
  const [newReceiptImageUrl, setNewReceiptImageUrl] = useState<string>('');
  const [newReceiptAutoVerify, setNewReceiptAutoVerify] = useState<boolean>(true);
  const [newReceiptNotes, setNewReceiptNotes] = useState<string>('');
  const [registeringReceipt, setRegisteringReceipt] = useState<boolean>(false);

  // Visor de imagen de comprobante
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPays, allOrds] = await Promise.all([
        getAllAdminPayments(),
        getAllAdminOrders(),
      ]);
      setPayments(allPays);
      setOrders(allOrds);
      if (!newReceiptOrderId && allOrds.length > 0) {
        const firstActive =
          allOrds.find((o) => o.balance_due_pen > 0 && o.status !== 'CANCELADO') || allOrds[0];
        setNewReceiptOrderId(firstActive.id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const ordParam = searchParams.get('order') || '';
    if (ordParam) {
      setSearchTerm(ordParam);
    }
  }, [searchParams]);

  const ordersById = useMemo(() => {
    const map = new Map<string, OrderWithDetails>();
    for (const o of orders) map.set(o.id, o);
    return map;
  }, [orders]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== 'ALL' && p.verification_status !== statusFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      return (
        p.order_code.toLowerCase().includes(q) ||
        p.buyer_name.toLowerCase().includes(q) ||
        p.buyer_email.toLowerCase().includes(q) ||
        (p.operation_number || '').toLowerCase().includes(q) ||
        p.payment_method.toLowerCase().includes(q)
      );
    });
  }, [payments, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const inReview = payments.filter((p) => p.verification_status === 'EN_REVISION').length;
    const verified = payments.filter((p) => p.verification_status === 'VERIFICADO');
    const rejected = payments.filter((p) => p.verification_status === 'RECHAZADO').length;
    const totalVerifiedPen = verified.reduce((acc, p) => acc + p.amount_verified_pen, 0);
    const totalUnallocatedPen = verified.reduce(
      (acc, p) => acc + p.unallocated_verified_pen,
      0
    );

    return {
      inReview,
      verifiedCount: verified.length,
      rejected,
      totalVerifiedPen,
      totalUnallocatedPen,
    };
  }, [payments]);

  const openDecisionModal = (
    payment: AdminPaymentWithContext,
    decision: 'VERIFICADO' | 'OBSERVADO' | 'RECHAZADO'
  ) => {
    setFeedbackBanner(null);
    setReviewTarget({
      payment,
      decision,
      amountVerifiedInput: Number(
        payment.amount_verified_pen > 0
          ? payment.amount_verified_pen
          : payment.amount_reported_pen
      ).toFixed(2),
      reasonInput: '',
    });
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;

    setProcessingReview(true);
    setFeedbackBanner(null);

    try {
      const verifiedNum = parseFloat(reviewTarget.amountVerifiedInput);
      const { payment: updatedPay, order: updatedOrder, error } = await verifyAdminPayment({
        paymentId: reviewTarget.payment.id,
        decision: reviewTarget.decision,
        amountVerifiedPen:
          reviewTarget.decision === 'VERIFICADO' ? verifiedNum : 0,
        reasonOrNotes: reviewTarget.reasonInput,
      });

      if (error || !updatedPay) {
        setFeedbackBanner({
          type: 'error',
          message: error || 'No se pudo procesar la verificación del comprobante.',
        });
        return;
      }

      await loadData();
      setReviewTarget(null);

      if (reviewTarget.decision === 'VERIFICADO' && updatedOrder) {
        setFeedbackBanner({
          type: 'success',
          message: `Comprobante aprobado por ${formatCurrencyPEN(
            updatedPay.amount_verified_pen
          )}. Ahora puedes confirmar o ajustar la asignación por producto.`,
        });

        // Si el pedido tiene múltiples productos o saldo por asignar, abrir el modal de asignación inmediatamente
        const refreshedPays = await getAllAdminPayments();
        const enrichedPay = refreshedPays.find((p) => p.id === updatedPay.id);
        if (
          enrichedPay &&
          ((updatedOrder.items || []).length > 1 || enrichedPay.unallocated_verified_pen > 0)
        ) {
          setAllocationTarget({
            payment: enrichedPay,
            order: updatedOrder,
          });
        }
      } else if (reviewTarget.decision === 'OBSERVADO') {
        setFeedbackBanner({
          type: 'success',
          message: `El pedido ${reviewTarget.payment.order_code} pasó a estado OBSERVADO para que el cliente subsane su comprobante.`,
        });
      } else {
        setFeedbackBanner({
          type: 'success',
          message: `Comprobante rechazado correctamente. No suma al saldo verificado del pedido.`,
        });
      }
    } finally {
      setProcessingReview(false);
    }
  };

  const handleRegisterWhatsAppReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackBanner(null);

    const amountNum = parseFloat(newReceiptAmountPen);
    if (!newReceiptOrderId || !Number.isFinite(amountNum) || amountNum <= 0) {
      setFeedbackBanner({
        type: 'error',
        message: 'Selecciona un pedido e ingresa un monto válido mayor a S/ 0.00.',
      });
      return;
    }

    setRegisteringReceipt(true);
    try {
      const { payment, order, error } = await registerAdminPaymentReceipt({
        orderId: newReceiptOrderId,
        paymentMethod: newReceiptMethod,
        amountReportedPen: amountNum,
        operationNumber: newReceiptOpNumber,
        originPhone: newReceiptOriginPhone,
        bankName: newReceiptBankName,
        receiptImageUrl: newReceiptImageUrl || null,
        autoVerify: newReceiptAutoVerify,
        amountVerifiedPen: newReceiptAutoVerify ? amountNum : 0,
        adminNotes: newReceiptNotes,
      });

      if (error || !payment) {
        setFeedbackBanner({
          type: 'error',
          message: error || 'Error al registrar el comprobante manual.',
        });
        return;
      }

      setShowRegisterModal(false);
      setNewReceiptAmountPen('');
      setNewReceiptOpNumber('');
      setNewReceiptNotes('');

      await loadData();

      if (newReceiptAutoVerify && order) {
        const refreshedPays = await getAllAdminPayments();
        const enrichedPay = refreshedPays.find((p) => p.id === payment.id);
        if (enrichedPay) {
          setAllocationTarget({
            payment: enrichedPay,
            order,
          });
        }
      } else {
        setFeedbackBanner({
          type: 'success',
          message: 'Comprobante registrado en cola de revisión manual.',
        });
      }
    } finally {
      setRegisteringReceipt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Verificación Manual de Pagos y Asignación por Producto
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Aprueba, observa o rechaza comprobantes de Yape, Plin y Transferencia en Soles (S/), y distribuye el monto verificado hacia cada ítem del pedido.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>

          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Registrar Comprobante WhatsApp
          </button>
        </div>
      </div>

      {/* Banner de retroalimentación */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPIs de Verificación y Asignación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            En Revisión (Pendientes)
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.inReview}</p>
          <p className="text-xs text-blue-600 mt-1">No suman al saldo hasta aprobarse</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Comprobantes Verificados
          </p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">
            {formatCurrencyPEN(stats.totalVerifiedPen)}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            {stats.verifiedCount} vouchers aprobados en S/
          </p>
        </div>

        <div
          className={`bg-white rounded-xl border p-4 ${
            stats.totalUnallocatedPen > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Verificado Sin Asignar a Ítems
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {formatCurrencyPEN(stats.totalUnallocatedPen)}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Requiere distribución en payment_allocations
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Comprobantes Rechazados
          </p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.rejected}</p>
          <p className="text-xs text-slate-500 mt-1">Con motivo de rechazo registrado</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!e.target.value.trim()) {
                setSearchParams({}, { replace: true });
              }
            }}
            placeholder="Filtrar por código de pedido (SL-2026-...), cliente, N° operación o método (YAPE, PLIN, TRANSFERENCIA)..."
            className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSearchParams({}, { replace: true });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Estado Voucher:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos ({payments.length})</option>
            <option value="EN_REVISION">En Revisión Manual ({stats.inReview})</option>
            <option value="VERIFICADO">Verificados ({stats.verifiedCount})</option>
            <option value="RECHAZADO">Rechazados ({stats.rejected})</option>
          </select>
        </div>
      </div>

      {/* Tabla de Comprobantes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Cargando cola de verificación de comprobantes...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-base font-semibold text-slate-800">
              No se encontraron comprobantes con los filtros actuales
            </p>
            <p className="text-xs text-slate-500">
              Puedes registrar un comprobante recibido por WhatsApp usando el botón superior.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Pedido / Cliente</th>
                  <th className="py-3.5 px-4">Medio / Operación</th>
                  <th className="py-3.5 px-4 text-right">Reportado (S/)</th>
                  <th className="py-3.5 px-4 text-right">Verificado (S/)</th>
                  <th className="py-3.5 px-4">Asignación por Producto</th>
                  <th className="py-3.5 px-4">Estado Voucher</th>
                  <th className="py-3.5 px-4 text-right">Verificación y Asignación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredPayments.map((pay) => {
                  const parentOrder = ordersById.get(pay.order_id);
                  const badge = VERIFICATION_BADGE[pay.verification_status];

                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900">
                          {pay.order_code}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">
                          {pay.buyer_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          Total pedido: {formatCurrencyPEN(pay.order_total_net_pen)} • Saldo:{' '}
                          <strong className="text-amber-800">
                            {formatCurrencyPEN(pay.order_balance_due_pen)}
                          </strong>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                          {pay.payment_method}
                        </div>
                        <div className="text-xs text-slate-700 mt-1">
                          N° Op: <span className="font-mono font-semibold">{pay.operation_number || 'No especificado'}</span>
                        </div>
                        {pay.origin_phone && (
                          <div className="text-xs text-slate-500">
                            Origen: {pay.origin_phone}
                          </div>
                        )}
                        {pay.receipt_image_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptUrl(pay.receipt_image_url || null)}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            Ver imagen del voucher
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top text-right font-semibold text-slate-900">
                        {formatCurrencyPEN(pay.amount_reported_pen)}
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <span
                          className={`font-bold ${
                            pay.verification_status === 'VERIFICADO'
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatCurrencyPEN(pay.amount_verified_pen)}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top">
                        {pay.verification_status !== 'VERIFICADO' ? (
                          <span className="text-xs text-slate-500">
                            Se habilita al aprobar el comprobante
                          </span>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-600">Asignado a ítems:</span>
                              <span className="font-bold text-blue-800">
                                {formatCurrencyPEN(pay.total_allocated_pen)}
                              </span>
                            </div>
                            {pay.unallocated_verified_pen > 0 ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[11px]">
                                <AlertTriangle className="w-3 h-3" />
                                Falta asignar {formatCurrencyPEN(pay.unallocated_verified_pen)}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3 h-3" />
                                100% distribuido en productos
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {pay.rejection_reason && (
                          <p className="text-xs text-slate-600 mt-1 max-w-[220px]">
                            {pay.rejection_reason}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {pay.verification_status === 'EN_REVISION' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDecisionModal(pay, 'VERIFICADO')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => openDecisionModal(pay, 'OBSERVADO')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100"
                              >
                                Observar
                              </button>
                              <button
                                type="button"
                                onClick={() => openDecisionModal(pay, 'RECHAZADO')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold hover:bg-rose-100"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Rechazar
                              </button>
                            </div>
                          )}

                          {pay.verification_status === 'VERIFICADO' && parentOrder && (
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setAllocationTarget({
                                    payment: pay,
                                    order: parentOrder,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                              >
                                <Layers className="w-3.5 h-3.5" />
                                Asignar a Productos
                              </button>

                              <Link
                                to={`/admin/deliveries?order=${pay.order_code}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                              >
                                <Send className="w-3 h-3" />
                                Entregas
                              </Link>
                            </div>
                          )}

                          {pay.verification_status === 'RECHAZADO' && (
                            <button
                              type="button"
                              onClick={() => openDecisionModal(pay, 'VERIFICADO')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 text-slate-700 text-xs hover:bg-slate-100"
                            >
                              <Eye className="w-3 h-3" />
                              Reevaluar Comprobante
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

      {/* Modal de Decisión de Verificación (Aprobar / Observar / Rechazar) */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                {reviewTarget.decision === 'VERIFICADO'
                  ? 'Aprobar y Verificar Comprobante en Soles (S/)'
                  : reviewTarget.decision === 'OBSERVADO'
                  ? 'Observar Comprobante (Pedido a OBSERVADO)'
                  : 'Rechazar Comprobante de Pago'}
              </h3>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDecision} className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div>
                  Pedido: <strong className="font-mono">{reviewTarget.payment.order_code}</strong> •
                  Cliente: <strong>{reviewTarget.payment.buyer_name}</strong>
                </div>
                <div>
                  Medio: <strong>{reviewTarget.payment.payment_method}</strong> • N° Operación:{' '}
                  <strong>{reviewTarget.payment.operation_number || 'Sin N°'}</strong>
                </div>
                <div>
                  Monto reportado por el cliente:{' '}
                  <strong className="text-slate-900">
                    {formatCurrencyPEN(reviewTarget.payment.amount_reported_pen)}
                  </strong>
                </div>
              </div>

              {reviewTarget.decision === 'VERIFICADO' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto Realmente Verificado en Cuenta / Billetera (S/) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      S/
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={reviewTarget.amountVerifiedInput}
                      onChange={(e) =>
                        setReviewTarget({
                          ...reviewTarget,
                          amountVerifiedInput: e.target.value,
                        })
                      }
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 font-mono text-base font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Al confirmar, se abrirá el asistente para asignar este monto en S/ a los productos del pedido.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {reviewTarget.decision === 'VERIFICADO'
                    ? 'Nota de verificación administrativa (Opcional)'
                    : reviewTarget.decision === 'OBSERVADO'
                    ? 'Motivo de la observación para el cliente (Obligatorio) *'
                    : 'Motivo del rechazo del comprobante (Obligatorio) *'}
                </label>
                <textarea
                  rows={3}
                  required={reviewTarget.decision !== 'VERIFICADO'}
                  value={reviewTarget.reasonInput}
                  onChange={(e) =>
                    setReviewTarget({
                      ...reviewTarget,
                      reasonInput: e.target.value,
                    })
                  }
                  placeholder={
                    reviewTarget.decision === 'VERIFICADO'
                      ? 'Ej: Abono confirmado en estado de cuenta BCP / Yape.'
                      : 'Ej: La captura está borrosa o el número de operación no coincide.'
                  }
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingReview}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-semibold ${
                    reviewTarget.decision === 'VERIFICADO'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : reviewTarget.decision === 'OBSERVADO'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processingReview
                    ? 'Procesando...'
                    : reviewTarget.decision === 'VERIFICADO'
                    ? 'Confirmar Aprobación y Asignar'
                    : reviewTarget.decision === 'OBSERVADO'
                    ? 'Marcar Pedido como OBSERVADO'
                    : 'Confirmar Rechazo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Asignación por Producto (payment_allocations) */}
      {allocationTarget && (
        <PaymentAllocationModal
          payment={allocationTarget.payment}
          order={allocationTarget.order}
          onClose={() => setAllocationTarget(null)}
          onSuccess={async (updatedOrder) => {
            setAllocationTarget(null);
            await loadData();
            setFeedbackBanner({
              type: 'success',
              message: `Asignación por producto guardada para el pedido ${updatedOrder.order_code}. Estado actual del pedido: ${updatedOrder.status}.`,
            });
          }}
        />
      )}

      {/* Modal para Registrar Comprobante Recibido por WhatsApp */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full overflow-hidden shadow-xl my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Registrar Comprobante Recibido por WhatsApp
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Registra pagos de Yape, Plin o Transferencia enviados por el cliente al WhatsApp oficial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterWhatsAppReceipt} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seleccionar Pedido *
                </label>
                <select
                  required
                  value={newReceiptOrderId}
                  onChange={(e) => setNewReceiptOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {orders
                    .filter((o) => o.status !== 'CANCELADO' && o.status !== 'REEMBOLSADO')
                    .map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {ord.order_code} — {ord.buyer_name} (Saldo pendiente:{' '}
                        {formatCurrencyPEN(ord.balance_due_pen)})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Medio de Pago *
                  </label>
                  <select
                    value={newReceiptMethod}
                    onChange={(e) => setNewReceiptMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="YAPE">YAPE</option>
                    <option value="PLIN">PLIN</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto en Soles (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newReceiptAmountPen}
                    onChange={(e) => setNewReceiptAmountPen(e.target.value)}
                    placeholder="Ej: 90.00"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    N° de Operación
                  </label>
                  <input
                    type="text"
                    value={newReceiptOpNumber}
                    onChange={(e) => setNewReceiptOpNumber(e.target.value)}
                    placeholder="Ej: 09481234"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono Origen / Banco
                  </label>
                  <input
                    type="text"
                    value={newReceiptOriginPhone || newReceiptBankName}
                    onChange={(e) => {
                      setNewReceiptOriginPhone(e.target.value);
                      setNewReceiptBankName(e.target.value);
                    }}
                    placeholder="Ej: 987654321 / BCP"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL de Captura de Comprobante (Opcional)
                </label>
                <input
                  type="url"
                  value={newReceiptImageUrl}
                  onChange={(e) => setNewReceiptImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas Administrativas
                </label>
                <input
                  type="text"
                  value={newReceiptNotes}
                  onChange={(e) => setNewReceiptNotes(e.target.value)}
                  placeholder="Ej: Recibido por WhatsApp oficial y verificado en app BCP."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newReceiptAutoVerify}
                  onChange={(e) => setNewReceiptAutoVerify(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-emerald-900">
                  Aprobar como VERIFICADO inmediatamente y abrir asignación por producto
                </span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registeringReceipt}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  {registeringReceipt ? 'Registrando...' : 'Guardar Comprobante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor de Imagen de Voucher */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold">Evidencia de Comprobante de Pago</span>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 rounded text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={previewReceiptUrl}
                alt="Comprobante de pago"
                className="max-h-[62vh] w-auto rounded-lg border border-slate-300 object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
