import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Lock, User, Users, DollarSign, BarChart2, Shield } from 'lucide-react'
import { useAuthStore, firstAccessiblePath } from '@/store/authStore'
import { authService } from '@/services/auth.service'
import { cn } from '@/lib/utils'

const schema = z.object({
  username: z.string().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

const features = [
  { icon: Users,     label: 'Gestión de empleados',   desc: 'Información completa del personal' },
  { icon: DollarSign,label: 'Nómina y pagos',         desc: 'Control de salarios y liquidaciones' },
  { icon: BarChart2, label: 'Asistencia y horarios',  desc: 'Marcaciones y control de asistencia' },
  { icon: Shield,    label: 'Permisos y bienestar',   desc: 'Vacaciones, permisos y novedades' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const result = await authService.login(data)
      const userPerms = result.user.permissions || ['*']
      const userRol   = result.user.role || 'user'
      login(
        {
          id:          result.user.id,
          nombre:      result.user.nombre || result.user.username,
          username:    result.user.username,
          email:       result.user.email,
          rol:         userRol,
          roleId:      result.user.roleId,
          employeeId:  result.user.employeeId,
          permissions: userPerms,
        },
        result.token,
      )
      navigate(firstAccessiblePath(userPerms, userRol))
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Credenciales incorrectas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>

      {/* ── Left panel (branding) ────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-[0.06]"
          style={{ backgroundColor: 'var(--accent)' }} />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full opacity-[0.05]"
          style={{ backgroundColor: 'var(--accent)' }} />
        <div className="absolute top-1/3 right-0 w-48 h-48 rounded-full opacity-[0.04]"
          style={{ backgroundColor: 'var(--accent)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center font-bold text-white text-base">
            BX
          </div>
          <div>
            <div className="text-base font-bold text-[var(--text-1)]">BEX HRIS</div>
            <div className="text-[11px] text-[var(--text-3)]">Sistema de Gestión de RRHH</div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-[var(--text-1)] leading-tight mb-3">
              Gestiona tu equipo<br />
              <span style={{ color: 'var(--accent)' }}>de forma inteligente</span>
            </h1>
            <p className="text-[var(--text-2)] text-sm leading-relaxed max-w-sm">
              Plataforma integral para la administración de recursos humanos: empleados, nómina, asistencia y bienestar en un solo lugar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl p-4 border border-[var(--border)] bg-[var(--bg-card)]"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center mb-2.5">
                  <Icon size={15} style={{ color: 'var(--accent)' }} />
                </div>
                <div className="text-sm font-semibold text-[var(--text-1)] mb-0.5">{label}</div>
                <div className="text-[11px] text-[var(--text-3)] leading-snug">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[11px] text-[var(--text-3)]">© 2026 BEX HRIS · Todos los derechos reservados</p>
        </div>
      </div>

      {/* ── Right panel (form) ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-[var(--accent)] items-center justify-center mb-3">
              <span className="text-lg font-bold text-white">BX</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-1)]">BEX HRIS</h1>
            <p className="text-xs text-[var(--text-3)] mt-1">Sistema de Gestión de RRHH</p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-7 border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text-1)]">Iniciar sesión</h2>
              <p className="text-sm text-[var(--text-3)] mt-1">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Username */}
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">Usuario</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    {...register('username')}
                    type="text"
                    placeholder="usuario"
                    autoComplete="username"
                    className={cn(
                      'w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border outline-none transition-colors',
                      'bg-[var(--bg-base)] text-[var(--text-1)] placeholder:text-[var(--text-3)]',
                      errors.username
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-[var(--border)] focus:border-[var(--accent)]',
                    )}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">Contraseña</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn(
                      'w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border outline-none transition-colors',
                      'bg-[var(--bg-base)] text-[var(--text-1)] placeholder:text-[var(--text-3)]',
                      errors.password
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-[var(--border)] focus:border-[var(--accent)]',
                    )}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                  <span className="mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-[var(--text-3)] mt-5">
            ¿Problemas para ingresar? Contacta al administrador del sistema.
          </p>
        </div>
      </div>
    </div>
  )
}
