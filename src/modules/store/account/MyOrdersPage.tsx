/**
 * SmartLab Store — Mis Pedidos y Estados del Cliente
 * docs/08_PLAN_SPRINTS.md (Sprint 07) y docs/05_PEDIDOS_PAGOS.md
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ChevronRight,
  Search,
  User,
  ShieldAlert,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  getOrdersByCustomer,
  getCheckoutStoreSettings,
  DEFAULT_CHECKOUT_STORE_SETTINGS,
  OrderWithDetails,
} from '../../../services/orders.service';
import { OrderStatus } from '../../../types/order.types';
import { formatPEN } from '../../../utils/currency';
import { buildOrderWhatsAppUrl } from '../../../utils/whatsapp';

export function getOrderStatusBadgeMeta(status: OrderStatus): {
  label: string;
  classes: string;
  description: string;
} {
  switch (status) {
    case 'PENDIENTE_PAGO':
      return {
        label: 'Pendiente de Pago',
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
        description: 'Esperando el envío y verificación de tu comprobante de pago.',
      };
    case 'PAGO_EN_REVISION':
      return {
        label: 'Comprobante en Revisión',
        classes: 'bg-blue-50 text-[#0A68FF] border-blue-200',
        description:
          'Recibimos tu comprobante. El pago y las descargas se activan únicamente tras la verificación del administrador.',
      };
    case 'PAGO_PARCIAL':
      return {
        label: 'Pago Parcial Verificado',
        classes: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        description:
          'Tienes abonos verificados asignados por producto y un saldo pendiente por completar.',
      };
    case 'PAGO_VERIFICADO':
      return {
        label: 'Pago 100% Verificado',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        description:
          'Tu pago total fue validado. Tus productos están listos para despacho por WhatsApp.',
      };
    case 'COMPLETADO':
      return {
        label: 'Pedido Completado',
        classes: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        description:
          'Pago verificado y enlaces digitales despachados a tu WhatsApp.',
      };
    case 'VENCIDO':
      return {
        label: 'Plazo 72h Vencido',
        classes: 'bg-orange-50 text-orange-800 border-orange-200',
        description:
          'Superó las 72 horas sin completarse el 100%, pero conserva intactos tus pagos verificados previos y saldos.',
      };
    case 'OBSERVADO':
      return {
        label: 'Comprobante Observado',
        classes: 'bg-red-50 text-red-700 border-red-200',
        description:
          'El último comprobante tuvo una observación. Revisa el detalle y envía un comprobante válido.',
      };
    case 'CANCELADO':
      return {
        label: 'Pedido Cancelado',
        classes: 'bg-slate-100 text-slate-700 border-slate-300',
        description: 'Este pedido fue cancelado.',
      };
    case 'REEMBOLSADO':
      return {
        label: 'Reembolsado',
        classes: 'bg-purple-50 text-purple-800 border-purple-200',
        description: 'Pedido con devolución financiera registrada.',
      };
    default:
      return {
        label: status,
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
        description: '',
      };
  }
}

export const MyOrdersPage: React.FC = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [officialWhatsapp, setOfficialWhatsapp] = useState(
    DEFAULT_CHECKOUT_STORE_SETTINGS.officialWhatsappPhone
  );

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!profile) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [customerOrders, settings] = await Promise.all([
        getOrdersByCustomer(profile.id, profile.email),
        getCheckoutStoreSettings(),
      ]);

      if (mounted) {
        setOrders(customerOrders);
        setOfficialWhatsapp(settings.officialWhatsappPhone);
        setIsLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [profile]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (statusFilter !== 'ALL' && ord.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesCode = ord.order_code.toLowerCase().includes(q);
        const matchesItems = (ord.items || []).some((it) =>
          it.product_name_snapshot.toLowerCase().includes(q)
        );
        return matchesCode || matchesItems;
      }
      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const inReviewOrPending = orders.filter(
      (o) =>
        o.status === 'PENDIENTE_PAGO' ||
        o.status === 'PAGO_EN_REVISION' ||
        o.status === 'PAGO_PARCIAL'
    ).length;
    const totalVerifiedPen = orders.reduce(
      (acc, o) => acc + Number(o.total_paid_verified_pen || 0),
      0
    );
    return {
      totalOrders,
      inReviewOrPending,
      totalVerifiedPen,
    };
  }, [orders]);

  return (
    <div className="smartlab-container py-8 sm:py-10 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0A68FF] block">
            Portal del Cliente • SmartLab Store
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Mis Pedidos, Pagos y Entregas por Producto
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Cuenta activa: <strong>{profile?.email}</strong> • WhatsApp registrado:{' '}
            <strong>{profile?.phone_number}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/mi-cuenta/perfil"
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
          >
            <User className="w-3.5 h-3.5" />
            Mi Perfil
          </Link>
          <Link
            to="/catalogo"
            className="px-4 py-2 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Ir al Catálogo
          </Link>
        </div>
      </div>

      {/* KPIs Resumen del Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Pedidos Registrados</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalOrders}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            En Revisión o Con Saldo Pendiente
          </span>
          <p className="text-2xl font-bold text-[#FF6B00] mt-1">{stats.inReviewOrPending}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">
            Total Pagos Verificados (PEN)
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {formatPEN(stats.totalVerifiedPen)}
          </p>
        </div>
      </div>

      {/* Aviso normativo de revisión manual */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-slate-700">
        <ShieldAlert className="w-5 h-5 text-[#0A68FF] shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900">
            Política de Verificación de Pagos y Vencimiento de 72 horas:
          </strong>{' '}
          Todo pedido cuenta con una reserva predeterminada de <strong>72 horas</strong>. Los comprobantes enviados quedan en estado{' '}
          <strong>Comprobante en Revisión</strong> y solo confirman el pago o habilitan el envío de enlaces privados por WhatsApp cuando nuestro equipo administrativo valida el abono en Soles (`S/`).
        </div>
      </div>

      {/* Barra de búsqueda y filtro de estado */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código de pedido (ej. SL-2026-...) o nombre de software..."
            className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-[#0A68FF]"
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDIENTE_PAGO">Pendiente de Pago</option>
          <option value="PAGO_EN_REVISION">Comprobante en Revisión</option>
          <option value="PAGO_PARCIAL">Pago Parcial</option>
          <option value="PAGO_VERIFICADO">Pago Verificado</option>
          <option value="COMPLETADO">Completado</option>
          <option value="VENCIDO">Vencido (72h)</option>
          <option value="OBSERVADO">Observado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {/* Listado de Pedidos */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          Cargando el historial de tus pedidos...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {orders.length === 0
              ? 'Aún no tienes pedidos registrados en tu cuenta'
              : 'No se encontraron pedidos con el filtro seleccionado'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Explora nuestro catálogo de software técnico, plantillas de ingeniería y utilidades digitales en Soles Peruanos (`S/`).
          </p>
          <div className="pt-2">
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-semibold transition"
            >
              Explorar Catálogo
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((ord) => {
            const badge = getOrderStatusBadgeMeta(ord.status);
            const createdStr = new Date(ord.created_at).toLocaleString('es-PE', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
            const expiresStr = new Date(ord.expires_at).toLocaleString('es-PE', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            const waUrl = buildOrderWhatsAppUrl({
              orderCode: ord.order_code,
              buyerName: ord.buyer_name,
              paymentMethod: ord.payment_method_selected,
              items: (ord.items || []).map((it) => ({
                name: it.product_name_snapshot,
                version: it.product_version_snapshot,
                price: it.final_item_price_pen,
              })),
              totalNetPen: ord.total_net_pen,
              storeWhatsAppNumber: officialWhatsapp,
            });

            return (
              <div
                key={ord.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition space-y-4"
              >
                {/* Cabecera del Pedido */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        to={`/mi-cuenta/pedidos/${ord.id}`}
                        className="text-base sm:text-lg font-bold text-slate-900 hover:text-[#0A68FF] transition"
                      >
                        {ord.order_code}
                      </Link>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>Creado: {createdStr}</span>
                      <span className="flex items-center gap-1 text-amber-800 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        Vencimiento reserva (72h): {expiresStr}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp ({ord.order_code})
                    </a>
                    <Link
                      to={`/mi-cuenta/pedidos/${ord.id}`}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition"
                    >
                      Ver Detalle y Productos
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Resumen financiero y lista rápida de productos */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase text-slate-400 block">
                      Productos del Pedido ({ord.items?.length || 0})
                    </span>
                    <div className="space-y-1">
                      {(ord.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-xs sm:text-sm bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-slate-800">
                              {item.product_name_snapshot}
                            </span>{' '}
                            <span className="text-xs text-slate-500">
                              ({item.product_version_snapshot})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-slate-900">
                              {formatPEN(item.final_item_price_pen)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.payment_status === 'PAGADO_TOTAL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.payment_status === 'PAGO_PARCIAL'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.payment_status === 'PAGADO_TOTAL'
                                ? 'Pagado 100%'
                                : item.payment_status === 'PAGO_PARCIAL'
                                  ? `Abonado ${formatPEN(item.allocated_paid_pen)}`
                                  : 'Sin pago verificado'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-5 grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                        Total Neto
                      </span>
                      <strong className="text-xs sm:text-sm font-bold text-slate-900">
                        {formatPEN(ord.total_net_pen)}
                      </strong>
                    </div>
                    <div className="border-x border-slate-200 px-1">
                      <span className="text-[10px] font-semibold uppercase text-emerald-700 block">
                        Pagado Verif.
                      </span>
                      <strong className="text-xs sm:text-sm font-bold text-emerald-700">
                        {formatPEN(ord.total_paid_verified_pen)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold uppercase text-amber-800 block">
                        Saldo Pend.
                      </span>
                      <strong className="text-xs sm:text-sm font-bold text-amber-800">
                        {formatPEN(ord.balance_due_pen)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Pie explicativo del estado actual */}
                <div className="text-xs text-slate-600 flex items-center gap-2 pt-1">
                  {ord.status === 'COMPLETADO' || ord.status === 'PAGO_VERIFICADO' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>{badge.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
