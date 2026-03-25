import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useUiStore } from '@/store/uiStore'
import { applyThemeVars, FONT_SIZES } from '@/lib/theme'

export default function App() {
  const theme      = useUiStore((s) => s.theme)
  const accentColor = useUiStore((s) => s.accentColor)
  const fontSize   = useUiStore((s) => s.fontSize)

  // Apply dark/light class
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark')
      document.body.classList.remove('light')
    } else {
      document.body.classList.remove('dark')
      document.body.classList.add('light')
    }
    applyThemeVars(theme, accentColor)
  }, [theme, accentColor])

  // Apply font size
  useEffect(() => {
    const size = FONT_SIZES.find((s) => s.id === fontSize) ?? FONT_SIZES[1]
    document.documentElement.style.fontSize = `${size.px}px`
  }, [fontSize])

  // On mount: apply stored settings immediately to avoid flash
  useEffect(() => {
    const { theme: t, accentColor: a, fontSize: f } = useUiStore.getState()
    if (t === 'dark') document.body.classList.add('dark')
    applyThemeVars(t, a)
    const size = FONT_SIZES.find((s) => s.id === f) ?? FONT_SIZES[1]
    document.documentElement.style.fontSize = `${size.px}px`
  }, [])

  return <RouterProvider router={router} />
}
