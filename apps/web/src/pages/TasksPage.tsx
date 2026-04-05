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
  const isQA = role === 'qa_engineer';
  const isDev = role === 'developer';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Clock className="w-10 h-10 text-accent animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse text-sm">Loading task workspace...</p>
      </div>
    );
  }

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
        {/* ADMIN VIEW */}
        {isAdmin && (
          <>
            <HorizontalScroll 
              title="Current QA Tasks" 
              icon={CheckSquare} 
              projects={data?.qa_projects} 
              iconColor="text-amber-500"
            />
            <HorizontalScroll 
              title="Current Developer Tasks" 
              icon={Layers} 
              projects={data?.dev_projects} 
              iconColor="text-indigo-500"
            />
          </>
        )}

        {/* QA VIEW */}
        {isQA && (
          <>
            <HorizontalScroll 
              title="Current QA Pre-release Projects" 
              icon={Zap} 
              projects={data?.pre_release_projects} 
              iconColor="text-amber-500"
            />
            <HorizontalScroll 
              title="Current QA Post-release Projects" 
              icon={Layers} 
              projects={data?.post_release_projects} 
              iconColor="text-emerald-500"
            />
            
            <section className="space-y-6 pt-8">
              <div className="flex items-center justify-between border-t border-slate-100 pt-8">
                <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs">
                  <Search className="w-4 h-4 text-slate-400" />
                  Other Projects
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(showAllOther ? data?.all_projects : data?.all_projects?.slice(0, 12))?.map((project: any) => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
                  >
                    <h5 className="font-bold text-slate-900 group-hover:text-accent transition-colors truncate">{project.name}</h5>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{project.client_name || 'Internal'}</p>
                  </Link>
                ))}
              </div>
              {data?.all_projects && data.all_projects.length > 12 && (
                <div className="flex justify-center mt-8">
                  {showAllOther ? (
                    <Link to="/projects" className="btn-unified-secondary flex items-center gap-2">
                      View All in Database <ExternalLink size={14} />
                    </Link>
                  ) : (
                    <button 
                      onClick={() => setShowAllOther(true)}
                      className="btn-unified-secondary"
                    >
                      See More Projects
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
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
