import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  AlertTriangle,
  Boxes,
  Plus,
  Settings2,
  ChevronRight,
  X,
  CheckCircle2,
  BellRing,
  ShoppingBag
} from 'lucide-react';

interface BardanaLowStockAlertBannerProps {
  variant?: 'dashboard' | 'compact' | 'header-badge';
  onNavigateToBardana?: () => void;
}

export const BardanaLowStockAlertBanner: React.FC<BardanaLowStockAlertBannerProps> = ({
  variant = 'dashboard',
  onNavigateToBardana
}) => {
  const {
    getBardanaSummary,
    settings,
    updateSettings,
    setActiveSection,
    language
  } = useMandi();

  const isEn = language === 'en';
  const summary = getBardanaSummary();
  const totalRemaining = summary.totalRemaining;
  const newRemaining = summary.newBagsRemaining;
  const oldRemaining = summary.oldBagsRemaining;

  const threshold = settings.bardanaLowStockAlertThreshold ?? 750;
  const isEnabled = settings.isBardanaAlertEnabled ?? true;

  // Edit threshold state
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState<number | string>(threshold);
  const [isDismissedTemporarily, setIsDismissedTemporarily] = useState(false);

  // If disabled or dismissed or stock is safe, don't show
  const isLowStock = isEnabled && totalRemaining <= threshold;

  if (!isLowStock || isDismissedTemporarily) {
    return null;
  }

  const handleSaveThreshold = (newVal: number) => {
    if (newVal > 0) {
      updateSettings({ bardanaLowStockAlertThreshold: newVal });
      setIsEditingThreshold(false);
    }
  };

  const goToBardana = () => {
    if (onNavigateToBardana) {
      onNavigateToBardana();
    } else {
      setActiveSection('bardana');
    }
  };

  // Header Badge Variant
  if (variant === 'header-badge') {
    return (
      <button
        type="button"
        onClick={goToBardana}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-xs transition animate-pulse cursor-pointer border border-rose-400"
        title={
          isEn
            ? `Low Bardana Stock: Only ${totalRemaining} bags remaining (Alert limit: ${threshold})`
            : `ਬਾਰਦਾਨਾ ਅਲਰਟ: ਸਿਰਫ਼ ${totalRemaining} ਬੋਰੀਆਂ ਬਾਕੀ ਹਨ (ਚੇਤਾਵਨੀ ਸੀਮਾ: ${threshold})`
        }
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
        <span className="hidden sm:inline">
          {isEn ? 'Low Bardana:' : 'ਬਾਰਦਾਨਾ ਮੰਗਵਾਓ:'}
        </span>
        <span className="bg-rose-950/80 px-1.5 py-0.2 rounded font-mono text-[11px] text-amber-200">
          {totalRemaining} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
        </span>
      </button>
    );
  }

  // Compact Variant (e.g. for Bags Entry page)
  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 text-white rounded-xl p-3 shadow-sm border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-950/40 rounded-lg text-amber-200 shrink-0">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black tracking-wide uppercase bg-rose-950/50 text-amber-200 px-2 py-0.5 rounded">
                ⚠️ {isEn ? 'LOW STOCK ALERT' : 'ਬਾਰਦਾਨਾ ਸਟਾਕ ਚੇਤਾਵਨੀ'}
              </span>
              <span className="text-xs font-black">
                {isEn ? 'Only' : 'ਸਿਰਫ਼'}{' '}
                <strong className="underline font-mono text-amber-100 font-black text-sm">
                  {totalRemaining}
                </strong>{' '}
                {isEn ? 'bags remaining in Mandi' : 'ਬੋਰੀਆਂ ਬਾਕੀ ਹਨ'}
              </span>
              <span className="text-[11px] text-rose-100 font-mono">
                ({isEn ? 'Alert limit' : 'ਲਿਮਿਟ'}: {threshold})
              </span>
            </div>
            <p className="text-[11px] text-rose-100 mt-0.5">
              {isEn
                ? 'Stock is running low! Order or procure new bardana from Agency / Seller soon.'
                : 'ਬਾਰਦਾਨਾ ਖ਼ਤਮ ਹੋਣ ਵਾਲਾ ਹੈ! ਏਜੰਸੀ ਜਾਂ ਸੈਲਰ ਤੋਂ ਨਵਾਂ ਬਾਰਦਾਨਾ ਮੰਗਵਾਉਣ ਦਾ ਸਮਾਂ ਆ ਗਿਆ ਹੈ।'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={goToBardana}
            className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-black shadow-xs flex items-center gap-1 transition cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{isEn ? 'Manage Bardana' : 'ਬਾਰਦਾਨਾ ਸਟਾਕ ਦੇਖੋ'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissedTemporarily(true)}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Full Feature Banner
  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-rose-600/20 border-2 border-rose-500/70 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-900 relative overflow-hidden backdrop-blur-xs">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        {/* Left Side: Icon & Details */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-rose-600 to-amber-600 text-white rounded-xl shadow-md shrink-0 ring-4 ring-rose-200/50">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                {isEn ? 'LOW BARDANA STOCK ALERT' : 'ਬਾਰਦਾਨਾ ਅਲਰਟ: ਬਾਰਦਾਨਾ ਮੰਗਵਾਉਣ ਵਾਲਾ ਹੈ'}
              </span>
              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-mono border border-rose-300">
                {isEn ? `Alert Threshold: ${threshold} Bags` : `ਚੇਤਾਵਨੀ ਸੀਮਾ: ${threshold} ਬੋਰੀਆਂ`}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 flex-wrap">
              <span>{isEn ? 'Only' : 'ਸਾਫਟਵੇਅਰ ਵਿੱਚ ਸਿਰਫ਼'}</span>
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded-lg font-mono font-black text-lg shadow-xs">
                {totalRemaining} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
              </span>
              <span>{isEn ? 'left in stock!' : 'ਖਾਲੀ ਬਾਰਦਾਨਾ ਰਹਿ ਗਿਆ ਹੈ!'}</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-700 font-medium">
              {isEn
                ? `Current Stock: ${newRemaining} New Bags + ${oldRemaining} Old Bags. Stock is below the safety threshold of ${threshold} bags. Please place an order for new bardana soon.`
                : `ਮੌਜੂਦਾ ਸਟਾਕ: ${newRemaining} ਨਵੀਆਂ ਬੋਰੀਆਂ + ${oldRemaining} ਪੁਰਾਣੀਆਂ ਬੋਰੀਆਂ। ਸਟਾਕ 750 (ਸੈੱਟ ਕੀਤੀ ਸੀਮਾ) ਤੋਂ ਘੱਟ ਗਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਨਵਾਂ ਬਾਰਦਾਨਾ ਮੰਗਵਾਉਣ ਦਾ ਪ੍ਰਬੰਧ ਕਰੋ।`}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons & Threshold Setup */}
        <div className="flex flex-wrap items-center gap-2.5 lg:self-center shrink-0">
          <button
            type="button"
            onClick={goToBardana}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
          >
            <Boxes className="w-4 h-4 text-emerald-200" />
            <span>{isEn ? 'View Bardana Register' : 'ਬਾਰਦਾਨਾ ਰਜਿਸਟਰ ਖੋਲ੍ਹੋ'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              goToBardana();
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>{isEn ? '+ Receive Stock' : '+ ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤ ਕਰੋ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditingThreshold(!isEditingThreshold)}
            className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs rounded-xl border border-rose-300 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
            title="Change 750 bags limit"
          >
            <Settings2 className="w-3.5 h-3.5 text-rose-700" />
            <span>{isEn ? 'Change Limit' : 'ਅਲਰਟ ਲਿਮਿਟ ਬਦਲੋ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissedTemporarily(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-xl transition cursor-pointer"
            title="Dismiss Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Threshold Inline Quick Editor */}
      {isEditingThreshold && (
        <div className="mt-4 pt-3 border-t border-rose-300/80 flex flex-wrap items-center gap-3 animate-in fade-in">
          <span className="text-xs font-bold text-slate-800">
            {isEn
              ? 'Select or enter alert threshold (bags):'
              : 'ਚੇਤਾਵਨੀ ਅਲਰਟ ਲਿਮਿਟ ਚੁਣੋ ਜਾਂ ਦਰਜ ਕਰੋ (ਬੋਰੀਆਂ):'}
          </span>

          <div className="flex items-center gap-1.5">
            {[500, 750, 1000, 1500, 2000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSaveThreshold(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                  threshold === preset
                    ? 'bg-rose-600 text-white shadow-2xs font-black'
                    : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-300'
                }`}
              >
                {preset} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="number"
              min={1}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              className="w-24 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="750"
            />
            <button
              type="button"
              onClick={() => handleSaveThreshold(Number(thresholdInput) || 750)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
            >
              {isEn ? 'Save' : 'ਸੇਵ ਕਰੋ'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditingThreshold(false)}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 text-xs font-bold"
            >
              {isEn ? 'Cancel' : 'ਰੱਦ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
