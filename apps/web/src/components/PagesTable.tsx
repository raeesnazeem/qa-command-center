import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Image as ImageIcon,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { QAPage } from '../api/runs.api';

interface PagesTableProps {
  pages: QAPage[];
  onPageSelect: (page: QAPage) => void;
}

export const PagesTable: React.FC<PagesTableProps> = ({ pages, onPageSelect }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, // Estimate row height
    overscan: 10,
  });

  const getStatusIcon = (status: QAPage['status'], findingCounts?: Record<string, number>) => {
    const totalIssues = findingCounts ? Object.values(findingCounts).reduce((a, b) => a + b, 0) : 0;

    switch (status) {
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'screenshotted':
      case 'done':
        if (totalIssues > 0) {
          return <XCircle className="w-5 h-5 text-red-500" />;
        }
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
      {/* Table Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
        <div className="flex-1">Page URL</div>
        <div className="w-24 text-center">Status</div>
        <div className="w-32 text-center">Issues</div>
        <div className="w-20 text-center">Visual</div>
      </div>

      {/* Virtualized Body */}
      <div 
        ref={parentRef} 
        className="flex-1 overflow-auto bg-white"
        style={{ height: '500px' }} // Fixed height for virtualization container
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const page = pages[virtualRow.index];
            const totalIssues = page.finding_counts 
              ? Object.values(page.finding_counts).reduce((a, b) => a + b, 0) 
              : 0;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                onClick={() => onPageSelect(page)}
                className="absolute top-0 left-0 w-full border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group flex items-center px-6 py-3"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {page.url.replace(/https?:\/\/[^\/]+/, '') || '/'}
                    </p>
                    <a 
                      href={page.url} 
                      target="_blank" 
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-500 transition-all"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate font-mono">
                    {page.url}
                  </p>
                </div>

                <div className="w-24 flex justify-center">
                  {getStatusIcon(page.status, page.finding_counts)}
                </div>

                <div className="w-32 flex justify-center">
                  {totalIssues > 0 ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded-lg border border-red-100">
                      <span className="text-xs font-black">{totalIssues}</span>
                      <span className="text-[10px] font-bold uppercase tracking-tight">Issues</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clean</span>
                  )}
                </div>

                <div className="w-20 flex justify-center">
                  {page.screenshot_url_desktop ? (
                    <div className="w-10 h-6 bg-slate-100 rounded border border-slate-200 overflow-hidden relative group/img">
                      <img 
                        src={page.screenshot_url_desktop} 
                        alt="Preview" 
                        className="w-full h-full object-cover grayscale group-hover/img:grayscale-0 transition-all"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-6 bg-slate-50 rounded border border-slate-200 flex items-center justify-center">
                      <ImageIcon size={12} className="text-slate-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {pages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="w-8 h-8 text-slate-200 animate-spin mb-4" />
            <p className="text-sm text-slate-400 font-medium italic">Discovering pages via sitemap...</p>
          </div>
        )}
      </div>
    </div>
  );
};
