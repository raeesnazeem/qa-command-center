import { useState } from 'react';
import { 
  X, 
  Layers, 
  Calendar, 
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Image as ImageIcon,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { Task, TaskStatus, TaskSeverity } from '../api/tasks.api';
import { 
  useUpdateTask, 
  useAddRebuttal, 
  useAssignTask 
} from '../hooks/useTasks';
import { useProject } from '../hooks/useProjects';
import { CanDo } from './CanDo';
import { CommentThread } from './CommentThread';

interface TaskDetailPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailPanel = ({ task, isOpen, onClose }: TaskDetailPanelProps) => {
  const [rebuttalText, setRebuttalText] = useState('');
  const [rebuttalUrl, setRebuttalUrl] = useState('');

  const { mutate: updateTask } = useUpdateTask();
  const { mutate: addRebuttal } = useAddRebuttal();
  const { mutate: assignTask } = useAssignTask();
  
  const { data: project } = useProject(task?.project_id || '');

  if (!task) return null;

  const handleStatusChange = (status: TaskStatus) => {
    updateTask({ id: task.id, data: { status } });
  };

  const handleAssigneeChange = (userId: string) => {
    assignTask({ id: task.id, userId });
  };

  const handleAddRebuttal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rebuttalText.trim()) return;
    addRebuttal({ 
      taskId: task.id, 
      data: { text: rebuttalText, screenshot_url: rebuttalUrl || undefined } 
    }, {
      onSuccess: () => {
        setRebuttalText('');
        setRebuttalUrl('');
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <h2 className="font-bold text-slate-900">Task Details</h2>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${getSeverityStyles(task.severity)}`}>
              {task.severity}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Main Content */}
          <div className="p-6 space-y-8">
            {/* Title & Status */}
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{task.title}</h1>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status</span>
                  <select 
                    value={task.status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent/20 ${getStatusStyles(task.status)}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <CanDo role="qa_engineer">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</span>
                    <select 
                      value={task.assigned_to || ''}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      className="text-xs font-bold bg-slate-50 border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-accent"
                    >
                      <option value="">Unassigned</option>
                      {project?.project_members.map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.users.full_name}</option>
                      ))}
                    </select>
                  </div>
                </CanDo>

                <CanDo role="qa_engineer">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Integration</span>
                    <button className="inline-flex items-center space-x-2 bg-[#F97316] text-white px-4 py-1.5 rounded-md font-bold text-xs hover:bg-[#EA580C] transition-all shadow-sm active:scale-95">
                      <ExternalLink className="w-3 h-3" />
                      <span>Push to Basecamp</span>
                    </button>
                  </div>
                </CanDo>
              </div>
            </div>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Layers className="w-3 h-3 mr-1" /> Project
                </span>
                <p className="text-sm font-medium text-slate-700">{task.projects?.name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Calendar className="w-3 h-3 mr-1" /> Created
                </span>
                <p className="text-sm font-medium text-slate-700">{format(new Date(task.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</span>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[100px]">
                {task.description || 'No description provided.'}
              </div>
            </div>

            {/* Comment Thread */}
            <div className="pt-8 border-t border-slate-100">
              <CommentThread taskId={task.id} comments={task.comments || []} />
            </div>

            {/* Rebuttal Section (Developer only) */}
            <CanDo role="developer">
              <div className="space-y-4 pt-8 border-t border-slate-100">
                <div className="flex items-center space-x-2 text-red-600">
                  <ShieldAlert className="w-4 h-4" />
                  <h3 className="font-bold uppercase tracking-widest text-xs">Developer Rebuttal</h3>
                </div>
                
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 space-y-4">
                  <p className="text-xs text-red-600 font-medium leading-relaxed">
                    If you disagree with this finding, provide a detailed rebuttal and optional screenshot. QA will review it.
                  </p>
                  
                  <div className="space-y-4">
                    {task.rebuttals?.map(r => (
                      <div key={r.id} className="bg-white border border-red-100 p-3 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-red-400">
                          <span>{r.users?.full_name}</span>
                          <span>{format(new Date(r.created_at), 'MMM d, HH:mm')}</span>
                        </div>
                        <p className="text-sm text-slate-700 italic">{r.text}</p>
                        {r.screenshot_url && (
                          <a 
                            href={r.screenshot_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-accent hover:underline"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>View Screenshot</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddRebuttal} className="space-y-3">
                    <textarea 
                      value={rebuttalText}
                      onChange={(e) => setRebuttalText(e.target.value)}
                      placeholder="Explain why this finding is incorrect..."
                      className="w-full bg-white border border-red-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none min-h-[80px]"
                    />
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="url"
                          value={rebuttalUrl}
                          onChange={(e) => setRebuttalUrl(e.target.value)}
                          placeholder="Screenshot URL (optional)"
                          className="w-full bg-white border border-red-100 rounded-lg pl-10 pr-3 py-2 text-xs focus:outline-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={!rebuttalText.trim()}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </CanDo>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Last update: {format(new Date(task.updated_at), 'MMM d, HH:mm')}
            </span>
          </div>
          <button 
            disabled
            className="inline-flex items-center space-x-2 text-slate-400 font-bold text-xs cursor-not-allowed opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark as Resolved</span>
          </button>
        </div>
      </div>
    </>
  );
};

const getSeverityStyles = (severity: TaskSeverity) => {
  switch (severity) {
    case 'critical': return 'bg-red-50 text-red-600 border-red-100';
    case 'high': return 'bg-orange-50 text-orange-600 border-orange-100';
    case 'medium': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
    case 'low': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};

const getStatusStyles = (status: TaskStatus) => {
  switch (status) {
    case 'open': return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'in_progress': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case 'resolved': return 'bg-green-50 text-green-600 border-green-100';
    case 'closed': return 'bg-slate-50 text-slate-600 border-slate-100';
    default: return 'bg-slate-50 text-slate-600 border-slate-100';
  }
};
