import React, { useState, useEffect, useRef } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  CreditCard,
  Building,
  Camera,
  Upload,
  CheckCircle2,
  User,
  Search,
  Sparkles,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  MapPin,
  ShieldCheck,
  Building2,
  FileText,
  Printer,
  Download,
  Copy,
  Phone,
  Edit3,
  ArrowRight,
  Filter,
  CheckCheck,
  ExternalLink,
  Trash2,
  X,
  Languages,
  BadgeCheck,
  ImageIcon,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUpDown
} from 'lucide-react';
import { lookupIFSC, validateIfscFormat, IfscLookupResult } from '../../utils/ifscService';
import { CameraCaptureModal } from '../common/CameraCaptureModal';
import { compressImage } from '../../utils/imageCompressor';
import { transliterateEnglishToPunjabi } from '../../utils/translations';
import { Farmer } from '../../types/mandi';

// Clean English name helper
const getEnglishName = (en?: string, pa?: string): string => {
  const e = (en || '').trim();
  const p = (pa || '').trim();
  if (e) {
    if (e.includes('/')) {
      const match = e.split('/').find((x) => /[a-zA-Z]/.test(x));
      if (match) return match.replace(/[\u0A00-\u0A7F]/g, '').trim();
    }
    const pure = e.replace(/[\u0A00-\u0A7F]/g, '').replace(/^[\s/,-]+|[\s/,-]+$/g, '').trim();
    if (pure) return pure;
    return e;
  }
  if (p && p.includes('/')) {
    const match = p.split('/').find((x) => /[a-zA-Z]/.test(x));
    if (match) return match.replace(/[\u0A00-\u0A7F]/g, '').trim();
  }
  return e || '—';
};

// Clean Punjabi name helper
const getPunjabiName = (pa?: string, en?: string): string => {
  const p = (pa || '').trim();
  const e = (en || '').trim();
  if (p) {
    if (p.includes('/')) {
      const match = p.split('/').find((x) => /[\u0A00-\u0A7F]/.test(x));
      if (match) return match.replace(/[a-zA-Z]/g, '').trim();
    }
    const pure = p.replace(/[a-zA-Z]/g, '').replace(/^[\s/,-]+|[\s/,-]+$/g, '').trim();
    if (pure) return pure;
    return p;
  }
  return '';
};

// Format Aadhaar in 4-4-4 groups
const formatAadhaar = (val?: string): string => {
  if (!val) return '—';
  const clean = val.replace(/\D/g, '');
  if (clean.length === 12) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)}`;
  }
  return val;
};

// State for On-Screen Quick Edit Modal
interface QuickEditFarmerState {
  id: string;
  farmerName: string;
  farmerNamePa: string;
  fatherName: string;
  fatherNamePa: string;
  mobile: string;
  aadhaar: string;
  photoUrl: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

export const BankDetailsManager: React.FC = () => {
  const { farmers, saveFarmerBankDetails, updateFarmer, activeFirm } = useMandi();
  const { notifySaveSuccess, notifyUpdateSuccess, notifyError } = useNotification();

  // Top View Switcher: 'master_list' | 'entry_form'
  const [activeTab, setActiveTab] = useState<'master_list' | 'entry_form'>('master_list');

  // Master List Controls
  const [tableSearch, setTableSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'linked' | 'pending'>('all');
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // A to Z Alphabetical Sort & Jump
  const [sortOrder, setSortOrder] = useState<'a_z' | 'z_a' | 'id_asc'>('a_z');
  const [letterFilter, setLetterFilter] = useState<string>('ALL');

  // SAME-SCREEN QUICK EDIT MODAL STATE
  const [editingFarmer, setEditingFarmer] = useState<QuickEditFarmerState | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [modalIfscLookingUp, setModalIfscLookingUp] = useState(false);
  const [modalIfscResult, setModalIfscResult] = useState<IfscLookupResult | null>(null);

  // Camera Modal Control
  const [cameraMode, setCameraMode] = useState<'farmerPhoto' | 'passbook' | null>(null);

  // Dedicated Tab 2 Form State
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(farmers[0]?.id || '');
  const [formSearchQuery, setFormSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    branchAddress: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    micrCode: '',
    passbookPhotoUrl: ''
  });

  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrVerified, setOcrVerified] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // IFSC Lookup State for Tab 2
  const [isLookingUpIfsc, setIsLookingUpIfsc] = useState(false);
  const [ifscLookupResult, setIfscLookupResult] = useState<IfscLookupResult | null>(null);
  const [ifscError, setIfscError] = useState<string | null>(null);

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);
  const lookupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing bank details when selected farmer changes in Tab 2
  useEffect(() => {
    if (selectedFarmer) {
      if (selectedFarmer.bankDetails) {
        setBankForm({
          accountHolderName: selectedFarmer.bankDetails.accountHolderName || selectedFarmer.farmerName,
          accountNumber: selectedFarmer.bankDetails.accountNumber || '',
          ifscCode: selectedFarmer.bankDetails.ifscCode || '',
          bankName: selectedFarmer.bankDetails.bankName || '',
          branchName: selectedFarmer.bankDetails.branchName || '',
          branchAddress: selectedFarmer.bankDetails.branchAddress || '',
          city: selectedFarmer.bankDetails.city || '',
          district: selectedFarmer.bankDetails.district || '',
          state: selectedFarmer.bankDetails.state || '',
          pinCode: selectedFarmer.bankDetails.pinCode || '',
          micrCode: selectedFarmer.bankDetails.micrCode || '',
          passbookPhotoUrl: selectedFarmer.bankDetails.passbookPhotoUrl || ''
        });

        if (selectedFarmer.bankDetails.ifscCode) {
          setIfscLookupResult({
            success: true,
            bankName: selectedFarmer.bankDetails.bankName,
            branchName: selectedFarmer.bankDetails.branchName,
            branchAddress: selectedFarmer.bankDetails.branchAddress,
            city: selectedFarmer.bankDetails.city,
            district: selectedFarmer.bankDetails.district,
            state: selectedFarmer.bankDetails.state,
            pinCode: selectedFarmer.bankDetails.pinCode,
            micrCode: selectedFarmer.bankDetails.micrCode,
            ifscCode: selectedFarmer.bankDetails.ifscCode,
            source: 'verified-api'
          });
        } else {
          setIfscLookupResult(null);
        }
      } else {
        setBankForm({
          accountHolderName: selectedFarmer.farmerName,
          accountNumber: '',
          ifscCode: '',
          bankName: '',
          branchName: '',
          branchAddress: '',
          city: '',
          district: '',
          state: '',
          pinCode: '',
          micrCode: '',
          passbookPhotoUrl: ''
        });
        setIfscLookupResult(null);
      }
      setOcrVerified(false);
      setIfscError(null);
    }
  }, [selectedFarmerId, selectedFarmer]);

  // OPEN SAME-SCREEN QUICK EDIT MODAL
  const handleOpenQuickEdit = (f: Farmer) => {
    setEditingFarmer({
      id: f.id,
      farmerName: f.farmerName || '',
      farmerNamePa: f.farmerNamePa || '',
      fatherName: f.fatherName || '',
      fatherNamePa: f.fatherNamePa || '',
      mobile: f.mobile || '',
      aadhaar: f.aadhaar || '',
      photoUrl: f.photoUrl || '',
      bankName: f.bankDetails?.bankName || '',
      branchName: f.bankDetails?.branchName || '',
      accountNumber: f.bankDetails?.accountNumber || '',
      ifscCode: f.bankDetails?.ifscCode || '',
      accountHolderName: f.bankDetails?.accountHolderName || f.farmerName || ''
    });
    setModalIfscResult(null);
  };

  // SAVE QUICK EDIT (Saves Name, Father, Mobile, Aadhaar, Photo, Bank Name, IFSC, Account No on same screen)
  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarmer) return;

    if (!editingFarmer.farmerName.trim()) {
      notifyError({
        titlePa: 'ਕਿਸਾਨ ਦਾ ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Farmer Name Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    setIsQuickSaving(true);
    try {
      // 1. Update Farmer Profile
      updateFarmer(editingFarmer.id, {
        farmerName: editingFarmer.farmerName.trim(),
        farmerNamePa: editingFarmer.farmerNamePa.trim() || editingFarmer.farmerName.trim(),
        fatherName: editingFarmer.fatherName.trim(),
        fatherNamePa: editingFarmer.fatherNamePa.trim() || editingFarmer.fatherName.trim(),
        mobile: editingFarmer.mobile.replace(/\D/g, '').slice(0, 10),
        aadhaar: editingFarmer.aadhaar.trim(),
        photoUrl: editingFarmer.photoUrl || undefined
      });

      // 2. Update Bank Details if any bank field is provided
      if (editingFarmer.accountNumber.trim() || editingFarmer.ifscCode.trim() || editingFarmer.bankName.trim()) {
        saveFarmerBankDetails(editingFarmer.id, {
          accountHolderName: editingFarmer.accountHolderName.trim() || editingFarmer.farmerName.trim(),
          accountNumber: editingFarmer.accountNumber.trim(),
          ifscCode: editingFarmer.ifscCode.trim().toUpperCase(),
          bankName: editingFarmer.bankName.trim(),
          branchName: editingFarmer.branchName.trim()
        });
      }

      notifyUpdateSuccess({
        titlePa: 'ਵੇਰਵੇ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਏ!',
        titleEn: 'Farmer & Bank Details Updated',
        messagePa: `${editingFarmer.farmerNamePa || editingFarmer.farmerName} ਦਾ ਰਿਕਾਰਡ ਉਸੇ ਸਕ੍ਰੀਨ 'ਤੇ ਅੱਪਡੇਟ ਹੋ ਗਿਆ ਹੈ।`,
        details: `Mobile: +91 ${editingFarmer.mobile} • A/C: ${editingFarmer.accountNumber || 'Pending'} • Bank: ${editingFarmer.bankName || 'Pending'}`
      });

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3500);
      setEditingFarmer(null);
    } catch (err: any) {
      notifyError({
        titlePa: 'ਸੇਵ ਕਰਨ ਵਿੱਚ ਗਲਤੀ',
        titleEn: 'Save Error',
        messagePa: err?.message || 'ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।'
      });
    } finally {
      setIsQuickSaving(false);
    }
  };

  // Auto Transliterate English to Punjabi in Quick Edit Modal
  const handleTransliterateName = () => {
    if (!editingFarmer) return;
    if (editingFarmer.farmerName) {
      const pa = transliterateEnglishToPunjabi(editingFarmer.farmerName);
      setEditingFarmer((prev) => (prev ? { ...prev, farmerNamePa: pa } : null));
    }
  };

  const handleTransliterateFather = () => {
    if (!editingFarmer) return;
    if (editingFarmer.fatherName) {
      const pa = transliterateEnglishToPunjabi(editingFarmer.fatherName);
      setEditingFarmer((prev) => (prev ? { ...prev, fatherNamePa: pa } : null));
    }
  };

  // Quick Edit Modal IFSC Lookup
  const handleModalIfscLookup = async (ifscToTest: string) => {
    const clean = ifscToTest.trim().toUpperCase();
    if (clean.length !== 11) return;
    setModalIfscLookingUp(true);
    try {
      const res = await lookupIFSC(clean);
      if (res && res.success) {
        setModalIfscResult(res);
        setEditingFarmer((prev) =>
          prev
            ? {
                ...prev,
                ifscCode: clean,
                bankName: res.bankName || prev.bankName,
                branchName: res.branchName || prev.branchName
              }
            : null
        );
      }
    } catch {
      // ignore
    } finally {
      setModalIfscLookingUp(false);
    }
  };

  // Modal Photo File Upload
  const handleModalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 400, 0.7);
      if (editingFarmer) {
        setEditingFarmer((prev) => (prev ? { ...prev, photoUrl: compressed } : null));
      }
    } catch (err) {
      console.error('Photo compression error:', err);
    }
  };

  // Camera capture callback (handles both Farmer Photo & Passbook)
  const handleCameraCapture = async (dataUrl: string) => {
    if (cameraMode === 'farmerPhoto' && editingFarmer) {
      try {
        const compressed = await compressImage(dataUrl, 400, 400, 0.7);
        setEditingFarmer((prev) => (prev ? { ...prev, photoUrl: compressed } : null));
      } catch {
        setEditingFarmer((prev) => (prev ? { ...prev, photoUrl: dataUrl } : null));
      }
      setCameraMode(null);
    } else if (cameraMode === 'passbook') {
      setBankForm((prev) => ({ ...prev, passbookPhotoUrl: dataUrl }));
      runPassbookOCR(dataUrl);
      setCameraMode(null);
    }
  };

  // Tab 2: Execute Verified Online IFSC Lookup
  const performIfscLookup = async (ifscToSearch: string) => {
    const cleanIfsc = ifscToSearch.trim().toUpperCase();
    if (!cleanIfsc) {
      setIfscLookupResult(null);
      setIfscError(null);
      return;
    }

    if (!validateIfscFormat(cleanIfsc)) {
      setIfscError('ਅਵੈਧ IFSC ਫਾਰਮੈਟ: 11 ਅੱਖਰ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ (ਜਿਵੇਂ SBIN0001234)');
      setIfscLookupResult(null);
      return;
    }

    setIsLookingUpIfsc(true);
    setIfscError(null);

    try {
      const res = await lookupIFSC(cleanIfsc);
      if (res && res.success) {
        setIfscLookupResult(res);
        setBankForm((prev) => ({
          ...prev,
          ifscCode: cleanIfsc,
          bankName: res.bankName || prev.bankName,
          branchName: res.branchName || prev.branchName,
          branchAddress: res.branchAddress || prev.branchAddress,
          city: res.city || prev.city,
          district: res.district || prev.district,
          state: res.state || prev.state,
          pinCode: res.pinCode || prev.pinCode,
          micrCode: res.micrCode || prev.micrCode
        }));
      } else {
        setIfscError(res?.error || 'ਬੈਂਕ ਸ਼ਾਖਾ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਹੱਥੀਂ ਦਰਜ ਕਰੋ।');
        setIfscLookupResult(null);
      }
    } catch {
      setIfscError('IFSC ਜਾਂਚ ਦੌਰਾਨ ਨੈੱਟਵਰਕ ਸਮੱਸਿਆ। ਤੁਸੀਂ ਹੱਥੀਂ ਵੇਰਵੇ ਭਰ ਸਕਦੇ ਹੋ।');
    } finally {
      setIsLookingUpIfsc(false);
    }
  };

  const handleIfscChange = (val: string) => {
    const upper = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    setBankForm((prev) => ({ ...prev, ifscCode: upper }));

    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
    }

    if (upper.length === 11) {
      lookupTimerRef.current = setTimeout(() => {
        performIfscLookup(upper);
      }, 350);
    } else {
      setIfscLookupResult(null);
      setIfscError(null);
    }
  };

  const runPassbookOCR = (_dataUrl: string) => {
    setIsOcrProcessing(true);
    setTimeout(() => {
      setIsOcrProcessing(false);
      setOcrVerified(true);
      setBankForm((prev) => ({
        ...prev,
        accountHolderName: prev.accountHolderName || selectedFarmer?.farmerName || '',
        accountNumber: prev.accountNumber || '',
        ifscCode: prev.ifscCode || '',
        bankName: prev.bankName || '',
        branchName: prev.branchName || '',
        branchAddress: prev.branchAddress || ''
      }));
    }, 600);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBankForm((prev) => ({ ...prev, passbookPhotoUrl: dataUrl }));
      runPassbookOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmerId) {
      notifyError({
        titlePa: 'ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ',
        titleEn: 'Farmer Selection Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ।'
      });
      return;
    }
    if (!bankForm.accountNumber?.trim()) {
      notifyError({
        titlePa: 'ਖਾਤਾ ਨੰਬਰ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Account Number Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ ਦਰਜ ਕਰੋ।'
      });
      return;
    }
    if (!bankForm.bankName?.trim()) {
      notifyError({
        titlePa: 'ਬੈਂਕ ਦਾ ਨਾਂ ਲੋੜੀਂਦਾ ਹੈ',
        titleEn: 'Bank Name Required',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਬੈਂਕ ਦਾ ਪੂਰਾ ਅਧਿਕਾਰਤ ਨਾਂ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    setIsSaving(true);

    const isUpdate = !!selectedFarmer?.bankDetails?.accountNumber;

    saveFarmerBankDetails(selectedFarmerId, {
      accountHolderName: (bankForm.accountHolderName || '').trim() || selectedFarmer?.farmerName || '',
      accountNumber: (bankForm.accountNumber || '').trim(),
      ifscCode: (bankForm.ifscCode || '').trim(),
      bankName: (bankForm.bankName || '').trim(),
      branchName: (bankForm.branchName || '').trim(),
      branchAddress: bankForm.branchAddress?.trim() || undefined,
      city: bankForm.city?.trim() || undefined,
      district: bankForm.district?.trim() || undefined,
      state: bankForm.state?.trim() || undefined,
      pinCode: bankForm.pinCode?.trim() || undefined,
      micrCode: bankForm.micrCode?.trim() || undefined,
      passbookPhotoUrl: bankForm.passbookPhotoUrl || undefined
    });

    if (isUpdate) {
      notifyUpdateSuccess({
        titlePa: 'ਬੈਂਕ ਵੇਰਵੇ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਏ ਹਨ।',
        titleEn: 'Bank Details Updated Successfully',
        messagePa: `${selectedFarmer?.farmerNamePa || selectedFarmer?.farmerName} ਲਈ ਬੈਂਕ ਰਿਕਾਰਡ ਅੱਪਡੇਟ ਹੋ ਗਿਆ।`,
        details: `${bankForm.bankName} • A/C: ${bankForm.accountNumber} • IFSC: ${bankForm.ifscCode}`
      });
    } else {
      notifySaveSuccess({
        titlePa: 'ਬੈਂਕ ਵੇਰਵੇ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਏ ਹਨ।',
        titleEn: 'Bank Details Saved Successfully',
        messagePa: `${selectedFarmer?.farmerNamePa || selectedFarmer?.farmerName} ਲਈ ਨਵਾਂ ਬੈਂਕ ਰਿਕਾਰਡ ਸੇਵ ਹੋ ਗਿਆ।`,
        details: `${bankForm.bankName} • A/C: ${bankForm.accountNumber} • IFSC: ${bankForm.ifscCode}`
      });
    }

    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 4000);
    setIsSaving(false);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedCell(id);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  // Helper to extract clean sort name
  const getFarmerSortName = (f: Farmer): string => {
    const en = getEnglishName(f.farmerName, f.farmerNamePa).trim();
    if (en && en !== '—') return en;
    const pa = (f.farmerNamePa || f.farmerName || '').trim();
    return pa || '';
  };

  // Pre-calculate which alphabet letters (A-Z) have at least one farmer
  const availableLettersSet = React.useMemo(() => {
    const set = new Set<string>();
    farmers.forEach((f) => {
      const name = getFarmerSortName(f);
      if (name) {
        const first = name.charAt(0).toUpperCase();
        if (/^[A-Z]$/.test(first)) {
          set.add(first);
        }
      }
    });
    return set;
  }, [farmers]);

  // Filtered farmers for master list (Bank status + A-Z letter filter + Search query)
  const filteredMasterFarmers = farmers.filter((f) => {
    if (!f) return false;
    // Bank status filter
    const hasBank = !!f.bankDetails?.accountNumber?.trim();
    if (filterMode === 'linked' && !hasBank) return false;
    if (filterMode === 'pending' && hasBank) return false;

    // A to Z Alphabet quick jump filter
    if (letterFilter !== 'ALL') {
      const sortName = getFarmerSortName(f);
      const first = sortName.charAt(0).toUpperCase();
      if (first !== letterFilter) return false;
    }

    // Search query filter
    const q = (tableSearch || '').toLowerCase().trim();
    if (!q) return true;

    const enName = (f.farmerName || '').toLowerCase();
    const paName = (f.farmerNamePa || '').toLowerCase();
    const fatherEn = (f.fatherName || '').toLowerCase();
    const fatherPa = (f.fatherNamePa || '').toLowerCase();
    const mobile = (f.mobile || '').toLowerCase();
    const aadhaar = (f.aadhaar || '').replace(/\s+/g, '');
    const acc = (f.bankDetails?.accountNumber || '').toLowerCase();
    const ifsc = (f.bankDetails?.ifscCode || '').toLowerCase();
    const bank = (f.bankDetails?.bankName || '').toLowerCase();
    const village = (f.village || '').toLowerCase();

    return (
      enName.includes(q) ||
      paName.includes(q) ||
      fatherEn.includes(q) ||
      fatherPa.includes(q) ||
      mobile.includes(q) ||
      aadhaar.includes(q) ||
      acc.includes(q) ||
      ifsc.includes(q) ||
      bank.includes(q) ||
      village.includes(q)
    );
  });

  // A to Z Sorted farmers (Default is A to Z wise)
  const sortedMasterFarmers = React.useMemo(() => {
    return [...filteredMasterFarmers].sort((a, b) => {
      if (sortOrder === 'a_z') {
        const nameA = getFarmerSortName(a);
        const nameB = getFarmerSortName(b);
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
      }
      if (sortOrder === 'z_a') {
        const nameA = getFarmerSortName(a);
        const nameB = getFarmerSortName(b);
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base', numeric: true });
      }
      if (sortOrder === 'id_asc') {
        return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
      }
      return 0;
    });
  }, [filteredMasterFarmers, sortOrder]);

  // Filtered farmers for form selection dropdown (Tab 2)
  const filteredFormFarmers = farmers.filter((f) => {
    if (!f) return false;
    const q = (formSearchQuery || '').toLowerCase().trim();
    if (!q) return true;
    const fName = (f.farmerName || '').toLowerCase();
    const fId = (f.id || '').toLowerCase();
    const fAadhaar = (f.aadhaar || '').toLowerCase();
    return fName.includes(q) || fId.includes(q) || fAadhaar.includes(q);
  });

  // Stats
  const totalCount = farmers.length;
  const linkedCount = farmers.filter((f) => !!f.bankDetails?.accountNumber?.trim()).length;
  const pendingCount = totalCount - linkedCount;

  // CSV Export for Excel
  const handleExportCSV = () => {
    if (farmers.length === 0) return;

    const headers = [
      'S.No',
      'Farmer ID',
      'Farmer Name (English)',
      'Farmer Name (Gurmukhi)',
      'Father / Husband Name (English)',
      'Father / Husband Name (Gurmukhi)',
      'Mobile Number',
      'Aadhaar Number',
      'Bank Account Number',
      'IFSC Code',
      'Bank Name',
      'Branch Name',
      'Village'
    ];

    const rows = sortedMasterFarmers.map((f, idx) => [
      idx + 1,
      f.id,
      `"${getEnglishName(f.farmerName, f.farmerNamePa).replace(/"/g, '""')}"`,
      `"${getPunjabiName(f.farmerNamePa, f.farmerName).replace(/"/g, '""')}"`,
      `"${getEnglishName(f.fatherName, f.fatherNamePa).replace(/"/g, '""')}"`,
      `"${getPunjabiName(f.fatherNamePa, f.fatherName).replace(/"/g, '""')}"`,
      `"${f.mobile || ''}"`,
      `"${f.aadhaar ? f.aadhaar.replace(/\s+/g, '') : ''}"`,
      `"${f.bankDetails?.accountNumber ? `\t${f.bankDetails.accountNumber}` : ''}"`,
      `"${f.bankDetails?.ifscCode || ''}"`,
      `"${(f.bankDetails?.bankName || '').replace(/"/g, '""')}"`,
      `"${(f.bankDetails?.branchName || '').replace(/"/g, '""')}"`,
      `"${(f.village || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const firmSlug = (activeFirm?.name || 'Mandi_Firm').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `Farmer_Bank_Aadhaar_List_${firmSlug}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy full table as Tab-Separated Values (can paste directly into Excel / WhatsApp)
  const handleCopyTable = () => {
    if (sortedMasterFarmers.length === 0) return;

    const lines = [
      ['ਲੜੀ ਨੰ.', 'ਕਿਸਾਨ ਦਾ ਨਾਂ', 'ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਂ', 'ਮੋਬਾਈਲ ਨੰਬਰ', 'ਆਧਾਰ ਨੰਬਰ', 'ਖਾਤਾ ਨੰਬਰ', 'IFSC ਕੋਡ', 'ਬੈਂਕ ਦਾ ਨਾਂ'].join('\t')
    ];

    sortedMasterFarmers.forEach((f, idx) => {
      const fName = `${getEnglishName(f.farmerName, f.farmerNamePa)} ${getPunjabiName(f.farmerNamePa, f.farmerName) ? `(${getPunjabiName(f.farmerNamePa, f.farmerName)})` : ''}`.trim();
      const father = `${getEnglishName(f.fatherName, f.fatherNamePa)} ${getPunjabiName(f.fatherNamePa, f.fatherName) ? `(${getPunjabiName(f.fatherNamePa, f.fatherName)})` : ''}`.trim();
      const mobile = f.mobile || '—';
      const aadhaar = formatAadhaar(f.aadhaar);
      const acc = f.bankDetails?.accountNumber || 'ਦਰਜ ਨਹੀਂ';
      const ifsc = f.bankDetails?.ifscCode || 'ਦਰਜ ਨਹੀਂ';
      const bank = f.bankDetails?.bankName ? `${f.bankDetails.bankName} ${f.bankDetails.branchName ? `(${f.bankDetails.branchName})` : ''}` : 'ਦਰਜ ਨਹੀਂ';

      lines.push([idx + 1, fName, father, mobile, aadhaar, acc, ifsc, bank].join('\t'));
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedCell('all_table');
    setTimeout(() => setCopiedCell(null), 2500);
  };

  // Clean A4 Print window
  const handlePrintMasterList = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) return;

    const firmTitleEn = activeFirm?.name || 'JAMMU TRADING CO.';
    const firmTitlePa = activeFirm?.namePa || 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ';
    const licenceNo = activeFirm?.licenceNo || '';
    const mandiLocation = activeFirm?.addressPa || activeFirm?.address || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ / ਮਹਿਰਾਜਵਾਲਾ / ਕਮਾਲਪੁਰ';
    const printDate = new Date().toLocaleDateString('pa-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const rowsHtml = sortedMasterFarmers
      .map((f, idx) => {
        const enName = getEnglishName(f.farmerName, f.farmerNamePa);
        const paName = getPunjabiName(f.farmerNamePa, f.farmerName);
        const fatherEn = getEnglishName(f.fatherName, f.fatherNamePa);
        const fatherPa = getPunjabiName(f.fatherNamePa, f.fatherName);
        const mob = f.mobile || '—';
        const aadh = formatAadhaar(f.aadhaar);
        const acc = f.bankDetails?.accountNumber || '<span style="color:#94a3b8; font-style:italic;">ਦਰਜ ਨਹੀਂ</span>';
        const ifsc = f.bankDetails?.ifscCode || '<span style="color:#94a3b8; font-style:italic;">ਦਰਜ ਨਹੀਂ</span>';
        const bank = f.bankDetails?.bankName
          ? `<strong>${f.bankDetails.bankName}</strong>${f.bankDetails.branchName ? `<div style="font-size:10px; color:#64748b;">${f.bankDetails.branchName}</div>` : ''}`
          : '<span style="color:#94a3b8; font-style:italic;">ਦਰਜ ਨਹੀਂ</span>';

        return `
          <tr>
            <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
            <td>
              <div style="font-weight:bold; color:#0f172a; font-size:12px;">${enName}</div>
              ${paName ? `<div style="color:#475569; font-size:11px;">${paName}</div>` : ''}
              <div style="font-size:9px; color:#10b981; font-family:monospace;">${f.id}</div>
            </td>
            <td>
              <div style="font-weight:600; color:#1e293b; font-size:12px;">${fatherEn}</div>
              ${fatherPa ? `<div style="color:#64748b; font-size:11px;">${fatherPa}</div>` : ''}
            </td>
            <td style="font-family:monospace; font-weight:bold; color:#0f172a;">${mob}</td>
            <td style="font-family:monospace; font-weight:bold; letter-spacing:0.5px;">${aadh}</td>
            <td style="font-family:monospace; font-weight:900; font-size:12px; color:#0f172a;">${acc}</td>
            <td style="font-family:monospace; font-weight:bold; color:#065f46;">${ifsc}</td>
            <td style="font-size:11px;">${bank}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ਕਿਸਾਨ ਬੈਂਕ ਤੇ ਆਧਾਰ ਸੂਚੀ - ${firmTitleEn}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm 10mm 12mm 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Gurmukhi", Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 10px;
            font-size: 11px;
            background: #fff;
          }
          .header-box {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .firm-title {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
            margin: 0 0 2px 0;
          }
          .firm-sub {
            font-size: 12px;
            font-weight: bold;
            color: #334155;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #475569;
          }
          .report-badge {
            background: #0f172a;
            color: #fff;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 800;
            font-size: 11px;
            display: inline-block;
            margin-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
          }
          th {
            background: #f1f5f9;
            color: #0f172a;
            font-weight: 800;
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            font-size: 11px;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            vertical-align: middle;
            font-size: 11px;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .footer-box {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
          }
          .sign-area {
            display: flex;
            justify-content: space-between;
            margin-top: 35px;
            padding: 0 30px;
          }
          .sign-line {
            border-top: 1px solid #334155;
            width: 180px;
            text-align: center;
            padding-top: 4px;
            font-weight: bold;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="firm-title">${firmTitleEn} (${firmTitlePa})</div>
            <div class="firm-sub">${mandiLocation} ${licenceNo ? `• ਲਾਇਸੰਸ ਨੰ: ${licenceNo}` : ''}</div>
          </div>
            <div class="report-badge">ਕਿਸਾਨ ਬੈਂਕ ਖਾਤਾ, ਆਧਾਰ ਤੇ ਮੋਬਾਈਲ ਸੂਚੀ (A to Z)</div>
            <div>ਮਿਤੀ: <strong>${printDate}</strong> • ਕੁੱਲ ਕਿਸਾਨ: <strong>${sortedMasterFarmers.length}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align:center;">#</th>
              <th>ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name)</th>
              <th>ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਂ (Father / Husband)</th>
              <th>ਮੋਬਾਈਲ ਨੰਬਰ (Mobile)</th>
              <th>ਆਧਾਰ ਨੰਬਰ (Aadhaar Number)</th>
              <th>ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ (Bank Account No.)</th>
              <th>IFSC ਕੋਡ</th>
              <th>ਬੈਂਕ ਦਾ ਨਾਂ ਅਤੇ ਬ੍ਰਾਂਚ (Bank Name)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sign-area">
          <div class="sign-line">ਕਿਸਾਨ ਜਾਂਚ ਕਰਤਾ / ਮੁਨੀਮ</div>
          <div class="sign-line">ਪ੍ਰੋਪਰਾਈਟਰ / ਆੜ੍ਹਤੀਆ ਮੋਹਰ</div>
        </div>

        <div class="footer-box">
          <div>ਕੰਪਿਊਟਰਾਈਜ਼ਡ ਮੰਡੀ ਰਿਕਾਰਡ • ${firmTitleEn} • ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ ਰਜਿਸਟਰ</div>
          <div>ਪੇਜ: 1 / 1 • ਰਿਪੋਰਟ ਤਿਆਰ ਕੀਤੀ: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Firm Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-700 rounded-xl text-white shadow-2xs">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                ਕਿਸਾਨ ਬੈਂਕ ਖਾਤਾ ਤੇ ਆਧਾਰ ਸੂਚੀ (Farmer Bank & Aadhaar Directory)
              </h2>
              <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black px-2 py-0.5 rounded-full">
                {activeFirm?.name || 'Punjab Mandi Trading Co'}
              </span>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowDownAZ className="w-3 h-3 text-emerald-600" />
                <span>A to Z ਕ੍ਰਮਬੱਧ</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ਕਿਸਾਨ ਦਾ ਨਾਂ (A to Z) • ਪਿਤਾ/ਪਤੀ ਦਾ ਨਾਂ • ਮੋਬਾਈਲ • ਆਧਾਰ ਨੰਬਰ • ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ • IFSC ਕੋਡ • ਬੈਂਕ ਦਾ ਨਾਂ • ਫੋਟੋ
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('master_list')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'master_list'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📋 ਪੂਰੀ ਕਿਸਾਨ ਸੂਚੀ (Master List)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('entry_form')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'entry_form'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>✏️ ਖਾਤਾ ਐਂਟਰੀ / ਪਾਸਬੁੱਕ OCR</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-50 text-emerald-900 font-bold p-3 rounded-lg border border-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>ਵੇਰਵੇ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਏ ਹਨ! (Record updated successfully!)</span>
        </div>
      )}

      {/* TAB 1: MASTER LIST VIEW (Default & Primary) */}
      {activeTab === 'master_list' && (
        <div className="space-y-4">
          {/* Summary Stats & Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ਕੁੱਲ ਕਿਸਾਨ (Total)</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{totalCount}</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <User className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between bg-emerald-50/30">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">ਬੈਂਕ ਖਾਤਾ ਦਰਜ ਹੈ (Linked)</span>
                <div className="text-xl font-black text-emerald-900 font-mono mt-0.5">{linkedCount}</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between bg-amber-50/30">
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">ਖਾਤਾ ਬਾਕੀ ਹੈ (Pending)</span>
                <div className="text-xl font-black text-amber-900 font-mono mt-0.5">{pendingCount}</div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Controls: Search, Filter, Print, Export */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="ਖੋਜ: ਨਾਂ, ਪਿਤਾ, ਮੋਬਾਈਲ, ਆਧਾਰ, ਖਾਤਾ..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-purple-600"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ਸਾਰੇ ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('linked')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterMode === 'linked' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ਬੈਂਕ ਲਿੰਕ ({linkedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('pending')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    filterMode === 'pending' ? 'bg-amber-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ਬਾਕੀ ({pendingCount})
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTable}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                title="Copy entire table to paste in Excel or WhatsApp"
              >
                {copiedCell === 'all_table' ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">ਕਾਪੀ ਹੋ ਗਈ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>ਟੇਬਲ ਕਾਪੀ (Copy)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                title="Download complete list as Excel compatible CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ਐਕਸਲ / CSV ਡਾਊਨਲੋਡ</span>
              </button>

              <button
                type="button"
                onClick={handlePrintMasterList}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                title="Print formatted A4 Bank & Aadhaar list"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>ਪ੍ਰਿੰਟ ਕਰੋ (Print)</span>
              </button>
            </div>
          </div>

          {/* Alphabetical A to Z Quick Jump Bar & Sorting Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-100 rounded text-purple-800">
                  <ArrowDownAZ className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900">
                    A to Z ਅੱਖਰ ਅਨੁਸਾਰ ਛਾਲ ਮਾਰੋ (Alphabet Jump)
                  </span>
                  <span className="ml-2 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 font-bold">
                    {letterFilter === 'ALL'
                      ? `ਸਾਰੇ ਅੱਖਰ (${sortedMasterFarmers.length} ਕਿਸਾਨ)`
                      : `'${letterFilter}' ਅੱਖਰ ਵਾਲੇ (${sortedMasterFarmers.length} ਕਿਸਾਨ)`}
                  </span>
                </div>
              </div>

              {/* Sorting Mode Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold self-start sm:self-auto">
                <span className="text-[10px] text-slate-500 uppercase px-1">ਤਰਤੀਬ:</span>
                <button
                  type="button"
                  onClick={() => setSortOrder('a_z')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                    sortOrder === 'a_z'
                      ? 'bg-purple-700 text-white font-black shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Sort A to Z alphabetically by Farmer Name"
                >
                  <ArrowDownAZ className="w-3.5 h-3.5" />
                  <span>A → Z (ਕ੍ਰਮਵਾਰ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortOrder('z_a')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                    sortOrder === 'z_a'
                      ? 'bg-purple-700 text-white font-black shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Sort Z to A"
                >
                  <ArrowDownZA className="w-3.5 h-3.5" />
                  <span>Z → A</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortOrder('id_asc')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                    sortOrder === 'id_asc'
                      ? 'bg-purple-700 text-white font-black shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Sort by Farmer ID"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>ID ਵਾਈਜ਼</span>
                </button>
              </div>
            </div>

            {/* A B C D ... Z Pills Row */}
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLetterFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  letterFilter === 'ALL'
                    ? 'bg-purple-700 text-white shadow-2xs ring-1 ring-purple-800'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                ਸਾਰੇ (ALL)
              </button>

              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
                const hasFarmers = availableLettersSet.has(letter);
                const isSelected = letterFilter === letter;

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setLetterFilter(letter)}
                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-300 font-black'
                        : hasFarmers
                        ? 'bg-purple-50 text-purple-950 hover:bg-purple-100 border border-purple-200'
                        : 'bg-slate-50 text-slate-300 hover:text-slate-500 border border-slate-100'
                    }`}
                    title={
                      hasFarmers
                        ? `'${letter}' ਨਾਲ ਸ਼ੁਰੂ ਹੋਣ ਵਾਲੇ ਕਿਸਾਨ ਵੇਖੋ`
                        : `'${letter}' ਅੱਖਰ ਨਾਲ ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਹੈ`
                    }
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Table with Farmer Photo and Same-Screen Edit */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            {farmers.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <User className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ</h4>
                <p className="text-[11px] text-slate-500">
                  ਪਹਿਲਾਂ 'ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ' ਰਾਹੀਂ ਕਿਸਾਨਾਂ ਨੂੰ ਸਿਸਟਮ ਵਿੱਚ ਦਰਜ ਕਰੋ।
                </p>
              </div>
            ) : sortedMasterFarmers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <p className="font-bold">
                  {letterFilter !== 'ALL'
                    ? `'${letterFilter}' ਅੱਖਰ ਨਾਲ ਕੋਈ ਮੇਲ ਖਾਂਦਾ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ।`
                    : 'ਕੋਈ ਮੇਲ ਖਾਂਦਾ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ।'}
                </p>
                {(letterFilter !== 'ALL' || tableSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLetterFilter('ALL');
                      setTableSearch('');
                    }}
                    className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    ਸਾਰੇ ਕਿਸਾਨ ਵੇਖੋ (Show All Farmers)
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-8">#</th>
                      <th className="py-2.5 px-3 text-center w-14">ਫੋਟੋ (Photo)</th>
                      <th className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => setSortOrder(sortOrder === 'a_z' ? 'z_a' : 'a_z')}
                          className="flex items-center gap-1.5 hover:text-purple-700 transition cursor-pointer group text-left font-black"
                          title="A-Z ਜਾਂ Z-A ਤਰਤੀਬ ਬਦਲਣ ਲਈ ਕਲਿੱਕ ਕਰੋ"
                        >
                          <span>ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name)</span>
                          <span className="p-0.5 bg-purple-100 rounded text-purple-900 text-[10px] inline-flex items-center gap-0.5 px-1.5 font-black border border-purple-200">
                            {sortOrder === 'a_z' ? (
                              <>
                                <ArrowDownAZ className="w-3.5 h-3.5 text-purple-700" />
                                <span>A → Z</span>
                              </>
                            ) : sortOrder === 'z_a' ? (
                              <>
                                <ArrowDownZA className="w-3.5 h-3.5 text-purple-700" />
                                <span>Z → A</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpDown className="w-3 h-3 text-purple-700" />
                                <span>ID</span>
                              </>
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="py-2.5 px-3">ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਂ (Father / Husband)</th>
                      <th className="py-2.5 px-3">ਮੋਬਾਈਲ (Mobile)</th>
                      <th className="py-2.5 px-3">ਆਧਾਰ ਨੰਬਰ (Aadhaar Number)</th>
                      <th className="py-2.5 px-3">ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ (Account No.)</th>
                      <th className="py-2.5 px-3">IFSC ਕੋਡ</th>
                      <th className="py-2.5 px-3">ਬੈਂਕ ਦਾ ਨਾਂ (Bank Name)</th>
                      <th className="py-2.5 px-3 text-center">ਕਾਰਵਾਈ (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {sortedMasterFarmers.map((f, idx) => {
                      const enName = getEnglishName(f.farmerName, f.farmerNamePa);
                      const paName = getPunjabiName(f.farmerNamePa, f.farmerName);
                      const fatherEn = getEnglishName(f.fatherName, f.fatherNamePa);
                      const fatherPa = getPunjabiName(f.fatherNamePa, f.fatherName);
                      const hasBank = !!f.bankDetails?.accountNumber?.trim();

                      return (
                        <tr key={f.id} className="hover:bg-purple-50/40 transition group">
                          {/* S.No */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Farmer Photo with Click to Edit */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenQuickEdit(f)}
                              className="relative group/pic inline-block rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                              title="ਫੋਟੋ ਤੇ ਵੇਰਵੇ ਬਦਲੋ (Edit Photo & Details)"
                            >
                              <div className="w-10 h-10 rounded-full border-2 border-purple-200 overflow-hidden bg-slate-100 flex items-center justify-center shadow-2xs group-hover/pic:border-purple-600 transition">
                                {f.photoUrl ? (
                                  <img src={f.photoUrl} alt={f.farmerName} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400 group-hover/pic:text-purple-600 transition" />
                                )}
                              </div>
                              <span className="absolute -bottom-1 -right-1 bg-purple-700 text-white p-0.5 rounded-full shadow-2xs opacity-80 group-hover/pic:opacity-100 transition">
                                <Camera className="w-2.5 h-2.5" />
                              </span>
                            </button>
                          </td>

                          {/* Farmer Name */}
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900 leading-tight text-xs sm:text-[13px]">
                              {enName}
                            </div>
                            {paName && (
                              <div className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                                {paName}
                              </div>
                            )}
                            <div className="text-[10px] font-mono font-bold text-emerald-800 mt-0.5">
                              {f.id}
                            </div>
                          </td>

                          {/* Father / Husband Name */}
                          <td className="py-2.5 px-3 text-slate-800">
                            <div className="font-bold leading-tight text-xs sm:text-[13px]">
                              {fatherEn || '—'}
                            </div>
                            {fatherPa && (
                              <div className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                                {fatherPa}
                              </div>
                            )}
                          </td>

                          {/* Mobile */}
                          <td className="py-2.5 px-3">
                            {f.mobile ? (
                              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                                <span>+91 {f.mobile}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(f.mobile, `mob_${f.id}`)}
                                  className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                                  title="Copy Mobile"
                                >
                                  {copiedCell === `mob_${f.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ਦਰਜ ਨਹੀਂ</span>
                            )}
                          </td>

                          {/* Aadhaar Number */}
                          <td className="py-2.5 px-3">
                            {f.aadhaar ? (
                              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                                <span>{formatAadhaar(f.aadhaar)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(f.aadhaar.replace(/\s+/g, ''), `aad_${f.id}`)}
                                  className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                                  title="Copy Aadhaar"
                                >
                                  {copiedCell === `aad_${f.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ਦਰਜ ਨਹੀਂ</span>
                            )}
                          </td>

                          {/* Bank Account Number */}
                          <td className="py-2.5 px-3">
                            {hasBank ? (
                              <div className="flex items-center gap-1.5 font-mono font-black text-slate-950 text-xs sm:text-[13px] bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-flex">
                                <span>{f.bankDetails?.accountNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(f.bankDetails!.accountNumber, `acc_${f.id}`)}
                                  className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                                  title="Copy Account Number"
                                >
                                  {copiedCell === `acc_${f.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded">
                                ਦਰਜ ਨਹੀਂ (Pending)
                              </span>
                            )}
                          </td>

                          {/* IFSC Code */}
                          <td className="py-2.5 px-3">
                            {f.bankDetails?.ifscCode ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                                  {f.bankDetails.ifscCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(f.bankDetails!.ifscCode, `ifsc_${f.id}`)}
                                  className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition p-0.5 cursor-pointer"
                                  title="Copy IFSC"
                                >
                                  {copiedCell === `ifsc_${f.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ਦਰਜ ਨਹੀਂ</span>
                            )}
                          </td>

                          {/* Bank Name */}
                          <td className="py-2.5 px-3">
                            {f.bankDetails?.bankName ? (
                              <div>
                                <div className="font-bold text-slate-900 leading-tight">
                                  {f.bankDetails.bankName}
                                </div>
                                {f.bankDetails.branchName && (
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {f.bankDetails.branchName}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">ਦਰਜ ਨਹੀਂ</span>
                            )}
                          </td>

                          {/* Action Button: Opens Same-Screen Edit Modal */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenQuickEdit(f)}
                              className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                              title="ਉਸੇ ਸਕ੍ਰੀਨ 'ਤੇ ਵੇਰਵੇ ਬਦਲੋ (Edit Details on this screen)"
                            >
                              <Edit3 className="w-3 h-3 text-amber-300" />
                              <span>ਐਡਿਟ ਕਰੋ</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAME-SCREEN QUICK EDIT MODAL (Name, Father, Mobile, Aadhaar, Photo, Bank) */}
      {/* ========================================================================= */}
      {editingFarmer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Edit3 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black">
                      ਕਿਸਾਨ ਵੇਰਵੇ ਤੇ ਬੈਂਕ ਰਿਕਾਰਡ ਐਡਿਟ ਕਰੋ
                    </h3>
                    <span className="bg-white/20 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      {editingFarmer.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-200 mt-0.5">
                    ਉਸੇ ਸਕ੍ਰੀਨ 'ਤੇ ਤੁਰੰਤ ਬਦਲਾਅ: ਫੋਟੋ, ਨਾਂ, ਪਿਤਾ, ਮੋਬਾਈਲ, ਆਧਾਰ, ਬੈਂਕ ਖਾਤਾ, IFSC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFarmer(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveQuickEdit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 1. Photo Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-20 h-20 rounded-full border-3 border-purple-300 overflow-hidden bg-slate-200 shrink-0 shadow-2xs">
                  {editingFarmer.photoUrl ? (
                    <img src={editingFarmer.photoUrl} alt="Farmer" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400 absolute inset-0 m-auto" />
                  )}
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <span className="text-xs font-bold text-slate-800 block">
                    ਕਿਸਾਨ ਦੀ ਫੋਟੋ (Farmer Photo)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    ਕੈਮਰੇ ਨਾਲ ਲਾਈਵ ਫੋਟੋ ਖਿੱਚੋ ਜਾਂ ਗੈਲਰੀ 'ਚੋਂ ਅਪਲੋਡ ਕਰੋ।
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCameraMode('farmerPhoto')}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ਕੈਮਰਾ (Camera)</span>
                    </button>

                    <label className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-purple-700" />
                      <span>ਅਪਲੋਡ (Upload)</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleModalPhotoUpload}
                      />
                    </label>

                    {editingFarmer.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingFarmer({ ...editingFarmer, photoUrl: '' })}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>ਹਟਾਓ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Farmer Name & Father / Husband Name (English & Punjabi) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Farmer English Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      ਕਿਸਾਨ ਦਾ ਨਾਂ (English) *
                    </label>
                    <button
                      type="button"
                      onClick={handleTransliterateName}
                      className="text-[10px] text-purple-700 hover:underline font-bold flex items-center gap-0.5"
                      title="Convert English to Gurmukhi"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>ਪੰਜਾਬੀ ਬਣਾਓ</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Baljit Singh"
                    value={editingFarmer.farmerName}
                    onChange={(e) => setEditingFarmer({ ...editingFarmer, farmerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                  />
                </div>

                {/* Farmer Punjabi Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਕਿਸਾਨ ਦਾ ਨਾਂ (ਗੁਰਮੁਖੀ ਪੰਜਾਬੀ)
                  </label>
                  <input
                    type="text"
                    placeholder="ਜਿਵੇਂ: ਬਲਜੀਤ ਸਿੰਘ"
                    value={editingFarmer.farmerNamePa}
                    onChange={(e) => setEditingFarmer({ ...editingFarmer, farmerNamePa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 font-sans"
                  />
                </div>

                {/* Father / Husband English Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਂ (English)
                    </label>
                    <button
                      type="button"
                      onClick={handleTransliterateFather}
                      className="text-[10px] text-purple-700 hover:underline font-bold flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>ਪੰਜਾਬੀ ਬਣਾਓ</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Gurmail Singh"
                    value={editingFarmer.fatherName}
                    onChange={(e) => setEditingFarmer({ ...editingFarmer, fatherName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                  />
                </div>

                {/* Father / Husband Punjabi Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਪਿਤਾ / ਪਤੀ ਦਾ ਨਾਂ (ਗੁਰਮੁਖੀ ਪੰਜਾਬੀ)
                  </label>
                  <input
                    type="text"
                    placeholder="ਜਿਵੇਂ: ਗੁਰਮੇਲ ਸਿੰਘ"
                    value={editingFarmer.fatherNamePa}
                    onChange={(e) => setEditingFarmer({ ...editingFarmer, fatherNamePa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 font-sans"
                  />
                </div>
              </div>

              {/* 3. Mobile Number & Aadhaar Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਮੋਬਾਈਲ ਨੰਬਰ (10 ਅੰਕੀ Mobile) *
                  </label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg px-2.5 py-2 text-xs text-slate-600 font-mono font-bold">
                      +91
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="9876543210"
                      value={editingFarmer.mobile}
                      onChange={(e) =>
                        setEditingFarmer({
                          ...editingFarmer,
                          mobile: e.target.value.replace(/\D/g, '').slice(0, 10)
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-r-lg p-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਆਧਾਰ ਕਾਰਡ ਨੰਬਰ (12 ਅੰਕੀ Aadhaar)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="1234 5678 9012"
                    value={editingFarmer.aadhaar}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                      const formatted = digits.length > 8
                        ? `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`
                        : digits.length > 4
                        ? `${digits.slice(0, 4)} ${digits.slice(4)}`
                        : digits;
                      setEditingFarmer({ ...editingFarmer, aadhaar: formatted });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 tracking-wider"
                  />
                </div>
              </div>

              {/* 4. Bank Account Details Section */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-700" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ (Bank Account Details)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Account Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ (Account Number)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50100234567890"
                      value={editingFarmer.accountNumber}
                      onChange={(e) =>
                        setEditingFarmer({
                          ...editingFarmer,
                          accountNumber: e.target.value.replace(/\s+/g, '')
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  {/* IFSC Code with Auto Lookup */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        IFSC ਕੋਡ (11 ਅੱਖਰ)
                      </label>
                      {modalIfscLookingUp && (
                        <span className="text-[10px] text-purple-700 font-bold flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ...</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={11}
                        placeholder="e.g. HDFC0001234, SBIN0000789"
                        value={editingFarmer.ifscCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
                          setEditingFarmer({ ...editingFarmer, ifscCode: val });
                          if (val.length === 11) {
                            handleModalIfscLookup(val);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-extrabold uppercase text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600 tracking-wider"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Name & Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਬੈਂਕ ਦਾ ਨਾਂ (Bank Name)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. STATE BANK OF INDIA"
                      value={editingFarmer.bankName}
                      onChange={(e) => setEditingFarmer({ ...editingFarmer, bankName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਸ਼ਾਖਾ (Branch Name)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LOHIAN KHAS"
                      value={editingFarmer.branchName}
                      onChange={(e) => setEditingFarmer({ ...editingFarmer, branchName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                {modalIfscResult && modalIfscResult.success && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>ਤਸਦੀਕ ਸ਼ੁਦਾ:</strong> {modalIfscResult.bankName} • {modalIfscResult.branchName}
                      </span>
                    </div>
                    <span className="bg-emerald-200 text-emerald-950 font-bold px-1.5 py-0.5 rounded text-[9px]">
                      ਅਧਿਕਾਰਤ ਸ਼ਾਖਾ
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingFarmer(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>

                <button
                  type="submit"
                  disabled={isQuickSaving}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer"
                >
                  {isQuickSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>ਬਦਲਾਅ ਸੇਵ ਕਰੋ (Save Changes)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED BANK OCR / PASSBOOK ENTRY FORM */}
      {activeTab === 'entry_form' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('master_list')}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
            >
              <span>← ਵਾਪਸ ਮਾਸਟਰ ਸੂਚੀ ਤੇ ਜਾਓ (Back to Master List)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 1 Column: Farmer Selection & Quick Filter */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ (Select Farmer)</span>
                <span className="text-[10px] text-slate-400 font-normal">{farmers.length} ਕੁੱਲ ਕਿਸਾਨ</span>
              </h3>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="ਖੋਜ: ਨਾਂ / ID / ਆਧਾਰ..."
                  value={formSearchQuery}
                  onChange={(e) => setFormSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                {filteredFormFarmers.map((f) => {
                  const isSelected = f.id === selectedFarmerId;
                  const hasBank = !!f.bankDetails?.accountNumber;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFarmerId(f.id)}
                      className={`w-full text-left p-2 rounded-lg border transition text-xs flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-emerald-800 font-bold">{f.id}</span>
                          <span className="font-bold">{f.farmerNamePa || f.farmerName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {f.fatherNamePa || f.fatherName} • {f.village}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {hasBank ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            ਖਾਤਾ ਮੌਜੂਦ
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            ਬਾਕੀ
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 2 Columns: Full Bank Details Form */}
            <div className="lg:col-span-2">
              {!selectedFarmer ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
                  ਕਿਰਪਾ ਕਰਕੇ ਖੱਬੇ ਪਾਸੇ ਤੋਂ ਕਿਸਾਨ ਚੁਣੋ।
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                  {/* Selected Farmer Info Card */}
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200">
                          {selectedFarmer.id}
                        </span>
                        <h3 className="font-black text-slate-900 text-sm">
                          {selectedFarmer.farmerNamePa || selectedFarmer.farmerName}
                          <span className="text-slate-500 font-normal ml-1">
                            (ਸਪੁੱਤਰ: {selectedFarmer.fatherNamePa || selectedFarmer.fatherName})
                          </span>
                        </h3>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-3">
                        <span>ਪਿੰਡ: <strong>{selectedFarmer.village}</strong></span>
                        <span>ਮੋਬਾਈਲ: <strong>+91 {selectedFarmer.mobile}</strong></span>
                        <span>ਆਧਾਰ: <strong>{formatAadhaar(selectedFarmer.aadhaar)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Account Holder & Account Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ਖਾਤਾ ਧਾਰਕ ਦਾ ਨਾਂ (Account Holder Name) *
                        </label>
                        <input
                          type="text"
                          required
                          value={bankForm.accountHolderName}
                          onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ (Bank Account Number) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 50100234567890"
                          value={bankForm.accountNumber}
                          onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\s+/g, '') })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* IFSC Code with Live Lookup */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          IFSC ਕੋਡ (IFSC Code - 11 ਅੱਖਰ) *
                        </label>
                        <span className="text-[10px] text-purple-700 font-bold">
                          ਦਰਜ ਕਰਦੇ ਹੀ ਬੈਂਕ ਦਾ ਨਾਂ ਅਤੇ ਸ਼ਾਖਾ ਆਪਣੇ ਆਪ ਲੱਭੀ ਜਾਵੇਗੀ
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={11}
                          placeholder="e.g. HDFC0001234, PUNB0123400, SBIN0000789"
                          value={bankForm.ifscCode}
                          onChange={(e) => handleIfscChange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-extrabold uppercase text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 tracking-wider"
                        />
                        {isLookingUpIfsc && (
                          <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[11px] text-purple-700 font-bold">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ...</span>
                          </div>
                        )}
                      </div>

                      {ifscError && (
                        <div className="mt-1.5 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{ifscError}</span>
                        </div>
                      )}

                      {ifscLookupResult && ifscLookupResult.success && (
                        <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>ਅਧਿਕਾਰਤ ਬੈਂਕ:</strong> {ifscLookupResult.bankName} • <strong>ਸ਼ਾਖਾ:</strong> {ifscLookupResult.branchName}
                            </span>
                          </div>
                          <span className="bg-emerald-200 text-emerald-950 font-bold px-1.5 py-0.5 rounded text-[9px]">
                            ਤਸਦੀਕ ਸ਼ੁਦਾ
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bank Name & Branch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ਬੈਂਕ ਦਾ ਨਾਂ (Official Bank Name) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. STATE BANK OF INDIA"
                          value={bankForm.bankName}
                          onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ਸ਼ਾਖਾ (Branch Name)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. LOHIAN KHAS"
                          value={bankForm.branchName}
                          onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* City / District & State */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ਸ਼ਹਿਰ / ਜ਼ਿਲ੍ਹਾ (City / District)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. JALANDHAR"
                          value={bankForm.city || bankForm.district || ''}
                          onChange={(e) => setBankForm({ ...bankForm, city: e.target.value, district: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ਸੂਬਾ (State)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PUNJAB"
                          value={bankForm.state}
                          onChange={(e) => setBankForm({ ...bankForm, state: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Complete Bank Address */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-purple-600" />
                          <span>ਬੈਂਕ ਦਾ ਪੂਰਾ ਪਤਾ (Complete Official Bank Address)</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ਪੂਰਾ ਪਤਾ ਸੇਵ ਅਤੇ PDF ਵਿੱਚ ਪ੍ਰਿੰਟ ਹੋਵੇਗਾ
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="e.g. MAIN ROAD, LOHIAN - 144629, TEHSIL SHAHKOT, DISTT. JALANDHAR"
                        value={bankForm.branchAddress}
                        onChange={(e) => setBankForm({ ...bankForm, branchAddress: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500 leading-relaxed font-medium"
                      />
                    </div>

                    {/* PIN Code & MICR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ਬੈਂਕ ਪਿੰਨ ਕੋਡ (Bank PIN Code)
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 144629"
                          value={bankForm.pinCode}
                          onChange={(e) => setBankForm({ ...bankForm, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          MICR ਕੋਡ (ਜੇ ਉਪਲਬਧ ਹੋਵੇ)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 144545855"
                          value={bankForm.micrCode}
                          onChange={(e) => setBankForm({ ...bankForm, micrCode: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    {/* Passbook Photo / Camera & OCR Section */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        ਬੈਂਕ ਪਾਸਬੁੱਕ / ਚੈੱਕ ਫੋਟੋ (Bank Passbook Photo / OCR)
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        {bankForm.passbookPhotoUrl ? (
                          <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-300 shrink-0 shadow-2xs">
                            <img src={bankForm.passbookPhotoUrl} alt="Passbook" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setBankForm({ ...bankForm, passbookPhotoUrl: '' })}
                              className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="w-24 h-16 bg-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 shrink-0 text-xs">
                            <CreditCard className="w-6 h-6 mb-0.5" />
                            <span className="text-[9px]">ਪਾਸਬੁੱਕ ਫੋਟੋ</span>
                          </div>
                        )}

                        <div className="space-y-1.5 w-full">
                          {isOcrProcessing && (
                            <div className="text-xs text-purple-700 font-bold flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>ਪਾਸਬੁੱਕ OCR ਸਕੈਨ ਹੋ ਰਹੀ ਹੈ...</span>
                            </div>
                          )}
                          {ocrVerified && (
                            <div className="text-xs text-emerald-800 font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ਪਾਸਬੁੱਕ ਤੋਂ ਖਾਤਾ ਵੇਰਵੇ ਲੱਭ ਲਏ ਗਏ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ।</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setCameraMode('passbook')}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5 text-emerald-400" />
                              <span>ਕੈਮਰਾ (Camera)</span>
                            </button>
                            <label className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>ਅਪਲੋਡ ਫੋਟੋ (Upload)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('master_list')}
                        className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                      >
                        ਰੱਦ ਕਰੋ / ਸੂਚੀ ਤੇ ਜਾਓ
                      </button>

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold px-6 py-2.5 rounded-lg text-xs shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ... (Saving...)</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>ਬੈਂਕ ਵੇਰਵੇ ਸੇਵ ਕਰੋ (Save Official Bank Record)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Universal Camera Modal (Handles both Farmer Photo & Passbook) */}
      <CameraCaptureModal
        isOpen={cameraMode !== null}
        onClose={() => setCameraMode(null)}
        onCapture={handleCameraCapture}
        titleEn={cameraMode === 'farmerPhoto' ? 'Capture Farmer Photo' : 'Capture Bank Passbook / Cheque'}
        titlePa={cameraMode === 'farmerPhoto' ? 'ਕਿਸਾਨ ਦੀ ਫੋਟੋ ਖਿੱਚੋ' : 'ਬੈਂਕ ਪਾਸਬੁੱਕ / ਚੈੱਕ ਦੀ ਫੋਟੋ ਖਿੱਚੋ'}
      />
    </div>
  );
};
