import React, { useState, useEffect, useMemo } from 'react';
import { DailyPurchaseRecord } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  X,
  Edit,
  Save,
  Building2,
  Calendar,
  AlertTriangle,
  Scale,
  IndianRupee,
  Layers,
  UserCheck
} from 'lucide-react';
import {
  FIXED_BAG_WEIGHT_KG,
  FIXED_RATE_PER_QTL,
  formatKgToQulKg,
  calculatePayableAmount
} from '../../utils/calculations';

interface DailyPurchaseEditModalProps {
  record: DailyPurchaseRecord | null;
  onClose: () => void;
}

export const DailyPurchaseEditModal: React.FC<DailyPurchaseEditModalProps> = ({
  record,
  onClose
}) => {
  const { agencies, settings, updateDailyPurchase, getFarmerPurchaseSummary, language } = useMandi();
  const isEn = language === 'en';
  const { notifyUpdateSuccess, notifyError } = useNotification();

  const [date, setDate] = useState<string>('');
  const [agency, setAgency] = useState<string>('');
  const [customAgency, setCustomAgency] = useState<string>('');
  const [bags, setBags] = useState<number>(0);
  const [rate, setRate] = useState<number>(FIXED_RATE_PER_QTL);
  const [boliNumber, setBoliNumber] = useState<string>('');
  const [gatePassNumber, setGatePassNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const agencyOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = agencies.map((ag) => ({
      value: ag.nameEn,
      label: isEn ? ag.nameEn : `${ag.namePa} (${ag.nameEn})`,
      subLabel: isEn ? (ag.namePa || undefined) : ag.nameEn,
      badge: ag.code,
      keywords: [ag.nameEn, ag.namePa, ag.code]
    }));
    opts.push({
      value: 'CUSTOM',
      label: isEn ? '+ Other Custom Agency...' : '+ ਹੋਰ ਕਸਟਮ ਏਜੰਸੀ (Custom)...',
      keywords: ['custom', 'other']
    });
    return opts;
  }, [agencies, isEn]);

  useEffect(() => {
    if (record) {
      setDate(record.date);
      const isKnownAgency = agencies.some((a) => a.nameEn === record.agency);
      if (isKnownAgency) {
        setAgency(record.agency);
        setCustomAgency('');
      } else {
        setAgency('CUSTOM');
        setCustomAgency(record.agency);
      }
      setBags(record.bags);
      setRate(record.rate || FIXED_RATE_PER_QTL);
      setBoliNumber(record.boliNumber || '');
      setGatePassNumber(record.gatePassNumber || '');
      setRemarks(record.remarks || '');
      setError('');
    }
  }, [record, agencies, settings]);

  if (!record) return null;

  // Capacity calculations for editing
  const farmerSummary = getFarmerPurchaseSummary(record.farmerId);
  const effectiveMaxBags = farmerSummary.remainingBags + record.bags;

  // Live computed values
  const totalWeightKg = Math.max(0, bags) * FIXED_BAG_WEIGHT_KG;
  const breakdown = formatKgToQulKg(totalWeightKg);
  const computedAmount = calculatePayableAmount(totalWeightKg, rate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const effectiveAgency = agency === 'CUSTOM' ? customAgency.trim() : agency.trim();

    if (!effectiveAgency) {
      setError('ਕਿਰਪਾ ਕਰਕੇ ਖਰੀਦ ਏਜੰਸੀ ਚੁਣੋ ਜਾਂ ਦਰਜ ਕਰੋ (Please select/enter Agency).');
      return;
    }

    if (bags <= 0) {
      setError('ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (Bags must be > 0).');
      return;
    }

    if (bags > effectiveMaxBags) {
      setError(
        `ਅੱਪਡੇਟ ਕੀਤੀ ਮਾਤਰਾ (${bags} ਬੋਰੀਆਂ) ਬਾਕੀ ਮੰਡੀ ਸਟਾਕ (${effectiveMaxBags} ਬੋਰੀਆਂ) ਤੋਂ ਵੱਧ ਹੈ (Quantity cannot exceed remaining mandi stock).`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = updateDailyPurchase(record.id, {
        date: date.trim(),
        agency: effectiveAgency,
        bags,
        qul: breakdown.qtl,
        kg: breakdown.kg,
        totalWeightKg,
        rate,
        totalAmount: computedAmount,
        netAmount: computedAmount,
        boliNumber: boliNumber.trim() || undefined,
        gatePassNumber: gatePassNumber.trim() || undefined,
        remarks: remarks.trim() || undefined
      });

      if (!result.success) {
        setError(result.messagePa || result.messageEn || 'Error updating record');
        setIsSubmitting(false);
        return;
      }

      notifyUpdateSuccess({
        titlePa: 'ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਿਆ',
        titleEn: 'Record Updated Successfully',
        messagePa: `ਵਾਊਚਰ ${record.id} ਅਪਡੇਟ ਕੀਤਾ ਗਿਆ: ${bags} ਬੋਰੀਆਂ (${breakdown.displayPa}), ਰਕਮ ₹${computedAmount.toLocaleString('en-IN')}`,
        details: `${record.id} • ${effectiveAgency} • ${record.farmerName}`
      });

      onClose();
    } catch {
      notifyError({
        titlePa: 'ਰਿਕਾਰਡ ਅਪਡੇਟ ਕਰਨ ਵਿੱਚ ਗਲਤੀ ਆਈ',
        titleEn: 'Failed to update record'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-150 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">
                ਖਰੀਦ ਰਿਕਾਰਡ ਸੋਧੋ (Edit Daily Purchase Record)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {record.id} • ਕਿਸਾਨ: {record.farmerName} ({record.farmerId})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Farmer Stock Context Ribbon */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span>ਕਿਸਾਨ ਮੰਡੀ ਸਟਾਕ ਸੰਤੁਲਨ (Stock Balance)</span>
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                ID: {record.farmerId}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">ਮੰਡੀ ਆਮਦ (Total)</span>
                <strong className="font-mono font-bold text-slate-900">
                  {farmerSummary.mandiArrivalBags} ਬੋਰੀਆਂ
                </strong>
              </div>

              <div className="bg-white p-1.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-slate-500 block">ਪਹਿਲਾਂ ਖਰੀਦਿਆ (Other)</span>
                <strong className="font-mono font-bold text-amber-800">
                  {farmerSummary.alreadyPurchasedBags - record.bags} ਬੋਰੀਆਂ
                </strong>
              </div>

              <div className="bg-emerald-100/70 p-1.5 rounded-lg border border-emerald-300">
                <span className="text-[10px] text-emerald-900 block font-semibold">ਸੋਧਣ ਲਈ ਉਪਲਬਧ</span>
                <strong className="font-mono font-black text-emerald-950">
                  {effectiveMaxBags} ਬੋਰੀਆਂ Max
                </strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Date */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ਖਰੀਦ ਮਿਤੀ (Purchase Date) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={date || ''}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. Agency Selection */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? 'Procurement Agency' : 'ਖਰੀਦ ਏਜੰਸੀ (Agency)'} <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                id="edit-purchase-agency"
                value={agency || ''}
                onChange={(val) => setAgency(val)}
                options={agencyOptions}
                placeholder={isEn ? "Select agency..." : "ਏਜੰਸੀ ਚੁਣੋ..."}
                searchPlaceholder={isEn ? "Search agency..." : "ਏਜੰਸੀ ਖੋਜੋ..."}
                emptyMessage={isEn ? "No agency found" : "ਕੋਈ ਏਜੰਸੀ ਨਹੀਂ ਮਿਲੀ"}
              />
            </div>
          </div>

          {agency === 'CUSTOM' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {isEn ? 'Custom Agency Name' : 'ਕਸਟਮ ਏਜੰਸੀ ਦਾ ਨਾਂ (Custom Agency Name)'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customAgency || ''}
                onChange={(e) => setCustomAgency(e.target.value)}
                placeholder={isEn ? "e.g. Punjab State Grains..." : "ਜਿਵੇਂ Punjab State Grains..."}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* 3. Bags & Rate Inputs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>ਖਰੀਦ ਬੋਰੀਆਂ ਤੇ ਵਜ਼ਨ (Bags & Weight)</span>
              </label>
              <button
                type="button"
                onClick={() => setBags(effectiveMaxBags)}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline"
              >
                ਸਾਰੀਆਂ ਬਾਕੀ {effectiveMaxBags} ਬੋਰੀਆਂ ਚੁਣੋ
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={effectiveMaxBags}
                  value={bags || ''}
                  onChange={(e) => setBags(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-emerald-400 rounded-lg px-3 py-2 text-xs font-mono font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ਕੁੱਲ ਵਜ਼ਨ (Auto 37.50 KG)
                </label>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-900 truncate">
                  {breakdown.qtl} Q {breakdown.kg} Kg
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ਸਰਕਾਰੀ ਭਾਅ (₹/Qtl) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rate ?? ''}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Total Amount Preview */}
            <div className="bg-emerald-600 text-white rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-100">
                ਕੁੱਲ ਗ੍ਰਾਸ ਰਕਮ (Gross Amount):
              </span>
              <strong className="text-sm font-mono font-black flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5" />
                {computedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* 4. Optional Lot & Gate Pass */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ਬੋਲੀ / ਲਾਟ ਨੰਬਰ (Lot No)
              </label>
              <input
                type="text"
                value={boliNumber || ''}
                onChange={(e) => setBoliNumber(e.target.value)}
                placeholder="ਜਿਵੇਂ LOT-104..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ਗੇਟ ਪਾਸ / ਚਲਾਨ ਨੰਬਰ (Gate Pass)
              </label>
              <input
                type="text"
                value={gatePassNumber || ''}
                onChange={(e) => setGatePassNumber(e.target.value)}
                placeholder="ਜਿਵੇਂ GP-8821..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 5. Remarks */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              ਟਿੱਪਣੀਆਂ (Remarks & Notes)
            </label>
            <input
              type="text"
              value={remarks || ''}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="ਜਿਵੇਂ ਕੁਆਲਿਟੀ ਪਾਸ, ਗ੍ਰੇਡ-ਏ..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="bg-slate-50 border-t border-slate-200 -mx-5 -mb-5 px-5 py-3.5 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
            >
              ਰੱਦ ਕਰੋ (Cancel)
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'ਅੱਪਡੇਟ ਹੋ ਰਿਹਾ ਹੈ...' : 'ਰਿਕਾਰਡ ਅਪਡੇਟ ਕਰੋ (Update Record)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
