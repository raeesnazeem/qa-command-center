import { useWorkspaceUsers } from '../hooks/useProjects';
import { User, X, CheckCircle2, Loader2 } from 'lucide-react';

interface AssignMemberModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (userId: string) => void;
  isPending?: boolean;
  title?: string;
}

export const AssignMemberModal = ({ 
  projectId, 
  isOpen, 
  onClose, 
  onAssign, 
  isPending,
  title = "Assign Finding"
}: AssignMemberModalProps) => {
  const { data: members, isLoading } = useWorkspaceUsers();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200">
      <div 
        className="absolute inset-0 bg-transparent" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-[15px] shadow-2xl overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-accent/10 rounded-md text-accent">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-1 mb-6">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Team Member</p>
            <p className="text-[10px] text-slate-500 font-medium">Assigning to a member will notify them immediately</p>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-xs font-bold uppercase tracking-widest">Loading members...</span>
              </div>
            ) : members?.map((member) => (
              <button
                key={member.id}
                onClick={() => onAssign(member.id)}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-accent/30 transition-all group/member text-left active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover/member:bg-accent group-hover/member:text-white transition-colors">
                    {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">{member.full_name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{member.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover/member:opacity-100 transition-opacity">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                </div>
              </button>
            ))}

            {!isLoading && (!members || members.length === 0) && (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No members found</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
