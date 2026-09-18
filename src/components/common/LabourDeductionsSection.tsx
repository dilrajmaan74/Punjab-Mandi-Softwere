import React, { useState } from 'react';
import { LabourAndDeductions, CustomDeductionLine, MandiSettings } from '../../types/mandi';
import {
  computeLabourAndDeductions,
  formatCurrencyINR
} from '../../utils/calculations';
import {
  Hammer,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  Percent,
  ShieldCheck,
  Tag,
  ArrowRight
} from 'lucide-react';

interface LabourDeductionsSectionProps {
  weightKg: number;
  grossAmount: number;
  value: LabourAndDeductions;
  onChange: (updated: LabourAndDeductions) => void;
  settings?: Partial<MandiSettings>;
  compact?: boolean;
  bags?: number;
}

export const LabourDeductionsSection: React.FC<LabourDeductionsSectionProps> = ({
  weightKg,
  grossAmount,
  value,
  onChange,
  settings,
  compact = false,
  bags
}) => {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustomNameEn, setNewCustomNameEn] = useState('');
  const [newCustomNamePa, setNewCustomNamePa] = useState('');
  const [newCustomType, setNewCustomType] = useState<'PER_QTL' | 'FIXED'>('PER_QTL');
  const [newCustomRate, setNewCustomRate] = useState<number>(0);

  const effectiveBags = typeof bags === 'number' && bags > 0 ? bags : Math.max(1, Math.round(weightKg / 37.50));
  const qtlCount = Math.max(0, weightKg) / 100;
  const qtlFormatted = qtlCount.toFixed(2);

  // 1. Toggle Pakki Labour (ਪੱਕੀ ਲੇਬਰ)
  const handleTogglePakki = (enabled: boolean) => {
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        pakkiLabourEnabled: enabled,
        pakkiBagsCount: enabled ? (value.pakkiBagsCount ?? effectiveBags) : 0
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // Change Pakki Rate
  const handlePakkiRateChange = (rate: number) => {
    const safeRate = Math.max(0, rate);
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        pakkiLabourRate: safeRate
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // Change Pakki Bags Count
  const handlePakkiBagsChange = (bagsCount: number) => {
    const safeBags = Math.max(0, bagsCount);
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        pakkiBagsCount: safeBags
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // 2. Toggle Pakha Double Labour (ਪੱਖਾ ਡਬਲ)
  const handleToggleDouble = (enabled: boolean) => {
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        pakkaDoubleLabourEnabled: enabled,
        doubleBagsCount: enabled ? (value.doubleBagsCount ?? effectiveBags) : 0
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // Change Pakha Double Rate
  const handleDoubleRateChange = (rate: number) => {
    const safeRate = Math.max(0, rate);
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        pakkaDoubleLabourRate: safeRate
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // Change Pakha Double Bags Count
  const handleDoubleBagsChange = (bagsCount: number) => {
    const safeBags = Math.max(0, bagsCount);
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        doubleBagsCount: safeBags
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // 3. Toggle Sukhi Labour / ਝੋਨਾ ਸਕਾਈ
  const handleToggleSukhi = (enabled: boolean) => {
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        sukhiLabourEnabled: enabled,
        sukkiBagsCount: enabled ? (value.sukkiBagsCount ?? effectiveBags) : 0
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // Change Sukhi Rate
  const handleSukhiRateChange = (rate: number) => {
    const safeRate = Math.max(0, rate);
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        sukhiLabourRate: safeRate
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // Change Sukhi Bags Count
  const handleSukhiBagsChange = (bagsCount: number) => {
    const safeBags = Math.max(0, bagsCount);
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        sukkiBagsCount: safeBags
      },
      settings,
      effectiveBags
    );
    onChange(updated);
  };

  // 4. Toggle Custom Deduction Item
  const handleToggleCustom = (id: string, enabled: boolean) => {
    const updatedLines = (value.customDeductions || []).map((line) => {
      if (line.id === id) {
        return { ...line, enabled };
      }
      return line;
    });

    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        customDeductions: updatedLines
      },
      settings
    );
    onChange(updated);
  };

  // Change Custom Deduction Rate
  const handleCustomRateChange = (id: string, rate: number) => {
    const safeRate = Math.max(0, rate);
    const updatedLines = (value.customDeductions || []).map((line) => {
      if (line.id === id) {
        return { ...line, rate: safeRate };
      }
      return line;
    });

    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        customDeductions: updatedLines
      },
      settings
    );
    onChange(updated);
  };

  // Delete Custom Deduction Item
  const handleDeleteCustom = (id: string) => {
    const updatedLines = (value.customDeductions || []).filter((line) => line.id !== id);
    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        customDeductions: updatedLines
      },
      settings
    );
    onChange(updated);
  };

  // Add New Custom Deduction Line
  const handleAddCustomLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomNameEn.trim() && !newCustomNamePa.trim()) return;

    const newLine: CustomDeductionLine = {
      id: `custom_${Date.now()}`,
      nameEn: newCustomNameEn.trim() || newCustomNamePa.trim(),
      namePa: newCustomNamePa.trim() || newCustomNameEn.trim(),
      type: newCustomType,
      rate: Number(newCustomRate) || 0,
      amount: 0,
      enabled: true
    };

    const currentLines = value.customDeductions || [];
    const updatedLines = [...currentLines, newLine];

    const updated = computeLabourAndDeductions(
      weightKg,
      grossAmount,
      {
        ...value,
        customDeductions: updatedLines
      },
      settings
    );
    onChange(updated);

    setNewCustomNameEn('');
    setNewCustomNamePa('');
    setNewCustomRate(0);
    setShowAddCustom(false);
  };

  const hasAnyAppliedDeduction = value.grandTotalDeductions > 0;

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3.5 text-xs shadow-2xs">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg shadow-2xs">
            <Hammer className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span>ਮਜ਼ਦੂਰੀ ਅਤੇ ਹੋਰ ਕਟੌਤੀਆਂ</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-slate-600 font-semibold text-[11px] sm:text-xs">
                Labour & Other Deductions
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              ਸਾਰੀਆਂ ਚੋਣਾਂ ਵਿਕਲਪਿਕ (Optional) ਹਨ। ਅਣ-ਚੁਣੇ ਵਿਕਲਪ ਕਿਸਾਨ ਦੇ ਖਾਤੇ 'ਤੇ ਕੋਈ ਅਸਰ ਨਹੀਂ ਕਰਨਗੇ।
            </p>
          </div>
        </div>

        {/* Live Weight & Bag Count Indicator */}
        <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">ਕੁੱਲ ਬੋਰੀਆਂ ਤੇ ਵਜ਼ਨ</span>
          <span className="text-xs font-mono font-black text-slate-900">
            {effectiveBags} ਬੋਰੀਆਂ • {qtlFormatted} Qul <span className="text-slate-400 text-[10px]">({weightKg.toFixed(2)} KG)</span>
          </span>
        </div>
      </div>

      {/* Grid of 3 Main Labour Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* ================================================== */}
        {/* 1. PAKKI LABOUR / ਪੱਕੀ ਲੇਬਰ */}
        {/* ================================================== */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            value.pakkiLabourEnabled
              ? 'bg-amber-50/70 border-amber-400 shadow-2xs ring-1 ring-amber-300/60'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={value.pakkiLabourEnabled}
                onChange={(e) => handleTogglePakki(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-0 cursor-pointer accent-amber-600"
              />
              <div>
                <span className="font-black text-slate-900 text-xs block">
                  ਪੱਕੀ ਲੇਬਰ
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Pakki Labour
                </span>
              </div>
            </label>

            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                value.pakkiLabourEnabled
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {value.pakkiLabourEnabled ? 'ਲਾਗੂ (Enabled)' : 'ਬੰਦ (Off)'}
            </span>
          </div>

          {/* Configurable Rate & Calculation */}
          <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-600 font-semibold">ਦਰ (Rate):</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px] font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={value.pakkiLabourRate ?? ''}
                  onChange={(e) => handlePakkiRateChange(parseFloat(e.target.value) || 0)}
                  disabled={!value.pakkiLabourEnabled}
                  className={`w-16 p-1 text-xs font-mono font-bold rounded border text-right ${
                    value.pakkiLabourEnabled
                      ? 'bg-white border-amber-300 text-slate-900 focus:ring-1 focus:ring-amber-500'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
                <span className="text-[10px] text-slate-500 font-medium">/ ਬੋਰਾ (Bag)</span>
              </div>
            </div>

            {/* Live Calculation Display */}
            {value.pakkiLabourEnabled ? (
              <div className="bg-amber-100/70 border border-amber-300/70 rounded-lg p-1.5 text-[10px] font-mono text-amber-950 flex justify-between items-center">
                <span>
                  {effectiveBags} ਬੋਰੀਆਂ × ₹{value.pakkiLabourRate}
                </span>
                <span className="font-black text-xs text-amber-950">
                  {formatCurrencyINR(value.pakkiLabourAmount)}
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic text-right">
                ਕੋਈ ਕਟੌਤੀ ਨਹੀਂ (₹0.00)
              </div>
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* 2. PAKHA DOUBLE / ਪੱਖਾ ਡਬਲ */}
        {/* ================================================== */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            value.pakkaDoubleLabourEnabled
              ? 'bg-orange-50/70 border-orange-400 shadow-2xs ring-1 ring-orange-300/60'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={value.pakkaDoubleLabourEnabled}
                onChange={(e) => handleToggleDouble(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-0 cursor-pointer accent-orange-600"
              />
              <div>
                <span className="font-black text-slate-900 text-xs block">
                  ਪੱਖਾ ਡਬਲ
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Pakha Double
                </span>
              </div>
            </label>

            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                value.pakkaDoubleLabourEnabled
                  ? 'bg-orange-500 text-white font-black'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {value.pakkaDoubleLabourEnabled ? 'ਲਾਗੂ (Enabled)' : 'ਬੰਦ (Off)'}
            </span>
          </div>

          {/* Configurable Rate & Calculation */}
          <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-600 font-semibold">ਦਰ (Rate):</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px] font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={value.pakkaDoubleLabourRate ?? ''}
                  onChange={(e) => handleDoubleRateChange(parseFloat(e.target.value) || 0)}
                  disabled={!value.pakkaDoubleLabourEnabled}
                  className={`w-16 p-1 text-xs font-mono font-bold rounded border text-right ${
                    value.pakkaDoubleLabourEnabled
                      ? 'bg-white border-orange-300 text-slate-900 focus:ring-1 focus:ring-orange-500'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
                <span className="text-[10px] text-slate-500 font-medium">/ ਬੋਰਾ (Bag)</span>
              </div>
            </div>

            {/* Live Calculation Display */}
            {value.pakkaDoubleLabourEnabled ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5 bg-orange-100/60 p-1.5 rounded">
                  <span className="text-[10px] text-orange-950 font-bold">ਬੋਰੀਆਂ (Bags):</span>
                  <input
                    type="number"
                    min="0"
                    max={effectiveBags}
                    value={value.doubleBagsCount ?? effectiveBags}
                    onChange={(e) => handleDoubleBagsChange(parseInt(e.target.value, 10) || 0)}
                    className="w-20 p-1 text-xs font-mono font-black rounded border border-orange-300 bg-white text-orange-950 text-right focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="bg-orange-100/70 border border-orange-300/70 rounded-lg p-1.5 text-[10px] font-mono text-orange-950 flex justify-between items-center">
                  <span>
                    {(value.doubleBagsCount ?? effectiveBags)} ਬੋਰੀਆਂ × ₹{value.pakkaDoubleLabourRate}
                  </span>
                  <span className="font-black text-xs text-orange-950">
                    {formatCurrencyINR(value.pakkaDoubleLabourAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic text-right">
                ਕੋਈ ਕਟੌਤੀ ਨਹੀਂ (₹0.00)
              </div>
            )}
          </div>
        </div>

        {/* ================================================== */}
        {/* 3. SUKHI LABOUR / ਝੋਨਾ ਸਕਾਈ */}
        {/* ================================================== */}
        <div
          className={`p-3 rounded-xl border transition-all ${
            value.sukhiLabourEnabled
              ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs ring-1 ring-emerald-300/60'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={value.sukhiLabourEnabled}
                onChange={(e) => handleToggleSukhi(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-600"
              />
              <div>
                <span className="font-black text-slate-900 text-xs block">
                  ਝੋਨਾ ਸਕਾਈ
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Paddy Drying (Sukai)
                </span>
              </div>
            </label>

            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                value.sukhiLabourEnabled
                  ? 'bg-emerald-600 text-white font-black'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {value.sukhiLabourEnabled ? 'ਲਾਗੂ (Enabled)' : 'ਬੰਦ (Off)'}
            </span>
          </div>

          {/* Configurable Rate & Calculation */}
          <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-600 font-semibold">ਦਰ (Rate):</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px] font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={value.sukhiLabourRate ?? ''}
                  onChange={(e) => handleSukhiRateChange(parseFloat(e.target.value) || 0)}
                  disabled={!value.sukhiLabourEnabled}
                  className={`w-16 p-1 text-xs font-mono font-bold rounded border text-right ${
                    value.sukhiLabourEnabled
                      ? 'bg-white border-emerald-300 text-slate-900 focus:ring-1 focus:ring-emerald-500'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                />
                <span className="text-[10px] text-slate-500 font-medium">/ ਬੋਰਾ (Bag)</span>
              </div>
            </div>

            {/* Live Calculation Display */}
            {value.sukhiLabourEnabled ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5 bg-emerald-100/60 p-1.5 rounded">
                  <span className="text-[10px] text-emerald-950 font-bold">ਬੋਰੀਆਂ (Bags):</span>
                  <input
                    type="number"
                    min="0"
                    max={effectiveBags}
                    value={value.sukkiBagsCount ?? effectiveBags}
                    onChange={(e) => handleSukhiBagsChange(parseInt(e.target.value, 10) || 0)}
                    className="w-20 p-1 text-xs font-mono font-black rounded border border-emerald-300 bg-white text-emerald-950 text-right focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="bg-emerald-100/70 border border-emerald-300/70 rounded-lg p-1.5 text-[10px] font-mono text-emerald-950 flex justify-between items-center">
                  <span>
                    {(value.sukkiBagsCount ?? effectiveBags)} ਬੋਰੀਆਂ × ₹{value.sukhiLabourRate}
                  </span>
                  <span className="font-black text-xs text-emerald-950">
                    {formatCurrencyINR(value.sukhiLabourAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 italic text-right">
                ਕੋਈ ਕਟੌਤੀ ਨਹੀਂ (₹0.00)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Condition Paddy Breakdown Bar */}
      {(value.pakkaDoubleLabourEnabled || value.sukhiLabourEnabled) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-300 rounded-xl p-3 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between font-black text-amber-950 text-xs">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ਇੱਕੋ ਐਂਟਰੀ ਵਿੱਚ ਮਲਟੀ-ਕੰਡੀਸ਼ਨ ਵੰਡ (Multi-Condition Paddy Breakdown)</span>
            </span>
            <span className="font-mono bg-white border border-amber-300 px-2.5 py-0.5 rounded-lg text-[11px] font-black text-amber-950">
              ਕੁੱਲ: {effectiveBags} ਬੋਰੀਆਂ
            </span>
          </div>
          <div className="bg-white/90 border border-amber-200 rounded-lg p-2 font-mono text-xs text-slate-800 flex flex-wrap items-center gap-2">
            <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {effectiveBags} Total
            </span>
            <span className="font-bold text-slate-400">=</span>
            {value.pakkaDoubleLabourEnabled && (
              <span className="bg-orange-100 text-orange-950 border border-orange-300 px-2 py-0.5 rounded font-bold">
                {value.doubleBagsCount ?? effectiveBags} Double • {formatCurrencyINR(value.pakkaDoubleLabourAmount)}
              </span>
            )}
            {value.sukhiLabourEnabled && (
              <span className="bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 rounded font-bold">
                {value.sukkiBagsCount ?? effectiveBags} Sukki • {formatCurrencyINR(value.sukhiLabourAmount)}
              </span>
            )}
            <span className="bg-indigo-50 text-indigo-950 border border-indigo-200 px-2 py-0.5 rounded font-black">
              {Math.max(0, effectiveBags - ((value.pakkaDoubleLabourEnabled ? (value.doubleBagsCount ?? effectiveBags) : 0) + (value.sukhiLabourEnabled ? (value.sukkiBagsCount ?? effectiveBags) : 0)))} ਬਾਕੀ ਬੈਲੇਂਸ (Remaining Balance)
            </span>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 4. OTHER OPTIONAL DEDUCTIONS / EXPENSES */}
      {/* ================================================== */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-600" />
            <span className="font-bold text-slate-800 text-xs">
              ਹੋਰ ਵਿਕਲਪਿਕ ਕਟੌਤੀਆਂ ਤੇ ਖਰਚੇ (Other Optional Expenses)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
          >
            <Plus className="w-3 h-3" />
            <span>{showAddCustom ? 'ਰੱਦ ਕਰੋ' : '+ ਨਵੀਂ ਕਟੌਤੀ'}</span>
          </button>
        </div>

        {/* Custom Form Popup */}
        {showAddCustom && (
          <form
            onSubmit={handleAddCustomLine}
            className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5 space-y-2 animate-in fade-in duration-100 text-xs"
          >
            <div className="font-bold text-slate-900 text-[11px]">ਨਵੀਂ ਕਟੌਤੀ ਸ਼ਾਮਲ ਕਰੋ:</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Description (e.g. Cleaning)"
                value={newCustomNameEn || ''}
                onChange={(e) => setNewCustomNameEn(e.target.value)}
                className="bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-medium"
                required
              />
              <input
                type="text"
                placeholder="ਵੇਰਵਾ (e.g. ਛਾਣਾਈ)"
                value={newCustomNamePa || ''}
                onChange={(e) => setNewCustomNamePa(e.target.value)}
                className="bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-medium"
              />
              <select
                value={newCustomType || 'PER_QTL'}
                onChange={(e) => setNewCustomType(e.target.value as 'PER_QTL' | 'FIXED')}
                className="bg-white border border-slate-300 rounded p-1.5 text-xs font-bold text-slate-800"
              >
                <option value="PER_QTL">₹ ਪ੍ਰਤੀ ਕੁਇੰਟਲ (/ Qul)</option>
                <option value="FIXED">ਫਿਕਸ ਰਕਮ (Fixed ₹)</option>
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Rate"
                  value={newCustomRate || ''}
                  onChange={(e) => setNewCustomRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs font-mono font-bold text-right"
                  required
                />
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded text-xs shrink-0"
                >
                  ਸ਼ਾਮਲ ਕਰੋ
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Existing Custom / Preset Deduction Items List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-100">
          {(value.customDeductions || []).map((item) => (
            <div
              key={item.id}
              className={`pt-1.5 pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded px-2 ${
                item.enabled ? 'bg-slate-50 font-semibold' : 'opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => handleToggleCustom(item.id, e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-600 shrink-0"
                />
                <div className="truncate">
                  <span className="text-slate-900 text-xs font-bold">{item.namePa}</span>
                  <span className="text-slate-500 text-[10px] font-normal ml-1 font-mono">({item.nameEn})</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-[11px]">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.rate ?? ''}
                    onChange={(e) => handleCustomRateChange(item.id, parseFloat(e.target.value) || 0)}
                    disabled={!item.enabled}
                    className={`w-16 p-0.5 text-xs font-mono font-bold rounded border text-right ${
                      item.enabled
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-500">
                    {item.type === 'PER_QTL' ? '/ Qul' : 'Fix'}
                  </span>
                </div>

                <div className="min-w-20 text-right font-mono font-bold text-xs text-slate-800">
                  {item.enabled ? formatCurrencyINR(item.amount) : '₹0.00'}
                </div>

                {item.id.startsWith('custom_') && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustom(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================== */}
      {/* 5. SUMMARY STRIP & NET CALCULATION */}
      {/* ================================================== */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
              ਕੁੱਲ ਫਸਲ ਰਕਮ (Gross)
            </span>
            <span className="text-xs sm:text-sm font-mono font-black text-slate-200">
              {formatCurrencyINR(value.grossAmount || grossAmount)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-bold">
              (-) ਕੁੱਲ ਕਟੌਤੀਆਂ (Deductions)
            </span>
            <span className="text-xs sm:text-sm font-mono font-black text-amber-400">
              {hasAnyAppliedDeduction ? `- ${formatCurrencyINR(value.grandTotalDeductions)}` : '₹0.00'}
            </span>
          </div>
        </div>

        {/* Net Farmer Payable */}
        <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-lg flex items-center justify-between sm:justify-end gap-3 text-right">
          <div>
            <span className="text-[9px] text-emerald-300 uppercase tracking-wider block font-black">
              ਕਿਸਾਨ ਨੂੰ ਸ਼ੁੱਧ ਭੁਗਤਾਨ (Net Payable)
            </span>
            <span className="text-sm sm:text-base font-mono font-black text-emerald-300">
              {formatCurrencyINR(value.netPayableAmount)}
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        </div>
      </div>
    </div>
  );
};
