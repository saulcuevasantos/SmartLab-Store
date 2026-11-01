-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 007: SPRINT B5 — COLOR HEX DE ICONOS EN CATEGORÍAS
-- Incorpora la columna color_hex TEXT en public.categories de forma no destructiva.
-- Asigna colores predeterminados en formato HEX (#RRGGBB) a las categorías
-- existentes únicamente cuando aún no tengan un valor configurado en color_hex.
-- No modifica ni elimina columnas existentes, IDs, slugs, relaciones ni RLS.
-- =============================================================================

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS color_hex TEXT;

-- Asignar colores iniciales por categoría únicamente si color_hex es NULL o vacío
UPDATE public.categories
SET color_hex = '#22C55E'
WHERE (id IN ('excel', 'cat-excel') OR lower(slug) = 'excel')
  AND (color_hex IS NULL OR trim(color_hex) = '');

UPDATE public.categories
SET color_hex = '#059669'
WHERE (id IN ('google_sheets', 'cat-google-sheets') OR lower(slug) IN ('google_sheets', 'google-sheets'))
  AND (color_hex IS NULL OR trim(color_hex) = '');

UPDATE public.categories
SET color_hex = '#3B82F6'
WHERE (id IN ('sistemas', 'cat-sistemas') OR lower(slug) = 'sistemas')
  AND (color_hex IS NULL OR trim(color_hex) = '');

UPDATE public.categories
SET color_hex = '#9333EA'
WHERE (id IN ('android_apps', 'cat-android-apps') OR lower(slug) IN ('android_apps', 'aplicaciones-android'))
  AND (color_hex IS NULL OR trim(color_hex) = '');

UPDATE public.categories
SET color_hex = '#F59E0B'
WHERE (id IN ('automatizaciones', 'cat-automatizaciones') OR lower(slug) = 'automatizaciones')
  AND (color_hex IS NULL OR trim(color_hex) = '');

UPDATE public.categories
SET color_hex = '#F97316'
WHERE (id IN ('recursos_digitales', 'cat-recursos-digitales') OR lower(slug) IN ('recursos_digitales', 'recursos-digitales'))
  AND (color_hex IS NULL OR trim(color_hex) = '');

-- Cualquier otra categoría preexistente sin color configurado recibe el azul predeterminado
UPDATE public.categories
SET color_hex = '#3B82F6'
WHERE color_hex IS NULL OR trim(color_hex) = '';

ALTER TABLE public.categories
ALTER COLUMN color_hex SET DEFAULT '#3B82F6';
