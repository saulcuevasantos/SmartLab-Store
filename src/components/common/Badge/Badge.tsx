/**
 * SmartLab Store — Componente Reutilizable Badge (Diseño Techoze-04)
 * docs/06_DISENO_VISUAL_UX_UI.md (Sección 1.1 y 4.1) & docs/08_PLAN_SPRINTS.md (Sprint 04)
 *
 * Soporta modalidades de producto (FREE #10B981, PRO #6366F1, PERSONALIZADO #F59E0B),
 * descuentos (#FF6B00) y estados de pedidos, pagos y entregas.
 */

import React from 'react';
import { ProductModalidad } from '../../../types/catalog.types';
import { OrderStatus } from '../../../types/order.types';

export type BadgeVariant =
  | 'FREE'
  | 'PRO'
  | 'PERSONALIZADO'
  | 'discount'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'dark';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

const BADGE_STYLES: Record<BadgeVariant, string> = {
  FREE: 'bg-[#10B981] text-white',
  PRO: 'bg-[#6366F1] text-white',
  PERSONALIZADO: 'bg-[#F59E0B] text-white',
  discount: 'bg-[#FF6B00] text-white',
  primary: 'bg-blue-50 text-[#0A68FF] border border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  dark: 'bg-[#0F172A] text-white',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  className = '',
  children,
}) => {
  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] sm:text-[11px] rounded-[4px]'
      : 'px-2.5 py-1 text-xs rounded-[6px]';

  return (
    <span
      className={[
        'inline-flex items-center justify-center font-bold uppercase tracking-wider leading-tight whitespace-nowrap',
        BADGE_STYLES[variant],
        sizeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
};

/**
 * Helper para renderizar automáticamente el Badge de modalidad de un producto
 */
export const ProductModalidadBadge: React.FC<{ modalidad: ProductModalidad }> = ({
  modalidad,
}) => {
  return <Badge variant={modalidad}>{modalidad}</Badge>;
};

/**
 * Helper para mapear el estado de un pedido al estilo visual correspondiente
 */
export function getOrderStatusBadgeVariant(status: OrderStatus): BadgeVariant {
  switch (status) {
    case 'COMPLETADO':
    case 'PAGO_VERIFICADO':
      return 'success';
    case 'PAGO_PARCIAL':
    case 'PAGO_EN_REVISION':
      return 'primary';
    case 'PENDIENTE_PAGO':
    case 'OBSERVADO':
      return 'warning';
    case 'VENCIDO':
    case 'CANCELADO':
    case 'REEMBOLSADO':
      return 'danger';
    default:
      return 'neutral';
  }
}
