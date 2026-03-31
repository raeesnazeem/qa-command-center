import { useUser } from '@clerk/react';
import { 
  AlertCircle, 
  PlayCircle, 
  CheckSquare, 
  Layers, 
  ChevronRight, 
  Clock, 
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStats } from '../hooks/useDashboard';
import { useRole } from '../hooks/useRole';
import { format } from 'date-fns';

export const DashboardPage = () => {
  const { user } = useUser();
  const { data, isLoading } = useDashboardStats();
  const { role } = useRole();

  const isManagement = ['super_admin', 'admin', 'sub_admin', 'project_manager'].includes(role || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const stats = [
    { 
      label: 'Open Issues', 
      value: data?.open_issues ?? 0, 
      icon: AlertCircle, 
      color: (data?.open_issues ?? 0) > 0 ? 'text-red-600' : 'text-slate-600',
      bg: (data?.open_issues ?? 0) > 0 ? 'bg-red-50' : 'bg-slate-50',
      trend: '+12%' 
    },
    { 
      label: 'Active Runs', 
      value: data?.runs_this_week ?? 0, 
      icon: PlayCircle, 
      color: 'text-accent', 
      bg: 'bg-accent/10',
      trend: '+5%' 
    },
    { 
      label: 'My Open Tasks', 
      value: data?.my_open_tasks ?? 0, 
      icon: CheckSquare, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50',
      trend: '-2' 
    },
    { 
      label: 'Total Projects', 
      value: data?.projects_count ?? 0, 
      icon: Layers, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      trend: 'Static' 
    },
  ];

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          {getTimeGreeting()}, {user?.firstName || 'User'}
        </h1>
        <p className="text-slate-500 mt-1">Here's what's happening across your projects today.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 ${stat.bg} rounded-lg`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-1" /> {stat.trend}
              </span>
            </div>
            <div className={`text-3xl font-black ${stat.label === 'Open Issues' && (data?.open_issues ?? 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {stat.value}
            </div>
            <div className="text-sm text-slate-500 font-medium mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent QA Runs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center">
              <PlayCircle className="w-4 h-4 mr-2 text-slate-400" />
              Recent QA Runs
            </h3>
            <Link to="/projects" className="text-xs font-bold text-accent hover:underline">View All Projects</Link>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.recent_runs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400 italic">No recent runs found</td>
                  </tr>
                ) : (
                  data?.recent_runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <Link to={`/projects/${run.project_id}/runs/${run.id}`} className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors">
                          {(run as any).projects?.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {run.run_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            run.status === 'completed' ? 'bg-emerald-500' : 
                            run.status === 'running' ? 'bg-accent animate-pulse' : 
                            run.status === 'failed' ? 'bg-red-500' : 'bg-slate-300'
                          }`} />
                          <span className="text-xs font-medium text-slate-600 capitalize">{run.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {format(new Date(run.created_at), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Tasks Side Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center">
              <CheckSquare className="w-4 h-4 mr-2 text-slate-400" />
              My Tasks
            </h3>
            <Link to="/tasks" className="text-xs font-bold text-accent hover:underline">View All</Link>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm divide-y divide-slate-50">
            {data?.my_tasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 italic">
                You have no open tasks.
              </div>
            ) : (
              data?.my_tasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors line-clamp-1">{task.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{(task as any).projects?.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-accent transform group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex items-center mt-3 space-x-2">
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      task.severity === 'critical' ? 'bg-red-50 text-red-600 border-red-100' :
                      task.severity === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                      'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {task.severity}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {format(new Date(task.created_at), 'MMM d')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pending Sign-offs (Only for PM/Admin) */}
          {isManagement && (
            <div className="pt-4 space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-amber-500" />
                Pending Sign-offs
              </h3>
              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-3">
                {data?.pending_signoffs.length === 0 ? (
                  <p className="text-xs text-amber-600 font-medium italic">All completed runs are signed off!</p>
                ) : (
                  data?.pending_signoffs.map((run) => (
                    <div key={run.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs font-bold text-slate-900 truncate">{(run as any).projects?.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Completed {format(new Date(run.completed_at!), 'MMM d, HH:mm')}</p>
                      </div>
                      <Link 
                        to={`/projects/${run.project_id}/runs/${run.id}`}
                        className="p-1.5 hover:bg-amber-100 rounded-full transition-colors text-amber-600"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
