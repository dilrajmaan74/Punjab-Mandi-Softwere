import {
  LedgerAccount,
  VoucherEntry,
  IFormRecord,
  JFormRecord,
  TDSRecord,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  IFormLabourBreakdown
} from '../types/pakkaAccounting';
import { parseFiscalYear } from './calculations';

export const DEFAULT_I_FORM_RATES = {
  damamiPercent: 2.5,        // 2.5% Commission (ਆੜ੍ਹਤ)
  mdfPercent: 3.0,           // 3.0% Market Development Fee (ਮਾਰਕੀਟ ਫੀਸ)
  rdfPercent: 3.0,           // 3.0% Rural Development Fund (ਪੇਂਡੂ ਵਿਕਾਸ ਫੰਡ)
  tdsPercent: 2.0,           // 2.0% TDS on Damami under Section 194H
  // Statutory Labour Rates in Punjab Mandis (per quintal or per bag)
  unloadingRatePerQtl: 2.76,       // ਉਤਰਾਈ
  sievingRatePerQtl: 3.68,         // ਛਣਾਈ / ਨਾਲਾਈ
  weighingFillingRatePerQtl: 4.14, // ਤੁਲਾਈ ਤੇ ਭਰਾਈ
  stitchingRatePerBag: 1.25,       // ਸਿਲਾਈ
  loadingRatePerQtl: 3.22          // ਗੱਡੀ ਵਿੱਚ ਲੋਡਿੰਗ
};

export const INITIAL_SYSTEM_LEDGERS: Omit<LedgerAccount, 'id' | 'createdAt'>[] = [
  {
    name: 'Commission / Damami Income',
    namePa: 'ਆੜ੍ਹਤ ਕਮਿਸ਼ਨ (2.5% Damami)',
    group: 'DIRECT_INCOME',
    openingBalance: 0,
    openingBalanceType: 'CR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Cash in Hand (Galla)',
    namePa: 'ਰੋਕੜ ਖਾਤਾ (Cash in Hand)',
    group: 'CASH_IN_HAND',
    openingBalance: 50000,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'State Bank of India (SBI Current A/c)',
    namePa: 'ਸਟੇਟ ਬੈਂਕ ਆਫ ਇੰਡੀਆ (ਚਾਲੂ ਖਾਤਾ)',
    group: 'BANK_ACCOUNTS',
    openingBalance: 125000,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    accountNumber: '39485729104',
    ifscCode: 'SBIN0001234',
    isSystemLedger: true
  },
  {
    name: 'HDFC Bank Current A/c',
    namePa: 'ਐਚ.ਡੀ.ਐਫ.ਸੀ. ਬੈਂਕ (ਚਾਲੂ ਖਾਤਾ)',
    group: 'BANK_ACCOUNTS',
    openingBalance: 85000,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    accountNumber: '50200049281745',
    ifscCode: 'HDFC0000456',
    isSystemLedger: true
  },
  {
    name: 'Mandi Labour Expenses (Direct)',
    namePa: 'ਮੰਡੀ ਪੱਲੇਦਾਰੀ ਤੇ ਲੇਬਰ ਖਰਚਾ',
    group: 'DIRECT_EXPENSES',
    openingBalance: 0,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Shop & Office Expenses',
    namePa: 'ਦੁਕਾਨ ਤੇ ਦਫ਼ਤਰੀ ਖਰਚੇ',
    group: 'INDIRECT_EXPENSES',
    openingBalance: 0,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Munim & Staff Salary',
    namePa: 'ਮੁਨੀਮ ਤੇ ਸਟਾਫ਼ ਤਨਖਾਹ',
    group: 'INDIRECT_EXPENSES',
    openingBalance: 0,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Tea, Refreshment & Langar Exp',
    namePa: 'ਚਾਹ-ਪਾਣੀ ਤੇ ਲੰਗਰ ਖਰਚਾ',
    group: 'INDIRECT_EXPENSES',
    openingBalance: 0,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Electricity & Internet Bill',
    namePa: 'ਬਿਜਲੀ ਤੇ ਇੰਟਰਨੈੱਟ ਬਿੱਲ',
    group: 'INDIRECT_EXPENSES',
    openingBalance: 0,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Bank Charges & Interest',
    namePa: 'ਬੈਂਕ ਚਾਰਜਿਜ਼ ਤੇ ਵਿਆਜ',
    group: 'INDIRECT_EXPENSES',
    openingBalance: 0,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Proprietor Capital Account',
    namePa: 'ਮਾਲਕ ਦੀ ਆਪਣੀ ਪੂੰਜੀ (Capital A/c)',
    group: 'CAPITAL_ACCOUNT',
    openingBalance: 500000,
    openingBalanceType: 'CR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Bank CC Limit (Cash Credit)',
    namePa: 'ਬੈਂਕ ਸੀ.ਸੀ. ਲਿਮਿਟ ਖਾਤਾ',
    group: 'LOANS_LIABILITIES',
    openingBalance: 200000,
    openingBalanceType: 'CR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Shop Building & Shed',
    namePa: 'ਦੁਕਾਨ ਦੀ ਇਮਾਰਤ ਤੇ ਸ਼ੈੱਡ',
    group: 'FIXED_ASSETS',
    openingBalance: 1200000,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Electronic Weighing Scale (Dharam Kanda)',
    namePa: 'ਕੰਪਿਊਟਰਾਈਜ਼ਡ ਤੋਲ ਕੰਡਾ',
    group: 'FIXED_ASSETS',
    openingBalance: 45000,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Computer & Office Equipment',
    namePa: 'ਕੰਪਿਊਟਰ ਤੇ ਪ੍ਰਿੰਟਰ ਮਸ਼ੀਨਾਂ',
    group: 'FIXED_ASSETS',
    openingBalance: 35000,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'TDS Receivable (Section 194H)',
    namePa: 'ਕੱਟਿਆ ਟੀ.ਡੀ.ਐਸ. (TDS Receivable - Asset)',
    group: 'CURRENT_ASSETS',
    openingBalance: 0,
    openingBalanceType: 'DR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'TDS Payable (Section 194C Transport/Labour)',
    namePa: 'ਦੇਣਯੋਗ ਟੀ.ਡੀ.ਐਸ. (TDS Payable - Liability)',
    group: 'CURRENT_LIABILITIES',
    openingBalance: 0,
    openingBalanceType: 'CR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Market Committee Fees Payable',
    namePa: 'ਮਾਰਕੀਟ ਕਮੇਟੀ ਫੀਸ (3% MDF Payable)',
    group: 'CURRENT_LIABILITIES',
    openingBalance: 0,
    openingBalanceType: 'CR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  },
  {
    name: 'Rural Development Fund (RDF Payable)',
    namePa: 'ਪੇਂਡੂ ਵਿਕਾਸ ਫੰਡ (3% RDF Payable)',
    group: 'CURRENT_LIABILITIES',
    openingBalance: 0,
    openingBalanceType: 'CR',
    fiscalYear: '2026-27',
    isSystemLedger: true
  }
];

/**
 * Auto-calculate official Punjab Mandi Board I-Form charges
 */
export function calculateIFormDetails(options: {
  totalBags: number;
  totalWeightQtl: number;
  mspRatePerQtl: number;
  rates?: Partial<typeof DEFAULT_I_FORM_RATES>;
}): {
  cropGrossAmount: number;
  damamiAmount: number;
  labourCharges: IFormLabourBreakdown;
  mdfAmount: number;
  rdfAmount: number;
  totalBillAmount: number;
  tdsAmount: number;
  netReceivableFromAgency: number;
} {
  const { totalBags, totalWeightQtl, mspRatePerQtl } = options;
  const rates = { ...DEFAULT_I_FORM_RATES, ...(options.rates || {}) };

  const cropGrossAmount = Math.round(totalWeightQtl * mspRatePerQtl * 100) / 100;
  const damamiAmount = Math.round(((cropGrossAmount * rates.damamiPercent) / 100) * 100) / 100;

  // Labour breakdown
  const unloadingAmount = Math.round(totalWeightQtl * rates.unloadingRatePerQtl * 100) / 100;
  const sievingAmount = Math.round(totalWeightQtl * rates.sievingRatePerQtl * 100) / 100;
  const weighingFillingAmount = Math.round(totalWeightQtl * rates.weighingFillingRatePerQtl * 100) / 100;
  const stitchingAmount = Math.round(totalBags * rates.stitchingRatePerBag * 100) / 100;
  const loadingAmount = Math.round(totalWeightQtl * rates.loadingRatePerQtl * 100) / 100;
  const totalLabourAmount = Math.round((unloadingAmount + sievingAmount + weighingFillingAmount + stitchingAmount + loadingAmount) * 100) / 100;

  const labourCharges: IFormLabourBreakdown = {
    unloadingRate: rates.unloadingRatePerQtl,
    unloadingAmount,
    sievingRate: rates.sievingRatePerQtl,
    sievingAmount,
    weighingFillingRate: rates.weighingFillingRatePerQtl,
    weighingFillingAmount,
    stitchingRate: rates.stitchingRatePerBag,
    stitchingAmount,
    loadingRate: rates.loadingRatePerQtl,
    loadingAmount,
    totalLabourAmount
  };

  const mdfAmount = Math.round(((cropGrossAmount * rates.mdfPercent) / 100) * 100) / 100;
  const rdfAmount = Math.round(((cropGrossAmount * rates.rdfPercent) / 100) * 100) / 100;

  const totalBillAmount = Math.round((cropGrossAmount + damamiAmount + totalLabourAmount + mdfAmount + rdfAmount) * 100) / 100;
  const tdsAmount = Math.round(((damamiAmount * rates.tdsPercent) / 100) * 100) / 100;
  const netReceivableFromAgency = Math.round((totalBillAmount - tdsAmount) * 100) / 100;

  return {
    cropGrossAmount,
    damamiAmount,
    labourCharges,
    mdfAmount,
    rdfAmount,
    totalBillAmount,
    tdsAmount,
    netReceivableFromAgency
  };
}

/**
 * Compute Live Balance for a specific Ledger across all Vouchers
 */
export function calculateLedgerBalance(
  ledger: LedgerAccount,
  vouchers: VoucherEntry[],
  fiscalYear: string
): {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingBalanceType: 'DR' | 'CR';
} {
  const fyVouchers = vouchers.filter((v) => !fiscalYear || fiscalYear === 'ALL' || v.fiscalYear === fiscalYear);

  let totalDebit = 0;
  let totalCredit = 0;

  fyVouchers.forEach((v) => {
    if (v.debitLedgerId === ledger.id) {
      totalDebit += Number(v.amount) || 0;
    }
    if (v.creditLedgerId === ledger.id) {
      totalCredit += Number(v.amount) || 0;
    }
  });

  const openingDebit = ledger.openingBalanceType === 'DR' ? Number(ledger.openingBalance) || 0 : 0;
  const openingCredit = ledger.openingBalanceType === 'CR' ? Number(ledger.openingBalance) || 0 : 0;

  const netDebit = openingDebit + totalDebit;
  const netCredit = openingCredit + totalCredit;

  const diff = netDebit - netCredit;
  const closingBalance = Math.abs(Math.round(diff * 100) / 100);
  const closingBalanceType = diff >= 0 ? 'DR' : 'CR';

  return {
    openingBalance: ledger.openingBalance,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    closingBalance,
    closingBalanceType
  };
}

/**
 * Generate Double-Entry Profit & Loss Statement (Trading & P&L)
 */
export function generateProfitAndLossReport(
  ledgers: LedgerAccount[],
  vouchers: VoucherEntry[],
  fiscalYear: string = '2026-27'
): ProfitAndLossStatement {
  const directIncome: { name: string; amount: number }[] = [];
  const directExpenses: { name: string; amount: number }[] = [];
  const indirectIncome: { name: string; amount: number }[] = [];
  const indirectExpenses: { name: string; amount: number }[] = [];

  ledgers.forEach((l) => {
    const bal = calculateLedgerBalance(l, vouchers, fiscalYear);
    const amount = bal.closingBalance;
    if (amount <= 0) return;

    if (l.group === 'DIRECT_INCOME') {
      directIncome.push({ name: l.namePa || l.name, amount });
    } else if (l.group === 'DIRECT_EXPENSES') {
      directExpenses.push({ name: l.namePa || l.name, amount });
    } else if (l.group === 'INDIRECT_INCOME') {
      indirectIncome.push({ name: l.namePa || l.name, amount });
    } else if (l.group === 'INDIRECT_EXPENSES') {
      indirectExpenses.push({ name: l.namePa || l.name, amount });
    }
  });

  const totalDirectIncome = Math.round(directIncome.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const totalDirectExpenses = Math.round(directExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
  const grossProfit = Math.round((totalDirectIncome - totalDirectExpenses) * 100) / 100;

  const totalIndirectIncome = Math.round(indirectIncome.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const totalIndirectExpenses = Math.round(indirectExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
  const netProfit = Math.round((grossProfit + totalIndirectIncome - totalIndirectExpenses) * 100) / 100;

  return {
    fiscalYear,
    directIncome,
    totalDirectIncome,
    directExpenses,
    totalDirectExpenses,
    grossProfit,
    indirectIncome,
    totalIndirectIncome,
    indirectExpenses,
    totalIndirectExpenses,
    netProfit
  };
}

/**
 * Generate Double-Entry Balance Sheet
 */
export function generateBalanceSheetReport(
  ledgers: LedgerAccount[],
  vouchers: VoucherEntry[],
  fiscalYear: string = '2026-27'
): BalanceSheetStatement {
  const pnl = generateProfitAndLossReport(ledgers, vouchers, fiscalYear);

  const capitalAccounts: { name: string; amount: number }[] = [];
  const loansLiabilities: { name: string; amount: number }[] = [];
  const sundryCreditors: { name: string; amount: number }[] = [];
  const currentLiabilities: { name: string; amount: number }[] = [];

  const fixedAssets: { name: string; amount: number }[] = [];
  const currentAssets: { name: string; amount: number }[] = [];
  const sundryDebtors: { name: string; amount: number }[] = [];
  const bankAccounts: { name: string; amount: number }[] = [];
  let cashInHand = 0;

  ledgers.forEach((l) => {
    const bal = calculateLedgerBalance(l, vouchers, fiscalYear);
    const amount = bal.closingBalance;
    if (amount <= 0 && l.group !== 'CASH_IN_HAND') return;

    switch (l.group) {
      case 'CAPITAL_ACCOUNT':
        capitalAccounts.push({ name: l.namePa || l.name, amount });
        break;
      case 'LOANS_LIABILITIES':
        loansLiabilities.push({ name: l.namePa || l.name, amount });
        break;
      case 'SUNDRY_CREDITORS':
        sundryCreditors.push({ name: l.namePa || l.name, amount });
        break;
      case 'CURRENT_LIABILITIES':
        currentLiabilities.push({ name: l.namePa || l.name, amount });
        break;
      case 'FIXED_ASSETS':
        fixedAssets.push({ name: l.namePa || l.name, amount });
        break;
      case 'CURRENT_ASSETS':
        currentAssets.push({ name: l.namePa || l.name, amount });
        break;
      case 'SUNDRY_DEBTORS':
        sundryDebtors.push({ name: l.namePa || l.name, amount });
        break;
      case 'BANK_ACCOUNTS':
        bankAccounts.push({ name: l.namePa || l.name, amount });
        break;
      case 'CASH_IN_HAND':
        cashInHand += amount;
        break;
    }
  });

  const totalCapitalBase = Math.round(capitalAccounts.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  const netProfitAddition = pnl.netProfit;
  const totalCapital = Math.round((totalCapitalBase + netProfitAddition) * 100) / 100;

  const totalLoans = Math.round(loansLiabilities.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const totalCreditors = Math.round(sundryCreditors.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  const totalCurrentLiabilities = Math.round(currentLiabilities.reduce((s, cl) => s + cl.amount, 0) * 100) / 100;

  const grandTotalLiabilities = Math.round((totalCapital + totalLoans + totalCreditors + totalCurrentLiabilities) * 100) / 100;

  const totalFixedAssets = Math.round(fixedAssets.reduce((s, f) => s + f.amount, 0) * 100) / 100;
  const totalCurrentAssets = Math.round(currentAssets.reduce((s, ca) => s + ca.amount, 0) * 100) / 100;
  const totalDebtors = Math.round(sundryDebtors.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  const totalBankAccounts = Math.round(bankAccounts.reduce((s, b) => s + b.amount, 0) * 100) / 100;

  const grandTotalAssets = Math.round((totalFixedAssets + totalCurrentAssets + totalDebtors + totalBankAccounts + cashInHand) * 100) / 100;

  const difference = Math.round(Math.abs(grandTotalLiabilities - grandTotalAssets) * 100) / 100;
  const isBalanced = difference <= 1.0; // Within 1 rupee rounding tolerance

  return {
    fiscalYear,
    asOfDate: new Date().toLocaleDateString('en-GB'),
    liabilities: {
      capitalAccount: capitalAccounts,
      totalCapital,
      netProfitAddition,
      loansLiabilities,
      totalLoans,
      sundryCreditors,
      totalCreditors,
      currentLiabilities,
      totalCurrentLiabilities,
      grandTotalLiabilities
    },
    assets: {
      fixedAssets,
      totalFixedAssets,
      currentAssets,
      totalCurrentAssets,
      sundryDebtors,
      totalDebtors,
      bankAccounts,
      totalBankAccounts,
      cashInHand,
      grandTotalAssets
    },
    isBalanced,
    difference
  };
}
