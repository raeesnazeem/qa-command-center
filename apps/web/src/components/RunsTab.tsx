import { ProjectWithMembers } from '../api/projects.api';
import { useRuns } from '../hooks/useRuns';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  ChevronRight, 
  BarChart3, 
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';

interface RunsTabProps {
  project: ProjectWithMembers;
}

export const RunsTab = ({ project }: RunsTabProps) => {
  const { data: runs, isLoading } = useRuns(project.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'running': return 'bg-accent/10 text-accent border-accent/20';
      case 'failed': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">QA Execution History</h2>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter runs..." 
              className="bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent transition-all w-full md:w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <div className="flex items-center space-x-1 cursor-pointer hover:text-slate-600 transition-colors">
                    <span>Run ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pages</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <div className="flex items-center space-x-1 cursor-pointer hover:text-slate-600 transition-colors">
                    <span>Started</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Clock className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
                    <p className="text-sm text-slate-500 font-medium">Loading execution history...</p>
                  </td>
                </tr>
              ) : !runs || runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <BarChart3 className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-1">No runs recorded</h4>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                      Start your first QA run to see the results and history here.
                    </p>
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link 
                        to={`/projects/${project.id}/runs/${run.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-accent transition-colors"
                      >
                        #{run.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight">
                        {run.run_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-xs font-bold text-slate-900">{run.pages_processed}/{run.pages_total}</div>
                        <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent rounded-full transition-all duration-500" 
                            style={{ width: `${run.pages_total > 0 ? (run.pages_processed / run.pages_total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-medium text-slate-500">
                        {new Date(run.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/projects/${project.id}/runs/${run.id}`}
                        className="inline-flex items-center text-xs font-bold text-accent hover:text-accent/80 transition-colors uppercase tracking-widest"
                      >
                        Details
                        <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
