/**
 * SmartLab Store — Tipos de Pedidos, Pagos y Entregas
 * Alineados con docs/04_BASE_DATOS.md y docs/05_PEDIDOS_PAGOS.md
 */

import { ProductModalidad } from './catalog.types';

export type OrderStatus =
  | 'PENDIENTE_PAGO'
  | 'PAGO_EN_REVISION'
  | 'PAGO_PARCIAL'
  | 'PAGO_VERIFICADO'
  | 'COMPLETADO'
  | 'VENCIDO'
  | 'OBSERVADO'
  | 'CANCELADO'
  | 'REEMBOLSADO';

export type ItemPaymentStatus = 'SIN_PAGO' | 'PAGO_PARCIAL' | 'PAGADO_TOTAL';

export type ItemDeliveryStatus = 'PENDIENTE' | 'LISTO_ENTREGA' | 'ENTREGADO' | 'REVOCADO';

export type PaymentMethod = 'YAPE' | 'PLIN' | 'TRANSFERENCIA';

export type PaymentVerificationStatus = 'EN_REVISION' | 'VERIFICADO' | 'RECHAZADO' | 'ANULADO';

export interface Order {
  id: string;
  order_code: string; // ej. SL-2026-000452
  customer_id: string;
  buyer_name: string;
  buyer_email: string; // NOT NULL obligatorio
  buyer_phone: string; // NOT NULL obligatorio para WhatsApp
  buyer_document_type: string | null;
  buyer_document_number: string | null;
  payment_method_selected: PaymentMethod;
  notes: string | null;
  subtotal_pen: number;
  discount_pen: number;
  total_net_pen: number;
  total_paid_verified_pen: number;
  balance_due_pen: number;
  status: OrderStatus;
  expires_at: string; // 72 horas por defecto
  created_at: string;
  updated_at: string;
  // Relaciones opcionales expandidas
  items?: OrderItem[];
  payments?: Payment[];
  cancellations?: OrderCancellation[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_version_snapshot: string;
  product_modalidad_snapshot: ProductModalidad;
  unit_price_pen: number;
  discount_applied_pen: number;
  final_item_price_pen: number;
  allocated_paid_pen: number;
  item_balance_due_pen: number;
  is_fully_paid: boolean;
  payment_status: ItemPaymentStatus;
  delivery_status: ItemDeliveryStatus;
  created_at: string;
  updated_at: string;
  // Relación opcional de entrega
  delivery?: Delivery;
}

export interface Payment {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  operation_number: string | null;
  origin_phone: string | null;
  bank_name: string | null;
  receipt_image_path: string | null;
  receipt_image_url: string | null;
  amount_reported_pen: number;
  amount_verified_pen: number;
  verification_status: PaymentVerificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales expandidas
  allocations?: PaymentAllocation[];
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  order_item_id: string;
  amount_allocated_pen: number;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_item_id: string;
  download_link_id: string | null;
  custom_link_url: string | null;
  delivered_via: 'WHATSAPP' | 'CORREO' | 'PORTAL';
  delivered_at: string | null;
  whatsapp_message_sent: string | null;
  delivery_status: ItemDeliveryStatus;
  delivered_by: string | null;
  is_revoked: boolean;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discount_value: number;
  minimum_order_pen: number;
  is_active: boolean;
  expires_at: string | null;
  usage_limit: number | null;
  current_usage_count: number;
}

export interface OrderCancellation {
  id: string;
  order_id: string;
  resolution_id: string;
  reason: string;
  blocked_pending_deliveries: boolean;
  cancelled_by: string;
  cancelled_at: string;
}

export interface Refund {
  id: string;
  order_id: string;
  order_item_id: string;
  amount_refunded_pen: number;
  refund_status: 'PENDIENTE' | 'COMPLETADO' | 'RECHAZADO';
  destination_account: string;
  transaction_code: string | null;
  processed_by: string;
  processed_at: string | null;
}

/**
 * Claves oficiales de configuración en `public.store_settings` (estructura key/value JSONB)
 */
export type StoreSettingKey =
  | 'payment_methods_config'
  | 'order_expiration_hours'
  | 'whatsapp_official_number'
  | 'support_email'
  | (string & {});

/**
 * Registro real de `public.store_settings` en Supabase
 */
export interface StoreSettingRecord<T = unknown> {
  key: StoreSettingKey;
  value: T;
  is_public: boolean;
  updated_by_user_id: string | null;
  updated_at: string;
}

/**
 * Estructura de cuenta bancaria dentro de `payment_methods_config.bank_transfer.accounts`
 */
export interface PaymentMethodsBankAccountEntry {
  id?: string;
  bank: string;
  account_type?: string;
  currency: string;
  account_number: string;
  cci: string;
  holder: string;
  enabled?: boolean;
  active?: boolean;
  is_active?: boolean;
}

/**
 * Modelo JSONB para la clave `payment_methods_config` en `public.store_settings`
 */
export interface PaymentMethodsConfig {
  yape: {
    enabled: boolean;
    phone: string;
    holder: string;
    qr_url: string | null;
  };
  plin: {
    enabled: boolean;
    phone: string;
    holder: string;
    qr_url: string | null;
  };
  bank_transfer: {
    enabled: boolean;
    accounts: PaymentMethodsBankAccountEntry[];
  };
}

/**
 * Billeteras digitales que admiten código QR en `payment_methods_config`
 */
export type QrWalletMethod = 'yape' | 'plin';

/**
 * Resultado de carga de activo público en el bucket `public-assets`
 */
export interface PublicAssetUploadResult {
  path: string | null;
  publicUrl: string | null;
  error: string | null;
}


