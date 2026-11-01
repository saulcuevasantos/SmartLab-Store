-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 001: ESQUEMA RELACIONAL DE TABLAS, RESTRICCIONES E ÍNDICES
-- Motor: PostgreSQL (Supabase)
-- Moneda Base: Soles Peruanos (PEN / S/)
-- Referencia: docs/04_BASE_DATOS.md
-- =============================================================================

-- Extensión requerida para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- GRUPO 1: USUARIOS, PERFILES Y ROLES
-- =============================================================================

-- 1.1. roles
CREATE TABLE IF NOT EXISTS public.roles (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  role_id VARCHAR(30) NOT NULL DEFAULT 'customer' REFERENCES public.roles(id) ON DELETE RESTRICT,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(25) NOT NULL,
  document_type VARCHAR(10) CHECK (document_type IS NULL OR document_type IN ('DNI', 'RUC', 'CE', 'OTRO')),
  document_number VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_profiles_email_nonempty CHECK (length(trim(email)) >= 5),
  CONSTRAINT chk_profiles_phone_nonempty CHECK (length(trim(phone_number)) >= 7)
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- =============================================================================
-- GRUPO 2: CLIENTES, DIRECCIONES Y SOLICITUDES PERSONALIZADAS
-- =============================================================================

-- 2.1. customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
  billing_business_name VARCHAR(200),
  billing_document_type VARCHAR(10) CHECK (billing_document_type IS NULL OR billing_document_type IN ('DNI', 'RUC')),
  billing_document_number VARCHAR(20),
  total_orders_count INTEGER NOT NULL DEFAULT 0 CHECK (total_orders_count >= 0),
  total_spent_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_spent_amount >= 0.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2. customer_addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('BILLING', 'CONTACT')),
  department VARCHAR(50) NOT NULL,
  province VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  street_address VARCHAR(255) NOT NULL,
  reference VARCHAR(255),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);

-- =============================================================================
-- GRUPO 3: CATEGORÍAS Y PRODUCTOS
-- =============================================================================

-- 3.1. categories
CREATE TABLE IF NOT EXISTS public.categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_name VARCHAR(50),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2. products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id VARCHAR(50) NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('FREE', 'PRO', 'PERSONALIZADO')),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  sku VARCHAR(50) NOT NULL UNIQUE,
  short_description VARCHAR(300) NOT NULL,
  full_description TEXT NOT NULL,
  features_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  technical_requirements TEXT,
  regular_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (regular_price >= 0.00),
  is_on_promotion BOOLEAN NOT NULL DEFAULT false,
  promotional_price NUMERIC(10,2) CHECK (promotional_price IS NULL OR promotional_price >= 0.00),
  promo_ends_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_products_free_price CHECK (
    (product_type = 'FREE' AND regular_price = 0.00 AND promotional_price IS NULL)
    OR (product_type <> 'FREE')
  ),
  CONSTRAINT chk_products_promo_less CHECK (
    promotional_price IS NULL OR promotional_price < regular_price
  )
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- =============================================================================
-- GRUPO 4: IMÁGENES, VERSIONES Y ENLACES DE DESCARGA
-- =============================================================================

-- 4.1. product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path VARCHAR(500) NOT NULL,
  public_url VARCHAR(1000) NOT NULL,
  alt_text VARCHAR(200),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

-- 4.2. product_versions
CREATE TABLE IF NOT EXISTS public.product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  version_tag VARCHAR(30) NOT NULL,
  release_notes TEXT,
  is_current_version BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_versions_tag UNIQUE (product_id, version_tag)
);

CREATE INDEX IF NOT EXISTS idx_product_versions_product ON public.product_versions(product_id);

-- 4.3. download_links
CREATE TABLE IF NOT EXISTS public.download_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_version_id UUID NOT NULL REFERENCES public.product_versions(id) ON DELETE RESTRICT,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('GOOGLE_DRIVE', 'MEDIAFIRE', 'PRIVATE_STORAGE')),
  link_mode VARCHAR(20) NOT NULL DEFAULT 'PERMANENT_EXTERNAL' CHECK (link_mode IN ('PERMANENT_EXTERNAL', 'TEMPORARY_SIGNED')),
  storage_url TEXT NOT NULL,
  file_format VARCHAR(20) NOT NULL,
  file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_download_links_version ON public.download_links(product_version_id);

-- =============================================================================
-- GRUPO 5: CARRITOS Y DETALLES
-- =============================================================================

-- 5.1. carts
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token VARCHAR(120) UNIQUE,
  coupon_code VARCHAR(50),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_carts_owner CHECK (user_id IS NOT NULL OR session_token IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_carts_user ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON public.carts(session_token);

-- 5.2. cart_items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_version_id UUID NOT NULL REFERENCES public.product_versions(id) ON DELETE RESTRICT,
  quantity SMALLINT NOT NULL DEFAULT 1 CHECK (quantity = 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cart_items_product UNIQUE (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);

-- =============================================================================
-- GRUPO 6: PEDIDOS Y DETALLES (SNAPSHOTS INMUTABLES Y VENCIMIENTO 72H)
-- =============================================================================

-- 6.1. orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(30) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  buyer_full_name VARCHAR(150) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_phone VARCHAR(25) NOT NULL,
  buyer_document_type VARCHAR(10) CHECK (buyer_document_type IS NULL OR buyer_document_type IN ('DNI', 'RUC', 'CE', 'OTRO')),
  buyer_document_number VARCHAR(20),
  preferred_payment_method VARCHAR(30) NOT NULL CHECK (
    preferred_payment_method IN ('YAPE', 'PLIN', 'TRANSFERENCIA_BANCARIA', 'GRATUITO')
  ),
  order_status VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE_PAGO' CHECK (
    order_status IN (
      'PENDIENTE_PAGO',
      'PAGO_EN_REVISION',
      'PAGO_PARCIAL',
      'PAGO_VERIFICADO',
      'COMPLETADO',
      'VENCIDO',
      'OBSERVADO',
      'CANCELADO',
      'REEMBOLSADO'
    )
  ),
  currency VARCHAR(3) NOT NULL DEFAULT 'PEN' CHECK (currency = 'PEN'),
  gross_amount NUMERIC(10,2) NOT NULL CHECK (gross_amount >= 0.00),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0.00),
  net_amount NUMERIC(10,2) NOT NULL CHECK (net_amount >= 0.00),
  total_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_paid_amount >= 0.00),
  pending_balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (pending_balance_amount >= 0.00),
  customer_notes TEXT,
  internal_notes TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  expired_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_orders_buyer_email_nonempty CHECK (length(trim(buyer_email)) >= 5),
  CONSTRAINT chk_orders_buyer_phone_nonempty CHECK (length(trim(buyer_phone)) >= 7),
  CONSTRAINT chk_orders_net_calc CHECK (net_amount = (gross_amount - discount_amount)),
  CONSTRAINT chk_orders_balance_calc CHECK (pending_balance_amount = GREATEST(net_amount - total_paid_amount, 0.00))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_placed ON public.orders(placed_at);

-- 2.3. custom_requests (Referencia orders.id para generated_order_id)
CREATE TABLE IF NOT EXISTS public.custom_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  category_id VARCHAR(50) NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  requester_name VARCHAR(150) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_phone VARCHAR(25) NOT NULL,
  requirements_detail TEXT NOT NULL,
  quoted_price NUMERIC(10,2) CHECK (quoted_price IS NULL OR quoted_price >= 0.00),
  status VARCHAR(30) NOT NULL DEFAULT 'RECIBIDO' CHECK (
    status IN ('RECIBIDO', 'EN_EVALUACION', 'COTIZADO', 'CONVERTIDO_A_PEDIDO', 'DESCARTADO')
  ),
  generated_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_custom_requests_email_nonempty CHECK (length(trim(requester_email)) >= 5),
  CONSTRAINT chk_custom_requests_phone_nonempty CHECK (length(trim(requester_phone)) >= 7)
);

CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON public.custom_requests(status);
CREATE INDEX IF NOT EXISTS idx_custom_requests_customer ON public.custom_requests(customer_id);

-- 6.2. order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_version_id UUID NOT NULL REFERENCES public.product_versions(id) ON DELETE RESTRICT,
  snapshot_product_title VARCHAR(200) NOT NULL,
  snapshot_sku VARCHAR(50) NOT NULL,
  snapshot_product_type VARCHAR(20) NOT NULL CHECK (snapshot_product_type IN ('FREE', 'PRO', 'PERSONALIZADO')),
  snapshot_category_name VARCHAR(100) NOT NULL,
  snapshot_version_tag VARCHAR(30) NOT NULL,
  regular_unit_price NUMERIC(10,2) NOT NULL CHECK (regular_unit_price >= 0.00),
  discount_unit_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_unit_amount >= 0.00),
  final_unit_price NUMERIC(10,2) NOT NULL CHECK (final_unit_price >= 0.00),
  quantity SMALLINT NOT NULL DEFAULT 1 CHECK (quantity = 1),
  subtotal_price NUMERIC(10,2) NOT NULL CHECK (subtotal_price >= 0.00),
  allocated_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (allocated_paid_amount >= 0.00),
  pending_item_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (pending_item_balance >= 0.00),
  is_fully_paid BOOLEAN NOT NULL DEFAULT false,
  item_payment_status VARCHAR(25) NOT NULL DEFAULT 'SIN_PAGO' CHECK (
    item_payment_status IN ('SIN_PAGO', 'PAGO_PARCIAL', 'PAGADO_100', 'REEMBOLSADO')
  ),
  item_delivery_status VARCHAR(25) NOT NULL DEFAULT 'PENDIENTE_PAGO' CHECK (
    item_delivery_status IN ('PENDIENTE_PAGO', 'LISTO_PARA_ENTREGA', 'ENTREGADO', 'REVOCADO')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id),
  CONSTRAINT chk_order_items_no_overallocation CHECK (allocated_paid_amount <= subtotal_price),
  CONSTRAINT chk_order_items_fully_paid_match CHECK (
    (is_fully_paid = true AND allocated_paid_amount = subtotal_price)
    OR (is_fully_paid = false AND allocated_paid_amount < subtotal_price)
  ),
  CONSTRAINT chk_order_items_delivery_requires_full_payment CHECK (
    (item_delivery_status IN ('LISTO_PARA_ENTREGA', 'ENTREGADO') AND is_fully_paid = true)
    OR (item_delivery_status IN ('PENDIENTE_PAGO', 'REVOCADO'))
  )
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);

-- =============================================================================
-- GRUPO 7: PAGOS Y ASIGNACIÓN DE PAGOS POR PRODUCTO
-- =============================================================================

-- 7.1. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('YAPE', 'PLIN', 'TRANSFERENCIA_BANCARIA')),
  submission_channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP' CHECK (
    submission_channel IN ('WHATSAPP', 'WEB_PORTAL', 'ADMIN_DIRECT')
  ),
  amount_reported NUMERIC(10,2) NOT NULL CHECK (amount_reported > 0.00),
  amount_verified NUMERIC(10,2) CHECK (amount_verified IS NULL OR amount_verified >= 0.00),
  operation_number VARCHAR(80),
  operation_date TIMESTAMPTZ,
  receipt_storage_path VARCHAR(500),
  verification_status VARCHAR(25) NOT NULL DEFAULT 'PENDIENTE' CHECK (
    verification_status IN ('PENDIENTE', 'APROBADO', 'OBSERVADO', 'RECHAZADO')
  ),
  verified_by_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  verified_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payments_approved_fields CHECK (
    (verification_status = 'APROBADO' AND amount_verified IS NOT NULL AND amount_verified > 0.00 AND verified_by_user_id IS NOT NULL)
    OR (verification_status <> 'APROBADO')
  )
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(verification_status);
CREATE INDEX IF NOT EXISTS idx_payments_operation ON public.payments(operation_number);

-- 7.2. payment_allocations
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  allocated_amount NUMERIC(10,2) NOT NULL CHECK (allocated_amount > 0.00),
  allocated_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_allocations_payment_item UNIQUE (payment_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_item ON public.payment_allocations(order_item_id);

-- =============================================================================
-- GRUPO 8: ENTREGAS DIGITALES POR PRODUCTO
-- =============================================================================

-- 8.1. deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL UNIQUE REFERENCES public.order_items(id) ON DELETE RESTRICT,
  download_link_id UUID REFERENCES public.download_links(id) ON DELETE RESTRICT,
  custom_download_url TEXT,
  delivery_channel VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP_MANUAL' CHECK (
    delivery_channel IN ('WHATSAPP_MANUAL', 'WEB_PORTAL', 'WHATSAPP_AND_WEB')
  ),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  sent_by_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  whatsapp_message_snapshot TEXT,
  access_token VARCHAR(100) UNIQUE,
  token_expires_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  last_downloaded_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_deliveries_has_url CHECK (
    download_link_id IS NOT NULL OR custom_download_url IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_deliveries_item ON public.deliveries(order_item_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_token ON public.deliveries(access_token);

-- =============================================================================
-- GRUPO 9: CUPONES Y PROMOCIONES
-- =============================================================================

-- 9.1. coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0.00),
  minimum_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (minimum_order_amount >= 0.00),
  max_discount_limit NUMERIC(10,2) CHECK (max_discount_limit IS NULL OR max_discount_limit > 0.00),
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  max_usage_limit INTEGER CHECK (max_usage_limit IS NULL OR max_usage_limit > 0),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_coupon_percentage_limit CHECK (
    discount_type <> 'PERCENTAGE' OR (discount_value > 0 AND discount_value <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

-- 9.2. coupon_usages
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  discount_applied_amount NUMERIC(10,2) NOT NULL CHECK (discount_applied_amount >= 0.00),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_coupon_usages_coupon_order UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer ON public.coupon_usages(customer_id, coupon_id);

-- =============================================================================
-- GRUPO 10: CANCELACIONES, RESOLUCIONES ADMINISTRATIVAS Y REEMBOLSOS
-- =============================================================================

-- 10.1. administrative_resolutions
CREATE TABLE IF NOT EXISTS public.administrative_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  resolution_type VARCHAR(40) NOT NULL CHECK (
    resolution_type IN (
      'CANCELACION_MANUAL',
      'EVALUACION_REEMBOLSO',
      'REACTIVACION_PEDIDO_VENCIDO',
      'REASIGNACION_ENLACE',
      'REVOCACION_ENTREGA_PENDIENTE',
      'RESOLUCION_OBSERVACION'
    )
  ),
  decision_summary VARCHAR(250) NOT NULL,
  notes TEXT NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resolutions_order ON public.administrative_resolutions(order_id);

-- 10.2. order_cancellations
CREATE TABLE IF NOT EXISTS public.order_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  resolution_id UUID NOT NULL REFERENCES public.administrative_resolutions(id) ON DELETE RESTRICT,
  cancelled_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  cancellation_reason TEXT NOT NULL,
  cancellation_type VARCHAR(30) NOT NULL CHECK (
    cancellation_type IN ('CLIENTE_SOLICITUD', 'COMPROBANTE_INVALIDO', 'ACUERDO_ADMINISTRATIVO', 'OTRO')
  ),
  pending_deliveries_blocked BOOLEAN NOT NULL DEFAULT true CHECK (pending_deliveries_blocked = true),
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10.3. refunds
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  resolution_id UUID NOT NULL REFERENCES public.administrative_resolutions(id) ON DELETE RESTRICT,
  refund_status VARCHAR(25) NOT NULL DEFAULT 'EN_EVALUACION' CHECK (
    refund_status IN ('EN_EVALUACION', 'APROBADO_PENDIENTE_DEVOLUCION', 'COMPLETADO', 'RECHAZADO')
  ),
  refund_amount NUMERIC(10,2) NOT NULL CHECK (refund_amount > 0.00),
  refund_method VARCHAR(30) CHECK (
    refund_method IS NULL OR refund_method IN ('YAPE', 'PLIN', 'TRANSFERENCIA_BANCARIA')
  ),
  destination_account VARCHAR(100),
  destination_holder_name VARCHAR(150),
  operation_reference VARCHAR(100),
  receipt_storage_path VARCHAR(500),
  processed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_refund_completed_requires_proof CHECK (
    (
      refund_status = 'COMPLETADO'
      AND refund_method IS NOT NULL
      AND destination_account IS NOT NULL
      AND operation_reference IS NOT NULL
      AND refunded_at IS NOT NULL
    )
    OR (refund_status <> 'COMPLETADO')
  )
);

CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_item ON public.refunds(order_item_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(refund_status);

-- =============================================================================
-- GRUPO 11: CONFIGURACIÓN GENERAL, HISTORIAL DE ESTADOS Y AUDITORÍA
-- =============================================================================

-- 11.1. store_settings
CREATE TABLE IF NOT EXISTS public.store_settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  updated_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11.2. order_status_history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  previous_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order ON public.order_status_history(order_id);

-- 11.3. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (
    entity_type IN (
      'PRODUCT',
      'ORDER',
      'PAYMENT',
      'ALLOCATION',
      'DELIVERY',
      'CANCELLATION',
      'RESOLUTION',
      'REFUND',
      'COUPON',
      'CONFIG'
    )
  ),
  entity_id VARCHAR(64) NOT NULL,
  action VARCHAR(30) NOT NULL CHECK (
    action IN (
      'INSERT',
      'UPDATE',
      'DELETE',
      'VERIFY_PAYMENT',
      'ALLOCATE_PAYMENT',
      'SEND_LINK_WHATSAPP',
      'REVOKE_DELIVERY',
      'CANCEL_ORDER',
      'COMPLETE_REFUND'
    )
  ),
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);

-- =============================================================================
-- DATOS BASE OFICIALES (ROLES, 6 CATEGORÍAS Y PARÁMETROS DE TIENDA)
-- =============================================================================

INSERT INTO public.roles (id, name, description) VALUES
  ('admin', 'Administrador', 'Acceso total al panel administrativo, verificación de pagos, entregas y auditoría.'),
  ('customer', 'Cliente', 'Acceso a cuenta personal, historial de pedidos, estados y enlaces autorizados.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id, name, slug, description, icon_name, display_order, is_active) VALUES
  ('excel', 'Excel', 'excel', 'Plantillas profesionales, macros VBA y tableros financieros en Excel.', 'FileSpreadsheet', 1, true),
  ('google_sheets', 'Google Sheets', 'google-sheets', 'Hojas de cálculo colaborativas en la nube con automatizaciones Apps Script.', 'Table', 2, true),
  ('sistemas', 'Sistemas', 'sistemas', 'Software de gestión comercial, ventas, inventarios y facturación.', 'Monitor', 3, true),
  ('android_apps', 'Aplicaciones Android', 'aplicaciones-android', 'Aplicaciones móviles operativas (APK) para negocios y control en campo.', 'Smartphone', 4, true),
  ('automatizaciones', 'Automatizaciones', 'automatizaciones', 'Scripts, flujos de trabajo y conectores para optimizar tareas repetitivas.', 'Zap', 5, true),
  ('recursos_digitales', 'Recursos Digitales', 'recursos-digitales', 'Guías técnicas, paquetes de utilidades y recursos descargables.', 'FolderOpen', 6, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.store_settings (key, value, is_public) VALUES
  ('order_expiration_hours', '72'::jsonb, true),
  ('whatsapp_official_number', '"51900000000"'::jsonb, true),
  ('payment_methods_config', '{
    "yape": {"enabled": true, "phone": "900 000 000", "holder": "SmartLab Store Perú", "qr_url": null},
    "plin": {"enabled": true, "phone": "900 000 000", "holder": "SmartLab Store Perú", "qr_url": null},
    "bank_transfer": {
      "enabled": true,
      "accounts": [
        {"bank": "BCP", "currency": "PEN (S/)", "account_number": "191-00000000-0-00", "cci": "00219100000000000000", "holder": "SmartLab Store Perú"}
      ]
    }
  }'::jsonb, true)
ON CONFLICT (key) DO NOTHING;
