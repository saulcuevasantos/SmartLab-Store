import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Category, Product } from '../../../types/catalog.types';
import {
  HomepageSection,
  HomepageSectionTarget,
  CategoryShowcaseTabConfig,
} from '../../../types/homepage.types';
import { DEFAULT_CATEGORY_SHOWCASE_TABS } from '../../../services/homepage.service';
import {
  doesProductMatchCategorySlug,
  getEquivalentCategoryIds,
} from '../../../services/catalog.service';
import { CategoryVisual } from '../../../components/common';
import { ProductCard } from '../catalog/ProductCard';

export interface CategoryTabsProps {
  products: Product[];
  categories: Category[];
  isLoadingCategories?: boolean;
  categoriesError?: string | null;
  onRetryCategories?: () => void;
  onQuickView?: (product: Product) => void;
  section?: HomepageSection | null;
  sectionTargets?: HomepageSectionTarget[];
}

const COLLECTION_TAB_KEYS = ['destacados', 'mas_vendidos', 'novedades', 'ofertas'] as const;

type ShowcaseTabKey =
  | (typeof COLLECTION_TAB_KEYS)[number]
  | string; // o slug de categoría activa

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  products,
  categories,
  isLoadingCategories = false,
  categoriesError = null,
  onRetryCategories,
  onQuickView,
  section = null,
  sectionTargets = [],
}) => {
  const cfg = section?.config_json || {};

  const sectionTitle =
    section?.title?.trim() || 'Soluciones Digitales por Categoría y Colección';
  const sectionSubtitle =
    section?.subtitle?.trim() || 'Explora productos FREE, PRO y PERSONALIZADO.';
  const ctaLabel = section?.cta_label?.trim() || 'Ver catálogo completo';
  const ctaUrl = section?.cta_url?.trim() || '/catalogo';

  const maxProductsPerTab = useMemo(() => {
    const raw = Number(cfg.max_products_per_tab ?? cfg.max_items_per_tab ?? 8);
    return Number.isFinite(raw) && raw > 0 ? Math.min(24, Math.max(1, raw)) : 8;
  }, [cfg.max_products_per_tab, cfg.max_items_per_tab]);

  const showActiveCategories = cfg.show_active_categories !== false;
  const categorySelectionMode =
    cfg.category_selection_mode === 'MANUAL_TARGETS'
      ? 'MANUAL_TARGETS'
      : 'ALL_ACTIVE';

  const collectionTabs = useMemo<CategoryShowcaseTabConfig[]>(() => {
    const rawTabs = Array.isArray(cfg.collection_tabs)
      ? (cfg.collection_tabs as CategoryShowcaseTabConfig[])
      : DEFAULT_CATEGORY_SHOWCASE_TABS;

    return [...rawTabs]
      .filter((tab) => tab && tab.enabled !== false)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [cfg.collection_tabs]);

  const allActiveCategories = useMemo(
    () =>
      [...categories]
        .filter((cat) => cat.is_active !== false)
        .sort((a, b) => {
          const orderDiff =
            Number(a.display_order ?? a.sort_order ?? 0) -
            Number(b.display_order ?? b.sort_order ?? 0);
          if (orderDiff !== 0) return orderDiff;
          return a.name.localeCompare(b.name, 'es');
        }),
    [categories]
  );

  const sortedCategories = useMemo(() => {
    if (!showActiveCategories) return [];
    if (categorySelectionMode !== 'MANUAL_TARGETS') {
      return allActiveCategories;
    }

    const manualTargets = sectionTargets
      .filter(
        (t) =>
          t.is_active !== false &&
          t.target_type === 'CATEGORY' &&
          Boolean(t.category_id) &&
          (t.collection_key === 'showcase_categories' ||
            t.collection_key === 'categories' ||
            t.collection_key === 'default')
      )
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    if (manualTargets.length === 0) {
      return [];
    }

    const seenIds = new Set<string>();
    const resolved: Category[] = [];

    for (const target of manualTargets) {
      if (!target.category_id) continue;
      const equivIds = getEquivalentCategoryIds(target.category_id);
      const matched = allActiveCategories.find(
        (cat) => equivIds.includes(cat.id) || cat.slug === target.category_id
      );
      if (matched && !seenIds.has(matched.id)) {
        seenIds.add(matched.id);
        resolved.push(matched);
      }
    }

    return resolved;
  }, [
    showActiveCategories,
    categorySelectionMode,
    allActiveCategories,
    sectionTargets,
  ]);

  const preferredInitialTab = useMemo<ShowcaseTabKey>(() => {
    const cfgDefault =
      typeof cfg.default_tab === 'string' && cfg.default_tab !== 'ALL'
        ? cfg.default_tab
        : null;
    if (cfgDefault && collectionTabs.some((t) => t.key === cfgDefault)) {
      return cfgDefault;
    }
    if (collectionTabs.length > 0) {
      return collectionTabs[0].key;
    }
    if (sortedCategories.length > 0) {
      return sortedCategories[0].slug;
    }
    return 'destacados';
  }, [cfg.default_tab, collectionTabs, sortedCategories]);

  const [activeTab, setActiveTab] = useState<ShowcaseTabKey>(preferredInitialTab);

  // Sincronizar pestaña activa si la pestaña actual fue deshabilitada o la categoría fue desactivada
  useEffect(() => {
    const isEnabledCollectionTab = collectionTabs.some((t) => t.key === activeTab);
    if (isEnabledCollectionTab) return;

    if (!isLoadingCategories) {
      const stillExistsInCategories = sortedCategories.some(
        (cat) => cat.slug === activeTab
      );
      if (!stillExistsInCategories) {
        setActiveTab(preferredInitialTab);
      }
    }
  }, [
    activeTab,
    collectionTabs,
    sortedCategories,
    isLoadingCategories,
    preferredInitialTab,
  ]);

  const activeCatalogProducts = useMemo(
    () => products.filter((p) => p.status === 'ACTIVO'),
    [products]
  );

  const displayedProducts = useMemo(() => {
    const matchingCollectionTab = collectionTabs.find((t) => t.key === activeTab);

    if (matchingCollectionTab) {
      if (matchingCollectionTab.selection_mode === 'MANUAL_TARGETS') {
        const manualTargets = sectionTargets
          .filter(
            (t) =>
              t.is_active !== false &&
              t.target_type === 'PRODUCT' &&
              Boolean(t.product_id) &&
              t.collection_key === matchingCollectionTab.key
          )
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

        const seen = new Set<string>();
        const manualList: Product[] = [];
        for (const target of manualTargets) {
          if (!target.product_id || seen.has(target.product_id)) continue;
          const prod = activeCatalogProducts.find((p) => p.id === target.product_id);
          if (prod) {
            seen.add(prod.id);
            manualList.push(prod);
          }
        }
        return manualList;
      }

      switch (matchingCollectionTab.key) {
        case 'destacados':
          return activeCatalogProducts.filter((p) => p.is_featured);
        case 'mas_vendidos':
          return activeCatalogProducts.filter((p) => p.is_bestseller);
        case 'novedades':
          return activeCatalogProducts.filter((p) => p.is_new);
        case 'ofertas':
          return activeCatalogProducts.filter(
            (p) =>
              p.is_on_promotion &&
              p.price_sale_pen !== null &&
              p.price_sale_pen < p.price_regular_pen
          );
        default:
          return [];
      }
    }

    return activeCatalogProducts.filter((p) =>
      doesProductMatchCategorySlug(p, activeTab, allActiveCategories)
    );
  }, [
    activeCatalogProducts,
    activeTab,
    collectionTabs,
    sectionTargets,
    allActiveCategories,
  ]);

  return (
    <section className="space-y-5" aria-labelledby="showcase-tabs-heading">
      {/* Cabecera de Sección + Pestañas Deslizables en Móvil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h2 id="showcase-tabs-heading" className="text-lg sm:text-xl font-bold text-slate-900">
            {sectionTitle}
          </h2>
          <p className="text-xs text-slate-500">
            {sectionSubtitle}
          </p>
        </div>

        <Link
          to={ctaUrl}
          className="text-xs font-bold text-[#0A68FF] hover:underline inline-flex items-center gap-1 self-start md:self-auto shrink-0"
        >
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Barra de Pestañas (Scroll horizontal limpio en móvil) */}
      <div
        role="tablist"
        aria-label="Filtros rápidos de vitrina"
        className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar"
      >
        {collectionTabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={isSelected}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[40px] ${
                isSelected
                  ? 'bg-[#0A68FF] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-[#0A68FF] hover:text-[#0A68FF]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        {showActiveCategories && isLoadingCategories && (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-500 bg-slate-100 border border-slate-200 whitespace-nowrap min-h-[40px]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0A68FF]" />
            Cargando categorías...
          </span>
        )}

        {showActiveCategories &&
          !isLoadingCategories &&
          !categoriesError &&
          sortedCategories.map((cat) => {
            const isSelected = activeTab === cat.slug;
            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setActiveTab(cat.slug)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer min-h-[40px] inline-flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#0A68FF] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-[#0A68FF] hover:text-[#0A68FF]'
                }`}
              >
                <CategoryVisual
                  category={cat}
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 overflow-hidden transition-colors ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0A68FF]'
                  }`}
                  iconClassName="w-3.5 h-3.5"
                  imageClassName="w-full h-full object-cover"
                />
                <span>{cat.name}</span>
              </button>
            );
          })}
      </div>

      {showActiveCategories && !isLoadingCategories && categoriesError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{categoriesError}</span>
          </div>
          {onRetryCategories && (
            <button
              type="button"
              onClick={onRetryCategories}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[#0A68FF] bg-white border border-slate-200 hover:bg-blue-50 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Grilla Techoze-04 de Tarjetas de Producto */}
      {displayedProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          No hay productos registrados en esta pestaña actualmente.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayedProducts.slice(0, maxProductsPerTab).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onQuickView={onQuickView}
            />
          ))}
        </div>
      )}
    </section>
  );
};
