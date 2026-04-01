import { useNavigate, Link } from 'react-router-dom';
import { Project } from '../api/projects.api';
import { Globe, Package, AlertCircle, Calendar, ChevronRight } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="relative group/card flex flex-col h-full">
      <div
        onClick={() => navigate(`/projects/${project.id}`)}
        className="bg-white border border-slate-100 rounded-xl p-6 cursor-pointer hover:border-accent/50 transition-all group flex flex-col h-full shadow-sm hover:shadow-md"
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-slate-900 group-hover:text-accent transition-colors truncate pr-2">
            {project.name}
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              project.status === 'active'
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        </div>

        <div className="space-y-3 flex-grow">
          {project.client_name && (
            <div className="flex items-center text-slate-500 text-sm">
              <Package className="w-4 h-4 mr-2 text-accent" />
              <span className="truncate">{project.client_name}</span>
            </div>
          )}
          <div className="flex items-center text-slate-500 text-sm">
            <Globe className="w-4 h-4 mr-2 text-accent" />
            <span className="truncate group-hover:text-slate-900 transition-colors">{project.site_url}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" /> Issues
            </span>
            <span className={`text-sm font-semibold ${project.open_issues_count > 0 ? 'text-red-500' : 'text-accent'}`}>
              {project.open_issues_count} Open
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" /> Last Run
            </span>
            <span className="text-sm font-semibold text-slate-600">
              {formatDate(project.last_run_date)}
            </span>
          </div>
        </div>
      </div>

      {/* Ongoing Scan Indicator Overlay */}
      {project.ongoing_run && (
        <Link
          to={`/projects/${project.id}/runs/${project.ongoing_run.id}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute -bottom-3 left-4 right-4 bg-blue-600 text-white rounded-md px-4 h-[30px] flex items-center justify-between shadow-lg hover:bg-black transition-all animate-in slide-in-from-bottom-2 duration-300 z-10 group/ongoing"
        >
          <div className="flex items-center space-x-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Scan Active</span>
            <span className="text-[10px] opacity-80 font-medium">
              {project.ongoing_run.pages_processed}/{project.ongoing_run.pages_total}
            </span>
          </div>
          <ChevronRight className="w-3 h-3 group-hover/ongoing:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
};
