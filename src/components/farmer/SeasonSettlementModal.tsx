import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Printer, 
  FileDown, 
  Share2, 
  X, 
  AlertTriangle, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Scale
} from 'lucide-react';
import { Farmer, FarmerAccountSummary, MandiSettings } from '../../types/mandi';
import { formatCurrency, formatCurrencyINR } from '../../utils/calculations';
import { openWhatsApp } from '../../utils/whatsappNotification';

interface SeasonSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: Farmer;
  summary: FarmerAccountSummary;
  settings: MandiSettings;
  activeCropSeason: string;
  onConfirmSettlement: (settlementData: {
    settlementDate: string;
    closingBalance: number;
    targetSeason: string;
    carryForwardAsOpening: boolean;
    remarks: string;
  }) => void;
}

export const SeasonSettlementModal: React.FC<SeasonSettlementModalProps> = ({
  isOpen,
  onClose,
  farmer,
  summary,
  settings,
  activeCropSeason,
  onConfirmSettlement
}) => {
  const [targetSeason, setTargetSeason] = useState(
    activeCropSeason.includes('WHEAT') || activeCropSeason.includes('ਹਾੜ੍ਹੀ')
      ? 'ਸਾਉਣੀ (Paddy Season)'
      : 'ਹਾੜ੍ਹੀ (Wheat Season)'
  );
  const [carryForward, setCarryForward] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isSettledDone, setIsSettledDone] = useState(false);

  if (!isOpen) return null;

  const totalGrossAmount = summary.totalGrossAmount || 0;
  const totalLabour = summary.totalLabourDeductions || 0;
  const totalAdvanceWithInterest = summary.totalAdvanceAmount || 0;
  const totalPaid = summary.paidAmount || 0;
  const openingBalance = summary.openingBalance || 0;

  // Final Net Closing Balance
  const netClosingBalance = summary.finalBalance ?? 0;
  const isPayableToFarmer = netClosingBalance >= 0;

  const handlePrint = () => {
    window.print();
  };

  const handleConfirm = () => {
    onConfirmSettlement({
      settlementDate: new Date().toLocaleDateString('en-GB'),
      closingBalance: netClosingBalance,
      targetSeason,
      carryForwardAsOpening: carryForward,
      remarks: remarks || `ਸੀਜ਼ਨ ${activeCropSeason} ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ`
    });
    setIsSettledDone(true);
  };

  const handleWhatsAppShare = () => {
    const farmerName = farmer.farmerNamePa || farmer.farmerName;
    const balanceStatus = isPayableToFarmer
      ? `★ ਆੜ੍ਹਤੀ ਵੱਲੋਂ ਕਿਸਾਨ ਨੂੰ ਬਾਕੀ ਦੇਣਯੋਗ: ₹${Math.abs(Math.round(netClosingBalance)).toLocaleString('en-IN')}`
      : `★ ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ: ₹${Math.abs(Math.round(netClosingBalance)).toLocaleString('en-IN')}`;

    const text = [
      `🌾 *${settings.firmNamePa || settings.firmNameEn || 'ਮੰਡੀ ਆੜ੍ਹਤ'}*`,
      `📜 *ਸੀਜ਼ਨ ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ (Final Settlement Slip)*`,
      `---------------------------------`,
      `👤 *ਕਿਸਾਨ:* ${farmerName} (${farmer.farmerName})`,
      `🏡 *ਪਿੰਡ:* ${farmer.village || '—'} | 🆔 *ਖਾਤਾ ਨੰ:* ${farmer.id}`,
      `📅 *ਨਿਬੇੜਾ ਮਿਤੀ:* ${new Date().toLocaleDateString('en-GB')}`,
      `🌾 *ਸੀਜ਼ਨ:* ${activeCropSeason}`,
      `---------------------------------`,
      `1. ਕੁੱਲ ਫਸਲ ਵਿਕਰੀ ਰਕਮ: ₹${Math.round(totalGrossAmount).toLocaleString('en-IN')}`,
      `2. ਮਨਫੀ ਲੇਬਰ/ਮਜ਼ਦੂਰੀ ਕਟੌਤੀ: -₹${Math.round(totalLabour).toLocaleString('en-IN')}`,
      `3. ਮਨਫੀ ਦਿੱਤਾ ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ: -₹${Math.round(totalAdvanceWithInterest).toLocaleString('en-IN')}`,
      `4. ਮਨਫੀ ਸਿੱਧੀ ਅਦਾਇਗੀ: -₹${Math.round(totalPaid).toLocaleString('en-IN')}`,
      openingBalance !== 0 ? `5. ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ: ₹${Math.round(openingBalance).toLocaleString('en-IN')}` : '',
      `---------------------------------`,
      `⚖️ *ਅੰਤਿਮ ਨਿਬੇੜਾ ਬੈਲੇਂਸ (Final Balance):*`,
      `${balanceStatus}`,
      carryForward ? `➡️ ਇਹ ਬਕਾਇਆ ਅਗਲੇ ਸੀਜ਼ਨ (${targetSeason}) ਦੇ ਸ਼ੁਰੂ ਵਿੱਚ ਕੈਰੀ-ਫਾਰਵਰਡ ਹੋ ਜਾਵੇਗਾ।` : '',
      `---------------------------------`,
      `_ਦੋਵਾਂ ਧਿਰਾਂ ਦੀ ਆਪਸੀ ਸਹਿਮਤੀ ਨਾਲ ਖਾਤਾ ਪੱਕਾ ਕੀਤਾ ਗਿਆ।_`
    ].filter(Boolean).join('\n');

    openWhatsApp(farmer.mobile, text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-2xl text-slate-950">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  ਖਾਤਾ ਪੱਕਾ ਕਰਨਾ
                </span>
                <span className="text-amber-200 text-xs font-semibold">Season Closing Settlement</span>
              </div>
              <h3 className="font-black text-base sm:text-lg text-white mt-0.5">
                {farmer.farmerNamePa || farmer.farmerName} — ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 font-sans">
          
          {/* Top Info Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-500">ਮੌਜੂਦਾ ਸੀਜ਼ਨ: </span>
              <strong className="text-slate-900 font-black">{activeCropSeason}</strong>
            </div>
            <div>
              <span className="text-slate-500">ਪਿੰਡ: </span>
              <strong className="text-slate-900 font-black">{farmer.villagePa || farmer.village}</strong>
            </div>
            <div className="font-mono">
              <span className="text-slate-500">ਖਾਤਾ ਨੰ: </span>
              <strong className="text-slate-900">{farmer.id}</strong>
            </div>
          </div>

          {/* 4-Step Settlement Breakdown Table */}
          <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 p-2.5 font-black text-xs uppercase tracking-wider text-slate-800 flex justify-between">
              <span>ਹਿਸਾਬ-ਕਿਤਾਬ ਵੇਰਵਾ (Settlement Accounting)</span>
              <span>ਰਕਮ (₹)</span>
            </div>

            <div className="divide-y divide-slate-200 text-xs">
              {/* 1. Gross Crop */}
              <div className="p-3 flex justify-between items-center bg-white">
                <div>
                  <div className="font-black text-emerald-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>1. ਕੁੱਲ ਫਸਲ ਵਿਕਰੀ ਰਕਮ (Crop Proceeds / Cr.)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {summary.purchasedBags || summary.mandiArrivalBags || 0} ਬੋਰੀਆਂ ਦੀ ਬਣੀ ਰਕਮ
                  </div>
                </div>
                <strong className="text-emerald-700 font-mono text-sm font-black">
                  + {formatCurrency(totalGrossAmount)}
                </strong>
              </div>

              {/* 2. Labour deductions */}
              <div className="p-3 flex justify-between items-center bg-slate-50/50">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-slate-500" />
                    <span>2. ਮੰਡੀ ਲੇਬਰ ਤੇ ਮਜ਼ਦੂਰੀ ਖਰਚਾ (Labour Cut / Dr.)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ਪੱਕੀ ਲੇਬਰ, ਝਾਰਾਈ, ਸਿਲਾਈ ਕਟੌਤੀਆਂ
                  </div>
                </div>
                <strong className="text-rose-700 font-mono text-sm font-bold">
                  - {formatCurrency(totalLabour)}
                </strong>
              </div>

              {/* 3. Advances + Interest */}
              <div className="p-3 flex justify-between items-center bg-white">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>3. ਲਿਆ ਪੇਸ਼ਗੀ ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ (Advance + Interest / Dr.)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    ਮੂਲ: ₹{summary.totalAdvancePrincipal?.toLocaleString('en-IN')} + ਵਿਆਜ: ₹{summary.totalAdvanceInterest?.toLocaleString('en-IN')}
                  </div>
                </div>
                <strong className="text-rose-700 font-mono text-sm font-bold">
                  - {formatCurrency(totalAdvanceWithInterest)}
                </strong>
              </div>

              {/* 4. Payments already made */}
              {totalPaid > 0 && (
                <div className="p-3 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-purple-600" />
                      <span>4. ਸਿੱਧਾ ਨਕਦ/ਬੈਂਕ ਭੁਗਤਾਨ (Already Paid / Dr.)</span>
                    </div>
                  </div>
                  <strong className="text-rose-700 font-mono text-sm font-bold">
                    - {formatCurrency(totalPaid)}
                  </strong>
                </div>
              )}

              {/* 5. Opening Balance if any */}
              {openingBalance !== 0 && (
                <div className="p-3 flex justify-between items-center bg-white">
                  <div>
                    <div className="font-bold text-slate-800">
                      5. ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ (Previous Opening Balance)
                    </div>
                  </div>
                  <strong className={`font-mono text-sm font-bold ${openingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {openingBalance >= 0 ? '+' : '-'} {formatCurrency(Math.abs(openingBalance))}
                  </strong>
                </div>
              )}
            </div>

            {/* FINAL CLOSING BANNER */}
            <div className={`p-4 border-t-2 border-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isPayableToFarmer ? 'bg-emerald-900 text-white' : 'bg-rose-900 text-white'
            }`}>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider block opacity-85">
                  ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ ਬੈਲੇਂਸ (NET CLOSING BALANCE)
                </span>
                <span className="text-sm font-black">
                  {isPayableToFarmer
                    ? '★ ਬਾਕੀ ਰਕਮ ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ ਹੈ (Payable to Farmer)'
                    : '★ ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ ਖੜ੍ਹੀ ਹੈ (Due from Farmer)'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono">
                {formatCurrency(Math.abs(netClosingBalance))}
              </div>
            </div>
          </div>

          {/* CARRY FORWARD TO NEXT SEASON SETTINGS */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3 text-xs">
            <h4 className="font-black text-amber-950 flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-amber-700" />
              <span>ਅਗਲੇ ਸੀਜ਼ਨ ਲਈ ਕੈਰੀ-ਫਾਰਵਰਡ (Next Season Opening Balance Transfer)</span>
            </h4>

            <label className="flex items-start gap-2.5 cursor-pointer bg-white p-2.5 rounded-xl border border-amber-200">
              <input
                type="checkbox"
                checked={carryForward}
                onChange={(e) => setCarryForward(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
              />
              <div>
                <strong className="text-slate-900 block font-bold">
                  ਇਸ ਬਕਾਏ (₹{Math.abs(Math.round(netClosingBalance)).toLocaleString('en-IN')}) ਨੂੰ ਅਗਲੇ ਸੀਜ਼ਨ ਦੇ ਓਪਨਿੰਗ ਬੈਲੇਂਸ ਵਿੱਚ ਆਪਣੇ-ਆਪ ਸ਼ਾਮਲ ਕਰੋ
                </strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ਨਵੇਂ ਸੀਜ਼ਨ ਦਾ ਖਾਤਾ ਸ਼ੁਰੂ ਹੁੰਦੇ ਹੀ ਇਹ ਰਕਮ {isPayableToFarmer ? 'ਜਮ੍ਹਾਂ (+)' : 'ਬਕਾਇਆ ਨਾਮੇ (-)'} ਵਜੋਂ ਦਿਸੇਗੀ।
                </p>
              </div>
            </label>

            {carryForward && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ਅਗਲਾ ਸੀਜ਼ਨ (Target Season):
                  </label>
                  <input
                    type="text"
                    value={targetSeason}
                    onChange={(e) => setTargetSeason(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ਨੋਟ / ਰਿਮਾਰਕਸ:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ਆਪਸੀ ਸਹਿਮਤੀ ਨਾਲ ਖਾਤਾ ਪੱਕਾ"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Success or Print Notice */}
          {isSettledDone && (
            <div className="bg-emerald-50 border-2 border-emerald-500 p-4 rounded-2xl flex items-center gap-3 text-emerald-950">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <strong className="block font-black text-sm">ਖਾਤਾ ਸਫਲਤਾਪੂਰਵਕ ਪੱਕਾ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ!</strong>
                <span className="text-xs">
                  ਇਹ ਬਕਾਇਆ ਕਿਸਾਨ ਦੇ ਪ੍ਰੋਫਾਈਲ ਵਿੱਚ ਓਪਨਿੰਗ ਬੈਲੇਂਸ ਵਜੋਂ ਅੱਪਡੇਟ ਹੋ ਚੁੱਕਾ ਹੈ। ਤੁਸੀਂ ਪਰਚੀ ਪ੍ਰਿੰਟ ਜਾਂ ਵ੍ਹਟਸਐਪ ਕਰ ਸਕਦੇ ਹੋ।
                </span>
              </div>
            </div>
          )}

          {/* Signing Line */}
          <div className="pt-4 border-t border-dashed border-slate-300 grid grid-cols-2 text-center text-xs font-semibold text-slate-700">
            <div className="pt-6 border-t border-slate-300 mx-6">
              ਦਸਤਖਤ / ਅੰਗੂਠਾ ਕਿਸਾਨ
            </div>
            <div className="pt-6 border-t border-slate-300 mx-6">
              ਮੋਹਰ ਤੇ ਦਸਤਖਤ ਆੜ੍ਹਤੀਆ
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>ਵ੍ਹਟਸਐਪ ਭੇਜੋ</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>ਪ੍ਰਿੰਟ ਪਰਚੀ</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ਬੰਦ ਕਰੋ
            </button>
            {!isSettledDone && (
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>ਪੱਕਾ ਕਰੋ ਤੇ ਸੇਵ ਕਰੋ (Confirm Settlement)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
