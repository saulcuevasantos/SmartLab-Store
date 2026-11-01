/**
 * SmartLab Store — Servicio Administrativo de Verificación de Pagos y Asignación por Producto
 * docs/08_PLAN_SPRINTS.md (Sprint 09) y docs/05_PEDIDOS_PAGOS.md
 *
 * Reglas de negocio críticas:
 * 1. Toda la contabilidad de pagos, verificaciones y asignaciones opera exclusivamente en Soles Peruanos (PEN / S/).
 * 2. Ningún comprobante en estado EN_REVISION o RECHAZADO suma a total_paid_verified_pen ni puede asignarse a ítems.
 * 3. Al verificar un pago (VERIFICADO), el administrador define amount_verified_pen y distribuye dicho monto
 *    en payment_allocations hacia cada order_item sin superar jamás el saldo pendiente del ítem ni el monto verificado del comprobante.
 * 4. Cada order_item actualiza su allocated_paid_pen, item_balance_due_pen, is_fully_paid, payment_status y delivery_status.
 * 5. El pedido actualiza automáticamente su estado a PAGO_PARCIAL o PAGO_VERIFICADO según el saldo restante.
 */

import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentAllocation,
  PaymentMethod,
  ItemPaymentStatus,
  ItemDeliveryStatus,
  Delivery,
} from '../types/order.types';
import { evaluateOrderExpiration, OrderWithDetails } from './orders.service';

const LOCAL_ORDERS_KEY = 'smartlab_orders_v1';
const LOCAL_PAYMENTS_KEY = 'smartlab_payments_v1';
const LOCAL_ALLOCATIONS_KEY = 'smartlab_payment_allocations_v1';
const LOCAL_DELIVERIES_KEY = 'smartlab_deliveries_v1';

export interface AdminPaymentWithContext extends Payment {
  order_code: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  order_status: OrderStatus;
  order_total_net_pen: number;
  order_balance_due_pen: number;
  allocations: PaymentAllocation[];
  total_allocated_pen: number;
  unallocated_verified_pen: number;
}

export interface RegisterAdminReceiptInput {
  orderId: string;
  paymentMethod: PaymentMethod;
  amountReportedPen: number;
  operationNumber?: string;
  originPhone?: string;
  bankName?: string;
  receiptImageUrl?: string | null;
  autoVerify?: boolean;
  amountVerifiedPen?: number;
  adminUserId?: string;
  adminNotes?: string;
}

export interface VerifyAdminPaymentInput {
  paymentId: string;
  decision: 'VERIFICADO' | 'OBSERVADO' | 'RECHAZADO';
  amountVerifiedPen?: number;
  reasonOrNotes?: string;
  adminUserId?: string;
}

export interface AllocationLineInput {
  order_item_id: string;
  amount_allocated_pen: number;
}

export function loadAdminLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdminLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Ignorar errores de cuota
  }
}

export function loadAdminLocalPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdminLocalPayments(payments: Payment[]): void {
  try {
    localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(payments));
  } catch {
    // Ignorar errores de cuota
  }
}

export function loadAdminLocalAllocations(): PaymentAllocation[] {
  try {
    const raw = localStorage.getItem(LOCAL_ALLOCATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdminLocalAllocations(allocations: PaymentAllocation[]): void {
  try {
    localStorage.setItem(LOCAL_ALLOCATIONS_KEY, JSON.stringify(allocations));
  } catch {
    // Ignorar errores de cuota
  }
}

export function loadAdminLocalDeliveries(): Delivery[] {
  try {
    const raw = localStorage.getItem(LOCAL_DELIVERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdminLocalDeliveries(deliveries: Delivery[]): void {
  try {
    localStorage.setItem(LOCAL_DELIVERIES_KEY, JSON.stringify(deliveries));
  } catch {
    // Ignorar errores de cuota
  }
}

/**
 * Inicializa pedidos multi-producto demostrativos en Soles (PEN / S/) si aún no existen pedidos en almacenamiento local,
 * permitiendo probar inmediatamente:
 * 1) Comprobante Yape en revisión (EN_REVISION) listo para aprobar y asignar por producto.
 * 2) Pedido multi-producto con PAGO_PARCIAL verificado donde el Producto 1 está PAGADO_TOTAL (LISTO_ENTREGA)
 *    y el Producto 2 tiene saldo pendiente (bloqueado para entrega hasta completar el 100%).
 */
export function ensureDemoOrdersAndPaymentsSeeded(): void {
  const existingOrders = loadAdminLocalOrders();
  if (existingOrders.length > 0) return;

  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const in60Hours = new Date(now.getTime() + 60 * 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();

  const order1Id = 'ord-demo-sprint09-01';
  const order1Item1Id = 'item-demo-s09-01a';
  const order1Item2Id = 'item-demo-s09-01b';
  const payment1Id = 'pay-demo-s09-01';

  const order2Id = 'ord-demo-sprint09-02';
  const order2Item1Id = 'item-demo-s09-02a';
  const order2Item2Id = 'item-demo-s09-02b';
  const payment2Id = 'pay-demo-s09-02';
  const alloc2Id = 'alloc-demo-s09-02a';

  const seededOrders: Order[] = [
    {
      id: order1Id,
      order_code: 'SL-2026-849201',
      customer_id: 'cust-demo-01',
      buyer_name: 'Carlos Eduardo Mendoza Vargas',
      buyer_email: 'cmendoza@constructora-andina.pe',
      buyer_phone: '51987654321',
      buyer_document_type: 'RUC',
      buyer_document_number: '20608491023',
      payment_method_selected: 'YAPE',
      notes: 'Solicito envío de enlaces a mi WhatsApp corporativo una vez verificado el Yape.',
      subtotal_pen: 230.0,
      discount_pen: 0,
      total_net_pen: 230.0,
      total_paid_verified_pen: 0,
      balance_due_pen: 230.0,
      status: 'PAGO_EN_REVISION',
      expires_at: in60Hours,
      created_at: twoHoursAgo,
      updated_at: twoHoursAgo,
      items: [
        {
          id: order1Item1Id,
          order_id: order1Id,
          product_id: 'prod-1',
          product_name_snapshot: 'SmartLab Metrados Estructurales Pro (Lisp + Excel)',
          product_version_snapshot: 'v3.4.0',
          product_modalidad_snapshot: 'PRO',
          unit_price_pen: 140.0,
          discount_applied_pen: 0,
          final_item_price_pen: 140.0,
          allocated_paid_pen: 0,
          item_balance_due_pen: 140.0,
          is_fully_paid: false,
          payment_status: 'SIN_PAGO',
          delivery_status: 'PENDIENTE',
          created_at: twoHoursAgo,
          updated_at: twoHoursAgo,
        },
        {
          id: order1Item2Id,
          order_id: order1Id,
          product_id: 'prod-2',
          product_name_snapshot: 'Pack Bloques Dinámicos Instalaciones Sanitarias ISO',
          product_version_snapshot: 'v2.1.0',
          product_modalidad_snapshot: 'PRO',
          unit_price_pen: 90.0,
          discount_applied_pen: 0,
          final_item_price_pen: 90.0,
          allocated_paid_pen: 0,
          item_balance_due_pen: 90.0,
          is_fully_paid: false,
          payment_status: 'SIN_PAGO',
          delivery_status: 'PENDIENTE',
          created_at: twoHoursAgo,
          updated_at: twoHoursAgo,
        },
      ],
    },
    {
      id: order2Id,
      order_code: 'SL-2026-731094',
      customer_id: 'cust-demo-02',
      buyer_name: 'Ing. Valeria Quispe Huamán',
      buyer_email: 'vquispe@proyectosviales.pe',
      buyer_phone: '51945112233',
      buyer_document_type: 'DNI',
      buyer_document_number: '72849105',
      payment_method_selected: 'TRANSFERENCIA',
      notes: 'Adelanto por el primer programa para entrega inmediata; mañana abono el saldo del segundo.',
      subtotal_pen: 270.0,
      discount_pen: 0,
      total_net_pen: 270.0,
      total_paid_verified_pen: 180.0,
      balance_due_pen: 90.0,
      status: 'PAGO_PARCIAL',
      expires_at: in48Hours,
      created_at: fiveHoursAgo,
      updated_at: twoHoursAgo,
      items: [
        {
          id: order2Item1Id,
          order_id: order2Id,
          product_id: 'prod-1',
          product_name_snapshot: 'SmartLab Metrados Estructurales Pro (Lisp + Excel)',
          product_version_snapshot: 'v3.4.0',
          product_modalidad_snapshot: 'PRO',
          unit_price_pen: 140.0,
          discount_applied_pen: 0,
          final_item_price_pen: 140.0,
          allocated_paid_pen: 140.0,
          item_balance_due_pen: 0,
          is_fully_paid: true,
          payment_status: 'PAGADO_TOTAL',
          delivery_status: 'LISTO_ENTREGA',
          created_at: fiveHoursAgo,
          updated_at: twoHoursAgo,
        },
        {
          id: order2Item2Id,
          order_id: order2Id,
          product_id: 'prod-3',
          product_name_snapshot: 'Automatización Topográfica Civil 3D — Perfiles y Secciones',
          product_version_snapshot: 'v1.8.2',
          product_modalidad_snapshot: 'PRO',
          unit_price_pen: 130.0,
          discount_applied_pen: 0,
          final_item_price_pen: 130.0,
          allocated_paid_pen: 40.0,
          item_balance_due_pen: 90.0,
          is_fully_paid: false,
          payment_status: 'PAGO_PARCIAL',
          delivery_status: 'PENDIENTE',
          created_at: fiveHoursAgo,
          updated_at: twoHoursAgo,
        },
      ],
    },
  ];

  const seededPayments: Payment[] = [
    {
      id: payment1Id,
      order_id: order1Id,
      payment_method: 'YAPE',
      operation_number: '08491237',
      origin_phone: '987 654 321',
      bank_name: 'BCP - Yape',
      receipt_image_path: 'receipts/demo-yape-849201.png',
      receipt_image_url:
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
      amount_reported_pen: 230.0,
      amount_verified_pen: 0,
      verification_status: 'EN_REVISION',
      verified_by: null,
      verified_at: null,
      rejection_reason: 'Nota cliente: Pago total por los 2 aplicativos de ingeniería.',
      created_at: twoHoursAgo,
      updated_at: twoHoursAgo,
    },
    {
      id: payment2Id,
      order_id: order2Id,
      payment_method: 'TRANSFERENCIA',
      operation_number: 'BCP-4901824',
      origin_phone: '945 112 233',
      bank_name: 'BCP (Banco de Crédito del Perú)',
      receipt_image_path: 'receipts/demo-bcp-731094.png',
      receipt_image_url:
        'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80',
      amount_reported_pen: 180.0,
      amount_verified_pen: 180.0,
      verification_status: 'VERIFICADO',
      verified_by: 'admin-smartlab',
      verified_at: twoHoursAgo,
      rejection_reason: null,
      created_at: fiveHoursAgo,
      updated_at: twoHoursAgo,
    },
  ];

  const seededAllocations: PaymentAllocation[] = [
    {
      id: alloc2Id,
      payment_id: payment2Id,
      order_item_id: order2Item1Id,
      amount_allocated_pen: 140.0,
      created_at: twoHoursAgo,
    },
    {
      id: 'alloc-demo-s09-02b',
      payment_id: payment2Id,
      order_item_id: order2Item2Id,
      amount_allocated_pen: 40.0,
      created_at: twoHoursAgo,
    },
  ];

  saveAdminLocalOrders(seededOrders);
  saveAdminLocalPayments(seededPayments);
  saveAdminLocalAllocations(seededAllocations);
}

/**
 * Recalcula de forma determinística todos los montos verificados, asignaciones por ítem
 * y estados de un pedido a partir de sus pagos y payment_allocations.
 */
export function recalculateOrderFinancialsAndStatuses(
  order: Order,
  orderPayments: Payment[],
  allAllocations: PaymentAllocation[],
  allDeliveries: Delivery[],
  forceObservedStatus?: boolean
): Order {
  const nowIso = new Date().toISOString();

  // Solo los pagos con verification_status === 'VERIFICADO' suman a total_paid_verified_pen
  const verifiedPayments = orderPayments.filter((p) => p.verification_status === 'VERIFICADO');
  const verifiedPaymentIds = new Set(verifiedPayments.map((p) => p.id));

  const totalPaidVerifiedPen = Number(
    verifiedPayments.reduce((acc, p) => acc + Number(p.amount_verified_pen || 0), 0).toFixed(2)
  );

  const totalNetPen = Number(order.total_net_pen.toFixed(2));
  const balanceDuePen = Number(Math.max(0, totalNetPen - totalPaidVerifiedPen).toFixed(2));

  const updatedItems: OrderItem[] = (order.items || []).map((item) => {
    const itemAllocations = allAllocations.filter(
      (a) => a.order_item_id === item.id && verifiedPaymentIds.has(a.payment_id)
    );
    const allocatedPaidPen = Number(
      itemAllocations.reduce((acc, a) => acc + Number(a.amount_allocated_pen || 0), 0).toFixed(2)
    );
    const finalPrice = Number(item.final_item_price_pen.toFixed(2));
    const itemBalanceDuePen = Number(Math.max(0, finalPrice - allocatedPaidPen).toFixed(2));
    const isFullyPaid = itemBalanceDuePen === 0;

    let paymentStatus: ItemPaymentStatus = 'SIN_PAGO';
    if (isFullyPaid) {
      paymentStatus = 'PAGADO_TOTAL';
    } else if (allocatedPaidPen > 0) {
      paymentStatus = 'PAGO_PARCIAL';
    }

    const existingDelivery = allDeliveries.find((d) => d.order_item_id === item.id);
    let deliveryStatus: ItemDeliveryStatus = item.delivery_status;

    if (existingDelivery && existingDelivery.is_revoked) {
      deliveryStatus = 'REVOCADO';
    } else if (existingDelivery && existingDelivery.delivery_status === 'ENTREGADO') {
      deliveryStatus = 'ENTREGADO';
    } else if (isFullyPaid) {
      deliveryStatus = item.delivery_status === 'ENTREGADO' ? 'ENTREGADO' : 'LISTO_ENTREGA';
    } else {
      deliveryStatus = 'PENDIENTE';
    }

    return {
      ...item,
      allocated_paid_pen: allocatedPaidPen,
      item_balance_due_pen: itemBalanceDuePen,
      is_fully_paid: isFullyPaid,
      payment_status: paymentStatus,
      delivery_status: deliveryStatus,
      delivery: existingDelivery || item.delivery,
      updated_at: nowIso,
    };
  });

  // Determinar estado global del pedido (respetando estados finales administrativos CANCELADO / REEMBOLSADO)
  let nextStatus: OrderStatus = order.status;
  if (order.status !== 'CANCELADO' && order.status !== 'REEMBOLSADO') {
    const allItemsDelivered =
      updatedItems.length > 0 && updatedItems.every((i) => i.delivery_status === 'ENTREGADO');
    const hasPendingReviewPayments = orderPayments.some(
      (p) => p.verification_status === 'EN_REVISION'
    );

    if (forceObservedStatus) {
      nextStatus = 'OBSERVADO';
    } else if (allItemsDelivered && balanceDuePen === 0) {
      nextStatus = 'COMPLETADO';
    } else if (balanceDuePen === 0 && totalPaidVerifiedPen >= totalNetPen) {
      nextStatus = 'PAGO_VERIFICADO';
    } else if (totalPaidVerifiedPen > 0 && balanceDuePen > 0) {
      nextStatus = hasPendingReviewPayments ? 'PAGO_EN_REVISION' : 'PAGO_PARCIAL';
    } else if (hasPendingReviewPayments) {
      nextStatus = 'PAGO_EN_REVISION';
    } else if (order.status === 'OBSERVADO') {
      nextStatus = 'OBSERVADO';
    } else {
      nextStatus = 'PENDIENTE_PAGO';
    }
  }

  const recalculated: Order = {
    ...order,
    total_paid_verified_pen: totalPaidVerifiedPen,
    balance_due_pen: balanceDuePen,
    status: nextStatus,
    items: updatedItems,
    updated_at: nowIso,
  };

  return evaluateOrderExpiration(recalculated);
}

/**
 * Obtiene todos los pedidos para el panel administrativo con sus ítems, entregas, pagos y asignaciones
 */
export async function getAllAdminOrders(): Promise<OrderWithDetails[]> {
  ensureDemoOrdersAndPaymentsSeeded();

  const orders = loadAdminLocalOrders();
  const payments = loadAdminLocalPayments();
  const allocations = loadAdminLocalAllocations();
  const deliveries = loadAdminLocalDeliveries();

  let hasChanges = false;
  const enrichedOrders: OrderWithDetails[] = orders.map((ord) => {
    const ordPayments = payments
      .filter((p) => p.order_id === ord.id)
      .map((p) => ({
        ...p,
        allocations: allocations.filter((a) => a.payment_id === p.id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const recalculated = recalculateOrderFinancialsAndStatuses(
      ord,
      ordPayments,
      allocations,
      deliveries
    );

    if (
      recalculated.status !== ord.status ||
      recalculated.total_paid_verified_pen !== ord.total_paid_verified_pen ||
      recalculated.balance_due_pen !== ord.balance_due_pen
    ) {
      hasChanges = true;
    }

    return {
      ...recalculated,
      items: recalculated.items || [],
      payments: ordPayments,
    };
  });

  if (hasChanges) {
    saveAdminLocalOrders(
      enrichedOrders.map(({ payments: _p, ...rest }) => ({
        ...rest,
      }))
    );
  }

  return enrichedOrders.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Obtiene todos los comprobantes registrados con el contexto de su pedido y el saldo disponible por asignar
 */
export async function getAllAdminPayments(): Promise<AdminPaymentWithContext[]> {
  const allOrders = await getAllAdminOrders();
  const ordersById = new Map<string, OrderWithDetails>();
  for (const o of allOrders) {
    ordersById.set(o.id, o);
  }

  const payments = loadAdminLocalPayments();
  const allocations = loadAdminLocalAllocations();

  return payments
    .map((p) => {
      const parentOrder = ordersById.get(p.order_id);
      const paymentAllocs = allocations.filter((a) => a.payment_id === p.id);
      const totalAllocatedPen = Number(
        paymentAllocs.reduce((acc, a) => acc + Number(a.amount_allocated_pen || 0), 0).toFixed(2)
      );
      const verifiedAmount =
        p.verification_status === 'VERIFICADO' ? Number(p.amount_verified_pen || 0) : 0;
      const unallocatedVerifiedPen = Number(
        Math.max(0, verifiedAmount - totalAllocatedPen).toFixed(2)
      );

      return {
        ...p,
        order_code: parentOrder?.order_code || 'SL-DESCONOCIDO',
        buyer_name: parentOrder?.buyer_name || 'Cliente SmartLab',
        buyer_email: parentOrder?.buyer_email || '',
        buyer_phone: parentOrder?.buyer_phone || '',
        order_status: parentOrder?.status || 'PENDIENTE_PAGO',
        order_total_net_pen: parentOrder?.total_net_pen || 0,
        order_balance_due_pen: parentOrder?.balance_due_pen || 0,
        allocations: paymentAllocs,
        total_allocated_pen: totalAllocatedPen,
        unallocated_verified_pen: unallocatedVerifiedPen,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Permite al administrador registrar manualmente un comprobante enviado por el cliente vía WhatsApp
 * (Yape, Plin o Transferencia Bancaria) y opcionalmente aprobarlo de inmediato.
 */
export async function registerAdminPaymentReceipt(
  input: RegisterAdminReceiptInput
): Promise<{ payment: Payment | null; order: OrderWithDetails | null; error: string | null }> {
  const allOrders = await getAllAdminOrders();
  const targetOrder = allOrders.find(
    (o) =>
      o.id === input.orderId ||
      o.order_code.toUpperCase() === input.orderId.trim().toUpperCase()
  );

  if (!targetOrder) {
    return { payment: null, order: null, error: 'No se encontró el pedido indicado.' };
  }

  if (targetOrder.status === 'CANCELADO' || targetOrder.status === 'REEMBOLSADO') {
    return {
      payment: null,
      order: targetOrder,
      error: `No se pueden registrar pagos en un pedido con estado ${targetOrder.status}.`,
    };
  }

  const reportedPen = Number(input.amountReportedPen);
  if (!Number.isFinite(reportedPen) || reportedPen <= 0) {
    return {
      payment: null,
      order: targetOrder,
      error: 'El monto reportado debe ser mayor a S/ 0.00.',
    };
  }

  const autoVerify = Boolean(input.autoVerify);
  const verifiedPen = autoVerify
    ? Number((input.amountVerifiedPen ?? reportedPen).toFixed(2))
    : 0;

  if (autoVerify && verifiedPen <= 0) {
    return {
      payment: null,
      order: targetOrder,
      error: 'El monto verificado debe ser mayor a S/ 0.00.',
    };
  }

  const nowIso = new Date().toISOString();
  const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newPayment: Payment = {
    id: paymentId,
    order_id: targetOrder.id,
    payment_method: input.paymentMethod,
    operation_number: input.operationNumber?.trim() || null,
    origin_phone: input.originPhone?.trim() || targetOrder.buyer_phone || null,
    bank_name: input.bankName?.trim() || null,
    receipt_image_path: input.receiptImageUrl || null,
    receipt_image_url: input.receiptImageUrl || null,
    amount_reported_pen: Number(reportedPen.toFixed(2)),
    amount_verified_pen: verifiedPen,
    verification_status: autoVerify ? 'VERIFICADO' : 'EN_REVISION',
    verified_by: autoVerify ? input.adminUserId || 'admin-smartlab' : null,
    verified_at: autoVerify ? nowIso : null,
    rejection_reason: input.adminNotes?.trim() ? `Nota admin: ${input.adminNotes.trim()}` : null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const payments = loadAdminLocalPayments();
  const updatedPayments = [newPayment, ...payments];
  saveAdminLocalPayments(updatedPayments);

  const allocations = loadAdminLocalAllocations();
  const deliveries = loadAdminLocalDeliveries();
  const orderPayments = updatedPayments.filter((p) => p.order_id === targetOrder.id);

  const recalculatedOrder = recalculateOrderFinancialsAndStatuses(
    targetOrder,
    orderPayments,
    allocations,
    deliveries
  );

  const rawOrders = loadAdminLocalOrders();
  saveAdminLocalOrders(
    rawOrders.map((o) => (o.id === recalculatedOrder.id ? recalculatedOrder : o))
  );

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('payments').insert({
        id: newPayment.id,
        order_id: newPayment.order_id,
        payment_method: newPayment.payment_method,
        currency_code: 'PEN',
        amount_reported_pen: newPayment.amount_reported_pen,
        amount_verified_pen: newPayment.amount_verified_pen,
        operation_number: newPayment.operation_number,
        origin_phone: newPayment.origin_phone,
        bank_name: newPayment.bank_name,
        receipt_image_path: newPayment.receipt_image_path,
        verification_status: newPayment.verification_status,
        verified_by: newPayment.verified_by,
        verified_at: newPayment.verified_at,
      });
    } catch {
      // Continuar con persistencia local
    }
  }

  const refreshedOrders = await getAllAdminOrders();
  const refreshedOrder = refreshedOrders.find((o) => o.id === targetOrder.id) || null;

  return { payment: newPayment, order: refreshedOrder, error: null };
}

/**
 * Aprueba (VERIFICADO), observa (pedido OBSERVADO) o rechaza (RECHAZADO) un comprobante de pago.
 */
export async function verifyAdminPayment(
  input: VerifyAdminPaymentInput
): Promise<{ payment: Payment | null; order: OrderWithDetails | null; error: string | null }> {
  ensureDemoOrdersAndPaymentsSeeded();

  const payments = loadAdminLocalPayments();
  const targetPayment = payments.find((p) => p.id === input.paymentId);
  if (!targetPayment) {
    return { payment: null, order: null, error: 'No se encontró el comprobante especificado.' };
  }

  const orders = loadAdminLocalOrders();
  const targetOrder = orders.find((o) => o.id === targetPayment.order_id);
  if (!targetOrder) {
    return { payment: null, order: null, error: 'No se encontró el pedido asociado al pago.' };
  }

  if (targetOrder.status === 'CANCELADO' || targetOrder.status === 'REEMBOLSADO') {
    return {
      payment: null,
      order: null,
      error: `No se pueden verificar pagos de un pedido en estado ${targetOrder.status}.`,
    };
  }

  const nowIso = new Date().toISOString();
  let updatedPayment: Payment = { ...targetPayment, updated_at: nowIso };
  let allocations = loadAdminLocalAllocations();
  let forceObserved = false;

  if (input.decision === 'VERIFICADO') {
    const verifiedPen = Number(
      input.amountVerifiedPen !== undefined
        ? input.amountVerifiedPen
        : targetPayment.amount_reported_pen
    );

    if (!Number.isFinite(verifiedPen) || verifiedPen <= 0) {
      return {
        payment: null,
        order: null,
        error: 'Ingresa un monto verificado válido mayor a S/ 0.00 para aprobar el comprobante.',
      };
    }

    // Si ya tenía asignaciones mayores al nuevo monto verificado, limpiarlas para reasignar
    const currentAllocated = allocations
      .filter((a) => a.payment_id === targetPayment.id)
      .reduce((acc, a) => acc + Number(a.amount_allocated_pen || 0), 0);

    if (currentAllocated > verifiedPen) {
      allocations = allocations.filter((a) => a.payment_id !== targetPayment.id);
      saveAdminLocalAllocations(allocations);
    }

    updatedPayment = {
      ...targetPayment,
      verification_status: 'VERIFICADO',
      amount_verified_pen: Number(verifiedPen.toFixed(2)),
      verified_by: input.adminUserId || 'admin-smartlab',
      verified_at: nowIso,
      rejection_reason: input.reasonOrNotes?.trim() || null,
      updated_at: nowIso,
    };

    // Si el pedido tiene UN SOLO ítem y el monto verificado cubre exactamente o parcialmente ese único ítem,
    // y aún no tiene asignaciones, auto-asignar hasta el saldo del ítem para agilizar la operación
    const orderItems = targetOrder.items || [];
    const existingPaymentAllocs = allocations.filter((a) => a.payment_id === targetPayment.id);
    if (orderItems.length === 1 && existingPaymentAllocs.length === 0) {
      const singleItem = orderItems[0];
      const otherVerifiedIds = new Set(
        payments
          .filter(
            (p) =>
              p.order_id === targetOrder.id &&
              p.id !== targetPayment.id &&
              p.verification_status === 'VERIFICADO'
          )
          .map((p) => p.id)
      );
      const alreadyPaidOnItem = allocations
        .filter((a) => a.order_item_id === singleItem.id && otherVerifiedIds.has(a.payment_id))
        .reduce((acc, a) => acc + Number(a.amount_allocated_pen || 0), 0);

      const remainingItemNeed = Math.max(0, singleItem.final_item_price_pen - alreadyPaidOnItem);
      const autoAllocAmount = Number(Math.min(verifiedPen, remainingItemNeed).toFixed(2));

      if (autoAllocAmount > 0) {
        const autoAlloc: PaymentAllocation = {
          id: `alloc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          payment_id: targetPayment.id,
          order_item_id: singleItem.id,
          amount_allocated_pen: autoAllocAmount,
          created_at: nowIso,
        };
        allocations = [...allocations, autoAlloc];
        saveAdminLocalAllocations(allocations);
      }
    }
  } else if (input.decision === 'OBSERVADO') {
    if (!input.reasonOrNotes?.trim()) {
      return {
        payment: null,
        order: null,
        error: 'Indica el motivo de la observación para que el cliente pueda subsanar su comprobante.',
      };
    }

    // Remover cualquier asignación previa de este pago
    allocations = allocations.filter((a) => a.payment_id !== targetPayment.id);
    saveAdminLocalAllocations(allocations);

    updatedPayment = {
      ...targetPayment,
      verification_status: 'EN_REVISION',
      amount_verified_pen: 0,
      rejection_reason: `OBSERVADO: ${input.reasonOrNotes.trim()}`,
      updated_at: nowIso,
    };
    forceObserved = true;
  } else if (input.decision === 'RECHAZADO') {
    if (!input.reasonOrNotes?.trim()) {
      return {
        payment: null,
        order: null,
        error: 'Es obligatorio indicar el motivo del rechazo del comprobante.',
      };
    }

    // Remover cualquier asignación previa de este pago rechazado
    allocations = allocations.filter((a) => a.payment_id !== targetPayment.id);
    saveAdminLocalAllocations(allocations);

    updatedPayment = {
      ...targetPayment,
      verification_status: 'RECHAZADO',
      amount_verified_pen: 0,
      verified_by: input.adminUserId || 'admin-smartlab',
      verified_at: nowIso,
      rejection_reason: input.reasonOrNotes.trim(),
      updated_at: nowIso,
    };
  }

  const updatedPayments = payments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p));
  saveAdminLocalPayments(updatedPayments);

  const deliveries = loadAdminLocalDeliveries();
  const orderPayments = updatedPayments.filter((p) => p.order_id === targetOrder.id);
  const recalculatedOrder = recalculateOrderFinancialsAndStatuses(
    targetOrder,
    orderPayments,
    allocations,
    deliveries,
    forceObserved
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
      entity_type: 'PAYMENT',
      entity_id: updatedPayment.id,
      entity_label: `${targetOrder.order_code} (${updatedPayment.payment_method})`,
      action: 'VERIFY_PAYMENT',
      summary: `Comprobante ${updatedPayment.payment_method} (${targetOrder.order_code}) procesado como ${input.decision}. Monto verificado: S/ ${updatedPayment.amount_verified_pen.toFixed(2)}.`,
      old_data: {
        verification_status: targetPayment.verification_status,
        amount_verified_pen: targetPayment.amount_verified_pen,
      },
      new_data: {
        decision: input.decision,
        verification_status: updatedPayment.verification_status,
        amount_verified_pen: updatedPayment.amount_verified_pen,
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

  const refreshedOrders = await getAllAdminOrders();
  const refreshedOrder = refreshedOrders.find((o) => o.id === targetOrder.id) || null;

  return {
    payment: updatedPayment,
    order: refreshedOrder,
    error: null,
  };
}

/**
 * Distribuye el monto verificado (amount_verified_pen) de un comprobante VERIFICADO
 * entre los productos (order_items) del pedido mediante payment_allocations.
 *
 * Validaciones estrictas:
 * 1. El comprobante debe estar en estado VERIFICADO.
 * 2. La suma de asignaciones del comprobante no puede superar payment.amount_verified_pen.
 * 3. Ningún ítem puede recibir una asignación total acumulada mayor a su final_item_price_pen (prohibido sobreasignar).
 */
export async function allocateVerifiedPaymentToItems(input: {
  paymentId: string;
  allocations: AllocationLineInput[];
}): Promise<{ order: OrderWithDetails | null; error: string | null }> {
  ensureDemoOrdersAndPaymentsSeeded();

  const payments = loadAdminLocalPayments();
  const targetPayment = payments.find((p) => p.id === input.paymentId);
  if (!targetPayment) {
    return { order: null, error: 'No se encontró el comprobante de pago.' };
  }

  if (targetPayment.verification_status !== 'VERIFICADO') {
    return {
      order: null,
      error:
        'Solo se pueden asignar montos de comprobantes que ya han sido aprobados en estado VERIFICADO.',
    };
  }

  const orders = loadAdminLocalOrders();
  const targetOrder = orders.find((o) => o.id === targetPayment.order_id);
  if (!targetOrder) {
    return { order: null, error: 'No se encontró el pedido asociado a este comprobante.' };
  }

  if (targetOrder.status === 'CANCELADO' || targetOrder.status === 'REEMBOLSADO') {
    return {
      order: null,
      error: `No se pueden modificar asignaciones en un pedido con estado ${targetOrder.status}.`,
    };
  }

  const verifiedPen = Number(targetPayment.amount_verified_pen.toFixed(2));
  const sanitizedLines = input.allocations
    .map((line) => ({
      order_item_id: line.order_item_id,
      amount_allocated_pen: Number(Number(line.amount_allocated_pen || 0).toFixed(2)),
    }))
    .filter((line) => line.amount_allocated_pen > 0);

  for (const line of input.allocations) {
    if (Number(line.amount_allocated_pen) < 0) {
      return { order: null, error: 'No se permiten montos de asignación negativos.' };
    }
  }

  const sumToAllocatePen = Number(
    sanitizedLines.reduce((acc, l) => acc + l.amount_allocated_pen, 0).toFixed(2)
  );

  if (sumToAllocatePen > verifiedPen + 0.001) {
    return {
      order: null,
      error: `La suma asignada (S/ ${sumToAllocatePen.toFixed(2)}) supera el monto verificado del comprobante (S/ ${verifiedPen.toFixed(2)}).`,
    };
  }

  // Verificar que ningún producto supere su final_item_price_pen considerando otros pagos verificados del mismo pedido
  const allAllocations = loadAdminLocalAllocations();
  const otherVerifiedPaymentIds = new Set(
    payments
      .filter(
        (p) =>
          p.order_id === targetOrder.id &&
          p.id !== targetPayment.id &&
          p.verification_status === 'VERIFICADO'
      )
      .map((p) => p.id)
  );

  const orderItems = targetOrder.items || [];
  for (const line of sanitizedLines) {
    const orderItem = orderItems.find((i) => i.id === line.order_item_id);
    if (!orderItem) {
      return { order: null, error: 'Uno de los productos seleccionados no pertenece al pedido.' };
    }

    const allocatedByOtherPayments = Number(
      allAllocations
        .filter(
          (a) =>
            a.order_item_id === orderItem.id && otherVerifiedPaymentIds.has(a.payment_id)
        )
        .reduce((acc, a) => acc + Number(a.amount_allocated_pen || 0), 0)
        .toFixed(2)
    );

    const maxAllowedForThisPayment = Number(
      Math.max(0, orderItem.final_item_price_pen - allocatedByOtherPayments).toFixed(2)
    );

    if (line.amount_allocated_pen > maxAllowedForThisPayment + 0.001) {
      return {
        order: null,
        error: `El monto asignado a "${orderItem.product_name_snapshot}" (S/ ${line.amount_allocated_pen.toFixed(2)}) supera su saldo pendiente disponible (S/ ${maxAllowedForThisPayment.toFixed(2)}).`,
      };
    }
  }

  const nowIso = new Date().toISOString();
  const remainingAllocations = allAllocations.filter((a) => a.payment_id !== targetPayment.id);
  const newPaymentAllocations: PaymentAllocation[] = sanitizedLines.map((line, idx) => ({
    id: `alloc-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
    payment_id: targetPayment.id,
    order_item_id: line.order_item_id,
    amount_allocated_pen: line.amount_allocated_pen,
    created_at: nowIso,
  }));

  const updatedAllAllocations = [...remainingAllocations, ...newPaymentAllocations];
  saveAdminLocalAllocations(updatedAllAllocations);

  const deliveries = loadAdminLocalDeliveries();
  const orderPayments = payments.filter((p) => p.order_id === targetOrder.id);
  const recalculatedOrder = recalculateOrderFinancialsAndStatuses(
    targetOrder,
    orderPayments,
    updatedAllAllocations,
    deliveries
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
      user_id: 'admin-smartlab',
      actor_name: 'Administrador SmartLab',
      entity_type: 'ALLOCATION',
      entity_id: targetPayment.id,
      entity_label: `${targetOrder.order_code} (${sanitizedLines.length} ítem(s))`,
      action: 'ALLOCATE_PAYMENT',
      summary: `Asignación de S/ ${sumToAllocatePen.toFixed(2)} distribuida en ${sanitizedLines.length} producto(s) del pedido ${targetOrder.order_code}.`,
      old_data: null,
      new_data: {
        payment_id: targetPayment.id,
        total_allocated_pen: sumToAllocatePen,
        allocations: sanitizedLines,
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

  const refreshedOrders = await getAllAdminOrders();
  const refreshedOrder = refreshedOrders.find((o) => o.id === targetOrder.id) || null;

  return { order: refreshedOrder, error: null };
}
