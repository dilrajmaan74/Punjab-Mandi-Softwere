import React, { useState, useEffect, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DateInput } from '../common/DateInput';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  CalendarCheck2,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  PackageCheck,
  Printer,
  Scale,
  Calendar,
  AlertCircle,
  RefreshCw,
  Hammer,
  Scissors,
  Settings,
  X,
  Check,
  Search,
  MapPin,
  Phone,
  UserCheck,
  Hash
} from 'lucide-react';
import {
  FIXED_BAG_WEIGHT_KG,
  FIXED_RATE_PER_QTL,
  calculateBagsWeight,
  calculateGrandTotal,
  calculatePayableAmount,
  autoFormatDate,
  formatCurrency,
  formatKgToQulKg,
  createDefaultLabourDeductions,
  computeLabourAndDeductions
} from '../../utils/calculations';
import { BardanaType, LabourAndDeductions } from '../../types/mandi';
import { LabourDeductionsSection } from '../common/LabourDeductionsSection';

interface BatchRow {
  rowId: string;
  farmerId: string;
  newBags: number;
  oldBags: number;
  bags: number;
  totaKg: number;
  bardana: BardanaType;
  labourDeductions: LabourAndDeductions;
}

interface MultiFarmerDraft {
  batchDate: string;
  rows: BatchRow[];
}

export const SameDateMultiFarmerEntry: React.FC = () => {
  const { farmers, addBagsEntry, getNextParchiNo, setActiveReceipt, getBardanaSummary, settings, language } = useMandi();
  const isEn = language === 'en';
  const { notifySaveSuccess, notifyError } = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  const bardanaSummary = getBardanaSummary();
  const nextParchiNo = getNextParchiNo();

  const farmerOptions: SearchableSelectOption[] = useMemo(() => {
    return farmers.map((f) => ({
      value: f.id,
      label: isEn ? `${f.farmerName} (${f.id})` : `${f.farmerNamePa} (${f.farmerName})`,
      subLabel: `${isEn ? 'Village' : 'ਪਿੰਡ'}: ${isEn ? f.village : (f.villagePa || f.village)} • ${isEn ? 'Mobile' : 'ਮੋਬਾਈਲ'}: ${f.mobile}`,
      badge: f.id,
      keywords: [f.farmerName, f.farmerNamePa, f.village, f.villagePa, f.mobile, f.id, f.fatherName, f.fatherNamePa]
    }));
  }, [farmers, isEn]);

  // Modal for editing custom deductions of a specific row
  const [editingRowDeductionId, setEditingRowDeductionId] = useState<string | null>(null);

  // Batch-level default quick options
  const [batchPakkiEnabled, setBatchPakkiEnabled] = useState(false);
  const [batchDoubleEnabled, setBatchDoubleEnabled] = useState(false);
  const [batchSukhiEnabled, setBatchSukhiEnabled] = useState(false);

  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Universal Auto-Save Draft
  const { draft, saveDraft, clearDraft } = useFormDraft<MultiFarmerDraft>({
    formKey: 'draft_multi_farmer_entry',
    initialValues: {
      batchDate: getTodayFormatted(),
      rows: farmers.length > 0 ? [
        {
          rowId: 'row-1',
          farmerId: farmers[0].id,
          newBags: 0,
          oldBags: 0,
          bags: 0,
          totaKg: 0,
          bardana: 'NEW',
          labourDeductions: createDefaultLabourDeductions(settings)
        }
      ] : []
    }
  });

  const [batchDate, setBatchDate] = useState<string>(draft.batchDate || getTodayFormatted());

  // Rows state starts with draft or default
  const [rows, setRows] = useState<BatchRow[]>(() => {
    if (draft.rows && draft.rows.length > 0) {
      return draft.rows;
    }
    if (farmers.length > 0) {
      return [
        {
          rowId: 'row-1',
          farmerId: farmers[0].id,
          newBags: 0,
          oldBags: 0,
          bags: 0,
          totaKg: 0,
          bardana: 'NEW',
          labourDeductions: createDefaultLabourDeductions(settings)
        }
      ];
    }
    return [];
  });

  // Auto-save draft on every change
  useEffect(() => {
    saveDraft({
      batchDate,
      rows
    });
  }, [batchDate, rows, saveDraft]);

  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [successToast, setSuccessToast] = useState(false);
  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
  const [showFarmerSearchDropdown, setShowFarmerSearchDropdown] = useState(false);

  // Add new blank row or row with specific farmer
  const addFarmerToBatch = (farmerId: string) => {
    const newDeductions = createDefaultLabourDeductions(settings);
    newDeductions.pakkiLabourEnabled = batchPakkiEnabled;
    newDeductions.pakkaDoubleLabourEnabled = batchDoubleEnabled;
    newDeductions.sukhiLabourEnabled = batchSukhiEnabled;

    setRows((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${Math.random()}`,
        farmerId,
        newBags: 0,
        oldBags: 0,
        bags: 0,
        totaKg: 0,
        bardana: 'NEW',
        labourDeductions: newDeductions
      }
    ]);
    setFarmerSearchQuery('');
    setShowFarmerSearchDropdown(false);
  };

  // Add new blank row
  const addRow = () => {
    const nextFarmer = farmers[rows.length % (farmers.length || 1)] || farmers[0];
    addFarmerToBatch(nextFarmer?.id || '');
  };

  // Remove row
  const removeRow = (rowId: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  // Update row
  const updateRow = (rowId: string, field: keyof BatchRow, val: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId === rowId) {
          const updatedRow = { ...r, [field]: val };
          // Recompute row bags, bardana & deductions if newBags, oldBags, bags, or totaKg changes
          if (field === 'newBags' || field === 'oldBags' || field === 'bags' || field === 'totaKg') {
            const newB = Math.max(0, Number(field === 'newBags' ? val : r.newBags) || 0);
            const oldB = Math.max(0, Number(field === 'oldBags' ? val : r.oldBags) || 0);
            const totalB = newB + oldB;
            const tota = Math.max(0, Number(field === 'totaKg' ? val : r.totaKg) || 0);

            updatedRow.newBags = newB;
            updatedRow.oldBags = oldB;
            updatedRow.bags = totalB;
            updatedRow.bardana =
              newB > 0 && oldB > 0
                ? 'BOTH'
                : newB > 0
                ? 'NEW'
                : oldB > 0
                ? 'OLD'
                : 'NEW';

            const bagWeight = calculateBagsWeight(totalB);
            const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
            const gross = calculatePayableAmount(grandTotal.totalKg, FIXED_RATE_PER_QTL);
            updatedRow.labourDeductions = computeLabourAndDeductions(
              grandTotal.totalKg,
              gross,
              r.labourDeductions,
              settings
            );
          }
          return updatedRow;
        }
        return r;
      })
    );
  };

  // Quick toggle specific labour type for a single row
  const toggleRowLabourType = (
    rowId: string,
    type: 'pakki' | 'double' | 'sukhi'
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        const totalBags = Math.max(0, Number(r.bags) || 0);
        const tota = Math.max(0, Number(r.totaKg) || 0);
        const bagWeight = calculateBagsWeight(totalBags);
        const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
        const gross = calculatePayableAmount(grandTotal.totalKg, FIXED_RATE_PER_QTL);

        const current = { ...r.labourDeductions };
        if (type === 'pakki') current.pakkiLabourEnabled = !current.pakkiLabourEnabled;
        if (type === 'double') current.pakkaDoubleLabourEnabled = !current.pakkaDoubleLabourEnabled;
        if (type === 'sukhi') current.sukhiLabourEnabled = !current.sukhiLabourEnabled;

        return {
          ...r,
          labourDeductions: computeLabourAndDeductions(
            grandTotal.totalKg,
            gross,
            current,
            settings
          )
        };
      })
    );
  };

  // Apply batch presets to all rows
  const applyBatchLabourToAll = () => {
    setRows((prev) =>
      prev.map((r) => {
        const bags = Math.max(0, Number(r.bags) || 0);
        const tota = Math.max(0, Number(r.totaKg) || 0);
        const bagWeight = calculateBagsWeight(bags);
        const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
        const gross = calculatePayableAmount(grandTotal.totalKg, FIXED_RATE_PER_QTL);

        const current = {
          ...r.labourDeductions,
          pakkiLabourEnabled: batchPakkiEnabled,
          pakkaDoubleLabourEnabled: batchDoubleEnabled,
          sukhiLabourEnabled: batchSukhiEnabled
        };

        return {
          ...r,
          labourDeductions: computeLabourAndDeductions(grandTotal.totalKg, gross, current, settings)
        };
      })
    );
    notifySaveSuccess({
      titlePa: 'ਸਾਰੀਆਂ ਕਤਾਰਾਂ ਉੱਤੇ ਮਜ਼ਦੂਰੀ ਲਾਗੂ ਹੋ ਗਈ',
      titleEn: 'Batch Labour Applied',
      messagePa: `ਪੱਕੀ: ${batchPakkiEnabled ? 'ਹਾਂ' : 'ਨਹੀਂ'}, ਡਬਲ: ${batchDoubleEnabled ? 'ਹਾਂ' : 'ਨਹੀਂ'}, ਸੁੱਕੀ: ${batchSukhiEnabled ? 'ਹਾਂ' : 'ਨਹੀਂ'}`
    });
  };

  // Aggregates for the entire batch
  const totalNewBagsInBatch = rows.reduce((sum, r) => sum + (Number(r.newBags) || 0), 0);
  const totalOldBagsInBatch = rows.reduce((sum, r) => sum + (Number(r.oldBags) || 0), 0);
  const totalBagsInBatch = totalNewBagsInBatch + totalOldBagsInBatch;
  const totalBagsWeightKg = totalBagsInBatch * FIXED_BAG_WEIGHT_KG;
  const totalTotaKg = rows.reduce((sum, r) => sum + (Number(r.totaKg) || 0), 0);
  const totalCombinedKg = totalBagsWeightKg + totalTotaKg;
  const totalGrossAmount = calculatePayableAmount(totalCombinedKg, FIXED_RATE_PER_QTL);

  const totalDeductionsInBatch = rows.reduce((sum, r) => {
    const newB = Math.max(0, Number(r.newBags) || 0);
    const oldB = Math.max(0, Number(r.oldBags) || 0);
    const bags = newB + oldB;
    const tota = Math.max(0, Number(r.totaKg) || 0);
    if (bags === 0 && tota === 0) return sum;
    return sum + (r.labourDeductions?.grandTotalDeductions || 0);
  }, 0);

  const totalNetAmountInBatch = Math.max(0, totalGrossAmount - totalDeductionsInBatch);
  const grandTotalBreakdown = formatKgToQulKg(totalCombinedKg);

  // Save all rows
  const handleSaveBatch = () => {
    if (farmers.length === 0) {
      notifyError({
        titlePa: 'ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ',
        titleEn: 'No Farmers Registered',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ।'
      });
      return;
    }

    const validRows = rows.filter(
      (r) => (Number(r.newBags) || 0) + (Number(r.oldBags) || 0) > 0 || Number(r.totaKg) > 0
    );
    if (validRows.length === 0) {
      notifyError({
        titlePa: 'ਬੋਰੀਆਂ ਜਾਂ ਟੋਟਾ ਦਰਜ ਕਰੋ',
        titleEn: 'No Bags or Tota Entered',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਕਤਾਰ ਵਿੱਚ ਬੋਰੀਆਂ (ਨਵਾਂ/ਪੁਰਾਣਾ) ਜਾਂ ਟੋਟਾ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    setIsSaving(true);

    const savedList: any[] = [];

    for (const r of rows) {
      const farmer = farmers.find((f) => f.id === r.farmerId);
      if (!farmer) continue;

      const newB = Math.max(0, Number(r.newBags) || 0);
      const oldB = Math.max(0, Number(r.oldBags) || 0);
      const bagsCount = newB + oldB;
      const tota = Math.max(0, Number(r.totaKg) || 0);
      if (bagsCount === 0 && tota === 0) continue;

      const bardanaType: BardanaType =
        newB > 0 && oldB > 0
          ? 'BOTH'
          : newB > 0
          ? 'NEW'
          : oldB > 0
          ? 'OLD'
          : 'NEW';

      const bagWeight = calculateBagsWeight(bagsCount);
      const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
      const grossAmount = calculatePayableAmount(grandTotal.totalKg, FIXED_RATE_PER_QTL);

      const hasActive =
        r.labourDeductions.pakkiLabourEnabled ||
        r.labourDeductions.pakkaDoubleLabourEnabled ||
        r.labourDeductions.sukhiLabourEnabled ||
        (r.labourDeductions.customDeductions && r.labourDeductions.customDeductions.length > 0);

      const netAmt = hasActive ? r.labourDeductions.netPayableAmount : grossAmount;

      const entry = addBagsEntry({
        date: batchDate || getTodayFormatted(),
        farmerId: farmer.id,
        farmerName: farmer.farmerName,
        farmerNamePa: farmer.farmerNamePa,
        farmerFatherName: farmer.fatherName,
        farmerVillage: farmer.village,
        farmerVillagePa: farmer.villagePa,
        farmerMobile: farmer.mobile,
        farmerAadhaar: farmer.aadhaar,
        farmerPhotoUrl: farmer.photoUrl,
        newBags: newB,
        oldBags: oldB,
        bags: bagsCount,
        weightPerBagKg: FIXED_BAG_WEIGHT_KG,
        totalBagsWeightKg: bagWeight.totalKg,
        totalBagsWeightDisplay: bagWeight.displayEn,
        totaKg: tota,
        grandTotalKg: grandTotal.totalKg,
        grandTotalDisplay: grandTotal.displayEn,
        bardana: bardanaType,
        ratePerQtl: FIXED_RATE_PER_QTL,
        totalAmount: grossAmount,
        labourDeductions: hasActive ? r.labourDeductions : undefined,
        netAmount: netAmt
      });

      savedList.push(entry);
    }

    const deductionSummary =
      totalDeductionsInBatch > 0
        ? ` • ਕੁੱਲ ਕਟੌਤੀਆਂ: -${formatCurrency(totalDeductionsInBatch)} • ਸ਼ੁੱਧ ਅਦਾਇਗੀ: ${formatCurrency(totalNetAmountInBatch)}`
        : '';

    notifySaveSuccess({
      titlePa: 'ਬੈਚ ਐਂਟਰੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈਆਂ!',
      titleEn: 'Batch Entries Saved Successfully',
      messagePa: `${savedList.length} ਕਿਸਾਨਾਂ ਲਈ ਕੁੱਲ ${totalBagsInBatch} ਬੋਰੀਆਂ (${totalNewBagsInBatch} ਨਵਾਂ + ${totalOldBagsInBatch} ਪੁਰਾਣਾ) ਸੇਵ ਹੋ ਗਈਆਂ ਹਨ।`,
      details: `ਮਿਤੀ: ${batchDate} • ਪਰਚੀ ਨੰਬਰਾਂ: #${savedList[0]?.parchiNo || nextParchiNo} ਤੋਂ #${savedList[savedList.length - 1]?.parchiNo || (nextParchiNo + savedList.length - 1)} • ਕੁੱਲ ਗ੍ਰਾਸ: ${formatCurrency(totalGrossAmount)}${deductionSummary}`
    });

    // Clear universal auto-save draft upon successful batch save
    clearDraft();

    setSavedRecords(savedList);
    setIsSaving(false);
  };

  const editingRow = rows.find((r) => r.rowId === editingRowDeductionId);
  const editingRowFarmer = editingRow ? farmers.find((f) => f.id === editingRow.farmerId) : null;
  const editingRowBags = editingRow ? Math.max(0, Number(editingRow.bags) || 0) : 0;
  const editingRowTota = editingRow ? Math.max(0, Number(editingRow.totaKg) || 0) : 0;
  const editingRowBagWeight = calculateBagsWeight(editingRowBags);
  const editingRowGrandTotal = calculateGrandTotal(editingRowBagWeight.totalKg, editingRowTota);
  const editingRowGross = calculatePayableAmount(editingRowGrandTotal.totalKg, FIXED_RATE_PER_QTL);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                {isEn ? 'Same Date Multi Farmer Entry' : 'ਇੱਕੋ ਮਿਤੀ ਮਲਟੀ ਕਿਸਾਨ ਐਂਟਰੀ (Same Date Multi Farmer Entry)'}
              </h2>
              {/* Parchi Sequence Badge */}
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 font-mono font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                <Hash className="w-3 h-3 text-amber-700" />
                <span>{isEn ? `Next Slip: #${nextParchiNo}` : `ਅਗਲੀ ਪਰਚੀ: #${nextParchiNo}`}</span>
              </span>
              {/* Separate Date Badge */}
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full">
                <Calendar className="w-3 h-3 text-indigo-600" />
                <span>{isEn ? `Date: ${batchDate}` : `ਮਿਤੀ: ${batchDate}`}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isEn
                ? 'Rapidly enter bags, separate tota, and deductions for multiple farmers under the same date'
                : 'ਇੱਕੋ ਮਿਤੀ ਤਹਿਤ ਲਗਾਤਾਰ ਮਲਟੀਪਲ ਕਿਸਾਨਾਂ ਦੀਆਂ ਬੋਰੀਆਂ, ਟੋਟਾ ਅਤੇ ਮਜ਼ਦੂਰੀ ਕਟੌਤੀਆਂ ਦਰਜ ਕਰੋ'}
            </p>
          </div>
        </div>

        {/* Date Master Selector & Stock chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-500 font-bold">{isEn ? 'Stock:' : 'ਸਟਾਕ:'}</span>
            <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-black text-[10px]">
              {isEn ? 'New:' : 'ਨਵਾਂ:'} {bardanaSummary.newBagsRemaining.toLocaleString('en-IN')}
            </span>
            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-black text-[10px]">
              {isEn ? 'Old:' : 'ਪੁਰਾਣਾ:'} {bardanaSummary.oldBagsRemaining.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="w-44">
            <DateInput
              value={batchDate}
              onChange={setBatchDate}
              label={isEn ? "Batch Date" : "ਮਿਤੀ (Batch Date)"}
              required
            />
          </div>
        </div>
      </div>

      {/* Batch Labour Options Preset Toolbar */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
            <Hammer className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-amber-950 block text-xs">
              {isEn ? 'Batch Labour Options:' : 'ਬੈਚ ਮਜ਼ਦੂਰੀ ਪ੍ਰੀਸੈਟ (Batch Labour Options):'}
            </strong>
            <span className="text-[11px] text-amber-800">
              {isEn
                ? 'Apply labour deductions across all rows with one click (optional)'
                : "ਇੱਕੋ ਕਲਿੱਕ ਨਾਲ ਸਾਰੀਆਂ ਕਤਾਰਾਂ 'ਤੇ ਮਜ਼ਦੂਰੀ ਲਾਗੂ ਕਰੋ (ਸਾਰੀਆਂ ਚੋਣਾਂ ਵਿਕਲਪਿਕ ਹਨ)"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pakki ₹7 */}
          <label className="flex items-center gap-1.5 bg-white border border-amber-300 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-amber-100/50 transition">
            <input
              type="checkbox"
              checked={batchPakkiEnabled}
              onChange={(e) => setBatchPakkiEnabled(e.target.checked)}
              className="w-3.5 h-3.5 text-amber-600 rounded"
            />
            <span className="font-bold text-slate-800 text-[11px]">
              {isEn ? 'Pakki Labour (₹7/Qtl)' : 'ਪੱਕੀ ਮਜ਼ਦੂਰੀ (₹7/Qtl)'}
            </span>
          </label>

          {/* Double ₹14 */}
          <label className="flex items-center gap-1.5 bg-white border border-amber-300 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-amber-100/50 transition">
            <input
              type="checkbox"
              checked={batchDoubleEnabled}
              onChange={(e) => setBatchDoubleEnabled(e.target.checked)}
              className="w-3.5 h-3.5 text-amber-600 rounded"
            />
            <span className="font-bold text-slate-800 text-[11px]">
              {isEn ? 'Pakki Double (₹14/Qtl)' : 'ਪੱਕੀ ਡਬਲ (₹14/Qtl)'}
            </span>
          </label>

          {/* Sukhi ₹5 */}
          <label className="flex items-center gap-1.5 bg-white border border-amber-300 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-amber-100/50 transition">
            <input
              type="checkbox"
              checked={batchSukhiEnabled}
              onChange={(e) => setBatchSukhiEnabled(e.target.checked)}
              className="w-3.5 h-3.5 text-amber-600 rounded"
            />
            <span className="font-bold text-slate-800 text-[11px]">
              {isEn ? 'Sukhi Labour (₹5/Qtl)' : 'ਸੁੱਕੀ ਮਜ਼ਦੂਰੀ (₹5/Qtl)'}
            </span>
          </label>

          <button
            type="button"
            onClick={applyBatchLabourToAll}
            className="bg-amber-600 hover:bg-amber-500 text-white font-black px-3 py-1 rounded-lg text-[11px] shadow-2xs flex items-center gap-1 transition"
          >
            <Check className="w-3 h-3" />
            <span>{isEn ? 'Apply to All' : "ਸਭ 'ਤੇ ਲਾਗੂ ਕਰੋ (Apply All)"}</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-50 text-emerald-900 font-bold p-3 rounded-lg border border-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              {isEn
                ? `All ${savedRecords.length} farmer entries saved successfully!`
                : `ਸਾਰੀਆਂ ${savedRecords.length} ਕਿਸਾਨ ਐਂਟਰੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈਆਂ ਹਨ!`}
            </span>
          </div>
          <span className="font-mono text-emerald-800 text-[11px]">
            {isEn ? 'Date:' : 'ਮਿਤੀ:'} {batchDate}
          </span>
        </div>
      )}

      {farmers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-xs font-bold text-slate-700">
            {isEn ? 'No Farmers Registered' : 'ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ'}
          </h3>
          <p className="text-[11px] text-slate-500">
            {isEn ? 'Please register farmers first.' : 'ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ।'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top Farmer Search Bar */}
          <div className="bg-white border border-indigo-200 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? 'Search Farmer to Add to Batch' : 'ਕਿਸਾਨ ਖੋਜੋ ਤੇ ਸ਼ਾਮਲ ਕਰੋ (Search Farmer to Add to Batch)'}</span>
              </label>
              <span className="text-[10px] text-slate-500">
                {isEn ? 'Search by name, father, village, mobile, or ID' : 'ਨਾਂ, ਪਿਤਾ ਦਾ ਨਾਂ, ਪਿੰਡ, ਪਤਾ, ਮੋਬਾਈਲ ਜਾਂ ID ਨਾਲ ਖੋਜੋ'}
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={isEn ? "Search farmer name, father, village, address, mobile, or ID..." : "ਕਿਸਾਨ ਦਾ ਨਾਂ (English/ਪੰਜਾਬੀ), ਪਿਤਾ ਦਾ ਨਾਂ, ਪਿੰਡ, ਪੂਰਾ ਪਤਾ, ਮੋਬਾਈਲ ਜਾਂ ID ਨਾਲ ਖੋਜੋ..."}
                value={farmerSearchQuery}
                onChange={(e) => {
                  setFarmerSearchQuery(e.target.value);
                  setShowFarmerSearchDropdown(true);
                }}
                onFocus={() => setShowFarmerSearchDropdown(true)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {farmerSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setFarmerSearchQuery('');
                    setShowFarmerSearchDropdown(false);
                  }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Matching Search Results Dropdown */}
            {showFarmerSearchDropdown && farmerSearchQuery.trim() && (
              <div className="max-h-60 overflow-y-auto border border-indigo-200 rounded-xl bg-white divide-y divide-slate-100 shadow-lg">
                {farmers
                  .filter((f) => {
                    const q = farmerSearchQuery.toLowerCase().trim();
                    const cleanNums = q.replace(/[^0-9]/g, '');
                    return (
                      f.farmerName.toLowerCase().includes(q) ||
                      (f.farmerNamePa && f.farmerNamePa.toLowerCase().includes(q)) ||
                      (f.fatherName && f.fatherName.toLowerCase().includes(q)) ||
                      (f.fatherNamePa && f.fatherNamePa.toLowerCase().includes(q)) ||
                      f.village.toLowerCase().includes(q) ||
                      (f.villagePa && f.villagePa.toLowerCase().includes(q)) ||
                      (f.address && f.address.toLowerCase().includes(q)) ||
                      f.id.toLowerCase().includes(q) ||
                      (cleanNums && f.mobile && f.mobile.replace(/[^0-9]/g, '').includes(cleanNums))
                    );
                  })
                  .map((f) => (
                    <div
                      key={f.id}
                      className="p-2.5 hover:bg-indigo-50/70 flex items-start justify-between gap-3 transition cursor-pointer"
                      onClick={() => addFarmerToBatch(f.id)}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {f.id}
                          </span>
                          <span>{f.farmerName}</span>
                          <span className="text-slate-500 font-semibold">s/o {f.fatherName}</span>
                          <span className="text-indigo-800 font-bold">• Village: {f.village}</span>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-900">
                          {f.farmerNamePa} ਸ/ਓ {f.fatherNamePa || f.fatherName} • ਪਿੰਡ: {f.villagePa || f.village}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          <strong>ਪੂਰਾ ਪਤਾ (Full Address):</strong> {f.address ? `${f.address}, ` : ''}ਪਿੰਡ {f.village}, PIN: {f.pinCode} | ਮੋਬਾਈਲ: {f.mobile}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addFarmerToBatch(f.id);
                        }}
                        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ਸ਼ਾਮਲ ਕਰੋ (+ Add)</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Table of Batch Rows */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3 min-w-[260px]">
                      {isEn ? 'Farmer (Name, Village, Address)' : 'ਕਿਸਾਨ ਦੀ ਚੋਣ (Farmer: Name, Father, Village, Address)'}
                    </th>
                    <th className="py-2.5 px-2 w-24 text-center bg-emerald-50 text-emerald-950">
                      {isEn ? 'New Juths' : 'ਨਵਾਂ ਬਾਰਦਾਨਾ'}
                    </th>
                    <th className="py-2.5 px-2 w-24 text-center bg-amber-50 text-amber-950">
                      {isEn ? 'Old Juths' : 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ'}
                    </th>
                    <th className="py-2.5 px-2 w-20 text-center font-black">
                      {isEn ? 'Total Bags' : 'ਕੁੱਲ ਬੋਰੀਆਂ'}
                    </th>
                    <th className="py-2.5 px-2 w-20 text-center">
                      {isEn ? 'Tota (Kg)' : 'ਟੋਟਾ (Kg)'}
                    </th>
                    <th className="py-2.5 px-3 text-right font-black">
                      {isEn ? 'Total Wt' : 'ਕੁੱਲ ਵਜ਼ਨ'}
                    </th>
                    <th className="py-2.5 px-3 min-w-[160px] text-center">
                      {isEn ? 'Labour Deductions' : 'ਮਜ਼ਦੂਰੀ ਕਟੌਤੀਆਂ (Labour)'}
                    </th>
                    <th className="py-2.5 px-3 text-right">
                      {isEn ? 'Gross (₹)' : 'ਗ੍ਰਾਸ (₹)'}
                    </th>
                    <th className="py-2.5 px-3 text-right text-rose-700">
                      {isEn ? 'Deductions (₹)' : 'ਕਟੌਤੀ (₹)'}
                    </th>
                    <th className="py-2.5 px-3 text-right text-emerald-950 font-black">
                      {isEn ? 'Net Amount (₹)' : 'ਸ਼ੁੱਧ ਰਕਮ (₹)'}
                    </th>
                    <th className="py-2.5 px-3 text-center w-10">
                      {isEn ? 'Del' : 'ਹਟਾਓ'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rows.map((row, index) => {
                    const selectedF = farmers.find((f) => f.id === row.farmerId);
                    const newB = Math.max(0, Number(row.newBags) || 0);
                    const oldB = Math.max(0, Number(row.oldBags) || 0);
                    const bags = newB + oldB;
                    const tota = Math.max(0, Number(row.totaKg) || 0);
                    const rowBagsWeight = calculateBagsWeight(bags);
                    const rowGrandTotal = calculateGrandTotal(rowBagsWeight.totalKg, tota);
                    const rowGrossAmount = calculatePayableAmount(rowGrandTotal.totalKg, FIXED_RATE_PER_QTL);
                    const rowDeductions = row.labourDeductions?.grandTotalDeductions || 0;
                    const rowNetAmount = Math.max(0, rowGrossAmount - rowDeductions);

                    const isPakki = !!row.labourDeductions?.pakkiLabourEnabled;
                    const isDouble = !!row.labourDeductions?.pakkaDoubleLabourEnabled;
                    const isSukhi = !!row.labourDeductions?.sukhiLabourEnabled;
                    const hasCustom = (row.labourDeductions?.customDeductions?.length || 0) > 0;

                    return (
                      <tr key={row.rowId} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono text-center">
                          <span className="font-bold text-slate-700 text-xs">#{index + 1}</span>
                          <span className="block mt-1 font-black text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                            {isEn ? `Slip #${nextParchiNo + index}` : `ਪਰਚੀ #${nextParchiNo + index}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 min-w-[280px]">
                          <SearchableSelect
                            id={`row-farmer-${row.rowId}`}
                            value={row.farmerId}
                            onChange={(val) => updateRow(row.rowId, 'farmerId', val)}
                            options={farmerOptions}
                            placeholder={isEn ? "Select farmer..." : "ਕਿਸਾਨ ਚੁਣੋ..."}
                            searchPlaceholder={isEn ? "Search farmer..." : "ਕਿਸਾਨ ਖੋਜੋ..."}
                            emptyMessage={isEn ? "No farmer found" : "ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ"}
                          />
                          {selectedF && (
                            <div className="mt-1 text-[10px] text-slate-700 bg-slate-100/90 p-1.5 rounded-md border border-slate-200 space-y-0.5">
                              <div className="font-bold text-slate-900 flex items-center justify-between">
                                <span>{selectedF.farmerName} s/o {selectedF.fatherName} • {selectedF.village}</span>
                                <span className="font-mono text-[9px] text-slate-500">{selectedF.id}</span>
                              </div>
                              {!isEn && (
                                <div className="text-emerald-800 font-semibold">
                                  {selectedF.farmerNamePa} ਸ/ਓ {selectedF.fatherNamePa || selectedF.fatherName}
                                </div>
                              )}
                              <div className="text-[9px] text-slate-600 truncate" title={selectedF.address}>
                                {isEn ? 'Address:' : 'ਪਤਾ:'} {selectedF.address || 'N/A'}, PIN: {selectedF.pinCode} | {isEn ? 'Mobile:' : 'ਮੋਬਾਈਲ:'} {selectedF.mobile}
                              </div>
                            </div>
                          )}
                        </td>
                        {/* 1. New Juths Input (Larger) */}
                        <td className="py-2.5 px-2 bg-emerald-50/30">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={row.newBags || ''}
                            onChange={(e) => updateRow(row.rowId, 'newBags', parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-white border-2 border-emerald-300 rounded-lg py-2 px-1 text-base font-mono font-black text-emerald-950 focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        {/* 2. Old Juths Input (Larger) */}
                        <td className="py-2.5 px-2 bg-amber-50/30">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={row.oldBags || ''}
                            onChange={(e) => updateRow(row.rowId, 'oldBags', parseInt(e.target.value, 10) || 0)}
                            className="w-full text-center bg-white border-2 border-amber-300 rounded-lg py-2 px-1 text-base font-mono font-black text-amber-950 focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        {/* 3. Auto-calculated Total Bags */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg block">
                            {bags}
                          </span>
                        </td>
                        {/* 4. Tota (Kg) (Larger) */}
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={row.totaKg || ''}
                            onChange={(e) => updateRow(row.rowId, 'totaKg', parseFloat(e.target.value) || 0)}
                            className="w-full text-center bg-white border-2 border-slate-300 rounded-lg py-2 px-1 text-base font-mono font-black text-amber-950 focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-emerald-950 whitespace-nowrap">
                          {rowGrandTotal.displayEn}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1">
                            {/* Pakki Button */}
                            <button
                              type="button"
                              onClick={() => toggleRowLabourType(row.rowId, 'pakki')}
                              title="ਪੱਕੀ ਮਜ਼ਦੂਰੀ (@ ₹7/Qtl)"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                isPakki
                                  ? 'bg-amber-500 border-amber-600 text-slate-950'
                                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              ਪੱਕੀ ₹7
                            </button>

                            {/* Double Button */}
                            <button
                              type="button"
                              onClick={() => toggleRowLabourType(row.rowId, 'double')}
                              title="ਪੱਕੀ ਡਬਲ ਮਜ਼ਦੂਰੀ (@ ₹14/Qtl)"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                isDouble
                                  ? 'bg-amber-600 border-amber-700 text-white'
                                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              ਡਬਲ ₹14
                            </button>

                            {/* Sukhi Button */}
                            <button
                              type="button"
                              onClick={() => toggleRowLabourType(row.rowId, 'sukhi')}
                              title="ਸੁੱਕੀ ਮਜ਼ਦੂਰੀ (@ ₹5/Qtl)"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                isSukhi
                                  ? 'bg-orange-500 border-orange-600 text-white'
                                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              ਸੁੱਕੀ ₹5
                            </button>

                            {/* Customize Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => setEditingRowDeductionId(row.rowId)}
                              title="ਹੋਰ ਕਟੌਤੀਆਂ ਵੇਖੋ/ਸੋਧੋ (Customize / More Deductions)"
                              className={`p-1 rounded text-[10px] font-bold border transition ${
                                hasCustom
                                  ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <Settings className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-slate-700">
                          {formatCurrency(rowGrossAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-700 font-bold">
                          {rowDeductions > 0 ? `-${formatCurrency(rowDeductions)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-xs text-emerald-900">
                          {formatCurrency(rowNetAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => removeRow(row.rowId)}
                            disabled={rows.length === 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions and Batch Totals Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={addRow}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isEn ? '+ Add Row' : '+ ਹੋਰ ਕਤਾਰ ਜੋੜੋ (Add Another Row)'}</span>
              </button>

              {/* Batch Totals */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
                <div className="bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                  <span className="text-emerald-800 font-sans text-[10px] block font-bold">{isEn ? 'Total New Juths:' : 'ਕੁੱਲ ਨਵਾਂ:'}</span>
                  <strong className="text-emerald-950 font-black text-xs">{totalNewBagsInBatch} Juths</strong>
                </div>
                <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  <span className="text-amber-800 font-sans text-[10px] block font-bold">{isEn ? 'Total Old Juths:' : 'ਕੁੱਲ ਪੁਰਾਣਾ:'}</span>
                  <strong className="text-amber-950 font-black text-xs">{totalOldBagsInBatch} Juths</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans text-[11px] block">{isEn ? 'Total Bags:' : 'ਕੁੱਲ ਬੋਰੀਆਂ:'}</span>
                  <strong className="text-slate-900 font-bold text-sm">{totalBagsInBatch}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans text-[11px] block">{isEn ? 'Total Tota:' : 'ਕੁੱਲ ਟੋਟਾ:'}</span>
                  <strong className="text-amber-800 font-bold text-sm">{totalTotaKg} Kg</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans text-[11px] block">{isEn ? 'Grand Total Wt:' : 'ਗ੍ਰੈਂਡ ਟੋਟਲ ਵਜ਼ਨ:'}</span>
                  <strong className="text-emerald-900 font-black text-sm">{grandTotalBreakdown.displayEn}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans text-[11px] block">{isEn ? 'Gross Value:' : 'ਕੁੱਲ ਗ੍ਰਾਸ ਰਕਮ:'}</span>
                  <strong className="text-slate-800 font-bold text-sm">{formatCurrency(totalGrossAmount)}</strong>
                </div>
                {totalDeductionsInBatch > 0 && (
                  <div>
                    <span className="text-rose-600 font-sans text-[11px] block">{isEn ? 'Total Deductions:' : 'ਕੁੱਲ ਮਜ਼ਦੂਰੀ ਕਟੌਤੀ:'}</span>
                    <strong className="text-rose-700 font-bold text-sm">-{formatCurrency(totalDeductionsInBatch)}</strong>
                  </div>
                )}
                <div>
                  <span className="text-emerald-700 font-sans text-[11px] font-bold block">{isEn ? 'Net Total Payable:' : 'ਸ਼ੁੱਧ ਕੁੱਲ ਅਦਾਇਗੀ:'}</span>
                  <strong className="text-emerald-950 font-black text-base">{formatCurrency(totalNetAmountInBatch)}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleSaveBatch}
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold px-5 py-2 rounded-lg text-xs shadow-2xs flex items-center gap-1.5 transition active:scale-95 ml-2 font-sans cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Saving Batch...' : 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ... (Saving Batch...)'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Save All Entries' : 'ਸਾਰੀਆਂ ਐਂਟਰੀਆਂ ਸੇਵ ਕਰੋ (Save All Batch)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row Deductions Customization Modal */}
      {editingRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-lg">
                  <Hammer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {isEn ? 'Edit Row Deductions' : 'ਕਿਸਾਨ ਮਜ਼ਦੂਰੀ ਤੇ ਕਟੌਤੀਆਂ ਸੋਧੋ (Row Deductions)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? editingRowFarmer?.farmerName : `${editingRowFarmer?.farmerNamePa} (${editingRowFarmer?.id})`} • {isEn ? 'Total Weight:' : 'ਕੁੱਲ ਵਜ਼ਨ:'} {editingRowGrandTotal.displayEn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRowDeductionId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <LabourDeductionsSection
                weightKg={editingRowGrandTotal.totalKg}
                grossAmount={editingRowGross}
                value={editingRow.labourDeductions}
                onChange={(updated) => updateRow(editingRow.rowId, 'labourDeductions', updated)}
                settings={settings}
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setEditingRowDeductionId(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs"
              >
                {isEn ? 'Done' : 'ਠੀਕ ਹੈ / ਪੂਰਾ ਹੋਇਆ (Done)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
