/**
 * Pakka (Official & CA Double-Entry Accounting) System Types
 * Covers:
 * - Government I-Form & J-Form Registers
 * - Tally-Grade Chart of Accounts & Ledger Groups
 * - Voucher Entry (Receipt, Payment, Journal, Contra, Sales, Purchase)
 * - TDS Register (Section 194H, 194C, 194A, 194Q)
 * - Automated Profit & Loss Account & Balance Sheet
 */

export type AppMode = 'KACHA' | 'PAKKA';

export type AccountGroup =
  | 'SUNDRY_DEBTORS'     // ਲੈਣਦਾਰੀਆਂ - ਏਜੰਸੀਆਂ, ਖਰੀਦਦਾਰ, ਸ਼ੈਲਰ (Assets)
  | 'SUNDRY_CREDITORS'   // ਦੇਣਦਾਰੀਆਂ - ਕਿਸਾਨ, ਬਾਰਦਾਨਾ ਵਪਾਰੀ, ਠੇਕੇਦਾਰ (Liabilities)
  | 'BANK_ACCOUNTS'       // ਬੈਂਕ ਚਾਲੂ ਖਾਤੇ (Current Assets)
  | 'CASH_IN_HAND'       // ਰੋਕੜ / ਕੈਸ਼ (Current Assets)
  | 'INDIRECT_EXPENSES'  // ਦੁਕਾਨ ਖਰਚੇ, ਮੁਨੀਮ ਤਨਖਾਹ, ਬਿਜਲੀ, ਚਾਹ-ਪਾਣੀ (P&L Debit)
  | 'DIRECT_EXPENSES'    // ਮੰਡੀ ਲੇਬਰ, ਪੱਲੇਦਾਰੀ, ਟਰੱਕ ਭਾੜਾ (Trading Debit)
  | 'DIRECT_INCOME'      // 2.5% ਆੜ੍ਹਤ (Damami), ਲੇਬਰ ਬਚਤ (Trading Credit)
  | 'INDIRECT_INCOME'    // ਵਿਆਜ ਆਮਦਨ, ਬੈਂਕ ਵਿਆਜ (P&L Credit)
  | 'FIXED_ASSETS'       // ਦੁਕਾਨ, ਕੰਪਿਊਟਰ, ਧਰਮ ਕੰਡਾ, ਫਰਨੀਚਰ (Assets)
  | 'CURRENT_ASSETS'     // TDS Receivable, Advance Tax (Assets)
  | 'CURRENT_LIABILITIES'// TDS Payable, Market Committee Fees Payable, RDF (Liabilities)
  | 'LOANS_LIABILITIES'  // ਬੈਂਕ CC ਲਿਮਿਟ ਖਾਤਾ, ਕਰਜ਼ੇ (Liabilities)
  | 'CAPITAL_ACCOUNT';   // ਮਾਲਕ ਦੀ ਪੂੰਜੀ / ਪ੍ਰੋਪਰਾਈਟਰ ਖਾਤਾ (Liabilities)

export interface AccountGroupMeta {
  key: AccountGroup;
  titleEn: string;
  titlePa: string;
  category: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';
  normalBalance: 'DR' | 'CR';
}

export const ACCOUNT_GROUPS: AccountGroupMeta[] = [
  { key: 'SUNDRY_DEBTORS', titleEn: 'Sundry Debtors', titlePa: 'ਲੈਣਦਾਰੀਆਂ (ਏਜੰਸੀਆਂ / ਖਰੀਦਦਾਰ)', category: 'ASSET', normalBalance: 'DR' },
  { key: 'SUNDRY_CREDITORS', titleEn: 'Sundry Creditors', titlePa: 'ਦੇਣਦਾਰੀਆਂ (ਕਿਸਾਨ / ਸਪਲਾਇਰ)', category: 'LIABILITY', normalBalance: 'CR' },
  { key: 'BANK_ACCOUNTS', titleEn: 'Bank Accounts', titlePa: 'ਬੈਂਕ ਖਾਤੇ (Bank Accounts)', category: 'ASSET', normalBalance: 'DR' },
  { key: 'CASH_IN_HAND', titleEn: 'Cash-in-Hand', titlePa: 'ਹੱਥਲੀ ਰੋਕੜ (Cash in Hand)', category: 'ASSET', normalBalance: 'DR' },
  { key: 'INDIRECT_EXPENSES', titleEn: 'Indirect Expenses', titlePa: 'ਅਸਿੱਧੇ ਖਰਚੇ (ਦੁਕਾਨ / ਮੁਨੀਮ ਖਰਚੇ)', category: 'EXPENSE', normalBalance: 'DR' },
  { key: 'DIRECT_EXPENSES', titleEn: 'Direct Expenses', titlePa: 'ਸਿੱਧੇ ਖਰਚੇ (ਮੰਡੀ ਲੇਬਰ / ਭਾੜਾ)', category: 'EXPENSE', normalBalance: 'DR' },
  { key: 'DIRECT_INCOME', titleEn: 'Direct Income (Commission)', titlePa: 'ਸਿੱਧੀ ਆਮਦਨ (2.5% ਆੜ੍ਹਤ ਦਾਮਾਮੀ)', category: 'INCOME', normalBalance: 'CR' },
  { key: 'INDIRECT_INCOME', titleEn: 'Indirect Income', titlePa: 'ਅਸਿੱਧੀ ਆਮਦਨ (ਵਿਆਜ ਆਮਦਨ)', category: 'INCOME', normalBalance: 'CR' },
  { key: 'FIXED_ASSETS', titleEn: 'Fixed Assets', titlePa: 'ਪੱਕੀ ਸੰਪਤੀ (ਕੰਪਿਊਟਰ / ਕੰਡਾ / ਦੁਕਾਨ)', category: 'ASSET', normalBalance: 'DR' },
  { key: 'CURRENT_ASSETS', titleEn: 'Current Assets', titlePa: 'ਚਾਲੂ ਸੰਪਤੀ (TDS Receivable ਆਦਿ)', category: 'ASSET', normalBalance: 'DR' },
  { key: 'CURRENT_LIABILITIES', titleEn: 'Current Liabilities', titlePa: 'ਚਾਲੂ ਦੇਣਦਾਰੀਆਂ (TDS / ਮਾਰਕੀਟ ਫੀਸ)', category: 'LIABILITY', normalBalance: 'CR' },
  { key: 'LOANS_LIABILITIES', titleEn: 'Loans & Liabilities', titlePa: 'ਕਰਜ਼ੇ ਤੇ ਬੈਂਕ ਲਿਮਿਟ (CC Limit)', category: 'LIABILITY', normalBalance: 'CR' },
  { key: 'CAPITAL_ACCOUNT', titleEn: 'Capital Account', titlePa: 'ਮਾਲਕ ਦੀ ਆਪਣੀ ਪੂੰਜੀ (Capital)', category: 'LIABILITY', normalBalance: 'CR' },
];

export interface LedgerAccount {
  id: string; // e.g. "LED-001"
  name: string;
  namePa?: string;
  group: AccountGroup;
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
  pan?: string;
  gstin?: string;
  mobile?: string;
  address?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  fiscalYear: string;
  isSystemLedger?: boolean; // Default ledgers like "Commission Income", "Cash Account", "Labour Charges"
  createdAt: string;
  updatedAt?: string;
}

export type VoucherType =
  | 'RECEIPT'  // ਪੈਸੇ ਆਏ (Dr Bank/Cash, Cr Party)
  | 'PAYMENT'  // ਪੈਸੇ ਦਿੱਤੇ (Dr Party/Expense, Cr Bank/Cash)
  | 'JOURNAL'  // ਐਡਜਸਟਮੈਂਟ (Dr Any, Cr Any)
  | 'CONTRA'   // ਬੈਂਕ ਤੋਂ ਕੈਸ਼ ਜਾਂ ਕੈਸ਼ ਤੋਂ ਬੈਂਕ (Bank <-> Cash)
  | 'PURCHASE' // I-Form Agency Bill
  | 'SALES';   // J-Form Farmer Produce

export interface VoucherEntry {
  id: string;
  voucherNo: string; // e.g. "VCH-2026-001"
  date: string; // DD/MM/YYYY
  fiscalYear: string;
  voucherType: VoucherType;
  debitLedgerId: string;
  debitLedgerName: string;
  creditLedgerId: string;
  creditLedgerName: string;
  amount: number;
  narration: string;
  narrationPa?: string;
  chequeNo?: string;
  chequeDate?: string;
  tdsDeducted?: number;
  tdsSection?: '194H' | '194C' | '194A' | '194Q';
  linkedIFormId?: string;
  linkedJFormId?: string;
  createdAt: string;
}

// Government Mandi I-Form (Agency Purchase Bill)
export interface IFormLabourBreakdown {
  unloadingRate: number;      // ਉਤਰਾਈ (₹/ਬੋਰੀ ਜਾਂ ਕਵਿੰਟਲ)
  unloadingAmount: number;
  sievingRate: number;        // ਛਣਾਈ / ਨਾਲਾਈ
  sievingAmount: number;
  weighingFillingRate: number;// ਤੁਲਾਈ ਤੇ ਭਰਾਈ
  weighingFillingAmount: number;
  stitchingRate: number;      // ਸਿਲਾਈ
  stitchingAmount: number;
  loadingRate: number;        // ਗੱਡੀ ਵਿੱਚ ਲੋਡਿੰਗ
  loadingAmount: number;
  totalLabourAmount: number;
}

export interface IFormRecord {
  id: string; // e.g. "IF-2026-PUN-001"
  iFormNo: string;
  date: string; // DD/MM/YYYY
  fiscalYear: string;
  agency: string; // e.g. "Pungrain", "Markfed"
  agencyPa?: string;
  agencyLedgerId?: string;
  cropType: string; // e.g. "PADDY", "WHEAT"
  
  // Weights and Rates
  totalBags: number;
  totalWeightQtl: number;
  mspRatePerQtl: number; // e.g. ₹2,320
  cropGrossAmount: number; // Weight * MSP

  // Mandi Board Statutory Charges
  damamiRatePercent: number; // Standard 2.5%
  damamiAmount: number;      // Arhtiya Commission
  
  // Mandatory Labour
  labourCharges: IFormLabourBreakdown;

  // Market Fees & RDF
  mdfRatePercent: number; // Standard 3.0% (Market Development Fee)
  mdfAmount: number;
  rdfRatePercent: number; // Standard 3.0% (Rural Development Fund)
  rdfAmount: number;

  // Summary
  totalBillAmount: number; // Gross + Damami + Labour + MDF + RDF
  tdsRatePercent: number;  // Typically 2% under 194H on Damami
  tdsAmount: number;
  netReceivableFromAgency: number; // Total Bill - TDS

  // Security & Protection
  status: 'GENERATED' | 'TRANSFERRED' | 'LOCKED' | 'PAID';
  isLocked: boolean;
  lockedAt?: string;
  lockReason?: string;
  transferDate?: string;
  linkedPurchaseIds: string[];
  createdAt: string;
  updatedAt?: string;
}

// Government Mandi J-Form (Farmer Sale Certificate)
export interface JFormRecord {
  id: string; // e.g. "JF-2026-F101-001"
  jFormNo: string;
  iFormId: string;
  iFormNo: string;
  date: string; // DD/MM/YYYY
  fiscalYear: string;
  farmerId: string;
  farmerName: string;
  farmerNamePa?: string;
  fatherName?: string;
  fatherNamePa?: string;
  village: string;
  villagePa?: string;
  mobile?: string;
  aadhaar?: string;
  cropType: string;
  
  bags: number;
  weightQtl: number;
  ratePerQtl: number;
  grossAmount: number; // weight * rate
  labourDeductions: number; // Pakki/Kacchi labour if any
  netPayableToFarmer: number;
  
  status: 'GENERATED' | 'LOCKED' | 'SETTLED';
  isLocked: boolean;
  createdAt: string;
}

// TDS Register Record
export interface TDSRecord {
  id: string; // e.g. "TDS-001"
  date: string;
  fiscalYear: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  section: '194H' | '194C' | '194A' | '194Q';
  type: 'RECEIVABLE' | 'PAYABLE'; // RECEIVABLE = agency deducted from us; PAYABLE = we deducted from transporter/labour
  partyName: string;
  partyPan?: string;
  partyLedgerId?: string;
  grossAmount: number;
  tdsRatePercent: number;
  tdsAmount: number;
  challanNo?: string;
  challanDate?: string;
  status: 'PENDING' | 'DEPOSITED' | 'CLAIMED';
  referenceVoucherId?: string;
  createdAt: string;
}

// Financial Statement Types
export interface ProfitAndLossStatement {
  fiscalYear: string;
  directIncome: { name: string; amount: number }[];
  totalDirectIncome: number;
  directExpenses: { name: string; amount: number }[];
  totalDirectExpenses: number;
  grossProfit: number;
  indirectIncome: { name: string; amount: number }[];
  totalIndirectIncome: number;
  indirectExpenses: { name: string; amount: number }[];
  totalIndirectExpenses: number;
  netProfit: number;
}

export interface BalanceSheetStatement {
  fiscalYear: string;
  asOfDate: string;
  liabilities: {
    capitalAccount: { name: string; amount: number }[];
    totalCapital: number;
    netProfitAddition: number;
    loansLiabilities: { name: string; amount: number }[];
    totalLoans: number;
    sundryCreditors: { name: string; amount: number }[];
    totalCreditors: number;
    currentLiabilities: { name: string; amount: number }[];
    totalCurrentLiabilities: number;
    grandTotalLiabilities: number;
  };
  assets: {
    fixedAssets: { name: string; amount: number }[];
    totalFixedAssets: number;
    currentAssets: { name: string; amount: number }[];
    totalCurrentAssets: number;
    sundryDebtors: { name: string; amount: number }[];
    totalDebtors: number;
    bankAccounts: { name: string; amount: number }[];
    totalBankAccounts: number;
    cashInHand: number;
    grandTotalAssets: number;
  };
  isBalanced: boolean;
  difference: number;
}
