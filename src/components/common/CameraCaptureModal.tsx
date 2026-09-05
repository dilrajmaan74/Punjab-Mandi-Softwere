import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  titleEn: string;
  titlePa: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  titleEn,
  titlePa
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, capturedImage]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('ਕੈਮਰਾ ਐਕਸੈਸ ਉਪਲਬਧ ਨਹੀਂ ਹੈ / Camera permission required or unavailable.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
      setCapturedImage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-4 shadow-2xl space-y-3 my-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="font-black text-slate-900 text-xs sm:text-sm">{titleEn}</h3>
              <p className="text-[11px] text-slate-500 font-semibold">{titlePa}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video / Captured Canvas area */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-4/3 flex items-center justify-center border border-slate-800">
          {cameraError && !capturedImage ? (
            <div className="p-4 text-center text-rose-300 text-xs">
              <p className="font-bold mb-1">⚠️ {cameraError}</p>
              <p className="text-[11px] text-slate-400">
                You can also upload a photo directly from your files.
              </p>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ਦੁਬਾਰਾ ਖਿੱਚੋ (Retake)</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ਵਰਤੋਂ ਕਰੋ (Use Photo)</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-3 py-1.5 text-xs text-slate-600 font-semibold"
              >
                ਰੱਦ ਕਰੋ (Cancel)
              </button>
              <button
                type="button"
                onClick={takePhoto}
                disabled={!!cameraError}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ਫੋਟੋ ਖਿੱਚੋ (Capture)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
