import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Send,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  CreditCard,
  X,
  Link2,
} from 'lucide-react';
import {
  DeliverableOrderItemRow,
  dispatchProductViaWhatsApp,
  getAdminDeliverableItems,
} from '../../../services/deliveries.service';
import { formatCurrencyPEN } from '../../../utils/currency';

export const DeliveriesAdminPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderParam = searchParams.get('order') || '';

  const [rows, setRows] = useState<DeliverableOrderItemRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>(initialOrderParam);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selección de enlace (Google Drive / MediaFire) o URL personalizada por cada order_item_id
  const [selectedLinkIdByItem, setSelectedLinkIdByItem] = useState<Record<string, string>>({});
  const [customUrlByItem, setCustomUrlByItem] = useState<Record<string, string>>({});
  const [dispatchingItemId, setDispatchingItemId] = useState<string | null>(null);

  // Resultado de despacho reciente con enlace directo a WhatsApp Web / App
  const [lastDispatchedResult, setLastDispatchedResult] = useState<{
    orderCode: string;
    productName: string;
    buyerName: string;
    whatsappUrl: string;
  } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const loadDeliverables = async () => {
    setLoading(true);
    try {
      const data = await getAdminDeliverableItems();
      setRows(data);

      const initialSelectedLinks: Record<string, string> = {};
      const initialCustomUrls: Record<string, string> = {};
      for (const r of data) {
        if (r.availableLinks.length > 0) {
          initialSelectedLinks[r.item.id] = r.availableLinks[0].id;
        } else {
          initialSelectedLinks[r.item.id] = 'CUSTOM';
          initialCustomUrls[r.item.id] =
            r.existingDelivery?.custom_link_url ||
            `https://drive.google.com/drive/folders/smartlab-${r.item.product_id}`;
        }
      }
      setSelectedLinkIdByItem((prev) => ({ ...initialSelectedLinks, ...prev }));
      setCustomUrlByItem((prev) => ({ ...initialCustomUrls, ...prev }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliverables();
  }, []);

  useEffect(() => {
    const ord = searchParams.get('order') || '';
    if (ord) {
      setSearchTerm(ord);
    }
  }, [searchParams]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter === 'READY' && row.item.delivery_status !== 'LISTO_ENTREGA') {
        return false;
      }
      if (statusFilter === 'DELIVERED' && row.item.delivery_status !== 'ENTREGADO') {
        return false;
      }
      if (statusFilter === 'LOCKED' && row.canDeliver) {
        return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      return (
        row.orderCode.toLowerCase().includes(q) ||
        row.buyerName.toLowerCase().includes(q) ||
        row.buyerPhone.toLowerCase().includes(q) ||
        row.item.product_name_snapshot.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const readyCount = rows.filter((r) => r.item.delivery_status === 'LISTO_ENTREGA').length;
    const deliveredCount = rows.filter((r) => r.item.delivery_status === 'ENTREGADO').length;
    const lockedCount = rows.filter((r) => !r.canDeliver).length;
    return {
      totalItems: rows.length,
      readyCount,
      deliveredCount,
      lockedCount,
    };
  }, [rows]);

  const handleDispatchWhatsApp = async (row: DeliverableOrderItemRow) => {
    setErrorBanner(null);

    if (!row.canDeliver || !row.item.is_fully_paid) {
      setErrorBanner(
        row.lockReason ||
          'Entrega bloqueada: Este producto aún no tiene el 100% de su pago verificado.'
      );
      return;
    }

    const chosenLinkId = selectedLinkIdByItem[row.item.id];
    const isCustom = chosenLinkId === 'CUSTOM' || row.availableLinks.length === 0;
    const customUrl = customUrlByItem[row.item.id] || '';

    setDispatchingItemId(row.item.id);
    try {
      const { delivery, whatsappUrl, error } = await dispatchProductViaWhatsApp({
        orderId: row.orderId,
        orderItemId: row.item.id,
        downloadLinkId: isCustom ? null : chosenLinkId,
        customLinkUrl: isCustom ? customUrl : null,
      });

      if (error || !delivery || !whatsappUrl) {
        setErrorBanner(error || 'No se pudo generar el despacho por WhatsApp.');
        return;
      }

      setLastDispatchedResult({
        orderCode: row.orderCode,
        productName: row.item.product_name_snapshot,
        buyerName: row.buyerName,
        whatsappUrl,
      });

      await loadDeliverables();
    } finally {
      setDispatchingItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Entregas Individuales por Producto vía WhatsApp
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Despacha enlaces privados de Google Drive o MediaFire exclusivamente para productos con pago 100% verificado (PAGADO_TOTAL).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadDeliverables}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <CreditCard className="w-4 h-4" />
            Ir a Pagos y Asignaciones
          </Link>
        </div>
      </div>

      {/* Notificación de Despacho Exitoso con botón directo a WhatsApp */}
      {lastDispatchedResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-1">
              <p className="text-sm font-bold text-emerald-900">
                ¡Entrega registrada como ENTREGADO para {lastDispatchedResult.productName}!
              </p>
              <p>
                Pedido <strong className="font-mono">{lastDispatchedResult.orderCode}</strong> •
                Cliente: <strong>{lastDispatchedResult.buyerName}</strong>. Si todos los productos
                del pedido están entregados, el pedido pasó automáticamente a{' '}
                <strong>COMPLETADO</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={lastDispatchedResult.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Abrir Mensaje en WhatsApp
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setLastDispatchedResult(null)}
              className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-rose-700 hover:text-rose-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPIs de Entregas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Ítems en Pedidos
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalItems}</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Listos para Entrega (100% Pagados)
          </p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.readyCount}</p>
          <p className="text-xs text-blue-600 mt-1">Habilitados para envío por WhatsApp</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Productos Entregados
          </p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{stats.deliveredCount}</p>
          <p className="text-xs text-emerald-600 mt-1">Con trazabilidad de fecha y enlace</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Bloqueados por Saldo Pendiente
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats.lockedCount}</p>
          <p className="text-xs text-amber-700 mt-1">Requieren completar pago al 100%</p>
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
            placeholder="Buscar por pedido SL-2026-..., cliente, teléfono WhatsApp o nombre de producto..."
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
          <label className="text-xs font-semibold text-slate-600">Filtro de Elegibilidad:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-800"
          >
            <option value="ALL">Todos los ítems ({rows.length})</option>
            <option value="READY">Listos para Entrega ({stats.readyCount})</option>
            <option value="LOCKED">Bloqueados por Pago Incompleto ({stats.lockedCount})</option>
            <option value="DELIVERED">Entregados por WhatsApp ({stats.deliveredCount})</option>
          </select>
        </div>
      </div>

      {/* Lista de Ítems y Consola de Despacho Individual */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-500">
            Verificando elegibilidad de entrega por producto...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-2">
            <Send className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-base font-semibold text-slate-800">
              No hay productos que coincidan con el filtro seleccionado
            </p>
          </div>
        ) : (
          filteredRows.map((row) => {
            const { item } = row;
            const selectedLinkOption = selectedLinkIdByItem[item.id] || 'CUSTOM';
            const isCustomLink =
              selectedLinkOption === 'CUSTOM' || row.availableLinks.length === 0;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-5 transition-colors ${
                  !row.canDeliver
                    ? 'border-slate-200 bg-slate-50/60'
                    : item.delivery_status === 'ENTREGADO'
                    ? 'border-emerald-200'
                    : 'border-blue-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Información del Pedido, Cliente y Producto */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-900 text-white">
                        {row.orderCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {row.buyerName}
                      </span>
                      <span className="text-xs text-slate-500">
                        • WhatsApp: +{row.buyerPhone}
                      </span>
                      {row.canDeliver ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                          <Unlock className="w-3.5 h-3.5" />
                          100% PAGADO_TOTAL ({formatCurrencyPEN(item.final_item_price_pen)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900">
                          <Lock className="w-3.5 h-3.5" />
                          ENTREGA BLOQUEADA
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {item.product_name_snapshot}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({item.product_version_snapshot})
                      </span>
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Precio Neto Ítem: <strong>{formatCurrencyPEN(item.final_item_price_pen)}</strong>
                      </span>
                      <span>
                        Pago Verificado Asignado:{' '}
                        <strong className="text-emerald-700">
                          {formatCurrencyPEN(item.allocated_paid_pen)}
                        </strong>
                      </span>
                      <span>
                        Saldo Pendiente Ítem:{' '}
                        <strong
                          className={
                            item.item_balance_due_pen > 0 ? 'text-rose-700' : 'text-slate-500'
                          }
                        >
                          {formatCurrencyPEN(item.item_balance_due_pen)}
                        </strong>
                      </span>
                    </div>

                    {row.existingDelivery && (
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong>Entregado el:</strong>{' '}
                          {row.existingDelivery.delivered_at
                            ? new Date(row.existingDelivery.delivered_at).toLocaleString('es-PE')
                            : 'Registrado'}{' '}
                          • <strong>Enlace enviado:</strong>{' '}
                          <span className="font-mono underline">
                            {row.existingDelivery.custom_link_url}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controles de Selección de Enlace y Botón de Despacho o Bloqueo */}
                  <div className="w-full lg:w-[440px] shrink-0">
                    {!row.canDeliver ? (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                        <div className="flex items-start gap-2 text-xs text-amber-900 font-semibold">
                          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <span>{row.lockReason}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-amber-800">
                            Regla: Prohibido entregar ítems sin cobertura del 100%.
                          </span>
                          <Link
                            to={`/admin/payments?order=${row.orderCode}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800"
                          >
                            <CreditCard className="w-3 h-3" />
                            Verificar / Asignar Pago
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                            Repositorio Privado (Google Drive / MediaFire)
                          </label>
                          <select
                            value={selectedLinkOption}
                            onChange={(e) =>
                              setSelectedLinkIdByItem((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium text-slate-800"
                          >
                            {row.availableLinks.map((lnk) => (
                              <option key={lnk.id} value={lnk.id}>
                                [{lnk.link_type}] {lnk.instructions || item.product_version_snapshot} —{' '}
                                {lnk.access_url}
                              </option>
                            ))}
                            <option value="CUSTOM">
                              Enlace privado personalizado (Google Drive / MediaFire)...
                            </option>
                          </select>
                        </div>

                        {isCustomLink && (
                          <div className="relative">
                            <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="url"
                              value={customUrlByItem[item.id] || ''}
                              onChange={(e) =>
                                setCustomUrlByItem((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              placeholder="https://drive.google.com/..."
                              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={dispatchingItemId === item.id}
                          onClick={() => handleDispatchWhatsApp(row)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {dispatchingItemId === item.id
                            ? 'Generando Entrega...'
                            : item.delivery_status === 'ENTREGADO'
                            ? 'Reenviar Enlace por WhatsApp y Actualizar'
                            : 'Despachar Enlace por WhatsApp (Marcar ENTREGADO)'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
