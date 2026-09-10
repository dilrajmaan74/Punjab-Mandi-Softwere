import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { useMandi } from '../../context/MandiContext';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: string;
  keywords?: string | string[];
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  id?: string;
  name?: string;
  allowClear?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  error?: boolean;
  emptyMessage?: string;
  maxDropdownHeight?: string;
  autoFocusSearch?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder,
  searchPlaceholder,
  disabled = false,
  required = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  id,
  name,
  allowClear = false,
  size = 'sm',
  error = false,
  emptyMessage,
  maxDropdownHeight = 'max-h-64',
  autoFocusSearch = true
}) => {
  const { language } = useMandi();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected option lookup
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Labels & placeholders based on language
  const defaultPlaceholder = language === 'en' ? 'Select...' : 'ਚੁਣੋ...';
  const displayPlaceholder = placeholder || defaultPlaceholder;
  const defaultSearchPlaceholder = language === 'en' ? 'Type to search...' : 'ਖੋਜਣ ਲਈ ਲਿਖੋ...';
  const displaySearchPlaceholder = searchPlaceholder || defaultSearchPlaceholder;
  const defaultEmptyMessage = language === 'en' ? 'No items found' : 'ਕੋਈ ਵਿਕਲਪ ਨਹੀਂ ਮਿਲਿਆ';
  const displayEmptyMessage = emptyMessage || defaultEmptyMessage;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    const cleanNum = term.replace(/[^0-9]/g, '');

    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(term) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
      const matchVal = opt.value.toLowerCase().includes(term);
      const kwStr = Array.isArray(opt.keywords) ? opt.keywords.join(' ') : (opt.keywords || '');
      const matchKeywords = kwStr ? kwStr.toLowerCase().includes(term) : false;

      let matchNum = false;
      if (cleanNum.length >= 2) {
        const fullText = `${opt.label} ${opt.subLabel || ''} ${kwStr} ${opt.value}`;
        const cleanFull = fullText.replace(/[^0-9]/g, '');
        matchNum = cleanFull.includes(cleanNum);
      }

      return matchLabel || matchSub || matchBadge || matchVal || matchKeywords || matchNum;
    });
  }, [options, searchTerm]);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      if (autoFocusSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, autoFocusSearch]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  // Size styling maps
  const sizeClasses = {
    xs: 'py-1 px-2 text-[11px]',
    sm: 'py-1.5 px-2.5 text-xs',
    md: 'py-2 px-3 text-xs sm:text-sm',
    lg: 'py-2.5 px-3.5 text-sm sm:text-base'
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left ${className}`}
    >
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          type="text"
          name={name}
          id={id}
          tabIndex={-1}
          required={required}
          value={value || ''}
          onChange={() => {}}
          className="sr-only"
        />
      )}

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl font-bold transition-all select-none text-left ${
          sizeClasses[size]
        } ${
          error
            ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500'
            : isOpen
            ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs'
            : 'border-slate-300 bg-slate-50/70 hover:bg-white text-slate-800 focus:border-emerald-500'
        } border ${
          disabled ? 'opacity-60 bg-slate-100 cursor-not-allowed text-slate-400' : 'cursor-pointer'
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {selectedOption ? (
            <div className="truncate flex items-center gap-1.5 flex-1 min-w-0">
              <span className="truncate text-slate-900 font-bold">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-[10px] text-slate-500 font-normal truncate shrink-0">
                  {selectedOption.subLabel}
                </span>
              )}
              {selectedOption.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                    selectedOption.badgeColor || 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 font-normal truncate">
              {displayPlaceholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {allowClear && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-emerald-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden min-w-[220px] animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
          role="listbox"
        >
          {/* Top Search Input Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={displaySearchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredOptions[0].value);
                  }
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Counter if large list */}
            {options.length > 8 && (
              <div className="flex items-center justify-between px-1 pt-1 text-[10px] text-slate-400">
                <span>
                  {language === 'en'
                    ? `${filteredOptions.length} of ${options.length} options`
                    : `${filteredOptions.length} / ${options.length} ਉਪਲਬਧ`}
                </span>
                {searchTerm && (
                  <span className="text-emerald-600 font-bold">
                    {language === 'en' ? 'Press Enter to pick top match' : 'ਪਹਿਲਾ ਚੁਣਨ ਲਈ Enter ਦਬਾਓ'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className={`${maxDropdownHeight} overflow-y-auto p-1 divide-y divide-slate-50`}>
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-400">
                <Search className="w-5 h-5 mx-auto mb-1 text-slate-300 stroke-1" />
                <p className="font-semibold">{displayEmptyMessage}</p>
                {searchTerm && (
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">"{searchTerm}"</p>
                )}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    } ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`truncate ${isSelected ? 'font-black text-emerald-900' : 'font-bold'}`}>
                          {option.label}
                        </span>
                        {option.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                              option.badgeColor || 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.subLabel && (
                        <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {option.subLabel}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
