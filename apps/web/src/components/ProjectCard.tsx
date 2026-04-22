import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Project, addProjectMember } from '../api/projects.api';
import { Globe, Package, AlertCircle, Calendar, ChevronRight, Users, Plus, X, Loader2, Check } from 'lucide-react';
import { useAuthAxios } from '../lib/useAuthAxios';
import { useRole } from '../hooks/useRole';
import toast from 'react-hot-toast';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();
  const axios = useAuthAxios();
  const { role: userRole } = useRole();
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'qa_engineer' | 'developer'>('qa_engineer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = ['super_admin', 'admin', 'sub_admin'].includes(userRole || '');

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await addProjectMember(axios, project.id, { email, role: memberRole });
      toast.success('Member added successfully');
      setEmail('');
      setIsManageOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative group/card flex flex-col h-full">
      <div
        onClick={() => !isManageOpen && navigate(`/projects/${project.id}`)}
        className="bg-white border border-slate-100 rounded-xl p-6 cursor-pointer hover:border-accent/50 transition-all group flex flex-col h-full shadow-sm hover:shadow-md"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-accent transition-colors truncate pr-2">
              {project.name}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {project.basecamp_project_id && (
              <div className="flex items-center bg-orange-50 text-orange-600 border border-orange-100 rounded-full px-2 py-0.5" title="Basecamp Linked">
                <Check className="w-3 h-3 mr-1" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Basecamp</span>
              </div>
            )}
            {canManage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsManageOpen(!isManageOpen);
                }}
                className={`p-1.5 rounded-md transition-colors ${
                  isManageOpen ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Manage Team"
              >
                <Users className="w-4 h-4" />
              </button>
            )}
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              project.status === 'active' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>
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
            <span className="truncate group-hover:text-slate-900 transition-colors uppercase text-[10px] font-bold tracking-tight">{project.site_url}</span>
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

      {/* Manage Team Popover */}
      {isManageOpen && (
        <div 
          className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-xl p-6 flex flex-col border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center tracking-tight">
                <Users className="w-4 h-4 mr-2 text-accent" /> Manage Team
              </h4>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">Project: {project.name}</p>
            </div>
            <button onClick={() => setIsManageOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Add User by Email</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
                required
              />
            </div>
            
            <div className="flex space-x-2">
              {(['qa_engineer', 'developer'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setMemberRole(r)}
                  className={`flex-1 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center space-x-1 ${
                    memberRole === r ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {memberRole === r && <Check className="w-3 h-3" />}
                  <span>{r.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-unified flex items-center justify-center space-x-2 h-10"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to Project</span>
                </>
              )}
            </button>
          </form>
          
          <div className="mt-auto pt-6 text-center">
            <p className="text-[9px] text-slate-400 font-medium italic">Users must already exist in the organization's system</p>
          </div>
        </div>
      )}

      {project.ongoing_run && !isManageOpen && (
        <Link
          to={`/projects/${project.id}/runs/${project.ongoing_run.id}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute -bottom-3 left-4 right-4 bg-blue-600 text-white rounded-md px-4 h-[30px] flex items-center justify-between shadow-lg hover:bg-black transition-all animate-in slide-in-from-bottom-2 duration-300 z-10 group/ongoing"
        >
          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </div>
            <span>Scan Active</span>
            <span className="opacity-80 font-medium">{project.ongoing_run.pages_processed}/{project.ongoing_run.pages_total}</span>
          </div>
          <ChevronRight className="w-3 h-3 group-hover/ongoing:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
};
