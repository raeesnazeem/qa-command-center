import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Plus, 
  UserPlus, 
  CheckSquare, 
  Square,
  BarChart3,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { QAFinding } from '../api/runs.api';
import { FindingCard } from './FindingCard';
import { CheckFactorFilter, FILTER_TABS, FilterTab } from './CheckFactorFilter';

interface FindingReviewPanelProps {
  findings: QAFinding[];
  pageScreenshots?: {
    desktop?: string | null;
    tablet?: string | null;
    mobile?: string | null;
  };
  onConfirmBulk?: (ids: string[]) => void;
  onFalsePositiveBulk?: (ids: string[]) => void;
  onCreateTasksBulk?: (findings: QAFinding[]) => void;
  onAssignBulk?: (ids: string[]) => void;
  onSingleConfirm?: (id: string) => void;
  onSingleFalsePositive?: (id: string) => void;
  onSingleCreateTask?: (finding: QAFinding) => void;
}

export const FindingReviewPanel: React.FC<FindingReviewPanelProps> = ({
  findings,
  pageScreenshots,
  onConfirmBulk,
  onFalsePositiveBulk,
  onCreateTasksBulk,
  onAssignBulk,
  onSingleConfirm,
  onSingleFalsePositive,
  onSingleCreateTask
}) => {
  const [selectedFactor, setSelectedFactor] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Summary Stats
  const stats = useMemo(() => {
    return {
      open: findings.filter(f => f.status === 'open').length,
      confirmed: findings.filter(f => f.status === 'confirmed').length,
      falsePositives: findings.filter(f => f.status === 'false_positive').length,
      total: findings.length
    };
  }, [findings]);

  // Filtered Findings
  const filteredFindings = useMemo(() => {
    if (!selectedFactor) return findings;
    
    // Find the tab definition to get associated factors
    const tab = FILTER_TABS.find((t: FilterTab) => t.id === selectedFactor);
    if (!tab || tab.factors.length === 0) return findings.filter(f => f.check_factor === selectedFactor);
    
    return findings.filter(f => tab.factors.includes(f.check_factor));
  }, [findings, selectedFactor]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFindings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFindings.map(f => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkConfirm = () => {
    onConfirmBulk?.(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkFalsePositive = () => {
    onFalsePositiveBulk?.(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkCreateTasks = () => {
    const selectedFindings = findings.filter(f => selectedIds.has(f.id));
    onCreateTasksBulk?.(selectedFindings);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Summary Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Open</p>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.open}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Confirmed</p>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.confirmed}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">False Positives</p>
            <p className="text-xl font-black text-slate-900 leading-none">{stats.falsePositives}</p>
          </div>
        </div>
        <div className="bg-black p-4 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-accent/20 text-accent rounded-xl">
            <BarChart3 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Audit</p>
            <p className="text-xl font-black text-white leading-none">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-100 p-2 rounded-2xl shadow-sm">
        <CheckFactorFilter 
          findings={findings}
          selectedFactor={selectedFactor}
          onSelectFactor={(factor) => {
            setSelectedFactor(factor);
            setSelectedIds(new Set()); // Reset selection on filter change
          }}
        />
      </div>

      {/* Bulk Action Toolbar */}
      <div className={`sticky top-4 z-20 bg-black rounded-2xl p-4 border border-slate-800 shadow-2xl transition-all duration-300 ${
        selectedIds.size > 0 ? 'translate-y-0 opacity-100 visible' : '-translate-y-4 opacity-0 invisible h-0 overflow-hidden !p-0 !m-0'
      }`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSelectAll}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              {selectedIds.size === filteredFindings.length ? <CheckSquare className="text-accent" /> : <Square />}
            </button>
            <div>
              <p className="text-white font-black text-sm leading-none">{selectedIds.size} Selected</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Bulk action ready</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleBulkConfirm}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all active:scale-95"
            >
              <CheckCircle size={14} />
              Confirm All
            </button>
            <button 
              onClick={handleBulkFalsePositive}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/20 border border-white/10 transition-all active:scale-95"
            >
              <XCircle size={14} />
              Mark False Positives
            </button>
            <button 
              onClick={handleBulkCreateTasks}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-accent/90 transition-all active:scale-95"
            >
              <Plus size={14} />
              Create Tasks
            </button>
            <button 
              onClick={() => onAssignBulk?.(Array.from(selectedIds))}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all active:scale-95"
            >
              <UserPlus size={14} />
              Assign
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Findings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {filteredFindings.map((finding) => (
          <div key={finding.id} className="relative group/wrapper">
            <div 
              onClick={() => toggleSelect(finding.id)}
              className={`absolute top-4 left-4 z-10 cursor-pointer p-1 rounded-md transition-all ${
                selectedIds.has(finding.id) ? 'bg-black text-accent scale-110 shadow-lg' : 'bg-slate-100 text-slate-300 opacity-0 group-hover/wrapper:opacity-100'
              }`}
            >
              {selectedIds.has(finding.id) ? <CheckSquare size={16} /> : <Square size={16} />}
            </div>
            <FindingCard 
              finding={finding}
              pageScreenshots={pageScreenshots}
              onConfirm={onSingleConfirm}
              onFalsePositive={onSingleFalsePositive}
              onCreateTask={onSingleCreateTask}
            />
          </div>
        ))}
        
        {filteredFindings.length === 0 && (
          <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
              <Filter className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-900 font-black text-base uppercase tracking-tight">No findings match filter</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Try selecting a different check factor</p>
          </div>
        )}
      </div>
    </div>
  );
};
