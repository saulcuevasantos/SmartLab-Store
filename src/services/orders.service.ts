/**
 * SmartLab Store — Servicio de Pedidos, Vencimiento 72h y Comprobantes en Revisión
 * docs/08_PLAN_SPRINTS.md (Sprint 07) y docs/05_PEDIDOS_PAGOS.md
 *
 * Reglas de negocio críticas:
 * 1. El pedido se crea al finalizar el checkout con vencimiento predeterminado de 72 horas (order_expiration_hours).
 * 2. Toda la contabilidad opera exclusivamente en Soles Peruanos (PEN / S/).
 * 3. Los comprobantes enviados por el cliente quedan en estado EN_REVISION y el pedido pasa a PAGO_EN_REVISION.
 *    NUNCA incrementan total_paid_verified_pen ni allocated_paid_pen hasta que el administrador los verifique (Sprint 09).
 * 4. Si un pedido vence tras 72 horas, su estado pasa a VENCIDO preservando intactos los pagos previos y saldos pendientes.
 */

import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import {
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentMethod,
  Coupon,
  Delivery,
  PaymentMethodsConfig,
  PaymentMethodsBankAccountEntry,
  StoreSettingKey,
  StoreSettingRecord,
} from '../types/order.types';
import { CartItemFinancialBreakdown } from '../context/CartContext';

const LOCAL_ORDERS_KEY = 'smartlab_orders_v1';
const LOCAL_PAYMENTS_KEY = 'smartlab_payments_v1';
export const LOCAL_SETTINGS_KEY = 'smartlab_store_settings_v1';
export const LOCAL_STORE_SETTINGS_KV_KEY = 'smartlab_store_settings_kv_v1';

export const OFFICIAL_STORE_SETTING_KEYS: StoreSettingKey[] = [
  'payment_methods_config',
  'order_expiration_hours',
  'whatsapp_official_number',
  'support_email',
];

export interface BankAccountInfo {
  id?: string;
  bankName: string;
  accountType: string;
  currency: 'PEN';
  currencyLabel?: string;
  accountNumber: string;
  cci: string;
  holderName: string;
  active?: boolean;
}

export interface CheckoutStoreSettings {
  storeName: string;
  currencyCode: 'PEN';
  currencySymbol: 'S/';
  orderExpirationHours: number;
  officialWhatsappPhone: string;
  supportEmail: string;
  yapeNumber: string;
  yapeHolder: string;
  plinNumber: string;
  plinHolder: string;
  bankAccounts: BankAccountInfo[];
  paymentMethodsConfig?: PaymentMethodsConfig;
  settingsLoadError?: string | null;
}

export const EMPTY_PAYMENT_METHODS_CONFIG: PaymentMethodsConfig = {
  yape: {
    enabled: false,
    phone: '',
    holder: '',
    qr_url: null,
  },
  plin: {
    enabled: false,
    phone: '',
    holder: '',
    qr_url: null,
  },
  bank_transfer: {
    enabled: false,
    accounts: [],
  },
};

export const DEFAULT_PAYMENT_METHODS_CONFIG: PaymentMethodsConfig = {
  yape: {
    enabled: true,
    phone: '999 888 777',
    holder: 'SMARTLAB SOLUTIONS PERU SAC',
    qr_url: null,
  },
  plin: {
    enabled: true,
    phone: '999 888 777',
    holder: 'SMARTLAB SOLUTIONS PERU SAC',
    qr_url: null,
  },
  bank_transfer: {
    enabled: true,
    accounts: [
      {
        bank: 'BCP (Banco de Crédito del Perú)',
        account_type: 'Cuenta Corriente en Soles',
        currency: 'PEN (S/)',
        account_number: '191-9845120-0-48',
        cci: '00219100984512004854',
        holder: 'SMARTLAB SOLUTIONS PERU SAC',
        active: true,
        enabled: true,
      },
      {
        bank: 'Interbank',
        account_type: 'Cuenta Negocios en Soles',
        currency: 'PEN (S/)',
        account_number: '200-3004891205',
        cci: '00320000300489120532',
        holder: 'SMARTLAB SOLUTIONS PERU SAC',
        active: true,
        enabled: true,
      },
    ],
  },
};

/**
 * Determina si una cuenta bancaria configurada está activa y cuenta con los datos mínimos para operar
 */
export function isBankAccountEntryActive(acc: PaymentMethodsBankAccountEntry | null | undefined): boolean {
  if (!acc || typeof acc !== 'object') return false;
  if (acc.active === false || acc.enabled === false || acc.is_active === false) {
    return false;
  }
  const hasBank = Boolean(acc.bank && acc.bank.trim().length > 0);
  const hasAccountOrCci = Boolean(
    (acc.account_number && acc.account_number.trim().length > 0) ||
      (acc.cci && acc.cci.trim().length > 0)
  );
  return hasBank && hasAccountOrCci;
}

/**
 * Devuelve únicamente las cuentas bancarias activas y válidas cuando `bank_transfer.enabled` es true
 */
export function getActiveBankAccounts(
  config?: PaymentMethodsConfig | null
): PaymentMethodsBankAccountEntry[] {
  if (!config || !config.bank_transfer || config.bank_transfer.enabled !== true) {
    return [];
  }
  if (!Array.isArray(config.bank_transfer.accounts)) {
    return [];
  }
  return config.bank_transfer.accounts.filter(isBankAccountEntryActive);
}

/**
 * Devuelve la lista ordenada de métodos de pago efectivamente habilitados y configurados para el Checkout
 */
export function getEnabledCheckoutPaymentMethods(
  config?: PaymentMethodsConfig | null
): PaymentMethod[] {
  if (!config) return [];
  const enabled: PaymentMethod[] = [];

  if (
    config.yape &&
    config.yape.enabled === true &&
    Boolean(config.yape.phone && config.yape.phone.trim().length > 0) &&
    Boolean(config.yape.holder && config.yape.holder.trim().length > 0)
  ) {
    enabled.push('YAPE');
  }

  if (
    config.plin &&
    config.plin.enabled === true &&
    Boolean(config.plin.phone && config.plin.phone.trim().length > 0) &&
    Boolean(config.plin.holder && config.plin.holder.trim().length > 0)
  ) {
    enabled.push('PLIN');
  }

  const activeBankAccounts = getActiveBankAccounts(config);
  if (config.bank_transfer && config.bank_transfer.enabled === true && activeBankAccounts.length > 0) {
    enabled.push('TRANSFERENCIA');
  }

  return enabled;
}

export function mapConfigAccountsToBankAccountInfo(
  accounts: PaymentMethodsBankAccountEntry[]
): BankAccountInfo[] {
  return accounts.map((acc) => {
    const isActive =
      typeof acc.active === 'boolean'
        ? acc.active
        : typeof acc.enabled === 'boolean'
          ? acc.enabled
          : typeof acc.is_active === 'boolean'
            ? acc.is_active
            : true;
    return {
      ...(acc.id ? { id: acc.id } : {}),
      bankName: acc.bank || '',
      accountType: acc.account_type || 'Cuenta Recaudadora en Soles',
      currency: 'PEN',
      currencyLabel: acc.currency || 'PEN (S/)',
      accountNumber: acc.account_number || '',
      cci: acc.cci || '',
      holderName: acc.holder || '',
      active: isActive,
    };
  });
}

export function mapBankAccountInfoToConfigAccounts(
  accounts: BankAccountInfo[]
): PaymentMethodsBankAccountEntry[] {
  return accounts.map((acc) => {
    const isActive = typeof acc.active === 'boolean' ? acc.active : true;
    return {
      ...(acc.id ? { id: acc.id } : {}),
      bank: acc.bankName.trim(),
      account_type: acc.accountType?.trim() || 'Cuenta Recaudadora en Soles',
      currency: acc.currencyLabel?.trim() || 'PEN (S/)',
      account_number: acc.accountNumber.trim(),
      cci: acc.cci.trim(),
      holder: acc.holderName.trim(),
      active: isActive,
      enabled: isActive,
    };
  });
}

export function normalizePaymentMethodsConfig(
  raw: unknown,
  fallback: PaymentMethodsConfig = DEFAULT_PAYMENT_METHODS_CONFIG
): PaymentMethodsConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      yape: { ...fallback.yape },
      plin: { ...fallback.plin },
      bank_transfer: {
        enabled: fallback.bank_transfer.enabled,
        accounts: fallback.bank_transfer.accounts.map((a) => ({ ...a })),
      },
    };
  }

  const obj = raw as Record<string, unknown>;
  const rawYape =
    obj.yape && typeof obj.yape === 'object' ? (obj.yape as Record<string, unknown>) : {};
  const rawPlin =
    obj.plin && typeof obj.plin === 'object' ? (obj.plin as Record<string, unknown>) : {};
  const rawBank =
    obj.bank_transfer && typeof obj.bank_transfer === 'object'
      ? (obj.bank_transfer as Record<string, unknown>)
      : {};

  const rawAccounts = Array.isArray(rawBank.accounts) ? rawBank.accounts : null;
  const normalizedAccounts: PaymentMethodsBankAccountEntry[] = rawAccounts
    ? rawAccounts
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => {
          const isAccountActive =
            typeof item.active === 'boolean'
              ? item.active
              : typeof item.enabled === 'boolean'
                ? item.enabled
                : typeof item.is_active === 'boolean'
                  ? item.is_active
                  : true;
          return {
            ...(typeof item.id === 'string' && item.id.trim().length > 0
              ? { id: item.id.trim() }
              : {}),
            bank: String(item.bank ?? item.bankName ?? '').trim(),
            account_type: String(
              item.account_type ?? item.accountType ?? 'Cuenta Recaudadora en Soles'
            ).trim(),
            currency: String(item.currency ?? 'PEN (S/)').trim() || 'PEN (S/)',
            account_number: String(item.account_number ?? item.accountNumber ?? '').trim(),
            cci: String(item.cci ?? '').trim(),
            holder:
              typeof item.holder === 'string'
                ? item.holder.trim()
                : typeof item.holderName === 'string'
                  ? item.holderName.trim()
                  : fallback.yape.holder,
            active: isAccountActive,
            enabled: isAccountActive,
            is_active: isAccountActive,
          };
        })
    : fallback.bank_transfer.accounts.map((a) => ({ ...a }));

  return {
    yape: {
      enabled: typeof rawYape.enabled === 'boolean' ? rawYape.enabled : fallback.yape.enabled,
      phone:
        typeof rawYape.phone === 'string'
          ? rawYape.phone.trim()
          : fallback.yape.phone,
      holder:
        typeof rawYape.holder === 'string'
          ? rawYape.holder.trim()
          : fallback.yape.holder,
      qr_url:
        typeof rawYape.qr_url === 'string' && rawYape.qr_url.trim().length > 0
          ? rawYape.qr_url.trim()
          : rawYape.qr_url === null
            ? null
            : fallback.yape.qr_url,
    },
    plin: {
      enabled: typeof rawPlin.enabled === 'boolean' ? rawPlin.enabled : fallback.plin.enabled,
      phone:
        typeof rawPlin.phone === 'string'
          ? rawPlin.phone.trim()
          : fallback.plin.phone,
      holder:
        typeof rawPlin.holder === 'string'
          ? rawPlin.holder.trim()
          : fallback.plin.holder,
      qr_url:
        typeof rawPlin.qr_url === 'string' && rawPlin.qr_url.trim().length > 0
          ? rawPlin.qr_url.trim()
          : rawPlin.qr_url === null
            ? null
            : fallback.plin.qr_url,
    },
    bank_transfer: {
      enabled:
        typeof rawBank.enabled === 'boolean' ? rawBank.enabled : fallback.bank_transfer.enabled,
      accounts: normalizedAccounts,
    },
  };
}

export const DEFAULT_CHECKOUT_STORE_SETTINGS: CheckoutStoreSettings = {
  storeName: 'SmartLab Store',
  currencyCode: 'PEN',
  currencySymbol: 'S/',
  orderExpirationHours: 72,
  officialWhatsappPhone: import.meta.env.VITE_WHATSAPP_OFFICIAL_NUMBER || '51999888777',
  supportEmail: 'soporte@smartlab.pe',
  yapeNumber: DEFAULT_PAYMENT_METHODS_CONFIG.yape.phone,
  yapeHolder: DEFAULT_PAYMENT_METHODS_CONFIG.yape.holder,
  plinNumber: DEFAULT_PAYMENT_METHODS_CONFIG.plin.phone,
  plinHolder: DEFAULT_PAYMENT_METHODS_CONFIG.plin.holder,
  bankAccounts: mapConfigAccountsToBankAccountInfo(
    DEFAULT_PAYMENT_METHODS_CONFIG.bank_transfer.accounts
  ),
  paymentMethodsConfig: DEFAULT_PAYMENT_METHODS_CONFIG,
  settingsLoadError: null,
};

export interface CreateOrderFromCheckoutInput {
  customerId: string;
  customerFullName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocumentType?: string | null;
  customerDocumentNumber?: string | null;
  preferredPaymentMethod: PaymentMethod;
  customerNotes?: string;
  cartItems: CartItemFinancialBreakdown[];
  grossSubtotalPen: number;
  discountPen: number;
  netTotalPen: number;
  appliedCoupon?: Coupon | null;
}

export interface SubmitPaymentReceiptInput {
  orderId: string;
  registeredByUserId?: string | null;
  paymentMethod: PaymentMethod;
  amountReportedPen: number;
  operationNumber?: string;
  originPhone?: string;
  bankName?: string;
  receiptImagePath?: string | null;
  receiptImageUrl?: string | null;
  customerComment?: string;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  payments: Payment[];
}

function loadLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

function loadLocalPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalPayments(payments: Payment[]): void {
  try {
    localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(payments));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

/**
 * Carga el mapa local de registros key/value de `store_settings`
 */
export function loadLocalStoreSettingsKV(): Record<string, StoreSettingRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_SETTINGS_KV_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, StoreSettingRecord>;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Actualiza únicamente una clave específica en el mapa local key/value sin sobrescribir ni borrar otras claves
 */
export function upsertLocalStoreSettingKey<T>(
  key: StoreSettingKey,
  value: T,
  isPublic = true,
  updatedByUserId: string | null = null
): StoreSettingRecord<T> {
  const currentMap = loadLocalStoreSettingsKV();
  const record: StoreSettingRecord<T> = {
    key,
    value,
    is_public: isPublic,
    updated_by_user_id: updatedByUserId,
    updated_at: new Date().toISOString(),
  };
  currentMap[key] = record;
  try {
    localStorage.setItem(LOCAL_STORE_SETTINGS_KV_KEY, JSON.stringify(currentMap));
  } catch {
    // Ignorar errores de almacenamiento local
  }
  return record;
}

/**
 * Aplica un registro key/value de `public.store_settings` sobre un objeto CheckoutStoreSettings
 * respetando estrictamente la configuración del administrador sin sobreescribir campos vacíos/deshabilitados con valores por defecto.
 */
export function applyStoreSettingKeyValueToCheckoutSettings(
  current: CheckoutStoreSettings,
  key: string,
  rawValue: unknown
): CheckoutStoreSettings {
  if (key === 'order_expiration_hours') {
    const hours = Number(rawValue);
    if (Number.isFinite(hours) && hours > 0) {
      return {
        ...current,
        orderExpirationHours: Math.max(1, Math.min(720, Math.round(hours))),
      };
    }
    return current;
  }

  if (key === 'whatsapp_official_number') {
    const phone = String(rawValue ?? '').trim();
    if (phone.length > 0) {
      return {
        ...current,
        officialWhatsappPhone: phone,
      };
    }
    return current;
  }

  if (key === 'support_email') {
    const email = String(rawValue ?? '').trim();
    if (email.length > 0) {
      return {
        ...current,
        supportEmail: email,
      };
    }
    return current;
  }

  if (key === 'payment_methods_config') {
    const normalizedConfig = normalizePaymentMethodsConfig(
      rawValue,
      EMPTY_PAYMENT_METHODS_CONFIG
    );
    return {
      ...current,
      yapeNumber: normalizedConfig.yape.phone,
      yapeHolder: normalizedConfig.yape.holder,
      plinNumber: normalizedConfig.plin.phone,
      plinHolder: normalizedConfig.plin.holder,
      bankAccounts: mapConfigAccountsToBankAccountInfo(normalizedConfig.bank_transfer.accounts),
      paymentMethodsConfig: normalizedConfig,
    };
  }

  return current;
}

/**
 * Evalúa si un pedido ha superado su fecha/hora de vencimiento (72h por defecto)
 * y actualiza su estado a VENCIDO conservando intactos los pagos verificados y saldos pendientes
 * según docs/05_PEDIDOS_PAGOS.md (Sección 5).
 */
export function evaluateOrderExpiration(order: Order): Order {
  const expirableStatuses: OrderStatus[] = ['PENDIENTE_PAGO', 'PAGO_PARCIAL', 'OBSERVADO'];
  if (!expirableStatuses.includes(order.status)) {
    return order;
  }

  const nowMs = Date.now();
  const expiresMs = new Date(order.expires_at).getTime();

  if (Number.isFinite(expiresMs) && nowMs > expiresMs && order.balance_due_pen > 0) {
    return {
      ...order,
      status: 'VENCIDO',
      updated_at: new Date().toISOString(),
    };
  }

  return order;
}

/**
 * Obtiene la configuración comercial para el checkout (plazo 72h, cuentas en S/, Yape, Plin y WhatsApp oficial)
 * leyendo registros key/value JSONB desde `public.store_settings` con manejo de errores y sin asumir valores
 * por defecto que contradigan la configuración real del administrador.
 */
export async function getCheckoutStoreSettings(): Promise<CheckoutStoreSettings> {
  // Cuando Supabase está configurado, public.store_settings es la fuente autoritativa
  if (isSupabaseConfigured()) {
    let settings: CheckoutStoreSettings = {
      ...DEFAULT_CHECKOUT_STORE_SETTINGS,
      yapeNumber: '',
      yapeHolder: '',
      plinNumber: '',
      plinHolder: '',
      bankAccounts: [],
      paymentMethodsConfig: normalizePaymentMethodsConfig(
        EMPTY_PAYMENT_METHODS_CONFIG,
        EMPTY_PAYMENT_METHODS_CONFIG
      ),
      settingsLoadError: null,
    };

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('key, value, is_public, updated_by_user_id, updated_at')
        .in('key', OFFICIAL_STORE_SETTING_KEYS);

      if (error) {
        return {
          ...settings,
          settingsLoadError:
            error.message ||
            'No se pudo cargar la configuración de métodos de pago desde store_settings.',
        };
      }

      if (Array.isArray(data)) {
        for (const row of data) {
          if (row && typeof row.key === 'string') {
            settings = applyStoreSettingKeyValueToCheckoutSettings(settings, row.key, row.value);
            upsertLocalStoreSettingKey(
              row.key,
              row.value,
              typeof row.is_public === 'boolean' ? row.is_public : true,
              row.updated_by_user_id ?? null
            );
          }
        }
      }

      return settings;
    } catch (err) {
      return {
        ...settings,
        settingsLoadError:
          err instanceof Error
            ? err.message
            : 'Error de red al consultar la configuración de métodos de pago.',
      };
    }
  }

  // Modo local sin Supabase configurado
  let settings: CheckoutStoreSettings = {
    ...DEFAULT_CHECKOUT_STORE_SETTINGS,
    bankAccounts: DEFAULT_CHECKOUT_STORE_SETTINGS.bankAccounts.map((acc) => ({ ...acc })),
    paymentMethodsConfig: normalizePaymentMethodsConfig(DEFAULT_PAYMENT_METHODS_CONFIG),
    settingsLoadError: null,
  };

  // 1. Compatibilidad con posible caché local previa (LOCAL_SETTINGS_KEY)
  try {
    const legacyRaw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as Partial<CheckoutStoreSettings>;
      const legacyConfig = normalizePaymentMethodsConfig(
        parsed.paymentMethodsConfig ?? {
          yape: {
            enabled: true,
            phone: parsed.yapeNumber ?? settings.yapeNumber,
            holder: parsed.yapeHolder ?? settings.yapeHolder,
            qr_url: null,
          },
          plin: {
            enabled: true,
            phone: parsed.plinNumber ?? settings.plinNumber,
            holder: parsed.plinHolder ?? settings.plinHolder,
            qr_url: null,
          },
          bank_transfer: {
            enabled: true,
            accounts: Array.isArray(parsed.bankAccounts)
              ? mapBankAccountInfoToConfigAccounts(parsed.bankAccounts)
              : DEFAULT_PAYMENT_METHODS_CONFIG.bank_transfer.accounts,
          },
        },
        EMPTY_PAYMENT_METHODS_CONFIG
      );

      settings = {
        ...settings,
        storeName: parsed.storeName || settings.storeName,
        orderExpirationHours:
          Number(parsed.orderExpirationHours) > 0
            ? Number(parsed.orderExpirationHours)
            : settings.orderExpirationHours,
        officialWhatsappPhone: parsed.officialWhatsappPhone || settings.officialWhatsappPhone,
        supportEmail: parsed.supportEmail || settings.supportEmail,
        yapeNumber: legacyConfig.yape.phone,
        yapeHolder: legacyConfig.yape.holder,
        plinNumber: legacyConfig.plin.phone,
        plinHolder: legacyConfig.plin.holder,
        bankAccounts: mapConfigAccountsToBankAccountInfo(legacyConfig.bank_transfer.accounts),
        paymentMethodsConfig: legacyConfig,
      };
    }
  } catch {
    // Continuar con valores base
  }

  // 2. Aplicar registros locales key/value (LOCAL_STORE_SETTINGS_KV_KEY)
  try {
    const localKV = loadLocalStoreSettingsKV();
    for (const key of OFFICIAL_STORE_SETTING_KEYS) {
      const record = localKV[key];
      if (record && record.value !== undefined) {
        settings = applyStoreSettingKeyValueToCheckoutSettings(settings, key, record.value);
      }
    }
  } catch {
    // Continuar
  }

  return settings;
}

/**
 * Genera un código único legible para el pedido (Ej: SL-2026-482910)
 */
export function generateUniqueOrderCode(): string {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `SL-${year}-${randomDigits}`;
}

/**
 * Crea el pedido al finalizar el checkout, asigna vencimiento predeterminado de 72 horas
 * y guarda instantáneas históricas de cada producto y su precio en Soles (PEN / S/).
 */
export async function createOrderFromCheckout(
  input: CreateOrderFromCheckoutInput
): Promise<{ order: OrderWithDetails | null; error: string | null }> {
  if (!input.cartItems || input.cartItems.length === 0) {
    return { order: null, error: 'Tu carrito está vacío. Agrega al menos un producto para continuar.' };
  }

  if (!input.customerFullName.trim() || !input.customerEmail.trim() || !input.customerPhone.trim()) {
    return {
      order: null,
      error: 'Completa tus datos obligatorios (Nombre, Correo electrónico y Teléfono WhatsApp).',
    };
  }

  const settings = await getCheckoutStoreSettings();
  const expirationHours = settings.orderExpirationHours || 72;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

  const orderId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ord-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const orderCode = generateUniqueOrderCode();

  const subtotalPen = Number(Math.max(0, input.grossSubtotalPen).toFixed(2));
  const discountPen = Number(Math.max(0, input.discountPen).toFixed(2));
  const totalNetPen = Number(Math.max(0, input.netTotalPen).toFixed(2));

  // Si todo el pedido es S/ 0.00 (ej. solo productos FREE), nace con pago verificado S/ 0.00
  const isZeroCostOrder = totalNetPen === 0;
  const initialOrderStatus: OrderStatus = isZeroCostOrder ? 'PAGO_VERIFICADO' : 'PENDIENTE_PAGO';

  const orderItems: OrderItem[] = input.cartItems.map((cartItem, idx) => {
    const itemId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `item-${Date.now()}-${idx}`;

    const unitPricePen = Number(cartItem.unitPricePen.toFixed(2));
    const discountAppliedPen = Number(cartItem.couponDiscountAllocatedPen.toFixed(2));
    const finalItemPricePen = Number(cartItem.netItemPricePen.toFixed(2));
    const isItemFree = finalItemPricePen === 0;

    return {
      id: itemId,
      order_id: orderId,
      product_id: cartItem.product.id,
      product_name_snapshot: cartItem.product.name,
      product_version_snapshot: cartItem.product.current_version || 'v1.0',
      product_modalidad_snapshot: cartItem.product.modalidad,
      unit_price_pen: unitPricePen,
      discount_applied_pen: discountAppliedPen,
      final_item_price_pen: finalItemPricePen,
      allocated_paid_pen: 0,
      item_balance_due_pen: finalItemPricePen,
      is_fully_paid: isItemFree,
      payment_status: isItemFree ? 'PAGADO_TOTAL' : 'SIN_PAGO',
      delivery_status: isItemFree ? 'LISTO_ENTREGA' : 'PENDIENTE',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  });

  const notesBlock = [
    input.appliedCoupon ? `Cupón aplicado: ${input.appliedCoupon.code}` : null,
    input.customerNotes?.trim() ? input.customerNotes.trim() : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const newOrder: Order = {
    id: orderId,
    order_code: orderCode,
    customer_id: input.customerId,
    buyer_name: input.customerFullName.trim(),
    buyer_email: input.customerEmail.trim().toLowerCase(),
    buyer_phone: input.customerPhone.trim(),
    buyer_document_type: input.customerDocumentType || null,
    buyer_document_number: input.customerDocumentNumber || null,
    payment_method_selected: input.preferredPaymentMethod,
    notes: notesBlock || null,
    subtotal_pen: subtotalPen,
    discount_pen: discountPen,
    total_net_pen: totalNetPen,
    total_paid_verified_pen: 0,
    balance_due_pen: totalNetPen,
    status: initialOrderStatus,
    expires_at: expiresAt.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    items: orderItems,
  };

  if (isSupabaseConfigured()) {
    try {
      const { error: orderErr } = await supabase.from('orders').insert({
        id: newOrder.id,
        order_code: newOrder.order_code,
        customer_id: newOrder.customer_id,
        customer_email_snapshot: newOrder.buyer_email,
        customer_phone_snapshot: newOrder.buyer_phone,
        customer_name_snapshot: newOrder.buyer_name,
        currency_code: 'PEN',
        subtotal_gross_pen: newOrder.subtotal_pen,
        discount_total_pen: newOrder.discount_pen,
        total_net_pen: newOrder.total_net_pen,
        total_paid_verified_pen: 0,
        balance_due_pen: newOrder.balance_due_pen,
        coupon_id: input.appliedCoupon?.id || null,
        coupon_code_snapshot: input.appliedCoupon?.code || null,
        status: newOrder.status,
        expires_at: newOrder.expires_at,
        customer_notes: newOrder.notes,
      });

      if (!orderErr) {
        await supabase.from('order_items').insert(
          orderItems.map((item) => ({
            id: item.id,
            order_id: item.order_id,
            product_id: item.product_id,
            product_name_snapshot: item.product_name_snapshot,
            product_version_snapshot: item.product_version_snapshot,
            product_modalidad_snapshot: item.product_modalidad_snapshot,
            quantity: 1,
            unit_price_pen: item.unit_price_pen,
            discount_applied_pen: item.discount_applied_pen,
            final_item_price_pen: item.final_item_price_pen,
            allocated_paid_pen: item.allocated_paid_pen,
            item_balance_due_pen: item.item_balance_due_pen,
            is_fully_paid: item.is_fully_paid,
            payment_status: item.payment_status,
            delivery_status: item.delivery_status,
          }))
        );
      }
    } catch {
      // Continuar con persistencia local garantizada
    }
  }

  const currentLocal = loadLocalOrders();
  saveLocalOrders([newOrder, ...currentLocal]);

  return {
    order: {
      ...newOrder,
      items: orderItems,
      payments: [],
    },
    error: null,
  };
}

/**
 * Obtiene todos los pedidos de un cliente (por customer_id o correo electrónico),
 * evaluando vencimiento automático tras 72 horas sin perder pagos previos ni saldos.
 */
export async function getOrdersByCustomer(
  customerId: string,
  customerEmail?: string
): Promise<OrderWithDetails[]> {
  const normalizedEmail = customerEmail?.trim().toLowerCase();
  const localOrders = loadLocalOrders();
  const localPayments = loadLocalPayments();

  let mergedOrders: Order[] = [...localOrders];

  if (isSupabaseConfigured() && customerId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const byId = new Map<string, Order>();
        for (const dbOrder of data as Order[]) {
          byId.set(dbOrder.id, dbOrder);
        }
        for (const loc of localOrders) {
          if (!byId.has(loc.id)) {
            byId.set(loc.id, loc);
          }
        }
        mergedOrders = Array.from(byId.values());
      }
    } catch {
      // Usar copia local
    }
  }

  const filtered = mergedOrders.filter((ord) => {
    if (ord.customer_id === customerId) return true;
    if (normalizedEmail && ord.buyer_email?.toLowerCase() === normalizedEmail) {
      return true;
    }
    return false;
  });

  let hasChanges = false;
  const updatedAll = mergedOrders.map((ord) => {
    const evaluated = evaluateOrderExpiration(ord);
    if (evaluated.status !== ord.status) {
      hasChanges = true;
    }
    return evaluated;
  });

  if (hasChanges) {
    saveLocalOrders(updatedAll);
  }

  return filtered
    .map((ord) => {
      const evaluated = evaluateOrderExpiration(ord);
      const orderPayments = localPayments
        .filter((p) => p.order_id === evaluated.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        ...evaluated,
        items: evaluated.items || [],
        payments: orderPayments,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Obtiene el detalle completo de un pedido por su ID o por su order_code
 */
export async function getOrderById(orderIdOrCode: string): Promise<OrderWithDetails | null> {
  if (!orderIdOrCode) return null;

  const localOrders = loadLocalOrders();
  const localPayments = loadLocalPayments();

  let found = localOrders.find(
    (o) =>
      o.id === orderIdOrCode ||
      o.order_code.toUpperCase() === orderIdOrCode.trim().toUpperCase()
  );

  if (!found && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .or(`id.eq.${orderIdOrCode},order_code.eq.${orderIdOrCode.trim().toUpperCase()}`)
        .maybeSingle();

      if (!error && data) {
        found = data as Order;
      }
    } catch {
      // Ignorar error de red
    }
  }

  if (!found) return null;

  const evaluated = evaluateOrderExpiration(found);
  if (evaluated.status !== found.status) {
    const updatedList = localOrders.map((o) => (o.id === evaluated.id ? evaluated : o));
    saveLocalOrders(updatedList);
  }

  let paymentsForOrder = localPayments.filter((p) => p.order_id === evaluated.id);

  if (isSupabaseConfigured()) {
    try {
      const { data: dbPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', evaluated.id)
        .order('created_at', { ascending: false });

      if (Array.isArray(dbPayments) && dbPayments.length > 0) {
        const mapPay = new Map<string, Payment>();
        for (const p of dbPayments as Payment[]) mapPay.set(p.id, p);
        for (const p of paymentsForOrder) {
          if (!mapPay.has(p.id)) mapPay.set(p.id, p);
        }
        paymentsForOrder = Array.from(mapPay.values());
      }
    } catch {
      // Continuar con pagos locales
    }
  }

  paymentsForOrder.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  let localDeliveries: Delivery[] = [];

  try {
    const rawDeliv = localStorage.getItem('smartlab_deliveries_v1');
    if (rawDeliv) {
      const parsedDeliv = JSON.parse(rawDeliv);
      if (Array.isArray(parsedDeliv)) {
        localDeliveries = parsedDeliv;
      }
    }
  } catch {
    // Ignorar error de lectura
  }

  const sanitizedItems = (evaluated.items || []).map((item) => {
    const matchingDelivery =
      localDeliveries.find((d) => d.order_item_id === item.id) || item.delivery;

    const isAuthorizedToReadDelivery =
      evaluated.status !== 'CANCELADO' &&
      evaluated.status !== 'REEMBOLSADO' &&
      item.is_fully_paid === true &&
      item.payment_status === 'PAGADO_TOTAL' &&
      matchingDelivery &&
      !matchingDelivery.is_revoked &&
      matchingDelivery.delivery_status === 'ENTREGADO';

    return {
      ...item,
      delivery: isAuthorizedToReadDelivery ? matchingDelivery : undefined,
    };
  });

  return {
    ...evaluated,
    items: sanitizedItems,
    payments: paymentsForOrder,
  };
}

/**
 * Registra un comprobante de pago enviado por el cliente.
 * REGLA ESTRICTA (docs/05_PEDIDOS_PAGOS.md Sección 3.2):
 * - El comprobante nace en estado `EN_REVISION` con `amount_verified_pen = 0`.
 * - El pedido pasa a `PAGO_EN_REVISION` (si estaba en `PENDIENTE_PAGO`, `OBSERVADO` o `VENCIDO`).
 * - Un comprobante en revisión NUNCA incrementa `total_paid_verified_pen` ni `allocated_paid_pen`
 *   y NO habilita descargas hasta que el administrador lo verifique manualmente en el Sprint 09.
 */
export async function submitPaymentReceipt(
  input: SubmitPaymentReceiptInput
): Promise<{ payment: Payment | null; order: OrderWithDetails | null; error: string | null }> {
  const existingOrder = await getOrderById(input.orderId);
  if (!existingOrder) {
    return { payment: null, order: null, error: 'No se encontró el pedido especificado.' };
  }

  if (existingOrder.status === 'CANCELADO' || existingOrder.status === 'REEMBOLSADO') {
    return {
      payment: null,
      order: existingOrder,
      error: `No se pueden registrar nuevos comprobantes para un pedido en estado ${existingOrder.status}.`,
    };
  }

  const reportedPen = Number(input.amountReportedPen);
  if (!Number.isFinite(reportedPen) || reportedPen <= 0) {
    return {
      payment: null,
      order: existingOrder,
      error: 'Ingresa un monto reportado válido mayor a S/ 0.00.',
    };
  }

  const nowIso = new Date().toISOString();
  const paymentId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newPayment: Payment = {
    id: paymentId,
    order_id: existingOrder.id,
    payment_method: input.paymentMethod,
    operation_number: input.operationNumber?.trim() || null,
    origin_phone: input.originPhone?.trim() || existingOrder.buyer_phone || null,
    bank_name: input.bankName?.trim() || null,
    receipt_image_path: input.receiptImagePath || null,
    receipt_image_url: input.receiptImageUrl || input.receiptImagePath || null,
    amount_reported_pen: Number(reportedPen.toFixed(2)),
    amount_verified_pen: 0, // REGLA: 0 hasta verificación manual administrativa
    verification_status: 'EN_REVISION',
    verified_by: null,
    verified_at: null,
    rejection_reason: input.customerComment?.trim()
      ? `Nota cliente: ${input.customerComment.trim()}`
      : null,
    created_at: nowIso,
    updated_at: nowIso,
    allocations: [],
  };

  const nextOrderStatus: OrderStatus =
    existingOrder.status === 'COMPLETADO' || existingOrder.status === 'PAGO_VERIFICADO'
      ? existingOrder.status
      : 'PAGO_EN_REVISION';

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('payments').insert({
        id: newPayment.id,
        order_id: newPayment.order_id,
        registered_by: input.registeredByUserId || existingOrder.customer_id,
        payment_method: newPayment.payment_method,
        currency_code: 'PEN',
        amount_reported_pen: newPayment.amount_reported_pen,
        amount_verified_pen: 0,
        operation_number: newPayment.operation_number,
        origin_phone: newPayment.origin_phone,
        bank_name: newPayment.bank_name,
        receipt_image_path: newPayment.receipt_image_path || newPayment.receipt_image_url,
        verification_status: 'EN_REVISION',
      });

      await supabase
        .from('orders')
        .update({
          status: nextOrderStatus,
          updated_at: nowIso,
        })
        .eq('id', existingOrder.id);
    } catch {
      // Continuar con persistencia local
    }
  }

  const allPayments = loadLocalPayments();
  saveLocalPayments([newPayment, ...allPayments]);

  const allOrders = loadLocalOrders();
  const updatedOrders = allOrders.map((ord) =>
    ord.id === existingOrder.id
      ? {
          ...ord,
          status: nextOrderStatus,
          updated_at: nowIso,
        }
      : ord
  );
  saveLocalOrders(updatedOrders);

  const refreshedOrder = await getOrderById(existingOrder.id);

  return {
    payment: newPayment,
    order: refreshedOrder,
    error: null,
  };
}
