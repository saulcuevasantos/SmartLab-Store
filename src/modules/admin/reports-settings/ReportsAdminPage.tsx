/**
 * SmartLab Store — Reportes Comerciales y Financieros en Soles (ReportsAdminPage.tsx)
 * docs/08_PLAN_SPRINTS.md (Sprint 10), docs/02_REQUERIMIENTOS.md (B.10) y docs/05_PEDIDOS_PAGOS.md
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Banknote,
  CheckCircle2,
  Settings,
  RefreshCw,
  ShieldCheck,
  Package,
  ArrowUpRight,
} from 'lucide-react';
import {
  CommercialReportsSummary,
  getCommercialReportsSummary,
} from '../../../services/cancellations.service';
import { formatCurrencyPEN } from '../../../utils/currency';

export const ReportsAdminPage: React.FC = () => {
  const [summary, setSummary] = useState<CommercialReportsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getCommercialReportsSummary();
      setSummary(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (!summary) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
        Calculando reportes comerciales y saldos verificados en Soles (PEN / S/)...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera con acceso directo a Configuración General */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Analítica Financiera y Contable • Moneda Oficial PEN (S/)
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#0A68FF]" />
            Reportes Comerciales, Saldos en Pedidos Parciales/Vencidos y Reembolsos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Consolidado exclusivo de pagos verificados manualmente, saldos históricos preservados
            y devoluciones efectivas en Soles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/settings"
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4 text-[#0A68FF]" />
            Configuración (72h / Cuentas S/)
          </Link>
          <button
            type="button"
            onClick={loadReports}
            className="px-3.5 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar Métricas
          </button>
        </div>
      </div>

      {/* KPIs Financieros Principales en Soles (PEN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ingresos Verificados Brutos</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatCurrencyPEN(summary.verifiedRevenueGrossPen)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Excluye comprobantes en revisión (PENDIENTE)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ingreso Neto Retenido</span>
            <CheckCircle2 className="w-4 h-4 text-[#0A68FF]" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatCurrencyPEN(summary.netRetainedRevenuePen)}
          </div>
          <p className="text-[11px] text-purple-700 font-semibold mt-1">
            Reembolsos efectivos: -{formatCurrencyPEN(summary.completedRefundsTotalPen)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Saldos por Cobrar (Parciales)</span>
            <Banknote className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1">
            {formatCurrencyPEN(summary.pendingBalanceInPartialOrdersPen)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            En pedidos activos con PAGO_PARCIAL
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Abonos Preservados (Vencidos 72h)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">
            {formatCurrencyPEN(summary.preservedPaidInExpiredOrdersPen)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            En {summary.expiredOrdersCount} pedidos VENCIDO (Saldo faltante:{' '}
            {formatCurrencyPEN(summary.pendingBalanceInExpiredOrdersPen)})
          </p>
        </div>
      </div>

      {/* Desglose por Medio de Pago (Yape, Plin, Transferencia Bancaria) y Estado Operativo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Ingresos Verificados por Medio de Pago en S/
              </h2>
              <p className="text-xs text-slate-500">
                Distribución real de cobros aprobados manualmente en cuentas oficiales.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.revenueByMethod.map((row) => (
              <div
                key={row.method}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    {row.method === 'TRANSFERENCIA'
                      ? 'TRANSFERENCIA BANCARIA (BCP / Interbank)'
                      : row.method}
                  </span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {formatCurrencyPEN(row.totalVerifiedPen)} ({row.sharePercent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#0A68FF] rounded-full"
                    style={{ width: `${Math.min(100, row.sharePercent)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  {row.verifiedCount} comprobante(s) verificado(s) y asignado(s)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado de Pedidos Vencidos con Saldos Históricos Preservados */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Pedidos Vencidos (72h) con Saldos Históricos Conservados
              </h2>
              <p className="text-xs text-slate-500">
                Ningún pago verificado se elimina cuando un pedido pasa a VENCIDO.
              </p>
            </div>
            <Link
              to="/admin/cancellations"
              className="text-xs font-bold text-[#0A68FF] hover:underline flex items-center gap-1"
            >
              Gestionar <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {summary.expiredOrdersWithBalances.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No existen pedidos en estado VENCIDO actualmente.
            </div>
          ) : (
            <div className="space-y-2.5">
              {summary.expiredOrdersWithBalances.map((exp) => (
                <div
                  key={exp.orderId}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-900">{exp.orderCode}</div>
                    <div className="text-slate-600">
                      {exp.buyerName} • WhatsApp: {exp.buyerPhone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-700 font-bold">
                      Abono preservado: {formatCurrencyPEN(exp.preservedPaidPen)}
                    </div>
                    <div className="text-amber-700 text-[11px]">
                      Saldo faltante: {formatCurrencyPEN(exp.pendingBalancePen)} (Total:{' '}
                      {formatCurrencyPEN(exp.totalNetPen)})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ranking de Productos por Ingresos Asignados y Entregas */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#0A68FF]" />
              Desempeño por Producto Digital (Recaudación Asignada y Entregas WhatsApp)
            </h2>
            <p className="text-xs text-slate-500">
              Importes calculados directamente desde payment_allocations por cada producto.
            </p>
          </div>

          <Link
            to="/admin/audit"
            className="text-xs font-bold text-[#0A68FF] hover:underline flex items-center gap-1"
          >
            <ShieldCheck className="w-4 h-4" />
            Ver Bitácora de Auditoría
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px]">
                <th className="py-2.5 pr-3">Producto Digital</th>
                <th className="py-2.5 px-3">Modalidad</th>
                <th className="py-2.5 px-3">Pedidos</th>
                <th className="py-2.5 px-3">Entregados (100% Pagados)</th>
                <th className="py-2.5 pl-3 text-right">Monto Verificado Asignado (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.topProducts.map((prod) => (
                <tr key={prod.productId} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-bold text-slate-900">{prod.productName}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] font-bold text-[11px]">
                      {prod.modalidad}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    {prod.ordersCount}
                  </td>
                  <td className="py-3 px-3 font-semibold text-emerald-700">
                    {prod.deliveredCount} entregado(s)
                  </td>
                  <td className="py-3 pl-3 text-right font-extrabold text-slate-900">
                    {formatCurrencyPEN(prod.allocatedRevenuePen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
