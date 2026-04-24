import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Plus, 
  Check, 
  Loader2, 
  Square,
  Search,
  ChevronDown,
  Image as ImageIcon,
  AlertTriangle,
  Type,
  AlignLeft,
  Layout,
  MousePointer2
} from 'lucide-react';
import { QAPage, QARun } from '../api/runs.api';
import { useCreateFinding } from '../hooks/useRuns';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ManualScanOverlayProps {
  run: QARun;
  isOpen: boolean;
  onClose: () => void;
  initialPageId?: string | null;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';

interface Selection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface StagedIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check_factor: string;
  viewport: Viewport;
  screenshot_url: string;
}

const ISSUE_TYPES = [
  { id: 'visual_diff', label: 'Visual/Alignment', icon: Layout },
  { id: 'spelling', label: 'Spelling/Content', icon: Type },
  { id: 'performance', label: 'Performance', icon: ImageIcon },
  { id: 'functionality', label: 'Functionality', icon: MousePointer2 },
];

export const ManualScanOverlay: React.FC<ManualScanOverlayProps> = ({ run, isOpen, onClose, initialPageId }) => {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stagedIssues, setStagedIssues] = useState<StagedIssue[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [checkFactor, setCheckFactor] = useState('visual_diff');

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPage = useMemo(() => 
    run.pages?.find(p => p.id === selectedPageId), 
    [run.pages, selectedPageId]
  );

  const filteredPages = useMemo(() => 
    run.pages?.filter(p => p.url.toLowerCase().includes(searchQuery.toLowerCase())) || [],
    [run.pages, searchQuery]
  );

  const { mutateAsync: createFinding } = useCreateFinding(selectedPageId);

  useEffect(() => {
    if (isOpen) {
      if (initialPageId) {
        setSelectedPageId(initialPageId);
      } else if (run.pages?.length && !selectedPageId) {
        setSelectedPageId(run.pages[0].id);
      }
    }
  }, [isOpen, run.pages, selectedPageId, initialPageId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getScreenshotUrl = () => {
    if (!selectedPage) return null;
    switch (viewport) {
      case 'desktop': return selectedPage.screenshot_url_desktop;
      case 'tablet': return selectedPage.screenshot_url_tablet;
      case 'mobile': return selectedPage.screenshot_url_mobile;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current || isSelecting) return;
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelection({ startX: x, startY: y, endX: x, endY: y });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !imgRef.current || !selection) return;
    
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    
    setSelection({ ...selection, endX: x, endY: y });
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
  };

  const captureCrop = async (): Promise<string | null> => {
    if (!imgRef.current || !selection) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const x = Math.min(selection.startX, selection.endX) * scaleX;
    const y = Math.min(selection.startY, selection.endY) * scaleY;
    const width = Math.abs(selection.endX - selection.startX) * scaleX;
    const height = Math.abs(selection.endY - selection.startY) * scaleY;

    if (width < 5 || height < 5) {
      toast.error('Selection area too small');
      return null;
    }

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        setIsUploading(true);
        try {
          const fileName = `manual-scans/${run.id}/${Date.now()}.png`;
          const { data, error } = await supabase.storage
            .from('screenshots')
            .upload(fileName, blob, { contentType: 'image/png' });

          if (error) throw error;

          // Get public URL or signed URL
          const { data: urlData } = await supabase.storage
            .from('screenshots')
            .getPublicUrl(fileName);

          resolve(urlData.publicUrl);
        } catch (err: any) {
          console.error('Upload error:', err);
          toast.error('Failed to upload crop');
          resolve(null);
        } finally {
          setIsUploading(false);
        }
      }, 'image/png');
    });
  };

  const handleAddIssue = async () => {
    if (!title) {
      toast.error('Please add a title');
      return;
    }
    if (!selection) {
      toast.error('Please select an area on the screenshot');
      return;
    }

    const screenshot_url = await captureCrop();
    if (!screenshot_url) return;

    const newIssue: StagedIssue = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      description,
      severity,
      check_factor: checkFactor,
      viewport,
      screenshot_url
    };

    setStagedIssues([...stagedIssues, newIssue]);
    
    // Reset form but keep page/viewport
    setTitle('');
    setDescription('');
    setSelection(null);
    toast.success('Issue added to batch');
  };

  const handleSaveAll = async () => {
    if (stagedIssues.length === 0) return;
    
    setIsSaving(true);
    try {
      for (const issue of stagedIssues) {
        await createFinding({
          page_id: selectedPageId!,
          run_id: run.id,
          check_factor: issue.check_factor,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          screenshot_url: issue.screenshot_url,
          ai_generated: false
        });
      }
      toast.success(`Successfully saved ${stagedIssues.length} issues`);
      onClose();
    } catch (err) {
      toast.error('Failed to save some issues');
    } finally {
      setIsSaving(false);
    }
  };

  const removeStagedIssue = (id: string) => {
    setStagedIssues(stagedIssues.filter(i => i.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
              <ImageIcon className="text-black" size={20} />
            </div>
            <div>
              <h2 className="text-white font-black uppercase tracking-widest text-sm">Manual Inspector</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter">Run #{run.id.substring(0, 8)}</p>
            </div>
          </div>

          {/* Page Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
            >
              <div className="max-w-[240px] truncate text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Target Page</p>
                <p className="text-xs font-bold text-white truncate">{selectedPage?.url || 'Select a page'}</p>
              </div>
              <ChevronDown className={`text-slate-500 transition-transform ${isPageDropdownOpen ? 'rotate-180' : ''}`} size={16} />
            </button>

            {isPageDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-[400px] bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-white/5 bg-black/20">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text"
                      placeholder="Search pages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {filteredPages.map(page => (
                    <button
                      key={page.id}
                      onClick={() => {
                        setSelectedPageId(page.id);
                        setIsPageDropdownOpen(false);
                        setSelection(null);
                      }}
                      className={`w-full px-4 py-3 flex flex-col gap-1 text-left hover:bg-white/5 transition-colors ${selectedPageId === page.id ? 'bg-accent/10 border-l-2 border-accent' : ''}`}
                    >
                      <span className="text-xs font-bold text-white truncate">{page.url}</span>
                      <span className="text-[10px] text-slate-500">{page.title || 'No title'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Viewport Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/20 relative">
          {/* Viewport Toggles */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-slate-800/80 backdrop-blur rounded-xl border border-white/10 z-10">
            {[
              { id: 'desktop', icon: Monitor, label: 'Desktop' },
              { id: 'tablet', icon: Tablet, label: 'Tablet' },
              { id: 'mobile', icon: Smartphone, label: 'Mobile' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => {
                  setViewport(v.id as Viewport);
                  setSelection(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewport === v.id 
                    ? 'bg-accent text-black shadow-lg shadow-accent/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <v.icon size={14} />
                {v.label}
              </button>
            ))}
          </div>

          {/* Screenshot Container */}
          <div className="flex-1 overflow-auto p-20 flex justify-center items-start" ref={containerRef}>
            <div 
              className="relative shadow-2xl transition-all duration-500"
              style={{
                width: viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%',
                maxWidth: viewport === 'desktop' ? '1280px' : 'none'
              }}
            >
              {getScreenshotUrl() ? (
                <div 
                  className="relative cursor-crosshair select-none bg-slate-800 rounded-sm overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img 
                    ref={imgRef}
                    src={getScreenshotUrl()!} 
                    alt="Page Screenshot" 
                    className="w-full h-auto pointer-events-none"
                    draggable={false}
                  />
                  
                  {/* Selection Overlay */}
                  {selection && (
                    <div 
                      className="absolute border-2 border-accent bg-accent/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                      style={{
                        left: Math.min(selection.startX, selection.endX),
                        top: Math.min(selection.startY, selection.endY),
                        width: Math.abs(selection.endX - selection.startX),
                        height: Math.abs(selection.endY - selection.startY)
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-accent text-black text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        Selected Area
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-video bg-slate-800 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-white/10">
                  <ImageIcon className="text-slate-700 mb-4" size={48} />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No screenshot available for this view</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Form & Staged Issues */}
        <div className="w-[400px] bg-slate-900 border-l border-white/10 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* New Issue Form */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Plus className="text-accent" size={18} />
                <h3 className="text-white font-black uppercase tracking-widest text-xs">Add New Issue</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Issue Title</label>
                  <input 
                    type="text"
                    placeholder="e.g. Broken image on header"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    placeholder="Describe the issue in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                    <select
                      value={checkFactor}
                      onChange={(e) => setCheckFactor(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent/50 transition-all appearance-none cursor-pointer"
                    >
                      {ISSUE_TYPES.map(type => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleAddIssue}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-accent transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg shadow-black/20"
                >
                  {isUploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      Add to Batch
                    </>
                  )}
                </button>
                <p className="text-[9px] text-slate-500 text-center uppercase font-bold tracking-tight px-4">
                  Click and drag on the screenshot to highlight the issue area
                </p>
              </div>
            </div>

            {/* Staged List */}
            <div className="pt-8 border-t border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layout className="text-slate-500" size={18} />
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">Staged ({stagedIssues.length})</h3>
                </div>
                {stagedIssues.length > 0 && (
                  <button 
                    onClick={() => setStagedIssues([])}
                    className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {stagedIssues.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    <ImageIcon className="text-slate-800 mx-auto mb-2" size={32} />
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">No issues staged yet</p>
                  </div>
                ) : (
                  stagedIssues.map(issue => (
                    <div key={issue.id} className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
                      <div className="flex p-3 gap-3">
                        <div className="w-16 h-16 rounded-lg bg-black/40 overflow-hidden shrink-0 border border-white/5">
                          <img src={issue.screenshot_url} className="w-full h-full object-cover" alt="Crop" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[11px] font-bold text-white truncate">{issue.title}</h4>
                            <button 
                              onClick={() => removeStagedIssue(issue.id)}
                              className="text-slate-500 hover:text-red-500 transition-colors shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                              issue.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                              issue.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                              issue.severity === 'medium' ? 'bg-amber-500/20 text-amber-500' :
                              'bg-blue-500/20 text-blue-500'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">
                              {ISSUE_TYPES.find(t => t.id === issue.check_factor)?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 bg-black/40 border-t border-white/10">
            <button 
              onClick={handleSaveAll}
              disabled={stagedIssues.length === 0 || isSaving}
              className="w-full flex items-center justify-center gap-2 bg-accent text-black text-[11px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-accent/90 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:pointer-events-none shadow-xl shadow-accent/10"
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <ImageIcon size={18} />
                  Save {stagedIssues.length} Issues to Run
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
