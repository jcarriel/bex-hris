import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { useUiStore } from '@/store/uiStore'

export default function App() {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    // Dark mode: add .dark class; Light mode: remove it
    if (theme === 'dark') {
      document.body.classList.add('dark')
      document.body.classList.remove('light')
    } else {
      document.body.classList.remove('dark')
      document.body.classList.add('light')
    }
  }, [theme])

  // Apply dark class on mount immediately (avoid flash)
  useEffect(() => {
    const stored = useUiStore.getState().theme
    if (stored === 'dark') {
      document.body.classList.add('dark')
    }
  }, [])

  return <RouterProvider router={router} />
}
