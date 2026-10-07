import React, { useState, useMemo } from 'react';
import {
  Scale,
  Calendar,
  Package,
  Building2,
  Users,
  Calculator,
  ArrowRight,
  Printer,
  ExternalLink,
  MessageCircle,
  Edit3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Farmer, BagsEntryRecord, DailyPurchaseRecord, MandiSettings } from '../../types/mandi';
import { formatKgToQulKg, getBagsEntryLabourBreakdown } from '../../utils/calculations';

interface FarmerBagLabourReconciliationCardProps {
  farmer: Farmer;
  allFarmers: Farmer[];
  bagsEntries: BagsEntryRecord[];
  dailyPurchases: DailyPurchaseRecord[];
  settings: MandiSettings;
  onNavigateToFullRegister?: () => void;
}

export const FarmerBagLabourReconciliationCard: React.FC<FarmerBagLabourReconciliationCardProps> = ({
  farmer,
  allFarmers,
  bagsEntries,
  dailyPurchases,
  settings,
  onNavigateToFullRegister
}) => {
  // 1. Linked sub-farmers
  const linkedSubFarmers = useMemo(() => {
    return allFarmers.filter((f) => f.linkedMainFarmerId === farmer.id);
  }, [allFarmers, farmer.id]);

  // 2. Bags brought by this farmer (Date-by-date)
  const farmerArrivals = useMemo(() => {
    return bagsEntries.filter((b) => b.farmerId === farmer.id);
  }, [bagsEntries, farmer.id]);

  const totalBagsBrought = useMemo(() => {
    return farmerArrivals.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
  }, [farmerArrivals]);

  const totalWeightBroughtKg = useMemo(() => {
    return farmerArrivals.reduce((sum, b) => sum + (Number(b.grandTotalKg) || 0), 0);
  }, [farmerArrivals]);

  // Recorded Labour from arrival entries
  const recordedLabourTotal = useMemo(() => {
    const sum = farmerArrivals.reduce((s, b) => {
      const lDeduction =
        b.labourDeductions?.totalLabourDeduction ??
        b.labourDeductions?.grandTotalDeductions ??
        0;
      return s + Number(lDeduction);
    }, 0);
    // If no recorded labour, fallback to default rate per bag
    if (sum > 0) return sum;
    const defaultRate = settings.defaultPakkiLabourRate ?? 7;
    return totalBagsBrought * defaultRate;
  }, [farmerArrivals, totalBagsBrought, settings.defaultPakkiLabourRate]);

  // Manual Labour override state
  const [labourAmount, setLabourAmount] = useState<number>(recordedLabourTotal);
  const [isEditingLabour, setIsEditingLabour] = useState(false);

  // Sync if recordedLabourTotal changes and user hasn't edited
  React.useEffect(() => {
    if (!isEditingLabour) {
      setLabourAmount(recordedLabourTotal);
    }
  }, [recordedLabourTotal, isEditingLabour]);

  // 3. Rate Per Bag (Default = 37.5 * 2461 / 100 = 922.875)
  const defaultCalculatedBagRate = useMemo(() => {
    const bagKg = settings.fixedBagWeightKg || 37.5;
    const qtlRate = settings.fixedRatePerQtl || 2461;
    const val = (bagKg * qtlRate) / 100;
    return val > 0 ? Number(val.toFixed(3)) : 922.875;
  }, [settings.fixedBagWeightKg, settings.fixedRatePerQtl]);

  const [bagRate, setBagRate] = useState<number>(defaultCalculatedBagRate);

  // 4. Purchases: Own Purchases + Linked Farmers' Purchases
  const ownPurchases = useMemo(() => {
    return dailyPurchases.filter((p) => p.farmerId === farmer.id);
  }, [dailyPurchases, farmer.id]);

  const ownPurchasedBags = useMemo(() => {
    return ownPurchases.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
  }, [ownPurchases]);

  const linkedPurchasesByFarmer = useMemo(() => {
    return linkedSubFarmers.map((subFarmer) => {
      const subPurchases = dailyPurchases.filter(
        (p) => p.farmerId === subFarmer.id || (p.mainFarmerId === farmer.id && p.farmerName === subFarmer.farmerName)
      );
      const totalBags = subPurchases.reduce((s, p) => s + (Number(p.bags) || 0), 0);
      const totalWeight = subPurchases.reduce((s, p) => s + (Number(p.totalWeightKg) || 0), 0);
      const totalAmount = subPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
      return {
        subFarmer,
        purchases: subPurchases,
        totalBags,
        totalWeight,
        totalAmount
      };
    });
  }, [linkedSubFarmers, dailyPurchases, farmer.id, farmer.farmerName]);

  const linkedPurchasedBags = useMemo(() => {
    return linkedPurchasesByFarmer.reduce((sum, lf) => sum + lf.totalBags, 0);
  }, [linkedPurchasesByFarmer]);

  const totalPurchasedBags = ownPurchasedBags + linkedPurchasedBags;

  // 5. Balance Before Labour = Total Brought - Total Purchased
  const balanceBeforeLabourBags = totalBagsBrought - totalPurchasedBags;

  // 6. Labour Bags Calculation = Labour Amount ÷ Bag Rate
  const safeBagRate = bagRate > 0 ? bagRate : 922.875;
  const rawLabourBags = labourAmount / safeBagRate;
  const labourBagsAdjustment = Math.ceil(rawLabourBags);

  // 7. Final Balance Bags = Balance Before Labour - Labour Bags
  const finalBalanceBags = balanceBeforeLabourBags - labourBagsAdjustment;

  // Print Slip
  const handlePrintSlip = () => {
    window.print();
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = `*ਕਿਸਾਨ ਬੋਰੀ ਬੈਲੇਂਸ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਹਿਸਾਬ*\n` +
      `ਕਿਸਾਨ: ${farmer.farmerNamePa || farmer.farmerName} (${farmer.village})\n` +
      `--------------------------------\n` +
      `1. ਕੁੱਲ ਮੰਡੀ ਆਮਦ: ${totalBagsBrought} ਬੋਰੀਆਂ\n` +
      `2. ਕੁੱਲ ਖਰੀਦ: ${totalPurchasedBags} ਬੋਰੀਆਂ (ਖੁਦ: ${ownPurchasedBags}, ਲਿੰਕ: ${linkedPurchasedBags})\n` +
      `3. ਖਰੀਦ ਉਪਰੰਤ ਬਕਾਇਆ: ${balanceBeforeLabourBags} ਬੋਰੀਆਂ\n` +
      `4. ਕੁੱਲ ਲੇਬਰ: ₹${Math.round(labourAmount).toLocaleString('en-IN')}\n` +
      `   ਬੋਰੀ ਰੇਟ: ₹${safeBagRate} (ਲੇਬਰ ਬੋਰੀਆਂ = ${labourAmount} ÷ ${safeBagRate} = ${rawLabourBags.toFixed(2)} ≈ ${labourBagsAdjustment} ਬੋਰੀਆਂ)\n` +
      `--------------------------------\n` +
      `*ਅੰਤਿਮ ਬਕਾਇਆ ਬੋਰੀਆਂ: ${finalBalanceBags} ਬੋਰੀਆਂ*\n` +
      `ਧੰਨਵਾਦ!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Visual Explanation & Flowchart */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Scale className="w-3.5 h-3.5" />
              <span>ਮੰਡੀ ਬੋਰੀ ਬੈਲੇਂਸ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਗਣਨਾ (Mandi Bag Balance & Labour Reconciliation)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-2">
              {farmer.farmerNamePa || farmer.farmerName} {farmer.farmerNamePa ? `(${farmer.farmerName})` : ''}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              ਪਿਤਾ: {farmer.fatherName || '-'} | ਪਿੰਡ: {farmer.village} | ਮੋਬਾਈਲ: {farmer.mobile || '-'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="px-3.5 py-2 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>ਪ੍ਰਿੰਟ ਸਲਿੱਪ (Print)</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>ਵਟਸਐਪ ਭੇਜੋ</span>
            </button>
            {onNavigateToFullRegister && (
              <button
                type="button"
                onClick={onNavigateToFullRegister}
                className="px-3.5 py-2 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all border border-slate-600 flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-amber-300" />
                <span>ਸਾਰੇ ਕਿਸਾਨਾਂ ਦਾ ਲੇਬਰ ਰਜਿਸਟਰ</span>
              </button>
            )}
          </div>
        </div>

        {/* 5-Step Visual Formula Pipeline */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Step 1 */}
          <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ਕਦਮ 1: ਮੰਡੀ ਆਮਦ</span>
            <div className="text-xl font-black text-white mt-1">{totalBagsBrought} ਬੋਰੀਆਂ</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {farmerArrivals.length} ਮਿਤੀ-ਵਾਰ ਆਮਦ ਐਂਟਰੀਆਂ
            </span>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">ਕਦਮ 2: ਕੁੱਲ ਖਰੀਦ ਕਟੌਤੀ</span>
            <div className="text-xl font-black text-amber-300 mt-1">− {totalPurchasedBags} ਬੋਰੀਆਂ</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              ਖੁਦ: {ownPurchasedBags} + ਲਿੰਕ: {linkedPurchasedBags}
            </span>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ਕਦਮ 3: ਖਰੀਦ ਉਪਰੰਤ ਬਕਾਇਆ</span>
            <div className="text-xl font-black text-white mt-1">{balanceBeforeLabourBags} ਬੋਰੀਆਂ</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {totalBagsBrought} − {totalPurchasedBags}
            </span>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-800/90 p-3 rounded-xl border border-rose-500/40">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">ਕਦਮ 4: ਲੇਬਰ ਬੋਰੀਆਂ ਕਟੌਤੀ</span>
            <div className="text-xl font-black text-rose-400 mt-1">− {labourBagsAdjustment} ਬੋਰੀਆਂ</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              ₹{Math.round(labourAmount).toLocaleString('en-IN')} ÷ ₹{safeBagRate} = {rawLabourBags.toFixed(2)}
            </span>
          </div>

          {/* Step 5 */}
          <div className="bg-emerald-900/90 p-3 rounded-xl border-2 border-emerald-400 shadow-md">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">ਕਦਮ 5: ਅੰਤਿਮ ਬਕਾਇਆ</span>
            <div className="text-2xl font-black text-white mt-1">{finalBalanceBags} ਬੋਰੀਆਂ</div>
            <span className="text-[11px] text-emerald-200 block mt-0.5 font-bold">
              {balanceBeforeLabourBags} − {labourBagsAdjustment} = Final Balance
            </span>
          </div>
        </div>
      </div>

      {/* Global Setting Bar for This Farmer */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Applicable Bag Rate */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-emerald-700" />
            <span>ਲਾਗੂ ਬੋਰੀ ਰੇਟ (₹/ਬੋਰੀ):</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative w-32">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0.01"
                step="0.001"
                value={bagRate}
                onChange={(e) => setBagRate(Math.max(0.01, Number(e.target.value) || 0.01))}
                className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <button
              type="button"
              onClick={() => setBagRate(defaultCalculatedBagRate)}
              className="px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer"
              title={`MSP Rate: 37.5 * 2461 / 100 = ₹${defaultCalculatedBagRate}`}
            >
              ₹{defaultCalculatedBagRate} (MSP ਰੇਟ)
            </button>
            <button
              type="button"
              onClick={() => setBagRate(925)}
              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer"
              title="Standard round rate ₹925"
            >
              ₹925 (ਰਾਊਂਡ)
            </button>
          </div>
        </div>

        {/* Labour Amount Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-amber-600" />
            <span>ਕੁੱਲ ਲੇਬਰ ਖਰਚਾ:</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative w-32">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                step="1"
                value={labourAmount}
                onChange={(e) => {
                  setIsEditingLabour(true);
                  setLabourAmount(Math.max(0, Number(e.target.value) || 0));
                }}
                className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            {isEditingLabour && (
              <button
                type="button"
                onClick={() => {
                  setIsEditingLabour(false);
                  setLabourAmount(recordedLabourTotal);
                }}
                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                title="Reset to recorded total from arrival entries"
              >
                ਰੀਸੈਟ (₹{Math.round(recordedLabourTotal)})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Details Table 1 (Arrivals) & Table 2 (Purchases) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Date-wise Mandi Arrivals */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                1. ਮਿਤੀ-ਵਾਰ ਮੰਡੀ ਆਮਦ ਤੁਲਾਈ ({totalBagsBrought} ਬੋਰੀਆਂ)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-700">
              ਕੁੱਲ ਵਜ਼ਨ: {formatKgToQulKg(totalWeightBroughtKg).displayEn}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2 px-2.5">ਪਰਚੀ</th>
                  <th className="py-2 px-2.5">ਮਿਤੀ (Date)</th>
                  <th className="py-2 px-2.5 text-center">ਕੁੱਲ ਬੋਰੀਆਂ</th>
                  <th className="py-2 px-2.5 text-center">ਪੱਕੀ ਲੇਬਰ</th>
                  <th className="py-2 px-2.5 text-center">ਡਬਲ ਪੱਖਾ</th>
                  <th className="py-2 px-2.5 text-center">ਸੁੱਕ ਲੱਗੀ</th>
                  <th className="py-2 px-2.5 text-center">ਸਾਫ਼ ਬੋਰੀਆਂ</th>
                  <th className="py-2 px-2.5 text-right">ਵਜ਼ਨ</th>
                  <th className="py-2 px-2.5 text-right">ਲੇਬਰ (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farmerArrivals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-xs text-slate-400 italic">
                      ਇਸ ਕਿਸਾਨ ਲਈ ਕੋਈ ਤੁਲਾਈ ਆਮਦ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ।
                    </td>
                  </tr>
                ) : (
                  farmerArrivals.map((arr, i) => {
                    const brk = getBagsEntryLabourBreakdown(
                      arr,
                      settings.defaultPakkiLabourRate ?? 7,
                      settings.defaultPakkaDoubleLabourRate ?? 14,
                      settings.defaultSukhiLabourRate ?? 5
                    );
                    return (
                      <tr key={arr.id || i} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-medium text-slate-900 font-mono">
                          {arr.entryNumber || (arr as any).parchiNumber || `#${i + 1}`}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{arr.date}</td>
                        <td className="py-2 px-2.5 text-center font-black text-slate-900">{brk.totalBags}</td>
                        <td className="py-2 px-2.5 text-center font-bold text-indigo-900">
                          {brk.pakkiBags > 0 ? `${brk.pakkiBags} ਬੋ.` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold text-amber-900">
                          {brk.doubleBags > 0 ? `💨 ${brk.doubleBags} ਬੋ.` : 'ਬਿਨਾਂ ਪੱਖਾ'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold text-teal-900">
                          {brk.sukkiBags > 0 ? `☀️ ${brk.sukkiBags} ਬੋ.` : '—'}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold text-emerald-900 font-mono">
                          {brk.cleanBags} ਬੋ.
                        </td>
                        <td className="py-2 px-2.5 text-right font-medium text-slate-700">
                          {arr.grandTotalDisplay || formatKgToQulKg(arr.grandTotalKg).displayEn}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-rose-700">
                          ₹{Math.round(brk.totalLabour).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {farmerArrivals.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={2} className="py-2 px-2.5 text-right uppercase text-[10px]">ਕੁੱਲ ਜੋੜ:</td>
                    <td className="py-2 px-2.5 text-center font-black text-emerald-800 text-sm">{totalBagsBrought}</td>
                    <td colSpan={4}></td>
                    <td className="py-2 px-2.5 text-right">{formatKgToQulKg(totalWeightBroughtKg).displayEn}</td>
                    <td className="py-2 px-2.5 text-right font-black text-rose-800">
                      ₹{Math.round(recordedLabourTotal).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Table 2: Purchases (Own + Linked Farmers) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                2. ਖਰੀਦ ਬੋਰੀਆਂ ਕਟੌਤੀ ({totalPurchasedBags} ਬੋਰੀਆਂ)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-700">
              ਖੁਦ: {ownPurchasedBags} | ਲਿੰਕ: {linkedPurchasedBags}
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2 px-3">ਕਿਸਾਨ ਦਾ ਨਾਮ (ਖੁਦ/ਲਿੰਕ)</th>
                  <th className="py-2 px-3">ਮਿਤੀ</th>
                  <th className="py-2 px-3">ਏਜੰਸੀ</th>
                  <th className="py-2 px-3 text-right">ਬੋਰੀਆਂ</th>
                  <th className="py-2 px-3 text-right">ਵਜ਼ਨ</th>
                  <th className="py-2 px-3 text-right">ਰੇਟ</th>
                  <th className="py-2 px-3 text-right">ਕੁੱਲ ਰਕਮ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Own Purchases */}
                {ownPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {farmer.farmerNamePa || farmer.farmerName} <span className="text-[10px] text-blue-700 font-normal">(ਖੁਦ)</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{p.date}</td>
                    <td className="py-2 px-3 text-slate-700 font-medium">{p.agency}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-900">{p.bags}</td>
                    <td className="py-2 px-3 text-right">{p.totalWeightDisplay || formatKgToQulKg(p.totalWeightKg).displayEn}</td>
                    <td className="py-2 px-3 text-right">₹{p.rate}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">₹{p.totalAmount?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}

                {/* Linked Farmers Purchases */}
                {linkedPurchasesByFarmer.flatMap((lf) =>
                  lf.purchases.map((lp) => (
                    <tr key={lp.id} className="hover:bg-amber-50/50 bg-amber-50/20">
                      <td className="py-2 px-3 font-bold text-amber-900">
                        {lf.subFarmer.farmerNamePa || lf.subFarmer.farmerName} <span className="text-[10px] text-amber-700 font-normal">(ਲਿੰਕ ਕਿਸਾਨ)</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{lp.date}</td>
                      <td className="py-2 px-3 text-slate-700 font-medium">{lp.agency}</td>
                      <td className="py-2 px-3 text-right font-black text-amber-800">{lp.bags}</td>
                      <td className="py-2 px-3 text-right">{lp.totalWeightDisplay || formatKgToQulKg(lp.totalWeightKg).displayEn}</td>
                      <td className="py-2 px-3 text-right">₹{lp.rate}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">₹{lp.totalAmount?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}

                {ownPurchases.length === 0 && linkedPurchasedBags === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">
                      ਇਸ ਕਿਸਾਨ ਜਾਂ ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੇ ਨਾਂ 'ਤੇ ਕੋਈ ਖਰੀਦ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ।
                    </td>
                  </tr>
                )}
              </tbody>
              {(ownPurchases.length > 0 || linkedPurchasedBags > 0) && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={3} className="py-2 px-3 text-right uppercase text-[10px]">ਕੁੱਲ ਖਰੀਦ ਬੋਰੀਆਂ:</td>
                    <td className="py-2 px-3 text-right font-black text-amber-800 text-sm">{totalPurchasedBags}</td>
                    <td colSpan={3} className="py-2 px-3 text-right text-slate-500 text-[11px]">
                      (ਮੁੱਖ ਕਿਸਾਨ ਵਿੱਚੋਂ ਕੱਟੀਆਂ ਜਾਣਗੀਆਂ)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Final Reconciliation Calculation Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-700">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">
              ਅੰਤਿਮ ਬੋਰੀ ਬੈਲੇਂਸ ਤੇ ਲੇਬਰ ਕਟੌਤੀ ਨਿਬੇੜਾ (Complete Settlement Summary)
            </h3>
          </div>
          <div className="text-xs text-slate-400">
            ਲਾਗੂ ਬੋਰੀ ਦਰ: ₹{safeBagRate} / ਬੋਰੀ
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">1. ਖਰੀਦ ਉਪਰੰਤ ਬਕਾਇਆ</span>
            <div className="mt-1 font-bold text-white">
              {totalBagsBrought} (ਆਮਦ) − {totalPurchasedBags} (ਖਰੀਦ)
            </div>
            <div className="text-base font-black text-amber-400 mt-1">
              = {balanceBeforeLabourBags} ਬੋਰੀਆਂ ਬਕਾਇਆ
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">2. ਲੇਬਰ ਬੋਰੀਆਂ ਫਾਰਮੂਲਾ</span>
            <div className="mt-1 font-bold text-white">
              ₹{Math.round(labourAmount).toLocaleString('en-IN')} ÷ ₹{safeBagRate}
            </div>
            <div className="text-sm font-bold text-rose-300 mt-1">
              = {rawLabourBags.toFixed(2)} ਬੋਰੀਆਂ
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">3. ਕੱਟੀਆਂ ਗਈਆਂ ਲੇਬਰ ਬੋਰੀਆਂ</span>
            <div className="mt-1 font-bold text-slate-300">
              ਰਾਊਂਡ ਅੱਪ (Round UP to Whole Bag)
            </div>
            <div className="text-base font-black text-rose-400 mt-1">
              − {labourBagsAdjustment} ਬੋਰੀਆਂ ਕਟੌਤੀ
            </div>
          </div>

          <div className="bg-emerald-950 p-3 rounded-xl border-2 border-emerald-400 shadow-md">
            <span className="text-[10px] text-emerald-300 uppercase block font-bold">
              4. ਅੰਤਿਮ ਬਕਾਇਆ ਬੋਰੀਆਂ (Final Balance)
            </span>
            <div className="mt-1 font-bold text-slate-300">
              {balanceBeforeLabourBags} − {labourBagsAdjustment}
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {finalBalanceBags} ਬੋਰੀਆਂ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
