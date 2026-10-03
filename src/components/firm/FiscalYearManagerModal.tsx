import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  Plus,
  ArrowRight,
  TrendingUp,
  X,
  ShieldAlert,
  Edit2,
  Check,
  Search,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import {
  parseFiscalYear,
  getFiscalYearDateRange,
  formatCurrency,
  isRecordInFiscalYear
} from '../../utils/calculations';
import { FarmerYearOpeningBalance } from '../../types/mandi';

interface FiscalYearManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FiscalYearManagerModal: React.FC<FiscalYearManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    fiscalYears,
    activeFiscalYear,
    setActiveFiscalYear,
    addFiscalYear,
    lockedYears,
    isYearLocked,
    toggleYearLock,
    carryForwardBalancesToNextYear,
    getFarmerOpeningBalanceForYear,
    setFarmerOpeningBalanceForYear,
    farmers,
    bagsEntries,
    dailyPurchaseRecords,
    farmerAdvances,
    getCompleteFarmerAccount,
    language
  } = useMandi();

  const { notifySaveSuccess, notifyError } = useNotification();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<'years' | 'carryForward' | 'openingBalances'>('years');

  // New Year Form
  const [newYearInput, setNewYearInput] = useState('');
  const [yearError, setYearError] = useState('');

  // Carry Forward State
  const [fromYear, setFromYear] = useState<string>(() => {
    const idx = fiscalYears.indexOf(activeFiscalYear);
    return idx > 0 ? fiscalYears[idx - 1] : fiscalYears[0] || '2025-26';
  });
  const [toYear, setToYear] = useState<string>(activeFiscalYear);
  const [isCarryingForward, setIsCarryingForward] = useState(false);
  const [carrySuccessInfo, setCarrySuccessInfo] = useState<{ count: number; totalDr: number; totalCr: number } | null>(null);

  // Opening Balances Master State
  const [selectedFyForOpening, setSelectedFyForOpening] = useState<string>(activeFiscalYear);
  const [openingSearch, setOpeningSearch] = useState('');
  const [editingFarmerId, setEditingFarmerId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'DR' | 'CR'>('DR');
  const [editNotes, setEditNotes] = useState('');

  // Suggested next year e.g. 2027-28
  const suggestedNextYear = useMemo(() => {
    if (!fiscalYears || fiscalYears.length === 0) return '2027-28';
    const parsedYears = fiscalYears.map((y) => parseFiscalYear(y).startYear);
    const maxStart = Math.max(...parsedYears);
    const nextStart = maxStart + 1;
    const nextEndShort = String((nextStart + 1) % 100).padStart(2, '0');
    return `${nextStart}-${nextEndShort}`;
  }, [fiscalYears]);

  // Compute record counts per fiscal year
  const yearStats = useMemo(() => {
    const map = new Map<string, { bags: number; purchases: number; advances: number }>();
    fiscalYears.forEach((yr) => {
      const bCount = bagsEntries.filter((b) => isRecordInFiscalYear(b.date, b.fiscalYear, yr)).length;
      const pCount = dailyPurchaseRecords.filter((p) => isRecordInFiscalYear(p.date, p.fiscalYear, yr)).length;
      const aCount = farmerAdvances.filter((a) => isRecordInFiscalYear(a.date, a.fiscalYear, yr)).length;
      map.set(yr, { bags: bCount, purchases: pCount, advances: aCount });
    });
    return map;
  }, [fiscalYears, bagsEntries, dailyPurchaseRecords, farmerAdvances]);

  // Preview carry forward farmers
  const carryPreview = useMemo(() => {
    if (!fromYear) return [];
    return farmers.map((f) => {
      const summary = getCompleteFarmerAccount(f.id, 'ALL', fromYear);
      const closing = summary?.finalBalance ?? 0;
      const absAmount = Math.abs(closing);
      const type: 'DR' | 'CR' = closing >= 0 ? 'CR' : 'DR';
      return {
        farmer: f,
        closing,
        absAmount,
        type
      };
    });
  }, [farmers, fromYear, getCompleteFarmerAccount]);

  // Filtered farmers for opening balance master
  const filteredOpeningFarmers = useMemo(() => {
    if (!openingSearch?.trim()) return farmers;
    const q = openingSearch.toLowerCase().trim();
    return farmers.filter(
      (f) =>
        (f.farmerName || '').toLowerCase().includes(q) ||
        (f.farmerNamePa && f.farmerNamePa.includes(q)) ||
        (f.village || '').toLowerCase().includes(q) ||
        (f.villagePa && f.villagePa.includes(q)) ||
        (f.mobile || '').includes(q) ||
        (f.id || '').toLowerCase().includes(q)
    );
  }, [farmers, openingSearch]);

  if (!isOpen) return null;

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    setYearError('');
    const clean = newYearInput.trim();
    if (!clean) {
      setYearError(isEn ? 'Please enter fiscal year (e.g. 2027-28)' : 'ਕਿਰਪਾ ਕਰਕੇ ਵਿੱਤੀ ਸਾਲ ਦਰਜ ਕਰੋ (ਜਿਵੇਂ 2027-28)');
      return;
    }
    const fyRegex = /^\d{4}-\d{2}$/;
    if (!fyRegex.test(clean)) {
      setYearError(isEn ? 'Format must be YYYY-YY (e.g. 2027-28)' : 'ਸਾਲ ਦਾ ਫਾਰਮੈਟ YYYY-YY ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ (ਜਿਵੇਂ 2027-28)');
      return;
    }
    if (fiscalYears.includes(clean)) {
      setYearError(isEn ? 'This fiscal year already exists' : 'ਇਹ ਵਿੱਤੀ ਸਾਲ ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ');
      return;
    }

    addFiscalYear(clean);
    setActiveFiscalYear(clean);
    setNewYearInput('');
    notifySaveSuccess({
      titlePa: 'ਨਵਾਂ ਵਿੱਤੀ ਸਾਲ ਬਣ ਗਿਆ',
      titleEn: 'New Fiscal Year Created',
      messagePa: `${clean} ਸਾਲ ਸਫਲਤਾਪੂਰਵਕ ਸ਼ਾਮਲ ਕਰਕੇ ਸਰਗਰਮ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
    });
  };

  const handleExecuteCarryForward = () => {
    if (fromYear === toYear) {
      notifyError({
        titlePa: 'ਗਲਤ ਚੋਣ',
        titleEn: 'Invalid Selection',
        messagePa: 'ਪਿਛਲਾ ਸਾਲ ਅਤੇ ਨਵਾਂ ਸਾਲ ਵੱਖਰੇ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ।'
      });
      return;
    }

    setIsCarryingForward(true);
    try {
      const res = carryForwardBalancesToNextYear(fromYear, toYear);
      setCarrySuccessInfo({
        count: res.carriedFarmersCount,
        totalDr: res.totalDr,
        totalCr: res.totalCr
      });
      notifySaveSuccess({
        titlePa: 'ਬਕਾਏ ਸਫਲਤਾਪੂਰਵਕ ਕੈਰੀ ਫਾਰਵਰਡ ਹੋ ਗਏ',
        titleEn: 'Balances Carried Forward',
        messagePa: `${res.carriedFarmersCount} ਕਿਸਾਨਾਂ ਦੇ ਬਕਾਏ ${fromYear} ਤੋਂ ${toYear} ਵਿੱਚ ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ ਵਜੋਂ ਦਰਜ ਹੋ ਗਏ।`
      });
    } catch (err: any) {
      notifyError({
        titlePa: 'ਗਲਤੀ',
        titleEn: 'Error',
        messagePa: 'ਬਕਾਏ ਕੈਰੀ ਫਾਰਵਰਡ ਕਰਨ ਵਿੱਚ ਅਸਫਲ ਰਿਹਾ: ' + (err.message || '')
      });
    } finally {
      setIsCarryingForward(false);
    }
  };

  const startEditOpening = (farmerId: string) => {
    const existing = getFarmerOpeningBalanceForYear(farmerId, selectedFyForOpening);
    setEditingFarmerId(farmerId);
    setEditAmount(existing ? String(existing.amount) : '');
    setEditType(existing ? existing.type : 'DR');
    setEditNotes(existing?.notes || '');
  };

  const handleSaveOpening = (farmerId: string) => {
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0) {
      notifyError({
        titlePa: 'ਅਵੈਧ ਰਕਮ',
        titleEn: 'Invalid Amount',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਰਕਮ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    const { startYear } = parseFiscalYear(selectedFyForOpening);
    const balanceObj: FarmerYearOpeningBalance = {
      amount: amt,
      type: editType,
      date: `01/04/${startYear}`,
      notes: editNotes.trim() || (editType === 'CR' ? 'ਜਮ੍ਹਾਂ ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ' : 'ਨਾਵੇਂ ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ')
    };

    setFarmerOpeningBalanceForYear(farmerId, balanceObj, selectedFyForOpening);
    setEditingFarmerId(null);
    notifySaveSuccess({
      titlePa: 'ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ ਸੇਵ ਹੋ ਗਿਆ',
      titleEn: 'Opening Balance Saved',
      messagePa: `ਕਿਸਾਨ ਦਾ ${selectedFyForOpening} ਲਈ ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ ₹${amt.toLocaleString('en-IN')} (${editType}) ਸੇਵ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0 border-b border-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Calendar className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-white">
                  {isEn ? 'Financial Year (FY) Accounting Master' : 'ਵਿੱਤੀ ਸਾਲ (Financial Year) ਪ੍ਰਬੰਧਨ'}
                </h2>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40">
                  ਸਰਗਰਮ ਸਾਲ: {activeFiscalYear}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEn
                  ? 'Independent FY isolation, New Year creation, Carry Forward & Closing to Opening Roll-Over'
                  : 'ਸੁਤੰਤਰ ਸਾਲ-ਵਾਰ ਰਿਕਾਰਡ, ਨਵਾਂ ਸਾਲ ਬਣਾਉਣਾ, ਪਿਛਲੇ ਕਲੋਜ਼ਿੰਗ ਬਕਾਏ ਨਵੇਂ ਸਾਲ ਦੇ ਸ਼ੁਰੂਆਤੀ ਬਕਾਏ ਵਿੱਚ ਲਿਜਾਣਾ (Carry Forward)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="ਬੰਦ ਕਰੋ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 shrink-0 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('years')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'years'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. {isEn ? 'Fiscal Years & Lock' : 'ਵਿੱਤੀ ਸਾਲ ਸੂਚੀ ਅਤੇ ਲਾਕ'} ({fiscalYears.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('carryForward')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'carryForward'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>2. {isEn ? 'Carry Forward Balances' : 'ਬਕਾਏ ਅਗਲੇ ਸਾਲ ਵਿੱਚ ਲੈ ਜਾਓ (Roll Over)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('openingBalances')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'openingBalances'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>3. {isEn ? 'Opening Balances Master' : 'ਕਿਸਾਨ ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ ਐਡੀਟਰ'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {/* TAB 1: Fiscal Years List & Add */}
          {activeTab === 'years' && (
            <div className="space-y-6">
              {/* Active FY info banner */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        {isEn ? 'Current Active Fiscal Year' : 'ਮੌਜੂਦਾ ਸਰਗਰਮ ਵਿੱਤੀ ਸਾਲ'}
                      </span>
                      <span className="text-xs bg-emerald-600 text-white font-black font-mono px-2 py-0.5 rounded">
                        {activeFiscalYear}
                      </span>
                      {isYearLocked(activeFiscalYear) ? (
                        <span className="text-[11px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-rose-300">
                          <Lock className="w-3 h-3" /> {isEn ? 'Locked' : 'ਲਾਕ / ਫਰੀਜ਼'}
                        </span>
                      ) : (
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-300">
                          <Unlock className="w-3 h-3" /> {isEn ? 'Unlocked / Active' : 'ਚਾਲੂ / ਨਵੀਆਂ ਐਂਟਰੀਆਂ ਖੁੱਲ੍ਹੀਆਂ'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-900 mt-1 font-medium">
                      ਮਿਆਦ:{' '}
                      <strong className="font-mono">{getFiscalYearDateRange(activeFiscalYear).startDateStr}</strong> ਤੋਂ{' '}
                      <strong className="font-mono">{getFiscalYearDateRange(activeFiscalYear).endDateStr}</strong> ਤੱਕ।{' '}
                      ਸਾਫਟਵੇਅਰ ਵਿੱਚ ਸਾਰੀਆਂ ਨਵੀਆਂ ਆਮਦਾਂ, ਖਰੀਦਾਂ, ਪੇਸ਼ਗੀਆਂ ਅਤੇ ਰਿਪੋਰਟਾਂ ਇਸੇ ਸਾਲ ਵਿੱਚ ਦਰਜ ਹੁੰਦੀਆਂ ਹਨ।
                    </p>
                  </div>
                </div>
              </div>

              {/* Create New Year Form */}
              <form
                onSubmit={handleCreateYear}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
              >
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>
                      {isEn ? 'Create New Fiscal Year (Format: YYYY-YY)' : 'ਨਵਾਂ ਵਿੱਤੀ ਸਾਲ ਬਣਾਓ (ਫਾਰਮੈਟ: YYYY-YY)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewYearInput(suggestedNextYear)}
                      className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      ਅਗਲਾ ਸਾਲ ਸੁਝਾਓ ({suggestedNextYear})
                    </button>
                  </label>
                  <input
                    type="text"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="e.g. 2027-28"
                    className="w-full px-3.5 py-2.5 text-xs font-bold font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {yearError && <p className="text-[11px] text-rose-600 font-bold mt-1">{yearError}</p>}
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isEn ? 'Create & Activate Year' : 'ਨਵਾਂ ਸਾਲ ਬਣਾਓ ਅਤੇ ਸਰਗਰਮ ਕਰੋ'}</span>
                </button>
              </form>

              {/* Fiscal Years Cards Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>{isEn ? 'Available Fiscal Years' : 'ਮੌਜੂਦ ਵਿੱਤੀ ਸਾਲ'}</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (ਕਲਿੱਕ ਕਰਕੇ ਕਿਸੇ ਵੀ ਸਾਲ ਦਾ ਡਾਟਾ ਵੇਖੋ ਜਾਂ ਸਾਲ ਲਾਕ/ਫਰੀਜ਼ ਕਰੋ)
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {fiscalYears.map((yr) => {
                    const isActive = yr === activeFiscalYear;
                    const isLocked = isYearLocked(yr);
                    const range = getFiscalYearDateRange(yr);
                    const stats = yearStats.get(yr) || { bags: 0, purchases: 0, advances: 0 };

                    return (
                      <div
                        key={yr}
                        className={`border rounded-xl p-4 transition flex flex-col justify-between gap-3 shadow-2xs ${
                          isActive
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black font-mono text-slate-900">{yr}</span>
                              {isActive && (
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  ਸਰਗਰਮ
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {range.startDateStr} - {range.endDateStr}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleYearLock(yr)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                              isLocked
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isLocked ? 'ਸਾਲ ਅਨਲਾਕ ਕਰੋ' : 'ਸਾਲ ਲਾਕ ਕਰੋ (ਆਡਿਟ ਹੋ ਚੁੱਕੇ ਸਾਲ ਨੂੰ ਫਰੀਜ਼ ਕਰੋ)'}
                          >
                            {isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-slate-500" />}
                          </button>
                        </div>

                        {/* Year Stats */}
                        <div className="bg-slate-100/70 rounded-lg p-2.5 text-[11px] text-slate-700 grid grid-cols-3 gap-1 text-center font-mono">
                          <div>
                            <div className="font-bold text-slate-900">{stats.bags}</div>
                            <div className="text-[9px] text-slate-500">ਆਮਦਾਂ</div>
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{stats.purchases}</div>
                            <div className="text-[9px] text-slate-500">ਖਰੀਦਾਂ</div>
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{stats.advances}</div>
                            <div className="text-[9px] text-slate-500">ਪੇਸ਼ਗੀਆਂ</div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          {!isActive ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveFiscalYear(yr);
                                notifySaveSuccess({
                                  titlePa: 'ਵਿੱਤੀ ਸਾਲ ਬਦਲ ਗਿਆ',
                                  titleEn: 'Fiscal Year Switched',
                                  messagePa: `ਹੁਣ ਵਿੱਤੀ ਸਾਲ ${yr} ਸਰਗਰਮ ਹੈ।`
                                });
                              }}
                              className="w-full py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 cursor-pointer"
                            >
                              ਇਹ ਸਾਲ ਚੁਣੋ (Switch to {yr})
                            </button>
                          ) : (
                            <div className="w-full text-center text-xs font-black text-emerald-700 py-1 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ਚੁਣਿਆ ਹੋਇਆ ਸਰਗਰਮ ਸਾਲ
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Carry Forward Balances (Roll Over) */}
          {activeTab === 'carryForward' && (
            <div className="space-y-6">
              {/* Guidance Box */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0 mt-0.5">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                    ਸਾਲਾਨਾ ਕਲੋਜ਼ਿੰਗ ਬਕਾਇਆ ਕੈਰੀ ਫਾਰਵਰਡ ਨਿਯਮ (Year-End Balance Carry Forward Rule)
                  </h4>
                  <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                    ਪਿਛਲੇ ਵਿੱਤੀ ਸਾਲ ਦਾ ਅੰਤਿਮ ਬਕਾਇਆ (Closing Balance) ਅਗਲੇ ਸਾਲ ਵਿੱਚ ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ (Opening Balance) ਬਣ ਜਾਵੇਗਾ।{' '}
                    <strong>(ਤੁਹਾਡੇ ਨਿਰਦੇਸ਼ਾਂ ਅਨੁਸਾਰ: ਕੋਈ 31 ਮਾਰਚ ਵਿਆਜ ਪੱਕਾ ਨਹੀਂ ਕੀਤਾ ਜਾਵੇਗਾ ਅਤੇ ਨਾ ਹੀ ਬਾਰਦਾਨਾ ਕੈਰੀ ਫਾਰਵਰਡ ਹੋਵੇਗਾ - ਕੇਵਲ ਸ਼ੁੱਧ ਵਿੱਤੀ ਬਕਾਇਆ ਹੀ ਜਾਵੇਗਾ।)</strong>
                  </p>
                </div>
              </div>

              {/* From Year -> To Year Selector */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਪਿਛਲਾ ਸਾਲ (From Year - ਜਿੱਥੋਂ ਕਲੋਜ਼ਿੰਗ ਲੈਣੀ ਹੈ)
                  </label>
                  <select
                    value={fromYear}
                    onChange={(e) => setFromYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-black font-mono border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {fiscalYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-5 hidden sm:block text-slate-400">
                  <ArrowRight className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਨਵਾਂ ਸਾਲ (To Year - ਜਿੱਥੇ ਓਪਨਿੰਗ ਬੈਲੇਂਸ ਦਰਜ ਕਰਨਾ ਹੈ)
                  </label>
                  <select
                    value={toYear}
                    onChange={(e) => setToYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-black font-mono border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {fiscalYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleExecuteCarryForward}
                    disabled={isCarryingForward || fromYear === toYear}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isCarryingForward
                        ? 'ਕੈਰੀ ਫਾਰਵਰਡ ਹੋ ਰਿਹਾ ਹੈ...'
                        : `ਕੈਰੀ ਫਾਰਵਰਡ ਕਰੋ (${fromYear} ➜ ${toYear})`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Success Result Banner */}
              {carrySuccessInfo && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-950 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>
                      ਸਫਲਤਾਪੂਰਵਕ <strong>{carrySuccessInfo.count} ਕਿਸਾਨਾਂ</strong> ਦੇ ਬਕਾਏ ਕੈਰੀ ਫਾਰਵਰਡ ਹੋ ਗਏ (ਕੁੱਲ ਨਾਵੇਂ DR: ₹
                      {carrySuccessInfo.totalDr.toLocaleString('en-IN')}, ਕੁੱਲ ਜਮ੍ਹਾਂ CR: ₹
                      {carrySuccessInfo.totalCr.toLocaleString('en-IN')})
                    </span>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">
                    ਕੈਰੀ ਫਾਰਵਰਡ ਪੂਰਵਦਰਸ਼ਨ (Preview for {fromYear} Closing Balances - {carryPreview.length} Farmers)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ਅਗਲੇ ਸਾਲ 01/04/{parseFiscalYear(toYear).startYear} ਨੂੰ ਓਪਨਿੰਗ ਬਣੇਗਾ
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer)</th>
                        <th className="py-2.5 px-4">ਪਿੰਡ (Village)</th>
                        <th className="py-2.5 px-4 text-right">{fromYear} ਅੰਤਿਮ ਬਕਾਇਆ (Closing)</th>
                        <th className="py-2.5 px-4 text-center">{toYear} ਓਪਨਿੰਗ ਬੈਲੇਂਸ ਕਿਸਮ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {carryPreview.map(({ farmer, absAmount, type }) => (
                        <tr key={farmer.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                            {farmer.farmerNamePa || farmer.farmerName}
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">({farmer.id})</span>
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-600">
                            {farmer.villagePa || farmer.village}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            ₹{absAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                type === 'DR'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {type === 'DR' ? 'ਨਾਵੇਂ (DR - ਲੈਣੇ ਹਨ)' : 'ਜਮ੍ਹਾਂ (CR - ਦੇਣੇ ਹਨ)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Opening Balances Master Editor */}
          {activeTab === 'openingBalances' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">ਵਿੱਤੀ ਸਾਲ ਚੁਣੋ:</span>
                  <select
                    value={selectedFyForOpening}
                    onChange={(e) => setSelectedFyForOpening(e.target.value)}
                    className="px-3 py-1.5 text-xs font-black font-mono border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    {fiscalYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} {yr === activeFiscalYear ? '(ਸਰਗਰਮ ਸਾਲ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={openingSearch}
                    onChange={(e) => setOpeningSearch(e.target.value)}
                    placeholder="ਕਿਸਾਨ, ਪਿੰਡ ਜਾਂ ਫੋਨ ਨੰਬਰ ਖੋਜੋ..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Table of Farmers with Year Opening Balance */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">ਕਿਸਾਨ (Farmer)</th>
                        <th className="py-2.5 px-4">ਪਿੰਡ (Village)</th>
                        <th className="py-2.5 px-4 text-right">ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ ਰਕਮ (₹)</th>
                        <th className="py-2.5 px-4 text-center">ਕਿਸਮ (Type)</th>
                        <th className="py-2.5 px-4">ਨੋਟਸ / ਵੇਰਵਾ</th>
                        <th className="py-2.5 px-4 text-right">ਕਾਰਵਾਈ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredOpeningFarmers.map((f) => {
                        const openingObj = getFarmerOpeningBalanceForYear(f.id, selectedFyForOpening);
                        const isEditing = editingFarmerId === f.id;

                        if (isEditing) {
                          return (
                            <tr key={f.id} className="bg-emerald-50/70 border-2 border-emerald-500">
                              <td className="py-3 px-4 font-sans font-bold text-slate-900">
                                {f.farmerNamePa || f.farmerName}
                              </td>
                              <td className="py-3 px-4 font-sans text-slate-600">
                                {f.villagePa || f.village}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  placeholder="0"
                                  className="w-28 px-2 py-1 text-xs font-bold text-right border border-emerald-500 rounded bg-white focus:outline-none"
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <select
                                  value={editType}
                                  onChange={(e) => setEditType(e.target.value as 'DR' | 'CR')}
                                  className="px-2 py-1 text-xs font-bold border border-emerald-500 rounded bg-white cursor-pointer"
                                >
                                  <option value="DR">DR (ਨਾਵੇਂ - ਲੈਣੇ ਹਨ)</option>
                                  <option value="CR">CR (ਜਮ੍ਹਾਂ - ਦੇਣੇ ਹਨ)</option>
                                </select>
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  placeholder="ਵੇਰਵਾ ਲਿਖੋ..."
                                  className="w-full px-2 py-1 text-xs border border-emerald-500 rounded bg-white font-sans"
                                />
                              </td>
                              <td className="py-3 px-4 text-right space-x-1 font-sans">
                                <button
                                  type="button"
                                  onClick={() => handleSaveOpening(f.id)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition cursor-pointer"
                                >
                                  ਸੇਵ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingFarmerId(null)}
                                  className="px-2 py-1 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 transition cursor-pointer"
                                >
                                  ਰੱਦ
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={f.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                              {f.farmerNamePa || f.farmerName}
                              <span className="text-[10px] text-slate-400 font-mono ml-1.5">({f.id})</span>
                            </td>
                            <td className="py-2.5 px-4 font-sans text-slate-600">
                              {f.villagePa || f.village}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                              {openingObj ? `₹${openingObj.amount.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {openingObj && openingObj.amount > 0 ? (
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    openingObj.type === 'DR'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {openingObj.type === 'DR' ? 'ਨਾਵੇਂ (DR)' : 'ਜਮ੍ਹਾਂ (CR)'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-slate-500 truncate max-w-xs text-[11px]">
                              {openingObj?.notes || '—'}
                              {openingObj?.isCarriedForward && (
                                <span className="ml-1 text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-mono font-bold">
                                  Carried
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-sans">
                              <button
                                type="button"
                                onClick={() => startEditOpening(f.id)}
                                className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded transition border border-slate-200 cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>ਸੋਧੋ</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">ਸਰਗਰਮ ਵਿੱਤੀ ਸਾਲ:</span>
            <span className="font-mono font-black text-emerald-700">{activeFiscalYear}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
