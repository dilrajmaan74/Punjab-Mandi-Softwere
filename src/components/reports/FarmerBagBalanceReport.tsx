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
  ShieldAlert
} from 'lucide-react';
import { formatCurrencyINR, formatKgToQulKg } from '../../utils/calculations';
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
    setSelectedFarmerForAccount
  } = useMandi();

  const isEn = language === 'en';
  const { notifySaveSuccess, notifyError } = useNotification();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterType, setDateFilterType] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Applicable Bag Rate Setting (Default: 925 as in prompt example, or calculated from rate)
  const defaultCalculatedBagRate = useMemo(() => {
    const bagKg = settings.fixedBagWeightKg || 37.5;
    const qtlRate = settings.fixedRatePerQtl || 2461;
    // 37.5 * 2461 / 100 = 922.875, or 925 as user specified
    return 925;
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
  // Rule: Show ONLY MAIN farmers who have actually brought bags to the mandi.
  // Do NOT show linked farmers as separate main rows. Linked farmers are included under their linked main farmer.
  const reportData: FarmerBagBalanceItem[] = useMemo(() => {
    // 1. Filter bagsEntries by date range
    const filteredBags = bagsEntries.filter((b) => {
      if (dateFilterType === 'ALL') return true;
      const t = normalizeDateToComparable(b.date);
      return t >= dateRangeBounds.start && t <= dateRangeBounds.end;
    });

    // 2. Filter dailyPurchaseRecords by date range
    const filteredPurchases = dailyPurchaseRecords.filter((p) => {
      if (dateFilterType === 'ALL') return true;
      const t = normalizeDateToComparable(p.date);
      return t >= dateRangeBounds.start && t <= dateRangeBounds.end;
    });

    // 3. Find all MAIN farmers (farmer.linkedMainFarmerId is falsy)
    const mainFarmers = farmers.filter((f) => !f.linkedMainFarmerId);

    const items: FarmerBagBalanceItem[] = [];

    mainFarmers.forEach((mainFarmer) => {
      // Find all linked sub-farmers of this main farmer
      const linkedSubFarmers = farmers.filter((f) => f.linkedMainFarmerId === mainFarmer.id);

      // Bags brought by the main farmer
      const arrivalEntries = filteredBags.filter((b) => b.farmerId === mainFarmer.id);
      const totalBagsBrought = arrivalEntries.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
      const totalWeightBroughtKg = arrivalEntries.reduce((sum, b) => sum + (Number(b.grandTotalKg) || 0), 0);

      // CONSTRAINT: Show only MAIN farmers who have actually brought bags to the mandi
      if (totalBagsBrought <= 0 && arrivalEntries.length === 0) {
        return; // Exclude main farmers with no bags brought
      }

      // Own purchases made directly by this main farmer
      const ownPurchasesList = filteredPurchases.filter((p) => p.farmerId === mainFarmer.id);
      const ownPurchasedBags = ownPurchasesList.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
      const ownPurchasedWeightKg = ownPurchasesList.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);

      // Linked farmers purchases
      const linkedFarmerPurchases = linkedSubFarmers.map((subFarmer) => {
        const subPurchases = filteredPurchases.filter(
          (p) => p.farmerId === subFarmer.id || p.mainFarmerId === mainFarmer.id && p.farmerName === subFarmer.farmerName
        );
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

      // Total Purchase = Own Purchase + All Linked Farmers Purchase
      const totalPurchasedBags = ownPurchasedBags + linkedPurchasedBags;
      const totalPurchasedWeightKg = ownPurchasedWeightKg + linkedPurchasedWeightKg;
      const totalPurchasedAmount =
        ownPurchasesList.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0) +
        linkedFarmerPurchases.reduce((s, lf) => s + lf.totalAmount, 0);

      // Balance Before Labour = Total Bags Brought - Total Purchase
      const balanceBeforeLabourBags = totalBagsBrought - totalPurchasedBags;

      // Labour Expense
      // 1) If user has a manual override for this farmer, use it
      // 2) Else if arrival entries have recorded labour deductions, sum them
      // 3) Else calculate by default Pakki labour rate (e.g. ₹7/bag or ₹15/bag)
      let labourExpense = 0;
      if (farmerLabourOverrides[mainFarmer.id] !== undefined) {
        labourExpense = farmerLabourOverrides[mainFarmer.id];
      } else {
        const recordedLabour = arrivalEntries.reduce((sum, b) => {
          const lDeduction =
            b.labourDeductions?.totalLabourDeduction ??
            b.labourDeductions?.grandTotalDeductions ??
            0;
          return sum + Number(lDeduction);
        }, 0);

        if (recordedLabour > 0) {
          labourExpense = recordedLabour;
        } else {
          // Fallback to default Pakki labour rate per brought bag
          const defaultRate = settings.defaultPakkiLabourRate ?? 7;
          labourExpense = totalBagsBrought * defaultRate;
        }
      }

      // Labour Bags Adjustment = Labour Expense ÷ applicable Bag Rate, rounded UP to the next whole bag
      const safeBagRate = applicableBagRate > 0 ? applicableBagRate : 925;
      const rawLabourBags = labourExpense / safeBagRate;
      const labourBagsAdjustment = Math.ceil(rawLabourBags);

      // Final Balance Bags = Balance Before Labour - Labour Bags Adjustment
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
          newBags: Number(b.newBags ?? (b.bardana === 'NEW' ? b.bags : 0)),
          oldBags: Number(b.oldBags ?? (b.bardana === 'OLD' ? b.bags : 0)),
          bags: Number(b.bags) || 0,
          weightDisplay: b.grandTotalDisplay || formatKgToQulKg(b.grandTotalKg).displayEn,
          labourAmount: Number(b.labourDeductions?.totalLabourDeduction ?? 0)
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

    return items;
  }, [
    farmers,
    bagsEntries,
    dailyPurchaseRecords,
    dateFilterType,
    dateRangeBounds,
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
        item.farmerName.toLowerCase().includes(q) ||
        item.farmerNamePa.toLowerCase().includes(q) ||
        item.farmerId.toLowerCase().includes(q) ||
        (item.fatherName && item.fatherName.toLowerCase().includes(q)) ||
        (item.village && item.village.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.includes(q));

      const matchLinked = item.linkedFarmers.some(
        (lf) =>
          lf.farmerName.toLowerCase().includes(q) ||
          lf.farmerNamePa.toLowerCase().includes(q) ||
          lf.village.toLowerCase().includes(q) ||
          lf.mobile.includes(q)
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

  // PDF Export Trigger
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportFarmerBagLabourPDF(filteredData, settings, {
        dateFilterLabel: dateRangeBounds.label,
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
                  min="1"
                  step="1"
                  value={applicableBagRate}
                  onChange={(e) => setApplicableBagRate(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <button
                type="button"
                onClick={() => setApplicableBagRate(925)}
                className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200"
                title="Reset to standard ₹925"
              >
                ₹925
              </button>
              <button
                type="button"
                onClick={() => setApplicableBagRate(Math.round((37.5 / 100) * (settings.fixedRatePerQtl || 2461)))}
                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-md border border-slate-200"
                title="Calculated from MSP ₹2,461/Qtl"
              >
                ₹{Math.round((37.5 / 100) * (settings.fixedRatePerQtl || 2461))}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Formula: Labour Expense ÷ ₹{applicableBagRate} = Labour Bags (rounded UP)
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
