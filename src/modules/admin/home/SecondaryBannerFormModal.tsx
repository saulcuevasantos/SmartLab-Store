/**
 * SmartLab Store — Modal de Creación y Edición de Banners Promocionales Secundarios (Sprint C3)
 * Administra registros `item_type = 'SECONDARY_BANNER'` en `public.homepage_section_items` (sección padre `PROMO_BANNERS`)
 * y gestiona imágenes de escritorio (`public-assets/home/banners/desktop/`) y móvil (`public-assets/home/banners/mobile/`).
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Upload,
  Trash2,
  Eye,
  Monitor,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ArrowRight,
  Layers,
} from 'lucide-react';
import {
  HomepageBadgeVariant,
  HomepagePublishStatus,
  HomepageSectionItem,
  SecondaryBannerAdminInput,
} from '../../../types/homepage.types';
import {
  createAdminSecondaryBanner,
  updateAdminSecondaryBanner,
  evaluateCampaignScheduleState,
} from '../../../services/homepage.service';
import {
  ALLOWED_PUBLIC_ASSET_MIME_TYPES,
  MAX_PUBLIC_ASSET_SIZE_BYTES,
} from '../../../services/storage.service';

function validatePublicImageFile(file: File): string | null {
  if (
    !(ALLOWED_PUBLIC_ASSET_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return 'Formato de imagen no válido. Usa únicamente JPG, PNG, WEBP o SVG.';
  }
  if (file.size > MAX_PUBLIC_ASSET_SIZE_BYTES) {
    return 'La imagen supera el límite máximo permitido de 5 MB.';
  }
  return null;
}

interface SecondaryBannerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBanner: HomepageSectionItem | null;
  suggestedDisplayOrder: number;
  previewOnly?: boolean;
  onSaved: (savedBanner: HomepageSectionItem, isNew: boolean) => void;
}

const BADGE_VARIANT_OPTIONS: Array<{
  value: HomepageBadgeVariant;
  label: string;
  bannerBgClass: string;
  badgeClass: string;
}> = [
  {
    value: 'PRO',
    label: 'EXCEL & SHEETS PRO (Grafito Oscuro + Esmeralda)',
    bannerBgClass: 'from-slate-900 to-slate-800',
    badgeClass:
      'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
  },
  {
    value: 'discount',
    label: 'AUTOMATIZACIONES & APPS (Azul / Índigo Corporativo)',
    bannerBgClass: 'from-[#0A68FF] to-indigo-700',
    badgeClass: 'bg-white/15 text-white border border-white/25',
  },
  {
    value: 'PERSONALIZADO',
    label: 'DESARROLLO A MEDIDA (Morado Corporativo)',
    bannerBgClass: 'from-purple-900 to-indigo-900',
    badgeClass: 'bg-purple-400/20 text-purple-200 border border-purple-300/30',
  },
  {
    value: 'FREE',
    label: 'RECURSOS FREE (Esmeralda Oscuro)',
    bannerBgClass: 'from-emerald-900 to-teal-800',
    badgeClass:
      'bg-emerald-400/20 text-emerald-200 border border-emerald-300/30',
  },
  {
    value: 'primary',
    label: 'DESTACADO PRINCIPAL (Azul Marino)',
    bannerBgClass: 'from-blue-900 to-slate-900',
    badgeClass: 'bg-blue-400/20 text-blue-200 border border-blue-300/30',
  },
  {
    value: 'warning',
    label: 'CAMPAÑA ESPECIAL (Ámbar / Naranja)',
    bannerBgClass: 'from-amber-800 to-orange-900',
    badgeClass: 'bg-amber-300/20 text-amber-100 border border-amber-200/30',
  },
  {
    value: 'danger',
    label: 'LIQUIDACIÓN / URGENCIA (Rojo Oscuro)',
    bannerBgClass: 'from-red-900 to-rose-900',
    badgeClass: 'bg-red-300/20 text-red-100 border border-red-200/30',
  },
  {
    value: 'dark',
    label: 'CORPORATIVO OSCURO (Pizarra)',
    bannerBgClass: 'from-slate-950 to-slate-800',
    badgeClass: 'bg-slate-700 text-slate-200 border border-slate-600',
  },
];

const QUICK_DESTINATION_SUGGESTIONS = [
  { label: 'Plantillas Excel', url: '/catalogo?categoria=excel' },
  { label: 'Apps Android', url: '/catalogo?categoria=android_apps' },
  { label: 'Sistemas Web', url: '/catalogo?categoria=sistemas' },
  { label: 'Macros y Automatización', url: '/catalogo?categoria=macros' },
  { label: 'Solicitud a Medida', url: '/solicitud-personalizada' },
];

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export const SecondaryBannerFormModal: React.FC<
  SecondaryBannerFormModalProps
> = ({
  isOpen,
  onClose,
  editingBanner,
  suggestedDisplayOrder,
  previewOnly = false,
  onSaved,
}) => {
  const [adminName, setAdminName] = useState<string>('');
  const [badgeText, setBadgeText] = useState<string>('EXCEL & GOOGLE SHEETS PRO');
  const [badgeVariant, setBadgeVariant] = useState<HomepageBadgeVariant>('PRO');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');

  const [imageDesktopUrl, setImageDesktopUrl] = useState<string>('');
  const [imageMobileUrl, setImageMobileUrl] = useState<string>('');
  const [imageAltText, setImageAltText] = useState<string>('');

  const [desktopImageFile, setDesktopImageFile] = useState<File | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [desktopPreviewUrl, setDesktopPreviewUrl] = useState<string | null>(
    null
  );
  const [mobilePreviewUrl, setMobilePreviewUrl] = useState<string | null>(null);
  const [removeDesktopImage, setRemoveDesktopImage] = useState<boolean>(false);
  const [removeMobileImage, setRemoveMobileImage] = useState<boolean>(false);

  const [ctaPrimaryLabel, setCtaPrimaryLabel] = useState<string>(
    'Ver Plantillas Excel en S/'
  );
  const [ctaPrimaryUrl, setCtaPrimaryUrl] = useState<string>(
    '/catalogo?categoria=excel'
  );
  const [ctaSecondaryLabel, setCtaSecondaryLabel] = useState<string>('');
  const [ctaSecondaryUrl, setCtaSecondaryUrl] = useState<string>('');
  const [openInNewTab, setOpenInNewTab] = useState<boolean>(false);

  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<HomepagePublishStatus>('PUBLISHED');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');

  const [previewViewport, setPreviewViewport] = useState<'DESKTOP' | 'MOBILE'>(
    'DESKTOP'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setDesktopImageFile(null);
    setMobileImageFile(null);
    setDesktopPreviewUrl(null);
    setMobilePreviewUrl(null);
    setRemoveDesktopImage(false);
    setRemoveMobileImage(false);
    setPreviewViewport('DESKTOP');

    if (editingBanner) {
      setAdminName(editingBanner.admin_name || '');
      setBadgeText(editingBanner.badge_text || '');
      setBadgeVariant(editingBanner.badge_variant || 'PRO');
      setTitle(editingBanner.title || '');
      setSubtitle(editingBanner.subtitle || '');
      setImageDesktopUrl(editingBanner.image_desktop_url || '');
      setImageMobileUrl(editingBanner.image_mobile_url || '');
      setImageAltText(editingBanner.image_alt_text || editingBanner.title || '');
      setCtaPrimaryLabel(editingBanner.cta_primary_label || '');
      setCtaPrimaryUrl(editingBanner.cta_primary_url || '');
      setCtaSecondaryLabel(editingBanner.cta_secondary_label || '');
      setCtaSecondaryUrl(editingBanner.cta_secondary_url || '');
      setOpenInNewTab(Boolean(editingBanner.open_in_new_tab));
      setDisplayOrder(editingBanner.display_order ?? 1);
      setStatus(editingBanner.status || 'PUBLISHED');
      setIsActive(editingBanner.is_active !== false);
      setStartsAt(toDatetimeLocalValue(editingBanner.starts_at));
      setEndsAt(toDatetimeLocalValue(editingBanner.ends_at));
    } else {
      setAdminName(`Banner Secundario ${suggestedDisplayOrder}`);
      setBadgeText('PROMOCIÓN DESTACADA');
      setBadgeVariant('PRO');
      setTitle('');
      setSubtitle('');
      setImageDesktopUrl('');
      setImageMobileUrl('');
      setImageAltText('');
      setCtaPrimaryLabel('Explorar Catálogo');
      setCtaPrimaryUrl('/catalogo');
      setCtaSecondaryLabel('');
      setCtaSecondaryUrl('');
      setOpenInNewTab(false);
      setDisplayOrder(suggestedDisplayOrder);
      setStatus('PUBLISHED');
      setIsActive(true);
      setStartsAt('');
      setEndsAt('');
    }
  }, [isOpen, editingBanner, suggestedDisplayOrder]);

  useEffect(() => {
    if (!desktopImageFile) {
      setDesktopPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(desktopImageFile);
    setDesktopPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [desktopImageFile]);

  useEffect(() => {
    if (!mobileImageFile) {
      setMobilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(mobileImageFile);
    setMobilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mobileImageFile]);

  if (!isOpen) return null;

  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const err = validatePublicImageFile(file);
    if (err) {
      setFormError(err);
      e.target.value = '';
      return;
    }
    setFormError(null);
    setDesktopImageFile(file);
    setRemoveDesktopImage(false);
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const err = validatePublicImageFile(file);
    if (err) {
      setFormError(err);
      e.target.value = '';
      return;
    }
    setFormError(null);
    setMobileImageFile(file);
    setRemoveMobileImage(false);
  };

  const effectiveDesktopUrl = removeDesktopImage
    ? null
    : desktopPreviewUrl || imageDesktopUrl.trim() || null;

  const effectiveMobileUrl = removeMobileImage
    ? null
    : mobilePreviewUrl || imageMobileUrl.trim() || null;

  const activePreviewImageUrl =
    previewViewport === 'MOBILE'
      ? effectiveMobileUrl || effectiveDesktopUrl
      : effectiveDesktopUrl || effectiveMobileUrl;

  const currentBadgeOption =
    BADGE_VARIANT_OPTIONS.find((opt) => opt.value === badgeVariant) ||
    BADGE_VARIANT_OPTIONS[0];

  const schedulePreviewState = evaluateCampaignScheduleState(
    startsAt ? new Date(startsAt).toISOString() : null,
    endsAt ? new Date(endsAt).toISOString() : null
  );

  const handleSave = async (targetStatus: HomepagePublishStatus) => {
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: SecondaryBannerAdminInput = {
        admin_name: adminName,
        badge_text: badgeText.trim() || null,
        badge_variant: badgeVariant,
        title,
        subtitle: subtitle.trim() || null,
        image_desktop_url: removeDesktopImage
          ? null
          : imageDesktopUrl.trim() || null,
        image_mobile_url: removeMobileImage
          ? null
          : imageMobileUrl.trim() || null,
        desktopImageFile,
        mobileImageFile,
        removeDesktopImage,
        removeMobileImage,
        image_alt_text: imageAltText.trim() || title.trim(),
        cta_primary_label: ctaPrimaryLabel.trim() || null,
        cta_primary_url: ctaPrimaryUrl.trim() || null,
        cta_secondary_label: ctaSecondaryLabel.trim() || null,
        cta_secondary_url: ctaSecondaryUrl.trim() || null,
        open_in_new_tab: openInNewTab,
        display_order: displayOrder,
        status: targetStatus,
        is_active: isActive,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      };

      const result = editingBanner
        ? await updateAdminSecondaryBanner(editingBanner.id, payload)
        : await createAdminSecondaryBanner(payload);

      if (result.error || !result.banner) {
        setFormError(
          result.error || 'No se pudo guardar el banner promocional secundario.'
        );
        return;
      }

      onSaved(result.banner, !editingBanner);
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Error inesperado al guardar el banner secundario.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secondary-banner-modal-title"
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="secondary-banner-modal-title"
                className="text-base sm:text-lg font-extrabold tracking-tight"
              >
                {previewOnly
                  ? `Vista Previa: ${
                      editingBanner?.admin_name || 'Banner Secundario'
                    }`
                  : editingBanner
                    ? `Editar Banner Secundario: ${editingBanner.admin_name}`
                    : 'Nuevo Banner Promocional Secundario'}
              </h2>
              <p className="text-xs text-slate-300">
                Ítem `SECONDARY_BANNER` en `PROMO_BANNERS` • Imágenes en `home/banners/desktop/` y `home/banners/mobile/`
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {formError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Simulador Visual en Vivo (Escritorio / Móvil) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0A68FF]" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                  Vista Previa en Vivo del Banner Secundario ({previewViewport})
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

            <div
              className={`mx-auto transition-all ${
                previewViewport === 'MOBILE' ? 'max-w-[360px]' : 'w-full'
              }`}
            >
              <div
                className={`rounded-2xl bg-gradient-to-r ${currentBadgeOption.bannerBgClass} text-white p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-xs relative overflow-hidden min-h-[210px]`}
              >
                {activePreviewImageUrl && (
                  <>
                    <img
                      src={activePreviewImageUrl}
                      alt={imageAltText || title || 'Banner secundario'}
                      className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/40"
                    />
                  </>
                )}

                <div className="space-y-2.5 max-w-lg relative z-10">
                  {badgeText.trim() && (
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${currentBadgeOption.badgeClass}`}
                    >
                      {badgeText.trim()}
                    </span>
                  )}
                  <h3 className="text-xl sm:text-2xl font-extrabold leading-snug text-white">
                    {title.trim() || 'Título del banner promocional secundario'}
                  </h3>
                  {subtitle.trim() && (
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {subtitle.trim()}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-10">
                  {ctaPrimaryLabel.trim() && (
                    <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-900 text-xs font-extrabold">
                      <span>{ctaPrimaryLabel.trim()}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {ctaSecondaryLabel.trim() && (
                    <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/15 border border-white/30 text-white text-xs font-bold">
                      <span>{ctaSecondaryLabel.trim()}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!previewOnly && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Columna Izquierda: Textos y Botones */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    1. Textos y Estilo del Banner Secundario
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre Interno Administrativo *
                      </label>
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="Ej. Banner Secundario 1 — Excel & Google Sheets PRO"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Orden (`display_order`)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={displayOrder}
                        onChange={(e) =>
                          setDisplayOrder(
                            Math.max(0, parseInt(e.target.value || '0', 10))
                          )
                        }
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Texto del Badge
                      </label>
                      <input
                        type="text"
                        value={badgeText}
                        onChange={(e) => setBadgeText(e.target.value)}
                        placeholder="Ej. EXCEL & GOOGLE SHEETS PRO"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Variante del Badge y Tema Visual
                      </label>
                      <select
                        value={badgeVariant}
                        onChange={(e) =>
                          setBadgeVariant(e.target.value as HomepageBadgeVariant)
                        }
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      >
                        {BADGE_VARIANT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título Principal del Banner *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej. Plantillas Financieras, Kardex SUNAT y Planillas Automatizadas"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descripción (`subtitle`)
                    </label>
                    <textarea
                      rows={2}
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Ej. Ahorra decenas de horas operativas con hojas de cálculo listas para usar..."
                      className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                </div>

                {/* Botones CTA Principal y Secundario */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    2. Botón Principal y Botón Secundario Opcional
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Texto del Botón Principal
                      </label>
                      <input
                        type="text"
                        value={ctaPrimaryLabel}
                        onChange={(e) => setCtaPrimaryLabel(e.target.value)}
                        placeholder="Ej. Ver Plantillas Excel en S/"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        URL del Botón Principal
                      </label>
                      <input
                        type="text"
                        value={ctaPrimaryUrl}
                        onChange={(e) => setCtaPrimaryUrl(e.target.value)}
                        placeholder="/catalogo?categoria=excel"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Rutas rápidas:
                    </span>
                    {QUICK_DESTINATION_SUGGESTIONS.map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => setCtaPrimaryUrl(item.url)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-slate-200 text-[11px] font-medium text-slate-700 hover:text-[#0A68FF] transition cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Texto del Botón Secundario (Opcional)
                      </label>
                      <input
                        type="text"
                        value={ctaSecondaryLabel}
                        onChange={(e) => setCtaSecondaryLabel(e.target.value)}
                        placeholder="Ej. Ver Demo"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        URL del Botón Secundario (Opcional)
                      </label>
                      <input
                        type="text"
                        value={ctaSecondaryUrl}
                        onChange={(e) => setCtaSecondaryUrl(e.target.value)}
                        placeholder="/catalogo?modalidad=FREE"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openInNewTab}
                      onChange={(e) => setOpenInNewTab(e.target.checked)}
                      className="w-4 h-4 accent-[#0A68FF] rounded"
                    />
                    <span>
                      Abrir enlaces en una nueva pestaña (`open_in_new_tab`)
                    </span>
                  </label>
                </div>
              </div>

              {/* Columna Derecha: Imágenes en Storage + Publicación */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    3. Imágenes Desktop y Mobile (`public-assets`)
                  </h3>

                  {/* Imagen Escritorio */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-[#0A68FF]" />
                        <span>Escritorio (`home/banners/desktop/`)</span>
                      </span>
                      {effectiveDesktopUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDesktopImageFile(null);
                            setImageDesktopUrl('');
                            setRemoveDesktopImage(true);
                          }}
                          className="text-[11px] font-bold text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Quitar
                        </button>
                      )}
                    </div>

                    <label className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 hover:border-[#0A68FF] bg-slate-50 hover:bg-blue-50/40 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-[#0A68FF]" />
                      <span>
                        {effectiveDesktopUrl
                          ? 'Reemplazar imagen de escritorio'
                          : 'Subir imagen de escritorio'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={handleDesktopFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Imagen Móvil */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Móvil Opcional (`home/banners/mobile/`)</span>
                      </span>
                      {effectiveMobileUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileImageFile(null);
                            setImageMobileUrl('');
                            setRemoveMobileImage(true);
                          }}
                          className="text-[11px] font-bold text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Quitar
                        </button>
                      )}
                    </div>

                    <label className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {effectiveMobileUrl
                          ? 'Reemplazar imagen móvil'
                          : 'Subir imagen móvil (opcional)'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={handleMobileFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Texto alternativo (`image_alt_text`)
                    </label>
                    <input
                      type="text"
                      value={imageAltText}
                      onChange={(e) => setImageAltText(e.target.value)}
                      placeholder="Descripción accesible del banner"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                    />
                  </div>
                </div>

                {/* Publicación y Vigencia */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0A68FF]" />
                    <span>4. Publicación y Vigencia</span>
                  </h3>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Banner Activo (`is_active`)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Controla su visibilidad inmediata
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 accent-[#0A68FF] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Estado (`status`)
                    </label>
                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value as HomepagePublishStatus)
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900"
                    >
                      <option value="PUBLISHED">PUBLISHED — Publicado</option>
                      <option value="DRAFT">DRAFT — Borrador</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Inicio (`starts_at` — Opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Fin (`ends_at` — Opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between">
                    <span className="font-semibold text-slate-600">
                      Vigencia:
                    </span>
                    {schedulePreviewState === 'ACTIVE_NOW' && (
                      <span className="font-bold text-emerald-700">
                        En vigencia actual
                      </span>
                    )}
                    {schedulePreviewState === 'SCHEDULED_FUTURE' && (
                      <span className="font-bold text-blue-700">
                        Programado a futuro
                      </span>
                    )}
                    {schedulePreviewState === 'EXPIRED' && (
                      <span className="font-bold text-red-600">
                        Campaña vencida
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            {previewOnly ? 'Cerrar Vista Previa' : 'Cancelar'}
          </button>

          {!previewOnly && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSave('DRAFT')}
                className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-700" />
                <span>Guardar como Borrador (`DRAFT`)</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSave('PUBLISHED')}
                className="px-5 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Guardando...'
                    : editingBanner
                      ? 'Guardar y Publicar (`PUBLISHED`)'
                      : 'Crear y Publicar (`PUBLISHED`)'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
