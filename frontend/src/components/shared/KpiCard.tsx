import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type KpiColor = 'blue' | 'green' | 'amber' | 'purple'

const colorMap: Record<KpiColor, { icon: string; badge: string; trend: string }> = {
  blue:   { icon: 'bg-blue-500/15 text-blue-400',   badge: 'bg-blue-500/10 text-blue-400',   trend: 'text-blue-400' },
  green:  { icon: 'bg-emerald-500/15 text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400', trend: 'text-emerald-400' },
  amber:  { icon: 'bg-amber-500/15 text-amber-400', badge: 'bg-amber-500/10 text-amber-400', trend: 'text-amber-400' },
  purple: { icon: 'bg-violet-500/15 text-violet-400', badge: 'bg-violet-500/10 text-violet-400', trend: 'text-violet-400' },
}

interface KpiCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendLabel?: string
  color?: KpiColor
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = 'blue',
}: KpiCardProps) {
  const c = colorMap[color]

  return (
    <div
      className={cn(
        'rounded-xl p-5 border transition-colors',
        'bg-[var(--bg-card)] border-[var(--border)]',
        'hover:bg-[var(--bg-hover)]',
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.icon)}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={cn('text-xs font-medium px-2 py-1 rounded-md', c.badge)}>
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--text-1)] mb-1">{value}</div>
      <div className="text-sm text-[var(--text-2)]">{title}</div>
      {trendLabel && (
        <div className={cn('text-xs mt-2', c.trend)}>{trendLabel}</div>
      )}
    </div>
  )
}
