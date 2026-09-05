import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Settings,
  MapPin,
  Building2,
  Plus,
  Scale,
  DollarSign,
  Globe,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Edit2,
  Star
} from 'lucide-react';
import { transliterateEnglishToPunjabi } from '../../utils/translations';
import { ProcurementAgency } from '../../types/mandi';

export const SettingsManager: React.FC = () => {
  const {
    pinCodes,
    addVillageToPinCode,
    settings,
    updateSettings,
    agencies,
    addAgency,
    updateAgency,
    deleteAgency
  } = useMandi();
  const { notifySaveSuccess, notifyUpdateSuccess, notifyDeleteSuccess, notifyError } = useNotification();

  const [selectedPin, setSelectedPin] = useState(pinCodes[0]?.pinCode || '141401');
  const [newVillageEn, setNewVillageEn] = useState('');
  const [newVillagePa, setNewVillagePa] = useState('');

  // Agency Form state
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [agencyForm, setAgencyForm] = useState({
    nameEn: '',
    namePa: '',
    code: '',
    isDefault: false
  });

  const [mandiForm, setMandiForm] = useState({
    mandiNameEn: settings.mandiNameEn,
    mandiNamePa: settings.mandiNamePa,
    marketCommitteeEn: settings.marketCommitteeEn,
    marketCommitteePa: settings.marketCommitteePa,
    fixedRatePerQtl: settings.fixedRatePerQtl || 2461,
    defaultPakkiLabourRate: settings.defaultPakkiLabourRate ?? 7,
    defaultPakkaDoubleLabourRate: settings.defaultPakkaDoubleLabourRate ?? 14,
    defaultSukhiLabourRate: settings.defaultSukhiLabourRate ?? 5,
    requireAgencyPurchaseBeforeLefting: settings.requireAgencyPurchaseBeforeLefting !== false
  });

  const activePinObj = pinCodes.find((p) => p.pinCode === selectedPin) || pinCodes[0];

  const handleVillageNameEnChange = (val: string) => {
    setNewVillageEn(val);
    setNewVillagePa(transliterateEnglishToPunjabi(val));
  };

  const handleAddVillage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVillageEn.trim()) {
      notifyError({
        titlePa: 'ਪਿੰਡ ਦਾ ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Village Name Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਪਿੰਡ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    const vEn = newVillageEn.trim();
    const vPa = newVillagePa.trim() || vEn;

    addVillageToPinCode(selectedPin, vEn, vPa);

    notifySaveSuccess({
      titlePa: 'ਨਵਾਂ ਪਿੰਡ ਸਫਲਤਾਪੂਰਵਕ ਸ਼ਾਮਲ ਹੋ ਗਿਆ!',
      titleEn: 'New Village Added Successfully',
      messagePa: `${vPa} (${vEn}) ਪਿੰਨ ਕੋਡ ${selectedPin} ਅਧੀਨ ਸ਼ਾਮਲ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।`,
      details: `PIN: ${selectedPin} • ${activePinObj?.districtPa || activePinObj?.districtEn}`
    });

    setNewVillageEn('');
    setNewVillagePa('');
  };

  const handleAgencyEnChange = (val: string) => {
    setAgencyForm((prev) => ({
      ...prev,
      nameEn: val,
      namePa: transliterateEnglishToPunjabi(val)
    }));
  };

  const handleSaveAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyForm.nameEn.trim()) {
      notifyError({
        titlePa: 'ਏਜੰਸੀ ਦਾ ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Agency Name Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਏਜੰਸੀ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    if (editingAgencyId) {
      updateAgency(editingAgencyId, {
        nameEn: agencyForm.nameEn.trim(),
        namePa: agencyForm.namePa.trim() || agencyForm.nameEn.trim(),
        code: agencyForm.code.trim().toUpperCase() || undefined,
        isDefault: agencyForm.isDefault
      });

      notifyUpdateSuccess({
        titlePa: 'ਏਜੰਸੀ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਈ!',
        titleEn: 'Agency Updated Successfully',
        messagePa: `${agencyForm.namePa || agencyForm.nameEn} ਦੇ ਵੇਰਵੇ ਅੱਪਡੇਟ ਹੋ ਗਏ ਹਨ।`
      });
      setEditingAgencyId(null);
    } else {
      addAgency({
        nameEn: agencyForm.nameEn.trim(),
        namePa: agencyForm.namePa.trim() || agencyForm.nameEn.trim(),
        code: agencyForm.code.trim().toUpperCase() || undefined,
        isDefault: agencyForm.isDefault
      });

      notifySaveSuccess({
        titlePa: 'ਨਵੀਂ ਸਰਕਾਰੀ ਏਜੰਸੀ ਸ਼ਾਮਲ ਹੋ ਗਈ!',
        titleEn: 'New Agency Added',
        messagePa: `${agencyForm.namePa || agencyForm.nameEn} ਖਰੀਦ ਏਜੰਸੀਆਂ ਵਿੱਚ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ।`
      });
    }

    setAgencyForm({
      nameEn: '',
      namePa: '',
      code: '',
      isDefault: false
    });
  };

  const handleStartEditAgency = (ag: ProcurementAgency) => {
    setEditingAgencyId(ag.id);
    setAgencyForm({
      nameEn: ag.nameEn,
      namePa: ag.namePa,
      code: ag.code || '',
      isDefault: !!ag.isDefault
    });
  };

  const handleDeleteAgency = (ag: ProcurementAgency) => {
    if (agencies.length <= 1) {
      notifyError({
        titlePa: 'ਘੱਟੋ-ਘੱਟ ਇੱਕ ਏਜੰਸੀ ਲਾਜ਼ਮੀ ਹੈ',
        titleEn: 'At least one agency required',
        messagePa: 'ਸਿਸਟਮ ਵਿੱਚ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਖਰੀਦ ਏਜੰਸੀ ਹੋਣੀ ਜ਼ਰੂਰੀ ਹੈ।'
      });
      return;
    }

    deleteAgency(ag.id);
    notifyDeleteSuccess({
      titlePa: 'ਏਜੰਸੀ ਹਟਾ ਦਿੱਤੀ ਗਈ',
      titleEn: 'Agency Deleted',
      messagePa: `${ag.namePa} (${ag.nameEn}) ਨੂੰ ਸੂਚੀ ਵਿੱਚੋਂ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(mandiForm);

    notifyUpdateSuccess({
      titlePa: 'ਤਬਦੀਲੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਈਆਂ ਹਨ।',
      titleEn: 'Settings Updated Successfully',
      messagePa: `ਮੰਡੀ ਸੈਟਿੰਗਜ਼ ਅੱਪਡੇਟ ਹੋ ਗਈਆਂ: ${mandiForm.mandiNamePa} (${mandiForm.mandiNameEn})`,
      details: `${mandiForm.marketCommitteePa} (${mandiForm.marketCommitteeEn})`
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-800 text-white rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              ਸੈਟਿੰਗਜ਼ ਤੇ ਖਰੀਦ ਏਜੰਸੀਆਂ ਪ੍ਰਬੰਧਨ (Settings & Agency Database)
            </h2>
            <p className="text-[11px] text-slate-500">
              ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀਆਂ (Markfed, Pungrain, Punsup...), ਮੰਡੀ ਵੇਰਵੇ ਤੇ ਪੰਜਾਬ ਪਿੰਨ ਕੋਡ
            </p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Card: Procurement Agencies Manager */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 lg:col-span-1">
          <h3 className="font-black text-slate-900 text-xs sm:text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀਆਂ (Agencies)</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
              {agencies.length}
            </span>
          </h3>

          {/* Agencies List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {agencies.map((ag) => (
              <div
                key={ag.id}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 truncate">{ag.namePa}</span>
                    {ag.isDefault && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> ਡਿਫਾਲਟ
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {ag.nameEn} {ag.code ? `• [${ag.code}]` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleStartEditAgency(ag)}
                    className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-white rounded transition"
                    title="ਸੋਧੋ (Edit)"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAgency(ag)}
                    className="p-1 text-slate-600 hover:text-rose-600 hover:bg-white rounded transition"
                    title="ਹਟਾਓ (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Agency Form */}
          <form onSubmit={handleSaveAgency} className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
              <span>{editingAgencyId ? 'ਏਜੰਸੀ ਸੋਧੋ (Edit Agency):' : 'ਨਵੀਂ ਏਜੰਸੀ ਸ਼ਾਮਲ ਕਰੋ (Add Agency):'}</span>
              {editingAgencyId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAgencyId(null);
                    setAgencyForm({ nameEn: '', namePa: '', code: '', isDefault: false });
                  }}
                  className="text-[10px] text-rose-600 underline font-bold"
                >
                  ਰੱਦ ਕਰੋ
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold">Agency Name (English)</label>
                <input
                  type="text"
                  placeholder="e.g. Markfed"
                  value={agencyForm.nameEn}
                  onChange={(e) => handleAgencyEnChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-bold focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold">ਏਜੰਸੀ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)</label>
                <input
                  type="text"
                  placeholder="e.g. ਮਾਰਕਫੈੱਡ"
                  value={agencyForm.namePa}
                  onChange={(e) => setAgencyForm({ ...agencyForm, namePa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-900 font-bold focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold">Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. MKF"
                    value={agencyForm.code}
                    onChange={(e) => setAgencyForm({ ...agencyForm, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-mono uppercase focus:bg-white"
                  />
                </div>
                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agencyForm.isDefault}
                      onChange={(e) => setAgencyForm({ ...agencyForm, isDefault: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-0"
                    />
                    <span>ਡਿਫਾਲਟ ਬਣਾਓ</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1 shadow-2xs"
              >
                {editingAgencyId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingAgencyId ? 'ਅੱਪਡੇਟ ਕਰੋ' : 'ਏਜੰਸੀ ਸ਼ਾਮਲ ਕਰੋ'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Center Card: Mandi Rules & Names */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 lg:col-span-1">
          <h3 className="font-black text-slate-900 text-xs sm:text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>ਨਿਰਧਾਰਿਤ ਮੰਡੀ ਨਿਯਮ (Fixed Mandi Rules)</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block">ਨਿਰਧਾਰਿਤ ਬੋਰੀ ਵਜ਼ਨ:</strong>
                <span className="text-[10px] text-slate-500">ਹਰੇਕ ਬੋਰੀ ਦਾ ਫਿਕਸ ਵਜ਼ਨ</span>
              </div>
              <span className="font-mono font-black text-emerald-800 text-xs bg-emerald-100 px-2 py-0.5 rounded">
                37.50 KG
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block">ਸਰਕਾਰੀ MSP ਭਾਅ:</strong>
                <span className="text-[10px] text-slate-500">ਸਰਕਾਰੀ ਖਰੀਦ ਰੇਟ ਪ੍ਰਤੀ ਕੁਇੰਟਲ</span>
              </div>
              <span className="font-mono font-black text-emerald-800 text-xs bg-emerald-100 px-2 py-0.5 rounded">
                ₹2,461 / Qul
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block">ਭਾਸ਼ਾਵਾਂ:</strong>
                <span className="text-[10px] text-slate-500">ਗੁਰਮੁਖੀ ਪੰਜਾਬੀ ਤੇ ਅੰਗਰੇਜ਼ੀ</span>
              </div>
              <span className="font-bold text-slate-900 text-[11px] bg-slate-200 px-2 py-0.5 rounded">
                Gurmukhi + English
              </span>
            </div>
          </div>

          {/* Mandi Name Settings Form */}
          <form onSubmit={handleSaveSettings} className="pt-2 border-t border-slate-100 space-y-2.5">
            <h4 className="font-bold text-xs text-slate-800">ਮੰਡੀ ਵੇਰਵੇ ਤੇ ਡਿਫਾਲਟ ਮਜ਼ਦੂਰੀ ਰੇਟ (Mandi & Rates)</h4>

            <div className="space-y-1.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ਮੰਡੀ ਦਾ ਨਾਂ (English)</label>
                <input
                  type="text"
                  value={mandiForm.mandiNameEn}
                  onChange={(e) => setMandiForm({ ...mandiForm, mandiNameEn: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ਮੰਡੀ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)</label>
                <input
                  type="text"
                  value={mandiForm.mandiNamePa}
                  onChange={(e) => setMandiForm({ ...mandiForm, mandiNamePa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">ਸਰਕਾਰੀ MSP ਰੇਟ (₹/Qtl)</label>
                <input
                  type="number"
                  step="0.01"
                  value={mandiForm.fixedRatePerQtl}
                  onChange={(e) => setMandiForm({ ...mandiForm, fixedRatePerQtl: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Labour Defaults (Per Bag) */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-[11px] text-slate-700">ਡਿਫਾਲਟ ਮਜ਼ਦੂਰੀ ਦਰਾਂ (Labour Rates - ₹ ਪ੍ਰਤੀ ਬੋਰੀ):</h5>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  ਪ੍ਰਤੀ ਬੋਰੀ (Per Bag)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">ਪੱਕੀ (₹7)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mandiForm.defaultPakkiLabourRate}
                    onChange={(e) =>
                      setMandiForm({ ...mandiForm, defaultPakkiLabourRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">ਪੱਖਾ ਡਬਲ (₹14)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mandiForm.defaultPakkaDoubleLabourRate}
                    onChange={(e) =>
                      setMandiForm({ ...mandiForm, defaultPakkaDoubleLabourRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">ਝੋਨਾ ਸਕਾਈ (₹5)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mandiForm.defaultSukhiLabourRate}
                    onChange={(e) =>
                      setMandiForm({ ...mandiForm, defaultSukhiLabourRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Lefting Validation Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition border border-slate-200">
                <input
                  type="checkbox"
                  checked={mandiForm.requireAgencyPurchaseBeforeLefting}
                  onChange={(e) =>
                    setMandiForm({ ...mandiForm, requireAgencyPurchaseBeforeLefting: e.target.checked })
                  }
                  className="mt-0.5 rounded text-emerald-600 focus:ring-0"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">
                    Require Agency Purchase Before Lefting
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    ਲਿਫਟਿੰਗ ਤੋਂ ਪਹਿਲਾਂ ਏਜੰਸੀ ਖਰੀਦ ਲਾਜ਼ਮੀ ਕਰੋ (ਜੇਕਰ ਚਾਲੂ ਹੈ, ਤਾਂ ਬਿਨਾਂ ਖਰੀਦ ਲਿਫਟਿੰਗ ਨਹੀਂ ਹੋਵੇਗੀ)
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1 shadow-2xs"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>ਸੇਵ ਕਰੋ</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: PIN Code -> Village Database */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 lg:col-span-1">
          <h3 className="font-black text-slate-900 text-xs sm:text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>ਪੰਜਾਬ ਪਿੰਨ ਕੋਡ → ਪਿੰਡ ਡਾਟਾਬੇਸ</span>
          </h3>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">ਪਿੰਨ ਕੋਡ ਚੁਣੋ (Select PIN Code):</label>
            <select
              value={selectedPin}
              onChange={(e) => setSelectedPin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-slate-900"
            >
              {pinCodes.map((p) => (
                <option key={p.pinCode} value={p.pinCode}>
                  {p.pinCode} - {p.districtPa} ({p.districtEn})
                </option>
              ))}
            </select>
          </div>

          {/* List of Villages in this PIN */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-slate-600">
              ਇਸ ਪਿੰਨ ਕੋਡ ਅਧੀਨ ਪਿੰਡ ({activePinObj.villages.length}):
            </div>
            <div className="max-h-28 overflow-y-auto bg-slate-50 p-2 rounded-lg border border-slate-200 divide-y divide-slate-200/60 text-xs">
              {activePinObj.villages.map((v, i) => (
                <div key={i} className="py-1 flex justify-between">
                  <span className="font-bold text-slate-800">{v.pa}</span>
                  <span className="text-slate-500 font-mono">{v.en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add custom Village to selected PIN */}
          <form onSubmit={handleAddVillage} className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>ਇਸ ਪਿੰਨ ਕੋਡ ਵਿੱਚ ਨਵਾਂ ਪਿੰਡ ਜੋੜੋ:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Village Name (English)"
                value={newVillageEn}
                onChange={(e) => handleVillageNameEnChange(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-900 focus:bg-white"
                required
              />
              <input
                type="text"
                placeholder="ਪਿੰਡ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)"
                value={newVillagePa}
                onChange={(e) => setNewVillagePa(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-900 focus:bg-white"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ਪਿੰਡ ਜੋੜੋ</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
