import React, { useState, useEffect, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { DateInput } from '../common/DateInput';
import {
  X,
  Save,
  PackageCheck,
  Calendar,
  User,
  Scale,
  DollarSign,
  AlertCircle,
  Hash,
  FileText,
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
  calculateAutomaticLabour
} from '../../utils/calculations';
import { BagsEntryRecord, BardanaType, LabourAndDeductions } from '../../types/mandi';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';

export const BagsEntryEditModal: React.FC = () => {
  const {
    farmers,
    activeBagsEntryToEdit,
    setActiveBagsEntryToEdit,
    updateBagsEntry,
    getBardanaSummary,
    settings,
    language
  } = useMandi();

  const isEn = language === 'en';
  const { notifyUpdateSuccess, notifyError } = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  const bardanaSummary = getBardanaSummary();

  const [dateInput, setDateInput] = useState<string>('');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
  const [newBagsInput, setNewBagsInput] = useState<string>('');
  const [oldBagsInput, setOldBagsInput] = useState<string>('');
  const [doubleBagsInput, setDoubleBagsInput] = useState<string>('');
  const [sukkiBagsInput, setSukkiBagsInput] = useState<string>('');
  const [totaInput, setTotaInput] = useState<string>('');
  const [pakkiRateInput, setPakkiRateInput] = useState<string>('');
  const [doubleRateInput, setDoubleRateInput] = useState<string>('');
  const [sukkiRateInput, setSukkiRateInput] = useState<string>('');

  // Pre-fill all saved values when activeBagsEntryToEdit opens/changes
  useEffect(() => {
    if (activeBagsEntryToEdit) {
      setDateInput(activeBagsEntryToEdit.date || '');
      setSelectedFarmerId(activeBagsEntryToEdit.farmerId || '');

      const newBagsVal =
        activeBagsEntryToEdit.newBags !== undefined
          ? activeBagsEntryToEdit.newBags
          : activeBagsEntryToEdit.bardana === 'NEW'
          ? activeBagsEntryToEdit.bags
          : 0;

      const oldBagsVal =
        activeBagsEntryToEdit.oldBags !== undefined
          ? activeBagsEntryToEdit.oldBags
          : activeBagsEntryToEdit.bardana === 'OLD'
          ? activeBagsEntryToEdit.bags
          : 0;

      const doubleVal =
        activeBagsEntryToEdit.conditionBreakdown?.doubleBags ??
        activeBagsEntryToEdit.labourDeductions?.doubleBagsCount ??
        0;

      const sukkiVal =
        activeBagsEntryToEdit.conditionBreakdown?.sukkiBags ??
        activeBagsEntryToEdit.labourDeductions?.sukkiBagsCount ??
        0;

      const pakkiRateVal =
        activeBagsEntryToEdit.conditionBreakdown?.pakkiRate ??
        activeBagsEntryToEdit.labourDeductions?.pakkiLabourRate ??
        settings?.defaultPakkiLabourRate ??
        7;

      const doubleRateVal =
        activeBagsEntryToEdit.conditionBreakdown?.doubleRate ??
        activeBagsEntryToEdit.labourDeductions?.pakkaDoubleLabourRate ??
        settings?.defaultPakkaDoubleLabourRate ??
        14;

      const sukkiRateVal =
        activeBagsEntryToEdit.conditionBreakdown?.sukkiRate ??
        activeBagsEntryToEdit.labourDeductions?.sukhiLabourRate ??
        settings?.defaultSukhiLabourRate ??
        5;

      setNewBagsInput(newBagsVal > 0 ? String(newBagsVal) : '');
      setOldBagsInput(oldBagsVal > 0 ? String(oldBagsVal) : '');
      setDoubleBagsInput(doubleVal > 0 ? String(doubleVal) : '');
      setSukkiBagsInput(sukkiVal > 0 ? String(sukkiVal) : '');
      setPakkiRateInput(String(pakkiRateVal));
      setDoubleRateInput(String(doubleRateVal));
      setSukkiRateInput(String(sukkiRateVal));
      setTotaInput(
        activeBagsEntryToEdit.totaKg !== undefined && activeBagsEntryToEdit.totaKg > 0
          ? String(activeBagsEntryToEdit.totaKg)
          : ''
      );
    }
  }, [activeBagsEntryToEdit, settings]);

  const selectedFarmer = useMemo(() => {
    return farmers.find((f) => f.id === selectedFarmerId);
  }, [farmers, selectedFarmerId]);

  const farmerOptions: SearchableSelectOption[] = useMemo(() => {
    return farmers.map((f) => ({
      value: f.id,
      label: isEn
        ? `${f.id} - ${f.farmerName}`
        : `${f.id} - ${f.farmerNamePa} (${f.farmerName})`,
      subLabel: isEn
        ? `Village: ${f.village} • Mob: ${f.mobile}`
        : `ਪਿੰਡ: ${f.villagePa || f.village} • ਮੋਬਾਈਲ: ${f.mobile}`,
      badge: f.linkedMainFarmerId ? (isEn ? 'Linked' : 'ਲਿੰਕਡ') : undefined,
      keywords: `${f.farmerName} ${f.farmerNamePa} ${f.fatherName || ''} ${f.fatherNamePa || ''} ${f.village} ${f.villagePa || ''} ${f.mobile} ${f.aadhaar || ''} ${f.id}`
    }));
  }, [farmers, isEn]);

  // Calculations mirroring existing bags entry calculations
  const newBagsCount = Math.max(0, parseInt(newBagsInput, 10) || 0);
  const oldBagsCount = Math.max(0, parseInt(oldBagsInput, 10) || 0);
  const bagsCount = newBagsCount + oldBagsCount;
  const doubleBagsCount = Math.max(0, parseInt(doubleBagsInput, 10) || 0);
  const sukkiBagsCount = Math.max(0, parseInt(sukkiBagsInput, 10) || 0);

  const bardanaType: BardanaType =
    newBagsCount > 0 && oldBagsCount > 0
      ? 'BOTH'
      : newBagsCount > 0
      ? 'NEW'
      : oldBagsCount > 0
      ? 'OLD'
      : 'NEW';

  const totaKg = Math.max(0, parseFloat(totaInput) || 0);
  const bagsWeightBreakdown = calculateBagsWeight(bagsCount);
  const grandTotalBreakdown = calculateGrandTotal(bagsWeightBreakdown.totalKg, totaKg);
  const calculatedGrossAmount = calculatePayableAmount(grandTotalBreakdown.totalKg, FIXED_RATE_PER_QTL);

  // Custom user-editable labour rates (Pakki, Double, Sukki)
  const customRates = useMemo(() => {
    const pRate = parseFloat(pakkiRateInput);
    const dRate = parseFloat(doubleRateInput);
    const sRate = parseFloat(sukkiRateInput);
    return {
      pakkiRate: !isNaN(pRate) && pRate >= 0 ? pRate : (settings?.defaultPakkiLabourRate ?? 7),
      doubleRate: !isNaN(dRate) && dRate >= 0 ? dRate : (settings?.defaultPakkaDoubleLabourRate ?? 14),
      sukkiRate: !isNaN(sRate) && sRate >= 0 ? sRate : (settings?.defaultSukhiLabourRate ?? 5)
    };
  }, [pakkiRateInput, doubleRateInput, sukkiRateInput, settings]);

  // Automatic labour deduction calculation from entered bags & editable rates
  const labourSummary = useMemo(() => {
    return calculateAutomaticLabour(
      newBagsCount,
      oldBagsCount,
      doubleBagsCount,
      sukkiBagsCount,
      calculatedGrossAmount,
      settings,
      customRates
    );
  }, [newBagsCount, oldBagsCount, doubleBagsCount, sukkiBagsCount, calculatedGrossAmount, settings, customRates]);

  const totalLabourDeduction = labourSummary.totalLabour;
  const netPayableAmount = labourSummary.netAmount;
  const labourDeductions = labourSummary.labourDeductions;
  const conditionBreakdown = labourSummary.conditionBreakdown;
  const hasActiveDeductions = totalLabourDeduction > 0;

  if (!activeBagsEntryToEdit) return null;

  const handleClose = () => {
    setActiveBagsEntryToEdit(null);
  };

  const handleSave = (e: React.FormEvent) => {
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

    try {
      const updatedData: Partial<BagsEntryRecord> = {
        date: dateInput.trim() || activeBagsEntryToEdit.date,
        farmerId: selectedFarmer.id,
        farmerName: selectedFarmer.farmerName,
        farmerNamePa: selectedFarmer.farmerNamePa,
        farmerFatherName: selectedFarmer.fatherName,
        farmerFatherNamePa: selectedFarmer.fatherNamePa,
        farmerVillage: selectedFarmer.village,
        farmerVillagePa: selectedFarmer.villagePa,
        farmerMobile: selectedFarmer.mobile,
        farmerAadhaar: selectedFarmer.aadhaar,
        farmerPhotoUrl: selectedFarmer.photoUrl,
        newBags: newBagsCount,
        oldBags: oldBagsCount,
        bags: bagsCount,
        weightPerBagKg: FIXED_BAG_WEIGHT_KG,
        totalBagsWeightKg: bagsWeightBreakdown.totalKg,
        totalBagsWeightDisplay: bagsWeightBreakdown.displayEn,
        totaKg: totaKg,
        grandTotalKg: grandTotalBreakdown.totalKg,
        grandTotalDisplay: grandTotalBreakdown.displayEn,
        bardana: bardanaType,
        ratePerQtl: FIXED_RATE_PER_QTL,
        totalAmount: calculatedGrossAmount,
        labourDeductions: hasActiveDeductions ? labourDeductions : undefined,
        conditionBreakdown: hasActiveDeductions ? conditionBreakdown : undefined,
        netAmount: netPayableAmount,
        // Crucial: Keep Parchi Number and Entry Number strictly unchanged!
        parchiNo: activeBagsEntryToEdit.parchiNo,
        entryNumber: activeBagsEntryToEdit.entryNumber
      };

      const success = updateBagsEntry(activeBagsEntryToEdit.id, updatedData);

      if (success) {
        notifyUpdateSuccess({
          titlePa: 'ਬੋਰੀਆਂ ਦੀ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਈ!',
          titleEn: 'Bags Entry Updated Successfully',
          messagePa: `ਪਰਚੀ ਨੰ: #${activeBagsEntryToEdit.parchiNo || activeBagsEntryToEdit.entryNumber} (${selectedFarmer.farmerNamePa || selectedFarmer.farmerName}) ਦੀ ਐਂਟਰੀ ਅਪਡੇਟ ਹੋ ਗਈ ਹੈ।`,
          details: `ਪਰਚੀ ਨੰ: #${activeBagsEntryToEdit.parchiNo || activeBagsEntryToEdit.entryNumber} • ਕੁੱਲ ਬੋਰੀਆਂ: ${bagsCount} • ਵਜ਼ਨ: ${grandTotalBreakdown.displayEn} • ਗ੍ਰਾਸ ਰਕਮ: ${formatCurrency(calculatedGrossAmount)} • ਸ਼ੁੱਧ ਰਕਮ: ${formatCurrency(netPayableAmount)}`
        });
        handleClose();
      } else {
        notifyError({
          titlePa: 'ਅਪਡੇਟ ਅਸਫਲ',
          titleEn: 'Update Failed',
          messagePa: 'ਐਂਟਰੀ ਅਪਡੇਟ ਕਰਨ ਵਿੱਚ ਤਰੁੱਟੀ ਆਈ।'
        });
      }
    } catch (err) {
      console.error(err);
      notifyError({
        titlePa: 'ਅਪਡੇਟ ਅਸਫਲ',
        titleEn: 'Update Failed',
        messagePa: 'ਐਂਟਰੀ ਅਪਡੇਟ ਕਰਨ ਵਿੱਚ ਤਰੁੱਟੀ ਆਈ।'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-300 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-4 my-6">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {isEn ? 'Edit Farmer Bags Entry' : 'ਕਿਸਾਨ ਬੋਰੀਆਂ ਐਂਟਰੀ ਸੋਧੋ (Edit Bags Entry)'}
                </h2>
                {/* Parchi Number strictly preserved */}
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-mono font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                  <Hash className="w-3 h-3 text-amber-700" />
                  <span>
                    {isEn
                      ? `Slip #${activeBagsEntryToEdit.parchiNo || activeBagsEntryToEdit.entryNumber}`
                      : `ਪਰਚੀ ਨੰ: #${activeBagsEntryToEdit.parchiNo || activeBagsEntryToEdit.entryNumber}`}
                  </span>
                </span>
                {/* Entry Number badge */}
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span>{activeBagsEntryToEdit.entryNumber}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isEn
                  ? 'Update weighment details, bags count, and deductions. Slip number is preserved.'
                  : 'ਬੋਰੀਆਂ, ਵਜ਼ਨ, ਟੋਟਾ ਅਤੇ ਕਟੌਤੀਆਂ ਸੋਧੋ। ਪਰਚੀ ਨੰਬਰ ਬਰਕਰਾਰ ਰਹੇਗਾ।'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="ਬੰਦ ਕਰੋ (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 pt-0 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 columns: Inputs */}
            <div className="lg:col-span-2 space-y-4">
              {/* Date & Farmer Selection */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <DateInput
                      value={dateInput}
                      onChange={setDateInput}
                      label={isEn ? 'Date' : 'ਮਿਤੀ (Date)'}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'Select Farmer' : 'ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ (Select Farmer)'}
                    </label>
                    <SearchableSelect
                      options={farmerOptions}
                      value={selectedFarmerId}
                      onChange={(val) => setSelectedFarmerId(val)}
                      placeholder={isEn ? 'Search farmer...' : 'ਕਿਸਾਨ ਖੋਜੋ...'}
                    />
                  </div>
                </div>

                {/* Farmer Profile Preview */}
                {selectedFarmer && (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 w-full">
                      <div>
                        <span className="text-slate-500 text-[10px] block">{isEn ? 'Farmer ID:' : 'ਕਿਸਾਨ ਆਈ.ਡੀ:'}</span>
                        <strong className="font-mono font-black text-emerald-800">{selectedFarmer.id}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">{isEn ? 'Farmer Name:' : 'ਕਿਸਾਨ ਦਾ ਨਾਂ:'}</span>
                        <strong className="text-slate-900">
                          {isEn ? selectedFarmer.farmerName : `${selectedFarmer.farmerNamePa} (${selectedFarmer.farmerName})`}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">{isEn ? "Father's Name:" : 'ਪਿਤਾ ਦਾ ਨਾਂ:'}</span>
                        <strong className="text-slate-800">
                          {selectedFarmer.fatherName || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">{isEn ? 'Village:' : 'ਪਿੰਡ:'}</span>
                        <strong className="text-slate-900">
                          {isEn ? selectedFarmer.village : (selectedFarmer.villagePa || selectedFarmer.village)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">{isEn ? 'Mobile:' : 'ਮੋਬਾਈਲ:'}</span>
                        <strong className="font-mono text-slate-900">{selectedFarmer.mobile}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">{isEn ? 'Aadhaar:' : 'ਆਧਾਰ:'}</span>
                        <strong className="font-mono text-slate-900">{selectedFarmer.aadhaar || '—'}</strong>
                      </div>
                    </div>

                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {selectedFarmer.photoUrl ? (
                        <img
                          src={selectedFarmer.photoUrl}
                          alt={selectedFarmer.farmerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bardana & Bags Inputs */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                    {isEn ? 'Bardana & Bags Entry' : 'ਬਾਰਦਾਨਾ ਅਤੇ ਬੋਰੀਆਂ ਵੇਰਵੇ (Bardana & Bags Entry)'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500">{isEn ? 'Stock:' : 'ਸਟਾਕ:'}</span>
                    <span className="bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                      {isEn ? 'New:' : 'ਨਵਾਂ:'} {bardanaSummary.newBagsRemaining.toLocaleString('en-IN')}
                    </span>
                    <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                      {isEn ? 'Old:' : 'ਪੁਰਾਣਾ:'} {bardanaSummary.oldBagsRemaining.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* New Juths */}
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5">
                    <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center justify-between">
                      <span>{isEn ? 'New Juths' : 'ਨਵਾਂ ਬਾਰਦਾਨਾ'}</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-black px-1.5 py-0.5 rounded">NEW</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={newBagsInput}
                      onChange={(e) => setNewBagsInput(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-lg py-1.5 px-2.5 text-base font-mono font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>

                  {/* Old Juths */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-2.5">
                    <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center justify-between">
                      <span>{isEn ? 'Old Juths' : 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ'}</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.5 rounded">OLD</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={oldBagsInput}
                      onChange={(e) => setOldBagsInput(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-lg py-1.5 px-2.5 text-base font-mono font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  {/* Separate Tota Input */}
                  <div className="bg-slate-100/70 border border-slate-200 rounded-lg p-2.5">
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>{isEn ? 'Separate Tota (Kg)' : 'ਵੱਖਰਾ ਟੋਟਾ (Kg)'}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">KG</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={totaInput}
                      onChange={(e) => setTotaInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-base font-mono font-black text-slate-950 text-right focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                </div>

                {/* Bags & Weight summary bar */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-600 font-bold">{isEn ? 'Total Bags:' : 'ਕੁੱਲ ਬੋਰੀਆਂ:'}</span>
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      {bagsCount} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({newBagsCount} {isEn ? 'New' : 'ਨਵਾਂ'} + {oldBagsCount} {isEn ? 'Old' : 'ਪੁਰਾਣਾ'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                    <span>{isEn ? 'Std Bag Weight:' : 'ਨਿਰਧਾਰਿਤ ਵਜ਼ਨ:'}</span>
                    <span className="font-mono font-black">37.50 Kg / Bag</span>
                  </div>
                </div>
              </div>

              {/* Restored Labour Columns/Fields Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-rose-600" />
                    <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                      {isEn ? 'Labour Deductions / Charges' : 'ਕਟੌਤੀ ਮਜ਼ਦੂਰੀ / ਖਰਚੇ (Labour Deductions)'}
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {isEn ? 'Editable Rates' : 'ਰੇਟ ਬਦਲਣਯੋਗ ਹਨ'}
                  </span>
                </div>

                {/* 3 Labour Columns: Pakki, Double, Sukki */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. Pakki Labour Column */}
                  <div className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="font-black text-xs text-slate-900">
                        {isEn ? 'Pakki Labour' : 'ਪੱਕੀ ਲੇਬਰ'}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded font-mono">
                        {labourSummary.pakkiBags} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        {isEn ? 'Rate (₹ / Bag)' : 'ਲੇਬਰ ਦਰ (₹ / ਬੋਰੀ)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={pakkiRateInput}
                          onChange={(e) => setPakkiRateInput(e.target.value)}
                          placeholder="7"
                          className="w-full pl-5 pr-1.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-black text-slate-950 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">{isEn ? 'Amount:' : 'ਰਕਮ:'}</span>
                      <span className="font-mono font-black text-slate-900">
                        ₹{labourSummary.pakkiAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 2. Double Labour Column */}
                  <div className="bg-orange-50/50 border-2 border-orange-200 hover:border-orange-300 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-orange-200 pb-1">
                      <span className="font-black text-xs text-orange-950">
                        {isEn ? 'Double Labour' : 'ਪੱਖਾ ਡਬਲ'}
                      </span>
                      <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded font-mono">
                        DOUBLE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-bold text-orange-950 mb-1">
                          {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={doubleBagsInput}
                          onChange={(e) => setDoubleBagsInput(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-orange-300 rounded-lg text-xs font-mono font-black text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-orange-950 mb-1">
                          {isEn ? 'Rate (₹)' : 'ਦਰ (₹)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-orange-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={doubleRateInput}
                            onChange={(e) => setDoubleRateInput(e.target.value)}
                            placeholder="14"
                            className="w-full pl-4 pr-1 py-1 bg-white border border-orange-300 rounded-lg text-xs font-mono font-black text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-300"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-orange-200 flex items-center justify-between text-xs">
                      <span className="text-orange-800 text-[11px]">{isEn ? 'Amount:' : 'ਰਕਮ:'}</span>
                      <span className="font-mono font-black text-orange-950">
                        ₹{labourSummary.doubleAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 3. Sukki Labour Column */}
                  <div className="bg-teal-50/50 border-2 border-teal-200 hover:border-teal-300 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center justify-between border-b border-teal-200 pb-1">
                      <span className="font-black text-xs text-teal-950">
                        {isEn ? 'Sukki Labour' : 'ਸੁੱਕੀ ਲੇਬਰ'}
                      </span>
                      <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded font-mono">
                        SUKKI
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="block text-[10px] font-bold text-teal-950 mb-1">
                          {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={sukkiBagsInput}
                          onChange={(e) => setSukkiBagsInput(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-teal-300 rounded-lg text-xs font-mono font-black text-teal-950 focus:outline-none focus:ring-1 focus:ring-teal-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-teal-950 mb-1">
                          {isEn ? 'Rate (₹)' : 'ਦਰ (₹)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-teal-400 font-bold">₹</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={sukkiRateInput}
                            onChange={(e) => setSukkiRateInput(e.target.value)}
                            placeholder="5"
                            className="w-full pl-4 pr-1 py-1 bg-white border border-teal-300 rounded-lg text-xs font-mono font-black text-teal-950 focus:outline-none focus:ring-1 focus:ring-teal-300"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-teal-200 flex items-center justify-between text-xs">
                      <span className="text-teal-800 text-[11px]">{isEn ? 'Amount:' : 'ਰਕਮ:'}</span>
                      <span className="font-mono font-black text-teal-950">
                        ₹{labourSummary.sukkiAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary bar inside Labour Section */}
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-bold">{isEn ? 'Breakdown:' : 'ਵੰਡ:'}</span>
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-semibold text-[11px] border border-slate-200">
                      {labourSummary.pakkiBags} {isEn ? 'Pakki' : 'ਪੱਕੀ'} + {labourSummary.doubleBags} {isEn ? 'Double' : 'ਡਬਲ'} + {labourSummary.sukkiBags} {isEn ? 'Sukki' : 'ਸੁੱਕੀ'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-700 font-bold">{isEn ? 'Labour Deduction:' : 'ਮਜ਼ਦੂਰੀ ਕਟੌਤੀ:'}</span>
                    <span className="font-mono font-black text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      ₹{totalLabourDeduction.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Final Summary Box */}
            <div className="space-y-4">
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-xl p-4 shadow-lg space-y-3.5 sticky top-20">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-xs uppercase tracking-wide text-emerald-400">
                    {isEn ? 'Final Summary' : 'ਹਿਸਾਬ ਸਾਰੰਸ਼ (Final Summary)'}
                  </span>
                  <Scale className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="space-y-2 text-xs">
                  {/* Total Bags */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">{isEn ? 'Total Bags:' : 'ਕੁੱਲ ਬੋਰੀਆਂ:'}</span>
                    <span className="font-mono font-bold text-white">
                      {bagsCount}
                    </span>
                  </div>

                  {/* Bags Weight */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">{isEn ? 'Bags Weight:' : 'ਬੋਰੀਆਂ ਵਜ਼ਨ (@37.50):'}</span>
                    <span className="font-mono font-bold text-white">
                      {bagsWeightBreakdown.displayEn}
                    </span>
                  </div>

                  {/* Separate Tota */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">{isEn ? 'Separate Tota:' : 'ਵੱਖਰਾ ਟੋਟਾ:'}</span>
                    <span className="font-mono font-bold text-amber-400">
                      {totaKg.toFixed(2)} Kg
                    </span>
                  </div>

                  {/* Grand Total Weight */}
                  <div className="flex justify-between items-center py-1.5 bg-slate-800/60 px-2 rounded border border-slate-700">
                    <span className="text-emerald-400 font-bold">{isEn ? 'Grand Total Weight:' : 'ਕੁੱਲ ਵਜ਼ਨ (Grand Total):'}</span>
                    <span className="font-mono font-black text-sm text-emerald-300">
                      {grandTotalBreakdown.displayEn}
                    </span>
                  </div>

                  {/* Govt Rate */}
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">{isEn ? 'Govt. MSP Rate:' : 'ਸਰਕਾਰੀ ਰੇਟ:'}</span>
                    <span className="font-mono font-bold text-white">
                      ₹{FIXED_RATE_PER_QTL.toLocaleString('en-IN')} / Qul
                    </span>
                  </div>

                  {/* Gross Amount */}
                  <div className="bg-slate-800/90 rounded-lg p-2.5 border border-slate-700">
                    <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wide">
                      {isEn ? 'Gross Amount' : 'ਕੁੱਲ ਗ੍ਰਾਸ ਰਕਮ (Gross Amount)'}
                    </div>
                    <div className="text-base font-mono font-black text-white mt-0.5">
                      {formatCurrency(calculatedGrossAmount)}
                    </div>
                  </div>

                  {/* (-) Total Labour */}
                  <div className="bg-rose-950/70 border border-rose-800/80 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-rose-200">
                      <span className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-rose-400" />
                        {isEn ? '(-) Total Labour' : '(-) ਕੁੱਲ ਮਜ਼ਦੂਰੀ (Total Labour)'}
                      </span>
                      <span className="font-mono font-bold text-rose-300">
                        -{formatCurrency(totalLabourDeduction)}
                      </span>
                    </div>

                    {totalLabourDeduction > 0 && (
                      <div className="pt-1 border-t border-rose-900/80 text-[10px] text-rose-200/90 space-y-0.5">
                        {labourSummary.pakkiBags > 0 && (
                          <div className="flex justify-between items-center">
                            <span>{isEn ? 'Pakki' : 'ਪੱਕੀ'} ({labourSummary.pakkiBags} @ ₹{labourSummary.pakkiRate}):</span>
                            <span className="font-mono font-semibold">₹{labourSummary.pakkiAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {labourSummary.doubleBags > 0 && (
                          <div className="flex justify-between items-center text-orange-200">
                            <span>{isEn ? 'Double' : 'ਡਬਲ'} ({labourSummary.doubleBags} @ ₹{labourSummary.doubleRate}):</span>
                            <span className="font-mono font-semibold">₹{labourSummary.doubleAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {labourSummary.sukkiBags > 0 && (
                          <div className="flex justify-between items-center text-emerald-200">
                            <span>{isEn ? 'Sukki' : 'ਸੁੱਕੀ'} ({labourSummary.sukkiBags} @ ₹{labourSummary.sukkiRate}):</span>
                            <span className="font-mono font-semibold">₹{labourSummary.sukkiAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Net Amount = Gross Amount - Total Labour */}
                  <div className="bg-emerald-950/90 border-2 border-emerald-500/80 p-2.5 rounded-lg mt-1">
                    <div className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">
                      {isEn ? 'Net Amount = Gross Amount - Total Labour' : 'ਸ਼ੁੱਧ ਅਦਾਇਗੀ ਰਕਮ (Net Amount = Gross - Labour)'}
                    </div>
                    <div className="text-xl font-mono font-black text-emerald-300 mt-0.5">
                      {formatCurrency(netPayableAmount)}
                    </div>
                    <div className="text-[9px] text-emerald-400/90 mt-0.5 font-mono">
                      {formatCurrency(calculatedGrossAmount)} - {formatCurrency(totalLabourDeduction)} = {formatCurrency(netPayableAmount)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'ਰੱਦ ਕਰੋ (Cancel)'}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? (isEn ? 'Updating...' : 'ਅਪਡੇਟ ਹੋ ਰਿਹਾ ਹੈ...') : (isEn ? 'Save / Update Entry' : 'ਸੋਧ ਸੇਵ ਕਰੋ (Update Entry)')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
