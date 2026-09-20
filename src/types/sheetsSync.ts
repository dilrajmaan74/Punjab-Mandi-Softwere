export type SyncTableType =
  | 'farmers'
  | 'bags'
  | 'purchases'
  | 'lefting'
  | 'bardana'
  | 'labour'
  | 'advances'
  | 'adjustments'
  | 'bag_transfers';

export type SheetSyncStatus = 'idle' | 'syncing' | 'connected' | 'error' | 'pending';

export interface SyncConflict {
  id: string;
  table: SyncTableType;
  recordId: string;
  title: string;
  softwareValue: Record<string, any>;
  sheetValue: Record<string, any>;
  softwareUpdatedAt: string;
  sheetUpdatedAt: string;
  detectedAt: string;
  resolved: boolean;
  chosenWinner?: 'SOFTWARE' | 'GOOGLE_SHEETS';
}

export interface SyncAuditLog {
  id: string;
  timestamp: string;
  source: 'SOFTWARE' | 'GOOGLE_SHEETS';
  action: 'EXPORT' | 'IMPORT' | 'UPDATE' | 'SOFT_DELETE' | 'RESTORE' | 'CONFLICT_RESOLVE';
  table: SyncTableType;
  recordId: string;
  user: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface TableSyncStats {
  table: SyncTableType;
  sheetName: string;
  labelEn: string;
  labelPa: string;
  localCount: number;
  sheetCount: number;
  lastSyncedAt: string | null;
  status: 'synced' | 'pending' | 'error';
}

export interface ImportValidationIssue {
  row: number;
  table: SyncTableType;
  recordId?: string;
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  rawData: any;
}

export interface TableImportSummary {
  table: SyncTableType;
  sheetName: string;
  totalRows: number;
  imported: number;
  updated: number;
  duplicates: number;
  errors: number;
  warnings: number;
  issues: ImportValidationIssue[];
}
