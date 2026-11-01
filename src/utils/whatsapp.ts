/**
 * SmartLab Store — Generador de Enlaces y Mensajes Preparados de WhatsApp
 * docs/05_PEDIDOS_PAGOS.md
 */

import { env } from '../config/env';
import { formatPEN } from './currency';

/**
 * Limpia y normaliza un número de teléfono peruano para WhatsApp (agregando código 51 si aplica)
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/\D/g, '');

  // Si tiene 9 dígitos y empieza en 9 (celular peruano estándar), anteponer 51
  if (digitsOnly.length === 9 && digitsOnly.startsWith('9')) {
    return `51${digitsOnly}`;
  }

  // Si ya tiene 11 dígitos y empieza en 519
  if (digitsOnly.length === 11 && digitsOnly.startsWith('519')) {
    return digitsOnly;
  }

  return digitsOnly;
}

export interface OrderWhatsAppParams {
  orderCode: string;
  buyerName: string;
  items: Array<{
    name: string;
    version?: string;
    price: number;
  }>;
  totalNetPen: number;
  paymentMethod: string;
  storeWhatsAppNumber?: string;
}

/**
 * Genera el mensaje estructurado de WhatsApp que el comprador envía a SmartLab Store con su comprobante
 */
export function buildOrderWhatsAppMessage(params: OrderWhatsAppParams): string {
  const { orderCode, buyerName, items, totalNetPen, paymentMethod } = params;

  const itemsList = items
    .map((item, idx) => `  ${idx + 1}. ${item.name}${item.version ? ` (${item.version})` : ''} — ${formatPEN(item.price)}`)
    .join('\n');

  return (
    `👋 *¡Hola SmartLab Store! Acabo de realizar un pedido en la tienda.*\n\n` +
    `📑 *Código de Pedido:* ${orderCode}\n` +
    `👤 *Cliente:* ${buyerName}\n` +
    `💳 *Método de Pago Elegido:* ${paymentMethod}\n\n` +
    `📦 *Productos:* \n${itemsList}\n\n` +
    `💰 *Total Neto a Pagar:* ${formatPEN(totalNetPen)}\n\n` +
    `📎 *Adjunto mi comprobante de pago para su verificación manual.*\n` +
    `Quedo atento a la confirmación y entrega de mis enlaces de descarga. ¡Gracias!`
  );
}

/**
 * Genera la URL completa de WhatsApp (`https://wa.me/...`) para el checkout
 */
export function buildOrderWhatsAppUrl(params: OrderWhatsAppParams): string {
  const targetNumber = sanitizeWhatsAppPhone(params.storeWhatsAppNumber || env.whatsappNumber);
  const message = buildOrderWhatsAppMessage(params);
  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Genera la URL de WhatsApp para consultas generales de soporte o cotización a medida
 */
export function buildSupportWhatsAppUrl(subject?: string): string {
  const targetNumber = sanitizeWhatsAppPhone(env.whatsappNumber);
  const text = subject
    ? `👋 Hola SmartLab Store, quisiera realizar una consulta sobre: *${subject}*.`
    : `👋 Hola SmartLab Store, quisiera solicitar información sobre sus herramientas digitales.`;

  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
}

export interface DeliveryWhatsAppParams {
  buyerPhone: string;
  buyerName: string;
  orderCode: string;
  productName: string;
  version: string;
  downloadLink: string;
}

/**
 * Genera el mensaje que el administrador envía al comprador para entregar el enlace individual
 */
export function buildDeliveryWhatsAppUrl(params: DeliveryWhatsAppParams): string {
  const { buyerPhone, buyerName, orderCode, productName, version, downloadLink } = params;
  const targetNumber = sanitizeWhatsAppPhone(buyerPhone);

  const message =
    `✅ *¡Pago verificado al 100%! Entrega Digital SmartLab Store*\n\n` +
    `Hola *${buyerName}*, confirmamos el pago total de tu producto en el pedido *#${orderCode}*.\n\n` +
    `📦 *Producto:* ${productName} (${version})\n` +
    `🔗 *Enlace de Descarga:* ${downloadLink}\n\n` +
    `⚠️ *Importante:* Guarda este enlace. Recuerda que los productos digitales entregados no son reembolsables.\n\n` +
    `¡Gracias por confiar en SmartLab Store!`;

  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
}
