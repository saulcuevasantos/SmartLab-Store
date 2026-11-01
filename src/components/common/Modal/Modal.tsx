/**
 * SmartLab Store — Componente Reutilizable Modal (Diseño Techoze-04)
 * docs/06_DISENO_VISUAL_UX_UI.md & docs/08_PLAN_SPRINTS.md (Sprint 04)
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const MODAL_WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-[2px] animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`bg-white border border-slate-200 rounded-xl w-full ${MODAL_WIDTHS[size]} max-h-[90vh] flex flex-col overflow-hidden shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-[#F8FAFC]">
            <div>
              {title && <h3 className="text-base sm:text-lg font-bold text-slate-900">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="touch-target -mr-2 -mt-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
              aria-label="Cerrar ventana modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
