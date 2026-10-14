import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { DEFAULT_PADDY_VARIETIES } from '../../context/MandiContext';
import { VarietyBreakdownItem } from '../../types/mandi';
import { Plus, Check, ChevronDown, Split, Layers, X, Trash2, Sparkles } from 'lucide-react';

interface VarietySelectorProps {
  variety: string;
  onVarietyChange: (val: string) => void;
  varietyBreakdown?: VarietyBreakdownItem[];
  onBreakdownChange?: (items: VarietyBreakdownItem[]) => void;
  totalBags?: number; // Total bags to match against
  label?: string;
  required?: boolean;
  className?: string;
}

export const VarietySelector: React.FC<VarietySelectorProps> = ({
  variety,
  onVarietyChange,
  varietyBreakdown = [],
  onBreakdownChange,
  totalBags,
  label,
  required = false,
  className = ''
}) => {
  const { settings, addPaddyVariety, language } = useMandi();
  const isEn = language === 'en';

  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVarietyName, setNewVarietyName] = useState('');
  const [isBreakdownMode, setIsBreakdownMode] = useState<boolean>(
    Boolean(varietyBreakdown && varietyBreakdown.length > 1)
  );

  // Available varieties list from settings with fallback
  const varietiesList: string[] = useMemo(() => {
    if (settings.paddyVarieties && settings.paddyVarieties.length > 0) {
      return settings.paddyVarieties;
    }
    return DEFAULT_PADDY_VARIETIES;
  }, [settings.paddyVarieties]);

  // Breakdown bags sum
  const breakdownSum = useMemo(() => {
    return (varietyBreakdown || []).reduce((acc, curr) => acc + (Number(curr.bags) || 0), 0);
  }, [varietyBreakdown]);

  const handleAddNewVariety = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newVarietyName.trim();
    if (!trimmed) return;
    addPaddyVariety(trimmed);
    if (!isBreakdownMode) {
      onVarietyChange(trimmed);
    }
    setNewVarietyName('');
    setShowAddModal(false);
    setIsOpen(false);
  };

  const handleToggleBreakdown = () => {
    const nextMode = !isBreakdownMode;
    setIsBreakdownMode(nextMode);

    if (nextMode) {
      // If switching to breakdown mode and breakdown is empty, initialize with current variety & total bags
      if (!varietyBreakdown || varietyBreakdown.length === 0) {
        const initialVar = variety || varietiesList[0] || 'PR-126';
        const initialBags = totalBags && totalBags > 0 ? totalBags : 0;
        if (onBreakdownChange) {
          onBreakdownChange([{ variety: initialVar, bags: initialBags }]);
        }
      }
    } else {
      // If switching back to single variety
      if (varietyBreakdown && varietyBreakdown.length > 0) {
        onVarietyChange(varietyBreakdown[0].variety);
      }
      if (onBreakdownChange) {
        onBreakdownChange([]);
      }
    }
  };

  const handleAddBreakdownRow = () => {
    if (!onBreakdownChange) return;
    const remainingBags = totalBags ? Math.max(0, totalBags - breakdownSum) : 0;
    // pick a variety not yet in breakdown if possible
    const existingVars = new Set(varietyBreakdown.map((r) => r.variety));
    const nextVar = varietiesList.find((v) => !existingVars.has(v)) || varietiesList[0] || 'Hybrid';
    onBreakdownChange([...varietyBreakdown, { variety: nextVar, bags: remainingBags }]);
  };

  const handleUpdateBreakdownRow = (index: number, updates: Partial<VarietyBreakdownItem>) => {
    if (!onBreakdownChange) return;
    const updated = [...varietyBreakdown];
    updated[index] = { ...updated[index], ...updates };
    onBreakdownChange(updated);
    // Also keep primary variety synced with the one with most bags
    const sorted = [...updated].sort((a, b) => (b.bags || 0) - (a.bags || 0));
    if (sorted[0] && sorted[0].variety) {
      onVarietyChange(sorted[0].variety);
    }
  };

  const handleRemoveBreakdownRow = (index: number) => {
    if (!onBreakdownChange) return;
    const updated = varietyBreakdown.filter((_, i) => i !== index);
    onBreakdownChange(updated);
    if (updated.length > 0) {
      onVarietyChange(updated[0].variety);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header Bar: Label + Breakdown Mode Toggle */}
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-600" />
          <span>{label || (isEn ? 'Paddy Variety / ਕਿਸਮ' : 'ਝੋਨੇ ਦੀ ਕਿਸਮ (Paddy Variety)')}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {onBreakdownChange && (
          <button
            type="button"
            onClick={handleToggleBreakdown}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition flex items-center gap-1 ${
              isBreakdownMode
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Split className="w-3 h-3" />
            <span>
              {isBreakdownMode
                ? (isEn ? 'Multi-Variety Active' : 'ਕਿਸਮ ਅਨੁਸਾਰ ਵੰਡ ਚਾਲੂ')
                : (isEn ? 'Split Varieties?' : 'ਵੰਡ / ਮਲਟੀ ਕਿਸਮਾਂ?')}
            </span>
          </button>
        )}
      </div>

      {/* SINGLE VARIETY SELECTION DROPDOWN */}
      {!isBreakdownMode ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
          >
            <span className="truncate">
              {variety ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-black text-slate-900">{variety}</span>
                </span>
              ) : (
                <span className="text-slate-400 font-normal">
                  {isEn ? '-- Select Variety (e.g. PR-126, Hybrid) --' : '-- ਝੋਨੇ ਦੀ ਕਿਸਮ ਚੁਣੋ (PR-126, ਹਾਈਬ੍ਰਿਡ) --'}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN MENU */}
          {isOpen && (
            <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{isEn ? 'Available Varieties' : 'ਉਪਲਬਧ ਕਿਸਮਾਂ (Varieties)'}</span>
                <span className="text-slate-400 font-normal">ਕੁੱਲ: {varietiesList.length}</span>
              </div>

              {varietiesList.map((item) => {
                const isSelected = variety === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onVarietyChange(item);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-50 text-amber-950 font-black'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{item}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0 ml-2" />}
                  </button>
                );
              })}

              {/* + ADD VARIETY OPTION AT THE VERY BOTTOM */}
              <div className="border-t border-slate-100 p-1 bg-amber-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(true);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-black text-emerald-800 hover:bg-emerald-100/70 rounded-lg transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isEn ? '+ Add New Variety (ਨਵੀਂ ਕਿਸਮ ਜੋੜੋ)' : '+ ਨਵੀਂ ਕਿਸਮ ਜੋੜੋ (+ Add Variety)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MULTIPLE VARIETIES BREAKDOWN (e.g. 150 Bags Hybrid + 100 Bags PR-126 + 50 Bags PR-110 = 300 Bags) */
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEn ? 'Variety-Wise Bag Breakdown' : 'ਕਿਸਮ ਅਨੁਸਾਰ ਬੋਰੀਆਂ ਦੀ ਵੰਡ (Breakdown)'}</span>
            </span>

            {/* Sum indicator vs Total Bags */}
            {totalBags !== undefined && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  breakdownSum === totalBags
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}
              >
                ਵੰਡ: {breakdownSum} / ਕੁੱਲ: {totalBags} {breakdownSum === totalBags ? '✓' : `(ਬਾਕੀ: ${totalBags - breakdownSum})`}
              </span>
            )}
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-2">
            {(varietyBreakdown || []).map((row, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs"
              >
                {/* Variety Selector */}
                <div className="flex-1 min-w-[140px]">
                  <select
                    value={row.variety}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setShowAddModal(true);
                      } else {
                        handleUpdateBreakdownRow(idx, { variety: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {varietiesList.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value="__ADD_NEW__">
                      {isEn ? '+ Add New Variety...' : '+ ਨਵੀਂ ਕਿਸਮ ਜੋੜੋ...'}
                    </option>
                  </select>
                </div>

                {/* Bags Input */}
                <div className="w-24 sm:w-28 flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="ਬੋਰੀਆਂ"
                    value={row.bags || ''}
                    onChange={(e) =>
                      handleUpdateBreakdownRow(idx, { bags: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-black text-slate-900 text-right focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">ਬੋਰੀਆਂ</span>
                </div>

                {/* Remove row button (if more than 1 row) */}
                {varietyBreakdown.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBreakdownRow(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                    title={isEn ? 'Remove row' : 'ਹਟਾਓ'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Action Row: Add Row + Add Variety Modal */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleAddBreakdownRow}
              className="px-2.5 py-1 text-[11px] font-bold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs"
            >
              <Plus className="w-3 h-3 text-amber-600" />
              <span>{isEn ? '+ Add Variety Row' : '+ ਹੋਰ ਕਿਸਮ ਜੋੜੋ (Add Row)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-emerald-600" />
              <span>{isEn ? 'New Variety Master' : 'ਨਵੀਂ ਕਿਸਮ ਮਾਸਟਰ'}</span>
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD NEW VARIETY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  🌾
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {isEn ? 'Add New Paddy Variety' : 'ਨਵੀਂ ਝੋਨੇ ਦੀ ਕਿਸਮ ਜੋੜੋ'}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isEn ? 'This variety will be saved permanently' : 'ਇਹ ਕਿਸਮ ਸਾਫਟਵੇਅਰ ਵਿੱਚ ਪੱਕੇ ਤੌਰ ਤੇ ਸੇਵ ਹੋ ਜਾਵੇਗੀ'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setNewVarietyName('');
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewVariety} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Variety Name (e.g. PR-131, 1509, Pusa-44)' : 'ਕਿਸਮ ਦਾ ਨਾਮ (ਜਿਵੇਂ: PR-131, 1509, ਪੂਸਾ 44)'}
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. PR-131, Pusa 44, 1509"
                  value={newVarietyName}
                  onChange={(e) => setNewVarietyName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Suggestions / Common Varieties */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-medium">ਆਮ ਕਿਸਮਾਂ ਦੇ ਸੁਝਾਅ:</span>
                <div className="flex flex-wrap gap-1">
                  {['PR-131', 'Pusa 44', '1509 Basmati', '1401', 'Sharbati', 'PR-128'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewVarietyName(sug)}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded border border-slate-200 transition font-medium"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewVarietyName('');
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  {isEn ? 'Cancel' : 'ਰੱਦ ਕਰੋ'}
                </button>
                <button
                  type="submit"
                  disabled={!newVarietyName.trim()}
                  className="px-4 py-1.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isEn ? 'Save Variety' : 'ਕਿਸਮ ਸੇਵ ਕਰੋ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
