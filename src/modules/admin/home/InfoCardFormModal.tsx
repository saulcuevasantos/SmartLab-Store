import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Eye,
  AlertCircle,
  Globe,
  FileEdit,
  Upload,
  Trash2,
  Palette,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  HOMEPAGE_ALLOWED_LUCIDE_ICONS,
  HomepageAllowedLucideIcon,
  HomepageBadgeVariant,
  HomepagePublishStatus,
  HomepageSection,
  HomepageSectionItem,
  InfoCardAdminInput,
} from '../../../types/homepage.types';
import {
  createAdminInfoCard,
  updateAdminInfoCard,
  validateSafePlainText,
  validateHomepageSlideUrl,
  validateCampaignScheduleDates,
  validateIconHexColor,
} from '../../../services/homepage.service';
import {
  ALLOWED_PUBLIC_ASSET_MIME_TYPES,
  MAX_PUBLIC_ASSET_SIZE_BYTES,
} from '../../../services/storage.service';
import { CATEGORY_COLOR_FAMILIES } from '../../../components/common/CategoryVisual/CategoryVisual';
import { HomepageIconBadge } from './HomepageIconBadge';

interface InfoCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard: HomepageSectionItem | null;
  infoSections: HomepageSection[];
  suggestedDisplayOrder: number;
  previewOnly?: boolean;
  onSaved: (savedCard: HomepageSectionItem, isNew: boolean) => void;
}

function isoToLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const InfoCardFormModal: React.FC<InfoCardFormModalProps> = ({
  isOpen,
  onClose,
  editingCard,
  infoSections,
  suggestedDisplayOrder,
  previewOnly = false,
  onSaved,
}) => {
  const [sectionId, setSectionId] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('');
  const [badgeText, setBadgeText] = useState<string>('');
  const [badgeVariant, setBadgeVariant] =
    useState<HomepageBadgeVariant>('primary');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [iconName, setIconName] =
    useState<HomepageAllowedLucideIcon>('ShieldCheck');
  const [iconColorHex, setIconColorHex] = useState<string>('#0A68FF');

  const [imageDesktopUrl, setImageDesktopUrl] = useState<string>('');
  const [infoImageFile, setInfoImageFile] = useState<File | null>(null);
  const [infoImagePreviewUrl, setInfoImagePreviewUrl] = useState<string | null>(
    null
  );
  const [removeInfoImage, setRemoveInfoImage] = useState<boolean>(false);
  const [imageAltText, setImageAltText] = useState<string>('');

  const [ctaLabel, setCtaLabel] = useState<string>('');
  const [ctaUrl, setCtaUrl] = useState<string>('');
  const [openInNewTab, setOpenInNewTab] = useState<boolean>(false);

  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<HomepagePublishStatus>('PUBLISHED');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startsAtInput, setStartsAtInput] = useState<string>('');
  const [endsAtInput, setEndsAtInput] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setInfoImageFile(null);
    setInfoImagePreviewUrl(null);
    setRemoveInfoImage(false);

    if (editingCard) {
      setSectionId(editingCard.section_id || infoSections[0]?.id || '');
      setAdminName(editingCard.admin_name || '');
      setBadgeText(editingCard.badge_text || '');
      setBadgeVariant(editingCard.badge_variant || 'primary');
      setTitle(editingCard.title || '');
      setSubtitle(editingCard.subtitle || '');
      setIconName(
        (editingCard.icon_name as HomepageAllowedLucideIcon) || 'ShieldCheck'
      );
      setIconColorHex(
        (editingCard.icon_color_hex || '#0A68FF').toUpperCase()
      );
      setImageDesktopUrl(editingCard.image_desktop_url || '');
      setImageAltText(editingCard.image_alt_text || '');
      setCtaLabel(editingCard.cta_primary_label || '');
      setCtaUrl(editingCard.cta_primary_url || '');
      setOpenInNewTab(Boolean(editingCard.open_in_new_tab));
      setDisplayOrder(editingCard.display_order ?? suggestedDisplayOrder);
      setStatus(editingCard.status || 'PUBLISHED');
      setIsActive(editingCard.is_active !== false);
      setStartsAtInput(isoToLocalDatetimeInput(editingCard.starts_at));
      setEndsAtInput(isoToLocalDatetimeInput(editingCard.ends_at));
    } else {
      setSectionId(infoSections[0]?.id || '');
      setAdminName(`Bloque Informativo ${suggestedDisplayOrder}`);
      setBadgeText('GARANTÍA SMARTLAB');
      setBadgeVariant('primary');
      setTitle('');
      setSubtitle('');
      setIconName('ShieldCheck');
      setIconColorHex('#0A68FF');
      setImageDesktopUrl('');
      setImageAltText('');
      setCtaLabel('');
      setCtaUrl('');
      setOpenInNewTab(false);
      setDisplayOrder(suggestedDisplayOrder);
      setStatus('PUBLISHED');
      setIsActive(true);
      setStartsAtInput('');
      setEndsAtInput('');
    }
  }, [isOpen, editingCard, infoSections, suggestedDisplayOrder]);

  useEffect(() => {
    return () => {
      if (infoImagePreviewUrl) {
        URL.revokeObjectURL(infoImagePreviewUrl);
      }
    };
  }, [infoImagePreviewUrl]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (
      !ALLOWED_PUBLIC_ASSET_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_PUBLIC_ASSET_MIME_TYPES)[number]
      )
    ) {
      setErrorMsg(
        'Formato de imagen no válido. Usa JPG, PNG, WEBP o SVG.'
      );
      return;
    }

    if (file.size > MAX_PUBLIC_ASSET_SIZE_BYTES) {
      setErrorMsg('La imagen supera el límite máximo de 5 MB.');
      return;
    }

    setErrorMsg(null);
    if (infoImagePreviewUrl) {
      URL.revokeObjectURL(infoImagePreviewUrl);
    }
    setInfoImageFile(file);
    setInfoImagePreviewUrl(URL.createObjectURL(file));
    setRemoveInfoImage(false);
  };

  const effectivePreviewImage = removeInfoImage
    ? null
    : infoImagePreviewUrl || imageDesktopUrl.trim() || null;

  const handleSubmit = async (
    e: React.FormEvent,
    overrideStatus?: HomepagePublishStatus
  ) => {
    e.preventDefault();
    if (previewOnly) return;

    setErrorMsg(null);

    const adminCheck = validateSafePlainText(adminName, {
      required: true,
      minLength: 3,
      maxLength: 140,
      fieldLabel: 'El nombre interno del bloque informativo',
    });
    if (!adminCheck.valid) {
      setErrorMsg(adminCheck.error);
      return;
    }

    const titleCheck = validateSafePlainText(title, {
      required: true,
      minLength: 3,
      maxLength: 180,
      fieldLabel: 'El título del bloque informativo',
    });
    if (!titleCheck.valid) {
      setErrorMsg(titleCheck.error);
      return;
    }

    const descCheck = validateSafePlainText(subtitle, {
      required: true,
      minLength: 5,
      maxLength: 500,
      fieldLabel: 'La descripción del bloque informativo',
    });
    if (!descCheck.valid) {
      setErrorMsg(descCheck.error);
      return;
    }

    const hexCheck = validateIconHexColor(iconColorHex, true);
    if (!hexCheck.valid || !hexCheck.colorHex) {
      setErrorMsg(hexCheck.error);
      return;
    }

    if (ctaLabel.trim() && !ctaUrl.trim()) {
      setErrorMsg(
        'Si defines texto para el botón, su URL es obligatoria.'
      );
      return;
    }

    const urlCheck = validateHomepageSlideUrl(ctaUrl, {
      required: Boolean(ctaLabel.trim()),
      fieldLabel: 'La URL del botón del bloque informativo',
    });
    if (!urlCheck.valid) {
      setErrorMsg(urlCheck.error);
      return;
    }

    const scheduleCheck = validateCampaignScheduleDates(
      startsAtInput,
      endsAtInput
    );
    if (!scheduleCheck.valid) {
      setErrorMsg(scheduleCheck.error);
      return;
    }

    const finalStatus = overrideStatus || status;
    setIsSubmitting(true);

    try {
      const payload: InfoCardAdminInput = {
        section_id: sectionId || null,
        admin_name: adminCheck.sanitized!,
        badge_text: badgeText.trim() || null,
        badge_variant: badgeText.trim() ? badgeVariant : null,
        title: titleCheck.sanitized!,
        subtitle: descCheck.sanitized!,
        icon_name: iconName,
        icon_color_hex: hexCheck.colorHex,
        image_desktop_url: imageDesktopUrl.trim() || null,
        infoImageFile,
        removeInfoImage,
        image_alt_text: imageAltText.trim() || titleCheck.sanitized!,
        cta_primary_label: ctaLabel.trim() || null,
        cta_primary_url: urlCheck.sanitizedUrl,
        open_in_new_tab: openInNewTab,
        display_order: Number(displayOrder) || 1,
        status: finalStatus,
        is_active: isActive,
        starts_at: scheduleCheck.startsAtIso,
        ends_at: scheduleCheck.endsAtIso,
      };

      const res = editingCard
        ? await updateAdminInfoCard(editingCard.id, payload)
        : await createAdminInfoCard(payload);

      if (res.error || !res.infoCard) {
        setErrorMsg(res.error || 'No se pudo guardar el bloque informativo.');
        return;
      }

      onSaved(res.infoCard, !editingCard);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
              Sección INFO_BLOCK • item_type = INFO_CARD
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {previewOnly
                ? `Vista Previa: ${editingCard?.title || 'Bloque Informativo'}`
                : editingCard
                  ? `Editar Bloque Informativo: ${editingCard.admin_name}`
                  : 'Nuevo Bloque Informativo (INFO_CARD)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => handleSubmit(e)}
          className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vista Previa del Bloque Informativo */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#0A68FF]" />
              Vista Previa de la Tarjeta Informativa
            </span>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start gap-4 max-w-2xl">
              {effectivePreviewImage ? (
                <div className="w-full sm:w-36 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img
                    src={effectivePreviewImage}
                    alt={imageAltText || title || 'Vista previa'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <HomepageIconBadge
                  iconName={iconName}
                  iconColorHex={iconColorHex}
                  size="lg"
                />
              )}

              <div className="space-y-1.5 flex-1">
                {badgeText.trim() && (
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                    {badgeText.trim()}
                  </span>
                )}
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {title.trim() || 'Título del Bloque Informativo'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {subtitle.trim() ||
                    'Descripción clara del bloque informativo, proceso operativo o garantía oficial de SmartLab Store.'}
                </p>
                {ctaLabel.trim() && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0A68FF]">
                      <span>{ctaLabel.trim()}</span>
                      {openInNewTab ? (
                        <ExternalLink className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!previewOnly && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sección Padre (`INFO_BLOCK`)
                  </label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800"
                  >
                    {infoSections.length === 0 ? (
                      <option value="">
                        Crear/usar sección INFO_BLOCK automática
                      </option>
                    ) : (
                      infoSections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.admin_name} (#{sec.display_order})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Interno *
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ej. Garantía de Activación y Soporte"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Orden (`display_order`)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={displayOrder}
                    onChange={(e) =>
                      setDisplayOrder(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge Superior (opcional)
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="Ej. SOPORTE OFICIAL • GARANTÍA"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Variante de Badge
                  </label>
                  <select
                    value={badgeVariant}
                    onChange={(e) =>
                      setBadgeVariant(e.target.value as HomepageBadgeVariant)
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800"
                  >
                    <option value="primary">Primary (Azul)</option>
                    <option value="PRO">PRO (Azul corporativo)</option>
                    <option value="FREE">FREE (Esmeralda)</option>
                    <option value="PERSONALIZADO">PERSONALIZADO (Ámbar)</option>
                    <option value="discount">Discount (Naranja)</option>
                    <option value="success">Success (Verde)</option>
                    <option value="neutral">Neutral (Pizarra)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título Público *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Soporte Técnico y Actualizaciones Verificadas"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción (Texto plano seguro, sin HTML/JS) *
                  </label>
                  <textarea
                    rows={3}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Describe el bloque informativo..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Icono Lucide + Color HEX */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Icono Lucide
                  </label>
                  <select
                    value={iconName}
                    onChange={(e) =>
                      setIconName(e.target.value as HomepageAllowedLucideIcon)
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800"
                  >
                    {HOMEPAGE_ALLOWED_LUCIDE_ICONS.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Color HEX del Icono
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        /^#[0-9A-Fa-f]{6}$/.test(iconColorHex)
                          ? iconColorHex
                          : '#0A68FF'
                      }
                      onChange={(e) =>
                        setIconColorHex(e.target.value.toUpperCase())
                      }
                      className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <input
                      type="text"
                      value={iconColorHex}
                      onChange={(e) =>
                        setIconColorHex(e.target.value.toUpperCase())
                      }
                      maxLength={7}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Paleta rápida */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/60 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#0A68FF]" />
                  Selector rápido de color HEX del icono
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {CATEGORY_COLOR_FAMILIES.flatMap((fam) => fam.colors).map(
                    (swatch) => (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() =>
                          setIconColorHex(swatch.hex.toUpperCase())
                        }
                        title={`${swatch.name} (${swatch.hex})`}
                        className={`h-6 rounded-md border transition cursor-pointer ${
                          iconColorHex.trim().toUpperCase() ===
                          swatch.hex.toUpperCase()
                            ? 'ring-2 ring-slate-900 border-white'
                            : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Imagen opcional en public-assets/home/info/ */}
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Imagen Opcional (`public-assets/home/info/`)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Si no subes una imagen, se mostrará el icono Lucide con su color HEX.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Imagen</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    {effectivePreviewImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setInfoImageFile(null);
                          setInfoImagePreviewUrl(null);
                          setImageDesktopUrl('');
                          setRemoveInfoImage(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      URL de Imagen (opcional si subes archivo)
                    </label>
                    <input
                      type="text"
                      value={imageDesktopUrl}
                      onChange={(e) => {
                        setImageDesktopUrl(e.target.value);
                        setRemoveInfoImage(false);
                      }}
                      placeholder="https://... o /ruta-interna"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Texto Alternativo (`image_alt_text`)
                    </label>
                    <input
                      type="text"
                      value={imageAltText}
                      onChange={(e) => setImageAltText(e.target.value)}
                      placeholder="Descripción accesible de la imagen"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Botón y enlace opcional */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto del Botón (opcional)
                  </label>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="Ej. Conocer más"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL del Botón (`/ruta` o `https://`)
                  </label>
                  <input
                    type="text"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="/catalogo o https://wa.me/..."
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openInNewTab}
                      onChange={(e) => setOpenInNewTab(e.target.checked)}
                      className="w-4 h-4 accent-[#0A68FF]"
                    />
                    <span>Abrir enlace en nueva pestaña</span>
                  </label>
                </div>
              </div>

              {/* Vigencia y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Inicio (`starts_at`)
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAtInput}
                    onChange={(e) => setStartsAtInput(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fin (`ends_at`)
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAtInput}
                    onChange={(e) => setEndsAtInput(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Publicación
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as HomepagePublishStatus)
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 accent-[#0A68FF]"
                    />
                    <span>Tarjeta Activa</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Pie */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
            >
              {previewOnly ? 'Cerrar Vista Previa' : 'Cancelar'}
            </button>

            {!previewOnly && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmit(e, 'DRAFT')}
                  className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Guardar Borrador</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                  className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? 'Guardando...'
                      : editingCard
                        ? 'Guardar y Publicar'
                        : 'Crear y Publicar'}
                  </span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
