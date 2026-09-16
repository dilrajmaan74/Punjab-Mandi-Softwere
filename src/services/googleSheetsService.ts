/**
 * Google Workspace & Sheets Integration Service
 * Uses Google Identity Services (token client) or manual access token for
 * authorized calls to Google Sheets API v4 and Google Drive API v3.
 */

import { Farmer } from '../types/mandi';

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface GoogleAuthUser {
  email?: string;
  accessToken: string;
  expiresAt: number;
}

const STORAGE_KEY_AUTH = 'punjab_mandi_google_auth_v1';
const STORAGE_KEY_SYNCED_SHEET_ID = 'punjab_mandi_synced_sheet_id_v1';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
].join(' ');

// Injected client ID from OAuth setup or user settings
let tokenClient: any = null;

export function getStoredGoogleAuth(): GoogleAuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveGoogleAuth(auth: GoogleAuthUser) {
  try {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth));
  } catch (e) {
    console.error('Failed to save google auth', e);
  }
}

export function clearGoogleAuth() {
  localStorage.removeItem(STORAGE_KEY_AUTH);
}

export function getStoredSheetId(): string | null {
  return localStorage.getItem(STORAGE_KEY_SYNCED_SHEET_ID);
}

export function saveStoredSheetId(sheetId: string) {
  localStorage.setItem(STORAGE_KEY_SYNCED_SHEET_ID, sheetId);
}

/**
 * Standard column headers for the Punjab Mandi Farmer Register sheet
 */
export const FARMER_SHEET_HEADERS = [
  'Farmer ID (ਆਈ.ਡੀ)',
  'Farmer Name (English)',
  'ਕਿਸਾਨ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)',
  'Father Name (English)',
  'ਪਿਤਾ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)',
  'Village (ਪਿੰਡ)',
  'ਪਿੰਡ (ਪੰਜਾਬੀ)',
  'Address (ਪਤਾ)',
  'PIN Code (ਪਿੰਨ ਕੋਡ)',
  'Mobile Number (ਮੋਬਾਈਲ)',
  'Aadhaar Number (ਆਧਾਰ ਨੰਬਰ)',
  'Main Linked Farmer ID (ਮੁੱਖ ਕਿਸਾਨ)',
  'Bank Name (ਬੈਂਕ ਨਾਂ)',
  'Account Number (ਖਾਤਾ ਨੰਬਰ)',
  'IFSC Code (IFSC ਕੋਡ)',
  'Branch Name (ਸ਼ਾਖਾ ਨਾਂ)',
  'Firm ID (ਫਰਮ)',
  'Registered Date (ਤਾਰੀਖ)'
];

/**
 * Converts a Farmer object to an array of cell values
 */
export function farmerToRow(farmer: Farmer): (string | number)[] {
  return [
    farmer.id || '',
    farmer.farmerName || '',
    farmer.farmerNamePa || farmer.farmerName || '',
    farmer.fatherName || '',
    farmer.fatherNamePa || farmer.fatherName || '',
    farmer.village || '',
    farmer.villagePa || farmer.village || '',
    farmer.address || '',
    farmer.pinCode || '',
    farmer.mobile || '',
    farmer.aadhaar || '',
    farmer.linkedMainFarmerId ? `${farmer.linkedMainFarmerId} (${farmer.linkedMainFarmerName || ''})` : '',
    farmer.bankDetails?.bankName || '',
    farmer.bankDetails?.accountNumber || '',
    farmer.bankDetails?.ifscCode || '',
    farmer.bankDetails?.branchName || '',
    farmer.firmId || 'FIRM-001',
    farmer.createdAt || new Date().toISOString()
  ];
}

/**
 * Parses row values into a Farmer object (supports both 17 and 18 column layouts)
 */
export function rowToFarmer(row: any[], index: number): Farmer | null {
  if (!row || row.length === 0) return null;
  const id = (row[0] || '').toString().trim();
  const farmerName = (row[1] || '').toString().trim();
  if (!farmerName && !id) return null;

  const farmerNamePa = (row[2] || farmerName).toString().trim();
  const fatherName = (row[3] || '').toString().trim();
  const fatherNamePa = (row[4] || fatherName).toString().trim();
  const village = (row[5] || '').toString().trim();
  const villagePa = (row[6] || village).toString().trim();

  // Detect whether row has 18 columns (with Address) or 17 columns (without Address)
  const col7 = (row[7] || '').toString().trim();
  const col8 = (row[8] || '').toString().trim();
  const hasAddressCol = !/^\d{6}$/.test(col7) && /^\d{6}$/.test(col8);

  const address = hasAddressCol ? col7 : '';
  const pinCode = (hasAddressCol ? col8 : col7).replace(/\D/g, '');
  const mobile = (row[hasAddressCol ? 9 : 8] || '').toString().trim();
  const aadhaar = (row[hasAddressCol ? 10 : 9] || '').toString().trim();
  const linkedMainRaw = (row[hasAddressCol ? 11 : 10] || '').toString().trim();

  let linkedMainFarmerId: string | undefined;
  let linkedMainFarmerName: string | undefined;
  if (linkedMainRaw) {
    const match = linkedMainRaw.match(/^(FRM\d+)(?:\s*\((.*)\))?/i);
    if (match) {
      linkedMainFarmerId = match[1].toUpperCase();
      linkedMainFarmerName = match[2]?.trim();
    } else {
      linkedMainFarmerId = linkedMainRaw;
    }
  }

  const bankName = (row[hasAddressCol ? 12 : 11] || '').toString().trim();
  const accountNumber = (row[hasAddressCol ? 13 : 12] || '').toString().trim();
  const ifscCode = (row[hasAddressCol ? 14 : 13] || '').toString().trim();
  const branchName = (row[hasAddressCol ? 15 : 14] || '').toString().trim();
  const firmId = (row[hasAddressCol ? 16 : 15] || 'FIRM-001').toString().trim();
  const createdAt = (row[hasAddressCol ? 17 : 16] || new Date().toISOString()).toString().trim();

  const farmer: Farmer = {
    id: id || `FRM${String(index + 1).padStart(6, '0')}`,
    farmerName: farmerName || 'Unknown Farmer',
    farmerNamePa: farmerNamePa || farmerName || 'ਅਣਜਾਣ ਕਿਸਾਨ',
    fatherName: fatherName || '',
    fatherNamePa: fatherNamePa || fatherName || '',
    village: village || 'Dana Mandi Kang Khurd',
    villagePa: villagePa || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ',
    address: address || undefined,
    pinCode: pinCode || '144629',
    mobile: mobile || '',
    aadhaar: aadhaar || '',
    firmId,
    createdAt
  };

  if (linkedMainFarmerId) {
    farmer.linkedMainFarmerId = linkedMainFarmerId;
    farmer.linkedMainFarmerName = linkedMainFarmerName;
  }

  if (accountNumber || ifscCode || bankName) {
    farmer.bankDetails = {
      accountHolderName: farmerName,
      accountHolderNamePa: farmerNamePa,
      accountNumber,
      ifscCode,
      bankName,
      branchName
    };
  }

  return farmer;
}

/**
 * Initialize Google Token Client using GSI if available
 */
export function initGoogleTokenClient(
  clientId: string,
  onTokenResponse: (token: string, expiresIn: number) => void,
  onError?: (err: any) => void
): boolean {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    return false;
  }

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) {
          if (onError) onError(resp);
          return;
        }
        const expiresIn = resp.expires_in ? parseInt(resp.expires_in, 10) : 3600;
        onTokenResponse(resp.access_token, expiresIn);
      }
    });
    return true;
  } catch (e) {
    console.error('Failed to init google token client', e);
    if (onError) onError(e);
    return false;
  }
}

export function requestGoogleAccessToken() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    throw new Error('Google OAuth token client is not initialized yet.');
  }
}

/**
 * Create a new Google Spreadsheet in the user's Google Drive
 */
export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string = 'Punjab Mandi - ਕਿਸਾਨ ਰਜਿਸਟਰ (Farmer Register)',
  farmers: Farmer[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create Spreadsheet with title and formatted Sheet1
  const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: [
        {
          properties: {
            title: 'Farmers Register',
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`Google Sheets API Error (${createResp.status}): ${errText}`);
  }

  const sheetData = await createResp.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Headers + Farmer rows
  const rows: (string | number)[][] = [FARMER_SHEET_HEADERS];
  farmers.forEach((f) => {
    rows.push(farmerToRow(f));
  });

  const valueResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Farmers%20Register!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  if (!valueResp.ok) {
    const errText = await valueResp.text();
    console.warn('Could not populate initial rows:', errText);
  }

  // 3. Format header row with emerald background and bold white text
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.02, green: 0.5, blue: 0.35 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: FARMER_SHEET_HEADERS.length
              }
            }
          }
        ]
      })
    });
  } catch (err) {
    console.warn('Could not apply header styling:', err);
  }

  saveStoredSheetId(spreadsheetId);
  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Sync / Overwrite farmer records into an existing Google Spreadsheet
 */
export async function syncFarmersToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  farmers: Farmer[]
): Promise<{ updatedRows: number }> {
  // Clear existing sheet content first
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Farmers%20Register!A:Q:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  ).catch(() => {});

  // Prepare full row matrix
  const rows: (string | number)[][] = [FARMER_SHEET_HEADERS];
  farmers.forEach((f) => {
    rows.push(farmerToRow(f));
  });

  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Farmers%20Register!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Google Sheets Update Error (${resp.status}): ${errText}`);
  }

  saveStoredSheetId(spreadsheetId);
  return { updatedRows: farmers.length };
}

/**
 * Append a newly registered farmer row to Google Sheets
 */
export async function appendFarmerToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  farmer: Farmer
): Promise<boolean> {
  try {
    const row = farmerToRow(farmer);
    const resp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Farmers%20Register!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      }
    );
    return resp.ok;
  } catch (err) {
    console.error('Failed to append farmer to Google Sheet', err);
    return false;
  }
}

/**
 * Import farmers from an existing Google Sheet
 */
export async function importFarmersFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ farmers: Farmer[]; total: number }> {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Farmers%20Register!A:Q`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!resp.ok) {
    // Try fallback to Sheet1 if 'Farmers Register' tab was renamed
    const fallbackResp = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Q`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    if (!fallbackResp.ok) {
      const errText = await resp.text();
      throw new Error(`Failed to read Google Sheet (${resp.status}): ${errText}`);
    }
    const data = await fallbackResp.json();
    return parseSheetValues(data.values || []);
  }

  const data = await resp.json();
  return parseSheetValues(data.values || []);
}

function parseSheetValues(values: any[][]): { farmers: Farmer[]; total: number } {
  if (!values || values.length <= 1) {
    return { farmers: [], total: 0 };
  }

  // Row 0 is header row
  const dataRows = values.slice(1);
  const farmers: Farmer[] = [];

  dataRows.forEach((row, idx) => {
    const farmer = rowToFarmer(row, idx);
    if (farmer) {
      farmers.push(farmer);
    }
  });

  return {
    farmers,
    total: farmers.length
  };
}
