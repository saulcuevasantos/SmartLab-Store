/**
 * SmartLab Store — Servicio de Vencimientos (72h), Cancelaciones, Resoluciones, Reembolsos, Reportes y Auditoría
 * docs/08_PLAN_SPRINTS.md (Sprint 10), docs/04_BASE_DATOS.md, docs/05_PEDIDOS_PAGOS.md y docs/07_SEGURIDAD.md
 *
 * Reglas de negocio críticas del Sprint 10:
 * 1. VENCIMIENTO (72h configurables): Al pasar un pedido a VENCIDO, se conservan íntegramente sus pagos
 *    verificados (total_paid_verified_pen) y saldos asignados por producto (allocated_paid_pen).
 *    El administrador puede reactivar un pedido vencido extendiendo su plazo mediante resolución administrativa.
 * 2. CANCELACIÓN MANUAL: Bloquea automáticamente todas las entregas pendientes (REVOCADO / is_revoked = true)
 *    y exige registrar una Resolución Administrativa obligatoria en administrative_resolutions.
 * 3. REGLA ESTRICTA DE REEMBOLSOS:
 *    - Un producto cuyo enlace ya fue enviado (ENTREGADO / delivered_at IS NOT NULL) NO es reembolsable bajo ninguna circunstancia.
 *    - Solo los productos NO entregados que cuenten con saldo pagado verificado pueden evaluarse para reembolso.
 *    - Un reembolso solo pasa a COMPLETADO cuando se registra la devolución efectiva del dinero en S/
 *      (método Yape/Plin/Transferencia, cuenta o celular de destino, titular y número de operación).
 * 4. BITÁCORA INMUTABLE (audit_logs): Toda acción crítica queda registrada con snapshot old_data y new_data.
 */

import {
  Delivery,
  ItemDeliveryStatus,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from '../types/order.types';
import { getCheckoutStoreSettings, OrderWithDetails } from './orders.service';
import {
  ensureDemoOrdersAndPaymentsSeeded,
  getAllAdminOrders,
  loadAdminLocalAllocations,
  loadAdminLocalDeliveries,
  loadAdminLocalOrders,
  loadAdminLocalPayments,
  saveAdminLocalDeliveries,
  saveAdminLocalOrders,
} from './payments.service';

const LOCAL_RESOLUTIONS_KEY = 'smartlab_admin_resolutions_v1';
const LOCAL_CANCELLATIONS_KEY = 'smartlab_order_cancellations_v1';
const LOCAL_REFUNDS_KEY = 'smartlab_order_refunds_v1';
const LOCAL_AUDIT_LOGS_KEY = 'smartlab_audit_logs_v1';
const LOCAL_SPRINT10_SEEDED_KEY = 'smartlab_sprint10_seeded_v1';

export type ResolutionType =
  | 'CANCELACION_MANUAL'
  | 'EVALUACION_REEMBOLSO'
  | 'REACTIVACION_PEDIDO_VENCIDO'
  | 'REASIGNACION_ENLACE'
  | 'REVOCACION_ENTREGA_PENDIENTE'
  | 'RESOLUCION_OBSERVACION';

export type CancellationType =
  | 'CLIENTE_SOLICITUD'
  | 'COMPROBANTE_INVALIDO'
  | 'ACUERDO_ADMINISTRATIVO'
  | 'OTRO';

export type RefundStatusType =
  | 'EN_EVALUACION'
  | 'APROBADO_PENDIENTE_DEVOLUCION'
  | 'COMPLETADO'
  | 'RECHAZADO';

export type AuditEntityType =
  | 'PRODUCT'
  | 'ORDER'
  | 'PAYMENT'
  | 'ALLOCATION'
  | 'DELIVERY'
  | 'CANCELLATION'
  | 'RESOLUTION'
  | 'REFUND'
  | 'COUPON'
  | 'CONFIG';

export type AuditActionType =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'VERIFY_PAYMENT'
  | 'ALLOCATE_PAYMENT'
  | 'SEND_LINK_WHATSAPP'
  | 'REVOKE_DELIVERY'
  | 'CANCEL_ORDER'
  | 'COMPLETE_REFUND';

export interface AdministrativeResolutionRecord {
  id: string;
  order_id: string;
  order_code: string;
  buyer_name: string;
  admin_user_id: string;
  admin_name: string;
  resolution_type: ResolutionType;
  decision_summary: string;
  notes: string;
  resolved_at: string;
}

export interface OrderCancellationRecord {
  id: string;
  order_id: string;
  order_code: string;
  buyer_name: string;
  buyer_phone: string;
  resolution_id: string;
  decision_summary: string;
  cancelled_by_user_id: string;
  cancellation_reason: string;
  cancellation_type: CancellationType;
  pending_deliveries_blocked: boolean;
  revoked_items_count: number;
  preserved_paid_pen: number;
  cancelled_at: string;
}

export interface RefundRecord {
  id: string;
  order_id: string;
  order_code: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  order_item_id: string;
  product_name_snapshot: string;
  product_version_snapshot: string;
  item_delivery_status_at_request: ItemDeliveryStatus;
  payment_id: string;
  resolution_id: string;
  decision_summary: string;
  refund_status: RefundStatusType;
  refund_amount_pen: number;
  refund_method: PaymentMethod | null;
  destination_account: string | null;
  destination_holder_name: string | null;
  operation_reference: string | null;
  receipt_storage_path: string | null;
  processed_by_user_id: string | null;
  reason: string;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  actor_name: string;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_label: string;
  action: AuditActionType;
  summary: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface CommercialReportsSummary {
  totalOrdersCount: number;
  verifiedRevenueGrossPen: number;
  completedRefundsTotalPen: number;
  netRetainedRevenuePen: number;
  pendingBalanceInPartialOrdersPen: number;
  preservedPaidInExpiredOrdersPen: number;
  pendingBalanceInExpiredOrdersPen: number;
  expiredOrdersCount: number;
  cancelledOrdersCount: number;
  refundedOrdersCount: number;
  deliveredItemsCount: number;
  pendingDeliveriesReadyCount: number;
  revenueByMethod: Array<{
    method: PaymentMethod;
    verifiedCount: number;
    totalVerifiedPen: number;
    sharePercent: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    modalidad: string;
    ordersCount: number;
    deliveredCount: number;
    allocatedRevenuePen: number;
  }>;
  expiredOrdersWithBalances: Array<{
    orderId: string;
    orderCode: string;
    buyerName: string;
    buyerPhone: string;
    totalNetPen: number;
    preservedPaidPen: number;
    pendingBalancePen: number;
    expiresAt: string;
  }>;
}

function loadLocalResolutions(): AdministrativeResolutionRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_RESOLUTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalResolutions(records: AdministrativeResolutionRecord[]): void {
  try {
    localStorage.setItem(LOCAL_RESOLUTIONS_KEY, JSON.stringify(records));
  } catch {
    // Ignorar error de cuota
  }
}

function loadLocalCancellations(): OrderCancellationRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_CANCELLATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalCancellations(records: OrderCancellationRecord[]): void {
  try {
    localStorage.setItem(LOCAL_CANCELLATIONS_KEY, JSON.stringify(records));
  } catch {
    // Ignorar error de cuota
  }
}

function loadLocalRefunds(): RefundRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_REFUNDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalRefunds(records: RefundRecord[]): void {
  try {
    localStorage.setItem(LOCAL_REFUNDS_KEY, JSON.stringify(records));
  } catch {
    // Ignorar error de cuota
  }
}

function loadLocalAuditLogs(): AuditLogRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAuditLogs(records: AuditLogRecord[]): void {
  try {
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(records));
  } catch {
    // Ignorar error de cuota
  }
}

/**
 * Registra un evento inmutable en la bitácora de auditoría (audit_logs).
 */
export function recordAuditLog(input: {
  userId?: string | null;
  actorName?: string;
  entityType: AuditEntityType;
  entityId: string;
  entityLabel: string;
  action: AuditActionType;
  summary: string;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}): AuditLogRecord {
  const existing = loadLocalAuditLogs();
  const entry: AuditLogRecord = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    user_id: input.userId || 'admin-smartlab',
    actor_name: input.actorName || 'Administrador SmartLab',
    entity_type: input.entityType,
    entity_id: input.entityId,
    entity_label: input.entityLabel,
    action: input.action,
    summary: input.summary,
    old_data: input.oldData || null,
    new_data: input.newData || null,
    ip_address: '190.236.14.88',
    created_at: new Date().toISOString(),
  };

  saveLocalAuditLogs([entry, ...existing]);
  return entry;
}

/**
 * Inicializa datos base de trazabilidad para el Sprint 10 (incluyendo un pedido vencido con abono parcial
 * preservado en S/ para demostrar la regla financiera de las 72 horas y eventos de auditoría).
 */
export function ensureSprint10SeedData(): void {
  ensureDemoOrdersAndPaymentsSeeded();

  if (localStorage.getItem(LOCAL_SPRINT10_SEEDED_KEY) === 'true') {
    return;
  }

  const orders = loadAdminLocalOrders();
  const payments = loadAdminLocalPayments();
  const allocations = loadAdminLocalAllocations();

  const now = Date.now();
  const fourDaysAgoIso = new Date(now - 96 * 3600 * 1000).toISOString();
  const oneDayAgoIso = new Date(now - 24 * 3600 * 1000).toISOString();
  const twoHoursAgoIso = new Date(now - 2 * 3600 * 1000).toISOString();

  // Verificar si ya existe el pedido vencido demostrativo SL-2026-000103
  const expiredOrderId = 'ord-demo-s10-expired';
  const expiredItem1Id = 'item-demo-s10-exp-1';
  const expiredItem2Id = 'item-demo-s10-exp-2';
  const expiredPaymentId = 'pay-demo-s10-exp-1';

  if (!orders.some((o) => o.id === expiredOrderId)) {
    const expiredOrder: Order = {
      id: expiredOrderId,
      order_code: 'SL-2026-000103',
      customer_id: 'cust-demo-s10-03',
      buyer_name: 'Ing. Roberto Quispe Huamán',
      buyer_email: 'rquispe@constructora-andina.pe',
      buyer_phone: '51954882190',
      buyer_document_type: 'RUC',
      buyer_document_number: '20608841291',
      payment_method_selected: 'PLIN',
      notes: 'Pedido con abono inicial parcial que superó las 72 horas sin perder su saldo histórico.',
      subtotal_pen: 190.0,
      discount_pen: 0.0,
      total_net_pen: 190.0,
      total_paid_verified_pen: 70.0,
      balance_due_pen: 120.0,
      status: 'VENCIDO',
      expires_at: oneDayAgoIso,
      created_at: fourDaysAgoIso,
      updated_at: oneDayAgoIso,
      items: [
        {
          id: expiredItem1Id,
          order_id: expiredOrderId,
          product_id: 'prod-excel-valorizaciones',
          product_name_snapshot: 'Plantilla PRO de Valorizaciones y Curva S de Obra',
          product_version_snapshot: 'v3.4.0',
          product_modalidad_snapshot: 'PRO',
          unit_price_pen: 120.0,
          discount_applied_pen: 0.0,
          final_item_price_pen: 120.0,
          allocated_paid_pen: 70.0,
          item_balance_due_pen: 50.0,
          is_fully_paid: false,
          payment_status: 'PAGO_PARCIAL',
          delivery_status: 'PENDIENTE',
          created_at: fourDaysAgoIso,
          updated_at: oneDayAgoIso,
        },
        {
          id: expiredItem2Id,
          order_id: expiredOrderId,
          product_id: 'prod-sheets-kardex',
          product_name_snapshot: 'Sistema Kardex Multi-Almacén en Google Sheets',
          product_version_snapshot: 'v2.1.0',
          product_modalidad_snapshot: 'PRO',
          unit_price_pen: 70.0,
          discount_applied_pen: 0.0,
          final_item_price_pen: 70.0,
          allocated_paid_pen: 0.0,
          item_balance_due_pen: 70.0,
          is_fully_paid: false,
          payment_status: 'SIN_PAGO',
          delivery_status: 'PENDIENTE',
          created_at: fourDaysAgoIso,
          updated_at: oneDayAgoIso,
        },
      ],
    };

    saveAdminLocalOrders([expiredOrder, ...orders]);

    payments.push({
      id: expiredPaymentId,
      order_id: expiredOrderId,
      payment_method: 'PLIN',
      operation_number: 'PLIN-3094812',
      origin_phone: '954 882 190',
      bank_name: 'BBVA - Plin',
      receipt_image_path: 'receipts/demo-plin-3094812.png',
      receipt_image_url:
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      amount_reported_pen: 70.0,
      amount_verified_pen: 70.0,
      verification_status: 'VERIFICADO',
      verified_by: 'admin-smartlab',
      verified_at: fourDaysAgoIso,
      rejection_reason: null,
      created_at: fourDaysAgoIso,
      updated_at: fourDaysAgoIso,
    });
    saveLocalPaymentsDirect(payments);

    allocations.push({
      id: 'alloc-demo-s10-exp-1',
      payment_id: expiredPaymentId,
      order_item_id: expiredItem1Id,
      amount_allocated_pen: 70.0,
      created_at: fourDaysAgoIso,
    });
    localStorage.setItem('smartlab_payment_allocations_v1', JSON.stringify(allocations));
  }

  const existingLogs = loadLocalAuditLogs();
  if (existingLogs.length === 0) {
    const initialLogs: AuditLogRecord[] = [
      {
        id: 'audit-seed-001',
        user_id: 'admin-smartlab',
        actor_name: 'Administrador SmartLab',
        entity_type: 'PAYMENT',
        entity_id: 'pay-demo-s09-02',
        entity_label: 'SL-2026-000102 • Op. BCP-4901824',
        action: 'VERIFY_PAYMENT',
        summary:
          'Verificación manual de transferencia bancaria BCP por S/ 180.00 en pedido SL-2026-000102.',
        old_data: { verification_status: 'EN_REVISION', amount_verified_pen: 0 },
        new_data: {
          verification_status: 'VERIFICADO',
          amount_verified_pen: 180.0,
          operation_number: 'BCP-4901824',
        },
        ip_address: '190.236.14.88',
        created_at: twoHoursAgoIso,
      },
      {
        id: 'audit-seed-002',
        user_id: 'admin-smartlab',
        actor_name: 'Administrador SmartLab',
        entity_type: 'ALLOCATION',
        entity_id: 'alloc-demo-s09-02a',
        entity_label: 'SL-2026-000102 • Asignación por Producto',
        action: 'ALLOCATE_PAYMENT',
        summary:
          'Asignación de S/ 140.00 (100% cubierto -> LISTO_ENTREGA) al ítem 1 y S/ 40.00 (PAGO_PARCIAL) al ítem 2.',
        old_data: { item_1_allocated_pen: 0, item_2_allocated_pen: 0 },
        new_data: {
          item_1_allocated_pen: 140.0,
          item_1_is_fully_paid: true,
          item_2_allocated_pen: 40.0,
          item_2_is_fully_paid: false,
        },
        ip_address: '190.236.14.88',
        created_at: twoHoursAgoIso,
      },
      {
        id: 'audit-seed-003',
        user_id: 'admin-smartlab',
        actor_name: 'Sistema / Trigger 72h',
        entity_type: 'ORDER',
        entity_id: expiredOrderId,
        entity_label: 'SL-2026-000103 • Vencimiento 72h',
        action: 'UPDATE',
        summary:
          'Transición a estado VENCIDO tras superar las 72 horas configuradas, preservando intacto el abono verificado de S/ 70.00.',
        old_data: {
          status: 'PAGO_PARCIAL',
          total_paid_verified_pen: 70.0,
          balance_due_pen: 120.0,
        },
        new_data: {
          status: 'VENCIDO',
          total_paid_verified_pen: 70.0,
          balance_due_pen: 120.0,
          historical_balances_preserved: true,
        },
        ip_address: '127.0.0.1',
        created_at: oneDayAgoIso,
      },
    ];
    saveLocalAuditLogs(initialLogs);
  }

  localStorage.setItem(LOCAL_SPRINT10_SEEDED_KEY, 'true');
}

function saveLocalPaymentsDirect(payments: unknown[]): void {
  try {
    localStorage.setItem('smartlab_payments_v1', JSON.stringify(payments));
  } catch {
    // Ignorar
  }
}

export async function getAdministrativeResolutions(): Promise<AdministrativeResolutionRecord[]> {
  ensureSprint10SeedData();
  return loadLocalResolutions().sort(
    (a, b) => new Date(b.resolved_at).getTime() - new Date(a.resolved_at).getTime()
  );
}

export async function getOrderCancellations(): Promise<OrderCancellationRecord[]> {
  ensureSprint10SeedData();
  return loadLocalCancellations().sort(
    (a, b) => new Date(b.cancelled_at).getTime() - new Date(a.cancelled_at).getTime()
  );
}

export async function getAllAdminRefunds(): Promise<RefundRecord[]> {
  ensureSprint10SeedData();
  return loadLocalRefunds().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getAuditLogs(filters?: {
  entityType?: string;
  action?: string;
  search?: string;
}): Promise<AuditLogRecord[]> {
  ensureSprint10SeedData();
  const all = loadLocalAuditLogs().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (!filters) return all;

  return all.filter((log) => {
    if (filters.entityType && filters.entityType !== 'ALL' && log.entity_type !== filters.entityType) {
      return false;
    }
    if (filters.action && filters.action !== 'ALL' && log.action !== filters.action) {
      return false;
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const matchLabel = log.entity_label.toLowerCase().includes(q);
      const matchSummary = log.summary.toLowerCase().includes(q);
      const matchActor = log.actor_name.toLowerCase().includes(q);
      const matchId = log.entity_id.toLowerCase().includes(q);
      if (!matchLabel && !matchSummary && !matchActor && !matchId) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Marca administrativamente un pedido como VENCIDO cuando ha expirado su plazo,
 * garantizando que NO se elimine ningún pago ni se altere ningún saldo histórico.
 */
export async function markOrderAsExpiredAdmin(input: {
  orderId: string;
  decisionSummary?: string;
  notes?: string;
  adminUserId?: string;
  adminName?: string;
}): Promise<{ order: OrderWithDetails | null; error: string | null }> {
  ensureSprint10SeedData();
  const orders = loadAdminLocalOrders();
  const target = orders.find((o) => o.id === input.orderId);

  if (!target) {
    return { order: null, error: 'No se encontró el pedido especificado.' };
  }

  if (target.status === 'COMPLETADO' || target.status === 'CANCELADO' || target.status === 'REEMBOLSADO') {
    return {
      order: null,
      error: `No se puede marcar como VENCIDO un pedido que ya se encuentra en estado ${target.status}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const previousStatus = target.status;
  const pastIso = new Date(Date.now() - 60 * 1000).toISOString();

  // Regla de negocio: total_paid_verified_pen, balance_due_pen y allocated_paid_pen de cada ítem permanecen INALTERADOS
  const updatedOrder: Order = {
    ...target,
    status: 'VENCIDO',
    expires_at: new Date(target.expires_at).getTime() > Date.now() ? pastIso : target.expires_at,
    updated_at: nowIso,
  };

  saveAdminLocalOrders(orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));

  const resolution: AdministrativeResolutionRecord = {
    id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    order_id: target.id,
    order_code: target.order_code,
    buyer_name: target.buyer_name,
    admin_user_id: input.adminUserId || 'admin-smartlab',
    admin_name: input.adminName || 'Administrador SmartLab',
    resolution_type: 'RESOLUCION_OBSERVACION',
    decision_summary:
      input.decisionSummary?.trim() ||
      `Cierre de plazo de 72h -> Estado VENCIDO (Abono preservado: S/ ${target.total_paid_verified_pen.toFixed(2)})`,
    notes:
      input.notes?.trim() ||
      `El pedido pasó a estado VENCIDO conservando íntegramente sus pagos verificados (S/ ${target.total_paid_verified_pen.toFixed(2)}) y saldos pendientes (S/ ${target.balance_due_pen.toFixed(2)}).`,
    resolved_at: nowIso,
  };

  saveLocalResolutions([resolution, ...loadLocalResolutions()]);

  recordAuditLog({
    userId: input.adminUserId,
    actorName: input.adminName,
    entityType: 'ORDER',
    entityId: target.id,
    entityLabel: `${target.order_code} • Vencimiento`,
    action: 'UPDATE',
    summary: `Pedido ${target.order_code} marcado como VENCIDO conservando intacto su saldo pagado verificado de S/ ${target.total_paid_verified_pen.toFixed(2)}.`,
    oldData: {
      status: previousStatus,
      total_paid_verified_pen: target.total_paid_verified_pen,
      balance_due_pen: target.balance_due_pen,
    },
    newData: {
      status: 'VENCIDO',
      total_paid_verified_pen: updatedOrder.total_paid_verified_pen,
      balance_due_pen: updatedOrder.balance_due_pen,
      historical_balances_preserved: true,
    },
  });

  const refreshed = (await getAllAdminOrders()).find((o) => o.id === target.id) || null;
  return { order: refreshed, error: null };
}

/**
 * Reactiva un pedido en estado VENCIDO otorgando un nuevo plazo (por defecto las 72h configuradas
 * en store_settings) mediante una Resolución Administrativa obligatoria, conservando todos sus abonos previos.
 */
export async function reactivateExpiredOrderAdmin(input: {
  orderId: string;
  extensionHours?: number;
  decisionSummary: string;
  notes: string;
  adminUserId?: string;
  adminName?: string;
}): Promise<{ order: OrderWithDetails | null; error: string | null }> {
  ensureSprint10SeedData();
  const orders = loadAdminLocalOrders();
  const target = orders.find((o) => o.id === input.orderId);

  if (!target) {
    return { order: null, error: 'No se encontró el pedido especificado.' };
  }

  if (target.status !== 'VENCIDO') {
    return { order: null, error: 'Solo los pedidos en estado VENCIDO requieren reactivación de plazo.' };
  }

  if (!input.decisionSummary.trim() || !input.notes.trim()) {
    return {
      order: null,
      error: 'Debes registrar el resumen y sustento de la resolución administrativa para reactivar el pedido vencido.',
    };
  }

  const settings = await getCheckoutStoreSettings();
  const hoursToAdd = Math.max(1, Number(input.extensionHours || settings.orderExpirationHours || 72));
  const nowIso = new Date().toISOString();
  const newExpiresAtIso = new Date(Date.now() + hoursToAdd * 3600 * 1000).toISOString();

  // Determinar el estado activo según sus pagos verificados conservados
  const nextActiveStatus: OrderStatus =
    target.total_paid_verified_pen >= target.total_net_pen
      ? 'PAGO_VERIFICADO'
      : target.total_paid_verified_pen > 0
      ? 'PAGO_PARCIAL'
      : 'PENDIENTE_PAGO';

  const reactivatedOrder: Order = {
    ...target,
    status: nextActiveStatus,
    expires_at: newExpiresAtIso,
    updated_at: nowIso,
  };

  saveAdminLocalOrders(orders.map((o) => (o.id === reactivatedOrder.id ? reactivatedOrder : o)));

  const resolution: AdministrativeResolutionRecord = {
    id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    order_id: target.id,
    order_code: target.order_code,
    buyer_name: target.buyer_name,
    admin_user_id: input.adminUserId || 'admin-smartlab',
    admin_name: input.adminName || 'Administrador SmartLab',
    resolution_type: 'REACTIVACION_PEDIDO_VENCIDO',
    decision_summary: input.decisionSummary.trim(),
    notes: `${input.notes.trim()} (Nuevo plazo otorgado: +${hoursToAdd} horas; abono histórico conservado: S/ ${target.total_paid_verified_pen.toFixed(2)}).`,
    resolved_at: nowIso,
  };

  saveLocalResolutions([resolution, ...loadLocalResolutions()]);

  recordAuditLog({
    userId: input.adminUserId,
    actorName: input.adminName,
    entityType: 'RESOLUTION',
    entityId: resolution.id,
    entityLabel: `${target.order_code} • Reactivación (+${hoursToAdd}h)`,
    action: 'UPDATE',
    summary: `Pedido vencido ${target.order_code} reactivado a ${nextActiveStatus} por +${hoursToAdd}h conservando S/ ${target.total_paid_verified_pen.toFixed(2)} abonados.`,
    oldData: {
      status: 'VENCIDO',
      expires_at: target.expires_at,
      total_paid_verified_pen: target.total_paid_verified_pen,
    },
    newData: {
      status: nextActiveStatus,
      expires_at: newExpiresAtIso,
      total_paid_verified_pen: reactivatedOrder.total_paid_verified_pen,
      resolution_id: resolution.id,
    },
  });

  const refreshed = (await getAllAdminOrders()).find((o) => o.id === target.id) || null;
  return { order: refreshed, error: null };
}

/**
 * Ejecuta la Cancelación Manual de un pedido:
 * 1. Exige obligatoriamente una Resolución Administrativa en administrative_resolutions.
 * 2. Bloquea y revoca de inmediato todas las entregas pendientes (ítems que NO estén en estado ENTREGADO).
 * 3. Conserva intactos los registros históricos de pagos y asignaciones.
 * 4. Registra la cancelación en order_cancellations y en la bitácora inmutable audit_logs.
 */
export async function cancelOrderManuallyAdmin(input: {
  orderId: string;
  cancellationType: CancellationType;
  cancellationReason: string;
  decisionSummary: string;
  resolutionNotes: string;
  adminUserId?: string;
  adminName?: string;
}): Promise<{
  order: OrderWithDetails | null;
  cancellation: OrderCancellationRecord | null;
  resolution: AdministrativeResolutionRecord | null;
  error: string | null;
}> {
  ensureSprint10SeedData();

  if (!input.decisionSummary.trim() || !input.resolutionNotes.trim()) {
    return {
      order: null,
      cancellation: null,
      resolution: null,
      error:
        'Toda cancelación manual exige registrar una resolución administrativa obligatoria (resumen de decisión y sustento detallado).',
    };
  }

  if (!input.cancellationReason.trim()) {
    return {
      order: null,
      cancellation: null,
      resolution: null,
      error: 'Debes indicar el motivo de la cancelación manual del pedido.',
    };
  }

  const orders = loadAdminLocalOrders();
  const targetOrder = orders.find((o) => o.id === input.orderId);

  if (!targetOrder) {
    return {
      order: null,
      cancellation: null,
      resolution: null,
      error: 'No se encontró el pedido que deseas cancelar.',
    };
  }

  if (targetOrder.status === 'CANCELADO') {
    return {
      order: null,
      cancellation: null,
      resolution: null,
      error: 'Este pedido ya se encuentra en estado CANCELADO.',
    };
  }

  const nowIso = new Date().toISOString();
  const deliveries = loadAdminLocalDeliveries();
  let revokedItemsCount = 0;

  // Bloquear/revocar todas las entregas pendientes de productos cuyo enlace aún no fue enviado
  const updatedItems: OrderItem[] = (targetOrder.items || []).map((item) => {
    const existingDelivery = deliveries.find((d) => d.order_item_id === item.id) || item.delivery;
    const alreadySent =
      item.delivery_status === 'ENTREGADO' || Boolean(existingDelivery?.delivered_at);

    if (alreadySent) {
      // Un producto ya entregado conserva su traza de ENTREGADO (y no es reembolsable)
      return item;
    }

    revokedItemsCount += 1;
    return {
      ...item,
      delivery_status: 'REVOCADO',
      updated_at: nowIso,
    };
  });

  // Actualizar o crear registros en deliveries para dejar constancia del bloqueo
  const updatedDeliveries: Delivery[] = [...deliveries];
  for (const item of updatedItems) {
    if (item.delivery_status === 'REVOCADO') {
      const idx = updatedDeliveries.findIndex((d) => d.order_item_id === item.id);
      if (idx >= 0) {
        updatedDeliveries[idx] = {
          ...updatedDeliveries[idx],
          delivery_status: 'REVOCADO',
          is_revoked: true,
          revocation_reason: `Cancelación manual del pedido: ${input.cancellationReason.trim()}`,
          updated_at: nowIso,
        };
      } else {
        updatedDeliveries.push({
          id: `deliv-rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          order_item_id: item.id,
          download_link_id: null,
          custom_link_url: null,
          delivered_via: 'WHATSAPP',
          delivered_at: null,
          whatsapp_message_sent: null,
          delivery_status: 'REVOCADO',
          delivered_by: null,
          is_revoked: true,
          revocation_reason: `Bloqueo automático por cancelación manual: ${input.cancellationReason.trim()}`,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }
    }
  }
  saveAdminLocalDeliveries(updatedDeliveries);

  // 1. Crear la Resolución Administrativa obligatoria
  const resolution: AdministrativeResolutionRecord = {
    id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    order_id: targetOrder.id,
    order_code: targetOrder.order_code,
    buyer_name: targetOrder.buyer_name,
    admin_user_id: input.adminUserId || 'admin-smartlab',
    admin_name: input.adminName || 'Administrador SmartLab',
    resolution_type: 'CANCELACION_MANUAL',
    decision_summary: input.decisionSummary.trim(),
    notes: input.resolutionNotes.trim(),
    resolved_at: nowIso,
  };
  saveLocalResolutions([resolution, ...loadLocalResolutions()]);

  // 2. Crear el registro de Cancelación Formal vinculado a la resolución
  const cancellation: OrderCancellationRecord = {
    id: `canc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    order_id: targetOrder.id,
    order_code: targetOrder.order_code,
    buyer_name: targetOrder.buyer_name,
    buyer_phone: targetOrder.buyer_phone,
    resolution_id: resolution.id,
    decision_summary: resolution.decision_summary,
    cancelled_by_user_id: input.adminUserId || 'admin-smartlab',
    cancellation_reason: input.cancellationReason.trim(),
    cancellation_type: input.cancellationType,
    pending_deliveries_blocked: true,
    revoked_items_count: revokedItemsCount,
    preserved_paid_pen: targetOrder.total_paid_verified_pen,
    cancelled_at: nowIso,
  };
  saveLocalCancellations([cancellation, ...loadLocalCancellations()]);

  // 3. Cambiar el estado del pedido a CANCELADO conservando intactos sus importes históricos
  const previousStatus = targetOrder.status;
  const cancelledOrder: Order = {
    ...targetOrder,
    status: 'CANCELADO',
    items: updatedItems,
    updated_at: nowIso,
  };
  saveAdminLocalOrders(orders.map((o) => (o.id === cancelledOrder.id ? cancelledOrder : o)));

  // 4. Registrar en la bitácora inmutable audit_logs
  recordAuditLog({
    userId: input.adminUserId,
    actorName: input.adminName,
    entityType: 'CANCELLATION',
    entityId: cancellation.id,
    entityLabel: `${targetOrder.order_code} • Cancelación Manual`,
    action: 'CANCEL_ORDER',
    summary: `Pedido ${targetOrder.order_code} cancelado manualmente (${input.cancellationType}). Entregas pendientes bloqueadas: ${revokedItemsCount}. Resolución: ${resolution.id}.`,
    oldData: {
      order_status: previousStatus,
      total_paid_verified_pen: targetOrder.total_paid_verified_pen,
    },
    newData: {
      order_status: 'CANCELADO',
      resolution_id: resolution.id,
      pending_deliveries_blocked: true,
      revoked_items_count: revokedItemsCount,
      cancellation_reason: cancellation.cancellation_reason,
    },
  });

  const refreshed = (await getAllAdminOrders()).find((o) => o.id === targetOrder.id) || null;
  return {
    order: refreshed,
    cancellation,
    resolution,
    error: null,
  };
}

/**
 * Calcula cuánto dinero ya ha sido reembolsado (o está en proceso activo) para un ítem de pedido.
 */
export function getRefundedAmountForItem(orderItemId: string): number {
  const refunds = loadLocalRefunds();
  return Number(
    refunds
      .filter((r) => r.order_item_id === orderItemId && r.refund_status !== 'RECHAZADO')
      .reduce((acc, r) => acc + Number(r.refund_amount_pen || 0), 0)
      .toFixed(2)
  );
}

/**
 * Registra o completa un reembolso para un producto NO entregado:
 *
 * VALIDACIONES DE SEGURIDAD Y NEGOCIO:
 * 1. Si el producto ya fue entregado (delivery_status === 'ENTREGADO' o delivered_at != null),
 *    RECHAZA la operación: "Un producto cuyo enlace ya fue enviado (ENTREGADO) no es reembolsable."
 * 2. El monto a reembolsar no puede superar el saldo pagado asignado disponible del producto.
 * 3. Exige resolución administrativa en administrative_resolutions.
 * 4. Solo puede marcarse como COMPLETADO si se registran los datos reales de la devolución efectiva
 *    del dinero (método Yape/Plin/Transferencia, cuenta de destino, titular y número de operación).
 */
export async function registerOrCompleteRefundAdmin(input: {
  orderId: string;
  orderItemId: string;
  refundAmountPen: number;
  refundStatus: 'EN_EVALUACION' | 'APROBADO_PENDIENTE_DEVOLUCION' | 'COMPLETADO';
  refundMethod?: PaymentMethod | null;
  destinationAccount?: string | null;
  destinationHolderName?: string | null;
  operationReference?: string | null;
  receiptStoragePath?: string | null;
  reason: string;
  decisionSummary: string;
  resolutionNotes: string;
  adminUserId?: string;
  adminName?: string;
}): Promise<{
  refund: RefundRecord | null;
  order: OrderWithDetails | null;
  error: string | null;
}> {
  ensureSprint10SeedData();

  const allOrders = await getAllAdminOrders();
  const targetOrder = allOrders.find((o) => o.id === input.orderId);
  if (!targetOrder) {
    return { refund: null, order: null, error: 'No se encontró el pedido especificado.' };
  }

  const targetItem = (targetOrder.items || []).find((i) => i.id === input.orderItemId);
  if (!targetItem) {
    return {
      refund: null,
      order: null,
      error: 'El producto indicado no pertenece al pedido seleccionado.',
    };
  }

  const deliveries = loadAdminLocalDeliveries();
  const itemDelivery =
    deliveries.find((d) => d.order_item_id === targetItem.id) || targetItem.delivery || null;

  // REGLA ESTRICTA #1: Bloqueo absoluto de reembolso si el enlace ya fue enviado (ENTREGADO)
  if (
    targetItem.delivery_status === 'ENTREGADO' ||
    Boolean(itemDelivery?.delivered_at) ||
    itemDelivery?.delivery_status === 'ENTREGADO'
  ) {
    return {
      refund: null,
      order: targetOrder,
      error:
        'Regla de negocio violada: Un producto cuyo enlace ya fue enviado (ENTREGADO) NO es reembolsable bajo ninguna circunstancia.',
    };
  }

  // REGLA ESTRICTA #2: Validar saldo pagado asignado al ítem
  const alreadyRefunded = getRefundedAmountForItem(targetItem.id);
  const maxRefundablePen = Number(
    Math.max(0, targetItem.allocated_paid_pen - alreadyRefunded).toFixed(2)
  );

  if (maxRefundablePen <= 0) {
    return {
      refund: null,
      order: targetOrder,
      error: `Este producto no tiene saldo pagado verificado disponible para reembolsar (Pagado asignado: S/ ${targetItem.allocated_paid_pen.toFixed(2)}, Reembolsado previo: S/ ${alreadyRefunded.toFixed(2)}).`,
    };
  }

  const requestedAmount = Number(Number(input.refundAmountPen || 0).toFixed(2));
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    return {
      refund: null,
      order: targetOrder,
      error: 'El monto a reembolsar debe ser mayor a S/ 0.00.',
    };
  }

  if (requestedAmount > maxRefundablePen + 0.001) {
    return {
      refund: null,
      order: targetOrder,
      error: `El monto a reembolsar (S/ ${requestedAmount.toFixed(2)}) no puede superar el saldo pagado asignado disponible del producto (S/ ${maxRefundablePen.toFixed(2)}).`,
    };
  }

  if (!input.decisionSummary.trim() || !input.resolutionNotes.trim() || !input.reason.trim()) {
    return {
      refund: null,
      order: targetOrder,
      error:
        'Todo reembolso exige registrar el motivo y la resolución administrativa que autoriza la devolución.',
    };
  }

  // REGLA ESTRICTA #3: Un reembolso solo pasa a COMPLETADO cuando se registra la devolución efectiva del dinero
  if (input.refundStatus === 'COMPLETADO') {
    if (
      !input.refundMethod ||
      !input.destinationAccount?.trim() ||
      !input.destinationHolderName?.trim() ||
      !input.operationReference?.trim()
    ) {
      return {
        refund: null,
        order: targetOrder,
        error:
          'Para marcar un reembolso como COMPLETADO es obligatorio registrar los datos de la devolución efectiva del dinero: método (Yape/Plin/Transferencia), cuenta o celular de destino, nombre del titular y número de operación.',
      };
    }
  }

  const verifiedPayment =
    (targetOrder.payments || []).find((p) => p.verification_status === 'VERIFICADO') ||
    (targetOrder.payments || [])[0];

  const nowIso = new Date().toISOString();

  // 1. Registrar la Resolución Administrativa obligatoria (EVALUACION_REEMBOLSO)
  const resolution: AdministrativeResolutionRecord = {
    id: `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    order_id: targetOrder.id,
    order_code: targetOrder.order_code,
    buyer_name: targetOrder.buyer_name,
    admin_user_id: input.adminUserId || 'admin-smartlab',
    admin_name: input.adminName || 'Administrador SmartLab',
    resolution_type: 'EVALUACION_REEMBOLSO',
    decision_summary: input.decisionSummary.trim(),
    notes: input.resolutionNotes.trim(),
    resolved_at: nowIso,
  };
  saveLocalResolutions([resolution, ...loadLocalResolutions()]);

  // 2. Crear el registro de reembolso
  const isCompleted = input.refundStatus === 'COMPLETADO';
  const newRefund: RefundRecord = {
    id: `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    order_id: targetOrder.id,
    order_code: targetOrder.order_code,
    buyer_name: targetOrder.buyer_name,
    buyer_email: targetOrder.buyer_email,
    buyer_phone: targetOrder.buyer_phone,
    order_item_id: targetItem.id,
    product_name_snapshot: targetItem.product_name_snapshot,
    product_version_snapshot: targetItem.product_version_snapshot,
    item_delivery_status_at_request: targetItem.delivery_status,
    payment_id: verifiedPayment?.id || 'pay-origin',
    resolution_id: resolution.id,
    decision_summary: resolution.decision_summary,
    refund_status: input.refundStatus,
    refund_amount_pen: requestedAmount,
    refund_method: input.refundMethod || null,
    destination_account: input.destinationAccount?.trim() || null,
    destination_holder_name: input.destinationHolderName?.trim() || null,
    operation_reference: input.operationReference?.trim() || null,
    receipt_storage_path: input.receiptStoragePath?.trim() || null,
    processed_by_user_id: isCompleted ? input.adminUserId || 'admin-smartlab' : null,
    reason: input.reason.trim(),
    refunded_at: isCompleted ? nowIso : null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const allRefunds = [newRefund, ...loadLocalRefunds()];
  saveLocalRefunds(allRefunds);

  // 3. Bloquear/revocar la entrega pendiente del ítem reembolsado
  const rawOrders = loadAdminLocalOrders();
  const orderToUpdate = rawOrders.find((o) => o.id === targetOrder.id);
  if (orderToUpdate) {
    const updatedItems = (orderToUpdate.items || []).map((item) => {
      if (item.id === targetItem.id) {
        return {
          ...item,
          delivery_status: 'REVOCADO' as ItemDeliveryStatus,
          updated_at: nowIso,
        };
      }
      return item;
    });

    // Si el reembolso está COMPLETADO, verificar si todos los ítems no entregados con pago fueron reembolsados
    const completedRefundsForOrder = allRefunds
      .filter((r) => r.order_id === targetOrder.id && r.refund_status === 'COMPLETADO')
      .reduce((acc, r) => acc + Number(r.refund_amount_pen || 0), 0);

    const nonDeliveredPaidTotal = (orderToUpdate.items || [])
      .filter((i) => i.delivery_status !== 'ENTREGADO')
      .reduce((acc, i) => acc + Number(i.allocated_paid_pen || 0), 0);

    const nextOrderStatus: OrderStatus =
      isCompleted &&
      nonDeliveredPaidTotal > 0 &&
      completedRefundsForOrder >= nonDeliveredPaidTotal - 0.001
        ? 'REEMBOLSADO'
        : orderToUpdate.status;

    const updatedOrder: Order = {
      ...orderToUpdate,
      status: nextOrderStatus,
      items: updatedItems,
      updated_at: nowIso,
    };

    saveAdminLocalOrders(rawOrders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
  }

  // 4. Registrar en audit_logs
  recordAuditLog({
    userId: input.adminUserId,
    actorName: input.adminName,
    entityType: 'REFUND',
    entityId: newRefund.id,
    entityLabel: `${targetOrder.order_code} • ${targetItem.product_name_snapshot}`,
    action: isCompleted ? 'COMPLETE_REFUND' : 'INSERT',
    summary: isCompleted
      ? `Reembolso efectivo COMPLETADO por S/ ${requestedAmount.toFixed(2)} vía ${newRefund.refund_method} (Op. ${newRefund.operation_reference}) hacia ${newRefund.destination_account}.`
      : `Solicitud de reembolso registrada (${newRefund.refund_status}) por S/ ${requestedAmount.toFixed(2)} sobre ítem no entregado.`,
    oldData: {
      item_id: targetItem.id,
      item_delivery_status: targetItem.delivery_status,
      allocated_paid_pen: targetItem.allocated_paid_pen,
    },
    newData: {
      refund_id: newRefund.id,
      refund_status: newRefund.refund_status,
      refund_amount_pen: newRefund.refund_amount_pen,
      refund_method: newRefund.refund_method,
      destination_account: newRefund.destination_account,
      operation_reference: newRefund.operation_reference,
      resolution_id: resolution.id,
    },
  });

  const refreshed = (await getAllAdminOrders()).find((o) => o.id === targetOrder.id) || null;
  return {
    refund: newRefund,
    order: refreshed,
    error: null,
  };
}

/**
 * Permite completar un reembolso que estaba en estado EN_EVALUACION o APROBADO_PENDIENTE_DEVOLUCION
 * registrando los datos obligatorios de la devolución efectiva del dinero.
 */
export async function completeExistingRefundAdmin(input: {
  refundId: string;
  refundMethod: PaymentMethod;
  destinationAccount: string;
  destinationHolderName: string;
  operationReference: string;
  receiptStoragePath?: string | null;
  adminUserId?: string;
  adminName?: string;
}): Promise<{ refund: RefundRecord | null; error: string | null }> {
  ensureSprint10SeedData();

  if (
    !input.refundMethod ||
    !input.destinationAccount.trim() ||
    !input.destinationHolderName.trim() ||
    !input.operationReference.trim()
  ) {
    return {
      refund: null,
      error:
        'Para completar el reembolso debes ingresar el método de devolución, cuenta/celular de destino, nombre del titular y número de operación.',
    };
  }

  const allRefunds = loadLocalRefunds();
  const target = allRefunds.find((r) => r.id === input.refundId);
  if (!target) {
    return { refund: null, error: 'No se encontró el registro de reembolso.' };
  }

  if (target.refund_status === 'COMPLETADO') {
    return { refund: target, error: 'Este reembolso ya fue marcado como COMPLETADO.' };
  }

  const nowIso = new Date().toISOString();
  const updatedRefund: RefundRecord = {
    ...target,
    refund_status: 'COMPLETADO',
    refund_method: input.refundMethod,
    destination_account: input.destinationAccount.trim(),
    destination_holder_name: input.destinationHolderName.trim(),
    operation_reference: input.operationReference.trim(),
    receipt_storage_path: input.receiptStoragePath?.trim() || target.receipt_storage_path,
    processed_by_user_id: input.adminUserId || 'admin-smartlab',
    refunded_at: nowIso,
    updated_at: nowIso,
  };

  const nextRefunds = allRefunds.map((r) => (r.id === updatedRefund.id ? updatedRefund : r));
  saveLocalRefunds(nextRefunds);

  // Actualizar estado del pedido a REEMBOLSADO si corresponde
  const rawOrders = loadAdminLocalOrders();
  const parentOrder = rawOrders.find((o) => o.id === target.order_id);
  if (parentOrder) {
    const completedRefundsForOrder = nextRefunds
      .filter((r) => r.order_id === parentOrder.id && r.refund_status === 'COMPLETADO')
      .reduce((acc, r) => acc + Number(r.refund_amount_pen || 0), 0);

    const nonDeliveredPaidTotal = (parentOrder.items || [])
      .filter((i) => i.delivery_status !== 'ENTREGADO')
      .reduce((acc, i) => acc + Number(i.allocated_paid_pen || 0), 0);

    if (
      nonDeliveredPaidTotal > 0 &&
      completedRefundsForOrder >= nonDeliveredPaidTotal - 0.001
    ) {
      const nextOrder: Order = {
        ...parentOrder,
        status: 'REEMBOLSADO',
        updated_at: nowIso,
      };
      saveAdminLocalOrders(rawOrders.map((o) => (o.id === nextOrder.id ? nextOrder : o)));
    }
  }

  recordAuditLog({
    userId: input.adminUserId,
    actorName: input.adminName,
    entityType: 'REFUND',
    entityId: updatedRefund.id,
    entityLabel: `${updatedRefund.order_code} • Devolución Efectiva`,
    action: 'COMPLETE_REFUND',
    summary: `Devolución efectiva registrada por S/ ${updatedRefund.refund_amount_pen.toFixed(2)} vía ${updatedRefund.refund_method} (Op. ${updatedRefund.operation_reference}).`,
    oldData: {
      refund_status: target.refund_status,
      operation_reference: target.operation_reference,
    },
    newData: {
      refund_status: 'COMPLETADO',
      refund_method: updatedRefund.refund_method,
      destination_account: updatedRefund.destination_account,
      destination_holder_name: updatedRefund.destination_holder_name,
      operation_reference: updatedRefund.operation_reference,
      refunded_at: nowIso,
    },
  });

  return { refund: updatedRefund, error: null };
}

/**
 * Calcula el resumen de reportes comerciales y financieros en Soles Peruanos (PEN / S/)
 * para el módulo ReportsAdminPage del Sprint 10.
 */
export async function getCommercialReportsSummary(): Promise<CommercialReportsSummary> {
  ensureSprint10SeedData();

  const allOrders = await getAllAdminOrders();
  const allPayments = loadAdminLocalPayments();
  const allRefunds = loadLocalRefunds();

  const verifiedPayments = allPayments.filter((p) => p.verification_status === 'VERIFICADO');
  const verifiedRevenueGrossPen = Number(
    verifiedPayments.reduce((acc, p) => acc + Number(p.amount_verified_pen || 0), 0).toFixed(2)
  );

  const completedRefunds = allRefunds.filter((r) => r.refund_status === 'COMPLETADO');
  const completedRefundsTotalPen = Number(
    completedRefunds.reduce((acc, r) => acc + Number(r.refund_amount_pen || 0), 0).toFixed(2)
  );

  const netRetainedRevenuePen = Number(
    Math.max(0, verifiedRevenueGrossPen - completedRefundsTotalPen).toFixed(2)
  );

  const partialOrders = allOrders.filter((o) => o.status === 'PAGO_PARCIAL');
  const pendingBalanceInPartialOrdersPen = Number(
    partialOrders.reduce((acc, o) => acc + Number(o.balance_due_pen || 0), 0).toFixed(2)
  );

  const expiredOrders = allOrders.filter((o) => o.status === 'VENCIDO');
  const preservedPaidInExpiredOrdersPen = Number(
    expiredOrders.reduce((acc, o) => acc + Number(o.total_paid_verified_pen || 0), 0).toFixed(2)
  );
  const pendingBalanceInExpiredOrdersPen = Number(
    expiredOrders.reduce((acc, o) => acc + Number(o.balance_due_pen || 0), 0).toFixed(2)
  );

  const cancelledOrdersCount = allOrders.filter((o) => o.status === 'CANCELADO').length;
  const refundedOrdersCount = allOrders.filter((o) => o.status === 'REEMBOLSADO').length;

  let deliveredItemsCount = 0;
  let pendingDeliveriesReadyCount = 0;
  const productStatsMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      modalidad: string;
      ordersCount: number;
      deliveredCount: number;
      allocatedRevenuePen: number;
    }
  >();

  for (const ord of allOrders) {
    for (const item of ord.items || []) {
      if (item.delivery_status === 'ENTREGADO') {
        deliveredItemsCount += 1;
      } else if (
        item.is_fully_paid &&
        item.delivery_status === 'LISTO_ENTREGA' &&
        ord.status !== 'CANCELADO' &&
        ord.status !== 'REEMBOLSADO'
      ) {
        pendingDeliveriesReadyCount += 1;
      }

      const existing = productStatsMap.get(item.product_id) || {
        productId: item.product_id,
        productName: item.product_name_snapshot,
        modalidad: item.product_modalidad_snapshot,
        ordersCount: 0,
        deliveredCount: 0,
        allocatedRevenuePen: 0,
      };
      existing.ordersCount += 1;
      if (item.delivery_status === 'ENTREGADO') {
        existing.deliveredCount += 1;
      }
      existing.allocatedRevenuePen = Number(
        (existing.allocatedRevenuePen + Number(item.allocated_paid_pen || 0)).toFixed(2)
      );
      productStatsMap.set(item.product_id, existing);
    }
  }

  const methods: PaymentMethod[] = ['YAPE', 'PLIN', 'TRANSFERENCIA'];
  const revenueByMethod = methods.map((method) => {
    const matching = verifiedPayments.filter((p) => p.payment_method === method);
    const totalVerifiedPen = Number(
      matching.reduce((acc, p) => acc + Number(p.amount_verified_pen || 0), 0).toFixed(2)
    );
    const sharePercent =
      verifiedRevenueGrossPen > 0
        ? Number(((totalVerifiedPen / verifiedRevenueGrossPen) * 100).toFixed(1))
        : 0;
    return {
      method,
      verifiedCount: matching.length,
      totalVerifiedPen,
      sharePercent,
    };
  });

  const topProducts = Array.from(productStatsMap.values()).sort(
    (a, b) => b.allocatedRevenuePen - a.allocatedRevenuePen
  );

  const expiredOrdersWithBalances = expiredOrders.map((o) => ({
    orderId: o.id,
    orderCode: o.order_code,
    buyerName: o.buyer_name,
    buyerPhone: o.buyer_phone,
    totalNetPen: o.total_net_pen,
    preservedPaidPen: o.total_paid_verified_pen,
    pendingBalancePen: o.balance_due_pen,
    expiresAt: o.expires_at,
  }));

  return {
    totalOrdersCount: allOrders.length,
    verifiedRevenueGrossPen,
    completedRefundsTotalPen,
    netRetainedRevenuePen,
    pendingBalanceInPartialOrdersPen,
    preservedPaidInExpiredOrdersPen,
    pendingBalanceInExpiredOrdersPen,
    expiredOrdersCount: expiredOrders.length,
    cancelledOrdersCount,
    refundedOrdersCount,
    deliveredItemsCount,
    pendingDeliveriesReadyCount,
    revenueByMethod,
    topProducts,
    expiredOrdersWithBalances,
  };
}
