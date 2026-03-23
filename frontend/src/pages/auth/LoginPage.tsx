import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Lock, User } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth.service'
import { cn } from '@/lib/utils'

const schema = z.object({
  username: z.string().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const result = await authService.login(data)
      login(
        {
          id:          result.user.id,
          nombre:      result.user.nombre || result.user.username,
          username:    result.user.username,
          email:       result.user.email,
          rol:         result.user.role || 'user',
          roleId:      result.user.roleId,
          permissions: result.user.permissions || ['*'],
        },
        result.token,
      )
      navigate('/dashboard')
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[var(--accent)] items-center justify-center mb-3">
            <span className="text-xl font-bold text-white">BX</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-1)]">BEX HRIS</h1>
          <p className="text-sm text-[var(--text-2)] mt-1">Sistema de Gestión de RRHH</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-base font-semibold text-[var(--text-1)] mb-5">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  {...register('username')}
                  type="text"
                  placeholder="nombre_usuario"
                  autoComplete="username"
                  className={cn(
                    'w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border outline-none transition-colors',
                    'bg-[var(--bg-surface)] text-[var(--text-1)] placeholder:text-[var(--text-3)]',
                    errors.username
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[var(--border-color)] focus:border-[var(--accent)]',
                  )}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-[var(--text-2)] block mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    'w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border outline-none transition-colors',
                    'bg-[var(--bg-surface)] text-[var(--text-1)] placeholder:text-[var(--text-3)]',
                    errors.password
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[var(--border-color)] focus:border-[var(--accent)]',
                  )}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
