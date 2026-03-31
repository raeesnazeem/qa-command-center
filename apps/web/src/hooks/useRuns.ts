import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';
import { CreateRunInput } from '@qacc/shared';
import { createRun, getRuns, getRun, QARun, QARunsResponse } from '../api/runs.api';
import toast from 'react-hot-toast';

export const useRuns = (projectId: string, page = 1, limit = 20) => {
  const axios = useAuthAxios();
  return useQuery<QARunsResponse>({
    queryKey: ['runs', projectId, page, limit],
    queryFn: () => getRuns(axios, projectId, page, limit),
    enabled: !!projectId,
  });
};

export const useRun = (runId: string) => {
  const axios = useAuthAxios();
  return useQuery<QARun>({
    queryKey: ['run', runId],
    queryFn: () => getRun(axios, runId),
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data as QARun | undefined;
      return data?.status === 'running' ? 3000 : false;
    },
  });
};

export const useCreateRun = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRunInput) => createRun(axios, data),
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
