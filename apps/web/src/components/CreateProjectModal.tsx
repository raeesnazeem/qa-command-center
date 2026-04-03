import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateProjectSchema, CreateProjectInput } from '@qacc/shared';
import { useCreateProject } from '../hooks/useProjects';
import { X, Loader2, Globe, Building, CheckCircle2, Zap } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal = ({ isOpen, onClose }: CreateProjectModalProps) => {
  const { mutate: createProject, isPending } = useCreateProject();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      is_woocommerce: false,
      is_pre_release: false,
    },
  });

  const onSubmit = (data: CreateProjectInput) => {
    createProject(data, {
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
      
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Project Name <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <input
                  {...register('name')}
                  placeholder="e.g. My Awesome Shop"
                  className={`w-full bg-white border ${
                    errors.name ? 'border-red-500/50' : 'border-slate-200'
                  } rounded-md px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all`}
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Site URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Site URL <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('site_url')}
                  placeholder="https://example.com"
                  className={`w-full bg-white border ${
                    errors.site_url ? 'border-red-500/50' : 'border-slate-200'
                  } rounded-md pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all`}
                />
              </div>
              {errors.site_url && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.site_url.message}</p>
              )}
            </div>

            {/* Client Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Client Name <span className="text-slate-400 text-[10px] uppercase ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('client_name')}
                  placeholder="ACME Corp"
                  className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
            </div>

            {/* WooCommerce Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-md">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">WooCommerce</h4>
                  <p className="text-xs text-slate-500">Enable e-commerce specific QA checks</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('is_woocommerce')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {/* Pre-release Toggle */}
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-md border border-amber-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-md">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">Pre-release Project</h4>
                  <p className="text-xs text-amber-700">Prioritize this project on the QA dashboard</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('is_pre_release')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
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
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
