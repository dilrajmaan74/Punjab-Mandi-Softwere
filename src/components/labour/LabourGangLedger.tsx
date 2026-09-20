import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { LabourMate, LabourWorkEntry, LabourAdvancePayment } from '../../types/mandi';
import { DateInput } from '../common/DateInput';
import { formatCurrency } from '../../utils/calculations';
import {
  Users,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit2,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Phone,
  FileText,
  X,
  CheckCircle2
} from 'lucide-react';

const WORK_TYPES = [
  { id: 'CLEANING_PAKHA', labelEn: 'Cleaning & Pakha (ਛਣਾਈ/ਪੱਖਾ)', labelPa: 'ਪੱਖਾ / ਛਣਾਈ (Cleaning/Pakha)', defaultRate: 6 },
  { id: 'FILLING_WEIGHING', labelEn: 'Filling & Weighing (ਭਰਾਈ/ਤੁਲਾਈ)', labelPa: 'ਭਰਾਈ ਤੇ ਤੁਲਾਈ (Filling & Weighing)', defaultRate: 8 },
  { id: 'TRUCK_LOADING', labelEn: 'Truck Loading (ਟਰੱਕ ਲੋਡਿੰਗ)', labelPa: 'ਟਰੱਕ ਲੋਡਿੰਗ (Truck Loading)', defaultRate: 5 },
  { id: 'CHHANAI', labelEn: 'Chhanai / Grading (ਛਣਾਈ)', labelPa: 'ਛਣਾਈ / ਗ੍ਰੇਡਿੰਗ (Chhanai)', defaultRate: 4 },
  { id: 'MISC', labelEn: 'Miscellaneous Mandi Work', labelPa: 'ਫੁਟਕਲ ਮੰਡੀ ਕੰਮ (Misc Work)', defaultRate: 10 }
];

export const LabourGangLedger: React.FC = () => {
  const {
    labourMates,
    addLabourMate,
    updateLabourMate,
    deleteLabourMate,
    labourWorkEntries,
    addLabourWorkEntry,
    deleteLabourWorkEntry,
    labourAdvancePayments,
    addLabourAdvancePayment,
    deleteLabourAdvancePayment,
    settings,
    activeFirm,
    language
  } = useMandi();

  const isEn = language === 'en';
  const { notifySaveSuccess, notifyDeleteSuccess, confirmDelete } = useNotification();

  // Active Mate Tab
  const [selectedMateId, setSelectedMateId] = useState<string>(labourMates[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'statement' | 'work' | 'advances' | 'all-mates'>('statement');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isMateModalOpen, setIsMateModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  // Mate Form
  const [mateName, setMateName] = useState('');
  const [mateNamePa, setMateNamePa] = useState('');
  const [mateMobile, setMateMobile] = useState('');
  const [mateVillage, setMateVillage] = useState('');
  const [mateTeamSize, setMateTeamSize] = useState('10');
  const [mateNotes, setMateNotes] = useState('');

  // Work Form
  const getTodayFormatted = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  const [workDate, setWorkDate] = useState(getTodayFormatted());
  const [workType, setWorkType] = useState(WORK_TYPES[1].id);
  const [workBags, setWorkBags] = useState('200');
  const [workRate, setWorkRate] = useState('8');
  const [workNotes, setWorkNotes] = useState('');

  // Advance Form
  const [advDate, setAdvDate] = useState(getTodayFormatted());
  const [advAmount, setAdvAmount] = useState('5000');
  const [advMode, setAdvMode] = useState<'CASH' | 'UPI' | 'BANK' | 'RATION'>('CASH');
  const [advRemarks, setAdvRemarks] = useState('');

  // Selected Mate
  const activeMate = useMemo(() => {
    return labourMates.find((m) => m.id === selectedMateId) || labourMates[0] || null;
  }, [labourMates, selectedMateId]);

  // Mate Ledger Calculations
  const mateStatement = useMemo(() => {
    if (!activeMate) return { totalEarned: 0, totalAdvance: 0, netBalance: 0, transactions: [] };

    const works = labourWorkEntries.filter((w) => w.mateId === activeMate.id);
    const advances = labourAdvancePayments.filter((a) => a.mateId === activeMate.id);

    const totalEarned = works.reduce((sum, w) => sum + (w.totalAmount || 0), 0);
    const totalAdvance = advances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const netBalance = totalEarned - totalAdvance;

    // Merge into combined chronological ledger
    const list: Array<{
      id: string;
      date: string;
      type: 'WORK' | 'ADVANCE';
      title: string;
      details: string;
      credit: number; // Work earned
      debit: number; // Advance taken
    }> = [];

    works.forEach((w) => {
      list.push({
        id: w.id,
        date: w.date,
        type: 'WORK',
        title: w.workTypePa || w.workType,
        details: `${w.bags} ਬੋਰੀਆਂ @ ₹${w.ratePerBag}/ਬੋਰੀ`,
        credit: w.totalAmount,
        debit: 0
      });
    });

    advances.forEach((a) => {
      list.push({
        id: a.id,
        date: a.date,
        type: 'ADVANCE',
        title: `ਪੇਸ਼ਗੀ / ਖਰਚਾ (${a.paymentMode})`,
        details: a.remarks || 'ਨਗਦ ਖਰਚਾ ਦਿੱਤਾ',
        credit: 0,
        debit: a.amount
      });
    });

    // Sort by date (latest first)
    list.sort((a, b) => b.date.localeCompare(a.date));

    return { totalEarned, totalAdvance, netBalance, transactions: list };
  }, [activeMate, labourWorkEntries, labourAdvancePayments]);

  // Overall Mandi Labour Gang Totals
  const overallStats = useMemo(() => {
    const totalMates = labourMates.length;
    const totalWorkers = labourMates.reduce((sum, m) => sum + (m.teamSize || 0), 0);
    const totalWorkEarned = labourWorkEntries.reduce((sum, w) => sum + (w.totalAmount || 0), 0);
    const totalAdvancesPaid = labourAdvancePayments.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalNetPending = totalWorkEarned - totalAdvancesPaid;
    return { totalMates, totalWorkers, totalWorkEarned, totalAdvancesPaid, totalNetPending };
  }, [labourMates, labourWorkEntries, labourAdvancePayments]);

  // Handlers
  const handleSaveMate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mateName.trim() && !mateNamePa.trim()) return;

    const newMate = addLabourMate({
      mateName: mateName.trim() || mateNamePa.trim(),
      mateNamePa: mateNamePa.trim() || mateName.trim(),
      mobile: mateMobile.trim(),
      village: mateVillage.trim(),
      teamSize: parseInt(mateTeamSize, 10) || 1,
      notes: mateNotes.trim()
    });

    setSelectedMateId(newMate.id);
    setIsMateModalOpen(false);
    setMateName('');
    setMateNamePa('');
    setMateMobile('');
    setMateVillage('');
    notifySaveSuccess({
      titleEn: 'Labour Mate Registered',
      titlePa: 'ਨਵਾਂ ਮੇਟ ਰਜਿਸਟਰ ਹੋ ਗਿਆ'
    });
  };

  const handleSaveWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMate) return;

    const selectedTypeObj = WORK_TYPES.find((w) => w.id === workType);
    const bagsCount = parseInt(workBags, 10) || 0;
    const ratePerBag = parseFloat(workRate) || 0;
    const totalAmount = Math.round(bagsCount * ratePerBag);

    addLabourWorkEntry({
      mateId: activeMate.id,
      mateName: activeMate.mateNamePa || activeMate.mateName,
      date: workDate,
      workType: workType as any,
      workTypePa: selectedTypeObj?.labelPa || workType,
      bags: bagsCount,
      ratePerBag,
      totalAmount,
      notes: workNotes.trim()
    });

    setIsWorkModalOpen(false);
    setWorkNotes('');
    notifySaveSuccess({
      titleEn: 'Labour Work Entry Saved',
      titlePa: 'ਲੇਬਰ ਕੰਮ ਦੀ ਐਂਟਰੀ ਦਰਜ ਹੋ ਗਈ'
    });
  };

  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMate) return;

    const amountNum = parseFloat(advAmount) || 0;

    addLabourAdvancePayment({
      mateId: activeMate.id,
      mateName: activeMate.mateNamePa || activeMate.mateName,
      date: advDate,
      amount: amountNum,
      paymentMode: advMode,
      remarks: advRemarks.trim()
    });

    setIsAdvanceModalOpen(false);
    setAdvRemarks('');
    notifySaveSuccess({
      titleEn: 'Advance Payment Recorded',
      titlePa: 'ਪੇਸ਼ਗੀ ਖਰਚਾ ਦਰਜ ਹੋ ਗਿਆ'
    });
  };

  const handleDeleteWork = (id: string, details: string) => {
    confirmDelete({
      recordNameEn: `Work Entry: ${details}`,
      recordNamePa: `ਕੰਮ ਐਂਟਰੀ: ${details}`,
      recordId: id,
      onConfirm: () => {
        deleteLabourWorkEntry(id);
        notifyDeleteSuccess({
          titleEn: 'Work entry deleted',
          titlePa: 'ਕੰਮ ਐਂਟਰੀ ਹਟਾਈ ਗਈ'
        });
      }
    });
  };

  const handleDeleteAdvance = (id: string, amount: number) => {
    confirmDelete({
      recordNameEn: `Advance: ₹${amount}`,
      recordNamePa: `ਪੇਸ਼ਗੀ ਰਕਮ: ₹${amount}`,
      recordId: id,
      onConfirm: () => {
        deleteLabourAdvancePayment(id);
        notifyDeleteSuccess({
          titleEn: 'Advance record deleted',
          titlePa: 'ਪੇਸ਼ਗੀ ਰਿਕਾਰਡ ਹਟਾਇਆ ਗਿਆ'
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>{isEn ? 'Labour Gang / Palledar Ledger' : 'ਲੇਬਰ ਗੈਂਗ / ਪੱਲੇਦਾਰ ਖਾਤਾ (Labour Ledger)'}</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-full border border-indigo-300">
                {activeFirm?.name || settings?.firmNameEn}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEn
                ? 'Manage Palledar mates, daily filling/pakha work logs, cash advances, and gang settlements'
                : 'ਪੱਲੇਦਾਰ ਮੇਟਾਂ ਦੇ ਖਾਤੇ, ਰੋਜ਼ਾਨਾ ਭਰਾਈ/ਛਣਾਈ/ਲੋਡਿੰਗ ਕੰਮ, ਪੇਸ਼ਗੀ ਖਰਚਾ ਅਤੇ ਹਿਸਾਬ-ਕਿਤਾਬ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isEn ? 'Print Khata' : 'ਖਾਤਾ ਪ੍ਰਿੰਟ ਕਰੋ'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMateModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Add Mate' : '+ ਨਵਾਂ ਮੇਟ ਜੋੜੋ'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Advance/Kharcha' : '+ ਪੇਸ਼ਗੀ ਖਰਚਾ ਦਿਓ'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsWorkModalOpen(true)}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Add Work Entry' : '+ ਕੰਮ ਦਰਜ ਕਰੋ'}</span>
          </button>
        </div>
      </div>

      {/* Overall Mandi Labour Gang Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isEn ? 'Total Gangs / Mates' : 'ਕੁੱਲ ਮੇਟ / ਢਾਣੀਆਂ'}</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">{overallStats.totalMates} ਮੇਟ</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">{overallStats.totalWorkers} ਪੱਲੇਦਾਰ ਮਜ਼ਦੂਰ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isEn ? 'Total Work Earned' : 'ਕੁੱਲ ਕਮਾਈ ਹੋਈ ਲੇਬਰ'}</span>
          </div>
          <div className="text-xl font-black text-emerald-800 mt-1 font-mono">
            {formatCurrency(overallStats.totalWorkEarned)}
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">ਭਰਾਈ, ਤੁਲਾਈ, ਛਣਾਈ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
            <span>{isEn ? 'Total Advances Paid' : 'ਕੁੱਲ ਪੇਸ਼ਗੀ / ਖਰਚਾ ਦਿੱਤਾ'}</span>
          </div>
          <div className="text-xl font-black text-rose-800 mt-1 font-mono">
            {formatCurrency(overallStats.totalAdvancesPaid)}
          </div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">ਨਗਦ / ਰਾਸ਼ਨ ਖਰਚਾ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            <span>{isEn ? 'Net Balance Payable' : 'ਬਾਕੀ ਦੇਣ ਵਾਲੀ ਲੇਬਰ'}</span>
          </div>
          <div className="text-xl font-black text-blue-950 mt-1 font-mono">
            {formatCurrency(overallStats.totalNetPending)}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">ਸ਼ੁੱਧ ਬਕਾਇਆ (Net Balance)</div>
        </div>
      </div>

      {/* Mate Selector Pill Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
          <span className="text-xs font-bold text-slate-500 shrink-0">ਮੇਟ ਚੁਣੋ:</span>
          {labourMates.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMateId(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                selectedMateId === m.id
                  ? 'bg-indigo-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{m.mateNamePa || m.mateName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedMateId === m.id ? 'bg-indigo-900 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
                {m.teamSize || 10} ਜਣੇ
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Mate Ledger Passbook */}
      {activeMate && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          {/* Mate Profile Header */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-lg">
                {activeMate.mateNamePa?.[0] || activeMate.mateName?.[0] || 'M'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black">{activeMate.mateNamePa || activeMate.mateName}</h3>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeMate.id}
                  </span>
                </div>
                <div className="text-xs text-indigo-200 flex items-center gap-3 mt-1">
                  <span>ਮੋਬਾਈਲ: {activeMate.mobile || '—'}</span>
                  <span>•</span>
                  <span>ਪਿੰਡ: {activeMate.village || 'ਮੰਡੀ ਯਾਰਡ'}</span>
                  <span>•</span>
                  <span>ਢਾਣੀ: {activeMate.teamSize || 10} ਪੱਲੇਦਾਰ</span>
                </div>
              </div>
            </div>

            {/* Quick Balance for this mate */}
            <div className="flex items-center gap-4 bg-white/10 p-2.5 rounded-xl border border-white/15">
              <div>
                <span className="text-[10px] uppercase text-indigo-200 block font-bold">ਕੁੱਲ ਕੰਮ (Earned)</span>
                <span className="text-sm font-bold font-mono text-emerald-300">
                  {formatCurrency(mateStatement.totalEarned)}
                </span>
              </div>
              <div className="border-l border-white/20 pl-3">
                <span className="text-[10px] uppercase text-indigo-200 block font-bold">ਪੇਸ਼ਗੀ (Advances)</span>
                <span className="text-sm font-bold font-mono text-rose-300">
                  -{formatCurrency(mateStatement.totalAdvance)}
                </span>
              </div>
              <div className="border-l border-white/20 pl-3">
                <span className="text-[10px] uppercase text-indigo-200 block font-bold">ਬਾਕੀ ਬਕਾਇਆ (Net)</span>
                <span className="text-base font-black font-mono text-white">
                  {formatCurrency(mateStatement.netBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Transactions Statement Table */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>ਲੇਬਰ ਖਾਤਾ ਸਟੇਟਮੈਂਟ (Ledger Passbook)</span>
              </h4>
              <span className="text-xs text-slate-500 font-bold">
                {mateStatement.transactions.length} ਐਂਟਰੀਆਂ
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                    <th className="py-2.5 px-3">ਮਿਤੀ (Date)</th>
                    <th className="py-2.5 px-3">ਕੰਮ / ਵੇਰਵਾ (Particulars)</th>
                    <th className="py-2.5 px-3">ਮਾਤਰਾ / ਦਰ (Quantity/Rate)</th>
                    <th className="py-2.5 px-3 text-right">ਕਮਾਈ (+ Credit)</th>
                    <th className="py-2.5 px-3 text-right">ਪੇਸ਼ਗੀ (- Debit)</th>
                    <th className="py-2.5 px-3 text-center">ਐਕਸ਼ਨ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mateStatement.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        ਇਸ ਮੇਟ ਲਈ ਹਾਲੇ ਕੋਈ ਕੰਮ ਜਾਂ ਪੇਸ਼ਗੀ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੋਈ।
                      </td>
                    </tr>
                  ) : (
                    mateStatement.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-medium text-slate-600">{tx.date}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {tx.type === 'WORK' ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            )}
                            <span>{tx.title}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{tx.details}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          {tx.credit > 0 ? `+${formatCurrency(tx.credit)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-800">
                          {tx.debit > 0 ? `-${formatCurrency(tx.debit)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (tx.type === 'WORK') {
                                handleDeleteWork(tx.id, tx.title);
                              } else {
                                handleDeleteAdvance(tx.id, tx.debit);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="ਹਟਾਓ (Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase">
                      ਕੁੱਲ ਜੋੜ (Total Summary):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900">
                      +{formatCurrency(mateStatement.totalEarned)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-rose-900">
                      -{formatCurrency(mateStatement.totalAdvance)}
                    </td>
                    <td className="py-2.5 px-3"></td>
                  </tr>
                  <tr className="bg-indigo-50 font-black border-t border-indigo-200 text-indigo-950">
                    <td colSpan={3} className="py-2.5 px-3 text-right uppercase">
                      ਮੇਟ ਦਾ ਸ਼ੁੱਧ ਬਾਕੀ ਬਕਾਇਆ (Net Balance Payable):
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-right font-mono text-base text-indigo-950">
                      {formatCurrency(mateStatement.netBalance)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Add New Mate */}
      {isMateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {isEn ? 'Register New Labour Mate / Gang' : 'ਨਵਾਂ ਪੱਲੇਦਾਰ ਮੇਟ ਦਰਜ ਕਰੋ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMateModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ਮੇਟ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ ਵਿੱਚ)
                </label>
                <input
                  type="text"
                  value={mateNamePa}
                  onChange={(e) => setMateNamePa(e.target.value)}
                  placeholder="ਜਿਵੇਂ: ਕਾਲੂ ਮੇਟ, ਜਰਨੈਲ ਸਿੰਘ ਮੇਟ"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mate Name (English)
                </label>
                <input
                  type="text"
                  value={mateName}
                  onChange={(e) => setMateName(e.target.value)}
                  placeholder="e.g. Kalu Mate"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ਮੋਬਾਈਲ ਨੰਬਰ</label>
                  <input
                    type="tel"
                    value={mateMobile}
                    onChange={(e) => setMateMobile(e.target.value)}
                    placeholder="98765-43210"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ਢਾਣੀ ਦੇ ਮਜ਼ਦੂਰ (Gang Size)</label>
                  <input
                    type="number"
                    min="1"
                    value={mateTeamSize}
                    onChange={(e) => setMateTeamSize(e.target.value)}
                    placeholder="12"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ਪਿੰਡ ਜਾਂ ਮੰਡੀ ਯਾਰਡ</label>
                <input
                  type="text"
                  value={mateVillage}
                  onChange={(e) => setMateVillage(e.target.value)}
                  placeholder="e.g. ਕੰਗ ਖੁਰਦ, ਲੋਹੀਆਂ ਖਾਸ"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-extrabold rounded-lg text-xs shadow-md transition active:scale-95"
                >
                  ਮੇਟ ਸੇਵ ਕਰੋ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Work Log Entry */}
      {isWorkModalOpen && activeMate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  ਕੰਮ ਦੀ ਐਂਟਰੀ: {activeMate.mateNamePa || activeMate.mateName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWork} className="space-y-3 text-xs">
              <DateInput
                label="ਮਿਤੀ (Date)"
                value={workDate}
                onChange={setWorkDate}
                required
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ਕੰਮ ਦੀ ਕਿਸਮ (Work Type)</label>
                <select
                  value={workType}
                  onChange={(e) => {
                    setWorkType(e.target.value);
                    const found = WORK_TYPES.find((w) => w.id === e.target.value);
                    if (found) setWorkRate(String(found.defaultRate));
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                >
                  {WORK_TYPES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.labelPa} (₹{w.defaultRate}/ਬੋਰੀ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ</label>
                  <input
                    type="number"
                    min="1"
                    value={workBags}
                    onChange={(e) => setWorkBags(e.target.value)}
                    placeholder="200"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ਦਰ (₹ ਪ੍ਰਤੀ ਬੋਰੀ)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={workRate}
                    onChange={(e) => setWorkRate(e.target.value)}
                    placeholder="8"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900">ਕੁੱਲ ਕੰਮ ਰਕਮ:</span>
                <span className="text-base font-black font-mono text-emerald-950">
                  {formatCurrency((parseInt(workBags, 10) || 0) * (parseFloat(workRate) || 0))}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ਨੋਟਸ / ਵੇਰਵਾ (Optional)</label>
                <input
                  type="text"
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="e.g. ਮਾਰਕਫੈੱਡ ਦਾ ਟਰੱਕ ਲੋਡ ਕੀਤਾ"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWorkModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-xs shadow-md transition active:scale-95"
                >
                  ਕੰਮ ਦਰਜ ਕਰੋ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Advance / Kharcha */}
      {isAdvanceModalOpen && activeMate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  ਪੇਸ਼ਗੀ ਖਰਚਾ ਦਿਓ: {activeMate.mateNamePa || activeMate.mateName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="space-y-3 text-xs">
              <DateInput
                label="ਮਿਤੀ (Date)"
                value={advDate}
                onChange={setAdvDate}
                required
              />

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ਪੇਸ਼ਗੀ ਰਕਮ (₹ Amount)
                </label>
                <input
                  type="number"
                  min="1"
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-black font-mono text-base focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ਭੁਗਤਾਨ ਮੋਡ (Payment Mode)</label>
                <select
                  value={advMode}
                  onChange={(e) => setAdvMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-rose-500"
                >
                  <option value="CASH">ਨਗਦ (CASH)</option>
                  <option value="UPI">UPI / Google Pay</option>
                  <option value="BANK">ਬੈਂਕ ਖਾਤਾ (BANK)</option>
                  <option value="RATION">ਰਾਸ਼ਨ / ਦੁਕਾਨ ਖਰਚਾ (RATION)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ਨੋਟਸ / ਵੇਰਵਾ (Remarks)</label>
                <input
                  type="text"
                  value={advRemarks}
                  onChange={(e) => setAdvRemarks(e.target.value)}
                  placeholder="e.g. ਮਜ਼ਦੂਰਾਂ ਦੀ ਚਾਹ-ਪਾਣੀ / ਤਿਉਹਾਰ ਖਰਚਾ"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-600 text-white font-extrabold rounded-lg text-xs shadow-md transition active:scale-95"
                >
                  ਪੇਸ਼ਗੀ ਦਰਜ ਕਰੋ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
