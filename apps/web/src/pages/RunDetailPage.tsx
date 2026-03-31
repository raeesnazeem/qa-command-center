import { useParams, Link } from 'react-router-dom';
import { useRun } from '../hooks/useRuns';
import { useProject } from '../hooks/useProjects';
import { 
  ChevronLeft, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  FileText,
  Search
} from 'lucide-react';

export const RunDetailPage = () => {
  const { id: projectId, runId } = useParams<{ id: string; runId: string }>();
  const { data: run, isLoading: isLoadingRun } = useRun(runId!);
  const { data: project, isLoading: isLoadingProject } = useProject(projectId!);

  const isLoading = isLoadingRun || isLoadingProject;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!run || !project) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900">Run not found</h2>
        <Link to={`/projects/${projectId}`} className="text-accent hover:underline mt-4 inline-block">
          Back to Project
        </Link>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const progress = run.pages_total > 0 ? (run.pages_processed / run.pages_total) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <Link to={`/projects/${projectId}`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{run.run_type.replace('_', ' ')}</span>
              <span className="text-slate-300">•</span>
              <div className="flex items-center space-x-1.5">
                {getStatusIcon(run.status)}
                <span className="text-sm font-bold text-slate-700 uppercase">{run.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
            <span>Overall Progress</span>
            <span>{run.pages_processed} / {run.pages_total} Pages</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Findings Placeholder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Findings</h2>
          </div>
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center">
            <Search className="w-8 h-8 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium italic text-sm">Findings list placeholder...</p>
          </div>
        </div>

        {/* Right Column: Pages List Placeholder */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Pages List</h2>
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-medium italic text-sm">Pages list placeholder...</p>
          </div>
        </div>
      </div>
    </div>
  );
};
