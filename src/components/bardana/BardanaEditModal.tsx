import React, { useState, useEffect, useMemo } from 'react';
import { BardanaReceivedRecord, BardanaSourceType, BardanaType } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import { ParchiUploadWidget } from './ParchiUploadWidget';
import { ParchiViewerModal } from './ParchiViewerModal';
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
  const { updateBardanaRecord, sellers, farmers, language } = useMandi();
  const isEn = language === 'en';
  const { notifyUpdateSuccess, notifyError } = useNotification();

  const [date, setDate] = useState('');
  const [agency, setAgency] = useState('');
  const [customAgency, setCustomAgency] = useState('');
  const [receivedFrom, setReceivedFrom] = useState<BardanaSourceType>('SELLER');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [sourceName, setSourceName] = useState('');
  const [newBags, setNewBags] = useState<number | string>(0);
  const [oldBags, setOldBags] = useState<number | string>(0);
  const [parchiUrl, setParchiUrl] = useState<string>('');
  const [parchiName, setParchiName] = useState<string>('');
  const [isParchiViewerOpen, setIsParchiViewerOpen] = useState<boolean>(false);
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const numNew = Math.max(0, Number(newBags) || 0);
  const numOld = Math.max(0, Number(oldBags) || 0);
  const totalBags = numNew + numOld;

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

  const sellerAndFarmerOptions: SearchableSelectOption[] = useMemo(() => {
    const list: SearchableSelectOption[] = [];

    // Existing sellers from Seller Master
    sellers.forEach((s) => {
      const name = s.firmName || s.name || '';
      const namePa = s.namePa ? ` (${s.namePa})` : '';
      list.push({
        value: s.id,
        label: `${name}${namePa}`,
        subLabel: `${isEn ? 'Code/City' : 'ਕੋਡ/ਸ਼ਹਿਰ'}: ${s.code || s.city || '-'} • ${s.mobile || s.phone || ''}`,
        badge: s.sellerType === 'COMMISSION_AGENT' ? (isEn ? 'Agent' : 'ਆੜ੍ਹਤੀਆ') : (isEn ? 'Seller' : 'ਸੈਲਰ'),
        badgeColor: 'bg-blue-100 text-blue-800',
        keywords: [name, s.name || '', s.firmName || '', s.namePa || '', s.code || '', s.city || '', s.phone || '', s.mobile || '']
      });
    });

    // Farmers from Farmer Master
    farmers.forEach((f) => {
      const fName = `${f.farmerName} ${f.fatherName ? `s/o ${f.fatherName}` : ''}`.trim();
      list.push({
        value: `FARMER_${f.id}`,
        label: `${fName} (${f.village || ''})`,
        subLabel: `${isEn ? 'Farmer ID' : 'ਕਿਸਾਨ ਆਈਡੀ'}: ${f.id} • ${f.mobile || ''}`,
        badge: isEn ? 'Farmer' : 'ਕਿਸਾਨ',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        keywords: [f.farmerName, f.fatherName || '', f.village || '', f.mobile || '', f.id]
      });
    });

    return list;
  }, [sellers, farmers, isEn]);

  useEffect(() => {
    if (record) {
      setDate(record.date);
      setAgency(record.agency);
      setReceivedFrom(record.receivedFrom);
      setSelectedSellerId(record.sellerId || '');
      setSourceName(record.sourceName);

      // Reopen New Juth and Old Juth properly
      const initialNew = record.newBags !== undefined
        ? record.newBags
        : (record.bardanaType === 'NEW' ? record.bags : 0);
      const initialOld = record.oldBags !== undefined
        ? record.oldBags
        : (record.bardanaType === 'OLD' ? record.bags : 0);

      setNewBags(initialNew);
      setOldBags(initialOld);
      setRemarks(record.remarks || '');
      setErrorMsg('');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSelectSeller = (sid: string) => {
    setSelectedSellerId(sid);
    if (!sid) {
      setSourceName('');
      return;
    }
    const matchSeller = sellers.find((s) => s.id === sid);
    if (matchSeller) {
      setSourceName(matchSeller.firmName || matchSeller.name || '');
      return;
    }
    if (sid.startsWith('FARMER_')) {
      const fId = sid.replace('FARMER_', '');
      const matchFarmer = farmers.find((f) => f.id === fId);
      if (matchFarmer) {
        setSourceName(matchFarmer.farmerName);
        return;
      }
    }
    const matchFarmerDirect = farmers.find((f) => f.id === sid);
    if (matchFarmerDirect) {
      setSourceName(matchFarmerDirect.farmerName);
      return;
    }
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
          ? 'ਕਿਰਪਾ ਕਰਕੇ ਸੈਲਰ ਦਾ ਨਾਂ ਚੁਣੋ ਜਾਂ ਦਰਜ ਕਰੋ (Please select or enter Seller Name).'
          : 'ਕਿਰਪਾ ਕਰਕੇ ਏਜੰਸੀ / ਸਰੋਤ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ (Please enter Agency Source Name).'
      );
      return;
    }

    if (Number(newBags) < 0 || Number(oldBags) < 0) {
      setErrorMsg('ਨਵੀਂ ਅਤੇ ਪੁਰਾਣੀ ਜੂਥ ਦੀ ਮਾਤਰਾ ਰਿਣਆਤਮਕ ਨਹੀਂ ਹੋ ਸਕਦੀ (Bags cannot be negative).');
      return;
    }

    if (totalBags <= 0) {
      setErrorMsg('ਕੁੱਲ ਬੋਰੀਆਂ 0 ਤੋਂ ਵੱਧ ਹੋਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ (Total Bags must be > 0. Enter New or Old Juth bags).');
      return;
    }

    const calculatedType: BardanaType = (numNew > 0 && numOld > 0) ? 'BOTH' : (numOld > 0 ? 'OLD' : 'NEW');
    const newBoxes = Math.floor(numNew / 500);
    const newLoose = numNew % 500;
    const oldBoxes = Math.floor(numOld / 50);
    const oldLoose = numOld % 50;

    const success = updateBardanaRecord(record.id, {
      date: date.trim(),
      agency: finalAgency,
      receivedFrom,
      sellerId: selectedSellerId || undefined,
      sourceName: sourceName.trim(),
      bardanaType: calculatedType,
      newBags: numNew,
      oldBags: numOld,
      newBoxCount: newBoxes,
      newLooseBags: newLoose,
      oldBoxCount: oldBoxes,
      oldLooseBags: oldLoose,
      boxes: newBoxes + oldBoxes,
      bags: totalBags,
      totalBags,
      remarks: remarks.trim() || undefined
    });

    if (success) {
      notifyUpdateSuccess({
        titlePa: 'ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਈ ਹੈ।',
        titleEn: 'Bardana Entry Updated Successfully',
        messagePa: `ਵਾਊਚਰ ${record.id} (${finalAgency} - ${sourceName.trim()}, ਕੁੱਲ ${totalBags} ਬੋਰੀਆਂ) ਦੀਆਂ ਤਬਦੀਲੀਆਂ ਸੇਵ ਹੋ ਗਈਆਂ।`,
        details: `${record.id} • New Juth: ${numNew} • Old Juth: ${numOld} • Total: ${totalBags} Bags`
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
                ਸਾਰੇ ਵੇਰਵੇ ਸੋਧੇ ਜਾ ਸਕਦੇ ਹਨ • ਨਵੀਂ ਤੇ ਪੁਰਾਣੀ ਜੂਥ ਵੱਖ-ਵੱਖ ਸੰਭਾਲੀ ਜਾਵੇਗੀ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            title="ਬੰਦ ਕਰੋ (Close)"
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

          {/* Section 3: Source / Seller Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {receivedFrom === 'SELLER' ? 'ਸੈਲਰ ਦਾ ਨਾਂ (Seller Name)' : 'ਏਜੰਸੀ / ਸਰੋਤ ਦਾ ਨਾਂ (Agency Source Name)'}{' '}
              <span className="text-rose-500">*</span>
            </label>

            {receivedFrom === 'SELLER' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <SearchableSelect
                    id="edit-bardana-seller-select"
                    value={selectedSellerId}
                    onChange={handleSelectSeller}
                    options={sellerAndFarmerOptions}
                    placeholder={isEn ? "Search saved seller / farmer..." : "ਸੈਲਰ ਜਾਂ ਕਿਸਾਨ ਖੋਜੋ ਤੇ ਚੁਣੋ..."}
                    searchPlaceholder={isEn ? "Type name, firm, mobile..." : "ਨਾਂ, ਫਰਮ, ਮੋਬਾਈਲ ਲਿਖੋ..."}
                    allowClear
                  />

                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder={isEn ? "Or enter seller name directly..." : "ਜਾਂ ਸੈਲਰ ਦਾ ਨਾਂ ਸਿੱਧਾ ਲਿਖੋ..."}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {sourceName && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-slate-600 font-medium">ਸੈਲਰ:</span>
                      <strong className="text-blue-950 font-bold">{sourceName}</strong>
                      {selectedSellerId && (
                        <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.2 rounded font-mono font-bold">
                          ID: {selectedSellerId}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSellerId('');
                        setSourceName('');
                      }}
                      className="text-[11px] text-blue-700 hover:text-rose-600 font-bold underline"
                    >
                      ਸਾਫ਼ ਕਰੋ (Clear)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="ਜਿਵੇਂ Punjab Mandi Board Agency, FCI Store..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            )}
          </div>

          {/* Section 4: Separate New Juth and Old Juth Quantity Inputs */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <label className="block text-xs font-bold text-slate-700">
                ਬਾਰਦਾਨਾ ਮਾਤਰਾ (Separate New Juth & Old Juth Quantities) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                ਦੋਵੇਂ ਸੋਧਣਯੋਗ (Editable)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              {/* 1. New Juth */}
              <div className="bg-white border-2 border-emerald-500/40 rounded-xl p-3 shadow-2xs space-y-1.5 focus-within:border-emerald-600 transition">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-emerald-950">
                    New Juth / ਨਵੀਂ ਜੂਥ
                  </label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    ਨਵੀਂ
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="edit-new-juth-bags"
                    type="number"
                    min="0"
                    step="1"
                    value={newBags}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewBags('');
                        return;
                      }
                      setNewBags(Math.max(0, parseInt(val, 10) || 0));
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-black text-emerald-950 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                    Bags
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>{Math.floor(numNew / 500)} ਬਕਸੇ</span>
                  <span>{numNew % 500} ਖੁੱਲ੍ਹੇ</span>
                </div>
              </div>

              {/* 2. Old Juth */}
              <div className="bg-white border-2 border-amber-500/40 rounded-xl p-3 shadow-2xs space-y-1.5 focus-within:border-amber-600 transition">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-amber-950">
                    Old Juth / ਪੁਰਾਣੀ ਜੂਥ
                  </label>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                    ਪੁਰਾਣੀ
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="edit-old-juth-bags"
                    type="number"
                    min="0"
                    step="1"
                    value={oldBags}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setOldBags('');
                        return;
                      }
                      setOldBags(Math.max(0, parseInt(val, 10) || 0));
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-black text-amber-950 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                    Bags
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>{Math.floor(numOld / 50)} ਬਕਸੇ</span>
                  <span>{numOld % 50} ਖੁੱਲ੍ਹੇ</span>
                </div>
              </div>

              {/* 3. Total Bags */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-3 shadow-md space-y-1.5 border border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-white">
                    Total Bags / ਕੁੱਲ ਬੋਰੀਆਂ
                  </label>
                  <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.5 rounded">
                    Auto Sum
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="edit-total-bags"
                    type="text"
                    readOnly
                    value={`${totalBags.toLocaleString('en-IN')} Bags`}
                    className="w-full bg-slate-950/70 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono font-black text-emerald-300 cursor-not-allowed focus:outline-hidden"
                  />
                </div>
                <div className="text-[10px] text-slate-300 pt-0.5 truncate">
                  {numNew} + {numOld} = <strong>{totalBags} Bags</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ਟਿੱਪਣੀਆਂ / ਨੋਟਿਸ (Remarks)
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="ਕੋਈ ਵਾਧੂ ਵੇਰਵਾ ਜਾਂ ਹਵਾਲਾ..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              ਰੱਦ ਕਰੋ (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
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
