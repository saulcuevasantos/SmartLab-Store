import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Download,
  Wrench,
  MessageCircle,
  CheckCircle2,
  Cpu,
  History,
  ShieldCheck,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { Product } from '../../../types/catalog.types';
import { getProductBySlug, getProducts } from '../../../services/catalog.service';
import { Badge, Button, Alert, Loader } from '../../../components/common';
import { useCart } from '../../../hooks/useCart';
import { formatPEN, calculateDiscountPercentage } from '../../../utils/currency';
import { buildSupportWhatsAppUrl } from '../../../utils/whatsapp';
import { ProductCard } from '../catalog/ProductCard';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, isInCart, openCartDrawer } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'descripcion' | 'requisitos' | 'versiones'>(
    'descripcion'
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setSelectedImageIndex(0);
    setFeedbackMessage(null);

    if (!slug) {
      setIsLoading(false);
      return;
    }

    Promise.all([
      getProductBySlug(slug),
      getProducts().catch(() => [] as Product[]),
    ])
      .then(([found, all]) => {
        if (!mounted) return;
        setProduct(found);
        if (found) {
          const related = all
            .filter(
              (p) =>
                p.id !== found.id &&
                (p.category_id === found.category_id ||
                  (Boolean(found.category?.id) && p.category?.id === found.category?.id))
            )
            .slice(0, 4);
          setRelatedProducts(
            related.length > 0 ? related : all.filter((p) => p.id !== found.id).slice(0, 4)
          );
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setProduct(null);
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (isLoading) {
    return (
      <div className="smartlab-container py-16 flex justify-center">
        <Loader label="Cargando ficha técnica del producto..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="smartlab-container py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Producto no encontrado</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            El producto que buscas no existe o ya no se encuentra disponible en el catálogo activo.
          </p>
          <div className="pt-2">
            <Link to="/catalogo">
              <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Volver al Catálogo Digital
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 ? product.images : [];
  const activeImage = images[selectedImageIndex]?.public_url || images[0]?.public_url || '';

  const discountPercent =
    product.is_on_promotion && product.price_sale_pen !== null
      ? calculateDiscountPercentage(product.price_regular_pen, product.price_sale_pen)
      : 0;

  const whatsappInquiryUrl = buildSupportWhatsAppUrl(
    `Hola SmartLab Store, deseo consultar sobre el producto "${product.name}" (SKU: ${product.sku} - Versión ${product.current_version}).`
  );

  const alreadyInCart = isInCart(product.id);

  const handlePrimaryAction = () => {
    if (product.modalidad === 'PERSONALIZADO') {
      navigate(`/solicitud-personalizada?producto=${encodeURIComponent(product.slug)}`);
      return;
    }
    const result = addItem(product, { openDrawer: true });
    setFeedbackMessage(result.message);
  };

  return (
    <div className="smartlab-container py-6 sm:py-8 space-y-10">
      {/* Migas de Pan (Breadcrumbs) */}
      <nav
        aria-label="Ruta de navegación"
        className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
      >
        <Link to="/" className="hover:text-[#0A68FF]">
          Inicio
        </Link>
        <span>/</span>
        <Link to="/catalogo" className="hover:text-[#0A68FF]">
          Catálogo
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              to={`/catalogo?categoria=${product.category.slug}`}
              className="hover:text-[#0A68FF]"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {feedbackMessage && (
        <Alert variant="info" title="Producto seleccionado">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{feedbackMessage}</span>
            <Link to="/carrito" className="font-bold text-[#0A68FF] hover:underline">
              Ir a vista de Carrito →
            </Link>
          </div>
        </Alert>
      )}

      {/* Bloque Principal del Producto: Galería 1:1 + Ficha Comercial */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-8 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Galería de Imágenes 1:1 */}
        <div className="lg:col-span-5 space-y-3">
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                {product.sku}
              </div>
            )}

            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <Badge variant={product.modalidad}>{product.modalidad}</Badge>
              {discountPercent > 0 && (
                <Badge variant="discount">OFERTA -{discountPercent}%</Badge>
              )}
            </div>
          </div>

          {/* Miniaturas (si existen varias vistas) */}
          {images.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  aria-label={`Ver imagen ${idx + 1}`}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#0A68FF] ring-2 ring-blue-100'
                      : 'border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.public_url}
                    alt={img.alt_text || product.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Información Comercial, Precio en S/ y Guía de Compra */}
        <div className="lg:col-span-7 space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#0A68FF]">
                {product.category?.name || 'Solución Digital'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-500">SKU: {product.sku}</span>
              <span className="text-slate-300">•</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-semibold">
                Versión actual: {product.current_version}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-snug">
              {product.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {product.short_description}
            </p>
          </div>

          {/* Bloque de Precio en Soles (PEN / S/) */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                {product.modalidad === 'FREE'
                  ? 'Recurso Digital Gratuito'
                  : product.modalidad === 'PERSONALIZADO'
                    ? 'Inversión Referencial a Medida'
                    : 'Precio Oficial en Soles Peruanos'}
              </span>

              {product.modalidad === 'FREE' ? (
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                    {formatPEN(0, { showFreeLabel: true })}
                  </span>
                </div>
              ) : product.modalidad === 'PERSONALIZADO' ? (
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Desde {formatPEN(product.price_regular_pen)}
                  </span>
                  <span className="text-xs font-semibold text-amber-700">
                    (Según alcance técnico)
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-3 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#0A68FF]">
                    {formatPEN(
                      product.is_on_promotion && product.price_sale_pen !== null
                        ? product.price_sale_pen
                        : product.price_regular_pen
                    )}
                  </span>
                  {product.is_on_promotion &&
                    product.price_sale_pen !== null &&
                    product.price_sale_pen < product.price_regular_pen && (
                      <span className="text-sm text-slate-400 line-through font-semibold">
                        Antes: {formatPEN(product.price_regular_pen)}
                      </span>
                    )}
                </div>
              )}
            </div>

            <div className="text-right">
              <Badge variant="success">Entrega Digital Protegida</Badge>
              <span className="text-[11px] text-slate-500 block mt-1">
                Licencia de uso para la versión {product.current_version}
              </span>
            </div>
          </div>

          {/* Botones de Acción Táctiles */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {product.modalidad === 'PERSONALIZADO' ? (
              <Button
                variant="dark"
                size="lg"
                onClick={handlePrimaryAction}
                leftIcon={<Wrench className="w-5 h-5" />}
                className="flex-1"
              >
                Solicitar Cotización a Medida
              </Button>
            ) : alreadyInCart ? (
              <Button
                variant="outline"
                size="lg"
                onClick={openCartDrawer}
                leftIcon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                className="flex-1 border-emerald-600 text-emerald-700 bg-emerald-50/70"
              >
                Ya está en tu Carrito (Ver Resumen)
              </Button>
            ) : product.modalidad === 'FREE' ? (
              <Button
                variant="primary"
                size="lg"
                onClick={handlePrimaryAction}
                leftIcon={<Download className="w-5 h-5" />}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                Obtener Gratis ({formatPEN(0)})
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handlePrimaryAction}
                leftIcon={<ShoppingCart className="w-5 h-5" />}
                className="flex-1"
              >
                Agregar al Carrito ({formatPEN(
                  product.is_on_promotion && product.price_sale_pen !== null
                    ? product.price_sale_pen
                    : product.price_regular_pen
                )})
              </Button>
            )}

            <a
              href={whatsappInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial"
            >
              <Button
                variant="whatsapp"
                size="lg"
                fullWidth
                leftIcon={<MessageCircle className="w-5 h-5" />}
              >
                Consultar por WhatsApp
              </Button>
            </a>
          </div>

          {/* Opción adicional para solicitar personalización de un producto PRO o FREE */}
          {product.modalidad !== 'PERSONALIZADO' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
              <span className="text-amber-900">
                ¿Deseas agregar funciones extra a <strong>{product.name}</strong>?
              </span>
              <Link
                to={`/solicitud-personalizada?producto=${encodeURIComponent(product.slug)}`}
                className="font-bold text-[#0A68FF] hover:underline shrink-0 ml-2"
              >
                Solicitar adaptación →
              </Link>
            </div>
          )}

          {/* Caja Explicativa de Compra y Entrega en 3 Pasos */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0A68FF]" />
              ¿Cómo funciona la compra y entrega en SmartLab Store?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <span className="font-extrabold text-[#0A68FF] block mb-0.5">
                  1. Registra tu pedido
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Completa el checkout con tu correo y teléfono de WhatsApp para generar tu código único.
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <span className="font-extrabold text-[#0A68FF] block mb-0.5">
                  2. Envía tu comprobante
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Paga en S/ con Yape, Plin o transferencia dentro de las 72h y envía la captura por WhatsApp.
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-100">
                <span className="font-extrabold text-[#0A68FF] block mb-0.5">
                  3. Entrega 100% verificada
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Al verificarse el 100% del pago del producto, recibirás su enlace oficial por WhatsApp y en tu cuenta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pestañas de Información Técnica: Descripción, Requisitos e Historial de Versiones */}
      <section className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div
          role="tablist"
          className="flex items-center border-b border-slate-200 bg-slate-50 overflow-x-auto"
        >
          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'descripcion'}
            onClick={() => setActiveTab('descripcion')}
            className={`px-5 py-3.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'descripcion'
                ? 'border-[#0A68FF] text-[#0A68FF] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Descripción y Alcance
          </button>

          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'requisitos'}
            onClick={() => setActiveTab('requisitos')}
            className={`px-5 py-3.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'requisitos'
                ? 'border-[#0A68FF] text-[#0A68FF] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Requisitos Técnicos
          </button>

          <button
            role="tab"
            type="button"
            aria-selected={activeTab === 'versiones'}
            onClick={() => setActiveTab('versiones')}
            className={`px-5 py-3.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'versiones'
                ? 'border-[#0A68FF] text-[#0A68FF] bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Versiones ({product.versions?.length || 1})
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'descripcion' && (
            <div className="space-y-6 max-w-4xl">
              <div className="space-y-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Descripción detallada del producto
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {product.full_description}
                </p>
              </div>

              {product.features_list.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Características y módulos incluidos:
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {product.features_list.map((feature, index) => (
                      <li
                        key={index}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs sm:text-sm text-slate-800"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'requisitos' && (
            <div className="space-y-4 max-w-3xl">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Requisitos Técnicos y Compatibilidad
              </h2>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {product.technical_requirements ||
                  'Compatible con equipos estándar Windows, macOS o dispositivos Android según la categoría del producto.'}
              </div>
              <Alert variant="info" title="Protección de Enlaces y Política de Entrega">
                Los enlaces de descarga se encuentran resguardados de forma privada y nunca se exponen en el catálogo público. Una vez enviado el enlace de descarga de un producto pagado al 100%, dicho producto se considera entregado y no es reembolsable.
              </Alert>
            </div>
          )}

          {activeTab === 'versiones' && (
            <div className="space-y-4 max-w-3xl">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Registro de Versiones y Notas de Lanzamiento (Changelog)
              </h2>
              <div className="space-y-3">
                {(product.versions && product.versions.length > 0
                  ? product.versions
                  : [
                      {
                        id: 'ver-default',
                        product_id: product.id,
                        version_number: product.current_version,
                        changelog: 'Versión estable oficial verificada por SmartLab Store.',
                        release_date: product.updated_at,
                        is_current: true,
                        created_at: product.created_at,
                      },
                    ]
                ).map((ver) => (
                  <div
                    key={ver.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {ver.version_number}
                        </span>
                        {ver.version_number === product.current_version && (
                          <Badge variant="success">VERSIÓN ACTUAL</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {ver.changelog || 'Actualización de estabilidad y rendimiento.'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      Publicado: {new Date(ver.release_date).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Productos Relacionados */}
      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Productos Relacionados en S/
            </h2>
            <Link to="/catalogo" className="text-xs font-bold text-[#0A68FF] hover:underline">
              Ver todo el catálogo →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
