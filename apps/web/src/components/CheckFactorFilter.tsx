import React from 'react';
import { QAFinding } from '../api/runs.api';

interface CheckFactorFilterProps {
  findings: QAFinding[];
  selectedFactor: string | null;
  onSelectFactor: (factor: string | null) => void;
}

export interface FilterTab {
  id: string | null;
  label: string;
  factors: string[];
}

export const FILTER_TABS: FilterTab[] = [
  { id: null, label: 'All', factors: [] },
  { id: 'spelling', label: 'Spelling', factors: ['spelling'] },
  { id: 'broken_links', label: 'Links', factors: ['broken_links', 'external_links'] },
  { id: 'meta_tags', label: 'Meta', factors: ['meta_tags'] },
  { id: 'console_errors', label: 'Console', factors: ['console_errors'] },
  { id: 'dummy_content', label: 'Dummy', factors: ['dummy_content'] },
  { id: 'image_compliance', label: 'Images', factors: ['image_compliance'] },
  { id: 'ai_content_audit', label: 'AI', factors: ['ai_content_audit'] },
  { id: 'forms', label: 'Forms', factors: ['forms'] },
  { id: 'woocommerce', label: 'WooCommerce', factors: ['woocommerce'] },
  { id: 'visual_regression', label: 'Responsive', factors: ['visual_regression'] },
];

export const CheckFactorFilter: React.FC<CheckFactorFilterProps> = ({ 
  findings, 
  selectedFactor, 
  onSelectFactor 
}) => {
  const getOpenCount = (factors: string[]) => {
    if (factors.length === 0) {
      return findings.filter(f => f.status === 'open').length;
    }
    return findings.filter(f => factors.includes(f.check_factor) && f.status === 'open').length;
  };

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
      <div className="flex items-center gap-2 min-w-max">
        {FILTER_TABS.map((tab) => {
          const count = getOpenCount(tab.factors);
          const isActive = selectedFactor === tab.id;

          return (
            <button
              key={tab.label}
              onClick={() => onSelectFactor(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-200 ${
                isActive 
                  ? 'bg-black border-black text-white shadow-md' 
                  : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className={`text-[11px] font-black uppercase tracking-wider ${
                isActive ? 'text-accent' : ''
              }`}>
                {tab.label}
              </span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  isActive ? 'bg-accent text-black' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
