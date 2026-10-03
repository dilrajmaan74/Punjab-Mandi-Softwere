import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  ArrowRightLeft,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  FileText,
  DollarSign,
  Layers,
  AlertCircle,
  Percent,
  TrendingUp,
  Boxes,
  Users
} from 'lucide-react';
import { DEFAULT_I_FORM_RATES, calculateIFormDetails } from '../../utils/pakkaCalculations';
import { formatDateToDDMMYYYY, compareDatesChronological } from '../../utils/calculations';

export const KachaToPakkaTransferView: React.FC = () => {
  const {
    dailyPurchaseRecords,
    activeFiscalYear,
    agencies,
    generateIFormAndJFormsFromPurchases,
    setActiveSection,
    farmers,
    activeCrop
  } = useMandi();

  // Filter state
  const todayStr = formatDateToDDMMYYYY(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCrop, setSelectedCrop] = useState<string>(activeCrop || 'PADDY');
  const [selectedAgency, setSelectedAgency] = useState<string>('Pungrain (ਪਨਗ੍ਰੇਨ)');
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [transferSuccess, setTransferSuccess] = useState<{
    iFormNo: string;
    jFormsCount: number;
    totalAmount: number;
  } | null>(null);

  // Editable Rates configuration
  const [rates, setRates] = useState(DEFAULT_I_FORM_RATES);
  const [showRatesEditor, setShowRatesEditor] = useState(false);

  // Filter purchases for selected date and crop, sorted chronologically ascending
  const matchingPurchases = useMemo(() => {
    return dailyPurchaseRecords.filter((p) => {
      // Check date
      if (selectedDate && p.date !== selectedDate) return false;
      // Check crop
      if (selectedCrop && p.cropType && p.cropType.toUpperCase() !== selectedCrop.toUpperCase()) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      const dateDiff = compareDatesChronological(a.date, b.date, 'ASC');
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });
  }, [dailyPurchaseRecords, selectedDate, selectedCrop]);

  const pendingPurchases = useMemo(() => {
    return matchingPurchases.filter((p) => !p.isTransferredToPakka);
  }, [matchingPurchases]);

  // When purchases change, auto-select pending purchases if none selected
  const handleSelectAllPending = () => {
    const pendingIds = pendingPurchases.map((p) => p.id);
    setSelectedPurchaseIds(pendingIds);
  };

  const handleTogglePurchase = (id: string) => {
    setSelectedPurchaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Selected purchases data
  const selectedPurchasesData = useMemo(() => {
    return matchingPurchases.filter((p) => selectedPurchaseIds.includes(p.id));
  }, [matchingPurchases, selectedPurchaseIds]);

  const totalBags = selectedPurchasesData.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
  const totalWeightKg = selectedPurchasesData.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
  const totalWeightQtl = Math.round((totalWeightKg / 100) * 100) / 100;
  const mspRate = selectedPurchasesData.length > 0 ? Number(selectedPurchasesData[0].rate) || 2320 : 2320;

  // Live I-Form calculated breakdown
  const calculatedBreakdown = useMemo(() => {
    if (totalWeightQtl <= 0) return null;
    return calculateIFormDetails({
      totalBags,
      totalWeightQtl,
      mspRatePerQtl: mspRate,
      rates
    });
  }, [totalBags, totalWeightQtl, mspRate, rates]);

  const handleExecuteTransfer = () => {
    if (selectedPurchaseIds.length === 0) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਪੱਕੇ ਸਿਸਟਮ ਵਿੱਚ ਟਰਾਂਸਫਰ ਕਰਨ ਲਈ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਖਰੀਦ ਐਂਟਰੀ ਚੁਣੋ!');
      return;
    }

    try {
      const res = generateIFormAndJFormsFromPurchases({
        agency: selectedAgency,
        date: selectedDate,
        fiscalYear: activeFiscalYear,
        cropType: selectedCrop,
        purchaseIds: selectedPurchaseIds,
        rates
      });

      setTransferSuccess({
        iFormNo: res.iForm.iFormNo,
        jFormsCount: res.jForms.length,
        totalAmount: res.iForm.totalBillAmount
      });
      setSelectedPurchaseIds([]);
    } catch (e: any) {
      alert('ਟਰਾਂਸਫਰ ਦੌਰਾਨ ਗਲਤੀ ਆਈ: ' + e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-blue-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-xs font-black rounded-full shadow-xs">
              ਕੱਚਾ ➔ ਪੱਕਾ ਡਾਟਾ ਬ੍ਰਿਜ • Auto Transfer
            </span>
            <span className="text-xs text-blue-200 font-mono">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-amber-400" />
            ਕੱਚੀ ਖਰੀਦ ਤੋਂ ਪੱਕੇ I-Form ਤੇ J-Form ਵਿੱਚ ਆਟੋਮੈਟਿਕ ਟਰਾਂਸਫਰ
          </h2>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            ਰੋਜ਼ਾਨਾ ਖਰੀਦ (Paddy / Wheat) ਵਿੱਚੋਂ ਮਿਤੀ ਚੁਣੋ, 2.5% ਆੜ੍ਹਤ ਦਾਮਾਮੀ ਤੇ ਮੰਡੀ ਲੇਬਰ ਆਟੋ-ਕੈਲਕੁਲੇਟ ਕਰਕੇ ਪੱਕੇ ਖਾਤਿਆਂ 'ਚ ਦਰਜ ਕਰੋ
          </p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {transferSuccess && (
        <div className="bg-emerald-950 border border-emerald-500/80 text-emerald-200 p-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-emerald-100 text-sm">
                ਸਫ਼ਲਤਾਪੂਰਵਕ ਪੱਕੇ ਸਿਸਟਮ ਵਿੱਚ ਟਰਾਂਸਫਰ ਹੋ ਗਿਆ! (Transfer Successful)
              </div>
              <div className="text-xs text-emerald-300 mt-0.5">
                ਸਰਕਾਰੀ I-Form ਨੰਬਰ: <strong className="font-mono text-white">{transferSuccess.iFormNo}</strong> • {transferSuccess.jFormsCount} ਕਿਸਾਨਾਂ ਦੇ J-Form ਬਣ ਗਏ • ਕੁੱਲ ਬਿੱਲ: ₹{Math.round(transferSuccess.totalAmount).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('iform-register')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>ਆਈ-ਫਾਰਮ ਦੇਖੋ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('jform-register')}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>ਜੇ-ਫਾਰਮ ਦੇਖੋ</span>
            </button>
            <button
              type="button"
              onClick={() => setTransferSuccess(null)}
              className="px-2 py-1.5 text-xs text-emerald-400 hover:text-white"
            >
              ਬੰਦ ਕਰੋ
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Controls & Filter Parameters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ਖਰੀਦ ਦੀ ਮਿਤੀ (Purchase Date):
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ਫ਼ਸਲ ਦੀ ਕਿਸਮ (Crop):
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
          >
            <option value="PADDY">🌾 ਝੋਨਾ (Paddy - PR-126/1509/PSWH)</option>
            <option value="WHEAT">🌾 ਕਣਕ (Wheat)</option>
            <option value="MAIZE">🌽 ਮੱਕੀ (Maize)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            ਖਰੀਦ ਏਜੰਸੀ (Procurement Agency):
          </label>
          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
          >
            <option value="Pungrain (ਪਨਗ੍ਰੇਨ)">Pungrain (ਪਨਗ੍ਰੇਨ)</option>
            <option value="Markfed (ਮਾਰਕਫੈੱਡ)">Markfed (ਮਾਰਕਫੈੱਡ)</option>
            <option value="Punsup (ਪਨਸਪ)">Punsup (ਪਨਸਪ)</option>
            <option value="PSWC (ਵੇਅਰਹਾਊਸਿੰਗ)">PSWC (ਵੇਅਰਹਾਊਸਿੰਗ)</option>
            <option value="FCI (ਐੱਫ.ਸੀ.ਆਈ)">FCI (ਐੱਫ.ਸੀ.ਆਈ)</option>
            <option value="Private Mill / Trader (ਪ੍ਰਾਈਵੇਟ ਸ਼ੈਲਰ)">Private Mill / Trader (ਪ੍ਰਾਈਵੇਟ ਸ਼ੈਲਰ)</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowRatesEditor(!showRatesEditor)}
            className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 transition flex items-center justify-center gap-1.5"
          >
            <Percent className="w-4 h-4 text-blue-700" />
            <span>{showRatesEditor ? 'ਸਰਕਾਰੀ ਰੇਟ ਛੁਪਾਓ' : 'ਆੜ੍ਹਤ ਤੇ ਲੇਬਰ ਰੇਟ ਬਦਲੋ'}</span>
          </button>
        </div>
      </div>

      {/* Optional Rates Configuration Drawer */}
      {showRatesEditor && (
        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-blue-700" />
              ਪੰਜਾਬ ਮੰਡੀ ਬੋਰਡ ਅਧਿਕਾਰਤ ਦਰਾਂ (Statutory Rates for I-Form):
            </h4>
            <button
              type="button"
              onClick={() => setRates(DEFAULT_I_FORM_RATES)}
              className="text-[11px] text-blue-700 hover:underline font-bold"
            >
              ਮੂਲ ਰੇਟ ਰੀਸੈੱਟ ਕਰੋ (Reset to Default)
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 text-xs">
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">ਦਾਮਾਮੀ %</label>
              <input
                type="number"
                step="0.1"
                value={rates.damamiPercent}
                onChange={(e) => setRates({ ...rates, damamiPercent: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">ਮਾਰਕੀਟ ਫੀਸ %</label>
              <input
                type="number"
                step="0.1"
                value={rates.mdfPercent}
                onChange={(e) => setRates({ ...rates, mdfPercent: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">RDF %</label>
              <input
                type="number"
                step="0.1"
                value={rates.rdfPercent}
                onChange={(e) => setRates({ ...rates, rdfPercent: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">ਉਤਰਾਈ (₹/Qtl)</label>
              <input
                type="number"
                step="0.01"
                value={rates.unloadingRatePerQtl}
                onChange={(e) => setRates({ ...rates, unloadingRatePerQtl: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">ਛਣਾਈ (₹/Qtl)</label>
              <input
                type="number"
                step="0.01"
                value={rates.sievingRatePerQtl}
                onChange={(e) => setRates({ ...rates, sievingRatePerQtl: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">ਤੁਲਾਈ-ਭਰਾਈ (₹/Qtl)</label>
              <input
                type="number"
                step="0.01"
                value={rates.weighingFillingRatePerQtl}
                onChange={(e) => setRates({ ...rates, weighingFillingRatePerQtl: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">ਸਿਲਾਈ (₹/ਬੋਰੀ)</label>
              <input
                type="number"
                step="0.01"
                value={rates.stitchingRatePerBag}
                onChange={(e) => setRates({ ...rates, stitchingRatePerBag: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 font-bold mb-0.5">ਲੋਡਿੰਗ (₹/Qtl)</label>
              <input
                type="number"
                step="0.01"
                value={rates.loadingRatePerQtl}
                onChange={(e) => setRates({ ...rates, loadingRatePerQtl: parseFloat(e.target.value) || 0 })}
                className="w-full p-1 bg-white border border-slate-300 rounded font-mono text-center"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Purchase Entries Table & Live Calculation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Side: Matching Purchases Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-800">
                {selectedDate} ਦੀਆਂ ਖਰੀਦ ਐਂਟਰੀਆਂ ({matchingPurchases.length})
              </span>
              {pendingPurchases.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full">
                  {pendingPurchases.length} ਪੈਂਡਿੰਗ
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSelectAllPending}
              className="text-xs text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
            >
              ਸਾਰੀਆਂ ਪੈਂਡਿੰਗ ਚੁਣੋ (Select All)
            </button>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[480px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase sticky top-0">
                <tr>
                  <th className="p-2.5 text-center w-8">ਚੁਣੋ</th>
                  <th className="p-2.5">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer)</th>
                  <th className="p-2.5 text-right">ਬੋਰੀਆਂ</th>
                  <th className="p-2.5 text-right">ਕੁਇੰਟਲ</th>
                  <th className="p-2.5 text-right">ਰੇਟ (₹)</th>
                  <th className="p-2.5 text-right">ਮੁੱਲ (₹)</th>
                  <th className="p-2.5 text-center">ਸਟੇਟਸ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {matchingPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      ਇਸ ਮਿਤੀ ({selectedDate}) ਲਈ ਕੋਈ ਕੱਚੀ ਖਰੀਦ ਨਹੀਂ ਮਿਲੀ।
                    </td>
                  </tr>
                ) : (
                  matchingPurchases.map((item, idx) => {
                    const isSelected = selectedPurchaseIds.includes(item.id);
                    const qtl = Math.round(((Number(item.weight) || 0) / 100) * 100) / 100;
                    const gross = Math.round(qtl * (Number(item.rate) || 2320));

                    return (
                      <tr
                        key={`${item.id}-${idx}`}
                        onClick={() => !item.isTransferredToPakka && handleTogglePurchase(item.id)}
                        className={`transition cursor-pointer ${
                          item.isTransferredToPakka
                            ? 'bg-slate-50 opacity-60'
                            : isSelected
                            ? 'bg-blue-50/80'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={item.isTransferredToPakka}
                            onChange={() => handleTogglePurchase(item.id)}
                            className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.farmerName}
                          {item.isTransferredToPakka && (
                            <span className="block text-[10px] text-blue-700 font-mono font-normal">
                              ਲਿੰਕਡ: {item.transferredIFormNo}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                          {item.bags}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {qtl}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">₹{item.rate}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          ₹{gross.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {item.isTransferredToPakka ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                              ਟਰਾਂਸਫਰਡ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                              ਬਾਕੀ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Live I-Form Calculation & Transfer Confirmation (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-700" />
                ਸਰਕਾਰੀ I-Form ਆਟੋ-ਹਿਸਾਬ
              </h3>
              <span className="text-xs font-mono font-bold text-blue-800">
                {selectedPurchaseIds.length} ਚੁਣੀਆਂ ਐਂਟਰੀਆਂ
              </span>
            </div>

            {calculatedBreakdown ? (
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ਕੁੱਲ ਬੋਰੀਆਂ ਤੇ ਵਜ਼ਨ:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {totalBags} ਬੋਰੀਆਂ ({totalWeightQtl} ਕੁਇੰਟਲ)
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ਕੁੱਲ ਫ਼ਸਲ ਮੁੱਲ (Crop Gross):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Math.round(calculatedBreakdown.cropGrossAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-800 bg-emerald-50/50 px-1 rounded">
                  <span className="font-bold">2.5% ਆੜ੍ਹਤ ਦਾਮਾਮੀ (Commission):</span>
                  <span className="font-mono font-black">
                    ₹{Math.round(calculatedBreakdown.damamiAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ਮੰਡੀ ਲੇਬਰ (5 ਖਰਚੇ ਇਕੱਠੇ):</span>
                  <span className="font-mono font-bold text-slate-800">
                    ₹{Math.round(calculatedBreakdown.labourCharges.totalLabourAmount).toLocaleString()}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 pl-2 space-y-0.5">
                  <div className="flex justify-between">
                    <span>• ਉਤਰਾਈ (@₹{rates.unloadingRatePerQtl}):</span>
                    <span>₹{Math.round(calculatedBreakdown.labourCharges.unloadingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• ਛਣਾਈ (@₹{rates.sievingRatePerQtl}):</span>
                    <span>₹{Math.round(calculatedBreakdown.labourCharges.sievingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• ਤੁਲਾਈ ਤੇ ਭਰਾਈ (@₹{rates.weighingFillingRatePerQtl}):</span>
                    <span>₹{Math.round(calculatedBreakdown.labourCharges.weighingFillingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• ਸਿਲਾਈ (@₹{rates.stitchingRatePerBag}/ਬੋਰੀ):</span>
                    <span>₹{Math.round(calculatedBreakdown.labourCharges.stitchingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• ਲੋਡਿੰਗ (@₹{rates.loadingRatePerQtl}):</span>
                    <span>₹{Math.round(calculatedBreakdown.labourCharges.loadingAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ਮਾਰਕੀਟ ਕਮੇਟੀ ਫੀਸ (3% MDF):</span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(calculatedBreakdown.mdfAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ਪੇਂਡੂ ਵਿਕਾਸ ਫੰਡ (3% RDF):</span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(calculatedBreakdown.rdfAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-t border-slate-300 font-black text-slate-900">
                  <span>ਕੁੱਲ ਸਰਕਾਰੀ ਬਿੱਲ:</span>
                  <span className="font-mono text-sm">
                    ₹{Math.round(calculatedBreakdown.totalBillAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-rose-700 font-bold">
                  <span>ਘਟਾਓ: 2% TDS on Damami (194H):</span>
                  <span className="font-mono">
                    - ₹{Math.round(calculatedBreakdown.tdsAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-t-2 border-blue-900 bg-blue-50 px-2 rounded-lg font-black text-sm text-blue-950">
                  <span>ਏਜੰਸੀ ਤੋਂ ਸ਼ੁੱਧ ਲੈਣਯੋਗ:</span>
                  <span className="font-mono">
                    ₹{Math.round(calculatedBreakdown.netReceivableFromAgency).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                ਖੱਬੇ ਪਾਸੇ ਤੋਂ ਖਰੀਦ ਐਂਟਰੀਆਂ ਚੁਣੋ ਤਾਂ ਜੋ ਆਈ-ਫਾਰਮ ਦਾ ਲਾਈਵ ਹਿਸਾਬ ਇੱਥੇ ਬਣ ਸਕੇ।
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              disabled={selectedPurchaseIds.length === 0}
              onClick={handleExecuteTransfer}
              className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer ${
                selectedPurchaseIds.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white shadow-blue-500/20'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>ਪੱਕੇ ਸਿਸਟਮ ਵਿੱਚ I-Form ਤੇ J-Forms ਤਿਆਰ ਕਰੋ</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-2">
              ਇਹ ਐਕਸ਼ਨ ਪੱਕੇ ਲੈੱਜਰਾਂ ਵਿੱਚ ਆਪਣੇ-ਆਪ ਡਬਲ-ਐਂਟਰੀ ਵਾਊਚਰ ਵੀ ਪਾ ਦੇਵੇਗਾ।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
