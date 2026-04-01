import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { ImageViewer } from './ImageViewer';
import { QAFinding } from '../api/runs.api';

interface FindingCardWithScreenshotProps {
  finding: QAFinding;
}

export const FindingCardWithScreenshot: React.FC<FindingCardWithScreenshotProps> = ({ finding }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (!finding.screenshot_url) return null;

  return (
    <>
      <div 
        className="relative group cursor-pointer w-[100px] h-[70px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-sm hover:shadow-md transition-all active:scale-95"
        onClick={() => setIsViewerOpen(true)}
      >
        <img 
          src={finding.screenshot_url} 
          alt="Finding evidence" 
          className="w-full h-full object-cover object-top transition-transform group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye size={16} className="text-white" />
        </div>
      </div>

      <ImageViewer 
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        screenshots={{
          desktop: finding.screenshot_url
        }}
        initialTab="desktop"
      />
    </>
  );
};
