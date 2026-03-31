import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../api/projects.api';
import { Globe, Package, AlertCircle, Calendar } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
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
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-navy border border-white/10 rounded-xl p-6 cursor-pointer hover:border-orange/50 transition-all group flex flex-col h-full shadow-lg"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white group-hover:text-orange transition-colors truncate pr-2">
          {project.name}
        </h3>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            project.status === 'active'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
          }`}
        >
          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
        </span>
      </div>

      <div className="space-y-3 flex-grow">
        {project.client_name && (
          <div className="flex items-center text-gray-400 text-sm">
            <Package className="w-4 h-4 mr-2 text-orange/80" />
            <span className="truncate">{project.client_name}</span>
          </div>
        )}
        <div className="flex items-center text-gray-400 text-sm">
          <Globe className="w-4 h-4 mr-2 text-orange/80" />
          <span className="truncate group-hover:text-white transition-colors">{project.site_url}</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" /> Issues
          </span>
          <span className={`text-sm font-semibold ${project.open_issues_count > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {project.open_issues_count} Open
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" /> Last Run
          </span>
          <span className="text-sm font-semibold text-gray-300">
            {formatDate(project.last_run_date)}
          </span>
        </div>
      </div>
    </div>
  );
};
