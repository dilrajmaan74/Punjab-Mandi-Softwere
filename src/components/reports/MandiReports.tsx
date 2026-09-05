import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Users,
  Package,
  Scale,
  DollarSign,
  Building2,
  ShoppingBag,
  UserCheck,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  formatCurrency,
  formatKgToQulKg,
  FIXED_RATE_PER_QTL,
  FIXED_BAG_WEIGHT_KG
} from '../../utils/calculations';
import { exportDailyPurchaseRegisterPDF } from '../../utils/purchasePdfExport';

type ReportTab = 'daily-totals' | 'weighment' | 'farmer-master' | 'village-summary' | 'bardana-summary' | 'market-committee';

export const MandiReports: React.FC = () => {
  const {
    farmers,
    bagsEntries,
    dailyPurchaseRecords,
    agencies,
    setActiveReceipt,
    settings,
    getAllFarmersPurchaseSummaries,
    getFarmerPurchaseSummary
  } = useMandi();

  const [activeTab, setActiveTab] = useState<ReportTab>('daily-totals');
  const [filterVillage, setFilterVillage] = useState<string>('ALL');
  const [filterBardana, setFilterBardana] = useState<string>('ALL');
  const [searchFarmer, setSearchFarmer] = useState<string>('');
  const [expandedDailyDates, setExpandedDailyDates] = useState<{ [date: string]: boolean }>({});

  const toggleDailyDate = (date: string) => {
    setExpandedDailyDates((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  // Market Committee Report Filters
  const [mcAgencyFilter, setMcAgencyFilter] = useState<string>('ALL');
  const [mcDateFilter, setMcDateFilter] = useState<string>('');
  const [mcVillageFilter, setMcVillageFilter] = useState<string>('ALL');
  const [mcSearchQuery, setMcSearchQuery] = useState<string>('');

  // Extract unique villages
  const uniqueVillages = Array.from(new Set(farmers.map((f) => f.village)));

  // Filtered Bags Entries
  const filteredBagsEntries = bagsEntries.filter((b) => {
    if (filterVillage !== 'ALL' && b.farmerVillage !== filterVillage) return false;
    if (filterBardana !== 'ALL' && b.bardana !== filterBardana) return false;
    if (searchFarmer) {
      const q = searchFarmer.toLowerCase();
      const match =
        b.farmerName.toLowerCase().includes(q) ||
        b.farmerNamePa.toLowerCase().includes(q) ||
        b.farmerId.toLowerCase().includes(q) ||
        b.entryNumber.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Filtered Daily Purchases for Market Committee tab
  const filteredPurchases = dailyPurchaseRecords.filter((p) => {
    if (mcAgencyFilter !== 'ALL' && p.agency !== mcAgencyFilter) return false;
    if (mcVillageFilter !== 'ALL' && p.village !== mcVillageFilter) return false;
    if (mcDateFilter.trim() && p.date !== mcDateFilter.trim()) return false;
    if (mcSearchQuery.trim()) {
      const q = mcSearchQuery.toLowerCase().trim();
      const match =
        p.id.toLowerCase().includes(q) ||
        p.agency.toLowerCase().includes(q) ||
        p.farmerName.toLowerCase().includes(q) ||
        (p.farmerNamePa && p.farmerNamePa.toLowerCase().includes(q)) ||
        p.farmerId.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Calculate totals
  const totalBags = filteredBagsEntries.reduce((s, b) => s + b.bags, 0);
  const totalBagsWeightKg = filteredBagsEntries.reduce((s, b) => s + b.totalBagsWeightKg, 0);
  const totalTotaKg = filteredBagsEntries.reduce((s, b) => s + b.totaKg, 0);
  const totalGrandKg = totalBagsWeightKg + totalTotaKg;
  const totalAmount = filteredBagsEntries.reduce((s, b) => s + b.totalAmount, 0);

  const bagsWeightBreakdown = formatKgToQulKg(totalBagsWeightKg);
  const grandTotalBreakdown = formatKgToQulKg(totalGrandKg);

  // Market committee purchase totals
  const mcTotalBags = filteredPurchases.reduce((s, p) => s + (Number(p.bags) || 0), 0);
  const mcTotalWeightKg = filteredPurchases.reduce((s, p) => s + (Number(p.totalWeightKg) || 0), 0);
  const mcTotalAmount = filteredPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);

  // Village summary aggregation
  const villageSummary = uniqueVillages.map((vil) => {
    const vilEntries = bagsEntries.filter((b) => b.farmerVillage === vil);
    const vilFarmers = farmers.filter((f) => f.village === vil);
    const vilBags = vilEntries.reduce((s, b) => s + b.bags, 0);
    const vilWeightKg = vilEntries.reduce((s, b) => s + b.grandTotalKg, 0);
    const vilAmount = vilEntries.reduce((s, b) => s + b.totalAmount, 0);
    const vilPa = vilFarmers[0]?.villagePa || vil;

    return {
      village: vil,
      villagePa: vilPa,
      farmerCount: vilFarmers.length,
      bags: vilBags,
      weightBreakdown: formatKgToQulKg(vilWeightKg),
      amount: vilAmount
    };
  });

  // Export CSV for Weighment
  const exportToCsv = () => {
    const headers = [
      'Slip No',
      'Date',
      'Farmer ID',
      'Farmer Name (English)',
      'Farmer Name (Punjabi)',
      'Father Name',
      'Village',
      'Mobile',
      'Aadhaar',
      'Bags',
      'Weight Per Bag (KG)',
      'Bags Weight',
      'Tota (KG)',
      'Grand Total Weight',
      'Bardana',
      'Rate Per Qtl',
      'Total Amount (INR)'
    ];

    const rows = filteredBagsEntries.map((b) => [
      b.entryNumber,
      b.date,
      b.farmerId,
      `"${b.farmerName}"`,
      `"${b.farmerNamePa}"`,
      `"${b.farmerFatherName || ''}"`,
      `"${b.farmerVillage}"`,
      b.farmerMobile,
      b.farmerAadhaar,
      b.bags,
      '37.50',
      `"${b.totalBagsWeightDisplay}"`,
      b.totaKg,
      `"${b.grandTotalDisplay}"`,
      b.bardana,
      b.ratePerQtl,
      b.totalAmount
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Punjab_Mandi_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Market Committee CSV
  const exportMarketCommitteeCsv = () => {
    const headers = [
      'Voucher ID',
      'Date',
      'Agency',
      'Farmer ID',
      'Farmer Name (English)',
      'Farmer Name (Punjabi)',
      'Father Name',
      'Village',
      'Mobile',
      'Bags Purchased',
      'Weight (Qul)',
      'Weight (Kg)',
      'Total Weight (KG)',
      'Rate (INR/Qtl)',
      'Total Amount (INR)',
      'Boli Number',
      'Gate Pass Number',
      'Remarks'
    ];

    const rows = filteredPurchases.map((p) => [
      p.id,
      p.date,
      `"${p.agency}"`,
      p.farmerId,
      `"${p.farmerName}"`,
      `"${p.farmerNamePa || ''}"`,
      `"${p.fatherName || ''}"`,
      `"${p.village}"`,
      p.mobile || '',
      p.bags,
      p.qul,
      p.kg,
      p.totalWeightKg.toFixed(2),
      p.rate,
      p.totalAmount.toFixed(2),
      `"${p.boliNumber || ''}"`,
      `"${p.gatePassNumber || ''}"`,
      `"${p.remarks || ''}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Market_Committee_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group all daily arrivals & purchases by Date for Daily Totals
  const dailyTotalsData = useMemo(() => {
    const dateMap = new Map<
      string,
      {
        date: string;
        arrivals: typeof bagsEntries;
        purchases: typeof dailyPurchaseRecords;
        uniqueFarmers: Set<string>;
        totalArrivalBags: number;
        totalArrivalKg: number;
        totalArrivalAmount: number;
        totalPurchasedBags: number;
        totalPurchasedKg: number;
        totalPurchasedAmount: number;
      }
    >();

    // Add all bags entries (Mandi Arrivals / Weighments)
    bagsEntries.forEach((b) => {
      if (!dateMap.has(b.date)) {
        dateMap.set(b.date, {
          date: b.date,
          arrivals: [],
          purchases: [],
          uniqueFarmers: new Set(),
          totalArrivalBags: 0,
          totalArrivalKg: 0,
          totalArrivalAmount: 0,
          totalPurchasedBags: 0,
          totalPurchasedKg: 0,
          totalPurchasedAmount: 0
        });
      }
      const entry = dateMap.get(b.date)!;
      entry.arrivals.push(b);
      entry.uniqueFarmers.add(b.farmerId);
      entry.totalArrivalBags += Number(b.bags) || 0;
      entry.totalArrivalKg += Number(b.grandTotalKg) || 0;
      entry.totalArrivalAmount += Number(b.totalAmount) || 0;
    });

    // Add all daily purchases (Procurement)
    dailyPurchaseRecords.forEach((p) => {
      if (!dateMap.has(p.date)) {
        dateMap.set(p.date, {
          date: p.date,
          arrivals: [],
          purchases: [],
          uniqueFarmers: new Set(),
          totalArrivalBags: 0,
          totalArrivalKg: 0,
          totalArrivalAmount: 0,
          totalPurchasedBags: 0,
          totalPurchasedKg: 0,
          totalPurchasedAmount: 0
        });
      }
      const entry = dateMap.get(p.date)!;
      entry.purchases.push(p);
      entry.uniqueFarmers.add(p.farmerId);
      entry.totalPurchasedBags += Number(p.bags) || 0;
      entry.totalPurchasedKg += Number(p.totalWeightKg) || 0;
      entry.totalPurchasedAmount += Number(p.totalAmount) || 0;
    });

    // Sort dates descending (newest first)
    return Array.from(dateMap.values()).sort((a, b) => {
      const partsA = a.date.split('/');
      const partsB = b.date.split('/');
      if (partsA.length === 3 && partsB.length === 3) {
        const dA = new Date(parseInt(partsA[2], 10), parseInt(partsA[1], 10) - 1, parseInt(partsA[0], 10));
        const dB = new Date(parseInt(partsB[2], 10), parseInt(partsB[1], 10) - 1, parseInt(partsB[0], 10));
        return dB.getTime() - dA.getTime();
      }
      return b.date.localeCompare(a.date);
    });
  }, [bagsEntries, dailyPurchaseRecords]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-600 rounded-lg text-white">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              ਮੰਡੀ ਰਿਪੋਰਟਾਂ ਤੇ ਤੁਲਾਈ ਰਜਿਸਟਰ (Mandi Reports & Registers)
            </h2>
            <p className="text-[11px] text-slate-500">
              ਬੋਰੀਆਂ ਤੁਲਾਈ ਰਜਿਸਟਰ, ਮਾਰਕੀਟ ਕਮੇਟੀ ਰਿਪੋਰਟ, ਕਿਸਾਨ ਸੂਚੀ, ਪਿੰਡ-ਵਾਰ ਰਿਪੋਰਟ ਅਤੇ PDF/CSV ਡਾਊਨਲੋਡ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'market-committee' ? (
            <>
              <button
                onClick={exportMarketCommitteeCsv}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ਕਮੇਟੀ CSV ਐਕਸਪੋਰਟ</span>
              </button>
              <button
                onClick={() =>
                  exportDailyPurchaseRegisterPDF(
                    filteredPurchases,
                    settings,
                    mcAgencyFilter === 'ALL' ? 'All Agencies' : mcAgencyFilter,
                    mcDateFilter || 'All Dates'
                  )
                }
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>ਕਮੇਟੀ PDF ਰਿਪੋਰਟ</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={exportToCsv}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV ਐਕਸਪੋਰਟ (Export CSV)</span>
              </button>
              <button
                onClick={handlePrint}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>ਪ੍ਰਿੰਟ ਰਜਿਸਟਰ (Print)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3 pt-2 rounded-t-xl print:hidden text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('daily-totals')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'daily-totals'
              ? 'border-indigo-600 text-indigo-700 font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
          <span>ਰੋਜ਼ਾਨਾ ਕੁੱਲ (Daily Totals)</span>
        </button>

        <button
          onClick={() => setActiveTab('weighment')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'weighment'
              ? 'border-rose-600 text-rose-600 font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          ਤੁਲਾਈ ਰਜਿਸਟਰ (Weighment Register)
        </button>

        <button
          onClick={() => setActiveTab('market-committee')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'market-committee'
              ? 'border-emerald-600 text-emerald-700 font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>ਮਾਰਕੀਟ ਕਮੇਟੀ ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਰਿਪੋਰਟ (Market Committee Report)</span>
        </button>

        <button
          onClick={() => setActiveTab('farmer-master')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'farmer-master'
              ? 'border-rose-600 text-rose-600 font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          ਕਿਸਾਨ ਮਾਸਟਰ ਸੂਚੀ (Farmer Directory)
        </button>
        <button
          onClick={() => setActiveTab('village-summary')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'village-summary'
              ? 'border-rose-600 text-rose-600 font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          ਪਿੰਡ-ਵਾਰ ਰਿਪੋਰਟ (Village Summary)
        </button>
        <button
          onClick={() => setActiveTab('bardana-summary')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'bardana-summary'
              ? 'border-rose-600 text-rose-600 font-black'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          ਬਾਰਦਾਨਾ ਰਿਪੋਰਟ (Old/New Bardana)
        </button>
      </div>

      {/* TAB: DAILY TOTALS (ਰੋਜ਼ਾਨਾ ਕੁੱਲ) */}
      {activeTab === 'daily-totals' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>ਰੋਜ਼ਾਨਾ ਕੁੱਲ (Daily Totals - Date-wise Farmer Breakdown)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  ਮਿਤੀ-ਵਾਰ ਕਿਸਾਨ ਸੂਚੀ, ਬੋਰੀਆਂ, ਕੁਇੰਟਲ, ਕੁੱਲ ਰਕਮ ਅਤੇ ਮੁੱਖ ਕਿਸਾਨ ਬੈਲੇਂਸ
                </p>
              </div>
              <div className="text-xs text-slate-600 font-mono">
                ਕੁੱਲ ਮਿਤੀਆਂ: <strong className="text-slate-900 font-black">{dailyTotalsData.length}</strong>
              </div>
            </div>

            {dailyTotalsData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ (No records found)
              </div>
            ) : (
              <div className="space-y-3">
                {dailyTotalsData.map((dGroup) => {
                  const isExpanded = !!expandedDailyDates[dGroup.date];

                  return (
                    <div
                      key={dGroup.date}
                      className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white"
                    >
                      {/* Date Header Bar */}
                      <div
                        onClick={() => toggleDailyDate(dGroup.date)}
                        className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 hover:bg-slate-100/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-2xs">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                              <span className="font-mono text-sm">{dGroup.date}</span>
                              <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {dGroup.uniqueFarmers.size} ਕਿਸਾਨ (Farmers)
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              ਆਮਦ: {dGroup.arrivals.length} ਐਂਟਰੀਆਂ • ਖਰੀਦ: {dGroup.purchases.length} ਐਂਟਰੀਆਂ
                            </div>
                          </div>
                        </div>

                        {/* Summary Badges & Chevron */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                            <span className="text-slate-500 font-bold">ਆਮਦ ਬੋਰੀਆਂ: </span>
                            <span className="font-mono font-black text-rose-950">
                              {dGroup.totalArrivalBags.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                            <span className="text-slate-500 font-bold">ਖਰੀਦ ਬੋਰੀਆਂ: </span>
                            <span className="font-mono font-black text-emerald-950">
                              {dGroup.totalPurchasedBags.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                            <span className="text-slate-500 font-bold">ਕੁੱਲ ਵਜ਼ਨ: </span>
                            <span className="font-mono font-black text-indigo-950">
                              {((dGroup.totalPurchasedKg || dGroup.totalArrivalKg) / 100).toFixed(2)} Qtl
                            </span>
                          </div>
                          <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                            <span className="text-slate-500 font-bold">ਰਕਮ: </span>
                            <span className="font-mono font-black text-slate-900">
                              ₹{(dGroup.totalPurchasedAmount || dGroup.totalArrivalAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-1 text-slate-400">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Farmer Breakdown */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 p-3 space-y-3 bg-white">
                          <div className="text-xs font-bold text-slate-800">
                            ਮਿਤੀ {dGroup.date} ਦੇ ਸਾਰੇ ਕਿਸਾਨਾਂ ਦਾ ਵੇਰਵਾ (Farmer-wise Breakdown):
                          </div>

                          <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                  <th className="py-2 px-3 w-10 text-center">#</th>
                                  <th className="py-2 px-3 min-w-[180px]">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name)</th>
                                  <th className="py-2 px-3 min-w-[130px]">ਪਿਤਾ ਦਾ ਨਾਂ (Father Name)</th>
                                  <th className="py-2 px-3 min-w-[100px]">ਪਿੰਡ (Village)</th>
                                  <th className="py-2 px-3 min-w-[110px]">ਕਿਸਮ (Type)</th>
                                  <th className="py-2 px-3 text-center bg-emerald-50 text-emerald-950 font-black">
                                    ਬੋਰੀਆਂ (Bags)
                                  </th>
                                  <th className="py-2 px-3 text-right bg-indigo-50 text-indigo-950 font-black">
                                    ਕੁਇੰਟਲ ਤੇ ਕਿਲੋ
                                  </th>
                                  <th className="py-2 px-3 text-right font-black text-slate-900">
                                    ਰਕਮ (₹)
                                  </th>
                                  <th className="py-2 px-3 min-w-[200px]">
                                    ਮੁੱਖ ਕਿਸਾਨ ਬੈਲੇਂਸ ਸਥਿਤੀ (Main Farmer Balance Status)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {/* Arrivals */}
                                {dGroup.arrivals.map((arr, idx) => {
                                  const sum = getFarmerPurchaseSummary(arr.farmerId);
                                  return (
                                    <tr key={`arr_${arr.id}`} className="hover:bg-slate-50/70">
                                      <td className="py-2 px-3 text-center font-mono text-slate-500">
                                        {idx + 1}
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="font-bold text-slate-900">{arr.farmerName}</div>
                                        {arr.farmerNamePa && (
                                          <div className="text-[10px] text-emerald-800 font-semibold">{arr.farmerNamePa}</div>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-slate-700">{arr.farmerFatherName || '—'}</td>
                                      <td className="py-2 px-3 text-slate-800">{arr.farmerVillage}</td>
                                      <td className="py-2 px-3">
                                        <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                                          ਮੰਡੀ ਆਮਦ
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/30">
                                        {arr.bags}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-indigo-950 bg-indigo-50/30">
                                        {arr.grandTotalDisplay}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                                        ₹{arr.totalAmount.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2 px-3 text-[11px]">
                                        {sum.isLinkedFarmer ? (
                                          <div className="text-emerald-900">
                                            <span className="font-bold">ਲਿੰਕਡ ਮੁੱਖ ਕਿਸਾਨ: </span>
                                            <span>{sum.linkedToMainFarmerName}</span>
                                            <div className="text-[10px] text-emerald-800 font-black">
                                              ਬਾਕੀ ਸਟਾਕ: {sum.remainingBags} ਬੋਰੀਆਂ
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-slate-800">
                                            <span>ਮੰਡੀ ਆਮਦ: {sum.mandiArrivalBags}</span>
                                            <span className="mx-1">•</span>
                                            <span>ਖਰੀਦ: {sum.alreadyPurchasedBags}</span>
                                            <div className="text-[10px] text-emerald-950 font-black">
                                              ਬਾਕੀ ਸਟਾਕ: {sum.remainingBags} ਬੋਰੀਆਂ
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Purchases */}
                                {dGroup.purchases.map((pur, idx) => {
                                  const sum = getFarmerPurchaseSummary(pur.farmerId);
                                  return (
                                    <tr key={`pur_${pur.id}`} className="hover:bg-slate-50/70">
                                      <td className="py-2 px-3 text-center font-mono text-slate-500">
                                        {dGroup.arrivals.length + idx + 1}
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="font-bold text-slate-900">{pur.farmerName}</div>
                                        {pur.farmerNamePa && (
                                          <div className="text-[10px] text-emerald-800 font-semibold">{pur.farmerNamePa}</div>
                                        )}
                                      </td>
                                      <td className="py-2 px-3 text-slate-700">{pur.fatherName || '—'}</td>
                                      <td className="py-2 px-3 text-slate-800">{pur.village}</td>
                                      <td className="py-2 px-3">
                                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                          ਖਰੀਦ ({pur.agency})
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-black text-emerald-950 bg-emerald-50/30">
                                        {pur.bags}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-bold text-indigo-950 bg-indigo-50/30">
                                        {pur.qul} Qtl {pur.kg > 0 ? `${pur.kg} Kg` : ''}
                                      </td>
                                      <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                                        ₹{pur.totalAmount.toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2 px-3 text-[11px]">
                                        {sum.isLinkedFarmer ? (
                                          <div className="text-emerald-900">
                                            <span className="font-bold">ਲਿੰਕਡ ਮੁੱਖ ਕਿਸਾਨ: </span>
                                            <span>{sum.linkedToMainFarmerName}</span>
                                            <div className="text-[10px] text-emerald-800 font-black">
                                              ਬਾਕੀ ਸਟਾਕ: {sum.remainingBags} ਬੋਰੀਆਂ
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-slate-800">
                                            <span>ਮੰਡੀ ਆਮਦ: {sum.mandiArrivalBags}</span>
                                            <span className="mx-1">•</span>
                                            <span>ਖਰੀਦ: {sum.alreadyPurchasedBags}</span>
                                            <div className="text-[10px] text-emerald-950 font-black">
                                              ਬਾਕੀ ਸਟਾਕ: {sum.remainingBags} ਬੋਰੀਆਂ
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>

                              {/* Date Grand Totals Footer */}
                              <tfoot className="bg-slate-100 font-black text-slate-900 border-t border-slate-200">
                                <tr>
                                  <td colSpan={5} className="py-2.5 px-3 text-right">
                                    ਮਿਤੀ {dGroup.date} ਕੁੱਲ ਜੋੜ (Date Grand Total):
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-emerald-950 bg-emerald-100/60">
                                    {(dGroup.totalPurchasedBags || dGroup.totalArrivalBags).toLocaleString('en-IN')} ਬੋਰੀਆਂ
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-indigo-950 bg-indigo-100/60">
                                    {((dGroup.totalPurchasedKg || dGroup.totalArrivalKg) / 100).toFixed(2)} Qtl
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-950">
                                    ₹{(dGroup.totalPurchasedAmount || dGroup.totalArrivalAmount).toLocaleString('en-IN')}
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
        </div>
      )}

      {/* TAB: MARKET COMMITTEE DAILY PURCHASE REPORT */}
      {activeTab === 'market-committee' && (
        <div className="space-y-4">
          {/* Market Committee Filters */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-700">ਕਮੇਟੀ ਫਿਲਟਰ:</span>
              </div>

              {/* Agency Filter */}
              <select
                value={mcAgencyFilter}
                onChange={(e) => setMcAgencyFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="ALL">ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)</option>
                {agencies.map((ag) => (
                  <option key={ag.id} value={ag.nameEn}>
                    {ag.namePa} ({ag.nameEn})
                  </option>
                ))}
              </select>

              {/* Village Filter */}
              <select
                value={mcVillageFilter}
                onChange={(e) => setMcVillageFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="ALL">ਸਾਰੇ ਪਿੰਡ (All Villages)</option>
                {uniqueVillages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              {/* Date Filter */}
              <input
                type="text"
                placeholder="ਮਿਤੀ: DD/MM/YYYY"
                value={mcDateFilter}
                onChange={(e) => setMcDateFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none"
              />

              {/* Search Query */}
              <input
                type="text"
                placeholder="ਕਿਸਾਨ, ਪਿੰਡ, ID ਜਾਂ ਵਾਊਚਰ ਖੋਜੋ..."
                value={mcSearchQuery}
                onChange={(e) => setMcSearchQuery(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="text-[11px] text-slate-600 font-mono">
              ਕੁੱਲ ਖਰੀਦ ਐਂਟਰੀਆਂ: <strong className="text-emerald-950 font-black">{filteredPurchases.length}</strong>
            </div>
          </div>

          {/* Committee KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                ਕੁੱਲ ਖਰੀਦ ਬੋਰੀਆਂ
              </span>
              <strong className="font-mono text-base font-black text-slate-900 block mt-0.5">
                {mcTotalBags.toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-slate-400">@ 37.50 KG / Bag</span>
            </div>

            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                ਕੁੱਲ ਵਜ਼ਨ (Weight)
              </span>
              <strong className="font-mono text-xs sm:text-sm font-black text-emerald-950 block mt-0.5">
                {(mcTotalWeightKg / 100).toFixed(2)} ਕੁਇੰਟਲ
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">{mcTotalWeightKg.toFixed(2)} KG</span>
            </div>

            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                ਸਰਕਾਰੀ MSP ਰੇਟ
              </span>
              <strong className="font-mono text-xs sm:text-sm font-black text-slate-900 block mt-0.5">
                ₹{settings.fixedRatePerQtl} / Qtl
              </strong>
              <span className="text-[10px] text-slate-400">Govt. Procurement Rate</span>
            </div>

            <div className="bg-white border border-emerald-300 p-3 rounded-xl shadow-2xs">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                ਕੁੱਲ ਖਰੀਦ ਰਕਮ (Payable)
              </span>
              <strong className="font-mono text-sm sm:text-base font-black text-emerald-950 block mt-0.5">
                ₹{mcTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <span className="text-[10px] text-emerald-700">Market Committee Total</span>
            </div>
          </div>

          {/* Committee Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">ਮਿਤੀ (Date)</th>
                    <th className="py-2.5 px-3">ਵਾਊਚਰ ID</th>
                    <th className="py-2.5 px-3">ਏਜੰਸੀ (Agency)</th>
                    <th className="py-2.5 px-3">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer)</th>
                    <th className="py-2.5 px-3">ਪਿੰਡ (Village)</th>
                    <th className="py-2.5 px-3 text-center">ਬੋਰੀਆਂ</th>
                    <th className="py-2.5 px-3 text-right">ਵਜ਼ਨ (Qul-Kg)</th>
                    <th className="py-2.5 px-3 text-right">ਭਾਅ (₹/Qtl)</th>
                    <th className="py-2.5 px-3 text-right font-black">ਕੁੱਲ ਰਕਮ (₹)</th>
                    <th className="py-2.5 px-3 text-center">ਲਾਟ / ਗੇਟ ਪਾਸ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 text-xs bg-slate-50/50">
                        <ShoppingBag className="w-7 h-7 mx-auto text-slate-300 mb-1" />
                        <span className="font-bold text-slate-700 block">ਕੋਈ ਖਰੀਦ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ</span>
                        <span className="text-[11px] text-slate-400">ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਮਾਡਿਊਲ ਵਿੱਚ ਨਵੀਂ ਖਰੀਦ ਐਂਟਰੀ ਸ਼ਾਮਲ ਕਰੋ।</span>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">{rec.date}</td>
                        <td className="py-2 px-3 font-mono font-black text-emerald-950 whitespace-nowrap">{rec.id}</td>
                        <td className="py-2 px-3 font-bold text-slate-800 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            {rec.agency}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{rec.farmerNamePa || rec.farmerName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{rec.farmerId}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{rec.village}</td>
                        <td className="py-2 px-3 text-center font-mono font-black text-slate-900 whitespace-nowrap">{rec.bags}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 whitespace-nowrap">
                          {rec.qul} Q {rec.kg} Kg
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          ₹{rec.rate.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-slate-950 whitespace-nowrap">
                          ₹{rec.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 font-mono text-[10px] whitespace-nowrap">
                          {rec.boliNumber || rec.gatePassNumber ? `${rec.boliNumber || '-'}${rec.gatePassNumber ? ` / ${rec.gatePassNumber}` : ''}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar (Only for Weighment tab) */}
      {activeTab === 'weighment' && (
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-700">ਫਿਲਟਰ:</span>
            </div>

            {/* Village Filter */}
            <select
              value={filterVillage}
              onChange={(e) => setFilterVillage(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">ਸਾਰੇ ਪਿੰਡ (All Villages)</option>
              {uniqueVillages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            {/* Bardana Filter */}
            <select
              value={filterBardana}
              onChange={(e) => setFilterBardana(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="ALL">ਸਾਰਾ ਬਾਰਦਾਨਾ (All Bardana)</option>
              <option value="NEW">ਨਵਾਂ ਬਾਰਦਾਨਾ (New)</option>
              <option value="OLD">ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old)</option>
            </select>

            {/* Farmer Search */}
            <input
              type="text"
              placeholder="ਕਿਸਾਨ ਜਾਂ ਰਸੀਦ ਨੰਬਰ ਖੋਜੋ..."
              value={searchFarmer}
              onChange={(e) => setSearchFarmer(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
            />
          </div>

          <div className="text-[11px] text-slate-600 font-mono">
            ਕੁੱਲ ਰਿਕਾਰਡ: <strong className="text-slate-900">{filteredBagsEntries.length}</strong>
          </div>
        </div>
      )}

      {/* Summary KPI Ribbon for Filtered Results (For Weighment Tab) */}
      {activeTab === 'weighment' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">ਕੁੱਲ ਬੋਰੀਆਂ</div>
            <div className="text-base font-black font-mono text-slate-900 mt-0.5">{totalBags}</div>
            <div className="text-[9px] text-slate-400">@ 37.50 KG / Bag</div>
          </div>
          <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">ਬੋਰੀਆਂ ਦਾ ਵਜ਼ਨ</div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-900 mt-0.5 truncate">
              {bagsWeightBreakdown.displayEn}
            </div>
            <div className="text-[9px] text-slate-400 truncate">{bagsWeightBreakdown.displayPa}</div>
          </div>
          <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">ਵੱਖਰਾ ਟੋਟਾ</div>
            <div className="text-base font-black font-mono text-amber-800 mt-0.5">{totalTotaKg} Kg</div>
            <div className="text-[9px] text-slate-400">Separate Tota</div>
          </div>
          <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">ਗ੍ਰੈਂਡ ਟੋਟਲ ਵਜ਼ਨ</div>
            <div className="text-xs sm:text-sm font-black font-mono text-emerald-900 mt-0.5 truncate">
              {grandTotalBreakdown.displayEn}
            </div>
            <div className="text-[9px] text-slate-400 truncate">Bags + Tota</div>
          </div>
          <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
            <div className="text-[10px] text-slate-500 font-semibold">ਕੁੱਲ ਰਕਮ (@ ₹2,461)</div>
            <div className="text-xs sm:text-sm font-black font-mono text-slate-950 mt-0.5 truncate">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-[9px] text-slate-400">₹2,461 / Qul</div>
          </div>
        </div>
      )}

      {/* Main Content by Tab */}
      {activeTab === 'weighment' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ਰਸੀਦ / ਮਿਤੀ</th>
                  <th className="py-2.5 px-3">ਕਿਸਾਨ ਆਈ.ਡੀ</th>
                  <th className="py-2.5 px-3">ਕਿਸਾਨ ਦਾ ਨਾਂ ਤੇ ਪਿੰਡ</th>
                  <th className="py-2.5 px-3 text-center">ਬੋਰੀਆਂ</th>
                  <th className="py-2.5 px-3 text-right">ਬੋਰੀ ਵਜ਼ਨ (Qul+Kg)</th>
                  <th className="py-2.5 px-3 text-right">ਟੋਟਾ (Kg)</th>
                  <th className="py-2.5 px-3 text-right font-black">ਕੁੱਲ ਵਜ਼ਨ (Grand)</th>
                  <th className="py-2.5 px-3 text-center">ਬਾਰਦਾਨਾ</th>
                  <th className="py-2.5 px-3 text-right">ਕੁੱਲ ਰਕਮ (@ ₹2,461)</th>
                  <th className="py-2.5 px-3 text-right print:hidden">ਰਸੀਦ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBagsEntries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                      ਕੋਈ ਰਿਕਾਰਡ ਉਪਲਬਧ ਨਹੀਂ ਹੈ (No Data Available)
                    </td>
                  </tr>
                ) : (
                  filteredBagsEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {entry.entryNumber}
                        <span className="block text-[10px] text-slate-400 font-normal">{entry.date}</span>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{entry.farmerId}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">
                          {entry.farmerNamePa} ({entry.farmerName})
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {entry.farmerVillagePa || entry.farmerVillage} • Mob: {entry.farmerMobile}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold">{entry.bags}</td>
                      <td className="py-2 px-3 text-right font-mono">{entry.totalBagsWeightDisplay}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-800 font-bold">
                        {entry.totaKg} Kg
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
                          {entry.bardana === 'OLD' ? 'ਪੁਰਾਣਾ' : 'ਨਵਾਂ'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-950">
                        {formatCurrency(entry.totalAmount)}
                      </td>
                      <td className="py-2 px-3 text-right print:hidden">
                        <button
                          onClick={() => setActiveReceipt(entry)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-1 rounded-md"
                          title="ਪ੍ਰਿੰਟ ਰਸੀਦ"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Farmer Master Register */}
      {activeTab === 'farmer-master' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ਕਿਸਾਨ ਆਈ.ਡੀ</th>
                  <th className="py-2.5 px-3">ਕਿਸਾਨ ਦਾ ਨਾਂ (English / ਪੰਜਾਬੀ)</th>
                  <th className="py-2.5 px-3">ਪਿਤਾ ਦਾ ਨਾਂ</th>
                  <th className="py-2.5 px-3">ਪਿੰਡ ਤੇ ਪਿੰਨ ਕੋਡ</th>
                  <th className="py-2.5 px-3">ਮੋਬਾਈਲ ਨੰਬਰ</th>
                  <th className="py-2.5 px-3">ਆਧਾਰ ਨੰਬਰ</th>
                  <th className="py-2.5 px-3">ਬੈਂਕ ਵੇਰਵੇ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {farmers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ (No Data Available)
                    </td>
                  </tr>
                ) : (
                  farmers.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-emerald-800">{f.id}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {f.farmerNamePa} ({f.farmerName})
                      </td>
                      <td className="py-2 px-3 text-slate-700">{f.fatherNamePa || f.fatherName || '—'}</td>
                      <td className="py-2 px-3">
                        {f.villagePa || f.village} ({f.pinCode})
                      </td>
                      <td className="py-2 px-3 font-mono">{f.mobile}</td>
                      <td className="py-2 px-3 font-mono">{f.aadhaar}</td>
                      <td className="py-2 px-3 text-[11px]">
                        {f.bankDetails?.accountNumber ? (
                          <div className="text-slate-900 leading-tight space-y-0.5">
                            <span className="font-bold block text-slate-900 break-words">{f.bankDetails.bankName}</span>
                            <span className="text-[10px] text-purple-900 font-mono block">
                              A/C: {f.bankDetails.accountNumber} • IFSC: {f.bankDetails.ifscCode}
                            </span>
                            {(f.bankDetails.branchName || f.bankDetails.branchAddress) && (
                              <span className="text-[10px] text-slate-500 block break-words">
                                {f.bankDetails.branchName ? `${f.bankDetails.branchName}` : ''}
                                {f.bankDetails.branchAddress ? ` (${f.bankDetails.branchAddress})` : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">ਦਰਜ ਨਹੀਂ</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Village Summary */}
      {activeTab === 'village-summary' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ਪਿੰਡ ਦਾ ਨਾਂ (Village)</th>
                  <th className="py-2.5 px-3 text-center">ਰਜਿਸਟਰਡ ਕਿਸਾਨ</th>
                  <th className="py-2.5 px-3 text-center">ਕੁੱਲ ਬੋਰੀਆਂ</th>
                  <th className="py-2.5 px-3 text-right">ਕੁੱਲ ਵਜ਼ਨ (Grand Total)</th>
                  <th className="py-2.5 px-3 text-right">ਕੁੱਲ ਰਕਮ (@ ₹2,461)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {villageSummary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      ਕੋਈ ਪਿੰਡ ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ (No Data Available)
                    </td>
                  </tr>
                ) : (
                  villageSummary.map((vs) => (
                    <tr key={vs.village} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {vs.villagePa} ({vs.village})
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">{vs.farmerCount}</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">{vs.bags}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-950">
                        {vs.weightBreakdown.displayEn}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                        {formatCurrency(vs.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Bardana Summary */}
      {activeTab === 'bardana-summary' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-emerald-300 rounded-xl p-4 shadow-2xs space-y-3">
            <h3 className="font-black text-emerald-900 text-xs sm:text-sm flex items-center justify-between">
              <span>ਨਵਾਂ ਬਾਰਦਾਨਾ (New Bag Summary)</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
                NEW
              </span>
            </h3>
            {(() => {
              const newEntries = bagsEntries.filter((b) => b.bardana === 'NEW');
              const newBags = newEntries.reduce((s, b) => s + b.bags, 0);
              const newWeight = newEntries.reduce((s, b) => s + b.grandTotalKg, 0);
              const newAmount = newEntries.reduce((s, b) => s + b.totalAmount, 0);
              return (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">ਕੁੱਲ ਐਂਟਰੀਆਂ:</span>
                    <strong className="font-mono">{newEntries.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">ਕੁੱਲ ਬੋਰੀਆਂ (Bags):</span>
                    <strong className="font-mono text-base font-black">{newBags}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">ਕੁੱਲ ਵਜ਼ਨ:</span>
                    <strong className="font-mono font-bold text-emerald-900">
                      {formatKgToQulKg(newWeight).displayEn}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">ਕੁੱਲ ਰਕਮ:</span>
                    <strong className="font-mono font-black text-slate-900">
                      {formatCurrency(newAmount)}
                    </strong>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="bg-white border border-amber-300 rounded-xl p-4 shadow-2xs space-y-3">
            <h3 className="font-black text-amber-900 text-xs sm:text-sm flex items-center justify-between">
              <span>ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Bag Summary)</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                OLD
              </span>
            </h3>
            {(() => {
              const oldEntries = bagsEntries.filter((b) => b.bardana === 'OLD');
              const oldBags = oldEntries.reduce((s, b) => s + b.bags, 0);
              const oldWeight = oldEntries.reduce((s, b) => s + b.grandTotalKg, 0);
              const oldAmount = oldEntries.reduce((s, b) => s + b.totalAmount, 0);
              return (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">ਕੁੱਲ ਐਂਟਰੀਆਂ:</span>
                    <strong className="font-mono">{oldEntries.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">ਕੁੱਲ ਬੋਰੀਆਂ (Bags):</span>
                    <strong className="font-mono text-base font-black">{oldBags}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">ਕੁੱਲ ਵਜ਼ਨ:</span>
                    <strong className="font-mono font-bold text-amber-900">
                      {formatKgToQulKg(oldWeight).displayEn}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">ਕੁੱਲ ਰਕਮ:</span>
                    <strong className="font-mono font-black text-slate-900">
                      {formatCurrency(oldAmount)}
                    </strong>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
