import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useAuth } from '../../context/AuthContext';
import {
  Wheat,
  Globe,
  Building2,
  Users,
  Package,
  Calendar,
  ChevronDown,
  Settings2,
  Building,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  UserCheck,
  LogOut,
  ShieldCheck,
  Moon,
  Sparkles,
  Scale,
  ArrowRightLeft
} from 'lucide-react';
import { FirmManagerModal } from '../firm/FirmManagerModal';
import { FiscalYearManagerModal } from '../firm/FiscalYearManagerModal';
import { SellerMasterModal } from '../seller/SellerMasterModal';
import { SupabaseSyncModal } from '../supabase/SupabaseSyncModal';
import { GoogleSheetsSyncModal } from '../farmer/GoogleSheetsSyncModal';
import { AiMunimSummaryModal } from '../reports/AiMunimSummaryModal';
import { useGoogleSheetsSync } from '../../context/GoogleSheetsSyncContext';
import { TopQuickNavigationBar } from './TopQuickNavigationBar';
import { CropSwitcher } from './CropSwitcher';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    farmers,
    bagsEntries,
    settings,
    firms,
    activeFirmId,
    activeFirm,
    setActiveFirmId,
    fiscalYears,
    activeFiscalYear,
    setActiveFiscalYear,
    supabaseSyncStatus,
    isSupabaseSyncModalOpen,
    setIsSupabaseSyncModalOpen,
    isSupabaseConfigured,
    appMode,
    setAppMode,
    setActiveSection
  } = useMandi();
  const { syncStatus: sheetsSyncStatus, lastSyncTime, conflicts } = useGoogleSheetsSync();
  const { currentUser, logout, setIsAuthModalOpen, setAuthModalMode } = useAuth();

  const [isFirmModalOpen, setIsFirmModalOpen] = useState(false);
  const [isFiscalYearModalOpen, setIsFiscalYearModalOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isAiMunimModalOpen, setIsAiMunimModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const totalBags = bagsEntries.reduce((sum, b) => sum + (b.bags || 0), 0);

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Brand Logo & Firm Info */}
          <div className="flex items-center justify-between md:justify-start gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
                <Wheat className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                    {activeFirm ? activeFirm.name : settings.firmNameEn || 'Jammu Trading Co'}
                  </h1>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-md">
                    Lic: {activeFirm?.licenceNo || settings.firmLicence || 'JAL/LKH/133'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <span className="text-amber-400 font-semibold">{settings.mandiNameEn}</span>
                  <span className="text-slate-600">•</span>
                  <span>{settings.marketCommitteeEn}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-mono text-slate-300">Mob: {activeFirm?.mobile || settings.firmMobile || '98147-74651'}</span>
                </div>
              </div>
            </div>

            {/* Mobile Firm Switch Button */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFirmModalOpen(true)}
                className="px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 flex items-center gap-1 max-w-[130px] truncate"
                title="Manage Firms & Years"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{activeFirm.name || activeFiscalYear}</span>
              </button>
            </div>
          </div>

          {/* Quick Selectors & Metrics */}
          <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 flex-wrap">
            {/* Dual Software Switcher (ਕੱਚਾ ਮੰਡੀ ਸਿਸਟਮ vs ਪੱਕਾ ਅਕਾਊਂਟਿੰਗ ਸਿਸਟਮ) */}
            <div className="flex items-center p-0.5 bg-slate-950/80 rounded-xl border border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setAppMode('KACHA');
                  setActiveSection('dashboard');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  appMode === 'KACHA'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="ਕੱਚਾ ਮੰਡੀ ਕੰਮ (Mandi Operations, Farmers, Bags, Boli, Purchase)"
              >
                <Wheat className="w-3.5 h-3.5 text-amber-300" />
                <span>ਕੱਚਾ ਮੰਡੀ ਕੰਮ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAppMode('PAKKA');
                  setActiveSection('pakka-dashboard');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  appMode === 'PAKKA'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="ਪੱਕਾ ਅਕਾਊਂਟਿੰਗ ਸਿਸਟਮ (I-Form, J-Form, Ledgers, Balance Sheet, TDS)"
              >
                <Scale className="w-3.5 h-3.5 text-amber-300" />
                <span>ਪੱਕਾ ਅਕਾਊਂਟਿੰਗ (I/J-Form)</span>
              </button>
            </div>

            {/* Firm Selector */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-700 shadow-2xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active Firm (Isolated Data)" />
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={activeFirmId}
                onChange={(e) => setActiveFirmId(e.target.value)}
                className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer pr-1 max-w-[180px] truncate"
                title="Active Firm (Strictly Isolated Data)"
              >
                {firms.map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                    {f.name} {f.namePa ? `(${f.namePa})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsFirmModalOpen(true)}
                className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                title="ਫਰਮਾਂ ਦਾ ਪ੍ਰਬੰਧਨ (Manage Firms)"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fiscal Year Selector & Master Manager */}
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={activeFiscalYear}
                onChange={(e) => setActiveFiscalYear(e.target.value)}
                className="bg-transparent text-xs font-black font-mono text-white focus:outline-none cursor-pointer pr-1"
                title="Active Fiscal Year"
              >
                {fiscalYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    {yr}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsFiscalYearModalOpen(true)}
                className="p-1 text-slate-400 hover:text-emerald-400 rounded transition cursor-pointer"
                title="ਵਿੱਤੀ ਸਾਲ ਪ੍ਰਬੰਧਨ, ਨਵਾਂ ਸਾਲ, ਰੋਲ-ਓਵਰ ਅਤੇ ਲਾਕ (FY Master & Roll Over)"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Active Crop Switcher (Wheat / Maize / Paddy) */}
            <CropSwitcher />

            {/* Seller Master Button */}
            <button
              type="button"
              onClick={() => setIsSellerModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-bold transition"
            >
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'en' ? 'Sellers Master' : 'ਸੈਲਰ ਮਾਸਟਰ (Sellers)'}</span>
            </button>

            {/* Supabase Cloud DB Status & Control Button */}
            <button
              type="button"
              onClick={() => setIsSupabaseSyncModalOpen(true)}
              title="Supabase PostgreSQL Cloud Database & Migration"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                supabaseSyncStatus === 'connected'
                  ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-600/60 text-emerald-300'
                  : supabaseSyncStatus === 'syncing'
                  ? 'bg-blue-950/80 hover:bg-blue-900 border-blue-600/60 text-blue-300 animate-pulse'
                  : supabaseSyncStatus === 'error'
                  ? 'bg-rose-950/80 hover:bg-rose-900 border-rose-600/60 text-rose-300'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Supabase</span>
              {supabaseSyncStatus === 'connected' && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {language === 'en' ? 'Cloud' : 'ਕਲਾਊਡ'}
                </span>
              )}
              {supabaseSyncStatus === 'syncing' && (
                <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              )}
              {supabaseSyncStatus === 'error' && (
                <AlertCircle className="w-3 h-3 text-rose-400" />
              )}
            </button>

            {/* Google Sheets & Drive Sync Button */}
            <button
              type="button"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              title={
                sheetsSyncStatus === 'connected'
                  ? `Google Sheets Connected. Last Sync: ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Recent'}`
                  : 'Google Sheets Two-Way Backup & Sync'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer ${
                conflicts.length > 0
                  ? 'bg-amber-950/90 border-amber-500/80 text-amber-300 hover:bg-amber-900 animate-pulse'
                  : sheetsSyncStatus === 'connected'
                  ? 'border-emerald-500/70 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300'
                  : sheetsSyncStatus === 'syncing'
                  ? 'border-blue-500/70 bg-blue-950/80 hover:bg-blue-900 text-blue-300 animate-pulse'
                  : sheetsSyncStatus === 'error'
                  ? 'border-rose-500/70 bg-rose-950/80 hover:bg-rose-900 text-rose-300'
                  : 'border-teal-600/70 bg-teal-950/80 hover:bg-teal-900 text-teal-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'en' ? 'Google Sheets' : 'ਗੂਗਲ ਸ਼ੀਟਸ'}</span>
              {sheetsSyncStatus === 'connected' && conflicts.length === 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                </span>
              )}
              {sheetsSyncStatus === 'syncing' && (
                <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              )}
              {conflicts.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[10px] rounded-full font-black">
                  {conflicts.length}
                </span>
              )}
            </button>

            {/* Daily AI Munim Evening Summary (Feature 6) */}
            <button
              type="button"
              onClick={() => setIsAiMunimModalOpen(true)}
              title="Daily Evening AI Munim Intelligence Summary (Gemini 3.8 Flash)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-xs cursor-pointer bg-gradient-to-r from-amber-950/80 via-indigo-950/80 to-slate-900 border-amber-500/60 text-amber-300 hover:border-amber-400 hover:text-white"
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">AI ਰੋਜ਼ਨਾਮਚਾ</span>
              <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md">
                PRO AI
              </span>
            </button>

            {/* Quick Metrics */}
            <div className="hidden xl:flex items-center gap-2 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/60 text-xs">
              <div className="flex items-center gap-1 text-slate-300">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'en' ? 'Farmers' : 'ਕਿਸਾਨ'}: <strong className="text-white font-mono">{farmers.length}</strong></span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1 text-slate-300">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'en' ? 'Bags' : 'ਬੋਰੀਆਂ'}: <strong className="text-white font-mono">{totalBags}</strong></span>
              </div>
            </div>

            {/* Language Switch */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setLanguage('pa')}
                className={`px-2 py-0.5 rounded-md transition ${
                  language === 'pa'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ਪੰਜਾਬੀ
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-md transition ${
                  language === 'en'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* User Account / Profile Menu */}
            <div className="relative">
              {currentUser ? (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded-xl transition text-xs font-bold text-white shadow-xs cursor-pointer"
                    title="User Profile & Settings"
                  >
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                      {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="hidden md:inline max-w-[110px] truncate text-slate-200">
                      {currentUser.fullName.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Profile Dropdown */}
                  {isProfileMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 text-xs space-y-3"
                      onMouseLeave={() => setIsProfileMenuOpen(false)}
                    >
                      <div className="flex items-center gap-3 pb-2.5 border-b border-slate-800">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-sm">
                          {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-black text-white text-sm truncate">
                            {currentUser.fullName}
                          </h4>
                          <p className="text-[11px] font-mono text-emerald-400">
                            +91 {currentUser.mobile}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/80 mt-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" /> ਵੈਰੀਫਾਈਡ ਮਾਲਕ
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-300">
                        <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-800/60 text-[11px]">
                          <span>ਕੁੱਲ ਫਰਮਾਂ (Firms):</span>
                          <strong className="text-white font-mono">{firms.length}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsFirmModalOpen(true);
                          }}
                          className="w-full text-left py-1.5 px-2 hover:bg-slate-800 rounded-lg text-emerald-400 font-bold transition flex items-center justify-between"
                        >
                          <span>ਫਰਮਾਂ ਦਾ ਪ੍ਰਬੰਧਨ (Manage Firms)</span>
                          <Building2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            logout();
                          }}
                          className="w-full py-2 px-3 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>ਲੌਗ ਆਉਟ (Logout Account)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('LOGIN');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>ਲੌਗਇਨ</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Universal Direct Quick-Jump Navigation Bar */}
        <TopQuickNavigationBar />
      </header>

      {/* Firm Management Modal */}
      <FirmManagerModal
        isOpen={isFirmModalOpen}
        onClose={() => setIsFirmModalOpen(false)}
      />

      {/* Dedicated Fiscal Year Accounting & Roll-Over Master Modal */}
      <FiscalYearManagerModal
        isOpen={isFiscalYearModalOpen}
        onClose={() => setIsFiscalYearModalOpen(false)}
      />

      {/* Seller Master Modal */}
      <SellerMasterModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
      />

      {/* Supabase PostgreSQL Cloud Sync & Migration Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseSyncModalOpen}
        onClose={() => setIsSupabaseSyncModalOpen(false)}
      />

      {/* Google Sheets & Drive Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />

      {/* Daily AI Munim Evening Summary Modal */}
      <AiMunimSummaryModal
        isOpen={isAiMunimModalOpen}
        onClose={() => setIsAiMunimModalOpen(false)}
      />
    </>
  );
};
