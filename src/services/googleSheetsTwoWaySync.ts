/**
 * Comprehensive Two-Way Google Sheets Backup & Sync Service
 * Maintains ONE connected Google Spreadsheet for the active firm with 9 dedicated tables:
 * 1. Farmers (Farmers Register)
 * 2. Bags Entries (Bags Entries)
 * 3. Daily Purchase (Daily Purchase)
 * 4. Lefting (Lefting Register)
 * 5. Bardana (Bardana Register)
 * 6. Labour Deductions (Labour Deductions)
 * 7. Advance & Interest (Advance & Interest)
 * 8. Payment Adjustment (Payment Adjustments)
 * 9. Bag Transfer (Bag Transfers)
 */

import {
  Farmer,
  BagsEntryRecord,
  DailyPurchaseRecord,
  LeftingRecord,
  BardanaReceivedRecord,
  FarmerAdvanceRecord
} from '../types/mandi';
import {
  PaymentTransferRecord,
  SameFarmerAdjustmentRecord,
  BagTransferRecord,
  getPaymentTransfers,
  getSameFarmerAdjustments,
  getBagTransfers
} from '../utils/farmerAdjustmentsStorage';
import {
  SyncTableType,
  SyncConflict,
  SyncAuditLog,
  TableSyncStats,
  TableImportSummary,
  ImportValidationIssue
} from '../types/sheetsSync';
import { getMaxFarmerSequence } from '../utils/farmerAuditLog';
import { FIXED_BAG_WEIGHT_KG, FIXED_RATE_PER_QTL } from '../utils/calculations';

const STORAGE_KEY_SPREADSHEET_ID = 'punjab_mandi_two_way_sheet_id_v2';
const STORAGE_KEY_AUDIT_LOGS = 'punjab_mandi_sheet_audit_logs_v2';
const STORAGE_KEY_CONFLICTS = 'punjab_mandi_sheet_conflicts_v2';
const STORAGE_KEY_LAST_SYNC = 'punjab_mandi_sheet_last_sync_v2';
const STORAGE_KEY_AUTO_SYNC_ENABLED = 'punjab_mandi_sheet_auto_sync_enabled_v2';

export const SHEET_NAMES: Record<SyncTableType, string> = {
  farmers: 'Farmers Register',
  bags: 'Bags Entries',
  purchases: 'Daily Purchase',
  lefting: 'Lefting Register',
  bardana: 'Bardana Register',
  labour: 'Labour Deductions',
  advances: 'Advance & Interest',
  adjustments: 'Payment Adjustments',
  bag_transfers: 'Bag Transfers'
};

export const TABLE_METADATA: Record<SyncTableType, { labelEn: string; labelPa: string; sheetName: string }> = {
  farmers: { labelEn: 'Farmers', labelPa: 'ਕਿਸਾਨ ਰਜਿਸਟਰ', sheetName: 'Farmers Register' },
  bags: { labelEn: 'Bags Entries', labelPa: 'ਬੋਰੀਆਂ ਐਂਟਰੀਆਂ', sheetName: 'Bags Entries' },
  purchases: { labelEn: 'Daily Purchase', labelPa: 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ', sheetName: 'Daily Purchase' },
  lefting: { labelEn: 'Lefting Register', labelPa: 'ਲਿਫਟਿੰਗ ਰਜਿਸਟਰ', sheetName: 'Lefting Register' },
  bardana: { labelEn: 'Bardana Register', labelPa: 'ਬਾਰਦਾਨਾ ਰਜਿਸਟਰ', sheetName: 'Bardana Register' },
  labour: { labelEn: 'Labour Deductions', labelPa: 'ਲੇਬਰ ਕਟੌਤੀਆਂ', sheetName: 'Labour Deductions' },
  advances: { labelEn: 'Advance & Interest', labelPa: 'ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ', sheetName: 'Advance & Interest' },
  adjustments: { labelEn: 'Payment Adjustments', labelPa: 'ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ', sheetName: 'Payment Adjustments' },
  bag_transfers: { labelEn: 'Bag Transfers', labelPa: 'ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ', sheetName: 'Bag Transfers' }
};

// Table Column Headers
export const TABLE_HEADERS: Record<SyncTableType, string[]> = {
  farmers: [
    'Record ID',
    'Farmer ID',
    'Farmer Name (English)',
    'ਕਿਸਾਨ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)',
    'Father Name (English)',
    'ਪਿਤਾ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)',
    'Village (English)',
    'ਪਿੰਡ (ਪੰਜਾਬੀ)',
    'Address',
    'PIN Code',
    'Mobile Number',
    'Aadhaar Number',
    'Bank Name',
    'Account Number',
    'IFSC Code',
    'Branch Name',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  bags: [
    'Record ID',
    'Entry No',
    'Date (DD/MM/YYYY)',
    'Farmer ID',
    'Farmer Name',
    'Father Name',
    'Village',
    'Mobile',
    'New Bags',
    'Old Bags',
    'Total Bags',
    'Bag Weight (KG)',
    'Total Bag Weight (KG)',
    'Tota (KG)',
    'Grand Total Weight (KG)',
    'Bardana Type',
    'Rate (₹/Qtl)',
    'Gross Amount (₹)',
    'Labour Deduction (₹)',
    'Net Amount (₹)',
    'Agency',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  purchases: [
    'Record ID',
    'Date (DD/MM/YYYY)',
    'Agency',
    'Farmer ID',
    'Farmer Name',
    'Father Name',
    'Village',
    'Mobile',
    'Bags',
    'New Bags',
    'Old Bags',
    'Qtl',
    'Kg',
    'Total Weight (KG)',
    'Rate (₹/Qtl)',
    'Gross Amount (₹)',
    'Labour Deduction (₹)',
    'Net Amount (₹)',
    'Boli Ref',
    'Gate Pass No',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  lefting: [
    'Record ID',
    'Date (DD/MM/YYYY)',
    'Agency',
    'Destination / Mill',
    'Truck No',
    'Driver Name',
    'Driver Mobile',
    'Truck Union',
    'Bags',
    'Bardana Type',
    'Qtl',
    'Kg',
    'Total Weight (KG)',
    'Gate Pass No',
    'Status (DISPATCHED/DELIVERED)',
    'Remarks',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  bardana: [
    'Record ID',
    'Date (DD/MM/YYYY)',
    'Agency',
    'Action (RECEIVE/PURCHASE/RETURN/GIVE)',
    'Source (SELLER/AGENCY/OTHER)',
    'Party Name',
    'Bardana Type',
    'New Boxes',
    'New Loose Bags',
    'New Bags Total',
    'Old Boxes',
    'Old Loose Bags',
    'Old Bags Total',
    'Total Bags',
    'Remarks',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  labour: [
    'Record ID',
    'Source Table (BAGS/PURCHASE)',
    'Source Entry ID',
    'Date (DD/MM/YYYY)',
    'Farmer ID',
    'Farmer Name',
    'Pakki Rate',
    'Pakki Labour Amount (₹)',
    'Double Rate',
    'Double Labour Amount (₹)',
    'Sukhi Rate',
    'Sukhi Labour Amount (₹)',
    'Custom Deductions (₹)',
    'Total Labour Deductions (₹)',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  advances: [
    'Record ID',
    'Farmer ID',
    'Farmer Name',
    'Start Date (DD/MM/YYYY)',
    'Principal Amount (₹)',
    'Monthly Interest Rate (%)',
    'End Date',
    'Interest Amount (₹)',
    'Total Days',
    'Total Payable (₹)',
    'Payment Mode',
    'Status (ACTIVE/SETTLED/CANCELLED)',
    'Remarks',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  adjustments: [
    'Record ID',
    'Adjustment Type (ADJUSTMENT/INTER_FARMER)',
    'From Farmer ID',
    'From Farmer Name',
    'To Farmer ID',
    'To Farmer Name',
    'Amount (₹)',
    'Date (DD/MM/YYYY)',
    'From Allocation',
    'To Allocation',
    'Reason / Remarks',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ],
  bag_transfers: [
    'Record ID',
    'From Farmer ID',
    'From Farmer Name',
    'To Farmer ID',
    'To Farmer Name',
    'Bags Transferred',
    'Date (DD/MM/YYYY)',
    'Reason / Remarks',
    'Firm ID',
    'Created At',
    'Updated At',
    'Status (ACTIVE/DELETED)'
  ]
};

// Persistence helpers
export function getSavedTwoWaySpreadsheetId(): string | null {
  return localStorage.getItem(STORAGE_KEY_SPREADSHEET_ID);
}

export function saveTwoWaySpreadsheetId(id: string) {
  localStorage.setItem(STORAGE_KEY_SPREADSHEET_ID, id);
}

export function getAutoSyncEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY_AUTO_SYNC_ENABLED) === 'true';
}

export function setAutoSyncEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY_AUTO_SYNC_ENABLED, String(enabled));
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
}

export function saveLastSyncTime() {
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
}

export function getSyncAuditLogs(): SyncAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSyncAuditLog(log: Omit<SyncAuditLog, 'id' | 'timestamp'>) {
  const existing = getSyncAuditLogs();
  const entry: SyncAuditLog = {
    ...log,
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString()
  };
  const updated = [entry, ...existing].slice(0, 200); // keep last 200 logs
  localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(updated));
}

export function getStoredConflicts(): SyncConflict[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFLICTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredConflicts(conflicts: SyncConflict[]) {
  localStorage.setItem(STORAGE_KEY_CONFLICTS, JSON.stringify(conflicts));
}

// -------------------------------------------------------------
// ROW CONVERTERS (Software Record -> Sheet Row Array)
// -------------------------------------------------------------

export function serializeFarmerToRow(f: Farmer): (string | number)[] {
  return [
    f.id,
    f.id,
    f.farmerName || '',
    f.farmerNamePa || f.farmerName || '',
    f.fatherName || '',
    f.fatherNamePa || f.fatherName || '',
    f.village || '',
    f.villagePa || f.village || '',
    f.address || '',
    f.pinCode || '',
    f.mobile || '',
    f.aadhaar || '',
    f.bankDetails?.bankName || '',
    f.bankDetails?.accountNumber || '',
    f.bankDetails?.ifscCode || '',
    f.bankDetails?.branchName || '',
    f.firmId || 'FIRM-001',
    f.createdAt || new Date().toISOString(),
    f.updatedAt || f.createdAt || new Date().toISOString(),
    f.isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

export function serializeBagsEntryToRow(b: BagsEntryRecord, isDeleted: boolean = false): (string | number)[] {
  return [
    b.id,
    b.entryNumber,
    b.date,
    b.farmerId,
    b.farmerName,
    b.farmerFatherName || '',
    b.farmerVillage,
    b.farmerMobile || '',
    b.newBags || 0,
    b.oldBags || 0,
    b.bags,
    b.weightPerBagKg || FIXED_BAG_WEIGHT_KG,
    b.totalBagsWeightKg,
    b.totaKg || 0,
    b.grandTotalKg,
    b.bardana,
    b.ratePerQtl || FIXED_RATE_PER_QTL,
    b.totalAmount,
    b.labourDeductions?.grandTotalDeductions || 0,
    b.netAmount !== undefined ? b.netAmount : (b.totalAmount - (b.labourDeductions?.grandTotalDeductions || 0)),
    b.agency || '',
    b.firmId || 'FIRM-001',
    b.createdAt || new Date().toISOString(),
    b.createdAt || new Date().toISOString(),
    isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

export function serializePurchaseToRow(p: DailyPurchaseRecord, isDeleted: boolean = false): (string | number)[] {
  return [
    p.id,
    p.date,
    p.agency,
    p.farmerId,
    p.farmerName,
    p.fatherName || p.farmerFatherName || '',
    p.village || p.farmerVillage || '',
    p.mobile || p.farmerMobile || '',
    p.bags,
    p.newBags || 0,
    p.oldBags || 0,
    p.qul,
    p.kg,
    p.totalWeightKg,
    p.rate || FIXED_RATE_PER_QTL,
    p.totalAmount,
    p.labourDeductions?.grandTotalDeductions || 0,
    p.netAmount !== undefined ? p.netAmount : p.totalAmount,
    p.boliRef || '',
    p.gatePassNumber || '',
    p.firmId || 'FIRM-001',
    p.createdAt || new Date().toISOString(),
    p.updatedAt || p.createdAt || new Date().toISOString(),
    isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

export function serializeLeftingToRow(l: LeftingRecord, isDeleted: boolean = false): (string | number)[] {
  return [
    l.id,
    l.date,
    l.agency || '',
    l.destination,
    l.truckNo,
    l.driverName,
    l.driverPhone || '',
    l.truckUnion || '',
    l.bags,
    l.bardanaType,
    l.qul,
    l.kg,
    l.totalWeightKg,
    l.gatePassNo || '',
    l.status,
    l.remarks || '',
    l.firmId || 'FIRM-001',
    l.createdAt || new Date().toISOString(),
    l.updatedAt || l.createdAt || new Date().toISOString(),
    isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

export function serializeBardanaToRow(br: BardanaReceivedRecord, isDeleted: boolean = false): (string | number)[] {
  return [
    br.id,
    br.date,
    br.agency,
    br.actionType || 'RECEIVE',
    br.receivedFrom || 'SELLER',
    br.sourceName,
    br.bardanaType,
    br.newBoxCount || 0,
    br.newLooseBags || 0,
    br.newBags || 0,
    br.oldBoxCount || 0,
    br.oldLooseBags || 0,
    br.oldBags || 0,
    br.bags,
    br.remarks || '',
    br.firmId || 'FIRM-001',
    br.createdAt || new Date().toISOString(),
    br.updatedAt || br.createdAt || new Date().toISOString(),
    isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

export function serializeLabourDeductionToRow(
  id: string,
  sourceType: 'BAGS' | 'PURCHASE',
  sourceId: string,
  date: string,
  farmerId: string,
  farmerName: string,
  labour: any,
  firmId: string,
  createdAt: string,
  isDeleted: boolean = false
): (string | number)[] {
  return [
    id,
    sourceType,
    sourceId,
    date,
    farmerId,
    farmerName,
    labour?.pakkiLabourRate || 0,
    labour?.pakkiLabourAmount || 0,
    labour?.pakkaDoubleLabourRate || 0,
    labour?.pakkaDoubleLabourAmount || 0,
    labour?.sukhiLabourRate || 0,
    labour?.sukhiLabourAmount || 0,
    labour?.totalOtherDeduction || 0,
    labour?.grandTotalDeductions || labour?.totalLabourDeduction || 0,
    firmId || 'FIRM-001',
    createdAt || new Date().toISOString(),
    createdAt || new Date().toISOString(),
    isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

export function serializeAdvanceToRow(adv: FarmerAdvanceRecord, isDeleted: boolean = false): (string | number)[] {
  return [
    adv.id,
    adv.farmerId,
    adv.farmerName || '',
    adv.date || adv.startDate || '',
    adv.amount || adv.principal || 0,
    adv.monthlyInterestRate || 2.0,
    adv.interestTillDate || adv.endDate || '',
    adv.interestAmount || 0,
    adv.totalDays || 0,
    adv.totalPayableWithInterest || (adv.amount + adv.interestAmount),
    adv.paymentMode || 'CASH',
    adv.status || 'ACTIVE',
    adv.remarks || '',
    adv.firmId || 'FIRM-001',
    adv.createdAt || new Date().toISOString(),
    adv.updatedAt || adv.createdAt || new Date().toISOString(),
    isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

export function serializeAdjustmentToRow(
  item: SameFarmerAdjustmentRecord | PaymentTransferRecord,
  type: 'ADJUSTMENT' | 'INTER_FARMER',
  isDeleted: boolean = false
): (string | number)[] {
  if (type === 'ADJUSTMENT') {
    const adj = item as SameFarmerAdjustmentRecord;
    return [
      adj.id,
      'ADJUSTMENT',
      adj.farmerId,
      adj.farmerName,
      adj.farmerId,
      adj.farmerName,
      adj.amount,
      adj.date,
      adj.fromAllocation || 'Advance Account',
      adj.toAllocation || 'Purchase Settlement',
      adj.reason || '',
      'FIRM-001',
      adj.createdAt || new Date().toISOString(),
      adj.createdAt || new Date().toISOString(),
      isDeleted ? 'DELETED' : 'ACTIVE'
    ];
  } else {
    const pt = item as PaymentTransferRecord;
    return [
      pt.id,
      'INTER_FARMER',
      pt.fromFarmerId,
      pt.fromFarmerName,
      pt.toFarmerId,
      pt.toFarmerName,
      pt.amount,
      pt.date,
      'Farmer Account',
      'Farmer Account',
      pt.reason || '',
      'FIRM-001',
      pt.createdAt || new Date().toISOString(),
      pt.createdAt || new Date().toISOString(),
      isDeleted ? 'DELETED' : 'ACTIVE'
    ];
  }
}

export function serializeBagTransferToRow(bt: BagTransferRecord, isDeleted: boolean = false): (string | number)[] {
  return [
    bt.id,
    bt.fromFarmerId,
    bt.fromFarmerName,
    bt.toFarmerId,
    bt.toFarmerName,
    bt.bags,
    bt.date,
    bt.reason || '',
    'FIRM-001',
    bt.createdAt || new Date().toISOString(),
    bt.createdAt || new Date().toISOString(),
    isDeleted ? 'DELETED' : 'ACTIVE'
  ];
}

// -------------------------------------------------------------
// GOOGLE SHEETS API: Multi-Sheet Creation & Structure Sync
// -------------------------------------------------------------

export async function createFirmTwoWaySpreadsheet(
  accessToken: string,
  firmName: string = 'Jammu Trading Co'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = `${firmName} - Mandi Data Two-Way Backup & Sync`;
  const sheetsToCreate = Object.entries(SHEET_NAMES).map(([_, sheetName]) => ({
    properties: {
      title: sheetName,
      gridProperties: { frozenRowCount: 1 }
    }
  }));

  const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: sheetsToCreate
    })
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`Google Sheets Create Error (${createResp.status}): ${errText}`);
  }

  const sheetData = await createResp.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write headers for all sheets
  const dataPayload = Object.entries(SHEET_NAMES).map(([tableKey, sheetName]) => ({
    range: `'${sheetName}'!A1`,
    values: [TABLE_HEADERS[tableKey as SyncTableType]]
  }));

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataPayload
    })
  });

  // Apply styling to all header rows (dark emerald header with bold white text)
  try {
    const stylingRequests = sheetData.sheets.map((sheet: any) => ({
      repeatCell: {
        range: {
          sheetId: sheet.properties.sheetId,
          startRowIndex: 0,
          endRowIndex: 1
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.02, green: 0.45, blue: 0.32 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: stylingRequests })
    });
  } catch (err) {
    console.warn('Could not apply header styling:', err);
  }

  saveTwoWaySpreadsheetId(spreadsheetId);
  addSyncAuditLog({
    source: 'SOFTWARE',
    action: 'EXPORT',
    table: 'farmers',
    recordId: spreadsheetId,
    user: 'Authorized User',
    details: `Created new two-way spreadsheet with all 9 tables for firm: ${firmName}`,
    status: 'SUCCESS'
  });

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Ensure all 9 sheets exist in an existing spreadsheet
 */
export async function verifyAndCreateMissingSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const getResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!getResp.ok) {
    throw new Error(`Failed to load Google Sheet metadata (${getResp.status})`);
  }

  const data = await getResp.json();
  const existingSheetTitles = new Set(data.sheets.map((s: any) => s.properties.title));
  const missingSheets: { tableKey: SyncTableType; name: string }[] = [];

  Object.entries(SHEET_NAMES).forEach(([key, name]) => {
    if (!existingSheetTitles.has(name)) {
      missingSheets.push({ tableKey: key as SyncTableType, name });
    }
  });

  if (missingSheets.length > 0) {
    const addRequests = missingSheets.map((m) => ({
      addSheet: {
        properties: {
          title: m.name,
          gridProperties: { frozenRowCount: 1 }
        }
      }
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: addRequests })
    });

    // Populate headers for new sheets
    const headerPayload = missingSheets.map((m) => ({
      range: `'${m.name}'!A1`,
      values: [TABLE_HEADERS[m.tableKey]]
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: headerPayload
      })
    });
  }
}

// -------------------------------------------------------------
// SOFTWARE → GOOGLE SHEETS: Comprehensive Full Backup
// -------------------------------------------------------------

export interface SoftwareDataSnapshot {
  farmers: Farmer[];
  bagsEntries: BagsEntryRecord[];
  dailyPurchases: DailyPurchaseRecord[];
  leftingRecords: LeftingRecord[];
  bardanaRecords: BardanaReceivedRecord[];
  advanceRecords: FarmerAdvanceRecord[];
  recycleBinItems?: any[];
}

export async function exportAllSoftwareToSheets(
  accessToken: string,
  spreadsheetId: string,
  snapshot: SoftwareDataSnapshot
): Promise<{ totalExported: number }> {
  await verifyAndCreateMissingSheets(accessToken, spreadsheetId);

  const paymentTransfers = getPaymentTransfers();
  const sameAdjustments = getSameFarmerAdjustments();
  const bagTransfers = getBagTransfers();

  // 1. Farmers
  const farmerRows: (string | number)[][] = [TABLE_HEADERS.farmers];
  snapshot.farmers.forEach((f) => farmerRows.push(serializeFarmerToRow(f)));

  // 2. Bags
  const bagsRows: (string | number)[][] = [TABLE_HEADERS.bags];
  snapshot.bagsEntries.forEach((b) => bagsRows.push(serializeBagsEntryToRow(b)));

  // 3. Purchases
  const purchaseRows: (string | number)[][] = [TABLE_HEADERS.purchases];
  snapshot.dailyPurchases.forEach((p) => purchaseRows.push(serializePurchaseToRow(p)));

  // 4. Lefting
  const leftingRows: (string | number)[][] = [TABLE_HEADERS.lefting];
  snapshot.leftingRecords.forEach((l) => leftingRows.push(serializeLeftingToRow(l)));

  // 5. Bardana
  const bardanaRows: (string | number)[][] = [TABLE_HEADERS.bardana];
  snapshot.bardanaRecords.forEach((br) => bardanaRows.push(serializeBardanaToRow(br)));

  // 6. Labour Deductions (extracted from Bags and Purchases)
  const labourRows: (string | number)[][] = [TABLE_HEADERS.labour];
  snapshot.bagsEntries.forEach((b) => {
    if (b.labourDeductions) {
      labourRows.push(
        serializeLabourDeductionToRow(
          `LBR-BAG-${b.id}`,
          'BAGS',
          b.entryNumber,
          b.date,
          b.farmerId,
          b.farmerName,
          b.labourDeductions,
          b.firmId || 'FIRM-001',
          b.createdAt
        )
      );
    }
  });
  snapshot.dailyPurchases.forEach((p) => {
    if (p.labourDeductions) {
      labourRows.push(
        serializeLabourDeductionToRow(
          `LBR-PUR-${p.id}`,
          'PURCHASE',
          p.id,
          p.date,
          p.farmerId,
          p.farmerName,
          p.labourDeductions,
          p.firmId || 'FIRM-001',
          p.createdAt
        )
      );
    }
  });

  // 7. Advance & Interest
  const advanceRows: (string | number)[][] = [TABLE_HEADERS.advances];
  snapshot.advanceRecords.forEach((adv) => advanceRows.push(serializeAdvanceToRow(adv)));

  // 8. Payment Adjustment
  const adjustmentRows: (string | number)[][] = [TABLE_HEADERS.adjustments];
  sameAdjustments.forEach((adj) => adjustmentRows.push(serializeAdjustmentToRow(adj, 'ADJUSTMENT')));
  paymentTransfers.forEach((pt) => adjustmentRows.push(serializeAdjustmentToRow(pt, 'INTER_FARMER')));

  // 9. Bag Transfers
  const bagTransferRows: (string | number)[][] = [TABLE_HEADERS.bag_transfers];
  bagTransfers.forEach((bt) => bagTransferRows.push(serializeBagTransferToRow(bt)));

  // Batch Clear & Write for all 9 tables
  const clearRanges = Object.values(SHEET_NAMES).map((name) => `'${name}'!A:Z`);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ranges: clearRanges })
  }).catch(() => {});

  const dataPayload = [
    { range: `'${SHEET_NAMES.farmers}'!A1`, values: farmerRows },
    { range: `'${SHEET_NAMES.bags}'!A1`, values: bagsRows },
    { range: `'${SHEET_NAMES.purchases}'!A1`, values: purchaseRows },
    { range: `'${SHEET_NAMES.lefting}'!A1`, values: leftingRows },
    { range: `'${SHEET_NAMES.bardana}'!A1`, values: bardanaRows },
    { range: `'${SHEET_NAMES.labour}'!A1`, values: labourRows },
    { range: `'${SHEET_NAMES.advances}'!A1`, values: advanceRows },
    { range: `'${SHEET_NAMES.adjustments}'!A1`, values: adjustmentRows },
    { range: `'${SHEET_NAMES.bag_transfers}'!A1`, values: bagTransferRows }
  ];

  const putResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataPayload
    })
  });

  if (!putResp.ok) {
    const errText = await putResp.text();
    throw new Error(`Google Sheets Update Error: ${errText}`);
  }

  saveLastSyncTime();

  const totalRecords =
    snapshot.farmers.length +
    snapshot.bagsEntries.length +
    snapshot.dailyPurchases.length +
    snapshot.leftingRecords.length +
    snapshot.bardanaRecords.length +
    snapshot.advanceRecords.length +
    sameAdjustments.length +
    paymentTransfers.length +
    bagTransfers.length;

  addSyncAuditLog({
    source: 'SOFTWARE',
    action: 'EXPORT',
    table: 'farmers',
    recordId: 'ALL',
    user: 'Software System',
    details: `Backed up all 9 tables (${totalRecords} total records) to Google Sheets`,
    status: 'SUCCESS'
  });

  return { totalExported: totalRecords };
}

// -------------------------------------------------------------
// GOOGLE SHEETS → SOFTWARE: Two-Way Import, Duplicate & Validation
// -------------------------------------------------------------

export interface SheetImportResult {
  tableSummaries: Record<SyncTableType, TableImportSummary>;
  newFarmers: Farmer[];
  updatedFarmers: Farmer[];
  newBagsEntries: BagsEntryRecord[];
  updatedBagsEntries: BagsEntryRecord[];
  newPurchases: DailyPurchaseRecord[];
  updatedPurchases: DailyPurchaseRecord[];
  newLefting: LeftingRecord[];
  newBardana: BardanaReceivedRecord[];
  newAdvances: FarmerAdvanceRecord[];
  newAdjustments: SameFarmerAdjustmentRecord[];
  newPaymentTransfers: PaymentTransferRecord[];
  newBagTransfers: BagTransferRecord[];
  conflicts: SyncConflict[];
  generatedFarmerIds: { rowNumber: number; farmerName: string; generatedId: string }[];
}

export async function readAndValidateGoogleSheetsData(
  accessToken: string,
  spreadsheetId: string,
  existingData: SoftwareDataSnapshot
): Promise<SheetImportResult> {
  await verifyAndCreateMissingSheets(accessToken, spreadsheetId);

  // Read all 9 ranges in a single batch request
  const ranges = Object.values(SHEET_NAMES).map((name) => `'${name}'!A:Z`);
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges
      .map(encodeURIComponent)
      .join('&ranges=')}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to read spreadsheet: ${errText}`);
  }

  const batchData = await resp.json();
  const valueRanges = batchData.valueRanges || [];

  const tableValues: Record<SyncTableType, any[][]> = {
    farmers: [],
    bags: [],
    purchases: [],
    lefting: [],
    bardana: [],
    labour: [],
    advances: [],
    adjustments: [],
    bag_transfers: []
  };

  valueRanges.forEach((vr: any) => {
    const rawRange = vr.range || '';
    Object.entries(SHEET_NAMES).forEach(([key, name]) => {
      if (rawRange.includes(name)) {
        tableValues[key as SyncTableType] = vr.values || [];
      }
    });
  });

  // Prepare result structures
  const result: SheetImportResult = {
    tableSummaries: {
      farmers: initSummary('farmers'),
      bags: initSummary('bags'),
      purchases: initSummary('purchases'),
      lefting: initSummary('lefting'),
      bardana: initSummary('bardana'),
      labour: initSummary('labour'),
      advances: initSummary('advances'),
      adjustments: initSummary('adjustments'),
      bag_transfers: initSummary('bag_transfers')
    },
    newFarmers: [],
    updatedFarmers: [],
    newBagsEntries: [],
    updatedBagsEntries: [],
    newPurchases: [],
    updatedPurchases: [],
    newLefting: [],
    newBardana: [],
    newAdvances: [],
    newAdjustments: [],
    newPaymentTransfers: [],
    newBagTransfers: [],
    conflicts: [],
    generatedFarmerIds: []
  };

  // 1. Process Farmers Register
  let currentMaxSeq = Math.max(getMaxFarmerSequence(), existingData.farmers.length);
  const farmerMap = new Map<string, Farmer>();
  existingData.farmers.forEach((f) => farmerMap.set(f.id, f));

  const farmerRows = tableValues.farmers.slice(1);
  result.tableSummaries.farmers.totalRows = farmerRows.length;

  farmerRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    let farmerId = (row[1] || row[0] || '').toString().trim();
    const farmerNameEn = (row[2] || row[1] || '').toString().trim();
    const farmerNamePa = (row[3] || farmerNameEn).toString().trim();
    const fatherNameEn = (row[4] || row[3] || '').toString().trim();
    const villageEn = (row[6] || row[5] || '').toString().trim();
    const status = (row[19] || row[17] || 'ACTIVE').toString().toUpperCase().trim();

    if (!farmerNameEn && !farmerId) {
      // Empty row, skip
      return;
    }

    // Auto-generate Farmer ID if missing!
    if (!farmerId) {
      currentMaxSeq++;
      farmerId = `FRM${String(currentMaxSeq).padStart(6, '0')}`;
      result.generatedFarmerIds.push({
        rowNumber: rowNum,
        farmerName: farmerNameEn,
        generatedId: farmerId
      });
      result.tableSummaries.farmers.warnings++;
      result.tableSummaries.farmers.issues.push({
        row: rowNum,
        table: 'farmers',
        field: 'Farmer ID',
        message: `Farmer ID was missing. Automatically assigned ${farmerId} for "${farmerNameEn}".`,
        severity: 'WARNING',
        rawData: row
      });
    }

    // Validate Required Fields
    if (!farmerNameEn) {
      result.tableSummaries.farmers.errors++;
      result.tableSummaries.farmers.issues.push({
        row: rowNum,
        table: 'farmers',
        recordId: farmerId,
        field: 'Farmer Name',
        message: 'Farmer Name is required and cannot be blank.',
        severity: 'ERROR',
        rawData: row
      });
      return;
    }

    const existingFarmer = farmerMap.get(farmerId);
    const isDeleted = status === 'DELETED';

    const farmerObj: Farmer = {
      id: farmerId,
      farmerName: farmerNameEn,
      farmerNamePa: farmerNamePa || farmerNameEn,
      fatherName: fatherNameEn,
      fatherNamePa: (row[5] || fatherNameEn).toString().trim(),
      village: villageEn || 'Dana Mandi Kang Khurd',
      villagePa: (row[7] || villageEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ').toString().trim(),
      address: (row[8] || '').toString().trim() || undefined,
      pinCode: (row[9] || '144629').toString().trim(),
      mobile: (row[10] || '').toString().trim(),
      aadhaar: (row[11] || '').toString().trim(),
      bankDetails: {
        accountHolderName: farmerNameEn,
        accountHolderNamePa: farmerNamePa || farmerNameEn,
        bankName: (row[12] || '').toString().trim(),
        accountNumber: (row[13] || '').toString().trim(),
        ifscCode: (row[14] || '').toString().trim(),
        branchName: (row[15] || '').toString().trim()
      },
      firmId: (row[16] || 'FIRM-001').toString().trim(),
      createdAt: (row[17] || new Date().toISOString()).toString().trim(),
      updatedAt: (row[18] || new Date().toISOString()).toString().trim(),
      isDeleted
    };

    if (existingFarmer) {
      // Check conflict if both modified differently
      if (
        existingFarmer.farmerName !== farmerObj.farmerName ||
        existingFarmer.village !== farmerObj.village ||
        existingFarmer.fatherName !== farmerObj.fatherName
      ) {
        result.conflicts.push({
          id: `CONF-FRM-${farmerId}`,
          table: 'farmers',
          recordId: farmerId,
          title: `Farmer: ${existingFarmer.farmerName}`,
          softwareValue: existingFarmer,
          sheetValue: farmerObj,
          softwareUpdatedAt: existingFarmer.updatedAt || existingFarmer.createdAt,
          sheetUpdatedAt: farmerObj.updatedAt || farmerObj.createdAt,
          detectedAt: new Date().toISOString(),
          resolved: false
        });
        result.tableSummaries.farmers.warnings++;
      } else {
        result.updatedFarmers.push(farmerObj);
        result.tableSummaries.farmers.updated++;
      }
      result.tableSummaries.farmers.duplicates++;
    } else {
      result.newFarmers.push(farmerObj);
      farmerMap.set(farmerId, farmerObj);
      result.tableSummaries.farmers.imported++;
    }
  });

  // 2. Process Bags Entries
  const existingBagsMap = new Map<string, BagsEntryRecord>();
  existingData.bagsEntries.forEach((b) => existingBagsMap.set(b.id, b));
  const bagsRows = tableValues.bags.slice(1);
  result.tableSummaries.bags.totalRows = bagsRows.length;

  bagsRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const recordId = (row[0] || '').toString().trim();
    const entryNo = (row[1] || '').toString().trim();
    const date = (row[2] || '').toString().trim();
    const farmerId = (row[3] || '').toString().trim();
    const farmerName = (row[4] || '').toString().trim();
    const bagsCount = parseInt(row[10] || row[8] || '0', 10);
    const grandTotalKg = parseFloat(row[14] || '0');
    const totalAmount = parseFloat(row[17] || '0');
    const status = (row[24] || row[22] || 'ACTIVE').toString().toUpperCase().trim();

    if (!entryNo && !farmerId && !bagsCount) return;

    // Validation
    if (!farmerId || !farmerMap.has(farmerId)) {
      result.tableSummaries.bags.errors++;
      result.tableSummaries.bags.issues.push({
        row: rowNum,
        table: 'bags',
        recordId: recordId || entryNo,
        field: 'Farmer ID',
        message: `Farmer ID "${farmerId}" was not found in the Farmers Register. Please register the farmer first.`,
        severity: 'ERROR',
        rawData: row
      });
      return;
    }

    if (!bagsCount || bagsCount <= 0) {
      result.tableSummaries.bags.errors++;
      result.tableSummaries.bags.issues.push({
        row: rowNum,
        table: 'bags',
        recordId: recordId || entryNo,
        field: 'Bags',
        message: 'Bags count must be a positive integer greater than zero.',
        severity: 'ERROR',
        rawData: row
      });
      return;
    }

    const calculatedWeight = bagsCount * FIXED_BAG_WEIGHT_KG;
    const resolvedGrandKg = grandTotalKg > 0 ? grandTotalKg : calculatedWeight;
    const resolvedAmount = totalAmount > 0 ? totalAmount : (resolvedGrandKg / 100) * FIXED_RATE_PER_QTL;
    const matchedFarmer = farmerMap.get(farmerId);

    const bagEntryObj: BagsEntryRecord = {
      id: recordId || `BAG-SHEET-${Date.now()}-${idx}`,
      entryNumber: entryNo || `BAG-${String(existingData.bagsEntries.length + idx + 1).padStart(5, '0')}`,
      date: date || new Date().toLocaleDateString('en-GB'),
      farmerId,
      farmerName: farmerName || matchedFarmer?.farmerName || '',
      farmerNamePa: matchedFarmer?.farmerNamePa || farmerName || '',
      farmerFatherName: matchedFarmer?.fatherName || (row[5] || '').toString().trim(),
      farmerVillage: matchedFarmer?.village || (row[6] || '').toString().trim(),
      farmerVillagePa: matchedFarmer?.villagePa || matchedFarmer?.village || '',
      farmerMobile: matchedFarmer?.mobile || (row[7] || '').toString().trim(),
      farmerAadhaar: matchedFarmer?.aadhaar || '',
      newBags: parseInt(row[8] || '0', 10),
      oldBags: parseInt(row[9] || '0', 10),
      bags: bagsCount,
      weightPerBagKg: FIXED_BAG_WEIGHT_KG,
      totalBagsWeightKg: calculatedWeight,
      totalBagsWeightDisplay: `${Math.floor(calculatedWeight / 100)} Qul ${(calculatedWeight % 100).toFixed(2)} Kg`,
      totaKg: Math.max(0, resolvedGrandKg - calculatedWeight),
      grandTotalKg: resolvedGrandKg,
      grandTotalDisplay: `${Math.floor(resolvedGrandKg / 100)} Qul ${(resolvedGrandKg % 100).toFixed(2)} Kg`,
      bardana: (row[15] || 'NEW').toString().toUpperCase() as any,
      ratePerQtl: FIXED_RATE_PER_QTL,
      totalAmount: resolvedAmount,
      agency: (row[20] || '').toString().trim(),
      firmId: (row[21] || 'FIRM-001').toString().trim(),
      createdAt: (row[22] || new Date().toISOString()).toString().trim()
    };

    const existingBag = existingBagsMap.get(bagEntryObj.id) || existingData.bagsEntries.find((b) => b.entryNumber === bagEntryObj.entryNumber);

    if (existingBag) {
      if (existingBag.bags !== bagEntryObj.bags || existingBag.grandTotalKg !== bagEntryObj.grandTotalKg) {
        result.conflicts.push({
          id: `CONF-BAG-${bagEntryObj.entryNumber}`,
          table: 'bags',
          recordId: bagEntryObj.entryNumber,
          title: `Bags Entry: ${bagEntryObj.entryNumber} (${bagEntryObj.farmerName})`,
          softwareValue: existingBag,
          sheetValue: bagEntryObj,
          softwareUpdatedAt: existingBag.createdAt,
          sheetUpdatedAt: bagEntryObj.createdAt,
          detectedAt: new Date().toISOString(),
          resolved: false
        });
      } else {
        result.updatedBagsEntries.push(bagEntryObj);
        result.tableSummaries.bags.updated++;
      }
      result.tableSummaries.bags.duplicates++;
    } else {
      result.newBagsEntries.push(bagEntryObj);
      existingBagsMap.set(bagEntryObj.id, bagEntryObj);
      result.tableSummaries.bags.imported++;
    }
  });

  // 3. Process Daily Purchase
  const existingPurMap = new Map<string, DailyPurchaseRecord>();
  existingData.dailyPurchases.forEach((p) => existingPurMap.set(p.id, p));
  const purchaseRows = tableValues.purchases.slice(1);
  result.tableSummaries.purchases.totalRows = purchaseRows.length;

  purchaseRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const recordId = (row[0] || '').toString().trim();
    const date = (row[1] || '').toString().trim();
    const agency = (row[2] || '').toString().trim();
    const farmerId = (row[3] || '').toString().trim();
    const farmerName = (row[4] || '').toString().trim();
    const bags = parseInt(row[8] || '0', 10);
    const qul = parseFloat(row[11] || '0');
    const kg = parseFloat(row[12] || '0');

    if (!agency && !farmerId && !bags) return;

    if (!farmerId || !farmerMap.has(farmerId)) {
      result.tableSummaries.purchases.errors++;
      result.tableSummaries.purchases.issues.push({
        row: rowNum,
        table: 'purchases',
        recordId: recordId,
        field: 'Farmer ID',
        message: `Farmer ID "${farmerId}" was not found. Valid registered farmer required.`,
        severity: 'ERROR',
        rawData: row
      });
      return;
    }

    const totalWeightKg = qul * 100 + kg;
    const matchedFarmer = farmerMap.get(farmerId);
    const rate = parseFloat(row[14] || String(FIXED_RATE_PER_QTL));
    const grossAmt = (totalWeightKg / 100) * rate;

    const purObj: DailyPurchaseRecord = {
      id: recordId || `PUR-SHEET-${Date.now()}-${idx}`,
      date: date || new Date().toLocaleDateString('en-GB'),
      agency: agency || 'Markfed',
      farmerId,
      farmerName: farmerName || matchedFarmer?.farmerName || '',
      farmerNamePa: matchedFarmer?.farmerNamePa || farmerName || '',
      fatherName: matchedFarmer?.fatherName || (row[5] || '').toString().trim(),
      village: matchedFarmer?.village || (row[6] || '').toString().trim(),
      mobile: matchedFarmer?.mobile || (row[7] || '').toString().trim(),
      bags,
      newBags: parseInt(row[9] || '0', 10),
      oldBags: parseInt(row[10] || '0', 10),
      qul,
      kg,
      totalWeightKg,
      totalWeightDisplay: `${qul} Qul ${kg} Kg`,
      rate,
      totalAmount: grossAmt,
      netAmount: grossAmt,
      boliRef: (row[18] || '').toString().trim(),
      gatePassNumber: (row[19] || '').toString().trim(),
      firmId: (row[20] || 'FIRM-001').toString().trim(),
      createdAt: (row[21] || new Date().toISOString()).toString().trim()
    };

    if (existingPurMap.has(purObj.id)) {
      result.updatedPurchases.push(purObj);
      result.tableSummaries.purchases.updated++;
      result.tableSummaries.purchases.duplicates++;
    } else {
      result.newPurchases.push(purObj);
      existingPurMap.set(purObj.id, purObj);
      result.tableSummaries.purchases.imported++;
    }
  });

  // 4. Process Advance & Interest
  const existingAdvMap = new Map<string, FarmerAdvanceRecord>();
  existingData.advanceRecords.forEach((a) => existingAdvMap.set(a.id, a));
  const advanceRows = tableValues.advances.slice(1);
  result.tableSummaries.advances.totalRows = advanceRows.length;

  advanceRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const recordId = (row[0] || '').toString().trim();
    const farmerId = (row[1] || '').toString().trim();
    const farmerName = (row[2] || '').toString().trim();
    const date = (row[3] || '').toString().trim();
    const amount = parseFloat(row[4] || '0');

    if (!farmerId && !amount) return;

    if (!farmerId || !farmerMap.has(farmerId)) {
      result.tableSummaries.advances.errors++;
      result.tableSummaries.advances.issues.push({
        row: rowNum,
        table: 'advances',
        recordId,
        field: 'Farmer ID',
        message: `Advance references unknown Farmer ID "${farmerId}".`,
        severity: 'ERROR',
        rawData: row
      });
      return;
    }

    if (amount <= 0) {
      result.tableSummaries.advances.errors++;
      result.tableSummaries.advances.issues.push({
        row: rowNum,
        table: 'advances',
        recordId,
        field: 'Principal Amount',
        message: 'Advance principal amount must be greater than zero.',
        severity: 'ERROR',
        rawData: row
      });
      return;
    }

    const rate = parseFloat(row[5] || '2.0');
    const advObj: FarmerAdvanceRecord = {
      id: recordId || `ADV-SHEET-${Date.now()}-${idx}`,
      farmerId,
      farmerName: farmerName || farmerMap.get(farmerId)?.farmerName || '',
      date: date || new Date().toLocaleDateString('en-GB'),
      amount,
      principal: amount,
      monthlyInterestRate: rate,
      interestTillDate: (row[6] || '').toString().trim(),
      interestAmount: parseFloat(row[7] || '0'),
      totalDays: parseInt(row[8] || '0', 10),
      monthsElapsed: 0,
      daysElapsed: 0,
      totalPayableWithInterest: parseFloat(row[9] || String(amount)),
      paymentMode: (row[10] || 'CASH') as any,
      status: (row[11] || 'ACTIVE') as any,
      remarks: (row[12] || '').toString().trim(),
      firmId: (row[13] || 'FIRM-001').toString().trim(),
      createdAt: (row[14] || new Date().toISOString()).toString().trim()
    };

    if (existingAdvMap.has(advObj.id)) {
      result.tableSummaries.advances.duplicates++;
    } else {
      result.newAdvances.push(advObj);
      existingAdvMap.set(advObj.id, advObj);
      result.tableSummaries.advances.imported++;
    }
  });

  return result;
}

/**
 * Write generated Farmer IDs back to Google Sheets
 */
export async function writeBackGeneratedFarmerIds(
  accessToken: string,
  spreadsheetId: string,
  generatedIds: { rowNumber: number; farmerName: string; generatedId: string }[]
): Promise<void> {
  if (generatedIds.length === 0) return;

  const dataPayload = generatedIds.map((g) => ({
    range: `'${SHEET_NAMES.farmers}'!B${g.rowNumber}`,
    values: [[g.generatedId]]
  }));

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataPayload
    })
  });
}

function initSummary(table: SyncTableType): TableImportSummary {
  return {
    table,
    sheetName: SHEET_NAMES[table],
    totalRows: 0,
    imported: 0,
    updated: 0,
    duplicates: 0,
    errors: 0,
    warnings: 0,
    issues: []
  };
}

// -------------------------------------------------------------
// DOWNLOAD TEMPLATES FOR EXCEL / GOOGLE SHEETS
// -------------------------------------------------------------

export function downloadTableTemplate(table: SyncTableType) {
  const headers = TABLE_HEADERS[table];
  const csvContent = '\uFEFF' + headers.join(',') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${TABLE_METADATA[table].sheetName}_Template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
