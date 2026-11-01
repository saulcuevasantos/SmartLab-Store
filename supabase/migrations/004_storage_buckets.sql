-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 004: BUCKETS DE SUPABASE STORAGE Y POLÍTICAS DE ACCESO
-- Motor: PostgreSQL / Supabase Storage
-- Referencia: docs/03_ARQUITECTURA.md (Sección 4.2) y docs/07_SEGURIDAD.md (Sección 5)
-- =============================================================================

-- 1. Creación de los Buckets Oficiales
-- public-assets: público para lectura (portadas 1:1, capturas de productos, banners, QR de cobro)
-- payment-receipts: privado (comprobantes de Yape/Plin/Transferencia y constancias de reembolso)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880, -- 5 MB máximo por imagen
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880, -- 5 MB máximo por comprobante
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- 2. POLÍTICAS RLS SOBRE storage.objects PARA EL BUCKET PÚBLICO (public-assets)
-- =============================================================================

-- Lectura pública de activos gráficos de la tienda
CREATE POLICY "public_assets_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

-- Carga, actualización y eliminación exclusivas para administradores
CREATE POLICY "public_assets_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public-assets'
    AND public.is_admin()
  );

CREATE POLICY "public_assets_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'public-assets'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'public-assets'
    AND public.is_admin()
  );

CREATE POLICY "public_assets_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'public-assets'
    AND public.is_admin()
  );

-- =============================================================================
-- 3. POLÍTICAS RLS SOBRE storage.objects PARA EL BUCKET PRIVADO (payment-receipts)
-- Estructura de ruta esperada: {customer_uid}/{order_id}/{filename}
-- =============================================================================

-- Lectura permitida al administrador o al cliente propietario de la carpeta raíz
CREATE POLICY "payment_receipts_select_owner_or_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.is_admin()
      OR (
        auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    )
  );

-- Carga de comprobantes permitida al administrador o al cliente autenticado en su propia carpeta
CREATE POLICY "payment_receipts_insert_owner_or_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (
      public.is_admin()
      OR (
        auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    )
  );

-- Actualización y eliminación reservadas exclusivamente al administrador
CREATE POLICY "payment_receipts_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-receipts'
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND public.is_admin()
  );

CREATE POLICY "payment_receipts_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payment-receipts'
    AND public.is_admin()
  );
