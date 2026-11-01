/**
 * SmartLab Store — Componente Reutilizable Loader
 * docs/08_PLAN_SPRINTS.md (Sprint 04)
 */

import React from 'react';

export interface LoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const LOADER_SIZES = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-11 h-11 border-4',
};

export const Loader: React.FC<LoaderProps> = ({
  label = 'Cargando...',
  size = 'md',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div
        className={`${LOADER_SIZES[size]} border-[#0A68FF] border-t-transparent rounded-full animate-spin`}
        aria-hidden="true"
      />
      {label && <span className="text-xs sm:text-sm font-medium text-slate-600">{label}</span>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center w-full">{content}</div>
    );
  }

  return content;
};
