import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Printer,
  Share2,
  Calendar,
  X,
  RefreshCw,
  Building2,
  Package,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sun,
  Database,
  Filter
} from 'lucide-react';
import { useMandi } from '../../context/MandiContext';
import {
  getAiDailyMunimSummary,
  playPunjabiSpeech,
  AiMunimSummaryResult
} from '../../services/aiService';

interface AiMunimSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Normalizes date strings (DD/MM/YYYY <-> YYYY-MM-DD) for uniform comparison
 */
function normalizeDateStr(d: string): string {
  if (!d) return '';
  const trimmed = d.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      // DD/MM/YYYY -> YYYY-MM-DD
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return trimmed;
}

export const AiMunimSummaryModal: React.FC<AiMunimSummaryModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    activeFirm,
    settings,
    dailyPurchaseRecords,
    bagsEntries,
    leftingRecords,
    farmerAdvances,
    farmerPayments,
    farmers
  } = useMandi();

  // Find all distinct recorded dates in database
  const activeRecordedDates = useMemo(() => {
    const set = new Set<string>();
    dailyPurchaseRecords.forEach((p) => p.date && set.add(normalizeDateStr(p.date)));
    bagsEntries.forEach((b) => b.date && set.add(normalizeDateStr(b.date)));
    leftingRecords.forEach((l) => l.date && set.add(normalizeDateStr(l.date)));
    farmerAdvances.forEach((a) => a.date && set.add(normalizeDateStr(a.date)));
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [dailyPurchaseRecords, bagsEntries, leftingRecords, farmerAdvances]);

  const todayIso = new Date().toISOString().split('T')[0];

  // Default to today if it has records, else latest recorded date or 'ALL'
  const initialDate = useMemo(() => {
    if (activeRecordedDates.includes(todayIso)) return todayIso;
    if (activeRecordedDates.length > 0) return activeRecordedDates[0];
    return 'ALL';
  }, [activeRecordedDates, todayIso]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<AiMunimSummaryResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speechStopFn, setSpeechStopFn] = useState<(() => void) | null>(null);

  // Fetch or re-generate summary
  const fetchSummary = async (dateParam: string) => {
    setLoading(true);
    if (speechStopFn) speechStopFn();
    setIsPlayingAudio(false);

    try {
      const isAll = dateParam === 'ALL' || !dateParam;
      const targetNorm = normalizeDateStr(dateParam);

      // Filter records by date matching both formats
      const datePurchases = dailyPurchaseRecords.filter((p) =>
        isAll || normalizeDateStr(p.date) === targetNorm || p.date === dateParam
      );
      const dateBags = bagsEntries.filter((b) =>
        isAll || normalizeDateStr(b.date) === targetNorm || b.date === dateParam
      );
      const dateLeftings = leftingRecords.filter((l) =>
        isAll || normalizeDateStr(l.date) === targetNorm || l.date === dateParam
      );
      const dateAdvances = farmerAdvances.filter((a) =>
        isAll || normalizeDateStr(a.date) === targetNorm || a.date === dateParam
      );
      const datePayments = farmerPayments.filter((p) =>
        isAll || normalizeDateStr(p.date) === targetNorm || p.date === dateParam
      );

      const firmName = activeFirm?.name || settings.firmNameEn || 'Jammu Trading Co';

      const res = await getAiDailyMunimSummary({
        date: isAll ? 'ALL' : dateParam,
        firmName,
        purchases: datePurchases,
        bags: dateBags,
        leftings: dateLeftings,
        advances: dateAdvances,
        payments: datePayments,
        farmersCount: farmers.length
      });

      setSummaryData(res);
    } catch (err) {
      console.error('Failed to load AI summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const dateToLoad = selectedDate || initialDate;
      fetchSummary(dateToLoad);
    } else {
      if (speechStopFn) speechStopFn();
      setIsPlayingAudio(false);
    }
    return () => {
      if (speechStopFn) speechStopFn();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAudio = () => {
    if (isPlayingAudio && speechStopFn) {
      speechStopFn();
      setIsPlayingAudio(false);
      return;
    }

    if (!summaryData) return;

    const audioText =
      summaryData.summaryPunjabiVoice ||
      `${summaryData.headline}। ਕੁੱਲ ਬੋਰੀਆਂ ${summaryData.highlights.totalBags}। ਫੜ੍ਹ 'ਤੇ ਸਟਾਕ ${summaryData.highlights.yardRemainingBags} ਬੋਰੀਆਂ।`;

    const player = playPunjabiSpeech(audioText, () => {
      setIsPlayingAudio(false);
    });
    setSpeechStopFn(() => player.stop);
    setIsPlayingAudio(true);
  };

  const handleShareWhatsApp = () => {
    if (!summaryData) return;
    const dateLabel = selectedDate === 'ALL' ? 'ਪੂਰਾ ਸੀਜ਼ਨ (ਸਾਰਾ ਲੇਖਾ)' : selectedDate;
    const text = `🌙 *ਰੋਜ਼ਾਨਾ ਮੁਨੀਮੀ ਰੋਜ਼ਨਾਮਚਾ (Daily AI Munim Report)*
🏛 *${activeFirm?.name || 'Jammu Trading Co'}*
📅 *ਮਿਤੀ / ਸਮਾਂ:* ${dateLabel}
---------------------------------
🌾 *ਕੁੱਲ ਬੋਰੀਆਂ ਆਮਦ:* ${summaryData.highlights.totalBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ
💰 *ਕੁੱਲ ਖਰੀਦ ਰਕਮ:* ₹${summaryData.highlights.totalPurchaseAmt.toLocaleString('en-IN')}
🚚 *ਕੁੱਲ ਲਿਫਟਿੰਗ:* ${summaryData.highlights.totalLeftingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ
📦 *ਫੜ੍ਹ 'ਤੇ ਬਾਕੀ ਸਟਾਕ:* ${summaryData.highlights.yardRemainingBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ
💵 *ਕਿਸਾਨਾਂ ਨੂੰ ਦਿੱਤਾ ਕੈਸ਼:* ₹${summaryData.highlights.totalAdvancesPaid.toLocaleString('en-IN')}
---------------------------------
⚠️ *ਮੁੱਖ ਚੇਤਾਵਨੀਆਂ:*
${summaryData.criticalAlerts.map((a) => `• ${a}`).join('\n')}

📋 *ਕੱਲ੍ਹ ਸਵੇਰ ਦੀ ਤਿਆਰੀ:*
${summaryData.nextDayPlan.map((p) => `• ${p}`).join('\n')}
---------------------------------
ਰਿਪੋਰਟ ਤਿਆਰ ਕਰਤਾ: PRO AI Mandi Munim ERP`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const isCurrentSelectionEmpty =
    summaryData &&
    summaryData.highlights.totalBags === 0 &&
    summaryData.highlights.totalPurchaseAmt === 0 &&
    summaryData.highlights.totalLeftingBags === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-none">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  ਰੋਜ਼ਾਨਾ ਮੁਨੀਮੀ ਰੋਜ਼ਨਾਮਚਾ (Daily AI Munim Summary)
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  PRO AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ਸ਼ਾਮ ਦੀ ਖਰੀਦ, ਲਿਫਟਿੰਗ, ਫੜ੍ਹ ਸਟਾਕ ਅਤੇ ਕੈਸ਼ ਫਲੋ ਦਾ ਪੂਰਾ ਬੋਲਦਾ ਆਡਿਟ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selector & Mode Toolbar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>ਮਿਆਦ (Period):</span>
            </span>

            {/* Quick Full Season Pill */}
            <button
              type="button"
              onClick={() => {
                setSelectedDate('ALL');
                fetchSummary('ALL');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedDate === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>ਸਾਰਾ ਸੀਜ਼ਨ (Full Season)</span>
            </button>

            {/* Quick Today Pill */}
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayIso);
                fetchSummary(todayIso);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                selectedDate === todayIso
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>ਅੱਜ (Today)</span>
            </button>

            {/* Active recorded dates selector */}
            {activeRecordedDates.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
                <span className="text-[11px] text-slate-500 font-semibold">ਤਰੀਕ ਚੁਣੋ:</span>
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    fetchSummary(e.target.value);
                  }}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">ਸਾਰਾ ਸੀਜ਼ਨ (ਸਾਰੇ ਰਿਕਾਰਡ)</option>
                  {activeRecordedDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
              <Calendar className="w-3 h-3 text-slate-500" />
              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    fetchSummary(e.target.value);
                  }
                }}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
              />
            </div>
          </div>

          {/* Regenerate Button */}
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchSummary(selectedDate)}
            className="px-3 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="ਮੁਨੀਮੀ ਰਿਪੋਰਟ ਦੁਬਾਰਾ ਤਿਆਰ ਕਰੋ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ਮੁੜ ਤਿਆਰ ਕਰੋ (Refresh)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-bold text-slate-800">
                PRO AI ਪੂਰੇ ਦਿਨ ਦਾ ਮੁਨੀਮੀ ਹਿਸਾਬ-ਕਿਤਾਬ ਤਿਆਰ ਕਰ ਰਿਹਾ ਹੈ...
              </p>
              <p className="text-xs text-slate-400">
                ਬੋਰੀਆਂ, ਲਿਫਟਿੰਗ, ਫੜ੍ਹ ਸਟਾਕ ਅਤੇ ਪੇਸ਼ਗੀਆਂ ਦਾ ਆਡਿਟ ਹੋ ਰਿਹਾ ਹੈ
              </p>
            </div>
          ) : summaryData ? (
            <>
              {/* Notice when current date has 0 records */}
              {isCurrentSelectionEmpty && selectedDate !== 'ALL' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      ਮਿਤੀ <strong>{selectedDate}</strong> ਦਾ ਕੋਈ ਨਵਾਂ ਖਰੀਦ ਜਾਂ ਤੋਲ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('ALL');
                      fetchSummary('ALL');
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 cursor-pointer shadow-2xs"
                  >
                    ਸਾਰੇ ਸੀਜ਼ਨ ਦਾ ਹਿਸਾਬ ਦੇਖੋ
                  </button>
                </div>
              )}

              {/* Spoken Voice Note Banner */}
              <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <h3 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-700" />
                      <span>ਪੰਜਾਬੀ ਬੋਲਦਾ ਰੋਜ਼ਨਾਮਚਾ (Audio Evening Brief)</span>
                    </h3>
                  </div>
                  <p className="text-xs text-amber-950 font-medium leading-relaxed italic">
                    "{summaryData.summaryPunjabiVoice}"
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>ਆਵਾਜ਼ ਰੋਕੋ (Stop)</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>ਪੂਰੀ ਰਿਪੋਰਟ ਸੁਣੋ (Listen)</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 Core Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total Intake */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-1">
                    <span>ਕੁੱਲ ਖਰੀਦ ਆਮਦ</span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-emerald-950 font-mono">
                    {summaryData.highlights.totalBags.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-medium text-emerald-700">ਬੋਰੀਆਂ</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    ₹{summaryData.highlights.totalPurchaseAmt.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* 2. Total Lifted */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl">
                  <div className="flex items-center justify-between text-blue-800 text-xs font-bold mb-1">
                    <span>ਲਿਫਟਿੰਗ (ਚੁਕਾਈ)</span>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-black text-blue-950 font-mono">
                    {summaryData.highlights.totalLeftingBags.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-medium text-blue-700">ਬੋਰੀਆਂ</span>
                  </div>
                  <div className="text-[11px] text-blue-700 font-semibold mt-0.5">
                    ਟਰੱਕਾਂ ਵਿੱਚ ਲੋਡ ਹੋਇਆ
                  </div>
                </div>

                {/* 3. Yard Remaining Stock */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-1">
                    <span>ਫੜ੍ਹ 'ਤੇ ਬਾਕੀ ਸਟਾਕ</span>
                    <Layers className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-amber-950 font-mono">
                    {summaryData.highlights.yardRemainingBags.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-medium text-amber-700">ਬੋਰੀਆਂ</span>
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                    ਰਾਤ ਵੇਲੇ ਫੜ੍ਹ 'ਤੇ ਮੌਜੂਦ
                  </div>
                </div>

                {/* 4. Cash Advances */}
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl">
                  <div className="flex items-center justify-between text-purple-800 text-xs font-bold mb-1">
                    <span>ਨਕਦ ਪੇਸ਼ਗੀਆਂ</span>
                    <span className="text-xs font-bold">₹</span>
                  </div>
                  <div className="text-xl font-black text-purple-950 font-mono">
                    ₹{summaryData.highlights.totalAdvancesPaid.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
                    ਕਿਸਾਨਾਂ ਨੂੰ ਅਦਾਇਗੀ
                  </div>
                </div>
              </div>

              {/* Status Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Yard Status & Storage Commentary */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>ਫੜ੍ਹ ਦੀ ਸਥਿਤੀ ਅਤੇ ਸੁਰੱਖਿਆ (Yard & Weather Stock)</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {summaryData.yardStatusText}
                  </p>
                </div>

                {/* Cash Flow Commentary */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>ਕੈਸ਼ ਫਲੋ ਅਤੇ ਉਗਰਾਹੀ (Cash Flow Audit)</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {summaryData.cashFlowText}
                  </p>
                </div>
              </div>

              {/* Critical Alerts & Warnings */}
              {summaryData.criticalAlerts && summaryData.criticalAlerts.length > 0 && (
                <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>ਜ਼ਰੂਰੀ ਮੁਨੀਮੀ ਚੇਤਾਵਨੀਆਂ (Critical Audit Discrepancies)</span>
                  </h4>
                  <ul className="space-y-1 text-xs text-rose-800">
                    {summaryData.criticalAlerts.map((alert, idx) => (
                      <li key={idx} className="flex items-start gap-2 font-semibold">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{alert}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tomorrow's Action Plan */}
              {summaryData.nextDayPlan && summaryData.nextDayPlan.length > 0 && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>ਕੱਲ੍ਹ ਸਵੇਰ ਦੀ ਕਾਰਜ ਯੋਜਨਾ (Next Day Priority Action Plan)</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-900">
                    {summaryData.nextDayPlan.map((step, idx) => (
                      <li key={idx} className="flex items-center gap-2 font-bold">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <p className="text-sm font-bold text-slate-700">
                ਰਿਪੋਰਟ ਲੋਡ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ...
              </p>
              <button
                type="button"
                onClick={() => fetchSummary(selectedDate)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-xs"
              >
                ਮੁੜ ਕੋਸ਼ਿਸ਼ ਕਰੋ (Reload)
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>A4 ਪ੍ਰਿੰਟ ਕਰੋ</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4" />
              <span>ਮਾਲਕ ਨੂੰ ਵਟਸਐਪ ਭੇਜੋ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            ਬੰਦ ਕਰੋ
          </button>
        </div>
      </div>
    </div>
  );
};
