import React, { useState, useRef } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { useGoogleSheetsSync } from '../../context/GoogleSheetsSyncContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  Check,
  ShieldCheck,
  KeyRound,
  Database,
  CloudUpload,
  ArrowRight,
  Info,
  X,
  AlertTriangle,
  FileText,
  Users,
  CheckCheck,
  RotateCcw,
  Clock,
  Layers,
  Sparkles,
  SlidersHorizontal,
  FileDown,
  Activity,
  UserCheck
} from 'lucide-react';
import {
  exportFarmersToExcelFile,
  exportFarmersToCsvFile,
  downloadFarmerImportTemplate,
  parseExcelOrCsvFile,
  matchDuplicateFarmer,
  CandidateFarmer,
  DuplicateFarmerMatch
} from '../../utils/excelExportImport';
import { downloadTableTemplate, TABLE_METADATA } from '../../services/googleSheetsTwoWaySync';
import { SyncTableType, TableImportSummary } from '../../types/sheetsSync';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'two_way_sync' | 'conflicts' | 'import_review' | 'excel_files' | 'audit_log';

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({ isOpen, onClose }) => {
  const { farmers, activeFirm, language, registerFarmer, updateFarmer, generateNextFarmerId } = useMandi();
  const { notifySaveSuccess, notifyError } = useNotification();
  const {
    currentUser,
    accessToken,
    isAuthenticating,
    signInWithGoogle,
    signOutGoogle,
    setManualAccessToken,
    spreadsheetId,
    spreadsheetUrl,
    connectSpreadsheet,
    createNewSpreadsheetForFirm,
    disconnectSpreadsheet,
    syncStatus,
    lastSyncTime,
    autoSyncEnabled,
    toggleAutoSync,
    syncNow,
    backupToGoogleSheets,
    importFromGoogleSheets,
    conflicts,
    resolveConflict,
    auditLogs,
    tableStats,
    latestImportResult,
    clearImportResult
  } = useGoogleSheetsSync();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ModalTab>('two_way_sync');

  // Input states
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState('');
  const [isEditingSheetId, setIsEditingSheetId] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showManualToken, setShowManualToken] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // File import ref for Excel/CSV offline
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedDuplicates, setStagedDuplicates] = useState<DuplicateFarmerMatch[]>([]);
  const [stagedCleanCandidates, setStagedCleanCandidates] = useState<CandidateFarmer[]>([]);
  const [stagedErrors, setStagedErrors] = useState<{ row: number; error: string; rawData: any }[]>([]);

  if (!isOpen) return null;

  const isEn = language === 'en';

  const handleCopyLink = () => {
    if (spreadsheetUrl) {
      navigator.clipboard.writeText(spreadsheetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleConnectSheetIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSpreadsheetId.trim()) return;
    setIsBusy(true);
    try {
      await connectSpreadsheet(inputSpreadsheetId.trim());
      setIsEditingSheetId(false);
      setInputSpreadsheetId('');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    setIsBusy(true);
    try {
      await createNewSpreadsheetForFirm();
    } finally {
      setIsBusy(false);
    }
  };

  const handleApplyManualToken = () => {
    if (!manualTokenInput.trim()) return;
    setManualAccessToken(manualTokenInput.trim());
    setManualTokenInput('');
    setShowManualToken(false);
  };

  const handleRunSyncNow = async () => {
    setIsBusy(true);
    try {
      await syncNow();
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunBackup = async () => {
    setIsBusy(true);
    try {
      await backupToGoogleSheets();
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunImport = async () => {
    setIsBusy(true);
    try {
      const res = await importFromGoogleSheets();
      if (res && (res.conflicts.length > 0 || res.tableSummaries.farmers.errors > 0 || res.generatedFarmerIds.length > 0)) {
        setActiveTab('import_review');
      }
    } finally {
      setIsBusy(false);
    }
  };

  // Offline Excel export
  const handleExportExcelOffline = () => {
    const firmName = (activeFirm?.name || 'Punjab_Mandi').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    exportFarmersToExcelFile(
      farmers,
      `${firmName}_Farmers_Register_${dateStr}.xlsx`,
      activeFirm?.name || 'Punjab Mandi'
    );
  };

  // Offline CSV export
  const handleExportCsvOffline = () => {
    const firmName = (activeFirm?.name || 'Punjab_Mandi').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    exportFarmersToCsvFile(farmers, `${firmName}_Farmers_Register_${dateStr}.csv`);
  };

  // Offline Template download
  const handleDownloadOfflineFarmerTemplate = () => {
    downloadFarmerImportTemplate('Punjab_Mandi_Farmer_Import_Template.xlsx');
  };

  // Offline File Upload (Excel/CSV)
  const handleOfflineFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBusy(true);
    try {
      const { candidates, errors } = await parseExcelOrCsvFile(file);
      const duplicateMatches: DuplicateFarmerMatch[] = [];
      const validNonDuplicates: CandidateFarmer[] = [];

      candidates.forEach((cand) => {
        const match = matchDuplicateFarmer(cand, farmers);
        if (match.isDuplicate && match.existingFarmer && match.matchedBy) {
          duplicateMatches.push({
            candidate: cand,
            existingFarmer: match.existingFarmer,
            matchedBy: match.matchedBy,
            resolution: 'REVIEW'
          });
        } else {
          validNonDuplicates.push(cand);
        }
      });

      setStagedCleanCandidates(validNonDuplicates);
      setStagedDuplicates(duplicateMatches);
      setStagedErrors(errors);

      if (duplicateMatches.length === 0) {
        // Commit immediately
        validNonDuplicates.forEach((cand) => {
          const nextId = generateNextFarmerId();
          registerFarmer({
            id: cand.data.id || nextId,
            farmerName: cand.data.farmerName || 'New Farmer',
            farmerNamePa: cand.data.farmerNamePa || cand.data.farmerName || 'ਨਵਾਂ ਕਿਸਾਨ',
            fatherName: cand.data.fatherName || '',
            fatherNamePa: cand.data.fatherNamePa || cand.data.fatherName || '',
            village: cand.data.village || 'Kang Khurd',
            villagePa: cand.data.villagePa || cand.data.village || 'ਕੰਗ ਖੁਰਦ',
            address: cand.data.address,
            pinCode: cand.data.pinCode || '144629',
            mobile: cand.data.mobile || '',
            aadhaar: cand.data.aadhaar || '',
            firmId: activeFirm?.id || 'FIRM-001'
          });
        });
        notifySaveSuccess({
          titleEn: 'File Imported',
          titlePa: 'ਫਾਈਲ ਇੰਪੋਰਟ ਹੋ ਗਈ',
          messageEn: `Imported ${validNonDuplicates.length} farmers from ${file.name}`
        });
      }
    } catch (err: any) {
      notifyError({
        titleEn: 'Import Error',
        titlePa: 'ਇੰਪੋਰਟ ਗਲਤੀ',
        messageEn: err.message
      });
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {isEn ? 'Google Sheets Two-Way Backup & Sync' : 'ਗੂਗਲ ਸ਼ੀਟਸ ਦੋ-ਤਰਫਾ ਬੈਕਅੱਪ ਤੇ ਸਿੰਕ'}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-800/80 text-emerald-200 rounded-full border border-emerald-600/50">
                  {activeFirm?.name || 'Firm Backup'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                {isEn
                  ? 'Table-wise automatic cloud backup & controlled two-way data-entry bridge'
                  : 'ਸਾਰੇ ਟੇਬਲਾਂ ਦਾ ਆਟੋਮੈਟਿਕ ਬੈਕਅੱਪ ਅਤੇ ਗੂਗਲ ਸ਼ੀਟਸ ਨਾਲ ਸੁਰੱਖਿਅਤ ਦੋ-ਤਰਫਾ ਡਾਟਾ ਸਿੰਕ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs font-bold">
          <div className="flex gap-1 py-1.5">
            <button
              onClick={() => setActiveTab('two_way_sync')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'two_way_sync'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isEn ? 'Two-Way Sync (9 Tables)' : 'ਦੋ-ਤਰਫਾ ਸਿੰਕ (9 ਟੇਬਲ)'}</span>
            </button>

            <button
              onClick={() => setActiveTab('conflicts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer relative ${
                activeTab === 'conflicts'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isEn ? 'Conflicts' : 'ਵਿਰੋਧ ਹੱਲ'}</span>
              {conflicts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]">
                  {conflicts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('import_review')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'import_review'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isEn ? 'Import Report' : 'ਇੰਪੋਰਟ ਰਿਪੋਰਟ'}</span>
              {latestImportResult && (
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('excel_files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'excel_files'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Offline Excel / CSV' : 'ਆਫਲਾਈਨ ਐਕਸਲ / CSV'}</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_log')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'audit_log'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isEn ? 'Audit Trail Log' : 'ਆਡਿਟ ਲੌਗ'}</span>
            </button>
          </div>

          {/* Conflict Alert Counter */}
          {conflicts.length > 0 && (
            <button
              onClick={() => setActiveTab('conflicts')}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold animate-pulse cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>{conflicts.length} {isEn ? 'Conflict(s) Detected' : 'ਵਿਰੋਧ ਮਿਲੇ'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50">
          {/* Top Google Account & Spreadsheet Connection Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Account Status */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                {accessToken ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <KeyRound className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {accessToken
                      ? currentUser?.email || 'Google Account Connected'
                      : isEn
                      ? 'Google Account Not Connected'
                      : 'ਗੂਗਲ ਅਕਾਊਂਟ ਕਨੈਕਟ ਨਹੀਂ ਹੈ'}
                  </span>
                  {accessToken && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md">
                      Authorized
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {spreadsheetId ? (
                    <span className="font-mono">Sheet ID: {spreadsheetId.slice(0, 16)}...</span>
                  ) : (
                    <span>{isEn ? 'No connected spreadsheet yet' : 'ਅਜੇ ਕੋਈ ਗੂਗਲ ਸ਼ੀਟ ਕਨੈਕਟ ਨਹੀਂ'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Account & Spreadsheet Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {!accessToken ? (
                <>
                  {/* Official Google Sign In Button */}
                  <button
                    onClick={() => signInWithGoogle().catch(() => setShowManualToken(true))}
                    disabled={isAuthenticating}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>

                  <button
                    onClick={() => setShowManualToken(!showManualToken)}
                    className="px-2.5 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                    title="Manual OAuth Access Token"
                  >
                    Token
                  </button>
                </>
              ) : (
                <>
                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Open Sheet' : 'ਗੂਗਲ ਸ਼ੀਟ ਖੋਲ੍ਹੋ'}</span>
                    </a>
                  )}

                  {!spreadsheetId ? (
                    <button
                      onClick={handleCreateNewSpreadsheet}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>{isBusy ? 'Creating...' : isEn ? 'Create Multi-Table Sheet' : 'ਨਵੀਂ ਗੂਗਲ ਸ਼ੀਟ ਬਣਾਓ'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingSheetId(!isEditingSheetId)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{isEn ? 'Change ID' : 'ਸ਼ੀਟ ਬਦਲੋ'}</span>
                    </button>
                  )}

                  <button
                    onClick={signOutGoogle}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    {isEn ? 'Disconnect' : 'ਡਿਸ-ਕਨੈਕਟ'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Optional: Manual Token Entry Accordion */}
          {showManualToken && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-amber-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  Direct OAuth Access Token Entry
                </span>
                <button
                  onClick={() => setShowManualToken(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-slate-600 text-[11px]">
                Paste your OAuth token if Google Identity popups are blocked by third-party cookies in your browser environment.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="Bearer ya29...."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
                <button
                  onClick={handleApplyManualToken}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Apply Token
                </button>
              </div>
            </div>
          )}

          {/* Optional: Edit Spreadsheet ID */}
          {isEditingSheetId && (
            <form
              onSubmit={handleConnectSheetIdSubmit}
              className="bg-slate-100 border border-slate-300 rounded-xl p-3.5 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputSpreadsheetId}
                onChange={(e) => setInputSpreadsheetId(e.target.value)}
                placeholder="Enter Google Spreadsheet ID (e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
              <button
                type="submit"
                disabled={isBusy}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Connect
              </button>
              <button
                type="button"
                onClick={() => setIsEditingSheetId(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* TAB 1: TWO-WAY SYNC (9 TABLES)                                */}
          {/* ============================================================ */}
          {activeTab === 'two_way_sync' && (
            <div className="space-y-4">
              {/* Sync Control Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        syncStatus === 'connected'
                          ? 'bg-emerald-500 ring-4 ring-emerald-100'
                          : syncStatus === 'syncing'
                          ? 'bg-blue-500 ring-4 ring-blue-100 animate-pulse'
                          : syncStatus === 'error'
                          ? 'bg-rose-500 ring-4 ring-rose-100'
                          : 'bg-slate-400'
                      }`}
                    ></span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {syncStatus === 'connected'
                          ? isEn
                            ? 'Google Sheets Connected & Live'
                            : 'ਗੂਗਲ ਸ਼ੀਟਸ ਕਨੈਕਟਡ ਤੇ ਲਾਈਵ'
                          : syncStatus === 'syncing'
                          ? isEn
                            ? 'Synchronizing...'
                            : 'ਸਿੰਕ ਹੋ ਰਿਹਾ ਹੈ...'
                          : syncStatus === 'error'
                          ? isEn
                            ? 'Sync Error Occurred'
                            : 'ਸਿੰਕ ਗਲਤੀ ਆਈ'
                          : isEn
                          ? 'Idle (Ready to Connect)'
                          : 'ਤਿਆਰ'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {isEn ? 'Last Synced:' : 'ਆਖਰੀ ਸਿੰਕ:'}{' '}
                          {lastSyncTime
                            ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
                              ' (' +
                              new Date(lastSyncTime).toLocaleDateString() +
                              ')'
                            : isEn
                            ? 'Never'
                            : 'ਕਦੇ ਨਹੀਂ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Sync Toggle */}
                  <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={toggleAutoSync}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        {isEn ? 'Auto Background Sync' : 'ਆਟੋਮੈਟਿਕ ਬੈਕਗ੍ਰਾਊਂਡ ਸਿੰਕ'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleRunSyncNow}
                    disabled={isBusy || !accessToken || !spreadsheetId}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                    <span>{isEn ? 'Sync Now' : 'ਹੁਣੇ Sync ਕਰੋ'}</span>
                  </button>

                  <button
                    onClick={handleRunBackup}
                    disabled={isBusy || !accessToken || !spreadsheetId}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                    title="Export software records to all 9 Google Sheets"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Backup to Sheets' : 'ਸ਼ੀਟਸ ਵਿੱਚ ਬੈਕਅੱਪ'}</span>
                  </button>

                  <button
                    onClick={handleRunImport}
                    disabled={isBusy || !accessToken || !spreadsheetId}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                    title="Detect new rows or edits in Google Sheets and import"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Import from Sheets' : 'ਸ਼ੀਟਸ ਤੋਂ ਇੰਪੋਰਟ'}</span>
                  </button>
                </div>
              </div>

              {/* 9 Tables Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tableStats.map((stat) => (
                  <div
                    key={stat.table}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-emerald-300 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>{stat.labelEn}</span>
                          <span className="text-slate-400 font-normal">/</span>
                          <span className="text-slate-600 font-semibold">{stat.labelPa}</span>
                        </h4>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Sheet: &apos;{stat.sheetName}&apos;
                        </div>
                      </div>
                      <span className="text-xs font-mono font-black px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                        {stat.localCount} {isEn ? 'rows' : 'ਐਂਟਰੀਆਂ'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isEn ? 'Active Table' : 'ਸਰਗਰਮ ਟੇਬਲ'}</span>
                      </div>
                      <button
                        onClick={() => downloadTableTemplate(stat.table)}
                        className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
                        title="Download CSV Template with standard column headers"
                      >
                        <FileDown className="w-3 h-3" />
                        <span>{isEn ? 'Template' : 'ਟੈਂਪਲੇਟ'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Safety Guarantees Notice */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center gap-2 font-black text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>{isEn ? 'Safety & Integrity Guarantees' : 'ਸੁਰੱਖਿਆ ਤੇ ਡਾਟਾ ਸੁਰੱਖਿਅਤ ਰੱਖਣ ਦੇ ਨੇਮ'}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800">
                  <li><strong>Primary Source of Truth:</strong> Supabase remains the primary database. Google Sheets works as a synchronized backup layer.</li>
                  <li><strong>No Accidental Deletion:</strong> Missing or blank rows in Google Sheets will NEVER delete existing database records.</li>
                  <li><strong>Soft-Delete Sync:</strong> Records deleted in software are safely marked with status <code>DELETED</code> in Google Sheets instead of being purged.</li>
                  <li><strong>Automatic Farmer ID:</strong> New farmers added in Google Sheets without an ID are automatically assigned the next sequential Farmer ID (e.g. FRM000001) and written back to Google Sheets.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: CONFLICT PROTECTION                                    */}
          {/* ============================================================ */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-900">
                      {isEn ? 'Conflict Resolution Center' : 'ਵਿਰੋਧ ਹੱਲ ਕੇਂਦਰ'}
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      {isEn
                        ? 'When a record is changed in both the software and Google Sheets, data is never blindly overwritten. Choose which version to keep.'
                        : 'ਜੇਕਰ ਕੋਈ ਰਿਕਾਰਡ ਸਾਫਟਵੇਅਰ ਅਤੇ ਗੂਗਲ ਸ਼ੀਟਸ ਦੋਵਾਂ ਵਿੱਚ ਬਦਲਿਆ ਗਿਆ ਹੈ, ਤਾਂ ਡਾਟਾ ਬਿਨਾਂ ਪੁੱਛੇ ਨਹੀਂ ਬਦਲਿਆ ਜਾਂਦਾ।'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg">
                  {conflicts.length} {isEn ? 'Pending' : 'ਬਾਕੀ'}
                </span>
              </div>

              {conflicts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">
                    {isEn ? 'Zero Conflicts Detected' : 'ਕੋਈ ਵਿਰੋਧ ਨਹੀਂ ਮਿਲਿਆ'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isEn
                      ? 'Software records and Google Sheets are in full harmony.'
                      : 'ਸਾਫਟਵੇਅਰ ਅਤੇ ਗੂਗਲ ਸ਼ੀਟਸ ਦਾ ਸਾਰਾ ਡਾਟਾ ਬਿਲਕੁਲ ਇਕਸਾਰ ਹੈ।'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conflicts.map((conf) => (
                    <div
                      key={conf.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-mono font-bold rounded">
                            {conf.table.toUpperCase()}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{conf.title}</h4>
                          <span className="text-[10px] font-mono text-slate-400">ID: {conf.recordId}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Detected: {new Date(conf.detectedAt).toLocaleTimeString()}
                        </div>
                      </div>

                      {/* Side-by-side comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Software side */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-1">
                            <span className="flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-blue-600" />
                              Software Version
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {conf.softwareUpdatedAt ? new Date(conf.softwareUpdatedAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 max-h-32 overflow-y-auto">
                            <pre>{JSON.stringify(conf.softwareValue, null, 2)}</pre>
                          </div>
                          <button
                            onClick={() => resolveConflict(conf.id, 'SOFTWARE')}
                            className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            Keep Software Version
                          </button>
                        </div>

                        {/* Google Sheet side */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-1">
                            <span className="flex items-center gap-1.5">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                              Google Sheet Version
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {conf.sheetUpdatedAt ? new Date(conf.sheetUpdatedAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 max-h-32 overflow-y-auto">
                            <pre>{JSON.stringify(conf.sheetValue, null, 2)}</pre>
                          </div>
                          <button
                            onClick={() => resolveConflict(conf.id, 'GOOGLE_SHEETS')}
                            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            Keep Google Sheet Version
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: IMPORT REPORT & VALIDATION                             */}
          {/* ============================================================ */}
          {activeTab === 'import_review' && (
            <div className="space-y-4">
              {!latestImportResult ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">
                    {isEn ? 'No Import Report Available' : 'ਕੋਈ ਤਾਜ਼ਾ ਇੰਪੋਰਟ ਰਿਪੋਰਟ ਨਹੀਂ'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isEn
                      ? 'Click [ Import from Sheets ] on the Two-Way Sync tab to run validation.'
                      : 'ਇੰਪੋਰਟ ਰਿਪੋਰਟ ਦੇਖਣ ਲਈ ਦੋ-ਤਰਫਾ ਸਿੰਕ ਟੈਬ ਵਿੱਚ [ ਸ਼ੀਟਸ ਤੋਂ ਇੰਪੋਰਟ ] ਤੇ ਕਲਿੱਕ ਕਰੋ।'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Generated Farmer IDs Notification */}
                  {latestImportResult.generatedFarmerIds.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <UserCheck className="w-4 h-4 text-emerald-700" />
                        <span>
                          {latestImportResult.generatedFarmerIds.length} {isEn ? 'Farmer ID(s) Automatically Generated & Written Back' : 'ਕਿਸਾਨ ਆਈ.ਡੀ. ਤਿਆਰ ਕਰਕੇ ਗੂਗਲ ਸ਼ੀਟ ਵਿੱਚ ਲਿਖ ਦਿੱਤੀਆਂ'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {latestImportResult.generatedFarmerIds.map((g, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-mono text-[10px]"
                          >
                            Row {g.rowNumber}: {g.farmerName} → <strong>{g.generatedId}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-xl font-black text-emerald-600 font-mono">
                        {latestImportResult.newFarmers.length +
                          latestImportResult.newBagsEntries.length +
                          latestImportResult.newPurchases.length +
                          latestImportResult.newAdvances.length}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">{isEn ? 'New Rows Imported' : 'ਨਵੀਆਂ ਐਂਟਰੀਆਂ'}</div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-xl font-black text-blue-600 font-mono">
                        {latestImportResult.updatedFarmers.length +
                          latestImportResult.updatedBagsEntries.length +
                          latestImportResult.updatedPurchases.length}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">{isEn ? 'Existing Rows Updated' : 'ਅਪਡੇਟ ਹੋਈਆਂ'}</div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-xl font-black text-amber-600 font-mono">
                        {latestImportResult.conflicts.length}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">{isEn ? 'Conflicts Flagged' : 'ਵਿਰੋਧ ਮਿਲੇ'}</div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-xl font-black text-rose-600 font-mono">
                        {(Object.values(latestImportResult.tableSummaries) as TableImportSummary[]).reduce((acc, s) => acc + s.errors, 0)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold">{isEn ? 'Invalid / Skipped' : 'ਅਯੋਗ ਰੱਦ'}</div>
                    </div>
                  </div>

                  {/* Issues & Warnings List */}
                  {(Object.entries(latestImportResult.tableSummaries) as [string, TableImportSummary][]).map(([tableKey, summary]) => {
                    if (summary.issues.length === 0) return null;
                    return (
                      <div key={tableKey} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>{summary.sheetName} ({summary.issues.length} Issues)</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Errors: {summary.errors} | Warnings: {summary.warnings}
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {summary.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                                issue.severity === 'ERROR'
                                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                                  : 'bg-amber-50 border-amber-200 text-amber-900'
                              }`}
                            >
                              {issue.severity === 'ERROR' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 text-[11px]">
                                <span className="font-bold font-mono">Row {issue.row}:</span>{' '}
                                <span className="font-semibold">[{issue.field}]</span> {issue.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: OFFLINE EXCEL / CSV FILES                             */}
          {/* ============================================================ */}
          {activeTab === 'excel_files' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>{isEn ? 'Export Full Farmer Register' : 'ਪੂਰਾ ਕਿਸਾਨ ਰਜਿਸਟਰ ਡਾਊਨਲੋਡ ਕਰੋ'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isEn
                      ? 'Download all farmer records, addresses, bank accounts, and photo references formatted for Microsoft Excel or CSV.'
                      : 'ਸਾਰੇ ਕਿਸਾਨਾਂ ਦਾ ਰਿਕਾਰਡ ਐਕਸਲ (.xlsx) ਜਾਂ CSV ਫਾਰਮੈਟ ਵਿੱਚ ਡਾਊਨਲੋਡ ਕਰੋ।'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportExcelOffline}
                      className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={handleExportCsvOffline}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>CSV (.csv)</span>
                    </button>
                  </div>
                </div>

                {/* Import Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>{isEn ? 'Import Excel or CSV File' : 'ਐਕਸਲ ਜਾਂ CSV ਫਾਈਲ ਇੰਪੋਰਟ ਕਰੋ'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isEn
                      ? 'Select an Excel (.xlsx) or CSV file with farmer records. Duplicate detection prevents duplicate entries.'
                      : 'ਕਿਸਾਨਾਂ ਵਾਲੀ ਐਕਸਲ ਜਾਂ CSV ਫਾਈਲ ਚੁਣੋ। ਡੁਪਲੀਕੇਟ ਚੈੱਕ ਸਿਸਟਮ ਦੂਹਰੀਆਂ ਐਂਟਰੀਆਂ ਰੋਕਦਾ ਹੈ।'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleOfflineFileUpload}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Choose File' : 'ਫਾਈਲ ਚੁਣੋ'}</span>
                    </button>
                    <button
                      onClick={handleDownloadOfflineFarmerTemplate}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Template' : 'ਟੈਂਪਲੇਟ'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: AUDIT TRAIL LOG                                       */}
          {/* ============================================================ */}
          {activeTab === 'audit_log' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                <span>{isEn ? 'Sync Operations Audit Log' : 'ਸਿੰਕ ਗਤੀਵਿਧੀਆਂ ਦਾ ਆਡਿਟ ਲੌਗ'}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {auditLogs.length} {isEn ? 'Records' : 'ਲੌਗ ਐਂਟਰੀਆਂ'}
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                  No sync events recorded yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              log.source === 'SOFTWARE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.source}
                          </span>
                          <span className="font-bold text-slate-900">[{log.action}]</span>
                          <span className="text-[11px] text-slate-500">{log.table.toUpperCase()}</span>
                          <span className="text-[10px] font-mono text-slate-400">ID: {log.recordId}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{log.details}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.status === 'WARNING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.status}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>Project: gen-lang-client-0219590296</span>
            <span>•</span>
            <span>OAuth Client: 866525565892...</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition cursor-pointer"
          >
            {isEn ? 'Close' : 'ਬੰਦ ਕਰੋ'}
          </button>
        </div>
      </div>
    </div>
  );
};
