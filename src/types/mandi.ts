export interface BankDetails {
  accountHolderName: string;
  accountHolderNamePa?: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  branchAddress?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  micrCode?: string;
  passbookPhotoUrl?: string;
}

export interface Farmer {
  id: string; // e.g. "FRM000001"
  farmerName: string;
  farmerNamePa: string;
  fatherName: string;
  fatherNamePa: string;
  address?: string;
  addressPa?: string;
  village: string;
  villagePa: string;
  pinCode: string;
  mobile: string;
  aadhaar: string; // e.g. "1234 5678 9012"
  linkedMainFarmerId?: string; // Optional: Link with Main Farmer (e.g. "FRM000001")
  linkedMainFarmerName?: string; // Optional: Cached Main Farmer Name
  photoUrl?: string; // Farmer Photo
  aadhaarFrontUrl?: string; // Aadhaar Card FRONT
  aadhaarBackUrl?: string; // Aadhaar Card BACK
  aadhaarPhotoUrl?: string; // backward compatibility
  bankDetails?: BankDetails;

  // Land & Cultivation Profile (ਜ਼ਮੀਨ ਤੇ ਫਸਲ ਦਾ ਰਿਕਾਰਡ)
  ownedLandAcres?: number; // ਆਪਣੀ ਜ਼ਮੀਨ (ਏਕੜ/ਕਿੱਲੇ)
  leasedLandAcres?: number; // ਠੇਕੇ ਵਾਲੀ ਜ਼ਮੀਨ (ਕਿੱਲੇ)
  leaseRatePerAcre?: number; // ਠੇਕੇ ਦੀ ਰਕਮ ਪ੍ਰਤੀ ਏਕੜ (₹)
  expectedWheatBags?: number; // ਅੰਦਾਜ਼ਨ ਕਣਕ ਬੋਰੀਆਂ
  expectedPaddyBags?: number; // ਅੰਦਾਜ਼ਨ ਝੋਨਾ ਬੋਰੀਆਂ
  creditLimit?: number; // ਉਧਾਰ ਹੱਦ / ਸੁਰੱਖਿਅਤ ਲਿਮਿਟ (₹)
  openingBalance?: number; // ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ (+ ਦੇਣਯੋਗ, - ਬਕਾਇਆ)
  openingBalanceDate?: string; // ਓਪਨਿੰਗ ਬੈਲੇਂਸ ਮਿਤੀ
  openingBalanceSeason?: string; // ਸੀਜ਼ਨ ਜਿਵੇਂ "ਹਾੜ੍ਹੀ 2025"
  
  firmId?: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type AdvanceCategory = 
  | 'CASH'               // ਨਕਦ ਪੇਸ਼ਗੀ (Cash Advance for household/general)
  | 'FERTILIZER'         // ਖਾਦ / ਕੀਟਨਾਸ਼ਕ (Fertilizer)
  | 'SEED'               // ਬੀਜ (Seed)
  | 'FERTILIZER_SEEDS'   // ਖਾਦ / ਬੀਜ / ਕੀਟਨਾਸ਼ਕ (Fertilizer, Seed & Pesticide)
  | 'DIESEL'             // ਡੀਜ਼ਲ ਖਾਤਾ / ਪੰਪ ਪਰਚੀ (Diesel / Fuel Slip)
  | 'MACHINERY'          // ਟਰੈਕਟਰ / ਕੰਬਾਈਨ ਕਿਰਾਇਆ (Machinery / Combine Harvester)
  | 'PREVIOUS_SEASON'    // ਪਿਛਲੇ ਸੀਜ਼ਨ ਦਾ ਬਕਾਇਆ (Previous Season Balance)
  | 'PREVIOUS_BALANCE'   // ਪਿਛਲਾ ਬਕਾਇਆ (Previous Balance)
  | 'OTHER';             // ਹੋਰ ਖਰਚਾ (Other)

export type InterestCalculationMode = 'MONTHLY' | 'YEARLY' | 'INTEREST_FREE';
export type CompoundingFrequency = 'SIMPLE' | 'HALF_YEARLY' | 'HALF_YEARLY_COMPOUND' | 'YEARLY';

export interface AdvanceRepayment {
  id: string;
  date: string; // DD/MM/YYYY
  amount: number;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  referenceNumber?: string;
  referenceNo?: string;
  remarks?: string;
  createdAt: string;
}

export interface FarmerAdvanceRecord {
  id: string; // e.g. "ADV-00001"
  farmerId: string; // Farmer ID who took the advance
  farmerName?: string;
  farmerNamePa?: string;
  date: string; // Start Date e.g. "28/08/2026"
  startDate?: string; // Explicit Start Date
  amount: number; // Principal advance amount in ₹
  principal?: number; // Explicit Principal Amount
  monthlyInterestRate: number; // Interest % per Month (e.g. 2.0)
  annualInterestRate?: number; // Annual Interest % (e.g. 24.0)
  interestMode?: InterestCalculationMode; // 'MONTHLY' | 'YEARLY' | 'INTEREST_FREE'
  compounding?: CompoundingFrequency; // 'SIMPLE' | 'HALF_YEARLY' | 'HALF_YEARLY_COMPOUND' | 'YEARLY'
  isInterestFree?: boolean; // 0% interest flag
  interestTillDate?: string; // Interest calculated till date / End Date e.g. "04/09/2026"
  endDate?: string; // Explicit End Date
  interestAmount: number; // Calculated interest amount
  totalDays: number; // Total exact days elapsed
  monthsElapsed: number; // Full months elapsed
  daysElapsed: number; // Remaining days elapsed
  totalPayableWithInterest: number; // Principal + Interest Amount (minus repayments if any)
  totalPayable?: number;
  paymentMode?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
  referenceNumber?: string;
  status?: 'ACTIVE' | 'SETTLED' | 'CANCELLED';
  remarks?: string;
  category?: AdvanceCategory; // Purpose of advance
  itemDescription?: string; // Specific item details
  itemDetails?: string; // Specific item details (alias)
  cropSeason?: CropType | string; // Associated crop season (Wheat/Paddy/Maize)
  cropType?: CropType; // Associated crop
  season?: 'KHARIF' | 'RABI' | 'ZAID';
  guarantorFarmerId?: string; // Reference/Guarantor Farmer
  guarantorFarmerName?: string;
  guarantorFarmerNamePa?: string;
  guarantorName?: string; // Direct name
  guarantorPhone?: string;
  guarantorMobile?: string; // Direct mobile
  voucherPhotoUrl?: string; // Pronote / Signed voucher photo (base64/url)
  voucherFileName?: string;
  voucherPhotoName?: string;
  repayments?: AdvanceRepayment[]; // Partial installments repaid against advance
  totalRepaid?: number; // Sum of partial repayments
  netPrincipalRemaining?: number; // Principal - totalRepaid
  firmId?: string;
  fiscalYear?: string;
  createdAt: string;
  updatedAt?: string;
}

export type BardanaType = 'OLD' | 'NEW' | 'BOTH';
export type BardanaSourceType = 'SELLER' | 'AGENCY' | 'OTHER_PARTY';
export type BardanaAction = 'RECEIVE' | 'PURCHASE' | 'RETURN' | 'GIVE';

export type CropType = 'PADDY' | 'WHEAT' | 'MAIZE';
export type CropFilterType = CropType | 'ALL';

export interface CropConfig {
  id: CropType;
  nameEn: string;
  namePa: string;
  seasonEn: string;
  seasonPa: string;
  defaultBagWeightKg: number; // e.g. 37.5 for Paddy, 50.0 for Wheat, 50.0 for Maize
  defaultRatePerQtl: number; // e.g. 2320/2461 for Paddy, 2275/2425 for Wheat, 2090/2225 for Maize
  mspRate?: number; // alias for defaultRatePerQtl
  isWeighbridgeDirectSupported: boolean; // Direct trolley weighment for Maize
  baseMoisturePercent: number; // Standard Govt allowance e.g. 17% for Paddy, 12% for Wheat, 14% for Maize
  cutPerMoisturePercentKg: number; // Deduction kg per Qtl for each 1% above base
}

export const CROP_CONFIGS: Record<CropType, CropConfig> = {
  PADDY: {
    id: 'PADDY',
    nameEn: 'Paddy / Jhona (ਝੋਨਾ)',
    namePa: 'ਝੋਨਾ (Paddy / ਬਾਸਮਤੀ)',
    seasonEn: 'Kharif',
    seasonPa: 'ਸਾਉਣੀ',
    defaultBagWeightKg: 37.5,
    defaultRatePerQtl: 2461,
    mspRate: 2461,
    isWeighbridgeDirectSupported: false,
    baseMoisturePercent: 17.0,
    cutPerMoisturePercentKg: 1.0
  },
  WHEAT: {
    id: 'WHEAT',
    nameEn: 'Wheat / Kanak (ਕਣਕ)',
    namePa: 'ਕਣਕ (Wheat / ਹਾੜ੍ਹੀ)',
    seasonEn: 'Rabi',
    seasonPa: 'ਹਾੜ੍ਹੀ',
    defaultBagWeightKg: 50.0,
    defaultRatePerQtl: 2425,
    mspRate: 2425,
    isWeighbridgeDirectSupported: false,
    baseMoisturePercent: 12.0,
    cutPerMoisturePercentKg: 1.0
  },
  MAIZE: {
    id: 'MAIZE',
    nameEn: 'Maize / Makki (ਮੱਕੀ)',
    namePa: 'ਮੱਕੀ (Maize / ਛੱਲੀ)',
    seasonEn: 'Summer/Kharif',
    seasonPa: 'ਗਰਮੀ/ਸਾਉਣੀ',
    defaultBagWeightKg: 50.0,
    defaultRatePerQtl: 2225,
    mspRate: 2225,
    isWeighbridgeDirectSupported: true,
    baseMoisturePercent: 14.0,
    cutPerMoisturePercentKg: 1.5
  }
};

export interface MandiFirm {
  id: string; // e.g. "FIRM-001"
  name: string; // "Jammu Trading Co"
  namePa: string; // "ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ"
  address: string; // "Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629"
  addressPa?: string; // "ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ, ਤਹਿ. ਸ਼ਾਹਕੋਟ, ਜ਼ਿਲ੍ਹਾ ਜਲੰਧਰ, ਪੰਜਾਬ - 144629"
  marketCommittee: string; // "Lohian Khas"
  marketCommitteePa?: string; // "ਲੋਹੀਆਂ ਖਾਸ"
  mobile: string; // "98147-74651"
  licenceNo: string; // "JAL/LKH/133"
  gstin?: string;
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  email?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface SellerMaster {
  id: string; // e.g. "SLR-001"
  name: string; // e.g. "Kang Modern Rice Sheller"
  firmName?: string; // firm / business name
  namePa?: string;
  sellerType?: 'SHELLER_MILL' | 'COMMISSION_AGENT' | 'AGENCY_BUYER' | 'OTHER';
  code?: string;
  city?: string;
  address: string;
  addressPa?: string;
  mobile: string;
  phone?: string;
  contactPerson?: string;
  gstinOrLicence?: string;
  licenceNo?: string;
  gstin?: string;
  associatedAgencies?: string[]; // e.g. ['Pungrain', 'Markfed', 'Punsup']
  agencies?: string[];
  notes?: string;
  firmId?: string;
  createdAt?: string;
}

export interface ProcurementAgency {
  id: string;
  nameEn: string;
  namePa: string;
  code?: string;
  isDefault?: boolean;
}

export interface BardanaReceivedRecord {
  id: string; // e.g. "BRD-00001"
  date: string; // e.g. "28/08/2026"
  agency: string; // e.g. "Markfed"
  agencyPa?: string;
  actionType?: BardanaAction; // 'RECEIVE' | 'PURCHASE' | 'RETURN' | 'GIVE'
  receivedFrom: BardanaSourceType; // 'SELLER' | 'AGENCY' | 'OTHER_PARTY'
  sourceName: string; // Seller Name, Agency Name, or Other Party Name (e.g. "Khalsa Commission Agent")
  sourceNamePa?: string;
  sellerId?: string; // Seller ID or Farmer ID
  otherPartyName?: string; // Other party/arhtiya for borrow/loan
  partyMobile?: string;
  partyAddress?: string;
  cropType?: CropType; // 'PADDY' | 'WHEAT' | 'MAIZE'
  bardanaType: BardanaType; // 'NEW' | 'OLD' | 'BOTH'
  newBoxCount?: number; // 1 box = 500 bags
  newLooseBags?: number; // Loose new bags
  newBags?: number; // (newBoxCount * 500) + newLooseBags
  oldBoxCount?: number; // 1 box = 50 bags
  oldLooseBags?: number; // Loose old bags
  oldBags?: number; // (oldBoxCount * 50) + oldLooseBags
  looseBags?: number; // total loose bags
  boxes?: number; // total boxes
  capacityPerBox?: number;
  bags: number; // total bags (newBags + oldBags)
  totalBags?: number;
  parchiUrl?: string; // Uploaded parchi photo (Base64) or PDF
  parchiName?: string; // Attachment name e.g. "parchi.jpg"
  remarks?: string;
  firmId?: string;
  fiscalYear?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OtherPartyBardanaBalance {
  partyName: string;
  partyMobile?: string;
  borrowedOrReceivedBags: number; // Received from them
  returnedBags: number; // Returned to them
  givenOrLoanedBags: number; // Given to them
  recoveredBags: number; // Returned by them
  netBalance: number; // positive = we owe them, negative = they owe us
}

export interface BardanaInventorySummary {
  newBagsReceived: number;
  newBagsReturned: number;
  newBagsIssued: number;
  newBagsRemaining: number;
  oldBagsReceived: number;
  oldBagsReturned: number;
  oldBagsIssued: number;
  oldBagsRemaining: number;
  looseBagsReceived: number;
  looseBagsReturned: number;
  looseBagsIssued: number;
  looseBagsRemaining: number;
  totalReceived: number;
  totalReturned: number;
  totalIssued: number;
  totalRemaining: number;
  otherPartyBalances?: OtherPartyBardanaBalance[];
  agencyStock?: {
    agency: string;
    newReceived: number;
    newReturned: number;
    newIssued: number;
    newRemaining: number;
    oldReceived: number;
    oldReturned: number;
    oldIssued: number;
    oldRemaining: number;
    totalRemaining: number;
  }[];
}

export interface CustomDeductionLine {
  id: string;
  nameEn: string;
  namePa: string;
  type: 'PER_QTL' | 'FIXED';
  rate: number; // rate per Qtl or fixed ₹
  amount: number;
  enabled: boolean;
}

export interface BagConditionBreakdown {
  enabled?: boolean;
  totalBags?: number;
  doubleBags?: number;
  doubleRate?: number;
  doubleAmount?: number;
  sukkiBags?: number;
  sukkiRate?: number;
  sukkiAmount?: number;
  pakkiBags?: number;
  pakkiRate?: number;
  pakkiAmount?: number;
  balanceBags?: number;
  summaryText?: string;
}

export interface LabourAndDeductions {
  // 1. Pakki Labour / ਪੱਕੀ ਮਜ਼ਦੂਰੀ
  pakkiLabourEnabled: boolean;
  pakkiLabourRate: number; // default: 7 (₹ per Qul)
  pakkiLabourAmount: number; // (weightInKg / 100) * pakkiLabourRate
  pakkiBagsCount?: number;

  // 2. Pakka Double Labour / ਪੱਕੀ ਡਬਲ ਮਜ਼ਦੂਰੀ
  pakkaDoubleLabourEnabled: boolean;
  pakkaDoubleLabourRate: number; // default: 14 (₹ per Qul)
  pakkaDoubleLabourAmount: number; // (weightInKg / 100) * pakkaDoubleLabourRate
  doubleBagsCount?: number;

  // 3. Sukhi Labour / ਸੁੱਕੀ ਮਜ਼ਦੂਰੀ
  sukhiLabourEnabled: boolean;
  sukhiLabourRate: number; // default: 5 (₹ per Qul)
  sukhiLabourAmount: number; // (weightInKg / 100) * sukhiLabourRate
  sukkiBagsCount?: number;

  balanceBagsCount?: number;
  conditionBreakdown?: BagConditionBreakdown;

  // 4. Other Optional Deductions / Expenses
  otherDeductionsEnabled?: boolean;
  customDeductions?: CustomDeductionLine[];

  // Totals
  totalLabourDeduction: number; // pakki + pakkaDouble + sukhi
  totalOtherDeduction: number; // sum of enabled custom deductions
  grandTotalDeductions: number; // totalLabourDeduction + totalOtherDeduction
  grossAmount: number;
  netPayableAmount: number; // grossAmount - grandTotalDeductions
}

export interface BagsEntryRecord {
  id: string;
  entryNumber: string; // e.g. "BAG-00001"
  parchiNo?: number; // Sequential Parchi number e.g. 1, 2, 3...
  date: string; // e.g. "28/08/2026"
  farmerId: string; // e.g. "FRM000001"
  farmerName: string;
  farmerNamePa: string;
  farmerFatherName?: string;
  farmerFatherNamePa?: string;
  farmerVillage: string;
  farmerVillagePa: string;
  farmerMobile: string;
  farmerAadhaar: string;
  farmerPhotoUrl?: string;
  newBags?: number; // Count of New Bardana Bags (e.g. 500)
  oldBags?: number; // Count of Old Bardana Bags (e.g. 500)
  bags: number; // Total Bags = (newBags || 0) + (oldBags || 0)
  weightPerBagKg: number; // strictly 37.50
  totalBagsWeightKg: number; // bags * 37.50
  totalBagsWeightDisplay: string; // e.g. "37 Qul 50 Kg"
  totaKg: number; // separate Tota in Kg
  grandTotalKg: number; // totalBagsWeightKg + totaKg
  grandTotalDisplay: string; // e.g. "37 Qul 70 Kg"
  cropType?: CropType; // 'PADDY' | 'WHEAT' | 'MAIZE'
  moisturePercent?: number; // e.g. 19.5%
  moistureCutKg?: number; // Cut in KG based on moisture
  isDirectWeighbridge?: boolean; // For Maize/Trolley loose weighment
  trolleyGrossKg?: number; // For loose weighbridge
  trolleyTareKg?: number; // For loose weighbridge
  bardana: BardanaType; // 'NEW' | 'OLD' | 'BOTH'
  ratePerQtl: number; // fixed 2461 (₹2,461 / Qul)
  totalAmount: number; // (grandTotalKg / 100) * 2461
  labourDeductions?: LabourAndDeductions;
  conditionBreakdown?: BagConditionBreakdown;
  netAmount?: number;
  agency?: string; // Optional procurement agency assignment
  firmId?: string;
  fiscalYear?: string;
  createdAt: string;
}

export interface DailyPurchaseRecord {
  id: string; // e.g. "PUR-00001"
  date: string; // e.g. "28/08/2026"
  agency: string; // e.g. "Markfed"
  agencyPa?: string;
  farmerId: string; // e.g. "FRM000001"
  farmerName: string;
  farmerNamePa: string;
  farmerFatherName?: string;
  farmerFatherNamePa?: string;
  fatherName?: string;
  fatherNamePa?: string;
  farmerMobile?: string;
  mobile?: string;
  farmerVillage?: string;
  farmerVillagePa?: string;
  village?: string;
  villagePa?: string;
  farmerAadhaar?: string;
  aadhaar?: string;
  mainFarmerId?: string; // If this purchase is linked to a Main Farmer
  mainFarmerName?: string;
  mainFarmerNamePa?: string;
  newBags?: number; // Count of New Bardana Bags (ਨਵਾਂ ਬਾਰਦਾਨਾ)
  oldBags?: number; // Count of Old Bardana Bags (ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ)
  cropType?: CropType;
  moisturePercent?: number;
  bags: number;
  qul: number;
  kg: number;
  totalWeightKg: number; // (qul * 100) + kg
  totalWeightDisplay?: string; // e.g. "37 Qul 50 Kg"
  rate: number; // e.g. 2461
  totalAmount: number; // (totalWeightKg / 100) * rate (Gross Amount)
  labourDeductions?: LabourAndDeductions;
  netAmount?: number; // totalAmount - grandTotalDeductions
  boliRef?: string; // e.g. "BOLI-001" or receipt reference
  boliNumber?: string;
  gatePassNumber?: string;
  status?: 'COMPLETED' | 'PENDING' | 'VERIFIED';
  remarks?: string;
  firmId?: string;
  fiscalYear?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LinkedPurchaseDetail {
  id: string;
  date: string;
  mainFarmerId: string;
  mainFarmerName: string;
  mainFarmerNamePa?: string;
  linkedFarmerId: string;
  linkedFarmerName: string;
  linkedFarmerNamePa?: string;
  agency: string;
  bags: number;
  qul: number;
  kg: number;
  rate: number;
  totalAmount: number;
}

export interface FarmerPurchaseSummary {
  farmerId: string;
  farmerName: string;
  farmerNamePa: string;
  fatherName: string;
  fatherNamePa?: string;
  village: string;
  villagePa: string;
  mobile: string;
  aadhaar: string;
  isMainFarmer?: boolean;
  isLinkedFarmer?: boolean;
  linkedToMainFarmerId?: string;
  linkedToMainFarmerName?: string;
  linkedToMainFarmerNamePa?: string;
  linkedSubFarmersCount?: number;
  mandiArrivalBags: number;
  mandiArrivalWeightKg: number;
  mandiArrivalWeightDisplay: string;
  directPurchasedBags?: number;
  linkedPurchasedBags?: number;
  linkedPurchasedWeightKg?: number;
  alreadyPurchasedBags: number; // total purchased = direct + linked
  alreadyPurchasedWeightKg: number;
  alreadyPurchasedWeightDisplay: string;
  remainingBags: number;
  remainingWeightKg: number;
  remainingWeightDisplay: string;
  agencyWisePurchases: {
    agency: string;
    bags: number;
    weightKg: number;
    amount: number;
  }[];
}

export interface FarmerPaymentRecord {
  id: string;
  date: string;
  farmerId: string;
  amount: number;
  paymentMode: 'BANK_TRANSFER' | 'RTGS' | 'NEFT' | 'CHEQUE' | 'CASH';
  referenceNumber?: string;
  agency?: string;
  remarks?: string;
  status: 'PAID' | 'PENDING';
  firmId?: string;
  fiscalYear?: string;
  createdAt: string;
}

export interface BoliRecord {
  id: string;
  date: string;
  farmerId: string;
  farmerName?: string;
  farmerNamePa?: string;
  farmerFatherName?: string;
  farmerVillage?: string;
  farmerMobile?: string;
  crop: string;
  heapNumber?: string; // Dheri No (ਢੇਰੀ ਨੰ:)
  bags: number;
  qul: number;
  kg: number;
  totalWeightKg: number;
  rate: number; // e.g. 2320 (₹ per Qtl)
  ratePerQtl?: number;
  agency: string;
  buyerName?: string; // Purchaser / Trader / Mill / Agency
  totalAmount: number;
  labourDeductions?: LabourAndDeductions;
  netAmount?: number;
  boliNumber?: string;
  gatePassNumber?: string;
  status: 'CONFIRMED' | 'PENDING' | 'COMPLETED';
  firmId?: string;
  fiscalYear?: string;
  createdAt: string;
}

export interface FarmerAccountSummary {
  farmer: Farmer;
  isMainFarmer?: boolean;
  isLinkedFarmer?: boolean;
  linkedToMainFarmer?: {
    id: string;
    farmerName: string;
    farmerNamePa: string;
    village: string;
    villagePa: string;
  };
  linkedFarmersList?: {
    id: string;
    farmerName: string;
    farmerNamePa: string;
    village: string;
    villagePa: string;
    mobile?: string;
  }[];
  linkedSubFarmers?: {
    id: string;
    farmerName: string;
    farmerNamePa: string;
    fatherName?: string;
    fatherNamePa?: string;
    village: string;
    villagePa: string;
    mobile?: string;
  }[];

  // Mandi Arrival
  mandiArrivalBags: number;
  mandiArrivalWeightKg: number;
  mandiArrivalQtl: number;
  mandiArrivalKg: number;
  mandiArrivalDisplay: string;
  mandiArrivalEntries: BagsEntryRecord[];
  
  // Boli Details
  boliRecords: (BoliRecord | DailyPurchaseRecord)[];
  
  // Daily Purchase
  directPurchasedBags: number;
  directPurchasedWeightKg?: number;
  directPurchasedAmount?: number;
  linkedPurchasedBags: number;
  linkedPurchasedWeightKg?: number;
  linkedPurchasedAmount?: number;
  purchasedBags: number; // direct + linked
  purchasedWeightKg: number;
  purchasedQtl: number;
  purchasedKg: number;
  purchasedWeightDisplay: string;
  purchasedAmount: number;
  purchaseRecords: DailyPurchaseRecord[];
  linkedPurchasesList: LinkedPurchaseDetail[];
  
  // Remaining
  remainingBags: number;
  remainingWeightKg: number;
  remainingQtl: number;
  remainingKg: number;
  remainingWeightDisplay: string;
  
  // Agency Breakdown
  agencyWisePurchases: {
    agency: string;
    agencyPa?: string;
    bags: number;
    weightKg: number;
    amount: number;
  }[];
  
  // Bardana Usage
  newBardanaUsed: number;
  oldBardanaUsed: number;
  totalBardanaUsed: number;
  
  // Financial & Labour Deductions Overview
  totalGrossAmount: number; // Gross amount from Mandi Arrivals
  totalPakkiLabour: number;
  totalPakkaDoubleLabour: number;
  totalSukhiLabour: number;
  totalLabourDeductions: number; // Sum of enabled labour
  totalOtherDeductions: number;
  totalDeductions: number; // Total Labour + Other Deductions
  
  // Agency Purchase Payment
  totalAgencyPurchasePayment: number;
  
  // NET PAYABLE = totalGrossAmount - totalLabourDeductions - totalAgencyPurchasePayment
  netPayableAmount: number;

  // Advances & Interest
  advances: FarmerAdvanceRecord[];
  totalAdvancePrincipal: number;
  totalAdvanceInterest: number;
  totalAdvanceAmount: number; // Principal + Interest
  totalAdvanceRecoverable: number; // alias for totalAdvanceAmount

  // FINAL BALANCE = netPayableAmount - totalAdvanceAmount
  finalBalance: number;
  finalNetSettlementBalance: number; // alias for finalBalance

  // Payments
  paidAmount: number;
  pendingAmount: number;
  paymentRecords: FarmerPaymentRecord[];
  
  // Unified Transaction History
  transactions: {
    id: string;
    date: string;
    type: 'MANDI_ARRIVAL' | 'BOLI' | 'DAILY_PURCHASE' | 'LINKED_PURCHASE' | 'BARDANA' | 'PAYMENT' | 'ADVANCE' | 'ADJUSTMENT' | 'REPAYMENT';
    typeLabelEn: string;
    typeLabelPa: string;
    agency?: string;
    reference?: string;
    bags?: number;
    qul?: number;
    kg?: number;
    rate?: number;
    totalAmount?: number;
    grossAmount?: number;
    labourDeductions?: LabourAndDeductions;
    netAmount?: number;
    status?: string;
    details?: string;
    rawRecord?: any;
  }[];

  // Opening Balance & Credit Limit
  openingBalance?: number;
  creditLimit?: number;
  creditLimitExceeded?: boolean;
  creditLimitRemaining?: number;
}

export interface VillageOption {
  en: string;
  pa: string;
}

export interface PinCodeVillageMapping {
  pinCode: string;
  districtEn: string;
  districtPa: string;
  villages: VillageOption[];
}

export interface TruckMasterRecord {
  id: string; // e.g. "TRK-001"
  truckNo: string; // e.g. "PB 08 AB 9596"
  driverName: string;
  driverPhone: string;
  driverMobile?: string;
  capacityBags?: number;
  truckUnion?: string; // e.g. "Truck Union Lohian Khas"
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MandiSettings {
  mandiNameEn: string;
  mandiNamePa: string;
  marketCommitteeEn: string;
  marketCommitteePa: string;
  firmNameEn?: string; // e.g. "Jammu Trading Co"
  firmNamePa?: string; // "ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ"
  firmAddress?: string; // "Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629"
  firmMobile?: string; // "98147-74651"
  firmLicence?: string; // "JAL/LKH/133"
  licenceNo?: string; // alias for firmLicence
  firmPan?: string; // "AAACJ1234F"
  firmGstin?: string;
  fixedRatePerQtl: number; // 2461
  fixedBagWeightKg: number; // 37.50
  bagWeightStandard?: number; // legacy alias
  standardBagWeightKg?: number; // legacy alias
  labourRatePerBag?: number; // legacy alias
  agencies?: ProcurementAgency[];
  
  // Lefting agency purchase validation rule (ON = Lefting cannot exceed available purchase, OFF = no restriction)
  requireAgencyPurchaseBeforeLefting?: boolean;

  // Configurable Labour Rates
  defaultPakkiLabourRate: number; // default: 8 (₹/Bag)
  defaultPakkaDoubleLabourRate: number; // default: 14 (₹/Bag)
  defaultSukhiLabourRate: number; // default: 5 (₹/Bag)
  defaultCustomDeductions?: {
    id: string;
    nameEn: string;
    namePa: string;
    type: 'PER_QTL' | 'FIXED';
    rate: number;
    enabledByDefault?: boolean;
  }[];
}

export interface LeftingRecord {
  id: string; // e.g. "LFT-00001"
  date: string; // e.g. "28/08/2026"
  agency?: string; // e.g. "Pungrain", "Markfed"
  sellerId?: string; // e.g. "SLR-001"
  sellerName?: string; // Sheller / Seller Master Name
  sellerNamePa?: string;
  sellerAddress?: string; // Destination Sheller Address
  sellerMobile?: string;
  farmerId?: string; // optional for legacy compatibility
  farmerName?: string;
  farmerNamePa?: string;
  fatherName?: string;
  fatherNamePa?: string;
  village?: string;
  villagePa?: string;
  mobile?: string;
  sellerOrAgency: string; // e.g. "Markfed / Kang Modern Rice Sheller"
  bags: number; // Dispatched bags (cannot exceed Agency Purchased quantity)
  bardanaType: BardanaType; // 'NEW' | 'OLD' | 'BOTH'
  newBags?: number;
  oldBags?: number;
  boxCount?: number;
  looseBags?: number;
  qul: number;
  kg: number;
  totalWeightKg: number; // (qul * 100) + kg
  cropType?: CropType; // 'PADDY' | 'WHEAT' | 'MAIZE'
  destination: string; // Mill / Sheller Address
  truckNo: string; // e.g. "PB-10-AZ-1234"
  driverName: string;
  driverPhone?: string;
  driverPhotoUrl?: string; // Driver Photo URL / base64
  truckUnion?: string; // e.g. "Truck Union Lohian Khas"
  photos?: string[]; // Multiple photos: truck, bilti, receipts
  gatePassNo?: string;
  dispatchDate: string; // Dispatch date
  receivingDate?: string; // Sheller receiving date
  rejectedBags?: number; // Rejected bags by sheller
  shortageKg?: number; // Shortage in Kg reported
  netDeliveredBags?: number; // bags - rejectedBags
  netDeliveredKg?: number; // totalWeightKg - shortageKg
  status: 'DISPATCHED' | 'DELIVERED' | 'REJECTED_PARTIAL';
  remarks?: string;
  firmId?: string;
  fiscalYear?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RecycleBinItem {
  id: string;
  originalId: string;
  type: 'FARMER' | 'BAGS_ENTRY' | 'DAILY_PURCHASE' | 'BARDANA' | 'ADVANCE' | 'LEFTING' | 'PAYMENT' | 'BOLI';
  titleEn: string;
  titlePa: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy?: string;
  restoredAt?: string;
  restoredBy?: string;
  permanentlyDeletedAt?: string;
  permanentlyDeletedBy?: string;
  recordData: any;
}

export type AppLanguage = 'en' | 'pa';

export interface LabourMate {
  id: string; // e.g. "MATE-001"
  mateName: string; // e.g. "Kalu Mate"
  mateNamePa: string; // e.g. "ਕਾਲੂ ਮੇਟ"
  mobile: string;
  village?: string;
  teamSize?: number; // Number of workers/palledars in gang
  notes?: string;
  createdAt: string;
}

export interface LabourWorkEntry {
  id: string;
  mateId: string;
  mateName: string;
  date: string; // DD/MM/YYYY
  workType: 'CLEANING_PAKHA' | 'FILLING_WEIGHING' | 'TRUCK_LOADING' | 'CHHANAI' | 'MISC';
  workTypePa: string; // e.g. "ਪੱਖਾ / ਛਣਾਈ", "ਭਰਾਈ ਤੇ ਤੁਲਾਈ", "ਟਰੱਕ ਲੋਡਿੰਗ"
  bags: number;
  ratePerBag: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

export interface LabourAdvancePayment {
  id: string;
  mateId: string;
  mateName: string;
  date: string; // DD/MM/YYYY
  amount: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK' | 'RATION';
  remarks?: string;
  createdAt: string;
}

export type NavigationSection =
  | 'dashboard'
  | 'boli'
  | 'bags-entry'
  | 'same-date-multi-entry'
  | 'daily-purchase'
  | 'farmer-account'
  | 'farmer-bag-balance-labour'
  | 'labour-ledger'
  | 'lefting'
  | 'balance-chart'
  | 'farmer-registration'
  | 'multi-farmer-add'
  | 'bank-details'
  | 'bardana'
  | 'search-farmer'
  | 'reports'
  | 'recycle-bin'
  | 'settings';
