export interface AccentPreset {
  id: string
  label: string
  hex: string
  lightVars: { bg: string; surface: string; hover: string; border: string; soft: string }
  darkVars:  { soft: string }
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'emerald', label: 'Esmeralda', hex: '#48bb78',
    lightVars: { bg: '#f0f7f3', surface: '#ffffff', hover: '#e7f5ee', border: 'rgba(72,187,120,0.18)',  soft: 'rgba(72,187,120,0.10)' },
    darkVars:  { soft: 'rgba(72,187,120,0.13)' } },
  { id: 'blue', label: 'Azul', hex: '#3b82f6',
    lightVars: { bg: '#eff6ff', surface: '#ffffff', hover: '#dbeafe', border: 'rgba(59,130,246,0.18)',  soft: 'rgba(59,130,246,0.10)' },
    darkVars:  { soft: 'rgba(59,130,246,0.13)' } },
  { id: 'violet', label: 'Violeta', hex: '#8b5cf6',
    lightVars: { bg: '#f5f3ff', surface: '#ffffff', hover: '#ede9fe', border: 'rgba(139,92,246,0.18)', soft: 'rgba(139,92,246,0.10)' },
    darkVars:  { soft: 'rgba(139,92,246,0.13)' } },
  { id: 'orange', label: 'Naranja', hex: '#f97316',
    lightVars: { bg: '#fff7ed', surface: '#ffffff', hover: '#ffedd5', border: 'rgba(249,115,22,0.18)',  soft: 'rgba(249,115,22,0.10)' },
    darkVars:  { soft: 'rgba(249,115,22,0.13)' } },
  { id: 'rose', label: 'Rosa', hex: '#f43f5e',
    lightVars: { bg: '#fff1f2', surface: '#ffffff', hover: '#ffe4e6', border: 'rgba(244,63,94,0.18)',   soft: 'rgba(244,63,94,0.10)' },
    darkVars:  { soft: 'rgba(244,63,94,0.13)' } },
  { id: 'cyan', label: 'Cian', hex: '#06b6d4',
    lightVars: { bg: '#ecfeff', surface: '#ffffff', hover: '#cffafe', border: 'rgba(6,182,212,0.18)',   soft: 'rgba(6,182,212,0.10)' },
    darkVars:  { soft: 'rgba(6,182,212,0.13)' } },
  { id: 'amber', label: 'Ámbar', hex: '#f59e0b',
    lightVars: { bg: '#fffbeb', surface: '#ffffff', hover: '#fef3c7', border: 'rgba(245,158,11,0.18)',  soft: 'rgba(245,158,11,0.10)' },
    darkVars:  { soft: 'rgba(245,158,11,0.13)' } },
  { id: 'slate', label: 'Gris', hex: '#64748b',
    lightVars: { bg: '#f8fafc', surface: '#ffffff', hover: '#f1f5f9', border: 'rgba(100,116,139,0.18)', soft: 'rgba(100,116,139,0.10)' },
    darkVars:  { soft: 'rgba(100,116,139,0.13)' } },
]

export const FONT_SIZES = [
  { id: 'sm' as const, label: 'S',  px: 13 },
  { id: 'md' as const, label: 'M',  px: 14 },
  { id: 'lg' as const, label: 'L',  px: 15 },
  { id: 'xl' as const, label: 'XL', px: 16 },
]
export type FontSize = 'sm' | 'md' | 'lg' | 'xl'

export const AVATAR_COLORS = [
  '#48bb78', '#3b82f6', '#8b5cf6', '#f97316',
  '#f43f5e', '#06b6d4', '#f59e0b', '#64748b',
  '#ec4899', '#10b981', '#a855f7', '#ef4444',
]

export const AVATAR_EMOJIS = ['', '😊', '🦊', '🐺', '🐱', '🦁', '🤖', '👑', '⭐', '🚀']

export function applyThemeVars(theme: 'dark' | 'light', accentHex: string) {
  const preset = ACCENT_PRESETS.find((p) => p.hex === accentHex) ?? ACCENT_PRESETS[0]
  const b = document.body

  b.style.setProperty('--accent', preset.hex)

  if (theme === 'dark') {
    b.style.setProperty('--accent-soft',  preset.darkVars.soft)
    b.style.setProperty('--bg-base',      '#0f1117')
    b.style.setProperty('--bg-surface',   '#161b27')
    b.style.setProperty('--bg-card',      '#1c2235')
    b.style.setProperty('--bg-hover',     '#212840')
    b.style.setProperty('--border-color', 'rgba(255,255,255,0.07)')
  } else {
    b.style.setProperty('--accent-soft',  preset.lightVars.soft)
    b.style.setProperty('--bg-base',      preset.lightVars.bg)
    b.style.setProperty('--bg-surface',   preset.lightVars.surface)
    b.style.setProperty('--bg-card',      preset.lightVars.surface)
    b.style.setProperty('--bg-hover',     preset.lightVars.hover)
    b.style.setProperty('--border-color', preset.lightVars.border)
  }
}
