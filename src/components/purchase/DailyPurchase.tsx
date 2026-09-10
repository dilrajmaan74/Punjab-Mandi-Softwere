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
  Printer
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
import { exportDailyPurchaseRegisterPDF, exportDailyPurchaseVoucherPDF } from '../../utils/purchasePdfExport';
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

  const { draft, saveDraft, clearDraft } = useFormDraft<DailyPurchaseDraft>({
    formKey: 'draft_daily_purchase',
    initialValues: {
      fixedAgency: agencies.length > 0 ? agencies[0].nameEn : 'Markfed',
      purchaseDate: getTodayFormatted(),
      rows: [{ rowId: `row_${Date.now()}_1`, farmerId: '', newBags: 0, oldBags: 0, bags: 0 }],
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
  // Continuously reduces available mandi balance per row
  // ==================================================
  const [rows, setRows] = useState<MultiFarmerPurchaseRow[]>(
    draft.rows && draft.rows.length > 0
      ? draft.rows
      : [{ rowId: `row_${Date.now()}_1`, farmerId: '', newBags: 0, oldBags: 0, bags: 0 }]
  );

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
  // 3. DATE-WISE SUMMARY BOX STATE
  // Expand/collapse dates, modals for View & Edit
  // ==================================================
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

  // Add a blank row
  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        rowId: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        farmerId: '',
        newBags: 0,
        oldBags: 0,
        bags: 0
      }
    ]);
  };

  // Add specific farmer row from search
  const addFarmerRow = (farmerId: string) => {
    setRows((prev) => {
      if (prev.length === 1 && !prev[0].farmerId && prev[0].bags === 0) {
        return [{ ...prev[0], farmerId, newBags: 0, oldBags: 0, bags: 0 }];
      }
      return [
        ...prev,
        {
          rowId: `row_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          farmerId,
          newBags: 0,
          oldBags: 0,
          bags: 0
        }
      ];
    });
    setFarmerSearchQuery('');
    setShowFarmerSearchDropdown(false);
  };

  // Remove a row
  const removeRow = (rowId: string) => {
    if (rows.length <= 1) {
      setRows([{ rowId: `row_${Date.now()}_1`, farmerId: '', newBags: 0, oldBags: 0, bags: 0 }]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
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

      // Reset rows to one blank row
      setRows([{ rowId: `row_${Date.now()}_1`, farmerId: '', newBags: 0, oldBags: 0, bags: 0 }]);
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
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
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
                    {isEn ? 'New Bags' : 'New Bags (ਨਵਾਂ)'}
                  </th>
                  <th className="py-2.5 px-2 w-28 text-center bg-orange-50 text-orange-950 font-black">
                    {isEn ? 'Old Bags' : 'Old Bags (ਪੁਰਾਣਾ)'}
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
                      {/* 1. Sr No */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
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

                      {/* 6. New Bags Input (wide enough for 1500) */}
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

                      {/* 7. Old Bags Input (wide enough for 1500) */}
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
                className="flex-1 lg:flex-initial bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ਕਤਾਰ ਸ਼ਾਮਲ ਕਰੋ</span>
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
          4. DAILY PURCHASE DATE-WISE BOX
          User Mandate:
          "Multi Farmer Entry save hon to thalle date-wise summary box show hove.
          Example: 30/08/2026 -> 15 Farmers.
          Date te click karan naal us date di complete farmer list open hove.
          Actions: Edit, View, Delete, PDF Export, Excel Export.
          All changes must recalculate balances automatically."
          ================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>ਮਿਤੀ-ਵਾਰ ਖਰੀਦ ਸੰਖੇਪ (Daily Purchase Date-wise Box)</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            ਕਿਸੇ ਵੀ ਮਿਤੀ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਉਸ ਦਿਨ ਦੀ ਪੂਰੀ ਕਿਸਾਨ ਸੂਚੀ ਵੇਖੋ, ਸੋਧੋ, ਹਟਾਓ ਜਾਂ PDF/Excel ਐਕਸਪੋਰਟ ਕਰੋ
          </p>
        </div>

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

                      {/* PDF Export Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportDailyPurchaseRegisterPDF(dateGroup.records, settings, 'All Agencies', dateGroup.date, dailyPurchaseRecords);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1 shadow-2xs transition"
                        title="PDF ਰਿਪੋਰਟ ਡਾਊਨਲੋਡ ਕਰੋ"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        <span>PDF</span>
                      </button>

                      {/* Excel Export Button */}
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
                            {dateGroup.records.map((rec, idx) => (
                              <tr key={rec.id} className="hover:bg-slate-50/70">
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
                            ))}
                          </tbody>
                          {/* Date Grand Totals Footer */}
                          <tfoot className="bg-slate-100/80 font-black text-slate-900 border-t border-slate-200">
                            <tr>
                              <td colSpan={6} className="py-2.5 px-3 text-right">
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
