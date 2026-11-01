/**
 * SmartLab Store — Componente Reutilizable Button (Diseño Techoze-04)
 * docs/06_DISENO_VISUAL_UX_UI.md & docs/08_PLAN_SPRINTS.md (Sprint 04)
 *
 * Garantiza área táctil mínima de 44x44px (48px en tamaño md/lg), feedback táctil
 * y variantes cromáticas oficiales (#0A68FF, #FF6B00, #0F172A, #25D366).
 */

import React from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'dark'
  | 'whatsapp'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#0A68FF] hover:bg-[#0854D1] text-white shadow-xs border border-transparent focus-visible:ring-[#0A68FF]',
  secondary:
    'bg-[#FF6B00] hover:bg-[#E05E00] text-white shadow-xs border border-transparent focus-visible:ring-[#FF6B00]',
  dark:
    'bg-[#0F172A] hover:bg-slate-800 text-white shadow-xs border border-transparent focus-visible:ring-slate-900',
  whatsapp:
    'bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs border border-transparent focus-visible:ring-[#25D366]',
  outline:
    'bg-white hover:bg-slate-50 text-[#1E293B] border border-[#CBD5E1] hover:border-[#0A68FF] hover:text-[#0A68FF] focus-visible:ring-[#0A68FF]',
  ghost:
    'bg-transparent hover:bg-slate-100 text-[#1E293B] border border-transparent focus-visible:ring-slate-400',
  danger:
    'bg-red-600 hover:bg-red-700 text-white shadow-xs border border-transparent focus-visible:ring-red-600',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-[6px]',
  md: 'min-h-[44px] sm:min-h-[46px] px-5 py-2.5 text-sm font-semibold rounded-[8px]',
  lg: 'min-h-[48px] sm:min-h-[52px] px-6 py-3 text-sm sm:text-base font-bold rounded-[8px]',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  ...rest
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center gap-2 transition-all duration-150',
        'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-60 disabled:pointer-events-none select-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {isLoading ? (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0 flex items-center">{rightIcon}</span>}
    </button>
  );
};
