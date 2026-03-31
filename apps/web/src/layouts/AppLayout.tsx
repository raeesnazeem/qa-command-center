import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/react'

export const AppLayout = () => {
  const { user } = useUser()

  return (
    <div className="flex h-screen bg-bg-main font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-slate-900 flex flex-col border-r border-slate-200">
        <div className="p-6 text-xl font-bold border-b border-slate-100 tracking-tight">QACC</div>
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/dashboard" className="block px-4 py-2.5 rounded-md text-sm font-medium hover:bg-slate-50 hover:text-accent transition-colors">
            Dashboard
          </Link>
          <Link to="/projects" className="block px-4 py-2.5 rounded-md text-sm font-medium bg-slate-50 text-accent border border-slate-100">
            Projects
          </Link>
          <Link to="/tasks" className="block px-4 py-2.5 rounded-md text-sm font-medium hover:bg-slate-50 hover:text-accent transition-colors">
            Tasks
          </Link>
          <Link to="/settings" className="block px-4 py-2.5 rounded-md text-sm font-medium hover:bg-slate-50 hover:text-accent transition-colors">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="text-lg font-semibold text-slate-800">Workspace</div>
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
