import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Building2,
  PackageCheck,
  Scale,
  Calendar,
  Search,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency, formatLeftingWeightQtlKg } from '../../utils/calculations';

interface AgencySummaryItem {
  agencyName: string;
  totalPurchasedBags: number;
  totalPurchasedKg: number;
  totalPurchasedAmount: number;
  totalLiftedBags: number;
  totalLiftedKg: number;
  balancePendingBags: number;
  balancePendingKg: number;
  liftingPercentage: number;
  totalDispatchesCount: number;
  deliveredBags: number;
  shortageKg: number;
  rejectedBags: number;
}

export const AgencyLiftingReport: React.FC = () => {
  const { leftingRecords, dailyPurchaseRecords, language, activeFirm, settings } = useMandi();
  const isEn = language === 'en';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState<string>('ALL');

  // List of all distinct agencies present across purchases or lefting
  const allAgencies = useMemo(() => {
    const agencySet = new Set<string>();
    dailyPurchaseRecords.forEach((p) => {
      const name = p.agency?.trim();
      if (name) agencySet.add(name);
    });
    leftingRecords.forEach((l) => {
      const name = l.agency?.trim();
      if (name) agencySet.add(name);
    });

    // Standard list defaults
    ['Pungrain', 'Markfed', 'Punsup', 'PSWC', 'FCI'].forEach((std) => agencySet.add(std));
    return Array.from(agencySet).filter(Boolean).sort();
  }, [dailyPurchaseRecords, leftingRecords]);

  // Aggregate stats by agency
  const agencySummaries: AgencySummaryItem[] = useMemo(() => {
    // Normalization helper: "Pungrain (ਪਨਗ੍ਰੇਨ)" vs "Pungrain"
    const normalize = (name: string) => {
      const clean = (name || '').toLowerCase().split('(')[0].trim();
      return clean;
    };

    // Grouping map
    const map = new Map<string, AgencySummaryItem>();

    // Seed map with all known agencies
    allAgencies.forEach((ag) => {
      map.set(ag, {
        agencyName: ag,
        totalPurchasedBags: 0,
        totalPurchasedKg: 0,
        totalPurchasedAmount: 0,
        totalLiftedBags: 0,
        totalLiftedKg: 0,
        balancePendingBags: 0,
        balancePendingKg: 0,
        liftingPercentage: 0,
        totalDispatchesCount: 0,
        deliveredBags: 0,
        shortageKg: 0,
        rejectedBags: 0
      });
    });

    // Accumulate purchases
    dailyPurchaseRecords.forEach((p) => {
      const pName = p.agency?.trim() || 'Unknown';
      let foundKey = Array.from(map.keys()).find((k) => normalize(k) === normalize(pName));
      if (!foundKey) {
        foundKey = pName;
        map.set(foundKey, {
          agencyName: foundKey,
          totalPurchasedBags: 0,
          totalPurchasedKg: 0,
          totalPurchasedAmount: 0,
          totalLiftedBags: 0,
          totalLiftedKg: 0,
          balancePendingBags: 0,
          balancePendingKg: 0,
          liftingPercentage: 0,
          totalDispatchesCount: 0,
          deliveredBags: 0,
          shortageKg: 0,
          rejectedBags: 0
        });
      }

      const item = map.get(foundKey)!;
      item.totalPurchasedBags += Number(p.bags || 0);
      item.totalPurchasedKg += Number(p.totalWeightKg || (p.bags || 0) * 37.5);
      item.totalPurchasedAmount += Number(p.netAmount ?? p.totalAmount ?? 0);
    });

    // Accumulate liftings
    leftingRecords.forEach((l) => {
      const lName = l.agency?.trim() || 'Unknown';
      let foundKey = Array.from(map.keys()).find((k) => normalize(k) === normalize(lName));
      if (!foundKey) {
        foundKey = lName;
        map.set(foundKey, {
          agencyName: foundKey,
          totalPurchasedBags: 0,
          totalPurchasedKg: 0,
          totalPurchasedAmount: 0,
          totalLiftedBags: 0,
          totalLiftedKg: 0,
          balancePendingBags: 0,
          balancePendingKg: 0,
          liftingPercentage: 0,
          totalDispatchesCount: 0,
          deliveredBags: 0,
          shortageKg: 0,
          rejectedBags: 0
        });
      }

      const item = map.get(foundKey)!;
      item.totalLiftedBags += Number(l.bags || 0);
      item.totalLiftedKg += Number(l.totalWeightKg || (l.bags || 0) * 37.5);
      item.totalDispatchesCount += 1;
      if (l.status === 'DELIVERED') {
        item.deliveredBags += Number(l.bags || 0);
      }
      item.shortageKg += Number(l.shortageKg || 0);
      item.rejectedBags += Number(l.rejectedBags || 0);
    });

    // Finalize pending & percentage
    const results: AgencySummaryItem[] = [];
    map.forEach((item) => {
      // Only keep agencies that have at least some purchase or lifting
      if (item.totalPurchasedBags > 0 || item.totalLiftedBags > 0) {
        item.balancePendingBags = Math.max(0, item.totalPurchasedBags - item.totalLiftedBags);
        item.balancePendingKg = Math.max(0, item.totalPurchasedKg - item.totalLiftedKg);
        item.liftingPercentage = item.totalPurchasedBags > 0
          ? Math.min(100, Math.round((item.totalLiftedBags / item.totalPurchasedBags) * 100))
          : 0;
        results.push(item);
      }
    });

    // Sort descending by total purchases
    return results.sort((a, b) => b.totalPurchasedBags - a.totalPurchasedBags);
  }, [allAgencies, dailyPurchaseRecords, leftingRecords]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return agencySummaries.filter((item) => {
      if (selectedAgencyFilter !== 'ALL' && item.agencyName !== selectedAgencyFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.agencyName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [agencySummaries, selectedAgencyFilter, searchQuery]);

  // Overall totals
  const overallTotals = useMemo(() => {
    return filteredSummaries.reduce(
      (acc, curr) => ({
        purchasedBags: acc.purchasedBags + curr.totalPurchasedBags,
        purchasedKg: acc.purchasedKg + curr.totalPurchasedKg,
        purchasedAmount: acc.purchasedAmount + curr.totalPurchasedAmount,
        liftedBags: acc.liftedBags + curr.totalLiftedBags,
        liftedKg: acc.liftedKg + curr.totalLiftedKg,
        pendingBags: acc.pendingBags + curr.balancePendingBags,
        pendingKg: acc.pendingKg + curr.balancePendingKg,
        dispatches: acc.dispatches + curr.totalDispatchesCount,
        shortageKg: acc.shortageKg + curr.shortageKg
      }),
      {
        purchasedBags: 0,
        purchasedKg: 0,
        purchasedAmount: 0,
        liftedBags: 0,
        liftedKg: 0,
        pendingBags: 0,
        pendingKg: 0,
        dispatches: 0,
        shortageKg: 0
      }
    );
  }, [filteredSummaries]);

  const overallPercentage = overallTotals.purchasedBags > 0
    ? Math.round((overallTotals.liftedBags / overallTotals.purchasedBags) * 100)
    : 0;

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Agency Name',
      'Total Purchased Bags',
      'Purchased Weight (Kg)',
      'Total Dispatched Bags',
      'Dispatched Weight (Kg)',
      'Pending Bags to Lift',
      'Pending Weight (Kg)',
      'Lifting Completion %',
      'Total Trucks Dispatched',
      'Shortage (Kg)'
    ];

    const rows = filteredSummaries.map((item) => [
      `"${item.agencyName}"`,
      item.totalPurchasedBags,
      item.totalPurchasedKg.toFixed(2),
      item.totalLiftedBags,
      item.totalLiftedKg.toFixed(2),
      item.balancePendingBags,
      item.balancePendingKg.toFixed(2),
      `${item.liftingPercentage}%`,
      item.totalDispatchesCount,
      item.shortageKg
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Agency_Lifting_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {isEn ? 'Agency-Wise Lifting & Stock Balance Report' : 'ਸਰਕਾਰੀ ਏਜੰਸੀ-ਵਾਰ ਲਿਫਟਿੰਗ ਅਤੇ ਸਟਾਕ ਬੈਲੇਂਸ ਰਿਪੋਰਟ'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isEn
                    ? 'Track Pungrain, Markfed, Punsup, PSWC, FCI government procurement vs. sheller dispatches'
                    : 'ਪਨਗ੍ਰੇਨ, ਮਾਰਕਫੈੱਡ, ਪਨਸਪ, ਵੇਅਰਹਾਊਸਿੰਗ ਅਤੇ ਐੱਫ.ਸੀ.ਆਈ ਦੀ ਖਰੀਦ ਅਤੇ ਲਿਫਟਿੰਗ ਦਾ ਪੂਰਾ ਹਿਸਾਬ'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-300"
              title="Download Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isEn ? 'Export CSV' : 'ਐਕਸਲ ਡਾਊਨਲੋਡ'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print Report' : 'ਪ੍ਰਿੰਟ ਰਿਪੋਰਟ (Print)'}</span>
            </button>
          </div>
        </div>

        {/* Global Key Metrics Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Metric 1: Total Purchased */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              {isEn ? 'Total Purchased Stock' : 'ਕੁੱਲ ਸਰਕਾਰੀ ਖਰੀਦ (Purchased)'}
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5">
              {overallTotals.purchasedBags.toLocaleString('en-IN')} <span className="text-xs font-sans font-bold text-slate-600">Bags</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-medium">
              {formatLeftingWeightQtlKg(overallTotals.purchasedKg)}
            </div>
          </div>

          {/* Metric 2: Total Dispatched */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
            <span className="text-[10px] font-extrabold uppercase text-blue-700 tracking-wider">
              {isEn ? 'Lifted / Dispatched' : 'ਸ਼ੈਲਰ ਰਵਾਨਾ (Lifted)'}
            </span>
            <div className="text-lg sm:text-xl font-black text-blue-950 font-mono mt-0.5">
              {overallTotals.liftedBags.toLocaleString('en-IN')} <span className="text-xs font-sans font-bold text-blue-700">Bags</span>
            </div>
            <div className="text-[11px] font-mono text-blue-700 font-medium">
              {overallTotals.dispatches} {isEn ? 'Trucks Dispatched' : 'ਟਰੱਕ ਰਵਾਨਾ'}
            </div>
          </div>

          {/* Metric 3: Pending Lifting */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
              {isEn ? 'Pending in Mandi Yard' : 'ਮੰਡੀ ਫੜ੍ਹ ਵਿੱਚ ਬਾਕੀ (Pending)'}
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-950 font-mono mt-0.5">
              {overallTotals.pendingBags.toLocaleString('en-IN')} <span className="text-xs font-sans font-bold text-amber-700">Bags</span>
            </div>
            <div className="text-[11px] font-mono text-amber-700 font-medium">
              {formatLeftingWeightQtlKg(overallTotals.pendingKg)}
            </div>
          </div>

          {/* Metric 4: Completion Gauge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
              {isEn ? 'Lifting Progress' : 'ਲਿਫਟਿੰਗ ਪ੍ਰਤੀਸ਼ਤ'}
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-950 font-mono mt-0.5">
              {overallPercentage}%
            </div>
            <div className="w-full bg-emerald-200/70 h-2 rounded-full mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 print:hidden">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? "Search agency name..." : "ਏਜੰਸੀ ਦਾ ਨਾਮ ਖੋਜੋ..."}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">{isEn ? 'Filter:' : 'ਏਜੰਸੀ:'}</span>
            <select
              value={selectedAgencyFilter}
              onChange={(e) => setSelectedAgencyFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{isEn ? 'All Agencies' : 'ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ'}</option>
              {allAgencies.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Agency Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">{isEn ? 'Agency Name' : 'ਖਰੀਦ ਏਜੰਸੀ (Agency)'}</th>
                <th className="py-3 px-3 text-center">{isEn ? 'Total Purchase' : 'ਕੁੱਲ ਖਰੀਦ (Bags)'}</th>
                <th className="py-3 px-3 text-center">{isEn ? 'Dispatched' : 'ਰਵਾਨਾ ਲਿਫਟਿੰਗ'}</th>
                <th className="py-3 px-3 text-center bg-amber-900/40 text-amber-200">
                  {isEn ? 'Pending in Mandi' : 'ਮੰਡੀ ਵਿੱਚ ਬਾਕੀ (Pending)'}
                </th>
                <th className="py-3 px-3 text-center">{isEn ? 'Lifting %' : 'ਲਿਫਟਿੰਗ ਪ੍ਰਤੀਸ਼ਤ'}</th>
                <th className="py-3 px-3 text-center">{isEn ? 'Trucks' : 'ਟਰੱਕ ਗਿਣਤੀ'}</th>
                <th className="py-3 px-3 text-right">{isEn ? 'Purchase Value' : 'ਕੁੱਲ ਖਰੀਦ ਰਕਮ'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    {isEn ? 'No agency records found' : 'ਕੋਈ ਏਜੰਸੀ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ'}
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((agency) => {
                  const isComplete = agency.balancePendingBags === 0 && agency.totalPurchasedBags > 0;
                  const isHighPending = agency.balancePendingBags > 500;

                  return (
                    <tr key={agency.agencyName} className="hover:bg-slate-50/80 transition">
                      {/* Agency Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isComplete ? 'bg-emerald-500' : isHighPending ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                          <div>
                            <span className="font-black text-slate-900 text-sm">{agency.agencyName}</span>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span>Delivered: {agency.deliveredBags} Bags</span>
                              {agency.shortageKg > 0 && (
                                <span className="text-rose-600 font-bold">• Shortage: {agency.shortageKg} Kg</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Purchased Bags */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {agency.totalPurchasedBags.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {formatLeftingWeightQtlKg(agency.totalPurchasedKg)}
                        </div>
                      </td>

                      {/* Lifted Bags */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="font-mono font-black text-blue-900 text-sm">
                          {agency.totalLiftedBags.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] font-mono text-blue-600">
                          {formatLeftingWeightQtlKg(agency.totalLiftedKg)}
                        </div>
                      </td>

                      {/* Pending Bags */}
                      <td className={`py-3.5 px-3 text-center font-mono font-black text-sm ${
                        agency.balancePendingBags > 0
                          ? 'bg-amber-50/60 text-amber-900'
                          : 'bg-emerald-50/40 text-emerald-800'
                      }`}>
                        <div>{agency.balancePendingBags.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] font-normal text-amber-700">
                          {formatLeftingWeightQtlKg(agency.balancePendingKg)}
                        </div>
                      </td>

                      {/* Progress Bar & % */}
                      <td className="py-3.5 px-3 text-center min-w-[140px]">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-mono font-bold text-xs">{agency.liftingPercentage}%</span>
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                agency.liftingPercentage >= 100
                                  ? 'bg-emerald-600'
                                  : agency.liftingPercentage >= 50
                                  ? 'bg-blue-600'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${agency.liftingPercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total Trucks */}
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                          {agency.totalDispatchesCount} Trucks
                        </span>
                      </td>

                      {/* Total Value */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(agency.totalPurchasedAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredSummaries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-950">
                  <td className="py-3 px-4 font-bold uppercase">
                    {isEn ? 'Total Summary' : 'ਕੁੱਲ ਜੋੜ (Grand Total)'}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-sm">
                    {overallTotals.purchasedBags.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-sm text-blue-900">
                    {overallTotals.liftedBags.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-sm text-amber-900 bg-amber-100/60">
                    {overallTotals.pendingBags.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-sm text-emerald-800">
                    {overallPercentage}%
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-sm">
                    {overallTotals.dispatches} Trucks
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm">
                    {formatCurrency(overallTotals.purchasedAmount)}
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
