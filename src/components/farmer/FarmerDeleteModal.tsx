import React, { useState } from 'react';
import { Farmer } from '../../types/mandi';
import {
  Trash2,
  AlertTriangle,
  X,
  ShieldCheck,
  RotateCcw,
  FileCheck2,
  UserX,
  Lock
} from 'lucide-react';
import { maskAadhaarNumber } from '../../utils/calculations';

interface FarmerDeleteModalProps {
  isOpen: boolean;
  farmer: Farmer | null;
  onClose: () => void;
  onConfirmDelete: (farmer: Farmer) => Promise<void> | void;
}

export const FarmerDeleteModal: React.FC<FarmerDeleteModalProps> = ({
  isOpen,
  farmer,
  onClose,
  onConfirmDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !farmer) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete(farmer);
      setIsDeleting(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete farmer:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-rose-50/80 border-b border-rose-100 p-5 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-rose-600 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-rose-900 leading-snug">
                ਕੀ ਤੁਸੀਂ ਇਸ ਕਿਸਾਨ ਨੂੰ ਡਿਲੀਟ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?
              </h2>
              <p className="text-xs font-semibold text-rose-700 mt-0.5">
                Are you sure you want to delete this farmer?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Farmer Details Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer Name)
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {farmer.farmerNamePa}
                  {farmer.farmerName && (
                    <span className="text-xs font-bold text-slate-600 ml-1.5 font-sans">
                      ({farmer.farmerName})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  ਸ/ਓ: {farmer.fatherNamePa || farmer.fatherName || '—'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  ਕਿਸਾਨ ID
                </span>
                <span className="inline-block px-2.5 py-1 bg-rose-100 text-rose-900 font-mono font-black text-xs rounded-md border border-rose-200">
                  #{farmer.id}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">ਪਿੰਡ (Village):</span>
                <span className="font-semibold text-slate-800">
                  {farmer.villagePa || farmer.village} ({farmer.pinCode})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">ਮੋਬਾਈਲ (Mobile):</span>
                <span className="font-semibold text-slate-800">
                  {farmer.mobile ? `+91 ${farmer.mobile}` : '—'}
                </span>
              </div>
              {farmer.aadhaar && (
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 font-bold block">ਆਧਾਰ (Aadhaar):</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {maskAadhaarNumber(farmer.aadhaar)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Safety Guarantees Notice Box */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>ਸੁਰੱਖਿਅਤ ਡਿਲੀਟ ਗਾਰੰਟੀ (Safe Soft Delete Policy):</span>
            </div>
            <ul className="text-[11px] text-emerald-800 space-y-1.5 pl-5 list-disc font-medium leading-relaxed">
              <li>
                <strong>ਰੀਸਾਈਕਲ ਬਿਨ ਵਿੱਚ ਸੁਰੱਖਿਅਤ:</strong> ਕਿਸਾਨ ਤੁਰੰਤ ਪੱਕਾ ਨਹੀਂ ਮਿਟੇਗਾ, ਰੀਸਾਈਕਲ ਬਿਨ (Recycle Bin) ਵਿੱਚ ਸੁਰੱਖਿਅਤ ਰਹੇਗਾ ਅਤੇ ਕਦੇ ਵੀ Restore ਕੀਤਾ ਜਾ ਸਕਦਾ ਹੈ।
              </li>
              <li>
                <strong>ਪੁਰਾਣੇ ਰਿਕਾਰਡ 100% ਸੁਰੱਖਿਅਤ:</strong> ਮੰਡੀ ਆਮਦ, ਖਰੀਦ, ਲੇਬਰ, ਪੇਸ਼ਗੀ, ਵਿਆਜ, ਅਡਜਸਟਮੈਂਟ ਅਤੇ ਖਾਤਾ ਰਿਪੋਰਟਾਂ ਹਮੇਸ਼ਾ ਸੁਰੱਖਿਅਤ ਅਤੇ ਵੇਖਣਯੋਗ ਰਹਿਣਗੀਆਂ।
              </li>
              <li>
                <strong>ਨਵੀਂ ਐਂਟਰੀ ਸੂਚੀ:</strong> ਐਕਟਿਵ ਕਿਸਾਨ ਰਜਿਸਟਰ ਅਤੇ ਨਵੀਂ ਫਸਲ ਤੁਲਾਈ ਸੂਚੀਆਂ ਵਿੱਚੋਂ ਇਹ ਕਿਸਾਨ ਹਟ ਜਾਵੇਗਾ।
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            ਰੱਦ ਕਰੋ (Cancel)
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ਡਿਲੀਟ ਹੋ ਰਿਹਾ ਹੈ...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>ਹਾਂ, ਕਿਸਾਨ ਡਿਲੀਟ ਕਰੋ (Move to Recycle Bin)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
