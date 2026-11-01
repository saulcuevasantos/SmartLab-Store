-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 006: SPRINT B2 — SOPORTE DE IMAGEN EN CATEGORÍAS
-- Agrega la columna opcional image_url a public.categories para almacenar URLs
-- públicas de imágenes e iconos personalizados en el bucket public-assets.
-- No altera columnas existentes, políticas RLS, triggers, llaves foráneas ni registros.
-- =============================================================================

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS image_url TEXT;
