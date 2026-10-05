import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { MandiFirm } from '../../types/mandi';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  Calendar,
  X,
  Phone,
  MapPin,
  ShieldCheck,
  Award,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Key
} from 'lucide-react';

interface FirmManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirmManagerModal: React.FC<FirmManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    firms,
    activeFirmId,
    setActiveFirmId,
    addFirm,
    updateFirm,
    deleteFirm,
    fiscalYears,
    activeFiscalYear,
    setActiveFiscalYear,
    addFiscalYear
  } = useMandi();

  const { notifySaveSuccess, notifyDeleteSuccess, notifyError } = useNotification();

  const [activeTab, setActiveTab] = useState<'firms' | 'years'>('firms');

  // Firm Form State
  const [isEditingFirm, setIsEditingFirm] = useState<boolean>(false);
  const [editingFirmId, setEditingFirmId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [namePa, setNamePa] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [addressPa, setAddressPa] = useState<string>('');
  const [marketCommittee, setMarketCommittee] = useState<string>('Lohian Khas');
  const [marketCommitteePa, setMarketCommitteePa] = useState<string>('ਲੋਹੀਆਂ ਖਾਸ');
  const [mobile, setMobile] = useState<string>('');
  const [licenceNo, setLicenceNo] = useState<string>('');
  const [pan, setPan] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [bankAccountNo, setBankAccountNo] = useState<string>('');
  const [bankIfsc, setBankIfsc] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showFirmPassword, setShowFirmPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Year Form State
  const [newYearInput, setNewYearInput] = useState<string>('');
  const [yearError, setYearError] = useState<string>('');

  if (!isOpen) return null;

  const resetFirmForm = () => {
    setName('');
    setNamePa('');
    setAddress('');
    setAddressPa('');
    setMarketCommittee('Lohian Khas');
    setMarketCommitteePa('ਲੋਹੀਆਂ ਖਾਸ');
    setMobile('');
    setLicenceNo('');
    setPan('');
    setGstin('');
    setBankName('');
    setBankAccountNo('');
    setBankIfsc('');
    setUsername('');
    setPassword('');
    setPin('');
    setShowFirmPassword(false);
    setFormError('');
    setIsEditingFirm(false);
    setEditingFirmId(null);
  };

  const startEditFirm = (firm: MandiFirm) => {
    setIsEditingFirm(true);
    setEditingFirmId(firm.id);
    setName(firm.name);
    setNamePa(firm.namePa || '');
    setAddress(firm.address);
    setAddressPa(firm.addressPa || '');
    setMarketCommittee(firm.marketCommittee);
    setMarketCommitteePa(firm.marketCommitteePa || '');
    setMobile(firm.mobile);
    setLicenceNo(firm.licenceNo);
    setPan(firm.pan || '');
    setGstin(firm.gstin || '');
    setBankName(firm.bankName || '');
    setBankAccountNo(firm.bankAccountNo || '');
    setBankIfsc(firm.bankIfsc || '');
    setUsername(firm.username || '');
    setPassword(firm.password || '');
    setPin(firm.pin || '');
    setShowFirmPassword(false);
  };

  const handleSaveFirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('ਫਰਮ ਦਾ ਨਾਂ ਜ਼ਰੂਰੀ ਹੈ (Firm name is required)');
      return;
    }

    if (!address.trim()) {
      setFormError('ਪੂਰਾ ਪਤਾ ਜ਼ਰੂਰੀ ਹੈ (Address is required)');
      return;
    }

    if (!marketCommittee.trim()) {
      setFormError('ਮਾਰਕੀਟ ਕਮੇਟੀ ਜ਼ਰੂਰੀ ਹੈ (Market Committee is required)');
      return;
    }

    try {
      if (isEditingFirm && editingFirmId) {
        updateFirm(editingFirmId, {
          name: name.trim(),
          namePa: namePa.trim() || undefined,
          address: address.trim(),
          addressPa: addressPa.trim() || undefined,
          marketCommittee: marketCommittee.trim(),
          marketCommitteePa: marketCommitteePa.trim() || undefined,
          mobile: mobile.trim(),
          licenceNo: licenceNo.trim(),
          pan: pan.trim() || undefined,
          gstin: gstin.trim() || undefined,
          bankName: bankName.trim() || undefined,
          bankAccountNo: bankAccountNo.trim() || undefined,
          bankIfsc: bankIfsc.trim() || undefined,
          username: username.trim() || undefined,
          password: password.trim() || undefined,
          pin: pin.trim() || undefined
        });

        notifySaveSuccess({
          titlePa: 'ਫਰਮ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਈ',
          titleEn: 'Firm Details Updated',
          messagePa: `${name.trim()} ਦੇ ਵੇਰਵੇ ਅਪਡੇਟ ਕਰ ਦਿੱਤੇ ਗਏ ਹਨ।`
        });
      } else {
        const newFirm = addFirm({
          name: name.trim(),
          namePa: namePa.trim() || undefined,
          address: address.trim(),
          addressPa: addressPa.trim() || undefined,
          marketCommittee: marketCommittee.trim(),
          marketCommitteePa: marketCommitteePa.trim() || undefined,
          mobile: mobile.trim(),
          licenceNo: licenceNo.trim(),
          pan: pan.trim() || undefined,
          gstin: gstin.trim() || undefined,
          bankName: bankName.trim() || undefined,
          bankAccountNo: bankAccountNo.trim() || undefined,
          bankIfsc: bankIfsc.trim() || undefined,
          username: username.trim() || undefined,
          password: password.trim() || undefined,
          pin: pin.trim() || undefined
        });

        setActiveFirmId(newFirm.id);

        notifySaveSuccess({
          titlePa: 'ਨਵੀਂ ਫਰਮ ਸ਼ਾਮਲ ਹੋ ਗਈ',
          titleEn: 'New Firm Added',
          messagePa: `${name.trim()} ਫਰਮ ਸ਼ਾਮਲ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ ਅਤੇ ਸਰਗਰਮ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ।`
        });
      }

      resetFirmForm();
    } catch {
      notifyError({
        titlePa: 'ਗਲਤੀ ਆਈ',
        titleEn: 'Operation Failed'
      });
    }
  };

  const handleDeleteFirm = (id: string, firmName: string) => {
    if (window.confirm(`ਕੀ ਤੁਸੀਂ ਸੱਚਮੁੱਚ ਫਰਮ "${firmName}" ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
      const res = deleteFirm(id);
      if (!res.success) {
        notifyError({
          titlePa: 'ਫਰਮ ਨਹੀਂ ਹਟਾਈ ਜਾ ਸਕਦੀ',
          titleEn: 'Cannot Delete Firm',
          messagePa: res.message
        });
        return;
      }
      notifyDeleteSuccess({
        titlePa: 'ਫਰਮ ਹਟਾ ਦਿੱਤੀ ਗਈ',
        titleEn: 'Firm Deleted',
        messagePa: `${firmName} ਨੂੰ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
      });
    }
  };

  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    setYearError('');
    const clean = newYearInput.trim();

    if (!clean) {
      setYearError('ਸਾਲ ਦਰਜ ਕਰੋ (Enter Fiscal Year, e.g. 2026-27)');
      return;
    }

    if (fiscalYears.includes(clean)) {
      setYearError('ਇਹ ਵਿੱਤੀ ਸਾਲ ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ (Fiscal Year already exists)');
      return;
    }

    addFiscalYear(clean);
    setActiveFiscalYear(clean);
    setNewYearInput('');
    notifySaveSuccess({
      titlePa: 'ਵਿੱਤੀ ਸਾਲ ਸ਼ਾਮਲ ਹੋ ਗਿਆ',
      titleEn: 'Fiscal Year Added',
      messagePa: `${clean} ਸਾਲ ਸਫਲਤਾਪੂਰਵਕ ਸ਼ਾਮਲ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                ਫਰਮਾਂ ਅਤੇ ਵਿੱਤੀ ਸਾਲ ਪ੍ਰਬੰਧਨ (Firm & Fiscal Year Setup)
              </h2>
              <p className="text-xs text-slate-400">
                ਮਲਟੀ-ਫਰਮ ਚੋਣ, ਲਾਇਸੰਸ ਨੰਬਰ, ਪਤਾ ਅਤੇ ਸੁਤੰਤਰ ਵਿੱਤੀ ਸਾਲ ਰਿਕਾਰਡ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 shrink-0">
          <button
            onClick={() => setActiveTab('firms')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition flex items-center gap-2 ${
              activeTab === 'firms'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>ਫਰਮਾਂ ਦਾ ਪ੍ਰਬੰਧਨ (Firms Master - {firms.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('years')}
            className={`py-3 px-4 text-xs font-black border-b-2 transition flex items-center gap-2 ${
              activeTab === 'years'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>ਵਿੱਤੀ ਸਾਲ (Fiscal Years - {fiscalYears.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'firms' ? (
            <div className="space-y-6">
              {/* Multi-Firm Isolation Guarantee Banner */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                    100% ਸੁਰੱਖਿਅਤ ਅਤੇ ਵੱਖਰਾ ਡਾਟਾਬੇਸ (Strict Multi-Firm Isolation Guarantee)
                  </h4>
                  <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                    ਤੁਸੀਂ ਜਿੰਨੀਆਂ ਮਰਜ਼ੀ ਫਰਮਾਂ ਸ਼ਾਮਲ ਕਰ ਸਕਦੇ ਹੋ। ਹਰੇਕ ਫਰਮ ਦੇ <strong>ਕਿਸਾਨ, ਤੋਲ (Mandi Arrivals), ਏਜੰਸੀ ਖਰੀਦ, ਬਾਰਦਾਨਾ, ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ ਅਤੇ ਅਡਵਾਂਸ</strong> ਬਿਲਕੁਲ ਵੱਖਰੇ ਸਟੋਰ ਹੁੰਦੇ ਹਨ। ਕਿਸੇ ਵੀ ਫਰਮ ਦਾ ਡਾਟਾ ਦੂਜੀ ਫਰਮ ਨਾਲ ਕਦੇ ਵੀ ਸ਼ੇਅਰ ਜਾਂ ਮਿਕਸ ਨਹੀਂ ਹੁੰਦਾ।
                  </p>
                </div>
              </div>

              {/* Firm Form */}
              <form
                onSubmit={handleSaveFirm}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    {isEditingFirm ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                    {isEditingFirm ? 'ਫਰਮ ਵੇਰਵੇ ਸੋਧੋ (Edit Firm Details)' : 'ਨਵੀਂ ਫਰਮ ਸ਼ਾਮਲ ਕਰੋ (Add New Firm)'}
                  </h3>
                  {isEditingFirm && (
                    <button
                      type="button"
                      onClick={resetFirmForm}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      ਰੱਦ ਕਰੋ (Cancel Edit)
                    </button>
                  )}
                </div>

                {formError && (
                  <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਫਰਮ ਦਾ ਨਾਂ (English) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jammu Trading Co"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਫਰਮ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)
                    </label>
                    <input
                      type="text"
                      value={namePa}
                      onChange={(e) => setNamePa(e.target.value)}
                      placeholder="ਉਦਾਹਰਣ: ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਪੂਰਾ ਪਤਾ (Complete Address) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਮਾਰਕੀਟ ਕਮੇਟੀ (Market Committee) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={marketCommittee}
                      onChange={(e) => setMarketCommittee(e.target.value)}
                      placeholder="e.g. Lohian Khas"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਮਾਰਕੀਟ ਕਮੇਟੀ (ਪੰਜਾਬੀ)
                    </label>
                    <input
                      type="text"
                      value={marketCommitteePa}
                      onChange={(e) => setMarketCommitteePa(e.target.value)}
                      placeholder="e.g. ਲੋਹੀਆਂ ਖਾਸ"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਮੋਬਾਈਲ ਨੰਬਰ (Mobile) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 98147-74651"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਮੰਡੀ ਲਾਇਸੰਸ ਨੰਬਰ (Licence No.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={licenceNo}
                      onChange={(e) => setLicenceNo(e.target.value)}
                      placeholder="e.g. JAL/LKH/133"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      PAN ਕਾਰਡ ਨੰਬਰ (PAN Card No.)
                    </label>
                    <input
                      type="text"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GSTIN / ਟੈਕਸ ਨੰਬਰ
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="e.g. 03ABCDE1234F1Z5"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ (Bank Name & A/c)
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, Shahkot"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  {/* Firm Specific Credentials (Optional / Pro Feature) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ਮੁਨੀਮ / ਆਪਰੇਟਰ ਯੂਜ਼ਰਨੇਮ (Munim Username)</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ਜਿਵੇਂ: munim_shahkot"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ਫਰਮ ਪਾਸਵਰਡ (Firm Password)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFirmPassword(!showFirmPassword)}
                        className="text-slate-400 hover:text-slate-700 transition"
                      >
                        {showFirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showFirmPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="ਗੁਪਤ ਪਾਸਵਰਡ (Optional)"
                        className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      <span>ਤੇਜ਼ 4-ਅੰਕੀ PIN (Quick 4-Digit PIN)</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="ਜਿਵੇਂ: 1234"
                      className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={resetFirmForm}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
                  >
                    ਰੀਸੈੱਟ (Reset)
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 flex items-center gap-2 shadow-xs"
                  >
                    {isEditingFirm ? 'ਸੇਵ ਕਰੋ (Update Firm)' : 'ਫਰਮ ਦਰਜ ਕਰੋ (Save Firm)'}
                  </button>
                </div>
              </form>

              {/* Firms List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-900">
                  ਉਪਲਬਧ ਫਰਮਾਂ ਦੀ ਸੂਚੀ (Available Firms)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {firms.map((firm) => {
                    const isActive = firm.id === activeFirmId;
                    return (
                      <div
                        key={firm.id}
                        className={`border rounded-xl p-4 space-y-2.5 transition relative ${
                          isActive
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900">
                                {firm.name}
                              </h4>
                              {firm.isDefault && (
                                <span className="px-2 py-0.5 text-[9px] bg-amber-100 text-amber-900 font-bold rounded-full">
                                  Default
                                </span>
                              )}
                              {isActive && (
                                <span className="px-2 py-0.5 text-[9px] bg-emerald-600 text-white font-black rounded-full flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" />
                                  Active
                                </span>
                              )}
                            </div>
                            {firm.namePa && (
                              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                {firm.namePa}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveFirmId(firm.id);
                                  notifySaveSuccess({
                                    titlePa: 'ਫਰਮ ਬਦਲ ਗਈ',
                                    titleEn: 'Firm Switched',
                                    messagePa: `${firm.name} ਦਾ ਵੱਖਰਾ ਖਾਤਾ ਲੋਡ ਹੋ ਗਿਆ ਹੈ।`
                                  });
                                }}
                                className="px-2.5 py-1 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer shadow-xs"
                              >
                                ਸਵਿੱਚ ਕਰੋ (Switch)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditFirm(firm)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!firm.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeleteFirm(firm.id, firm.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{firm.address}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-medium">
                          <div>
                            <span className="text-slate-400 block">Market Committee:</span>
                            <strong className="text-slate-700">{firm.marketCommittee}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Licence No:</span>
                            <strong className="text-emerald-700 font-mono">{firm.licenceNo}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Mobile:</span>
                            <strong className="text-slate-700 font-mono">{firm.mobile}</strong>
                          </div>
                          {firm.pan && (
                            <div>
                              <span className="text-slate-400 block">PAN No:</span>
                              <strong className="text-slate-800 font-mono font-bold">{firm.pan}</strong>
                            </div>
                          )}
                          {firm.gstin && (
                            <div>
                              <span className="text-slate-400 block">GSTIN:</span>
                              <strong className="text-slate-700 font-mono">{firm.gstin}</strong>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">ਡੇਟਾ ਸੁਰੱਖਿਆ:</span>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            100% ਵੱਖਰਾ ਖਾਤਾ (Strictly Isolated)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add Year Form */}
              <form
                onSubmit={handleAddYear}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
              >
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਨਵਾਂ ਵਿੱਤੀ ਸਾਲ ਸ਼ਾਮਲ ਕਰੋ (Add Fiscal Year, e.g. 2026-27)
                  </label>
                  <input
                    type="text"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="e.g. 2026-27"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                  {yearError && <p className="text-[11px] text-rose-600 font-bold mt-1">{yearError}</p>}
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 flex items-center justify-center gap-2 shrink-0 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>ਸਾਲ ਸ਼ਾਮਲ ਕਰੋ (Add Year)</span>
                </button>
              </form>

              {/* Fiscal Years List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-900">
                  ਉਪਲਬਧ ਵਿੱਤੀ ਸਾਲ (Fiscal Years - Independent Scoping)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {fiscalYears.map((yr) => {
                    const isActive = yr === activeFiscalYear;
                    return (
                      <div
                        key={yr}
                        onClick={() => setActiveFiscalYear(yr)}
                        className={`cursor-pointer border rounded-xl p-4 text-center transition flex flex-col items-center justify-center gap-1.5 ${
                          isActive
                            ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/30'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Calendar className={`w-5 h-5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                        <span className="text-sm font-black font-mono text-slate-900">{yr}</span>
                        {isActive ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            ਸਰਗਰਮ ਸਾਲ (Active)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 hover:text-slate-700">
                            ਕਲਿੱਕ ਕਰਕੇ ਚੁਣੋ (Click to switch)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
