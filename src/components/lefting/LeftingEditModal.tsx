import React, { useState, useEffect, useMemo } from 'react';
import {
  LeftingRecord,
  BardanaType,
  CropType,
  VarietyBreakdownItem,
  TruckMasterRecord
} from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import { DateInput } from '../common/DateInput';
import {
  X,
  Edit,
  Save,
  Truck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Scale,
  Camera,
  Trash2,
  Plus
} from 'lucide-react';
import {
  FIXED_BAG_WEIGHT_KG,
  formatLeftingWeightQtlKg
} from '../../utils/calculations';

const STANDARD_AGENCIES = [
  'Punjab Mandi Board Agency',
  'Pungrain (ਪਨਗ੍ਰੇਨ)',
  'Markfed (ਮਾਰਕਫੈੱਡ)',
  'Punsup (ਪਨਸਪ)',
  'PSWC (ਪੰਜਾਬ ਸਟੇਟ ਵੇਅਰਹਾਊਸਿੰਗ)',
  'FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)'
];

interface LeftingEditModalProps {
  record: LeftingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedRecord: LeftingRecord) => void;
}

export const LeftingEditModal: React.FC<LeftingEditModalProps> = ({
  record,
  isOpen,
  onClose,
  onSuccess
}) => {
  const {
    updateLeftingRecord,
    sellers,
    trucks,
    language
  } = useMandi();

  const isEn = language === 'en';
  const { notifySaveSuccess, notifyError } = useNotification();

  // Form states
  const [date, setDate] = useState<string>('');
  const [gatePassNo, setGatePassNo] = useState<string>('');
  const [cropType, setCropType] = useState<CropType>('PADDY');
  const [variety, setVariety] = useState<string>('PR-126');
  
  // Agency
  const [agency, setAgency] = useState<string>('Pungrain (ਪਨਗ੍ਰੇਨ)');
  const [customAgency, setCustomAgency] = useState<string>('');
  
  // Destination & Sheller
  const [shellerName, setShellerName] = useState<string>('');
  const [sellerAddress, setSellerAddress] = useState<string>('');
  const [sellerMobile, setSellerMobile] = useState<string>('');
  
  // Truck & Driver
  const [truckNo, setTruckNo] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [truckUnion, setTruckUnion] = useState<string>('');
  const [showTruckSuggestions, setShowTruckSuggestions] = useState<boolean>(false);

  // Bags & Bardana
  const [bags, setBags] = useState<string>('');
  const [bardanaType, setBardanaType] = useState<BardanaType>('NEW');
  const [newBagsCount, setNewBagsCount] = useState<string>('');
  const [oldBagsCount, setOldBagsCount] = useState<string>('');
  const [customWeightKg, setCustomWeightKg] = useState<string>('');

  // Status & Shortage
  const [status, setStatus] = useState<'DISPATCHED' | 'DELIVERED' | 'REJECTED_PARTIAL'>('DISPATCHED');
  const [receivingDate, setReceivingDate] = useState<string>('');
  const [rejectedBags, setRejectedBags] = useState<string>('0');
  const [shortageKg, setShortageKg] = useState<string>('0');
  const [remarks, setRemarks] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Populate when record changes
  useEffect(() => {
    if (!record) return;

    setDate(record.date || record.dispatchDate || '');
    setGatePassNo(record.gatePassNo || '');
    setCropType(record.cropType || 'PADDY');
    setVariety(record.variety || 'PR-126');

    // Agency check
    const matchedAgency = STANDARD_AGENCIES.find(
      (ag) => ag.toLowerCase() === (record.agency || record.sellerOrAgency || '').toLowerCase()
    );
    if (matchedAgency) {
      setAgency(matchedAgency);
      setCustomAgency('');
    } else {
      setAgency('CUSTOM');
      setCustomAgency(record.agency || record.sellerOrAgency || '');
    }

    setShellerName(record.sellerName || record.farmerName || '');
    setSellerAddress(record.sellerAddress || record.destination || '');
    setSellerMobile(record.sellerMobile || record.mobile || '');

    setTruckNo(record.truckNo || '');
    setDriverName(record.driverName || '');
    setDriverPhone(record.driverPhone || '');
    setTruckUnion(record.truckUnion || '');

    setBags(String(record.bags || ''));
    setBardanaType(record.bardanaType || 'NEW');
    setNewBagsCount(record.newBags ? String(record.newBags) : '');
    setOldBagsCount(record.oldBags ? String(record.oldBags) : '');
    setCustomWeightKg(record.totalWeightKg ? String(record.totalWeightKg) : String((record.bags || 0) * FIXED_BAG_WEIGHT_KG));

    setStatus(record.status || 'DISPATCHED');
    setReceivingDate(record.receivingDate || '');
    setRejectedBags(String(record.rejectedBags || '0'));
    setShortageKg(String(record.shortageKg || '0'));
    setRemarks(record.remarks || '');
    setPhotos(record.photos || []);
    setFormError('');
  }, [record]);

  // Truck auto-suggestions
  const matchedTrucks = useMemo(() => {
    if (!truckNo.trim()) return [];
    const query = truckNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return trucks.filter((t) => {
      const cleanNo = t.truckNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return cleanNo.includes(query) || cleanNo.endsWith(query) || t.truckNo.toUpperCase().includes(truckNo.trim().toUpperCase());
    }).slice(0, 6);
  }, [trucks, truckNo]);

  // Agency options
  const agencyOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = STANDARD_AGENCIES.map((ag) => ({
      value: ag,
      label: isEn ? (ag || '').split('(')[0]?.trim() || ag : ag,
      subLabel: isEn ? (ag || '').split('(')[1]?.replace(')', '') : undefined,
      keywords: [ag]
    }));
    opts.push({
      value: 'CUSTOM',
      label: isEn ? '+ Other Custom Agency' : '+ ਹੋਰ ਏਜੰਸੀ (Custom)',
      keywords: ['custom', 'other']
    });
    return opts;
  }, [isEn]);

  // Seller options
  const sellerOptions: SearchableSelectOption[] = useMemo(() => {
    return sellers.map((s) => ({
      value: s.id,
      label: isEn ? s.name : `${s.name} ${s.namePa ? `(${s.namePa})` : ''}`,
      subLabel: `${isEn ? 'Location' : 'ਪਤਾ'}: ${s.address || s.city || '-'}`,
      badge: s.licenceNo || undefined,
      keywords: [s.name, s.namePa || '', s.address || '', s.city || '', s.phone || '', s.mobile || '']
    }));
  }, [sellers, isEn]);

  const bardanaTypeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'NEW', label: isEn ? 'New Juths' : 'ਨਵਾਂ ਬਾਰਦਾਨਾ (New Juths)' },
    { value: 'OLD', label: isEn ? 'Old Juths' : 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Juths)' },
    { value: 'BOTH', label: isEn ? 'Both (New + Old Mixed)' : 'ਦੋਵੇਂ (New + Old Mixed)' }
  ], [isEn]);

  const statusOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'DISPATCHED', label: isEn ? 'Dispatched' : 'ਰਵਾਨਾ (Dispatched)' },
    { value: 'DELIVERED', label: isEn ? 'Delivered to Seller' : 'ਸ਼ੈਲਰ ਪਹੁੰਚ ਗਿਆ (Delivered)' },
    { value: 'REJECTED_PARTIAL', label: isEn ? 'Partial Rejected / Shortage' : 'ਅੰਸ਼ਕ ਰੱਦ / ਸ਼ਾਰਟੇਜ (Rejected/Shortage)' }
  ], [isEn]);

  const effectiveAgency = agency === 'CUSTOM' ? customAgency.trim() : agency;

  const handleSellerSelect = (sId: string) => {
    if (!sId) return;
    const sel = sellers.find((s) => s.id === sId);
    if (sel) {
      setShellerName(sel.name);
      setSellerAddress(sel.address || sel.city || '');
      setSellerMobile(sel.phone || sel.mobile || '');
    }
  };

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setPhotos((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setFormError('');

    if (!effectiveAgency) {
      setFormError(isEn ? 'Please specify Procurement Agency.' : 'ਕਿਰਪਾ ਕਰਕੇ ਖਰੀਦ ਏਜੰਸੀ ਨਿਰਧਾਰਿਤ ਕਰੋ।');
      return;
    }

    if (!shellerName.trim()) {
      setFormError(isEn ? 'Please specify Sheller / Destination Name.' : 'ਕਿਰਪਾ ਕਰਕੇ ਸ਼ੈਲਰ / ਮੰਜ਼ਿਲ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।');
      return;
    }

    if (!truckNo.trim()) {
      setFormError(isEn ? 'Please enter Truck Number.' : 'ਕਿਰਪਾ ਕਰਕੇ ਟਰੱਕ ਨੰਬਰ ਦਰਜ ਕਰੋ।');
      return;
    }

    const numBags = parseInt(bags, 10);
    if (isNaN(numBags) || numBags <= 0) {
      setFormError(isEn ? 'Bags count must be greater than 0.' : 'ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।');
      return;
    }

    setIsSaving(true);

    const weightKg = customWeightKg ? parseFloat(customWeightKg) : numBags * FIXED_BAG_WEIGHT_KG;
    const qul = Math.floor(weightKg / 100);
    const kg = Math.round((weightKg - qul * 100) * 100) / 100;

    const numRejected = parseInt(rejectedBags, 10) || 0;
    const numShortage = parseFloat(shortageKg) || 0;

    const updates: Partial<LeftingRecord> = {
      date: date.trim(),
      dispatchDate: date.trim(),
      gatePassNo: gatePassNo.trim() || undefined,
      cropType,
      variety,
      agency: effectiveAgency,
      sellerOrAgency: effectiveAgency,
      sellerName: shellerName.trim(),
      farmerName: shellerName.trim(),
      destination: sellerAddress.trim() ? `${shellerName.trim()}, ${sellerAddress.trim()}` : shellerName.trim(),
      sellerAddress: sellerAddress.trim() || undefined,
      sellerMobile: sellerMobile.trim() || undefined,
      truckNo: truckNo.trim().toUpperCase(),
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim() || undefined,
      truckUnion: truckUnion.trim() || undefined,
      bags: numBags,
      bardanaType,
      newBags: bardanaType === 'NEW' ? numBags : bardanaType === 'BOTH' ? parseInt(newBagsCount, 10) || 0 : 0,
      oldBags: bardanaType === 'OLD' ? numBags : bardanaType === 'BOTH' ? parseInt(oldBagsCount, 10) || 0 : 0,
      qul,
      kg,
      totalWeightKg: weightKg,
      status,
      receivingDate: status === 'DELIVERED' ? receivingDate.trim() : undefined,
      rejectedBags: numRejected,
      shortageKg: numShortage,
      netDeliveredBags: numBags - numRejected,
      netDeliveredKg: weightKg - numShortage,
      remarks: remarks.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined
    };

    const success = updateLeftingRecord(record.id, updates);
    setIsSaving(false);

    if (success) {
      notifySaveSuccess({
        titlePa: 'ਟਰੱਕ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਸੋਧ ਲਈ ਗਈ ਹੈ',
        titleEn: 'Truck Entry Successfully Updated',
        messagePa: `ਟਰੱਕ: ${truckNo.toUpperCase()} • ${numBags} ਬੋਰੀਆਂ • ਸ਼ੈਲਰ: ${shellerName.trim()}`,
        details: `ਗੇਟ ਪਾਸ: ${gatePassNo || record.id}`
      });

      if (onSuccess) {
        onSuccess({ ...record, ...updates });
      }
      onClose();
    } else {
      notifyError({
        titlePa: 'ਸੋਧ ਸੇਵ ਕਰਨ ਵਿੱਚ ਗਲਤੀ',
        titleEn: 'Failed to Save Updates',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਦਰਜ ਕੀਤੇ ਵੇਰਵੇ ਚੈੱਕ ਕਰੋ।'
      });
    }
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shadow-xs">
              <Truck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {isEn ? 'Edit Truck Dispatch Entry' : 'ਟਰੱਕ ਰਵਾਨਗੀ / ਲਿਫਟਿੰਗ ਐਂਟਰੀ ਸੋਧੋ (Edit Truck Entry)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {record.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEn ? 'Full edit access: update truck, bags, weight, destination, delivery status' : 'ਪੂਰੀ ਐਂਟਰੀ ਸੋਧੋ: ਟਰੱਕ ਨੰਬਰ, ਬੋਰੀਆਂ, ਵਜ਼ਨ, ਸ਼ੈਲਰ ਅਤੇ ਡਲਿਵਰੀ ਸਥਿਤੀ ਬਦਲੋ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Date, Gate Pass, Crop, Variety */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Dispatch Date' : 'ਮਿਤੀ (Dispatch Date)'} <span className="text-rose-500">*</span>
              </label>
              <DateInput
                value={date}
                onChange={setDate}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Gate Pass No.' : 'ਗੇਟ ਪਾਸ ਨੰਬਰ (Gate Pass)'}
              </label>
              <input
                type="text"
                value={gatePassNo}
                onChange={(e) => setGatePassNo(e.target.value)}
                placeholder="e.g. GP-2026-0891"
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Crop Type' : 'ਫਸਲ (Crop)'}
              </label>
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value as CropType)}
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                <option value="PADDY">🌾 ਝੋਨਾ (Paddy)</option>
                <option value="WHEAT">🌾 ਕਣਕ (Wheat)</option>
                <option value="MAIZE">🌽 ਮੱਕੀ (Maize)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Paddy Variety' : 'ਕਿਸਮ (Variety)'}
              </label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g. PR-126, PR-131, 1509"
                className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Procurement Agency */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              {isEn ? 'Procurement Agency' : 'ਖਰੀਦ ਏਜੰਸੀ (Procurement Agency)'} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SearchableSelect
                id="edit-lefting-agency"
                value={agency}
                onChange={(val) => setAgency(val)}
                options={agencyOptions}
                placeholder="ਏਜੰਸੀ ਚੁਣੋ..."
              />
              {agency === 'CUSTOM' && (
                <input
                  type="text"
                  value={customAgency}
                  onChange={(e) => setCustomAgency(e.target.value)}
                  placeholder="ਕਸਟਮ ਏਜੰਸੀ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              )}
            </div>
          </div>

          {/* Section 3: Sheller & Destination */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>{isEn ? 'Sheller / Mill Destination Details' : 'ਸੈਲਰ / ਸ਼ੈਲਰ ਮੰਜ਼ਿਲ ਵੇਰਵਾ (Destination)'}</span>
                <span className="text-rose-500">*</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Select Saved Seller' : 'ਸੇਵ ਕੀਤਾ ਸੈਲਰ ਚੁਣੋ'}
                </label>
                <SearchableSelect
                  id="edit-lefting-seller"
                  value=""
                  onChange={(val) => handleSellerSelect(val)}
                  options={sellerOptions}
                  placeholder="ਸੈਲਰ ਲਿਸਟ ਵਿੱਚੋਂ ਚੁਣੋ..."
                  allowClear
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Sheller / Mill Name' : 'ਸ਼ੈਲਰ ਦਾ ਨਾਮ (Sheller Name)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={shellerName}
                  onChange={(e) => setShellerName(e.target.value)}
                  placeholder="e.g. Kang Modern Rice Mill"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Sheller Contact Mobile' : 'ਸ਼ੈਲਰ ਮੋਬਾਈਲ'}
                </label>
                <input
                  type="tel"
                  value={sellerMobile}
                  onChange={(e) => setSellerMobile(e.target.value)}
                  placeholder="e.g. 98765-43210"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Destination Address & Location' : 'ਮੰਜ਼ਿਲ ਦਾ ਪੂਰਾ ਪਤਾ (Full Destination Address)'}
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sellerAddress}
                    onChange={(e) => setSellerAddress(e.target.value)}
                    placeholder="e.g. Mandi Yard Road, Tehsil Area, Punjab"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Vehicle & Driver Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-700" />
              <span>{isEn ? 'Vehicle & Driver Details' : 'ਟਰਾਂਸਪੋਰਟ ਤੇ ਡਰਾਈਵਰ ਵੇਰਵਾ (Vehicle & Driver)'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Truck / Tralla No.' : 'ਟਰੱਕ ਨੰਬਰ (Truck No.)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={truckNo}
                  onFocus={() => setShowTruckSuggestions(true)}
                  onChange={(e) => {
                    setTruckNo(e.target.value.toUpperCase());
                    setShowTruckSuggestions(true);
                  }}
                  placeholder="e.g. PB-10-AZ-1234"
                  className="w-full px-3 py-2 text-xs font-mono font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />

                {showTruckSuggestions && matchedTrucks.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
                    <div className="p-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase flex justify-between items-center">
                      <span>ਮਿਲਦੇ ਟਰੱਕ ({matchedTrucks.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowTruckSuggestions(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                    {matchedTrucks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTruckNo(t.truckNo);
                          if (t.driverName) setDriverName(t.driverName);
                          if (t.driverMobile || t.driverPhone) setDriverPhone(t.driverMobile || t.driverPhone || '');
                          if (t.truckUnion) setTruckUnion(t.truckUnion);
                          setShowTruckSuggestions(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 transition border-b border-slate-50 flex items-center justify-between text-xs"
                      >
                        <span className="font-mono font-black text-slate-900">{t.truckNo}</span>
                        {t.driverName && <span className="text-slate-500 text-[11px]">({t.driverName})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Driver Name' : 'ਡਰਾਈਵਰ ਦਾ ਨਾਮ (Driver Name)'}
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="ਡਰਾਈਵਰ ਦਾ ਨਾਮ"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Driver Mobile' : 'ਡਰਾਈਵਰ ਮੋਬਾਈਲ (Mobile)'}
                </label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="10 digit mobile"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Truck Union' : 'ਟਰੱਕ ਯੂਨੀਅਨ (Truck Union)'}
                </label>
                <input
                  type="text"
                  value={truckUnion}
                  onChange={(e) => setTruckUnion(e.target.value)}
                  placeholder="e.g. Mandi Union"
                  className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Bags, Bardana & Weight */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-700" />
              <span>{isEn ? 'Bags & Weight Breakdown' : 'ਬੋਰੀਆਂ ਅਤੇ ਵਜ਼ਨ ਵੇਰਵਾ (Bags & Weight)'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Total Bags' : 'ਰਵਾਨਾ ਬੋਰੀਆਂ (Bags Count)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={bags}
                  onChange={(e) => {
                    setBags(e.target.value);
                    const b = parseInt(e.target.value, 10);
                    if (!isNaN(b) && b > 0) {
                      setCustomWeightKg(String(b * FIXED_BAG_WEIGHT_KG));
                    }
                  }}
                  placeholder="ਬੋਰੀਆਂ ਗਿਣਤੀ"
                  className="w-full px-3 py-2 text-xs font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Bardana Type' : 'ਬਾਰਦਾਨਾ ਕਿਸਮ (Bardana Type)'}
                </label>
                <SearchableSelect
                  id="edit-lefting-bardana"
                  value={bardanaType}
                  onChange={(val) => setBardanaType(val as BardanaType)}
                  options={bardanaTypeOptions}
                  placeholder="ਕਿਸਮ ਚੁਣੋ..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Total Weight (Kg)' : 'ਕੁੱਲ ਵਜ਼ਨ (Kg)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customWeightKg}
                  onChange={(e) => setCustomWeightKg(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
                <div className="text-[11px] font-mono font-bold text-emerald-800 mt-1">
                  {formatLeftingWeightQtlKg(customWeightKg ? parseFloat(customWeightKg) : (parseInt(bags, 10) || 0) * FIXED_BAG_WEIGHT_KG)}
                </div>
              </div>
            </div>

            {bardanaType === 'BOTH' && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">ਨਵੀਆਂ ਬੋਰੀਆਂ ਗਿਣਤੀ</label>
                  <input
                    type="number"
                    value={newBagsCount}
                    onChange={(e) => setNewBagsCount(e.target.value)}
                    placeholder="ਨਵੀਆਂ ਬੋਰੀਆਂ"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">ਪੁਰਾਣੀਆਂ ਬੋਰੀਆਂ ਗਿਣਤੀ</label>
                  <input
                    type="number"
                    value={oldBagsCount}
                    onChange={(e) => setOldBagsCount(e.target.value)}
                    placeholder="ਪੁਰਾਣੀਆਂ ਬੋਰੀਆਂ"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-xl font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Delivery Status, Receiving Date & Shortage */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800">
              {isEn ? 'Delivery Status & Receiving / Shortage' : 'ਡਲਿਵਰੀ ਸਥਿਤੀ, ਪਹੁੰਚ ਮਿਤੀ ਤੇ ਸ਼ਾਰਟੇਜ'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Status' : 'ਸਥਿਤੀ (Status)'}
                </label>
                <SearchableSelect
                  id="edit-lefting-status"
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                  options={statusOptions}
                  placeholder="ਸਥਿਤੀ ਚੁਣੋ..."
                />
              </div>

              {status === 'DELIVERED' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Receiving Date' : 'ਪਹੁੰਚਣ ਦੀ ਮਿਤੀ (Receiving Date)'}
                  </label>
                  <DateInput
                    value={receivingDate}
                    onChange={setReceivingDate}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Shortage (Kg)' : 'ਸ਼ਾਰਟੇਜ ਕਿਲੋ (Shortage Kg)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={shortageKg}
                  onChange={(e) => setShortageKg(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isEn ? 'Rejected Bags' : 'ਰੱਦ ਬੋਰੀਆਂ (Rejected Bags)'}
                </label>
                <input
                  type="number"
                  value={rejectedBags}
                  onChange={(e) => setRejectedBags(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isEn ? 'Remarks / Notes' : 'ਟਿੱਪਣੀ / ਵੇਰਵਾ (Remarks)'}
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="ਡਲਿਵਰੀ ਰਸੀਦ ਜਾਂ ਸ਼ਾਰਟੇਜ ਵੇਰਵਾ"
                className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 7: Bilti Photos */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                {isEn ? 'Bilti Receipts & Photos' : 'ਬਿਲਟੀ / ਰਸੀਦ ਫੋਟੋਆਂ (Bilti Photos)'}
              </label>
              <label className="cursor-pointer px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 transition">
                <Camera className="w-3.5 h-3.5" />
                <span>{isEn ? 'Add Photo' : '+ ਫੋਟੋ ਸ਼ਾਮਲ ਕਰੋ'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotosUpload}
                  className="hidden"
                />
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                    <img src={p} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full opacity-80 hover:opacity-100 transition shadow-sm"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            {isEn ? 'Cancel' : 'ਰੱਦ ਕਰੋ (Cancel)'}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? (isEn ? 'Saving...' : 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ...') : (isEn ? 'Save Full Updates' : 'ਪੂਰੀ ਐਂਟਰੀ ਸੋਧ ਸੇਵ ਕਰੋ (Save)')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
