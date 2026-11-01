/**
 * SmartLab Store — Encabezado de 3 Niveles fiel a Techoze-04 (Header.tsx)
 * docs/06_DISENO_VISUAL_UX_UI.md (Sección 2 y 7) & docs/08_PLAN_SPRINTS.md (Sprint 04)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  User,
  ShoppingCart,
  Menu,
  ChevronDown,
  MessageCircle,
  Shield,
  X,
  ArrowRight,
  Cpu,
  HelpCircle,
  PackageCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatPEN } from '../../utils/currency';
import { buildSupportWhatsAppUrl } from '../../utils/whatsapp';
import { Category } from '../../types/catalog.types';
import { getCategories } from '../../services/catalog.service';
import { CategoryVisual } from '../../components/common';

export interface HeaderProps {
  isMobileDrawerOpen: boolean;
  onOpenMobileDrawer: () => void;
  onCloseMobileDrawer: () => void;
  isCartDrawerOpen: boolean;
  onOpenCartDrawer: () => void;
  onCloseCartDrawer: () => void;
  cartCount?: number;
  cartTotalPen?: number;
}

export const Header: React.FC<HeaderProps> = ({
  isMobileDrawerOpen,
  onOpenMobileDrawer,
  onCloseMobileDrawer,
  isCartDrawerOpen,
  onOpenCartDrawer,
  onCloseCartDrawer,
  cartCount = 0,
  cartTotalPen = 0,
}) => {
  const { isAuthenticated, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const fetchActiveCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setCategories([]);
      setCategoriesError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las categorías.'
      );
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCategories();
  }, [fetchActiveCategories, location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    const qs = params.toString();
    navigate(qs ? `/catalogo?${qs}` : '/catalogo');
  };

  const isNavItemActive = (path: string, searchParamKey?: string, searchParamVal?: string) => {
    if (location.pathname !== path) return false;
    if (!searchParamKey) {
      return location.search === '';
    }
    const params = new URLSearchParams(location.search);
    return params.get(searchParamKey) === searchParamVal;
  };

  const whatsappUrl = buildSupportWhatsAppUrl('Consulta comercial en SmartLab Store');

  return (
    <>
      <header className="w-full z-40 sticky top-0 lg:static bg-white shadow-xs">
        {/* =====================================================================
            NIVEL 1: TOP BAR INFORMATIVA (#F8FAFC)
        ===================================================================== */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] sm:text-xs text-[#64748B]">
          <div className="smartlab-container py-2 flex flex-wrap items-center justify-between gap-2">
            <p className="truncate max-w-full sm:max-w-[60%]">
              Herramientas digitales para negocios — Entrega de enlaces por WhatsApp tras verificar tu pago
            </p>
            <div className="flex items-center gap-3 sm:gap-5 font-medium text-[#1E293B] ml-auto">
              <span className="inline-flex items-center gap-1 text-[#0A68FF] font-semibold">
                Moneda: <strong>PEN (S/)</strong>
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <Link
                to="/mi-cuenta/pedidos"
                className="hidden sm:inline-flex items-center gap-1 hover:text-[#0A68FF] transition-colors"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Seguimiento de Pedido
              </Link>
              <Link
                to="/soporte"
                className="hidden md:inline-flex items-center gap-1 hover:text-[#0A68FF] transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Preguntas Frecuentes
              </Link>
            </div>
          </div>
        </div>

        {/* =====================================================================
            NIVEL 2: MAIN HEADER (Logo, Buscador Amplio y Acciones)
        ===================================================================== */}
        <div className="bg-white border-b border-[#E2E8F0]">
          <div className="smartlab-container h-[64px] lg:h-[84px] flex items-center justify-between gap-3 lg:gap-6">
            {/* Botón Hamburguesa (Móvil / Tablet < 1024px) + Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenMobileDrawer}
                className="touch-target lg:hidden -ml-2 text-slate-700 hover:text-[#0A68FF] rounded-lg hover:bg-slate-100 transition"
                aria-label="Abrir menú de categorías"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0A68FF] text-white flex items-center justify-center shadow-xs group-hover:bg-[#0854D1] transition">
                  <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="leading-none">
                  <span className="text-lg sm:text-2xl font-bold tracking-tight">
                    <span className="text-[#0A68FF]">SmartLab</span>{' '}
                    <span className="text-[#0F172A]">Store</span>
                  </span>
                  <span className="block text-[10px] font-medium text-slate-400 tracking-wider uppercase mt-0.5">
                    Soluciones Digitales Perú
                  </span>
                </div>
              </Link>
            </div>

            {/* Buscador Central Limpio y Amplio (Visible en Tablet y Desktop >= 768px) */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden md:flex flex-1 max-w-2xl h-11 rounded-[8px] border-2 border-[#0A68FF] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 transition"
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar plantillas, sistemas, scripts..."
                className="flex-1 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none min-w-0"
              />

              <button
                type="submit"
                className="px-5 bg-[#0A68FF] hover:bg-[#0854D1] text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Buscar</span>
              </button>
            </form>

            {/* Bloque de Acciones Rápidas (Derecha) */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {/* Soporte WhatsApp (Desktop XL) */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:flex items-center gap-2.5 text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#25D366] flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white transition">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <span className="text-[11px] text-slate-400 block">Consultas y Pagos</span>
                  <strong className="text-xs text-slate-800 group-hover:text-[#0A68FF] transition">
                    WhatsApp Oficial
                  </strong>
                </div>
              </a>

              {/* Cuenta de Usuario */}
              {isAuthenticated && profile ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    to="/mi-cuenta/perfil"
                    className="touch-target px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-left transition"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0A68FF] flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="hidden sm:block leading-tight">
                      <span className="text-[11px] text-slate-400 block">Mi Cuenta</span>
                      <strong className="text-xs text-slate-800 max-w-[100px] truncate block">
                        {profile.full_name}
                      </strong>
                    </div>
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="touch-target px-2.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition"
                      title="Panel Administrativo"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Admin</span>
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="touch-target px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-left transition"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="hidden sm:block leading-tight">
                    <span className="text-[11px] text-slate-400 block">Mi Cuenta</span>
                    <strong className="text-xs text-slate-800 block">Ingresar / Registro</strong>
                  </div>
                </Link>
              )}

              {/* Mini-Carrito con Badge Naranja (#FF6B00) */}
              <button
                type="button"
                onClick={onOpenCartDrawer}
                className="touch-target px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-2.5 text-left transition relative"
                aria-label="Abrir carrito de compras"
              >
                <div className="relative w-9 h-9 rounded-full bg-orange-50 text-[#FF6B00] flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6B00] text-white text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <div className="hidden sm:block leading-tight">
                  <span className="text-[11px] text-slate-400 block">Mi Carrito</span>
                  <strong className="text-xs text-[#0A68FF] font-bold block">
                    {formatPEN(cartTotalPen)}
                  </strong>
                </div>
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda Móvil Secundaria (< 768px) */}
          <div className="md:hidden px-4 pb-3">
            <form
              onSubmit={handleSearchSubmit}
              className="flex h-11 rounded-lg border-2 border-[#0A68FF] bg-white overflow-hidden"
            >
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar plantillas, sistemas, scripts..."
                className="flex-1 px-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="px-4 bg-[#0A68FF] hover:bg-[#0854D1] text-white font-semibold text-xs flex items-center gap-1 shrink-0"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* =====================================================================
            NIVEL 3: BARRA DE NAVEGACIÓN HORIZONTAL (FONDO OSCURO #0F172A)
        ===================================================================== */}
        <nav className="bg-[#0F172A] text-white">
          <div className="smartlab-container h-12 flex items-center justify-between gap-4 lg:gap-6">
            {/* Botón Disparador "TODAS LAS CATEGORÍAS" (Dropdown en Desktop / Drawer o Dropdown al clic) */}
            <div
              className="relative h-full shrink-0 lg:w-[250px] xl:w-[270px]"
              onMouseEnter={() => setIsCategoryMenuOpen(true)}
              onMouseLeave={() => setIsCategoryMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                aria-expanded={isCategoryMenuOpen}
                className="w-full h-full px-3.5 sm:px-4 bg-[#0A68FF] hover:bg-[#0854D1] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between gap-2.5 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Menu className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">TODAS LAS CATEGORÍAS</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    isCategoryMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Menú Flotante Desplegable de Categorías Activas desde Supabase */}
              {isCategoryMenuOpen && (
                <div className="absolute left-0 top-full w-[280px] bg-white text-slate-800 border border-slate-200 rounded-b-xl shadow-xl py-2 z-50 max-h-[75vh] overflow-y-auto">
                  {isCategoriesLoading ? (
                    <div className="px-4 py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-[#0A68FF] animate-spin" />
                      <span>Cargando categorías...</span>
                    </div>
                  ) : categoriesError ? (
                    <div className="px-4 py-4 space-y-2 text-xs text-red-600">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{categoriesError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={fetchActiveCategories}
                        className="text-xs font-bold text-[#0A68FF] hover:underline cursor-pointer"
                      >
                        Reintentar
                      </button>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="px-4 py-5 text-center text-xs text-slate-500">
                      No hay categorías activas disponibles.
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/catalogo?categoria=${encodeURIComponent(cat.slug)}`}
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="px-4 py-2.5 hover:bg-blue-50/70 flex items-start gap-3 transition group"
                      >
                        <div className="mt-0.5 w-7 h-7 rounded-md bg-slate-100 group-hover:bg-white border border-slate-200/70 flex items-center justify-center overflow-hidden shrink-0 transition">
                          <CategoryVisual
                            category={cat}
                            className="w-full h-full flex items-center justify-center"
                            iconClassName="w-4 h-4"
                            imageClassName="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-[#0A68FF] block truncate">
                            {cat.name}
                          </span>
                          {cat.description && (
                            <span className="text-[11px] text-slate-400 truncate block">
                              {cat.description}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                  <div className="mt-1 pt-2 px-4 border-t border-slate-100">
                    <Link
                      to="/catalogo"
                      onClick={() => setIsCategoryMenuOpen(false)}
                      className="text-xs font-bold text-[#0A68FF] hover:underline flex items-center justify-between py-1"
                    >
                      <span>Ver catálogo completo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Menú de Navegación Horizontal Limpio y Directo + Enlace Derecho */}
            <div className="flex-1 flex items-center justify-between gap-6 overflow-x-auto no-scrollbar h-full">
              <div className="flex items-center gap-5 lg:gap-7 text-xs sm:text-[13px] font-medium text-slate-200 shrink-0">
                <Link
                  to="/"
                  className={`hover:text-white transition-colors whitespace-nowrap py-1 ${
                    isNavItemActive('/') ? 'text-[#0A68FF] font-semibold' : ''
                  }`}
                >
                  Inicio
                </Link>
                <Link
                  to="/catalogo?oferta=true"
                  className={`hover:text-white transition-colors whitespace-nowrap py-1 ${
                    isNavItemActive('/catalogo', 'oferta', 'true')
                      ? 'text-[#FF6B00] font-semibold'
                      : ''
                  }`}
                >
                  Ofertas Especiales
                </Link>
                <Link
                  to="/catalogo?modalidad=FREE"
                  className={`hover:text-white transition-colors whitespace-nowrap py-1 ${
                    isNavItemActive('/catalogo', 'modalidad', 'FREE')
                      ? 'text-emerald-400 font-semibold'
                      : ''
                  }`}
                >
                  Recursos Gratuitos
                </Link>
                <Link
                  to="/catalogo?modalidad=PRO"
                  className={`hover:text-white transition-colors whitespace-nowrap py-1 ${
                    isNavItemActive('/catalogo', 'modalidad', 'PRO')
                      ? 'text-[#0A68FF] font-semibold'
                      : ''
                  }`}
                >
                  Sistemas PRO
                </Link>
                <Link
                  to="/soporte"
                  className={`hover:text-white transition-colors whitespace-nowrap py-1 ${
                    isNavItemActive('/soporte') ? 'text-[#0A68FF] font-semibold' : ''
                  }`}
                >
                  Preguntas Frecuentes
                </Link>
              </div>

              {/* Llamado a la Acción Derecho: Desarrollo a Medida */}
              <Link
                to="/solicitud-personalizada"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 whitespace-nowrap flex items-center gap-1 shrink-0 ml-auto"
              >
                <span>¿Desarrollo a medida? Solicítalo aquí</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* =====================================================================
          DRAWER LATERAL OFF-CANVAS DE NAVEGACIÓN Y CATEGORÍAS (Móvil / Tablet)
      ===================================================================== */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex"
          onClick={onCloseMobileDrawer}
        >
          <div
            className="w-[85%] max-w-[320px] bg-white h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-[#0F172A] text-white flex items-center justify-between">
              <span className="font-bold text-base">
                <span className="text-[#0A68FF]">SmartLab</span> Store
              </span>
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                className="touch-target -mr-2 text-slate-300 hover:text-white"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Categorías Disponibles {!isCategoriesLoading && !categoriesError ? `(${categories.length})` : ''}
                </span>
                {isCategoriesLoading ? (
                  <div className="py-4 text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#0A68FF] animate-spin" />
                    <span>Cargando categorías...</span>
                  </div>
                ) : categoriesError ? (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1.5">
                    <p>{categoriesError}</p>
                    <button
                      type="button"
                      onClick={fetchActiveCategories}
                      className="font-bold text-[#0A68FF] hover:underline cursor-pointer"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : categories.length === 0 ? (
                  <p className="py-3 text-xs text-slate-500">
                    No hay categorías activas registradas actualmente.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/catalogo?categoria=${encodeURIComponent(cat.slug)}`}
                        onClick={onCloseMobileDrawer}
                        className="p-2.5 rounded-lg hover:bg-slate-100 flex items-center gap-3 text-xs font-semibold text-slate-800"
                      >
                        <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200/70 flex items-center justify-center overflow-hidden shrink-0">
                          <CategoryVisual
                            category={cat}
                            className="w-full h-full flex items-center justify-center"
                            iconClassName="w-4 h-4"
                            imageClassName="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate">{cat.name}</span>
                          {cat.description && (
                            <span className="text-[10px] font-normal text-slate-500 block truncate">
                              {cat.description}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Accesos Rápidos
                </span>
                <div className="space-y-1 text-xs font-medium text-slate-700">
                  <Link
                    to="/catalogo?modalidad=FREE"
                    onClick={onCloseMobileDrawer}
                    className="block p-2.5 rounded-lg hover:bg-emerald-50 text-emerald-700 font-semibold"
                  >
                    Recursos FREE (S/ 0.00)
                  </Link>
                  <Link
                    to="/catalogo?oferta=true"
                    onClick={onCloseMobileDrawer}
                    className="block p-2.5 rounded-lg hover:bg-orange-50 text-[#FF6B00] font-semibold"
                  >
                    Ofertas Destacadas
                  </Link>
                  <Link
                    to="/solicitud-personalizada"
                    onClick={onCloseMobileDrawer}
                    className="block p-2.5 rounded-lg hover:bg-amber-50 text-amber-700 font-semibold"
                  >
                    Solicitar Producto Personalizado
                  </Link>
                  <Link
                    to="/mi-cuenta/pedidos"
                    onClick={onCloseMobileDrawer}
                    className="block p-2.5 rounded-lg hover:bg-slate-100"
                  >
                    Mis Pedidos y Descargas
                  </Link>
                  <Link
                    to="/soporte"
                    onClick={onCloseMobileDrawer}
                    className="block p-2.5 rounded-lg hover:bg-slate-100"
                  >
                    Contacto y Preguntas Frecuentes
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <MessageCircle className="w-4 h-4" />
                Atención por WhatsApp Oficial
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
