import QRCode from 'qrcode';
import { BagsEntryRecord, MandiFirm, MandiSettings } from '../types/mandi';

export interface ParchiQrPayload {
  tokenType: 'MANDI_PARCHI';
  parchiNo: number | string;
  entryId: string;
  firm: string;
  farmer: string;
  farmerId: string;
  village: string;
  date: string;
  bags: number;
  weightQtl: string;
  netPayable: number;
  crop?: string;
  verifiedUrl?: string;
}

export async function generateParchiQrCode(
  entry: BagsEntryRecord,
  firmName?: string
): Promise<string> {
  const payload: ParchiQrPayload = {
    tokenType: 'MANDI_PARCHI',
    parchiNo: entry.parchiNo || entry.entryNumber || '0',
    entryId: entry.id,
    firm: firmName || 'MANDI FIRM',
    farmer: entry.farmerNamePa || entry.farmerName,
    farmerId: entry.farmerId,
    village: entry.farmerVillage || '',
    date: entry.date,
    bags: entry.bags,
    weightQtl: entry.totalBagsWeightDisplay || `${(entry.totalBagsWeightKg / 100).toFixed(2)} Qtl`,
    netPayable: entry.netAmount
  };

  // Compact payload string formatted for easy camera reading & validation
  const qrString = `MANDI-TOKEN|#${payload.parchiNo}|${payload.date}|${payload.farmer}|${payload.bags}Bags|${payload.weightQtl}|Rs.${payload.netPayable}|ID:${entry.id.slice(-6)}`;

  try {
    return await QRCode.toDataURL(qrString, {
      width: 130,
      margin: 1,
      color: {
        dark: '#020617', // slate-950
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Failed to generate Parchi QR Code:', err);
    return '';
  }
}
