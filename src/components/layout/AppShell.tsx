import { useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export function AppShell() {
  const location = useLocation()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto" key={location.pathname}>
          <div className="animate-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
