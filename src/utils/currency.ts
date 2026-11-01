/**
 * SmartLab Store — Utilidad de Formato Monetario en Soles Peruanos (PEN / S/)
 * Garantiza formato estricto de moneda oficial para Perú sin ambigüedades.
 */

export interface FormatPENOptions {
  showFreeLabel?: boolean; // Si es 0.00, muestra "S/ 0.00 (GRATIS)"
  includeSymbol?: boolean; // Por defecto true
}

/**
 * Formatea un importe numérico a Soles Peruanos (PEN / S/)
 * @example formatPEN(49) => "S/ 49.00"
 * @example formatPEN(0, { showFreeLabel: true }) => "S/ 0.00 (GRATIS)"
 */
export function formatPEN(amount: number | null | undefined, options: FormatPENOptions = {}): string {
  const { showFreeLabel = false, includeSymbol = true } = options;

  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? 'S/ 0.00' : '0.00';
  }

  const rounded = Number(Math.round(Number(amount + 'e2')) + 'e-2');

  if (rounded === 0 && showFreeLabel) {
    return 'S/ 0.00 (GRATIS)';
  }

  const formattedNumber = rounded.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return includeSymbol ? `S/ ${formattedNumber}` : formattedNumber;
}

export const formatCurrencyPEN = formatPEN;


/**
 * Calcula el porcentaje entero de descuento entre precio regular y precio de oferta
 * @example calculateDiscountPercentage(65, 49) => 25 (-25%)
 */
export function calculateDiscountPercentage(regularPrice: number, salePrice: number): number {
  if (!regularPrice || regularPrice <= 0 || !salePrice || salePrice >= regularPrice) {
    return 0;
  }
  const discount = ((regularPrice - salePrice) / regularPrice) * 100;
  return Math.round(discount);
}

/**
 * Parsea una cadena de texto a un valor numérico seguro en Soles
 */
export function parsePEN(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
