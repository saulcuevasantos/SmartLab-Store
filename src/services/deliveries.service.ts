/**
 * SmartLab Store — Servicio de Entrega Individual de Productos Digitales por WhatsApp
 * docs/08_PLAN_SPRINTS.md (Sprint 09) y docs/05_PEDIDOS_PAGOS.md (Sección 4)
 *
 * Reglas de negocio críticas:
 * 1. La entrega se gestiona de forma independiente por cada ítem del pedido (order_item).
 * 2. BLOQUEO ESTRICTO: Jamás se puede despachar ni habilitar un enlace de descarga si el ítem no tiene
 *    su pago 100% cubierto y verificado (is_fully_paid === true y payment_status === 'PAGADO_TOTAL').
 * 3. Al despachar por WhatsApp, se selecciona el enlace privado de Google Drive o MediaFire del producto
 *    (o un enlace personalizado para ese ítem), se registra fecha/hora, usuario administrador, mensaje enviado
 *    y el estado del ítem pasa a ENTREGADO.
 * 4. Cuando todos los ítems de un pedido alcanzan el estado ENTREGADO y el saldo es S/ 0.00,
 *    el pedido pasa automáticamente a COMPLETADO.
 */

import { Delivery, OrderItem, OrderStatus } from '../types/order.types';
import { DownloadLink } from '../types/catalog.types';
import { buildDeliveryWhatsAppUrl } from '../utils/whatsapp';
import { loadAdminDownloadLinksMap } from './admin.service';
import {
  ensureDemoOrdersAndPaymentsSeeded,
  getAllAdminOrders,
  loadAdminLocalAllocations,
  loadAdminLocalDeliveries,
  loadAdminLocalOrders,
  loadAdminLocalPayments,
  recalculateOrderFinancialsAndStatuses,
  saveAdminLocalDeliveries,
  saveAdminLocalOrders,
} from './payments.service';

export interface DeliverableOrderItemRow {
  orderId: string;
  orderCode: string;
  orderStatus: OrderStatus;
  orderCreatedAt: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  item: OrderItem;
  availableLinks: DownloadLink[];
  existingDelivery: Delivery | null;
  canDeliver: boolean;
  lockReason: string | null;
}

export interface DispatchItemWhatsAppInput {
  orderId: string;
  orderItemId: string;
  downloadLinkId?: string | null;
  customLinkUrl?: string | null;
  adminUserId?: string;
}

export interface DispatchItemWhatsAppResult {
  delivery: Delivery | null;
  whatsappUrl: string | null;
  error: string | null;
}

/**
 * Obtiene todos los ítems de pedidos junto con su estado de elegibilidad para entrega por WhatsApp,
 * enlaces privados configurados (Google Drive / MediaFire) y registro histórico de entrega.
 */
export async function getAdminDeliverableItems(): Promise<DeliverableOrderItemRow[]> {
  ensureDemoOrdersAndPaymentsSeeded();

  const allOrders = await getAllAdminOrders();
  const linksMap = loadAdminDownloadLinksMap();
  const deliveries = loadAdminLocalDeliveries();

  const rows: DeliverableOrderItemRow[] = [];

  for (const order of allOrders) {
    for (const item of order.items || []) {
      const productLinks = (linksMap[item.product_id] || []).filter((l) => l.is_active);
      const existingDelivery =
        deliveries.find((d) => d.order_item_id === item.id) || item.delivery || null;

      let canDeliver = false;
      let lockReason: string | null = null;

      if (order.status === 'CANCELADO' || order.status === 'REEMBOLSADO') {
        canDeliver = false;
        lockReason = `Pedido en estado ${order.status} (Entregas bloqueadas)`;
      } else if (existingDelivery?.is_revoked || item.delivery_status === 'REVOCADO') {
        canDeliver = false;
        lockReason = 'Entrega revocada administrativamente';
      } else if (!item.is_fully_paid || item.payment_status !== 'PAGADO_TOTAL') {
        canDeliver = false;
        lockReason = `Bloqueado: Falta verificar S/ ${item.item_balance_due_pen.toFixed(2)} para cubrir el 100% de este producto`;
      } else {
        canDeliver = true;
        lockReason = null;
      }

      rows.push({
        orderId: order.id,
        orderCode: order.order_code,
        orderStatus: order.status,
        orderCreatedAt: order.created_at,
        buyerName: order.buyer_name,
        buyerEmail: order.buyer_email,
        buyerPhone: order.buyer_phone,
        item,
        availableLinks: productLinks,
        existingDelivery,
        canDeliver,
        lockReason,
      });
    }
  }

  return rows;
}

/**
 * Registra la entrega individual de un producto 100% pagado y construye la URL oficial de WhatsApp
 * con el enlace privado de Google Drive o MediaFire listo para enviar al cliente.
 */
export async function dispatchProductViaWhatsApp(
  input: DispatchItemWhatsAppInput
): Promise<DispatchItemWhatsAppResult> {
  ensureDemoOrdersAndPaymentsSeeded();

  const orders = loadAdminLocalOrders();
  const targetOrder = orders.find((o) => o.id === input.orderId);
  if (!targetOrder) {
    return { delivery: null, whatsappUrl: null, error: 'No se encontró el pedido indicado.' };
  }

  if (targetOrder.status === 'CANCELADO' || targetOrder.status === 'REEMBOLSADO') {
    return {
      delivery: null,
      whatsappUrl: null,
      error: `No se pueden despachar productos de un pedido en estado ${targetOrder.status}.`,
    };
  }

  const targetItem = (targetOrder.items || []).find((i) => i.id === input.orderItemId);
  if (!targetItem) {
    return {
      delivery: null,
      whatsappUrl: null,
      error: 'No se encontró el producto dentro del pedido.',
    };
  }

  // BLOQUEO ESTRICTO DE SEGURIDAD Y REGLA DE NEGOCIO
  if (!targetItem.is_fully_paid || targetItem.payment_status !== 'PAGADO_TOTAL') {
    return {
      delivery: null,
      whatsappUrl: null,
      error: `Entrega bloqueada: El producto "${targetItem.product_name_snapshot}" aún tiene un saldo pendiente de S/ ${targetItem.item_balance_due_pen.toFixed(2)}. Debe estar 100% pagado y verificado antes de habilitar su enlace.`,
    };
  }

  const linksMap = loadAdminDownloadLinksMap();
  const productLinks = linksMap[targetItem.product_id] || [];
  let selectedUrl = input.customLinkUrl?.trim() || '';
  let resolvedLinkId: string | null = null;

  if (input.downloadLinkId) {
    const foundLink = productLinks.find((l) => l.id === input.downloadLinkId);
    if (foundLink) {
      selectedUrl = foundLink.access_url;
      resolvedLinkId = foundLink.id;
    }
  }

  if (!selectedUrl && productLinks.length > 0) {
    const primaryLink = productLinks.find((l) => l.is_active) || productLinks[0];
    selectedUrl = primaryLink.access_url;
    resolvedLinkId = primaryLink.id;
  }

  if (!selectedUrl || !/^https?:\/\//i.test(selectedUrl)) {
    return {
      delivery: null,
      whatsappUrl: null,
      error:
        'Selecciona un enlace activo de Google Drive / MediaFire o ingresa una URL válida (https://...) para despachar el producto.',
    };
  }

  const whatsappUrl = buildDeliveryWhatsAppUrl({
    buyerPhone: targetOrder.buyer_phone,
    buyerName: targetOrder.buyer_name,
    orderCode: targetOrder.order_code,
    productName: targetItem.product_name_snapshot,
    version: targetItem.product_version_snapshot || 'v1.0',
    downloadLink: selectedUrl,
  });

  const decodedMessageSummary = [
    `Pedido: ${targetOrder.order_code}`,
    `Producto: ${targetItem.product_name_snapshot} (${targetItem.product_version_snapshot || 'v1.0'})`,
    `Enlace enviado: ${selectedUrl}`,
  ].join(' | ');

  const nowIso = new Date().toISOString();
  const deliveries = loadAdminLocalDeliveries();
  const existingIdx = deliveries.findIndex((d) => d.order_item_id === targetItem.id);

  const deliveryRecord: Delivery = {
    id:
      existingIdx >= 0
        ? deliveries[existingIdx].id
        : `deliv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    order_item_id: targetItem.id,
    download_link_id: resolvedLinkId,
    custom_link_url: resolvedLinkId ? selectedUrl : selectedUrl,
    delivered_via: 'WHATSAPP',
    delivered_at: nowIso,
    whatsapp_message_sent: decodedMessageSummary,
    delivery_status: 'ENTREGADO',
    delivered_by: input.adminUserId || 'admin-smartlab',
    is_revoked: false,
    revocation_reason: null,
    created_at: existingIdx >= 0 ? deliveries[existingIdx].created_at : nowIso,
    updated_at: nowIso,
  };

  const updatedDeliveries =
    existingIdx >= 0
      ? deliveries.map((d, idx) => (idx === existingIdx ? deliveryRecord : d))
      : [deliveryRecord, ...deliveries];

  saveAdminLocalDeliveries(updatedDeliveries);

  // Actualizar estado del ítem a ENTREGADO y recalcular si el pedido pasa a COMPLETADO
  const payments = loadAdminLocalPayments();
  const allocations = loadAdminLocalAllocations();
  const orderPayments = payments.filter((p) => p.order_id === targetOrder.id);

  const orderWithDeliveredItem = {
    ...targetOrder,
    items: (targetOrder.items || []).map((i) =>
      i.id === targetItem.id
        ? {
            ...i,
            delivery_status: 'ENTREGADO' as const,
            delivery: deliveryRecord,
            updated_at: nowIso,
          }
        : i
    ),
  };

  const recalculatedOrder = recalculateOrderFinancialsAndStatuses(
    orderWithDeliveredItem,
    orderPayments,
    allocations,
    updatedDeliveries
  );

  saveAdminLocalOrders(
    orders.map((o) => (o.id === recalculatedOrder.id ? recalculatedOrder : o))
  );

  // Registrar evento en bitácora inmutable de auditoría (audit_logs)
  try {
    const rawLogs = localStorage.getItem('smartlab_audit_logs_v1');
    const existingLogs = rawLogs ? JSON.parse(rawLogs) : [];
    const auditEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      user_id: input.adminUserId || 'admin-smartlab',
      actor_name: 'Administrador SmartLab',
      entity_type: 'DELIVERY',
      entity_id: deliveryRecord.id,
      entity_label: `${targetOrder.order_code} (${targetItem.product_name_snapshot})`,
      action: 'SEND_LINK_WHATSAPP',
      summary: `Enlace individual despachado por WhatsApp (${targetOrder.buyer_phone}) para "${targetItem.product_name_snapshot}" (100% pagado). Estado del ítem: ENTREGADO.`,
      old_data: {
        delivery_status: targetItem.delivery_status,
      },
      new_data: {
        delivery_status: 'ENTREGADO',
        delivered_via: 'WHATSAPP',
        delivered_at: nowIso,
        order_status: recalculatedOrder.status,
      },
      ip_address: '190.236.14.88',
      created_at: nowIso,
    };
    localStorage.setItem(
      'smartlab_audit_logs_v1',
      JSON.stringify([auditEntry, ...(Array.isArray(existingLogs) ? existingLogs : [])])
    );
  } catch {
    // Continuar
  }

  return {
    delivery: deliveryRecord,
    whatsappUrl,
    error: null,
  };
}
