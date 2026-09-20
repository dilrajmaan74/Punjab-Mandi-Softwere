import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useMandi } from './MandiContext';
import { useNotification } from './NotificationContext';
import {
  SyncTableType,
  SheetSyncStatus,
  SyncConflict,
  SyncAuditLog,
  TableSyncStats,
  TableImportSummary
} from '../types/sheetsSync';
import {
  getSavedTwoWaySpreadsheetId,
  saveTwoWaySpreadsheetId,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  getLastSyncTime,
  getSyncAuditLogs,
  addSyncAuditLog,
  getStoredConflicts,
  saveStoredConflicts,
  createFirmTwoWaySpreadsheet,
  exportAllSoftwareToSheets,
  readAndValidateGoogleSheetsData,
  writeBackGeneratedFarmerIds,
  SHEET_NAMES,
  TABLE_METADATA,
  SoftwareDataSnapshot,
  SheetImportResult
} from '../services/googleSheetsTwoWaySync';
import {
  initAuth,
  googleSignIn,
  getAccessToken,
  setCachedAccessToken,
  logoutGoogle
} from '../services/firebaseAuth';
import {
  getSameFarmerAdjustments,
  getPaymentTransfers,
  getBagTransfers
} from '../utils/farmerAdjustmentsStorage';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncContextType {
  // Auth state
  currentUser: User | null;
  accessToken: string | null;
  isAuthenticating: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  setManualAccessToken: (token: string) => void;

  // Sheet connection
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  connectSpreadsheet: (sheetId: string) => Promise<void>;
  createNewSpreadsheetForFirm: () => Promise<string>;
  disconnectSpreadsheet: () => void;

  // Sync state
  syncStatus: SheetSyncStatus;
  lastSyncTime: string | null;
  autoSyncEnabled: boolean;
  toggleAutoSync: () => void;
  syncNow: () => Promise<void>;
  backupToGoogleSheets: () => Promise<void>;
  importFromGoogleSheets: () => Promise<SheetImportResult | null>;

  // Conflicts
  conflicts: SyncConflict[];
  resolveConflict: (conflictId: string, resolution: 'SOFTWARE' | 'GOOGLE_SHEETS') => void;

  // Audit Logs & Stats
  auditLogs: SyncAuditLog[];
  tableStats: TableSyncStats[];
  latestImportResult: SheetImportResult | null;
  clearImportResult: () => void;
}

const GoogleSheetsSyncContext = createContext<GoogleSheetsSyncContextType | undefined>(undefined);

export const GoogleSheetsSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mandi = useMandi();
  const { notifySaveSuccess, notifyError } = useNotification();

  // Auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Connection
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => getSavedTwoWaySpreadsheetId());
  const spreadsheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null;

  // Sync states
  const [syncStatus, setSyncStatus] = useState<SheetSyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => getLastSyncTime());
  const [autoSyncEnabled, setAutoSync] = useState<boolean>(() => getAutoSyncEnabled());
  const [conflicts, setConflicts] = useState<SyncConflict[]>(() => getStoredConflicts());
  const [auditLogs, setAuditLogs] = useState<SyncAuditLog[]>(() => getSyncAuditLogs());
  const [latestImportResult, setLatestImportResult] = useState<SheetImportResult | null>(null);

  // Background auto-sync interval ref
  const autoSyncIntervalRef = useRef<any>(null);

  // Initialize Firebase Auth listener on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        if (spreadsheetId) {
          setSyncStatus('connected');
        }
      },
      () => {
        // Fallback: check if an access token was stored in memory/session
        getAccessToken().then((tok) => {
          if (tok) {
            setAccessToken(tok);
            if (spreadsheetId) setSyncStatus('connected');
          }
        });
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [spreadsheetId]);

  // Handle Google Sign In
  const signInWithGoogle = async () => {
    try {
      setIsAuthenticating(true);
      const res = await googleSignIn();
      setCurrentUser(res.user);
      setAccessToken(res.accessToken);
      if (spreadsheetId) {
        setSyncStatus('connected');
      }
      notifySaveSuccess({
        titleEn: 'Google Connected',
        titlePa: 'ਗੂਗਲ ਕਨੈਕਟ ਹੋ ਗਿਆ',
        messageEn: `Authenticated as ${res.user.email || 'Google User'}`,
        messagePa: `ਗੂਗਲ ਖਾਤਾ ਕਨੈਕਟ ਹੋ ਗਿਆ: ${res.user.email || ''}`
      });
    } catch (err: any) {
      console.error('Google Sign-in failed', err);
      notifyError({
        titleEn: 'Sign-in Failed',
        titlePa: 'ਸਾਈਨ-ਇਨ ਫੇਲ੍ਹ',
        messageEn: err.message || 'Could not authenticate with Google'
      });
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOutGoogle = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setAccessToken(null);
    setSyncStatus('idle');
  };

  const setManualAccessToken = (token: string) => {
    const trimmed = token.trim();
    if (trimmed) {
      setCachedAccessToken(trimmed, 3600);
      setAccessToken(trimmed);
      if (spreadsheetId) {
        setSyncStatus('connected');
      }
      notifySaveSuccess({
        titleEn: 'Access Token Saved',
        titlePa: 'ਟੋਕਨ ਸੇਵ ਹੋ ਗਿਆ',
        messageEn: 'Google OAuth token is active for this session'
      });
    }
  };

  // Helper to build data snapshot
  const getSnapshot = useCallback((): SoftwareDataSnapshot => {
    return {
      farmers: mandi.farmers,
      bagsEntries: mandi.bagsEntries,
      dailyPurchases: mandi.dailyPurchaseRecords,
      leftingRecords: mandi.leftingRecords,
      bardanaRecords: mandi.bardanaRecords,
      advanceRecords: mandi.farmerAdvances,
      recycleBinItems: mandi.recycleBinItems
    };
  }, [
    mandi.farmers,
    mandi.bagsEntries,
    mandi.dailyPurchaseRecords,
    mandi.leftingRecords,
    mandi.bardanaRecords,
    mandi.farmerAdvances,
    mandi.recycleBinItems
  ]);

  // Connect Spreadsheet
  const connectSpreadsheet = async (sheetId: string) => {
    const cleanId = sheetId.trim();
    if (!cleanId) return;

    if (!accessToken) {
      saveTwoWaySpreadsheetId(cleanId);
      setSpreadsheetId(cleanId);
      return;
    }

    try {
      setSyncStatus('syncing');
      saveTwoWaySpreadsheetId(cleanId);
      setSpreadsheetId(cleanId);
      setSyncStatus('connected');
      notifySaveSuccess({
        titleEn: 'Spreadsheet Connected',
        titlePa: 'ਗੂਗਲ ਸ਼ੀਟ ਕਨੈਕਟ ਹੋ ਗਈ',
        messageEn: `Connected to Google Sheet ID: ${cleanId}`
      });
      addSyncAuditLog({
        source: 'SOFTWARE',
        action: 'UPDATE',
        table: 'farmers',
        recordId: cleanId,
        user: currentUser?.email || 'User',
        details: `Connected spreadsheet ${cleanId}`,
        status: 'SUCCESS'
      });
      setAuditLogs(getSyncAuditLogs());
    } catch (err: any) {
      setSyncStatus('error');
      notifyError({
        titleEn: 'Connection Failed',
        titlePa: 'ਕਨੈਕਸ਼ਨ ਫੇਲ੍ਹ',
        messageEn: err.message
      });
    }
  };

  // Create new Firm spreadsheet
  const createNewSpreadsheetForFirm = async (): Promise<string> => {
    if (!accessToken) {
      throw new Error('Please sign in with Google first');
    }

    setSyncStatus('syncing');
    try {
      const firmName = mandi.activeFirm?.name || 'Jammu Trading Co';
      const created = await createFirmTwoWaySpreadsheet(accessToken, firmName);
      setSpreadsheetId(created.spreadsheetId);

      // Perform initial backup of all existing data
      const snapshot = getSnapshot();
      await exportAllSoftwareToSheets(accessToken, created.spreadsheetId, snapshot);

      setSyncStatus('connected');
      setLastSyncTime(new Date().toISOString());
      setAuditLogs(getSyncAuditLogs());

      notifySaveSuccess({
        titleEn: 'Google Sheets Created & Backed Up',
        titlePa: 'ਗੂਗਲ ਸ਼ੀਟਸ ਤਿਆਰ ਤੇ ਬੈਕਅੱਪ ਹੋ ਗਈ',
        messageEn: `Created "${firmName} - Mandi Data Two-Way Backup & Sync" with all 9 tables`
      });
      return created.spreadsheetId;
    } catch (err: any) {
      setSyncStatus('error');
      notifyError({
        titleEn: 'Failed to create Google Sheet',
        titlePa: 'ਗੂਗਲ ਸ਼ੀਟ ਬਣਾਉਣ ਵਿੱਚ ਗਲਤੀ',
        messageEn: err.message
      });
      throw err;
    }
  };

  const disconnectSpreadsheet = () => {
    localStorage.removeItem('punjab_mandi_two_way_sheet_id_v2');
    setSpreadsheetId(null);
    setSyncStatus('idle');
  };

  // Toggle Auto-Sync
  const toggleAutoSync = () => {
    const nextVal = !autoSyncEnabled;
    setAutoSync(nextVal);
    setAutoSyncEnabled(nextVal);
    notifySaveSuccess({
      titleEn: nextVal ? 'Auto-Sync Enabled' : 'Auto-Sync Disabled',
      titlePa: nextVal ? 'ਆਟੋ-ਸਿੰਕ ਚਾਲੂ ਹੋ ਗਿਆ' : 'ਆਟੋ-ਸਿੰਕ ਬੰਦ ਹੋ ਗਿਆ',
      messageEn: nextVal ? 'Software will periodically check and sync with Google Sheets' : 'Sync is now manual'
    });
  };

  // Full Backup: Software -> Sheets
  const backupToGoogleSheets = async () => {
    if (!accessToken || !spreadsheetId) {
      notifyError({
        titleEn: 'Not Connected',
        titlePa: 'ਕਨੈਕਟ ਨਹੀਂ ਹੈ',
        messageEn: 'Please connect your Google account and spreadsheet first'
      });
      return;
    }

    try {
      setSyncStatus('syncing');
      const snapshot = getSnapshot();
      const res = await exportAllSoftwareToSheets(accessToken, spreadsheetId, snapshot);

      setSyncStatus('connected');
      const now = new Date().toISOString();
      setLastSyncTime(now);
      setAuditLogs(getSyncAuditLogs());

      notifySaveSuccess({
        titleEn: 'Backup Completed',
        titlePa: 'ਬੈਕਅੱਪ ਮੁਕੰਮਲ',
        messageEn: `Successfully backed up ${res.totalExported} records across all 9 tables to Google Sheets`
      });
    } catch (err: any) {
      setSyncStatus('error');
      notifyError({
        titleEn: 'Backup Failed',
        titlePa: 'ਬੈਕਅੱਪ ਫੇਲ੍ਹ',
        messageEn: err.message
      });
      addSyncAuditLog({
        source: 'SOFTWARE',
        action: 'EXPORT',
        table: 'farmers',
        recordId: 'ERROR',
        user: currentUser?.email || 'User',
        details: `Backup error: ${err.message}`,
        status: 'ERROR'
      });
      setAuditLogs(getSyncAuditLogs());
    }
  };

  // Full Import: Sheets -> Software
  const importFromGoogleSheets = async (): Promise<SheetImportResult | null> => {
    if (!accessToken || !spreadsheetId) {
      notifyError({
        titleEn: 'Not Connected',
        titlePa: 'ਕਨੈਕਟ ਨਹੀਂ ਹੈ',
        messageEn: 'Please connect your Google account and spreadsheet first'
      });
      return null;
    }

    try {
      setSyncStatus('syncing');
      const snapshot = getSnapshot();
      const result = await readAndValidateGoogleSheetsData(accessToken, spreadsheetId, snapshot);

      // Commit new/updated farmers
      if (result.newFarmers.length > 0) {
        result.newFarmers.forEach((f) => {
          mandi.registerFarmer(f);
        });
      }
      if (result.updatedFarmers.length > 0) {
        result.updatedFarmers.forEach((f) => {
          mandi.updateFarmer(f.id, f);
        });
      }

      // Commit new/updated Bags
      if (result.newBagsEntries.length > 0) {
        result.newBagsEntries.forEach((b) => {
          mandi.addBagsEntry(b);
        });
      }

      // Commit new Purchases
      if (result.newPurchases.length > 0) {
        result.newPurchases.forEach((p) => {
          mandi.addDailyPurchase(p);
        });
      }

      // Commit new Advances
      if (result.newAdvances.length > 0) {
        result.newAdvances.forEach((a) => {
          mandi.addFarmerAdvance(a);
        });
      }

      // If any Farmer IDs were automatically generated, write them back to Google Sheets!
      if (result.generatedFarmerIds.length > 0) {
        await writeBackGeneratedFarmerIds(accessToken, spreadsheetId, result.generatedFarmerIds);
      }

      // Store conflicts if any detected
      if (result.conflicts.length > 0) {
        const merged = [...result.conflicts, ...conflicts];
        setConflicts(merged);
        saveStoredConflicts(merged);
      }

      setLatestImportResult(result);
      setSyncStatus('connected');
      const now = new Date().toISOString();
      setLastSyncTime(now);

      const totalImported =
        result.newFarmers.length +
        result.updatedFarmers.length +
        result.newBagsEntries.length +
        result.newPurchases.length +
        result.newAdvances.length;

      addSyncAuditLog({
        source: 'GOOGLE_SHEETS',
        action: 'IMPORT',
        table: 'farmers',
        recordId: 'ALL',
        user: currentUser?.email || 'Google Sheet Sync',
        details: `Imported/Updated ${totalImported} valid records. (${result.conflicts.length} conflicts, ${result.generatedFarmerIds.length} generated IDs)`,
        status: result.conflicts.length > 0 ? 'WARNING' : 'SUCCESS'
      });
      setAuditLogs(getSyncAuditLogs());

      notifySaveSuccess({
        titleEn: 'Google Sheets Import Complete',
        titlePa: 'ਗੂਗਲ ਸ਼ੀਟਸ ਇੰਪੋਰਟ ਮੁਕੰਮਲ',
        messageEn: `Processed sheets: ${totalImported} records synced to software database`
      });

      return result;
    } catch (err: any) {
      setSyncStatus('error');
      notifyError({
        titleEn: 'Import Failed',
        titlePa: 'ਇੰਪੋਰਟ ਫੇਲ੍ਹ',
        messageEn: err.message
      });
      addSyncAuditLog({
        source: 'GOOGLE_SHEETS',
        action: 'IMPORT',
        table: 'farmers',
        recordId: 'ERROR',
        user: currentUser?.email || 'User',
        details: `Import error: ${err.message}`,
        status: 'ERROR'
      });
      setAuditLogs(getSyncAuditLogs());
      return null;
    }
  };

  // Two-Way Sync Now
  const syncNow = async () => {
    if (!accessToken || !spreadsheetId) {
      notifyError({
        titleEn: 'Not Connected',
        titlePa: 'ਕਨੈਕਟ ਨਹੀਂ ਹੈ',
        messageEn: 'Connect your Google account and spreadsheet first'
      });
      return;
    }

    try {
      setSyncStatus('syncing');
      // Step 1: Read changes from Google Sheets & import
      await importFromGoogleSheets();
      // Step 2: Push latest software records to backup
      await backupToGoogleSheets();
      setSyncStatus('connected');
    } catch (err: any) {
      setSyncStatus('error');
      console.error('Two-way sync error', err);
    }
  };

  // Resolve conflict
  const resolveConflict = (conflictId: string, resolution: 'SOFTWARE' | 'GOOGLE_SHEETS') => {
    const found = conflicts.find((c) => c.id === conflictId);
    if (!found) return;

    if (resolution === 'GOOGLE_SHEETS') {
      // Apply Google Sheet value into software
      if (found.table === 'farmers') {
        mandi.updateFarmer(found.recordId, found.sheetValue as any);
      } else if (found.table === 'bags') {
        mandi.updateBagsEntry(found.recordId, found.sheetValue as any);
      }
    }

    const updated = conflicts.filter((c) => c.id !== conflictId);
    setConflicts(updated);
    saveStoredConflicts(updated);

    addSyncAuditLog({
      source: resolution === 'SOFTWARE' ? 'SOFTWARE' : 'GOOGLE_SHEETS',
      action: 'CONFLICT_RESOLVE',
      table: found.table,
      recordId: found.recordId,
      user: currentUser?.email || 'User',
      details: `Resolved conflict for ${found.title} by keeping ${resolution}`,
      status: 'SUCCESS'
    });
    setAuditLogs(getSyncAuditLogs());
    notifySaveSuccess({
      titleEn: 'Conflict Resolved',
      titlePa: 'ਵਿਰੋਧ ਹੱਲ ਹੋ ਗਿਆ',
      messageEn: `Applied ${resolution} values for ${found.title}`
    });
  };

  // Auto-sync polling timer (every 90 seconds if enabled)
  useEffect(() => {
    if (autoSyncEnabled && accessToken && spreadsheetId) {
      autoSyncIntervalRef.current = setInterval(() => {
        // Run quiet background sync
        importFromGoogleSheets().catch((e) => console.warn('Background sync poll:', e));
      }, 90000);
    }
    return () => {
      if (autoSyncIntervalRef.current) clearInterval(autoSyncIntervalRef.current);
    };
  }, [autoSyncEnabled, accessToken, spreadsheetId]);

  // Compute table statistics
  const tableStats: TableSyncStats[] = (
    Object.keys(TABLE_METADATA) as SyncTableType[]
  ).map((table) => {
    const meta = TABLE_METADATA[table];
    let localCount = 0;
    if (table === 'farmers') localCount = mandi.farmers.length;
    else if (table === 'bags') localCount = mandi.bagsEntries.length;
    else if (table === 'purchases') localCount = mandi.dailyPurchaseRecords.length;
    else if (table === 'lefting') localCount = mandi.leftingRecords.length;
    else if (table === 'bardana') localCount = mandi.bardanaRecords.length;
    else if (table === 'advances') localCount = mandi.farmerAdvances.length;
    else if (table === 'labour') {
      localCount = mandi.bagsEntries.filter((b) => b.labourDeductions).length +
        mandi.dailyPurchaseRecords.filter((p) => p.labourDeductions).length;
    } else if (table === 'adjustments') {
      localCount = getSameFarmerAdjustments().length + getPaymentTransfers().length;
    } else if (table === 'bag_transfers') {
      localCount = getBagTransfers().length;
    }

    return {
      table,
      sheetName: meta.sheetName,
      labelEn: meta.labelEn,
      labelPa: meta.labelPa,
      localCount,
      sheetCount: localCount, // matches on synced state
      lastSyncedAt: lastSyncTime,
      status: syncStatus === 'error' ? 'error' : syncStatus === 'syncing' ? 'pending' : 'synced'
    };
  });

  return (
    <GoogleSheetsSyncContext.Provider
      value={{
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
        clearImportResult: () => setLatestImportResult(null)
      }}
    >
      {children}
    </GoogleSheetsSyncContext.Provider>
  );
};

export const useGoogleSheetsSync = () => {
  const context = useContext(GoogleSheetsSyncContext);
  if (!context) {
    throw new Error('useGoogleSheetsSync must be used within a GoogleSheetsSyncProvider');
  }
  return context;
};
