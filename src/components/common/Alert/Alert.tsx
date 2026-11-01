/**
 * SmartLab Store — Componente Reutilizable Alert
 * docs/08_PLAN_SPRINTS.md (Sprint 04)
 */

import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const ALERT_STYLES: Record<AlertVariant, { box: string; icon: React.ReactNode }> = {
  info: {
    box: 'bg-blue-50/80 border-blue-200 text-blue-900',
    icon: <Info className="w-5 h-5 text-[#0A68FF] shrink-0" />,
  },
  success: {
    box: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
  },
  warning: {
    box: 'bg-amber-50/80 border-amber-200 text-amber-900',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  },
  error: {
    box: 'bg-red-50/80 border-red-200 text-red-900',
    icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  className = '',
}) => {
  const style = ALERT_STYLES[variant];

  return (
    <div
      className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${style.box} ${className}`}
      role="alert"
    >
      <div className="mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold mb-1">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
