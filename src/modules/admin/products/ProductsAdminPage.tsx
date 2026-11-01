/**
 * SmartLab Store — Gestión Administrativa de Productos, Categorías, Versiones y Enlaces Privados
 * docs/08_PLAN_SPRINTS.md (Sprint 08) y docs/07_SEGURIDAD.md
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Link2,
  ShieldCheck,
  CheckCircle2,
  EyeOff,
  Archive,
} from 'lucide-react';
import {
  Category,
  ProductStatus,
} from '../../../types/catalog.types';
import {
  AdminProductWithLinks,
  getAdminCategories,
  getAdminProducts,
  saveAdminProduct,
  updateProductStatusAdmin,
  UpsertProductAdminInput,
} from '../../../services/admin.service';
import { formatPEN } from '../../../utils/currency';
import { ProductFormModal } from './ProductFormModal';

export const ProductsAdminPage: React.FC = () => {
  const [products, setProducts] = useState<AdminProductWithLinks[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modalidadFilter, setModalidadFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<AdminProductWithLinks | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadCatalogData = async () => {
    setIsLoading(true);
    const [cats, prods] = await Promise.all([
      getAdminCategories(),
      getAdminProducts(),
    ]);
    setCategories(cats);
    setProducts(prods);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCatalogData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category_id !== categoryFilter) return false;
      if (modalidadFilter !== 'ALL' && p.modalidad !== modalidadFilter) return false;
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, categoryFilter, modalidadFilter, statusFilter, searchQuery]);

  const handleSaveProduct = async (input: UpsertProductAdminInput) => {
    await saveAdminProduct(input);
    await loadCatalogData();
    setFeedbackMsg(
      input.id
        ? `El producto "${input.name}" y sus enlaces privados fueron actualizados. Los pedidos históricos conservan sus snapshots intactos.`
        : `El producto "${input.name}" fue creado exitosamente en el catálogo.`
    );
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleChangeStatus = async (productId: string, nextStatus: ProductStatus) => {
    await updateProductStatusAdmin(productId, nextStatus);
    await loadCatalogData();
  };

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Catálogo Digital • Versiones y Repositorios Privados
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Gestión de Productos, Versiones y Enlaces (Drive / MediaFire)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Administra los recursos `FREE`, `PRO` y `PERSONALIZADO`, sus versiones activas y sus enlaces iniciales de descarga.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto Digital
        </button>
      </div>

      {/* Aviso de seguridad de enlaces privados */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-950">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Seguridad de Enlaces (`download_links`):</strong> Los enlaces de Google Drive y MediaFire gestionados aquí son de acceso exclusivo administrativo y nunca se exponen en el frontend público.
        </span>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0A68FF] text-xs sm:text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, SKU (ej. SL-XLS-001) o slug..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-700"
          >
            <option value="ALL">Todas las categorías (6)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={modalidadFilter}
            onChange={(e) => setModalidadFilter(e.target.value)}
            className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-700"
          >
            <option value="ALL">Toda modalidad</option>
            <option value="PRO">PRO (S/)</option>
            <option value="FREE">FREE (Gratis)</option>
            <option value="PERSONALIZADO">PERSONALIZADO</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-2.5 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm text-slate-700"
          >
            <option value="ALL">Todo estado</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
            <option value="ARCHIVADO">ARCHIVADO</option>
          </select>
        </div>
      </div>

      {/* Tabla Administrativa de Productos */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Cargando catálogo administrativo...
          </div>
        ) : (
          <div className="table-scroll-container">
            <table className="w-full text-left border-collapse min-w-[860px] text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Producto / SKU</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3 text-center">Modalidad</th>
                  <th className="py-3 px-3 text-center">Versión</th>
                  <th className="py-3 px-3 text-right">Precio (PEN)</th>
                  <th className="py-3 px-3 text-center">Enlaces Drive/MediaFire</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {prod.images?.[0]?.public_url && (
                          <img
                            src={prod.images[0].public_url}
                            alt={prod.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate max-w-xs">
                            {prod.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {prod.sku} • /{prod.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      {prod.category?.name || prod.category_id}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          prod.modalidad === 'FREE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : prod.modalidad === 'PERSONALIZADO'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-[#0A68FF]'
                        }`}
                      >
                        {prod.modalidad}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono text-xs font-semibold text-slate-700">
                      {prod.current_version}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      {prod.modalidad === 'FREE' ? (
                        <span className="font-bold text-emerald-700">S/ 0.00</span>
                      ) : prod.is_on_promotion && prod.price_sale_pen !== null ? (
                        <div>
                          <span className="font-bold text-[#0A68FF] block">
                            {formatPEN(prod.price_sale_pen)}
                          </span>
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatPEN(prod.price_regular_pen)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-900">
                          {formatPEN(prod.price_regular_pen)}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                        <Link2 className="w-3.5 h-3.5 text-[#0A68FF]" />
                        <span>{prod.downloadLinks.length} enlaces</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          prod.status === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : prod.status === 'INACTIVO'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {prod.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(prod);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-[#0A68FF] hover:text-[#0A68FF] text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar / Enlaces
                        </button>

                        {prod.status === 'ACTIVO' ? (
                          <button
                            type="button"
                            onClick={() => handleChangeStatus(prod.id, 'INACTIVO')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                            title="Pausar producto (Inactivo)"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleChangeStatus(prod.id, 'ACTIVO')}
                            className="p-1.5 rounded-lg border border-slate-200 text-emerald-600 hover:bg-emerald-50"
                            title="Activar producto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {prod.status !== 'ARCHIVADO' && (
                          <button
                            type="button"
                            onClick={() => handleChangeStatus(prod.id, 'ARCHIVADO')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Archivar producto"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        editingProduct={editingProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
};
