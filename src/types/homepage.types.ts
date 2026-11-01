/**
 * SmartLab Store — Tipos de Portada Dinámica, Secciones, Tarjetas Laterales y Banners (Sprints C2 y C3)
 * Referencia: docs/09_PORTADA_Y_PROMOCIONES.md y supabase/migrations/008_homepage_sections_and_items.sql
 */

export type HomepageSectionType =
  | 'HERO_BANNER'
  | 'VALUE_PROPOSITION'
  | 'DEAL_OF_THE_DAY'
  | 'CATEGORY_TABS_SHOWCASE'
  | 'FEATURED_CATEGORIES'
  | 'PRODUCT_COLLECTION'
  | 'PROMO_BANNERS'
  | 'FREE_RESOURCES'
  | 'CUSTOM_SERVICES_CTA'
  | 'INFO_BLOCK';

export type HomepageItemType =
  | 'HERO_SLIDE'
  | 'PROMO_CARD'
  | 'SECONDARY_BANNER'
  | 'BENEFIT_ITEM'
  | 'INFO_CARD';

export type HomepagePublishStatus = 'DRAFT' | 'PUBLISHED';

export type HomepageTargetType = 'PRODUCT' | 'CATEGORY';

export type HomepageBadgeVariant =
  | 'FREE'
  | 'PRO'
  | 'PERSONALIZADO'
  | 'discount'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'dark';

export interface HomepageSectionTypeMeta {
  type: HomepageSectionType;
  label: string;
  description: string;
}

export const HOMEPAGE_SECTION_TYPE_METADATA: readonly HomepageSectionTypeMeta[] = [
  {
    type: 'HERO_BANNER',
    label: 'Hero Banner y Carrusel (HERO_BANNER)',
    description: 'Bloque principal superior con carrusel de slides y tarjetas promocionales laterales.',
  },
  {
    type: 'VALUE_PROPOSITION',
    label: 'Propuesta de Valor y Beneficios (VALUE_PROPOSITION)',
    description: 'Barra horizontal de diferenciales y beneficios de comprar en SmartLab Store.',
  },
  {
    type: 'DEAL_OF_THE_DAY',
    label: 'Oferta Destacada del Día (DEAL_OF_THE_DAY)',
    description: 'Bloque de promoción destacada con temporizador y métricas de campaña.',
  },
  {
    type: 'CATEGORY_TABS_SHOWCASE',
    label: 'Vitrina por Pestañas (CATEGORY_TABS_SHOWCASE)',
    description: 'Explorador dinámico por colecciones (Más Vendidos, Ofertas, Novedades) y categorías.',
  },
  {
    type: 'FEATURED_CATEGORIES',
    label: 'Categorías Destacadas (FEATURED_CATEGORIES)',
    description: 'Grilla o bloque dedicado a categorías destacadas de la tienda.',
  },
  {
    type: 'PRODUCT_COLLECTION',
    label: 'Colección de Productos (PRODUCT_COLLECTION)',
    description: 'Sección de vitrina o carrusel para productos seleccionados.',
  },
  {
    type: 'PROMO_BANNERS',
    label: 'Banners Promocionales Secundarios (PROMO_BANNERS)',
    description: 'Banners intermedios duales (50% / 50%) o promocionales de campaña.',
  },
  {
    type: 'FREE_RESOURCES',
    label: 'Zona de Recursos Gratuitos (FREE_RESOURCES)',
    description: 'Vitrina dedicada a herramientas y plantillas de modalidad FREE.',
  },
  {
    type: 'CUSTOM_SERVICES_CTA',
    label: 'Llamada a la Acción Personalizado (CUSTOM_SERVICES_CTA)',
    description: 'Bloque corporativo para cotización de desarrollos y soluciones a medida.',
  },
  {
    type: 'INFO_BLOCK',
    label: 'Bloque Informativo Editorial (INFO_BLOCK)',
    description: 'Sección informativa o institucional adicional configurable.',
  },
];

export const PROTECTED_HOMEPAGE_SECTION_CODES = [
  'hero_main',
  'value_props',
  'deal_of_the_day',
  'category_tabs',
  'dual_banners',
  'free_zone',
  'custom_cta',
] as const;

export interface HeroSectionConfigJson {
  auto_play?: boolean;
  auto_play_interval_ms?: number;
  show_side_promo_cards?: boolean;
}

export interface HomepageSection {
  id: string;
  code: string | null;
  section_type: HomepageSectionType;
  admin_name: string;
  title: string | null;
  subtitle: string | null;
  badge_text: string | null;
  badge_variant: HomepageBadgeVariant | null;
  cta_label: string | null;
  cta_url: string | null;
  config_json: Record<string, unknown>;
  display_order: number;
  status: HomepagePublishStatus;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomepageSectionWithStats extends HomepageSection {
  items_count: number;
  is_protected_base: boolean;
}

export interface HomepageSectionItem {
  id: string;
  section_id: string;
  item_type: HomepageItemType;
  admin_name: string;
  badge_text: string | null;
  badge_variant: HomepageBadgeVariant | null;
  title: string;
  subtitle: string | null;
  icon_name: string | null;
  icon_color_hex: string | null;
  image_desktop_url: string | null;
  image_mobile_url: string | null;
  image_alt_text: string | null;
  cta_primary_label: string | null;
  cta_primary_url: string | null;
  cta_secondary_label: string | null;
  cta_secondary_url: string | null;
  open_in_new_tab: boolean;
  category_id: string | null;
  product_id: string | null;
  style_json: Record<string, unknown>;
  display_order: number;
  status: HomepagePublishStatus;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomepageSectionTarget {
  id: string;
  section_id: string;
  target_type: HomepageTargetType;
  collection_key: string;
  product_id: string | null;
  category_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface HomepageSectionAdminInput {
  code?: string | null;
  section_type: HomepageSectionType;
  admin_name: string;
  title?: string | null;
  subtitle?: string | null;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  cta_label?: string | null;
  cta_url?: string | null;
  display_order?: number;
  status?: HomepagePublishStatus;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface HomepageSectionMutationResult {
  section: HomepageSection | null;
  error: string | null;
}

export interface HeroSlideAdminInput {
  admin_name: string;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  title: string;
  subtitle?: string | null;
  image_desktop_url?: string | null;
  image_mobile_url?: string | null;
  desktopImageFile?: File | null;
  mobileImageFile?: File | null;
  removeDesktopImage?: boolean;
  removeMobileImage?: boolean;
  image_alt_text?: string | null;
  cta_primary_label?: string | null;
  cta_primary_url?: string | null;
  cta_secondary_label?: string | null;
  cta_secondary_url?: string | null;
  open_in_new_tab?: boolean;
  category_id?: string | null;
  product_id?: string | null;
  display_order?: number;
  status?: HomepagePublishStatus;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface HeroSlideMutationResult {
  slide: HomepageSectionItem | null;
  error: string | null;
}

export interface PromoCardAdminInput {
  admin_name: string;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  title: string;
  subtitle?: string | null;
  image_desktop_url?: string | null;
  promoImageFile?: File | null;
  removePromoImage?: boolean;
  image_alt_text?: string | null;
  cta_primary_label?: string | null;
  cta_primary_url?: string | null;
  open_in_new_tab?: boolean;
  category_id?: string | null;
  product_id?: string | null;
  display_order?: number;
  status?: HomepagePublishStatus;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface PromoCardMutationResult {
  card: HomepageSectionItem | null;
  error: string | null;
}

export interface SecondaryBannerAdminInput {
  section_id?: string | null;
  admin_name: string;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  title: string;
  subtitle?: string | null;
  image_desktop_url?: string | null;
  image_mobile_url?: string | null;
  desktopImageFile?: File | null;
  mobileImageFile?: File | null;
  removeDesktopImage?: boolean;
  removeMobileImage?: boolean;
  image_alt_text?: string | null;
  cta_primary_label?: string | null;
  cta_primary_url?: string | null;
  cta_secondary_label?: string | null;
  cta_secondary_url?: string | null;
  open_in_new_tab?: boolean;
  category_id?: string | null;
  product_id?: string | null;
  display_order?: number;
  status?: HomepagePublishStatus;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface SecondaryBannerMutationResult {
  banner: HomepageSectionItem | null;
  error: string | null;
}

// ============================================================================
// SPRINT C4: BENEFICIOS, OFERTA DEL DÍA, VITRINA POR CATEGORÍAS, COLECCIONES,
//            RECURSOS GRATUITOS, SERVICIOS PERSONALIZADOS Y BLOQUES INFORMATIVOS
// ============================================================================

export type HomepageAllowedLucideIcon =
  | 'ShieldCheck'
  | 'MessageCircle'
  | 'RefreshCw'
  | 'Sparkles'
  | 'FileSpreadsheet'
  | 'Table'
  | 'Monitor'
  | 'Smartphone'
  | 'Cpu'
  | 'FolderKanban'
  | 'Layers'
  | 'Flame'
  | 'Award'
  | 'Gift'
  | 'Wrench'
  | 'Clock'
  | 'CheckCircle2'
  | 'Zap'
  | 'Lock'
  | 'Globe'
  | 'Code2'
  | 'BarChart3'
  | 'Database'
  | 'Headphones';

export interface HomepageLucideIconOption {
  name: HomepageAllowedLucideIcon;
  label: string;
}

export const HOMEPAGE_ALLOWED_LUCIDE_ICONS: readonly HomepageLucideIconOption[] = [
  { name: 'ShieldCheck', label: 'Escudo Verificado (ShieldCheck)' },
  { name: 'MessageCircle', label: 'WhatsApp / Mensaje (MessageCircle)' },
  { name: 'RefreshCw', label: 'Control de Versiones / Ciclo (RefreshCw)' },
  { name: 'Sparkles', label: 'Destellos / Reserva (Sparkles)' },
  { name: 'FileSpreadsheet', label: 'Hoja Excel (FileSpreadsheet)' },
  { name: 'Table', label: 'Tabla / Google Sheets (Table)' },
  { name: 'Monitor', label: 'Sistema Web / Escritorio (Monitor)' },
  { name: 'Smartphone', label: 'App Android / Móvil (Smartphone)' },
  { name: 'Cpu', label: 'Automatización / CPU (Cpu)' },
  { name: 'FolderKanban', label: 'Recursos / Kanban (FolderKanban)' },
  { name: 'Layers', label: 'Capas / Módulos (Layers)' },
  { name: 'Flame', label: 'Oferta / Tendencia (Flame)' },
  { name: 'Award', label: 'Calidad / Garantía (Award)' },
  { name: 'Gift', label: 'Recurso Gratuito (Gift)' },
  { name: 'Wrench', label: 'Soporte / A Medida (Wrench)' },
  { name: 'Clock', label: 'Entrega Rápida / Horario (Clock)' },
  { name: 'CheckCircle2', label: 'Check Verificado (CheckCircle2)' },
  { name: 'Zap', label: 'Velocidad / Productividad (Zap)' },
  { name: 'Lock', label: 'Seguridad / Privacidad (Lock)' },
  { name: 'Globe', label: 'Acceso Web / Cloud (Globe)' },
  { name: 'Code2', label: 'Código Fuente / Script (Code2)' },
  { name: 'BarChart3', label: 'Dashboard / Analítica (BarChart3)' },
  { name: 'Database', label: 'Base de Datos / Kardex (Database)' },
  { name: 'Headphones', label: 'Soporte Directo (Headphones)' },
] as const;

export type DealFallbackBehavior =
  | 'HIDE_SECTION'
  | 'AUTO_FIRST_PROMOTION'
  | 'AUTO_FEATURED';

export interface DealOfTheDayConfigJson {
  featured_product_id?: string | null;
  fallback_behavior?: DealFallbackBehavior;
  countdown_label?: string;
  price_caption?: string;
  cta_button_label?: string;
  secondary_button_label?: string;
  custom_expires_at?: string | null;
  promo_highlight_note?: string | null;
}

export type CategoryShowcaseCollectionKey =
  | 'destacados'
  | 'mas_vendidos'
  | 'novedades'
  | 'ofertas';

export type CollectionSelectionMode = 'AUTO_FLAGS' | 'MANUAL_TARGETS';

export interface CategoryShowcaseTabConfig {
  key: CategoryShowcaseCollectionKey;
  label: string;
  enabled: boolean;
  display_order: number;
  selection_mode: CollectionSelectionMode;
}

export interface CategoryTabsShowcaseConfigJson {
  max_products_per_tab?: number;
  default_tab?: 'ALL' | CategoryShowcaseCollectionKey;
  show_active_categories?: boolean;
  category_selection_mode?: 'ALL_ACTIVE' | 'MANUAL_TARGETS';
  collection_tabs?: CategoryShowcaseTabConfig[];
}

export type AutomaticProductCriterion =
  | 'is_featured'
  | 'is_bestseller'
  | 'is_new'
  | 'is_on_promotion';

export interface ProductOrCategoryCollectionConfigJson {
  max_items?: number;
  selection_mode?: CollectionSelectionMode;
  auto_criterion?: AutomaticProductCriterion;
  collection_key?: string;
}

export interface FreeResourcesConfigJson {
  max_items?: number;
  selection_mode?: 'AUTO_ALL_FREE' | 'MANUAL_TARGETS';
  highlight_note?: string | null;
}

export interface CustomServicesCtaConfigJson {
  secondary_badge_text?: string | null;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  response_SLA_text?: string | null;
}

export interface BenefitItemAdminInput {
  section_id?: string | null;
  admin_name: string;
  title: string;
  subtitle: string;
  icon_name: HomepageAllowedLucideIcon;
  icon_color_hex: string;
  display_order?: number;
  status?: HomepagePublishStatus;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface BenefitItemMutationResult {
  benefit: HomepageSectionItem | null;
  error: string | null;
}

export interface InfoCardAdminInput {
  section_id?: string | null;
  admin_name: string;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  title: string;
  subtitle: string;
  icon_name?: HomepageAllowedLucideIcon | null;
  icon_color_hex?: string | null;
  image_desktop_url?: string | null;
  infoImageFile?: File | null;
  removeInfoImage?: boolean;
  image_alt_text?: string | null;
  cta_primary_label?: string | null;
  cta_primary_url?: string | null;
  open_in_new_tab?: boolean;
  display_order?: number;
  status?: HomepagePublishStatus;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface InfoCardMutationResult {
  infoCard: HomepageSectionItem | null;
  error: string | null;
}

export interface HomepageTargetProductSummary {
  id: string;
  sku: string;
  name: string;
  slug: string;
  modalidad: 'FREE' | 'PRO' | 'PERSONALIZADO';
  price_regular_pen: number;
  price_sale_pen: number | null;
  is_on_promotion: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_deal_of_the_day: boolean;
  status: 'ACTIVO' | 'INACTIVO';
  category_name: string | null;
}

export interface HomepageTargetCategorySummary {
  id: string;
  name: string;
  slug: string;
  icon_name: string | null;
  color_hex: string | null;
  image_url?: string | null;
  is_active: boolean;
  display_order: number;
}

export interface HomepageSectionTargetExpanded extends HomepageSectionTarget {
  product: HomepageTargetProductSummary | null;
  category: HomepageTargetCategorySummary | null;
}

export interface HomepageTargetAdminInput {
  section_id: string;
  target_type: HomepageTargetType;
  collection_key?: string;
  product_id?: string | null;
  category_id?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface HomepageTargetMutationResult {
  target: HomepageSectionTargetExpanded | null;
  error: string | null;
}

export interface DealOfTheDayAdminConfigInput {
  title: string;
  subtitle?: string | null;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  cta_label?: string | null;
  cta_url?: string | null;
  status: HomepagePublishStatus;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  featured_product_id?: string | null;
  fallback_behavior: DealFallbackBehavior;
  countdown_label?: string | null;
  price_caption?: string | null;
  cta_button_label?: string | null;
  secondary_button_label?: string | null;
  custom_expires_at?: string | null;
  promo_highlight_note?: string | null;
}

export interface CategoryTabsAdminConfigInput {
  title: string;
  subtitle?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  status: HomepagePublishStatus;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_products_per_tab: number;
  default_tab: 'ALL' | CategoryShowcaseCollectionKey;
  show_active_categories: boolean;
  category_selection_mode: 'ALL_ACTIVE' | 'MANUAL_TARGETS';
  collection_tabs: CategoryShowcaseTabConfig[];
}

export interface CollectionSectionAdminConfigInput {
  title: string;
  subtitle?: string | null;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  cta_label?: string | null;
  cta_url?: string | null;
  status: HomepagePublishStatus;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_items: number;
  selection_mode: CollectionSelectionMode;
  auto_criterion?: AutomaticProductCriterion;
  collection_key?: string;
}

export interface FreeResourcesAdminConfigInput {
  title: string;
  subtitle?: string | null;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  cta_label?: string | null;
  cta_url?: string | null;
  status: HomepagePublishStatus;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  max_items: number;
  selection_mode: 'AUTO_ALL_FREE' | 'MANUAL_TARGETS';
  highlight_note?: string | null;
}

export interface CustomServicesCtaAdminConfigInput {
  title: string;
  subtitle: string;
  badge_text?: string | null;
  badge_variant?: HomepageBadgeVariant | null;
  secondary_badge_text?: string | null;
  cta_label: string;
  cta_url: string;
  secondary_cta_label?: string | null;
  secondary_cta_url?: string | null;
  response_SLA_text?: string | null;
  status: HomepagePublishStatus;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

// ============================================================================
// SPRINT C5: SNAPSHOT PÚBLICO DE LA PORTADA (SOLO PUBLICADO, ACTIVO Y VIGENTE)
// ============================================================================

export interface PublicHomepageSnapshot {
  sections: HomepageSection[];
  items: HomepageSectionItem[];
  targets: HomepageSectionTarget[];
  error: string | null;
}

