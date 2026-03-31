import { AxiosInstance } from 'axios';
import { CreateRunInput, RunStatus } from '@qacc/shared';

export interface QARun {
  id: string;
  project_id: string;
  run_type: 'pre_release' | 'post_release';
  site_url: string;
  figma_url?: string | null;
  enabled_checks: string[];
  is_woocommerce: boolean;
  device_matrix: ('desktop' | 'tablet' | 'mobile')[];
  status: RunStatus;
  created_by: string;
  created_at: string;
  completed_at?: string | null;
  pages_total: number;
  pages_processed: number;
  progress_percentage?: number;
  finding_counts?: Record<string, number>;
  pages?: any[];
}

export interface QARunsResponse {
  data: QARun[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const createRun = async (axios: AxiosInstance, data: CreateRunInput): Promise<QARun> => {
  const response = await axios.post<QARun>('/api/runs', data);
  return response.data;
};

export const getRuns = async (
  axios: AxiosInstance,
  projectId: string,
  page = 1,
  limit = 20
): Promise<QARunsResponse> => {
  const response = await axios.get<QARunsResponse>(`/api/projects/${projectId}/runs`, {
    params: { page, limit },
  });
  return response.data;
};

export const getRun = async (axios: AxiosInstance, runId: string): Promise<QARun> => {
  const response = await axios.get<QARun>(`/api/runs/${runId}`);
  return response.data;
};

export const updateRunStatus = async (
  axios: AxiosInstance,
  runId: string,
  status: RunStatus
): Promise<QARun> => {
  const response = await axios.patch<QARun>(`/api/runs/${runId}/status`, { status });
  return response.data;
};

export const signOffRun = async (
  axios: AxiosInstance,
  runId: string,
  notes?: string
): Promise<any> => {
  const response = await axios.post(`/api/runs/${runId}/sign-off`, { notes });
  return response.data;
};
