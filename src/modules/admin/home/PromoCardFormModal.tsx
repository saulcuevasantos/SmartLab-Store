/**
 * SmartLab Store — Modal de Creación y Edición de Tarjetas Promocionales Laterales del Hero (Sprint C3)
 * Administra registros `item_type = 'PROMO_CARD'` en `public.homepage_section_items` (sección padre `hero_main`)
 * y gestiona imágenes opcionales en `public-assets/home/promos/`.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Upload,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  HomepageBadgeVariant,
  HomepagePublishStatus,
  HomepageSectionItem,
  PromoCardAdminInput,
} from '../../../types/homepage.types';
import {
  createAdminHeroPromoCard,
  updateAdminHeroPromoCard,
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

interface PromoCardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCard: HomepageSectionItem | null;
  suggestedDisplayOrder: number;
  previewOnly?: boolean;
  onSaved: (savedCard: HomepageSectionItem, isNew: boolean) => void;
}

const BADGE_VARIANT_OPTIONS: Array<{
  value: HomepageBadgeVariant;
  label: string;
  cardBadgeClass: string;
  cardBorderClass: string;
}> = [
  {
    value: 'discount',
    label: 'Oferta / Descuento (Ámbar / Azul)',
    cardBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    cardBorderClass: 'border-slate-200 hover:border-[#0A68FF]',
  },
  {
    value: 'PERSONALIZADO',
    label: 'A MEDIDA / PERSONALIZADO (Morado)',
    cardBadgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    cardBorderClass: 'border-purple-200/80 hover:border-purple-600',
  },
  {
    value: 'PRO',
    label: 'PRO (Azul corporativo)',
    cardBadgeClass: 'bg-blue-50 text-[#0A68FF] border-blue-200',
    cardBorderClass: 'border-slate-200 hover:border-[#0A68FF]',
  },
  {
    value: 'FREE',
    label: 'FREE (Verde esmeralda)',
    cardBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardBorderClass: 'border-emerald-200 hover:border-emerald-600',
  },
  {
    value: 'primary',
    label: 'Destacado Principal (Índigo)',
    cardBadgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardBorderClass: 'border-indigo-200 hover:border-indigo-600',
  },
  {
    value: 'warning',
    label: 'Campaña Especial (Naranja)',
    cardBadgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    cardBorderClass: 'border-orange-200 hover:border-orange-500',
  },
  {
    value: 'danger',
    label: 'Urgencia / Liquidación (Rojo)',
    cardBadgeClass: 'bg-red-50 text-red-700 border-red-200',
    cardBorderClass: 'border-red-200 hover:border-red-500',
  },
  {
    value: 'neutral',
    label: 'Neutro (Pizarra)',
    cardBadgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    cardBorderClass: 'border-slate-200 hover:border-slate-400',
  },
];

const QUICK_DESTINATION_SUGGESTIONS = [
  { label: 'Sistemas PRO', url: '/catalogo?categoria=sistemas' },
  { label: 'Solicitud Personalizada', url: '/solicitud-personalizada' },
  { label: 'Catálogo PRO', url: '/catalogo?modalidad=PRO' },
  { label: 'Plantillas Excel', url: '/catalogo?categoria=excel' },
  { label: 'Apps Android', url: '/catalogo?categoria=android_apps' },
];

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export const PromoCardFormModal: React.FC<PromoCardFormModalProps> = ({
  isOpen,
  onClose,
  editingCard,
  suggestedDisplayOrder,
  previewOnly = false,
  onSaved,
}) => {
  const [adminName, setAdminName] = useState<string>('');
  const [badgeText, setBadgeText] = useState<string>('OFERTA -25%');
  const [badgeVariant, setBadgeVariant] =
    useState<HomepageBadgeVariant>('discount');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageAltText, setImageAltText] = useState<string>('');
  const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
  const [promoFilePreviewUrl, setPromoFilePreviewUrl] = useState<string | null>(
    null
  );
  const [removePromoImage, setRemovePromoImage] = useState<boolean>(false);

  const [ctaPrimaryLabel, setCtaPrimaryLabel] =
    useState<string>('Ver Sistemas PRO');
  const [ctaPrimaryUrl, setCtaPrimaryUrl] = useState<string>(
    '/catalogo?categoria=sistemas'
  );
  const [openInNewTab, setOpenInNewTab] = useState<boolean>(false);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [status, setStatus] = useState<HomepagePublishStatus>('PUBLISHED');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setPromoImageFile(null);
    setPromoFilePreviewUrl(null);
    setRemovePromoImage(false);

    if (editingCard) {
      setAdminName(editingCard.admin_name || '');
      setBadgeText(editingCard.badge_text || '');
      setBadgeVariant(editingCard.badge_variant || 'discount');
      setTitle(editingCard.title || '');
      setSubtitle(editingCard.subtitle || '');
      setImageUrl(editingCard.image_desktop_url || '');
      setImageAltText(editingCard.image_alt_text || editingCard.title || '');
      setCtaPrimaryLabel(editingCard.cta_primary_label || '');
      setCtaPrimaryUrl(editingCard.cta_primary_url || '');
      setOpenInNewTab(Boolean(editingCard.open_in_new_tab));
      setDisplayOrder(editingCard.display_order ?? 1);
      setStatus(editingCard.status || 'PUBLISHED');
      setIsActive(editingCard.is_active !== false);
      setStartsAt(toDatetimeLocalValue(editingCard.starts_at));
      setEndsAt(toDatetimeLocalValue(editingCard.ends_at));
    } else {
      setAdminName(`Tarjeta Lateral ${suggestedDisplayOrder}`);
      setBadgeText('OFERTA ESPECIAL');
      setBadgeVariant('discount');
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setImageAltText('');
      setCtaPrimaryLabel('Explorar Ahora');
      setCtaPrimaryUrl('/catalogo?modalidad=PRO');
      setOpenInNewTab(false);
      setDisplayOrder(suggestedDisplayOrder);
      setStatus('PUBLISHED');
      setIsActive(true);
      setStartsAt('');
      setEndsAt('');
    }
  }, [isOpen, editingCard, suggestedDisplayOrder]);

  useEffect(() => {
    if (!promoImageFile) {
      setPromoFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(promoImageFile);
    setPromoFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [promoImageFile]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const validationError = validatePublicImageFile(file);
    if (validationError) {
      setFormError(validationError);
      e.target.value = '';
      return;
    }
    setFormError(null);
    setPromoImageFile(file);
    setRemovePromoImage(false);
  };

  const effectiveImageUrl = removePromoImage
    ? null
    : promoFilePreviewUrl || imageUrl.trim() || null;

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
      const payload: PromoCardAdminInput = {
        admin_name: adminName,
        badge_text: badgeText.trim() || null,
        badge_variant: badgeVariant,
        title,
        subtitle: subtitle.trim() || null,
        image_desktop_url: removePromoImage ? null : imageUrl.trim() || null,
        promoImageFile,
        removePromoImage,
        image_alt_text: imageAltText.trim() || title.trim(),
        cta_primary_label: ctaPrimaryLabel.trim() || null,
        cta_primary_url: ctaPrimaryUrl.trim() || null,
        open_in_new_tab: openInNewTab,
        display_order: displayOrder,
        status: targetStatus,
        is_active: isActive,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      };

      const result = editingCard
        ? await updateAdminHeroPromoCard(editingCard.id, payload)
        : await createAdminHeroPromoCard(payload);

      if (result.error || !result.card) {
        setFormError(
          result.error || 'No se pudo guardar la tarjeta promocional lateral.'
        );
        return;
      }

      onSaved(result.card, !editingCard);
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Error inesperado al guardar la tarjeta promocional.'
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
      aria-labelledby="promo-card-modal-title"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="promo-card-modal-title"
                className="text-base sm:text-lg font-extrabold tracking-tight"
              >
                {previewOnly
                  ? `Vista Previa: ${editingCard?.admin_name || 'Tarjeta Lateral'}`
                  : editingCard
                    ? `Editar Tarjeta Lateral: ${editingCard.admin_name}`
                    : 'Nueva Tarjeta Promocional Lateral del Hero'}
              </h2>
              <p className="text-xs text-slate-300">
                Ítem `PROMO_CARD` asociado a `hero_main` • Imágenes en `public-assets/home/promos/`
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulario */}
            {!previewOnly && (
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    1. Textos y Badge de la Tarjeta Lateral
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
                        placeholder="Ej. Tarjeta Lateral 1 — Sistemas POS"
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
                        placeholder="Ej. OFERTA -25% o A MEDIDA"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Variante del Badge
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
                      Título de la Tarjeta *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej. Sistemas POS y Apps Android para Negocios"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descripción Breve (`subtitle`)
                    </label>
                    <textarea
                      rows={2}
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Ej. Control de ventas, inventarios y arqueo de Yape/Plin en Soles (S/ 180.00)."
                      className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                </div>

                {/* Botón CTA */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    2. Enlace y Acción de la Tarjeta (CTA)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Texto del CTA Principal
                      </label>
                      <input
                        type="text"
                        value={ctaPrimaryLabel}
                        onChange={(e) => setCtaPrimaryLabel(e.target.value)}
                        placeholder="Ej. Ver Sistemas PRO"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        URL de Destino (`/ruta` o `https://`)
                      </label>
                      <input
                        type="text"
                        value={ctaPrimaryUrl}
                        onChange={(e) => setCtaPrimaryUrl(e.target.value)}
                        placeholder="/catalogo?categoria=sistemas"
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

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openInNewTab}
                      onChange={(e) => setOpenInNewTab(e.target.checked)}
                      className="w-4 h-4 accent-[#0A68FF] rounded"
                    />
                    <span>Abrir enlace en una nueva pestaña (`open_in_new_tab`)</span>
                  </label>
                </div>

                {/* Imagen Opcional en public-assets/home/promos/ */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        3. Imagen Promocional Opcional (`home/promos/`)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        JPG, PNG, WEBP o AVIF (máx. 5 MB). Se almacena en `public-assets/home/promos/`.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-[#0A68FF]" />
                      <span>
                        {effectiveImageUrl
                          ? 'Reemplazar imagen'
                          : 'Subir imagen opcional'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>

                    {effectiveImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPromoImageFile(null);
                          setImageUrl('');
                          setRemovePromoImage(true);
                        }}
                        className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar imagen</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Texto alternativo (`image_alt_text`)
                    </label>
                    <input
                      type="text"
                      value={imageAltText}
                      onChange={(e) => setImageAltText(e.target.value)}
                      placeholder="Descripción accesible de la tarjeta"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Columna Derecha: Vista Previa Real y Programación */}
            <div
              className={`${
                previewOnly ? 'lg:col-span-12 max-w-xl mx-auto w-full' : 'lg:col-span-5'
              } space-y-4`}
            >
              {/* Vista Previa idéntica a la tarjeta derecha del Hero */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#0A68FF]" />
                    <span>Vista Previa Tarjeta Lateral Hero</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Posición #{displayOrder}
                  </span>
                </div>

                <div
                  className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition shadow-2xs relative overflow-hidden min-h-[175px] ${currentBadgeOption.cardBorderClass}`}
                >
                  {effectiveImageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-900">
                      <img
                        src={effectiveImageUrl}
                        alt={imageAltText || title || 'Promo card'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2 relative z-10">
                    {badgeText.trim() && (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-[11px] font-extrabold uppercase tracking-wider ${currentBadgeOption.cardBadgeClass}`}
                      >
                        {badgeText.trim()}
                      </span>
                    )}
                    <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                      {title.trim() || 'Título de la tarjeta promocional'}
                    </h4>
                    {subtitle.trim() && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {subtitle.trim()}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 flex items-center justify-between relative z-10">
                    <span
                      className={`text-xs font-bold inline-flex items-center gap-1 ${
                        badgeVariant === 'PERSONALIZADO'
                          ? 'text-purple-700'
                          : 'text-[#0A68FF]'
                      }`}
                    >
                      <span>{ctaPrimaryLabel.trim() || 'Ver más'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    {openInNewTab && (
                      <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Nueva pestaña
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!previewOnly && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0A68FF]" />
                    <span>4. Publicación y Vigencia</span>
                  </h3>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Tarjeta Activa (`is_active`)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Habilita o deshabilita su visualización en el Hero
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
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    >
                      <option value="PUBLISHED">PUBLISHED — Publicado</option>
                      <option value="DRAFT">DRAFT — Borrador</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Inicio (`starts_at` — Opcional)
                      </label>
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
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
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between">
                    <span className="font-semibold text-slate-600">
                      Vigencia calculada:
                    </span>
                    {schedulePreviewState === 'ACTIVE_NOW' && (
                      <span className="font-bold text-emerald-700">
                        En vigencia actual
                      </span>
                    )}
                    {schedulePreviewState === 'SCHEDULED_FUTURE' && (
                      <span className="font-bold text-blue-700">
                        Programada a futuro
                      </span>
                    )}
                    {schedulePreviewState === 'EXPIRED' && (
                      <span className="font-bold text-red-600">
                        Campaña vencida
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
                    : editingCard
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
