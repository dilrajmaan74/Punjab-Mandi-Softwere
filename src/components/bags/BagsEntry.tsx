import React, { useState, useEffect, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DateInput } from '../common/DateInput';
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
  Scissors,
  Search,
  Hash,
  Edit,
  Trash2
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

interface BagsEntryDraft {
  dateInput: string;
  selectedFarmerId: string;
  newBagsInput: string;
  oldBagsInput: string;
  doubleBagsInput: string;
  sukkiBagsInput: string;
  totaInput: string;
  pakkiRateInput?: string;
  doubleRateInput?: string;
  sukkiRateInput?: string;
}

export const BagsEntry: React.FC = () => {
  const {
    farmers,
    bagsEntries,
    addBagsEntry,
    deleteBagsEntry,
    getNextParchiNo,
    selectedFarmerForBags,
    setSelectedFarmerForBags,
    setActiveReceipt,
    setActiveBagsEntryToEdit,
    setActiveSection,
    getBardanaSummary,
    settings,
    language
  } = useMandi();
  const isEn = language === 'en';
  const { notifySaveSuccess, notifyDeleteSuccess, confirmDelete, notifyError } = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');

  const bardanaSummary = getBardanaSummary();
  const nextParchiNo = getNextParchiNo();

  // Current Date in DD/MM/YYYY format
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Universal Auto-Save Draft
  const { draft, saveDraft, clearDraft } = useFormDraft<BagsEntryDraft>({
    formKey: 'draft_bags_entry',
    initialValues: {
      dateInput: getTodayFormatted(),
      selectedFarmerId: selectedFarmerForBags?.id || farmers[0]?.id || '',
      newBagsInput: '',
      oldBagsInput: '',
      doubleBagsInput: '',
      sukkiBagsInput: '',
      totaInput: '',
      pakkiRateInput: String(settings?.defaultPakkiLabourRate ?? 7),
      doubleRateInput: String(settings?.defaultPakkaDoubleLabourRate ?? 14),
      sukkiRateInput: String(settings?.defaultSukhiLabourRate ?? 5)
    }
  });

  // Form State initialized from draft
  const [dateInput, setDateInput] = useState<string>(draft.dateInput || getTodayFormatted());
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(
    selectedFarmerForBags?.id || draft.selectedFarmerId || farmers[0]?.id || ''
  );
  const [newBagsInput, setNewBagsInput] = useState<string>(draft.newBagsInput || '');
  const [oldBagsInput, setOldBagsInput] = useState<string>(draft.oldBagsInput || '');
  const [doubleBagsInput, setDoubleBagsInput] = useState<string>(draft.doubleBagsInput || '');
  const [sukkiBagsInput, setSukkiBagsInput] = useState<string>(draft.sukkiBagsInput || '');
  const [totaInput, setTotaInput] = useState<string>(draft.totaInput || '');
  const [pakkiRateInput, setPakkiRateInput] = useState<string>(
    draft.pakkiRateInput || String(settings?.defaultPakkiLabourRate ?? 7)
  );
  const [doubleRateInput, setDoubleRateInput] = useState<string>(
    draft.doubleRateInput || String(settings?.defaultPakkaDoubleLabourRate ?? 14)
  );
  const [sukkiRateInput, setSukkiRateInput] = useState<string>(
    draft.sukkiRateInput || String(settings?.defaultSukhiLabourRate ?? 5)
  );
  const [farmerSearchTerm, setFarmerSearchTerm] = useState('');

  // Auto-save draft on every change
  useEffect(() => {
    saveDraft({
      dateInput,
      selectedFarmerId,
      newBagsInput,
      oldBagsInput,
      doubleBagsInput,
      sukkiBagsInput,
      totaInput,
      pakkiRateInput,
      doubleRateInput,
      sukkiRateInput
    });
  }, [dateInput, selectedFarmerId, newBagsInput, oldBagsInput, doubleBagsInput, sukkiBagsInput, totaInput, pakkiRateInput, doubleRateInput, sukkiRateInput, saveDraft]);

  // Notification / Saved Receipt State
  const [savedReceiptRecord, setSavedReceiptRecord] = useState<any | null>(null);

  // Sync selectedFarmerId if set globally from other screens
  useEffect(() => {
    if (selectedFarmerForBags) {
      setSelectedFarmerId(selectedFarmerForBags.id);
    }
  }, [selectedFarmerForBags]);

  // Filtered farmers based on search
  const filteredFarmers = useMemo(() => {
    if (!farmerSearchTerm.trim()) return farmers;
    const q = farmerSearchTerm.toLowerCase();
    return farmers.filter(
      (f) =>
        f.id.toLowerCase().includes(q) ||
        (f.farmerName && f.farmerName.toLowerCase().includes(q)) ||
        (f.farmerNamePa && f.farmerNamePa.includes(q)) ||
        (f.mobile && f.mobile.includes(q)) ||
        (f.village && f.village.toLowerCase().includes(q)) ||
        (f.villagePa && f.villagePa.includes(q))
    );
  }, [farmers, farmerSearchTerm]);

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  // SearchableSelect options for farmers
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

  // Date Auto-Formatting as typed: e.g. "28082026" -> "28/08/2026"
  const handleDateChange = (val: string) => {
    const formatted = autoFormatDate(val);
    setDateInput(formatted);
  };

  // Calculations
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

  // 1. Total Bags Weight (bags * 37.50 KG) -> displayed in Qul + Kg
  const bagsWeightBreakdown = calculateBagsWeight(bagsCount);

  // 2. Grand Total = Bags Weight + Tota -> displayed in Qul + Kg
  const grandTotalBreakdown = calculateGrandTotal(bagsWeightBreakdown.totalKg, totaKg);

  // 3. Gross Amount at ₹2,461 / Qul
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

  // 4. Automatic Labour Calculation at final summary from entered New/Old/Double/Sukki bags and user-editable rates
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

  // Filtered saved entries for quick search and editing
  const filteredSavedEntries = useMemo(() => {
    if (!savedSearchQuery.trim()) return bagsEntries;
    const q = savedSearchQuery.toLowerCase().trim();
    return bagsEntries.filter(
      (b) =>
        b.entryNumber.toLowerCase().includes(q) ||
        (b.parchiNo && b.parchiNo.toString().includes(q)) ||
        b.farmerId.toLowerCase().includes(q) ||
        b.farmerName.toLowerCase().includes(q) ||
        (b.farmerNamePa && b.farmerNamePa.includes(q)) ||
        b.farmerVillage.toLowerCase().includes(q) ||
        (b.farmerVillagePa && b.farmerVillagePa.includes(q)) ||
        b.farmerMobile.includes(q) ||
        b.date.includes(q)
    );
  }, [bagsEntries, savedSearchQuery]);

  const handleDeleteBagsEntry = (entry: BagsEntryRecord) => {
    confirmDelete({
      recordNameEn: `Slip ${entry.parchiNo ? `#${entry.parchiNo}` : entry.entryNumber}`,
      recordNamePa: `ਰਸੀਦ ${entry.parchiNo ? `#${entry.parchiNo}` : entry.entryNumber}`,
      recordId: entry.entryNumber,
      itemDetails: [
        { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ', value: `${entry.farmerNamePa} (${entry.farmerName})` },
        { labelEn: 'Bags', labelPa: 'ਬੋਰੀਆਂ', value: `${entry.bags} Bags (${entry.grandTotalDisplay})` },
        { labelEn: 'Amount', labelPa: 'ਰਕਮ', value: formatCurrency(entry.totalAmount) }
      ],
      onConfirm: () => {
        deleteBagsEntry(entry.id);
        notifyDeleteSuccess({
          titlePa: 'ਬੋਰੀਆਂ ਦੀ ਰਸੀਦ ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।',
          titleEn: 'Bags Entry Deleted',
          messagePa: `ਰਸੀਦ #${entry.parchiNo || entry.entryNumber} ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।`
        });
      }
    });
  };

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
      labourDeductions: hasActiveDeductions ? labourDeductions : undefined,
      conditionBreakdown: hasActiveDeductions ? conditionBreakdown : undefined,
      netAmount: netPayableAmount
    });

    const deductionMsg = hasActiveDeductions
      ? ` • ਕਟੌਤੀ: -${formatCurrency(totalLabourDeduction)} • ਸ਼ੁੱਧ ਰਕਮ: ${formatCurrency(netPayableAmount)}`
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
      messagePa: `${selectedFarmer.farmerNamePa || selectedFarmer.farmerName} (${selectedFarmer.villagePa || selectedFarmer.village}) ਲਈ ${bagsCount} ਬੋਰੀਆਂ ${bardanaText} ਦਰਜ ਹੋ ਗਈਆਂ। ਪਰਚੀ ਨੰ: #${newRecord.parchiNo || newRecord.entryNumber}`,
      details: `ਪਰਚੀ ਨੰ: #${newRecord.parchiNo || newRecord.entryNumber} • ਰਕਮ: ${formatCurrency(calculatedGrossAmount)}${deductionMsg}`
    });

    // Clear universal auto-save draft only upon successful save
    clearDraft();
    setNewBagsInput('');
    setOldBagsInput('');
    setDoubleBagsInput('');
    setSukkiBagsInput('');
    setTotaInput('');
    setPakkiRateInput(String(settings?.defaultPakkiLabourRate ?? 7));
    setDoubleRateInput(String(settings?.defaultPakkaDoubleLabourRate ?? 14));
    setSukkiRateInput(String(settings?.defaultSukhiLabourRate ?? 5));

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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                {isEn ? 'Farmer Bags Entry' : 'ਕਿਸਾਨ ਬੋਰੀਆਂ ਐਂਟਰੀ (Farmer Bags Entry)'}
              </h2>
              {/* Separate Parchi Number Badge */}
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-mono font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                <Hash className="w-3 h-3 text-amber-700" />
                <span>{isEn ? `Slip #${nextParchiNo}` : `ਪਰਚੀ ਨੰ: #${nextParchiNo}`}</span>
              </span>
              {/* Separate Date Badge */}
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-300 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{isEn ? `Date: ${dateInput}` : `ਮਿਤੀ: ${dateInput}`}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isEn
                ? 'Fixed 37.50 KG bag weight • Separate Tota • Quintal+Kg format • Govt. MSP ₹2,461/Qtl'
                : 'ਫਿਕਸਡ 37.50 KG ਬੋਰੀ ਵਜ਼ਨ • ਵੱਖਰਾ ਟੋਟਾ • ਕੁਇੰਟਲ+ਕਿਲੋ ਫਾਰਮੈਟ • ਸਰਕਾਰੀ ਭਾਅ ₹2,461/ਕੁਇੰਟਲ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('same-date-multi-entry')}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-2xs transition"
          >
            {isEn ? 'Same Date Multi-Farmer Entry →' : 'ਇੱਕੋ ਮਿਤੀ ਮਲਟੀ ਕਿਸਾਨ ਐਂਟਰੀ →'}
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
                  {isEn ? 'Bags Entry Saved Successfully!' : 'ਬੋਰੀਆਂ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋ ਗਈ ਹੈ! (Bags Entry Saved)'}
                </h3>
                <p className="text-xs text-emerald-800">
                  {isEn ? 'Receipt #' : 'ਰਸੀਦ ਨੰ:'} <strong className="font-mono">{savedReceiptRecord.entryNumber}</strong> • {isEn ? 'Farmer:' : 'ਕਿਸਾਨ:'}{' '}
                  <strong>{isEn ? savedReceiptRecord.farmerName : `${savedReceiptRecord.farmerNamePa} (${savedReceiptRecord.farmerName})`}</strong> • {isEn ? 'Total Weight:' : 'ਕੁੱਲ ਵਜ਼ਨ:'}{' '}
                  <strong className="font-mono">{savedReceiptRecord.grandTotalDisplay}</strong> • {isEn ? 'Amount:' : 'ਰਕਮ:'}{' '}
                  <strong className="font-mono">{formatCurrency(savedReceiptRecord.totalAmount)}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSavedReceiptRecord(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕ {isEn ? 'Close' : 'ਬੰਦ ਕਰੋ'}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-emerald-200">
            <button
              type="button"
              onClick={() => setActiveBagsEntryToEdit(savedReceiptRecord)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{isEn ? 'Edit Entry' : 'ਐਂਟਰੀ ਸੋਧੋ (Edit Entry)'}</span>
            </button>
            <button
              onClick={() => setActiveReceipt(savedReceiptRecord)}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print Weighment Slip' : 'ਰਸੀਦ ਪ੍ਰਿੰਟ ਕਰੋ (Print Weighment Slip)'}</span>
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
              {isEn ? '+ New Entry' : '+ ਅਗਲੀ ਐਂਟਰੀ ਕਰੋ (Next Entry)'}
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
              {isEn ? 'No Farmers Registered' : 'ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ (No Farmers Registered)'}
            </h3>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
              {isEn
                ? 'Farmer registration is required before adding bags to associate name, ID, and village.'
                : 'ਬੋਰੀਆਂ ਦਰਜ ਕਰਨ ਲਈ ਪਹਿਲਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰਨਾ ਲਾਜ਼ਮੀ ਹੈ ਤਾਂ ਜੋ ਉਸਦਾ ਨਾਂ, ਆਈ.ਡੀ ਅਤੇ ਫੋਟੋ ਆਟੋਮੈਟਿਕ ਦਿਖਾਈ ਦੇਵੇ।'}
            </p>
          </div>
          <button
            onClick={() => setActiveSection('farmer-registration')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-2xs"
          >
            {isEn ? '+ Register Farmer' : '+ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ (Register Farmer)'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2 Columns: Input Controls */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm border-b border-slate-100 pb-2">
                {isEn ? '1. Date & Farmer Selection' : '1. ਮਿਤੀ ਤੇ ਕਿਸਾਨ ਦੀ ਚੋਣ (Date & Farmer Selection)'}
              </h3>

              {/* Date Input with Auto-Formatting & Calendar Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <DateInput
                    value={dateInput}
                    onChange={setDateInput}
                    label={isEn ? "Date (DD/MM/YYYY)" : "ਮਿਤੀ (Date - DD/MM/YYYY)"}
                    required
                  />
                  <span className="text-[10px] text-slate-400">
                    {isEn ? 'Click calendar icon to pick date' : "ਕੈਲੰਡਰ ਆਈਕਨ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਮਿਤੀ ਚੁਣੋ"}
                  </span>
                </div>

                {/* Farmer Selection Dropdown with Search Box */}
                <div className="sm:col-span-2">
                  <SearchableSelect
                    id="farmer-select"
                    label={isEn ? "Select Registered Farmer" : "ਕਿਸਾਨ ਚੁਣੋ (Select Registered Farmer)"}
                    value={selectedFarmerId || ''}
                    onChange={(val) => {
                      setSelectedFarmerId(val);
                      const f = farmers.find((farm) => farm.id === val);
                      if (f) setSelectedFarmerForBags(f);
                    }}
                    options={farmerOptions}
                    placeholder={isEn ? "Search and select farmer..." : "ਕਿਸਾਨ ਖੋਜੋ ਤੇ ਚੁਣੋ..."}
                    searchPlaceholder={isEn ? "Type farmer name, ID, village, phone..." : "ਕਿਸਾਨ ਖੋਜੋ (ਨਾਮ, ਆਈ.ਡੀ, ਮੋਬਾਈਲ, ਪਿੰਡ)..."}
                    emptyMessage={isEn ? "No farmer found matching search" : "ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ"}
                    required
                  />
                </div>
              </div>

              {/* Farmer Profile Live Display (Visual Confirmation with Photo) */}
              {selectedFarmer && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
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
                        {isEn ? (selectedFarmer.fatherName || '—') : (selectedFarmer.fatherNamePa || selectedFarmer.fatherName || '—')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">{isEn ? 'Village:' : 'ਪਿੰਡ (Village):'}</span>
                      <strong className="text-slate-900">
                        {isEn ? selectedFarmer.village : `${selectedFarmer.villagePa || selectedFarmer.village} (${selectedFarmer.pinCode})`}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">{isEn ? 'Mobile:' : 'ਮੋਬਾਈਲ (Mobile):'}</span>
                      <strong className="font-mono text-slate-900">{selectedFarmer.mobile}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">{isEn ? 'Aadhaar:' : 'ਆਧਾਰ (Aadhaar):'}</span>
                      <strong className="font-mono text-slate-900">{selectedFarmer.aadhaar || '—'}</strong>
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
                  {isEn ? '2. Bardana & Bags Entry' : '2. ਬਾਰਦਾਨਾ ਅਤੇ ਬੋਰੀਆਂ ਵੇਰਵੇ (Bardana & Bags Entry)'}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium">{isEn ? 'Available Stock:' : 'ਉਪਲਬਧ ਸਟਾਕ:'}</span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    {isEn ? 'New:' : 'ਨਵਾਂ:'} {bardanaSummary.newBagsRemaining.toLocaleString('en-IN')}
                  </span>
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
                    {isEn ? 'Old:' : 'ਪੁਰਾਣਾ:'} {bardanaSummary.oldBagsRemaining.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. New Bardana Bags Input */}
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center justify-between">
                    <span>{isEn ? '1. New Juths' : '1. ਨਵਾਂ ਬਾਰਦਾਨਾ (New Juths)'}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">
                      {isEn ? 'NEW' : 'ਨਵਾਂ'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newBagsInput || ''}
                    onChange={(e) => setNewBagsInput(e.target.value)}
                    className="w-full bg-white border-2 border-emerald-300 rounded-lg py-2 px-3 text-base font-mono font-black text-emerald-950 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                  <div className="mt-1 text-[10px] text-emerald-700 font-medium">
                    {isEn ? 'Bags in new bardana' : 'ਨਵੇਂ ਬਾਰਦਾਨੇ ਦੀਆਂ ਬੋਰੀਆਂ'}
                  </div>
                </div>

                {/* 2. Old Bardana Bags Input */}
                <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center justify-between">
                    <span>{isEn ? '2. Old Juths' : '2. ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Juths)'}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded">
                      {isEn ? 'OLD' : 'ਪੁਰਾਣਾ'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={oldBagsInput || ''}
                    onChange={(e) => setOldBagsInput(e.target.value)}
                    className="w-full bg-white border-2 border-amber-300 rounded-lg py-2 px-3 text-base font-mono font-black text-amber-950 focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  <div className="mt-1 text-[10px] text-amber-700 font-medium">
                    {isEn ? 'Bags in old bardana' : 'ਪੁਰਾਣੇ ਬਾਰਦਾਨੇ ਦੀਆਂ ਬੋਰੀਆਂ'}
                  </div>
                </div>

                {/* 3. Separate Tota Input */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>{isEn ? '3. Separate Tota (Kg)' : '3. ਵੱਖਰਾ ਟੋਟਾ (Tota Kg)'}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                      KG
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={totaInput || ''}
                    onChange={(e) => setTotaInput(e.target.value)}
                    className="w-full bg-white border-2 border-slate-300 rounded-lg py-2 px-3 text-base font-mono font-black text-amber-950 text-right focus:bg-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  <div className="mt-1 text-[10px] text-slate-500">
                    {isEn ? 'Optional loose weight in Kg' : 'ਬੋਰੀਆਂ ਤੋਂ ਵੱਖਰਾ ਖੁੱਲ੍ਹਾ ਵਜ਼ਨ'}
                  </div>
                </div>
              </div>

              {/* Auto-Calculated Total Bags Summary Bar */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-700 font-bold">{isEn ? 'Total Bags:' : 'ਕੁੱਲ ਬੋਰੀਆਂ (Total Bags):'}</span>
                  <span className="font-mono font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                    {bagsCount} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                  </span>
                  <span className="text-[11px] text-slate-600 font-medium">
                    ({newBagsCount} {isEn ? 'New' : 'ਨਵਾਂ'} + {oldBagsCount} {isEn ? 'Old' : 'ਪੁਰਾਣਾ'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                  <span>{isEn ? 'Std Bag Weight:' : 'ਨਿਰਧਾਰਿਤ ਵਜ਼ਨ:'}</span>
                  <strong className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">37.50 KG / Bag</strong>
                </div>
              </div>
            </div>

            {/* Restored Labour Columns/Fields Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-rose-600" />
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                    {isEn ? '3. Labour Deductions & Charges' : '3. ਕਟੌਤੀ ਮਜ਼ਦੂਰੀ / ਖਰਚੇ (Labour Deductions)'}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                  {isEn ? 'Rates are editable by user' : 'ਸਾਰੇ ਲੇਬਰ ਰੇਟ ਬਦਲਣਯੋਗ (Editable) ਹਨ'}
                </span>
              </div>

              {/* 3 Labour Columns: Pakki, Double, Sukki */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Pakki Labour Column */}
                <div className="bg-slate-50/60 border-2 border-slate-200 hover:border-slate-300 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="font-black text-xs text-slate-900">
                      {isEn ? 'Pakki Labour' : 'ਪੱਕੀ ਲੇਬਰ (Pakki)'}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded font-mono">
                      {labourSummary.pakkiBags} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {isEn ? 'Rate (₹ / Bag)' : 'ਲੇਬਰ ਦਰ (₹ / ਬੋਰੀ)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={pakkiRateInput}
                        onChange={(e) => setPakkiRateInput(e.target.value)}
                        placeholder="7"
                        className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-black text-slate-950 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{isEn ? 'Amount:' : 'ਰਕਮ:'}</span>
                    <span className="font-mono font-black text-slate-900">
                      ₹{labourSummary.pakkiAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isEn
                      ? `Auto: Remaining bags (${bagsCount} - ${doubleBagsCount + sukkiBagsCount})`
                      : `ਬਾਕੀ ਬੋਰੀਆਂ (${bagsCount} - ${doubleBagsCount + sukkiBagsCount})`}
                  </div>
                </div>

                {/* 2. Double Labour Column */}
                <div className="bg-orange-50/40 border-2 border-orange-200 hover:border-orange-300 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-orange-200 pb-1.5">
                    <span className="font-black text-xs text-orange-950">
                      {isEn ? 'Double Labour' : 'ਪੱਖਾ ਡਬਲ (Double)'}
                    </span>
                    <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded font-mono">
                      DOUBLE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-orange-950 mb-1">
                        {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={doubleBagsInput}
                        onChange={(e) => setDoubleBagsInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg text-sm font-mono font-black text-orange-950 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-orange-950 mb-1">
                        {isEn ? 'Rate (₹/Bag)' : 'ਦਰ (₹/ਬੋਰੀ)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-orange-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={doubleRateInput}
                          onChange={(e) => setDoubleRateInput(e.target.value)}
                          placeholder="14"
                          className="w-full pl-5 pr-1.5 py-1.5 bg-white border border-orange-300 rounded-lg text-sm font-mono font-black text-orange-950 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-orange-200 flex items-center justify-between text-xs">
                    <span className="text-orange-800 font-medium">{isEn ? 'Amount:' : 'ਰਕਮ:'}</span>
                    <span className="font-mono font-black text-orange-950">
                      ₹{labourSummary.doubleAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-orange-700">
                    {isEn ? `${doubleBagsCount} bags @ ₹${labourSummary.doubleRate}` : `${doubleBagsCount} ਬੋਰੀਆਂ @ ₹${labourSummary.doubleRate}`}
                  </div>
                </div>

                {/* 3. Sukki Labour Column */}
                <div className="bg-teal-50/40 border-2 border-teal-200 hover:border-teal-300 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-teal-200 pb-1.5">
                    <span className="font-black text-xs text-teal-950">
                      {isEn ? 'Sukki Labour' : 'ਸੁੱਕੀ ਲੇਬਰ (Sukki)'}
                    </span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded font-mono">
                      SUKKI
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-teal-950 mb-1">
                        {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={sukkiBagsInput}
                        onChange={(e) => setSukkiBagsInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-sm font-mono font-black text-teal-950 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-teal-950 mb-1">
                        {isEn ? 'Rate (₹/Bag)' : 'ਦਰ (₹/ਬੋਰੀ)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-teal-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={sukkiRateInput}
                          onChange={(e) => setSukkiRateInput(e.target.value)}
                          placeholder="5"
                          className="w-full pl-5 pr-1.5 py-1.5 bg-white border border-teal-300 rounded-lg text-sm font-mono font-black text-teal-950 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-teal-200 flex items-center justify-between text-xs">
                    <span className="text-teal-800 font-medium">{isEn ? 'Amount:' : 'ਰਕਮ:'}</span>
                    <span className="font-mono font-black text-teal-950">
                      ₹{labourSummary.sukkiAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-teal-700">
                    {isEn ? `${sukkiBagsCount} bags @ ₹${labourSummary.sukkiRate}` : `${sukkiBagsCount} ਬੋਰੀਆਂ @ ₹${labourSummary.sukkiRate}`}
                  </div>
                </div>
              </div>

              {/* Summary bar inside Labour Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-bold">{isEn ? 'Condition Breakdown:' : 'ਬੋਰੀਆਂ ਦੀ ਵੰਡ:'}</span>
                  <span className="bg-white text-slate-800 px-2 py-0.5 rounded font-mono font-semibold text-[11px] border border-slate-200">
                    {labourSummary.pakkiBags} {isEn ? 'Pakki' : 'ਪੱਕੀ'} + {labourSummary.doubleBags} {isEn ? 'Double' : 'ਡਬਲ'} + {labourSummary.sukkiBags} {isEn ? 'Sukki' : 'ਸੁੱਕੀ'} = {bagsCount} {isEn ? 'Total' : 'ਕੁੱਲ'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-rose-700 font-bold">{isEn ? 'Total Labour Deduction:' : 'ਕੁੱਲ ਮਜ਼ਦੂਰੀ ਕਟੌਤੀ:'}</span>
                  <span className="font-mono font-black text-sm text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    ₹{totalLabourDeduction.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Column: Real-time Live Calculation Box (Final Summary) */}
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-2xs border border-slate-800 space-y-3.5">
              <h3 className="font-black text-xs uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>{isEn ? 'Final Summary' : 'ਹਿਸਾਬ ਸਾਰੰਸ਼ (Final Summary)'}</span>
                <span className="text-[10px] text-slate-400 font-mono">₹2,461 / Qul</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                {/* 0. Bardana Breakdown */}
                <div className="bg-slate-800/90 rounded-lg p-2.5 border border-slate-700">
                  <div className="text-[11px] text-slate-400 font-semibold mb-1">
                    {isEn ? 'Bardana Split:' : 'ਬਾਰਦਾਨਾ ਵੇਰਵਾ (Bardana Split):'}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                    <div className="bg-emerald-950/80 border border-emerald-700/60 rounded p-1 text-emerald-300">
                      <span className="text-[10px] block text-emerald-400/80">{isEn ? 'New Bardana' : 'ਨਵਾਂ ਬਾਰਦਾਨਾ'}</span>
                      <strong>{newBagsCount} Bags</strong>
                    </div>
                    <div className="bg-amber-950/80 border border-amber-700/60 rounded p-1 text-amber-300">
                      <span className="text-[10px] block text-amber-400/80">{isEn ? 'Old Bardana' : 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ'}</span>
                      <strong>{oldBagsCount} Bags</strong>
                    </div>
                  </div>
                </div>

                {/* 1. Bags Weight breakdown */}
                <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>{isEn ? 'Bags Total Weight:' : 'ਕੁੱਲ ਬੋਰੀਆਂ ਦਾ ਵਜ਼ਨ:'}</span>
                    <span className="font-mono text-slate-300">{bagsCount} × 37.50 KG</span>
                  </div>
                  <div className="text-base font-mono font-black text-white mt-0.5">
                    {bagsWeightBreakdown.displayEn}
                  </div>
                  {!isEn && <div className="text-[10px] text-slate-400">{bagsWeightBreakdown.displayPa}</div>}
                </div>

                {/* 2. Separate Tota */}
                <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">{isEn ? 'Separate Tota:' : 'ਵੱਖਰਾ ਟੋਟਾ (Separate Tota):'}</div>
                    <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                      {totaKg} Kg
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-700/40 px-1.5 py-0.5 rounded">
                    Tota
                  </span>
                </div>

                {/* 3. Grand Total (Qul + Kg) */}
                <div className="bg-slate-800/90 border border-slate-700 rounded-lg p-2.5">
                  <div className="text-[11px] text-slate-300 flex justify-between">
                    <span>{isEn ? 'Grand Total Weight:' : 'ਗ੍ਰੈਂਡ ਟੋਟਲ ਵਜ਼ਨ (Grand Total):'}</span>
                    <span className="font-mono text-[10px] text-slate-400">Bags + Tota</span>
                  </div>
                  <div className="text-lg font-mono font-black text-white mt-0.5">
                    {grandTotalBreakdown.displayEn}
                  </div>
                  {!isEn && <div className="text-[10px] text-slate-400">{grandTotalBreakdown.displayPa}</div>}
                </div>

                {/* 4. Mandi Rate */}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold">{isEn ? 'Govt. MSP Rate:' : 'ਸਰਕਾਰੀ ਭਾਅ:'}</span>
                  <span className="font-mono font-bold text-white text-xs">₹2,461 / Qul</span>
                </div>

                {/* Gross Amount */}
                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                  <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wide">
                    {isEn ? 'Gross Amount' : 'ਕੁੱਲ ਗ੍ਰਾਸ ਰਕਮ (Gross Amount)'}
                  </div>
                  <div className="text-xl font-mono font-black text-white mt-0.5">
                    {formatCurrency(calculatedGrossAmount)}
                  </div>
                </div>

                {/* (-) Total Labour */}
                <div className="bg-rose-950/70 border border-rose-800/80 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-rose-200">
                    <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-rose-400" />
                      {isEn ? '(-) Total Labour' : '(-) ਕੁੱਲ ਮਜ਼ਦੂਰੀ (Total Labour)'}
                    </span>
                    <span className="text-lg font-mono font-black text-rose-300">
                      -{formatCurrency(totalLabourDeduction)}
                    </span>
                  </div>

                  {/* Automatically calculated labour details */}
                  {totalLabourDeduction > 0 && (
                    <div className="pt-1.5 border-t border-rose-900/80 text-[10px] text-rose-200/90 space-y-1">
                      {labourSummary.pakkiBags > 0 && (
                        <div className="flex justify-between items-center">
                          <span>{isEn ? 'Pakki Labour' : 'ਪੱਕੀ ਲੇਬਰ'} ({labourSummary.pakkiBags} @ ₹{labourSummary.pakkiRate}):</span>
                          <span className="font-mono font-semibold">₹{labourSummary.pakkiAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {labourSummary.doubleBags > 0 && (
                        <div className="flex justify-between items-center text-orange-200">
                          <span>{isEn ? 'Pakka Double' : 'ਪੱਖਾ ਡਬਲ'} ({labourSummary.doubleBags} @ ₹{labourSummary.doubleRate}):</span>
                          <span className="font-mono font-semibold">₹{labourSummary.doubleAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {labourSummary.sukkiBags > 0 && (
                        <div className="flex justify-between items-center text-emerald-200">
                          <span>{isEn ? 'Sukki Labour' : 'ਸੁੱਕੀ ਲੇਬਰ (ਸਕਾਈ)'} ({labourSummary.sukkiBags} @ ₹{labourSummary.sukkiRate}):</span>
                          <span className="font-mono font-semibold">₹{labourSummary.sukkiAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Net Amount = Gross Amount - Total Labour */}
                <div className="bg-emerald-900/80 border-2 border-emerald-500 rounded-lg p-3">
                  <div className="text-[11px] text-emerald-300 font-black uppercase tracking-wide">
                    {isEn ? 'Net Amount = Gross Amount - Total Labour' : 'ਸ਼ੁੱਧ ਅਦਾਇਗੀ ਰਕਮ (Net Amount = Gross - Labour)'}
                  </div>
                  <div className="text-2xl font-mono font-black text-emerald-300 mt-1">
                    {formatCurrency(netPayableAmount)}
                  </div>
                  <div className="text-[10px] text-emerald-400/90 mt-0.5 font-mono">
                    {formatCurrency(calculatedGrossAmount)} - {formatCurrency(totalLabourDeduction)} = {formatCurrency(netPayableAmount)}
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
                    <span>{isEn ? 'Saving Bags Entry...' : 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ... (Saving Bags Entry...)'}</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>{isEn ? 'Save Bags Entry' : 'ਐਂਟਰੀ ਸੇਵ ਕਰੋ (Save Bags Entry)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Saved Farmer Bag Entries Section with Edit Option */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <span>{isEn ? 'Saved Farmer Bag Entries' : 'ਦਰਜ ਕੀਤੀਆਂ ਬੋਰੀਆਂ ਦੀ ਸੂਚੀ (Saved Farmer Bag Entries)'}</span>
                <span className="bg-slate-100 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-300">
                  {bagsEntries.length} {isEn ? 'Entries' : 'ਐਂਟਰੀਆਂ'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isEn
                  ? 'Click "Edit" on any saved entry to open with all saved values pre-filled'
                  : 'ਕਿਸੇ ਵੀ ਦਰਜ ਹੋਈ ਐਂਟਰੀ ਨੂੰ ਸੋਧਣ ਲਈ "Edit" ਬਟਨ ਦਬਾਓ'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={isEn ? 'Search slip #, farmer, village...' : 'ਪਰਚੀ ਨੰਬਰ, ਕਿਸਾਨ ਜਾਂ ਪਿੰਡ ਖੋਜੋ...'}
              value={savedSearchQuery}
              onChange={(e) => setSavedSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold text-[11px]">
                <th className="py-2.5 px-3">ਪਰਚੀ / ਰਸੀਦ ਨੰ:</th>
                <th className="py-2.5 px-3">ਮਿਤੀ</th>
                <th className="py-2.5 px-3">ਕਿਸਾਨ ਵੇਰਵੇ</th>
                <th className="py-2.5 px-3 text-center">ਬੋਰੀਆਂ</th>
                <th className="py-2.5 px-3 text-right">ਵਜ਼ਨ (Qul Kg)</th>
                <th className="py-2.5 px-3 text-right">ਟੋਟਾ (Kg)</th>
                <th className="py-2.5 px-3 text-right font-black">ਕੁੱਲ ਵਜ਼ਨ</th>
                <th className="py-2.5 px-3 text-center">ਬਾਰਦਾਨਾ</th>
                <th className="py-2.5 px-3 text-right">ਰਕਮ</th>
                <th className="py-2.5 px-3 text-right">ਐਕਸ਼ਨ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSavedEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    {isEn ? 'No saved bags entries found' : 'ਕੋਈ ਦਰਜ ਕੀਤੀਆਂ ਬੋਰੀਆਂ ਨਹੀਂ ਮਿਲੀਆਂ'}
                  </td>
                </tr>
              ) : (
                filteredSavedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded text-[11px] font-black border border-amber-200">
                          #{entry.parchiNo || entry.entryNumber}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{entry.entryNumber}</span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700 text-[11px]">
                      {entry.date}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">
                        {entry.farmerNamePa} ({entry.farmerName})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {entry.farmerVillagePa || entry.farmerVillage} • Mob: {entry.farmerMobile}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center font-bold">
                      {entry.bags}
                      {(entry.newBags !== undefined || entry.oldBags !== undefined) && (
                        <div className="text-[9px] text-slate-400">
                          (N:{entry.newBags || 0} O:{entry.oldBags || 0})
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {entry.totalBagsWeightDisplay}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-amber-800 font-bold">
                      {entry.totaKg > 0 ? `${entry.totaKg} Kg` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-emerald-950">
                      {entry.grandTotalDisplay}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          entry.bardana === 'OLD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {entry.bardana === 'OLD' ? 'ਪੁਰਾਣਾ' : entry.bardana === 'BOTH' ? 'ਦੋਵੇਂ' : 'ਨਵਾਂ'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-950">
                      {formatCurrency(entry.totalAmount)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveBagsEntryToEdit(entry)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-1 rounded-md transition shadow-2xs cursor-pointer"
                          title="ਸੋਧੋ (Edit Bags Entry)"
                        >
                          <Edit className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(entry)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-1 rounded-md transition cursor-pointer"
                          title="ਪ੍ਰਿੰਟ ਰਸੀਦ (Print Slip)"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBagsEntry(entry)}
                          className="bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-300 font-bold p-1 rounded-md transition cursor-pointer"
                          title="ਰਸੀਦ ਹਟਾਓ (Delete Slip)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
