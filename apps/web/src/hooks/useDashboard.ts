import { useQuery } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';
import { getDashboardStats, DashboardStats } from '../api/dashboard.api';
import { useAuth } from '@clerk/react';

export const useDashboardStats = () => {
  const axios = useAuthAxios();
  const { isLoaded, userId, orgId } = useAuth();

  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => getDashboardStats(axios, orgId || ''),
    enabled: isLoaded && !!userId && !!orgId,
  });
};
