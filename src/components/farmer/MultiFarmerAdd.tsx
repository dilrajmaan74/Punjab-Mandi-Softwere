import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Building,
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  Plus,
  RefreshCw
} from 'lucide-react';
import { autoFormatAadhaar, autoFormatMobile } from '../../utils/calculations';
import { transliterateEnglishToPunjabi } from '../../utils/translations';
import { PinVillageSelector } from './PinVillageSelector';

export const MultiFarmerAdd: React.FC = () => {
  const {
    farmers,
    pinCodes,
    generateNextFarmerId,
    getFarmerByAadhaar,
    registerFarmer,
    setSelectedFarmerForBags,
    setActiveSection
  } = useMandi();
  const { notifySaveSuccess, notifyDuplicateWarning, notifyError } = useNotification();
  const [isSaving, setIsSaving] = useState(false);

  // Search / Lookup Aadhaar
  const [searchAadhaar, setSearchAadhaar] = useState('');
  const [foundExistingFarmer, setFoundExistingFarmer] = useState<any | null>(null);
  const [lookupAttempted, setLookupAttempted] = useState(false);

  // New Farmer Entry Form State
  const [newFarmer, setNewFarmer] = useState({
    farmerName: '',
    farmerNamePa: '',
    fatherName: '',
    fatherNamePa: '',
    pinCode: '',
    village: '',
    villagePa: '',
    mobile: '',
    aadhaar: ''
  });

  // Recent session added list
  const [sessionAddedFarmers, setSessionAddedFarmers] = useState<any[]>([]);
  const [sessionToast, setSessionToast] = useState<string | null>(null);

  // Handle Aadhaar Quick Lookup
  const handleAadhaarLookup = (val: string) => {
    const formatted = autoFormatAadhaar(val);
    setSearchAadhaar(formatted);
    setLookupAttempted(true);

    const existing = getFarmerByAadhaar(formatted);
    if (existing) {
      setFoundExistingFarmer(existing);
    } else {
      setFoundExistingFarmer(null);
      // Pre-fill Aadhaar in the new farmer form if 12 digits
      if (formatted.replace(/\s+/g, '').length === 12) {
        setNewFarmer((prev) => ({ ...prev, aadhaar: formatted }));
      }
    }
  };

  const handleNameChange = (val: string) => {
    const pa = transliterateEnglishToPunjabi(val);
    setNewFarmer((prev) => ({
      ...prev,
      farmerName: val,
      farmerNamePa: pa
    }));
  };

  const handleFatherNameChange = (val: string) => {
    const pa = transliterateEnglishToPunjabi(val);
    setNewFarmer((prev) => ({
      ...prev,
      fatherName: val,
      fatherNamePa: pa
    }));
  };

  const handleSaveAndAddNext = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFarmer.farmerName.trim()) {
      notifyError({
        titlePa: 'ਕਿਸਾਨ ਦਾ ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Farmer Name Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।'
      });
      return;
    }
    if (!newFarmer.aadhaar.trim() || newFarmer.aadhaar.replace(/\s+/g, '').length !== 12) {
      notifyError({
        titlePa: 'ਅਵੈਧ ਆਧਾਰ ਨੰਬਰ',
        titleEn: 'Invalid Aadhaar Number',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ 12-ਅੰਕੀ ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    setIsSaving(true);

    const result = registerFarmer({
      farmerName: newFarmer.farmerName.trim(),
      farmerNamePa: newFarmer.farmerNamePa.trim() || newFarmer.farmerName.trim(),
      fatherName: newFarmer.fatherName.trim(),
      fatherNamePa: newFarmer.fatherNamePa.trim() || newFarmer.fatherName.trim(),
      pinCode: newFarmer.pinCode,
      village: newFarmer.village,
      villagePa: newFarmer.villagePa,
      mobile: autoFormatMobile(newFarmer.mobile),
      aadhaar: autoFormatAadhaar(newFarmer.aadhaar)
    });

    if (result.success && result.farmer) {
      setSessionAddedFarmers((prev) => [result.farmer, ...prev]);

      notifySaveSuccess({
        titlePa: 'ਕਿਸਾਨ ਸਫਲਤਾਪੂਰਵਕ ਰਜਿਸਟਰ ਹੋ ਗਿਆ ਹੈ!',
        titleEn: 'Farmer Registered Successfully',
        messagePa: `${result.farmer.farmerNamePa || result.farmer.farmerName} (${result.farmer.villagePa || result.farmer.village}) ਦਰਜ ਹੋ ਗਿਆ।`,
        details: `${result.farmer.id} • Aadhaar: ${result.farmer.aadhaar}`
      });

      // Reset for next farmer instantly
      setNewFarmer({
        farmerName: '',
        farmerNamePa: '',
        fatherName: '',
        fatherNamePa: '',
        pinCode: newFarmer.pinCode, // keep PIN for speed
        village: newFarmer.village,
        villagePa: newFarmer.villagePa,
        mobile: '',
        aadhaar: ''
      });
      setSearchAadhaar('');
      setFoundExistingFarmer(null);
      setLookupAttempted(false);
    } else if (result.existingFarmer) {
      setFoundExistingFarmer(result.existingFarmer);

      notifyDuplicateWarning({
        titlePa: 'ਇਹ ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੈ!',
        titleEn: 'Duplicate Farmer Detected',
        messagePa: `ਆਧਾਰ ਨੰਬਰ ਨਾਲ ਕਿਸਾਨ ID: ${result.existingFarmer.id} ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ।`,
        details: `${result.existingFarmer.id} • ${result.existingFarmer.farmerNamePa || result.existingFarmer.farmerName}`
      });
    }

    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              ਮਲਟੀ ਕਿਸਾਨ ਐਂਟਰੀ (Multi Farmer Add)
            </h2>
            <p className="text-[11px] text-slate-500">
              ਬਿਨਾਂ ਸਕ੍ਰੀਨ ਬਦਲੇ ਲਗਾਤਾਰ ਕਿਸਾਨ ਦਰਜ ਕਰੋ • ਆਧਾਰ ਨੰਬਰ ਨਾਲ ਤੁਰੰਤ ਖੋਜ ਤੇ ਡੁਪਲੀਕੇਟ ਰੋਕ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono">
            <span className="text-slate-500 text-[10px] block">ਕੁੱਲ ਕਿਸਾਨ (Total):</span>
            <strong className="text-slate-900 font-bold">{farmers.length} Registered</strong>
          </div>
        </div>
      </div>

      {sessionToast && (
        <div className="bg-emerald-50 text-emerald-900 font-bold p-2.5 rounded-lg border border-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{sessionToast}</span>
        </div>
      )}

      {/* Aadhaar Fast Search & Duplicate Prevention Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-xs sm:text-sm">
              ਆਧਾਰ ਨੰਬਰ ਨਾਲ ਕਿਸਾਨ ਖੋਜ (Aadhaar Number Fast Lookup)
            </h3>
          </div>
          <span className="text-[11px] text-slate-300">
            ਪਹਿਲਾਂ ਆਧਾਰ ਦਰਜ ਕਰੋ ਤਾਂ ਜੋ ਡੁਪਲੀਕੇਟ ਨਾ ਬਣੇ
          </span>
        </div>

        <div className="flex items-center gap-2 max-w-xl">
          <input
            type="text"
            maxLength={14}
            placeholder="0000 0000 0000"
            value={searchAadhaar}
            onChange={(e) => handleAadhaarLookup(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-black tracking-widest text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          {searchAadhaar && (
            <button
              onClick={() => {
                setSearchAadhaar('');
                setFoundExistingFarmer(null);
                setLookupAttempted(false);
              }}
              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
            >
              ਸਾਫ਼ ਕਰੋ (Clear)
            </button>
          )}
        </div>
      </div>

      {/* If Aadhaar Already Exists: Display Complete Details Box */}
      {foundExistingFarmer && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-black text-amber-900 text-sm">
                  Farmer Already Registered • ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਦਰਜ ਹੈ
                </h3>
                <p className="text-xs text-amber-800">
                  ਇਹ ਆਧਾਰ ਨੰਬਰ ਪਹਿਲਾਂ ਤੋਂ ਰਜਿਸਟਰਡ ਹੈ। ਹੇਠਾਂ ਪੂਰੀ ਜਾਣਕਾਰੀ ਉਪਲਬਧ ਹੈ:
                </p>
              </div>
            </div>
            <span className="bg-amber-200 text-amber-900 font-mono font-black text-xs px-2 py-1 rounded">
              ID: {foundExistingFarmer.id}
            </span>
          </div>

          {/* Full Existing Farmer Information Display */}
          <div className="bg-white rounded-lg border border-amber-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs w-full">
              <div>
                <span className="text-slate-500 text-[10px] block">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name):</span>
                <strong className="text-slate-900 font-bold">
                  {foundExistingFarmer.farmerNamePa} ({foundExistingFarmer.farmerName})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">ਪਿਤਾ ਦਾ ਨਾਂ (Father Name):</span>
                <strong className="text-slate-900">
                  {foundExistingFarmer.fatherNamePa || foundExistingFarmer.fatherName || '—'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">ਪਿੰਡ ਤੇ ਪਿੰਨ (Village & PIN):</span>
                <strong className="text-slate-900">
                  {foundExistingFarmer.villagePa || foundExistingFarmer.village} ({foundExistingFarmer.pinCode})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">ਮੋਬਾਈਲ (Mobile):</span>
                <strong className="font-mono text-slate-900">{foundExistingFarmer.mobile}</strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">ਆਧਾਰ ਨੰਬਰ (Aadhaar):</span>
                <strong className="font-mono text-slate-900">{foundExistingFarmer.aadhaar}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 text-[10px] block">ਬੈਂਕ ਵੇਰਵੇ (Official Bank Name):</span>
                <span className="font-bold text-emerald-900 break-words block">
                  {foundExistingFarmer.bankDetails?.accountNumber
                    ? `${foundExistingFarmer.bankDetails.bankName} (A/C: ${foundExistingFarmer.bankDetails.accountNumber})`
                    : 'ਦਰਜ ਨਹੀਂ (No Bank Info)'}
                </span>
              </div>
            </div>

            {/* Farmer Photo */}
            <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
              {foundExistingFarmer.photoUrl ? (
                <img src={foundExistingFarmer.photoUrl} alt="Farmer" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setSelectedFarmerForBags(foundExistingFarmer);
                setActiveSection('bags-entry');
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
            >
              <span>ਇਸ ਕਿਸਾਨ ਲਈ ਬੋਰੀਆਂ ਦਰਜ ਕਰੋ (Enter Bags)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setFoundExistingFarmer(null);
                setSearchAadhaar('');
              }}
              className="text-xs text-amber-900 underline font-semibold px-2"
            >
              ਨਵਾਂ ਕਿਸਾਨ ਫਾਰਮ ਖੋਲ੍ਹੋ (Enter New Farmer)
            </button>
          </div>
        </div>
      )}

      {/* Multi Farmer Fast Add Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>ਨਵਾਂ ਕਿਸਾਨ ਸ਼ਾਮਲ ਕਰੋ (Add New Farmer)</span>
          </h3>
          <span className="text-[11px] font-mono text-emerald-700 font-bold">
            ਨਵੀਂ ਆਈ.ਡੀ: {generateNextFarmerId()}
          </span>
        </div>

        <form onSubmit={handleSaveAndAddNext} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Farmer Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ਕਿਸਾਨ ਦਾ ਨਾਂ (English) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Jaswant Singh"
                value={newFarmer.farmerName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Farmer Name Pa */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ਕਿਸਾਨ ਨਾਂ (ਪੰਜਾਬੀ ਆਟੋ)
              </label>
              <input
                type="text"
                placeholder="ਜਸਵੰਤ ਸਿੰਘ"
                value={newFarmer.farmerNamePa}
                onChange={(e) => setNewFarmer({ ...newFarmer, farmerNamePa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ਪਿਤਾ ਦਾ ਨਾਂ (Father Name)
              </label>
              <input
                type="text"
                placeholder="e.g. Karnail Singh"
                value={newFarmer.fatherName}
                onChange={(e) => handleFatherNameChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Father Name Pa */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ਪਿਤਾ ਨਾਂ (ਪੰਜਾਬੀ ਆਟੋ)
              </label>
              <input
                type="text"
                placeholder="ਕਰਨੈਲ ਸਿੰਘ"
                value={newFarmer.fatherNamePa}
                onChange={(e) => setNewFarmer({ ...newFarmer, fatherNamePa: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* PIN Code and Village Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <PinVillageSelector
              pinCode={newFarmer.pinCode}
              village={newFarmer.village}
              villagePa={newFarmer.villagePa}
              pinCodesList={pinCodes}
              onPinCodeChange={(pin) => setNewFarmer((prev) => ({ ...prev, pinCode: pin }))}
              onVillageChange={(vEn, vPa) => setNewFarmer((prev) => ({ ...prev, village: vEn, villagePa: vPa }))}
              required
              compact
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Mobile */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ਮੋਬਾਈਲ (Mobile)
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={newFarmer.mobile}
                onChange={(e) => setNewFarmer({ ...newFarmer, mobile: autoFormatMobile(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Aadhaar */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ਆਧਾਰ ਨੰਬਰ (Aadhaar No) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={14}
                placeholder="0000 0000 0000"
                value={newFarmer.aadhaar}
                onChange={(e) => setNewFarmer({ ...newFarmer, aadhaar: autoFormatAadhaar(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold px-5 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ... (Saving Farmer...)</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>ਸੇਵ ਕਰੋ ਤੇ ਅਗਲਾ ਕਿਸਾਨ ਜੋੜੋ (Save & Add Next)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Session Added Farmers List */}
      {sessionAddedFarmers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <h3 className="font-bold text-xs text-slate-800">
            ਇਸ ਸੈਸ਼ਨ ਦੌਰਾਨ ਸ਼ਾਮਲ ਕੀਤੇ ਕਿਸਾਨ ({sessionAddedFarmers.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {sessionAddedFarmers.map((f) => (
              <div key={f.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {f.id}
                  </span>
                  <span className="font-bold text-slate-900">{f.farmerNamePa} ({f.farmerName})</span>
                  <span className="text-slate-500">| ਪਿੰਡ: {f.villagePa || f.village}</span>
                  <span className="font-mono text-slate-500">| ਆਧਾਰ: {f.aadhaar}</span>
                </div>
                <button
                  onClick={() => {
                    setSelectedFarmerForBags(f);
                    setActiveSection('bags-entry');
                  }}
                  className="text-xs bg-slate-900 text-white font-bold px-2.5 py-1 rounded-md hover:bg-slate-800 flex items-center gap-1"
                >
                  <span>ਬੋਰੀਆਂ ਐਂਟਰੀ</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
