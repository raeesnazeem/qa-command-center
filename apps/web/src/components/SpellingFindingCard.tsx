import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Plus,
  FileSearch,
  Activity,
  UserPlus
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useRole } from '../hooks/useRole';
import { FindingSeverityEditor } from './FindingSeverityEditor';
import { RebuttalVerdictCard } from './RebuttalVerdictCard';
import { FindingCardWithScreenshot } from './FindingCardWithScreenshot';
import { QAFinding } from '../api/runs.api';
import { useAuthAxios } from '../lib/useAuthAxios';

interface FindingCardProps {
  finding: QAFinding;
  pageScreenshots?: {
    desktop?: string | null;
    tablet?: string | null;
    mobile?: string | null;
  };
  onConfirm?: (id: string) => void;
  onFalsePositive?: (id: string) => void;
  onCreateTask?: (finding: QAFinding) => void;
  onAssign?: (id: string) => void;
}

export const SpellingFindingCard: React.FC<FindingCardProps> = ({ 
  finding, 
  pageScreenshots,
  onConfirm, 
  onFalsePositive, 
  onCreateTask,
  onAssign
}) => {
  const { canDo } = useRole();
  const axios = useAuthAxios();
  const canAction = canDo('qa_engineer');
  const { id: projectId } = useParams<{ id: string }>();
  
  const [isAddingAllowlist, setIsAddingAllowlist] = useState(false);

  const severityIcons = {
    critical: <ShieldAlert size={20} />,
    high: <AlertTriangle size={20} />,
    medium: <AlertCircle size={20} />,
    low: <Info size={20} />,
  };

  const isConfirmed = finding.status === 'confirmed';
  const isFalsePositive = finding.status === 'false_positive';
  const hasTask = (finding.tasks && finding.tasks.length > 0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract misspelled word from title (e.g., "Misspelled: word")
  const titleMatch = finding.title.match(/Misspelled:\s*(.+)/i);
  const misspelledWord = titleMatch ? titleMatch[1] : '';

  // Extract suggestion from description (e.g., "Suggestion: word" or "No suggestions found")
  const descMatch = finding.description?.match(/Suggestion:\s*(.+)/i);
  const suggestion = descMatch ? descMatch[1] : '';

  const handleAllowlist = async () => {
    if (!projectId || !misspelledWord) return;
    setIsAddingAllowlist(true);
    try {
      await axios.post(`/api/findings/projects/${projectId}/spelling-allowlist`, { word: misspelledWord });
    } catch (e) {
      console.error('Failed to add to allowlist', e);
    } finally {
      setIsAddingAllowlist(false);
    }
  };

  const renderContextText = () => {
    if (!finding.context_text) return null;
    if (!misspelledWord) return finding.context_text;
    
    // Case-insensitive replace for highlighting the precise mispelled word
    const regex = new RegExp(`(${misspelledWord})`, 'gi');
    const parts = finding.context_text.split(regex);

    return parts.map((part, i) => 
      part.toLowerCase() === misspelledWord.toLowerCase() ? (
        <span key={i} className="text-red-500 font-bold bg-red-500/10 px-1 rounded">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className={`group p-6 bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-xl relative overflow-hidden ${
      isConfirmed ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 
      isFalsePositive ? 'opacity-60 border-slate-200' : 'border-slate-100 hover:border-accent/40'
    }`}>
      {/* Status Indicators */}
      
      <div className="flex items-start gap-4">
        {/* Severity Icon */}
        <div className={`mt-1 p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${
          isFalsePositive ? 'bg-slate-100 text-slate-400' :
          finding.severity === 'critical' ? 'bg-red-50 text-red-600' :
          finding.severity === 'high' ? 'bg-orange-50 text-orange-600' :
          finding.severity === 'medium' ? 'bg-amber-50 text-amber-600' :
          'bg-yellow-50 text-yellow-600'
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
                <FileSearch size={14} />
                SPELLING
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
            <div className="mb-4">
              <p className={`text-[11px] text-slate-500 font-medium leading-relaxed ${
                isFalsePositive ? 'text-slate-400' : ''
              } ${!isExpanded ? 'line-clamp-3' : ''}`}>
                {finding.description}
              </p>
              {finding.description.length > 150 && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[10px] font-black text-accent uppercase tracking-widest mt-1 hover:text-black transition-colors"
                >
                  {isExpanded ? 'See less' : 'See more'}
                </button>
              )}
            </div>
          )}

          {/* Screenshot Thumbnail */}
          {(finding.screenshot_url || pageScreenshots?.desktop) && (
            <div className="mb-4 relative group/img cursor-pointer max-w-[200px]">
              <FindingCardWithScreenshot 
                finding={finding} 
                pageScreenshots={pageScreenshots} 
              />
              <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                {finding.screenshot_url ? 'Click to expand evidence' : 'Click to view page context'}
              </p>
            </div>
          )}

          {/* Context Text and Suggestions */}
          {finding.context_text && (
            <div className="mb-6">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Context Sentence</p>
              <div className="h-[80px] p-3 bg-slate-900 rounded-[10px] border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#93C0B1] [&::-webkit-scrollbar-track]:bg-transparent">
                {renderContextText()}
              </div>
              {suggestion && (
                <div className="mt-2 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                  <span className="font-bold uppercase tracking-wider text-[9px] mr-1.5">Suggested:</span> 
                  {suggestion}
                </div>
              )}
            </div>
          )}

          {/* AI Rebuttal Verdict */}
          {finding.tasks?.[0]?.rebuttals?.[0] && finding.tasks[0].rebuttals[0].ai_verdict && (
            <div className="mb-6">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-3 tracking-widest">AI Verdict on Rebuttal</p>
              <RebuttalVerdictCard 
                verdictData={{
                  verdict: finding.tasks[0].rebuttals[0].ai_verdict as 'resolved' | 'disputed',
                  confidence: finding.tasks[0].rebuttals[0].ai_confidence || 0,
                  reasoning: finding.tasks[0].rebuttals[0].ai_reasoning || ''
                }}
              />
            </div>
          )}

          {finding.tasks?.[0]?.rebuttals?.[0] && !finding.tasks[0].rebuttals[0].ai_verdict && (
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Activity size={16} className="text-blue-500 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">AI Analysis Pending</p>
                <p className="text-[9px] text-slate-500 font-medium">Gemini is reviewing the developer's rebuttal...</p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {canAction && !isFalsePositive && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                {!isConfirmed && (
                  <button 
                    onClick={() => onConfirm?.(finding.id)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-[10px] hover:bg-emerald-600 transition-colors"
                  >
                    <CheckCircle2 size={12} />
                    Confirm
                  </button>
                )}
                <button 
                  onClick={() => onFalsePositive?.(finding.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-[10px] hover:bg-slate-50 transition-colors"
                >
                  <XCircle size={12} />
                  False Positive
                </button>
                <button 
                  onClick={() => onAssign?.(finding.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-[10px] hover:bg-slate-50 transition-colors"
                >
                  <UserPlus size={12} />
                  Assign
                </button>
                {misspelledWord && (
                  <button
                    onClick={handleAllowlist}
                    disabled={isAddingAllowlist}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 text-[9px] font-black uppercase tracking-widest rounded-[10px] hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    <Plus size={12} />
                    {isAddingAllowlist ? 'Adding...' : 'Add to Allowlist'}
                  </button>
                )}
              </div>
              <button 
                onClick={() => onCreateTask?.(finding)}
                disabled={hasTask}
                className={`flex items-center gap-1.5 px-3 py-1 bg-black text-accent text-[9px] font-black uppercase tracking-widest rounded-[10px] hover:bg-slate-800 transition-colors shrink-0 ${hasTask ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Plus size={12} />
                {hasTask ? 'Task Linked' : 'Create Task'}
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
