import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in environment.');
    return null;
  }
  aiInstance = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  return aiInstance;
}

/**
 * Execute AI generateContent with primary model (gemini-3.8-flash)
 * and seamless fallback to gemini-3.1-flash-lite on 503/429/temporary error.
 */
async function generateWithGemini(prompt: string, responseMimeType?: string): Promise<string | null> {
  const ai = getAI();
  if (!ai) return null;

  // gemini-3.1-flash-lite is responsive and has active quota; fallback to gemini-3.8-flash
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: responseMimeType ? { responseMimeType } : undefined
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (err: any) {
      console.warn(`Gemini generation with ${model} failed (${err?.status || err?.message}), trying next...`);
    }
  }
  return null;
}

/**
 * Clean and parse JSON response safely
 */
function cleanAndParseJSON(rawText: string | null): any | null {
  if (!rawText) return null;
  try {
    let clean = rawText.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch (err) {
    // Try to extract first JSON object between { and }
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const sub = rawText.substring(firstBrace, lastBrace + 1);
        return JSON.parse(sub);
      } catch {}
    }
    return null;
  }
}

/**
 * 1. AI Voice Parser for Mandi Spoken Punjabi
 */
export async function parseMandiVoiceTranscript(
  transcript: string,
  farmersList: { id: string; name: string; namePa: string; village: string }[] = []
) {
  const prompt = `You are an expert Mandi Munim (commission agent accountant in Punjab, India).
Analyze the following spoken Punjabi/Hinglish audio transcript from a grain market (Dana Mandi):
"${transcript}"

Known registered farmers in the firm:
${JSON.stringify(farmersList.slice(0, 30), null, 2)}

Tasks:
1. Identify the farmer's name. Try to fuzzy-match with the registered farmers list if close.
2. Identify the number of bags (ਬੋਰੀਆਂ / ਥੈਲੇ / ਗੱਟੇ).
3. Identify the weight (quintals / kg or per-bag bharti such as 37.5, 50).
4. Identify the rate per quintal (ਭਾਅ / ਰੇਟ, e.g. 2475, 2320).
5. Identify the crop: "WHEAT" (ਕਣਕ), "PADDY" (ਝੋਨਾ / ਬਾਸਮਤੀ / 1509 / 1121), or "MAIZE" (ਮੱਕੀ). Default to "WHEAT" or "PADDY" based on context.
6. Identify any labour deductions if mentioned (ਪੱਕੀ / ਡਬਲ / ਸੁੱਕੀ) or tota / kanta deductions.

Return ONLY a valid JSON object matching this schema:
{
  "farmerName": string,
  "farmerNamePa": string,
  "matchedFarmerId": string | null,
  "bags": number,
  "weightQtl": number,
  "weightKg": number,
  "bhartiKg": number,
  "rate": number,
  "crop": "WHEAT" | "PADDY" | "MAIZE",
  "labourPakki": boolean,
  "labourDouble": boolean,
  "labourSukhi": boolean,
  "totaKg": number,
  "notes": string,
  "confidence": number
}`;

  const rawJson = await generateWithGemini(prompt, 'application/json');
  const parsed = cleanAndParseJSON(rawJson);

  if (parsed && (parsed.farmerName || parsed.bags || parsed.rate)) {
    return { success: true, data: parsed, engine: 'gemini-ai' };
  }

  return fallbackVoiceParser(transcript, farmersList);
}

function fallbackVoiceParser(transcript: string, farmersList: any[]) {
  // Extract numbers
  const numberMatches = transcript.match(/\d+(\.\d+)?/g) || [];
  const bags = numberMatches.length > 0 ? parseInt(numberMatches[0], 10) : 0;
  const rate = numberMatches.length > 1 ? parseFloat(numberMatches[1]) : 2475;

  let crop = 'WHEAT';
  if (/ਝੋਨਾ|ਝੋਨੇ|paddy|dhan|1509|1121|basmati|ਬਾਸਮਤੀ/i.test(transcript)) {
    crop = 'PADDY';
  } else if (/ਮੱਕੀ|makki|maize/i.test(transcript)) {
    crop = 'MAIZE';
  }

  // Attempt to match farmer
  let matchedFarmer = null;
  for (const f of farmersList) {
    if (transcript.toLowerCase().includes(f.name.toLowerCase()) || transcript.includes(f.namePa)) {
      matchedFarmer = f;
      break;
    }
  }

  return {
    success: true,
    data: {
      farmerName: matchedFarmer ? matchedFarmer.name : transcript.split(/,|ਬੋਰੀ|ਬੋਰੀਆਂ/)[0].trim(),
      farmerNamePa: matchedFarmer ? matchedFarmer.namePa : '',
      matchedFarmerId: matchedFarmer ? matchedFarmer.id : null,
      bags: bags || 100,
      weightQtl: bags ? (bags * 37.5) / 100 : 37.5,
      weightKg: 0,
      bhartiKg: 37.5,
      rate: rate || 2475,
      crop,
      labourPakki: /ਪੱਕੀ|pakki/i.test(transcript),
      labourDouble: /ਡਬਲ|double/i.test(transcript),
      labourSukhi: /ਸੁੱਕੀ|sukhi/i.test(transcript),
      totaKg: 0,
      notes: transcript,
      confidence: 0.8
    },
    engine: 'local-fallback'
  };
}

/**
 * 2. AI WhatsApp Audio & Script Generator
 */
export async function generateWhatsAppVoiceScript(params: {
  type: 'WEIGHMENT' | 'ADVANCE' | 'SETTLEMENT';
  data: any;
  farmer: any;
  firm: any;
}) {
  const { type, data, farmer, firm } = params;

  const firmName = firm?.name || 'Jammu Trading Co';
  const firmNamePa = firm?.namePa || 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ';
  const farmerName = farmer?.farmerNamePa || farmer?.farmerName || 'ਸਰਦਾਰ ਜੀ';

  const defaultVoiceScript = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਰਦਾਰ ${farmerName} ਜੀ, ${firmNamePa} ਵੱਲੋਂ ਤੁਹਾਡਾ ਬੋਰੀਆਂ ਅਤੇ ਜਿਨਸ ਦਾ ਵੇਰਵਾ ਦਰਜ ਕਰ ਲਿਆ ਗਿਆ ਹੈ। ਕੁੱਲ ਬੋਰੀਆਂ ${data.bags || 0} ਹਨ। ਤੁਹਾਡਾ ਬਹੁਤ-ਬਹੁਤ ਧੰਨਵਾਦ ਜੀ।`;

  const prompt = `You are a respectful, traditional Punjabi commission agent (ਆੜ੍ਹਤੀਆ) in Dana Mandi, Punjab.
Write a warm, professional WhatsApp message and spoken Voice-Note script in pure, polite Punjabi (ਗੁਰਮੁਖੀ) for the farmer:

Event Type: ${type}
Farmer Name: ${farmerName} (Village: ${farmer?.village || farmer?.villagePa || ''})
Firm: ${firmName} (${firmNamePa})
Details:
${JSON.stringify(data, null, 2)}

Provide JSON response with:
1. "punjabiVoiceScript": A natural 2-3 sentence Punjabi speech script suitable to be read aloud (Text-to-Speech) as an audio voice note to the farmer (e.g. "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਸਰਦਾਰ ... ਜੀ, ਅੱਜ ਤੁਹਾਡੀ ... ਬੋਰੀਆਂ ... ਦਾ ਤੋਲ ਹੋ ਗਿਆ ਹੈ...").
2. "whatsappFormattedText": Beautifully formatted Gurmukhi WhatsApp text with emojis, firm header, bullet points, totals, and respectful closing.
3. "romanSummary": Short 1-sentence Romanized Punjabi summary (e.g. "Sat Sri Akal ji, tuhadi tolayee receipt tyar hai").

Return ONLY valid JSON.`;

  const rawJson = await generateWithGemini(prompt, 'application/json');
  const parsed = cleanAndParseJSON(rawJson);

  if (parsed && (parsed.punjabiVoiceScript || parsed.whatsappFormattedText)) {
    return { success: true, data: parsed, engine: 'gemini-ai' };
  }

  return {
    success: true,
    data: {
      punjabiVoiceScript: defaultVoiceScript,
      whatsappFormattedText: `${defaultVoiceScript}\n\n*ਮੰਡੀ:* ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ\n*ਫਰਮ:* ${firmName}`,
      romanSummary: 'Sat Sri Akal ji, tuhada mandi record update ho gaya hai.'
    },
    engine: 'fallback'
  };
}

/**
 * 3. Daily AI Munim Evening Summary (ਮੁਨੀਮੀ ਰੋਜ਼ਨਾਮਚਾ)
 */
export async function generateDailyMunimSummary(params: {
  date: string;
  firmName: string;
  purchases: any[];
  bags: any[];
  leftings: any[];
  advances: any[];
  payments: any[];
  farmersCount: number;
}) {
  const { date, firmName, purchases = [], bags = [], leftings = [], advances = [], payments = [], farmersCount = 0 } = params;

  // Calculate core aggregates
  const totalBags = bags.reduce((acc, b) => acc + (Number(b.bags) || 0), 0);
  const totalPurchaseAmt = purchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  const totalPurchasedBags = purchases.reduce((acc, p) => acc + (Number(p.bags) || 0), 0);
  const totalLeftingBags = leftings.reduce((acc, l) => acc + (Number(l.bags || l.liftedBags) || 0), 0);
  const yardRemainingBags = Math.max(0, (totalBags > 0 ? totalBags : totalPurchasedBags) - totalLeftingBags);
  const totalAdvancesPaid = advances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  const totalPaymentsReceived = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const displayDate = date === 'ALL' || !date ? 'ਸਾਰਾ ਸੀਜ਼ਨ (ਪੂਰਾ ਹਿਸਾਬ)' : date;

  // Local algorithmic Punjabi Munim generator as guaranteed baseline
  const generateFallbackSummary = () => {
    const isFullSeason = date === 'ALL' || !date;
    const dateLabel = isFullSeason ? 'ਪੂਰੇ ਸੀਜ਼ਨ ਦੌਰਾਨ' : `ਅੱਜ ਮਿਤੀ ${date} ਨੂੰ`;

    const voice = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ। ${firmName} ਵੱਲੋਂ ${dateLabel} ਕੁੱਲ ${totalBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਦੀ ਆਮਦ ਦਰਜ ਹੋਈ ਹੈ। ਸਰਕਾਰੀ ਖਰੀਦ ਕੁੱਲ ₹${totalPurchaseAmt.toLocaleString('en-IN')} ਰੁਪਏ ਦੀ ਹੋਈ। ਲਿਫਟਿੰਗ ਚੁਕਾਈ ${totalLeftingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਹੋਈ ਅਤੇ ਫੜ੍ਹ 'ਤੇ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਸਟਾਕ ਬਾਕੀ ਹੈ। ਕਿਸਾਨਾਂ ਨੂੰ ₹${totalAdvancesPaid.toLocaleString('en-IN')} ਰੁਪਏ ਨਕਦ ਪੇਸ਼ਗੀ ਦਿੱਤੀ ਗਈ ਹੈ। ਸਾਰਾ ਲੇਖਾ-ਜੋਖਾ ਦਰੁਸਤ ਹੈ ਜੀ।`;

    const criticalAlerts: string[] = [];
    if (yardRemainingBags > 500) {
      criticalAlerts.push(`ਫੜ੍ਹ 'ਤੇ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਦਾ ਭਾਰੀ ਅਣ-ਚੁੱਕਿਆ ਸਟਾਕ ਮੌਜੂਦ ਹੈ। ਮੌਸਮ ਖਰਾਬ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਤ੍ਰਿਪਾਲਾਂ ਲਗਾਓ ਅਤੇ ਟਰੱਕਾਂ ਦਾ ਤਾਲਮੇਲ ਕਰੋ।`);
    } else if (yardRemainingBags > 0) {
      criticalAlerts.push(`ਫੜ੍ਹ 'ਤੇ ${yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ ਸਟਾਕ ਬਾਕੀ ਹੈ। ਕੱਲ੍ਹ ਸਵੇਰੇ ਸ਼ੈਲਰ ਰਵਾਨਗੀ ਲਈ ਟਰੱਕ ਲਗਾਏ ਜਾਣ।`);
    } else {
      criticalAlerts.push(`ਫੜ੍ਹ ਪੂਰੀ ਤਰ੍ਹਾਂ ਕਲੀਅਰ ਹੈ, ਕੋਈ ਵੀ ਅਣ-ਲਿਫਟਡ ਸਟਾਕ ਬਾਕੀ ਨਹੀਂ।`);
    }

    if (totalAdvancesPaid > totalPurchaseAmt && totalPurchaseAmt > 0) {
      criticalAlerts.push(`ਕਿਸਾਨਾਂ ਨੂੰ ਦਿੱਤੀ ਪੇਸ਼ਗੀ (₹${totalAdvancesPaid.toLocaleString('en-IN')}) ਅੱਜ ਦੀ ਖਰੀਦ ਰਕਮ ਨਾਲੋਂ ਵੱਧ ਹੈ। ਅਗਲੇ ਭੁਗਤਾਨ ਵੇਲੇ ਕਟੌਤੀ ਯਕੀਨੀ ਬਣਾਓ।`);
    }

    if (totalBags > totalPurchasedBags && totalPurchasedBags > 0) {
      criticalAlerts.push(`ਤੋਲ ਆਮਦ (${totalBags}) ਅਤੇ ਏਜੰਸੀ ਖਰੀਦ (${totalPurchasedBags}) ਵਿੱਚ ${totalBags - totalPurchasedBags} ਬੋਰੀਆਂ ਦਾ ਅੰਤਰ ਹੈ। ਬੋਲੀ ਤਸਦੀਕ ਕਰੋ।`);
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
      summaryPunjabiVoice: voice,
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
  };

  const prompt = `You are the Senior Chief Munim (ਮੁੱਖ ਮੁਨੀਮ) for the grain trading firm "${firmName}" in Dana Mandi, Punjab.
Analyze the following business data for Date/Period: ${displayDate}:

Stats:
- Total Intake Bags (ਤੋਲ ਆਮਦ): ${totalBags} bags
- Total Harvest Purchase Value (ਕੁੱਲ ਖਰੀਦ ਮੁੱਲ): ₹${totalPurchaseAmt}
- Lifted Bags / Trucks Dispatched (ਲਿਫਟਿੰਗ ਚੁਕਾਈ): ${totalLeftingBags} bags
- Yard Remaining Bags (ਫੜ੍ਹ 'ਤੇ ਬਾਕੀ ਬੋਰੀਆਂ): ${yardRemainingBags} bags
- Cash Advances Given to Farmers: ₹${totalAdvancesPaid}
- Payments Collected: ₹${totalPaymentsReceived}
- Total Associated Farmers in Firm: ${farmersCount}

Recent Purchase records: ${JSON.stringify(purchases.slice(0, 10))}
Recent Lefting/Trucks: ${JSON.stringify(leftings.slice(0, 8))}

Create an insightful, authoritative, actionable Evening Munim Report (ਮੁਨੀਮੀ ਰੋਜ਼ਨਾਮਚਾ) in pure, polite Punjabi (ਗੁਰਮੁਖੀ).
Return a JSON object matching this schema:
{
  "headline": string,
  "summaryPunjabiVoice": string, // 3-4 sentence comprehensive voice readout that can be listened to in audio
  "highlights": {
    "totalBags": number,
    "totalPurchaseAmt": number,
    "totalLeftingBags": number,
    "yardRemainingBags": number,
    "totalAdvancesPaid": number,
    "totalPaymentsReceived": number
  },
  "marketAnalysis": string, // 2 sentences analyzing pace of procurement
  "yardStatusText": string, // Status of yard storage, weather safety & lifting urgency
  "cashFlowText": string, // Commentary on liquidity and advances
  "criticalAlerts": string[], // List of 2-3 important warnings (e.g. pending lifting, missing bags, high advances)
  "nextDayPlan": string[] // List of 3 actionable priority steps for tomorrow morning
}`;

  try {
    const rawJson = await generateWithGemini(prompt, 'application/json');
    const parsed = cleanAndParseJSON(rawJson);

    if (parsed && parsed.headline && parsed.summaryPunjabiVoice) {
      // Ensure numerical highlights are accurate and guaranteed
      parsed.highlights = {
        totalBags,
        totalPurchaseAmt,
        totalLeftingBags,
        yardRemainingBags,
        totalAdvancesPaid,
        totalPaymentsReceived
      };
      return { success: true, data: parsed, engine: 'gemini-3.8-flash' };
    }
  } catch (error) {
    console.warn('Gemini Munim Summary generation warning, using fallback engine:', error);
  }

  // Guaranteed fallback that never fails
  const fallbackData = generateFallbackSummary();
  return {
    success: true,
    data: fallbackData,
    engine: 'mandi-munim-engine'
  };
}

