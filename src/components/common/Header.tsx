import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
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
  FileSpreadsheet
} from 'lucide-react';
import { FirmManagerModal } from '../firm/FirmManagerModal';
import { SellerMasterModal } from '../seller/SellerMasterModal';
import { SupabaseSyncModal } from '../supabase/SupabaseSyncModal';
import { GoogleSheetsSyncModal } from '../farmer/GoogleSheetsSyncModal';

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
    isSupabaseConfigured
  } = useMandi();

  const [isFirmModalOpen, setIsFirmModalOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

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
                className="px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 flex items-center gap-1"
                title="Manage Firms & Years"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{activeFiscalYear}</span>
              </button>
            </div>
          </div>

          {/* Quick Selectors & Metrics */}
          <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 flex-wrap">
            {/* Firm Selector */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={activeFirmId}
                onChange={(e) => setActiveFirmId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-1"
                title="Active Firm"
              >
                {firms.map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                    {f.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsFirmModalOpen(true)}
                className="p-1 text-slate-400 hover:text-white rounded transition"
                title="Add / Edit Firms"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fiscal Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
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
            </div>

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
              title="Google Sheets & Excel Import/Export"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-teal-600/70 bg-teal-950/80 hover:bg-teal-900 text-teal-300 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'en' ? 'Google Sheets' : 'ਗੂਗਲ ਸ਼ੀਟਸ'}</span>
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
          </div>
        </div>
      </header>

      {/* Firm and Fiscal Year Management Modal */}
      <FirmManagerModal
        isOpen={isFirmModalOpen}
        onClose={() => setIsFirmModalOpen(false)}
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
    </>
  );
};
