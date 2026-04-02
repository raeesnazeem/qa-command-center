import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTaskSchema, CreateTaskInput } from '@qacc/shared';
import { useCreateTask } from '../hooks/useTasks';
import { useProjects, useWorkspaceUsers } from '../hooks/useProjects';
import { X, Loader2, CheckCircle2, ShieldAlert, User } from 'lucide-react';

interface CreateTaskModalProps {
  projectId?: string;
  isOpen: boolean;
  onClose: () => void;
  prefillData?: Partial<CreateTaskInput>;
}

export const CreateTaskModal = ({ projectId, isOpen, onClose, prefillData }: CreateTaskModalProps) => {
  const { mutate: createTask, isPending } = useCreateTask();
  const { data: projects } = useProjects();
  const { data: members } = useWorkspaceUsers();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: {
      project_id: projectId || '',
      severity: 'medium',
      ...prefillData
    },
  });

  // Update form when prefillData changes
  React.useEffect(() => {
    if (isOpen && prefillData) {
      reset({
        project_id: projectId || '',
        severity: 'medium',
        ...prefillData
      } as CreateTaskInput);
    }
  }, [isOpen, prefillData, reset, projectId]);

  const onSubmit = (data: CreateTaskInput) => {
    createTask(data, {
      onSuccess: () => {
        reset();
        onClose();
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200">
      <div 
        className="absolute inset-0 bg-transparent" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-accent/10 rounded-md text-accent">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Create New Task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Project Selection (if not provided) */}
            {!projectId && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Project <span className="text-accent">*</span>
                </label>
                <select
                  {...register('project_id')}
                  className={`w-full bg-white border ${
                    errors.project_id ? 'border-red-500/50' : 'border-slate-200'
                  } rounded-md px-4 py-2.5 text-slate-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all`}
                >
                  <option value="">Select a project</option>
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.project_id && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.project_id.message}</p>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Task Title <span className="text-accent">*</span>
              </label>
              <input
                {...register('title')}
                placeholder="e.g. Fix mobile menu overlap"
                className={`w-full bg-white border ${
                  errors.title ? 'border-red-500/50' : 'border-slate-200'
                } rounded-md px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all`}
              />
              {errors.title && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description <span className="text-slate-400 text-[10px] uppercase ml-1">(Optional)</span>
              </label>
              <textarea
                {...register('description')}
                placeholder="Provide more context about the issue..."
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-md px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all resize-none"
              />
            </div>

            {/* Severity */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Severity
                </label>
                <div className="relative">
                  <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    {...register('severity')}
                    className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2.5 text-slate-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all appearance-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Assignee Selection */}
            {members && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Assign To <span className="text-slate-400 text-[10px] uppercase ml-1">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    {...register('assigned_to')}
                    className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2.5 text-slate-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all appearance-none"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-unified-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-unified flex-[2] flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
