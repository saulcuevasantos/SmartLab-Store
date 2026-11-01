-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 005: CORRECCIÓN RETROACTIVA SPRINT 03
-- PROCEDIMIENTO SEGURO DE CREACIÓN DEL PRIMER ADMINISTRADOR Y BLINDAJE DE ROL
-- Motor: PostgreSQL (Supabase)
-- Referencia: docs/02_REQUERIMIENTOS.md, docs/03_ARQUITECTURA.md,
--             docs/04_BASE_DATOS.md, docs/07_SEGURIDAD.md, docs/08_PLAN_SPRINTS.md
-- =============================================================================

-- 1. Compatibilidad condicional con catálogo public.roles (SOLO si la tabla existe en la BD).
--    No asume ni exige que exista public.roles; si el esquema almacena el rol directamente
--    en public.profiles.role_id sin tabla public.roles, este bloque se omite sin error 42P01.
DO $$
BEGIN
  IF to_regclass('public.roles') IS NOT NULL THEN
    INSERT INTO public.roles (id, name, description) VALUES
      ('admin', 'Administrador', 'Acceso total al panel administrativo, verificación de pagos, entregas y auditoría.'),
      ('ADMIN', 'Administrador', 'Alias en mayúsculas del rol Administrador para compatibilidad RBAC.'),
      ('customer', 'Cliente', 'Acceso a cuenta personal, historial de pedidos, estados y enlaces autorizados.')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 2. Actualizar public.is_admin() para validar de forma insensible a mayúsculas ('admin' o 'ADMIN')
--    directamente sobre public.profiles y exigir que el perfil esté activo (is_active = true).
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
      AND upper(trim(role_id)) = 'ADMIN'
      AND is_active = true
  );
$$;

-- 3. Endurecer el trigger de registro automático (auth.users -> public.profiles [+ public.customers])
--    Regla crítica: Ignora por completo cualquier metadato "role", "role_id" o "is_admin" enviado
--    desde el navegador en raw_user_meta_data. Todo usuario registrado nace siempre como 'customer'.
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

  IF v_doc_type IS NOT NULL AND v_doc_type NOT IN ('DNI', 'RUC', 'CE', 'OTRO') THEN
    v_doc_type := NULL;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
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
      'customer', -- Forzado estrictamente a 'customer'
      lower(trim(NEW.email)),
      v_full_name,
      v_phone,
      v_doc_type,
      v_doc_num,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.customers') IS NOT NULL THEN
    INSERT INTO public.customers (
      id,
      billing_business_name,
      billing_document_type,
      billing_document_number,
      total_orders_count,
      total_spent_amount
    )
    VALUES (
      NEW.id,
      v_full_name,
      CASE WHEN v_doc_type IN ('DNI', 'RUC') THEN v_doc_type ELSE NULL END,
      v_doc_num,
      0,
      0.00
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger de Defensa en Profundidad en public.profiles contra auto-asignación o escalamiento de rol
--    Impide que cualquier usuario autenticado (no administrador) se asigne el rol 'admin'/'ADMIN'
--    en INSERT o modifique su role_id / is_active / email en UPDATE desde la API pública (PostgREST).
--    Solo permite el cambio cuando:
--      a) Lo ejecuta el propietario del proyecto desde el SQL Editor de Supabase (auth.uid() IS NULL
--         y current_user IN ('postgres', 'supabase_admin', 'service_role')), o
--      b) Lo ejecuta un administrador ya autenticado y activo (public.is_admin() = true).
CREATE OR REPLACE FUNCTION public.fn_prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_privileged_db_context BOOLEAN := false;
BEGIN
  v_is_privileged_db_context := (
    auth.uid() IS NULL
    AND current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin')
  ) OR (
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
  );

  IF TG_OP = 'INSERT' THEN
    IF NOT v_is_privileged_db_context AND NOT public.is_admin() THEN
      -- Forzar que cualquier inserción desde cliente nazca únicamente como 'customer' activo
      NEW.role_id := 'customer';
      NEW.is_active := true;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NOT v_is_privileged_db_context AND NOT public.is_admin() THEN
      IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
        RAISE EXCEPTION 'Seguridad RBAC: No está permitido auto-asignarse ni modificar el rol del perfil.';
      END IF;

      IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Seguridad RBAC: No está permitido modificar el estado de activación de la cuenta.';
      END IF;

      IF lower(trim(NEW.email)) IS DISTINCT FROM lower(trim(OLD.email)) THEN
        RAISE EXCEPTION 'Seguridad RBAC: El correo electrónico de identificación de la cuenta no puede alterarse directamente.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
    CREATE TRIGGER trg_prevent_profile_role_escalation
      BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_profile_role_escalation();
  END IF;
END $$;

-- 5. Función administrativa controlada para promover el primer (o nuevo) administrador desde Supabase SQL Editor
--    NOTA DE SEGURIDAD: Se revoca su ejecución para 'PUBLIC', 'anon' y 'authenticated', por lo que
--    JAMÁS puede ser invocada desde el navegador vía supabase.rpc(). Solo puede ejecutarse desde el
--    SQL Editor de Supabase (rol postgres) o por un administrador verificado.
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_email TEXT)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_profile public.profiles;
  v_clean_email TEXT;
BEGIN
  -- Bloquear si alguien intenta invocarla desde una sesión de cliente normal sin rol admin
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: Solo la consola SQL de Supabase o un administrador activo puede promover cuentas al rol ADMIN.';
  END IF;

  v_clean_email := lower(trim(COALESCE(p_email, '')));
  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'Debes proporcionar el correo electrónico del usuario previamente registrado.';
  END IF;

  -- Si existe tabla public.roles, asegurar que 'admin' esté presente antes del UPDATE
  IF to_regclass('public.roles') IS NOT NULL THEN
    INSERT INTO public.roles (id, name, description)
    VALUES ('admin', 'Administrador', 'Acceso total al panel administrativo.')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  UPDATE public.profiles
  SET role_id = 'admin',
      is_active = true,
      updated_at = now()
  WHERE lower(trim(email)) = v_clean_email
  RETURNING * INTO v_target_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró ningún perfil registrado con el correo "%". Primero registra el usuario con correo y contraseña en /registro (o desde Authentication -> Users en Supabase) y luego ejecuta esta función.', v_clean_email;
  END IF;

  -- Registrar en la bitácora inmutable de auditoría si la tabla public.audit_logs existe
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id,
      entity_type,
      entity_id,
      action,
      old_data,
      new_data
    ) VALUES (
      COALESCE(auth.uid(), v_target_profile.id),
      'CONFIG',
      v_target_profile.id::VARCHAR,
      'UPDATE',
      jsonb_build_object('role_id', 'customer', 'email', v_target_profile.email),
      jsonb_build_object('role_id', 'admin', 'email', v_target_profile.email, 'promoted_via', 'promote_user_to_admin')
    );
  END IF;

  RETURN v_target_profile;
END;
$$;

-- Bloquear invocación pública desde la API REST de cliente (anon / authenticated)
REVOKE ALL ON FUNCTION public.promote_user_to_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(TEXT) FROM authenticated;
