import { Outlet, NavLink } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/react'
import { LayoutDashboard, FolderKanban, CheckSquare, Settings as SettingsIcon } from 'lucide-react'

export const AppLayout = () => {
  const { user } = useUser()

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ]

  return (
    <div className="flex h-screen bg-bg-main font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-slate-900 flex flex-col border-r border-slate-200">
        <div className="p-6 text-xl font-bold border-b border-slate-100 tracking-tight flex items-center space-x-2">
          <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-black">QA</span>
          </div>
          <span>QACC</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-2.5 rounded-md text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-slate-50 text-accent border border-slate-100 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Workspace</div>

          <div className="flex items-center space-x-4">
            {user?.firstName && (
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {user.firstName}
              </span>
            )}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8',
                },
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
