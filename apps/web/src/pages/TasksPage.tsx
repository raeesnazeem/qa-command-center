import { useState } from 'react';
import { 
  CheckSquare, 
  Search, 
  Plus, 
  ChevronRight,
  ArrowUpRight,
  Zap,
  Layers,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStats } from '../hooks/useDashboard';
import { useRole } from '../hooks/useRole';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TasksTab } from '../components/TasksTab';
import { Skeleton } from '../components/Skeleton';

const ProjectCard = ({ project }: { project: any }) => (
  <Link 
    to={`/projects/${project.id}`}
    className="flex-shrink-0 w-80 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-accent/20 transition-all group flex flex-col h-full"
  >
    <div className="flex justify-between items-start mb-4">
      <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${
        project.is_pre_release ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
      }`}>
        {project.is_pre_release ? 'Pre-release' : 'Post-release'}
      </span>
      {project.open_issues_count > 0 && (
        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
          <Zap size={12} className="fill-red-500" />
          {project.open_issues_count} Issues
        </span>
      )}
    </div>
    <h4 className="font-black text-slate-900 text-lg mb-1 group-hover:text-accent transition-colors line-clamp-1 leading-tight">{project.name}</h4>
    <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-wider">{project.client_name || 'Internal'}</p>
    
    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-accent font-black text-[10px] uppercase tracking-widest">
      <span>View Dashboard</span>
      <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
    </div>
  </Link>
);

const HorizontalScroll = ({ title, icon: Icon, projects, iconColor = "text-slate-400" }: any) => {
  if (!projects || projects.length === 0) return null;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {title}
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{projects.length} Total</span>
      </div>
      <div className="flex overflow-x-auto pb-6 gap-6 no-scrollbar -mx-2 px-2 mask-fade-right">
        {projects.map((project: any) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};

export const TasksPage = () => {
  const { data, isLoading } = useDashboardStats();
  const { role } = useRole();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showAllOther, setShowAllOther] = useState(false);

  const isAdmin = role === 'super_admin' || role === 'admin';
  const isSubAdmin = role === 'sub_admin';
  const isQA = role === 'qa_engineer';
  const isDev = role === 'developer';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
          <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="bg-white border border-slate-100 rounded-3xl h-64 overflow-hidden relative">
                <Skeleton className="absolute inset-0" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-80 rounded-2xl flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getQAName = (project: any) => {
    const qaMember = project.project_members?.find((m: any) => m.role === 'qa_engineer');
    return qaMember?.users?.full_name || 'Unassigned';
  };

  const getDevNames = (project: any) => {
    const devMembers = project.project_members?.filter((m: any) => m.role === 'developer');
    if (!devMembers || devMembers.length === 0) return 'None';
    return devMembers.map((m: any) => m.users?.full_name).join(', ');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Task Workspace</h1>
          <p className="text-slate-500 mt-2 font-medium">Role-based view of active project tasks and priorities.</p>
        </div>
        <button 
          onClick={() => setIsTaskModalOpen(true)}
          className="btn-unified-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      <CreateTaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />

      <div className="space-y-16">
        {/* ADMIN & SUB-ADMIN VIEW */}
        {(isAdmin || isSubAdmin) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QA Tasks Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                  <CheckSquare className="w-4 h-4 text-amber-500" />
                  Current QA Tasks
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data?.qa_projects?.length || 0} Total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Issues</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">QA Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data?.qa_projects?.map((project: any) => (
                      <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <Link to={`/projects/${project.id}`} className="font-bold text-slate-900 group-hover:text-accent transition-colors block">
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                            project.is_pre_release ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {project.is_pre_release ? 'Pre' : 'Post'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {project.open_issues_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-500">{getQAName(project)}</span>
                        </td>
                      </tr>
                    ))}
                    {(!data?.qa_projects || data.qa_projects.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-medium italic">No active QA tasks</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Developer Tasks Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Current Developer Tasks
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data?.dev_projects?.length || 0} Total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Developer(s)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data?.dev_projects?.map((project: any) => (
                      <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <Link to={`/projects/${project.id}`} className="font-bold text-slate-900 group-hover:text-accent transition-colors block">
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs font-medium text-slate-500">{getDevNames(project)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!data?.dev_projects || data.dev_projects.length === 0) && (
                      <tr>
                        <td colSpan={2} className="px-6 py-12 text-center text-slate-400 text-xs font-medium italic">No active developer tasks</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* QA VIEW */}
        {isQA && (
          <div className="space-y-8">
            <TasksTab />
          </div>
        )}

        {/* DEVELOPER VIEW */}
        {isDev && (
          <>
            <HorizontalScroll 
              title="Your Pre-release Projects" 
              icon={Zap} 
              projects={data?.pre_release_projects} 
              iconColor="text-amber-500"
            />
            <HorizontalScroll 
              title="Your Post-release Projects" 
              icon={Layers} 
              projects={data?.post_release_projects} 
              iconColor="text-emerald-500"
            />
            <HorizontalScroll 
              title="Past Projects" 
              icon={Clock} 
              projects={data?.all_projects} 
            />
          </>
        )}
      </div>
    </div>
  );
};
