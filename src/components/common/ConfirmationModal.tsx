import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../../context/NotificationContext';
import { useMandi } from '../../context/MandiContext';
import { Trash2, AlertTriangle, Info, X, RefreshCw } from 'lucide-react';

export const ConfirmationModal: React.FC = () => {
  const { confirmationState, closeConfirmation, proceedConfirmation } = useNotification();
  const { language } = useMandi();
  const isEn = language === 'en';

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!confirmationState?.isOpen) return;
      if (e.key === 'Escape' && !confirmationState.isProcessing) {
        closeConfirmation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmationState, closeConfirmation]);

  if (!confirmationState || !confirmationState.isOpen) {
    return null;
  }

  const {
    type = 'delete',
    titleEn,
    titlePa,
    messageEn,
    messagePa,
    itemDetails,
    confirmTextEn = 'Delete',
    confirmTextPa = 'ਮਿਟਾਓ',
    cancelTextEn = 'Cancel',
    cancelTextPa = 'ਰੱਦ ਕਰੋ',
    isProcessing
  } = confirmationState;

  const isDelete = type === 'delete';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-xs">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isProcessing) closeConfirmation();
          }}
          className="fixed inset-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Header Colored Accent Strip */}
          <div
            className={`h-2 w-full ${
              isDelete ? 'bg-rose-600' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-600'
            }`}
          />

          <div className="p-4 sm:p-6 space-y-4">
            {/* Top Row: Icon + Title + Close */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    isDelete
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : type === 'warning'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {isDelete ? (
                    <Trash2 className="w-6 h-6" />
                  ) : type === 'warning' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <Info className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {isEn ? (titleEn || titlePa) : titlePa}
                  </h3>
                  {!isEn && (
                    <div className="text-xs font-bold text-slate-600 tracking-tight">
                      {titleEn}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={closeConfirmation}
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition disabled:opacity-30"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="space-y-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5 leading-relaxed">
              {isEn ? (
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{messageEn || messagePa}</p>
              ) : (
                <>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{messagePa}</p>
                  <p className="text-[11px] text-slate-600">{messageEn}</p>
                </>
              )}
            </div>

            {/* Detailed Item Overview (e.g. Farmer Name, ID, Village, Aadhaar) */}
            {itemDetails && itemDetails.length > 0 && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-200 text-xs">
                {itemDetails.map((item, index) => (
                  <div key={index} className="p-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 text-[11px] font-medium">
                      {isEn ? item.labelEn : `${item.labelPa} (${item.labelEn})`}:
                    </span>
                    <strong className="text-slate-900 font-bold text-right font-mono text-xs">
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={isProcessing}
                className="w-full sm:w-auto bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition disabled:opacity-40"
              >
                <span>{isEn ? cancelTextEn : `${cancelTextPa} (${cancelTextEn})`}</span>
              </button>

              <button
                type="button"
                onClick={proceedConfirmation}
                disabled={isProcessing}
                className={`w-full sm:w-auto font-black py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 text-white ${
                  isDelete
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                } disabled:opacity-50`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEn ? 'Processing...' : 'ਪ੍ਰਕਿਰਿਆ ਹੋ ਰਹੀ ਹੈ... (Processing...)'}</span>
                  </>
                ) : (
                  <>
                    {isDelete && <Trash2 className="w-3.5 h-3.5" />}
                    <span>{isEn ? confirmTextEn : `${confirmTextPa} (${confirmTextEn})`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
