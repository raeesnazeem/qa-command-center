import { 
  FolderKanban, 
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStats } from '../hooks/useStats';

export const DashboardPage = () => {
  const { data, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Active Projects', value: data?.stats.activeProjects.toString() || '0', icon: FolderKanban, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Total Runs', value: data?.stats.totalRuns.toString() || '0', icon: PlayCircle, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Open Issues', value: data?.stats.openIssues.toString() || '0', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Resolved Today', value: data?.stats.resolvedToday.toString() || '0', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your QA operations and workspace metrics</p>
      </div>
      
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Activity</h3>
            <button className="text-xs font-bold text-accent hover:text-accent/80 transition-colors uppercase tracking-wider">View Log</button>
          </div>
          <div className="divide-y divide-slate-50">
            {data?.recentActivity.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">
                No recent activity recorded.
              </div>
            ) : (
              data?.recentActivity.map((activity) => (
                <div key={activity.id} className="px-6 py-4 flex items-start space-x-4">
                  <div className="mt-1 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">
                      <span className="font-bold text-slate-900">{activity.userName || 'System'}</span> 
                      {activity.type === 'qa_run' ? ' ran a new check on ' : ' updated '}
                      <span className="font-bold text-slate-900 ml-1">{activity.projectName}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Tasks */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">High Priority Tasks</h3>
            <Link to="/tasks" className="text-xs font-bold text-accent hover:text-accent/80 transition-colors uppercase tracking-wider">Go to Board</Link>
          </div>
          <div className="p-6 space-y-4">
            {data?.priorityTasks.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-100 mx-auto mb-2" />
                <p className="text-sm text-slate-400 italic">No critical tasks open!</p>
              </div>
            ) : (
              data?.priorityTasks.map((task) => (
                <Link 
                  key={task.id} 
                  to={`/projects/${task.projectId}?tab=tasks`}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 group hover:border-accent/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${task.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{task.title}</p>
                      <p className="text-xs text-slate-500">{task.projectName}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
