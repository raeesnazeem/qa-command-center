import { useQuery } from '@tanstack/react-query'
import { useAuthAxios } from '@/lib/useAuthAxios'

type Role = 'developer' | 'qa_engineer' | 'project_manager' | 'sub_admin' | 'admin' | 'super_admin'

const ROLE_HIERARCHY: Role[] = [
  'developer',
  'qa_engineer',
  'project_manager',
  'sub_admin',
  'admin',
  'super_admin',
]

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: Role
  org_id: string
}

interface UseRoleReturn {
  role: Role | null
  isAdmin: boolean
  isQaEngineer: boolean
  isDeveloper: boolean
  canDo: (minRole: Role) => boolean
  isLoading: boolean
}

export const useRole = (): UseRoleReturn => {
  const axios = useAuthAxios()

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await axios.get('/api/me')
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const role = profile?.role ?? null

  const getRoleLevel = (r: Role | null): number => {
    if (!r) return -1
    return ROLE_HIERARCHY.indexOf(r)
  }

  const canDo = (minRole: Role): boolean => {
    const userLevel = getRoleLevel(role)
    const requiredLevel = getRoleLevel(minRole)
    return userLevel >= requiredLevel
  }

  return {
    role,
    isAdmin: canDo('admin'),
    isQaEngineer: canDo('qa_engineer'),
    isDeveloper: role === 'developer',
    canDo,
    isLoading,
  }
}
