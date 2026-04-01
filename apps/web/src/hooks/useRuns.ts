import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';
import { CreateRunInput, RunStatus } from '@qacc/shared';
import { createRun, getRuns, getRun, signOffRun, startRun, updateRunStatus, fetchUrls, getPageFindings, updateFinding, QARun, QARunsResponse, QAFinding } from '../api/runs.api';
import toast from 'react-hot-toast';

export const useFetchUrls = (siteUrl: string) => {
  const axios = useAuthAxios();
  return useQuery<string[]>({
    queryKey: ['fetch-urls', siteUrl],
    queryFn: () => fetchUrls(axios, siteUrl),
    enabled: !!siteUrl && siteUrl.startsWith('http'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useRuns = (projectId: string, page = 1, limit = 20) => {
  const axios = useAuthAxios();
  return useQuery<QARunsResponse>({
    queryKey: ['runs', projectId, page, limit],
    queryFn: () => getRuns(axios, projectId, page, limit),
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data as QARunsResponse | undefined;
      const hasRunning = data?.data?.some(run => run.status === 'running' || run.status === 'pending');
      return hasRunning ? 3000 : false;
    },
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
      return data?.status === 'running' || data?.status === 'pending' ? 3000 : false;
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

export const useStartRun = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => startRun(axios, runId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run', data.id] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toast.success('Scan started');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start scan');
    },
  });
};

export const useUpdateRunStatus = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, status }: { runId: string; status: RunStatus }) =>
      updateRunStatus(axios, runId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run', data.id] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`Scan ${data.status}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update scan status';
      toast.error(message);
    },
  });
};

export const useSignOff = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, notes }: { runId: string; notes?: string }) => 
      signOffRun(axios, runId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run', data.run_id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Run signed off successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to sign off');
    },
  });
};

export const useFindings = (pageId: string | null) => {
  const axios = useAuthAxios();
  return useQuery<QAFinding[]>({
    queryKey: ['findings', pageId],
    queryFn: () => getPageFindings(axios, pageId!),
    enabled: !!pageId,
  });
};

export const useUpdateFinding = (pageId: string | null) => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ findingId, data }: { findingId: string; data: Partial<Pick<QAFinding, 'severity' | 'status'>> }) =>
      updateFinding(axios, findingId, data),
    onMutate: async ({ findingId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['findings', pageId] });

      // Snapshot the previous value
      const previousFindings = queryClient.getQueryData<QAFinding[]>(['findings', pageId]);

      // Optimistically update to the new value
      if (previousFindings) {
        queryClient.setQueryData<QAFinding[]>(['findings', pageId], 
          previousFindings.map(f => f.id === findingId ? { ...f, ...data } : f)
        );
      }

      return { previousFindings };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousFindings) {
        queryClient.setQueryData(['findings', pageId], context.previousFindings);
      }
      toast.error('Failed to update finding');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['findings', pageId] });
    },
  });
};
