import { LabourAndDeductions, CustomDeductionLine, MandiSettings, BagConditionBreakdown } from '../types/mandi';

/**
 * Punjab Mandi Calculation Utilities
 * 
 * Rules:
 * 1. Fixed bag weight = 37.50 KG
 * 2. Total Bags Weight in Qul + Kg (e.g. "37 Qul 50 Kg")
 * 3. Tota is a SEPARATE field in Kg
 * 4. Grand Total = Total Bags Weight + Tota in Qul + Kg (e.g. "37 Qul 70 Kg")
 * 5. Fixed Rate = ₹2,461 / Qul
 * 6. Amount = (Grand Total in Qul) * 2461
 */

export const FIXED_BAG_WEIGHT_KG = 37.50;
export const FIXED_RATE_PER_QTL = 2461;

export interface WeightBreakdown {
  totalKg: number;
  qtl: number;
  kg: number;
  displayEn: string;
  displayPa: string;
}

/**
 * Convert raw KG to Qul + Kg representation
 * Example: 3750 KG -> 37 Qul 50 Kg
 */
export function formatKgToQulKg(rawKg: number): WeightBreakdown {
  const roundedTotalKg = Math.round(rawKg * 100) / 100;
  const qtl = Math.floor(roundedTotalKg / 100);
  const remainingKg = Math.round((roundedTotalKg - qtl * 100) * 100) / 100;

  // Format string without trailing zero if whole number
  const kgStr = remainingKg % 1 === 0 ? remainingKg.toString() : remainingKg.toFixed(2);

  return {
    totalKg: roundedTotalKg,
    qtl,
    kg: remainingKg,
    displayEn: `${qtl} Qul ${kgStr} Kg`,
    displayPa: `${qtl} ਕੁਇੰਟਲ ${kgStr} ਕਿਲੋ`
  };
}

/**
 * Calculate Bags Weight for given bag count with fixed 37.50 KG/bag
 */
export function calculateBagsWeight(bags: number): WeightBreakdown {
  const totalKg = bags * FIXED_BAG_WEIGHT_KG;
  return formatKgToQulKg(totalKg);
}

/**
 * Calculate Grand Total: Bags Weight + Separate Tota
 */
export function calculateGrandTotal(bagsWeightKg: number, totaKg: number): WeightBreakdown {
  const totalKg = Number(bagsWeightKg || 0) + Number(totaKg || 0);
  return formatKgToQulKg(totalKg);
}

/**
 * Calculate Total Payable Amount at ₹2,461 / Qul
 */
export function calculatePayableAmount(grandTotalKg: number, ratePerQtl = FIXED_RATE_PER_QTL): number {
  const qtlDecimal = grandTotalKg / 100;
  return Math.round(qtlDecimal * ratePerQtl * 100) / 100;
}

/**
 * Auto-format Date string as user types.
 * Converts "28082026" -> "28/08/2026"
 * Handles backspace and raw digits cleanly.
 */
export function autoFormatDate(input: string): string {
  // Strip non-digits
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Convert HTML date input "YYYY-MM-DD" to standard Punjab Mandi "DD/MM/YYYY"
 */
export function convertYYYYMMDDtoDDMMYYYY(val: string): string {
  if (!val) return '';
  if (val.includes('-')) {
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return val;
}

/**
 * Convert standard Punjab Mandi "DD/MM/YYYY" to HTML date input format "YYYY-MM-DD"
 */
export function convertDDMMYYYYtoYYYYMMDD(val: string): string {
  if (!val) return '';
  if (val.includes('/')) {
    const parts = val.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return '';
}

/**
 * Get current system date formatted as DD/MM/YYYY
 */
export function getTodayDDMMYYYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Auto-format Aadhaar Number: "123456789012" -> "1234 5678 9012"
 */
export function autoFormatAadhaar(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(' ');
}

/**
 * Auto-format Mobile Number (10 digits)
 */
export function autoFormatMobile(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}

/**
 * Indian Rupee Currency Formatter
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(amount);
}

export const formatCurrencyINR = formatCurrency;

/**
 * Lookup Indian Bank Name and general Branch from IFSC Code prefix
 */
export function lookupBankFromIFSC(ifsc: string): { bankName: string; branchName: string } {
  const cleanIfsc = (ifsc || '').trim().toUpperCase();
  if (cleanIfsc.length < 4) {
    return { bankName: '', branchName: '' };
  }

  const prefix = cleanIfsc.slice(0, 4);
  const bankMap: Record<string, { bank: string; defaultBranch: string }> = {
    CLBL: { bank: 'Capital Small Finance Bank', defaultBranch: 'Main Branch' },
    SBIN: { bank: 'State Bank of India', defaultBranch: 'Mandi Branch' },
    PUNB: { bank: 'Punjab National Bank', defaultBranch: 'Grain Market Branch' },
    PSIB: { bank: 'Punjab & Sind Bank', defaultBranch: 'Mandi Complex Branch' },
    PSTC: { bank: 'Punjab State Cooperative Bank', defaultBranch: 'Head Office / Mandi Branch' },
    HDFC: { bank: 'HDFC Bank', defaultBranch: 'Main Road Branch' },
    ICIC: { bank: 'ICICI Bank', defaultBranch: 'Commercial Branch' },
    UTIB: { bank: 'Axis Bank', defaultBranch: 'Market Yard Branch' },
    BARB: { bank: 'Bank of Baroda', defaultBranch: 'City Branch' },
    CNRB: { bank: 'Canara Bank', defaultBranch: 'Mandi Branch' },
    CBIN: { bank: 'Central Bank of India', defaultBranch: 'Bazaar Branch' },
    UBIN: { bank: 'Union Bank of India', defaultBranch: 'Grain Market Branch' },
    IDIB: { bank: 'Indian Bank', defaultBranch: 'Main Branch' },
    BKID: { bank: 'Bank of India', defaultBranch: 'Station Road Branch' },
    KKBK: { bank: 'Kotak Mahindra Bank', defaultBranch: 'Civil Lines Branch' },
    YESB: { bank: 'Yes Bank', defaultBranch: 'Commercial Branch' },
    INDB: { bank: 'IndusInd Bank', defaultBranch: 'Main Branch' },
    AUBL: { bank: 'AU Small Finance Bank', defaultBranch: 'Main Branch' },
    ESFB: { bank: 'Equitas Small Finance Bank', defaultBranch: 'Main Branch' },
    USFB: { bank: 'Ujjivan Small Finance Bank', defaultBranch: 'Main Branch' },
    JSFB: { bank: 'Jana Small Finance Bank', defaultBranch: 'Main Branch' },
    BDBL: { bank: 'Bandhan Bank', defaultBranch: 'Main Branch' },
    IDFB: { bank: 'IDFC First Bank', defaultBranch: 'Main Branch' }
  };

  const match = bankMap[prefix];
  if (match) {
    return {
      bankName: match.bank,
      branchName: match.defaultBranch
    };
  }

  return {
    bankName: '',
    branchName: ''
  };
}

/**
 * Mask Aadhaar Number for privacy/security display: "1234 5678 9012" -> "•••• •••• 9012"
 */
export function maskAadhaarNumber(aadhaar: string): string {
  const digits = (aadhaar || '').replace(/\D/g, '');
  if (digits.length < 4) {
    return aadhaar || '•••• •••• ••••';
  }
  const lastFour = digits.slice(-4);
  return `•••• •••• ${lastFour}`;
}

export const DEFAULT_PAKKI_LABOUR_RATE = 7; // ₹7 per Bag (ਪੱਕੀ ਲੇਬਰ)
export const DEFAULT_PAKKA_DOUBLE_LABOUR_RATE = 14; // ₹14 per Bag (ਪੱਖਾ ਡਬਲ)
export const DEFAULT_SUKHI_LABOUR_RATE = 5; // ₹5 per Bag (ਝੋਨਾ ਸਕਾਈ)

/**
 * Standard preset other deductions for Punjab Mandi
 */
export const DEFAULT_PRESET_DEDUCTIONS: CustomDeductionLine[] = [
  {
    id: 'ded_chhanai',
    nameEn: 'Cleaning / Chhanai',
    namePa: 'ਛਾਣਾਈ / ਸਫਾਈ ਖਰਚਾ',
    type: 'PER_QTL',
    rate: 2.5,
    amount: 0,
    enabled: false
  },
  {
    id: 'ded_tolai',
    nameEn: 'Weighment / Tolai',
    namePa: 'ਤੁਲਾਈ ਖਰਚਾ',
    type: 'PER_QTL',
    rate: 1.5,
    amount: 0,
    enabled: false
  },
  {
    id: 'ded_stacking',
    nameEn: 'Loading & Stacking / Laddai',
    namePa: 'ਚੱਠਾ / ਲਦਾਈ ਮਜ਼ਦੂਰੀ',
    type: 'PER_QTL',
    rate: 3.0,
    amount: 0,
    enabled: false
  },
  {
    id: 'ded_advance',
    nameEn: 'Advance Cash / Pesgi',
    namePa: 'ਪੇਸ਼ਗੀ ਨਕਦ ਕਟੌਤੀ',
    type: 'FIXED',
    rate: 0,
    amount: 0,
    enabled: false
  }
];

/**
 * Create a fresh default LabourAndDeductions state using configured settings
 */
export function createDefaultLabourDeductions(settings?: Partial<MandiSettings>): LabourAndDeductions {
  const pakkiRate = settings?.defaultPakkiLabourRate ?? DEFAULT_PAKKI_LABOUR_RATE;
  const doubleRate = settings?.defaultPakkaDoubleLabourRate ?? DEFAULT_PAKKA_DOUBLE_LABOUR_RATE;
  const sukhiRate = settings?.defaultSukhiLabourRate ?? DEFAULT_SUKHI_LABOUR_RATE;

  return {
    pakkiLabourEnabled: false,
    pakkiLabourRate: pakkiRate,
    pakkiLabourAmount: 0,

    pakkaDoubleLabourEnabled: false,
    pakkaDoubleLabourRate: doubleRate,
    pakkaDoubleLabourAmount: 0,

    sukhiLabourEnabled: false,
    sukhiLabourRate: sukhiRate,
    sukhiLabourAmount: 0,

    otherDeductionsEnabled: false,
    customDeductions: DEFAULT_PRESET_DEDUCTIONS.map((d) => ({ ...d })),

    totalLabourDeduction: 0,
    totalOtherDeduction: 0,
    grandTotalDeductions: 0,
    grossAmount: 0,
    netPayableAmount: 0
  };
}

/**
 * Recalculate all Labour & Deductions based on Bags Count and Gross Amount.
 * Strictly adheres to rule:
 * - Labour calculation is PER BAG, not Qul.
 * - Pakki Labour (ਪੱਕੀ ਲੇਬਰ): ₹7 / Bag
 * - Pakha Double Labour (ਪੱਖਾ ਡਬਲ): ₹14 / Bag
 * - Sukhi Labour (ਝੋਨਾ ਸਕਾਈ): ₹5 / Bag
 * - If option is NOT enabled: Amount = 0 and does NOT affect farmer's total.
 */
export function computeLabourAndDeductions(
  totalWeightKg: number,
  grossAmount: number,
  current: Partial<LabourAndDeductions>,
  settings?: Partial<MandiSettings>,
  bagsCount?: number
): LabourAndDeductions {
  const qtlDecimal = Math.max(0, totalWeightKg) / 100;
  // Calculate bags: use explicit bags count if provided, or estimate from weight
  const bagCount = typeof bagsCount === 'number' && bagsCount > 0
    ? bagsCount
    : Math.max(0, Math.round(totalWeightKg / FIXED_BAG_WEIGHT_KG));

  // 1. Pakki Labour (ਪੱਕੀ ਲੇਬਰ) - PER BAG
  const pakkiRate = current.pakkiLabourRate ?? settings?.defaultPakkiLabourRate ?? DEFAULT_PAKKI_LABOUR_RATE;
  const pakkiEnabled = !!current.pakkiLabourEnabled;
  const pakkiBags = pakkiEnabled
    ? (typeof current.pakkiBagsCount === 'number' && current.pakkiBagsCount >= 0
        ? current.pakkiBagsCount
        : bagCount)
    : 0;
  const pakkiAmount = Math.round(pakkiBags * pakkiRate * 100) / 100;

  // 2. Pakha Double (ਪੱਖਾ ਡਬਲ) - PER BAG
  const doubleRate = current.pakkaDoubleLabourRate ?? settings?.defaultPakkaDoubleLabourRate ?? DEFAULT_PAKKA_DOUBLE_LABOUR_RATE;
  const doubleEnabled = !!current.pakkaDoubleLabourEnabled;
  const doubleBags = doubleEnabled
    ? (typeof current.doubleBagsCount === 'number' && current.doubleBagsCount >= 0
        ? current.doubleBagsCount
        : bagCount)
    : 0;
  const doubleAmount = Math.round(doubleBags * doubleRate * 100) / 100;

  // 3. Sukhi Labour / Paddy Drying (ਝੋਨਾ ਸਕਾਈ) - PER BAG
  const sukhiRate = current.sukhiLabourRate ?? settings?.defaultSukhiLabourRate ?? DEFAULT_SUKHI_LABOUR_RATE;
  const sukhiEnabled = !!current.sukhiLabourEnabled;
  const sukkiBags = sukhiEnabled
    ? (typeof current.sukkiBagsCount === 'number' && current.sukkiBagsCount >= 0
        ? current.sukkiBagsCount
        : bagCount)
    : 0;
  const sukhiAmount = Math.round(sukkiBags * sukhiRate * 100) / 100;

  // Multiple Condition Breakdown & Remaining Balance
  const accountedConditionBags = (doubleEnabled ? doubleBags : 0) + (sukhiEnabled ? sukkiBags : 0) + (pakkiEnabled ? pakkiBags : 0);
  const balanceBags = Math.max(0, bagCount - accountedConditionBags);

  const partsSummary: string[] = [];
  if (doubleEnabled && doubleBags > 0) partsSummary.push(`${doubleBags} ਡਬਲ`);
  if (sukhiEnabled && sukkiBags > 0) partsSummary.push(`${sukkiBags} ਸੁੱਕੀ`);
  if (pakkiEnabled && pakkiBags > 0) partsSummary.push(`${pakkiBags} ਪੱਕੀ`);
  if (balanceBags > 0) partsSummary.push(`${balanceBags} ਬਾਕੀ ਬੈਲੇਂਸ`);

  const conditionBreakdown = {
    enabled: !!(doubleEnabled || sukhiEnabled || pakkiEnabled),
    totalBags: bagCount,
    doubleBags: doubleEnabled ? doubleBags : 0,
    doubleRate,
    doubleAmount,
    sukkiBags: sukhiEnabled ? sukkiBags : 0,
    sukkiRate: sukhiRate,
    sukkiAmount: sukhiAmount,
    pakkiBags: pakkiEnabled ? pakkiBags : 0,
    pakkiRate,
    pakkiAmount,
    balanceBags,
    summaryText: partsSummary.length > 0 ? `${bagCount} ਕੁੱਲ = ${partsSummary.join(' + ')}` : `${bagCount} ਬੋਰੀਆਂ`
  };

  // 4. Custom / Other Deductions
  const customLines: CustomDeductionLine[] = (current.customDeductions || DEFAULT_PRESET_DEDUCTIONS).map((item) => {
    if (!item.enabled) {
      return { ...item, amount: 0 };
    }
    if (item.type === 'PER_QTL') {
      const calc = Math.round(qtlDecimal * Number(item.rate || 0) * 100) / 100;
      return { ...item, amount: calc };
    } else {
      return { ...item, amount: Math.round(Number(item.rate || 0) * 100) / 100 };
    }
  });

  const otherDeductionsEnabled = current.otherDeductionsEnabled ?? customLines.some((l) => l.enabled);
  const totalOtherDeduction = customLines
    .filter((l) => l.enabled)
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const totalLabourDeduction = Math.round((pakkiAmount + doubleAmount + sukhiAmount) * 100) / 100;
  const grandTotalDeductions = Math.round((totalLabourDeduction + totalOtherDeduction) * 100) / 100;
  const safeGross = Math.max(0, Number(grossAmount) || 0);
  const netPayableAmount = Math.max(0, Math.round((safeGross - grandTotalDeductions) * 100) / 100);

  return {
    pakkiLabourEnabled: pakkiEnabled,
    pakkiLabourRate: pakkiRate,
    pakkiLabourAmount: pakkiAmount,
    pakkiBagsCount: pakkiBags,

    pakkaDoubleLabourEnabled: doubleEnabled,
    pakkaDoubleLabourRate: doubleRate,
    pakkaDoubleLabourAmount: doubleAmount,
    doubleBagsCount: doubleBags,

    sukhiLabourEnabled: sukhiEnabled,
    sukhiLabourRate: sukhiRate,
    sukhiLabourAmount: sukhiAmount,
    sukkiBagsCount: sukkiBags,

    balanceBagsCount: balanceBags,
    conditionBreakdown,

    otherDeductionsEnabled,
    customDeductions: customLines,

    totalLabourDeduction,
    totalOtherDeduction,
    grandTotalDeductions,
    grossAmount: safeGross,
    netPayableAmount
  };
}

export interface LabourRateOverrides {
  pakkiRate?: number;
  doubleRate?: number;
  sukkiRate?: number;
}

/**
 * Automatically calculate Labour Deduction from entered New, Old, Double, Sukki bags and applicable labour rates.
 * Adheres strictly to Mandi standard:
 * - Total Bags = New Bags + Old Bags
 * - Double Bags @ Double Rate (user-editable, default ₹14/bag)
 * - Sukki Bags @ Sukki Rate (user-editable, default ₹5/bag)
 * - Remaining / Pakki Bags = Total Bags - (Double Bags + Sukki Bags) @ Pakki Rate (user-editable, default ₹7/bag)
 * - Total Labour = (Pakki Bags * Pakki Rate) + (Double Bags * Double Rate) + (Sukki Bags * Sukki Rate)
 * - Gross Amount = (Total Weight Kg / 100) * MSP Rate (₹2,461)
 * - Net Amount = Gross Amount - Total Labour
 */
export function calculateAutomaticLabour(
  newBags: number,
  oldBags: number,
  doubleBags: number,
  sukkiBags: number,
  grossAmount: number,
  settings?: Partial<MandiSettings>,
  customRates?: LabourRateOverrides
) {
  const safeNew = Math.max(0, newBags || 0);
  const safeOld = Math.max(0, oldBags || 0);
  const totalBags = safeNew + safeOld;

  const safeDouble = Math.max(0, Math.min(totalBags, doubleBags || 0));
  const safeSukki = Math.max(0, Math.min(Math.max(0, totalBags - safeDouble), sukkiBags || 0));
  const safePakki = Math.max(0, totalBags - (safeDouble + safeSukki));

  const defaultPakki = settings?.defaultPakkiLabourRate ?? DEFAULT_PAKKI_LABOUR_RATE;
  const defaultDouble = settings?.defaultPakkaDoubleLabourRate ?? DEFAULT_PAKKA_DOUBLE_LABOUR_RATE;
  const defaultSukki = settings?.defaultSukhiLabourRate ?? DEFAULT_SUKHI_LABOUR_RATE;

  const pakkiRate =
    customRates?.pakkiRate !== undefined && !isNaN(customRates.pakkiRate) && customRates.pakkiRate >= 0
      ? customRates.pakkiRate
      : defaultPakki;

  const doubleRate =
    customRates?.doubleRate !== undefined && !isNaN(customRates.doubleRate) && customRates.doubleRate >= 0
      ? customRates.doubleRate
      : defaultDouble;

  const sukkiRate =
    customRates?.sukkiRate !== undefined && !isNaN(customRates.sukkiRate) && customRates.sukkiRate >= 0
      ? customRates.sukkiRate
      : defaultSukki;

  const pakkiAmount = totalBags > 0 ? Math.round(safePakki * pakkiRate * 100) / 100 : 0;
  const doubleAmount = totalBags > 0 ? Math.round(safeDouble * doubleRate * 100) / 100 : 0;
  const sukkiAmount = totalBags > 0 ? Math.round(safeSukki * sukkiRate * 100) / 100 : 0;

  const totalLabour = Math.round((pakkiAmount + doubleAmount + sukkiAmount) * 100) / 100;
  const safeGross = Math.max(0, Number(grossAmount) || 0);
  const netAmount = Math.max(0, Math.round((safeGross - totalLabour) * 100) / 100);

  const partsSummary: string[] = [];
  if (safeDouble > 0) partsSummary.push(`${safeDouble} ਡਬਲ`);
  if (safeSukki > 0) partsSummary.push(`${safeSukki} ਸੁੱਕੀ`);
  if (safePakki > 0) partsSummary.push(`${safePakki} ਪੱਕੀ`);

  const conditionBreakdown: BagConditionBreakdown = {
    enabled: totalBags > 0,
    totalBags,
    doubleBags: safeDouble,
    doubleRate,
    doubleAmount,
    sukkiBags: safeSukki,
    sukkiRate,
    sukkiAmount,
    pakkiBags: safePakki,
    pakkiRate,
    pakkiAmount,
    balanceBags: safePakki,
    summaryText: partsSummary.length > 0 ? `${totalBags} ਕੁੱਲ = ${partsSummary.join(' + ')}` : `${totalBags} ਬੋਰੀਆਂ`
  };

  const labourDeductions: LabourAndDeductions = {
    pakkiLabourEnabled: safePakki > 0,
    pakkiLabourRate: pakkiRate,
    pakkiLabourAmount: pakkiAmount,
    pakkiBagsCount: safePakki,

    pakkaDoubleLabourEnabled: safeDouble > 0,
    pakkaDoubleLabourRate: doubleRate,
    pakkaDoubleLabourAmount: doubleAmount,
    doubleBagsCount: safeDouble,

    sukhiLabourEnabled: safeSukki > 0,
    sukhiLabourRate: sukkiRate,
    sukhiLabourAmount: sukkiAmount,
    sukkiBagsCount: safeSukki,

    balanceBagsCount: safePakki,
    conditionBreakdown,

    otherDeductionsEnabled: false,
    customDeductions: [],

    totalLabourDeduction: totalLabour,
    totalOtherDeduction: 0,
    grandTotalDeductions: totalLabour,
    grossAmount: safeGross,
    netPayableAmount: netAmount
  };

  return {
    totalBags,
    pakkiBags: safePakki,
    doubleBags: safeDouble,
    sukkiBags: safeSukki,
    pakkiRate,
    doubleRate,
    sukkiRate,
    pakkiAmount,
    doubleAmount,
    sukkiAmount,
    totalLabour,
    grossAmount: safeGross,
    netAmount,
    labourDeductions,
    conditionBreakdown
  };
}

/**
 * Calculate standard purchase breakdown and amount from bag count
 */
export function calculatePurchaseWeightAndAmount(bags: number, rate = FIXED_RATE_PER_QTL): {
  qul: number;
  kg: number;
  totalKg: number;
  displayEn: string;
  displayPa: string;
  totalAmount: number;
} {
  const totalKg = Math.max(0, bags) * FIXED_BAG_WEIGHT_KG;
  const breakdown = formatKgToQulKg(totalKg);
  const totalAmount = calculatePayableAmount(totalKg, rate);
  return {
    qul: breakdown.qtl,
    kg: breakdown.kg,
    totalKg,
    displayEn: breakdown.displayEn,
    displayPa: breakdown.displayPa,
    totalAmount
  };
}

/**
 * Convert Date string (DD/MM/YYYY or YYYY-MM-DD) to a standard Date object
 */
export function parseDateString(dateStr: string): Date {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();
  
  // Format: DD/MM/YYYY or DD-MM-YYYY
  if (trimmed.includes('/') || trimmed.includes('-')) {
    const parts = trimmed.split(/[/ -]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d);
      } else {
        // DD/MM/YYYY
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
    }
  }

  const timestamp = Date.parse(trimmed);
  return isNaN(timestamp) ? new Date() : new Date(timestamp);
}

/**
 * Format Date object to DD/MM/YYYY
 */
export function formatDateToDDMMYYYY(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export interface AdvanceInterestCalculation {
  principal: number;
  monthlyInterestRate: number; // % per month
  startDate: string;
  endDate: string;
  totalDays: number;
  monthsElapsed: number;
  daysElapsed: number;
  interestAmount: number;
  totalPayableWithInterest: number;
  totalPayable: number; // alias
  formattedDurationEn: string;
  formattedDurationPa: string;
}

/**
 * Calculate Date-to-Date Advance Interest (independent from other payments)
 * Formula:
 * - Total Days = (End Date - Start Date)
 * - Full Months = Math.floor(Total Days / 30)
 * - Remaining Days = Total Days % 30
 * - Monthly Interest = Principal * (Rate% / 100)
 * - Total Interest = (Full Months * Monthly Interest) + ((Remaining Days / 30) * Monthly Interest)
 */
export function calculateAdvanceInterest(
  principalOrOptions:
    | number
    | {
        principal: number;
        monthlyInterestRate: number;
        startDateStr?: string;
        startDate?: string;
        endDateStr?: string;
        endDate?: string;
      },
  monthlyRatePercent?: number,
  startDateStr?: string,
  endDateStr?: string
): AdvanceInterestCalculation {
  let principal = 0;
  let rate = 0;
  let start = '';
  let end = '';

  if (typeof principalOrOptions === 'object' && principalOrOptions !== null) {
    principal = Math.max(0, Number(principalOrOptions.principal) || 0);
    rate = Math.max(0, Number(principalOrOptions.monthlyInterestRate) || 0);
    start = (principalOrOptions.startDateStr || principalOrOptions.startDate || '').trim();
    end = (principalOrOptions.endDateStr || principalOrOptions.endDate || '').trim();
  } else {
    principal = Math.max(0, Number(principalOrOptions) || 0);
    rate = Math.max(0, Number(monthlyRatePercent) || 0);
    start = (startDateStr || '').trim();
    end = (endDateStr || '').trim();
  }

  const startDate = start || formatDateToDDMMYYYY();
  const endDate = end || formatDateToDDMMYYYY();

  const startD = parseDateString(startDate);
  const endD = parseDateString(endDate);

  // Normalize hours
  startD.setHours(0, 0, 0, 0);
  endD.setHours(0, 0, 0, 0);

  const diffMs = endD.getTime() - startD.getTime();
  const totalDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  // Calculate exact calendar months and remaining days
  let monthsElapsed = 0;
  let daysElapsed = 0;

  if (endD.getTime() > startD.getTime()) {
    const d = startD.getDate();
    while (true) {
      const nextMonths = monthsElapsed + 1;
      const totalM = startD.getMonth() + nextMonths;
      const targetYear = startD.getFullYear() + Math.floor(totalM / 12);
      const targetMonth = ((totalM % 12) + 12) % 12;
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const nextDate = new Date(targetYear, targetMonth, Math.min(d, daysInTargetMonth), 0, 0, 0, 0);

      if (nextDate.getTime() <= endD.getTime()) {
        monthsElapsed++;
      } else {
        break;
      }
    }

    // Calculate remaining days from last full calendar month anniversary
    const fullMonthsTotal = startD.getMonth() + monthsElapsed;
    const lastYear = startD.getFullYear() + Math.floor(fullMonthsTotal / 12);
    const lastMonth = ((fullMonthsTotal % 12) + 12) % 12;
    const daysInLastMonth = new Date(lastYear, lastMonth + 1, 0).getDate();
    const lastFullMonthDate = new Date(lastYear, lastMonth, Math.min(d, daysInLastMonth), 0, 0, 0, 0);

    const remainingMs = endD.getTime() - lastFullMonthDate.getTime();
    daysElapsed = Math.max(0, Math.round(remainingMs / (1000 * 60 * 60 * 24)));
  }

  const monthlyInterest = principal * (rate / 100);
  const dailyInterest = monthlyInterest / 30;
  const interestAmount = Math.round(((monthsElapsed * monthlyInterest) + (daysElapsed * dailyInterest)) * 100) / 100;
  const totalPayableWithInterest = Math.round((principal + interestAmount) * 100) / 100;

  const formattedDurationEn = `${monthsElapsed} Months ${daysElapsed} Days (${totalDays} Days)`;
  const formattedDurationPa = `${monthsElapsed} ਮਹੀਨੇ ${daysElapsed} ਦਿਨ (ਕੁੱਲ ${totalDays} ਦਿਨ)`;

  return {
    principal,
    monthlyInterestRate: rate,
    startDate,
    endDate,
    totalDays,
    monthsElapsed,
    daysElapsed,
    interestAmount,
    totalPayableWithInterest,
    totalPayable: totalPayableWithInterest,
    formattedDurationEn,
    formattedDurationPa
  };
}


