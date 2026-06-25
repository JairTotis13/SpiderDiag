import { type ReactNode } from 'react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color?: 'primary' | 'red' | 'green' | 'orange' | 'blue' | 'purple';
  unit?: string;
  loading?: boolean;
  alert?: boolean;
}

const colorMap = {
  primary: {
    border: 'border-indigo-500/20 hover:border-indigo-500/40',
    bg: 'bg-indigo-500/[0.04]',
    icon: 'text-indigo-400',
    glow: 'shadow-indigo-500/5',
  },
  red: {
    border: 'border-red-500/20 hover:border-red-500/40',
    bg: 'bg-red-500/[0.04]',
    icon: 'text-red-400',
    glow: 'shadow-red-500/5',
  },
  green: {
    border: 'border-emerald-500/20 hover:border-emerald-500/40',
    bg: 'bg-emerald-500/[0.04]',
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/5',
  },
  orange: {
    border: 'border-amber-500/20 hover:border-amber-500/40',
    bg: 'bg-amber-500/[0.04]',
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/5',
  },
  blue: {
    border: 'border-sky-500/20 hover:border-sky-500/40',
    bg: 'bg-sky-500/[0.04]',
    icon: 'text-sky-400',
    glow: 'shadow-sky-500/5',
  },
  purple: {
    border: 'border-violet-500/20 hover:border-violet-500/40',
    bg: 'bg-violet-500/[0.04]',
    icon: 'text-violet-400',
    glow: 'shadow-violet-500/5',
  },
};

export function StatCard({
  title,
  value,
  icon,
  color = 'primary',
  unit,
  loading = false,
  alert = false,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-lg',
        colors.border,
        colors.bg,
        colors.glow,
        alert && 'animate-pulse'
      )}
    >
      {/* Subtle gradient bar at top */}
      <div className={clsx(
        'absolute left-0 right-0 top-0 h-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
        color === 'red' && 'bg-gradient-to-r from-red-500 to-rose-500',
        color === 'green' && 'bg-gradient-to-r from-emerald-500 to-teal-500',
        color === 'orange' && 'bg-gradient-to-r from-amber-500 to-orange-500',
        color === 'blue' && 'bg-gradient-to-r from-sky-500 to-blue-500',
        color === 'purple' && 'bg-gradient-to-r from-violet-500 to-purple-500',
        color === 'primary' && 'bg-gradient-to-r from-indigo-500 to-violet-500',
      )} />

      <div className="relative flex items-center justify-between">
        <div className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          {title}
        </div>
        <div className={clsx('transition-transform duration-200 group-hover:scale-110', colors.icon)}>
          {icon}
        </div>
      </div>
      <div className="relative mt-2 flex items-baseline gap-1">
        <span className="font-mono text-xl min-[400px]:text-2xl font-bold tabular-nums tracking-tight text-white">
          {loading ? (
            <span className="inline-flex gap-0.5">
              <span className="h-5 w-1.5 animate-pulse rounded-full bg-gray-700" />
              <span className="h-5 w-1.5 animate-pulse rounded-full bg-gray-700 [animation-delay:0.1s]" />
              <span className="h-5 w-1.5 animate-pulse rounded-full bg-gray-700 [animation-delay:0.2s]" />
            </span>
          ) : (
            value
          )}
        </span>
        {unit && (
          <span className="text-xs text-gray-600">{unit}</span>
        )}
      </div>
    </div>
  );
}
