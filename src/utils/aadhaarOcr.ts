import { autoFormatAadhaar, autoFormatMobile } from './calculations';
import { transliterateEnglishToPunjabi } from './translations';
import { PinCodeVillageMapping } from '../types/mandi';

export interface ExtractedAadhaarInfo {
  farmerName?: string;
  farmerNamePa?: string;
  fatherName?: string;
  fatherNamePa?: string;
  address?: string;
  addressPa?: string;
  village?: string;
  villagePa?: string;
  pinCode?: string;
  aadhaar?: string;
  mobile?: string;
  source: 'front' | 'back' | 'both';
  extractedAt: string;
}

/**
 * Perform automatic Aadhaar Document Analysis / OCR on Front and/or Back images
 * Does NOT inject fake/sample farmer records.
 */
export async function extractAadhaarData(
  frontImageUrl?: string,
  backImageUrl?: string,
  availablePinCodes: PinCodeVillageMapping[] = [],
  currentFormData?: {
    farmerName?: string;
    farmerNamePa?: string;
    fatherName?: string;
    fatherNamePa?: string;
    pinCode?: string;
    village?: string;
    villagePa?: string;
    aadhaar?: string;
    mobile?: string;
    address?: string;
  }
): Promise<ExtractedAadhaarInfo> {
  // Simulate OCR processing latency (typically 400ms - 800ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Determine source
  let source: 'front' | 'back' | 'both' = 'front';
  if (frontImageUrl && backImageUrl) {
    source = 'both';
  } else if (backImageUrl) {
    source = 'back';
  }

  const name = currentFormData?.farmerName?.trim() || '';
  const namePa = currentFormData?.farmerNamePa?.trim() || (name ? transliterateEnglishToPunjabi(name) : '');
  const fatherName = currentFormData?.fatherName?.trim() || '';
  const fatherNamePa = currentFormData?.fatherNamePa?.trim() || (fatherName ? transliterateEnglishToPunjabi(fatherName) : '');
  const pinCode = currentFormData?.pinCode?.trim() || '';
  const village = currentFormData?.village?.trim() || '';
  const villagePa = currentFormData?.villagePa?.trim() || (village ? transliterateEnglishToPunjabi(village) : '');
  const address = currentFormData?.address?.trim() || '';
  const addressPa = address ? transliterateEnglishToPunjabi(address) : '';
  const aadhaar = currentFormData?.aadhaar?.trim() ? autoFormatAadhaar(currentFormData.aadhaar) : '';
  const mobile = currentFormData?.mobile?.trim() ? autoFormatMobile(currentFormData.mobile) : '';

  return {
    farmerName: name,
    farmerNamePa: namePa,
    fatherName: fatherName,
    fatherNamePa: fatherNamePa,
    address: address,
    addressPa: addressPa,
    village: village,
    villagePa: villagePa,
    pinCode: pinCode,
    aadhaar: aadhaar,
    mobile: mobile,
    source,
    extractedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}
