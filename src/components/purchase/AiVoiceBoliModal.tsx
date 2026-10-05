import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Check,
  X,
  Volume2,
  RefreshCw,
  Building2,
  User,
  PackageCheck,
  Scale,
  AlertCircle
} from 'lucide-react';
import { Farmer, CropType } from '../../types/mandi';
import { parseVoiceWithGemini, AiVoiceParseResult } from '../../services/aiService';

interface AiVoiceBoliModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmers: Farmer[];
  agencies: { nameEn: string; namePa?: string }[];
  activeCrop: CropType;
  onApplyParsedBoli: (parsed: {
    farmerId?: string;
    agency?: string;
    newBags?: number;
    oldBags?: number;
    bags: number;
    rate?: number;
  }) => void;
}

export const AiVoiceBoliModal: React.FC<AiVoiceBoliModalProps> = ({
  isOpen,
  onClose,
  farmers,
  agencies,
  activeCrop,
  onApplyParsedBoli
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResult, setParsedResult] = useState<AiVoiceParseResult | null>(null);
  const [detectedAgency, setDetectedAgency] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setTranscript('');
      setParsedResult(null);
      setDetectedAgency('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const startListening = () => {
    setErrorMessage(null);
    setParsedResult(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('ਤੁਹਾਡਾ ਬ੍ਰਾਊਜ਼ਰ ਮਾਈਕ੍ਰੋਫੋਨ ਸਪੀਚ ਰਿਕੋਗਨੀਸ਼ਨ ਨੂੰ ਸਪੋਰਟ ਨਹੀਂ ਕਰਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਟਾਈਪ ਕਰੋ।');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pa-IN'; // Punjabi (India)
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setErrorMessage(`ਮਾਈਕ੍ਰੋਫੋਨ ਵਿੱਚ ਅਵਾਜ਼ ਨਹੀਂ ਮਿਲੀ: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize speech recognition:', err);
      setIsListening(false);
      setErrorMessage(err.message || 'ਮਾਈਕ ਚਾਲੂ ਕਰਨ ਵਿੱਚ ਦਿੱਕਤ ਆਈ।');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      // 1. Detect agency from transcript
      const lower = transcript.toLowerCase();
      let matchedAgency = '';
      for (const ag of agencies) {
        const enLower = (ag.nameEn || '').toLowerCase();
        const paLower = (ag.namePa || '').toLowerCase();
        if (lower.includes(enLower) || (paLower && lower.includes(paLower))) {
          matchedAgency = ag.nameEn;
          break;
        }
      }
      if (!matchedAgency) {
        if (lower.includes('ਮਾਰਕਫੈੱਡ') || lower.includes('markfed')) matchedAgency = 'Markfed';
        else if (lower.includes('ਪਨਗ੍ਰੇਨ') || lower.includes('pungrain')) matchedAgency = 'Pungrain';
        else if (lower.includes('ਪਨਸਪ') || lower.includes('punsup')) matchedAgency = 'Punsup';
        else if (lower.includes('ਵੇਅਰਹਾਊਸ') || lower.includes('pswc')) matchedAgency = 'PSWC';
        else if (lower.includes('fci') || lower.includes('ਐੱਫ ਸੀ ਆਈ')) matchedAgency = 'FCI';
      }
      setDetectedAgency(matchedAgency);

      // 2. Call Gemini AI via server
      const farmersList = farmers.map((f) => ({
        id: f.id,
        name: f.farmerName,
        namePa: f.farmerNamePa,
        village: f.village
      }));

      const result = await parseVoiceWithGemini(transcript, farmersList);
      if (result) {
        setParsedResult(result);
      } else {
        setErrorMessage('AI ਨੂੰ ਸਮਝਣ ਵਿੱਚ ਕੁਝ ਦਿੱਕਤ ਆਈ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ ਜਾਂ ਟਾਈਪ ਕਰੋ।');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'AI ਬੋਲੀ ਐਨਾਲਿਸਿਸ ਫੇਲ੍ਹ ਹੋ ਗਿਆ।');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;

    onApplyParsedBoli({
      farmerId: parsedResult.matchedFarmerId || undefined,
      agency: detectedAgency || undefined,
      newBags: parsedResult.bags || 0,
      oldBags: 0,
      bags: parsedResult.bags || 0,
      rate: parsedResult.rate
    });
    onClose();
  };

  if (!isOpen) return null;

  const matchedFarmer = parsedResult?.matchedFarmerId
    ? farmers.find((f) => f.id === parsedResult.matchedFarmerId)
    : null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500 rounded-xl text-slate-950 shadow-xs font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">
                🎙️ AI ਪੰਜਾਬੀ ਬੋਲੀ ਰਿਕਾਰਡਰ (Voice Boli Assistant)
              </h3>
              <p className="text-[11px] text-emerald-200">
                ਬੋਲ ਕੇ ਸਿੱਧਾ ਕਿਸਾਨ, ਏਜੰਸੀ, ਬੋਰੀਆਂ ਅਤੇ ਰੇਟ ਦਰਜ ਕਰੋ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Example prompt pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 block uppercase">
              ਉਦਾਹਰਨ ਵਜੋਂ ਇੰਝ ਬੋਲੋ:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span
                onClick={() => setTranscript('ਮਾਰਕਫੈੱਡ, ਜੱਗਾ ਸਿੰਘ ਢਿੱਲੋਂ ਦੀਆਂ 120 ਬੋਰੀਆਂ, ਰੇਟ 2475')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-300 cursor-pointer font-medium transition"
              >
                "ਮਾਰਕਫੈੱਡ, ਜੱਗਾ ਸਿੰਘ ਢਿੱਲੋਂ 120 ਬੋਰੀਆਂ ਰੇਟ 2475"
              </span>
              <span
                onClick={() => setTranscript('ਪਨਗ੍ਰੇਨ, ਗੁਰਮੀਤ ਸਿੰਘ 150 ਬੋਰੀਆਂ ਭਾਅ 2320')}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-300 cursor-pointer font-medium transition"
              >
                "ਪਨਗ੍ਰੇਨ, ਗੁਰਮੀਤ ਸਿੰਘ 150 ਬੋਰੀਆਂ ਭਾਅ 2320"
              </span>
            </div>
          </div>

          {/* Voice Input Textarea & Mic Button */}
          <div className="space-y-2">
            <div className="relative">
              <textarea
                rows={3}
                placeholder="ਮਾਈਕ ਦਬਾ ਕੇ ਬੋਲੋ ਜਾਂ ਇੱਥੇ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl p-3 text-sm font-bold text-slate-900 focus:outline-none transition resize-none"
              />
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>ਰੋਕੋ (ਸੁਣ ਰਿਹਾ ਹੈ...)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>ਮਾਈਕ ਚਾਲੂ ਕਰੋ (Start Voice)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!transcript.trim() || isAnalyzing}
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>ਸਮਝ ਰਿਹਾ ਹੈ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>AI ਪੜਚੋਲ (Analyze)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Result Card */}
          {parsedResult && (
            <div className="bg-emerald-50/80 border-2 border-emerald-400 rounded-xl p-4 space-y-3 shadow-xs animate-fadeIn">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Gemini AI ਵੱਲੋਂ ਤਸਦੀਕ ਕੀਤਾ ਡਾਟਾ:</span>
                </span>
                {detectedAgency && (
                  <span className="bg-indigo-600 text-white text-[10px] font-mono font-black px-2 py-0.5 rounded-full">
                    ਏਜੰਸੀ: {detectedAgency}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-slate-500 font-bold block">ਕਿਸਾਨ (Farmer):</span>
                  <strong className="text-slate-900 text-sm">
                    {matchedFarmer ? matchedFarmer.farmerNamePa || matchedFarmer.farmerName : parsedResult.farmerName || '—'}
                  </strong>
                  {matchedFarmer && (
                    <span className="block text-[10px] text-emerald-800 font-medium">
                      ਪਿੰਡ: {matchedFarmer.villagePa || matchedFarmer.village} (ID: {matchedFarmer.id})
                    </span>
                  )}
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-slate-500 font-bold block">ਖਰੀਦੀਆਂ ਬੋਰੀਆਂ (Bags):</span>
                  <strong className="text-emerald-950 text-base font-black font-mono">
                    {parsedResult.bags || 0} ਬੋਰੀਆਂ
                  </strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-slate-500 font-bold block">ਬੋਲੀ ਰੇਟ (Rate):</span>
                  <strong className="text-amber-900 text-sm font-black font-mono">
                    ₹{parsedResult.rate || 2475}/ਕੁਇੰਟਲ
                  </strong>
                </div>

                <div className="bg-white p-2 rounded-lg border border-emerald-200">
                  <span className="text-[10px] text-slate-500 font-bold block">ਖਰੀਦਦਾਰ ਏਜੰਸੀ:</span>
                  <strong className="text-indigo-900 text-sm font-black">
                    {detectedAgency || 'Markfed'}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>ਖਰੀਦ ਟੇਬਲ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ (+ Add to Purchase Table)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
