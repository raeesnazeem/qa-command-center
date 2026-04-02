import { ProjectWithMembers } from '../api/projects.api';
import { BarChart3, AlertCircle, CheckCircle2, Calendar, Play, Clock, ChevronRight, Loader2, Pause, Square, User, Zap, ListTodo } from 'lucide-react';
import { CanDo } from './CanDo';
import { useRuns, useUpdateRunStatus } from '../hooks/useRuns';
import { useTasks } from '../hooks/useTasks';
import { useRole } from '../hooks/useRole';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ProjectOverviewTabProps {
  project: ProjectWithMembers;
  onStartRun: () => void;
}

export const ProjectOverviewTab = ({ project, onStartRun }: ProjectOverviewTabProps) => {
  const { role: userRole } = useRole();
  const { data: runsData, isLoading: isLoadingRuns } = useRuns(project.id, 1, 5);
  // Fetch assigned tasks if user is a developer
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({ 
    projectId: project.id, 
    status: 'open' 
  });
  
  const updateStatus = useUpdateRunStatus();
  
  const isDeveloper = userRole === 'developer';
  const ongoingRun = runsData?.data?.find(run => run.status === 'running' || run.status === 'pending' || run.status === 'paused');

  const handlePause = (e: React.MouseEvent, runId: string) => {
    e.preventDefault(); e.stopPropagation();
    updateStatus.mutate({ runId, status: 'paused' });
  };

  const handleResume = (e: React.MouseEvent, runId: string) => {
    e.preventDefault(); e.stopPropagation();
    updateStatus.mutate({ runId, status: 'running' });
  };

  const handleStop = (e: React.MouseEvent, runId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (confirm('Are you sure you want to stop this scan?')) {
      updateStatus.mutate({ runId, status: 'cancelled' });
    }
  };

  const stats = [
    {
      label: 'Total Runs',
      value: project.total_runs_count.toString(),
      icon: BarChart3,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Open Issues',
      value: project.open_issues_count.toString(),
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: 'Resolved Issues',
      value: project.resolved_issues_count.toString(),
      icon: CheckCircle2,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Last Run Date',
      value: project.last_run_date ? new Date(project.last_run_date).toLocaleDateString() : 'Never',
      icon: Calendar,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Quick Actions (only for management) */}
      {!isDeveloper && ongoingRun && (
        <div className="flex flex-col space-y-2">
          <Link 
            to={`/projects/${project.id}/runs/${ongoingRun.id}`}
            className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm hover:bg-blue-100 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="relative flex h-3 w-3">
                {ongoingRun.status === 'running' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                  </>
                ) : ongoingRun.status === 'paused' ? (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-blue-900">
                    {ongoingRun.status === 'paused' ? 'Scan Paused' : 'Scan in progress...'}
                  </p>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                    {ongoingRun.status}
                  </span>
                  {(ongoingRun as any).created_by_name && (
                    <span className="text-[10px] font-bold text-blue-600/60 uppercase flex items-center gap-1">
                      <User size={10} />
                      {(ongoingRun as any).created_by_name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-700">
                  {ongoingRun.pages_processed} of {ongoingRun.pages_total} pages processed
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-blue-200 shadow-sm" onClick={(e) => e.stopPropagation()}>
                {ongoingRun.status === 'running' ? (
                  <button
                    onClick={(e) => handlePause(e, ongoingRun.id)}
                    disabled={updateStatus.isPending}
                    className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-md transition-colors"
                    title="Pause Scan"
                  >
                    <Pause size={14} fill="currentColor" />
                  </button>
                ) : ongoingRun.status === 'paused' ? (
                  <button
                    onClick={(e) => handleResume(e, ongoingRun.id)}
                    disabled={updateStatus.isPending}
                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-md transition-colors"
                    title="Resume Scan"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                ) : null}
                <button
                  onClick={(e) => handleStop(e, ongoingRun.id)}
                  disabled={updateStatus.isPending}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-colors"
                  title="Stop Scan"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              </div>
              <div className="flex items-center text-blue-700 text-sm font-bold group-hover:translate-x-1 transition-transform">
                View Details
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </Link>
          
          {(project as any).concurrent_scans > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg w-fit">
              <Zap size={12} className="text-indigo-500 fill-indigo-500" />
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight">
                {(project as any).concurrent_scans} active scans in org
              </span>
            </div>
          )}
        </div>
      )}

      {!isDeveloper && (
        <CanDo role="qa_engineer">
          <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-xl shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Ready to test?</h3>
              <p className="text-slate-500 text-sm">Launch a new QA run to check for regressions.</p>
            </div>
            <button 
              onClick={onStartRun}
              className="btn-unified flex items-center space-x-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start New QA Run</span>
            </button>
          </div>
        </CanDo>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 ${stat.bg} rounded-lg`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Conditional Content: Recent QA Runs (Admins/QA) vs My Tasks (Developers) */}
      {!isDeveloper ? (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-slate-400" />
              Recent QA Runs
            </h3>
            <Link 
              to={`/projects/${project.id}/runs`}
              className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              View All
            </Link>
          </div>
          
          {isLoadingRuns ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : runsData?.data && runsData.data.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {runsData.data.map((run) => (
                <Link 
                  key={run.id}
                  to={`/projects/${project.id}/runs/${run.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-accent transition-colors shadow-sm border border-slate-100`}>
                      {getStatusIcon(run.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                          {run.run_type.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Started {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-slate-900">{run.pages_processed}/{run.pages_total}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-right">Pages</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <BarChart3 className="w-8 h-8 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">No runs yet</h4>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Start your first QA run to see testing history and metrics here.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <ListTodo className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-bold text-slate-900">My Assigned Tasks</h3>
            </div>
            <Link 
              to={`/projects/${project.id}?tab=tasks`}
              className="text-xs font-bold text-accent hover:text-accent/80 transition-colors uppercase tracking-widest"
            >
              View My Tasks
            </Link>
          </div>
          
          {isLoadingTasks ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : tasksData?.data && tasksData.data.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {tasksData.data.map((task: any) => (
                <div 
                  key={task.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${
                      task.severity === 'critical' ? 'bg-red-500' :
                      task.severity === 'high' ? 'bg-orange-500' :
                      task.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-accent transition-colors">{task.title}</h4>
                      <div className="flex items-center mt-1 space-x-3">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                          {task.status}
                        </span>
                        <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase">
                          <User size={10} className="mr-1" />
                          Assignee: {task.users?.full_name || 'You'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mr-4">
                      {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <CheckCircle2 className="w-8 h-8 text-slate-200" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-1">All clear!</h4>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                No open tasks assigned to you for this project.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
