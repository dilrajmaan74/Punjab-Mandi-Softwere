import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Building2,
  Check,
  ChevronLeft
} from 'lucide-react';

export const AuthPortalModal: React.FC = () => {
  const {
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    activeOtpInfo,
    sendOtp,
    verifyOtp,
    clearActiveOtp,
    register,
    login,
    resetPassword
  } = useAuth();

  // Form states
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Visibility toggles (The requested Eye icons!)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Flow & Feedback states
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, otpTimer]);

  // Reset local state when mode changes
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpCode('');
    setIsOtpSent(false);
    setIsMobileVerified(false);
    setOtpTimer(60);
    clearActiveOtp();
  }, [authModalMode]);

  // Don't render if closed and authenticated
  if (!isAuthModalOpen && currentUser) return null;

  // Handle Send OTP
  const handleSendOtp = async (purpose: 'REGISTER' | 'RESET_PASSWORD') => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);

    if (cleanMobile.length !== 10) {
      setErrorMessage('ਕਿਰਪਾ ਕਰਕੇ 10 ਅੰਕਾਂ ਦਾ ਸਹੀ ਮੋਬਾਈਲ ਨੰਬਰ ਭਰੋ (Enter 10-digit mobile number)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendOtp(cleanMobile, purpose);
      if (res.success) {
        setIsOtpSent(true);
        setOtpTimer(60);
        setSuccessMessage(`OTP ਭੇਜਿਆ ਗਿਆ! (ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ: ${res.otp})`);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('ਕੋਡ ਭੇਜਣ ਵਿੱਚ ਕੋਈ ਤਕਨੀਕੀ ਸਮੱਸਿਆ ਆਈ ਹੈ। ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = (purpose: 'REGISTER' | 'RESET_PASSWORD') => {
    setErrorMessage(null);
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const cleanOtp = otpCode.trim();

    if (!cleanOtp) {
      setErrorMessage('ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਾਪਤ ਹੋਇਆ OTP ਕੋਡ ਭਰੋ (Enter OTP)');
      return;
    }

    const isValid = verifyOtp(cleanMobile, cleanOtp, purpose);
    if (isValid) {
      setIsMobileVerified(true);
      setSuccessMessage('ਮੋਬਾਈਲ ਨੰਬਰ ਸਫਲਤਾਪੂਰਵਕ ਵੈਰੀਫਾਈ ਹੋ ਗਿਆ ਹੈ! (Verified)');
    } else {
      setErrorMessage('ਗਲਤ ਜਾਂ ਮਿਆਦ ਪੁੱਗ ਚੁੱਕਾ OTP ਕੋਡ! ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਚੈੱਕ ਕਰੋ।');
    }
  };

  // Handle Submit Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isMobileVerified) {
      setErrorMessage('ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਮੋਬਾਈਲ ਨੰਬਰ ' + (isOtpSent ? 'ਦਾ OTP ਵੈਰੀਫਾਈ ਕਰੋ' : 'ਉੱਤੇ OTP ਮੰਗਵਾਓ'));
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਲਾਜ਼ਮੀ ਹੈ');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('ਦੋਵੇਂ ਪਾਸਵਰਡ ਆਪਸ ਵਿੱਚ ਮੇਲ ਨਹੀਂ ਖਾਂਦੇ (Passwords do not match)');
      return;
    }
    if (!termsAgreed) {
      setErrorMessage('ਕਿਰਪਾ ਕਰਕੇ ਨਿਯਮ ਅਤੇ ਸ਼ਰਤਾਂ ਸਵੀਕਾਰ ਕਰੋ');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        fullName,
        mobile,
        password
      });
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('ਖਾਤਾ ਬਣਾਉਣ ਵਿੱਚ ਗਲਤੀ ਹੋਈ।');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Submit Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setIsLoading(true);
    try {
      const res = await login(mobile, password, rememberMe);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('ਲੌਗਇਨ ਵਿੱਚ ਗਲਤੀ ਹੋਈ।');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isMobileVerified) {
      setErrorMessage('ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਮੋਬਾਈਲ OTP ਵੈਰੀਫਾਈ ਕਰੋ');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('ਨਵਾਂ ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਲਾਜ਼ਮੀ ਹੈ');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('ਦੋਵੇਂ ਪਾਸਵਰਡ ਮੇਲ ਨਹੀਂ ਖਾਂਦੇ');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(mobile, password);
      if (res.success) {
        setSuccessMessage(res.message);
        setTimeout(() => {
          setAuthModalMode('LOGIN');
        }, 1500);
      } else {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('ਪਾਸਵਰਡ ਬਦਲਣ ਵਿੱਚ ਗਲਤੀ ਹੋਈ।');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-Click Demo Login
  const handleQuickDemo = async () => {
    setMobile('9814774651');
    setPassword('Password@123');
    setIsLoading(true);
    try {
      const res = await login('9814774651', 'Password@123', true);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Gradient Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-6 text-white text-center relative">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-xs mb-3 ring-1 ring-white/20 shadow-inner">
            <Building2 className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            ਦਾਣਾ ਮੰਡੀ ਆੜ੍ਹਤ ਮੈਨੇਜਰ
          </h2>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            ਪੰਜਾਬ ਆੜ੍ਹਤੀਆ ਪ੍ਰੋਫੈਸ਼ਨਲ ਮਲਟੀ-ਫਰਮ ERP ਸਾਫਟਵੇਅਰ
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex bg-black/25 p-1 rounded-xl mt-4 max-w-xs mx-auto border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setAuthModalMode('LOGIN')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                authModalMode === 'LOGIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              ਲੌਗਇਨ (Sign In)
            </button>
            <button
              type="button"
              onClick={() => setAuthModalMode('REGISTER')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                authModalMode === 'REGISTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              ਨਵਾਂ ਖਾਤਾ (Sign Up)
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Notification / Error / Success Alert */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="font-semibold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="font-semibold leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* OTP Code Live Helper Banner */}
          {activeOtpInfo && isOtpSent && !isMobileVerified && (
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between gap-2 shadow-xs">
              <div className="text-xs text-amber-900">
                <span className="font-bold">ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ (OTP):</span>{' '}
                <span className="font-mono font-black text-sm bg-amber-200/80 px-2 py-0.5 rounded text-amber-950 tracking-wider">
                  {activeOtpInfo.otp}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpCode(activeOtpInfo.otp);
                  handleVerifyOtp(activeOtpInfo.purpose);
                }}
                className="px-2.5 py-1 text-[11px] font-black bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-2xs"
              >
                ਆਟੋ-ਫਿਲ ਕਰੋ (Auto-fill)
              </button>
            </div>
          )}

          {/* -------------------- 1. LOGIN FORM -------------------- */}
          {authModalMode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਰਜਿਸਟਰਡ ਮੋਬਾਈਲ ਨੰਬਰ (Registered Mobile)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    <Phone className="w-4 h-4 mr-1 text-slate-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    required
                    className="w-full pl-16 pr-3 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Password with Eye Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    ਪਾਸਵਰਡ (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('FORGOT_PASSWORD')}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ? (Forgot?)
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                  {/* Eye Toggle Icon */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>ਮੈਨੂੰ ਯਾਦ ਰੱਖੋ (Remember on this PC)</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>ਲੌਗਇਨ ਕਰੋ (Sign In to ERP)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Access Button */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ 1-ਕਲਿੱਕ ਨਾਲ ਡੈਮੋ ਖਾਤੇ ਵਿੱਚ ਦਾਖਲ ਹੋਵੋ (1-Click Demo)</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1">
                  ਡੈਮੋ ਮੋਬਾਈਲ: 9814774651 / ਪਾਸਵਰਡ: Password@123
                </p>
              </div>
            </form>
          )}

          {/* -------------------- 2. SIGN UP (REGISTER) FORM -------------------- */}
          {authModalMode === 'REGISTER' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਆੜ੍ਹਤੀਆ / ਫਰਮ ਮਾਲਕ ਦਾ ਨਾਮ (Full Name) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ਜਿਵੇਂ: ਦਿਲਰਾਜ ਮਾਨ (Dilraj Maan)"
                    required
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Mobile Number with OTP Verification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਮੋਬਾਈਲ ਨੰਬਰ (Mobile Number) *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      disabled={isMobileVerified}
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/\D/g, ''));
                        setIsMobileVerified(false);
                        setIsOtpSent(false);
                      }}
                      placeholder="9876543210"
                      required
                      className={`w-full pl-12 pr-3 py-2 text-sm font-semibold border rounded-xl focus:outline-none transition ${
                        isMobileVerified
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:bg-white'
                      }`}
                    />
                  </div>
                  {!isMobileVerified ? (
                    <button
                      type="button"
                      disabled={isLoading || isOtpSent && otpTimer > 0}
                      onClick={() => handleSendOtp('REGISTER')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shrink-0 transition disabled:opacity-50"
                    >
                      {isOtpSent ? (otpTimer > 0 ? `${otpTimer}s` : 'ਦੁਬਾਰਾ ਭੇਜੋ') : 'ਕੋਡ ਭੇਜੋ (Send OTP)'}
                    </button>
                  ) : (
                    <div className="px-3 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>ਵੈਰੀਫਾਈਡ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Verification Box */}
              {isOtpSent && !isMobileVerified && (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">ਮੋਬਾਈਲ 'ਤੇ ਆਇਆ OTP ਭਰੋ:</span>
                    {otpTimer > 0 && <span className="text-slate-500 font-mono text-[11px]">{otpTimer} ਸੈਕਿੰਡ ਬਾਕੀ</span>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                      placeholder="6 ਅੰਕਾਂ ਦਾ ਕੋਡ"
                      className="flex-1 px-3 py-1.5 text-center text-sm font-mono font-black tracking-widest bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp('REGISTER')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition"
                    >
                      ਵੈਰੀਫਾਈ ਕਰੋ
                    </button>
                  </div>
                </div>
              )}

              {/* Password with Eye Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਪਾਸਵਰਡ (Password - ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰ) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰ"
                    required
                    className="w-full pl-10 pr-10 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                  {/* Eye Toggle Icon */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password with Eye Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਪਾਸਵਰਡ ਦੁਬਾਰਾ ਭਰੋ (Confirm Password) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="ਪਾਸਵਰਡ ਮਿਲਾਓ"
                    required
                    className={`w-full pl-10 pr-10 py-2 text-sm font-semibold rounded-xl focus:outline-none transition ${
                      confirmPassword && password !== confirmPassword
                        ? 'bg-rose-50 border-rose-300 text-rose-900 focus:ring-2 focus:ring-rose-400'
                        : 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:bg-white'
                    }`}
                  />
                  {/* Eye Toggle Icon */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                    title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">
                    ⚠️ ਦੋਵੇਂ ਪਾਸਵਰਡ ਆਪਸ ਵਿੱਚ ਮੇਲ ਨਹੀਂ ਖਾਂਦੇ
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> ਪਾਸਵਰਡ ਮੇਲ ਖਾ ਗਿਆ ਹੈ
                  </p>
                )}
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 select-none pt-1">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  ਮੈਂ ਦਾਣਾ ਮੰਡੀ ਆੜ੍ਹਤ ERP ਸਾਫਟਵੇਅਰ ਦੀਆਂ ਨਿਯਮ ਅਤੇ ਸ਼ਰਤਾਂ ਸਵੀਕਾਰ ਕਰਦਾ ਹਾਂ।
                </span>
              </label>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={isLoading || !isMobileVerified}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>ਖਾਤਾ ਬਣਾਓ ਅਤੇ ਸ਼ੁਰੂ ਕਰੋ (Create Account)</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* -------------------- 3. FORGOT / RESET PASSWORD FORM -------------------- */}
          {authModalMode === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAuthModalMode('LOGIN')}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                  title="ਵਾਪਸ ਲੌਗਇਨ 'ਤੇ ਜਾਓ"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ (Reset Password)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ਆਪਣੇ ਮੋਬਾਈਲ ਨੰਬਰ 'ਤੇ OTP ਮੰਗਵਾ ਕੇ ਨਵਾਂ ਪਾਸਵਰਡ ਸੈੱਟ ਕਰੋ
                  </p>
                </div>
              </div>

              {/* Registered Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਰਜਿਸਟਰਡ ਮੋਬਾਈਲ ਨੰਬਰ (Mobile Number)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      disabled={isMobileVerified}
                      value={mobile}
                      onChange={(e) => {
                        setMobile(e.target.value.replace(/\D/g, ''));
                        setIsMobileVerified(false);
                        setIsOtpSent(false);
                      }}
                      placeholder="9876543210"
                      required
                      className={`w-full pl-12 pr-3 py-2 text-sm font-semibold border rounded-xl focus:outline-none transition ${
                        isMobileVerified
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                          : 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                  </div>
                  {!isMobileVerified ? (
                    <button
                      type="button"
                      disabled={isLoading || isOtpSent && otpTimer > 0}
                      onClick={() => handleSendOtp('RESET_PASSWORD')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shrink-0 transition disabled:opacity-50"
                    >
                      {isOtpSent ? (otpTimer > 0 ? `${otpTimer}s` : 'ਦੁਬਾਰਾ ਭੇਜੋ') : 'OTP ਮੰਗਵਾਓ'}
                    </button>
                  ) : (
                    <div className="px-3 py-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>ਵੈਰੀਫਾਈਡ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OTP Input for Reset */}
              {isOtpSent && !isMobileVerified && (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">ਮੋਬਾਈਲ OTP ਕੋਡ ਭਰੋ:</span>
                    {otpTimer > 0 && <span className="text-slate-500 font-mono text-[11px]">{otpTimer}s</span>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.trim())}
                      placeholder="6 ਅੰਕਾਂ ਦਾ ਕੋਡ"
                      className="flex-1 px-3 py-1.5 text-center text-sm font-mono font-black tracking-widest bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp('RESET_PASSWORD')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition"
                    >
                      ਕੋਡ ਚੈੱਕ ਕਰੋ
                    </button>
                  </div>
                </div>
              )}

              {/* New Password with Eye Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਨਵਾਂ ਪਾਸਵਰਡ (New Password) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰ"
                    required
                    className="w-full pl-10 pr-10 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password with Eye Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਨਵਾਂ ਪਾਸਵਰਡ ਦੁਬਾਰਾ ਭਰੋ (Confirm New Password) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="ਨਵਾਂ ਪਾਸਵਰਡ ਮਿਲਾਓ"
                    required
                    className="w-full pl-10 pr-10 py-2 text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Reset Password Button */}
              <button
                type="submit"
                disabled={isLoading || !isMobileVerified}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>ਨਵਾਂ ਪਾਸਵਰਡ ਅੱਪਡੇਟ ਕਰੋ (Update Password)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info badge */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-ਬਿੱਟ ਐਨਕ੍ਰਿਪਸ਼ਨ ਸੁਰੱਖਿਆ</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">Ver 4.2 Pro</span>
        </div>
      </div>
    </div>
  );
};
