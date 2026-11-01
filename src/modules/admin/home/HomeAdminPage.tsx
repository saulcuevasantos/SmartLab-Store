/**
 * SmartLab Store — Módulo Administrativo de Portada y Promociones (/admin/home) — Sprints C2 y C3
 * Referencia: docs/09_PORTADA_Y_PROMOCIONES.md, docs/03_ARQUITECTURA.md, docs/04_BASE_DATOS.md, docs/07_SEGURIDAD.md
 *
 * Alcance Sprints C2 + C3:
 * 1. Estructura general de secciones de la página de inicio (`public.homepage_sections`).
 * 2. Hero Banner y múltiples slides del carrusel (`item_type = 'HERO_SLIDE'`, sección `hero_main`).
 * 3. Tarjetas promocionales laterales del Hero (`item_type = 'PROMO_CARD'`, sección `hero_main`).
 * 4. Banners promocionales secundarios (`item_type = 'SECONDARY_BANNER'`, sección `dual_banners` / `PROMO_BANNERS`).
 * - Conserva intacta la portada pública (`HomePage.tsx`), cuya conexión dinámica está programada para el Sprint C6.
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
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  LayoutTemplate,
  LayoutGrid,
  Sparkles,
  Layers,
  Globe,
  FileEdit,
  Clock,
  ExternalLink,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Shield,
  ArrowRight,
  Image as ImageIcon,
} from 'lucide-react';
import {
  HomepagePublishStatus,
  HomepageSection,
  HomepageSectionItem,
  HomepageSectionWithStats,
} from '../../../types/homepage.types';
import {
  getAdminHomepageSections,
  toggleAdminHomepageSectionActive,
  updateAdminHomepageSectionPublishStatus,
  reorderAdminHomepageSections,
  deleteAdminHomepageSection,
  getAdminHeroBannerData,
  toggleAdminHeroSlideActive,
  updateAdminHeroSlidePublishStatus,
  reorderAdminHeroSlides,
  deleteAdminHeroSlide,
  getAdminHeroPromoCards,
  toggleAdminHeroPromoCardActive,
  updateAdminHeroPromoCardPublishStatus,
  reorderAdminHeroPromoCards,
  deleteAdminHeroPromoCard,
  getAdminSecondaryBanners,
  toggleAdminSecondaryBannerActive,
  updateAdminSecondaryBannerPublishStatus,
  reorderAdminSecondaryBanners,
  deleteAdminSecondaryBanner,
  evaluateCampaignScheduleState,
  SEED_HERO_SECTION,
} from '../../../services/homepage.service';
import { HeroSlideFormModal } from './HeroSlideFormModal';
import { HomepageSectionFormModal } from './HomepageSectionFormModal';
import { PromoCardFormModal } from './PromoCardFormModal';
import { SecondaryBannerFormModal } from './SecondaryBannerFormModal';
import { ContentSectionsWorkspace } from './ContentSectionsWorkspace';

type AdminHomeTab =
  | 'SECTIONS'
  | 'HERO_SLIDES'
  | 'PROMO_CARDS'
  | 'SECONDARY_BANNERS'
  | 'CONTENT_C4';

type PublishFilter = 'ALL' | 'PUBLISHED' | 'DRAFT';
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

function formatScheduleDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const HomeAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminHomeTab>('SECTIONS');

  // Datos cargados desde Supabase
  const [sections, setSections] = useState<HomepageSectionWithStats[]>([]);
  const [heroSection, setHeroSection] =
    useState<HomepageSection>(SEED_HERO_SECTION);
  const [slides, setSlides] = useState<HomepageSectionItem[]>([]);
  const [promoCards, setPromoCards] = useState<HomepageSectionItem[]>([]);
  const [secondaryBanners, setSecondaryBanners] = useState<
    HomepageSectionItem[]
  >([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Filtros compartidos por pestaña
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');

  // Simulador interactivo de carrusel Hero
  const [showCarouselPreview, setShowCarouselPreview] =
    useState<boolean>(false);
  const [carouselPreviewIndex, setCarouselPreviewIndex] = useState<number>(0);
  const [carouselViewport, setCarouselViewport] = useState<
    'DESKTOP' | 'MOBILE'
  >('DESKTOP');
  const [bannerPreviewViewport, setBannerPreviewViewport] = useState<
    'DESKTOP' | 'MOBILE'
  >('DESKTOP');

  // Modales de Secciones (A)
  const [isSectionModalOpen, setIsSectionModalOpen] = useState<boolean>(false);
  const [editingSection, setEditingSection] =
    useState<HomepageSectionWithStats | null>(null);
  const [sectionToDelete, setSectionToDelete] =
    useState<HomepageSectionWithStats | null>(null);

  // Modales de Slides del Hero (C2)
  const [isSlideModalOpen, setIsSlideModalOpen] = useState<boolean>(false);
  const [editingSlide, setEditingSlide] =
    useState<HomepageSectionItem | null>(null);
  const [slidePreviewOnly, setSlidePreviewOnly] = useState<boolean>(false);
  const [slideToDelete, setSlideToDelete] =
    useState<HomepageSectionItem | null>(null);

  // Modales de Tarjetas Laterales del Hero (B)
  const [isPromoCardModalOpen, setIsPromoCardModalOpen] =
    useState<boolean>(false);
  const [editingPromoCard, setEditingPromoCard] =
    useState<HomepageSectionItem | null>(null);
  const [promoCardPreviewOnly, setPromoCardPreviewOnly] =
    useState<boolean>(false);
  const [promoCardToDelete, setPromoCardToDelete] =
    useState<HomepageSectionItem | null>(null);

  // Modales de Banners Secundarios (C)
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] =
    useState<HomepageSectionItem | null>(null);
  const [bannerPreviewOnly, setBannerPreviewOnly] = useState<boolean>(false);
  const [bannerToDelete, setBannerToDelete] =
    useState<HomepageSectionItem | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAllHomepageAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [sectionsRes, heroRes, promoRes, bannersRes] = await Promise.all([
        getAdminHomepageSections(),
        getAdminHeroBannerData(),
        getAdminHeroPromoCards(),
        getAdminSecondaryBanners(),
      ]);

      const firstError =
        sectionsRes.error ||
        heroRes.error ||
        promoRes.error ||
        bannersRes.error;
      if (firstError) {
        setErrorMsg(firstError);
      }

      setSections(sectionsRes.sections);
      setHeroSection(heroRes.section);
      setSlides(heroRes.slides);
      setPromoCards(promoRes.cards);
      setSecondaryBanners(bannersRes.banners);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al cargar la administración de portada y promociones.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllHomepageAdminData();
  }, [loadAllHomepageAdminData]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackBanner({ type, message });
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  // Listas ordenadas por display_order
  const sortedSections = useMemo(
    () =>
      [...sections].sort((a, b) => {
        const diff = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (diff !== 0) return diff;
        return a.created_at.localeCompare(b.created_at);
      }),
    [sections]
  );

  const sortedSlides = useMemo(
    () =>
      [...slides].sort((a, b) => {
        const diff = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (diff !== 0) return diff;
        return a.created_at.localeCompare(b.created_at);
      }),
    [slides]
  );

  const sortedPromoCards = useMemo(
    () =>
      [...promoCards].sort((a, b) => {
        const diff = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (diff !== 0) return diff;
        return a.created_at.localeCompare(b.created_at);
      }),
    [promoCards]
  );

  const sortedBanners = useMemo(
    () =>
      [...secondaryBanners].sort((a, b) => {
        const diff = (a.display_order ?? 0) - (b.display_order ?? 0);
        if (diff !== 0) return diff;
        return a.created_at.localeCompare(b.created_at);
      }),
    [secondaryBanners]
  );

  // Filtros aplicados según la pestaña activa
  const filteredSections = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sortedSections.filter((sec) => {
      if (publishFilter !== 'ALL' && sec.status !== publishFilter) return false;
      if (activeFilter === 'ACTIVE' && !sec.is_active) return false;
      if (activeFilter === 'INACTIVE' && sec.is_active) return false;
      if (!q) return true;
      return (
        sec.admin_name.toLowerCase().includes(q) ||
        (sec.code || '').toLowerCase().includes(q) ||
        sec.section_type.toLowerCase().includes(q) ||
        (sec.title || '').toLowerCase().includes(q) ||
        (sec.subtitle || '').toLowerCase().includes(q)
      );
    });
  }, [sortedSections, searchTerm, publishFilter, activeFilter]);

  const filteredSlides = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sortedSlides.filter((item) => {
      if (publishFilter !== 'ALL' && item.status !== publishFilter) return false;
      if (activeFilter === 'ACTIVE' && !item.is_active) return false;
      if (activeFilter === 'INACTIVE' && item.is_active) return false;
      if (!q) return true;
      return (
        item.admin_name.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.badge_text || '').toLowerCase().includes(q) ||
        (item.subtitle || '').toLowerCase().includes(q)
      );
    });
  }, [sortedSlides, searchTerm, publishFilter, activeFilter]);

  const filteredPromoCards = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sortedPromoCards.filter((item) => {
      if (publishFilter !== 'ALL' && item.status !== publishFilter) return false;
      if (activeFilter === 'ACTIVE' && !item.is_active) return false;
      if (activeFilter === 'INACTIVE' && item.is_active) return false;
      if (!q) return true;
      return (
        item.admin_name.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.badge_text || '').toLowerCase().includes(q) ||
        (item.subtitle || '').toLowerCase().includes(q)
      );
    });
  }, [sortedPromoCards, searchTerm, publishFilter, activeFilter]);

  const filteredBanners = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return sortedBanners.filter((item) => {
      if (publishFilter !== 'ALL' && item.status !== publishFilter) return false;
      if (activeFilter === 'ACTIVE' && !item.is_active) return false;
      if (activeFilter === 'INACTIVE' && item.is_active) return false;
      if (!q) return true;
      return (
        item.admin_name.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.badge_text || '').toLowerCase().includes(q) ||
        (item.subtitle || '').toLowerCase().includes(q)
      );
    });
  }, [sortedBanners, searchTerm, publishFilter, activeFilter]);

  // Orden sugerido para nuevos registros
  const nextSectionOrder = useMemo(() => {
    if (sortedSections.length === 0) return 1;
    return (
      Math.max(...sortedSections.map((s) => Number(s.display_order) || 0)) + 1
    );
  }, [sortedSections]);

  const nextSlideOrder = useMemo(() => {
    if (sortedSlides.length === 0) return 1;
    return (
      Math.max(...sortedSlides.map((s) => Number(s.display_order) || 0)) + 1
    );
  }, [sortedSlides]);

  const nextPromoCardOrder = useMemo(() => {
    if (sortedPromoCards.length === 0) return 1;
    return (
      Math.max(...sortedPromoCards.map((c) => Number(c.display_order) || 0)) + 1
    );
  }, [sortedPromoCards]);

  const nextBannerOrder = useMemo(() => {
    if (sortedBanners.length === 0) return 1;
    return (
      Math.max(...sortedBanners.map((b) => Number(b.display_order) || 0)) + 1
    );
  }, [sortedBanners]);

  // ==========================================================================
  // HANDLERS: A. SECCIONES DE PORTADA (public.homepage_sections)
  // ==========================================================================

  const handleSectionSaved = (
    savedSection: HomepageSection,
    isNew: boolean
  ) => {
    setSections((prev) => {
      const exists = prev.some((s) => s.id === savedSection.id);
      const next = exists
        ? prev.map((s) =>
            s.id === savedSection.id ? { ...s, ...savedSection } : s
          )
        : [
            ...prev,
            {
              ...savedSection,
              items_count: 0,
              is_protected_base: false,
            },
          ];
      return next.sort((a, b) => a.display_order - b.display_order);
    });

    showFeedback(
      'success',
      isNew
        ? `Sección "${savedSection.admin_name}" creada correctamente (${savedSection.status}).`
        : `Sección "${savedSection.admin_name}" actualizada correctamente (${savedSection.status}).`
    );
  };

  const handleToggleSectionActive = async (sec: HomepageSectionWithStats) => {
    const nextActive = !sec.is_active;
    setBusyId(sec.id);
    try {
      const res = await toggleAdminHomepageSectionActive(sec.id, nextActive);
      if (res.error || !res.section) {
        showFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado de la sección.'
        );
        return;
      }
      setSections((prev) =>
        prev.map((s) => (s.id === sec.id ? { ...s, ...res.section! } : s))
      );
      showFeedback(
        'success',
        `Sección "${sec.admin_name}" ${
          nextActive ? 'activada' : 'desactivada'
        } correctamente.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSectionPublish = async (sec: HomepageSectionWithStats) => {
    const nextStatus: HomepagePublishStatus =
      sec.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setBusyId(sec.id);
    try {
      const res = await updateAdminHomepageSectionPublishStatus(
        sec.id,
        nextStatus
      );
      if (res.error || !res.section) {
        showFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado de publicación.'
        );
        return;
      }
      setSections((prev) =>
        prev.map((s) => (s.id === sec.id ? { ...s, ...res.section! } : s))
      );
      showFeedback(
        'success',
        `Sección "${sec.admin_name}" actualizada a ${nextStatus}.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveSectionOrder = async (
    indexInSorted: number,
    direction: 'UP' | 'DOWN'
  ) => {
    const targetIdx =
      direction === 'UP' ? indexInSorted - 1 : indexInSorted + 1;
    if (targetIdx < 0 || targetIdx >= sortedSections.length) return;

    const reordered = [...sortedSections];
    const [moved] = reordered.splice(indexInSorted, 1);
    reordered.splice(targetIdx, 0, moved);

    const payload = reordered.map((sec, idx) => ({
      id: sec.id,
      display_order: idx + 1,
    }));

    setBusyId(moved.id);
    try {
      const res = await reorderAdminHomepageSections(payload);
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'No se pudo reordenar la sección.'
        );
        return;
      }
      const orderMap = new Map(payload.map((o) => [o.id, o.display_order]));
      setSections((prev) =>
        prev
          .map((s) =>
            orderMap.has(s.id)
              ? { ...s, display_order: orderMap.get(s.id)! }
              : s
          )
          .sort((a, b) => a.display_order - b.display_order)
      );
      showFeedback(
        'success',
        `Orden actualizado: "${moved.admin_name}" ahora está en la posición #${
          targetIdx + 1
        }.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    setBusyId(sectionToDelete.id);
    try {
      const res = await deleteAdminHomepageSection(sectionToDelete.id);
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'No se pudo eliminar la sección de portada.'
        );
        return;
      }
      const deletedName = sectionToDelete.admin_name;
      setSections((prev) => prev.filter((s) => s.id !== sectionToDelete.id));
      setSectionToDelete(null);
      showFeedback(
        'success',
        `Sección "${deletedName}" eliminada correctamente.`
      );
    } finally {
      setBusyId(null);
    }
  };

  // ==========================================================================
  // HANDLERS: SLIDES DEL HERO (HERO_SLIDE — C2)
  // ==========================================================================

  const handleSlideSaved = (
    savedSlide: HomepageSectionItem,
    isNew: boolean
  ) => {
    setSlides((prev) => {
      const exists = prev.some((s) => s.id === savedSlide.id);
      const next = exists
        ? prev.map((s) => (s.id === savedSlide.id ? savedSlide : s))
        : [...prev, savedSlide];
      return next.sort((a, b) => a.display_order - b.display_order);
    });
    showFeedback(
      'success',
      isNew
        ? `Slide "${savedSlide.admin_name}" creado correctamente (${savedSlide.status}).`
        : `Slide "${savedSlide.admin_name}" actualizado correctamente (${savedSlide.status}).`
    );
  };

  const handleToggleSlideActive = async (slide: HomepageSectionItem) => {
    const nextActive = !slide.is_active;
    setBusyId(slide.id);
    try {
      const result = await toggleAdminHeroSlideActive(slide.id, nextActive);
      if (result.error || !result.slide) {
        showFeedback('error', result.error || 'No se pudo cambiar el estado.');
        return;
      }
      setSlides((prev) =>
        prev.map((s) => (s.id === slide.id ? result.slide! : s))
      );
      showFeedback(
        'success',
        `Slide "${slide.admin_name}" ${
          nextActive ? 'activado' : 'desactivado'
        }.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSlidePublish = async (slide: HomepageSectionItem) => {
    const nextStatus: HomepagePublishStatus =
      slide.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setBusyId(slide.id);
    try {
      const result = await updateAdminHeroSlidePublishStatus(
        slide.id,
        nextStatus
      );
      if (result.error || !result.slide) {
        showFeedback(
          'error',
          result.error || 'No se pudo cambiar el estado de publicación.'
        );
        return;
      }
      setSlides((prev) =>
        prev.map((s) => (s.id === slide.id ? result.slide! : s))
      );
      showFeedback(
        'success',
        `Slide "${slide.admin_name}" actualizado a ${nextStatus}.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveSlideOrder = async (
    indexInSorted: number,
    direction: 'UP' | 'DOWN'
  ) => {
    const targetIdx =
      direction === 'UP' ? indexInSorted - 1 : indexInSorted + 1;
    if (targetIdx < 0 || targetIdx >= sortedSlides.length) return;

    const reordered = [...sortedSlides];
    const [moved] = reordered.splice(indexInSorted, 1);
    reordered.splice(targetIdx, 0, moved);

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));

    setBusyId(moved.id);
    try {
      const result = await reorderAdminHeroSlides(payload);
      if (!result.success) {
        showFeedback('error', result.error || 'No se pudo reordenar el slide.');
        return;
      }
      const orderMap = new Map(payload.map((o) => [o.id, o.display_order]));
      setSlides((prev) =>
        prev
          .map((s) =>
            orderMap.has(s.id)
              ? { ...s, display_order: orderMap.get(s.id)! }
              : s
          )
          .sort((a, b) => a.display_order - b.display_order)
      );
      showFeedback(
        'success',
        `Orden actualizado: "${moved.admin_name}" en posición #${
          targetIdx + 1
        }.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDeleteSlide = async () => {
    if (!slideToDelete) return;
    setBusyId(slideToDelete.id);
    try {
      const result = await deleteAdminHeroSlide(slideToDelete.id);
      if (!result.success) {
        showFeedback(
          'error',
          result.error || 'No se pudo eliminar el slide del Hero.'
        );
        return;
      }
      const deletedName = slideToDelete.admin_name;
      setSlides((prev) => prev.filter((s) => s.id !== slideToDelete.id));
      setSlideToDelete(null);
      showFeedback(
        'success',
        `Slide "${deletedName}" eliminado correctamente.`
      );
    } finally {
      setBusyId(null);
    }
  };

  // ==========================================================================
  // HANDLERS: B. TARJETAS LATERALES DEL HERO (PROMO_CARD — C3)
  // ==========================================================================

  const handlePromoCardSaved = (
    savedCard: HomepageSectionItem,
    isNew: boolean
  ) => {
    setPromoCards((prev) => {
      const exists = prev.some((c) => c.id === savedCard.id);
      const next = exists
        ? prev.map((c) => (c.id === savedCard.id ? savedCard : c))
        : [...prev, savedCard];
      return next.sort((a, b) => a.display_order - b.display_order);
    });
    showFeedback(
      'success',
      isNew
        ? `Tarjeta lateral "${savedCard.admin_name}" creada correctamente (${savedCard.status}).`
        : `Tarjeta lateral "${savedCard.admin_name}" actualizada correctamente (${savedCard.status}).`
    );
  };

  const handleTogglePromoCardActive = async (card: HomepageSectionItem) => {
    const nextActive = !card.is_active;
    setBusyId(card.id);
    try {
      const res = await toggleAdminHeroPromoCardActive(card.id, nextActive);
      if (res.error || !res.card) {
        showFeedback('error', res.error || 'No se pudo cambiar el estado.');
        return;
      }
      setPromoCards((prev) =>
        prev.map((c) => (c.id === card.id ? res.card! : c))
      );
      showFeedback(
        'success',
        `Tarjeta "${card.admin_name}" ${
          nextActive ? 'activada' : 'desactivada'
        }.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePromoCardPublish = async (card: HomepageSectionItem) => {
    const nextStatus: HomepagePublishStatus =
      card.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setBusyId(card.id);
    try {
      const res = await updateAdminHeroPromoCardPublishStatus(
        card.id,
        nextStatus
      );
      if (res.error || !res.card) {
        showFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado de publicación.'
        );
        return;
      }
      setPromoCards((prev) =>
        prev.map((c) => (c.id === card.id ? res.card! : c))
      );
      showFeedback(
        'success',
        `Tarjeta "${card.admin_name}" actualizada a ${nextStatus}.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMovePromoCardOrder = async (
    indexInSorted: number,
    direction: 'UP' | 'DOWN'
  ) => {
    const targetIdx =
      direction === 'UP' ? indexInSorted - 1 : indexInSorted + 1;
    if (targetIdx < 0 || targetIdx >= sortedPromoCards.length) return;

    const reordered = [...sortedPromoCards];
    const [moved] = reordered.splice(indexInSorted, 1);
    reordered.splice(targetIdx, 0, moved);

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));

    setBusyId(moved.id);
    try {
      const res = await reorderAdminHeroPromoCards(payload);
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'No se pudo reordenar la tarjeta lateral.'
        );
        return;
      }
      const orderMap = new Map(payload.map((o) => [o.id, o.display_order]));
      setPromoCards((prev) =>
        prev
          .map((c) =>
            orderMap.has(c.id)
              ? { ...c, display_order: orderMap.get(c.id)! }
              : c
          )
          .sort((a, b) => a.display_order - b.display_order)
      );
      showFeedback(
        'success',
        `Orden actualizado: "${moved.admin_name}" en posición #${
          targetIdx + 1
        }.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDeletePromoCard = async () => {
    if (!promoCardToDelete) return;
    setBusyId(promoCardToDelete.id);
    try {
      const res = await deleteAdminHeroPromoCard(promoCardToDelete.id);
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'No se pudo eliminar la tarjeta lateral.'
        );
        return;
      }
      const deletedName = promoCardToDelete.admin_name;
      setPromoCards((prev) =>
        prev.filter((c) => c.id !== promoCardToDelete.id)
      );
      setPromoCardToDelete(null);
      showFeedback(
        'success',
        `Tarjeta "${deletedName}" eliminada correctamente.`
      );
    } finally {
      setBusyId(null);
    }
  };

  // ==========================================================================
  // HANDLERS: C. BANNERS PROMOCIONALES SECUNDARIOS (SECONDARY_BANNER — C3)
  // ==========================================================================

  const handleBannerSaved = (
    savedBanner: HomepageSectionItem,
    isNew: boolean
  ) => {
    setSecondaryBanners((prev) => {
      const exists = prev.some((b) => b.id === savedBanner.id);
      const next = exists
        ? prev.map((b) => (b.id === savedBanner.id ? savedBanner : b))
        : [...prev, savedBanner];
      return next.sort((a, b) => a.display_order - b.display_order);
    });
    showFeedback(
      'success',
      isNew
        ? `Banner secundario "${savedBanner.admin_name}" creado correctamente (${savedBanner.status}).`
        : `Banner secundario "${savedBanner.admin_name}" actualizado correctamente (${savedBanner.status}).`
    );
  };

  const handleToggleBannerActive = async (banner: HomepageSectionItem) => {
    const nextActive = !banner.is_active;
    setBusyId(banner.id);
    try {
      const res = await toggleAdminSecondaryBannerActive(banner.id, nextActive);
      if (res.error || !res.banner) {
        showFeedback('error', res.error || 'No se pudo cambiar el estado.');
        return;
      }
      setSecondaryBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? res.banner! : b))
      );
      showFeedback(
        'success',
        `Banner "${banner.admin_name}" ${
          nextActive ? 'activado' : 'desactivado'
        }.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleBannerPublish = async (banner: HomepageSectionItem) => {
    const nextStatus: HomepagePublishStatus =
      banner.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setBusyId(banner.id);
    try {
      const res = await updateAdminSecondaryBannerPublishStatus(
        banner.id,
        nextStatus
      );
      if (res.error || !res.banner) {
        showFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado de publicación.'
        );
        return;
      }
      setSecondaryBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? res.banner! : b))
      );
      showFeedback(
        'success',
        `Banner "${banner.admin_name}" actualizado a ${nextStatus}.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveBannerOrder = async (
    indexInSorted: number,
    direction: 'UP' | 'DOWN'
  ) => {
    const targetIdx =
      direction === 'UP' ? indexInSorted - 1 : indexInSorted + 1;
    if (targetIdx < 0 || targetIdx >= sortedBanners.length) return;

    const reordered = [...sortedBanners];
    const [moved] = reordered.splice(indexInSorted, 1);
    reordered.splice(targetIdx, 0, moved);

    const payload = reordered.map((item, idx) => ({
      id: item.id,
      display_order: idx + 1,
    }));

    setBusyId(moved.id);
    try {
      const res = await reorderAdminSecondaryBanners(payload);
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'No se pudo reordenar el banner secundario.'
        );
        return;
      }
      const orderMap = new Map(payload.map((o) => [o.id, o.display_order]));
      setSecondaryBanners((prev) =>
        prev
          .map((b) =>
            orderMap.has(b.id)
              ? { ...b, display_order: orderMap.get(b.id)! }
              : b
          )
          .sort((a, b) => a.display_order - b.display_order)
      );
      showFeedback(
        'success',
        `Orden actualizado: "${moved.admin_name}" en posición #${
          targetIdx + 1
        }.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDeleteBanner = async () => {
    if (!bannerToDelete) return;
    setBusyId(bannerToDelete.id);
    try {
      const res = await deleteAdminSecondaryBanner(bannerToDelete.id);
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'No se pudo eliminar el banner secundario.'
        );
        return;
      }
      const deletedName = bannerToDelete.admin_name;
      setSecondaryBanners((prev) =>
        prev.filter((b) => b.id !== bannerToDelete.id)
      );
      setBannerToDelete(null);
      showFeedback(
        'success',
        `Banner "${deletedName}" eliminado correctamente.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const activePreviewSlide =
    sortedSlides[
      Math.min(carouselPreviewIndex, Math.max(0, sortedSlides.length - 1))
    ] || null;

  return (
    <div className="space-y-6">
      {/* Cabecera Operativa Principal de /admin/home */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0A68FF] border border-blue-200 text-[11px] font-bold uppercase tracking-wider">
              <LayoutTemplate className="w-3.5 h-3.5" />
              Portada, Promociones y Secciones • Sprint C6
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Supabase RLS + Storage `public-assets`
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Administración Integral de la Portada Dinámica
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            Gestiona dinámicamente secciones (`homepage_sections`), Hero Banner (`HERO_SLIDE`), tarjetas laterales (`PROMO_CARD`), banners secundarios (`SECONDARY_BANNER`), beneficios (`BENEFIT_ITEM`), Oferta del Día, vitrina por categorías, colecciones, recursos FREE, servicios personalizados y bloques informativos (`INFO_CARD`).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadAllHomepageAdminData}
            disabled={isLoading}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoading ? 'animate-spin text-[#0A68FF]' : ''
              }`}
            />
            <span>Sincronizar</span>
          </button>

          {activeTab === 'SECTIONS' && (
            <button
              type="button"
              onClick={() => {
                setEditingSection(null);
                setIsSectionModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sección</span>
            </button>
          )}

          {activeTab === 'HERO_SLIDES' && (
            <button
              type="button"
              onClick={() => {
                setEditingSlide(null);
                setSlidePreviewOnly(false);
                setIsSlideModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Slide Hero</span>
            </button>
          )}

          {activeTab === 'PROMO_CARDS' && (
            <button
              type="button"
              onClick={() => {
                setEditingPromoCard(null);
                setPromoCardPreviewOnly(false);
                setIsPromoCardModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Tarjeta Lateral</span>
            </button>
          )}

          {activeTab === 'SECONDARY_BANNERS' && (
            <button
              type="button"
              onClick={() => {
                setEditingBanner(null);
                setBannerPreviewOnly(false);
                setIsBannerModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Banner Secundario</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo /admin/home */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('SECTIONS')}
          className={`p-3 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
            activeTab === 'SECTIONS'
              ? 'bg-[#0A68FF] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-tight">
                A. Secciones de Portada
              </div>
              <div
                className={`text-[11px] ${
                  activeTab === 'SECTIONS' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                Estructura y orden general
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
              activeTab === 'SECTIONS'
                ? 'bg-white/20 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {sortedSections.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('HERO_SLIDES')}
          className={`p-3 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
            activeTab === 'HERO_SLIDES'
              ? 'bg-[#0A68FF] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutTemplate className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-tight">
                Hero Banner y Slides
              </div>
              <div
                className={`text-[11px] ${
                  activeTab === 'HERO_SLIDES'
                    ? 'text-blue-100'
                    : 'text-slate-500'
                }`}
              >
                Carrusel principal (`HERO_SLIDE`)
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
              activeTab === 'HERO_SLIDES'
                ? 'bg-white/20 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {sortedSlides.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PROMO_CARDS')}
          className={`p-3 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
            activeTab === 'PROMO_CARDS'
              ? 'bg-[#0A68FF] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-tight">
                B. Tarjetas Laterales Hero
              </div>
              <div
                className={`text-[11px] ${
                  activeTab === 'PROMO_CARDS'
                    ? 'text-blue-100'
                    : 'text-slate-500'
                }`}
              >
                Columna derecha (`PROMO_CARD`)
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
              activeTab === 'PROMO_CARDS'
                ? 'bg-white/20 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {sortedPromoCards.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SECONDARY_BANNERS')}
          className={`p-3 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
            activeTab === 'SECONDARY_BANNERS'
              ? 'bg-[#0A68FF] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-tight">
                C. Banners Secundarios
              </div>
              <div
                className={`text-[11px] ${
                  activeTab === 'SECONDARY_BANNERS'
                    ? 'text-blue-100'
                    : 'text-slate-500'
                }`}
              >
                Banners 50%/50% (`SECONDARY_BANNER`)
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
              activeTab === 'SECONDARY_BANNERS'
                ? 'bg-white/20 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {sortedBanners.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONTENT_C4')}
          className={`p-3 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
            activeTab === 'CONTENT_C4'
              ? 'bg-[#0A68FF] text-white shadow-xs'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-extrabold leading-tight">
                D. Vitrinas, Beneficios e Info
              </div>
              <div
                className={`text-[11px] ${
                  activeTab === 'CONTENT_C4'
                    ? 'text-blue-100'
                    : 'text-slate-500'
                }`}
              >
                Oferta, Colecciones, FREE y CTA
              </div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
              activeTab === 'CONTENT_C4'
                ? 'bg-white/20 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            C4
          </span>
        </button>
      </div>

      {/* Mensajes de confirmación o error */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-3 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block">
              Aviso de sincronización con Supabase:
            </strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      {activeTab !== 'CONTENT_C4' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'SECTIONS'
                  ? 'Buscar sección por nombre administrativo, código, tipo o título...'
                  : activeTab === 'HERO_SLIDES'
                    ? 'Buscar slide por nombre interno, título o badge...'
                    : activeTab === 'PROMO_CARDS'
                      ? 'Buscar tarjeta lateral por nombre, badge o título...'
                      : 'Buscar banner secundario por nombre, badge o título...'
              }
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0A68FF]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'HERO_SLIDES' && (
              <button
                type="button"
                onClick={() => setShowCarouselPreview((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#0A68FF]" />
                <span>
                  {showCarouselPreview
                    ? 'Ocultar Simulador'
                    : 'Simulador de Carrusel'}
                </span>
              </button>
            )}

            {/* Filtro por Publicación */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  { key: 'ALL', label: 'Todos' },
                  { key: 'PUBLISHED', label: 'Publicados' },
                  { key: 'DRAFT', label: 'Borradores' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPublishFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    publishFilter === opt.key
                      ? 'bg-white text-[#0A68FF] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Filtro por Activo / Inactivo */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  { key: 'ALL', label: 'Todos' },
                  { key: 'ACTIVE', label: 'Activos' },
                  { key: 'INACTIVE', label: 'Inactivos' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setActiveFilter(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeFilter === opt.key
                      ? 'bg-white text-[#0A68FF] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA A: SECCIONES DE PORTADA (public.homepage_sections)           */}
      {/* ==================================================================== */}
      {activeTab === 'SECTIONS' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-[#0A68FF] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600">
                Cargando estructura de secciones desde `public.homepage_sections`...
              </p>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <LayoutGrid className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                No se encontraron secciones con los filtros aplicados
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingSection(null);
                  setIsSectionModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nueva Sección</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="table-scroll-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 w-28">Orden</th>
                      <th className="py-3.5 px-4 w-56">
                        Código / Tipo de Sección
                      </th>
                      <th className="py-3.5 px-4">
                        Nombre Administrativo y Textos Públicos
                      </th>
                      <th className="py-3.5 px-4 w-56">CTA / Ítems</th>
                      <th className="py-3.5 px-4 w-44">
                        Publicación y Vigencia
                      </th>
                      <th className="py-3.5 px-4 w-32">Estado</th>
                      <th className="py-3.5 px-4 w-36 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {filteredSections.map((sec) => {
                      const indexInSorted = sortedSections.findIndex(
                        (s) => s.id === sec.id
                      );
                      const isFirst = indexInSorted <= 0;
                      const isLast =
                        indexInSorted >= sortedSections.length - 1;
                      const isBusy = busyId === sec.id;
                      const scheduleState = evaluateCampaignScheduleState(
                        sec.starts_at,
                        sec.ends_at
                      );

                      return (
                        <tr
                          key={sec.id}
                          className="hover:bg-slate-50/80 transition-colors align-top"
                        >
                          {/* Orden */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs">
                                #{sec.display_order}
                              </span>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  disabled={isFirst || isBusy}
                                  onClick={() =>
                                    handleMoveSectionOrder(indexInSorted, 'UP')
                                  }
                                  title="Subir sección"
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast || isBusy}
                                  onClick={() =>
                                    handleMoveSectionOrder(
                                      indexInSorted,
                                      'DOWN'
                                    )
                                  }
                                  title="Bajar sección"
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Código / Tipo */}
                          <td className="py-4 px-4 space-y-1.5">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] font-bold">
                              {sec.section_type}
                            </span>
                            {sec.code && (
                              <div className="text-[11px] font-mono text-slate-500">
                                code: <strong>{sec.code}</strong>
                              </div>
                            )}
                            {sec.is_protected_base && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0A68FF] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                <Shield className="w-3 h-3" />
                                Base Estructural
                              </span>
                            )}
                          </td>

                          {/* Nombre y Textos */}
                          <td className="py-4 px-4 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-slate-900">
                                {sec.admin_name}
                              </span>
                              {sec.badge_text && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                  {sec.badge_text}
                                </span>
                              )}
                            </div>
                            {sec.title ? (
                              <p className="text-xs sm:text-sm font-bold text-slate-800">
                                {sec.title}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                Sin título público configurado
                              </p>
                            )}
                            {sec.subtitle && (
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {sec.subtitle}
                              </p>
                            )}
                          </td>

                          {/* CTA e Ítems Hijos */}
                          <td className="py-4 px-4 space-y-1.5 text-xs">
                            {sec.cta_label ? (
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  {sec.cta_label}
                                </span>
                                <code className="text-[11px] text-[#0A68FF] font-mono break-all">
                                  {sec.cta_url}
                                </code>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic block">
                                Sin CTA principal
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
                              {sec.items_count}{' '}
                              {sec.items_count === 1 ? 'ítem hijo' : 'ítems hijos'}
                            </span>
                          </td>

                          {/* Publicación y Vigencia */}
                          <td className="py-4 px-4 space-y-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleSectionPublish(sec)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                sec.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {sec.status === 'PUBLISHED' ? (
                                <>
                                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>PUBLISHED</span>
                                </>
                              ) : (
                                <>
                                  <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                                  <span>DRAFT</span>
                                </>
                              )}
                            </button>

                            <div className="text-[11px] text-slate-500">
                              {scheduleState === 'ACTIVE_NOW' && (
                                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Vigente actual
                                </span>
                              )}
                              {scheduleState === 'SCHEDULED_FUTURE' && (
                                <span className="text-blue-700 font-semibold inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Programada
                                </span>
                              )}
                              {scheduleState === 'EXPIRED' && (
                                <span className="text-red-600 font-semibold inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Finalizada
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Activo / Inactivo */}
                          <td className="py-4 px-4">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleSectionActive(sec)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                sec.is_active
                                  ? 'bg-blue-50 text-[#0A68FF] border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {sec.is_active ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Activa</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Inactiva</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Acciones */}
                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSection(sec);
                                  setIsSectionModalOpen(true);
                                }}
                                title="Editar sección"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0A68FF] transition cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setSectionToDelete(sec)}
                                title={
                                  sec.is_protected_base
                                    ? 'Sección base protegida (ver aviso)'
                                    : 'Eliminar sección'
                                }
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA HERO_SLIDES: HERO BANNER Y SLIDES (C2)                       */}
      {/* ==================================================================== */}
      {activeTab === 'HERO_SLIDES' && (
        <div className="space-y-4">
          {showCarouselPreview && activePreviewSlide && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Simulador Administrativo del Carrusel Hero (Incluye Borradores)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Slide #{carouselPreviewIndex + 1} de {sortedSlides.length}:{' '}
                    <strong>{activePreviewSlide.admin_name}</strong> (
                    {activePreviewSlide.status})
                  </p>
                </div>

                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setCarouselViewport('DESKTOP')}
                    className={`px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                      carouselViewport === 'DESKTOP'
                        ? 'bg-[#0A68FF] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Escritorio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCarouselViewport('MOBILE')}
                    className={`px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                      carouselViewport === 'MOBILE'
                        ? 'bg-[#0A68FF] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Móvil</span>
                  </button>
                </div>
              </div>

              <div
                className={`mx-auto transition-all ${
                  carouselViewport === 'MOBILE' ? 'max-w-[380px]' : 'w-full'
                }`}
              >
                <div className="bg-[#0F172A] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-xs min-h-[290px]">
                  {(
                    carouselViewport === 'MOBILE'
                      ? activePreviewSlide.image_mobile_url ||
                        activePreviewSlide.image_desktop_url
                      : activePreviewSlide.image_desktop_url ||
                        activePreviewSlide.image_mobile_url
                  ) ? (
                    <>
                      <img
                        src={
                          (carouselViewport === 'MOBILE'
                            ? activePreviewSlide.image_mobile_url ||
                              activePreviewSlide.image_desktop_url
                            : activePreviewSlide.image_desktop_url ||
                              activePreviewSlide.image_mobile_url) || ''
                        }
                        alt={
                          activePreviewSlide.image_alt_text ||
                          activePreviewSlide.title
                        }
                        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/85 to-[#0F172A]/45"
                      />
                    </>
                  ) : null}

                  <div className="relative z-10 space-y-3 max-w-2xl">
                    {activePreviewSlide.badge_text && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/15 border border-blue-400/25 text-blue-300 text-[11px] font-bold uppercase tracking-widest">
                        <span>{activePreviewSlide.badge_text}</span>
                      </div>
                    )}
                    <h3 className="text-xl sm:text-3xl font-extrabold leading-tight text-white">
                      {activePreviewSlide.title}
                    </h3>
                    {activePreviewSlide.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                        {activePreviewSlide.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 pt-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {activePreviewSlide.cta_primary_label && (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0A68FF] text-white text-xs sm:text-sm font-bold">
                          <ShoppingCart className="w-4 h-4" />
                          <span>{activePreviewSlide.cta_primary_label}</span>
                        </span>
                      )}
                      {activePreviewSlide.cta_secondary_label && (
                        <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-white border border-white/25 text-xs sm:text-sm font-bold">
                          <span>{activePreviewSlide.cta_secondary_label}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setCarouselPreviewIndex((prev) =>
                            prev === 0 ? sortedSlides.length - 1 : prev - 1
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCarouselPreviewIndex((prev) =>
                            prev === sortedSlides.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {filteredSlides.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <LayoutTemplate className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                No se encontraron slides con los filtros actuales
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingSlide(null);
                  setSlidePreviewOnly(false);
                  setIsSlideModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Slide Hero</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="table-scroll-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 w-28">Orden</th>
                      <th className="py-3.5 px-4 w-44">Miniatura</th>
                      <th className="py-3.5 px-4">
                        Nombre Interno y Contenido
                      </th>
                      <th className="py-3.5 px-4 w-64">Botones / URLs</th>
                      <th className="py-3.5 px-4 w-44">
                        Publicación y Campaña
                      </th>
                      <th className="py-3.5 px-4 w-32">Estado</th>
                      <th className="py-3.5 px-4 w-44 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {filteredSlides.map((slide) => {
                      const indexInSorted = sortedSlides.findIndex(
                        (s) => s.id === slide.id
                      );
                      const isFirst = indexInSorted <= 0;
                      const isLast = indexInSorted >= sortedSlides.length - 1;
                      const isBusy = busyId === slide.id;
                      const scheduleState = evaluateCampaignScheduleState(
                        slide.starts_at,
                        slide.ends_at
                      );
                      const thumbUrl =
                        slide.image_desktop_url || slide.image_mobile_url;

                      return (
                        <tr
                          key={slide.id}
                          className="hover:bg-slate-50/80 transition-colors align-top"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs">
                                #{slide.display_order}
                              </span>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  disabled={isFirst || isBusy}
                                  onClick={() =>
                                    handleMoveSlideOrder(indexInSorted, 'UP')
                                  }
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast || isBusy}
                                  onClick={() =>
                                    handleMoveSlideOrder(indexInSorted, 'DOWN')
                                  }
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {thumbUrl ? (
                              <div className="w-36 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                                <img
                                  src={thumbUrl}
                                  alt={slide.image_alt_text || slide.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-36 h-20 rounded-xl border border-slate-800 bg-[#0F172A] text-white p-2.5 flex flex-col justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300 truncate">
                                  {slide.badge_text || 'HERO SLIDE'}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-200 line-clamp-2 leading-tight">
                                  {slide.title}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-900">
                                {slide.admin_name}
                              </span>
                              {slide.badge_text && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                  {slide.badge_text}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                              {slide.title}
                            </p>
                            {slide.subtitle && (
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {slide.subtitle}
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-1.5 text-xs">
                            {slide.cta_primary_label ? (
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  1° {slide.cta_primary_label}
                                </span>
                                <code className="text-[11px] text-[#0A68FF] font-mono break-all">
                                  {slide.cta_primary_url}
                                </code>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">
                                Sin botón principal
                              </span>
                            )}
                            {slide.cta_secondary_label && (
                              <div className="pt-1 border-t border-slate-100">
                                <span className="font-semibold text-slate-700 block">
                                  2° {slide.cta_secondary_label}
                                </span>
                                <code className="text-[11px] text-slate-500 font-mono break-all">
                                  {slide.cta_secondary_url}
                                </code>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleSlidePublish(slide)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                slide.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {slide.status === 'PUBLISHED' ? (
                                <>
                                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>PUBLISHED</span>
                                </>
                              ) : (
                                <>
                                  <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                                  <span>DRAFT</span>
                                </>
                              )}
                            </button>
                            <div className="text-[11px] text-slate-500">
                              {scheduleState === 'ACTIVE_NOW' && (
                                <span className="text-emerald-700 font-semibold">
                                  En vigencia
                                </span>
                              )}
                              {scheduleState === 'SCHEDULED_FUTURE' && (
                                <span className="text-blue-700 font-semibold">
                                  Programado
                                </span>
                              )}
                              {scheduleState === 'EXPIRED' && (
                                <span className="text-red-600 font-semibold">
                                  Finalizado
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleSlideActive(slide)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                slide.is_active
                                  ? 'bg-blue-50 text-[#0A68FF] border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {slide.is_active ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Activo</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Inactivo</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSlide(slide);
                                  setSlidePreviewOnly(true);
                                  setIsSlideModalOpen(true);
                                }}
                                title="Vista previa"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSlide(slide);
                                  setSlidePreviewOnly(false);
                                  setIsSlideModalOpen(true);
                                }}
                                title="Editar slide"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0A68FF] cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSlideToDelete(slide)}
                                title="Eliminar slide"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA B: TARJETAS PROMOCIONALES LATERALES DEL HERO (PROMO_CARD)    */}
      {/* ==================================================================== */}
      {activeTab === 'PROMO_CARDS' && (
        <div className="space-y-5">
          {/* Simulador de las Tarjetas Laterales del Hero */}
          {sortedPromoCards.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Vista Previa de la Columna Lateral Derecha del Hero (`hero_main`)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Así se visualizan las tarjetas laterales activas y en borrador según su orden actual (`display_order`).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedPromoCards.map((card) => (
                  <div
                    key={card.id}
                    className={`bg-white border rounded-2xl p-5 flex flex-col justify-between shadow-2xs relative overflow-hidden ${
                      card.badge_variant === 'PERSONALIZADO'
                        ? 'border-purple-200'
                        : 'border-slate-200'
                    } ${!card.is_active ? 'opacity-60' : ''}`}
                  >
                    {card.image_desktop_url && (
                      <div className="mb-3 h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                        <img
                          src={card.image_desktop_url}
                          alt={card.image_alt_text || card.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {card.badge_text && (
                          <span
                            className={`px-2.5 py-0.5 rounded-md border text-[11px] font-extrabold uppercase tracking-wider ${
                              card.badge_variant === 'PERSONALIZADO'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {card.badge_text}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          #{card.display_order} • {card.status}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                        {card.title}
                      </h3>
                      {card.subtitle && (
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {card.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="pt-4 flex items-center justify-between">
                      <span
                        className={`text-xs font-bold inline-flex items-center gap-1 ${
                          card.badge_variant === 'PERSONALIZADO'
                            ? 'text-purple-700'
                            : 'text-[#0A68FF]'
                        }`}
                      >
                        <span>{card.cta_primary_label || 'Ver más'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                      <code className="text-[10px] font-mono text-slate-400">
                        {card.cta_primary_url}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredPromoCards.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                No se encontraron tarjetas promocionales laterales
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingPromoCard(null);
                  setPromoCardPreviewOnly(false);
                  setIsPromoCardModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Tarjeta Lateral</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="table-scroll-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 w-28">Orden</th>
                      <th className="py-3.5 px-4 w-36">Imagen</th>
                      <th className="py-3.5 px-4">
                        Nombre Interno, Badge y Contenido
                      </th>
                      <th className="py-3.5 px-4 w-60">Botón CTA / Destino</th>
                      <th className="py-3.5 px-4 w-44">
                        Publicación y Vigencia
                      </th>
                      <th className="py-3.5 px-4 w-32">Estado</th>
                      <th className="py-3.5 px-4 w-44 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {filteredPromoCards.map((card) => {
                      const indexInSorted = sortedPromoCards.findIndex(
                        (c) => c.id === card.id
                      );
                      const isFirst = indexInSorted <= 0;
                      const isLast =
                        indexInSorted >= sortedPromoCards.length - 1;
                      const isBusy = busyId === card.id;
                      const scheduleState = evaluateCampaignScheduleState(
                        card.starts_at,
                        card.ends_at
                      );

                      return (
                        <tr
                          key={card.id}
                          className="hover:bg-slate-50/80 transition-colors align-top"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs">
                                #{card.display_order}
                              </span>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  disabled={isFirst || isBusy}
                                  onClick={() =>
                                    handleMovePromoCardOrder(
                                      indexInSorted,
                                      'UP'
                                    )
                                  }
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast || isBusy}
                                  onClick={() =>
                                    handleMovePromoCardOrder(
                                      indexInSorted,
                                      'DOWN'
                                    )
                                  }
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            {card.image_desktop_url ? (
                              <div className="w-28 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                                <img
                                  src={card.image_desktop_url}
                                  alt={card.image_alt_text || card.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-28 h-16 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-[10px]">
                                <ImageIcon className="w-4 h-4 mb-0.5" />
                                <span>Tarjeta Limpia</span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-slate-900">
                                {card.admin_name}
                              </span>
                              {card.badge_text && (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                                  {card.badge_text}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-800">
                              {card.title}
                            </p>
                            {card.subtitle && (
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {card.subtitle}
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-1 text-xs">
                            {card.cta_primary_label ? (
                              <>
                                <span className="font-bold text-slate-800 block">
                                  {card.cta_primary_label}
                                </span>
                                <code className="text-[11px] text-[#0A68FF] font-mono break-all">
                                  {card.cta_primary_url}
                                </code>
                              </>
                            ) : (
                              <span className="text-slate-400 italic">
                                Sin CTA
                              </span>
                            )}
                            {card.open_in_new_tab && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                                <ExternalLink className="w-3 h-3" />
                                Nueva pestaña
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleTogglePromoCardPublish(card)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                card.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {card.status === 'PUBLISHED' ? (
                                <>
                                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>PUBLISHED</span>
                                </>
                              ) : (
                                <>
                                  <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                                  <span>DRAFT</span>
                                </>
                              )}
                            </button>
                            <div className="text-[11px] text-slate-500">
                              {scheduleState === 'ACTIVE_NOW' && (
                                <span className="text-emerald-700 font-semibold">
                                  En vigencia
                                </span>
                              )}
                              {scheduleState === 'SCHEDULED_FUTURE' && (
                                <span className="text-blue-700 font-semibold">
                                  Programada
                                </span>
                              )}
                              {scheduleState === 'EXPIRED' && (
                                <span className="text-red-600 font-semibold">
                                  Finalizada
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleTogglePromoCardActive(card)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                card.is_active
                                  ? 'bg-blue-50 text-[#0A68FF] border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {card.is_active ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Activa</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Inactiva</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPromoCard(card);
                                  setPromoCardPreviewOnly(true);
                                  setIsPromoCardModalOpen(true);
                                }}
                                title="Vista previa"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPromoCard(card);
                                  setPromoCardPreviewOnly(false);
                                  setIsPromoCardModalOpen(true);
                                }}
                                title="Editar tarjeta"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0A68FF] cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPromoCardToDelete(card)}
                                title="Eliminar tarjeta"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA C: BANNERS PROMOCIONALES SECUNDARIOS (SECONDARY_BANNER)      */}
      {/* ==================================================================== */}
      {activeTab === 'SECONDARY_BANNERS' && (
        <div className="space-y-5">
          {/* Vista Previa Dual 50% / 50% de los Banners Secundarios */}
          {sortedBanners.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Vista Previa de Banners Intermedios Duales (50% / 50% — `PROMO_BANNERS`)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Previsualización de los banners secundarios según su orden (`display_order`) e imágenes configuradas ({bannerPreviewViewport}).
                  </p>
                </div>

                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setBannerPreviewViewport('DESKTOP')}
                    className={`px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                      bannerPreviewViewport === 'DESKTOP'
                        ? 'bg-[#0A68FF] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Escritorio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerPreviewViewport('MOBILE')}
                    className={`px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                      bannerPreviewViewport === 'MOBILE'
                        ? 'bg-[#0A68FF] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Móvil</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {sortedBanners.map((banner, idx) => {
                  const isBlueTheme =
                    banner.style_json?.theme === 'blue-indigo' ||
                    banner.badge_variant === 'discount' ||
                    idx % 2 === 1;
                  const previewImgUrl =
                    bannerPreviewViewport === 'MOBILE'
                      ? banner.image_mobile_url || banner.image_desktop_url
                      : banner.image_desktop_url || banner.image_mobile_url;

                  return (
                    <div
                      key={banner.id}
                      className={`rounded-2xl bg-gradient-to-r ${
                        isBlueTheme
                          ? 'from-[#0A68FF] to-indigo-700'
                          : 'from-slate-900 to-slate-800'
                      } text-white p-6 flex flex-col justify-between gap-4 shadow-xs relative overflow-hidden ${
                        !banner.is_active ? 'opacity-60' : ''
                      }`}
                    >
                      {previewImgUrl && (
                        <>
                          <img
                            src={previewImgUrl}
                            alt={banner.image_alt_text || banner.title}
                            className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35"
                          />
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/40"
                          />
                        </>
                      )}

                      <div className="space-y-2 relative z-10">
                        <div className="flex items-center justify-between gap-2">
                          {banner.badge_text && (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                                isBlueTheme
                                  ? 'bg-white/15 text-white border border-white/25'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              }`}
                            >
                              {banner.badge_text}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-white/70">
                            #{banner.display_order} • {banner.status}
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-extrabold leading-snug">
                          {banner.title}
                        </h3>
                        {banner.subtitle && (
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 relative z-10">
                        {banner.cta_primary_label && (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-extrabold">
                            <span>{banner.cta_primary_label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {banner.cta_secondary_label && (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 border border-white/30 text-white text-xs font-bold">
                            <span>{banner.cta_secondary_label}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredBanners.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                No se encontraron banners promocionales secundarios
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingBanner(null);
                  setBannerPreviewOnly(false);
                  setIsBannerModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Banner Secundario</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
              <div className="table-scroll-container">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4 w-28">Orden</th>
                      <th className="py-3.5 px-4 w-44">Imágenes</th>
                      <th className="py-3.5 px-4">
                        Nombre Interno, Badge y Contenido
                      </th>
                      <th className="py-3.5 px-4 w-64">Botones / URLs</th>
                      <th className="py-3.5 px-4 w-44">
                        Publicación y Vigencia
                      </th>
                      <th className="py-3.5 px-4 w-32">Estado</th>
                      <th className="py-3.5 px-4 w-44 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {filteredBanners.map((banner) => {
                      const indexInSorted = sortedBanners.findIndex(
                        (b) => b.id === banner.id
                      );
                      const isFirst = indexInSorted <= 0;
                      const isLast =
                        indexInSorted >= sortedBanners.length - 1;
                      const isBusy = busyId === banner.id;
                      const scheduleState = evaluateCampaignScheduleState(
                        banner.starts_at,
                        banner.ends_at
                      );
                      const thumbUrl =
                        banner.image_desktop_url || banner.image_mobile_url;

                      return (
                        <tr
                          key={banner.id}
                          className="hover:bg-slate-50/80 transition-colors align-top"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs">
                                #{banner.display_order}
                              </span>
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  disabled={isFirst || isBusy}
                                  onClick={() =>
                                    handleMoveBannerOrder(indexInSorted, 'UP')
                                  }
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast || isBusy}
                                  onClick={() =>
                                    handleMoveBannerOrder(indexInSorted, 'DOWN')
                                  }
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 space-y-1.5">
                            {thumbUrl ? (
                              <div className="w-36 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                                <img
                                  src={thumbUrl}
                                  alt={banner.image_alt_text || banner.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-36 h-20 rounded-xl border border-slate-800 bg-slate-900 text-white p-2.5 flex flex-col justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 truncate">
                                  {banner.badge_text || 'BANNER'}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-200 line-clamp-2 leading-tight">
                                  {banner.title}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                                  banner.image_desktop_url
                                    ? 'bg-blue-50 text-[#0A68FF] font-semibold'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                <Monitor className="w-3 h-3" />
                                {banner.image_desktop_url ? 'Desktop' : 'Gradiente'}
                              </span>
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                                  banner.image_mobile_url
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                <Smartphone className="w-3 h-3" />
                                {banner.image_mobile_url ? 'Mobile' : 'Auto'}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-4 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-slate-900">
                                {banner.admin_name}
                              </span>
                              {banner.badge_text && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                  {banner.badge_text}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-800">
                              {banner.title}
                            </p>
                            {banner.subtitle && (
                              <p className="text-xs text-slate-500 line-clamp-2">
                                {banner.subtitle}
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-1.5 text-xs">
                            {banner.cta_primary_label ? (
                              <div>
                                <span className="font-bold text-slate-800 block">
                                  1° {banner.cta_primary_label}
                                </span>
                                <code className="text-[11px] text-[#0A68FF] font-mono break-all">
                                  {banner.cta_primary_url}
                                </code>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">
                                Sin botón principal
                              </span>
                            )}
                            {banner.cta_secondary_label && (
                              <div className="pt-1 border-t border-slate-100">
                                <span className="font-semibold text-slate-700 block">
                                  2° {banner.cta_secondary_label}
                                </span>
                                <code className="text-[11px] text-slate-500 font-mono break-all">
                                  {banner.cta_secondary_url}
                                </code>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 space-y-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleBannerPublish(banner)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                banner.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {banner.status === 'PUBLISHED' ? (
                                <>
                                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>PUBLISHED</span>
                                </>
                              ) : (
                                <>
                                  <FileEdit className="w-3.5 h-3.5 text-amber-600" />
                                  <span>DRAFT</span>
                                </>
                              )}
                            </button>
                            <div className="text-[11px] text-slate-500">
                              {scheduleState === 'ACTIVE_NOW' && (
                                <span className="text-emerald-700 font-semibold">
                                  En vigencia
                                </span>
                              )}
                              {scheduleState === 'SCHEDULED_FUTURE' && (
                                <span className="text-blue-700 font-semibold">
                                  Programado
                                </span>
                              )}
                              {scheduleState === 'EXPIRED' && (
                                <span className="text-red-600 font-semibold">
                                  Finalizado
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleToggleBannerActive(banner)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                                banner.is_active
                                  ? 'bg-blue-50 text-[#0A68FF] border-blue-200 hover:bg-blue-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {banner.is_active ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Activo</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Inactivo</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBanner(banner);
                                  setBannerPreviewOnly(true);
                                  setIsBannerModalOpen(true);
                                }}
                                title="Vista previa"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBanner(banner);
                                  setBannerPreviewOnly(false);
                                  setIsBannerModalOpen(true);
                                }}
                                title="Editar banner"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0A68FF] cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setBannerToDelete(banner)}
                                title="Eliminar banner"
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA D: BENEFICIOS, VITRINA, COLECCIONES, ZONA FREE E INFO (C4)   */}
      {/* ==================================================================== */}
      {activeTab === 'CONTENT_C4' && (
        <ContentSectionsWorkspace
          sections={sortedSections}
          onSectionUpdated={(updatedSec, isNew) =>
            handleSectionSaved(updatedSec, Boolean(isNew))
          }
          onFeedback={showFeedback}
        />
      )}

      {/* ==================================================================== */}
      {/* MODALES DE FORMULARIO Y VISTA PREVIA                                 */}
      {/* ==================================================================== */}

      <HomepageSectionFormModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        editingSection={editingSection}
        suggestedDisplayOrder={nextSectionOrder}
        onSaved={handleSectionSaved}
      />

      <HeroSlideFormModal
        isOpen={isSlideModalOpen}
        onClose={() => setIsSlideModalOpen(false)}
        editingSlide={editingSlide}
        nextSuggestedOrder={nextSlideOrder}
        initialPreviewOnly={slidePreviewOnly}
        onSaved={handleSlideSaved}
      />

      <PromoCardFormModal
        isOpen={isPromoCardModalOpen}
        onClose={() => setIsPromoCardModalOpen(false)}
        editingCard={editingPromoCard}
        suggestedDisplayOrder={nextPromoCardOrder}
        previewOnly={promoCardPreviewOnly}
        onSaved={handlePromoCardSaved}
      />

      <SecondaryBannerFormModal
        isOpen={isBannerModalOpen}
        onClose={() => setIsBannerModalOpen(false)}
        editingBanner={editingBanner}
        suggestedDisplayOrder={nextBannerOrder}
        previewOnly={bannerPreviewOnly}
        onSaved={handleBannerSaved}
      />

      {/* Modal de Confirmación para Eliminar Sección */}
      {sectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  {sectionToDelete.is_protected_base
                    ? 'Sección Estructural Base Protegida'
                    : '¿Eliminar esta sección de la portada?'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sección: <strong>{sectionToDelete.admin_name}</strong> (
                  <code>{sectionToDelete.section_type}</code>)
                </p>
              </div>
            </div>

            {sectionToDelete.is_protected_base ? (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-700 leading-relaxed">
                Esta sección (<code>{sectionToDelete.code}</code>) forma parte de las 7 secciones estructurales base de la página de inicio y no debe eliminarse físicamente. Si deseas ocultarla temporalmente de la tienda, usa el botón <strong>Activa / Inactiva</strong> o cámbiala a <strong>DRAFT</strong>.
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Advertencia de integridad (`ON DELETE CASCADE`):</strong> Al eliminar esta sección se eliminarán automáticamente sus{' '}
                <strong>{sectionToDelete.items_count} ítems asociados</strong> en `public.homepage_section_items` y sus imágenes vinculadas en `public-assets`.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSectionToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
              {!sectionToDelete.is_protected_base && (
                <button
                  type="button"
                  disabled={busyId === sectionToDelete.id}
                  onClick={handleConfirmDeleteSection}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  {busyId === sectionToDelete.id
                    ? 'Eliminando...'
                    : 'Confirmar Eliminación'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Slide del Hero */}
      {slideToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              ¿Eliminar slide del Hero Banner?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se eliminará permanentemente <strong>{slideToDelete.admin_name}</strong> de `public.homepage_section_items` y sus imágenes asociadas en `public-assets/home/slides/`.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSlideToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === slideToDelete.id}
                onClick={handleConfirmDeleteSlide}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {busyId === slideToDelete.id
                  ? 'Eliminando...'
                  : 'Eliminar Slide'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Tarjeta Lateral */}
      {promoCardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              ¿Eliminar tarjeta promocional lateral?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se eliminará permanentemente <strong>{promoCardToDelete.admin_name}</strong> de `public.homepage_section_items` y su imagen opcional en `public-assets/home/promos/` si existiera.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPromoCardToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === promoCardToDelete.id}
                onClick={handleConfirmDeletePromoCard}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {busyId === promoCardToDelete.id
                  ? 'Eliminando...'
                  : 'Eliminar Tarjeta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Banner Secundario */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              ¿Eliminar banner promocional secundario?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Se eliminará permanentemente <strong>{bannerToDelete.admin_name}</strong> de `public.homepage_section_items` y sus imágenes Desktop/Mobile en `public-assets/home/banners/`.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBannerToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === bannerToDelete.id}
                onClick={handleConfirmDeleteBanner}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {busyId === bannerToDelete.id
                  ? 'Eliminando...'
                  : 'Eliminar Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
