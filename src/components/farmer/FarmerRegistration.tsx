import React, { useState, useEffect } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import { MobileInput } from '../common/MobileInput';
import { Farmer } from '../../types/mandi';
import {
  UserPlus,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  User,
  ShieldCheck,
  Building,
  Phone,
  CreditCard,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Edit,
  FileDown,
  Printer,
  Trash2,
  Search,
  Check,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  autoFormatAadhaar,
  autoFormatMobile,
  maskAadhaarNumber
} from '../../utils/calculations';
import {
  transliterateEnglishToPunjabi
} from '../../utils/translations';
import { extractAadhaarData, ExtractedAadhaarInfo } from '../../utils/aadhaarOcr';
import { exportFarmerProfilePDF, openFarmerPrintWindow } from '../../utils/farmerPdfExport';
import { CameraCaptureModal } from '../common/CameraCaptureModal';
import { MainFarmerSelector } from './MainFarmerSelector';
import { FarmerProfileViewModal } from './FarmerProfileViewModal';
import { FarmerEditModal } from './FarmerEditModal';
import { PinVillageSelector } from './PinVillageSelector';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { FarmerDeleteModal } from './FarmerDeleteModal';

// Helper to extract clean English name (no bilingual slash, no Gurmukhi)
const getEnglishNameDisplay = (enName?: string, paName?: string): string => {
  const en = (enName || '').trim();
  const pa = (paName || '').trim();

  // If enName exists
  if (en) {
    if (en.includes('/')) {
      const parts = en.split('/');
      const part = parts.find((p) => /[a-zA-Z]/.test(p));
      if (part && part.trim()) {
        return part.replace(/[\u0A00-\u0A7F]/g, '').trim();
      }
    }
    const pureEn = en.replace(/[\u0A00-\u0A7F]/g, '').replace(/^[\s/,-]+|[\s/,-]+$/g, '').trim();
    if (pureEn) return pureEn;
    return en;
  }

  // If enName is missing but paName has English part
  if (pa && pa.includes('/')) {
    const parts = pa.split('/');
    const part = parts.find((p) => /[a-zA-Z]/.test(p));
    if (part && part.trim()) {
      return part.replace(/[\u0A00-\u0A7F]/g, '').trim();
    }
  }

  return en || '—';
};

// Helper to extract clean Punjabi name (no bilingual slash, no Latin English characters)
const getPunjabiNameDisplay = (paName?: string, enName?: string): string => {
  const pa = (paName || '').trim();
  const en = (enName || '').trim();

  if (pa) {
    if (pa.includes('/')) {
      const parts = pa.split('/');
      const part = parts.find((p) => /[\u0A00-\u0A7F]/.test(p));
      if (part && part.trim()) {
        return part.replace(/[a-zA-Z]/g, '').trim();
      }
    }
    const purePa = pa.replace(/[a-zA-Z]/g, '').replace(/^[\s/,-]+|[\s/,-]+$/g, '').trim();
    if (purePa) return purePa;
    return pa;
  }

  if (en && en.includes('/')) {
    const parts = en.split('/');
    const part = parts.find((p) => /[\u0A00-\u0A7F]/.test(p));
    if (part && part.trim()) {
      return part.replace(/[a-zA-Z]/g, '').trim();
    }
  }

  return '';
};

// Helper to display Village name strictly in English in the Registered Farmers Directory
const getEnglishVillageDisplay = (
  village?: string,
  villagePa?: string,
  pinCodesList?: any[]
): string => {
  const vEn = (village || '').trim();
  const vPa = (villagePa || '').trim();

  // 1. If English village value exists in farmer master data
  if (vEn) {
    // If it's a combined string with slash (e.g. "ਕਾਂਗ ਖੁਰਦ / Kang Khurd" or "Kang Khurd / ਕਾਂਗ ਖੁਰਦ")
    if (vEn.includes('/')) {
      const parts = vEn.split('/');
      const enPart = parts.find((p) => /[a-zA-Z]/.test(p));
      if (enPart && enPart.trim()) {
        return enPart.trim();
      }
    }

    // Strip any Gurmukhi/Punjabi characters (\u0A00-\u0A7F)
    const pureEnglish = vEn.replace(/[\u0A00-\u0A7F]/g, '').replace(/^[\s/,-]+|[\s/,-]+$/g, '').trim();
    if (pureEnglish) {
      return pureEnglish;
    }
    return vEn;
  }

  // 2. If vEn is missing but villagePa has an English part after/before slash
  if (vPa && vPa.includes('/')) {
    const parts = vPa.split('/');
    const enPart = parts.find((p) => /[a-zA-Z]/.test(p));
    if (enPart && enPart.trim()) {
      return enPart.trim();
    }
  }

  // 3. If only Gurmukhi exists in villagePa, try resolving to English from pinCodes list
  if (vPa && pinCodesList) {
    for (const p of pinCodesList) {
      const match = p.villages?.find((v: any) => v.pa === vPa);
      if (match && match.en) {
        return match.en;
      }
    }
  }

  return vEn || '—';
};

export const FarmerRegistration: React.FC = () => {
  const {
    farmers,
    pinCodes,
    addVillageToPinCode,
    generateNextFarmerId,
    checkDuplicateFarmer,
    registerFarmer,
    deleteFarmer,
    setActiveSection,
    setSelectedFarmerForBags,
    setSelectedFarmerForAccount,
    settings
  } = useMandi();
  const { notifySaveSuccess, notifyDeleteSuccess, notifyDuplicateWarning, notifyError } = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [farmerToDelete, setFarmerToDelete] = useState<Farmer | null>(null);

  const handleConfirmDeleteFarmer = async (farmer: Farmer) => {
    const success = deleteFarmer(farmer.id);
    if (success) {
      notifyDeleteSuccess({
        titlePa: 'ਕਿਸਾਨ ਰੀਸਾਈਕਲ ਬਿਨ ਵਿੱਚ ਭੇਜ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਪੁਰਾਣੇ ਰਿਕਾਰਡ ਸੁਰੱਖਿਅਤ ਹਨ।',
        titleEn: 'Farmer moved to Recycle Bin safely. Historical records remain intact.',
        messagePa: `ਕਿਸਾਨ ${farmer.farmerNamePa} (#${farmer.id}) ਨੂੰ ਰੀਸਾਈਕਲ ਬਿਨ ਵਿੱਚ ਭੇਜ ਦਿੱਤਾ ਗਿਆ ਹੈ।`,
        messageEn: `Farmer ${farmer.farmerName} (#${farmer.id}) was safely moved to Recycle Bin.`
      });
      if (viewFarmer?.id === farmer.id) setViewFarmer(null);
      if (editFarmer?.id === farmer.id) setEditFarmer(null);
    }
  };

  // Registration Form State with Universal Auto-Save Draft
  const defaultInitialFormData = {
    farmerName: '',
    farmerNamePa: '',
    fatherName: '',
    fatherNamePa: '',
    address: '',
    pinCode: '',
    village: '',
    villagePa: '',
    mobile: '',
    aadhaar: '',
    linkedMainFarmerId: '',
    linkedMainFarmerName: '',
    photoUrl: '',
    aadhaarFrontUrl: '',
    aadhaarBackUrl: ''
  };

  const { draft, saveDraft, clearDraft } = useFormDraft({
    formKey: 'draft_farmer_registration',
    initialValues: defaultInitialFormData
  });

  const [formData, setFormData] = useState(draft);

  useEffect(() => {
    saveDraft(formData);
  }, [formData, saveDraft]);

  // Camera Modal State
  const [cameraModal, setCameraModal] = useState<{
    isOpen: boolean;
    type: 'farmer' | 'aadhaarFront' | 'aadhaarBack' | null;
  }>({ isOpen: false, type: null });

  // OCR Processing & Verification State
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrVerified, setOcrVerified] = useState(false);
  const [extractedOcrData, setExtractedOcrData] = useState<ExtractedAadhaarInfo | null>(null);

  // Duplicate Farmer Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isDuplicate: boolean;
    matchedBy?: string;
    existingFarmer?: Farmer;
  } | null>(null);

  // Success Notification
  const [registrationSuccess, setRegistrationSuccess] = useState<Farmer | null>(null);

  // Modals for View & Edit
  const [viewFarmer, setViewFarmer] = useState<Farmer | null>(null);
  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // Masking toggle in form
  const [showAadhaarInForm, setShowAadhaarInForm] = useState(true);

  // Search filter for recent farmers list
  const [searchTerm, setSearchTerm] = useState('');

  // Selected PIN Code mapping (fallback if matching standard list)
  const selectedPinMapping = pinCodes.find((p) => p.pinCode === formData.pinCode.trim());

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

  const handlePinCodeChange = (pin: string) => {
    const cleanPin = pin.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({
      ...prev,
      pinCode: cleanPin
    }));
  };

  const handleVillageChange = (vilEn: string, vilPa: string) => {
    setFormData((prev) => ({
      ...prev,
      village: vilEn,
      villagePa: vilPa
    }));
  };

  // Real-time Duplicate Check
  useEffect(() => {
    if (formData.farmerName.trim() || formData.aadhaar.trim()) {
      const dup = checkDuplicateFarmer({
        farmerName: formData.farmerName,
        aadhaar: formData.aadhaar,
        village: formData.village
      });
      if (dup.isDuplicate && dup.existingFarmer) {
        setDuplicateWarning({
          isDuplicate: true,
          matchedBy: dup.matchedBy,
          existingFarmer: dup.existingFarmer
        });
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.farmerName, formData.aadhaar, formData.village, farmers]);

  // Automatic OCR trigger when Front or Back Aadhaar image is updated
  const triggerAutoOCR = async (frontUrl?: string, backUrl?: string) => {
    setIsOcrProcessing(true);
    setOcrVerified(false);

    try {
      const extracted = await extractAadhaarData(frontUrl, backUrl, pinCodes, {
        farmerName: formData.farmerName,
        fatherName: formData.fatherName,
        pinCode: formData.pinCode,
        village: formData.village,
        aadhaar: formData.aadhaar
      });

      setExtractedOcrData(extracted);
      setOcrVerified(true);

      // Auto-fill editable fields if they were empty or user wanted OCR auto-detection
      setFormData((prev) => ({
        ...prev,
        farmerName: prev.farmerName || extracted.farmerName || '',
        farmerNamePa: prev.farmerNamePa || extracted.farmerNamePa || '',
        fatherName: prev.fatherName || extracted.fatherName || '',
        fatherNamePa: prev.fatherNamePa || extracted.fatherNamePa || '',
        address: prev.address || extracted.address || '',
        pinCode: extracted.pinCode || prev.pinCode,
        village: extracted.village || prev.village,
        villagePa: extracted.villagePa || prev.villagePa,
        aadhaar: prev.aadhaar || extracted.aadhaar || '',
        mobile: prev.mobile || extracted.mobile || ''
      }));
    } catch {
      // Graceful fallback
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Handle Photo File Upload
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
        const nextFront = dataUrl;
        setFormData((prev) => ({ ...prev, aadhaarFrontUrl: nextFront }));
        triggerAutoOCR(nextFront, formData.aadhaarBackUrl);
      } else if (type === 'aadhaarBack') {
        const nextBack = dataUrl;
        setFormData((prev) => ({ ...prev, aadhaarBackUrl: nextBack }));
        triggerAutoOCR(formData.aadhaarFrontUrl, nextBack);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Camera Capture
  const handleCameraCapture = (dataUrl: string) => {
    if (cameraModal.type === 'farmer') {
      setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
    } else if (cameraModal.type === 'aadhaarFront') {
      setFormData((prev) => ({ ...prev, aadhaarFrontUrl: dataUrl }));
      triggerAutoOCR(dataUrl, formData.aadhaarBackUrl);
    } else if (cameraModal.type === 'aadhaarBack') {
      setFormData((prev) => ({ ...prev, aadhaarBackUrl: dataUrl }));
      triggerAutoOCR(formData.aadhaarFrontUrl, dataUrl);
    }
  };

  // Submit Farmer Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.farmerName.trim()) {
      notifyError({
        titlePa: 'ਕਿਸਾਨ ਦਾ ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Farmer Name Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    const cleanMobile = (formData.mobile || '').replace(/\D/g, '');
    if (cleanMobile && cleanMobile.length !== 10) {
      notifyError({
        titlePa: 'ਅਵੈਧ ਮੋਬਾਈਲ ਨੰਬਰ (Invalid Mobile)',
        titleEn: 'Invalid Mobile Number',
        messagePa: 'ਮੋਬਾਈਲ ਨੰਬਰ ਪੂਰੇ 10 ਅੰਕਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ (+91 ਨਾਲ 10 ਅੰਕ)।'
      });
      return;
    }

    const cleanAadhaar = formData.aadhaar.replace(/\s+/g, '');
    if (!cleanAadhaar || cleanAadhaar.length !== 12) {
      notifyError({
        titlePa: 'ਅਵੈਧ ਆਧਾਰ ਨੰਬਰ',
        titleEn: 'Invalid Aadhaar Number',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਪੂਰਾ 12-ਅੰਕੀ ਆਧਾਰ ਨੰਬਰ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    setIsSaving(true);

    const result = registerFarmer({
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
      aadhaarPhotoUrl: formData.aadhaarFrontUrl || undefined
    });

    if (result.success && result.farmer) {
      setRegistrationSuccess(result.farmer);

      notifySaveSuccess({
        titlePa: 'ਕਿਸਾਨ ਸਫਲਤਾਪੂਰਵਕ ਰਜਿਸਟਰ ਹੋ ਗਿਆ ਹੈ!',
        titleEn: 'Farmer Registered Successfully',
        messagePa: `${result.farmer.farmerNamePa || result.farmer.farmerName} (${result.farmer.villagePa || result.farmer.village}) ਦਾ ਰਿਕਾਰਡ ਸੇਵ ਹੋ ਗਿਆ।`,
        details: `${result.farmer.id} • Aadhaar: ${result.farmer.aadhaar}`
      });

      // Clear draft on successful save
      clearDraft();

      // Reset form to completely empty state
      setFormData({
        farmerName: '',
        farmerNamePa: '',
        fatherName: '',
        fatherNamePa: '',
        address: '',
        pinCode: '',
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
      setExtractedOcrData(null);
      setOcrVerified(false);
    } else if (result.existingFarmer) {
      setDuplicateWarning({
        isDuplicate: true,
        matchedBy: 'Existing Registration',
        existingFarmer: result.existingFarmer
      });

      notifyDuplicateWarning({
        titlePa: 'ਇਹ ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੈ!',
        titleEn: 'Duplicate Farmer Detected',
        messagePa: `ਆਧਾਰ ਨੰਬਰ ਜਾਂ ਪਿੰਡ ਨਾਲ ਕਿਸਾਨ ID: ${result.existingFarmer.id} ਪਹਿਲਾਂ ਤੋਂ ਮੌਜੂਦ ਹੈ।`,
        details: `${result.existingFarmer.id} • ${result.existingFarmer.farmerNamePa || result.existingFarmer.farmerName}`
      });
    }

    setIsSaving(false);
  };

  // Filtered farmers for list below
  const filteredFarmers = farmers.filter((f) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      f.farmerName.toLowerCase().includes(q) ||
      f.farmerNamePa.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.villagePa.toLowerCase().includes(q) ||
      f.aadhaar.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
      f.mobile.includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-2xs">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਤੇ ਆਧਾਰ OCR (Farmer Registration & Aadhaar OCR)
            </h2>
            <p className="text-[11px] text-slate-500">
              ਆਧਾਰ ਫਰੰਟ + ਬੈਕ ਫੋਟੋ ਸਕੈਨ ਜਾਂ ਮੈਨੂਅਲ ਐਂਟਰੀ • ਆਟੋ-ਡੁਪਲੀਕੇਟ ਰੋਕਥਾਮ • PDF ਐਕਸਪੋਰਟ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono">
            <span className="text-slate-500 text-[10px] block">ਅਗਲੀ ਆਈ.ਡੀ (Next Farmer ID):</span>
            <strong className="text-emerald-700 font-bold">{generateNextFarmerId()}</strong>
          </div>
          <button
            type="button"
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-2 rounded-lg shadow-2xs transition active:scale-95 flex items-center gap-1.5"
            title="Export/Sync Farmers to Google Sheets and Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
            <span>ਗੂਗਲ ਸ਼ੀਟਸ ਤੇ ਐਕਸਲ</span>
          </button>
          <button
            onClick={() => setActiveSection('multi-farmer-add')}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-2 rounded-lg shadow-2xs transition active:scale-95"
          >
            ਮਲਟੀ ਕਿਸਾਨ ਐਂਟਰੀ →
          </button>
        </div>
      </div>

      {/* Success Notification Banner after saving */}
      {registrationSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-black text-emerald-950 text-sm">
                  ਕਿਸਾਨ ਸਫਲਤਾਪੂਰਵਕ ਰਜਿਸਟਰ ਹੋ ਗਿਆ ਹੈ! (Farmer Registered Successfully)
                </h3>
                <p className="text-xs text-emerald-800">
                  ਕਿਸਾਨ ਆਈ.ਡੀ: <strong className="font-mono font-black text-emerald-950">{registrationSuccess.id}</strong> • ਨਾਂ:{' '}
                  <strong>
                    {registrationSuccess.farmerNamePa} ({registrationSuccess.farmerName})
                  </strong>{' '}
                  • ਪਿੰਡ: <strong>{registrationSuccess.villagePa}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setRegistrationSuccess(null)}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200">
            {/* VIEW */}
            <button
              onClick={() => setViewFarmer(registrationSuccess)}
              className="bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-700" />
              <span>ਪ੍ਰੋਫਾਈਲ ਦੇਖੋ (VIEW)</span>
            </button>

            {/* EDIT */}
            <button
              onClick={() => setEditFarmer(registrationSuccess)}
              className="bg-white hover:bg-emerald-100 text-slate-800 border border-slate-300 font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5 text-blue-600" />
              <span>ਸੋਧ ਕਰੋ (EDIT)</span>
            </button>

            {/* PDF EXPORT */}
            <button
              onClick={() => exportFarmerProfilePDF(registrationSuccess, settings)}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>PDF ਡਾਊਨਲੋਡ (PDF EXPORT)</span>
            </button>

            {/* ENTER BAGS */}
            <button
              onClick={() => {
                setSelectedFarmerForBags(registrationSuccess);
                setActiveSection('bags-entry');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs ml-auto"
            >
              <span>ਇਸ ਕਿਸਾਨ ਲਈ ਬੋਰੀਆਂ ਦਰਜ ਕਰੋ →</span>
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Farmer Warning Box */}
      {duplicateWarning && duplicateWarning.existingFarmer && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 w-full">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-rose-950 text-sm flex items-center gap-2">
                  <span>Farmer Already Registered • ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਦਰਜ ਹੈ</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    {duplicateWarning.matchedBy}
                  </span>
                </h3>
              </div>
              <p className="text-xs text-rose-800">
                ਇਹ ਕਿਸਾਨ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੈ। ਡੁਪਲੀਕੇਟ ਰਿਕਾਰਡ ਬਣਾਉਣ ਦੀ ਮਨਾਹੀ ਹੈ।
              </p>

              {/* Existing Farmer Record Preview */}
              <div className="mt-2 bg-white rounded-lg border border-rose-200 p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">ਕਿਸਾਨ ਆਈ.ਡੀ:</span>
                  <strong className="font-mono font-black text-rose-900">
                    {duplicateWarning.existingFarmer.id}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ਕਿਸਾਨ ਦਾ ਨਾਂ:</span>
                  <strong className="text-slate-900">
                    {duplicateWarning.existingFarmer.farmerNamePa} ({duplicateWarning.existingFarmer.farmerName})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ਪਿੰਡ:</span>
                  <strong className="text-slate-900">
                    {duplicateWarning.existingFarmer.villagePa || duplicateWarning.existingFarmer.village}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">ਆਧਾਰ ਨੰਬਰ:</span>
                  <strong className="font-mono text-slate-900">
                    {duplicateWarning.existingFarmer.aadhaar}
                  </strong>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewFarmer(duplicateWarning.existingFarmer!)}
                  className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs"
                >
                  ਮੌਜੂਦਾ ਪ੍ਰੋਫਾਈਲ ਦੇਖੋ (View)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFarmerForBags(duplicateWarning.existingFarmer!);
                    setActiveSection('bags-entry');
                  }}
                  className="bg-rose-700 hover:bg-rose-600 text-white font-black px-3 py-1.5 rounded-lg text-xs shadow-2xs flex items-center gap-1"
                >
                  <span>ਮੌਜੂਦਾ ਕਿਸਾਨ ਲਈ ਤੁਲਾਈ ਦਰਜ ਕਰੋ (Select Farmer)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Registration Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Personal Details & Manual Entry & OCR Verification */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>ਕਿਸਾਨ ਮੁੱਢਲੀ ਜਾਣਕਾਰੀ (Farmer Personal Details)</span>
              </h3>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                ਮੈਨੂਅਲ ਜਾਂ OCR ਦੋਵੇਂ ਉਪਲਬਧ
              </span>
            </div>

            {/* Farmer Name (English + Punjabi Auto Fill) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਕਿਸਾਨ ਦਾ ਨਾਂ (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gurpreet Singh"
                  value={formData.farmerName || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਕਿਸਾਨ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ - ਗੁਰਮੁਖੀ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="ਗੁਰਪ੍ਰੀਤ ਸਿੰਘ"
                  value={formData.farmerNamePa || ''}
                  onChange={(e) => setFormData({ ...formData, farmerNamePa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Father / Husband Name (English + Punjabi Auto Fill) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਪਿਤਾ ਦਾ ਨਾਂ (Father / Husband Name in English)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sukhdev Singh"
                  value={formData.fatherName || ''}
                  onChange={(e) => handleFatherNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਪਿਤਾ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ - ਗੁਰਮੁਖੀ)
                </label>
                <input
                  type="text"
                  placeholder="ਸੁਖਦੇਵ ਸਿੰਘ"
                  value={formData.fatherNamePa || ''}
                  onChange={(e) => setFormData({ ...formData, fatherNamePa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* PIN Code & Village Dropdown & Manual Input */}
            <div className="pt-1">
              <PinVillageSelector
                pinCode={formData.pinCode || '141401'}
                village={formData.village || ''}
                villagePa={formData.villagePa || ''}
                pinCodesList={pinCodes}
                onPinCodeChange={handlePinCodeChange}
                onVillageChange={handleVillageChange}
                onAddNewVillageToDb={addVillageToPinCode}
                required
              />
            </div>

            {/* Address Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ਪੂਰਾ ਪਤਾ / ਘਰ ਨੰਬਰ (Address)
              </label>
              <input
                type="text"
                placeholder="ਮਕਾਨ ਨੰਬਰ, ਗਲੀ, ਨੇੜੇ ਗੁਰਦੁਆਰਾ ਸਾਹਿਬ, ਪਿੰਡ ਦਾ ਵੇਰਵਾ..."
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Mobile Number & Aadhaar Number (with privacy toggle) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <MobileInput
                  value={formData.mobile || ''}
                  onChange={(val) => setFormData((prev) => ({ ...prev, mobile: val }))}
                  label="10-Digit Mobile"
                  labelPa="ਮੋਬਾਈਲ ਨੰਬਰ"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ਆਧਾਰ ਨੰਬਰ (12-Digit Aadhaar No) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAadhaarInForm(!showAadhaarInForm)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold"
                  >
                    {showAadhaarInForm ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showAadhaarInForm ? 'ਮਾਸਕ (Mask)' : 'ਦਿਖਾਓ (Show)'}</span>
                  </button>
                </div>
                <input
                  type={showAadhaarInForm ? 'text' : 'password'}
                  maxLength={14}
                  placeholder="0000 0000 0000"
                  value={formData.aadhaar || ''}
                  onChange={(e) => setFormData({ ...formData, aadhaar: autoFormatAadhaar(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-black tracking-wider text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Link With Main Farmer (Optional) */}
            <div className="pt-2 border-t border-slate-100">
              <MainFarmerSelector
                farmers={farmers}
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

          {/* OCR Verification Card (Requirement 4) */}
          {ocrVerified && extractedOcrData && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 shadow-2xs space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-blue-950">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>ਆਧਾਰ OCR ਜਾਂਚ ਤੇ ਪੁਸ਼ਟੀ (OCR Verification Panel)</span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-900 font-bold px-2 py-0.5 rounded">
                  ਸਕੈਨ ਹੋਇਆ: {extractedOcrData.extractedAt} ({extractedOcrData.source.toUpperCase()})
                </span>
              </div>

              <p className="text-[11px] text-blue-800">
                ਹੇਠਾਂ ਆਧਾਰ ਕਾਰਡ ਤੋਂ ਪੜ੍ਹੀ ਗਈ ਜਾਣਕਾਰੀ ਦਿਖਾਈ ਗਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ ਅਤੇ ਲੋੜ ਅਨੁਸਾਰ ਫਾਰਮ ਵਿੱਚ ਸੋਧ ਕਰੋ।
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-lg border border-blue-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">ਕਿਸਾਨ ਦਾ ਨਾਂ (Name):</span>
                  <strong className="text-slate-900">{formData.farmerName || '—'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ਪਿਤਾ ਦਾ ਨਾਂ (Father):</span>
                  <strong className="text-slate-900">{formData.fatherName || '—'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ਪਿੰਡ (Village):</span>
                  <strong className="text-slate-900">{formData.village}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ਪਿੰਨ ਕੋਡ (PIN):</span>
                  <strong className="font-mono text-slate-900">{formData.pinCode}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ਆਧਾਰ ਨੰਬਰ:</span>
                  <strong className="font-mono text-emerald-800">{maskAadhaarNumber(formData.aadhaar)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">ਮੋਬਾਈਲ:</span>
                  <strong className="font-mono text-slate-900">{formData.mobile || '—'}</strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ਵੇਰਵੇ ਤਸਦੀਕ ਹੋ ਗਏ ਹਨ
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={!!duplicateWarning?.isDuplicate || isOcrProcessing || isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold px-6 py-2.5 rounded-lg text-xs shadow-2xs flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ... (Saving Farmer Record...)</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ਕਿਸਾਨ ਦਰਜ ਕਰੋ (Save & Verify Farmer Record)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 1 Column: Farmer Photo & Aadhaar Card Front + Back Upload / Camera */}
        <div className="space-y-4">
          {/* 1. Farmer Photo Card (Requirement 5) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>1. ਕਿਸਾਨ ਦੀ ਫੋਟੋ (Farmer Photo)</span>
              </h4>
            </div>

            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-2">
              {formData.photoUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-300 shadow-2xs">
                  <img src={formData.photoUrl} alt="Farmer" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photoUrl: '' })}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[10px]"
                    title="ਹਟਾਓ"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 bg-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                  <User className="w-9 h-9" />
                  <span className="text-[9px] text-slate-500 mt-0.5">ਫੋਟੋ</span>
                </div>
              )}

              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setCameraModal({ isOpen: true, type: 'farmer' })}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ਕੈਮਰਾ (Camera)</span>
                </button>
                <label className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>ਅਪਲੋਡ (Upload)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'farmer')}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 2. Aadhaar Card FRONT Upload / Camera (Requirement 1 & 2) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. ਆਧਾਰ ਕਾਰਡ ਮੁੱਖ ਪਾਸਾ (Aadhaar FRONT)</span>
              </h4>
              {formData.aadhaarFrontUrl && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  ਦਰਜ ਹੈ
                </span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-2">
              {formData.aadhaarFrontUrl ? (
                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-300 shadow-2xs">
                  <img src={formData.aadhaarFrontUrl} alt="Aadhaar Front" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, aadhaarFrontUrl: '' })}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[10px]"
                    title="ਹਟਾਓ"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-16 bg-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs">
                  <ShieldCheck className="w-6 h-6 mb-0.5" />
                  <span className="text-[10px]">Aadhaar Card FRONT Side</span>
                </div>
              )}

              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setCameraModal({ isOpen: true, type: 'aadhaarFront' })}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ਕੈਮਰਾ (Front)</span>
                </button>
                <label className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>ਅਪਲੋਡ (Front)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'aadhaarFront')}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 3. Aadhaar Card BACK Upload / Camera (Requirement 1 & 2) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>3. ਆਧਾਰ ਕਾਰਡ ਪਿਛਲਾ ਪਾਸਾ (Aadhaar BACK)</span>
              </h4>
              {formData.aadhaarBackUrl && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  ਦਰਜ ਹੈ
                </span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300 space-y-2">
              {formData.aadhaarBackUrl ? (
                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-300 shadow-2xs">
                  <img src={formData.aadhaarBackUrl} alt="Aadhaar Back" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, aadhaarBackUrl: '' })}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[10px]"
                    title="ਹਟਾਓ"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-16 bg-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs">
                  <ShieldCheck className="w-6 h-6 mb-0.5" />
                  <span className="text-[10px]">Aadhaar Card BACK Side (Address)</span>
                </div>
              )}

              {isOcrProcessing && (
                <div className="text-xs text-blue-600 font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ਆਧਾਰ OCR ਸਕੈਨਿੰਗ ਤੇ ਆਟੋ-ਫਿਲ ਹੋ ਰਿਹਾ ਹੈ...</span>
                </div>
              )}

              <div className="flex items-center gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setCameraModal({ isOpen: true, type: 'aadhaarBack' })}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ਕੈਮਰਾ (Back)</span>
                </button>
                <label className="flex-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-1.5 px-2 rounded-lg text-[11px] flex items-center justify-center gap-1 cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>ਅਪਲੋਡ (Back)</span>
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
      </form>

      {/* Saved Farmers Directory Table (Requirements 6, 7, 8, 9) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>ਰਜਿਸਟਰਡ ਕਿਸਾਨ ਸੂਚੀ (Registered Farmers Directory - {farmers.length})</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              ਹਰੇਕ ਕਿਸਾਨ ਲਈ VIEW, EDIT, ਅਤੇ PDF EXPORT ਸਹੂਲਤ
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0"
              title="Export & Sync Farmers to Google Sheets and Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">ਸ਼ੀਟਸ / ਐਕਸਲ ਸਿੰਕ</span>
              <span className="sm:hidden">ਸ਼ੀਟਸ</span>
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="ਕਿਸਾਨ ਖੋਜ ਕਰੋ (Search)..."
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {farmers.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-1">
            <User className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">ਅਜੇ ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰ ਨਹੀਂ ਹੋਇਆ</p>
            <p className="text-[11px]">ਉਪਰੋਕਤ ਫਾਰਮ ਰਾਹੀਂ ਪਹਿਲਾ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ।</p>
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            ਕੋਈ ਮੇਲ ਖਾਂਦਾ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">ਕਿਸਾਨ ਆਈ.ਡੀ / ਫੋਟੋ</th>
                  <th className="py-2.5 px-3">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name)</th>
                  <th className="py-2.5 px-3">ਪਿਤਾ ਦਾ ਨਾਂ (Father Name)</th>
                  <th className="py-2.5 px-3">ਪਿੰਡ / ਪਿੰਨ ਕੋਡ</th>
                  <th className="py-2.5 px-3">ਮੋਬਾਈਲ</th>
                  <th className="py-2.5 px-3">ਆਧਾਰ ਨੰਬਰ</th>
                  <th className="py-2.5 px-3 text-right">ਐਕਸ਼ਨ (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFarmers.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {f.photoUrl ? (
                            <img src={f.photoUrl} alt="Farmer" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <span className="font-mono font-black text-emerald-800 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {f.id}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 leading-tight text-xs sm:text-[13px]">
                        {getEnglishNameDisplay(f.farmerName, f.farmerNamePa)}
                      </div>
                      {getPunjabiNameDisplay(f.farmerNamePa, f.farmerName) && (
                        <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5 font-sans">
                          {getPunjabiNameDisplay(f.farmerNamePa, f.farmerName)}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="font-bold text-slate-800 leading-tight text-xs sm:text-[13px]">
                        {getEnglishNameDisplay(f.fatherName, f.fatherNamePa)}
                      </div>
                      {getPunjabiNameDisplay(f.fatherNamePa, f.fatherName) && (
                        <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5 font-sans">
                          {getPunjabiNameDisplay(f.fatherNamePa, f.fatherName)}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700">
                      <div className="font-bold">{getEnglishVillageDisplay(f.village, f.villagePa, pinCodes)}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{f.pinCode}</div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      +91 {f.mobile}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {maskAadhaarNumber(f.aadhaar)}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 0. ACCOUNT Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFarmerForAccount(f);
                            setActiveSection('farmer-account');
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="ਕਿਸਾਨ ਦਾ ਖਾਤਾ ਦੇਖੋ (Farmer Account)"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>ਖਾਤਾ (Account)</span>
                        </button>

                        {/* 1. VIEW Button */}
                        <button
                          type="button"
                          onClick={() => setViewFarmer(f)}
                          className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="ਵੇਰਵੇ ਦੇਖੋ (View Profile)"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ਦੇਖੋ (View)</span>
                        </button>

                        {/* 2. EDIT Button */}
                        <button
                          type="button"
                          onClick={() => setEditFarmer(f)}
                          className="bg-white hover:bg-blue-50 text-blue-800 border border-blue-300 font-bold px-2 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="ਸੋਧ ਕਰੋ (Edit Farmer)"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-600" />
                          <span>ਸੋਧ (Edit)</span>
                        </button>

                        {/* 3. PDF EXPORT Button */}
                        <button
                          type="button"
                          onClick={() => exportFarmerProfilePDF(f, settings)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="PDF ਡਾਊਨਲੋਡ (Export PDF)"
                        >
                          <FileDown className="w-3.5 h-3.5 text-amber-300" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* 4. DELETE FARMER Button (Safe Soft Delete into Recycle Bin) */}
                        <button
                          type="button"
                          onClick={() => setFarmerToDelete(f)}
                          className="bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 hover:border-rose-300 font-bold px-2 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          title="ਕਿਸਾਨ ਡਿਲੀਟ ਕਰੋ (Delete Farmer)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>ਡਿਲੀਟ (Delete)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Webcam Modal for Camera Capture */}
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

      {/* Farmer Profile View Modal (Requirement 7 & 9) */}
      <FarmerProfileViewModal
        isOpen={!!viewFarmer}
        farmer={viewFarmer}
        onClose={() => setViewFarmer(null)}
        onEdit={(farmerToEdit) => {
          setViewFarmer(null);
          setEditFarmer(farmerToEdit);
        }}
      />

      {/* Farmer Edit Modal (Requirement 8 - keeps unique ID!) */}
      <FarmerEditModal
        isOpen={!!editFarmer}
        farmer={editFarmer}
        onClose={() => setEditFarmer(null)}
        onSaved={(updated) => {
          // If view was open or currently showing, update state
          if (viewFarmer?.id === updated.id) {
            setViewFarmer(updated);
          }
        }}
      />

      {/* Google Sheets & Excel Export/Import Modal */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />

      {/* Safe Farmer Delete Confirmation Modal (Requirements 1, 2, 3, 4, 5, 9) */}
      <FarmerDeleteModal
        isOpen={!!farmerToDelete}
        farmer={farmerToDelete}
        onClose={() => setFarmerToDelete(null)}
        onConfirmDelete={handleConfirmDeleteFarmer}
      />
    </div>
  );
};
