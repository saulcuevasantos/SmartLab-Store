import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Eye,
  AlertCircle,
  Globe,
  FileEdit,
  Palette,
} from 'lucide-react';
import {
  BenefitItemAdminInput,
  HOMEPAGE_ALLOWED_LUCIDE_ICONS,
  HomepageAllowedLucideIcon,
  HomepagePublishStatus,
  HomepageSectionItem,
} from '../../../types/homepage.types';
import {
  createAdminBenefitItem,
  updateAdminBenefitItem,
  validateSafePlainText,
  validateIconHexColor,
  validateCampaignScheduleDates,
} from '../../../services/homepage.service';
import { CATEGORY_COLOR_FAMILIES } from '../../../components/common/CategoryVisual/CategoryVisual';
import { HomepageIconBadge } from './HomepageIconBadge';

function isoToLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface BenefitItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBenefit: HomepageSectionItem | null;
  sectionId?: string | null;
  suggestedDisplayOrder: number;
  previewOnly?: boolean;
  onSaved: (savedBenefit: HomepageSectionItem, isNew: boolean) => void;
}

export const BenefitItemFormModal: React.FC<BenefitItemFormModalProps> = ({
  isOpen,
  onClose,
  editingBenefit,
  sectionId,
  suggestedDisplayOrder,
  previewOnly = false,
  onSaved,
}) => {
  const [adminName, setAdminName] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [iconName, setIconName] =
    useState<HomepageAllowedLucideIcon>('ShieldCheck');
  const [iconColorHex, setIconColorHex] = useState<string>('#3B82F6');
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

    if (editingBenefit) {
      setAdminName(editingBenefit.admin_name || '');
      setTitle(editingBenefit.title || '');
      setSubtitle(editingBenefit.subtitle || '');
      setIconName(
        (editingBenefit.icon_name as HomepageAllowedLucideIcon) || 'ShieldCheck'
      );
      setIconColorHex(
        (editingBenefit.icon_color_hex || '#3B82F6').toUpperCase()
      );
      setDisplayOrder(editingBenefit.display_order ?? suggestedDisplayOrder);
      setStatus(editingBenefit.status || 'PUBLISHED');
      setIsActive(editingBenefit.is_active !== false);
      setStartsAtInput(isoToLocalDatetimeInput(editingBenefit.starts_at));
      setEndsAtInput(isoToLocalDatetimeInput(editingBenefit.ends_at));
    } else {
      setAdminName(`Beneficio ${suggestedDisplayOrder} — `);
      setTitle('');
      setSubtitle('');
      setIconName('ShieldCheck');
      setIconColorHex('#3B82F6');
      setDisplayOrder(suggestedDisplayOrder);
      setStatus('PUBLISHED');
      setIsActive(true);
      setStartsAtInput('');
      setEndsAtInput('');
    }
  }, [isOpen, editingBenefit, suggestedDisplayOrder]);

  if (!isOpen) return null;

  const handleSubmit = async (
    e: React.FormEvent,
    overrideStatus?: HomepagePublishStatus
  ) => {
    e.preventDefault();
    if (previewOnly) return;

    setErrorMsg(null);

    const nameCheck = validateSafePlainText(adminName, {
      required: true,
      minLength: 3,
      maxLength: 140,
      fieldLabel: 'El nombre interno del beneficio',
    });
    if (!nameCheck.valid) {
      setErrorMsg(nameCheck.error);
      return;
    }

    const titleCheck = validateSafePlainText(title, {
      required: true,
      minLength: 3,
      maxLength: 120,
      fieldLabel: 'El título del beneficio',
    });
    if (!titleCheck.valid) {
      setErrorMsg(titleCheck.error);
      return;
    }

    const descCheck = validateSafePlainText(subtitle, {
      required: true,
      minLength: 5,
      maxLength: 260,
      fieldLabel: 'La descripción del beneficio',
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
      const payload: BenefitItemAdminInput = {
        section_id: sectionId,
        admin_name: nameCheck.sanitized!,
        title: titleCheck.sanitized!,
        subtitle: descCheck.sanitized!,
        icon_name: iconName,
        icon_color_hex: hexCheck.colorHex,
        display_order: Number(displayOrder) || 1,
        status: finalStatus,
        is_active: isActive,
        starts_at: scheduleCheck.startsAtIso,
        ends_at: scheduleCheck.endsAtIso,
      };

      const res = editingBenefit
        ? await updateAdminBenefitItem(editingBenefit.id, payload)
        : await createAdminBenefitItem(payload);

      if (res.error || !res.benefit) {
        setErrorMsg(res.error || 'No se pudo guardar el beneficio.');
        return;
      }

      onSaved(res.benefit, !editingBenefit);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
              Sección VALUE_PROPOSITION • item_type = BENEFIT_ITEM
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {previewOnly
                ? `Vista Previa: ${editingBenefit?.title || 'Beneficio'}`
                : editingBenefit
                  ? `Editar Beneficio: ${editingBenefit.admin_name}`
                  : 'Nuevo Beneficio de SmartLab Store'}
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

          {/* Vista Previa en Tiempo Real de la Tarjeta de Beneficio */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#0A68FF]" />
                Vista previa exacta de la tarjeta (solo personaliza el color del icono)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {iconName} • {iconColorHex}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs max-w-md">
              <div className="flex items-start gap-3.5">
                <HomepageIconBadge
                  iconName={iconName}
                  iconColorHex={iconColorHex}
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {title.trim() || 'Título del Beneficio'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {subtitle.trim() ||
                      'Descripción concisa del beneficio comercial de SmartLab Store.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!previewOnly && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Interno Administrativo *
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ej. Beneficio 1 — Precios 100% en Soles (S/)"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
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
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título Público del Beneficio *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Precios 100% en Soles (S/)"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción del Beneficio *
                  </label>
                  <textarea
                    rows={2}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ej. Paga con Yape, Plin o transferencia bancaria sin comisiones ocultas."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    required
                  />
                </div>
              </div>

              {/* Selector de Icono Lucide y Paleta de 24 Colores HEX */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Icono Lucide Permitido *
                  </label>
                  <select
                    value={iconName}
                    onChange={(e) =>
                      setIconName(e.target.value as HomepageAllowedLucideIcon)
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  >
                    {HOMEPAGE_ALLOWED_LUCIDE_ICONS.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Catálogo oficial de iconos Lucide habilitados en SmartLab Store.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Color HEX del Icono (`#RRGGBB`) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        /^#[0-9A-Fa-f]{6}$/.test(iconColorHex)
                          ? iconColorHex
                          : '#3B82F6'
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
                      placeholder="#3B82F6"
                      maxLength={7}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Solo modifica el color del trazo del icono; el fondo de la tarjeta permanece intacto.
                  </p>
                </div>
              </div>

              {/* Paleta rápida de 24 colores del sistema */}
              <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#0A68FF]" />
                    Paleta Oficial SmartLab (24 colores HEX)
                  </span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {CATEGORY_COLOR_FAMILIES.flatMap((fam) => fam.colors).map(
                    (swatch) => {
                      const isSelected =
                        iconColorHex.trim().toUpperCase() ===
                        swatch.hex.toUpperCase();
                      return (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() =>
                            setIconColorHex(swatch.hex.toUpperCase())
                          }
                          title={`${swatch.name} (${swatch.hex})`}
                          className={`h-7 rounded-lg border transition flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-offset-1 ring-slate-900 border-white scale-105'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.hex }}
                        />
                      );
                    }
                  )}
                </div>
              </div>

              {/* Estado y Publicación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Visibilidad del Beneficio
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Activar o desactivar sin eliminar
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#0A68FF] cursor-pointer"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Estado de Publicación
                    </span>
                    <span className="text-[11px] text-slate-500">
                      DRAFT (Borrador) o PUBLISHED (Público)
                    </span>
                  </div>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as HomepagePublishStatus)
                    }
                    className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              {/* Vigencia Opcional de Campaña (starts_at / ends_at) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Inicio Opcional (`starts_at`)
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAtInput}
                    onChange={(e) => setStartsAtInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Fin Opcional (`ends_at`)
                  </label>
                  <input
                    type="datetime-local"
                    value={endsAtInput}
                    onChange={(e) => setEndsAtInput(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#0A68FF]"
                  />
                </div>
              </div>
            </>
          )}

          {/* Pie de acciones */}
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
                  <span>Guardar como DRAFT</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => handleSubmit(e, 'PUBLISHED')}
                  className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {editingBenefit
                          ? 'Guardar y Publicar'
                          : 'Crear y Publicar'}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
