import { ReactNode } from "react"
import { useRole } from "@/hooks/useRole"
import { UnauthorizedPage } from "@/pages/UnauthorizedPage"
import { Role } from "@/store/appStore"
import { Loader2 } from "lucide-react"

interface RoleGuardRouteProps {
  minRole: Role
  children: ReactNode
}

export const RoleGuardRoute = ({ minRole, children }: RoleGuardRouteProps) => {
  const { canDo, isLoading } = useRole()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] font-sans">
        <div className="flex flex-col items-center space-y-4 animate-pulse">
          <img
            src="https://growth99.com/storage/2024/09/LOGO.svg"
            alt="QACC Logo"
            className="h-12 w-12"
            style={{ objectFit: "contain" }}
          />
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
            Verifying Authorization...
          </p>
        </div>
      </div>
    )
  }

  if (!canDo(minRole)) {
    return <UnauthorizedPage />
  }

  return <>{children}</>
}
