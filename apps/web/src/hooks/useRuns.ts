import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';
import { CreateRunInput } from '@qacc/shared';
import toast from 'react-hot-toast';

export interface QARun {
  id: string;
  project_id: string;
  run_type: 'pre_release' | 'post_release';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timed_out';
  site_url: string;
  figma_url?: string;
  pages_total: number;
  pages_processed: number;
  enabled_checks: string[];
  is_woocommerce: boolean;
  started_at?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QARunDetail extends QARun {
  findings: any[];
  pages: any[];
}

export const useRuns = (projectId: string) => {
  const axios = useAuthAxios();
  return useQuery<QARun[]>({
    queryKey: ['runs', projectId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/runs?project_id=${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
};

export const useRun = (runId: string) => {
  const axios = useAuthAxios();
  return useQuery<QARunDetail>({
    queryKey: ['run', runId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/runs/${runId}`);
      return data;
    },
    enabled: !!runId,
  });
};

export const useCreateRun = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRunInput) => {
      const response = await axios.post('/api/runs', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['runs', data.project_id] });
      toast.success('QA run started successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to start QA run';
      toast.error(message);
    },
  });
};
