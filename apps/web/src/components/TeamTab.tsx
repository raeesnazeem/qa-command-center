import { useState } from 'react';
import { ProjectWithMembers } from '../api/projects.api';
import { useAddProjectMember, useUpdateProjectMemberRole } from '../hooks/useProjects';
import { UserPlus, Mail } from 'lucide-react';
import { CanDo } from './CanDo';

interface TeamTabProps {
  project: ProjectWithMembers;
}

export const TeamTab = ({ project }: TeamTabProps) => {
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'sub_admin' | 'qa_engineer' | 'developer'>('developer');

  const { mutate: addMember, isPending: isAdding } = useAddProjectMember(project.id);
  const { mutate: updateRole } = useUpdateProjectMemberRole(project.id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'bg-[#1E3A5F] text-white'; // Navy
      case 'qa_engineer':
        return 'bg-[#F97316] text-white'; // Orange
      case 'developer':
        return 'bg-slate-400 text-white'; // Gray
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
    updateRole({ userId, role: newRole });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail) return;

    addMember(
      { email: newMemberEmail, role: newMemberRole },
      {
        onSuccess: () => {
          setNewMemberEmail('');
        },
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Member List */}
        <div className="flex-grow space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Project Members</h3>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {project.project_members.length} Members
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {project.project_members.map((member) => (
                <div key={member.user_id} className="px-6 py-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm border border-accent/20">
                      {getInitials(member.users.full_name)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{member.users.full_name}</div>
                      <div className="text-xs text-slate-500 flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {member.users.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(member.role)}`}>
                      {member.role.replace('_', ' ')}
                    </span>
                    
                    <CanDo role="admin">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                        className="text-xs border-slate-200 rounded-md bg-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent/20 focus:border-accent"
                      >
                        <option value="admin">Admin</option>
                        <option value="sub_admin">Sub Admin</option>
                        <option value="qa_engineer">QA Engineer</option>
                        <option value="developer">Developer</option>
                      </select>
                    </CanDo>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add Member Form */}
        <CanDo role="admin">
          <div className="lg:w-80 shrink-0">
            <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm sticky top-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900">Add Member</h3>
              </div>
              
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Assign Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent transition-all"
                  >
                    <option value="admin">Admin</option>
                    <option value="sub_admin">Sub Admin</option>
                    <option value="qa_engineer">QA Engineer</option>
                    <option value="developer">Developer</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="btn-unified w-full"
                >
                  {isAdding ? 'Adding...' : 'Add to Project'}
                </button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-slate-50">
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  New members will receive an email notification and immediate access to the project based on their role.
                </p>
              </div>
            </div>
          </div>
        </CanDo>
      </div>
    </div>
  );
};
