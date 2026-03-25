import { useState } from 'react'
import {
  LayoutDashboard, Users, Heart, CheckSquare, Bell,
  ChevronRight, ChevronLeft, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'

const STEPS = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Resumen completo en un vistazo: métricas clave, empleados recientes, contratos por vencer, próximos eventos y tus tareas pendientes.',
    color: 'bg-blue-500/15 text-blue-400',
  },
  {
    icon: Users,
    title: 'Empleados',
    desc: 'Gestiona todo el personal: crea perfiles, edita información, consulta el historial de cambios de cargo y salario, y revisa contratos.',
    color: 'bg-emerald-500/15 text-emerald-400',
  },
  {
    icon: Heart,
    title: 'Bienestar',
    desc: 'Administra vacaciones y permisos del equipo. Ve el calendario de disponibilidad, valida saldos automáticamente y aprueba solicitudes.',
    color: 'bg-rose-500/15 text-rose-400',
  },
  {
    icon: CheckSquare,
    title: 'Tareas',
    desc: 'Crea y asigna tareas con vista Kanban. Usa el filtro "Mis tareas" para enfocarte en lo que te corresponde y da seguimiento por estado.',
    color: 'bg-violet-500/15 text-violet-400',
  },
  {
    icon: Bell,
    title: 'Notificaciones y perfil',
    desc: 'Recibe alertas de cumpleaños, contratos por vencer y aprobaciones en la campana. Haz clic en tu avatar para personalizar colores, tema y fuente.',
    color: 'bg-amber-500/15 text-amber-400',
  },
]

export function WelcomeTour() {
  const [step, setStep] = useState(0)
  const setTourSeen = useUiStore((s) => s.setTourSeen)

  const dismiss = () => setTourSeen(true)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Card */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={14} />
          </button>

          {/* Label */}
          <p className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider mb-4 text-center">
            Bienvenido a BEX HRIS
          </p>

          {/* Icon */}
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4', current.color)}>
            <Icon size={28} />
          </div>

          {/* Text */}
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-[var(--text-1)] mb-2">{current.title}</h2>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">{current.desc}</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === step
                    ? 'w-4 h-2 bg-[var(--accent)]'
                    : 'w-2 h-2 hover:opacity-80',
                )}
                style={{ backgroundColor: i === step ? undefined : 'var(--border)' }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border text-sm text-[var(--text-2)] hover:bg-[var(--bg-hover)] transition-colors"
                style={{ borderColor: 'var(--border)' }}
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setStep((s) => s + 1)}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {isLast ? (
                'Comenzar'
              ) : (
                <>
                  <span>Siguiente</span>
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
