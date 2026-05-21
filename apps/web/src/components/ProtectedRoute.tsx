import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@clerk/react"

export const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-main font-sans">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <img
            src="https://growth99.com/storage/2024/09/LOGO.svg"
            alt="QACC Logo"
            className="h-72 w-72"
            style={{ objectFit: "contain" }}
          />
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
