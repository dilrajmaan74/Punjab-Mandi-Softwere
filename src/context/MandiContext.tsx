import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Farmer,
  BankDetails,
  BagsEntryRecord,
  BardanaReceivedRecord,
  BardanaInventorySummary,
  DailyPurchaseRecord,
  FarmerPurchaseSummary,
  FarmerPaymentRecord,
  FarmerAdvanceRecord,
  LinkedPurchaseDetail,
  BoliRecord,
  FarmerAccountSummary,
  ProcurementAgency,
  PinCodeVillageMapping,
  MandiSettings,
  NavigationSection,
  AppLanguage,
  LeftingRecord,
  RecycleBinItem,
  MandiFirm,
  SellerMaster,
  OtherPartyBardanaBalance,
  TruckMasterRecord,
  LabourMate,
  LabourWorkEntry,
  LabourAdvancePayment
} from '../types/mandi';
import { INITIAL_PIN_CODES } from '../data/pinCodes';
import {
  formatKgToQulKg,
  calculatePayableAmount,
  calculateAdvanceInterest,
  formatDateToDDMMYYYY,
  FIXED_BAG_WEIGHT_KG,
  FIXED_RATE_PER_QTL,
  calculateAutomaticLabour
} from '../utils/calculations';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  loadAllDataFromSupabase,
  migrateAllDataToSupabase,
  supabaseUpsertFarmer,
  supabaseDeleteFarmer,
  supabaseUpsertBagsEntry,
  supabaseDeleteBagsEntry,
  supabaseUpsertBardana,
  supabaseDeleteBardana,
  supabaseUpsertDailyPurchase,
  supabaseDeleteDailyPurchase,
  supabaseUpsertPayment,
  supabaseDeletePayment,
  supabaseUpsertAdvance,
  supabaseDeleteAdvance,
  supabaseUpsertBoli,
  supabaseDeleteBoli,
  supabaseUpsertLefting,
  supabaseDeleteLefting,
  supabaseUpsertTruck,
  supabaseDeleteTruck,
  supabaseUpsertSeller,
  supabaseDeleteSeller,
  supabaseUpsertFirm,
  supabaseDeleteFirm,
  supabaseSaveActiveFirmContext,
  supabaseSaveFiscalYears,
  supabaseSaveActiveFiscalYearContext,
  supabaseSaveAgencies,
  supabaseSaveSettings,
  supabaseSavePinCodes,
  supabaseUpsertRecycleItem,
  supabaseDeleteRecycleItem,
  supabaseClearRecycleBin
} from '../services/supabaseService';
import {
  addFarmerAuditLog,
  getMaxFarmerSequence,
  recordFarmerSequence
} from '../utils/farmerAuditLog';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedBy?: 'Aadhaar Number' | 'Farmer Name & Village' | 'Farmer ID';
  existingFarmer?: Farmer;
}

export const DEFAULT_AGENCIES: ProcurementAgency[] = [
  { id: 'AG-01', nameEn: 'Markfed', namePa: 'ਮਾਰਕਫੈੱਡ (Markfed)', code: 'MARKFED', isDefault: true },
  { id: 'AG-02', nameEn: 'Pungrain', namePa: 'ਪਨਗ੍ਰੇਨ (Pungrain)', code: 'PUNGRAIN', isDefault: true },
  { id: 'AG-03', nameEn: 'PUNSUP', namePa: 'ਪਨਸਪ (PUNSUP)', code: 'PUNSUP', isDefault: true },
  { id: 'AG-04', nameEn: 'PSWC', namePa: 'ਪੰਜਾਬ ਸਟੇਟ ਵੇਅਰਹਾਊਸਿੰਗ (PSWC)', code: 'PSWC', isDefault: true },
  { id: 'AG-05', nameEn: 'FCI', namePa: 'ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ (FCI)', code: 'FCI', isDefault: true },
  { id: 'AG-06', nameEn: 'Other Agency', namePa: 'ਹੋਰ ਖਰੀਦ ਏਜੰਸੀ (Other Agency)', code: 'OTHER' }
];

export const DEFAULT_FIRM: MandiFirm = {
  id: 'FIRM-001',
  name: 'Jammu Trading Co',
  namePa: 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ',
  address: 'Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629',
  addressPa: 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ, ਤਹਿ. ਸ਼ਾਹਕੋਟ, ਜ਼ਿਲ੍ਹਾ ਜਲੰਧਰ, ਪੰਜਾਬ - 144629',
  marketCommittee: 'Lohian Khas',
  marketCommitteePa: 'ਲੋਹੀਆਂ ਖਾਸ',
  mobile: '98147-74651',
  licenceNo: 'JAL/LKH/133',
  pan: 'AAACJ1234F',
  gstin: '03AAACJ1234F1Z5',
  isDefault: true,
  createdAt: '01/04/2024'
};

export const DEFAULT_FISCAL_YEARS = ['2024-25', '2025-26', '2026-27'];
export const DEFAULT_ACTIVE_YEAR = '2025-26';

export const DEFAULT_SELLERS: SellerMaster[] = [
  {
    id: 'SLR-001',
    name: 'Kang Modern Rice Sheller',
    namePa: 'ਕੰਗ ਮਾਡਰਨ ਰਾਈਸ ਸ਼ੈਲਰ',
    sellerType: 'SHELLER_MILL',
    address: 'Kang Khurd Road, Lohian Khas, Distt. Jalandhar - 144629',
    addressPa: 'ਕੰਗ ਖੁਰਦ ਰੋਡ, ਲੋਹੀਆਂ ਖਾਸ, ਜਲੰਧਰ - 144629',
    mobile: '98142-33445',
    contactPerson: 'Gurmeet Singh',
    associatedAgencies: ['Markfed', 'Pungrain', 'Punsup']
  },
  {
    id: 'SLR-002',
    name: 'Lohian Agro Foods Sheller',
    namePa: 'ਲੋਹੀਆਂ ਐਗਰੋ ਫੂਡਜ਼ ਸ਼ੈਲਰ',
    sellerType: 'SHELLER_MILL',
    address: 'Malsian Road, Shahkot, Jalandhar - 144702',
    addressPa: 'ਮਲਸੀਆਂ ਰੋਡ, ਸ਼ਾਹਕੋਟ, ਜਲੰਧਰ - 144702',
    mobile: '98721-55667',
    contactPerson: 'Harpreet Singh',
    associatedAgencies: ['Markfed', 'PSWC', 'FCI']
  },
  {
    id: 'SLR-003',
    name: 'Khalsa Commission Agent',
    namePa: 'ਖਾਲਸਾ ਕਮਿਸ਼ਨ ਏਜੰਟ',
    sellerType: 'COMMISSION_AGENT',
    address: 'Shop No. 14, Dana Mandi Kang Khurd - 144629',
    addressPa: 'ਦੁਕਾਨ ਨੰ. 14, ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ - 144629',
    mobile: '98150-12345',
    contactPerson: 'Sukhdev Singh'
  }
];

interface MandiContextType {
  farmers: Farmer[];
  bagsEntries: BagsEntryRecord[];
  bardanaRecords: BardanaReceivedRecord[];
  dailyPurchaseRecords: DailyPurchaseRecord[];
  farmerPayments: FarmerPaymentRecord[];
  farmerAdvances: FarmerAdvanceRecord[];
  boliRecords: BoliRecord[];
  leftingRecords: LeftingRecord[];
  recycleBinItems: RecycleBinItem[];
  agencies: ProcurementAgency[];
  pinCodes: PinCodeVillageMapping[];
  settings: MandiSettings;
  activeSection: NavigationSection;
  setActiveSection: (sec: NavigationSection) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;

  // Multi-Firm State & Operations
  firms: MandiFirm[];
  activeFirmId: string;
  activeFirm: MandiFirm;
  setActiveFirmId: (id: string) => void;
  addFirm: (firm: Omit<MandiFirm, 'id'>) => MandiFirm;
  updateFirm: (id: string, updates: Partial<MandiFirm>) => boolean;
  deleteFirm: (id: string) => { success: boolean; message?: string };

  // Multi-Fiscal-Year State & Operations
  fiscalYears: string[];
  activeFiscalYear: string;
  setActiveFiscalYear: (year: string) => void;
  addFiscalYear: (year: string) => void;

  // Multi-Seller Master State & Operations
  sellers: SellerMaster[];
  addSeller: (seller: Omit<SellerMaster, 'id'>) => SellerMaster;
  updateSeller: (id: string, updates: Partial<SellerMaster>) => boolean;
  deleteSeller: (id: string) => boolean;
  
  // Receipt Modal State
  activeReceipt: BagsEntryRecord | null;
  setActiveReceipt: (rec: BagsEntryRecord | null) => void;

  // Bags Entry Edit Modal State
  activeBagsEntryToEdit: BagsEntryRecord | null;
  setActiveBagsEntryToEdit: (rec: BagsEntryRecord | null) => void;

  // Selected Farmer for direct routing to Bags Entry
  selectedFarmerForBags: Farmer | null;
  setSelectedFarmerForBags: (farmer: Farmer | null) => void;

  // Selected Farmer for Farmer Account
  selectedFarmerForAccount: Farmer | null;
  setSelectedFarmerForAccount: (farmer: Farmer | null) => void;

  // Selected Purchase Record for Viewing/Editing
  activePurchaseRecord: DailyPurchaseRecord | null;
  setActivePurchaseRecord: (rec: DailyPurchaseRecord | null) => void;

  // Farmer operations
  generateNextFarmerId: () => string;
  checkDuplicateFarmer: (params: {
    farmerName: string;
    aadhaar: string;
    village: string;
    farmerId?: string;
  }) => DuplicateCheckResult;
  registerFarmer: (farmerData: Omit<Farmer, 'id' | 'createdAt'> & { id?: string }) => {
    success: boolean;
    farmer?: Farmer;
    existingFarmer?: Farmer;
    message?: string;
  };
  updateFarmer: (id: string, updates: Partial<Farmer>) => boolean;
  deleteFarmer: (id: string, deletedBy?: string) => boolean;
  getFarmerById: (id: string) => Farmer | undefined;
  getFarmerByAadhaar: (aadhaar: string) => Farmer | undefined;
  saveFarmerBankDetails: (farmerId: string, bankDetails: BankDetails) => boolean;

  // Farmer Account & Summaries
  getCompleteFarmerAccount: (farmerId: string) => FarmerAccountSummary | null;

  // Payment Operations
  addFarmerPayment: (payment: Omit<FarmerPaymentRecord, 'id' | 'createdAt'>) => FarmerPaymentRecord;
  deleteFarmerPayment: (id: string) => boolean;

  // Advance Payment & Interest Operations
  generateNextAdvanceId: () => string;
  addFarmerAdvance: (advance: Omit<FarmerAdvanceRecord, 'id' | 'createdAt' | 'interestAmount' | 'totalDays' | 'monthsElapsed' | 'daysElapsed' | 'totalPayableWithInterest'> & { id?: string }) => FarmerAdvanceRecord;
  updateFarmerAdvance: (id: string, updates: Partial<FarmerAdvanceRecord>) => boolean;
  deleteFarmerAdvance: (id: string) => boolean;

  // Boli Operations
  addBoliRecord: (record: Omit<BoliRecord, 'id' | 'createdAt'>) => BoliRecord;
  updateBoliRecord: (id: string, updates: Partial<BoliRecord>) => boolean;
  deleteBoliRecord: (id: string) => boolean;

  // Labour Gang / Mates Ledger Operations
  labourMates: LabourMate[];
  addLabourMate: (mate: Omit<LabourMate, 'id' | 'createdAt'>) => LabourMate;
  updateLabourMate: (id: string, updates: Partial<LabourMate>) => boolean;
  deleteLabourMate: (id: string) => boolean;
  labourWorkEntries: LabourWorkEntry[];
  addLabourWorkEntry: (entry: Omit<LabourWorkEntry, 'id' | 'createdAt'>) => LabourWorkEntry;
  deleteLabourWorkEntry: (id: string) => boolean;
  labourAdvancePayments: LabourAdvancePayment[];
  addLabourAdvancePayment: (payment: Omit<LabourAdvancePayment, 'id' | 'createdAt'>) => LabourAdvancePayment;
  deleteLabourAdvancePayment: (id: string) => boolean;

  // Bags operations
  getNextParchiNo: () => number;
  addBagsEntry: (entry: Omit<BagsEntryRecord, 'id' | 'entryNumber' | 'createdAt'>) => BagsEntryRecord;
  addMultipleBagsEntries: (entries: Omit<BagsEntryRecord, 'id' | 'entryNumber' | 'createdAt'>[]) => BagsEntryRecord[];
  updateBagsEntry: (id: string, updates: Partial<BagsEntryRecord>) => boolean;
  deleteBagsEntry: (id: string) => boolean;

  // Bardana Operations
  generateNextBardanaId: () => string;
  addBardanaRecord: (record: Omit<BardanaReceivedRecord, 'id' | 'createdAt'> & { id?: string }) => BardanaReceivedRecord;
  updateBardanaRecord: (id: string, updates: Partial<BardanaReceivedRecord>) => boolean;
  deleteBardanaRecord: (id: string) => boolean;
  getBardanaSummary: () => BardanaInventorySummary;

  // Daily Purchase Operations
  generateNextPurchaseId: () => string;
  addDailyPurchase: (purchase: Omit<DailyPurchaseRecord, 'id' | 'createdAt'> & { id?: string }) => {
    success: boolean;
    record?: DailyPurchaseRecord;
    messageEn?: string;
    messagePa?: string;
  };
  updateDailyPurchase: (id: string, updates: Partial<DailyPurchaseRecord>) => {
    success: boolean;
    record?: DailyPurchaseRecord;
    messageEn?: string;
    messagePa?: string;
  };
  deleteDailyPurchase: (id: string) => boolean;
  getFarmerPurchaseSummary: (farmerId: string) => FarmerPurchaseSummary;
  getAllFarmersPurchaseSummaries: () => FarmerPurchaseSummary[];

  // Lefting Operations
  generateNextLeftingId: () => string;
  addLeftingRecord: (record: Omit<LeftingRecord, 'id' | 'createdAt'> & { id?: string }) => {
    success: boolean;
    record?: LeftingRecord;
    messageEn?: string;
    messagePa?: string;
  };
  updateLeftingRecord: (id: string, updates: Partial<LeftingRecord>) => boolean;
  deleteLeftingRecord: (id: string) => boolean;

  // Recycle Bin Operations
  restoreRecycleBinItem: (id: string, restoredBy?: string) => boolean;
  permanentlyDeleteRecycleBinItem: (id: string, deletedBy?: string) => boolean;
  emptyRecycleBin: () => void;

  // Agency Operations
  addAgency: (agency: Omit<ProcurementAgency, 'id'>) => ProcurementAgency;
  updateAgency: (id: string, updates: Partial<ProcurementAgency>) => boolean;
  deleteAgency: (id: string) => boolean;

  // PIN code operations
  addVillageToPinCode: (pinCode: string, villageEn: string, villagePa: string) => void;
  addNewPinCode: (pinCode: string, districtEn: string, districtPa: string, villageEn: string, villagePa: string) => void;

  // Truck Master Operations
  trucks: TruckMasterRecord[];
  addTruck: (truck: Omit<TruckMasterRecord, 'id' | 'createdAt'>) => TruckMasterRecord;
  addTrucksBulk: (trucksList: Array<Omit<TruckMasterRecord, 'id' | 'createdAt'>>) => { added: number; updated: number };
  updateTruck: (id: string, updates: Partial<TruckMasterRecord>) => boolean;
  deleteTruck: (id: string) => boolean;
  searchTrucksByLastDigits: (query: string) => TruckMasterRecord[];

  // Settings & DB Reset
  updateSettings: (newSettings: Partial<MandiSettings>) => void;
  resetAllData: () => void;

  // Supabase Cloud PostgreSQL Integration
  supabaseSyncStatus: 'idle' | 'syncing' | 'connected' | 'error';
  supabaseSyncError: string | null;
  supabaseLastSyncedAt: string | null;
  isSupabaseConfigured: boolean;
  syncWithSupabase: () => Promise<void>;
  migrateDataToSupabase: () => Promise<{ success: boolean; stats: any; error?: string }>;
  isSupabaseSyncModalOpen: boolean;
  setIsSupabaseSyncModalOpen: (open: boolean) => void;
}

const MandiContext = createContext<MandiContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  FARMERS: 'punjab_mandi_farmers_v2',
  BAGS_ENTRIES: 'punjab_mandi_bags_entries_v2',
  BARDANA: 'punjab_mandi_bardana_v2',
  DAILY_PURCHASES: 'punjab_mandi_daily_purchases_v2',
  FARMER_PAYMENTS: 'punjab_mandi_farmer_payments_v2',
  ADVANCES: 'punjab_mandi_advances_v2',
  BOLI_RECORDS: 'punjab_mandi_boli_records_v2',
  LEFTING: 'punjab_mandi_lefting_v2',
  RECYCLE_BIN: 'punjab_mandi_recycle_bin_v2',
  AGENCIES: 'punjab_mandi_agencies_v2',
  PIN_CODES: 'punjab_mandi_pincodes_v2',
  SETTINGS: 'punjab_mandi_settings_v2',
  LANGUAGE: 'punjab_mandi_language_v2',
  FIRMS: 'punjab_mandi_firms_v2',
  ACTIVE_FIRM_ID: 'punjab_mandi_active_firm_v2',
  FISCAL_YEARS: 'punjab_mandi_fiscal_years_v2',
  ACTIVE_FISCAL_YEAR: 'punjab_mandi_active_fiscal_year_v2',
  SELLERS: 'punjab_mandi_sellers_v2',
  TRUCKS: 'punjab_mandi_trucks_v2',
  LABOUR_MATES: 'punjab_mandi_labour_mates_v2',
  LABOUR_WORK_ENTRIES: 'punjab_mandi_labour_work_entries_v2',
  LABOUR_ADVANCE_PAYMENTS: 'punjab_mandi_labour_advance_payments_v2'
};

const DEFAULT_LABOUR_MATES: LabourMate[] = [
  {
    id: 'MATE-001',
    mateName: 'Kalu Mate',
    mateNamePa: 'ਕਾਲੂ ਮੇਟ',
    mobile: '98721-88901',
    village: 'ਕੰਗ ਖੁਰਦ',
    teamSize: 14,
    notes: 'ਫੜ੍ਹ ਨੰ. 1 ਅਤੇ ਤੁਲਾਈ ਟੀਮ',
    createdAt: '01/09/2026'
  },
  {
    id: 'MATE-002',
    mateName: 'Jeeta Mate',
    mateNamePa: 'ਜੀਤਾ ਮੇਟ',
    mobile: '98145-22341',
    village: 'ਲੋਹੀਆਂ',
    teamSize: 10,
    notes: 'ਟਰੱਕ ਲੋਡਿੰਗ ਅਤੇ ਲਿਫਟਿੰਗ ਟੀਮ',
    createdAt: '01/09/2026'
  },
  {
    id: 'MATE-003',
    mateName: 'Ramu Mate',
    mateNamePa: 'ਰਾਮੂ ਮੇਟ',
    mobile: '94172-66554',
    village: 'ਮਲਸੀਆਂ',
    teamSize: 12,
    notes: 'ਪੱਖਾ ਅਤੇ ਛਣਾਈ ਟੀਮ',
    createdAt: '01/09/2026'
  }
];

const DEFAULT_SETTINGS: MandiSettings = {
  mandiNameEn: 'Dana Mandi Kang Khurd',
  mandiNamePa: 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ',
  marketCommitteeEn: 'Market Committee Lohian Khas',
  marketCommitteePa: 'ਮਾਰਕੀਟ ਕਮੇਟੀ ਲੋਹੀਆਂ ਖਾਸ',
  firmNameEn: 'Jammu Trading Co',
  firmNamePa: 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ',
  firmAddress: 'Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629',
  firmMobile: '98147-74651',
  firmLicence: 'JAL/LKH/133',
  firmPan: 'AAACJ1234F',
  firmGstin: '03AAACJ1234F1Z5',
  fixedRatePerQtl: 2461,
  fixedBagWeightKg: 37.50,
  defaultPakkiLabourRate: 8, // default ₹8 / Bag (Fixed Labour - ਪੱਕੀ ਲੇਬਰ)
  defaultPakkaDoubleLabourRate: 14, // default ₹14 / Bag
  defaultSukhiLabourRate: 5, // default ₹5 / Bag
  requireAgencyPurchaseBeforeLefting: true
};

export const MandiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Farmers list - starts EMPTY by default (no fake records)
  const [farmers, setFarmers] = useState<Farmer[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.FARMERS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 2. Bags entries - starts EMPTY by default
  const [bagsEntries, setBagsEntries] = useState<BagsEntryRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.BAGS_ENTRIES);
      if (!stored) return [];
      const parsed: BagsEntryRecord[] = JSON.parse(stored);
      // Auto-repair any entries where Pakha or Sukhi was calculated, but fixed Pakki labour was omitted (the subtraction bug)
      let needsSave = false;
      const repaired = parsed.map((entry) => {
        const totalBags = entry.bags || ((entry.newBags || 0) + (entry.oldBags || 0));
        const hasDoubleOrSukki = 
          (entry.conditionBreakdown?.doubleBags !== undefined && entry.conditionBreakdown.doubleBags > 0) ||
          (entry.conditionBreakdown?.sukkiBags !== undefined && entry.conditionBreakdown.sukkiBags > 0) ||
          (entry.labourDeductions?.pakkaDoubleLabourAmount !== undefined && entry.labourDeductions.pakkaDoubleLabourAmount > 0) ||
          (entry.labourDeductions?.sukhiLabourAmount !== undefined && entry.labourDeductions.sukhiLabourAmount > 0);

        const pakkiAmount = entry.conditionBreakdown?.pakkiAmount ?? entry.labourDeductions?.pakkiLabourAmount ?? 0;
        const pakkiBags = entry.conditionBreakdown?.pakkiBags ?? entry.labourDeductions?.pakkiBagsCount ?? 0;

        // If entry had double or sukki bags, but pakki bags or amount was 0 because of the old bug:
        if (totalBags > 0 && hasDoubleOrSukki && (pakkiAmount === 0 || pakkiBags === 0)) {
          needsSave = true;
          const doubleBags = entry.conditionBreakdown?.doubleBags ?? entry.labourDeductions?.doubleBagsCount ?? 0;
          const doubleRate = entry.conditionBreakdown?.doubleRate ?? entry.labourDeductions?.pakkaDoubleLabourRate ?? 14;
          const sukkiBags = entry.conditionBreakdown?.sukkiBags ?? entry.labourDeductions?.sukkiBagsCount ?? 0;
          const sukkiRate = entry.conditionBreakdown?.sukkiRate ?? entry.labourDeductions?.sukhiLabourRate ?? 5;
          const pakkiRate = 8; // Fixed ₹8 pakki labour

          const recalc = calculateAutomaticLabour(
            entry.newBags || 0,
            entry.oldBags || 0,
            doubleBags,
            sukkiBags,
            entry.totalAmount,
            undefined,
            { pakkiRate, doubleRate, sukkiRate },
            totalBags, // Fixed Pakki labour applies to all total bags!
            { totalBagsOverride: totalBags }
          );

          return {
            ...entry,
            labourDeductions: recalc.labourDeductions,
            conditionBreakdown: recalc.conditionBreakdown,
            netAmount: recalc.netAmount
          };
        }
        return entry;
      });

      if (needsSave) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.BAGS_ENTRIES, JSON.stringify(repaired));
      }
      return repaired;
    } catch {
      return [];
    }
  });

  // 3. Bardana Received Records - starts EMPTY by default
  const [bardanaRecords, setBardanaRecords] = useState<BardanaReceivedRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.BARDANA);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4. Daily Purchase Records - starts EMPTY by default
  const [dailyPurchaseRecords, setDailyPurchaseRecords] = useState<DailyPurchaseRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.DAILY_PURCHASES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4b. Farmer Payment Records - starts EMPTY by default
  const [farmerPayments, setFarmerPayments] = useState<FarmerPaymentRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.FARMER_PAYMENTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4c. Farmer Advance Records - starts EMPTY by default
  const [farmerAdvances, setFarmerAdvances] = useState<FarmerAdvanceRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.ADVANCES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4d. Boli Records - starts EMPTY by default
  const [boliRecords, setBoliRecords] = useState<BoliRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.BOLI_RECORDS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4d-2. Labour Mates / Palledar Gangs
  const [labourMates, setLabourMates] = useState<LabourMate[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LABOUR_MATES);
      return stored ? JSON.parse(stored) : DEFAULT_LABOUR_MATES;
    } catch {
      return DEFAULT_LABOUR_MATES;
    }
  });

  // 4d-3. Labour Work Entries (Palledari/Loading/Cleaning tasks)
  const [labourWorkEntries, setLabourWorkEntries] = useState<LabourWorkEntry[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LABOUR_WORK_ENTRIES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4d-4. Labour Advance / Kharcha Payments
  const [labourAdvancePayments, setLabourAdvancePayments] = useState<LabourAdvancePayment[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LABOUR_ADVANCE_PAYMENTS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4e. Lefting (Sheller Dispatch) Records - starts EMPTY by default
  const [leftingRecords, setLeftingRecords] = useState<LeftingRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LEFTING);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 4f. Recycle Bin Items - starts EMPTY by default
  const [recycleBinItems, setRecycleBinItems] = useState<RecycleBinItem[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 5. Procurement Agencies list
  const [agencies, setAgencies] = useState<ProcurementAgency[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.AGENCIES);
      return stored ? JSON.parse(stored) : DEFAULT_AGENCIES;
    } catch {
      return DEFAULT_AGENCIES;
    }
  });

  // 6. PIN Codes & Villages Mapping Database
  const [pinCodes, setPinCodes] = useState<PinCodeVillageMapping[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.PIN_CODES);
      if (stored) {
        const parsed: PinCodeVillageMapping[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          INITIAL_PIN_CODES.forEach((initPin) => {
            const existingIdx = merged.findIndex((p) => p.pinCode === initPin.pinCode);
            if (existingIdx === -1) {
              merged.push(initPin);
            } else {
              const existingVillages = merged[existingIdx].villages;
              initPin.villages.forEach((initV) => {
                if (!existingVillages.some((ev) => ev.en.toLowerCase() === initV.en.toLowerCase())) {
                  existingVillages.push(initV);
                }
              });
            }
          });
          return merged;
        }
      }
      return INITIAL_PIN_CODES;
    } catch {
      return INITIAL_PIN_CODES;
    }
  });

  // 7. Mandi Settings
  const [settings, setSettings] = useState<MandiSettings>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.fixedRatePerQtl === 2475 || !parsed.fixedRatePerQtl) {
          parsed.fixedRatePerQtl = 2461;
        }
        if (!parsed.defaultPakkiLabourRate || parsed.defaultPakkiLabourRate === 7) {
          parsed.defaultPakkiLabourRate = 8;
        }
        if (parsed.mandiNameEn && (parsed.mandiNameEn.includes('Khanna') || parsed.mandiNameEn.includes('Khanan'))) {
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            mandiNameEn: DEFAULT_SETTINGS.mandiNameEn,
            mandiNamePa: DEFAULT_SETTINGS.mandiNamePa,
            marketCommitteeEn: DEFAULT_SETTINGS.marketCommitteeEn,
            marketCommitteePa: DEFAULT_SETTINGS.marketCommitteePa,
            firmNameEn: DEFAULT_SETTINGS.firmNameEn,
            firmNamePa: DEFAULT_SETTINGS.firmNamePa,
            firmAddress: DEFAULT_SETTINGS.firmAddress,
            firmMobile: DEFAULT_SETTINGS.firmMobile,
            firmLicence: DEFAULT_SETTINGS.firmLicence
          };
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // 8. Multi-Firm Management
  const [firms, setFirms] = useState<MandiFirm[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.FIRMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((f: MandiFirm) => {
            if (f.id === 'FIRM-001' || f.isDefault) {
              return {
                ...DEFAULT_FIRM,
                ...f,
                name: f.name || DEFAULT_FIRM.name,
                address: f.address || DEFAULT_FIRM.address,
                marketCommittee: f.marketCommittee || DEFAULT_FIRM.marketCommittee,
                mobile: f.mobile || DEFAULT_FIRM.mobile,
                licenceNo: f.licenceNo || DEFAULT_FIRM.licenceNo
              };
            }
            return f;
          });
        }
      }
      return [DEFAULT_FIRM];
    } catch {
      return [DEFAULT_FIRM];
    }
  });

  const [activeFirmId, setActiveFirmId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_FIRM_ID);
      return stored || DEFAULT_FIRM.id;
    } catch {
      return DEFAULT_FIRM.id;
    }
  });

  // 9. Multi-Fiscal-Year Management
  const [fiscalYears, setFiscalYears] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.FISCAL_YEARS);
      return stored ? JSON.parse(stored) : DEFAULT_FISCAL_YEARS;
    } catch {
      return DEFAULT_FISCAL_YEARS;
    }
  });

  const [activeFiscalYear, setActiveFiscalYear] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_FISCAL_YEAR);
      return stored || DEFAULT_ACTIVE_YEAR;
    } catch {
      return DEFAULT_ACTIVE_YEAR;
    }
  });

  // 10. Multi-Seller Master Management
  const [sellers, setSellers] = useState<SellerMaster[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SELLERS);
      return stored ? JSON.parse(stored) : DEFAULT_SELLERS;
    } catch {
      return DEFAULT_SELLERS;
    }
  });

  // 11. Truck Master Directory
  const [trucks, setTrucks] = useState<TruckMasterRecord[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.TRUCKS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const activeFirm = firms.find((f) => f.id === activeFirmId) || firms[0] || DEFAULT_FIRM;

  // 12. Navigation & UI States
  const [activeSection, setActiveSection] = useState<NavigationSection>('dashboard');
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LANGUAGE);
      return stored === 'en' || stored === 'pa' ? stored : 'pa';
    } catch {
      return 'pa';
    }
  });
  const [activeReceipt, setActiveReceipt] = useState<BagsEntryRecord | null>(null);
  const [activeBagsEntryToEdit, setActiveBagsEntryToEdit] = useState<BagsEntryRecord | null>(null);
  const [selectedFarmerForBags, setSelectedFarmerForBags] = useState<Farmer | null>(null);
  const [selectedFarmerForAccount, setSelectedFarmerForAccount] = useState<Farmer | null>(null);
  const [activePurchaseRecord, setActivePurchaseRecord] = useState<DailyPurchaseRecord | null>(null);

  // 13. Supabase Cloud PostgreSQL Integration States
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<'idle' | 'syncing' | 'connected' | 'error'>('idle');
  const [supabaseSyncError, setSupabaseSyncError] = useState<string | null>(null);
  const [supabaseLastSyncedAt, setSupabaseLastSyncedAt] = useState<string | null>(null);
  const [isSupabaseSyncModalOpen, setIsSupabaseSyncModalOpen] = useState<boolean>(false);

  /**
   * Migrate all local state records into Supabase PostgreSQL tables
   */
  const migrateDataToSupabase = async () => {
    setSupabaseSyncStatus('syncing');
    setSupabaseSyncError(null);
    const res = await migrateAllDataToSupabase({
      farmers,
      bagsEntries,
      bardanaRecords,
      dailyPurchaseRecords,
      farmerPayments,
      farmerAdvances,
      boliRecords,
      leftingRecords,
      recycleBinItems,
      agencies,
      pinCodes,
      settings,
      firms,
      activeFirmId,
      fiscalYears,
      activeFiscalYear,
      sellers,
      trucks
    });

    if (res.success) {
      setSupabaseSyncStatus('connected');
      setSupabaseLastSyncedAt(new Date().toISOString());
      setSupabaseSyncError(null);
    } else {
      setSupabaseSyncStatus('error');
      setSupabaseSyncError(res.error || 'Failed to migrate data to Supabase.');
    }
    return res;
  };

  /**
   * Sync all 17 datasets from Supabase PostgreSQL (Supabase is PRIMARY)
   */
  const syncWithSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setSupabaseSyncStatus('error');
      setSupabaseSyncError('Supabase publishable key is not configured.');
      return;
    }

    setSupabaseSyncStatus('syncing');
    setSupabaseSyncError(null);

    try {
      const res = await loadAllDataFromSupabase();
      if (res.success && res.data) {
        const d = res.data;
        const hasSupabaseData =
          d.farmers.length > 0 ||
          d.bagsEntries.length > 0 ||
          d.dailyPurchaseRecords.length > 0 ||
          d.leftingRecords.length > 0 ||
          d.bardanaRecords.length > 0 ||
          d.farmerPayments.length > 0 ||
          d.farmerAdvances.length > 0 ||
          d.trucks.length > 0;

        if (hasSupabaseData) {
          // Supabase is the PRIMARY source of truth
          if (d.farmers) setFarmers(d.farmers);
          if (d.bagsEntries) setBagsEntries(d.bagsEntries);
          if (d.bardanaRecords) setBardanaRecords(d.bardanaRecords);
          if (d.dailyPurchaseRecords) setDailyPurchaseRecords(d.dailyPurchaseRecords);
          if (d.farmerPayments) setFarmerPayments(d.farmerPayments);
          if (d.farmerAdvances) setFarmerAdvances(d.farmerAdvances);
          if (d.boliRecords) setBoliRecords(d.boliRecords);
          if (d.leftingRecords) setLeftingRecords(d.leftingRecords);
          if (d.recycleBinItems) setRecycleBinItems(d.recycleBinItems);
          if (d.agencies && d.agencies.length > 0) setAgencies(d.agencies);
          if (d.pinCodes && d.pinCodes.length > 0) setPinCodes(d.pinCodes);
          if (d.firms && d.firms.length > 0) setFirms(d.firms);
          if (d.activeFirmId) setActiveFirmId(d.activeFirmId);
          if (d.fiscalYears && d.fiscalYears.length > 0) setFiscalYears(d.fiscalYears);
          if (d.activeFiscalYear) setActiveFiscalYear(d.activeFiscalYear);
          if (d.sellers && d.sellers.length > 0) setSellers(d.sellers);
          if (d.trucks && d.trucks.length > 0) setTrucks(d.trucks);
          if (d.settings) setSettings(d.settings);
        } else {
          // Supabase is empty or newly created: Do NOT auto-migrate until security audit & explicit user migration
          console.info('Supabase database connected. Ready for manual migration after security audit.');
        }

        setSupabaseSyncStatus('connected');
        setSupabaseLastSyncedAt(new Date().toISOString());
        setSupabaseSyncError(null);
      } else if (res.tablesMissing) {
        setSupabaseSyncStatus('error');
        setSupabaseSyncError('One or more tables missing in Supabase. Please run the SQL schema migration.');
      } else {
        setSupabaseSyncStatus('error');
        setSupabaseSyncError(res.error || 'Failed to sync with Supabase.');
      }
    } catch (err: any) {
      setSupabaseSyncStatus('error');
      setSupabaseSyncError(err.message || 'Supabase network error occurred.');
    }
  };

  // Connect to Supabase on mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      syncWithSupabase();
    }
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TRUCKS, JSON.stringify(trucks));
  }, [trucks]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FARMERS, JSON.stringify(farmers));
  }, [farmers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BAGS_ENTRIES, JSON.stringify(bagsEntries));
  }, [bagsEntries]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BARDANA, JSON.stringify(bardanaRecords));
  }, [bardanaRecords]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DAILY_PURCHASES, JSON.stringify(dailyPurchaseRecords));
  }, [dailyPurchaseRecords]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FARMER_PAYMENTS, JSON.stringify(farmerPayments));
  }, [farmerPayments]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ADVANCES, JSON.stringify(farmerAdvances));
  }, [farmerAdvances]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BOLI_RECORDS, JSON.stringify(boliRecords));
  }, [boliRecords]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LEFTING, JSON.stringify(leftingRecords));
  }, [leftingRecords]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN, JSON.stringify(recycleBinItems));
  }, [recycleBinItems]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AGENCIES, JSON.stringify(agencies));
  }, [agencies]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PIN_CODES, JSON.stringify(pinCodes));
  }, [pinCodes]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FIRMS, JSON.stringify(firms));
  }, [firms]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_FIRM_ID, activeFirmId);
  }, [activeFirmId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FISCAL_YEARS, JSON.stringify(fiscalYears));
  }, [fiscalYears]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_FISCAL_YEAR, activeFiscalYear);
  }, [activeFiscalYear]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LANGUAGE, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SELLERS, JSON.stringify(sellers));
  }, [sellers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LABOUR_MATES, JSON.stringify(labourMates));
  }, [labourMates]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LABOUR_WORK_ENTRIES, JSON.stringify(labourWorkEntries));
  }, [labourWorkEntries]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LABOUR_ADVANCE_PAYMENTS, JSON.stringify(labourAdvancePayments));
  }, [labourAdvancePayments]);

  // Keep settings automatically in sync with activeFirm
  useEffect(() => {
    if (activeFirm) {
      setSettings((prev) => ({
        ...prev,
        firmNameEn: activeFirm.name,
        firmNamePa: activeFirm.namePa,
        firmAddress: activeFirm.address,
        firmMobile: activeFirm.mobile,
        firmLicence: activeFirm.licenceNo,
        firmPan: activeFirm.pan || prev.firmPan || 'AAACJ1234F',
        firmGstin: activeFirm.gstin || prev.firmGstin,
        mandiNameEn: activeFirm.address.split(',')[0]?.trim() || prev.mandiNameEn,
        mandiNamePa: activeFirm.addressPa?.split(',')[0]?.trim() || prev.mandiNamePa,
        marketCommitteeEn: `Market Committee ${activeFirm.marketCommittee}`,
        marketCommitteePa: `ਮਾਰਕੀਟ ਕਮੇਟੀ ${activeFirm.marketCommitteePa || activeFirm.marketCommittee}`
      }));
    }
  }, [activeFirmId, firms]);

  /**
   * Generates next sequential unique Farmer ID
   * Example: FRM000001, FRM000002
   * Guaranteed never to reuse old or deleted IDs!
   */
  const generateNextFarmerId = (): string => {
    let maxNum = getMaxFarmerSequence();
    farmers.forEach((f) => {
      const match = f.id.match(/^FRM(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    recycleBinItems.forEach((item) => {
      if (item.type === 'FARMER') {
        const idToCheck = item.originalId || item.recordData?.id || '';
        const match = idToCheck.match(/^FRM(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    bagsEntries.forEach((b) => {
      const match = b.farmerId?.match(/^FRM(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    dailyPurchaseRecords.forEach((p) => {
      const match = p.farmerId?.match(/^FRM(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    farmerAdvances.forEach((a) => {
      const match = a.farmerId?.match(/^FRM(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    recordFarmerSequence(nextNum);
    return `FRM${nextNum.toString().padStart(6, '0')}`;
  };

  /**
   * Check duplicate farmer
   */
  const checkDuplicateFarmer = ({
    farmerName,
    aadhaar,
    village,
    farmerId
  }: {
    farmerName: string;
    aadhaar: string;
    village: string;
    farmerId?: string;
  }): DuplicateCheckResult => {
    const cleanAadhaar = (aadhaar || '').replace(/\s+/g, '');
    const cleanName = (farmerName || '').trim().toLowerCase();
    const cleanVillage = (village || '').trim().toLowerCase();
    const cleanId = (farmerId || '').trim().toUpperCase();

    for (const f of farmers) {
      if (cleanId && f.id.toUpperCase() === cleanId) {
        return {
          isDuplicate: true,
          matchedBy: 'Farmer ID',
          existingFarmer: f
        };
      }

      if (cleanAadhaar && f.aadhaar.replace(/\s+/g, '') === cleanAadhaar) {
        return {
          isDuplicate: true,
          matchedBy: 'Aadhaar Number',
          existingFarmer: f
        };
      }

      if (
        cleanName &&
        cleanVillage &&
        f.farmerName.trim().toLowerCase() === cleanName &&
        f.village.trim().toLowerCase() === cleanVillage
      ) {
        return {
          isDuplicate: true,
          matchedBy: 'Farmer Name & Village',
          existingFarmer: f
        };
      }
    }

    return { isDuplicate: false };
  };

  /**
   * Register a new farmer
   */
  const registerFarmer = (farmerData: Omit<Farmer, 'id' | 'createdAt'> & { id?: string }) => {
    const dup = checkDuplicateFarmer({
      farmerName: farmerData.farmerName,
      aadhaar: farmerData.aadhaar,
      village: farmerData.village,
      farmerId: farmerData.id
    });

    if (dup.isDuplicate && dup.existingFarmer) {
      return {
        success: false,
        existingFarmer: dup.existingFarmer,
        message: `Farmer Already Registered (${dup.matchedBy}: ${dup.existingFarmer.id})`
      };
    }

    const newFarmerId = farmerData.id || generateNextFarmerId();
    const idMatch = newFarmerId.match(/^FRM(\d+)$/);
    if (idMatch) {
      recordFarmerSequence(parseInt(idMatch[1], 10));
    }
    const newFarmer: Farmer = {
      ...farmerData,
      id: newFarmerId,
      createdAt: new Date().toISOString()
    };

    setFarmers((prev) => [newFarmer, ...prev]);
    // Supabase async mirror
    supabaseUpsertFarmer(newFarmer, activeFirmId).catch(console.error);

    return {
      success: true,
      farmer: newFarmer,
      message: 'Farmer registered successfully'
    };
  };

  const updateFarmer = (id: string, updates: Partial<Farmer>): boolean => {
    setFarmers((prev) => {
      const updatedList = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      const target = updatedList.find((f) => f.id === id);
      if (target) supabaseUpsertFarmer(target, activeFirmId).catch(console.error);
      return updatedList;
    });
    return true;
  };

  const deleteFarmer = (id: string, deletedBy?: string): boolean => {
    const farmer = farmers.find((f) => f.id === id);
    if (!farmer) return false;

    const operator = deletedBy || `Admin / Software Owner (${settings.firmNameEn || 'Jammu Trading Co'})`;
    const deleteTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const softDeletedFarmer: Farmer = {
      ...farmer,
      isDeleted: true,
      deletedAt: deleteTimestamp,
      deletedBy: operator
    };

    const binItem: RecycleBinItem = {
      id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      originalId: farmer.id,
      type: 'FARMER',
      titleEn: `Farmer: ${farmer.farmerName} s/o ${farmer.fatherName || '—'}`,
      titlePa: `ਕਿਸਾਨ: ${farmer.farmerNamePa} ਸ/ਓ ${farmer.fatherNamePa || farmer.fatherName || '—'}`,
      subtitle: `ID: ${farmer.id} • Village: ${farmer.villagePa || farmer.village} • Mobile: ${farmer.mobile || '—'}`,
      deletedAt: deleteTimestamp,
      deletedBy: operator,
      recordData: softDeletedFarmer
    };

    setRecycleBinItems((prev) => [binItem, ...prev]);
    supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);

    // Audit log
    addFarmerAuditLog({
      action: 'FARMER_DELETED',
      farmerId: farmer.id,
      farmerName: farmer.farmerName,
      farmerNamePa: farmer.farmerNamePa,
      village: farmer.village,
      mobile: farmer.mobile,
      performedBy: operator,
      timestamp: deleteTimestamp,
      details: `Farmer soft deleted to Recycle Bin. All historical records preserved.`
    });

    // Remove from active farmers list (disappears from active Farmer Register and new dropdowns)
    setFarmers((prev) => prev.filter((f) => f.id !== id));
    supabaseDeleteFarmer(id).catch(console.error);

    // CRITICAL: NEVER delete historical transactions (arrivals, purchases, advances, payments, boli)
    // Historical records must remain safe and recoverable!

    if (selectedFarmerForBags?.id === id) {
      setSelectedFarmerForBags(null);
    }
    return true;
  };

  const getFarmerById = (id: string): Farmer | undefined => {
    if (!id) return undefined;
    const cleanId = id.trim().toUpperCase();
    const active = farmers.find((f) => f.id.toUpperCase() === cleanId);
    if (active) return active;
    const binItem = recycleBinItems.find(
      (item) => item.type === 'FARMER' && (item.originalId?.toUpperCase() === cleanId || item.recordData?.id?.toUpperCase() === cleanId)
    );
    return binItem?.recordData;
  };

  const getFarmerByAadhaar = (aadhaar: string): Farmer | undefined => {
    const clean = (aadhaar || '').replace(/\s+/g, '');
    return farmers.find((f) => f.aadhaar.replace(/\s+/g, '') === clean);
  };

  const saveFarmerBankDetails = (farmerId: string, bankDetails: BankDetails): boolean => {
    setFarmers((prev) => {
      const updatedList = prev.map((f) => (f.id === farmerId ? { ...f, bankDetails } : f));
      const target = updatedList.find((f) => f.id === farmerId);
      if (target) supabaseUpsertFarmer(target, activeFirmId).catch(console.error);
      return updatedList;
    });
    return true;
  };

  /**
   * Payment Operations for Farmer Account
   */
  const addFarmerPayment = (
    paymentData: Omit<FarmerPaymentRecord, 'id' | 'createdAt'>
  ): FarmerPaymentRecord => {
    const newRecord: FarmerPaymentRecord = {
      ...paymentData,
      id: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    setFarmerPayments((prev) => [newRecord, ...prev]);
    supabaseUpsertPayment(newRecord, activeFirmId, activeFiscalYear).catch(console.error);
    return newRecord;
  };

  const deleteFarmerPayment = (id: string): boolean => {
    const payment = farmerPayments.find((p) => p.id === id);
    if (payment) {
      const binItem: RecycleBinItem = {
        id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        originalId: payment.id,
        type: 'PAYMENT',
        titleEn: `Payment #${payment.id} (₹${payment.amount.toLocaleString('en-IN')})`,
        titlePa: `ਭੁਗਤਾਨ #${payment.id} (₹${payment.amount.toLocaleString('en-IN')})`,
        subtitle: `Date: ${payment.date} • Mode: ${payment.paymentMode} • Agency: ${payment.agency || '—'}`,
        deletedAt: new Date().toLocaleString('en-IN'),
        recordData: payment
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
      supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);
    }
    setFarmerPayments((prev) => prev.filter((p) => p.id !== id));
    supabaseDeletePayment(id).catch(console.error);
    return true;
  };

  /**
   * Advance Payment & Interest Operations for Farmer Account
   */
  const generateNextAdvanceId = (): string => {
    if (farmerAdvances.length === 0) {
      return 'ADV-00001';
    }
    const numbers = farmerAdvances
      .map((a) => {
        const numPart = a.id.replace('ADV-', '');
        return parseInt(numPart, 10);
      })
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) {
      return 'ADV-00001';
    }
    const max = Math.max(...numbers);
    const next = max + 1;
    return `ADV-${String(next).padStart(5, '0')}`;
  };

  const addFarmerAdvance = (
    advanceData: Omit<FarmerAdvanceRecord, 'id' | 'createdAt' | 'interestAmount' | 'totalDays' | 'monthsElapsed' | 'daysElapsed' | 'totalPayableWithInterest'> & { id?: string }
  ): FarmerAdvanceRecord => {
    const nextId = advanceData.id || generateNextAdvanceId();
    const todayStr = formatDateToDDMMYYYY(new Date());
    const startDate = (advanceData.date || (advanceData as any).startDate || todayStr).trim();
    const tillDate = (advanceData.interestTillDate || (advanceData as any).endDate || todayStr).trim();
    const amount = Number(advanceData.amount) || 0;
    const monthlyInterestRate = Number(advanceData.monthlyInterestRate) || 0;

    const interestCalc = calculateAdvanceInterest(
      amount,
      monthlyInterestRate,
      startDate,
      tillDate
    );

    const newRecord: FarmerAdvanceRecord = {
      ...advanceData,
      id: nextId,
      date: startDate,
      startDate: startDate,
      amount: amount,
      principal: amount,
      monthlyInterestRate: monthlyInterestRate,
      interestTillDate: tillDate,
      endDate: tillDate,
      interestAmount: interestCalc.interestAmount,
      totalDays: interestCalc.totalDays,
      monthsElapsed: interestCalc.monthsElapsed,
      daysElapsed: interestCalc.daysElapsed,
      totalPayableWithInterest: interestCalc.totalPayableWithInterest,
      totalPayable: interestCalc.totalPayableWithInterest,
      createdAt: new Date().toISOString()
    };

    setFarmerAdvances((prev) => [newRecord, ...prev]);
    supabaseUpsertAdvance(newRecord, activeFirmId, activeFiscalYear).catch(console.error);
    return newRecord;
  };

  const updateFarmerAdvance = (id: string, updates: Partial<FarmerAdvanceRecord>): boolean => {
    let updated = false;
    setFarmerAdvances((prev) => {
      const updatedList = prev.map((item) => {
        if (item.id === id) {
          updated = true;
          const merged = { ...item, ...updates };
          const todayStr = formatDateToDDMMYYYY(new Date());
          const startDate = (merged.date || (merged as any).startDate || todayStr).trim();
          const tillDate = (merged.interestTillDate || (merged as any).endDate || todayStr).trim();
          const amount = Number(merged.amount) || 0;
          const monthlyInterestRate = Number(merged.monthlyInterestRate) || 0;

          const interestCalc = calculateAdvanceInterest(
            amount,
            monthlyInterestRate,
            startDate,
            tillDate
          );
          return {
            ...merged,
            date: startDate,
            startDate: startDate,
            amount: amount,
            principal: amount,
            monthlyInterestRate: monthlyInterestRate,
            interestTillDate: tillDate,
            endDate: tillDate,
            interestAmount: interestCalc.interestAmount,
            totalDays: interestCalc.totalDays,
            monthsElapsed: interestCalc.monthsElapsed,
            daysElapsed: interestCalc.daysElapsed,
            totalPayableWithInterest: interestCalc.totalPayableWithInterest,
            totalPayable: interestCalc.totalPayableWithInterest,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      const target = updatedList.find((a) => a.id === id);
      if (target) supabaseUpsertAdvance(target, activeFirmId, activeFiscalYear).catch(console.error);
      return updatedList;
    });
    return updated;
  };

  const deleteFarmerAdvance = (id: string): boolean => {
    const adv = farmerAdvances.find((a) => a.id === id);
    if (adv) {
      const binItem: RecycleBinItem = {
        id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        originalId: adv.id,
        type: 'ADVANCE',
        titleEn: `Advance Payment #${adv.id} (₹${adv.amount.toLocaleString('en-IN')})`,
        titlePa: `ਪੇਸ਼ਗੀ ਭੁਗਤਾਨ #${adv.id} (₹${adv.amount.toLocaleString('en-IN')})`,
        subtitle: `Farmer: ${adv.farmerName} • Date: ${adv.date} • Rate: ${adv.monthlyInterestRate}%`,
        deletedAt: new Date().toLocaleString('en-IN'),
        recordData: adv
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
      supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);
    }
    setFarmerAdvances((prev) => prev.filter((a) => a.id !== id));
    supabaseDeleteAdvance(id).catch(console.error);
    return true;
  };

  /**
   * Boli Operations for Farmer Account
   */
  const addBoliRecord = (
    recordData: Omit<BoliRecord, 'id' | 'createdAt'>
  ): BoliRecord => {
    const newRecord: BoliRecord = {
      ...recordData,
      id: `BOLI-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    setBoliRecords((prev) => [newRecord, ...prev]);
    supabaseUpsertBoli(newRecord, activeFirmId, activeFiscalYear).catch(console.error);
    return newRecord;
  };

  const deleteBoliRecord = (id: string): boolean => {
    const boli = boliRecords.find((b) => b.id === id);
    if (boli) {
      const binItem: RecycleBinItem = {
        id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        originalId: boli.id,
        type: 'BOLI',
        titleEn: `Boli Record #${boli.id} - ${boli.farmerName}`,
        titlePa: `ਬੋਲੀ ਰਿਕਾਰਡ #${boli.id} - ${boli.farmerNamePa || boli.farmerName}`,
        subtitle: `Buyer: ${boli.buyerName} • Rate: ₹${boli.ratePerQtl} • Date: ${boli.date}`,
        deletedAt: new Date().toLocaleString('en-IN'),
        recordData: boli
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
      supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);
    }
    setBoliRecords((prev) => prev.filter((b) => b.id !== id));
    supabaseDeleteBoli(id).catch(console.error);
    return true;
  };

  const updateBoliRecord = (id: string, updates: Partial<BoliRecord>): boolean => {
    let updated = false;
    setBoliRecords((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          updated = true;
          const newRec = { ...b, ...updates };
          supabaseUpsertBoli(newRec, activeFirmId, activeFiscalYear).catch(console.error);
          return newRec;
        }
        return b;
      })
    );
    return updated;
  };

  /**
   * Labour Gang / Palledar Management
   */
  const addLabourMate = (mateData: Omit<LabourMate, 'id' | 'createdAt'>): LabourMate => {
    const newMate: LabourMate = {
      ...mateData,
      id: `MATE-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toLocaleDateString('en-GB')
    };
    setLabourMates((prev) => [newMate, ...prev]);
    return newMate;
  };

  const updateLabourMate = (id: string, updates: Partial<LabourMate>): boolean => {
    setLabourMates((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
    return true;
  };

  const deleteLabourMate = (id: string): boolean => {
    setLabourMates((prev) => prev.filter((m) => m.id !== id));
    return true;
  };

  const addLabourWorkEntry = (entryData: Omit<LabourWorkEntry, 'id' | 'createdAt'>): LabourWorkEntry => {
    const newEntry: LabourWorkEntry = {
      ...entryData,
      id: `LWRK-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString()
    };
    setLabourWorkEntries((prev) => [newEntry, ...prev]);
    return newEntry;
  };

  const deleteLabourWorkEntry = (id: string): boolean => {
    setLabourWorkEntries((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  const addLabourAdvancePayment = (paymentData: Omit<LabourAdvancePayment, 'id' | 'createdAt'>): LabourAdvancePayment => {
    const newPayment: LabourAdvancePayment = {
      ...paymentData,
      id: `LADV-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString()
    };
    setLabourAdvancePayments((prev) => [newPayment, ...prev]);
    return newPayment;
  };

  const deleteLabourAdvancePayment = (id: string): boolean => {
    setLabourAdvancePayments((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  /**
   * Get Complete A-to-Z Farmer Account Summary
   * Handles:
   * - Main Farmer with sub-farmers linked (deducting linked purchases automatically)
   * - Linked Farmer linked to a main farmer
   * - Independent Farmer
   * - Direct Mandi Arrivals, Labour Deductions, Agency Purchases
   * - Advances & Date-to-Date Interest Calculations
   * - Final Net Payable Balance
   */
  const getCompleteFarmerAccount = (farmerId: string): FarmerAccountSummary | null => {
    const farmer = getFarmerById(farmerId);
    if (!farmer) return null;

    // 1. Check Farmer Linking Hierarchy
    // A) Is this farmer a Main Farmer with linked sub-farmers?
    const linkedSubFarmers = farmers.filter((f) => f.linkedMainFarmerId === farmerId);
    const isMainFarmer = linkedSubFarmers.length > 0;

    // B) Is this farmer linked to another Main Farmer?
    const linkedToMainFarmerObj = farmer.linkedMainFarmerId
      ? farmers.find((f) => f.id === farmer.linkedMainFarmerId)
      : undefined;
    const isLinkedFarmer = !!linkedToMainFarmerObj;

    // 2. Mandi Arrival Entries (Bags Weighment for this farmer)
    const farmerArrivalEntries = bagsEntries.filter((b) => b.farmerId === farmerId);
    const mandiArrivalBags = farmerArrivalEntries.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
    const mandiArrivalWeightKg = farmerArrivalEntries.reduce((sum, b) => sum + (Number(b.grandTotalKg) || 0), 0);
    const arrivalBreakdown = formatKgToQulKg(mandiArrivalWeightKg);

    // 3. Direct Daily Purchase Entries for this farmer
    const farmerPurchaseEntries = dailyPurchaseRecords.filter((p) => p.farmerId === farmerId);
    const directPurchasedBags = farmerPurchaseEntries.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
    const directPurchasedWeightKg = farmerPurchaseEntries.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);
    const directPurchasedAmount = farmerPurchaseEntries.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    // 4. Linked Purchases (If Main Farmer: find all purchases made by sub-farmers)
    const linkedPurchasesList: LinkedPurchaseDetail[] = [];
    let linkedPurchasedBags = 0;
    let linkedPurchasedWeightKg = 0;
    let linkedPurchasedAmount = 0;

    if (isMainFarmer) {
      const subFarmerIds = linkedSubFarmers.map((s) => s.id);
      const subPurchases = dailyPurchaseRecords.filter((p) => subFarmerIds.includes(p.farmerId));
      subPurchases.forEach((p) => {
        const subFarmer = linkedSubFarmers.find((s) => s.id === p.farmerId);
        linkedPurchasesList.push({
          id: p.id,
          date: p.date,
          mainFarmerId: farmer.id,
          mainFarmerName: farmer.farmerName,
          linkedFarmerId: p.farmerId,
          linkedFarmerName: subFarmer?.farmerName || p.farmerName || '',
          linkedFarmerNamePa: subFarmer?.farmerNamePa || p.farmerNamePa || '',
          agency: p.agency,
          bags: p.bags,
          qul: p.qul,
          kg: p.kg,
          rate: p.rate,
          totalAmount: p.totalAmount
        });
        linkedPurchasedBags += Number(p.bags) || 0;
        linkedPurchasedWeightKg += Number(p.totalWeightKg) || 0;
        linkedPurchasedAmount += Number(p.totalAmount) || 0;
      });
    }

    // Total Purchased (Direct + Linked for Main Farmer)
    const purchasedBags = directPurchasedBags + linkedPurchasedBags;
    const purchasedWeightKg = directPurchasedWeightKg + linkedPurchasedWeightKg;
    const purchasedAmount = directPurchasedAmount + linkedPurchasedAmount;
    const purchasedBreakdown = formatKgToQulKg(purchasedWeightKg);

    // 5. Remaining Calculations
    const remainingBags = Math.max(0, mandiArrivalBags - purchasedBags);
    const remainingWeightKg = Math.max(0, mandiArrivalWeightKg - purchasedWeightKg);
    const remainingBreakdown = formatKgToQulKg(remainingWeightKg);

    // 6. Agency-wise Breakdown (Includes both direct and linked purchases)
    const agencyMap = new Map<string, { bags: number; weightKg: number; amount: number; agencyPa?: string }>();
    const allRelevantPurchases = isMainFarmer
      ? [...farmerPurchaseEntries, ...dailyPurchaseRecords.filter((p) => linkedSubFarmers.some((s) => s.id === p.farmerId))]
      : farmerPurchaseEntries;

    allRelevantPurchases.forEach((p) => {
      const agKey = p.agency || 'Other';
      const existing = agencyMap.get(agKey) || {
        bags: 0,
        weightKg: 0,
        amount: 0,
        agencyPa: p.agencyPa
      };
      existing.bags += Number(p.bags) || 0;
      existing.weightKg += Number(p.totalWeightKg) || 0;
      existing.amount += Number(p.totalAmount) || 0;
      if (p.agencyPa) existing.agencyPa = p.agencyPa;
      agencyMap.set(agKey, existing);
    });

    const agencyWisePurchases = Array.from(agencyMap.entries()).map(([agency, val]) => ({
      agency,
      agencyPa: val.agencyPa,
      bags: val.bags,
      weightKg: val.weightKg,
      amount: val.amount
    }));

    // 7. Bardana Usage
    let newBardanaUsed = 0;
    let oldBardanaUsed = 0;
    farmerArrivalEntries.forEach((b) => {
      if (b.newBags !== undefined || b.oldBags !== undefined) {
        newBardanaUsed += Number(b.newBags) || 0;
        oldBardanaUsed += Number(b.oldBags) || 0;
      } else if (b.bardana === 'NEW') {
        newBardanaUsed += Number(b.bags) || 0;
      } else if (b.bardana === 'OLD') {
        oldBardanaUsed += Number(b.bags) || 0;
      } else if (b.bardana === 'BOTH') {
        newBardanaUsed += Math.floor((Number(b.bags) || 0) / 2);
        oldBardanaUsed += Math.ceil((Number(b.bags) || 0) / 2);
      }
    });
    const totalBardanaUsed = newBardanaUsed + oldBardanaUsed;

    // 8. Boli Records
    const customBoli = boliRecords.filter((b) => b.farmerId === farmerId);
    const combinedBoli: (BoliRecord | DailyPurchaseRecord)[] = [...customBoli, ...farmerPurchaseEntries];

    // 9. Labour Deductions Calculation (From Bags Weighment)
    let totalPakkiLabour = 0;
    let totalPakkaDoubleLabour = 0;
    let totalSukhiLabour = 0;
    let totalOtherDeductions = 0;

    farmerArrivalEntries.forEach((entry) => {
      if (entry.labourDeductions) {
        if (entry.labourDeductions.pakkiLabourEnabled) {
          totalPakkiLabour += Number(entry.labourDeductions.pakkiLabourAmount) || 0;
        }
        if (entry.labourDeductions.pakkaDoubleLabourEnabled) {
          totalPakkaDoubleLabour += Number(entry.labourDeductions.pakkaDoubleLabourAmount) || 0;
        }
        if (entry.labourDeductions.sukhiLabourEnabled) {
          totalSukhiLabour += Number(entry.labourDeductions.sukhiLabourAmount) || 0;
        }
        if (entry.labourDeductions.totalOtherDeduction) {
          totalOtherDeductions += Number(entry.labourDeductions.totalOtherDeduction) || 0;
        }
      }
    });

    const totalLabourDeductions = Math.round((totalPakkiLabour + totalPakkaDoubleLabour + totalSukhiLabour) * 100) / 100;
    const totalDeductions = Math.round((totalLabourDeductions + totalOtherDeductions) * 100) / 100;

    // 10. Gross Amount
    const totalArrivalGrossAmount = farmerArrivalEntries.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
    const totalGrossAmount = totalArrivalGrossAmount > 0 ? totalArrivalGrossAmount : purchasedAmount;

    // 11. Payments and Agency Purchase Settlements
    const farmerPaymentEntries = farmerPayments.filter((p) => p.farmerId === farmerId);
    const paidAmount = farmerPaymentEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalAgencyPurchasePayment = paidAmount;

    // 12. Net Payable before Advances
    const netPayableAmount = Math.max(0, Math.round((totalGrossAmount - totalLabourDeductions - totalAgencyPurchasePayment) * 100) / 100);

    // 13. Advances & Dynamic Date-to-Date Interest
    const todayStr = formatDateToDDMMYYYY(new Date());
    const rawAdvances = farmerAdvances.filter((a) => a.farmerId === farmerId);
    const recalculatedAdvances: FarmerAdvanceRecord[] = rawAdvances.map((adv) => {
      const startDate = adv.date || adv.startDate || todayStr;
      const tillDate = adv.interestTillDate || adv.endDate || todayStr;
      const amount = Number(adv.amount) || 0;
      const monthlyInterestRate = Number(adv.monthlyInterestRate) || 0;
      const calc = calculateAdvanceInterest(amount, monthlyInterestRate, startDate, tillDate);
      return {
        ...adv,
        date: startDate,
        startDate,
        amount,
        principal: amount,
        monthlyInterestRate,
        interestTillDate: tillDate,
        endDate: tillDate,
        interestAmount: calc.interestAmount,
        totalDays: calc.totalDays,
        monthsElapsed: calc.monthsElapsed,
        daysElapsed: calc.daysElapsed,
        totalPayableWithInterest: calc.totalPayableWithInterest,
        totalPayable: calc.totalPayableWithInterest
      };
    });

    const totalAdvancePrincipal = Math.round(recalculatedAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) * 100) / 100;
    const totalAdvanceInterest = Math.round(recalculatedAdvances.reduce((sum, a) => sum + (Number(a.interestAmount) || 0), 0) * 100) / 100;
    const totalAdvanceAmount = Math.round((totalAdvancePrincipal + totalAdvanceInterest) * 100) / 100;

    // 14. Final Balance (Net Payable - Total Advance with Interest)
    const finalBalance = Math.round((netPayableAmount - totalAdvanceAmount) * 100) / 100;
    const pendingAmount = Math.max(0, finalBalance);

    // 15. Unified Chronological Transactions
    const transactions: FarmerAccountSummary['transactions'] = [];

    // Mandi Arrival Transactions
    farmerArrivalEntries.forEach((b) => {
      const w = formatKgToQulKg(b.grandTotalKg);
      transactions.push({
        id: b.id,
        date: b.date,
        type: 'MANDI_ARRIVAL',
        typeLabelEn: 'Mandi Arrival',
        typeLabelPa: 'ਮੰਡੀ ਆਮਦ ਤੁਲਾਈ',
        agency: b.agency || '—',
        reference: b.entryNumber,
        bags: b.bags,
        qul: w.qtl,
        kg: w.kg,
        rate: b.ratePerQtl || 2461,
        totalAmount: b.totalAmount,
        grossAmount: b.totalAmount,
        labourDeductions: b.labourDeductions,
        netAmount: b.netAmount ?? b.totalAmount,
        status: 'RECEIVED',
        details:
          b.newBags !== undefined && b.oldBags !== undefined && b.newBags > 0 && b.oldBags > 0
            ? `${b.bags} ਬੋਰੀਆਂ (${b.newBags} ਨਵਾਂ + ${b.oldBags} ਪੁਰਾਣਾ)`
            : `${b.bags} ਬੋਰੀਆਂ (${(b.newBags || 0) > 0 || b.bardana === 'NEW' ? 'ਨਵਾਂ' : 'ਪੁਰਾਣਾ'} ਬਾਰਦਾਨਾ)`,
        rawRecord: b
      });
    });

    // Daily Purchase Transactions (Direct)
    farmerPurchaseEntries.forEach((p) => {
      transactions.push({
        id: p.id,
        date: p.date,
        type: 'DAILY_PURCHASE',
        typeLabelEn: 'Daily Purchase',
        typeLabelPa: 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ',
        agency: p.agency,
        reference: p.id,
        bags: p.bags,
        qul: p.qul,
        kg: p.kg,
        rate: p.rate,
        totalAmount: p.totalAmount,
        grossAmount: p.totalAmount,
        labourDeductions: p.labourDeductions,
        netAmount: p.netAmount ?? (p.labourDeductions ? p.labourDeductions.netPayableAmount : p.totalAmount),
        status: p.status || 'COMPLETED',
        details: p.boliNumber ? `Boli: ${p.boliNumber}` : p.gatePassNumber ? `GP: ${p.gatePassNumber}` : undefined,
        rawRecord: p
      });
    });

    // Linked Purchase Deductions (If Main Farmer)
    if (isMainFarmer) {
      linkedPurchasesList.forEach((lp) => {
        transactions.push({
          id: `LP-${lp.id}`,
          date: lp.date,
          type: 'LINKED_PURCHASE',
          typeLabelEn: `Linked: ${lp.linkedFarmerName}`,
          typeLabelPa: `ਲਿੰਕਡ ਖਰੀਦ: ${lp.linkedFarmerNamePa || lp.linkedFarmerName}`,
          agency: lp.agency,
          reference: lp.id,
          bags: lp.bags,
          qul: lp.qul,
          kg: lp.kg,
          rate: lp.rate,
          totalAmount: lp.totalAmount,
          grossAmount: lp.totalAmount,
          netAmount: lp.totalAmount,
          status: 'COMPLETED',
          details: `ਖਰੀਦ ਲਿੰਕਡ ਕਿਸਾਨ (${lp.linkedFarmerNamePa || lp.linkedFarmerName}) ਦੇ ਨਾਮ ਤੇ ਹੋਈ`,
          rawRecord: lp
        });
      });
    }

    // Custom Boli Transactions
    customBoli.forEach((b) => {
      transactions.push({
        id: b.id,
        date: b.date,
        type: 'BOLI',
        typeLabelEn: 'Boli / Auction',
        typeLabelPa: 'ਬੋਲੀ / ਨਿਲਾਮੀ',
        agency: b.agency,
        reference: b.boliNumber || b.id,
        bags: b.bags,
        qul: b.qul,
        kg: b.kg,
        rate: b.rate,
        totalAmount: b.totalAmount,
        grossAmount: b.totalAmount,
        labourDeductions: b.labourDeductions,
        netAmount: b.netAmount ?? b.totalAmount,
        status: b.status || 'CONFIRMED',
        details: `ਫ਼ਸਲ: ${b.crop}`,
        rawRecord: b
      });
    });

    // Payment Transactions
    farmerPaymentEntries.forEach((pay) => {
      transactions.push({
        id: pay.id,
        date: pay.date,
        type: 'PAYMENT',
        typeLabelEn: 'Agency / Direct Payment',
        typeLabelPa: 'ਏਜੰਸੀ / ਸਿੱਧਾ ਭੁਗਤਾਨ',
        agency: pay.agency || '—',
        reference: pay.referenceNumber || pay.id,
        totalAmount: pay.amount,
        grossAmount: pay.amount,
        netAmount: pay.amount,
        status: pay.status || 'PAID',
        details: `${pay.paymentMode} ${pay.remarks ? `• ${pay.remarks}` : ''}`,
        rawRecord: pay
      });
    });

    // Advance Transactions
    recalculatedAdvances.forEach((adv) => {
      transactions.push({
        id: adv.id,
        date: adv.date,
        type: 'ADVANCE',
        typeLabelEn: `Advance (₹${adv.amount.toLocaleString('en-IN')})`,
        typeLabelPa: `ਪੇਸ਼ਗੀ / ਐਡਵਾਂਸ (₹${adv.amount.toLocaleString('en-IN')})`,
        agency: '—',
        reference: adv.id,
        totalAmount: adv.totalPayableWithInterest,
        grossAmount: adv.amount,
        netAmount: adv.totalPayableWithInterest,
        status: 'PAID',
        details: `ਵਿਆਜ ਦਰ: ${adv.monthlyInterestRate}% ਮਹੀਨਾਵਾਰ • ਦਿਨ: ${adv.totalDays} • ਵਿਆਜ: ₹${adv.interestAmount.toLocaleString('en-IN')}${adv.remarks ? ` • ${adv.remarks}` : ''}`,
        rawRecord: adv
      });
    });

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => {
      const dateA = a.date.split('/').reverse().join('-');
      const dateB = b.date.split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    });

    return {
      farmer,
      isMainFarmer,
      linkedSubFarmers: linkedSubFarmers.map((s) => ({
        id: s.id,
        farmerName: s.farmerName,
        farmerNamePa: s.farmerNamePa,
        fatherName: s.fatherName,
        fatherNamePa: s.fatherNamePa,
        village: s.village,
        villagePa: s.villagePa,
        mobile: s.mobile
      })),
      linkedPurchasesList,
      isLinkedFarmer,
      linkedToMainFarmer: linkedToMainFarmerObj
        ? {
            id: linkedToMainFarmerObj.id,
            farmerName: linkedToMainFarmerObj.farmerName,
            farmerNamePa: linkedToMainFarmerObj.farmerNamePa,
            village: linkedToMainFarmerObj.village,
            villagePa: linkedToMainFarmerObj.villagePa
          }
        : undefined,
      mandiArrivalBags,
      mandiArrivalWeightKg,
      mandiArrivalQtl: arrivalBreakdown.qtl,
      mandiArrivalKg: arrivalBreakdown.kg,
      mandiArrivalDisplay: arrivalBreakdown.displayEn,
      mandiArrivalEntries: farmerArrivalEntries,
      boliRecords: combinedBoli,
      directPurchasedBags,
      directPurchasedWeightKg,
      directPurchasedAmount,
      linkedPurchasedBags,
      linkedPurchasedWeightKg,
      linkedPurchasedAmount,
      purchasedBags,
      purchasedWeightKg,
      purchasedQtl: purchasedBreakdown.qtl,
      purchasedKg: purchasedBreakdown.kg,
      purchasedWeightDisplay: purchasedBreakdown.displayEn,
      purchasedAmount,
      purchaseRecords: farmerPurchaseEntries,
      remainingBags,
      remainingWeightKg,
      remainingQtl: remainingBreakdown.qtl,
      remainingKg: remainingBreakdown.kg,
      remainingWeightDisplay: remainingBreakdown.displayEn,
      agencyWisePurchases,
      newBardanaUsed,
      oldBardanaUsed,
      totalBardanaUsed,
      totalGrossAmount,
      totalPakkiLabour,
      totalPakkaDoubleLabour,
      totalSukhiLabour,
      totalLabourDeductions,
      totalOtherDeductions,
      totalDeductions,
      totalAgencyPurchasePayment,
      netPayableAmount,
      advances: recalculatedAdvances,
      totalAdvancePrincipal,
      totalAdvanceInterest,
      totalAdvanceAmount,
      totalAdvanceRecoverable: totalAdvanceAmount,
      finalBalance,
      finalNetSettlementBalance: finalBalance,
      paidAmount,
      pendingAmount,
      paymentRecords: farmerPaymentEntries,
      transactions
    };
  };

  /**
   * Generates next sequential Parchi number
   */
  const getNextParchiNo = (): number => {
    if (bagsEntries.length === 0) return 1;
    const numbers = bagsEntries
      .map((e) => Number(e.parchiNo) || parseInt(e.entryNumber?.replace(/\D/g, '') || '0', 10))
      .filter((n) => !isNaN(n) && n > 0);
    return (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  };

  /**
   * Add a single Bags Entry with separated Parchi No and safe Supabase persistence
   */
  const addBagsEntry = (entryData: Omit<BagsEntryRecord, 'id' | 'entryNumber' | 'createdAt'>): BagsEntryRecord => {
    const nextParchi = entryData.parchiNo || getNextParchiNo();
    const nextEntryNumber = `BAG-${nextParchi.toString().padStart(5, '0')}`;
    const newRecord: BagsEntryRecord = {
      ...entryData,
      id: `be_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parchiNo: nextParchi,
      entryNumber: nextEntryNumber,
      createdAt: new Date().toISOString()
    };

    setBagsEntries((prev) => [newRecord, ...prev]);
    supabaseUpsertBagsEntry(newRecord, activeFirmId, activeFiscalYear).catch(console.error);
    return newRecord;
  };

  const addMultipleBagsEntries = (
    entriesData: Omit<BagsEntryRecord, 'id' | 'entryNumber' | 'createdAt'>[]
  ): BagsEntryRecord[] => {
    let currentParchi = getNextParchiNo() - 1;
    const newRecords: BagsEntryRecord[] = entriesData.map((data, idx) => {
      currentParchi++;
      const rowParchi = data.parchiNo || currentParchi;
      return {
        ...data,
        id: `be_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        parchiNo: rowParchi,
        entryNumber: `BAG-${rowParchi.toString().padStart(5, '0')}`,
        createdAt: new Date().toISOString()
      };
    });

    setBagsEntries((prev) => [...newRecords, ...prev]);
    newRecords.forEach((r) => supabaseUpsertBagsEntry(r, activeFirmId, activeFiscalYear).catch(console.error));
    return newRecords;
  };

  const updateBagsEntry = (id: string, updates: Partial<BagsEntryRecord>): boolean => {
    let updated = false;
    setBagsEntries((prev) => {
      const updatedList = prev.map((item) => {
        if (item.id === id) {
          updated = true;
          return {
            ...item,
            ...updates
          };
        }
        return item;
      });
      const target = updatedList.find((b) => b.id === id);
      if (target) supabaseUpsertBagsEntry(target, activeFirmId, activeFiscalYear).catch(console.error);
      return updatedList;
    });
    return updated;
  };

  /**
   * Delete Bags Entry:
   * Moves to Recycle Bin, deletes from Supabase, and automatically re-sequences
   * Parchi numbers sequentially (1, 2, 3...) so there are no missing gaps!
   */
  const deleteBagsEntry = (id: string): boolean => {
    const entry = bagsEntries.find((b) => b.id === id);
    if (entry) {
      const binItem: RecycleBinItem = {
        id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        originalId: entry.id,
        type: 'BAGS_ENTRY',
        titleEn: `Mandi Arrival Entry #${entry.parchiNo || entry.entryNumber || entry.id}`,
        titlePa: `ਮੰਡੀ ਆਮਦ ਐਂਟਰੀ #${entry.parchiNo || entry.entryNumber || entry.id}`,
        subtitle: `Farmer: ${entry.farmerName} • Bags: ${entry.bags} • Date: ${entry.date}`,
        deletedAt: new Date().toLocaleString('en-IN'),
        recordData: entry
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
      supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);
    }

    setBagsEntries((prev) => {
      const remaining = prev.filter((e) => e.id !== id);
      // Re-sequence remaining entries oldest-to-newest so 1..N order is strictly sequential
      const chronological = [...remaining].reverse();
      const resequenced = chronological.map((rec, index) => {
        const sequentialParchi = index + 1;
        const sequentialEntryNum = `BAG-${sequentialParchi.toString().padStart(5, '0')}`;
        return {
          ...rec,
          parchiNo: sequentialParchi,
          entryNumber: sequentialEntryNum
        };
      });
      const finalResult = resequenced.reverse(); // restore newest-first order
      // Sync resequenced entries to Supabase safely
      finalResult.forEach((r) => supabaseUpsertBagsEntry(r, activeFirmId, activeFiscalYear).catch(console.error));
      return finalResult;
    });

    supabaseDeleteBagsEntry(id).catch(console.error);
    return true;
  };

  /**
   * Generates next sequential Bardana Receiving ID
   */
  const generateNextBardanaId = (): string => {
    if (bardanaRecords.length === 0) {
      return 'BRD-00001';
    }
    const numbers = bardanaRecords
      .map((r) => {
        const numPart = r.id.replace('BRD-', '');
        return parseInt(numPart, 10);
      })
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) {
      return 'BRD-00001';
    }
    const max = Math.max(...numbers);
    const next = max + 1;
    return `BRD-${String(next).padStart(5, '0')}`;
  };

  /**
   * Add Bardana Record
   * Box Capacity rules:
   * NEW BAG: 1 Box = 500 Bags + Loose
   * OLD BAG: 1 Box = 50 Bags + Loose
   * Support: RECEIVE, PURCHASE, RETURN
   */
  const addBardanaRecord = (
    record: Omit<BardanaReceivedRecord, 'id' | 'createdAt'> & { id?: string }
  ): BardanaReceivedRecord => {
    const nextId = record.id || generateNextBardanaId();
    const newBoxes = Number(record.newBoxCount) || 0;
    const oldBoxes = Number(record.oldBoxCount) || 0;
    const newLoose = Number(record.newLooseBags) || 0;
    const oldLoose = Number(record.oldLooseBags) || 0;
    const loose = Number(record.looseBags) || 0;

    const newBags = record.newBags !== undefined
      ? Math.max(0, Number(record.newBags))
      : (newBoxes * 500) + newLoose;
    const oldBags = record.oldBags !== undefined
      ? Math.max(0, Number(record.oldBags))
      : (oldBoxes * 50) + oldLoose;
    const totalBags = record.bags !== undefined && Number(record.bags) > 0
      ? Number(record.bags)
      : newBags + oldBags + loose;

    const newRecord: BardanaReceivedRecord = {
      ...record,
      id: nextId,
      firmId: record.firmId || activeFirmId,
      fiscalYear: record.fiscalYear || activeFiscalYear,
      actionType: record.actionType || 'RECEIVE',
      sellerId: record.sellerId || undefined,
      newBoxCount: newBoxes,
      newLooseBags: newLoose,
      newBags,
      oldBoxCount: oldBoxes,
      oldLooseBags: oldLoose,
      oldBags,
      looseBags: loose,
      boxes: newBoxes + oldBoxes,
      capacityPerBox: record.bardanaType === 'NEW' ? 500 : 50,
      bags: totalBags,
      totalBags,
      createdAt: new Date().toISOString()
    };

    setBardanaRecords((prev) => [newRecord, ...prev]);
    supabaseUpsertBardana(newRecord, activeFirmId, activeFiscalYear).catch(console.error);
    return newRecord;
  };

  const updateBardanaRecord = (id: string, updates: Partial<BardanaReceivedRecord>): boolean => {
    let updated = false;
    setBardanaRecords((prev) => {
      const updatedList = prev.map((item) => {
        if (item.id === id) {
          updated = true;
          const newBoxes = updates.newBoxCount !== undefined ? Number(updates.newBoxCount) : (item.newBoxCount || 0);
          const oldBoxes = updates.oldBoxCount !== undefined ? Number(updates.oldBoxCount) : (item.oldBoxCount || 0);
          const newLoose = updates.newLooseBags !== undefined ? Number(updates.newLooseBags) : (item.newLooseBags || 0);
          const oldLoose = updates.oldLooseBags !== undefined ? Number(updates.oldLooseBags) : (item.oldLooseBags || 0);
          const loose = updates.looseBags !== undefined ? Number(updates.looseBags) : (item.looseBags || 0);

          const newBags = updates.newBags !== undefined
            ? Math.max(0, Number(updates.newBags))
            : (updates.newBoxCount !== undefined
                ? (newBoxes * 500) + newLoose
                : (item.newBags !== undefined ? item.newBags : (newBoxes * 500) + newLoose));
          const oldBags = updates.oldBags !== undefined
            ? Math.max(0, Number(updates.oldBags))
            : (updates.oldBoxCount !== undefined
                ? (oldBoxes * 50) + oldLoose
                : (item.oldBags !== undefined ? item.oldBags : (oldBoxes * 50) + oldLoose));
          const totalBags = updates.bags !== undefined
            ? Math.max(0, Number(updates.bags))
            : (newBags + oldBags + loose);

          return {
            ...item,
            ...updates,
            sellerId: updates.sellerId !== undefined ? updates.sellerId : item.sellerId,
            newBoxCount: newBoxes,
            newLooseBags: newLoose,
            newBags,
            oldBoxCount: oldBoxes,
            oldLooseBags: oldLoose,
            oldBags,
            looseBags: loose,
            boxes: newBoxes + oldBoxes,
            bags: totalBags,
            totalBags,
            updatedAt: new Date().toISOString()
          };
        }
        return item;
      });
      const target = updatedList.find((b) => b.id === id);
      if (target) supabaseUpsertBardana(target, activeFirmId, activeFiscalYear).catch(console.error);
      return updatedList;
    });
    return updated;
  };

  const deleteBardanaRecord = (id: string): boolean => {
    const bardana = bardanaRecords.find((r) => r.id === id);
    if (bardana) {
      const binItem: RecycleBinItem = {
        id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        originalId: bardana.id,
        type: 'BARDANA',
        titleEn: `Bardana Record #${bardana.id} (${bardana.actionType === 'RETURN' ? 'Return' : bardana.actionType === 'GIVE' ? 'Give/Issue' : 'Receive'})`,
        titlePa: `ਬਾਰਦਾਨਾ ਰਿਕਾਰਡ #${bardana.id} (${bardana.actionType === 'RETURN' ? 'ਵਾਪਸੀ' : bardana.actionType === 'GIVE' ? 'ਦਿੱਤਾ/ਜਾਰੀ' : 'ਪ੍ਰਾਪਤੀ'})`,
        subtitle: `Source: ${bardana.otherPartyName || bardana.sourceName || bardana.agency || '—'} • Total Bags: ${bardana.bags}`,
        deletedAt: new Date().toLocaleString('en-IN'),
        recordData: bardana
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
      supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);
    }
    setBardanaRecords((prev) => prev.filter((r) => r.id !== id));
    supabaseDeleteBardana(id).catch(console.error);
    return true;
  };

  /**
   * Calculate exact real-time Bardana Inventory Summary
   * Accounts for: Received, Purchased, Returned, Issued in Mandi / Lefting, and Other-Party transactions
   */
  const getBardanaSummary = (): BardanaInventorySummary => {
    let newBagsReceived = 0;
    let newBagsReturned = 0;
    let newBagsIssued = 0;
    let oldBagsReceived = 0;
    let oldBagsReturned = 0;
    let oldBagsIssued = 0;
    let looseBagsReceived = 0;
    let looseBagsReturned = 0;
    let looseBagsIssued = 0;

    // Track other-party borrowing and returns
    const otherPartyMap = new Map<string, OtherPartyBardanaBalance>();

    bardanaRecords.forEach((r) => {
      const isReturn = r.actionType === 'RETURN';
      const isGive = r.actionType === 'GIVE';
      let nBags = 0;
      let oBags = 0;
      let lBags = Number(r.looseBags) || 0;

      if (r.newBags !== undefined && r.oldBags !== undefined) {
        nBags = Number(r.newBags) || 0;
        oBags = Number(r.oldBags) || 0;
      } else if (r.bardanaType === 'NEW') {
        nBags = Number(r.bags) || 0;
      } else if (r.bardanaType === 'OLD') {
        oBags = Number(r.bags) || 0;
      } else if (r.bardanaType === 'BOTH') {
        nBags = ((Number(r.newBoxCount) || 0) * 500) + (Number(r.newLooseBags) || 0);
        oBags = ((Number(r.oldBoxCount) || 0) * 50) + (Number(r.oldLooseBags) || 0);
      }

      const totalRecordBags = nBags + oBags + lBags;

      if (isReturn) {
        newBagsReturned += nBags;
        oldBagsReturned += oBags;
        looseBagsReturned += lBags;
      } else if (isGive) {
        newBagsIssued += nBags;
        oldBagsIssued += oBags;
        looseBagsIssued += lBags;
      } else {
        newBagsReceived += nBags;
        oldBagsReceived += oBags;
        looseBagsReceived += lBags;
      }

      // Other Party Ledger
      if (r.receivedFrom === 'OTHER_PARTY' || r.otherPartyName) {
        const partyKey = (r.otherPartyName || r.sourceName || 'Other Party').trim();
        if (!otherPartyMap.has(partyKey)) {
          otherPartyMap.set(partyKey, {
            partyName: partyKey,
            partyMobile: r.otherPartyMobile,
            borrowedOrReceivedBags: 0,
            returnedBags: 0,
            givenOrLoanedBags: 0,
            recoveredBags: 0,
            netBalance: 0
          });
        }
        const pEntry = otherPartyMap.get(partyKey)!;
        if (r.otherPartyMobile && !pEntry.partyMobile) {
          pEntry.partyMobile = r.otherPartyMobile;
        }

        if (r.actionType === 'RETURN') {
          pEntry.returnedBags += totalRecordBags;
        } else if (r.actionType === 'GIVE') {
          pEntry.givenOrLoanedBags += totalRecordBags;
        } else {
          // RECEIVE / BORROW
          pEntry.borrowedOrReceivedBags += totalRecordBags;
        }
      }
    });

    // Outflow 1: Weighment/Arrival bags in Mandi
    bagsEntries.forEach((b) => {
      if (b.newBags !== undefined || b.oldBags !== undefined) {
        newBagsIssued += Number(b.newBags) || 0;
        oldBagsIssued += Number(b.oldBags) || 0;
      } else if (b.bardana === 'NEW') {
        newBagsIssued += Number(b.bags) || 0;
      } else if (b.bardana === 'OLD') {
        oldBagsIssued += Number(b.bags) || 0;
      } else if (b.bardana === 'BOTH') {
        newBagsIssued += Math.floor((Number(b.bags) || 0) / 2);
        oldBagsIssued += Math.ceil((Number(b.bags) || 0) / 2);
      }
    });

    // Agency-wise inventory aggregation
    const agencyMap = new Map<string, { newRec: number; newRet: number; oldRec: number; oldRet: number; newIss: number; oldIss: number }>();
    agencies.forEach((ag) => {
      agencyMap.set(ag.nameEn, { newRec: 0, newRet: 0, oldRec: 0, oldRet: 0, newIss: 0, oldIss: 0 });
    });

    bardanaRecords.forEach((r) => {
      const agKey = r.sourceName || r.agency || 'Other Agency';
      if (!agencyMap.has(agKey)) {
        agencyMap.set(agKey, { newRec: 0, newRet: 0, oldRec: 0, oldRet: 0, newIss: 0, oldIss: 0 });
      }
      const entry = agencyMap.get(agKey)!;
      const nBags = r.newBags ?? (r.bardanaType === 'NEW' ? r.bags : (r.newBoxCount || 0) * 500);
      const oBags = r.oldBags ?? (r.bardanaType === 'OLD' ? r.bags : (r.oldBoxCount || 0) * 50);

      if (r.actionType === 'RETURN') {
        entry.newRet += Number(nBags) || 0;
        entry.oldRet += Number(oBags) || 0;
      } else if (r.actionType === 'GIVE') {
        entry.newIss += Number(nBags) || 0;
        entry.oldIss += Number(oBags) || 0;
      } else {
        entry.newRec += Number(nBags) || 0;
        entry.oldRec += Number(oBags) || 0;
      }
    });

    bagsEntries.forEach((b) => {
      if (b.agency) {
        if (!agencyMap.has(b.agency)) {
          agencyMap.set(b.agency, { newRec: 0, newRet: 0, oldRec: 0, oldRet: 0, newIss: 0, oldIss: 0 });
        }
        const entry = agencyMap.get(b.agency)!;
        if (b.newBags !== undefined || b.oldBags !== undefined) {
          entry.newIss += Number(b.newBags) || 0;
          entry.oldIss += Number(b.oldBags) || 0;
        } else if (b.bardana === 'NEW') {
          entry.newIss += Number(b.bags) || 0;
        } else if (b.bardana === 'OLD') {
          entry.oldIss += Number(b.bags) || 0;
        } else if (b.bardana === 'BOTH') {
          entry.newIss += Math.floor((Number(b.bags) || 0) / 2);
          entry.oldIss += Math.ceil((Number(b.bags) || 0) / 2);
        }
      }
    });

    const agencyStock = Array.from(agencyMap.entries()).map(([agency, val]) => ({
      agency,
      newReceived: val.newRec,
      newReturned: val.newRet,
      newIssued: val.newIss,
      newRemaining: Math.max(0, val.newRec - val.newRet - val.newIss),
      oldReceived: val.oldRec,
      oldReturned: val.oldRet,
      oldIssued: val.oldIss,
      oldRemaining: Math.max(0, val.oldRec - val.oldRet - val.oldIss),
      totalRemaining: Math.max(0, (val.newRec + val.oldRec) - (val.newRet + val.oldRet) - (val.newIss + val.oldIss))
    }));

    const otherPartyBalances: OtherPartyBardanaBalance[] = Array.from(otherPartyMap.values()).map((p) => ({
      ...p,
      // net balance: positive = we owe them bags, negative = they owe us bags
      netBalance: (p.borrowedOrReceivedBags - p.returnedBags) - (p.givenOrLoanedBags - p.recoveredBags)
    }));

    const newBagsRemaining = Math.max(0, newBagsReceived - newBagsReturned - newBagsIssued);
    const oldBagsRemaining = Math.max(0, oldBagsReceived - oldBagsReturned - oldBagsIssued);
    const looseBagsRemaining = Math.max(0, looseBagsReceived - looseBagsReturned - looseBagsIssued);
    const totalReceived = newBagsReceived + oldBagsReceived + looseBagsReceived;
    const totalReturned = newBagsReturned + oldBagsReturned + looseBagsReturned;
    const totalIssued = newBagsIssued + oldBagsIssued + looseBagsIssued;
    const totalRemaining = Math.max(0, totalReceived - totalReturned - totalIssued);

    return {
      newBagsReceived,
      newBagsReturned,
      newBagsIssued,
      newBagsRemaining,
      oldBagsReceived,
      oldBagsReturned,
      oldBagsIssued,
      oldBagsRemaining,
      looseBagsReceived,
      looseBagsReturned,
      looseBagsIssued,
      looseBagsRemaining,
      totalReceived,
      totalReturned,
      totalIssued,
      totalRemaining,
      agencyStock,
      otherPartyBalances
    };
  };

  /**
   * Generates next sequential Daily Purchase ID
   * Example: PUR-00001, PUR-00002
   */
  const generateNextPurchaseId = (): string => {
    if (dailyPurchaseRecords.length === 0) {
      return 'PUR-00001';
    }
    const numbers = dailyPurchaseRecords
      .map((r) => {
        const numPart = r.id.replace('PUR-', '');
        return parseInt(numPart, 10);
      })
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) {
      return 'PUR-00001';
    }
    const max = Math.max(...numbers);
    const next = max + 1;
    return `PUR-${String(next).padStart(5, '0')}`;
  };

  /**
   * Calculate live purchase summary for a single farmer
   * Handles:
   * 1. Main Farmer: Mandi bags are here; sub-farmer purchases deduct from this pool
   * 2. Linked Sub-Farmer: Uses Main Farmer's Mandi bag pool and remaining quota
   * 3. Independent Farmer: Direct arrival and purchase tracking
   */
  const getFarmerPurchaseSummary = (farmerId: string): FarmerPurchaseSummary => {
    const farmer = farmers.find((f) => f.id === farmerId);
    const linkedSubFarmers = farmers.filter((f) => f.linkedMainFarmerId === farmerId);
    const isMainFarmer = linkedSubFarmers.length > 0;
    const linkedToMainFarmer = farmer?.linkedMainFarmerId
      ? farmers.find((f) => f.id === farmer.linkedMainFarmerId)
      : undefined;
    const isLinkedFarmer = !!linkedToMainFarmer;

    if (isLinkedFarmer && linkedToMainFarmer) {
      // Sub-Farmer draws from Main Farmer's Mandi bag pool
      const mainArrivalEntries = bagsEntries.filter((b) => b.farmerId === linkedToMainFarmer.id);
      const mandiArrivalBags = mainArrivalEntries.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
      const mandiArrivalWeightKg = mainArrivalEntries.reduce((sum, b) => sum + (Number(b.grandTotalKg) || 0), 0);
      const arrivalBreakdown = formatKgToQulKg(mandiArrivalWeightKg);

      const subFarmersOfMain = farmers.filter((f) => f.linkedMainFarmerId === linkedToMainFarmer.id);
      const allPoolFarmerIds = [linkedToMainFarmer.id, ...subFarmersOfMain.map((s) => s.id)];
      const allPoolPurchases = dailyPurchaseRecords.filter((p) => allPoolFarmerIds.includes(p.farmerId));

      const alreadyPurchasedBags = allPoolPurchases.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
      const alreadyPurchasedWeightKg = allPoolPurchases.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);
      const purchasedBreakdown = formatKgToQulKg(alreadyPurchasedWeightKg);

      const remainingBags = Math.max(0, mandiArrivalBags - alreadyPurchasedBags);
      const remainingWeightKg = Math.max(0, mandiArrivalWeightKg - alreadyPurchasedWeightKg);
      const remainingBreakdown = formatKgToQulKg(remainingWeightKg);

      // Agency purchases across the entire linked pool
      const agencyMap = new Map<string, { bags: number; weightKg: number; amount: number }>();
      allPoolPurchases.forEach((p) => {
        const ag = p.agency || 'Other';
        const existing = agencyMap.get(ag) || { bags: 0, weightKg: 0, amount: 0 };
        existing.bags += p.bags;
        existing.weightKg += p.totalWeightKg;
        existing.amount += p.totalAmount;
        agencyMap.set(ag, existing);
      });

      const agencyWisePurchases = Array.from(agencyMap.entries()).map(([agency, val]) => ({
        agency,
        bags: val.bags,
        weightKg: val.weightKg,
        amount: val.amount
      }));

      return {
        farmerId,
        farmerName: farmer?.farmerName || '',
        farmerNamePa: farmer?.farmerNamePa || '',
        fatherName: farmer?.fatherName || '',
        fatherNamePa: farmer?.fatherNamePa || '',
        village: farmer?.village || '',
        villagePa: farmer?.villagePa || '',
        mobile: farmer?.mobile || '',
        aadhaar: farmer?.aadhaar || '',
        isLinkedFarmer: true,
        linkedToMainFarmerId: linkedToMainFarmer.id,
        linkedToMainFarmerName: linkedToMainFarmer.farmerName,
        linkedToMainFarmerNamePa: linkedToMainFarmer.farmerNamePa,
        mandiArrivalBags,
        mandiArrivalWeightKg,
        mandiArrivalWeightDisplay: arrivalBreakdown.displayEn,
        alreadyPurchasedBags,
        alreadyPurchasedWeightKg,
        alreadyPurchasedWeightDisplay: purchasedBreakdown.displayEn,
        remainingBags,
        remainingWeightKg,
        remainingWeightDisplay: remainingBreakdown.displayEn,
        agencyWisePurchases
      };
    }

    // Main Farmer or Independent Farmer
    const farmerEntries = bagsEntries.filter((b) => b.farmerId === farmerId);
    const mandiArrivalBags = farmerEntries.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
    const mandiArrivalWeightKg = farmerEntries.reduce((sum, b) => sum + (Number(b.grandTotalKg) || 0), 0);
    const arrivalBreakdown = formatKgToQulKg(mandiArrivalWeightKg);

    const directPurchases = dailyPurchaseRecords.filter((p) => p.farmerId === farmerId);
    let linkedPurchases: DailyPurchaseRecord[] = [];
    let linkedPurchasedBags = 0;
    let linkedPurchasedWeightKg = 0;

    if (isMainFarmer) {
      const subFarmerIds = linkedSubFarmers.map((s) => s.id);
      linkedPurchases = dailyPurchaseRecords.filter((p) => subFarmerIds.includes(p.farmerId));
      linkedPurchasedBags = linkedPurchases.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
      linkedPurchasedWeightKg = linkedPurchases.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);
    }

    const allRelevantPurchases = [...directPurchases, ...linkedPurchases];
    const alreadyPurchasedBags = allRelevantPurchases.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
    const alreadyPurchasedWeightKg = allRelevantPurchases.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);
    const purchasedBreakdown = formatKgToQulKg(alreadyPurchasedWeightKg);

    const remainingBags = Math.max(0, mandiArrivalBags - alreadyPurchasedBags);
    const remainingWeightKg = Math.max(0, mandiArrivalWeightKg - alreadyPurchasedWeightKg);
    const remainingBreakdown = formatKgToQulKg(remainingWeightKg);

    // Group agency-wise purchases
    const agencyMap = new Map<string, { bags: number; weightKg: number; amount: number }>();
    allRelevantPurchases.forEach((p) => {
      const ag = p.agency || 'Other';
      const existing = agencyMap.get(ag) || { bags: 0, weightKg: 0, amount: 0 };
      existing.bags += p.bags;
      existing.weightKg += p.totalWeightKg;
      existing.amount += p.totalAmount;
      agencyMap.set(ag, existing);
    });

    const agencyWisePurchases = Array.from(agencyMap.entries()).map(([agency, val]) => ({
      agency,
      bags: val.bags,
      weightKg: val.weightKg,
      amount: val.amount
    }));

    return {
      farmerId,
      farmerName: farmer?.farmerName || '',
      farmerNamePa: farmer?.farmerNamePa || '',
      fatherName: farmer?.fatherName || '',
      fatherNamePa: farmer?.fatherNamePa || '',
      village: farmer?.village || '',
      villagePa: farmer?.villagePa || '',
      mobile: farmer?.mobile || '',
      aadhaar: farmer?.aadhaar || '',
      isMainFarmer,
      linkedSubFarmersCount: linkedSubFarmers.length,
      linkedPurchasedBags,
      linkedPurchasedWeightKg,
      mandiArrivalBags,
      mandiArrivalWeightKg,
      mandiArrivalWeightDisplay: arrivalBreakdown.displayEn,
      alreadyPurchasedBags,
      alreadyPurchasedWeightKg,
      alreadyPurchasedWeightDisplay: purchasedBreakdown.displayEn,
      remainingBags,
      remainingWeightKg,
      remainingWeightDisplay: remainingBreakdown.displayEn,
      agencyWisePurchases
    };
  };

  /**
   * Get purchase summary for all registered farmers
   */
  const getAllFarmersPurchaseSummaries = (): FarmerPurchaseSummary[] => {
    return farmers.map((f) => getFarmerPurchaseSummary(f.id));
  };

  /**
   * Add Daily Purchase with strict validation against remaining Mandi quantity
   */
  const addDailyPurchase = (
    purchaseData: Omit<DailyPurchaseRecord, 'id' | 'createdAt'> & { id?: string }
  ): { success: boolean; record?: DailyPurchaseRecord; messageEn?: string; messagePa?: string } => {
    const summary = getFarmerPurchaseSummary(purchaseData.farmerId);
    const farmer = farmers.find((f) => f.id === purchaseData.farmerId);

    if (summary.mandiArrivalBags === 0) {
      const msgEn = summary.isLinkedFarmer
        ? `Linked Main Farmer (${summary.linkedToMainFarmerName}) has 0 Mandi Arrival bags.`
        : 'This farmer has 0 Mandi Arrival bags. Please enter Bags/Weighment first.';
      const msgPa = summary.isLinkedFarmer
        ? `ਲਿੰਕਡ ਮੁੱਖ ਕਿਸਾਨ (${summary.linkedToMainFarmerNamePa || summary.linkedToMainFarmerName}) ਦੀ ਮੰਡੀ ਆਮਦ 0 ਬੋਰੀਆਂ ਹੈ।`
        : 'ਇਸ ਕਿਸਾਨ ਦੀ ਦਾਣਾ ਮੰਡੀ ਵਿੱਚ 0 ਬੋਰੀਆਂ ਦੀ ਤੁਲਾਈ ਦਰਜ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਬੋਰੀਆਂ ਤੁਲਾਈ ਦਰਜ ਕਰੋ।';

      return {
        success: false,
        messageEn: msgEn,
        messagePa: msgPa
      };
    }

    if (purchaseData.bags > summary.remainingBags) {
      return {
        success: false,
        messageEn: `Purchase quantity (${purchaseData.bags} bags) cannot be greater than remaining Mandi quantity (${summary.remainingBags} bags).`,
        messagePa: `ਖਰੀਦ ਦੀ ਮਾਤਰਾ (${purchaseData.bags} ਬੋਰੀਆਂ) ਕਿਸਾਨ ਦੀ ਬਾਕੀ ਮੰਡੀ ਮਾਤਰਾ (${summary.remainingBags} ਬੋਰੀਆਂ) ਤੋਂ ਵੱਧ ਨਹੀਂ ਹੋ ਸਕਦੀ।`
      };
    }

    const nextId = purchaseData.id || generateNextPurchaseId();
    const bagsCount = Number(purchaseData.bags) || 0;
    const rate = Number(purchaseData.rate) || FIXED_RATE_PER_QTL;
    const computedTotalWeightKg = (Number(purchaseData.qul) || 0) * 100 + (Number(purchaseData.kg) || 0);
    const finalWeightKg = computedTotalWeightKg > 0 ? computedTotalWeightKg : bagsCount * FIXED_BAG_WEIGHT_KG;
    const weightBreakdown = formatKgToQulKg(finalWeightKg);
    const computedAmount = purchaseData.totalAmount > 0
      ? purchaseData.totalAmount
      : calculatePayableAmount(finalWeightKg, rate);

    const netAmount = purchaseData.labourDeductions
      ? purchaseData.labourDeductions.netPayableAmount
      : (purchaseData.netAmount ?? computedAmount);

    const linkedMainFarmer = farmer?.linkedMainFarmerId
      ? farmers.find((f) => f.id === farmer.linkedMainFarmerId)
      : undefined;

    const newRecord: DailyPurchaseRecord = {
      ...purchaseData,
      id: nextId,
      mainFarmerId: linkedMainFarmer ? linkedMainFarmer.id : undefined,
      mainFarmerName: linkedMainFarmer ? linkedMainFarmer.farmerName : undefined,
      mainFarmerNamePa: linkedMainFarmer ? linkedMainFarmer.farmerNamePa : undefined,
      bags: bagsCount,
      qul: weightBreakdown.qtl,
      kg: weightBreakdown.kg,
      totalWeightKg: finalWeightKg,
      totalWeightDisplay: weightBreakdown.displayEn,
      rate,
      totalAmount: computedAmount,
      labourDeductions: purchaseData.labourDeductions,
      netAmount,
      createdAt: new Date().toISOString()
    };

    setDailyPurchaseRecords((prev) => [newRecord, ...prev]);
    supabaseUpsertDailyPurchase(newRecord, activeFirmId, activeFiscalYear).catch(console.error);

    return {
      success: true,
      record: newRecord,
      messageEn: 'New Daily Purchase Record Saved Successfully',
      messagePa: 'ਨਵਾਂ ਖਰੀਦ ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਿਆ'
    };
  };

  /**
   * Update Daily Purchase: removes old quantity first, then validates new quantity
   */
  const updateDailyPurchase = (
    id: string,
    updates: Partial<DailyPurchaseRecord>
  ): { success: boolean; record?: DailyPurchaseRecord; messageEn?: string; messagePa?: string } => {
    const existing = dailyPurchaseRecords.find((p) => p.id === id);
    if (!existing) {
      return {
        success: false,
        messageEn: 'Record not found',
        messagePa: 'ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ'
      };
    }

    const farmerId = updates.farmerId || existing.farmerId;
    const summary = getFarmerPurchaseSummary(farmerId);

    // If farmer is the same, effective remaining includes the existing record's bags
    const effectiveRemaining = farmerId === existing.farmerId
      ? summary.remainingBags + existing.bags
      : summary.remainingBags;

    const newBags = updates.bags !== undefined ? Number(updates.bags) : existing.bags;

    if (newBags > effectiveRemaining) {
      return {
        success: false,
        messageEn: `Updated quantity (${newBags} bags) exceeds remaining Mandi stock (${effectiveRemaining} bags).`,
        messagePa: `ਅੱਪਡੇਟ ਕੀਤੀ ਮਾਤਰਾ (${newBags} ਬੋਰੀਆਂ) ਬਾਕੀ ਮੰਡੀ ਸਟਾਕ (${effectiveRemaining} ਬੋਰੀਆਂ) ਤੋਂ ਵੱਧ ਹੈ।`
      };
    }

    let updatedRecord: DailyPurchaseRecord | undefined;

    setDailyPurchaseRecords((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const rate = updates.rate !== undefined ? Number(updates.rate) : item.rate;
          const qul = updates.qul !== undefined ? Number(updates.qul) : item.qul;
          const kg = updates.kg !== undefined ? Number(updates.kg) : item.kg;
          const rawWeightKg = qul * 100 + kg;
          const finalWeightKg = rawWeightKg > 0 ? rawWeightKg : newBags * FIXED_BAG_WEIGHT_KG;
          const weightBreakdown = formatKgToQulKg(finalWeightKg);
          const computedAmount = calculatePayableAmount(finalWeightKg, rate);
          const activeLabour = updates.labourDeductions !== undefined ? updates.labourDeductions : item.labourDeductions;
          const netAmount = activeLabour ? activeLabour.netPayableAmount : (updates.netAmount ?? computedAmount);

          updatedRecord = {
            ...item,
            ...updates,
            bags: newBags,
            qul: weightBreakdown.qtl,
            kg: weightBreakdown.kg,
            totalWeightKg: finalWeightKg,
            totalWeightDisplay: weightBreakdown.displayEn,
            rate,
            totalAmount: computedAmount,
            labourDeductions: activeLabour,
            netAmount,
            updatedAt: new Date().toISOString()
          };
          return updatedRecord;
        }
        return item;
      })
    );

    if (updatedRecord) {
      supabaseUpsertDailyPurchase(updatedRecord, activeFirmId, activeFiscalYear).catch(console.error);
    }

    return {
      success: true,
      record: updatedRecord,
      messageEn: 'Purchase Record Updated Successfully',
      messagePa: 'ਖਰੀਦ ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਿਆ'
    };
  };

  /**
   * Delete Daily Purchase: automatically returns quantity to remaining
   */
  const deleteDailyPurchase = (id: string): boolean => {
    const purchase = dailyPurchaseRecords.find((p) => p.id === id);
    if (purchase) {
      const binItem: RecycleBinItem = {
        id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        originalId: purchase.id,
        type: 'DAILY_PURCHASE',
        titleEn: `Agency Purchase #${purchase.id} - ${purchase.agencyName || purchase.agency}`,
        titlePa: `ਏਜੰਸੀ ਖਰੀਦ #${purchase.id} - ${purchase.agencyNamePa || purchase.agencyName || purchase.agency}`,
        subtitle: `Farmer: ${purchase.farmerName} • Bags: ${purchase.bags} • Amount: ₹${purchase.totalAmount.toLocaleString('en-IN')}`,
        deletedAt: new Date().toLocaleString('en-IN'),
        recordData: purchase
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
      supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);
    }
    setDailyPurchaseRecords((prev) => prev.filter((p) => p.id !== id));
    supabaseDeleteDailyPurchase(id).catch(console.error);
    return true;
  };

  /**
   * Lefting (Dispatch / Sheller Lifting) Operations
   */
  const generateNextLeftingId = (): string => {
    if (leftingRecords.length === 0) {
      return 'LFT-00001';
    }
    const numbers = leftingRecords
      .map((r) => {
        const numPart = r.id.replace('LFT-', '');
        return parseInt(numPart, 10);
      })
      .filter((n) => !isNaN(n));

    if (numbers.length === 0) return 'LFT-00001';
    const max = Math.max(...numbers);
    return `LFT-${String(max + 1).padStart(5, '0')}`;
  };

  const addLeftingRecord = (
    recordData: Omit<LeftingRecord, 'id' | 'createdAt'> & { id?: string }
  ): { success: boolean; record?: LeftingRecord; messageEn?: string; messagePa?: string } => {
    // Validate that lefting bags do not exceed remaining agency purchased bags
    const totalPurchasedBags = dailyPurchaseRecords
      .filter((p) => !recordData.agency || p.agency === recordData.agency || p.agencyName === recordData.agency)
      .reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
    const alreadyLiftedBags = leftingRecords
      .filter((l) => !recordData.agency || l.agency === recordData.agency)
      .reduce((sum, l) => sum + (Number(l.bags) || 0), 0);
    const availableForLifting = Math.max(0, totalPurchasedBags - alreadyLiftedBags);

    const requirePurchaseCheck = settings.requireAgencyPurchaseBeforeLefting !== false;
    if (requirePurchaseCheck && totalPurchasedBags > 0 && recordData.bags > availableForLifting) {
      return {
        success: false,
        messageEn: `Lefting quantity (${recordData.bags} bags) cannot exceed remaining Agency Purchased bags (${availableForLifting}).`,
        messagePa: `ਲਿਫਟਿੰਗ ਬੋਰੀਆਂ (${recordData.bags}) ਬਾਕੀ ਏਜੰਸੀ ਖਰੀਦ ਬੋਰੀਆਂ (${availableForLifting}) ਤੋਂ ਵੱਧ ਨਹੀਂ ਹੋ ਸਕਦੀਆਂ।`
      };
    }

    const nextId = recordData.id || generateNextLeftingId();
    const netDeliveredBags = recordData.bags - (Number(recordData.rejectedBags) || 0);
    const netDeliveredKg = recordData.totalWeightKg - (Number(recordData.shortageKg) || 0);

    const newRecord: LeftingRecord = {
      ...recordData,
      id: nextId,
      firmId: recordData.firmId || activeFirmId,
      fiscalYear: recordData.fiscalYear || activeFiscalYear,
      netDeliveredBags,
      netDeliveredKg,
      createdAt: new Date().toISOString()
    };

    setLeftingRecords((prev) => [newRecord, ...prev]);
    supabaseUpsertLefting(newRecord, activeFirmId, activeFiscalYear).catch(console.error);

    // Auto-save truck to Truck Master if not already present
    if (recordData.truckNo && recordData.truckNo.trim()) {
      const cleanNo = recordData.truckNo.trim().toUpperCase();
      setTrucks((prev) => {
        const exists = prev.some(
          (t) => t.truckNo.replace(/[^A-Z0-9]/g, '') === cleanNo.replace(/[^A-Z0-9]/g, '')
        );
        if (!exists) {
          const autoTruck: TruckMasterRecord = {
            id: `TRK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            truckNo: cleanNo,
            driverName: recordData.driverName || '',
            driverPhone: recordData.driverPhone || '',
            driverMobile: recordData.driverPhone || undefined,
            truckUnion: recordData.truckUnion || undefined,
            createdAt: new Date().toISOString()
          };
          supabaseUpsertTruck(autoTruck).catch(console.error);
          return [autoTruck, ...prev];
        }
        return prev;
      });
    }

    return {
      success: true,
      record: newRecord,
      messageEn: 'Lefting dispatch record created successfully',
      messagePa: 'ਲਿਫਟਿੰਗ ਰਵਾਨਗੀ ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਿਆ'
    };
  };

  const updateLeftingRecord = (id: string, updates: Partial<LeftingRecord>): boolean => {
    let updated = false;
    setLeftingRecords((prev) => {
      const updatedList = prev.map((item) => {
        if (item.id === id) {
          updated = true;
          const merged = { ...item, ...updates };
          merged.netDeliveredBags = (Number(merged.bags) || 0) - (Number(merged.rejectedBags) || 0);
          merged.netDeliveredKg = (Number(merged.totalWeightKg) || 0) - (Number(merged.shortageKg) || 0);
          merged.updatedAt = new Date().toISOString();
          return merged;
        }
        return item;
      });
      const target = updatedList.find((l) => l.id === id);
      if (target) supabaseUpsertLefting(target, activeFirmId, activeFiscalYear).catch(console.error);
      return updatedList;
    });
    return updated;
  };

  const deleteLeftingRecord = (id: string): boolean => {
    const item = leftingRecords.find((l) => l.id === id);
    if (item) {
      const binItem: RecycleBinItem = {
        id: `BIN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        originalId: item.id,
        type: 'LEFTING',
        titleEn: `Lefting Dispatch #${item.id} - ${item.truckNo}`,
        titlePa: `ਲਿਫਟਿੰਗ ਰਵਾਨਗੀ #${item.id} - ${item.truckNo}`,
        subtitle: `Farmer: ${item.farmerName} • Bags: ${item.bags} • Mill: ${item.destination}`,
        deletedAt: new Date().toLocaleString('en-IN'),
        recordData: item
      };
      setRecycleBinItems((prev) => [binItem, ...prev]);
      supabaseUpsertRecycleItem(binItem, activeFirmId).catch(console.error);
    }
    setLeftingRecords((prev) => prev.filter((l) => l.id !== id));
    supabaseDeleteLefting(id).catch(console.error);
    return true;
  };

  /**
   * Truck Master Directory Operations
   */
  const addTruck = (truckData: Omit<TruckMasterRecord, 'id' | 'createdAt'>): TruckMasterRecord => {
    const cleanNo = truckData.truckNo.trim().toUpperCase();
    const existing = trucks.find(
      (t) => t.truckNo.replace(/[^A-Z0-9]/g, '') === cleanNo.replace(/[^A-Z0-9]/g, '')
    );
    if (existing) {
      const updated: TruckMasterRecord = {
        ...existing,
        ...truckData,
        truckNo: cleanNo,
        updatedAt: new Date().toISOString()
      };
      setTrucks((prev) => prev.map((t) => (t.id === existing.id ? updated : t)));
      supabaseUpsertTruck(updated).catch(console.error);
      return updated;
    }

    const newTruck: TruckMasterRecord = {
      ...truckData,
      id: `TRK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      truckNo: cleanNo,
      createdAt: new Date().toISOString()
    };
    setTrucks((prev) => [newTruck, ...prev]);
    supabaseUpsertTruck(newTruck).catch(console.error);
    return newTruck;
  };

  const addTrucksBulk = (
    trucksList: Array<Omit<TruckMasterRecord, 'id' | 'createdAt'>>
  ): { added: number; updated: number } => {
    let addedCount = 0;
    let updatedCount = 0;
    const modifiedTrucks: TruckMasterRecord[] = [];

    setTrucks((prev) => {
      const map = new Map<string, TruckMasterRecord>();
      prev.forEach((t) => map.set(t.truckNo.replace(/[^A-Z0-9]/g, ''), t));

      trucksList.forEach((item) => {
        const cleanKey = item.truckNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleanKey) return;

        if (map.has(cleanKey)) {
          const existing = map.get(cleanKey)!;
          const updatedT = {
            ...existing,
            ...item,
            truckNo: item.truckNo.trim().toUpperCase(),
            updatedAt: new Date().toISOString()
          };
          map.set(cleanKey, updatedT);
          modifiedTrucks.push(updatedT);
          updatedCount++;
        } else {
          const newT: TruckMasterRecord = {
            ...item,
            id: `TRK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            truckNo: item.truckNo.trim().toUpperCase(),
            createdAt: new Date().toISOString()
          };
          map.set(cleanKey, newT);
          modifiedTrucks.push(newT);
          addedCount++;
        }
      });

      return Array.from(map.values());
    });

    modifiedTrucks.forEach((t) => supabaseUpsertTruck(t).catch(console.error));
    return { added: addedCount, updated: updatedCount };
  };

  const updateTruck = (id: string, updates: Partial<TruckMasterRecord>): boolean => {
    let ok = false;
    setTrucks((prev) => {
      const updatedList = prev.map((t) => {
        if (t.id === id) {
          ok = true;
          return {
            ...t,
            ...updates,
            truckNo: updates.truckNo ? updates.truckNo.trim().toUpperCase() : t.truckNo,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      const target = updatedList.find((t) => t.id === id);
      if (target) supabaseUpsertTruck(target).catch(console.error);
      return updatedList;
    });
    return ok;
  };

  const deleteTruck = (id: string): boolean => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
    supabaseDeleteTruck(id).catch(console.error);
    return true;
  };

  const searchTrucksByLastDigits = (query: string): TruckMasterRecord[] => {
    if (!query || !query.trim()) return [];
    const cleanQ = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanQ) return [];

    return trucks.filter((t) => {
      const cleanTruck = t.truckNo.replace(/[^A-Z0-9]/g, '');
      return cleanTruck.endsWith(cleanQ) || cleanTruck.includes(cleanQ) || t.truckNo.includes(query.trim().toUpperCase());
    });
  };

  /**
   * Recycle Bin Operations
   */
  const restoreRecycleBinItem = (id: string, restoredBy?: string): boolean => {
    const item = recycleBinItems.find((i) => i.id === id);
    if (!item) return false;

    if (item.type === 'FARMER') {
      const restoredFarmer: Farmer = {
        ...item.recordData,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined
      };
      setFarmers((prev) => [restoredFarmer, ...prev.filter((f) => f.id !== restoredFarmer.id)]);
      supabaseUpsertFarmer(restoredFarmer, activeFirmId).catch(console.error);

      const operator = restoredBy || `Admin / Software Owner (${settings.firmNameEn || 'Jammu Trading Co'})`;
      addFarmerAuditLog({
        action: 'FARMER_RESTORED',
        farmerId: item.originalId,
        farmerName: restoredFarmer.farmerName,
        farmerNamePa: restoredFarmer.farmerNamePa,
        village: restoredFarmer.village,
        mobile: restoredFarmer.mobile,
        performedBy: operator,
        details: `Farmer restored back from Recycle Bin with original ID #${item.originalId}`
      });
    } else if (item.type === 'BAGS_ENTRY') {
      setBagsEntries((prev) => [item.recordData, ...prev.filter((b) => b.id !== item.recordData.id)]);
      supabaseUpsertBagsEntry(item.recordData, activeFirmId, activeFiscalYear).catch(console.error);
    } else if (item.type === 'DAILY_PURCHASE') {
      setDailyPurchaseRecords((prev) => [item.recordData, ...prev.filter((p) => p.id !== item.recordData.id)]);
      supabaseUpsertDailyPurchase(item.recordData, activeFirmId, activeFiscalYear).catch(console.error);
    } else if (item.type === 'BARDANA') {
      setBardanaRecords((prev) => [item.recordData, ...prev.filter((b) => b.id !== item.recordData.id)]);
      supabaseUpsertBardana(item.recordData, activeFirmId, activeFiscalYear).catch(console.error);
    } else if (item.type === 'ADVANCE') {
      setFarmerAdvances((prev) => [item.recordData, ...prev.filter((a) => a.id !== item.recordData.id)]);
      supabaseUpsertAdvance(item.recordData, activeFirmId, activeFiscalYear).catch(console.error);
    } else if (item.type === 'LEFTING') {
      setLeftingRecords((prev) => [item.recordData, ...prev.filter((l) => l.id !== item.recordData.id)]);
      supabaseUpsertLefting(item.recordData, activeFirmId, activeFiscalYear).catch(console.error);
    } else if (item.type === 'PAYMENT') {
      setFarmerPayments((prev) => [item.recordData, ...prev.filter((p) => p.id !== item.recordData.id)]);
      supabaseUpsertPayment(item.recordData, activeFirmId, activeFiscalYear).catch(console.error);
    } else if (item.type === 'BOLI') {
      setBoliRecords((prev) => [item.recordData, ...prev.filter((b) => b.id !== item.recordData.id)]);
      supabaseUpsertBoli(item.recordData, activeFirmId, activeFiscalYear).catch(console.error);
    }

    setRecycleBinItems((prev) => prev.filter((i) => i.id !== id));
    supabaseDeleteRecycleItem(id).catch(console.error);
    return true;
  };

  const permanentlyDeleteRecycleBinItem = (id: string, deletedBy?: string): boolean => {
    const item = recycleBinItems.find((i) => i.id === id);
    if (item && item.type === 'FARMER') {
      const operator = deletedBy || `Admin / Software Owner (${settings.firmNameEn || 'Jammu Trading Co'})`;
      addFarmerAuditLog({
        action: 'FARMER_PERMANENTLY_DELETED',
        farmerId: item.originalId,
        farmerName: item.recordData?.farmerName || item.titleEn,
        farmerNamePa: item.recordData?.farmerNamePa || item.titlePa,
        village: item.recordData?.village,
        mobile: item.recordData?.mobile,
        performedBy: operator,
        details: `Farmer permanently deleted from Recycle Bin. Historical transaction records remain safely archived.`
      });
    }
    setRecycleBinItems((prev) => prev.filter((i) => i.id !== id));
    supabaseDeleteRecycleItem(id).catch(console.error);
    return true;
  };

  const emptyRecycleBin = () => {
    setRecycleBinItems([]);
    supabaseClearRecycleBin().catch(console.error);
  };

  /**
   * Agency Operations
   */
  const addAgency = (agencyData: Omit<ProcurementAgency, 'id'>): ProcurementAgency => {
    const newAgency: ProcurementAgency = {
      ...agencyData,
      id: `AG-${(agencies.length + 1).toString().padStart(2, '0')}`
    };
    const updatedAgencies = [...agencies, newAgency];
    setAgencies(updatedAgencies);
    supabaseSaveAgencies(updatedAgencies).catch(console.error);
    return newAgency;
  };

  const updateAgency = (id: string, updates: Partial<ProcurementAgency>): boolean => {
    setAgencies((prev) => {
      const updatedList = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      supabaseSaveAgencies(updatedList).catch(console.error);
      return updatedList;
    });
    return true;
  };

  const deleteAgency = (id: string): boolean => {
    setAgencies((prev) => {
      const updatedList = prev.filter((a) => a.id !== id);
      supabaseSaveAgencies(updatedList).catch(console.error);
      return updatedList;
    });
    return true;
  };

  /**
   * Add village to existing PIN Code
   */
  const addVillageToPinCode = (pinCode: string, villageEn: string, villagePa: string) => {
    setPinCodes((prev) => {
      const updatedList = prev.map((item) => {
        if (item.pinCode === pinCode) {
          const exists = item.villages.some((v) => v.en.toLowerCase() === villageEn.trim().toLowerCase());
          if (!exists) {
            return {
              ...item,
              villages: [...item.villages, { en: villageEn.trim(), pa: villagePa.trim() || villageEn.trim() }]
            };
          }
        }
        return item;
      });
      supabaseSavePinCodes(updatedList).catch(console.error);
      return updatedList;
    });
  };

  /**
   * Add new PIN Code & District
   */
  const addNewPinCode = (
    pinCode: string,
    districtEn: string,
    districtPa: string,
    villageEn: string,
    villagePa: string
  ) => {
    setPinCodes((prev) => {
      const exists = prev.find((p) => p.pinCode === pinCode);
      let updatedList: PinCodeVillageMapping[];
      if (exists) {
        updatedList = prev.map((p) =>
          p.pinCode === pinCode
            ? {
                ...p,
                villages: [...p.villages, { en: villageEn.trim(), pa: villagePa.trim() || villageEn.trim() }]
              }
            : p
        );
      } else {
        updatedList = [
          ...prev,
          {
            pinCode,
            districtEn,
            districtPa,
            villages: [{ en: villageEn.trim(), pa: villagePa.trim() || villageEn.trim() }]
          }
        ];
      }
      supabaseSavePinCodes(updatedList).catch(console.error);
      return updatedList;
    });
  };

  /**
   * Firm Management Methods
   */
  const addFirm = (firmData: Omit<MandiFirm, 'id'>): MandiFirm => {
    const id = `FIRM-${String(firms.length + 1).padStart(3, '0')}`;
    const newFirm: MandiFirm = {
      ...firmData,
      id,
      createdAt: new Date().toLocaleDateString('en-IN')
    };
    setFirms((prev) => [...prev, newFirm]);
    supabaseUpsertFirm(newFirm).catch(console.error);
    return newFirm;
  };

  const updateFirm = (id: string, updates: Partial<MandiFirm>): boolean => {
    setFirms((prev) => {
      const updatedList = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      const target = updatedList.find((f) => f.id === id);
      if (target) supabaseUpsertFirm(target).catch(console.error);
      return updatedList;
    });
    return true;
  };

  const deleteFirm = (id: string): { success: boolean; message?: string } => {
    if (firms.length <= 1) {
      return { success: false, message: 'ਘੱਟੋ-ਘੱਟ ਇੱਕ ਫਰਮ ਰਹਿਣੀ ਲਾਜ਼ਮੀ ਹੈ / At least one firm is required' };
    }
    const target = firms.find((f) => f.id === id);
    if (target?.isDefault) {
      return { success: false, message: 'ਮੁੱਖ ਡਿਫਾਲਟ ਫਰਮ ਨਹੀਂ ਮਿਟਾਈ ਜਾ ਸਕਦੀ / Default firm cannot be deleted' };
    }
    const remaining = firms.filter((f) => f.id !== id);
    setFirms(remaining);
    supabaseDeleteFirm(id).catch(console.error);
    if (activeFirmId === id) {
      setActiveFirmId(remaining[0].id);
      supabaseSaveActiveFirmContext(remaining[0].id).catch(console.error);
    }
    return { success: true };
  };

  /**
   * Fiscal Year Management
   */
  const addFiscalYear = (year: string) => {
    const clean = year.trim();
    if (clean && !fiscalYears.includes(clean)) {
      const updatedYears = [...fiscalYears, clean];
      setFiscalYears(updatedYears);
      supabaseSaveFiscalYears(updatedYears).catch(console.error);
    }
  };

  /**
   * Seller Master Management Methods
   */
  const addSeller = (sellerData: Omit<SellerMaster, 'id'>): SellerMaster => {
    const id = `SLR-${String(sellers.length + 1).padStart(3, '0')}`;
    const newSeller: SellerMaster = {
      ...sellerData,
      id,
      createdAt: new Date().toLocaleDateString('en-IN')
    };
    setSellers((prev) => [newSeller, ...prev]);
    supabaseUpsertSeller(newSeller, activeFirmId).catch(console.error);
    return newSeller;
  };

  const updateSeller = (id: string, updates: Partial<SellerMaster>): boolean => {
    setSellers((prev) => {
      const updatedList = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      const target = updatedList.find((s) => s.id === id);
      if (target) supabaseUpsertSeller(target, activeFirmId).catch(console.error);
      return updatedList;
    });
    return true;
  };

  const deleteSeller = (id: string): boolean => {
    setSellers((prev) => prev.filter((s) => s.id !== id));
    supabaseDeleteSeller(id).catch(console.error);
    return true;
  };

  /**
   * Update Mandi Settings
   */
  const updateSettings = (newSettings: Partial<MandiSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      supabaseSaveSettings(merged).catch(console.error);
      return merged;
    });
  };

  /**
   * Reset All Database to clean empty slate
   */
  const resetAllData = () => {
    setFarmers([]);
    setBagsEntries([]);
    setBardanaRecords([]);
    setDailyPurchaseRecords([]);
    setFarmerPayments([]);
    setFarmerAdvances([]);
    setBoliRecords([]);
    setLeftingRecords([]);
    setRecycleBinItems([]);
    setSelectedFarmerForAccount(null);
    setSelectedFarmerForBags(null);
    setAgencies(DEFAULT_AGENCIES);
    setPinCodes(INITIAL_PIN_CODES);
    setFirms([DEFAULT_FIRM]);
    setActiveFirmId(DEFAULT_FIRM.id);
    setFiscalYears(DEFAULT_FISCAL_YEARS);
    setActiveFiscalYear(DEFAULT_ACTIVE_YEAR);
    setSellers(DEFAULT_SELLERS);
    setTrucks([]);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FARMERS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.BAGS_ENTRIES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.BARDANA);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.DAILY_PURCHASES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FARMER_PAYMENTS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ADVANCES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.BOLI_RECORDS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LEFTING);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AGENCIES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PIN_CODES);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FIRMS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_FIRM_ID);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FISCAL_YEARS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_FISCAL_YEAR);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.SELLERS);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TRUCKS);
  };

  return (
    <MandiContext.Provider
      value={{
        farmers,
        bagsEntries,
        bardanaRecords,
        dailyPurchaseRecords,
        farmerPayments,
        farmerAdvances,
        boliRecords,
        leftingRecords,
        recycleBinItems,
        agencies,
        pinCodes,
        settings,
        firms,
        activeFirmId,
        activeFirm,
        setActiveFirmId,
        addFirm,
        updateFirm,
        deleteFirm,
        fiscalYears,
        activeFiscalYear,
        setActiveFiscalYear,
        addFiscalYear,
        sellers,
        addSeller,
        updateSeller,
        deleteSeller,
        trucks,
        addTruck,
        addTrucksBulk,
        updateTruck,
        deleteTruck,
        searchTrucksByLastDigits,
        activeSection,
        setActiveSection,
        language,
        setLanguage,
        activeReceipt,
        setActiveReceipt,
        activeBagsEntryToEdit,
        setActiveBagsEntryToEdit,
        selectedFarmerForBags,
        setSelectedFarmerForBags,
        selectedFarmerForAccount,
        setSelectedFarmerForAccount,
        activePurchaseRecord,
        setActivePurchaseRecord,
        generateNextFarmerId,
        checkDuplicateFarmer,
        registerFarmer,
        updateFarmer,
        deleteFarmer,
        getFarmerById,
        getFarmerByAadhaar,
        saveFarmerBankDetails,
        getCompleteFarmerAccount,
        addFarmerPayment,
        deleteFarmerPayment,
        generateNextAdvanceId,
        addFarmerAdvance,
        updateFarmerAdvance,
        deleteFarmerAdvance,
        addBoliRecord,
        updateBoliRecord,
        deleteBoliRecord,
        labourMates,
        addLabourMate,
        updateLabourMate,
        deleteLabourMate,
        labourWorkEntries,
        addLabourWorkEntry,
        deleteLabourWorkEntry,
        labourAdvancePayments,
        addLabourAdvancePayment,
        deleteLabourAdvancePayment,
        getNextParchiNo,
        addBagsEntry,
        addMultipleBagsEntries,
        updateBagsEntry,
        deleteBagsEntry,
        generateNextBardanaId,
        addBardanaRecord,
        updateBardanaRecord,
        deleteBardanaRecord,
        getBardanaSummary,
        generateNextPurchaseId,
        addDailyPurchase,
        updateDailyPurchase,
        deleteDailyPurchase,
        getFarmerPurchaseSummary,
        getAllFarmersPurchaseSummaries,
        generateNextLeftingId,
        addLeftingRecord,
        updateLeftingRecord,
        deleteLeftingRecord,
        restoreRecycleBinItem,
        permanentlyDeleteRecycleBinItem,
        emptyRecycleBin,
        addAgency,
        updateAgency,
        deleteAgency,
        addVillageToPinCode,
        addNewPinCode,
        updateSettings,
        resetAllData,
        supabaseSyncStatus,
        supabaseSyncError,
        supabaseLastSyncedAt,
        isSupabaseConfigured: isSupabaseConfigured(),
        syncWithSupabase,
        migrateDataToSupabase,
        isSupabaseSyncModalOpen,
        setIsSupabaseSyncModalOpen
      }}
    >
      {children}
    </MandiContext.Provider>
  );
};

export const useMandi = (): MandiContextType => {
  const context = useContext(MandiContext);
  if (!context) {
    throw new Error('useMandi must be used within a MandiProvider');
  }
  return context;
};

