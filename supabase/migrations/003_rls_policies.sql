-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 003: POLÍTICAS DE SEGURIDAD POR FILA (RLS)
-- Motor: PostgreSQL (Supabase)
-- Referencia: docs/04_BASE_DATOS.md (Sección 4) y docs/07_SEGURIDAD.md (Sección 3)
-- =============================================================================

-- =============================================================================
-- 1. HABILITAR RLS EN EL 100 % DE LAS TABLAS
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.roles') IS NOT NULL THEN
    ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
  END IF;
END;
$$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administrative_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. POLÍTICAS PARA USUARIOS, PERFILES Y ROLES (roles, profiles)
-- =============================================================================

-- roles: lectura pública del catálogo de roles; gestión exclusiva de admin (si la tabla existe)
DO $$
BEGIN
  IF to_regclass('public.roles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "roles_select_public" ON public.roles;
    CREATE POLICY "roles_select_public"
      ON public.roles FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "roles_admin_all" ON public.roles;
    CREATE POLICY "roles_admin_all"
      ON public.roles FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END;
$$;

-- profiles: el cliente lee/edita su propio perfil sin cambiar role_id ni is_active; admin gestiona todo
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_insert_own_customer"
  ON public.profiles FOR INSERT
  WITH CHECK (
    (auth.uid() = id AND role_id = 'customer' AND is_active = true)
    OR public.is_admin()
  );

CREATE POLICY "profiles_update_own_safe"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = id
      AND role_id = (SELECT p.role_id FROM public.profiles p WHERE p.id = auth.uid())
      AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- 3. CLIENTES, DIRECCIONES Y SOLICITUDES PERSONALIZADAS
-- =============================================================================

-- customers
CREATE POLICY "customers_select_own_or_admin"
  ON public.customers FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "customers_insert_own_or_admin"
  ON public.customers FOR INSERT
  WITH CHECK (
    (auth.uid() = id AND total_orders_count = 0 AND total_spent_amount = 0.00)
    OR public.is_admin()
  );

CREATE POLICY "customers_update_own_or_admin"
  ON public.customers FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = id
      AND total_orders_count = (SELECT c.total_orders_count FROM public.customers c WHERE c.id = auth.uid())
      AND total_spent_amount = (SELECT c.total_spent_amount FROM public.customers c WHERE c.id = auth.uid())
    )
  );

-- customer_addresses
CREATE POLICY "customer_addresses_own_or_admin"
  ON public.customer_addresses FOR ALL
  USING (auth.uid() = customer_id OR public.is_admin())
  WITH CHECK (auth.uid() = customer_id OR public.is_admin());

-- custom_requests
CREATE POLICY "custom_requests_insert_public"
  ON public.custom_requests FOR INSERT
  WITH CHECK (
    status = 'RECIBIDO'
    AND quoted_price IS NULL
    AND generated_order_id IS NULL
    AND (customer_id IS NULL OR customer_id = auth.uid())
  );

CREATE POLICY "custom_requests_select_own_or_admin"
  ON public.custom_requests FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "custom_requests_admin_manage"
  ON public.custom_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "custom_requests_admin_delete"
  ON public.custom_requests FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- 4. CATÁLOGO PÚBLICO (categories, products, product_images, product_versions)
-- =============================================================================

-- categories
CREATE POLICY "categories_select_active_or_admin"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "categories_admin_all"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- products
CREATE POLICY "products_select_active_or_admin"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_images
CREATE POLICY "product_images_select_public_or_admin"
  ON public.product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND (p.is_active = true OR public.is_admin())
    )
  );

CREATE POLICY "product_images_admin_all"
  ON public.product_images FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_versions
CREATE POLICY "product_versions_select_public_or_admin"
  ON public.product_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_versions.product_id
        AND (p.is_active = true OR public.is_admin())
    )
  );

CREATE POLICY "product_versions_admin_all"
  ON public.product_versions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 5. PROTECCIÓN ESTRICTA DE ENLACES Y ENTREGAS (download_links, deliveries)
-- Criterio de aceptación verificable #3:
-- Las consultas anónimas o de clientes sobre download_links y deliveries de
-- productos no pagados al 100 % devuelven cero registros.
-- =============================================================================

-- download_links: SOLO accesible por el administrador o por un cliente autenticado
-- que tenga una entrega habilitada, no revocada y con el producto pagado al 100 %
CREATE POLICY "download_links_authorized_customer_or_admin"
  ON public.download_links FOR SELECT
  USING (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND is_active = true
      AND EXISTS (
        SELECT 1
        FROM public.deliveries d
        INNER JOIN public.order_items oi ON oi.id = d.order_item_id
        INNER JOIN public.orders o ON o.id = oi.order_id
        WHERE d.download_link_id = download_links.id
          AND o.customer_id = auth.uid()
          AND o.order_status NOT IN ('CANCELADO', 'REEMBOLSADO')
          AND oi.is_fully_paid = true
          AND oi.allocated_paid_amount = oi.subtotal_price
          AND d.is_enabled = true
          AND d.revoked_at IS NULL
      )
    )
  );

CREATE POLICY "download_links_admin_write"
  ON public.download_links FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- deliveries: SOLO accesible por admin o por el cliente dueño cuando el producto
-- está pagado al 100 %, la entrega está habilitada y no ha sido revocada
CREATE POLICY "deliveries_authorized_customer_or_admin"
  ON public.deliveries FOR SELECT
  USING (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND is_enabled = true
      AND revoked_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.order_items oi
        INNER JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.id = deliveries.order_item_id
          AND o.customer_id = auth.uid()
          AND o.order_status NOT IN ('CANCELADO', 'REEMBOLSADO')
          AND oi.is_fully_paid = true
          AND oi.allocated_paid_amount = oi.subtotal_price
      )
    )
  );

CREATE POLICY "deliveries_admin_write"
  ON public.deliveries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 6. CARRITOS DE COMPRA (carts, cart_items)
-- =============================================================================

CREATE POLICY "carts_own_or_admin"
  ON public.carts FOR ALL
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "cart_items_own_or_admin"
  ON public.cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND ((auth.uid() IS NOT NULL AND c.user_id = auth.uid()) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
        AND ((auth.uid() IS NOT NULL AND c.user_id = auth.uid()) OR public.is_admin())
    )
  );

-- =============================================================================
-- 7. PEDIDOS Y DETALLES (orders, order_items)
-- =============================================================================

-- orders: el cliente consulta únicamente sus propios pedidos y puede crearlos en PENDIENTE_PAGO
CREATE POLICY "orders_select_own_or_admin"
  ON public.orders FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND customer_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "orders_insert_own_checkout_or_admin"
  ON public.orders FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND customer_id = auth.uid()
      AND order_status = 'PENDIENTE_PAGO'
      AND total_paid_amount = 0.00
    )
  );

CREATE POLICY "orders_admin_update_delete"
  ON public.orders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "orders_admin_delete"
  ON public.orders FOR DELETE
  USING (public.is_admin());

-- order_items: el cliente consulta los ítems de sus propios pedidos e inserta snapshots iniciales
CREATE POLICY "order_items_select_own_or_admin"
  ON public.order_items FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "order_items_insert_own_checkout_or_admin"
  ON public.order_items FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      allocated_paid_amount = 0.00
      AND is_fully_paid = (subtotal_price = 0.00)
      AND item_payment_status = CASE WHEN subtotal_price = 0.00 THEN 'PAGADO_100' ELSE 'SIN_PAGO' END
      AND item_delivery_status = CASE WHEN subtotal_price = 0.00 THEN 'LISTO_PARA_ENTREGA' ELSE 'PENDIENTE_PAGO' END
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND o.customer_id = auth.uid()
          AND o.order_status = 'PENDIENTE_PAGO'
      )
    )
  );

CREATE POLICY "order_items_admin_update_delete"
  ON public.order_items FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "order_items_admin_delete"
  ON public.order_items FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- 8. PAGOS Y ASIGNACIÓN DE PAGOS POR PRODUCTO (payments, payment_allocations)
-- =============================================================================

-- payments: el cliente ve pagos de sus pedidos y puede reportar un comprobante en PENDIENTE
CREATE POLICY "payments_select_own_or_admin"
  ON public.payments FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "payments_insert_own_pending_or_admin"
  ON public.payments FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND verification_status = 'PENDIENTE'
      AND amount_verified IS NULL
      AND verified_by_user_id IS NULL
      AND verified_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = payments.order_id
          AND o.customer_id = auth.uid()
          AND o.order_status NOT IN ('CANCELADO', 'REEMBOLSADO')
      )
    )
  );

CREATE POLICY "payments_admin_update"
  ON public.payments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- payment_allocations: el cliente solo lee las asignaciones de sus pedidos; solo admin escribe
CREATE POLICY "payment_allocations_select_own_or_admin"
  ON public.payment_allocations FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      INNER JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = payment_allocations.order_item_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "payment_allocations_admin_write"
  ON public.payment_allocations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 9. CUPONES Y USOS (coupons, coupon_usages)
-- =============================================================================

CREATE POLICY "coupons_select_active_or_admin"
  ON public.coupons FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "coupons_admin_all"
  ON public.coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "coupon_usages_select_own_or_admin"
  ON public.coupon_usages FOR SELECT
  USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "coupon_usages_insert_own_or_admin"
  ON public.coupon_usages FOR INSERT
  WITH CHECK (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "coupon_usages_admin_manage"
  ON public.coupon_usages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 10. CANCELACIONES, RESOLUCIONES, REEMBOLSOS, CONFIGURACIÓN E HISTORIAL
-- =============================================================================

-- administrative_resolutions: exclusivo para administradores
CREATE POLICY "administrative_resolutions_admin_only"
  ON public.administrative_resolutions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- order_cancellations: lectura del propio pedido para cliente; escritura exclusiva de admin
CREATE POLICY "order_cancellations_select_own_or_admin"
  ON public.order_cancellations FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_cancellations.order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "order_cancellations_admin_write"
  ON public.order_cancellations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- refunds: lectura del propio pedido para cliente; gestión exclusiva de admin
CREATE POLICY "refunds_select_own_or_admin"
  ON public.refunds FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = refunds.order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "refunds_admin_write"
  ON public.refunds FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- store_settings: lectura pública si is_public = true; escritura exclusiva de admin
CREATE POLICY "store_settings_select_public_or_admin"
  ON public.store_settings FOR SELECT
  USING (is_public = true OR public.is_admin());

CREATE POLICY "store_settings_admin_write"
  ON public.store_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- order_status_history: lectura del propio pedido para cliente; gestión de admin
CREATE POLICY "order_status_history_select_own_or_admin"
  ON public.order_status_history FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.customer_id = auth.uid()
    )
  );

CREATE POLICY "order_status_history_admin_write"
  ON public.order_status_history FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- audit_logs: lectura e inserción exclusivas para administradores (inmutable)
CREATE POLICY "audit_logs_admin_select"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "audit_logs_admin_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());
