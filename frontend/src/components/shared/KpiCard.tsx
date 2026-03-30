import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type KpiColor = 'blue' | 'green' | 'amber' | 'purple' | 'rose'

const colorMap: Record<KpiColor, { border: string; icon: string; text: string; progress: string }> = {
  blue:   { border: 'border-l-blue-400',    icon: 'bg-blue-500/10 text-blue-500',    text: 'text-blue-500',    progress: 'bg-blue-400' },
  green:  { border: 'border-l-emerald-400', icon: 'bg-emerald-500/10 text-emerald-500', text: 'text-emerald-500', progress: 'bg-emerald-400' },
  amber:  { border: 'border-l-amber-400',   icon: 'bg-amber-500/10 text-amber-500',  text: 'text-amber-500',  progress: 'bg-amber-400' },
  purple: { border: 'border-l-violet-400',  icon: 'bg-violet-500/10 text-violet-500', text: 'text-violet-500', progress: 'bg-violet-400' },
  rose:   { border: 'border-l-rose-400',    icon: 'bg-rose-500/10 text-rose-500',    text: 'text-rose-500',    progress: 'bg-rose-400' },
}

interface KpiCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendLabel?: string
  color?: KpiColor
  /** 0-100, shows a thin progress bar at the bottom */
  progress?: number
  onClick?: () => void
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
  progress,
  onClick,
}: KpiCardProps) {
  const c = colorMap[color]

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl p-5 border border-[var(--border)] border-l-4 transition-all overflow-hidden relative',
        'bg-[var(--bg-card)]',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        c.border,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', c.icon)}>
          <Icon size={17} />
        </div>
        {trend && (
          <span className={cn('text-xs font-semibold', c.text)}>{trend}</span>
        )}
      </div>

      <div className="text-[1.75rem] font-bold text-[var(--text-1)] leading-none mb-1">{value}</div>
      <div className="text-xs font-medium text-[var(--text-2)] mb-1">{title}</div>

      {trendLabel && (
        <div className={cn('text-[11px] mt-1', c.text)}>{trendLabel}</div>
      )}

      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', c.progress)}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
