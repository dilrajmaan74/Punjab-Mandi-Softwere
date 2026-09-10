import React, { useState, useEffect } from 'react';
import { Farmer } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Edit,
  User,
  ShieldCheck,
  Building,
  Phone,
  Camera,
  Upload,
  Save,
  X,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { autoFormatAadhaar, autoFormatMobile } from '../../utils/calculations';
import { transliterateEnglishToPunjabi } from '../../utils/translations';
import { CameraCaptureModal } from '../common/CameraCaptureModal';
import { PinVillageSelector } from './PinVillageSelector';
import { MainFarmerSelector } from './MainFarmerSelector';

interface FarmerEditModalProps {
  farmer: Farmer | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedFarmer: Farmer) => void;
}

export const FarmerEditModal: React.FC<FarmerEditModalProps> = ({
  farmer,
  isOpen,
  onClose,
  onSaved
}) => {
  const { farmers, pinCodes, updateFarmer } = useMandi();
  const { notifyUpdateSuccess, notifyError } = useNotification();
  const [isUpdating, setIsUpdating] = useState(false);

  const [formData, setFormData] = useState({
    farmerName: '',
    farmerNamePa: '',
    fatherName: '',
    fatherNamePa: '',
    address: '',
    pinCode: '141401',
    village: '',
    villagePa: '',
    mobile: '',
    aadhaar: '',
    linkedMainFarmerId: '',
    linkedMainFarmerName: '',
    photoUrl: '',
    aadhaarFrontUrl: '',
    aadhaarBackUrl: ''
  });

  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    type: 'farmer' | 'aadhaarFront' | 'aadhaarBack' | null;
  }>({ isOpen: false, type: null });

  const [errorMsg, setErrorMsg] = useState('');

  // Sync with selected farmer
  useEffect(() => {
    if (farmer) {
      setFormData({
        farmerName: farmer.farmerName || '',
        farmerNamePa: farmer.farmerNamePa || '',
        fatherName: farmer.fatherName || '',
        fatherNamePa: farmer.fatherNamePa || '',
        address: farmer.address || '',
        pinCode: farmer.pinCode || '141401',
        village: farmer.village || '',
        villagePa: farmer.villagePa || '',
        mobile: farmer.mobile || '',
        aadhaar: farmer.aadhaar || '',
        linkedMainFarmerId: farmer.linkedMainFarmerId || '',
        linkedMainFarmerName: farmer.linkedMainFarmerName || '',
        photoUrl: farmer.photoUrl || '',
        aadhaarFrontUrl: farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl || '',
        aadhaarBackUrl: farmer.aadhaarBackUrl || ''
      });
      setErrorMsg('');
      setIsUpdating(false);
    }
  }, [farmer]);

  if (!isOpen || !farmer) return null;

  // Auto-transliterate English names into Punjabi as typed
  const handleNameChange = (val: string) => {
    const pa = transliterateEnglishToPunjabi(val);
    setFormData((prev) => ({
      ...prev,
      farmerName: val,
      farmerNamePa: pa
    }));
  };

  const handleFatherNameChange = (val: string) => {
    const pa = transliterateEnglishToPunjabi(val);
    setFormData((prev) => ({
      ...prev,
      fatherName: val,
      fatherNamePa: pa
    }));
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'farmer' | 'aadhaarFront' | 'aadhaarBack'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (type === 'farmer') {
        setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
      } else if (type === 'aadhaarFront') {
        setFormData((prev) => ({ ...prev, aadhaarFrontUrl: dataUrl }));
      } else if (type === 'aadhaarBack') {
        setFormData((prev) => ({ ...prev, aadhaarBackUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (dataUrl: string) => {
    if (cameraModal.type === 'farmer') {
      setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
    } else if (cameraModal.type === 'aadhaarFront') {
      setFormData((prev) => ({ ...prev, aadhaarFrontUrl: dataUrl }));
    } else if (cameraModal.type === 'aadhaarBack') {
      setFormData((prev) => ({ ...prev, aadhaarBackUrl: dataUrl }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.farmerName.trim()) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ (Please enter Farmer Name)');
      notifyError({
        titlePa: 'ਕਿਸਾਨ ਦਾ ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Farmer Name Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    const cleanAadhaar = formData.aadhaar.replace(/\s+/g, '');
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      setErrorMsg('ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ 12-ਅੰਕੀ ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ (Please enter valid 12-digit Aadhaar)');
      notifyError({
        titlePa: 'ਅਵੈਧ ਆਧਾਰ ਨੰਬਰ',
        titleEn: 'Invalid Aadhaar Number',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ 12-ਅੰਕੀ ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    setIsUpdating(true);

    // Keep the EXACT same unique Farmer ID!
    const updatedRecord: Farmer = {
      ...farmer,
      farmerName: formData.farmerName.trim(),
      farmerNamePa: formData.farmerNamePa.trim() || formData.farmerName.trim(),
      fatherName: formData.fatherName.trim(),
      fatherNamePa: formData.fatherNamePa.trim() || formData.fatherName.trim(),
      address: formData.address.trim(),
      pinCode: formData.pinCode.trim(),
      village: formData.village.trim(),
      villagePa: formData.villagePa.trim() || formData.village.trim(),
      mobile: autoFormatMobile(formData.mobile),
      aadhaar: autoFormatAadhaar(formData.aadhaar),
      linkedMainFarmerId: formData.linkedMainFarmerId.trim() || undefined,
      linkedMainFarmerName: formData.linkedMainFarmerName.trim() || undefined,
      photoUrl: formData.photoUrl || undefined,
      aadhaarFrontUrl: formData.aadhaarFrontUrl || undefined,
      aadhaarBackUrl: formData.aadhaarBackUrl || undefined,
      aadhaarPhotoUrl: formData.aadhaarFrontUrl || farmer.aadhaarPhotoUrl,
      updatedAt: new Date().toISOString()
    };

    updateFarmer(farmer.id, updatedRecord);

    notifyUpdateSuccess({
      titlePa: 'ਤਬਦੀਲੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਈਆਂ ਹਨ।',
      titleEn: 'Changes Updated Successfully',
      messagePa: `${updatedRecord.farmerNamePa || updatedRecord.farmerName} (${updatedRecord.villagePa || updatedRecord.village}) ਦਾ ਰਿਕਾਰਡ ਅੱਪਡੇਟ ਹੋ ਗਿਆ।`,
      details: `${farmer.id} • Aadhaar: ${updatedRecord.aadhaar}`
    });

    setTimeout(() => {
      setIsUpdating(false);
      onSaved(updatedRecord);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  ਕਿਸਾਨ ਵੇਰਵੇ ਸੋਧੋ (Edit Farmer Record)
                </h3>
                <span className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded shadow-2xs">
                  {farmer.id} (ਕਿਸਾਨ ID ਸਥਿਰ ਰਹੇਗੀ)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ਨਾਮ, ਪਤਾ, ਪਿੰਡ, ਪਿੰਨ ਕੋਡ, ਮੋਬਾਈਲ, ਆਧਾਰ ਤੇ ਫੋਟੋਆਂ ਦੀ ਸੋਧ ਕਰੋ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Names (English & Punjabi) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>ਕਿਸਾਨ ਤੇ ਪਿਤਾ ਦਾ ਨਾਂ (Name & Father Name)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਕਿਸਾਨ ਦਾ ਨਾਂ (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.farmerName || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਕਿਸਾਨ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ - ਗੁਰਮੁਖੀ)
                </label>
                <input
                  type="text"
                  value={formData.farmerNamePa || ''}
                  onChange={(e) => setFormData({ ...formData, farmerNamePa: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਪਿਤਾ ਦਾ ਨਾਂ (Father Name - English)
                </label>
                <input
                  type="text"
                  value={formData.fatherName || ''}
                  onChange={(e) => handleFatherNameChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਪਿਤਾ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ - ਗੁਰਮੁਖੀ)
                </label>
                <input
                  type="text"
                  value={formData.fatherNamePa || ''}
                  onChange={(e) => setFormData({ ...formData, fatherNamePa: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Location (Editable PIN Code, Village & Address) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>ਪਤਾ ਤੇ ਪਿੰਡ (Location Details - Fully Editable)</span>
            </h4>

            <PinVillageSelector
              pinCode={formData.pinCode || '141401'}
              village={formData.village || ''}
              villagePa={formData.villagePa || ''}
              pinCodesList={pinCodes}
              onPinCodeChange={(pin) => setFormData((prev) => ({ ...prev, pinCode: pin }))}
              onVillageChange={(vEn, vPa) => setFormData((prev) => ({ ...prev, village: vEn, villagePa: vPa }))}
              required
            />

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ਪੂਰਾ ਪਤਾ (Complete Address / House No / Landmark)
              </label>
              <input
                type="text"
                placeholder="e.g. Near Gurdwara Sahib, Main Road"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section 3: Contact & Identity (Mobile & Aadhaar) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span>ਮੋਬਾਈਲ ਤੇ ਆਧਾਰ ਨੰਬਰ (Mobile & Aadhaar Number)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਮੋਬਾਈਲ ਨੰਬਰ (10-Digit Mobile)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-mono">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.mobile || ''}
                    onChange={(e) => setFormData({ ...formData, mobile: autoFormatMobile(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 pl-10 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਆਧਾਰ ਨੰਬਰ (12-Digit Aadhaar No) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={formData.aadhaar || ''}
                  onChange={(e) => setFormData({ ...formData, aadhaar: autoFormatAadhaar(e.target.value) })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-slate-900 tracking-wider focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Link With Main Farmer (Optional) */}
            <div className="pt-2 border-t border-slate-200">
              <MainFarmerSelector
                farmers={farmers}
                currentFarmerId={farmer.id}
                selectedMainFarmerId={formData.linkedMainFarmerId}
                onSelectMainFarmer={(mainFarmer) => {
                  setFormData({
                    ...formData,
                    linkedMainFarmerId: mainFarmer ? mainFarmer.id : '',
                    linkedMainFarmerName: mainFarmer
                      ? `${mainFarmer.farmerNamePa} (${mainFarmer.farmerName})`
                      : ''
                  });
                }}
              />
            </div>
          </div>

          {/* Section 4: Photos (Farmer Photo, Aadhaar Front, Aadhaar Back) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <h4 className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>ਫੋਟੋਆਂ ਤੇ ਆਧਾਰ ਦਸਤਾਵੇਜ਼ (Photos & Aadhaar Front/Back)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Farmer Photo */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">ਕਿਸਾਨ ਫੋਟੋ (Photo)</span>
                <div className="h-28 bg-slate-100 rounded-md border border-slate-300 overflow-hidden flex items-center justify-center relative">
                  {formData.photoUrl ? (
                    <>
                      <img src={formData.photoUrl} alt="Farmer" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photoUrl: '' })}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCameraModal({ isOpen: true, type: 'farmer' })}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>ਕੈਮਰਾ</span>
                  </button>
                  <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold py-1 rounded text-center cursor-pointer border border-slate-300">
                    <span>ਅਪਲੋਡ</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'farmer')}
                    />
                  </label>
                </div>
              </div>

              {/* Aadhaar Front Photo */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">ਆਧਾਰ ਮੁੱਖ ਪਾਸਾ (Front)</span>
                <div className="h-28 bg-slate-100 rounded-md border border-slate-300 overflow-hidden flex items-center justify-center relative">
                  {formData.aadhaarFrontUrl ? (
                    <>
                      <img src={formData.aadhaarFrontUrl} alt="Aadhaar Front" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, aadhaarFrontUrl: '' })}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <ShieldCheck className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCameraModal({ isOpen: true, type: 'aadhaarFront' })}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>ਕੈਮਰਾ</span>
                  </button>
                  <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold py-1 rounded text-center cursor-pointer border border-slate-300">
                    <span>ਅਪਲੋਡ</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'aadhaarFront')}
                    />
                  </label>
                </div>
              </div>

              {/* Aadhaar Back Photo */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">ਆਧਾਰ ਪਿਛਲਾ ਪਾਸਾ (Back)</span>
                <div className="h-28 bg-slate-100 rounded-md border border-slate-300 overflow-hidden flex items-center justify-center relative">
                  {formData.aadhaarBackUrl ? (
                    <>
                      <img src={formData.aadhaarBackUrl} alt="Aadhaar Back" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, aadhaarBackUrl: '' })}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <ShieldCheck className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCameraModal({ isOpen: true, type: 'aadhaarBack' })}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold py-1 rounded flex items-center justify-center gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    <span>ਕੈਮਰਾ</span>
                  </button>
                  <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold py-1 rounded text-center cursor-pointer border border-slate-300">
                    <span>ਅਪਲੋਡ</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'aadhaarBack')}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs border border-slate-300"
            >
              ਰੱਦ ਕਰੋ (Cancel)
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-6 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ਅੱਪਡੇਟ ਹੋ ਰਿਹਾ ਹੈ... (Updating...)</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>ਅੱਪਡੇਟ ਸੇਵ ਕਰੋ (Save Changes)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModal.isOpen}
        onClose={() => setCameraModal({ isOpen: false, type: null })}
        onCapture={handleCameraCapture}
        titleEn={
          cameraModal.type === 'farmer'
            ? 'Capture Farmer Photo'
            : cameraModal.type === 'aadhaarFront'
            ? 'Capture Aadhaar Card FRONT'
            : 'Capture Aadhaar Card BACK'
        }
        titlePa={
          cameraModal.type === 'farmer'
            ? 'ਕਿਸਾਨ ਦੀ ਫੋਟੋ ਖਿੱਚੋ'
            : cameraModal.type === 'aadhaarFront'
            ? 'ਆਧਾਰ ਮੁੱਖ ਪਾਸਾ ਖਿੱਚੋ'
            : 'ਆਧਾਰ ਪਿਛਲਾ ਪਾਸਾ ਖਿੱਚੋ'
        }
      />
    </div>
  );
};
