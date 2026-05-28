import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import { useUser, UserButton } from "@clerk/react"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  BarChart2,
  Settings as SettingsIcon,
  Users,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useRole } from "../hooks/useRole"
import { useEffect, useState } from "react"
import { ChatSidebar } from "../components/ChatSidebar"
import { AdminRedisWidget } from "../components/AdminRedisWidget"
import { useRealtimeTasks } from "../hooks/useRealtimeTasks"
import { NotificationBell } from "../components/NotificationBell"
import { useRealtimeNotifications } from "../hooks/useRealtimeNotifications"

export const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { user } = useUser()
  const { role, profile, isLoading, isAdmin } = useRole()
  const navigate = useNavigate()
  const location = useLocation()

  // Initialize global real-time listeners
  useRealtimeTasks()
  useRealtimeNotifications()

  useEffect(() => {
    // Redirect to onboarding if profile is incomplete in Supabase
    if (!isLoading && location.pathname !== "/onboarding") {
      // A profile is incomplete if role is missing, full_name is missing,
      // or if it's the default "New User" name we set in the middleware.
      const isProfileIncomplete =
        !profile?.role ||
        !profile?.full_name ||
        profile?.full_name === "New User"

      if (isProfileIncomplete) {
        navigate("/onboarding", { replace: true })
      }
    }
  }, [profile, isLoading, navigate, location.pathname])

  const isDeveloper = role === "developer"

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/tasks", label: "Tasks", icon: CheckSquare },
    ...(isAdmin
      ? [{ to: "/all-tasks", label: "All tasks", icon: CheckSquare }]
      : []),
    { to: "/stats", label: "Stats", icon: BarChart2 },
    ...(!isDeveloper ? [{ to: "/team", label: "Team", icon: Users }] : []),
    ...(!isDeveloper
      ? [{ to: "/admin/queue-history", label: "Queue History", icon: History }]
      : []),
    ...(!isDeveloper
      ? [{ to: "/admin/activity-logs", label: "Activity Logs", icon: History }]
      : []),
    ...(!isDeveloper
      ? [{ to: "/settings", label: "Settings", icon: SettingsIcon }]
      : []),
  ]

  return (
    <div className="flex h-screen bg-bg-main font-sans">
      {/* Sidebar */}
      <aside
        className={`${isCollapsed ? "w-20" : "w-64"} bg-transparent text-slate-900 flex flex-col border-r border-slate-200 transition-all duration-300 relative`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1 z-20 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          )}
        </button>
        <div
          className={`p-6 text-xl font-bold border-b border-slate-100 tracking-tight flex items-center ${isCollapsed ? "justify-center space-x-0" : "space-x-2"}`}
        >
          <img
            src={
              isCollapsed
                ? "/images/qacc-mobile.png"
                : "https://growth99.com/storage/2024/09/LOGO.svg"
            }
            style={{
              objectFit: "contain",
              width: isCollapsed ? "32px" : "130px",
            }}
            alt="logo"
            className={
              isCollapsed ? "h-8 w-8 flex-shrink-0" : "h-8 w-auto flex-shrink-0"
            }
          />

          {!isCollapsed && <span className="tracking-tighter">QACC</span>}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative group border bg-white/20 border-transparent flex items-center ${isCollapsed ? "justify-center px-0 gap-0" : "gap-3 px-4"} py-2 rounded-md text-[13px] font-medium capitalize transition-all ${
                  isActive
                    ? "text-accent shadow-sm bg-white"
                    : "text-[#6b7280] hover:bg-slate-50/50 hover:text-slate-900"
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-md pointer-events-none p-[1px] drop-shadow-sm overflow-hidden"
                      style={{
                        WebkitMask:
                          "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                      }}
                    >
                      {/* Base Ambient Border */}
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#a3d4c7]/30 to-white/30 opacity-50" />

                      {/* Iridescent Slow Shimmer */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square bg-[conic-gradient(from_0deg,transparent_0_178deg,#a3d4c7_250deg,transparent_202deg_360deg)] opacity-60 animate-[spin_8s_linear_infinite]" />
                    </div>
                  )}

                  <item.icon
                    className={`relative z-10 w-4 h-4 transition-colors flex-shrink-0 ${isActive ? "text-accent" : "text-slate-400 group-hover:text-black"}`}
                  />
                  {!isCollapsed && (
                    <span className="relative z-10 whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-transparent border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md">
              {role?.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center space-x-6">
            <NotificationBell />
            <div className="flex items-center space-x-4">
              {user?.firstName && (
                <span className="text-sm text-slate-700 font-bold tracking-tight">
                  {user.firstName}
                </span>
              )}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "w-8 h-8 border border-slate-200 shadow-sm transition-all hover:scale-105",
                  },
                }}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8 bg-slate-50/30">
          <Outlet />
        </main>
        {isAdmin && <ChatSidebar />}
        <AdminRedisWidget />
      </div>
    </div>
  )
}
