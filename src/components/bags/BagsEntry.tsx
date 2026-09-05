import React, { useState, useEffect } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  PackageCheck,
  Calendar,
  User,
  Scale,
  DollarSign,
  Printer,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building,
  Phone,
  CreditCard,
  Scissors
} from 'lucide-react';
import {
  FIXED_BAG_WEIGHT_KG,
  FIXED_RATE_PER_QTL,
  calculateBagsWeight,
  calculateGrandTotal,
  calculatePayableAmount,
  autoFormatDate,
  formatCurrency,
  createDefaultLabourDeductions,
  computeLabourAndDeductions
} from '../../utils/calculations';
import { BardanaType, LabourAndDeductions } from '../../types/mandi';
import { LabourDeductionsSection } from '../common/LabourDeductionsSection';

export const BagsEntry: React.FC = () => {
  const {
    farmers,
    addBagsEntry,
    selectedFarmerForBags,
    setSelectedFarmerForBags,
    setActiveReceipt,
    setActiveSection,
    getBardanaSummary,
    settings
  } = useMandi();
  const { notifySaveSuccess, notifyError } = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  const bardanaSummary = getBardanaSummary();

  // Current Date in DD/MM/YYYY format
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Form State
  const [dateInput, setDateInput] = useState<string>(getTodayFormatted());
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
    selectedFarmerForBags?.id || farmers[0]?.id || ''
  );
  const [newBagsInput, setNewBagsInput] = useState<string>('');
  const [oldBagsInput, setOldBagsInput] = useState<string>('');
  const [totaInput, setTotaInput] = useState<string>('');
  const [labourDeductions, setLabourDeductions] = useState<LabourAndDeductions>(() =>
    createDefaultLabourDeductions(settings)
  );

  // Notification / Saved Receipt State
  const [savedReceiptRecord, setSavedReceiptRecord] = useState<any | null>(null);

  // Sync selectedFarmerId if set globally from other screens
  useEffect(() => {
    if (selectedFarmerForBags) {
      setSelectedFarmerId(selectedFarmerForBags.id);
    }
  }, [selectedFarmerForBags]);

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  // Date Auto-Formatting as typed: e.g. "28082026" -> "28/08/2026"
  const handleDateChange = (val: string) => {
    const formatted = autoFormatDate(val);
    setDateInput(formatted);
  };

  // Calculations
  const newBagsCount = Math.max(0, parseInt(newBagsInput, 10) || 0);
  const oldBagsCount = Math.max(0, parseInt(oldBagsInput, 10) || 0);
  const bagsCount = newBagsCount + oldBagsCount;
  const bardanaType: BardanaType =
    newBagsCount > 0 && oldBagsCount > 0
      ? 'BOTH'
      : newBagsCount > 0
      ? 'NEW'
      : oldBagsCount > 0
      ? 'OLD'
      : 'NEW';

  const totaKg = Math.max(0, parseFloat(totaInput) || 0);

  // 1. Total Bags Weight (bags * 37.50 KG) -> displayed in Qul + Kg
  const bagsWeightBreakdown = calculateBagsWeight(bagsCount);

  // 2. Grand Total = Bags Weight + Tota -> displayed in Qul + Kg
  const grandTotalBreakdown = calculateGrandTotal(bagsWeightBreakdown.totalKg, totaKg);

  // 3. Gross Amount at ₹2,461 / Qul
  const calculatedGrossAmount = calculatePayableAmount(grandTotalBreakdown.totalKg, FIXED_RATE_PER_QTL);

  // Keep labour deductions synchronized with weight & gross amount changes
  useEffect(() => {
    setLabourDeductions((prev) =>
      computeLabourAndDeductions(grandTotalBreakdown.totalKg, calculatedGrossAmount, prev, settings)
    );
  }, [grandTotalBreakdown.totalKg, calculatedGrossAmount, settings]);

  const hasActiveDeductions =
    labourDeductions.pakkiLabourEnabled ||
    labourDeductions.pakkaDoubleLabourEnabled ||
    labourDeductions.sukhiLabourEnabled ||
    (labourDeductions.customDeductions && labourDeductions.customDeductions.length > 0);

  const netPayableAmount = hasActiveDeductions
    ? labourDeductions.netPayableAmount
    : calculatedGrossAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFarmer) {
      notifyError({
        titlePa: 'ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ',
        titleEn: 'Farmer Selection Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਰਜਿਸਟਰਡ ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ।'
      });
      return;
    }
    if (bagsCount <= 0) {
      notifyError({
        titlePa: 'ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ ਦਰਜ ਕਰੋ',
        titleEn: 'Valid Bags Count Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਨਵੇਂ ਜਾਂ ਪੁਰਾਣੇ ਬਾਰਦਾਨੇ ਵਿੱਚ ਘੱਟੋ-ਘੱਟ 1 ਬੋਰੀ ਦੀ ਗਿਣਤੀ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    setIsSaving(true);

    const activeLabour = hasActiveDeductions ? labourDeductions : undefined;

    const newRecord = addBagsEntry({
      date: dateInput || getTodayFormatted(),
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.farmerName,
      farmerNamePa: selectedFarmer.farmerNamePa,
      farmerFatherName: selectedFarmer.fatherName,
      farmerVillage: selectedFarmer.village,
      farmerVillagePa: selectedFarmer.villagePa,
      farmerMobile: selectedFarmer.mobile,
      farmerAadhaar: selectedFarmer.aadhaar,
      farmerPhotoUrl: selectedFarmer.photoUrl,
      newBags: newBagsCount,
      oldBags: oldBagsCount,
      bags: bagsCount,
      weightPerBagKg: FIXED_BAG_WEIGHT_KG, // 37.50
      totalBagsWeightKg: bagsWeightBreakdown.totalKg,
      totalBagsWeightDisplay: bagsWeightBreakdown.displayEn, // e.g. "37 Qul 50 Kg"
      totaKg: totaKg, // e.g. 20 Kg
      grandTotalKg: grandTotalBreakdown.totalKg,
      grandTotalDisplay: grandTotalBreakdown.displayEn, // e.g. "37 Qul 70 Kg"
      bardana: bardanaType,
      ratePerQtl: FIXED_RATE_PER_QTL, // 2461
      totalAmount: calculatedGrossAmount,
      labourDeductions: activeLabour,
      netAmount: netPayableAmount
    });

    const deductionMsg = hasActiveDeductions
      ? ` • ਕਟੌਤੀ: -${formatCurrency(labourDeductions.grandTotalDeductions)} • ਸ਼ੁੱਧ ਰਕਮ: ${formatCurrency(netPayableAmount)}`
      : '';

    const bardanaText =
      newBagsCount > 0 && oldBagsCount > 0
        ? `(${newBagsCount} ਨਵਾਂ + ${oldBagsCount} ਪੁਰਾਣਾ)`
        : newBagsCount > 0
        ? `(${newBagsCount} ਨਵਾਂ ਬਾਰਦਾਨਾ)`
        : `(${oldBagsCount} ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ)`;

    notifySaveSuccess({
      titlePa: 'ਬੋਰੀਆਂ ਦੀ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ!',
      titleEn: 'Bags Entry Saved Successfully',
      messagePa: `${selectedFarmer.farmerNamePa || selectedFarmer.farmerName} (${selectedFarmer.villagePa || selectedFarmer.village}) ਲਈ ${bagsCount} ਬੋਰੀਆਂ ${bardanaText} ਦਰਜ ਹੋ ਗਈਆਂ।`,
      details: `ਰਸੀਦ ਨੰ: ${newRecord.id} • ਰਕਮ: ${formatCurrency(calculatedGrossAmount)}${deductionMsg}`
    });

    setSavedReceiptRecord(newRecord);
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-lg">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              ਕਿਸਾਨ ਬੋਰੀਆਂ ਐਂਟਰੀ (Farmer Bags Entry)
            </h2>
            <p className="text-[11px] text-slate-500">
              ਫਿਕਸਡ 37.50 KG ਬੋਰੀ ਵਜ਼ਨ • ਵੱਖਰਾ ਟੋਟਾ • ਕੁਇੰਟਲ+ਕਿਲੋ ਫਾਰਮੈਟ • ਸਰਕਾਰੀ ਭਾਅ ₹2,461/ਕੁਇੰਟਲ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('same-date-multi-entry')}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs transition"
          >
            ਇੱਕੋ ਮਿਤੀ ਮਲਟੀ ਕਿਸਾਨ ਐਂਟਰੀ →
          </button>
        </div>
      </div>

      {/* Success Notification & Print Button */}
      {savedReceiptRecord && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-black text-emerald-900 text-sm">
                  ਬੋਰੀਆਂ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋ ਗਈ ਹੈ! (Bags Entry Saved)
                </h3>
                <p className="text-xs text-emerald-800">
                  ਰਸੀਦ ਨੰ: <strong className="font-mono">{savedReceiptRecord.entryNumber}</strong> • ਕਿਸਾਨ:{' '}
                  <strong>{savedReceiptRecord.farmerNamePa} ({savedReceiptRecord.farmerId})</strong> • ਕੁੱਲ ਵਜ਼ਨ:{' '}
                  <strong className="font-mono">{savedReceiptRecord.grandTotalDisplay}</strong> • ਰਕਮ:{' '}
                  <strong className="font-mono">{formatCurrency(savedReceiptRecord.totalAmount)}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSavedReceiptRecord(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕ ਬੰਦ ਕਰੋ
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-emerald-200">
            <button
              onClick={() => setActiveReceipt(savedReceiptRecord)}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ਰਸੀਦ ਪ੍ਰਿੰਟ ਕਰੋ (Print Weighment Slip)</span>
            </button>
            <button
              onClick={() => {
                setSavedReceiptRecord(null);
                setNewBagsInput('');
                setOldBagsInput('');
                setTotaInput('');
              }}
              className="bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              + ਅਗਲੀ ਐਂਟਰੀ ਕਰੋ (Next Entry)
            </button>
          </div>
        </div>
      )}

      {farmers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ (No Farmers Registered)
            </h3>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
              ਬੋਰੀਆਂ ਦਰਜ ਕਰਨ ਲਈ ਪਹਿਲਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰਨਾ ਲਾਜ਼ਮੀ ਹੈ ਤਾਂ ਜੋ ਉਸਦਾ ਨਾਂ, ਆਈ.ਡੀ ਅਤੇ ਫੋਟੋ ਆਟੋਮੈਟਿਕ ਦਿਖਾਈ ਦੇਵੇ।
            </p>
          </div>
          <button
            onClick={() => setActiveSection('farmer-registration')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-2xs"
          >
            + ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ (Register Farmer)
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2 Columns: Input Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm border-b border-slate-100 pb-2">
                1. ਮਿਤੀ ਤੇ ਕਿਸਾਨ ਦੀ ਚੋਣ (Date & Farmer Selection)
              </h3>

              {/* Date Input with Auto-Formatting */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>ਮਿਤੀ (Date - DD/MM/YYYY)</span>
                    <span className="text-[10px] text-emerald-700 font-mono">Auto /</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="28/08/2026"
                      value={dateInput}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">ਉਦਾਹਰਨ: 28082026 ਲਿਖਣ 'ਤੇ 28/08/2026 ਬਣੇਗਾ</span>
                </div>

                {/* Farmer Selection Dropdown */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਕਿਸਾਨ ਚੁਣੋ (Select Registered Farmer by ID or Name) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedFarmerId}
                    onChange={(e) => {
                      setSelectedFarmerId(e.target.value);
                      const f = farmers.find((farm) => farm.id === e.target.value);
                      if (f) setSelectedFarmerForBags(f);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    required
                  >
                    {farmers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.id} - {f.farmerNamePa} ({f.farmerName}) • ਪਿੰਡ: {f.villagePa || f.village}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Farmer Profile Live Display (Visual Confirmation with Photo) */}
              {selectedFarmer && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 w-full">
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਕਿਸਾਨ ਆਈ.ਡੀ:</span>
                      <strong className="font-mono font-black text-emerald-800">{selectedFarmer.id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਕਿਸਾਨ ਦਾ ਨਾਂ:</span>
                      <strong className="text-slate-900">
                        {selectedFarmer.farmerNamePa} ({selectedFarmer.farmerName})
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਪਿਤਾ ਦਾ ਨਾਂ:</span>
                      <strong className="text-slate-800">
                        {selectedFarmer.fatherNamePa || selectedFarmer.fatherName || '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਪਿੰਡ (Village):</span>
                      <strong className="text-slate-900">
                        {selectedFarmer.villagePa || selectedFarmer.village} ({selectedFarmer.pinCode})
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਮੋਬਾਈਲ (Mobile):</span>
                      <strong className="font-mono text-slate-900">{selectedFarmer.mobile}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਆਧਾਰ (Aadhaar):</span>
                      <strong className="font-mono text-slate-900">{selectedFarmer.aadhaar}</strong>
                    </div>
                  </div>

                  {/* Photo Visual Confirmation */}
                  <div className="w-16 h-16 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedFarmer.photoUrl ? (
                      <img
                        src={selectedFarmer.photoUrl}
                        alt={selectedFarmer.farmerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Weighment & Split Bardana Entry Block */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                  2. ਬਾਰਦਾਨਾ ਤੇ ਵਜ਼ਨ ਵੇਰਵੇ (Bardana & Weighment Entry)
                </h3>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium">ਉਪਲਬਧ ਸਟਾਕ:</span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    ਨਵਾਂ: {bardanaSummary.newBagsRemaining.toLocaleString('en-IN')}
                  </span>
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                    ਪੁਰਾਣਾ: {bardanaSummary.oldBagsRemaining.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. New Bardana Bags Input */}
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center justify-between">
                    <span>1. ਨਵਾਂ ਬਾਰਦਾਨਾ (New Bags)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">
                      ਨਵਾਂ
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 500"
                    value={newBagsInput}
                    onChange={(e) => setNewBagsInput(e.target.value)}
                    className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-xs font-mono font-black text-emerald-950 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="mt-1 text-[10px] text-emerald-700 font-medium">
                    ਨਵੇਂ ਬਾਰਦਾਨੇ ਵਿੱਚ ਭਰੀਆਂ ਬੋਰੀਆਂ
                  </div>
                </div>

                {/* 2. Old Bardana Bags Input */}
                <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center justify-between">
                    <span>2. ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Bags)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded">
                      ਪੁਰਾਣਾ
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 500"
                    value={oldBagsInput}
                    onChange={(e) => setOldBagsInput(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono font-black text-amber-950 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="mt-1 text-[10px] text-amber-700 font-medium">
                    ਪੁਰਾਣੇ ਬਾਰਦਾਨੇ ਵਿੱਚ ਭਰੀਆਂ ਬੋਰੀਆਂ
                  </div>
                </div>

                {/* 3. Separate Tota Input */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>3. ਵੱਖਰਾ ਟੋਟਾ (Tota in Kg)</span>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1 rounded">Kg</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 20"
                    value={totaInput}
                    onChange={(e) => setTotaInput(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-amber-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    ਟੋਟਾ ਬੋਰੀ ਵਜ਼ਨ ਤੋਂ ਵੱਖਰਾ ਜੋੜਿਆ ਜਾਂਦਾ ਹੈ
                  </div>
                </div>
              </div>

              {/* Auto-Calculated Total Bags Summary Bar */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-bold">ਕੁੱਲ ਬੋਰੀਆਂ (Total Bags):</span>
                  <span className="font-mono font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                    {bagsCount} ਬੋਰੀਆਂ
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (ਨਵਾਂ: {newBagsCount} + ਪੁਰਾਣਾ: {oldBagsCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                  <span>ਨਿਰਧਾਰਿਤ ਵਜ਼ਨ:</span>
                  <strong className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">37.50 KG / Bag</strong>
                </div>
              </div>
            </div>

            {/* Section 3: Labour & Other Deductions */}
            <div className="space-y-2">
              <LabourDeductionsSection
                weightKg={grandTotalBreakdown.totalKg}
                grossAmount={calculatedGrossAmount}
                value={labourDeductions}
                onChange={setLabourDeductions}
                settings={settings}
              />
            </div>
          </div>

          {/* Right 1 Column: Real-time Live Calculation Box */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-2xs border border-slate-800 space-y-3.5">
              <h3 className="font-black text-xs uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>ਲਾਈਵ ਹਿਸਾਬ (Live Calculation)</span>
                <span className="text-[10px] text-slate-400 font-mono">₹2,461 / Qul</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                {/* 0. Bardana Breakdown */}
                <div className="bg-slate-800/90 rounded-lg p-2.5 border border-slate-700">
                  <div className="text-[11px] text-slate-400 font-semibold mb-1">ਬਾਰਦਾਨਾ ਵੇਰਵਾ (Bardana Split):</div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                    <div className="bg-emerald-950/80 border border-emerald-700/60 rounded p-1 text-emerald-300">
                      <span className="text-[10px] block text-emerald-400/80">ਨਵਾਂ ਬਾਰਦਾਨਾ</span>
                      <strong>{newBagsCount} Bags</strong>
                    </div>
                    <div className="bg-amber-950/80 border border-amber-700/60 rounded p-1 text-amber-300">
                      <span className="text-[10px] block text-amber-400/80">ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ</span>
                      <strong>{oldBagsCount} Bags</strong>
                    </div>
                  </div>
                </div>

                {/* 1. Bags Weight breakdown */}
                <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>ਕੁੱਲ ਬੋਰੀਆਂ ਦਾ ਵਜ਼ਨ:</span>
                    <span className="font-mono text-slate-300">{bagsCount} × 37.50 KG</span>
                  </div>
                  <div className="text-base font-mono font-black text-white mt-0.5">
                    {bagsWeightBreakdown.displayEn}
                  </div>
                  <div className="text-[10px] text-slate-400">{bagsWeightBreakdown.displayPa}</div>
                </div>

                {/* 2. Separate Tota */}
                <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">ਵੱਖਰਾ ਟੋਟਾ (Separate Tota):</div>
                    <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                      {totaKg} Kg
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/40 px-1.5 py-0.5 rounded">
                    Tota
                  </span>
                </div>

                {/* 3. Grand Total (Qul + Kg) */}
                <div className="bg-emerald-950/70 border border-emerald-600/50 rounded-lg p-2.5">
                  <div className="text-[11px] text-emerald-300 flex justify-between">
                    <span>ਗ੍ਰੈਂਡ ਟੋਟਲ ਵਜ਼ਨ (Grand Total):</span>
                    <span className="font-mono text-[10px] text-emerald-400">Bags + Tota</span>
                  </div>
                  <div className="text-lg font-mono font-black text-emerald-300 mt-0.5">
                    {grandTotalBreakdown.displayEn}
                  </div>
                  <div className="text-[10px] text-emerald-400">{grandTotalBreakdown.displayPa}</div>
                </div>

                {/* 4. Mandi Rate & Total Payable Amount */}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold">ਸਰਕਾਰੀ ਭਾਅ:</span>
                  <span className="font-mono font-bold text-white text-xs">₹2,461 / Qul</span>
                </div>

                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-[11px] text-slate-400">ਕੁੱਲ ਗ੍ਰਾਸ ਰਕਮ (Gross Value):</div>
                  <div className="text-lg font-mono font-black text-white mt-0.5">
                    {formatCurrency(calculatedGrossAmount)}
                  </div>
                </div>

                {/* Labour Deduction Summary (if active) */}
                {hasActiveDeductions && (
                  <div className="bg-rose-950/60 border border-rose-800/60 rounded-lg p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-rose-300 text-[11px]">
                      <span className="flex items-center gap-1 font-bold">
                        <Scissors className="w-3 h-3" />
                        ਮਜ਼ਦੂਰੀ / ਕਟੌਤੀਆਂ:
                      </span>
                      <span className="font-mono font-bold">
                        -{formatCurrency(labourDeductions.grandTotalDeductions)}
                      </span>
                    </div>

                    <div className="text-[10px] text-rose-200/80 pl-4 space-y-0.5">
                      {labourDeductions.pakkiLabourEnabled && (
                        <div className="flex justify-between">
                          <span>ਪੱਕੀ ਮਜ਼ਦੂਰੀ (@ ₹{labourDeductions.pakkiLabourRate}):</span>
                          <span className="font-mono">₹{labourDeductions.pakkiLabourAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {labourDeductions.pakkaDoubleLabourEnabled && (
                        <div className="flex justify-between">
                          <span>ਪੱਕੀ ਡਬਲ ਮਜ਼ਦੂਰੀ (@ ₹{labourDeductions.pakkaDoubleLabourRate}):</span>
                          <span className="font-mono">₹{labourDeductions.pakkaDoubleLabourAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {labourDeductions.sukhiLabourEnabled && (
                        <div className="flex justify-between">
                          <span>ਸੁੱਕੀ ਮਜ਼ਦੂਰੀ (@ ₹{labourDeductions.sukhiLabourRate}):</span>
                          <span className="font-mono">₹{labourDeductions.sukhiLabourAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Net Payable to Farmer */}
                <div className="bg-emerald-900/60 border border-emerald-500/60 rounded-lg p-3">
                  <div className="text-[11px] text-emerald-300 font-bold uppercase tracking-wide">
                    ਕਿਸਾਨ ਨੂੰ ਸ਼ੁੱਧ ਅਦਾਇਗੀ (Net Payable):
                  </div>
                  <div className="text-xl font-mono font-black text-emerald-300 mt-1">
                    {formatCurrency(netPayableAmount)}
                  </div>
                </div>
              </div>

              {/* Submit / Save Entry Button */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-2.5 px-4 rounded-lg text-xs shadow-2xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <PackageCheck className="w-4 h-4 animate-spin" />
                    <span>ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ... (Saving Bags Entry...)</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>ਐਂਟਰੀ ਸੇਵ ਕਰੋ (Save Bags Entry)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
