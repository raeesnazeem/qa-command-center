import { useState } from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  MessageSquare, 
  Paperclip,
  Clock
} from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { TaskStatus } from '@qacc/shared';
import { CreateTaskModal } from '../components/CreateTaskModal';

export const TasksPage = () => {
  const { data: tasks, isLoading } = useTasks();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'open', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'resolved', title: 'Resolved' },
    { id: 'closed', title: 'Closed' },
  ];

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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Global Tasks</h1>
          <p className="text-slate-500 mt-1">Centralized board for all your project QA tasks</p>
        </div>
        <button 
          onClick={() => setIsTaskModalOpen(true)}
          className="btn-unified flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      <CreateTaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-accent transition-all"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button className="btn-unified-secondary flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900">{column.title}</h3>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {tasks?.filter(t => t.status === column.id).length || 0}
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
              ) : tasks?.filter(t => t.status === column.id).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center space-y-2 opacity-50">
                  <CheckSquare className="w-8 h-8 text-slate-200" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No tasks</p>
                </div>
              ) : (
                tasks?.filter(t => t.status === column.id).map((task) => (
                  <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-accent/20 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityColor(task.severity)}`}>
                        {task.severity}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[80px]">{task.projects.name}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors leading-tight mb-4">
                      {task.title}
                    </h4>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center space-x-3 text-slate-400">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="w-3 h-3" />
                          <span className="text-[10px] font-bold">0</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Paperclip className="w-3 h-3" />
                          <span className="text-[10px] font-bold">0</span>
                        </div>
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
    </div>
  );
};
