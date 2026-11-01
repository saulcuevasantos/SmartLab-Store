/**
 * SmartLab Store — Modal Reutilizable de Creación y Edición de Categorías (Sprint B3 & B5)
 * - Autogeneración y edición manual de slug normalizado (minúsculas, sin tildes, guiones).
 * - Selector visual de icono Lucide + selector de color de icono (`color_hex`) con 24 muestras por familias
 *   y opción de color personalizado (selector visual + entrada manual HEX de 6 dígitos en mayúsculas).
 * - Carga de imagen opcional a `public-assets/categories/`.
 * - Validación de duplicados de nombre y slug con mensajes claros.
 * - El ID se genera únicamente al crear y permanece inmutable en edición.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Upload,
  Trash2,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  Check,
  Palette,
  FileSpreadsheet,
  Table,
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
} from 'lucide-react';
import { Category } from '../../../types/catalog.types';
import {
  AdminCategoryInput,
  createAdminCategory,
  updateAdminCategory,
  normalizeCategorySlugInput,
} from '../../../services/admin.service';
import { areCategorySlugsEquivalent } from '../../../services/catalog.service';
import {
  ALLOWED_PUBLIC_ASSET_MIME_TYPES,
  MAX_PUBLIC_ASSET_SIZE_BYTES,
} from '../../../services/storage.service';
import {
  CATEGORY_COLOR_FAMILIES,
  CATEGORY_PRESET_COLORS,
  DEFAULT_CATEGORY_ICON_COLOR_HEX,
  LucideIconRenderer,
  isValidCategoryHexColor,
  normalizeCategoryHexColor,
  resolveCategoryIconColorHex,
} from '../../../components/common/CategoryVisual/CategoryVisual';

export interface CategoryIconOption {
  name: string;
  label: string;
  icon: LucideIconRenderer;
}

export const CATEGORY_LUCIDE_ICON_OPTIONS: readonly CategoryIconOption[] = [
  { name: 'FileSpreadsheet', label: 'Excel / Hojas', icon: FileSpreadsheet },
  { name: 'Table', label: 'Google Sheets', icon: Table },
  { name: 'Monitor', label: 'Sistemas Web/PC', icon: Monitor },
  { name: 'Smartphone', label: 'Apps Móviles', icon: Smartphone },
  { name: 'Zap', label: 'Automatización', icon: Zap },
  { name: 'Cpu', label: 'Bots / IA / CPU', icon: Cpu },
  { name: 'FolderOpen', label: 'Recursos (Carpeta)', icon: FolderOpen },
  { name: 'FolderKanban', label: 'Proyectos / Kits', icon: FolderKanban },
  { name: 'Code2', label: 'Scripts / Código', icon: Code2 },
  { name: 'Database', label: 'Base de Datos', icon: Database },
  { name: 'BarChart3', label: 'Dashboards / BI', icon: BarChart3 },
  { name: 'Layers', label: 'Plantillas / Suites', icon: Layers },
  { name: 'Globe', label: 'Web / Cloud', icon: Globe },
  { name: 'ShoppingCart', label: 'Comercio / POS', icon: ShoppingCart },
  { name: 'Wrench', label: 'Utilidades / Tools', icon: Wrench },
  { name: 'ShieldCheck', label: 'Auditoría / Seguridad', icon: ShieldCheck },
  { name: 'BookOpen', label: 'Guías / Manuales', icon: BookOpen },
  { name: 'Boxes', label: 'Inventario / ERP', icon: Boxes },
  { name: 'Terminal', label: 'Consola / DevOps', icon: Terminal },
  { name: 'Package', label: 'Paquete Digital', icon: Package },
] as const;

export const CategoryLucideIcon: React.FC<{
  iconName: string | null | undefined;
  colorHex?: string | null;
  className?: string;
}> = ({ iconName, colorHex, className = 'w-5 h-5' }) => {
  const clean = String(iconName || '').trim().toLowerCase();
  const matched = CATEGORY_LUCIDE_ICON_OPTIONS.find(
    (opt) => opt.name.toLowerCase() === clean
  );
  const IconComponent = matched ? matched.icon : FolderOpen;
  const resolvedColor = normalizeCategoryHexColor(colorHex);
  return (
    <IconComponent
      className={className}
      style={resolvedColor ? { color: resolvedColor } : undefined}
    />
  );
};

/**
 * Normaliza en vivo o al escribir un slug: minúsculas, sin tildes,
 * espacios y caracteres especiales convertidos en guiones.
 */
function formatSlugFromText(raw: string, allowTrailingHyphen = false): string {
  const base = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '');

  const cleaned = allowTrailingHyphen ? base : base.replace(/-+$/, '');
  return cleaned.slice(0, 100);
}

export interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  existingCategories: Category[];
  onSaved: (category: Category, isEditMode: boolean) => Promise<void> | void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  editingCategory,
  existingCategories,
  onSaved,
}) => {
  const isEditMode = Boolean(editingCategory);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [iconName, setIconName] = useState('FolderOpen');
  const [colorHex, setColorHex] = useState<string>(DEFAULT_CATEGORY_ICON_COLOR_HEX);
  const [customHexInput, setCustomHexInput] = useState<string>(
    DEFAULT_CATEGORY_ICON_COLOR_HEX
  );
  const [isCustomColorMode, setIsCustomColorMode] = useState<boolean>(false);
  const [colorValidationError, setColorValidationError] = useState<string | null>(
    null
  );
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Gestión de imagen opcional en `public-assets/categories/`
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localObjectPreviewUrl, setLocalObjectPreviewUrl] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setColorValidationError(null);
    setSelectedImageFile(null);
    setRemoveCurrentImage(false);
    if (localObjectPreviewUrl) {
      URL.revokeObjectURL(localObjectPreviewUrl);
      setLocalObjectPreviewUrl(null);
    }

    if (editingCategory) {
      const resolvedInitialColor = resolveCategoryIconColorHex(editingCategory);
      const isPreset = CATEGORY_PRESET_COLORS.some(
        (preset) => preset.hex.toUpperCase() === resolvedInitialColor.toUpperCase()
      );

      setName(editingCategory.name);
      setSlug(editingCategory.slug);
      setIsSlugManuallyEdited(true);
      setDescription(editingCategory.description || '');
      setIconName(editingCategory.icon_name || 'FolderOpen');
      setColorHex(resolvedInitialColor);
      setCustomHexInput(resolvedInitialColor);
      setIsCustomColorMode(!isPreset);
      setDisplayOrder(
        Number(editingCategory.display_order ?? editingCategory.sort_order ?? 1)
      );
      setIsActive(Boolean(editingCategory.is_active));
      setExistingImageUrl(editingCategory.image_url || null);
    } else {
      const nextOrder =
        existingCategories.reduce(
          (max, c) => Math.max(max, Number(c.display_order ?? c.sort_order ?? 0)),
          0
        ) + 1;
      setName('');
      setSlug('');
      setIsSlugManuallyEdited(false);
      setDescription('');
      setIconName('FolderOpen');
      setColorHex(DEFAULT_CATEGORY_ICON_COLOR_HEX);
      setCustomHexInput(DEFAULT_CATEGORY_ICON_COLOR_HEX);
      setIsCustomColorMode(false);
      setDisplayOrder(nextOrder);
      setIsActive(true);
      setExistingImageUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingCategory]);

  // Limpiar ObjectURL temporal al desmontar o cambiar archivo
  useEffect(() => {
    return () => {
      if (localObjectPreviewUrl) {
        URL.revokeObjectURL(localObjectPreviewUrl);
      }
    };
  }, [localObjectPreviewUrl]);

  if (!isOpen) return null;

  const handleNameChange = (value: string) => {
    setName(value);
    setErrorMsg(null);
    if (!isSlugManuallyEdited) {
      setSlug(formatSlugFromText(value, false));
    }
  };

  const handleSlugChange = (value: string) => {
    setIsSlugManuallyEdited(true);
    setErrorMsg(null);
    setSlug(formatSlugFromText(value, true));
  };

  const handleSlugBlur = () => {
    setSlug((prev) => formatSlugFromText(prev, false));
  };

  const handleRegenerateSlug = () => {
    const generated = formatSlugFromText(name, false);
    setSlug(generated);
    setIsSlugManuallyEdited(false);
    setErrorMsg(null);
  };

  const handleSelectPresetColor = (hex: string) => {
    const normalized =
      normalizeCategoryHexColor(hex) || DEFAULT_CATEGORY_ICON_COLOR_HEX;
    setColorHex(normalized);
    setCustomHexInput(normalized);
    setIsCustomColorMode(false);
    setColorValidationError(null);
    setErrorMsg(null);
  };

  const handleActivateCustomColorMode = () => {
    setIsCustomColorMode(true);
    setCustomHexInput(colorHex);
    setColorValidationError(null);
  };

  const handleReturnToPresetColors = () => {
    setIsCustomColorMode(false);
    setColorValidationError(null);
    const matchingPreset = CATEGORY_PRESET_COLORS.find(
      (preset) => preset.hex.toUpperCase() === colorHex.toUpperCase()
    );
    const nextHex = matchingPreset
      ? matchingPreset.hex
      : DEFAULT_CATEGORY_ICON_COLOR_HEX;
    setColorHex(nextHex);
    setCustomHexInput(nextHex);
  };

  const handleVisualColorPickerChange = (rawHex: string) => {
    const normalized =
      normalizeCategoryHexColor(rawHex) || DEFAULT_CATEGORY_ICON_COLOR_HEX;
    setIsCustomColorMode(true);
    setColorHex(normalized);
    setCustomHexInput(normalized);
    setColorValidationError(null);
    setErrorMsg(null);
  };

  const handleManualHexInputChange = (raw: string) => {
    const upper = raw.toUpperCase().replace(/[^#0-9A-F]/g, '').slice(0, 7);
    setIsCustomColorMode(true);
    setCustomHexInput(upper);
    setErrorMsg(null);

    const normalized = normalizeCategoryHexColor(upper);
    if (normalized) {
      setColorHex(normalized);
      setColorValidationError(null);
    } else {
      setColorValidationError(
        'Ingresa un código HEX válido de 6 dígitos (ej. #3B82F6).'
      );
    }
  };

  const handleManualHexInputBlur = () => {
    const normalized = normalizeCategoryHexColor(customHexInput);
    if (normalized) {
      setCustomHexInput(normalized);
      setColorHex(normalized);
      setColorValidationError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);

    if (
      !ALLOWED_PUBLIC_ASSET_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_PUBLIC_ASSET_MIME_TYPES)[number]
      )
    ) {
      setErrorMsg(
        'Formato de imagen no válido. Selecciona un archivo JPG, PNG, WEBP o SVG.'
      );
      return;
    }

    if (file.size <= 0) {
      setErrorMsg('El archivo de imagen seleccionado está vacío.');
      return;
    }

    if (file.size > MAX_PUBLIC_ASSET_SIZE_BYTES) {
      setErrorMsg(
        'La imagen supera el límite máximo permitido de 5 MB para el bucket public-assets.'
      );
      return;
    }

    if (localObjectPreviewUrl) {
      URL.revokeObjectURL(localObjectPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setLocalObjectPreviewUrl(previewUrl);
    setRemoveCurrentImage(false);
  };

  const handleClearImageSelection = () => {
    if (localObjectPreviewUrl) {
      URL.revokeObjectURL(localObjectPreviewUrl);
      setLocalObjectPreviewUrl(null);
    }
    setSelectedImageFile(null);
    if (existingImageUrl) {
      setRemoveCurrentImage(true);
    }
  };

  const handleRestoreOriginalImage = () => {
    if (localObjectPreviewUrl) {
      URL.revokeObjectURL(localObjectPreviewUrl);
      setLocalObjectPreviewUrl(null);
    }
    setSelectedImageFile(null);
    setRemoveCurrentImage(false);
  };

  const effectivePreviewImageUrl =
    localObjectPreviewUrl || (!removeCurrentImage ? existingImageUrl : null);

  const activePresetSwatch = CATEGORY_PRESET_COLORS.find(
    (preset) => preset.hex.toUpperCase() === colorHex.toUpperCase()
  );

  const effectiveIconColorHex =
    normalizeCategoryHexColor(isCustomColorMode ? customHexInput : colorHex) ||
    colorHex ||
    DEFAULT_CATEGORY_ICON_COLOR_HEX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 100) {
      setErrorMsg(
        'El nombre de la categoría es obligatorio y debe tener entre 2 y 100 caracteres.'
      );
      return;
    }

    const candidateHexSource = isCustomColorMode ? customHexInput : colorHex;
    if (!isValidCategoryHexColor(candidateHexSource)) {
      const hexErr =
        'El color del icono no es válido. Ingresa un código hexadecimal de 6 dígitos (ej. #3B82F6).';
      setColorValidationError(hexErr);
      setErrorMsg(hexErr);
      return;
    }
    const normalizedColorHex =
      normalizeCategoryHexColor(candidateHexSource) ||
      DEFAULT_CATEGORY_ICON_COLOR_HEX;

    const normalizedSlug =
      isEditMode && editingCategory && slug === editingCategory.slug
        ? normalizeCategorySlugInput(slug)
        : (formatSlugFromText(slug || cleanName, false) as ReturnType<
            typeof normalizeCategorySlugInput
          >);

    if (normalizedSlug.length < 2 || normalizedSlug.length > 100) {
      setErrorMsg(
        'El slug es obligatorio y debe contener al menos 2 caracteres válidos (letras o números).'
      );
      return;
    }

    // Validar duplicados en cliente para respuesta inmediata y clara
    const duplicateName = existingCategories.find(
      (c) =>
        (!editingCategory || c.id !== editingCategory.id) &&
        c.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateName) {
      setErrorMsg(
        `Ya existe una categoría registrada con el nombre "${duplicateName.name}". Ingresa un nombre diferente.`
      );
      return;
    }

    const duplicateSlug = existingCategories.find(
      (c) =>
        (!editingCategory || c.id !== editingCategory.id) &&
        (c.slug.trim().toLowerCase() === normalizedSlug.toLowerCase() ||
          areCategorySlugsEquivalent(c.slug, normalizedSlug))
    );
    if (duplicateSlug) {
      setErrorMsg(
        `El slug "${normalizedSlug}" ya está en uso por la categoría "${duplicateSlug.name}". Modifica el slug para continuar.`
      );
      return;
    }

    const cleanOrder = Number.isFinite(Number(displayOrder))
      ? Math.max(0, Math.round(Number(displayOrder)))
      : 1;

    setIsSubmitting(true);
    try {
      const payload: AdminCategoryInput = {
        name: cleanName,
        slug: normalizedSlug,
        description: description.trim() || null,
        icon_name: iconName.trim() || 'FolderOpen',
        color_hex: normalizedColorHex,
        display_order: cleanOrder,
        sort_order: cleanOrder,
        is_active: isActive,
        imageFile: selectedImageFile,
        removeImage: removeCurrentImage,
      };

      const result =
        isEditMode && editingCategory
          ? await updateAdminCategory(editingCategory.id, payload)
          : await createAdminCategory(payload);

      if (result.error || !result.category) {
        setErrorMsg(
          result.error || 'No se pudo guardar la categoría. Verifica tus permisos de administrador.'
        );
        return;
      }

      await onSaved(result.category, isEditMode);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al guardar la categoría.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
              {isEditMode
                ? 'Edición de Categoría Oficial'
                : 'Nueva Categoría del Catálogo'}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {isEditMode && editingCategory
                ? `Editar Categoría: ${editingCategory.name}`
                : 'Crear Nueva Categoría'}
            </h2>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2.5 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vista Previa en Vivo (Imagen + Icono con color_hex + Nombre + Slug + Estado) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-14 h-14 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                {effectivePreviewImageUrl ? (
                  <img
                    src={effectivePreviewImageUrl}
                    alt={name || 'Vista previa de categoría'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-50/80 text-[#0A68FF] flex items-center justify-center">
                    <CategoryLucideIcon
                      iconName={iconName}
                      colorHex={effectiveIconColorHex}
                      className="w-6 h-6"
                    />
                  </div>
                )}
                {effectivePreviewImageUrl && (
                  <div
                    className="absolute bottom-1 right-1 w-6 h-6 rounded-md bg-slate-900/80 text-white flex items-center justify-center shadow-xs"
                    title={`Icono de respaldo: ${iconName} (${effectiveIconColorHex})`}
                  >
                    <CategoryLucideIcon
                      iconName={iconName}
                      colorHex={effectiveIconColorHex}
                      className="w-3.5 h-3.5"
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">
                    Vista Previa
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Orden #{displayOrder || 1}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                      style={{ backgroundColor: effectiveIconColorHex }}
                    />
                    {effectiveIconColorHex}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      isActive
                        ? 'text-emerald-700 font-semibold'
                        : 'text-amber-700 font-semibold'
                    }
                  >
                    {isActive ? 'Activa en tienda' : 'Inactiva (Oculta)'}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
                  {name.trim() || 'Nombre de la Categoría'}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate">
                  /catalogo?categoria={slug || 'slug-de-categoria'}
                </p>
              </div>
            </div>

            {isEditMode && editingCategory && (
              <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-200">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex sm:justify-end items-center gap-1">
                  <Lock className="w-3 h-3" />
                  ID Inmutable (FK)
                </span>
                <code className="text-xs font-mono font-bold text-slate-700">
                  {editingCategory.id}
                </code>
              </div>
            )}
          </div>

          {/* Fila 1: Nombre y Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombre de la Categoría <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Plantillas Power BI"
                className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0A68FF]"
              />
              <span className="block text-[11px] text-slate-400 mt-1">
                Nombre comercial visible en el catálogo y menús.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Slug URL <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateSlug}
                  className="text-[11px] font-semibold text-[#0A68FF] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  Autogenerar desde nombre
                </button>
              </div>
              <input
                type="text"
                required
                maxLength={100}
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onBlur={handleSlugBlur}
                placeholder="ej. plantillas-power-bi"
                className="w-full h-10 px-3.5 rounded-lg border border-slate-300 font-mono text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
              <span className="block text-[11px] text-slate-400 mt-1">
                Minúsculas, sin tildes y separado por guiones (`-`).
              </span>
            </div>
          </div>

          {/* Fila 2: Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Descripción Comercial
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué tipo de plantillas, sistemas o herramientas incluye esta categoría..."
              className="w-full p-3.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-[#0A68FF] resize-y"
            />
          </div>

          {/* Fila 3: Orden de Visualización y Estado Activo/Inactivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Orden de Visualización (`display_order`)
              </label>
              <input
                type="number"
                min={0}
                max={999}
                step={1}
                value={displayOrder}
                onChange={(e) =>
                  setDisplayOrder(Math.max(0, parseInt(e.target.value || '0', 10)))
                }
                className="w-full h-10 px-3.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0A68FF]"
              />
              <span className="block text-[11px] text-slate-400 mt-1">
                Menor número aparece primero (ej. 1, 2, 3...).
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Estado de la Categoría
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-emerald-700 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Activa
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`h-8 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    !isActive
                      ? 'bg-white text-amber-700 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Inactiva
                </button>
              </div>
              {!isActive && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Al guardar como <strong>Inactiva</strong>, esta categoría dejará de aparecer en la tienda pública.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fila 4: Selector de Icono Lucide */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700">
                Icono Lucide (`icon_name`)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Nombre técnico:</span>
                <input
                  type="text"
                  maxLength={50}
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                  className="h-7 px-2.5 w-40 rounded-md border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {CATEGORY_LUCIDE_ICON_OPTIONS.map((opt) => {
                const IconComp = opt.icon;
                const selected =
                  iconName.trim().toLowerCase() === opt.name.toLowerCase();
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setIconName(opt.name)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer ${
                      selected
                        ? 'border-[#0A68FF] bg-blue-50/70 text-[#0A68FF] font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <IconComp
                      className="w-4 h-4 shrink-0"
                      style={{ color: effectiveIconColorHex }}
                    />
                    <span className="text-[11px] truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 5: Selector de Color del Icono (`color_hex`) — 24 muestras por familias + Color personalizado */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#0A68FF]" />
                  <span>Color del Icono (`color_hex`)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Personaliza únicamente el color del icono Lucide. Los fondos se mantienen intactos.
                </p>
              </div>

              {/* Resumen del color activo + Vista previa inmediata del icono */}
              <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0">
                  <CategoryLucideIcon
                    iconName={iconName}
                    colorHex={effectiveIconColorHex}
                    className="w-4 h-4"
                  />
                </div>
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-slate-800 block">
                    {isCustomColorMode
                      ? 'Color personalizado'
                      : activePresetSwatch?.name || 'Color seleccionado'}
                  </span>
                  <code className="font-mono text-slate-500">
                    {effectiveIconColorHex}
                  </code>
                </div>
              </div>
            </div>

            {/* 24 Muestras Predefinidas Organizadas por Familias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CATEGORY_COLOR_FAMILIES.map((group) => (
                <div
                  key={group.family}
                  className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {group.family}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.colors.map((swatch) => {
                      const isSelected =
                        !isCustomColorMode &&
                        colorHex.toUpperCase() === swatch.hex.toUpperCase();
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() => handleSelectPresetColor(swatch.hex)}
                          title={`${swatch.name} (${swatch.hex})`}
                          className={`px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition cursor-pointer ${
                            isSelected
                              ? 'border-[#0A68FF] bg-blue-50/70 ring-1 ring-[#0A68FF]'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/15 flex items-center justify-center shrink-0"
                            style={{ backgroundColor: swatch.hex }}
                          >
                            {isSelected && (
                              <Check className="w-2.5 h-2.5 text-white drop-shadow-xs" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="text-[11px] font-semibold text-slate-800 block truncate">
                              {swatch.name}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 block">
                              {swatch.hex}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Opción de Color Personalizado (Selector visual + Entrada HEX de 6 dígitos) */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleActivateCustomColorMode}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      isCustomColorMode
                        ? 'border-[#0A68FF] bg-blue-50 text-[#0A68FF]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Color personalizado</span>
                    {isCustomColorMode && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {isCustomColorMode && (
                    <button
                      type="button"
                      onClick={handleReturnToPresetColors}
                      className="text-[11px] font-semibold text-[#0A68FF] hover:underline cursor-pointer"
                    >
                      Volver a colores predefinidos
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                    <span>Selector visual:</span>
                    <input
                      type="color"
                      aria-label="Selector visual de color HEX"
                      value={effectiveIconColorHex}
                      onChange={(e) => handleVisualColorPickerChange(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-slate-300 bg-white p-0.5"
                    />
                  </label>

                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="cat-custom-hex"
                      className="text-[11px] font-semibold text-slate-600"
                    >
                      Código HEX:
                    </label>
                    <input
                      id="cat-custom-hex"
                      type="text"
                      maxLength={7}
                      value={customHexInput}
                      onChange={(e) => handleManualHexInputChange(e.target.value)}
                      onBlur={handleManualHexInputBlur}
                      placeholder="#3B82F6"
                      className={`h-8 w-28 px-2.5 rounded-md border font-mono text-xs uppercase focus:outline-none ${
                        colorValidationError
                          ? 'border-red-400 text-red-700 bg-red-50/40'
                          : 'border-slate-300 text-slate-800 focus:border-[#0A68FF]'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {colorValidationError && (
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{colorValidationError}</span>
                </p>
              )}
            </div>
          </div>

          {/* Fila 6: Imagen Personalizada Opcional en public-assets/categories/ */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Imagen Personalizada Opcional (`public-assets/categories/`)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Formatos aceptados: JPG, PNG, WEBP o SVG (máx. 5 MB). Si no subes imagen, se utilizará el icono Lucide.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_PUBLIC_ASSET_MIME_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#0A68FF]" />
                  {effectivePreviewImageUrl ? 'Reemplazar Imagen' : 'Subir Imagen'}
                </button>

                {effectivePreviewImageUrl && (
                  <button
                    type="button"
                    onClick={handleClearImageSelection}
                    className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Quitar Imagen
                  </button>
                )}

                {removeCurrentImage && existingImageUrl && !selectedImageFile && (
                  <button
                    type="button"
                    onClick={handleRestoreOriginalImage}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Conservar imagen actual
                  </button>
                )}
              </div>
            </div>

            {selectedImageFile && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between">
                <span>
                  Archivo listo para subir a <code>public-assets/categories/</code>:{' '}
                  <strong>{selectedImageFile.name}</strong> (
                  {(selectedImageFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}

            {removeCurrentImage && !selectedImageFile && (
              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                La imagen actual se eliminará de la categoría al confirmar el guardado.
              </div>
            )}
          </div>

          {/* Botones de Acción del Modal */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    {isEditMode ? 'Guardar Cambios' : 'Crear Categoría'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
