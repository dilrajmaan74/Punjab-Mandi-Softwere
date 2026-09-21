import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { CropType, CROP_CONFIGS } from '../../types/mandi';
import { Wheat, Sparkles, Scale, Info, Check } from 'lucide-react';

interface CropSwitcherProps {
  compact?: boolean;
}

export const CropSwitcher: React.FC<CropSwitcherProps> = ({ compact = false }) => {
  const { activeCrop, setActiveCrop, activeCropConfig, language } = useMandi();
  const [showInfo, setShowInfo] = useState(false);
  const isEn = language === 'en';

  const crops: { id: CropType; labelPa: string; labelEn: string; iconEmoji: string; badgeColor: string; weight: string; rate: string; season: string }[] = [
    {
      id: 'WHEAT',
      labelPa: 'ਕਣਕ (Wheat)',
      labelEn: 'Wheat (ਕਣਕ)',
      iconEmoji: '🌾',
      badgeColor: 'bg-amber-500 text-slate-950',
      weight: '50.00 Kg',
      rate: '₹2,425',
      season: isEn ? 'Rabi Season' : 'ਹਾੜ੍ਹੀ ਸੀਜ਼ਨ'
    },
    {
      id: 'MAIZE',
      labelPa: 'ਮੱਕੀ (Maize)',
      labelEn: 'Maize (ਮੱਕੀ)',
      iconEmoji: '🌽',
      badgeColor: 'bg-yellow-400 text-slate-950',
      weight: '50/60 Kg / ਲੂਜ਼',
      rate: '₹2,225',
      season: isEn ? 'Summer/Kharif' : 'ਗਰਮੀ/ਸਾਉਣੀ'
    },
    {
      id: 'PADDY',
      labelPa: 'ਝੋਨਾ (Paddy)',
      labelEn: 'Paddy (ਝੋਨਾ)',
      iconEmoji: '🍚',
      badgeColor: 'bg-emerald-500 text-white',
      weight: '37.50 Kg',
      rate: '₹2,461',
      season: isEn ? 'Main Kharif' : 'ਸਾਉਣੀ ਸੀਜ਼ਨ'
    }
  ];

  if (compact) {
    return (
      <div className="inline-flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-1">
          {crops.map((c) => {
            const isSelected = activeCrop === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCrop(c.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition select-none cursor-pointer ${
                  isSelected
                    ? `${c.badgeColor} shadow-xs ring-1 ring-white/40 scale-102 font-black`
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={`${c.labelEn} - ${c.weight} / ${c.rate}`}
              >
                <span>{c.iconEmoji}</span>
                <span className="text-[11px] sm:text-xs">
                  {isEn ? c.labelEn : c.labelPa.split(' ')[0]}
                </span>
                {isSelected && <span className="text-[10px] opacity-80">({c.weight})</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700 shadow-xs">
        <div className="flex items-center gap-1">
          <span className="hidden lg:flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-300 pl-1.5 pr-2 border-r border-slate-700 select-none">
            <Scale className="w-3.5 h-3.5" />
            <span>{isEn ? 'CROP:' : 'ਫਸਲ:'}</span>
          </span>

          {crops.map((c) => {
            const isSelected = activeCrop === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCrop(c.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition select-none cursor-pointer ${
                  isSelected
                    ? `${c.badgeColor} shadow-xs ring-1 ring-white/40 font-black scale-102`
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/80'
                }`}
                title={`${c.labelEn} - ਭਰਤੀ: ${c.weight} | MSP: ${c.rate}`}
              >
                <span className="text-sm leading-none">{c.iconEmoji}</span>
                <span className="text-xs">
                  {isEn ? c.labelEn.split(' ')[0] : c.labelPa.split(' ')[0]}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-black/20 font-black">
                    {c.weight}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="ml-1 p-1 text-slate-400 hover:text-amber-300 transition rounded"
          title={isEn ? 'View Crop Rules & Moisture Cuts' : 'ਫਸਲ ਨਿਯਮ ਅਤੇ ਨਮੀ ਕਾਟ ਜਾਣਕਾਰੀ'}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info Popover on Crop Rules */}
      {showInfo && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3.5 z-50 text-white animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
            <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
              <span>🌾</span>
              <span>{isEn ? 'Annual 3-Crop Setup' : 'ਸਲਾਨਾ 3 ਫਸਲੀ ਸਿਸਟਮ'}</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowInfo(false)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-[11px] text-slate-300">
            <div className={`p-2 rounded-lg border ${activeCrop === 'WHEAT' ? 'bg-amber-950/40 border-amber-600/60' : 'bg-slate-800/60 border-slate-700'}`}>
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>🌾 ਕਣਕ (Wheat - ਹਾੜ੍ਹੀ)</span>
                <span className="font-mono text-[10px] text-amber-200">50 Kg ਬੋਰੀ</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                ਸਰਕਾਰੀ MSP ₹2,425/ਕੁਇੰਟਲ, 12% ਮਿਆਰੀ ਨਮੀ।
              </p>
            </div>

            <div className={`p-2 rounded-lg border ${activeCrop === 'MAIZE' ? 'bg-yellow-950/40 border-yellow-500/60' : 'bg-slate-800/60 border-slate-700'}`}>
              <div className="font-bold text-yellow-300 flex items-center justify-between">
                <span>🌽 ਮੱਕੀ (Maize - ਛੱਲੀ)</span>
                <span className="font-mono text-[10px] text-yellow-200">50/60 Kg ਜਾਂ ਲੂਜ਼ ਕਾਂਡਾ</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                ਸਿੱਧੀ ਟਰਾਲੀ ਕਾਂਡਾ ਤੁਲਾਈ + 14% ਤੋਂ ਉੱਪਰ ਉੱਚ ਨਮੀ ਕਾਟ ਕੈਲਕੁਲੇਟਰ।
              </p>
            </div>

            <div className={`p-2 rounded-lg border ${activeCrop === 'PADDY' ? 'bg-emerald-950/40 border-emerald-600/60' : 'bg-slate-800/60 border-slate-700'}`}>
              <div className="font-bold text-emerald-300 flex items-center justify-between">
                <span>🍚 ਝੋਨਾ / ਬਾਸਮਤੀ (Paddy - ਸਾਉਣੀ)</span>
                <span className="font-mono text-[10px] text-emerald-200">37.5 Kg ਭਰਤੀ</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                ਸਰਕਾਰੀ 37.500 Kg ਗੱਟਾ, MSP ₹2,461/ਕੁਇੰਟਲ, 17% ਸਰਕਾਰੀ ਨਮੀ।
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
