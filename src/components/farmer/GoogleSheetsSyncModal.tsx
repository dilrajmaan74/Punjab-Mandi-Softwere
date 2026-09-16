import React, { useState, useEffect, useRef } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
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
  RotateCcw
} from 'lucide-react';
import {
  getStoredGoogleAuth,
  saveGoogleAuth,
  clearGoogleAuth,
  getStoredSheetId,
  saveStoredSheetId,
  createGoogleSpreadsheet,
  syncFarmersToGoogleSheet,
  importFarmersFromGoogleSheet,
  initGoogleTokenClient,
  requestGoogleAccessToken,
  GoogleAuthUser
} from '../../services/googleSheetsService';
import {
  exportFarmersToExcelFile,
  exportFarmersToCsvFile,
  downloadFarmerImportTemplate,
  downloadImportReviewReport,
  parseExcelOrCsvFile,
  matchDuplicateFarmer,
  CandidateFarmer,
  DuplicateFarmerMatch,
  ImportResultSummary
} from '../../utils/excelExportImport';
import { Farmer } from '../../types/mandi';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab = 'excel' | 'sheets';
type ModalStep = 'main' | 'duplicateReview' | 'resultSummary';

const STORAGE_KEY_LIVE_SYNC = 'punjab_mandi_google_sheets_live_sync';

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({ isOpen, onClose }) => {
  const { farmers, registerFarmer, updateFarmer, generateNextFarmerId, activeFirm } = useMandi();
  const { notifySaveSuccess, notifyError } = useNotification();

  // Navigation tab & workflow state
  const [activeTab, setActiveTab] = useState<ActiveTab>('excel');
  const [currentStep, setCurrentStep] = useState<ModalStep>('main');

  // Auth states
  const [googleAuth, setGoogleAuth] = useState<GoogleAuthUser | null>(() => getStoredGoogleAuth());
  const [manualToken, setManualToken] = useState('');
  const [showManualTokenInput, setShowManualTokenInput] = useState(false);

  // Sheet states
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => getStoredSheetId() || '');
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    const id = getStoredSheetId();
    return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : '';
  });
  const [liveSyncEnabled, setLiveSyncEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LIVE_SYNC) === 'true';
    } catch {
      return false;
    }
  });

  // Action status states
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Staged Import states
  const [stagedCandidates, setStagedCandidates] = useState<CandidateFarmer[]>([]);
  const [stagedDuplicates, setStagedDuplicates] = useState<DuplicateFarmerMatch[]>([]);
  const [stagedErrors, setStagedErrors] = useState<{ row: number; error: string; rawData: any }[]>([]);
  const [importSummary, setImportSummary] = useState<ImportResultSummary | null>(null);

  // File import ref for Excel/CSV
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project details from OAuth setup
  const projectId = 'gen-lang-client-0946713408';
  const projectNumber = '627074442572';

  // Initialize Google GSI client if available
  useEffect(() => {
    const clientId = `${projectNumber}-apps.googleusercontent.com`;
    initGoogleTokenClient(
      clientId,
      (token, expiresIn) => {
        const authData: GoogleAuthUser = {
          accessToken: token,
          expiresAt: Date.now() + expiresIn * 1000
        };
        setGoogleAuth(authData);
        saveGoogleAuth(authData);
        setStatusMessage('Google OAuth authorization successful!');
        setErrorMessage(null);
      },
      (err) => {
        console.warn('Google GSI notice:', err);
      }
    );
  }, []);

  const handleToggleLiveSync = (enabled: boolean) => {
    setLiveSyncEnabled(enabled);
    localStorage.setItem(STORAGE_KEY_LIVE_SYNC, enabled ? 'true' : 'false');
  };

  if (!isOpen) return null;

  const currentToken = googleAuth?.accessToken || manualToken.trim();

  // 1. Google OAuth Connect
  const handleGoogleConnect = () => {
    try {
      requestGoogleAccessToken();
    } catch {
      setShowManualTokenInput(true);
      setErrorMessage(
        'Google OAuth popup blocked by iframe container. You can paste an OAuth Access Token directly below or use the offline Excel (.xlsx) export/import.'
      );
    }
  };

  const handleApplyManualToken = () => {
    if (!manualToken.trim()) {
      setErrorMessage('Please enter a valid Google OAuth Access Token.');
      return;
    }
    const authData: GoogleAuthUser = {
      accessToken: manualToken.trim(),
      expiresAt: Date.now() + 3600 * 1000
    };
    setGoogleAuth(authData);
    saveGoogleAuth(authData);
    setStatusMessage('Access token applied successfully!');
    setErrorMessage(null);
  };

  const handleDisconnect = () => {
    clearGoogleAuth();
    setGoogleAuth(null);
    setManualToken('');
    setStatusMessage('Disconnected from Google Account.');
  };

  // 2. EXCEL: Export Complete Farmer Register (.xlsx)
  const handleExportExcel = () => {
    const firmName = (activeFirm?.name || 'Punjab_Mandi').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    exportFarmersToExcelFile(
      farmers,
      `${firmName}_Farmers_Register_${dateStr}.xlsx`,
      activeFirm?.name || 'Punjab Mandi'
    );
    notifySaveSuccess({
      titleEn: 'Excel Exported',
      titlePa: 'ਐਕਸਲ ਫਾਈਲ ਡਾਊਨਲੋਡ ਹੋਈ',
      messageEn: `Exported ${farmers.length} farmers to Excel (.xlsx) successfully!`,
      messagePa: `${farmers.length} ਕਿਸਾਨਾਂ ਦਾ ਰਿਕਾਰਡ ਐਕਸਲ (.xlsx) ਵਿੱਚ ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ!`
    });
  };

  // 3. EXCEL: Download Import Template (.xlsx)
  const handleDownloadTemplate = () => {
    downloadFarmerImportTemplate('Punjab_Mandi_Farmer_Import_Template.xlsx');
    notifySaveSuccess({
      titleEn: 'Template Downloaded',
      titlePa: 'ਟੈਂਪਲੇਟ ਡਾਊਨਲੋਡ ਹੋਈ',
      messageEn: 'Farmer import template (.xlsx) downloaded with sample rows and guidelines!',
      messagePa: 'ਕਿਸਾਨ ਇੰਪੋਰਟ ਟੈਂਪਲੇਟ (.xlsx) ਨਮੂਨੇ ਅਤੇ ਨਿਯਮਾਂ ਸਮੇਤ ਡਾਊਨਲੋਡ ਹੋ ਗਈ!'
    });
  };

  // 4. OFFLINE CSV Export
  const handleExportCsv = () => {
    const firmName = (activeFirm?.name || 'Punjab_Mandi').replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    exportFarmersToCsvFile(farmers, `${firmName}_Farmers_Register_${dateStr}.csv`);
    notifySaveSuccess({
      titleEn: 'CSV Exported',
      titlePa: 'CSV ਫਾਈਲ ਡਾਊਨਲੋਡ ਹੋਈ',
      messageEn: 'CSV file downloaded successfully!',
      messagePa: 'CSV ਫਾਈਲ ਕਾਮਯਾਬੀ ਨਾਲ ਡਾਊਨਲੋਡ ਹੋ ਗਈ!'
    });
  };

  // 5. STAGE FILE OR GOOGLE SHEET IMPORT (Duplicate Check)
  const stageParsedCandidates = (
    candidates: CandidateFarmer[],
    errors: { row: number; error: string; rawData: any }[]
  ) => {
    const duplicateMatches: DuplicateFarmerMatch[] = [];
    const validNonDuplicates: CandidateFarmer[] = [];

    candidates.forEach((cand) => {
      const match = matchDuplicateFarmer(cand, farmers);
      if (match.isDuplicate && match.existingFarmer && match.matchedBy) {
        duplicateMatches.push({
          candidate: cand,
          existingFarmer: match.existingFarmer,
          matchedBy: match.matchedBy,
          resolution: 'REVIEW' // Default requires explicit choice
        });
      } else {
        validNonDuplicates.push(cand);
      }
    });

    setStagedCandidates(validNonDuplicates);
    setStagedDuplicates(duplicateMatches);
    setStagedErrors(errors);

    if (duplicateMatches.length > 0) {
      setCurrentStep('duplicateReview');
    } else {
      // No duplicates found, execute directly
      executeImportCommit(validNonDuplicates, [], errors);
    }
  };

  // File Upload Handler (Excel/CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Reading ${file.name}...`);

    try {
      const { candidates, errors } = await parseExcelOrCsvFile(file);
      if (candidates.length === 0 && errors.length === 0) {
        setErrorMessage('The uploaded file does not contain any valid farmer rows.');
        return;
      }
      stageParsedCandidates(candidates, errors);
    } catch (err: any) {
      setErrorMessage(`Failed to parse file: ${err.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 6. GOOGLE SHEETS: Create New Spreadsheet
  const handleCreateSheet = async () => {
    if (!currentToken) {
      setErrorMessage('Please connect your Google Account or enter an Access Token first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Creating Google Spreadsheet in your Google Drive...');

    try {
      const firmName = activeFirm?.name || 'Punjab Mandi';
      const title = `${firmName} - ਕਿਸਾਨ ਰਜਿਸਟਰ (Farmer Register)`;
      const res = await createGoogleSpreadsheet(currentToken, title, farmers);

      setSpreadsheetId(res.spreadsheetId);
      setSheetUrl(res.spreadsheetUrl);
      saveStoredSheetId(res.spreadsheetId);
      setStatusMessage(`Spreadsheet created successfully! Loaded ${farmers.length} farmer(s).`);
      notifySaveSuccess({
        titleEn: 'Google Spreadsheet Created',
        titlePa: 'ਗੂਗਲ ਸ਼ੀਟ ਤਿਆਰ ਹੋ ਗਈ',
        messageEn: `Google Spreadsheet created with ${farmers.length} farmers!`,
        messagePa: `${farmers.length} ਕਿਸਾਨਾਂ ਨਾਲ ਗੂਗਲ ਸ਼ੀਟ ਤਿਆਰ ਹੋ ਗਈ!`
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create Google Spreadsheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. GOOGLE SHEETS: Sync / Overwrite
  const handleSyncToSheet = async () => {
    if (!currentToken) {
      setErrorMessage('Please connect your Google Account or enter an Access Token first.');
      return;
    }

    const cleanId = spreadsheetId.trim();
    if (!cleanId) {
      setErrorMessage('Please enter or create a Spreadsheet ID first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Syncing ${farmers.length} farmers to Google Sheet...`);

    try {
      await syncFarmersToGoogleSheet(currentToken, cleanId, farmers);
      saveStoredSheetId(cleanId);
      setSheetUrl(`https://docs.google.com/spreadsheets/d/${cleanId}/edit`);
      setStatusMessage(`Successfully synced ${farmers.length} farmer(s) to Google Sheet!`);
      notifySaveSuccess({
        titleEn: 'Google Sheets Synced',
        titlePa: 'ਗੂਗਲ ਸ਼ੀਟ ਸਿੰਕ ਹੋ ਗਈ',
        messageEn: `Synced ${farmers.length} farmers to Google Sheets!`,
        messagePa: `${farmers.length} ਕਿਸਾਨਾਂ ਦਾ ਰਿਕਾਰਡ ਗੂਗਲ ਸ਼ੀਟ ਵਿੱਚ ਸਿੰਕ ਹੋ ਗਿਆ!`
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync with Google Sheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 8. GOOGLE SHEETS: Import From Sheet
  const handleImportFromSheet = async () => {
    if (!currentToken) {
      setErrorMessage('Please connect your Google Account or enter an Access Token first.');
      return;
    }

    const cleanId = spreadsheetId.trim();
    if (!cleanId) {
      setErrorMessage('Please enter a Google Spreadsheet ID to import from.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Reading farmer records from Google Sheet...');

    try {
      const res = await importFarmersFromGoogleSheet(currentToken, cleanId);
      if (res.farmers.length === 0) {
        setErrorMessage('No farmer records found in the specified Google Sheet.');
        return;
      }

      // Convert imported farmers into CandidateFarmer items
      const candidates: CandidateFarmer[] = res.farmers.map((f, idx) => ({
        rowIndex: idx + 2,
        data: {
          id: f.id,
          farmerName: f.farmerName,
          farmerNamePa: f.farmerNamePa,
          fatherName: f.fatherName,
          fatherNamePa: f.fatherNamePa,
          village: f.village,
          villagePa: f.villagePa,
          address: f.address,
          pinCode: f.pinCode,
          mobile: f.mobile,
          aadhaar: f.aadhaar,
          linkedMainFarmerId: f.linkedMainFarmerId,
          bankName: f.bankDetails?.bankName,
          accountNumber: f.bankDetails?.accountNumber,
          ifscCode: f.bankDetails?.ifscCode,
          branchName: f.bankDetails?.branchName,
          firmId: f.firmId
        },
        isValid: true
      }));

      stageParsedCandidates(candidates, []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import from Google Sheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 9. RESOLUTION HANDLERS FOR DUPLICATES (ONLY: Update, Skip, Review)
  const handleSetResolution = (index: number, resolution: 'UPDATE' | 'SKIP' | 'REVIEW') => {
    setStagedDuplicates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], resolution };
      return updated;
    });
  };

  const handleSetAllResolutions = (resolution: 'UPDATE' | 'SKIP' | 'REVIEW') => {
    setStagedDuplicates((prev) => prev.map((d) => ({ ...d, resolution })));
  };

  // 10. COMMIT IMPORT TO SOFTWARE (Supabase single source of truth)
  const executeImportCommit = (
    cleanCandidates: CandidateFarmer[],
    duplicates: DuplicateFarmerMatch[],
    errors: { row: number; error: string; rawData: any }[]
  ) => {
    setIsProcessing(true);

    const addedList: Farmer[] = [];
    const updatedList: Farmer[] = [];
    const skippedList: { candidate: CandidateFarmer; reason: string }[] = [];
    let reviewCount = 0;

    // A. Register valid new farmers (generate sequential Farmer ID)
    cleanCandidates.forEach((cand) => {
      const data = cand.data;
      const nextId = generateNextFarmerId();
      const newFarmer: Farmer = {
        id: data.id || nextId,
        farmerName: data.farmerName || 'New Farmer',
        farmerNamePa: data.farmerNamePa || data.farmerName || 'ਨਵਾਂ ਕਿਸਾਨ',
        fatherName: data.fatherName || '',
        fatherNamePa: data.fatherNamePa || data.fatherName || '',
        village: data.village || 'Kang Khurd',
        villagePa: data.villagePa || data.village || 'ਕੰਗ ਖੁਰਦ',
        address: data.address,
        pinCode: data.pinCode || '144629',
        mobile: data.mobile || '',
        aadhaar: data.aadhaar || '',
        linkedMainFarmerId: data.linkedMainFarmerId,
        firmId: data.firmId || activeFirm?.id || 'FIRM-001',
        createdAt: new Date().toISOString()
      };

      if (data.accountNumber || data.ifscCode || data.bankName) {
        newFarmer.bankDetails = {
          accountHolderName: newFarmer.farmerName,
          accountHolderNamePa: newFarmer.farmerNamePa,
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          bankName: data.bankName || '',
          branchName: data.branchName || ''
        };
      }

      const res = registerFarmer(newFarmer);
      if (res.success && res.farmer) {
        addedList.push(res.farmer);
      } else {
        skippedList.push({ candidate: cand, reason: res.message || 'Duplicate detected during registration' });
      }
    });

    // B. Handle duplicates based on user's confirmed resolution
    duplicates.forEach((dup) => {
      if (dup.resolution === 'UPDATE') {
        // Update existing farmer with incoming fields
        const candData = dup.candidate.data;
        const updates: Partial<Farmer> = {
          farmerName: candData.farmerName || dup.existingFarmer.farmerName,
          farmerNamePa: candData.farmerNamePa || dup.existingFarmer.farmerNamePa,
          fatherName: candData.fatherName || dup.existingFarmer.fatherName,
          fatherNamePa: candData.fatherNamePa || dup.existingFarmer.fatherNamePa,
          village: candData.village || dup.existingFarmer.village,
          villagePa: candData.villagePa || dup.existingFarmer.villagePa,
          address: candData.address || dup.existingFarmer.address,
          pinCode: candData.pinCode || dup.existingFarmer.pinCode,
          mobile: candData.mobile || dup.existingFarmer.mobile,
          aadhaar: candData.aadhaar || dup.existingFarmer.aadhaar,
          updatedAt: new Date().toISOString()
        };

        if (candData.accountNumber || candData.ifscCode || candData.bankName) {
          updates.bankDetails = {
            ...(dup.existingFarmer.bankDetails || {
              accountHolderName: dup.existingFarmer.farmerName,
              accountNumber: '',
              ifscCode: '',
              bankName: '',
              branchName: ''
            }),
            accountNumber: candData.accountNumber || dup.existingFarmer.bankDetails?.accountNumber || '',
            ifscCode: candData.ifscCode || dup.existingFarmer.bankDetails?.ifscCode || '',
            bankName: candData.bankName || dup.existingFarmer.bankDetails?.bankName || '',
            branchName: candData.branchName || dup.existingFarmer.bankDetails?.branchName || ''
          };
        }

        updateFarmer(dup.existingFarmer.id, updates);
        updatedList.push({ ...dup.existingFarmer, ...updates });
      } else if (dup.resolution === 'SKIP') {
        skippedList.push({ candidate: dup.candidate, reason: `Skipped by user (${dup.matchedBy})` });
      } else if (dup.resolution === 'REVIEW') {
        reviewCount += 1;
        skippedList.push({ candidate: dup.candidate, reason: `Held for manual review (${dup.matchedBy})` });
      }
    });

    // C. Create summary report
    const summary: ImportResultSummary = {
      added: addedList.length,
      updated: updatedList.length,
      skipped: skippedList.length,
      reviewRequired: reviewCount,
      errors: errors.length,
      addedFarmers: addedList,
      updatedFarmers: updatedList,
      skippedRecords: skippedList,
      duplicateRecords: duplicates,
      errorRecords: errors,
      timestamp: new Date().toLocaleString('en-IN')
    };

    setImportSummary(summary);
    setCurrentStep('resultSummary');
    setIsProcessing(false);

    // If live sync is enabled and Google Sheet is connected, mirror changes to Google Sheet
    if (liveSyncEnabled && currentToken && spreadsheetId.trim()) {
      syncFarmersToGoogleSheet(currentToken, spreadsheetId.trim(), [...addedList, ...farmers]).catch(console.error);
    }

    notifySaveSuccess({
      titleEn: 'Import Completed',
      titlePa: 'ਇੰਪੋਰਟ ਮੁਕੰਮਲ ਹੋਇਆ',
      messageEn: `Import completed: ${addedList.length} Added, ${updatedList.length} Updated, ${skippedList.length} Skipped.`,
      messagePa: `ਇੰਪੋਰਟ ਮੁਕੰਮਲ: ${addedList.length} ਨਵੇਂ ਸ਼ਾਮਲ, ${updatedList.length} ਅੱਪਡੇਟ, ${skippedList.length} ਛੱਡੇ ਗਏ।`
    });
  };

  const handleDownloadReport = () => {
    if (!importSummary) return;
    downloadImportReviewReport(importSummary, `Punjab_Mandi_Import_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleResetWorkflow = () => {
    setCurrentStep('main');
    setStagedCandidates([]);
    setStagedDuplicates([]);
    setStagedErrors([]);
    setImportSummary(null);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>ਕਿਸਾਨ ਰਜਿਸਟਰ ਐਕਸਲ ਅਤੇ ਗੂਗਲ ਸ਼ੀਟਸ</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                  Professional Sync
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Farmer Register Excel & Google Sheets Sync • Supabase Single Source of Truth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 2: DUPLICATE FARMER WARNING VIEW */}
        {currentStep === 'duplicateReview' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
            {/* Prominent Warning Banner */}
            <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl p-4.5 flex items-start gap-4">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-amber-900 flex items-center gap-2">
                  <span>⚠️ Duplicate Farmer Found / ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ ਮਿਲਿਆ</span>
                  <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    {stagedDuplicates.length} Duplicate(s)
                  </span>
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The software identified possible duplicate farmer records. Review the matching details below and select
                  one of the 3 permitted actions: <strong>Update Existing Farmer</strong>, <strong>Skip</strong>, or{' '}
                  <strong>Review Manually</strong>. No duplicates will ever be merged or created automatically.
                </p>
              </div>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-bold text-slate-700">ਸਾਰਿਆਂ ਲਈ ਇਕੋ ਵਿਕਲਪ ਚੁਣੋ (Bulk Action):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllResolutions('SKIP')}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 transition"
                >
                  ਸਾਰੇ ਛੱਡੋ (Skip All)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllResolutions('UPDATE')}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-300 transition"
                >
                  ਸਾਰੇ ਅੱਪਡੇਟ ਕਰੋ (Update All Confirmed)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllResolutions('REVIEW')}
                  className="text-xs px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 transition"
                >
                  ਸਾਰੇ ਜਾਂਚ ਅਧੀਨ ਰੱਖੋ (Review All)
                </button>
              </div>
            </div>

            {/* Duplicate Records Comparison List */}
            <div className="space-y-4">
              {stagedDuplicates.map((dup, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition"
                >
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                      <span className="text-xs font-bold text-slate-800">
                        ਰੋਅ (Row {dup.candidate.rowIndex}): {dup.candidate.data.farmerName}
                      </span>
                    </div>
                    <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>{dup.matchedBy} ਰਾਹੀਂ ਮੇਲ ਖਾਂਦਾ ਹੈ</span>
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Existing Record */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="font-bold text-slate-700">ਮੌਜੂਦਾ ਕਿਸਾਨ (Existing Record):</span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded">
                          {dup.existingFarmer.id}
                        </span>
                      </div>
                      <p>
                        <span className="text-slate-500">ਨਾਂ:</span> <strong>{dup.existingFarmer.farmerName}</strong> ({dup.existingFarmer.farmerNamePa || '—'})
                      </p>
                      <p>
                        <span className="text-slate-500">ਪਿਤਾ ਦਾ ਨਾਂ:</span> {dup.existingFarmer.fatherName || '—'}
                      </p>
                      <p>
                        <span className="text-slate-500">ਪਿੰਡ:</span> {dup.existingFarmer.village}
                      </p>
                      <p>
                        <span className="text-slate-500">ਮੋਬਾਈਲ:</span> {dup.existingFarmer.mobile || '—'}
                      </p>
                      <p>
                        <span className="text-slate-500">ਆਧਾਰ:</span> {dup.existingFarmer.aadhaar || '—'}
                      </p>
                    </div>

                    {/* Imported Candidate Record */}
                    <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between border-b border-blue-200 pb-1">
                        <span className="font-bold text-blue-900">ਨਵੀਂ ਇੰਪੋਰਟ ਸ਼ੀਟ ਡੇਟਾ (Imported Data):</span>
                        <span className="text-[11px] text-blue-700 italic">Candidate #{dup.candidate.rowIndex}</span>
                      </div>
                      <p>
                        <span className="text-slate-500">ਨਾਂ:</span> <strong>{dup.candidate.data.farmerName}</strong> ({dup.candidate.data.farmerNamePa || '—'})
                      </p>
                      <p>
                        <span className="text-slate-500">ਪਿਤਾ ਦਾ ਨਾਂ:</span> {dup.candidate.data.fatherName || '—'}
                      </p>
                      <p>
                        <span className="text-slate-500">ਪਿੰਡ:</span> {dup.candidate.data.village || '—'}
                      </p>
                      <p>
                        <span className="text-slate-500">ਮੋਬਾਈਲ:</span> {dup.candidate.data.mobile || '—'}
                      </p>
                      <p>
                        <span className="text-slate-500">ਆਧਾਰ:</span> {dup.candidate.data.aadhaar || '—'}
                      </p>
                    </div>
                  </div>

                  {/* ONLY 3 Allowed Options */}
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                    <span className="text-xs font-bold text-slate-600 mr-2">ਕਾਰਵਾਈ ਚੁਣੋ (Select Action):</span>
                    <button
                      type="button"
                      onClick={() => handleSetResolution(idx, 'UPDATE')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${
                        dup.resolution === 'UPDATE'
                          ? 'bg-blue-700 text-white border-blue-800 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Update Existing Farmer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetResolution(idx, 'SKIP')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${
                        dup.resolution === 'SKIP'
                          ? 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Skip
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetResolution(idx, 'REVIEW')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${
                        dup.resolution === 'REVIEW'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Review Manually
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions for Review Step */}
            <div className="sticky bottom-0 bg-white p-4 rounded-xl border border-slate-200 shadow-lg flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetWorkflow}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                ਰੱਦ ਕਰੋ (Cancel)
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  {stagedCandidates.length} New Farmer(s) + {stagedDuplicates.length} Reviewed
                </span>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => executeImportCommit(stagedCandidates, stagedDuplicates, stagedErrors)}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4 text-emerald-300" />
                  )}
                  <span>ਇੰਪੋਰਟ ਲਾਗੂ ਕਰੋ (Apply & Complete Import)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: IMPORT RESULT SUMMARY VIEW */}
        {currentStep === 'resultSummary' && importSummary && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">ਇੰਪੋਰਟ ਰਿਜ਼ਲਟ ਸਮਰੀ (Import Result Summary)</h4>
                  <p className="text-xs text-slate-500">
                    Import completed at {importSummary.timestamp} • Database updated successfully
                  </p>
                </div>
              </div>

              {/* 5 Distinct Metrics Cards: Added | Updated | Skipped | Duplicate/Review Required | Errors */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-emerald-800 block">Added (ਨਵੇਂ ਸ਼ਾਮਲ)</span>
                  <strong className="text-2xl font-black text-emerald-700">{importSummary.added}</strong>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Assigned Farmer IDs</span>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-blue-800 block">Updated (ਅੱਪਡੇਟ)</span>
                  <strong className="text-2xl font-black text-blue-700">{importSummary.updated}</strong>
                  <span className="text-[10px] text-blue-600 block mt-0.5">Confirmed Existing</span>
                </div>

                <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-slate-800 block">Skipped (ਛੱਡੇ ਗਏ)</span>
                  <strong className="text-2xl font-black text-slate-700">{importSummary.skipped}</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Omitted</span>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-amber-900 block">Duplicate / Review</span>
                  <strong className="text-2xl font-black text-amber-700">{importSummary.reviewRequired}</strong>
                  <span className="text-[10px] text-amber-600 block mt-0.5">Needs Verification</span>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-rose-800 block">Errors (ਖਾਮੀਆਂ)</span>
                  <strong className="text-2xl font-black text-rose-700">{importSummary.errors}</strong>
                  <span className="text-[10px] text-rose-600 block mt-0.5">Missing Names/Invalid</span>
                </div>
              </div>

              {/* Download Report Button */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  You can download a complete audit report with row-by-row duplicate matching notes and error logs.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>ਰਿਪੋਰਟ ਡਾਊਨਲੋਡ ਕਰੋ (Download Error/Review Report .xlsx)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleResetWorkflow}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md transition"
              >
                ਠੀਕ ਹੈ (Done / Return to Register)
              </button>
            </div>
          </div>
        )}

        {/* Step 1: MAIN NAVIGATION VIEW (EXCEL vs GOOGLE SHEETS) */}
        {currentStep === 'main' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Notification / Error / Status banners */}
            {statusMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Segmented Tab Control */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeTab === 'excel'
                    ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>1. ਐਕਸਲ ਇੰਪੋਰਟ ਤੇ ਐਕਸਪੋਰਟ (Excel .xlsx System)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sheets')}
                className={`py-2.5 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeTab === 'sheets'
                    ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CloudUpload className="w-4 h-4 text-blue-600" />
                <span>2. ਗੂਗਲ ਸ਼ੀਟਸ ਲਾਈਵ ਸਿੰਕ (Google Sheets Cloud)</span>
              </button>
            </div>

            {/* TAB 1: EXCEL SYSTEM */}
            {activeTab === 'excel' && (
              <div className="space-y-6">
                {/* 1. FARMER -> EXCEL EXPORT CARD */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          FARMER → EXCEL EXPORT (ਕਿਸਾਨ ਰਜਿਸਟਰ ਐਕਸਲ ਡਾਊਨਲੋਡ)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Download complete Farmer Register data as .xlsx with all fields matching software registers.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono">
                      {farmers.length} Farmer(s)
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    Includes all farmer details: <strong>Farmer ID, Name, Father Name, Village, Address, Mobile, Aadhaar, Bank Name, Account No., IFSC, Branch, Linked Main Farmer, Firm ID</strong>.
                    Farmer IDs are generated automatically by the software.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-200" />
                      <span>ਡਾਊਨਲੋਡ ਐਕਸਲ ਫਾਈਲ (Download .xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <span>ਡਾਊਨਲੋਡ CSV (Download .csv)</span>
                    </button>
                  </div>
                </div>

                {/* 2. EXCEL TEMPLATE CARD */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        EXCEL TEMPLATE (ਕਿਸਾਨ ਇੰਪੋਰਟ ਟੈਂਪਲੇਟ)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Download ready-to-use template for adding unlimited farmers in Excel and importing into the software.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    User can fill unlimited farmers. On import, the software automatically creates unique sequential Farmer IDs (e.g. FRM000001). User does not need to enter Farmer IDs.
                  </p>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-200" />
                    <span>ਟੈਂਪਲੇਟ ਡਾਊਨਲੋਡ ਕਰੋ (Download Farmer Import Template .xlsx)</span>
                  </button>
                </div>

                {/* 3. IMPORT FARMERS (EXCEL / CSV) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        IMPORT FARMERS (ਐਕਸਲ ਜਾਂ CSV ਫਾਈਲ ਇੰਪੋਰਟ ਕਰੋ)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Upload filled Excel or CSV sheet. Strong duplicate checking prevents duplicates.
                      </p>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50 transition">
                    <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">
                        ਕਲਿੱਕ ਕਰਕੇ ਐਕਸਲ (.xlsx) ਜਾਂ CSV ਫਾਈਲ ਚੁਣੋ
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Supports standard Punjab Mandi register sheets and download templates.
                      </p>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="excel-file-upload-input"
                    />

                    <label
                      htmlFor="excel-file-upload-input"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition active:scale-95"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>ਫਾਈਲ ਅਪਲੋਡ ਕਰੋ (Choose Excel / CSV File)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GOOGLE SHEETS CLOUD SYNC */}
            {activeTab === 'sheets' && (
              <div className="space-y-6">
                {/* Google Account Authentication Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-slate-800">Google Workspace OAuth Status</span>
                    </div>
                    {googleAuth ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Connected</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                        Not Connected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-600">
                      Access user Google Spreadsheets directly via official Google Sheets API.
                    </p>
                    {googleAuth ? (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold border border-rose-200 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleConnect}
                        className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Authorize Google Sheets</span>
                      </button>
                    )}
                  </div>

                  {showManualTokenInput && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Manual OAuth Access Token (Fallback for sandboxed iframes):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          placeholder="ya29.a0..."
                          className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleApplyManualToken}
                          className="text-xs bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-600"
                        >
                          Apply Token
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Google Spreadsheet Setup & Management */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>Connected Google Spreadsheet ID (ਗੂਗਲ ਸ਼ੀਟ ਆਈ.ਡੀ):</span>
                      {sheetUrl && (
                        <a
                          href={sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 text-xs font-bold flex items-center gap-1"
                        >
                          <span>Open in Google Sheets</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={spreadsheetId}
                          onChange={(e) => setSpreadsheetId(e.target.value)}
                          placeholder="1BxiMVs0XR..."
                          className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-emerald-600"
                        />
                      </div>
                      {sheetUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(sheetUrl);
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600"
                          title="Copy Link"
                        >
                          {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Live Sync Setting (Rule 6) */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Live Sync to Connected Google Sheet</span>
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        When enabled, software changes mirror to Google Sheet. Supabase remains single source of truth.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={liveSyncEnabled}
                        onChange={(e) => handleToggleLiveSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {/* Primary Google Sheets Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleCreateSheet}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4 text-emerald-200" />}
                      <span>ਨਵੀਂ ਗੂਗਲ ਸ਼ੀਟ ਬਣਾਓ (Create)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing || !spreadsheetId.trim()}
                      onClick={handleSyncToSheet}
                      className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-blue-200" />}
                      <span>ਸ਼ੀਟ 'ਚ ਸਿੰਕ ਕਰੋ (Export)</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing || !spreadsheetId.trim()}
                      onClick={handleImportFromSheet}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-amber-400" />}
                      <span>ਸ਼ੀਟ ਤੋਂ ਇੰਪੋਰਟ ਕਰੋ (Import)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>ਸੁਪਾਬੇਸ ਕਲਾਉਡ ਡੇਟਾਬੇਸ ਮੁੱਖ ਸਰੋਤ ਹੈ • Excel & Google Sheets Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-bold transition"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
