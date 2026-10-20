import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  Wheat,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Building2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  setSupabaseAnonKeyLocal,
  isSupabaseConfigured
} from '../../lib/supabase';

export const SupabaseStrictLoginLock: React.FC = () => {
  const { loginWithSupabase, signUpWithSupabase } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState<string>('demo.mandi@punjab.gov.in');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)');
  const [mobile, setMobile] = useState<string>('9876543210');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Optional collapsible key editor
  const [showKeyConfig, setShowKeyConfig] = useState<boolean>(false);
  const [customKey, setCustomKey] = useState<string>(getSupabaseAnonKey());
  const [keySaveNotice, setKeySaveNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਈਮੇਲ ਐਡਰੈੱਸ ਭਰੋ (Valid email address required).');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setErrorMessage('ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ (Password must be at least 6 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const res = await loginWithSupabase(cleanEmail, cleanPassword, rememberMe);
        if (!res.success) {
          // Helpful Punjabi & English error translation
          let friendlyError = res.message;
          if (res.message.includes('Invalid login credentials')) {
            friendlyError = 'ਗਲਤ ਈਮੇਲ ਜਾਂ ਪਾਸਵਰਡ! ਜੇਕਰ ਤੁਹਾਡਾ ਖਾਤਾ ਅਜੇ ਨਹੀਂ ਬਣਿਆ ਤਾਂ ਹੇਠਾਂ "ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ" ਤੇ ਕਲਿੱਕ ਕਰੋ। (Invalid email or password. If you do not have an account yet, click "Sign Up" below).';
          } else if (res.message.includes('Email not confirmed')) {
            friendlyError = 'ਈਮੇਲ ਵੈਰੀਫਾਈ ਨਹੀਂ ਹੋਈ (Email not confirmed). ਕਿਰਪਾ ਕਰਕੇ Supabase Dashboard ਵਿੱਚ User Confirm ਕਰੋ।';
          }
          setErrorMessage(friendlyError);
        } else {
          setSuccessMessage('ਲੌਗਇਨ ਸਫਲ ਰਿਹਾ! ਮੰਡੀ ਡਾਟਾ ਅਨਲੌਕ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ...');
        }
      } else {
        const res = await signUpWithSupabase(cleanEmail, cleanPassword, fullName.trim(), mobile.trim());
        if (!res.success) {
          setErrorMessage(`ਸਾਈਨ ਅੱਪ ਅਸਫਲ: ${res.message}`);
        } else {
          setSuccessMessage(res.message);
          if (res.message.includes('ਸਫਲ') || res.message.includes('ਬਣ ਗਿਆ')) {
            // Auto login or switch
            setTimeout(() => {
              setMode('LOGIN');
            }, 1500);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'ਲੌਗਇਨ ਦੌਰਾਨ ਅਣਪਛਾਤੀ ਗਲਤੀ ਆਈ।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveKey = () => {
    try {
      setSupabaseAnonKeyLocal(customKey.trim());
      setKeySaveNotice('ਸੁਪਾਬੇਸ ਕੁੰਜੀ ਸਫਲਤਾਪੂਰਵਕ ਸੁਰੱਖਿਅਤ ਹੋ ਗਈ!');
      setTimeout(() => setKeySaveNotice(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'ਕੁੰਜੀ ਸੁਰੱਖਿਅਤ ਕਰਨ ਵਿੱਚ ਅਸਫਲ');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center items-center p-3 sm:p-6 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Decor Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-lg z-10">
        {/* Brand & Firm Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-900/50 mb-3 border border-emerald-400/30">
            <Wheat className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>ਪੰਜਾਬ ਮੰਡੀ ਸਾਫਟਵੇਅਰ</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/80">
              PRO 2026-27
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
            ਪੰਜਾਬ ਮੰਡੀ ਟਰੇਡਿੰਗ ਕੰਪਨੀ (Punjab Mandi Trading Co) • ਦਾਣਾ ਮੰਡੀ (ਡੈਮੋ ਪ੍ਰੈਕਟਿਸ)
          </p>
          <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 bg-slate-800/80 rounded-md border border-slate-700 font-mono">
              ਲਾਇਸੰਸ: DEMO/PB/2026
            </span>
            <span className="px-2 py-0.5 bg-slate-800/80 rounded-md border border-slate-700 font-mono">
              DEMO-FIRM-001
            </span>
          </div>
        </div>

        {/* Strict Data Lock Warning Card */}
        <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-3.5 mb-4 shadow-lg backdrop-blur-md flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-900/80 border border-rose-600 flex items-center justify-center text-rose-300 shrink-0 mt-0.5">
            <Lock className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-rose-200 flex items-center gap-2">
              <span>ਬਿਨਾਂ ਲੌਗਇਨ ਡਾਟਾ ਲੌਕ ਹੈ (Strict Data Lock Active)</span>
              <span className="text-[10px] bg-rose-900 text-rose-300 px-1.5 py-0.5 rounded font-mono">
                100% PROTECTED
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-rose-300/90 mt-1 leading-relaxed">
              ਕਾਰੋਬਾਰੀ ਸੁਰੱਖਿਆ ਅਤੇ ਗੁਪਤਤਾ ਲਈ ਬਿਨਾਂ ਸੁਪਾਬੇਸ ਲੌਗਇਨ ਕੋਈ ਵੀ ਮੰਡੀ ਡਾਟਾ (ਕਿਸਾਨ, ਬੋਰੀਆਂ, ਖਰੀਦ, ਲੇਖਾ) ਨਹੀਂ ਦਿਖਾਇਆ ਜਾਵੇਗਾ।
              ਆਪਣੀ ਸੁਪਾਬੇਸ ਆਈਡੀ ਨਾਲ ਲੌਗਇਨ ਕਰਨ ਉਪਰੰਤ ਹੀ ਲਾਈਵ ਕਲਾਊਡ ਡਾਟਾ ਅਨਲੌਕ ਹੋਵੇਗਾ।
            </p>
          </div>
        </div>

        {/* Main Authentication Box */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'LOGIN'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>ਸੁਪਾਬੇਸ ਲੌਗਇਨ (Sign In)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('SIGNUP');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'SIGNUP'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ਨਵਾਂ ਖਾਤਾ (Sign Up)</span>
            </button>
          </div>

          {/* 1-Click Demo Company Quick Open */}
          <button
            type="button"
            onClick={async () => {
              setIsSubmitting(true);
              setErrorMessage(null);
              try {
                const res = await loginWithSupabase('demo.mandi@punjab.gov.in', 'Password@123', true);
                if (res.success) {
                  setSuccessMessage('ਡੈਮੋ ਕੰਪਨੀ ਸਫਲਤਾਪੂਰਵਕ ਖੁੱਲ੍ਹ ਗਈ ਹੈ!');
                } else {
                  setErrorMessage(res.message);
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full mb-3 py-2.5 px-3 bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/50 hover:border-amber-400 rounded-xl text-amber-300 font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>⚡ 1-ਕਲਿੱਕ ਨਾਲ ਡੈਮੋ ਕੰਪਨੀ ਖੋਲ੍ਹੋ (Open Demo Company - Punjab Mandi Trading Co)</span>
          </button>

          {/* Quick Prefill Pill for Demo User */}
          <div className="flex items-center justify-between mb-4 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
            <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              ਡੈਮੋ ਲੌਗਇਨ ਆਈਡੀ (Demo ID):
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail('demo.mandi@punjab.gov.in');
                setErrorMessage(null);
              }}
              className="text-[11px] font-mono font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              title="Click to fill demo email"
            >
              demo.mandi@punjab.gov.in
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'SIGNUP' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ਪੂਰਾ ਨਾਮ (Full Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ਮੋਬਾਈਲ ਨੰਬਰ (Mobile Number)
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                ਸੁਪਾਬੇਸ ਈਮੇਲ (Supabase Email)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo.mandi@punjab.gov.in"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  ਪਾਸਵਰਡ (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'ਲੁਕਾਓ' : 'ਦਿਖਾਓ'}</span>
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ਆਪਣਾ ਪਾਸਵਰਡ ਦਰਜ ਕਰੋ..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <span>ਇਸ ਫੋਨ/ਕੰਪਿਊਟਰ 'ਤੇ ਲੌਗਇਨ ਯਾਦ ਰੱਖੋ (Remember login)</span>
              </label>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="bg-rose-950/80 border border-rose-600 text-rose-200 rounded-xl p-3 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Success Message Box */}
            {successMessage && (
              <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 rounded-xl p-3 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{successMessage}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>ਪ੍ਰਮਾਣਿਤ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ (Authenticating)...</span>
                </>
              ) : mode === 'LOGIN' ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>ਲੌਗਇਨ ਕਰੋ ਅਤੇ ਡਾਟਾ ਅਨਲੌਕ ਕਰੋ (Login & Unlock)</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ (Create Account)</span>
                </>
              )}
            </button>
          </form>

          {/* Cloud Sync Promise */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ਲੌਗਇਨ ਹੋਣ 'ਤੇ ਸਾਰੇ ਫੋਨਾਂ ਦਾ ਲਾਈਵ ਡਾਟਾ ਆਪਣੇ ਆਪ ਸਿੰਕ ਹੋ ਜਾਵੇਗਾ</span>
            </p>
          </div>

          {/* Collapsible Supabase Project Key Settings */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center justify-between w-full font-medium"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3 h-3 text-slate-400" />
                <span>ਸੁਪਾਬੇਸ ਪ੍ਰੋਜੈਕਟ ਕੁੰਜੀ (Supabase Project Key Settings)</span>
              </span>
              {showKeyConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showKeyConfig && (
              <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="text-[10px] text-slate-400">
                  ਪ੍ਰੋਜੈਕਟ URL: <span className="font-mono text-emerald-400">{getSupabaseUrl()}</span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Supabase Publishable / Anon Key:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="Paste Supabase publishable key..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveKey}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition shrink-0"
                    >
                      ਸੇਵ
                    </button>
                  </div>
                  {keySaveNotice && (
                    <p className="text-[11px] text-emerald-400 font-bold mt-1">{keySaveNotice}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-5 text-[11px] text-slate-300">
          ਪੰਜਾਬ ਮੰਡੀ ਸਾਫਟਵੇਅਰ • 100% ਸੁਰੱਖਿਅਤ ਡਾਟਾਬੇਸ ਅਤੇ ਮਲਟੀ-ਫੋਨ ਲਾਈਵ ਸਿੰਕ
        </div>
      </div>
    </div>
  );
};
