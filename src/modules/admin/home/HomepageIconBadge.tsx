import React from 'react';
import {
  ShieldCheck,
  MessageCircle,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Table,
  Monitor,
  Smartphone,
  Cpu,
  FolderKanban,
  Layers,
  Flame,
  Award,
  Gift,
  Wrench,
  Clock,
  CheckCircle2,
  Zap,
  Lock,
  Globe,
  Code2,
  BarChart3,
  Database,
  Headphones,
} from 'lucide-react';
import { HomepageAllowedLucideIcon } from '../../../types/homepage.types';

const LUCIDE_ICON_MAP: Record<
  HomepageAllowedLucideIcon,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  ShieldCheck,
  MessageCircle,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  Table,
  Monitor,
  Smartphone,
  Cpu,
  FolderKanban,
  Layers,
  Flame,
  Award,
  Gift,
  Wrench,
  Clock,
  CheckCircle2,
  Zap,
  Lock,
  Globe,
  Code2,
  BarChart3,
  Database,
  Headphones,
};

interface HomepageIconBadgeProps {
  iconName?: string | null;
  iconColorHex?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Renderiza el contenedor visual del icono de un Beneficio (`BENEFIT_ITEM`) o Bloque Informativo (`INFO_CARD`).
 * REGLA ESTRICTA: Solo personaliza el color del icono mediante `style={{ color: resolvedHex }}`.
 * Conserva intacto el fondo existente de la tarjeta/contenedor (`bg-slate-50 border border-slate-200`).
 */
export const HomepageIconBadge: React.FC<HomepageIconBadgeProps> = ({
  iconName,
  iconColorHex,
  size = 'md',
  className = '',
}) => {
  const cleanName = (iconName ?? 'ShieldCheck').trim() as HomepageAllowedLucideIcon;
  const IconComponent = LUCIDE_ICON_MAP[cleanName] || ShieldCheck;

  const isValidHex =
    typeof iconColorHex === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(iconColorHex.trim());
  const resolvedHex = isValidHex ? iconColorHex!.trim().toUpperCase() : '#0A68FF';

  const containerSizeClass =
    size === 'sm'
      ? 'w-9 h-9 rounded-lg'
      : size === 'lg'
        ? 'w-12 h-12 rounded-xl'
        : 'w-11 h-11 rounded-xl';

  const iconSizeClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div
      className={`${containerSizeClass} bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 ${className}`}
    >
      <IconComponent className={iconSizeClass} style={{ color: resolvedHex }} />
    </div>
  );
};
