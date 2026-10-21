import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Scale,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileDown,
  Printer,
  Users,
  Building2,
  Package,
  Calculator,
  Percent,
  TrendingDown,
  Info,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { formatCurrencyINR, formatKgToQulKg, isRecordInFiscalYear } from '../../utils/calculations';
import { CropFilterType } from '../../types/mandi';
import {
  exportFarmerBagLabourPDF,
  FarmerBagBalanceItem,
  ReportGrandTotals
} from '../../utils/farmerBagLabourPdfExport';
import { normalizeDateToComparable } from '../../utils/purchasePdfExport';

export const FarmerBagBalanceReport: React.FC = () => {
  const {
    farmers,
    bagsEntries,
    dailyPurchaseRecords,
    settings,
    language,
    setActiveSection,
    setSelectedFarmerForAccount,
    activeFiscalYear,
    fiscalYears,
    activeFirmId,
    firms,
    activeCrop
  } = useMandi();

  const isEn = language === 'en';
  const { notifySaveSuccess, notifyError } = useNotification();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(activeFiscalYear || 'ALL');
  const [selectedMandiFilter, setSelectedMandiFilter] = useState<string>('ALL');
  const [selectedCropFilter, setSelectedCropFilter] = useState<CropFilterType>('ALL');
  const [dateFilterType, setDateFilterType] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Applicable Bag Rate Setting (Default: calculated dynamically e.g. 37.5 * 2461 / 100 = 922.875)
  const defaultCalculatedBagRate = useMemo(() => {
    const bagKg = settings.fixedBagWeightKg || 37.5;
    const qtlRate = settings.fixedRatePerQtl || 2461;
    const val = (bagKg * qtlRate) / 100;
    return val > 0 ? Number(val.toFixed(3)) : 922.875;
  }, [settings.fixedBagWeightKg, settings.fixedRatePerQtl]);

  const [applicableBagRate, setApplicableBagRate] = useState<number>(defaultCalculatedBagRate);

  // Custom farmer-specific labour overrides if needed
  const [farmerLabourOverrides, setFarmerLabourOverrides] = useState<{ [farmerId: string]: number }>({});
  const [showOverrideInputFor, setShowOverrideInputFor] = useState<string | null>(null);

  // Expand / Collapse state for main farmer rows
  const [expandedFarmerIds, setExpandedFarmerIds] = useState<{ [farmerId: string]: boolean }>({});
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Toggle individual farmer expand/collapse
  const toggleExpand = (farmerId: string) => {
    setExpandedFarmerIds((prev) => ({
      ...prev,
      [farmerId]: !prev[farmerId]
    }));
  };

  // Expand All / Collapse All
  const handleExpandAll = (allIds: string[]) => {
    const next: { [id: string]: boolean } = {};
    allIds.forEach((id) => (next[id] = true));
    setExpandedFarmerIds(next);
  };

  const handleCollapseAll = () => {
    setExpandedFarmerIds({});
  };

  // Helper date matching
  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilterType === 'TODAY') {
      const tStart = today.getTime();
      const tEnd = today.getTime() + 86400000 - 1;
      return { start: tStart, end: tEnd, label: 'Today (ਅੱਜ)' };
    }

    if (dateFilterType === 'YESTERDAY') {
      const yStart = today.getTime() - 86400000;
      const yEnd = today.getTime() - 1;
      return { start: yStart, end: yEnd, label: 'Yesterday (ਕੱਲ੍ਹ)' };
    }

    if (dateFilterType === 'THIS_WEEK') {
      const day = today.getDay(); // 0 is Sunday
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const wStart = new Date(today.setDate(diff)).setHours(0, 0, 0, 0);
      const wEnd = Date.now();
      return { start: wStart, end: wEnd, label: 'This Week (ਇਸ ਹਫ਼ਤੇ)' };
    }

    if (dateFilterType === 'CUSTOM' && (customStartDate || customEndDate)) {
      const start = customStartDate ? normalizeDateToComparable(customStartDate) : 0;
      const end = customEndDate ? normalizeDateToComparable(customEndDate) + 86400000 - 1 : Infinity;
      return {
        start,
        end,
        label: `${customStartDate || 'Start'} to ${customEndDate || 'End'}`
      };
    }

    return { start: 0, end: Infinity, label: 'All Dates (ਸਾਰੀਆਂ ਮਿਤੀਆਂ)' };
  }, [dateFilterType, customStartDate, customEndDate]);

  // Main Farmers List & Computation
  // Helper to extract true bag count from any entry safely
  const getEntryBagsCount = (b: any): number => {
    return Number(b?.bags || ((Number(b?.newBags || 0)) + (Number(b?.oldBags || 0))) || 0);
  };

  // Helper to safely extract recorded labour amount from any arrival entry
  const getEntryRecordedLabour = (b: any): number => {
    if (b?.labourDeductions?.totalLabourDeduction !== undefined && b?.labourDeductions?.totalLabourDeduction !== null) {
      return Number(b.labourDeductions.totalLabourDeduction) || 0;
    }
    if (b?.labourDeductions?.grandTotalDeductions !== undefined && b?.labourDeductions?.grandTotalDeductions !== null) {
      return Number(b.labourDeductions.grandTotalDeductions) || 0;
    }
    if (b?.conditionBreakdown) {
      const cb = b.conditionBreakdown;
      const cbSum = (Number(cb.pakkiAmount) || 0) + (Number(cb.doubleAmount) || 0) + (Number(cb.sukkiAmount) || 0);
      if (cbSum > 0) return cbSum;
      if ((cb as any).totalLabour) return Number((cb as any).totalLabour) || 0;
    }
    return 0;
  };

  // 1. Filter bagsEntries strictly by fiscal year, mandi filter, crop, and date
  const filteredBags = useMemo(() => {
    return bagsEntries.filter((b) => {
      // Fiscal Year
      if (selectedFiscalYear !== 'ALL' && !isRecordInFiscalYear(b.date, b.fiscalYear, selectedFiscalYear)) {
        return false;
      }
      // Mandi Branch
      if (selectedMandiFilter !== 'ALL' && (b.firmId || 'FIRM-001') !== selectedMandiFilter) {
        return false;
      }
      // Crop
      if (selectedCropFilter !== 'ALL' && (b.cropType || 'PADDY') !== selectedCropFilter) {
        return false;
      }
      // Date Range
      if (dateFilterType !== 'ALL') {
        const t = normalizeDateToComparable(b.date);
        if (t < dateRangeBounds.start || t > dateRangeBounds.end) return false;
      }
      return true;
    });
  }, [bagsEntries, selectedFiscalYear, selectedMandiFilter, selectedCropFilter, dateFilterType, dateRangeBounds]);

  // 2. Filter dailyPurchaseRecords strictly by fiscal year, mandi filter, crop, and date
  const filteredPurchases = useMemo(() => {
    return dailyPurchaseRecords.filter((p) => {
      // Fiscal Year
      if (selectedFiscalYear !== 'ALL' && !isRecordInFiscalYear(p.date, p.fiscalYear, selectedFiscalYear)) {
        return false;
      }
      // Mandi Branch
      if (selectedMandiFilter !== 'ALL' && (p.firmId || 'FIRM-001') !== selectedMandiFilter) {
        return false;
      }
      // Crop
      if (selectedCropFilter !== 'ALL' && (p.cropType || 'PADDY') !== selectedCropFilter) {
        return false;
      }
      // Date Range
      if (dateFilterType !== 'ALL') {
        const t = normalizeDateToComparable(p.date);
        if (t < dateRangeBounds.start || t > dateRangeBounds.end) return false;
      }
      return true;
    });
  }, [dailyPurchaseRecords, selectedFiscalYear, selectedMandiFilter, selectedCropFilter, dateFilterType, dateRangeBounds]);

  // Ground truth bags count in 37.5kg Kachi Tol register under current active filters
  const totalEnteredBagsCount = useMemo(() => {
    return filteredBags.reduce((sum, b) => sum + getEntryBagsCount(b), 0);
  }, [filteredBags]);

  const totalEnteredPurchasedBagsCount = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
  }, [filteredPurchases]);

  // Main Farmers List & Computation
  // STRICT ZERO-DUPLICATION RULE:
  // Every bag entry and purchase record is partitioned into EXACTLY ONE main farmer family bucket.
  // No entry can ever appear under multiple farmers or be counted more than once!
  const reportData: FarmerBagBalanceItem[] = useMemo(() => {
    // 1. Build fast lookup index for farmers
    const farmerById = new Map<string, typeof farmers[0]>();
    const mainFarmers: typeof farmers[0][] = [];
    const subFarmersByMainId = new Map<string, typeof farmers[0][]>();

    farmers.forEach((f) => {
      farmerById.set(f.id, f);
      if (f.linkedMainFarmerId) {
        const list = subFarmersByMainId.get(f.linkedMainFarmerId) || [];
        list.push(f);
        subFarmersByMainId.set(f.linkedMainFarmerId, list);
      } else {
        mainFarmers.push(f);
      }
    });

    // Helper: Determine strictly ONE target main farmer ID for any entry
    const resolveMainFarmerId = (
      entryFarmerId?: string,
      entryFarmerName?: string,
      entryMainFarmerId?: string
    ): string => {
      // A) Explicit mainFarmerId if valid
      if (entryMainFarmerId && farmerById.has(entryMainFarmerId)) {
        const mf = farmerById.get(entryMainFarmerId)!;
        return mf.linkedMainFarmerId || mf.id;
      }

      // B) Direct farmer ID lookup
      if (entryFarmerId && farmerById.has(entryFarmerId)) {
        const f = farmerById.get(entryFarmerId)!;
        return f.linkedMainFarmerId || f.id;
      }

      // C) Name matching ONLY if exactly one farmer in the entire registry has this name
      if (entryFarmerName && entryFarmerName.trim()) {
        const cleanName = entryFarmerName.trim().toLowerCase();
        const matches = farmers.filter(
          (f) =>
            (f.farmerName || '').trim().toLowerCase() === cleanName ||
            (f.farmerNamePa || '').trim() === entryFarmerName.trim()
        );
        if (matches.length === 1) {
          const f = matches[0];
          return f.linkedMainFarmerId || f.id;
        }
      }

      // D) Fallback to the raw ID or sanitized name as an independent key
      return (entryFarmerId || entryFarmerName || 'UNKNOWN_FARMER').trim();
    };

    // 2. Group all filtered bag entries strictly into buckets by targetMainFarmerId
    // GUARANTEE: Every bag entry is placed into EXACTLY ONE bucket! Never duplicated across farmers!
    const bagsByMainFarmer = new Map<string, typeof filteredBags>();
    filteredBags.forEach((b) => {
      const bAny = b as any;
      const targetMainId = resolveMainFarmerId(b.farmerId, b.farmerName, bAny.mainFarmerId);
      const list = bagsByMainFarmer.get(targetMainId) || [];
      list.push(b);
      bagsByMainFarmer.set(targetMainId, list);
    });

    // 3. Group all filtered purchase records strictly into buckets by targetMainFarmerId
    // GUARANTEE: Every purchase record is placed into EXACTLY ONE bucket! Never duplicated across farmers!
    const purchasesByMainFarmer = new Map<string, typeof filteredPurchases>();
    filteredPurchases.forEach((p) => {
      const pAny = p as any;
      const targetMainId = resolveMainFarmerId(p.farmerId, p.farmerName, pAny.mainFarmerId);
      const list = purchasesByMainFarmer.get(targetMainId) || [];
      list.push(p);
      purchasesByMainFarmer.set(targetMainId, list);
    });

    const items: FarmerBagBalanceItem[] = [];
    const processedKeys = new Set<string>();

    // 4. Process all registered Main Farmers
    mainFarmers.forEach((mainFarmer) => {
      processedKeys.add(mainFarmer.id);

      const arrivalEntries = bagsByMainFarmer.get(mainFarmer.id) || [];
      const linkedSubFarmers = subFarmersByMainId.get(mainFarmer.id) || [];
      const subFarmerIdSet = new Set(linkedSubFarmers.map((s) => s.id));

      const familyPurchases = purchasesByMainFarmer.get(mainFarmer.id) || [];
      const ownPurchasesList = familyPurchases.filter((p) => !subFarmerIdSet.has(p.farmerId));

      const totalBagsBrought = arrivalEntries.reduce((sum, b) => sum + getEntryBagsCount(b), 0);
      const totalWeightBroughtKg = arrivalEntries.reduce((sum, b) => {
        const safeWt = Number(b.grandTotalKg || b.totalBagsWeightKg) || (getEntryBagsCount(b) * 37.5);
        return sum + safeWt;
      }, 0);

      const ownPurchasedBags = ownPurchasesList.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
      const ownPurchasedWeightKg = ownPurchasesList.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);

      const linkedFarmerPurchases = linkedSubFarmers.map((subFarmer) => {
        const subPurchases = familyPurchases.filter((p) => p.farmerId === subFarmer.id);
        const subTotalBags = subPurchases.reduce((s, p) => s + (Number(p.bags) || 0), 0);
        const subTotalWeight = subPurchases.reduce((s, p) => s + (Number(p.totalWeightKg) || 0), 0);
        const subTotalAmount = subPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);

        return {
          linkedFarmerId: subFarmer.id,
          linkedFarmerName: subFarmer.farmerName,
          linkedFarmerNamePa: subFarmer.farmerNamePa,
          fatherName: subFarmer.fatherName,
          village: subFarmer.village,
          mobile: subFarmer.mobile,
          purchases: subPurchases.map((p) => ({
            id: p.id,
            date: p.date,
            agency: p.agency || 'Other',
            bags: Number(p.bags) || 0,
            weightDisplay: p.totalWeightDisplay || formatKgToQulKg(p.totalWeightKg).displayEn,
            rate: p.rate || settings.fixedRatePerQtl || 2461,
            totalAmount: Number(p.totalAmount) || 0
          })),
          totalBags: subTotalBags,
          totalWeightKg: subTotalWeight,
          totalAmount: subTotalAmount
        };
      });

      const linkedPurchasedBags = linkedFarmerPurchases.reduce((s, lf) => s + lf.totalBags, 0);
      const linkedPurchasedWeightKg = linkedFarmerPurchases.reduce((s, lf) => s + lf.totalWeightKg, 0);

      const totalPurchasedBags = ownPurchasedBags + linkedPurchasedBags;
      const totalPurchasedWeightKg = ownPurchasedWeightKg + linkedPurchasedWeightKg;
      const totalPurchasedAmount =
        ownPurchasesList.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0) +
        linkedFarmerPurchases.reduce((s, lf) => s + lf.totalAmount, 0);

      // Skip farmers that have neither brought bags nor have purchases in this filter scope
      if (totalBagsBrought <= 0 && totalPurchasedBags <= 0 && arrivalEntries.length === 0) {
        return;
      }

      const balanceBeforeLabourBags = totalBagsBrought - totalPurchasedBags;

      let labourExpense = 0;
      if (farmerLabourOverrides[mainFarmer.id] !== undefined) {
        labourExpense = farmerLabourOverrides[mainFarmer.id];
      } else {
        const recordedLabour = arrivalEntries.reduce((sum, b) => sum + getEntryRecordedLabour(b), 0);
        if (recordedLabour > 0) {
          labourExpense = recordedLabour;
        } else {
          const defaultRate = settings.defaultPakkiLabourRate ?? 8;
          labourExpense = totalBagsBrought * defaultRate;
        }
      }

      const safeBagRate = applicableBagRate > 0 ? applicableBagRate : 925;
      const rawLabourBags = labourExpense / safeBagRate;
      const labourBagsAdjustment = Math.ceil(rawLabourBags);
      const finalBalanceBags = balanceBeforeLabourBags - labourBagsAdjustment;

      items.push({
        farmerId: mainFarmer.id,
        farmerName: mainFarmer.farmerName,
        farmerNamePa: mainFarmer.farmerNamePa,
        fatherName: mainFarmer.fatherName,
        fatherNamePa: mainFarmer.fatherNamePa,
        village: mainFarmer.village,
        villagePa: mainFarmer.villagePa,
        mobile: mainFarmer.mobile,
        aadhaar: mainFarmer.aadhaar,
        linkedFarmers: linkedSubFarmers.map((s) => ({
          id: s.id,
          farmerName: s.farmerName,
          farmerNamePa: s.farmerNamePa,
          fatherName: s.fatherName,
          village: s.village,
          mobile: s.mobile
        })),
        totalBagsBrought,
        totalWeightBroughtKg,
        arrivalEntries: arrivalEntries.map((b) => ({
          id: b.id,
          entryNumber: b.entryNumber || (b as any).parchiNumber || '-',
          date: b.date,
          newBags: Number(b.newBags ?? (b.bardana === 'NEW' ? getEntryBagsCount(b) : 0)),
          oldBags: Number(b.oldBags ?? (b.bardana === 'OLD' ? getEntryBagsCount(b) : 0)),
          bags: getEntryBagsCount(b),
          weightDisplay: b.grandTotalDisplay || b.totalBagsWeightDisplay || formatKgToQulKg(b.grandTotalKg || (getEntryBagsCount(b) * 37.5)).displayEn,
          labourAmount: getEntryRecordedLabour(b)
        })),
        ownPurchasedBags,
        ownPurchasedWeightKg,
        ownPurchases: ownPurchasesList.map((p) => ({
          id: p.id,
          date: p.date,
          agency: p.agency || 'Other',
          bags: Number(p.bags) || 0,
          weightDisplay: p.totalWeightDisplay || formatKgToQulKg(p.totalWeightKg).displayEn,
          rate: p.rate || settings.fixedRatePerQtl || 2461,
          totalAmount: Number(p.totalAmount) || 0
        })),
        linkedPurchasedBags,
        linkedPurchasedWeightKg,
        linkedFarmerPurchases,
        totalPurchasedBags,
        totalPurchasedWeightKg,
        totalPurchasedAmount,
        balanceBeforeLabourBags,
        labourExpense,
        applicableBagRate: safeBagRate,
        rawLabourBags,
        labourBagsAdjustment,
        finalBalanceBags
      });
    });

    // 5. Process any remaining buckets (e.g. ad-hoc entries not linked to registered main farmer)
    const allRemainingKeys = new Set<string>([
      ...Array.from(bagsByMainFarmer.keys()),
      ...Array.from(purchasesByMainFarmer.keys())
    ]);

    allRemainingKeys.forEach((key) => {
      if (processedKeys.has(key)) return;
      processedKeys.add(key);

      const arrivalEntries = bagsByMainFarmer.get(key) || [];
      const purchasesList = purchasesByMainFarmer.get(key) || [];

      if (arrivalEntries.length === 0 && purchasesList.length === 0) return;

      const firstB = arrivalEntries[0];
      const firstP = purchasesList[0];
      const matchedFarmer = farmerById.get(key) || farmers.find(
        (f) =>
          f.id === key ||
          (f.farmerName && f.farmerName.trim().toLowerCase() === (firstB?.farmerName || firstP?.farmerName || '').trim().toLowerCase())
      );

      const farmerId = matchedFarmer?.id || key;
      const farmerName = matchedFarmer?.farmerName || firstB?.farmerName || firstP?.farmerName || key;
      const farmerNamePa = matchedFarmer?.farmerNamePa || firstB?.farmerNamePa || firstP?.farmerNamePa || farmerName;
      const fatherName = matchedFarmer?.fatherName || firstB?.farmerFatherName || '-';
      const village = matchedFarmer?.village || firstB?.farmerVillage || '-';
      const villagePa = matchedFarmer?.villagePa || firstB?.farmerVillagePa;
      const mobile = matchedFarmer?.mobile || firstB?.farmerMobile || '-';

      const totalBagsBrought = arrivalEntries.reduce((sum, b) => sum + getEntryBagsCount(b), 0);
      const totalWeightBroughtKg = arrivalEntries.reduce((sum, b) => {
        const safeWt = Number(b.grandTotalKg || b.totalBagsWeightKg) || (getEntryBagsCount(b) * 37.5);
        return sum + safeWt;
      }, 0);

      const ownPurchasedBags = purchasesList.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
      const ownPurchasedWeightKg = purchasesList.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);
      const totalPurchasedAmount = purchasesList.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

      const balanceBeforeLabourBags = totalBagsBrought - ownPurchasedBags;

      let labourExpense = 0;
      if (farmerLabourOverrides[farmerId] !== undefined) {
        labourExpense = farmerLabourOverrides[farmerId];
      } else {
        const recordedLabour = arrivalEntries.reduce((sum, b) => sum + getEntryRecordedLabour(b), 0);
        if (recordedLabour > 0) {
          labourExpense = recordedLabour;
        } else {
          const defaultRate = settings.defaultPakkiLabourRate ?? 8;
          labourExpense = totalBagsBrought * defaultRate;
        }
      }

      const safeBagRate = applicableBagRate > 0 ? applicableBagRate : 925;
      const rawLabourBags = labourExpense / safeBagRate;
      const labourBagsAdjustment = Math.ceil(rawLabourBags);
      const finalBalanceBags = balanceBeforeLabourBags - labourBagsAdjustment;

      items.push({
        farmerId,
        farmerName,
        farmerNamePa,
        fatherName,
        village,
        villagePa,
        mobile,
        aadhaar: matchedFarmer?.aadhaar || (firstB as any)?.farmerAadhaar,
        linkedFarmers: [],
        totalBagsBrought,
        totalWeightBroughtKg,
        arrivalEntries: arrivalEntries.map((b) => ({
          id: b.id,
          entryNumber: b.entryNumber || (b as any).parchiNumber || '-',
          date: b.date,
          newBags: Number(b.newBags ?? (b.bardana === 'NEW' ? getEntryBagsCount(b) : 0)),
          oldBags: Number(b.oldBags ?? (b.bardana === 'OLD' ? getEntryBagsCount(b) : 0)),
          bags: getEntryBagsCount(b),
          weightDisplay: b.grandTotalDisplay || b.totalBagsWeightDisplay || formatKgToQulKg(b.grandTotalKg || (getEntryBagsCount(b) * 37.5)).displayEn,
          labourAmount: getEntryRecordedLabour(b)
        })),
        ownPurchasedBags,
        ownPurchasedWeightKg,
        ownPurchases: purchasesList.map((p) => ({
          id: p.id,
          date: p.date,
          agency: p.agency || 'Other',
          bags: Number(p.bags) || 0,
          weightDisplay: p.totalWeightDisplay || formatKgToQulKg(p.totalWeightKg).displayEn,
          rate: p.rate || settings.fixedRatePerQtl || 2461,
          totalAmount: Number(p.totalAmount) || 0
        })),
        linkedPurchasedBags: 0,
        linkedPurchasedWeightKg: 0,
        linkedFarmerPurchases: [],
        totalPurchasedBags: ownPurchasedBags,
        totalPurchasedWeightKg: ownPurchasedWeightKg,
        totalPurchasedAmount,
        balanceBeforeLabourBags,
        labourExpense,
        applicableBagRate: safeBagRate,
        rawLabourBags,
        labourBagsAdjustment,
        finalBalanceBags
      });
    });

    return items;
  }, [
    farmers,
    filteredBags,
    filteredPurchases,
    settings,
    applicableBagRate,
    farmerLabourOverrides
  ]);

  // Search Filter
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return reportData;

    return reportData.filter((item) => {
      const matchMain =
        (item.farmerName || '').toLowerCase().includes(q) ||
        (item.farmerNamePa || '').toLowerCase().includes(q) ||
        (item.farmerId || '').toLowerCase().includes(q) ||
        (item.fatherName && item.fatherName.toLowerCase().includes(q)) ||
        (item.village && item.village.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.includes(q));

      const matchLinked = Array.isArray(item.linkedFarmers) && item.linkedFarmers.some(
        (lf) =>
          (lf.farmerName || '').toLowerCase().includes(q) ||
          (lf.farmerNamePa || '').toLowerCase().includes(q) ||
          (lf.village || '').toLowerCase().includes(q) ||
          (lf.mobile && lf.mobile.includes(q))
      );

      return matchMain || matchLinked;
    });
  }, [reportData, searchQuery]);

  // Grand Totals Calculation
  const grandTotals: ReportGrandTotals = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => ({
        totalBagsBrought: acc.totalBagsBrought + item.totalBagsBrought,
        totalOwnPurchase: acc.totalOwnPurchase + item.ownPurchasedBags,
        totalLinkedFarmerPurchase: acc.totalLinkedFarmerPurchase + item.linkedPurchasedBags,
        totalPurchase: acc.totalPurchase + item.totalPurchasedBags,
        totalLabourExpense: acc.totalLabourExpense + item.labourExpense,
        totalLabourBags: acc.totalLabourBags + item.labourBagsAdjustment,
        finalBalanceBags: acc.finalBalanceBags + item.finalBalanceBags
      }),
      {
        totalBagsBrought: 0,
        totalOwnPurchase: 0,
        totalLinkedFarmerPurchase: 0,
        totalPurchase: 0,
        totalLabourExpense: 0,
        totalLabourBags: 0,
        finalBalanceBags: 0
      }
    );
  }, [filteredData]);

  // Exact Match / Difference between 37.5kg Kachi Tol register and this report
  const bagsDifference = useMemo(() => {
    return Math.abs(grandTotals.totalBagsBrought - totalEnteredBagsCount);
  }, [grandTotals.totalBagsBrought, totalEnteredBagsCount]);

  // PDF Export Trigger
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportFarmerBagLabourPDF(filteredData, settings, {
        dateFilterLabel: `${dateRangeBounds.label} • FY: ${selectedFiscalYear} • Mandi: ${selectedMandiFilter === 'ALL' ? (isEn ? 'All Mandis' : 'ਸਾਰੀਆਂ ਮੰਡੀਆਂ') : selectedMandiFilter} • Crop: ${selectedCropFilter}`,
        applicableBagRate,
        totals: grandTotals
      });
      notifySaveSuccess({
        titleEn: 'Report Exported Successfully',
        titlePa: 'ਰਿਪੋਰਟ ਸਫਲਤਾਪੂਰਵਕ ਡਾਊਨਲੋਡ ਹੋ ਗਈ',
        messageEn: 'Farmer Bag Balance & Labour Report PDF generated.',
        messagePa: 'ਕਿਸਾਨ ਬੋਰੀ ਬੈਲੇਂਸ ਅਤੇ ਲੇਬਰ ਰਿਪੋਰਟ ਪੀ.ਡੀ.ਐਫ ਤਿਆਰ ਹੋ ਗਈ ਹੈ।'
      });
    } catch (err) {
      console.error(err);
      notifyError({
        titleEn: 'Export Failed',
        titlePa: 'ਐਕਸਪੋਰਟ ਅਸਫਲ',
        messageEn: 'Failed to generate PDF. Please try again.'
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Title Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isEn ? 'Farmer Bag Balance & Labour Report' : 'ਕਿਸਾਨ ਬੋਰੀ ਬੈਲੇਂਸ ਅਤੇ ਲੇਬਰ ਰਿਪੋਰਟ'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {isEn
                    ? 'Complete main farmer balance tracking with linked farmer purchases and labour bag adjustments'
                    : 'ਮੁੱਖ ਕਿਸਾਨਾਂ ਦੀ ਮੰਡੀ ਆਮਦ, ਸੰਬੰਧਿਤ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਦਾ ਸੰਪੂਰਨ ਹਿਸਾਬ'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleExpandAll(filteredData.map((d) => d.farmerId))}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>{isEn ? 'Expand All' : 'ਸਾਰੇ ਖੋਲ੍ਹੋ'}</span>
            </button>

            <button
              onClick={handleCollapseAll}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>{isEn ? 'Collapse All' : 'ਸਾਰੇ ਬੰਦ ਕਰੋ'}</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF || filteredData.length === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingPDF ? (isEn ? 'Generating PDF...' : 'ਪੀ.ਡੀ.ਐਫ ਬਣ ਰਹੀ ਹੈ...') : isEn ? 'Print / Export PDF' : 'ਪੀ.ਡੀ.ਐਫ ਡਾਊਨਲੋਡ ਕਰੋ'}</span>
            </button>
          </div>
        </div>

        {/* Global Configuration Bar: Applicable Bag Rate & Labour Settings */}
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Applicable Bag Rate Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isEn ? 'Applicable Bag Rate (₹/Bag):' : 'ਲਾਗੂ ਬੋਰੀ ਰੇਟ (₹/ਬੋਰੀ):'}</span>
              </label>
              <span className="text-[10px] text-slate-500">1 Bag = {(settings.fixedBagWeightKg || 37.5).toFixed(1)} Kg</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.001"
                  value={applicableBagRate}
                  onChange={(e) => setApplicableBagRate(Math.max(0.01, Number(e.target.value) || 0.01))}
                  className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={() => setApplicableBagRate(defaultCalculatedBagRate)}
                className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200"
                title={`Calculated MSP ₹${defaultCalculatedBagRate}`}
              >
                ₹{defaultCalculatedBagRate}
              </button>
              <button
                type="button"
                onClick={() => setApplicableBagRate(925)}
                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-200"
                title="Round ₹925"
              >
                ₹925
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Formula: ਕੁੱਲ ਲੇਬਰ (₹) ÷ ₹{applicableBagRate} = ਲੇਬਰ ਬੋਰੀਆਂ ਕਟੌਤੀ (ਰਾਊਂਡ ਅੱਪ)
            </p>
          </div>

          {/* 2. Conversion Formula Explanation Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>{isEn ? 'Adjustment Logic' : 'ਕਟੌਤੀ ਗਣਨਾ ਨਿਯਮ'}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
              • <strong>Total Purchase</strong> = Own + All Linked Farmers Purchase
              <br />
              • <strong>Balance Before Labour</strong> = Brought − Total Purchase
              <br />
              • <strong>Labour Bags</strong> = Labour Expense ÷ ₹{applicableBagRate} (Round UP)
              <br />
              • <strong>Final Balance</strong> = Balance Before Labour − Labour Bags
            </p>
          </div>

          {/* 3. Date & Quick Filter Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEn ? 'Date-wise Filter:' : 'ਮਿਤੀ ਫਿਲਟਰ:'}</span>
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setDateFilterType('ALL')}
                className={`px-2 py-1 text-[11px] font-bold rounded ${
                  dateFilterType === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'All' : 'ਸਾਰੀਆਂ'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('TODAY')}
                className={`px-2 py-1 text-[11px] font-bold rounded ${
                  dateFilterType === 'TODAY'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'Today' : 'ਅੱਜ'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('YESTERDAY')}
                className={`px-2 py-1 text-[11px] font-bold rounded ${
                  dateFilterType === 'YESTERDAY'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'Yesterday' : 'ਕੱਲ੍ਹ'}
              </button>
              <button
                type="button"
                onClick={() => setDateFilterType('CUSTOM')}
                className={`px-2 py-1 text-[11px] font-bold rounded ${
                  dateFilterType === 'CUSTOM'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isEn ? 'Custom' : 'ਚੁਣੋ'}
              </button>
            </div>

            {dateFilterType === 'CUSTOM' && (
              <div className="mt-2 flex items-center gap-1">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-1/2 px-1.5 py-1 text-[11px] bg-white border border-slate-300 rounded"
                />
                <span className="text-[10px] text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-1/2 px-1.5 py-1 text-[11px] bg-white border border-slate-300 rounded"
                />
              </div>
            )}
          </div>
        </div>

        {/* Mandi Branch, Fiscal Year & Crop Filter Pills */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
          {/* Mandi Branch */}
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-700" />
            <span>{isEn ? 'Mandi Branch:' : 'ਮੰਡੀ ਬ੍ਰਾਂਚ:'}</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedMandiFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              selectedMandiFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🌟 {isEn ? 'All Mandis' : 'ਸਾਰੀਆਂ ਮੰਡੀਆਂ'}
          </button>
          {firms.map((f) => {
            const isSelected = selectedMandiFilter === f.id;
            const fName = f?.name || '';
            const fAddress = f?.address || '';
            const isKang = f.id === 'FIRM-001' || fName.includes('Kang') || fAddress.includes('Kang');
            const isMehraj = f.id === 'FIRM-002' || fName.includes('Mehrajwala') || fAddress.includes('Mehrajwala');
            const isKamal = f.id === 'FIRM-003' || fName.includes('Kamalpur') || fAddress.includes('Kamalpur');
            const shortLabel = isMehraj ? 'ਮਹਿਰਾਜਵਾਲਾ' : isKamal ? 'ਕਮਾਲਪੁਰ' : isKang ? 'ਕੰਗ ਖੁਰਦ' : (f?.namePa || f?.name || 'ਮੰਡੀ');
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedMandiFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-600 text-white font-black shadow-xs ring-1 ring-amber-500'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>📍 {shortLabel}</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          {/* Fiscal Year Filter */}
          <span className="text-xs font-bold text-slate-700 ml-1">
            {isEn ? 'Fiscal Year:' : 'ਵਿੱਤੀ ਸਾਲ:'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedFiscalYear('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              selectedFiscalYear === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isEn ? 'All FY' : 'ਸਾਰੇ ਸਾਲ'}
          </button>
          {fiscalYears && fiscalYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setSelectedFiscalYear(yr)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                selectedFiscalYear === yr
                  ? 'bg-indigo-700 text-white font-black shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {yr}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          {/* Crop Filter */}
          <span className="text-xs font-bold text-slate-700 ml-1">
            {isEn ? 'Crop:' : 'ਫਸਲ:'}
          </span>
          {[
            { id: 'ALL', labelPa: 'ਸਭ ਫਸਲਾਂ', labelEn: 'All Crops' },
            { id: 'PADDY', labelPa: '🍚 ਝੋਨਾ (37.5 KG)', labelEn: '🍚 Paddy (37.5 KG)' },
            { id: 'WHEAT', labelPa: '🌾 ਕਣਕ', labelEn: '🌾 Wheat' },
            { id: 'MAIZE', labelPa: '🌽 ਮੱਕੀ', labelEn: '🌽 Maize' }
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCropFilter(c.id as CropFilterType)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                selectedCropFilter === c.id
                  ? 'bg-emerald-700 text-white font-black shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isEn ? c.labelEn : c.labelPa}
            </button>
          ))}
        </div>

        {/* Live 37.5 KG Bags Exact Match & Reconciliation Banner */}
        <div className={`mt-3 p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
          bagsDifference === 0
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
            : 'bg-amber-50 border-amber-300 text-amber-950 shadow-2xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              bagsDifference === 0 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-amber-600 text-white shadow-xs'
            }`}>
              {bagsDifference === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm">
                  {bagsDifference === 0
                    ? (isEn ? '✅ 100% Bag Match Verified (Zero Duplication / Zero Omission)' : '✅ 37.5 KG ਬੋਰੀਆਂ ਦਾ 100% ਸਹੀ ਮਿਲਾਨ (ਕੋਈ ਡਬਲ ਐਂਟਰੀ ਨਹੀਂ)')
                    : (isEn ? '⚠️ Bag Count Difference' : '⚠️ ਬੋਰੀਆਂ ਵਿੱਚ ਅੰਤਰ')}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  bagsDifference === 0 ? 'bg-emerald-200 text-emerald-900 border border-emerald-400' : 'bg-amber-200 text-amber-900 border border-amber-400'
                }`}>
                  {bagsDifference === 0 ? (isEn ? '100% EXACT MATCH' : '100% ਬਿਲਕੁਲ ਇਕ ਸਮਾਨ') : `${bagsDifference} ਬੋਰੀਆਂ ਅੰਤਰ`}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                {isEn
                  ? `Kachi Tol (37.5 KG) Register Total: ${totalEnteredBagsCount.toLocaleString('en-IN')} Bags | Farmer Bag Balance Report Total: ${grandTotals.totalBagsBrought.toLocaleString('en-IN')} Bags`
                  : `ਕੱਚੀ ਤੋਲ (37.5 KG) ਰਜਿਸਟਰ ਕੁੱਲ: ${totalEnteredBagsCount.toLocaleString('en-IN')} ਬੋਰੀਆਂ | ਕਿਸਾਨ ਬੋਰੀ ਬੈਲੇਂਸ ਰਿਪੋਰਟ ਕੁੱਲ: ${grandTotals.totalBagsBrought.toLocaleString('en-IN')} ਬੋਰੀਆਂ`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                {isEn ? 'Reconciliation Diff' : 'ਰਿਪੋਰਟਾਂ ਵਿਚਲਾ ਅੰਤਰ'}
              </span>
              <span className={`text-base font-black font-mono ${bagsDifference === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>
                {bagsDifference} {isEn ? 'Bags' : 'ਬੋਰੀਆਂ'}
              </span>
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                isEn
                  ? 'Search by Main Farmer Name, Village, Mobile, ID or Linked Farmer...'
                  : 'ਮੁੱਖ ਕਿਸਾਨ ਦਾ ਨਾਂ, ਪਿੰਡ, ਮੋਬਾਈਲ ਜਾਂ ਸੰਬੰਧਿਤ ਕਿਸਾਨ ਦੁਆਰਾ ਖੋਜ ਕਰੋ...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isEn ? 'Main Farmers' : 'ਕੁੱਲ ਮੁੱਖ ਕਿਸਾਨ'}
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{filteredData.length}</span>
          <span className="text-[10px] text-slate-400">{isEn ? 'With mandi arrival' : 'ਜਿਨ੍ਹਾਂ ਨੇ ਮਾਲ ਲਿਆਂਦਾ'}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isEn ? 'Total Brought' : 'ਕੁੱਲ ਆਮਦ ਬੋਰੀਆਂ'}
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">
            {grandTotals.totalBagsBrought.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500">
            {formatKgToQulKg(grandTotals.totalBagsBrought * (settings.fixedBagWeightKg || 37.5)).displayEn}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isEn ? 'Own Purchases' : 'ਆਪਣੀ ਖਰੀਦ'}
          </span>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">
            {grandTotals.totalOwnPurchase.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">{isEn ? 'Direct farmer' : 'ਸਿੱਧੀ ਖਰੀਦ'}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isEn ? 'Linked Purchases' : 'ਸੰਬੰਧਿਤ ਖਰੀਦ'}
          </span>
          <span className="text-xl font-black text-amber-700 mt-0.5 block">
            {grandTotals.totalLinkedFarmerPurchase.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">{isEn ? 'By linked sub-farmers' : 'ਸੰਬੰਧਿਤ ਕਿਸਾਨਾਂ ਦੀ'}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isEn ? 'Labour Deducted' : 'ਲੇਬਰ ਬੋਰੀਆਂ ਕਟੌਤੀ'}
          </span>
          <span className="text-xl font-black text-rose-700 mt-0.5 block">
            {grandTotals.totalLabourBags.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500">₹{Math.round(grandTotals.totalLabourExpense).toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-xs bg-slate-50">
          <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block">
            {isEn ? 'Final Balance Bags' : 'ਅੰਤਿਮ ਬਾਕੀ ਬੋਰੀਆਂ'}
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">
            {grandTotals.finalBalanceBags.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] font-bold text-emerald-700">{isEn ? 'Ready for settlement' : 'ਬਾਕੀ ਬੈਲੇਂਸ'}</span>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-2 text-center w-10">#</th>
                <th className="py-3 px-3 min-w-[200px]">
                  {isEn ? 'Main Farmer Name' : 'ਮੁੱਖ ਕਿਸਾਨ ਦਾ ਨਾਂ'}
                </th>
                <th className="py-3 px-2 text-right min-w-[90px]">
                  {isEn ? 'Total Brought' : 'ਕੁੱਲ ਆਮਦ'}
                </th>
                <th className="py-3 px-2 text-right min-w-[85px]">
                  {isEn ? 'Own Purchase' : 'ਆਪਣੀ ਖਰੀਦ'}
                </th>
                <th className="py-3 px-2 text-right min-w-[95px]">
                  {isEn ? 'Linked Purchase' : 'ਸੰਬੰਧਿਤ ਖਰੀਦ'}
                </th>
                <th className="py-3 px-2 text-right min-w-[85px] bg-slate-800">
                  {isEn ? 'Total Purchase' : 'ਕੁੱਲ ਖਰੀਦ'}
                </th>
                <th className="py-3 px-2 text-right min-w-[90px]">
                  {isEn ? 'Bal Before Labour' : 'ਲੇਬਰ ਤੋਂ ਪਹਿਲਾਂ'}
                </th>
                <th className="py-3 px-2 text-right min-w-[95px]">
                  {isEn ? 'Labour Exp (₹)' : 'ਲੇਬਰ ਖਰਚਾ (₹)'}
                </th>
                <th className="py-3 px-2 text-right min-w-[85px]">
                  {isEn ? 'Labour Bags' : 'ਲੇਬਰ ਬੋਰੀਆਂ'}
                </th>
                <th className="py-3 px-3 text-right min-w-[100px] bg-slate-950 text-white font-black">
                  {isEn ? 'Final Balance' : 'ਅੰਤਿਮ ਬਾਕੀ'}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Scale className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-sm">
                        {isEn ? 'No main farmers found matching the criteria.' : 'ਕੋਈ ਮੁੱਖ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ।'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {isEn
                          ? 'Ensure farmers have brought bags to the mandi in Bag Entry.'
                          : 'ਕਿਰਪਾ ਕਰਕੇ ਚੈੱਕ ਕਰੋ ਕਿ ਕਿਸਾਨਾਂ ਦੀ ਬੋਰੀ ਤੁਲਾਈ ਐਂਟਰੀ ਦਰਜ ਹੈ।'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => {
                  const isExpanded = !!expandedFarmerIds[item.farmerId];

                  return (
                    <React.Fragment key={item.farmerId}>
                      {/* Main Farmer Row */}
                      <tr
                        onClick={() => toggleExpand(item.farmerId)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                          isExpanded ? 'bg-slate-50/80 font-medium' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        {/* 1. Expand Icon + Index */}
                        <td className="py-3 px-2 text-center text-slate-400">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(item.farmerId);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* 2. Farmer Name & Meta */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm hover:text-emerald-700 transition-colors">
                                {isEn ? item.farmerName : `${item.farmerNamePa} (${item.farmerName})`}
                              </span>
                              {item.linkedFarmers.length > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  +{item.linkedFarmers.length} {isEn ? 'Linked' : 'ਸੰਬੰਧਿਤ'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>S/o: {item.fatherName || '-'}</span>
                              <span>•</span>
                              <span>{item.village}</span>
                              {item.mobile && (
                                <>
                                  <span>•</span>
                                  <span>{item.mobile}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Total Bags Brought */}
                        <td className="py-3 px-2 text-right">
                          <span className="font-bold text-slate-900 text-sm">{item.totalBagsBrought}</span>
                          <span className="block text-[10px] text-slate-400">
                            {formatKgToQulKg(item.totalWeightBroughtKg).displayEn}
                          </span>
                        </td>

                        {/* 4. Own Farmer Purchase */}
                        <td className="py-3 px-2 text-right font-medium text-slate-700">
                          <span>{item.ownPurchasedBags}</span>
                        </td>

                        {/* 5. Linked Farmers Purchase */}
                        <td className="py-3 px-2 text-right">
                          <span className={item.linkedPurchasedBags > 0 ? 'font-bold text-amber-700' : 'text-slate-400'}>
                            {item.linkedPurchasedBags}
                          </span>
                        </td>

                        {/* 6. Total Purchase */}
                        <td className="py-3 px-2 text-right font-bold text-slate-900 bg-slate-50">
                          <span>{item.totalPurchasedBags}</span>
                        </td>

                        {/* 7. Balance Before Labour */}
                        <td className="py-3 px-2 text-right font-bold text-slate-800">
                          <span>{item.balanceBeforeLabourBags}</span>
                        </td>

                        {/* 8. Total Labour Expense */}
                        <td className="py-3 px-2 text-right text-slate-700">
                          <div className="flex items-center justify-end gap-1">
                            <span>₹{Math.round(item.labourExpense).toLocaleString('en-IN')}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowOverrideInputFor(showOverrideInputFor === item.farmerId ? null : item.farmerId);
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-800 underline"
                              title="Edit/override labour expense"
                            >
                              edit
                            </button>
                          </div>
                        </td>

                        {/* 9. Labour Bags Adjustment */}
                        <td className="py-3 px-2 text-right font-bold text-rose-700">
                          <span>{item.labourBagsAdjustment}</span>
                          <span className="block text-[9px] text-slate-400 font-normal">
                            ({item.rawLabourBags.toFixed(1)})
                          </span>
                        </td>

                        {/* 10. Final Balance Bags */}
                        <td className="py-3 px-3 text-right bg-slate-50">
                          <span className="inline-block px-2 py-1 rounded-md text-xs font-black bg-slate-900 text-white">
                            {item.finalBalanceBags} Bags
                          </span>
                        </td>
                      </tr>

                      {/* Inline Labour Override Input if toggled */}
                      {showOverrideInputFor === item.farmerId && (
                        <tr className="bg-amber-50/50 border-b border-amber-200">
                          <td colSpan={10} className="p-3">
                            <div className="flex items-center justify-between gap-4 max-w-xl">
                              <div className="text-xs font-bold text-slate-700">
                                {isEn ? 'Override Labour Expense for' : 'ਲੇਬਰ ਖਰਚਾ ਬਦਲੋ'}: <strong>{item.farmerName}</strong>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold">₹</span>
                                <input
                                  type="number"
                                  placeholder="Enter ₹ labour"
                                  defaultValue={item.labourExpense}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const val = Number((e.target as HTMLInputElement).value) || 0;
                                      setFarmerLabourOverrides((prev) => ({ ...prev, [item.farmerId]: val }));
                                      setShowOverrideInputFor(null);
                                    }
                                  }}
                                  className="w-32 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...farmerLabourOverrides };
                                    delete next[item.farmerId];
                                    setFarmerLabourOverrides(next);
                                    setShowOverrideInputFor(null);
                                  }}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowOverrideInputFor(null)}
                                  className="px-2 py-1 bg-slate-800 text-white rounded text-xs font-bold"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* EXPANDED DETAILED INFORMATION SECTION */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-y-2 border-slate-300">
                          <td colSpan={10} className="p-4 sm:p-5">
                            <div className="space-y-4">
                              {/* Farmer Meta Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                                <div>
                                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {isEn ? 'Detailed Farmer Balance Breakdown' : 'ਵਿਸਤ੍ਰਿਤ ਕਿਸਾਨ ਹਿਸਾਬ-ਕਿਤਾਬ'}
                                  </span>
                                  <h3 className="text-base font-black text-slate-900">
                                    {item.farmerName} ({item.farmerNamePa}) • {item.farmerId}
                                  </h3>
                                  <p className="text-xs text-slate-600">
                                    S/o: {item.fatherName || '-'} | Village: {item.village} | Mobile: {item.mobile || '-'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const frm = farmers.find((f) => f.id === item.farmerId);
                                      if (frm) {
                                        setSelectedFarmerForAccount(frm);
                                        setActiveSection('farmer-account');
                                      }
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>{isEn ? 'View Farmer Account' : 'ਕਿਸਾਨ ਖਾਤਾ ਦੇਖੋ'}</span>
                                  </button>
                                </div>
                              </div>

                              {/* 1. Total Bags Brought by Main Farmer */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Package className="w-4 h-4 text-emerald-700" />
                                    <span>
                                      1. {isEn ? 'Total Bags Brought to Mandi' : 'ਮੰਡੀ ਆਮਦ ਤੁਲਾਈ ਵੇਰਵਾ'} (
                                      {item.totalBagsBrought} Bags)
                                    </span>
                                  </h4>
                                  <span className="text-xs font-bold text-slate-700">
                                    {formatKgToQulKg(item.totalWeightBroughtKg).displayEn}
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                                        <th className="py-1.5 px-2">Parchi / Entry #</th>
                                        <th className="py-1.5 px-2">Date</th>
                                        <th className="py-1.5 px-2 text-right">New Juths</th>
                                        <th className="py-1.5 px-2 text-right">Old Juths</th>
                                        <th className="py-1.5 px-2 text-right">Total Bags</th>
                                        <th className="py-1.5 px-2 text-right">Weight (Qtl/Kg)</th>
                                        <th className="py-1.5 px-2 text-right">Recorded Labour</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {item.arrivalEntries.map((arr, i) => (
                                        <tr key={arr.id || i} className="hover:bg-slate-50">
                                          <td className="py-1.5 px-2 font-medium">{arr.entryNumber}</td>
                                          <td className="py-1.5 px-2">{arr.date}</td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">{arr.newBags}</td>
                                          <td className="py-1.5 px-2 text-right text-slate-600">{arr.oldBags}</td>
                                          <td className="py-1.5 px-2 text-right font-bold text-slate-900">{arr.bags}</td>
                                          <td className="py-1.5 px-2 text-right font-medium">{arr.weightDisplay}</td>
                                          <td className="py-1.5 px-2 text-right text-slate-700">
                                            ₹{Math.round(arr.labourAmount).toLocaleString('en-IN')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* 2. Own Farmer Purchases */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-blue-700" />
                                    <span>
                                      2. {isEn ? 'Own Farmer Purchases' : 'ਮੁੱਖ ਕਿਸਾਨ ਦੀ ਆਪਣੀ ਖਰੀਦ'} (
                                      {item.ownPurchasedBags} Bags)
                                    </span>
                                  </h4>
                                  <span className="text-xs font-bold text-slate-700">
                                    Total: {item.ownPurchasedBags} Bags
                                  </span>
                                </div>

                                {item.ownPurchases.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    {isEn
                                      ? 'No direct purchases recorded for this main farmer.'
                                      : 'ਇਸ ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਨਾਂ ਉੱਤੇ ਕੋਈ ਸਿੱਧੀ ਖਰੀਦ ਦਰਜ ਨਹੀਂ ਹੈ।'}
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                                          <th className="py-1.5 px-2">Purchase ID</th>
                                          <th className="py-1.5 px-2">Date</th>
                                          <th className="py-1.5 px-2">Agency</th>
                                          <th className="py-1.5 px-2 text-right">Bags</th>
                                          <th className="py-1.5 px-2 text-right">Weight</th>
                                          <th className="py-1.5 px-2 text-right">Rate</th>
                                          <th className="py-1.5 px-2 text-right">Total Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {item.ownPurchases.map((p) => (
                                          <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="py-1.5 px-2 font-medium">{p.id}</td>
                                            <td className="py-1.5 px-2">{p.date}</td>
                                            <td className="py-1.5 px-2 font-medium text-slate-900">{p.agency}</td>
                                            <td className="py-1.5 px-2 text-right font-bold text-slate-900">{p.bags}</td>
                                            <td className="py-1.5 px-2 text-right">{p.weightDisplay}</td>
                                            <td className="py-1.5 px-2 text-right">₹{p.rate}</td>
                                            <td className="py-1.5 px-2 text-right font-bold text-slate-900">
                                              ₹{p.totalAmount.toLocaleString('en-IN')}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                              {/* 3. Linked Farmers & Their Purchases */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-amber-700" />
                                    <span>
                                      3. {isEn ? 'Linked Farmers & Purchases' : 'ਸੰਬੰਧਿਤ ਕਿਸਾਨ ਅਤੇ ਉਨ੍ਹਾਂ ਦੀ ਖਰੀਦ'} (
                                      {item.linkedPurchasedBags} Bags)
                                    </span>
                                  </h4>
                                  <span className="text-xs font-bold text-amber-900">
                                    {item.linkedFarmers.length} {isEn ? 'Linked Farmers' : 'ਸੰਬੰਧਿਤ ਕਿਸਾਨ'}
                                  </span>
                                </div>

                                {item.linkedFarmers.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    {isEn
                                      ? 'No farmers are linked to this main farmer.'
                                      : 'ਇਸ ਮੁੱਖ ਕਿਸਾਨ ਨਾਲ ਕੋਈ ਸੰਬੰਧਿਤ ਕਿਸਾਨ ਲਿੰਕ ਨਹੀਂ ਹੈ।'}
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {item.linkedFarmerPurchases.map((lfp) => (
                                      <div
                                        key={lfp.linkedFarmerId}
                                        className="border border-slate-200 rounded-md p-2.5 bg-slate-50/50"
                                      >
                                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                          <div>
                                            <span className="font-bold text-slate-900 text-xs">
                                              {lfp.linkedFarmerName}
                                              {lfp.linkedFarmerNamePa ? ` (${lfp.linkedFarmerNamePa})` : ''}
                                            </span>
                                            <span className="text-[11px] text-slate-500 ml-2">
                                              S/o: {lfp.fatherName || '-'} | Village: {lfp.village || '-'} | Mobile:{' '}
                                              {lfp.mobile || '-'}
                                            </span>
                                          </div>
                                          <div className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            Subtotal: {lfp.totalBags} Bags
                                          </div>
                                        </div>

                                        {lfp.purchases.length === 0 ? (
                                          <p className="text-[11px] text-slate-400 italic py-1 mt-1">
                                            {isEn
                                              ? 'No purchases recorded for this linked farmer.'
                                              : 'ਇਸ ਸੰਬੰਧਿਤ ਕਿਸਾਨ ਦੁਆਰਾ ਕੋਈ ਖਰੀਦ ਨਹੀਂ ਕੀਤੀ ਗਈ।'}
                                          </p>
                                        ) : (
                                          <table className="w-full text-left text-[11px] border-collapse mt-1.5">
                                            <thead>
                                              <tr className="text-slate-500 font-bold border-b border-slate-200">
                                                <th className="py-1 px-1.5">Purchase ID</th>
                                                <th className="py-1 px-1.5">Date</th>
                                                <th className="py-1 px-1.5">Agency</th>
                                                <th className="py-1 px-1.5 text-right">Bags</th>
                                                <th className="py-1 px-1.5 text-right">Weight</th>
                                                <th className="py-1 px-1.5 text-right">Rate</th>
                                                <th className="py-1 px-1.5 text-right">Amount</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {lfp.purchases.map((lp) => (
                                                <tr key={lp.id}>
                                                  <td className="py-1 px-1.5">{lp.id}</td>
                                                  <td className="py-1 px-1.5">{lp.date}</td>
                                                  <td className="py-1 px-1.5 font-medium">{lp.agency}</td>
                                                  <td className="py-1 px-1.5 text-right font-bold text-slate-900">
                                                    {lp.bags}
                                                  </td>
                                                  <td className="py-1 px-1.5 text-right">{lp.weightDisplay}</td>
                                                  <td className="py-1 px-1.5 text-right">₹{lp.rate}</td>
                                                  <td className="py-1 px-1.5 text-right font-bold">
                                                    ₹{lp.totalAmount.toLocaleString('en-IN')}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 4. Complete Mathematical Reconciliation Box */}
                              <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                  <div className="flex items-center gap-2">
                                    <Calculator className="w-5 h-5 text-emerald-400" />
                                    <h4 className="text-sm font-black uppercase tracking-wider text-emerald-400">
                                      {isEn ? 'Final Reconciliation Summary' : 'ਸੰਪੂਰਨ ਲੇਬਰ ਤੇ ਬੈਲੇਂਸ ਗਣਨਾ'}
                                    </h4>
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Applicable Rate: ₹{item.applicableBagRate} / Bag
                                  </div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                  {/* Step 1 */}
                                  <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-400 uppercase block">Step 1: Purchases</span>
                                    <div className="mt-1 font-bold text-white">
                                      {item.ownPurchasedBags} (Own) + {item.linkedPurchasedBags} (Linked)
                                    </div>
                                    <div className="text-sm font-black text-emerald-400 mt-0.5">
                                      = {item.totalPurchasedBags} Total Purchased Bags
                                    </div>
                                  </div>

                                  {/* Step 2 */}
                                  <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-400 uppercase block">Step 2: Balance Before Labour</span>
                                    <div className="mt-1 font-bold text-white">
                                      {item.totalBagsBrought} (Brought) − {item.totalPurchasedBags} (Purchased)
                                    </div>
                                    <div className="text-sm font-black text-amber-400 mt-0.5">
                                      = {item.balanceBeforeLabourBags} Bags
                                    </div>
                                  </div>

                                  {/* Step 3 */}
                                  <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700">
                                    <span className="text-[10px] text-slate-400 uppercase block">Step 3: Labour Bags Adjustment</span>
                                    <div className="mt-1 font-bold text-white">
                                      ₹{Math.round(item.labourExpense).toLocaleString('en-IN')} ÷ ₹{item.applicableBagRate} = {item.rawLabourBags.toFixed(2)}
                                    </div>
                                    <div className="text-sm font-black text-rose-400 mt-0.5">
                                      = {item.labourBagsAdjustment} Bags (Round UP)
                                    </div>
                                  </div>

                                  {/* Step 4 */}
                                  <div className="bg-emerald-950/80 p-2.5 rounded border-2 border-emerald-500">
                                    <span className="text-[10px] text-emerald-300 uppercase block font-bold">
                                      Step 4: Final Remaining Balance
                                    </span>
                                    <div className="mt-1 font-bold text-slate-200">
                                      {item.balanceBeforeLabourBags} − {item.labourBagsAdjustment} (Labour Bags)
                                    </div>
                                    <div className="text-base font-black text-white mt-0.5">
                                      = {item.finalBalanceBags} Final Balance Bags
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* GRAND TOTALS FOOTER */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900 text-xs">
                  <td className="py-3 px-2 text-center">Σ</td>
                  <td className="py-3 px-3">
                    <span className="uppercase tracking-wider">
                      {isEn ? 'Grand Total' : 'ਕੁੱਲ ਜੋੜ'} ({filteredData.length} {isEn ? 'Farmers' : 'ਕਿਸਾਨ'})
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right text-sm">{grandTotals.totalBagsBrought}</td>
                  <td className="py-3 px-2 text-right">{grandTotals.totalOwnPurchase}</td>
                  <td className="py-3 px-2 text-right text-amber-300">{grandTotals.totalLinkedFarmerPurchase}</td>
                  <td className="py-3 px-2 text-right bg-slate-800 text-sm">{grandTotals.totalPurchase}</td>
                  <td className="py-3 px-2 text-right">
                    {grandTotals.totalBagsBrought - grandTotals.totalPurchase}
                  </td>
                  <td className="py-3 px-2 text-right">
                    ₹{Math.round(grandTotals.totalLabourExpense).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-2 text-right text-rose-300 text-sm">{grandTotals.totalLabourBags}</td>
                  <td className="py-3 px-3 text-right bg-black text-sm">
                    {grandTotals.finalBalanceBags} Bags
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
