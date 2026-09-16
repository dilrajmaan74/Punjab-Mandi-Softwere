/**
 * Utility for local Excel (.xlsx) and CSV export, import, template generation,
 * duplicate detection and import error/review report generation using sheetjs (xlsx).
 */

import * as XLSX from 'xlsx';
import { Farmer } from '../types/mandi';
import { FARMER_SHEET_HEADERS, farmerToRow, rowToFarmer } from '../services/googleSheetsService';

export interface CandidateFarmer {
  rowIndex: number;
  data: Partial<Farmer> & {
    farmerName: string;
    farmerNamePa?: string;
    fatherName?: string;
    fatherNamePa?: string;
    village?: string;
    villagePa?: string;
    address?: string;
    pinCode?: string;
    mobile?: string;
    aadhaar?: string;
    linkedMainFarmerId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
    firmId?: string;
  };
  isValid: boolean;
  validationError?: string;
}

export type DuplicateMatchReason =
  | 'Aadhaar Number'
  | 'Mobile Number'
  | 'Farmer ID'
  | 'Name + Father Name + Village';

export interface DuplicateFarmerMatch {
  candidate: CandidateFarmer;
  existingFarmer: Farmer;
  matchedBy: DuplicateMatchReason;
  resolution: 'UPDATE' | 'SKIP' | 'REVIEW'; // ONLY these 3 options allowed
}

export interface ImportResultSummary {
  added: number;
  updated: number;
  skipped: number;
  reviewRequired: number;
  errors: number;
  addedFarmers: Farmer[];
  updatedFarmers: Farmer[];
  skippedRecords: { candidate: CandidateFarmer; reason: string }[];
  duplicateRecords: DuplicateFarmerMatch[];
  errorRecords: { row: number; error: string; rawData: any }[];
  timestamp: string;
}

/**
 * 1. FARMER -> EXCEL EXPORT (.xlsx)
 * Exports complete Farmer Register matching software columns
 */
export function exportFarmersToExcelFile(
  farmers: Farmer[],
  filename: string = 'Punjab_Mandi_Farmers_Register.xlsx',
  firmName: string = 'Punjab Mandi'
) {
  const data: (string | number)[][] = [FARMER_SHEET_HEADERS];
  farmers.forEach((f) => {
    data.push(farmerToRow(f));
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 14 }, // ID
    { wch: 22 }, // Name En
    { wch: 22 }, // Name Pa
    { wch: 22 }, // Father En
    { wch: 22 }, // Father Pa
    { wch: 20 }, // Village En
    { wch: 20 }, // Village Pa
    { wch: 24 }, // Address
    { wch: 12 }, // PIN
    { wch: 15 }, // Mobile
    { wch: 18 }, // Aadhaar
    { wch: 18 }, // Linked Main
    { wch: 20 }, // Bank
    { wch: 18 }, // Account No
    { wch: 14 }, // IFSC
    { wch: 18 }, // Branch
    { wch: 12 }, // Firm
    { wch: 24 }  // Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Farmers Register');

  // Metadata sheet
  const metaData = [
    ['Punjab Mandi - Farmer Register Snapshot'],
    ['Firm Name', firmName],
    ['Exported At', new Date().toLocaleString('en-IN')],
    ['Total Records', farmers.length],
    ['Note', 'Single source of truth remains the software database / Supabase cloud.']
  ];
  const metaSheet = XLSX.utils.aoa_to_sheet(metaData);
  XLSX.utils.book_append_sheet(workbook, metaSheet, 'Export Info');

  XLSX.writeFile(workbook, filename);
}

/**
 * CSV Export
 */
export function exportFarmersToCsvFile(
  farmers: Farmer[],
  filename: string = 'Punjab_Mandi_Farmers_Register.csv'
) {
  const data: (string | number)[][] = [FARMER_SHEET_HEADERS];
  farmers.forEach((f) => {
    data.push(farmerToRow(f));
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 2. EXCEL TEMPLATE DOWNLOAD
 * Creates an empty/sample Excel template for unlimited farmers import.
 * Farmer ID is NOT entered by the user; software generates it automatically.
 */
export function downloadFarmerImportTemplate(filename: string = 'Punjab_Mandi_Farmer_Import_Template.xlsx') {
  const templateHeaders = [
    'Farmer Name (English) *ਲਾਜ਼ਮੀ',
    'ਕਿਸਾਨ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)',
    'Father Name (English)',
    'ਪਿਤਾ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)',
    'Village (ਪਿੰਡ) *ਲਾਜ਼ਮੀ',
    'ਪਿੰਡ (ਪੰਜਾਬੀ)',
    'Address (ਪਤਾ)',
    'PIN Code (ਪਿੰਨ ਕੋਡ)',
    'Mobile Number (ਮੋਬਾਈਲ)',
    'Aadhaar Number (ਆਧਾਰ ਨੰਬਰ)',
    'Main Linked Farmer ID (ਮੁੱਖ ਕਿਸਾਨ ਆਈ.ਡੀ, ਜੇਕਰ ਹੋਵੇ e.g. FRM000001)',
    'Bank Name (ਬੈਂਕ ਦਾ ਨਾਂ)',
    'Account Number (ਖਾਤਾ ਨੰਬਰ)',
    'IFSC Code (IFSC ਕੋਡ)',
    'Branch Name (ਸ਼ਾਖਾ ਨਾਂ)'
  ];

  const sampleRows = [
    [
      'Gurpreet Singh',
      'ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ',
      'Harbhajan Singh',
      'ਹਰਭਜਨ ਸਿੰਘ',
      'Kang Khurd',
      'ਕੰਗ ਖੁਰਦ',
      'VPO Kang Khurd, Tehsil Shahkot',
      '144629',
      '9814774651',
      '7845 1290 3412',
      '',
      'State Bank of India',
      '38491029481',
      'SBIN0001234',
      'Lohian Khas'
    ],
    [
      'Sukhdev Singh',
      'ਸੁਖਦੇਵ ਸਿੰਘ',
      'Balwant Singh',
      'ਬਲਵੰਤ ਸਿੰਘ',
      'Kang Kalan',
      'ਕੰਗ ਕਲਾਂ',
      'Near Gurdwara Sahib, Kang Kalan',
      '144629',
      '9417234567',
      '5612 8934 0123',
      'FRM000001',
      'Punjab National Bank',
      '12940001029384',
      'PUNB0129400',
      'Shahkot'
    ]
  ];

  const sheetData = [templateHeaders, ...sampleRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 30 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 25 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Farmer Import Template');

  // Guidelines Sheet
  const instructions = [
    ['Punjab Mandi Software - Farmer Import Guidelines / ਨਿਰਦੇਸ਼'],
    [''],
    ['1. Farmer ID (ਆਈ.ਡੀ):', 'ਕਿਸਾਨ ਆਈ.ਡੀ ਲਿਖਣ ਦੀ ਲੋੜ ਨਹੀਂ ਹੈ। ਸਾਫਟਵੇਅਰ ਆਪਣੇ ਆਪ ਨਵੀਂ ਆਈ.ਡੀ (e.g. FRM000001) ਬਣਾਵੇਗਾ।'],
    ['2. Required Fields (*ਲਾਜ਼ਮੀ):', 'Farmer Name ਅਤੇ Village ਲਿਖਣਾ ਲਾਜ਼ਮੀ ਹੈ। ਬਾਕੀ ਵੇਰਵੇ ਵਿਕਲਪਿਕ ਹਨ।'],
    ['3. Duplicate Prevention (ਡੁਪਲੀਕੇਟ ਰੋਕਥਾਮ):', 'ਆਧਾਰ ਨੰਬਰ, ਮੋਬਾਈਲ ਨੰਬਰ, ਜਾਂ ਨਾਂ + ਪਿਤਾ ਦਾ ਨਾਂ + ਪਿੰਡ ਮਿਲਣ ਤੇ ਸਾਫਟਵੇਅਰ ਚੇਤਾਵਨੀ ਦੇਵੇਗਾ।'],
    ['4. Duplicate Options (ਵਿਕਲਪ):', 'ਸਿਰਫ ਤਿੰਨ ਵਿਕਲਪ ਮਿਲਣਗੇ: Update Existing Farmer, Skip, ਜਾਂ Review Manually.'],
    ['5. Unlimited Farmers (ਅਸੀਮਤ ਕਿਸਾਨ):', 'ਤੁਸੀਂ ਇਸ ਸ਼ੀਟ ਵਿੱਚ ਜਿੰਨੇ ਮਰਜ਼ੀ ਕਿਸਾਨ ਦਰਜ ਕਰਕੇ ਇੱਕੋ ਵਾਰ ਇੰਪੋਰਟ ਕਰ ਸਕਦੇ ਹੋ।']
  ];
  const instrSheet = XLSX.utils.aoa_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instrSheet, 'ਨਿਰਦੇਸ਼ (Instructions)');

  XLSX.writeFile(workbook, filename);
}

/**
 * 3. STRONG DUPLICATE FARMER CHECK
 * Checks Aadhaar, Mobile, Farmer ID, and Name + Father Name + Village
 */
export function matchDuplicateFarmer(
  candidate: CandidateFarmer,
  existingFarmers: Farmer[]
): { isDuplicate: boolean; matchedBy?: DuplicateMatchReason; existingFarmer?: Farmer } {
  const cand = candidate.data;
  const candAadhaar = (cand.aadhaar || '').replace(/\D/g, '');
  const candMobile = (cand.mobile || '').replace(/\D/g, '');
  const candId = (cand.id || '').trim().toUpperCase();
  const candName = (cand.farmerName || '').trim().toLowerCase();
  const candFather = (cand.fatherName || '').trim().toLowerCase();
  const candVillage = (cand.village || '').trim().toLowerCase();

  for (const f of existingFarmers) {
    // 1. Farmer ID match (if ID was explicitly provided)
    if (candId && f.id.trim().toUpperCase() === candId) {
      return {
        isDuplicate: true,
        matchedBy: 'Farmer ID',
        existingFarmer: f
      };
    }

    // 2. Aadhaar match (strongest unique identifier)
    const exAadhaar = (f.aadhaar || '').replace(/\D/g, '');
    if (candAadhaar && exAadhaar && candAadhaar.length >= 10 && candAadhaar === exAadhaar) {
      return {
        isDuplicate: true,
        matchedBy: 'Aadhaar Number',
        existingFarmer: f
      };
    }

    // 3. Mobile Number match (last 10 digits)
    const exMobile = (f.mobile || '').replace(/\D/g, '');
    const cleanCandMob = candMobile.slice(-10);
    const cleanExMob = exMobile.slice(-10);
    if (cleanCandMob && cleanExMob && cleanCandMob.length === 10 && cleanCandMob === cleanExMob) {
      return {
        isDuplicate: true,
        matchedBy: 'Mobile Number',
        existingFarmer: f
      };
    }

    // 4. Name + Father Name + Village match
    const exName = (f.farmerName || '').trim().toLowerCase();
    const exFather = (f.fatherName || '').trim().toLowerCase();
    const exVillage = (f.village || '').trim().toLowerCase();

    if (candName && candVillage && exName === candName && exVillage === candVillage) {
      // If father name exists on either, check if it matches or if village & name match exactly
      if (candFather && exFather) {
        if (candFather === exFather) {
          return {
            isDuplicate: true,
            matchedBy: 'Name + Father Name + Village',
            existingFarmer: f
          };
        }
      } else {
        // Name & Village are identical without conflicting father names
        return {
          isDuplicate: true,
          matchedBy: 'Name + Father Name + Village',
          existingFarmer: f
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Parses raw Excel or CSV file into CandidateFarmer items
 */
export async function parseExcelOrCsvFile(file: File): Promise<{
  candidates: CandidateFarmer[];
  errors: { row: number; error: string; rawData: any }[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawRows.length <= 1) {
          resolve({ candidates: [], errors: [] });
          return;
        }

        const dataRows = rawRows.slice(1);
        const candidates: CandidateFarmer[] = [];
        const errors: { row: number; error: string; rawData: any }[] = [];

        dataRows.forEach((row, idx) => {
          const rowNum = idx + 2; // Row number in Excel sheet (1-based, accounting for header)
          if (!row || row.length === 0 || row.every((c) => c === null || c === undefined || String(c).trim() === '')) {
            return; // Skip empty rows
          }

          // Determine column layout:
          // Layout A: Has Farmer ID at col 0 (17-18 cols)
          // Layout B: Template without Farmer ID (Col 0 is Farmer Name)
          let hasIdCol = false;
          const firstCol = (row[0] || '').toString().trim();
          if (firstCol.toUpperCase().startsWith('FRM') || firstCol.toLowerCase().includes('frm')) {
            hasIdCol = true;
          }

          let farmerData: Partial<Farmer> & any = {};

          if (hasIdCol) {
            // Full export format
            farmerData.id = firstCol.toUpperCase();
            farmerData.farmerName = (row[1] || '').toString().trim();
            farmerData.farmerNamePa = (row[2] || row[1] || '').toString().trim();
            farmerData.fatherName = (row[3] || '').toString().trim();
            farmerData.fatherNamePa = (row[4] || row[3] || '').toString().trim();
            farmerData.village = (row[5] || '').toString().trim();
            farmerData.villagePa = (row[6] || row[5] || '').toString().trim();

            // Check if col 7 is address or pin code
            const col7 = (row[7] || '').toString().trim();
            const col8 = (row[8] || '').toString().trim();
            if (/^\d{6}$/.test(col7)) {
              farmerData.pinCode = col7;
              farmerData.mobile = col8;
              farmerData.aadhaar = (row[9] || '').toString().trim();
              farmerData.linkedMainFarmerId = (row[10] || '').toString().trim();
              farmerData.bankName = (row[11] || '').toString().trim();
              farmerData.accountNumber = (row[12] || '').toString().trim();
              farmerData.ifscCode = (row[13] || '').toString().trim();
              farmerData.branchName = (row[14] || '').toString().trim();
            } else {
              farmerData.address = col7;
              farmerData.pinCode = col8;
              farmerData.mobile = (row[9] || '').toString().trim();
              farmerData.aadhaar = (row[10] || '').toString().trim();
              farmerData.linkedMainFarmerId = (row[11] || '').toString().trim();
              farmerData.bankName = (row[12] || '').toString().trim();
              farmerData.accountNumber = (row[13] || '').toString().trim();
              farmerData.ifscCode = (row[14] || '').toString().trim();
              farmerData.branchName = (row[15] || '').toString().trim();
            }
          } else {
            // Template format (starts with Farmer Name)
            farmerData.farmerName = (row[0] || '').toString().trim();
            farmerData.farmerNamePa = (row[1] || row[0] || '').toString().trim();
            farmerData.fatherName = (row[2] || '').toString().trim();
            farmerData.fatherNamePa = (row[3] || row[2] || '').toString().trim();
            farmerData.village = (row[4] || '').toString().trim();
            farmerData.villagePa = (row[5] || row[4] || '').toString().trim();
            farmerData.address = (row[6] || '').toString().trim();
            farmerData.pinCode = (row[7] || '').toString().trim();
            farmerData.mobile = (row[8] || '').toString().trim();
            farmerData.aadhaar = (row[9] || '').toString().trim();
            farmerData.linkedMainFarmerId = (row[10] || '').toString().trim();
            farmerData.bankName = (row[11] || '').toString().trim();
            farmerData.accountNumber = (row[12] || '').toString().trim();
            farmerData.ifscCode = (row[13] || '').toString().trim();
            farmerData.branchName = (row[14] || '').toString().trim();
          }

          if (!farmerData.farmerName) {
            errors.push({
              row: rowNum,
              error: 'Missing Farmer Name (ਕਿਸਾਨ ਦਾ ਨਾਂ ਗਾਇਬ ਹੈ)',
              rawData: row
            });
            return;
          }

          candidates.push({
            rowIndex: rowNum,
            data: farmerData,
            isValid: true
          });
        });

        resolve({ candidates, errors });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

/**
 * 4. DOWNLOAD IMPORT ERROR / REVIEW REPORT
 * Exports an Excel report summarizing Added, Updated, Skipped, Duplicates, and Errors.
 */
export function downloadImportReviewReport(
  summary: ImportResultSummary,
  filename: string = 'Punjab_Mandi_Import_Report.xlsx'
) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary Overview
  const summaryAoa = [
    ['Punjab Mandi Software - Farmer Import Summary Report'],
    ['Generated At', summary.timestamp],
    [''],
    ['Status Metric', 'Count', 'Description / ਨਿਰਦੇਸ਼'],
    ['Added (ਨਵੇਂ ਕਿਸਾਨ ਸ਼ਾਮਲ)', summary.added, 'Successfully assigned new Farmer ID and saved to database'],
    ['Updated (ਅੱਪਡੇਟ ਕੀਤੇ)', summary.updated, 'Existing farmer record was confirmed and updated'],
    ['Skipped (ਛੱਡੇ ਗਏ)', summary.skipped, 'User chose to skip importing this record'],
    ['Duplicate / Review Required', summary.reviewRequired, 'Flagged as potential duplicate requiring manual verification'],
    ['Errors (ਖਾਮੀਆਂ)', summary.errors, 'Invalid or malformed rows that could not be processed']
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa);
  worksheetAutoWidth(summarySheet);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Import Summary');

  // Sheet 2: Duplicates & Review Items
  if (summary.duplicateRecords.length > 0) {
    const dupHeaders = [
      'Import Row #',
      'Matched By',
      'Resolution Option',
      'Imported Farmer Name',
      'Imported Village',
      'Imported Mobile',
      'Imported Aadhaar',
      'Existing Farmer ID',
      'Existing Farmer Name',
      'Existing Village',
      'Existing Mobile',
      'Existing Aadhaar'
    ];
    const dupRows = summary.duplicateRecords.map((d) => [
      d.candidate.rowIndex,
      d.matchedBy,
      d.resolution,
      d.candidate.data.farmerName,
      d.candidate.data.village || '',
      d.candidate.data.mobile || '',
      d.candidate.data.aadhaar || '',
      d.existingFarmer.id,
      d.existingFarmer.farmerName,
      d.existingFarmer.village || '',
      d.existingFarmer.mobile || '',
      d.existingFarmer.aadhaar || ''
    ]);

    const dupSheet = XLSX.utils.aoa_to_sheet([dupHeaders, ...dupRows]);
    worksheetAutoWidth(dupSheet);
    XLSX.utils.book_append_sheet(workbook, dupSheet, 'Duplicates & Review');
  }

  // Sheet 3: Errors (if any)
  if (summary.errorRecords.length > 0) {
    const errHeaders = ['Row #', 'Error Message', 'Raw Data Snippet'];
    const errRows = summary.errorRecords.map((e) => [
      e.row,
      e.error,
      Array.isArray(e.rawData) ? e.rawData.slice(0, 5).join(' | ') : String(e.rawData)
    ]);
    const errSheet = XLSX.utils.aoa_to_sheet([errHeaders, ...errRows]);
    worksheetAutoWidth(errSheet);
    XLSX.utils.book_append_sheet(workbook, errSheet, 'Error Rows');
  }

  XLSX.writeFile(workbook, filename);
}

function worksheetAutoWidth(worksheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z50');
  const cols = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v) {
        maxLen = Math.max(maxLen, String(cell.v).length + 2);
      }
    }
    cols.push({ wch: Math.min(maxLen, 45) });
  }
  worksheet['!cols'] = cols;
}
