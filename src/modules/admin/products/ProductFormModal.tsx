/**
 * SmartLab Store — Modal Administrativo de Creación/Edición de Producto, Versiones y Enlaces Privados
 * docs/08_PLAN_SPRINTS.md (Sprint 08) y docs/07_SEGURIDAD.md
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Link2,
  Package,
} from 'lucide-react';
import {
  Category,
  ProductModalidad,
  ProductStatus,
  DownloadLinkType,
} from '../../../types/catalog.types';
import {
  AdminProductWithLinks,
  UpsertProductAdminInput,
} from '../../../services/admin.service';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  editingProduct: AdminProductWithLinks | null;
  onSave: (input: UpsertProductAdminInput) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  categories,
  editingProduct,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [modalidad, setModalidad] = useState<ProductModalidad>('PRO');
  const [status, setStatus] = useState<ProductStatus>('ACTIVO');

  const [priceRegularPen, setPriceRegularPen] = useState('99.00');
  const [priceSalePen, setPriceSalePen] = useState('');
  const [isOnPromotion, setIsOnPromotion] = useState(false);

  const [currentVersion, setCurrentVersion] = useState('v1.0.0');
  const [changelog, setChangelog] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [technicalRequirements, setTechnicalRequirements] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [isDealOfTheDay, setIsDealOfTheDay] = useState(false);

  const [downloadLinks, setDownloadLinks] = useState<
    Array<{
      id?: string;
      link_type: DownloadLinkType;
      access_url: string;
      instructions: string | null;
      is_active: boolean;
    }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);

    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setSlug(editingProduct.slug);
      setCategoryId(editingProduct.category_id);
      setModalidad(editingProduct.modalidad);
      setStatus(editingProduct.status);
      setPriceRegularPen(editingProduct.price_regular_pen.toFixed(2));
      setPriceSalePen(
        editingProduct.price_sale_pen !== null
          ? editingProduct.price_sale_pen.toFixed(2)
          : ''
      );
      setIsOnPromotion(editingProduct.is_on_promotion);
      setCurrentVersion(editingProduct.current_version || 'v1.0.0');
      setChangelog(editingProduct.versions?.[0]?.changelog || '');
      setShortDescription(editingProduct.short_description);
      setFullDescription(editingProduct.full_description);
      setFeaturesText((editingProduct.features_list || []).join('\n'));
      setTechnicalRequirements(editingProduct.technical_requirements || '');
      setCoverImageUrl(editingProduct.images?.[0]?.public_url || '');
      setIsFeatured(editingProduct.is_featured);
      setIsBestseller(editingProduct.is_bestseller);
      setIsNew(editingProduct.is_new);
      setIsDealOfTheDay(editingProduct.is_deal_of_the_day);
      setDownloadLinks(
        editingProduct.downloadLinks && editingProduct.downloadLinks.length > 0
          ? editingProduct.downloadLinks.map((dl) => ({
              id: dl.id,
              link_type: dl.link_type,
              access_url: dl.access_url,
              instructions: dl.instructions,
              is_active: dl.is_active,
            }))
          : [
              {
                link_type: 'GOOGLE_DRIVE',
                access_url: '',
                instructions: 'Carpeta privada de instalación y manual en Google Drive',
                is_active: true,
              },
              {
                link_type: 'MEDIAFIRE',
                access_url: '',
                instructions: 'Enlace espejo directo en MediaFire',
                is_active: true,
              },
            ]
      );
    } else {
      setName('');
      setSku(`SL-PRD-${Math.floor(100 + Math.random() * 900)}`);
      setSlug('');
      setCategoryId(categories[0]?.id || 'cat-excel');
      setModalidad('PRO');
      setStatus('ACTIVO');
      setPriceRegularPen('120.00');
      setPriceSalePen('89.00');
      setIsOnPromotion(true);
      setCurrentVersion('v1.0.0');
      setChangelog('Lanzamiento inicial validado por SmartLab Store.');
      setShortDescription('');
      setFullDescription('');
      setFeaturesText(
        'Licencia digital vitalicia sin pagos mensuales\nManual paso a paso en español incluido\nSoporte técnico por WhatsApp'
      );
      setTechnicalRequirements('Windows 10/11 o Microsoft Office 2019/2021/365.');
      setCoverImageUrl('');
      setIsFeatured(true);
      setIsBestseller(false);
      setIsNew(true);
      setIsDealOfTheDay(false);
      setDownloadLinks([
        {
          link_type: 'GOOGLE_DRIVE',
          access_url: 'https://drive.google.com/drive/folders/smartlab-nuevo-recurso',
          instructions: 'Enlace oficial en Google Drive',
          is_active: true,
        },
        {
          link_type: 'MEDIAFIRE',
          access_url: 'https://www.mediafire.com/file/smartlab-nuevo-recurso/file',
          instructions: 'Enlace espejo en MediaFire',
          is_active: true,
        },
      ]);
    }
  }, [isOpen, editingProduct, categories]);

  if (!isOpen) return null;

  const handleAddDownloadLink = () => {
    setDownloadLinks((prev) => [
      ...prev,
      {
        link_type: 'GOOGLE_DRIVE',
        access_url: '',
        instructions: '',
        is_active: true,
      },
    ]);
  };

  const handleRemoveDownloadLink = (index: number) => {
    setDownloadLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const autoSlug =
        slug.trim() ||
        name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      await onSave({
        id: editingProduct?.id,
        category_id: categoryId,
        sku,
        name,
        slug: autoSlug,
        short_description: shortDescription,
        full_description: fullDescription,
        features_list: featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
        technical_requirements: technicalRequirements || null,
        modalidad,
        price_regular_pen: modalidad === 'FREE' ? 0 : Number(priceRegularPen || 0),
        price_sale_pen:
          modalidad === 'FREE' || !isOnPromotion || !priceSalePen
            ? null
            : Number(priceSalePen),
        is_on_promotion: modalidad === 'FREE' ? false : isOnPromotion,
        current_version: currentVersion,
        changelog,
        is_featured: isFeatured,
        is_bestseller: isBestseller,
        is_new: isNew,
        is_deal_of_the_day: isDealOfTheDay,
        deal_expires_at: editingProduct?.deal_expires_at || null,
        status,
        cover_image_url: coverImageUrl || undefined,
        downloadLinks,
      });

      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Error al guardar el producto.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#0A68FF] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editingProduct
                  ? `Editar Producto: ${editingProduct.sku}`
                  : 'Nuevo Producto Digital, Versión y Enlaces Privados'}
              </h2>
              <p className="text-xs text-slate-500">
                Precios en Soles Peruanos (`PEN / S/`) • Los enlaces de descarga jamás se muestran en la tienda pública.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Datos Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Producto Digital <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Sistema Web de Control de Almacén y Facturación"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código SKU <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modalidad, Estado, Versión y Precios en S/ */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modalidad Comercial
              </label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as ProductModalidad)}
                className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
              >
                <option value="PRO">PRO (De Pago en S/)</option>
                <option value="FREE">FREE (Gratis S/ 0.00)</option>
                <option value="PERSONALIZADO">PERSONALIZADO (Cotización)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Precio Regular (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={modalidad === 'FREE'}
                value={modalidad === 'FREE' ? '0.00' : priceRegularPen}
                onChange={(e) => setPriceRegularPen(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs sm:text-sm font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Precio Oferta (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={modalidad === 'FREE' || !isOnPromotion}
                value={modalidad === 'FREE' ? '' : priceSalePen}
                onChange={(e) => setPriceSalePen(e.target.value)}
                placeholder="Ej. 89.00"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 text-xs sm:text-sm font-bold text-[#0A68FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Versión Actual
              </label>
              <input
                type="text"
                required
                value={currentVersion}
                onChange={(e) => setCurrentVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estado en Catálogo
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
                <option value="ARCHIVADO">ARCHIVADO</option>
              </select>
            </div>
          </div>

          {/* Checkboxes de promoción y etiquetas */}
          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOnPromotion}
                disabled={modalidad === 'FREE'}
                onChange={(e) => setIsOnPromotion(e.target.checked)}
                className="rounded border-slate-300 text-[#0A68FF]"
              />
              Activar Precio de Promoción
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-slate-300 text-[#0A68FF]"
              />
              Destacado (Featured)
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBestseller}
                onChange={(e) => setIsBestseller(e.target.checked)}
                className="rounded border-slate-300 text-[#0A68FF]"
              />
              Más Vendido (Bestseller)
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="rounded border-slate-300 text-[#0A68FF]"
              />
              Etiqueta Nuevo
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDealOfTheDay}
                onChange={(e) => setIsDealOfTheDay(e.target.checked)}
                className="rounded border-slate-300 text-[#FF6B00]"
              />
              Deal of the Day (Oferta Relámpago)
            </label>
          </div>

          {/* Descripciones y Características */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resumen Corto (Tarjeta de Catálogo) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Resumen ejecutivo del producto..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas de Versión (Changelog {currentVersion})
              </label>
              <textarea
                rows={2}
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="Novedades o mejoras incluidas en esta versión..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Características Clave (Una por línea)
              </label>
              <textarea
                rows={3}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requisitos Técnicos e Imagen de Portada (Opcional)
              </label>
              <input
                type="text"
                value={technicalRequirements}
                onChange={(e) => setTechnicalRequirements(e.target.value)}
                placeholder="Requisitos técnicos (ej. Excel 2019+, Windows 10+)"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 mb-2"
              />
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="URL de portada en public-assets (o dejar vacío para portada SVG)"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* SECCIÓN CRÍTICA: Enlaces Privados de Descarga (Google Drive / MediaFire) */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#0A68FF]" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Enlaces Iniciales Privados de Descarga (`download_links` — Google Drive / MediaFire)
                  </h3>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Protegidos por RLS: invisibles en tienda pública y solo despachables por WhatsApp tras verificar pago al 100%.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddDownloadLink}
                className="px-3 py-1.5 rounded-lg bg-white border border-blue-300 hover:bg-blue-50 text-[#0A68FF] text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Enlace
              </button>
            </div>

            <div className="space-y-2.5">
              {downloadLinks.map((dl, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-white p-3 rounded-lg border border-slate-200 items-center"
                >
                  <div className="sm:col-span-3">
                    <select
                      value={dl.link_type}
                      onChange={(e) => {
                        const updated = [...downloadLinks];
                        updated[index].link_type = e.target.value as DownloadLinkType;
                        setDownloadLinks(updated);
                      }}
                      className="w-full h-9 px-2.5 rounded border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50"
                    >
                      <option value="GOOGLE_DRIVE">GOOGLE DRIVE</option>
                      <option value="MEDIAFIRE">MEDIAFIRE</option>
                      <option value="STORAGE_PRIVADO">STORAGE PRIVADO</option>
                      <option value="OTRO">OTRO REPOSITORIO</option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <input
                      type="url"
                      value={dl.access_url}
                      onChange={(e) => {
                        const updated = [...downloadLinks];
                        updated[index].access_url = e.target.value;
                        setDownloadLinks(updated);
                      }}
                      placeholder="https://drive.google.com/... o https://www.mediafire.com/..."
                      className="w-full h-9 px-2.5 rounded border border-slate-300 text-xs font-mono text-slate-800"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={dl.instructions || ''}
                      onChange={(e) => {
                        const updated = [...downloadLinks];
                        updated[index].instructions = e.target.value;
                        setDownloadLinks(updated);
                      }}
                      placeholder="Instrucciones / Contraseña ZIP"
                      className="w-full h-9 px-2.5 rounded border border-slate-300 text-xs text-slate-700"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveDownloadLink(index)}
                      className="p-2 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Eliminar enlace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-60 text-white text-xs sm:text-sm font-bold"
            >
              {isSubmitting
                ? 'Guardando...'
                : editingProduct
                  ? 'Guardar Cambios del Producto'
                  : 'Crear Producto y Enlaces'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
