import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  MessageSquare,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { TaskComment } from '../api/tasks.api';
import { useAddComment } from '../hooks/useTasks';

interface CommentThreadProps {
  taskId: string;
  comments: TaskComment[];
}

export const CommentThread = ({ taskId, comments }: CommentThreadProps) => {
  const [newComment, setNewComment] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { mutate: addComment, isPending: isSubmitting } = useAddComment();

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    addComment({ taskId, content: newComment.trim() }, {
      onSuccess: () => {
        setNewComment('');
      }
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="w-4 h-4 text-slate-400" />
        <h3 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Discussion</h3>
      </div>

      {/* Comment List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4"
      >
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
            <MessageSquare className="w-8 h-8 mb-2" />
            <p className="text-xs font-medium">No comments yet. Start the conversation.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 shrink-0">
                {getInitials(comment.users?.full_name)}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      {comment.users?.full_name || 'Unknown User'}
                    </span>
                    {comment.is_ai_generated && (
                      <span className="inline-flex items-center bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                        <Bot className="w-2.5 h-2.5 mr-1" />
                        AI Agent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-[10px] text-slate-400">
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                  </div>
                </div>
                
                <div className={`text-sm text-slate-600 p-3 rounded-xl rounded-tl-none border ${
                  comment.is_ai_generated 
                    ? 'bg-blue-50/50 border-blue-100 italic' 
                    : 'bg-slate-50 border-slate-100'
                }`}>
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative group">
        <textarea 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Add a comment... (Enter to send)"
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 min-h-[80px] pr-12 transition-all resize-none shadow-sm group-hover:border-slate-300"
          disabled={isSubmitting}
        />
        <button 
          type="submit"
          className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all active:scale-95 ${
            newComment.trim() && !isSubmitting
              ? 'bg-black text-white hover:bg-slate-800'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          disabled={!newComment.trim() || isSubmitting}
        >
          <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
        </button>
      </form>
    </div>
  );
};
