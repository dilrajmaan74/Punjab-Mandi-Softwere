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
 * Format Total Weight in Kg to Quintal + Kg format for Lefting / Dispatch:
 * Format: "XXX Qtl XX Kg"
 * Rules:
 * - 1 Qtl = 100 Kg
 * - Automatically convert entered Total Weight Kg into Qtl + remaining Kg
 * Examples:
 * 15000 Kg -> 150 Qtl 00 Kg
 * 14850 Kg -> 148 Qtl 50 Kg
 * 14925 Kg -> 149 Qtl 25 Kg
 */
export function formatLeftingWeightQtlKg(totalKg: number | string | undefined | null): string {
  const kgNum = typeof totalKg === 'string' ? parseFloat(totalKg) : Number(totalKg);
  if (isNaN(kgNum) || kgNum <= 0) return '0 Qtl 00 Kg';
  const qtl = Math.floor(kgNum / 100);
  const remKg = Math.round((kgNum - qtl * 100) * 100) / 100;
  const remKgStr = Number.isInteger(remKg)
    ? (remKg < 10 ? `0${remKg}` : String(remKg))
    : (remKg < 10 ? `0${remKg}` : String(remKg));
  return `${qtl} Qtl ${remKgStr} Kg`;
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

export const DEFAULT_PAKKI_LABOUR_RATE = 8; // ₹8 per Bag (ਪੱਕੀ ਲੇਬਰ - Fixed Labour)
export const DEFAULT_PAKKA_DOUBLE_LABOUR_RATE = 14; // ₹14 per Bag (ਪੱਖਾ ਡਬਲ)
export const DEFAULT_SUKHI_LABOUR_RATE = 5; // ₹5 per Bag (ਝੋਨਾ ਸਕਾਈ)
export const DEFAULT_CROP_BAG_CONVERSION_RATE = 925; // ₹925 per Bag standard conversion for crop balance deduction

/**
 * Calculate single labour category amount: Bags × Rate per Bag
 * Guaranteed: Never ₹0 when valid bags (> 0) and valid rate (> 0) exist.
 */
export function calculateCategoryLabourAmount(
  bags: number | string | null | undefined,
  rate: number | string | null | undefined
): number {
  const numBags = typeof bags === 'number' ? bags : (parseFloat(String(bags || '0')) || 0);
  const numRate = typeof rate === 'number' ? rate : (parseFloat(String(rate || '0')) || 0);
  if (numBags <= 0 || numRate <= 0) return 0;
  return Math.round(numBags * numRate * 100) / 100;
}

/**
 * Calculate Crop Balance Labour Deduction Bags:
 * Total Labour Amount ÷ Bag Conversion Rate (₹925), rounded UP to whole bag.
 * Example: ₹5,698 ÷ ₹925 = 6.16 -> 7 Bags
 * If Total Labour Amount <= 0, returns 0 bags.
 */
export function calculateLabourDeductionBags(
  totalLabourAmount: number | string | null | undefined,
  bagConversionRate: number | string | null | undefined = DEFAULT_CROP_BAG_CONVERSION_RATE
): number {
  const safeAmount = Math.max(0, typeof totalLabourAmount === 'number' ? totalLabourAmount : (parseFloat(String(totalLabourAmount || '0')) || 0));
  const safeRate = Math.max(1, typeof bagConversionRate === 'number' ? bagConversionRate : (parseFloat(String(bagConversionRate || '0')) || DEFAULT_CROP_BAG_CONVERSION_RATE));
  if (safeAmount <= 0) return 0;
  return Math.ceil(safeAmount / safeRate);
}

/**
 * Calculate Remaining Crop Balance Bags after Labour Deduction:
 * (Total Bags - Purchased Bags) - Labour Deduction Bags
 */
export function calculateRemainingBalanceBags(
  totalBags: number | string | null | undefined,
  purchasedBags: number | string | null | undefined = 0,
  labourDeductionBags: number | string | null | undefined = 0
): number {
  const safeTotal = Math.max(0, typeof totalBags === 'number' ? totalBags : (parseInt(String(totalBags || '0'), 10) || 0));
  const safePurchased = Math.max(0, typeof purchasedBags === 'number' ? purchasedBags : (parseInt(String(purchasedBags || '0'), 10) || 0));
  const safeLabour = Math.max(0, typeof labourDeductionBags === 'number' ? labourDeductionBags : (parseInt(String(labourDeductionBags || '0'), 10) || 0));
  return (safeTotal - safePurchased) - safeLabour;
}

export interface UniversalLabourInput {
  totalBags: number; // Exact bag count (e.g. 407)
  pakkiBags?: number | string | null;
  pakkiRate?: number | string | null;
  doubleBags?: number | string | null;
  doubleRate?: number | string | null;
  sukkiBags?: number | string | null;
  sukkiRate?: number | string | null;
  grossAmount?: number | string | null;
  bagConversionRate?: number | string | null; // default 925
  purchasedBags?: number | string | null;
  customDeductions?: CustomDeductionLine[];
  otherDeductionsEnabled?: boolean;
  settings?: Partial<MandiSettings>;
}

export interface UniversalLabourResult {
  totalBags: number;
  pakkiBags: number;
  doubleBags: number;
  sukkiBags: number;
  pakkiRate: number;
  doubleRate: number;
  sukkiRate: number;

  pakkiAmount: number;
  doubleAmount: number;
  sukkiAmount: number;

  pakkiEnabled: boolean;
  doubleEnabled: boolean;
  sukkiEnabled: boolean;

  totalLabourBags: number;
  totalLabour: number;
  totalOtherDeduction: number;
  grandTotalDeductions: number;

  bagConversionRate: number;
  labourDeductionBags: number;
  balanceBeforeLabourBags: number;
  remainingBalanceBags: number;

  unassignedBags: number;
  isExceeding: boolean;
  excessBags: number;
  validationWarning?: string;

  grossAmount: number;
  netAmount: number;

  labourDeductions: LabourAndDeductions;
  conditionBreakdown: BagConditionBreakdown;
}

/**
 * Universal Single Source of Truth for Labour Calculations.
 * Strictly adheres to Mandi rules:
 * 1. Bags × Rate = Amount for each category independently
 * 2. Total Labour = Pakki + Double + Sukki
 * 3. Crop Balance Deduction = Total Labour ÷ 925 (Round UP)
 * 4. Remaining Balance = Total Bags - Deduction Bags
 * 5. Handles NULL/empty safely as 0
 * 6. Never shows ₹0 when valid bags and rates exist
 * 7. When no labour entered, Total Labour = ₹0 and Deduction Bags = 0
 */
export function computeUniversalLabour(params: UniversalLabourInput): UniversalLabourResult {
  const totalBags = Math.max(0, typeof params.totalBags === 'number' ? params.totalBags : (parseInt(String(params.totalBags || '0'), 10) || 0));

  // Category rates
  const defaultPakki = params.settings?.defaultPakkiLabourRate ?? DEFAULT_PAKKI_LABOUR_RATE;
  const defaultDouble = params.settings?.defaultPakkaDoubleLabourRate ?? DEFAULT_PAKKA_DOUBLE_LABOUR_RATE;
  const defaultSukki = params.settings?.defaultSukhiLabourRate ?? DEFAULT_SUKHI_LABOUR_RATE;

  const pakkiRate = params.pakkiRate !== undefined && params.pakkiRate !== null && !isNaN(Number(params.pakkiRate)) && Number(params.pakkiRate) >= 0
    ? Number(params.pakkiRate)
    : defaultPakki;

  const doubleRate = params.doubleRate !== undefined && params.doubleRate !== null && !isNaN(Number(params.doubleRate)) && Number(params.doubleRate) >= 0
    ? Number(params.doubleRate)
    : defaultDouble;

  const sukkiRate = params.sukkiRate !== undefined && params.sukkiRate !== null && !isNaN(Number(params.sukkiRate)) && Number(params.sukkiRate) >= 0
    ? Number(params.sukkiRate)
    : defaultSukki;

  // Category bags
  const pakkiBags = Math.max(0, typeof params.pakkiBags === 'number' ? params.pakkiBags : (parseInt(String(params.pakkiBags || '0'), 10) || 0));
  const doubleBags = Math.max(0, typeof params.doubleBags === 'number' ? params.doubleBags : (parseInt(String(params.doubleBags || '0'), 10) || 0));
  const sukkiBags = Math.max(0, typeof params.sukkiBags === 'number' ? params.sukkiBags : (parseInt(String(params.sukkiBags || '0'), 10) || 0));

  // Category amounts: Bags × Rate
  const pakkiAmount = calculateCategoryLabourAmount(pakkiBags, pakkiRate);
  const doubleAmount = calculateCategoryLabourAmount(doubleBags, doubleRate);
  const sukkiAmount = calculateCategoryLabourAmount(sukkiBags, sukkiRate);

  const pakkiEnabled = pakkiBags > 0;
  const doubleEnabled = doubleBags > 0;
  const sukkiEnabled = sukkiBags > 0;

  // Total labour bags and amount
  const totalLabourBags = pakkiBags + doubleBags + sukkiBags;
  const totalLabour = Math.round((pakkiAmount + doubleAmount + sukkiAmount) * 100) / 100;

  // Bag consistency & validation:
  // Pakki labour applies to total bags (fixed base handling).
  // Pakha (Double) and Sukki (Drying) are independent operations on bags.
  // Warning triggers only if any individual category exceeds total bags.
  const isExceeding = totalBags > 0 && (pakkiBags > totalBags || doubleBags > totalBags || sukkiBags > totalBags);
  const excessBags = Math.max(0, Math.max(pakkiBags, doubleBags, sukkiBags) - totalBags);
  const unassignedBags = Math.max(0, totalBags - pakkiBags);
  const validationWarning = isExceeding
    ? `ਚੇਤਾਵਨੀ: ਕਿਸੇ ਮੱਦ ਵਿੱਚ ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ (${Math.max(pakkiBags, doubleBags, sukkiBags)}) ਕੁੱਲ ਬੋਰੀਆਂ (${totalBags}) ਨਾਲੋਂ ${excessBags} ਵੱਧ ਹੈ! / Warning: Category bags exceed available bags!`
    : undefined;

  // Conversion to Crop Balance Deduction Bags
  const bagConversionRate = Math.max(1, typeof params.bagConversionRate === 'number' ? params.bagConversionRate : (parseFloat(String(params.bagConversionRate || '0')) || DEFAULT_CROP_BAG_CONVERSION_RATE));
  const labourDeductionBags = calculateLabourDeductionBags(totalLabour, bagConversionRate);

  const safePurchased = Math.max(0, typeof params.purchasedBags === 'number' ? params.purchasedBags : (parseInt(String(params.purchasedBags || '0'), 10) || 0));
  const balanceBeforeLabourBags = Math.max(0, totalBags - safePurchased);
  const remainingBalanceBags = balanceBeforeLabourBags - labourDeductionBags;

  // Other custom deductions
  const customLines: CustomDeductionLine[] = (params.customDeductions || DEFAULT_PRESET_DEDUCTIONS).map((item) => {
    if (!item.enabled) return { ...item, amount: 0 };
    if (item.type === 'PER_QTL') {
      const qtl = (totalBags * FIXED_BAG_WEIGHT_KG) / 100;
      return { ...item, amount: Math.round(qtl * Number(item.rate || 0) * 100) / 100 };
    }
    return { ...item, amount: Math.round(Number(item.rate || 0) * 100) / 100 };
  });

  const otherDeductionsEnabled = params.otherDeductionsEnabled ?? customLines.some((l) => l.enabled);
  const totalOtherDeduction = customLines
    .filter((l) => l.enabled)
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const grandTotalDeductions = Math.round((totalLabour + totalOtherDeduction) * 100) / 100;
  const safeGross = Math.max(0, typeof params.grossAmount === 'number' ? params.grossAmount : (parseFloat(String(params.grossAmount || '0')) || 0));
  const netAmount = Math.max(0, Math.round((safeGross - grandTotalDeductions) * 100) / 100);

  // Summary Text
  const partsSummary: string[] = [];
  if (pakkiBags > 0) partsSummary.push(`${pakkiBags} ਪੱਕੀ (@₹${pakkiRate})`);
  if (doubleBags > 0) partsSummary.push(`${doubleBags} ਡਬਲ (@₹${doubleRate})`);
  if (sukkiBags > 0) partsSummary.push(`${sukkiBags} ਸੁੱਕੀ (@₹${sukkiRate})`);

  const summaryText = partsSummary.length > 0
    ? `${partsSummary.join(' + ')} = ${totalLabourBags} ਬੋਰੀਆਂ (₹${totalLabour})`
    : `${totalBags} ਬੋਰੀਆਂ (ਕੋਈ ਮਜ਼ਦੂਰੀ ਨਹੀਂ)`;

  const conditionBreakdown: BagConditionBreakdown = {
    enabled: totalLabourBags > 0,
    totalBags,
    pakkiBags,
    pakkiRate,
    pakkiAmount,
    doubleBags,
    doubleRate,
    doubleAmount,
    sukkiBags,
    sukkiRate,
    sukkiAmount,
    balanceBags: unassignedBags,
    summaryText
  };

  const labourDeductions: LabourAndDeductions = {
    pakkiLabourEnabled: pakkiEnabled,
    pakkiLabourRate: pakkiRate,
    pakkiLabourAmount: pakkiAmount,
    pakkiBagsCount: pakkiBags,

    pakkaDoubleLabourEnabled: doubleEnabled,
    pakkaDoubleLabourRate: doubleRate,
    pakkaDoubleLabourAmount: doubleAmount,
    doubleBagsCount: doubleBags,

    sukhiLabourEnabled: sukkiEnabled,
    sukhiLabourRate: sukkiRate,
    sukhiLabourAmount: sukkiAmount,
    sukkiBagsCount: sukkiBags,

    balanceBagsCount: unassignedBags,
    conditionBreakdown,

    otherDeductionsEnabled,
    customDeductions: customLines,

    totalLabourDeduction: totalLabour,
    totalOtherDeduction,
    grandTotalDeductions,
    grossAmount: safeGross,
    netPayableAmount: netAmount
  };

  return {
    totalBags,
    pakkiBags,
    doubleBags,
    sukkiBags,
    pakkiRate,
    doubleRate,
    sukkiRate,

    pakkiAmount,
    doubleAmount,
    sukkiAmount,

    pakkiEnabled,
    doubleEnabled,
    sukkiEnabled,

    totalLabourBags,
    totalLabour,
    totalOtherDeduction,
    grandTotalDeductions,

    bagConversionRate,
    labourDeductionBags,
    balanceBeforeLabourBags,
    remainingBalanceBags,

    unassignedBags,
    isExceeding,
    excessBags,
    validationWarning,

    grossAmount: safeGross,
    netAmount,

    labourDeductions,
    conditionBreakdown
  };
}

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
 * Delegates to the universal calculation engine.
 */
export function computeLabourAndDeductions(
  totalWeightKg: number,
  grossAmount: number,
  current: Partial<LabourAndDeductions>,
  settings?: Partial<MandiSettings>,
  bagsCount?: number
): LabourAndDeductions {
  // Calculate bags: use explicit bags count if provided, or estimate from weight
  const bagCount = typeof bagsCount === 'number' && bagsCount > 0
    ? bagsCount
    : Math.max(0, Math.round(totalWeightKg / FIXED_BAG_WEIGHT_KG));

  const pakkiBags = current.pakkiLabourEnabled
    ? (typeof current.pakkiBagsCount === 'number' && current.pakkiBagsCount >= 0 ? current.pakkiBagsCount : bagCount)
    : (typeof current.pakkiBagsCount === 'number' && current.pakkiBagsCount > 0 ? current.pakkiBagsCount : 0);

  const doubleBags = current.pakkaDoubleLabourEnabled
    ? (typeof current.doubleBagsCount === 'number' && current.doubleBagsCount >= 0 ? current.doubleBagsCount : bagCount)
    : (typeof current.doubleBagsCount === 'number' && current.doubleBagsCount > 0 ? current.doubleBagsCount : 0);

  const sukkiBags = current.sukhiLabourEnabled
    ? (typeof current.sukkiBagsCount === 'number' && current.sukkiBagsCount >= 0 ? current.sukkiBagsCount : bagCount)
    : (typeof current.sukkiBagsCount === 'number' && current.sukkiBagsCount > 0 ? current.sukkiBagsCount : 0);

  const universal = computeUniversalLabour({
    totalBags: bagCount,
    pakkiBags,
    pakkiRate: current.pakkiLabourRate,
    doubleBags,
    doubleRate: current.pakkaDoubleLabourRate,
    sukkiBags,
    sukkiRate: current.sukhiLabourRate,
    grossAmount,
    customDeductions: current.customDeductions,
    otherDeductionsEnabled: current.otherDeductionsEnabled,
    settings
  });

  return universal.labourDeductions;
}

export interface LabourRateOverrides {
  pakkiRate?: number;
  doubleRate?: number;
  sukkiRate?: number;
}

/**
 * Automatically calculate Labour Deduction from entered New, Old, Double, Sukki bags and applicable labour rates.
 * Adheres strictly to Mandi standard:
 * - Labour Bags × Labour Rate per Bag = Labour Amount for each category independently
 * - Total Labour = Pakki + Double + Sukki
 * - Crop Balance Deduction = Total Labour ÷ ₹925 (Round UP)
 * - Remaining Balance = Total Bags - Deduction Bags
 * - Live recalculation on any input change
 */
export function calculateAutomaticLabour(
  newBags: number,
  oldBags: number,
  doubleBags: number,
  sukkiBags: number,
  grossAmount: number,
  settings?: Partial<MandiSettings>,
  customRates?: LabourRateOverrides,
  pakkiBags?: number | null,
  options?: {
    totalBagsOverride?: number;
    bagConversionRate?: number;
    purchasedBags?: number;
    customDeductions?: CustomDeductionLine[];
    otherDeductionsEnabled?: boolean;
  }
) {
  const safeNew = Math.max(0, Number(newBags) || 0);
  const safeOld = Math.max(0, Number(oldBags) || 0);
  const totalBags = options?.totalBagsOverride !== undefined && options.totalBagsOverride !== null
    ? Math.max(0, Number(options.totalBagsOverride) || 0)
    : (safeNew + safeOld);

  let effectivePakki: number;
  if (pakkiBags !== undefined && pakkiBags !== null) {
    effectivePakki = Math.max(0, Number(pakkiBags) || 0);
  } else {
    // Standard Mandi Rule: Fixed Pakki Labour (ਮੂਲ ਲੇਬਰ) applies to ALL total bags by default!
    // Pakha (Double) and Sukki are independent additional charges on bags that required them.
    effectivePakki = totalBags;
  }

  return computeUniversalLabour({
    totalBags,
    pakkiBags: effectivePakki,
    pakkiRate: customRates?.pakkiRate,
    doubleBags,
    doubleRate: customRates?.doubleRate,
    sukkiBags,
    sukkiRate: customRates?.sukkiRate,
    grossAmount,
    bagConversionRate: options?.bagConversionRate,
    purchasedBags: options?.purchasedBags,
    customDeductions: options?.customDeductions,
    otherDeductionsEnabled: options?.otherDeductionsEnabled,
    settings
  });
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


