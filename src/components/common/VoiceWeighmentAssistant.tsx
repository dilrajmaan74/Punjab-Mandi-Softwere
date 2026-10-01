import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Square,
  RefreshCw,
  Edit3,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Clock,
  Layers,
  PhoneCall,
  MapPin,
  Tag
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import { Farmer } from '../../types/mandi';
import {
  ParsedVoiceData,
  parseSpokenMandiText,
  playVoiceFeedbackTone
} from '../../utils/mandiVoiceParser';
import { parseVoiceWithGemini } from '../../services/aiService';

export type { ParsedVoiceData };

interface VoiceWeighmentAssistantProps {
  onApplyData: (data: ParsedVoiceData) => void;
  defaultCrop?: string;
  compact?: boolean;
}

export const VoiceWeighmentAssistant: React.FC<VoiceWeighmentAssistantProps> = ({
  onApplyData,
  compact = false
}) => {
  const { farmers, language } = useMandi();
  const isEn = language === 'en';

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechLang, setSpeechLang] = useState<'pa-IN' | 'hi-IN' | 'en-IN'>('pa-IN');
  const [parsedData, setParsedData] = useState<ParsedVoiceData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statusState, setStatusState] = useState<'IDLE' | 'LISTENING' | 'DISCONNECTED_READY'>('IDLE');
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [isAiVerified, setIsAiVerified] = useState(false);

  // Settings & State
  const [autoDisconnectDelay, setAutoDisconnectDelay] = useState<number>(3000);
  const [soundFeedback, setSoundFeedback] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(false);
  const farmersRef = useRef<Farmer[]>(farmers);
  const speechLangRef = useRef<'pa-IN' | 'hi-IN' | 'en-IN'>(speechLang);
  const soundFeedbackRef = useRef<boolean>(soundFeedback);
  const isEnRef = useRef<boolean>(isEn);
  const autoDisconnectDelayRef = useRef<number>(autoDisconnectDelay);

  // Keep references in sync without rebuilding SpeechRecognition
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    farmersRef.current = farmers;
  }, [farmers]);

  useEffect(() => {
    speechLangRef.current = speechLang;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = speechLang;
      } catch {
        // ignore
      }
    }
  }, [speechLang]);

  useEffect(() => {
    soundFeedbackRef.current = soundFeedback;
  }, [soundFeedback]);

  useEffect(() => {
    isEnRef.current = isEn;
  }, [isEn]);

  useEffect(() => {
    autoDisconnectDelayRef.current = autoDisconnectDelay;
  }, [autoDisconnectDelay]);

  // Clean disconnect helper
  const disconnectMic = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    isStartingRef.current = false;

    if (recognitionRef.current && (isActiveRef.current || isListeningRef.current)) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }

    isActiveRef.current = false;
    setIsListening(false);
    isListeningRef.current = false;
    setInterimText('');

    if (transcriptRef.current.trim().length > 0) {
      setStatusState('DISCONNECTED_READY');
      if (soundFeedbackRef.current) {
        playVoiceFeedbackTone('STOP');
      }
    } else {
      setStatusState('IDLE');
    }
  }, []);

  // Reset silence timer on new spoken speech
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const delay = autoDisconnectDelayRef.current;
    if (delay > 0 && (isActiveRef.current || isListeningRef.current)) {
      silenceTimerRef.current = setTimeout(() => {
        disconnectMic();
      }, delay);
    }
  }, [disconnectMic]);

  // Setup single robust Speech Recognition instance
  const getOrCreateRecognition = useCallback(() => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLangRef.current;

      recognition.onstart = () => {
        isStartingRef.current = false;
        isActiveRef.current = true;
        setIsListening(true);
        isListeningRef.current = true;
        setErrorMsg(null);
        setStatusState('LISTENING');
        if (soundFeedbackRef.current) {
          playVoiceFeedbackTone('START');
        }
      };

      recognition.onresult = (event: any) => {
        let finalTxt = '';
        let interim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTxt += res[0].transcript + ' ';
          } else {
            interim += res[0].transcript;
          }
        }

        const combined = (finalTxt + interim).trim();
        if (combined) {
          setTranscript(combined);
          transcriptRef.current = combined;
          setInterimText(interim);

          // Real-time parsing of current speech with current farmers list
          const parsed = parseSpokenMandiText(combined, farmersRef.current);
          setParsedData(parsed);

          // Reset silence timer because user is actively speaking
          resetSilenceTimer();
        }
      };

      recognition.onerror = (event: any) => {
        isStartingRef.current = false;
        if (event.error === 'no-speech') {
          // Silence timeout, don't crash
          return;
        }

        isActiveRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;

        if (event.error === 'not-allowed') {
          setErrorMsg(
            isEnRef.current
              ? 'Microphone permission denied. Please allow microphone access in browser.'
              : 'ਮਾਈਕ੍ਰੋਫੋਨ ਦੀ ਆਗਿਆ ਨਹੀਂ ਮਿਲੀ (Microphone Permission Denied)। ਬ੍ਰਾਊਜ਼ਰ ਸੈਟਿੰਗ ਵਿੱਚ ਮਾਈਕ ਆਨ ਕਰੋ।'
          );
        } else if (event.error === 'network') {
          setErrorMsg(
            isEnRef.current
              ? 'Speech recognition network error. Please check internet connection.'
              : 'ਇੰਟਰਨੈੱਟ ਕੁਨੈਕਸ਼ਨ ਨੈੱਟਵਰਕ ਐਰਰ। ਕਿਰਪਾ ਕਰਕੇ ਇੰਟਰਨੈੱਟ ਚੈੱਕ ਕਰੋ।'
          );
        } else {
          setErrorMsg(`Voice Error: ${event.error}`);
        }
        setStatusState('IDLE');
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isActiveRef.current = false;
        setIsListening(false);
        isListeningRef.current = false;
        setInterimText('');
        const finalText = transcriptRef.current.trim();
        if (finalText.length > 0) {
          setStatusState('DISCONNECTED_READY');
          // Trigger Gemini AI deep parsing
          setIsAiRefining(true);
          parseVoiceWithGemini(
            finalText,
            farmersRef.current.map((f) => ({
              id: f.id,
              name: f.farmerName,
              namePa: f.farmerNamePa || f.farmerName,
              village: f.village || ''
            }))
          )
            .then((aiData) => {
              if (aiData) {
                setParsedData((prev) => {
                  const base = prev || parseSpokenMandiText(finalText, farmersRef.current);
                  const matched =
                    farmersRef.current.find((f) => f.id === aiData.matchedFarmerId) ||
                    base.matchedFarmer;
                  return {
                    ...base,
                    farmerName: aiData.farmerName || base.farmerName,
                    farmerNamePa: aiData.farmerNamePa || base.farmerNamePa,
                    matchedFarmer: matched,
                    bags: aiData.bags !== undefined && aiData.bags > 0 ? aiData.bags : base.bags,
                    bhartiKg: aiData.bhartiKg || base.bhartiKg,
                    weightQtl: aiData.weightQtl || base.weightQtl,
                    rate: aiData.rate || base.rate,
                    crop: (aiData.crop as any) || base.crop,
                    labourPakki: aiData.labourPakki ?? base.labourPakki,
                    labourDouble: aiData.labourDouble ?? base.labourDouble,
                    labourSukhi: aiData.labourSukhi ?? base.labourSukhi,
                    confidence: 0.98
                  };
                });
                setIsAiVerified(true);
              }
            })
            .catch((err) => console.warn('AI Refine error:', err))
            .finally(() => setIsAiRefining(false));
        } else {
          setStatusState('IDLE');
        }
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      setIsSupported(false);
      return null;
    }
  }, [resetSilenceTimer]);

  // Check support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Start Voice Recognition safely preventing duplicate calls
  const startListening = () => {
    // If already in process of starting or actively listening, do nothing
    if (isStartingRef.current || isActiveRef.current || isListening) {
      return;
    }

    const recognition = getOrCreateRecognition();
    if (!recognition) return;

    setErrorMsg(null);
    setTranscript('');
    setInterimText('');
    setParsedData(null);
    transcriptRef.current = '';

    isStartingRef.current = true;

    try {
      recognition.lang = speechLangRef.current;
      recognition.start();
    } catch (err: any) {
      isStartingRef.current = false;
      const msg = String(err?.message || err);
      if (err.name === 'InvalidStateError' || msg.includes('already started')) {
        // Already active in browser
        isActiveRef.current = true;
        setIsListening(true);
        isListeningRef.current = true;
        setStatusState('LISTENING');
      } else {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  // Re-parse when transcript is manually edited
  const handleTranscriptChange = (val: string) => {
    setTranscript(val);
    transcriptRef.current = val;
    const parsed = parseSpokenMandiText(val, farmersRef.current);
    setParsedData(parsed);
  };

  // Apply to Form and reset
  const handleApply = () => {
    if (parsedData) {
      if (soundFeedback) {
        playVoiceFeedbackTone('SUCCESS');
      }
      onApplyData(parsedData);
      setParsedData(null);
      setTranscript('');
      transcriptRef.current = '';
      setStatusState('IDLE');
    }
  };

  // Test with preset sample
  const handleSampleClick = (sampleText: string) => {
    setTranscript(sampleText);
    transcriptRef.current = sampleText;
    const parsed = parseSpokenMandiText(sampleText, farmers);
    setParsedData(parsed);
    setStatusState('DISCONNECTED_READY');
  };

  if (!isSupported) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {isEn
              ? 'Voice Recognition is best supported in Google Chrome, Edge or Brave browsers.'
              : 'ਵੋਇਸ ਟਾਈਪਿੰਗ Google Chrome ਜਾਂ Edge ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਸਭ ਤੋਂ ਵਧੀਆ ਕੰਮ ਕਰਦੀ ਹੈ।'}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/70 to-blue-50/80 border-2 border-emerald-300/90 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3 transition-all">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          {/* Main Large Voice Button */}
          <div className="relative">
            {!isListening ? (
              <button
                type="button"
                onClick={startListening}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:scale-95 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                title={isEn ? 'Click to speak' : 'ਬੋਲਣ ਲਈ ਮਾਈਕ ਦਬਾਓ'}
              >
                <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            ) : (
              <button
                type="button"
                onClick={disconnectMic}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-white bg-rose-600 hover:bg-rose-700 animate-pulse ring-4 ring-rose-300 shadow-lg cursor-pointer"
                title={isEn ? 'Stop & Disconnect' : 'ਸੁਣ ਲਿਆ - ਹੁਣ ਬੰਦ / ਡਿਸਕਨੈਕਟ ਕਰੋ'}
              >
                <Square className="w-5 h-5 fill-white" />
              </button>
            )}

            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 border border-white"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                {isEn ? 'Super Smart Voice Typing' : 'ਸਮਾਰਟ ਬੋਲੀ ਤੇ ਤੁਲਾਈ ਵੋਇਸ ਅਸਿਸਟੈਂਟ'}
              </span>
              <span className="text-[10px] bg-emerald-700 text-white font-black px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Gemini AI</span>
              </span>
              {isAiVerified && (
                <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded border border-indigo-300">
                  ✨ AI Verified
                </span>
              )}
            </div>

            {/* Current Listening Status & Prompt Guidance */}
            <div className="flex items-center gap-2 mt-0.5">
              {isAiRefining ? (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>
                    {isEn
                      ? 'Gemini 3.8 Flash AI is understanding Punjabi nuances...'
                      : 'Gemini AI ਪੰਜਾਬੀ ਬੋਲ ਦਾ ਡੂੰਘਾ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰ ਰਿਹਾ ਹੈ...'}
                  </span>
                </div>
              ) : isListening ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block"></span>
                    {isEn ? 'Listening actively... Speak clearly' : 'ਪੂਰੀ ਗੱਲ ਸੁਣ ਰਿਹਾ ਹੈ... ਖੁੱਲ੍ਹ ਕੇ ਬੋਲੋ'}
                  </span>
                  {/* Animated Sound Wave Bars */}
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s] h-3"></span>
                    <span className="w-1 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.15s] h-4"></span>
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.4s] h-2"></span>
                    <span className="w-1 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.2s] h-3.5"></span>
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce h-2.5"></span>
                  </div>
                </div>
              ) : statusState === 'DISCONNECTED_READY' ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  {isEn
                    ? 'Finished listening (Disconnected) - Review details below'
                    : 'ਪੂਰੀ ਗੱਲ ਸੁਣ ਕੇ ਬੰਦ ਹੋ ਗਿਆ (Disconnected) - ਵੇਰਵਾ ਤਿਆਰ ਹੈ'}
                </span>
              ) : (
                <p className="text-[11px] text-slate-600 font-medium">
                  {isEn
                    ? 'Click mic & speak: e.g. "Mandeep Singh 120 bags rate 2320"'
                    : 'ਮਾਈਕ ਦਬਾਓ ਤੇ ਬੋਲੋ: ਜਿਵੇਂ "ਮਨਦੀਪ ਸਿੰਘ 120 ਬੋਰੀ ਨਵਾਂ ਬਾਰਦਾਨਾ ਰੇਟ 2320"'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls: Disconnect Button, Language & Options */}
        <div className="flex items-center gap-2">
          {/* While listening: Big prominent DISCONNECT / STOP button as requested */}
          {isListening && (
            <button
              type="button"
              onClick={disconnectMic}
              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition animate-pulse"
              title="ਪੂਰੀ ਗੱਲ ਹੋ ਗਈ ਹੈ, ਹੁਣ ਮਾਈਕ ਬੰਦ ਕਰੋ"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>{isEn ? 'Done Speaking - Stop Mic' : 'ਪੂਰੀ ਗੱਲ ਸੁਣ ਲਈ - ਬੰਦ ਕਰੋ'}</span>
            </button>
          )}

          {/* Language Selector */}
          <div className="flex items-center gap-0.5 bg-white border border-emerald-300 rounded-xl p-0.5 text-[10px] font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setSpeechLang('pa-IN')}
              className={`px-2 py-1 rounded-lg transition ${
                speechLang === 'pa-IN'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ਪੰਜਾਬੀ
            </button>
            <button
              type="button"
              onClick={() => setSpeechLang('hi-IN')}
              className={`px-2 py-1 rounded-lg transition ${
                speechLang === 'hi-IN'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => setSpeechLang('en-IN')}
              className={`px-2 py-1 rounded-lg transition ${
                speechLang === 'en-IN'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>

          {/* Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showSettings
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-slate-700 border-emerald-300 hover:bg-emerald-50'
            }`}
            title="ਵੋਇਸ ਸੈਟਿੰਗਜ਼ (Voice Options)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Advanced Settings Drawer */}
      {showSettings && (
        <div className="bg-white/95 border border-emerald-300 rounded-xl p-3 shadow-xs space-y-2.5 text-xs text-slate-700 animate-in fade-in duration-150">
          <div className="font-bold text-slate-900 flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="flex items-center gap-1.5 text-emerald-800 font-black">
              <Sliders className="w-3.5 h-3.5" />
              ਵੋਇਸ ਕੰਟਰੋਲ ਤੇ ਡਿਸਕਨੈਕਟ ਸੈਟਿੰਗਜ਼ (Voice Disconnect Settings)
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Auto Disconnect behavior */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ਆਟੋ-ਡਿਸਕਨੈਕਟ ਵਿਕਲਪ (Disconnect Behavior):
              </label>
              <select
                value={autoDisconnectDelay}
                onChange={(e) => setAutoDisconnectDelay(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value={3000}>
                  ⏱️ 3 ਸਕਿੰਟ ਖਾਮੋਸ਼ੀ ਤੋਂ ਬਾਅਦ ਆਟੋਮੈਟਿਕ ਬੰਦ (Recommended)
                </option>
                <option value={2000}>⚡ 2 ਸਕਿੰਟ ਖਾਮੋਸ਼ੀ ਤੋਂ ਬਾਅਦ ਤੇਜ਼ ਬੰਦ (Fast Auto-Stop)</option>
                <option value={5000}>⏳ 5 ਸਕਿੰਟ ਲੰਬਾ ਸਮਾਂ (Slow Spoken Thoughts)</option>
                <option value={0}>🛑 ਸਿਰਫ਼ ਬਟਨ ਦਬਾਉਣ 'ਤੇ ਹੀ ਬੰਦ ਹੋਵੇ (Manual Disconnect Only)</option>
              </select>
            </div>

            {/* Sound Feedback */}
            <div className="flex items-center justify-between pt-4">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block">
                  ਆਵਾਜ਼ੀ ਘੰਟੀ (Beep / Sound Cue)
                </span>
                <span className="text-[10px] text-slate-500">ਮਾਈਕ ਸ਼ੁਰੂ ਤੇ ਬੰਦ ਵੇਲੇ ਹਲਕੀ ਧੁਨੀ</span>
              </div>
              <input
                type="checkbox"
                checked={soundFeedback}
                onChange={(e) => setSoundFeedback(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Transcript & Smart Parsed Card */}
      {transcript && (
        <div className="bg-white border-2 border-emerald-400/80 rounded-xl p-3 sm:p-3.5 space-y-3 shadow-xs">
          {/* Header of speech box */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {isListening ? '🔴 ਲਾਈਵ ਸੁਣੀ ਜਾ ਰਹੀ ਆਵਾਜ਼:' : '✓ ਸੁਣੀ ਗਈ ਗੱਲ (Transcript):'}
              </span>
              {statusState === 'DISCONNECTED_READY' && (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                  ਮਾਈਕ ਬੰਦ ਹੈ
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 cursor-pointer"
                title="ਟੈਕਸਟ ਨੂੰ ਹੱਥੀਂ ਠੀਕ ਕਰੋ"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingTranscript ? 'ਹਟਾਓ' : 'ਐਡਿਟ ਕਰੋ'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  transcriptRef.current = '';
                  setParsedData(null);
                  setStatusState('IDLE');
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 cursor-pointer"
                title="ਕਲੀਅਰ ਕਰੋ"
              >
                <X className="w-3 h-3" />
                <span>ਕਲੀਅਰ</span>
              </button>
            </div>
          </div>

          {/* Transcript Display or Manual Edit Input */}
          {isEditingTranscript ? (
            <div>
              <textarea
                rows={2}
                value={transcript}
                onChange={(e) => handleTranscriptChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="ਬੋਲੇ ਗਏ ਸ਼ਬਦ ਇੱਥੇ ਬਦਲੋ..."
              />
              <span className="text-[10px] text-slate-500">
                ਸ਼ਬਦ ਬਦਲਣ ਨਾਲ ਹੇਠਾਂ ਦਿੱਤਾ ਡਾਟਾ ਆਪਣੇ-ਆਪ ਅਪਡੇਟ ਹੋ ਜਾਵੇਗਾ।
              </span>
            </div>
          ) : (
            <p className="text-xs sm:text-sm font-black text-slate-900 italic bg-emerald-50/40 p-2 rounded-lg border border-emerald-100">
              "{transcript}"
            </p>
          )}

          {/* Smart Extracted Details Cards */}
          {parsedData && (
            <div className="space-y-2.5 pt-1">
              <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>ਕੱਢਿਆ ਗਿਆ ਮੰਡੀ ਵੇਰਵਾ (Extracted Data):</span>
                {parsedData.confidenceScore && (
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    ਸਟੀਕਤਾ: {parsedData.confidenceScore}%
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Farmer Match */}
                {parsedData.farmer ? (
                  <div className="bg-emerald-100 text-emerald-950 font-bold px-2.5 py-1 rounded-lg border border-emerald-300 text-xs flex items-center gap-1.5 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>
                      ਕਿਸਾਨ: {parsedData.farmer.farmerNamePa || parsedData.farmer.farmerName}
                    </span>
                    {parsedData.farmer.village && (
                      <span className="text-emerald-800 text-[10px] font-semibold">
                        ({parsedData.farmer.village})
                      </span>
                    )}
                  </div>
                ) : parsedData.matchedFarmerName ? (
                  <div className="bg-amber-100 text-amber-950 font-bold px-2.5 py-1 rounded-lg border border-amber-300 text-xs flex items-center gap-1.5">
                    <span>ਨਾਮ: {parsedData.matchedFarmerName}</span>
                    <span className="text-[10px] text-amber-800">(ਅਣਰਜਿਸਟਰਡ)</span>
                  </div>
                ) : null}

                {/* Bags Count */}
                {parsedData.newBags !== undefined && parsedData.newBags > 0 && (
                  <span className="bg-blue-100 text-blue-950 font-bold px-2.5 py-1 rounded-lg border border-blue-300 text-xs">
                    ਨਵਾਂ ਬਾਰਦਾਨਾ: {parsedData.newBags} ਬੋਰੀ
                  </span>
                )}

                {parsedData.oldBags !== undefined && parsedData.oldBags > 0 && (
                  <span className="bg-amber-100 text-amber-950 font-bold px-2.5 py-1 rounded-lg border border-amber-300 text-xs">
                    ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ: {parsedData.oldBags} ਬੋਰੀ
                  </span>
                )}

                {parsedData.totalBags !== undefined &&
                  parsedData.totalBags > 0 &&
                  !parsedData.newBags &&
                  !parsedData.oldBags && (
                    <span className="bg-blue-100 text-blue-950 font-bold px-2.5 py-1 rounded-lg border border-blue-300 text-xs">
                      ਕੁੱਲ ਬੋਰੀਆਂ: {parsedData.totalBags}
                    </span>
                  )}

                {/* Rate */}
                {parsedData.ratePerQtl !== undefined && parsedData.ratePerQtl > 0 && (
                  <span className="bg-emerald-100 text-emerald-950 font-black px-2.5 py-1 rounded-lg border border-emerald-300 text-xs">
                    ਰੇਟ: ₹{parsedData.ratePerQtl} / ਕੁਇੰਟਲ
                  </span>
                )}

                {/* Crop */}
                {parsedData.crop && (
                  <span className="bg-teal-100 text-teal-950 font-bold px-2.5 py-1 rounded-lg border border-teal-300 text-xs">
                    ਫਸਲ: {parsedData.crop}
                  </span>
                )}

                {/* Agency */}
                {parsedData.buyerName && (
                  <span className="bg-indigo-100 text-indigo-950 font-bold px-2.5 py-1 rounded-lg border border-indigo-300 text-xs">
                    ਖਰੀਦਦਾਰ: {parsedData.buyerName}
                  </span>
                )}

                {/* Pakha */}
                {parsedData.doubleBags !== undefined && parsedData.doubleBags > 0 && (
                  <span className="bg-purple-100 text-purple-950 font-bold px-2.5 py-1 rounded-lg border border-purple-300 text-xs">
                    ਪੱਖਾ / ਡਬਲ: {parsedData.doubleBags}
                  </span>
                )}

                {/* Sukki */}
                {parsedData.sukkiBags !== undefined && parsedData.sukkiBags > 0 && (
                  <span className="bg-amber-100 text-amber-950 font-bold px-2.5 py-1 rounded-lg border border-amber-300 text-xs">
                    ਸੁੱਕੀ: {parsedData.sukkiBags}
                  </span>
                )}

                {/* Tota */}
                {parsedData.totaKg !== undefined && parsedData.totaKg > 0 && (
                  <span className="bg-slate-200 text-slate-900 font-bold px-2.5 py-1 rounded-lg border border-slate-300 text-xs">
                    ਟੋਟਾ: {parsedData.totaKg} KG
                  </span>
                )}
              </div>

              {/* Bottom Action Strip: Apply to Form */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500">
                  ਜੇਕਰ ਸਭ ਠੀਕ ਹੈ, ਤਾਂ ਹਰੇ ਬਟਨ ਨਾਲ ਫਾਰਮ ਵਿੱਚ ਆਟੋ-ਫਿਲ ਕਰੋ ➔
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startListening}
                    className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="ਨਵੀਂ ਆਵਾਜ਼ ਦਰਜ ਕਰੋ"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ਦੁਬਾਰਾ ਬੋਲੋ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApply}
                    className="py-2 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl text-xs shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isEn ? 'Apply to Form Now' : 'ਫਾਰਮ ਵਿੱਚ ਲਾਗੂ ਕਰੋ (Apply Now)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spoken Samples / Suggestions if Idle */}
      {!transcript && !isListening && (
        <div className="pt-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 mb-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>ਤੁਸੀਂ ਇਸ ਤਰ੍ਹਾਂ ਪੂਰੀ ਗੱਲ ਬੋਲ ਸਕਦੇ ਹੋ (ਕਲਿੱਕ ਕਰਕੇ ਚੈੱਕ ਕਰੋ):</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() =>
                handleSampleClick(
                  farmers[0]?.farmerNamePa
                    ? `${farmers[0].farmerNamePa} 120 ਬੋਰੀ ਨਵਾਂ ਬਾਰਦਾਨਾ ਰੇਟ 2320`
                    : 'ਮਨਦੀਪ ਸਿੰਘ 120 ਬੋਰੀ ਨਵਾਂ ਬਾਰਦਾਨਾ ਰੇਟ 2320'
                )
              }
              className="text-[10px] font-semibold bg-white hover:bg-emerald-100/70 text-slate-700 hover:text-emerald-900 px-2 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
            >
              💬 "ਮਨਦੀਪ ਸਿੰਘ 120 ਬੋਰੀ ਨਵਾਂ ਬਾਰਦਾਨਾ ਰੇਟ 2320"
            </button>
            <button
              type="button"
              onClick={() => handleSampleClick('ਜੱਗਾ ਸਿੰਘ 90 ਗੱਟੇ ਪੱਖਾ 10 ਸੁੱਕੀ 5 ਟੋਟਾ 15 ਕਿਲੋ')}
              className="text-[10px] font-semibold bg-white hover:bg-emerald-100/70 text-slate-700 hover:text-emerald-900 px-2 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
            >
              💬 "ਜੱਗਾ ਸਿੰਘ 90 ਗੱਟੇ ਪੱਖਾ 10 ਸੁੱਕੀ 5 ਟੋਟਾ 15 ਕਿਲੋ"
            </button>
            <button
              type="button"
              onClick={() => handleSampleClick('ਸੁਖਦੇਵ ਸਿੰਘ 80 ਨਵਾਂ 40 ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ ਫਸਲ ਝੋਨਾ ਮਾਰਕਫੈੱਡ')}
              className="text-[10px] font-semibold bg-white hover:bg-emerald-100/70 text-slate-700 hover:text-emerald-900 px-2 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
            >
              💬 "ਸੁਖਦੇਵ ਸਿੰਘ 80 ਨਵਾਂ 40 ਪੁਰਾਣਾ ਫਸਲ ਝੋਨਾ ਮਾਰਕਫੈੱਡ"
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
