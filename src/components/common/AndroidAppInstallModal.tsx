import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useMandi } from '../../context/MandiContext';
import { useAuth } from '../../context/AuthContext';
import {
  Smartphone,
  Download,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  Sparkles,
  User,
  KeyRound,
  ExternalLink,
  HelpCircle,
  Share2
} from 'lucide-react';

export const AndroidAppInstallModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { language } = useMandi();
  const { currentUser } = useAuth();
  const { isInstallable, isInstalled, triggerInstall, isAndroid } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const isEn = language === 'en';

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    const success = await triggerInstall();
    setInstalling(false);
    if (success) {
      onClose();
    } else {
      setShowManualSteps(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg ring-2 ring-emerald-400/40 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {isEn ? 'Install on Android Phone' : 'ਐਂਡਰਾਇਡ ਫੋਨ ਵਿੱਚ ਐਪ ਵਾਂਗ ਇੰਸਟਾਲ ਕਰੋ'}
                </h3>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-900/90 text-emerald-300 border border-emerald-700/60">
                  Android APK / PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEn
                  ? 'Open directly from your phone home screen without Chrome browser'
                  : 'ਬਿਨਾਂ ਕ੍ਰੋਮ ਖੋਲ੍ਹੇ ਸਿੱਧਾ ਮੋਬਾਈਲ ਦੀ ਸਕ੍ਰੀਨ ਤੋਂ ਚਲਾਓ (Direct App Access)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Status Box */}
          {isInstalled ? (
            <div className="bg-emerald-950/60 border border-emerald-600/70 rounded-xl p-3.5 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-white">
                  {isEn ? 'App is Already Installed!' : 'ਸਾਫਟਵੇਅਰ ਪਹਿਲਾਂ ਹੀ ਇੰਸਟਾਲ ਹੈ!'}
                </h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  {isEn
                    ? 'You are running this application directly from your home screen or standalone window.'
                    : 'ਇਹ ਐਪ ਤੁਹਾਡੇ ਫੋਨ ਵਿੱਚ ਪਹਿਲਾਂ ਹੀ ਐਪਲੀਕੇਸ਼ਨ ਵਜੋਂ ਚੱਲ ਰਹੀ ਹੈ।'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-amber-300">
                  {isEn ? '1-Tap Android Mobile Installation' : '1 ਕਲਿੱਕ ਵਿੱਚ ਫੋਨ ਵਿੱਚ ਐਪ ਬਣ ਜਾਵੇਗੀ:'}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isEn
                    ? 'Once installed, an app icon will appear on your phone home screen. You will never need to open Chrome or type website links again!'
                    : 'ਇੰਸਟਾਲ ਕਰਨ ਤੋਂ ਬਾਅਦ ਤੁਹਾਡੇ ਫੋਨ ਵਿੱਚ "Mandi Prime / ਪੰਜਾਬ ਮੰਡੀ" ਦਾ ਆਈਕਨ ਬਣ ਜਾਵੇਗਾ। ਅਗਲੀ ਵਾਰ ਤੁਹਾਨੂੰ ਕ੍ਰੋਮ ਖੋਲ੍ਹਣ ਦੀ ਲੋੜ ਨਹੀਂ ਪਵੇਗੀ, ਸਿੱਧਾ ਐਪ ਖੁੱਲ੍ਹੇਗੀ।'}
                </p>
              </div>
            </div>
          )}

          {/* User ID & Session Info Card */}
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5 text-amber-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {isEn ? 'User ID & Permanent Session' : 'ਤੁਹਾਡੀ ਯੂਜ਼ਰ ਆਈ.ਡੀ (User ID & Auto-Login)'}
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/70">
                {isEn ? 'Always Logged In' : 'ਹਮੇਸ਼ਾ ਲੌਗਇਨ ਰਹੇਗਾ'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">ਮਾਲਕ / ਯੂਜ਼ਰ ਦਾ ਨਾਂ:</span>
                <strong className="text-white text-xs font-bold truncate block">
                  {currentUser?.fullName || 'ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)'}
                </strong>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">ਮੋਬਾਈਲ ਨੰਬਰ (User ID):</span>
                <strong className="text-emerald-400 font-mono text-xs font-bold block">
                  {currentUser?.mobile || '98765-43210'}
                </strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * ਫੋਨ 'ਚ ਐਪ ਇੰਸਟਾਲ ਹੋਣ ਤੋਂ ਬਾਅਦ ਤੁਹਾਡੀ ਆਈ.ਡੀ ਆਪਣੇ-ਆਪ ਯਾਦ ਰਹੇਗੀ, ਵਾਰ-ਵਾਰ ਪਾਸਵਰਡ ਨਹੀਂ ਮੰਗੇਗਾ।
            </p>
          </div>

          {/* Action Button: Native Prompt */}
          {!isInstalled && isInstallable && !showManualSteps && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer ring-2 ring-emerald-400/50"
              >
                <Download className="w-5 h-5 text-amber-300 animate-bounce" />
                <span>
                  {installing
                    ? isEn ? 'Installing App...' : 'ਇੰਸਟਾਲ ਹੋ ਰਿਹਾ ਹੈ...'
                    : isEn ? 'Install App on Phone Now (1-Click)' : 'ਹੁਣੇ ਫੋਨ ਵਿੱਚ ਐਪ ਇੰਸਟਾਲ ਕਰੋ (1-ਕਲਿੱਕ)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowManualSteps(true)}
                className="w-full text-center text-xs text-slate-400 hover:text-emerald-400 font-bold transition py-1"
              >
                {isEn ? 'Or see manual steps in Chrome →' : 'ਜਾਂ ਕ੍ਰੋਮ (Chrome) ਤੋਂ ਸਿੱਧਾ ਇੰਸਟਾਲ ਕਰਨ ਦਾ ਤਰੀਕਾ ਵੇਖੋ →'}
              </button>
            </div>
          )}

          {/* Illustrated Manual Installation Steps in Chrome */}
          {(!isInstallable || showManualSteps || !isInstalled) && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isEn ? 'How to Install from Chrome on Android:' : 'ਕ੍ਰੋਮ (Chrome) ਵਿੱਚੋਂ 2 ਸੈਕਿੰਡ ਵਿੱਚ ਇੰਸਟਾਲ ਕਰੋ:'}
                  </span>
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Step-by-Step</span>
              </div>

              <ol className="space-y-3 text-xs text-slate-200">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <span className="font-bold text-white">ਕ੍ਰੋਮ ਦੀਆਂ 3 ਬਿੰਦੀਆਂ ਦਬਾਓ:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      ਆਪਣੇ ਫੋਨ ਦੇ ਉੱਪਰ ਸੱਜੇ ਕੋਨੇ (Top Right) ਵਿੱਚ ਬਣੀਆਂ <strong>3 ਬਿੰਦੀਆਂ (⋮ Three Dots)</strong> 'ਤੇ ਕਲਿੱਕ ਕਰੋ।
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <span className="font-bold text-white">"ਐਪ ਇੰਸਟਾਲ ਕਰੋ" ਜਾਂ "Add to Home screen" ਚੁਣੋ:</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      ਮੈਨਿਊ ਵਿੱਚੋਂ <strong>"Install app" (ਐਪ ਇੰਸਟਾਲ ਕਰੋ)</strong> ਜਾਂ <strong>"Add to Home screen" (ਹੋਮ ਸਕ੍ਰੀਨ 'ਤੇ ਜੋੜੋ)</strong> 'ਤੇ ਕਲਿੱਕ ਕਰੋ।
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <span className="font-bold text-white">ਕੰਮ ਹੋ ਗਿਆ (Ready):</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      ਹੁਣ ਤੁਹਾਡੇ ਫੋਨ ਦੀ ਹੋਮ ਸਕ੍ਰੀਨ 'ਤੇ <strong>"Mandi Prime"</strong> ਨਾਂ ਦੀ ਅਸਲੀ ਐਪਲੀਕੇਸ਼ਨ ਬਣ ਜਾਵੇਗੀ। ਅੱਗੇ ਤੋਂ ਸਿਰਫ਼ ਉਸ ਆਈਕਨ ਨੂੰ ਦਬਾ ਕੇ ਸਾਫਟਵੇਅਰ ਖੋਲ੍ਹੋ!
                    </p>
                  </div>
                </li>
              </ol>

              {isInstallable && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full mt-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>ਫੋਨ 'ਤੇ ਸਿੱਧਾ ਇੰਸਟਾਲ ਕਰਨ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰੋ (Try Direct Install)</span>
                </button>
              )}
            </div>
          )}

          {/* Advantages of Installing */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
            <div className="flex items-center gap-1.5 bg-slate-800/50 p-2 rounded-lg border border-slate-800">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>ਕੋਈ ਕ੍ਰੋਮ ਬਾਰ ਨਹੀਂ ਦਿਖੇਗੀ</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/50 p-2 rounded-lg border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>ਫੁੱਲ ਸਕ੍ਰੀਨ ਮੋਬਾਈਲ ਐਪ</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            ਪੰਜਾਬ ਮੰਡੀ ਸਾਫਟਵੇਅਰ • Android & PC App
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
          >
            {isEn ? 'Close' : 'ਬੰਦ ਕਰੋ'}
          </button>
        </div>
      </div>
    </div>
  );
};
