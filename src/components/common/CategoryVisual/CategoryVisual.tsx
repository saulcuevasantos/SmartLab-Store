import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Table as TableIcon,
  Monitor,
  Smartphone,
  Zap,
  Cpu,
  FolderOpen,
  FolderKanban,
  Code2,
  Database,
  BarChart3,
  Layers,
  Globe,
  ShoppingCart,
  Wrench,
  ShieldCheck,
  BookOpen,
  Boxes,
  Terminal,
  Package,
  Sparkles,
} from 'lucide-react';
import { Category } from '../../../types/catalog.types';

export type LucideIconRenderer = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

const LUCIDE_ICON_MAP: Record<string, LucideIconRenderer> = {
  filespreadsheet: FileSpreadsheet,
  table: TableIcon,
  monitor: Monitor,
  smartphone: Smartphone,
  zap: Zap,
  cpu: Cpu,
  folderopen: FolderOpen,
  folderkanban: FolderKanban,
  code2: Code2,
  database: Database,
  barchart3: BarChart3,
  layers: Layers,
  globe: Globe,
  shoppingcart: ShoppingCart,
  wrench: Wrench,
  shieldcheck: ShieldCheck,
  bookopen: BookOpen,
  boxes: Boxes,
  terminal: Terminal,
  package: Package,
  sparkles: Sparkles,
};

export const DEFAULT_CATEGORY_ICON_COLOR_HEX = '#3B82F6';

export interface CategoryColorSwatch {
  name: string;
  hex: string;
  family: string;
}

export interface CategoryColorFamilyGroup {
  family: string;
  colors: readonly CategoryColorSwatch[];
}

/**
 * Paleta oficial de 24 colores para iconos de categorías organizada por familias (Sprint B5).
 */
export const CATEGORY_COLOR_FAMILIES: readonly CategoryColorFamilyGroup[] = [
  {
    family: 'Azules y Cianes',
    colors: [
      { name: 'Azul', hex: '#3B82F6', family: 'Azules y Cianes' },
      { name: 'Azul marino', hex: '#1E40AF', family: 'Azules y Cianes' },
      { name: 'Celeste', hex: '#0EA5E9', family: 'Azules y Cianes' },
      { name: 'Turquesa', hex: '#14B8A6', family: 'Azules y Cianes' },
    ],
  },
  {
    family: 'Verdes',
    colors: [
      { name: 'Verde', hex: '#22C55E', family: 'Verdes' },
      { name: 'Esmeralda', hex: '#059669', family: 'Verdes' },
      { name: 'Lima', hex: '#84CC16', family: 'Verdes' },
      { name: 'Oliva', hex: '#65A30D', family: 'Verdes' },
    ],
  },
  {
    family: 'Morados e Índigos',
    colors: [
      { name: 'Morado', hex: '#9333EA', family: 'Morados e Índigos' },
      { name: 'Violeta', hex: '#7C3AED', family: 'Morados e Índigos' },
      { name: 'Lavanda', hex: '#A78BFA', family: 'Morados e Índigos' },
      { name: 'Índigo', hex: '#4F46E5', family: 'Morados e Índigos' },
    ],
  },
  {
    family: 'Rosas y Rojos',
    colors: [
      { name: 'Rosa', hex: '#EC4899', family: 'Rosas y Rojos' },
      { name: 'Fucsia', hex: '#D946EF', family: 'Rosas y Rojos' },
      { name: 'Coral', hex: '#F97373', family: 'Rosas y Rojos' },
      { name: 'Rojo', hex: '#EF4444', family: 'Rosas y Rojos' },
    ],
  },
  {
    family: 'Naranjas y Ámbar',
    colors: [
      { name: 'Naranja', hex: '#F97316', family: 'Naranjas y Ámbar' },
      { name: 'Mandarina', hex: '#EA580C', family: 'Naranjas y Ámbar' },
      { name: 'Ámbar', hex: '#F59E0B', family: 'Naranjas y Ámbar' },
      { name: 'Dorado', hex: '#CA8A04', family: 'Naranjas y Ámbar' },
    ],
  },
  {
    family: 'Tierras y Neutros',
    colors: [
      { name: 'Café', hex: '#A16207', family: 'Tierras y Neutros' },
      { name: 'Terracota', hex: '#C2410C', family: 'Tierras y Neutros' },
      { name: 'Pizarra', hex: '#64748B', family: 'Tierras y Neutros' },
      { name: 'Grafito', hex: '#475569', family: 'Tierras y Neutros' },
    ],
  },
] as const;

export const CATEGORY_PRESET_COLORS: readonly CategoryColorSwatch[] =
  CATEGORY_COLOR_FAMILIES.flatMap((group) => group.colors);

const HEX_6_DIGIT_REGEX = /^#[0-9A-F]{6}$/;

/**
 * Normaliza un valor HEX de 6 dígitos a mayúsculas con `#` inicial (ej. `#3B82F6`).
 * Devuelve `null` si el valor es nulo, vacío o no cumple el formato HEX de 6 dígitos.
 */
export function normalizeCategoryHexColor(
  raw: string | null | undefined
): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#')
    ? trimmed.toUpperCase()
    : `#${trimmed.toUpperCase()}`;
  return HEX_6_DIGIT_REGEX.test(withHash) ? withHash : null;
}

/**
 * Verifica si una cadena corresponde a un código HEX válido de 6 dígitos (`#RRGGBB` o `RRGGBB`).
 */
export function isValidCategoryHexColor(
  raw: string | null | undefined
): boolean {
  return normalizeCategoryHexColor(raw) !== null;
}

/**
 * Devuelve el color HEX predeterminado para las 6 categorías base históricas
 * únicamente cuando un registro antiguo no tiene `color_hex` configurado:
 * - Excel: Verde (#22C55E)
 * - Google Sheets: Esmeralda (#059669)
 * - Sistemas: Azul (#3B82F6)
 * - Android: Morado (#9333EA)
 * - Automatizaciones: Ámbar (#F59E0B)
 * - Recursos Digitales: Naranja (#F97316)
 * - Cualquier otra categoría sin `color_hex`: Azul (#3B82F6)
 */
export function resolveDefaultLegacyCategoryColorHex(
  id?: string | null,
  slug?: string | null
): string {
  const keys = [String(id || '').trim().toLowerCase(), String(slug || '').trim().toLowerCase()];

  for (const key of keys) {
    if (!key) continue;
    if (key === 'excel' || key === 'cat-excel') {
      return '#22C55E';
    }
    if (
      key === 'google_sheets' ||
      key === 'google-sheets' ||
      key === 'cat-google-sheets'
    ) {
      return '#059669';
    }
    if (key === 'sistemas' || key === 'cat-sistemas') {
      return '#3B82F6';
    }
    if (
      key === 'android_apps' ||
      key === 'aplicaciones-android' ||
      key === 'cat-android-apps'
    ) {
      return '#9333EA';
    }
    if (key === 'automatizaciones' || key === 'cat-automatizaciones') {
      return '#F59E0B';
    }
    if (
      key === 'recursos_digitales' ||
      key === 'recursos-digitales' ||
      key === 'cat-recursos-digitales'
    ) {
      return '#F97316';
    }
  }

  return DEFAULT_CATEGORY_ICON_COLOR_HEX;
}

/**
 * Resuelve de forma centralizada y segura el color HEX del icono de una categoría:
 * 1. Si `color_hex` está presente y es un HEX válido de 6 dígitos, lo normaliza y respeta siempre.
 * 2. Si `color_hex` es nulo, vacío o inválido, asigna el color predeterminado correspondiente.
 */
export function resolveCategoryIconColorHex(
  category?: Partial<Pick<Category, 'id' | 'slug' | 'color_hex'>> | null
): string {
  if (!category) return DEFAULT_CATEGORY_ICON_COLOR_HEX;
  const normalized = normalizeCategoryHexColor(category.color_hex);
  if (normalized) return normalized;
  return resolveDefaultLegacyCategoryColorHex(category.id, category.slug);
}

export interface CategoryVisualProps {
  category: Pick<Category, 'name' | 'icon_name' | 'image_url'> &
    Partial<Pick<Category, 'id' | 'slug' | 'color_hex'>>;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
}

/**
 * Renderiza de forma consistente la imagen personalizada (`image_url` en `public-assets/categories/`)
 * o el icono Lucide (`icon_name`) con su `color_hex` aplicado exclusivamente al icono,
 * sin alterar fondos, bordes, radios, sombras ni estados de selección.
 */
export const CategoryVisual: React.FC<CategoryVisualProps> = ({
  category,
  className = 'w-5 h-5 flex items-center justify-center shrink-0 overflow-hidden',
  iconClassName = 'w-4 h-4',
  imageClassName = 'w-full h-full object-cover rounded',
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [category.image_url]);

  const hasValidImage =
    Boolean(category.image_url) &&
    String(category.image_url).trim().length > 0 &&
    !imgError;

  const cleanIconKey = String(category.icon_name || 'FolderOpen')
    .trim()
    .toLowerCase();
  const IconComponent = LUCIDE_ICON_MAP[cleanIconKey] || FolderOpen;
  const resolvedIconColor = resolveCategoryIconColorHex(category);

  return (
    <span className={className} aria-hidden="true">
      {hasValidImage ? (
        <img
          src={String(category.image_url).trim()}
          alt={category.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className={imageClassName}
        />
      ) : (
        <IconComponent
          className={iconClassName}
          style={{ color: resolvedIconColor }}
        />
      )}
    </span>
  );
};
