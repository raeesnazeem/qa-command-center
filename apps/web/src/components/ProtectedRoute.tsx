import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/react'

export const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Loading QACC</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
