import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Send,
  Package,
  X,
  FileText,
  ArrowUpRight,
} from 'lucide-react';
import { getAllAdminOrders } from '../../../services/payments.service';
import { OrderWithDetails } from '../../../services/orders.service';
import { OrderStatus, ItemPaymentStatus, ItemDeliveryStatus } from '../../../types/order.types';
import { formatCurrencyPEN } from '../../../utils/currency';

const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badgeClass: string }
> = {
  PENDIENTE_PAGO: {
    label: 'Pendiente de Pago',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  PAGO_EN_REVISION: {
    label: 'Pago en Revisión',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  PAGO_PARCIAL: {
    label: 'Pago Parcial',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  PAGO_VERIFICADO: {
    label: 'Pago Verificado (100%)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  COMPLETADO: {
    label: 'Completado',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  OBSERVADO: {
    label: 'Observado',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  VENCIDO: {
    label: 'Vencido (72h)',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  CANCELADO: {
    label: 'Cancelado',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  REEMBOLSADO: {
    label: 'Reembolsado',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

const ITEM_PAYMENT_BADGE: Record<ItemPaymentStatus, { label: string; className: string }> = {
  SIN_PAGO: {
    label: 'Sin Pago (S/ 0.00)',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  PAGO_PARCIAL: {
    label: 'Pago Parcial',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  PAGADO_TOTAL: {
    label: '100% Pagado',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

const ITEM_DELIVERY_BADGE: Record<ItemDeliveryStatus, { label: string; className: string }> = {
  PENDIENTE: {
    label: 'Bloqueado (Falta Pago)',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  LISTO_ENTREGA: {
    label: 'Listo para Entrega',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ENTREGADO: {
    label: 'Entregado por WhatsApp',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REVOCADO: {
    label: 'Acceso Revocado',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export const OrdersAdminPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>(initialQuery);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getAllAdminOrders();
      setOrders(data);
      if (selectedOrder) {
        const updatedSelected = data.find((o) => o.id === selectedOrder.id) || null;
        setSelectedOrder(updatedSelected);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    setSearchTerm(qParam);
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      setSearchParams({ q: value.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      const matchCode = order.order_code.toLowerCase().includes(q);
      const matchName = order.buyer_name.toLowerCase().includes(q);
      const matchEmail = order.buyer_email.toLowerCase().includes(q);
      const matchPhone = order.buyer_phone.toLowerCase().includes(q);
      const matchDoc = (order.buyer_document_number || '').toLowerCase().includes(q);
      const matchProduct = (order.items || []).some((i) =>
        i.product_name_snapshot.toLowerCase().includes(q)
      );

      return matchCode || matchName || matchEmail || matchPhone || matchDoc || matchProduct;
    });
  }, [orders, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter(
      (o) => o.status !== 'CANCELADO' && o.status !== 'REEMBOLSADO'
    );
    const pendingReviewCount = orders.filter((o) => o.status === 'PAGO_EN_REVISION').length;
    const partialOrdersCount = orders.filter((o) => o.status === 'PAGO_PARCIAL').length;
    const totalNetPen = activeOrders.reduce((acc, o) => acc + o.total_net_pen, 0);
    const totalVerifiedPen = activeOrders.reduce((acc, o) => acc + o.total_paid_verified_pen, 0);
    const totalBalanceDuePen = activeOrders.reduce((acc, o) => acc + o.balance_due_pen, 0);

    return {
      totalCount: orders.length,
      pendingReviewCount,
      partialOrdersCount,
      totalNetPen,
      totalVerifiedPen,
      totalBalanceDuePen,
    };
  }, [orders]);

  const renderExpirationInfo = (order: OrderWithDetails) => {
    if (order.status === 'COMPLETADO' || order.status === 'PAGO_VERIFICADO') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pagado dentro de plazo
        </span>
      );
    }

    if (order.status === 'VENCIDO') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
          <AlertTriangle className="w-3.5 h-3.5" />
          Plazo 72h vencido (Pagos previos preservados)
        </span>
      );
    }

    const expiresMs = new Date(order.expires_at).getTime();
    const diffHours = Math.max(0, Math.round((expiresMs - Date.now()) / (1000 * 60 * 60)));

    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Vence en ~{diffHours}h ({new Date(order.expires_at).toLocaleDateString('es-PE')})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestión de Pedidos, Saldos por Producto y Vencimientos (72h)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Control financiero en Soles Peruanos (PEN / S/), seguimiento de pagos parciales por ítem y estado de entregas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadOrders}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Verificar Pagos ({stats.pendingReviewCount})
          </Link>
        </div>
      </div>

      {/* KPIs Financieros en PEN (S/) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Pedidos
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.partialOrdersCount} con pago parcial activo
          </p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            En Revisión Manual
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.pendingReviewCount}</p>
          <p className="text-xs text-blue-600 mt-1">Pendientes de validar voucher</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Facturación Neta Activa
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatCurrencyPEN(stats.totalNetPen)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Excluye cancelados y reembolsados</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Total Cobrado Verificado
          </p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">
            {formatCurrencyPEN(stats.totalVerifiedPen)}
          </p>
          <p className="text-xs text-emerald-600 mt-1">Comprobantes aprobados en S/</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Saldo por Cobrar
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {formatCurrencyPEN(stats.totalBalanceDuePen)}
          </p>
          <p className="text-xs text-amber-700 mt-1">Pendiente en pedidos activos</p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por código SL-2026-XXXXXX, cliente, correo, teléfono, DNI/RUC o producto..."
            className="w-full pl-10 pr-9 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Estado:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos los estados ({orders.length})</option>
            <option value="PAGO_EN_REVISION">Pago en Revisión</option>
            <option value="PAGO_PARCIAL">Pago Parcial</option>
            <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
            <option value="PAGO_VERIFICADO">Pago Verificado (100%)</option>
            <option value="COMPLETADO">Completado</option>
            <option value="OBSERVADO">Observado</option>
            <option value="VENCIDO">Vencido (72h)</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="REEMBOLSADO">Reembolsado</option>
          </select>
        </div>
      </div>

      {/* Tabla Principal de Pedidos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Cargando pedidos y saldos por producto...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-base font-semibold text-slate-800">
              No se encontraron pedidos con los filtros seleccionados
            </p>
            <p className="text-xs text-slate-500">
              Prueba limpiando el término de búsqueda o cambiando el filtro de estado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Código / Fecha</th>
                  <th className="py-3.5 px-4">Cliente / Contacto</th>
                  <th className="py-3.5 px-4">Productos y Progreso</th>
                  <th className="py-3.5 px-4 text-right">Total Neto (S/)</th>
                  <th className="py-3.5 px-4 text-right">Verificado (S/)</th>
                  <th className="py-3.5 px-4 text-right">Saldo (S/)</th>
                  <th className="py-3.5 px-4">Estado / Vencimiento</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredOrders.map((order) => {
                  const statusMeta = ORDER_STATUS_META[order.status] || {
                    label: order.status,
                    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  const items = order.items || [];
                  const fullyPaidCount = items.filter((i) => i.is_fully_paid).length;
                  const deliveredCount = items.filter(
                    (i) => i.delivery_status === 'ENTREGADO'
                  ).length;
                  const pendingReceiptsCount = (order.payments || []).filter(
                    (p) => p.verification_status === 'EN_REVISION'
                  ).length;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 align-top">
                        <div className="font-mono font-bold text-slate-900">
                          {order.order_code}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {new Date(order.created_at).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                        <div className="mt-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            Medio preferido: {order.payment_method_selected || 'YAPE'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="font-semibold text-slate-900">{order.buyer_name}</div>
                        <div className="text-xs text-slate-600">{order.buyer_email}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          WhatsApp: +{order.buyer_phone}
                          {order.buyer_document_number
                            ? ` • ${order.buyer_document_type || 'DOC'}: ${order.buyer_document_number}`
                            : ''}
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="text-xs font-semibold text-slate-800">
                          {items.length} {items.length === 1 ? 'producto' : 'productos'}
                        </div>
                        <div className="mt-1 space-y-1">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200/80 rounded px-2 py-1"
                            >
                              <span className="truncate max-w-[190px] font-medium text-slate-700">
                                {item.product_name_snapshot}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap ${
                                  ITEM_PAYMENT_BADGE[item.payment_status].className
                                }`}
                              >
                                {item.is_fully_paid
                                  ? '100% Pagado'
                                  : `Saldo: ${formatCurrencyPEN(item.item_balance_due_pen)}`}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                          <span>
                            Pagados 100%: <strong>{fullyPaidCount}/{items.length}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Entregados: <strong>{deliveredCount}/{items.length}</strong>
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top text-right font-semibold text-slate-900">
                        {formatCurrencyPEN(order.total_net_pen)}
                        {order.discount_pen > 0 && (
                          <div className="text-[11px] text-emerald-600 font-normal">
                            Desc: -{formatCurrencyPEN(order.discount_pen)}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <span className="font-semibold text-emerald-700">
                          {formatCurrencyPEN(order.total_paid_verified_pen)}
                        </span>
                        {pendingReceiptsCount > 0 && (
                          <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                            +{pendingReceiptsCount} voucher en revisión
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <span
                          className={`font-bold ${
                            order.balance_due_pen > 0 ? 'text-amber-700' : 'text-slate-400'
                          }`}
                        >
                          {formatCurrencyPEN(order.balance_due_pen)}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                        <div className="mt-1.5">{renderExpirationInfo(order)}</div>
                      </td>

                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Desglose
                          </button>

                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/admin/payments?order=${order.order_code}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold"
                            >
                              <CreditCard className="w-3 h-3" />
                              Pagos
                            </Link>
                            <Link
                              to={`/admin/deliveries?order=${order.order_code}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold"
                            >
                              <Send className="w-3 h-3" />
                              Entregas
                            </Link>
                          </div>
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

      {/* Modal de Desglose Financiero e Ítems del Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full overflow-hidden shadow-xl my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-lg font-bold">
                    {selectedOrder.order_code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-white/15 text-white">
                    {ORDER_STATUS_META[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Cliente: {selectedOrder.buyer_name} ({selectedOrder.buyer_email}) • WhatsApp: +
                  {selectedOrder.buyer_phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Resumen Financiero */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Subtotal Bruto</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {formatCurrencyPEN(selectedOrder.subtotal_pen)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500">Descuento Aplicado</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    -{formatCurrencyPEN(selectedOrder.discount_pen)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-700">Total Pagado Verificado</p>
                  <p className="text-base font-bold text-emerald-900 mt-0.5">
                    {formatCurrencyPEN(selectedOrder.total_paid_verified_pen)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800">Saldo Pendiente Total</p>
                  <p className="text-base font-bold text-amber-900 mt-0.5">
                    {formatCurrencyPEN(selectedOrder.balance_due_pen)}
                  </p>
                </div>
              </div>

              {/* Desglose por Producto (Asignación de Pagos y Elegibilidad de Entrega) */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Estado Individual por Producto (Asignación en S/ y Regla 100% Pagado)
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                        <th className="py-2.5 px-3">Producto / Versión</th>
                        <th className="py-2.5 px-3 text-right">Precio Neto</th>
                        <th className="py-2.5 px-3 text-right">Asignado Verificado</th>
                        <th className="py-2.5 px-3 text-right">Saldo Ítem</th>
                        <th className="py-2.5 px-3">Estado de Pago</th>
                        <th className="py-2.5 px-3">Estado de Entrega</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(selectedOrder.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">
                              {item.product_name_snapshot}
                            </div>
                            <div className="text-slate-500">
                              Versión: {item.product_version_snapshot} • Modalidad:{' '}
                              {item.product_modalidad_snapshot}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-900">
                            {formatCurrencyPEN(item.final_item_price_pen)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                            {formatCurrencyPEN(item.allocated_paid_pen)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-amber-800">
                            {formatCurrencyPEN(item.item_balance_due_pen)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded font-semibold border ${
                                ITEM_PAYMENT_BADGE[item.payment_status].className
                              }`}
                            >
                              {ITEM_PAYMENT_BADGE[item.payment_status].label}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded font-semibold border ${
                                ITEM_DELIVERY_BADGE[item.delivery_status].className
                              }`}
                            >
                              {ITEM_DELIVERY_BADGE[item.delivery_status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historial de Comprobantes del Pedido */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Comprobantes de Pago Registrados ({(selectedOrder.payments || []).length})
                </h3>
                {(selectedOrder.payments || []).length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    Aún no se han registrado comprobantes para este pedido.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selectedOrder.payments || []).map((pay) => (
                      <div
                        key={pay.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{pay.payment_method}</span>
                            <span className="text-slate-500">
                              Op: {pay.operation_number || 'Sin N°'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-semibold ${
                                pay.verification_status === 'VERIFICADO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : pay.verification_status === 'RECHAZADO'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {pay.verification_status}
                            </span>
                          </div>
                          {pay.rejection_reason && (
                            <p className="text-slate-600 mt-1">{pay.rejection_reason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-slate-500">
                              Reportado: {formatCurrencyPEN(pay.amount_reported_pen)}
                            </div>
                            <div className="font-bold text-emerald-700">
                              Verificado: {formatCurrencyPEN(pay.amount_verified_pen)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedOrder.notes && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Notas del pedido:</span> {selectedOrder.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/payments?order=${selectedOrder.order_code}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  <CreditCard className="w-4 h-4" />
                  Gestionar Pagos y Asignación por Producto
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/admin/deliveries?order=${selectedOrder.order_code}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  <Send className="w-4 h-4" />
                  Ir a Entregas por WhatsApp
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
