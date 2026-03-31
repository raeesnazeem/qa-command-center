import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthAxios } from '../lib/useAuthAxios';
import { 
  getTasks, 
  getTask, 
  createTask, 
  updateTask, 
  assignTask,
  addComment, 
  addRebuttal,
  TaskFilters
} from '../api/tasks.api';
import { CreateTaskInput, UpdateTaskInput, RebuttalInput } from '@qacc/shared';
import toast from 'react-hot-toast';

export const useTasks = (filters: TaskFilters) => {
  const axios = useAuthAxios();
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(axios, filters),
  });
};

export const useTask = (id: string) => {
  const axios = useAuthAxios();
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => getTask(axios, id),
    enabled: !!id,
  });
};

export const useCreateTask = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskInput) => createTask(axios, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create task');
    },
  });
};

export const useUpdateTask = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) => 
      updateTask(axios, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] });
      toast.success('Task updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update task');
    },
  });
};

export const useAddComment = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) => 
      addComment(axios, taskId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add comment');
    },
  });
};

export const useAddRebuttal = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Omit<RebuttalInput, 'task_id'> }) => 
      addRebuttal(axios, taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
      toast.success('Rebuttal submitted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit rebuttal');
    },
  });
};

export const useAssignTask = () => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => 
      assignTask(axios, id, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] });
      toast.success('Task reassigned');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reassign task');
    },
  });
};
