import { useParams, Link } from 'react-router-dom';
import { useRun } from '../hooks/useRuns';
import { 
  ChevronLeft, 
  PlayCircle, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Globe, 
  Layout, 
  ExternalLink,
  Loader2,
  FileText,
  ShieldAlert,
  Search
} from 'lucide-react';

export const RunDetailPage = () => {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const { data: run, isLoading, isError, error } = useRun(runId!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading run details...</p>
        </div>
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Run not found</h2>
          <p className="text-red-600 mb-8">
            {error instanceof Error ? error.message : "The run you're looking for doesn't exist or you don't have access."}
          </p>
          <Link 
            to={`/projects/${id}`}
            className="inline-flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-md font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Project</span>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'running': return 'bg-accent/10 text-accent border-accent/20';
      case 'failed': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs & Back */}
      <div className="flex items-center space-x-4">
        <Link 
          to={`/projects/${id}`} 
          className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex items-center space-x-2 text-sm font-medium text-slate-400">
          <Link to="/projects" className="hover:text-accent transition-colors">Projects</Link>
          <span>/</span>
          <Link to={`/projects/${id}`} className="hover:text-accent transition-colors">Project Details</Link>
          <span>/</span>
          <span className="text-slate-900">Run #{run.id.slice(0, 8)}</span>
        </div>
      </div>

      {/* Header Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Run #{run.id.slice(0, 8)}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(run.status)} flex items-center space-x-1.5`}>
                {getStatusIcon(run.status)}
                <span>{run.status}</span>
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center text-slate-500">
                <PlayCircle className="w-4 h-4 mr-2 text-accent" />
                <span className="font-bold uppercase tracking-widest text-[10px] mr-2">Type</span>
                <span className="text-slate-900 font-semibold uppercase">{run.run_type.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center text-slate-500">
                <Globe className="w-4 h-4 mr-2 text-accent" />
                <a 
                  href={run.site_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-900 font-semibold hover:text-accent transition-colors flex items-center"
                >
                  {run.site_url.replace(/^https?:\/\//, '')}
                  <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                </a>
              </div>
              <div className="flex items-center text-slate-500">
                <Clock className="w-4 h-4 mr-2 text-accent" />
                <span className="font-bold uppercase tracking-widest text-[10px] mr-2">Started</span>
                <span className="text-slate-900 font-semibold">
                  {new Date(run.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden md:block">
              <div className="text-2xl font-bold text-slate-900">{run.pages_processed}/{run.pages_total}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pages Processed</div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-accent flex items-center justify-center">
              <span className="text-xs font-bold text-slate-900">
                {run.pages_total > 0 ? Math.round((run.pages_processed / run.pages_total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Findings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Findings ({run.findings.length})</h2>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-white rounded-md border border-transparent hover:border-slate-100 transition-all">
                <Search className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {run.findings.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No issues found</h3>
                <p className="text-slate-500 text-sm">Great! No regressions or accessibility issues were detected during this run.</p>
              </div>
            ) : (
              run.findings.map((finding: any) => (
                <div key={finding.id} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          finding.severity === 'critical' ? 'bg-red-50 text-red-600 border-red-100' :
                          finding.severity === 'high' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {finding.severity}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{finding.check_factor.replace('_', ' ')}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 group-hover:text-accent transition-colors">{finding.title}</h4>
                      <p className="text-sm text-slate-500 line-clamp-2">{finding.description}</p>
                      <div className="flex items-center space-x-4 text-xs font-medium text-slate-400">
                        <div className="flex items-center">
                          <Layout className="w-3 h-3 mr-1.5" />
                          <span>{finding.page_url.replace(run.site_url, '') || '/'}</span>
                        </div>
                      </div>
                    </div>
                    {finding.screenshot_url && (
                      <div className="w-24 h-24 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                        <img src={finding.screenshot_url} alt="Finding screenshot" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Pages & Meta */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Processed Pages</h2>
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-50">
              {run.pages.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  No pages recorded for this run.
                </div>
              ) : (
                run.pages.map((page: any) => (
                  <div key={page.id} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <FileText className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <div className="text-sm font-bold text-slate-900 truncate">{page.title || 'Untitled Page'}</div>
                        <div className="text-[10px] font-bold text-slate-400 truncate">{page.url.replace(run.site_url, '') || '/'}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      page.status === 'done' ? 'bg-emerald-50 text-emerald-500' :
                      page.status === 'error' ? 'bg-red-50 text-red-500' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {page.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-accent" />
              Run Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Enabled Checks</div>
                <div className="flex flex-wrap gap-2">
                  {run.enabled_checks.map((check: string) => (
                    <span key={check} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-md border border-slate-100">
                      {check.replace('_', ' ')}
                    </span>
                  ))}
                  {run.enabled_checks.length === 0 && <span className="text-xs text-slate-400 italic">None</span>}
                </div>
              </div>
              {run.figma_url && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Design Spec</div>
                  <a 
                    href={run.figma_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-semibold text-accent hover:underline flex items-center"
                  >
                    View in Figma
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
