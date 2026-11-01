import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  X,
  Trash2,
  Tag,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../../../hooks/useCart';
import { Badge, Button, Alert } from '../../../components/common';
import { formatPEN } from '../../../utils/currency';

export const MiniCartDrawer: React.FC = () => {
  const {
    items,
    itemCount,
    grossSubtotalPen,
    appliedCoupon,
    discountPen,
    netTotalPen,
    isCartDrawerOpen,
    cartNotice,
    removeItem,
    clearCart,
    closeCartDrawer,
    clearCartNotice,
  } = useCart();

  if (!isCartDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex justify-end"
      onClick={closeCartDrawer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mini-cart-title"
    >
      <div
        className="w-[92%] max-w-[410px] bg-white h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Mini-Carrito */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#0A68FF]" />
            <h2 id="mini-cart-title" className="font-bold text-slate-900 text-base">
              Mi Carrito Digital ({itemCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="touch-target -mr-2 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Cerrar mini-carrito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aviso contextual (adición o prevención de duplicado) */}
        {cartNotice && (
          <div className="px-4 pt-3">
            <Alert variant={cartNotice.type}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs">{cartNotice.text}</span>
                <button
                  type="button"
                  onClick={clearCartNotice}
                  className="text-xs font-bold underline shrink-0 cursor-pointer"
                >
                  OK
                </button>
              </div>
            </Alert>
          </div>
        )}

        {/* Lista de Ítems o Estado Vacío */}
        {items.length === 0 ? (
          <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Tu carrito está vacío actualmente
            </p>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Agrega plantillas Excel, hojas de Google Sheets, sistemas web o apps Android en Soles (PEN / S/).
            </p>
            <div className="pt-2">
              <Link to="/catalogo" onClick={closeCartDrawer}>
                <Button variant="primary" size="sm">
                  Explorar Catálogo Digital
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 flex-1 overflow-y-auto divide-y divide-slate-100">
            {items.map((item) => {
              const cover =
                item.product.images?.find((img) => img.is_cover)?.public_url ||
                item.product.images?.[0]?.public_url ||
                '';

              return (
                <div key={item.product.id} className="py-3.5 first:pt-0 last:pb-0 flex gap-3">
                  <Link
                    to={`/producto/${item.product.slug}`}
                    onClick={closeCartDrawer}
                    className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shrink-0"
                  >
                    {cover && (
                      <img
                        src={cover}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={item.product.modalidad} size="sm">
                          {item.product.modalidad}
                        </Badge>
                        <span className="text-[11px] font-mono text-slate-500">
                          {item.product.current_version}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        aria-label={`Quitar ${item.product.name} del carrito`}
                        className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <Link
                      to={`/producto/${item.product.slug}`}
                      onClick={closeCartDrawer}
                      className="text-xs font-bold text-slate-900 hover:text-[#0A68FF] line-clamp-2 block leading-snug"
                    >
                      {item.product.name}
                    </Link>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[11px] text-slate-400">
                        1 licencia digital
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {formatPEN(item.unitPricePen, {
                          showFreeLabel: item.product.modalidad === 'FREE',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pie del Mini-Carrito con Desglose en Soles (PEN / S/) */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Importe bruto ({itemCount} prod.):</span>
                <span className="font-semibold">{formatPEN(grossSubtotalPen)}</span>
              </div>

              {appliedCoupon && discountPen > 0 && (
                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Cupón ({appliedCoupon.code}):
                  </span>
                  <span>- {formatPEN(discountPen)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-1.5 border-t border-slate-200">
                <span className="font-bold text-slate-900">Total Neto en Soles:</span>
                <strong className="text-base font-extrabold text-[#0A68FF]">
                  {formatPEN(netTotalPen)}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/carrito"
                onClick={closeCartDrawer}
                className="h-11 rounded-lg border border-slate-300 bg-white hover:border-[#0A68FF] text-slate-800 font-bold text-xs flex items-center justify-center transition"
              >
                Ver Carrito y Cupón
              </Link>
              <Link
                to="/checkout"
                onClick={closeCartDrawer}
                className="h-11 rounded-lg bg-[#0A68FF] hover:bg-[#0854D1] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>Ir al Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Yape, Plin o Transferencia
              </span>
              <button
                type="button"
                onClick={clearCart}
                className="text-red-600 hover:underline font-semibold cursor-pointer"
              >
                Vaciar carrito
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
