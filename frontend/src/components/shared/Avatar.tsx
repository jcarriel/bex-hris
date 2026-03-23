import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

const colors = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-pink-600',
  'bg-teal-600',
]

function getColor(name: string) {
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeStyles[size], className)}
      />
    )
  }
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizeStyles[size],
        getColor(name),
        className,
      )}
    >
      {getInitials(name)}
    </div>
  )
}
