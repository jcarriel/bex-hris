import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '@/store/uiStore'

export function MainLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Sidebar />
      <div
        className="transition-all"
        style={{ marginLeft: sidebarOpen ? '180px' : '0' }}
      >
        <Topbar />
        <main className="pt-[70px] px-4 pb-8 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
