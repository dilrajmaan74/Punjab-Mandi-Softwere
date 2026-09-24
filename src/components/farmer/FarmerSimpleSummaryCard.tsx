import React, { useState } from 'react';
import { Volume2, VolumeX, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { FarmerAccountSummary, Farmer } from '../../types/mandi';
import { formatCurrency } from '../../utils/calculations';

interface FarmerSimpleSummaryCardProps {
  farmer: Farmer;
  summary: FarmerAccountSummary;
  onOpenMiniSlip?: () => void;
  onOpenPL?: () => void;
  onOpenTFormat?: () => void;
}

export const FarmerSimpleSummaryCard: React.FC<FarmerSimpleSummaryCardProps> = ({
  farmer,
  summary,
  onOpenMiniSlip,
  onOpenPL,
  onOpenTFormat
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const totalGrossAmount = summary.totalGrossAmount || 0;
  const totalLabourDeductions = summary.totalLabourDeductions || 0;
  const totalAdvanceAmount = summary.totalAdvanceAmount || 0;
  const paidAmount = summary.paidAmount || 0;
  const finalBalance = summary.finalBalance ?? 0;
  const isPayable = finalBalance >= 0;

  // Speak Account summary in simple conversational Punjabi/Hindi
  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('ਤੁਹਾਡਾ ਬ੍ਰਾਊਜ਼ਰ ਆਵਾਜ਼ ਸੁਣਨ ਦੀ ਸਹੂਲਤ ਨੂੰ ਸਪੋਰਟ ਨਹੀਂ ਕਰਦਾ (Speech not supported)');
      return;
    }

    window.speechSynthesis.cancel();

    const farmerName = farmer.farmerNamePa || farmer.farmerName;
    const balanceText = isPayable
      ? `ਆੜ੍ਹਤੀ ਵੱਲ ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ ਬਾਕੀ ਰਕਮ ₹${Math.abs(Math.round(finalBalance)).toLocaleString('en-IN')} ਹੈ।`
      : `ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਯੋਗ ₹${Math.abs(Math.round(finalBalance)).toLocaleString('en-IN')} ਹੈ।`;

    const speechText = `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਜੀ। ਕਿਸਾਨ ${farmerName} ਜੀ ਦਾ ਖਾਤਾ ਸਾਰ।
    ਕਦਮ 1: ਫਸਲ ਦੀ ਕੁੱਲ ਆਮਦਨ ₹${Math.round(totalGrossAmount).toLocaleString('en-IN')} ਬਣੀ ਹੈ। ਕੁੱਲ ਬੋਰੀਆਂ ${summary.purchasedBags || summary.mandiArrivalBags || 0} ਹਨ।
    ਕਦਮ 2: ਮੰਡੀ ਖਰਚੇ ਅਤੇ ਮਜ਼ਦੂਰੀ ਕਟੌਤੀਆਂ ₹${Math.round(totalLabourDeductions).toLocaleString('en-IN')} ਹਨ।
    ਕਦਮ 3: ਲਿਆ ਗਿਆ ਕੁੱਲ ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ₹${Math.round(totalAdvanceAmount).toLocaleString('en-IN')} ਅਤੇ ਪਹਿਲਾਂ ਦਿੱਤਾ ਭੁਗਤਾਨ ₹${Math.round(paidAmount).toLocaleString('en-IN')} ਹੈ।
    ਕਦਮ 4: ਆਖਰੀ ਹਿਸਾਬ: ${balanceText}`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.92;
    utterance.pitch = 1;

    // Try finding Punjabi or Hindi voice
    const voices = window.speechSynthesis.getVoices();
    const paVoice = voices.find(v => v.lang.startsWith('pa') || v.name.toLowerCase().includes('punjabi'));
    const hiVoice = voices.find(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));
    const inVoice = voices.find(v => v.lang.includes('IN'));

    if (paVoice) utterance.voice = paVoice;
    else if (hiVoice) utterance.voice = hiVoice;
    else if (inVoice) utterance.voice = inVoice;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-700/80 shadow-xl space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-400 text-slate-950">
              ਸਰਲ 4-ਸਟੈੱਪ ਹਿਸਾਬ
            </span>
            <span className="text-slate-400 text-xs font-semibold">
              4-Step Simple Summary
            </span>
          </div>
          <h3 className="text-lg font-black text-white mt-1">
            {farmer.farmerNamePa || farmer.farmerName} ਜੀ ਦਾ ਕੁੱਲ ਹਿਸਾਬ-ਕਿਤਾਬ
          </h3>
        </div>

        {/* Audio Assistant button & Mini slip shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleAudio}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md ${
              isPlayingAudio
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="ਖਾਤੇ ਦਾ ਸਾਰ ਆਵਾਜ਼ ਵਿੱਚ ਸੁਣੋ (Listen in Punjabi)"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4 text-white" />
                <span>ਆਵਾਜ਼ ਬੰਦ ਕਰੋ</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-amber-300" />
                <span>🔊 ਖਾਤਾ ਸੁਣੋ (Listen)</span>
              </>
            )}
          </button>

          {onOpenMiniSlip && (
            <button
              type="button"
              onClick={onOpenMiniSlip}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
              title="ਛੋਟੀ ਮੋਬਾਈਲ ਪਰਚੀ (Mini Slip)"
            >
              🧾 ਛੋਟੀ ਪਰਚੀ
            </button>
          )}

          {onOpenTFormat && (
            <button
              type="button"
              onClick={onOpenTFormat}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black border border-amber-400 transition cursor-pointer shadow-sm"
              title="ਰਵਾਇਤੀ T-ਸ਼ਕਲ ਬਹੀ-ਖਾਤਾ (T-Format Ledger)"
            >
              ⚖️ T-ਲੇਜ਼ਰ (ਬਹੀ-ਖਾਤਾ)
            </button>
          )}

          {onOpenPL && (
            <button
              type="button"
              onClick={onOpenPL}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
              title="ਸਾਲਾਨਾ ਬੱਚਤ (P&L)"
            >
              📊 ਬੱਚਤ/ਨਫ਼ਾ
            </button>
          )}
        </div>
      </div>

      {/* 4 Steps Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Step 1: Gross Crop Value */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
                1
              </span>
              <span className="text-[11px] font-bold text-emerald-400">ਕੁੱਲ ਫਸਲ ਰਕਮ (+)</span>
            </div>
            <div className="text-xs text-slate-400 font-semibold mt-2">
              Gross Crop Income
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">
              {formatCurrency(totalGrossAmount)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-700/50 text-[11px] text-slate-300 flex justify-between">
            <span>ਬੋਰੀਆਂ: {summary.purchasedBags || summary.mandiArrivalBags || 0}</span>
            <span>ਵਜ਼ਨ: {summary.purchasedWeightDisplay || summary.mandiArrivalDisplay || '0 ਕੁ.'}</span>
          </div>
        </div>

        {/* Step 2: Labour & Deductions */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-rose-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                2
              </span>
              <span className="text-[11px] font-bold text-rose-400">ਮੰਡੀ ਖਰਚੇ (-)</span>
            </div>
            <div className="text-xs text-slate-400 font-semibold mt-2">
              Labour & Deductions
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-300 mt-1">
              -{formatCurrency(totalLabourDeductions)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-700/50 text-[11px] text-slate-400">
            ਪੱਕੀ ਲੇਬਰ, ਝਾਰਾਈ, ਸਕਾਈ ਆਦਿ
          </div>
        </div>

        {/* Step 3: Advances & Paid */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-amber-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
                3
              </span>
              <span className="text-[11px] font-bold text-amber-300">ਐਡਵਾਂਸ ਤੇ ਭੁਗਤਾਨ (-)</span>
            </div>
            <div className="text-xs text-slate-400 font-semibold mt-2">
              Advances + Prior Paid
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
              -{formatCurrency(totalAdvanceAmount + paidAmount)}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-700/50 text-[11px] text-slate-400 flex justify-between">
            <span>ਐਡਵਾਂਸ: {formatCurrency(totalAdvanceAmount)}</span>
            <span>ਦਿੱਤਾ: {formatCurrency(paidAmount)}</span>
          </div>
        </div>

        {/* Step 4: Final Net Balance */}
        <div className={`rounded-2xl p-4 border-2 flex flex-col justify-between shadow-lg ${
          isPayable
            ? 'bg-emerald-950/60 border-emerald-400 text-emerald-100'
            : 'bg-rose-950/60 border-rose-400 text-rose-100'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center ${
                isPayable ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'
              }`}>
                4
              </span>
              <span className={`text-[11px] font-black uppercase tracking-wider ${
                isPayable ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {isPayable ? 'ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ (=)' : 'ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ (=)'}
              </span>
            </div>
            <div className="text-xs font-semibold mt-2 opacity-80">
              {isPayable ? 'Net Balance to Pay Farmer' : 'Balance Due from Farmer'}
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1">
              {formatCurrency(Math.abs(finalBalance))}
            </div>
          </div>
          <div className="pt-2 mt-2 border-t border-white/20 text-[11px] font-bold flex items-center gap-1">
            {isPayable ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>ਆੜ੍ਹਤੀ ਵੱਲੋਂ ਕਿਸਾਨ ਨੂੰ ਦੇਣਾ ਬਣਦਾ ਹੈ</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>ਕਿਸਾਨ ਵੱਲ ਲਿਆ ਗਿਆ ਬਕਾਇਆ ਖੜ੍ਹਾ ਹੈ</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
