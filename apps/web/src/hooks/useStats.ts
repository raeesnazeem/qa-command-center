import { useQuery } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';

export interface DashboardStats {
  stats: {
    activeProjects: number;
    totalRuns: number;
    openIssues: number;
    resolvedToday: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'qa_run';
    projectName: string;
    userName: string;
    timestamp: string;
    status: string;
    runType: string;
  }>;
  priorityTasks: Array<{
    id: string;
    title: string;
    severity: string;
    projectId: string;
    projectName: string;
  }>;
}

export const useStats = () => {
  const axios = useAuthAxios();
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await axios.get('/api/stats');
      return data;
    },
  });
};
