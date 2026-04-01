import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  ExternalLink,
  Eye,
  FileSearch,
  Globe,
  Monitor,
  Search,
  Layout
} from 'lucide-react';
import { FindingSeverityEditor } from './FindingSeverityEditor';
import { QAFinding } from '../api/runs.api';
import { useUser } from '@clerk/react';

interface FindingCardProps {
  finding: QAFinding;
  onConfirm?: (id: string) => void;
  onFalsePositive?: (id: string) => void;
  onCreateTask?: (finding: QAFinding) => void;
}

const CHECK_FACTOR_ICONS: Record<string, React.ReactNode> = {
  broken_links: <Globe size={14} />,
  external_links: <ExternalLink size={14} />,
  meta_tags: <Search size={14} />,
  console_errors: <FileSearch size={14} />,
  dummy_content: <Layout size={14} />,
  visual_regression: <Eye size={14} />,
  accessibility: <Monitor size={14} />,
  performance: <Info size={14} />,
  seo: <Search size={14} />,
};

export const FindingCard: React.FC<FindingCardProps> = ({ 
  finding, 
  onConfirm, 
  onFalsePositive, 
  onCreateTask 
}) => {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string;
  const canAction = role === 'qa_engineer' || role === 'admin';

  const severityIcons = {
    critical: <ShieldAlert size={20} />,
    high: <AlertTriangle size={20} />,
    medium: <AlertCircle size={20} />,
    low: <Info size={20} />,
  };

  const isConfirmed = finding.status === 'confirmed';
  const isFalsePositive = finding.status === 'false_positive';

  return (
    <div className={`group p-6 bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-xl relative overflow-hidden ${
      isConfirmed ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 
      isFalsePositive ? 'opacity-60 border-slate-200' : 'border-slate-100 hover:border-accent/40'
    }`}>
      {/* Status Indicators */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${
        isFalsePositive ? 'bg-slate-300' :
        finding.severity === 'critical' ? 'bg-red-500' :
        finding.severity === 'high' ? 'bg-orange-500' :
        finding.severity === 'medium' ? 'bg-amber-500' :
        'bg-blue-500'
      }`} />
      
      <div className="flex items-start gap-4">
        {/* Severity Icon */}
        <div className={`mt-1 p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${
          isFalsePositive ? 'bg-slate-100 text-slate-400' :
          finding.severity === 'critical' ? 'bg-red-50 text-red-600' :
          finding.severity === 'high' ? 'bg-orange-50 text-orange-600' :
          finding.severity === 'medium' ? 'bg-amber-50 text-amber-600' :
          'bg-blue-50 text-blue-600'
        }`}>
          {isFalsePositive ? <XCircle size={20} /> : severityIcons[finding.severity]}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header Info */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FindingSeverityEditor 
                findingId={finding.id}
                pageId={finding.page_id}
                currentSeverity={finding.severity}
                canEdit={canAction && !isFalsePositive}
              />
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {CHECK_FACTOR_ICONS[finding.check_factor] || <FileSearch size={14} />}
                {finding.check_factor.replace('_', ' ')}
              </div>
            </div>
            <span className="text-[8px] font-bold text-slate-300 uppercase">
              {new Date(finding.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Title & Description */}
          <h4 className={`font-black text-slate-900 text-base mb-2 group-hover:text-black transition-colors leading-tight ${
            isFalsePositive ? 'line-through text-slate-400' : ''
          }`}>
            {finding.title}
          </h4>
          {finding.description && (
            <p className={`text-[11px] text-slate-500 font-medium leading-relaxed mb-4 ${
              isFalsePositive ? 'text-slate-400' : ''
            }`}>
              {finding.description}
            </p>
          )}

          {/* Screenshot Thumbnail */}
          {finding.screenshot_url && (
            <div className="mb-4 relative group/img cursor-pointer max-w-[200px]">
              <div className="aspect-video bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative">
                <img 
                  src={finding.screenshot_url} 
                  alt="Finding evidence" 
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center">
                  <Eye className="text-white w-5 h-5" />
                </div>
              </div>
              <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">Click to expand evidence</p>
            </div>
          )}

          {/* Context Text */}
          {finding.context_text && (
            <div className="mb-6">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Contextual Data</p>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto whitespace-pre">
                {finding.context_text}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {canAction && !isFalsePositive && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {!isConfirmed && (
                  <button 
                    onClick={() => onConfirm?.(finding.id)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle2 size={12} />
                    Confirm
                  </button>
                )}
                <button 
                  onClick={() => onFalsePositive?.(finding.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <XCircle size={12} />
                  False Positive
                </button>
              </div>
              <button 
                onClick={() => onCreateTask?.(finding)}
                className="flex items-center gap-1.5 px-3 py-1 bg-black text-accent text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus size={12} />
                Create Task
              </button>
            </div>
          )}

          {isFalsePositive && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Marked as False Positive</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
