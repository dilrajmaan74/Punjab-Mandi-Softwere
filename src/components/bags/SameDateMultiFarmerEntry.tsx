import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Hash,
  Send,
  Keyboard,
  ArrowRight,
  ArrowDown,
  Layers,
  Wheat,
  SlidersHorizontal,
  ExternalLink
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
import { BardanaType, LabourAndDeductions, BagsEntryRecord } from '../../types/mandi';
import { LabourDeductionsSection } from '../common/LabourDeductionsSection';
import { BatchPrintAndWhatsAppModal } from './BatchPrintAndWhatsAppModal';

interface BatchRow {
  rowId: string;
  farmerId: string;
  newBags: number;
  oldBags: number;
  bags: number;
  totaKg: number;
  ratePerQtl?: number;
  bardana: BardanaType;
  labourDeductions: LabourAndDeductions;
}

interface MultiFarmerDraft {
  batchDate: string;
  masterRate: number;
  rows: BatchRow[];
}

export const SameDateMultiFarmerEntry: React.FC = () => {
  const {
    farmers,
    addBagsEntry,
    getNextParchiNo,
    setActiveReceipt,
    getBardanaSummary,
    getCompleteFarmerAccount,
    activeFirm,
    activeCrop,
    activeCropConfig,
    settings,
    language
  } = useMandi();

  const isEn = language === 'en';
  const { notifySaveSuccess, notifyError } = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  const effectiveBagWeight = activeCropConfig?.defaultBagWeightKg || FIXED_BAG_WEIGHT_KG;
  const defaultRate = activeCropConfig?.defaultRatePerQtl || FIXED_RATE_PER_QTL;

  const bardanaSummary = getBardanaSummary();
  const nextParchiNo = getNextParchiNo();

  // Batch Print & Bulk WhatsApp Modal State
  const [isBatchActionModalOpen, setIsBatchActionModalOpen] = useState(false);
  const [savedBatchRecords, setSavedBatchRecords] = useState<BagsEntryRecord[]>([]);

  // Master Batch Rate
  const [masterRate, setMasterRate] = useState<number>(defaultRate);

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
      masterRate: defaultRate,
      rows: farmers.length > 0 ? [
        {
          rowId: 'row-1',
          farmerId: farmers[0].id,
          newBags: 0,
          oldBags: 0,
          bags: 0,
          totaKg: 0,
          ratePerQtl: defaultRate,
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
          ratePerQtl: defaultRate,
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
      masterRate,
      rows
    });
  }, [batchDate, masterRate, rows, saveDraft]);

  const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
  const [showFarmerSearchDropdown, setShowFarmerSearchDropdown] = useState(false);

  // Calculate duplicate farmer occurrences in current batch
  const farmerCounts = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.farmerId) {
        map[r.farmerId] = (map[r.farmerId] || 0) + 1;
      }
    });
    return map;
  }, [rows]);

  // Add new blank row or row with specific farmer
  const addFarmerToBatch = (farmerId: string) => {
    const newDeductions = createDefaultLabourDeductions(settings);
    newDeductions.pakkiLabourEnabled = batchPakkiEnabled;
    newDeductions.pakkaDoubleLabourEnabled = batchDoubleEnabled;
    newDeductions.sukhiLabourEnabled = batchSukhiEnabled;

    const newRowId = `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setRows((prev) => [
      ...prev,
      {
        rowId: newRowId,
        farmerId,
        newBags: 0,
        oldBags: 0,
        bags: 0,
        totaKg: 0,
        ratePerQtl: masterRate,
        bardana: 'NEW',
        labourDeductions: newDeductions
      }
    ]);
    setFarmerSearchQuery('');
    setShowFarmerSearchDropdown(false);

    // Auto focus newly added row's new bags field
    setTimeout(() => {
      const el = document.getElementById(`input-newBags-${newRowId}`);
      el?.focus();
    }, 80);
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
          // Recompute row bags, bardana & deductions if newBags, oldBags, bags, totaKg or ratePerQtl changes
          if (
            field === 'newBags' ||
            field === 'oldBags' ||
            field === 'bags' ||
            field === 'totaKg' ||
            field === 'ratePerQtl'
          ) {
            const newB = Math.max(0, Number(field === 'newBags' ? val : r.newBags) || 0);
            const oldB = Math.max(0, Number(field === 'oldBags' ? val : r.oldBags) || 0);
            const totalB = newB + oldB;
            const tota = Math.max(0, Number(field === 'totaKg' ? val : r.totaKg) || 0);
            const rowRate = Number(field === 'ratePerQtl' ? val : r.ratePerQtl || masterRate) || masterRate;

            updatedRow.newBags = newB;
            updatedRow.oldBags = oldB;
            updatedRow.bags = totalB;
            updatedRow.ratePerQtl = rowRate;
            updatedRow.bardana =
              newB > 0 && oldB > 0
                ? 'BOTH'
                : newB > 0
                ? 'NEW'
                : oldB > 0
                ? 'OLD'
                : 'NEW';

            const bagWeight = calculateBagsWeight(totalB, effectiveBagWeight);
            const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
            const gross = calculatePayableAmount(grandTotal.totalKg, rowRate);
            updatedRow.labourDeductions = computeLabourAndDeductions(
              grandTotal.totalKg,
              gross,
              r.labourDeductions,
              settings,
              totalB
            );
          }
          return updatedRow;
        }
        return r;
      })
    );
  };

  // -------------------------------------------------------------
  // FEATURE 1: Excel-Like Keyboard Navigation & Auto Row Creation
  // -------------------------------------------------------------
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowId: string,
    field: 'newBags' | 'oldBags' | 'totaKg',
    rowIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (field === 'newBags') {
        e.preventDefault();
        document.getElementById(`input-oldBags-${rowId}`)?.focus();
      } else if (field === 'oldBags') {
        e.preventDefault();
        document.getElementById(`input-totaKg-${rowId}`)?.focus();
      } else if (field === 'totaKg') {
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          // Move to next row's new bags
          const nextRow = rows[rowIndex + 1];
          document.getElementById(`input-newBags-${nextRow.rowId}`)?.focus();
        } else {
          // Last row: automatically create a new row and focus it!
          addRow();
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < rows.length - 1) {
        e.preventDefault();
        const nextRow = rows[rowIndex + 1];
        document.getElementById(`input-${field}-${nextRow.rowId}`)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      if (rowIndex > 0) {
        e.preventDefault();
        const prevRow = rows[rowIndex - 1];
        document.getElementById(`input-${field}-${prevRow.rowId}`)?.focus();
      }
    }
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
        const rowRate = r.ratePerQtl || masterRate;
        const bagWeight = calculateBagsWeight(totalBags, effectiveBagWeight);
        const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
        const gross = calculatePayableAmount(grandTotal.totalKg, rowRate);

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
            settings,
            totalBags
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
        const rowRate = r.ratePerQtl || masterRate;
        const bagWeight = calculateBagsWeight(bags, effectiveBagWeight);
        const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
        const gross = calculatePayableAmount(grandTotal.totalKg, rowRate);

        const current = {
          ...r.labourDeductions,
          pakkiLabourEnabled: batchPakkiEnabled,
          pakkaDoubleLabourEnabled: batchDoubleEnabled,
          sukhiLabourEnabled: batchSukhiEnabled
        };

        return {
          ...r,
          labourDeductions: computeLabourAndDeductions(grandTotal.totalKg, gross, current, settings, bags)
        };
      })
    );
    notifySaveSuccess({
      titlePa: 'ਸਾਰੀਆਂ ਕਤਾਰਾਂ ਉੱਤੇ ਮਜ਼ਦੂਰੀ ਲਾਗੂ ਹੋ ਗਈ',
      titleEn: 'Batch Labour Applied',
      messagePa: `ਪੱਕੀ: ${batchPakkiEnabled ? 'ਹਾਂ' : 'ਨਹੀਂ'}, ਡਬਲ: ${batchDoubleEnabled ? 'ਹਾਂ' : 'ਨਹੀਂ'}, ਸੁੱਕੀ: ${batchSukhiEnabled ? 'ਹਾਂ' : 'ਨਹੀਂ'}`
    });
  };

  // Apply Master Rate to all rows
  const applyMasterRateToAll = () => {
    setRows((prev) =>
      prev.map((r) => {
        const bags = Math.max(0, Number(r.bags) || 0);
        const tota = Math.max(0, Number(r.totaKg) || 0);
        const bagWeight = calculateBagsWeight(bags, effectiveBagWeight);
        const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
        const gross = calculatePayableAmount(grandTotal.totalKg, masterRate);

        return {
          ...r,
          ratePerQtl: masterRate,
          labourDeductions: computeLabourAndDeductions(grandTotal.totalKg, gross, r.labourDeductions, settings, bags)
        };
      })
    );
    notifySaveSuccess({
      titlePa: `ਮਾਸਟਰ ਰੇਟ ₹${masterRate} ਸਾਰੀਆਂ ਕਤਾਰਾਂ 'ਤੇ ਲਾਗੂ`,
      titleEn: `Master Rate Applied`,
      messagePa: `ਸਾਰੀਆਂ ਐਂਟਰੀਆਂ ਹੁਣ ₹${masterRate}/ਕੁਇੰਟਲ ਅਨੁਸਾਰ ਗਿਣੀਆਂ ਜਾਣਗੀਆਂ।`
    });
  };

  // Aggregates for the entire batch
  const totalNewBagsInBatch = rows.reduce((sum, r) => sum + (Number(r.newBags) || 0), 0);
  const totalOldBagsInBatch = rows.reduce((sum, r) => sum + (Number(r.oldBags) || 0), 0);
  const totalBagsInBatch = totalNewBagsInBatch + totalOldBagsInBatch;
  const totalBagsWeightKg = totalBagsInBatch * effectiveBagWeight;
  const totalTotaKg = rows.reduce((sum, r) => sum + (Number(r.totaKg) || 0), 0);
  const totalCombinedKg = totalBagsWeightKg + totalTotaKg;

  const totalGrossAmount = rows.reduce((sum, r) => {
    const bags = (Number(r.newBags) || 0) + (Number(r.oldBags) || 0);
    const tota = Number(r.totaKg) || 0;
    const rate = r.ratePerQtl || masterRate;
    const bagWeight = calculateBagsWeight(bags, effectiveBagWeight);
    const grand = calculateGrandTotal(bagWeight.totalKg, tota);
    return sum + calculatePayableAmount(grand.totalKg, rate);
  }, 0);

  const totalDeductionsInBatch = rows.reduce((sum, r) => {
    const bags = (Number(r.newBags) || 0) + (Number(r.oldBags) || 0);
    const tota = Math.max(0, Number(r.totaKg) || 0);
    if (bags === 0 && tota === 0) return sum;
    return sum + (r.labourDeductions?.grandTotalDeductions || 0);
  }, 0);

  const totalNetAmountInBatch = Math.max(0, totalGrossAmount - totalDeductionsInBatch);
  const grandTotalBreakdown = formatKgToQulKg(totalCombinedKg);

  // -------------------------------------------------------------
  // FEATURE 3: Save Batch & Automatically Open Print/WhatsApp Center
  // -------------------------------------------------------------
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

    const savedList: BagsEntryRecord[] = [];

    for (const r of rows) {
      const farmer = farmers.find((f) => f.id === r.farmerId);
      if (!farmer) continue;

      const newB = Math.max(0, Number(r.newBags) || 0);
      const oldB = Math.max(0, Number(r.oldBags) || 0);
      const bagsCount = newB + oldB;
      const tota = Math.max(0, Number(r.totaKg) || 0);
      if (bagsCount === 0 && tota === 0) continue;

      const rowRate = r.ratePerQtl || masterRate;
      const bardanaType: BardanaType =
        newB > 0 && oldB > 0
          ? 'BOTH'
          : newB > 0
          ? 'NEW'
          : oldB > 0
          ? 'OLD'
          : 'NEW';

      const bagWeight = calculateBagsWeight(bagsCount, effectiveBagWeight);
      const grandTotal = calculateGrandTotal(bagWeight.totalKg, tota);
      const grossAmount = calculatePayableAmount(grandTotal.totalKg, rowRate);

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
        weightPerBagKg: effectiveBagWeight,
        totalBagsWeightKg: bagWeight.totalKg,
        totalBagsWeightDisplay: bagWeight.displayEn,
        totaKg: tota,
        grandTotalKg: grandTotal.totalKg,
        grandTotalDisplay: grandTotal.displayEn,
        bardana: bardanaType,
        cropType: activeCrop,
        ratePerQtl: rowRate,
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

    // Clear auto-save draft upon successful batch save
    clearDraft();

    setSavedBatchRecords(savedList);
    setIsSaving(false);

    // Automatically trigger Bulk Print & WhatsApp Action Center!
    setIsBatchActionModalOpen(true);
  };

  const editingRow = rows.find((r) => r.rowId === editingRowDeductionId);
  const editingRowFarmer = editingRow ? farmers.find((f) => f.id === editingRow.farmerId) : null;
  const editingRowBags = editingRow ? Math.max(0, Number(editingRow.bags) || 0) : 0;
  const editingRowTota = editingRow ? Math.max(0, Number(editingRow.totaKg) || 0) : 0;
  const editingRowRate = editingRow?.ratePerQtl || masterRate;
  const editingRowBagWeight = calculateBagsWeight(editingRowBags, effectiveBagWeight);
  const editingRowGrandTotal = calculateGrandTotal(editingRowBagWeight.totalKg, editingRowTota);
  const editingRowGross = calculatePayableAmount(editingRowGrandTotal.totalKg, editingRowRate);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {isEn ? 'Same Date Multi Farmer Entry' : 'ਇੱਕੋ ਮਿਤੀ ਮਲਟੀ ਕਿਸਾਨ ਐਂਟਰੀ (Same Date Multi Farmer Batch)'}
              </h2>
              {/* Active Crop & Bag Weight Badge */}
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                <Wheat className="w-3.5 h-3.5 text-emerald-700" />
                <span>{activeCropConfig?.namePa || 'ਹਾੜ੍ਹੀ ਫਸਲ'} ({effectiveBagWeight} ਕਿਲੋ/ਬੋਰੀ)</span>
              </span>
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
                ? 'Rapidly enter bags, separate tota, and deductions with live ledger balance and instant bulk print/WhatsApp.'
                : 'ਐਕਸਲ ਵਾਂਗ ਤੇਜ਼ ਕੀਬੋਰਡ ਨੈਵੀਗੇਸ਼ਨ, ਕਿਸਾਨ ਦਾ ਲਾਈਵ ਖਾਤਾ ਬਕਾਇਆ, ਅਤੇ ਇੱਕ ਕਲਿੱਕ ਵਿੱਚ ਸਾਰੀਆਂ ਪਰਚੀਆਂ ਪ੍ਰਿੰਟ ਤੇ ਵਟਸਐਪ।'}
            </p>
          </div>
        </div>

        {/* Top Controls: Re-open Print/WhatsApp + Stock + Master Date */}
        <div className="flex flex-wrap items-center gap-2">
          {savedBatchRecords.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBatchActionModalOpen(true)}
              className="bg-gradient-to-r from-emerald-700 to-indigo-700 hover:from-emerald-600 hover:to-indigo-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer border border-emerald-400/40"
              title="ਪਿਛਲੀਆਂ ਸੇਵ ਕੀਤੀਆਂ ਪਰਚੀਆਂ ਪ੍ਰਿੰਟ ਜਾਂ ਵਟਸਐਪ ਕਰੋ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ਪਰਚੀਆਂ ਪ੍ਰਿੰਟ / ਵਟਸਐਪ ({savedBatchRecords.length})</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-slate-500 font-bold">{isEn ? 'Stock:' : 'ਸਟਾਕ:'}</span>
            <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-black text-[10px]">
              {isEn ? 'New:' : 'ਨਵਾਂ:'} {bardanaSummary.newBagsRemaining.toLocaleString('en-IN')}
            </span>
            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-black text-[10px]">
              {isEn ? 'Old:' : 'ਪੁਰਾਣਾ:'} {bardanaSummary.oldBagsRemaining.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="w-40">
            <DateInput
              value={batchDate}
              onChange={setBatchDate}
              label={isEn ? "Batch Date" : "ਮਿਤੀ (Batch Date)"}
              required
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Quick Bar */}
      <div className="bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg text-[11px] font-mono flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
          <Keyboard className="w-4 h-4" />
          <span>⚡ ਸੁਪਰ-ਫਾਸਟ ਕੀਬੋਰਡ ਸ਼ਾਰਟਕੱਟ (Keyboard Quick Flow):</span>
        </div>
        <div className="flex items-center gap-3 text-slate-300 text-[10px]">
          <span><kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded border border-slate-700">Enter / Tab</kbd> ਅਗਲਾ ਖਾਨਾ</span>
          <span><kbd className="bg-slate-800 text-white px-1.5 py-0.5 rounded border border-slate-700">↑ / ↓</kbd> ਉੱਪਰ/ਹੇਠਾਂ ਕਤਾਰ</span>
          <span className="text-emerald-400 font-bold"><kbd className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded border border-slate-700">Enter at End</kbd> ਆਟੋਮੈਟਿਕ ਨਵੀਂ ਕਤਾਰ (+ Auto Row)</span>
        </div>
      </div>

      {/* Batch Master Rate & Labour Options Preset Toolbar */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
            <Hammer className="w-4 h-4" />
          </div>
          <div>
            <strong className="text-amber-950 block text-xs">
              {isEn ? 'Batch Settings & Labour Presets:' : 'ਬੈਚ ਰੇਟ ਅਤੇ ਮਜ਼ਦੂਰੀ ਪ੍ਰੀਸੈਟ (Batch Presets):'}
            </strong>
            <span className="text-[11px] text-amber-800">
              {isEn
                ? 'Set uniform rate and apply labour deductions across all rows with one click'
                : 'ਇੱਕੋ ਕਲਿੱਕ ਨਾਲ ਸਾਰੀਆਂ ਕਤਾਰਾਂ ਉੱਤੇ ਰੇਟ ਜਾਂ ਮਜ਼ਦੂਰੀ ਕਟੌਤੀਆਂ ਲਾਗੂ ਕਰੋ'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Master Rate Input */}
          <div className="flex items-center gap-1 bg-white border border-amber-300 px-2 py-1 rounded-lg">
            <span className="text-[11px] font-bold text-slate-700">ਰੇਟ: ₹</span>
            <input
              type="number"
              value={masterRate}
              onChange={(e) => setMasterRate(Number(e.target.value) || 0)}
              className="w-16 text-center font-mono font-black text-xs text-slate-900 bg-transparent focus:outline-none"
            />
            <button
              type="button"
              onClick={applyMasterRateToAll}
              className="text-[10px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-1.5 py-0.5 rounded transition cursor-pointer"
              title="ਇਹ ਰੇਟ ਸਾਰੀਆਂ ਕਤਾਰਾਂ ਉੱਤੇ ਲਾਗੂ ਕਰੋ"
            >
              ਸਭ 'ਤੇ ਲਾਓ
            </button>
          </div>

          {/* Pakki ₹7 */}
          <label className="flex items-center gap-1.5 bg-white border border-amber-300 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-amber-100/50 transition">
            <input
              type="checkbox"
              checked={batchPakkiEnabled}
              onChange={(e) => setBatchPakkiEnabled(e.target.checked)}
              className="w-3.5 h-3.5 text-amber-600 rounded"
            />
            <span className="font-bold text-slate-800 text-[11px]">
              {isEn ? 'Pakki (₹7/Qtl)' : 'ਪੱਕੀ (₹7/Qtl)'}
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
              {isEn ? 'Double (₹14/Qtl)' : 'ਡਬਲ (₹14/Qtl)'}
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
              {isEn ? 'Sukhi (₹5/Qtl)' : 'ਸੁੱਕੀ (₹5/Qtl)'}
            </span>
          </label>

          <button
            type="button"
            onClick={applyBatchLabourToAll}
            className="bg-amber-600 hover:bg-amber-500 text-white font-black px-3 py-1 rounded-lg text-[11px] shadow-2xs flex items-center gap-1 transition cursor-pointer"
          >
            <Check className="w-3 h-3" />
            <span>{isEn ? 'Apply to All' : "ਮਜ਼ਦੂਰੀ ਸਭ 'ਤੇ ਲਾਓ"}</span>
          </button>
        </div>
      </div>

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
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                      (f.farmerName || '').toLowerCase().includes(q) ||
                      (f.farmerNamePa && f.farmerNamePa.toLowerCase().includes(q)) ||
                      (f.fatherName && f.fatherName.toLowerCase().includes(q)) ||
                      (f.fatherNamePa && f.fatherNamePa.toLowerCase().includes(q)) ||
                      (f.village || '').toLowerCase().includes(q) ||
                      (f.villagePa && f.villagePa.toLowerCase().includes(q)) ||
                      (f.address && f.address.toLowerCase().includes(q)) ||
                      (f.id || '').toLowerCase().includes(q) ||
                      (cleanNums && f.mobile && f.mobile.replace(/[^0-9]/g, '').includes(cleanNums))
                    );
                  })
                  .map((f) => {
                    const fSummary = getCompleteFarmerAccount(f.id);
                    const bal = fSummary ? fSummary.finalBalance : 0;

                    return (
                      <div
                        key={f.id}
                        className="p-2.5 hover:bg-indigo-50/70 flex items-start justify-between gap-3 transition cursor-pointer"
                        onClick={() => addFarmerToBatch(f.id)}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-black text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                              {f.id}
                            </span>
                            <span>{f.farmerName}</span>
                            <span className="text-slate-500 font-semibold">s/o {f.fatherName}</span>
                            <span className="text-indigo-800 font-bold">• Village: {f.village}</span>

                            {/* Live Balance indicator inside search dropdown */}
                            {bal > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-md">
                                ਲੈਣਦਾਰੀ: {formatCurrency(bal)}
                              </span>
                            ) : bal < 0 ? (
                              <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded-md">
                                ਬਕਾਇਆ: {formatCurrency(Math.abs(bal))}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md">
                                ਨਿਲ (₹0)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-900">
                            {f.farmerNamePa} ਸ/ਓ {f.fatherNamePa || f.fatherName} • ਪਿੰਡ: {f.villagePa || f.village}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            <strong>ਪਤਾ:</strong> {f.address ? `${f.address}, ` : ''}ਮੋਬਾਈਲ: {f.mobile}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addFarmerToBatch(f.id);
                          }}
                          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ਸ਼ਾਮਲ ਕਰੋ (+ Add)</span>
                        </button>
                      </div>
                    );
                  })}
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
                    <th className="py-2.5 px-3 min-w-[280px]">
                      {isEn ? 'Farmer & Live Balance' : 'ਕਿਸਾਨ ਅਤੇ ਲਾਈਵ ਖਾਤਾ ਬਕਾਇਆ (Farmer & Live Balance)'}
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
                    <th className="py-2.5 px-2 w-20 text-center">
                      {isEn ? 'Rate (₹)' : 'ਰੇਟ (₹)'}
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
                    const rowRate = row.ratePerQtl || masterRate;
                    const rowBagsWeight = calculateBagsWeight(bags, effectiveBagWeight);
                    const rowGrandTotal = calculateGrandTotal(rowBagsWeight.totalKg, tota);
                    const rowGrossAmount = calculatePayableAmount(rowGrandTotal.totalKg, rowRate);
                    const rowDeductions = row.labourDeductions?.grandTotalDeductions || 0;
                    const rowNetAmount = Math.max(0, rowGrossAmount - rowDeductions);

                    const isPakki = !!row.labourDeductions?.pakkiLabourEnabled;
                    const isDouble = !!row.labourDeductions?.pakkaDoubleLabourEnabled;
                    const isSukhi = !!row.labourDeductions?.sukhiLabourEnabled;
                    const hasCustom = (row.labourDeductions?.customDeductions?.length || 0) > 0;

                    // FEATURE 2: Live Farmer Account Balance
                    const farmerSummary = selectedF ? getCompleteFarmerAccount(selectedF.id) : null;
                    const balance = farmerSummary ? farmerSummary.finalBalance : 0;
                    const isDuplicate = Boolean(selectedF && (farmerCounts[selectedF.id] || 0) > 1);

                    return (
                      <tr
                        key={row.rowId}
                        className={`transition ${isDuplicate ? 'bg-amber-50/50 hover:bg-amber-50/80' : 'hover:bg-slate-50/70'}`}
                      >
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
                            <div className="mt-1 space-y-1">
                              {/* FEATURE 2: Live Ledger Balance Badge */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {balance > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                                    🟢 ਲੈਣਦਾਰੀ (To Pay): {formatCurrency(balance)}
                                  </span>
                                ) : balance < 0 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-md shadow-2xs">
                                    🔴 ਬਕਾਇਆ (To Recover): {formatCurrency(Math.abs(balance))}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
                                    ⚪ ਹਿਸਾਬ ਬਰਾਬਰ (₹0)
                                  </span>
                                )}

                                {/* Duplicate Warning Badge */}
                                {isDuplicate && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-950 bg-amber-200 border border-amber-400 px-2 py-0.5 rounded-md animate-pulse">
                                    ⚠️ ਡੁਪਲੀਕੇਟ ਕਿਸਾਨ ({farmerCounts[selectedF.id]} ਵਾਰ ਦਰਜ)
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-slate-700 bg-slate-100/90 p-1.5 rounded-md border border-slate-200 space-y-0.5">
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
                                  ਪਤਾ: {selectedF.address || '—'} | ਮੋਬਾਈਲ: {selectedF.mobile}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 1. New Juths Input (Keyboard Navigation Enabled) */}
                        <td className="py-2.5 px-2 bg-emerald-50/30">
                          <input
                            id={`input-newBags-${row.rowId}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            value={row.newBags || ''}
                            onChange={(e) => updateRow(row.rowId, 'newBags', parseInt(e.target.value, 10) || 0)}
                            onKeyDown={(e) => handleCellKeyDown(e, row.rowId, 'newBags', index)}
                            className="w-full text-center bg-white border-2 border-emerald-300 rounded-lg py-2 px-1 text-base font-mono font-black text-emerald-950 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200"
                          />
                        </td>

                        {/* 2. Old Juths Input (Keyboard Navigation Enabled) */}
                        <td className="py-2.5 px-2 bg-amber-50/30">
                          <input
                            id={`input-oldBags-${row.rowId}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            value={row.oldBags || ''}
                            onChange={(e) => updateRow(row.rowId, 'oldBags', parseInt(e.target.value, 10) || 0)}
                            onKeyDown={(e) => handleCellKeyDown(e, row.rowId, 'oldBags', index)}
                            className="w-full text-center bg-white border-2 border-amber-300 rounded-lg py-2 px-1 text-base font-mono font-black text-amber-950 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                          />
                        </td>

                        {/* 3. Auto-calculated Total Bags */}
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg block">
                            {bags}
                          </span>
                        </td>

                        {/* 4. Tota (Kg) Input (Keyboard Navigation Enabled) */}
                        <td className="py-2.5 px-2">
                          <input
                            id={`input-totaKg-${row.rowId}`}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={row.totaKg || ''}
                            onChange={(e) => updateRow(row.rowId, 'totaKg', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => handleCellKeyDown(e, row.rowId, 'totaKg', index)}
                            className="w-full text-center bg-white border-2 border-slate-300 rounded-lg py-2 px-1 text-base font-mono font-black text-amber-950 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                          />
                        </td>

                        {/* 5. Row Rate per Qtl Input */}
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            min="0"
                            placeholder={String(masterRate)}
                            value={row.ratePerQtl || masterRate}
                            onChange={(e) => updateRow(row.rowId, 'ratePerQtl', parseFloat(e.target.value) || masterRate)}
                            className="w-full text-center bg-white border border-slate-300 rounded-lg py-1 px-1 font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
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
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                isPakki
                                  ? 'bg-amber-500 border-amber-600 text-slate-950 font-black'
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
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                isDouble
                                  ? 'bg-amber-600 border-amber-700 text-white font-black'
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
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                isSukhi
                                  ? 'bg-orange-500 border-orange-600 text-white font-black'
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
                              className={`p-1 rounded text-[10px] font-bold border transition cursor-pointer ${
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isEn ? '+ Add Row' : '+ ਹੋਰ ਕਤਾਰ ਜੋੜੋ (Add Row)'}</span>
                </button>

                {savedBatchRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsBatchActionModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>ਪਿਛਲੀਆਂ ਪਰਚੀਆਂ ਪ੍ਰਿੰਟ / ਵਟਸਐਪ ({savedBatchRecords.length})</span>
                  </button>
                )}
              </div>

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
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold px-5 py-2 rounded-xl text-xs shadow-md flex items-center gap-1.5 transition active:scale-95 ml-2 font-sans cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Saving Batch...' : 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ... (Saving...)'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Save All Entries' : 'ਸਾਰੀਆਂ ਐਂਟਰੀਆਂ ਸੇਵ ਕਰੋ (Save All)'}</span>
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
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
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                {isEn ? 'Done' : 'ਠੀਕ ਹੈ / ਪੂਰਾ ਹੋਇਆ (Done)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE 3: Batch Action Center Modal (Bulk Print & WhatsApp Dispatch) */}
      <BatchPrintAndWhatsAppModal
        isOpen={isBatchActionModalOpen}
        onClose={() => setIsBatchActionModalOpen(false)}
        savedEntries={savedBatchRecords}
        batchDate={batchDate}
        firm={activeFirm}
        settings={settings}
        language={language}
      />
    </div>
  );
};
