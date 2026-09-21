import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Wheat,
  Scale,
  Truck,
  PackageCheck,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  ArrowRight,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { formatKgToQulKg, formatCurrency } from '../../utils/calculations';

interface TodayGlanceBannerProps {
  onOpenBoli?: () => void;
  onOpenBags?: () => void;
  onOpenLifting?: () => void;
}

export const TodayGlanceBanner: React.FC<TodayGlanceBannerProps> = ({
  onOpenBoli,
  onOpenBags,
  onOpenLifting
}) => {
  const {
    bagsEntries,
    leftingRecords,
    boliRecords,
    dailyPurchaseRecords,
    activeFirm,
    settings,
    setActiveSection,
    language,
    activeCrop,
    activeCropConfig
  } = useMandi();

  const isEn = language === 'en';

  // Format date helper DD/MM/YYYY
  const getFormattedDate = (dateObj: Date): string => {
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const todayStr = useMemo(() => getFormattedDate(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return getFormattedDate(y);
  }, []);

  // Selected Date Filter State (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [customDateInput, setCustomDateInput] = useState<string>('');
  const [showCustomDate, setShowCustomDate] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Normalize date comparison (supports both DD/MM/YYYY and YYYY-MM-DD)
  const isDateMatch = (recordDate?: string, targetDate?: string) => {
    if (!recordDate || !targetDate) return false;
    if (recordDate === targetDate) return true;

    // Try converting YYYY-MM-DD <-> DD/MM/YYYY
    if (targetDate.includes('/')) {
      const [d, m, y] = targetDate.split('/');
      const alt = `${y}-${m}-${d}`;
      if (recordDate === alt) return true;
    } else if (targetDate.includes('-')) {
      const [y, m, d] = targetDate.split('-');
      const alt = `${d}/${m}/${y}`;
      if (recordDate === alt) return true;
    }
    return false;
  };

  // 1. Today's Boli Records
  const dateBoliRecords = useMemo(() => {
    return boliRecords.filter(r => isDateMatch(r.date, selectedDate));
  }, [boliRecords, selectedDate]);

  // 2. Today's Weighment Records (Bags Entries)
  const dateBagsEntries = useMemo(() => {
    return bagsEntries.filter(r => isDateMatch(r.date, selectedDate));
  }, [bagsEntries, selectedDate]);

  // 3. Today's Lifting Records
  const dateLiftingRecords = useMemo(() => {
    return leftingRecords.filter(r => isDateMatch(r.date, selectedDate));
  }, [leftingRecords, selectedDate]);

  // Calculations for Today
  // Arrival: from Boli heaps or estimated
  const arrivalBags = useMemo(() => {
    const boliBags = dateBoliRecords.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
    const weighmentBags = dateBagsEntries.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
    return Math.max(boliBags, weighmentBags);
  }, [dateBoliRecords, dateBagsEntries]);

  const arrivalHeapsCount = dateBoliRecords.length || (dateBagsEntries.length > 0 ? dateBagsEntries.length : 0);

  // Weighment Metrics
  const weighedBags = useMemo(() => {
    return dateBagsEntries.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
  }, [dateBagsEntries]);

  const weighedWeightKg = useMemo(() => {
    return dateBagsEntries.reduce((sum, r) => sum + (Number(r.grandTotalKg) || 0), 0);
  }, [dateBagsEntries]);

  const weighedWeightBreakdown = useMemo(() => {
    return formatKgToQulKg(weighedWeightKg);
  }, [weighedWeightKg]);

  const weighedTotalValue = useMemo(() => {
    return dateBagsEntries.reduce((sum, r) => sum + (Number(r.netAmount ?? r.totalAmount) || 0), 0);
  }, [dateBagsEntries]);

  // Lifting Metrics
  const liftedBags = useMemo(() => {
    return dateLiftingRecords.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
  }, [dateLiftingRecords]);

  const liftedWeightKg = useMemo(() => {
    return dateLiftingRecords.reduce((sum, r) => sum + (Number(r.netWeightKg) || 0), 0);
  }, [dateLiftingRecords]);

  const liftedWeightBreakdown = useMemo(() => {
    return formatKgToQulKg(liftedWeightKg);
  }, [liftedWeightKg]);

  const trucksDispatched = dateLiftingRecords.length;

  // Yard / Pharr Balance
  const dayYardBalance = weighedBags - liftedBags;

  // Overall Season Stock in Yard
  const totalSeasonWeighedBags = useMemo(() => {
    return bagsEntries.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
  }, [bagsEntries]);

  const totalSeasonLiftedBags = useMemo(() => {
    return leftingRecords.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
  }, [leftingRecords]);

  const totalSeasonYardStock = totalSeasonWeighedBags - totalSeasonLiftedBags;

  // Handle Custom Date select
  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDateInput) {
      // Convert YYYY-MM-DD to DD/MM/YYYY
      const parts = customDateInput.split('-');
      if (parts.length === 3) {
        const dmy = `${parts[2]}/${parts[1]}/${parts[0]}`;
        setSelectedDate(dmy);
        setShowCustomDate(false);
      }
    }
  };

  const isTodaySelected = selectedDate === todayStr;

  return (
    <div className="space-y-3">
      {/* Container with High-Impact Contrast */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-700/60 relative overflow-hidden">
        
        {/* Subtle Decorative Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none" />

        {/* Top Header Row: Pulse Badge, Date Toggle, Day Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/70 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute" />
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>ਅੱਜ ਦਾ ਮੰਡੀ ਸਾਰ (Today's Live Mandi Pulse)</span>
                </h2>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-mono text-[10px] font-black rounded-full border border-emerald-500/30">
                  {selectedDate}
                </span>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[10px] rounded-full border border-amber-500/40">
                  {activeCropConfig.namePa} • {activeCropConfig.defaultBagWeightKg} Kg/ਬੋਰੀ
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">
                ਅੱਜ ਦੀ ਮੰਡੀ ਆਮਦ, ਤੁਲਾਈ, ਲਿਫਟਿੰਗ ਅਤੇ ਫੜ੍ਹ 'ਤੇ ਬਕਾਇਆ ਸਟਾਕ ਦਾ ਲਾਈਵ ਹਿਸਾਬ
              </p>
            </div>
          </div>

          {/* Date Selector & Print Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Pills */}
            <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1 text-xs">
              <button
                onClick={() => {
                  setSelectedDate(todayStr);
                  setShowCustomDate(false);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                  selectedDate === todayStr
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                ਅੱਜ (Today)
              </button>
              <button
                onClick={() => {
                  setSelectedDate(yesterdayStr);
                  setShowCustomDate(false);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                  selectedDate === yesterdayStr
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                ਕੱਲ੍ਹ (Yesterday)
              </button>
              <button
                onClick={() => setShowCustomDate(!showCustomDate)}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] flex items-center gap-1 ${
                  showCustomDate || (selectedDate !== todayStr && selectedDate !== yesterdayStr)
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>ਤਾਰੀਖ ਚੁਣੋ</span>
              </button>
            </div>

            {/* Print Today's Mandi Day Sheet Button */}
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-600 shadow-2xs cursor-pointer active:scale-95"
              title="Print Today's Mandi Summary Sheet"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>ਡੇਲੀ ਸਮਰੀ ਪ੍ਰਿੰਟ</span>
            </button>
          </div>
        </div>

        {/* Custom Date Form (if opened) */}
        {showCustomDate && (
          <form onSubmit={handleCustomDateSubmit} className="pt-2 pb-1 flex items-center gap-2">
            <span className="text-xs text-slate-300">ਮਿਤੀ ਚੁਣੋ:</span>
            <input
              type="date"
              value={customDateInput}
              onChange={(e) => setCustomDateInput(e.target.value)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs"
            >
              ਦੇਖੋ
            </button>
          </form>
        )}

        {/* The 3 Core Pillars (Arrival -> Weighment -> Lifting) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          
          {/* Pillar 1: ਅੱਜ ਦੀ ਆਮਦ (Today's Arrival) */}
          <div className="bg-slate-950/75 rounded-xl p-3.5 border border-amber-500/30 hover:border-amber-500/60 transition shadow-inner group flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Wheat className="w-3.5 h-3.5" />
                  <span>੧. ਅੱਜ ਦੀ ਆਮਦ (Today Arrival)</span>
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tracking-tight">
                  {arrivalBags}{' '}
                  <span className="text-xs font-bold text-amber-300">ਬੋਰੀਆਂ</span>
                </div>
              </div>
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                ਢੇਰੀਆਂ / ਬੋਲੀਆਂ: <strong className="text-white font-mono">{arrivalHeapsCount}</strong>
              </span>
              <button
                onClick={() => {
                  if (onOpenBoli) onOpenBoli();
                  else setActiveSection('boli');
                }}
                className="text-amber-300 hover:text-amber-200 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition"
              >
                <span>ਬੋਲੀ ਰਜਿਸਟਰ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pillar 2: ਅੱਜ ਦੀ ਤੁਲਾਈ (Today's Weighment) */}
          <div className="bg-slate-950/75 rounded-xl p-3.5 border border-emerald-500/30 hover:border-emerald-500/60 transition shadow-inner group flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" />
                  <span>੨. ਅੱਜ ਦੀ ਤੁਲਾਈ (Today Weighment)</span>
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tracking-tight">
                  {weighedBags}{' '}
                  <span className="text-xs font-bold text-emerald-300">ਬੋਰੀਆਂ</span>
                </div>
              </div>
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <div className="text-xs font-mono text-emerald-200 font-bold flex items-center justify-between">
                <span>ਵਜ਼ਨ: {weighedWeightBreakdown.displayEn}</span>
                <span className="text-[11px] text-slate-300">{formatCurrency(weighedTotalValue)}</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                ਪਰਚੀਆਂ: <strong className="text-white font-mono">{dateBagsEntries.length}</strong>
              </span>
              <button
                onClick={() => {
                  if (onOpenBags) onOpenBags();
                  else setActiveSection('bags-entry');
                }}
                className="text-emerald-300 hover:text-emerald-200 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition"
              >
                <span>ਤੁਲਾਈ ਐਂਟਰੀ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pillar 3: ਅੱਜ ਦੀ ਲਿਫਟਿੰਗ (Today's Lifting) */}
          <div className="bg-slate-950/75 rounded-xl p-3.5 border border-blue-500/30 hover:border-blue-500/60 transition shadow-inner group flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>੩. ਅੱਜ ਦੀ ਲਿਫਟਿੰਗ (Today Lifting)</span>
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono tracking-tight">
                  {liftedBags}{' '}
                  <span className="text-xs font-bold text-blue-300">ਬੋਰੀਆਂ</span>
                </div>
              </div>
              <div className="p-2 bg-blue-500/20 text-blue-300 rounded-xl border border-blue-500/30">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <div className="text-xs font-mono text-blue-200 font-bold flex items-center justify-between">
                <span>ਵਜ਼ਨ: {liftedWeightBreakdown.displayEn}</span>
                <span className="text-[11px] text-slate-300">{trucksDispatched} ਟਰੱਕ ਰਵਾਨਾ</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                ਗੇਟ ਪਾਸ: <strong className="text-white font-mono">{dateLiftingRecords.length}</strong>
              </span>
              <button
                onClick={() => {
                  if (onOpenLifting) onOpenLifting();
                  else setActiveSection('lefting');
                }}
                className="text-blue-300 hover:text-blue-200 font-black text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition"
              >
                <span>ਲਿਫਟਿੰਗ ਰਜਿਸਟਰ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Pharr / Yard Live Stock Status */}
        <div className="mt-3.5 bg-slate-950/90 rounded-xl p-3 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-400 font-medium">ਅੱਜ ਦਾ ਫੜ੍ਹ 'ਤੇ ਬਕਾਇਆ (Today Yard Stock):</span>
              <span className={`font-mono font-black ${dayYardBalance > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                {dayYardBalance > 0 ? `+${dayYardBalance}` : dayYardBalance} ਬੋਰੀਆਂ
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-400 font-medium">ਸੀਜ਼ਨ ਦਾ ਕੁੱਲ ਮੰਡੀ ਯਾਰਡ ਸਟਾਕ (Total Season Yard Balance):</span>
              <span className="font-mono font-black text-white text-sm">
                {totalSeasonYardStock} ਬੋਰੀਆਂ
              </span>
            </div>
          </div>

          {/* Lifting Status Indicator Badge */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {totalSeasonYardStock > 0 ? (
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>{totalSeasonYardStock} ਬੋਰੀਆਂ ਲਿਫਟ ਹੋਣੀਆਂ ਬਾਕੀ ਹਨ</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>ਮੰਡੀ ਯਾਰਡ ਵਿੱਚੋਂ ਸਾਰਾ ਮਾਲ ਲਿਫਟ ਹੋ ਚੁੱਕਾ ਹੈ</span>
              </span>
            )}
          </div>

        </div>

      </div>

      {/* ============================================================== */}
      {/* PRINT MODAL: Today's Mandi Day-Sheet Preview */}
      {/* ============================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Header Controls */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-black">
                  ਅੱਜ ਦਾ ਰੋਜ਼ਾਨਾ ਮੰਡੀ ਸਾਰ ਰਿਪੋਰਟ (Mandi Daily Transaction Sheet)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>ਪ੍ਰਿੰਟ ਕਰੋ (Print Sheet)</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6 text-xs text-slate-800 printable-area">
              
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {activeFirm?.name || settings.firmNameEn || 'Jammu Trading Company'}
                </h1>
                <p className="text-sm font-bold text-slate-700">
                  {settings.mandiNamePa || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ'} (Mandi Grain Market)
                </p>
                <p className="text-xs text-slate-500">
                  ਕਮਿਸ਼ਨ ਏਜੰਟ ਤੇ ਆੜ੍ਹਤ | ਮੋਬਾਈਲ: {activeFirm?.mobile || settings.firmMobile || '98147-74651'}
                </p>
                <div className="inline-block mt-1 px-4 py-1 bg-slate-100 border border-slate-300 rounded-full font-black text-xs">
                  ਰੋਜ਼ਾਨਾ ਮੰਡੀ ਕਾਰਜ ਸਾਰ • ਮਿਤੀ: {selectedDate}
                </div>
              </div>

              {/* 4 Block Metric Summary Grid */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">ਆਮਦ (Arrival)</div>
                  <div className="text-lg font-black text-amber-950 font-mono mt-0.5">{arrivalBags} ਬੋਰੀਆਂ</div>
                  <div className="text-[10px] text-amber-700">{arrivalHeapsCount} ਢੇਰੀਆਂ</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">ਤੁਲਾਈ (Weighed)</div>
                  <div className="text-lg font-black text-emerald-950 font-mono mt-0.5">{weighedBags} ਬੋਰੀਆਂ</div>
                  <div className="text-[10px] text-emerald-700">{weighedWeightBreakdown.displayEn}</div>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-[11px] font-bold text-blue-800 uppercase">ਲਿਫਟਿੰਗ (Lifted)</div>
                  <div className="text-lg font-black text-blue-950 font-mono mt-0.5">{liftedBags} ਬੋਰੀਆਂ</div>
                  <div className="text-[10px] text-blue-700">{trucksDispatched} ਟਰੱਕ ਰਵਾਨਾ</div>
                </div>

                <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                  <div className="text-[11px] font-bold text-slate-800 uppercase">ਫੜ੍ਹ 'ਤੇ ਸਟਾਕ (Stock)</div>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{dayYardBalance} ਬੋਰੀਆਂ</div>
                  <div className="text-[10px] text-slate-600">ਸੀਜ਼ਨ: {totalSeasonYardStock} ਬੋਰੀਆਂ</div>
                </div>
              </div>

              {/* Table A: Today's Weighments */}
              <div className="space-y-2">
                <h4 className="font-black text-xs text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between">
                  <span>੧. ਅੱਜ ਦੀਆਂ ਤੁਲਾਈ ਪਰਚੀਆਂ (Weighment Slips - {dateBagsEntries.length})</span>
                  <span className="font-mono text-emerald-800">ਕੁੱਲ: {formatCurrency(weighedTotalValue)}</span>
                </h4>
                {dateBagsEntries.length === 0 ? (
                  <p className="text-slate-400 italic py-2">ਇਸ ਮਿਤੀ ਨੂੰ ਕੋਈ ਤੁਲਾਈ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।</p>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                    <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                      <tr>
                        <th className="p-1.5 border-r border-slate-300">ਪਰਚੀ #</th>
                        <th className="p-1.5 border-r border-slate-300">ਕਿਸਾਨ ਦਾ ਨਾਂ</th>
                        <th className="p-1.5 border-r border-slate-300">ਪਿੰਡ</th>
                        <th className="p-1.5 border-r border-slate-300 text-right">ਬੋਰੀਆਂ</th>
                        <th className="p-1.5 border-r border-slate-300 text-right">ਵਜ਼ਨ</th>
                        <th className="p-1.5 text-right">ਕੁੱਲ ਰਕਮ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dateBagsEntries.map((e) => (
                        <tr key={e.id}>
                          <td className="p-1.5 border-r border-slate-300 font-mono font-bold">#{e.entryNumber}</td>
                          <td className="p-1.5 border-r border-slate-300 font-bold">{e.farmerNamePa || e.farmerName}</td>
                          <td className="p-1.5 border-r border-slate-300">{e.farmerVillagePa || e.farmerVillage || '—'}</td>
                          <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold">{e.bags}</td>
                          <td className="p-1.5 border-r border-slate-300 text-right font-mono">{e.grandTotalDisplay || `${e.grandTotalKg} Kg`}</td>
                          <td className="p-1.5 text-right font-mono font-bold">{formatCurrency(e.netAmount ?? e.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table B: Today's Liftings */}
              <div className="space-y-2">
                <h4 className="font-black text-xs text-slate-900 border-b border-slate-300 pb-1 flex items-center justify-between">
                  <span>੨. ਅੱਜ ਦੀ ਟਰੱਕ ਲਿਫਟਿੰਗ (Dispatched Trucks - {dateLiftingRecords.length})</span>
                  <span className="font-mono text-blue-800">ਕੁੱਲ ਬੋਰੀਆਂ: {liftedBags}</span>
                </h4>
                {dateLiftingRecords.length === 0 ? (
                  <p className="text-slate-400 italic py-2">ਇਸ ਮਿਤੀ ਨੂੰ ਕੋਈ ਟਰੱਕ ਲਿਫਟਿੰਗ ਨਹੀਂ ਹੋਈ।</p>
                ) : (
                  <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                    <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                      <tr>
                        <th className="p-1.5 border-r border-slate-300">ਗੇਟ ਪਾਸ #</th>
                        <th className="p-1.5 border-r border-slate-300">ਟਰੱਕ ਨੰਬਰ</th>
                        <th className="p-1.5 border-r border-slate-300">ਖਰੀਦਦਾਰ ਸ਼ੈਲਰ / ਏਜੰਸੀ</th>
                        <th className="p-1.5 border-r border-slate-300">ਡਰਾਈਵਰ</th>
                        <th className="p-1.5 border-r border-slate-300 text-right">ਬੋਰੀਆਂ</th>
                        <th className="p-1.5 text-right">ਸ਼ੁੱਧ ਵਜ਼ਨ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dateLiftingRecords.map((r) => (
                        <tr key={r.id}>
                          <td className="p-1.5 border-r border-slate-300 font-mono font-bold">{r.gatePassNumber}</td>
                          <td className="p-1.5 border-r border-slate-300 font-mono font-bold">{r.truckNumber}</td>
                          <td className="p-1.5 border-r border-slate-300 font-bold">{r.millerName || r.agency || '—'}</td>
                          <td className="p-1.5 border-r border-slate-300">{r.driverName} ({r.driverMobile || '—'})</td>
                          <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold">{r.bags}</td>
                          <td className="p-1.5 text-right font-mono">{r.netWeightKg} Kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 text-center text-xs font-bold text-slate-700">
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1">
                    ਦਸਤਖਤ ਆੜ੍ਹਤੀ / ਮੁਨੀਮ
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-48 mx-auto pt-1">
                    ਮੰਡੀ ਸੁਪਰਵਾਈਜ਼ਰ / ਇੰਸਪੈਕਟਰ
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
