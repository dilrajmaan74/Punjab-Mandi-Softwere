import React, { useState, useMemo } from 'react';
import { FarmerAdvanceRecord, AdvanceRepayment, Farmer } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDateToDDMMYYYY, calculateAdvanceInterest, autoFormatDate } from '../../utils/calculations';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  IndianRupee,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface AdvanceRepaymentModalProps {
  advance: FarmerAdvanceRecord;
  farmerName?: string;
  farmer?: Farmer;
  onClose: () => void;
  onRepaymentUpdated?: () => void;
}

export const AdvanceRepaymentModal: React.FC<AdvanceRepaymentModalProps> = ({
  advance,
  farmerName,
  farmer,
  onClose,
  onRepaymentUpdated
}) => {
  const { addAdvanceRepayment, deleteAdvanceRepayment, language } = useMandi();
  const { notifySaveSuccess, notifyDeleteSuccess, notifyError, confirmDelete } = useNotification();
  const isPa = language === 'pa';
  const todayStr = formatDateToDDMMYYYY(new Date());

  const displayName = farmer?.farmerNamePa ? `${farmer.farmerNamePa} (${farmer.farmerName})` : (farmerName || farmer?.farmerName || advance.farmerName || 'Farmer');

  const [date, setDate] = useState(todayStr);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'>('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [settleAndRollForward, setSettleAndRollForward] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const repayments: AdvanceRepayment[] = Array.isArray(advance.repayments) ? advance.repayments : [];
  const totalRepaid = advance.totalRepaid || repayments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const originalPrincipal = Number(advance.principal ?? advance.amount) || 0;

  // Accrued interest from advance start date up to the entered return date
  const accruedInterestTillReturnDate = useMemo(() => {
    const calc = calculateAdvanceInterest({
      principal: originalPrincipal,
      monthlyInterestRate: advance.monthlyInterestRate,
      annualInterestRate: advance.annualInterestRate,
      interestMode: advance.interestMode,
      compounding: advance.compounding,
      isInterestFree: advance.isInterestFree,
      startDate: advance.startDate || advance.date,
      endDate: date.trim() || todayStr
    });
    return calc.interestAmount;
  }, [originalPrincipal, advance, date, todayStr]);

  const interestAmount = accruedInterestTillReturnDate;
  const interestPaid = Math.min(interestAmount, totalRepaid);
  const principalPaid = Math.max(0, Math.round((totalRepaid - interestPaid) * 100) / 100);
  const netPrincipal = Math.max(0, Math.round((originalPrincipal - principalPaid) * 100) / 100);
  const unpaidInterest = Math.max(0, Math.round((interestAmount - interestPaid) * 100) / 100);
  const totalPayable = Math.round((netPrincipal + unpaidInterest) * 100) / 100;

  // Live preview for current input
  const numInputAmount = parseFloat(amount) || 0;
  const previewInterestPaid = Math.min(interestAmount, numInputAmount);
  const previewPrincipalPaid = Math.max(0, Math.round((numInputAmount - previewInterestPaid) * 100) / 100);
  const previewClosingBalance = Math.max(0, Math.round((originalPrincipal - previewPrincipalPaid + (interestAmount - previewInterestPaid)) * 100) / 100);

  const handleAddRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      notifyError({
        titleEn: 'Invalid Amount',
        titlePa: 'ਗਲਤ ਰਕਮ',
        messageEn: 'Please enter a valid repayment amount.',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਰਕਮ ਭਰੋ।'
      });
      return;
    }

    if (numAmount > totalPayable && totalPayable > 0) {
      const confirmOverpay = window.confirm(
        isPa
          ? `ਰਕਮ (₹${numAmount.toLocaleString('en-IN')}) ਕੁੱਲ ਦੇਣਯੋਗ (₹${totalPayable.toLocaleString('en-IN')}) ਨਾਲੋਂ ਵੱਧ ਹੈ। ਕੀ ਤੁਸੀਂ ਜਾਰੀ ਰੱਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?`
          : `Amount (₹${numAmount}) exceeds remaining payable (₹${totalPayable}). Do you want to proceed?`
      );
      if (!confirmOverpay) return;
    }

    setIsSubmitting(true);
    try {
      const success = addAdvanceRepayment(advance.id, {
        date: date.trim() || todayStr,
        amount: numAmount,
        paymentMode,
        referenceNumber: referenceNo.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        settleInterestAndRollForward: settleAndRollForward
      });

      if (success) {
        notifySaveSuccess({
          titleEn: 'Repayment Recorded',
          titlePa: 'ਕਿਸ਼ਤ ਵਾਪਸੀ ਦਰਜ ਹੋ ਗਈ',
          messageEn: `Repayment of ₹${numAmount.toLocaleString('en-IN')} added successfully.`,
          messagePa: `₹${numAmount.toLocaleString('en-IN')} ਦੀ ਕਿਸ਼ਤ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਕੀਤੀ ਗਈ। ਬਾਕੀ ਬਕਾਇਆ: ₹${previewClosingBalance.toLocaleString('en-IN')}`
        });
        setAmount('');
        setReferenceNo('');
        setRemarks('');
        if (onRepaymentUpdated) onRepaymentUpdated();
      } else {
        notifyError({
          titleEn: 'Error',
          titlePa: 'ਗਲਤੀ',
          messageEn: 'Failed to add repayment.',
          messagePa: 'ਕਿਸ਼ਤ ਦਰਜ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।'
        });
      }
    } catch (err) {
      console.error(err);
      notifyError({
        titleEn: 'Error',
        titlePa: 'ਗਲਤੀ',
        messageEn: 'Error recording repayment.',
        messagePa: 'ਕਿਸ਼ਤ ਦਰਜ ਕਰਦੇ ਸਮੇਂ ਗਲਤੀ ਹੋਈ।'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRepayment = (repId: string, repAmount: number) => {
    confirmDelete({
      recordNameEn: 'Advance Repayment',
      recordNamePa: 'ਪੇਸ਼ਗੀ ਕਿਸ਼ਤ ਵਾਪਸੀ',
      recordId: repId,
      itemDetails: [
        { labelEn: 'Amount', labelPa: 'ਰਕਮ', value: `₹${repAmount.toLocaleString('en-IN')}` }
      ],
      onConfirm: () => {
        const success = deleteAdvanceRepayment(advance.id, repId);
        if (success) {
          notifyDeleteSuccess({
            titleEn: 'Repayment Deleted',
            titlePa: 'ਕਿਸ਼ਤ ਹਟਾਈ ਗਈ',
            messageEn: `Repayment of ₹${repAmount.toLocaleString('en-IN')} deleted.`,
            messagePa: `₹${repAmount.toLocaleString('en-IN')} ਦੀ ਕਿਸ਼ਤ ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।`
          });
          if (onRepaymentUpdated) onRepaymentUpdated();
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-300" />
              {isPa ? 'ਐਡਵਾਂਸ ਕਿਸ਼ਤ ਵਾਪਸੀ (Partial Repayments)' : 'Advance Repayment & Installments'}
            </h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              {displayName} • {advance.id} • {advance.date}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Advance Balance Snapshot Card */}
        <div className="p-4 bg-emerald-50/50 border-b border-emerald-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                {isPa ? 'ਮੂਲ ਐਡਵਾਂਸ' : 'Original Principal'}
              </span>
              <span className="text-base font-black text-slate-800 mt-0.5 block">
                {formatCurrency(originalPrincipal)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
                {isPa ? 'ਕੁੱਲ ਵਾਪਸ (Paid)' : 'Total Repaid'}
              </span>
              <span className="text-base font-black text-emerald-700 mt-0.5 block">
                {formatCurrency(totalRepaid)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
                {isPa ? 'ਬਾਕੀ ਮੂਲ' : 'Remaining Principal'}
              </span>
              <span className="text-base font-black text-amber-800 mt-0.5 block">
                {formatCurrency(netPrincipal)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
                {isPa ? 'ਕੁੱਲ ਦੇਣਯੋਗ' : 'Net Total Payable'}
              </span>
              <span className="text-base font-black text-rose-800 mt-0.5 block">
                {formatCurrency(totalPayable)}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add Repayment Form */}
          <form onSubmit={handleAddRepayment} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              {isPa ? 'ਨਵੀਂ ਕਿਸ਼ਤ / ਵਾਪਸੀ ਰਕਮ ਦਰਜ ਕਰੋ' : 'Record New Repayment / Installment'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isPa ? 'ਮਿਤੀ (DD/MM/YYYY)' : 'Date'}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(autoFormatDate(e.target.value))}
                    maxLength={10}
                    placeholder="DD/MM/YYYY"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isPa ? 'ਵਾਪਸ ਕੀਤੀ ਰਕਮ (₹)' : 'Repaid Amount (₹)'}
                </label>
                <div className="relative">
                  <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isPa ? 'ਭੁਗਤਾਨ ਮੋਡ' : 'Payment Mode'}
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="CASH">{isPa ? 'ਨਕਦ (Cash)' : 'Cash'}</option>
                  <option value="BANK">{isPa ? 'ਬੈਂਕ ਖਾਤਾ (Bank Transfer)' : 'Bank Transfer'}</option>
                  <option value="UPI">{isPa ? 'ਯੂਪੀਆਈ (UPI / GPay)' : 'UPI / GPay'}</option>
                  <option value="CHEQUE">{isPa ? 'ਚੈੱਕ (Cheque)' : 'Cheque'}</option>
                </select>
              </div>
            </div>

            {numInputAmount > 0 && (
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>ਰਕਮ ਵੰਡ (Munimi Repayment Breakdown):</span>
                  <span>ਕੁੱਲ ਭਰੀ: {formatCurrency(numInputAmount)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-amber-200">
                    <span className="text-[10px] text-amber-800 block">ਵਿਆਜ ਚੁਕਤਾ (Interest Paid)</span>
                    <strong className="text-amber-900 text-sm">{formatCurrency(previewInterestPaid)}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-600 block">ਮੂਲ ਕਟੌਤੀ (Principal Paid)</span>
                    <strong className="text-slate-800 text-sm">{formatCurrency(previewPrincipalPaid)}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-emerald-300">
                    <span className="text-[10px] text-emerald-800 block">ਨਵਾਂ ਬਾਕੀ ਬਕਾਇਆ (Closing Balance)</span>
                    <strong className="text-emerald-900 text-sm">{formatCurrency(previewClosingBalance)}</strong>
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1.5 cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={settleAndRollForward}
                    onChange={(e) => setSettleAndRollForward(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-[11px] leading-tight">
                    <strong>ਮਿਤੀ {date} ਤੱਕ ਦਾ ਵਿਆਜ ਨਿਬੇੜ ਕੇ ਨਵਾਂ ਹਿਸਾਬ ਇਸ ਮਿਤੀ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ</strong>
                    <span className="block text-[10px] text-slate-500">
                      (ਇਸ ਮਿਤੀ ਤੱਕ ਦਾ ਵਿਆਜ ਚੁਕਤਾ ਹੋ ਜਾਵੇਗਾ, ਅਤੇ ਬਾਕੀ ਬਕਾਏ ₹{previewClosingBalance.toLocaleString('en-IN')} 'ਤੇ ਅਗਲਾ ਵਿਆਜ ਇਸ ਮਿਤੀ ਤੋਂ ਚੱਲੇਗਾ)
                    </span>
                  </span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isPa ? 'ਰਸੀਦ / ਪਰਚੀ ਨੰਬਰ (ਵਿਕਲਪਿਕ)' : 'Slip / Ref No. (Optional)'}
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. REC-102"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isPa ? 'ਟਿੱਪਣੀ / ਵੇਰਵਾ (ਵਿਕਲਪਿਕ)' : 'Remarks (Optional)'}
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. ਫਸਲ ਵਿਕਣ ਤੋਂ ਪਹਿਲਾਂ ਜਮ੍ਹਾਂ"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {isPa ? 'ਕਿਸ਼ਤ ਜਮ੍ਹਾਂ ਕਰੋ (Record Payment)' : 'Record Payment'}
              </button>
            </div>
          </form>

          {/* Repayment History Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                {isPa ? 'ਕਿਸ਼ਤ ਵਾਪਸੀ ਇਤਿਹਾਸ (Payment History)' : 'Repayment History'}
              </span>
              <span className="text-xs font-normal text-slate-500">
                {repayments.length} {isPa ? 'ਕਿਸ਼ਤਾਂ' : 'installment(s)'}
              </span>
            </h4>

            {repayments.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                <IndianRupee className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                <p className="text-xs font-medium">
                  {isPa ? 'ਕੋਈ ਅੰਸ਼ਕ ਵਾਪਸੀ ਦਰਜ ਨਹੀਂ ਹੋਈ' : 'No partial repayments recorded yet.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isPa ? 'ਉੱਪਰ ਦਿੱਤੇ ਫਾਰਮ ਰਾਹੀਂ ਕਿਸ਼ਤਾਂ ਦਰਜ ਕਰੋ ਜੀ।' : 'Use the form above to record installment payments.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 rounded-xl shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">{isPa ? 'ਮਿਤੀ' : 'Date'}</th>
                      <th className="px-3 py-2.5">{isPa ? 'ਰਕਮ (₹)' : 'Amount (₹)'}</th>
                      <th className="px-3 py-2.5">{isPa ? 'ਮੋਡ' : 'Mode'}</th>
                      <th className="px-3 py-2.5">{isPa ? 'ਪਰਚੀ / ਰੈਫਰੈਂਸ' : 'Ref / Slip'}</th>
                      <th className="px-3 py-2.5">{isPa ? 'ਟਿੱਪਣੀ' : 'Remarks'}</th>
                      <th className="px-3 py-2.5 text-right">{isPa ? 'ਐਕਸ਼ਨ' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repayments.map((rep, idx) => (
                      <tr key={rep.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-slate-700 font-semibold">{rep.date}</td>
                        <td className="px-3 py-2.5 text-emerald-700 font-bold">
                          {formatCurrency(rep.amount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {rep.paymentMode || 'CASH'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">{rep.referenceNo || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 truncate max-w-[140px]">
                          {rep.remarks || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRepayment(rep.id, rep.amount)}
                            title={isPa ? 'ਕਿਸ਼ਤ ਹਟਾਓ' : 'Delete repayment'}
                            className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isPa ? 'ਕਿਸ਼ਤ ਦਰਜ ਕਰਨ ਨਾਲ ਮੂਲ ਰਕਮ ਅਤੇ ਵਿਆਜ ਆਪਣੇ ਆਪ ਅੱਪਡੇਟ ਹੁੰਦਾ ਹੈ।' : 'Recording repayments automatically adjusts remaining principal and interest.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
          >
            {isPa ? 'ਬੰਦ ਕਰੋ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
