import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Tag,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../../../hooks/useCart';
import { SEED_COUPONS } from '../../../services/coupons.service';
import { Badge, Button, Alert } from '../../../components/common';
import { formatPEN } from '../../../utils/currency';

export const CartPage: React.FC = () => {
  const {
    items,
    itemCount,
    regularSubtotalPen,
    grossSubtotalPen,
    promoSavingsPen,
    appliedCoupon,
    discountPen,
    netTotalPen,
    cartNotice,
    removeItem,
    clearCart,
    applyCouponCode,
    removeCoupon,
    clearCartNotice,
  } = useCart();

  const [couponInput, setCouponInput] = useState<string>(appliedCoupon?.code || '');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    await applyCouponCode(couponInput);
    setIsApplyingCoupon(false);
  };

  const handleQuickApplyCoupon = async (code: string) => {
    setCouponInput(code);
    setIsApplyingCoupon(true);
    await applyCouponCode(code);
    setIsApplyingCoupon(false);
  };

  const activeDemoCoupons = SEED_COUPONS.filter(
    (c) =>
      c.is_active &&
      (!c.expires_at || new Date(c.expires_at).getTime() > Date.now()) &&
      (c.usage_limit === null || c.current_usage_count < c.usage_limit)
  );

  return (
    <div className="smartlab-container py-6 sm:py-8 space-y-8">
      {/* Cabecera de la Página de Carrito */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/" className="hover:text-[#0A68FF]">
              Inicio
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Carrito de Compras</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-[#0A68FF]" />
            Carrito de Compras Multi-Producto
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Reúne uno o varios productos digitales en un solo pedido en Soles (<strong>PEN / S/</strong>). Cada producto incluye 1 licencia de uso sin duplicados.
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2.5">
            <Link to="/catalogo">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Seguir Comprando
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-red-600 hover:bg-red-50"
            >
              Vaciar Carrito
            </Button>
          </div>
        )}
      </div>

      {/* Notificación de estado del carrito o validación de cupón */}
      {cartNotice && (
        <Alert variant={cartNotice.type}>
          <div className="flex items-center justify-between gap-3">
            <span>{cartNotice.text}</span>
            <button
              type="button"
              onClick={clearCartNotice}
              className="text-xs font-bold underline shrink-0 cursor-pointer"
            >
              Cerrar aviso
            </button>
          </div>
        </Alert>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 sm:p-14 text-center space-y-4 max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0A68FF] flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Tu carrito de compras está vacío
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Explora nuestras 6 categorías oficiales de plantillas Excel, Google Sheets, Sistemas Web, Aplicaciones Android, Automatizaciones y Recursos Digitales en Soles (S/).
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link to="/catalogo">
              <Button variant="primary" size="md">
                Explorar Catálogo en S/
              </Button>
            </Link>
            <Link to="/catalogo?modalidad=FREE">
              <Button variant="outline" size="md">
                Ver Recursos FREE (S/ 0.00)
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Tabla / Lista de Productos y Módulo de Cupones */}
          <div className="lg:col-span-8 space-y-6">
            {/* Listado de Productos en el Carrito */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Productos en tu Pedido ({itemCount}{' '}
                  {itemCount === 1 ? 'licencia digital' : 'licencias digitales'})
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Sin duplicados (`quantity = 1`)
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const cover =
                    item.product.images?.find((img) => img.is_cover)?.public_url ||
                    item.product.images?.[0]?.public_url ||
                    '';

                  return (
                    <div
                      key={item.product.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                    >
                      <div className="flex items-start gap-4 min-w-0">
                        <Link
                          to={`/producto/${item.product.slug}`}
                          className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0"
                        >
                          {cover && (
                            <img
                              src={cover}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </Link>

                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={item.product.modalidad} size="sm">
                              {item.product.modalidad}
                            </Badge>
                            <span className="text-[11px] font-bold uppercase text-[#0A68FF]">
                              {item.product.category?.name || 'Catálogo'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] font-mono text-slate-500">
                              SKU: {item.product.sku}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                              {item.product.current_version}
                            </span>
                          </div>

                          <Link
                            to={`/producto/${item.product.slug}`}
                            className="text-sm sm:text-base font-bold text-slate-900 hover:text-[#0A68FF] block leading-snug"
                          >
                            {item.product.name}
                          </Link>

                          <p className="text-xs text-slate-500 line-clamp-1">
                            Licencia digital unitaria • Entrega individual al alcanzar el 100% de su pago
                          </p>
                        </div>
                      </div>

                      {/* Precio Unitario, Descuento Prorrateado y Botón Quitar */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                        <div className="text-left sm:text-right">
                          {item.product.modalidad === 'FREE' ? (
                            <span className="text-base font-extrabold text-emerald-600">
                              {formatPEN(0, { showFreeLabel: true })}
                            </span>
                          ) : (
                            <>
                              {item.regularPricePen > item.unitPricePen && (
                                <span className="text-xs text-slate-400 line-through block">
                                  Regular: {formatPEN(item.regularPricePen)}
                                </span>
                              )}
                              <span className="text-base font-extrabold text-slate-900 block">
                                {formatPEN(item.unitPricePen)}
                              </span>
                              {item.couponDiscountAllocatedPen > 0 && (
                                <span className="text-[11px] font-bold text-emerald-600 block">
                                  Con cupón: {formatPEN(item.netItemPricePen)} (-
                                  {formatPEN(item.couponDiscountAllocatedPen)})
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Quitar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Módulo de Validación y Aplicación de Cupones de Descuento */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#FF6B00]" />
                  <h2 className="text-base font-bold text-slate-900">
                    Cupón de Descuento en Soles (S/)
                  </h2>
                </div>
                {appliedCoupon && (
                  <Badge variant="success">CUPÓN ACTIVO: {appliedCoupon.code}</Badge>
                )}
              </div>

              <form
                onSubmit={handleApplyCoupon}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Ingresa tu código (ej. SMARTLAB15, SOLES20, BIENVENIDO10)"
                  aria-label="Código de cupón de descuento"
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-mono font-bold uppercase rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[44px]"
                />
                <Button
                  type="submit"
                  variant="dark"
                  size="md"
                  isLoading={isApplyingCoupon}
                  disabled={!couponInput.trim() || grossSubtotalPen <= 0}
                >
                  Validar y Aplicar Cupón
                </Button>
                {appliedCoupon && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      removeCoupon();
                      setCouponInput('');
                    }}
                  >
                    Quitar Cupón
                  </Button>
                )}
              </form>

              {/* Chips rápidos de cupones disponibles para verificación inmediata */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Cupones promocionales activos (clic para probar):
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeDemoCoupons.map((coup) => {
                    const isCurrent = appliedCoupon?.code === coup.code;
                    return (
                      <button
                        key={coup.id}
                        type="button"
                        onClick={() => handleQuickApplyCoupon(coup.code)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#0A68FF] hover:text-[#0A68FF]'
                        }`}
                      >
                        {coup.code} — {coup.description}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resumen Financiero en Soles (PEN / S/) */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-white border-2 border-[#0A68FF]/20 rounded-2xl p-6 space-y-5 shadow-xs">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                Resumen Financiero del Pedido
              </h2>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Productos ({itemCount}):</span>
                  <span className="font-semibold">{formatPEN(regularSubtotalPen)}</span>
                </div>

                {promoSavingsPen > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Ahorro por ofertas vigentes:</span>
                    <span className="font-semibold">- {formatPEN(promoSavingsPen)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-800 font-semibold pt-2 border-t border-slate-100">
                  <span>Importe Bruto (Subtotal):</span>
                  <span>{formatPEN(grossSubtotalPen)}</span>
                </div>

                {appliedCoupon && discountPen > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <span>Cupón ({appliedCoupon.code}):</span>
                    <span>- {formatPEN(discountPen)}</span>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-3 border-t-2 border-slate-200">
                  <div>
                    <span className="text-sm font-extrabold text-slate-900 block">
                      Total Neto a Pagar
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Moneda oficial: Soles (PEN)
                    </span>
                  </div>
                  <span className="text-2xl font-extrabold text-[#0A68FF]">
                    {formatPEN(netTotalPen)}
                  </span>
                </div>
              </div>

              <Link to="/checkout" className="block">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Continuar al Checkout ({formatPEN(netTotalPen)})
                </Button>
              </Link>

              <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    En el checkout podrás pagar con <strong>Yape</strong>, <strong>Plin</strong> o{' '}
                    <strong>Transferencia Bancaria</strong> y abrir WhatsApp con el código de tu pedido.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#0A68FF] shrink-0 mt-0.5" />
                  <span>
                    Reserva activa por <strong>72 horas</strong>. Se permiten pagos parciales y cada producto se entrega al alcanzar el 100 % de su pago verificado.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    Registro rápido integrado en el mismo checkout si aún no tienes cuenta.
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
