import React, { useState, useEffect, useRef } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Printer,
  Copy,
  Send,
  Sparkles,
  FileText,
  Check,
  Building2,
  Calendar,
  PenTool,
  MapPin,
  Eye,
  Sliders,
  Download,
  AlignLeft,
  File,
  Layers,
  Settings2,
  Loader2,
  Scissors,
  Mic,
  MicOff,
  Bot,
  Wand2,
  RefreshCw,
  Globe,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import {
  getMandiBranchDropdownLabel,
  ALL_MANDIS_DROPDOWN_LABEL
} from '../../utils/mandiBranchHelper';
import { draftLetterWithGemini } from '../../services/aiService';

export type LetterpadPageMode = 'blank' | 'lined' | 'typed';
export type MandiScopeType = 'kang-khurd' | 'mehrajwala' | 'kamalpur' | 'both';
export type SignatureStyleType = 'digital' | 'manual' | 'both' | 'none';
export type RefDateFormatType = 'dots' | 'filled';
export type AiLetterLanguage = 'pa' | 'en' | 'bilingual';

interface LetterPreset {
  id: string;
  titlePa: string;
  titleEn: string;
  recipient: string;
  subject: string;
  body: string;
  enclosure: string;
}

export const FirmLetterheadView: React.FC = () => {
  const { activeFirm, settings, language, firms, setActiveFirmId } = useMandi();
  const { notifySaveSuccess, notifyError } = useNotification();
  const isEn = language === 'en';

  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Determine if active firm is Branch 2 or Main Firm
  const isBranchActive =
    activeFirm.id === 'DEMO-FIRM-002' ||
    activeFirm.name.toLowerCase().includes('branch 2');

  // Effective Firm Details (dynamically bound to active firm or user toggle)
  const currentFirmNameEn = activeFirm.name || 'PUNJAB MANDI TRADING CO. (DEMO)';
  const currentFirmNamePa = activeFirm.namePa || 'ਪੰਜਾਬ ਮੰਡੀ ਟਰੇਡਿੰਗ ਕੰਪਨੀ (ਡੈਮੋ)';
  const currentLicence = activeFirm.licenceNo || 'DEMO/PB/2026';
  const defaultPropName = activeFirm.proprietorName || 'Daljit Singh (Demo)';
  const defaultPropNamePa = activeFirm.proprietorNamePa || 'ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)';

  // 1. PAGE LAYOUT MODE (Blank vs Lined vs Typed)
  const [pageMode, setPageMode] = useState<LetterpadPageMode>('blank');
  const [lineCount, setLineCount] = useState<number>(22);
  const [lineStyle, setLineStyle] = useState<'blue' | 'slate' | 'dashed'>('blue');
  const [showLeftMargin, setShowLeftMargin] = useState<boolean>(true);

  // Mandi Scope selection (Kang Khurd vs Mehrajwala vs Kamalpur vs Combined)
  const [mandiScope, setMandiScope] = useState<MandiScopeType>('both');

  // Signature and Date/Ref settings
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyleType>('digital');
  const [refDateFormat, setRefDateFormat] = useState<RefDateFormatType>('dots');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Letterhead State
  const defaultRefPrefix = isBranchActive ? 'PMTC-B2' : 'PMTC';
  const [refNo, setRefNo] = useState<string>(`${defaultRefPrefix}/MK/2026/042`);
  const [date, setDate] = useState<string>(getTodayFormatted());
  const [recipient, setRecipient] = useState<string>(
    'ਸਕੱਤਰ ਸਾਹਿਬ (The Secretary),\nਮਾਰਕੀਟ ਕਮੇਟੀ (Market Committee),\nਪੰਜਾਬ।'
  );
  const [subject, setSubject] = useState<string>(
    `ਵਿਸ਼ਾ: ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ / ਮਹਿਰਾਜਵਾਲਾ / ਕਮਾਲਪੁਰ ਵਿਖੇ ਖਰੀਦ ਅਤੇ ਤੁਲਾਈ ਸੰਬੰਧੀ ਜ਼ਰੂਰੀ ਬੇਨਤੀ ਪੱਤਰ — ${currentFirmNamePa}`
  );
  const [body, setBody] = useState<string>(
    `ਸਤਿਕਾਰਯੋਗ ਜੀ,\n\nਬੇਨਤੀ ਹੈ ਕਿ ਸਾਡੀ ਫਰਮ ਮੈਸ. ${currentFirmNamePa} (ਲਾਇਸੰਸ ਨੰ. ${currentLicence}) ਵੱਲੋਂ ਮੌਜੂਦਾ ਸਾਉਣੀ ਸੀਜ਼ਨ 2026 ਦੌਰਾਨ ਮੰਡੀ ਵਿੱਚ ਕਿਸਾਨਾਂ ਦੀ ਫਸਲ ਦੀ ਤੁਲਾਈ ਅਤੇ ਸਰਕਾਰੀ ਖਰੀਦ ਨਿਰਵਿਘਨ ਜਾਰੀ ਹੈ।\n\nਸਮੂਹ ਆਮਦ ਦੀ ਤੁਲਾਈ ਮਿਆਰੀ 37.50 ਕਿਲੋ ਗ੍ਰਾਮ ਬੋਰੀਆਂ ਅਨੁਸਾਰ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ। ਬਾਰਦਾਨੇ ਅਤੇ ਲਿਫਟਿੰਗ ਦੀ ਨਿਰਵਿਘਨਤਾ ਲਈ ਪ੍ਰਸ਼ਾਸਨਿਕ ਨਿਯਮਾਂ ਦੀ ਪੂਰੀ ਪਾਲਣਾ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ।\n\nਕਿਰਪਾ ਕਰਕੇ ਲੋੜੀਂਦੇ ਰਿਕਾਰਡ ਦੀ ਤਸਦੀਕ ਅਤੇ ਅਗਲੇਰੀ ਕਾਰਵਾਈ ਹਿੱਤ ਇਹ ਪੱਤਰ ਪ੍ਰਵਾਨ ਕੀਤਾ ਜਾਵੇ ਜੀ।\n\nਧੰਨਵਾਦ ਸਹਿਤ।`
  );
  const [enclosure, setEnclosure] = useState<string>('ਨੱਥੀ: ਕੱਚੀ ਤੋਲ ਪਰਚੀ ਕਾਪੀ / ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਰਜਿਸਟਰ');

  // Toggle Features
  const [includeStamp, setIncludeStamp] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [proprietorName, setProprietorName] = useState<string>(defaultPropName);
  const [proprietorNamePa, setProprietorNamePa] = useState<string>(defaultPropNamePa);
  const [activePresetId, setActivePresetId] = useState<string>('market-committee');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Synchronize proprietor names when firm changes
  useEffect(() => {
    setProprietorName(activeFirm.proprietorName || 'Daljit Singh (Demo)');
    setProprietorNamePa(activeFirm.proprietorNamePa || 'ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)');
    const prefix = 'PMTC';
    setRefNo(`${prefix}/MK/2026/${Math.floor(100 + Math.random() * 900)}`);
  }, [activeFirm.id]);

  // ==============================================================
  // GOOGLE GEMINI 3.8 AI LETTERPAD WRITER STATE
  // ==============================================================
  const [aiInputText, setAiInputText] = useState<string>('');
  const [aiLanguage, setAiLanguage] = useState<AiLetterLanguage>('pa');
  const [isAiDrafting, setIsAiDrafting] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Quick One-Click Prompt Suggestions for Mandi Letterpad
  const QUICK_AI_PROMPTS = [
    {
      labelPa: '🚚 ਲਿਫਟਿੰਗ ਲਈ ਟਰੱਕ ਭੇਜਣ ਦੀ ਅਰਜ਼ੀ',
      labelEn: 'Trucks for Lifting Requisition',
      prompt: 'ਮਾਰਕੀਟ ਕਮੇਟੀ ਸਕੱਤਰ ਅਤੇ ਖਰੀਦ ਏਜੰਸੀ ਇੰਸਪੈਕਟਰ ਨੂੰ ਬੇਨਤੀ ਪੱਤਰ ਲਿਖੋ ਕਿ ਸਾਡੀ ਫਰਮ ਵੱਲੋਂ ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ ਤੇ ਮਹਿਰਾਜਵਾਲਾ ਵਿਖੇ ਕਿਸਾਨਾਂ ਦੀਆਂ ਬੋਰੀਆਂ ਦੀ ਤੁਲਾਈ ਮੁਕੰਮਲ ਹੋ ਚੁੱਕੀ ਹੈ। ਮੀਂਹ ਦੇ ਖ਼ਦਸ਼ੇ ਨੂੰ ਦੇਖਦੇ ਹੋਏ ਸ਼ੈਲਰ ਲਈ ਤੁਰੰਤ ਟਰੱਕ ਭੇਜ ਕੇ ਮਾਲ ਲਿਫਟ ਕਰਵਾਇਆ ਜਾਵੇ।'
    },
    {
      labelPa: '🏦 ਬੈਂਕ ਸੀ.ਸੀ. ਲਿਮਿਟ / ਖਾਤਾ ਤਸਦੀਕ',
      labelEn: 'Bank CC Limit Certificate',
      prompt: 'ਬੈਂਕ ਸ਼ਾਖਾ ਪ੍ਰਬੰਧਕ ਨੂੰ ਸੀ.ਸੀ. ਲਿਮਿਟ ਅਤੇ ਚਾਲੂ ਖਾਤਾ ਨਵੀਨੀਕਰਨ ਲਈ ਪ੍ਰਮਾਣ ਪੱਤਰ ਲਿਖੋ ਕਿ ਸਾਡੀ ਫਰਮ ਲੰਬੇ ਸਮੇਂ ਤੋਂ ਰਜਿਸਟਰਡ ਆੜ੍ਹਤੀ ਵਜੋਂ ਸੁਚਾਰੂ ਕਾਰੋਬਾਰ ਚਲਾ ਰਹੀ ਹੈ ਅਤੇ ਕਿਸਾਨਾਂ ਨੂੰ ਸਰਕਾਰੀ ਫਸਲ ਖਰੀਦ ਦੀ ਅਦਾਇਗੀ ਸਮੇਂ ਸਿਰ ਕਲੀਅਰ ਕਰਦੀ ਹੈ।'
    },
    {
      labelPa: '📦 ਡੀ.ਐਫ.ਐਸ.ਸੀ. ਤੋਂ ਨਵੇਂ ਬਾਰਦਾਨੇ ਦੀ ਮੰਗ',
      labelEn: 'DFSC Bardana Requisition',
      prompt: 'ਜ਼ਿਲ੍ਹਾ ਖੁਰਾਕ ਤੇ ਸਪਲਾਈ ਕੰਟਰੋਲਰ (DFSC) ਅਤੇ ਏਜੰਸੀਆਂ ਨੂੰ ਪੱਤਰ ਲਿਖੋ ਕਿ ਮੰਡੀ ਵਿੱਚ ਕਿਸਾਨਾਂ ਦੀ ਭਾਰੀ ਆਮਦ ਸ਼ੁਰੂ ਹੋ ਚੁੱਕੀ ਹੈ। ਤੁਲਾਈ ਨਿਰਵਿਘਨ ਜਾਰੀ ਰੱਖਣ ਲਈ ਸਾਡੀ ਫਰਮ ਦੇ ਨਾਮ ਤੇ ਤੁਰੰਤ ਨਵੇਂ ਮਿਆਰੀ ਬਾਰਦਾਨੇ ਦੀਆਂ ਗੱਠਾਂ ਜਾਰੀ ਕੀਤੀਆਂ ਜਾਣ।'
    },
    {
      labelPa: '🏭 ਰਾਈਸ ਸ਼ੈਲਰ ਝੋਨਾ ਗੇਟ ਪਾਸ ਤੇ ਰਵਾਨਗੀ',
      labelEn: 'Rice Sheller Dispatch Authorization',
      prompt: 'ਕੰਗ ਮਾਡਰਨ ਰਾਈਸ ਸ਼ੈਲਰ ਨੂੰ ਪੱਤਰ ਲਿਖੋ ਕਿ ਸਰਕਾਰੀ ਅਲਾਟਮੈਂਟ ਅਨੁਸਾਰ ਸਾਡੇ ਮੰਡੀ ਯਾਰਡ ਤੋਂ ਟਰੱਕ ਨੰਬਰ ਰਾਹੀਂ ਝੋਨੇ ਦੀਆਂ ਬੋਰੀਆਂ ਰਵਾਨਾ ਕੀਤੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ। ਮਾਲ ਪ੍ਰਾਪਤ ਕਰਕੇ ਤੁਰੰਤ ਮੋਹਰ ਲਗਾ ਕੇ ਬਿਲਟੀ ਅਤੇ ਗੇਟ ਪਾਸ ਰਸੀਦ ਦਿੱਤੀ ਜਾਵੇ।'
    },
    {
      labelPa: '👨‍🌾 ਕਿਸਾਨ ਅਦਾਇਗੀ ਕਲੀਅਰੈਂਸ ਸਰਟੀਫਿਕੇਟ',
      labelEn: 'Farmer Payment Clearance',
      prompt: 'ਸੰਬੰਧਿਤ ਕਿਸਾਨ ਲਈ ਤਸਦੀਕ ਪੱਤਰ ਲਿਖੋ ਕਿ ਉਨ੍ਹਾਂ ਦੀ ਫਸਲ ਦੀ ਤੁਲਾਈ ਸਾਡੀ ਆੜ੍ਹਤ ਰਾਹੀਂ ਸਰਕਾਰੀ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਮੁਕੰਮਲ ਹੋਈ ਸੀ ਅਤੇ ਉਨ੍ਹਾਂ ਦੀ ਕੁੱਲ ਰਕਮ ਕਿਸਾਨ ਦੇ ਬੈਂਕ ਖਾਤੇ ਰਾਹੀਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਕਲੀਅਰ ਹੋ ਚੁੱਕੀ ਹੈ ਤੇ ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ ਹੈ।'
    },
    {
      labelPa: '🌧️ ਖਰਾਬ ਮੌਸਮ ਤੋਂ ਢੇਰੀਆਂ ਬਚਾਅ ਸੂਚਨਾ',
      labelEn: 'Inclement Weather Protection Notice',
      prompt: 'ਮਾਰਕੀਟ ਕਮੇਟੀ ਪ੍ਰਸ਼ਾਸਨ ਨੂੰ ਸੂਚਿਤ ਕਰੋ ਕਿ ਮੌਸਮ ਖਰਾਬ ਹੋਣ ਕਾਰਨ ਮੰਡੀ ਫੜ੍ਹ ਉੱਤੇ ਪਈਆਂ ਢੇਰੀਆਂ ਨੂੰ ਤ੍ਰਿਪਾਲਾਂ ਨਾਲ ਢੱਕਣ ਦਾ ਪੂਰਾ ਪ੍ਰਬੰਧ ਕੀਤਾ ਗਿਆ ਹੈ ਅਤੇ ਬਾਰਿਸ਼ ਤੋਂ ਬਚਾਅ ਲਈ ਡਰੇਨੇਜ ਦਾ ਧਿਆਨ ਰੱਖਿਆ ਜਾ ਰਿਹਾ ਹੈ।'
    }
  ];

  // Address and Mandi text based on scope
  const getMandiAddressText = () => {
    if (mandiScope === 'kang-khurd') {
      return 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ, ਤਹਿ. ਸ਼ਾਹਕੋਟ, ਜ਼ਿਲ੍ਹਾ ਜਲੰਧਰ (ਪੰਜਾਬ) • ਪਿੰਨ: 144629';
    }
    if (mandiScope === 'mehrajwala') {
      return 'ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ, ਤਹਿ. ਸ਼ਾਹਕੋਟ, ਜ਼ਿਲ੍ਹਾ ਜਲੰਧਰ (ਪੰਜਾਬ) • ਪਿੰਨ: 144629';
    }
    if (mandiScope === 'kamalpur') {
      return 'ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ, ਤਹਿ. ਸ਼ਾਹਕੋਟ, ਜ਼ਿਲ੍ਹਾ ਜਲੰਧਰ (ਪੰਜਾਬ) • ਪਿੰਨ: 144629';
    }
    return 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ / ਮਹਿਰਾਜਵਾਲਾ / ਕਮਾਲਪੁਰ, ਤਹਿ. ਸ਼ਾਹਕੋਟ, ਜ਼ਿਲ੍ਹਾ ਜਲੰਧਰ (ਪੰਜਾਬ)';
  };

  const getMoharMandiName = () => {
    if (mandiScope === 'kang-khurd') return 'KANG KHURD';
    if (mandiScope === 'mehrajwala') return 'MEHRAJWALA';
    if (mandiScope === 'kamalpur') return 'KAMALPUR';
    return 'KANG KHURD / MEHRAJWALA / KAMALPUR';
  };

  // Pre-configured official Mandi templates
  const PRESETS: LetterPreset[] = [
    {
      id: 'market-committee',
      titlePa: 'ਮਾਰਕੀਟ ਕਮੇਟੀ ਬੇਨਤੀ ਪੱਤਰ',
      titleEn: 'Market Committee Application',
      recipient: `ਸਕੱਤਰ ਸਾਹਿਬ (The Secretary),\nਮਾਰਕੀਟ ਕਮੇਟੀ ਲੋਹੀਆਂ ਖਾਸ,\nਤਹਿਸੀਲ ਸ਼ਾਹਕੋਟ, ਜ਼ਿਲ੍ਹਾ ਜਲੰਧਰ।`,
      subject: `ਵਿਸ਼ਾ: ਦਾਣਾ ਮੰਡੀ ਵਿਖੇ ਤੁਲਾਈ ਅਤੇ ਫਸਲ ਲਿਫਟਿੰਗ ਸੰਬੰਧੀ ਜ਼ਰੂਰੀ ਸੂਚਨਾ — ${currentFirmNamePa}`,
      body: `ਸਤਿਕਾਰਯੋਗ ਜੀ,\n\nਬੇਨਤੀ ਹੈ ਕਿ ਸਾਡੀ ਫਰਮ ਮੈਸ. ${currentFirmNamePa} (ਲਾਇਸੰਸ ਨੰ. ${currentLicence}) ਵੱਲੋਂ ਚਾਲੂ ਸੀਜ਼ਨ ਦੌਰਾਨ ਮੰਡੀ ਫੜ੍ਹ ਉੱਤੇ ਕਿਸਾਨਾਂ ਦੀ ਫਸਲ ਦੀ ਤੁਲਾਈ ਸਰਕਾਰੀ ਮਾਪਦੰਡਾਂ ਅਨੁਸਾਰ ਮੁਕੰਮਲ ਕੀਤੀ ਗਈ ਹੈ।\n\nਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀਆਂ ਵੱਲੋਂ ਖਰੀਦੇ ਗਏ ਸਟਾਕ ਦੀ ਤੁਰੰਤ ਲਿਫਟਿੰਗ ਲਈ ਟਰਾਂਸਪੋਰਟ ਦੇ ਪ੍ਰਬੰਧ ਹਿੱਤ ਲੋੜੀਂਦੇ ਗੇਟ ਪਾਸ ਜਾਰੀ ਕੀਤੇ ਜਾਣ।\n\nਧੰਨਵਾਦ ਸਹਿਤ।`,
      enclosure: 'ਨੱਥੀ: ਡੇਲੀ ਤੁਲਾਈ ਸਟਾਕ ਸਮਰੀ'
    },
    {
      id: 'bank-certificate',
      titlePa: 'ਬੈਂਕ ਸੀਸੀ ਲਿਮਿਟ / ਖਾਤਾ ਤਸਦੀਕ',
      titleEn: 'Bank Account & Limit Certificate',
      recipient: `ਸੇਵਾ ਵਿਖੇ, ਸ਼ਾਖਾ ਪ੍ਰਬੰਧਕ (The Branch Manager),\nਐਚ.ਡੀ.ਐਫ.ਸੀ. ਬੈਂਕ ਲਿਮਿਟੇਡ / ਪੰਜਾਬ ਨੈਸ਼ਨਲ ਬੈਂਕ,\nਸ਼ਾਖਾ ਲੋਹੀਆਂ ਖਾਸ / ਸ਼ਾਹਕੋਟ।`,
      subject: `ਵਿਸ਼ਾ: ਆੜ੍ਹਤ ਵਪਾਰਕ ਖਾਤੇ (CC Limit / Current Account) ਸੰਬੰਧੀ ਤਸਦੀਕ ਪੱਤਰ — ${currentFirmNamePa}`,
      body: `ਸ਼੍ਰੀਮਾਨ ਜੀ,\n\nਤਸਦੀਕ ਕੀਤਾ ਜਾਂਦਾ ਹੈ ਕਿ ਸਾਡੀ ਫਰਮ ਮੈਸ. ${currentFirmNamePa} (ਲਾਇਸੰਸ ਨੰ. ${currentLicence}) ਪਿਛਲੇ ਲੰਮੇ ਸਮੇਂ ਤੋਂ ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ / ਮਹਿਰਾਜਵਾਲਾ ਵਿਖੇ ਬਤੌਰ ਰਜਿਸਟਰਡ ਕਮਿਸ਼ਨ ਏਜੰਟ (ਆੜ੍ਹਤੀ) ਕਾਰਜਸ਼ੀਲ ਹੈ।\n\nਸਾਡੀ ਫਰਮ ਦਾ ਖਾਤਾ ਨੰਬਰ ਤੁਹਾਡੀ ਸ਼ਾਖਾ ਵਿੱਚ ਚੱਲ ਰਿਹਾ ਹੈ। ਚਾਲੂ ਹਾੜ੍ਹੀ/ਸਾਉਣੀ ਸੀਜ਼ਨ ਵਿੱਚ ਕਿਸਾਨਾਂ ਦੀਆਂ ਅਦਾਇਗੀਆਂ ਅਤੇ ਸਰਕਾਰੀ ਖਰੀਦ ਦੇ ਲੈਣ-ਦੇਣ ਹਿੱਤ ਇਹ ਸਰਟੀਫਿਕੇਟ ਜਾਰੀ ਕੀਤਾ ਜਾਂਦਾ ਹੈ।\n\nਸਾਡੀ ਫਰਮ ਦਾ ਕਾਰੋਬਾਰ ਅਤੇ ਕ੍ਰੈਡਿਟ ਰਿਕਾਰਡ ਪੂਰੀ ਤਰ੍ਹਾਂ ਸੰਤੋਸ਼ਜਨਕ ਹੈ।`,
      enclosure: 'ਨੱਥੀ: ਫਰਮ ਪੈਨ ਕਾਰਡ, ਮੰਡੀ ਲਾਇਸੰਸ ਤੇ ਖਾਤਾ ਸਟੇਟਮੈਂਟ'
    },
    {
      id: 'farmer-payment',
      titlePa: 'ਕਿਸਾਨ ਅਦਾਇਗੀ ਪ੍ਰਮਾਣ ਪੱਤਰ',
      titleEn: 'Farmer Payment Clearance Certificate',
      recipient: `ਜਿਸ ਨਾਲ ਵੀ ਸੰਬੰਧਿਤ ਹੋਵੇ (To Whom It May Concern)`,
      subject: `ਵਿਸ਼ਾ: ਕਿਸਾਨ ਫਸਲ ਤੁਲਾਈ ਅਤੇ ਅਦਾਇਗੀ ਨਿਪਟਾਰਾ ਪ੍ਰਮਾਣ ਪੱਤਰ — ${currentFirmNamePa}`,
      body: `ਇਹ ਤਸਦੀਕ ਕੀਤਾ ਜਾਂਦਾ ਹੈ ਕਿ ਸੰਬੰਧਿਤ ਕਿਸਾਨ ਵੱਲੋਂ ਮੌਜੂਦਾ ਖਰੀਦ ਸੀਜ਼ਨ ਦੌਰਾਨ ਸਾਡੀ ਆੜ੍ਹਤ ਰਾਹੀਂ ਆਪਣੀ ਫਸਲ ਦੀ ਤੁਲਾਈ ਕਰਵਾਈ ਗਈ ਸੀ।\n\nਫਸਲ ਦਾ ਕੁੱਲ ਵਜ਼ਨ (37.5 KG ਬੋਰੀਆਂ) ਅਤੇ ਸਰਕਾਰੀ ਸਮਰਥਨ ਮੁੱਲ ਅਨੁਸਾਰ ਬਣਦੀ ਸ਼ੁੱਧ ਰਕਮ ਦੀ ਅਦਾਇਗੀ ਕਿਸਾਨ ਦੇ ਬੈਂਕ ਖਾਤੇ / ਡੀਬੀਟੀ (DBT) ਰਾਹੀਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਕਲੀਅਰ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ ਅਤੇ ਕਿਸਾਨ ਵੱਲ ਕੋਈ ਬਕਾਇਆ ਨਹੀਂ ਹੈ।\n\nਇਹ ਸਰਟੀਫਿਕੇਟ ਕਿਸਾਨ ਦੀ ਮੰਗ 'ਤੇ ਉਨ੍ਹਾਂ ਦੇ ਨਿੱਜੀ ਰਿਕਾਰਡ ਹਿੱਤ ਜਾਰੀ ਕੀਤਾ ਜਾਂਦਾ ਹੈ।`,
      enclosure: 'ਨੱਥੀ: ਕੱਚੀ ਤੁਲਾਈ ਰਸੀਦ ਅਤੇ ਬੈਂਕ ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਵੇਰਵਾ'
    },
    {
      id: 'sheller-lifting',
      titlePa: 'ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ ਆਥੋਰਾਈਜ਼ੇਸ਼ਨ',
      titleEn: 'Sheller Lifting Authorization Letter',
      recipient: `ਸੇਵਾ ਵਿਖੇ, ਮੈਨੇਜਰ / ਮਾਲਕ,\nਮੈਸ. ਕੰਗ ਮਾਡਰਨ ਰਾਈਸ ਸ਼ੈਲਰ,\nਕੰਗ ਖੁਰਦ ਰੋਡ, ਲੋਹੀਆਂ ਖਾਸ।`,
      subject: `ਵਿਸ਼ਾ: ਝੋਨਾ ਸਟਾਕ ਲਿਫਟਿੰਗ ਅਤੇ ਗੇਟ ਪਾਸ ਰਵਾਨਗੀ ਅਧਿਕਾਰ ਪੱਤਰ — ${currentFirmNamePa}`,
      body: `ਸਤਿਕਾਰਯੋਗ ਜੀ,\n\nਤੁਹਾਨੂੰ ਸੂਚਿਤ ਕੀਤਾ ਜਾਂਦਾ ਹੈ ਕਿ ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀ ਦੇ ਅਲਾਟਮੈਂਟ ਆਰਡਰ ਅਨੁਸਾਰ ਸਾਡੇ ਮੰਡੀ ਫੜ੍ਹ ਤੋਂ ਤੁਹਾਡੇ ਸ਼ੈਲਰ ਲਈ ਝੋਨੇ ਦੀਆਂ ਬੋਰੀਆਂ ਟਰੱਕ ਰਾਹੀਂ ਰਵਾਨਾ ਕੀਤੀਆਂ ਜਾ ਰਹੀਆਂ ਹਨ।\n\nਕਿਰਪਾ ਕਰਕੇ ਮਾਲ ਨੂੰ ਸ਼ੈਲਰ ਪਹੁੰਚਣ 'ਤੇ ਤੁਰੰਤ ਅਨਲੋਡ ਕਰਵਾ ਕੇ ਗੇਟ ਪਾਸ ਅਤੇ ਬਿਲਟੀ 'ਤੇ ਪ੍ਰਾਪਤੀ ਦੀ ਮੋਹਰ ਲਗਾ ਕੇ ਡਰਾਈਵਰ ਨੂੰ ਰਸੀਦ ਸੌਂਪੀ ਜਾਵੇ ਜੀ।\n\nਕਿਸੇ ਵੀ ਘਾਟ (Shortage) ਜਾਂ ਰੱਦ ਹੋਣ ਦੀ ਸੂਰਤ ਵਿੱਚ ਤੁਰੰਤ ਸੂਚਿਤ ਕੀਤਾ ਜਾਵੇ।`,
      enclosure: 'ਨੱਥੀ: ਗੇਟ ਪਾਸ ਕਾਪੀ ਅਤੇ ਟਰੱਕ ਚਲਾਨ'
    },
    {
      id: 'dfsc-bardana',
      titlePa: 'ਏਜੰਸੀ ਬਾਰਦਾਨਾ ਅਲਾਟਮੈਂਟ ਅਰਜ਼ੀ',
      titleEn: 'Agency Bardana Requisition',
      recipient: `ਜ਼ਿਲ੍ਹਾ ਖੁਰਾਕ ਤੇ ਸਪਲਾਈ ਕੰਟਰੋਲਰ (DFSC) / ਏਜੰਸੀ ਇੰਚਾਰਜ,\nਪਨਗ੍ਰੇਨ / ਮਾਰਕਫੈੱਡ / ਪਨਸਪ / ਵੇਅਰਹਾਊਸ,\nਦਾਣਾ ਮੰਡੀ ਲੋਹੀਆਂ ਖਾਸ / ਸ਼ਾਹਕੋਟ।`,
      subject: `ਵਿਸ਼ਾ: ਦਾਣਾ ਮੰਡੀ ਵਿਖੇ ਨਵੇਂ/ਪੁਰਾਣੇ ਬਾਰਦਾਨੇ ਦੀ ਤੁਰੰਤ ਸਪਲਾਈ ਸੰਬੰਧੀ — ${currentFirmNamePa}`,
      body: `ਸ਼੍ਰੀਮਾਨ ਜੀ,\n\nਬੇਨਤੀ ਹੈ ਕਿ ਸਾਡੇ ਮੰਡੀ ਯਾਰਡ ਵਿਖੇ ਕਿਸਾਨਾਂ ਦੀ ਭਾਰੀ ਆਮਦ ਸ਼ੁਰੂ ਹੋ ਚੁੱਕੀ ਹੈ। ਸਾਡੇ ਕੋਲ ਮੌਜੂਦਾ ਬਾਰਦਾਨੇ ਦਾ ਸਟਾਕ ਖਤਮ ਹੋਣ ਕਿਨਾਰੇ ਹੈ।\n\nਕਿਸਾਨਾਂ ਦੀ ਫਸਲ ਨੂੰ ਖਰਾਬ ਮੌਸਮ ਤੋਂ ਬਚਾਉਣ ਅਤੇ ਤੁਲਾਈ ਨਿਰਵਿਘਨ ਜਾਰੀ ਰੱਖਣ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਸਾਡੀ ਫਰਮ ਦੇ ਨਾਂ 'ਤੇ ਤੁਰੰਤ ਬਾਰਦਾਨੇ ਦੀਆਂ ਗੱਠਾਂ ਅਲਾਟ ਕੀਤੀਆਂ ਜਾਣ ਤਾਂ ਜੋ ਖਰੀਦ ਦਾ ਕੰਮ ਸੁਚਾਰੂ ਰੂਪ ਵਿੱਚ ਚੱਲ ਸਕੇ।`,
      enclosure: 'ਨੱਥੀ: ਬਾਰਦਾਨਾ ਖਪਤ ਅਤੇ ਸਟਾਕ ਰਜਿਸਟਰ'
    },
    {
      id: 'blank-custom',
      titlePa: 'ਕੋਰਾ / ਖਾਲੀ ਲੈਟਰ ਪੈਡ (ਨਵਾਂ ਪੱਤਰ)',
      titleEn: 'Blank / Custom Letterpad',
      recipient: `ਸੇਵਾ ਵਿਖੇ,\n[ਪ੍ਰਾਪਤਕਰਤਾ ਦਾ ਨਾਮ ਤੇ ਪਤਾ ਲਿਖੋ]`,
      subject: `ਵਿਸ਼ਾ: [ਇੱਥੇ ਆਪਣਾ ਵਿਸ਼ਾ ਲਿਖੋ]`,
      body: `ਸਤਿਕਾਰਯੋਗ ਜੀ,\n\nਇੱਥੇ ਆਪਣਾ ਲੋੜੀਂਦਾ ਪੱਤਰ, ਅਰਜ਼ੀ ਜਾਂ ਸੂਚਨਾ ਵਿਸਥਾਰ ਨਾਲ ਲਿਖੋ...\n\nਧੰਨਵਾਦ ਸਹਿਤ।`,
      enclosure: 'ਨੱਥੀ: —'
    }
  ];

  const handleApplyPreset = (preset: LetterPreset) => {
    setActivePresetId(preset.id);
    setRecipient(preset.recipient);
    setSubject(preset.subject);
    setBody(preset.body);
    if (preset.enclosure) setEnclosure(preset.enclosure);
    notifySaveSuccess({
      titlePa: 'ਲੈਟਰ ਪੈਡ ਟੈਂਪਲੇਟ ਲੋਡ ਹੋ ਗਿਆ',
      titleEn: 'Template Loaded',
      messagePa: `${preset.titlePa} ਸਫਲਤਾਪੂਰਵਕ ਲੈਟਰ ਪੈਡ 'ਤੇ ਲਾਗੂ ਹੋ ਗਿਆ ਹੈ।`
    });
  };

  // Switch between Mandi Branches
  const handleSelectFirm = (firmId: string) => {
    setActiveFirmId(firmId);
    const target = firms.find((f) => f.id === firmId);
    notifySaveSuccess({
      titlePa: 'ਫਰਮ ਲੈਟਰ ਪੈਡ ਸਵਿੱਚ ਹੋ ਗਿਆ',
      titleEn: 'Firm Letterhead Switched',
      messagePa: `${target?.namePa || target?.name || 'ਮੰਡੀ ਸ਼ਾਖਾ'} ਲੈਟਰ ਪੈਡ ਚੁਣਿਆ ਗਿਆ ਹੈ।`
    });
  };

  // ==============================================================
  // GOOGLE GEMINI AI DRAFTING HANDLER
  // ==============================================================
  const handleGenerateWithGemini = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || aiInputText).trim();
    if (!promptToUse) {
      notifyError({
        titlePa: 'ਹਦਾਇਤ ਲਿਖੋ ਜਾਂ ਚੁਣੋ',
        titleEn: 'Instruction Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਲਿਖੋ ਜਾਂ ਹੇਠਾਂ ਦਿੱਤੇ ਤੁਰੰਤ ਵਿਕਲਪਾਂ ਵਿੱਚੋਂ ਚੁਣੋ ਕਿ ਲੈਟਰ ਪੈਡ ਤੇ ਕੀ ਲਿਖਵਾਉਣਾ ਹੈ।'
      });
      return;
    }

    try {
      setIsAiDrafting(true);
      const res = await draftLetterWithGemini({
        instruction: promptToUse,
        firmName: currentFirmNameEn,
        firmNamePa: currentFirmNamePa,
        licenceNo: currentLicence,
        marketCommitteePa: activeFirm.marketCommitteePa || 'ਲੋਹੀਆਂ ਖਾਸ',
        mandiBranch: getMandiAddressText(),
        proprietorName,
        proprietorNamePa,
        language: aiLanguage
      });

      if (res && res.data) {
        setRecipient(res.data.recipient || recipient);
        setSubject(res.data.subject || subject);
        setBody(res.data.body || body);
        if (res.data.enclosure) setEnclosure(res.data.enclosure);
        if (res.data.refNo) setRefNo(res.data.refNo);

        // Switch to typed mode so user instantly sees the full official letter
        setPageMode('typed');

        notifySaveSuccess({
          titlePa: 'Google Gemini ਵੱਲੋਂ ਲੈਟਰ ਤਿਆਰ!',
          titleEn: 'Letter Generated with Gemini AI',
          messagePa: `Gemini 3.8 AI ਨੇ 100% ਸਹੀ ਸਰਕਾਰੀ ਸ਼ਬਦਾਵਲੀ ਵਿੱਚ ਪੱਤਰ ਲੈਟਰ ਪੈਡ ਉੱਤੇ ਲਿਖ ਦਿੱਤਾ ਹੈ।`
        });
      }
    } catch (err: any) {
      console.error('Failed to generate letter with Gemini:', err);
      notifyError({
        titlePa: 'Gemini AI ਅਸਫਲ',
        titleEn: 'Gemini Drafting Failed',
        messagePa: 'ਲੈਟਰ ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ, ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
      });
    } finally {
      setIsAiDrafting(false);
    }
  };

  // Voice Input Dictation using Web Speech API
  const handleToggleVoiceDictation = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      notifyError({
        titlePa: 'ਮਾਈਕ ਸਪੋਰਟ ਨਹੀਂ ਹੈ',
        titleEn: 'Voice Not Supported',
        messagePa: 'ਤੁਹਾਡਾ ਬ੍ਰਾਊਜ਼ਰ ਵੌਇਸ ਰਿਕੋਗਨੀਸ਼ਨ ਸਪੋਰਟ ਨਹੀਂ ਕਰਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਟਾਈਪ ਕਰਕੇ ਲਿਖੋ।'
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Use Punjabi or Indian English based on selection
      recognition.lang = aiLanguage === 'en' ? 'en-IN' : 'pa-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setAiInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const el = document.getElementById('official-firm-letterpad');
    if (!el) {
      window.print();
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');

      const dataUrl = await toPng(el, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Fit into exact 210mm x 297mm A4 page
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
      const modeText = pageMode === 'blank' ? 'Blank' : pageMode === 'lined' ? 'Lined' : 'Typed';
      const firmSlug = isBranchActive ? 'Punjab_Mandi_Branch2' : 'Punjab_Mandi_Main';
      const mandiCode =
        mandiScope === 'mehrajwala'
          ? 'Mehrajwala'
          : mandiScope === 'kamalpur'
          ? 'Kamalpur'
          : mandiScope === 'kang-khurd'
          ? 'KangKhurd'
          : 'KangKhurd_Mehrajwala_Kamalpur';

      pdf.save(`${firmSlug}_${modeText}_Letterpad_${mandiCode}.pdf`);

      notifySaveSuccess({
        titlePa: 'ਲੈਟਰ ਪੈਡ PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ',
        titleEn: 'Letterpad PDF Downloaded',
        messagePa: `${pageMode === 'blank' ? 'ਬਿਲਕੁਲ ਖਾਲੀ (Blank)' : pageMode === 'lined' ? 'ਲਾਈਨਾਂ ਵਾਲਾ (Lined)' : 'ਟਾਈਪ ਕੀਤਾ'} ਲੈਟਰ ਪੈਡ A4 PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ ਹੈ।`
      });
    } catch (err) {
      console.warn('Direct PDF export fallback to browser print dialog:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyText = async () => {
    const fullText =
      `*${currentFirmNameEn} (${currentFirmNamePa})*\n` +
      `📍 ${getMandiAddressText()}\n` +
      `📞 Mob: ${activeFirm.mobile} | Lic: ${currentLicence}\n` +
      `────────────────────────────\n` +
      `Ref No: ${refNo}       Date: ${date}\n\n` +
      `${recipient}\n\n` +
      `*${subject}*\n\n` +
      `${body}\n\n` +
      (enclosure ? `*${enclosure}*\n\n` : '') +
      `ਵਾਸਤੇ: ਮੈਸ. ${currentFirmNamePa} (${currentFirmNameEn})\n` +
      `ਦਸਤਖ਼ਤ: ${proprietorName} (ਪ੍ਰੋਪਰਾਈਟਰ)\n`;

    try {
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      notifySaveSuccess({
        titlePa: 'ਲਿਖਤ ਕਾਪੀ ਹੋ ਗਈ',
        titleEn: 'Text Copied',
        messagePa: 'ਲੈਟਰ ਪੈਡ ਦੀ ਲਿਖਤ ਕਾਪੀ ਹੋ ਗਈ ਹੈ। ਤੁਸੀਂ WhatsApp ਜਾਂ ਕਿਤੇ ਵੀ Paste ਕਰ ਸਕਦੇ ਹੋ।'
      });
    } catch {
      notifyError({
        titlePa: 'ਕਾਪੀ ਅਸਫਲ',
        titleEn: 'Copy Failed',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਖੁਦ ਸਿਲੈਕਟ ਕਰਕੇ ਕਾਪੀ ਕਰੋ।'
      });
    }
  };

  const handleSendWhatsApp = () => {
    const fullText =
      `*${currentFirmNameEn}*\n` +
      `📍 ${getMandiAddressText()}\n` +
      `📞 Mob: ${activeFirm.mobile} | Lic: ${currentLicence}\n\n` +
      `Ref: ${refNo} | Date: ${date}\n\n` +
      `${recipient}\n\n` +
      `*${subject}*\n\n` +
      `${body}\n\n` +
      `_For ${currentFirmNameEn}_\n` +
      `*${proprietorName}* (Proprietor)`;

    const encoded = encodeURIComponent(fullText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* ============================================================== */}
      {/* 1. TOP CONTROLS & FIRM SWITCHER & AI WRITER (Hidden during Print) */}
      {/* ============================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm print:hidden space-y-4">
        {/* Header Title + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-md">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900">
                  {isEn ? 'World-Class Mandi Firm Letterhead Pad' : 'ਵਰਲਡ-ਕਲਾਸ ਮੰਡੀ ਫਰਮ ਲੈਟਰ ਪੈਡ (Official Letterhead)'}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                  A4 Print Ready
                </span>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  {pageMode === 'blank' ? 'ਬਿਲਕੁਲ ਖਾਲੀ (Blank)' : pageMode === 'lined' ? 'ਲਾਈਨਾਂ ਵਾਲਾ (Lined)' : 'ਟਾਈਪ ਕੀਤਾ ਪੱਤਰ'}
                </span>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>ਬਿਨਾਂ GST (Without GST)</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>ਮੰਡੀ: <strong>{mandiScope === 'mehrajwala' ? 'ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ' : mandiScope === 'kamalpur' ? 'ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ' : mandiScope === 'kang-khurd' ? 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ' : 'ਕੰਗ ਖੁਰਦ / ਮਹਿਰਾਜਵਾਲਾ / ਕਮਾਲਪੁਰ'}</strong></span>
                <span>• ਲਾਇਸੰਸ: <strong className="font-mono text-slate-900">{currentLicence}</strong></span>
                <span>• ਪ੍ਰੋਪਰਾਈਟਰ: <strong>{proprietorName} ({proprietorNamePa})</strong></span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isEn ? 'Print Letterpad (A4)' : 'A4 ਪ੍ਰਿੰਟ ਕੱਢੋ (Print)'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-amber-300" />
              )}
              <span>{isGeneratingPdf ? 'ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...' : 'A4 PDF ਡਾਊਨਲੋਡ'}</span>
            </button>

            {pageMode === 'typed' && (
              <>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-3.5 py-2 text-xs font-black bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>WhatsApp ਭੇਜੋ</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{isCopied ? 'ਕਾਪੀ ਹੋ ਗਿਆ' : 'ਲਿਖਤ ਕਾਪੀ ਕਰੋ'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* FIRM SELECTION TOGGLE (Separate Letter Pads for Both Firms)    */}
        {/* ============================================================== */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-800 shrink-0" />
            <span className="text-xs font-black text-amber-950">
              ਫਰਮ ਲੈਟਰ ਪੈਡ ਚੁਣੋ (Select Firm Letterhead Pad):
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {firms.map((f) => {
              const isSelected = activeFirm.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFirm(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                  }`}
                >
                  <span>🏛️ {f.namePa || f.name}</span>
                  <span className="text-[10px] opacity-90">({f.licenceNo || 'DEMO/PB/2026'})</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* GOOGLE GEMINI 3.8 AI OFFICIAL MANDI LETTERPAD WRITER           */}
        {/* ============================================================== */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-indigo-500/40 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black flex items-center gap-2">
                  <span>Google Gemini 3.8 AI Official Mandi Letter Writer</span>
                  <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-mono font-black">
                    100% Google Gemini
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  ਜੋ ਵੀ ਤੁਸੀਂ ਏ.ਆਈ. ਨੂੰ ਦੱਸੋਗੇ (ਬੋਲ ਕੇ ਜਾਂ ਲਿਖ ਕੇ), Gemini ਲੈਟਰ ਪੈਡ ਉੱਤੇ ਸਰਕਾਰੀ, ਬੈਂਕਿੰਗ ਜਾਂ ਕਾਨੂੰਨੀ ਸ਼ਬਦਾਵਲੀ ਵਿੱਚ ਪੂਰਾ ਪੱਤਰ ਤੁਰੰਤ ਤਿਆਰ ਕਰ ਦੇਵੇਗਾ।
                </p>
              </div>
            </div>

            {/* Language Selection Toggle */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-1 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setAiLanguage('pa')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  aiLanguage === 'pa' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                ਪੰਜਾਬੀ (Punjabi)
              </button>
              <button
                type="button"
                onClick={() => setAiLanguage('en')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  aiLanguage === 'en' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setAiLanguage('bilingual')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  aiLanguage === 'bilingual' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                ਦੋਵੇਂ ਸਾਂਝੇ (Bilingual)
              </button>
            </div>
          </div>

          {/* Prompt Input Box + Voice & Action Buttons */}
          <div className="space-y-2">
            <div className="relative">
              <textarea
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder="ਇੱਥੇ ਲਿਖੋ ਕਿ ਲੈਟਰ ਪੈਡ 'ਤੇ ਕੀ ਚਾਹੀਦਾ ਹੈ... (ਉਦਾਹਰਣ: ਮਾਰਕੀਟ ਕਮੇਟੀ ਸਕੱਤਰ ਨੂੰ ਲਿਖੋ ਕਿ ਸਾਡੀ ਫਰਮ ਵੱਲੋਂ ਤੁਲਾਈ ਪੂਰੀ ਹੋ ਚੁੱਕੀ ਹੈ, ਸ਼ੈਲਰ ਲਈ ਤੁਰੰਤ ਟਰੱਕ ਭੇਜਣ ਦੀ ਕ੍ਰਿਪਾਲਤਾ ਕੀਤੀ ਜਾਵੇ ਜਾਂ ਬੈਂਕ ਮੈਨੇਜਰ ਨੂੰ ਸੀ.ਸੀ. ਲਿਮਿਟ ਸਰਟੀਫਿਕੇਟ...)"
                rows={3}
                className="w-full bg-slate-800/90 border-2 border-indigo-400/40 hover:border-indigo-400/70 focus:border-amber-400 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none transition leading-relaxed resize-none shadow-inner"
              />

              <div className="flex items-center justify-between pt-1 text-xs">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={handleToggleVoiceDictation}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs border ${
                    isListening
                      ? 'bg-rose-600 text-white border-rose-400 animate-pulse ring-2 ring-rose-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  }`}
                  title="ਮਾਈਕ੍ਰੋਫੋਨ ਰਾਹੀਂ ਬੋਲ ਕੇ ਦੱਸੋ"
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{isListening ? 'ਸੁਣ ਰਿਹਾ ਹੈ (ਬੋਲੋ)...' : 'ਮਾਈਕ ਨਾਲ ਬੋਲ ਕੇ ਦੱਸੋ (Voice)'}</span>
                </button>

                {/* Submit to Gemini Button */}
                <button
                  type="button"
                  onClick={() => handleGenerateWithGemini()}
                  disabled={isAiDrafting || !aiInputText.trim()}
                  className="px-4 py-2 rounded-xl font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm active:scale-95"
                >
                  {isAiDrafting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-950 fill-indigo-950" />
                  )}
                  <span>
                    {isAiDrafting
                      ? 'Gemini 3.8 AI ਲਿਖ ਰਿਹਾ ਹੈ...'
                      : 'Gemini AI ਨਾਲ ਲੈਟਰ ਤਿਆਰ ਕਰੋ'}
                  </span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Prompt Badges */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-amber-400" />
                <span>ਤੁਰੰਤ ਰੈਡੀ-ਮੇਡ ਏ.ਆਈ. ਆਈਡੀਆ ਚੁਣੋ (Click to Auto-Write):</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {QUICK_AI_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAiInputText(qp.prompt);
                      handleGenerateWithGemini(qp.prompt);
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700 whitespace-nowrap transition cursor-pointer shrink-0"
                  >
                    <span>{qp.labelPa}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2 PRIMARY MODES: BLANK PAGE vs LINED PAGE vs TYPED             */}
        {/* ============================================================== */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>ਲੈਟਰ ਪੈਡ ਪੇਜ ਸਟਾਈਲ ਚੁਣੋ (Select Letterpad Style):</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-bold">
                ਮੌਜੂਦਾ ਚੋਣ:
              </span>
              <span
                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                  pageMode === 'blank'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : pageMode === 'lined'
                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {pageMode === 'blank'
                  ? '📄 ਬਿਲਕੁਲ ਖਾਲੀ (Blank Page)'
                  : pageMode === 'lined'
                  ? '📝 ਲਾਈਨਾਂ ਵਾਲਾ (Ruled / Lined Page)'
                  : '✍️ ਟਾਈਪ ਕੀਤਾ ਪੱਤਰ'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Blank Page Option */}
            <button
              type="button"
              onClick={() => setPageMode('blank')}
              className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                pageMode === 'blank'
                  ? 'bg-amber-50/90 border-amber-500 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className={`p-2.5 rounded-xl font-bold shrink-0 shadow-xs ${pageMode === 'blank' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <File className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>੧. ਬਿਲਕੁਲ ਖਾਲੀ / Blank ਪੇਜ</span>
                  {pageMode === 'blank' && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-normal font-medium">
                  ਹੈਡਰ + ਕੋਰਾ ਚਿੱਟਾ ਪੰਨਾ + ਮੋਹਰ ਤੇ ਦਸਤਖ਼ਤ (ਪ੍ਰਿੰਟ ਕੱਢ ਕੇ ਪੈੱਨ ਨਾਲ ਲਿਖਣ ਲਈ)
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>100% ਕੋਰਾ ਖਾਲੀ ਕਾਗਜ਼ • ਬਿਨਾਂ GST</span>
                </div>
              </div>
            </button>

            {/* 2. Lined / Ruled Page Option */}
            <button
              type="button"
              onClick={() => setPageMode('lined')}
              className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                pageMode === 'lined'
                  ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-400/50'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className={`p-2.5 rounded-xl font-bold shrink-0 shadow-xs ${pageMode === 'lined' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <AlignLeft className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>੨. ਲਾਈਨਾਂ ਵਾਲਾ / Lined ਪੇਜ</span>
                  {pageMode === 'lined' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-normal font-medium">
                  ਹੈਡਰ + ਨੋਟਬੁੱਕ ਵਾਂਗ ਸਾਫ਼ ਲਾਈਨਾਂ + ਮੋਹਰ ਤੇ ਦਸਤਖ਼ਤ (ਸਿੱਧੀ ਤੇ ਸਾਫ਼ ਲਿਖਾਈ ਲਈ)
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-blue-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span>ਸਿੱਧੀਆਂ ਹਰੀਜ਼ੋਂਟਲ ਲਾਈਨਾਂ + ਖੱਬਾ ਹਾਸ਼ੀਆ</span>
                </div>
              </div>
            </button>

            {/* 3. Typed / Formatted Letter Option */}
            <button
              type="button"
              onClick={() => setPageMode('typed')}
              className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                pageMode === 'typed'
                  ? 'bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-400/50'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className={`p-2.5 rounded-xl font-bold shrink-0 shadow-xs ${pageMode === 'typed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>੩. ਟਾਈਪ ਕੀਤਾ / AI ਪੱਤਰ</span>
                  {pageMode === 'typed' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-normal font-medium">
                  ਸਕ੍ਰੀਨ 'ਤੇ ਟਾਈਪ ਜਾਂ Gemini AI ਵੱਲੋਂ ਲਿਖਵਾ ਕੇ ਸਿੱਧਾ ਕੰਪਿਊਟਰਾਈਜ਼ਡ ਪੱਤਰ ਪ੍ਰਿੰਟ ਕਰੋ
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>ਕੰਪਿਊਟਰਾਈਜ਼ਡ ਟਾਈਪਿੰਗ + ਵਟਸਐਪ ਸ਼ੇਅਰ</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Lined Page Controls if Lined Selected */}
        {pageMode === 'lined' && (
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-blue-950">ਲਾਈਨਾਂ ਦੀ ਗਿਣਤੀ:</span>
              <div className="flex items-center gap-1">
                {[18, 22, 26, 30].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setLineCount(cnt)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                      lineCount === cnt
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cnt} ਲਾਈਨਾਂ
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold text-blue-950">ਲਾਈਨ ਸਟਾਈਲ:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLineStyle('blue')}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                    lineStyle === 'blue' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  ਹਲਕਾ ਨੀਲਾ (Classic Blue)
                </button>
                <button
                  type="button"
                  onClick={() => setLineStyle('slate')}
                  className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                    lineStyle === 'slate' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  ਗਰੇ (Slate)
                </button>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-blue-950 ml-2">
                <input
                  type="checkbox"
                  checked={showLeftMargin}
                  onChange={(e) => setShowLeftMargin(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>ਖੱਬਾ ਹਾਸ਼ੀਆ (Margin Line)</span>
              </label>
            </div>
          </div>
        )}

        {/* Ready-Made Letter Templates if Typed Selected */}
        {pageMode === 'typed' && (
          <div>
            <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>ਰਵਾਇਤੀ ਸਰਕਾਰੀ ਮੰਡੀ ਟੈਂਪਲੇਟ ਚੁਣੋ (Pre-set Templates):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    activePresetId === preset.id
                      ? 'bg-indigo-900 text-amber-300 border-indigo-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{preset.titlePa}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mandi Scope & Firm Options Bar */}
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-amber-950 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>ਮੰਡੀ ਫਰਮ ਐਡਰੈੱਸ:</span>
            </span>
            <div className="min-w-[340px]">
              <select
                id="letterhead-mandi-scope-dropdown"
                value={mandiScope}
                onChange={(e) => setMandiScope(e.target.value as MandiScopeType)}
                className="w-full text-xs font-black py-2 px-3 rounded-lg border-2 border-amber-600 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
                title="ਲੈਟਰਪੈਡ ਦਾਣਾ ਮੰਡੀ ਸ਼ਾਖਾ ਡ੍ਰੌਪਡਾਊਨ ਲਿਸਟ"
              >
                <option value="both" className="font-bold py-1">
                  {ALL_MANDIS_DROPDOWN_LABEL}
                </option>
                <option value="kang-khurd" className="font-bold py-1">
                  [ MANDI BRANCH: DANA MANDI KANG KHURD (ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ) ]
                </option>
                <option value="mehrajwala" className="font-bold py-1">
                  [ MANDI BRANCH: DANA MANDI MEHRAJWALA (ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ) ]
                </option>
                <option value="kamalpur" className="font-bold py-1">
                  [ MANDI BRANCH: DANA MANDI KAMALPUR (ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ) ]
                </option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMandiScope('kang-khurd')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  mandiScope === 'kang-khurd'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ਕਾਂਗ ਖੁਰਦ
              </button>
              <button
                type="button"
                onClick={() => setMandiScope('mehrajwala')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  mandiScope === 'mehrajwala'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ਮਹਿਰਾਜਵਾਲਾ
              </button>
              <button
                type="button"
                onClick={() => setMandiScope('kamalpur')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  mandiScope === 'kamalpur'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ਕਮਾਲਪੁਰ
              </button>
              <button
                type="button"
                onClick={() => setMandiScope('both')}
                className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  mandiScope === 'both'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ਸਾਰੀਆਂ ਮੰਡੀਆਂ
              </button>
            </div>
          </div>

          {/* Signature & Stamp Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">ਦਸਤਖ਼ਤ:</span>
              <button
                type="button"
                onClick={() => setSignatureStyle('digital')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  signatureStyle === 'digital' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                ਡਿਜੀਟਲ ਸਾਈਨ
              </button>
              <button
                type="button"
                onClick={() => setSignatureStyle('manual')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  signatureStyle === 'manual' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                ਪੈੱਨ ਲਈ ਲਾਈਨ
              </button>
              <button
                type="button"
                onClick={() => setSignatureStyle('both')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                  signatureStyle === 'both' ? 'bg-indigo-100 text-indigo-900 border-indigo-300' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                ਦੋਵੇਂ
              </button>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={includeStamp}
                onChange={(e) => setIncludeStamp(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>ਮੋਹਰ (Mohar)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>ਵਾਟਰਮਾਰਕ</span>
            </label>
          </div>
        </div>

        {/* Date & Ref No Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-100 text-xs items-center">
          <div className="sm:col-span-2 flex items-center gap-2">
            <span className="font-bold text-slate-700 whitespace-nowrap">Date & Ref ਸਟਾਈਲ:</span>
            <button
              type="button"
              onClick={() => setRefDateFormat('dots')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                refDateFormat === 'dots'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ਡਾਟਿਡ ਖਾਲੀ (Date: ...... Ref: ......)
            </button>
            <button
              type="button"
              onClick={() => setRefDateFormat('filled')}
              className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                refDateFormat === 'filled'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ਭਰਿਆ ਹੋਇਆ (Type Values)
            </button>
          </div>

          {refDateFormat === 'filled' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ਰੈਫਰੈਂਸ ਨੰਬਰ (Ref No):</label>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">ਮਿਤੀ (Date):</label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. THE ACTUAL WORLD-CLASS A4 LETTERPAD SHEET (PRINT OPTIMIZED) */}
      {/* ============================================================== */}
      <div className="flex justify-center print:p-0 print:m-0">
        <div
          id="official-firm-letterpad"
          className="w-full max-w-[210mm] min-h-[297mm] bg-white border border-slate-300 shadow-2xl rounded-sm p-8 sm:p-12 relative flex flex-col justify-between print:shadow-none print:border-none print:max-w-none print:w-full print:p-6 print:min-h-screen text-slate-900 font-serif"
          style={{ boxSizing: 'border-box' }}
        >
          {/* Subtle Watermark in Background */}
          {showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.035] overflow-hidden">
              <div className="text-center transform -rotate-12">
                <div className="text-[120px] font-black text-slate-900 tracking-tighter">ੴ</div>
                <div className="text-[44px] font-black uppercase tracking-widest text-slate-900 font-sans">
                  {currentFirmNameEn}
                </div>
                <div className="text-[17px] font-bold text-slate-800">
                  DANA MANDI • KANG KHURD / MEHRAJWALA / KAMALPUR
                </div>
              </div>
            </div>
          )}

          {/* Top Section */}
          <div className="space-y-4 relative z-10 flex flex-col flex-1">
            {/* Auspicious Inscription */}
            <div className="text-center border-b border-amber-900/20 pb-1">
              <span className="text-[11px] font-bold text-amber-900 tracking-wider">
                ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥
              </span>
            </div>

            {/* GRAND FIRM LETTERHEAD HEADER */}
            <header className="border-b-2 border-slate-900 pb-3">
              {/* Meta Grid Top: Licence, WITHOUT GST, Mobile */}
              <div className="flex items-center justify-between text-[11px] font-sans text-slate-600 border-b border-slate-200 pb-1.5 mb-2 font-bold flex-wrap gap-1">
                <div>
                  <span>ਮਾਰਕੀਟ ਕਮੇਟੀ: </span>
                  <strong className="text-slate-900">{activeFirm.marketCommitteePa || 'ਲੋਹੀਆਂ ਖਾਸ'}</strong>
                  <span className="mx-1 text-slate-400">|</span>
                  <span>ਲਾਇਸੰਸ: </span>
                  <strong className="text-slate-900 font-mono">{currentLicence}</strong>
                </div>
                <div>
                  {/* WITHOUT GST - Specifically requested by user: Without GST number dono hi */}
                  <span className="text-slate-800 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                    <span>ਪੰਜਾਬ ਮੰਡੀ ਬੋਰਡ ਮਾਨਤਾ ਪ੍ਰਾਪਤ (ਆੜ੍ਹਤ ਲਾਇਸੰਸ)</span>
                  </span>
                </div>
                <div>
                  <span>ਮੋਬਾਈਲ: </span>
                  <strong className="text-slate-900 font-mono">{activeFirm.mobile || '98765-43210'}</strong>
                </div>
              </div>

              {/* Central Grand Title */}
              <div className="text-center space-y-1 my-1">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase font-serif">
                  {currentFirmNameEn}
                </h1>
                <div className="text-lg sm:text-xl font-black text-amber-950 font-serif">
                  {currentFirmNamePa}
                </div>
                <div className="text-xs font-bold text-slate-700 tracking-widest uppercase font-sans">
                  COMMISSION AGENTS & GRAIN MERCHANTS (ਆੜ੍ਹਤੀਏ ਅਤੇ ਅਨਾਜ ਵਪਾਰੀ)
                </div>
                <div className="text-xs font-semibold text-slate-800 flex items-center justify-center gap-1 mt-1 font-sans">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 inline shrink-0" />
                  <span>
                    {getMandiAddressText()}
                  </span>
                </div>
              </div>

              {/* Decorative Double Rule */}
              <div className="mt-2.5 pt-0.5 border-t-2 border-slate-900 border-dashed"></div>
            </header>

            {/* REF NO. AND DATE BAR */}
            <div className="flex items-center justify-between text-xs font-sans font-bold border-b border-slate-200 pb-2 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800">Ref. No. :</span>
                {refDateFormat === 'dots' ? (
                  <span className="font-mono text-slate-500 tracking-widest min-w-[170px] inline-block border-b border-dotted border-slate-400 text-sm">
                    ...................................................
                  </span>
                ) : (
                  <span className="font-mono font-black text-slate-950 px-1 border-b border-slate-400 min-w-[140px] inline-block">
                    {refNo}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800">Date :</span>
                {refDateFormat === 'dots' ? (
                  <span className="font-mono text-slate-500 tracking-widest min-w-[140px] text-center inline-block border-b border-dotted border-slate-400 text-sm">
                    ................................
                  </span>
                ) : (
                  <span className="font-mono font-black text-slate-950 px-1 border-b border-slate-400 min-w-[110px] text-center inline-block">
                    {date}
                  </span>
                )}
              </div>
            </div>

            {/* ============================================================== */}
            {/* OPTION 1: COMPLETELY BLANK WRITING PAGE CANVAS (ਬਿਲਕੁਲ ਖਾਲੀ)   */}
            {/* ============================================================== */}
            {pageMode === 'blank' && (
              <div className="flex-1 w-full min-h-[520px] sm:min-h-[560px] flex flex-col justify-center items-center p-4 relative my-2">
                <div className="w-full h-full border border-dashed border-slate-200/80 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-400 text-xs select-none print:hidden bg-slate-50/40">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                    <File className="w-6 h-6" />
                  </div>
                  <span className="font-black text-slate-800 text-sm">
                    ਬਿਲਕੁਲ ਖਾਲੀ (Blank) ਲੈਟਰ ਪੈਡ ਪੰਨਾ • {currentFirmNamePa}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1.5 max-w-md leading-relaxed font-medium">
                    ਇਹ ਹਿੱਸਾ ਪ੍ਰਿੰਟਿੰਗ ਜਾਂ PDF ਡਾਊਨਲੋਡ ਵਿੱਚ ਬਿਲਕੁਲ ਕੋਰਾ ਤੇ ਸਾਫ਼ ਰਹੇਗਾ। ਤੁਸੀਂ ਪ੍ਰਿੰਟ ਕੱਢ ਕੇ ਆਪਣੀ ਮਰਜ਼ੀ ਅਨੁਸਾਰ ਪੈੱਨ ਨਾਲ ਲਿਖ ਸਕਦੇ ਹੋ।
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-amber-900 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                    <span>ਉੱਪਰ {currentFirmNamePa} ਹੈਡਰ + ਹੇਠਾਂ ਮੋਹਰ ਤੇ {proprietorName} ਦਸਤਖ਼ਤ ਮੌਜੂਦ ਹਨ</span>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* OPTION 2: LINED / RULED WRITING PAGE CANVAS (ਲਾਈਨਾਂ ਵਾਲਾ ਪੰਨਾ)    */}
            {/* ============================================================== */}
            {pageMode === 'lined' && (
              <div className="flex-1 w-full min-h-[520px] sm:min-h-[560px] flex flex-col justify-between py-2 relative my-2">
                {/* Left Margin Line */}
                {showLeftMargin && (
                  <div
                    className="absolute top-0 bottom-0 left-10 sm:left-14 border-r-2 border-rose-400/70 print:border-rose-400 pointer-events-none"
                    style={{ zIndex: 1 }}
                  />
                )}

                {/* Ruled Horizontal Lines */}
                <div className="w-full flex flex-col justify-between h-full space-y-[22px] sm:space-y-[24px] pt-1">
                  {Array.from({ length: lineCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-full border-b ${
                        lineStyle === 'blue'
                          ? 'border-blue-300/80 print:border-blue-400'
                          : lineStyle === 'dashed'
                          ? 'border-slate-300 border-dashed print:border-slate-400'
                          : 'border-slate-300 print:border-slate-400'
                      }`}
                      style={{ height: '0px' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* OPTION 3: TYPED / GEMINI AI FORMATTED LETTER (ਟਾਈਪ ਕੀਤਾ ਪੱਤਰ)  */}
            {/* ============================================================== */}
            {pageMode === 'typed' && (
              <div className="space-y-3 flex-1 flex flex-col justify-start pt-2">
                {/* RECIPIENT BLOCK (Editable) */}
                <div>
                  <textarea
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    rows={3}
                    placeholder="ਸੇਵਾ ਵਿਖੇ (To)..."
                    className="w-full text-xs font-semibold text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-slate-50/50 rounded-lg p-1.5 transition resize-none leading-relaxed font-sans"
                  />
                </div>

                {/* SUBJECT LINE (Editable) */}
                <div>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="ਵਿਸ਼ਾ (Subject)..."
                    className="w-full text-xs font-black text-slate-950 underline bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-slate-50/50 rounded-lg p-1.5 transition font-serif"
                  />
                </div>

                {/* MAIN LETTER BODY CONTENT (Editable Rich Multiline Area) */}
                <div className="flex-1">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={11}
                    placeholder="ਪੱਤਰ ਦਾ ਵੇਰਵਾ ਇੱਥੇ ਲਿਖੋ..."
                    className="w-full text-[13px] leading-relaxed text-slate-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-slate-50/50 rounded-lg p-2 transition font-serif whitespace-pre-wrap resize-y"
                  />
                </div>

                {/* ENCLOSURES (ਨੱਥੀ) */}
                {enclosure && (
                  <div className="pt-2 text-xs font-bold text-slate-700">
                    <input
                      type="text"
                      value={enclosure}
                      onChange={(e) => setEnclosure(e.target.value)}
                      className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 p-1 rounded font-sans text-xs italic"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* BOTTOM FOOTER: PROPRIETOR MOHAR & SIGNATURE                    */}
          {/* ============================================================== */}
          <footer className="pt-6 border-t border-slate-200 mt-6 relative z-10 font-sans">
            <div className="flex items-end justify-between gap-4">
              {/* Left Side: Official Mandi Round Mohar / Stamp */}
              <div className="flex items-center">
                {includeStamp && (
                  <div
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-indigo-700/80 p-1 flex items-center justify-center transform -rotate-3 select-none shadow-xs"
                    style={{ color: '#3730a3' }}
                    title="Official Firm Stamp / Mohar"
                  >
                    <div className="w-full h-full rounded-full border-2 border-indigo-800 flex flex-col items-center justify-between p-2 text-center text-indigo-900 font-sans">
                      <div className="text-[9px] font-black tracking-wider uppercase">
                        ★ {currentFirmNameEn} ★
                      </div>
                      <div className="my-auto">
                        <div className="text-[10px] font-extrabold leading-tight">
                          DANA MANDI
                        </div>
                        <div className="text-[8px] font-black text-indigo-900 uppercase">
                          {getMoharMandiName()}
                        </div>
                      </div>
                      <div className="text-[9px] font-black border-t border-indigo-500 pt-0.5 tracking-wide">
                        PROPRIETOR
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Signature Proprietor & Firm Name */}
              <div className="text-right space-y-1 min-w-[210px]">
                <div className="text-xs font-bold text-slate-800 font-serif">
                  ਵਾਸਤੇ: <strong>ਮੈਸ. {currentFirmNamePa}</strong>
                </div>
                <div className="text-[11px] text-slate-500 font-sans font-medium">
                  For {currentFirmNameEn}
                </div>

                {/* Handwritten Script Signature */}
                {(signatureStyle === 'digital' || signatureStyle === 'both') && (
                  <div className="py-1 my-1 flex justify-end">
                    <div
                      className="font-serif italic font-bold text-2xl text-blue-900 select-none tracking-wide"
                      style={{
                        fontFamily: 'cursive, "Brush Script MT", "Segoe Script", serif',
                        transform: 'rotate(-4deg)'
                      }}
                    >
                      {proprietorName}
                    </div>
                  </div>
                )}

                {/* Manual Signature Underline if selected */}
                {(signatureStyle === 'manual' || signatureStyle === 'both') && (
                  <div className="pt-6 pb-1">
                    <div className="border-b border-slate-700 w-36 ml-auto"></div>
                    <div className="text-[10px] text-slate-500 pt-0.5">
                      (ਪੈੱਨ ਨਾਲ ਦਸਤਖ਼ਤ ਕਰੋ)
                    </div>
                  </div>
                )}

                {/* Printed Sign Name & Designation */}
                <div className="pt-1 border-t border-slate-400 inline-block text-right">
                  <div className="text-xs font-black text-slate-950 font-serif">
                    ({proprietorNamePa} / {proprietorName})
                  </div>
                  <div className="text-[11px] font-black text-amber-950 font-sans">
                    ਪ੍ਰੋਪਰਾਈਟਰ (Proprietor)
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Mandi Details */}
            <div className="mt-6 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-sans">
              <span>{activeFirm.address || 'Grain Market Yard • Punjab'}</span>
              <span>Computerized Mandi Management System • Punjab</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
