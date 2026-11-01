import { supabase, isSupabaseConfigured } from '../config/supabaseClient';
import { Coupon } from '../types/order.types';
import { formatPEN } from '../utils/currency';

/**
 * Cupones semilla determinísticos en Soles (PEN / S/) para validación local
 * cuando Supabase aún tiene credenciales de ejemplo en .env.
 */
export const SEED_COUPONS: Coupon[] = [
  {
    id: 'coup-smartlab15',
    code: 'SMARTLAB15',
    description: '15% de descuento en compras desde S/ 50.00',
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    minimum_order_pen: 50,
    is_active: true,
    expires_at: '2027-12-31T23:59:59Z',
    usage_limit: 500,
    current_usage_count: 42,
  },
  {
    id: 'coup-soles20',
    code: 'SOLES20',
    description: 'S/ 20.00 de descuento directo en pedidos desde S/ 100.00',
    discount_type: 'FIXED_AMOUNT',
    discount_value: 20,
    minimum_order_pen: 100,
    is_active: true,
    expires_at: '2027-12-31T23:59:59Z',
    usage_limit: 200,
    current_usage_count: 19,
  },
  {
    id: 'coup-bienvenido10',
    code: 'BIENVENIDO10',
    description: '10% de descuento de bienvenida sin monto mínimo de compra',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    minimum_order_pen: 0,
    is_active: true,
    expires_at: '2027-12-31T23:59:59Z',
    usage_limit: null,
    current_usage_count: 85,
  },
  {
    id: 'coup-expirado',
    code: 'EXPIRADO2025',
    description: 'Cupón histórico vencido para pruebas de validación',
    discount_type: 'PERCENTAGE',
    discount_value: 25,
    minimum_order_pen: 0,
    is_active: true,
    expires_at: '2025-01-01T00:00:00Z',
    usage_limit: 100,
    current_usage_count: 10,
  },
  {
    id: 'coup-agotado',
    code: 'AGOTADO50',
    description: 'Cupón con límite de uso alcanzado para pruebas',
    discount_type: 'FIXED_AMOUNT',
    discount_value: 50,
    minimum_order_pen: 80,
    is_active: true,
    expires_at: '2027-12-31T23:59:59Z',
    usage_limit: 25,
    current_usage_count: 25,
  },
];

export interface CouponValidationResult {
  valid: boolean;
  coupon: Coupon | null;
  discountPen: number;
  netTotalPen: number;
  error: string | null;
}

/**
 * Calcula el importe exacto de descuento en Soles (PEN / S/) garantizando
 * que nunca supere el subtotal bruto ni genere saldos negativos (Sprint 06).
 */
export function calculateCouponDiscountPEN(
  coupon: Coupon,
  grossSubtotalPen: number
): number {
  const safeGross = Math.max(0, Number(grossSubtotalPen.toFixed(2)));
  if (safeGross <= 0) return 0;

  let rawDiscount = 0;
  if (coupon.discount_type === 'PERCENTAGE') {
    const pct = Math.min(100, Math.max(0, coupon.discount_value));
    rawDiscount = Number(((safeGross * pct) / 100).toFixed(2));
  } else {
    rawDiscount = Math.max(0, Number(coupon.discount_value.toFixed(2)));
  }

  // Regla crítica Sprint 06: El descuento jamás puede exceder el subtotal bruto
  return Math.min(safeGross, rawDiscount);
}

/**
 * Mapea una fila de la tabla `coupons` de Supabase al contrato tipado `Coupon`.
 */
function mapSupabaseCouponRow(row: Record<string, unknown>): Coupon {
  const rawType = String(row.discount_type || 'PERCENTAGE').toUpperCase();
  const discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' =
    rawType === 'PORCENTAJE' || rawType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT';

  return {
    id: String(row.id),
    code: String(row.code || '').toUpperCase().trim(),
    description: row.description ? String(row.description) : null,
    discount_type: discountType,
    discount_value: Number(row.discount_value ?? 0),
    minimum_order_pen: Number(row.min_purchase_amount ?? row.minimum_order_pen ?? 0),
    is_active: Boolean(row.is_active ?? true),
    expires_at: row.valid_until
      ? String(row.valid_until)
      : row.expires_at
        ? String(row.expires_at)
        : null,
    usage_limit:
      row.usage_limit !== null && row.usage_limit !== undefined
        ? Number(row.usage_limit)
        : null,
    current_usage_count: Number(row.times_used ?? row.current_usage_count ?? 0),
  };
}

export const LOCAL_ADMIN_COUPONS_KEY = 'smartlab_admin_coupons_v1';

export function loadCouponsBase(): Coupon[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_COUPONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Coupon[];
      }
    }
  } catch {
    // Fallback
  }
  return SEED_COUPONS;
}

/**
 * Busca un cupón por su código en Supabase o en el catálogo administrativo/semilla local.
 */
export async function findCouponByCode(rawCode: string): Promise<Coupon | null> {
  const normalizedCode = rawCode.trim().toUpperCase();
  if (!normalizedCode) return null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', normalizedCode)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseCouponRow(data as Record<string, unknown>);
      }
    } catch {
      // Fallback seguro a los cupones locales
    }
  }

  const allCoupons = loadCouponsBase();
  const found = allCoupons.find((c) => c.code.toUpperCase() === normalizedCode);
  return found || null;
}

/**
 * Valida integralmente un cupón de descuento verificando:
 * 1. Existencia y estado activo
 * 2. Fecha de expiración (`expires_at`)
 * 3. Límite máximo de usos (`usage_limit` vs `current_usage_count`)
 * 4. Monto mínimo de compra en Soles (`minimum_order_pen`)
 * 5. Subtotal mayor a S/ 0.00 y cálculo sin saldos negativos
 */
export async function validateCouponForSubtotal(
  rawCode: string,
  grossSubtotalPen: number
): Promise<CouponValidationResult> {
  const cleanCode = rawCode.trim().toUpperCase();

  if (!cleanCode) {
    return {
      valid: false,
      coupon: null,
      discountPen: 0,
      netTotalPen: grossSubtotalPen,
      error: 'Ingresa un código de cupón para validar.',
    };
  }

  if (grossSubtotalPen <= 0) {
    return {
      valid: false,
      coupon: null,
      discountPen: 0,
      netTotalPen: 0,
      error: 'Los cupones de descuento solo aplican a carritos con importe mayor a S/ 0.00.',
    };
  }

  const coupon = await findCouponByCode(cleanCode);

  if (!coupon) {
    return {
      valid: false,
      coupon: null,
      discountPen: 0,
      netTotalPen: grossSubtotalPen,
      error: `El cupón "${cleanCode}" no existe. Prueba con SMARTLAB15, SOLES20 o BIENVENIDO10.`,
    };
  }

  if (!coupon.is_active) {
    return {
      valid: false,
      coupon: null,
      discountPen: 0,
      netTotalPen: grossSubtotalPen,
      error: `El cupón "${coupon.code}" se encuentra inactivo.`,
    };
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return {
      valid: false,
      coupon: null,
      discountPen: 0,
      netTotalPen: grossSubtotalPen,
      error: `El cupón "${coupon.code}" ha expirado el ${new Date(
        coupon.expires_at
      ).toLocaleDateString('es-PE')}.`,
    };
  }

  if (coupon.usage_limit !== null && coupon.current_usage_count >= coupon.usage_limit) {
    return {
      valid: false,
      coupon: null,
      discountPen: 0,
      netTotalPen: grossSubtotalPen,
      error: `El cupón "${coupon.code}" ha alcanzado su límite máximo de usos permitidos.`,
    };
  }

  if (grossSubtotalPen < coupon.minimum_order_pen) {
    return {
      valid: false,
      coupon: null,
      discountPen: 0,
      netTotalPen: grossSubtotalPen,
      error: `El cupón "${coupon.code}" requiere una compra mínima de ${formatPEN(
        coupon.minimum_order_pen
      )} (tu subtotal actual es ${formatPEN(grossSubtotalPen)}).`,
    };
  }

  const discountPen = calculateCouponDiscountPEN(coupon, grossSubtotalPen);
  const netTotalPen = Math.max(0, Number((grossSubtotalPen - discountPen).toFixed(2)));

  return {
    valid: true,
    coupon,
    discountPen,
    netTotalPen,
    error: null,
  };
}
