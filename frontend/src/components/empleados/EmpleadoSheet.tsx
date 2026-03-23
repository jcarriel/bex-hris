import { cn } from '@/lib/utils'

interface EmpleadoSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function EmpleadoSheet({ open, title, onClose, children }: EmpleadoSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-2xl flex flex-col shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-base font-semibold text-[var(--text-1)]">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </>
  )
}
