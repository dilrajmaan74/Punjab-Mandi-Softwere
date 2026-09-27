import { Farmer } from '../types/mandi';

export interface ParsedVoiceData {
  farmer?: Farmer;
  matchedFarmerName?: string;
  matchedVillage?: string;
  newBags?: number;
  oldBags?: number;
  totalBags?: number;
  doubleBags?: number;
  sukkiBags?: number;
  totaKg?: number;
  ratePerQtl?: number;
  crop?: string;
  agency?: string;
  buyerName?: string;
  rawTranscript: string;
  confidenceScore?: number;
}

// Map of Punjabi number words to numeric values
const PUNJABI_NUMBER_WORDS: Record<string, number> = {
  'ਸਿਫਰ': 0, 'ਜ਼ੀਰੋ': 0, 'ਜ਼ੀਰੋ ': 0,
  'ਇੱਕ': 1, 'ਇਕ': 1, 'ੲਿੱਕ': 1, 'ik': 1, 'ikk': 1, 'ek': 1, 'एक': 1,
  'ਦੋ': 2, 'do': 2, 'दो': 2,
  'ਤਿੰਨ': 3, 'tin': 3, 'teen': 3, 'तीन': 3,
  'ਚਾਰ': 4, 'char': 4, 'chaar': 4, 'चार': 4,
  'ਪੰਜ': 5, 'panj': 5, 'paanch': 5, 'पांच': 5,
  'ਛੇ': 6, 'che': 6, 'chhe': 6, 'छह': 6,
  'ਸੱਤ': 7, 'sat': 7, 'saat': 7, 'सात': 7,
  'ਅੱਠ': 8, 'ath': 8, 'aath': 8, 'आठ': 8,
  'ਨੌਂ': 9, 'ਨੌ': 9, 'nau': 9, 'नौ': 9,
  'ਦਸ': 10, 'das': 10, 'दस': 10,
  'ਗਿਆਰਾਂ': 11, 'ਗਿਆਰਾ': 11, 'gyara': 11, 'ग्यारह': 11,
  'ਬਾਰਾਂ': 12, 'ਬਾਰਾ': 12, 'bara': 12, 'बारह': 12,
  'ਤੇਰਾਂ': 13, 'ਤੇਰਾ': 13, 'tera': 13, 'तेरह': 13,
  'ਚੌਦਾਂ': 14, 'ਚੌਦਾ': 14, 'chauda': 14, 'चौदह': 14,
  'ਪੰਦਰਾਂ': 15, 'ਪੰਦਰਾ': 15, 'pandra': 15, 'पंद्रह': 15,
  'ਸੋਲਾਂ': 16, 'ਸੋਲਾ': 16, 'sola': 16, 'सोलह': 16,
  'ਸਤਾਰਾਂ': 17, 'ਸਤਾਰਾ': 17, 'satara': 17, 'सत्रह': 17,
  'ਅਠਾਰਾਂ': 18, 'ਅਠਾਰਾ': 18, 'athara': 18, 'अठारह': 18,
  'ਉੱਨੀ': 19, 'ਉਨੀ': 19, 'unni': 19, 'उन्नीस': 19,
  'ਵੀਹ': 20, 'veeh': 20, 'bees': 20, 'बीस': 20,
  'ਇੱਕੀ': 21, 'ikki': 21, 'इक्कीस': 21,
  'ਬਾਈ': 22, 'baee': 22, 'बाईस': 22,
  'ਤੇਈ': 23, 'teyi': 23, 'तेईस': 23,
  'ਚੌਵੀ': 24, 'chauvi': 24, 'चौबीस': 24,
  'ਪੱਚੀ': 25, 'pachi': 25, 'पच्चीस': 25,
  'ਛੱਬੀ': 26, 'chhabi': 26, 'छब्बीस': 26,
  'ਸਤਾਈ': 27, 'satai': 27, 'सत्ताईस': 27,
  'ਅਠਾਈ': 28, 'athai': 28, 'अट्ठाईस': 28,
  'ਉਣੱਤੀ': 29, 'unatti': 29, 'उनतीस': 29,
  'ਤੀਹ': 30, 'teeh': 30, 'tees': 30, 'तीस': 30,
  'ਇਕੱਤੀ': 31, 'ਬੱਤੀ': 32, 'ਤੇਂਤੀ': 33, 'ਚੌਂਤੀ': 34,
  'ਪੈਂਤੀ': 35, 'painti': 35, 'पैंतीस': 35,
  'ਛੱਤੀ': 36, 'ਸੈਂਤੀ': 37, 'ਅਠੱਤੀ': 38, 'ਉਣਤਾਲੀ': 39,
  'ਚਾਲੀ': 40, 'chali': 40, 'chalis': 40, 'चालीस': 40,
  'ਤਾਲੀ': 40, 'ਇਕਤਾਲੀ': 41, 'ਬਤਾਲੀ': 42, 'ਤਰਤਾਲੀ': 43, 'ਚਤਾਲੀ': 44,
  'ਪੰਤਾਲੀ': 45, 'pantali': 45, 'पैंतालीस': 45,
  'ਛਿਆਲੀ': 46, 'ਸਨਤਾਲੀ': 47, 'ਅਠਤਾਲੀ': 48, 'ਉਣੰਜਾ': 49,
  'ਪੰਜਾਹ': 50, 'panjah': 50, 'pachaas': 50, 'पचास': 50,
  'ਇਕਵੰਜਾ': 51, 'ਬਵੰਜਾ': 52, 'ਤਰਵੰਜਾ': 53, 'ਚੁਰਵੰਜਾ': 54,
  'ਪਚਵੰਜਾ': 55, 'pachwanja': 55, 'पचपन': 55,
  'ਛੱਪੰਜਾ': 56, 'ਸਤਵੰਜਾ': 57, 'ਅਠਵੰਜਾ': 58, 'ਉਣਾਹਠ': 59,
  'ਸੱਠ': 60, 'sath': 60, 'saath': 60, 'साठ': 60,
  'ਇਕਾਹਠ': 61, 'ਬਾਹਠ': 62, 'ਤਰੇਹਠ': 63, 'ਚੌਂਹਠ': 64,
  'ਪੈਂਹਠ': 65, 'painhat': 65, 'पैंसठ': 65,
  'ਛਿਆਹਠ': 66, 'ਸਤਾਹਠ': 67, 'ਅਠਾਹਠ': 68, 'ਉਣੱਤਰ': 69,
  'ਸੱਤਰ': 70, 'sattar': 70, 'सत्तर': 70,
  'ਇਕੱਤਰ': 71, 'ਬਹੱਤਰ': 72, 'ਤਿਹੱਤਰ': 73, 'ਚੌਹੱਤਰ': 74,
  'ਪੰਛੱਤਰ': 75, 'ਪਚੱਤਰ': 75, 'panjhattar': 75, 'पचहत्तर': 75,
  'ਛਿਹੱਤਰ': 76, 'ਸਤੱਤਰ': 77, 'ਅਠੱਤਰ': 78, 'ਉਣਾਸੀ': 79,
  'ਅੱਸੀ': 80, 'assi': 80, 'अस्सी': 80,
  'ਇਕਿਆਸੀ': 81, 'ਬਿਆਸੀ': 82, 'ਤਿਰਾਸੀ': 83, 'ਚੌਰਾਸੀ': 84,
  'ਪਚਾਸੀ': 85, 'pachasi': 85, 'पचासी': 85,
  'ਛਿਆਸੀ': 86, 'ਸਤਾਸੀ': 87, 'ਅਠਾਸੀ': 88, 'ਨਵਾਸੀ': 89,
  'ਨੱਬੇ': 90, 'nabbe': 90, 'नब्बे': 90,
  'ਇਕਾਨਵੇਂ': 91, 'ਬਾਨਵੇਂ': 92, 'ਤਿਰਾਨਵੇਂ': 93, 'ਚੌਰਾਨਵੇਂ': 94,
  'ਪਚਾਨਵੇਂ': 95, 'pachanve': 95, 'पचानवे': 95,
  'ਛਿਆਨਵੇਂ': 96, 'ਸਤਾਨਵੇਂ': 97, 'ਅਠਾਨਵੇਂ': 98, 'ਨੜਿੰਨਵੇਂ': 99,
  'ਸੌ': 100, 'sau': 100, 'sauh': 100, 'सौ': 100,
  'ਡੇਢ ਸੌ': 150, 'dedh sau': 150, 'डेढ़ सौ': 150,
  'ਦੋ ਸੌ': 200, 'do sau': 200, 'दो सौ': 200,
  'ਢਾਈ ਸੌ': 250, 'dhai sau': 250, 'ढाई सौ': 250,
  'ਤਿੰਨ ਸੌ': 300, 'tin sau': 300, 'तीन सौ': 300,
  'ਚਾਰ ਸੌ': 400, 'char sau': 400, 'चार सौ': 400,
  'ਪੰਜ ਸੌ': 500, 'panj sau': 500, 'पांच सौ': 500,
  'ਹਜ਼ਾਰ': 1000, 'hazar': 1000, 'हजार': 1000
};

// Gurmukhi unicode numerals to ASCII digits
export function normalizeGurmukhiNumerals(str: string): string {
  const gurmukhiMap: Record<string, string> = {
    '੦': '0', '੧': '1', '੨': '2', '੩': '3', '੪': '4',
    '੫': '5', '੬': '6', '੭': '7', '੮': '8', '੯': '9'
  };

  let normalized = str;
  Object.entries(gurmukhiMap).forEach(([gChar, digit]) => {
    normalized = normalized.split(gChar).join(digit);
  });

  // Replace multi-word Punjabi number expressions first (longer keys first)
  const sortedWords = Object.keys(PUNJABI_NUMBER_WORDS).sort((a, b) => b.length - a.length);
  for (const word of sortedWords) {
    const val = PUNJABI_NUMBER_WORDS[word];
    // Regex word boundary matching for Punjabi/Latin
    const reg = new RegExp(`(^|\\s)${escapeRegExp(word)}(?=\\s|$|[.,!?])`, 'gi');
    normalized = normalized.replace(reg, `$1${val}`);
  }

  // Handle composite hundreds e.g. "2 ਸੌ 30" -> "230"
  normalized = normalized.replace(/(\d+)\s*(?:ਸੌ|sau|सौ)\s*(\d+)/gi, (_, hundreds, tens) => {
    return String(parseInt(hundreds, 10) * 100 + parseInt(tens, 10));
  });

  // Handle standalone hundreds e.g. "3 ਸੌ" -> "300"
  normalized = normalized.replace(/(\d+)\s*(?:ਸੌ|sau|सौ)/gi, (_, hundreds) => {
    return String(parseInt(hundreds, 10) * 100);
  });

  return normalized;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Intelligent parsing for Punjabi/Hindi/English mandi auctions and weighment entries
 */
export function parseSpokenMandiText(rawText: string, farmers: Farmer[]): ParsedVoiceData {
  if (!rawText || !rawText.trim()) {
    return { rawTranscript: '' };
  }

  const result: ParsedVoiceData = {
    rawTranscript: rawText.trim()
  };

  // Convert numbers
  const text = rawText.toLowerCase().trim();
  const normalized = normalizeGurmukhiNumerals(text);

  // 1. TOTA (ਟੋਟਾ / KGs)
  const totaMatch =
    normalized.match(/(?:ਟੋਟਾ|tota|toota|टोटा)\s*[:=]?\s*(\d+)/i) ||
    normalized.match(/(\d+)\s*(?:ਕਿਲੋ|ਕਿਲੋਗ੍ਰਾਮ|ਕਿਲੋਆਂ|kg|kilo|किलो)\s*(?:ਟੋਟਾ|tota|टोटा)?/i) ||
    normalized.match(/(?:ਟੋਟਾ|tota)\s+(\d+)\s*(?:ਕਿਲੋ|kg)?/i);
  if (totaMatch) {
    result.totaKg = parseInt(totaMatch[1], 10);
  }

  // 2. DOUBLE / PAKKHA (ਪੱਖਾ / ਛਣਾਈ)
  const doubleMatch =
    normalized.match(/(?:ਪੱਖਾ|double|ਡਬਲ|ਛਣਾਈ|ਚਣਾਈ|chhanai|पंखा|डबल)\s*[:=]?\s*(\d+)/i) ||
    normalized.match(/(\d+)\s*(?:ਬੋਰੀ|ਗੱਟੇ)?\s*(?:ਪੱਖਾ|double|ਡਬਲ|ਛਣਾਈ)/i);
  if (doubleMatch) {
    result.doubleBags = parseInt(doubleMatch[1], 10);
  }

  // 3. SUKKI (ਸੁੱਕੀ / ਧੁੱਪ / Sukki)
  const sukkiMatch =
    normalized.match(/(?:ਸੁੱਕੀ|ਸੁਕੀ|sukki|sukhi|सूखी)\s*[:=]?\s*(\d+)/i) ||
    normalized.match(/(\d+)\s*(?:ਬੋਰੀ|ਗੱਟੇ)?\s*(?:ਸੁੱਕੀ|sukki|sukhi)/i);
  if (sukkiMatch) {
    result.sukkiBags = parseInt(sukkiMatch[1], 10);
  }

  // 4. RATE PER QUINTAL (ਰੇਟ / ਭਾਅ)
  const rateMatch =
    normalized.match(/(?:ਰੇਟ|ਭਾਅ|ਭਾ|rate|bhav|रेट|भाव)\s*[:=]?\s*(\d{3,5})/i) ||
    normalized.match(/(\d{4})\s*(?:ਰੁਪਏ|ਰੁਪਈਏ|rs|inr|rate|ਰੇਟ)/i) ||
    normalized.match(/(?:ਵਿਕੀ|ਵੇਚੀ|sold at)\s*(\d{3,5})/i);
  if (rateMatch) {
    const r = parseInt(rateMatch[1], 10);
    if (r >= 500 && r <= 15000) {
      result.ratePerQtl = r;
    }
  }

  // 5. NEW BARDANA (ਨਵਾਂ ਬਾਰਦਾਨਾ / ਨਵੀਆਂ ਬੋਰੀਆਂ)
  const newMatch =
    normalized.match(/(\d+)\s*(?:ਨਵਾਂ|ਨਵੀਂ|ਨਵੀਆਂ|ਨਵੇਂ|new|नया|नई)\s*(?:ਬੋਰੀ|ਬੋਰੀਆਂ|ਗੱਟੇ|ਗੱਟਾ|ਬੈਗ|bags|ਬਾਰਦਾਨਾ)?/i) ||
    normalized.match(/(?:ਨਵਾਂ|ਨਵੀਂ|ਨਵੀਆਂ|new|नया)\s*(?:ਬਾਰਦਾਨਾ|ਬੋਰੀ|ਬੋਰੀਆਂ|ਗੱਟੇ|bags)?\s*[:=]?\s*(\d+)/i);
  if (newMatch) {
    result.newBags = parseInt(newMatch[1], 10);
  }

  // 6. OLD BARDANA (ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ / ਪੁਰਾਣੀ ਬੋਰੀ)
  const oldMatch =
    normalized.match(/(\d+)\s*(?:ਪੁਰਾਣਾ|ਪੁਰਾਣੀ|ਪੁਰਾਣੀਆਂ|ਪੁਰਾਣੇ|old|पुराना|पुरानी)\s*(?:ਬੋਰੀ|ਬੋਰੀਆਂ|ਗੱਟੇ|ਗੱਟਾ|bags|ਬਾਰਦਾਨਾ)?/i) ||
    normalized.match(/(?:ਪੁਰਾਣਾ|ਪੁਰਾਣੀ|ਪੁਰਾਣੀਆਂ|old|पुराना)\s*(?:ਬਾਰਦਾਨਾ|ਬੋਰੀ|ਬੋਰੀਆਂ|ਗੱਟੇ|bags)?\s*[:=]?\s*(\d+)/i);
  if (oldMatch) {
    result.oldBags = parseInt(oldMatch[1], 10);
  }

  // 7. GENERAL BAGS COUNT if new/old wasn't explicitly differentiated
  if (!result.newBags && !result.oldBags) {
    const generalBagsMatch =
      normalized.match(/(\d+)\s*(?:ਬੋਰੀ|ਬੋਰੀਆਂ|ਗੱਟੇ|ਗੱਟਾ|ਕੱਟੇ|ਬੈਗ|bags|bag|बोरी|बोरियां|गट्टे)/i) ||
      normalized.match(/(?:ਬੋਰੀਆਂ|ਗੱਟੇ|bags)\s*[:=]?\s*(\d+)/i);
    if (generalBagsMatch) {
      const b = parseInt(generalBagsMatch[1], 10);
      result.totalBags = b;
      result.newBags = b; // Default new bags
    } else {
      // Look for a realistic bag number (exclude numbers that were already parsed as rate, tota, etc.)
      const usedNumbers = [result.ratePerQtl, result.totaKg, result.doubleBags, result.sukkiBags].filter(Boolean);
      const allNums = normalized.match(/\b\d+\b/g);
      if (allNums) {
        for (const numStr of allNums) {
          const n = parseInt(numStr, 10);
          if (!usedNumbers.includes(n) && n > 0 && n < 5000) {
            result.totalBags = n;
            result.newBags = n;
            break;
          }
        }
      }
    }
  } else {
    result.totalBags = (result.newBags || 0) + (result.oldBags || 0);
  }

  // 8. CROP DETECTION (ਫਸਲ)
  if (normalized.includes('ਝੋਨਾ') || normalized.includes('ਝੋਨੇ') || normalized.includes('jhona') || normalized.includes('paddy') || normalized.includes('धान')) {
    result.crop = 'PADDY';
  } else if (normalized.includes('ਕਣਕ') || normalized.includes('ਕਣਕਾ') || normalized.includes('kanak') || normalized.includes('wheat') || normalized.includes('गेहूं')) {
    result.crop = 'WHEAT';
  } else if (normalized.includes('ਬਾਸਮਤੀ') || normalized.includes('1509') || normalized.includes('1121') || normalized.includes('1401') || normalized.includes('basmati')) {
    result.crop = 'BASMATI';
  } else if (normalized.includes('ਸਰ੍ਹੋਂ') || normalized.includes('ਸਰੋਂ') || normalized.includes('mustard') || normalized.includes('sarson')) {
    result.crop = 'MUSTARD';
  } else if (normalized.includes('ਮੱਕੀ') || normalized.includes('makki') || normalized.includes('maize')) {
    result.crop = 'MAIZE';
  }

  // 9. AGENCY / BUYER DETECTION
  if (normalized.includes('ਮਾਰਕਫੈੱਡ') || normalized.includes('ਮਾਰਕਫੈਡ') || normalized.includes('markfed')) {
    result.agency = 'MARKFED';
    result.buyerName = 'Markfed (ਮਾਰਕਫੈੱਡ)';
  } else if (normalized.includes('ਪਨਗ੍ਰੇਨ') || normalized.includes('ਪਨਗਰੇਨ') || normalized.includes('pungrain')) {
    result.agency = 'PUNGRAIN';
    result.buyerName = 'Pungrain (ਪਨਗ੍ਰੇਨ)';
  } else if (normalized.includes('ਐਫ ਸੀ ਆਈ') || normalized.includes('ਐਫਸੀਆਈ') || normalized.includes('fci')) {
    result.agency = 'FCI';
    result.buyerName = 'FCI';
  } else if (normalized.includes('ਪਨਸਪ') || normalized.includes('punsup')) {
    result.agency = 'PUNSUP';
    result.buyerName = 'Punsup (ਪਨਸਪ)';
  } else if (normalized.includes('ਵੇਅਰਹਾਊਸ') || normalized.includes('pswc') || normalized.includes('warehouse')) {
    result.agency = 'PSWC';
    result.buyerName = 'PSWC (ਵੇਅਰਹਾਊਸ)';
  } else if (normalized.includes('ਵਪਾਰੀ') || normalized.includes('ਪ੍ਰਾਈਵੇਟ') || normalized.includes('trader') || normalized.includes('private')) {
    result.agency = 'TRADER';
    result.buyerName = 'Private Trader (ਵਪਾਰੀ)';
  }

  // 10. FARMER & VILLAGE MATCHING
  // Clean text to extract farmer name candidates
  const strippedText = normalized
    .replace(/\b\d+\b/g, '')
    .replace(/(?:ਬੋਰੀ|ਬੋਰੀਆਂ|ਗੱਟੇ|ਗੱਟਾ|ਬਾਰਦਾਨਾ|ਨਵਾਂ|ਨਵੀਂ|ਨਵੀਆਂ|ਨਵੇਂ|ਪੁਰਾਣਾ|ਪੁਰਾਣੀ|ਪੁਰਾਣੀਆਂ|ਪੁਰਾਣੇ|ਟੋਟਾ|ਪੱਖਾ|ਛਣਾਈ|ਸੁੱਕੀ|ਸੁਕੀ|ਕਿਲੋ|ਰੇਟ|ਭਾਅ|ਝੋਨਾ|ਕਣਕ|ਬਾਸਮਤੀ|ਮਾਰਕਫੈੱਡ|ਪਨਗ੍ਰੇਨ|fci|ਰੁਪਏ|bags|new|old|tota|double|sukki|kg|rate|qtl)/gi, '')
    .replace(/(?:ਪਿੰਡ|pind|village|ਵਾਲਾ|ਵਾਲੀ|ਸਰਦਾਰ|ਨੰਬਰਦਾਰ|ਜੀ)/gi, '')
    .trim();

  // Village detection
  const villageMatch = normalized.match(/(?:ਪਿੰਡ|pind|village)\s+([a-zA-Z\u0A00-\u0A7F]+)/i);
  if (villageMatch) {
    result.matchedVillage = villageMatch[1].trim();
  }

  if (strippedText.length >= 2 && farmers.length > 0) {
    let bestFarmer: Farmer | null = null;
    let highestScore = 0;

    const terms = strippedText.split(/\s+/).filter(t => t.length >= 2);

    for (const farmer of farmers) {
      let score = 0;
      const fNamePa = (farmer.farmerNamePa || '').toLowerCase();
      const fNameEn = (farmer.farmerName || '').toLowerCase();
      const fVillage = (farmer.village || '').toLowerCase();
      const fVillagePa = (farmer.villagePa || '').toLowerCase();
      const fFather = (farmer.fatherName || '').toLowerCase();

      // Check village boost if specified
      if (result.matchedVillage) {
        const vQuery = result.matchedVillage.toLowerCase();
        if (fVillage.includes(vQuery) || fVillagePa.includes(vQuery)) {
          score += 15;
        }
      }

      // Check name terms
      for (const term of terms) {
        if (fNamePa === term || fNameEn === term) {
          score += 25; // Exact full token match
        } else if (fNamePa.includes(term) || fNameEn.includes(term)) {
          score += 10; // Substring match
        }

        if (fVillage.includes(term) || fVillagePa.includes(term)) {
          score += 8;
        }

        if (fFather.includes(term)) {
          score += 6;
        }
      }

      // Check mobile match if any digits were present in raw transcript
      if (farmer.mobile && normalized.includes(farmer.mobile.slice(-4))) {
        score += 30; // Mobile last 4 digits spoken
      }

      if (score > highestScore) {
        highestScore = score;
        bestFarmer = farmer;
      }
    }

    if (bestFarmer && highestScore >= 10) {
      result.farmer = bestFarmer;
      result.confidenceScore = Math.min(100, highestScore * 3);
    } else {
      result.matchedFarmerName = strippedText.slice(0, 35);
    }
  }

  return result;
}

/**
 * Audio Synthesis Sound Utility:
 * Plays clean pleasant acoustic chime on start and completion
 */
export function playVoiceFeedbackTone(type: 'START' | 'STOP' | 'SUCCESS') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'START') {
      // Pleasant rising chirp (520Hz -> 780Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'STOP') {
      // Soft descending tone (680Hz -> 420Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (type === 'SUCCESS') {
      // Double confirmation chime (587Hz -> 880Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Non-critical audio error, silently ignore
  }
}
