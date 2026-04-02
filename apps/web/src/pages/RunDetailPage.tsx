import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useRunProgress } from '../hooks/useRunProgress';
import { PagesTable } from '../components/PagesTable';
import { FindingReviewPanel } from '../components/FindingReviewPanel';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { useFindings, useUpdateRunStatus, useUpdateFinding } from '../hooks/useRuns';
import { useCreateTask } from '../hooks/useTasks';
import { AssignMemberModal } from '../components/AssignMemberModal';
import toast from 'react-hot-toast';
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
  FileSearch,
  Monitor,
  Smartphone,
  Tablet,
  Eye
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { QAFinding } from '../api/runs.api';

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

  // Task Creation State
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [prefillFinding, setPrefillFinding] = useState<QAFinding | null>(null);

  // 2b. Fetch findings for the selected page
  const { data: findings, isLoading: isLoadingFindings } = useFindings(selectedPageId);
  const updateFindingMutation = useUpdateFinding(selectedPageId);
  const { mutate: createTask } = useCreateTask();

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ type: 'single' | 'bulk'; ids: string[] }>({ type: 'single', ids: [] });

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

  const handleConfirmFinding = async (id: string) => {
    updateFindingMutation.mutate({ findingId: id, data: { status: 'confirmed' } });
  };

  const handleFalsePositiveFinding = async (id: string) => {
    updateFindingMutation.mutate({ findingId: id, data: { status: 'false_positive' } });
  };

  const handleCreateTaskForFinding = (finding: QAFinding) => {
    setPrefillFinding(finding);
    setIsCreateTaskModalOpen(true);
  };

  const handleBulkConfirm = async (ids: string[]) => {
    ids.forEach(id => {
      updateFindingMutation.mutate({ findingId: id, data: { status: 'confirmed' } });
    });
  };

  const handleBulkFalsePositive = async (ids: string[]) => {
    ids.forEach(id => {
      updateFindingMutation.mutate({ findingId: id, data: { status: 'false_positive' } });
    });
  };

  const handleBulkAssign = (ids: string[]) => {
    setAssignTarget({ type: 'bulk', ids });
    setIsAssignModalOpen(true);
  };

  const handleSingleAssign = (id: string) => {
    setAssignTarget({ type: 'single', ids: [id] });
    setIsAssignModalOpen(true);
  };

  const handleAssignFinding = async (userId: string) => {
    try {
      // For findings, assigning means creating a task for each finding assigned to that user
      // or we can just mark it if our backend supports direct finding assignment.
      // Current architecture: Finding -> Create Task -> Assign Task.
      // If we want "Assign" directly from findings, we create a task for each.
      
      const targets = findings?.filter(f => assignTarget.ids.includes(f.id)) || [];
      
      for (const finding of targets) {
        createTask({
          project_id: projectId!,
          finding_id: finding.id,
          title: finding.title,
          description: finding.description || '',
          severity: finding.severity,
          assigned_to: userId
        });
      }
      
      setIsAssignModalOpen(false);
    } catch (error) {
      toast.error('Failed to assign findings');
    }
  };

  const handleBulkCreateTasks = (selectedFindings: QAFinding[]) => {
    selectedFindings.forEach(finding => {
      createTask({
        project_id: projectId!,
        finding_id: finding.id,
        title: finding.title,
        description: finding.description || '',
        severity: finding.severity
      });
    });
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
              className="btn-unified flex items-center gap-2 rounded-[10px]"
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

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                {isDiscovering ? 'Phase 1: Sitemap Discovery' : 'Phase 2: Scanning Pages'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isDiscovering 
                  ? 'Identifying all target URLs...' 
                  : run.status === 'completed'
                    ? 'Scan complete. All pages verified.'
                    : `Scanning: ${(run.pages || []).filter((p) => p.status === 'processing' || p.status === 'screenshotted').length} active | ${pagesProcessed} / ${pagesTotal} total`
                }
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-xl font-black text-slate-900">
                {isDiscovering ? '...' : run.status === 'completed' ? '100%' : `${Math.max(1, Math.round(progress))}%`}
              </p>
            </div>
          </div>

          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${
                run.status === 'failed' ? 'bg-red-500' : 'bg-accent'
              }`}
              style={{ 
                width: isDiscovering 
                  ? '40%' 
                  : run.status === 'completed'
                    ? '100%'
                    : `${Math.max(2, progress)}%` 
              }}
            >
              {(run.status === 'running' || isDiscovering) && (
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
              onPageSelect={(page) => setSelectedPageId(page.id)} 
              showVisuals={run.enabled_checks?.includes('visual_regression') && !!run.figma_url}
            />
          </div>
        </div>

        {/* Findings Section */}
        <div className="space-y-6 flex flex-col w-full">
          <div className="flex items-center justify-between w-full border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">

              <div>
                <h2 className="text-xl font-bold text-slate-900">Findings Details</h2>
                <p className="text-xs text-slate-500 font-medium">Detailed audit results for the selected scan step</p>
              </div>
            </div>
          </div>

          {selectedPage ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full transition-all">
              {/* Selected Page Header */}
              <div className="bg-slate-50 border-b border-slate-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate pr-4 text-lg">{selectedPage.url}</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.15em] flex items-center gap-2 mt-1">
                      <Activity size={12} className="text-accent" />
                      Step Results: <span className="text-slate-900">{findings?.length || 0} Issues Detected</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedPage.finding_counts && Object.entries(selectedPage.finding_counts).map(([factor, count]) => (
                      <div key={factor} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                          {factor.replace(/_/g, ' ')}: <span className="text-red-600">{count}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Visual Regression Proof Section */}
                {run.enabled_checks?.includes('visual_regression') && run.figma_url && (
                  <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-px flex-1 bg-slate-100" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap px-4">
                        Visual Evidence
                      </h4>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <div className="p-8 bg-black rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative group/viz">
                      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover/viz:scale-110 transition-transform duration-1000">
                        <Monitor size={160} className="text-white" />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                          <div className="space-y-1.5">
                            <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] flex items-center gap-2">
                              <Eye size={14} className="animate-pulse" />
                              Visual Regression
                            </h4>
                            <p className="text-white font-bold text-2xl tracking-tight">
                              {run.figma_url ? 'Figma vs. Live Comparison' : 'Baseline vs. Live Analysis'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(147,192,177,0.1)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                              {selectedPage.status === 'done' || selectedPage.status === 'screenshotted' ? 'Scan Verified' : 'Processing Evidence'}
                            </div>
                            {run.figma_url && (
                              <a 
                                href={run.figma_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="group/figma flex items-center gap-2 text-[10px] text-slate-400 hover:text-white transition-all font-black uppercase tracking-widest"
                              >
                                <span>Source Figma File</span>
                                <div className="h-px w-4 bg-slate-700 group-hover/figma:w-8 transition-all bg-accent" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                          {/* Desktop */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-slate-400 px-1">
                              <div className="flex items-center gap-2">
                                <Monitor size={14} className="text-accent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Desktop</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-600 uppercase">1440px</span>
                            </div>
                            <div className="aspect-[16/10] bg-slate-900 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center group/img cursor-pointer relative shadow-inner">
                              {selectedPage.screenshot_url_desktop ? (
                                <>
                                  <img 
                                    src={selectedPage.screenshot_url_desktop} 
                                    alt="Desktop Screenshot" 
                                    className="w-full h-full object-cover object-top group-hover/img:scale-105 transition-transform duration-700"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transform translate-y-4 group-hover/img:translate-y-0 transition-transform">Expand View</div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center gap-4 text-slate-700">
                                  <Loader2 size={24} className="animate-spin text-accent/20" />
                                  <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Waiting for Capture</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tablet */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-slate-400 px-1">
                              <div className="flex items-center gap-2">
                                <Tablet size={14} className="text-accent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tablet</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-600 uppercase">768px</span>
                            </div>
                            <div className="aspect-[3/4] max-w-[220px] mx-auto bg-slate-900 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center group/img cursor-pointer relative shadow-inner">
                              {selectedPage.screenshot_url_tablet ? (
                                <>
                                  <img 
                                    src={selectedPage.screenshot_url_tablet} 
                                    alt="Tablet Screenshot" 
                                    className="w-full h-full object-cover object-top group-hover/img:scale-105 transition-transform duration-700"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transform translate-y-4 group-hover/img:translate-y-0 transition-transform">Expand</div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center gap-4 text-slate-700">
                                  <Loader2 size={24} className="animate-spin text-accent/20" />
                                  <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Waiting</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Mobile */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-slate-400 px-1">
                              <div className="flex items-center gap-2">
                                <Smartphone size={14} className="text-accent" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mobile</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-600 uppercase">375px</span>
                            </div>
                            <div className="aspect-[9/16] max-w-[160px] mx-auto bg-slate-900 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center group/img cursor-pointer relative shadow-inner">
                              {selectedPage.screenshot_url_mobile ? (
                                <>
                                  <img 
                                    src={selectedPage.screenshot_url_mobile} 
                                    alt="Mobile Screenshot" 
                                    className="w-full h-full object-cover object-top group-hover/img:scale-105 transition-transform duration-700"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transform translate-y-4 group-hover/img:translate-y-0 transition-transform">Expand</div>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center gap-4 text-slate-700">
                                  <Loader2 size={24} className="animate-spin text-accent/20" />
                                  <span className="text-[9px] font-black uppercase tracking-widest animate-pulse">Waiting</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit Findings Grid */}
                <div>
                  <div className="flex items-center gap-2 mb-8">
                    <div className="h-px flex-1 bg-slate-100" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap px-4">
                      Audit Findings
                    </h4>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  {isLoadingFindings ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                      <div className="relative">
                        <Loader2 className="w-10 h-10 text-black animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                        </div>
                      </div>
                      <p className="mt-4 text-sm text-slate-900 font-black uppercase tracking-widest">Aggregating Audit Reports</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">Syncing with scanning workers...</p>
                    </div>
                  ) : findings && findings.length > 0 ? (
                    <FindingReviewPanel 
                      findings={findings}
                      pageScreenshots={{
                        desktop: selectedPage.screenshot_url_desktop,
                        tablet: selectedPage.screenshot_url_tablet,
                        mobile: selectedPage.screenshot_url_mobile
                      }}
                      onSingleConfirm={handleConfirmFinding}
                      onSingleFalsePositive={handleFalsePositiveFinding}
                      onSingleCreateTask={handleCreateTaskForFinding}
                      onConfirmBulk={handleBulkConfirm}
                      onFalsePositiveBulk={handleBulkFalsePositive}
                      onCreateTasksBulk={handleBulkCreateTasks}
                      onAssignBulk={handleBulkAssign}
                      onSingleAssign={handleSingleAssign}
                    />
                  ) : (selectedPage.status !== 'done' && selectedPage.status !== 'failed' && selectedPage.status !== 'checked') ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-blue-50/20 rounded-3xl border border-dashed border-blue-100 italic">
                      <Activity className="w-8 h-8 text-blue-400 animate-pulse mb-3" />
                      <p className="text-slate-900 font-black text-sm uppercase tracking-tight">Crawl In Progress</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Analyzing quality factors... {selectedPage.current_step}</p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/20 rounded-3xl border border-dashed border-emerald-100 p-16 text-center group/clean">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover/clean:scale-110 transition-transform duration-500">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                      </div>
                      <p className="text-slate-900 font-black text-lg uppercase tracking-tight">Audit Cleared</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">No scan findings detected on this page</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-24 text-center group/select">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 group-hover/select:translate-y-[-4px] transition-all">
                <Search className="w-10 h-10 text-slate-200 group-hover/select:text-accent transition-colors" />
              </div>
              <p className="text-slate-900 font-black text-base uppercase tracking-tight">Intelligence Ready</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Select a scan step above to analyze findings</p>
            </div>
          )}
        </div>
      </div>
      <CreateTaskModal 
        isOpen={isCreateTaskModalOpen}
        onClose={() => {
          setIsCreateTaskModalOpen(false);
          setPrefillFinding(null);
        }}
        projectId={projectId}
        prefillData={prefillFinding ? {
          finding_id: prefillFinding.id,
          title: prefillFinding.title,
          description: prefillFinding.description || '',
          severity: prefillFinding.severity
        } : undefined}
      />
      <AssignMemberModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        projectId={projectId!}
        onAssign={handleAssignFinding}
        title={assignTarget.type === 'bulk' ? `Assign ${assignTarget.ids.length} Findings` : 'Assign Finding'}
      />
    </div>
  );
};
