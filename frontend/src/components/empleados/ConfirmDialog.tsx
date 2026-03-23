import { Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmColors =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-amber-500 hover:bg-amber-600 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />
      {/* Dialog */}
      <div
        className="relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <h3 className="text-base font-semibold text-[var(--text-1)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-2)] mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--border-color)] text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-60 ${confirmColors}`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
