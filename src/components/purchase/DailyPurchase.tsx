import React, { useState, useMemo, useEffect } from 'react';
import { DailyPurchaseRecord, Farmer, FarmerPurchaseSummary, LabourAndDeductions } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  ShoppingBag,
  Building2,
  Calendar,
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Scale,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  UserCheck,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Printer,
  CheckSquare,
  Square,
  Filter,
  RotateCcw
} from 'lucide-react';
import {
  FIXED_BAG_WEIGHT_KG,
  FIXED_RATE_PER_QTL,
  formatKgToQulKg,
  calculatePayableAmount,
  autoFormatDate
} from '../../utils/calculations';
import { DailyPurchaseViewModal } from './DailyPurchaseViewModal';
import { DailyPurchaseEditModal } from './DailyPurchaseEditModal';
import {
  exportDailyPurchaseRegisterPDF,
  exportDailyPurchaseVoucherPDF,
  normalizeDateToComparable
} from '../../utils/purchasePdfExport';
import { DateInput } from '../common/DateInput';

interface MultiFarmerPurchaseRow {
  rowId: string;
  farmerId: string;
  newBags: number;
  oldBags: number;
  bags: number;
}

export const DailyPurchase: React.FC = () => {
  const {
    farmers,
    dailyPurchaseRecords,
    agencies,
    settings,
    addDailyPurchase,
    deleteDailyPurchase,
    getFarmerPurchaseSummary,
    language
  } = useMandi();

  const isEn = language === 'en';

  const {
    notifySaveSuccess,
    notifyDeleteSuccess,
    notifyError,
    confirmDelete
  } = useNotification();

  // ==================================================
  // 1. UNIVERSAL AUTO-SAVE DRAFT & INITIAL STATE
  // ==================================================
  const getTodayFormatted = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  interface DailyPurchaseDraft {
    fixedAgency: string;
    purchaseDate: string;
    rows: MultiFarmerPurchaseRow[];
    labourType: 'NONE' | 'PAKKI' | 'DOUBLE' | 'SUKKI' | 'CUSTOM';
    labourUnit: 'PER_QTL' | 'PER_BAG';
    customLabourRate: number;
  }

  // Generate an empty purchase row
  const createEmptyPurchaseRow = (index?: number | string): MultiFarmerPurchaseRow => ({
    rowId: `row_${Date.now()}_${index ?? Math.random().toString(36).substring(2, 6)}_${Math.random().toString(36).substring(2, 5)}`,
    farmerId: '',
    newBags: 0,
    oldBags: 0,
    bags: 0
  });

  // By default, create 5 empty rows automatically (Sr. No. 1, 2, 3, 4, 5)
  const createInitial5PurchaseRows = (): MultiFarmerPurchaseRow[] => [
    createEmptyPurchaseRow(1),
    createEmptyPurchaseRow(2),
    createEmptyPurchaseRow(3),
    createEmptyPurchaseRow(4),
    createEmptyPurchaseRow(5)
  ];

  const { draft, saveDraft, clearDraft } = useFormDraft<DailyPurchaseDraft>({
    formKey: 'draft_daily_purchase',
    initialValues: {
      fixedAgency: agencies.length > 0 ? agencies[0].nameEn : 'Markfed',
      purchaseDate: getTodayFormatted(),
      rows: createInitial5PurchaseRows(),
      labourType: 'NONE',
      labourUnit: 'PER_QTL',
      customLabourRate: 7
    }
  });

  const [fixedAgency, setFixedAgency] = useState<string>(
    draft.fixedAgency || (agencies.length > 0 ? agencies[0].nameEn : 'Markfed')
  );
  const [purchaseDate, setPurchaseDate] = useState<string>(draft.purchaseDate || getTodayFormatted());
  const [customRate] = useState<number>(settings.fixedRatePerQtl || FIXED_RATE_PER_QTL);

  // Labour auto-calculation state
  const [labourType, setLabourType] = useState<'NONE' | 'PAKKI' | 'DOUBLE' | 'SUKKI' | 'CUSTOM'>(
    draft.labourType || 'NONE'
  );
  const [labourUnit, setLabourUnit] = useState<'PER_QTL' | 'PER_BAG'>(draft.labourUnit || 'PER_QTL');
  const [customLabourRate, setCustomLabourRate] = useState<number>(draft.customLabourRate || 7);

  // ==================================================
  // 2. MULTI FARMER PURCHASE TABLE STATE
  // By default, show 5 empty rows automatically when Daily Purchase is opened.
  // ==================================================
  const [rows, setRows] = useState<MultiFarmerPurchaseRow[]>(() => {
    if (draft.rows && draft.rows.length >= 5) {
      return draft.rows;
    }
    if (draft.rows && draft.rows.length > 0) {
      const padded = [...draft.rows];
      while (padded.length < 5) {
        padded.push(createEmptyPurchaseRow(padded.length + 1));
      }
      return padded;
    }
    return createInitial5PurchaseRows();
  });

  // Sync back to universal draft on every change
  useEffect(() => {
    saveDraft({
      fixedAgency,
      purchaseDate,
      rows,
      labourType,
      labourUnit,
      customLabourRate
    });
  }, [fixedAgency, purchaseDate, rows, labourType, labourUnit, customLabourRate, saveDraft]);

  const [farmerSearchQuery, setFarmerSearchQuery] = useState<string>('');
  const [showFarmerSearchDropdown, setShowFarmerSearchDropdown] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const agencyOptions: SearchableSelectOption[] = useMemo(() => {
    return agencies.map((ag) => ({
      value: ag.nameEn,
      label: isEn ? ag.nameEn : `${ag.nameEn} (${ag.namePa})`,
      subLabel: isEn ? (ag.namePa || undefined) : ag.nameEn,
      badge: ag.code,
      keywords: [ag.nameEn, ag.namePa, ag.code]
    }));
  }, [agencies, isEn]);

  const farmerOptions: SearchableSelectOption[] = useMemo(() => {
    return farmers.map((f) => {
      const sum = getFarmerPurchaseSummary(f.id);
      return {
        value: f.id,
        label: isEn ? `${f.farmerName} (${f.id})` : `${f.farmerNamePa} (${f.farmerName})`,
        subLabel: `${isEn ? 'Village' : 'ਪਿੰਡ'}: ${isEn ? f.village : (f.villagePa || f.village)} • ${isEn ? 'Remaining' : 'ਬਾਕੀ'}: ${sum.remainingBags}`,
        badge: f.id,
        keywords: [f.farmerName, f.farmerNamePa, f.village, f.villagePa, f.mobile, f.id, f.fatherName, f.fatherNamePa]
      };
    });
  }, [farmers, isEn, getFarmerPurchaseSummary]);

  // ==================================================
  // 3. SAVED RECORDS VIEW & SELECTION STATE
  // Mode: 'ALL_FARMERS' | 'DATE_WISE'
  // Multi-select: selectedRecordIds
  // Filter states for All Farmers and Date-wise
  // ==================================================
  const [viewMode, setViewMode] = useState<'ALL_FARMERS' | 'DATE_WISE'>('ALL_FARMERS');
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  // All Farmers View filters
  const [allFarmersSearch, setAllFarmersSearch] = useState<string>('');
  const [allFarmersAgency, setAllFarmersAgency] = useState<string>('ALL');

  // Date-wise View filters
  const [selectedFilterDate, setSelectedFilterDate] = useState<string>('ALL');
  const [dateViewSearch, setDateViewSearch] = useState<string>('');
  const [dateViewAgency, setDateViewAgency] = useState<string>('ALL');

  const [expandedDates, setExpandedDates] = useState<{ [date: string]: boolean }>({});
  const [viewRecord, setViewRecord] = useState<DailyPurchaseRecord | null>(null);
  const [editRecord, setEditRecord] = useState<DailyPurchaseRecord | null>(null);

  // Toggle expand/collapse for a date
  const toggleDateExpanded = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Multi-select helpers
  const toggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (targetRecords: DailyPurchaseRecord[]) => {
    const targetIds = targetRecords.map((r) => r.id);
    const allSelected = targetIds.length > 0 && targetIds.every((id) => selectedRecordIds.has(id));

    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        targetIds.forEach((id) => next.delete(id));
      } else {
        targetIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedRecordIds(new Set());
  };

  // Dynamic continuous remaining balance calculation for each row
  const getAvailableBalanceForRow = (rowIndex: number, farmerId: string): number => {
    if (!farmerId) return 0;
    const summary = getFarmerPurchaseSummary(farmerId);
    const targetId = summary.isLinkedFarmer && summary.linkedToMainFarmerId ? summary.linkedToMainFarmerId : farmerId;

    // Calculate bags used in preceding rows for the same farmer/pool
    let usedInPrecedingRows = 0;
    for (let i = 0; i < rowIndex; i++) {
      const prev = rows[i];
      if (!prev.farmerId) continue;
      const prevSummary = getFarmerPurchaseSummary(prev.farmerId);
      const prevTargetId = prevSummary.isLinkedFarmer && prevSummary.linkedToMainFarmerId ? prevSummary.linkedToMainFarmerId : prev.farmerId;
      if (prevTargetId === targetId) {
        usedInPrecedingRows += (Number(prev.bags) || 0);
      }
    }

    return Math.max(0, summary.remainingBags - usedInPrecedingRows);
  };

  // Add a blank row (Sr No automatically generated: 6, 7, 8, 9, 10...)
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      createEmptyPurchaseRow(prev.length + 1)
    ]);
  };

  // Add specific farmer row from search (fills first empty row or appends)
  const addFarmerRow = (farmerId: string) => {
    setRows((prev) => {
      // If there's an existing empty row (no farmerId and 0 bags), populate the first empty row
      const firstEmptyIndex = prev.findIndex((r) => !r.farmerId && Number(r.bags) === 0);
      if (firstEmptyIndex !== -1) {
        const updated = [...prev];
        updated[firstEmptyIndex] = {
          ...updated[firstEmptyIndex],
          farmerId,
          newBags: 0,
          oldBags: 0,
          bags: 0
        };
        return updated;
      }
      // If all current rows have data, append a new row
      return [
        ...prev,
        {
          ...createEmptyPurchaseRow(prev.length + 1),
          farmerId
        }
      ];
    });
    setFarmerSearchQuery('');
    setShowFarmerSearchDropdown(false);
  };

  // Remove a row - ensure clean, sequential Sr. No. and maintain at least 5 rows
  const removeRow = (rowId: string) => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.rowId !== rowId);
      // Ensure at least 5 rows are always maintained
      if (filtered.length < 5) {
        const needed = 5 - filtered.length;
        const appended: MultiFarmerPurchaseRow[] = [];
        for (let i = 0; i < needed; i++) {
          appended.push(createEmptyPurchaseRow(filtered.length + i + 1));
        }
        return [...filtered, ...appended];
      }
      return filtered;
    });
  };

  // Update a row
  const updateRow = (rowId: string, field: 'farmerId' | 'newBags' | 'oldBags' | 'bags', val: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        if (field === 'farmerId') {
          return { ...r, farmerId: val, newBags: 0, oldBags: 0, bags: 0 };
        }
        if (field === 'newBags') {
          const nb = Math.max(0, parseInt(val, 10) || 0);
          return { ...r, newBags: nb, bags: nb + (r.oldBags || 0) };
        }
        if (field === 'oldBags') {
          const ob = Math.max(0, parseInt(val, 10) || 0);
          return { ...r, oldBags: ob, bags: (r.newBags || 0) + ob };
        }
        if (field === 'bags') {
          const b = Math.max(0, parseInt(val, 10) || 0);
          return { ...r, newBags: b, oldBags: 0, bags: b };
        }
        return r;
      })
    );
  };

  // Active Labour Rate from selection (Pakki ₹7, Double ₹14, Sukki ₹5, Custom)
  const activeLabourRate = useMemo(() => {
    if (labourType === 'NONE') return 0;
    if (labourType === 'PAKKI') return settings.defaultPakkiLabourRate || 7;
    if (labourType === 'DOUBLE') return settings.defaultPakkaDoubleLabourRate || 14;
    if (labourType === 'SUKKI') return settings.defaultSukhiLabourRate || 5;
    if (labourType === 'CUSTOM') return Number(customLabourRate) || 0;
    return 0;
  }, [labourType, customLabourRate, settings]);

  const getRowLabourAmount = (rowBags: number, rowWeightKg: number) => {
    if (activeLabourRate <= 0) return 0;
    if (labourUnit === 'PER_QTL') {
      return Math.round(((rowWeightKg / 100) * activeLabourRate) * 100) / 100;
    } else {
      return Math.round((rowBags * activeLabourRate) * 100) / 100;
    }
  };

  // Multi-Farmer Rows Live Totals (New, Old, Grand Total, Weight Qul+Kg, Gross, Total Labour, Net Amount)
  const rowTotals = useMemo(() => {
    let totalNewBags = 0;
    let totalOldBags = 0;
    let totalBags = 0;
    let validFarmersCount = 0;

    rows.forEach((r) => {
      const nb = Math.max(0, Number(r.newBags) || 0);
      const ob = Math.max(0, Number(r.oldBags) || 0);
      const b = Math.max(0, Number(r.bags) || 0);
      if (r.farmerId && b > 0) {
        totalNewBags += nb;
        totalOldBags += ob;
        totalBags += b;
        validFarmersCount++;
      }
    });

    const totalWeightKg = totalBags * FIXED_BAG_WEIGHT_KG;
    const bDown = formatKgToQulKg(totalWeightKg);
    const amount = calculatePayableAmount(totalWeightKg, customRate);
    const totalLabour = getRowLabourAmount(totalBags, totalWeightKg);
    const netAmount = Math.max(0, Math.round((amount - totalLabour) * 100) / 100);

    return {
      validFarmersCount,
      totalNewBags,
      totalOldBags,
      totalBags,
      totalWeightKg,
      qul: bDown.qtl,
      kg: bDown.kg,
      amount,
      totalLabour,
      netAmount
    };
  }, [rows, customRate, activeLabourRate, labourUnit]);

  // Handle Save Multi-Farmer Purchases with strict balance reduction checks
  const handleSavePurchases = () => {
    setFormError('');

    if (!fixedAgency) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਖਰੀਦ ਏਜੰਸੀ ਦੀ ਚੋਣ ਕਰੋ (Please select Procurement Agency).');
      return;
    }

    const validRows = rows.filter((r) => r.farmerId && Number(r.bags) > 0);

    if (validRows.length === 0) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਕਿਸਾਨ ਅਤੇ ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ ਦਰਜ ਕਰੋ (Please enter at least one valid row).');
      return;
    }

    // Continuous balance reduction validation
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.farmerId || row.bags <= 0) continue;
      const farmer = farmers.find((f) => f.id === row.farmerId);
      const available = getAvailableBalanceForRow(i, row.farmerId);

      if (row.bags > available) {
        setFormError(
          `ਕਤਾਰ #${i + 1}: ਕਿਸਾਨ ${farmer?.farmerName || row.farmerId} ਲਈ ਇਸ ਕਤਾਰ ਵਿੱਚ ਸਿਰਫ਼ ${available} ਬੋਰੀਆਂ ਉਪਲਬਧ ਹਨ। ਦਰਜ ਕੀਤੀਆਂ: ${row.bags} ਬੋਰੀਆਂ।`
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      let savedCount = 0;
      for (const row of validRows) {
        const farmer = farmers.find((f) => f.id === row.farmerId);
        if (!farmer) continue;

        const totalWeightKg = row.bags * FIXED_BAG_WEIGHT_KG;
        const bDown = formatKgToQulKg(totalWeightKg);
        const amt = calculatePayableAmount(totalWeightKg, customRate);
        const rowLabour = getRowLabourAmount(row.bags, totalWeightKg);
        const rowNet = Math.max(0, Math.round((amt - rowLabour) * 100) / 100);

        const rowLabourDeductions: LabourAndDeductions | undefined = labourType !== 'NONE' ? {
          pakkiLabourEnabled: labourType === 'PAKKI',
          pakkiLabourRate: labourType === 'PAKKI' ? activeLabourRate : 0,
          pakkiLabourAmount: labourType === 'PAKKI' ? rowLabour : 0,
          pakkaDoubleLabourEnabled: labourType === 'DOUBLE',
          pakkaDoubleLabourRate: labourType === 'DOUBLE' ? activeLabourRate : 0,
          pakkaDoubleLabourAmount: labourType === 'DOUBLE' ? rowLabour : 0,
          sukhiLabourEnabled: labourType === 'SUKKI',
          sukhiLabourRate: labourType === 'SUKKI' ? activeLabourRate : 0,
          sukhiLabourAmount: labourType === 'SUKKI' ? rowLabour : 0,
          totalLabourDeduction: rowLabour,
          totalOtherDeduction: 0,
          grandTotalDeductions: rowLabour,
          grossAmount: amt,
          netPayableAmount: rowNet
        } : undefined;

        const result = addDailyPurchase({
          date: purchaseDate.trim(),
          agency: fixedAgency,
          farmerId: farmer.id,
          farmerName: farmer.farmerName,
          farmerNamePa: farmer.farmerNamePa,
          fatherName: farmer.fatherName,
          village: farmer.village,
          villagePa: farmer.villagePa,
          mobile: farmer.mobile,
          aadhaar: farmer.aadhaar,
          newBags: row.newBags,
          oldBags: row.oldBags,
          bags: row.bags,
          qul: bDown.qtl,
          kg: bDown.kg,
          totalWeightKg,
          rate: customRate,
          totalAmount: amt,
          labourDeductions: rowLabourDeductions,
          netAmount: rowNet
        });

        if (result.success) {
          savedCount++;
        }
      }

      const labourMsg = rowTotals.totalLabour > 0
        ? ` • ਮਜ਼ਦੂਰੀ: -₹${rowTotals.totalLabour.toLocaleString('en-IN')} • ਸ਼ੁੱਧ ਰਕਮ: ₹${rowTotals.netAmount.toLocaleString('en-IN')}`
        : '';

      notifySaveSuccess({
        titlePa: `${savedCount} ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ`,
        titleEn: 'Purchases Saved Successfully',
        messagePa: `ਮਿਤੀ: ${purchaseDate} | ਏਜੰਸੀ: ${fixedAgency} | ਕੁੱਲ ਬੋਰੀਆਂ: ${rowTotals.totalBags} (ਨਵਾਂ: ${rowTotals.totalNewBags}, ਪੁਰਾਣਾ: ${rowTotals.totalOldBags}) | ਵਜ਼ਨ: ${rowTotals.qul} ਕੁਇੰਟਲ ${rowTotals.kg} ਕਿਲੋ${labourMsg}`,
        details: `${savedCount} Farmers • ${rowTotals.totalBags} Bags • ₹${rowTotals.netAmount.toLocaleString('en-IN')}`
      });

      // Clear draft upon successful save
      clearDraft();

      // Reset rows to 5 blank rows automatically
      setRows(createInitial5PurchaseRows());
      // Automatically expand today's date in summary
      setExpandedDates((prev) => ({ ...prev, [purchaseDate]: true }));
    } catch {
      notifyError({
        titlePa: 'ਖਰੀਦ ਸੇਵ ਕਰਨ ਵਿੱਚ ਗਲਤੀ ਆਈ',
        titleEn: 'Failed to save daily purchase'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a purchase record with confirmation
  const handleDeleteRecord = (record: DailyPurchaseRecord) => {
    confirmDelete({
      recordNameEn: `Purchase of ${record.bags} Bags for ${record.farmerName}`,
      recordNamePa: `${record.farmerName} ਦੀ ${record.bags} ਬੋਰੀਆਂ ਦੀ ਖਰੀਦ`,
      recordId: record.id,
      itemDetails: [
        { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ', value: record.farmerName },
        { labelEn: 'Agency', labelPa: 'ਏਜੰਸੀ', value: record.agency },
        { labelEn: 'Bags', labelPa: 'ਬੋਰੀਆਂ', value: `${record.bags} Bags` },
        { labelEn: 'Amount', labelPa: 'ਕੁੱਲ ਰਕਮ', value: `₹${record.totalAmount.toLocaleString('en-IN')}` }
      ],
      onConfirm: () => {
        deleteDailyPurchase(record.id);
        notifyDeleteSuccess({
          titlePa: 'ਖਰੀਦ ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਹਟਾ ਦਿੱਤਾ ਗਿਆ',
          titleEn: 'Purchase Record Deleted',
          messagePa: `${record.bags} ਬੋਰੀਆਂ ਵਾਪਸ ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਸਟਾਕ ਵਿੱਚ ਜਮ੍ਹਾਂ ਕਰ ਦਿੱਤੀਆਂ ਗਈਆਂ ਹਨ।`
        });
      }
    });
  };

  // Group daily purchase records by Date
  const dateWisePurchases = useMemo(() => {
    const groups: {
      [date: string]: {
        records: DailyPurchaseRecord[];
        uniqueFarmers: Set<string>;
        totalBags: number;
        totalWeightKg: number;
        totalAmount: number;
        totalLabour: number;
        totalNetAmount: number;
      };
    } = {};

    dailyPurchaseRecords.forEach((rec) => {
      if (!groups[rec.date]) {
        groups[rec.date] = {
          records: [],
          uniqueFarmers: new Set(),
          totalBags: 0,
          totalWeightKg: 0,
          totalAmount: 0,
          totalLabour: 0,
          totalNetAmount: 0
        };
      }
      const gross = Number(rec.totalAmount) || 0;
      const net = rec.netAmount !== undefined ? Number(rec.netAmount) : gross;
      const labour = rec.labourDeductions?.grandTotalDeductions !== undefined
        ? Number(rec.labourDeductions.grandTotalDeductions)
        : Math.max(0, gross - net);

      groups[rec.date].records.push(rec);
      groups[rec.date].uniqueFarmers.add(rec.farmerId);
      groups[rec.date].totalBags += Number(rec.bags) || 0;
      groups[rec.date].totalWeightKg += Number(rec.totalWeightKg) || 0;
      groups[rec.date].totalAmount += gross;
      groups[rec.date].totalLabour += labour;
      groups[rec.date].totalNetAmount += net;
    });

    // Sort dates descending (newest first)
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const partsA = a.split('/');
      const partsB = b.split('/');
      if (partsA.length === 3 && partsB.length === 3) {
        const dA = new Date(parseInt(partsA[2], 10), parseInt(partsA[1], 10) - 1, parseInt(partsA[0], 10));
        const dB = new Date(parseInt(partsB[2], 10), parseInt(partsB[1], 10) - 1, parseInt(partsB[0], 10));
        return dB.getTime() - dA.getTime();
      }
      return b.localeCompare(a);
    });

    return sortedDates.map((date) => ({
      date,
      records: groups[date].records,
      farmerCount: groups[date].uniqueFarmers.size,
      totalBags: groups[date].totalBags,
      totalWeightKg: groups[date].totalWeightKg,
      totalQul: (groups[date].totalWeightKg / 100).toFixed(2),
      totalAmount: groups[date].totalAmount,
      totalLabour: groups[date].totalLabour,
      totalNetAmount: groups[date].totalNetAmount
    }));
  }, [dailyPurchaseRecords]);

  // Export Excel / CSV for a specific date
  const exportDateCsv = (date: string, records: DailyPurchaseRecord[]) => {
    const headers = [
      'Sr No',
      'Date',
      'Farmer ID',
      'Farmer Name',
      'Farmer Punjabi Name',
      'Father Name',
      'Mobile',
      'Village',
      'Agency',
      'Bags',
      'Qul',
      'Kg',
      'Total Weight (Kg)',
      'Rate (INR/Qtl)',
      'Total Amount (INR)'
    ];

    const csvRows = records.map((rec, idx) => [
      idx + 1,
      rec.date,
      rec.farmerId,
      `"${rec.farmerName}"`,
      `"${rec.farmerNamePa || ''}"`,
      `"${rec.fatherName || ''}"`,
      rec.mobile || '',
      `"${rec.village}"`,
      `"${rec.agency}"`,
      rec.bags,
      rec.qul,
      rec.kg,
      rec.totalWeightKg.toFixed(2),
      rec.rate,
      rec.totalAmount.toFixed(2)
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_${date.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generic CSV export for all farmers or filtered records
  const exportRecordsCsv = (title: string, records: DailyPurchaseRecord[]) => {
    const headers = [
      'Sr No',
      'Date',
      'Farmer ID',
      'Farmer Name',
      'Farmer Punjabi Name',
      'Father Name',
      'Mobile',
      'Village',
      'Agency',
      'New Juths',
      'Old Juths',
      'Total Bags',
      'Qul',
      'Kg',
      'Total Weight (Kg)',
      'Rate (INR/Qtl)',
      'Gross Amount (INR)',
      'Labour Deduction (INR)',
      'Net Amount (INR)'
    ];

    const csvRows = records.map((rec, idx) => {
      const gross = Number(rec.totalAmount) || 0;
      const net = rec.netAmount !== undefined ? Number(rec.netAmount) : gross;
      const labour = rec.labourDeductions?.grandTotalDeductions !== undefined
        ? Number(rec.labourDeductions.grandTotalDeductions)
        : Math.max(0, gross - net);

      return [
        idx + 1,
        rec.date,
        rec.farmerId,
        `"${rec.farmerName}"`,
        `"${rec.farmerNamePa || ''}"`,
        `"${rec.fatherName || ''}"`,
        rec.mobile || '',
        `"${rec.village}"`,
        `"${rec.agency}"`,
        rec.newBags ?? '',
        rec.oldBags ?? '',
        rec.bags,
        rec.qul,
        rec.kg,
        rec.totalWeightKg.toFixed(2),
        rec.rate,
        gross.toFixed(2),
        labour.toFixed(2),
        net.toFixed(2)
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Delete with confirmation dialog
  const handleBulkDelete = (recordsToDelete?: DailyPurchaseRecord[]) => {
    const records = recordsToDelete || dailyPurchaseRecords.filter((r) => selectedRecordIds.has(r.id));
    if (records.length === 0) return;

    const totalBags = records.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
    const totalAmount = records.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    const farmerCount = new Set(records.map((r) => r.farmerId)).size;

    confirmDelete({
      recordNameEn: `${records.length} Daily Purchase Entries (${totalBags} Bags, ${farmerCount} Farmers)`,
      recordNamePa: `${records.length} ਖਰੀਦ ਐਂਟਰੀਆਂ (${totalBags} ਬੋਰੀਆਂ, ${farmerCount} ਕਿਸਾਨ)`,
      recordId: `BULK-${records.length}-ENTRIES`,
      itemDetails: [
        { labelEn: 'Selected Records', labelPa: 'ਚੁਣੀਆਂ ਗਈਆਂ ਐਂਟਰੀਆਂ', value: `${records.length} Records` },
        { labelEn: 'Total Farmers', labelPa: 'ਕੁੱਲ ਕਿਸਾਨ', value: `${farmerCount} Farmers` },
        { labelEn: 'Total Bags to Return', labelPa: 'ਵਾਪਸ ਹੋਣ ਵਾਲੀਆਂ ਬੋਰੀਆਂ', value: `${totalBags} Bags` },
        { labelEn: 'Total Amount', labelPa: 'ਕੁੱਲ ਰਕਮ', value: `₹${totalAmount.toLocaleString('en-IN')}` },
        {
          labelEn: 'Stock Restored',
          labelPa: 'ਸਟਾਕ ਵਾਪਸੀ',
          value: isEn
            ? 'Bags will be restored to each farmer remaining balance automatically'
            : 'ਸਾਰੀਆਂ ਬੋਰੀਆਂ ਸੰਬੰਧਿਤ ਕਿਸਾਨਾਂ ਦੇ ਬਕਾਇਆ ਸਟਾਕ ਵਿੱਚ ਵਾਪਸ ਜਮ੍ਹਾਂ ਹੋ ਜਾਣਗੀਆਂ'
        }
      ],
      onConfirm: () => {
        records.forEach((rec) => {
          deleteDailyPurchase(rec.id);
        });
        setSelectedRecordIds((prev) => {
          const next = new Set(prev);
          records.forEach((r) => next.delete(r.id));
          return next;
        });
        notifyDeleteSuccess({
          titlePa: `${records.length} ਖਰੀਦ ਐਂਟਰੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਮਿਟਾ ਦਿੱਤੀਆਂ ਗਈਆਂ`,
          titleEn: `${records.length} Purchase Records Deleted`,
          messagePa: `ਕੁੱਲ ${totalBags} ਬੋਰੀਆਂ ${farmerCount} ਕਿਸਾਨਾਂ ਦੇ ਬਕਾਇਆ ਸਟਾਕ ਵਿੱਚ ਵਾਪਸ ਜਮ੍ਹਾਂ ਕਰ ਦਿੱਤੀਆਂ ਗਈਆਂ ਹਨ।`
        });
      }
    });
  };

  // Professional PDF Export for currently viewed / filtered / selected entries
  const handleExportPdf = (recordsToExport: DailyPurchaseRecord[], dateLabel?: string, agencyLabel?: string) => {
    if (recordsToExport.length === 0) {
      notifyError({
        titlePa: 'ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ',
        titleEn: 'No records to export'
      });
      return;
    }

    const effectiveDate = dateLabel || (selectedFilterDate && selectedFilterDate !== 'ALL' ? selectedFilterDate : 'All Dates');
    const effectiveAgency = agencyLabel && agencyLabel !== 'ALL' ? agencyLabel : 'All Agencies';

    exportDailyPurchaseRegisterPDF(
      recordsToExport,
      settings,
      effectiveAgency,
      effectiveDate,
      dailyPurchaseRecords
    );
  };

  // Export selected records into professional PDF
  const handleExportSelectedPdf = () => {
    const selected = dailyPurchaseRecords.filter((r) => selectedRecordIds.has(r.id));
    if (selected.length === 0) return;
    const currentActiveAgency = viewMode === 'ALL_FARMERS' ? allFarmersAgency : dateViewAgency;
    handleExportPdf(selected, 'Selected Entries', currentActiveAgency);
  };

  // Filtered records for "All Farmers View"
  const filteredAllFarmersRecords = useMemo(() => {
    return dailyPurchaseRecords.filter((rec) => {
      // Agency filter
      if (allFarmersAgency !== 'ALL' && rec.agency !== allFarmersAgency) {
        return false;
      }

      // Text search filter
      if (allFarmersSearch.trim()) {
        const q = allFarmersSearch.toLowerCase().trim();
        const matchName = rec.farmerName?.toLowerCase().includes(q);
        const matchNamePa = rec.farmerNamePa?.toLowerCase().includes(q);
        const matchFather = rec.fatherName?.toLowerCase().includes(q);
        const matchVillage = rec.village?.toLowerCase().includes(q);
        const matchMobile = rec.mobile?.includes(q);
        const matchAgency = rec.agency?.toLowerCase().includes(q);
        const matchDate = rec.date?.includes(q);
        const matchId = rec.id?.toLowerCase().includes(q);

        if (!matchName && !matchNamePa && !matchFather && !matchVillage && !matchMobile && !matchAgency && !matchDate && !matchId) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateDiff = normalizeDateToComparable(b.date) - normalizeDateToComparable(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });
  }, [dailyPurchaseRecords, allFarmersAgency, allFarmersSearch]);

  // Totals for "All Farmers View"
  const allFarmersTotals = useMemo(() => {
    let totalNew = 0;
    let totalOld = 0;
    let totalBags = 0;
    let totalWeightKg = 0;
    let totalGross = 0;
    let totalLabour = 0;
    let totalNet = 0;
    const uniqueFarmers = new Set<string>();

    filteredAllFarmersRecords.forEach((rec) => {
      uniqueFarmers.add(rec.farmerId);
      const b = Number(rec.bags) || 0;
      const nb = Number(rec.newBags ?? b) || 0;
      const ob = Number(rec.oldBags ?? 0) || 0;
      const wKg = Number(rec.totalWeightKg) || 0;
      const gross = Number(rec.totalAmount) || 0;
      const net = rec.netAmount !== undefined ? Number(rec.netAmount) : gross;
      const labour = rec.labourDeductions?.grandTotalDeductions !== undefined
        ? Number(rec.labourDeductions.grandTotalDeductions)
        : Math.max(0, gross - net);

      totalBags += b;
      totalNew += nb;
      totalOld += ob;
      totalWeightKg += wKg;
      totalGross += gross;
      totalLabour += labour;
      totalNet += net;
    });

    const bDown = formatKgToQulKg(totalWeightKg);

    return {
      count: filteredAllFarmersRecords.length,
      farmersCount: uniqueFarmers.size,
      totalBags,
      totalNew,
      totalOld,
      totalWeightKg,
      totalQul: bDown.qtl,
      totalRemKg: bDown.kg,
      totalGross,
      totalLabour,
      totalNet
    };
  }, [filteredAllFarmersRecords]);

  // Available unique dates with record counts
  const availableDates = useMemo(() => {
    const dateCounts: { [date: string]: number } = {};
    dailyPurchaseRecords.forEach((r) => {
      dateCounts[r.date] = (dateCounts[r.date] || 0) + 1;
    });

    return Object.keys(dateCounts)
      .sort((a, b) => normalizeDateToComparable(b) - normalizeDateToComparable(a))
      .map((date) => ({
        date,
        count: dateCounts[date]
      }));
  }, [dailyPurchaseRecords]);

  // Filtered records for "Date-wise View" when a date is selected
  const filteredDateRecords = useMemo(() => {
    return dailyPurchaseRecords.filter((rec) => {
      if (selectedFilterDate !== 'ALL' && rec.date !== selectedFilterDate) {
        return false;
      }
      if (dateViewAgency !== 'ALL' && rec.agency !== dateViewAgency) {
        return false;
      }
      if (dateViewSearch.trim()) {
        const q = dateViewSearch.toLowerCase().trim();
        const matchName = rec.farmerName?.toLowerCase().includes(q);
        const matchNamePa = rec.farmerNamePa?.toLowerCase().includes(q);
        const matchFather = rec.fatherName?.toLowerCase().includes(q);
        const matchVillage = rec.village?.toLowerCase().includes(q);
        const matchMobile = rec.mobile?.includes(q);
        const matchAgency = rec.agency?.toLowerCase().includes(q);
        if (!matchName && !matchNamePa && !matchFather && !matchVillage && !matchMobile && !matchAgency) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      const dateDiff = normalizeDateToComparable(b.date) - normalizeDateToComparable(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id);
    });
  }, [dailyPurchaseRecords, selectedFilterDate, dateViewAgency, dateViewSearch]);

  // Totals for selected date in "Date-wise View"
  const dateViewTotals = useMemo(() => {
    let totalNew = 0;
    let totalOld = 0;
    let totalBags = 0;
    let totalWeightKg = 0;
    let totalGross = 0;
    let totalLabour = 0;
    let totalNet = 0;
    const uniqueFarmers = new Set<string>();

    filteredDateRecords.forEach((rec) => {
      uniqueFarmers.add(rec.farmerId);
      const b = Number(rec.bags) || 0;
      const nb = Number(rec.newBags ?? b) || 0;
      const ob = Number(rec.oldBags ?? 0) || 0;
      const wKg = Number(rec.totalWeightKg) || 0;
      const gross = Number(rec.totalAmount) || 0;
      const net = rec.netAmount !== undefined ? Number(rec.netAmount) : gross;
      const labour = rec.labourDeductions?.grandTotalDeductions !== undefined
        ? Number(rec.labourDeductions.grandTotalDeductions)
        : Math.max(0, gross - net);

      totalBags += b;
      totalNew += nb;
      totalOld += ob;
      totalWeightKg += wKg;
      totalGross += gross;
      totalLabour += labour;
      totalNet += net;
    });

    const bDown = formatKgToQulKg(totalWeightKg);

    return {
      count: filteredDateRecords.length,
      farmersCount: uniqueFarmers.size,
      totalBags,
      totalNew,
      totalOld,
      totalWeightKg,
      totalQul: bDown.qtl,
      totalRemKg: bDown.kg,
      totalGross,
      totalLabour,
      totalNet
    };
  }, [filteredDateRecords]);

  return (
    <div className="space-y-6">
      {/* ==================================================
          TOP HEADER & CONTROLS: AGENCY + DATE
          ================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>ਰੋਜ਼ਾਨਾ ਖਰੀਦ (Daily Purchase)</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ਸਰਕਾਰੀ / ਪ੍ਰਾਈਵੇਟ ਖਰੀਦ
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀਆਂ ਦੀ ਮਲਟੀ ਕਿਸਾਨ ਖਰੀਦ ਐਂਟਰੀ ਅਤੇ ਮਿਤੀ-ਵਾਰ ਰਿਕਾਰਡ
              </p>
            </div>
          </div>

          {/* Rate indicator badge */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Scale className="w-4 h-4 text-emerald-600" />
            <span className="text-slate-600 font-bold">{isEn ? 'Govt Rate:' : 'ਸਰਕਾਰੀ ਭਾਅ:'}</span>
            <span className="font-mono font-black text-emerald-950">₹{customRate} / {isEn ? 'Qtl' : 'ਕੁਇੰਟਲ'}</span>
            <span className="text-slate-400 text-[10px]">({isEn ? '37.50 Kg / bag' : '37.50 ਕਿਲੋ ਪ੍ਰਤੀ ਬੋਰੀ'})</span>
          </div>
        </div>

        {/* Agency and Date Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Agency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isEn ? 'Procurement Agency:' : 'ਖਰੀਦ ਏਜੰਸੀ ਚੁਣੋ (Procurement Agency):'}</span>
            </label>
            <SearchableSelect
              id="daily-purchase-agency"
              value={fixedAgency || ''}
              onChange={(val) => setFixedAgency(val)}
              options={agencyOptions}
              placeholder={isEn ? "Select agency..." : "ਏਜੰਸੀ ਚੁਣੋ..."}
              searchPlaceholder={isEn ? "Search agency..." : "ਏਜੰਸੀ ਖੋਜੋ..."}
              emptyMessage={isEn ? "No agency found" : "ਕੋਈ ਏਜੰਸੀ ਨਹੀਂ ਮਿਲੀ"}
            />
          </div>

          {/* Date Selector */}
          <div>
            <DateInput
              value={purchaseDate}
              onChange={setPurchaseDate}
              label={isEn ? "Purchase Date" : "ਖਰੀਦ ਮਿਤੀ (Purchase Date)"}
              required
            />
          </div>

          {/* Quick Stats Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs sm:col-span-2 lg:col-span-1">
            <div>
              <span className="text-[10px] text-emerald-800 font-bold block">
                {isEn ? 'Total Purchase Records:' : 'ਕੁੱਲ ਰਜਿਸਟਰਡ ਖਰੀਦ:'}
              </span>
              <span className="text-base font-mono font-black text-emerald-950">
                {dailyPurchaseRecords.length} {isEn ? 'Records' : 'ਰਿਕਾਰਡ'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-800 font-bold block">
                {isEn ? 'Total Purchased Bags:' : 'ਕੁੱਲ ਖਰੀਦ ਬੋਰੀਆਂ:'}
              </span>
              <span className="text-base font-mono font-black text-emerald-950">
                {dailyPurchaseRecords.reduce((sum, r) => sum + (Number(r.bags) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Labour Auto-Calculation Selector */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800">ਮਜ਼ਦੂਰੀ ਕਟੌਤੀ ਆਟੋ-ਕੈਲਕੂਲੇਸ਼ਨ (Labour Auto-Calculation):</span>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">• ਚੋਣ ਅਨੁਸਾਰ ਆਟੋਮੈਟਿਕ ਕਟੌਤੀ</span>
            </div>
            {/* Unit Toggle: Per Qtl vs Per Bag */}
            <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded-lg text-xs self-start sm:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setLabourUnit('PER_QTL')}
                className={`px-2.5 py-1 rounded font-bold transition text-xs ${
                  labourUnit === 'PER_QTL'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ਪ੍ਰਤੀ ਕੁਇੰਟਲ (/ Qtl)
              </button>
              <button
                type="button"
                onClick={() => setLabourUnit('PER_BAG')}
                className={`px-2.5 py-1 rounded font-bold transition text-xs ${
                  labourUnit === 'PER_BAG'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ਪ੍ਰਤੀ ਬੋਰੀ (/ Bag)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'NONE', label: 'ਬਿਨਾਂ ਮਜ਼ਦੂਰੀ (No Labour)', rate: 0 },
              { id: 'PAKKI', label: `ਪੱਕੀ ਮਜ਼ਦੂਰੀ (Pakki ₹${settings.defaultPakkiLabourRate || 7})`, rate: settings.defaultPakkiLabourRate || 7 },
              { id: 'DOUBLE', label: `ਪੱਕਾ ਡਬਲ (Double ₹${settings.defaultPakkaDoubleLabourRate || 14})`, rate: settings.defaultPakkaDoubleLabourRate || 14 },
              { id: 'SUKKI', label: `ਸੁੱਕੀ (Sukki ₹${settings.defaultSukhiLabourRate || 5})`, rate: settings.defaultSukhiLabourRate || 5 },
              { id: 'CUSTOM', label: 'ਹੋਰ / ਕਸਟਮ (Custom)', rate: customLabourRate }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLabourType(opt.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                  labourType === opt.id
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}
              >
                {opt.label}
              </button>
            ))}

            {labourType === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-xs font-bold text-slate-700">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={customLabourRate}
                  onChange={(e) => setCustomLabourRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Rate"
                  className="w-20 bg-white border border-emerald-400 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-500 font-bold">
                  {labourUnit === 'PER_QTL' ? '/ Qtl' : '/ Bag'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================
          MULTI FARMER PURCHASE ENTRY SECTION
          Table Columns ONLY:
          Sr No | Farmer Name | Father Name | Mobile | Village | Bags | Qul
          Batch Number completely removed!
          ================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>ਮਲਟੀ ਕਿਸਾਨ ਖਰੀਦ ਐਂਟਰੀ (Multi Farmer Purchase Entry)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              ਕਿਸਾਨ ਚੁਣੋ, ਬੋਰੀਆਂ ਦਰਜ ਕਰੋ ਅਤੇ ਕੁਇੰਟਲ ਆਪਣੇ ਆਪ ਕੈਲਕੁਲੇਟ ਹੋ ਜਾਵੇਗਾ
            </p>
          </div>

          {/* Quick Add Farmer Button */}
          <button
            type="button"
            onClick={addRow}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ ਕਿਸਾਨ ਕਤਾਰ ਸ਼ਾਮਲ ਕਰੋ (+ Add Row)</span>
          </button>
        </div>

        {/* Top Quick Search Bar to quickly add farmers */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ਕਿਸਾਨ ਖੋਜੋ ਤੇ ਸਿੱਧਾ ਕਤਾਰ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ (Search Farmer by Name, Village, ID, Mobile)..."
              value={farmerSearchQuery || ''}
              onChange={(e) => {
                setFarmerSearchQuery(e.target.value);
                setShowFarmerSearchDropdown(true);
              }}
              onFocus={() => setShowFarmerSearchDropdown(true)}
              className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
            />
            {farmerSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setFarmerSearchQuery('');
                  setShowFarmerSearchDropdown(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Search Dropdown */}
          {showFarmerSearchDropdown && farmerSearchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto border border-emerald-300 rounded-xl bg-white shadow-xl divide-y divide-slate-100">
              {farmers
                .filter((f) => {
                  const q = farmerSearchQuery.toLowerCase().trim();
                  const cleanNums = q.replace(/[^0-9]/g, '');
                  return (
                    f.farmerName.toLowerCase().includes(q) ||
                    (f.farmerNamePa && f.farmerNamePa.toLowerCase().includes(q)) ||
                    (f.fatherName && f.fatherName.toLowerCase().includes(q)) ||
                    f.village.toLowerCase().includes(q) ||
                    (f.villagePa && f.villagePa.toLowerCase().includes(q)) ||
                    f.id.toLowerCase().includes(q) ||
                    (cleanNums && f.mobile && f.mobile.includes(cleanNums))
                  );
                })
                .map((f) => {
                  const summary = getFarmerPurchaseSummary(f.id);
                  return (
                    <div
                      key={f.id}
                      className="p-2.5 hover:bg-emerald-50 flex items-center justify-between gap-2 cursor-pointer transition"
                      onClick={() => addFarmerRow(f.id)}
                    >
                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                            {f.id}
                          </span>
                          <span>{f.farmerName}</span>
                          <span className="text-slate-500 font-normal">s/o {f.fatherName}</span>
                          <span className="text-emerald-700 font-bold">• {f.village}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {f.farmerNamePa} ਸ/ਓ {f.fatherNamePa || f.fatherName} • {f.villagePa || f.village} | ਮੋਬਾਈਲ: {f.mobile}
                        </div>
                        <div className="text-[10px] text-emerald-800 font-bold">
                          {summary.isLinkedFarmer ? (
                            <span>
                              ਮੁੱਖ ਕਿਸਾਨ ਪੂਲ: {summary.linkedToMainFarmerName} • ਬਾਕੀ ਸਟਾਕ: {summary.remainingBags} ਬੋਰੀਆਂ
                            </span>
                          ) : (
                            <span>
                              ਮੰਡੀ ਆਮਦ: {summary.mandiArrivalBags} ਬੋਰੀਆਂ • ਬਾਕੀ ਸਟਾਕ: {summary.remainingBags} ਬੋਰੀਆਂ
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addFarmerRow(f.id);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-xs shadow-2xs"
                      >
                        + ਸ਼ਾਮਲ ਕਰੋ
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Error Notification */}
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-bold">{formError}</span>
          </div>
        )}

        {/* MULTI FARMER PURCHASE TABLE
            Columns ONLY:
            Sr No | Farmer Name | Father Name | Mobile | Village | Bags | Qul
        */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
          {/* Table Header Bar with Add Row action */}
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {isEn ? 'Daily Purchase Entry Table' : 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਐਂਟਰੀ ਟੇਬਲ'}
              </span>
              <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                {rows.length} {isEn ? 'Rows' : 'ਲਾਈਨਾਂ'}
              </span>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              <span>Add Row / ਹੋਰ ਲਾਈਨ ਜੋੜੋ</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">{isEn ? 'Sr No' : 'ਲੜੀ ਨੰ'}</th>
                  <th className="py-2.5 px-3 min-w-[240px]">{isEn ? 'Farmer Name' : 'Farmer Name (ਕਿਸਾਨ ਦਾ ਨਾਂ)'}</th>
                  <th className="py-2.5 px-3 min-w-[130px]">{isEn ? 'Father Name' : 'Father Name (ਪਿਤਾ ਦਾ ਨਾਂ)'}</th>
                  <th className="py-2.5 px-3 min-w-[100px]">{isEn ? 'Mobile' : 'Mobile (ਮੋਬਾਈਲ)'}</th>
                  <th className="py-2.5 px-3 min-w-[110px]">{isEn ? 'Village' : 'Village (ਪਿੰਡ)'}</th>
                  <th className="py-2.5 px-2 w-28 text-center bg-amber-50 text-amber-950 font-black">
                    {isEn ? 'New Juths' : 'New Juths (ਨਵਾਂ)'}
                  </th>
                  <th className="py-2.5 px-2 w-28 text-center bg-orange-50 text-orange-950 font-black">
                    {isEn ? 'Old Juths' : 'Old Juths (ਪੁਰਾਣਾ)'}
                  </th>
                  <th className="py-2.5 px-2 w-28 text-center bg-emerald-50 text-emerald-950 font-black">
                    {isEn ? 'Total Bags' : 'Total Bags (ਕੁੱਲ)'}
                  </th>
                  <th className="py-2.5 px-3 min-w-[130px] text-right bg-indigo-50 text-indigo-950 font-black">
                    {isEn ? 'Weight (Qtl + Kg)' : 'Weight (ਕੁਇੰਟਲ + ਕਿਲੋ)'}
                  </th>
                  <th className="py-2.5 px-2 w-10 text-center">{isEn ? 'Del' : 'ਹਟਾਓ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rows.map((row, index) => {
                  const selectedFarmer = farmers.find((f) => f.id === row.farmerId);
                  const summary = selectedFarmer ? getFarmerPurchaseSummary(selectedFarmer.id) : null;
                  const availableForThisRow = getAvailableBalanceForRow(index, row.farmerId);
                  const bagsCount = Math.max(0, Number(row.bags) || 0);
                  const weightKg = bagsCount * FIXED_BAG_WEIGHT_KG;
                  const bDown = formatKgToQulKg(weightKg);
                  const isOverLimit = row.farmerId && bagsCount > availableForThisRow;

                  return (
                    <tr key={row.rowId} className={`hover:bg-slate-50/70 ${isOverLimit ? 'bg-rose-50/40' : ''}`}>
                      {/* 1. Sr No - Generated automatically 1, 2, 3, 4, 5... Never typed manually */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600 bg-slate-50/60 select-none">
                        {index + 1}
                      </td>

                      {/* 2. Farmer Name */}
                      <td className="py-2.5 px-3 min-w-[260px]">
                        <SearchableSelect
                          id={`dp-row-farmer-${row.rowId}`}
                          value={row.farmerId || ''}
                          onChange={(val) => updateRow(row.rowId, 'farmerId', val)}
                          options={farmerOptions}
                          placeholder={isEn ? "Select farmer..." : "ਕਿਸਾਨ ਚੁਣੋ..."}
                          searchPlaceholder={isEn ? "Search farmer..." : "ਕਿਸਾਨ ਖੋਜੋ..."}
                          emptyMessage={isEn ? "No farmer found" : "ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ"}
                        />

                        {/* Continuous Balance Display */}
                        {summary && (
                          <div className="mt-1 text-[10px] p-1.5 rounded-md border space-y-0.5 bg-emerald-50/60 border-emerald-200">
                            {summary.isLinkedFarmer ? (
                              <div className="text-emerald-900">
                                <span className="font-bold">{isEn ? 'Main Farmer Pool: ' : 'ਮੁੱਖ ਕਿਸਾਨ ਪੂਲ: '}</span>
                                <span className="font-black">{summary.linkedToMainFarmerName}</span>
                                <span className="block text-[9px] text-emerald-800">
                                  {isEn ? `Arrival: ${summary.mandiArrivalBags} bags • Purchased: ${summary.alreadyPurchasedBags} • ` : `ਮੁੱਖ ਆਮਦ: ${summary.mandiArrivalBags} ਬੋਰੀਆਂ • ਕੁੱਲ ਖਰੀਦ: ${summary.alreadyPurchasedBags} • `}
                                  <strong className="text-emerald-950 font-black"> {isEn ? `Remaining: ${summary.remainingBags}` : `ਬਾਕੀ ਸਟਾਕ: ${summary.remainingBags}`}</strong>
                                </span>
                              </div>
                            ) : (
                              <div className="text-slate-800">
                                <span>{isEn ? 'Arrival: ' : 'ਮੰਡੀ ਆਮਦ: '}<strong>{summary.mandiArrivalBags}</strong></span>
                                <span className="mx-1">•</span>
                                <span>{isEn ? 'Purchased: ' : 'ਪਹਿਲਾਂ ਖਰੀਦ: '}<strong>{summary.alreadyPurchasedBags}</strong></span>
                                <span className="mx-1">•</span>
                                <span>{isEn ? 'Remaining: ' : 'ਕੁੱਲ ਬਾਕੀ: '}<strong>{summary.remainingBags}</strong></span>
                              </div>
                            )}
                            <div className="pt-0.5 border-t border-emerald-200 flex items-center justify-between">
                              <span className="text-slate-600 font-bold">{isEn ? 'Available for Row:' : 'ਇਸ ਕਤਾਰ ਲਈ ਉਪਲਬਧ (Max for row):'}</span>
                              <span className={`font-mono font-black ${availableForThisRow > 0 ? 'text-emerald-950' : 'text-rose-600'}`}>
                                {availableForThisRow} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
                              </span>
                            </div>
                            {isOverLimit && (
                              <div className="text-rose-700 bg-rose-100/90 border border-rose-300 px-1.5 py-0.5 rounded font-black text-[9.5px]">
                                {isEn ? `Excess purchase! Max ${availableForThisRow} bags possible` : `ਵੱਧ ਖਰੀਦ! ਵੱਧ ਤੋਂ ਵੱਧ ${availableForThisRow} ਬੋਰੀਆਂ ਸੰਭਵ ਹਨ`}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 3. Father Name (Auto-filled) */}
                      <td className="py-2.5 px-3 text-slate-800">
                        {selectedFarmer?.fatherName ? (
                          <div>
                            <span className="font-bold">{selectedFarmer.fatherName}</span>
                            {selectedFarmer.fatherNamePa && (
                              <span className="block text-[10px] text-slate-500">{selectedFarmer.fatherNamePa}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* 4. Mobile (Auto-filled) */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {selectedFarmer?.mobile || <span className="text-slate-400 italic">—</span>}
                      </td>

                      {/* 5. Village (Auto-filled) */}
                      <td className="py-2.5 px-3 text-slate-800">
                        {selectedFarmer?.village ? (
                          <div>
                            <span className="font-bold">{selectedFarmer.village}</span>
                            {selectedFarmer.villagePa && (
                              <span className="block text-[10px] text-slate-500">{selectedFarmer.villagePa}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* 6. New Juths Input (wide enough for 1500) */}
                      <td className="py-2.5 px-2 bg-amber-50/30 text-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.newBags || ''}
                          onChange={(e) => updateRow(row.rowId, 'newBags', e.target.value)}
                          className="w-28 min-w-[6.5rem] mx-auto text-center bg-white border border-amber-400 rounded p-1 text-sm font-mono font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                        />
                      </td>

                      {/* 7. Old Juths Input (wide enough for 1500) */}
                      <td className="py-2.5 px-2 bg-orange-50/30 text-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.oldBags || ''}
                          onChange={(e) => updateRow(row.rowId, 'oldBags', e.target.value)}
                          className="w-28 min-w-[6.5rem] mx-auto text-center bg-white border border-orange-400 rounded p-1 text-sm font-mono font-black text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                        />
                      </td>

                      {/* 8. Total Bags (New + Old) */}
                      <td className="py-2.5 px-2 bg-emerald-50/40 text-center font-mono font-black text-emerald-950 text-sm">
                        {bagsCount}
                      </td>

                      {/* 9. Weight (Qul + Kg) - Never kg only */}
                      <td className="py-2.5 px-3 bg-indigo-50/40 text-right font-mono font-black text-indigo-950">
                        {bDown.qtl} Qul {bDown.kg} Kg
                      </td>

                      {/* Action: Remove */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.rowId)}
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                          title="ਹਟਾਓ (Remove)"
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

          {/* Table Bottom Action Bar: Required Summary Box (Total Bags, Purchase Qtl, Gross Amount, Total Labour, Net Amount) + Save Button */}
          <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
              <div className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
                <span className="text-slate-500 font-bold block text-[10px]">ਕੁੱਲ ਕਿਸਾਨ (Farmers)</span>
                <span className="font-mono font-black text-slate-900 text-sm">{rowTotals.validFarmersCount}</span>
              </div>
              <div className="bg-emerald-100/90 border border-emerald-300 px-2.5 py-1.5 rounded-lg shadow-2xs">
                <span className="text-emerald-800 font-bold block text-[10px]">ਕੁੱਲ ਬੋਰੀਆਂ (Total Bags)</span>
                <span className="font-mono font-black text-emerald-950 text-sm">
                  {rowTotals.totalBags} <span className="text-[10px] font-normal text-emerald-800">(ਨ: {rowTotals.totalNewBags}, ਪੁ: {rowTotals.totalOldBags})</span>
                </span>
              </div>
              <div className="bg-indigo-100/90 border border-indigo-300 px-2.5 py-1.5 rounded-lg shadow-2xs">
                <span className="text-indigo-800 font-bold block text-[10px]">ਖਰੀਦ ਕੁਇੰਟਲ (Purchase Qtl)</span>
                <span className="font-mono font-black text-indigo-950 text-sm">{rowTotals.qul} Qul {rowTotals.kg} Kg</span>
              </div>
              <div className="bg-blue-100/90 border border-blue-300 px-2.5 py-1.5 rounded-lg shadow-2xs">
                <span className="text-blue-800 font-bold block text-[10px]">ਗ੍ਰਾਸ ਰਕਮ (Gross Amount)</span>
                <span className="font-mono font-black text-blue-950 text-sm">₹{rowTotals.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-rose-100/90 border border-rose-300 px-2.5 py-1.5 rounded-lg shadow-2xs">
                <span className="text-rose-800 font-bold block text-[10px]">ਕੁੱਲ ਮਜ਼ਦੂਰੀ (Total Labour)</span>
                <span className="font-mono font-black text-rose-950 text-sm">
                  {rowTotals.totalLabour > 0 ? `-₹${rowTotals.totalLabour.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
              <div className="bg-emerald-700 text-white border border-emerald-800 px-3 py-1.5 rounded-lg shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-emerald-200 font-bold block text-[10px]">ਸ਼ੁੱਧ ਰਕਮ (Net Amount)</span>
                <span className="font-mono font-black text-white text-base">₹{rowTotals.netAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={addRow}
                className="flex-1 lg:flex-initial bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Add Row / ਹੋਰ ਲਾਈਨ ਜੋੜੋ</span>
              </button>
              <button
                type="button"
                onClick={handleSavePurchases}
                disabled={isSaving || rowTotals.totalBags <= 0}
                className="flex-1 lg:flex-initial bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-5 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ...' : 'ਖਰੀਦ ਸੇਵ ਕਰੋ (Save Purchases)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          4. ENHANCED DAILY PURCHASE RECORDS: ALL FARMERS VIEW & DATE-WISE VIEW
          - All Farmers View: all entries across all farmers with search & agency filter
          - Date-wise View: with Date Picker / Filter and date chips
          - Professional PDF Export for currently viewed / filtered / selected entries
          - Multi-select and Bulk Delete with confirmation & auto stock restoration
          - Keep existing calculations, data, Parchi Number, Edit, labour & Supabase sync
          ================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        {/* Top Header & View Navigation Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>{isEn ? 'Daily Purchase Register & Records' : 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਰਜਿਸਟਰ ਅਤੇ ਰਿਕਾਰਡ'}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {isEn
                ? 'View all farmers entries, filter by date, professional PDF export, and multi-select bulk delete'
                : 'ਸਾਰੇ ਕਿਸਾਨਾਂ ਦੀਆਂ ਖਰੀਦ ਐਂਟਰੀਆਂ ਵੇਖੋ, ਮਿਤੀ ਅਨੁਸਾਰ ਫਿਲਟਰ ਕਰੋ, ਪੇਸ਼ੇਵਰ PDF ਐਕਸਪੋਰਟ ਅਤੇ ਬਲਕ ਡਿਲੀਟ ਕਰੋ'}
            </p>
          </div>

          {/* View Mode Toggle: All Farmers View vs Date-wise View */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setViewMode('ALL_FARMERS');
                clearSelection();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === 'ALL_FARMERS'
                  ? 'bg-white text-emerald-950 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isEn ? 'All Farmers View' : 'ਸਾਰੇ ਕਿਸਾਨ (All Farmers View)'}</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                {dailyPurchaseRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('DATE_WISE');
                clearSelection();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 ${
                viewMode === 'DATE_WISE'
                  ? 'bg-white text-indigo-950 shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isEn ? 'Date-wise View' : 'ਮਿਤੀ-ਵਾਰ (Date-wise View)'}</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                {availableDates.length} {isEn ? 'Dates' : 'ਮਿਤੀਆਂ'}
              </span>
            </button>
          </div>
        </div>

        {/* Multi-Select Floating / Sticky Action Bar (appears when 1 or more entries selected) */}
        {selectedRecordIds.size > 0 && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3 rounded-xl shadow-md border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-300 border border-indigo-400/30">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black flex items-center gap-2">
                  <span>
                    {selectedRecordIds.size} {isEn ? 'Entries Selected' : 'ਖਰੀਦ ਐਂਟਰੀਆਂ ਚੁਣੀਆਂ ਗਈਆਂ'}
                  </span>
                  {(() => {
                    const selRecs = dailyPurchaseRecords.filter((r) => selectedRecordIds.has(r.id));
                    const selBags = selRecs.reduce((sum, r) => sum + (Number(r.bags) || 0), 0);
                    const selAmt = selRecs.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
                    return (
                      <span className="text-[11px] font-normal text-slate-300">
                        (ਕੁੱਲ: <strong className="text-emerald-400 font-mono">{selBags}</strong> ਬੋਰੀਆਂ • <strong className="text-amber-300 font-mono">₹{selAmt.toLocaleString('en-IN')}</strong>)
                      </span>
                    );
                  })()}
                </div>
                <div className="text-[10px] text-slate-400">
                  {isEn ? 'Bulk delete or export PDF for selected records' : 'ਚੁਣੀਆਂ ਹੋਈਆਂ ਐਂਟਰੀਆਂ ਨੂੰ ਇੱਕੋ ਵਾਰ ਹਟਾਓ ਜਾਂ PDF ਐਕਸਪੋਰਟ ਕਰੋ'}
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportSelectedPdf}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition"
                title="ਚੁਣੀਆਂ ਹੋਈਆਂ ਐਂਟਰੀਆਂ ਦੀ PDF ਡਾਊਨਲੋਡ ਕਰੋ"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>PDF ({selectedRecordIds.size})</span>
              </button>

              <button
                type="button"
                onClick={() => handleBulkDelete()}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition"
                title="ਚੁਣੀਆਂ ਹੋਈਆਂ ਐਂਟਰੀਆਂ ਹਟਾਓ (Bulk Delete)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-200" />
                <span>{isEn ? `Delete Selected (${selectedRecordIds.size})` : `ਚੁਣੇ ਹੋਏ ਮਿਟਾਓ (${selectedRecordIds.size})`}</span>
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
              >
                {isEn ? 'Deselect All' : 'ਅਣ-ਚੁਣੇ ਕਰੋ'}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================
            TAB 1: ALL FARMERS VIEW
            ================================================== */}
        {viewMode === 'ALL_FARMERS' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
                {/* Search text box */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={allFarmersSearch}
                    onChange={(e) => setAllFarmersSearch(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Search farmer name, father, village, mobile, agency, date...'
                        : 'ਕਿਸਾਨ ਦਾ ਨਾਂ, ਪਿਤਾ, ਪਿੰਡ, ਮੋਬਾਈਲ, ਏਜੰਸੀ, ਮਿਤੀ ਰਾਹੀਂ ਖੋਜੋ...'
                    }
                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  {allFarmersSearch && (
                    <button
                      type="button"
                      onClick={() => setAllFarmersSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Agency filter dropdown */}
                <div className="w-full sm:w-52">
                  <select
                    value={allFarmersAgency}
                    onChange={(e) => setAllFarmersAgency(e.target.value)}
                    className="w-full py-1.5 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                  >
                    <option value="ALL">ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)</option>
                    {agencies.map((ag) => (
                      <option key={ag.id} value={ag.nameEn}>
                        {ag.nameEn} ({ag.namePa || ag.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                {(allFarmersSearch || allFarmersAgency !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAllFarmersSearch('');
                      setAllFarmersAgency('ALL');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold px-2 py-1.5 hover:bg-slate-200/60 rounded-lg transition shrink-0"
                    title="ਫਿਲਟਰ ਸਾਫ਼ ਕਰੋ"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ਰੀਸੈੱਟ</span>
                  </button>
                )}
              </div>

              {/* Action Buttons: PDF Export & Excel Export */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleExportPdf(
                      filteredAllFarmersRecords,
                      allFarmersSearch ? 'Filtered Records' : 'All Dates',
                      allFarmersAgency
                    )
                  }
                  disabled={filteredAllFarmersRecords.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                  title="ਮੌਜੂਦਾ ਫਿਲਟਰ ਕੀਤੇ ਰਿਕਾਰਡਾਂ ਦੀ ਪ੍ਰੋਫੈਸ਼ਨਲ PDF ਰਜਿਸਟਰ ਡਾਊਨਲੋਡ ਕਰੋ"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isEn ? 'PDF Export' : 'ਪੇਸ਼ੇਵਰ PDF ਐਕਸਪੋਰਟ'}</span>
                  <span className="text-[10px] font-mono font-normal bg-slate-700 text-emerald-300 px-1.5 py-0.2 rounded-full">
                    {filteredAllFarmersRecords.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => exportRecordsCsv('All_Farmers_Purchase_Register', filteredAllFarmersRecords)}
                  disabled={filteredAllFarmersRecords.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                  title="Excel / CSV ਡਾਊਨਲੋਡ ਕਰੋ"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            {/* All Farmers Summary Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <span className="text-slate-500 text-[10px] font-bold block">{isEn ? 'Entries' : 'ਕੁੱਲ ਐਂਟਰੀਆਂ'}</span>
                <span className="font-mono font-black text-slate-900 text-sm">{allFarmersTotals.count}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <span className="text-slate-500 text-[10px] font-bold block">{isEn ? 'Unique Farmers' : 'ਕੁੱਲ ਕਿਸਾਨ'}</span>
                <span className="font-mono font-black text-indigo-900 text-sm">{allFarmersTotals.farmersCount}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <span className="text-emerald-800 text-[10px] font-bold block">{isEn ? 'Total Bags' : 'ਕੁੱਲ ਬੋਰੀਆਂ'}</span>
                <span className="font-mono font-black text-emerald-950 text-sm">
                  {allFarmersTotals.totalBags.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">
                  ਨ: {allFarmersTotals.totalNew} • ਪੁ: {allFarmersTotals.totalOld}
                </span>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl">
                <span className="text-indigo-800 text-[10px] font-bold block">{isEn ? 'Total Weight' : 'ਕੁੱਲ ਵਜ਼ਨ'}</span>
                <span className="font-mono font-black text-indigo-950 text-sm">
                  {allFarmersTotals.totalQul} Qtl {allFarmersTotals.totalRemKg} Kg
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl">
                <span className="text-blue-800 text-[10px] font-bold block">{isEn ? 'Gross Amount' : 'ਗ੍ਰਾਸ ਰਕਮ'}</span>
                <span className="font-mono font-black text-blue-950 text-sm">
                  ₹{allFarmersTotals.totalGross.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                <span className="text-rose-800 text-[10px] font-bold block">{isEn ? 'Labour Deduction' : 'ਕੁੱਲ ਮਜ਼ਦੂਰੀ'}</span>
                <span className="font-mono font-black text-rose-950 text-sm">
                  {allFarmersTotals.totalLabour > 0 ? `-₹${allFarmersTotals.totalLabour.toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
              <div className="bg-emerald-100 border border-emerald-300 p-2.5 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-emerald-900 text-[10px] font-bold block">{isEn ? 'Net Amount' : 'ਸ਼ੁੱਧ ਰਕਮ'}</span>
                <span className="font-mono font-black text-emerald-950 text-base">
                  ₹{allFarmersTotals.totalNet.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Table: All Farmers Daily Purchase Entries */}
            {filteredAllFarmersRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                <div className="text-xs font-bold text-slate-600">
                  {dailyPurchaseRecords.length === 0
                    ? 'ਕੋਈ ਖਰੀਦ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ'
                    : 'ਫਿਲਟਰ ਅਨੁਸਾਰ ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {dailyPurchaseRecords.length === 0
                    ? 'ਉੱਪਰ ਦਿੱਤੇ ਫਾਰਮ ਰਾਹੀਂ ਖਰੀਦ ਐਂਟਰੀ ਦਰਜ ਕਰੋ'
                    : 'ਖੋਜ ਸ਼ਬਦ ਜਾਂ ਏਜੰਸੀ ਫਿਲਟਰ ਬਦਲ ਕੇ ਵੇਖੋ'}
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                      <tr>
                        {/* Multi-Select Select All Checkbox */}
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredAllFarmersRecords.length > 0 &&
                              filteredAllFarmersRecords.every((r) => selectedRecordIds.has(r.id))
                            }
                            onChange={() => toggleSelectAll(filteredAllFarmersRecords)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title="ਸਾਰੇ ਚੁਣੋ / ਅਣ-ਚੁਣੇ ਕਰੋ (Select / Deselect All)"
                          />
                        </th>
                        <th className="py-2.5 px-2 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">{isEn ? 'Date' : 'ਮਿਤੀ'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Farmer Name' : 'ਕਿਸਾਨ ਦਾ ਨਾਂ'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Father Name' : 'ਪਿਤਾ ਦਾ ਨਾਂ'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Mobile' : 'ਮੋਬਾਈਲ'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Village' : 'ਪਿੰਡ'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Agency' : 'ਖਰੀਦ ਏਜੰਸੀ'}</th>
                        <th className="py-2.5 px-3 text-center bg-emerald-50/50">{isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}</th>
                        <th className="py-2.5 px-3 text-right bg-indigo-50/50">{isEn ? 'Weight' : 'ਵਜ਼ਨ (ਕੁਇੰਟਲ/ਕਿਲੋ)'}</th>
                        <th className="py-2.5 px-2 text-right">{isEn ? 'Rate' : 'ਭਾਅ (₹)'}</th>
                        <th className="py-2.5 px-3 text-right">{isEn ? 'Gross (₹)' : 'ਗ੍ਰਾਸ ਰਕਮ (₹)'}</th>
                        <th className="py-2.5 px-3 text-right bg-rose-50/40">{isEn ? 'Labour' : 'ਮਜ਼ਦੂਰੀ (₹)'}</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-50/60">{isEn ? 'Net (₹)' : 'ਸ਼ੁੱਧ ਰਕਮ (₹)'}</th>
                        <th className="py-2.5 px-3 text-center w-28">{isEn ? 'Actions' : 'ਕਾਰਵਾਈ'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredAllFarmersRecords.map((rec, idx) => {
                        const isSelected = selectedRecordIds.has(rec.id);
                        const gross = Number(rec.totalAmount) || 0;
                        const net = rec.netAmount !== undefined ? Number(rec.netAmount) : gross;
                        const labour =
                          rec.labourDeductions?.grandTotalDeductions !== undefined
                            ? Number(rec.labourDeductions.grandTotalDeductions)
                            : Math.max(0, gross - net);

                        return (
                          <tr
                            key={rec.id}
                            className={`transition hover:bg-slate-50/80 ${
                              isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                            }`}
                          >
                            {/* Row Multi-select Checkbox */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectRecord(rec.id)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-xs text-slate-700 whitespace-nowrap">{rec.date}</td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">{rec.farmerName}</div>
                              {rec.farmerNamePa && rec.farmerNamePa !== rec.farmerName && (
                                <div className="text-[10px] text-slate-500">{rec.farmerNamePa}</div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600">{rec.fatherName || '-'}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{rec.mobile || '-'}</td>
                            <td className="py-2 px-3 text-slate-600">{rec.village || '-'}</td>
                            <td className="py-2 px-3">
                              <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {rec.agency}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center bg-emerald-50/50">
                              <span className="font-mono font-black text-emerald-950 text-xs">
                                {rec.bags}
                              </span>
                              {(rec.newBags !== undefined || rec.oldBags !== undefined) && (
                                <span className="text-[10px] text-emerald-700 block font-normal">
                                  ({rec.newBags ?? rec.bags} ਨ / {rec.oldBags ?? 0} ਪੁ)
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono bg-indigo-50/50 text-indigo-950 font-bold whitespace-nowrap">
                              {rec.qul} Qtl {rec.kg} Kg
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">₹{rec.rate}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                              ₹{gross.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-700 bg-rose-50/40">
                              {labour > 0 ? `-₹${labour.toLocaleString('en-IN')}` : '₹0'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/60">
                              ₹{net.toLocaleString('en-IN')}
                            </td>
                            {/* Actions */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setViewRecord(rec)}
                                  className="p-1 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded transition"
                                  title="ਵੇਖੋ (View Details)"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => exportDailyPurchaseVoucherPDF(rec, settings)}
                                  className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 rounded transition"
                                  title="ਖਰੀਦ ਵਾਊਚਰ PDF"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditRecord(rec)}
                                  className="p-1 hover:bg-amber-50 text-amber-600 hover:text-amber-800 rounded transition"
                                  title="ਸੋਧੋ (Edit Record)"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(rec)}
                                  className="p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded transition"
                                  title="ਮਿਟਾਓ (Delete Record)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Table Grand Totals Footer */}
                    <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 shadow-md">
                      <tr>
                        <td colSpan={8} className="py-2.5 px-3 text-right">
                          {isEn ? 'Grand Total (Filtered Entries):' : 'ਕੁੱਲ ਜੋੜ (ਕੁੱਲ ਫਿਲਟਰ ਕੀਤੀਆਂ ਐਂਟਰੀਆਂ):'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-emerald-950 bg-emerald-100/60">
                          {allFarmersTotals.totalBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-950 bg-indigo-100/60 whitespace-nowrap">
                          {allFarmersTotals.totalQul} Qtl {allFarmersTotals.totalRemKg} Kg
                        </td>
                        <td></td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-950">
                          ₹{allFarmersTotals.totalGross.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-900 bg-rose-100/60">
                          {allFarmersTotals.totalLabour > 0
                            ? `-₹${allFarmersTotals.totalLabour.toLocaleString('en-IN')}`
                            : '₹0'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-950 bg-emerald-100/70">
                          ₹{allFarmersTotals.totalNet.toLocaleString('en-IN')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================
            TAB 2: DATE-WISE VIEW (WITH DATE PICKER / FILTER)
            ================================================== */}
        {viewMode === 'DATE_WISE' && (
          <div className="space-y-4">
            {/* Date-wise Controls: Date Picker / Filter + Agency Filter + Search */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Date Picker Input & Quick Chips */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                  <div className="w-full sm:w-64">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {isEn ? 'Select Date Filter' : 'ਮਿਤੀ ਚੁਣੋ (Date Filter)'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <DateInput
                        value={selectedFilterDate === 'ALL' ? '' : selectedFilterDate}
                        onChange={(val) => setSelectedFilterDate(val || 'ALL')}
                        placeholder="DD/MM/YYYY"
                        inputClassName="bg-white"
                      />
                      {selectedFilterDate !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setSelectedFilterDate('ALL')}
                          className="px-2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition shrink-0"
                          title="ਸਾਰੀਆਂ ਮਿਤੀਆਂ ਵੇਖੋ (View All Dates)"
                        >
                          ਸਾਰੇ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Agency Filter */}
                  <div className="w-full sm:w-52">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {isEn ? 'Agency Filter' : 'ਏਜੰਸੀ ਫਿਲਟਰ'}
                    </label>
                    <select
                      value={dateViewAgency}
                      onChange={(e) => setDateViewAgency(e.target.value)}
                      className="w-full py-2 px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                    >
                      <option value="ALL">ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)</option>
                      {agencies.map((ag) => (
                        <option key={ag.id} value={ag.nameEn}>
                          {ag.nameEn} ({ag.namePa || ag.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search query in date view */}
                  <div className="w-full sm:w-60">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      {isEn ? 'Search' : 'ਕਿਸਾਨ ਖੋਜੋ'}
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={dateViewSearch}
                        onChange={(e) => setDateViewSearch(e.target.value)}
                        placeholder="ਕਿਸਾਨ, ਪਿੰਡ, ਮੋਬਾਈਲ..."
                        className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                      {dateViewSearch && (
                        <button
                          type="button"
                          onClick={() => setDateViewSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF & Excel Export Buttons for currently filtered date-wise records */}
                <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleExportPdf(
                        filteredDateRecords,
                        selectedFilterDate !== 'ALL' ? selectedFilterDate : 'All Dates',
                        dateViewAgency
                      )
                    }
                    disabled={filteredDateRecords.length === 0}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                    title="ਇਸ ਮਿਤੀ/ਫਿਲਟਰ ਦੀ ਪੇਸ਼ੇਵਰ PDF ਰਜਿਸਟਰ ਡਾਊਨਲੋਡ ਕਰੋ"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {selectedFilterDate !== 'ALL'
                        ? `PDF Export (${selectedFilterDate})`
                        : isEn
                        ? 'PDF Export (All Dates)'
                        : 'ਪੇਸ਼ੇਵਰ PDF ਐਕਸਪੋਰਟ'}
                    </span>
                    <span className="text-[10px] font-mono font-normal bg-slate-700 text-emerald-300 px-1.5 py-0.2 rounded-full">
                      {filteredDateRecords.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      exportRecordsCsv(
                        `Purchase_${selectedFilterDate !== 'ALL' ? selectedFilterDate.replace(/\//g, '-') : 'DateWise'}`,
                        filteredDateRecords
                      )
                    }
                    disabled={filteredDateRecords.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                    title="Excel / CSV ਡਾਊਨਲੋਡ ਕਰੋ"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* Quick Date Chips Bar */}
              <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-600" />
                  <span>{isEn ? 'Available Dates:' : 'ਉਪਲਬਧ ਮਿਤੀਆਂ:'}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedFilterDate('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedFilterDate === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  {isEn ? 'All Dates' : 'ਸਾਰੀਆਂ ਮਿਤੀਆਂ'}
                  <span className="ml-1 text-[10px] font-mono opacity-80 font-normal">({dailyPurchaseRecords.length})</span>
                </button>

                {availableDates.map((item) => (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => setSelectedFilterDate(item.date)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 ${
                      selectedFilterDate === item.date
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                    }`}
                  >
                    <span>{item.date}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${
                        selectedFilterDate === item.date ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SINGLE DATE VIEW (when a specific date is chosen) */}
            {selectedFilterDate !== 'ALL' && (
              <div className="space-y-3">
                {/* Selected Date Summary Card */}
                <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-emerald-50/60 border border-indigo-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-2xs">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <span className="font-mono text-base">{selectedFilterDate}</span>
                        <span className="bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          {dateViewTotals.farmersCount} {isEn ? 'Farmers' : 'ਕਿਸਾਨ'}
                        </span>
                        <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full text-[11px] font-medium">
                          {dateViewTotals.count} {isEn ? 'Records' : 'ਐਂਟਰੀਆਂ'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {isEn
                          ? `Daily Purchase entries recorded on ${selectedFilterDate}`
                          : `ਮਿਤੀ ${selectedFilterDate} ਨੂੰ ਦਰਜ ਕੀਤੀਆਂ ਗਈਆਂ ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਐਂਟਰੀਆਂ`}
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Chips for Selected Date */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[10px]">ਬੋਰੀਆਂ</span>
                      <span className="font-mono font-black text-emerald-950">
                        {dateViewTotals.totalBags.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[10px]">ਵਜ਼ਨ</span>
                      <span className="font-mono font-black text-indigo-950">
                        {dateViewTotals.totalQul} Qtl {dateViewTotals.totalRemKg} Kg
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      <span className="text-slate-500 font-bold block text-[10px]">ਗ੍ਰਾਸ ਰਕਮ</span>
                      <span className="font-mono font-black text-slate-900">
                        ₹{dateViewTotals.totalGross.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {dateViewTotals.totalLabour > 0 && (
                      <div className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                        <span className="text-rose-700 font-bold block text-[10px]">ਮਜ਼ਦੂਰੀ</span>
                        <span className="font-mono font-black text-rose-900">
                          -₹{dateViewTotals.totalLabour.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <div className="bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg">
                      <span className="text-emerald-800 font-bold block text-[10px]">ਸ਼ੁੱਧ ਰਕਮ</span>
                      <span className="font-mono font-black text-emerald-950">
                        ₹{dateViewTotals.totalNet.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table for Selected Date */}
                {filteredDateRecords.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                    <div className="text-xs font-bold text-slate-600">
                      ਮਿਤੀ {selectedFilterDate} ਲਈ ਕੋਈ ਖਰੀਦ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFilterDate('ALL')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                    >
                      ਸਾਰੀਆਂ ਮਿਤੀਆਂ ਵੇਖੋ (View All Dates)
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  filteredDateRecords.length > 0 &&
                                  filteredDateRecords.every((r) => selectedRecordIds.has(r.id))
                                }
                                onChange={() => toggleSelectAll(filteredDateRecords)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                title="ਸਾਰੇ ਚੁਣੋ / ਅਣ-ਚੁਣੇ ਕਰੋ"
                              />
                            </th>
                            <th className="py-2.5 px-2 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">{isEn ? 'Farmer Name' : 'ਕਿਸਾਨ ਦਾ ਨਾਂ'}</th>
                            <th className="py-2.5 px-3">{isEn ? 'Father Name' : 'ਪਿਤਾ ਦਾ ਨਾਂ'}</th>
                            <th className="py-2.5 px-3">{isEn ? 'Mobile' : 'ਮੋਬਾਈਲ'}</th>
                            <th className="py-2.5 px-3">{isEn ? 'Village' : 'ਪਿੰਡ'}</th>
                            <th className="py-2.5 px-3">{isEn ? 'Agency' : 'ਖਰੀਦ ਏਜੰਸੀ'}</th>
                            <th className="py-2.5 px-3 text-center bg-emerald-50/50">{isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}</th>
                            <th className="py-2.5 px-3 text-right bg-indigo-50/50">{isEn ? 'Weight' : 'ਵਜ਼ਨ'}</th>
                            <th className="py-2.5 px-2 text-right">{isEn ? 'Rate' : 'ਭਾਅ'}</th>
                            <th className="py-2.5 px-3 text-right">{isEn ? 'Gross' : 'ਗ੍ਰਾਸ ਰਕਮ'}</th>
                            <th className="py-2.5 px-3 text-right bg-rose-50/40">{isEn ? 'Labour' : 'ਮਜ਼ਦੂਰੀ'}</th>
                            <th className="py-2.5 px-3 text-right bg-emerald-50/60">{isEn ? 'Net' : 'ਸ਼ੁੱਧ ਰਕਮ'}</th>
                            <th className="py-2.5 px-3 text-center w-28">{isEn ? 'Actions' : 'ਕਾਰਵਾਈ'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredDateRecords.map((rec, idx) => {
                            const isSelected = selectedRecordIds.has(rec.id);
                            const gross = Number(rec.totalAmount) || 0;
                            const net = rec.netAmount !== undefined ? Number(rec.netAmount) : gross;
                            const labour =
                              rec.labourDeductions?.grandTotalDeductions !== undefined
                                ? Number(rec.labourDeductions.grandTotalDeductions)
                                : Math.max(0, gross - net);

                            return (
                              <tr
                                key={rec.id}
                                className={`transition hover:bg-slate-50/80 ${
                                  isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                }`}
                              >
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectRecord(rec.id)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-400">{idx + 1}</td>
                                <td className="py-2 px-3">
                                  <div className="font-bold text-slate-900">{rec.farmerName}</div>
                                  {rec.farmerNamePa && rec.farmerNamePa !== rec.farmerName && (
                                    <div className="text-[10px] text-slate-500">{rec.farmerNamePa}</div>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-600">{rec.fatherName || '-'}</td>
                                <td className="py-2 px-3 font-mono text-slate-600">{rec.mobile || '-'}</td>
                                <td className="py-2 px-3 text-slate-600">{rec.village || '-'}</td>
                                <td className="py-2 px-3">
                                  <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    {rec.agency}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center bg-emerald-50/50">
                                  <span className="font-mono font-black text-emerald-950 text-xs">
                                    {rec.bags}
                                  </span>
                                  {(rec.newBags !== undefined || rec.oldBags !== undefined) && (
                                    <span className="text-[10px] text-emerald-700 block font-normal">
                                      ({rec.newBags ?? rec.bags} ਨ / {rec.oldBags ?? 0} ਪੁ)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-mono bg-indigo-50/50 text-indigo-950 font-bold whitespace-nowrap">
                                  {rec.qul} Qtl {rec.kg} Kg
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-slate-600">₹{rec.rate}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                  ₹{gross.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-rose-700 bg-rose-50/40">
                                  {labour > 0 ? `-₹${labour.toLocaleString('en-IN')}` : '₹0'}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/60">
                                  ₹{net.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setViewRecord(rec)}
                                      className="p-1 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded transition"
                                      title="ਵੇਖੋ (View Details)"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => exportDailyPurchaseVoucherPDF(rec, settings)}
                                      className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 rounded transition"
                                      title="ਖਰੀਦ ਵਾਊਚਰ PDF"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditRecord(rec)}
                                      className="p-1 hover:bg-amber-50 text-amber-600 hover:text-amber-800 rounded transition"
                                      title="ਸੋਧੋ (Edit Record)"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRecord(rec)}
                                      className="p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded transition"
                                      title="ਮਿਟਾਓ (Delete Record)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 shadow-md">
                          <tr>
                            <td colSpan={7} className="py-2.5 px-3 text-right">
                              ਮਿਤੀ {selectedFilterDate} ਕੁੱਲ ਜੋੜ (Date Grand Total):
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-emerald-950 bg-emerald-100/60">
                              {dateViewTotals.totalBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-indigo-950 bg-indigo-100/60 whitespace-nowrap">
                              {dateViewTotals.totalQul} Qtl {dateViewTotals.totalRemKg} Kg
                            </td>
                            <td></td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-950">
                              ₹{dateViewTotals.totalGross.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-900 bg-rose-100/60">
                              {dateViewTotals.totalLabour > 0
                                ? `-₹${dateViewTotals.totalLabour.toLocaleString('en-IN')}`
                                : '₹0'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-950 bg-emerald-100/70">
                              ₹{dateViewTotals.totalNet.toLocaleString('en-IN')}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ALL DATES ACCORDION VIEW (when selectedFilterDate === 'ALL') */}
            {selectedFilterDate === 'ALL' && (
              <div className="space-y-3">
                {dateWisePurchases.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                    <div className="text-xs font-bold text-slate-600">ਕੋਈ ਖਰੀਦ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ</div>
                    <div className="text-[11px] text-slate-400">ਉੱਪਰ ਦਿੱਤੇ ਫਾਰਮ ਰਾਹੀਂ ਖਰੀਦ ਐਂਟਰੀ ਦਰਜ ਕਰੋ</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dateWisePurchases.map((dateGroup) => {
                      const isExpanded = !!expandedDates[dateGroup.date];

                      return (
                        <div
                          key={dateGroup.date}
                          className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition bg-white"
                        >
                          {/* Date Header Card / Banner */}
                          <div
                            className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 hover:bg-slate-100/70 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                            onClick={() => toggleDateExpanded(dateGroup.date)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                                  <span className="font-mono text-sm">{dateGroup.date}</span>
                                  <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    {dateGroup.farmerCount} ਕਿਸਾਨ (Farmers)
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5">
                                  ਕੁੱਲ {dateGroup.records.length} ਖਰੀਦ ਐਂਟਰੀਆਂ
                                </div>
                              </div>
                            </div>

                            {/* Summary Metrics & Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                                <span className="text-slate-500 font-bold">ਬੋਰੀਆਂ: </span>
                                <span className="font-mono font-black text-emerald-900">
                                  {dateGroup.totalBags.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                                <span className="text-slate-500 font-bold">ਵਜ਼ਨ: </span>
                                <span className="font-mono font-black text-indigo-900">{dateGroup.totalQul} Qtl</span>
                              </div>
                              <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                                <span className="text-slate-500 font-bold">ਗ੍ਰਾਸ: </span>
                                <span className="font-mono font-black text-slate-900">
                                  ₹{dateGroup.totalAmount.toLocaleString('en-IN')}
                                </span>
                              </div>
                              {dateGroup.totalLabour > 0 && (
                                <div className="bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-xs">
                                  <span className="text-rose-700 font-bold">ਮਜ਼ਦੂਰੀ: </span>
                                  <span className="font-mono font-black text-rose-900">
                                    -₹{dateGroup.totalLabour.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              )}
                              <div className="bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs">
                                <span className="text-emerald-800 font-bold">ਸ਼ੁੱਧ: </span>
                                <span className="font-mono font-black text-emerald-950">
                                  ₹{dateGroup.totalNetAmount.toLocaleString('en-IN')}
                                </span>
                              </div>

                              {/* PDF Export Button for Date */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportDailyPurchaseRegisterPDF(
                                    dateGroup.records,
                                    settings,
                                    dateViewAgency !== 'ALL' ? dateViewAgency : 'All Agencies',
                                    dateGroup.date,
                                    dailyPurchaseRecords
                                  );
                                }}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs transition"
                                title="ਇਸ ਮਿਤੀ ਦੀ PDF ਰਿਪੋਰਟ ਡਾਊਨਲੋਡ ਕਰੋ"
                              >
                                <Download className="w-3 h-3 text-emerald-400" />
                                <span>PDF</span>
                              </button>

                              {/* Excel Export Button for Date */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportDateCsv(dateGroup.date, dateGroup.records);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs transition"
                                title="Excel / CSV ਡਾਊਨਲੋਡ ਕਰੋ"
                              >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>Excel</span>
                              </button>

                              {/* Filter by this Date Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFilterDate(dateGroup.date);
                                }}
                                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold px-2 py-1 rounded-lg text-[11px] transition"
                                title="ਸਿਰਫ਼ ਇਸ ਮਿਤੀ ਦੀਆਂ ਐਂਟਰੀਆਂ ਵੇਖੋ"
                              >
                                {isEn ? 'Filter Date' : 'ਮਿਤੀ ਚੁਣੋ'}
                              </button>

                              {/* Accordion Chevron */}
                              <div className="p-1 text-slate-400 hover:text-slate-700">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Date Farmer List */}
                          {isExpanded && (
                            <div className="border-t border-slate-200 bg-white p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">
                                  ਮਿਤੀ {dateGroup.date} ਦੇ ਸਾਰੇ ਕਿਸਾਨਾਂ ਦੀ ਸੂਚੀ (Complete Farmer List):
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  ਸੋਧੋ (Edit), ਵੇਖੋ (View) ਜਾਂ ਹਟਾਓ (Delete) ਕਰਨ 'ਤੇ ਸਟਾਕ ਤੁਰੰਤ ਅਪਡੇਟ ਹੋਵੇਗਾ
                                </span>
                              </div>

                              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="py-2 px-3 w-10 text-center">
                                        <input
                                          type="checkbox"
                                          checked={
                                            dateGroup.records.length > 0 &&
                                            dateGroup.records.every((r) => selectedRecordIds.has(r.id))
                                          }
                                          onChange={() => toggleSelectAll(dateGroup.records)}
                                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                      </th>
                                      <th className="py-2 px-3 w-10 text-center">#</th>
                                      <th className="py-2 px-3 min-w-[180px]">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name)</th>
                                      <th className="py-2 px-3 min-w-[130px]">ਪਿਤਾ ਦਾ ਨਾਂ (Father Name)</th>
                                      <th className="py-2 px-3 min-w-[100px]">ਮੋਬਾਈਲ (Mobile)</th>
                                      <th className="py-2 px-3 min-w-[110px]">ਪਿੰਡ (Village)</th>
                                      <th className="py-2 px-3 min-w-[100px]">ਏਜੰਸੀ (Agency)</th>
                                      <th className="py-2 px-3 text-center bg-emerald-50 text-emerald-950 font-black">
                                        ਬੋਰੀਆਂ (Bags)
                                      </th>
                                      <th className="py-2 px-3 text-right bg-indigo-50 text-indigo-950 font-black">
                                        ਕੁਇੰਟਲ ਤੇ ਕਿਲੋ
                                      </th>
                                      <th className="py-2 px-3 text-right font-mono">ਭਾਅ (₹)</th>
                                      <th className="py-2 px-3 text-right font-black text-slate-900">ਕੁੱਲ ਰਕਮ (₹)</th>
                                      <th className="py-2 px-3 text-center w-28">ਕਾਰਵਾਈਆਂ (Actions)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {dateGroup.records.map((rec, idx) => {
                                      const isRowSelected = selectedRecordIds.has(rec.id);
                                      return (
                                        <tr
                                          key={rec.id}
                                          className={`hover:bg-slate-50/70 ${
                                            isRowSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : ''
                                          }`}
                                        >
                                          <td className="py-2 px-3 text-center">
                                            <input
                                              type="checkbox"
                                              checked={isRowSelected}
                                              onChange={() => toggleSelectRecord(rec.id)}
                                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                                          <td className="py-2 px-3">
                                            <div className="font-bold text-slate-900">{rec.farmerName}</div>
                                            {rec.farmerNamePa && (
                                              <div className="text-[10px] text-emerald-800 font-semibold">{rec.farmerNamePa}</div>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-slate-700">{rec.fatherName || '—'}</td>
                                          <td className="py-2 px-3 font-mono text-slate-700">{rec.mobile || '—'}</td>
                                          <td className="py-2 px-3 text-slate-800">{rec.village}</td>
                                          <td className="py-2 px-3">
                                            <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                              {rec.agency}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/30">
                                            {rec.bags}
                                            {(rec.newBags !== undefined || rec.oldBags !== undefined) && (
                                              <span className="text-[10px] text-emerald-700 block font-normal">
                                                ({rec.newBags ?? rec.bags} ਨ / {rec.oldBags ?? 0} ਪੁ)
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-950 bg-indigo-50/30">
                                            {rec.qul} Qtl {rec.kg > 0 ? `${rec.kg} Kg` : ''}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono text-slate-600">₹{rec.rate}</td>
                                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                                            ₹{rec.totalAmount.toLocaleString('en-IN')}
                                          </td>

                                          {/* Row Actions: View, Edit, PDF, Delete */}
                                          <td className="py-2 px-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                              {/* View Button */}
                                              <button
                                                type="button"
                                                onClick={() => setViewRecord(rec)}
                                                className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded transition"
                                                title="ਵੇਖੋ (View Details)"
                                              >
                                                <Eye className="w-3.5 h-3.5" />
                                              </button>

                                              {/* PDF Voucher Button */}
                                              <button
                                                type="button"
                                                onClick={() => exportDailyPurchaseVoucherPDF(rec, settings)}
                                                className="p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800 rounded transition"
                                                title="ਪੀਡੀਐਫ ਵਾਊਚਰ (PDF Voucher)"
                                              >
                                                <Printer className="w-3.5 h-3.5" />
                                              </button>

                                              {/* Edit Button */}
                                              <button
                                                type="button"
                                                onClick={() => setEditRecord(rec)}
                                                className="p-1 hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 rounded transition"
                                                title="ਸੋਧੋ (Edit Record)"
                                              >
                                                <Edit className="w-3.5 h-3.5" />
                                              </button>

                                              {/* Delete Button */}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteRecord(rec)}
                                                className="p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-800 rounded transition"
                                                title="ਮਿਟਾਓ (Delete Record)"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  {/* Date Grand Totals Footer */}
                                  <tfoot className="bg-slate-100/80 font-black text-slate-900 border-t border-slate-200">
                                    <tr>
                                      <td colSpan={7} className="py-2.5 px-3 text-right">
                                        ਮਿਤੀ {dateGroup.date} ਕੁੱਲ ਜੋੜ (Date Grand Total):
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-mono text-emerald-950 bg-emerald-100/50">
                                        {dateGroup.totalBags.toLocaleString('en-IN')} ਬੋਰੀਆਂ
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-indigo-950 bg-indigo-100/50">
                                        {dateGroup.totalQul} ਕੁਇੰਟਲ
                                      </td>
                                      <td className="py-2.5 px-3 text-right"></td>
                                      <td className="py-2.5 px-3 text-right font-mono text-slate-950">
                                        ₹{dateGroup.totalAmount.toLocaleString('en-IN')}
                                      </td>
                                      <td></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewRecord && (
        <DailyPurchaseViewModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onEdit={(rec) => {
            setViewRecord(null);
            setEditRecord(rec);
          }}
          onDelete={(id) => {
            setViewRecord(null);
            const r = dailyPurchaseRecords.find((p) => p.id === id);
            if (r) handleDeleteRecord(r);
          }}
        />
      )}

      {/* Edit Modal */}
      {editRecord && (
        <DailyPurchaseEditModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
        />
      )}
    </div>
  );
};
