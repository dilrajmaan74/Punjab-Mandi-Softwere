import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification, ToastItem, ToastType } from '../../context/NotificationContext';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  X,
  Sparkles
} from 'lucide-react';

interface ToastConfig {
  bgColor: string;
  borderColor: string;
  textColor: string;
  titleColor: string;
  iconBg: string;
  iconColor: string;
  progressBarColor: string;
  Icon: React.ElementType;
  badgeEn: string;
  badgePa: string;
}

const getToastConfig = (type: ToastType): ToastConfig => {
  switch (type) {
    case 'save-success':
      return {
        bgColor: 'bg-white',
        borderColor: 'border-emerald-500 shadow-emerald-950/10',
        textColor: 'text-slate-700',
        titleColor: 'text-emerald-950',
        iconBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30',
        iconColor: 'text-emerald-600',
        progressBarColor: 'bg-emerald-500',
        Icon: CheckCircle2,
        badgeEn: 'Saved',
        badgePa: 'ਸੇਵ ਹੋਇਆ'
      };
    case 'update-success':
      return {
        bgColor: 'bg-white',
        borderColor: 'border-blue-500 shadow-blue-950/10',
        textColor: 'text-slate-700',
        titleColor: 'text-blue-950',
        iconBg: 'bg-blue-600 text-white shadow-xs shadow-blue-600/30',
        iconColor: 'text-blue-600',
        progressBarColor: 'bg-blue-500',
        Icon: CheckCircle2,
        badgeEn: 'Updated',
        badgePa: 'ਅੱਪਡੇਟ'
      };
    case 'delete-success':
      return {
        bgColor: 'bg-white',
        borderColor: 'border-rose-500 shadow-rose-950/10',
        textColor: 'text-slate-700',
        titleColor: 'text-rose-950',
        iconBg: 'bg-rose-600 text-white shadow-xs shadow-rose-600/30',
        iconColor: 'text-rose-600',
        progressBarColor: 'bg-rose-500',
        Icon: Trash2,
        badgeEn: 'Deleted',
        badgePa: 'ਮਿਟਾਇਆ'
      };
    case 'duplicate-warning':
      return {
        bgColor: 'bg-amber-50/95',
        borderColor: 'border-amber-400 shadow-amber-950/10',
        textColor: 'text-amber-900',
        titleColor: 'text-amber-950',
        iconBg: 'bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/30',
        iconColor: 'text-amber-600',
        progressBarColor: 'bg-amber-500',
        Icon: AlertTriangle,
        badgeEn: 'Duplicate',
        badgePa: 'ਡੁਪਲੀਕੇਟ'
      };
    case 'error':
      return {
        bgColor: 'bg-white',
        borderColor: 'border-rose-500 shadow-rose-950/10',
        textColor: 'text-slate-700',
        titleColor: 'text-rose-950',
        iconBg: 'bg-rose-600 text-white shadow-xs shadow-rose-600/30',
        iconColor: 'text-rose-600',
        progressBarColor: 'bg-rose-500',
        Icon: AlertCircle,
        badgeEn: 'Error',
        badgePa: 'ਗਲਤੀ'
      };
    case 'warning':
      return {
        bgColor: 'bg-white',
        borderColor: 'border-amber-500 shadow-amber-950/10',
        textColor: 'text-slate-700',
        titleColor: 'text-amber-950',
        iconBg: 'bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/30',
        iconColor: 'text-amber-600',
        progressBarColor: 'bg-amber-500',
        Icon: AlertTriangle,
        badgeEn: 'Warning',
        badgePa: 'ਚੇਤਾਵਨੀ'
      };
    case 'info':
    default:
      return {
        bgColor: 'bg-white',
        borderColor: 'border-slate-400 shadow-slate-950/10',
        textColor: 'text-slate-700',
        titleColor: 'text-slate-950',
        iconBg: 'bg-slate-800 text-white shadow-xs shadow-slate-800/30',
        iconColor: 'text-slate-700',
        progressBarColor: 'bg-slate-700',
        Icon: Info,
        badgeEn: 'Notice',
        badgePa: 'ਸੂਚਨਾ'
      };
  }
};

const ToastCard: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  const config = getToastConfig(toast.type);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4500;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const progressRef = useRef(100);

  useEffect(() => {
    if (duration <= 0) return;
    const intervalTime = 40;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      if (isPausedRef.current) return;

      progressRef.current -= step;
      if (progressRef.current <= 0) {
        clearInterval(timer);
        setProgress(0);
        // Safely trigger dismiss outside of React's setProgress updater function
        onDismissRef.current(toast.id);
      } else {
        setProgress(Math.max(0, progressRef.current));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [duration, toast.id]);

  const { Icon } = config;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative overflow-hidden rounded-xl border-2 ${config.borderColor} ${config.bgColor} shadow-lg pointer-events-auto select-none backdrop-blur-xs`}
      role="alert"
      aria-live="assertive"
    >
      {/* Toast Content */}
      <div className="p-3 sm:p-3.5 flex items-start gap-3">
        {/* Icon Pill */}
        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${config.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Text Area */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Header Row: Title & Badge */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className={`text-xs sm:text-sm font-black tracking-tight leading-snug ${config.titleColor}`}>
              {toast.titlePa}
            </h4>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-100/90 text-slate-700 border border-slate-200/80 shrink-0 font-mono">
              {config.badgePa} / {config.badgeEn}
            </span>
          </div>

          {/* English Title Subhead */}
          <div className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug">
            {toast.titleEn}
          </div>

          {/* Optional Message / Detail lines */}
          {(toast.messagePa || toast.messageEn || toast.details) && (
            <div className="mt-1 space-y-0.5 text-[11px] leading-relaxed">
              {toast.messagePa && (
                <div className="text-slate-800 font-medium">{toast.messagePa}</div>
              )}
              {toast.messageEn && (
                <div className="text-slate-600 text-[10px] font-normal">{toast.messageEn}</div>
              )}
              {toast.details && (
                <div className="font-mono text-[10px] font-bold text-slate-900 bg-slate-100/80 px-1.5 py-0.5 rounded mt-1 inline-block border border-slate-200">
                  {toast.details}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1 rounded-md transition shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar */}
      {duration > 0 && (
        <div className="h-1 w-full bg-slate-200/60 overflow-hidden">
          <div
            className={`h-full ${config.progressBarColor} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotification();

  return (
    <div
      className="fixed z-50 pointer-events-none flex flex-col gap-2.5 
        top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:max-w-md sm:w-full print:hidden"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
