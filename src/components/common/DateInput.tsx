import React, { useRef } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { autoFormatDate, convertYYYYMMDDtoDDMMYYYY, convertDDMMYYYYtoYYYYMMDD } from '../../utils/calculations';

interface DateInputProps {
  id?: string;
  name?: string;
  title?: string;
  value: string; // Stored as DD/MM/YYYY
  onChange: (value: string) => void;
  label?: string;
  labelPa?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
  id,
  name,
  title,
  value,
  onChange,
  label,
  labelPa,
  placeholder = 'DD/MM/YYYY',
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
  error,
  autoFocus = false
}) => {
  const nativePickerRef = useRef<HTMLInputElement>(null);
  const lastKeyRef = useRef<string>('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    lastKeyRef.current = e.key;
    if (e.key === 'Backspace') {
      const input = e.currentTarget;
      const val = input.value;
      const cursorPos = input.selectionStart || 0;
      // If cursor is right after a slash, delete the digit before the slash as well
      if (cursorPos === 3 || cursorPos === 6) {
        if (val[cursorPos - 1] === '/') {
          e.preventDefault();
          const newVal = val.slice(0, cursorPos - 2) + val.slice(cursorPos);
          onChange(autoFormatDate(newVal, true));
        }
      }
    }
  };

  // Handle typing: typing numbers automatically formats with / / e.g. 05102027 -> 05/10/2027
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const isDeleting = lastKeyRef.current === 'Backspace';
    const formatted = autoFormatDate(raw, isDeleting);
    onChange(formatted);
  };

  // Handle native calendar picker selection (YYYY-MM-DD -> DD/MM/YYYY)
  const handleCalendarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedVal = e.target.value;
    if (pickedVal) {
      const converted = convertYYYYMMDDtoDDMMYYYY(pickedVal);
      onChange(converted);
    }
  };

  const openCalendar = () => {
    if (disabled) return;
    try {
      if (nativePickerRef.current) {
        if ('showPicker' in HTMLInputElement.prototype) {
          nativePickerRef.current.showPicker();
        } else {
          nativePickerRef.current.focus();
          nativePickerRef.current.click();
        }
      }
    } catch {
      nativePickerRef.current?.click();
    }
  };

  const ymdValue = convertDDMMYYYYtoYYYYMMDD(value || '');

  return (
    <div className={`relative ${className}`}>
      {(label || labelPa) && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-800 mb-1">
          {labelPa && <span className="font-semibold text-emerald-900">{labelPa} </span>}
          {label && <span className="text-slate-600">({label})</span>}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          name={name}
          title={title}
          autoFocus={autoFocus}
          value={value || ''}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={10}
          disabled={disabled}
          required={required}
          className={`w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors disabled:bg-slate-100 disabled:text-slate-400 ${
            error ? 'border-rose-400 focus:ring-rose-400' : ''
          } ${inputClassName}`}
        />

        {/* Hidden native date input for calendar picker */}
        <input
          ref={nativePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={ymdValue || ''}
          onChange={handleCalendarPick}
          disabled={disabled}
          className="absolute right-0 top-0 bottom-0 w-8 opacity-0 pointer-events-none"
        />

        {/* Calendar Picker Trigger Button */}
        <button
          type="button"
          onClick={openCalendar}
          disabled={disabled}
          title="ਕੈਲੰਡਰ ਖੋਲ੍ਹੋ (Open Calendar)"
          className="absolute right-1.5 p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-40"
        >
          <CalendarIcon className="w-4 h-4 text-emerald-700" />
        </button>
      </div>

      {error && <p className="text-[11px] text-rose-600 mt-1 font-medium">{error}</p>}
    </div>
  );
};
