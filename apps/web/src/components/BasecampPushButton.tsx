import { ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { Task } from '../api/tasks.api';
import { usePushToBasecamp } from '../hooks/useTasks';
import { CanDo } from './CanDo';

interface BasecampPushButtonProps {
  task: Task;
  onPush: () => void;
  isPending: boolean;
  isSuccess?: boolean;
}

export const BasecampTaskLink = ({ url }: { url: string | undefined }) => {
  if (!url) return null;
  return (
    <div className="flex flex-col space-y-1">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Basecamp</span>
      <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs font-bold hover:underline flex items-center"
        >
          Synced ✓ View in Basecamp
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
};

export const BasecampPushButton = ({ task, onPush, isPending, isSuccess }: BasecampPushButtonProps) => {

  return (
    <CanDo role="qa_engineer">
      <div className="flex flex-col space-y-1">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Integration</span>
        <button 
          onClick={onPush}
          disabled={isPending || isSuccess}
          className={`inline-flex items-center justify-center space-x-2 px-4 py-1.5 rounded-md font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${
            isPending 
              ? 'bg-slate-100 dark:bg-[#1d2a31] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700' 
              : isSuccess
                ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
                : 'bg-[#F97316] dark:bg-[#EA580C] text-white hover:bg-[#EA580C] dark:hover:bg-[#C2410C]'
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Pushing...</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Success!</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Push to Basecamp</span>
            </>
          )}
        </button>
      </div>
    </CanDo>
  );
};
