import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  BarChart3,
  ArrowRight,
  TrendingUp,
  Package,
  CheckCircle2,
  Truck,
  Building,
  Scale,
  Search,
  Printer,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { FIXED_BAG_WEIGHT_KG, formatKgToQulKg } from '../../utils/calculations';

export const BalanceChart: React.FC = () => {
  const { bagsEntries, dailyPurchaseRecords, leftingRecords, farmers, settings } = useMandi();
  const [searchFarmer, setSearchFarmer] = useState('');

  // 1. Total Mandi Arrival (ਆਮਦ)
  const totalArrivalBags = bagsEntries.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
  const totalArrivalKg = bagsEntries.reduce((sum, b) => sum + (Number(b.grandTotalKg) || 0), 0);
  const arrivalBreakdown = formatKgToQulKg(totalArrivalKg);

  // 2. Total Agency Purchase (ਖਰੀਦ)
  const totalPurchasedBags = dailyPurchaseRecords.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
  const totalPurchasedKg = dailyPurchaseRecords.reduce((sum, p) => sum + (Number(p.totalWeightKg) || 0), 0);
  const purchaseBreakdown = formatKgToQulKg(totalPurchasedKg);

  // 3. Total Lefting to Sheller (ਲਿਫਟਿੰਗ)
  const totalLeftingBags = leftingRecords.reduce((sum, l) => sum + (Number(l.bags) || 0), 0);
  const totalLeftingKg = leftingRecords.reduce((sum, l) => sum + (Number(l.totalWeightKg) || 0), 0);
  const leftingBreakdown = formatKgToQulKg(totalLeftingKg);

  // 4. Remaining Stocks
  // A: Unsold Mandi Arrival stock (Arrival - Purchased)
  const unsoldMandiBags = Math.max(0, totalArrivalBags - totalPurchasedBags);
  const unsoldMandiKg = unsoldMandiBags * FIXED_BAG_WEIGHT_KG;
  const unsoldBreakdown = formatKgToQulKg(unsoldMandiKg);

  // B: Purchased but not yet lifted from Mandi to Sheller (Purchased - Lefting)
  const purchasedUnliftedBags = Math.max(0, totalPurchasedBags - totalLeftingBags);
  const purchasedUnliftedKg = purchasedUnliftedBags * FIXED_BAG_WEIGHT_KG;
  const unliftedBreakdown = formatKgToQulKg(purchasedUnliftedKg);

  // Total Remaining Bags physically in Mandi (Unsold + Purchased Unlifted)
  const totalPhysicalMandiBags = unsoldMandiBags + purchasedUnliftedBags;
  const physicalBreakdown = formatKgToQulKg(totalPhysicalMandiBags * FIXED_BAG_WEIGHT_KG);

  // Percentages
  const purchasePercent = totalArrivalBags > 0 ? Math.min(100, Math.round((totalPurchasedBags / totalArrivalBags) * 100)) : 0;
  const leftingPercent = totalPurchasedBags > 0 ? Math.min(100, Math.round((totalLeftingBags / totalPurchasedBags) * 100)) : 0;

  // Agency wise purchase breakdown
  const agencySummaryMap = new Map<string, { purchasedBags: number; leftingBags: number }>();
  dailyPurchaseRecords.forEach((p) => {
    const ag = p.agency || p.agencyPa || 'Other';
    const curr = agencySummaryMap.get(ag) || { purchasedBags: 0, leftingBags: 0 };
    curr.purchasedBags += Number(p.bags) || 0;
    agencySummaryMap.set(ag, curr);
  });

  leftingRecords.forEach((l) => {
    const ag = l.sellerOrAgency || 'Other';
    const curr = agencySummaryMap.get(ag) || { purchasedBags: 0, leftingBags: 0 };
    curr.leftingBags += Number(l.bags) || 0;
    agencySummaryMap.set(ag, curr);
  });

  // Farmer breakdown
  const farmerBalances = farmers
    .map((f) => {
      const arrivals = bagsEntries.filter((b) => b.farmerId === f.id);
      const arrBags = arrivals.reduce((s, b) => s + (Number(b.bags) || 0), 0);
      const purchases = dailyPurchaseRecords.filter((p) => p.farmerId === f.id);
      const purBags = purchases.reduce((s, p) => s + (Number(p.bags) || 0), 0);
      const leftings = leftingRecords.filter((l) => l.farmerId === f.id);
      const lftBags = leftings.reduce((s, l) => s + (Number(l.bags) || 0), 0);

      const remainingArrival = Math.max(0, arrBags - purBags);
      const remainingLefting = Math.max(0, purBags - lftBags);

      return {
        farmer: f,
        arrBags,
        purBags,
        lftBags,
        remainingArrival,
        remainingLefting,
        totalRemainingInMandi: remainingArrival + remainingLefting
      };
    })
    .filter((item) => {
      if (!searchFarmer.trim()) return item.arrBags > 0 || item.purBags > 0;
      const q = searchFarmer.toLowerCase();
      return (
        item.farmer.farmerName.toLowerCase().includes(q) ||
        item.farmer.farmerNamePa.toLowerCase().includes(q) ||
        item.farmer.village.toLowerCase().includes(q) ||
        item.farmer.id.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>ਮੰਡੀ ਬੈਲੈਂਸ ਚਾਰਟ / MANDI BALANCE FLOW</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              ਕੁੱਲ ਆਮਦ (Total) → ਏਜੰਸੀ ਖਰੀਦ (Purchase) → ਸ਼ੈਲਰ ਰਵਾਨਗੀ (Lefting) → ਬਾਕੀ ਬੈਲੈਂਸ (Remaining)
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition print:hidden"
        >
          <Printer className="w-4 h-4" />
          <span>ਚਾਰਟ ਪ੍ਰਿੰਟ ਕਰੋ (Print Balance Sheet)</span>
        </button>
      </div>

      {/* 2. THE 4-STEP VISUAL FLOW CHART (Total → Purchase → Lefting → Remaining) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            ਪੰਜਾਬ ਮੰਡੀ ਝੋਨਾ ਬੈਲੈਂਸ ਪਾਈਪਲਾਈਨ (Paddy Balance Flow)
          </h2>
          <span className="text-xs font-bold text-slate-500">{settings.mandiNameEn}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* STEP 1: TOTAL ARRIVAL */}
          <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase">
                1. ਕੁੱਲ ਆਮਦ (Total)
              </span>
              <Package className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">
                {totalArrivalBags.toLocaleString('en-IN')}
              </div>
              <div className="text-xs font-bold text-slate-500">ਬੋਰੀਆਂ (Mandi Arrival Bags)</div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-xs font-semibold text-slate-600 flex justify-between">
              <span>ਕੁੱਲ ਵਜ਼ਨ:</span>
              <strong className="text-slate-900">{arrivalBreakdown.displayEn}</strong>
            </div>
          </div>

          {/* STEP 2: AGENCY PURCHASE */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-blue-800 text-white rounded-lg text-[10px] font-black uppercase">
                2. ਏਜੰਸੀ ਖਰੀਦ (Purchase)
              </span>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-blue-950">
                {totalPurchasedBags.toLocaleString('en-IN')}
              </div>
              <div className="text-xs font-bold text-blue-700">ਬੋਰੀਆਂ ({purchasePercent}% ਵਿਕਿਆ)</div>
            </div>
            <div className="pt-2 border-t border-blue-200 text-xs font-semibold text-blue-800 flex justify-between">
              <span>ਖਰੀਦਿਆ ਵਜ਼ਨ:</span>
              <strong className="text-blue-950">{purchaseBreakdown.displayEn}</strong>
            </div>
          </div>

          {/* STEP 3: LEFTING (TO SHELLER) */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-emerald-800 text-white rounded-lg text-[10px] font-black uppercase">
                3. ਲਿਫਟਿੰਗ (Lefting)
              </span>
              <Truck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-950">
                {totalLeftingBags.toLocaleString('en-IN')}
              </div>
              <div className="text-xs font-bold text-emerald-700">ਬੋਰੀਆਂ ({leftingPercent}% ਸ਼ੈਲਰ ਰਵਾਨਾ)</div>
            </div>
            <div className="pt-2 border-t border-emerald-200 text-xs font-semibold text-emerald-800 flex justify-between">
              <span>ਰਵਾਨਾ ਵਜ਼ਨ:</span>
              <strong className="text-emerald-950">{leftingBreakdown.displayEn}</strong>
            </div>
          </div>

          {/* STEP 4: REMAINING MANDI BALANCE */}
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-amber-800 text-white rounded-lg text-[10px] font-black uppercase">
                4. ਬਾਕੀ ਸਟਾਕ (Remaining)
              </span>
              <Scale className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="text-2xl font-black text-amber-950">
                {totalPhysicalMandiBags.toLocaleString('en-IN')}
              </div>
              <div className="text-xs font-bold text-amber-800">ਮੰਡੀ ਵਿਖੇ ਕੁੱਲ ਬਾਕੀ ਬੋਰੀਆਂ</div>
            </div>
            <div className="pt-2 border-t border-amber-200 text-xs font-semibold text-amber-900 space-y-1">
              <div className="flex justify-between">
                <span>ਅਣ-ਵਿਕਿਆ ਝੋਨਾ:</span>
                <strong>{unsoldMandiBags} ਬੋਰੇ</strong>
              </div>
              <div className="flex justify-between">
                <span>ਖਰੀਦਿਆ (ਬਾਕੀ ਲਿਫਟਿੰਗ):</span>
                <strong>{purchasedUnliftedBags} ਬੋਰੇ</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>ਮੰਡੀ ਝੋਨਾ ਪ੍ਰੋਗਰੈੱਸ (Procurement & Lefting Pipeline)</span>
            <span>
              ਲਿਫਟਿੰਗ: {leftingPercent}% • ਖਰੀਦ: {purchasePercent}%
            </span>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            <div
              style={{ width: `${leftingPercent}%` }}
              className="bg-emerald-600 h-full transition-all"
              title={`Lefting: ${totalLeftingBags} bags (${leftingPercent}%)`}
            />
            <div
              style={{ width: `${Math.max(0, purchasePercent - leftingPercent)}%` }}
              className="bg-blue-600 h-full transition-all"
              title={`Purchased pending lefting: ${purchasedUnliftedBags} bags`}
            />
            <div
              style={{ width: `${Math.max(0, 100 - purchasePercent)}%` }}
              className="bg-amber-400 h-full transition-all"
              title={`Unsold Arrival: ${unsoldMandiBags} bags`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-600 rounded-sm inline-block" />
              <span>ਸ਼ੈਲਰ ਰਵਾਨਾ ({totalLeftingBags} ਬੋਰੇ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-600 rounded-sm inline-block" />
              <span>ਖਰੀਦਿਆ (ਬਾਕੀ ਲਿਫਟਿੰਗ: {purchasedUnliftedBags} ਬੋਰੇ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-400 rounded-sm inline-block" />
              <span>ਅਣ-ਵਿਕਿਆ ਝੋਨਾ ({unsoldMandiBags} ਬੋਰੇ)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AGENCY-WISE PROCUREMENT & LEFTING BREAKDOWN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            <span>ਏਜੰਸੀ-ਵਾਰ ਖਰੀਦ ਅਤੇ ਲਿਫਟਿੰਗ ਸਟੇਟਸ (Agency-wise Balance)</span>
          </h3>
          <span className="text-xs text-slate-500 font-bold">{agencySummaryMap.size} ਏਜੰਸੀਆਂ</span>
        </div>

        {agencySummaryMap.size === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">ਅਜੇ ਕੋਈ ਏਜੰਸੀ ਖਰੀਦ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from(agencySummaryMap.entries()).map(([agency, data]) => {
              const pendingLift = Math.max(0, data.purchasedBags - data.leftingBags);
              const pLiftPercent = data.purchasedBags > 0 ? Math.round((data.leftingBags / data.purchasedBags) * 100) : 0;
              return (
                <div key={agency} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-black text-slate-900 text-xs">{agency}</div>
                  <div className="grid grid-cols-3 gap-1 text-[11px] pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[9px]">ਖਰੀਦ</span>
                      <strong className="text-slate-800">{data.purchasedBags}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">ਰਵਾਨਾ</span>
                      <strong className="text-emerald-700">{data.leftingBags}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">ਬਾਕੀ</span>
                      <strong className="text-amber-700">{pendingLift}</strong>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div style={{ width: `${pLiftPercent}%` }} className="bg-emerald-600 h-full" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. FARMER-WISE MANDI BALANCE TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">ਕਿਸਾਨ-ਵਾਰ ਮੰਡੀ ਬੈਲੈਂਸ (Farmer-wise Stock)</h3>
            <p className="text-[11px] text-slate-500">ਹਰੇਕ ਕਿਸਾਨ ਦੀ ਆਮਦ, ਖਰੀਦ ਅਤੇ ਬਾਕੀ ਬਚੀਆਂ ਬੋਰੀਆਂ</p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFarmer}
              onChange={(e) => setSearchFarmer(e.target.value)}
              placeholder="ਕਿਸਾਨ, ਪਿੰਡ ਜਾਂ ID ਖੋਜੋ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {farmerBalances.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">ਕੋਈ ਕਿਸਾਨ ਡਾਟਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2.5">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer)</th>
                  <th className="p-2.5">ਪਿੰਡ (Village)</th>
                  <th className="p-2.5 text-right font-black">ਕੁੱਲ ਆਮਦ (Arrival)</th>
                  <th className="p-2.5 text-right text-blue-900">ਏਜੰਸੀ ਖਰੀਦ (Purchased)</th>
                  <th className="p-2.5 text-right text-emerald-900">ਸ਼ੈਲਰ ਰਵਾਨਾ (Lefting)</th>
                  <th className="p-2.5 text-right text-amber-900 font-black">ਮੰਡੀ ਬਾਕੀ ਬੋਰੀਆਂ (In Mandi)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farmerBalances.map((item) => (
                  <tr key={item.farmer.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">
                      {item.farmer.farmerNamePa} ({item.farmer.farmerName})
                    </td>
                    <td className="p-2.5 text-slate-600">{item.farmer.village}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                      {item.arrBags} Bags
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-800">
                      {item.purBags} Bags
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                      {item.lftBags} Bags
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-amber-800 bg-amber-50/50">
                      {item.totalRemainingInMandi} Bags
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
