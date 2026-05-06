import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Image as ImageIcon, ChevronLeft, ChevronRight, RotateCw, ExternalLink, AlertCircle } from 'lucide-react';
import { useAuthAxios } from '../lib/useAuthAxios';

interface BrowserOverlayProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageUrl: string) => void;
  galleryCount: number;
}

export const BrowserOverlay: React.FC<BrowserOverlayProps> = ({
  url,
  isOpen,
  onClose,
  onCapture,
  galleryCount
}) => {
  const axios = useAuthAxios();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [currentProxiedUrl, setCurrentProxiedUrl] = useState<string>(url);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProxyUrl = async (targetUrl: string = url) => {
    if (!targetUrl) return;
    setLoading(true);
    setError(null);
    setCurrentProxiedUrl(targetUrl);
    try {
      const response = await axios.post('/api/proxy-browser', { url: targetUrl }, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/html' });
      const dataUrl = URL.createObjectURL(blob);
      setIframeUrl(dataUrl);
    } catch (err: any) {
      console.error('[BrowserOverlay] Proxy load failed:', err);
      setError(err.response?.data?.error || 'Failed to load page through secure proxy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProxyUrl(url);
    }
    
    // Cleanup data URL
    return () => {
      if (iframeUrl && iframeUrl.startsWith('blob:')) {
        URL.revokeObjectURL(iframeUrl);
      }
    };
  }, [url, isOpen]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    loadProxyUrl(currentProxiedUrl);
  };

  const handleCapture = async () => {
    if (galleryCount >= 3 || error || loading || !iframeRef.current) return;
    
    setLoading(true);
    try {
      let scrollX = 0;
      let scrollY = 0;
      let width = 1280;
      let height = 720;

      // Wrap DOM access in try/catch to handle potential cross-origin security errors
      try {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (iframeDoc) {
          scrollX = Math.round(iframeDoc.documentElement?.scrollLeft || iframeDoc.body?.scrollLeft || 0);
          scrollY = Math.round(iframeDoc.documentElement?.scrollTop || iframeDoc.body?.scrollTop || 0);
          width = Math.max(iframe.clientWidth || 1280, 100);
          height = Math.max(iframe.clientHeight || 720, 100);
        }
      } catch (domErr) {
        console.warn('[BrowserOverlay] Could not access iframe DOM (likely cross-origin). Using defaults.', domErr);
      }

      const response = await axios.post('/api/proxy-browser/capture', { 
        url: currentProxiedUrl,
        scrollX,
        scrollY,
        width,
        height
      });
      
      if (response.data?.imageUrl) {
        onCapture(response.data.imageUrl);
      }
    } catch (err: any) {
      console.error('[BrowserOverlay] Capture failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in fade-in duration-300">
      {/* Browser Toolbar */}
      <div className="h-14 border-b border-slate-200 bg-slate-50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-slate-200 rounded-md transition-colors text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <button className="p-2 hover:bg-slate-200 rounded-md transition-colors text-slate-400">
              <ChevronRight size={18} />
            </button>
            <button 
              onClick={handleRefresh}
              className="p-2 hover:bg-slate-200 rounded-md transition-colors text-slate-400"
            >
              <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="flex-1 max-w-2xl relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ExternalLink size={14} />
            </div>
            <input 
              type="text" 
              value={currentProxiedUrl}
              readOnly
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent/20"
            />
          </div>
        </div>

        <button 
          onClick={onClose}
          className="ml-4 p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-slate-100 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Securing Connection...</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
            <div className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
              <div className="p-4 bg-red-50 rounded-full text-red-500">
                <AlertCircle size={40} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Proxy Connection Blocked</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {error}. For security reasons, some domains cannot be displayed in the in-app browser.
                </p>
              </div>
              <button 
                onClick={() => window.open(url, '_blank')}
                className="mt-2 btn-unified flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl hover:bg-accent hover:text-black transition-all"
              >
                <ExternalLink size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Open in New Tab Instead</span>
              </button>
            </div>
          </div>
        ) : iframeUrl ? (
          <iframe 
            ref={iframeRef}
            src={iframeUrl}
            className="w-full h-full border-none bg-white"
            onLoad={() => setLoading(false)}
            title="Proxied Browser"
          />
        ) : null}
      </div>

      {/* Sticky Bottom Toolbar */}
      <div className="h-16 border-t border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
              <ImageIcon size={16} className="text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Task Gallery</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{galleryCount} / 3 Images</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCapture}
            disabled={galleryCount >= 3 || !!error}
            className="btn-unified flex items-center gap-2 px-6 py-2 bg-black text-white rounded-xl hover:bg-accent hover:text-black transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Camera size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Capture Evidence</span>
          </button>
        </div>
      </div>
    </div>
  );
};
