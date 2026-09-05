import React, { useState, useMemo } from 'react';
import { DailyPurchaseRecord, Farmer, FarmerPurchaseSummary } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
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
    getFarmerPurchaseSummary
  } = useMandi();

  const {
    notifySaveSuccess,
    notifyDeleteSuccess,
    notifyError,
    confirmDelete
  } = useNotification();

  // ==================================================
  // 1. FIXED AGENCY & DATE AT TOP
  // ==================================================
  const [fixedAgency, setFixedAgency] = useState<string>(() => {
    return agencies.length > 0 ? agencies[0].nameEn : 'Markfed';
  });

  const [purchaseDate, setPurchaseDate] = useState<string>(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });

  const [customRate] = useState<number>(settings.fixedRatePerQtl || FIXED_RATE_PER_QTL);

  // ==================================================
  // 2. MULTI FARMER PURCHASE TABLE STATE
  // Continuously reduces available mandi balance per row
  // ==================================================
  const [rows, setRows] = useState<MultiFarmerPurchaseRow[]>([
    { rowId: `row_${Date.now()}_1`, farmerId: '', newBags: 0, oldBags: 0, bags: 0 }
  ]);

  const [farmerSearchQuery, setFarmerSearchQuery] = useState<string>('');
  const [showFarmerSearchDropdown, setShowFarmerSearchDropdown] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

  // Multi-Farmer Rows Live Totals (New, Old, Grand Total, Weight Qul+Kg)
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

    return {
      validFarmersCount,
      totalNewBags,
      totalOldBags,
      totalBags,
      totalWeightKg,
      qul: bDown.qtl,
      kg: bDown.kg,
      amount
    };
  }, [rows, customRate]);

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
          netAmount: amt
        });

        if (result.success) {
          savedCount++;
        }
      }

      notifySaveSuccess({
        titlePa: `${savedCount} ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ`,
        titleEn: 'Purchases Saved Successfully',
        messagePa: `ਮਿਤੀ: ${purchaseDate} | ਏਜੰਸੀ: ${fixedAgency} | ਕੁੱਲ ਬੋਰੀਆਂ: ${rowTotals.totalBags} (ਨਵਾਂ: ${rowTotals.totalNewBags}, ਪੁਰਾਣਾ: ${rowTotals.totalOldBags}) | ਵਜ਼ਨ: ${rowTotals.qul} ਕੁਇੰਟਲ ${rowTotals.kg} ਕਿਲੋ`,
        details: `${savedCount} Farmers • ${rowTotals.totalBags} Bags`
      });

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
      };
    } = {};

    dailyPurchaseRecords.forEach((rec) => {
      if (!groups[rec.date]) {
        groups[rec.date] = {
          records: [],
          uniqueFarmers: new Set(),
          totalBags: 0,
          totalWeightKg: 0,
          totalAmount: 0
        };
      }
      groups[rec.date].records.push(rec);
      groups[rec.date].uniqueFarmers.add(rec.farmerId);
      groups[rec.date].totalBags += Number(rec.bags) || 0;
      groups[rec.date].totalWeightKg += Number(rec.totalWeightKg) || 0;
      groups[rec.date].totalAmount += Number(rec.totalAmount) || 0;
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
      totalAmount: groups[date].totalAmount
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
            <span className="text-slate-600 font-bold">ਸਰਕਾਰੀ ਭਾਅ:</span>
            <span className="font-mono font-black text-emerald-950">₹{customRate} / ਕੁਇੰਟਲ</span>
            <span className="text-slate-400 text-[10px]">(37.50 ਕਿਲੋ ਪ੍ਰਤੀ ਬੋਰੀ)</span>
          </div>
        </div>

        {/* Agency and Date Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Agency Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ਖਰੀਦ ਏਜੰਸੀ ਚੁਣੋ (Procurement Agency):</span>
            </label>
            <select
              value={fixedAgency}
              onChange={(e) => setFixedAgency(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {agencies.map((ag) => (
                <option key={ag.id} value={ag.nameEn}>
                  {ag.nameEn} ({ag.namePa})
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <DateInput
              value={purchaseDate}
              onChange={setPurchaseDate}
              label="ਖਰੀਦ ਮਿਤੀ (Purchase Date)"
              required
            />
          </div>

          {/* Quick Stats Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs sm:col-span-2 lg:col-span-1">
            <div>
              <span className="text-[10px] text-emerald-800 font-bold block">ਕੁੱਲ ਰਜਿਸਟਰਡ ਖਰੀਦ:</span>
              <span className="text-base font-mono font-black text-emerald-950">
                {dailyPurchaseRecords.length} ਰਿਕਾਰਡ
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-800 font-bold block">ਕੁੱਲ ਖਰੀਦ ਬੋਰੀਆਂ:</span>
              <span className="text-base font-mono font-black text-emerald-950">
                {dailyPurchaseRecords.reduce((sum, r) => sum + (Number(r.bags) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
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
              value={farmerSearchQuery}
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
                  <th className="py-2.5 px-3 w-12 text-center">Sr No</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Farmer Name (ਕਿਸਾਨ ਦਾ ਨਾਂ)</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Father Name (ਪਿਤਾ ਦਾ ਨਾਂ)</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Mobile (ਮੋਬਾਈਲ)</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Village (ਪਿੰਡ)</th>
                  <th className="py-2.5 px-2 w-28 text-center bg-amber-50 text-amber-950 font-black">
                    New Bags (ਨਵਾਂ)
                  </th>
                  <th className="py-2.5 px-2 w-28 text-center bg-orange-50 text-orange-950 font-black">
                    Old Bags (ਪੁਰਾਣਾ)
                  </th>
                  <th className="py-2.5 px-2 w-28 text-center bg-emerald-50 text-emerald-950 font-black">
                    Total Bags (ਕੁੱਲ)
                  </th>
                  <th className="py-2.5 px-3 min-w-[130px] text-right bg-indigo-50 text-indigo-950 font-black">
                    Weight (ਕੁਇੰਟਲ + ਕਿਲੋ)
                  </th>
                  <th className="py-2.5 px-2 w-10 text-center">ਹਟਾਓ</th>
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
                      <td className="py-2.5 px-3">
                        <select
                          value={row.farmerId}
                          onChange={(e) => updateRow(row.rowId, 'farmerId', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                        >
                          <option value="">-- ਕਿਸਾਨ ਚੁਣੋ (Select Farmer) --</option>
                          {farmers.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.farmerName} s/o {f.fatherName} • {f.village} ({f.farmerNamePa} - ID: {f.id})
                            </option>
                          ))}
                        </select>

                        {/* Continuous Balance Display */}
                        {summary && (
                          <div className="mt-1 text-[10px] p-1.5 rounded-md border space-y-0.5 bg-emerald-50/60 border-emerald-200">
                            {summary.isLinkedFarmer ? (
                              <div className="text-emerald-900">
                                <span className="font-bold">ਮੁੱਖ ਕਿਸਾਨ ਪੂਲ: </span>
                                <span className="font-black">{summary.linkedToMainFarmerName}</span>
                                <span className="block text-[9px] text-emerald-800">
                                  ਮੁੱਖ ਆਮਦ: {summary.mandiArrivalBags} ਬੋਰੀਆਂ • ਕੁੱਲ ਖਰੀਦ: {summary.alreadyPurchasedBags} • 
                                  <strong className="text-emerald-950 font-black"> ਬਾਕੀ ਸਟਾਕ: {summary.remainingBags}</strong>
                                </span>
                              </div>
                            ) : (
                              <div className="text-slate-800">
                                <span>ਮੰਡੀ ਆਮਦ: <strong>{summary.mandiArrivalBags}</strong></span>
                                <span className="mx-1">•</span>
                                <span>ਪਹਿਲਾਂ ਖਰੀਦ: <strong>{summary.alreadyPurchasedBags}</strong></span>
                                <span className="mx-1">•</span>
                                <span>ਕੁੱਲ ਬਾਕੀ: <strong>{summary.remainingBags}</strong></span>
                              </div>
                            )}
                            <div className="pt-0.5 border-t border-emerald-200 flex items-center justify-between">
                              <span className="text-slate-600 font-bold">ਇਸ ਕਤਾਰ ਲਈ ਉਪਲਬਧ (Max for row):</span>
                              <span className={`font-mono font-black ${availableForThisRow > 0 ? 'text-emerald-950' : 'text-rose-600'}`}>
                                {availableForThisRow} ਬੋਰੀਆਂ
                              </span>
                            </div>
                            {isOverLimit && (
                              <div className="text-rose-700 bg-rose-100/90 border border-rose-300 px-1.5 py-0.5 rounded font-black text-[9.5px]">
                                ਵੱਧ ਖਰੀਦ! ਵੱਧ ਤੋਂ ਵੱਧ {availableForThisRow} ਬੋਰੀਆਂ ਸੰਭਵ ਹਨ
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
                          className="w-24 min-w-[5.5rem] mx-auto text-center bg-white border border-amber-400 rounded p-1 text-xs font-mono font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                          className="w-24 min-w-[5.5rem] mx-auto text-center bg-white border border-orange-400 rounded p-1 text-xs font-mono font-black text-orange-950 focus:outline-none focus:ring-2 focus:ring-orange-500"
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

          {/* Table Bottom Action Bar: Totals + Save Button */}
          <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                <span className="text-slate-500 font-bold">ਕੁੱਲ ਕਿਸਾਨ: </span>
                <span className="font-mono font-black text-slate-900">{rowTotals.validFarmersCount}</span>
              </div>
              <div className="bg-amber-100/80 border border-amber-300 px-2.5 py-1 rounded-lg">
                <span className="text-amber-800 font-bold">ਨਵਾਂ ਬਾਰਦਾਨਾ: </span>
                <span className="font-mono font-black text-amber-950">{rowTotals.totalNewBags}</span>
              </div>
              <div className="bg-orange-100/80 border border-orange-300 px-2.5 py-1 rounded-lg">
                <span className="text-orange-800 font-bold">ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ: </span>
                <span className="font-mono font-black text-orange-950">{rowTotals.totalOldBags}</span>
              </div>
              <div className="bg-emerald-100/80 border border-emerald-300 px-2.5 py-1 rounded-lg">
                <span className="text-emerald-800 font-bold">ਗ੍ਰੈਂਡ ਕੁੱਲ: </span>
                <span className="font-mono font-black text-emerald-950">{rowTotals.totalBags} ਬੋਰੀਆਂ</span>
              </div>
              <div className="bg-indigo-100/80 border border-indigo-300 px-2.5 py-1 rounded-lg">
                <span className="text-indigo-800 font-bold">ਕੁੱਲ ਵਜ਼ਨ: </span>
                <span className="font-mono font-black text-indigo-950">{rowTotals.qul} Qul {rowTotals.kg} Kg</span>
              </div>
              <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg">
                <span className="text-slate-700 font-bold">ਰਕਮ: </span>
                <span className="font-mono font-black text-slate-900">₹{rowTotals.amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={addRow}
                className="flex-1 md:flex-initial bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ਕਤਾਰ ਸ਼ਾਮਲ ਕਰੋ</span>
              </button>
              <button
                type="button"
                onClick={handleSavePurchases}
                disabled={isSaving || rowTotals.totalBags <= 0}
                className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-5 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
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
                        <span className="text-slate-500 font-bold">ਕੁੱਲ ਰਕਮ: </span>
                        <span className="font-mono font-black text-slate-900">
                          ₹{dateGroup.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* PDF Export Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportDailyPurchaseRegisterPDF(dateGroup.records, settings, 'All Agencies', dateGroup.date);
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
