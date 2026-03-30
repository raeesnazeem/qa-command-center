import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@clerk/react'

export const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <div className="p-4">Loading...</div>
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
