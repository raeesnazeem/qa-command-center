import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/react'
import { LayoutDashboard, FolderKanban, CheckSquare, Settings as SettingsIcon, Users } from 'lucide-react'
import { useRole } from '../hooks/useRole'
import { useEffect } from 'react'
import { ChatSidebar } from '../components/ChatSidebar'

export const AppLayout = () => {
  const { user } = useUser()
  const { role, profile, isLoading } = useRole()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Redirect to onboarding if profile is incomplete in Supabase
    if (!isLoading && location.pathname !== '/onboarding') {
      // A profile is incomplete if role is missing, full_name is missing, 
      // or if it's the default "New User" name we set in the middleware.
      const isProfileIncomplete = !profile?.role || 
                                  !profile?.full_name || 
                                  profile?.full_name === 'New User';
      
      if (isProfileIncomplete) {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [profile, isLoading, navigate, location.pathname])

  const isDeveloper = role === 'developer'

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    ...(!isDeveloper ? [{ to: '/team', label: 'Team', icon: Users }] : []),
    ...(!isDeveloper ? [{ to: '/settings', label: 'Settings', icon: SettingsIcon }] : []),
  ]

  return (
    <div className="flex h-screen bg-bg-main font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white text-slate-900 flex flex-col border-r border-slate-200">
        <div className="p-6 text-xl font-bold border-b border-slate-100 tracking-tight flex items-center space-x-2">
            <img src="https://growth99.com/storage/2024/09/LOGO.svg" style={{ objectFit: 'contain', width:'130px' }} alt="logo" className="h-8 w-8" />
          <span className="tracking-tighter">QACC</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-slate-50 text-accent border border-slate-100 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center space-x-2">
           
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md">
               {role?.replace('_', ' ')}
             </span>
          </div>

          <div className="flex items-center space-x-4">
            {user?.firstName && (
              <span className="text-sm text-slate-700 font-bold tracking-tight">
                {user.firstName}
              </span>
            )}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8 border border-slate-200 shadow-sm transition-all hover:scale-105',
                },
              }}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 bg-slate-50/30">
          <Outlet />
        </main>
        <ChatSidebar />
      </div>
    </div>
  )
}
