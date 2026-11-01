import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  RefreshCw,
  Wrench,
  Gift,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Table,
  Monitor,
  Smartphone,
  Cpu,
  FolderKanban,
  Layers,
  Flame,
  Award,
  Clock,
  CheckCircle2,
  Zap,
  Lock,
  Globe,
  Code2,
  BarChart3,
  Database,
  Headphones,
} from 'lucide-react';
import { Category, Product } from '../../../types/catalog.types';
import {
  HomepageSection,
  HomepageSectionItem,
  HomepageSectionTarget,
  HomepageAllowedLucideIcon,
  HomepageBadgeVariant,
  AutomaticProductCriterion,
  DealFallbackBehavior,
} from '../../../types/homepage.types';
import {
  getCategories,
  getProducts,
  findActiveCategoryBySlugOrEquivalent,
  getEquivalentCategoryIds,
  SEED_PRODUCTS,
} from '../../../services/catalog.service';
import {
  getPublicHomepageSnapshot,
  SEED_HOMEPAGE_SECTIONS,
  SEED_HERO_SLIDE_ITEMS,
  SEED_HERO_PROMO_CARDS,
  SEED_SECONDARY_BANNERS,
  SEED_BENEFIT_ITEMS,
} from '../../../services/homepage.service';
import { Badge, Button, CategoryVisual } from '../../../components/common';
import { DealOfTheDay } from './DealOfTheDay';
import { CategoryTabs } from './CategoryTabs';
import { ProductCard } from '../catalog/ProductCard';
import { QuickViewModal } from '../catalog/QuickViewModal';

const HOMEPAGE_LUCIDE_ICON_MAP: Record<
  HomepageAllowedLucideIcon,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  ShieldCheck,
  MessageCircle,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Table,
  Monitor,
  Smartphone,
  Cpu,
  FolderKanban,
  Layers,
  Flame,
  Award,
  Gift,
  Wrench,
  Clock,
  CheckCircle2,
  Zap,
  Lock,
  Globe,
  Code2,
  BarChart3,
  Database,
  Headphones,
};

function resolveLucideIconComponent(
  iconName: string | null | undefined
): React.ComponentType<{ className?: string; style?: React.CSSProperties }> {
  const clean = (iconName ?? 'ShieldCheck').trim() as HomepageAllowedLucideIcon;
  return HOMEPAGE_LUCIDE_ICON_MAP[clean] || ShieldCheck;
}

function resolveValidHexColor(
  hex: string | null | undefined,
  fallback: string = '#0A68FF'
): string {
  if (typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex.trim())) {
    return hex.trim().toUpperCase();
  }
  return fallback;
}

function isExternalHref(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

const INITIAL_PUBLIC_ITEMS: HomepageSectionItem[] = [
  ...SEED_HERO_SLIDE_ITEMS,
  ...SEED_HERO_PROMO_CARDS,
  ...SEED_SECONDARY_BANNERS,
  ...SEED_BENEFIT_ITEMS,
];

export const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);

  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(
    SEED_HOMEPAGE_SECTIONS
  );
  const [homepageItems, setHomepageItems] =
    useState<HomepageSectionItem[]>(INITIAL_PUBLIC_ITEMS);
  const [homepageTargets, setHomepageTargets] = useState<
    HomepageSectionTarget[]
  >([]);

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      setCategories([]);
      setCategoriesError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las categorías.'
      );
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadCategories();

    getProducts()
      .then((prods) => {
        if (!mounted) return;
        setProducts(prods);
      })
      .catch(() => {
        // Mantener estado actual de productos ante un fallo aislado
      });

    getPublicHomepageSnapshot()
      .then((snapshot) => {
        if (!mounted) return;
        // Aplicar secciones e ítems válidos incluso si ocurre un error parcial en subconsultas
        if (snapshot.sections.length > 0 || !snapshot.error) {
          setHomepageSections(snapshot.sections);
          setHomepageItems(snapshot.items);
          setHomepageTargets(snapshot.targets);
        }
      })
      .catch(() => {
        // Conservar estado seguro si ocurre un error de red inesperado
      });

    return () => {
      mounted = false;
    };
  }, [loadCategories]);

  const resolveCategoryCatalogLink = useCallback(
    (baseSlug: string): string => {
      const matched = findActiveCategoryBySlugOrEquivalent(baseSlug, categories);
      const targetSlug = matched ? matched.slug : baseSlug;
      return `/catalogo?categoria=${encodeURIComponent(targetSlug)}`;
    },
    [categories]
  );

  /**
   * Si un enlace apunta a `/catalogo?categoria=<slug>`, sincroniza el slug con la categoría activa equivalente.
   */
  const resolveSmartUrl = useCallback(
    (rawUrl: string | null | undefined, fallbackUrl: string = '/catalogo'): string => {
      const clean = (rawUrl ?? '').trim();
      if (!clean) return fallbackUrl;
      const prefix = '/catalogo?categoria=';
      if (clean.startsWith(prefix)) {
        const slugPart = decodeURIComponent(
          clean.slice(prefix.length).split('&')[0] || ''
        ).trim();
        if (slugPart) {
          return resolveCategoryCatalogLink(slugPart);
        }
      }
      return clean;
    },
    [resolveCategoryCatalogLink]
  );

  const activeCatalogProducts = useMemo(
    () => products.filter((p) => p.status === 'ACTIVO'),
    [products]
  );

  const activeCategories = useMemo(
    () =>
      [...categories]
        .filter((c) => c.is_active !== false)
        .sort(
          (a, b) =>
            Number(a.display_order ?? a.sort_order ?? 0) -
            Number(b.display_order ?? b.sort_order ?? 0)
        ),
    [categories]
  );

  // Ordenar las secciones activas, publicadas y vigentes según display_order
  const orderedSections = useMemo(
    () =>
      [...homepageSections].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      ),
    [homepageSections]
  );

  // Obtener slides de la sección Hero principal para sincronizar el índice del carrusel
  const primaryHeroSection = useMemo(
    () =>
      orderedSections.find((s) => s.section_type === 'HERO_BANNER') || null,
    [orderedSections]
  );

  const heroSlides = useMemo(() => {
    if (!primaryHeroSection) return [];
    return homepageItems
      .filter(
        (item) =>
          item.section_id === primaryHeroSection.id &&
          item.item_type === 'HERO_SLIDE'
      )
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [primaryHeroSection, homepageItems]);

  useEffect(() => {
    if (heroSlides.length === 0) {
      setActiveSlideIndex(0);
    } else if (activeSlideIndex >= heroSlides.length) {
      setActiveSlideIndex(0);
    }
  }, [heroSlides.length, activeSlideIndex]);

  const handlePrevSlide = useCallback(() => {
    setActiveSlideIndex((prev) =>
      heroSlides.length <= 1
        ? 0
        : prev === 0
          ? heroSlides.length - 1
          : prev - 1
    );
  }, [heroSlides.length]);

  const handleNextSlide = useCallback(() => {
    setActiveSlideIndex((prev) =>
      heroSlides.length <= 1
        ? 0
        : prev >= heroSlides.length - 1
          ? 0
          : prev + 1
    );
  }, [heroSlides.length]);

  // ==========================================================================
  // RENDERIZADO INDIVIDUAL POR TIPO DE SECCIÓN (CONSERVANDO DISEÑO TECHOZE-04)
  // ==========================================================================

  const renderHeroBannerSection = (section: HomepageSection) => {
    const slides = homepageItems
      .filter(
        (i) => i.section_id === section.id && i.item_type === 'HERO_SLIDE'
      )
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const showSidePromos = section.config_json?.show_side_promo_cards !== false;
    const promoCards = showSidePromos
      ? homepageItems
          .filter(
            (i) => i.section_id === section.id && i.item_type === 'PROMO_CARD'
          )
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      : [];

    if (slides.length === 0 && promoCards.length === 0) {
      return null;
    }

    const safeSlideIdx =
      slides.length > 0 ? Math.min(activeSlideIndex, slides.length - 1) : 0;
    const currentSlide = slides[safeSlideIdx] || null;

    const renderActionWrapper = (
      url: string,
      openNewTab: boolean,
      children: React.ReactNode,
      className?: string
    ) => {
      if (openNewTab || isExternalHref(url)) {
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {children}
          </a>
        );
      }
      return (
        <Link to={url} className={className}>
          {children}
        </Link>
      );
    };

    return (
      <section
        key={section.id}
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch"
      >
        {/* Banner Central Panorámico */}
        {currentSlide && (
          <div
            className={`${
              promoCards.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'
            } bg-[#0F172A] text-white rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden shadow-xs min-h-[340px] lg:min-h-[380px]`}
          >
            {/* Imagen de fondo responsive (<picture>) si el slide tiene imagen configurada */}
            {(currentSlide.image_desktop_url ||
              currentSlide.image_mobile_url) && (
              <picture className="pointer-events-none absolute inset-0 z-0">
                {currentSlide.image_mobile_url && (
                  <source
                    media="(max-width: 767px)"
                    srcSet={currentSlide.image_mobile_url}
                  />
                )}
                <img
                  src={
                    currentSlide.image_desktop_url ||
                    currentSlide.image_mobile_url ||
                    ''
                  }
                  alt={currentSlide.image_alt_text || currentSlide.title}
                  className="w-full h-full object-cover opacity-35"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#0F172A]/80 to-[#0F172A]/45" />
              </picture>
            )}

            {/* Decoración sutil de fondo para dar profundidad al formato panorámico */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#0A68FF]/15 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl"
            />

            <div className="relative z-10 space-y-4 max-w-2xl">
              {currentSlide.badge_text && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[11px] font-bold uppercase tracking-widest">
                  <span>{currentSlide.badge_text}</span>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight text-white">
                {currentSlide.title}
              </h1>

              {currentSlide.subtitle && (
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                  {currentSlide.subtitle}
                </p>
              )}
            </div>

            <div className="relative z-10 pt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3.5">
                {currentSlide.cta_primary_label && (
                  <>
                    {renderActionWrapper(
                      resolveSmartUrl(
                        currentSlide.cta_primary_url,
                        '/catalogo?modalidad=PRO'
                      ),
                      currentSlide.open_in_new_tab,
                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<ShoppingCart className="w-4 h-4" />}
                        className="px-6 py-3 text-sm font-bold shadow-sm"
                      >
                        {currentSlide.cta_primary_label}
                      </Button>
                    )}
                  </>
                )}

                {currentSlide.cta_secondary_label &&
                  currentSlide.cta_secondary_url && (
                    <>
                      {renderActionWrapper(
                        resolveSmartUrl(
                          currentSlide.cta_secondary_url,
                          '/catalogo?modalidad=FREE'
                        ),
                        currentSlide.open_in_new_tab,
                        <Button
                          variant="outline"
                          size="lg"
                          className="px-6 py-3 text-sm font-bold bg-white/10 text-white border-white/25 hover:bg-white hover:text-slate-900"
                        >
                          {currentSlide.cta_secondary_label}
                        </Button>
                      )}
                    </>
                  )}
              </div>

              {/* Indicadores y Controles del Slider (solo cuando hay más de 1 slide activo) */}
              {slides.length > 1 && (
                <div className="flex items-center gap-3 ml-auto">
                  <div className="hidden sm:flex items-center gap-1.5 mr-1">
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveSlideIndex(idx)}
                        aria-label={`Ir a diapositiva ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === safeSlideIdx
                            ? 'w-6 bg-[#0A68FF]'
                            : 'w-2 bg-white/25 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      aria-label="Diapositiva anterior"
                      className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      aria-label="Siguiente diapositiva"
                      className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Columna Derecha: Tarjetas Promocionales Apiladas */}
        {promoCards.length > 0 && (
          <div
            className={`${
              currentSlide
                ? 'lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1'
                : 'lg:col-span-12 grid grid-cols-1 sm:grid-cols-2'
            } gap-4 lg:gap-5`}
          >
            {promoCards.map((card) => {
              const cardUrl = resolveSmartUrl(
                card.cta_primary_url,
                '/catalogo'
              );
              const cardBadgeVariant =
                (card.badge_variant as HomepageBadgeVariant) || 'discount';

              return (
                <div
                  key={card.id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    {(card.image_desktop_url || card.image_mobile_url) && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 h-28">
                        <picture>
                          {card.image_mobile_url && (
                            <source
                              media="(max-width: 767px)"
                              srcSet={card.image_mobile_url}
                            />
                          )}
                          <img
                            src={
                              card.image_desktop_url ||
                              card.image_mobile_url ||
                              ''
                            }
                            alt={card.image_alt_text || card.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </picture>
                      </div>
                    )}

                    {card.badge_text && (
                      <Badge variant={cardBadgeVariant} className="mb-2.5">
                        {card.badge_text}
                      </Badge>
                    )}

                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {card.title}
                    </h2>

                    {card.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                        {card.subtitle}
                      </p>
                    )}
                  </div>

                  {card.cta_primary_label && (
                    <div className="pt-4">
                      {renderActionWrapper(
                        cardUrl,
                        card.open_in_new_tab,
                        <>
                          {card.cta_primary_label}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>,
                        'text-xs sm:text-sm font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1'
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderValuePropositionSection = (section: HomepageSection) => {
    const benefits = homepageItems
      .filter(
        (i) => i.section_id === section.id && i.item_type === 'BENEFIT_ITEM'
      )
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    if (benefits.length === 0) return null;

    return (
      <section
        key={section.id}
        aria-label={
          section.title || 'Beneficios de comprar en SmartLab Store'
        }
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {benefits.map((item) => {
          const IconComp = resolveLucideIconComponent(item.icon_name);
          const resolvedHex = resolveValidHexColor(
            item.icon_color_hex,
            '#3B82F6'
          );

          return (
            <div
              key={item.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-start gap-3.5 shadow-xs"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                <IconComp
                  className="w-5 h-5"
                  style={{ color: resolvedHex }}
                />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  {item.title}
                </h3>
                {item.subtitle && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  const renderDealOfTheDaySection = (section: HomepageSection) => {
    const cfg = section.config_json || {};
    const nowMs = Date.now();

    const isProductDealValid = (prod: Product): boolean => {
      if (prod.status !== 'ACTIVO') return false;
      const customExp =
        typeof cfg.custom_expires_at === 'string' && cfg.custom_expires_at.trim()
          ? cfg.custom_expires_at.trim()
          : section.ends_at;
      const effectiveExp = customExp || prod.deal_expires_at;
      if (effectiveExp) {
        const expMs = Date.parse(effectiveExp);
        if (!Number.isNaN(expMs) && expMs <= nowMs) {
          return false;
        }
      }
      return true;
    };

    const targetDeal = homepageTargets.find(
      (t) =>
        t.section_id === section.id &&
        t.target_type === 'PRODUCT' &&
        Boolean(t.product_id) &&
        (t.collection_key === 'deal_of_the_day' ||
          t.collection_key === 'default')
    );

    const configuredProductId =
      (typeof cfg.featured_product_id === 'string' &&
      cfg.featured_product_id.trim()
        ? cfg.featured_product_id.trim()
        : null) ||
      targetDeal?.product_id ||
      null;

    let selectedProduct: Product | null = null;

    if (configuredProductId) {
      const candidate = activeCatalogProducts.find(
        (p) => p.id === configuredProductId
      );
      if (candidate && isProductDealValid(candidate)) {
        selectedProduct = candidate;
      }
    } else {
      const flaggedDeal = activeCatalogProducts.find(
        (p) => p.is_deal_of_the_day && isProductDealValid(p)
      );
      if (flaggedDeal) {
        selectedProduct = flaggedDeal;
      }
    }

    const isProductNotExpired = (prod: Product): boolean => {
      if (!prod.deal_expires_at) return true;
      const expMs = Date.parse(prod.deal_expires_at);
      return Number.isNaN(expMs) || expMs > nowMs;
    };

    if (!selectedProduct) {
      const fallbackMode =
        (cfg.fallback_behavior as DealFallbackBehavior) ||
        'AUTO_FIRST_PROMOTION';

      if (fallbackMode === 'HIDE_SECTION') {
        return null;
      }

      if (fallbackMode === 'AUTO_FEATURED') {
        selectedProduct =
          activeCatalogProducts.find(
            (p) =>
              p.is_featured &&
              p.modalidad !== 'FREE' &&
              isProductNotExpired(p)
          ) ||
          activeCatalogProducts.find(
            (p) => p.is_featured && isProductNotExpired(p)
          ) ||
          null;
      } else {
        // AUTO_FIRST_PROMOTION
        selectedProduct =
          activeCatalogProducts.find(
            (p) =>
              p.is_on_promotion &&
              p.price_sale_pen !== null &&
              p.price_sale_pen < p.price_regular_pen &&
              isProductNotExpired(p)
          ) ||
          activeCatalogProducts.find(
            (p) =>
              p.is_featured &&
              p.modalidad !== 'FREE' &&
              isProductNotExpired(p)
          ) ||
          null;
      }
    }

    if (!selectedProduct) return null;

    return (
      <DealOfTheDay
        key={section.id}
        product={selectedProduct}
        section={section}
        onQuickView={(prod) => setQuickViewProduct(prod)}
      />
    );
  };

  const renderCategoryTabsShowcaseSection = (section: HomepageSection) => {
    const sectionTargets = homepageTargets.filter(
      (t) => t.section_id === section.id
    );

    return (
      <CategoryTabs
        key={section.id}
        products={products}
        categories={categories}
        isLoadingCategories={isLoadingCategories}
        categoriesError={categoriesError}
        onRetryCategories={loadCategories}
        onQuickView={(prod) => setQuickViewProduct(prod)}
        section={section}
        sectionTargets={sectionTargets}
      />
    );
  };

  const renderPromoBannersSection = (section: HomepageSection) => {
    const banners = homepageItems
      .filter(
        (i) => i.section_id === section.id && i.item_type === 'SECONDARY_BANNER'
      )
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    if (banners.length === 0) return null;

    return (
      <section
        key={section.id}
        className={`grid grid-cols-1 ${
          banners.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'
        } gap-5`}
      >
        {banners.map((banner, idx) => {
          const isIndigoVariant =
            banner.style_json?.theme === 'blue-indigo' || idx % 2 === 1;
          const containerClasses = isIndigoVariant
            ? 'bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-indigo-900 relative overflow-hidden'
            : 'bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white rounded-2xl p-6 sm:p-7 flex flex-col justify-between border border-slate-800 relative overflow-hidden';

          const badgeVariant =
            (banner.badge_variant as HomepageBadgeVariant) ||
            (isIndigoVariant ? 'discount' : 'PRO');
          const primaryUrl = resolveSmartUrl(
            banner.cta_primary_url,
            '/catalogo'
          );

          return (
            <div key={banner.id} className={containerClasses}>
              {(banner.image_desktop_url || banner.image_mobile_url) && (
                <picture className="pointer-events-none absolute inset-0 z-0">
                  {banner.image_mobile_url && (
                    <source
                      media="(max-width: 767px)"
                      srcSet={banner.image_mobile_url}
                    />
                  )}
                  <img
                    src={
                      banner.image_desktop_url ||
                      banner.image_mobile_url ||
                      ''
                    }
                    alt={banner.image_alt_text || banner.title}
                    className="w-full h-full object-cover opacity-30"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/40" />
                </picture>
              )}

              <div className="relative z-10 space-y-2.5">
                {banner.badge_text && (
                  <Badge variant={badgeVariant}>{banner.badge_text}</Badge>
                )}
                <h3 className="text-xl font-bold leading-snug">
                  {banner.title}
                </h3>
                {banner.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {banner.subtitle}
                  </p>
                )}
              </div>

              {(banner.cta_primary_label || banner.cta_secondary_label) && (
                <div className="relative z-10 pt-5 flex flex-wrap items-center gap-3">
                  {banner.cta_primary_label &&
                    (banner.open_in_new_tab || isExternalHref(primaryUrl) ? (
                      <a
                        href={primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant={isIndigoVariant ? 'secondary' : 'primary'}
                          size="sm"
                        >
                          {banner.cta_primary_label}
                        </Button>
                      </a>
                    ) : (
                      <Link to={primaryUrl}>
                        <Button
                          variant={isIndigoVariant ? 'secondary' : 'primary'}
                          size="sm"
                        >
                          {banner.cta_primary_label}
                        </Button>
                      </Link>
                    ))}

                  {banner.cta_secondary_label && banner.cta_secondary_url && (
                    <Link
                      to={resolveSmartUrl(
                        banner.cta_secondary_url,
                        '/catalogo'
                      )}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white/10 text-white border-white/25 hover:bg-white hover:text-slate-900"
                      >
                        {banner.cta_secondary_label}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  };

  const renderFreeResourcesSection = (section: HomepageSection) => {
    const cfg = section.config_json || {};
    const maxItems = Number.isFinite(Number(cfg.max_items))
      ? Math.max(1, Math.min(16, Number(cfg.max_items)))
      : 4;

    // REGLA COMERCIAL ESTRICTA: Jamás permitir que un producto PRO o PERSONALIZADO aparezca en FREE_RESOURCES
    const strictlyFreeActiveProducts = activeCatalogProducts.filter(
      (p) => p.status === 'ACTIVO' && p.modalidad === 'FREE'
    );

    let resolvedFreeProducts: Product[] = [];

    if (cfg.selection_mode === 'MANUAL_TARGETS') {
      const manualTargets = homepageTargets
        .filter(
          (t) =>
            t.section_id === section.id &&
            t.is_active !== false &&
            t.target_type === 'PRODUCT' &&
            Boolean(t.product_id) &&
            (t.collection_key === 'free_resources' ||
              t.collection_key === 'default')
        )
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      const seen = new Set<string>();
      for (const target of manualTargets) {
        if (!target.product_id || seen.has(target.product_id)) continue;
        const found = strictlyFreeActiveProducts.find(
          (p) => p.id === target.product_id
        );
        if (found) {
          seen.add(found.id);
          resolvedFreeProducts.push(found);
        }
      }
    } else {
      resolvedFreeProducts = strictlyFreeActiveProducts;
    }

    const visibleFreeProducts = resolvedFreeProducts.slice(0, maxItems);
    if (visibleFreeProducts.length === 0) return null;

    const sectionTitle = section.title?.trim() || 'Zona de Recursos Gratuitos';
    const sectionSubtitle =
      section.subtitle?.trim() ||
      'Herramientas y kits gratuitos verificados para la comunidad de SmartLab Store.';
    const badgeText = section.badge_text?.trim() || 'GRATIS';
    const badgeVariant =
      (section.badge_variant as HomepageBadgeVariant) || 'FREE';
    const ctaLabel =
      section.cta_label?.trim() || 'Ver todos los recursos FREE →';
    const ctaUrl = section.cta_url?.trim() || '/catalogo?modalidad=FREE';
    const highlightNote =
      typeof cfg.highlight_note === 'string' && cfg.highlight_note.trim()
        ? cfg.highlight_note.trim()
        : null;

    return (
      <section
        key={section.id}
        className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {sectionTitle}
                </h2>
                {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
              </div>
              <p className="text-xs text-slate-600">{sectionSubtitle}</p>
              {highlightNote && (
                <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                  {highlightNote}
                </p>
              )}
            </div>
          </div>

          <Link to={ctaUrl}>
            <Button
              variant="outline"
              size="sm"
              className="bg-white border-emerald-600 text-emerald-700"
            >
              {ctaLabel}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleFreeProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onQuickView={(prod) => setQuickViewProduct(prod)}
            />
          ))}
        </div>
      </section>
    );
  };

  const renderCustomServicesCtaSection = (section: HomepageSection) => {
    const cfg = section.config_json || {};
    const badgeText =
      section.badge_text !== null && section.badge_text !== undefined
        ? section.badge_text.trim()
        : 'MODALIDAD PERSONALIZADO';
    const badgeVariant =
      (section.badge_variant as HomepageBadgeVariant) || 'PERSONALIZADO';
    const secondaryBadge =
      typeof cfg.secondary_badge_text === 'string' &&
      cfg.secondary_badge_text.trim()
        ? cfg.secondary_badge_text.trim()
        : 'Cotización directa en Soles (PEN)';
    const title =
      section.title?.trim() ||
      '¿Buscas un desarrollo a medida o adaptar un producto del catálogo?';
    const subtitle =
      section.subtitle?.trim() ||
      'Cuéntanos tu requerimiento técnico de Excel, Google Sheets, Sistemas Web, Aplicaciones Android o Automatizaciones y te contactaremos por WhatsApp con una propuesta formal.';
    const slaText =
      typeof cfg.response_SLA_text === 'string' && cfg.response_SLA_text.trim()
        ? cfg.response_SLA_text.trim()
        : null;

    const primaryCtaLabel =
      section.cta_label?.trim() || 'Solicitar Producto a Medida';
    const primaryCtaUrl =
      section.cta_url?.trim() || '/solicitud-personalizada';

    const secondaryCtaLabel =
      typeof cfg.secondary_cta_label === 'string'
        ? cfg.secondary_cta_label.trim()
        : 'Ver Preguntas Frecuentes';
    const secondaryCtaUrl =
      typeof cfg.secondary_cta_url === 'string' && cfg.secondary_cta_url.trim()
        ? cfg.secondary_cta_url.trim()
        : '/soporte';

    return (
      <section
        key={section.id}
        className="bg-white border-2 border-amber-300 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
            {secondaryBadge && (
              <span className="text-xs font-semibold text-amber-800">
                {secondaryBadge}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {subtitle}
          </p>
          {slaText && (
            <p className="text-xs font-semibold text-slate-700 pt-0.5">
              {slaText}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isExternalHref(primaryCtaUrl) ? (
            <a
              href={primaryCtaUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="dark"
                size="md"
                leftIcon={<Wrench className="w-4 h-4" />}
              >
                {primaryCtaLabel}
              </Button>
            </a>
          ) : (
            <Link to={primaryCtaUrl}>
              <Button
                variant="dark"
                size="md"
                leftIcon={<Wrench className="w-4 h-4" />}
              >
                {primaryCtaLabel}
              </Button>
            </Link>
          )}

          {secondaryCtaLabel && secondaryCtaUrl && (
            <Link to={secondaryCtaUrl}>
              <Button variant="outline" size="md">
                {secondaryCtaLabel}
              </Button>
            </Link>
          )}
        </div>
      </section>
    );
  };

  const renderFeaturedCategoriesSection = (section: HomepageSection) => {
    const cfg = section.config_json || {};
    const maxItems = Number.isFinite(Number(cfg.max_items))
      ? Math.max(1, Math.min(18, Number(cfg.max_items)))
      : 6;

    let resolvedCategories: Category[] = [];

    if (cfg.selection_mode === 'MANUAL_TARGETS') {
      const manualTargets = homepageTargets
        .filter(
          (t) =>
            t.section_id === section.id &&
            t.is_active !== false &&
            t.target_type === 'CATEGORY' &&
            Boolean(t.category_id)
        )
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      const seen = new Set<string>();
      for (const target of manualTargets) {
        if (!target.category_id) continue;
        const equiv = getEquivalentCategoryIds(target.category_id);
        const found = activeCategories.find(
          (cat) => equiv.includes(cat.id) || cat.slug === target.category_id
        );
        if (found && !seen.has(found.id)) {
          seen.add(found.id);
          resolvedCategories.push(found);
        }
      }
    } else {
      resolvedCategories = activeCategories;
    }

    const visibleCategories = resolvedCategories.slice(0, maxItems);
    if (visibleCategories.length === 0) return null;

    const badgeVariant =
      (section.badge_variant as HomepageBadgeVariant) || 'PRO';

    return (
      <section key={section.id} className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            {section.badge_text && (
              <Badge variant={badgeVariant} className="mb-1.5">
                {section.badge_text}
              </Badge>
            )}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {section.title || section.admin_name}
            </h2>
            {section.subtitle && (
              <p className="text-xs text-slate-500">{section.subtitle}</p>
            )}
          </div>

          {section.cta_label && section.cta_url && (
            <Link
              to={resolveSmartUrl(section.cta_url, '/catalogo')}
              className="text-xs font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1 self-start md:self-auto shrink-0"
            >
              {section.cta_label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {visibleCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/catalogo?categoria=${encodeURIComponent(cat.slug)}`}
              className="bg-white border border-[#E2E8F0] hover:border-[#0A68FF] rounded-xl p-4 flex flex-col items-center text-center gap-2.5 shadow-xs transition group"
            >
              <CategoryVisual
                category={cat}
                className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden"
                iconClassName="w-5 h-5"
                imageClassName="w-full h-full object-cover"
              />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0A68FF] transition-colors">
                  {cat.name}
                </h3>
                {cat.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {cat.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  };

  const renderProductCollectionSection = (section: HomepageSection) => {
    const cfg = section.config_json || {};
    const maxItems = Number.isFinite(Number(cfg.max_items))
      ? Math.max(1, Math.min(24, Number(cfg.max_items)))
      : 4;

    let resolvedProducts: Product[] = [];

    if (cfg.selection_mode === 'MANUAL_TARGETS') {
      const manualTargets = homepageTargets
        .filter(
          (t) =>
            t.section_id === section.id &&
            t.is_active !== false &&
            t.target_type === 'PRODUCT' &&
            Boolean(t.product_id)
        )
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      const seen = new Set<string>();
      for (const target of manualTargets) {
        if (!target.product_id || seen.has(target.product_id)) continue;
        const found = activeCatalogProducts.find(
          (p) => p.id === target.product_id
        );
        if (found) {
          seen.add(found.id);
          resolvedProducts.push(found);
        }
      }
    } else {
      const criterion =
        (cfg.auto_criterion as AutomaticProductCriterion) || 'is_featured';
      switch (criterion) {
        case 'is_bestseller':
          resolvedProducts = activeCatalogProducts.filter(
            (p) => p.is_bestseller
          );
          break;
        case 'is_on_promotion':
          resolvedProducts = activeCatalogProducts.filter(
            (p) =>
              p.is_on_promotion &&
              p.price_sale_pen !== null &&
              p.price_sale_pen < p.price_regular_pen
          );
          break;
        case 'is_new':
          resolvedProducts = activeCatalogProducts.filter((p) => p.is_new);
          break;
        case 'is_featured':
        default:
          resolvedProducts = activeCatalogProducts.filter(
            (p) => p.is_featured
          );
          break;
      }
    }

    const visibleProducts = resolvedProducts.slice(0, maxItems);
    if (visibleProducts.length === 0) return null;

    const badgeVariant =
      (section.badge_variant as HomepageBadgeVariant) || 'PRO';

    return (
      <section key={section.id} className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div>
            {section.badge_text && (
              <Badge variant={badgeVariant} className="mb-1.5">
                {section.badge_text}
              </Badge>
            )}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {section.title || section.admin_name}
            </h2>
            {section.subtitle && (
              <p className="text-xs text-slate-500">{section.subtitle}</p>
            )}
          </div>

          {section.cta_label && section.cta_url && (
            <Link
              to={resolveSmartUrl(section.cta_url, '/catalogo')}
              className="text-xs font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1 self-start md:self-auto shrink-0"
            >
              {section.cta_label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onQuickView={(prod) => setQuickViewProduct(prod)}
            />
          ))}
        </div>
      </section>
    );
  };

  const renderInfoBlockSection = (section: HomepageSection) => {
    const infoCards = homepageItems
      .filter(
        (i) => i.section_id === section.id && i.item_type === 'INFO_CARD'
      )
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    if (infoCards.length === 0) return null;

    const sectionBadgeVariant =
      (section.badge_variant as HomepageBadgeVariant) || 'PRO';

    return (
      <section key={section.id} className="space-y-5">
        {(section.title || section.subtitle || section.badge_text) && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              {section.badge_text && (
                <Badge variant={sectionBadgeVariant} className="mb-1.5">
                  {section.badge_text}
                </Badge>
              )}
              {section.title && (
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  {section.title}
                </h2>
              )}
              {section.subtitle && (
                <p className="text-xs text-slate-500">{section.subtitle}</p>
              )}
            </div>

            {section.cta_label && section.cta_url && (
              <Link
                to={resolveSmartUrl(section.cta_url, '/catalogo')}
                className="text-xs font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1 self-start md:self-auto shrink-0"
              >
                {section.cta_label}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            infoCards.length >= 4
              ? 'lg:grid-cols-4'
              : infoCards.length === 3
                ? 'lg:grid-cols-3'
                : 'lg:grid-cols-2'
          } gap-5`}
        >
          {infoCards.map((card) => {
            const IconComp = resolveLucideIconComponent(card.icon_name);
            const resolvedHex = resolveValidHexColor(
              card.icon_color_hex,
              '#0A68FF'
            );
            const hasImage = Boolean(
              card.image_desktop_url || card.image_mobile_url
            );
            const cardBadgeVariant =
              (card.badge_variant as HomepageBadgeVariant) || 'PRO';
            const cardUrl = card.cta_primary_url
              ? resolveSmartUrl(card.cta_primary_url, '/catalogo')
              : null;

            return (
              <div
                key={card.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs"
              >
                <div className="space-y-3">
                  {hasImage && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 h-36">
                      <picture>
                        {card.image_mobile_url && (
                          <source
                            media="(max-width: 767px)"
                            srcSet={card.image_mobile_url}
                          />
                        )}
                        <img
                          src={
                            card.image_desktop_url ||
                            card.image_mobile_url ||
                            ''
                          }
                          alt={card.image_alt_text || card.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <IconComp
                        className="w-5 h-5"
                        style={{ color: resolvedHex }}
                      />
                    </div>
                    {card.badge_text && (
                      <Badge variant={cardBadgeVariant}>
                        {card.badge_text}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {card.title}
                    </h3>
                    {card.subtitle && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {card.cta_primary_label && cardUrl && (
                  <div className="pt-4">
                    {card.open_in_new_tab || isExternalHref(cardUrl) ? (
                      <a
                        href={cardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1"
                      >
                        {card.cta_primary_label}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <Link
                        to={cardUrl}
                        className="text-xs font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1"
                      >
                        {card.cta_primary_label}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderDynamicSection = (section: HomepageSection) => {
    switch (section.section_type) {
      case 'HERO_BANNER':
        return renderHeroBannerSection(section);
      case 'VALUE_PROPOSITION':
        return renderValuePropositionSection(section);
      case 'DEAL_OF_THE_DAY':
        return renderDealOfTheDaySection(section);
      case 'CATEGORY_TABS_SHOWCASE':
        return renderCategoryTabsShowcaseSection(section);
      case 'PROMO_BANNERS':
        return renderPromoBannersSection(section);
      case 'FREE_RESOURCES':
        return renderFreeResourcesSection(section);
      case 'CUSTOM_SERVICES_CTA':
        return renderCustomServicesCtaSection(section);
      case 'FEATURED_CATEGORIES':
        return renderFeaturedCategoriesSection(section);
      case 'PRODUCT_COLLECTION':
        return renderProductCollectionSection(section);
      case 'INFO_BLOCK':
        return renderInfoBlockSection(section);
      default:
        return null;
    }
  };

  return (
    <div className="smartlab-container py-6 sm:py-8 space-y-10">
      {orderedSections.map((section) => renderDynamicSection(section))}

      {/* Modal de Vista Rápida */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
