import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode, setIsDemoMode, setActiveFirmId, syncWithSupabase, resetToDemoPracticeData } = useMandi();
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // If in Live Supabase Cloud Mode (Real software / Jammu Trading Co), do not show demo banner
  if (!isDemoMode) {
    return null;
  }

  const handleReset = () => {
    setIsResetting(true);
    try {
      resetToDemoPracticeData();
      setSuccessNotice('ਡੈਮੋ ਡਾਟਾ ਸਫਲਤਾਪੂਰਵਕ ਤਾਜ਼ਾ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ!');
      setShowConfirm(false);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (e) {
      console.error('Failed to reset demo data:', e);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSwitchToLive = async () => {
    setIsDemoMode(false);
    setActiveFirmId('FIRM-001');
    try {
      localStorage.setItem('mandi_demo_practice_mode', 'false');
      localStorage.setItem('punjab_mandi_active_firm_id', 'FIRM-001');
    } catch {}
    setTimeout(() => {
      syncWithSupabase();
    }, 50);
  };

  return (
    <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-emerald-950 border-b border-amber-500/50 text-white px-3 sm:px-4 py-2 shadow-md relative z-20 print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Left Info Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-amber-300 tracking-tight">
                🎯 ਡੈਮੋ ਪ੍ਰੈਕਟਿਸ ਮੋਡ (Demo Practice Mode)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/60 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ਅਸਲ ਡਾਟਾ ਬਿਲਕੁਲ ਸੁਰੱਖਿਅਤ ਤੇ ਅਲੱਗ ਹੈ
              </span>
            </div>
            <p className="text-[11px] text-slate-300 hidden md:block mt-0.5">
              ਤੁਸੀਂ ਬੇਫ਼ਿਕਰ ਹੋ ਕੇ ਨਵੀਂਆਂ ਐਂਟਰੀਆਂ ਪਾ ਸਕਦੇ ਹੋ, ਡਿਲੀਟ ਕਰ ਸਕਦੇ ਹੋ ਅਤੇ ਪ੍ਰੈਕਟਿਸ ਕਰ ਸਕਦੇ ਹੋ।
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Switch to Live Cloud Jammu Trading Button */}
          <button
            type="button"
            onClick={handleSwitchToLive}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition shadow-sm cursor-pointer"
            title="Switch to Real Supabase Cloud Data (Jammu Trading Co)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span>ਅਸਲ ਲਾਈਵ ਡਾਟਾ ਖੋਲ੍ਹੋ (ਜੰਮੂ ਟਰੇਡਿੰਗ)</span>
          </button>

          {successNotice ? (
            <span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-600 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{successNotice}</span>
            </span>
          ) : showConfirm ? (
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-amber-500/80 animate-in zoom-in-95">
              <span className="text-[11px] text-amber-300 font-bold px-2">ਕੀ ਸਾਰਾ ਡੈਮੋ ਡਾਟਾ ਤਾਜ਼ਾ ਕਰਨਾ ਹੈ?</span>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-black transition cursor-pointer"
              >
                ਹਾਂ, ਰੀਸੈੱਟ ਕਰੋ
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
              >
                ਰੱਦ ਕਰੋ
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
              title="Reset sample demo data back to default fresh state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>ਡੈਮੋ ਡਾਟਾ ਰੀਸੈੱਟ ਕਰੋ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
