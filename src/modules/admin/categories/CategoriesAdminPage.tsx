/**
 * SmartLab Store — Módulo Administrativo de Categorías (/admin/categories) — Sprint B3
 * - Listado completo de categorías (activas e inactivas) ordenadas por `display_order`.
 * - Buscador por nombre, filtro por estado (todas, activas, inactivas) y contador de productos asociados.
 * - Creación y edición mediante `CategoryFormModal` conectado a Supabase y `public-assets/categories/`.
 * - Advertencia al desactivar y protección de llaves foráneas (`ON DELETE RESTRICT`) al eliminar,
 *   ofreciendo la desactivación como alternativa segura cuando existen productos o solicitudes asociadas.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
  Package,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  X,
} from 'lucide-react';
import { Category } from '../../../types/catalog.types';
import {
  getAdminCategories,
  getAdminCategoryUsageSummary,
  updateAdminCategory,
  toggleAdminCategoryStatus,
  deleteAdminCategory,
} from '../../../services/admin.service';
import {
  CategoryVisual,
  resolveCategoryIconColorHex,
} from '../../../components/common';
import { CategoryFormModal } from './CategoryFormModal';

type CategoryStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface CategoryUsageStats {
  associatedProductsCount: number;
  associatedCustomRequestsCount: number;
}

export const CategoriesAdminPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, CategoryUsageStats>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<CategoryStatusFilter>('ALL');

  // Estados de feedback operativo
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);

  // Modal de Creación / Edición
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Modal de confirmación para Desactivar Categoría
  const [categoryToDeactivate, setCategoryToDeactivate] = useState<Category | null>(
    null
  );

  // Modal de confirmación / bloqueo para Eliminar Categoría
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [deleteBlockedReason, setDeleteBlockedReason] = useState<string | null>(
    null
  );

  const showSuccessFeedback = (msg: string) => {
    setActionError(null);
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((current) => (current === msg ? null : current));
    }, 5500);
  };

  const loadCategoriesAndUsage = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const cats = await getAdminCategories();
      const sorted = [...cats].sort(
        (a, b) =>
          Number(a.display_order ?? a.sort_order ?? 0) -
            Number(b.display_order ?? b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      );
      setCategories(sorted);

      const usageEntries = await Promise.all(
        sorted.map(async (cat) => {
          const stats = await getAdminCategoryUsageSummary(cat.id);
          return [cat.id, stats] as const;
        })
      );

      const nextUsageMap: Record<string, CategoryUsageStats> = {};
      for (const [id, stats] of usageEntries) {
        nextUsageMap[id] = stats;
      }
      setUsageMap(nextUsageMap);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las categorías administrativas.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategoriesAndUsage();
  }, [loadCategoriesAndUsage]);

  const counts = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.is_active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (statusFilter === 'ACTIVE' && !cat.is_active) return false;
      if (statusFilter === 'INACTIVE' && cat.is_active) return false;

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = cat.name.toLowerCase().includes(q);
        const matchesSlug = cat.slug.toLowerCase().includes(q);
        const matchesDesc = (cat.description || '').toLowerCase().includes(q);
        return matchesName || matchesSlug || matchesDesc;
      }

      return true;
    });
  }, [categories, statusFilter, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setActionError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setActionError(null);
    setIsFormModalOpen(true);
  };

  const handleCategorySaved = async (
    savedCategory: Category,
    isEditMode: boolean
  ) => {
    await loadCategoriesAndUsage();
    showSuccessFeedback(
      isEditMode
        ? `La categoría "${savedCategory.name}" fue actualizada correctamente.`
        : `La categoría "${savedCategory.name}" (ID: ${savedCategory.id}) fue creada exitosamente.`
    );
  };

  const handleRequestToggleStatus = (cat: Category) => {
    setActionError(null);
    if (cat.is_active) {
      // Al desactivar una categoría activa, advertir primero
      setCategoryToDeactivate(cat);
    } else {
      handleExecuteToggleStatus(cat, true);
    }
  };

  const handleExecuteToggleStatus = async (
    cat: Category,
    nextActive: boolean
  ) => {
    setBusyCategoryId(cat.id);
    setActionError(null);

    try {
      const result = await toggleAdminCategoryStatus(cat.id, nextActive);
      if (result.error || !result.category) {
        setActionError(
          result.error ||
            `No se pudo cambiar el estado de la categoría "${cat.name}".`
        );
        return;
      }

      setCategoryToDeactivate(null);
      setCategoryToDelete(null);
      setDeleteBlockedReason(null);
      await loadCategoriesAndUsage();
      showSuccessFeedback(
        nextActive
          ? `La categoría "${cat.name}" fue activada y ya está disponible en la tienda pública.`
          : `La categoría "${cat.name}" fue desactivada y se ocultó de la tienda pública sin alterar sus productos.`
      );
    } finally {
      setBusyCategoryId(null);
    }
  };

  const handleQuickOrderChange = async (cat: Category, delta: number) => {
    const currentOrder = Number(cat.display_order ?? cat.sort_order ?? 1);
    const nextOrder = Math.max(0, currentOrder + delta);
    if (nextOrder === currentOrder) return;

    setBusyCategoryId(cat.id);
    setActionError(null);

    try {
      const res = await updateAdminCategory(cat.id, {
        display_order: nextOrder,
        sort_order: nextOrder,
      });
      if (res.error) {
        setActionError(res.error);
        return;
      }
      await loadCategoriesAndUsage();
      showSuccessFeedback(
        `Orden de "${cat.name}" actualizado a #${nextOrder}.`
      );
    } finally {
      setBusyCategoryId(null);
    }
  };

  const handleRequestDeleteCategory = async (cat: Category) => {
    setActionError(null);
    setDeleteBlockedReason(null);
    setBusyCategoryId(cat.id);

    try {
      const freshUsage = await getAdminCategoryUsageSummary(cat.id);
      setUsageMap((prev) => ({ ...prev, [cat.id]: freshUsage }));

      if (
        freshUsage.associatedProductsCount > 0 ||
        freshUsage.associatedCustomRequestsCount > 0
      ) {
        const parts: string[] = [];
        if (freshUsage.associatedProductsCount > 0) {
          parts.push(`${freshUsage.associatedProductsCount} producto(s)`);
        }
        if (freshUsage.associatedCustomRequestsCount > 0) {
          parts.push(
            `${freshUsage.associatedCustomRequestsCount} solicitud(es) a medida`
          );
        }
        setDeleteBlockedReason(
          `La categoría "${cat.name}" tiene ${parts.join(' y ')} asociados en el catálogo (restricción ON DELETE RESTRICT). Para proteger el historial comercial y los productos existentes, no puede eliminarse físicamente.`
        );
      }

      setCategoryToDelete(cat);
    } finally {
      setBusyCategoryId(null);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const target = categoryToDelete;
    setBusyCategoryId(target.id);
    setActionError(null);

    try {
      const res = await deleteAdminCategory(target.id);
      if (!res.success) {
        if (res.blockedByRelations) {
          setDeleteBlockedReason(
            res.error ||
              `No se puede eliminar la categoría "${target.name}" porque tiene productos o solicitudes vinculadas.`
          );
          await loadCategoriesAndUsage();
          return;
        }

        setActionError(
          res.error || `No se pudo eliminar la categoría "${target.name}".`
        );
        setCategoryToDelete(null);
        return;
      }

      setCategoryToDelete(null);
      setDeleteBlockedReason(null);
      await loadCategoriesAndUsage();
      showSuccessFeedback(
        `La categoría "${target.name}" fue eliminada definitivamente.`
      );
    } finally {
      setBusyCategoryId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabecera del Módulo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF] block">
            Estructura del Catálogo • Almacenamiento Público y Ordenamiento
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Gestión Administrativa de Categorías
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Administra las categorías del catálogo digital, su orden de visualización (`display_order`), iconos Lucide e imágenes en `public-assets/categories/`.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadCategoriesAndUsage}
            disabled={isLoading}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Actualizar listado"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0A68FF]' : ''}`}
            />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Mensajes de Éxito y Error */}
      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-[#0A68FF] text-xs sm:text-sm font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-blue-500 hover:text-blue-800 p-1 cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-800 p-1 cursor-pointer"
            aria-label="Cerrar error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Buscador y Filtro por Estado */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar categoría por nombre, slug o descripción..."
            className="w-full h-10 pl-9 pr-8 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro segmentado: Todas, Activas e Inactivas */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activas ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'INACTIVE'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactivas ({counts.inactive})
          </button>
        </div>
      </div>

      {/* Contenido Principal: Estado de Carga, Error, Vacío o Listado */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-[#0A68FF] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Cargando categorías desde Supabase...
          </p>
          <p className="text-xs text-slate-500">
            Verificando orden de visualización, imágenes y productos asociados.
          </p>
        </div>
      ) : loadError ? (
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
          <AlertCircle className="w-7 h-7 text-red-600 mx-auto" />
          <p className="text-sm font-bold text-slate-900">
            Error al cargar las categorías
          </p>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{loadError}</p>
          <button
            type="button"
            onClick={loadCategoriesAndUsage}
            className="px-4 py-2 rounded-lg bg-[#0A68FF] text-white text-xs font-bold hover:bg-[#0854D1] transition cursor-pointer"
          >
            Reintentar carga
          </button>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-800">
            No se encontraron categorías con los filtros actuales
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Prueba limpiando el término de búsqueda o cambiando el filtro de estado.'
              : 'Aún no hay categorías registradas. Crea la primera categoría para empezar.'}
          </p>
          {searchQuery || statusFilter !== 'ALL' ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Restablecer filtros
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-lg bg-[#0A68FF] text-white text-xs font-bold hover:bg-[#0854D1] transition cursor-pointer"
            >
              Crear Categoría
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Vista de Tabla en Escritorio y Tablet Horizontal (>= md) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="table-scroll-container">
              <table className="w-full text-left border-collapse min-w-[880px] text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3 px-4 w-24">Orden</th>
                    <th className="py-3 px-4">Imagen / Icono</th>
                    <th className="py-3 px-4">Nombre y Slug</th>
                    <th className="py-3 px-4">Descripción</th>
                    <th className="py-3 px-4 text-center">Productos Asociados</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCategories.map((cat) => {
                    const orderVal = Number(
                      cat.display_order ?? cat.sort_order ?? 1
                    );
                    const stats = usageMap[cat.id] || {
                      associatedProductsCount: 0,
                      associatedCustomRequestsCount: 0,
                    };
                    const isBusy = busyCategoryId === cat.id;

                    return (
                      <tr
                        key={cat.id}
                        className={`hover:bg-slate-50/70 transition ${
                          !cat.is_active ? 'bg-slate-50/40' : ''
                        }`}
                      >
                        {/* Orden de visualización */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 text-sm w-6 text-center">
                              #{orderVal}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                disabled={isBusy || orderVal <= 0}
                                onClick={() => handleQuickOrderChange(cat, -1)}
                                className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                title="Subir posición (menor display_order)"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickOrderChange(cat, 1)}
                                className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                title="Bajar posición (mayor display_order)"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Imagen o Icono */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="relative w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                              <CategoryVisual
                                category={cat}
                                className="w-full h-full bg-blue-50/80 flex items-center justify-center overflow-hidden"
                                iconClassName="w-5 h-5"
                                imageClassName="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-[11px] text-slate-500 leading-tight">
                              <span className="font-mono text-slate-700 font-medium block">
                                {cat.icon_name || 'FolderOpen'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="w-2 h-2 rounded-full border border-slate-300 inline-block shrink-0"
                                  style={{
                                    backgroundColor: resolveCategoryIconColorHex(cat),
                                  }}
                                />
                                <span className="font-mono">
                                  {cat.image_url
                                    ? 'Imagen propia'
                                    : resolveCategoryIconColorHex(cat)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Nombre y Slug */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {cat.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 font-mono">
                            <span>slug: {cat.slug}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[11px] text-slate-400">
                              id: {cat.id}
                            </span>
                          </div>
                        </td>

                        {/* Descripción */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {cat.description ? (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {cat.description}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Sin descripción
                            </span>
                          )}
                        </td>

                        {/* Cantidad de Productos Asociados */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <Package className="w-3.5 h-3.5 text-[#0A68FF]" />
                            <span>
                              {stats.associatedProductsCount}{' '}
                              {stats.associatedProductsCount === 1
                                ? 'producto'
                                : 'productos'}
                            </span>
                          </div>
                          {stats.associatedCustomRequestsCount > 0 && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              + {stats.associatedCustomRequestsCount} solicitud(es)
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-xs font-semibold ${
                              cat.is_active
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {cat.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>

                        {/* Acciones: Editar, Activar/Desactivar, Eliminar */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleOpenEditModal(cat)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                              title="Editar categoría"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#0A68FF]" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRequestToggleStatus(cat)}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ${
                                cat.is_active
                                  ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800'
                                  : 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800'
                              }`}
                              title={
                                cat.is_active
                                  ? 'Desactivar categoría'
                                  : 'Activar categoría'
                              }
                            >
                              {cat.is_active ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Desactivar</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Activar</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRequestDeleteCategory(cat)}
                              className="p-1.5 rounded-lg border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-600 transition cursor-pointer disabled:opacity-50"
                              title="Eliminar categoría"
                              aria-label={`Eliminar categoría ${cat.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Adaptada en Tarjetas para Móviles y Tablets Compactas (< md) */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredCategories.map((cat) => {
              const orderVal = Number(cat.display_order ?? cat.sort_order ?? 1);
              const stats = usageMap[cat.id] || {
                associatedProductsCount: 0,
                associatedCustomRequestsCount: 0,
              };
              const isBusy = busyCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                          <CategoryVisual
                            category={cat}
                            className="w-full h-full bg-blue-50/80 flex items-center justify-center overflow-hidden"
                            iconClassName="w-5 h-5"
                            imageClassName="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="font-mono font-bold text-slate-700">
                              Orden #{orderVal}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                cat.is_active
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-amber-700 font-semibold'
                              }
                            >
                              {cat.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {cat.name}
                          </h3>
                          <p className="text-xs font-mono text-slate-500 truncate">
                            slug: {cat.slug}
                          </p>
                        </div>
                      </div>
                    </div>

                    {cat.description ? (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {cat.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Sin descripción registrada
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Package className="w-3.5 h-3.5 text-[#0A68FF]" />
                        {stats.associatedProductsCount}{' '}
                        {stats.associatedProductsCount === 1
                          ? 'producto asociado'
                          : 'productos asociados'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        ID: {cat.id}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleOpenEditModal(cat)}
                      className="py-2 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#0A68FF]" />
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRequestToggleStatus(cat)}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                        cat.is_active
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {cat.is_active ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          Activar
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRequestDeleteCategory(cat)}
                      className="py-2 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Reutilizable de Creación y Edición */}
      <CategoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingCategory={editingCategory}
        existingCategories={categories}
        onSaved={handleCategorySaved}
      />

      {/* Modal de Confirmación al Desactivar una Categoría */}
      {categoryToDeactivate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => {
            if (!busyCategoryId) setCategoryToDeactivate(null);
          }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ¿Desactivar la categoría &ldquo;{categoryToDeactivate.name}&rdquo;?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Al desactivar esta categoría, <strong>dejará de aparecer en la tienda pública</strong> (menús de navegación, pestañas y filtros del catálogo).
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Los productos vinculados y el historial de pedidos no se eliminarán y podrás volver a activarla en cualquier momento.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                disabled={Boolean(busyCategoryId)}
                onClick={() => setCategoryToDeactivate(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(busyCategoryId)}
                onClick={() =>
                  handleExecuteToggleStatus(categoryToDeactivate, false)
                }
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <EyeOff className="w-4 h-4" />
                <span>Sí, Desactivar Categoría</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación / Protección FK al Eliminar una Categoría */}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => {
            if (!busyCategoryId) {
              setCategoryToDelete(null);
              setDeleteBlockedReason(null);
            }
          }}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteBlockedReason ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Eliminación bloqueada por registros asociados
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {deleteBlockedReason}
                    </p>
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <strong>Alternativa recomendada:</strong> Puedes{' '}
                      <strong>desactivar</strong> la categoría para ocultarla inmediatamente de la tienda pública sin romper productos ni pedidos existentes.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={Boolean(busyCategoryId)}
                    onClick={() => {
                      setCategoryToDelete(null);
                      setDeleteBlockedReason(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
                  >
                    Cerrar
                  </button>

                  {categoryToDelete.is_active && (
                    <button
                      type="button"
                      disabled={Boolean(busyCategoryId)}
                      onClick={() =>
                        handleExecuteToggleStatus(categoryToDelete, false)
                      }
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4" />
                      <span>Desactivar en su lugar</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      ¿Eliminar definitivamente &ldquo;{categoryToDelete.name}&rdquo;?
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      Esta categoría no tiene productos ni solicitudes asociadas. Al confirmar, se eliminará de <code>public.categories</code> y, si posee una imagen propia en <code>public-assets/categories/</code>, también será removida.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={Boolean(busyCategoryId)}
                    onClick={() => {
                      setCategoryToDelete(null);
                      setDeleteBlockedReason(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(busyCategoryId)}
                    onClick={handleConfirmDeleteCategory}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Categoría</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
