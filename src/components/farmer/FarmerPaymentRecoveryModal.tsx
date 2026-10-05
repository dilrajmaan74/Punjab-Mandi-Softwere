import React, { useState, useMemo } from 'react';
import { Farmer, FarmerAdvanceRecord } from '../../types/mandi';
import { useMandi, MultiAdvanceSettlementPayload } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { calculateAdvanceInterest, formatDateToDDMMYYYY, autoFormatDate } from '../../utils/calculations';
import {
  X,
  IndianRupee,
  Calendar,
  CreditCard,
  Receipt,
  Layers,
  Wallet,
  Check,
  CheckCircle2,
  Percent,
  Clock,
  ArrowRight,
  Info,
  AlertCircle,
  Sparkles,
  Calculator,
  RotateCcw
} from 'lucide-react';

interface FarmerPaymentRecoveryModalProps {
  farmer: Farmer;
  advances: FarmerAdvanceRecord[];
  onClose: () => void;
  onPaymentSaved?: () => void;
  initialAdvanceId?: string | null;
}

export const FarmerPaymentRecoveryModal: React.FC<FarmerPaymentRecoveryModalProps> = ({
  farmer,
  advances = [],
  onClose,
  onPaymentSaved,
  initialAdvanceId = null
}) => {
  const { settleMultiAdvanceRepayment, addAdvanceRepayment, addFarmerPayment, language } = useMandi();
  const { notifySaveSuccess, notifyError } = useNotification();
  const isPa = language === 'pa';
  const todayStr = formatDateToDDMMYYYY(new Date());

  // Filter only active / payable advances, sorted oldest first (by date)
  const activeAdvances = useMemo(() => {
    return [...advances].filter((a) => {
      const payable = a.totalPayableWithInterest ?? (Number(a.amount) || 0);
      return payable > 0 || (a.status !== 'SETTLED' && a.status !== 'CANCELLED');
    }).sort((a, b) => {
      const [d1, m1, y1] = (a.date || todayStr).split('/').map(Number);
      const [d2, m2, y2] = (b.date || todayStr).split('/').map(Number);
      return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
    });
  }, [advances, todayStr]);

  const hasAdvances = activeAdvances.length > 0;

  // Tabs:
  // 'MUNIMI_SYSTEM': Multi-advance Interest-first settlement & balance rest date (User's Idea)
  // 'SINGLE_ADVANCE': Traditional repayment to one specific advance
  // 'GENERAL_ACCOUNT': Direct seasonal ledger credit
  const [activeTab, setActiveTab] = useState<'MUNIMI_SYSTEM' | 'SINGLE_ADVANCE' | 'GENERAL_ACCOUNT'>(
    hasAdvances ? 'MUNIMI_SYSTEM' : 'GENERAL_ACCOUNT'
  );

  // Common Form Fields
  const [returnDate, setReturnDate] = useState<string>(todayStr);
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'>('CASH');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [agency, setAgency] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Tab 1 (Munimi Multi-Advance): Selected Advance IDs (default to all active advances)
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>(() => {
    if (initialAdvanceId && activeAdvances.some((a) => a.id === initialAdvanceId)) {
      return [initialAdvanceId];
    }
    return activeAdvances.map((a) => a.id);
  });

  // Tab 1: Option to reset interest rest date to return date
  const [resetRestDate, setResetRestDate] = useState<boolean>(true);

  // Tab 2 (Single Advance): Single selected advance ID
  const [singleAdvanceId, setSingleAdvanceId] = useState<string>(() => {
    if (initialAdvanceId && activeAdvances.some((a) => a.id === initialAdvanceId)) {
      return initialAdvanceId;
    }
    return activeAdvances[0]?.id || '';
  });

  // Calculate accrued interest on each advance up to the user-entered returnDate
  const advanceInterestMap = useMemo(() => {
    const map: Record<string, {
      principal: number;
      interestAmount: number;
      totalPayable: number;
      daysElapsed: number;
      monthsElapsed: number;
      monthlyRate: number;
    }> = {};

    activeAdvances.forEach((adv) => {
      const p = Number(adv.principal ?? adv.amount) || 0;
      const rate = adv.monthlyInterestRate ?? adv.interestRate ?? 2.0;
      const start = adv.startDate || adv.date || todayStr;
      const calc = calculateAdvanceInterest({
        principal: p,
        monthlyInterestRate: rate,
        annualInterestRate: adv.annualInterestRate,
        interestMode: adv.interestMode,
        compounding: adv.compounding,
        isInterestFree: adv.isInterestFree,
        lastInterestSettledDate: adv.lastInterestSettledDate,
        originalStartDate: adv.originalStartDate,
        isRolledForward: Boolean(adv.lastInterestSettledDate || adv.originalStartDate),
        repayments: Array.isArray(adv.repayments) ? adv.repayments : [],
        startDate: start,
        endDate: returnDate || todayStr
      });

      map[adv.id] = {
        principal: calc.netPrincipalRemaining,
        interestAmount: calc.interestAmount,
        totalPayable: calc.totalPayableWithInterest,
        daysElapsed: calc.daysElapsed,
        monthsElapsed: calc.monthsElapsed,
        monthlyRate: rate
      };
    });

    return map;
  }, [activeAdvances, returnDate, todayStr]);

  // Selected advances for Munimi System
  const selectedAdvancesList = useMemo(() => {
    return activeAdvances.filter((a) => selectedAdvanceIds.includes(a.id));
  }, [activeAdvances, selectedAdvanceIds]);

  // Aggregate stats on selected advances
  const totalAccruedInterest = useMemo(() => {
    return selectedAdvancesList.reduce((sum, adv) => {
      return sum + (advanceInterestMap[adv.id]?.interestAmount || 0);
    }, 0);
  }, [selectedAdvancesList, advanceInterestMap]);

  const totalRemainingPrincipal = useMemo(() => {
    return selectedAdvancesList.reduce((sum, adv) => {
      return sum + (advanceInterestMap[adv.id]?.principal || 0);
    }, 0);
  }, [selectedAdvancesList, advanceInterestMap]);

  const totalPayableAllSelected = useMemo(() => {
    return totalAccruedInterest + totalRemainingPrincipal;
  }, [totalAccruedInterest, totalRemainingPrincipal]);

  // Priority Allocation Engine (ਵਿਆਜ ਪਹਿਲਾਂ, ਬਾਕੀ ਸਭ ਤੋਂ ਪੁਰਾਣੇ ਮੂਲ ਵਿੱਚੋਂ)
  const settlementPlan = useMemo(() => {
    const numAmt = parseFloat(amount) || 0;
    if (numAmt <= 0 || selectedAdvancesList.length === 0) {
      return null;
    }

    let unallocated = numAmt;
    let totalInterestSettled = 0;
    let totalPrincipalSettled = 0;

    // Step 1: Allocate to interest of each selected advance first
    const allocations = selectedAdvancesList.map((adv) => {
      const stats = advanceInterestMap[adv.id];
      const interestDue = stats?.interestAmount || 0;
      const principalDue = stats?.principal || 0;

      const interestPaid = Math.min(unallocated, interestDue);
      unallocated -= interestPaid;
      totalInterestSettled += interestPaid;

      return {
        advanceId: adv.id,
        adv,
        oldPrincipal: principalDue,
        oldInterest: interestDue,
        interestPaid,
        principalPaid: 0,
        totalRepaymentAmount: interestPaid,
        newRemainingPrincipal: principalDue
      };
    });

    // Step 2: If money is left, allocate to principal of oldest advances in order
    if (unallocated > 0) {
      for (const item of allocations) {
        if (unallocated <= 0) break;
        const principalPaid = Math.min(unallocated, item.oldPrincipal);
        item.principalPaid = principalPaid;
        item.totalRepaymentAmount += principalPaid;
        item.newRemainingPrincipal = Math.max(0, item.oldPrincipal - principalPaid);
        unallocated -= principalPaid;
        totalPrincipalSettled += principalPaid;
      }
    }

    // New closing balance across all selected advances
    const newClosingBalance = allocations.reduce((sum, a) => sum + a.newRemainingPrincipal, 0);

    return {
      totalAmountReturned: numAmt,
      totalInterestSettled,
      totalPrincipalSettled,
      unallocatedExcess: unallocated,
      allocations,
      newClosingBalance
    };
  }, [amount, selectedAdvancesList, advanceInterestMap]);

  // Toggle selection of an advance in Tab 1
  const toggleAdvanceSelection = (advId: string) => {
    setSelectedAdvanceIds((prev) =>
      prev.includes(advId) ? prev.filter((id) => id !== advId) : [...prev, advId]
    );
  };

  const selectAllAdvances = () => {
    setSelectedAdvanceIds(activeAdvances.map((a) => a.id));
  };

  const deselectAllAdvances = () => {
    setSelectedAdvanceIds([]);
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      notifyError({
        titleEn: 'Invalid Amount',
        titlePa: 'ਗਲਤ ਰਕਮ',
        messageEn: 'Please enter a valid amount.',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਰਕਮ ਭਰੋ।'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'MUNIMI_SYSTEM') {
        if (!settlementPlan || settlementPlan.allocations.length === 0) {
          notifyError({
            titleEn: 'No Advances Selected',
            titlePa: 'ਕੋਈ ਐਡਵਾਂਸ ਨਹੀਂ ਚੁਣਿਆ',
            messageEn: 'Please select at least one advance.',
            messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਐਡਵਾਂਸ ਚੁਣੋ।'
          });
          setIsSubmitting(false);
          return;
        }

        const payload: MultiAdvanceSettlementPayload = {
          farmerId: farmer.id,
          returnDate: returnDate.trim() || todayStr,
          paymentMode,
          referenceNo: referenceNo.trim() || undefined,
          remarks: remarks.trim() || undefined,
          resetRestDate,
          allocations: settlementPlan.allocations.map((a) => ({
            advanceId: a.advanceId,
            interestPaid: a.interestPaid,
            principalPaid: a.principalPaid,
            totalRepaymentAmount: a.totalRepaymentAmount,
            newRemainingPrincipal: a.newRemainingPrincipal,
            oldPrincipal: a.oldPrincipal,
            oldInterest: a.oldInterest
          }))
        };

        const success = settleMultiAdvanceRepayment(payload);
        if (success) {
          notifySaveSuccess({
            titleEn: 'Repayment & Balance Rest Recorded',
            titlePa: 'ਮੁਨੀਮੀ ਵਾਪਸੀ ਤੇ ਨਵਾਂ ਬੈਲੇਂਸ ਦਰਜ ਹੋ ਗਿਆ',
            messageEn: `Settled interest ₹${Math.round(settlementPlan.totalInterestSettled).toLocaleString('en-IN')} and principal ₹${Math.round(settlementPlan.totalPrincipalSettled).toLocaleString('en-IN')}. New closing balance: ₹${Math.round(settlementPlan.newClosingBalance).toLocaleString('en-IN')}`,
            messagePa: `ਕੁੱਲ ₹${numAmount.toLocaleString('en-IN')} ਵਿੱਚੋਂ ₹${Math.round(settlementPlan.totalInterestSettled).toLocaleString('en-IN')} ਵਿਆਜ ਚੁਕਤਾ ਅਤੇ ₹${Math.round(settlementPlan.totalPrincipalSettled).toLocaleString('en-IN')} ਮੂਲ ਵਿੱਚੋਂ ਘਟਾ ਕੇ ਨਵਾਂ ਕਲੋਜ਼ਿੰਗ ਬੈਲੇਂਸ ₹${Math.round(settlementPlan.newClosingBalance).toLocaleString('en-IN')} ਦਰਜ ਹੋ ਗਿਆ ਹੈ।`
          });
          if (onPaymentSaved) onPaymentSaved();
          onClose();
        } else {
          notifyError({
            titleEn: 'Error',
            titlePa: 'ਗਲਤੀ',
            messageEn: 'Failed to record repayment.',
            messagePa: 'ਵਾਪਸੀ ਦਰਜ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।'
          });
        }
      } else if (activeTab === 'SINGLE_ADVANCE') {
        if (!singleAdvanceId) {
          notifyError({
            titleEn: 'No Advance Selected',
            titlePa: 'ਕੋਈ ਐਡਵਾਂਸ ਨਹੀਂ ਚੁਣਿਆ',
            messageEn: 'Please select an advance.',
            messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਕੋਈ ਐਡਵਾਂਸ ਚੁਣੋ।'
          });
          setIsSubmitting(false);
          return;
        }

        const success = addAdvanceRepayment(singleAdvanceId, {
          date: returnDate.trim() || todayStr,
          amount: numAmount,
          paymentMode,
          referenceNumber: referenceNo.trim() || undefined,
          referenceNo: referenceNo.trim() || undefined,
          remarks: remarks.trim() || undefined,
          settleInterestAndRollForward: true
        });

        if (success) {
          notifySaveSuccess({
            titleEn: 'Repayment Recorded',
            titlePa: 'ਕਿਸ਼ਤ ਵਾਪਸੀ ਦਰਜ ਹੋ ਗਈ',
            messageEn: `Repayment of ₹${numAmount.toLocaleString('en-IN')} added.`,
            messagePa: `₹${numAmount.toLocaleString('en-IN')} ਦੀ ਕਿਸ਼ਤ ਵਾਪਸੀ ਦਰਜ ਹੋ ਗਈ।`
          });
          if (onPaymentSaved) onPaymentSaved();
          onClose();
        } else {
          notifyError({
            titleEn: 'Error',
            titlePa: 'ਗਲਤੀ',
            messageEn: 'Failed to record repayment.',
            messagePa: 'ਵਾਪਸੀ ਦਰਜ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।'
          });
        }
      } else {
        // GENERAL ACCOUNT RECOVERY
        addFarmerPayment({
          farmerId: farmer.id,
          date: returnDate.trim() || todayStr,
          amount: numAmount,
          paymentMode,
          referenceNumber: referenceNo.trim(),
          agency: agency.trim(),
          remarks: remarks.trim() || 'ਆਮ ਖਾਤਾ ਰਿਕਵਰੀ / ਭੁਗਤਾਨ',
          status: 'PAID'
        });

        notifySaveSuccess({
          titleEn: 'Payment Recorded',
          titlePa: 'ਸਿੱਧੀ ਰਿਕਵਰੀ ਦਰਜ ਹੋ ਗਈ',
          messageEn: `Payment of ₹${numAmount.toLocaleString('en-IN')} credited to farmer account.`,
          messagePa: `ਕਿਸਾਨ ਦੇ ਖਾਤੇ ਵਿੱਚ ₹${numAmount.toLocaleString('en-IN')} ਦੀ ਸਿੱਧੀ ਰਿਕਵਰੀ ਦਰਜ ਹੋ ਗਈ।`
        });
        if (onPaymentSaved) onPaymentSaved();
        onClose();
      }
    } catch (err) {
      console.error(err);
      notifyError({
        titleEn: 'Error',
        titlePa: 'ਗਲਤੀ',
        messageEn: 'An unexpected error occurred.',
        messagePa: 'ਦਰਜ ਕਰਦੇ ਸਮੇਂ ਅਣਕਿਆਸੀ ਗਲਤੀ ਆਈ।'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <Receipt className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>ਕਿਸਾਨ ਪੈਸੇ ਵਾਪਸੀ ਤੇ ਵਿਆਜ ਕਟੌਤੀ (Munimi Repayment & Interest Settlement)</span>
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                ਕਿਸਾਨ: <strong className="text-white">{farmer.farmerNamePa} ({farmer.farmerName})</strong> • ਖਾਤਾ ਨੰ: <span className="font-mono text-emerald-300 font-bold">{farmer.id}</span> • ਪਿੰਡ: {farmer.villagePa || farmer.village}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top 3 Navigation Tabs */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('MUNIMI_SYSTEM')}
            className={`flex-1 min-w-[200px] py-2.5 px-3 rounded-xl font-black transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'MUNIMI_SYSTEM'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="text-left">
              <div className="leading-tight">1. ਮੁਨੀਮੀ ਨਿਯਮ: ਵਿਆਜ ਪਹਿਲਾਂ ਤੇ ਕਲੋਜ਼ਿੰਗ ਬੈਲੇਂਸ</div>
              <div className={`text-[10px] font-normal ${activeTab === 'MUNIMI_SYSTEM' ? 'text-emerald-100' : 'text-slate-500'}`}>
                ਪਹਿਲਾਂ ਵਿਆਜ ਕੱਟੋ, ਬਾਕੀ ਪੁਰਾਣੇ ਮੂਲ ਵਿੱਚੋਂ ਤੇ ਨਵਾਂ ਬੈਲੇਂਸ ਸ਼ੁਰੂ
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SINGLE_ADVANCE')}
            className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'SINGLE_ADVANCE'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <div className="leading-tight">2. ਕਿਸੇ ਇੱਕ ਐਡਵਾਂਸ ਵਿੱਚ ਵਾਪਸੀ</div>
              <div className={`text-[10px] font-normal ${activeTab === 'SINGLE_ADVANCE' ? 'text-teal-100' : 'text-slate-500'}`}>
                ਸਿਰਫ਼ ਇੱਕ ਖਾਸ ਐਂਟਰੀ 'ਤੇ ਕਿਸ਼ਤ ਜਮ੍ਹਾਂ
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GENERAL_ACCOUNT')}
            className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'GENERAL_ACCOUNT'
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Wallet className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <div className="leading-tight">3. ਸਿੱਧਾ ਖਾਤੇ ਵਿੱਚ ਜਮ੍ਹਾਂ</div>
              <div className={`text-[10px] font-normal ${activeTab === 'GENERAL_ACCOUNT' ? 'text-slate-300' : 'text-slate-500'}`}>
                ਆਮ ਖਾਤਾ ਰਿਕਵਰੀ / ਸਿੱਧੀ ਰਸੀਦ
              </div>
            </div>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* ============================================================== */}
          {/* TAB 1: MUNIMI SYSTEM (INTEREST FIRST + OLDEST PRINCIPAL REST)  */}
          {/* ============================================================== */}
          {activeTab === 'MUNIMI_SYSTEM' && (
            <div className="space-y-4">
              {/* Advance Selection Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ਚੁਣੋ ਕਿ ਕਿਹੜੇ-ਕਿਹੜੇ ਐਡਵਾਂਸ ਦਾ ਵਿਆਜ ਤੇ ਮੂਲ ਚੁਕਤਾ ਕਰਨਾ ਹੈ ({selectedAdvanceIds.length}/{activeAdvances.length} ਚੁਣੇ ਹੋਏ):
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ਸਿਸਟਮ ਚੁਣੇ ਹੋਏ ਐਡਵਾਂਸਾਂ ਦਾ ਬਣਿਆ ਵਿਆਜ ਪਹਿਲਾਂ ਕੱਟੇਗਾ, ਅਤੇ ਬਾਕੀ ਰਕਮ ਸਭ ਤੋਂ ਪੁਰਾਣੇ ਮੂਲ ਵਿੱਚੋਂ ਘਟਾ ਦੇਵੇਗਾ।
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={selectAllAdvances}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200 cursor-pointer"
                  >
                    ਸਾਰੇ ਚੁਣੋ (Select All)
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllAdvances}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 py-0.5 bg-slate-50 rounded border border-slate-200 cursor-pointer"
                  >
                    ਸਾਰੇ ਹਟਾਓ
                  </button>
                </div>
              </div>

              {/* Advance Cards List */}
              {activeAdvances.length === 0 ? (
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center text-amber-900">
                  <AlertCircle className="w-8 h-8 mx-auto text-amber-600 opacity-70 mb-1" />
                  <p className="font-bold text-sm">ਇਸ ਕਿਸਾਨ ਲਈ ਕੋਈ ਬਕਾਇਆ ਐਡਵਾਂਸ ਨਹੀਂ ਹੈ।</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    ਤੁਸੀਂ ਟੈਬ 3 "ਸਿੱਧਾ ਖਾਤੇ ਵਿੱਚ ਜਮ੍ਹਾਂ" ਰਾਹੀਂ ਰਕਮ ਜਮ੍ਹਾਂ ਕਰਵਾ ਸਕਦੇ ਹੋ।
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {activeAdvances.map((adv) => {
                    const isSelected = selectedAdvanceIds.includes(adv.id);
                    const stats = advanceInterestMap[adv.id] || {
                      principal: Number(adv.amount) || 0,
                      interestAmount: 0,
                      totalPayable: Number(adv.amount) || 0,
                      daysElapsed: 0,
                      monthsElapsed: 0,
                      monthlyRate: 2.0
                    };

                    return (
                      <div
                        key={adv.id}
                        onClick={() => toggleAdvanceSelection(adv.id)}
                        className={`p-3 rounded-2xl border-2 transition cursor-pointer relative select-none ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] transition ${
                              isSelected ? 'bg-emerald-700 text-white' : 'border border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span className="font-mono font-black text-slate-900 text-xs">
                              {adv.date}
                            </span>
                            <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                              {adv.type || 'ਨਕਦ'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-[11px] text-slate-500">
                            #{adv.id}
                          </span>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">ਮੂਲ ਰਕਮ:</span>
                            <strong className="font-mono text-slate-900 font-black">
                              ₹{Math.round(stats.principal).toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span className="text-amber-800 block text-[10px]">ਬਣਿਆ ਵਿਆਜ ({stats.monthlyRate}%):</span>
                            <strong className="font-mono text-amber-900 font-black">
                              ₹{Math.round(stats.interestAmount).toLocaleString('en-IN')}
                            </strong>
                          </div>
                        </div>

                        {/* Total Payable Badge */}
                        <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 text-[10px]">ਕੁੱਲ ਦੇਣਯੋਗ:</span>
                          <span className="font-mono font-black text-rose-900">
                            ₹{Math.round(stats.totalPayable).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total Aggregate Summary of Selected Advances */}
              {selectedAdvancesList.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-emerald-100/70 via-teal-100/70 to-slate-100 rounded-2xl border-2 border-emerald-300 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-800" />
                    <div>
                      <span className="font-black text-emerald-950 text-xs block">
                        ਚੁਣੇ ਹੋਏ {selectedAdvancesList.length} ਐਡਵਾਂਸਾਂ ਦਾ ਕੁੱਲ ਜੋੜ (ਮਿਤੀ {returnDate} ਤੱਕ):
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        ਕੁੱਲ ਮੂਲ: <strong className="font-mono text-slate-900">₹{Math.round(totalRemainingPrincipal).toLocaleString('en-IN')}</strong> + ਕੁੱਲ ਬਣਿਆ ਵਿਆਜ: <strong className="font-mono text-amber-950">₹{Math.round(totalAccruedInterest).toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[11px] text-emerald-950 font-bold">ਕੁੱਲ ਦੇਣਦਾਰੀ:</span>
                    <span className="text-base font-black font-mono text-emerald-950 bg-white px-3 py-1 rounded-xl border-2 border-emerald-400 shadow-xs">
                      ₹{Math.round(totalPayableAllSelected).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: SINGLE ADVANCE SELECTION                                */}
          {/* ============================================================== */}
          {activeTab === 'SINGLE_ADVANCE' && (
            <div className="space-y-3">
              <label className="block font-bold text-slate-700">
                ਉਹ ਐਡਵਾਂਸ ਚੁਣੋ ਜਿਸ ਖ਼ਿਲਾਫ਼ ਕਿਸ਼ਤ ਵਾਪਸ ਕਰਨੀ ਹੈ:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeAdvances.map((adv) => {
                  const isSelected = adv.id === singleAdvanceId;
                  const stats = advanceInterestMap[adv.id] || { principal: 0, interestAmount: 0, totalPayable: 0 };
                  return (
                    <div
                      key={adv.id}
                      onClick={() => setSingleAdvanceId(adv.id)}
                      className={`p-3 rounded-2xl border-2 transition cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50 border-teal-600 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-slate-900">{adv.date} • {adv.type || 'ਨਕਦ'}</span>
                        <span className="font-mono font-bold text-teal-800">#{adv.id}</span>
                      </div>
                      <div className="flex justify-between text-[11px] mt-2 text-slate-600">
                        <span>ਮੂਲ: <strong>₹{Math.round(stats.principal).toLocaleString('en-IN')}</strong></span>
                        <span>ਵਿਆਜ: <strong className="text-amber-800">₹{Math.round(stats.interestAmount).toLocaleString('en-IN')}</strong></span>
                        <span>ਦੇਣਯੋਗ: <strong className="text-rose-900">₹{Math.round(stats.totalPayable).toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: GENERAL ACCOUNT NOTICE                                  */}
          {/* ============================================================== */}
          {activeTab === 'GENERAL_ACCOUNT' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <Info className="w-5 h-5 text-slate-600 shrink-0" />
              <div>
                <strong className="block font-black text-slate-900 text-xs">
                  ਆਮ ਖਾਤੇ ਵਿੱਚ ਸਿੱਧਾ ਜਮ੍ਹਾਂ (Direct Account Credit)
                </strong>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  ਇਹ ਰਕਮ ਕਿਸੇ ਖਾਸ ਐਡਵਾਂਸ ਨਾਲ ਨਹੀਂ ਬੰਨ੍ਹੀ ਜਾਵੇਗੀ, ਸਗੋਂ ਕਿਸਾਨ ਦੇ ਸੀਜ਼ਨ ਲੇਜ਼ਰ ਵਿੱਚ ਸਿੱਧੇ ਭੁਗਤਾਨ/ਰਿਕਵਰੀ ਵਜੋਂ ਕ੍ਰੈਡਿਟ ਹੋਵੇਗੀ।
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* FORM INPUTS: DATE, AMOUNT, MODE, REF, REMARKS                   */}
          {/* ============================================================== */}
          <form onSubmit={handleSubmit} id="farmer-recovery-form" className="space-y-3 pt-3 border-t-2 border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Return Date */}
              <div>
                <label className="block font-black text-slate-800 mb-1">
                  ਵਾਪਸੀ ਮਿਤੀ (Payment / Return Date) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(autoFormatDate(e.target.value))}
                    maxLength={10}
                    placeholder="DD/MM/YYYY"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  ਤਾਰੀਖ਼ ਬਦਲਣ ਨਾਲ ਅੱਜ ਤੱਕ ਬਣੇ ਵਿਆਜ ਦਾ ਹਿਸਾਬ ਲਾਈਵ ਅਪਡੇਟ ਹੁੰਦਾ ਹੈ।
                </span>
              </div>

              {/* Returned Amount */}
              <div>
                <label className="block font-black text-slate-800 mb-1">
                  ਕਿਸਾਨ ਵੱਲੋਂ ਵਾਪਸ ਕੀਤੀ ਰਕਮ (Returned Amount ₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 70000"
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-emerald-500 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Quick Autofill Buttons for Munimi System */}
                {activeTab === 'MUNIMI_SYSTEM' && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-500 font-bold">ਸਿੱਧਾ ਭਰੋ:</span>
                    {totalAccruedInterest > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(String(Math.round(totalAccruedInterest)))}
                        className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded text-[10px] font-black cursor-pointer transition"
                      >
                        ਸਿਰਫ਼ ਕੁੱਲ ਵਿਆਜ (₹{Math.round(totalAccruedInterest).toLocaleString('en-IN')})
                      </button>
                    )}
                    {totalPayableAllSelected > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(String(Math.round(totalPayableAllSelected)))}
                        className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 rounded text-[10px] font-black cursor-pointer transition"
                      >
                        ਪੂਰੀ ਦੇਣਦਾਰੀ (₹{Math.round(totalPayableAllSelected).toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Payment Mode */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ਭੁਗਤਾਨ ਢੰਗ (Mode)
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="CASH">💵 ਨਕਦ (Cash)</option>
                  <option value="BANK_TRANSFER">🏦 ਬੈਂਕ ਟ੍ਰਾਂਸਫਰ (Bank/NEFT/RTGS)</option>
                  <option value="CHEQUE">📝 ਚੈੱਕ (Cheque)</option>
                  <option value="OTHER">ਸਿੱਧਾ / ਹੋਰ (Other)</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ਰਸੀਦ / ਰੈਫਰੈਂਸ / UTR ਨੰ.
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. REC-102 ਜਾਂ UTR"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Agency / Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ਖਰੀਦ ਏਜੰਸੀ / ਸੰਸਥਾ
                </label>
                <input
                  type="text"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  placeholder="e.g. Markfed, Pungrain"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ਟਿੱਪਣੀ / ਵੇਰਵਾ (Remarks)
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. ਫਸਲ ਦੀ ਕਟਾਈ ਤੋਂ ਪਹਿਲਾਂ ਨਕਦ ਵਾਪਸ ਕੀਤੇ"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* ============================================================== */}
            {/* OPTION CHECKBOX: RESET REST DATE TO RETURN DATE               */}
            {/* ============================================================== */}
            {activeTab === 'MUNIMI_SYSTEM' && (
              <div className="p-3 bg-amber-50/80 rounded-2xl border-2 border-amber-200 space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resetRestDate}
                    onChange={(e) => setResetRestDate(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-black text-amber-950 text-xs block">
                      ਵਾਪਸੀ ਮਿਤੀ ({returnDate}) ਤੋਂ ਨਵਾਂ ਕਲੋਜ਼ਿੰਗ ਬੈਲੇਂਸ ਸ਼ੁਰੂ ਕਰੋ (Reset Interest Rest Date)
                    </span>
                    <span className="text-[11px] text-amber-800 block">
                      ਚੁਣੇ ਹੋਏ ਐਡਵਾਂਸਾਂ ਦਾ ਪਿਛਲਾ ਵਿਆਜ ਅੱਜ ਚੁਕਤਾ ਮੰਨਿਆ ਜਾਵੇਗਾ, ਅਤੇ ਭਵਿੱਖ ਦਾ ਵਿਆਜ ਸਿਰਫ਼ ਬਾਕੀ ਬਚੇ ਮੂਲ ਉੱਤੇ ਮਿਤੀ {returnDate} ਤੋਂ ਸ਼ੁਰੂ ਹੋਵੇਗਾ।
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* ============================================================== */}
            {/* LIVE MUNIMI ALLOCATION BREAKDOWN TABLE (EXACT USER REQUIREMENT)*/}
            {/* ============================================================== */}
            {activeTab === 'MUNIMI_SYSTEM' && settlementPlan && (
              <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 rounded-2xl border-2 border-emerald-400 space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h4 className="font-black text-emerald-950 text-xs">
                        ਲਾਈਵ ਮੁਨੀਮੀ ਹਿਸਾਬ ਵੇਰਵਾ (Live Settlement Preview):
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        ਵਿਆਜ ਪਹਿਲਾਂ ਕੱਟਿਆ ਜਾ ਰਿਹਾ ਹੈ, ਅਤੇ ਬਾਕੀ ਰਕਮ ਪਹਿਲੇ ਮੂਲ ਵਿੱਚੋਂ ਘਟਾਈ ਜਾ ਰਹੀ ਹੈ:
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                    ਵਾਪਸ ਰਕਮ: ₹{Math.round(settlementPlan.totalAmountReturned).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* 3 Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-amber-900 block text-[10px] font-bold">1. ਚੁਕਤਾ ਹੋਇਆ ਕੁੱਲ ਵਿਆਜ:</span>
                    <strong className="font-mono text-amber-950 text-sm">
                      ₹{Math.round(settlementPlan.totalInterestSettled).toLocaleString('en-IN')}
                    </strong>
                    <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                      {settlementPlan.totalInterestSettled >= totalAccruedInterest ? '✅ ਸਾਰਾ ਵਿਆਜ ਚੁਕਤਾ' : 'ਅੰਸ਼ਕ ਵਿਆਜ ਭਰਿਆ'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-emerald-900 block text-[10px] font-bold">2. ਮੂਲ ਵਿੱਚੋਂ ਘਟਾਈ ਰਕਮ:</span>
                    <strong className="font-mono text-emerald-950 text-sm">
                      ₹{Math.round(settlementPlan.totalPrincipalSettled).toLocaleString('en-IN')}
                    </strong>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      (ਸਭ ਤੋਂ ਪੁਰਾਣੇ ਐਡਵਾਂਸ ਵਿੱਚੋਂ)
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-slate-700 block text-[10px] font-bold">3. ਨਵਾਂ ਕੁੱਲ ਕਲੋਜ਼ਿੰਗ ਬੈਲੇਂਸ:</span>
                    <strong className="font-mono text-rose-950 text-base">
                      ₹{Math.round(settlementPlan.newClosingBalance).toLocaleString('en-IN')}
                    </strong>
                    <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                      {resetRestDate ? `📅 ${returnDate} ਤੋਂ ਨਵਾਂ ਵਿਆਜ ਸ਼ੁਰੂ` : 'ਪੁਰਾਣਾ ਚੱਲਦਾ ਰਹੇਗਾ'}
                    </span>
                  </div>
                </div>

                {/* Per-Advance Breakdown Table */}
                <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-emerald-100/60 text-emerald-950 font-black border-b border-emerald-200">
                      <tr>
                        <th className="p-2">ਐਡਵਾਂਸ ਤਾਰੀਖ਼</th>
                        <th className="p-2 text-right">ਪੁਰਾਣਾ ਮੂਲ</th>
                        <th className="p-2 text-right">ਬਣਿਆ ਵਿਆਜ</th>
                        <th className="p-2 text-right">ਚੁਕਤਾ ਵਿਆਜ</th>
                        <th className="p-2 text-right">ਮੂਲ ਕਟੌਤੀ</th>
                        <th className="p-2 text-right font-black">ਨਵਾਂ ਬਾਕੀ ਮੂਲ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {settlementPlan.allocations.map((item) => (
                        <tr key={item.advanceId} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-900">
                            {item.adv.date} <span className="text-[10px] text-slate-500 font-normal">({item.adv.type || 'ਨਕਦ'})</span>
                          </td>
                          <td className="p-2 text-right font-mono">
                            ₹{Math.round(item.oldPrincipal).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right font-mono text-amber-900">
                            ₹{Math.round(item.oldInterest).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800">
                            -₹{Math.round(item.interestPaid).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-900">
                            -₹{Math.round(item.principalPaid).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2 text-right font-mono font-black text-rose-950 bg-emerald-50/50">
                            ₹{Math.round(item.newRemainingPrincipal).toLocaleString('en-IN')}
                            {item.newRemainingPrincipal <= 0 && (
                              <span className="ml-1 text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-bold">
                                ਚੁਕਤਾ
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {settlementPlan.unallocatedExcess > 0 && (
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-900 text-[11px] font-bold">
                    ਨੋਟ: ਭਰੀ ਗਈ ਰਕਮ ਚੁਣੇ ਹੋਏ ਐਡਵਾਂਸਾਂ ਦੀ ਕੁੱਲ ਦੇਣਦਾਰੀ ਨਾਲੋਂ ₹{Math.round(settlementPlan.unallocatedExcess).toLocaleString('en-IN')} ਵੱਧ ਹੈ।
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {activeTab === 'MUNIMI_SYSTEM'
              ? `ਮੁਨੀਮੀ ਸਿਸਟਮ: ${selectedAdvanceIds.length} ਐਡਵਾਂਸ ਚੁਣੇ ਹਨ`
              : activeTab === 'SINGLE_ADVANCE'
              ? `ਐਡਵਾਂਸ #${singleAdvanceId || '—'} ਵਿੱਚ ਵਾਪਸੀ`
              : 'ਸਿੱਧੀ ਖਾਤਾ ਰਸੀਦ'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs cursor-pointer transition"
            >
              ਰੱਦ ਕਰੋ (Cancel)
            </button>
            <button
              type="submit"
              form="farmer-recovery-form"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'ਦਰਜ ਹੋ ਰਿਹਾ ਹੈ...' : 'ਵਾਪਸੀ ਦਰਜ ਕਰੋ (Save Settlement)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
