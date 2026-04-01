import { useState } from 'react';
import { Project } from '../api/projects.api';
import { useRuns, useUpdateRunStatus } from '../hooks/useRuns';
import { CreateRunModal } from './CreateRunModal';
import { CanDo } from './CanDo';
import { 
  PlayCircle, 
  ChevronRight, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Pause,
  Play,
  Square,
  User,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface RunsTabProps {
  project: Project;
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    case 'running':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Running
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    case 'paused':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
          <Clock className="w-3 h-3 mr-1" />
          Paused
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Stopped
        </span>
      );
    default:
      return null;
  }
};

export const RunsTab = ({ project }: RunsTabProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data: runsData, isLoading } = useRuns(project.id, page);
  const updateStatus = useUpdateRunStatus();
  const navigate = useNavigate();

  const handlePause = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    updateStatus.mutate({ runId, status: 'paused' });
  };

  const handleResume = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    updateStatus.mutate({ runId, status: 'running' });
  };

  const handleStop = (e: React.MouseEvent, runId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to stop this scan?')) {
      updateStatus.mutate({ runId, status: 'cancelled' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <History className="w-5 h-5 mr-2 text-slate-400" />
            QA Run History
          </h3>
          <p className="text-sm text-slate-500 mt-1">Monitor and trigger automated QA sessions for this project.</p>
        </div>
        <CanDo role="qa_engineer">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-unified flex items-center space-x-2"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Start New QA Run</span>
          </button>
        </CanDo>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Run #</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Creator</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Issues Found</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-10 bg-slate-100 rounded-md w-full"></div>
                    </td>
                  </tr>
                ))
              ) : !runsData?.data || runsData.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-slate-100 rounded-full mb-3">
                        <History className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">No runs recorded yet</p>
                      <p className="text-xs text-slate-500 mt-1">Start your first QA session to see results here.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                runsData.data.map((run, index) => (
                  <tr 
                    key={run.id} 
                    className="hover:bg-slate-50 cursor-pointer group transition-colors"
                    onClick={() => navigate(`/projects/${project.id}/runs/${run.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900 tracking-tight">
                        #{(runsData.pagination.total - (page - 1) * runsData.pagination.limit) - index}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        run.run_type === 'pre_release' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        {run.run_type.replace('_', '-')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">
                          {run.created_by_name || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {run.status === 'completed' || run.status === 'failed' ? (
                        <div className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs ${
                          (run.finding_counts ? Object.values(run.finding_counts).reduce((a, b) => (a as number) + (b as number), 0) : 0) > 0 
                            ? 'text-red-600' 
                            : 'text-emerald-600'
                        }`}>
                          {run.finding_counts ? Object.values(run.finding_counts).reduce((a, b) => (a as number) + (b as number), 0) : 0}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {format(new Date(run.created_at), 'MMM d, HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        {(run.status === 'running' || run.status === 'pending' || run.status === 'paused') && (
                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-md border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {run.status === 'running' ? (
                              <button
                                onClick={(e) => handlePause(e, run.id)}
                                disabled={updateStatus.isPending}
                                className="p-1 hover:bg-amber-50 text-amber-600 rounded transition-colors"
                                title="Pause Scan"
                              >
                                <Pause size={14} fill="currentColor" />
                              </button>
                            ) : run.status === 'paused' ? (
                              <button
                                onClick={(e) => handleResume(e, run.id)}
                                disabled={updateStatus.isPending}
                                className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                                title="Resume Scan"
                              >
                                <Play size={14} fill="currentColor" />
                              </button>
                            ) : null}
                            <button
                              onClick={(e) => handleStop(e, run.id)}
                              disabled={updateStatus.isPending}
                              className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                              title="Stop Scan"
                            >
                              <Square size={14} fill="currentColor" />
                            </button>
                          </div>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {runsData && runsData.pagination.total > runsData.pagination.limit && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="text-slate-900">{(page - 1) * runsData.pagination.limit + 1}</span> to <span className="text-slate-900">{Math.min(page * runsData.pagination.limit, runsData.pagination.total)}</span> of <span className="text-slate-900">{runsData.pagination.total}</span> runs
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-unified-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * runsData.pagination.limit >= runsData.pagination.total}
              className="btn-unified-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <CreateRunModal 
        project={project} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};
