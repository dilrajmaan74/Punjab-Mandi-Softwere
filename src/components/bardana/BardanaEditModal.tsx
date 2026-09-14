import React, { useState, useEffect, useMemo } from 'react';
import { BardanaReceivedRecord, BardanaSourceType, BardanaType } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  Edit,
  X,
  Building2,
  Calendar,
  Layers,
  FileText,
  Save,
  AlertTriangle,
  Boxes,
  Tag
} from 'lucide-react';

const STANDARD_AGENCIES = [
  'Punjab Mandi Board Agency',
  'Pungrain (ਪਨਗ੍ਰੇਨ)',
  'Markfed (ਮਾਰਕਫੈੱਡ)',
  'Punsup (ਪਨਸਪ)',
  'PSWC (ਪੰਜਾਬ ਸਟੇਟ ਵੇਅਰਹਾਊਸਿੰਗ)',
  'FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)'
];

interface BardanaEditModalProps {
  record: BardanaReceivedRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BardanaEditModal: React.FC<BardanaEditModalProps> = ({
  record,
  isOpen,
  onClose
}) => {
  const { updateBardanaRecord, language } = useMandi();
  const isEn = language === 'en';
  const { notifyUpdateSuccess, notifyError } = useNotification();

  const [date, setDate] = useState('');
  const [agency, setAgency] = useState('');
  const [customAgency, setCustomAgency] = useState('');
  const [receivedFrom, setReceivedFrom] = useState<BardanaSourceType>('SELLER');
  const [sourceName, setSourceName] = useState('');
  const [bardanaType, setBardanaType] = useState<BardanaType>('NEW');
  const [boxes, setBoxes] = useState<number>(1);
  const [bags, setBags] = useState<number>(500);
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const agencyOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = STANDARD_AGENCIES.map((ag) => ({
      value: ag,
      label: isEn ? ag.split('(')[0].trim() : ag,
      subLabel: isEn ? ag.split('(')[1]?.replace(')', '') : undefined,
      keywords: [ag]
    }));
    opts.push({
      value: 'CUSTOM',
      label: isEn ? '+ Other Custom Agency...' : '+ ਹੋਰ ਕਸਟਮ ਏਜੰਸੀ (Other Custom Agency)...',
      keywords: ['custom', 'other']
    });
    return opts;
  }, [isEn]);

  useEffect(() => {
    if (record) {
      setDate(record.date);
      setAgency(record.agency);
      setReceivedFrom(record.receivedFrom);
      setSourceName(record.sourceName);
      setBardanaType(record.bardanaType);
      setBoxes(record.boxes);
      setBags(record.bags);
      setRemarks(record.remarks || '');
      setErrorMsg('');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  // Handle Box or Type change to update Bags count
  const handleBoxesChange = (val: number) => {
    const numBoxes = Math.max(0, val);
    setBoxes(numBoxes);
    const capacity = bardanaType === 'NEW' ? 500 : 50;
    setBags(numBoxes * capacity);
  };

  const handleTypeChange = (newType: BardanaType) => {
    setBardanaType(newType);
    const capacity = newType === 'NEW' ? 500 : 50;
    setBags(boxes * capacity);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalAgency = agency === 'CUSTOM' ? customAgency.trim() : agency.trim();

    if (!finalAgency) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਏਜੰਸੀ ਦੀ ਚੋਣ ਕਰੋ (Please specify Agency).');
      return;
    }

    if (!sourceName.trim()) {
      setErrorMsg(
        receivedFrom === 'SELLER'
          ? 'ਕਿਰਪਾ ਕਰਕੇ ਸੈਲਰ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ (Please enter Seller Name).'
          : 'ਕਿਰਪਾ ਕਰਕੇ ਏਜੰਸੀ / ਸਰੋਤ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ (Please enter Agency Source Name).'
      );
      return;
    }

    if (boxes <= 0 || bags <= 0) {
      setErrorMsg('ਬਕਸਿਆਂ ਤੇ ਬੋਰਿਆਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (Boxes & Bags must be > 0).');
      return;
    }

    const success = updateBardanaRecord(record.id, {
      date,
      agency: finalAgency,
      receivedFrom,
      sourceName: sourceName.trim(),
      bardanaType,
      boxes,
      bags,
      remarks: remarks.trim() || undefined
    });

    if (success) {
      notifyUpdateSuccess({
        titlePa: 'ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਈ ਹੈ।',
        titleEn: 'Bardana Entry Updated Successfully',
        messagePa: `ਵਾਊਚਰ ${record.id} (${finalAgency} - ${sourceName}, ${bags} ਬੋਰੇ) ਦੀਆਂ ਤਬਦੀਲੀਆਂ ਸੇਵ ਹੋ ਗਈਆਂ।`,
        details: `${record.id} • ${bardanaType === 'NEW' ? 'New Juth' : 'Old Juth'}: ${bags} Bags`
      });
      onClose();
    } else {
      notifyError({
        titlePa: 'ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਗਲਤੀ ਆਈ',
        titleEn: 'Failed to update record'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-2xs">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਸੋਧੋ (Edit Bardana Receiving)
                </h3>
                <span className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded shadow-2xs">
                  {record.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ਸਾਰੇ ਵੇਰਵੇ ਸੋਧੇ ਜਾ ਸਕਦੇ ਹਨ • ਸਟਾਕ ਆਟੋ-ਰੀਕੈਲਕੂਲੇਟ ਹੋਵੇਗਾ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Fixed Agency Section */}
          <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5 space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
              {isEn ? 'AGENCY (FIXED ALLOCATION)' : 'AGENCY / ਏਜੰਸੀ (FIXED ALLOCATION)'} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SearchableSelect
                id="edit-bardana-agency"
                value={STANDARD_AGENCIES.includes(agency) ? agency : (agency ? 'CUSTOM' : '')}
                onChange={(val) => {
                  if (val === 'CUSTOM') {
                    setAgency('CUSTOM');
                  } else {
                    setAgency(val);
                  }
                }}
                options={agencyOptions}
                placeholder={isEn ? "Select agency..." : "ਏਜੰਸੀ ਚੁਣੋ..."}
                searchPlaceholder={isEn ? "Search agency..." : "ਏਜੰਸੀ ਖੋਜੋ..."}
              />

              {agency === 'CUSTOM' && (
                <input
                  type="text"
                  placeholder={isEn ? "Enter custom agency name" : "ਕਸਟਮ ਏਜੰਸੀ ਦਾ ਨਾਂ ਲਿਖੋ"}
                  value={customAgency}
                  onChange={(e) => setCustomAgency(e.target.value)}
                  className="w-full bg-white border border-emerald-400 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              )}
            </div>
          </div>

          {/* Section 2: Date & Bardana Received From Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ਮਿਤੀ (Date) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Bardana Received From (Seller vs Agency) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ਬਾਰਦਾਨਾ ਕਿੱਥੋਂ ਪ੍ਰਾਪਤ ਕੀਤਾ (Bardana Received From) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReceivedFrom('SELLER')}
                  className={`py-2 px-3 rounded-lg text-xs font-black border transition flex items-center justify-center gap-1.5 ${
                    receivedFrom === 'SELLER'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Seller (ਸੈਲਰ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceivedFrom('AGENCY')}
                  className={`py-2 px-3 rounded-lg text-xs font-black border transition flex items-center justify-center gap-1.5 ${
                    receivedFrom === 'AGENCY'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Agency (ਏਜੰਸੀ)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Source Name Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {receivedFrom === 'SELLER' ? 'ਸੈਲਰ ਦਾ ਨਾਂ (Seller Name)' : 'ਏਜੰਸੀ / ਸਰੋਤ ਦਾ ਨਾਂ (Agency Source Name)'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder={receivedFrom === 'SELLER' ? 'ਜਿਵੇਂ ABC Seller' : 'ਜਿਵੇਂ Punjab Mandi Board Agency'}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Section 4: Bardana Type & Quantities */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              ਬਾਰਦਾਨਾ ਕਿਸਮ (Bardana Type) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('NEW')}
                className={`p-3 rounded-xl border text-left transition ${
                  bardanaType === 'NEW'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-black text-xs">ਨਵਾਂ ਬੋਰਾ (New Juth)</div>
                <div className={`text-[10px] mt-0.5 ${bardanaType === 'NEW' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  1 Box = 500 Bags
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('OLD')}
                className={`p-3 rounded-xl border text-left transition ${
                  bardanaType === 'OLD'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-black text-xs">ਪੁਰਾਣਾ ਬੋਰਾ (Old Juth)</div>
                <div className={`text-[10px] mt-0.5 ${bardanaType === 'OLD' ? 'text-amber-100' : 'text-slate-500'}`}>
                  1 Box = 50 Bags
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਬਕਸਿਆਂ ਦੀ ਗਿਣਤੀ (Number of Boxes) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={boxes || ''}
                  onChange={(e) => handleBoxesChange(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਕੁੱਲ ਬੋਰਿਆਂ ਦੀ ਗਿਣਤੀ (Total Bags) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={bags || ''}
                  onChange={(e) => setBags(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-emerald-400 rounded-lg px-3 py-2 text-xs font-mono font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ਆਟੋ-ਹਿਸਾਬ: {boxes} ਬਕਸੇ × {bardanaType === 'NEW' ? '500' : '50'} = {boxes * (bardanaType === 'NEW' ? 500 : 50)} ਬੋਰੇ
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ਟਿੱਪਣੀਆਂ (Remarks / Notes)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="ਜਿਵੇਂ ਟਰੱਕ ਨੰਬਰ, ਗੇਟ ਪਾਸ, ਚਲਾਨ ਆਦਿ..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Save Button */}
          <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition"
            >
              ਰੱਦ ਕਰੋ (Cancel)
            </button>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>ਤਬਦੀਲੀਆਂ ਸੇਵ ਕਰੋ (Save Changes)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
