/**
 * SmartLab Store — Servicio Administrativo Integral (Sprint 08)
 * docs/08_PLAN_SPRINTS.md (Sprint 08), docs/04_BASE_DATOS.md y docs/07_SEGURIDAD.md
 *
 * Responsabilidades:
 * 1. KPIs del Dashboard Comercial en Soles (PEN / S/).
 * 2. CRUD de Productos, Versiones y Enlaces Privados (Google Drive / MediaFire) en `download_links`.
 *    REGLA DE SEGURIDAD: Los enlaces de descarga solo existen en este servicio administrativo
 *    y jamás se exponen en consultas públicas de la tienda.
 * 3. Gestión de Precios en S/ y Promociones (sin alterar snapshots de pedidos previos).
 * 4. Gestión de Cupones de Descuento.
 * 5. Directorio e Historial de Clientes y Bandeja de Solicitudes Personalizadas.
 * 6. Configuración General de la Tienda (incluyendo plazo de vencimiento `order_expiration_hours` = 72h,
 *    cuentas en S/, Yape, Plin y WhatsApp oficial).
 */

import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  Category,
  CategorySlug,
  Product,
  ProductModalidad,
  ProductStatus,
  ProductVersion,
  DownloadLink,
  DownloadLinkType,
  CustomRequestRecord,
} from '../types/catalog.types';
import {
  Coupon,
  Order,
  Payment,
  PaymentMethodsConfig,
  QrWalletMethod,
  StoreSettingKey,
  StoreSettingRecord,
} from '../types/order.types';
import { Profile, UserRole } from '../types/user.types';
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  LOCAL_ADMIN_CATEGORIES_KEY,
  LOCAL_ADMIN_PRODUCTS_KEY,
  areCategorySlugsEquivalent,
  getEquivalentCategoryIds,
  loadCatalogProductsBase,
  loadLocalCategoriesBase,
  mapSupabaseCategoryRow,
  resolveCategoryByIdOrEquivalent,
} from './catalog.service';
import {
  LOCAL_ADMIN_COUPONS_KEY,
  loadCouponsBase,
} from './coupons.service';
import {
  CheckoutStoreSettings,
  DEFAULT_CHECKOUT_STORE_SETTINGS,
  DEFAULT_PAYMENT_METHODS_CONFIG,
  getCheckoutStoreSettings,
  evaluateOrderExpiration,
  loadLocalStoreSettingsKV,
  mapBankAccountInfoToConfigAccounts,
  mapConfigAccountsToBankAccountInfo,
  normalizePaymentMethodsConfig,
  upsertLocalStoreSettingKey,
} from './orders.service';
import { ensureDemoOrdersAndPaymentsSeeded } from './payments.service';
import {
  uploadPublicStoreAsset,
  deletePublicStoreAsset,
  isCategoryPublicAssetUrl,
} from './storage.service';
import {
  normalizeCategoryHexColor,
  resolveCategoryIconColorHex,
  resolveDefaultLegacyCategoryColorHex,
} from '../components/common/CategoryVisual/CategoryVisual';

const LOCAL_DOWNLOAD_LINKS_KEY = 'smartlab_admin_download_links_v1';
const LOCAL_CUSTOM_REQUESTS_KEY = 'smartlab_custom_requests_v1';
const LOCAL_ORDERS_KEY = 'smartlab_orders_v1';
const LOCAL_PAYMENTS_KEY = 'smartlab_payments_v1';
const LOCAL_ACCOUNTS_KEY = 'smartlab_store_accounts_v1';
const LOCAL_SETTINGS_KEY = 'smartlab_store_settings_v1';

export interface AdminCategoryInput {
  name: string;
  slug?: string;
  description?: string | null;
  icon_name?: string | null;
  color_hex?: string | null;
  image_url?: string | null;
  imageFile?: File | null;
  removeImage?: boolean;
  display_order?: number;
  sort_order?: number;
  is_active?: boolean;
}

export interface AdminCategoryMutationResult {
  category: Category | null;
  error: string | null;
}

export interface DeleteAdminCategoryResult {
  success: boolean;
  blockedByRelations?: boolean;
  associatedProductsCount?: number;
  associatedCustomRequestsCount?: number;
  error: string | null;
}

export interface AdminProductWithLinks extends Product {
  downloadLinks: DownloadLink[];
}

export interface UpsertProductAdminInput {
  id?: string;
  category_id: string;
  sku: string;
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  features_list: string[];
  technical_requirements: string | null;
  modalidad: ProductModalidad;
  price_regular_pen: number;
  price_sale_pen: number | null;
  is_on_promotion: boolean;
  current_version: string;
  changelog?: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_deal_of_the_day: boolean;
  deal_expires_at: string | null;
  status: ProductStatus;
  cover_image_url?: string;
  downloadLinks: Array<{
    id?: string;
    link_type: DownloadLinkType;
    access_url: string;
    instructions: string | null;
    is_active: boolean;
  }>;
}

export interface AdminCustomerRecord {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  document_type: string | null;
  document_number: string | null;
  role_id: UserRole;
  is_active: boolean;
  total_orders_count: number;
  total_verified_spent_pen: number;
  pending_balance_pen: number;
  created_at: string;
}

export interface AdminCustomRequestExtended extends CustomRequestRecord {
  quoted_price_pen?: number | null;
  admin_notes?: string | null;
  updated_at?: string;
}

export interface AdminStoreSettingsExtended extends CheckoutStoreSettings {
  heroBannerTitle: string;
  heroBannerSubtitle: string;
  promoBarText: string;
}

export interface AdminDashboardMetrics {
  totalVerifiedRevenuePen: number;
  pendingReceiptsCount: number;
  readyForDeliveryCount: number;
  pendingOrdersCount: number;
  expiredOrdersCount: number;
  customRequestsPendingCount: number;
  activeProductsCount: number;
  activeCouponsCount: number;
  totalCustomersCount: number;
  recentOrders: Order[];
  recentCustomRequests: AdminCustomRequestExtended[];
}

// ============================================================================
// 1. ENLACES PRIVADOS DE DESCARGA (GOOGLE DRIVE / MEDIAFIRE)
// ============================================================================

function buildDefaultDownloadLinks(products: Product[]): Record<string, DownloadLink[]> {
  const map: Record<string, DownloadLink[]> = {};
  for (const prod of products) {
    const versionId = prod.versions?.[0]?.id || `ver-${prod.id}`;
    map[prod.id] = [
      {
        id: `dl-drive-${prod.id}`,
        product_version_id: versionId,
        link_type: 'GOOGLE_DRIVE',
        access_url: `https://drive.google.com/drive/folders/smartlab-${prod.slug}-${prod.current_version.replace(/\./g, '-')}`,
        instructions: `Instalador y manual oficial (${prod.current_version}) en Google Drive privado.`,
        is_active: true,
        created_at: prod.created_at,
      },
      {
        id: `dl-mediafire-${prod.id}`,
        product_version_id: versionId,
        link_type: 'MEDIAFIRE',
        access_url: `https://www.mediafire.com/file/smartlab-${prod.slug}-${prod.current_version}/file`,
        instructions: `Mirror de respaldo directo en MediaFire (${prod.current_version}).`,
        is_active: true,
        created_at: prod.created_at,
      },
    ];
  }
  return map;
}

export function loadAdminDownloadLinksMap(): Record<string, DownloadLink[]> {
  const baseProducts = loadCatalogProductsBase();
  const defaults = buildDefaultDownloadLinks(baseProducts);

  try {
    const raw = localStorage.getItem(LOCAL_DOWNLOAD_LINKS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_DOWNLOAD_LINKS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw) as Record<string, DownloadLink[]>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function saveAdminDownloadLinksMap(map: Record<string, DownloadLink[]>): void {
  try {
    localStorage.setItem(LOCAL_DOWNLOAD_LINKS_KEY, JSON.stringify(map));
  } catch {
    // Ignorar
  }
}

// ============================================================================
// 2. GESTIÓN DE CATEGORÍAS, CATÁLOGO, VERSIONES, IMÁGENES Y ENLACES PRIVADOS
// ============================================================================

function saveLocalCategoriesBase(categories: Category[]): void {
  try {
    localStorage.setItem(LOCAL_ADMIN_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {
    // Ignorar errores de cuota local
  }
}

const LEGACY_UNDERSCORE_SLUGS = new Set([
  'google_sheets',
  'android_apps',
  'recursos_digitales',
]);

/**
 * Normaliza un texto a formato slug (`kebab-case`): minúsculas, sin tildes,
 * espacios convertidos en guiones y sin caracteres especiales (máx. 100 caracteres).
 */
export function normalizeCategorySlugInput(raw: string): CategorySlug {
  const trimmed = String(raw || '').trim().toLowerCase();
  if (LEGACY_UNDERSCORE_SLUGS.has(trimmed)) {
    return trimmed as CategorySlug;
  }
  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return normalized as CategorySlug;
}

/**
 * Genera un identificador único e inmutable (`VARCHAR(50)`) al crear una categoría nueva.
 * Nunca se invoca durante la edición de una categoría existente.
 */
function generateUniqueCategoryId(slugOrName: string, existingCategories: Category[]): string {
  const existingIds = new Set<string>();
  for (const cat of existingCategories) {
    for (const eqId of getEquivalentCategoryIds(cat.id)) {
      existingIds.add(eqId.toLowerCase());
    }
  }

  const baseId = String(slugOrName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 36);

  const candidateBase = baseId || `cat_${Date.now().toString(36)}`;
  if (!existingIds.has(candidateBase) && !existingIds.has(`cat-${candidateBase.replace(/_/g, '-')}`)) {
    return candidateBase.slice(0, 50);
  }

  const uniqueSuffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 6)
      : Math.random().toString(36).slice(2, 8);

  return `${candidateBase.slice(0, 42)}_${uniqueSuffix}`.slice(0, 50);
}

/**
 * Verifica que el usuario autenticado tenga sesión activa y perfil con rol ADMIN (`is_active = true`).
 * La seguridad final en Supabase sigue respaldada por las políticas RLS (`categories_admin_all` + `public.is_admin()`).
 */
async function verifyAdminCategoryMutationAccess(): Promise<{
  authorized: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { authorized: true, error: null };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        authorized: false,
        error: 'Debes iniciar sesión como administrador para gestionar categorías.',
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
        error: 'No se pudo verificar el perfil administrativo del usuario actual.',
      };
    }

    const role = profile.role_id ?? (profile as { role?: string | null }).role ?? '';
    const isAdmin = String(role).trim().toUpperCase() === 'ADMIN';

    if (!isAdmin || profile.is_active !== true) {
      return {
        authorized: false,
        error: 'Acceso denegado: solo los usuarios con rol ADMIN activo pueden modificar categorías.',
      };
    }

    return { authorized: true, error: null };
  } catch (err) {
    return {
      authorized: false,
      error:
        err instanceof Error
          ? err.message
          : 'Error al verificar permisos administrativos para categorías.',
    };
  }
}

/**
 * Elimina de forma segura una imagen antigua de `public-assets/categories/` únicamente si:
 * 1. Pertenece realmente a la subcarpeta `categories/` del bucket `public-assets` (no rutas ajenas ni URLs externas).
 * 2. Ninguna otra categoría existente está utilizando la misma URL (`image_url`).
 */
async function safelyCleanupCategoryAssetIfUnreferenced(
  oldImageUrl: string | null | undefined,
  currentCategoryId: string,
  allCategories: Category[]
): Promise<void> {
  if (!oldImageUrl || !isCategoryPublicAssetUrl(oldImageUrl)) {
    return;
  }

  const trimmedTarget = oldImageUrl.trim();
  const isSharedWithAnotherCategory = allCategories.some(
    (cat) =>
      cat.id !== currentCategoryId &&
      Boolean(cat.image_url) &&
      String(cat.image_url).trim() === trimmedTarget
  );

  if (isSharedWithAnotherCategory) {
    return;
  }

  await deletePublicStoreAsset(trimmedTarget);
}

/**
 * Obtiene todas las categorías para el panel administrativo (activas e inactivas),
 * ordenadas por `display_order` ascendente.
 */
export async function getAdminCategories(): Promise<Category[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((row: Record<string, unknown>, idx: number) =>
          mapSupabaseCategoryRow(row, idx)
        );
      }
    } catch {
      // Fallback seguro a la copia local en caso de desconexión
    }
  }

  return loadLocalCategoriesBase();
}

/**
 * Comprueba cuántos productos y solicitudes personalizadas están asociados a una categoría
 * (incluyendo sus IDs equivalentes verificados `sqlId` <-> `seedId` sin alterar registros).
 */
export async function getAdminCategoryUsageSummary(categoryId: string): Promise<{
  associatedProductsCount: number;
  associatedCustomRequestsCount: number;
}> {
  const candidateIds = getEquivalentCategoryIds(categoryId);
  if (candidateIds.length === 0) {
    return { associatedProductsCount: 0, associatedCustomRequestsCount: 0 };
  }

  const candidateSet = new Set(candidateIds);
  const localProductsCount = loadCatalogProductsBase().filter((p) =>
    candidateSet.has(String(p.category_id))
  ).length;

  let localRequestsCount = 0;
  try {
    const rawReqs = localStorage.getItem(LOCAL_CUSTOM_REQUESTS_KEY);
    if (rawReqs) {
      const parsed = JSON.parse(rawReqs);
      if (Array.isArray(parsed)) {
        localRequestsCount = parsed.filter((r: Record<string, unknown>) =>
          candidateSet.has(String(r.category_id || ''))
        ).length;
      }
    }
  } catch {
    // Ignorar error de lectura local
  }

  if (!isSupabaseConfigured()) {
    return {
      associatedProductsCount: localProductsCount,
      associatedCustomRequestsCount: localRequestsCount,
    };
  }

  let dbProductsCount = 0;
  let dbRequestsCount = 0;

  try {
    const { count: prodCount, error: prodErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .in('category_id', candidateIds);

    if (!prodErr && typeof prodCount === 'number') {
      dbProductsCount = prodCount;
    }
  } catch {
    // Ignorar y respaldar con conteo local
  }

  try {
    const { count: reqCount, error: reqErr } = await supabase
      .from('custom_requests')
      .select('id', { count: 'exact', head: true })
      .in('category_id', candidateIds);

    if (!reqErr && typeof reqCount === 'number') {
      dbRequestsCount = reqCount;
    }
  } catch {
    // Ignorar
  }

  return {
    associatedProductsCount: Math.max(dbProductsCount, localProductsCount),
    associatedCustomRequestsCount: Math.max(dbRequestsCount, localRequestsCount),
  };
}

/**
 * Crea una nueva categoría administrativa en `public.categories` (y `public-assets/categories/` si incluye imagen).
 * - Genera un `id` único al crear (`VARCHAR(50)`).
 * - Valida unicidad de `name` y `slug`.
 * - Si falla la inserción en BD tras haber subido un archivo a `categories/`, elimina el archivo huérfano.
 */
export async function createAdminCategory(
  input: AdminCategoryInput
): Promise<AdminCategoryMutationResult> {
  const access = await verifyAdminCategoryMutationAccess();
  if (!access.authorized) {
    return { category: null, error: access.error };
  }

  const cleanName = String(input.name || '').trim();
  if (cleanName.length < 2 || cleanName.length > 100) {
    return {
      category: null,
      error: 'El nombre de la categoría es obligatorio y debe tener entre 2 y 100 caracteres.',
    };
  }

  const cleanSlug = normalizeCategorySlugInput(input.slug || cleanName);
  if (cleanSlug.length < 2 || cleanSlug.length > 100) {
    return {
      category: null,
      error: 'El slug de la categoría es obligatorio y debe tener entre 2 y 100 caracteres.',
    };
  }

  const existingCategories = await getAdminCategories();
  const duplicateName = existingCategories.find(
    (c) => c.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (duplicateName) {
    return {
      category: null,
      error: `Ya existe una categoría con el nombre "${duplicateName.name}".`,
    };
  }

  const duplicateSlug = existingCategories.find(
    (c) =>
      c.slug.trim().toLowerCase() === cleanSlug.toLowerCase() ||
      areCategorySlugsEquivalent(c.slug, cleanSlug)
  );
  if (duplicateSlug) {
    return {
      category: null,
      error: `El slug "${cleanSlug}" ya está en uso o es equivalente a la categoría "${duplicateSlug.name}".`,
    };
  }

  const newCategoryId = generateUniqueCategoryId(cleanSlug, existingCategories);
  const maxOrder = existingCategories.reduce(
    (max, cat) => Math.max(max, Number(cat.display_order ?? cat.sort_order ?? 0)),
    0
  );
  const rawOrder = input.display_order ?? input.sort_order ?? maxOrder + 1;
  const resolvedOrder = Number.isFinite(Number(rawOrder))
    ? Math.max(0, Math.round(Number(rawOrder)))
    : maxOrder + 1;

  const cleanDescription =
    input.description !== undefined && input.description !== null && input.description.trim() !== ''
      ? input.description.trim()
      : null;
  const cleanIconName =
    input.icon_name !== undefined && input.icon_name !== null && input.icon_name.trim() !== ''
      ? input.icon_name.trim().slice(0, 50)
      : 'FolderOpen';

  let cleanColorHex = resolveDefaultLegacyCategoryColorHex(newCategoryId, cleanSlug);
  if (
    input.color_hex !== undefined &&
    input.color_hex !== null &&
    String(input.color_hex).trim() !== ''
  ) {
    const normalizedHex = normalizeCategoryHexColor(input.color_hex);
    if (!normalizedHex) {
      return {
        category: null,
        error:
          'El color del icono debe ser un código hexadecimal válido de 6 dígitos (ej. #3B82F6).',
      };
    }
    cleanColorHex = normalizedHex;
  }

  const isActive = input.is_active !== undefined ? Boolean(input.is_active) : true;

  let uploadedAssetUrl: string | null = null;
  let finalImageUrl: string | null =
    input.image_url !== undefined && input.image_url !== null && input.image_url.trim() !== ''
      ? input.image_url.trim()
      : null;

  if (input.imageFile) {
    const uploadRes = await uploadPublicStoreAsset(input.imageFile, 'categories');
    if (uploadRes.error || !uploadRes.publicUrl) {
      return {
        category: null,
        error: uploadRes.error || 'No se pudo subir la imagen de la categoría a public-assets.',
      };
    }
    uploadedAssetUrl = uploadRes.publicUrl;
    finalImageUrl = uploadRes.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      const insertPayload: Record<string, unknown> = {
        id: newCategoryId,
        name: cleanName,
        slug: cleanSlug,
        description: cleanDescription,
        icon_name: cleanIconName,
        color_hex: cleanColorHex,
        image_url: finalImageUrl,
        display_order: resolvedOrder,
        is_active: isActive,
      };

      let { data, error } = await supabase
        .from('categories')
        .insert(insertPayload)
        .select('*')
        .single();

      // Si la migración 006 aún no se ha aplicado y no se envió imagen, reintentar sin columna image_url
      if (
        error &&
        String(error.message || '').toLowerCase().includes('image_url') &&
        finalImageUrl === null
      ) {
        const fallbackPayload = { ...insertPayload };
        delete fallbackPayload.image_url;
        const retry = await supabase
          .from('categories')
          .insert(fallbackPayload)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error || !data) {
        if (uploadedAssetUrl) {
          await deletePublicStoreAsset(uploadedAssetUrl);
        }
        const errMsg = error?.message || 'No se pudo registrar la categoría en Supabase.';
        if (errMsg.toLowerCase().includes('image_url')) {
          return {
            category: null,
            error:
              'La columna image_url aún no existe en public.categories. Ejecuta la migración 006_categories_image_url.sql en Supabase.',
          };
        }
        if (errMsg.toLowerCase().includes('color_hex')) {
          return {
            category: null,
            error:
              'La columna color_hex aún no existe en public.categories. Ejecuta la migración 007_categories_color_hex.sql en Supabase.',
          };
        }
        return { category: null, error: errMsg };
      }

      const created = mapSupabaseCategoryRow(data as Record<string, unknown>, resolvedOrder);
      return { category: created, error: null };
    } catch (err) {
      if (uploadedAssetUrl) {
        await deletePublicStoreAsset(uploadedAssetUrl);
      }
      return {
        category: null,
        error:
          err instanceof Error ? err.message : 'Error inesperado al crear la categoría en Supabase.',
      };
    }
  }

  const nowIso = new Date().toISOString();
  const createdLocal: Category = {
    id: newCategoryId,
    name: cleanName,
    slug: cleanSlug,
    description: cleanDescription,
    icon_name: cleanIconName,
    color_hex: cleanColorHex,
    image_url: finalImageUrl,
    display_order: resolvedOrder,
    sort_order: resolvedOrder,
    is_active: isActive,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const nextLocal = [...existingCategories, createdLocal].sort(
    (a, b) => (a.display_order ?? a.sort_order) - (b.display_order ?? b.sort_order)
  );
  saveLocalCategoriesBase(nextLocal);
  return { category: createdLocal, error: null };
}

/**
 * Actualiza una categoría existente en `public.categories`.
 * - NUNCA modifica el `id` existente.
 * - Si se reemplaza la imagen (`imageFile`), sube la nueva primero, actualiza la BD y solo elimina
 *   la imagen anterior de `public-assets/categories/` después de confirmar el guardado exitoso.
 * - Si falla el guardado en BD, conserva la imagen anterior y limpia el archivo nuevo recién subido.
 */
export async function updateAdminCategory(
  categoryId: string,
  input: Partial<AdminCategoryInput>
): Promise<AdminCategoryMutationResult> {
  const access = await verifyAdminCategoryMutationAccess();
  if (!access.authorized) {
    return { category: null, error: access.error };
  }

  const cleanTargetId = String(categoryId || '').trim();
  if (!cleanTargetId) {
    return { category: null, error: 'El identificador de la categoría es obligatorio.' };
  }

  const existingCategories = await getAdminCategories();
  const targetCategory = existingCategories.find((c) => c.id === cleanTargetId);
  if (!targetCategory) {
    return {
      category: null,
      error: `No se encontró la categoría con ID "${cleanTargetId}".`,
    };
  }

  const nextName =
    input.name !== undefined ? String(input.name).trim() : targetCategory.name;
  if (nextName.length < 2 || nextName.length > 100) {
    return {
      category: null,
      error: 'El nombre de la categoría debe tener entre 2 y 100 caracteres.',
    };
  }

  const nextSlug =
    input.slug !== undefined
      ? normalizeCategorySlugInput(input.slug)
      : targetCategory.slug;
  if (nextSlug.length < 2 || nextSlug.length > 100) {
    return {
      category: null,
      error: 'El slug de la categoría debe tener entre 2 y 100 caracteres.',
    };
  }

  const duplicateName = existingCategories.find(
    (c) =>
      c.id !== targetCategory.id &&
      c.name.trim().toLowerCase() === nextName.toLowerCase()
  );
  if (duplicateName) {
    return {
      category: null,
      error: `Ya existe otra categoría con el nombre "${duplicateName.name}".`,
    };
  }

  const duplicateSlug = existingCategories.find(
    (c) =>
      c.id !== targetCategory.id &&
      (c.slug.trim().toLowerCase() === nextSlug.toLowerCase() ||
        areCategorySlugsEquivalent(c.slug, nextSlug))
  );
  if (duplicateSlug) {
    return {
      category: null,
      error: `El slug "${nextSlug}" ya está asignado a la categoría "${duplicateSlug.name}".`,
    };
  }

  const nextDescription =
    input.description !== undefined
      ? input.description !== null && input.description.trim() !== ''
        ? input.description.trim()
        : null
      : targetCategory.description;

  const nextIconName =
    input.icon_name !== undefined
      ? input.icon_name !== null && input.icon_name.trim() !== ''
        ? input.icon_name.trim().slice(0, 50)
        : null
      : targetCategory.icon_name;

  let nextColorHex = resolveCategoryIconColorHex(targetCategory);
  if (input.color_hex !== undefined) {
    if (input.color_hex !== null && String(input.color_hex).trim() !== '') {
      const normalizedHex = normalizeCategoryHexColor(input.color_hex);
      if (!normalizedHex) {
        return {
          category: null,
          error:
            'El color del icono debe ser un código hexadecimal válido de 6 dígitos (ej. #3B82F6).',
        };
      }
      nextColorHex = normalizedHex;
    } else {
      nextColorHex = resolveDefaultLegacyCategoryColorHex(targetCategory.id, nextSlug);
    }
  }

  const rawOrder =
    input.display_order ??
    input.sort_order ??
    targetCategory.display_order ??
    targetCategory.sort_order;
  const nextDisplayOrder = Number.isFinite(Number(rawOrder))
    ? Math.max(0, Math.round(Number(rawOrder)))
    : targetCategory.sort_order;

  const nextIsActive =
    input.is_active !== undefined ? Boolean(input.is_active) : targetCategory.is_active;

  const previousImageUrl = targetCategory.image_url ?? null;
  let newlyUploadedUrl: string | null = null;
  let nextImageUrl: string | null = previousImageUrl;

  if (input.removeImage === true) {
    nextImageUrl = null;
  } else if (input.image_url !== undefined) {
    nextImageUrl =
      input.image_url !== null && input.image_url.trim() !== ''
        ? input.image_url.trim()
        : null;
  }

  if (input.imageFile) {
    const uploadRes = await uploadPublicStoreAsset(input.imageFile, 'categories');
    if (uploadRes.error || !uploadRes.publicUrl) {
      return {
        category: null,
        error: uploadRes.error || 'No se pudo subir la nueva imagen de la categoría.',
      };
    }
    newlyUploadedUrl = uploadRes.publicUrl;
    nextImageUrl = uploadRes.publicUrl;
  }

  if (isSupabaseConfigured()) {
    try {
      // NUNCA incluir `id` en el payload de actualización
      const updatePayload: Record<string, unknown> = {
        name: nextName,
        slug: nextSlug,
        description: nextDescription,
        icon_name: nextIconName,
        color_hex: nextColorHex,
        image_url: nextImageUrl,
        display_order: nextDisplayOrder,
        is_active: nextIsActive,
      };

      let { data, error } = await supabase
        .from('categories')
        .update(updatePayload)
        .eq('id', targetCategory.id)
        .select('*')
        .single();

      // Si la migración 006 aún no se aplicó y no se está guardando una imagen nueva, reintentar sin image_url
      if (
        error &&
        String(error.message || '').toLowerCase().includes('image_url') &&
        nextImageUrl === null &&
        previousImageUrl === null
      ) {
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.image_url;
        const retry = await supabase
          .from('categories')
          .update(fallbackPayload)
          .eq('id', targetCategory.id)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      // Si la migración 007 aún no se aplicó y la acción no modificaba color_hex explícitamente (ej. orden rápido)
      if (
        error &&
        String(error.message || '').toLowerCase().includes('color_hex') &&
        input.color_hex === undefined
      ) {
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.color_hex;
        const retry = await supabase
          .from('categories')
          .update(fallbackPayload)
          .eq('id', targetCategory.id)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error || !data) {
        if (newlyUploadedUrl) {
          await deletePublicStoreAsset(newlyUploadedUrl);
        }
        const errMsg = error?.message || 'No se pudo actualizar la categoría en Supabase.';
        if (errMsg.toLowerCase().includes('image_url')) {
          return {
            category: null,
            error:
              'La columna image_url aún no existe en public.categories. Ejecuta la migración 006_categories_image_url.sql en Supabase.',
          };
        }
        if (errMsg.toLowerCase().includes('color_hex')) {
          return {
            category: null,
            error:
              'La columna color_hex aún no existe en public.categories. Ejecuta la migración 007_categories_color_hex.sql en Supabase.',
          };
        }
        return { category: null, error: errMsg };
      }

      const updatedCategory = mapSupabaseCategoryRow(
        data as Record<string, unknown>,
        nextDisplayOrder
      );

      if (previousImageUrl && previousImageUrl !== nextImageUrl) {
        const nextList = existingCategories.map((c) =>
          c.id === updatedCategory.id ? updatedCategory : c
        );
        await safelyCleanupCategoryAssetIfUnreferenced(
          previousImageUrl,
          updatedCategory.id,
          nextList
        );
      }

      return { category: updatedCategory, error: null };
    } catch (err) {
      if (newlyUploadedUrl) {
        await deletePublicStoreAsset(newlyUploadedUrl);
      }
      return {
        category: null,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al actualizar la categoría en Supabase.',
      };
    }
  }

  const updatedLocal: Category = {
    ...targetCategory,
    id: targetCategory.id, // Inmutable
    name: nextName,
    slug: nextSlug,
    description: nextDescription,
    icon_name: nextIconName,
    color_hex: nextColorHex,
    image_url: nextImageUrl,
    display_order: nextDisplayOrder,
    sort_order: nextDisplayOrder,
    is_active: nextIsActive,
    updated_at: new Date().toISOString(),
  };

  const nextLocal = existingCategories
    .map((c) => (c.id === targetCategory.id ? updatedLocal : c))
    .sort((a, b) => (a.display_order ?? a.sort_order) - (b.display_order ?? b.sort_order));

  saveLocalCategoriesBase(nextLocal);

  if (previousImageUrl && previousImageUrl !== nextImageUrl) {
    await safelyCleanupCategoryAssetIfUnreferenced(
      previousImageUrl,
      updatedLocal.id,
      nextLocal
    );
  }

  return { category: updatedLocal, error: null };
}

/**
 * Activa o desactiva una categoría (`is_active`) sin modificar su `id`, `slug`, imagen ni productos asociados.
 */
export async function toggleAdminCategoryStatus(
  categoryId: string,
  isActive: boolean
): Promise<AdminCategoryMutationResult> {
  return updateAdminCategory(categoryId, { is_active: Boolean(isActive) });
}

/**
 * Elimina una categoría de `public.categories` tras verificar que no tenga productos
 * ni solicitudes personalizadas asociadas (`ON DELETE RESTRICT`).
 * - Si existen productos o solicitudes asociadas, impide la eliminación y sugiere desactivarla (`is_active = false`).
 * - Captura cualquier error de llave foránea (`23503`) de PostgreSQL.
 * - Elimina su imagen en `public-assets/categories/` solo después de confirmar el borrado en BD.
 */
export async function deleteAdminCategory(
  categoryId: string
): Promise<DeleteAdminCategoryResult> {
  const access = await verifyAdminCategoryMutationAccess();
  if (!access.authorized) {
    return { success: false, error: access.error };
  }

  const cleanTargetId = String(categoryId || '').trim();
  if (!cleanTargetId) {
    return { success: false, error: 'El identificador de la categoría es obligatorio.' };
  }

  const existingCategories = await getAdminCategories();
  const targetCategory = existingCategories.find((c) => c.id === cleanTargetId);
  if (!targetCategory) {
    return {
      success: false,
      error: `No se encontró la categoría con ID "${cleanTargetId}".`,
    };
  }

  const usage = await getAdminCategoryUsageSummary(targetCategory.id);
  if (usage.associatedProductsCount > 0 || usage.associatedCustomRequestsCount > 0) {
    const details: string[] = [];
    if (usage.associatedProductsCount > 0) {
      details.push(`${usage.associatedProductsCount} producto(s)`);
    }
    if (usage.associatedCustomRequestsCount > 0) {
      details.push(`${usage.associatedCustomRequestsCount} solicitud(es) a medida`);
    }
    return {
      success: false,
      blockedByRelations: true,
      associatedProductsCount: usage.associatedProductsCount,
      associatedCustomRequestsCount: usage.associatedCustomRequestsCount,
      error: `No se puede eliminar la categoría "${targetCategory.name}" porque tiene ${details.join(' y ')} asociados. Desactívala (is_active = false) para ocultarla del catálogo público sin afectar los productos existentes.`,
    };
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', targetCategory.id);

      if (error) {
        const errCode = String((error as { code?: string }).code || '');
        const errMsg = String(error.message || '');
        const isForeignKeyError =
          errCode === '23503' ||
          errMsg.toLowerCase().includes('foreign key') ||
          errMsg.toLowerCase().includes('restrict') ||
          errMsg.toLowerCase().includes('violates');

        if (isForeignKeyError) {
          return {
            success: false,
            blockedByRelations: true,
            error: `No se puede eliminar la categoría "${targetCategory.name}" porque tiene registros vinculados en la base de datos (ON DELETE RESTRICT). Te recomendamos desactivarla en su lugar.`,
          };
        }

        return {
          success: false,
          error: errMsg || 'No se pudo eliminar la categoría en Supabase.',
        };
      }

      const remaining = existingCategories.filter((c) => c.id !== targetCategory.id);
      if (targetCategory.image_url) {
        await safelyCleanupCategoryAssetIfUnreferenced(
          targetCategory.image_url,
          targetCategory.id,
          remaining
        );
      }

      return {
        success: true,
        associatedProductsCount: 0,
        associatedCustomRequestsCount: 0,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Error inesperado al eliminar la categoría en Supabase.',
      };
    }
  }

  const remainingLocal = existingCategories.filter((c) => c.id !== targetCategory.id);
  saveLocalCategoriesBase(remainingLocal);

  if (targetCategory.image_url) {
    await safelyCleanupCategoryAssetIfUnreferenced(
      targetCategory.image_url,
      targetCategory.id,
      remainingLocal
    );
  }

  return {
    success: true,
    associatedProductsCount: 0,
    associatedCustomRequestsCount: 0,
    error: null,
  };
}

export async function getAdminProducts(): Promise<AdminProductWithLinks[]> {
  const categories = await getAdminCategories();
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const products = loadCatalogProductsBase();
  const linksMap = loadAdminDownloadLinksMap();

  return products.map((p) => ({
    ...p,
    category: resolveCategoryByIdOrEquivalent(p.category_id, catMap) || p.category,
    downloadLinks: linksMap[p.id] || [],
  }));
}

export async function saveAdminProduct(
  input: UpsertProductAdminInput
): Promise<{ product: AdminProductWithLinks; error: string | null }> {
  const cleanName = input.name.trim();
  const cleanSku = input.sku.trim().toUpperCase();
  const cleanSlug =
    input.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-|-$/g, '') || `producto-${Date.now()}`;

  if (!cleanName || !cleanSku || !input.category_id) {
    throw new Error('El nombre, el código SKU y la categoría son obligatorios.');
  }

  const regularPen =
    input.modalidad === 'FREE' ? 0 : Math.max(0, Number(input.price_regular_pen || 0));
  const salePen =
    input.modalidad === 'FREE' || !input.is_on_promotion || input.price_sale_pen === null
      ? null
      : Math.max(0, Number(input.price_sale_pen));

  if (salePen !== null && salePen >= regularPen && regularPen > 0) {
    throw new Error(
      'El precio promocional en Soles (S/) debe ser menor que el precio regular.'
    );
  }

  const allProducts = loadCatalogProductsBase();
  const categories = await getAdminCategories();
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const matchedCat =
    resolveCategoryByIdOrEquivalent(input.category_id, catMap) || categories[0];
  const nowIso = new Date().toISOString();

  const isEditing = Boolean(input.id && allProducts.some((p) => p.id === input.id));
  const productId = isEditing ? String(input.id) : `prod-${Date.now()}`;

  const existingProduct = allProducts.find((p) => p.id === productId);

  const versionId = `ver-${productId}-${input.current_version.replace(/[^a-zA-Z0-9]/g, '')}`;
  const newVersionEntry: ProductVersion = {
    id: versionId,
    product_id: productId,
    version_number: input.current_version.trim() || 'v1.0.0',
    changelog:
      input.changelog?.trim() ||
      `Versión ${input.current_version.trim() || 'v1.0.0'} publicada por administración.`,
    release_date: nowIso,
    is_current: true,
    created_at: nowIso,
  };

  const previousVersions = (existingProduct?.versions || []).map((v) => ({
    ...v,
    is_current: false,
  }));

  const mergedVersions = [
    newVersionEntry,
    ...previousVersions.filter((v) => v.version_number !== newVersionEntry.version_number),
  ];

  const coverUrl =
    input.cover_image_url?.trim() ||
    existingProduct?.images?.[0]?.public_url ||
    SEED_PRODUCTS[0].images?.[0]?.public_url ||
    '';

  const preservedCategoryId =
    existingProduct &&
    getEquivalentCategoryIds(existingProduct.category_id).includes(input.category_id)
      ? existingProduct.category_id
      : input.category_id || matchedCat.id;

  const savedProduct: Product = {
    id: productId,
    category_id: preservedCategoryId,
    sku: cleanSku,
    name: cleanName,
    slug: cleanSlug,
    short_description: input.short_description.trim(),
    full_description: input.full_description.trim() || input.short_description.trim(),
    features_list:
      input.features_list.filter((f) => f.trim().length > 0).length > 0
        ? input.features_list.filter((f) => f.trim().length > 0)
        : ['Licencia digital en Soles (S/)', 'Soporte y guía de uso incluidos'],
    technical_requirements: input.technical_requirements?.trim() || null,
    modalidad: input.modalidad,
    price_regular_pen: Number(regularPen.toFixed(2)),
    price_sale_pen: salePen !== null ? Number(salePen.toFixed(2)) : null,
    is_on_promotion: Boolean(input.is_on_promotion && salePen !== null),
    current_version: newVersionEntry.version_number,
    is_featured: input.is_featured,
    is_bestseller: input.is_bestseller,
    is_new: input.is_new,
    is_deal_of_the_day: input.is_deal_of_the_day,
    deal_expires_at: input.deal_expires_at || null,
    status: input.status,
    created_at: existingProduct?.created_at || nowIso,
    updated_at: nowIso,
    category: matchedCat,
    images: [
      {
        id: `img-${productId}`,
        product_id: productId,
        storage_path: `products/${cleanSlug}/cover.svg`,
        public_url: coverUrl,
        alt_text: cleanName,
        is_cover: true,
        sort_order: 1,
        created_at: nowIso,
      },
    ],
    versions: mergedVersions,
  };

  const nextProducts = isEditing
    ? allProducts.map((p) => (p.id === productId ? savedProduct : p))
    : [savedProduct, ...allProducts];

  localStorage.setItem(LOCAL_ADMIN_PRODUCTS_KEY, JSON.stringify(nextProducts));

  // Guardar enlaces privados de Google Drive / MediaFire en su almacén administrativo separado
  const linksMap = loadAdminDownloadLinksMap();
  const cleanLinks: DownloadLink[] = input.downloadLinks
    .filter((dl) => dl.access_url.trim().length > 0)
    .map((dl, idx) => ({
      id: dl.id || `dl-${productId}-${idx}-${Date.now()}`,
      product_version_id: newVersionEntry.id,
      link_type: dl.link_type,
      access_url: dl.access_url.trim(),
      instructions: dl.instructions?.trim() || null,
      is_active: dl.is_active,
      created_at: nowIso,
    }));

  linksMap[productId] = cleanLinks;
  saveAdminDownloadLinksMap(linksMap);

  return {
    product: {
      ...savedProduct,
      downloadLinks: cleanLinks,
    },
    error: null,
  };
}

/**
 * Actualiza rápidamente precios en Soles (S/), oferta relámpago y promoción de un producto.
 * REGLA (Sprint 08 Criterio 2): Modificar el precio en catálogo NO altera los importes
 * ni snapshots de los pedidos creados previamente.
 */
export async function updateProductPricingPEN(
  productId: string,
  pricing: {
    price_regular_pen: number;
    price_sale_pen: number | null;
    is_on_promotion: boolean;
    is_deal_of_the_day: boolean;
    deal_expires_at: string | null;
  }
): Promise<Product> {
  const allProducts = loadCatalogProductsBase();
  const target = allProducts.find((p) => p.id === productId);
  if (!target) {
    throw new Error('Producto no encontrado.');
  }

  const reg = target.modalidad === 'FREE' ? 0 : Math.max(0, Number(pricing.price_regular_pen));
  const sale =
    target.modalidad === 'FREE' || !pricing.is_on_promotion || pricing.price_sale_pen === null
      ? null
      : Math.max(0, Number(pricing.price_sale_pen));

  if (sale !== null && sale >= reg && reg > 0) {
    throw new Error('El precio de oferta en S/ debe ser menor al precio regular.');
  }

  const updated: Product = {
    ...target,
    price_regular_pen: Number(reg.toFixed(2)),
    price_sale_pen: sale !== null ? Number(sale.toFixed(2)) : null,
    is_on_promotion: Boolean(pricing.is_on_promotion && sale !== null),
    is_deal_of_the_day: pricing.is_deal_of_the_day,
    deal_expires_at: pricing.deal_expires_at,
    updated_at: new Date().toISOString(),
  };

  const next = allProducts.map((p) => (p.id === productId ? updated : p));
  localStorage.setItem(LOCAL_ADMIN_PRODUCTS_KEY, JSON.stringify(next));
  return updated;
}

export async function updateProductStatusAdmin(
  productId: string,
  status: ProductStatus
): Promise<void> {
  const allProducts = loadCatalogProductsBase();
  const next = allProducts.map((p) =>
    p.id === productId ? { ...p, status, updated_at: new Date().toISOString() } : p
  );
  localStorage.setItem(LOCAL_ADMIN_PRODUCTS_KEY, JSON.stringify(next));
}

// ============================================================================
// 3. GESTIÓN DE CUPONES DE DESCUENTO EN SOLES (PEN / S/)
// ============================================================================

export async function getAdminCoupons(): Promise<Coupon[]> {
  return loadCouponsBase();
}

export async function saveAdminCoupon(
  input: Omit<Coupon, 'id' | 'current_usage_count'> & { id?: string }
): Promise<Coupon> {
  const code = input.code.trim().toUpperCase();
  if (!code) {
    throw new Error('El código del cupón es obligatorio.');
  }
  if (input.discount_value <= 0) {
    throw new Error('El valor de descuento debe ser mayor a 0.');
  }
  if (input.discount_type === 'PERCENTAGE' && input.discount_value > 100) {
    throw new Error('El porcentaje de descuento no puede superar el 100%.');
  }

  const all = loadCouponsBase();
  const duplicate = all.find(
    (c) => c.code.toUpperCase() === code && c.id !== input.id
  );
  if (duplicate) {
    throw new Error(`Ya existe un cupón registrado con el código ${code}.`);
  }

  const existing = input.id ? all.find((c) => c.id === input.id) : undefined;

  const saved: Coupon = {
    id: existing?.id || `coup-${Date.now()}`,
    code,
    description: input.description?.trim() || null,
    discount_type: input.discount_type,
    discount_value: Number(input.discount_value),
    minimum_order_pen: Math.max(0, Number(input.minimum_order_pen || 0)),
    is_active: input.is_active,
    expires_at: input.expires_at || null,
    usage_limit:
      input.usage_limit !== null && input.usage_limit !== undefined && Number(input.usage_limit) > 0
        ? Number(input.usage_limit)
        : null,
    current_usage_count: existing?.current_usage_count || 0,
  };

  const next = existing
    ? all.map((c) => (c.id === saved.id ? saved : c))
    : [saved, ...all];

  localStorage.setItem(LOCAL_ADMIN_COUPONS_KEY, JSON.stringify(next));
  return saved;
}

export async function toggleAdminCouponStatus(couponId: string): Promise<Coupon[]> {
  const all = loadCouponsBase();
  const next = all.map((c) =>
    c.id === couponId ? { ...c, is_active: !c.is_active } : c
  );
  localStorage.setItem(LOCAL_ADMIN_COUPONS_KEY, JSON.stringify(next));
  return next;
}

export async function deleteAdminCoupon(couponId: string): Promise<Coupon[]> {
  const all = loadCouponsBase();
  const next = all.filter((c) => c.id !== couponId);
  localStorage.setItem(LOCAL_ADMIN_COUPONS_KEY, JSON.stringify(next));
  return next;
}

// ============================================================================
// 4. DIRECTORIO E HISTORIAL DE CLIENTES Y SOLICITUDES PERSONALIZADAS
// ============================================================================

function loadAllOrdersInternal(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((o: Order) => evaluateOrderExpiration(o))
      : [];
  } catch {
    return [];
  }
}

function loadAllPaymentsInternal(): Payment[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getAdminCustomers(): Promise<AdminCustomerRecord[]> {
  const orders = loadAllOrdersInternal();
  const accountsMap = new Map<string, AdminCustomerRecord>();

  try {
    const rawAccounts = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (rawAccounts) {
      const parsed = JSON.parse(rawAccounts) as Array<{ profile: Profile }>;
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (entry?.profile) {
            const p = entry.profile;
            accountsMap.set(p.id, {
              id: p.id,
              full_name: p.full_name,
              email: p.email,
              phone_number: p.phone_number,
              document_type: p.document_type,
              document_number: p.document_number,
              role_id: p.role_id,
              is_active: p.is_active,
              total_orders_count: 0,
              total_verified_spent_pen: 0,
              pending_balance_pen: 0,
              created_at: p.created_at,
            });
          }
        }
      }
    }
  } catch {
    // Continuar
  }

  // Cruzar con pedidos reales para calcular métricas financieras en Soles (S/)
  for (const ord of orders) {
    const existing = accountsMap.get(ord.customer_id);
    if (existing) {
      existing.total_orders_count += 1;
      existing.total_verified_spent_pen = Number(
        (existing.total_verified_spent_pen + Number(ord.total_paid_verified_pen || 0)).toFixed(2)
      );
      if (ord.status !== 'CANCELADO' && ord.status !== 'REEMBOLSADO') {
        existing.pending_balance_pen = Number(
          (existing.pending_balance_pen + Number(ord.balance_due_pen || 0)).toFixed(2)
        );
      }
    } else {
      accountsMap.set(ord.customer_id, {
        id: ord.customer_id,
        full_name: ord.buyer_name,
        email: ord.buyer_email,
        phone_number: ord.buyer_phone,
        document_type: ord.buyer_document_type,
        document_number: ord.buyer_document_number,
        role_id: 'customer',
        is_active: true,
        total_orders_count: 1,
        total_verified_spent_pen: Number(ord.total_paid_verified_pen || 0),
        pending_balance_pen:
          ord.status !== 'CANCELADO' && ord.status !== 'REEMBOLSADO'
            ? Number(ord.balance_due_pen || 0)
            : 0,
        created_at: ord.created_at,
      });
    }
  }

  return Array.from(accountsMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function toggleAdminCustomerActive(userId: string): Promise<AdminCustomerRecord[]> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Array<{ profile: Profile; [k: string]: unknown }>;
      const updated = parsed.map((entry) => {
        if (entry.profile?.id === userId && entry.profile.role_id !== 'admin') {
          return {
            ...entry,
            profile: {
              ...entry.profile,
              is_active: !entry.profile.is_active,
              updated_at: new Date().toISOString(),
            },
          };
        }
        return entry;
      });
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignorar
  }
  return getAdminCustomers();
}

const SEED_CUSTOM_REQUESTS: AdminCustomRequestExtended[] = [
  {
    id: 'req-seed-101',
    user_id: null,
    product_id: 'prod-sistema-pos-facturacion',
    category_id: 'cat-sistemas',
    requester_name: 'Constructora & Servicios Andinos SAC',
    requester_email: 'logistica@andinosperu.pe',
    requester_phone: '987654321',
    requirements_detail:
      'Necesitamos adaptar el sistema de almacén multi-sucursal para controlar obras civiles en 4 provincias con reportes valorizados en Soles.',
    estimated_budget_pen: 1200,
    quoted_price_pen: 1150,
    status: 'COTIZADA',
    admin_notes: 'Se envió propuesta formal por WhatsApp con entrega en 5 días hábiles.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: 'req-seed-102',
    user_id: null,
    product_id: null,
    category_id: 'cat-excel',
    requester_name: 'Carlos Mendoza Vargas',
    requester_email: 'cmendoza@consultoriacontable.pe',
    requester_phone: '945112233',
    requirements_detail:
      'Requiero una macro en Excel para consolidar 15 libros de planilla electrónica PLAME y generar asientos contables automáticos.',
    estimated_budget_pen: 350,
    quoted_price_pen: null,
    status: 'RECIBIDA',
    admin_notes: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

export async function getAdminCustomRequests(): Promise<AdminCustomRequestExtended[]> {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_REQUESTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CUSTOM_REQUESTS_KEY, JSON.stringify(SEED_CUSTOM_REQUESTS));
      return SEED_CUSTOM_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as AdminCustomRequestExtended[];
    }
  } catch {
    // Fallback
  }
  return SEED_CUSTOM_REQUESTS;
}

export async function updateAdminCustomRequest(
  requestId: string,
  updates: {
    status: AdminCustomRequestExtended['status'];
    quoted_price_pen?: number | null;
    admin_notes?: string | null;
  }
): Promise<AdminCustomRequestExtended[]> {
  const current = await getAdminCustomRequests();
  const next = current.map((req) =>
    req.id === requestId
      ? {
          ...req,
          status: updates.status,
          quoted_price_pen:
            updates.quoted_price_pen !== undefined ? updates.quoted_price_pen : req.quoted_price_pen,
          admin_notes:
            updates.admin_notes !== undefined ? updates.admin_notes : req.admin_notes,
          updated_at: new Date().toISOString(),
        }
      : req
  );
  localStorage.setItem(LOCAL_CUSTOM_REQUESTS_KEY, JSON.stringify(next));
  return next;
}

// ============================================================================
// 5. CONFIGURACIÓN GENERAL DE LA TIENDA (PLAZO 72H, CUENTAS S/, YAPE, PLIN, WHATSAPP)
// ============================================================================

/**
 * Obtiene un registro individual key/value desde `public.store_settings` o caché local KV
 */
export async function getStoreSettingByKey<T = unknown>(
  key: StoreSettingKey
): Promise<StoreSettingRecord<T> | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('key, value, is_public, updated_by_user_id, updated_at')
        .eq('key', key)
        .maybeSingle();

      if (!error && data && typeof data.key === 'string') {
        const record: StoreSettingRecord<T> = {
          key: data.key,
          value: data.value as T,
          is_public: typeof data.is_public === 'boolean' ? data.is_public : true,
          updated_by_user_id: data.updated_by_user_id ?? null,
          updated_at: data.updated_at || new Date().toISOString(),
        };
        upsertLocalStoreSettingKey(
          record.key,
          record.value,
          record.is_public,
          record.updated_by_user_id
        );
        return record;
      }
    } catch {
      // Continuar con respaldo local
    }
  }

  const localKV = loadLocalStoreSettingsKV();
  const cached = localKV[key];
  if (cached) {
    return cached as StoreSettingRecord<T>;
  }

  return null;
}

/**
 * Actualiza únicamente una clave específica (`key`) en `public.store_settings` (JSONB `value`)
 * sin tocar ni sobrescribir ninguna otra configuración existente.
 */
export async function saveStoreSettingKey<T = unknown>(
  key: StoreSettingKey,
  value: T,
  isPublic = true
): Promise<StoreSettingRecord<T>> {
  let updatedByUserId: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      updatedByUserId = authData?.user?.id ?? null;
    } catch {
      updatedByUserId = null;
    }
  }

  const nowIso = new Date().toISOString();
  const localRecord = upsertLocalStoreSettingKey(key, value, isPublic, updatedByUserId);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('store_settings').upsert(
        {
          key,
          value,
          is_public: isPublic,
          updated_by_user_id: updatedByUserId,
          updated_at: nowIso,
        },
        { onConflict: 'key' }
      );
    } catch {
      // Respaldo local KV ya actualizado
    }
  }

  return localRecord;
}

export async function getAdminStoreSettings(): Promise<AdminStoreSettingsExtended> {
  const base = await getCheckoutStoreSettings();
  let extra: Partial<AdminStoreSettingsExtended> = {};
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) {
      extra = JSON.parse(raw);
    }
  } catch {
    // Ignorar
  }

  const paymentMethodsConfig = normalizePaymentMethodsConfig(
    base.paymentMethodsConfig,
    DEFAULT_PAYMENT_METHODS_CONFIG
  );

  return {
    ...base,
    yapeNumber: paymentMethodsConfig.yape.phone,
    yapeHolder: paymentMethodsConfig.yape.holder,
    plinNumber: paymentMethodsConfig.plin.phone,
    plinHolder: paymentMethodsConfig.plin.holder,
    bankAccounts: mapConfigAccountsToBankAccountInfo(
      paymentMethodsConfig.bank_transfer.accounts
    ),
    paymentMethodsConfig,
    heroBannerTitle:
      extra.heroBannerTitle ||
      'Software, Plantillas Excel, Sistemas y Apps Android en Soles (S/)',
    heroBannerSubtitle:
      extra.heroBannerSubtitle ||
      'Soluciones digitales listas para operar con entrega directa de enlaces verificados por WhatsApp.',
    promoBarText:
      extra.promoBarText ||
      'Usa el cupón SMARTLAB15 para obtener 15% de descuento en compras desde S/ 50.00',
  };
}

export async function saveAdminStoreSettings(
  settings: AdminStoreSettingsExtended
): Promise<AdminStoreSettingsExtended> {
  const currentSettings = await getCheckoutStoreSettings();
  const currentPaymentConfig = normalizePaymentMethodsConfig(
    settings.paymentMethodsConfig ?? currentSettings.paymentMethodsConfig,
    DEFAULT_PAYMENT_METHODS_CONFIG
  );

  const cleanHours = Math.max(1, Math.min(720, Number(settings.orderExpirationHours || 72)));
  const cleanWhatsapp = settings.officialWhatsappPhone.trim();
  const cleanSupportEmail = settings.supportEmail.trim();
  const cleanYapeNumber = settings.yapeNumber.trim();
  const cleanYapeHolder = settings.yapeHolder.trim();
  const cleanPlinNumber = settings.plinNumber.trim();
  const cleanPlinHolder = settings.plinHolder.trim();

  const nextPaymentMethodsConfig: PaymentMethodsConfig = {
    yape: {
      enabled: currentPaymentConfig.yape.enabled,
      phone: cleanYapeNumber,
      holder: cleanYapeHolder,
      qr_url: currentPaymentConfig.yape.qr_url ?? null,
    },
    plin: {
      enabled: currentPaymentConfig.plin.enabled,
      phone: cleanPlinNumber,
      holder: cleanPlinHolder,
      qr_url: currentPaymentConfig.plin.qr_url ?? null,
    },
    bank_transfer: {
      enabled: currentPaymentConfig.bank_transfer.enabled,
      accounts: mapBankAccountInfoToConfigAccounts(settings.bankAccounts || []),
    },
  };

  const normalized: AdminStoreSettingsExtended = {
    ...settings,
    currencyCode: 'PEN',
    currencySymbol: 'S/',
    orderExpirationHours: cleanHours,
    officialWhatsappPhone: cleanWhatsapp,
    supportEmail: cleanSupportEmail,
    yapeNumber: nextPaymentMethodsConfig.yape.phone,
    yapeHolder: nextPaymentMethodsConfig.yape.holder,
    plinNumber: nextPaymentMethodsConfig.plin.phone,
    plinHolder: nextPaymentMethodsConfig.plin.holder,
    bankAccounts: mapConfigAccountsToBankAccountInfo(
      nextPaymentMethodsConfig.bank_transfer.accounts
    ),
    paymentMethodsConfig: nextPaymentMethodsConfig,
  };

  // Preservar compatibilidad con el entorno local sin afectar otras claves en public.store_settings
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(normalized));
  } catch {
    // Ignorar errores de almacenamiento local
  }

  // Persistir cada clave oficial individualmente en estructura key/value JSONB
  // modificando únicamente la clave correspondiente cuando cambia o aún no existe en KV
  const localKV = loadLocalStoreSettingsKV();

  const shouldUpdateHours =
    !localKV['order_expiration_hours'] ||
    Number(currentSettings.orderExpirationHours) !== cleanHours;
  if (shouldUpdateHours) {
    await saveStoreSettingKey('order_expiration_hours', cleanHours, true);
  }

  const shouldUpdateWhatsapp =
    !localKV['whatsapp_official_number'] ||
    currentSettings.officialWhatsappPhone !== cleanWhatsapp;
  if (shouldUpdateWhatsapp) {
    await saveStoreSettingKey('whatsapp_official_number', cleanWhatsapp, true);
  }

  const shouldUpdateEmail =
    !localKV['support_email'] || currentSettings.supportEmail !== cleanSupportEmail;
  if (shouldUpdateEmail) {
    await saveStoreSettingKey('support_email', cleanSupportEmail, true);
  }

  const shouldUpdatePayments =
    !localKV['payment_methods_config'] ||
    JSON.stringify(currentSettings.paymentMethodsConfig) !==
      JSON.stringify(nextPaymentMethodsConfig);
  if (shouldUpdatePayments) {
    await saveStoreSettingKey('payment_methods_config', nextPaymentMethodsConfig, true);
  }

  return normalized;
}

/**
 * Persiste una clave en `public.store_settings` exigiendo confirmación real en Supabase
 * antes de actualizar la caché local (utilizado para operaciones transaccionales de activos QR).
 */
export async function saveStoreSettingKeyStrict<T = unknown>(
  key: StoreSettingKey,
  value: T,
  isPublic = true
): Promise<{ record: StoreSettingRecord<T> | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return {
      record: null,
      error:
        'Supabase no está configurado. No es posible confirmar el guardado en public.store_settings.',
    };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        record: null,
        error: 'Debes iniciar sesión como administrador para actualizar store_settings.',
      };
    }

    const updatedByUserId = authData.user.id;
    const nowIso = new Date().toISOString();

    const { error: upsertError } = await supabase.from('store_settings').upsert(
      {
        key,
        value,
        is_public: isPublic,
        updated_by_user_id: updatedByUserId,
        updated_at: nowIso,
      },
      { onConflict: 'key' }
    );

    if (upsertError) {
      return {
        record: null,
        error: upsertError.message || 'No se pudo guardar la configuración en public.store_settings.',
      };
    }

    const localRecord = upsertLocalStoreSettingKey(key, value, isPublic, updatedByUserId);
    return { record: localRecord, error: null };
  } catch (err) {
    return {
      record: null,
      error:
        err instanceof Error
          ? err.message
          : 'Error inesperado al guardar en public.store_settings.',
    };
  }
}

/**
 * Sube o reemplaza el código QR de una billetera (`yape` o `plin`) en `public-assets` (`qr/yape/` o `qr/plin/`),
 * guarda la nueva URL pública en `payment_methods_config.{method}.qr_url` dentro de `public.store_settings`,
 * y elimina la imagen anterior ÚNICAMENTE después de confirmar que el guardado en `store_settings` fue exitoso.
 * Si falla el guardado en `store_settings`, conserva intacto el archivo anterior y limpia el nuevo archivo no vinculado.
 */
export async function uploadAndSavePaymentMethodQr(
  method: QrWalletMethod,
  file: File,
  currentDraftSettings?: AdminStoreSettingsExtended
): Promise<{
  settings: AdminStoreSettingsExtended | null;
  qrUrl: string | null;
  error: string | null;
}> {
  const baseSettings = currentDraftSettings || (await getAdminStoreSettings());
  const persistedSettings = await getCheckoutStoreSettings();
  const basePaymentConfig = normalizePaymentMethodsConfig(
    baseSettings.paymentMethodsConfig ?? persistedSettings.paymentMethodsConfig,
    DEFAULT_PAYMENT_METHODS_CONFIG
  );

  // Capturar la URL anterior registrada en configuración antes de reemplazar
  const previousQrUrl =
    persistedSettings.paymentMethodsConfig?.[method]?.qr_url ??
    basePaymentConfig[method].qr_url ??
    null;

  const targetFolder = method === 'yape' ? 'qr/yape' : 'qr/plin';
  const uploadResult = await uploadPublicStoreAsset(file, targetFolder);

  if (uploadResult.error || !uploadResult.publicUrl) {
    return {
      settings: null,
      qrUrl: null,
      error: uploadResult.error || `No se pudo subir la imagen QR de ${method.toUpperCase()}.`,
    };
  }

  const nextPaymentMethodsConfig: PaymentMethodsConfig = {
    ...basePaymentConfig,
    yape: {
      ...basePaymentConfig.yape,
      phone: baseSettings.yapeNumber.trim() || basePaymentConfig.yape.phone,
      holder: baseSettings.yapeHolder.trim() || basePaymentConfig.yape.holder,
      qr_url:
        method === 'yape' ? uploadResult.publicUrl : (basePaymentConfig.yape.qr_url ?? null),
    },
    plin: {
      ...basePaymentConfig.plin,
      phone: baseSettings.plinNumber.trim() || basePaymentConfig.plin.phone,
      holder: baseSettings.plinHolder.trim() || basePaymentConfig.plin.holder,
      qr_url:
        method === 'plin' ? uploadResult.publicUrl : (basePaymentConfig.plin.qr_url ?? null),
    },
    bank_transfer: {
      ...basePaymentConfig.bank_transfer,
      accounts: mapBankAccountInfoToConfigAccounts(baseSettings.bankAccounts || []),
    },
  };

  // Paso crítico: guardar nueva URL en public.store_settings ANTES de eliminar el QR anterior
  const saveResult = await saveStoreSettingKeyStrict(
    'payment_methods_config',
    nextPaymentMethodsConfig,
    true
  );

  if (saveResult.error || !saveResult.record) {
    // Si falla el guardado en store_settings, conservar el archivo anterior intacto
    // y eliminar el archivo recién subido que no pudo vincularse
    if (uploadResult.path) {
      await deletePublicStoreAsset(uploadResult.path);
    }
    return {
      settings: null,
      qrUrl: null,
      error: `No se pudo guardar la nueva URL del QR en store_settings (se conservó el QR anterior): ${saveResult.error}`,
    };
  }

  // Confirmado el guardado en store_settings: eliminar el activo anterior si existía y era distinto
  if (previousQrUrl && previousQrUrl !== uploadResult.publicUrl) {
    await deletePublicStoreAsset(previousQrUrl);
  }

  const updatedSettings: AdminStoreSettingsExtended = {
    ...baseSettings,
    yapeNumber: nextPaymentMethodsConfig.yape.phone,
    yapeHolder: nextPaymentMethodsConfig.yape.holder,
    plinNumber: nextPaymentMethodsConfig.plin.phone,
    plinHolder: nextPaymentMethodsConfig.plin.holder,
    bankAccounts: mapConfigAccountsToBankAccountInfo(
      nextPaymentMethodsConfig.bank_transfer.accounts
    ),
    paymentMethodsConfig: nextPaymentMethodsConfig,
  };

  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch {
    // Ignorar
  }

  return {
    settings: updatedSettings,
    qrUrl: uploadResult.publicUrl,
    error: null,
  };
}

/**
 * Elimina de forma segura el código QR de una billetera (`yape` o `plin`):
 * 1. Actualiza `payment_methods_config.{method}.qr_url = null` en `public.store_settings`.
 * 2. Solo tras confirmar el guardado en `store_settings`, elimina el archivo físico de `public-assets`.
 */
export async function removePaymentMethodQr(
  method: QrWalletMethod,
  currentDraftSettings?: AdminStoreSettingsExtended
): Promise<{
  settings: AdminStoreSettingsExtended | null;
  error: string | null;
}> {
  const baseSettings = currentDraftSettings || (await getAdminStoreSettings());
  const persistedSettings = await getCheckoutStoreSettings();
  const basePaymentConfig = normalizePaymentMethodsConfig(
    baseSettings.paymentMethodsConfig ?? persistedSettings.paymentMethodsConfig,
    DEFAULT_PAYMENT_METHODS_CONFIG
  );

  const previousQrUrl =
    persistedSettings.paymentMethodsConfig?.[method]?.qr_url ??
    basePaymentConfig[method].qr_url ??
    null;

  const nextPaymentMethodsConfig: PaymentMethodsConfig = {
    ...basePaymentConfig,
    yape: {
      ...basePaymentConfig.yape,
      phone: baseSettings.yapeNumber.trim() || basePaymentConfig.yape.phone,
      holder: baseSettings.yapeHolder.trim() || basePaymentConfig.yape.holder,
      qr_url: method === 'yape' ? null : (basePaymentConfig.yape.qr_url ?? null),
    },
    plin: {
      ...basePaymentConfig.plin,
      phone: baseSettings.plinNumber.trim() || basePaymentConfig.plin.phone,
      holder: baseSettings.plinHolder.trim() || basePaymentConfig.plin.holder,
      qr_url: method === 'plin' ? null : (basePaymentConfig.plin.qr_url ?? null),
    },
    bank_transfer: {
      ...basePaymentConfig.bank_transfer,
      accounts: mapBankAccountInfoToConfigAccounts(baseSettings.bankAccounts || []),
    },
  };

  const saveResult = await saveStoreSettingKeyStrict(
    'payment_methods_config',
    nextPaymentMethodsConfig,
    true
  );

  if (saveResult.error || !saveResult.record) {
    return {
      settings: null,
      error: `No se pudo actualizar store_settings al eliminar el QR (se conservó el archivo): ${saveResult.error}`,
    };
  }

  if (previousQrUrl) {
    await deletePublicStoreAsset(previousQrUrl);
  }

  const updatedSettings: AdminStoreSettingsExtended = {
    ...baseSettings,
    yapeNumber: nextPaymentMethodsConfig.yape.phone,
    yapeHolder: nextPaymentMethodsConfig.yape.holder,
    plinNumber: nextPaymentMethodsConfig.plin.phone,
    plinHolder: nextPaymentMethodsConfig.plin.holder,
    bankAccounts: mapConfigAccountsToBankAccountInfo(
      nextPaymentMethodsConfig.bank_transfer.accounts
    ),
    paymentMethodsConfig: nextPaymentMethodsConfig,
  };

  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch {
    // Ignorar
  }

  return {
    settings: updatedSettings,
    error: null,
  };
}

// ============================================================================
// 6. MÉTRICAS DEL DASHBOARD COMERCIAL Y OPERATIVO
// ============================================================================

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  ensureDemoOrdersAndPaymentsSeeded();

  const [products, coupons, customers, customRequests] = await Promise.all([
    getAdminProducts(),
    getAdminCoupons(),
    getAdminCustomers(),
    getAdminCustomRequests(),
  ]);

  const orders = loadAllOrdersInternal();
  const payments = loadAllPaymentsInternal();

  const totalVerifiedRevenuePen = Number(
    orders
      .reduce((acc, ord) => acc + Number(ord.total_paid_verified_pen || 0), 0)
      .toFixed(2)
  );

  const pendingReceiptsCount =
    payments.filter((p) => p.verification_status === 'EN_REVISION').length ||
    orders.filter((o) => o.status === 'PAGO_EN_REVISION').length;

  let readyForDeliveryCount = 0;
  for (const ord of orders) {
    if (ord.status === 'CANCELADO' || ord.status === 'REEMBOLSADO') continue;
    for (const item of ord.items || []) {
      if (item.is_fully_paid && item.delivery_status === 'LISTO_ENTREGA') {
        readyForDeliveryCount += 1;
      }
    }
  }

  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'PENDIENTE_PAGO' || o.status === 'PAGO_PARCIAL'
  ).length;

  const expiredOrdersCount = orders.filter((o) => o.status === 'VENCIDO').length;

  const customRequestsPendingCount = customRequests.filter(
    (r) => r.status === 'RECIBIDA' || r.status === 'EN_EVALUACION'
  ).length;

  return {
    totalVerifiedRevenuePen,
    pendingReceiptsCount,
    readyForDeliveryCount,
    pendingOrdersCount,
    expiredOrdersCount,
    customRequestsPendingCount,
    activeProductsCount: products.filter((p) => p.status === 'ACTIVO').length,
    activeCouponsCount: coupons.filter((c) => c.is_active).length,
    totalCustomersCount: customers.length,
    recentOrders: orders.slice(0, 6),
    recentCustomRequests: customRequests.slice(0, 5),
  };
}
