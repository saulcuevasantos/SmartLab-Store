import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Cpu,
  ExternalLink,
  ShoppingCart,
  Download,
  Wrench,
  Check,
} from 'lucide-react';
import { Product } from '../../../types/catalog.types';
import { Modal, Badge, Button } from '../../../components/common';
import { useCart } from '../../../hooks/useCart';
import { formatPEN, calculateDiscountPercentage } from '../../../utils/currency';

export interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (product: Product) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  isOpen,
  onClose,
  onAction,
}) => {
  const { addItem, isInCart, openCartDrawer } = useCart();

  if (!product) return null;

  const coverImage =
    product.images?.find((img) => img.is_cover)?.public_url ||
    product.images?.[0]?.public_url ||
    '';

  const discountPercent =
    product.is_on_promotion && product.price_sale_pen !== null
      ? calculateDiscountPercentage(product.price_regular_pen, product.price_sale_pen)
      : 0;

  const alreadyInCart = isInCart(product.id);

  const handleAdd = () => {
    if (onAction) {
      onAction(product);
    } else if (alreadyInCart) {
      onClose();
      openCartDrawer();
    } else {
      onClose();
      addItem(product, { openDrawer: true });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`SKU: ${product.sku} • Versión actual: ${product.current_version}`}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-3">
          <Link
            to={`/producto/${product.slug}`}
            onClick={onClose}
            className="text-xs font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1.5"
          >
            Ver ficha técnica e historial de versiones
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            {product.modalidad === 'PERSONALIZADO' ? (
              <Link
                to={`/solicitud-personalizada?producto=${encodeURIComponent(product.slug)}`}
                onClick={onClose}
              >
                <Button variant="dark" size="sm" leftIcon={<Wrench className="w-4 h-4" />}>
                  Solicitar a Medida
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleAdd}
                leftIcon={
                  alreadyInCart ? (
                    <Check className="w-4 h-4" />
                  ) : product.modalidad === 'FREE' ? (
                    <Download className="w-4 h-4" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )
                }
              >
                {alreadyInCart
                  ? 'En el Carrito (Ver)'
                  : product.modalidad === 'FREE'
                    ? 'Obtener Gratis (S/ 0.00)'
                    : 'Agregar al Carrito'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Imagen de Portada 1:1 */}
        <div className="md:col-span-5">
          <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
            {coverImage && (
              <img
                src={coverImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Detalles Resumidos */}
        <div className="md:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={product.modalidad}>{product.modalidad}</Badge>
            {discountPercent > 0 && <Badge variant="discount">OFERTA -{discountPercent}%</Badge>}
            <Badge variant="neutral">{product.category?.name || 'Catálogo'}</Badge>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {product.short_description}
          </p>

          {/* Bloque de Precio en S/ */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase block">
                Precio Oficial en Soles (PEN)
              </span>
              {product.modalidad === 'FREE' ? (
                <span className="text-xl font-extrabold text-emerald-600">
                  {formatPEN(0, { showFreeLabel: true })}
                </span>
              ) : product.modalidad === 'PERSONALIZADO' ? (
                <span className="text-lg font-extrabold text-slate-900">
                  Desde {formatPEN(product.price_regular_pen)} (Bajo cotización)
                </span>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-[#0A68FF]">
                    {formatPEN(
                      product.is_on_promotion && product.price_sale_pen !== null
                        ? product.price_sale_pen
                        : product.price_regular_pen
                    )}
                  </span>
                  {product.is_on_promotion && product.price_sale_pen !== null && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPEN(product.price_regular_pen)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700">
              {product.current_version}
            </span>
          </div>

          {/* Características Clave */}
          {product.features_list.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Características incluidas:
              </h4>
              <ul className="space-y-1.5">
                {product.features_list.slice(0, 4).map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requisitos Técnicos */}
          {product.technical_requirements && (
            <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-slate-700 flex items-start gap-2">
              <Cpu className="w-4 h-4 text-[#0A68FF] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block">Requisitos técnicos:</strong>
                <span>{product.technical_requirements}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
