import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  Globe,
  FileEdit,
  Flame,
  ShieldCheck,
  Layers,
  Gift,
  Wrench,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Package,
  FolderKanban,
  RefreshCw,
} from 'lucide-react';
import {
  AutomaticProductCriterion,
  CategoryShowcaseCollectionKey,
  CategoryShowcaseTabConfig,
  CollectionSelectionMode,
  DealFallbackBehavior,
  HomepageBadgeVariant,
  HomepagePublishStatus,
  HomepageSection,
  HomepageSectionItem,
  HomepageSectionTargetExpanded,
  HomepageSectionWithStats,
  HomepageTargetCategorySummary,
  HomepageTargetProductSummary,
} from '../../../types/homepage.types';
import {
  DEFAULT_CATEGORY_SHOWCASE_TABS,
  getAdminBenefitItems,
  toggleAdminBenefitItemActive,
  updateAdminBenefitItemPublishStatus,
  reorderAdminBenefitItems,
  deleteAdminBenefitItem,
  getAdminInfoCards,
  toggleAdminInfoCardActive,
  updateAdminInfoCardPublishStatus,
  reorderAdminInfoCards,
  deleteAdminInfoCard,
  getAdminEligibleCatalogData,
  getAdminSectionTargets,
  addAdminSectionTarget,
  toggleAdminSectionTargetActive,
  reorderAdminSectionTargets,
  removeAdminSectionTarget,
  saveAdminDealOfTheDayConfig,
  saveAdminCategoryTabsConfig,
  saveAdminCollectionSectionConfig,
  saveAdminFreeResourcesConfig,
  saveAdminCustomServicesCtaConfig,
  createAdminHomepageSection,
} from '../../../services/homepage.service';
import { CategoryVisual } from '../../../components/common/CategoryVisual/CategoryVisual';
import { HomepageIconBadge } from './HomepageIconBadge';
import { BenefitItemFormModal } from './BenefitItemFormModal';
import { InfoCardFormModal } from './InfoCardFormModal';

export type ContentSubSectionTab =
  | 'BENEFITS'
  | 'DEAL_OF_THE_DAY'
  | 'CATEGORY_SHOWCASE'
  | 'COLLECTIONS'
  | 'FREE_RESOURCES'
  | 'CUSTOM_AND_INFO';

interface ContentSectionsWorkspaceProps {
  sections: HomepageSectionWithStats[];
  onSectionUpdated: (updatedSection: HomepageSection, isNew?: boolean) => void;
  onFeedback: (type: 'success' | 'error', message: string) => void;
}

function isoToLocalDatetimeInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export const ContentSectionsWorkspace: React.FC<
  ContentSectionsWorkspaceProps
> = ({ sections, onSectionUpdated, onFeedback }) => {
  const [subTab, setSubTab] = useState<ContentSubSectionTab>('BENEFITS');
  const [isLoadingC4, setIsLoadingC4] = useState<boolean>(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Datos C4 cargados
  const [benefits, setBenefits] = useState<HomepageSectionItem[]>([]);
  const [infoCards, setInfoCards] = useState<HomepageSectionItem[]>([]);
  const [infoSections, setInfoSections] = useState<HomepageSection[]>([]);
  const [targets, setTargets] = useState<HomepageSectionTargetExpanded[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<
    HomepageTargetProductSummary[]
  >([]);
  const [catalogCategories, setCatalogCategories] = useState<
    HomepageTargetCategorySummary[]
  >([]);

  // Modales de Beneficios (`BENEFIT_ITEM`)
  const [isBenefitModalOpen, setIsBenefitModalOpen] = useState<boolean>(false);
  const [editingBenefit, setEditingBenefit] =
    useState<HomepageSectionItem | null>(null);
  const [benefitPreviewOnly, setBenefitPreviewOnly] = useState<boolean>(false);
  const [benefitToDelete, setBenefitToDelete] =
    useState<HomepageSectionItem | null>(null);

  // Modales de Bloques Informativos (`INFO_CARD`)
  const [isInfoCardModalOpen, setIsInfoCardModalOpen] =
    useState<boolean>(false);
  const [editingInfoCard, setEditingInfoCard] =
    useState<HomepageSectionItem | null>(null);
  const [infoCardPreviewOnly, setInfoCardPreviewOnly] =
    useState<boolean>(false);
  const [infoCardToDelete, setInfoCardToDelete] =
    useState<HomepageSectionItem | null>(null);

  // Resolutores de secciones base
  const valuePropsSection = useMemo(
    () =>
      sections.find(
        (s) =>
          s.code === 'value_props' || s.section_type === 'VALUE_PROPOSITION'
      ) || null,
    [sections]
  );

  const dealSection = useMemo(
    () =>
      sections.find(
        (s) =>
          s.code === 'deal_of_the_day' || s.section_type === 'DEAL_OF_THE_DAY'
      ) || null,
    [sections]
  );

  const categoryTabsSection = useMemo(
    () =>
      sections.find(
        (s) =>
          s.code === 'category_tabs' ||
          s.section_type === 'CATEGORY_TABS_SHOWCASE'
      ) || null,
    [sections]
  );

  const freeZoneSection = useMemo(
    () =>
      sections.find(
        (s) => s.code === 'free_zone' || s.section_type === 'FREE_RESOURCES'
      ) || null,
    [sections]
  );

  const customCtaSection = useMemo(
    () =>
      sections.find(
        (s) =>
          s.code === 'custom_cta' || s.section_type === 'CUSTOM_SERVICES_CTA'
      ) || null,
    [sections]
  );

  const collectionSections = useMemo(
    () =>
      sections.filter(
        (s) =>
          s.section_type === 'FEATURED_CATEGORIES' ||
          s.section_type === 'PRODUCT_COLLECTION'
      ),
    [sections]
  );

  // ==========================================================================
  // ESTADOS DE FORMULARIO: 3. OFERTA DESTACADA DEL DÍA (DEAL_OF_THE_DAY)
  // ==========================================================================
  const [dealTitle, setDealTitle] = useState<string>('');
  const [dealSubtitle, setDealSubtitle] = useState<string>('');
  const [dealBadgeText, setDealBadgeText] = useState<string>('');
  const [dealBadgeVariant, setDealBadgeVariant] =
    useState<HomepageBadgeVariant>('discount');
  const [dealStatus, setDealStatus] =
    useState<HomepagePublishStatus>('PUBLISHED');
  const [dealIsActive, setDealIsActive] = useState<boolean>(true);
  const [dealStartsAt, setDealStartsAt] = useState<string>('');
  const [dealEndsAt, setDealEndsAt] = useState<string>('');
  const [dealProductId, setDealProductId] = useState<string>('');
  const [dealFallback, setDealFallback] = useState<DealFallbackBehavior>(
    'AUTO_FIRST_PROMOTION'
  );
  const [dealCountdownLabel, setDealCountdownLabel] =
    useState<string>('TERMINA EN:');
  const [dealPriceCaption, setDealPriceCaption] = useState<string>(
    'Precio 100% en Soles (PEN). Entrega individual por WhatsApp.'
  );
  const [dealCtaLabel, setDealCtaLabel] = useState<string>(
    'Comprar con Descuento S/'
  );
  const [dealSecondaryLabel, setDealSecondaryLabel] = useState<string>(
    'Ver Ficha Técnica y Versiones'
  );
  const [dealCustomExpiresAt, setDealCustomExpiresAt] = useState<string>('');
  const [dealPromoNote, setDealPromoNote] = useState<string>('');

  // ==========================================================================
  // ESTADOS DE FORMULARIO: 4. VITRINA POR CATEGORÍAS (CATEGORY_TABS_SHOWCASE)
  // ==========================================================================
  const [catTabsTitle, setCatTabsTitle] = useState<string>('');
  const [catTabsSubtitle, setCatTabsSubtitle] = useState<string>('');
  const [catTabsCtaLabel, setCatTabsCtaLabel] = useState<string>('');
  const [catTabsCtaUrl, setCatTabsCtaUrl] = useState<string>('/catalogo');
  const [catTabsStatus, setCatTabsStatus] =
    useState<HomepagePublishStatus>('PUBLISHED');
  const [catTabsIsActive, setCatTabsIsActive] = useState<boolean>(true);
  const [catTabsStartsAt, setCatTabsStartsAt] = useState<string>('');
  const [catTabsEndsAt, setCatTabsEndsAt] = useState<string>('');
  const [catTabsMaxProducts, setCatTabsMaxProducts] = useState<number>(8);
  const [catTabsDefaultTab, setCatTabsDefaultTab] = useState<
    'ALL' | CategoryShowcaseCollectionKey
  >('ALL');
  const [catTabsShowCategories, setCatTabsShowCategories] =
    useState<boolean>(true);
  const [catTabsCategoryMode, setCatTabsCategoryMode] = useState<
    'ALL_ACTIVE' | 'MANUAL_TARGETS'
  >('ALL_ACTIVE');
  const [catTabsList, setCatTabsList] = useState<CategoryShowcaseTabConfig[]>(
    () => [...DEFAULT_CATEGORY_SHOWCASE_TABS]
  );
  const [activeShowcaseCollectionKey, setActiveShowcaseCollectionKey] =
    useState<CategoryShowcaseCollectionKey>('mas_vendidos');
  const [selectedShowcaseProductToAdd, setSelectedShowcaseProductToAdd] =
    useState<string>('');
  const [selectedShowcaseCategoryToAdd, setSelectedShowcaseCategoryToAdd] =
    useState<string>('');

  // ==========================================================================
  // ESTADOS DE FORMULARIO: 5. COLECCIONES (FEATURED_CATEGORIES / PRODUCT_COLLECTION)
  // ==========================================================================
  const [selectedCollectionSectionId, setSelectedCollectionSectionId] =
    useState<string>('');
  const [colTitle, setColTitle] = useState<string>('');
  const [colSubtitle, setColSubtitle] = useState<string>('');
  const [colBadgeText, setColBadgeText] = useState<string>('');
  const [colBadgeVariant, setColBadgeVariant] =
    useState<HomepageBadgeVariant>('PRO');
  const [colCtaLabel, setColCtaLabel] = useState<string>('');
  const [colCtaUrl, setColCtaUrl] = useState<string>('/catalogo');
  const [colStatus, setColStatus] =
    useState<HomepagePublishStatus>('PUBLISHED');
  const [colIsActive, setColIsActive] = useState<boolean>(true);
  const [colStartsAt, setColStartsAt] = useState<string>('');
  const [colEndsAt, setColEndsAt] = useState<string>('');
  const [colMaxItems, setColMaxItems] = useState<number>(6);
  const [colSelectionMode, setColSelectionMode] =
    useState<CollectionSelectionMode>('AUTO_FLAGS');
  const [colAutoCriterion, setColAutoCriterion] =
    useState<AutomaticProductCriterion>('is_featured');
  const [colTargetProductToAdd, setColTargetProductToAdd] =
    useState<string>('');
  const [colTargetCategoryToAdd, setColTargetCategoryToAdd] =
    useState<string>('');
  const [targetToDelete, setTargetToDelete] =
    useState<HomepageSectionTargetExpanded | null>(null);

  // ==========================================================================
  // ESTADOS DE FORMULARIO: 6. RECURSOS GRATUITOS (FREE_RESOURCES)
  // ==========================================================================
  const [freeTitle, setFreeTitle] = useState<string>('');
  const [freeSubtitle, setFreeSubtitle] = useState<string>('');
  const [freeBadgeText, setFreeBadgeText] = useState<string>('GRATIS');
  const [freeBadgeVariant, setFreeBadgeVariant] =
    useState<HomepageBadgeVariant>('FREE');
  const [freeCtaLabel, setFreeCtaLabel] = useState<string>(
    'Ver todos los recursos FREE →'
  );
  const [freeCtaUrl, setFreeCtaUrl] = useState<string>(
    '/catalogo?modalidad=FREE'
  );
  const [freeStatus, setFreeStatus] =
    useState<HomepagePublishStatus>('PUBLISHED');
  const [freeIsActive, setFreeIsActive] = useState<boolean>(true);
  const [freeStartsAt, setFreeStartsAt] = useState<string>('');
  const [freeEndsAt, setFreeEndsAt] = useState<string>('');
  const [freeMaxItems, setFreeMaxItems] = useState<number>(4);
  const [freeSelectionMode, setFreeSelectionMode] = useState<
    'AUTO_ALL_FREE' | 'MANUAL_TARGETS'
  >('AUTO_ALL_FREE');
  const [freeHighlightNote, setFreeHighlightNote] = useState<string>('');
  const [selectedFreeProductToAdd, setSelectedFreeProductToAdd] =
    useState<string>('');

  // ==========================================================================
  // ESTADOS DE FORMULARIO: 7. SERVICIOS PERSONALIZADOS (CUSTOM_SERVICES_CTA)
  // ==========================================================================
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customSubtitle, setCustomSubtitle] = useState<string>('');
  const [customBadgeText, setCustomBadgeText] = useState<string>(
    'MODALIDAD PERSONALIZADO'
  );
  const [customBadgeVariant, setCustomBadgeVariant] =
    useState<HomepageBadgeVariant>('PERSONALIZADO');
  const [customSecondaryBadge, setCustomSecondaryBadge] = useState<string>(
    'COTIZACIÓN POR WHATSAPP'
  );
  const [customCtaLabel, setCustomCtaLabel] = useState<string>(
    'Solicitar Producto a Medida'
  );
  const [customCtaUrl, setCustomCtaUrl] = useState<string>(
    '/solicitud-personalizada'
  );
  const [customSecCtaLabel, setCustomSecCtaLabel] = useState<string>('');
  const [customSecCtaUrl, setCustomSecCtaUrl] = useState<string>('');
  const [customSlaText, setCustomSlaText] = useState<string>('');
  const [customStatus, setCustomStatus] =
    useState<HomepagePublishStatus>('PUBLISHED');
  const [customIsActive, setCustomIsActive] = useState<boolean>(true);
  const [customStartsAt, setCustomStartsAt] = useState<string>('');
  const [customEndsAt, setCustomEndsAt] = useState<string>('');

  const loadC4WorkspaceData = useCallback(async () => {
    setIsLoadingC4(true);
    try {
      const [benefitsRes, infoRes, catalogRes, targetsRes] = await Promise.all([
        getAdminBenefitItems(),
        getAdminInfoCards(),
        getAdminEligibleCatalogData(),
        getAdminSectionTargets(),
      ]);

      setBenefits(benefitsRes.benefits);
      setInfoCards(infoRes.infoCards);
      setInfoSections(infoRes.sections);
      setCatalogProducts(catalogRes.products);
      setCatalogCategories(catalogRes.categories);
      setTargets(targetsRes.targets);
    } finally {
      setIsLoadingC4(false);
    }
  }, []);

  useEffect(() => {
    loadC4WorkspaceData();
  }, [loadC4WorkspaceData]);

  // Sincronizar formulario de Oferta del Día cuando carga dealSection
  useEffect(() => {
    if (!dealSection) return;
    const cfg = dealSection.config_json || {};
    setDealTitle(dealSection.title || 'Oferta Destacada del Día');
    setDealSubtitle(
      dealSection.subtitle || 'Promoción especial por tiempo limitado.'
    );
    setDealBadgeText(dealSection.badge_text || 'OFERTA DEL DÍA');
    setDealBadgeVariant(dealSection.badge_variant || 'discount');
    setDealStatus(dealSection.status || 'PUBLISHED');
    setDealIsActive(dealSection.is_active !== false);
    setDealStartsAt(isoToLocalDatetimeInput(dealSection.starts_at));
    setDealEndsAt(isoToLocalDatetimeInput(dealSection.ends_at));

    const targetDealProd = targets.find(
      (t) =>
        t.section_id === dealSection.id &&
        t.collection_key === 'deal_of_the_day' &&
        t.product_id
    );
    const defaultDealProd =
      catalogProducts.find((p) => p.is_deal_of_the_day) ||
      catalogProducts.find((p) => p.is_on_promotion) ||
      null;

    setDealProductId(
      String(
        cfg.featured_product_id ||
          targetDealProd?.product_id ||
          defaultDealProd?.id ||
          ''
      )
    );
    setDealFallback(
      (cfg.fallback_behavior as DealFallbackBehavior) || 'AUTO_FIRST_PROMOTION'
    );
    setDealCountdownLabel(String(cfg.countdown_label || 'TERMINA EN:'));
    setDealPriceCaption(
      String(
        cfg.price_caption ||
          'Precio 100% en Soles (PEN). Entrega individual por WhatsApp.'
      )
    );
    setDealCtaLabel(
      String(
        cfg.cta_button_label ||
          dealSection.cta_label ||
          'Comprar con Descuento S/'
      )
    );
    setDealSecondaryLabel(
      String(cfg.secondary_button_label || 'Ver Ficha Técnica y Versiones')
    );
    setDealCustomExpiresAt(
      isoToLocalDatetimeInput(
        typeof cfg.custom_expires_at === 'string' ? cfg.custom_expires_at : null
      )
    );
    setDealPromoNote(
      typeof cfg.promo_highlight_note === 'string'
        ? cfg.promo_highlight_note
        : ''
    );
  }, [dealSection, targets, catalogProducts]);

  // Sincronizar formulario de Vitrina por Categorías
  useEffect(() => {
    if (!categoryTabsSection) return;
    const cfg = categoryTabsSection.config_json || {};
    setCatTabsTitle(
      categoryTabsSection.title ||
        'Soluciones Digitales por Categoría y Colección'
    );
    setCatTabsSubtitle(
      categoryTabsSection.subtitle ||
        'Explora productos FREE, PRO y PERSONALIZADO.'
    );
    setCatTabsCtaLabel(
      categoryTabsSection.cta_label || 'Ver catálogo completo'
    );
    setCatTabsCtaUrl(categoryTabsSection.cta_url || '/catalogo');
    setCatTabsStatus(categoryTabsSection.status || 'PUBLISHED');
    setCatTabsIsActive(categoryTabsSection.is_active !== false);
    setCatTabsStartsAt(isoToLocalDatetimeInput(categoryTabsSection.starts_at));
    setCatTabsEndsAt(isoToLocalDatetimeInput(categoryTabsSection.ends_at));
    setCatTabsMaxProducts(
      Number(cfg.max_products_per_tab ?? cfg.max_items_per_tab ?? 8) || 8
    );
    setCatTabsDefaultTab(
      (cfg.default_tab as 'ALL' | CategoryShowcaseCollectionKey) || 'ALL'
    );
    setCatTabsShowCategories(cfg.show_active_categories !== false);
    setCatTabsCategoryMode(
      cfg.category_selection_mode === 'MANUAL_TARGETS'
        ? 'MANUAL_TARGETS'
        : 'ALL_ACTIVE'
    );
    if (Array.isArray(cfg.collection_tabs) && cfg.collection_tabs.length > 0) {
      setCatTabsList(cfg.collection_tabs as CategoryShowcaseTabConfig[]);
    } else {
      setCatTabsList([...DEFAULT_CATEGORY_SHOWCASE_TABS]);
    }
  }, [categoryTabsSection]);

  // Seleccionar primera colección cuando existan secciones de colección
  useEffect(() => {
    if (
      collectionSections.length > 0 &&
      (!selectedCollectionSectionId ||
        !collectionSections.some((s) => s.id === selectedCollectionSectionId))
    ) {
      setSelectedCollectionSectionId(collectionSections[0].id);
    }
  }, [collectionSections, selectedCollectionSectionId]);

  const activeCollectionSection = useMemo(
    () =>
      collectionSections.find((s) => s.id === selectedCollectionSectionId) ||
      null,
    [collectionSections, selectedCollectionSectionId]
  );

  useEffect(() => {
    if (!activeCollectionSection) return;
    const cfg = activeCollectionSection.config_json || {};
    setColTitle(
      activeCollectionSection.title || activeCollectionSection.admin_name
    );
    setColSubtitle(activeCollectionSection.subtitle || '');
    setColBadgeText(activeCollectionSection.badge_text || '');
    setColBadgeVariant(activeCollectionSection.badge_variant || 'PRO');
    setColCtaLabel(activeCollectionSection.cta_label || '');
    setColCtaUrl(activeCollectionSection.cta_url || '/catalogo');
    setColStatus(activeCollectionSection.status || 'PUBLISHED');
    setColIsActive(activeCollectionSection.is_active !== false);
    setColStartsAt(isoToLocalDatetimeInput(activeCollectionSection.starts_at));
    setColEndsAt(isoToLocalDatetimeInput(activeCollectionSection.ends_at));
    setColMaxItems(Number(cfg.max_items ?? 6) || 6);
    setColSelectionMode(
      cfg.selection_mode === 'MANUAL_TARGETS' ? 'MANUAL_TARGETS' : 'AUTO_FLAGS'
    );
    setColAutoCriterion(
      (cfg.auto_criterion as AutomaticProductCriterion) || 'is_featured'
    );
  }, [activeCollectionSection]);

  // Sincronizar Recursos Gratuitos (FREE_RESOURCES)
  useEffect(() => {
    if (!freeZoneSection) return;
    const cfg = freeZoneSection.config_json || {};
    setFreeTitle(freeZoneSection.title || 'Zona de Recursos Gratuitos');
    setFreeSubtitle(
      freeZoneSection.subtitle ||
        'Herramientas y kits gratuitos verificados para la comunidad de SmartLab Store.'
    );
    setFreeBadgeText(freeZoneSection.badge_text || 'GRATIS');
    setFreeBadgeVariant(freeZoneSection.badge_variant || 'FREE');
    setFreeCtaLabel(
      freeZoneSection.cta_label || 'Ver todos los recursos FREE →'
    );
    setFreeCtaUrl(freeZoneSection.cta_url || '/catalogo?modalidad=FREE');
    setFreeStatus(freeZoneSection.status || 'PUBLISHED');
    setFreeIsActive(freeZoneSection.is_active !== false);
    setFreeStartsAt(isoToLocalDatetimeInput(freeZoneSection.starts_at));
    setFreeEndsAt(isoToLocalDatetimeInput(freeZoneSection.ends_at));
    setFreeMaxItems(Number(cfg.max_items ?? 4) || 4);
    setFreeSelectionMode(
      cfg.selection_mode === 'MANUAL_TARGETS'
        ? 'MANUAL_TARGETS'
        : 'AUTO_ALL_FREE'
    );
    setFreeHighlightNote(
      typeof cfg.highlight_note === 'string' ? cfg.highlight_note : ''
    );
  }, [freeZoneSection]);

  // Sincronizar Servicios Personalizados (CUSTOM_SERVICES_CTA)
  useEffect(() => {
    if (!customCtaSection) return;
    const cfg = customCtaSection.config_json || {};
    setCustomTitle(
      customCtaSection.title ||
        '¿Buscas un desarrollo a medida o adaptar un producto del catálogo?'
    );
    setCustomSubtitle(
      customCtaSection.subtitle ||
        'Cuéntanos tu requerimiento técnico de Excel, Google Sheets, Sistemas Web, Aplicaciones Android o Automatizaciones y te contactaremos por WhatsApp con una propuesta formal.'
    );
    setCustomBadgeText(
      customCtaSection.badge_text || 'MODALIDAD PERSONALIZADO'
    );
    setCustomBadgeVariant(customCtaSection.badge_variant || 'PERSONALIZADO');
    setCustomSecondaryBadge(
      typeof cfg.secondary_badge_text === 'string'
        ? cfg.secondary_badge_text
        : 'COTIZACIÓN POR WHATSAPP'
    );
    setCustomCtaLabel(
      customCtaSection.cta_label || 'Solicitar Producto a Medida'
    );
    setCustomCtaUrl(customCtaSection.cta_url || '/solicitud-personalizada');
    setCustomSecCtaLabel(
      typeof cfg.secondary_cta_label === 'string' ? cfg.secondary_cta_label : ''
    );
    setCustomSecCtaUrl(
      typeof cfg.secondary_cta_url === 'string' ? cfg.secondary_cta_url : ''
    );
    setCustomSlaText(
      typeof cfg.response_SLA_text === 'string' ? cfg.response_SLA_text : ''
    );
    setCustomStatus(customCtaSection.status || 'PUBLISHED');
    setCustomIsActive(customCtaSection.is_active !== false);
    setCustomStartsAt(isoToLocalDatetimeInput(customCtaSection.starts_at));
    setCustomEndsAt(isoToLocalDatetimeInput(customCtaSection.ends_at));
  }, [customCtaSection]);

  // Listas ordenadas
  const sortedBenefits = useMemo(
    () =>
      [...benefits].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      ),
    [benefits]
  );

  const sortedInfoCards = useMemo(
    () =>
      [...infoCards].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      ),
    [infoCards]
  );

  const freeOnlyCatalogProducts = useMemo(
    () => catalogProducts.filter((p) => p.modalidad === 'FREE'),
    [catalogProducts]
  );

  const selectedDealProduct = useMemo(
    () => catalogProducts.find((p) => p.id === dealProductId) || null,
    [catalogProducts, dealProductId]
  );

  // Objetivos filtrados por sección / colección
  const showcaseProductTargets = useMemo(() => {
    if (!categoryTabsSection) return [];
    return targets
      .filter(
        (t) =>
          t.section_id === categoryTabsSection.id &&
          t.target_type === 'PRODUCT' &&
          t.collection_key === activeShowcaseCollectionKey
      )
      .sort((a, b) => a.display_order - b.display_order);
  }, [targets, categoryTabsSection, activeShowcaseCollectionKey]);

  const showcaseCategoryTargets = useMemo(() => {
    if (!categoryTabsSection) return [];
    return targets
      .filter(
        (t) =>
          t.section_id === categoryTabsSection.id &&
          t.target_type === 'CATEGORY' &&
          t.collection_key === 'showcase_categories'
      )
      .sort((a, b) => a.display_order - b.display_order);
  }, [targets, categoryTabsSection]);

  const activeCollectionTargets = useMemo(() => {
    if (!activeCollectionSection) return [];
    return targets
      .filter((t) => t.section_id === activeCollectionSection.id)
      .sort((a, b) => a.display_order - b.display_order);
  }, [targets, activeCollectionSection]);

  const freeZoneTargets = useMemo(() => {
    if (!freeZoneSection) return [];
    return targets
      .filter(
        (t) =>
          t.section_id === freeZoneSection.id &&
          t.target_type === 'PRODUCT' &&
          t.collection_key === 'free_resources'
      )
      .sort((a, b) => a.display_order - b.display_order);
  }, [targets, freeZoneSection]);

  // ==========================================================================
  // HANDLERS DE BENEFICIOS (`BENEFIT_ITEM`)
  // ==========================================================================
  const handleBenefitSaved = (
    savedBenefit: HomepageSectionItem,
    isNew: boolean
  ) => {
    setBenefits((prev) => {
      const exists = prev.some((b) => b.id === savedBenefit.id);
      const next = exists
        ? prev.map((b) => (b.id === savedBenefit.id ? savedBenefit : b))
        : [...prev, savedBenefit];
      return next.sort((a, b) => a.display_order - b.display_order);
    });
    onFeedback(
      'success',
      isNew
        ? `Beneficio "${savedBenefit.title}" creado correctamente.`
        : `Beneficio "${savedBenefit.title}" actualizado correctamente.`
    );
  };

  const handleToggleBenefitActive = async (benefit: HomepageSectionItem) => {
    setBusyKey(benefit.id);
    try {
      const res = await toggleAdminBenefitItemActive(
        benefit.id,
        !benefit.is_active
      );
      if (res.error || !res.benefit) {
        onFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado del beneficio.'
        );
        return;
      }
      setBenefits((prev) =>
        prev.map((b) => (b.id === benefit.id ? res.benefit! : b))
      );
      onFeedback(
        'success',
        `Beneficio "${benefit.title}" ${
          res.benefit.is_active ? 'activado' : 'desactivado'
        }.`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleBenefitPublish = async (benefit: HomepageSectionItem) => {
    const nextStatus: HomepagePublishStatus =
      benefit.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setBusyKey(benefit.id);
    try {
      const res = await updateAdminBenefitItemPublishStatus(
        benefit.id,
        nextStatus
      );
      if (res.error || !res.benefit) {
        onFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado de publicación.'
        );
        return;
      }
      setBenefits((prev) =>
        prev.map((b) => (b.id === benefit.id ? res.benefit! : b))
      );
      onFeedback(
        'success',
        `Beneficio "${benefit.title}" cambiado a ${nextStatus}.`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleMoveBenefitOrder = async (
    idx: number,
    direction: 'UP' | 'DOWN'
  ) => {
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedBenefits.length) return;

    const copy = [...sortedBenefits];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    const payload = copy.map((item, i) => ({
      id: item.id,
      display_order: i + 1,
    }));

    setBusyKey(moved.id);
    try {
      const res = await reorderAdminBenefitItems(payload);
      if (!res.success) {
        onFeedback(
          'error',
          res.error || 'No se pudo reordenar el beneficio.'
        );
        return;
      }
      const orderMap = new Map(payload.map((o) => [o.id, o.display_order]));
      setBenefits((prev) =>
        prev
          .map((b) =>
            orderMap.has(b.id)
              ? { ...b, display_order: orderMap.get(b.id)! }
              : b
          )
          .sort((a, b) => a.display_order - b.display_order)
      );
      onFeedback('success', 'Orden de beneficios actualizado.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmDeleteBenefit = async () => {
    if (!benefitToDelete) return;
    setBusyKey(benefitToDelete.id);
    try {
      const res = await deleteAdminBenefitItem(benefitToDelete.id);
      if (!res.success) {
        onFeedback(
          'error',
          res.error || 'No se pudo eliminar el beneficio.'
        );
        return;
      }
      setBenefits((prev) => prev.filter((b) => b.id !== benefitToDelete.id));
      setBenefitToDelete(null);
      onFeedback('success', 'Beneficio eliminado correctamente.');
    } finally {
      setBusyKey(null);
    }
  };

  // ==========================================================================
  // HANDLERS DE OBJETIVOS RELACIONALES (`public.homepage_section_targets`)
  // ==========================================================================
  const handleAddTarget = async (params: {
    sectionId: string;
    targetType: 'PRODUCT' | 'CATEGORY';
    collectionKey: string;
    productId?: string;
    categoryId?: string;
    currentListLength: number;
  }) => {
    setBusyKey(`add-target-${params.collectionKey}`);
    try {
      const res = await addAdminSectionTarget({
        section_id: params.sectionId,
        target_type: params.targetType,
        collection_key: params.collectionKey,
        product_id: params.productId || null,
        category_id: params.categoryId || null,
        display_order: params.currentListLength + 1,
        is_active: true,
      });

      if (res.error || !res.target) {
        onFeedback(
          'error',
          res.error || 'No se pudo agregar el elemento a la sección.'
        );
        return;
      }

      setTargets((prev) => [...prev, res.target!]);
      onFeedback(
        'success',
        params.targetType === 'PRODUCT'
          ? `Producto "${res.target.product?.name || ''}" agregado correctamente.`
          : `Categoría "${res.target.category?.name || ''}" agregada correctamente.`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleTargetActive = async (
    target: HomepageSectionTargetExpanded
  ) => {
    setBusyKey(target.id);
    try {
      const res = await toggleAdminSectionTargetActive(
        target.id,
        !target.is_active
      );
      if (res.error || !res.target) {
        onFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado de la selección.'
        );
        return;
      }
      setTargets((prev) =>
        prev.map((t) => (t.id === target.id ? res.target! : t))
      );
      onFeedback('success', 'Estado individual de la selección actualizado.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleMoveTargetOrder = async (
    list: HomepageSectionTargetExpanded[],
    idx: number,
    direction: 'UP' | 'DOWN'
  ) => {
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const copy = [...list];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    const payload = copy.map((item, i) => ({
      id: item.id,
      display_order: i + 1,
    }));

    setBusyKey(moved.id);
    try {
      const res = await reorderAdminSectionTargets(payload);
      if (!res.success) {
        onFeedback('error', res.error || 'No se pudo actualizar el orden.');
        return;
      }
      const orderMap = new Map(payload.map((o) => [o.id, o.display_order]));
      setTargets((prev) =>
        prev.map((t) =>
          orderMap.has(t.id)
            ? { ...t, display_order: orderMap.get(t.id)! }
            : t
        )
      );
      onFeedback('success', 'Orden de elementos actualizado.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmRemoveTarget = async () => {
    if (!targetToDelete) return;
    const targetId = targetToDelete.id;
    setBusyKey(targetId);
    try {
      const res = await removeAdminSectionTarget(targetId);
      if (!res.success) {
        onFeedback('error', res.error || 'No se pudo quitar la selección.');
        return;
      }
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
      setTargetToDelete(null);
      onFeedback('success', 'Selección retirada de la colección.');
    } finally {
      setBusyKey(null);
    }
  };

  // ==========================================================================
  // HANDLERS DE GUARDADO DE SECCIONES ESPECIALIZADAS (3, 4, 5, 6, 7)
  // ==========================================================================
  const handleSaveDealConfig = async (
    overrideStatus?: HomepagePublishStatus
  ) => {
    if (!dealSection) return;
    setBusyKey('save-deal');
    try {
      const res = await saveAdminDealOfTheDayConfig(dealSection.id, {
        title: dealTitle,
        subtitle: dealSubtitle,
        badge_text: dealBadgeText,
        badge_variant: dealBadgeVariant,
        cta_label: dealCtaLabel,
        cta_url: '/catalogo?modalidad=PRO',
        status: overrideStatus || dealStatus,
        is_active: dealIsActive,
        starts_at: dealStartsAt || null,
        ends_at: dealEndsAt || null,
        featured_product_id: dealProductId || null,
        fallback_behavior: dealFallback,
        countdown_label: dealCountdownLabel,
        price_caption: dealPriceCaption,
        cta_button_label: dealCtaLabel,
        secondary_button_label: dealSecondaryLabel,
        custom_expires_at: dealCustomExpiresAt || null,
        promo_highlight_note: dealPromoNote || null,
      });

      if (res.error || !res.section) {
        onFeedback(
          'error',
          res.error || 'No se pudo guardar la Oferta Destacada del Día.'
        );
        return;
      }

      onSectionUpdated(res.section);
      await loadC4WorkspaceData();
      onFeedback(
        'success',
        `Oferta Destacada del Día guardada correctamente (${res.section.status}).`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveCategoryTabsConfig = async (
    overrideStatus?: HomepagePublishStatus
  ) => {
    if (!categoryTabsSection) return;
    setBusyKey('save-cat-tabs');
    try {
      const res = await saveAdminCategoryTabsConfig(categoryTabsSection.id, {
        title: catTabsTitle,
        subtitle: catTabsSubtitle,
        cta_label: catTabsCtaLabel,
        cta_url: catTabsCtaUrl,
        status: overrideStatus || catTabsStatus,
        is_active: catTabsIsActive,
        starts_at: catTabsStartsAt || null,
        ends_at: catTabsEndsAt || null,
        max_products_per_tab: catTabsMaxProducts,
        default_tab: catTabsDefaultTab,
        show_active_categories: catTabsShowCategories,
        category_selection_mode: catTabsCategoryMode,
        collection_tabs: catTabsList,
      });

      if (res.error || !res.section) {
        onFeedback(
          'error',
          res.error || 'No se pudo guardar la Vitrina por Categorías.'
        );
        return;
      }

      onSectionUpdated(res.section);
      onFeedback(
        'success',
        `Vitrina por Categorías actualizada correctamente (${res.section.status}).`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateQuickCollectionSection = async (
    type: 'FEATURED_CATEGORIES' | 'PRODUCT_COLLECTION'
  ) => {
    setBusyKey(`create-${type}`);
    try {
      const isCat = type === 'FEATURED_CATEGORIES';
      const res = await createAdminHomepageSection({
        section_type: type,
        admin_name: isCat
          ? 'Categorías Destacadas de SmartLab'
          : 'Colección de Productos Destacados',
        title: isCat
          ? 'Explora Nuestras Categorías Especializadas'
          : 'Soluciones Más Solicitadas por Empresas',
        subtitle: isCat
          ? 'Plantillas Excel, Google Sheets, Sistemas Web, Apps Android y Automatizaciones.'
          : 'Selección curada de herramientas digitales listas para operar en Soles (S/).',
        badge_text: isCat ? 'CATEGORÍAS' : 'COLECCIÓN PRO',
        badge_variant: isCat ? 'primary' : 'PRO',
        cta_label: 'Ver catálogo completo',
        cta_url: '/catalogo',
        display_order: sections.length + 1,
        status: 'PUBLISHED',
        is_active: true,
      });

      if (res.error || !res.section) {
        onFeedback(
          'error',
          res.error || 'No se pudo crear la sección de colección.'
        );
        return;
      }

      onSectionUpdated(res.section, true);
      setSelectedCollectionSectionId(res.section.id);
      onFeedback(
        'success',
        `Sección "${res.section.admin_name}" creada y lista para configurar.`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveCollectionSection = async (
    overrideStatus?: HomepagePublishStatus
  ) => {
    if (!activeCollectionSection) return;
    setBusyKey('save-collection');
    try {
      const res = await saveAdminCollectionSectionConfig(
        activeCollectionSection.id,
        {
          title: colTitle,
          subtitle: colSubtitle,
          badge_text: colBadgeText || null,
          badge_variant: colBadgeText ? colBadgeVariant : null,
          cta_label: colCtaLabel || null,
          cta_url: colCtaUrl || null,
          status: overrideStatus || colStatus,
          is_active: colIsActive,
          starts_at: colStartsAt || null,
          ends_at: colEndsAt || null,
          max_items: colMaxItems,
          selection_mode: colSelectionMode,
          auto_criterion: colAutoCriterion,
          collection_key: 'default',
        }
      );

      if (res.error || !res.section) {
        onFeedback(
          'error',
          res.error || 'No se pudo guardar la configuración de la colección.'
        );
        return;
      }

      onSectionUpdated(res.section);
      onFeedback(
        'success',
        `Colección "${res.section.admin_name}" guardada correctamente (${res.section.status}).`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveFreeResourcesConfig = async (
    overrideStatus?: HomepagePublishStatus
  ) => {
    if (!freeZoneSection) return;
    setBusyKey('save-free');
    try {
      const res = await saveAdminFreeResourcesConfig(freeZoneSection.id, {
        title: freeTitle,
        subtitle: freeSubtitle,
        badge_text: freeBadgeText,
        badge_variant: freeBadgeVariant,
        cta_label: freeCtaLabel,
        cta_url: freeCtaUrl,
        status: overrideStatus || freeStatus,
        is_active: freeIsActive,
        starts_at: freeStartsAt || null,
        ends_at: freeEndsAt || null,
        max_items: freeMaxItems,
        selection_mode: freeSelectionMode,
        highlight_note: freeHighlightNote || null,
      });

      if (res.error || !res.section) {
        onFeedback(
          'error',
          res.error || 'No se pudo guardar la sección de Recursos Gratuitos.'
        );
        return;
      }

      onSectionUpdated(res.section);
      onFeedback(
        'success',
        `Zona de Recursos Gratuitos actualizada correctamente (${res.section.status}).`
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveCustomServicesCta = async (
    overrideStatus?: HomepagePublishStatus
  ) => {
    if (!customCtaSection) return;
    setBusyKey('save-custom-cta');
    try {
      const res = await saveAdminCustomServicesCtaConfig(customCtaSection.id, {
        title: customTitle,
        subtitle: customSubtitle,
        badge_text: customBadgeText,
        badge_variant: customBadgeVariant,
        secondary_badge_text: customSecondaryBadge,
        cta_label: customCtaLabel,
        cta_url: customCtaUrl,
        secondary_cta_label: customSecCtaLabel || null,
        secondary_cta_url: customSecCtaUrl || null,
        response_SLA_text: customSlaText || null,
        status: overrideStatus || customStatus,
        is_active: customIsActive,
        starts_at: customStartsAt || null,
        ends_at: customEndsAt || null,
      });

      if (res.error || !res.section) {
        onFeedback(
          'error',
          res.error || 'No se pudo guardar el bloque de Servicios Personalizados.'
        );
        return;
      }

      onSectionUpdated(res.section);
      onFeedback(
        'success',
        `Servicios Personalizados guardados correctamente (${res.section.status}).`
      );
    } finally {
      setBusyKey(null);
    }
  };

  // ==========================================================================
  // HANDLERS DE BLOQUES INFORMATIVOS (`INFO_CARD`)
  // ==========================================================================
  const handleInfoCardSaved = (
    savedCard: HomepageSectionItem,
    isNew: boolean
  ) => {
    setInfoCards((prev) => {
      const exists = prev.some((c) => c.id === savedCard.id);
      const next = exists
        ? prev.map((c) => (c.id === savedCard.id ? savedCard : c))
        : [...prev, savedCard];
      return next.sort((a, b) => a.display_order - b.display_order);
    });
    loadC4WorkspaceData();
    onFeedback(
      'success',
      isNew
        ? `Bloque informativo "${savedCard.title}" creado correctamente.`
        : `Bloque informativo "${savedCard.title}" actualizado correctamente.`
    );
  };

  const handleToggleInfoCardActive = async (card: HomepageSectionItem) => {
    setBusyKey(card.id);
    try {
      const res = await toggleAdminInfoCardActive(card.id, !card.is_active);
      if (res.error || !res.infoCard) {
        onFeedback('error', res.error || 'No se pudo cambiar el estado.');
        return;
      }
      setInfoCards((prev) =>
        prev.map((c) => (c.id === card.id ? res.infoCard! : c))
      );
      onFeedback('success', 'Estado del bloque informativo actualizado.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleInfoCardPublish = async (card: HomepageSectionItem) => {
    const nextStatus: HomepagePublishStatus =
      card.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    setBusyKey(card.id);
    try {
      const res = await updateAdminInfoCardPublishStatus(card.id, nextStatus);
      if (res.error || !res.infoCard) {
        onFeedback(
          'error',
          res.error || 'No se pudo cambiar el estado de publicación.'
        );
        return;
      }
      setInfoCards((prev) =>
        prev.map((c) => (c.id === card.id ? res.infoCard! : c))
      );
      onFeedback('success', `Bloque informativo cambiado a ${nextStatus}.`);
    } finally {
      setBusyKey(null);
    }
  };

  const handleMoveInfoCardOrder = async (
    idx: number,
    direction: 'UP' | 'DOWN'
  ) => {
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedInfoCards.length) return;

    const copy = [...sortedInfoCards];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    const payload = copy.map((item, i) => ({
      id: item.id,
      display_order: i + 1,
    }));

    setBusyKey(moved.id);
    try {
      const res = await reorderAdminInfoCards(payload);
      if (!res.success) {
        onFeedback('error', res.error || 'No se pudo reordenar.');
        return;
      }
      const orderMap = new Map(payload.map((o) => [o.id, o.display_order]));
      setInfoCards((prev) =>
        prev
          .map((c) =>
            orderMap.has(c.id)
              ? { ...c, display_order: orderMap.get(c.id)! }
              : c
          )
          .sort((a, b) => a.display_order - b.display_order)
      );
      onFeedback('success', 'Orden de bloques informativos actualizado.');
    } finally {
      setBusyKey(null);
    }
  };

  const handleConfirmDeleteInfoCard = async () => {
    if (!infoCardToDelete) return;
    setBusyKey(infoCardToDelete.id);
    try {
      const res = await deleteAdminInfoCard(infoCardToDelete.id);
      if (!res.success) {
        onFeedback(
          'error',
          res.error || 'No se pudo eliminar el bloque informativo.'
        );
        return;
      }
      setInfoCards((prev) =>
        prev.filter((c) => c.id !== infoCardToDelete.id)
      );
      setInfoCardToDelete(null);
      onFeedback('success', 'Bloque informativo eliminado.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navegación de los 6 módulos del Sprint C4 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A68FF]">
              Sprint C4 • Secciones de Contenido, Vitrinas, Colecciones y Bloques
            </span>
            <p className="text-xs text-slate-500">
              Administra cada bloque comercial de la portada conectado a `public.products`, `public.categories`, `homepage_section_items` y `homepage_section_targets`.
            </p>
          </div>
          <button
            type="button"
            onClick={loadC4WorkspaceData}
            disabled={isLoadingC4}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isLoadingC4 ? 'animate-spin text-[#0A68FF]' : ''
              }`}
            />
            <span>Recargar Datos C4</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => setSubTab('BENEFITS')}
            className={`p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
              subTab === 'BENEFITS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400" />
              <div className="truncate">
                <div className="text-xs font-extrabold truncate">
                  1. Beneficios
                </div>
                <div className="text-[10px] opacity-75 truncate">
                  VALUE_PROPOSITION
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-white/15">
              {sortedBenefits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('DEAL_OF_THE_DAY')}
            className={`p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
              subTab === 'DEAL_OF_THE_DAY'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Flame className="w-4 h-4 shrink-0 text-orange-400" />
              <div className="truncate">
                <div className="text-xs font-extrabold truncate">
                  2. Oferta del Día
                </div>
                <div className="text-[10px] opacity-75 truncate">
                  DEAL_OF_THE_DAY
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('CATEGORY_SHOWCASE')}
            className={`p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
              subTab === 'CATEGORY_SHOWCASE'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 shrink-0 text-indigo-400" />
              <div className="truncate">
                <div className="text-xs font-extrabold truncate">
                  3. Vitrina Tabs
                </div>
                <div className="text-[10px] opacity-75 truncate">
                  CATEGORY_TABS
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('COLLECTIONS')}
            className={`p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
              subTab === 'COLLECTIONS'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-4 h-4 shrink-0 text-violet-400" />
              <div className="truncate">
                <div className="text-xs font-extrabold truncate">
                  4. Colecciones
                </div>
                <div className="text-[10px] opacity-75 truncate">
                  PROD & CATS
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-white/15">
              {collectionSections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('FREE_RESOURCES')}
            className={`p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
              subTab === 'FREE_RESOURCES'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Gift className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="truncate">
                <div className="text-xs font-extrabold truncate">
                  5. Zona FREE
                </div>
                <div className="text-[10px] opacity-75 truncate">
                  FREE_RESOURCES
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('CUSTOM_AND_INFO')}
            className={`p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer ${
              subTab === 'CUSTOM_AND_INFO'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 shrink-0 text-amber-400" />
              <div className="truncate">
                <div className="text-xs font-extrabold truncate">
                  6. A Medida e Info
                </div>
                <div className="text-[10px] opacity-75 truncate">
                  CTA & INFO_BLOCK
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-white/15">
              {sortedInfoCards.length}
            </span>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* APARTADO 1: BENEFICIOS DE SMARTLAB (VALUE_PROPOSITION)             */}
      {/* ================================================================== */}
      {subTab === 'BENEFITS' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0A68FF] border border-blue-200 text-[11px] font-bold uppercase">
                  Sección VALUE_PROPOSITION (`value_props`)
                </span>
                <span className="text-xs font-mono text-slate-400">
                  item_type = BENEFIT_ITEM
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Beneficios de Comprar en SmartLab Store
              </h2>
              <p className="text-xs text-slate-500">
                Personaliza el título, descripción, icono Lucide y color HEX del icono de cada beneficio sin alterar los fondos ni el diseño visual de las tarjetas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingBenefit(null);
                setBenefitPreviewOnly(false);
                setIsBenefitModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Beneficio</span>
            </button>
          </div>

          {/* Vista Previa de la Barra de 4 Columnas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Vista previa de la barra de beneficios publicados y activos ({sortedBenefits.filter((b) => b.is_active && b.status === 'PUBLISHED').length} visibles)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedBenefits
                .filter((b) => b.is_active && b.status === 'PUBLISHED')
                .map((benefit) => (
                  <div
                    key={benefit.id}
                    className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <HomepageIconBadge
                      iconName={benefit.icon_name}
                      iconColorHex={benefit.icon_color_hex}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {benefit.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {benefit.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Tabla Administrativa de Beneficios */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4 w-28">Orden</th>
                    <th className="py-3.5 px-4 w-48">Icono y Color HEX</th>
                    <th className="py-3.5 px-4">Título y Descripción</th>
                    <th className="py-3.5 px-4 w-36">Publicación</th>
                    <th className="py-3.5 px-4 w-32">Estado</th>
                    <th className="py-3.5 px-4 w-40 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                  {sortedBenefits.map((benefit, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === sortedBenefits.length - 1;
                    const isBusy = busyKey === benefit.id;

                    return (
                      <tr
                        key={benefit.id}
                        className="hover:bg-slate-50/80 transition-colors align-top"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs">
                              #{benefit.display_order}
                            </span>
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={isFirst || isBusy}
                                onClick={() => handleMoveBenefitOrder(idx, 'UP')}
                                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isLast || isBusy}
                                onClick={() =>
                                  handleMoveBenefitOrder(idx, 'DOWN')
                                }
                                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <HomepageIconBadge
                              iconName={benefit.icon_name}
                              iconColorHex={benefit.icon_color_hex}
                            />
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">
                                {benefit.icon_name || 'ShieldCheck'}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-0.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                  style={{
                                    backgroundColor:
                                      benefit.icon_color_hex || '#3B82F6',
                                  }}
                                />
                                {benefit.icon_color_hex || '#3B82F6'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 space-y-1">
                          <span className="text-[11px] font-semibold text-slate-400 block">
                            {benefit.admin_name}
                          </span>
                          <p className="font-bold text-slate-900">
                            {benefit.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {benefit.subtitle}
                          </p>
                        </td>

                        <td className="py-4 px-4">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleBenefitPublish(benefit)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border cursor-pointer ${
                              benefit.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {benefit.status === 'PUBLISHED' ? (
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
                        </td>

                        <td className="py-4 px-4">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleBenefitActive(benefit)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border cursor-pointer ${
                              benefit.is_active
                                ? 'bg-blue-50 text-[#0A68FF] border-blue-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {benefit.is_active ? (
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
                                setEditingBenefit(benefit);
                                setBenefitPreviewOnly(true);
                                setIsBenefitModalOpen(true);
                              }}
                              title="Vista previa"
                              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBenefit(benefit);
                                setBenefitPreviewOnly(false);
                                setIsBenefitModalOpen(true);
                              }}
                              title="Editar beneficio"
                              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0A68FF] cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setBenefitToDelete(benefit)}
                              title="Eliminar beneficio"
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
        </div>
      )}

      {/* ================================================================== */}
      {/* APARTADO 2: OFERTA DESTACADA DEL DÍA (DEAL_OF_THE_DAY)             */}
      {/* ================================================================== */}
      {subTab === 'DEAL_OF_THE_DAY' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-orange-50 text-[#FF6B00] border border-orange-200 text-[11px] font-bold uppercase">
                Sección DEAL_OF_THE_DAY (`deal_of_the_day`)
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                Administración de la Oferta Destacada del Día
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona el producto desde `public.products`. Los precios en Soles (S/), SKU y versión provienen siempre del producto real (nunca se duplican precios en `homepage_sections`).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyKey === 'save-deal'}
                onClick={() => handleSaveDealConfig('DRAFT')}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Guardar Borrador</span>
              </button>
              <button
                type="button"
                disabled={busyKey === 'save-deal'}
                onClick={() => handleSaveDealConfig('PUBLISHED')}
                className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {busyKey === 'save-deal'
                    ? 'Guardando...'
                    : 'Guardar y Publicar Oferta'}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título de la Sección *
                  </label>
                  <input
                    type="text"
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtítulo Público
                  </label>
                  <input
                    type="text"
                    value={dealSubtitle}
                    onChange={(e) => setDealSubtitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Selector de Producto desde public.products */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                <label className="block text-xs font-extrabold text-slate-900">
                  Producto Destacado (`public.products` → `homepage_section_targets`)
                </label>
                <select
                  value={dealProductId}
                  onChange={(e) => setDealProductId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-semibold"
                >
                  <option value="">
                    -- Sin producto manual (usar comportamiento de respaldo) --
                  </option>
                  {catalogProducts.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      [{prod.sku}] {prod.name} — {prod.modalidad} • Regular: S/{' '}
                      {prod.price_regular_pen.toFixed(2)}
                      {prod.price_sale_pen !== null
                        ? ` | Oferta: S/ ${prod.price_sale_pen.toFixed(2)}`
                        : ''}
                    </option>
                  ))}
                </select>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comportamiento cuando no exista producto válido o expire
                  </label>
                  <select
                    value={dealFallback}
                    onChange={(e) =>
                      setDealFallback(e.target.value as DealFallbackBehavior)
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800"
                  >
                    <option value="AUTO_FIRST_PROMOTION">
                      Mostrar automáticamente el primer producto activo en promoción (is_on_promotion)
                    </option>
                    <option value="AUTO_FEATURED">
                      Mostrar automáticamente el primer producto destacado activo (is_featured)
                    </option>
                    <option value="HIDE_SECTION">
                      Ocultar automáticamente la sección de Oferta del Día en la portada
                    </option>
                  </select>
                </div>
              </div>

              {/* Textos promocionales y etiquetas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge de Campaña
                  </label>
                  <input
                    type="text"
                    value={dealBadgeText}
                    onChange={(e) => setDealBadgeText(e.target.value)}
                    placeholder="OFERTA DEL DÍA"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Etiqueta del Contador
                  </label>
                  <input
                    type="text"
                    value={dealCountdownLabel}
                    onChange={(e) => setDealCountdownLabel(e.target.value)}
                    placeholder="TERMINA EN:"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto del Botón Principal de Compra
                  </label>
                  <input
                    type="text"
                    value={dealCtaLabel}
                    onChange={(e) => setDealCtaLabel(e.target.value)}
                    placeholder="Comprar con Descuento S/"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto del Botón Secundario (Ficha Técnica)
                  </label>
                  <input
                    type="text"
                    value={dealSecondaryLabel}
                    onChange={(e) => setDealSecondaryLabel(e.target.value)}
                    placeholder="Ver Ficha Técnica y Versiones"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Leyenda bajo el Precio en Soles (PEN)
                  </label>
                  <input
                    type="text"
                    value={dealPriceCaption}
                    onChange={(e) => setDealPriceCaption(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha Límite Personalizada del Contador (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={dealCustomExpiresAt}
                    onChange={(e) => setDealCustomExpiresAt(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800"
                  />
                </div>
              </div>

              {/* Vigencia y visibilidad */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Inicio Vigencia (`starts_at`)
                  </label>
                  <input
                    type="datetime-local"
                    value={dealStartsAt}
                    onChange={(e) => setDealStartsAt(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fin Vigencia (`ends_at`)
                  </label>
                  <input
                    type="datetime-local"
                    value={dealEndsAt}
                    onChange={(e) => setDealEndsAt(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Estado Publicación
                  </label>
                  <select
                    value={dealStatus}
                    onChange={(e) =>
                      setDealStatus(e.target.value as HomepagePublishStatus)
                    }
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dealIsActive}
                      onChange={(e) => setDealIsActive(e.target.checked)}
                      className="w-4 h-4 accent-[#0A68FF]"
                    />
                    <span>Sección Activa</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Tarjeta de Verificación Comercial del Producto Seleccionado */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 self-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Datos Comerciales Reales (`public.products`)
              </span>

              {selectedDealProduct ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                      {selectedDealProduct.sku}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] text-[11px] font-extrabold">
                      {selectedDealProduct.modalidad}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {selectedDealProduct.name}
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-xs text-slate-500">
                      Precio Regular:{' '}
                      <strong className="text-slate-800">
                        S/ {selectedDealProduct.price_regular_pen.toFixed(2)}
                      </strong>
                    </div>
                    <div className="text-xs text-slate-500">
                      Precio Promocional:{' '}
                      <strong className="text-emerald-700">
                        {selectedDealProduct.price_sale_pen !== null
                          ? `S/ ${selectedDealProduct.price_sale_pen.toFixed(2)}`
                          : 'Sin precio de oferta'}
                      </strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Los precios se leen en vivo desde `public.products`. Si cambias el precio en `/admin/products`, la portada reflejará el cambio automáticamente.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  No se ha fijado un producto manual. Se aplicará la regla de respaldo:{' '}
                  <strong>{dealFallback}</strong>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* APARTADO 3: VITRINA POR CATEGORÍAS (CATEGORY_TABS_SHOWCASE)        */}
      {/* ================================================================== */}
      {subTab === 'CATEGORY_SHOWCASE' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold uppercase">
                  Sección CATEGORY_TABS_SHOWCASE (`category_tabs`)
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  Vitrina por Categorías y Pestañas de Colección
                </h2>
                <p className="text-xs text-slate-500">
                  Configura el título, subtítulo, cantidad máxima de productos, orden de pestañas (*Destacados*, *Más Vendidos*, *Novedades*, *En Oferta*) y selección desde `public.categories` y `public.products`.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyKey === 'save-cat-tabs'}
                  onClick={() => handleSaveCategoryTabsConfig('DRAFT')}
                  className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Guardar Borrador</span>
                </button>
                <button
                  type="button"
                  disabled={busyKey === 'save-cat-tabs'}
                  onClick={() => handleSaveCategoryTabsConfig('PUBLISHED')}
                  className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar y Publicar Vitrina</span>
                </button>
              </div>
            </div>

            {/* Configuración general de la vitrina */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título de la Vitrina *
                </label>
                <input
                  type="text"
                  value={catTabsTitle}
                  onChange={(e) => setCatTabsTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo Público
                </label>
                <input
                  type="text"
                  value={catTabsSubtitle}
                  onChange={(e) => setCatTabsSubtitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Máx. Productos por Pestaña
                </label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={catTabsMaxProducts}
                  onChange={(e) =>
                    setCatTabsMaxProducts(
                      Math.max(1, Math.min(24, Number(e.target.value) || 8))
                    )
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Texto Enlace Catálogo
                </label>
                <input
                  type="text"
                  value={catTabsCtaLabel}
                  onChange={(e) => setCatTabsCtaLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL del Enlace
                </label>
                <input
                  type="text"
                  value={catTabsCtaUrl}
                  onChange={(e) => setCatTabsCtaUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Modo de Categorías (`public.categories`)
                </label>
                <select
                  value={catTabsCategoryMode}
                  onChange={(e) =>
                    setCatTabsCategoryMode(
                      e.target.value as 'ALL_ACTIVE' | 'MANUAL_TARGETS'
                    )
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                >
                  <option value="ALL_ACTIVE">
                    Todas las categorías activas (orden de B2–B5)
                  </option>
                  <option value="MANUAL_TARGETS">
                    Selección manual en homepage_section_targets
                  </option>
                </select>
              </div>
              <div className="flex items-end pb-2 gap-4">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catTabsShowCategories}
                    onChange={(e) => setCatTabsShowCategories(e.target.checked)}
                    className="w-4 h-4 accent-[#0A68FF]"
                  />
                  <span>Mostrar filtro de categorías</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catTabsIsActive}
                    onChange={(e) => setCatTabsIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#0A68FF]"
                  />
                  <span>Activa</span>
                </label>
              </div>
            </div>

            {/* Vigencia opcional de la Vitrina por Categorías */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Inicio Opcional (`starts_at`)
                </label>
                <input
                  type="datetime-local"
                  value={catTabsStartsAt}
                  onChange={(e) => setCatTabsStartsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha de Fin Opcional (`ends_at`)
                </label>
                <input
                  type="datetime-local"
                  value={catTabsEndsAt}
                  onChange={(e) => setCatTabsEndsAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Orden y activación de las 4 pestañas de colecciones */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/60">
              <span className="text-xs font-extrabold text-slate-800 block">
                Pestañas de Colecciones (Activar, renombrar, ordenar y elegir modo Automático vs Manual)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catTabsList.map((tab, idx) => (
                  <div
                    key={tab.key}
                    className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-extrabold text-xs inline-flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <input
                        type="checkbox"
                        checked={tab.enabled}
                        onChange={(e) => {
                          const next = [...catTabsList];
                          next[idx] = {
                            ...next[idx],
                            enabled: e.target.checked,
                          };
                          setCatTabsList(next);
                        }}
                        className="w-4 h-4 accent-[#0A68FF]"
                      />
                      <input
                        type="text"
                        value={tab.label}
                        onChange={(e) => {
                          const next = [...catTabsList];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setCatTabsList(next);
                        }}
                        className="h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 w-36"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={tab.selection_mode}
                        onChange={(e) => {
                          const next = [...catTabsList];
                          next[idx] = {
                            ...next[idx],
                            selection_mode: e.target
                              .value as CollectionSelectionMode,
                          };
                          setCatTabsList(next);
                        }}
                        className="h-8 px-2 rounded-lg border border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-700"
                      >
                        <option value="AUTO_FLAGS">
                          Flag automático ({tab.key})
                        </option>
                        <option value="MANUAL_TARGETS">
                          Selección manual
                        </option>
                      </select>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const copy = [...catTabsList];
                          const [moved] = copy.splice(idx, 1);
                          copy.splice(idx - 1, 0, moved);
                          setCatTabsList(
                            copy.map((t, i) => ({ ...t, display_order: i + 1 }))
                          );
                        }}
                        className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === catTabsList.length - 1}
                        onClick={() => {
                          const copy = [...catTabsList];
                          const [moved] = copy.splice(idx, 1);
                          copy.splice(idx + 1, 0, moved);
                          setCatTabsList(
                            copy.map((t, i) => ({ ...t, display_order: i + 1 }))
                          );
                        }}
                        className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Curaduría Manual de Productos por Pestaña y Categorías de la Vitrina */}
          {categoryTabsSection && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Curaduría de Productos por Pestaña */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Productos Asignados por Colección (`homepage_section_targets`)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sin inventar ventas: usa flags existentes (`is_bestseller`, `is_featured`, `is_new`, `is_on_promotion`) o asigna productos manualmente.
                    </p>
                  </div>
                  <select
                    value={activeShowcaseCollectionKey}
                    onChange={(e) =>
                      setActiveShowcaseCollectionKey(
                        e.target.value as CategoryShowcaseCollectionKey
                      )
                    }
                    className="h-9 px-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-[#0A68FF]"
                  >
                    <option value="mas_vendidos">
                      Colección: Más Vendidos (mas_vendidos)
                    </option>
                    <option value="ofertas">
                      Colección: En Oferta (ofertas)
                    </option>
                    <option value="novedades">
                      Colección: Novedades (novedades)
                    </option>
                    <option value="destacados">
                      Colección: Destacados (destacados)
                    </option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedShowcaseProductToAdd}
                    onChange={(e) =>
                      setSelectedShowcaseProductToAdd(e.target.value)
                    }
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                  >
                    <option value="">
                      Seleccionar producto activo de public.products...
                    </option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} ({p.modalidad} - S/{' '}
                        {p.price_regular_pen.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedShowcaseProductToAdd}
                    onClick={() => {
                      if (!selectedShowcaseProductToAdd) return;
                      handleAddTarget({
                        sectionId: categoryTabsSection.id,
                        targetType: 'PRODUCT',
                        collectionKey: activeShowcaseCollectionKey,
                        productId: selectedShowcaseProductToAdd,
                        currentListLength: showcaseProductTargets.length,
                      });
                      setSelectedShowcaseProductToAdd('');
                    }}
                    className="px-3.5 h-10 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>

                {showcaseProductTargets.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                    No hay productos manuales en la colección{' '}
                    <code>{activeShowcaseCollectionKey}</code>. Se mostrarán automáticamente los productos activos con el flag correspondiente en `public.products`.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {showcaseProductTargets.map((t, idx) => (
                      <div
                        key={t.id}
                        className="p-3 bg-white flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">
                              {t.product?.name || t.product_id}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {t.product?.sku} • {t.product?.modalidad} • S/{' '}
                              {t.product?.price_regular_pen.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTargetActive(t)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                              t.is_active
                                ? 'bg-blue-50 text-[#0A68FF] border-blue-200'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}
                          >
                            {t.is_active ? 'Activo' : 'Inactivo'}
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              handleMoveTargetOrder(
                                showcaseProductTargets,
                                idx,
                                'UP'
                              )
                            }
                            className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === showcaseProductTargets.length - 1}
                            onClick={() =>
                              handleMoveTargetOrder(
                                showcaseProductTargets,
                                idx,
                                'DOWN'
                              )
                            }
                            className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetToDelete(t)}
                            className="p-1 rounded border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Quitar producto de la colección"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selección de Categorías de la Vitrina */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Categorías en la Vitrina (`public.categories` — B2 a B5)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Respeta los iconos, imágenes y colores HEX configurados en `/admin/categories`.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedShowcaseCategoryToAdd}
                    onChange={(e) =>
                      setSelectedShowcaseCategoryToAdd(e.target.value)
                    }
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                  >
                    <option value="">
                      Seleccionar categoría activa de public.categories...
                    </option>
                    {catalogCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (slug: {c.slug} • color: {c.color_hex})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedShowcaseCategoryToAdd}
                    onClick={() => {
                      if (!selectedShowcaseCategoryToAdd) return;
                      handleAddTarget({
                        sectionId: categoryTabsSection.id,
                        targetType: 'CATEGORY',
                        collectionKey: 'showcase_categories',
                        categoryId: selectedShowcaseCategoryToAdd,
                        currentListLength: showcaseCategoryTargets.length,
                      });
                      setSelectedShowcaseCategoryToAdd('');
                    }}
                    className="px-3.5 h-10 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar</span>
                  </button>
                </div>

                {showcaseCategoryTargets.length === 0 ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      Mostrando todas las categorías activas de `public.categories` ({catalogCategories.length} activas):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {catalogCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center gap-2 text-xs"
                        >
                          <CategoryVisual
                            category={{
                              id: cat.id,
                              name: cat.name,
                              slug: cat.slug,
                              icon_name: cat.icon_name || 'FolderOpen',
                              image_url: cat.image_url || null,
                              color_hex: cat.color_hex,
                            }}
                          />
                          <span className="font-bold text-slate-800 truncate">
                            {cat.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {showcaseCategoryTargets.map((t, idx) => (
                      <div
                        key={t.id}
                        className="p-3 bg-white flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          {t.category && (
                            <CategoryVisual
                              category={{
                                id: t.category.id,
                                name: t.category.name,
                                slug: t.category.slug,
                                icon_name: t.category.icon_name || 'FolderOpen',
                                image_url: t.category.image_url || null,
                                color_hex: t.category.color_hex,
                              }}
                            />
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {t.category?.name || t.category_id}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {t.category?.slug}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleTargetActive(t)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                              t.is_active
                                ? 'bg-blue-50 text-[#0A68FF] border-blue-200'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}
                          >
                            {t.is_active ? 'Activa' : 'Inactiva'}
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              handleMoveTargetOrder(
                                showcaseCategoryTargets,
                                idx,
                                'UP'
                              )
                            }
                            className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              idx === showcaseCategoryTargets.length - 1
                            }
                            onClick={() =>
                              handleMoveTargetOrder(
                                showcaseCategoryTargets,
                                idx,
                                'DOWN'
                              )
                            }
                            className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetToDelete(t)}
                            className="p-1 rounded border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Quitar categoría de la vitrina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* APARTADO 4: COLECCIONES (`FEATURED_CATEGORIES` / `PRODUCT_COLLECTION`) */}
      {/* ================================================================== */}
      {subTab === 'COLLECTIONS' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-bold uppercase">
                Secciones FEATURED_CATEGORIES y PRODUCT_COLLECTION
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                Administración de Colecciones de Productos y Categorías Destacadas
              </h2>
              <p className="text-xs text-slate-500">
                Configura secciones dedicadas de categorías destacadas o colecciones de productos con selección automática por flags o manual en `public.homepage_section_targets`.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyKey === 'create-FEATURED_CATEGORIES'}
                onClick={() =>
                  handleCreateQuickCollectionSection('FEATURED_CATEGORIES')
                }
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FolderKanban className="w-3.5 h-3.5 text-[#0A68FF]" />
                <span>+ Nueva Sección Categorías</span>
              </button>
              <button
                type="button"
                disabled={busyKey === 'create-PRODUCT_COLLECTION'}
                onClick={() =>
                  handleCreateQuickCollectionSection('PRODUCT_COLLECTION')
                }
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-[#0A68FF]" />
                <span>+ Nueva Colección Productos</span>
              </button>
            </div>
          </div>

          {collectionSections.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <p className="text-sm font-bold text-slate-800">
                Aún no has creado secciones adicionales de tipo `FEATURED_CATEGORIES` o `PRODUCT_COLLECTION`.
              </p>
              <p className="text-xs text-slate-500 max-w-xl mx-auto">
                Usa los botones superiores para crear una sección de Categorías Destacadas o una Colección de Productos y administrar sus elementos en `public.homepage_section_targets`.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-700">
                    Sección a configurar:
                  </span>
                  <select
                    value={selectedCollectionSectionId}
                    onChange={(e) =>
                      setSelectedCollectionSectionId(e.target.value)
                    }
                    className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900"
                  >
                    {collectionSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        [{sec.section_type}] {sec.admin_name} (#
                        {sec.display_order})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyKey === 'save-collection'}
                    onClick={() => handleSaveCollectionSection('DRAFT')}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-bold cursor-pointer"
                  >
                    Guardar DRAFT
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === 'save-collection'}
                    onClick={() => handleSaveCollectionSection('PUBLISHED')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0A68FF] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar y Publicar</span>
                  </button>
                </div>
              </div>

              {activeCollectionSection && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Título Público *
                        </label>
                        <input
                          type="text"
                          value={colTitle}
                          onChange={(e) => setColTitle(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cantidad Máxima de Elementos
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={colMaxItems}
                          onChange={(e) =>
                            setColMaxItems(
                              Math.max(1, Math.min(24, Number(e.target.value) || 6))
                            )
                          }
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subtítulo Público
                      </label>
                      <input
                        type="text"
                        value={colSubtitle}
                        onChange={(e) => setColSubtitle(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Modo de Selección
                        </label>
                        <select
                          value={colSelectionMode}
                          onChange={(e) =>
                            setColSelectionMode(
                              e.target.value as CollectionSelectionMode
                            )
                          }
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                        >
                          <option value="AUTO_FLAGS">
                            Automático por Criterio / Orden Activo
                          </option>
                          <option value="MANUAL_TARGETS">
                            Manual en homepage_section_targets
                          </option>
                        </select>
                      </div>

                      {activeCollectionSection.section_type ===
                        'PRODUCT_COLLECTION' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Criterio Automático (`public.products`)
                          </label>
                          <select
                            value={colAutoCriterion}
                            onChange={(e) =>
                              setColAutoCriterion(
                                e.target.value as AutomaticProductCriterion
                              )
                            }
                            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                          >
                            <option value="is_featured">
                              Productos Destacados (is_featured = true)
                            </option>
                            <option value="is_bestseller">
                              Más Vendidos (is_bestseller = true)
                            </option>
                            <option value="is_new">
                              Novedades (is_new = true)
                            </option>
                            <option value="is_on_promotion">
                              En Promoción (is_on_promotion = true)
                            </option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Fecha de Inicio Opcional (`starts_at`)
                        </label>
                        <input
                          type="datetime-local"
                          value={colStartsAt}
                          onChange={(e) => setColStartsAt(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Fecha de Fin Opcional (`ends_at`)
                        </label>
                        <input
                          type="datetime-local"
                          value={colEndsAt}
                          onChange={(e) => setColEndsAt(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selector manual en homepage_section_targets */}
                  <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Elementos Asignados en `homepage_section_targets`
                    </h3>

                    {activeCollectionSection.section_type ===
                    'FEATURED_CATEGORIES' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={colTargetCategoryToAdd}
                          onChange={(e) =>
                            setColTargetCategoryToAdd(e.target.value)
                          }
                          className="flex-1 h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                        >
                          <option value="">
                            Seleccionar categoría activa...
                          </option>
                          {catalogCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.slug})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!colTargetCategoryToAdd}
                          onClick={() => {
                            if (!colTargetCategoryToAdd) return;
                            handleAddTarget({
                              sectionId: activeCollectionSection.id,
                              targetType: 'CATEGORY',
                              collectionKey: 'default',
                              categoryId: colTargetCategoryToAdd,
                              currentListLength: activeCollectionTargets.length,
                            });
                            setColTargetCategoryToAdd('');
                          }}
                          className="px-3.5 h-10 rounded-xl bg-[#0A68FF] text-white text-xs font-bold cursor-pointer"
                        >
                          + Agregar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={colTargetProductToAdd}
                          onChange={(e) =>
                            setColTargetProductToAdd(e.target.value)
                          }
                          className="flex-1 h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
                        >
                          <option value="">
                            Seleccionar producto activo...
                          </option>
                          {catalogProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name} ({p.modalidad})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!colTargetProductToAdd}
                          onClick={() => {
                            if (!colTargetProductToAdd) return;
                            handleAddTarget({
                              sectionId: activeCollectionSection.id,
                              targetType: 'PRODUCT',
                              collectionKey: 'default',
                              productId: colTargetProductToAdd,
                              currentListLength: activeCollectionTargets.length,
                            });
                            setColTargetProductToAdd('');
                          }}
                          className="px-3.5 h-10 rounded-xl bg-[#0A68FF] text-white text-xs font-bold cursor-pointer"
                        >
                          + Agregar
                        </button>
                      </div>
                    )}

                    {activeCollectionTargets.length === 0 ? (
                      <p className="text-xs text-slate-500 p-3 bg-white rounded-xl border border-slate-200">
                        Sin elementos manuales asignados.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {activeCollectionTargets.map((t, idx) => (
                          <div
                            key={t.id}
                            className="p-2.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-bold text-slate-800 truncate">
                              #{idx + 1}{' '}
                              {t.target_type === 'PRODUCT'
                                ? t.product?.name || t.product_id
                                : t.category?.name || t.category_id}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleTargetActive(t)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                                  t.is_active
                                    ? 'bg-blue-50 text-[#0A68FF] border-blue-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {t.is_active ? 'Activo' : 'Inactivo'}
                              </button>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() =>
                                  handleMoveTargetOrder(
                                    activeCollectionTargets,
                                    idx,
                                    'UP'
                                  )
                                }
                                className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                                title="Subir orden"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={
                                  idx === activeCollectionTargets.length - 1
                                }
                                onClick={() =>
                                  handleMoveTargetOrder(
                                    activeCollectionTargets,
                                    idx,
                                    'DOWN'
                                  )
                                }
                                className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                                title="Bajar orden"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setTargetToDelete(t)}
                                className="p-1 rounded border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Quitar elemento de la colección"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* APARTADO 5: RECURSOS GRATUITOS (FREE_RESOURCES)                    */}
      {/* ================================================================== */}
      {subTab === 'FREE_RESOURCES' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold uppercase">
                Sección FREE_RESOURCES (`free_zone`) • Solo Modalidad FREE
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                Administración de la Zona de Recursos Gratuitos
              </h2>
              <p className="text-xs text-slate-500">
                La modalidad y el precio S/ 0.00 provienen de `public.products`. El sistema bloquea estrictamente cualquier intento de asignar productos `PRO` o `PERSONALIZADO` como gratuitos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busyKey === 'save-free'}
                onClick={() => handleSaveFreeResourcesConfig('DRAFT')}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Guardar Borrador</span>
              </button>
              <button
                type="button"
                disabled={busyKey === 'save-free'}
                onClick={() => handleSaveFreeResourcesConfig('PUBLISHED')}
                className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar y Publicar Zona FREE</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título de la Sección *
                  </label>
                  <input
                    type="text"
                    value={freeTitle}
                    onChange={(e) => setFreeTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge (`GRATIS`)
                  </label>
                  <input
                    type="text"
                    value={freeBadgeText}
                    onChange={(e) => setFreeBadgeText(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subtítulo Público
                </label>
                <input
                  type="text"
                  value={freeSubtitle}
                  onChange={(e) => setFreeSubtitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cantidad Máxima de Recursos FREE
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={freeMaxItems}
                    onChange={(e) =>
                      setFreeMaxItems(
                        Math.max(1, Math.min(16, Number(e.target.value) || 4))
                      )
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Modo de Selección FREE
                  </label>
                  <select
                    value={freeSelectionMode}
                    onChange={(e) =>
                      setFreeSelectionMode(
                        e.target.value as 'AUTO_ALL_FREE' | 'MANUAL_TARGETS'
                      )
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm"
                  >
                    <option value="AUTO_ALL_FREE">
                      Automático: todos los productos activos con modalidad FREE
                    </option>
                    <option value="MANUAL_TARGETS">
                      Manual: selección de productos FREE en homepage_section_targets
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto Enlace Catálogo FREE
                  </label>
                  <input
                    type="text"
                    value={freeCtaLabel}
                    onChange={(e) => setFreeCtaLabel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL del Enlace
                  </label>
                  <input
                    type="text"
                    value={freeCtaUrl}
                    onChange={(e) => setFreeCtaUrl(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Selector Manual de Productos Exclusivamente FREE */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-950">
                  Productos Elegibles con `modalidad === 'FREE'` ({freeOnlyCatalogProducts.length} activos)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  PRO bloqueados por seguridad
                </span>
              </div>

              {freeZoneSection && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFreeProductToAdd}
                    onChange={(e) =>
                      setSelectedFreeProductToAdd(e.target.value)
                    }
                    className="flex-1 h-10 px-3 rounded-xl border border-emerald-300 bg-white text-xs"
                  >
                    <option value="">
                      Seleccionar recurso gratuito (modalidad FREE)...
                    </option>
                    {freeOnlyCatalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.sku}] {p.name} — {p.modalidad} (S/ 0.00)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedFreeProductToAdd}
                    onClick={() => {
                      if (!selectedFreeProductToAdd) return;
                      handleAddTarget({
                        sectionId: freeZoneSection.id,
                        targetType: 'PRODUCT',
                        collectionKey: 'free_resources',
                        productId: selectedFreeProductToAdd,
                        currentListLength: freeZoneTargets.length,
                      });
                      setSelectedFreeProductToAdd('');
                    }}
                    className="px-3.5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                  >
                    + Asignar FREE
                  </button>
                </div>
              )}

              {freeZoneTargets.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs text-slate-600 space-y-2">
                  <p>
                    Modo automático activo: se mostrarán hasta{' '}
                    <strong>{freeMaxItems}</strong> productos con{' '}
                    <code>modalidad = 'FREE'</code> desde `public.products`:
                  </p>
                  <ul className="space-y-1">
                    {freeOnlyCatalogProducts.map((fp) => (
                      <li
                        key={fp.id}
                        className="flex items-center justify-between text-xs font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg"
                      >
                        <span className="truncate">
                          [{fp.sku}] {fp.name}
                        </span>
                        <span className="text-emerald-700 font-extrabold shrink-0 ml-2">
                          FREE • S/ 0.00
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="divide-y divide-emerald-100 bg-white rounded-xl border border-emerald-200 overflow-hidden">
                  {freeZoneTargets.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="truncate">
                        <span className="font-bold text-slate-900 block truncate">
                          #{idx + 1} {t.product?.name || t.product_id}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-bold">
                          {t.product?.sku} • {t.product?.modalidad} • S/ 0.00
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() =>
                            handleMoveTargetOrder(freeZoneTargets, idx, 'UP')
                          }
                          className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === freeZoneTargets.length - 1}
                          onClick={() =>
                            handleMoveTargetOrder(freeZoneTargets, idx, 'DOWN')
                          }
                          className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetToDelete(t)}
                          className="p-1 rounded border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Quitar recurso gratuito de la selección manual"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* APARTADO 6: SERVICIOS PERSONALIZADOS (`CUSTOM_SERVICES_CTA`)        */}
      {/*             Y BLOQUES INFORMATIVOS (`INFO_BLOCK` / `INFO_CARD`)     */}
      {/* ================================================================== */}
      {subTab === 'CUSTOM_AND_INFO' && (
        <div className="space-y-6">
          {/* 7. Servicios Personalizados (CUSTOM_SERVICES_CTA) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold uppercase">
                  Sección CUSTOM_SERVICES_CTA (`custom_cta`)
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  Bloque de Servicios y Desarrollos Personalizados
                </h2>
                <p className="text-xs text-slate-500">
                  Administra los badges, título, descripción, botón principal (`/solicitud-personalizada`), botón secundario opcional, visibilidad y estado `DRAFT`/`PUBLISHED`.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busyKey === 'save-custom-cta'}
                  onClick={() => handleSaveCustomServicesCta('DRAFT')}
                  className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Guardar Borrador</span>
                </button>
                <button
                  type="button"
                  disabled={busyKey === 'save-custom-cta'}
                  onClick={() => handleSaveCustomServicesCta('PUBLISHED')}
                  className="px-4 py-2 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar y Publicar CTA Personalizado</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Badge Principal
                </label>
                <input
                  type="text"
                  value={customBadgeText}
                  onChange={(e) => setCustomBadgeText(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Badge Secundario (`config_json.secondary_badge_text`)
                </label>
                <input
                  type="text"
                  value={customSecondaryBadge}
                  onChange={(e) => setCustomSecondaryBadge(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título Principal *
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Pública *
                </label>
                <textarea
                  rows={2}
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Texto Botón Principal *
                </label>
                <input
                  type="text"
                  value={customCtaLabel}
                  onChange={(e) => setCustomCtaLabel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL Botón Principal *
                </label>
                <input
                  type="text"
                  value={customCtaUrl}
                  onChange={(e) => setCustomCtaUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Texto Botón Secundario (opcional)
                </label>
                <input
                  type="text"
                  value={customSecCtaLabel}
                  onChange={(e) => setCustomSecCtaLabel(e.target.value)}
                  placeholder="Ej. Ver Casos de Éxito"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL Botón Secundario
                </label>
                <input
                  type="text"
                  value={customSecCtaUrl}
                  onChange={(e) => setCustomSecCtaUrl(e.target.value)}
                  placeholder="/catalogo?modalidad=PERSONALIZADO"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* 8. Bloques Informativos (INFO_BLOCK / INFO_CARD) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0A68FF] border border-blue-200 text-[11px] font-bold uppercase">
                  Secciones INFO_BLOCK • item_type = INFO_CARD
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  Tarjetas y Bloques Informativos Adicionales (`INFO_CARD`)
                </h2>
                <p className="text-xs text-slate-500">
                  Crea, edita, ordena, publica y activa múltiples bloques informativos con icono Lucide + color HEX o imagen opcional en `public-assets/home/info/`.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingInfoCard(null);
                  setInfoCardPreviewOnly(false);
                  setIsInfoCardModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0A68FF] hover:bg-[#0854D1] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Bloque Informativo</span>
              </button>
            </div>

            {sortedInfoCards.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <p className="text-sm font-bold text-slate-800">
                  Aún no hay bloques informativos (`INFO_CARD`) registrados.
                </p>
                <p className="text-xs text-slate-500">
                  Haz clic en "Nuevo Bloque Informativo" para agregar tarjetas editoriales, garantías o pasos operativos a la portada.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4 w-24">Orden</th>
                      <th className="py-3 px-4 w-40">Visual</th>
                      <th className="py-3 px-4">Título y Descripción</th>
                      <th className="py-3 px-4 w-44">Botón / Enlace</th>
                      <th className="py-3 px-4 w-32">Publicación</th>
                      <th className="py-3 px-4 w-28">Estado</th>
                      <th className="py-3 px-4 w-36 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {sortedInfoCards.map((card, idx) => (
                      <tr key={card.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-xs inline-flex items-center justify-center">
                              #{card.display_order}
                            </span>
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() =>
                                  handleMoveInfoCardOrder(idx, 'UP')
                                }
                                className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === sortedInfoCards.length - 1}
                                onClick={() =>
                                  handleMoveInfoCardOrder(idx, 'DOWN')
                                }
                                className="p-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {card.image_desktop_url ? (
                            <img
                              src={card.image_desktop_url}
                              alt={card.image_alt_text || card.title}
                              className="w-24 h-14 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <HomepageIconBadge
                                iconName={card.icon_name}
                                iconColorHex={card.icon_color_hex}
                              />
                              <span className="text-[11px] font-mono text-slate-500">
                                {card.icon_color_hex || '#0A68FF'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {card.title}
                            </span>
                            {card.badge_text && (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0A68FF] text-[10px] font-bold">
                                {card.badge_text}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {card.subtitle}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          {card.cta_primary_label ? (
                            <div>
                              <span className="font-bold text-slate-800 block">
                                {card.cta_primary_label}
                              </span>
                              <code className="text-[11px] text-[#0A68FF] font-mono">
                                {card.cta_primary_url}
                              </code>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">
                              Sin botón
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleInfoCardPublish(card)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              card.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {card.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleInfoCardActive(card)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                              card.is_active
                                ? 'bg-blue-50 text-[#0A68FF] border-blue-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}
                          >
                            {card.is_active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInfoCard(card);
                                setInfoCardPreviewOnly(true);
                                setIsInfoCardModalOpen(true);
                              }}
                              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingInfoCard(card);
                                setInfoCardPreviewOnly(false);
                                setIsInfoCardModalOpen(true);
                              }}
                              className="p-2 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-[#0A68FF] cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setInfoCardToDelete(card)}
                              className="p-2 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modales de Beneficios y Bloques Informativos */}
      <BenefitItemFormModal
        isOpen={isBenefitModalOpen}
        onClose={() => setIsBenefitModalOpen(false)}
        editingBenefit={editingBenefit}
        sectionId={valuePropsSection?.id}
        suggestedDisplayOrder={sortedBenefits.length + 1}
        previewOnly={benefitPreviewOnly}
        onSaved={handleBenefitSaved}
      />

      <InfoCardFormModal
        isOpen={isInfoCardModalOpen}
        onClose={() => setIsInfoCardModalOpen(false)}
        editingCard={editingInfoCard}
        infoSections={infoSections}
        suggestedDisplayOrder={sortedInfoCards.length + 1}
        previewOnly={infoCardPreviewOnly}
        onSaved={handleInfoCardSaved}
      />

      {/* Confirmación de eliminación de Beneficio */}
      {benefitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              ¿Eliminar este beneficio de SmartLab Store?
            </h3>
            <p className="text-xs text-slate-600">
              Se eliminará permanentemente{' '}
              <strong>{benefitToDelete.title}</strong> de{' '}
              <code>public.homepage_section_items</code>.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBenefitToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyKey === benefitToDelete.id}
                onClick={handleConfirmDeleteBenefit}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Eliminar Beneficio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación de Bloque Informativo */}
      {infoCardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              ¿Eliminar este bloque informativo?
            </h3>
            <p className="text-xs text-slate-600">
              Se eliminará permanentemente{' '}
              <strong>{infoCardToDelete.title}</strong> de{' '}
              <code>public.homepage_section_items</code> y su imagen en{' '}
              <code>public-assets/home/info/</code> si existiera.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInfoCardToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyKey === infoCardToDelete.id}
                onClick={handleConfirmDeleteInfoCard}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Eliminar Bloque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de retiro de selección manual en homepage_section_targets */}
      {targetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              ¿Quitar este elemento de la selección manual?
            </h3>
            <p className="text-xs text-slate-600">
              Se retirará{' '}
              <strong>
                {targetToDelete.target_type === 'PRODUCT'
                  ? targetToDelete.product?.name || targetToDelete.product_id
                  : targetToDelete.category?.name || targetToDelete.category_id}
              </strong>{' '}
              de <code>public.homepage_section_targets</code> (el producto o
              categoría original en el catálogo no se elimina).
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTargetToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyKey === targetToDelete.id}
                onClick={handleConfirmRemoveTarget}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirmar Retiro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
