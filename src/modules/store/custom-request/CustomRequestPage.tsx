import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Wrench,
  MessageCircle,
  CheckCircle2,
  Send,
  ShieldCheck,
  Clock,
  FileCode2,
  RefreshCw,
} from 'lucide-react';
import { Category, Product, CustomRequestRecord } from '../../../types/catalog.types';
import {
  getCategories,
  getProducts,
  submitCustomRequest,
  resolveCategoryByIdOrEquivalent,
} from '../../../services/catalog.service';
import { useAuth } from '../../../hooks/useAuth';
import { Badge, Button, Alert } from '../../../components/common';
import { buildSupportWhatsAppUrl } from '../../../utils/whatsapp';
import { formatPEN } from '../../../utils/currency';

export const CustomRequestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const baseProductSlug = searchParams.get('producto') || '';

  const { profile } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [requesterName, setRequesterName] = useState<string>('');
  const [requesterEmail, setRequesterEmail] = useState<string>('');
  const [requesterPhone, setRequesterPhone] = useState<string>('51');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [estimatedBudgetPen, setEstimatedBudgetPen] = useState<string>('');
  const [requirementsDetail, setRequirementsDetail] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<CustomRequestRecord | null>(null);

  // Prellenar datos si el cliente ya inició sesión
  useEffect(() => {
    if (profile) {
      setRequesterName((prev) => prev || profile.full_name || '');
      setRequesterEmail((prev) => prev || profile.email || '');
      setRequesterPhone((prev) =>
        prev === '51' && profile.phone_number ? profile.phone_number : prev
      );
    }
  }, [profile]);

  // Cargar categorías activas y productos para referencia opcional
  const loadCatalogData = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);

    try {
      const [cats, prods] = await Promise.all([
        getCategories(),
        getProducts().catch(() => [] as Product[]),
      ]);

      // Garantizar que solo se ofrezcan categorías activas ordenadas por display_order
      const activeCats = cats
        .filter((c) => c.is_active !== false)
        .sort(
          (a, b) =>
            Number(a.display_order ?? a.sort_order ?? 0) -
            Number(b.display_order ?? b.sort_order ?? 0)
        );

      setCategories(activeCats);
      setProducts(prods);

      const categoriesMap = new Map(activeCats.map((c) => [c.id, c]));

      if (baseProductSlug && prods.length > 0) {
        const matched = prods.find((p) => p.slug === baseProductSlug);
        if (matched) {
          setSelectedProductId(matched.id);
          const resolvedCat = resolveCategoryByIdOrEquivalent(
            matched.category_id,
            categoriesMap
          );
          if (resolvedCat) {
            setCategoryId(resolvedCat.id);
          } else if (activeCats.length > 0) {
            setCategoryId(activeCats[0].id);
          }
          return;
        }
      }

      setCategoryId((prev) => {
        if (prev && activeCats.some((c) => c.id === prev)) {
          return prev;
        }
        return activeCats[0]?.id || '';
      });
    } catch (err) {
      setCategories([]);
      setCategoryId('');
      setCategoriesError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las categorías activas.'
      );
    } finally {
      setIsLoadingCategories(false);
    }
  }, [baseProductSlug]);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const activeSelectedCategory = categories.find(
      (c) => c.id === categoryId && c.is_active !== false
    );
    if (!activeSelectedCategory) {
      setErrorMsg('Por favor, selecciona una categoría tecnológica activa.');
      return;
    }

    setIsSubmitting(true);

    const parsedBudget =
      estimatedBudgetPen.trim() !== '' && !Number.isNaN(Number(estimatedBudgetPen))
        ? Number(estimatedBudgetPen)
        : null;

    const { data, error } = await submitCustomRequest({
      user_id: profile?.id || null,
      product_id: selectedProductId || null,
      category_id: activeSelectedCategory.id,
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_phone: requesterPhone,
      requirements_detail: requirementsDetail,
      estimated_budget_pen: parsedBudget,
    });

    setIsSubmitting(false);

    if (error || !data) {
      setErrorMsg(error || 'No se pudo registrar la solicitud. Verifica los campos obligatorios.');
      return;
    }

    setSubmittedRecord(data);
  };

  const selectedCategoryName =
    categories.find((c) => c.id === categoryId)?.name || 'Solución Digital';
  const selectedProductObj = products.find((p) => p.id === selectedProductId);

  const preparedWhatsAppUrl = buildSupportWhatsAppUrl(
    [
      'Hola SmartLab Store, acabo de registrar una Solicitud de Producto Personalizado:',
      submittedRecord ? `• Código de Solicitud: ${submittedRecord.id}` : '',
      `• Cliente: ${requesterName.trim() || 'Por definir'}`,
      `• Correo: ${requesterEmail.trim() || 'Por definir'}`,
      `• WhatsApp: +${requesterPhone.replace(/\D/g, '')}`,
      `• Categoría: ${selectedCategoryName}`,
      selectedProductObj ? `• Producto base: ${selectedProductObj.name} (${selectedProductObj.sku})` : '',
      estimatedBudgetPen ? `• Presupuesto estimado: ${formatPEN(Number(estimatedBudgetPen))}` : '',
      `• Requerimiento: ${requirementsDetail.trim()}`,
    ]
      .filter(Boolean)
      .join('\n')
  );

  return (
    <div className="smartlab-container py-6 sm:py-8 space-y-8">
      {/* Cabecera */}
      <div className="bg-[#0F172A] text-white rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="PERSONALIZADO">MODALIDAD PERSONALIZADO</Badge>
            <span className="text-xs font-semibold text-amber-300">
              Cotización directa en Soles (PEN / S/)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            Solicitud de Productos y Desarrollos a Medida
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Adaptamos plantillas Excel, Google Sheets, Sistemas Web, Aplicaciones Android o Automatizaciones a las reglas exactas de tu negocio con contacto directo por WhatsApp.
          </p>
        </div>

        <div className="bg-white/5 border border-white/15 rounded-xl p-4 text-xs text-slate-200 space-y-1.5 shrink-0">
          <div className="flex items-center gap-2 font-bold text-white">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Tiempo de evaluación</span>
          </div>
          <p className="text-slate-300">Respuesta comercial en menos de 24 horas hábiles.</p>
        </div>
      </div>

      {/* Contenido Principal: Formulario + Columna Informativa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-8 shadow-xs">
          {submittedRecord ? (
            <div className="space-y-6 py-4">
              <Alert variant="success" title="¡Solicitud personalizada registrada con éxito!">
                Tu requerimiento ha quedado registrado con el código{' '}
                <strong>{submittedRecord.id}</strong>. Nuestro equipo técnico revisará el alcance y se comunicará contigo al WhatsApp{' '}
                <strong>+{submittedRecord.requester_phone.replace(/\D/g, '')}</strong> y al correo{' '}
                <strong>{submittedRecord.requester_email}</strong>.
              </Alert>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm">
                <h3 className="font-bold text-slate-900">Resumen de tu solicitud:</h3>
                <p>
                  <span className="text-slate-500">Nombre:</span>{' '}
                  <strong>{submittedRecord.requester_name}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Categoría:</span>{' '}
                  <strong>{selectedCategoryName}</strong>
                </p>
                {selectedProductObj && (
                  <p>
                    <span className="text-slate-500">Producto base:</span>{' '}
                    <strong>{selectedProductObj.name}</strong>
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Detalle:</span>{' '}
                  <span className="text-slate-700">{submittedRecord.requirements_detail}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a href={preparedWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="whatsapp"
                    size="md"
                    leftIcon={<MessageCircle className="w-4 h-4" />}
                  >
                    Agilizar Evaluación por WhatsApp Ahora
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSubmittedRecord(null);
                    setRequirementsDetail('');
                  }}
                >
                  Enviar otra solicitud
                </Button>
                <Link to="/catalogo">
                  <Button variant="ghost" size="md">
                    Volver al catálogo
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Completa los datos de tu requerimiento
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los campos marcados con <span className="text-red-600 font-bold">*</span> son obligatorios para enviarte la cotización formal.
                </p>
              </div>

              {errorMsg && (
                <Alert variant="error" title="Verifica los campos del formulario">
                  {errorMsg}
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="req-name"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Nombre Completo o Empresa <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="req-name"
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Ej. Carlos Mendoza / Inversiones Perú SAC"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="req-email"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Correo Electrónico <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="req-email"
                    type="email"
                    required
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="correo@empresa.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="req-phone"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Teléfono / WhatsApp (con código de país) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="req-phone"
                    type="tel"
                    required
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="51987654321"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[44px]"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Obligatorio para coordinar el alcance y enviarte la propuesta por WhatsApp.
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="req-category"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Categoría Tecnológica <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="req-category"
                    required
                    disabled={isLoadingCategories || Boolean(categoriesError) || categories.length === 0}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:border-[#0A68FF] focus:outline-none min-h-[44px] disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {isLoadingCategories ? (
                      <option value="">Cargando categorías activas...</option>
                    ) : categoriesError ? (
                      <option value="">No se pudieron cargar las categorías</option>
                    ) : categories.length === 0 ? (
                      <option value="">No hay categorías activas disponibles</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                  {categoriesError && (
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-red-600">
                      <span>{categoriesError}</span>
                      <button
                        type="button"
                        onClick={loadCatalogData}
                        className="inline-flex items-center gap-1 font-bold text-[#0A68FF] hover:underline cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reintentar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="req-base-product"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Producto Base a Personalizar (Opcional)
                  </label>
                  <select
                    id="req-base-product"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:border-[#0A68FF] focus:outline-none min-h-[44px]"
                  >
                    <option value="">Desarrollo desde cero (sin producto base)</option>
                    {products.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="req-budget"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Presupuesto Estimado en Soles (S/) (Opcional)
                  </label>
                  <input
                    id="req-budget"
                    type="number"
                    min={0}
                    step="10"
                    value={estimatedBudgetPen}
                    onChange={(e) => setEstimatedBudgetPen(e.target.value)}
                    placeholder="Ej. 350"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="req-detail"
                  className="block text-xs font-bold text-slate-700 mb-1.5"
                >
                  Descripción Detallada de tu Requerimiento <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="req-detail"
                  rows={5}
                  required
                  value={requirementsDetail}
                  onChange={(e) => setRequirementsDetail(e.target.value)}
                  placeholder="Describe qué reportes, cálculos, roles de usuario o integraciones necesitas automatizar..."
                  className="w-full p-3.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isSubmitting}
                  disabled={isLoadingCategories || Boolean(categoriesError) || !categoryId}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Registrar Solicitud Personalizada
                </Button>

                <a href={preparedWhatsAppUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    type="button"
                    variant="whatsapp"
                    size="md"
                    leftIcon={<MessageCircle className="w-4 h-4" />}
                  >
                    Consultar Directo por WhatsApp
                  </Button>
                </a>
              </div>
            </form>
          )}
        </div>

        {/* Columna Derecha: Pasos del Servicio a Medida */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#0A68FF]" />
              ¿Cómo trabajamos los proyectos personalizados?
            </h3>

            <ol className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0A68FF] font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-slate-900 block">Recepción y análisis técnico</strong>
                  Revisamos los módulos solicitados o la plantilla base que deseas adaptar.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0A68FF] font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-slate-900 block">Propuesta en Soles (S/) por WhatsApp</strong>
                  Te enviamos el alcance, tiempo de entrega y facilidades de pago (Yape, Plin o transferencia).
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-[#0A68FF] font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-slate-900 block">Entrega verificada y soporte</strong>
                  Al completarse el 100% del pago acordado, recibes el enlace oficial y guía de uso.
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <FileCode2 className="w-4 h-4 text-indigo-600" />
              <span>Tecnologías cubiertas</span>
            </div>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Macros VBA y Dashboards en Microsoft Excel</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Google Sheets + Automatizaciones en Apps Script</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Sistemas Web React / Node.js / PHP / PostgreSQL</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Aplicaciones Android operativas (.APK)</span>
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#0A68FF] shrink-0" />
              <span>Confidencialidad garantizada sobre los datos de tu negocio.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
