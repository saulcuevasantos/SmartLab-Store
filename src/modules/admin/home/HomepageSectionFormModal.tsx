/**
 * SmartLab Store — Modal de Creación y Edición de Secciones de Portada (Sprint C3)
 * Administra registros en `public.homepage_sections` usando los 10 tipos admitidos por la migración 008.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Eye,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Link as LinkIcon,
  Shield,
  LayoutGrid,
} from 'lucide-react';
import {
  HOMEPAGE_SECTION_TYPE_METADATA,
  HomepageBadgeVariant,
  HomepagePublishStatus,
  HomepageSection,
  HomepageSectionAdminInput,
  HomepageSectionType,
  HomepageSectionWithStats,
} from '../../../types/homepage.types';
import {
  createAdminHomepageSection,
  updateAdminHomepageSection,
  evaluateCampaignScheduleState,
  isProtectedBaseSectionCode,
} from '../../../services/homepage.service';

interface HomepageSectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSection: HomepageSectionWithStats | null;
  suggestedDisplayOrder: number;
  onSaved: (savedSection: HomepageSection, isNew: boolean) => void;
}

const BADGE_VARIANT_OPTIONS: Array<{
  value: HomepageBadgeVariant;
  label: string;
  previewClass: string;
}> = [
  {
    value: 'PRO',
    label: 'PRO (Azul corporativo)',
    previewClass: 'bg-blue-50 text-[#0A68FF] border-blue-200',
  },
  {
    value: 'FREE',
    label: 'FREE (Verde esmeralda)',
    previewClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    value: 'PERSONALIZADO',
    label: 'PERSONALIZADO (Morado corporativo)',
    previewClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    value: 'discount',
    label: 'Oferta / Descuento (Ámbar)',
    previewClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    value: 'primary',
    label: 'Destacado Principal (Índigo)',
    previewClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    value: 'success',
    label: 'Éxito / Nuevo (Esmeralda)',
    previewClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    value: 'warning',
    label: 'Aviso / Campaña (Naranja)',
    previewClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  {
    value: 'danger',
    label: 'Urgencia / Liquidación (Rojo)',
    previewClass: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    value: 'neutral',
    label: 'Neutro (Pizarra)',
    previewClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  {
    value: 'dark',
    label: 'Oscuro (Grafito)',
    previewClass: 'bg-slate-800 text-white border-slate-700',
  },
];

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export const HomepageSectionFormModal: React.FC<
  HomepageSectionFormModalProps
> = ({
  isOpen,
  onClose,
  editingSection,
  suggestedDisplayOrder,
  onSaved,
}) => {
  const [adminName, setAdminName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [sectionType, setSectionType] =
    useState<HomepageSectionType>('INFO_BLOCK');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [badgeText, setBadgeText] = useState<string>('');
  const [badgeVariant, setBadgeVariant] =
    useState<HomepageBadgeVariant>('PRO');
  const [ctaLabel, setCtaLabel] = useState<string>('');
  const [ctaUrl, setCtaUrl] = useState<string>('');
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

    if (editingSection) {
      setAdminName(editingSection.admin_name || '');
      setCode(editingSection.code || '');
      setSectionType(editingSection.section_type || 'INFO_BLOCK');
      setTitle(editingSection.title || '');
      setSubtitle(editingSection.subtitle || '');
      setBadgeText(editingSection.badge_text || '');
      setBadgeVariant(editingSection.badge_variant || 'PRO');
      setCtaLabel(editingSection.cta_label || '');
      setCtaUrl(editingSection.cta_url || '');
      setDisplayOrder(editingSection.display_order ?? 1);
      setStatus(editingSection.status || 'PUBLISHED');
      setIsActive(editingSection.is_active !== false);
      setStartsAt(toDatetimeLocalValue(editingSection.starts_at));
      setEndsAt(toDatetimeLocalValue(editingSection.ends_at));
    } else {
      setAdminName('');
      setCode('');
      setSectionType('INFO_BLOCK');
      setTitle('');
      setSubtitle('');
      setBadgeText('');
      setBadgeVariant('PRO');
      setCtaLabel('');
      setCtaUrl('');
      setDisplayOrder(suggestedDisplayOrder);
      setStatus('PUBLISHED');
      setIsActive(true);
      setStartsAt('');
      setEndsAt('');
    }
  }, [isOpen, editingSection, suggestedDisplayOrder]);

  if (!isOpen) return null;

  const isProtectedBase = Boolean(
    editingSection && isProtectedBaseSectionCode(editingSection.code)
  );

  const selectedTypeMeta =
    HOMEPAGE_SECTION_TYPE_METADATA.find((m) => m.type === sectionType) ||
    HOMEPAGE_SECTION_TYPE_METADATA[0];

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
      const payload: HomepageSectionAdminInput = {
        code: code.trim() || null,
        section_type: sectionType,
        admin_name: adminName,
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        badge_text: badgeText.trim() || null,
        badge_variant: badgeText.trim() ? badgeVariant : null,
        cta_label: ctaLabel.trim() || null,
        cta_url: ctaUrl.trim() || null,
        display_order: displayOrder,
        status: targetStatus,
        is_active: isActive,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      };

      const result = editingSection
        ? await updateAdminHomepageSection(editingSection.id, payload)
        : await createAdminHomepageSection(payload);

      if (result.error || !result.section) {
        setFormError(
          result.error || 'No se pudo guardar la sección de portada.'
        );
        return;
      }

      onSaved(result.section, !editingSection);
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Error inesperado al guardar la sección.'
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
      aria-labelledby="homepage-section-modal-title"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A68FF]/20 border border-[#0A68FF]/40 flex items-center justify-center text-blue-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="homepage-section-modal-title"
                className="text-base sm:text-lg font-extrabold tracking-tight"
              >
                {editingSection
                  ? `Editar Sección: ${editingSection.admin_name}`
                  : 'Crear Nueva Sección de Portada'}
              </h2>
              <p className="text-xs text-slate-300">
                Configura títulos públicos, badge, CTA principal, orden, vigencia y estado (`PUBLISHED` o `DRAFT`).
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

          {isProtectedBase && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-700 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-[#0A68FF] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-slate-900">
                  Sección Estructural Base Protegida ({editingSection?.code}):
                </strong>{' '}
                Puedes personalizar libremente su nombre administrativo, título público, subtítulo, badge, botón CTA, orden, vigencia y estado de publicación o activación. Su código identificador y tipo estructural se mantienen fijos para preservar la integridad de la portada.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Formulario */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  1. Identificación y Tipo de Sección
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
                      placeholder="Ej. Bloque de Oferta del Día / Vitrina Principal"
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

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipo de Sección (`section_type`) *
                    </label>
                    <select
                      value={sectionType}
                      disabled={isProtectedBase}
                      onChange={(e) =>
                        setSectionType(e.target.value as HomepageSectionType)
                      }
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    >
                      {HOMEPAGE_SECTION_TYPE_METADATA.map((meta) => (
                        <option key={meta.type} value={meta.type}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Código Técnico (Opcional)
                    </label>
                    <input
                      type="text"
                      value={code}
                      disabled={isProtectedBase}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Ej. promo_verano_2026"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  {selectedTypeMeta.description}
                </p>
              </div>

              {/* Textos Públicos y Badge */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  2. Encabezado Público y Badge de la Sección
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título Público de la Sección
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Soluciones Digitales por Categoría y Colección"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtítulo / Descripción Pública
                  </label>
                  <textarea
                    rows={2}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ej. Explora productos FREE, PRO y PERSONALIZADO."
                    className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Texto del Badge (Opcional)
                    </label>
                    <input
                      type="text"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      placeholder="Ej. GRATIS / MODALIDAD PERSONALIZADO"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Variante Visual del Badge
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
              </div>

              {/* CTA Principal de la Sección */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-[#0A68FF]" />
                  <span>3. Llamada a la Acción (CTA Principal Opcional)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Texto del Botón / Enlace CTA
                    </label>
                    <input
                      type="text"
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Ej. Ver catálogo completo"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      URL de Destino (`/ruta` o `https://`)
                    </label>
                    <input
                      type="text"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="/catalogo o /solicitud-personalizada"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Estado, Programación y Vista Previa */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0A68FF]" />
                  <span>4. Publicación, Estado y Vigencia</span>
                </h3>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Sección Activa (`is_active`)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Si se desactiva, ni la sección ni sus ítems se mostrarán en tienda
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
                    Estado de Publicación (`status`)
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as HomepagePublishStatus)
                    }
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#0A68FF]"
                  >
                    <option value="PUBLISHED">
                      PUBLISHED — Publicado para visitantes
                    </option>
                    <option value="DRAFT">
                      DRAFT — Borrador privado para administradores
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Inicio de Vigencia (`starts_at` — Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fin de Vigencia (`ends_at` — Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between">
                  <span className="font-semibold text-slate-600">
                    Diagnóstico de vigencia:
                  </span>
                  {schedulePreviewState === 'ACTIVE_NOW' && (
                    <span className="font-bold text-emerald-700">
                      Vigente actualmente
                    </span>
                  )}
                  {schedulePreviewState === 'SCHEDULED_FUTURE' && (
                    <span className="font-bold text-blue-700">
                      Programada a futuro
                    </span>
                  )}
                  {schedulePreviewState === 'EXPIRED' && (
                    <span className="font-bold text-red-600">
                      Periodo finalizado
                    </span>
                  )}
                </div>
              </div>

              {/* Vista Previa del Encabezado de Sección */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#0A68FF]" />
                    <span>Vista Previa de Cabecera</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Orden #{displayOrder}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {badgeText.trim() && (
                      <span
                        className={`px-2.5 py-0.5 rounded-md border text-[10px] font-extrabold uppercase tracking-wider ${currentBadgeOption.previewClass}`}
                      >
                        {badgeText.trim()}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">
                      {sectionType}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                    {title.trim() ||
                      adminName.trim() ||
                      'Título de la sección'}
                  </h4>

                  {subtitle.trim() && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {subtitle.trim()}
                    </p>
                  )}

                  {ctaLabel.trim() && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A68FF] text-white text-xs font-bold">
                        <span>{ctaLabel.trim()}</span>
                      </span>
                      {ctaUrl.trim() && (
                        <span className="block text-[10px] font-mono text-slate-400 mt-1">
                          Destino: {ctaUrl.trim()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition cursor-pointer"
          >
            Cancelar
          </button>

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
                  : editingSection
                    ? 'Guardar y Publicar (`PUBLISHED`)'
                    : 'Crear y Publicar (`PUBLISHED`)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
