import React from 'react';
import { useUpdateFinding } from '../hooks/useRuns';
import { FindingSeverity } from '@qacc/shared';
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface FindingSeverityEditorProps {
  findingId: string;
  pageId: string;
  currentSeverity: FindingSeverity;
  canEdit: boolean;
}

const SEVERITY_OPTIONS: { value: FindingSeverity; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'critical', label: 'Critical', icon: <ShieldAlert size={12} />, color: 'text-red-600 bg-red-50' },
  { value: 'high', label: 'High', icon: <AlertTriangle size={12} />, color: 'text-orange-600 bg-orange-50' },
  { value: 'medium', label: 'Medium', icon: <AlertCircle size={12} />, color: 'text-amber-600 bg-amber-50' },
  { value: 'low', label: 'Low', icon: <Info size={12} />, color: 'text-blue-600 bg-blue-50' },
];

export const FindingSeverityEditor: React.FC<FindingSeverityEditorProps> = ({
  findingId,
  pageId,
  currentSeverity,
  canEdit
}) => {
  const updateFinding = useUpdateFinding(pageId);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeverity = e.target.value as FindingSeverity;
    if (newSeverity !== currentSeverity) {
      updateFinding.mutate({
        findingId,
        data: { severity: newSeverity }
      });
    }
  };

  if (!canEdit) {
    const option = SEVERITY_OPTIONS.find(opt => opt.value === currentSeverity);
    return (
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${option?.color || ''}`}>
        {option?.icon}
        {currentSeverity}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <select
        value={currentSeverity}
        onChange={handleChange}
        disabled={updateFinding.isPending}
        className={`appearance-none pl-2 pr-6 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all ${
          SEVERITY_OPTIONS.find(opt => opt.value === currentSeverity)?.color || ''
        }`}
      >
        {SEVERITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    </div>
  );
};
