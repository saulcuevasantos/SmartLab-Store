import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  Category,
  CategorySlug,
  Product,
  ProductImage,
  ProductVersion,
  ProductModalidad,
  CatalogFilters,
  CustomRequestPayload,
  CustomRequestRecord,
} from '../types/catalog.types';
import { resolveCategoryIconColorHex } from '../components/common/CategoryVisual/CategoryVisual';

const LOCAL_CUSTOM_REQUESTS_KEY = 'smartlab_custom_requests_v1';

/**
 * Genera una portada SVG 1:1 nítida de estilo Techoze-04 para productos digitales
 * evitando imágenes rotas o deformadas en cualquier resolución.
 */
function buildProductCoverSvg(params: {
  badge: string;
  categoryLabel: string;
  titleShort: string;
  accentHex: string;
  secondaryHex: string;
  sku: string;
  version: string;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="55%" stop-color="#1E293B" />
        <stop offset="100%" stop-color="${params.accentHex}" />
      </linearGradient>
      <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1E293B" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#0F172A" stop-opacity="0.98" />
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bg)" />
    <circle cx="510" cy="95" r="140" fill="${params.accentHex}" opacity="0.16" />
    <circle cx="80" cy="520" r="170" fill="${params.secondaryHex}" opacity="0.14" />
    <!-- Marco de interfaz digital -->
    <rect x="48" y="56" width="504" height="488" rx="24" fill="url(#card)" stroke="#334155" stroke-width="2" />
    <!-- Barra superior tipo ventana SaaS -->
    <rect x="48" y="56" width="504" height="52" rx="24" fill="#0F172A" />
    <circle cx="82" cy="82" r="7" fill="#EF4444" />
    <circle cx="104" cy="82" r="7" fill="#F59E0B" />
    <circle cx="126" cy="82" r="7" fill="#10B981" />
    <text x="518" y="87" font-family="Poppins, sans-serif" font-size="13" font-weight="600" fill="#94A3B8" text-anchor="end">${params.sku} • ${params.version}</text>

    <!-- Etiqueta de categoría -->
    <rect x="84" y="138" width="230" height="32" rx="8" fill="${params.accentHex}" opacity="0.2" />
    <text x="100" y="159" font-family="Poppins, sans-serif" font-size="13" font-weight="700" fill="#60A5FA">${params.categoryLabel.toUpperCase()}</text>

    <!-- Ilustración abstracta de dashboard / hoja de cálculo -->
    <rect x="84" y="192" width="432" height="175" rx="14" fill="#0F172A" stroke="#1E293B" stroke-width="2" />
    <rect x="106" y="214" width="120" height="56" rx="8" fill="${params.accentHex}" opacity="0.25" />
    <rect x="118" y="228" width="64" height="10" rx="5" fill="#60A5FA" />
    <rect x="118" y="246" width="88" height="12" rx="6" fill="#F8FAFC" />

    <rect x="240" y="214" width="120" height="56" rx="8" fill="#1E293B" />
    <rect x="252" y="228" width="58" height="10" rx="5" fill="#94A3B8" />
    <rect x="252" y="246" width="84" height="12" rx="6" fill="#10B981" />

    <rect x="374" y="214" width="120" height="56" rx="8" fill="#1E293B" />
    <rect x="386" y="228" width="58" height="10" rx="5" fill="#94A3B8" />
    <rect x="386" y="246" width="76" height="12" rx="6" fill="#F59E0B" />

    <!-- Barras de gráfico -->
    <rect x="106" y="290" width="388" height="12" rx="6" fill="#1E293B" />
    <rect x="106" y="290" width="290" height="12" rx="6" fill="${params.accentHex}" />
    <rect x="106" y="314" width="388" height="12" rx="6" fill="#1E293B" />
    <rect x="106" y="314" width="235" height="12" rx="6" fill="#10B981" />
    <rect x="106" y="338" width="388" height="12" rx="6" fill="#1E293B" />
    <rect x="106" y="338" width="330" height="12" rx="6" fill="${params.secondaryHex}" />

    <!-- Nombre corto del producto -->
    <text x="84" y="418" font-family="Poppins, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF">${params.titleShort}</text>
    <text x="84" y="448" font-family="Poppins, sans-serif" font-size="14" font-weight="500" fill="#94A3B8">SmartLab Store • Solución Digital Lista para Usar</text>

    <!-- Sello inferior -->
    <rect x="84" y="476" width="150" height="36" rx="8" fill="${params.secondaryHex}" />
    <text x="159" y="499" font-family="Poppins, sans-serif" font-size="13" font-weight="700" fill="#FFFFFF" text-anchor="middle">${params.badge}</text>
    <text x="516" y="499" font-family="Poppins, sans-serif" font-size="14" font-weight="700" fill="#E2E8F0" text-anchor="end">PEN (S/)</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const LOCAL_ADMIN_CATEGORIES_KEY = 'smartlab_admin_categories_v1';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-excel',
    name: 'Excel',
    slug: 'excel',
    description:
      'Plantillas profesionales, macros VBA, dashboards gerenciales y controles financieros en Microsoft Excel.',
    icon_name: 'FileSpreadsheet',
    color_hex: '#22C55E',
    image_url: null,
    display_order: 1,
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cat-google-sheets',
    name: 'Google Sheets',
    slug: 'google_sheets',
    description:
      'Hojas de cálculo colaborativas en la nube con automatizaciones en Google Apps Script.',
    icon_name: 'Table',
    color_hex: '#059669',
    image_url: null,
    display_order: 2,
    sort_order: 2,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cat-sistemas',
    name: 'Sistemas',
    slug: 'sistemas',
    description:
      'Sistemas web y de escritorio listos para operar puntos de venta, almacenes, cobranzas y facturación.',
    icon_name: 'Monitor',
    color_hex: '#3B82F6',
    image_url: null,
    display_order: 3,
    sort_order: 3,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cat-android-apps',
    name: 'Aplicaciones Android',
    slug: 'android_apps',
    description:
      'Aplicaciones móviles y utilidades APK para toma de inventarios, pedidos en campo y control de entregas.',
    icon_name: 'Smartphone',
    color_hex: '#9333EA',
    image_url: null,
    display_order: 4,
    sort_order: 4,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cat-automatizaciones',
    name: 'Automatizaciones',
    slug: 'automatizaciones',
    description:
      'Flujos automatizados, conectores API, bots operativos y reportes automáticos para empresas.',
    icon_name: 'Cpu',
    color_hex: '#F59E0B',
    image_url: null,
    display_order: 5,
    sort_order: 5,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'cat-recursos-digitales',
    name: 'Recursos Digitales',
    slug: 'recursos_digitales',
    description:
      'Packs de iconos, guías técnicas, manuales operativos y kits de productividad digital.',
    icon_name: 'FolderKanban',
    color_hex: '#F97316',
    image_url: null,
    display_order: 6,
    sort_order: 6,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

/**
 * Tabla determinista de correspondencia verificada entre los registros de
 * `supabase/migrations/001_schema_tables.sql` y `SEED_CATEGORIES` / `OFFICIAL_CATEGORIES`.
 * - No modifica IDs existentes en BD ni `category_id` en productos.
 * - Conserva un único `canonicalSlug` por cada categoría base y resuelve de forma
 *   explícita sus variantes históricas comprobadas (`google-sheets` <-> `google_sheets`,
 *   `aplicaciones-android` <-> `android_apps`, `recursos-digitales` <-> `recursos_digitales`,
 *   `excel` <-> `cat-excel`, etc.).
 */
export interface OfficialCategoryCompatibilityRule {
  sqlId: string;
  seedId: string;
  canonicalSlug: CategorySlug;
  sqlSlug: string;
}

export const OFFICIAL_CATEGORY_COMPATIBILITY_RULES: readonly OfficialCategoryCompatibilityRule[] = [
  {
    sqlId: 'excel',
    seedId: 'cat-excel',
    canonicalSlug: 'excel',
    sqlSlug: 'excel',
  },
  {
    sqlId: 'google_sheets',
    seedId: 'cat-google-sheets',
    canonicalSlug: 'google_sheets',
    sqlSlug: 'google-sheets',
  },
  {
    sqlId: 'sistemas',
    seedId: 'cat-sistemas',
    canonicalSlug: 'sistemas',
    sqlSlug: 'sistemas',
  },
  {
    sqlId: 'android_apps',
    seedId: 'cat-android-apps',
    canonicalSlug: 'android_apps',
    sqlSlug: 'aplicaciones-android',
  },
  {
    sqlId: 'automatizaciones',
    seedId: 'cat-automatizaciones',
    canonicalSlug: 'automatizaciones',
    sqlSlug: 'automatizaciones',
  },
  {
    sqlId: 'recursos_digitales',
    seedId: 'cat-recursos-digitales',
    canonicalSlug: 'recursos_digitales',
    sqlSlug: 'recursos-digitales',
  },
] as const;

/**
 * Resuelve el slug canónico de una categoría a partir de un slug de URL o de base de datos.
 * Para las 6 categorías iniciales verificadas unifica la variante SQL y estática en su slug canónico;
 * para cualquier categoría nueva devuelve el slug normalizado en minúsculas sin equivalencias ambiguas.
 */
export function resolveCanonicalCategorySlug(rawSlug: string | null | undefined): CategorySlug {
  const clean = String(rawSlug || '')
    .trim()
    .toLowerCase();
  if (!clean) return '' as CategorySlug;

  const matchedRule = OFFICIAL_CATEGORY_COMPATIBILITY_RULES.find(
    (rule) => rule.canonicalSlug === clean || rule.sqlSlug === clean
  );
  if (matchedRule) {
    return matchedRule.canonicalSlug;
  }

  return clean as CategorySlug;
}

/**
 * Comprueba si dos slugs de categoría representan la misma categoría
 * (ej. `google_sheets` y `google-sheets`, o `android_apps` y `aplicaciones-android`).
 */
export function areCategorySlugsEquivalent(
  slugA: string | null | undefined,
  slugB: string | null | undefined
): boolean {
  const canonA = resolveCanonicalCategorySlug(slugA);
  const canonB = resolveCanonicalCategorySlug(slugB);
  if (!canonA || !canonB) return false;
  return canonA === canonB;
}

/**
 * Devuelve la lista de IDs equivalentes comprobados para un `category_id` dado
 * sin alterar los IDs almacenados en la base de datos ni en los productos.
 * Para las 6 categorías base retorna `[sqlId, seedId]`; para categorías nuevas retorna `[cleanId]`.
 */
export function getEquivalentCategoryIds(categoryId: string | null | undefined): string[] {
  const cleanId = String(categoryId || '').trim();
  if (!cleanId) return [];

  const matchedRule = OFFICIAL_CATEGORY_COMPATIBILITY_RULES.find(
    (rule) => rule.sqlId === cleanId || rule.seedId === cleanId
  );
  if (matchedRule) {
    return matchedRule.sqlId === cleanId
      ? [matchedRule.sqlId, matchedRule.seedId]
      : [matchedRule.seedId, matchedRule.sqlId];
  }

  return [cleanId];
}

/**
 * Busca una categoría en un `Map<id, Category>` priorizando coincidencia exacta de `id`
 * y recurriendo únicamente al par verificado (`sqlId` <-> `seedId`) si aplica.
 */
export function resolveCategoryByIdOrEquivalent(
  categoryId: string | null | undefined,
  categoriesById: Map<string, Category>
): Category | undefined {
  const candidates = getEquivalentCategoryIds(categoryId);
  for (const candidateId of candidates) {
    const found = categoriesById.get(candidateId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Mapea una fila de `public.categories` de Supabase al modelo `Category`,
 * preservando `id` y `slug` reales, sincronizando `display_order` y `sort_order`,
 * y resolviendo `color_hex` en formato HEX normalizado.
 */
export function mapSupabaseCategoryRow(
  row: Record<string, unknown>,
  fallbackIndex = 0
): Category {
  const orderValue = Number(row.display_order ?? row.sort_order ?? fallbackIndex + 1);
  const resolvedOrder = Number.isFinite(orderValue) ? orderValue : fallbackIndex + 1;
  const resolvedId = String(row.id);
  const resolvedSlug = String(row.slug || '').trim() as CategorySlug;
  const rawColorHex =
    row.color_hex !== null && row.color_hex !== undefined
      ? String(row.color_hex).trim()
      : null;

  return {
    id: resolvedId,
    name: String(row.name || '').trim(),
    slug: resolvedSlug,
    description:
      row.description !== null && row.description !== undefined && String(row.description).trim() !== ''
        ? String(row.description)
        : null,
    icon_name:
      row.icon_name !== null && row.icon_name !== undefined && String(row.icon_name).trim() !== ''
        ? String(row.icon_name)
        : null,
    color_hex: resolveCategoryIconColorHex({
      id: resolvedId,
      slug: resolvedSlug,
      color_hex: rawColorHex,
    }),
    image_url:
      row.image_url !== null && row.image_url !== undefined && String(row.image_url).trim() !== ''
        ? String(row.image_url)
        : null,
    display_order: resolvedOrder,
    sort_order: resolvedOrder,
    is_active: Boolean(row.is_active ?? true),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

export function loadLocalCategoriesBase(): Category[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (parsed as Record<string, unknown>[])
          .map((item, idx) => mapSupabaseCategoryRow(item, idx))
          .sort((a, b) => (a.display_order ?? a.sort_order) - (b.display_order ?? b.sort_order));
      }
    }
  } catch {
    // Fallback a SEED_CATEGORIES
  }
  return [...SEED_CATEGORIES].sort(
    (a, b) => (a.display_order ?? a.sort_order) - (b.display_order ?? b.sort_order)
  );
}

// Fecha futura para el contador del Deal of the Day (siempre activa en demostración)
const dealExpirationIso = new Date(Date.now() + 1000 * 60 * 60 * 38).toISOString();

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-excel-kardex-pro',
    category_id: 'cat-excel',
    sku: 'SL-XLS-001',
    name: 'Plantilla Excel de Control de Inventario y Kardex Valorizado SUNAT',
    slug: 'plantilla-excel-inventario-kardex-valorizado',
    short_description:
      'Controla entradas, salidas, stock mínimo, lotes y costo promedio ponderado con dashboard gerencial automatizado.',
    full_description:
      'Solución integral en Microsoft Excel diseñada para MYPES y comercios en Perú. Permite gestionar múltiples almacenes, alertas automáticas de reposición, valorización por método Promedio Ponderado y PEPS, e impresión de reportes mensuales listos para contabilidad.',
    features_list: [
      'Cálculo automático de Kardex Valorizado (Promedio Ponderado)',
      'Semáforo de stock crítico y alerta de reposición inmediata',
      'Dashboard interactivo con rotación de inventario por categoría',
      'Registro de proveedores, clientes y guías de remisión internas',
      'Sin bloqueos de filas: soporta más de 50,000 movimientos anuales',
    ],
    technical_requirements:
      'Microsoft Excel 2019, 2021 o Microsoft 365 en Windows o macOS. No requiere instalar complementos externos.',
    modalidad: 'PRO',
    price_regular_pen: 89.0,
    price_sale_pen: 65.0,
    is_on_promotion: true,
    current_version: 'v2.4',
    is_featured: true,
    is_bestseller: true,
    is_new: false,
    is_deal_of_the_day: true,
    deal_expires_at: dealExpirationIso,
    status: 'ACTIVO',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-20T10:00:00Z',
    category: SEED_CATEGORIES[0],
    images: [
      {
        id: 'img-xls-001-1',
        product_id: 'prod-excel-kardex-pro',
        storage_path: 'products/sl-xls-001-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'PRO • OFERTA',
          categoryLabel: 'Microsoft Excel',
          titleShort: 'Kardex e Inventario PRO',
          accentHex: '#0A68FF',
          secondaryHex: '#10B981',
          sku: 'SL-XLS-001',
          version: 'v2.4',
        }),
        alt_text: 'Portada Plantilla Excel de Control de Inventario y Kardex Valorizado',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-02-01T10:00:00Z',
      },
      {
        id: 'img-xls-001-2',
        product_id: 'prod-excel-kardex-pro',
        storage_path: 'products/sl-xls-001-dash.svg',
        public_url: buildProductCoverSvg({
          badge: 'DASHBOARD KPI',
          categoryLabel: 'Vista de Reportes',
          titleShort: 'Valorización PEPS / Promedio',
          accentHex: '#10B981',
          secondaryHex: '#0A68FF',
          sku: 'SL-XLS-001',
          version: 'v2.4',
        }),
        alt_text: 'Vista secundaria del Dashboard de Kardex Valorizado',
        is_cover: false,
        sort_order: 2,
        created_at: '2026-02-01T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-xls-001-v24',
        product_id: 'prod-excel-kardex-pro',
        version_number: 'v2.4',
        changelog:
          'Nuevo panel de rotación ABC, filtro rápido por almacén y exportación directa a PDF en un clic.',
        release_date: '2026-02-20T10:00:00Z',
        is_current: true,
        created_at: '2026-02-20T10:00:00Z',
      },
      {
        id: 'ver-xls-001-v20',
        product_id: 'prod-excel-kardex-pro',
        version_number: 'v2.0',
        changelog: 'Soporte multimoneda PEN (S/) y alertas de vencimiento de lotes.',
        release_date: '2026-01-10T10:00:00Z',
        is_current: false,
        created_at: '2026-01-10T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-sistemas-pos-mype',
    category_id: 'cat-sistemas',
    sku: 'SL-SYS-002',
    name: 'Sistema Web POS Punto de Venta, Caja Chica y Control de Almacén',
    slug: 'sistema-web-pos-punto-venta-almacen',
    short_description:
      'Sistema multiusuario con código fuente completo para ventas rápidas, arqueo de caja en Soles, tickets térmicos y reportes.',
    full_description:
      'Sistema Web POS optimizado para bodegas, ferreterías, minimarkets y tiendas especializadas. Incluye gestión de cajeros, apertura y cierre de caja con cuadre de Yape, Plin, efectivo y tarjetas, lector de código de barras e impresión en ticketera de 80mm y 58mm.',
    features_list: [
      'Módulo de Punto de Venta ultrarrápido compatible con lector de barras',
      'Arqueo de caja desglosado por Efectivo, Yape, Plin y Transferencias',
      'Emisión de notas de venta, proformas y tickets térmicos 80mm',
      'Control de usuarios por roles (Administrador, Cajero, Almacenero)',
      'Incluye manual paso a paso de despliegue local o en servidor cloud',
    ],
    technical_requirements:
      'PHP 8.2+ / Node.js o servidor local XAMPP/Laragon, MySQL/PostgreSQL y navegador web moderno.',
    modalidad: 'PRO',
    price_regular_pen: 240.0,
    price_sale_pen: 180.0,
    is_on_promotion: true,
    current_version: 'v3.1',
    is_featured: true,
    is_bestseller: true,
    is_new: true,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-02-05T10:00:00Z',
    updated_at: '2026-02-22T10:00:00Z',
    category: SEED_CATEGORIES[2],
    images: [
      {
        id: 'img-sys-002-1',
        product_id: 'prod-sistemas-pos-mype',
        storage_path: 'products/sl-sys-002-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'SISTEMA PRO',
          categoryLabel: 'Sistemas Web POS',
          titleShort: 'Sistema POS y Almacén v3.1',
          accentHex: '#6366F1',
          secondaryHex: '#FF6B00',
          sku: 'SL-SYS-002',
          version: 'v3.1',
        }),
        alt_text: 'Portada Sistema Web POS Punto de Venta y Almacén',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-02-05T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-sys-002-v31',
        product_id: 'prod-sistemas-pos-mype',
        version_number: 'v3.1',
        changelog:
          'Integración de conciliación separada para billeteras digitales Yape y Plin en cierre de turno.',
        release_date: '2026-02-22T10:00:00Z',
        is_current: true,
        created_at: '2026-02-22T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-sheets-crm-whatsapp',
    category_id: 'cat-google-sheets',
    sku: 'SL-GSH-003',
    name: 'CRM Comercial en Google Sheets con Seguimiento de Cotizaciones y WhatsApp',
    slug: 'crm-comercial-google-sheets-cotizaciones-whatsapp',
    short_description:
      'Gestiona prospectos, embudo de ventas, recordatorios de seguimiento y generación de mensajes de WhatsApp en equipo.',
    full_description:
      'Convierte Google Sheets en un CRM colaborativo para tu equipo de ventas. Registra leads desde formularios, visualiza el embudo comercial por etapas, calcula comisiones en Soles (S/) y abre conversaciones de WhatsApp personalizadas con un clic.',
    features_list: [
      'Pipeline visual de oportunidades comerciales y tasa de cierre',
      'Generador dinámico de enlaces de seguimiento para WhatsApp',
      'Trabajo colaborativo simultáneo en la nube sin costo de licencias',
      'Reporte automático de ventas por asesor comercial y origen de lead',
    ],
    technical_requirements:
      'Cuenta gratuita de Google (Gmail) o Google Workspace. Funciona en navegador y app móvil.',
    modalidad: 'PRO',
    price_regular_pen: 75.0,
    price_sale_pen: 55.0,
    is_on_promotion: true,
    current_version: 'v1.8',
    is_featured: true,
    is_bestseller: true,
    is_new: false,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-02-08T10:00:00Z',
    updated_at: '2026-02-18T10:00:00Z',
    category: SEED_CATEGORIES[1],
    images: [
      {
        id: 'img-gsh-003-1',
        product_id: 'prod-sheets-crm-whatsapp',
        storage_path: 'products/sl-gsh-003-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'PRO • CLOUD',
          categoryLabel: 'Google Sheets',
          titleShort: 'CRM Comercial + WhatsApp',
          accentHex: '#10B981',
          secondaryHex: '#0A68FF',
          sku: 'SL-GSH-003',
          version: 'v1.8',
        }),
        alt_text: 'CRM Comercial en Google Sheets con Seguimiento de WhatsApp',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-02-08T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-gsh-003-v18',
        product_id: 'prod-sheets-crm-whatsapp',
        version_number: 'v1.8',
        changelog: 'Automatización de alertas de clientes sin contacto por más de 48 horas.',
        release_date: '2026-02-18T10:00:00Z',
        is_current: true,
        created_at: '2026-02-18T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-android-inventario-scanner',
    category_id: 'cat-android-apps',
    sku: 'SL-APK-004',
    name: 'App Android de Toma de Inventario Físico con Lector de Barras y Exportación Excel',
    slug: 'app-android-toma-inventario-lector-barras',
    short_description:
      'Escanea códigos de barras y QR con la cámara del celular Android sin internet y exporta el conteo directo a Excel o CSV.',
    full_description:
      'Aplicación Android (APK instalable) creada para agilizar el conteo físico en almacenes, tiendas y farmacias. Permite cargar tu catálogo maestro en CSV/Excel, escanear productos con la cámara o colector Bluetooth, detectar diferencias de stock al instante y compartir el reporte por WhatsApp o correo.',
    features_list: [
      'Funcionamiento 100 % offline en almacenes sin cobertura Wi-Fi',
      'Escaneo continuo de códigos EAN-13, Code128 y QR con cámara',
      'Comparación inmediata entre stock teórico y stock físico contado',
      'Exportación directa en formato .XLSX y .CSV lista para tu Kardex',
    ],
    technical_requirements: 'Dispositivo móvil o tablet con Android 8.0 o superior y cámara trasera.',
    modalidad: 'PRO',
    price_regular_pen: 120.0,
    price_sale_pen: 95.0,
    is_on_promotion: true,
    current_version: 'v2.2',
    is_featured: true,
    is_bestseller: false,
    is_new: true,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-24T10:00:00Z',
    category: SEED_CATEGORIES[3],
    images: [
      {
        id: 'img-apk-004-1',
        product_id: 'prod-android-inventario-scanner',
        storage_path: 'products/sl-apk-004-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'APP ANDROID',
          categoryLabel: 'Aplicaciones Android',
          titleShort: 'Escáner de Inventario APK',
          accentHex: '#0A68FF',
          secondaryHex: '#6366F1',
          sku: 'SL-APK-004',
          version: 'v2.2',
        }),
        alt_text: 'App Android de Toma de Inventario Físico con Lector de Barras',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-02-10T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-apk-004-v22',
        product_id: 'prod-android-inventario-scanner',
        version_number: 'v2.2',
        changelog: 'Soporte para lectores láser Bluetooth HID y modo oscuro de ahorro de batería.',
        release_date: '2026-02-24T10:00:00Z',
        is_current: true,
        created_at: '2026-02-24T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-auto-cobranzas-sheets',
    category_id: 'cat-automatizaciones',
    sku: 'SL-AUT-005',
    name: 'Pack de Automatización de Alertas de Cobranza y Vencimientos con Apps Script',
    slug: 'automatizacion-alertas-cobranza-vencimientos-apps-script',
    short_description:
      'Automatiza el envío de recordatorios preventivos de pago por correo y enlaces preparados de WhatsApp según fecha de vencimiento.',
    full_description:
      'Flujo automatizado con Google Apps Script listo para implementar. Evalúa diariamente las cuentas por cobrar de tu negocio, clasifica clientes próximos a vencer o en mora, envía avisos por correo con estado de cuenta en PDF y genera la bandeja diaria de mensajes de WhatsApp.',
    features_list: [
      'Ejecución diaria programada mediante triggers automáticos',
      'Generación automática de estado de cuenta en PDF con montos en S/',
      'Clasificación de cartera vigente, por vencer y vencida',
      'Código fuente documentado y video guía de configuración en 10 minutos',
    ],
    technical_requirements:
      'Cuenta de Google Workspace o Gmail estándar con permisos de ejecución de Google Apps Script.',
    modalidad: 'PRO',
    price_regular_pen: 110.0,
    price_sale_pen: null,
    is_on_promotion: false,
    current_version: 'v1.5',
    is_featured: false,
    is_bestseller: false,
    is_new: true,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-21T10:00:00Z',
    category: SEED_CATEGORIES[4],
    images: [
      {
        id: 'img-aut-005-1',
        product_id: 'prod-auto-cobranzas-sheets',
        storage_path: 'products/sl-aut-005-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'AUTOMATIZACIÓN',
          categoryLabel: 'Automatizaciones',
          titleShort: 'Bot de Cobranzas y Alertas',
          accentHex: '#F59E0B',
          secondaryHex: '#0A68FF',
          sku: 'SL-AUT-005',
          version: 'v1.5',
        }),
        alt_text: 'Pack de Automatización de Alertas de Cobranza y Vencimientos',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-02-12T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-aut-005-v15',
        product_id: 'prod-auto-cobranzas-sheets',
        version_number: 'v1.5',
        changelog: 'Plantillas HTML responsivas para avisos de vencimiento y resumen en Soles.',
        release_date: '2026-02-21T10:00:00Z',
        is_current: true,
        created_at: '2026-02-21T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-free-flujo-caja',
    category_id: 'cat-excel',
    sku: 'SL-FREE-006',
    name: 'Calculadora Gratuita de Flujo de Caja Mensual y Punto de Equilibrio en Soles',
    slug: 'calculadora-gratuita-flujo-caja-punto-equilibrio',
    short_description:
      'Recurso 100 % gratuito para proyectar ingresos, costos fijos, costos variables y calcular el punto de equilibrio de tu negocio.',
    full_description:
      'Plantilla gratuita desarrollada por SmartLab Store para emprendedores peruanos. Permite registrar tus gastos operativos mensuales, calcular el margen de contribución por producto y conocer exactamente cuánto necesitas vender en Soles (S/) para cubrir tus costos y generar utilidad.',
    features_list: [
      'Cálculo inmediato de punto de equilibrio en unidades y en Soles (S/)',
      'Flujo de caja proyectado a 12 meses con gráfico de liquidez',
      '100 % desbloqueada y libre de contraseñas',
      'Descarga gratuita verificada para clientes registrados en SmartLab',
    ],
    technical_requirements: 'Microsoft Excel 2016 o superior / compatible con LibreOffice y Google Sheets.',
    modalidad: 'FREE',
    price_regular_pen: 0.0,
    price_sale_pen: null,
    is_on_promotion: false,
    current_version: 'v1.3',
    is_featured: true,
    is_bestseller: true,
    is_new: false,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-01-25T10:00:00Z',
    updated_at: '2026-02-15T10:00:00Z',
    category: SEED_CATEGORIES[0],
    images: [
      {
        id: 'img-free-006-1',
        product_id: 'prod-free-flujo-caja',
        storage_path: 'products/sl-free-006-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'FREE • S/ 0.00',
          categoryLabel: 'Recurso Gratuito Excel',
          titleShort: 'Flujo de Caja y Equilibrio',
          accentHex: '#10B981',
          secondaryHex: '#0A68FF',
          sku: 'SL-FREE-006',
          version: 'v1.3',
        }),
        alt_text: 'Calculadora Gratuita de Flujo de Caja y Punto de Equilibrio',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-01-25T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-free-006-v13',
        product_id: 'prod-free-flujo-caja',
        version_number: 'v1.3',
        changelog: 'Incluye simulador de descuentos comerciales y margen neto.',
        release_date: '2026-02-15T10:00:00Z',
        is_current: true,
        created_at: '2026-02-15T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-free-kit-ui-dashboards',
    category_id: 'cat-recursos-digitales',
    sku: 'SL-FREE-007',
    name: 'Kit Gratuito de Iconos SVG y Paletas de Color para Dashboards en Excel y Power BI',
    slug: 'kit-gratuito-iconos-svg-paletas-dashboards',
    short_description:
      'Colección curada de más de 120 iconos vectoriales KPI, fondos estructurados y guía de diseño ejecutivo para reportes.',
    full_description:
      'Mejora la presentación visual de tus reportes gerenciales en Excel, Google Sheets o Power BI. Este pack gratuito incluye iconos optimizados de finanzas, logística, ventas y recursos humanos, junto con códigos hexadecimales corporativos listos para copiar.',
    features_list: [
      '120 iconos SVG ligeros organizados por área empresarial',
      'Guía rápida de jerarquía visual y tipografía para dashboards',
      'Plantillas de fondos 16:9 en alta resolución',
    ],
    technical_requirements: 'Archivos en formato SVG, PNG transparente y guía en PDF.',
    modalidad: 'FREE',
    price_regular_pen: 0.0,
    price_sale_pen: null,
    is_on_promotion: false,
    current_version: 'v1.1',
    is_featured: false,
    is_bestseller: false,
    is_new: true,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-14T10:00:00Z',
    category: SEED_CATEGORIES[5],
    images: [
      {
        id: 'img-free-007-1',
        product_id: 'prod-free-kit-ui-dashboards',
        storage_path: 'products/sl-free-007-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'FREE • S/ 0.00',
          categoryLabel: 'Recursos Digitales',
          titleShort: 'Kit UI Dashboards + Iconos',
          accentHex: '#10B981',
          secondaryHex: '#6366F1',
          sku: 'SL-FREE-007',
          version: 'v1.1',
        }),
        alt_text: 'Kit Gratuito de Iconos SVG y Paletas para Dashboards',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-02-14T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-free-007-v11',
        product_id: 'prod-free-kit-ui-dashboards',
        version_number: 'v1.1',
        changelog: 'Adición de 30 nuevos iconos financieros y de pagos móviles.',
        release_date: '2026-02-14T10:00:00Z',
        is_current: true,
        created_at: '2026-02-14T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-custom-erp-medida',
    category_id: 'cat-sistemas',
    sku: 'SL-CUS-008',
    name: 'Desarrollo de Sistema Web o Automatización Corporativa a Medida',
    slug: 'desarrollo-sistema-web-automatizacion-a-medida',
    short_description:
      'Diseñamos y programamos sistemas personalizados, macros avanzadas o integraciones según el flujo exacto de tu empresa.',
    full_description:
      '¿Necesitas adaptar una plantilla PRO a las reglas específicas de tu empresa o construir un sistema desde cero? Nuestro equipo analiza tus requerimientos operativos, elabora una propuesta técnica con plazos claros en Soles (S/) y desarrolla la solución a medida con soporte directo por WhatsApp.',
    features_list: [
      'Levantamiento de requerimientos sin compromiso por WhatsApp',
      'Adaptación de plantillas Excel/Sheets o desarrollo de Sistemas Web y Apps',
      'Entregables por hitos con capacitación y manual operativo',
      'Soporte técnico post-entrega y garantía de funcionamiento',
    ],
    technical_requirements: 'Se define según el alcance técnico acordado en la cotización personalizada.',
    modalidad: 'PERSONALIZADO',
    price_regular_pen: 350.0,
    price_sale_pen: null,
    is_on_promotion: false,
    current_version: 'v1.0',
    is_featured: true,
    is_bestseller: false,
    is_new: false,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-02-19T10:00:00Z',
    category: SEED_CATEGORIES[2],
    images: [
      {
        id: 'img-cus-008-1',
        product_id: 'prod-custom-erp-medida',
        storage_path: 'products/sl-cus-008-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'A MEDIDA',
          categoryLabel: 'Soluciones Personalizadas',
          titleShort: 'Desarrollo a Medida SmartLab',
          accentHex: '#F59E0B',
          secondaryHex: '#6366F1',
          sku: 'SL-CUS-008',
          version: 'Cotización',
        }),
        alt_text: 'Desarrollo de Sistema Web o Automatización Corporativa a Medida',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-01-20T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-cus-008-v10',
        product_id: 'prod-custom-erp-medida',
        version_number: 'v1.0',
        changelog: 'Modalidad de desarrollo personalizado bajo especificaciones del cliente.',
        release_date: '2026-01-20T10:00:00Z',
        is_current: true,
        created_at: '2026-01-20T10:00:00Z',
      },
    ],
  },
  {
    id: 'prod-excel-planilla-rrhh',
    category_id: 'cat-excel',
    sku: 'SL-XLS-009',
    name: 'Plantilla Excel de Planilla de Remuneraciones, Boletas de Pago, CTS y Gratificaciones',
    slug: 'plantilla-excel-planilla-remuneraciones-boletas-cts',
    short_description:
      'Calcula AFP/ONP, EsSalud, Renta 5ta Categoría, horas extras, gratificaciones y genera boletas de pago en PDF listas para firmar.',
    full_description:
      'Automatiza la gestión laboral de tu empresa bajo el régimen general y MYPE del Perú. Calcula aportes y descuentos de ley vigentes, genera boletas individuales en lote y mantiene el historial anual de pagos en Soles (S/).',
    features_list: [
      'Cálculo actualizado de AFP (comisión flujo/mixta), ONP y EsSalud 9%',
      'Generación masiva de boletas de pago mensuales en formato PDF',
      'Módulo de liquidación de CTS semestral y Gratificaciones de Julio/Diciembre',
      'Control de vacaciones, tardanzas y horas extras al 25% y 35%',
    ],
    technical_requirements: 'Microsoft Excel 2019, 2021 o Microsoft 365 (Windows).',
    modalidad: 'PRO',
    price_regular_pen: 95.0,
    price_sale_pen: 72.0,
    is_on_promotion: true,
    current_version: 'v3.0',
    is_featured: true,
    is_bestseller: true,
    is_new: true,
    is_deal_of_the_day: false,
    deal_expires_at: null,
    status: 'ACTIVO',
    created_at: '2026-02-16T10:00:00Z',
    updated_at: '2026-02-25T10:00:00Z',
    category: SEED_CATEGORIES[0],
    images: [
      {
        id: 'img-xls-009-1',
        product_id: 'prod-excel-planilla-rrhh',
        storage_path: 'products/sl-xls-009-cover.svg',
        public_url: buildProductCoverSvg({
          badge: 'PRO • OFERTA',
          categoryLabel: 'Microsoft Excel',
          titleShort: 'Planilla y Boletas Perú',
          accentHex: '#0A68FF',
          secondaryHex: '#FF6B00',
          sku: 'SL-XLS-009',
          version: 'v3.0',
        }),
        alt_text: 'Plantilla Excel de Planilla de Remuneraciones y Boletas de Pago',
        is_cover: true,
        sort_order: 1,
        created_at: '2026-02-16T10:00:00Z',
      },
    ],
    versions: [
      {
        id: 'ver-xls-009-v30',
        product_id: 'prod-excel-planilla-rrhh',
        version_number: 'v3.0',
        changelog: 'Actualización de parámetros UIT 2026 y tasas vigentes de AFP.',
        release_date: '2026-02-25T10:00:00Z',
        is_current: true,
        created_at: '2026-02-25T10:00:00Z',
      },
    ],
  },
];

/**
 * Obtiene el precio efectivo en Soles (PEN / S/) para ordenamiento y visualización.
 */
export function getEffectivePricePEN(product: Product): number {
  if (product.modalidad === 'FREE') return 0;
  if (product.is_on_promotion && product.price_sale_pen !== null && product.price_sale_pen < product.price_regular_pen) {
    return product.price_sale_pen;
  }
  return product.price_regular_pen;
}

/**
 * Mapea una fila cruda de Supabase a la interfaz tipada Product (sin exponer jamás download_links).
 */
function mapSupabaseProductRow(row: Record<string, unknown>, categoriesMap: Map<string, Category>): Product {
  const modalidad = ((row.product_type as string) || (row.modalidad as string) || 'PRO') as ProductModalidad;
  const rawFeatures = row.features_list;
  const featuresList: string[] = Array.isArray(rawFeatures)
    ? rawFeatures.map((item) => String(item))
    : [];

  const categoryId = String(row.category_id || '');
  const category = resolveCategoryByIdOrEquivalent(categoryId, categoriesMap);

  const rawImages = Array.isArray(row.product_images) ? row.product_images : [];
  const images: ProductImage[] = rawImages.map((img: Record<string, unknown>, idx: number) => ({
    id: String(img.id || `img-${idx}`),
    product_id: String(row.id),
    storage_path: String(img.image_url || img.storage_path || ''),
    public_url: String(img.image_url || img.public_url || ''),
    alt_text: img.alt_text ? String(img.alt_text) : String(row.title || row.name || ''),
    is_cover: Boolean(img.is_primary ?? img.is_cover ?? idx === 0),
    sort_order: Number(img.display_order ?? img.sort_order ?? idx + 1),
    created_at: String(img.created_at || new Date().toISOString()),
  }));

  const rawVersions = Array.isArray(row.product_versions) ? row.product_versions : [];
  const versions: ProductVersion[] = rawVersions.map((ver: Record<string, unknown>, idx: number) => ({
    id: String(ver.id || `ver-${idx}`),
    product_id: String(row.id),
    version_number: String(ver.version_number || 'v1.0'),
    changelog: ver.release_notes ? String(ver.release_notes) : ver.changelog ? String(ver.changelog) : null,
    release_date: String(ver.released_at || ver.release_date || new Date().toISOString()),
    is_current: Boolean(ver.is_current ?? idx === 0),
    created_at: String(ver.created_at || new Date().toISOString()),
  }));

  const currentVersionObj = versions.find((v) => v.is_current) || versions[0];

  return {
    id: String(row.id),
    category_id: categoryId,
    sku: String(row.sku || 'SL-PRD'),
    name: String(row.title || row.name || ''),
    slug: String(row.slug || ''),
    short_description: String(row.short_description || ''),
    full_description: String(row.full_description || ''),
    features_list: featuresList,
    technical_requirements: row.technical_requirements ? String(row.technical_requirements) : null,
    modalidad,
    price_regular_pen: Number(row.regular_price ?? row.price_regular_pen ?? 0),
    price_sale_pen:
      row.promotional_price !== null && row.promotional_price !== undefined
        ? Number(row.promotional_price)
        : row.price_sale_pen !== null && row.price_sale_pen !== undefined
          ? Number(row.price_sale_pen)
          : null,
    is_on_promotion: Boolean(row.is_on_promotion),
    current_version: currentVersionObj?.version_number || 'v1.0',
    is_featured: Boolean(row.is_featured),
    is_bestseller: Boolean(row.is_bestseller),
    is_new: Boolean(row.is_new),
    is_deal_of_the_day: Boolean(row.is_deal_of_the_day),
    deal_expires_at: row.deal_expires_at ? String(row.deal_expires_at) : null,
    status: (row.is_active === false ? 'INACTIVO' : 'ACTIVO'),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
    category,
    images,
    versions,
  };
}

/**
 * Busca una categoría activa dentro de una lista a partir de un slug (actual o histórico),
 * utilizando `areCategorySlugsEquivalent()` y las reglas de compatibilidad verificadas.
 */
export function findActiveCategoryBySlugOrEquivalent(
  targetSlug: string | null | undefined,
  activeCategories: Category[]
): Category | undefined {
  const clean = String(targetSlug || '')
    .trim()
    .toLowerCase();
  if (!clean || clean === 'all') return undefined;

  const directMatch = activeCategories.find(
    (c) =>
      c.slug.trim().toLowerCase() === clean ||
      areCategorySlugsEquivalent(c.slug, clean)
  );
  if (directMatch) return directMatch;

  const matchedRule = OFFICIAL_CATEGORY_COMPATIBILITY_RULES.find(
    (rule) => rule.canonicalSlug === clean || rule.sqlSlug === clean
  );
  if (matchedRule) {
    return activeCategories.find(
      (c) => c.id === matchedRule.sqlId || c.id === matchedRule.seedId
    );
  }

  return undefined;
}

/**
 * Determina si un producto pertenece a la categoría indicada por `targetSlug`,
 * respetando IDs históricos (`cat-excel` <-> `excel`), slugs históricos (`google_sheets` <-> `google-sheets`)
 * y slugs editados desde `/admin/categories`.
 */
export function doesProductMatchCategorySlug(
  product: Product,
  targetSlug: string | null | undefined,
  activeCategories: Category[] = []
): boolean {
  const clean = String(targetSlug || '')
    .trim()
    .toLowerCase();
  if (!clean || clean === 'all') return true;

  if (activeCategories.length > 0) {
    const matchedCategory = findActiveCategoryBySlugOrEquivalent(
      clean,
      activeCategories
    );
    if (!matchedCategory) {
      return false;
    }
    const eqIds = getEquivalentCategoryIds(product.category_id);
    if (eqIds.includes(matchedCategory.id)) {
      return true;
    }
    return areCategorySlugsEquivalent(product.category?.slug, matchedCategory.slug);
  }

  return areCategorySlugsEquivalent(product.category?.slug, clean);
}

/**
 * Obtiene las categorías activas de SmartLab Store ordenadas por `display_order`.
 * Si Supabase está configurado, consulta exclusivamente `public.categories` (`is_active = true`)
 * y propaga cualquier error de red/BD sin sustituir con categorías ficticias.
 */
export async function getCategories(): Promise<Category[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(
        error.message || 'No se pudieron cargar las categorías activas desde Supabase.'
      );
    }

    return (data || [])
      .map((row: Record<string, unknown>, idx: number) =>
        mapSupabaseCategoryRow(row, idx)
      )
      .sort(
        (a, b) =>
          Number(a.display_order ?? a.sort_order ?? 0) -
            Number(b.display_order ?? b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      );
  }

  return loadLocalCategoriesBase().filter((cat) => cat.is_active);
}

export const LOCAL_ADMIN_PRODUCTS_KEY = 'smartlab_admin_products_v1';

export function loadCatalogProductsBase(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Product[];
      }
    }
  } catch {
    // Fallback a SEED_PRODUCTS
  }
  return SEED_PRODUCTS;
}

/**
 * Obtiene el listado de productos aplicando filtros combinables y ordenamiento.
 * SEGURIDAD (Sprint 05): Jamás incluye la tabla download_links en la consulta pública.
 */
export async function getProducts(filters: CatalogFilters = {}): Promise<Product[]> {
  let categories: Category[] = [];
  let categoriesLoadSucceeded = false;

  try {
    categories = await getCategories();
    categoriesLoadSucceeded = true;
  } catch {
    categories = [];
    categoriesLoadSucceeded = false;
  }

  const categoriesMap = new Map(categories.map((c) => [c.id, c]));

  let allProducts: Product[] = loadCatalogProductsBase().map((p) => ({
    ...p,
    category: categoriesLoadSucceeded
      ? resolveCategoryByIdOrEquivalent(p.category_id, categoriesMap)
      : resolveCategoryByIdOrEquivalent(p.category_id, categoriesMap) || p.category,
  }));

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          id,
          category_id,
          sku,
          slug,
          title,
          short_description,
          full_description,
          technical_requirements,
          features_list,
          product_type,
          regular_price,
          promotional_price,
          is_on_promotion,
          is_featured,
          is_bestseller,
          is_new,
          is_deal_of_the_day,
          deal_expires_at,
          is_active,
          created_at,
          updated_at,
          product_images (
            id,
            image_url,
            alt_text,
            display_order,
            is_primary,
            created_at
          ),
          product_versions (
            id,
            version_number,
            release_notes,
            is_current,
            released_at,
            created_at
          )
        `
        )
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        allProducts = data.map((row) =>
          mapSupabaseProductRow(row as Record<string, unknown>, categoriesMap)
        );
      }
    } catch {
      // Mantiene allProducts base con las categorías activas resueltas desde categoriesMap
    }
  }

  // Aplicar filtros combinables en memoria para garantizar consistencia total
  let filtered = allProducts.filter((p) => p.status === 'ACTIVO');

  if (filters.categorySlug && filters.categorySlug !== 'all') {
    filtered = filtered.filter((p) =>
      doesProductMatchCategorySlug(p, filters.categorySlug, categories)
    );
  }

  if (filters.modalidad && filters.modalidad !== 'all') {
    filtered = filtered.filter((p) => p.modalidad === filters.modalidad);
  }

  if (filters.onlyPromotions) {
    filtered = filtered.filter(
      (p) => p.is_on_promotion && p.price_sale_pen !== null && p.price_sale_pen < p.price_regular_pen
    );
  }

  if (filters.minPricePen !== undefined && !Number.isNaN(filters.minPricePen)) {
    filtered = filtered.filter((p) => getEffectivePricePEN(p) >= Number(filters.minPricePen));
  }

  if (filters.maxPricePen !== undefined && !Number.isNaN(filters.maxPricePen)) {
    filtered = filtered.filter((p) => getEffectivePricePEN(p) <= Number(filters.maxPricePen));
  }

  if (filters.search && filters.search.trim().length > 0) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category?.name.toLowerCase().includes(q) ?? false)
    );
  }

  // Ordenamiento
  const sortBy = filters.sortBy || 'featured';
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return getEffectivePricePEN(a) - getEffectivePricePEN(b);
    }
    if (sortBy === 'price_desc') {
      return getEffectivePricePEN(b) - getEffectivePricePEN(a);
    }
    if (sortBy === 'bestsellers') {
      return Number(b.is_bestseller) - Number(a.is_bestseller);
    }
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    // 'featured' por defecto
    return Number(b.is_featured) - Number(a.is_featured);
  });

  return filtered;
}

/**
 * Obtiene el detalle público de un producto por su slug.
 * SEGURIDAD (Sprint 05): Nunca expone enlaces de Google Drive ni MediaFire.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const allProducts = await getProducts();
  const found = allProducts.find((p) => p.slug === slug);
  return found || null;
}

/**
 * Registra una solicitud de producto personalizado (`custom_requests`).
 * Valida estrictamente nombre, correo electrónico y teléfono de WhatsApp obligatorios.
 */
export async function submitCustomRequest(
  payload: CustomRequestPayload
): Promise<{ data: CustomRequestRecord | null; error: string | null }> {
  const cleanName = payload.requester_name.trim();
  const cleanEmail = payload.requester_email.trim().toLowerCase();
  const cleanPhone = payload.requester_phone.replace(/[^\d+]/g, '').trim();
  const cleanRequirements = payload.requirements_detail.trim();

  if (cleanName.length < 3) {
    return { data: null, error: 'El nombre completo es obligatorio (mínimo 3 caracteres).' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { data: null, error: 'Ingresa un correo electrónico válido.' };
  }
  if (cleanPhone.replace(/\D/g, '').length < 9) {
    return {
      data: null,
      error: 'El número de teléfono / WhatsApp es obligatorio (mínimo 9 dígitos).',
    };
  }
  if (!payload.category_id) {
    return { data: null, error: 'Selecciona una categoría para tu solicitud personalizada.' };
  }
  if (cleanRequirements.length < 15) {
    return {
      data: null,
      error: 'Describe los requerimientos técnicos o funcionales con al menos 15 caracteres.',
    };
  }

  const record: CustomRequestRecord = {
    id: `req-${Date.now()}`,
    user_id: payload.user_id || null,
    product_id: payload.product_id || null,
    category_id: payload.category_id,
    requester_name: cleanName,
    requester_email: cleanEmail,
    requester_phone: cleanPhone,
    requirements_detail: cleanRequirements,
    estimated_budget_pen: payload.estimated_budget_pen ?? null,
    status: 'RECIBIDA',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .insert({
          user_id: record.user_id,
          product_id: record.product_id,
          category_id: record.category_id,
          requester_name: record.requester_name,
          requester_email: record.requester_email,
          requester_phone: record.requester_phone,
          requirements_detail: record.requirements_detail,
          estimated_budget_pen: record.estimated_budget_pen,
          status: 'RECIBIDA',
        })
        .select('*')
        .single();

      if (!error && data) {
        return { data: data as CustomRequestRecord, error: null };
      }
    } catch {
      // Continúa hacia respaldo local si la conexión remota no está activa
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_REQUESTS_KEY);
    const list: CustomRequestRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(LOCAL_CUSTOM_REQUESTS_KEY, JSON.stringify(list));
  } catch {
    // Ignorar error de almacenamiento privado del navegador
  }

  return { data: record, error: null };
}
