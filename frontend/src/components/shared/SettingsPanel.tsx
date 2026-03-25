import React from 'react'
import { X, Palette, Type, User, Monitor } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { ACCENT_PRESETS, FONT_SIZES, AVATAR_COLORS, AVATAR_EMOJIS } from '@/lib/theme'

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-[var(--accent)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">{title}</span>
      </div>
      {children}
    </div>
  )
}

export function SettingsPanel() {
  const {
    settingsOpen, setSettingsOpen,
    theme, toggleTheme,
    accentColor, setAccentColor,
    fontSize, setFontSize,
    avatarColor, setAvatarColor,
    avatarEmoji, setAvatarEmoji,
  } = useUiStore()
  const user = useAuthStore((s) => s.user)

  if (!settingsOpen) return null

  const displayName = user?.nombre ?? 'Usuario'
  const avatarContent = avatarEmoji || getInitials(displayName)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-80 flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-hover)' }}>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-1)]">Preferencias</h2>
            <p className="text-[11px] text-[var(--text-3)] mt-0.5">Personaliza tu experiencia</p>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7">

          {/* ── Avatar ── */}
          <Section icon={User} title="Avatar">
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-md"
                style={{ backgroundColor: avatarColor }}
              >
                {avatarContent}
              </div>

              <div className="flex-1 space-y-3">
                {/* Color */}
                <div>
                  <p className="text-[11px] text-[var(--text-3)] font-medium mb-2">Color de fondo</p>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setAvatarColor(c)}
                        title={c}
                        className={cn(
                          'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                          avatarColor === c ? 'border-[var(--text-1)] scale-110' : 'border-transparent',
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Emoji */}
                <div>
                  <p className="text-[11px] text-[var(--text-3)] font-medium mb-2">Emoji (opcional)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_EMOJIS.map((e) => (
                      <button
                        key={e || '__initials__'}
                        onClick={() => setAvatarEmoji(e)}
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors border',
                          avatarEmoji === e
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : 'bg-[var(--bg-hover)] border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-1)]',
                        )}
                        title={e ? e : 'Iniciales'}
                      >
                        {e || <span className="text-[9px] font-bold leading-none">Ab</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--border)' }} />

          {/* ── Tema ── */}
          <Section icon={Monitor} title="Tema">
            <div className="grid grid-cols-2 gap-2">
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { if (t !== theme) toggleTheme() }}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all',
                    theme === t
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
                  )}
                >
                  <span>{t === 'light' ? '☀️' : '🌙'}</span>
                  {t === 'light' ? 'Claro' : 'Oscuro'}
                </button>
              ))}
            </div>
          </Section>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--border)' }} />

          {/* ── Color de acento ── */}
          <Section icon={Palette} title="Color de acento">
            <div className="grid grid-cols-4 gap-2">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setAccentColor(p.hex)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all',
                    accentColor === p.hex
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm'
                      : 'border-[var(--border)] hover:bg-[var(--bg-hover)]',
                  )}
                >
                  <span
                    className="w-7 h-7 rounded-full shadow-sm"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span className="text-[10px] text-[var(--text-3)] font-medium leading-none">{p.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: 'var(--border)' }} />

          {/* ── Tamaño de letra ── */}
          <Section icon={Type} title="Tamaño de letra">
            <div className="grid grid-cols-4 gap-2">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFontSize(s.id)}
                  className={cn(
                    'py-3 rounded-xl border font-bold transition-all',
                    fontSize === s.id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]',
                  )}
                  style={{ fontSize: s.px }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-3)] mt-2">
              Actual: {FONT_SIZES.find((s) => s.id === fontSize)?.px}px
            </p>
          </Section>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t text-[11px] text-[var(--text-3)] text-center"
          style={{ borderColor: 'var(--border)' }}>
          Los cambios se guardan automáticamente
        </div>
      </div>
    </>
  )
}
