import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useRunProgress } from '../hooks/useRunProgress';
import { PagesTable } from '../components/PagesTable';
import { useUpdateRunStatus, useFindings } from '../hooks/useRuns';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  Search,
  Activity,
  Pause,
  Play,
  Square,
  User,
  LayoutDashboard,
  AlertTriangle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { useEffect, useState } from 'react';

export const RunDetailPage = () => {
  const { id: projectId, runId } = useParams<{ id: string; runId: string }>();
  const updateStatus = useUpdateRunStatus();
  
  // 1. Use the unified progress hook (Polling + Realtime)
  const { 
    run, 
    progress, 
    isLive, 
    pagesProcessed, 
    pagesTotal, 
    isLoading: isLoadingRun 
  } = useRunProgress(runId!);
  
  const { data: project, isLoading: isLoadingProject } = useProject(projectId!);
  
  // 2. State for selected page ID to ensure it stays in sync with realtime updates
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const selectedPage = run?.pages?.find(p => p.id === selectedPageId) || null;

  // 2b. Fetch findings for the selected page
  const { data: findings, isLoading: isLoadingFindings } = useFindings(selectedPageId);

  // Auto-select first page when pages load
  useEffect(() => {
    if (!selectedPageId && run?.pages && run.pages.length > 0) {
      setSelectedPageId(run.pages[0].id);
    }
  }, [run?.pages, selectedPageId]);

  // 3. ETA Calculation
  const [eta, setEta] = useState<string | null>(null);

  useEffect(() => {
    if (run?.status === 'running' && run.started_at && pagesTotal > 0 && pagesProcessed > 0) {
      const startTime = new Date(run.started_at).getTime();
      const now = new Date().getTime();
      const elapsedMs = now - startTime;
      
      const msPerPage = elapsedMs / pagesProcessed;
      const remainingPages = pagesTotal - pagesProcessed;
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
  }, [pagesProcessed, pagesTotal, run?.status, run?.started_at]);

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

  const isCrawlComplete = run.status === 'completed' || (pagesTotal > 0 && pagesProcessed === pagesTotal);
  const isDiscovering = run.status === 'running' && pagesTotal === 0 && (!run.selected_urls || run.selected_urls.length === 0);

  const handlePause = () => {
    updateStatus.mutate({ runId: run.id, status: 'paused' });
  };

  const handleResume = () => {
    updateStatus.mutate({ runId: run.id, status: 'running' });
  };

  const handleStop = () => {
    if (confirm('Are you sure you want to stop this scan? It cannot be resumed.')) {
      updateStatus.mutate({ runId: run.id, status: 'cancelled' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
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
                {isLive && (
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
                {run.created_by_name && (
                  <>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100">
                      <User size={12} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">{run.created_by_name}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {(run.status === 'running' || run.status === 'pending' || run.status === 'paused') && (
              <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm mr-4">
                {run.status === 'running' ? (
                  <button
                    onClick={handlePause}
                    disabled={updateStatus.isPending}
                    className="p-1 hover:bg-amber-50 text-amber-600 rounded transition-colors"
                    title="Pause Scan"
                  >
                    <Pause size={16} fill="currentColor" />
                  </button>
                ) : run.status === 'paused' ? (
                  <button
                    onClick={handleResume}
                    disabled={updateStatus.isPending}
                    className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                    title="Resume Scan"
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                ) : null}
                <button
                  onClick={handleStop}
                  disabled={updateStatus.isPending}
                  className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                  title="Stop Scan"
                >
                  <Square size={16} fill="currentColor" />
                </button>
              </div>
            )}

            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/admin/queues`}
              target="_blank"
              rel="noreferrer"
              className="btn-unified flex items-center gap-2"
              title="View BullMQ Dashboard"
            >
              <LayoutDashboard size={14} />
              <span>Queue Dashboard</span>
            </a>

            {run.status === 'running' && !isDiscovering && (
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900 leading-none">{Math.round(progress)}%</p>
                {eta && <p className="text-xs font-bold text-blue-500 uppercase mt-1 tracking-widest">{eta}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                {isDiscovering ? 'Sitemap Discovery' : 'Crawl Progress'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isDiscovering 
                  ? 'Analyzing site structure and discovering pages...' 
                  : `${pagesProcessed} of ${pagesTotal || '?'} pages crawled`
                }
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
              style={{ width: `${isDiscovering ? 100 : Math.max(2, progress)}%` }}
            >
              {run.status === 'running' && (
                <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Pages Section - Centered above Findings */}
        <div className="space-y-6 flex flex-col items-center w-full">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-bold text-slate-900">Scan Steps</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
                {pagesProcessed} / {pagesTotal} Completed
              </span>
            </div>
          </div>
          <div className="w-full">
            <PagesTable 
              pages={run.pages || []} 
              selectedUrls={run.selected_urls}
              onPageSelect={(page) => setSelectedPageId(page.id)} 
            />
          </div>
        </div>

        {/* Findings Section */}
        <div className="space-y-6 flex flex-col w-full">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-bold text-slate-900">Findings Details</h2>
          </div>
          {selectedPage ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm w-full">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate pr-4">{selectedPage.url}</h3>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest">
                    Step Results: {findings?.length || 0} Issues Found
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPage.finding_counts && Object.entries(selectedPage.finding_counts).map(([factor, count]) => (
                    <span key={factor} className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-black uppercase border border-red-100">
                      {factor.replace('_', ' ')}: {count}
                    </span>
                  ))}
                </div>
              </div>

              {isLoadingFindings ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  <p className="text-sm text-slate-400 font-medium italic">Loading detailed findings...</p>
                </div>
              ) : findings && findings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {findings.map((finding) => (
                    <div 
                      key={finding.id} 
                      className="group p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-accent/20 hover:bg-white transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                          finding.severity === 'critical' ? 'bg-red-100 text-red-600' :
                          finding.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                          finding.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {finding.severity === 'critical' ? <ShieldAlert size={16} /> :
                           finding.severity === 'high' ? <AlertTriangle size={16} /> :
                           finding.severity === 'medium' ? <AlertCircle size={16} /> :
                           <Info size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                              finding.severity === 'critical' ? 'bg-red-50 border-red-100 text-red-600' :
                              finding.severity === 'high' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                              finding.severity === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                              'bg-blue-50 border-blue-100 text-blue-600'
                            }`}>
                              {finding.severity}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                              {finding.check_factor.replace('_', ' ')}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-accent transition-colors">
                            {finding.title}
                          </h4>
                          {finding.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {finding.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold text-sm">No issues found on this page</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Check looks clean!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400 font-medium italic text-sm">Select a page step above to view findings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
