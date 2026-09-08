import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Server,
  UserCheck,
  LogIn,
  LogOut,
  Lock,
  Mail
} from 'lucide-react';
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseAnonKey,
  setSupabaseAnonKeyLocal,
  getSupabaseClient
} from '../../lib/supabase';
import { ensureUserFirmAccess } from '../../services/supabaseService';
import { useMandi } from '../../context/MandiContext';
import schemaSql from '../../lib/supabaseSchema.sql?raw';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    supabaseSyncStatus,
    supabaseSyncError,
    supabaseLastSyncedAt,
    syncWithSupabase,
    migrateDataToSupabase,
    farmers,
    bagsEntries,
    bardanaRecords,
    dailyPurchaseRecords,
    farmerPayments,
    farmerAdvances,
    leftingRecords,
    trucks,
    sellers,
    firms
  } = useMandi();

  const [copiedSql, setCopiedSql] = useState(false);
  const [manualKey, setManualKey] = useState(getSupabaseAnonKey());
  const [keySavedMessage, setKeySavedMessage] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  // Supabase Auth & FIRM-001 Membership states
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [hasFirmAccess, setHasFirmAccess] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isVerifyingAccess, setIsVerifyingAccess] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const client = getSupabaseClient();
    if (!client) {
      setAuthChecking(false);
      return;
    }

    const verifySessionAndAccess = async () => {
      setAuthChecking(true);
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!isMounted) return;
        setAuthUser(user || null);

        if (user) {
          setIsVerifyingAccess(true);
          const res = await ensureUserFirmAccess('FIRM-001');
          if (isMounted) {
            setHasFirmAccess(res.hasAccess);
          }
        } else {
          setHasFirmAccess(false);
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      } finally {
        if (isMounted) {
          setAuthChecking(false);
          setIsVerifyingAccess(false);
        }
      }
    };

    verifySessionAndAccess();

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      const user = session?.user || null;
      setAuthUser(user);
      if (user) {
        setIsVerifyingAccess(true);
        const res = await ensureUserFirmAccess('FIRM-001');
        if (isMounted) {
          setHasFirmAccess(res.hasAccess);
          setIsVerifyingAccess(false);
        }
      } else {
        setHasFirmAccess(false);
        setIsVerifyingAccess(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const configured = isSupabaseConfigured();
  const supabaseUrl = getSupabaseUrl();

  const handleSaveKey = () => {
    setSupabaseAnonKeyLocal(manualKey.trim());
    setKeySavedMessage('ਕੁੰਜੀ ਸੁਰੱਖਿਅਤ ਕੀਤੀ ਗਈ! (Key saved locally)');
    setTimeout(() => {
      setKeySavedMessage('');
      syncWithSupabase();
    }, 1200);
  };

  const handleRefreshAccess = async () => {
    if (!authUser) return;
    setIsVerifyingAccess(true);
    setAuthFeedback(null);
    try {
      const res = await ensureUserFirmAccess('FIRM-001');
      setHasFirmAccess(res.hasAccess);
      if (res.hasAccess) {
        setAuthFeedback({
          type: 'success',
          message: 'Firm Access: Verified (FIRM-001 - Jammu Trading Co ਓਨਰ ਐਕਸੈਸ ਪ੍ਰਮਾਣਿਤ ਹੈ)'
        });
      } else {
        setAuthFeedback({
          type: 'error',
          message: res.error || 'ਐਕਸੈਸ ਪੁਸ਼ਟੀ ਨਹੀਂ ਹੋ ਸਕੀ (Verification failed).'
        });
      }
    } catch (err: any) {
      setAuthFeedback({
        type: 'error',
        message: err.message || 'ਐਕਸੈਸ ਜਾਂਚ ਦੌਰਾਨ ਗਲਤੀ ਆਈ'
      });
    } finally {
      setIsVerifyingAccess(false);
    }
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const client = getSupabaseClient();
    if (!client) return;
    if (!authEmail.trim() || !authPassword) {
      setAuthFeedback({ type: 'error', message: 'ਈਮੇਲ ਅਤੇ ਪਾਸਵਰਡ ਦਰਜ ਕਰੋ (Enter email and password)' });
      return;
    }
    setAuthSubmitting(true);
    setAuthFeedback(null);
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword
      });
      if (error) {
        setAuthFeedback({ type: 'error', message: `ਲੌਗਇਨ ਅਸਫਲ (Login failed): ${error.message}` });
      } else if (data.user) {
        setAuthUser(data.user);
        setIsVerifyingAccess(true);
        // Automatically ensure the logged-in user has owner access to FIRM-001 (Jammu Trading Co).
        // If missing, create the firm_members record securely. Then refresh and show "Firm Access: Verified".
        const access = await ensureUserFirmAccess('FIRM-001');
        setHasFirmAccess(access.hasAccess);
        setIsVerifyingAccess(false);
        setAuthFeedback({
          type: 'success',
          message: access.hasAccess
            ? 'ਲੌਗਇਨ ਸਫਲ ਰਿਹਾ! Firm Access: Verified (FIRM-001 - Jammu Trading Co)'
            : 'ਲੌਗਇਨ ਸਫਲ ਰਿਹਾ ਪਰ ਫਰਮ ਐਕਸੈਸ ਲਿੰਕ ਨਹੀਂ ਹੋ ਸਕੀ।'
        });
      }
    } catch (err: any) {
      setAuthFeedback({ type: 'error', message: err.message || 'ਲੌਗਇਨ ਦੌਰਾਨ ਅਣਪਛਾਤੀ ਗਲਤੀ' });
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    if (!authEmail.trim() || !authPassword) {
      setAuthFeedback({ type: 'error', message: 'ਈਮੇਲ ਅਤੇ ਪਾਸਵਰਡ ਦਰਜ ਕਰੋ (Enter email and password)' });
      return;
    }
    setAuthSubmitting(true);
    setAuthFeedback(null);
    try {
      const { data, error } = await client.auth.signUp({
        email: authEmail.trim(),
        password: authPassword
      });
      if (error) {
        setAuthFeedback({ type: 'error', message: `ਸਾਈਨ ਅੱਪ ਅਸਫਲ: ${error.message}` });
      } else if (data.session && data.user) {
        setAuthUser(data.user);
        setIsVerifyingAccess(true);
        const access = await ensureUserFirmAccess('FIRM-001');
        setHasFirmAccess(access.hasAccess);
        setIsVerifyingAccess(false);
        setAuthFeedback({
          type: 'success',
          message: access.hasAccess
            ? 'ਨਵਾਂ ਖਾਤਾ ਬਣ ਗਿਆ! Firm Access: Verified (FIRM-001 - Jammu Trading Co)'
            : 'ਨਵਾਂ ਖਾਤਾ ਬਣ ਗਿਆ।'
        });
      } else {
        setAuthFeedback({
          type: 'success',
          message: 'ਖਾਤਾ ਬਣਾਉਣ ਦੀ ਬੇਨਤੀ ਭੇਜੀ ਗਈ। ਕਿਰਪਾ ਕਰਕੇ ਈਮੇਲ ਜਾਂ Supabase Dashboard ਵਿੱਚ ਪੁਸ਼ਟੀ ਕਰੋ।'
        });
      }
    } catch (err: any) {
      setAuthFeedback({ type: 'error', message: err.message || 'ਸਾਈਨ ਅੱਪ ਦੌਰਾਨ ਗਲਤੀ' });
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    setAuthUser(null);
    setHasFirmAccess(false);
    setAuthFeedback(null);
  };

  const handleMigrate = async () => {
    if (!authUser) {
      setMigrationResult(
        'ਸੁਪਾਬੇਸ ਲੌਗਇਨ ਲੋੜੀਂਦਾ ਹੈ (Supabase Auth login is strictly required before migrating data). ਕਿਰਪਾ ਕਰਕੇ ਉੱਪਰ ਦਿੱਤੇ ਫਾਰਮ ਰਾਹੀਂ ਪਹਿਲਾਂ ਲੌਗਇਨ ਕਰੋ।'
      );
      return;
    }
    if (!hasFirmAccess) {
      setIsMigrating(true);
      const access = await ensureUserFirmAccess('FIRM-001');
      setIsMigrating(false);
      if (!access.hasAccess) {
        setMigrationResult(
          `ਫਰਮ ਐਕਸੈਸ ਪੁਸ਼ਟੀ ਅਸਫਲ: ${access.error || 'FIRM-001 membership could not be verified.'}`
        );
        return;
      }
      setHasFirmAccess(true);
    }

    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await migrateDataToSupabase();
      if (res.success) {
        setMigrationResult(
          `ਸਫਲਤਾਪੂਰਵਕ ਮਾਈਗ੍ਰੇਟ ਹੋਇਆ! Farmers: ${res.stats.farmers}, Bags: ${res.stats.bagsEntries}, Purchases: ${res.stats.dailyPurchaseRecords}, Dispatches: ${res.stats.leftingRecords}`
        );
      } else {
        setMigrationResult(`ਗਲਤੀ: ${res.error || 'ਮਾਈਗ੍ਰੇਸ਼ਨ ਅਸਫਲ ਰਹੀ'}`);
      }
    } catch (err: any) {
      setMigrationResult(`ਗਲਤੀ: ${err.message || 'ਅਣਪਛਾਤੀ ਗਲਤੀ'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      alert('Could not copy automatically. Please view /src/lib/supabaseSchema.sql');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Supabase PostgreSQL Cloud Database</h2>
              <p className="text-xs text-emerald-200">
                ਸੁਪਾਬੇਸ ਕਲਾਊਡ ਡਾਟਾਬੇਸ ਕੁਨੈਕਸ਼ਨ ਅਤੇ ਲਾਈਵ ਸਿੰਕ ਸਥਿਤੀ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Connection Status Card */}
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
              configured && supabaseSyncStatus === 'connected'
                ? 'bg-emerald-50/80 border-emerald-200'
                : configured && supabaseSyncStatus === 'error'
                ? 'bg-amber-50/80 border-amber-200'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {configured && supabaseSyncStatus === 'connected' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : configured && supabaseSyncStatus === 'error' ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Server className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">
                    {configured && supabaseSyncStatus === 'connected'
                      ? 'Supabase ਕਲਾਊਡ ਨਾਲ ਜੁੜਿਆ ਹੋਇਆ ਹੈ (Connected)'
                      : configured && supabaseSyncStatus === 'error'
                      ? 'ਕੁਨੈਕਸ਼ਨ ਗਲਤੀ (Tables or Key check required)'
                      : 'ਸੁਪਾਬੇਸ ਕੁੰਜੀ ਲੋੜੀਂਦੀ ਹੈ (Anon Key Required)'}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      supabaseSyncStatus === 'connected'
                        ? 'bg-emerald-100 text-emerald-800'
                        : supabaseSyncStatus === 'syncing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {supabaseSyncStatus.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Project URL:</strong>{' '}
                  <span className="font-mono text-slate-700">{supabaseUrl}</span>
                </p>
                {supabaseLastSyncedAt && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ਆਖਰੀ ਸਿੰਕ: {new Date(supabaseLastSyncedAt).toLocaleTimeString()}
                  </p>
                )}
                {supabaseSyncError && (
                  <p className="text-xs text-amber-700 bg-amber-100/70 p-2 rounded-lg mt-2 font-mono">
                    {supabaseSyncError}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={syncWithSupabase}
              disabled={supabaseSyncStatus === 'syncing'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs shrink-0 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${supabaseSyncStatus === 'syncing' ? 'animate-spin' : ''}`}
              />
              ਹੁਣੇ ਸਿੰਕ ਕਰੋ
            </button>
          </div>

          {/* Key Configuration */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Supabase Publishable / Anon Key (sb_publishable_... / eyJ...)
              </label>
              <a
                href="https://supabase.com/dashboard/project/bktiuuxunjadogposalb/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
              >
                Get API Keys <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="Paste your Supabase publishable key here..."
                className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-medium hover:bg-emerald-800 transition-colors shrink-0"
              >
                ਸੁਰੱਖਿਅਤ ਕਰੋ
              </button>
            </div>
            {keySavedMessage && (
              <p className="text-xs text-emerald-700 mt-1.5 font-medium">{keySavedMessage}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              * Frontend consumes only the publishable key for secure client requests with Row-Level Security (RLS).
            </p>
          </div>

          {/* Supabase Auth & Firm Membership Security Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-900">
                  Supabase Authentication & Firm Membership (ਲੌਗਇਨ ਤੇ ਫਰਮ ਐਕਸੈਸ)
                </span>
              </div>
              {authUser && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <UserCheck className="w-3 h-3" />
                  ਪ੍ਰਮਾਣਿਤ ਯੂਜ਼ਰ (Authenticated)
                </span>
              )}
            </div>

            {authChecking ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ਸੁਪਾਬੇਸ ਆਥ ਸੈਸ਼ਨ ਅਤੇ FIRM-001 ਐਕਸੈਸ ਜਾਂਚੀ ਜਾ ਰਹੀ ਹੈ...
              </div>
            ) : authUser ? (
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-700">
                    <span className="text-slate-500">ਲੌਗਇਨ ਈਮੇਲ:</span>{' '}
                    <strong className="font-mono text-slate-900">{authUser.email || authUser.id}</strong>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> ਲਾਗ ਆਉਟ (Sign Out)
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500">ਫਰਮ ਮੈਂਬਰਸ਼ਿਪ:</span>
                    <span className="font-semibold text-slate-800">FIRM-001 (Jammu Trading Co)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      id="firm-access-verified-badge"
                      className={`text-[11px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 border ${
                        hasFirmAccess
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isVerifyingAccess
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {hasFirmAccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Firm Access: Verified
                        </>
                      ) : isVerifyingAccess ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                          ਪੜਤਾਲ ਹੋ ਰਹੀ ਹੈ...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          ਮੈਂਬਰਸ਼ਿਪ ਲਿੰਕ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      id="btn-refresh-firm-access"
                      onClick={handleRefreshAccess}
                      disabled={isVerifyingAccess}
                      title="ਫਰਮ ਐਕਸੈਸ ਰਿਫ੍ਰੈਸ਼ ਕਰੋ (Refresh Firm Access)"
                      className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isVerifyingAccess ? 'animate-spin text-emerald-600' : ''}`} />
                      ਰਿਫ੍ਰੈਸ਼
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                <p className="text-xs text-slate-600">
                  ਸੁਰੱਖਿਅਤ RLS ਪਾਲਿਸੀਆਂ ਕਾਰਨ ਡਾਟਾ ਮਾਈਗ੍ਰੇਸ਼ਨ ਲਈ ਸੁਪਾਬੇਸ ਲੌਗਇਨ ਲਾਜ਼ਮੀ ਹੈ। ਲੌਗਇਨ ਉਪਰੰਤ ਯੂਜ਼ਰ ਆਟੋਮੈਟਿਕਲੀ <strong>FIRM-001 (Jammu Trading Co)</strong> ਨਾਲ ਓਨਰ ਵਜੋਂ ਲਿੰਕ ਹੋ ਜਾਵੇਗਾ।
                </p>
                <form onSubmit={handleSignIn} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="Supabase Email"
                        className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Supabase Password"
                        className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      {authSubmitting ? 'ਪੜਤਾਲ ਹੋ ਰਹੀ ਹੈ...' : 'ਲੌਗਇਨ ਕਰੋ (Sign In)'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSignUp}
                      disabled={authSubmitting}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      ਨਵਾਂ ਖਾਤਾ (Sign Up)
                    </button>
                  </div>
                </form>
              </div>
            )}

            {authFeedback && (
              <p
                className={`text-xs p-2 rounded-lg ${
                  authFeedback.type === 'success'
                    ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100/70 text-rose-800 border border-rose-200'
                }`}
              >
                {authFeedback.message}
              </p>
            )}
          </div>

          {/* Local State vs Cloud Migration */}
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  ਮੌਜੂਦਾ ਡਾਟਾ ਸਥਿਤੀ (Current Application Data)
                </h3>
                <p className="text-xs text-slate-500">
                  ਕੁੱਲ 17 ਕੈਟਾਗਰੀਆਂ ਨੂੰ ਸੁਪਾਬੇਸ ਵਿੱਚ ਪ੍ਰਾਇਮਰੀ ਡਾਟਾਬੇਸ ਵਜੋਂ ਸੁਰੱਖਿਅਤ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ।
                </p>
              </div>
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs disabled:opacity-50"
              >
                <UploadCloud className={`w-4 h-4 ${isMigrating ? 'animate-bounce' : ''}`} />
                {isMigrating ? 'ਮਾਈਗ੍ਰੇਟ ਹੋ ਰਿਹਾ ਹੈ...' : 'ਸੁਪਾਬੇਸ ਵਿੱਚ ਮਾਈਗ੍ਰੇਟ ਕਰੋ (Migrate to Supabase)'}
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">{farmers.length}</span>
                <span className="text-[11px] text-slate-500">ਕਿਸਾਨ (Farmers)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">{bagsEntries.length}</span>
                <span className="text-[11px] text-slate-500">ਆਮਦ ਐਂਟਰੀਆਂ (Bags)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">
                  {dailyPurchaseRecords.length}
                </span>
                <span className="text-[11px] text-slate-500">ਖਰੀਦ (Purchases)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">{leftingRecords.length}</span>
                <span className="text-[11px] text-slate-500">ਲਿਫਟਿੰਗ (Dispatches)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">{farmerPayments.length}</span>
                <span className="text-[11px] text-slate-500">ਭੁਗਤਾਨ (Payments)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">{farmerAdvances.length}</span>
                <span className="text-[11px] text-slate-500">ਐਡਵਾਂਸ (Advances)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">{bardanaRecords.length}</span>
                <span className="text-[11px] text-slate-500">ਬਾਰਦਾਨਾ (Bardana)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-base font-bold text-slate-900">{trucks.length}</span>
                <span className="text-[11px] text-slate-500">ਟਰੱਕ ਮਾਸਟਰ (Trucks)</span>
              </div>
            </div>

            {migrationResult && (
              <div
                className={`mt-3 p-3 rounded-lg text-xs font-medium ${
                  migrationResult.startsWith('ਸਫਲਤਾਪੂਰਵਕ')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {migrationResult}
              </div>
            )}
          </div>

          {/* SQL Setup Helper */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-4 text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-emerald-400" />
                Supabase SQL Schema (17 Tables + RLS Policies)
              </span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> ਕਾਪੀ ਹੋ ਗਿਆ (Copied!)
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> SQL ਕਾਪੀ ਕਰੋ (Copy SQL)
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-400 text-[11px] mb-2 font-sans">
              ਜੇਕਰ ਤੁਹਾਡੇ ਸੁਪਾਬੇਸ ਪ੍ਰੋਜੈਕਟ ਵਿੱਚ ਟੇਬਲ ਅਜੇ ਨਹੀਂ ਬਣੇ ਹਨ, ਤਾਂ Supabase Dashboard ਦੇ{' '}
              <a
                href="https://supabase.com/dashboard/project/bktiuuxunjadogposalb/sql"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 underline"
              >
                SQL Editor
              </a>{' '}
              ਵਿੱਚ ਜਾ ਕੇ ਉਪਰੋਕਤ SQL ਚਲਾਓ।
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            LocalStorage is kept as an offline safety backup and is not overwritten.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
