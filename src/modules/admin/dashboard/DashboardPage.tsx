/**
 * SmartLab Store — Dashboard Comercial y Operativo (Panel Administrativo)
 * docs/08_PLAN_SPRINTS.md (Sprint 08) y docs/06_DISENO_VISUAL_UX_UI.md (Sección 8)
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  TicketPercent,
  Users,
  MessageSquarePlus,
  Settings,
  ArrowRight,
  Tag,
} from 'lucide-react';
import {
  getAdminDashboardMetrics,
  AdminDashboardMetrics,
} from '../../../services/admin.service';
import { formatPEN } from '../../../utils/currency';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAdminDashboardMetrics().then((data) => {
      if (mounted) {
        setMetrics(data);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        Cargando métricas operativas del Dashboard Comercial...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard Comercial y Operativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitoreo en tiempo real de ingresos verificados en Soles, comprobantes en revisión, catálogo y solicitudes a medida.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/products"
            className="px-3.5 py-2 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Package className="w-4 h-4" />
            Gestionar Productos y Drive/MediaFire
          </Link>
          <Link
            to="/admin/settings"
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Settings className="w-4 h-4" />
            Configurar Cuentas y Plazo 72h
          </Link>
        </div>
      </div>

      {/* Fila Principal de KPIs Operativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Ingresos Verificados (PEN)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0A68FF] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#0A68FF]">
            {formatPEN(metrics.totalVerifiedRevenuePen)}
          </p>
          <span className="text-[11px] text-slate-500 block">
            Excluye comprobantes aún en revisión
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Comprobantes en Revisión
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#FF6B00] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#FF6B00]">
            {metrics.pendingReceiptsCount}
          </p>
          <Link
            to="/admin/payments"
            className="text-[11px] font-semibold text-[#0A68FF] hover:underline inline-flex items-center gap-1"
          >
            Ir a verificación manual <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Listos para Entrega WhatsApp
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            {metrics.readyForDeliveryCount}
          </p>
          <span className="text-[11px] text-slate-500 block">
            Ítems con 100% de pago verificado
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Solicitudes Personalizadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-purple-700">
            {metrics.customRequestsPendingCount}
          </p>
          <Link
            to="/admin/custom-requests"
            className="text-[11px] font-semibold text-[#0A68FF] hover:underline inline-flex items-center gap-1"
          >
            Ver bandeja de cotizaciones <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Segunda Fila de Indicadores de Catálogo, Cupones, Clientes y Vencimientos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/admin/products"
          className="bg-white border border-slate-200 hover:border-[#0A68FF] rounded-xl p-4 flex items-center justify-between transition"
        >
          <div>
            <span className="text-xs text-slate-500 block">Productos Activos</span>
            <strong className="text-lg font-bold text-slate-900">
              {metrics.activeProductsCount}
            </strong>
          </div>
          <Package className="w-5 h-5 text-[#0A68FF]" />
        </Link>

        <Link
          to="/admin/pricing"
          className="bg-white border border-slate-200 hover:border-[#0A68FF] rounded-xl p-4 flex items-center justify-between transition"
        >
          <div>
            <span className="text-xs text-slate-500 block">Precios y Promos</span>
            <strong className="text-sm font-bold text-[#0A68FF]">Moneda S/ (PEN)</strong>
          </div>
          <Tag className="w-5 h-5 text-[#FF6B00]" />
        </Link>

        <Link
          to="/admin/coupons"
          className="bg-white border border-slate-200 hover:border-[#0A68FF] rounded-xl p-4 flex items-center justify-between transition"
        >
          <div>
            <span className="text-xs text-slate-500 block">Cupones Activos</span>
            <strong className="text-lg font-bold text-slate-900">
              {metrics.activeCouponsCount}
            </strong>
          </div>
          <TicketPercent className="w-5 h-5 text-emerald-600" />
        </Link>

        <Link
          to="/admin/customers"
          className="bg-white border border-slate-200 hover:border-[#0A68FF] rounded-xl p-4 flex items-center justify-between transition"
        >
          <div>
            <span className="text-xs text-slate-500 block">Clientes Registrados</span>
            <strong className="text-lg font-bold text-slate-900">
              {metrics.totalCustomersCount}
            </strong>
          </div>
          <Users className="w-5 h-5 text-indigo-600" />
        </Link>
      </div>

      {/* Tablas Operativas: Últimos Pedidos y Solicitudes Personalizadas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Últimos Pedidos */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pedidos Recientes ({metrics.recentOrders.length})
              </h2>
              <p className="text-xs text-slate-500">
                Pendientes de pago: {metrics.pendingOrdersCount} • Vencidos (72h):{' '}
                {metrics.expiredOrdersCount}
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-[#0A68FF] hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          {metrics.recentOrders.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-lg text-xs text-slate-500">
              Aún no se han generado pedidos desde el checkout.
            </div>
          ) : (
            <div className="table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Cliente / WhatsApp</th>
                    <th className="py-2.5 px-3 text-right">Total Neto</th>
                    <th className="py-2.5 px-3 text-right">Verificado</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {ord.order_code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{ord.buyer_name}</div>
                        <div className="text-[11px] text-slate-500">{ord.buyer_phone}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatPEN(ord.total_net_pen)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatPEN(ord.total_paid_verified_pen)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bandeja Rápida de Solicitudes Personalizadas */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Solicitudes Personalizadas
              </h2>
              <p className="text-xs text-slate-500">
                Requerimientos de desarrollo a medida en S/
              </p>
            </div>
            <Link
              to="/admin/custom-requests"
              className="text-xs font-semibold text-[#0A68FF] hover:underline"
            >
              Gestionar →
            </Link>
          </div>

          <div className="space-y-3">
            {metrics.recentCustomRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="font-bold text-slate-900">
                    {req.requester_name}
                  </strong>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.status === 'RECIBIDA'
                        ? 'bg-amber-100 text-amber-800'
                        : req.status === 'COTIZADA' || req.status === 'ACEPTADA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-[#0A68FF]'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <p className="text-slate-600 line-clamp-2">{req.requirements_detail}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>WhatsApp: {req.requester_phone}</span>
                  {req.estimated_budget_pen && (
                    <span className="font-semibold text-slate-800">
                      Presupuesto: {formatPEN(req.estimated_budget_pen)}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {metrics.recentCustomRequests.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" /> Sin solicitudes registradas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
