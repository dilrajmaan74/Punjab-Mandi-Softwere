import React from 'react';
import { Printer, X, Share2, Send, CheckCircle2 } from 'lucide-react';
import { FarmerAccountSummary, Farmer } from '../../types/mandi';
import { formatCurrency } from '../../utils/calculations';
import { openWhatsApp } from '../../utils/whatsappNotification';

interface FarmerMiniSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: Farmer;
  summary: FarmerAccountSummary;
  firmName?: string;
  firmMobile?: string;
}

export const FarmerMiniSlipModal: React.FC<FarmerMiniSlipModalProps> = ({
  isOpen,
  onClose,
  farmer,
  summary,
  firmName = 'ਮੰਡੀ ਆੜ੍ਹਤ (Mandi Commission Agent)',
  firmMobile
}) => {
  if (!isOpen) return null;

  const totalGrossAmount = summary.totalGrossAmount || 0;
  const totalLabourDeductions = summary.totalLabourDeductions || 0;
  const netCropPayable = totalGrossAmount - totalLabourDeductions;
  const totalAdvanceAmount = summary.totalAdvanceAmount || 0;
  const paidAmount = summary.paidAmount || 0;
  const finalBalance = summary.finalBalance ?? 0;
  const isPayable = finalBalance >= 0;

  // Bardana figures
  const totalBardanaUsed = summary.totalBardanaUsed || 0;
  const newBardanaUsed = summary.newBardanaUsed || 0;
  const oldBardanaUsed = summary.oldBardanaUsed || 0;

  const handlePrintSlip = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const farmerName = farmer.farmerNamePa || farmer.farmerName;
    const balanceText = isPayable
      ? `ਬਾਕੀ ਦੇਣਯੋਗ (Payable to Farmer): ${formatCurrency(finalBalance)}`
      : `ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ (Due from Farmer): ${formatCurrency(Math.abs(finalBalance))}`;

    const textLines = [
      `🌾 *${firmName}*`,
      `🧾 *ਕਿਸਾਨ ਛੋਟੀ ਪਰਚੀ / Mini Slip*`,
      `--------------------------------`,
      `👤 *ਕਿਸਾਨ:* ${farmerName} (${farmer.farmerName})`,
      `🆔 *ਖਾਤਾ ਨੰਬਰ:* ${farmer.id}`,
      `🏡 *ਪਿੰਡ:* ${farmer.village || '—'}`,
      `📅 *ਮਿਤੀ:* ${new Date().toLocaleDateString('en-GB')}`,
      `--------------------------------`,
      `📦 *ਕੁੱਲ ਬੋਰੀਆਂ:* ${summary.purchasedBags || summary.mandiArrivalBags || 0}`,
      `⚖️ *ਕੁੱਲ ਵਜ਼ਨ:* ${summary.purchasedWeightDisplay || summary.mandiArrivalDisplay || '—'}`,
      `💰 *ਕੁੱਲ ਫਸਲ ਰਕਮ:* ${formatCurrency(totalGrossAmount)}`,
      totalLabourDeductions > 0 ? `✂️ *ਮੰਡੀ ਖਰਚੇ/ਕਟੌਤੀ:* -${formatCurrency(totalLabourDeductions)}` : '',
      `💵 *ਸ਼ੁੱਧ ਫਸਲ ਰਕਮ:* ${formatCurrency(netCropPayable)}`,
      totalAdvanceAmount > 0 ? `🤝 *ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ:* -${formatCurrency(totalAdvanceAmount)}` : '',
      paidAmount > 0 ? `💳 *ਪਹਿਲਾਂ ਦਿੱਤਾ ਭੁਗਤਾਨ:* -${formatCurrency(paidAmount)}` : '',
      `--------------------------------`,
      `⭐ *${balanceText}*`,
      `🎒 *ਬਾਰਦਾਨਾ:* ਨਵਾਂ ${newBardanaUsed} | ਪੁਰਾਣਾ ${oldBardanaUsed} | ਕੁੱਲ ${totalBardanaUsed}`,
      `--------------------------------`,
      `_ਧੰਨਵਾਦ!_`
    ].filter(Boolean);

    openWhatsApp(farmer.mobile, textLines.join('\n'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-amber-300">🧾 ਕਿਸਾਨ ਮਿਨੀ ਪਰਚੀ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrintSlip}
              className="p-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="ਪਰਚੀ ਪ੍ਰਿੰਟ ਕਰੋ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ਪ੍ਰਿੰਟ</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="ਵ੍ਹਟਸਐਪ 'ਤੇ ਭੇਜੋ"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Slip Content (Simulating 80mm or compact mobile receipt) */}
        <div className="p-5 font-mono text-slate-900 text-xs bg-[#faf8f5] border-b border-dashed border-slate-300">
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-dashed border-slate-400 space-y-0.5">
            <h4 className="font-black text-sm text-slate-900">{firmName}</h4>
            {firmMobile && <p className="text-[11px] text-slate-600">ਮੋਬਾਈਲ: {firmMobile}</p>}
            <p className="text-[10px] text-slate-500">ਮੰਡੀ ਕਮਿਸ਼ਨ ਏਜੰਟ • ਹਿਸਾਬ-ਕਿਤਾਬ ਪਰਚੀ</p>
            <div className="text-[10px] font-bold text-slate-600 pt-1">
              ਮਿਤੀ: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Farmer Details */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">ਕਿਸਾਨ ਦਾ ਨਾਮ:</span>
              <span className="font-black">{farmer.farmerNamePa || farmer.farmerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ਖਾਤਾ ਨੰਬਰ:</span>
              <span className="font-bold">{farmer.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ਪਿੰਡ:</span>
              <span>{farmer.village || '—'}</span>
            </div>
            {farmer.mobile && (
              <div className="flex justify-between">
                <span className="text-slate-600">ਮੋਬਾਈਲ:</span>
                <span>{farmer.mobile}</span>
              </div>
            )}
          </div>

          {/* Core Quantities */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">ਕੁੱਲ ਬੋਰੀਆਂ:</span>
              <span className="font-black">{summary.purchasedBags || summary.mandiArrivalBags || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ਕੁੱਲ ਵਜ਼ਨ:</span>
              <span className="font-bold">{summary.purchasedWeightDisplay || summary.mandiArrivalDisplay || '—'}</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="py-2.5 border-b-2 border-dashed border-slate-400 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span>ਕੁੱਲ ਫਸਲ ਰਕਮ (+):</span>
              <span className="font-bold">{formatCurrency(totalGrossAmount)}</span>
            </div>
            {totalLabourDeductions > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>ਮੰਡੀ ਖਰਚੇ/ਕਟੌਤੀ (-):</span>
                <span>-{formatCurrency(totalLabourDeductions)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-800 pt-0.5">
              <span>ਸ਼ੁੱਧ ਫਸਲ ਰਕਮ:</span>
              <span>{formatCurrency(netCropPayable)}</span>
            </div>

            {totalAdvanceAmount > 0 && (
              <div className="flex justify-between text-amber-800">
                <span>ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ (-):</span>
                <span>-{formatCurrency(totalAdvanceAmount)}</span>
              </div>
            )}

            {paidAmount > 0 && (
              <div className="flex justify-between text-purple-800">
                <span>ਦਿੱਤਾ ਭੁਗਤਾਨ (-):</span>
                <span>-{formatCurrency(paidAmount)}</span>
              </div>
            )}
          </div>

          {/* Final Net Amount Highlight Box */}
          <div className={`my-3 p-3 rounded-xl border text-center ${
            isPayable
              ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
              : 'bg-rose-50 border-rose-500 text-rose-950'
          }`}>
            <div className="text-[10px] font-black uppercase tracking-wider">
              {isPayable ? '★ ਕਿਸਾਨ ਨੂੰ ਬਾਕੀ ਦੇਣਯੋਗ ★' : '★ ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ★'}
            </div>
            <div className="text-2xl font-black mt-0.5">
              {formatCurrency(Math.abs(finalBalance))}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">
              {isPayable ? '(Payable to Farmer)' : '(Due from Farmer)'}
            </div>
          </div>

          {/* Bardana Status */}
          <div className="py-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600 space-y-0.5">
            <div className="font-bold text-slate-800">ਬਾਰਦਾਨਾ ਵੇਰਵਾ (Gunny Bags):</div>
            <div className="flex justify-between">
              <span>ਨਵਾਂ ਬਾਰਦਾਨਾ: {newBardanaUsed}</span>
              <span>ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ: {oldBardanaUsed}</span>
              <span className="font-bold">ਕੁੱਲ: {totalBardanaUsed}</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 pb-2 grid grid-cols-2 text-center text-[10px] text-slate-500 border-t border-slate-200">
            <div>ਦਸਤਖਤ ਕਿਸਾਨ</div>
            <div>ਦਸਤਖਤ ਆੜ੍ਹਤੀਆ</div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-100 p-3 flex justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
          <button
            type="button"
            onClick={handlePrintSlip}
            className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>ਪ੍ਰਿੰਟ ਪਰਚੀ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
