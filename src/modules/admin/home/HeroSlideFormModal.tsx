/**
 * SmartLab Store — Modal de Creación, Edición y Vista Previa de Slide del Hero (Sprint C2)
 * Referencia: docs/09_PORTADA_Y_PROMOCIONES.md (Secciones 3, 4 y 7)
 *
 * Permite configurar todos los campos de un slide del Hero Banner:
 * - Nombre interno administrativo, badge/etiqueta, título principal y subtítulo/descripción.
 * - Imágenes independientes para Escritorio (home/slides/desktop/) y Móvil (home/slides/mobile/)
 *   en el bucket public-assets (máx. 5 MB, JPG/PNG/WEBP/SVG), con previsualización, reemplazo y eliminación.
 * - Texto alternativo (alt) de imágenes.
 * - Botón principal y secundario (texto + URL validada contra protocolos peligrosos).
 * - Apertura de enlaces externos en nueva pestaña.
 * - Orden de visualización, estado activo/inactivo, estado DRAFT / PUBLISHED y fechas starts_at / ends_at.
 * - Vista previa en tiempo real con conmutador Escritorio / Móvil fiel al diseño Techoze-04.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Trash2,
  Eye,
  Monitor,
  Smartphone,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Link2,
  FileEdit,
  Globe,
  Sparkles,
} from 'lucide-react';
import {
  HomepageBadgeVariant,
  HomepagePublishStatus,
  HomepageSectionItem,
  HeroSlideAdminInput,
} from '../../../types/homepage.types';
import {
  createAdminHeroSlide,
  updateAdminHeroSlide,
  validateHomepageSlideUrl,
  validateCampaignScheduleDates,
  isExternalHomepageUrl,
} from '../../../services/homepage.service';
import {
  ALLOWED_PUBLIC_ASSET_MIME_TYPES,
  MAX_PUBLIC_ASSET_SIZE_BYTES,
} from '../../../services/storage.service';

export interface HeroSlideFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSlide: HomepageSectionItem | null;
  nextSuggestedOrder: number;
  initialPreviewOnly?: boolean;
  onSaved: (savedSlide: HomepageSectionItem, isNew: boolean) => void;
}

const BADGE_VARIANT_OPTIONS: Array<{
  value: HomepageBadgeVariant;
  label: string;
}> = [
  { value: 'PRO', label: 'PRO (Índigo)' },
  { value: 'primary', label: 'Principal (Azul)' },
  { value: 'PERSONALIZADO', label: 'Personalizado (Ámbar)' },
  { value: 'FREE', label: 'FREE / Gratis (Esmeralda)' },
  { value: 'discount', label: 'Oferta / Descuento (Naranja)' },
  { value: 'dark', label: 'Oscuro (Slate)' },
];

const QUICK_INTERNAL_ROUTES: Array<{ label: string; url: string }> = [
  { label: 'Catálogo PRO', url: '/catalogo?modalidad=PRO' },
  { label: 'Recursos FREE', url: '/catalogo?modalidad=FREE' },
  { label: 'Categoría Sistemas', url: '/catalogo?categoria=sistemas' },
  { label: 'Categoría Excel', url: '/catalogo?categoria=excel' },
  { label: 'Solicitud a Medida', url: '/solicitud-personalizada' },
  { label: 'Soporte y FAQ', url: '/soporte' },
];

function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export const HeroSlideFormModal: React.FC<HeroSlideFormModalProps> = ({
  isOpen,
  onClose,
  editingSlide,
  nextSuggestedOrder,
  initialPreviewOnly = false,
  onSaved,
}) => {
  const [adminName, setAdminName] = useState('');
  const [badgeText, setBadgeText] = useState('PLANTILLAS Y SISTEMAS PRO');
  const [badgeVariant, setBadgeVariant] = useState<HomepageBadgeVariant>('PRO');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageAltText, setImageAltText] = useState('');

  // Estado de imagen Desktop (home/slides/desktop/)
  const [existingDesktopUrl, setExistingDesktopUrl] = useState<string | null>(null);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [desktopPreviewUrl, setDesktopPreviewUrl] = useState<string | null>(null);
  const [removeDesktopImage, setRemoveDesktopImage] = useState(false);
  const [desktopImageError, setDesktopImageError] = useState<string | null>(null);

  // Estado de imagen Mobile (home/slides/mobile/)
  const [existingMobileUrl, setExistingMobileUrl] = useState<string | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [mobilePreviewUrl, setMobilePreviewUrl] = useState<string | null>(null);
  const [removeMobileImage, setRemoveMobileImage] = useState(false);
  const [mobileImageError, setMobileImageError] = useState<string | null>(null);

  // Botones CTA y enlaces
  const [ctaPrimaryLabel, setCtaPrimaryLabel] = useState('Explorar Catálogo PRO');
  const [ctaPrimaryUrl, setCtaPrimaryUrl] = useState('/catalogo?modalidad=PRO');
  const [ctaSecondaryLabel, setCtaSecondaryLabel] = useState('Recursos FREE');
  const [ctaSecondaryUrl, setCtaSecondaryUrl] = useState('/catalogo?modalidad=FREE');
  const [openInNewTab, setOpenInNewTab] = useState(false);

  // Orden, estados y vigencia
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [publishStatus, setPublishStatus] =
    useState<HomepagePublishStatus>('PUBLISHED');
  const [startsAtLocal, setStartsAtLocal] = useState<string>('');
  const [endsAtLocal, setEndsAtLocal] = useState<string>('');

  // Vista previa en el modal
  const [previewViewport, setPreviewViewport] = useState<'DESKTOP' | 'MOBILE'>(
    'DESKTOP'
  );
  const [isPreviewTabOnly, setIsPreviewTabOnly] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);
    setDesktopImageError(null);
    setMobileImageError(null);
    setDesktopFile(null);
    setMobileFile(null);
    setRemoveDesktopImage(false);
    setRemoveMobileImage(false);
    setIsPreviewTabOnly(Boolean(initialPreviewOnly));
    setPreviewViewport('DESKTOP');

    if (editingSlide) {
      setAdminName(editingSlide.admin_name || '');
      setBadgeText(editingSlide.badge_text || '');
      setBadgeVariant(editingSlide.badge_variant || 'PRO');
      setTitle(editingSlide.title || '');
      setSubtitle(editingSlide.subtitle || '');
      setImageAltText(editingSlide.image_alt_text || '');
      setExistingDesktopUrl(editingSlide.image_desktop_url || null);
      setExistingMobileUrl(editingSlide.image_mobile_url || null);
      setDesktopPreviewUrl(editingSlide.image_desktop_url || null);
      setMobilePreviewUrl(editingSlide.image_mobile_url || null);
      setCtaPrimaryLabel(editingSlide.cta_primary_label || '');
      setCtaPrimaryUrl(editingSlide.cta_primary_url || '');
      setCtaSecondaryLabel(editingSlide.cta_secondary_label || '');
      setCtaSecondaryUrl(editingSlide.cta_secondary_url || '');
      setOpenInNewTab(Boolean(editingSlide.open_in_new_tab));
      setDisplayOrder(editingSlide.display_order ?? 1);
      setIsActive(editingSlide.is_active !== false);
      setPublishStatus(editingSlide.status || 'PUBLISHED');
      setStartsAtLocal(isoToDatetimeLocalValue(editingSlide.starts_at));
      setEndsAtLocal(isoToDatetimeLocalValue(editingSlide.ends_at));
    } else {
      setAdminName(`Slide ${nextSuggestedOrder} — Nueva Campaña`);
      setBadgeText('PLANTILLAS Y SISTEMAS PRO');
      setBadgeVariant('PRO');
      setTitle('');
      setSubtitle('');
      setImageAltText('');
      setExistingDesktopUrl(null);
      setExistingMobileUrl(null);
      setDesktopPreviewUrl(null);
      setMobilePreviewUrl(null);
      setCtaPrimaryLabel('Explorar Catálogo PRO');
      setCtaPrimaryUrl('/catalogo?modalidad=PRO');
      setCtaSecondaryLabel('Recursos FREE');
      setCtaSecondaryUrl('/catalogo?modalidad=FREE');
      setOpenInNewTab(false);
      setDisplayOrder(nextSuggestedOrder);
      setIsActive(true);
      setPublishStatus('PUBLISHED');
      setStartsAtLocal('');
      setEndsAtLocal('');
    }
  }, [isOpen, editingSlide, nextSuggestedOrder, initialPreviewOnly]);

  // Limpiar Object URLs temporales al desmontar o cambiar archivo
  useEffect(() => {
    return () => {
      if (desktopPreviewUrl && desktopPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(desktopPreviewUrl);
      }
      if (mobilePreviewUrl && mobilePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mobilePreviewUrl);
      }
    };
  }, [desktopPreviewUrl, mobilePreviewUrl]);

  if (!isOpen) return null;

  const validateSelectedAssetFile = (file: File): string | null => {
    if (
      !ALLOWED_PUBLIC_ASSET_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_PUBLIC_ASSET_MIME_TYPES)[number]
      )
    ) {
      return 'Formato no permitido. Usa JPG (image/jpeg), PNG (image/png), WEBP (image/webp) o SVG (image/svg+xml).';
    }
    if (file.size <= 0) {
      return 'El archivo de imagen seleccionado está vacío.';
    }
    if (file.size > MAX_PUBLIC_ASSET_SIZE_BYTES) {
      return 'La imagen supera el límite máximo permitido de 5 MB.';
    }
    return null;
  };

  const handleSelectDesktopFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateSelectedAssetFile(file);
    if (validationError) {
      setDesktopImageError(validationError);
      return;
    }

    setDesktopImageError(null);
    if (desktopPreviewUrl && desktopPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(desktopPreviewUrl);
    }
    setDesktopFile(file);
    setRemoveDesktopImage(false);
    setDesktopPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveDesktopImage = () => {
    if (desktopPreviewUrl && desktopPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(desktopPreviewUrl);
    }
    setDesktopFile(null);
    setDesktopPreviewUrl(null);
    setRemoveDesktopImage(true);
    setDesktopImageError(null);
  };

  const handleSelectMobileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateSelectedAssetFile(file);
    if (validationError) {
      setMobileImageError(validationError);
      return;
    }

    setMobileImageError(null);
    if (mobilePreviewUrl && mobilePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mobilePreviewUrl);
    }
    setMobileFile(file);
    setRemoveMobileImage(false);
    setMobilePreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveMobileImage = () => {
    if (mobilePreviewUrl && mobilePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(mobilePreviewUrl);
    }
    setMobileFile(null);
    setMobilePreviewUrl(null);
    setRemoveMobileImage(true);
    setMobileImageError(null);
  };

  const primaryUrlCheck = validateHomepageSlideUrl(ctaPrimaryUrl, {
    required: Boolean(ctaPrimaryLabel.trim()),
    fieldLabel: 'La URL del botón principal',
  });

  const secondaryUrlCheck = validateHomepageSlideUrl(ctaSecondaryUrl, {
    required: Boolean(ctaSecondaryLabel.trim()),
    fieldLabel: 'La URL del botón secundario',
  });

  const scheduleCheck = validateCampaignScheduleDates(
    startsAtLocal || null,
    endsAtLocal || null
  );

  const handleSubmitWithStatus = async (
    targetStatus: HomepagePublishStatus
  ) => {
    setFormError(null);

    if (adminName.trim().length < 2) {
      setFormError(
        'Ingresa un nombre interno administrativo para identificar este slide (mínimo 2 caracteres).'
      );
      return;
    }

    if (title.trim().length < 3) {
      setFormError(
        'Ingresa el título principal del slide (mínimo 3 caracteres).'
      );
      return;
    }

    if (!primaryUrlCheck.valid) {
      setFormError(primaryUrlCheck.error);
      return;
    }

    if (!secondaryUrlCheck.valid) {
      setFormError(secondaryUrlCheck.error);
      return;
    }

    if (!scheduleCheck.valid) {
      setFormError(scheduleCheck.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: HeroSlideAdminInput = {
        admin_name: adminName.trim(),
        badge_text: badgeText.trim() || null,
        badge_variant: badgeVariant,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_desktop_url: removeDesktopImage ? null : existingDesktopUrl,
        image_mobile_url: removeMobileImage ? null : existingMobileUrl,
        desktopImageFile: desktopFile,
        mobileImageFile: mobileFile,
        removeDesktopImage,
        removeMobileImage,
        image_alt_text: imageAltText.trim() || title.trim(),
        cta_primary_label: ctaPrimaryLabel.trim() || null,
        cta_primary_url: primaryUrlCheck.sanitizedUrl,
        cta_secondary_label: ctaSecondaryLabel.trim() || null,
        cta_secondary_url: secondaryUrlCheck.sanitizedUrl,
        open_in_new_tab: openInNewTab,
        display_order: Number(displayOrder) || 1,
        status: targetStatus,
        is_active: isActive,
        starts_at: scheduleCheck.startsAtIso,
        ends_at: scheduleCheck.endsAtIso,
      };

      const result = editingSlide
        ? await updateAdminHeroSlide(editingSlide.id, payload)
        : await createAdminHeroSlide(payload);

      if (result.error || !result.slide) {
        setFormError(
          result.error || 'No se pudo guardar el slide del Hero Banner.'
        );
        return;
      }

      onSaved(result.slide, !editingSlide);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePreviewImageUrl =
    previewViewport === 'MOBILE'
      ? mobilePreviewUrl || desktopPreviewUrl
      : desktopPreviewUrl || mobilePreviewUrl;

  const hasExternalLink =
    isExternalHomepageUrl(ctaPrimaryUrl) ||
    isExternalHomepageUrl(ctaSecondaryUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {isPreviewTabOnly
                  ? `Vista Previa: ${adminName || 'Slide del Hero'}`
                  : editingSlide
                    ? `Editar Slide del Hero: ${editingSlide.admin_name}`
                    : 'Nuevo Slide para el Hero Banner'}
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  publishStatus === 'PUBLISHED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {publishStatus === 'PUBLISHED' ? 'PUBLICADO' : 'BORRADOR (DRAFT)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura textos, botones, imágenes responsivas (`home/slides/desktop/` y `home/slides/mobile/`) y vigencia de campaña.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewTabOnly((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#0A68FF]" />
              <span>
                {isPreviewTabOnly ? 'Volver al Editor' : 'Solo Vista Previa'}
              </span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo Desplazable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. VISTA PREVIA EN VIVO DEL SLIDE (ESCRITORIO / MÓVIL) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0A68FF]" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Vista Previa en Vivo (Diseño Techoze-04)
                </span>
              </div>

              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('DESKTOP')}
                  className={`px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                    previewViewport === 'DESKTOP'
                      ? 'bg-[#0A68FF] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Escritorio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('MOBILE')}
                  className={`px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                    previewViewport === 'MOBILE'
                      ? 'bg-[#0A68FF] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Móvil</span>
                </button>
              </div>
            </div>

            {/* Simulador fiel al Hero de HomePage.tsx */}
            <div
              className={`mx-auto transition-all ${
                previewViewport === 'MOBILE' ? 'max-w-[380px]' : 'w-full'
              }`}
            >
              <div className="bg-[#0F172A] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-xs min-h-[280px]">
                {activePreviewImageUrl ? (
                  <>
                    <img
                      src={activePreviewImageUrl}
                      alt={imageAltText || title || 'Vista previa del slide'}
                      className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/85 to-[#0F172A]/45"
                    />
                  </>
                ) : (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#0A68FF]/15 blur-3xl"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"
                    />
                  </>
                )}

                <div className="relative z-10 space-y-3 max-w-2xl">
                  {badgeText.trim() && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[11px] font-bold uppercase tracking-widest">
                      <span>{badgeText}</span>
                    </div>
                  )}

                  <h3
                    className={`font-extrabold leading-tight tracking-tight text-white ${
                      previewViewport === 'MOBILE'
                        ? 'text-xl'
                        : 'text-2xl sm:text-3xl'
                    }`}
                  >
                    {title.trim() || 'Título principal del slide en la portada...'}
                  </h3>

                  {subtitle.trim() && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="relative z-10 pt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {ctaPrimaryLabel.trim() && (
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A68FF] text-white text-xs sm:text-sm font-bold shadow-xs">
                        <ShoppingCart className="w-4 h-4" />
                        <span>{ctaPrimaryLabel}</span>
                      </span>
                    )}
                    {ctaSecondaryLabel.trim() && (
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-white border border-white/25 text-xs sm:text-sm font-bold">
                        <span>{ctaSecondaryLabel}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-300 font-mono">
                    Orden #{displayOrder} •{' '}
                    {isActive ? 'Activo' : 'Inactivo'} •{' '}
                    {publishStatus === 'PUBLISHED' ? 'Publicado' : 'Borrador'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isPreviewTabOnly && (
            <>
              {/* 2. IDENTIFICACIÓN, TEXTOS Y BADGE */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Interno Administrativo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ej. Slide 1 — Campaña Kardex SUNAT"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Solo visible en `/admin/home` para identificar el slide.
                  </p>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto del Badge / Etiqueta Superior
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Ej. PLANTILLAS Y SISTEMAS PRO"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 uppercase focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estilo del Badge
                  </label>
                  <select
                    value={badgeVariant}
                    onChange={(e) =>
                      setBadgeVariant(e.target.value as HomepageBadgeVariant)
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                  >
                    {BADGE_VARIANT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-12">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título Principal del Slide <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Automatiza tu Empresa con Herramientas Listas para Usar en Soles (S/)"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>

                <div className="md:col-span-12">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtítulo o Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Describe el beneficio principal, modalidades o formas de pago en S/..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
              </div>

              {/* 3. IMÁGENES PARA ESCRITORIO Y MÓVIL (SUPABASE STORAGE: public-assets) */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Imágenes del Slide (Escritorio y Móvil)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Se almacenan en el bucket <code className="font-mono">public-assets</code> dentro de{' '}
                      <code className="font-mono">home/slides/desktop/</code> y{' '}
                      <code className="font-mono">home/slides/mobile/</code> (JPG, PNG, WEBP o SVG, máx. 5 MB). Si se omiten, se usa el fondo institucional oscuro Techoze-04.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cargador Imagen Escritorio */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-[#0A68FF]" />
                        Imagen de Escritorio (`home/slides/desktop/`)
                      </span>
                      {desktopPreviewUrl && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Configurada
                        </span>
                      )}
                    </div>

                    {desktopPreviewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/7]">
                        <img
                          src={desktopPreviewUrl}
                          alt={imageAltText || title || 'Imagen de escritorio'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white aspect-[16/7] flex flex-col items-center justify-center p-4 text-center">
                        <Monitor className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          Sin imagen de escritorio personalizada
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Se mostrará el fondo oscuro panorámico Techoze-04
                        </span>
                      </div>
                    )}

                    <input
                      ref={desktopInputRef}
                      type="file"
                      accept={ALLOWED_PUBLIC_ASSET_MIME_TYPES.join(',')}
                      onChange={handleSelectDesktopFile}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => desktopInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#0A68FF]" />
                        <span>
                          {desktopPreviewUrl
                            ? 'Reemplazar Imagen Desktop'
                            : 'Subir Imagen Desktop'}
                        </span>
                      </button>

                      {desktopPreviewUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveDesktopImage}
                          className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-bold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar</span>
                        </button>
                      )}
                    </div>

                    {desktopImageError && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                        <span>{desktopImageError}</span>
                      </div>
                    )}
                  </div>

                  {/* Cargador Imagen Móvil */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-[#0A68FF]" />
                        Imagen de Móvil (`home/slides/mobile/`)
                      </span>
                      {mobilePreviewUrl && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Configurada
                        </span>
                      )}
                    </div>

                    {mobilePreviewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-[16/7]">
                        <img
                          src={mobilePreviewUrl}
                          alt={imageAltText || title || 'Imagen móvil'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white aspect-[16/7] flex flex-col items-center justify-center p-4 text-center">
                        <Smartphone className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-600">
                          Sin imagen móvil específica
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Usará automáticamente la imagen de escritorio o el fondo oscuro
                        </span>
                      </div>
                    )}

                    <input
                      ref={mobileInputRef}
                      type="file"
                      accept={ALLOWED_PUBLIC_ASSET_MIME_TYPES.join(',')}
                      onChange={handleSelectMobileFile}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => mobileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#0A68FF]" />
                        <span>
                          {mobilePreviewUrl
                            ? 'Reemplazar Imagen Móvil'
                            : 'Subir Imagen Móvil'}
                        </span>
                      </button>

                      {mobilePreviewUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveMobileImage}
                          className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-bold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar</span>
                        </button>
                      )}
                    </div>

                    {mobileImageError && (
                      <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                        <span>{mobileImageError}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto Alternativo de Imágenes (`alt`)
                  </label>
                  <input
                    type="text"
                    value={imageAltText}
                    onChange={(e) => setImageAltText(e.target.value)}
                    placeholder="Descripción accesible de la imagen del slide (si se deja vacío, usa el título principal)"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
              </div>

              {/* 4. BOTONES Y ENLACES DEL SLIDE */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-[#0A68FF]" />
                      Botones de Acción y Enlaces (CTA Primario y Secundario)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Solo se permiten rutas internas que inicien con <code className="font-mono">/</code> o enlaces seguros <code className="font-mono">https://</code>.
                    </p>
                  </div>
                </div>

                {/* Atajos rápidos para rutas internas */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">
                    Atajos para Botón Principal:
                  </span>
                  {QUICK_INTERNAL_ROUTES.map((route) => (
                    <button
                      key={route.url}
                      type="button"
                      onClick={() => setCtaPrimaryUrl(route.url)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-[#0A68FF] text-slate-700 border border-slate-200 transition cursor-pointer"
                    >
                      {route.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Botón Principal */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">
                      Botón Principal (Primario)
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Texto del Botón Principal
                      </label>
                      <input
                        type="text"
                        value={ctaPrimaryLabel}
                        onChange={(e) => setCtaPrimaryLabel(e.target.value)}
                        placeholder="Ej. Explorar Catálogo PRO"
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        URL del Botón Principal
                      </label>
                      <input
                        type="text"
                        value={ctaPrimaryUrl}
                        onChange={(e) => setCtaPrimaryUrl(e.target.value)}
                        placeholder="Ej. /catalogo?modalidad=PRO"
                        className={`w-full h-9 px-3 rounded-lg border bg-white text-xs font-mono ${
                          !primaryUrlCheck.valid
                            ? 'border-red-400 text-red-700'
                            : 'border-slate-300 text-slate-900'
                        }`}
                      />
                      {!primaryUrlCheck.valid && (
                        <p className="text-[11px] text-red-600 mt-1">
                          {primaryUrlCheck.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botón Secundario */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">
                      Botón Secundario (Opcional)
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Texto del Botón Secundario
                      </label>
                      <input
                        type="text"
                        value={ctaSecondaryLabel}
                        onChange={(e) => setCtaSecondaryLabel(e.target.value)}
                        placeholder="Ej. Recursos FREE"
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        URL del Botón Secundario
                      </label>
                      <input
                        type="text"
                        value={ctaSecondaryUrl}
                        onChange={(e) => setCtaSecondaryUrl(e.target.value)}
                        placeholder="Ej. /catalogo?modalidad=FREE"
                        className={`w-full h-9 px-3 rounded-lg border bg-white text-xs font-mono ${
                          !secondaryUrlCheck.valid
                            ? 'border-red-400 text-red-700'
                            : 'border-slate-300 text-slate-900'
                        }`}
                      />
                      {!secondaryUrlCheck.valid && (
                        <p className="text-[11px] text-red-600 mt-1">
                          {secondaryUrlCheck.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={openInNewTab}
                    onChange={(e) => setOpenInNewTab(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#0A68FF] focus:ring-[#0A68FF]"
                  />
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Abrir enlaces externos en una nueva pestaña (`target="_blank"`)
                    {hasExternalLink ? ' — Detectado enlace externo http/https' : ''}
                  </span>
                </label>
              </div>

              {/* 5. ORDEN, VISIBILIDAD, ESTADO DE PUBLICACIÓN Y VIGENCIA DE CAMPAÑA */}
              <div className="border-t border-slate-200 pt-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#0A68FF]" />
                  Orden, Publicación y Programación de Campaña
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Orden de Visualización
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={displayOrder}
                      onChange={(e) =>
                        setDisplayOrder(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estado de Publicación
                    </label>
                    <select
                      value={publishStatus}
                      onChange={(e) =>
                        setPublishStatus(e.target.value as HomepagePublishStatus)
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900"
                    >
                      <option value="PUBLISHED">PUBLISHED (Publicado)</option>
                      <option value="DRAFT">DRAFT (Borrador)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Inicio de Campaña (Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={startsAtLocal}
                      onChange={(e) => setStartsAtLocal(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fin de Campaña (Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={endsAtLocal}
                      onChange={(e) => setEndsAtLocal(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs text-slate-800"
                    />
                  </div>
                </div>

                {!scheduleCheck.valid && (
                  <p className="text-xs text-red-600 font-semibold">
                    {scheduleCheck.error}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#0A68FF] focus:ring-[#0A68FF]"
                    />
                    <span>
                      Slide activo (cuando esté publicado y en fecha vigente, podrá mostrarse en portada)
                    </span>
                  </label>

                  {(startsAtLocal || endsAtLocal) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartsAtLocal('');
                        setEndsAtLocal('');
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-red-600 underline cursor-pointer"
                    >
                      Limpiar fechas de campaña (siempre vigente)
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pie del Modal con botones para Guardar como Borrador (DRAFT) o Publicar (PUBLISHED) */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 transition cursor-pointer"
          >
            Cancelar
          </button>

          {!isPreviewTabOnly && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitWithStatus('DRAFT')}
                className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileEdit className="w-4 h-4" />
                <span>
                  {isSubmitting && publishStatus === 'DRAFT'
                    ? 'Guardando borrador...'
                    : 'Guardar como Borrador (DRAFT)'}
                </span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmitWithStatus('PUBLISHED')}
                className="px-5 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>
                      {editingSlide
                        ? 'Guardar y Publicar (PUBLISHED)'
                        : 'Crear y Publicar Slide'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
