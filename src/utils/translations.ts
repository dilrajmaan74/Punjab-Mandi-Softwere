/**
 * Punjabi (Gurmukhi) & English Bilingual Support
 * Includes English -> Gurmukhi Transliteration & Dictionary
 */

// Dictionary for common Punjabi words and names
const EXACT_WORD_MAP: Record<string, string> = {
  // Common Title & Surnames
  singh: 'ਸਿੰਘ',
  kaur: 'ਕੌਰ',
  kumar: 'ਕੁਮਾਰ',
  ram: 'ਰਾਮ',
  lal: 'ਲਾਲ',
  chand: 'ਚੰਦ',
  sharma: 'ਸ਼ਰਮਾ',
  maan: 'ਮਾਨ',
  dhillon: 'ਢਿੱਲੋਂ',
  sandhu: 'ਸੰਧੂ',
  sidhu: 'ਸਿੱਧੂ',
  grewal: 'ਗਰੇਵਾਲ',
  gill: 'ਗਿੱਲ',
  cheema: 'ਚੀਮਾ',
  sohi: 'ਸੋਹੀ',
  aulakh: 'ਔਲਖ',
  brar: 'ਬਰਾੜ',
  bhattal: 'ਭੱਠਲ',
  tiwana: 'ਟਿਵਾਣਾ',
  deol: 'ਦਿਓਲ',
  virk: 'ਵਿਰਕ',
  randhawa: 'ਰੰਧਾਵਾ',
  pabla: 'ਪਾਬਲਾ',
  kaler: 'ਕਲੇਰ',
  pannu: 'ਪੰਨੂ',
  bains: 'ਬੈਂਸ',
  bajwa: 'ਬਾਜਵਾ',
  chahal: 'ਚਾਹਲ',
  sekho: 'ਸੇਖੋਂ',
  sekhon: 'ਸੇਖੋਂ',
  purewal: 'ਪੁਰੇਵਾਲ',
  dosanjh: 'ਦੋਸਾਂਝ',

  // Common First Names
  gurpreet: 'ਗੁਰਪ੍ਰੀਤ',
  harpreet: 'ਹਰਪ੍ਰੀਤ',
  jaspreet: 'ਜਸਪ੍ਰੀਤ',
  manpreet: 'ਮਨਪ੍ਰੀਤ',
  amrit: 'ਅੰਮ੍ਰਿਤ',
  amritpal: 'ਅੰਮ੍ਰਿਤਪਾਲ',
  harjinder: 'ਹਰਜਿੰਦਰ',
  sukhdev: 'ਸੁਖਦੇਵ',
  sukhwinder: 'ਸੁਖਵਿੰਦਰ',
  jaswinder: 'ਜਸਵਿੰਦਰ',
  balwinder: 'ਬਲਵਿੰਦਰ',
  kulwinder: 'ਕੁਲਵਿੰਦਰ',
  davinder: 'ਦਵਿੰਦਰ',
  gurdev: 'ਗੁਰਦੇਵ',
  harnek: 'ਹਰਨੇਕ',
  bhagwant: 'ਭਗਵੰਤ',
  malkit: 'ਮਲਕੀਤ',
  avtar: 'ਅਵਤਾਰ',
  inderjit: 'ਇੰਦਰਜੀਤ',
  paramjit: 'ਪਰਮਜੀਤ',
  surjit: 'ਸੁਰਜੀਤ',
  charanjit: 'ਚਰਨਜੀਤ',
  swaran: 'ਸਵਰਨ',
  swaranjit: 'ਸਵਰਨਜੀਤ',
  karnail: 'ਕਰਨੈਲ',
  jarnail: 'ਜਰਨੈਲ',
  gurnam: 'ਗੁਰਨਾਮ',
  hakam: 'ਹਾਕਮ',
  sadhu: 'ਸਾਧੂ',
  darshan: 'ਦਰਸ਼ਨ',
  tara: 'ਤਾਰਾ',
  pyara: 'ਪਿਆਰਾ',
  jagtar: 'ਜਗਤਾਰ',
  jagjit: 'ਜਗਜੀਤ',
  hardeep: 'ਹਰਦੀਪ',
  mandeep: 'ਮਨਦੀਪ',
  sandip: 'ਸੰਦੀਪ',
  sandeep: 'ਸੰਦੀਪ',
  rajinder: 'ਰਾਜਿੰਦਰ',
  rajwinder: 'ਰਾਜਵਿੰਦਰ',
  navdeep: 'ਨਵਦੀਪ',
  roop: 'ਰੂਪ',
  ranjit: 'ਰਣਜੀਤ',
  baljit: 'ਬਲਜੀਤ',
  tarlochan: 'ਤਰਲੋਚਨ',
  mohan: 'ਮੋਹਨ',
  sohan: 'ਸੋਹਣ',
  rohan: 'ਰੋਹਨ',
  ramesh: 'ਰਮੇਸ਼',
  suresh: 'ਸੁਰੇਸ਼',
  naresh: 'ਨਰੇਸ਼',
  satnam: 'ਸਤਨਾਮ',
  pargat: 'ਪਰਗਟ',
  booter: 'ਬੂਟਾ',
  boota: 'ਬੂਟਾ',
  satpal: 'ਸਤਪਾਲ',
  jaspal: 'ਜਸਪਾਲ',
  dharam: 'ਧਰਮ',
  dharamjit: 'ਧਰਮਜੀਤ',
  pala: 'ਪਾਲਾ',
  shinda: 'ਛਿੰਦਾ',
  kaka: 'ਕਾਕਾ',
  jeeta: 'ਜੀਤਾ',
  binda: 'ਬਿੰਦਾ',

  // Bardana & Common Mandi terms
  old: 'ਪੁਰਾਣਾ',
  new: 'ਨਵਾਂ',
  bag: 'ਬੋਰੀ',
  bags: 'ਬੋਰੀਆਂ',
  weight: 'ਵਜ਼ਨ',
  quintal: 'ਕੁਇੰਟਲ',
  qul: 'ਕੁਇੰਟਲ',
  tota: 'ਟੋਟਾ',
  farmer: 'ਕਿਸਾਨ',
  village: 'ਪਿੰਡ'
};

/**
 * Phonetic Transliteration from English to Gurmukhi
 */
export function transliterateEnglishToPunjabi(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const words = text.trim().split(/\s+/);
  const translatedWords = words.map((word) => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (EXACT_WORD_MAP[cleanWord]) {
      return EXACT_WORD_MAP[cleanWord];
    }

    // Heuristic syllable matching for Punjabi
    let result = '';
    let i = 0;
    const str = cleanWord;

    const charMap: [RegExp, string][] = [
      [/^singh/, 'ਸਿੰਘ'],
      [/^kaur/, 'ਕੌਰ'],
      [/^preet/, 'ਪ੍ਰੀਤ'],
      [/^winder/, 'ਵਿੰਦਰ'],
      [/^vinder/, 'ਵਿੰਦਰ'],
      [/^jinder/, 'ਜਿੰਦਰ'],
      [/^deep/, 'ਦੀਪ'],
      [/^pal/, 'ਪਾਲ'],
      [/^jit/, 'ਜੀਤ'],
      [/^jeet/, 'ਜੀਤ'],
      [/^dev/, 'ਦੇਵ'],
      [/^tar/, 'ਤਾਰ'],
      [/^nam/, 'ਨਾਮ'],
      [/^gur/, 'ਗੁਰ'],
      [/^har/, 'ਹਰ'],
      [/^jas/, 'ਜਸ'],
      [/^man/, 'ਮਨ'],
      [/^kul/, 'ਕੁਲ'],
      [/^bal/, 'ਬਲ'],
      [/^sukh/, 'ਸੁਖ'],
      [/^av/, 'ਅਵ'],
      [/^sh/, 'ਸ਼'],
      [/^kh/, 'ਖ'],
      [/^gh/, 'ਘ'],
      [/^ch/, 'ਚ'],
      [/^chh/, 'ਛ'],
      [/^jh/, 'ਝ'],
      [/^th/, 'ਥ'],
      [/^dh/, 'ਧ'],
      [/^ph/, 'ਫ'],
      [/^bh/, 'ਭ'],
      [/^ee/, 'ੀ'],
      [/^oo/, 'ੂ'],
      [/^aa/, 'ਾ'],
      [/^ai/, 'ੈ'],
      [/^au/, 'ੌ'],
      [/^k/, 'ਕ'],
      [/^g/, 'ਗ'],
      [/^c/, 'ਕ'],
      [/^j/, 'ਜ'],
      [/^t/, 'ਤ'],
      [/^d/, 'ਦ'],
      [/^n/, 'ਨ'],
      [/^p/, 'ਪ'],
      [/^f/, 'ਫ'],
      [/^b/, 'ਬ'],
      [/^m/, 'ਮ'],
      [/^y/, 'ਯ'],
      [/^r/, 'ਰ'],
      [/^l/, 'ਲ'],
      [/^v/, 'ਵ'],
      [/^w/, 'ਵ'],
      [/^s/, 'ਸ'],
      [/^h/, 'ਹ'],
      [/^a/, 'ਾ'],
      [/^i/, 'ਿ'],
      [/^u/, 'ੁ'],
      [/^e/, 'ੇ'],
      [/^o/, 'ੋ']
    ];

    let remaining = str;
    let isStart = true;
    while (remaining.length > 0) {
      let matched = false;
      for (const [regex, punjabiChar] of charMap) {
        const m = remaining.match(regex);
        if (m) {
          if (isStart && (punjabiChar === 'ਾ' || punjabiChar === 'ਿ' || punjabiChar === 'ੀ' || punjabiChar === 'ੁ' || punjabiChar === 'ੂ' || punjabiChar === 'ੇ' || punjabiChar === 'ੈ' || punjabiChar === 'ੋ' || punjabiChar === 'ੌ')) {
            // If vowel starts word, use vowel bearer
            if (punjabiChar === 'ਾ') result += 'ਆ';
            else if (punjabiChar === 'ਿ' || punjabiChar === 'ੀ') result += 'ਈ';
            else if (punjabiChar === 'ੁ' || punjabiChar === 'ੂ') result += 'ਊ';
            else if (punjabiChar === 'ੇ' || punjabiChar === 'ੈ') result += 'ਐ';
            else if (punjabiChar === 'ੋ' || punjabiChar === 'ੌ') result += 'ਓ';
          } else {
            result += punjabiChar;
          }
          remaining = remaining.slice(m[0].length);
          matched = true;
          isStart = false;
          break;
        }
      }
      if (!matched) {
        remaining = remaining.slice(1);
        isStart = false;
      }
    }

    return result || word;
  });

  return translatedWords.join(' ');
}

/**
 * Common App UI Label Translations & Utilities
 */
import { AppLanguage } from '../types/mandi';

export const UI_STRINGS = {
  appName: {
    en: 'Punjab Mandi Software',
    pa: 'ਪੰਜਾਬ ਮੰਡੀ ਸਾਫਟਵੇਅਰ'
  },
  fixedBagWeight: {
    en: 'Fixed 37.50 KG',
    pa: 'ਨਿਰਧਾਰਿਤ ੩੭.੫੦ ਕਿਲੋ'
  },
  fixedRate: {
    en: '₹2,461 / Qul',
    pa: '₹੨,੪੬੧ / ਕੁਇੰਟਲ'
  },
  oldBag: {
    en: 'Old Juth',
    pa: 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ'
  },
  newBag: {
    en: 'New Juth',
    pa: 'ਨਵਾਂ ਬਾਰਦਾਨਾ'
  },
  alreadyRegistered: {
    en: 'Farmer Already Registered',
    pa: 'ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਦਰਜ ਹੈ'
  }
};

/**
 * Common Gurmukhi words and phrases mapped to English
 */
export const GURMUKHI_TO_ENGLISH: Record<string, string> = {
  // Navigation & Modules
  'ਡੈਸ਼ਬੋਰਡ': 'Dashboard',
  'ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ': 'Farmer Registration',
  'ਮਲਟੀ ਕਿਸਾਨ ਰਜਿਸਟਰ': 'Multi Farmer Register',
  'ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤ': 'Bardana Received',
  'ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ': 'Bardana Management',
  'ਬੋਰੀਆਂ ਤੁਲਾਈ ਐਂਟਰੀ': 'Bags Weighing Entry',
  'ਇੱਕੋ ਮਿਤੀ ਮਲਟੀ ਬੋਰੀਆਂ': 'Same Date Multi Bag Entry',
  'ਰੋਜ਼ਾਨਾ ਖਰੀਦ': 'Daily Purchase',
  'ਕਿਸਾਨ ਖਾਤਾ': 'Farmer Account',
  'ਲਿਫਟਿੰਗ ਪ੍ਰਬੰਧਨ': 'Lefting Management',
  'ਸਟਾਕ ਬੈਲੇਂਸ ਚਾਰਟ': 'Stock Balance Chart',
  'ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ': 'Bank Account Details',
  'ਕਿਸਾਨ ਖੋਜ': 'Search Farmer',
  'ਰਿਪੋਰਟਾਂ ਤੇ ਰਜਿਸਟਰ': 'Reports & Registers',
  'ਰੀਸਾਈਕਲ ਬਿਨ': 'Recycle Bin',
  'ਸੈਟਿੰਗਜ਼ ਤੇ ਏਜੰਸੀਆਂ': 'Settings & Agencies',
  'ਸੈਟਿੰਗਜ਼': 'Settings',
  'ਮੰਡੀ ਮੌਡਿਊਲ': 'Mandi Modules',
  'ਸੈਲਰ ਮਾਸਟਰ': 'Seller Master',
  'ਟਰੱਕ ਮਾਸਟਰ': 'Truck Master',

  // Common Fields & Labels
  'ਕਿਸਾਨ': 'Farmer',
  'ਕਿਸਾਨ ਦਾ ਨਾਂ': 'Farmer Name',
  'ਕਿਸਾਨ ਦਾ ਨਾਮ': 'Farmer Name',
  'ਕਿਸਾਨ ਆਈ.ਡੀ': 'Farmer ID',
  'ਪਿਤਾ ਦਾ ਨਾਂ': 'Father Name',
  'ਪਿਤਾ ਦਾ ਨਾਮ': 'Father Name',
  'ਪਿੰਡ': 'Village',
  'ਪਿੰਨ ਕੋਡ': 'PIN Code',
  'ਮੋਬਾਈਲ': 'Mobile',
  'ਮੋਬਾਈਲ ਨੰਬਰ': 'Mobile Number',
  'ਆਧਾਰ': 'Aadhaar',
  'ਆਧਾਰ ਨੰਬਰ': 'Aadhaar Number',
  'ਆਧਾਰ ਕਾਰਡ': 'Aadhaar Card',
  'ਪਤਾ': 'Address',
  'ਪੂਰਾ ਪਤਾ': 'Complete Address',
  'ਫੋਟੋ': 'Photo',
  'ਬੈਂਕ ਦਾ ਨਾਂ': 'Bank Name',
  'ਖਾਤਾ ਨੰਬਰ': 'Account Number',
  'ਖਾਤਾ ਧਾਰਕ': 'Account Holder',
  'ਸ਼ਾਖਾ': 'Branch',
  'ਮਿਤੀ': 'Date',
  'ਬੋਰੀਆਂ': 'Bags',
  'ਬੋਰੀ': 'Bag',
  'ਨਵਾਂ ਬਾਰਦਾਨਾ': 'New Juths',
  'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ': 'Old Juths',
  'ਕੁੱਲ ਬੋਰੀਆਂ': 'Total Bags',
  'ਨਵਾਂ': 'New',
  'ਪੁਰਾਣਾ': 'Old',
  'ਵਜ਼ਨ': 'Weight',
  'ਕੁੱਲ ਵਜ਼ਨ': 'Total Weight',
  'ਕੁਇੰਟਲ': 'Quintal',
  'ਰੇਟ': 'Rate',
  'ਰਕਮ': 'Amount',
  'ਕੁੱਲ ਰਕਮ': 'Total Amount',
  'ਗ੍ਰਾਸ ਰਕਮ': 'Gross Amount',
  'ਮਜ਼ਦੂਰੀ': 'Labour',
  'ਕੁੱਲ ਮਜ਼ਦੂਰੀ': 'Total Labour',
  'ਸ਼ੁੱਧ ਰਕਮ': 'Net Amount',
  'ਖਰੀਦ ਕੁਇੰਟਲ': 'Purchase (Qtl)',
  'ਮੰਡੀ ਆਮਦ': 'Mandi Arrival',
  'ਬਾਕੀ ਸਟਾਕ': 'Remaining Stock',
  'ਖਰੀਦ ਏਜੰਸੀ': 'Procurement Agency',
  'ਏਜੰਸੀ': 'Agency',
  'ਸੈਲਰ': 'Seller',
  'ਸ਼ੈਲਰ': 'Sheller',
  'ਟਰੱਕ': 'Truck',
  'ਟਰੱਕ ਨੰਬਰ': 'Truck Number',
  'ਡਰਾਈਵਰ': 'Driver',
  'ਡਰਾਈਵਰ ਦਾ ਨਾਮ': 'Driver Name',
  'ਪਰਚੀ': 'Parchi',
  'ਪਰਚੀ ਨੰਬਰ': 'Parchi No',
  'ਗੇਟ ਪਾਸ': 'Gate Pass',
  'ਟਿੱਪਣੀ': 'Remarks',
  'ਸਥਿਤੀ': 'Status',
  'ਰਵਾਨਾ': 'Dispatched',
  'ਪਹੁੰਚ ਗਿਆ': 'Delivered',
  'ਸ਼ਾਰਟੇਜ': 'Shortage',
  'ਕਲਾਊਡ': 'Cloud',
  'ਕੁੱਲ': 'Total',
  'ਕੁੱਲ ਕਿਸਾਨ': 'Total Farmers',
  'ਗ੍ਰੈਂਡ ਕੁੱਲ': 'Grand Total',
  'ਪੱਕੀ ਲੇਬਰ': 'Pakki Labour',
  'ਡਬਲ ਲੇਬਰ': 'Double Labour',
  'ਸੁੱਕੀ ਲੇਬਰ': 'Sukki Labour',
  'ਪੇਸ਼ਗੀ': 'Advance',
  'ਵਿਆਜ': 'Interest',
  'ਅੰਤਿਮ ਹਿਸਾਬ': 'Final Settlement',
  'ਕਟੌਤੀਆਂ': 'Deductions',
  'ਸੇਵ ਕਰੋ': 'Save',
  'ਰੱਦ ਕਰੋ': 'Cancel',
  'ਮਿਟਾਓ': 'Delete',
  'ਅੱਪਡੇਟ ਕਰੋ': 'Update',
  'ਖੋਜ ਕਰੋ': 'Search',
  'ਪ੍ਰਿੰਟ ਕਰੋ': 'Print',
  'ਡਾਊਨਲੋਡ': 'Download',
  'ਵਾਪਸ': 'Back',
  'ਬੰਦ ਕਰੋ': 'Close',
  'ਕੋਈ ਫੋਟੋ ਨਹੀਂ': 'No Photo',
  'ਸੇਵ ਹੋ ਗਿਆ': 'Saved Successfully',
  'ਗਲਤੀ': 'Error',
  'ਚੇਤਾਵਨੀ': 'Warning',
  'ਸੂਚਨਾ': 'Information'
};

/**
 * Returns English when language === 'en', Punjabi when language === 'pa'.
 */
export function trans(en: string, pa: string, language: AppLanguage): string {
  return language === 'en' ? en : pa;
}

/**
 * Helper to get bilingual text dynamically
 */
export function t(en: string, pa: string, language: AppLanguage): string {
  return language === 'en' ? en : pa;
}

/**
 * Cleans a bilingual text or converts Gurmukhi to English when language === 'en'.
 * Examples:
 * - "ਰੋਜ਼ਾਨਾ ਖਰੀਦ (Daily Purchase)" -> "Daily Purchase" (in EN), "ਰੋਜ਼ਾਨਾ ਖਰੀਦ" (in PA)
 * - "ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name):" -> "Farmer Name:" (in EN), "ਕਿਸਾਨ ਦਾ ਨਾਂ:" (in PA)
 * - "ਪੱਕੀ ਲੇਬਰ / Pakki Labour" -> "Pakki Labour" (in EN), "ਪੱਕੀ ਲੇਬਰ" (in PA)
 * - "ਖਰੀਦ ਸੇਵ ਕਰੋ (Save Purchases)" -> "Save Purchases" (in EN), "ਖਰੀਦ ਸੇਵ ਕਰੋ" (in PA)
 */
export function cleanBilingualText(text: string, language: AppLanguage): string {
  if (!text || typeof text !== 'string') return '';

  const trimmed = text.trim();

  // If in English mode
  if (language === 'en') {
    // 1. Check exact dictionary
    if (GURMUKHI_TO_ENGLISH[trimmed]) {
      return GURMUKHI_TO_ENGLISH[trimmed];
    }

    // 2. Pattern: "Punjabi (English)" or "Punjabi (English - Notes)"
    const parenMatch = trimmed.match(/^([^(]+)\s*\(([^)]+)\)\s*(:?)$/);
    if (parenMatch) {
      const enContent = parenMatch[2].trim();
      const colon = parenMatch[3] || '';
      // If inside parens is mostly English/digits
      if (/[A-Za-z]/.test(enContent)) {
        return enContent + colon;
      }
    }

    // 3. Pattern: "Punjabi / English"
    if (trimmed.includes(' / ')) {
      const parts = trimmed.split(' / ');
      const enPart = parts.find((p) => /[A-Za-z]/.test(p));
      if (enPart) return enPart.trim();
    }

    // 4. Pattern: "English / Punjabi"
    if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ');
      const enPart = parts.find((p) => /[A-Za-z]/.test(p));
      if (enPart) return enPart.trim();
    }

    // 5. If it contains Gurmukhi characters (Unicode \u0A00-\u0A7F)
    const hasGurmukhi = /[\u0A00-\u0A7F]/.test(trimmed);
    if (hasGurmukhi) {
      // Check if there are English words in the text
      const englishWords = trimmed.replace(/[\u0A00-\u0A7F]/g, '').trim();
      // Clean remaining brackets or slashes
      const cleaned = englishWords.replace(/[()\/•|-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 1 && /[A-Za-z]/.test(cleaned)) {
        return cleaned;
      }

      // Check dictionary for word by word
      let translated = trimmed;
      for (const [pa, en] of Object.entries(GURMUKHI_TO_ENGLISH)) {
        if (translated.includes(pa)) {
          translated = translated.split(pa).join(en);
        }
      }
      // If still has Gurmukhi, remove or replace common symbols
      if (/[\u0A00-\u0A7F]/.test(translated)) {
        translated = translated.replace(/[\u0A00-\u0A7F]/g, '').trim();
      }
      return translated || trimmed;
    }

    return trimmed;
  }

  // If in Punjabi mode ('pa')
  // If it has "Punjabi (English)" -> keep Punjabi or full bilingual
  return trimmed;
}

/**
 * Removes any Gurmukhi characters from a string for pure English PDF/labels
 */
export function stripGurmukhi(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u0A00-\u0A7F]/g, '')
    .replace(/\s*\(\s*\)/g, '')
    .replace(/\s*\/\s*$/, '')
    .replace(/^\s*\/\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Universal cleaner for jsPDF rendering:
 * 1. Strips or translates Gurmukhi characters
 * 2. Replaces currency symbols like ₹ with Rs.
 * 3. Replaces non-ASCII punctuation (em-dash, ellipsis, bullets, curly quotes)
 * 4. Extracts clean English from bilingual labels
 * 5. Guarantees 100% clean ASCII text without garbled or broken glyphs
 */
export function cleanPdfText(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  let str = String(text);

  // Currency replacement
  str = str.replace(/₹/g, 'Rs. ');

  // Standardise special punctuation
  str = str.replace(/[\u2014\u2013\u2015]/g, ' - '); // em-dash, en-dash
  str = str.replace(/[\u2026]/g, '...');              // ellipsis
  str = str.replace(/[\u2022\u00B7\u25CF]/g, ' | ');  // bullets
  str = str.replace(/[\u2018\u2019`]/g, "'");         // single quotes
  str = str.replace(/[\u201C\u201D]/g, '"');         // double quotes
  str = str.replace(/\u00A0/g, ' ');                 // non-breaking space

  // Common bilingual patterns like "ਗਰੁੱਪ (Group)" or "ਕਿਸਾਨ (Farmer)" -> extract English
  const parenMatch = str.match(/^([^(]+)\s*\(([^)]+)\)\s*(:?)$/);
  if (parenMatch) {
    const p1 = parenMatch[1].trim();
    const p2 = parenMatch[2].trim();
    const colon = parenMatch[3] || '';
    if (/^[A-Za-z0-9\s.,\-_/:#]+$/.test(p1) && /[\u0A00-\u0A7F]/.test(p2)) {
      str = p1 + colon;
    } else if (/[\u0A00-\u0A7F]/.test(p1) && /[A-Za-z0-9]/.test(p2)) {
      str = p2 + colon;
    }
  }

  // Bilingual patterns with slash: "English / Punjabi" or "Punjabi / English"
  if (str.includes('/')) {
    const parts = str.split('/');
    const enParts = parts.map(p => p.trim()).filter(p => /^[A-Za-z0-9\s.,\-_():#]+$/.test(p) && /[A-Za-z0-9]/.test(p));
    if (enParts.length > 0 && enParts.length < parts.length) {
      str = enParts.join(' / ');
    }
  }

  // If Gurmukhi characters are present, check dictionary and strip remainder
  if (/[\u0A00-\u0A7F]/.test(str)) {
    for (const [pa, en] of Object.entries(GURMUKHI_TO_ENGLISH)) {
      if (str.includes(pa)) {
        str = str.split(pa).join(en);
      }
    }
    str = str.replace(/[\u0A00-\u0A7F]/g, '');
  }

  // Clean empty parens or brackets
  str = str.replace(/\s*\(\s*\)/g, '');
  str = str.replace(/\s*\[\s*\]/g, '');
  str = str.replace(/\s*\/\s*$/, '');
  str = str.replace(/^\s*\/\s*/, '');
  str = str.replace(/\s*-\s*$/, '');
  str = str.replace(/^\s*-\s*/, '');

  // Strip non-ASCII characters
  str = str.replace(/[^\x20-\x7E\r\n\t]/g, '');

  // Normalise multiple spaces
  str = str.replace(/\s{2,}/g, ' ').trim();

  return str;
}

