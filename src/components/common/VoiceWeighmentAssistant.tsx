import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { Farmer } from '../../types/mandi';

export interface ParsedVoiceData {
  farmer?: Farmer;
  matchedFarmerName?: string;
  newBags?: number;
  oldBags?: number;
  totalBags?: number;
  doubleBags?: number;
  sukkiBags?: number;
  totaKg?: number;
  ratePerQtl?: number;
  crop?: string;
  rawTranscript: string;
}

interface VoiceWeighmentAssistantProps {
  onApplyData: (data: ParsedVoiceData) => void;
  defaultCrop?: string;
  compact?: boolean;
}

export const VoiceWeighmentAssistant: React.FC<VoiceWeighmentAssistantProps> = ({
  onApplyData,
  defaultCrop,
  compact = false
}) => {
  const { farmers, language } = useMandi();
  const isEn = language === 'en';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechLang, setSpeechLang] = useState<'pa-IN' | 'hi-IN' | 'en-IN'>('pa-IN');
  const [parsedData, setParsedData] = useState<ParsedVoiceData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMsg(null);
        setTranscript('');
        setParsedData(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        // Parse in real-time
        const parsed = parseSpokenMandiText(currentTranscript, farmers);
        setParsedData(parsed);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMsg(isEn ? 'Microphone permission denied.' : 'ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਆਗਿਆ ਨਹੀਂ ਮਿਲੀ (Permission Denied)');
        } else if (event.error === 'no-speech') {
          setErrorMsg(isEn ? 'No speech detected. Try again.' : 'ਕੋਈ ਆਵਾਜ਼ ਨਹੀਂ ਸੁਣੀ ਗਈ। ਦੁਬਾਰਾ ਬੋਲੋ।');
        } else {
          setErrorMsg(`Voice Error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [speechLang, farmers, isEn]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setErrorMsg(null);
      setTranscript('');
      setParsedData(null);
      try {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleApply = () => {
    if (parsedData) {
      onApplyData(parsedData);
      setParsedData(null);
      setTranscript('');
    }
  };

  if (!isSupported) {
    return null; // Gracefully hidden on unsupported browsers
  }

  return (
    <div className="bg-emerald-50/60 border border-emerald-300 rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-2.5 transition-all">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={toggleListening}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-white transition-all shadow-md cursor-pointer ${
                isListening
                  ? 'bg-rose-600 animate-pulse ring-4 ring-rose-300'
                  : 'bg-emerald-700 hover:bg-emerald-600 active:scale-95'
              }`}
              title={isListening ? 'ਰੋਕੋ (Stop)' : 'ਬੋਲ ਕੇ ਐਂਟਰੀ ਕਰੋ (Voice Typing)'}
            >
              {isListening ? <Mic className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
            </button>
            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {isEn ? 'Smart Voice Entry' : 'ਬੋਲ ਕੇ ਆਟੋਮੈਟਿਕ ਐਂਟਰੀ (Voice Entry)'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-300">
                ਪੰਜਾਬੀ / Voice
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              {isListening
                ? (isEn ? 'Listening... Speak farmer name & bags count' : 'ਸੁਣ ਰਿਹਾ ਹੈ... ਬੋਲੋ: ਜਿਵੇਂ "ਮਨਦੀਪ ਸਿੰਘ 120 ਬੋਰੀ ਨਵਾਂ ਬਾਰਦਾਨਾ"')
                : (isEn ? 'Click mic & speak: e.g. "Mandeep Singh 120 bags new bardana"' : 'ਮਾਈਕ ਦਬਾਓ ਤੇ ਬੋਲੋ: "ਮਨਦੀਪ ਸਿੰਘ 120 ਬੋਰੀ ਨਵਾਂ ਬਾਰਦਾਨਾ"')}
            </p>
          </div>
        </div>

        {/* Language selector for Voice */}
        <div className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg p-0.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setSpeechLang('pa-IN')}
            className={`px-2 py-0.5 rounded transition ${
              speechLang === 'pa-IN' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ਪੰਜਾਬੀ
          </button>
          <button
            type="button"
            onClick={() => setSpeechLang('hi-IN')}
            className={`px-2 py-0.5 rounded transition ${
              speechLang === 'hi-IN' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            हिंदी
          </button>
          <button
            type="button"
            onClick={() => setSpeechLang('en-IN')}
            className={`px-2 py-0.5 rounded transition ${
              speechLang === 'en-IN' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Transcript & Parsed Preview */}
      {transcript && (
        <div className="bg-white border border-emerald-300 rounded-lg p-2.5 space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">
                {isEn ? 'Heard Speech:' : 'ਸੁਣੀ ਗਈ ਆਵਾਜ਼ (Heard):'}
              </span>
              <p className="font-bold text-slate-900 italic">"{transcript}"</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTranscript('');
                setParsedData(null);
              }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Parsed Chips */}
          {parsedData && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {parsedData.farmer ? (
                  <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md border border-emerald-300 text-[11px] flex items-center gap-1">
                    ✓ ਕਿਸਾਨ: {parsedData.farmer.farmerNamePa || parsedData.farmer.farmerName} ({parsedData.farmer.village})
                  </span>
                ) : parsedData.matchedFarmerName ? (
                  <span className="bg-amber-100 text-amber-900 font-medium px-2 py-0.5 rounded-md border border-amber-300 text-[11px]">
                    ਨਾਮ: {parsedData.matchedFarmerName}
                  </span>
                ) : null}

                {parsedData.newBags !== undefined && parsedData.newBags > 0 && (
                  <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md border border-blue-300 text-[11px]">
                    ਨਵਾਂ ਬਾਰਦਾਨਾ: {parsedData.newBags} ਬੋਰੀ
                  </span>
                )}

                {parsedData.oldBags !== undefined && parsedData.oldBags > 0 && (
                  <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-300 text-[11px]">
                    ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ: {parsedData.oldBags} ਬੋਰੀ
                  </span>
                )}

                {parsedData.totalBags !== undefined && parsedData.totalBags > 0 && !parsedData.newBags && !parsedData.oldBags && (
                  <span className="bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-md border border-blue-300 text-[11px]">
                    ਕੁੱਲ ਬੋਰੀਆਂ: {parsedData.totalBags}
                  </span>
                )}

                {parsedData.doubleBags !== undefined && parsedData.doubleBags > 0 && (
                  <span className="bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-md border border-purple-300 text-[11px]">
                    ਪੱਖਾ: {parsedData.doubleBags}
                  </span>
                )}

                {parsedData.sukkiBags !== undefined && parsedData.sukkiBags > 0 && (
                  <span className="bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-md border border-indigo-300 text-[11px]">
                    ਸੁੱਕੀ: {parsedData.sukkiBags}
                  </span>
                )}

                {parsedData.totaKg !== undefined && parsedData.totaKg > 0 && (
                  <span className="bg-slate-100 text-slate-900 font-bold px-2 py-0.5 rounded-md border border-slate-300 text-[11px]">
                    ਟੋਟਾ: {parsedData.totaKg} KG
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs shadow-sm flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEn ? 'Apply to Form' : 'ਫਾਰਮ ਵਿੱਚ ਭਰੋ'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// Natural Language Spoken Parser for Mandi
// ==========================================
export function parseSpokenMandiText(rawText: string, farmers: Farmer[]): ParsedVoiceData {
  const text = rawText.toLowerCase().trim();
  const result: ParsedVoiceData = { rawTranscript: rawText };

  // 1. Convert Gurmukhi numerals to standard digits (੧੨੩ -> 123)
  const normalizedText = normalizeGurmukhiNumerals(text);

  // 2. Extract Numbers & Keywords
  // Match Tota
  const totaMatch = normalizedText.match(/(?:ਟੋਟਾ|tota|toota)\s*(\d+)/i) || normalizedText.match(/(\d+)\s*(?:ਕਿਲੋ|kg|kilo)\s*(?:ਟੋਟਾ|tota)/i);
  if (totaMatch) {
    result.totaKg = parseInt(totaMatch[1], 10);
  }

  // Match Pakha / Double
  const doubleMatch = normalizedText.match(/(?:ਪੱਖਾ|double|ਡਬਲ|chhanai)\s*(\d+)/i) || normalizedText.match(/(\d+)\s*(?:ਪੱਖਾ|double|ਡਬਲ)/i);
  if (doubleMatch) {
    result.doubleBags = parseInt(doubleMatch[1], 10);
  }

  // Match Sukki
  const sukkiMatch = normalizedText.match(/(?:ਸੁੱਕੀ|sukki|sukhi)\s*(\d+)/i) || normalizedText.match(/(\d+)\s*(?:ਸੁੱਕੀ|sukki|sukhi)/i);
  if (sukkiMatch) {
    result.sukkiBags = parseInt(sukkiMatch[1], 10);
  }

  // Match New Bags
  const newMatch = normalizedText.match(/(\d+)\s*(?:ਨਵਾਂ|ਨਵੀਂ|ਨਵੀਆਂ|new)\s*(?:ਬੋਰੀ|ਬੋਰੀਆਂ|bags|ਬਾਰਦਾਨਾ)?/i) ||
                     normalizedText.match(/(?:ਨਵਾਂ|ਨਵੀਂ|ਨਵੀਆਂ|new)\s*(?:ਬਾਰਦਾਨਾ|ਬੋਰੀ|ਬੋਰੀਆਂ|bags)?\s*(\d+)/i);
  if (newMatch) {
    result.newBags = parseInt(newMatch[1], 10);
  }

  // Match Old Bags
  const oldMatch = normalizedText.match(/(\d+)\s*(?:ਪੁਰਾਣਾ|ਪੁਰਾਣੀ|ਪੁਰਾਣੀਆਂ|old)\s*(?:ਬੋਰੀ|ਬੋਰੀਆਂ|bags|ਬਾਰਦਾਨਾ)?/i) ||
                     normalizedText.match(/(?:ਪੁਰਾਣਾ|ਪੁਰਾਣੀ|ਪੁਰਾਣੀਆਂ|old)\s*(?:ਬਾਰਦਾਨਾ|ਬੋਰੀ|ਬੋਰੀਆਂ|bags)?\s*(\d+)/i);
  if (oldMatch) {
    result.oldBags = parseInt(oldMatch[1], 10);
  }

  // If no new/old specified, check general bags count
  if (!result.newBags && !result.oldBags) {
    const generalBagsMatch = normalizedText.match(/(\d+)\s*(?:ਬੋਰੀ|ਬੋਰੀਆਂ|bags|ਬੈਗ)/i);
    if (generalBagsMatch) {
      const bags = parseInt(generalBagsMatch[1], 10);
      result.totalBags = bags;
      // Default to New Bardana if unspecified
      result.newBags = bags;
    } else {
      // Look for any isolated number that might be bags
      const allNumbers = normalizedText.match(/\b\d+\b/g);
      if (allNumbers && allNumbers.length > 0) {
        const potentialBags = parseInt(allNumbers[0], 10);
        if (potentialBags > 0 && potentialBags < 5000) {
          result.totalBags = potentialBags;
          result.newBags = potentialBags;
        }
      }
    }
  }

  // 3. Match Farmer by Name
  // Strip numbers and common mandi words to isolate potential farmer name
  const strippedForName = normalizedText
    .replace(/\b\d+\b/g, '')
    .replace(/(?:ਬੋਰੀ|ਬੋਰੀਆਂ|ਨਵਾਂ|ਪੁਰਾਣਾ|ਬਾਰਦਾਨਾ|ਟੋਟਾ|ਪੱਖਾ|ਸੁੱਕੀ|ਕਿਲੋ|bags|new|old|tota|double|kg)/gi, '')
    .trim();

  if (strippedForName.length >= 2) {
    let bestMatch: Farmer | null = null;
    let highestScore = 0;

    farmers.forEach((farmer) => {
      const namePa = (farmer.farmerNamePa || '').toLowerCase();
      const nameEn = (farmer.farmerName || '').toLowerCase();
      const village = (farmer.village || '').toLowerCase();
      const villagePa = (farmer.villagePa || '').toLowerCase();

      let score = 0;
      const terms = strippedForName.split(/\s+/).filter(t => t.length >= 2);

      for (const term of terms) {
        if (namePa.includes(term) || nameEn.includes(term)) {
          score += 5;
        }
        if (village.includes(term) || villagePa.includes(term)) {
          score += 3;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = farmer;
      }
    });

    if (bestMatch && highestScore >= 3) {
      result.farmer = bestMatch;
    } else {
      result.matchedFarmerName = strippedForName;
    }
  }

  return result;
}

function normalizeGurmukhiNumerals(str: string): string {
  const gurmukhiMap: { [key: string]: string } = {
    '੦': '0', '੧': '1', '੨': '2', '੩': '3', '੪': '4',
    '੫': '5', '੬': '6', '੭': '7', '੮': '8', '੯': '9',
    'ਸੌ': '100', 'ਡੇਢ ਸੌ': '150', 'ਦੋ ਸੌ': '200', 'ਤਿੰਨ ਸੌ': '300'
  };

  let normalized = str;
  Object.entries(gurmukhiMap).forEach(([gChar, digit]) => {
    normalized = normalized.split(gChar).join(digit);
  });

  return normalized;
}
