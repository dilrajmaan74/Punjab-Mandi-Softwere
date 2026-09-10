import React from 'react';
import { Phone, AlertCircle } from 'lucide-react';

interface MobileInputProps {
  id?: string;
  value: string; // Stored as 10 digits (e.g. "9876543210")
  onChange: (value: string) => void;
  label?: string;
  labelPa?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  error?: string;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  id,
  value,
  onChange,
  label = 'Mobile Number',
  labelPa = 'ਮੋਬਾਈਲ ਨੰਬਰ',
  placeholder = '9876543210',
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  error: customError
}) => {
  // Strip any non-digit chars
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(raw);
  };

  // Determine validation error: exactly 10 digits required if filled
  const isInvalidLength = digits.length > 0 && digits.length < 10;
  const validationError =
    customError ||
    (isInvalidLength
      ? 'ਮੋਬਾਈਲ ਨੰਬਰ ਪੂਰੇ 10 ਅੰਕਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ (Mobile must be exactly 10 digits)'
      : undefined);

  return (
    <div className={`space-y-1 ${className}`}>
      {(label || labelPa) && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-800">
          {labelPa && <span className="text-emerald-950 font-black">{labelPa} </span>}
          {label && <span className="text-slate-500 font-semibold">({label})</span>}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex items-center rounded-lg border border-slate-300 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden transition">
        {/* Fixed +91 Badge */}
        <div className="flex items-center gap-1 bg-slate-100 border-r border-slate-300 px-2.5 py-2 select-none shrink-0">
          <span className="text-base" role="img" aria-label="India flag">
            🇮🇳
          </span>
          <span className="font-mono font-bold text-xs text-slate-800">+91</span>
        </div>

        {/* 10 Digit Numeric Input */}
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          id={id}
          value={digits}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={10}
          disabled={disabled}
          required={required}
          className={`w-full bg-transparent px-3 py-2 text-xs font-mono font-black text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 ${inputClassName}`}
        />

        {/* Counter / Indicator */}
        <div className="pr-2.5 select-none text-[11px] font-mono shrink-0">
          <span
            className={`font-black ${
              digits.length === 10
                ? 'text-emerald-600'
                : digits.length > 0
                ? 'text-amber-600'
                : 'text-slate-400'
            }`}
          >
            {digits.length}/10
          </span>
        </div>
      </div>

      {validationError && (
        <div className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};
