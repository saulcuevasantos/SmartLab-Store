-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 002: FUNCIONES DE SEGURIDAD Y TRIGGERS DE INTEGRIDAD
-- Motor: PostgreSQL (Supabase)
-- Referencia: docs/04_BASE_DATOS.md (Sección 4 y 5) y docs/05_PEDIDOS_PAGOS.md
-- =============================================================================

-- =============================================================================
-- 1. FUNCIÓN DE VERIFICACIÓN DE ROL ADMINISTRADOR (public.is_admin)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role_id = 'admin'
      AND is_active = true
  );
$$;

-- =============================================================================
-- 2. TRIGGER GENERAL DE ACTUALIZACIÓN DE updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_customer_addresses_updated_at ON public.customer_addresses;
CREATE TRIGGER trg_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_custom_requests_updated_at ON public.custom_requests;
CREATE TRIGGER trg_custom_requests_updated_at
  BEFORE UPDATE ON public.custom_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_download_links_updated_at ON public.download_links;
CREATE TRIGGER trg_download_links_updated_at
  BEFORE UPDATE ON public.download_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_carts_updated_at ON public.carts;
CREATE TRIGGER trg_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_order_items_updated_at ON public.order_items;
CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_coupons_updated_at ON public.coupons;
CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_refunds_updated_at ON public.refunds;
CREATE TRIGGER trg_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. CÁLCULO AUTOMÁTICO DE VENCIMIENTO DE PEDIDOS DESDE store_settings (72h DEFAULT)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_set_order_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours INTEGER := 72;
  v_raw JSONB;
BEGIN
  SELECT value INTO v_raw
  FROM public.store_settings
  WHERE key = 'order_expiration_hours';

  IF v_raw IS NOT NULL AND jsonb_typeof(v_raw) = 'number' THEN
    v_hours := GREATEST((v_raw #>> '{}')::INTEGER, 1);
  END IF;

  IF NEW.placed_at IS NULL THEN
    NEW.placed_at := now();
  END IF;

  -- Si no se especificó un expires_at personalizado explícito, calcular desde placed_at + v_hours
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.placed_at + make_interval(hours => v_hours);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_set_expiration ON public.orders;
CREATE TRIGGER trg_orders_set_expiration
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_order_expiration();

-- =============================================================================
-- 4. TRIGGER DE NO SOBREASIGNACIÓN Y RECÁLCULO DE SALDOS POR PRODUCTO Y PEDIDO
-- (trg_payment_allocations_integrity)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_payment_allocations_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_item RECORD;
  v_total_allocated_for_payment NUMERIC(10,2);
  v_total_allocated_for_item NUMERIC(10,2);
  v_new_order_total_paid NUMERIC(10,2);
  v_order RECORD;
  v_is_fully_paid BOOLEAN;
  v_new_item_payment_status VARCHAR(25);
  v_new_item_delivery_status VARCHAR(25);
BEGIN
  -- 1. Obtener y validar el pago origen
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = NEW.payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pago referenciado (%) no existe.', NEW.payment_id;
  END IF;

  IF v_payment.verification_status <> 'APROBADO' OR v_payment.amount_verified IS NULL THEN
    RAISE EXCEPTION 'Solo se pueden asignar montos de pagos verificados en estado APROBADO.';
  END IF;

  -- 2. Obtener y validar el ítem del pedido
  SELECT * INTO v_item
  FROM public.order_items
  WHERE id = NEW.order_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El ítem de pedido referenciado (%) no existe.', NEW.order_item_id;
  END IF;

  IF v_item.order_id <> v_payment.order_id THEN
    RAISE EXCEPTION 'El producto asignado no pertenece al mismo pedido del pago.';
  END IF;

  -- 3. Validar no sobreasignación del pago verificado
  SELECT COALESCE(SUM(allocated_amount), 0.00) INTO v_total_allocated_for_payment
  FROM public.payment_allocations
  WHERE payment_id = NEW.payment_id
    AND is_reversed = false
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF NOT NEW.is_reversed THEN
    v_total_allocated_for_payment := v_total_allocated_for_payment + NEW.allocated_amount;
  END IF;

  IF v_total_allocated_for_payment > v_payment.amount_verified THEN
    RAISE EXCEPTION 'Sobreasignación de pago prohibida: la suma asignada (S/ %) supera el monto verificado del pago (S/ %).',
      v_total_allocated_for_payment, v_payment.amount_verified;
  END IF;

  -- 4. Validar no sobreasignación del precio neto del producto
  SELECT COALESCE(SUM(allocated_amount), 0.00) INTO v_total_allocated_for_item
  FROM public.payment_allocations
  WHERE order_item_id = NEW.order_item_id
    AND is_reversed = false
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF NOT NEW.is_reversed THEN
    v_total_allocated_for_item := v_total_allocated_for_item + NEW.allocated_amount;
  END IF;

  IF v_total_allocated_for_item > v_item.subtotal_price THEN
    RAISE EXCEPTION 'Sobreasignación por producto prohibida: el monto asignado al producto (S/ %) supera su precio neto (S/ %).',
      v_total_allocated_for_item, v_item.subtotal_price;
  END IF;

  -- 5. Actualizar saldos y estados del ítem del pedido
  v_is_fully_paid := (v_total_allocated_for_item = v_item.subtotal_price);

  IF v_is_fully_paid THEN
    v_new_item_payment_status := 'PAGADO_100';
  ELSIF v_total_allocated_for_item > 0.00 THEN
    v_new_item_payment_status := 'PAGO_PARCIAL';
  ELSE
    v_new_item_payment_status := 'SIN_PAGO';
  END IF;

  v_new_item_delivery_status := v_item.item_delivery_status;
  IF v_is_fully_paid AND v_item.item_delivery_status = 'PENDIENTE_PAGO' THEN
    v_new_item_delivery_status := 'LISTO_PARA_ENTREGA';
  ELSIF NOT v_is_fully_paid AND v_item.item_delivery_status = 'LISTO_PARA_ENTREGA' THEN
    v_new_item_delivery_status := 'PENDIENTE_PAGO';
  END IF;

  UPDATE public.order_items
  SET allocated_paid_amount = v_total_allocated_for_item,
      pending_item_balance = GREATEST(subtotal_price - v_total_allocated_for_item, 0.00),
      is_fully_paid = v_is_fully_paid,
      item_payment_status = v_new_item_payment_status,
      item_delivery_status = v_new_item_delivery_status
  WHERE id = NEW.order_item_id;

  -- 6. Recalcular el total pagado verificado y saldo del pedido general
  SELECT COALESCE(SUM(allocated_paid_amount), 0.00) INTO v_new_order_total_paid
  FROM public.order_items
  WHERE order_id = v_item.order_id;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_item.order_id;

  UPDATE public.orders
  SET total_paid_amount = v_new_order_total_paid,
      pending_balance_amount = GREATEST(net_amount - v_new_order_total_paid, 0.00),
      order_status = CASE
        WHEN order_status IN ('COMPLETADO', 'CANCELADO', 'REEMBOLSADO') THEN order_status
        WHEN v_new_order_total_paid >= net_amount THEN 'PAGO_VERIFICADO'
        WHEN v_new_order_total_paid > 0.00 THEN 'PAGO_PARCIAL'
        ELSE order_status
      END
  WHERE id = v_item.order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_allocations_integrity ON public.payment_allocations;
CREATE TRIGGER trg_payment_allocations_integrity
  BEFORE INSERT OR UPDATE ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.fn_payment_allocations_integrity();

-- =============================================================================
-- 5. TRIGGER DE PRESERVACIÓN DE PAGOS Y SALDOS HISTÓRICOS EN PEDIDOS VENCIDOS
-- (trg_preserve_expired_balances)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_preserve_expired_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cuando un pedido pasa a VENCIDO, registrar expired_at y prohibir alterar pagos o saldos históricos
  IF NEW.order_status = 'VENCIDO' THEN
    IF OLD.order_status IN ('COMPLETADO', 'CANCELADO', 'REEMBOLSADO') THEN
      RAISE EXCEPTION 'No se puede marcar como VENCIDO un pedido en estado %.', OLD.order_status;
    END IF;

    IF NEW.total_paid_amount <> OLD.total_paid_amount
       OR NEW.pending_balance_amount <> OLD.pending_balance_amount
       OR NEW.net_amount <> OLD.net_amount THEN
      RAISE EXCEPTION 'Al vencer un pedido (VENCIDO), está estrictamente prohibido eliminar pagos o alterar los saldos históricos.';
    END IF;

    IF NEW.expired_at IS NULL THEN
      NEW.expired_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preserve_expired_balances ON public.orders;
CREATE TRIGGER trg_preserve_expired_balances
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_preserve_expired_balances();

-- Impedir eliminación de pagos verificados o asignaciones de pagos
CREATE OR REPLACE FUNCTION public.fn_prevent_payment_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Por trazabilidad financiera e integridad histórica, no se permite eliminar registros de pagos ni asignaciones.';
END;
$$;

DROP TRIGGER IF EXISTS trg_no_delete_payments ON public.payments;
CREATE TRIGGER trg_no_delete_payments
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_payment_deletion();

DROP TRIGGER IF EXISTS trg_no_delete_allocations ON public.payment_allocations;
CREATE TRIGGER trg_no_delete_allocations
  BEFORE DELETE ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_payment_deletion();

-- =============================================================================
-- 6. TRIGGER DE CONTROL DE ENTREGA EXCLUSIVAMENTE AL 100 % DE PAGO
-- (trg_delivery_requires_full_payment)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_delivery_requires_full_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_order RECORD;
BEGIN
  SELECT * INTO v_item
  FROM public.order_items
  WHERE id = NEW.order_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El ítem de pedido asociado a la entrega no existe.';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_item.order_id;

  -- Si se intenta habilitar o marcar como enviado el enlace, verificar pago al 100% y que el pedido no esté cancelado
  IF (NEW.is_enabled = true OR NEW.sent_at IS NOT NULL) THEN
    IF v_order.order_status = 'CANCELADO' THEN
      RAISE EXCEPTION 'No se puede habilitar ni enviar la entrega de un pedido CANCELADO.';
    END IF;

    IF v_item.is_fully_paid = false OR v_item.allocated_paid_amount < v_item.subtotal_price THEN
      RAISE EXCEPTION 'Prohibido habilitar o entregar un producto que no esté pagado al 100 %%.';
    END IF;
  END IF;

  -- Si se registra el envío por WhatsApp (sent_at IS NOT NULL), actualizar el estado del ítem a ENTREGADO
  IF NEW.sent_at IS NOT NULL AND NEW.revoked_at IS NULL THEN
    UPDATE public.order_items
    SET item_delivery_status = 'ENTREGADO'
    WHERE id = NEW.order_item_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_requires_full_payment ON public.deliveries;
CREATE TRIGGER trg_delivery_requires_full_payment
  BEFORE INSERT OR UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.fn_delivery_requires_full_payment();

-- =============================================================================
-- 7. TRIGGER DE CANCELACIÓN MANUAL Y BLOQUEO DE ENTREGAS PENDIENTES
-- (trg_order_cancellation_block)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_order_cancellation_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolution RECORD;
BEGIN
  -- 1. Verificar que exista la resolución administrativa obligatoria para el mismo pedido
  SELECT * INTO v_resolution
  FROM public.administrative_resolutions
  WHERE id = NEW.resolution_id
    AND order_id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Toda cancelación manual exige una resolución administrativa válida vinculada al mismo pedido.';
  END IF;

  -- 2. Forzar indicador de bloqueo de entregas pendientes
  NEW.pending_deliveries_blocked := true;

  -- 3. Bloquear/revocar todas las entregas pendientes de productos cuyo enlace aún no fue enviado
  UPDATE public.deliveries d
  SET is_enabled = false,
      revoked_at = COALESCE(d.revoked_at, now()),
      revocation_reason = COALESCE(d.revocation_reason, 'Cancelación manual del pedido: ' || NEW.cancellation_reason)
  FROM public.order_items oi
  WHERE d.order_item_id = oi.id
    AND oi.order_id = NEW.order_id
    AND d.sent_at IS NULL;

  -- 4. Marcar como REVOCADO el estado de entrega de los ítems pendientes del pedido
  UPDATE public.order_items
  SET item_delivery_status = 'REVOCADO'
  WHERE order_id = NEW.order_id
    AND item_delivery_status <> 'ENTREGADO';

  -- 5. Cambiar estado general del pedido a CANCELADO
  UPDATE public.orders
  SET order_status = 'CANCELADO'
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_cancellation_block ON public.order_cancellations;
CREATE TRIGGER trg_order_cancellation_block
  BEFORE INSERT ON public.order_cancellations
  FOR EACH ROW EXECUTE FUNCTION public.fn_order_cancellation_block();

-- =============================================================================
-- 8. TRIGGER DE PROHIBICIÓN DE REEMBOLSO EN PRODUCTOS CON ENLACE ENVIADO
-- (trg_prevent_delivered_refund)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_prevent_delivered_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_delivery_sent BOOLEAN;
BEGIN
  SELECT * INTO v_item
  FROM public.order_items
  WHERE id = NEW.order_item_id
    AND order_id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto indicado para reembolso no pertenece al pedido especificado.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.deliveries
    WHERE order_item_id = NEW.order_item_id
      AND sent_at IS NOT NULL
  ) INTO v_delivery_sent;

  IF v_item.item_delivery_status = 'ENTREGADO' OR v_delivery_sent THEN
    RAISE EXCEPTION 'Regla de negocio violada: Un producto cuyo enlace ya fue enviado (ENTREGADO) no es reembolsable.';
  END IF;

  IF NEW.refund_amount > v_item.allocated_paid_amount THEN
    RAISE EXCEPTION 'El monto a reembolsar (S/ %) no puede superar el monto pagado asignado al producto (S/ %).',
      NEW.refund_amount, v_item.allocated_paid_amount;
  END IF;

  -- Cuando el reembolso se marca como COMPLETADO (con datos reales de devolución verificados por CHECK)
  IF NEW.refund_status = 'COMPLETADO' AND (TG_OP = 'INSERT' OR OLD.refund_status <> 'COMPLETADO') THEN
    UPDATE public.order_items
    SET item_payment_status = 'REEMBOLSADO',
        item_delivery_status = 'REVOCADO'
    WHERE id = NEW.order_item_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delivered_refund ON public.refunds;
CREATE TRIGGER trg_prevent_delivered_refund
  BEFORE INSERT OR UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_delivered_refund();

-- =============================================================================
-- 9. TRIGGER DE TRAZABILIDAD AUTOMÁTICA DE ESTADOS DEL PEDIDO
-- (trg_order_status_history)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_record_order_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by_user_id, comment)
    VALUES (NEW.id, NULL, NEW.order_status, auth.uid(), 'Creación inicial del pedido en checkout.');
  ELSIF TG_OP = 'UPDATE' AND NEW.order_status IS DISTINCT FROM OLD.order_status THEN
    INSERT INTO public.order_status_history (order_id, previous_status, new_status, changed_by_user_id, comment)
    VALUES (NEW.id, OLD.order_status, NEW.order_status, auth.uid(), 'Cambio de estado registrado automáticamente.');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_history ON public.orders;
CREATE TRIGGER trg_order_status_history
  AFTER INSERT OR UPDATE OF order_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_record_order_status_history();

-- =============================================================================
-- 10. TRIGGER DE SINCRONIZACIÓN AUTOMÁTICA DE REGISTRO (auth.users -> profiles + customers)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name VARCHAR(150);
  v_phone VARCHAR(25);
  v_doc_type VARCHAR(10);
  v_doc_num VARCHAR(20);
BEGIN
  v_full_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1));
  v_phone := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'phone_number'), ''), '51900000000');
  v_doc_type := NULLIF(trim(NEW.raw_user_meta_data->>'document_type'), '');
  v_doc_num := NULLIF(trim(NEW.raw_user_meta_data->>'document_number'), '');

  INSERT INTO public.profiles (
    id,
    role_id,
    email,
    full_name,
    phone_number,
    document_type,
    document_number,
    is_active
  )
  VALUES (
    NEW.id,
    'customer',
    lower(trim(NEW.email)),
    v_full_name,
    v_phone,
    v_doc_type,
    v_doc_num,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (
    id,
    billing_document_type,
    billing_document_number,
    total_orders_count,
    total_spent_amount
  )
  VALUES (
    NEW.id,
    CASE WHEN v_doc_type IN ('DNI', 'RUC') THEN v_doc_type ELSE NULL END,
    v_doc_num,
    0,
    0.00
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

