import { useState } from 'react';
import { useWorkspaceUsers } from '../hooks/useProjects';
import { Users, Mail, Shield, ShieldCheck, Loader2, UserPlus, Search, Filter, X, Trash2, Save } from 'lucide-react';
import { RoleBadge } from '../components/RoleBadge';
import { useRole } from '../hooks/useRole';
import { useAuthAxios } from '../lib/useAuthAxios';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const TeamPage = () => {
  const { data: members, isLoading } = useWorkspaceUsers();
  const { role: currentUserRole } = useRole();
  const axios = useAuthAxios();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', role: '' });
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const filteredMembers = members?.filter(member => 
    (member.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleManage = (member: any) => {
    setSelectedMember(member);
    setEditForm({ full_name: member.full_name, role: member.role });
    setIsManaging(true);
  };

  const handleUpdate = async () => {
    if (!selectedMember) return;
    setIsSaving(true);
    try {
      await axios.patch(`/api/users/${selectedMember.id}`, editForm);
      toast.success('Member profile updated');
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] });
      setIsManaging(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember || !window.confirm('Are you sure you want to remove this member?')) return;
    setIsSaving(true);
    try {
      await axios.delete(`/api/users/${selectedMember.id}`);
      toast.success('Member removed from organization');
      queryClient.invalidateQueries({ queryKey: ['workspace-users'] });
      setIsManaging(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove member');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Team</h1>
          <p className="text-slate-500 mt-1">Manage your team members and their global roles.</p>
        </div>
        {isSuperAdmin && (
          <button className="btn-unified flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent transition-all"
          />
        </div>
        <button className="btn-unified-secondary flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Member</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Role</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading team members...</span>
                  </div>
                </td>
              </tr>
            ) : filteredMembers?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                  No members found matching your search.
                </td>
              </tr>
            ) : filteredMembers?.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200 group-hover:bg-white group-hover:border-accent/30 transition-all">
                      {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none mb-1">{member.full_name || 'Incomplete Profile'}</p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase">Active Member</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={member.role as any} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center text-slate-500 text-sm">
                    <Mail className="w-3.5 h-3.5 mr-2 text-slate-300" />
                    {member.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">ACTIVE</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {isSuperAdmin && (
                    <button 
                      onClick={() => handleManage(member)}
                      className="btn-unified-secondary text-[10px] px-3 py-1 h-auto hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                    >
                      Manage
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 rounded-xl text-white shadow-xl">
          <ShieldCheck className="w-8 h-8 text-accent mb-4" />
          <h4 className="font-bold text-lg mb-2">Admins</h4>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">Full organization access. Can create projects, invite users, and sign off on all QA reports.</p>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Users className="w-8 h-8 text-black mb-4" />
          <h4 className="font-bold text-lg text-slate-900 mb-2">QA Engineers</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Focused on findings. Can create tasks from scan results and review developer rebuttals.</p>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Shield className="w-8 h-8 text-slate-400 mb-4" />
          <h4 className="font-bold text-lg text-slate-900 mb-2">Developers</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Project specific. Can view assigned tasks, update their status, and submit rebuttals for review.</p>
        </div>
      </div>

      {/* Manage Modal */}
      {isManaging && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Manage Team Member</h3>
              <button 
                onClick={() => setIsManaging(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-accent transition-all"
                  placeholder="Member name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Role</label>
                <select 
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-accent transition-all appearance-none"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="sub_admin">Sub Admin</option>
                  <option value="qa_engineer">QA Engineer</option>
                  <option value="developer">Developer</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-between gap-4">
                <button 
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setIsManaging(false)}
                    className="px-5 py-2 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded-lg transition-all"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleUpdate}
                    disabled={isSaving}
                    className="btn-unified h-10 px-6 flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                      
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

