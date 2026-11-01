import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, ShoppingCart, Download, Wrench, Check } from 'lucide-react';
import { Product } from '../../../types/catalog.types';
import { Badge, Button } from '../../../components/common';
import { useCart } from '../../../hooks/useCart';
import { formatPEN, calculateDiscountPercentage } from '../../../utils/currency';

export interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onSelectAction?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickView,
  onSelectAction,
}) => {
  const { addItem, isInCart, openCartDrawer } = useCart();

  const coverImage =
    product.images?.find((img) => img.is_cover)?.public_url ||
    product.images?.[0]?.public_url ||
    '';

  const discountPercent =
    product.is_on_promotion && product.price_sale_pen !== null
      ? calculateDiscountPercentage(product.price_regular_pen, product.price_sale_pen)
      : 0;

  const alreadyInCart = isInCart(product.id);

  const handleCartAction = () => {
    if (onSelectAction) {
      onSelectAction(product);
      return;
    }
    if (alreadyInCart) {
      openCartDrawer();
      return;
    }
    addItem(product, { openDrawer: true });
  };

  return (
    <article className="group bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:border-[#0A68FF]/50 hover:shadow-md">
      {/* Contenedor Superior: Imagen 1:1 + Badges Superiores + Vista Rápida */}
      <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
        <Link to={`/producto/${product.slug}`} className="block w-full h-full">
          {coverImage ? (
            <img
              src={coverImage}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
              {product.sku}
            </div>
          )}
        </Link>

        {/* Badges Superiores (Modalidad + Descuento) */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10 pointer-events-none">
          <Badge variant={product.modalidad} size="sm">
            {product.modalidad}
          </Badge>
          {discountPercent > 0 && (
            <Badge variant="discount" size="sm">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Botón Flotante de Vista Rápida (Quick View) */}
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            aria-label={`Vista rápida de ${product.name}`}
            title="Vista rápida"
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-lg bg-white/95 text-slate-800 hover:bg-[#0A68FF] hover:text-white flex items-center justify-center shadow-sm transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cuerpo de la Tarjeta */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Categoría + Versión Actual */}
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
            <span className="uppercase tracking-wider text-[#0A68FF] truncate">
              {product.category?.name || 'Solución Digital'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono shrink-0">
              {product.current_version}
            </span>
          </div>

          {/* Título truncado a 2 líneas con altura consistente */}
          <Link
            to={`/producto/${product.slug}`}
            className="block text-sm font-bold text-slate-900 hover:text-[#0A68FF] transition-colors line-clamp-2 min-h-[2.6rem] leading-snug"
          >
            {product.name}
          </Link>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.short_description}
          </p>
        </div>

        {/* Bloque Inferior: Precio en S/ y Botón de Acción Táctil */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            {product.modalidad === 'FREE' ? (
              <div>
                <span className="text-xs text-slate-400 block">Descarga directa</span>
                <span className="text-lg font-extrabold text-emerald-600">
                  {formatPEN(0, { showFreeLabel: true })}
                </span>
              </div>
            ) : product.modalidad === 'PERSONALIZADO' ? (
              <div>
                <span className="text-[11px] text-amber-700 font-semibold block">
                  Cotización bajo pedido
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  Desde {formatPEN(product.price_regular_pen)}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[11px] text-slate-400 block">Pago único en Soles</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-slate-900">
                    {formatPEN(
                      product.is_on_promotion && product.price_sale_pen !== null
                        ? product.price_sale_pen
                        : product.price_regular_pen
                    )}
                  </span>
                  {product.is_on_promotion &&
                    product.price_sale_pen !== null &&
                    product.price_sale_pen < product.price_regular_pen && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatPEN(product.price_regular_pen)}
                      </span>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Botón según modalidad e integración con Carrito */}
          {product.modalidad === 'PERSONALIZADO' ? (
            <Link
              to={`/solicitud-personalizada?producto=${encodeURIComponent(product.slug)}`}
              className="block"
            >
              <Button
                variant="dark"
                size="sm"
                fullWidth
                leftIcon={<Wrench className="w-4 h-4" />}
              >
                Solicitar a Medida
              </Button>
            </Link>
          ) : alreadyInCart ? (
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={handleCartAction}
              leftIcon={<Check className="w-4 h-4 text-emerald-600" />}
              className="border-emerald-600 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100"
            >
              En el Carrito (Ver)
            </Button>
          ) : product.modalidad === 'FREE' ? (
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={handleCartAction}
              leftIcon={<Download className="w-4 h-4" />}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white"
            >
              Obtener Gratis
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={handleCartAction}
              leftIcon={<ShoppingCart className="w-4 h-4" />}
            >
              Agregar al Carrito
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};
