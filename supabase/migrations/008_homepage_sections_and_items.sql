-- =============================================================================
-- SMARTLAB STORE — MIGRACIÓN 008: SPRINT C2 — PORTADA DINÁMICA Y HERO BANNER
-- Motor: PostgreSQL (Supabase)
-- Referencia: docs/09_PORTADA_Y_PROMOCIONES.md, docs/04_BASE_DATOS.md, docs/07_SEGURIDAD.md
--
-- Implementa las tres tablas aprobadas en el Sprint C1:
--   1. public.homepage_sections
--   2. public.homepage_section_items
--   3. public.homepage_section_targets
--
-- Incluye:
--   - Restricciones de integridad (tipos de sección/ítem, vigencias starts_at/ends_at,
--     bloqueo de protocolos peligrosos en URLs y validación de entidades en targets).
--   - Claves foráneas hacia public.profiles(id) [UUID], public.categories(id) [VARCHAR(50)]
--     y public.products(id) [UUID].
--   - Triggers de actualización automática de updated_at (public.handle_updated_at()).
--   - Políticas RLS diferenciadas: lectura pública exclusiva de contenido publicado,
--     activo y vigente; control total y previsualización de borradores para public.is_admin().
--   - Semilla inicial idempotente de la sección 'hero_main' y sus 3 slides base.
--   - NO modifica ni altera ninguna tabla comercial existente.
-- =============================================================================

-- =============================================================================
-- 1. FUNCIÓN AUXILIAR DE VALIDACIÓN DE URL SEGURA (ANTI-XSS EN ENLACES DE PORTADA)
-- Permite NULL, vacío, rutas internas que inicien con '/' (pero no '//')
-- o URLs externas con protocolo http:// o https://.
-- Rechaza javascript:, data:, vbscript:, file:, etc.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_safe_homepage_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_url IS NULL
    OR btrim(p_url) = ''
    OR (
      left(btrim(p_url), 1) = '/'
      AND left(btrim(p_url), 2) <> '//'
      AND lower(btrim(p_url)) !~ '^(javascript|data|vbscript|file):'
    )
    OR (
      lower(btrim(p_url)) ~ '^https?://[^\s]+$'
    );
$$;

-- =============================================================================
-- 2. TABLA MAESTRA DE SECCIONES DE PORTADA: public.homepage_sections
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) UNIQUE,
  section_type VARCHAR(40) NOT NULL CHECK (
    section_type IN (
      'HERO_BANNER',
      'VALUE_PROPOSITION',
      'DEAL_OF_THE_DAY',
      'CATEGORY_TABS_SHOWCASE',
      'FEATURED_CATEGORIES',
      'PRODUCT_COLLECTION',
      'PROMO_BANNERS',
      'FREE_RESOURCES',
      'CUSTOM_SERVICES_CTA',
      'INFO_BLOCK'
    )
  ),
  admin_name VARCHAR(120) NOT NULL,
  title VARCHAR(200),
  subtitle TEXT,
  badge_text VARCHAR(80),
  badge_variant VARCHAR(30) CHECK (
    badge_variant IS NULL
    OR badge_variant IN (
      'FREE',
      'PRO',
      'PERSONALIZADO',
      'discount',
      'primary',
      'success',
      'warning',
      'danger',
      'neutral',
      'dark'
    )
  ),
  cta_label VARCHAR(80),
  cta_url TEXT CHECK (public.is_safe_homepage_url(cta_url)),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' CHECK (
    status IN ('DRAFT', 'PUBLISHED')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  updated_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_homepage_sections_admin_name_nonempty CHECK (length(btrim(admin_name)) >= 2),
  CONSTRAINT chk_homepage_sections_schedule_range CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_order
  ON public.homepage_sections(display_order ASC);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_public_active
  ON public.homepage_sections(is_active, status, display_order ASC);

DROP TRIGGER IF EXISTS trg_homepage_sections_updated_at ON public.homepage_sections;
CREATE TRIGGER trg_homepage_sections_updated_at
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 3. TABLA DE ELEMENTOS REPETIBLES POR SECCIÓN: public.homepage_section_items
-- (Slides del Hero, tarjetas promocionales laterales, banners secundarios,
--  tarjetas de beneficios y bloques informativos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.homepage_section_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  item_type VARCHAR(30) NOT NULL CHECK (
    item_type IN (
      'HERO_SLIDE',
      'PROMO_CARD',
      'SECONDARY_BANNER',
      'BENEFIT_ITEM',
      'INFO_CARD'
    )
  ),
  admin_name VARCHAR(120) NOT NULL DEFAULT 'Elemento de portada',
  badge_text VARCHAR(80),
  badge_variant VARCHAR(30) CHECK (
    badge_variant IS NULL
    OR badge_variant IN (
      'FREE',
      'PRO',
      'PERSONALIZADO',
      'discount',
      'primary',
      'success',
      'warning',
      'danger',
      'neutral',
      'dark'
    )
  ),
  title VARCHAR(220) NOT NULL,
  subtitle TEXT,
  icon_name VARCHAR(50),
  icon_color_hex VARCHAR(7) CHECK (
    icon_color_hex IS NULL OR icon_color_hex ~ '^#[0-9A-Fa-f]{6}$'
  ),
  image_desktop_url TEXT CHECK (public.is_safe_homepage_url(image_desktop_url)),
  image_mobile_url TEXT CHECK (public.is_safe_homepage_url(image_mobile_url)),
  image_alt_text VARCHAR(200),
  cta_primary_label VARCHAR(80),
  cta_primary_url TEXT CHECK (public.is_safe_homepage_url(cta_primary_url)),
  cta_secondary_label VARCHAR(80),
  cta_secondary_url TEXT CHECK (public.is_safe_homepage_url(cta_secondary_url)),
  open_in_new_tab BOOLEAN NOT NULL DEFAULT false,
  category_id VARCHAR(50) REFERENCES public.categories(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  style_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' CHECK (
    status IN ('DRAFT', 'PUBLISHED')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  updated_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_homepage_items_admin_name_nonempty CHECK (length(btrim(admin_name)) >= 2),
  CONSTRAINT chk_homepage_items_title_nonempty CHECK (length(btrim(title)) >= 2),
  CONSTRAINT chk_homepage_items_schedule_range CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_homepage_items_section_order
  ON public.homepage_section_items(section_id, item_type, display_order ASC);

CREATE INDEX IF NOT EXISTS idx_homepage_items_public_active
  ON public.homepage_section_items(section_id, is_active, status, display_order ASC);

DROP TRIGGER IF EXISTS trg_homepage_section_items_updated_at ON public.homepage_section_items;
CREATE TRIGGER trg_homepage_section_items_updated_at
  BEFORE UPDATE ON public.homepage_section_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 4. TABLA DE CURADURÍA RELACIONAL ORDENADA: public.homepage_section_targets
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.homepage_section_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (
    target_type IN ('PRODUCT', 'CATEGORY')
  ),
  collection_key VARCHAR(40) NOT NULL DEFAULT 'default',
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id VARCHAR(50) REFERENCES public.categories(id) ON DELETE CASCADE,
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_homepage_targets_entity CHECK (
    (target_type = 'PRODUCT' AND product_id IS NOT NULL AND category_id IS NULL)
    OR (target_type = 'CATEGORY' AND category_id IS NOT NULL AND product_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_homepage_targets_product
  ON public.homepage_section_targets(section_id, collection_key, product_id)
  WHERE product_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_homepage_targets_category
  ON public.homepage_section_targets(section_id, collection_key, category_id)
  WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_homepage_targets_section_order
  ON public.homepage_section_targets(section_id, collection_key, display_order ASC);

-- =============================================================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS) Y DEFINIR POLÍTICAS DIFERENCIADAS
-- =============================================================================
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_section_targets ENABLE ROW LEVEL SECURITY;

-- 5.1. Políticas para public.homepage_sections
DROP POLICY IF EXISTS "homepage_sections_select_public_or_admin" ON public.homepage_sections;
CREATE POLICY "homepage_sections_select_public_or_admin"
  ON public.homepage_sections FOR SELECT
  USING (
    public.is_admin()
    OR (
      is_active = true
      AND status = 'PUBLISHED'
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
    )
  );

DROP POLICY IF EXISTS "homepage_sections_admin_all" ON public.homepage_sections;
CREATE POLICY "homepage_sections_admin_all"
  ON public.homepage_sections FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.2. Políticas para public.homepage_section_items
DROP POLICY IF EXISTS "homepage_section_items_select_public_or_admin" ON public.homepage_section_items;
CREATE POLICY "homepage_section_items_select_public_or_admin"
  ON public.homepage_section_items FOR SELECT
  USING (
    public.is_admin()
    OR (
      is_active = true
      AND status = 'PUBLISHED'
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
      AND EXISTS (
        SELECT 1
        FROM public.homepage_sections s
        WHERE s.id = homepage_section_items.section_id
          AND s.is_active = true
          AND s.status = 'PUBLISHED'
          AND (s.starts_at IS NULL OR s.starts_at <= now())
          AND (s.ends_at IS NULL OR s.ends_at >= now())
      )
    )
  );

DROP POLICY IF EXISTS "homepage_section_items_admin_all" ON public.homepage_section_items;
CREATE POLICY "homepage_section_items_admin_all"
  ON public.homepage_section_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.3. Políticas para public.homepage_section_targets
DROP POLICY IF EXISTS "homepage_section_targets_select_public_or_admin" ON public.homepage_section_targets;
CREATE POLICY "homepage_section_targets_select_public_or_admin"
  ON public.homepage_section_targets FOR SELECT
  USING (
    public.is_admin()
    OR (
      is_active = true
      AND EXISTS (
        SELECT 1
        FROM public.homepage_sections s
        WHERE s.id = homepage_section_targets.section_id
          AND s.is_active = true
          AND s.status = 'PUBLISHED'
          AND (s.starts_at IS NULL OR s.starts_at <= now())
          AND (s.ends_at IS NULL OR s.ends_at >= now())
      )
    )
  );

DROP POLICY IF EXISTS "homepage_section_targets_admin_all" ON public.homepage_section_targets;
CREATE POLICY "homepage_section_targets_admin_all"
  ON public.homepage_section_targets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 6. SEMILLA INICIAL IDEMPOTENTE PARA LA SECCIÓN HERO BANNER Y SUS 3 SLIDES
-- =============================================================================
INSERT INTO public.homepage_sections (
  id,
  code,
  section_type,
  admin_name,
  title,
  subtitle,
  config_json,
  display_order,
  status,
  is_active
)
VALUES (
  '00000000-0000-4000-8000-000000000101',
  'hero_main',
  'HERO_BANNER',
  'Hero Banner Principal y Carrusel',
  'Hero Panorámico Principal',
  'Carrusel principal de bienvenida y campañas destacadas de SmartLab Store.',
  '{"auto_play": true, "auto_play_interval_ms": 6000, "show_side_promo_cards": true}'::jsonb,
  1,
  'PUBLISHED',
  true
)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  v_hero_section_id UUID;
BEGIN
  SELECT id INTO v_hero_section_id
  FROM public.homepage_sections
  WHERE code = 'hero_main'
  LIMIT 1;

  IF v_hero_section_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.homepage_section_items
    WHERE section_id = v_hero_section_id
      AND item_type = 'HERO_SLIDE'
  ) THEN
    INSERT INTO public.homepage_section_items (
      id,
      section_id,
      item_type,
      admin_name,
      badge_text,
      badge_variant,
      title,
      subtitle,
      cta_primary_label,
      cta_primary_url,
      cta_secondary_label,
      cta_secondary_url,
      open_in_new_tab,
      display_order,
      status,
      is_active
    ) VALUES
    (
      '00000000-0000-4000-8000-000000000201',
      v_hero_section_id,
      'HERO_SLIDE',
      'Slide 1 — Plantillas y Sistemas PRO',
      'PLANTILLAS Y SISTEMAS PRO',
      'PRO',
      'Automatiza tu Empresa con Herramientas Listas para Usar en Soles (S/)',
      'Kardex Valorizado SUNAT, Planillas, CRM en Google Sheets, Sistemas POS y Apps Android. Paga con Yape, Plin o transferencia y recibe tu enlace verificado por WhatsApp.',
      'Explorar Catálogo PRO',
      '/catalogo?modalidad=PRO',
      'Recursos FREE',
      '/catalogo?modalidad=FREE',
      false,
      1,
      'PUBLISHED',
      true
    ),
    (
      '00000000-0000-4000-8000-000000000202',
      v_hero_section_id,
      'HERO_SLIDE',
      'Slide 2 — Sistemas Web y Apps Android',
      'SISTEMAS WEB Y APPS ANDROID',
      'primary',
      'Controla tu Punto de Venta, Almacén y Conteo Físico con Escáner APK',
      'Sistemas multiusuario con arqueo de Yape/Plin y aplicaciones Android offline para toma de inventario con cámara o lector láser.',
      'Explorar Catálogo PRO',
      '/catalogo?categoria=sistemas',
      'Recursos FREE',
      '/catalogo?modalidad=FREE',
      false,
      2,
      'PUBLISHED',
      true
    ),
    (
      '00000000-0000-4000-8000-000000000203',
      v_hero_section_id,
      'HERO_SLIDE',
      'Slide 3 — Desarrollo Personalizado a Medida',
      'DESARROLLO PERSONALIZADO A MEDIDA',
      'PERSONALIZADO',
      '¿Necesitas Adaptar una Plantilla o Crear un Sistema para tu Flujo?',
      'Nuestro equipo diseña macros VBA, integraciones con Google Apps Script y sistemas corporativos bajo cotización directa por WhatsApp.',
      'Cotizar Proyecto a Medida',
      '/solicitud-personalizada',
      'Recursos FREE',
      '/catalogo?modalidad=FREE',
      false,
      3,
      'PUBLISHED',
      true
    );
  END IF;
END $$;
