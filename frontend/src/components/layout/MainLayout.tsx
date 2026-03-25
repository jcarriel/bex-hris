import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SettingsPanel } from '@/components/shared/SettingsPanel'
import { WelcomeTour } from '@/components/shared/WelcomeTour'
import { useUiStore } from '@/store/uiStore'
import { useSessionGuard } from '@/hooks/useSessionGuard'

export function MainLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const tourSeen    = useUiStore((s) => s.tourSeen)

  useSessionGuard()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Sidebar />
      <SettingsPanel />
      {!tourSeen && <WelcomeTour />}
      <div
        className="transition-all"
        style={{ marginLeft: sidebarOpen ? '15rem' : '3.5rem' }}
      >
        <Topbar />
        <main className="pt-[70px] px-4 pb-8 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
