/**
 * Storage and management for Farmer Payment Adjustments, Transfers & Bag Transfers
 * Persists in localStorage with sensible default audit trail
 */

export interface PaymentTransferRecord {
  id: string;
  fromFarmerId: string;
  fromFarmerName: string;
  toFarmerId: string;
  toFarmerName: string;
  amount: number;
  date: string;
  reason: string;
  createdAt: string;
}

export interface SameFarmerAdjustmentRecord {
  id: string;
  farmerId: string;
  farmerName: string;
  type: 'ADVANCE_TO_PURCHASE' | 'PURCHASE_TO_ADVANCE' | 'LABOUR_ADJUSTMENT' | 'OTHER';
  typeLabelEn: string;
  typeLabelPa: string;
  fromAllocation: string;
  toAllocation: string;
  amount: number;
  date: string;
  reason: string;
  createdAt: string;
}

export interface BagTransferRecord {
  id: string;
  fromFarmerId: string;
  fromFarmerName: string;
  toFarmerId: string;
  toFarmerName: string;
  bags: number;
  date: string;
  reason: string;
  createdAt: string;
}

const STORAGE_KEY_PAYMENT_TRANSFERS = 'mandi_farmer_payment_transfers';
const STORAGE_KEY_SAME_ADJUSTMENTS = 'mandi_farmer_same_adjustments';
const STORAGE_KEY_BAG_TRANSFERS = 'mandi_farmer_bag_transfers';

const SEED_PAYMENT_TRANSFERS: PaymentTransferRecord[] = [
  {
    id: 'PT-001',
    fromFarmerId: 'FRM000001',
    fromFarmerName: 'Rahul (Sukhdev Singh)',
    toFarmerId: 'FRM000002',
    toFarmerName: 'Sandeep (Baldev Singh)',
    amount: 50000,
    date: '29/08/2026',
    reason: 'Inter-Farmer payment transfer as requested by farmer',
    createdAt: new Date().toISOString()
  }
];

const SEED_SAME_ADJUSTMENTS: SameFarmerAdjustmentRecord[] = [
  {
    id: 'SFA-001',
    farmerId: 'FRM000001',
    farmerName: 'Sukhdev Singh',
    type: 'ADVANCE_TO_PURCHASE',
    typeLabelEn: 'Advance → Purchase',
    typeLabelPa: 'ਐਡਵਾਂਸ ਤੋਂ ਖਰੀਦ',
    fromAllocation: 'Advance Account',
    toAllocation: 'Purchase Settlement',
    amount: 70000,
    date: '30/08/2026',
    reason: 'Reallocated advance payment against mandi crop purchase',
    createdAt: new Date().toISOString()
  }
];

const SEED_BAG_TRANSFERS: BagTransferRecord[] = [
  {
    id: 'BT-001',
    fromFarmerId: 'FRM000001',
    fromFarmerName: 'Rahul (Sukhdev Singh)',
    toFarmerId: 'FRM000002',
    toFarmerName: 'Sandeep (Baldev Singh)',
    bags: 600,
    date: '31/08/2026',
    reason: 'Surplus remaining bag quota transferred to Sandeep',
    createdAt: new Date().toISOString()
  }
];

export function getPaymentTransfers(): PaymentTransferRecord[] {
  if (typeof window === 'undefined') return SEED_PAYMENT_TRANSFERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENT_TRANSFERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PAYMENT_TRANSFERS, JSON.stringify(SEED_PAYMENT_TRANSFERS));
      return SEED_PAYMENT_TRANSFERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_PAYMENT_TRANSFERS;
  }
}

export function savePaymentTransfer(record: Omit<PaymentTransferRecord, 'id' | 'createdAt'>): PaymentTransferRecord {
  const current = getPaymentTransfers();
  const newRec: PaymentTransferRecord = {
    ...record,
    id: `PT-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  };
  const updated = [newRec, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_PAYMENT_TRANSFERS, JSON.stringify(updated));
  }
  return newRec;
}

export function getSameFarmerAdjustments(): SameFarmerAdjustmentRecord[] {
  if (typeof window === 'undefined') return SEED_SAME_ADJUSTMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAME_ADJUSTMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SAME_ADJUSTMENTS, JSON.stringify(SEED_SAME_ADJUSTMENTS));
      return SEED_SAME_ADJUSTMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_SAME_ADJUSTMENTS;
  }
}

export function saveSameFarmerAdjustment(record: Omit<SameFarmerAdjustmentRecord, 'id' | 'createdAt'>): SameFarmerAdjustmentRecord {
  const current = getSameFarmerAdjustments();
  const newRec: SameFarmerAdjustmentRecord = {
    ...record,
    id: `SFA-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  };
  const updated = [newRec, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SAME_ADJUSTMENTS, JSON.stringify(updated));
  }
  return newRec;
}

export function getBagTransfers(): BagTransferRecord[] {
  if (typeof window === 'undefined') return SEED_BAG_TRANSFERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BAG_TRANSFERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BAG_TRANSFERS, JSON.stringify(SEED_BAG_TRANSFERS));
      return SEED_BAG_TRANSFERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_BAG_TRANSFERS;
  }
}

export function saveBagTransfer(record: Omit<BagTransferRecord, 'id' | 'createdAt'>): BagTransferRecord {
  const current = getBagTransfers();
  const newRec: BagTransferRecord = {
    ...record,
    id: `BT-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  };
  const updated = [newRec, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_BAG_TRANSFERS, JSON.stringify(updated));
  }
  return newRec;
}
