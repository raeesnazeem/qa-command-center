import { useQuery } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';
import { getDashboardStats, DashboardStats } from '../api/dashboard.api';
import { useAuth } from '@clerk/react';

export const useDashboardStats = () => {
  const axios = useAuthAxios();
  const { orgId } = useAuth();

  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', orgId],
    queryFn: () => getDashboardStats(axios, orgId || ''),
    enabled: !!orgId,
  });
};
