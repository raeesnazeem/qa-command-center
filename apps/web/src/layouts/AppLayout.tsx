import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/react'

export const AppLayout = () => {
  const { user } = useUser()

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-navy text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-slate-700">QACC</div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard" className="block px-4 py-2 rounded hover:bg-slate-700">
            Dashboard
          </Link>
          <Link to="/projects" className="block px-4 py-2 rounded hover:bg-slate-700">
            Projects
          </Link>
          <Link to="/tasks" className="block px-4 py-2 rounded hover:bg-slate-700">
            Tasks
          </Link>
          <Link to="/settings" className="block px-4 py-2 rounded hover:bg-slate-700">
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
          <div className="text-lg font-semibold dark:text-white">Workspace</div>
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
