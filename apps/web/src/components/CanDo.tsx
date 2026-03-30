import React, { ReactNode } from 'react'
import { useRole } from '@/hooks/useRole'

type Role = 'developer' | 'qa_engineer' | 'project_manager' | 'sub_admin' | 'admin' | 'super_admin'

interface CanDoProps {
  role: Role
  children: ReactNode
}

export const CanDo: React.FC<CanDoProps> = ({ role, children }) => {
  const { canDo, isLoading } = useRole()

  if (isLoading) {
    return null
  }

  if (!canDo(role)) {
    return null
  }

  return <>{children}</>
}
