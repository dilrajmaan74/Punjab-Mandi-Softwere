import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Camera,
  AlertCircle
} from 'lucide-react';

interface ParchiUploadWidgetProps {
  parchiUrl: string;
  parchiName?: string;
  onUpload: (url: string, name: string) => void;
  onRemove: () => void;
  onView: () => void;
  isEn?: boolean;
}

/**
 * Resizes and compresses an image file using an HTML5 Canvas
 * Keeps max dimension at 1600px and 0.82 JPEG quality
 * Shrinks 5MB-10MB mobile phone camera pictures down to ~150-250KB crisp image
 */
async function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl); // fallback to raw dataUrl
      img.onload = () => {
        try {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const ParchiUploadWidget: React.FC<ParchiUploadWidgetProps> = ({
  parchiUrl,
  parchiName,
  onUpload,
  onRemove,
  onView,
  isEn = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPdf =
    parchiUrl.startsWith('data:application/pdf') ||
    Boolean(parchiName && parchiName.toLowerCase().endsWith('.pdf'));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Validate file type
      const isPdfFile =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImgFile =
        file.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|bmp)$/i.test(file.name);

      if (!isPdfFile && !isImgFile) {
        setError(
          isEn
            ? 'Only JPG, JPEG, PNG, or PDF files are supported.'
            : 'ਸਿਰਫ਼ JPG, JPEG, PNG ਜਾਂ PDF ਫਾਈਲ ਸਮਰਥਿਤ ਹੈ।'
        );
        setIsProcessing(false);
        return;
      }

      // Check file size (limit 15MB)
      if (file.size > 15 * 1024 * 1024) {
        setError(
          isEn
            ? 'File is too large (max 15MB allowed).'
            : 'ਫਾਈਲ ਬਹੁਤ ਵੱਡੀ ਹੈ (ਵੱਧ ਤੋਂ ਵੱਧ 15MB ਦੀ ਇਜਾਜ਼ਤ ਹੈ)।'
        );
        setIsProcessing(false);
        return;
      }

      if (isPdfFile) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            onUpload(evt.target.result as string, file.name);
          }
          setIsProcessing(false);
        };
        reader.onerror = () => {
          setError(isEn ? 'Failed to read PDF file.' : 'PDF ਫਾਈਲ ਪੜ੍ਹਨ ਵਿੱਚ ਗਲਤੀ ਆਈ।');
          setIsProcessing(false);
        };
        reader.readAsDataURL(file);
      } else {
        const processedUrl = await processImageFile(file);
        onUpload(processedUrl, file.name);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('File process error:', err);
      setError(
        isEn
          ? 'Error processing file. Please try again.'
          : 'ਫਾਈਲ ਅਪਲੋਡ ਕਰਨ ਵਿੱਚ ਗਲਤੀ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
      );
      setIsProcessing(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
        className="hidden"
      />

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Upload Parchi / ਪਰਚੀ ਅਪਲੋਡ ਕਰੋ</span>
        </label>
        <span className="text-[10px] text-slate-500 font-medium">
          JPG, JPEG, PNG, PDF (ਫੋਟੋ ਜਾਂ ਕਾਗਜ਼ੀ ਪਰਚੀ)
        </span>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* State A: File Attached */}
      {parchiUrl ? (
        <div className="bg-white border border-emerald-300 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Thumbnail / Icon */}
            <div
              onClick={onView}
              className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 relative group shadow-2xs"
              title={isEn ? 'Click to view' : 'ਵੇਖਣ ਲਈ ਕਲਿੱਕ ਕਰੋ'}
            >
              {isPdf ? (
                <div className="flex flex-col items-center justify-center text-rose-600">
                  <FileText className="w-6 h-6" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">PDF</span>
                </div>
              ) : (
                <img
                  src={parchiUrl}
                  alt="Parchi Thumbnail"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Eye className="w-4 h-4" />
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{isEn ? 'Parchi Attached' : 'ਪਰਚੀ ਸ਼ਾਮਲ ਹੈ'}</span>
                </span>
                {isPdf && (
                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                    PDF
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-900 truncate mt-1">
                {parchiName || (isPdf ? 'Bardana_Parchi.pdf' : 'Bardana_Parchi_Photo.jpg')}
              </p>
              <p className="text-[10px] text-slate-500">
                {isEn ? 'Saved with this exact receiving entry' : 'ਇਸੇ ਪ੍ਰਾਪਤੀ ਐਂਟਰੀ ਨਾਲ ਸੁਰੱਖਿਅਤ ਰਹੇਗੀ'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {/* View / Open */}
            <button
              type="button"
              onClick={onView}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-emerald-300 transition"
              title={isEn ? 'View Parchi' : 'ਪਰਚੀ ਵੇਖੋ'}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isEn ? 'View' : 'ਵੇਖੋ (View)'}</span>
            </button>

            {/* Replace */}
            <button
              type="button"
              onClick={handleSelectFileClick}
              disabled={isProcessing}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 border border-slate-300 transition"
              title={isEn ? 'Replace Parchi' : 'ਬਦਲੋ'}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isEn ? 'Replace' : 'ਬਦਲੋ'}</span>
            </button>

            {/* Remove */}
            <button
              type="button"
              onClick={onRemove}
              disabled={isProcessing}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 border border-rose-200 transition"
              title={isEn ? 'Remove Parchi' : 'ਹਟਾਓ'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{isEn ? 'Remove' : 'ਹਟਾਓ'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* State B: No File Attached -> Clean mobile-friendly upload card */
        <div
          onClick={handleSelectFileClick}
          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition bg-white group flex flex-col items-center justify-center gap-1.5"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 group-hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition">
              <Camera className="w-4 h-4" />
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center transition">
              <Upload className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-xs font-black text-slate-800 group-hover:text-emerald-800 transition block">
              {isProcessing
                ? (isEn ? 'Processing Parchi...' : 'ਪਰਚੀ ਲੋਡ ਹੋ ਰਹੀ ਹੈ...')
                : (isEn ? 'Click or tap to take photo / upload parchi' : 'ਫੋਟੋ ਖਿੱਚੋ ਜਾਂ ਫਾਈਲ ਚੁਣੋ (Upload Parchi)')}
            </span>
            <span className="text-[11px] text-slate-500 block">
              {isEn
                ? 'Support: JPG, JPEG, PNG, or PDF • Mobile camera friendly'
                : 'ਮੋਬਾਈਲ ਕੈਮਰਾ ਜਾਂ ਗੈਲਰੀ • JPG, PNG, PDF'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
