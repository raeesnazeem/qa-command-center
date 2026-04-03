import { useParams, Link } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useRunProgress } from '../hooks/useRunProgress';
import { useAuthAxios } from '../lib/useAuthAxios';
import { PagesTable } from '../components/PagesTable';
import { FindingReviewPanel } from '../components/FindingReviewPanel';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { useFindings, useRunFindings, useUpdateRunStatus, useUpdateFinding, } from '../hooks/useRuns';
import { useCreateTask } from '../hooks/useTasks';
import { AssignMemberModal } from '../components/AssignMemberModal';
import { WooCommerceSection } from '../components/WooCommerceSection';
import { SignOffButton } from '../components/SignOffButton';
import { startVisualDiff } from '../api/visualDiff.api';
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
  ShoppingCart,
  FileSearch,
  Eye,
  ClipboardList,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Download,
  Send
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { QAFinding } from '../api/runs.api';
import toast from 'react-hot-toast';

export const RunDetailPage = () => {
  const { id: projectId, runId } = useParams<{ id: string; runId: string }>();
  const axios = useAuthAxios();
  const updateStatus = useUpdateRunStatus();
  
  const { 
    run, 
    progress, 
    isLive, 
    pagesProcessed, 
    pagesTotal, 
    isLoading: isLoadingRun 
  } = useRunProgress(runId!);
  
  const { data: project, isLoading: isLoadingProject } = useProject(projectId!);
  
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const selectedPage = useMemo(() => run?.pages?.find(p => p.id === selectedPageId) || null, [run?.pages, selectedPageId]);

  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'findings' | 'visual_diff' | 'woocommerce' | 'report'>('overview');

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [prefillFinding, setPrefillFinding] = useState<QAFinding | null>(null);

  const { data: findings, isLoading: isLoadingFindings } = useFindings(selectedPageId);
  const { data: runFindings, isLoading: isLoadingRunFindings } = useRunFindings(runId!);
  const updateFindingMutation = useUpdateFinding(selectedPageId);
  const { mutate: createTask } = useCreateTask();

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ type: 'single' | 'bulk'; ids: string[] }>({ type: 'single', ids: [] });

  useEffect(() => {
    if (!selectedPageId && run?.pages && run.pages.length > 0) {
      setSelectedPageId(run.pages[0].id);
    }
  }, [run?.pages, selectedPageId]);

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
      const targets = (findings || []).filter(f => assignTarget.ids.includes(f.id));
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

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl border border-slate-200 w-full overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={14} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'pages' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSearch size={14} />
          Pages
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'findings' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Search size={14} />
          Findings
        </button>
        <button
          onClick={() => setActiveTab('visual_diff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'visual_diff' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Eye size={14} />
          Visual Diff
        </button>
        {run.is_woocommerce && (
          <button
            onClick={() => setActiveTab('woocommerce')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === 'woocommerce' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingCart size={14} />
            WooCommerce
          </button>
        )}
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'report' 
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList size={14} />
          Report
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-accent" />
                  {isDiscovering ? 'Phase 1: Sitemap Discovery' : 'Phase 2: Scanning Pages'}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                  {isDiscovering 
                    ? 'Identifying all target URLs...' 
                    : run.status === 'completed'
                      ? 'Scan complete. All pages verified.'
                      : `Scanning: ${(run.pages || []).filter((p) => p.status === 'processing' || p.status === 'screenshotted').length} active | ${pagesProcessed} / ${pagesTotal} total`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pages</p>
              <p className="text-2xl font-black text-slate-900">{pagesTotal}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Processed</p>
              <p className="text-2xl font-black text-slate-900">{pagesProcessed}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Issues</p>
              <p className="text-2xl font-black text-red-600">
                {Object.values(run.finding_counts || {}).reduce((a, b) => a + b, 0)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(run.status)}
                <p className="text-base font-black text-slate-900 uppercase tracking-tighter">{run.status}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Scan Steps</h2>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              {pagesProcessed} / {pagesTotal} Completed
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <PagesTable 
              pages={run.pages || []} 
              onPageSelect={(page) => {
                setSelectedPageId(page.id);
                setActiveTab('findings');
              }} 
              showVisuals={run.enabled_checks?.includes('visual_regression') && !!run.figma_url}
            />
          </div>
        </div>
      )}

      {activeTab === 'findings' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Findings Details</h2>
          </div>

          {selectedPage ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm w-full">
              <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 truncate text-lg">{selectedPage.url}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                    {findings?.length || 0} Issues Detected on this page
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('pages')}
                  className="text-[10px] font-black text-accent uppercase tracking-widest hover:text-black transition-colors"
                >
                  Change Page
                </button>
              </div>

              <div className="p-8">
                {/* Visual Evidence */}
                {run.enabled_checks?.includes('visual_regression') && selectedPage && (
                  <div className="mb-12">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Desktop</span>
                        <div className="aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden">
                          {selectedPage.screenshot_url_desktop && <img src={selectedPage.screenshot_url_desktop} className="w-full h-full object-cover object-top" alt="Desktop" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Tablet</span>
                        <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden">
                          {selectedPage.screenshot_url_tablet && <img src={selectedPage.screenshot_url_tablet} className="w-full h-full object-cover object-top" alt="Tablet" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Mobile</span>
                        <div className="aspect-[9/16] bg-slate-100 rounded-xl overflow-hidden">
                          {selectedPage.screenshot_url_mobile && <img src={selectedPage.screenshot_url_mobile} className="w-full h-full object-cover object-top" alt="Mobile" />}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Findings List */}
                {isLoadingFindings ? (
                  <div className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
                  </div>
                ) : findings && findings.length > 0 && selectedPage ? (
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
                ) : (
                  <div className="py-20 text-center bg-emerald-50/20 rounded-3xl border border-dashed border-emerald-100">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
                    <p className="text-slate-900 font-black uppercase tracking-tight">Audit Cleared</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-24 text-center">
              <Search className="w-10 h-10 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-900 font-black uppercase tracking-tight">Intelligence Ready</p>
              <button 
                onClick={() => setActiveTab('pages')}
                className="mt-4 text-[10px] font-black text-accent uppercase tracking-widest hover:text-black transition-colors"
              >
                Select a page to view findings
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'visual_diff' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Visual Diff Analysis</h2>
            {run.status === 'completed' && (
              <button 
                onClick={async () => {
                  try {
                    await startVisualDiff(axios, runId!);
                    toast.success('Visual diff analysis started');
                  } catch (err) {
                    toast.error('Failed to start visual diff');
                  }
                }}
                className="btn-unified"
              >
                Re-run Analysis
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-12 text-center max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
                <Eye size={40} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Compare Design vs. Implementation</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                The Visual Diff engine uses AI to compare your Figma designs against the live site screenshots across desktop, tablet, and mobile breakpoints.
              </p>
              
              <Link 
                to={`/projects/${projectId}/runs/${runId}/diff`}
                className="btn-unified inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-#93c0b1-800 transition-all shadow-sm active:scale-95"
              >
                Open Diff Workspace
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="bg-slate-50 p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Frames</p>
                <p className="text-xl font-black text-slate-900">{run.pages_total || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visual Issues</p>
                <p className="text-xl font-black text-red-600">
                  {runFindings?.filter(f => f.check_factor === 'visual_diff').length || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Figma Baseline</p>
                <p className="text-xs font-bold text-slate-600 truncate max-w-[200px]">
                  {run.figma_url ? run.figma_url.split('/').pop() : 'No baseline set'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'woocommerce' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          {isLoadingRunFindings ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-4 tracking-widest">Loading commerce reports...</p>
            </div>
          ) : (
            <WooCommerceSection findings={runFindings || []} />
          )}
        </div>
      )}

      {activeTab === 'report' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Report Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Executive QA Report</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Summary and official sign-off for Run #{runId?.substring(0, 8)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
                onClick={() => toast.success('PDF Generation started')}
              >
                <Download size={14} />
                Export PDF
              </button>
              {run.status === 'completed' && (
                <SignOffButton runId={runId!} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Stats & Summary */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Quality Score</h3>
                  <div className="flex items-end gap-4">
                    <p className="text-6xl font-black text-slate-900 leading-none">
                      {Math.max(0, 100 - (Object.values(run.finding_counts || {}).reduce((a, b) => a + b, 0) * 2))}%
                    </p>
                    <div className="pb-1">
                      <p className="text-xs font-bold text-emerald-600 uppercase">Healthy</p>
                      <p className="text-[10px] text-slate-400 font-medium">Based on issue density</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Critical</p>
                    <p className="text-2xl font-black text-red-600">{run.finding_counts?.critical || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">High</p>
                    <p className="text-2xl font-black text-orange-500">{run.finding_counts?.high || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Medium</p>
                    <p className="text-2xl font-black text-amber-500">{run.finding_counts?.medium || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Low</p>
                    <p className="text-2xl font-black text-blue-500">{run.finding_counts?.low || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Finding Categories</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Visual Consistency', count: runFindings?.filter(f => f.check_factor === 'visual_diff').length || 0, color: 'bg-blue-500' },
                    { label: 'Performance', count: runFindings?.filter(f => f.check_factor === 'performance').length || 0, color: 'bg-emerald-500' },
                    { label: 'Accessibility', count: runFindings?.filter(f => f.check_factor === 'accessibility').length || 0, color: 'bg-purple-500' },
                    { label: 'Console Errors', count: runFindings?.filter(f => f.check_factor === 'console_error').length || 0, color: 'bg-red-500' },
                  ].map((cat, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                        <span className="text-slate-600">{cat.label}</span>
                        <span className="text-slate-900">{cat.count} Issues</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${cat.color} rounded-full`} 
                          style={{ width: `${Math.min(100, (cat.count / (runFindings?.length || 1)) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Run Info & Actions */}
            <div className="space-y-8">
              <div className="bg-slate-900 rounded-3xl p-8 text-white">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Run Details</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Started At</p>
                    <p className="text-sm font-bold mt-1">{run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Completed At</p>
                    <p className="text-sm font-bold mt-1">{run.completed_at ? new Date(run.completed_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Run Type</p>
                    <p className="text-sm font-bold mt-1 uppercase">{run.run_type.replace('_', ' ')}</p>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <button 
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-2"
                      onClick={() => toast.success('Report shared with team')}
                    >
                      <Send size={14} />
                      Share Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
