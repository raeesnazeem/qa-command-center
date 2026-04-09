import { useState } from 'react';
import { ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuthAxios } from '../lib/useAuthAxios';
import { pushToBasecamp } from '../api/tasks.api';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CanDo } from './CanDo';

interface BulkBasecampPushProps {
  taskIds: string[];
  onComplete?: () => void;
}

export const BulkBasecampPush = ({ taskIds, onComplete }: BulkBasecampPushProps) => {
  const axios = useAuthAxios();
  const queryClient = useQueryClient();
  const [isPushing, setIsPushing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pushedCount, setPushedCount] = useState(0);

  const handleBulkPush = async () => {
    if (taskIds.length === 0) return;
    
    setIsPushing(true);
    setCurrentIndex(0);
    setPushedCount(0);

    try {
      for (let i = 0; i < taskIds.length; i++) {
        setCurrentIndex(i + 1);
        try {
          await pushToBasecamp(axios, taskIds[i]);
          setPushedCount(prev => prev + 1);
        } catch (err: any) {
          console.error(`Failed to push task ${taskIds[i]}:`, err);
          toast.error(`Failed to push task ${i + 1}: ${err.response?.data?.error || err.message}`);
        }
        // Small delay to be extra safe with rate limits even though they are sequential
        if (i < taskIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      toast.success(`${pushedCount + 1} tasks pushed to Basecamp`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onComplete?.();
    } catch (error: any) {
      toast.error('Bulk push encountered an error');
    } finally {
      setIsPushing(false);
    }
  };

  if (taskIds.length === 0) return null;

  return (
    <CanDo role="qa_engineer">
      <button
        onClick={handleBulkPush}
        disabled={isPushing}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-md font-bold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-70 ${
          isPushing 
            ? 'bg-slate-100 text-slate-500 border border-slate-200' 
            : 'bg-[#F97316] text-white hover:bg-[#EA580C]'
        }`}
      >
        {isPushing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Pushing {currentIndex} of {taskIds.length}...</span>
          </>
        ) : pushedCount > 0 && !isPushing ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>{pushedCount} tasks pushed to Basecamp</span>
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4" />
            <span>Push {taskIds.length} tasks to Basecamp</span>
          </>
        )}
      </button>
    </CanDo>
  );
};
