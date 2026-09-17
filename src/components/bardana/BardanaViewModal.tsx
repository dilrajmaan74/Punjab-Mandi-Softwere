import React from 'react';
import { BardanaReceivedRecord } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import {
  X,
  Boxes,
  Building2,
  Calendar,
  Layers,
  FileText,
  Printer,
  Download,
  Edit,
  Tag,
  CheckCircle2,
  ArrowDownLeft
} from 'lucide-react';
import { exportBardanaReceivedVoucherPDF } from '../../utils/bardanaPdfExport';

interface BardanaViewModalProps {
  record: BardanaReceivedRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (record: BardanaReceivedRecord) => void;
}

export const BardanaViewModal: React.FC<BardanaViewModalProps> = ({
  record,
  isOpen,
  onClose,
  onEdit
}) => {
  const { settings } = useMandi();

  if (!isOpen || !record) return null;

  const handleDownloadPDF = () => {
    exportBardanaReceivedVoucherPDF(record, settings);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-2xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ ਵੇਰਵੇ (Bardana Received Details)
                </h3>
                <span className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded shadow-2xs">
                  {record.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {settings.mandiNamePa} • ਸਰਕਾਰੀ ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ ਵਾਊਚਰ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="ਬੰਦ ਕਰੋ (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs sm:text-sm">
          {/* Section 1: Fixed Agency Line at the Top */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-1">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>AGENCY / ਏਜੰਸੀ (FIXED ALLOCATION)</span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-950">
              {record.agency}
            </div>
          </div>

          {/* Section 2: Source Details Card (Seller vs Agency) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Bardana Received From */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                ਬਾਰਦਾਨਾ ਕਿੱਥੋਂ ਪ੍ਰਾਪਤ ਕੀਤਾ (Bardana Received From)
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black ${
                    record.receivedFrom === 'SELLER'
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'bg-purple-100 text-purple-900 border border-purple-200'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{record.receivedFrom === 'SELLER' ? 'Seller / ਸੈਲਰ' : 'Agency / ਏਜੰਸੀ'}</span>
                </span>
              </div>
            </div>

            {/* Source Name */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                {record.receivedFrom === 'SELLER' ? 'ਸੈਲਰ ਦਾ ਨਾਂ (Seller Name)' : 'ਏਜੰਸੀ / ਸਰੋਤ ਦਾ ਨਾਂ (Agency Source)'}
              </span>
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>{record.sourceName}</span>
                {record.sellerId && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded">
                    ID: {record.sellerId}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Quantity & Type Details */}
          {(() => {
            const newJuthBags = record.newBags !== undefined ? record.newBags : (record.bardanaType === 'NEW' ? record.bags : 0);
            const oldJuthBags = record.oldBags !== undefined ? record.oldBags : (record.bardanaType === 'OLD' ? record.bags : 0);
            const totalBagsCount = Number((record as any).totalBags ?? record.bags ?? (newJuthBags + oldJuthBags)) || 0;

            return (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                <h4 className="font-black text-xs text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>ਸਟਾਕ ਤੇ ਗਿਣਤੀ ਵੇਰਵੇ (Quantity & Capacity Details)</span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>ਮਿਤੀ (Date): <strong className="text-slate-900">{record.date}</strong></span>
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* New Juth */}
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">ਨਵੀਂ ਜੂਥ (New Juth)</span>
                    <div className="text-xl font-mono font-black text-emerald-950 mt-0.5">
                      {newJuthBags.toLocaleString('en-IN')} <span className="text-xs font-normal text-emerald-700">Bags</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 mt-1">
                      {Math.floor(newJuthBags / 500)} ਬਕਸੇ ({newJuthBags % 500} ਖੁੱਲ੍ਹੇ)
                    </p>
                  </div>

                  {/* Old Juth */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">ਪੁਰਾਣੀ ਜੂਥ (Old Juth)</span>
                    <div className="text-xl font-mono font-black text-amber-950 mt-0.5">
                      {oldJuthBags.toLocaleString('en-IN')} <span className="text-xs font-normal text-amber-700">Bags</span>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-1">
                      {Math.floor(oldJuthBags / 50)} ਬਕਸੇ ({oldJuthBags % 50} ਖੁੱਲ੍ਹੇ)
                    </p>
                  </div>

                  {/* Total Bags */}
                  <div className="p-3 bg-slate-900 text-white rounded-lg border border-slate-800 shadow-xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">ਕੁੱਲ ਬੋਰੇ (Total Bags)</span>
                    <div className="text-xl font-mono font-black text-white mt-0.5">
                      {totalBagsCount.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-300">Bags</span>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                      +{totalBagsCount} ਸਟਾਕ ਵਿੱਚ ਸ਼ਾਮਲ
                    </p>
                  </div>
                </div>

                {/* Calculation Formula Display */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ਫਾਰਮੂਲਾ (Formula): <strong>ਨਵੀਂ ਜੂਥ ({newJuthBags} Bags)</strong> +{' '}
                    <strong>ਪੁਰਾਣੀ ਜੂਥ ({oldJuthBags} Bags)</strong> ={' '}
                    <strong className="text-emerald-800 text-sm font-black">{totalBagsCount.toLocaleString('en-IN')} Total Bags</strong>
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Section 4: Remarks */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>ਟਿੱਪਣੀਆਂ / ਨੋਟਿਸ (Remarks & Notes)</span>
            </span>
            <p className="text-slate-800 text-xs italic">
              {record.remarks ? record.remarks : 'ਕੋਈ ਵਾਧੂ ਟਿੱਪਣੀ ਨਹੀਂ ਹੈ (No Remarks)'}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
            >
              <Download className="w-4 h-4" />
              <span>PDF ਐਕਸਪੋਰਟ (PDF Export)</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <Edit className="w-4 h-4" />
                <span>ਸੋਧੋ (Edit)</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>ਬੰਦ ਕਰੋ (Close)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
