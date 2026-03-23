import { useUiStore } from '@/store/uiStore'

export function useTheme() {
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  return { theme, toggleTheme, isDark: theme === 'dark' }
}
