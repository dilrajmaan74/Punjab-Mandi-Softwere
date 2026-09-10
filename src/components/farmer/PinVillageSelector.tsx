import React, { useState, useEffect, useRef } from 'react';
import { PinCodeVillageMapping, VillageOption } from '../../types/mandi';
import { INITIAL_PIN_CODES } from '../../data/pinCodes';
import { MapPin, Check, AlertCircle, Building2, Search, Edit3, Sparkles, ChevronDown, X } from 'lucide-react';
import { transliterateEnglishToPunjabi } from '../../utils/translations';

interface PinVillageSelectorProps {
  pinCode: string;
  village: string;
  villagePa: string;
  pinCodesList: PinCodeVillageMapping[];
  onPinCodeChange: (newPin: string) => void;
  onVillageChange: (villageEn: string, villagePa: string) => void;
  onAddNewVillageToDb?: (pinCode: string, villageEn: string, villagePa: string) => void;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

// Popular Punjab PIN codes for 1-click quick selection/testing
const QUICK_PIN_SHORTCUTS = [
  { pin: '144629', district: 'ਕੰਗ ਖੁਰਦ / ਲੋਹੀਆਂ ਖਾਸ (Kang Khurd, Shahkot)' },
  { pin: '140001', district: 'ਰੂਪਨਗਰ (Ropar)' },
  { pin: '141401', district: 'ਖੰਨਾ (Khanna)' },
  { pin: '141001', district: 'ਲੁਧਿਆਣਾ (Ludhiana)' },
  { pin: '147001', district: 'ਪਟਿਆਲਾ (Patiala)' },
  { pin: '143001', district: 'ਅੰਮ੍ਰਿਤਸਰ (Amritsar)' },
  { pin: '151001', district: 'ਬਠਿੰਡਾ (Bathinda)' },
  { pin: '144001', district: 'ਜਲੰਧਰ (Jalandhar)' },
  { pin: '148023', district: 'ਮਲੇਰਕੋਟਲਾ (Malerkotla)' }
];

export const PinVillageSelector: React.FC<PinVillageSelectorProps> = ({
  pinCode,
  village,
  villagePa,
  pinCodesList,
  onPinCodeChange,
  onVillageChange,
  required = true,
  disabled = false,
  compact = false
}) => {
  const [isManualMode, setIsManualMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Clean the current PIN code string (numeric only, max 6 digits)
  const cleanPin = (pinCode || '').toString().replace(/\D/g, '').slice(0, 6);

  // Merge runtime pinCodesList with authoritative INITIAL_PIN_CODES to guarantee 100% data availability
  const combinedMap: PinCodeVillageMapping[] = [...(pinCodesList || [])];
  INITIAL_PIN_CODES.forEach((initP) => {
    const foundIdx = combinedMap.findIndex((p) => p.pinCode === initP.pinCode);
    if (foundIdx === -1) {
      combinedMap.push(initP);
    } else {
      // Merge villages if not already present
      const currVillages = combinedMap[foundIdx].villages;
      initP.villages.forEach((iv) => {
        if (!currVillages.some((v) => v.en.toLowerCase() === iv.en.toLowerCase())) {
          currVillages.push(iv);
        }
      });
    }
  });

  // Find matching PIN code mapping
  const matchedMapping = combinedMap.find((p) => p.pinCode.trim() === cleanPin);
  const matchingVillages: VillageOption[] = matchedMapping ? matchedMapping.villages : [];

  // Filter villages by search query in both English and Punjabi (Requirement 2, 3, 4, 5, 6)
  const filteredVillages = matchingVillages.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return v.en.toLowerCase().includes(q) || v.pa.toLowerCase().includes(q);
  });

  // Track if user typed 6 digits but no mapping found in Punjab dataset
  const isSixDigits = cleanPin.length === 6;
  const isNoVillageFound = isSixDigits && matchingVillages.length === 0;

  // Handle clicking outside to close searchable dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isDropdownOpen]);

  // Handle PIN input change (Requirement 1, 4, 8)
  const handlePinInput = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 6);
    if (digitsOnly !== cleanPin) {
      onPinCodeChange(digitsOnly);
      // Requirement 8: If PIN Code is changed, clear previous village selection and load new matching list
      onVillageChange('', '');
      setIsManualMode(false);
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  };

  // Handle quick PIN shortcut click
  const handleQuickPinSelect = (quickPin: string) => {
    if (quickPin !== cleanPin) {
      onPinCodeChange(quickPin);
      onVillageChange('', '');
      setIsManualMode(false);
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  };

  // Handle village selection from custom dropdown
  const handleSelectVillage = (selected: VillageOption) => {
    onVillageChange(selected.en, selected.pa);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  // Handle manual editing of English village name (translates to Punjabi automatically)
  const handleManualVillageEnChange = (val: string) => {
    const autoPa = transliterateEnglishToPunjabi(val);
    onVillageChange(val, autoPa);
  };

  // Handle manual editing of Punjabi village name
  const handleManualVillagePaChange = (val: string) => {
    onVillageChange(village, val);
  };

  return (
    <div className="w-full space-y-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
      {/* Header with Icon and Info */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <h4 className="text-xs font-black text-slate-800">
            ਪਿੰਨ ਕੋਡ ਅਤੇ ਪਿੰਡ ਦੀ ਚੋਣ (PIN Code & Village Lookup)
          </h4>
        </div>
        {matchedMapping && (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Building2 className="w-3 h-3 text-emerald-600" />
            <span>ਜ਼ਿਲ੍ਹਾ: {matchedMapping.districtPa} ({matchedMapping.districtEn})</span>
          </span>
        )}
      </div>

      {/* Row with PIN Code & Village Fields */}
      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 items-start`}>
        {/* PIN Code Field (Requirement 1 & 4) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="farmer-pincode-input" className="block text-xs font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>ਪਿੰਨ ਕੋਡ (PIN Code)</span>
              {required && <span className="text-rose-500">*</span>}
            </label>
            <span className="text-[10px] text-emerald-700 font-bold">ਟਾਈਪ ਕਰੋ</span>
          </div>

          <div className="relative">
            <input
              id="farmer-pincode-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={disabled}
              placeholder="e.g. 144629, 140001"
              value={cleanPin}
              onChange={(e) => handlePinInput(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-300 focus:border-emerald-600 focus:bg-white rounded-lg px-3 py-2 text-sm font-mono font-black text-slate-900 shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required={required}
            />
            {cleanPin.length === 6 && matchingVillages.length > 0 && (
              <div className="absolute right-2.5 top-2.5 text-emerald-600 bg-emerald-50 rounded-full p-0.5">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Quick PIN Status / Hint */}
          <div className="mt-1.5 text-[11px]">
            {matchedMapping ? (
              <div className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{matchingVillages.length} ਪਿੰਡ ਉਪਲਬਧ ({matchedMapping.districtPa})</span>
              </div>
            ) : cleanPin.length > 0 && cleanPin.length < 6 ? (
              <div className="text-slate-500 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>6 ਅੰਕ ਪੂਰੇ ਕਰੋ ({cleanPin.length}/6)</span>
              </div>
            ) : null}
          </div>

          {/* Quick Shortcuts for Testing Punjab PIN Codes */}
          {!compact && (
            <div className="mt-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mb-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>ਪੰਜਾਬ ਪਿੰਨ ਕੋਡ ਚੁਣੋ (Quick PINs):</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {QUICK_PIN_SHORTCUTS.slice(0, 6).map((q) => (
                  <button
                    key={q.pin}
                    type="button"
                    onClick={() => handleQuickPinSelect(q.pin)}
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition ${
                      cleanPin === q.pin
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 border border-slate-200'
                    }`}
                  >
                    {q.pin}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Village Selection Dropdown & Inputs (Requirement 2, 3, 5, 6, 7, 9, 10) */}
        <div className={compact ? 'sm:col-span-1' : 'sm:col-span-2'}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>ਪਿੰਡ / ਸ਼ਹਿਰ (Village / Town)</span>
              {required && <span className="text-rose-500">*</span>}
            </label>

            {/* Toggle manual mode */}
            {matchingVillages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsManualMode(!isManualMode);
                  setIsDropdownOpen(false);
                }}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer underline"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isManualMode ? 'ਡ੍ਰੌਪਡਾਉਨ ਦਿਖਾਓ (Show Dropdown)' : 'ਮੈਨੂਅਲ ਟਾਈਪ ਕਰੋ (Type Manually)'}</span>
              </button>
            )}
          </div>

          {/* CASE 1: MATCHING VILLAGES FOUND FOR THIS PIN CODE */}
          {matchingVillages.length > 0 ? (
            <div className="space-y-2.5">
              {/* Searchable Village Combobox Dropdown */}
              <div className="relative" ref={dropdownRef}>
                {/* Trigger Button */}
                <button
                  type="button"
                  id="village-dropdown-trigger"
                  disabled={disabled}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full flex items-center justify-between bg-emerald-50/80 hover:bg-emerald-100/70 border-2 ${
                    isDropdownOpen ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-emerald-500'
                  } text-slate-900 font-bold rounded-lg px-3 py-2 text-xs sm:text-sm shadow-2xs focus:outline-none transition text-left cursor-pointer`}
                >
                  <div className="truncate pr-2">
                    {village ? (
                      <span className="text-slate-900 font-black flex items-center gap-1.5">
                        <span className="text-emerald-800 font-extrabold">{villagePa || village}</span>
                        <span className="text-slate-500 text-xs font-semibold">({village})</span>
                      </span>
                    ) : (
                      <span className="text-slate-700 font-bold">
                        ▼ Select Village / ਪਿੰਡ ਚੁਣੋ ({matchingVillages.length} ਪਿੰਡ ਮਿਲੇ)
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-emerald-700 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Popup with Sticky Search at TOP (Requirement 1, 2, 3, 4, 5, 6, 7, 10) */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-emerald-600 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* STICKY SEARCH BOX AT TOP (Requirement 1 & 10) */}
                    <div className="sticky top-0 bg-slate-50 border-b border-emerald-200 p-2.5 z-20">
                      <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-emerald-600 absolute left-2.5 pointer-events-none" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          id="village-search-input"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="🔍 Search Village / ਪਿੰਡ ਖੋਜੋ (English / ਪੰਜਾਬੀ)..."
                          className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-lg pl-8 pr-8 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Filter stats */}
                      <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-500 font-bold">
                        <span>
                          {searchQuery ? `ਨਤੀਜੇ (Found): ${filteredVillages.length} / ${matchingVillages.length}` : `ਕੁੱਲ ਉਪਲਬਧ (Total): ${matchingVillages.length} ਪਿੰਡ`}
                        </span>
                        {searchQuery && (
                          <span className="text-emerald-700">ਲਾਈਵ ਖੋਜ (Live Filter)</span>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Village List */}
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {/* Option to clear / unselect */}
                      <button
                        type="button"
                        onClick={() => {
                          onVillageChange('', '');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center justify-between cursor-pointer"
                      >
                        <span>-- ਪਿੰਡ ਚੋਣ ਹਟਾਓ (Clear Village Selection) --</span>
                      </button>

                      {filteredVillages.length > 0 ? (
                        filteredVillages.map((v, idx) => {
                          const isSelected = village.toLowerCase() === v.en.toLowerCase();
                          return (
                            <button
                              key={`${v.en}-${idx}`}
                              type="button"
                              onClick={() => handleSelectVillage(v)}
                              className={`w-full text-left px-3 py-2.5 text-xs transition flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-100 text-emerald-950 font-black'
                                  : 'hover:bg-emerald-50/80 text-slate-800 font-medium'
                              }`}
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="font-bold text-slate-900 text-[13px]">{v.pa}</span>
                                <span className="text-slate-600 font-semibold text-xs">({v.en})</span>
                              </div>
                              {isSelected && (
                                <span className="text-emerald-700 bg-emerald-200/70 p-1 rounded-full shrink-0">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        /* Requirement 7: If no village matches search */
                        <div className="p-4 text-center text-slate-500 bg-amber-50/50">
                          <p className="font-black text-amber-900 text-xs">No village found</p>
                          <p className="font-bold text-amber-800 text-[11px] mt-0.5">ਕੋਈ ਪਿੰਡ ਨਹੀਂ ਮਿਲਿਆ</p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            '{searchQuery}' ਲਈ ਕੋਈ ਪਿੰਡ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਸਪੈਲਿੰਗ ਚੈੱਕ ਕਰੋ ਜਾਂ ਹੇਠਾਂ ਮੈਨੂਅਲ ਟਾਈਪ ਕਰੋ।
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Manual Entry Option Footer */}
                    <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualMode(true);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full py-1.5 px-2 text-xs font-bold text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-md border border-dashed border-blue-300 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>✏️ ਹੋਰ ਪਿੰਡ / Enter Village Manually...</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement 7 & 11: Keep Selected Village fully editable in both English & Punjabi */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-emerald-600" />
                    <span>ਚੁਣਿਆ ਪਿੰਡ ਸੋਧਣਯੋਗ ਹੈ (Editable Village Names):</span>
                  </span>
                  {village ? (
                    <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                      ✓ ਸੇਵ ਹੋਣ ਲਈ ਤਿਆਰ ({village})
                    </span>
                  ) : (
                    <span className="text-amber-700 text-[10px]">
                      ਉੱਪਰ ਡ੍ਰੌਪਡਾਉਨ ਤੋਂ ਪਿੰਡ ਚੁਣੋ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block mb-0.5">
                      Village Name (English) {required && <span className="text-rose-500">*</span>}
                    </span>
                    <input
                      id="farmer-village-en-input"
                      type="text"
                      disabled={disabled}
                      placeholder="e.g. Lohian Khas / Haveli Kalan"
                      value={village || ''}
                      onChange={(e) => handleManualVillageEnChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required={required}
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block mb-0.5">
                      ਪਿੰਡ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ - ਗੁਰਮੁਖੀ) {required && <span className="text-rose-500">*</span>}
                    </span>
                    <input
                      id="farmer-village-pa-input"
                      type="text"
                      disabled={disabled}
                      placeholder="e.g. ਲੋਹੀਆਂ ਖਾਸ / ਹਵੇਲੀ ਕਲਾਂ"
                      value={villagePa || ''}
                      onChange={(e) => handleManualVillagePaChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      required={required}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : isNoVillageFound ? (
            /* CASE 2: 6-DIGIT PIN ENTERED BUT NO VILLAGE IN DATABASE (Requirement 9 & 10) */
            <div className="space-y-2">
              {/* Alert: "No villages found for this PIN Code" */}
              <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3 flex items-start gap-2.5 text-amber-950 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5 w-full">
                  <p className="font-black text-amber-900">
                    No villages found for this PIN Code
                  </p>
                  <p className="font-bold text-amber-800 text-[11px]">
                    ਇਸ ਪਿੰਨ ਕੋਡ ਲਈ ਕੋਈ ਪਿੰਡ ਨਹੀਂ ਮਿਲਿਆ
                  </p>
                  <p className="text-[11px] text-amber-700 pt-0.5">
                    ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਆਪਣੇ ਪਿੰਡ ਦਾ ਨਾਂ ਮੈਨੂਅਲ ਦਰਜ ਕਰੋ (Enter Village Manually below):
                  </p>
                </div>
              </div>

              {/* Manual inputs for English & Punjabi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    ਪਿੰਡ ਦਾ ਨਾਂ (English) <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="Enter Village Name in English"
                    value={village || ''}
                    onChange={(e) => handleManualVillageEnChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required={required}
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-700 block mb-0.5">
                    ਪਿੰਡ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ) <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="text"
                    disabled={disabled}
                    placeholder="ਪਿੰਡ ਦਾ ਨਾਂ ਪੰਜਾਬੀ ਵਿੱਚ ਦਰਜ ਕਰੋ"
                    value={villagePa || ''}
                    onChange={(e) => handleManualVillagePaChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-emerald-600 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required={required}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* CASE 3: PIN NOT FULLY ENTERED YET (Prompt user to type PIN Code) */
            <div className="space-y-2">
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-600 text-xs">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold mb-1">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>ਪਹਿਲਾਂ 6-ਅੰਕੀ ਪਿੰਨ ਕੋਡ ਦਰਜ ਕਰੋ (Enter PIN Code first)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  ਪਿੰਨ ਕੋਡ (ਜਿਵੇਂ <strong>144629</strong>, <strong>140001</strong>, <strong>141401</strong>) ਦਰਜ ਕਰਦੇ ਹੀ ਪਿੰਡਾਂ ਦੀ ਸੂਚੀ ਡ੍ਰੌਪਡਾਉਨ ਵਿੱਚ ਦਿਖਾਈ ਦੇਵੇਗੀ।
                </p>
              </div>

              {/* Editable fallback inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  disabled={disabled}
                  placeholder="Village Name (English)"
                  value={village || ''}
                  onChange={(e) => handleManualVillageEnChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  required={required}
                />
                <input
                  type="text"
                  disabled={disabled}
                  placeholder="ਪਿੰਡ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)"
                  value={villagePa || ''}
                  onChange={(e) => handleManualVillagePaChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  required={required}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
