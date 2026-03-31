import { useParams, Link } from 'react-router-dom';
import { useRun } from '../hooks/useRuns';
import { useProject } from '../hooks/useProjects';
import { useRunRealtime } from '../hooks/useRunRealtime';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  FileText,
  Search,
  Activity
} from 'lucide-react';
import { useEffect, useState } from 'react';

export const RunDetailPage = () => {
  const { id: projectId, runId } = useParams<{ id: string; runId: string }>();
  
  // 1. Primary data fetch with 3s polling fallback
  const { data: run, isLoading: isLoadingRun } = useRun(runId!);
  const { data: project, isLoading: isLoadingProject } = useProject(projectId!);
  
  // 2. Realtime subscription for instant UI updates
  const { isConnected: isRealtimeConnected } = useRunRealtime(runId!);

  // 3. ETA Calculation
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    if (run?.status === 'running' && run.started_at && run.pages_total > 0 && run.pages_processed > 0) {
      const startTime = new Date(run.started_at).getTime();
      const now = new Date().getTime();
      const elapsedMs = now - startTime;
      
      const msPerPage = elapsedMs / run.pages_processed;
      const remainingPages = run.pages_total - run.pages_processed;
      const remainingMs = remainingPages * msPerPage;

      if (remainingMs > 0) {
        const remainingSecs = Math.ceil(remainingMs / 1000);
        if (remainingSecs < 60) {
          setEta(`${remainingSecs}s remaining`);
        } else {
          setEta(`${Math.ceil(remainingSecs / 60)}m remaining`);
        }
      }
    } else {
      setEta(null);
    }
  }, [run?.pages_processed, run?.pages_total, run?.status, run?.started_at]);

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
      case 'running': return (
        <div className="relative flex h-3 w-3 mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </div>
      );
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const progress = run.pages_total > 0 ? (run.pages_processed / run.pages_total) * 100 : 0;
  const isCrawlComplete = run.status === 'completed' || (run.pages_total > 0 && run.pages_processed === run.pages_total);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to={`/projects/${projectId}`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                {isRealtimeConnected && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 border border-emerald-100 uppercase tracking-tighter">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
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

          {run.status === 'running' && (
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900 leading-none">{Math.round(progress)}%</p>
              {eta && <p className="text-xs font-bold text-blue-500 uppercase mt-1 tracking-widest">{eta}</p>}
            </div>
          )}
        </div>

        {/* Progress Bar Container */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                Crawl Progress
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {run.pages_processed} of {run.pages_total || '?'} pages crawled
              </p>
            </div>
            
            {isCrawlComplete && run.status === 'completed' && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-tight">Crawl complete! Reviewing findings...</span>
              </div>
            )}
          </div>

          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                run.status === 'failed' ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
              }`}
              style={{ width: `${Math.max(2, progress)}%` }}
            >
              {run.status === 'running' && (
                <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
              )}
            </div>
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
