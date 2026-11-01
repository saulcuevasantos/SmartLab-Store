/**
 * SmartLab Store — Pie de Página de 4 Columnas (#0F172A) y Barra Móvil Inferior Fija
 * docs/06_DISENO_VISUAL_UX_UI.md (Sección 6 y 7.2) & docs/08_PLAN_SPRINTS.md (Sprint 04)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  ShoppingCart,
  MessageCircle,
  User,
  Clock,
  Mail,
  ShieldCheck,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { buildSupportWhatsAppUrl } from '../../utils/whatsapp';
import { Category } from '../../types/catalog.types';
import { getCategories } from '../../services/catalog.service';
import { CategoryVisual } from '../../components/common';

export interface FooterProps {
  onOpenMobileCategories: () => void;
  cartCount?: number;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenMobileCategories,
  cartCount = 0,
}) => {
  const location = useLocation();
  const whatsappUrl = buildSupportWhatsAppUrl('Atención al cliente SmartLab Store');

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const fetchActiveCategories = useCallback(async () => {
    setIsLoadingCategories(true);
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
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCategories();
  }, [fetchActiveCategories, location.pathname]);

  return (
    <>
      {/* =====================================================================
          FOOTER OSCURO DE 4 COLUMNAS (#0F172A) — ESTILO TECHOZE-04
      ===================================================================== */}
      <footer className="bg-[#0F172A] text-slate-300 pt-12 pb-24 md:pb-10 border-t border-slate-800 mt-auto">
        <div className="smartlab-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            {/* Columna 1: Identidad SmartLab Store y Contacto Oficial */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0A68FF] text-white flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">
                  <span className="text-[#0A68FF]">SmartLab</span> Store
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tienda peruana de herramientas digitales para emprendedores, MYPES y profesionales: plantillas Excel, Google Sheets, sistemas, APKs Android y automatizaciones.
              </p>
              <div className="space-y-1.5 pt-1 text-xs text-slate-300">
                <p className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition"
                  >
                    WhatsApp Oficial de Atención y Pagos
                  </a>
                </p>
                <p className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4 text-[#0A68FF] shrink-0" />
                  <span>Verificación manual: Lun–Sáb 9:00 a.m. – 8:00 p.m.</span>
                </p>
                <p className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-4 h-4 text-[#0A68FF] shrink-0" />
                  <span>contacto@smartlab.pe</span>
                </p>
              </div>
            </div>

            {/* Columna 2: Categorías Activas Dinámicas */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Categorías del Catálogo
              </h4>
              {isLoadingCategories ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-[#0A68FF] animate-spin" />
                  <span>Cargando categorías...</span>
                </div>
              ) : categoriesError ? (
                <div className="space-y-1.5 text-xs text-slate-400">
                  <p className="text-red-400">{categoriesError}</p>
                  <button
                    type="button"
                    onClick={fetchActiveCategories}
                    className="text-[#0A68FF] hover:underline font-semibold cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              ) : categories.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hay categorías activas disponibles.
                </p>
              ) : (
                <ul className="space-y-2 text-xs text-slate-400">
                  {categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        to={`/catalogo?categoria=${encodeURIComponent(cat.slug)}`}
                        className="hover:text-white transition flex items-center gap-2"
                      >
                        <CategoryVisual
                          category={cat}
                          className="w-4 h-4 flex items-center justify-center shrink-0 overflow-hidden rounded-xs"
                          iconClassName="w-3.5 h-3.5"
                          imageClassName="w-full h-full object-cover"
                        />
                        <span className="truncate">{cat.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Columna 3: Guía de Compra, Pagos y Transparencia */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Pagos y Entrega Digital
              </h4>
              <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Pagos en Soles (<strong>PEN / S/</strong>) vía <strong>Yape</strong>,{' '}
                    <strong>Plin</strong> y <strong>Transferencia Bancaria</strong>.
                  </span>
                </li>
                <li>
                  • Los comprobantes en revisión no confirman el pago hasta su verificación administrativa.
                </li>
                <li>
                  • Entrega individual por WhatsApp únicamente cuando el producto está pagado al 100 %.
                </li>
                <li>
                  • Los productos cuyo enlace ya fue enviado no son reembolsables.
                </li>
              </ul>
            </div>

            {/* Columna 4: Mi Cuenta, Seguimiento y Soporte */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Cuenta del Cliente y Ayuda
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link to="/mi-cuenta/perfil" className="hover:text-white transition">
                    Mi Cuenta y Perfil
                  </Link>
                </li>
                <li>
                  <Link to="/mi-cuenta/pedidos" className="hover:text-white transition">
                    Seguimiento de Mis Pedidos y Saldos
                  </Link>
                </li>
                <li>
                  <Link to="/solicitud-personalizada" className="hover:text-white transition">
                    Solicitar Producto Personalizado
                  </Link>
                </li>
                <li>
                  <Link to="/soporte" className="hover:text-white transition">
                    Preguntas Frecuentes (FAQ) y Contacto
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Barra Inferior de Copyright y Medios de Pago */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>
              © {new Date().getFullYear()} <strong className="text-white">SmartLab Store Perú</strong>. Todos los derechos reservados. Moneda oficial: <strong>PEN (S/)</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-purple-300 border border-slate-700">
                Yape
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                Plin
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-orange-300 border border-slate-700">
                BCP
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-blue-300 border border-slate-700">
                BBVA
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                Interbank
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          BARRA INFERIOR FIJA TIPO APLICACIÓN EN MÓVIL (< 768px, height: 60px)
          docs/06_DISENO_VISUAL_UX_UI.md (Sección 7.2.1)
      ===================================================================== */}
      <nav
        aria-label="Navegación inferior móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-[#E2E8F0] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] z-40 grid grid-cols-5 items-center"
      >
        <Link
          to="/"
          className={`flex flex-col items-center justify-center h-full text-[10px] font-semibold transition ${
            location.pathname === '/' ? 'text-[#0A68FF]' : 'text-slate-600'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Inicio</span>
        </Link>

        <button
          type="button"
          onClick={onOpenMobileCategories}
          className="flex flex-col items-center justify-center h-full text-[10px] font-semibold text-slate-600 active:text-[#0A68FF]"
        >
          <LayoutGrid className="w-5 h-5 mb-0.5" />
          <span>Categorías</span>
        </button>

        <Link
          to="/carrito"
          className={`relative flex flex-col items-center justify-center h-full text-[10px] font-semibold transition ${
            location.pathname === '/carrito' ? 'text-[#0A68FF]' : 'text-slate-600'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#FF6B00] text-white text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span>Carrito</span>
        </Link>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center h-full text-[10px] font-semibold text-[#25D366]"
        >
          <MessageCircle className="w-5 h-5 mb-0.5" />
          <span>WhatsApp</span>
        </a>

        <Link
          to="/mi-cuenta/pedidos"
          className={`flex flex-col items-center justify-center h-full text-[10px] font-semibold transition ${
            location.pathname.startsWith('/mi-cuenta') || location.pathname === '/login'
              ? 'text-[#0A68FF]'
              : 'text-slate-600'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Cuenta</span>
        </Link>
      </nav>
    </>
  );
};
