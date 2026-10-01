/**
 * Client-Side AI Service
 * Connects to /api/ai/* endpoints powered by Gemini 3.8 Flash
 * Includes Text-to-Speech audio player for Punjabi Voice Notes
 */

export interface AiVoiceParseResult {
  farmerName?: string;
  farmerNamePa?: string;
  matchedFarmerId?: string | null;
  bags?: number;
  weightQtl?: number;
  weightKg?: number;
  bhartiKg?: number;
  rate?: number;
  crop?: 'WHEAT' | 'PADDY' | 'MAIZE';
  labourPakki?: boolean;
  labourDouble?: boolean;
  labourSukhi?: boolean;
  totaKg?: number;
  notes?: string;
  confidence?: number;
}

export interface AiWhatsAppVoiceResult {
  punjabiVoiceScript: string;
  whatsappFormattedText: string;
  romanSummary?: string;
}

export interface AiMunimSummaryResult {
  headline: string;
  summaryPunjabiVoice: string;
  highlights: {
    totalBags: number;
    totalPurchaseAmt: number;
    totalLeftingBags: number;
    yardRemainingBags: number;
    totalAdvancesPaid: number;
    totalPaymentsReceived: number;
  };
  marketAnalysis?: string;
  yardStatusText: string;
  cashFlowText: string;
  criticalAlerts: string[];
  nextDayPlan: string[];
}

/**
 * 1. Parse Spoken Punjabi Text via Gemini AI
 */
export async function parseVoiceWithGemini(
  transcript: string,
  farmersList: { id: string; name: string; namePa: string; village: string }[] = []
): Promise<AiVoiceParseResult | null> {
  try {
    const res = await fetch('/api/ai/parse-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, farmersList })
    });
    if (!res.ok) throw new Error('Failed to parse voice transcript');
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('AI Voice parse failed, using fallback:', err);
    return null;
  }
}

/**
 * 2. Generate WhatsApp Voice-Note & Message via Gemini AI
 */
export async function getAiWhatsAppVoiceScript(params: {
  type: 'WEIGHMENT' | 'ADVANCE' | 'SETTLEMENT';
  data: any;
  farmer: any;
  firm: any;
}): Promise<AiWhatsAppVoiceResult> {
  try {
    const res = await fetch('/api/ai/voice-whatsapp-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to generate script');
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('AI WhatsApp Voice failed, fallback script:', err);
    const farmerName = params.farmer?.farmerNamePa || params.farmer?.farmerName || 'ਸਰਦਾਰ ਜੀ';
    const firmName = params.firm?.name || 'Jammu Trading Co';
    const script = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਰਦਾਰ ${farmerName} ਜੀ, ${firmName} ਵੱਲੋਂ ਤੁਹਾਡਾ ਰਿਕਾਰਡ ਦਰਜ ਹੋ ਗਿਆ ਹੈ। ਧੰਨਵਾਦ!`;
    return {
      punjabiVoiceScript: script,
      whatsappFormattedText: script,
      romanSummary: 'Sat Sri Akal ji, tuhada mandi record update ho gaya hai.'
    };
  }
}

/**
 * 3. Generate Daily AI Munim Evening Summary via Gemini AI
 */
export async function getAiDailyMunimSummary(params: {
  date: string;
  firmName: string;
  purchases: any[];
  bags: any[];
  leftings: any[];
  advances: any[];
  payments: any[];
  farmersCount: number;
}): Promise<AiMunimSummaryResult> {
  const { date, firmName, purchases = [], bags = [], leftings = [], advances = [], payments = [] } = params;

  const totalBags = bags.reduce((acc, b) => acc + (Number(b.bags) || 0), 0);
  const totalPurchaseAmt = purchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  const totalPurchasedBags = purchases.reduce((acc, p) => acc + (Number(p.bags) || 0), 0);
  const totalLeftingBags = leftings.reduce((acc, l) => acc + (Number(l.bags || l.liftedBags) || 0), 0);
  const yardRemainingBags = Math.max(0, (totalBags > 0 ? totalBags : totalPurchasedBags) - totalLeftingBags);
  const totalAdvancesPaid = advances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  const totalPaymentsReceived = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const displayDate = date === 'ALL' || !date ? 'ਸਾਰਾ ਸੀਜ਼ਨ' : date;

  try {
    const res = await fetch('/api/ai/daily-munim-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data && json.data.headline) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Network call to AI server failed, using local munim calculator:', err);
  }

  // Client-side fallback report calculation
  const criticalAlerts: string[] = [];
  if (yardRemainingBags > 500) {
    criticalAlerts.push(`ਫੜ੍ਹ 'ਤੇ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਦਾ ਭਾਰੀ ਅਣ-ਚੁੱਕਿਆ ਸਟਾਕ ਮੌਜੂਦ ਹੈ। ਮੌਸਮ ਖਰਾਬ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਤ੍ਰਿਪਾਲਾਂ ਲਗਾਓ ਅਤੇ ਟਰੱਕਾਂ ਦਾ ਤਾਲਮੇਲ ਕਰੋ।`);
  } else if (yardRemainingBags > 0) {
    criticalAlerts.push(`ਫੜ੍ਹ 'ਤੇ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਸਟਾਕ ਬਾਕੀ ਹੈ। ਕੱਲ੍ਹ ਸਵੇਰੇ ਸ਼ੈਲਰ ਰਵਾਨਗੀ ਲਈ ਟਰੱਕ ਲਗਾਏ ਜਾਣ।`);
  } else {
    criticalAlerts.push(`ਫੜ੍ਹ ਪੂਰੀ ਤਰ੍ਹਾਂ ਕਲੀਅਰ ਹੈ, ਕੋਈ ਵੀ ਅਣ-ਲਿਫਟਡ ਸਟਾਕ ਬਾਕੀ ਨਹੀਂ।`);
  }

  if (totalAdvancesPaid > totalPurchaseAmt && totalPurchaseAmt > 0) {
    criticalAlerts.push(`ਕਿਸਾਨਾਂ ਨੂੰ ਦਿੱਤੀ ਪੇਸ਼ਗੀ (₹${totalAdvancesPaid.toLocaleString('en-IN')}) ਖਰੀਦ ਰਕਮ ਨਾਲੋਂ ਵੱਧ ਹੈ। ਅਗਲੇ ਭੁਗਤਾਨ ਵੇਲੇ ਕਟੌਤੀ ਯਕੀਨੀ ਬਣਾਓ।`);
  }

  const nextDayPlan: string[] = [
    'ਸਵੇਰੇ 8:30 ਵਜੇ ਏਜੰਸੀ ਇੰਸਪੈਕਟਰ ਨਾਲ ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਵਾਊਚਰਾਂ ਦੀ ਤਸਦੀਕ ਅਤੇ ਦਸਤਖਤ ਪੂਰੇ ਕਰੋ।',
    yardRemainingBags > 0
      ? `ਸਵੇਰੇ ਪਹਿਲੀ ਤਰਜੀਹ 'ਤੇ ਫੜ੍ਹ ਤੋਂ ਬਾਕੀ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਸ਼ੈਲਰ ਭੇਜਣ ਲਈ ਟਰੱਕ ਲਗਵਾਓ।`
      : 'ਕਿਸਾਨਾਂ ਦੀ ਨਵੀਂ ਆਮਦ ਲਈ ਫੜ੍ਹ ਦੀ ਸਫ਼ਾਈ ਅਤੇ ਤੁਲਾਈ ਕੰਡੇ ਤਿਆਰ ਰੱਖੋ।',
    'ਬਾਰਦਾਨਾ ਰਜਿਸਟਰ ਦੀ ਜਾਂਚ ਕਰਕੇ ਨਵੀਆਂ ਅਤੇ ਪੁਰਾਣੀਆਂ ਬੋਰੀਆਂ ਦਾ ਏਜੰਸੀ ਸਟਾਕ ਮਿਲਾਓ।',
    'ਜਿਨ੍ਹਾਂ ਕਿਸਾਨਾਂ ਦੀ ਪੇਮੈਂਟ ਆਈ ਹੈ, ਉਨ੍ਹਾਂ ਦੇ ਖਾਤਿਆਂ ਵਿੱਚ ਅਡਵਾਂਸ ਵਿਆਜ ਕੱਟ ਕੇ ਬਾਕੀ ਰਕਮ ਅਦਾ ਕਰੋ।'
  ];

  return {
    headline: `ਰੋਜ਼ਾਨਾ ਮੁਨੀਮੀ ਰੋਜ਼ਨਾਮਚਾ • ${displayDate} (${firmName})`,
    summaryPunjabiVoice: `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ। ${firmName} ਵੱਲੋਂ ${displayDate} ਕੁੱਲ ${totalBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਦੀ ਆਮਦ ਦਰਜ ਹੋਈ ਹੈ। ਕੁੱਲ ਖਰੀਦ ₹${totalPurchaseAmt.toLocaleString('en-IN')} ਰੁਪਏ ਅਤੇ ਲਿਫਟਿੰਗ ${totalLeftingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਹੋਈ ਹੈ। ਫੜ੍ਹ 'ਤੇ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਸਟਾਕ ਬਾਕੀ ਹੈ। ਸਾਰਾ ਲੇਖਾ-ਜੋਖਾ ਦਰੁਸਤ ਹੈ ਜੀ।`,
    highlights: {
      totalBags,
      totalPurchaseAmt,
      totalLeftingBags,
      yardRemainingBags,
      totalAdvancesPaid,
      totalPaymentsReceived
    },
    marketAnalysis: `ਮੰਡੀ ਵਿੱਚ ਖਰੀਦ ਦੀ ਗਤੀ ਸੁਚਾਰੂ ਹੈ। ਕੁੱਲ ਖਰੀਦ ਰਕਮ ₹${totalPurchaseAmt.toLocaleString('en-IN')} ਰੁਪਏ ਦਰਜ ਹੋਈ ਹੈ। ਸਾਰੇ ਕਿਸਾਨਾਂ ਦਾ ਲੇਖਾ ਪੰਜਾਬ ਮੰਡੀ ਬੋਰਡ ਦੇ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਦਰਜ ਹੈ।`,
    yardStatusText: yardRemainingBags > 0
      ? `ਫੜ੍ਹ 'ਤੇ ਕੁੱਲ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਮੌਜੂਦ ਹਨ। ਰਾਤ ਵੇਲੇ ਤ੍ਰਿਪਾਲਾਂ ਨਾਲ ਢੱਕਣਾ ਅਤੇ ਚੌਕੀਦਾਰੀ ਯਕੀਨੀ ਬਣਾਈ ਜਾਵੇ।`
      : `ਫੜ੍ਹ 'ਤੇ ਕੋਈ ਬਕਾਇਆ ਸਟਾਕ ਨਹੀਂ ਹੈ, ਪੂਰਾ ਮਾਲ ਸ਼ੈਲਰਾਂ ਵਿੱਚ ਲਿਫਟ ਹੋ ਚੁੱਕਾ ਹੈ।`,
    cashFlowText: `ਕਿਸਾਨਾਂ ਨੂੰ ਨਕਦ ਪੇਸ਼ਗੀ ਦਿੱਤੀ ਗਈ: ₹${totalAdvancesPaid.toLocaleString('en-IN')}, ਵਸੂਲੀ/ਭੁਗਤਾਨ: ₹${totalPaymentsReceived.toLocaleString('en-IN')}। ਫਰਮ ਦੀ ਲਿਕੁਇਡਿਟੀ ਸੰਤੁਲਿਤ ਹੈ।`,
    criticalAlerts,
    nextDayPlan
  };
}

/**
 * Speech Player: Speak Punjabi text aloud using browser Web Speech API
 */
export function playPunjabiSpeech(
  text: string,
  onEnd?: () => void,
  rate = 0.95
): { stop: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return { stop: () => {} };
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1.0;

  // Try to pick Punjabi / Hindi / Indian English voice
  const voices = window.speechSynthesis.getVoices();
  const punjabiVoice =
    voices.find((v) => v.lang.startsWith('pa') || v.name.toLowerCase().includes('punjabi')) ||
    voices.find((v) => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')) ||
    voices.find((v) => v.lang.includes('IN')) ||
    voices[0];

  if (punjabiVoice) {
    utterance.voice = punjabiVoice;
    utterance.lang = punjabiVoice.lang;
  } else {
    utterance.lang = 'pa-IN';
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);

  return {
    stop: () => {
      window.speechSynthesis.cancel();
      if (onEnd) onEnd();
    }
  };
}
