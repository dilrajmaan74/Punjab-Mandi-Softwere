import React, { useState } from 'react';
import { RecycleBinItem } from '../../types/mandi';
import {
  Trash2,
  AlertTriangle,
  X,
  ShieldAlert,
  ShieldCheck,
  Lock,
  UserCheck
} from 'lucide-react';

interface FarmerPermanentDeleteModalProps {
  isOpen: boolean;
  item: RecycleBinItem | null;
  onClose: () => void;
  onConfirmPermanentDelete: (item: RecycleBinItem, operator: string) => Promise<void> | void;
}

export const FarmerPermanentDeleteModal: React.FC<FarmerPermanentDeleteModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirmPermanentDelete
}) => {
  const [operatorRole, setOperatorRole] = useState<'Owner' | 'Admin'>('Owner');
  const [operatorName, setOperatorName] = useState('Software Owner');
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !item) return null;

  const handleConfirm = async () => {
    if (!confirmedCheckbox) return;
    try {
      setIsDeleting(true);
      await onConfirmPermanentDelete(
        item,
        `${operatorRole}: ${operatorName}`
      );
      setIsDeleting(false);
      onClose();
    } catch (err) {
      console.error('Failed to permanently delete farmer:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-purple-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-purple-800 text-purple-200 rounded-xl shadow-sm shrink-0 mt-0.5 border border-purple-700">
              <ShieldAlert className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded uppercase tracking-wider">
                  Admin / Owner Only
                </span>
              </div>
              <h2 className="text-base font-black mt-1">
                ਕਿਸਾਨ ਪੱਕੇ ਤੌਰ 'ਤੇ ਮਿਟਾਓ (Permanent Delete)
              </h2>
              <p className="text-xs text-purple-200 mt-0.5">
                Permanently purge farmer profile from Recycle Bin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 text-purple-300 hover:text-white rounded-lg hover:bg-purple-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Target Farmer Record Details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">ਕਿਸਾਨ (Farmer):</span>
                <h3 className="text-sm font-black text-slate-900">{item.titlePa} / {item.titleEn}</h3>
                {item.subtitle && <p className="text-xs text-slate-600 mt-0.5">{item.subtitle}</p>}
              </div>
              <span className="px-2 py-1 bg-slate-200 text-slate-800 font-mono font-black text-xs rounded border border-slate-300">
                #{item.originalId}
              </span>
            </div>
          </div>

          {/* Historical Safety Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-black">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>ਇਤਿਹਾਸਕ ਰਿਕਾਰਡ ਸੁਰੱਖਿਅਤ ਰਹਿਣਗੇ (Historical Preservation):</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
              ਇਸ ਕਿਸਾਨ ਦੇ ਪੁਰਾਣੇ ਮੰਡੀ ਆਮਦ, ਤੁਲਾਈ, ਖਰੀਦ, ਲੇਬਰ, ਪੇਸ਼ਗੀ, ਵਿਆਜ ਅਤੇ ਖਾਤਾ ਰਿਪੋਰਟਾਂ ਸਿਸਟਮ ਵਿੱਚ ਪੂਰੀ ਤਰ੍ਹਾਂ ਸੁਰੱਖਿਅਤ ਅਤੇ ਸਹੀ ਰਹਿਣਗੇ। ਕਿਸਾਨ ID <strong>#{item.originalId}</strong> ਹਮੇਸ਼ਾ ਲਈ ਰਿਕਾਰਡ ਰਹੇਗੀ ਅਤੇ ਕਦੇ ਵੀ ਕਿਸੇ ਦੂਜੇ ਕਿਸਾਨ ਨੂੰ ਨਹੀਂ ਦਿੱਤੀ ਜਾਵੇਗੀ।
            </p>
          </div>

          {/* Admin / Owner Authorization Controls */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <Lock className="w-4 h-4 text-amber-700" />
              <span>ਮਾਲਕ / ਐਡਮਿਨ ਪ੍ਰਮਾਣਿਕਤਾ (Owner/Admin Verification):</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  ਅਹੁਦਾ (Authorized Role):
                </label>
                <select
                  value={operatorRole}
                  onChange={(e) => setOperatorRole(e.target.value as any)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
                >
                  <option value="Owner">ਮਾਲਕ (Firm Owner)</option>
                  <option value="Admin">ਸਿਸਟਮ ਐਡਮਿਨ (Admin)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  ਆਪਰੇਟਰ ਨਾਮ (Authorized By):
                </label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="e.g. Firm Owner / Manager"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedCheckbox}
                onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-[11px] font-bold text-slate-800 leading-snug">
                ਮੈਂ ਪੁਸ਼ਟੀ ਕਰਦਾ ਹਾਂ ਕਿ ਮੈਂ ਮਾਲਕ/ਐਡਮਿਨ ਹਾਂ ਅਤੇ ਇਸ ਕਿਸਾਨ ਪ੍ਰੋਫਾਈਲ ਨੂੰ ਰੀਸਾਈਕਲ ਬਿਨ ਵਿੱਚੋਂ ਪੱਕੇ ਤੌਰ 'ਤੇ ਹਟਾਉਣਾ ਚਾਹੁੰਦਾ ਹਾਂ।
              </span>
            </label>
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
            disabled={!confirmedCheckbox || isDeleting}
            className="px-4 py-2 text-xs font-black text-white bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ਮਿਟਾਇਆ ਜਾ ਰਿਹਾ ਹੈ...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>ਪੱਕਾ ਮਿਟਾਓ (Confirm Permanent Delete)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
