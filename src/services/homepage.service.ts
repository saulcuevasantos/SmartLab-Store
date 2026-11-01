/**
 * SmartLab Store — Servicio de Portada Dinámica: Secciones, Hero Slides, Tarjetas Laterales y Banners Secundarios (Sprints C2 y C3)
 * Referencia: docs/09_PORTADA_Y_PROMOCIONES.md, docs/03_ARQUITECTURA.md, docs/04_BASE_DATOS.md, docs/07_SEGURIDAD.md
 *
 * Responsabilidades:
 * 1. Separar estrictamente las consultas públicas (solo contenido PUBLISHED, activo y vigente)
 *    de las operaciones administrativas (protegidas por RBAC + RLS public.is_admin()).
 * 2. Validar URLs de botones e imágenes bloqueando javascript:, data:, vbscript:, file:, blob: y protocolos peligrosos.
 * 3. Gestionar mediante operaciones secuenciales con limpieza compensatoria las imágenes en public-assets:
 *    - Slides del Hero: home/slides/desktop/ y home/slides/mobile/
 *    - Tarjetas laterales del Hero (PROMO_CARD): home/promos/
 *    - Banners promocionales secundarios (SECONDARY_BANNER): home/banners/desktop/ y home/banners/mobile/
 *    Nunca se elimina la imagen anterior hasta confirmar el guardado en PostgreSQL; si falla PostgreSQL,
 *    se conserva intacta la imagen anterior y se limpia el archivo recién subido para evitar huérfanos.
 */

import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  AutomaticProductCriterion,
  BenefitItemAdminInput,
  BenefitItemMutationResult,
  CategoryShowcaseCollectionKey,
  CategoryShowcaseTabConfig,
  CategoryTabsAdminConfigInput,
  CollectionSectionAdminConfigInput,
  CustomServicesCtaAdminConfigInput,
  DealFallbackBehavior,
  DealOfTheDayAdminConfigInput,
  FreeResourcesAdminConfigInput,
  HOMEPAGE_ALLOWED_LUCIDE_ICONS,
  HomepageAllowedLucideIcon,
  HomepageBadgeVariant,
  HomepageItemType,
  HomepagePublishStatus,
  HomepageSection,
  HomepageSectionAdminInput,
  HomepageSectionItem,
  HomepageSectionMutationResult,
  HomepageSectionTarget,
  HomepageSectionTargetExpanded,
  HomepageSectionType,
  HomepageSectionWithStats,
  HomepageTargetAdminInput,
  HomepageTargetCategorySummary,
  HomepageTargetMutationResult,
  HomepageTargetProductSummary,
  HomepageTargetType,
  HeroSlideAdminInput,
  HeroSlideMutationResult,
  InfoCardAdminInput,
  InfoCardMutationResult,
  PromoCardAdminInput,
  PromoCardMutationResult,
  PublicHomepageSnapshot,
  SecondaryBannerAdminInput,
  SecondaryBannerMutationResult,
  PROTECTED_HOMEPAGE_SECTION_CODES,
} from '../types/homepage.types';
import {
  uploadPublicStoreAsset,
  deletePublicStoreAsset,
  isHomepageSlidePublicAssetUrl,
  isHomepagePromoCardPublicAssetUrl,
  isHomepageBannerPublicAssetUrl,
  isHomepageInfoCardPublicAssetUrl,
} from './storage.service';
import {
  getCategories,
  getProducts,
  getEquivalentCategoryIds,
} from './catalog.service';

export const LOCAL_HOMEPAGE_SECTIONS_KEY = 'smartlab_homepage_sections_v1';
export const LOCAL_HOMEPAGE_ITEMS_KEY = 'smartlab_homepage_items_v1';
export const LOCAL_HOMEPAGE_TARGETS_KEY = 'smartlab_homepage_targets_v1';

export const HERO_MAIN_SECTION_ID = '00000000-0000-4000-8000-000000000101';
export const HERO_MAIN_SECTION_CODE = 'hero_main';

export const VALUE_PROPS_SECTION_ID = '00000000-0000-4000-8000-000000000102';
export const VALUE_PROPS_SECTION_CODE = 'value_props';

export const DEAL_OF_THE_DAY_SECTION_ID = '00000000-0000-4000-8000-000000000103';
export const DEAL_OF_THE_DAY_SECTION_CODE = 'deal_of_the_day';

export const CATEGORY_TABS_SECTION_ID = '00000000-0000-4000-8000-000000000104';
export const CATEGORY_TABS_SECTION_CODE = 'category_tabs';

export const DUAL_BANNERS_SECTION_ID = '00000000-0000-4000-8000-000000000105';
export const DUAL_BANNERS_SECTION_CODE = 'dual_banners';

export const FREE_ZONE_SECTION_ID = '00000000-0000-4000-8000-000000000106';
export const FREE_ZONE_SECTION_CODE = 'free_zone';

export const CUSTOM_CTA_SECTION_ID = '00000000-0000-4000-8000-000000000107';
export const CUSTOM_CTA_SECTION_CODE = 'custom_cta';

export type CampaignScheduleState = 'ACTIVE_NOW' | 'SCHEDULED_FUTURE' | 'EXPIRED';

const VALID_SECTION_TYPES: readonly HomepageSectionType[] = [
  'HERO_BANNER',
  'VALUE_PROPOSITION',
  'DEAL_OF_THE_DAY',
  'CATEGORY_TABS_SHOWCASE',
  'FEATURED_CATEGORIES',
  'PRODUCT_COLLECTION',
  'PROMO_BANNERS',
  'FREE_RESOURCES',
  'CUSTOM_SERVICES_CTA',
  'INFO_BLOCK',
];

const VALID_BADGE_VARANIS: readonly HomepageBadgeVariant[] = [
  'FREE',
  'PRO',
  'PERSONALIZADO',
  'discount',
  'primary',
  'success',
  'warning',
  'danger',
  'neutral',
  'dark',
];

const DANGEROUS_PROTOCOL_REGEX = /^\s*(javascript|data|vbscript|file|blob|about):/i;

// ============================================================================
// 0. SEMILLAS REALES E IDEMPOTENTES DE LA PORTADA (SPRINT C2 + SPRINT C3)
// ============================================================================

export const SEED_HERO_SECTION: HomepageSection = {
  id: HERO_MAIN_SECTION_ID,
  code: HERO_MAIN_SECTION_CODE,
  section_type: 'HERO_BANNER',
  admin_name: 'Hero Banner Principal y Carrusel',
  title: 'Hero Panorámico Principal',
  subtitle: 'Carrusel principal de bienvenida y campañas destacadas de SmartLab Store.',
  badge_text: null,
  badge_variant: null,
  cta_label: null,
  cta_url: null,
  config_json: {
    auto_play: true,
    auto_play_interval_ms: 6000,
    show_side_promo_cards: true,
  },
  display_order: 1,
  status: 'PUBLISHED',
  is_active: true,
  starts_at: null,
  ends_at: null,
  updated_by_user_id: null,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
};

export const SEED_HOMEPAGE_SECTIONS: HomepageSection[] = [
  SEED_HERO_SECTION,
  {
    id: '00000000-0000-4000-8000-000000000102',
    code: 'value_props',
    section_type: 'VALUE_PROPOSITION',
    admin_name: 'Barra de Propuesta de Valor (4 Columnas)',
    title: 'Beneficios de comprar en SmartLab Store',
    subtitle:
      'Precios 100% en Soles (S/), entrega individual por WhatsApp, control de versiones reales y pagos parciales con reserva 72h.',
    badge_text: null,
    badge_variant: null,
    cta_label: null,
    cta_url: null,
    config_json: { columns_desktop: 4 },
    display_order: 2,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    code: 'deal_of_the_day',
    section_type: 'DEAL_OF_THE_DAY',
    admin_name: 'Oferta Destacada del Día',
    title: 'Oferta Destacada del Día',
    subtitle: 'Promoción especial por tiempo limitado.',
    badge_text: 'OFERTA DEL DÍA',
    badge_variant: 'discount',
    cta_label: 'Comprar Ahora por WhatsApp',
    cta_url: '/catalogo?modalidad=PRO',
    config_json: {
      countdown_hours: 4,
      countdown_minutes: 38,
      countdown_seconds: 19,
      sold_units: 18,
      available_units: 7,
    },
    display_order: 3,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000104',
    code: 'category_tabs',
    section_type: 'CATEGORY_TABS_SHOWCASE',
    admin_name: 'Vitrina por Pestañas (Colecciones y Categorías)',
    title: 'Soluciones Digitales por Categoría y Colección',
    subtitle: 'Explora productos FREE, PRO y PERSONALIZADO.',
    badge_text: null,
    badge_variant: null,
    cta_label: 'Ver catálogo completo',
    cta_url: '/catalogo',
    config_json: { max_items_per_tab: 8, default_tab: 'ALL' },
    display_order: 4,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: DUAL_BANNERS_SECTION_ID,
    code: DUAL_BANNERS_SECTION_CODE,
    section_type: 'PROMO_BANNERS',
    admin_name: 'Banners Intermedios Duales (50% / 50%)',
    title: 'Banners Promocionales Secundarios',
    subtitle: 'Banners intermedios destacados para plantillas PRO y automatizaciones.',
    badge_text: null,
    badge_variant: null,
    cta_label: null,
    cta_url: null,
    config_json: { layout: 'grid-2-cols' },
    display_order: 5,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000106',
    code: 'free_zone',
    section_type: 'FREE_RESOURCES',
    admin_name: 'Zona de Recursos Gratuitos (FREE)',
    title: 'Zona de Recursos Gratuitos',
    subtitle: 'Herramientas y kits gratuitos verificados para la comunidad de SmartLab Store.',
    badge_text: 'GRATIS',
    badge_variant: 'FREE',
    cta_label: 'Ver todos los recursos FREE →',
    cta_url: '/catalogo?modalidad=FREE',
    config_json: { max_items: 4 },
    display_order: 6,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000107',
    code: 'custom_cta',
    section_type: 'CUSTOM_SERVICES_CTA',
    admin_name: 'Bloque de Solicitud de Productos Personalizados',
    title: '¿Buscas un desarrollo a medida o adaptar un producto del catálogo?',
    subtitle:
      'Cuéntanos tu requerimiento técnico de Excel, Google Sheets, Sistemas Web, Aplicaciones Android o Automatizaciones y te contactaremos por WhatsApp con una propuesta formal.',
    badge_text: 'MODALIDAD PERSONALIZADO',
    badge_variant: 'PERSONALIZADO',
    cta_label: 'Solicitar Producto a Medida',
    cta_url: '/solicitud-personalizada',
    config_json: {},
    display_order: 7,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

export const SEED_HERO_SLIDE_ITEMS: HomepageSectionItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    section_id: HERO_MAIN_SECTION_ID,
    item_type: 'HERO_SLIDE',
    admin_name: 'Slide 1 — Plantillas y Sistemas PRO',
    badge_text: 'PLANTILLAS Y SISTEMAS PRO',
    badge_variant: 'PRO',
    title: 'Automatiza tu Empresa con Herramientas Listas para Usar en Soles (S/)',
    subtitle:
      'Kardex Valorizado SUNAT, Planillas, CRM en Google Sheets, Sistemas POS y Apps Android. Paga con Yape, Plin o transferencia y recibe tu enlace verificado por WhatsApp.',
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: 'Automatiza tu Empresa con Herramientas Listas para Usar en Soles',
    cta_primary_label: 'Explorar Catálogo PRO',
    cta_primary_url: '/catalogo?modalidad=PRO',
    cta_secondary_label: 'Recursos FREE',
    cta_secondary_url: '/catalogo?modalidad=FREE',
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 1,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    section_id: HERO_MAIN_SECTION_ID,
    item_type: 'HERO_SLIDE',
    admin_name: 'Slide 2 — Sistemas Web y Apps Android',
    badge_text: 'SISTEMAS WEB Y APPS ANDROID',
    badge_variant: 'primary',
    title: 'Controla tu Punto de Venta, Almacén y Conteo Físico con Escáner APK',
    subtitle:
      'Sistemas multiusuario con arqueo de Yape/Plin y aplicaciones Android offline para toma de inventario con cámara o lector láser.',
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: 'Controla tu Punto de Venta, Almacén y Conteo Físico con Escáner APK',
    cta_primary_label: 'Explorar Catálogo PRO',
    cta_primary_url: '/catalogo?categoria=sistemas',
    cta_secondary_label: 'Recursos FREE',
    cta_secondary_url: '/catalogo?modalidad=FREE',
    open_in_new_tab: false,
    category_id: 'sistemas',
    product_id: null,
    style_json: {},
    display_order: 2,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    section_id: HERO_MAIN_SECTION_ID,
    item_type: 'HERO_SLIDE',
    admin_name: 'Slide 3 — Desarrollo Personalizado a Medida',
    badge_text: 'DESARROLLO PERSONALIZADO A MEDIDA',
    badge_variant: 'PERSONALIZADO',
    title: '¿Necesitas Adaptar una Plantilla o Crear un Sistema para tu Flujo?',
    subtitle:
      'Nuestro equipo diseña macros VBA, integraciones con Google Apps Script y sistemas corporativos bajo cotización directa por WhatsApp.',
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: 'Desarrollo Personalizado a Medida en SmartLab Store',
    cta_primary_label: 'Cotizar Proyecto a Medida',
    cta_primary_url: '/solicitud-personalizada',
    cta_secondary_label: 'Recursos FREE',
    cta_secondary_url: '/catalogo?modalidad=FREE',
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 3,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

export const SEED_HERO_PROMO_CARDS: HomepageSectionItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000301',
    section_id: HERO_MAIN_SECTION_ID,
    item_type: 'PROMO_CARD',
    admin_name: 'Tarjeta Lateral 1 — Sistemas POS y Apps Android',
    badge_text: 'OFERTA -25%',
    badge_variant: 'discount',
    title: 'Sistemas POS y Apps Android para Negocios',
    subtitle: 'Control de ventas, inventarios y arqueo de Yape/Plin en Soles (S/ 180.00).',
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: 'Sistemas POS y Apps Android para Negocios',
    cta_primary_label: 'Ver Sistemas PRO',
    cta_primary_url: '/catalogo?categoria=sistemas',
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 1,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000302',
    section_id: HERO_MAIN_SECTION_ID,
    item_type: 'PROMO_CARD',
    admin_name: 'Tarjeta Lateral 2 — Soluciones Personalizadas',
    badge_text: 'A MEDIDA',
    badge_variant: 'PERSONALIZADO',
    title: 'Soluciones Personalizadas bajo Solicitud',
    subtitle: 'Adaptamos plantillas Excel, Google Sheets o sistemas a la medida de tu empresa.',
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: 'Soluciones Personalizadas bajo Solicitud',
    cta_primary_label: 'Solicitar Cotización',
    cta_primary_url: '/solicitud-personalizada',
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 2,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

export const SEED_SECONDARY_BANNERS: HomepageSectionItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000401',
    section_id: DUAL_BANNERS_SECTION_ID,
    item_type: 'SECONDARY_BANNER',
    admin_name: 'Banner Secundario 1 — Excel & Google Sheets PRO',
    badge_text: 'EXCEL & GOOGLE SHEETS PRO',
    badge_variant: 'PRO',
    title: 'Plantillas Financieras, Kardex SUNAT y Planillas Automatizadas',
    subtitle:
      'Ahorra decenas de horas operativas con hojas de cálculo listas para usar, sin bloqueos y con soporte directo.',
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: 'Plantillas Financieras, Kardex SUNAT y Planillas Automatizadas',
    cta_primary_label: 'Ver Plantillas Excel en S/',
    cta_primary_url: '/catalogo?categoria=excel',
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: { theme: 'dark-slate' },
    display_order: 1,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000402',
    section_id: DUAL_BANNERS_SECTION_ID,
    item_type: 'SECONDARY_BANNER',
    admin_name: 'Banner Secundario 2 — Automatizaciones & Apps',
    badge_text: 'AUTOMATIZACIONES & APPS',
    badge_variant: 'discount',
    title: 'Apps Android de Inventario y Bots de Alertas en Apps Script',
    subtitle:
      'Digitaliza la toma física de stock con cámara y automatiza el seguimiento de cobranzas de tu negocio.',
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: 'Apps Android de Inventario y Bots de Alertas en Apps Script',
    cta_primary_label: 'Explorar Apps y Bots',
    cta_primary_url: '/catalogo?categoria=android_apps',
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: { theme: 'blue-indigo' },
    display_order: 2,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

export const SEED_BENEFIT_ITEMS: HomepageSectionItem[] = [
  {
    id: '00000000-0000-4000-8000-000000000501',
    section_id: VALUE_PROPS_SECTION_ID,
    item_type: 'BENEFIT_ITEM',
    admin_name: 'Beneficio 1 — Precios 100% en Soles (S/)',
    badge_text: null,
    badge_variant: null,
    title: 'Precios 100% en Soles (S/)',
    subtitle: 'Paga con Yape, Plin o transferencia bancaria sin comisiones ocultas.',
    icon_name: 'ShieldCheck',
    icon_color_hex: '#3B82F6',
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: null,
    cta_primary_label: null,
    cta_primary_url: null,
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 1,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000502',
    section_id: VALUE_PROPS_SECTION_ID,
    item_type: 'BENEFIT_ITEM',
    admin_name: 'Beneficio 2 — Entrega Individual por WhatsApp',
    badge_text: null,
    badge_variant: null,
    title: 'Entrega Individual por WhatsApp',
    subtitle: 'Cada producto se entrega en cuanto alcanza el 100% de su pago verificado.',
    icon_name: 'MessageCircle',
    icon_color_hex: '#059669',
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: null,
    cta_primary_label: null,
    cta_primary_url: null,
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 2,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000503',
    section_id: VALUE_PROPS_SECTION_ID,
    item_type: 'BENEFIT_ITEM',
    admin_name: 'Beneficio 3 — Control de Versiones Reales',
    badge_text: null,
    badge_variant: null,
    title: 'Control de Versiones Reales',
    subtitle: 'Historial transparente de mejoras, notas de versión y requisitos técnicos.',
    icon_name: 'RefreshCw',
    icon_color_hex: '#4F46E5',
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: null,
    cta_primary_label: null,
    cta_primary_url: null,
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 3,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000504',
    section_id: VALUE_PROPS_SECTION_ID,
    item_type: 'BENEFIT_ITEM',
    admin_name: 'Beneficio 4 — Pagos Parciales y Reserva 72h',
    badge_text: null,
    badge_variant: null,
    title: 'Pagos Parciales y Reserva 72h',
    subtitle: 'Tu pedido conserva su código y abonos verificados con total trazabilidad.',
    icon_name: 'Sparkles',
    icon_color_hex: '#F59E0B',
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: null,
    cta_primary_label: null,
    cta_primary_url: null,
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: 4,
    status: 'PUBLISHED',
    is_active: true,
    starts_at: null,
    ends_at: null,
    updated_by_user_id: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

export const DEFAULT_CATEGORY_SHOWCASE_TABS: readonly CategoryShowcaseTabConfig[] = [
  {
    key: 'mas_vendidos',
    label: 'Más Vendidos',
    enabled: true,
    display_order: 1,
    selection_mode: 'AUTO_FLAGS',
  },
  {
    key: 'ofertas',
    label: 'En Oferta',
    enabled: true,
    display_order: 2,
    selection_mode: 'AUTO_FLAGS',
  },
  {
    key: 'novedades',
    label: 'Novedades',
    enabled: true,
    display_order: 3,
    selection_mode: 'AUTO_FLAGS',
  },
  {
    key: 'destacados',
    label: 'Destacados',
    enabled: true,
    display_order: 4,
    selection_mode: 'AUTO_FLAGS',
  },
] as const;

// ============================================================================
// 1. UTILIDADES DE VALIDACIÓN DE URLS, FECHAS DE CAMPAÑA Y MAPEO DE DATOS
// ============================================================================

export function isProtectedBaseSectionCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return (PROTECTED_HOMEPAGE_SECTION_CODES as readonly string[]).includes(code.trim());
}

/**
 * Determina si una URL es un enlace externo HTTP/HTTPS.
 */
export function isExternalHomepageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Valida que una URL de botón o imagen utilice únicamente rutas internas seguras (`/ruta`)
 * o protocolos externos permitidos (`https://` o `http://`).
 * Rechaza estrictamente `javascript:`, `data:`, `vbscript:`, `file:`, `blob:` o `//`.
 */
export function validateHomepageSlideUrl(
  rawUrl: string | null | undefined,
  options?: { required?: boolean; fieldLabel?: string }
): { valid: boolean; sanitizedUrl: string | null; error: string | null } {
  const label = options?.fieldLabel || 'La URL';
  const trimmed = (rawUrl ?? '').trim();

  if (!trimmed) {
    if (options?.required) {
      return {
        valid: false,
        sanitizedUrl: null,
        error: `${label} es obligatoria.`,
      };
    }
    return { valid: true, sanitizedUrl: null, error: null };
  }

  if (DANGEROUS_PROTOCOL_REGEX.test(trimmed)) {
    return {
      valid: false,
      sanitizedUrl: null,
      error: `${label} contiene un protocolo peligroso no permitido (javascript:, data:, vbscript:, file:). Usa una ruta interna como /catalogo o un enlace https://.`,
    };
  }

  if (/\s/.test(trimmed)) {
    return {
      valid: false,
      sanitizedUrl: null,
      error: `${label} no debe contener espacios en blanco.`,
    };
  }

  // Ruta interna de la tienda (debe iniciar con '/' pero nunca con '//')
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) {
      return {
        valid: false,
        sanitizedUrl: null,
        error: `${label} no puede iniciar con "//". Usa una ruta interna como /catalogo o un enlace https:// completo.`,
      };
    }
    return { valid: true, sanitizedUrl: trimmed, error: null };
  }

  // Enlace externo (debe ser http:// o https:// bien formado)
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          valid: false,
          sanitizedUrl: null,
          error: `${label} solo permite protocolos http:// o https://.`,
        };
      }
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        return {
          valid: false,
          sanitizedUrl: null,
          error: `${label} externa debe incluir un dominio válido (ej. https://wa.me/...).`,
        };
      }
      return { valid: true, sanitizedUrl: trimmed, error: null };
    } catch {
      return {
        valid: false,
        sanitizedUrl: null,
        error: `${label} no tiene un formato de dirección web válido.`,
      };
    }
  }

  return {
    valid: false,
    sanitizedUrl: null,
    error: `${label} debe iniciar con "/" para rutas internas (ej. /catalogo) o con "https://" para enlaces externos.`,
  };
}

/**
 * Valida las fechas opcionales de inicio y finalización de campaña (`starts_at` y `ends_at`).
 */
export function validateCampaignScheduleDates(
  startsAtRaw: string | null | undefined,
  endsAtRaw: string | null | undefined
): {
  valid: boolean;
  startsAtIso: string | null;
  endsAtIso: string | null;
  error: string | null;
} {
  const cleanStart = (startsAtRaw ?? '').trim();
  const cleanEnd = (endsAtRaw ?? '').trim();

  let startsAtIso: string | null = null;
  let endsAtIso: string | null = null;

  if (cleanStart) {
    const startMs = Date.parse(cleanStart);
    if (Number.isNaN(startMs)) {
      return {
        valid: false,
        startsAtIso: null,
        endsAtIso: null,
        error: 'La fecha de inicio de campaña no tiene un formato válido.',
      };
    }
    startsAtIso = new Date(startMs).toISOString();
  }

  if (cleanEnd) {
    const endMs = Date.parse(cleanEnd);
    if (Number.isNaN(endMs)) {
      return {
        valid: false,
        startsAtIso: null,
        endsAtIso: null,
        error: 'La fecha de finalización de campaña no tiene un formato válido.',
      };
    }
    endsAtIso = new Date(endMs).toISOString();
  }

  if (startsAtIso && endsAtIso) {
    if (new Date(endsAtIso).getTime() <= new Date(startsAtIso).getTime()) {
      return {
        valid: false,
        startsAtIso: null,
        endsAtIso: null,
        error:
          'La fecha de finalización de la campaña debe ser posterior a la fecha de inicio.',
      };
    }
  }

  return { valid: true, startsAtIso, endsAtIso, error: null };
}

/**
 * Evalúa si un slide, tarjeta, banner o sección se encuentra vigente en este instante según `starts_at` y `ends_at`.
 */
export function evaluateCampaignScheduleState(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  referenceNowMs: number = Date.now()
): CampaignScheduleState {
  if (startsAt) {
    const startMs = Date.parse(startsAt);
    if (!Number.isNaN(startMs) && referenceNowMs < startMs) {
      return 'SCHEDULED_FUTURE';
    }
  }

  if (endsAt) {
    const endMs = Date.parse(endsAt);
    if (!Number.isNaN(endMs) && referenceNowMs > endMs) {
      return 'EXPIRED';
    }
  }

  return 'ACTIVE_NOW';
}

function normalizeBadgeVariant(raw: unknown): HomepageBadgeVariant | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim() as HomepageBadgeVariant;
  return VALID_BADGE_VARANIS.includes(trimmed) ? trimmed : 'PRO';
}

function normalizePublishStatus(raw: unknown): HomepagePublishStatus {
  if (typeof raw === 'string' && raw.trim().toUpperCase() === 'DRAFT') {
    return 'DRAFT';
  }
  return 'PUBLISHED';
}

function normalizeSectionType(raw: unknown): HomepageSectionType | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim() as HomepageSectionType;
  return VALID_SECTION_TYPES.includes(trimmed) ? trimmed : null;
}

export function mapSupabaseHomepageSectionRow(
  row: Record<string, unknown>
): HomepageSection {
  return {
    id: String(row.id ?? HERO_MAIN_SECTION_ID),
    code: typeof row.code === 'string' && row.code.trim() ? row.code.trim() : null,
    section_type: (row.section_type as HomepageSectionType) || 'HERO_BANNER',
    admin_name: String(row.admin_name ?? 'Sección de portada'),
    title: typeof row.title === 'string' ? row.title : null,
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : null,
    badge_text: typeof row.badge_text === 'string' ? row.badge_text : null,
    badge_variant: normalizeBadgeVariant(row.badge_variant),
    cta_label: typeof row.cta_label === 'string' ? row.cta_label : null,
    cta_url: typeof row.cta_url === 'string' ? row.cta_url : null,
    config_json:
      row.config_json && typeof row.config_json === 'object' && !Array.isArray(row.config_json)
        ? (row.config_json as Record<string, unknown>)
        : {},
    display_order: Number.isFinite(Number(row.display_order))
      ? Number(row.display_order)
      : 0,
    status: normalizePublishStatus(row.status),
    is_active: row.is_active !== false,
    starts_at: typeof row.starts_at === 'string' ? row.starts_at : null,
    ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
    updated_by_user_id:
      typeof row.updated_by_user_id === 'string' ? row.updated_by_user_id : null,
    created_at:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

export function mapSupabaseHomepageItemRow(
  row: Record<string, unknown>
): HomepageSectionItem {
  return {
    id: String(row.id ?? ''),
    section_id: String(row.section_id ?? HERO_MAIN_SECTION_ID),
    item_type: (row.item_type as HomepageItemType) || 'HERO_SLIDE',
    admin_name:
      typeof row.admin_name === 'string' && row.admin_name.trim()
        ? row.admin_name.trim()
        : String(row.title ?? 'Elemento de portada'),
    badge_text: typeof row.badge_text === 'string' ? row.badge_text : null,
    badge_variant: normalizeBadgeVariant(row.badge_variant),
    title: String(row.title ?? ''),
    subtitle: typeof row.subtitle === 'string' ? row.subtitle : null,
    icon_name: typeof row.icon_name === 'string' ? row.icon_name : null,
    icon_color_hex: typeof row.icon_color_hex === 'string' ? row.icon_color_hex : null,
    image_desktop_url:
      typeof row.image_desktop_url === 'string' && row.image_desktop_url.trim()
        ? row.image_desktop_url.trim()
        : null,
    image_mobile_url:
      typeof row.image_mobile_url === 'string' && row.image_mobile_url.trim()
        ? row.image_mobile_url.trim()
        : null,
    image_alt_text:
      typeof row.image_alt_text === 'string' && row.image_alt_text.trim()
        ? row.image_alt_text.trim()
        : null,
    cta_primary_label:
      typeof row.cta_primary_label === 'string' ? row.cta_primary_label : null,
    cta_primary_url:
      typeof row.cta_primary_url === 'string' ? row.cta_primary_url : null,
    cta_secondary_label:
      typeof row.cta_secondary_label === 'string' ? row.cta_secondary_label : null,
    cta_secondary_url:
      typeof row.cta_secondary_url === 'string' ? row.cta_secondary_url : null,
    open_in_new_tab: Boolean(row.open_in_new_tab),
    category_id: typeof row.category_id === 'string' ? row.category_id : null,
    product_id: typeof row.product_id === 'string' ? row.product_id : null,
    style_json:
      row.style_json && typeof row.style_json === 'object' && !Array.isArray(row.style_json)
        ? (row.style_json as Record<string, unknown>)
        : {},
    display_order: Number.isFinite(Number(row.display_order))
      ? Number(row.display_order)
      : 0,
    status: normalizePublishStatus(row.status),
    is_active: row.is_active !== false,
    starts_at: typeof row.starts_at === 'string' ? row.starts_at : null,
    ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
    updated_by_user_id:
      typeof row.updated_by_user_id === 'string' ? row.updated_by_user_id : null,
    created_at:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

// ============================================================================
// 2. FALLBACK LOCAL SINCRONIZADO (SOLO CUANDO SUPABASE NO ESTÁ DISPONIBLE)
// ============================================================================

const ALL_SEED_ITEMS: HomepageSectionItem[] = [
  ...SEED_HERO_SLIDE_ITEMS,
  ...SEED_HERO_PROMO_CARDS,
  ...SEED_SECONDARY_BANNERS,
  ...SEED_BENEFIT_ITEMS,
];

function loadLocalHomepageSections(): HomepageSection[] {
  try {
    const raw = localStorage.getItem(LOCAL_HOMEPAGE_SECTIONS_KEY);
    if (!raw) return [...SEED_HOMEPAGE_SECTIONS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...SEED_HOMEPAGE_SECTIONS];
    }
    const mapped = parsed.map((row) =>
      mapSupabaseHomepageSectionRow(row as Record<string, unknown>)
    );
    // Garantizar que las 7 secciones base existan también en local
    const existingCodes = new Set(mapped.map((s) => s.code).filter(Boolean));
    for (const seed of SEED_HOMEPAGE_SECTIONS) {
      if (seed.code && !existingCodes.has(seed.code)) {
        mapped.push(seed);
      }
    }
    return mapped.sort((a, b) => a.display_order - b.display_order);
  } catch {
    return [...SEED_HOMEPAGE_SECTIONS];
  }
}

function saveLocalHomepageSections(sections: HomepageSection[]): void {
  try {
    localStorage.setItem(LOCAL_HOMEPAGE_SECTIONS_KEY, JSON.stringify(sections));
  } catch {
    // Ignorar errores de almacenamiento local
  }
}

function loadLocalHomepageItems(): HomepageSectionItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_HOMEPAGE_ITEMS_KEY);
    if (!raw) return [...ALL_SEED_ITEMS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...ALL_SEED_ITEMS];
    }
    const mapped = parsed.map((item) =>
      mapSupabaseHomepageItemRow(item as Record<string, unknown>)
    );
    // Si solo había HERO_SLIDE guardados de C2, añadir las semillas de PROMO_CARD, SECONDARY_BANNER y BENEFIT_ITEM
    const hasPromoCard = mapped.some((i) => i.item_type === 'PROMO_CARD');
    if (!hasPromoCard) {
      mapped.push(...SEED_HERO_PROMO_CARDS);
    }
    const hasSecondaryBanner = mapped.some((i) => i.item_type === 'SECONDARY_BANNER');
    if (!hasSecondaryBanner) {
      mapped.push(...SEED_SECONDARY_BANNERS);
    }
    const hasBenefitItem = mapped.some((i) => i.item_type === 'BENEFIT_ITEM');
    if (!hasBenefitItem) {
      mapped.push(...SEED_BENEFIT_ITEMS);
    }
    return mapped.sort((a, b) => a.display_order - b.display_order);
  } catch {
    return [...ALL_SEED_ITEMS];
  }
}

function saveLocalHomepageItems(items: HomepageSectionItem[]): void {
  try {
    localStorage.setItem(LOCAL_HOMEPAGE_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // Ignorar errores de almacenamiento local
  }
}

function loadLocalHeroSlides(): HomepageSectionItem[] {
  return loadLocalHomepageItems().filter((i) => i.item_type === 'HERO_SLIDE');
}

function saveLocalHeroSlides(slides: HomepageSectionItem[]): void {
  const others = loadLocalHomepageItems().filter((i) => i.item_type !== 'HERO_SLIDE');
  saveLocalHomepageItems([...others, ...slides]);
}

export function mapSupabaseHomepageTargetRow(
  row: Record<string, unknown>
): HomepageSectionTarget {
  return {
    id: String(row.id ?? ''),
    section_id: String(row.section_id ?? ''),
    target_type:
      String(row.target_type ?? 'PRODUCT').toUpperCase() === 'CATEGORY'
        ? 'CATEGORY'
        : 'PRODUCT',
    collection_key:
      typeof row.collection_key === 'string' && row.collection_key.trim()
        ? row.collection_key.trim()
        : 'default',
    product_id:
      typeof row.product_id === 'string' && row.product_id.trim()
        ? row.product_id.trim()
        : null,
    category_id:
      typeof row.category_id === 'string' && row.category_id.trim()
        ? row.category_id.trim()
        : null,
    display_order: Number.isFinite(Number(row.display_order))
      ? Number(row.display_order)
      : 0,
    is_active: row.is_active !== false,
    created_at:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  };
}

function loadLocalHomepageTargets(): HomepageSectionTarget[] {
  try {
    const raw = localStorage.getItem(LOCAL_HOMEPAGE_TARGETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => mapSupabaseHomepageTargetRow(row as Record<string, unknown>))
      .sort((a, b) => a.display_order - b.display_order);
  } catch {
    return [];
  }
}

function saveLocalHomepageTargets(targets: HomepageSectionTarget[]): void {
  try {
    localStorage.setItem(LOCAL_HOMEPAGE_TARGETS_KEY, JSON.stringify(targets));
  } catch {
    // Ignorar errores de almacenamiento local
  }
}

// ============================================================================
// 3. VERIFICACIÓN DE PERMISOS ADMINISTRATIVOS (RBAC + DEFENSA EN PROFUNDIDAD)
// ============================================================================

async function verifyAdminHomepageAccess(): Promise<{
  authorized: boolean;
  userId: string | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { authorized: true, userId: null, error: null };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        authorized: false,
        userId: null,
        error: 'Debes iniciar sesión como administrador para gestionar la portada.',
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role_id, is_active')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.id !== authData.user.id) {
      return {
        authorized: false,
        userId: null,
        error: 'No se pudo verificar el perfil administrativo del usuario actual.',
      };
    }

    const role = profile.role_id ?? (profile as { role?: string | null }).role ?? '';
    const isAdmin = String(role).trim().toUpperCase() === 'ADMIN';

    if (!isAdmin || profile.is_active !== true) {
      return {
        authorized: false,
        userId: null,
        error:
          'Acceso denegado (403): solo los usuarios activos con rol ADMIN pueden modificar la portada.',
      };
    }

    return { authorized: true, userId: authData.user.id, error: null };
  } catch (err) {
    return {
      authorized: false,
      userId: null,
      error:
        err instanceof Error
          ? err.message
          : 'Error al verificar permisos administrativos para la portada.',
    };
  }
}

/**
 * Inicializa de forma idempotente en Supabase:
 * 1. Las 7 secciones base de la portada (`hero_main`, `value_props`, `deal_of_the_day`, `category_tabs`, `dual_banners`, `free_zone`, `custom_cta`) si alguna aún no existe.
 * 2. Las 2 tarjetas promocionales laterales del Hero (`PROMO_CARD`) si la sección `hero_main` aún no tiene registros `PROMO_CARD` ni existen sus IDs semilla.
 * 3. Los 2 banners promocionales secundarios (`SECONDARY_BANNER`) si la sección `dual_banners` (`PROMO_BANNERS`) aún no tiene registros `SECONDARY_BANNER` ni existen sus IDs semilla.
 * 4. Los 4 beneficios de SmartLab (`BENEFIT_ITEM`) en la sección `value_props` (`VALUE_PROPOSITION`) si aún no existen registros `BENEFIT_ITEM`.
 * No duplica registros si ya existen ni sobrescribe ediciones hechas por el administrador.
 */
let c3SeedCheckPromise: Promise<void> | null = null;

export async function ensureAdminHomepageC3Seeded(
  userId: string | null
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  if (c3SeedCheckPromise) {
    return c3SeedCheckPromise;
  }

  c3SeedCheckPromise = (async () => {
    try {
      // 1. Verificar secciones existentes en public.homepage_sections
      const { data: existingSections, error: secError } = await supabase
        .from('homepage_sections')
        .select('id, code, section_type');

      if (secError || !existingSections) return;

      const byCode = new Map<string, { id: string; code: string | null }>();
      const byId = new Set<string>();

      for (const row of existingSections) {
        const r = row as { id: string; code?: string | null };
        byId.add(String(r.id));
        if (r.code) {
          byCode.set(String(r.code), { id: String(r.id), code: String(r.code) });
        }
      }

      for (const seedSec of SEED_HOMEPAGE_SECTIONS) {
        const alreadyExists =
          (seedSec.code && byCode.has(seedSec.code)) || byId.has(seedSec.id);
        if (!alreadyExists) {
          const { data: insertedSec } = await supabase
            .from('homepage_sections')
            .insert({
              id: seedSec.id,
              code: seedSec.code,
              section_type: seedSec.section_type,
              admin_name: seedSec.admin_name,
              title: seedSec.title,
              subtitle: seedSec.subtitle,
              badge_text: seedSec.badge_text,
              badge_variant: seedSec.badge_variant,
              cta_label: seedSec.cta_label,
              cta_url: seedSec.cta_url,
              config_json: seedSec.config_json,
              display_order: seedSec.display_order,
              status: seedSec.status,
              is_active: seedSec.is_active,
              updated_by_user_id: userId,
            })
            .select('id, code')
            .maybeSingle();

          if (insertedSec && seedSec.code) {
            byCode.set(seedSec.code, {
              id: String((insertedSec as { id: string }).id),
              code: seedSec.code,
            });
          }
        }
      }

      const heroSectionId =
        byCode.get(HERO_MAIN_SECTION_CODE)?.id || HERO_MAIN_SECTION_ID;
      const dualBannersSectionId =
        byCode.get(DUAL_BANNERS_SECTION_CODE)?.id || DUAL_BANNERS_SECTION_ID;
      const valuePropsSectionId =
        byCode.get(VALUE_PROPS_SECTION_CODE)?.id || VALUE_PROPS_SECTION_ID;

      // 2. Verificar tarjetas promocionales laterales (PROMO_CARD)
      const { data: existingPromoCards, error: promoErr } = await supabase
        .from('homepage_section_items')
        .select('id')
        .eq('item_type', 'PROMO_CARD');

      if (!promoErr && existingPromoCards && existingPromoCards.length === 0) {
        for (const seedCard of SEED_HERO_PROMO_CARDS) {
          await supabase.from('homepage_section_items').insert({
            id: seedCard.id,
            section_id: heroSectionId,
            item_type: 'PROMO_CARD',
            admin_name: seedCard.admin_name,
            badge_text: seedCard.badge_text,
            badge_variant: seedCard.badge_variant,
            title: seedCard.title,
            subtitle: seedCard.subtitle,
            image_desktop_url: seedCard.image_desktop_url,
            image_mobile_url: seedCard.image_mobile_url,
            image_alt_text: seedCard.image_alt_text,
            cta_primary_label: seedCard.cta_primary_label,
            cta_primary_url: seedCard.cta_primary_url,
            open_in_new_tab: seedCard.open_in_new_tab,
            display_order: seedCard.display_order,
            status: seedCard.status,
            is_active: seedCard.is_active,
            updated_by_user_id: userId,
          });
        }
      }

      // 3. Verificar banners promocionales secundarios (SECONDARY_BANNER)
      const { data: existingBanners, error: bannerErr } = await supabase
        .from('homepage_section_items')
        .select('id')
        .eq('item_type', 'SECONDARY_BANNER');

      if (!bannerErr && existingBanners && existingBanners.length === 0) {
        for (const seedBanner of SEED_SECONDARY_BANNERS) {
          await supabase.from('homepage_section_items').insert({
            id: seedBanner.id,
            section_id: dualBannersSectionId,
            item_type: 'SECONDARY_BANNER',
            admin_name: seedBanner.admin_name,
            badge_text: seedBanner.badge_text,
            badge_variant: seedBanner.badge_variant,
            title: seedBanner.title,
            subtitle: seedBanner.subtitle,
            image_desktop_url: seedBanner.image_desktop_url,
            image_mobile_url: seedBanner.image_mobile_url,
            image_alt_text: seedBanner.image_alt_text,
            cta_primary_label: seedBanner.cta_primary_label,
            cta_primary_url: seedBanner.cta_primary_url,
            cta_secondary_label: seedBanner.cta_secondary_label,
            cta_secondary_url: seedBanner.cta_secondary_url,
            open_in_new_tab: seedBanner.open_in_new_tab,
            style_json: seedBanner.style_json,
            display_order: seedBanner.display_order,
            status: seedBanner.status,
            is_active: seedBanner.is_active,
            updated_by_user_id: userId,
          });
        }
      }

      // 4. Verificar los 4 beneficios de compra de SmartLab (BENEFIT_ITEM — Sprint C4)
      const { data: existingBenefits, error: benefitErr } = await supabase
        .from('homepage_section_items')
        .select('id')
        .eq('item_type', 'BENEFIT_ITEM');

      if (!benefitErr && existingBenefits) {
        if (existingBenefits.length === 0) {
          for (const seedBenefit of SEED_BENEFIT_ITEMS) {
            await supabase.from('homepage_section_items').insert({
              id: seedBenefit.id,
              section_id: valuePropsSectionId,
              item_type: 'BENEFIT_ITEM',
              admin_name: seedBenefit.admin_name,
              title: seedBenefit.title,
              subtitle: seedBenefit.subtitle,
              icon_name: seedBenefit.icon_name,
              icon_color_hex: seedBenefit.icon_color_hex,
              display_order: seedBenefit.display_order,
              status: seedBenefit.status,
              is_active: seedBenefit.is_active,
              updated_by_user_id: userId,
            });
          }
        }
        // Registrar que los beneficios de C4 ya fueron sembrados en value_props
        const { data: vpSecRow } = await supabase
          .from('homepage_sections')
          .select('config_json')
          .eq('id', valuePropsSectionId)
          .maybeSingle();
        const prevVpConfig =
          vpSecRow &&
          typeof (vpSecRow as { config_json?: unknown }).config_json === 'object' &&
          (vpSecRow as { config_json?: unknown }).config_json !== null
            ? ((vpSecRow as { config_json: Record<string, unknown> }).config_json)
            : { columns_desktop: 4 };
        if (prevVpConfig.benefits_seeded !== true) {
          await supabase
            .from('homepage_sections')
            .update({
              config_json: { ...prevVpConfig, benefits_seeded: true },
            })
            .eq('id', valuePropsSectionId);
        }
      }
    } catch {
      // No bloquear la UI si ocurre un error de red puntual durante la verificación idempotente
    } finally {
      c3SeedCheckPromise = null;
    }
  })();

  return c3SeedCheckPromise;
}

/**
 * Obtiene o inicializa la sección maestra `hero_main` (`HERO_BANNER`) en `public.homepage_sections`.
 */
async function ensureAdminHeroMainSection(userId: string | null): Promise<{
  section: HomepageSection | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { section: SEED_HERO_SECTION, error: null };
  }

  await ensureAdminHomepageC3Seeded(userId);

  const { data: existing, error: selectError } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('code', HERO_MAIN_SECTION_CODE)
    .maybeSingle();

  if (selectError) {
    return {
      section: null,
      error: `No se pudo consultar la sección Hero en public.homepage_sections: ${selectError.message}`,
    };
  }

  if (existing) {
    return {
      section: mapSupabaseHomepageSectionRow(existing as Record<string, unknown>),
      error: null,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('homepage_sections')
    .insert({
      id: HERO_MAIN_SECTION_ID,
      code: HERO_MAIN_SECTION_CODE,
      section_type: 'HERO_BANNER',
      admin_name: SEED_HERO_SECTION.admin_name,
      title: SEED_HERO_SECTION.title,
      subtitle: SEED_HERO_SECTION.subtitle,
      config_json: SEED_HERO_SECTION.config_json,
      display_order: 1,
      status: 'PUBLISHED',
      is_active: true,
      updated_by_user_id: userId,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    return {
      section: null,
      error:
        insertError?.message ||
        'No se pudo inicializar la sección hero_main en public.homepage_sections.',
    };
  }

  return {
    section: mapSupabaseHomepageSectionRow(inserted as Record<string, unknown>),
    error: null,
  };
}

/**
 * Obtiene o inicializa la sección maestra `dual_banners` (`PROMO_BANNERS`) en `public.homepage_sections`.
 */
async function ensureAdminPromoBannersSection(userId: string | null): Promise<{
  section: HomepageSection | null;
  error: string | null;
}> {
  const seedDual = SEED_HOMEPAGE_SECTIONS.find(
    (s) => s.code === DUAL_BANNERS_SECTION_CODE
  )!;

  if (!isSupabaseConfigured()) {
    return { section: seedDual, error: null };
  }

  await ensureAdminHomepageC3Seeded(userId);

  const { data: existing, error: selectError } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('code', DUAL_BANNERS_SECTION_CODE)
    .maybeSingle();

  if (selectError) {
    return {
      section: null,
      error: `No se pudo consultar la sección de Banners Secundarios: ${selectError.message}`,
    };
  }

  if (existing) {
    return {
      section: mapSupabaseHomepageSectionRow(existing as Record<string, unknown>),
      error: null,
    };
  }

  // Buscar cualquier sección de tipo PROMO_BANNERS antes de insertar
  const { data: anyPromoSec } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('section_type', 'PROMO_BANNERS')
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (anyPromoSec) {
    return {
      section: mapSupabaseHomepageSectionRow(anyPromoSec as Record<string, unknown>),
      error: null,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('homepage_sections')
    .insert({
      id: DUAL_BANNERS_SECTION_ID,
      code: DUAL_BANNERS_SECTION_CODE,
      section_type: 'PROMO_BANNERS',
      admin_name: seedDual.admin_name,
      title: seedDual.title,
      subtitle: seedDual.subtitle,
      config_json: seedDual.config_json,
      display_order: seedDual.display_order,
      status: 'PUBLISHED',
      is_active: true,
      updated_by_user_id: userId,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    return {
      section: null,
      error:
        insertError?.message ||
        'No se pudo inicializar la sección dual_banners en public.homepage_sections.',
    };
  }

  return {
    section: mapSupabaseHomepageSectionRow(inserted as Record<string, unknown>),
    error: null,
  };
}

// ============================================================================
// 4. CONSULTAS PÚBLICAS (SOLO PUBLICADO, ACTIVO Y VIGENTE — SPRINT C5)
// ============================================================================

/**
 * Carga en una sola ronda paralela (evitando consultas N+1) todas las secciones,
 * elementos repetibles y asignaciones relacionales de la portada pública.
 *
 * Reglas de seguridad (Sprint C5):
 * - Utiliza exclusivamente consultas públicas `SELECT` sujetas a RLS.
 * - Aplica además filtros explícitos (`is_active = true`, `status = 'PUBLISHED'`)
 *   y validación de vigencia (`evaluateCampaignScheduleState === 'ACTIVE_NOW'`)
 *   para que ni siquiera un administrador autenticado vea borradores o contenido
 *   inactivo/vencido al navegar la tienda pública (`/`).
 * - Verifica que todo ítem o target pertenezca a una sección padre publicada,
 *   activa y vigente.
 * - Jamás reemplaza un error de Supabase por datos inventados.
 */
export async function getPublicHomepageSnapshot(): Promise<PublicHomepageSnapshot> {
  const nowMs = Date.now();

  if (isSupabaseConfigured()) {
    try {
      const [sectionsRes, itemsRes, targetsRes] = await Promise.all([
        supabase
          .from('homepage_sections')
          .select(
            'id, code, section_type, admin_name, title, subtitle, badge_text, badge_variant, cta_label, cta_url, config_json, display_order, status, is_active, starts_at, ends_at, created_at, updated_at'
          )
          .eq('is_active', true)
          .eq('status', 'PUBLISHED')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('homepage_section_items')
          .select(
            'id, section_id, item_type, admin_name, badge_text, badge_variant, title, subtitle, icon_name, icon_color_hex, image_desktop_url, image_mobile_url, image_alt_text, cta_primary_label, cta_primary_url, cta_secondary_label, cta_secondary_url, open_in_new_tab, category_id, product_id, style_json, display_order, status, is_active, starts_at, ends_at, created_at, updated_at'
          )
          .eq('is_active', true)
          .eq('status', 'PUBLISHED')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('homepage_section_targets')
          .select(
            'id, section_id, target_type, collection_key, product_id, category_id, display_order, is_active, created_at'
          )
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true }),
      ]);

      if (sectionsRes.error) {
        return {
          sections: [],
          items: [],
          targets: [],
          error:
            sectionsRes.error.message ||
            'No se pudieron cargar las secciones de la portada desde Supabase.',
        };
      }

      const activeSections = (sectionsRes.data ?? [])
        .map((row) => mapSupabaseHomepageSectionRow(row as Record<string, unknown>))
        .filter(
          (sec) =>
            sec.is_active &&
            sec.status === 'PUBLISHED' &&
            evaluateCampaignScheduleState(sec.starts_at, sec.ends_at, nowMs) ===
              'ACTIVE_NOW'
        )
        .sort((a, b) => a.display_order - b.display_order);

      const activeSectionIds = new Set(activeSections.map((s) => s.id));

      const activeItems: HomepageSectionItem[] = !itemsRes.error && itemsRes.data
        ? itemsRes.data
            .map((row) => mapSupabaseHomepageItemRow(row as Record<string, unknown>))
            .filter(
              (item) =>
                item.is_active &&
                item.status === 'PUBLISHED' &&
                activeSectionIds.has(item.section_id) &&
                evaluateCampaignScheduleState(item.starts_at, item.ends_at, nowMs) ===
                  'ACTIVE_NOW'
            )
            .sort((a, b) => a.display_order - b.display_order)
        : [];

      // Si la sección value_props está activa y publicada, pero la semilla C4 de beneficios aún
      // no se ha ejecutado en /admin/home (benefits_seeded !== true y no hay registros BENEFIT_ITEM),
      // proporcionar los 4 beneficios iniciales asociados al ID real de value_props.
      const activeValuePropsSec = activeSections.find(
        (s) =>
          s.code === VALUE_PROPS_SECTION_CODE ||
          s.section_type === 'VALUE_PROPOSITION'
      );
      if (
        activeValuePropsSec &&
        activeValuePropsSec.config_json?.benefits_seeded !== true &&
        !activeItems.some((i) => i.item_type === 'BENEFIT_ITEM')
      ) {
        const seededBenefitsForSection = SEED_BENEFIT_ITEMS.map((b) => ({
          ...b,
          section_id: activeValuePropsSec.id,
        }));
        activeItems.push(...seededBenefitsForSection);
      }

      const activeTargets: HomepageSectionTarget[] =
        !targetsRes.error && targetsRes.data
          ? targetsRes.data
              .map((row) =>
                mapSupabaseHomepageTargetRow(row as Record<string, unknown>)
              )
              .filter(
                (t) => t.is_active && activeSectionIds.has(t.section_id)
              )
              .sort((a, b) => a.display_order - b.display_order)
          : [];

      return {
        sections: activeSections,
        items: activeItems,
        targets: activeTargets,
        error: itemsRes.error?.message || targetsRes.error?.message || null,
      };
    } catch (err) {
      return {
        sections: [],
        items: [],
        targets: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error de conexión al consultar la portada pública en Supabase.',
      };
    }
  }

  const localSections = loadLocalHomepageSections()
    .filter(
      (sec) =>
        sec.is_active &&
        sec.status === 'PUBLISHED' &&
        evaluateCampaignScheduleState(sec.starts_at, sec.ends_at, nowMs) ===
          'ACTIVE_NOW'
    )
    .sort((a, b) => a.display_order - b.display_order);

  const localActiveSectionIds = new Set(localSections.map((s) => s.id));

  const localItems = loadLocalHomepageItems()
    .filter(
      (item) =>
        item.is_active &&
        item.status === 'PUBLISHED' &&
        localActiveSectionIds.has(item.section_id) &&
        evaluateCampaignScheduleState(item.starts_at, item.ends_at, nowMs) ===
          'ACTIVE_NOW'
    )
    .sort((a, b) => a.display_order - b.display_order);

  const localTargets = loadLocalHomepageTargets()
    .filter((t) => t.is_active && localActiveSectionIds.has(t.section_id))
    .sort((a, b) => a.display_order - b.display_order);

  return {
    sections: localSections,
    items: localItems,
    targets: localTargets,
    error: null,
  };
}

export async function getPublicHomepageSections(): Promise<HomepageSection[]> {
  const snapshot = await getPublicHomepageSnapshot();
  return snapshot.sections;
}

export async function getPublicHeroSlides(): Promise<HomepageSectionItem[]> {
  const snapshot = await getPublicHomepageSnapshot();
  return snapshot.items.filter((i) => i.item_type === 'HERO_SLIDE');
}

export async function getPublicHeroPromoCards(): Promise<HomepageSectionItem[]> {
  const snapshot = await getPublicHomepageSnapshot();
  return snapshot.items.filter((i) => i.item_type === 'PROMO_CARD');
}

export async function getPublicSecondaryBanners(): Promise<HomepageSectionItem[]> {
  const snapshot = await getPublicHomepageSnapshot();
  return snapshot.items.filter((i) => i.item_type === 'SECONDARY_BANNER');
}

// ============================================================================
// 5. ADMINISTRACIÓN DE SECCIONES DE PORTADA (public.homepage_sections — SPRINT C3)
// ============================================================================

function validateHomepageSectionInput(input: HomepageSectionAdminInput): {
  valid: boolean;
  code: string | null;
  sectionType: HomepageSectionType;
  adminName: string;
  title: string | null;
  subtitle: string | null;
  badgeText: string | null;
  badgeVariant: HomepageBadgeVariant | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  displayOrder: number;
  status: HomepagePublishStatus;
  isActive: boolean;
  startsAtIso: string | null;
  endsAtIso: string | null;
  error: string | null;
} {
  const sectionType = normalizeSectionType(input.section_type);
  if (!sectionType) {
    return {
      valid: false,
      code: null,
      sectionType: 'INFO_BLOCK',
      adminName: '',
      title: null,
      subtitle: null,
      badgeText: null,
      badgeVariant: null,
      ctaLabel: null,
      ctaUrl: null,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error:
        'El tipo de sección seleccionado no es válido. Usa únicamente uno de los 10 tipos admitidos por public.homepage_sections.',
    };
  }

  const adminName = (input.admin_name ?? '').trim();
  if (adminName.length < 2) {
    return {
      valid: false,
      code: null,
      sectionType,
      adminName: '',
      title: null,
      subtitle: null,
      badgeText: null,
      badgeVariant: null,
      ctaLabel: null,
      ctaUrl: null,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: 'El nombre interno administrativo de la sección es obligatorio (mínimo 2 caracteres).',
    };
  }

  const rawCode = (input.code ?? '').trim().toLowerCase();
  const code = rawCode ? rawCode.replace(/[^a-z0-9_-]/g, '_') : null;

  const title = (input.title ?? '').trim() || null;
  const subtitle = (input.subtitle ?? '').trim() || null;
  const badgeText = (input.badge_text ?? '').trim() || null;
  const badgeVariant = badgeText
    ? normalizeBadgeVariant(input.badge_variant) || 'PRO'
    : normalizeBadgeVariant(input.badge_variant);

  const ctaLabel = (input.cta_label ?? '').trim() || null;
  const ctaUrlValidation = validateHomepageSlideUrl(input.cta_url, {
    required: Boolean(ctaLabel),
    fieldLabel: 'La URL del CTA principal de la sección',
  });

  if (!ctaUrlValidation.valid) {
    return {
      valid: false,
      code,
      sectionType,
      adminName,
      title,
      subtitle,
      badgeText,
      badgeVariant,
      ctaLabel,
      ctaUrl: null,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: ctaUrlValidation.error,
    };
  }

  if (!ctaLabel && ctaUrlValidation.sanitizedUrl) {
    return {
      valid: false,
      code,
      sectionType,
      adminName,
      title,
      subtitle,
      badgeText,
      badgeVariant,
      ctaLabel: null,
      ctaUrl: null,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: 'Si defines una URL para el CTA de la sección, debes ingresar también el texto del botón CTA.',
    };
  }

  const scheduleValidation = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleValidation.valid) {
    return {
      valid: false,
      code,
      sectionType,
      adminName,
      title,
      subtitle,
      badgeText,
      badgeVariant,
      ctaLabel,
      ctaUrl: ctaUrlValidation.sanitizedUrl,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: scheduleValidation.error,
    };
  }

  const rawOrder = Number(input.display_order);
  const displayOrder = Number.isFinite(rawOrder)
    ? Math.max(0, Math.round(rawOrder))
    : 1;

  return {
    valid: true,
    code,
    sectionType,
    adminName,
    title,
    subtitle,
    badgeText,
    badgeVariant,
    ctaLabel,
    ctaUrl: ctaUrlValidation.sanitizedUrl,
    displayOrder,
    status: normalizePublishStatus(input.status),
    isActive: input.is_active !== false,
    startsAtIso: scheduleValidation.startsAtIso,
    endsAtIso: scheduleValidation.endsAtIso,
    error: null,
  };
}

/**
 * Obtiene todas las secciones de la portada ordenadas por `display_order` junto con el conteo
 * de ítems hijos en `public.homepage_section_items`.
 */
export async function getAdminHomepageSections(): Promise<{
  sections: HomepageSectionWithStats[];
  error: string | null;
}> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      sections: [],
      error: access.error || 'No tienes permisos para administrar las secciones de la portada.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      await ensureAdminHomepageC3Seeded(access.userId);

      const { data: secRows, error: secError } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (secError) {
        return {
          sections: [],
          error: `Error al cargar las secciones desde Supabase: ${secError.message}`,
        };
      }

      const { data: itemRows } = await supabase
        .from('homepage_section_items')
        .select('id, section_id');

      const countBySectionId = new Map<string, number>();
      for (const r of itemRows || []) {
        const sid = String((r as { section_id?: string }).section_id || '');
        if (sid) {
          countBySectionId.set(sid, (countBySectionId.get(sid) || 0) + 1);
        }
      }

      const mappedSections = (secRows || [])
        .map((r) => mapSupabaseHomepageSectionRow(r as Record<string, unknown>))
        .sort((a, b) => a.display_order - b.display_order);

      saveLocalHomepageSections(mappedSections);

      const withStats: HomepageSectionWithStats[] = mappedSections.map((sec) => ({
        ...sec,
        items_count: countBySectionId.get(sec.id) || 0,
        is_protected_base: isProtectedBaseSectionCode(sec.code),
      }));

      return { sections: withStats, error: null };
    } catch (err) {
      return {
        sections: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al consultar las secciones de portada.',
      };
    }
  }

  const localSecs = loadLocalHomepageSections();
  const localItems = loadLocalHomepageItems();
  const countMap = new Map<string, number>();
  for (const item of localItems) {
    countMap.set(item.section_id, (countMap.get(item.section_id) || 0) + 1);
  }

  return {
    sections: localSecs.map((sec) => ({
      ...sec,
      items_count: countMap.get(sec.id) || 0,
      is_protected_base: isProtectedBaseSectionCode(sec.code),
    })),
    error: null,
  };
}

/**
 * Crea una nueva sección en `public.homepage_sections`.
 */
export async function createAdminHomepageSection(
  input: HomepageSectionAdminInput
): Promise<HomepageSectionMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error: access.error || 'No tienes permisos para crear secciones de portada.',
    };
  }

  const validated = validateHomepageSectionInput(input);
  if (!validated.valid) {
    return { section: null, error: validated.error };
  }

  if (isSupabaseConfigured()) {
    try {
      if (validated.code) {
        const { data: dupCode } = await supabase
          .from('homepage_sections')
          .select('id')
          .eq('code', validated.code)
          .maybeSingle();

        if (dupCode) {
          return {
            section: null,
            error: `Ya existe una sección con el código identificador "${validated.code}". Usa un código diferente o déjalo vacío.`,
          };
        }
      }

      const { data: inserted, error: insertError } = await supabase
        .from('homepage_sections')
        .insert({
          code: validated.code,
          section_type: validated.sectionType,
          admin_name: validated.adminName,
          title: validated.title,
          subtitle: validated.subtitle,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          cta_label: validated.ctaLabel,
          cta_url: validated.ctaUrl,
          config_json: {},
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .select('*')
        .single();

      if (insertError || !inserted) {
        return {
          section: null,
          error:
            insertError?.message ||
            'No se pudo crear la sección en public.homepage_sections.',
        };
      }

      const created = mapSupabaseHomepageSectionRow(inserted as Record<string, unknown>);
      const localList = loadLocalHomepageSections();
      saveLocalHomepageSections(
        [...localList, created].sort((a, b) => a.display_order - b.display_order)
      );

      return { section: created, error: null };
    } catch (err) {
      return {
        section: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al crear la sección de portada.',
      };
    }
  }

  const nowIso = new Date().toISOString();
  const newSec: HomepageSection = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sec-${Date.now()}`,
    code: validated.code,
    section_type: validated.sectionType,
    admin_name: validated.adminName,
    title: validated.title,
    subtitle: validated.subtitle,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    cta_label: validated.ctaLabel,
    cta_url: validated.ctaUrl,
    config_json: {},
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_by_user_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const list = loadLocalHomepageSections();
  saveLocalHomepageSections(
    [...list, newSec].sort((a, b) => a.display_order - b.display_order)
  );
  return { section: newSec, error: null };
}

/**
 * Actualiza una sección existente en `public.homepage_sections`.
 * Si la sección es una de las 7 secciones estructurales base, preserva su `code` y su `section_type` estructural.
 */
export async function updateAdminHomepageSection(
  sectionId: string,
  input: HomepageSectionAdminInput
): Promise<HomepageSectionMutationResult> {
  const cleanId = (sectionId ?? '').trim();
  if (!cleanId) {
    return { section: null, error: 'El identificador de la sección es obligatorio.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error: access.error || 'No tienes permisos para editar secciones de portada.',
    };
  }

  const validated = validateHomepageSectionInput(input);
  if (!validated.valid) {
    return { section: null, error: validated.error };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: currentRow, error: fetchError } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (fetchError || !currentRow) {
        return {
          section: null,
          error: fetchError?.message || 'La sección que intentas editar no existe.',
        };
      }

      const existing = mapSupabaseHomepageSectionRow(
        currentRow as Record<string, unknown>
      );
      const isProtected = isProtectedBaseSectionCode(existing.code);

      const { data: updatedRow, error: updateError } = await supabase
        .from('homepage_sections')
        .update({
          code: isProtected ? existing.code : validated.code,
          section_type: isProtected ? existing.section_type : validated.sectionType,
          admin_name: validated.adminName,
          title: validated.title,
          subtitle: validated.subtitle,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          cta_label: validated.ctaLabel,
          cta_url: validated.ctaUrl,
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .select('*')
        .single();

      if (updateError || !updatedRow) {
        return {
          section: null,
          error:
            updateError?.message ||
            'No se pudo actualizar la sección en public.homepage_sections.',
        };
      }

      const updated = mapSupabaseHomepageSectionRow(
        updatedRow as Record<string, unknown>
      );
      const localList = loadLocalHomepageSections().map((s) =>
        s.id === cleanId ? updated : s
      );
      saveLocalHomepageSections(
        localList.sort((a, b) => a.display_order - b.display_order)
      );

      return { section: updated, error: null };
    } catch (err) {
      return {
        section: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar la sección de portada.',
      };
    }
  }

  const localList = loadLocalHomepageSections();
  const existing = localList.find((s) => s.id === cleanId);
  if (!existing) {
    return { section: null, error: 'La sección seleccionada no existe.' };
  }
  const isProtected = isProtectedBaseSectionCode(existing.code);
  const updatedLocal: HomepageSection = {
    ...existing,
    code: isProtected ? existing.code : validated.code,
    section_type: isProtected ? existing.section_type : validated.sectionType,
    admin_name: validated.adminName,
    title: validated.title,
    subtitle: validated.subtitle,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    cta_label: validated.ctaLabel,
    cta_url: validated.ctaUrl,
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_at: new Date().toISOString(),
  };

  saveLocalHomepageSections(
    localList
      .map((s) => (s.id === cleanId ? updatedLocal : s))
      .sort((a, b) => a.display_order - b.display_order)
  );
  return { section: updatedLocal, error: null };
}

/**
 * Activa o desactiva una sección de la portada (`is_active`).
 */
export async function toggleAdminHomepageSectionActive(
  sectionId: string,
  isActive: boolean
): Promise<HomepageSectionMutationResult> {
  const cleanId = (sectionId ?? '').trim();
  if (!cleanId) {
    return { section: null, error: 'Identificador de sección inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error: access.error || 'No tienes permisos para cambiar el estado de la sección.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_sections')
        .update({
          is_active: Boolean(isActive),
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          section: null,
          error: error?.message || 'No se pudo cambiar el estado activo de la sección.',
        };
      }

      const mapped = mapSupabaseHomepageSectionRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageSections(
        loadLocalHomepageSections().map((s) => (s.id === cleanId ? mapped : s))
      );
      return { section: mapped, error: null };
    } catch (err) {
      return {
        section: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado de la sección.',
      };
    }
  }

  const localSecs = loadLocalHomepageSections();
  const target = localSecs.find((s) => s.id === cleanId);
  if (!target) {
    return { section: null, error: 'La sección seleccionada no existe.' };
  }
  const updated: HomepageSection = {
    ...target,
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageSections(localSecs.map((s) => (s.id === cleanId ? updated : s)));
  return { section: updated, error: null };
}

/**
 * Cambia el estado de publicación de una sección entre `'DRAFT'` y `'PUBLISHED'`.
 */
export async function updateAdminHomepageSectionPublishStatus(
  sectionId: string,
  status: HomepagePublishStatus
): Promise<HomepageSectionMutationResult> {
  const cleanId = (sectionId ?? '').trim();
  if (!cleanId) {
    return { section: null, error: 'Identificador de sección inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error:
        access.error ||
        'No tienes permisos para cambiar el estado de publicación de la sección.',
    };
  }

  const normalizedStatus = normalizePublishStatus(status);

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_sections')
        .update({
          status: normalizedStatus,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          section: null,
          error:
            error?.message ||
            'No se pudo actualizar el estado de publicación de la sección.',
        };
      }

      const mapped = mapSupabaseHomepageSectionRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageSections(
        loadLocalHomepageSections().map((s) => (s.id === cleanId ? mapped : s))
      );
      return { section: mapped, error: null };
    } catch (err) {
      return {
        section: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado de publicación de la sección.',
      };
    }
  }

  const localSecs = loadLocalHomepageSections();
  const target = localSecs.find((s) => s.id === cleanId);
  if (!target) {
    return { section: null, error: 'La sección seleccionada no existe.' };
  }
  const updated: HomepageSection = {
    ...target,
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageSections(localSecs.map((s) => (s.id === cleanId ? updated : s)));
  return { section: updated, error: null };
}

/**
 * Reordena las secciones de la portada (`display_order`).
 */
export async function reorderAdminHomepageSections(
  orderedSections: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para reordenar las secciones.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      for (const item of orderedSections) {
        const { error } = await supabase
          .from('homepage_sections')
          .update({
            display_order: item.display_order,
            updated_by_user_id: access.userId,
          })
          .eq('id', item.id);

        if (error) {
          return {
            success: false,
            error: `No se pudo actualizar el orden de la sección: ${error.message}`,
          };
        }
      }

      const orderMap = new Map(orderedSections.map((o) => [o.id, o.display_order]));
      const updatedLocal = loadLocalHomepageSections()
        .map((s) =>
          orderMap.has(s.id)
            ? { ...s, display_order: orderMap.get(s.id) ?? s.display_order }
            : s
        )
        .sort((a, b) => a.display_order - b.display_order);
      saveLocalHomepageSections(updatedLocal);

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al reordenar las secciones de la portada.',
      };
    }
  }

  const orderMap = new Map(orderedSections.map((o) => [o.id, o.display_order]));
  const updatedLocal = loadLocalHomepageSections()
    .map((s) =>
      orderMap.has(s.id)
        ? { ...s, display_order: orderMap.get(s.id) ?? s.display_order }
        : s
    )
    .sort((a, b) => a.display_order - b.display_order);
  saveLocalHomepageSections(updatedLocal);
  return { success: true, error: null };
}

/**
 * Elimina un archivo del bucket `public-assets` únicamente si ningún otro registro
 * en `public.homepage_section_items` continúa referenciando la misma URL.
 * Garantiza que las operaciones de reemplazo o eliminación en Storage jamás afecten
 * imágenes compartidas o reutilizadas por otros contenidos de la tienda.
 */
async function deleteHomepageAssetIfUnreferenced(
  assetUrl: string | null | undefined,
  excludedItemIds: string[] = []
): Promise<void> {
  const cleanUrl = (assetUrl ?? '').trim();
  if (!cleanUrl) return;

  if (isSupabaseConfigured()) {
    try {
      const { data: referencingRows, error } = await supabase
        .from('homepage_section_items')
        .select('id, image_desktop_url, image_mobile_url')
        .or(`image_desktop_url.eq.${cleanUrl},image_mobile_url.eq.${cleanUrl}`);

      if (!error && Array.isArray(referencingRows)) {
        const excludedSet = new Set(excludedItemIds.map((id) => id.trim()));
        const stillUsedByAnotherItem = referencingRows.some((row) => {
          const id = String((row as { id?: unknown }).id ?? '').trim();
          return id && !excludedSet.has(id);
        });
        if (stillUsedByAnotherItem) {
          return;
        }
      }
    } catch {
      // Continuar de forma segura si la verificación opcional falla
    }
  }

  await deletePublicStoreAsset(cleanUrl);
}

/**
 * Elimina una sección de la portada (`public.homepage_sections`).
 * - Si la sección pertenece a las 7 secciones estructurales base (`isProtectedBaseSectionCode`),
 *   bloquea su eliminación física y solicita desactivarla (`is_active = false`) o pasarla a `DRAFT`.
 * - Para secciones adicionales creadas por el administrador, tras confirmar el `DELETE` en PostgreSQL
 *   (que elimina en cascada sus ítems hijos por `ON DELETE CASCADE`), limpia las imágenes asociadas en `public-assets`.
 */
export async function deleteAdminHomepageSection(
  sectionId: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanId = (sectionId ?? '').trim();
  if (!cleanId) {
    return { success: false, error: 'Identificador de sección inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para eliminar secciones de la portada.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: secRow, error: fetchError } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (fetchError || !secRow) {
        return {
          success: false,
          error: fetchError?.message || 'La sección que intentas eliminar ya no existe.',
        };
      }

      const sectionToDelete = mapSupabaseHomepageSectionRow(
        secRow as Record<string, unknown>
      );

      if (isProtectedBaseSectionCode(sectionToDelete.code)) {
        return {
          success: false,
          error: `La sección estructural "${sectionToDelete.admin_name}" (${sectionToDelete.code}) forma parte de la arquitectura base de la portada y no debe eliminarse físicamente. Puedes desactivarla o cambiarla a Borrador (DRAFT).`,
        };
      }

      // Consultar ítems hijos antes de eliminar para limpiar sus imágenes de Storage tras el DELETE en cascada
      const { data: childItems } = await supabase
        .from('homepage_section_items')
        .select('id, image_desktop_url, image_mobile_url')
        .eq('section_id', cleanId);

      const { error: deleteError } = await supabase
        .from('homepage_sections')
        .delete()
        .eq('id', cleanId);

      if (deleteError) {
        return {
          success: false,
          error: `No se pudo eliminar la sección: ${deleteError.message}`,
        };
      }

      const deletedChildIds = (childItems || [])
        .map((c) => String((c as { id?: unknown }).id ?? '').trim())
        .filter(Boolean);

      // Limpieza compensatoria posterior en Storage de cualquier imagen perteneciente a los ítems eliminados en cascada
      for (const child of childItems || []) {
        const c = child as {
          image_desktop_url?: string | null;
          image_mobile_url?: string | null;
        };
        if (
          c.image_desktop_url &&
          (isHomepageSlidePublicAssetUrl(c.image_desktop_url) ||
            isHomepagePromoCardPublicAssetUrl(c.image_desktop_url) ||
            isHomepageBannerPublicAssetUrl(c.image_desktop_url) ||
            isHomepageInfoCardPublicAssetUrl(c.image_desktop_url))
        ) {
          await deleteHomepageAssetIfUnreferenced(c.image_desktop_url, deletedChildIds);
        }
        if (
          c.image_mobile_url &&
          (isHomepageSlidePublicAssetUrl(c.image_mobile_url) ||
            isHomepageBannerPublicAssetUrl(c.image_mobile_url))
        ) {
          await deleteHomepageAssetIfUnreferenced(c.image_mobile_url, deletedChildIds);
        }
      }

      saveLocalHomepageSections(
        loadLocalHomepageSections().filter((s) => s.id !== cleanId)
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().filter((i) => i.section_id !== cleanId)
      );

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al eliminar la sección de portada.',
      };
    }
  }

  const localSecs = loadLocalHomepageSections();
  const target = localSecs.find((s) => s.id === cleanId);
  if (!target) {
    return { success: false, error: 'La sección seleccionada no existe.' };
  }
  if (isProtectedBaseSectionCode(target.code)) {
    return {
      success: false,
      error: `La sección estructural "${target.admin_name}" (${target.code}) no puede eliminarse físicamente. Desactívala o cámbiala a Borrador (DRAFT).`,
    };
  }

  saveLocalHomepageSections(localSecs.filter((s) => s.id !== cleanId));
  saveLocalHomepageItems(
    loadLocalHomepageItems().filter((i) => i.section_id !== cleanId)
  );
  return { success: true, error: null };
}

// ============================================================================
// 6. OPERACIONES ADMINISTRATIVAS DEL HERO BANNER (/admin/home — SPRINT C2)
// ============================================================================

export async function getAdminHeroBannerData(): Promise<{
  section: HomepageSection;
  slides: HomepageSectionItem[];
  error: string | null;
}> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: SEED_HERO_SECTION,
      slides: [],
      error: access.error || 'No tienes permisos para consultar la administración del Hero Banner.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const sectionResult = await ensureAdminHeroMainSection(access.userId);
      if (sectionResult.error || !sectionResult.section) {
        return {
          section: SEED_HERO_SECTION,
          slides: [],
          error: sectionResult.error,
        };
      }

      const { data: rows, error: itemsError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('section_id', sectionResult.section.id)
        .eq('item_type', 'HERO_SLIDE')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (itemsError) {
        return {
          section: sectionResult.section,
          slides: [],
          error: `Error al cargar los slides del Hero desde Supabase: ${itemsError.message}`,
        };
      }

      const mappedSlides = (rows || [])
        .map((r) => mapSupabaseHomepageItemRow(r as Record<string, unknown>))
        .sort((a, b) => a.display_order - b.display_order);

      saveLocalHeroSlides(mappedSlides);

      return {
        section: sectionResult.section,
        slides: mappedSlides,
        error: null,
      };
    } catch (err) {
      return {
        section: SEED_HERO_SECTION,
        slides: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al consultar los slides del Hero.',
      };
    }
  }

  const localSlides = loadLocalHeroSlides();
  return {
    section: SEED_HERO_SECTION,
    slides: localSlides,
    error: null,
  };
}

/**
 * Valida de forma integral el formulario de creación/edición de un ítem promocional
 * (`HERO_SLIDE`, `PROMO_CARD` o `SECONDARY_BANNER`).
 */
function validateHomepagePromotionalItemInput(
  input: {
    admin_name: string;
    badge_text?: string | null;
    badge_variant?: HomepageBadgeVariant | null;
    title: string;
    subtitle?: string | null;
    image_alt_text?: string | null;
    cta_primary_label?: string | null;
    cta_primary_url?: string | null;
    cta_secondary_label?: string | null;
    cta_secondary_url?: string | null;
    open_in_new_tab?: boolean;
    display_order?: number;
    status?: HomepagePublishStatus;
    is_active?: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  },
  entityLabel: string = 'elemento'
): {
  valid: boolean;
  adminName: string;
  badgeText: string | null;
  badgeVariant: HomepageBadgeVariant;
  title: string;
  subtitle: string | null;
  imageAltText: string | null;
  ctaPrimaryLabel: string | null;
  ctaPrimaryUrl: string | null;
  ctaSecondaryLabel: string | null;
  ctaSecondaryUrl: string | null;
  openInNewTab: boolean;
  displayOrder: number;
  status: HomepagePublishStatus;
  isActive: boolean;
  startsAtIso: string | null;
  endsAtIso: string | null;
  error: string | null;
} {
  const adminName = (input.admin_name ?? '').trim();
  if (adminName.length < 2) {
    return {
      valid: false,
      adminName: '',
      badgeText: null,
      badgeVariant: 'PRO',
      title: '',
      subtitle: null,
      imageAltText: null,
      ctaPrimaryLabel: null,
      ctaPrimaryUrl: null,
      ctaSecondaryLabel: null,
      ctaSecondaryUrl: null,
      openInNewTab: false,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: `El nombre interno administrativo del ${entityLabel} es obligatorio (mínimo 2 caracteres).`,
    };
  }

  const title = (input.title ?? '').trim();
  if (title.length < 3) {
    return {
      valid: false,
      adminName,
      badgeText: null,
      badgeVariant: 'PRO',
      title: '',
      subtitle: null,
      imageAltText: null,
      ctaPrimaryLabel: null,
      ctaPrimaryUrl: null,
      ctaSecondaryLabel: null,
      ctaSecondaryUrl: null,
      openInNewTab: false,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: `El título principal del ${entityLabel} es obligatorio (mínimo 3 caracteres).`,
    };
  }

  const badgeText = (input.badge_text ?? '').trim() || null;
  const badgeVariant = normalizeBadgeVariant(input.badge_variant) || 'PRO';
  const subtitle = (input.subtitle ?? '').trim() || null;
  const imageAltText = (input.image_alt_text ?? '').trim() || title;

  const ctaPrimaryLabel = (input.cta_primary_label ?? '').trim() || null;
  const primaryUrlValidation = validateHomepageSlideUrl(input.cta_primary_url, {
    required: Boolean(ctaPrimaryLabel),
    fieldLabel: 'La URL del botón principal',
  });

  if (!primaryUrlValidation.valid) {
    return {
      valid: false,
      adminName,
      badgeText,
      badgeVariant,
      title,
      subtitle,
      imageAltText,
      ctaPrimaryLabel,
      ctaPrimaryUrl: null,
      ctaSecondaryLabel: null,
      ctaSecondaryUrl: null,
      openInNewTab: false,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: primaryUrlValidation.error,
    };
  }

  if (!ctaPrimaryLabel && primaryUrlValidation.sanitizedUrl) {
    return {
      valid: false,
      adminName,
      badgeText,
      badgeVariant,
      title,
      subtitle,
      imageAltText,
      ctaPrimaryLabel: null,
      ctaPrimaryUrl: null,
      ctaSecondaryLabel: null,
      ctaSecondaryUrl: null,
      openInNewTab: false,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error:
        'Si defines una URL para el botón principal, debes ingresar también el texto del botón principal.',
    };
  }

  const ctaSecondaryLabel = (input.cta_secondary_label ?? '').trim() || null;
  const secondaryUrlValidation = validateHomepageSlideUrl(input.cta_secondary_url, {
    required: Boolean(ctaSecondaryLabel),
    fieldLabel: 'La URL del botón secundario',
  });

  if (!secondaryUrlValidation.valid) {
    return {
      valid: false,
      adminName,
      badgeText,
      badgeVariant,
      title,
      subtitle,
      imageAltText,
      ctaPrimaryLabel,
      ctaPrimaryUrl: primaryUrlValidation.sanitizedUrl,
      ctaSecondaryLabel,
      ctaSecondaryUrl: null,
      openInNewTab: false,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: secondaryUrlValidation.error,
    };
  }

  if (!ctaSecondaryLabel && secondaryUrlValidation.sanitizedUrl) {
    return {
      valid: false,
      adminName,
      badgeText,
      badgeVariant,
      title,
      subtitle,
      imageAltText,
      ctaPrimaryLabel,
      ctaPrimaryUrl: primaryUrlValidation.sanitizedUrl,
      ctaSecondaryLabel: null,
      ctaSecondaryUrl: null,
      openInNewTab: false,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error:
        'Si defines una URL para el botón secundario, debes ingresar también el texto del botón secundario.',
    };
  }

  const scheduleValidation = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleValidation.valid) {
    return {
      valid: false,
      adminName,
      badgeText,
      badgeVariant,
      title,
      subtitle,
      imageAltText,
      ctaPrimaryLabel,
      ctaPrimaryUrl: primaryUrlValidation.sanitizedUrl,
      ctaSecondaryLabel,
      ctaSecondaryUrl: secondaryUrlValidation.sanitizedUrl,
      openInNewTab: false,
      displayOrder: 1,
      status: 'PUBLISHED',
      isActive: true,
      startsAtIso: null,
      endsAtIso: null,
      error: scheduleValidation.error,
    };
  }

  const rawOrder = Number(input.display_order);
  const displayOrder = Number.isFinite(rawOrder)
    ? Math.max(0, Math.round(rawOrder))
    : 1;

  return {
    valid: true,
    adminName,
    badgeText,
    badgeVariant,
    title,
    subtitle,
    imageAltText,
    ctaPrimaryLabel,
    ctaPrimaryUrl: primaryUrlValidation.sanitizedUrl,
    ctaSecondaryLabel,
    ctaSecondaryUrl: secondaryUrlValidation.sanitizedUrl,
    openInNewTab: Boolean(input.open_in_new_tab),
    displayOrder,
    status: normalizePublishStatus(input.status),
    isActive: input.is_active !== false,
    startsAtIso: scheduleValidation.startsAtIso,
    endsAtIso: scheduleValidation.endsAtIso,
    error: null,
  };
}

export async function createAdminHeroSlide(
  input: HeroSlideAdminInput
): Promise<HeroSlideMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      slide: null,
      error: access.error || 'No tienes permisos para crear slides en el Hero Banner.',
    };
  }

  const validated = validateHomepagePromotionalItemInput(input, 'slide');
  if (!validated.valid) {
    return { slide: null, error: validated.error };
  }

  let uploadedDesktopPath: string | null = null;
  let uploadedMobilePath: string | null = null;
  let finalDesktopUrl: string | null = (input.image_desktop_url ?? '').trim() || null;
  let finalMobileUrl: string | null = (input.image_mobile_url ?? '').trim() || null;

  if (finalDesktopUrl) {
    const checkDesktop = validateHomepageSlideUrl(finalDesktopUrl, {
      fieldLabel: 'La URL de imagen de escritorio',
    });
    if (!checkDesktop.valid) {
      return { slide: null, error: checkDesktop.error };
    }
    finalDesktopUrl = checkDesktop.sanitizedUrl;
  }

  if (finalMobileUrl) {
    const checkMobile = validateHomepageSlideUrl(finalMobileUrl, {
      fieldLabel: 'La URL de imagen móvil',
    });
    if (!checkMobile.valid) {
      return { slide: null, error: checkMobile.error };
    }
    finalMobileUrl = checkMobile.sanitizedUrl;
  }

  if (input.desktopImageFile) {
    const desktopUpload = await uploadPublicStoreAsset(
      input.desktopImageFile,
      'home/slides/desktop'
    );
    if (desktopUpload.error || !desktopUpload.publicUrl) {
      return {
        slide: null,
        error:
          desktopUpload.error ||
          'No se pudo subir la imagen de escritorio a public-assets/home/slides/desktop/.',
      };
    }
    uploadedDesktopPath = desktopUpload.path;
    finalDesktopUrl = desktopUpload.publicUrl;
  }

  if (input.mobileImageFile) {
    const mobileUpload = await uploadPublicStoreAsset(
      input.mobileImageFile,
      'home/slides/mobile'
    );
    if (mobileUpload.error || !mobileUpload.publicUrl) {
      if (uploadedDesktopPath) {
        await deletePublicStoreAsset(uploadedDesktopPath);
      }
      return {
        slide: null,
        error:
          mobileUpload.error ||
          'No se pudo subir la imagen móvil a public-assets/home/slides/mobile/.',
      };
    }
    uploadedMobilePath = mobileUpload.path;
    finalMobileUrl = mobileUpload.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      const sectionResult = await ensureAdminHeroMainSection(access.userId);
      if (sectionResult.error || !sectionResult.section) {
        if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
        if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
        return {
          slide: null,
          error:
            sectionResult.error ||
            'No se pudo localizar la sección principal del Hero Banner.',
        };
      }

      const { data: inserted, error: insertError } = await supabase
        .from('homepage_section_items')
        .insert({
          section_id: sectionResult.section.id,
          item_type: 'HERO_SLIDE',
          admin_name: validated.adminName,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          title: validated.title,
          subtitle: validated.subtitle,
          image_desktop_url: finalDesktopUrl,
          image_mobile_url: finalMobileUrl,
          image_alt_text: validated.imageAltText,
          cta_primary_label: validated.ctaPrimaryLabel,
          cta_primary_url: validated.ctaPrimaryUrl,
          cta_secondary_label: validated.ctaSecondaryLabel,
          cta_secondary_url: validated.ctaSecondaryUrl,
          open_in_new_tab: validated.openInNewTab,
          category_id: input.category_id || null,
          product_id: input.product_id || null,
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .select('*')
        .single();

      if (insertError || !inserted) {
        if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
        if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
        return {
          slide: null,
          error:
            insertError?.message ||
            'No se pudo registrar el slide en public.homepage_section_items.',
        };
      }

      const createdSlide = mapSupabaseHomepageItemRow(
        inserted as Record<string, unknown>
      );
      const currentLocal = loadLocalHeroSlides();
      saveLocalHeroSlides(
        [...currentLocal, createdSlide].sort(
          (a, b) => a.display_order - b.display_order
        )
      );

      return { slide: createdSlide, error: null };
    } catch (err) {
      if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
      if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
      return {
        slide: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al crear el slide en Supabase.',
      };
    }
  }

  const nowIso = new Date().toISOString();
  const newLocalSlide: HomepageSectionItem = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `slide-${Date.now()}`,
    section_id: HERO_MAIN_SECTION_ID,
    item_type: 'HERO_SLIDE',
    admin_name: validated.adminName,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    title: validated.title,
    subtitle: validated.subtitle,
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: finalDesktopUrl,
    image_mobile_url: finalMobileUrl,
    image_alt_text: validated.imageAltText,
    cta_primary_label: validated.ctaPrimaryLabel,
    cta_primary_url: validated.ctaPrimaryUrl,
    cta_secondary_label: validated.ctaSecondaryLabel,
    cta_secondary_url: validated.ctaSecondaryUrl,
    open_in_new_tab: validated.openInNewTab,
    category_id: input.category_id || null,
    product_id: input.product_id || null,
    style_json: {},
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_by_user_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const slides = loadLocalHeroSlides();
  saveLocalHeroSlides(
    [...slides, newLocalSlide].sort((a, b) => a.display_order - b.display_order)
  );
  return { slide: newLocalSlide, error: null };
}

export async function updateAdminHeroSlide(
  slideId: string,
  input: HeroSlideAdminInput
): Promise<HeroSlideMutationResult> {
  const cleanId = (slideId ?? '').trim();
  if (!cleanId) {
    return { slide: null, error: 'El identificador del slide es obligatorio.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      slide: null,
      error: access.error || 'No tienes permisos para editar slides del Hero Banner.',
    };
  }

  const validated = validateHomepagePromotionalItemInput(input, 'slide');
  if (!validated.valid) {
    return { slide: null, error: validated.error };
  }

  let existingSlide: HomepageSectionItem | null = null;
  if (isSupabaseConfigured()) {
    const { data: currentRow, error: fetchError } = await supabase
      .from('homepage_section_items')
      .select('*')
      .eq('id', cleanId)
      .eq('item_type', 'HERO_SLIDE')
      .maybeSingle();

    if (fetchError) {
      return {
        slide: null,
        error: `No se pudo obtener el slide actual antes de editar: ${fetchError.message}`,
      };
    }
    if (!currentRow) {
      return {
        slide: null,
        error: 'El slide que intentas editar ya no existe en la base de datos.',
      };
    }
    existingSlide = mapSupabaseHomepageItemRow(
      currentRow as Record<string, unknown>
    );
  } else {
    existingSlide =
      loadLocalHeroSlides().find((s) => s.id === cleanId) || null;
    if (!existingSlide) {
      return { slide: null, error: 'El slide seleccionado no existe.' };
    }
  }

  const previousDesktopUrl = existingSlide.image_desktop_url;
  const previousMobileUrl = existingSlide.image_mobile_url;

  let nextDesktopUrl: string | null = input.removeDesktopImage
    ? null
    : input.image_desktop_url !== undefined
      ? (input.image_desktop_url ?? '').trim() || null
      : previousDesktopUrl;

  let nextMobileUrl: string | null = input.removeMobileImage
    ? null
    : input.image_mobile_url !== undefined
      ? (input.image_mobile_url ?? '').trim() || null
      : previousMobileUrl;

  if (nextDesktopUrl) {
    const checkDesktop = validateHomepageSlideUrl(nextDesktopUrl, {
      fieldLabel: 'La URL de imagen de escritorio',
    });
    if (!checkDesktop.valid) {
      return { slide: null, error: checkDesktop.error };
    }
    nextDesktopUrl = checkDesktop.sanitizedUrl;
  }

  if (nextMobileUrl) {
    const checkMobile = validateHomepageSlideUrl(nextMobileUrl, {
      fieldLabel: 'La URL de imagen móvil',
    });
    if (!checkMobile.valid) {
      return { slide: null, error: checkMobile.error };
    }
    nextMobileUrl = checkMobile.sanitizedUrl;
  }

  let uploadedDesktopPath: string | null = null;
  let uploadedMobilePath: string | null = null;

  if (input.desktopImageFile) {
    const desktopUpload = await uploadPublicStoreAsset(
      input.desktopImageFile,
      'home/slides/desktop'
    );
    if (desktopUpload.error || !desktopUpload.publicUrl) {
      return {
        slide: null,
        error:
          desktopUpload.error ||
          'No se pudo subir la nueva imagen de escritorio a public-assets.',
      };
    }
    uploadedDesktopPath = desktopUpload.path;
    nextDesktopUrl = desktopUpload.publicUrl;
  }

  if (input.mobileImageFile) {
    const mobileUpload = await uploadPublicStoreAsset(
      input.mobileImageFile,
      'home/slides/mobile'
    );
    if (mobileUpload.error || !mobileUpload.publicUrl) {
      if (uploadedDesktopPath) {
        await deletePublicStoreAsset(uploadedDesktopPath);
      }
      return {
        slide: null,
        error:
          mobileUpload.error ||
          'No se pudo subir la nueva imagen móvil a public-assets.',
      };
    }
    uploadedMobilePath = mobileUpload.path;
    nextMobileUrl = mobileUpload.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error: updateError } = await supabase
        .from('homepage_section_items')
        .update({
          admin_name: validated.adminName,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          title: validated.title,
          subtitle: validated.subtitle,
          image_desktop_url: nextDesktopUrl,
          image_mobile_url: nextMobileUrl,
          image_alt_text: validated.imageAltText,
          cta_primary_label: validated.ctaPrimaryLabel,
          cta_primary_url: validated.ctaPrimaryUrl,
          cta_secondary_label: validated.ctaSecondaryLabel,
          cta_secondary_url: validated.ctaSecondaryUrl,
          open_in_new_tab: validated.openInNewTab,
          category_id:
            input.category_id !== undefined
              ? input.category_id
              : existingSlide.category_id,
          product_id:
            input.product_id !== undefined
              ? input.product_id
              : existingSlide.product_id,
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'HERO_SLIDE')
        .select('*')
        .single();

      if (updateError || !updatedRow) {
        if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
        if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
        return {
          slide: null,
          error:
            updateError?.message ||
            'No se pudo actualizar el slide en public.homepage_section_items (se conservaron las imágenes anteriores).',
        };
      }

      if (
        previousDesktopUrl &&
        previousDesktopUrl !== nextDesktopUrl &&
        isHomepageSlidePublicAssetUrl(previousDesktopUrl, 'desktop')
      ) {
        await deleteHomepageAssetIfUnreferenced(previousDesktopUrl, [cleanId]);
      }

      if (
        previousMobileUrl &&
        previousMobileUrl !== nextMobileUrl &&
        isHomepageSlidePublicAssetUrl(previousMobileUrl, 'mobile')
      ) {
        await deleteHomepageAssetIfUnreferenced(previousMobileUrl, [cleanId]);
      }

      const updatedSlide = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      const localList = loadLocalHeroSlides().map((s) =>
        s.id === cleanId ? updatedSlide : s
      );
      saveLocalHeroSlides(
        localList.sort((a, b) => a.display_order - b.display_order)
      );

      return { slide: updatedSlide, error: null };
    } catch (err) {
      if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
      if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
      return {
        slide: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar el slide en Supabase.',
      };
    }
  }

  const updatedLocal: HomepageSectionItem = {
    ...existingSlide,
    admin_name: validated.adminName,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    title: validated.title,
    subtitle: validated.subtitle,
    image_desktop_url: nextDesktopUrl,
    image_mobile_url: nextMobileUrl,
    image_alt_text: validated.imageAltText,
    cta_primary_label: validated.ctaPrimaryLabel,
    cta_primary_url: validated.ctaPrimaryUrl,
    cta_secondary_label: validated.ctaSecondaryLabel,
    cta_secondary_url: validated.ctaSecondaryUrl,
    open_in_new_tab: validated.openInNewTab,
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_at: new Date().toISOString(),
  };

  const nextList = loadLocalHeroSlides()
    .map((s) => (s.id === cleanId ? updatedLocal : s))
    .sort((a, b) => a.display_order - b.display_order);
  saveLocalHeroSlides(nextList);

  return { slide: updatedLocal, error: null };
}

export async function toggleAdminHeroSlideActive(
  slideId: string,
  isActive: boolean
): Promise<HeroSlideMutationResult> {
  const cleanId = (slideId ?? '').trim();
  if (!cleanId) {
    return { slide: null, error: 'Identificador de slide inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      slide: null,
      error: access.error || 'No tienes permisos para cambiar el estado del slide.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          is_active: Boolean(isActive),
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'HERO_SLIDE')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          slide: null,
          error: error?.message || 'No se pudo cambiar el estado activo/inactivo del slide.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      const localList = loadLocalHeroSlides().map((s) =>
        s.id === cleanId ? mapped : s
      );
      saveLocalHeroSlides(localList);
      return { slide: mapped, error: null };
    } catch (err) {
      return {
        slide: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado del slide.',
      };
    }
  }

  const localSlides = loadLocalHeroSlides();
  const target = localSlides.find((s) => s.id === cleanId);
  if (!target) {
    return { slide: null, error: 'El slide seleccionado no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };
  saveLocalHeroSlides(localSlides.map((s) => (s.id === cleanId ? updated : s)));
  return { slide: updated, error: null };
}

export async function updateAdminHeroSlidePublishStatus(
  slideId: string,
  status: HomepagePublishStatus
): Promise<HeroSlideMutationResult> {
  const cleanId = (slideId ?? '').trim();
  if (!cleanId) {
    return { slide: null, error: 'Identificador de slide inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      slide: null,
      error:
        access.error ||
        'No tienes permisos para cambiar el estado de publicación del slide.',
    };
  }

  const normalizedStatus = normalizePublishStatus(status);

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          status: normalizedStatus,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'HERO_SLIDE')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          slide: null,
          error:
            error?.message ||
            'No se pudo actualizar el estado de publicación del slide.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      const localList = loadLocalHeroSlides().map((s) =>
        s.id === cleanId ? mapped : s
      );
      saveLocalHeroSlides(localList);
      return { slide: mapped, error: null };
    } catch (err) {
      return {
        slide: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado de publicación.',
      };
    }
  }

  const localSlides = loadLocalHeroSlides();
  const target = localSlides.find((s) => s.id === cleanId);
  if (!target) {
    return { slide: null, error: 'El slide seleccionado no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  saveLocalHeroSlides(localSlides.map((s) => (s.id === cleanId ? updated : s)));
  return { slide: updated, error: null };
}

export async function reorderAdminHeroSlides(
  orderedSlides: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para reordenar los slides.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      for (const item of orderedSlides) {
        const { error } = await supabase
          .from('homepage_section_items')
          .update({
            display_order: item.display_order,
            updated_by_user_id: access.userId,
          })
          .eq('id', item.id)
          .eq('item_type', 'HERO_SLIDE');

        if (error) {
          return {
            success: false,
            error: `No se pudo actualizar el orden del slide: ${error.message}`,
          };
        }
      }

      const orderMap = new Map(orderedSlides.map((o) => [o.id, o.display_order]));
      const updatedLocal = loadLocalHeroSlides()
        .map((s) =>
          orderMap.has(s.id)
            ? { ...s, display_order: orderMap.get(s.id) ?? s.display_order }
            : s
        )
        .sort((a, b) => a.display_order - b.display_order);
      saveLocalHeroSlides(updatedLocal);

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al reordenar los slides del Hero.',
      };
    }
  }

  const orderMap = new Map(orderedSlides.map((o) => [o.id, o.display_order]));
  const updatedLocal = loadLocalHeroSlides()
    .map((s) =>
      orderMap.has(s.id)
        ? { ...s, display_order: orderMap.get(s.id) ?? s.display_order }
        : s
    )
    .sort((a, b) => a.display_order - b.display_order);
  saveLocalHeroSlides(updatedLocal);
  return { success: true, error: null };
}

export async function deleteAdminHeroSlide(
  slideId: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanId = (slideId ?? '').trim();
  if (!cleanId) {
    return { success: false, error: 'Identificador de slide inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para eliminar slides del Hero Banner.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: currentRow, error: fetchError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('id', cleanId)
        .eq('item_type', 'HERO_SLIDE')
        .maybeSingle();

      if (fetchError) {
        return {
          success: false,
          error: `No se pudo verificar el slide antes de eliminar: ${fetchError.message}`,
        };
      }

      if (!currentRow) {
        return {
          success: false,
          error: 'El slide que intentas eliminar ya no existe.',
        };
      }

      const slideToDelete = mapSupabaseHomepageItemRow(
        currentRow as Record<string, unknown>
      );

      const { error: deleteError } = await supabase
        .from('homepage_section_items')
        .delete()
        .eq('id', cleanId)
        .eq('item_type', 'HERO_SLIDE');

      if (deleteError) {
        return {
          success: false,
          error: `No se pudo eliminar el slide de public.homepage_section_items: ${deleteError.message}`,
        };
      }

      if (
        slideToDelete.image_desktop_url &&
        isHomepageSlidePublicAssetUrl(slideToDelete.image_desktop_url, 'desktop')
      ) {
        await deleteHomepageAssetIfUnreferenced(slideToDelete.image_desktop_url, [cleanId]);
      }

      if (
        slideToDelete.image_mobile_url &&
        isHomepageSlidePublicAssetUrl(slideToDelete.image_mobile_url, 'mobile')
      ) {
        await deleteHomepageAssetIfUnreferenced(slideToDelete.image_mobile_url, [cleanId]);
      }

      const remaining = loadLocalHeroSlides().filter((s) => s.id !== cleanId);
      saveLocalHeroSlides(remaining);

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al eliminar el slide del Hero.',
      };
    }
  }

  const remaining = loadLocalHeroSlides().filter((s) => s.id !== cleanId);
  saveLocalHeroSlides(remaining);
  return { success: true, error: null };
}

// ============================================================================
// 7. TARJETAS PROMOCIONALES LATERALES DEL HERO (item_type = 'PROMO_CARD' — SPRINT C3)
// ============================================================================

/**
 * Obtiene la sección `hero_main` y todas las tarjetas promocionales laterales (`PROMO_CARD`)
 * ordenadas por `display_order`.
 */
export async function getAdminHeroPromoCards(): Promise<{
  section: HomepageSection;
  cards: HomepageSectionItem[];
  error: string | null;
}> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: SEED_HERO_SECTION,
      cards: [],
      error:
        access.error ||
        'No tienes permisos para administrar las tarjetas promocionales laterales del Hero.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const sectionResult = await ensureAdminHeroMainSection(access.userId);
      if (sectionResult.error || !sectionResult.section) {
        return {
          section: SEED_HERO_SECTION,
          cards: [],
          error: sectionResult.error,
        };
      }

      const { data: rows, error: itemsError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('section_id', sectionResult.section.id)
        .eq('item_type', 'PROMO_CARD')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (itemsError) {
        return {
          section: sectionResult.section,
          cards: [],
          error: `Error al cargar las tarjetas laterales desde Supabase: ${itemsError.message}`,
        };
      }

      const mappedCards = (rows || [])
        .map((r) => mapSupabaseHomepageItemRow(r as Record<string, unknown>))
        .sort((a, b) => a.display_order - b.display_order);

      const others = loadLocalHomepageItems().filter(
        (i) => i.item_type !== 'PROMO_CARD'
      );
      saveLocalHomepageItems([...others, ...mappedCards]);

      return {
        section: sectionResult.section,
        cards: mappedCards,
        error: null,
      };
    } catch (err) {
      return {
        section: SEED_HERO_SECTION,
        cards: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al consultar las tarjetas laterales del Hero.',
      };
    }
  }

  const localCards = loadLocalHomepageItems()
    .filter((i) => i.item_type === 'PROMO_CARD')
    .sort((a, b) => a.display_order - b.display_order);

  return {
    section: SEED_HERO_SECTION,
    cards: localCards,
    error: null,
  };
}

/**
 * Crea una nueva tarjeta promocional lateral del Hero (`item_type = 'PROMO_CARD'`).
 * - Si se adjunta imagen opcional, la sube primero a `public-assets/home/promos/`.
 * - Si falla la inserción en PostgreSQL, aplica limpieza compensatoria sobre el archivo subido.
 */
export async function createAdminHeroPromoCard(
  input: PromoCardAdminInput
): Promise<PromoCardMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      card: null,
      error:
        access.error ||
        'No tienes permisos para crear tarjetas promocionales laterales.',
    };
  }

  const validated = validateHomepagePromotionalItemInput(
    input,
    'tarjeta promocional lateral'
  );
  if (!validated.valid) {
    return { card: null, error: validated.error };
  }

  let uploadedImagePath: string | null = null;
  let finalImageUrl: string | null = (input.image_desktop_url ?? '').trim() || null;

  if (finalImageUrl) {
    const checkImg = validateHomepageSlideUrl(finalImageUrl, {
      fieldLabel: 'La URL de imagen de la tarjeta promocional',
    });
    if (!checkImg.valid) {
      return { card: null, error: checkImg.error };
    }
    finalImageUrl = checkImg.sanitizedUrl;
  }

  if (input.promoImageFile) {
    const uploadRes = await uploadPublicStoreAsset(
      input.promoImageFile,
      'home/promos'
    );
    if (uploadRes.error || !uploadRes.publicUrl) {
      return {
        card: null,
        error:
          uploadRes.error ||
          'No se pudo subir la imagen de la tarjeta a public-assets/home/promos/.',
      };
    }
    uploadedImagePath = uploadRes.path;
    finalImageUrl = uploadRes.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      const sectionResult = await ensureAdminHeroMainSection(access.userId);
      if (sectionResult.error || !sectionResult.section) {
        if (uploadedImagePath) await deletePublicStoreAsset(uploadedImagePath);
        return {
          card: null,
          error:
            sectionResult.error ||
            'No se pudo localizar la sección principal del Hero Banner.',
        };
      }

      const { data: inserted, error: insertError } = await supabase
        .from('homepage_section_items')
        .insert({
          section_id: sectionResult.section.id,
          item_type: 'PROMO_CARD',
          admin_name: validated.adminName,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          title: validated.title,
          subtitle: validated.subtitle,
          image_desktop_url: finalImageUrl,
          image_mobile_url: null,
          image_alt_text: validated.imageAltText,
          cta_primary_label: validated.ctaPrimaryLabel,
          cta_primary_url: validated.ctaPrimaryUrl,
          cta_secondary_label: null,
          cta_secondary_url: null,
          open_in_new_tab: validated.openInNewTab,
          category_id: input.category_id || null,
          product_id: input.product_id || null,
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .select('*')
        .single();

      if (insertError || !inserted) {
        if (uploadedImagePath) await deletePublicStoreAsset(uploadedImagePath);
        return {
          card: null,
          error:
            insertError?.message ||
            'No se pudo registrar la tarjeta promocional en public.homepage_section_items.',
        };
      }

      const createdCard = mapSupabaseHomepageItemRow(
        inserted as Record<string, unknown>
      );
      const allLocal = loadLocalHomepageItems();
      saveLocalHomepageItems([...allLocal, createdCard]);

      return { card: createdCard, error: null };
    } catch (err) {
      if (uploadedImagePath) await deletePublicStoreAsset(uploadedImagePath);
      return {
        card: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al crear la tarjeta promocional en Supabase.',
      };
    }
  }

  const nowIso = new Date().toISOString();
  const newLocalCard: HomepageSectionItem = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `promo-${Date.now()}`,
    section_id: HERO_MAIN_SECTION_ID,
    item_type: 'PROMO_CARD',
    admin_name: validated.adminName,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    title: validated.title,
    subtitle: validated.subtitle,
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: finalImageUrl,
    image_mobile_url: null,
    image_alt_text: validated.imageAltText,
    cta_primary_label: validated.ctaPrimaryLabel,
    cta_primary_url: validated.ctaPrimaryUrl,
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: validated.openInNewTab,
    category_id: input.category_id || null,
    product_id: input.product_id || null,
    style_json: {},
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_by_user_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  saveLocalHomepageItems([...loadLocalHomepageItems(), newLocalCard]);
  return { card: newLocalCard, error: null };
}

/**
 * Actualiza una tarjeta promocional lateral del Hero (`item_type = 'PROMO_CARD'`).
 * - Sube primero cualquier nueva imagen a `public-assets/home/promos/`.
 * - Si falla PostgreSQL, conserva intacta la imagen anterior y elimina el archivo recién subido.
 * - Solo tras confirmar el guardado en PostgreSQL, elimina la imagen anterior si fue reemplazada o removida.
 */
export async function updateAdminHeroPromoCard(
  cardId: string,
  input: PromoCardAdminInput
): Promise<PromoCardMutationResult> {
  const cleanId = (cardId ?? '').trim();
  if (!cleanId) {
    return { card: null, error: 'El identificador de la tarjeta es obligatorio.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      card: null,
      error:
        access.error ||
        'No tienes permisos para editar tarjetas promocionales laterales.',
    };
  }

  const validated = validateHomepagePromotionalItemInput(
    input,
    'tarjeta promocional lateral'
  );
  if (!validated.valid) {
    return { card: null, error: validated.error };
  }

  let existingCard: HomepageSectionItem | null = null;
  if (isSupabaseConfigured()) {
    const { data: currentRow, error: fetchError } = await supabase
      .from('homepage_section_items')
      .select('*')
      .eq('id', cleanId)
      .eq('item_type', 'PROMO_CARD')
      .maybeSingle();

    if (fetchError || !currentRow) {
      return {
        card: null,
        error:
          fetchError?.message ||
          'La tarjeta promocional que intentas editar ya no existe.',
      };
    }
    existingCard = mapSupabaseHomepageItemRow(
      currentRow as Record<string, unknown>
    );
  } else {
    existingCard =
      loadLocalHomepageItems().find(
        (i) => i.id === cleanId && i.item_type === 'PROMO_CARD'
      ) || null;
    if (!existingCard) {
      return { card: null, error: 'La tarjeta seleccionada no existe.' };
    }
  }

  const previousImageUrl = existingCard.image_desktop_url;
  let nextImageUrl: string | null = input.removePromoImage
    ? null
    : input.image_desktop_url !== undefined
      ? (input.image_desktop_url ?? '').trim() || null
      : previousImageUrl;

  if (nextImageUrl) {
    const checkImg = validateHomepageSlideUrl(nextImageUrl, {
      fieldLabel: 'La URL de imagen de la tarjeta promocional',
    });
    if (!checkImg.valid) {
      return { card: null, error: checkImg.error };
    }
    nextImageUrl = checkImg.sanitizedUrl;
  }

  let uploadedImagePath: string | null = null;
  if (input.promoImageFile) {
    const uploadRes = await uploadPublicStoreAsset(
      input.promoImageFile,
      'home/promos'
    );
    if (uploadRes.error || !uploadRes.publicUrl) {
      return {
        card: null,
        error:
          uploadRes.error ||
          'No se pudo subir la nueva imagen de la tarjeta a public-assets/home/promos/.',
      };
    }
    uploadedImagePath = uploadRes.path;
    nextImageUrl = uploadRes.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error: updateError } = await supabase
        .from('homepage_section_items')
        .update({
          admin_name: validated.adminName,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          title: validated.title,
          subtitle: validated.subtitle,
          image_desktop_url: nextImageUrl,
          image_alt_text: validated.imageAltText,
          cta_primary_label: validated.ctaPrimaryLabel,
          cta_primary_url: validated.ctaPrimaryUrl,
          open_in_new_tab: validated.openInNewTab,
          category_id:
            input.category_id !== undefined
              ? input.category_id
              : existingCard.category_id,
          product_id:
            input.product_id !== undefined
              ? input.product_id
              : existingCard.product_id,
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'PROMO_CARD')
        .select('*')
        .single();

      if (updateError || !updatedRow) {
        if (uploadedImagePath) await deletePublicStoreAsset(uploadedImagePath);
        return {
          card: null,
          error:
            updateError?.message ||
            'No se pudo actualizar la tarjeta en public.homepage_section_items (se conservó la imagen anterior).',
        };
      }

      if (
        previousImageUrl &&
        previousImageUrl !== nextImageUrl &&
        isHomepagePromoCardPublicAssetUrl(previousImageUrl)
      ) {
        await deleteHomepageAssetIfUnreferenced(previousImageUrl, [cleanId]);
      }

      const updatedCard = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) =>
          i.id === cleanId ? updatedCard : i
        )
      );

      return { card: updatedCard, error: null };
    } catch (err) {
      if (uploadedImagePath) await deletePublicStoreAsset(uploadedImagePath);
      return {
        card: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar la tarjeta promocional.',
      };
    }
  }

  const updatedLocal: HomepageSectionItem = {
    ...existingCard,
    admin_name: validated.adminName,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    title: validated.title,
    subtitle: validated.subtitle,
    image_desktop_url: nextImageUrl,
    image_alt_text: validated.imageAltText,
    cta_primary_label: validated.ctaPrimaryLabel,
    cta_primary_url: validated.ctaPrimaryUrl,
    open_in_new_tab: validated.openInNewTab,
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_at: new Date().toISOString(),
  };

  saveLocalHomepageItems(
    loadLocalHomepageItems().map((i) => (i.id === cleanId ? updatedLocal : i))
  );
  return { card: updatedLocal, error: null };
}

export async function toggleAdminHeroPromoCardActive(
  cardId: string,
  isActive: boolean
): Promise<PromoCardMutationResult> {
  const cleanId = (cardId ?? '').trim();
  if (!cleanId) {
    return { card: null, error: 'Identificador de tarjeta inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      card: null,
      error: access.error || 'No tienes permisos para cambiar el estado de la tarjeta.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          is_active: Boolean(isActive),
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'PROMO_CARD')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          card: null,
          error: error?.message || 'No se pudo cambiar el estado de la tarjeta.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { card: mapped, error: null };
    } catch (err) {
      return {
        card: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado de la tarjeta.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find((i) => i.id === cleanId && i.item_type === 'PROMO_CARD');
  if (!target) {
    return { card: null, error: 'La tarjeta seleccionada no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { card: updated, error: null };
}

export async function updateAdminHeroPromoCardPublishStatus(
  cardId: string,
  status: HomepagePublishStatus
): Promise<PromoCardMutationResult> {
  const cleanId = (cardId ?? '').trim();
  if (!cleanId) {
    return { card: null, error: 'Identificador de tarjeta inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      card: null,
      error:
        access.error ||
        'No tienes permisos para cambiar el estado de publicación de la tarjeta.',
    };
  }

  const normalizedStatus = normalizePublishStatus(status);

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          status: normalizedStatus,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'PROMO_CARD')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          card: null,
          error:
            error?.message ||
            'No se pudo actualizar el estado de publicación de la tarjeta.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { card: mapped, error: null };
    } catch (err) {
      return {
        card: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado de publicación de la tarjeta.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find((i) => i.id === cleanId && i.item_type === 'PROMO_CARD');
  if (!target) {
    return { card: null, error: 'La tarjeta seleccionada no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { card: updated, error: null };
}

export async function reorderAdminHeroPromoCards(
  orderedCards: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para reordenar las tarjetas laterales.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      for (const item of orderedCards) {
        const { error } = await supabase
          .from('homepage_section_items')
          .update({
            display_order: item.display_order,
            updated_by_user_id: access.userId,
          })
          .eq('id', item.id)
          .eq('item_type', 'PROMO_CARD');

        if (error) {
          return {
            success: false,
            error: `No se pudo actualizar el orden de la tarjeta: ${error.message}`,
          };
        }
      }

      const orderMap = new Map(orderedCards.map((o) => [o.id, o.display_order]));
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) =>
          orderMap.has(i.id)
            ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
            : i
        )
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al reordenar las tarjetas laterales.',
      };
    }
  }

  const orderMap = new Map(orderedCards.map((o) => [o.id, o.display_order]));
  saveLocalHomepageItems(
    loadLocalHomepageItems().map((i) =>
      orderMap.has(i.id)
        ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
        : i
    )
  );
  return { success: true, error: null };
}

export async function deleteAdminHeroPromoCard(
  cardId: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanId = (cardId ?? '').trim();
  if (!cleanId) {
    return { success: false, error: 'Identificador de tarjeta inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error:
        access.error ||
        'No tienes permisos para eliminar tarjetas promocionales laterales.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: currentRow, error: fetchError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('id', cleanId)
        .eq('item_type', 'PROMO_CARD')
        .maybeSingle();

      if (fetchError || !currentRow) {
        return {
          success: false,
          error:
            fetchError?.message ||
            'La tarjeta promocional que intentas eliminar ya no existe.',
        };
      }

      const cardToDelete = mapSupabaseHomepageItemRow(
        currentRow as Record<string, unknown>
      );

      const { error: deleteError } = await supabase
        .from('homepage_section_items')
        .delete()
        .eq('id', cleanId)
        .eq('item_type', 'PROMO_CARD');

      if (deleteError) {
        return {
          success: false,
          error: `No se pudo eliminar la tarjeta de public.homepage_section_items: ${deleteError.message}`,
        };
      }

      if (
        cardToDelete.image_desktop_url &&
        isHomepagePromoCardPublicAssetUrl(cardToDelete.image_desktop_url)
      ) {
        await deleteHomepageAssetIfUnreferenced(cardToDelete.image_desktop_url, [cleanId]);
      }

      saveLocalHomepageItems(
        loadLocalHomepageItems().filter((i) => i.id !== cleanId)
      );

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al eliminar la tarjeta promocional.',
      };
    }
  }

  saveLocalHomepageItems(
    loadLocalHomepageItems().filter((i) => i.id !== cleanId)
  );
  return { success: true, error: null };
}

// ============================================================================
// 8. BANNERS PROMOCIONALES SECUNDARIOS (item_type = 'SECONDARY_BANNER' — SPRINT C3)
// ============================================================================

/**
 * Obtiene la sección `dual_banners` (`PROMO_BANNERS`) y todos los banners promocionales
 * secundarios (`SECONDARY_BANNER`) ordenados por `display_order`.
 */
export async function getAdminSecondaryBanners(): Promise<{
  section: HomepageSection;
  banners: HomepageSectionItem[];
  error: string | null;
}> {
  const seedDual = SEED_HOMEPAGE_SECTIONS.find(
    (s) => s.code === DUAL_BANNERS_SECTION_CODE
  )!;

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: seedDual,
      banners: [],
      error:
        access.error ||
        'No tienes permisos para administrar los banners promocionales secundarios.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const sectionResult = await ensureAdminPromoBannersSection(access.userId);
      if (sectionResult.error || !sectionResult.section) {
        return {
          section: seedDual,
          banners: [],
          error: sectionResult.error,
        };
      }

      const { data: rows, error: itemsError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('item_type', 'SECONDARY_BANNER')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (itemsError) {
        return {
          section: sectionResult.section,
          banners: [],
          error: `Error al cargar los banners secundarios desde Supabase: ${itemsError.message}`,
        };
      }

      const mappedBanners = (rows || [])
        .map((r) => mapSupabaseHomepageItemRow(r as Record<string, unknown>))
        .sort((a, b) => a.display_order - b.display_order);

      const others = loadLocalHomepageItems().filter(
        (i) => i.item_type !== 'SECONDARY_BANNER'
      );
      saveLocalHomepageItems([...others, ...mappedBanners]);

      return {
        section: sectionResult.section,
        banners: mappedBanners,
        error: null,
      };
    } catch (err) {
      return {
        section: seedDual,
        banners: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al consultar los banners secundarios.',
      };
    }
  }

  const localBanners = loadLocalHomepageItems()
    .filter((i) => i.item_type === 'SECONDARY_BANNER')
    .sort((a, b) => a.display_order - b.display_order);

  return {
    section: seedDual,
    banners: localBanners,
    error: null,
  };
}

/**
 * Crea un nuevo banner promocional secundario (`item_type = 'SECONDARY_BANNER'`).
 * - Sube primero cualquier imagen de escritorio (`home/banners/desktop/`) y/o móvil (`home/banners/mobile/`).
 * - Si falla PostgreSQL, limpia los archivos recién subidos mediante limpieza compensatoria.
 */
export async function createAdminSecondaryBanner(
  input: SecondaryBannerAdminInput
): Promise<SecondaryBannerMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      banner: null,
      error:
        access.error ||
        'No tienes permisos para crear banners promocionales secundarios.',
    };
  }

  const validated = validateHomepagePromotionalItemInput(
    input,
    'banner promocional secundario'
  );
  if (!validated.valid) {
    return { banner: null, error: validated.error };
  }

  let uploadedDesktopPath: string | null = null;
  let uploadedMobilePath: string | null = null;
  let finalDesktopUrl: string | null = (input.image_desktop_url ?? '').trim() || null;
  let finalMobileUrl: string | null = (input.image_mobile_url ?? '').trim() || null;

  if (finalDesktopUrl) {
    const checkDesktop = validateHomepageSlideUrl(finalDesktopUrl, {
      fieldLabel: 'La URL de imagen de escritorio del banner',
    });
    if (!checkDesktop.valid) {
      return { banner: null, error: checkDesktop.error };
    }
    finalDesktopUrl = checkDesktop.sanitizedUrl;
  }

  if (finalMobileUrl) {
    const checkMobile = validateHomepageSlideUrl(finalMobileUrl, {
      fieldLabel: 'La URL de imagen móvil del banner',
    });
    if (!checkMobile.valid) {
      return { banner: null, error: checkMobile.error };
    }
    finalMobileUrl = checkMobile.sanitizedUrl;
  }

  if (input.desktopImageFile) {
    const desktopUpload = await uploadPublicStoreAsset(
      input.desktopImageFile,
      'home/banners/desktop'
    );
    if (desktopUpload.error || !desktopUpload.publicUrl) {
      return {
        banner: null,
        error:
          desktopUpload.error ||
          'No se pudo subir la imagen de escritorio a public-assets/home/banners/desktop/.',
      };
    }
    uploadedDesktopPath = desktopUpload.path;
    finalDesktopUrl = desktopUpload.publicUrl;
  }

  if (input.mobileImageFile) {
    const mobileUpload = await uploadPublicStoreAsset(
      input.mobileImageFile,
      'home/banners/mobile'
    );
    if (mobileUpload.error || !mobileUpload.publicUrl) {
      if (uploadedDesktopPath) {
        await deletePublicStoreAsset(uploadedDesktopPath);
      }
      return {
        banner: null,
        error:
          mobileUpload.error ||
          'No se pudo subir la imagen móvil a public-assets/home/banners/mobile/.',
      };
    }
    uploadedMobilePath = mobileUpload.path;
    finalMobileUrl = mobileUpload.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      let targetSectionId = (input.section_id ?? '').trim() || null;
      if (!targetSectionId) {
        const sectionResult = await ensureAdminPromoBannersSection(access.userId);
        if (sectionResult.error || !sectionResult.section) {
          if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
          if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
          return {
            banner: null,
            error:
              sectionResult.error ||
              'No se pudo localizar la sección de Banners Promocionales Secundarios.',
          };
        }
        targetSectionId = sectionResult.section.id;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('homepage_section_items')
        .insert({
          section_id: targetSectionId,
          item_type: 'SECONDARY_BANNER',
          admin_name: validated.adminName,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          title: validated.title,
          subtitle: validated.subtitle,
          image_desktop_url: finalDesktopUrl,
          image_mobile_url: finalMobileUrl,
          image_alt_text: validated.imageAltText,
          cta_primary_label: validated.ctaPrimaryLabel,
          cta_primary_url: validated.ctaPrimaryUrl,
          cta_secondary_label: validated.ctaSecondaryLabel,
          cta_secondary_url: validated.ctaSecondaryUrl,
          open_in_new_tab: validated.openInNewTab,
          category_id: input.category_id || null,
          product_id: input.product_id || null,
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .select('*')
        .single();

      if (insertError || !inserted) {
        if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
        if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
        return {
          banner: null,
          error:
            insertError?.message ||
            'No se pudo registrar el banner secundario en public.homepage_section_items.',
        };
      }

      const createdBanner = mapSupabaseHomepageItemRow(
        inserted as Record<string, unknown>
      );
      saveLocalHomepageItems([...loadLocalHomepageItems(), createdBanner]);

      return { banner: createdBanner, error: null };
    } catch (err) {
      if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
      if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
      return {
        banner: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al crear el banner secundario en Supabase.',
      };
    }
  }

  const nowIso = new Date().toISOString();
  const newLocalBanner: HomepageSectionItem = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `banner-${Date.now()}`,
    section_id: input.section_id || DUAL_BANNERS_SECTION_ID,
    item_type: 'SECONDARY_BANNER',
    admin_name: validated.adminName,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    title: validated.title,
    subtitle: validated.subtitle,
    icon_name: null,
    icon_color_hex: null,
    image_desktop_url: finalDesktopUrl,
    image_mobile_url: finalMobileUrl,
    image_alt_text: validated.imageAltText,
    cta_primary_label: validated.ctaPrimaryLabel,
    cta_primary_url: validated.ctaPrimaryUrl,
    cta_secondary_label: validated.ctaSecondaryLabel,
    cta_secondary_url: validated.ctaSecondaryUrl,
    open_in_new_tab: validated.openInNewTab,
    category_id: input.category_id || null,
    product_id: input.product_id || null,
    style_json: {},
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_by_user_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  saveLocalHomepageItems([...loadLocalHomepageItems(), newLocalBanner]);
  return { banner: newLocalBanner, error: null };
}

/**
 * Actualiza un banner promocional secundario (`item_type = 'SECONDARY_BANNER'`).
 * - Sube primero cualquier nueva imagen Desktop (`home/banners/desktop/`) o Mobile (`home/banners/mobile/`).
 * - Si falla PostgreSQL, conserva intactos los archivos anteriores y limpia los nuevos recién subidos.
 * - Solo tras confirmar el guardado en PostgreSQL, elimina de Storage las imágenes anteriores reemplazadas o removidas.
 */
export async function updateAdminSecondaryBanner(
  bannerId: string,
  input: SecondaryBannerAdminInput
): Promise<SecondaryBannerMutationResult> {
  const cleanId = (bannerId ?? '').trim();
  if (!cleanId) {
    return { banner: null, error: 'El identificador del banner es obligatorio.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      banner: null,
      error:
        access.error ||
        'No tienes permisos para editar banners promocionales secundarios.',
    };
  }

  const validated = validateHomepagePromotionalItemInput(
    input,
    'banner promocional secundario'
  );
  if (!validated.valid) {
    return { banner: null, error: validated.error };
  }

  let existingBanner: HomepageSectionItem | null = null;
  if (isSupabaseConfigured()) {
    const { data: currentRow, error: fetchError } = await supabase
      .from('homepage_section_items')
      .select('*')
      .eq('id', cleanId)
      .eq('item_type', 'SECONDARY_BANNER')
      .maybeSingle();

    if (fetchError || !currentRow) {
      return {
        banner: null,
        error:
          fetchError?.message ||
          'El banner secundario que intentas editar ya no existe.',
      };
    }
    existingBanner = mapSupabaseHomepageItemRow(
      currentRow as Record<string, unknown>
    );
  } else {
    existingBanner =
      loadLocalHomepageItems().find(
        (i) => i.id === cleanId && i.item_type === 'SECONDARY_BANNER'
      ) || null;
    if (!existingBanner) {
      return { banner: null, error: 'El banner seleccionado no existe.' };
    }
  }

  const previousDesktopUrl = existingBanner.image_desktop_url;
  const previousMobileUrl = existingBanner.image_mobile_url;

  let nextDesktopUrl: string | null = input.removeDesktopImage
    ? null
    : input.image_desktop_url !== undefined
      ? (input.image_desktop_url ?? '').trim() || null
      : previousDesktopUrl;

  let nextMobileUrl: string | null = input.removeMobileImage
    ? null
    : input.image_mobile_url !== undefined
      ? (input.image_mobile_url ?? '').trim() || null
      : previousMobileUrl;

  if (nextDesktopUrl) {
    const checkDesktop = validateHomepageSlideUrl(nextDesktopUrl, {
      fieldLabel: 'La URL de imagen de escritorio del banner',
    });
    if (!checkDesktop.valid) {
      return { banner: null, error: checkDesktop.error };
    }
    nextDesktopUrl = checkDesktop.sanitizedUrl;
  }

  if (nextMobileUrl) {
    const checkMobile = validateHomepageSlideUrl(nextMobileUrl, {
      fieldLabel: 'La URL de imagen móvil del banner',
    });
    if (!checkMobile.valid) {
      return { banner: null, error: checkMobile.error };
    }
    nextMobileUrl = checkMobile.sanitizedUrl;
  }

  let uploadedDesktopPath: string | null = null;
  let uploadedMobilePath: string | null = null;

  if (input.desktopImageFile) {
    const desktopUpload = await uploadPublicStoreAsset(
      input.desktopImageFile,
      'home/banners/desktop'
    );
    if (desktopUpload.error || !desktopUpload.publicUrl) {
      return {
        banner: null,
        error:
          desktopUpload.error ||
          'No se pudo subir la nueva imagen de escritorio del banner.',
      };
    }
    uploadedDesktopPath = desktopUpload.path;
    nextDesktopUrl = desktopUpload.publicUrl;
  }

  if (input.mobileImageFile) {
    const mobileUpload = await uploadPublicStoreAsset(
      input.mobileImageFile,
      'home/banners/mobile'
    );
    if (mobileUpload.error || !mobileUpload.publicUrl) {
      if (uploadedDesktopPath) {
        await deletePublicStoreAsset(uploadedDesktopPath);
      }
      return {
        banner: null,
        error:
          mobileUpload.error ||
          'No se pudo subir la nueva imagen móvil del banner.',
      };
    }
    uploadedMobilePath = mobileUpload.path;
    nextMobileUrl = mobileUpload.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error: updateError } = await supabase
        .from('homepage_section_items')
        .update({
          admin_name: validated.adminName,
          badge_text: validated.badgeText,
          badge_variant: validated.badgeVariant,
          title: validated.title,
          subtitle: validated.subtitle,
          image_desktop_url: nextDesktopUrl,
          image_mobile_url: nextMobileUrl,
          image_alt_text: validated.imageAltText,
          cta_primary_label: validated.ctaPrimaryLabel,
          cta_primary_url: validated.ctaPrimaryUrl,
          cta_secondary_label: validated.ctaSecondaryLabel,
          cta_secondary_url: validated.ctaSecondaryUrl,
          open_in_new_tab: validated.openInNewTab,
          category_id:
            input.category_id !== undefined
              ? input.category_id
              : existingBanner.category_id,
          product_id:
            input.product_id !== undefined
              ? input.product_id
              : existingBanner.product_id,
          display_order: validated.displayOrder,
          status: validated.status,
          is_active: validated.isActive,
          starts_at: validated.startsAtIso,
          ends_at: validated.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'SECONDARY_BANNER')
        .select('*')
        .single();

      if (updateError || !updatedRow) {
        if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
        if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
        return {
          banner: null,
          error:
            updateError?.message ||
            'No se pudo actualizar el banner en public.homepage_section_items (se conservaron las imágenes anteriores).',
        };
      }

      if (
        previousDesktopUrl &&
        previousDesktopUrl !== nextDesktopUrl &&
        isHomepageBannerPublicAssetUrl(previousDesktopUrl, 'desktop')
      ) {
        await deleteHomepageAssetIfUnreferenced(previousDesktopUrl, [cleanId]);
      }

      if (
        previousMobileUrl &&
        previousMobileUrl !== nextMobileUrl &&
        isHomepageBannerPublicAssetUrl(previousMobileUrl, 'mobile')
      ) {
        await deleteHomepageAssetIfUnreferenced(previousMobileUrl, [cleanId]);
      }

      const updatedBanner = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) =>
          i.id === cleanId ? updatedBanner : i
        )
      );

      return { banner: updatedBanner, error: null };
    } catch (err) {
      if (uploadedDesktopPath) await deletePublicStoreAsset(uploadedDesktopPath);
      if (uploadedMobilePath) await deletePublicStoreAsset(uploadedMobilePath);
      return {
        banner: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar el banner secundario.',
      };
    }
  }

  const updatedLocal: HomepageSectionItem = {
    ...existingBanner,
    admin_name: validated.adminName,
    badge_text: validated.badgeText,
    badge_variant: validated.badgeVariant,
    title: validated.title,
    subtitle: validated.subtitle,
    image_desktop_url: nextDesktopUrl,
    image_mobile_url: nextMobileUrl,
    image_alt_text: validated.imageAltText,
    cta_primary_label: validated.ctaPrimaryLabel,
    cta_primary_url: validated.ctaPrimaryUrl,
    cta_secondary_label: validated.ctaSecondaryLabel,
    cta_secondary_url: validated.ctaSecondaryUrl,
    open_in_new_tab: validated.openInNewTab,
    display_order: validated.displayOrder,
    status: validated.status,
    is_active: validated.isActive,
    starts_at: validated.startsAtIso,
    ends_at: validated.endsAtIso,
    updated_at: new Date().toISOString(),
  };

  saveLocalHomepageItems(
    loadLocalHomepageItems().map((i) => (i.id === cleanId ? updatedLocal : i))
  );
  return { banner: updatedLocal, error: null };
}

export async function toggleAdminSecondaryBannerActive(
  bannerId: string,
  isActive: boolean
): Promise<SecondaryBannerMutationResult> {
  const cleanId = (bannerId ?? '').trim();
  if (!cleanId) {
    return { banner: null, error: 'Identificador de banner inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      banner: null,
      error: access.error || 'No tienes permisos para cambiar el estado del banner.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          is_active: Boolean(isActive),
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'SECONDARY_BANNER')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          banner: null,
          error: error?.message || 'No se pudo cambiar el estado del banner.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { banner: mapped, error: null };
    } catch (err) {
      return {
        banner: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado del banner.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'SECONDARY_BANNER'
  );
  if (!target) {
    return { banner: null, error: 'El banner seleccionado no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { banner: updated, error: null };
}

export async function updateAdminSecondaryBannerPublishStatus(
  bannerId: string,
  status: HomepagePublishStatus
): Promise<SecondaryBannerMutationResult> {
  const cleanId = (bannerId ?? '').trim();
  if (!cleanId) {
    return { banner: null, error: 'Identificador de banner inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      banner: null,
      error:
        access.error ||
        'No tienes permisos para cambiar el estado de publicación del banner.',
    };
  }

  const normalizedStatus = normalizePublishStatus(status);

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          status: normalizedStatus,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'SECONDARY_BANNER')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          banner: null,
          error:
            error?.message ||
            'No se pudo actualizar el estado de publicación del banner.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { banner: mapped, error: null };
    } catch (err) {
      return {
        banner: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado de publicación del banner.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'SECONDARY_BANNER'
  );
  if (!target) {
    return { banner: null, error: 'El banner seleccionado no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { banner: updated, error: null };
}

export async function reorderAdminSecondaryBanners(
  orderedBanners: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para reordenar los banners secundarios.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      for (const item of orderedBanners) {
        const { error } = await supabase
          .from('homepage_section_items')
          .update({
            display_order: item.display_order,
            updated_by_user_id: access.userId,
          })
          .eq('id', item.id)
          .eq('item_type', 'SECONDARY_BANNER');

        if (error) {
          return {
            success: false,
            error: `No se pudo actualizar el orden del banner: ${error.message}`,
          };
        }
      }

      const orderMap = new Map(
        orderedBanners.map((o) => [o.id, o.display_order])
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) =>
          orderMap.has(i.id)
            ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
            : i
        )
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al reordenar los banners secundarios.',
      };
    }
  }

  const orderMap = new Map(orderedBanners.map((o) => [o.id, o.display_order]));
  saveLocalHomepageItems(
    loadLocalHomepageItems().map((i) =>
      orderMap.has(i.id)
        ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
        : i
    )
  );
  return { success: true, error: null };
}

export async function deleteAdminSecondaryBanner(
  bannerId: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanId = (bannerId ?? '').trim();
  if (!cleanId) {
    return { success: false, error: 'Identificador de banner inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error:
        access.error ||
        'No tienes permisos para eliminar banners promocionales secundarios.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: currentRow, error: fetchError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('id', cleanId)
        .eq('item_type', 'SECONDARY_BANNER')
        .maybeSingle();

      if (fetchError || !currentRow) {
        return {
          success: false,
          error:
            fetchError?.message ||
            'El banner secundario que intentas eliminar ya no existe.',
        };
      }

      const bannerToDelete = mapSupabaseHomepageItemRow(
        currentRow as Record<string, unknown>
      );

      const { error: deleteError } = await supabase
        .from('homepage_section_items')
        .delete()
        .eq('id', cleanId)
        .eq('item_type', 'SECONDARY_BANNER');

      if (deleteError) {
        return {
          success: false,
          error: `No se pudo eliminar el banner de public.homepage_section_items: ${deleteError.message}`,
        };
      }

      if (
        bannerToDelete.image_desktop_url &&
        isHomepageBannerPublicAssetUrl(bannerToDelete.image_desktop_url, 'desktop')
      ) {
        await deleteHomepageAssetIfUnreferenced(bannerToDelete.image_desktop_url, [cleanId]);
      }

      if (
        bannerToDelete.image_mobile_url &&
        isHomepageBannerPublicAssetUrl(bannerToDelete.image_mobile_url, 'mobile')
      ) {
        await deleteHomepageAssetIfUnreferenced(bannerToDelete.image_mobile_url, [cleanId]);
      }

      saveLocalHomepageItems(
        loadLocalHomepageItems().filter((i) => i.id !== cleanId)
      );

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al eliminar el banner secundario.',
      };
    }
  }

  saveLocalHomepageItems(
    loadLocalHomepageItems().filter((i) => i.id !== cleanId)
  );
  return { success: true, error: null };
}

// ============================================================================
// 8. SPRINT C4: VALIDACIÓN ANTI-HTML/JS, ICONOS LUCIDE Y COLOR HEX
// ============================================================================

const HTML_OR_SCRIPT_PATTERN = /<\s*\/?\s*[a-zA-Z!][^>]*>|javascript\s*:|vbscript\s*:|on[a-z]+\s*=/i;
const VALID_HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Valida que un campo de texto plano (título, subtítulo, descripción, badge, nombre interno)
 * NO contenga etiquetas HTML arbitrarias (`<script>`, `<img>`, `<div>`, etc.) ni código JavaScript.
 */
export function validateSafePlainText(
  rawText: string | null | undefined,
  options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    fieldLabel?: string;
  }
): { valid: boolean; sanitized: string | null; error: string | null } {
  const label = options?.fieldLabel || 'El texto';
  const trimmed = (rawText ?? '').trim();

  if (!trimmed) {
    if (options?.required) {
      return {
        valid: false,
        sanitized: null,
        error: `${label} es obligatorio.`,
      };
    }
    return { valid: true, sanitized: null, error: null };
  }

  if (HTML_OR_SCRIPT_PATTERN.test(trimmed)) {
    return {
      valid: false,
      sanitized: null,
      error: `${label} no permite etiquetas HTML ni código JavaScript por seguridad.`,
    };
  }

  if (options?.minLength && trimmed.length < options.minLength) {
    return {
      valid: false,
      sanitized: null,
      error: `${label} debe tener al menos ${options.minLength} caracteres.`,
    };
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    return {
      valid: false,
      sanitized: null,
      error: `${label} no puede exceder ${options.maxLength} caracteres.`,
    };
  }

  return { valid: true, sanitized: trimmed, error: null };
}

/**
 * Valida que un nombre de icono Lucide pertenezca a la lista blanca oficial del proyecto.
 */
export function validateAllowedLucideIcon(
  rawIcon: string | null | undefined,
  required = true
): { valid: boolean; iconName: HomepageAllowedLucideIcon | null; error: string | null } {
  const trimmed = (rawIcon ?? '').trim();
  if (!trimmed) {
    if (required) {
      return {
        valid: false,
        iconName: null,
        error: 'Debes seleccionar un icono Lucide permitido.',
      };
    }
    return { valid: true, iconName: null, error: null };
  }

  const allowedNames = new Set(HOMEPAGE_ALLOWED_LUCIDE_ICONS.map((i) => i.name));
  if (!allowedNames.has(trimmed as HomepageAllowedLucideIcon)) {
    return {
      valid: false,
      iconName: null,
      error: `El icono "${trimmed}" no está dentro del catálogo de iconos Lucide permitidos del proyecto.`,
    };
  }

  return {
    valid: true,
    iconName: trimmed as HomepageAllowedLucideIcon,
    error: null,
  };
}

/**
 * Valida y normaliza en mayúsculas un código de color HEX (`#RRGGBB`) para iconos.
 */
export function validateIconHexColor(
  rawHex: string | null | undefined,
  required = true
): { valid: boolean; colorHex: string | null; error: string | null } {
  const trimmed = (rawHex ?? '').trim().toUpperCase();
  if (!trimmed) {
    if (required) {
      return {
        valid: false,
        colorHex: null,
        error: 'El color HEX del icono es obligatorio (formato #RRGGBB).',
      };
    }
    return { valid: true, colorHex: null, error: null };
  }

  if (!VALID_HEX_COLOR_PATTERN.test(trimmed)) {
    return {
      valid: false,
      colorHex: null,
      error:
        'El color del icono debe estar en formato HEX válido de 6 dígitos (ej. #3B82F6). No se permiten clases CSS arbitrarias.',
    };
  }

  return { valid: true, colorHex: trimmed, error: null };
}

// ============================================================================
// 9. SPRINT C4: ADMINISTRACIÓN DE BENEFICIOS DE SMARTLAB (`VALUE_PROPOSITION` / `BENEFIT_ITEM`)
// ============================================================================

async function ensureAdminValuePropositionSection(
  userId: string | null
): Promise<{ section: HomepageSection | null; error: string | null }> {
  const seedValueProps = SEED_HOMEPAGE_SECTIONS.find(
    (s) => s.code === VALUE_PROPS_SECTION_CODE
  )!;

  if (!isSupabaseConfigured()) {
    return { section: seedValueProps, error: null };
  }

  await ensureAdminHomepageC3Seeded(userId);

  const { data: existing, error: selectError } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('code', VALUE_PROPS_SECTION_CODE)
    .maybeSingle();

  if (selectError) {
    return {
      section: null,
      error: `No se pudo consultar la sección de Beneficios (value_props): ${selectError.message}`,
    };
  }

  if (existing) {
    return {
      section: mapSupabaseHomepageSectionRow(existing as Record<string, unknown>),
      error: null,
    };
  }

  const { data: anyValSec } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('section_type', 'VALUE_PROPOSITION')
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (anyValSec) {
    return {
      section: mapSupabaseHomepageSectionRow(anyValSec as Record<string, unknown>),
      error: null,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('homepage_sections')
    .insert({
      id: VALUE_PROPS_SECTION_ID,
      code: VALUE_PROPS_SECTION_CODE,
      section_type: 'VALUE_PROPOSITION',
      admin_name: seedValueProps.admin_name,
      title: seedValueProps.title,
      subtitle: seedValueProps.subtitle,
      config_json: seedValueProps.config_json,
      display_order: seedValueProps.display_order,
      status: 'PUBLISHED',
      is_active: true,
      updated_by_user_id: userId,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    return {
      section: null,
      error:
        insertError?.message ||
        'No se pudo inicializar la sección value_props en public.homepage_sections.',
    };
  }

  return {
    section: mapSupabaseHomepageSectionRow(inserted as Record<string, unknown>),
    error: null,
  };
}

/**
 * Consulta pública de Beneficios de SmartLab (`BENEFIT_ITEM`), solo `PUBLISHED`, activos y vigentes.
 */
export async function getPublicBenefitItems(): Promise<{
  section: HomepageSection | null;
  benefits: HomepageSectionItem[];
}> {
  const nowMs = Date.now();
  const seedSec =
    SEED_HOMEPAGE_SECTIONS.find((s) => s.code === VALUE_PROPS_SECTION_CODE) ||
    null;

  if (isSupabaseConfigured()) {
    try {
      const { data: secRow } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('code', VALUE_PROPS_SECTION_CODE)
        .eq('status', 'PUBLISHED')
        .eq('is_active', true)
        .maybeSingle();

      if (!secRow) {
        return { section: null, benefits: [] };
      }

      const section = mapSupabaseHomepageSectionRow(
        secRow as Record<string, unknown>
      );
      if (
        evaluateCampaignScheduleState(section.starts_at, section.ends_at, nowMs) !==
        'ACTIVE_NOW'
      ) {
        return { section: null, benefits: [] };
      }

      const { data: rows, error } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('section_id', section.id)
        .eq('item_type', 'BENEFIT_ITEM')
        .eq('status', 'PUBLISHED')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && rows) {
        const benefits = rows
          .map((r) => mapSupabaseHomepageItemRow(r as Record<string, unknown>))
          .filter(
            (b) =>
              evaluateCampaignScheduleState(b.starts_at, b.ends_at, nowMs) ===
              'ACTIVE_NOW'
          );
        return { section, benefits };
      }
    } catch {
      // Fallback local
    }
  }

  const localBenefits = loadLocalHomepageItems()
    .filter(
      (i) =>
        i.item_type === 'BENEFIT_ITEM' &&
        i.status === 'PUBLISHED' &&
        i.is_active
    )
    .sort((a, b) => a.display_order - b.display_order);

  return { section: seedSec, benefits: localBenefits };
}

/**
 * Consulta administrativa de todos los beneficios (`BENEFIT_ITEM`) en `VALUE_PROPOSITION`.
 */
export async function getAdminBenefitItems(): Promise<{
  section: HomepageSection;
  benefits: HomepageSectionItem[];
  error: string | null;
}> {
  const seedSec = SEED_HOMEPAGE_SECTIONS.find(
    (s) => s.code === VALUE_PROPS_SECTION_CODE
  )!;

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: seedSec,
      benefits: [],
      error:
        access.error ||
        'No tienes permisos para administrar los beneficios de SmartLab Store.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const secEnsure = await ensureAdminValuePropositionSection(access.userId);
      if (secEnsure.error || !secEnsure.section) {
        return {
          section: seedSec,
          benefits: [],
          error: secEnsure.error || 'No se pudo cargar la sección value_props.',
        };
      }

      const { data: rows, error } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('item_type', 'BENEFIT_ITEM')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        return {
          section: secEnsure.section,
          benefits: [],
          error: `Error al consultar beneficios (BENEFIT_ITEM): ${error.message}`,
        };
      }

      const benefits = (rows ?? []).map((r) =>
        mapSupabaseHomepageItemRow(r as Record<string, unknown>)
      );
      const others = loadLocalHomepageItems().filter(
        (i) => i.item_type !== 'BENEFIT_ITEM'
      );
      saveLocalHomepageItems([...others, ...benefits]);

      return { section: secEnsure.section, benefits, error: null };
    } catch (err) {
      return {
        section: seedSec,
        benefits: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cargar los beneficios.',
      };
    }
  }

  const localSec =
    loadLocalHomepageSections().find(
      (s) =>
        s.code === VALUE_PROPS_SECTION_CODE ||
        s.section_type === 'VALUE_PROPOSITION'
    ) || seedSec;

  const localBenefits = loadLocalHomepageItems()
    .filter((i) => i.item_type === 'BENEFIT_ITEM')
    .sort((a, b) => a.display_order - b.display_order);

  return { section: localSec, benefits: localBenefits, error: null };
}

export async function createAdminBenefitItem(
  input: BenefitItemAdminInput
): Promise<BenefitItemMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      benefit: null,
      error: access.error || 'No tienes permisos para crear beneficios.',
    };
  }

  const adminNameVal = validateSafePlainText(input.admin_name, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El nombre interno del beneficio',
  });
  if (!adminNameVal.valid) {
    return { benefit: null, error: adminNameVal.error };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 120,
    fieldLabel: 'El título del beneficio',
  });
  if (!titleVal.valid) {
    return { benefit: null, error: titleVal.error };
  }

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: true,
    minLength: 5,
    maxLength: 260,
    fieldLabel: 'La descripción del beneficio',
  });
  if (!subtitleVal.valid) {
    return { benefit: null, error: subtitleVal.error };
  }

  const iconVal = validateAllowedLucideIcon(input.icon_name, true);
  if (!iconVal.valid || !iconVal.iconName) {
    return { benefit: null, error: iconVal.error };
  }

  const colorVal = validateIconHexColor(input.icon_color_hex, true);
  if (!colorVal.valid || !colorVal.colorHex) {
    return { benefit: null, error: colorVal.error };
  }

  const scheduleVal = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleVal.valid) {
    return { benefit: null, error: scheduleVal.error };
  }

  const status: HomepagePublishStatus =
    input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
  const isActive = input.is_active !== false;
  const displayOrder = Number.isFinite(Number(input.display_order))
    ? Math.max(0, Math.floor(Number(input.display_order)))
    : 1;

  if (isSupabaseConfigured()) {
    try {
      let targetSectionId = (input.section_id ?? '').trim();
      if (!targetSectionId) {
        const secEnsure = await ensureAdminValuePropositionSection(
          access.userId
        );
        if (secEnsure.error || !secEnsure.section) {
          return {
            benefit: null,
            error:
              secEnsure.error ||
              'No se pudo obtener la sección padre VALUE_PROPOSITION.',
          };
        }
        targetSectionId = secEnsure.section.id;
      }

      const { data: insertedRow, error: insertError } = await supabase
        .from('homepage_section_items')
        .insert({
          section_id: targetSectionId,
          item_type: 'BENEFIT_ITEM',
          admin_name: adminNameVal.sanitized!,
          title: titleVal.sanitized!,
          subtitle: subtitleVal.sanitized!,
          icon_name: iconVal.iconName,
          icon_color_hex: colorVal.colorHex,
          display_order: displayOrder,
          status,
          is_active: isActive,
          starts_at: scheduleVal.startsAtIso,
          ends_at: scheduleVal.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .select('*')
        .single();

      if (insertError || !insertedRow) {
        return {
          benefit: null,
          error:
            insertError?.message ||
            'No se pudo registrar el beneficio en public.homepage_section_items.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        insertedRow as Record<string, unknown>
      );
      saveLocalHomepageItems([...loadLocalHomepageItems(), mapped]);
      return { benefit: mapped, error: null };
    } catch (err) {
      return {
        benefit: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al crear el beneficio.',
      };
    }
  }

  const nowIso = new Date().toISOString();
  const newItem: HomepageSectionItem = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `benefit-${Date.now()}`,
    section_id: input.section_id?.trim() || VALUE_PROPS_SECTION_ID,
    item_type: 'BENEFIT_ITEM',
    admin_name: adminNameVal.sanitized!,
    badge_text: null,
    badge_variant: null,
    title: titleVal.sanitized!,
    subtitle: subtitleVal.sanitized!,
    icon_name: iconVal.iconName,
    icon_color_hex: colorVal.colorHex,
    image_desktop_url: null,
    image_mobile_url: null,
    image_alt_text: null,
    cta_primary_label: null,
    cta_primary_url: null,
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: false,
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: displayOrder,
    status,
    is_active: isActive,
    starts_at: scheduleVal.startsAtIso,
    ends_at: scheduleVal.endsAtIso,
    updated_by_user_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  saveLocalHomepageItems([...loadLocalHomepageItems(), newItem]);
  return { benefit: newItem, error: null };
}

export async function updateAdminBenefitItem(
  benefitId: string,
  input: BenefitItemAdminInput
): Promise<BenefitItemMutationResult> {
  const cleanId = (benefitId ?? '').trim();
  if (!cleanId) {
    return { benefit: null, error: 'Identificador de beneficio inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      benefit: null,
      error: access.error || 'No tienes permisos para editar beneficios.',
    };
  }

  const adminNameVal = validateSafePlainText(input.admin_name, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El nombre interno del beneficio',
  });
  if (!adminNameVal.valid) {
    return { benefit: null, error: adminNameVal.error };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 120,
    fieldLabel: 'El título del beneficio',
  });
  if (!titleVal.valid) {
    return { benefit: null, error: titleVal.error };
  }

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: true,
    minLength: 5,
    maxLength: 260,
    fieldLabel: 'La descripción del beneficio',
  });
  if (!subtitleVal.valid) {
    return { benefit: null, error: subtitleVal.error };
  }

  const iconVal = validateAllowedLucideIcon(input.icon_name, true);
  if (!iconVal.valid || !iconVal.iconName) {
    return { benefit: null, error: iconVal.error };
  }

  const colorVal = validateIconHexColor(input.icon_color_hex, true);
  if (!colorVal.valid || !colorVal.colorHex) {
    return { benefit: null, error: colorVal.error };
  }

  const scheduleVal = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleVal.valid) {
    return { benefit: null, error: scheduleVal.error };
  }

  const status: HomepagePublishStatus =
    input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
  const isActive = input.is_active !== false;
  const displayOrder = Number.isFinite(Number(input.display_order))
    ? Math.max(0, Math.floor(Number(input.display_order)))
    : 1;

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error: updateError } = await supabase
        .from('homepage_section_items')
        .update({
          admin_name: adminNameVal.sanitized!,
          title: titleVal.sanitized!,
          subtitle: subtitleVal.sanitized!,
          icon_name: iconVal.iconName,
          icon_color_hex: colorVal.colorHex,
          display_order: displayOrder,
          status,
          is_active: isActive,
          starts_at: scheduleVal.startsAtIso,
          ends_at: scheduleVal.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'BENEFIT_ITEM')
        .select('*')
        .single();

      if (updateError || !updatedRow) {
        return {
          benefit: null,
          error:
            updateError?.message ||
            'No se pudo actualizar el beneficio en public.homepage_section_items.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { benefit: mapped, error: null };
    } catch (err) {
      return {
        benefit: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar el beneficio.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'BENEFIT_ITEM'
  );
  if (!target) {
    return { benefit: null, error: 'El beneficio seleccionado no existe.' };
  }

  const updated: HomepageSectionItem = {
    ...target,
    admin_name: adminNameVal.sanitized!,
    title: titleVal.sanitized!,
    subtitle: subtitleVal.sanitized!,
    icon_name: iconVal.iconName,
    icon_color_hex: colorVal.colorHex,
    display_order: displayOrder,
    status,
    is_active: isActive,
    starts_at: scheduleVal.startsAtIso,
    ends_at: scheduleVal.endsAtIso,
    updated_at: new Date().toISOString(),
  };

  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { benefit: updated, error: null };
}

export async function toggleAdminBenefitItemActive(
  benefitId: string,
  isActive: boolean
): Promise<BenefitItemMutationResult> {
  const cleanId = (benefitId ?? '').trim();
  if (!cleanId) {
    return { benefit: null, error: 'Identificador de beneficio inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      benefit: null,
      error: access.error || 'No tienes permisos para cambiar el estado del beneficio.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          is_active: Boolean(isActive),
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'BENEFIT_ITEM')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          benefit: null,
          error: error?.message || 'No se pudo cambiar el estado del beneficio.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { benefit: mapped, error: null };
    } catch (err) {
      return {
        benefit: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado del beneficio.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'BENEFIT_ITEM'
  );
  if (!target) {
    return { benefit: null, error: 'El beneficio seleccionado no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { benefit: updated, error: null };
}

export async function updateAdminBenefitItemPublishStatus(
  benefitId: string,
  status: HomepagePublishStatus
): Promise<BenefitItemMutationResult> {
  const cleanId = (benefitId ?? '').trim();
  if (!cleanId) {
    return { benefit: null, error: 'Identificador de beneficio inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      benefit: null,
      error:
        access.error ||
        'No tienes permisos para cambiar el estado de publicación del beneficio.',
    };
  }

  const normalizedStatus = normalizePublishStatus(status);

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          status: normalizedStatus,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'BENEFIT_ITEM')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          benefit: null,
          error:
            error?.message ||
            'No se pudo actualizar el estado de publicación del beneficio.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { benefit: mapped, error: null };
    } catch (err) {
      return {
        benefit: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar el estado de publicación del beneficio.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'BENEFIT_ITEM'
  );
  if (!target) {
    return { benefit: null, error: 'El beneficio seleccionado no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { benefit: updated, error: null };
}

export async function reorderAdminBenefitItems(
  orderedBenefits: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para reordenar beneficios.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      for (const item of orderedBenefits) {
        const { error } = await supabase
          .from('homepage_section_items')
          .update({
            display_order: item.display_order,
            updated_by_user_id: access.userId,
          })
          .eq('id', item.id)
          .eq('item_type', 'BENEFIT_ITEM');

        if (error) {
          return {
            success: false,
            error: `No se pudo actualizar el orden del beneficio: ${error.message}`,
          };
        }
      }

      const orderMap = new Map(
        orderedBenefits.map((o) => [o.id, o.display_order])
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) =>
          orderMap.has(i.id)
            ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
            : i
        )
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al reordenar beneficios.',
      };
    }
  }

  const orderMap = new Map(orderedBenefits.map((o) => [o.id, o.display_order]));
  saveLocalHomepageItems(
    loadLocalHomepageItems().map((i) =>
      orderMap.has(i.id)
        ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
        : i
    )
  );
  return { success: true, error: null };
}

export async function deleteAdminBenefitItem(
  benefitId: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanId = (benefitId ?? '').trim();
  if (!cleanId) {
    return { success: false, error: 'Identificador de beneficio inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para eliminar beneficios.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('homepage_section_items')
        .delete()
        .eq('id', cleanId)
        .eq('item_type', 'BENEFIT_ITEM');

      if (error) {
        return {
          success: false,
          error: `No se pudo eliminar el beneficio: ${error.message}`,
        };
      }

      saveLocalHomepageItems(
        loadLocalHomepageItems().filter((i) => i.id !== cleanId)
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al eliminar el beneficio.',
      };
    }
  }

  saveLocalHomepageItems(
    loadLocalHomepageItems().filter((i) => i.id !== cleanId)
  );
  return { success: true, error: null };
}

// ============================================================================
// 10. SPRINT C4: BLOQUES INFORMATIVOS (`INFO_BLOCK` / `INFO_CARD`)
// ============================================================================

async function ensureAdminInfoBlockSection(
  userId: string | null,
  preferredSectionId?: string | null
): Promise<{ section: HomepageSection | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    const localSecs = loadLocalHomepageSections();
    const existingInfo = localSecs.find(
      (s) =>
        (preferredSectionId && s.id === preferredSectionId) ||
        s.section_type === 'INFO_BLOCK'
    );
    if (existingInfo) {
      return { section: existingInfo, error: null };
    }
    const nowIso = new Date().toISOString();
    const createdInfo: HomepageSection = {
      id: '00000000-0000-4000-8000-000000000108',
      code: 'info_block_main',
      section_type: 'INFO_BLOCK',
      admin_name: 'Bloques Informativos y Garantías',
      title: 'Información Operativa y Garantías SmartLab',
      subtitle: 'Conoce cómo funciona nuestro proceso de entrega verificada y soporte.',
      badge_text: 'INFORMACIÓN OFICIAL',
      badge_variant: 'primary',
      cta_label: null,
      cta_url: null,
      config_json: { columns_desktop: 3 },
      display_order: 8,
      status: 'PUBLISHED',
      is_active: true,
      starts_at: null,
      ends_at: null,
      updated_by_user_id: null,
      created_at: nowIso,
      updated_at: nowIso,
    };
    saveLocalHomepageSections([...localSecs, createdInfo]);
    return { section: createdInfo, error: null };
  }

  if (preferredSectionId && preferredSectionId.trim()) {
    const { data: specificRow } = await supabase
      .from('homepage_sections')
      .select('*')
      .eq('id', preferredSectionId.trim())
      .maybeSingle();

    if (specificRow) {
      return {
        section: mapSupabaseHomepageSectionRow(
          specificRow as Record<string, unknown>
        ),
        error: null,
      };
    }
  }

  const { data: existingInfoRow } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('section_type', 'INFO_BLOCK')
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingInfoRow) {
    return {
      section: mapSupabaseHomepageSectionRow(
        existingInfoRow as Record<string, unknown>
      ),
      error: null,
    };
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from('homepage_sections')
    .insert({
      code: 'info_block_main',
      section_type: 'INFO_BLOCK',
      admin_name: 'Bloques Informativos y Garantías',
      title: 'Información Operativa y Garantías SmartLab',
      subtitle:
        'Conoce cómo funciona nuestro proceso de entrega verificada y soporte.',
      badge_text: 'INFORMACIÓN OFICIAL',
      badge_variant: 'primary',
      config_json: { columns_desktop: 3 },
      display_order: 8,
      status: 'PUBLISHED',
      is_active: true,
      updated_by_user_id: userId,
    })
    .select('*')
    .single();

  if (insertError || !insertedRow) {
    return {
      section: null,
      error:
        insertError?.message ||
        'No se pudo inicializar una sección INFO_BLOCK en public.homepage_sections.',
    };
  }

  return {
    section: mapSupabaseHomepageSectionRow(
      insertedRow as Record<string, unknown>
    ),
    error: null,
  };
}

export async function getAdminInfoCards(): Promise<{
  sections: HomepageSection[];
  infoCards: HomepageSectionItem[];
  error: string | null;
}> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      sections: [],
      infoCards: [],
      error:
        access.error ||
        'No tienes permisos para administrar bloques informativos.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: secRows } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('section_type', 'INFO_BLOCK')
        .order('display_order', { ascending: true });

      const infoSections = (secRows ?? []).map((r) =>
        mapSupabaseHomepageSectionRow(r as Record<string, unknown>)
      );

      const { data: itemRows, error: itemError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('item_type', 'INFO_CARD')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (itemError) {
        return {
          sections: infoSections,
          infoCards: [],
          error: `Error al consultar tarjetas informativas (INFO_CARD): ${itemError.message}`,
        };
      }

      const infoCards = (itemRows ?? []).map((r) =>
        mapSupabaseHomepageItemRow(r as Record<string, unknown>)
      );
      const others = loadLocalHomepageItems().filter(
        (i) => i.item_type !== 'INFO_CARD'
      );
      saveLocalHomepageItems([...others, ...infoCards]);

      return { sections: infoSections, infoCards, error: null };
    } catch (err) {
      return {
        sections: [],
        infoCards: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cargar bloques informativos.',
      };
    }
  }

  const localInfoSections = loadLocalHomepageSections().filter(
    (s) => s.section_type === 'INFO_BLOCK'
  );
  const localInfoCards = loadLocalHomepageItems()
    .filter((i) => i.item_type === 'INFO_CARD')
    .sort((a, b) => a.display_order - b.display_order);

  return {
    sections: localInfoSections,
    infoCards: localInfoCards,
    error: null,
  };
}

export async function createAdminInfoCard(
  input: InfoCardAdminInput
): Promise<InfoCardMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      infoCard: null,
      error:
        access.error ||
        'No tienes permisos para crear tarjetas informativas.',
    };
  }

  const adminNameVal = validateSafePlainText(input.admin_name, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El nombre interno del bloque informativo',
  });
  if (!adminNameVal.valid) {
    return { infoCard: null, error: adminNameVal.error };
  }

  const badgeVal = validateSafePlainText(input.badge_text, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El badge del bloque informativo',
  });
  if (!badgeVal.valid) {
    return { infoCard: null, error: badgeVal.error };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 180,
    fieldLabel: 'El título del bloque informativo',
  });
  if (!titleVal.valid) {
    return { infoCard: null, error: titleVal.error };
  }

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: true,
    minLength: 5,
    maxLength: 500,
    fieldLabel: 'La descripción del bloque informativo',
  });
  if (!subtitleVal.valid) {
    return { infoCard: null, error: subtitleVal.error };
  }

  let validatedIcon: HomepageAllowedLucideIcon | null = null;
  if (input.icon_name && input.icon_name.trim()) {
    const iconCheck = validateAllowedLucideIcon(input.icon_name, true);
    if (!iconCheck.valid) {
      return { infoCard: null, error: iconCheck.error };
    }
    validatedIcon = iconCheck.iconName;
  }

  let validatedColorHex: string | null = null;
  if (input.icon_color_hex && input.icon_color_hex.trim()) {
    const colorCheck = validateIconHexColor(input.icon_color_hex, true);
    if (!colorCheck.valid) {
      return { infoCard: null, error: colorCheck.error };
    }
    validatedColorHex = colorCheck.colorHex;
  }

  const cleanCtaLabel = (input.cta_primary_label ?? '').trim();
  const cleanCtaUrl = (input.cta_primary_url ?? '').trim();
  if (cleanCtaLabel && !cleanCtaUrl) {
    return {
      infoCard: null,
      error:
        'Si defines texto para el botón del bloque informativo, su URL es obligatoria.',
    };
  }
  const ctaCheck = validateHomepageSlideUrl(cleanCtaUrl, {
    required: Boolean(cleanCtaLabel),
    fieldLabel: 'La URL del botón del bloque informativo',
  });
  if (!ctaCheck.valid) {
    return { infoCard: null, error: ctaCheck.error };
  }

  const scheduleCheck = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleCheck.valid) {
    return { infoCard: null, error: scheduleCheck.error };
  }

  let uploadedPathToCleanOnFail: string | null = null;
  let finalImageUrl: string | null = (input.image_desktop_url ?? '').trim() || null;

  if (input.infoImageFile) {
    const uploadRes = await uploadPublicStoreAsset(
      input.infoImageFile,
      'home/info'
    );
    if (uploadRes.error || !uploadRes.publicUrl) {
      return {
        infoCard: null,
        error:
          uploadRes.error ||
          'No se pudo subir la imagen del bloque informativo a public-assets/home/info/.',
      };
    }
    finalImageUrl = uploadRes.publicUrl;
    uploadedPathToCleanOnFail = uploadRes.path || uploadRes.publicUrl;
  } else if (finalImageUrl) {
    const imgUrlCheck = validateHomepageSlideUrl(finalImageUrl, {
      required: false,
      fieldLabel: 'La URL de imagen del bloque informativo',
    });
    if (!imgUrlCheck.valid) {
      return { infoCard: null, error: imgUrlCheck.error };
    }
    finalImageUrl = imgUrlCheck.sanitizedUrl;
  }

  const status: HomepagePublishStatus =
    input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
  const isActive = input.is_active !== false;
  const displayOrder = Number.isFinite(Number(input.display_order))
    ? Math.max(0, Math.floor(Number(input.display_order)))
    : 1;

  if (isSupabaseConfigured()) {
    try {
      const secEnsure = await ensureAdminInfoBlockSection(
        access.userId,
        input.section_id
      );
      if (secEnsure.error || !secEnsure.section) {
        if (uploadedPathToCleanOnFail) {
          await deletePublicStoreAsset(uploadedPathToCleanOnFail);
        }
        return {
          infoCard: null,
          error:
            secEnsure.error ||
            'No se pudo resolver la sección padre INFO_BLOCK.',
        };
      }

      const { data: insertedRow, error: insertError } = await supabase
        .from('homepage_section_items')
        .insert({
          section_id: secEnsure.section.id,
          item_type: 'INFO_CARD',
          admin_name: adminNameVal.sanitized!,
          badge_text: badgeVal.sanitized,
          badge_variant: badgeVal.sanitized
            ? normalizeBadgeVariant(input.badge_variant) || 'primary'
            : null,
          title: titleVal.sanitized!,
          subtitle: subtitleVal.sanitized!,
          icon_name: validatedIcon,
          icon_color_hex: validatedColorHex,
          image_desktop_url: finalImageUrl,
          image_alt_text:
            (input.image_alt_text ?? '').trim() || titleVal.sanitized!,
          cta_primary_label: cleanCtaLabel || null,
          cta_primary_url: ctaCheck.sanitizedUrl,
          open_in_new_tab: Boolean(input.open_in_new_tab),
          display_order: displayOrder,
          status,
          is_active: isActive,
          starts_at: scheduleCheck.startsAtIso,
          ends_at: scheduleCheck.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .select('*')
        .single();

      if (insertError || !insertedRow) {
        if (uploadedPathToCleanOnFail) {
          await deletePublicStoreAsset(uploadedPathToCleanOnFail);
        }
        return {
          infoCard: null,
          error:
            insertError?.message ||
            'No se pudo registrar la tarjeta informativa en public.homepage_section_items.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        insertedRow as Record<string, unknown>
      );
      saveLocalHomepageItems([...loadLocalHomepageItems(), mapped]);
      return { infoCard: mapped, error: null };
    } catch (err) {
      if (uploadedPathToCleanOnFail) {
        await deletePublicStoreAsset(uploadedPathToCleanOnFail);
      }
      return {
        infoCard: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al crear el bloque informativo.',
      };
    }
  }

  const secEnsureLocal = await ensureAdminInfoBlockSection(
    null,
    input.section_id
  );
  const nowIso = new Date().toISOString();
  const newCard: HomepageSectionItem = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `infocard-${Date.now()}`,
    section_id:
      secEnsureLocal.section?.id || '00000000-0000-4000-8000-000000000108',
    item_type: 'INFO_CARD',
    admin_name: adminNameVal.sanitized!,
    badge_text: badgeVal.sanitized,
    badge_variant: badgeVal.sanitized
      ? normalizeBadgeVariant(input.badge_variant) || 'primary'
      : null,
    title: titleVal.sanitized!,
    subtitle: subtitleVal.sanitized!,
    icon_name: validatedIcon,
    icon_color_hex: validatedColorHex,
    image_desktop_url: finalImageUrl,
    image_mobile_url: null,
    image_alt_text:
      (input.image_alt_text ?? '').trim() || titleVal.sanitized!,
    cta_primary_label: cleanCtaLabel || null,
    cta_primary_url: ctaCheck.sanitizedUrl,
    cta_secondary_label: null,
    cta_secondary_url: null,
    open_in_new_tab: Boolean(input.open_in_new_tab),
    category_id: null,
    product_id: null,
    style_json: {},
    display_order: displayOrder,
    status,
    is_active: isActive,
    starts_at: scheduleCheck.startsAtIso,
    ends_at: scheduleCheck.endsAtIso,
    updated_by_user_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  saveLocalHomepageItems([...loadLocalHomepageItems(), newCard]);
  return { infoCard: newCard, error: null };
}

export async function updateAdminInfoCard(
  infoCardId: string,
  input: InfoCardAdminInput
): Promise<InfoCardMutationResult> {
  const cleanId = (infoCardId ?? '').trim();
  if (!cleanId) {
    return {
      infoCard: null,
      error: 'Identificador de bloque informativo inválido.',
    };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      infoCard: null,
      error:
        access.error ||
        'No tienes permisos para editar bloques informativos.',
    };
  }

  const adminNameVal = validateSafePlainText(input.admin_name, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El nombre interno del bloque informativo',
  });
  if (!adminNameVal.valid) {
    return { infoCard: null, error: adminNameVal.error };
  }

  const badgeVal = validateSafePlainText(input.badge_text, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El badge del bloque informativo',
  });
  if (!badgeVal.valid) {
    return { infoCard: null, error: badgeVal.error };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 180,
    fieldLabel: 'El título del bloque informativo',
  });
  if (!titleVal.valid) {
    return { infoCard: null, error: titleVal.error };
  }

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: true,
    minLength: 5,
    maxLength: 500,
    fieldLabel: 'La descripción del bloque informativo',
  });
  if (!subtitleVal.valid) {
    return { infoCard: null, error: subtitleVal.error };
  }

  let validatedIcon: HomepageAllowedLucideIcon | null = null;
  if (input.icon_name && input.icon_name.trim()) {
    const iconCheck = validateAllowedLucideIcon(input.icon_name, true);
    if (!iconCheck.valid) {
      return { infoCard: null, error: iconCheck.error };
    }
    validatedIcon = iconCheck.iconName;
  }

  let validatedColorHex: string | null = null;
  if (input.icon_color_hex && input.icon_color_hex.trim()) {
    const colorCheck = validateIconHexColor(input.icon_color_hex, true);
    if (!colorCheck.valid) {
      return { infoCard: null, error: colorCheck.error };
    }
    validatedColorHex = colorCheck.colorHex;
  }

  const cleanCtaLabel = (input.cta_primary_label ?? '').trim();
  const cleanCtaUrl = (input.cta_primary_url ?? '').trim();
  if (cleanCtaLabel && !cleanCtaUrl) {
    return {
      infoCard: null,
      error:
        'Si defines texto para el botón del bloque informativo, su URL es obligatoria.',
    };
  }
  const ctaCheck = validateHomepageSlideUrl(cleanCtaUrl, {
    required: Boolean(cleanCtaLabel),
    fieldLabel: 'La URL del botón del bloque informativo',
  });
  if (!ctaCheck.valid) {
    return { infoCard: null, error: ctaCheck.error };
  }

  const scheduleCheck = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleCheck.valid) {
    return { infoCard: null, error: scheduleCheck.error };
  }

  const status: HomepagePublishStatus =
    input.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
  const isActive = input.is_active !== false;
  const displayOrder = Number.isFinite(Number(input.display_order))
    ? Math.max(0, Math.floor(Number(input.display_order)))
    : 1;

  if (isSupabaseConfigured()) {
    let uploadedPathToCleanOnFail: string | null = null;

    try {
      const { data: currentRow, error: fetchError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('id', cleanId)
        .eq('item_type', 'INFO_CARD')
        .maybeSingle();

      if (fetchError || !currentRow) {
        return {
          infoCard: null,
          error:
            fetchError?.message ||
            'El bloque informativo que intentas editar no existe.',
        };
      }

      const existingCard = mapSupabaseHomepageItemRow(
        currentRow as Record<string, unknown>
      );
      const previousImageUrl = existingCard.image_desktop_url;
      let nextImageUrl: string | null = previousImageUrl;

      if (input.infoImageFile) {
        const uploadRes = await uploadPublicStoreAsset(
          input.infoImageFile,
          'home/info'
        );
        if (uploadRes.error || !uploadRes.publicUrl) {
          return {
            infoCard: null,
            error:
              uploadRes.error ||
              'No se pudo subir la nueva imagen del bloque informativo.',
          };
        }
        nextImageUrl = uploadRes.publicUrl;
        uploadedPathToCleanOnFail = uploadRes.path || uploadRes.publicUrl;
      } else if (input.removeInfoImage) {
        nextImageUrl = null;
      } else if (input.image_desktop_url !== undefined) {
        const rawUrl = (input.image_desktop_url ?? '').trim();
        if (!rawUrl) {
          nextImageUrl = null;
        } else {
          const urlCheck = validateHomepageSlideUrl(rawUrl, {
            required: false,
            fieldLabel: 'La URL de imagen del bloque informativo',
          });
          if (!urlCheck.valid) {
            return { infoCard: null, error: urlCheck.error };
          }
          nextImageUrl = urlCheck.sanitizedUrl;
        }
      }

      const targetSectionId =
        (input.section_id ?? '').trim() || existingCard.section_id;

      const { data: updatedRow, error: updateError } = await supabase
        .from('homepage_section_items')
        .update({
          section_id: targetSectionId,
          admin_name: adminNameVal.sanitized!,
          badge_text: badgeVal.sanitized,
          badge_variant: badgeVal.sanitized
            ? normalizeBadgeVariant(input.badge_variant) || 'primary'
            : null,
          title: titleVal.sanitized!,
          subtitle: subtitleVal.sanitized!,
          icon_name: validatedIcon,
          icon_color_hex: validatedColorHex,
          image_desktop_url: nextImageUrl,
          image_alt_text:
            (input.image_alt_text ?? '').trim() || titleVal.sanitized!,
          cta_primary_label: cleanCtaLabel || null,
          cta_primary_url: ctaCheck.sanitizedUrl,
          open_in_new_tab: Boolean(input.open_in_new_tab),
          display_order: displayOrder,
          status,
          is_active: isActive,
          starts_at: scheduleCheck.startsAtIso,
          ends_at: scheduleCheck.endsAtIso,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'INFO_CARD')
        .select('*')
        .single();

      if (updateError || !updatedRow) {
        if (uploadedPathToCleanOnFail) {
          await deletePublicStoreAsset(uploadedPathToCleanOnFail);
        }
        return {
          infoCard: null,
          error:
            updateError?.message ||
            'No se pudo actualizar el bloque informativo.',
        };
      }

      if (
        previousImageUrl &&
        previousImageUrl !== nextImageUrl &&
        isHomepageInfoCardPublicAssetUrl(previousImageUrl)
      ) {
        await deleteHomepageAssetIfUnreferenced(previousImageUrl, [cleanId]);
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { infoCard: mapped, error: null };
    } catch (err) {
      if (uploadedPathToCleanOnFail) {
        await deletePublicStoreAsset(uploadedPathToCleanOnFail);
      }
      return {
        infoCard: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar el bloque informativo.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const existingLocal = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'INFO_CARD'
  );
  if (!existingLocal) {
    return {
      infoCard: null,
      error: 'El bloque informativo seleccionado no existe.',
    };
  }

  const updatedLocal: HomepageSectionItem = {
    ...existingLocal,
    section_id: (input.section_id ?? '').trim() || existingLocal.section_id,
    admin_name: adminNameVal.sanitized!,
    badge_text: badgeVal.sanitized,
    badge_variant: badgeVal.sanitized
      ? normalizeBadgeVariant(input.badge_variant) || 'primary'
      : null,
    title: titleVal.sanitized!,
    subtitle: subtitleVal.sanitized!,
    icon_name: validatedIcon,
    icon_color_hex: validatedColorHex,
    image_desktop_url: input.removeInfoImage
      ? null
      : (input.image_desktop_url ?? existingLocal.image_desktop_url)?.trim() ||
        null,
    image_alt_text:
      (input.image_alt_text ?? '').trim() || titleVal.sanitized!,
    cta_primary_label: cleanCtaLabel || null,
    cta_primary_url: ctaCheck.sanitizedUrl,
    open_in_new_tab: Boolean(input.open_in_new_tab),
    display_order: displayOrder,
    status,
    is_active: isActive,
    starts_at: scheduleCheck.startsAtIso,
    ends_at: scheduleCheck.endsAtIso,
    updated_at: new Date().toISOString(),
  };

  saveLocalHomepageItems(
    allLocal.map((i) => (i.id === cleanId ? updatedLocal : i))
  );
  return { infoCard: updatedLocal, error: null };
}

export async function toggleAdminInfoCardActive(
  infoCardId: string,
  isActive: boolean
): Promise<InfoCardMutationResult> {
  const cleanId = (infoCardId ?? '').trim();
  if (!cleanId) {
    return { infoCard: null, error: 'Identificador inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      infoCard: null,
      error: access.error || 'No tienes permisos para cambiar el estado.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          is_active: Boolean(isActive),
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'INFO_CARD')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          infoCard: null,
          error: error?.message || 'No se pudo cambiar el estado.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { infoCard: mapped, error: null };
    } catch (err) {
      return {
        infoCard: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'INFO_CARD'
  );
  if (!target) {
    return { infoCard: null, error: 'El bloque informativo no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { infoCard: updated, error: null };
}

export async function updateAdminInfoCardPublishStatus(
  infoCardId: string,
  status: HomepagePublishStatus
): Promise<InfoCardMutationResult> {
  const cleanId = (infoCardId ?? '').trim();
  if (!cleanId) {
    return { infoCard: null, error: 'Identificador inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      infoCard: null,
      error: access.error || 'No tienes permisos para publicar.',
    };
  }

  const normalizedStatus = normalizePublishStatus(status);

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_items')
        .update({
          status: normalizedStatus,
          updated_by_user_id: access.userId,
        })
        .eq('id', cleanId)
        .eq('item_type', 'INFO_CARD')
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          infoCard: null,
          error: error?.message || 'No se pudo cambiar el estado de publicación.',
        };
      }

      const mapped = mapSupabaseHomepageItemRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) => (i.id === cleanId ? mapped : i))
      );
      return { infoCard: mapped, error: null };
    } catch (err) {
      return {
        infoCard: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cambiar el estado de publicación.',
      };
    }
  }

  const allLocal = loadLocalHomepageItems();
  const target = allLocal.find(
    (i) => i.id === cleanId && i.item_type === 'INFO_CARD'
  );
  if (!target) {
    return { infoCard: null, error: 'El bloque informativo no existe.' };
  }
  const updated: HomepageSectionItem = {
    ...target,
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };
  saveLocalHomepageItems(allLocal.map((i) => (i.id === cleanId ? updated : i)));
  return { infoCard: updated, error: null };
}

export async function reorderAdminInfoCards(
  orderedCards: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para reordenar.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      for (const item of orderedCards) {
        const { error } = await supabase
          .from('homepage_section_items')
          .update({
            display_order: item.display_order,
            updated_by_user_id: access.userId,
          })
          .eq('id', item.id)
          .eq('item_type', 'INFO_CARD');

        if (error) {
          return {
            success: false,
            error: `No se pudo actualizar el orden: ${error.message}`,
          };
        }
      }

      const orderMap = new Map(
        orderedCards.map((o) => [o.id, o.display_order])
      );
      saveLocalHomepageItems(
        loadLocalHomepageItems().map((i) =>
          orderMap.has(i.id)
            ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
            : i
        )
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al reordenar bloques informativos.',
      };
    }
  }

  const orderMap = new Map(orderedCards.map((o) => [o.id, o.display_order]));
  saveLocalHomepageItems(
    loadLocalHomepageItems().map((i) =>
      orderMap.has(i.id)
        ? { ...i, display_order: orderMap.get(i.id) ?? i.display_order }
        : i
    )
  );
  return { success: true, error: null };
}

export async function deleteAdminInfoCard(
  infoCardId: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanId = (infoCardId ?? '').trim();
  if (!cleanId) {
    return { success: false, error: 'Identificador inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para eliminar.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: currentRow, error: fetchError } = await supabase
        .from('homepage_section_items')
        .select('*')
        .eq('id', cleanId)
        .eq('item_type', 'INFO_CARD')
        .maybeSingle();

      if (fetchError || !currentRow) {
        return {
          success: false,
          error:
            fetchError?.message ||
            'El bloque informativo que intentas eliminar ya no existe.',
        };
      }

      const cardToDelete = mapSupabaseHomepageItemRow(
        currentRow as Record<string, unknown>
      );

      const { error: deleteError } = await supabase
        .from('homepage_section_items')
        .delete()
        .eq('id', cleanId)
        .eq('item_type', 'INFO_CARD');

      if (deleteError) {
        return {
          success: false,
          error: `No se pudo eliminar el bloque informativo: ${deleteError.message}`,
        };
      }

      if (
        cardToDelete.image_desktop_url &&
        isHomepageInfoCardPublicAssetUrl(cardToDelete.image_desktop_url)
      ) {
        await deleteHomepageAssetIfUnreferenced(cardToDelete.image_desktop_url, [cleanId]);
      }

      saveLocalHomepageItems(
        loadLocalHomepageItems().filter((i) => i.id !== cleanId)
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al eliminar el bloque informativo.',
      };
    }
  }

  saveLocalHomepageItems(
    loadLocalHomepageItems().filter((i) => i.id !== cleanId)
  );
  return { success: true, error: null };
}

// ============================================================================
// 11. SPRINT C4: OBJETIVOS RELACIONALES (`public.homepage_section_targets`)
//     Y CATÁLOGO ACTIVO DE PRODUCTOS Y CATEGORÍAS
// ============================================================================

/**
 * Carga la lista de productos activos (`public.products`) y categorías activas (`public.categories`)
 * respetando las categorías dinámicas de B2–B5 y sin exponer enlaces privados.
 */
export async function getAdminEligibleCatalogData(): Promise<{
  products: HomepageTargetProductSummary[];
  categories: HomepageTargetCategorySummary[];
  error: string | null;
}> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      products: [],
      categories: [],
      error: access.error || 'No tienes permisos administrativos.',
    };
  }

  try {
    const [activeCategories, activeProducts] = await Promise.all([
      getCategories().catch(() => []),
      getProducts().catch(() => []),
    ]);

    const categorySummaries: HomepageTargetCategorySummary[] =
      activeCategories.map((c, idx) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon_name: c.icon_name ?? null,
        color_hex: c.color_hex ?? null,
        image_url: c.image_url ?? null,
        is_active: c.is_active !== false,
        display_order: Number(c.display_order ?? c.sort_order ?? idx + 1),
      }));

    const productSummaries: HomepageTargetProductSummary[] = activeProducts
      .filter((p) => p.status === 'ACTIVO')
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        modalidad: p.modalidad,
        price_regular_pen: p.price_regular_pen,
        price_sale_pen: p.price_sale_pen,
        is_on_promotion: p.is_on_promotion,
        is_featured: p.is_featured,
        is_bestseller: p.is_bestseller,
        is_new: p.is_new,
        is_deal_of_the_day: p.is_deal_of_the_day,
        status: 'ACTIVO' as const,
        category_name: p.category?.name ?? null,
      }));

    return {
      products: productSummaries,
      categories: categorySummaries,
      error: null,
    };
  } catch (err) {
    return {
      products: [],
      categories: [],
      error:
        err instanceof Error
          ? err.message
          : 'Error al consultar productos y categorías activos.',
    };
  }
}

function enrichSectionTargets(
  rawTargets: HomepageSectionTarget[],
  products: HomepageTargetProductSummary[],
  categories: HomepageTargetCategorySummary[]
): HomepageSectionTargetExpanded[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return rawTargets.map((target) => {
    let matchedProduct: HomepageTargetProductSummary | null = null;
    let matchedCategory: HomepageTargetCategorySummary | null = null;

    if (target.target_type === 'PRODUCT' && target.product_id) {
      matchedProduct = productById.get(target.product_id) || null;
    } else if (target.target_type === 'CATEGORY' && target.category_id) {
      const eqIds = getEquivalentCategoryIds(target.category_id);
      for (const candidateId of eqIds) {
        const found = categoryById.get(candidateId);
        if (found) {
          matchedCategory = found;
          break;
        }
      }
    }

    return {
      ...target,
      product: matchedProduct,
      category: matchedCategory,
    };
  });
}

/**
 * Obtiene todos los registros de `public.homepage_section_targets` enriquecidos
 * con los datos reales de `public.products` y `public.categories`.
 */
export async function getAdminSectionTargets(
  sectionId?: string,
  collectionKey?: string
): Promise<{
  targets: HomepageSectionTargetExpanded[];
  error: string | null;
}> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      targets: [],
      error:
        access.error ||
        'No tienes permisos para consultar las selecciones de la portada.',
    };
  }

  const catalogRes = await getAdminEligibleCatalogData();

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('homepage_section_targets')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (sectionId && sectionId.trim()) {
        query = query.eq('section_id', sectionId.trim());
      }
      if (collectionKey && collectionKey.trim()) {
        query = query.eq('collection_key', collectionKey.trim());
      }

      const { data: rows, error } = await query;
      if (error) {
        return {
          targets: [],
          error: `Error al consultar homepage_section_targets: ${error.message}`,
        };
      }

      const mapped = (rows ?? []).map((r) =>
        mapSupabaseHomepageTargetRow(r as Record<string, unknown>)
      );
      if (!sectionId && !collectionKey) {
        saveLocalHomepageTargets(mapped);
      }

      return {
        targets: enrichSectionTargets(
          mapped,
          catalogRes.products,
          catalogRes.categories
        ),
        error: null,
      };
    } catch (err) {
      return {
        targets: [],
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al cargar homepage_section_targets.',
      };
    }
  }

  let local = loadLocalHomepageTargets();
  if (sectionId && sectionId.trim()) {
    local = local.filter((t) => t.section_id === sectionId.trim());
  }
  if (collectionKey && collectionKey.trim()) {
    local = local.filter((t) => t.collection_key === collectionKey.trim());
  }

  return {
    targets: enrichSectionTargets(
      local,
      catalogRes.products,
      catalogRes.categories
    ),
    error: null,
  };
}

/**
 * Agrega un producto (`PRODUCT`) o categoría (`CATEGORY`) a `public.homepage_section_targets`.
 * Validaciones obligatorias:
 * - Valida que el producto o categoría exista y esté activo.
 * - Si la sección es `FREE_RESOURCES` (`free_zone`), bloquea estrictamente cualquier producto
 *   que no sea de modalidad `FREE` (nunca permite mostrar productos `PRO` o `PERSONALIZADO` como gratuitos).
 * - Evita duplicados en `(section_id, collection_key, product_id/category_id)`.
 */
export async function addAdminSectionTarget(
  input: HomepageTargetAdminInput
): Promise<HomepageTargetMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      target: null,
      error:
        access.error ||
        'No tienes permisos para asignar productos o categorías a la portada.',
    };
  }

  const cleanSectionId = (input.section_id ?? '').trim();
  if (!cleanSectionId) {
    return {
      target: null,
      error: 'Debes indicar la sección de portada a la que pertenece la selección.',
    };
  }

  const targetType: HomepageTargetType =
    input.target_type === 'CATEGORY' ? 'CATEGORY' : 'PRODUCT';
  const cleanCollectionKey =
    (input.collection_key ?? 'default')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_') || 'default';

  const catalogRes = await getAdminEligibleCatalogData();
  const cleanProductId = (input.product_id ?? '').trim();
  const cleanCategoryId = (input.category_id ?? '').trim();

  // Verificar sección padre para aplicar reglas específicas (ej. FREE_RESOURCES)
  let parentSectionType: HomepageSectionType | null = null;
  let parentSectionCode: string | null = null;

  if (isSupabaseConfigured()) {
    const { data: secRow } = await supabase
      .from('homepage_sections')
      .select('id, code, section_type')
      .eq('id', cleanSectionId)
      .maybeSingle();

    if (secRow) {
      parentSectionType = (secRow as { section_type: HomepageSectionType })
        .section_type;
      parentSectionCode = (secRow as { code: string | null }).code;
    }
  } else {
    const localSec = loadLocalHomepageSections().find(
      (s) => s.id === cleanSectionId
    );
    if (localSec) {
      parentSectionType = localSec.section_type;
      parentSectionCode = localSec.code;
    }
  }

  if (targetType === 'PRODUCT') {
    if (!cleanProductId) {
      return {
        target: null,
        error: 'Debes seleccionar un producto válido de public.products.',
      };
    }

    const activeProduct = catalogRes.products.find(
      (p) => p.id === cleanProductId && p.status === 'ACTIVO'
    );
    if (!activeProduct) {
      return {
        target: null,
        error:
          'El producto seleccionado no existe o se encuentra inactivo en public.products.',
      };
    }

    // Regla estricta de Recursos Gratuitos (Sprint C4 punto 6 y 9):
    // Nunca permitir productos PRO ni PERSONALIZADO en FREE_RESOURCES
    const isFreeResourcesTarget =
      parentSectionType === 'FREE_RESOURCES' ||
      parentSectionCode === FREE_ZONE_SECTION_CODE ||
      cleanCollectionKey === 'free_resources';

    if (isFreeResourcesTarget && activeProduct.modalidad !== 'FREE') {
      return {
        target: null,
        error: `Operación rechazada: "${activeProduct.name}" tiene modalidad ${activeProduct.modalidad}. La sección de Recursos Gratuitos (FREE_RESOURCES) solo admite productos con modalidad FREE.`,
      };
    }
  } else {
    if (!cleanCategoryId) {
      return {
        target: null,
        error: 'Debes seleccionar una categoría válida de public.categories.',
      };
    }

    const eqIds = getEquivalentCategoryIds(cleanCategoryId);
    const activeCategory = catalogRes.categories.find(
      (c) => eqIds.includes(c.id) && c.is_active
    );
    if (!activeCategory) {
      return {
        target: null,
        error:
          'La categoría seleccionada no existe o se encuentra inactiva en public.categories.',
      };
    }
  }

  const displayOrder = Number.isFinite(Number(input.display_order))
    ? Math.max(0, Math.floor(Number(input.display_order)))
    : 1;
  const isActive = input.is_active !== false;

  if (isSupabaseConfigured()) {
    try {
      // Verificar duplicado antes de insertar
      let dupQuery = supabase
        .from('homepage_section_targets')
        .select('id')
        .eq('section_id', cleanSectionId)
        .eq('collection_key', cleanCollectionKey);

      if (targetType === 'PRODUCT') {
        dupQuery = dupQuery.eq('product_id', cleanProductId);
      } else {
        dupQuery = dupQuery.eq('category_id', cleanCategoryId);
      }

      const { data: existingDup } = await dupQuery.maybeSingle();
      if (existingDup) {
        return {
          target: null,
          error:
            targetType === 'PRODUCT'
              ? 'Este producto ya está asignado en esta colección. No se permiten duplicados.'
              : 'Esta categoría ya está asignada en esta sección. No se permiten duplicados.',
        };
      }

      // Resolver el category_id real en Supabase si es una de las 6 categorías base (ej. sqlId vs seedId)
      let dbCategoryId: string | null = null;
      if (targetType === 'CATEGORY') {
        dbCategoryId = cleanCategoryId;
        const candidateIds = getEquivalentCategoryIds(cleanCategoryId);
        const { data: dbCatRows } = await supabase
          .from('categories')
          .select('id')
          .in('id', candidateIds);
        if (dbCatRows && dbCatRows.length > 0) {
          dbCategoryId = String((dbCatRows[0] as { id: string }).id);
        }
      }

      const { data: insertedRow, error: insertError } = await supabase
        .from('homepage_section_targets')
        .insert({
          section_id: cleanSectionId,
          target_type: targetType,
          collection_key: cleanCollectionKey,
          product_id: targetType === 'PRODUCT' ? cleanProductId : null,
          category_id: targetType === 'CATEGORY' ? dbCategoryId : null,
          display_order: displayOrder,
          is_active: isActive,
        })
        .select('*')
        .single();

      if (insertError || !insertedRow) {
        return {
          target: null,
          error:
            insertError?.message ||
            'No se pudo guardar la selección en public.homepage_section_targets. Verifica que el registro exista en la base de datos.',
        };
      }

      const mapped = mapSupabaseHomepageTargetRow(
        insertedRow as Record<string, unknown>
      );
      saveLocalHomepageTargets([...loadLocalHomepageTargets(), mapped]);
      const [enriched] = enrichSectionTargets(
        [mapped],
        catalogRes.products,
        catalogRes.categories
      );
      return { target: enriched, error: null };
    } catch (err) {
      return {
        target: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al agregar el objetivo a la sección.',
      };
    }
  }

  const allLocal = loadLocalHomepageTargets();
  const isDuplicateLocal = allLocal.some((t) => {
    if (
      t.section_id !== cleanSectionId ||
      t.collection_key !== cleanCollectionKey
    ) {
      return false;
    }
    if (targetType === 'PRODUCT') {
      return t.product_id === cleanProductId;
    }
    const eqIds = getEquivalentCategoryIds(cleanCategoryId);
    return Boolean(t.category_id && eqIds.includes(t.category_id));
  });

  if (isDuplicateLocal) {
    return {
      target: null,
      error:
        targetType === 'PRODUCT'
          ? 'Este producto ya está asignado en esta colección. No se permiten duplicados.'
          : 'Esta categoría ya está asignada en esta sección. No se permiten duplicados.',
    };
  }

  const newTarget: HomepageSectionTarget = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `target-${Date.now()}`,
    section_id: cleanSectionId,
    target_type: targetType,
    collection_key: cleanCollectionKey,
    product_id: targetType === 'PRODUCT' ? cleanProductId : null,
    category_id: targetType === 'CATEGORY' ? cleanCategoryId : null,
    display_order: displayOrder,
    is_active: isActive,
    created_at: new Date().toISOString(),
  };

  saveLocalHomepageTargets([...allLocal, newTarget]);
  const [enrichedLocal] = enrichSectionTargets(
    [newTarget],
    catalogRes.products,
    catalogRes.categories
  );
  return { target: enrichedLocal, error: null };
}

export async function toggleAdminSectionTargetActive(
  targetId: string,
  isActive: boolean
): Promise<HomepageTargetMutationResult> {
  const cleanId = (targetId ?? '').trim();
  if (!cleanId) {
    return { target: null, error: 'Identificador de selección inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      target: null,
      error: access.error || 'No tienes permisos para modificar esta selección.',
    };
  }

  const catalogRes = await getAdminEligibleCatalogData();

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_section_targets')
        .update({ is_active: Boolean(isActive) })
        .eq('id', cleanId)
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          target: null,
          error:
            error?.message ||
            'No se pudo actualizar el estado de la selección.',
        };
      }

      const mapped = mapSupabaseHomepageTargetRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageTargets(
        loadLocalHomepageTargets().map((t) => (t.id === cleanId ? mapped : t))
      );
      const [enriched] = enrichSectionTargets(
        [mapped],
        catalogRes.products,
        catalogRes.categories
      );
      return { target: enriched, error: null };
    } catch (err) {
      return {
        target: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar la selección.',
      };
    }
  }

  const allLocal = loadLocalHomepageTargets();
  const found = allLocal.find((t) => t.id === cleanId);
  if (!found) {
    return { target: null, error: 'La selección indicada no existe.' };
  }
  const updated: HomepageSectionTarget = {
    ...found,
    is_active: Boolean(isActive),
  };
  saveLocalHomepageTargets(
    allLocal.map((t) => (t.id === cleanId ? updated : t))
  );
  const [enrichedLocal] = enrichSectionTargets(
    [updated],
    catalogRes.products,
    catalogRes.categories
  );
  return { target: enrichedLocal, error: null };
}

export async function reorderAdminSectionTargets(
  orderedTargets: Array<{ id: string; display_order: number }>
): Promise<{ success: boolean; error: string | null }> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para reordenar selecciones.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      for (const item of orderedTargets) {
        const { error } = await supabase
          .from('homepage_section_targets')
          .update({ display_order: item.display_order })
          .eq('id', item.id);

        if (error) {
          return {
            success: false,
            error: `No se pudo actualizar el orden: ${error.message}`,
          };
        }
      }

      const orderMap = new Map(
        orderedTargets.map((o) => [o.id, o.display_order])
      );
      saveLocalHomepageTargets(
        loadLocalHomepageTargets().map((t) =>
          orderMap.has(t.id)
            ? { ...t, display_order: orderMap.get(t.id) ?? t.display_order }
            : t
        )
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al reordenar selecciones.',
      };
    }
  }

  const orderMap = new Map(orderedTargets.map((o) => [o.id, o.display_order]));
  saveLocalHomepageTargets(
    loadLocalHomepageTargets().map((t) =>
      orderMap.has(t.id)
        ? { ...t, display_order: orderMap.get(t.id) ?? t.display_order }
        : t
    )
  );
  return { success: true, error: null };
}

export async function removeAdminSectionTarget(
  targetId: string
): Promise<{ success: boolean; error: string | null }> {
  const cleanId = (targetId ?? '').trim();
  if (!cleanId) {
    return { success: false, error: 'Identificador de selección inválido.' };
  }

  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      success: false,
      error: access.error || 'No tienes permisos para quitar esta selección.',
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('homepage_section_targets')
        .delete()
        .eq('id', cleanId);

      if (error) {
        return {
          success: false,
          error: `No se pudo quitar la selección: ${error.message}`,
        };
      }

      saveLocalHomepageTargets(
        loadLocalHomepageTargets().filter((t) => t.id !== cleanId)
      );
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al quitar la selección.',
      };
    }
  }

  saveLocalHomepageTargets(
    loadLocalHomepageTargets().filter((t) => t.id !== cleanId)
  );
  return { success: true, error: null };
}

// ============================================================================
// 12. SPRINT C4: CONFIGURADORES ESPECIALIZADOS DE SECCIONES DE CONTENIDO
// ============================================================================

async function persistSpecializedSectionUpdate(
  sectionId: string,
  payload: {
    title: string | null;
    subtitle: string | null;
    badge_text: string | null;
    badge_variant: HomepageBadgeVariant | null;
    cta_label: string | null;
    cta_url: string | null;
    status: HomepagePublishStatus;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    config_json: Record<string, unknown>;
  },
  userId: string | null
): Promise<HomepageSectionMutationResult> {
  const cleanId = (sectionId ?? '').trim();
  if (!cleanId) {
    return { section: null, error: 'Identificador de sección inválido.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data: updatedRow, error } = await supabase
        .from('homepage_sections')
        .update({
          title: payload.title,
          subtitle: payload.subtitle,
          badge_text: payload.badge_text,
          badge_variant: payload.badge_variant,
          cta_label: payload.cta_label,
          cta_url: payload.cta_url,
          status: payload.status,
          is_active: payload.is_active,
          starts_at: payload.starts_at,
          ends_at: payload.ends_at,
          config_json: payload.config_json,
          updated_by_user_id: userId,
        })
        .eq('id', cleanId)
        .select('*')
        .single();

      if (error || !updatedRow) {
        return {
          section: null,
          error:
            error?.message ||
            'No se pudo actualizar la configuración de la sección en public.homepage_sections.',
        };
      }

      const mapped = mapSupabaseHomepageSectionRow(
        updatedRow as Record<string, unknown>
      );
      saveLocalHomepageSections(
        loadLocalHomepageSections().map((s) => (s.id === cleanId ? mapped : s))
      );
      return { section: mapped, error: null };
    } catch (err) {
      return {
        section: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al guardar la configuración de la sección.',
      };
    }
  }

  const allLocal = loadLocalHomepageSections();
  const existing = allLocal.find((s) => s.id === cleanId);
  if (!existing) {
    return { section: null, error: 'La sección seleccionada no existe.' };
  }

  const updated: HomepageSection = {
    ...existing,
    title: payload.title,
    subtitle: payload.subtitle,
    badge_text: payload.badge_text,
    badge_variant: payload.badge_variant,
    cta_label: payload.cta_label,
    cta_url: payload.cta_url,
    status: payload.status,
    is_active: payload.is_active,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at,
    config_json: payload.config_json,
    updated_at: new Date().toISOString(),
  };

  saveLocalHomepageSections(
    allLocal.map((s) => (s.id === cleanId ? updated : s))
  );
  return { section: updated, error: null };
}

/**
 * 3. OFERTA DESTACADA DEL DÍA (`DEAL_OF_THE_DAY`)
 * Guarda la configuración de la sección y sincroniza el producto seleccionado en
 * `public.homepage_section_targets` (`collection_key = 'deal_of_the_day'`).
 * REGLA ESTRICTA: Jamás guarda ni duplica precios en `homepage_sections`; el precio y modalidad
 * provienen siempre del registro real en `public.products`.
 */
export async function saveAdminDealOfTheDayConfig(
  sectionId: string,
  input: DealOfTheDayAdminConfigInput
): Promise<HomepageSectionMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error:
        access.error ||
        'No tienes permisos para configurar la Oferta Destacada del Día.',
    };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El título de la Oferta del Día',
  });
  if (!titleVal.valid) return { section: null, error: titleVal.error };

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: false,
    maxLength: 260,
    fieldLabel: 'El subtítulo de la Oferta del Día',
  });
  if (!subtitleVal.valid) return { section: null, error: subtitleVal.error };

  const badgeVal = validateSafePlainText(input.badge_text, {
    required: false,
    maxLength: 60,
    fieldLabel: 'El badge de la Oferta del Día',
  });
  if (!badgeVal.valid) return { section: null, error: badgeVal.error };

  const countdownVal = validateSafePlainText(input.countdown_label, {
    required: false,
    maxLength: 80,
    fieldLabel: 'La etiqueta del temporizador',
  });
  if (!countdownVal.valid) return { section: null, error: countdownVal.error };

  const priceCaptionVal = validateSafePlainText(input.price_caption, {
    required: false,
    maxLength: 100,
    fieldLabel: 'La leyenda promocional de precio',
  });
  if (!priceCaptionVal.valid) {
    return { section: null, error: priceCaptionVal.error };
  }

  const ctaBtnVal = validateSafePlainText(
    input.cta_button_label ?? input.cta_label,
    {
      required: false,
      maxLength: 80,
      fieldLabel: 'El texto del botón principal',
    }
  );
  if (!ctaBtnVal.valid) return { section: null, error: ctaBtnVal.error };

  const secBtnVal = validateSafePlainText(input.secondary_button_label, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El texto del botón secundario',
  });
  if (!secBtnVal.valid) return { section: null, error: secBtnVal.error };

  const promoNoteVal = validateSafePlainText(input.promo_highlight_note, {
    required: false,
    maxLength: 180,
    fieldLabel: 'La nota promocional destacada',
  });
  if (!promoNoteVal.valid) return { section: null, error: promoNoteVal.error };

  const cleanCtaUrl = (input.cta_url ?? '').trim();
  const ctaUrlCheck = validateHomepageSlideUrl(cleanCtaUrl, {
    required: false,
    fieldLabel: 'La URL de respaldo del botón de Oferta del Día',
  });
  if (!ctaUrlCheck.valid) return { section: null, error: ctaUrlCheck.error };

  const scheduleCheck = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleCheck.valid) {
    return { section: null, error: scheduleCheck.error };
  }

  let customExpiresIso: string | null = null;
  if (input.custom_expires_at && input.custom_expires_at.trim()) {
    const expMs = Date.parse(input.custom_expires_at.trim());
    if (Number.isNaN(expMs)) {
      return {
        section: null,
        error: 'La fecha límite del contador no tiene un formato válido.',
      };
    }
    customExpiresIso = new Date(expMs).toISOString();
  }

  // Validar que el producto seleccionado exista y esté activo en public.products
  const cleanFeaturedProductId = (input.featured_product_id ?? '').trim() || null;
  if (cleanFeaturedProductId) {
    const catalogRes = await getAdminEligibleCatalogData();
    const foundProduct = catalogRes.products.find(
      (p) => p.id === cleanFeaturedProductId && p.status === 'ACTIVO'
    );
    if (!foundProduct) {
      return {
        section: null,
        error:
          'El producto seleccionado para la Oferta Destacada del Día no existe o está inactivo en public.products.',
      };
    }
  }

  const validFallbacks: readonly DealFallbackBehavior[] = [
    'HIDE_SECTION',
    'AUTO_FIRST_PROMOTION',
    'AUTO_FEATURED',
  ];
  const fallbackBehavior: DealFallbackBehavior = validFallbacks.includes(
    input.fallback_behavior
  )
    ? input.fallback_behavior
    : 'AUTO_FIRST_PROMOTION';

  // Sincronizar también en homepage_section_targets (collection_key = 'deal_of_the_day')
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('homepage_section_targets')
        .delete()
        .eq('section_id', sectionId.trim())
        .eq('collection_key', 'deal_of_the_day');

      if (cleanFeaturedProductId) {
        await supabase.from('homepage_section_targets').insert({
          section_id: sectionId.trim(),
          target_type: 'PRODUCT',
          collection_key: 'deal_of_the_day',
          product_id: cleanFeaturedProductId,
          display_order: 1,
          is_active: true,
        });
      }
    } catch {
      // Si el producto proviene de semilla local mientras se sincroniza, también queda registrado en config_json
    }
  } else {
    const others = loadLocalHomepageTargets().filter(
      (t) =>
        !(
          t.section_id === sectionId.trim() &&
          t.collection_key === 'deal_of_the_day'
        )
    );
    if (cleanFeaturedProductId) {
      others.push({
        id: `deal-target-${Date.now()}`,
        section_id: sectionId.trim(),
        target_type: 'PRODUCT',
        collection_key: 'deal_of_the_day',
        product_id: cleanFeaturedProductId,
        category_id: null,
        display_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    }
    saveLocalHomepageTargets(others);
  }

  return persistSpecializedSectionUpdate(
    sectionId,
    {
      title: titleVal.sanitized!,
      subtitle: subtitleVal.sanitized,
      badge_text: badgeVal.sanitized,
      badge_variant: badgeVal.sanitized
        ? normalizeBadgeVariant(input.badge_variant) || 'discount'
        : null,
      cta_label: ctaBtnVal.sanitized,
      cta_url: ctaUrlCheck.sanitizedUrl,
      status: normalizePublishStatus(input.status),
      is_active: Boolean(input.is_active),
      starts_at: scheduleCheck.startsAtIso,
      ends_at: scheduleCheck.endsAtIso,
      config_json: {
        featured_product_id: cleanFeaturedProductId,
        fallback_behavior: fallbackBehavior,
        countdown_label:
          countdownVal.sanitized || 'TERMINA EN:',
        price_caption:
          priceCaptionVal.sanitized ||
          'Precio 100% en Soles (PEN). Entrega individual por WhatsApp.',
        cta_button_label:
          ctaBtnVal.sanitized || 'Comprar con Descuento S/',
        secondary_button_label:
          secBtnVal.sanitized || 'Ver Ficha Técnica y Versiones',
        custom_expires_at: customExpiresIso,
        promo_highlight_note: promoNoteVal.sanitized,
      },
    },
    access.userId
  );
}

/**
 * 4. VITRINA POR CATEGORÍAS Y COLECCIONES (`CATEGORY_TABS_SHOWCASE`)
 */
export async function saveAdminCategoryTabsConfig(
  sectionId: string,
  input: CategoryTabsAdminConfigInput
): Promise<HomepageSectionMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error:
        access.error ||
        'No tienes permisos para configurar la Vitrina por Categorías.',
    };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El título de la Vitrina por Categorías',
  });
  if (!titleVal.valid) return { section: null, error: titleVal.error };

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: false,
    maxLength: 260,
    fieldLabel: 'El subtítulo de la Vitrina por Categorías',
  });
  if (!subtitleVal.valid) return { section: null, error: subtitleVal.error };

  const ctaLabelVal = validateSafePlainText(input.cta_label, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El texto del enlace principal de la vitrina',
  });
  if (!ctaLabelVal.valid) return { section: null, error: ctaLabelVal.error };

  const cleanCtaUrl = (input.cta_url ?? '').trim();
  const ctaUrlCheck = validateHomepageSlideUrl(cleanCtaUrl, {
    required: Boolean(ctaLabelVal.sanitized),
    fieldLabel: 'La URL del enlace de la vitrina',
  });
  if (!ctaUrlCheck.valid) return { section: null, error: ctaUrlCheck.error };

  const scheduleCheck = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleCheck.valid) {
    return { section: null, error: scheduleCheck.error };
  }

  const maxProducts = Number.isFinite(Number(input.max_products_per_tab))
    ? Math.max(1, Math.min(24, Math.floor(Number(input.max_products_per_tab))))
    : 8;

  // Validar etiquetas de las pestañas de colecciones contra HTML/JS
  const sanitizedTabs: CategoryShowcaseTabConfig[] = [];
  const validKeys: readonly CategoryShowcaseCollectionKey[] = [
    'destacados',
    'mas_vendidos',
    'novedades',
    'ofertas',
  ];

  const sourceTabs =
    Array.isArray(input.collection_tabs) && input.collection_tabs.length > 0
      ? input.collection_tabs
      : [...DEFAULT_CATEGORY_SHOWCASE_TABS];

  for (let idx = 0; idx < sourceTabs.length; idx++) {
    const tab = sourceTabs[idx];
    if (!validKeys.includes(tab.key)) continue;
    const labelCheck = validateSafePlainText(tab.label, {
      required: true,
      minLength: 2,
      maxLength: 45,
      fieldLabel: `El nombre de la pestaña "${tab.key}"`,
    });
    if (!labelCheck.valid) {
      return { section: null, error: labelCheck.error };
    }
    sanitizedTabs.push({
      key: tab.key,
      label: labelCheck.sanitized!,
      enabled: Boolean(tab.enabled),
      display_order: idx + 1,
      selection_mode:
        tab.selection_mode === 'MANUAL_TARGETS'
          ? 'MANUAL_TARGETS'
          : 'AUTO_FLAGS',
    });
  }

  return persistSpecializedSectionUpdate(
    sectionId,
    {
      title: titleVal.sanitized!,
      subtitle: subtitleVal.sanitized,
      badge_text: null,
      badge_variant: null,
      cta_label: ctaLabelVal.sanitized,
      cta_url: ctaUrlCheck.sanitizedUrl,
      status: normalizePublishStatus(input.status),
      is_active: Boolean(input.is_active),
      starts_at: scheduleCheck.startsAtIso,
      ends_at: scheduleCheck.endsAtIso,
      config_json: {
        max_products_per_tab: maxProducts,
        max_items_per_tab: maxProducts,
        default_tab: input.default_tab || 'ALL',
        show_active_categories: Boolean(input.show_active_categories),
        category_selection_mode:
          input.category_selection_mode === 'MANUAL_TARGETS'
            ? 'MANUAL_TARGETS'
            : 'ALL_ACTIVE',
        collection_tabs: sanitizedTabs,
      },
    },
    access.userId
  );
}

/**
 * 5. COLECCIONES DE PRODUCTOS Y CATEGORÍAS (`FEATURED_CATEGORIES` y `PRODUCT_COLLECTION`)
 */
export async function saveAdminCollectionSectionConfig(
  sectionId: string,
  input: CollectionSectionAdminConfigInput
): Promise<HomepageSectionMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error:
        access.error ||
        'No tienes permisos para configurar esta colección.',
    };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El título de la colección',
  });
  if (!titleVal.valid) return { section: null, error: titleVal.error };

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: false,
    maxLength: 260,
    fieldLabel: 'El subtítulo de la colección',
  });
  if (!subtitleVal.valid) return { section: null, error: subtitleVal.error };

  const badgeVal = validateSafePlainText(input.badge_text, {
    required: false,
    maxLength: 60,
    fieldLabel: 'El badge de la colección',
  });
  if (!badgeVal.valid) return { section: null, error: badgeVal.error };

  const ctaLabelVal = validateSafePlainText(input.cta_label, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El texto del botón de la colección',
  });
  if (!ctaLabelVal.valid) return { section: null, error: ctaLabelVal.error };

  const cleanCtaUrl = (input.cta_url ?? '').trim();
  const ctaUrlCheck = validateHomepageSlideUrl(cleanCtaUrl, {
    required: Boolean(ctaLabelVal.sanitized),
    fieldLabel: 'La URL del botón de la colección',
  });
  if (!ctaUrlCheck.valid) return { section: null, error: ctaUrlCheck.error };

  const scheduleCheck = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleCheck.valid) {
    return { section: null, error: scheduleCheck.error };
  }

  const maxItems = Number.isFinite(Number(input.max_items))
    ? Math.max(1, Math.min(24, Math.floor(Number(input.max_items))))
    : 6;

  const validCriteria: readonly AutomaticProductCriterion[] = [
    'is_featured',
    'is_bestseller',
    'is_new',
    'is_on_promotion',
  ];
  const autoCriterion: AutomaticProductCriterion =
    input.auto_criterion && validCriteria.includes(input.auto_criterion)
      ? input.auto_criterion
      : 'is_featured';

  return persistSpecializedSectionUpdate(
    sectionId,
    {
      title: titleVal.sanitized!,
      subtitle: subtitleVal.sanitized,
      badge_text: badgeVal.sanitized,
      badge_variant: badgeVal.sanitized
        ? normalizeBadgeVariant(input.badge_variant) || 'PRO'
        : null,
      cta_label: ctaLabelVal.sanitized,
      cta_url: ctaUrlCheck.sanitizedUrl,
      status: normalizePublishStatus(input.status),
      is_active: Boolean(input.is_active),
      starts_at: scheduleCheck.startsAtIso,
      ends_at: scheduleCheck.endsAtIso,
      config_json: {
        max_items: maxItems,
        selection_mode:
          input.selection_mode === 'MANUAL_TARGETS'
            ? 'MANUAL_TARGETS'
            : 'AUTO_FLAGS',
        auto_criterion: autoCriterion,
        collection_key: (input.collection_key ?? 'default').trim() || 'default',
      },
    },
    access.userId
  );
}

/**
 * 6. RECURSOS GRATUITOS (`FREE_RESOURCES`)
 */
export async function saveAdminFreeResourcesConfig(
  sectionId: string,
  input: FreeResourcesAdminConfigInput
): Promise<HomepageSectionMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error:
        access.error ||
        'No tienes permisos para configurar la sección de Recursos Gratuitos.',
    };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 3,
    maxLength: 140,
    fieldLabel: 'El título de Recursos Gratuitos',
  });
  if (!titleVal.valid) return { section: null, error: titleVal.error };

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: false,
    maxLength: 260,
    fieldLabel: 'El subtítulo de Recursos Gratuitos',
  });
  if (!subtitleVal.valid) return { section: null, error: subtitleVal.error };

  const badgeVal = validateSafePlainText(input.badge_text, {
    required: false,
    maxLength: 60,
    fieldLabel: 'El badge de Recursos Gratuitos',
  });
  if (!badgeVal.valid) return { section: null, error: badgeVal.error };

  const ctaLabelVal = validateSafePlainText(input.cta_label, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El texto del enlace de Recursos Gratuitos',
  });
  if (!ctaLabelVal.valid) return { section: null, error: ctaLabelVal.error };

  const highlightVal = validateSafePlainText(input.highlight_note, {
    required: false,
    maxLength: 160,
    fieldLabel: 'La nota informativa de Recursos Gratuitos',
  });
  if (!highlightVal.valid) return { section: null, error: highlightVal.error };

  const cleanCtaUrl = (input.cta_url ?? '').trim();
  const ctaUrlCheck = validateHomepageSlideUrl(cleanCtaUrl, {
    required: Boolean(ctaLabelVal.sanitized),
    fieldLabel: 'La URL del enlace de Recursos Gratuitos',
  });
  if (!ctaUrlCheck.valid) return { section: null, error: ctaUrlCheck.error };

  const scheduleCheck = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleCheck.valid) {
    return { section: null, error: scheduleCheck.error };
  }

  const maxItems = Number.isFinite(Number(input.max_items))
    ? Math.max(1, Math.min(16, Math.floor(Number(input.max_items))))
    : 4;

  return persistSpecializedSectionUpdate(
    sectionId,
    {
      title: titleVal.sanitized!,
      subtitle: subtitleVal.sanitized,
      badge_text: badgeVal.sanitized,
      badge_variant: badgeVal.sanitized
        ? normalizeBadgeVariant(input.badge_variant) || 'FREE'
        : null,
      cta_label: ctaLabelVal.sanitized,
      cta_url: ctaUrlCheck.sanitizedUrl,
      status: normalizePublishStatus(input.status),
      is_active: Boolean(input.is_active),
      starts_at: scheduleCheck.startsAtIso,
      ends_at: scheduleCheck.endsAtIso,
      config_json: {
        max_items: maxItems,
        selection_mode:
          input.selection_mode === 'MANUAL_TARGETS'
            ? 'MANUAL_TARGETS'
            : 'AUTO_ALL_FREE',
        highlight_note: highlightVal.sanitized,
      },
    },
    access.userId
  );
}

/**
 * 7. SERVICIOS PERSONALIZADOS (`CUSTOM_SERVICES_CTA`)
 */
export async function saveAdminCustomServicesCtaConfig(
  sectionId: string,
  input: CustomServicesCtaAdminConfigInput
): Promise<HomepageSectionMutationResult> {
  const access = await verifyAdminHomepageAccess();
  if (!access.authorized) {
    return {
      section: null,
      error:
        access.error ||
        'No tienes permisos para configurar la sección de Servicios Personalizados.',
    };
  }

  const titleVal = validateSafePlainText(input.title, {
    required: true,
    minLength: 5,
    maxLength: 180,
    fieldLabel: 'El título de Servicios Personalizados',
  });
  if (!titleVal.valid) return { section: null, error: titleVal.error };

  const subtitleVal = validateSafePlainText(input.subtitle, {
    required: true,
    minLength: 10,
    maxLength: 420,
    fieldLabel: 'La descripción de Servicios Personalizados',
  });
  if (!subtitleVal.valid) return { section: null, error: subtitleVal.error };

  const badgeVal = validateSafePlainText(input.badge_text, {
    required: false,
    maxLength: 60,
    fieldLabel: 'El badge principal',
  });
  if (!badgeVal.valid) return { section: null, error: badgeVal.error };

  const secBadgeVal = validateSafePlainText(input.secondary_badge_text, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El badge secundario',
  });
  if (!secBadgeVal.valid) return { section: null, error: secBadgeVal.error };

  const ctaLabelVal = validateSafePlainText(input.cta_label, {
    required: true,
    minLength: 2,
    maxLength: 80,
    fieldLabel: 'El texto del botón principal',
  });
  if (!ctaLabelVal.valid) return { section: null, error: ctaLabelVal.error };

  const ctaUrlCheck = validateHomepageSlideUrl(input.cta_url, {
    required: true,
    fieldLabel: 'La URL del botón principal',
  });
  if (!ctaUrlCheck.valid) return { section: null, error: ctaUrlCheck.error };

  const secCtaLabelVal = validateSafePlainText(input.secondary_cta_label, {
    required: false,
    maxLength: 80,
    fieldLabel: 'El texto del botón secundario',
  });
  if (!secCtaLabelVal.valid) {
    return { section: null, error: secCtaLabelVal.error };
  }

  const cleanSecCtaUrl = (input.secondary_cta_url ?? '').trim();
  if (secCtaLabelVal.sanitized && !cleanSecCtaUrl) {
    return {
      section: null,
      error:
        'Si defines texto para el botón secundario, su URL es obligatoria.',
    };
  }
  const secCtaUrlCheck = validateHomepageSlideUrl(cleanSecCtaUrl, {
    required: Boolean(secCtaLabelVal.sanitized),
    fieldLabel: 'La URL del botón secundario',
  });
  if (!secCtaUrlCheck.valid) {
    return { section: null, error: secCtaUrlCheck.error };
  }

  const slaTextVal = validateSafePlainText(input.response_SLA_text, {
    required: false,
    maxLength: 120,
    fieldLabel: 'El texto de tiempo de respuesta',
  });
  if (!slaTextVal.valid) return { section: null, error: slaTextVal.error };

  const scheduleCheck = validateCampaignScheduleDates(
    input.starts_at,
    input.ends_at
  );
  if (!scheduleCheck.valid) {
    return { section: null, error: scheduleCheck.error };
  }

  return persistSpecializedSectionUpdate(
    sectionId,
    {
      title: titleVal.sanitized!,
      subtitle: subtitleVal.sanitized!,
      badge_text: badgeVal.sanitized,
      badge_variant: badgeVal.sanitized
        ? normalizeBadgeVariant(input.badge_variant) || 'PERSONALIZADO'
        : null,
      cta_label: ctaLabelVal.sanitized!,
      cta_url: ctaUrlCheck.sanitizedUrl!,
      status: normalizePublishStatus(input.status),
      is_active: Boolean(input.is_active),
      starts_at: scheduleCheck.startsAtIso,
      ends_at: scheduleCheck.endsAtIso,
      config_json: {
        secondary_badge_text:
          secBadgeVal.sanitized || 'COTIZACIÓN POR WHATSAPP',
        secondary_cta_label: secCtaLabelVal.sanitized,
        secondary_cta_url: secCtaUrlCheck.sanitizedUrl,
        response_SLA_text: slaTextVal.sanitized,
      },
    },
    access.userId
  );
}

