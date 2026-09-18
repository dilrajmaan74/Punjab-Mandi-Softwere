import React from 'react';
import { X, FileText, Image as ImageIcon, Download, ExternalLink, ZoomIn } from 'lucide-react';

interface ParchiViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  name?: string;
  title?: string;
  voucherId?: string;
  sourceName?: string;
  date?: string;
}

export const ParchiViewerModal: React.FC<ParchiViewerModalProps> = ({
  isOpen,
  onClose,
  url,
  name,
  title,
  voucherId,
  sourceName,
  date
}) => {
  if (!isOpen || !url) return null;

  const isPdf = url.startsWith('data:application/pdf') || (name && name.toLowerCase().endsWith('.pdf'));

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = name || `Bardana_Parchi_${voucherId || 'slip'}.${isPdf ? 'pdf' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleOpenInNewTab = () => {
    try {
      // For data URLs, create a blob or open directly
      if (url.startsWith('data:')) {
        const parts = url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || (isPdf ? 'application/pdf' : 'image/jpeg');
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error opening tab:', err);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  {title || 'ਬਾਰਦਾਨਾ ਪਰਚੀ (Bardana Parchi)'}
                </h3>
                {voucherId && (
                  <span className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded">
                    {voucherId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                {sourceName ? `${sourceName} • ` : ''}
                {date ? `ਮਿਤੀ: ${date} • ` : ''}
                {name || (isPdf ? 'PDF Document' : 'Photo')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
              title="ਨਵੀਂ ਟੈਬ ਵਿੱਚ ਖੋਲ੍ਹੋ (Open in New Tab)"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
              title="ਡਾਊਨਲੋਡ (Download)"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition ml-1"
              title="ਬੰਦ ਕਰੋ (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 bg-slate-950/95 flex-1 flex items-center justify-center overflow-auto min-h-[300px] max-h-[76vh]">
          {isPdf ? (
            <div className="w-full h-[70vh] flex flex-col bg-white rounded-lg overflow-hidden">
              <iframe
                src={url}
                className="w-full h-full border-none"
                title="Parchi PDF Preview"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <img
                src={url}
                alt="Bardana Receiving Parchi"
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 border-t border-slate-800">
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>ਪਰਚੀ ਦੀ ਅਸਲ ਫੋਟੋ / ਦਸਤਾਵੇਜ਼</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ਡਾਊਨਲੋਡ</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition"
            >
              ਬੰਦ ਕਰੋ (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
