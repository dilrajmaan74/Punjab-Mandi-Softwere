import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  FileText,
  Printer,
  Download,
  Layers,
  Scale,
  ShoppingBag,
  Truck,
  Boxes,
  Calculator,
  Users,
  CreditCard,
  ArrowLeftRight,
  PackageCheck,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import {
  formatCurrency,
  formatKgToQulKg,
  FIXED_BAG_WEIGHT_KG
} from '../../utils/calculations';
import {
  exportFarmerAccountSummaryListPDF,
  exportFarmerAccountFullDetailsSingleOrAllPDF,
  exportMandiArrivalReportPDF,
  exportDailyPurchaseReportPDF,
  exportLeftingReportPDF,
  exportBardanaCategorizedPDF,
  exportStockBalanceCategoryPDF,
  exportFarmerRegisterPDF,
  exportAdvanceInterestPDF,
  exportPaymentAdjustmentPDF,
  exportBagTransferPDF,
  exportCombinedAllReportsPDF
} from '../../utils/reportsPdfExports';
import {
  getPaymentTransfers,
  getSameFarmerAdjustments,
  getBagTransfers
} from '../../utils/farmerAdjustmentsStorage';
import { StockLedgerExportOptions } from '../../utils/stockBalancePdfExport';

export type ReportCategoryTab =
  | 'farmer-account'
  | 'mandi-arrival'
  | 'daily-purchase'
  | 'lefting'
  | 'bardana'
  | 'stock-balance'
  | 'farmer-register'
  | 'advance-interest'
  | 'payment-adjustment'
  | 'bag-transfer';

export const MandiReports: React.FC = () => {
  const {
    farmers,
    bagsEntries,
    dailyPurchaseRecords,
    leftingRecords,
    bardanaRecords,
    farmerAdvances,
    agencies,
    settings,
    getAllFarmersPurchaseSummaries,
    language
  } = useMandi();

  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<ReportCategoryTab>('farmer-account');
  const [showCombinedModal, setShowCombinedModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Common Filter States
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterFarmerId, setFilterFarmerId] = useState<string>('ALL');
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterVillage, setFilterVillage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live adjustments from storage
  const paymentTransfers = useMemo(() => getPaymentTransfers(), [activeTab]);
  const sameAdjustments = useMemo(() => getSameFarmerAdjustments(), [activeTab]);
  const bagTransfers = useMemo(() => getBagTransfers(), [activeTab]);

  // Farmer purchase summaries
  const allSummaries = useMemo(() => getAllFarmersPurchaseSummaries(), [getAllFarmersPurchaseSummaries, farmers, bagsEntries, dailyPurchaseRecords, farmerAdvances]);

  // Unique villages
  const uniqueVillages = useMemo(() => Array.from(new Set(farmers.map((f) => f.village).filter(Boolean))), [farmers]);

  // Selected Farmer Object
  const selectedFarmer = useMemo(() => {
    if (!filterFarmerId || filterFarmerId === 'ALL') return null;
    return farmers.find((f) => f.id === filterFarmerId) || null;
  }, [farmers, filterFarmerId]);

  // Reset Filters when switching tabs
  const handleTabChange = (tab: ReportCategoryTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for safe PDF async triggers
  const runExport = async (task: () => Promise<void>) => {
    try {
      setIsExporting(true);
      await task();
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 1. Filtered Farmer Accounts
  const filteredFarmerSummaries = useMemo(() => {
    return allSummaries.filter((s) => {
      if (filterFarmerId !== 'ALL' && s.farmer.id !== filterFarmerId) return false;
      if (filterVillage !== 'ALL' && s.farmer.village !== filterVillage) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const f = s.farmer;
        const match =
          f.farmerName.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          (f.farmerNamePa && f.farmerNamePa.includes(q)) ||
          f.village.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allSummaries, filterFarmerId, filterVillage, searchQuery]);

  // 2. Filtered Mandi Arrivals (Tola)
  const filteredArrivals = useMemo(() => {
    return bagsEntries.filter((b) => {
      if (filterDate && b.date !== filterDate) return false;
      if (filterFarmerId !== 'ALL' && b.farmerId !== filterFarmerId) return false;
      if (filterVillage !== 'ALL' && b.farmerVillage !== filterVillage) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          b.farmerName.toLowerCase().includes(q) ||
          (b.farmerNamePa && b.farmerNamePa.includes(q)) ||
          b.entryNumber.toLowerCase().includes(q) ||
          b.farmerId.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [bagsEntries, filterDate, filterFarmerId, filterVillage, searchQuery]);

  // 3. Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return dailyPurchaseRecords.filter((p) => {
      if (filterDate && p.date !== filterDate) return false;
      if (filterAgency !== 'ALL' && p.agency !== filterAgency) return false;
      if (filterFarmerId !== 'ALL' && p.farmerId !== filterFarmerId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          p.farmerName.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.agency && p.agency.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [dailyPurchaseRecords, filterDate, filterAgency, filterFarmerId, searchQuery]);

  // 4. Filtered Lefting
  const filteredLeftings = useMemo(() => {
    return leftingRecords.filter((l) => {
      const d = l.date || (l as any).dispatchDate;
      if (filterDate && d !== filterDate) return false;
      if (filterAgency !== 'ALL' && l.agency !== filterAgency && (l as any).sellerOrAgency !== filterAgency) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          l.id.toLowerCase().includes(q) ||
          (l.sellerName && l.sellerName.toLowerCase().includes(q)) ||
          ((l as any).destination && (l as any).destination.toLowerCase().includes(q)) ||
          ((l as any).truckNo && (l as any).truckNo.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [leftingRecords, filterDate, filterAgency, searchQuery]);

  // 5. Filtered Bardana
  const filteredBardana = useMemo(() => {
    return bardanaRecords.filter((b) => {
      if (filterDate && b.date !== filterDate) return false;
      if (filterAgency !== 'ALL' && b.agency !== filterAgency) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          b.id.toLowerCase().includes(q) ||
          (b.sourceName && b.sourceName.toLowerCase().includes(q)) ||
          (b.agency && b.agency.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [bardanaRecords, filterDate, filterAgency, searchQuery]);

  // 6. Stock Balance Ledger Summary
  const stockBalanceData: StockLedgerExportOptions = useMemo(() => {
    const totTolaBags = bagsEntries.reduce((s, b) => s + b.bags, 0);
    const totTolaKg = bagsEntries.reduce((s, b) => s + b.grandTotalKg, 0);

    const totPurchBags = dailyPurchaseRecords.reduce((s, p) => s + (Number(p.bags) || 0), 0);
    const totPurchKg = dailyPurchaseRecords.reduce((s, p) => s + (Number(p.totalWeightKg) || 0), 0);

    const totLeftBags = leftingRecords.reduce((s, l) => s + (Number(l.bags) || 0), 0);
    const totLeftKg = leftingRecords.reduce((s, l) => s + (Number(l.totalWeightKg) || (Number(l.bags) || 0) * 37.5), 0);

    const totBardanaRecv = bardanaRecords
      .filter((b) => b.actionType !== 'GIVE')
      .reduce((s, b) => s + (Number(b.newBags) || 0) + (Number(b.oldBags) || 0), 0);

    return {
      settings,
      filterDateLabel: filterDate || 'All Dates (ਪੂਰਾ ਸੀਜ਼ਨ)',
      filterAgencyLabel: filterAgency !== 'ALL' ? filterAgency : 'All Agencies (ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ)',
      filterCategoryLabel: 'ALL CATEGORIES (ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ)',
      filterPartyLabel: 'All Parties (ਸਾਰੀਆਂ ਧਿਰਾਂ)',
      summary: {
        totalTolaBags: totTolaBags,
        totalPurchaseBags: totPurchBags,
        totalBardanaBags: totBardanaRecv,
        totalLeftingBags: totLeftBags
      },
      sections: [
        {
          categoryTitleEn: '1. TOLA / WEIGHMENT (ਮੰਡੀ ਆਮਦ ਤੁਲਾਈ)',
          categoryTitlePa: 'ਤੋਲ / ਮੰਡੀ ਆਮਦ',
          totalStockStr: `${totTolaBags.toLocaleString()} Bags (${formatKgToQulKg(totTolaKg).qtl} Qtl)`,
          rows: [
            {
              sourceType: 'Tola (ਤੋਲ)',
              totalQty: totTolaBags,
              totalQtyStr: `${totTolaBags}`,
              usedType: 'Purchase (ਖਰੀਦ)',
              usedQty: totPurchBags,
              usedQtyStr: `${totPurchBags}`,
              balance: totTolaBags - totPurchBags,
              balanceStr: `${totTolaBags - totPurchBags} Bags`,
              statusDesc: totTolaBags >= totPurchBags ? 'Unpurchased Paddy in Mandi' : 'Excess Purchase recorded'
            },
            {
              sourceType: 'Tola (ਤੋਲ)',
              totalQty: totTolaBags,
              totalQtyStr: `${totTolaBags}`,
              usedType: 'Lefting (ਲਿਫਟਿੰਗ)',
              usedQty: totLeftBags,
              usedQtyStr: `${totLeftBags}`,
              balance: totTolaBags - totLeftBags,
              balanceStr: `${totTolaBags - totLeftBags} Bags`,
              statusDesc: totTolaBags >= totLeftBags ? 'Remaining in Mandi Pharr' : 'Excess Lefting'
            },
            {
              sourceType: 'Tola (ਤੋਲ)',
              totalQty: totTolaBags,
              totalQtyStr: `${totTolaBags}`,
              usedType: 'Bardana (ਬਾਰਦਾਨਾ)',
              usedQty: totBardanaRecv,
              usedQtyStr: `${totBardanaRecv}`,
              balance: totTolaBags - totBardanaRecv,
              balanceStr: `${totTolaBags - totBardanaRecv} Bags`,
              statusDesc: 'Bags arrival vs Total Bardana Stock'
            }
          ]
        },
        {
          categoryTitleEn: '2. PURCHASE (ਸਰਕਾਰੀ ਖਰੀਦ ਲੇਖਾ)',
          categoryTitlePa: 'ਖਰੀਦ / ਪ੍ਰਕਿਉਰਮੈਂਟ',
          totalStockStr: `${totPurchBags.toLocaleString()} Bags (${formatKgToQulKg(totPurchKg).qtl} Qtl)`,
          rows: [
            {
              sourceType: 'Purchase (ਖਰੀਦ)',
              totalQty: totPurchBags,
              totalQtyStr: `${totPurchBags}`,
              usedType: 'Lefting (ਲਿਫਟਿੰਗ)',
              usedQty: totLeftBags,
              usedQtyStr: `${totLeftBags}`,
              balance: totPurchBags - totLeftBags,
              balanceStr: `${totPurchBags - totLeftBags} Bags`,
              statusDesc: totPurchBags >= totLeftBags ? 'Purchased Pending Lefting' : 'Over-dispatch'
            },
            {
              sourceType: 'Purchase (ਖਰੀਦ)',
              totalQty: totPurchBags,
              totalQtyStr: `${totPurchBags}`,
              usedType: 'Bardana (ਬਾਰਦਾਨਾ)',
              usedQty: totBardanaRecv,
              usedQtyStr: `${totBardanaRecv}`,
              balance: totPurchBags - totBardanaRecv,
              balanceStr: `${totPurchBags - totBardanaRecv} Bags`,
              statusDesc: 'Bags filled vs Bardana Received'
            }
          ]
        },
        {
          categoryTitleEn: '3. LEFTING / DISPATCH (ਸ਼ੈਲਰ ਰਵਾਨਗੀ)',
          categoryTitlePa: 'ਲਿਫਟਿੰਗ / ਸ਼ੈਲਰ ਡਿਸਪੈਚ',
          totalStockStr: `${totLeftBags.toLocaleString()} Bags (${formatKgToQulKg(totLeftKg).qtl} Qtl)`,
          rows: [
            {
              sourceType: 'Lefting (ਲਿਫਟਿੰਗ)',
              totalQty: totLeftBags,
              totalQtyStr: `${totLeftBags}`,
              usedType: 'Tola (ਤੋਲ)',
              usedQty: totTolaBags,
              usedQtyStr: `${totTolaBags}`,
              balance: totLeftBags - totTolaBags,
              balanceStr: `${totLeftBags - totTolaBags} Bags`,
              statusDesc: 'Total Dispatched compared to Total Arrival'
            },
            {
              sourceType: 'Lefting (ਲਿਫਟਿੰਗ)',
              totalQty: totLeftBags,
              totalQtyStr: `${totLeftBags}`,
              usedType: 'Purchase (ਖਰੀਦ)',
              usedQty: totPurchBags,
              usedQtyStr: `${totPurchBags}`,
              balance: totLeftBags - totPurchBags,
              balanceStr: `${totLeftBags - totPurchBags} Bags`,
              statusDesc: 'Dispatched compared to Purchased'
            }
          ]
        },
        {
          categoryTitleEn: '4. BARDANA / JUTH STOCK (ਬਾਰਦਾਨਾ ਸਟਾਕ)',
          categoryTitlePa: 'ਬਾਰਦਾਨਾ / ਜੂਠ ਸਟਾਕ',
          totalStockStr: `${totBardanaRecv.toLocaleString()} Bags`,
          rows: [
            {
              sourceType: 'Bardana (ਬਾਰਦਾਨਾ)',
              totalQty: totBardanaRecv,
              totalQtyStr: `${totBardanaRecv}`,
              usedType: 'Lefting (ਲਿਫਟਿੰਗ)',
              usedQty: totLeftBags,
              usedQtyStr: `${totLeftBags}`,
              balance: totBardanaRecv - totLeftBags,
              balanceStr: `${totBardanaRecv - totLeftBags} Bags`,
              statusDesc: 'Bardana in Mandi vs Dispatched'
            },
            {
              sourceType: 'Bardana (ਬਾਰਦਾਨਾ)',
              totalQty: totBardanaRecv,
              totalQtyStr: `${totBardanaRecv}`,
              usedType: 'Tola (ਤੋਲ)',
              usedQty: totTolaBags,
              usedQtyStr: `${totTolaBags}`,
              balance: totBardanaRecv - totTolaBags,
              balanceStr: `${totBardanaRecv - totTolaBags} Bags`,
              statusDesc: 'Available empty bags stock balance'
            }
          ]
        }
      ]
    };
  }, [settings, bagsEntries, dailyPurchaseRecords, leftingRecords, bardanaRecords, filterDate, filterAgency]);

  // 7. Filtered Farmer Master List
  const filteredFarmers = useMemo(() => {
    return farmers.filter((f) => {
      if (filterVillage !== 'ALL' && f.village !== filterVillage) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          f.farmerName.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          (f.farmerNamePa && f.farmerNamePa.includes(q)) ||
          f.mobile.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [farmers, filterVillage, searchQuery]);

  // 8. Filtered Advances
  const filteredAdvances = useMemo(() => {
    return farmerAdvances.filter((a) => {
      if (filterDate && a.date !== filterDate) return false;
      if (filterFarmerId !== 'ALL' && a.farmerId !== filterFarmerId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          a.id.toLowerCase().includes(q) ||
          (a.farmerName && a.farmerName.toLowerCase().includes(q)) ||
          a.farmerId.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [farmerAdvances, filterDate, filterFarmerId, searchQuery]);

  // 9. Filtered Payment Adjustments
  const filteredPaymentTransfers = useMemo(() => {
    return paymentTransfers.filter((p) => {
      if (filterFarmerId !== 'ALL' && p.fromFarmerId !== filterFarmerId && p.toFarmerId !== filterFarmerId) return false;
      if (filterDate && p.date !== filterDate) return false;
      return true;
    });
  }, [paymentTransfers, filterFarmerId, filterDate]);

  // 10. Filtered Bag Transfers
  const filteredBagTransfers = useMemo(() => {
    return bagTransfers.filter((b) => {
      if (filterFarmerId !== 'ALL' && b.fromFarmerId !== filterFarmerId && b.toFarmerId !== filterFarmerId) return false;
      if (filterDate && b.date !== filterDate) return false;
      return true;
    });
  }, [bagTransfers, filterFarmerId, filterDate]);

  // Master Combined Export
  const handleExportCombinedMasterPDF = async () => {
    setShowCombinedModal(false);
    await runExport(async () => {
      await exportCombinedAllReportsPDF({
        settings,
        farmers,
        summaries: allSummaries,
        arrivals: bagsEntries,
        purchases: dailyPurchaseRecords,
        leftings: leftingRecords,
        bardana: bardanaRecords,
        advances: farmerAdvances,
        transfers: paymentTransfers,
        sameAdjustments,
        bagTransfers
      });
    });
  };

  const tabsConfig: { id: ReportCategoryTab; titleEn: string; titlePa: string; icon: any }[] = [
    { id: 'farmer-account', titleEn: '1. Farmer Account', titlePa: 'ਕਿਸਾਨ ਖਾਤਾ', icon: Users },
    { id: 'mandi-arrival', titleEn: '2. Mandi Arrival (Tola)', titlePa: 'ਮੰਡੀ ਆਮਦ (ਤੋਲ)', icon: Scale },
    { id: 'daily-purchase', titleEn: '3. Daily Purchase', titlePa: 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ', icon: ShoppingBag },
    { id: 'lefting', titleEn: '4. Lefting / Dispatch', titlePa: 'ਲਿਫਟਿੰਗ ਰਿਪੋਰਟ', icon: Truck },
    { id: 'bardana', titleEn: '5. Bardana Report', titlePa: 'ਬਾਰਦਾਨਾ ਰਿਪੋਰਟ', icon: Boxes },
    { id: 'stock-balance', titleEn: '6. Stock Balance Ledger', titlePa: 'ਸਟਾਕ ਬੈਲੈਂਸ ਚਾਰਟ', icon: Calculator },
    { id: 'farmer-register', titleEn: '7. Farmer Master Register', titlePa: 'ਕਿਸਾਨ ਰਜਿਸਟਰ', icon: Users },
    { id: 'advance-interest', titleEn: '8. Advance & Interest', titlePa: 'ਅਡਵਾਂਸ ਤੇ ਵਿਆਜ', icon: CreditCard },
    { id: 'payment-adjustment', titleEn: '9. Payment Adjustment', titlePa: 'ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ', icon: ArrowLeftRight },
    { id: 'bag-transfer', titleEn: '10. Bag Transfer', titlePa: 'ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ', icon: PackageCheck }
  ];

  return (
    <div id="mandi-reports-container" className="space-y-6 print:m-0 print:p-0 print:bg-white print:text-black">
      {/* Top Banner & Combined PDF Button */}
      <div id="mandi-reports-header" className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>ਮੰਡੀ ਰਿਪੋਰਟਾਂ ਅਤੇ ਰਜਿਸਟਰ</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-base font-semibold text-slate-600 dark:text-slate-300">Reports & Registers</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dedicated A4 PDF & Print for Every Single Report • ਪੰਜਾਬ ਮੰਡੀ ਬੋਰਡ ਅਕਾਊਂਟਿੰਗ ਫਾਰਮੈਟ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Combined PDF Button (Only when explicitly wanted) */}
          <button
            id="combined-all-reports-pdf-btn"
            type="button"
            onClick={() => setShowCombinedModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-semibold shadow-sm transition-colors"
            title="Export all 10 reports combined into one master PDF book"
          >
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Combined PDF / ਸਾਰੀਆਂ ਰਿਪੋਰਟਾਂ ਇੱਕ PDF</span>
          </button>

          {/* Quick Print Active View */}
          <button
            id="print-active-report-btn"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Current / ਪ੍ਰਿੰਟ</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div id="reports-tab-bar" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-1.5 print:hidden">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.titleEn}</span>
                <span className="text-[11px] opacity-80">({tab.titlePa})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Filter Bar (Adaptive per tab) */}
      <div id="reports-filter-bar" className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="report-search-input"
              type="text"
              placeholder="Search farmer, voucher, truck, village... / ਖੋਜੋ"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date Filter (for arrival, purchase, lefting, bardana, advance) */}
          {(activeTab === 'mandi-arrival' ||
            activeTab === 'daily-purchase' ||
            activeTab === 'lefting' ||
            activeTab === 'bardana' ||
            activeTab === 'advance-interest' ||
            activeTab === 'payment-adjustment' ||
            activeTab === 'bag-transfer') && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="report-filter-date" className="text-[11px] text-slate-500">Date:</label>
              <input
                id="report-filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-xs bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  className="text-[11px] text-red-500 hover:underline ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Farmer Filter (for farmer account, arrival, purchase, advance, adjustment, bag transfer) */}
          {(activeTab === 'farmer-account' ||
            activeTab === 'mandi-arrival' ||
            activeTab === 'daily-purchase' ||
            activeTab === 'advance-interest' ||
            activeTab === 'payment-adjustment' ||
            activeTab === 'bag-transfer') && (
            <div className="min-w-[190px]">
              <select
                id="report-filter-farmer"
                value={filterFarmerId}
                onChange={(e) => setFilterFarmerId(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Farmers / ਸਾਰੇ ਕਿਸਾਨ ({farmers.length})</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.farmerName} ({f.fatherName || f.village}) - {f.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Agency Filter (for purchase, lefting, bardana, stock) */}
          {(activeTab === 'daily-purchase' || activeTab === 'lefting' || activeTab === 'bardana' || activeTab === 'stock-balance') && (
            <div className="min-w-[170px]">
              <select
                id="report-filter-agency"
                value={filterAgency}
                onChange={(e) => setFilterAgency(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Agencies / ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ</option>
                {agencies.map((ag) => (
                  <option key={ag.id} value={ag.nameEn}>
                    {ag.nameEn} ({ag.code || ag.namePa})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Village Filter (for farmer register, farmer account, arrivals) */}
          {(activeTab === 'farmer-register' || activeTab === 'farmer-account' || activeTab === 'mandi-arrival') && (
            <div className="min-w-[160px]">
              <select
                id="report-filter-village"
                value={filterVillage}
                onChange={(e) => setFilterVillage(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Villages / ਸਾਰੇ ਪਿੰਡ</option>
                {uniqueVillages.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reset All Filters */}
          <button
            type="button"
            onClick={() => {
              setFilterDate('');
              setFilterFarmerId('ALL');
              setFilterAgency('ALL');
              setFilterVillage('ALL');
              setSearchQuery('');
            }}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 underline"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FARMER ACCOUNT / ਕਿਸਾਨ ਖਾਤਾ */}
      {/* ========================================================================= */}
      {activeTab === 'farmer-account' && (
        <div id="report-view-farmer-account" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>1. Farmer Account / ਕਿਸਾਨ ਖਾਤਾ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredFarmerSummaries.length} Accounts
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedFarmer
                  ? `Active Farmer: ${selectedFarmer.farmerName} (${selectedFarmer.id}) • Dedicated Single Farmer Account Statement`
                  : 'Multi-Farmer Summary Ledger with Crop Amount, Advances, Interest, and Final Balance'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Simple Summary PDF */}
              <button
                id="btn-farmer-account-simple-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportFarmerAccountSummaryListPDF(
                      filteredFarmerSummaries,
                      settings,
                      selectedFarmer ? `${selectedFarmer.farmerName} (${selectedFarmer.id})` : 'All Farmers'
                    );
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simple PDF / ਸਧਾਰਨ PDF</span>
              </button>

              {/* Full Details PDF */}
              <button
                id="btn-farmer-account-full-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportFarmerAccountFullDetailsSingleOrAllPDF(
                      filteredFarmerSummaries,
                      settings,
                      filterFarmerId !== 'ALL' ? filterFarmerId : undefined
                    );
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Details PDF / ਪੂਰੀ ਜਾਣਕਾਰੀ PDF</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Sr</th>
                  <th className="py-3 px-3">Farmer ID</th>
                  <th className="py-3 px-3">Farmer Name</th>
                  <th className="py-3 px-3">Father Name</th>
                  <th className="py-3 px-3">Village</th>
                  <th className="py-3 px-3 text-right">Bags</th>
                  <th className="py-3 px-3 text-right">Weight (Qtl Kg)</th>
                  <th className="py-3 px-3 text-right">Crop Amount (₹)</th>
                  <th className="py-3 px-3 text-right">Advance+Int (₹)</th>
                  <th className="py-3 px-3 text-right">Net Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredFarmerSummaries.map((s, idx) => {
                  const f = s.farmer;
                  const bags = s.totalArrivalBags || s.totalPurchasedBags || 0;
                  const wtKg = s.totalArrivalKg || s.totalPurchasedKg || 0;
                  const cropAmt = s.netPayableAmount || s.grossAmount || 0;
                  const advInt = s.totalAdvanceAmount || 0;
                  const balance = s.finalBalance !== undefined ? s.finalBalance : cropAmt - advInt;
                  const wtF = formatKgToQulKg(wtKg);

                  return (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300">{f.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {f.farmerName} {f.farmerNamePa && <span className="text-slate-400 font-normal">({f.farmerNamePa})</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{f.fatherName || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{f.village}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{bags}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{wtF.qtl} Q {wtF.kg} K</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(cropAmt)}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-amber-600 dark:text-amber-400">{formatCurrency(advInt)}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MANDI ARRIVAL / ਮੰਡੀ ਆਮਦ ਰਿਪੋਰਟ (Tola) */}
      {/* ========================================================================= */}
      {activeTab === 'mandi-arrival' && (
        <div id="report-view-mandi-arrival" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>2. Mandi Arrival (Tola) / ਮੰਡੀ ਆਮਦ ਰਿਪੋਰਟ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredArrivals.length} Weighments
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Weighment slips with 37.5 KG standard bags, tota loose kg, bardana type, and total value
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Date-wise PDF */}
              <button
                id="btn-arrival-datewise-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportMandiArrivalReportPDF(filteredArrivals, settings, 'DATE_WISE', filterDate || 'All Dates');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Date-wise PDF / ਮਿਤੀ-ਵਾਰ PDF</span>
              </button>

              {/* Full Season PDF */}
              <button
                id="btn-arrival-full-season-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportMandiArrivalReportPDF(bagsEntries, settings, 'FULL_SEASON');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Season PDF / ਪੂਰੇ ਸੀਜ਼ਨ ਦਾ PDF</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Slip No</th>
                  <th className="py-3 px-3 text-center">Date</th>
                  <th className="py-3 px-3">Farmer</th>
                  <th className="py-3 px-3">Village</th>
                  <th className="py-3 px-3 text-right">Bags</th>
                  <th className="py-3 px-3 text-right">Weight (Qtl Kg)</th>
                  <th className="py-3 px-3 text-right">Tota (Kg)</th>
                  <th className="py-3 px-3 text-center">Bardana</th>
                  <th className="py-3 px-3 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredArrivals.map((b) => {
                  const wtF = formatKgToQulKg(b.grandTotalKg);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">{b.entryNumber}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{b.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {b.farmerName} {b.farmerFatherName && <span className="text-slate-400 font-normal">({b.farmerFatherName})</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{b.farmerVillage}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{b.bags}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{wtF.qtl} Q {wtF.kg} K</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">{b.totaKg.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${b.bardana === 'NEW' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {b.bardana}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(b.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DAILY PURCHASE / ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਰਿਪੋਰਟ */}
      {/* ========================================================================= */}
      {activeTab === 'daily-purchase' && (
        <div id="report-view-daily-purchase" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>3. Daily Purchase / ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਰਿਪੋਰਟ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredPurchases.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Government agency procurement, voucher details, rate per quintal, and Market Committee billing
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Date-wise PDF */}
              <button
                id="btn-purchase-datewise-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportDailyPurchaseReportPDF(filteredPurchases, settings, 'DATE_WISE', filterDate || 'All Dates', filterAgency);
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Date-wise PDF / ਮਿਤੀ-ਵਾਰ PDF</span>
              </button>

              {/* Full Register PDF */}
              <button
                id="btn-purchase-full-register-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportDailyPurchaseReportPDF(dailyPurchaseRecords, settings, 'FULL_REGISTER');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Register PDF / ਪੂਰਾ ਰਜਿਸਟਰ PDF</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Voucher</th>
                  <th className="py-3 px-3 text-center">Date</th>
                  <th className="py-3 px-3">Agency</th>
                  <th className="py-3 px-3">Farmer</th>
                  <th className="py-3 px-3">Village</th>
                  <th className="py-3 px-3 text-right">Bags</th>
                  <th className="py-3 px-3 text-right">Weight (Qtl Kg)</th>
                  <th className="py-3 px-3 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredPurchases.map((p) => {
                  const wtF = formatKgToQulKg(Number(p.totalWeightKg) || 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">{p.id}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{p.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{p.agency}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{p.farmerName}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.village}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{p.bags}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{wtF.qtl} Q {wtF.kg} K</td>
                      <td className="py-2.5 px-3 text-right">{p.rate || 0}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(p.totalAmount || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. LEFTING / ਲਿਫਟਿੰਗ ਰਿਪੋਰਟ */}
      {/* ========================================================================= */}
      {activeTab === 'lefting' && (
        <div id="report-view-lefting" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>4. Lefting / ਲਿਫਟਿੰਗ ਰਿਪੋਰਟ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredLeftings.length} Dispatches
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sheller dispatches, truck numbers, driver info, and gate pass verification
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Date-wise PDF */}
              <button
                id="btn-lefting-datewise-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportLeftingReportPDF(filteredLeftings, settings, 'DATE_WISE', filterDate || 'All Dates', filterAgency);
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Date-wise PDF / ਮਿਤੀ-ਵਾਰ PDF</span>
              </button>

              {/* Full Register PDF */}
              <button
                id="btn-lefting-full-register-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportLeftingReportPDF(leftingRecords, settings, 'FULL_REGISTER');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Lefting Register PDF / ਪੂਰਾ ਰਜਿਸਟਰ PDF</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Dispatch ID</th>
                  <th className="py-3 px-3 text-center">Date</th>
                  <th className="py-3 px-3">Agency</th>
                  <th className="py-3 px-3">Destination / Sheller</th>
                  <th className="py-3 px-3 text-center">Truck No</th>
                  <th className="py-3 px-3">Driver Name</th>
                  <th className="py-3 px-3 text-right">Bags</th>
                  <th className="py-3 px-3 text-right">Total Weight / ਕੁੱਲ ਵਜ਼ਨ</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredLeftings.map((l) => {
                  const bCount = Number(l.bags) || 0;
                  const wtKg = Number(l.totalWeightKg) || bCount * 37.5;
                  const wtF = formatKgToQulKg(wtKg);

                  return (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">{l.id}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{l.date || (l as any).dispatchDate}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{l.agency || (l as any).sellerOrAgency || '-'}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{l.sellerName || (l as any).destination || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800 dark:text-slate-200">{(l as any).truckNo || (l as any).truckNumber || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{l.driverName || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{bCount}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{wtF.qtl} Qtl {wtF.kg} Kg</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${l.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BARDANA / ਬਾਰਦਾਨਾ ਰਿਪੋਰਟ */}
      {/* ========================================================================= */}
      {activeTab === 'bardana' && (
        <div id="report-view-bardana" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>5. Bardana / ਬਾਰਦਾਨਾ ਰਿਪੋਰਟ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredBardana.length} Entries
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Separate registers for New Bardana, Old Bardana, or Combined Juth stock
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* New Bardana PDF */}
              <button
                id="btn-bardana-new-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportBardanaCategorizedPDF(filteredBardana, settings, 'NEW', filterDate);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>New Bardana PDF / ਨਵਾਂ ਬਾਰਦਾਨਾ</span>
              </button>

              {/* Old Bardana PDF */}
              <button
                id="btn-bardana-old-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportBardanaCategorizedPDF(filteredBardana, settings, 'OLD', filterDate);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Old Bardana PDF / ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ</span>
              </button>

              {/* Combined Bardana PDF */}
              <button
                id="btn-bardana-combined-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportBardanaCategorizedPDF(filteredBardana, settings, 'COMBINED', filterDate);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Combined Bardana PDF / ਕੁੱਲ ਬਾਰਦਾਨਾ</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Entry No</th>
                  <th className="py-3 px-3 text-center">Date</th>
                  <th className="py-3 px-3">Agency</th>
                  <th className="py-3 px-3">Source Party</th>
                  <th className="py-3 px-3 text-center">Action</th>
                  <th className="py-3 px-3 text-right">New Juth (Bags)</th>
                  <th className="py-3 px-3 text-right">Old Juth (Bags)</th>
                  <th className="py-3 px-3 text-right">Total Bags</th>
                  <th className="py-3 px-3">Remarks / Vehicle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredBardana.map((b) => {
                  const newB = Number(b.newBags) || 0;
                  const oldB = Number(b.oldBags) || 0;
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">{b.id}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{b.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{b.agency}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{b.sourceName || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${b.actionType === 'GIVE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {b.actionType === 'GIVE' ? 'Issued' : 'Received'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">{newB}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{oldB}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{newB + oldB}</td>
                      <td className="py-2.5 px-3 text-slate-500">{(b as any).vehicleNumber || (b as any).remarks || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STOCK BALANCE / ਸਟਾਕ ਬੈਲੈਂਸ ਰਿਪੋਰਟ */}
      {/* ========================================================================= */}
      {activeTab === 'stock-balance' && (
        <div id="report-view-stock-balance" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>6. Stock Balance Ledger / ਸਟਾਕ ਬੈਲੈਂਸ ਰਿਪੋਰਟ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  4 Ledger Categories
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Independent stock balances for Tola, Purchase, Lefting, and Bardana without combining
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Tola Balance PDF */}
              <button
                id="btn-stock-tola-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportStockBalanceCategoryPDF('TOLA', stockBalanceData);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tola Balance PDF / ਤੋਲ ਬੈਲੈਂਸ</span>
              </button>

              {/* Purchase Balance PDF */}
              <button
                id="btn-stock-purchase-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportStockBalanceCategoryPDF('PURCHASE', stockBalanceData);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Purchase Balance PDF / ਖਰੀਦ ਬੈਲੈਂਸ</span>
              </button>

              {/* Lefting Balance PDF */}
              <button
                id="btn-stock-lefting-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportStockBalanceCategoryPDF('LEFTING', stockBalanceData);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Lefting Balance PDF / ਲਿਫਟਿੰਗ ਬੈਲੈਂਸ</span>
              </button>

              {/* Bardana Balance PDF */}
              <button
                id="btn-stock-bardana-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportStockBalanceCategoryPDF('BARDANA', stockBalanceData);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bardana Balance PDF / ਬਾਰਦਾਨਾ ਬੈਲੈਂਸ</span>
              </button>

              {/* Full Stock Balance PDF */}
              <button
                id="btn-stock-full-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportStockBalanceCategoryPDF('FULL', stockBalanceData);
                  })
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Stock Balance PDF / ਪੂਰਾ ਸਟਾਕ ਬੈਲੈਂਸ</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Cards for each category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stockBalanceData.sections.map((sec, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{sec.categoryTitleEn}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
                    Total: {sec.totalStockStr}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sec.rows.map((r, rIdx) => (
                    <div key={rIdx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.sourceType} vs {r.usedType}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Total ({r.totalQtyStr}) − Deducted ({r.usedQtyStr})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold font-mono text-sm ${r.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {r.balanceStr}
                        </div>
                        <div className="text-[10px] text-slate-400">{r.statusDesc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. FARMER REGISTER / ਕਿਸਾਨ ਰਜਿਸਟਰ */}
      {/* ========================================================================= */}
      {activeTab === 'farmer-register' && (
        <div id="report-view-farmer-register" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>7. Farmer Register / ਕਿਸਾਨ ਰਜਿਸਟਰ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredFarmers.length} Farmers
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official Punjab Mandi Farmer Master Book with Aadhaar, mobile, and bank account credentials
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Complete Farmer List PDF */}
              <button
                id="btn-farmer-register-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportFarmerRegisterPDF(filteredFarmers, settings, filterVillage);
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Complete Farmer List PDF / ਪੂਰੀ ਸੂਚੀ PDF</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Sr</th>
                  <th className="py-3 px-3">Farmer ID</th>
                  <th className="py-3 px-3">Farmer Name</th>
                  <th className="py-3 px-3">Father Name</th>
                  <th className="py-3 px-3">Village</th>
                  <th className="py-3 px-3 text-center">Mobile</th>
                  <th className="py-3 px-3 text-center">Aadhaar</th>
                  <th className="py-3 px-3">Bank Account</th>
                  <th className="py-3 px-3">IFSC & Bank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredFarmers.map((f, idx) => (
                  <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">{f.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {f.farmerName} {f.farmerNamePa && <span className="text-slate-400 font-normal">({f.farmerNamePa})</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{f.fatherName || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{f.village}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{f.mobile}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{f.aadhaar ? `•••• ${f.aadhaar.slice(-4)}` : '-'}</td>
                    <td className="py-2.5 px-3 font-mono">{f.bankDetails?.accountNumber || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {f.bankDetails?.ifscCode || '-'} {f.bankDetails?.bankName && `(${f.bankDetails.bankName})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. ADVANCE PAYMENT & INTEREST / ਅਡਵਾਂਸ ਪੇਮੈਂਟ ਅਤੇ ਵਿਆਜ */}
      {/* ========================================================================= */}
      {activeTab === 'advance-interest' && (
        <div id="report-view-advance-interest" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>8. Advance Payment & Interest / ਅਡਵਾਂਸ ਪੇਮੈਂਟ ਅਤੇ ਵਿਆਜ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredAdvances.length} Advances
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Principal loans, monthly interest rates, elapsed days/months, and total interest calculation
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Farmer-wise PDF */}
              <button
                id="btn-advance-farmerwise-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportAdvanceInterestPDF(
                      filteredAdvances,
                      settings,
                      'FARMER_WISE',
                      selectedFarmer ? `${selectedFarmer.farmerName} (${selectedFarmer.id})` : 'All Farmers'
                    );
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Farmer-wise PDF / ਕਿਸਾਨ-ਵਾਰ</span>
              </button>

              {/* Date-wise PDF */}
              <button
                id="btn-advance-datewise-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportAdvanceInterestPDF(filteredAdvances, settings, 'DATE_WISE', filterDate || 'All Dates');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Date-wise PDF / ਮਿਤੀ-ਵਾਰ</span>
              </button>

              {/* Full Register PDF */}
              <button
                id="btn-advance-full-register-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportAdvanceInterestPDF(farmerAdvances, settings, 'FULL_REGISTER');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Register PDF / ਪੂਰਾ ਰਜਿਸਟਰ</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Adv ID</th>
                  <th className="py-3 px-3 text-center">Adv Date</th>
                  <th className="py-3 px-3">Farmer Name</th>
                  <th className="py-3 px-3 text-right">Principal (₹)</th>
                  <th className="py-3 px-3 text-center">Int Till Date</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3 text-right">Rate (%/mo)</th>
                  <th className="py-3 px-3 text-right">Interest (₹)</th>
                  <th className="py-3 px-3 text-right">Total Payable (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredAdvances.map((adv) => {
                  const principal = Number(adv.amount) || 0;
                  const interest = Number(adv.interestAmount) || 0;
                  const payable = Number(adv.totalPayableWithInterest) || principal + interest;

                  return (
                    <tr key={adv.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">{adv.id}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{adv.date}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{adv.farmerName || adv.farmerId}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(principal)}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{adv.interestTillDate || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                        {adv.totalDays || 0} D ({adv.monthsElapsed || 0}M {adv.daysElapsed || 0}D)
                      </td>
                      <td className="py-2.5 px-3 text-right">{adv.monthlyInterestRate}%</td>
                      <td className="py-2.5 px-3 text-right font-medium text-amber-600 dark:text-amber-400">{formatCurrency(interest)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(payable)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. PAYMENT ADJUSTMENT / ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ */}
      {/* ========================================================================= */}
      {activeTab === 'payment-adjustment' && (
        <div id="report-view-payment-adjustment" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>9. Payment Adjustment / ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredPaymentTransfers.length} Transfers
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inter-farmer payment deductions & credits and internal ledger re-allocations
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Farmer-wise PDF */}
              <button
                id="btn-adjustment-farmerwise-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportPaymentAdjustmentPDF(
                      paymentTransfers,
                      sameAdjustments,
                      settings,
                      'FARMER_WISE',
                      filterFarmerId !== 'ALL' ? filterFarmerId : undefined,
                      selectedFarmer?.farmerName
                    );
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Farmer-wise PDF / ਕਿਸਾਨ-ਵਾਰ</span>
              </button>

              {/* Full Register PDF */}
              <button
                id="btn-adjustment-full-register-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportPaymentAdjustmentPDF(paymentTransfers, sameAdjustments, settings, 'FULL_REGISTER');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Register PDF / ਪੂਰਾ ਰਜਿਸਟਰ</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Transfer ID</th>
                  <th className="py-3 px-3 text-center">Date</th>
                  <th className="py-3 px-3">From Farmer (Deduction −)</th>
                  <th className="py-3 px-3">To Farmer (Credit +)</th>
                  <th className="py-3 px-3 text-right">Transfer Amount (₹)</th>
                  <th className="py-3 px-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredPaymentTransfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">{t.id}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{t.date}</td>
                    <td className="py-2.5 px-3 font-medium text-red-600 dark:text-red-400">{t.fromFarmerName}</td>
                    <td className="py-2.5 px-3 font-medium text-emerald-600 dark:text-emerald-400">{t.toFarmerName}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{formatCurrency(t.amount)}</td>
                    <td className="py-2.5 px-3 text-slate-500">{t.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. BAG TRANSFER / ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ */}
      {/* ========================================================================= */}
      {activeTab === 'bag-transfer' && (
        <div id="report-view-bag-transfer" className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>10. Bag Transfer / ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {filteredBagTransfers.length} Transfers
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Transfer of remaining paddy bags quota from one farmer account to another
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {/* Farmer-wise PDF */}
              <button
                id="btn-bag-transfer-farmerwise-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportBagTransferPDF(
                      bagTransfers,
                      settings,
                      'FARMER_WISE',
                      filterFarmerId !== 'ALL' ? filterFarmerId : undefined,
                      selectedFarmer?.farmerName
                    );
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Farmer-wise PDF / ਕਿਸਾਨ-ਵਾਰ</span>
              </button>

              {/* Full Register PDF */}
              <button
                id="btn-bag-transfer-full-register-pdf"
                type="button"
                disabled={isExporting}
                onClick={() =>
                  runExport(async () => {
                    await exportBagTransferPDF(bagTransfers, settings, 'FULL_REGISTER');
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Register PDF / ਪੂਰਾ ਰਜਿਸਟਰ</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / ਪ੍ਰਿੰਟ</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider border-b border-slate-700">
                  <th className="py-3 px-3 text-center">Transfer ID</th>
                  <th className="py-3 px-3 text-center">Date</th>
                  <th className="py-3 px-3">From Farmer (Deduction −)</th>
                  <th className="py-3 px-3">To Farmer (Credit +)</th>
                  <th className="py-3 px-3 text-right">Bags Transferred</th>
                  <th className="py-3 px-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredBagTransfers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">{b.id}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{b.date}</td>
                    <td className="py-2.5 px-3 font-medium text-red-600 dark:text-red-400">{b.fromFarmerName}</td>
                    <td className="py-2.5 px-3 font-medium text-emerald-600 dark:text-emerald-400">{b.toFarmerName}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">{b.bags} Bags</td>
                    <td className="py-2.5 px-3 text-slate-500">{b.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMBINED PDF CONFIRMATION */}
      {/* ========================================================================= */}
      {showCombinedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Combined PDF / ਸਾਰੀਆਂ ਰਿਪੋਰਟਾਂ ਇੱਕ PDF
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Generate All 10 Reports into One Unified Master Book
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ਇਹ ਵਿਕਲਪ ਸਾਰੀਆਂ 10 ਮੰਡੀ ਰਿਪੋਰਟਾਂ (ਕਿਸਾਨ ਖਾਤਾ, ਮੰਡੀ ਆਮਦ, ਖਰੀਦ, ਲਿਫਟਿੰਗ, ਬਾਰਦਾਨਾ, ਸਟਾਕ ਬੈਲੈਂਸ, ਕਿਸਾਨ ਰਜਿਸਟਰ, ਅਡਵਾਂਸ ਤੇ ਵਿਆਜ, ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ ਅਤੇ ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ) ਦਾ ਇੱਕ ਸਾਂਝਾ A4 PDF ਮਾਸਟਰ ਲੈੱਜਰ ਤਿਆਰ ਕਰੇਗਾ।
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ਕਿਸੇ ਵੀ ਇੱਕ ਰਿਪੋਰਟ ਲਈ ਉਸਦੇ ਅੰਦਰਲੇ ਡੈਡੀਕੇਟਿਡ ਬਟਨ ਵਰਤੋ।</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ਸਿਰਫ਼ ਜਦੋਂ ਸਾਰੀਆਂ ਰਿਪੋਰਟਾਂ ਇਕੱਠੀਆਂ ਚਾਹੀਦੀਆਂ ਹੋਣ, ਤਦ ਹੀ ਇਹ ਡਾਊਨਲੋਡ ਕਰੋ।</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCombinedModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel / ਰੱਦ ਕਰੋ
              </button>
              <button
                type="button"
                onClick={handleExportCombinedMasterPDF}
                disabled={isExporting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Generating...' : 'Download Combined PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
