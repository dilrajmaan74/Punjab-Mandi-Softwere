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
 * Common App UI Label Translations
 */
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
    en: 'Old Bag',
    pa: 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ'
  },
  newBag: {
    en: 'New Bag',
    pa: 'ਨਵਾਂ ਬਾਰਦਾਨਾ'
  },
  alreadyRegistered: {
    en: 'Farmer Already Registered',
    pa: 'ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਦਰਜ ਹੈ'
  }
};
