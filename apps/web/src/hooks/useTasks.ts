import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';
import { CreateTaskInput, UpdateTaskInput, TaskStatus, TaskSeverity } from '@qacc/shared';
import toast from 'react-hot-toast';

export interface Task {
  id: string;
  project_id: string;
  finding_id?: string;
  title: string;
  description?: string;
  severity: TaskSeverity;
  status: TaskStatus;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  users?: {
    full_name: string;
    email: string;
  };
  projects: {
    name: string;
  };
}

export const useTasks = (projectId?: string) => {
  const axios = useAuthAxios();
  return useQuery<Task[]>({
    queryKey: ['tasks', { projectId }],
    queryFn: async () => {
      const url = projectId ? `/api/tasks?project_id=${projectId}` : '/api/tasks';
      const { data } = await axios.get(url);
      return data;
    },
  });
};

export const useCreateTask = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const response = await axios.post('/api/tasks', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to create task';
      toast.error(message);
    },
  });
};

export const useUpdateTask = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: UpdateTaskInput }) => {
      const response = await axios.patch(`/api/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to update task';
      toast.error(message);
    },
  });
};

export const useDeleteTask = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await axios.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to delete task';
      toast.error(message);
    },
  });
};
