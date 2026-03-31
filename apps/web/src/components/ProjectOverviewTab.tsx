import { ProjectWithMembers } from '../api/projects.api';
import { BarChart3, AlertCircle, CheckCircle2, Calendar, Play } from 'lucide-react';
import { CanDo } from './CanDo';

interface ProjectOverviewTabProps {
  project: ProjectWithMembers;
  onStartRun: () => void;
}

export const ProjectOverviewTab = ({ project, onStartRun }: ProjectOverviewTabProps) => {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Quick Actions */}
      <CanDo role="qa_engineer">
        <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-xl shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ready to test?</h3>
            <p className="text-slate-500 text-sm">Launch a new QA run to check for regressions.</p>
          </div>
          <button 
            onClick={onStartRun}
            className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-md font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start New QA Run</span>
          </button>
        </div>
      </CanDo>

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

      {/* Recent Runs Table Placeholder */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Recent QA Runs</h3>
          <button className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors">View All</button>
        </div>
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <BarChart3 className="w-8 h-8 text-slate-300" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 mb-1">No runs yet</h4>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Start your first QA run to see testing history and metrics here.
          </p>
        </div>
      </div>
    </div>
  );
};
