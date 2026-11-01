import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, CheckCircle2, ShoppingCart, Eye, Clock } from 'lucide-react';
import { Product } from '../../../types/catalog.types';
import {
  DealOfTheDayConfigJson,
  HomepageSection,
} from '../../../types/homepage.types';
import { Badge, Button } from '../../../components/common';
import { formatPEN, calculateDiscountPercentage } from '../../../utils/currency';
import { useCart } from '../../../hooks/useCart';

export interface DealOfTheDayProps {
  product: Product;
  section?: HomepageSection | null;
  onQuickView?: (product: Product) => void;
}

interface TimeRemaining {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

function calculateRemaining(targetIso: string | null): TimeRemaining {
  const fallbackTarget = Date.now() + 1000 * 60 * 60 * 28;
  const parsedMs = targetIso ? Date.parse(targetIso) : NaN;
  const targetMs = !Number.isNaN(parsedMs) ? parsedMs : fallbackTarget;
  const diff = Math.max(0, targetMs - Date.now());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export const DealOfTheDay: React.FC<DealOfTheDayProps> = ({
  product,
  section,
  onQuickView,
}) => {
  const { addItem, isInCart, openCartDrawer } = useCart();

  const dealConfig = (section?.config_json ?? {}) as DealOfTheDayConfigJson;
  const rawCandidates = [
    dealConfig.custom_expires_at,
    section?.ends_at,
    product.deal_expires_at,
  ];
  const effectiveExpiresAt =
    rawCandidates.find((candidate) => {
      if (!candidate || typeof candidate !== 'string') return false;
      const ms = Date.parse(candidate);
      return !Number.isNaN(ms) && ms > Date.now();
    }) || null;

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() =>
    calculateRemaining(effectiveExpiresAt)
  );

  useEffect(() => {
    setTimeLeft(calculateRemaining(effectiveExpiresAt));
    const timer = window.setInterval(() => {
      setTimeLeft(calculateRemaining(effectiveExpiresAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [effectiveExpiresAt]);

  const coverImage =
    product.images?.find((img) => img.is_cover)?.public_url ||
    product.images?.[0]?.public_url ||
    '';

  const discountPercent =
    product.is_on_promotion && product.price_sale_pen !== null
      ? calculateDiscountPercentage(product.price_regular_pen, product.price_sale_pen)
      : 0;

  const headingTitle = section?.title?.trim() || 'Oferta Destacada del Día';
  const headingSubtitle =
    section?.subtitle !== undefined && section?.subtitle !== null
      ? section.subtitle.trim()
      : 'Promoción especial por tiempo limitado.';
  const countdownLabel = dealConfig.countdown_label?.trim() || 'Termina en:';
  const priceCaption =
    dealConfig.price_caption?.trim() || 'Precio promocional en Soles';
  const primaryCtaLabel =
    dealConfig.cta_button_label?.trim() ||
    section?.cta_label?.trim() ||
    'Agregar Oferta al Carrito';
  const secondaryCtaLabel =
    dealConfig.secondary_button_label?.trim() || 'Vista Rápida';
  const promoHighlightNote = dealConfig.promo_highlight_note?.trim() || null;

  return (
    <section
      aria-labelledby="deal-of-the-day-heading"
      className="bg-white border-2 border-[#FF6B00] rounded-2xl p-5 sm:p-7 shadow-xs relative overflow-hidden"
    >
      {/* Cabecera del Deal of the Day + Temporizador */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF6B00] flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="deal-of-the-day-heading"
                className="text-lg sm:text-xl font-extrabold text-slate-900"
              >
                {headingTitle}
              </h2>
              {discountPercent > 0 ? (
                <Badge variant="discount" size="sm">
                  AHORRA {discountPercent}%
                </Badge>
              ) : section?.badge_text ? (
                <Badge variant={section.badge_variant || 'discount'} size="sm">
                  {section.badge_text}
                </Badge>
              ) : null}
            </div>
            {headingSubtitle && (
              <p className="text-xs text-slate-500">
                {headingSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Contador Regresivo (Días : Horas : Minutos : Segundos) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
            {countdownLabel}
          </span>
          <div className="flex items-center gap-1.5" aria-label="Tiempo restante de la oferta">
            {[
              { value: timeLeft.days, label: 'Días' },
              { value: timeLeft.hours, label: 'Hrs' },
              { value: timeLeft.minutes, label: 'Min' },
              { value: timeLeft.seconds, label: 'Seg' },
            ].map((unit, idx) => (
              <React.Fragment key={unit.label}>
                <div className="bg-[#0F172A] text-white rounded-lg px-2.5 py-1.5 min-w-[46px] text-center">
                  <span className="text-sm font-extrabold font-mono block leading-none">
                    {unit.value}
                  </span>
                  <span className="text-[10px] text-slate-300 uppercase tracking-wider block mt-0.5">
                    {unit.label}
                  </span>
                </div>
                {idx < 3 && <span className="font-bold text-[#FF6B00]">:</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Cuerpo del Producto en Oferta */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Portada 1:1 */}
        <div className="lg:col-span-4">
          <Link
            to={`/producto/${product.slug}`}
            className="block aspect-square max-w-[320px] mx-auto rounded-xl overflow-hidden bg-slate-900 border border-slate-200"
          >
            {coverImage && (
              <img
                src={coverImage}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            )}
          </Link>
        </div>

        {/* Detalles y Llamado a la Acción */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={product.modalidad}>{product.modalidad}</Badge>
            <Badge variant="neutral">{product.category?.name || 'Excel'}</Badge>
            <span className="text-xs font-mono font-semibold text-slate-500">
              SKU: {product.sku} • Versión {product.current_version}
            </span>
          </div>

          <Link
            to={`/producto/${product.slug}`}
            className="block text-xl sm:text-2xl font-bold text-slate-900 hover:text-[#0A68FF] transition-colors leading-snug"
          >
            {product.name}
          </Link>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {product.full_description}
          </p>

          {promoHighlightNote && (
            <p className="text-xs font-semibold text-[#FF6B00]">
              {promoHighlightNote}
            </p>
          )}

          {product.features_list.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {product.features_list.slice(0, 4).map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 block">{priceCaption}</span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#FF6B00]">
                  {formatPEN(
                    product.is_on_promotion && product.price_sale_pen !== null
                      ? product.price_sale_pen
                      : product.price_regular_pen
                  )}
                </span>
                {product.is_on_promotion && product.price_sale_pen !== null && (
                  <span className="text-sm text-slate-400 line-through font-semibold">
                    {formatPEN(product.price_regular_pen)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onQuickView && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => onQuickView(product)}
                  leftIcon={<Eye className="w-4 h-4" />}
                >
                  {secondaryCtaLabel}
                </Button>
              )}
              <Button
                variant="secondary"
                size="md"
                onClick={() =>
                  isInCart(product.id)
                    ? openCartDrawer()
                    : addItem(product, { openDrawer: true })
                }
                leftIcon={<ShoppingCart className="w-4 h-4" />}
              >
                {isInCart(product.id)
                  ? 'En el Carrito (Ver)'
                  : primaryCtaLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

