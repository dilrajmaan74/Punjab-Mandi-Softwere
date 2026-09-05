import React from 'react';
import { DailyPurchaseRecord } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  User,
  MapPin,
  Phone,
  CreditCard,
  Layers,
  Scale,
  FileCheck,
  IndianRupee,
  Scissors
} from 'lucide-react';
import { maskAadhaarNumber } from '../../utils/calculations';
import { exportDailyPurchaseVoucherPDF } from '../../utils/purchasePdfExport';

interface DailyPurchaseViewModalProps {
  record: DailyPurchaseRecord | null;
  onClose: () => void;
}

export const DailyPurchaseViewModal: React.FC<DailyPurchaseViewModalProps> = ({
  record,
  onClose
}) => {
  const { settings, getFarmerPurchaseSummary } = useMandi();

  if (!record) return null;

  const farmerSummary = getFarmerPurchaseSummary(record.farmerId);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportDailyPurchaseVoucherPDF(record, farmerSummary, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-150 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/80 rounded-xl">
              <FileCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">
                ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਵਾਊਚਰ (Daily Purchase Voucher)
              </h3>
              <p className="text-xs text-emerald-200 font-mono">
                {record.id} • {record.date}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voucher Content */}
        <div className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* Mandi & Agency Details */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="text-center border-b border-emerald-100 pb-2">
              <h4 className="font-black text-sm text-emerald-950">
                {settings.mandiNamePa} ({settings.mandiNameEn})
              </h4>
              <p className="text-[11px] text-emerald-800 font-medium">
                {settings.marketCommitteePa}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-500 block font-semibold">ਖਰੀਦ ਏਜੰਸੀ (Agency)</span>
                <strong className="text-emerald-900 font-black text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {record.agency}
                </strong>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block font-semibold">ਖਰੀਦ ਮਿਤੀ (Date)</span>
                <strong className="text-slate-900 font-mono font-bold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {record.date}
                </strong>
              </div>

              {record.boliNumber && (
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">ਬੋਲੀ / ਲਾਟ ਨੰਬਰ (Lot No)</span>
                  <strong className="text-slate-900 font-mono">{record.boliNumber}</strong>
                </div>
              )}

              {record.gatePassNumber && (
                <div>
                  <span className="text-[10px] text-slate-500 block font-semibold">ਗੇਟ ਪਾਸ ਨੰਬਰ (Gate Pass)</span>
                  <strong className="text-slate-900 font-mono">{record.gatePassNumber}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Farmer Particulars */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>ਕਿਸਾਨ ਦੇ ਵੇਰਵੇ (Farmer Particulars)</span>
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-500 block">ਕਿਸਾਨ ID</span>
                <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                  {record.farmerId}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ਕਿਸਾਨ ਦਾ ਨਾਂ</span>
                <strong className="text-slate-900 text-xs">
                  {record.farmerNamePa || record.farmerName}
                </strong>
                {record.farmerNamePa && (
                  <span className="text-[10px] text-slate-500 block">({record.farmerName})</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ਪਿਤਾ ਦਾ ਨਾਂ</span>
                <span className="text-slate-800 font-medium">
                  {record.fatherName || '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ਪਿੰਡ (Village)</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {record.villagePa || record.village}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ਮੋਬਾਈਲ</span>
                <span className="font-mono text-slate-800 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {record.mobile || '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block">ਆਧਾਰ ਕਾਰਡ</span>
                <span className="font-mono text-slate-700 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-400" />
                  {maskAadhaarNumber(record.aadhaar)}
                </span>
              </div>
            </div>
          </div>

          {/* Purchase Breakdown Box */}
          <div className="bg-white border-2 border-emerald-300 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-700" />
                ਖਰੀਦ ਮਾਤਰਾ ਤੇ ਰਕਮ (Purchase Quantity & Amount)
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                1 Bag = 37.50 KG
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold">ਬੋਰੀਆਂ (Bags)</span>
                <strong className="font-mono text-base font-black text-slate-900">
                  {record.bags}
                </strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold">ਵਜ਼ਨ (Weight)</span>
                <strong className="font-mono text-xs font-black text-emerald-900">
                  {record.qul} Qul {record.kg} Kg
                </strong>
                <span className="text-[9px] text-slate-400 block font-mono">
                  ({record.totalWeightKg.toFixed(2)} KG)
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-semibold">ਸਰਕਾਰੀ ਭਾਅ (Rate)</span>
                <strong className="font-mono text-xs font-bold text-slate-900">
                  ₹{record.rate.toFixed(2)}
                </strong>
                <span className="text-[9px] text-slate-400 block">ਪ੍ਰਤੀ ਕੁਇੰਟਲ</span>
              </div>

              <div className="bg-emerald-600 text-white p-2.5 rounded-lg border border-emerald-700 shadow-2xs">
                <span className="text-[10px] text-emerald-100 block font-semibold">ਕੁੱਲ ਗ੍ਰਾਸ (Gross)</span>
                <strong className="font-mono text-sm font-black flex items-center justify-center gap-0.5">
                  <IndianRupee className="w-3.5 h-3.5" />
                  {record.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          </div>

          {/* Farmer Remaining Stock Indicator */}
          {farmerSummary && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500 block font-semibold">
                  ਕਿਸਾਨ ਦੀ ਮੰਡੀ ਆਮਦ: <strong>{farmerSummary.mandiArrivalBags} ਬੋਰੀਆਂ</strong> ({farmerSummary.mandiArrivalWeightDisplay})
                </span>
                <span className="text-slate-500 block">
                  ਕੁੱਲ ਖਰੀਦੀਆਂ: <strong>{farmerSummary.alreadyPurchasedBags} ਬੋਰੀਆਂ</strong> ({farmerSummary.alreadyPurchasedWeightDisplay})
                </span>
              </div>

              <div className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1.5 rounded-lg">
                ਬਾਕੀ ਮੰਡੀ ਸਟਾਕ:{' '}
                <span className="font-mono font-black">{farmerSummary.remainingBags} ਬੋਰੀਆਂ</span> (
                {farmerSummary.remainingWeightDisplay})
              </div>
            </div>
          )}

          {record.remarks && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-600 block mb-0.5">ਟਿੱਪਣੀਆਂ (Remarks):</span>
              <p className="text-slate-800 font-medium">{record.remarks}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ਪ੍ਰਿੰਟ (Print)</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF ਡਾਊਨਲੋਡ (PDF Voucher)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
