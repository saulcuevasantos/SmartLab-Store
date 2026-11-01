/**
 * SmartLab Store — Detalle del Pedido del Cliente, Desglose por Producto y Subida de Comprobantes
 * docs/08_PLAN_SPRINTS.md (Sprint 07) y docs/05_PEDIDOS_PAGOS.md
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Upload,
  FileText,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  Package,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  getOrderById,
  getCheckoutStoreSettings,
  DEFAULT_CHECKOUT_STORE_SETTINGS,
  CheckoutStoreSettings,
  OrderWithDetails,
  submitPaymentReceipt,
} from '../../../services/orders.service';
import { uploadPaymentReceipt } from '../../../services/storage.service';
import { PaymentMethod } from '../../../types/order.types';
import { formatPEN } from '../../../utils/currency';
import { buildOrderWhatsAppUrl } from '../../../utils/whatsapp';
import { getOrderStatusBadgeMeta } from './MyOrdersPage';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { profile } = useAuth();

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [settings, setSettings] = useState<CheckoutStoreSettings>(
    DEFAULT_CHECKOUT_STORE_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Estado del formulario de registro de comprobante en revisión
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('YAPE');
  const [amountReported, setAmountReported] = useState<string>('');
  const [operationNumber, setOperationNumber] = useState<string>('');
  const [originPhone, setOriginPhone] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [customerComment, setCustomerComment] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [receiptSuccess, setReceiptSuccess] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      if (!orderId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [foundOrder, storeCfg] = await Promise.all([
        getOrderById(orderId),
        getCheckoutStoreSettings(),
      ]);

      if (mounted) {
        setOrder(foundOrder);
        setSettings(storeCfg);
        if (foundOrder) {
          setAmountReported(
            foundOrder.balance_due_pen > 0
              ? foundOrder.balance_due_pen.toFixed(2)
              : foundOrder.total_net_pen.toFixed(2)
          );
          setOriginPhone(foundOrder.buyer_phone || '');
        }
        setIsLoading(false);
      }
    }

    loadDetail();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const handleCopyCode = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(order.order_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignorar
    }
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setReceiptError(null);
    setReceiptSuccess(null);

    const parsedAmount = Number(amountReported);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setReceiptError('Ingresa un monto reportado en Soles válido mayor a S/ 0.00.');
      return;
    }

    if (!receiptFile && !operationNumber.trim()) {
      setReceiptError(
        'Por favor adjunta la captura del comprobante o indica el número de operación.'
      );
      return;
    }

    setIsSubmittingReceipt(true);

    try {
      let uploadedPath: string | null = null;
      let uploadedUrl: string | null = null;

      if (receiptFile) {
        const up = await uploadPaymentReceipt(order.id, receiptFile);
        if (up.error) {
          setReceiptError(up.error);
          setIsSubmittingReceipt(false);
          return;
        }
        uploadedPath = up.path;
        uploadedUrl = up.url;
      }

      const res = await submitPaymentReceipt({
        orderId: order.id,
        registeredByUserId: profile?.id || order.customer_id,
        paymentMethod,
        amountReportedPen: parsedAmount,
        operationNumber,
        originPhone,
        bankName: paymentMethod === 'TRANSFERENCIA' ? bankName : undefined,
        receiptImagePath: uploadedPath,
        receiptImageUrl: uploadedUrl,
        customerComment,
      });

      if (res.error || !res.order) {
        setReceiptError(res.error || 'Error al registrar el comprobante.');
      } else {
        setOrder(res.order);
        setReceiptSuccess(
          'Comprobante registrado en estado EN REVISIÓN. Tu saldo verificado y los enlaces de descarga se actualizarán cuando el administrador valide manualmente la operación.'
        );
        setOperationNumber('');
        setCustomerComment('');
        setReceiptFile(null);
      }
    } catch (err) {
      setReceiptError(
        err instanceof Error ? err.message : 'Ocurrió un error al subir el comprobante.'
      );
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  if (isLoading) {
    return (
      <div className="smartlab-container py-12 text-center text-sm text-slate-500">
        Cargando información detallada del pedido...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="smartlab-container py-12 max-w-xl text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Pedido no encontrado</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            No encontramos un pedido con el identificador solicitado en tu cuenta.
          </p>
          <Link
            to="/mi-cuenta/pedidos"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A68FF] text-white text-xs font-semibold"
          >
            ← Volver a Mis Pedidos
          </Link>
        </div>
      </div>
    );
  }

  const badge = getOrderStatusBadgeMeta(order.status);
  const createdFormatted = new Date(order.created_at).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const expiresFormatted = new Date(order.expires_at).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const whatsappUrl = buildOrderWhatsAppUrl({
    orderCode: order.order_code,
    buyerName: order.buyer_name,
    paymentMethod: order.payment_method_selected,
    items: (order.items || []).map((it) => ({
      name: it.product_name_snapshot,
      version: it.product_version_snapshot,
      price: it.final_item_price_pen,
    })),
    totalNetPen: order.total_net_pen,
    storeWhatsAppNumber: settings.officialWhatsappPhone,
  });

  const hasReceiptsInReview =
    order.status === 'PAGO_EN_REVISION' ||
    (order.payments || []).some((p) => p.verification_status === 'EN_REVISION');

  return (
    <div className="smartlab-container py-8 sm:py-10 space-y-6">
      {/* Navegación superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/mi-cuenta/pedidos"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#0A68FF] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Mis Pedidos
        </Link>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs transition"
        >
          <MessageCircle className="w-4 h-4" />
          Enviar Comprobante o Consultar por WhatsApp
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Tarjeta Principal de Cabecera del Pedido */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Pedido {order.order_code}
              </h1>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </>
                )}
              </button>
              <span
                className={`px-3 py-1 rounded-md text-xs font-bold border ${badge.classes}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Comprador: <strong>{order.buyer_name}</strong> ({order.buyer_email}) • WhatsApp de entrega:{' '}
              <strong>{order.buyer_phone}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs space-y-1">
            <div className="text-slate-500">
              Fecha de registro: <strong className="text-slate-800">{createdFormatted}</strong>
            </div>
            <div className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-semibold">
              <Clock className="w-3.5 h-3.5" />
              Vencimiento reserva ({settings.orderExpirationHours}h): {expiresFormatted}
            </div>
          </div>
        </div>

        {/* Resumen Financiero del Pedido en Soles (PEN / S/) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">
              Subtotal Bruto
            </span>
            <strong className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 block">
              {formatPEN(order.subtotal_pen)}
            </strong>
            {order.discount_pen > 0 && (
              <span className="text-[11px] text-emerald-700 font-medium">
                Descuento aplicado: -{formatPEN(order.discount_pen)}
              </span>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">
              Total Neto (PEN)
            </span>
            <strong className="text-base sm:text-lg font-bold text-[#0A68FF] mt-0.5 block">
              {formatPEN(order.total_net_pen)}
            </strong>
            <span className="text-[11px] text-slate-500">Moneda única: Soles (S/)</span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold uppercase text-emerald-800 block">
              Pagado Verificado
            </span>
            <strong className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5 block">
              {formatPEN(order.total_paid_verified_pen)}
            </strong>
            <span className="text-[11px] text-emerald-800">Validado por administración</span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
            <span className="text-[11px] font-semibold uppercase text-amber-900 block">
              Saldo Pendiente
            </span>
            <strong className="text-base sm:text-lg font-bold text-amber-900 mt-0.5 block">
              {formatPEN(order.balance_due_pen)}
            </strong>
            <span className="text-[11px] text-amber-800">
              {order.balance_due_pen === 0 ? '100% cubierto' : 'Por verificar / abonar'}
            </span>
          </div>
        </div>

        {/* Banner de Regla de Negocio si hay comprobantes en revisión */}
        {hasReceiptsInReview && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-slate-800">
            <ShieldAlert className="w-5 h-5 text-[#0A68FF] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold text-slate-900 block">
                Aviso importante: Tienes un comprobante en estado EN REVISIÓN
              </strong>
              <p className="text-slate-700 leading-relaxed">
                El envío de un comprobante cambia el estado del pedido a <strong>Comprobante en Revisión</strong>, pero{' '}
                <strong>no confirma automáticamente el pago ni habilita enlaces de descarga</strong>. Una vez que el administrador verifique el abono en nuestras cuentas en Soles (`S/`), tu saldo verificado se actualizará y te enviaremos los enlaces correspondientes por WhatsApp.
              </p>
            </div>
          </div>
        )}

        {/* Banner si el pedido está VENCIDO tras las 72 horas */}
        {order.status === 'VENCIDO' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-orange-950">
            <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">
                El plazo de reserva de {settings.orderExpirationHours} horas ha vencido
              </strong>
              <p className="leading-relaxed">
                Tu pedido conserva intacto el historial de pagos verificados ({formatPEN(order.total_paid_verified_pen)}) y el saldo pendiente ({formatPEN(order.balance_due_pen)}). Contáctanos por WhatsApp indicando tu código <strong>{order.order_code}</strong> para reactivar el plazo o completar tu abono.
              </p>
            </div>
          </div>
        )}

        {/* Banner si el pedido está CANCELADO o REEMBOLSADO */}
        {(order.status === 'CANCELADO' || order.status === 'REEMBOLSADO') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-red-950">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold block">
                Pedido en estado {order.status} (Resolución Administrativa Registrada)
              </strong>
              <p className="leading-relaxed">
                Todas las entregas pendientes de este pedido han sido bloqueadas automáticamente. Los productos cuyo enlace ya fue enviado permanecen registrados como entregados (no reembolsables). Para cualquier consulta sobre tu resolución, contáctanos por WhatsApp indicando el código <strong>{order.order_code}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabla / Tarjetas de Estado de Pago y Entrega POR PRODUCTO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0A68FF]" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Desglose de Pago y Entrega por Producto ({order.items?.length || 0})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Solo los productos 100% pagados y verificados habilitan despacho por WhatsApp
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 bg-slate-50">
                <th className="py-3 px-3.5">Producto / Versión</th>
                <th className="py-3 px-3 text-right">Precio Neto</th>
                <th className="py-3 px-3 text-right">Abonado Verif.</th>
                <th className="py-3 px-3 text-right">Saldo Ítem</th>
                <th className="py-3 px-3 text-center">Estado de Pago</th>
                <th className="py-3 px-3.5 text-center">Estado de Entrega (WhatsApp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {(order.items || []).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-3.5">
                    <div className="font-bold text-slate-900">{item.product_name_snapshot}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Versión: <strong>{item.product_version_snapshot}</strong> • Modalidad:{' '}
                      <strong>{item.product_modalidad_snapshot}</strong>
                      {item.discount_applied_pen > 0 && (
                        <span className="text-emerald-700 ml-2">
                          (Desc. cupón: -{formatPEN(item.discount_applied_pen)})
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                    {formatPEN(item.final_item_price_pen)}
                  </td>

                  <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                    {formatPEN(item.allocated_paid_pen)}
                  </td>

                  <td className="py-3.5 px-3 text-right font-bold text-amber-800">
                    {formatPEN(item.item_balance_due_pen)}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        item.payment_status === 'PAGADO_TOTAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.payment_status === 'PAGO_PARCIAL'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.payment_status === 'PAGADO_TOTAL'
                        ? 'PAGADO 100%'
                        : item.payment_status === 'PAGO_PARCIAL'
                          ? 'PAGO PARCIAL'
                          : 'SIN PAGO VERIF.'}
                    </span>
                  </td>

                  <td className="py-3.5 px-3.5 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          item.delivery_status === 'ENTREGADO'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : item.delivery_status === 'LISTO_ENTREGA'
                              ? 'bg-blue-100 text-[#0A68FF]'
                              : item.delivery_status === 'REVOCADO'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.delivery_status === 'ENTREGADO'
                          ? 'ENVIADO POR WHATSAPP'
                          : item.delivery_status === 'LISTO_ENTREGA'
                            ? 'LISTO PARA DESPACHO'
                            : item.delivery_status === 'REVOCADO'
                              ? 'ACCESO REVOCADO'
                              : 'BLOQUEADO HASTA PAGO 100%'}
                      </span>

                      {item.is_fully_paid &&
                        item.payment_status === 'PAGADO_TOTAL' &&
                        item.delivery_status === 'ENTREGADO' &&
                        item.delivery &&
                        !item.delivery.is_revoked &&
                        item.delivery.custom_link_url && (
                          <a
                            href={item.delivery.custom_link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A68FF] hover:underline"
                          >
                            Abrir Enlace Habilitado <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sección Inferior: Historial de Comprobantes + Formulario para Enviar Comprobante */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Historial de Comprobantes Registrados */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0A68FF]" />
              Comprobantes Registrados ({order.payments?.length || 0})
            </h3>
          </div>

          {!order.payments || order.payments.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-500">
              Aún no has subido comprobantes para este pedido. Puedes enviarlo por nuestro WhatsApp oficial o adjuntarlo en el formulario adjunto.
            </div>
          ) : (
            <div className="space-y-3">
              {order.payments.map((pay) => {
                const previewHref = pay.receipt_image_url || pay.receipt_image_path;
                return (
                  <div
                    key={pay.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs sm:text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#0A68FF]" />
                        <span>{pay.payment_method}</span>
                        {pay.operation_number && (
                          <span className="font-mono text-xs text-slate-600">
                            • Op: #{pay.operation_number}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                          pay.verification_status === 'VERIFICADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pay.verification_status === 'RECHAZADO' ||
                                pay.verification_status === 'ANULADO'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-[#0A68FF]'
                        }`}
                      >
                        {pay.verification_status === 'EN_REVISION'
                          ? 'EN REVISIÓN (NO CONFIRMADO AÚN)'
                          : pay.verification_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-slate-500 block">Monto reportado por cliente:</span>
                        <strong className="text-slate-900">
                          {formatPEN(pay.amount_reported_pen)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Monto verificado por admin:</span>
                        <strong className="text-emerald-700">
                          {formatPEN(pay.amount_verified_pen)}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                      <span>
                        Fecha:{' '}
                        {new Date(pay.created_at).toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                      {previewHref && previewHref.startsWith('data:') && (
                        <a
                          href={previewHref}
                          download={`comprobante_${order.order_code}.png`}
                          className="text-[#0A68FF] font-semibold hover:underline"
                        >
                          Descargar copia adjunta
                        </a>
                      )}
                    </div>

                    {pay.rejection_reason && (
                      <div className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                        {pay.rejection_reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulario para Subir un Comprobante de Pago (Total o Parcial) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#0A68FF]" />
              Registrar Comprobante de Pago (En Soles S/)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjunta tu constancia de Yape ({settings.yapeNumber}), Plin ({settings.plinNumber}) o Transferencia Bancaria.
            </p>
          </div>

          {receiptSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{receiptSuccess}</span>
            </div>
          )}

          {receiptError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{receiptError}</span>
            </div>
          )}

          {order.status === 'CANCELADO' || order.status === 'REEMBOLSADO' ? (
            <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-600">
              Este pedido se encuentra en estado <strong>{order.status}</strong> y no admite nuevos comprobantes.
            </div>
          ) : (
            <form onSubmit={handleSubmitReceipt} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medio de Pago Utilizado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  >
                    <option value="YAPE">Yape (S/)</option>
                    <option value="PLIN">Plin (S/)</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria (S/)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto Abonado en Soles (S/) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    required
                    value={amountReported}
                    onChange={(e) => setAmountReported(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Operación
                  </label>
                  <input
                    type="text"
                    value={operationNumber}
                    onChange={(e) => setOperationNumber(e.target.value)}
                    placeholder="Ej. 05928412"
                    className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {paymentMethod === 'TRANSFERENCIA'
                      ? 'Banco de Origen'
                      : 'Celular desde donde abonó'}
                  </label>
                  {paymentMethod === 'TRANSFERENCIA' ? (
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ej. BCP / Interbank / BBVA"
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  ) : (
                    <input
                      type="tel"
                      value={originPhone}
                      onChange={(e) => setOriginPhone(e.target.value)}
                      placeholder="Ej. 987 654 321"
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjuntar captura o PDF del comprobante
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full h-11 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0A68FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Indicación sobre el abono (Ej. a qué producto aplicar si es pago parcial)
                </label>
                <input
                  type="text"
                  value={customerComment}
                  onChange={(e) => setCustomerComment(e.target.value)}
                  placeholder="Opcional: Ej. Abono completo para el primer producto..."
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReceipt}
                className="w-full h-11 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
              >
                {isSubmittingReceipt
                  ? 'Registrando comprobante...'
                  : 'Enviar Comprobante a Revisión Administrativa'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
