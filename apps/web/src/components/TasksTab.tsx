import { useState } from 'react';
import { ProjectWithMembers } from '../api/projects.api';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import { 
  CheckSquare, 
  Clock, 
  MoreHorizontal, 
  MessageSquare, 
  Search,
  Filter,
  Plus,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { TaskStatus } from '@qacc/shared';
import { CreateTaskModal } from './CreateTaskModal';
import { CanDo } from './CanDo';
import { BulkBasecampPush } from './BulkBasecampPush';
import { TaskDetailPanel } from './TaskDetailPanel';
import { Task } from '../api/tasks.api';

interface TasksTabProps {
  project: ProjectWithMembers;
}

export const TasksTab = ({ project }: TasksTabProps) => {
  const { data: tasksData, isLoading } = useTasks({ projectId: project.id });
  const tasks = tasksData?.data || [];
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { mutate: updateTask } = useUpdateTask();

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'open', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'resolved', title: 'Resolved' },
    { id: 'closed', title: 'Closed' },
  ];

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    updateTask({ id: taskId, data: { status: newStatus } });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-100';
      case 'high': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'medium': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'low': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">Project Tasks</h2>
        
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent transition-all w-full md:w-64"
            />
          </div>
          
          {selectedTaskIds.length > 0 ? (
            <BulkBasecampPush 
              taskIds={selectedTaskIds} 
              onComplete={() => setSelectedTaskIds([])} 
            />
          ) : (
            <>
              <button className="btn-unified-secondary p-2">
                <Filter className="w-4 h-4" />
              </button>
              
              <CanDo role="qa_engineer">
                <button 
                  disabled
                  className="inline-flex items-center space-x-2 bg-slate-100 text-slate-400 px-4 py-2 rounded-md font-bold text-sm cursor-not-allowed opacity-60"
                  title="Select tasks to see bulk actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>Bulk Actions</span>
                </button>
              </CanDo>
            </>
          )}

          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="btn-unified flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      <CreateTaskModal 
        projectId={project.id}
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900">{column.title}</h3>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {tasks.filter(t => t.status === column.id).length}
                </span>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 min-h-[500px] bg-slate-50/50 rounded-xl p-2 border border-dashed border-slate-200">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-2">
                  <Clock className="w-6 h-6 text-accent animate-spin" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
                </div>
              ) : tasks.filter(t => t.status === column.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center space-y-2 opacity-50">
                  <CheckSquare className="w-8 h-8 text-slate-200" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No tasks</p>
                </div>
              ) : (
                tasks.filter(t => t.status === column.id).map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${
                      selectedTaskIds.includes(task.id) ? 'border-accent ring-1 ring-accent/20' : 'border-slate-100 hover:border-accent/20'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div 
                      className="absolute -top-2 -left-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskSelection(task.id);
                      }}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        selectedTaskIds.includes(task.id) 
                          ? 'bg-accent border-accent text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-transparent hover:border-accent group-hover:text-slate-200'
                      }`}>
                        <CheckCircle2 size={12} strokeWidth={3} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityColor(task.severity)}`}>
                          {task.severity}
                        </span>
                        {task.basecamp_url && (
                          <div className="text-emerald-600" title="Synced with Basecamp">
                            <CheckCircle2 size={12} />
                          </div>
                        )}
                      </div>
                      
                      <div className="relative group/status">
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 border-none rounded px-1.5 py-0.5 focus:ring-0 cursor-pointer appearance-none text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {columns.map(col => (
                            <option key={col.id} value={col.id}>{col.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors leading-tight mb-4">
                      {task.title}
                    </h4>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center space-x-3 text-slate-400">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{(task as any).comments?.length || 0}</span>
                        </div>
                        {task.basecamp_url && (
                          <a 
                            href={task.basecamp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-emerald-500 hover:text-emerald-600"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border-2 border-white">
                        {task.users?.full_name ? task.users.full_name.charAt(0) : '?'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskDetailPanel 
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
};
