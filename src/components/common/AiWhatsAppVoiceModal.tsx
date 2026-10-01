import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Send,
  Copy,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Edit2,
  Phone,
  User,
  Building2,
  CheckCircle2
} from 'lucide-react';
import {
  getAiWhatsAppVoiceScript,
  playPunjabiSpeech,
  AiWhatsAppVoiceResult
} from '../../services/aiService';
import { cleanMobileForWhatsApp } from '../../utils/whatsappNotification';

interface AiWhatsAppVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'WEIGHMENT' | 'ADVANCE' | 'SETTLEMENT';
  data: any;
  farmer: any;
  firm: any;
}

export const AiWhatsAppVoiceModal: React.FC<AiWhatsAppVoiceModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  farmer,
  firm
}) => {
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiWhatsAppVoiceResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [speechStopFn, setSpeechStopFn] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (speechStopFn) speechStopFn();
      setIsPlayingAudio(false);
      return;
    }

    setLoading(true);
    getAiWhatsAppVoiceScript({ type, data, farmer, firm })
      .then((res) => {
        setAiResult(res);
        setEditedText(res.whatsappFormattedText);
      })
      .finally(() => setLoading(false));

    return () => {
      if (speechStopFn) speechStopFn();
    };
  }, [isOpen, type, data, farmer, firm]);

  if (!isOpen) return null;

  const handlePlayVoice = () => {
    if (isPlayingAudio && speechStopFn) {
      speechStopFn();
      setIsPlayingAudio(false);
      return;
    }

    const script = aiResult?.punjabiVoiceScript || editedText;
    const player = playPunjabiSpeech(script, () => {
      setIsPlayingAudio(false);
    });
    setSpeechStopFn(() => player.stop);
    setIsPlayingAudio(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const rawMobile = farmer?.mobile || '';
    const cleanMobile = cleanMobileForWhatsApp(rawMobile);
    const encoded = encodeURIComponent(editedText);

    let url = `https://api.whatsapp.com/send?text=${encoded}`;
    if (cleanMobile) {
      url = `https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encoded}`;
    }
    window.open(url, '_blank');
  };

  const farmerName = farmer?.farmerNamePa || farmer?.farmerName || 'ਕਿਸਾਨ ਵੀਰ';
  const firmName = firm?.name || 'Jammu Trading Co';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black">AI ਵਟਸਐਪ ਆਡੀਓ ਅਤੇ ਪਰਚੀ</h3>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                ਕਿਸਾਨ ਲਈ ਪੰਜਾਬੀ ਵੋਇਸ-ਨੋਟ ਅਤੇ ਵਟਸਐਪ ਸੁਨੇਹਾ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Recipient Details Pill */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-slate-800">{farmerName}</span>
                {farmer?.village && (
                  <span className="text-slate-500 ml-1">({farmer.village})</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-600">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{farmer?.mobile || 'ਨੰਬਰ ਦਰਜ ਨਹੀਂ'}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
              <p className="text-xs font-bold text-emerald-900">
                Gemini 3.8 Flash AI ਕਿਸਾਨ ਲਈ ਆਵਾਜ਼ ਤੇ ਵਟਸਐਪ ਮੈਸੇਜ ਲਿਖ ਰਿਹਾ ਹੈ...
              </p>
            </div>
          ) : (
            <>
              {/* Spoken Audio Voice-Note Player Bar */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-300 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-700" />
                      <span>ਪੰਜਾਬੀ ਵੋਇਸ ਨੋਟ (Voice Announcement)</span>
                    </span>
                  </div>
                  {isPlayingAudio && (
                    <div className="flex items-center gap-0.5 h-3.5">
                      <span className="w-1 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s] h-3"></span>
                      <span className="w-1 bg-emerald-700 rounded-full animate-bounce [animation-delay:-0.15s] h-4"></span>
                      <span className="w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.4s] h-2.5"></span>
                      <span className="w-1 bg-emerald-700 rounded-full animate-bounce h-3.5"></span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic bg-white/80 p-2.5 rounded-xl border border-emerald-200/60">
                  "{aiResult?.punjabiVoiceScript}"
                </p>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handlePlayVoice}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      isPlayingAudio
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>ਆਵਾਜ਼ ਬੰਦ ਕਰੋ (Stop)</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>ਕਿਸਾਨ ਨੂੰ ਆਵਾਜ਼ ਸੁਣਾਓ (Play Audio)</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400 font-bold">
                    ਪੰਜਾਬੀ ਉਚਾਰਨ (Natural Punjabi Voice)
                  </span>
                </div>
              </div>

              {/* WhatsApp Message Preview / Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700">
                    ਵਟਸਐਪ ਸੁਨੇਹਾ (WhatsApp Text Preview):
                  </label>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>ਕਾਪੀ ਹੋ ਗਿਆ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>ਕਾਪੀ ਕਰੋ</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={7}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ਵਟਸਐਪ 'ਤੇ ਭੇਜੋ (Share via WhatsApp)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer"
                >
                  ਬੰਦ ਕਰੋ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
