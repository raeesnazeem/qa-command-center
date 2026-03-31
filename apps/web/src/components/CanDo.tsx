import React, { ReactNode } from 'react'
import { useRole } from '@/hooks/useRole'

type Role = 'developer' | 'qa_engineer' | 'project_manager' | 'sub_admin' | 'admin' | 'super_admin'

interface CanDoProps {
  role: Role
  children: ReactNode
}

export const CanDo: React.FC<CanDoProps> = ({ role, children }) => {
  const { canDo, isLoading, role: userRole } = useRole()

  if (isLoading) {
    console.log('--- CanDo: Loading... ---');
    return null
  }

  const hasPermission = canDo(role);
  console.log(`--- CanDo Check: Required=${role}, User=${userRole}, Result=${hasPermission} ---`);

  if (!hasPermission) {
    return null
  }

  return <>{children}</>
}
