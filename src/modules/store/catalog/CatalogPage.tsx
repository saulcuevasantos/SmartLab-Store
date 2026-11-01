import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Sparkles,
  Wrench,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Category,
  CategorySlug,
  Product,
  ProductModalidad,
  CatalogSortOption,
} from '../../../types/catalog.types';
import {
  getCategories,
  getProducts,
  findActiveCategoryBySlugOrEquivalent,
  areCategorySlugsEquivalent,
} from '../../../services/catalog.service';
import { Badge, Button, Loader, CategoryVisual } from '../../../components/common';
import { ProductCard } from './ProductCard';
import { QuickViewModal } from './QuickViewModal';

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = (searchParams.get('categoria') as CategorySlug | null) || 'all';
  const initialModalidad = (searchParams.get('modalidad') as ProductModalidad | null) || 'all';
  const initialQuery = searchParams.get('q') || '';
  const initialPromo =
    searchParams.get('ofertas') === 'true' || searchParams.get('oferta') === 'true';

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState<string>(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | 'all'>(initialCategory);
  const [selectedModalidad, setSelectedModalidad] = useState<ProductModalidad | 'all'>(
    initialModalidad
  );
  const [onlyPromotions, setOnlyPromotions] = useState<boolean>(initialPromo);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<CatalogSortOption>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Sincronizar cuando cambian parámetros de URL (por ejemplo clic desde Header o Footer)
  useEffect(() => {
    const urlCat = (searchParams.get('categoria') as CategorySlug | null) || 'all';
    const urlMod = (searchParams.get('modalidad') as ProductModalidad | null) || 'all';
    const urlQ = searchParams.get('q') || '';
    const urlOfertas =
      searchParams.get('ofertas') === 'true' || searchParams.get('oferta') === 'true';

    setSelectedCategory(urlCat);
    setSelectedModalidad(urlMod);
    setSearchText(urlQ);
    setOnlyPromotions(urlOfertas);
  }, [searchParams]);

  // Cargar categorías activas desde Supabase
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setCategories([]);
      setCategoriesError(
        err instanceof Error ? err.message : 'No se pudieron cargar las categorías.'
      );
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Cargar productos filtrados
  const loadProducts = useCallback(() => {
    let active = true;
    setIsLoading(true);
    setProductsError(null);

    const parsedMin = minPrice.trim() !== '' ? Number(minPrice) : undefined;
    const parsedMax = maxPrice.trim() !== '' ? Number(maxPrice) : undefined;

    getProducts({
      search: searchText,
      categorySlug: selectedCategory,
      modalidad: selectedModalidad,
      onlyPromotions,
      minPricePen: parsedMin,
      maxPricePen: parsedMax,
      sortBy,
    })
      .then((result) => {
        if (!active) return;
        setProducts(result);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setProducts([]);
        setProductsError(
          err instanceof Error ? err.message : 'No se pudieron cargar los productos del catálogo.'
        );
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchText, selectedCategory, selectedModalidad, onlyPromotions, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    const cleanup = loadProducts();
    return cleanup;
  }, [loadProducts]);

  const activeCategoryObj = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'all') return undefined;
    return findActiveCategoryBySlugOrEquivalent(selectedCategory, categories);
  }, [categories, selectedCategory]);

  const handleCategoryChange = (slug: CategorySlug | 'all') => {
    setSelectedCategory(slug);
    const next = new URLSearchParams(searchParams);
    if (slug === 'all') {
      next.delete('categoria');
    } else {
      next.set('categoria', slug);
    }
    setSearchParams(next, { replace: true });
  };

  const handleModalidadChange = (mod: ProductModalidad | 'all') => {
    setSelectedModalidad(mod);
    const next = new URLSearchParams(searchParams);
    if (mod === 'all') {
      next.delete('modalidad');
    } else {
      next.set('modalidad', mod);
    }
    setSearchParams(next, { replace: true });
  };

  const handleResetFilters = () => {
    setSearchText('');
    setSelectedCategory('all');
    setSelectedModalidad('all');
    setOnlyPromotions(false);
    setMinPrice('');
    setMaxPrice('');
    setSortBy('featured');
    setSearchParams({}, { replace: true });
  };

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedModalidad !== 'all' ? 1 : 0) +
    (onlyPromotions ? 1 : 0) +
    (minPrice.trim() !== '' || maxPrice.trim() !== '' ? 1 : 0) +
    (searchText.trim() !== '' ? 1 : 0);

  return (
    <div className="smartlab-container py-6 sm:py-8 space-y-6">
      {/* Cabecera del Catálogo */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-[#0A68FF]">
              Inicio
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">Catálogo Digital</span>
            {activeCategoryObj && (
              <>
                <span>/</span>
                <span className="font-bold text-[#0A68FF]">{activeCategoryObj.name}</span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {activeCategoryObj
              ? `Categoría: ${activeCategoryObj.name}`
              : 'Catálogo Completo de Soluciones Digitales'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            {activeCategoryObj?.description ||
              'Plantillas Excel, Google Sheets, Sistemas Web, Aplicaciones Android, Automatizaciones y Recursos Digitales en Soles (PEN / S/).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge variant="FREE">FREE (S/ 0.00)</Badge>
          <Badge variant="PRO">PRO</Badge>
          <Badge variant="PERSONALIZADO">PERSONALIZADO</Badge>
        </div>
      </div>

      {/* Barra Superior de Búsqueda, Ordenamiento y Botón de Filtros en Móvil */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Buscador por palabra clave, título o SKU */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre, tecnología o código SKU (ej. Kardex, POS, Android)..."
            aria-label="Buscar productos en el catálogo"
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none min-h-[42px]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón para abrir/cerrar filtros en móvil/tablet */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            className="lg:hidden"
          >
            Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
          </Button>

          {/* Selector de ordenamiento */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <label htmlFor="catalog-sort" className="text-xs font-semibold text-slate-600 hidden sm:inline">
              Ordenar por:
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CatalogSortOption)}
              className="w-full sm:w-auto px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:border-[#0A68FF] focus:outline-none min-h-[42px]"
            >
              <option value="featured">Destacados primero</option>
              <option value="bestsellers">Más vendidos</option>
              <option value="newest">Más recientes</option>
              <option value="price_asc">Precio: menor a mayor (S/)</option>
              <option value="price_desc">Precio: mayor a menor (S/)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cuerpo Principal: Sidebar de Filtros Combinables + Grilla de Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Lateral de Filtros */}
        <aside
          aria-label="Filtros del catálogo"
          className={`lg:col-span-3 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-6 shadow-xs ${
            mobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0A68FF]" />
              Filtros Combinables
            </h2>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-[#0A68FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>

          {/* 1. Filtro por Categoría Dinámica */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Categorías
              </h3>
              {!isLoadingCategories && !categoriesError && categories.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-400">
                  {categories.length}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#0A68FF] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Todas las categorías</span>
              </button>

              {isLoadingCategories ? (
                <div className="px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0A68FF]" />
                  <span>Cargando categorías...</span>
                </div>
              ) : categoriesError ? (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-2 text-xs text-red-700">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>{categoriesError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadCategories}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A68FF] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reintentar
                  </button>
                </div>
              ) : categories.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">
                  No hay categorías activas registradas.
                </p>
              ) : (
                categories.map((cat) => {
                  const isSelected =
                    selectedCategory !== 'all' &&
                    (activeCategoryObj?.id === cat.id ||
                      areCategorySlugsEquivalent(selectedCategory, cat.slug));

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(cat.slug)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#0A68FF] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CategoryVisual
                        category={cat}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 overflow-hidden transition-colors ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0A68FF]'
                        }`}
                        iconClassName="w-3.5 h-3.5"
                        imageClassName="w-full h-full object-cover"
                      />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Filtro por Modalidad (FREE / PRO / PERSONALIZADO) */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Modalidad de Producto
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'all', label: 'Todos' },
                  { key: 'PRO', label: 'PRO' },
                  { key: 'FREE', label: 'FREE (S/ 0)' },
                  { key: 'PERSONALIZADO', label: 'A Medida' },
                ] as const
              ).map((mod) => (
                <button
                  key={mod.key}
                  type="button"
                  onClick={() => handleModalidadChange(mod.key)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    selectedModalidad === mod.key
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {mod.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Filtro de Ofertas Activas */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyPromotions}
                onChange={(e) => setOnlyPromotions(e.target.checked)}
                className="w-4 h-4 rounded text-[#FF6B00] focus:ring-[#FF6B00]"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#FF6B00]" />
                Solo productos en oferta
              </span>
            </label>
          </div>

          {/* 4. Filtro de Rango de Precios en Soles (PEN / S/) */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Rango de Precio (S/)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="min-price-pen" className="text-[11px] text-slate-500 block mb-1">
                  Mínimo (S/)
                </label>
                <input
                  id="min-price-pen"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="max-price-pen" className="text-[11px] text-slate-500 block mb-1">
                  Máximo (S/)
                </label>
                <input
                  id="max-price-pen"
                  type="number"
                  min={0}
                  placeholder="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-[#0A68FF] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Banner Lateral de Solicitud Personalizada */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>¿No encuentras lo que buscas?</span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              Solicita la adaptación de cualquier plantilla o un sistema desde cero.
            </p>
            <Link to="/solicitud-personalizada" className="block pt-1">
              <Button variant="dark" size="sm" fullWidth leftIcon={<Wrench className="w-3.5 h-3.5" />}>
                Cotizar a Medida
              </Button>
            </Link>
          </div>
        </aside>

        {/* Grilla Principal de Productos */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Mostrando <strong className="text-slate-900">{products.length}</strong>{' '}
              {products.length === 1 ? 'producto disponible' : 'productos disponibles'} en{' '}
              <strong>PEN (S/)</strong>
            </span>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedCategory !== 'all' && (
                  <Badge variant="primary">
                    Categoría: {activeCategoryObj?.name || selectedCategory}
                  </Badge>
                )}
                {selectedModalidad !== 'all' && (
                  <Badge variant={selectedModalidad}>{selectedModalidad}</Badge>
                )}
                {onlyPromotions && <Badge variant="discount">En Oferta</Badge>}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 flex justify-center">
              <Loader label="Cargando soluciones digitales en S/..." />
            </div>
          ) : productsError ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-red-500 mx-auto" />
              <p className="text-sm font-bold text-slate-900">
                No se pudo cargar el catálogo de productos
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{productsError}</p>
              <div className="pt-2">
                <Button variant="primary" size="sm" onClick={loadProducts}>
                  Reintentar carga
                </Button>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <p className="text-base font-bold text-slate-900">
                No encontramos productos con esos filtros combinados
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Intenta ampliar el rango de precios en Soles (S/), cambiar de categoría o solicitar un desarrollo personalizado a medida.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Button variant="primary" size="sm" onClick={handleResetFilters}>
                  Restablecer todos los filtros
                </Button>
                <Link to="/solicitud-personalizada">
                  <Button variant="outline" size="sm">
                    Solicitar Producto a Medida
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={(prod) => setQuickViewProduct(prod)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Vista Rápida */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};
