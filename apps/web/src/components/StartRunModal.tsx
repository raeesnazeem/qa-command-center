import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateRunSchema, CreateRunInput } from '@qacc/shared';
import { useCreateRun, useUpdateRunStatus, useStartRun, useFetchUrls } from '../hooks/useRuns';
import { Project } from '../api/projects.api';
import { X, Loader2, Globe, PlayCircle, Layout, ChevronDown, ChevronRight, Square, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface StartRunModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const StartRunModal = ({ project, isOpen, onClose }: StartRunModalProps) => {
  const navigate = useNavigate();
  const { mutate: createRun, isPending: isCreating } = useCreateRun();
  const { mutate: startRun, isPending: isStarting } = useStartRun();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateRunStatus();
  const [isUrlsExpanded, setIsUrlsExpanded] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateRunInput>({
    resolver: zodResolver(CreateRunSchema),
    defaultValues: {
      project_id: project.id,
      run_type: 'pre_release',
      site_url: project.site_url,
      figma_url: '',
      enabled_checks: ['visual_regression', 'accessibility', 'console_errors'],
      is_woocommerce: project.is_woocommerce,
      device_matrix: ['desktop'],
      selected_urls: [],
    },
  });

  const siteUrl = useWatch({ control, name: 'site_url' });
  const { data: fetchedUrls, isLoading: isFetchingUrls } = useFetchUrls(siteUrl);

  useEffect(() => {
    if (fetchedUrls) {
      setSelectedUrls(fetchedUrls);
      setValue('selected_urls', fetchedUrls);
    }
  }, [fetchedUrls, setValue]);

  const toggleUrl = (url: string) => {
    const newSelection = selectedUrls.includes(url)
      ? selectedUrls.filter(u => u !== url)
      : [...selectedUrls, url];
    setSelectedUrls(newSelection);
    setValue('selected_urls', newSelection);
  };

  const selectAll = () => {
    if (fetchedUrls) {
      setSelectedUrls(fetchedUrls);
      setValue('selected_urls', fetchedUrls);
    }
  };

  const deselectAll = () => {
    setSelectedUrls([]);
    setValue('selected_urls', []);
  };

  const onSubmit = (data: CreateRunInput) => {
    if (selectedUrls.length === 0) {
      return;
    }

    // Ensure empty string is sent as null
    const payload = {
      ...data,
      figma_url: data.figma_url === '' ? null : data.figma_url,
      selected_urls: selectedUrls
    };

    createRun(payload, {
      onSuccess: (newRun) => {
        // Correctly enqueue the job using startRun mutation
        startRun(newRun.id, {
          onSuccess: () => {
            onClose();
            // Redirect to detail page to see live progress
            navigate(`/projects/${project.id}/runs/${newRun.id}`);
          }
        });
      },
    });
  };

  const isPending = isCreating || isStarting || isUpdating;

  if (!isOpen) return null;

  const checkOptions = [
    { id: 'visual_regression', label: 'Visual Regression', description: 'Compare layout against baseline or Figma' },
    { id: 'accessibility', label: 'Accessibility (a11y)', description: 'Check for WCAG compliance issues' },
    { id: 'console_errors', label: 'Console Errors', description: 'Detect JS errors and failed network requests' },
    { id: 'performance', label: 'Performance', description: 'Basic Lighthouse performance metrics' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200">
      <div 
        className="absolute inset-0 bg-transparent" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-accent/10 rounded-md text-accent">
              <PlayCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Start New QA Run</h2>
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
            {/* Run Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Run Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    {...register('run_type')}
                    value="pre_release"
                    className="sr-only peer"
                  />
                  <div className="p-3 border border-slate-200 rounded-md text-center peer-checked:border-accent peer-checked:bg-accent/5 transition-all">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 peer-checked:text-accent">Pre-Release</span>
                  </div>
                </label>
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    {...register('run_type')}
                    value="post_release"
                    className="sr-only peer"
                  />
                  <div className="p-3 border border-slate-200 rounded-md text-center peer-checked:border-accent peer-checked:bg-accent/5 transition-all">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 peer-checked:text-accent">Post-Release</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Site URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Target URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('site_url')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md pl-10 pr-4 py-2.5 text-slate-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
              {errors.site_url && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.site_url.message}</p>
              )}
            </div>

            {/* Figma URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Figma Design URL <span className="text-slate-400 text-[10px] uppercase ml-1">(Optional)</span>
              </label>
              <div className="relative">
                <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('figma_url')}
                  placeholder="https://figma.com/file/..."
                  className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
              {errors.figma_url && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.figma_url.message}</p>
              )}
            </div>

            {/* URL Selection Accordion */}
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setIsUrlsExpanded(!isUrlsExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    Select Pages to Test ({selectedUrls.length}/{fetchedUrls?.length || 0})
                  </span>
                  {isFetchingUrls && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
                </div>
                {isUrlsExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {isUrlsExpanded && (
                <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                  <div className="flex items-center space-x-4 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-[10px] font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                    {!fetchedUrls && !isFetchingUrls && (
                      <p className="text-xs text-slate-500 italic py-2">Enter a URL to fetch pages</p>
                    )}
                    {isFetchingUrls && (
                      <div className="flex items-center justify-center py-4 space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-500">Fetching pages...</span>
                      </div>
                    )}
                    {fetchedUrls?.map((url) => (
                      <div
                        key={url}
                        onClick={() => toggleUrl(url)}
                        className="flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        {selectedUrls.includes(url) ? (
                          <CheckSquare className="w-4 h-4 text-accent" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                        )}
                        <span className="text-xs text-slate-600 truncate">{url}</span>
                      </div>
                    ))}
                  </div>
                  {selectedUrls.length === 0 && !isFetchingUrls && fetchedUrls && (
                    <p className="text-[10px] text-red-500 font-medium italic">* At least one page must be selected</p>
                  )}
                </div>
              )}
            </div>

            {/* Enabled Checks */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Checks to Run
              </label>
              <div className="space-y-2">
                {checkOptions.map((check) => (
                  <label key={check.id} className="flex items-start p-3 border border-slate-100 rounded-md bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors group">
                    <div className="flex items-center h-5 mr-3">
                      <input
                        type="checkbox"
                        {...register('enabled_checks')}
                        value={check.id}
                        className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent accent-accent"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">{check.label}</div>
                      <p className="text-[10px] text-slate-500 font-medium">{check.description}</p>
                    </div>
                  </label>
                ))}
              </div>
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
              disabled={isPending || selectedUrls.length === 0}
              className="btn-unified flex-[2] flex items-center justify-center space-x-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  <span>Start Run</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
