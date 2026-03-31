import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  Activity,
  Globe,
  Layers
} from 'lucide-react';
import { QARun } from '../api/runs.api';
import { formatDistanceToNow } from 'date-fns';

interface RunProgressHeaderProps {
  run: QARun;
  compact?: boolean;
}

export const RunProgressHeader: React.FC<RunProgressHeaderProps> = ({ run, compact = false }) => {
  const progress = run.pages_total > 0 ? (run.pages_processed / run.pages_total) * 100 : 0;
  const isRunning = run.status === 'running';
  const isFailed = run.status === 'failed';
  const isCompleted = run.status === 'completed';

  const getStatusColor = () => {
    if (isFailed) return 'text-red-600 bg-red-50 border-red-100';
    if (isCompleted) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (isRunning) return 'text-blue-600 bg-blue-50 border-blue-100';
    return 'text-slate-500 bg-slate-50 border-slate-100';
  };

  const getStatusIcon = () => {
    if (isFailed) return <AlertCircle size={compact ? 12 : 16} />;
    if (isCompleted) return <CheckCircle2 size={compact ? 12 : 16} />;
    if (isRunning) return <Loader2 size={compact ? 12 : 16} className="animate-spin" />;
    return <Clock size={compact ? 12 : 16} />;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${getStatusColor()}`}>
              {getStatusIcon()}
              {run.status}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {run.run_type.replace('_', ' ')}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500">
            {run.pages_processed}/{run.pages_total} Pages
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${isFailed ? 'bg-red-500' : 'bg-accent'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Run Configuration</h2>
              <div className={`px-3 py-1 rounded-full border text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${getStatusColor()}`}>
                {getStatusIcon()}
                {run.status}
              </div>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              Created {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <Globe size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700">{run.site_url}</span>
            </div>
            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
              <Layers size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{run.run_type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2 text-slate-900">
              <Activity size={18} className="text-accent" />
              <span className="text-sm font-black uppercase tracking-widest">Execution Progress</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-slate-900">{Math.round(progress)}%</span>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                {run.pages_processed} of {run.pages_total} pages crawled
              </p>
            </div>
          </div>

          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-1">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-accent to-indigo-600'
              }`}
              style={{ width: `${Math.max(2, progress)}%` }}
            >
              {isRunning && (
                <div className="w-full h-full opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
