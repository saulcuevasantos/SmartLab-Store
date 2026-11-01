/**
 * SmartLab Store — Tipos del Catálogo Digital
 * Alineados con el esquema relacional de docs/04_BASE_DATOS.md
 */

export type OfficialCategorySlug =
  | 'excel'
  | 'google_sheets'
  | 'google-sheets'
  | 'sistemas'
  | 'android_apps'
  | 'aplicaciones-android'
  | 'automatizaciones'
  | 'recursos_digitales'
  | 'recursos-digitales';

export type CategorySlug =
  | 'excel'
  | 'google_sheets'
  | 'sistemas'
  | 'android_apps'
  | 'automatizaciones'
  | 'recursos_digitales'
  | (string & {});

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  description: string | null;
  icon_name: string | null;
  color_hex?: string | null;
  image_url?: string | null;
  display_order?: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductModalidad = 'FREE' | 'PRO' | 'PERSONALIZADO';

export type ProductStatus = 'ACTIVO' | 'INACTIVO' | 'ARCHIVADO';

export interface Product {
  id: string;
  category_id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  features_list: string[];
  technical_requirements: string | null;
  modalidad: ProductModalidad;
  price_regular_pen: number; // en Soles (S/)
  price_sale_pen: number | null; // en Soles (S/)
  is_on_promotion: boolean;
  current_version: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_deal_of_the_day: boolean;
  deal_expires_at: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales expandidas (NUNCA incluye download_links en tienda pública)
  category?: Category;
  images?: ProductImage[];
  versions?: ProductVersion[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

export interface ProductVersion {
  id: string;
  product_id: string;
  version_number: string;
  changelog: string | null;
  release_date: string;
  is_current?: boolean;
  created_at: string;
}

export type DownloadLinkType = 'GOOGLE_DRIVE' | 'MEDIAFIRE' | 'STORAGE_PRIVADO' | 'OTRO';

/**
 * IMPORTANTE (docs/07_SEGURIDAD.md y Sprint 05):
 * Esta interfaz solo se utiliza en módulos administrativos (Sprint 08 / 09).
 * La tienda pública jamás consulta ni expone registros de download_links.
 */
export interface DownloadLink {
  id: string;
  product_version_id: string;
  link_type: DownloadLinkType;
  access_url: string;
  instructions: string | null;
  is_active: boolean;
  created_at: string;
}

export type CatalogSortOption =
  | 'featured'
  | 'newest'
  | 'bestsellers'
  | 'price_asc'
  | 'price_desc';

export interface CatalogFilters {
  search?: string;
  categorySlug?: CategorySlug | 'all';
  modalidad?: ProductModalidad | 'all';
  onlyPromotions?: boolean;
  minPricePen?: number;
  maxPricePen?: number;
  sortBy?: CatalogSortOption;
}

export interface CustomRequestPayload {
  user_id?: string | null;
  product_id?: string | null;
  category_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  requirements_detail: string;
  estimated_budget_pen?: number | null;
}

export interface CustomRequestRecord extends CustomRequestPayload {
  id: string;
  status: 'RECIBIDA' | 'EN_EVALUACION' | 'COTIZADA' | 'ACEPTADA' | 'DESCARTADA';
  created_at: string;
}
