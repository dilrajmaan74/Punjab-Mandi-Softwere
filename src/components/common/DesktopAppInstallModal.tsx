import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useMandi } from '../../context/MandiContext';
import {
  Laptop,
  Download,
  CheckCircle2,
  X,
  MonitorCheck,
  ShieldCheck,
  Zap,
  HardDrive,
  ExternalLink,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export const DesktopAppInstallModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { language } = useMandi();
  const { isInstallable, isInstalled, triggerInstall, isWindows, isMac } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const isEn = language === 'en';

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    const success = await triggerInstall();
    setInstalling(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg ring-2 ring-emerald-400/40">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {isEn ? 'Install as Laptop / Desktop Accounting Software' : 'ਲੈਪਟਾਪ / ਪੀਸੀ ਤੇ Tally Prime ਵਾਂਗ ਇੰਸਟਾਲ ਕਰੋ'}
                </h3>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-900/90 text-emerald-300 border border-emerald-700/60">
                  PC App
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Run directly from your Windows / Mac Desktop without Chrome address bar'
                  : 'ਬਿਨਾਂ ਕ੍ਰੋਮ ਖੋਲ੍ਹੇ ਸਿੱਧਾ ਲੈਪਟਾਪ ਦੇ ਡੈਸਕਟੌਪ ਆਈਕਨ ਤੋਂ ਚਲਾਓ (Direct Desktop Access)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Status Alert if Already Installed */}
          {isInstalled && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/80 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <strong className="font-bold text-white block">
                  {isEn ? 'Already Running as Desktop App!' : 'ਸਾਫਟਵੇਅਰ ਪਹਿਲਾਂ ਹੀ ਤੁਹਾਡੇ ਲੈਪਟਾਪ ਉੱਤੇ ਇੰਸਟਾਲ ਹੈ!'}
                </strong>
                <span>
                  {isEn
                    ? 'You are running in standalone desktop mode with native shortcut.'
                    : 'ਤੁਸੀਂ ਇਸਨੂੰ ਸਿੱਧਾ ਸਟਾਰਟ ਮੀਨੂ ਜਾਂ ਡੈਸਕਟੌਪ ਆਈਕਨ ਤੋਂ ਖੋਲ੍ਹ ਸਕਦੇ ਹੋ।'}
                </span>
              </div>
            </div>
          )}

          {/* Core Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-800/80 border border-slate-700/70 p-3 rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/60 text-emerald-400 flex items-center justify-center mb-2">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">
                {isEn ? 'Super Fast Direct Open' : '1-ਕਲਿੱਕ ਸਿੱਧਾ ਓਪਨ'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEn ? 'Double click desktop icon' : 'ਡੈਸਕਟੌਪ ਆਈਕਨ ਤੋਂ ਬਿਨਾਂ ਕ੍ਰੋਮ ਟੈਬ ਦੇ ਓਪਨ'}
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 p-3 rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-blue-900/60 text-blue-400 flex items-center justify-center mb-2">
                <HardDrive className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">
                {isEn ? 'Full Screen Windows' : 'ਫੁੱਲ ਸਕਰੀਨ Tally ਵਾਂਗ'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEn ? 'No browser URL bars' : 'ਬਿਨਾਂ URL ਬਾਰ ਜਾਂ ਟੈਬਾਂ ਦੇ ਸਾਫ਼ ਵਿਊ'}
              </p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/70 p-3 rounded-xl flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-lg bg-amber-900/60 text-amber-400 flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">
                {isEn ? 'Offline Safe & Instant' : 'ਆਫਲਾਈਨ ਤੇ ਸੁਰੱਖਿਅਤ'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEn ? 'Automatic local caching' : 'ਨੈੱਟ ਹੌਲੀ ਹੋਵੇ ਤਾਂ ਵੀ ਡਾਟਾ ਤੁਰੰਤ ਖੁੱਲ੍ਹੇ'}
              </p>
            </div>
          </div>

          {/* Action Trigger / 1-Click Install Button */}
          {isInstallable && !isInstalled ? (
            <div className="bg-gradient-to-r from-emerald-950 via-slate-800 to-emerald-950 border-2 border-emerald-500/80 p-4 rounded-xl text-center space-y-2.5">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                {isEn ? '✓ Windows / Mac Ready to Install' : '✓ ਲੈਪਟਾਪ ਉੱਤੇ ਇੰਸਟਾਲੇਸ਼ਨ ਲਈ ਤਿਆਰ'}
              </span>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>
                  {installing
                    ? isEn ? 'Installing...' : 'ਇੰਸਟਾਲ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...'
                    : isEn ? 'Install App on Laptop (1-Click)' : 'ਲੈਪਟਾਪ ਤੇ ਸਿੱਧਾ ਇੰਸਟਾਲ ਕਰੋ (Install PC App)'}
                </span>
              </button>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'A prompt will open asking "Install app?". Click "Install" to create Desktop shortcut.'
                  : 'ਇੱਕ ਵਿੰਡੋ ਆਵੇਗੀ, ਉੱਥੇ "Install" ਤੇ ਕਲਿੱਕ ਕਰੋ। ਤੁਹਾਡੇ ਲੈਪਟਾਪ ਸਕ੍ਰੀਨ ਤੇ Tally Prime ਵਾਂਗ ਆਈਕਨ ਬਣ ਜਾਵੇਗਾ।'}
              </p>
            </div>
          ) : null}

          {/* Step-by-Step Direct Guide for Chrome / Edge (Tally Prime Style Setup) */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <MonitorCheck className="w-4 h-4" />
              <span>
                {isEn
                  ? 'Chrome / Edge Laptop Setup Guide (20-Second Tally Style Setup)'
                  : 'ਕ੍ਰੋਮ ਜਾਂ ਐੱਜ ਰਾਹੀਂ ਲੈਪਟਾਪ ਤੇ Tally Prime ਵਾਂਗ ਡੈਸਕਟੌਪ ਸਾਫਟਵੇਅਰ ਕਿਵੇਂ ਬਣਾਈਏ:'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-white">ਕ੍ਰੋਮ ਦੀ ਐਡਰੈੱਸ ਬਾਰ ਦੇ ਸੱਜੇ ਪਾਸੇ ਵੇਖੋ:</strong>
                  <p className="text-slate-400 mt-0.5">
                    ਜਿੱਥੇ URL ਹੁੰਦਾ ਹੈ, ਉਸਦੇ ਸੱਜੇ ਪਾਸੇ ਇੱਕ ਛੋਟਾ <strong className="text-emerald-400">ਕੰਪਿਊਟਰ ਆਈਕਨ (🖥️ / ⬇️ Install App)</strong> ਦਿਖਾਈ ਦਿੰਦਾ ਹੈ। ਉਸਤੇ ਕਲਿੱਕ ਕਰੋ।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-white">ਜਾਂ ਕ੍ਰੋਮ ਦੇ 3 ਬਿੰਦੂਆਂ (Three Dots ⋮) ਤੇ ਕਲਿੱਕ ਕਰੋ:</strong>
                  <p className="text-slate-400 mt-0.5">
                    ਸੱਜੇ ਕੋਨੇ ਉੱਪਰ <strong className="text-white">Menu (⋮)</strong> ਤੇ ਕਲਿੱਕ ਕਰੋ ➔ <strong className="text-emerald-400">"Save and share" / "Install Punjab Mandi Software"</strong> ਚੁਣੋ ➔ <strong className="text-white">"Install"</strong> ਦਬਾਓ।
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-white">Desktop Shortcut & Taskbar Pin:</strong>
                  <p className="text-slate-400 mt-0.5">
                    ਇੰਸਟਾਲ ਹੁੰਦੇ ਸਾਰ ਇਹ ਤੁਹਾਡੇ Windows Start Menu ਅਤੇ Desktop ਉੱਤੇ ਆ ਜਾਵੇਗਾ। ਹੇਠਾਂ ਟਾਸਕਬਾਰ ਤੇ Right-Click ਕਰਕੇ <strong className="text-emerald-400">"Pin to taskbar"</strong> ਕਰ ਲਓ, ਹਰ ਰੋਜ਼ ਸਿਰਫ 1-ਕਲਿੱਕ ਨਾਲ ਸਿੱਧਾ ਖੁੱਲ੍ਹੇਗਾ।
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick FAQ / Clarification */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-300 font-semibold">ਕੀ ਇਹ ਪੂਰਾ Tally Prime ਵਾਂਗ ਕੰਮ ਕਰੇਗਾ?</span>
              <p className="mt-0.5">
                ਹਾਂਜੀ ਬਿਲਕੁਲ! ਇੰਸਟਾਲ ਹੋਣ ਤੋਂ ਬਾਅਦ ਇਹ ਕ੍ਰੋਮ ਦੇ ਅੰਦਰ ਨਹੀਂ ਖੁੱਲ੍ਹਦਾ, ਬਲਕਿ ਇੱਕ ਵੱਖਰੀ ਸੁਤੰਤਰ ਵਿੰਡੋ (Standalone PC Software Window) ਵਿੱਚ ਚੱਲਦਾ ਹੈ ਜਿਸ ਵਿੱਚ ਕੋਈ ਵੈੱਬਸਾਈਟ ਬਾਰ ਨਹੀਂ ਹੁੰਦੀ। ਤੁਹਾਡਾ ਸਾਰਾ ਮੰਡੀ ਡਾਟਾ, ਬੋਰੀਆਂ, ਲੇਬਰ ਅਤੇ ਰਿਪੋਰਟਾਂ ਤੁਰੰਤ ਕੰਮ ਕਰਦੀਆਂ ਹਨ।
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mandi Prime Desktop Edition • Progressive Web Accounting</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            {isEn ? 'Close' : 'ਬੰਦ ਕਰੋ (Close)'}
          </button>
        </div>
      </div>
    </div>
  );
};
