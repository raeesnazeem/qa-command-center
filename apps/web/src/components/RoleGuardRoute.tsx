import { ReactNode } from 'react';
import { useRole } from '@/hooks/useRole';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { Role } from '@/store/appStore';
import { Loader2 } from 'lucide-react';

interface RoleGuardRouteProps {
  minRole: Role;
  children: ReactNode;
}

export const RoleGuardRoute = ({ minRole, children }: RoleGuardRouteProps) => {
  const { canDo, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!canDo(minRole)) {
    return <UnauthorizedPage />;
  }

  return <>{children}</>;
};
