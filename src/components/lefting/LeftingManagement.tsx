import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { LeftingRecord, BardanaType, SellerMaster } from '../../types/mandi';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  Truck,
  FileText,
  Calendar,
  Building2,
  PackageCheck,
  Scale,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  FileDown,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  Upload,
  Phone,
  Check,
  X,
  MapPin,
  Building,
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { formatCurrencyINR, autoFormatDate, FIXED_BAG_WEIGHT_KG } from '../../utils/calculations';
import { exportLeftingVoucherPDF } from '../../utils/leftingPdfExport';
import { SellerMasterModal } from '../seller/SellerMasterModal';
import { TruckMasterModal } from '../truck/TruckMasterModal';
import { DateInput } from '../common/DateInput';

const STANDARD_AGENCIES = [
  'Punjab Mandi Board Agency',
  'Pungrain (ਪਨਗ੍ਰੇਨ)',
  'Markfed (ਮਾਰਕਫੈੱਡ)',
  'Punsup (ਪਨਸਪ)',
  'PSWC (ਪੰਜਾਬ ਸਟੇਟ ਵੇਅਰਹਾਊਸਿੰਗ)',
  'FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)'
];

export const LeftingManagement: React.FC = () => {
  const {
    leftingRecords,
    dailyPurchaseRecords,
    sellers,
    trucks,
    settings,
    addLeftingRecord,
    updateLeftingRecord,
    deleteLeftingRecord,
    language
  } = useMandi();

  const isEn = language === 'en';

  const { notifySaveSuccess, notifyDeleteSuccess, notifyError, confirmDelete } = useNotification();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dispatch' | 'history'>('dispatch');

  // Form State
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [date, setDate] = useState<string>(getTodayFormatted());
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [agency, setAgency] = useState<string>(STANDARD_AGENCIES[1]); // Pungrain default
  const [customAgency, setCustomAgency] = useState<string>('');
  const [shellerName, setShellerName] = useState<string>('');
  const [sellerAddress, setSellerAddress] = useState<string>('');
  const [sellerMobile, setSellerMobile] = useState<string>('');
  const [truckNo, setTruckNo] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [gatePassNo, setGatePassNo] = useState<string>('');
  const [bags, setBags] = useState<string>('');
  const [bardanaType, setBardanaType] = useState<BardanaType>('NEW');
  const [newBagsCount, setNewBagsCount] = useState<string>('');
  const [oldBagsCount, setOldBagsCount] = useState<string>('');
  const [customWeightKg, setCustomWeightKg] = useState<string>('');
  const [status, setStatus] = useState<'DISPATCHED' | 'DELIVERED'>('DISPATCHED');
  const [remarks, setRemarks] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Seller & Truck Master Modal States
  const [isSellerModalOpen, setIsSellerModalOpen] = useState<boolean>(false);
  const [isTruckModalOpen, setIsTruckModalOpen] = useState<boolean>(false);
  const [showTruckSuggestions, setShowTruckSuggestions] = useState<boolean>(false);

  // Filter matching trucks based on full number or last 4 digits (e.g. 9596)
  const matchedTrucks = useMemo(() => {
    if (!truckNo.trim()) return [];
    const query = truckNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return trucks.filter((t) => {
      const cleanNo = t.truckNo.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return cleanNo.includes(query) || cleanNo.endsWith(query) || t.truckNo.toUpperCase().includes(truckNo.trim().toUpperCase());
    }).slice(0, 8);
  }, [trucks, truckNo]);

  // Table Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [viewRecord, setViewRecord] = useState<LeftingRecord | null>(null);
  const [editRecord, setEditRecord] = useState<LeftingRecord | null>(null);

  // Edit Modal Form State
  const [editStatus, setEditStatus] = useState<'DISPATCHED' | 'DELIVERED' | 'REJECTED_PARTIAL'>('DISPATCHED');
  const [editRejectedBags, setEditRejectedBags] = useState<string>('0');
  const [editShortageKg, setEditShortageKg] = useState<string>('0');
  const [editReceivingDate, setEditReceivingDate] = useState<string>('');
  const [editRemarks, setEditRemarks] = useState<string>('');

  const agencyOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = STANDARD_AGENCIES.map((ag) => ({
      value: ag,
      label: isEn ? ag.split('(')[0].trim() : ag,
      subLabel: isEn ? ag.split('(')[1]?.replace(')', '') : undefined,
      keywords: [ag]
    }));
    opts.push({
      value: 'CUSTOM',
      label: isEn ? '+ Other Custom Agency' : '+ ਹੋਰ ਏਜੰਸੀ (Custom)',
      keywords: ['custom', 'other']
    });
    return opts;
  }, [isEn]);

  const sellerOptions: SearchableSelectOption[] = useMemo(() => {
    return sellers.map((s) => ({
      value: s.id,
      label: isEn ? s.name : `${s.name} ${s.namePa ? `(${s.namePa})` : ''}`,
      subLabel: `${isEn ? 'Location' : 'ਪਤਾ'}: ${s.address || s.city || '-'}`,
      badge: s.licenceNo || undefined,
      keywords: [s.name, s.namePa || '', s.address || '', s.city || '', s.phone || '', s.mobile || '']
    }));
  }, [sellers, isEn]);

  const truckOptions: SearchableSelectOption[] = useMemo(() => {
    return trucks.map((t) => ({
      value: t.truckNo,
      label: t.truckNo,
      subLabel: t.driverName ? `${isEn ? 'Driver' : 'ਡਰਾਈਵਰ'}: ${t.driverName}${t.driverMobile ? ` (${t.driverMobile})` : ''}` : undefined,
      badge: t.truckNo.slice(-4),
      keywords: [t.truckNo, t.driverName || '', t.driverMobile || '']
    }));
  }, [trucks, isEn]);

  const bardanaTypeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'NEW', label: isEn ? 'New Bags' : 'ਨਵਾਂ ਬਾਰਦਾਨਾ (New Bags)' },
    { value: 'OLD', label: isEn ? 'Old Bags' : 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Bags)' },
    { value: 'BOTH', label: isEn ? 'Both (New + Old Mixed)' : 'ਦੋਵੇਂ (New + Old Mixed)' }
  ], [isEn]);

  const filterAgencyOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'ALL', label: isEn ? 'All Agencies' : 'ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)' },
    ...STANDARD_AGENCIES.map((ag) => ({
      value: ag,
      label: isEn ? ag.split('(')[0].trim() : ag,
      keywords: [ag]
    }))
  ], [isEn]);

  const filterStatusOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'ALL', label: isEn ? 'All Status' : 'ਸਾਰੀ ਸਥਿਤੀ (All Status)' },
    { value: 'DISPATCHED', label: isEn ? 'Dispatched' : 'ਰਵਾਨਾ (Dispatched)' },
    { value: 'DELIVERED', label: isEn ? 'Delivered' : 'ਪਹੁੰਚਿਆ (Delivered)' }
  ], [isEn]);

  const editStatusOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'DISPATCHED', label: isEn ? 'Dispatched' : 'ਰਵਾਨਾ (Dispatched)' },
    { value: 'DELIVERED', label: isEn ? 'Delivered to Seller' : 'ਸੈਲਰ ਪਹੁੰਚ ਗਿਆ (Delivered)' },
    { value: 'REJECTED_PARTIAL', label: isEn ? 'Partial Rejected / Shortage' : 'ਅੰਸ਼ਕ ਰੱਦ / ਸ਼ਾਰਟੇਜ (Rejected/Shortage)' }
  ], [isEn]);

  // Handle Seller selection change
  const handleSellerSelect = (sId: string) => {
    setSelectedSellerId(sId);
    if (!sId) {
      setShellerName('');
      setSellerAddress('');
      setSellerMobile('');
      return;
    }
    const found = sellers.find((s) => s.id === sId);
    if (found) {
      setShellerName(found.name);
      setSellerAddress(found.address);
      setSellerMobile(found.mobile || '');
      // If seller has associated agencies and current agency not in list, auto-match if possible
      if (found.agencies && found.agencies.length > 0 && !found.agencies.includes(agency)) {
        setAgency(found.agencies[0]);
      }
    }
  };

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);

  // Available bags calculation for effective Agency in Mandi
  const effectiveAgency = agency === 'CUSTOM' ? customAgency.trim() : agency.trim();
  const totalPurchasedForAgency = dailyPurchaseRecords
    .filter((p) => !effectiveAgency || p.agency === effectiveAgency)
    .reduce((s, p) => s + (Number(p.bags) || 0), 0);

  const alreadyLiftedForAgency = leftingRecords
    .filter((l) => !effectiveAgency || l.sellerOrAgency === effectiveAgency)
    .reduce((s, l) => s + (Number(l.bags) || 0), 0);

  const availableBags = Math.max(0, totalPurchasedForAgency - alreadyLiftedForAgency);

  // Multi-Photo Upload Handler
  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const resStr = evt.target.result as string;
          setPhotos((prev) => [...prev, resStr]);
          if (!photoUrl) setPhotoUrl(resStr);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    if (photos.length <= 1) {
      setPhotoUrl('');
    }
  };

  // Form Submit Handler
  const handleSaveLefting = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!effectiveAgency) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਖਰੀਦ ਏਜੰਸੀ ਨਿਰਧਾਰਿਤ ਕਰੋ (Please select Agency).');
      return;
    }

    if (!shellerName.trim()) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਸੈਲਰ / ਸ਼ੈਲਰ / ਮਿੱਲ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ (Please select/enter Seller Name).');
      return;
    }

    if (!truckNo.trim()) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਟਰੱਕ ਨੰਬਰ ਦਰਜ ਕਰੋ (Please enter Truck Number).');
      return;
    }

    const numBags = parseInt(bags, 10);
    if (isNaN(numBags) || numBags <= 0) {
      setFormError('ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (Bags must be > 0).');
      return;
    }

    if (numBags > availableBags && totalPurchasedForAgency > 0 && settings.requireAgencyPurchaseBeforeLefting !== false) {
      setFormError(
        `ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ (${numBags}) ਇਸ ਏਜੰਸੀ ਦੇ ਬਾਕੀ ਸਟਾਕ (${availableBags}) ਤੋਂ ਵੱਧ ਨਹੀਂ ਹੋ ਸਕਦੀ। (Cannot exceed ${availableBags} bags)`
      );
      return;
    }

    const weightKg = customWeightKg ? parseFloat(customWeightKg) : numBags * FIXED_BAG_WEIGHT_KG;
    const qul = Math.floor(weightKg / 100);
    const kg = Math.round((weightKg - qul * 100) * 100) / 100;

    const allPhotos = photos.length > 0 ? photos : (photoUrl ? [photoUrl] : undefined);

    const res = addLeftingRecord({
      date: date.trim(),
      farmerId: 'MANDI-DISPATCH',
      farmerName: shellerName.trim(),
      farmerNamePa: selectedSeller?.namePa || shellerName.trim(),
      fatherName: '',
      village: sellerAddress.trim() || 'Mandi Yard',
      villagePa: selectedSeller?.addressPa || sellerAddress.trim() || 'ਮੰਡੀ ਯਾਰਡ',
      mobile: sellerMobile.trim() || driverPhone.trim() || '',
      sellerOrAgency: effectiveAgency,
      bags: numBags,
      bardanaType,
      newBags: bardanaType === 'NEW' ? numBags : bardanaType === 'BOTH' ? parseInt(newBagsCount, 10) || 0 : 0,
      oldBags: bardanaType === 'OLD' ? numBags : bardanaType === 'BOTH' ? parseInt(oldBagsCount, 10) || 0 : 0,
      qul,
      kg,
      totalWeightKg: weightKg,
      destination: sellerAddress.trim() ? `${shellerName.trim()}, ${sellerAddress.trim()}` : shellerName.trim(),
      truckNo: truckNo.trim().toUpperCase(),
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      photos: allPhotos,
      gatePassNo: gatePassNo.trim() || undefined,
      dispatchDate: date.trim(),
      status,
      remarks: remarks.trim() || undefined
    });

    if (res.success && res.record) {
      notifySaveSuccess({
        titlePa: 'ਲਿਫਟਿੰਗ ਰਵਾਨਗੀ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋ ਗਈ ਹੈ।',
        titleEn: 'Lefting Dispatch Saved Successfully',
        messagePa: `ਟਰੱਕ: ${truckNo.toUpperCase()} • ${numBags} ਬੋਰੀਆਂ • ਸ਼ੈਲਰ: ${shellerName.trim()}`,
        details: `ਗੇਟ ਪਾਸ: ${res.record.gatePassNo || res.record.id} • ਏਜੰਸੀ: ${effectiveAgency}`
      });

      // Reset form
      setBags('');
      setTruckNo('');
      setDriverName('');
      setDriverPhone('');
      setGatePassNo('');
      setCustomWeightKg('');
      setPhotos([]);
      setPhotoUrl('');
      setRemarks('');
      setNewBagsCount('');
      setOldBagsCount('');
      setShowTruckSuggestions(false);
      setActiveTab('history');
    } else {
      notifyError({
        titlePa: 'ਲਿਫਟਿੰਗ ਰਿਕਾਰਡ ਸੇਵ ਕਰਨ ਵਿੱਚ ਗਲਤੀ',
        titleEn: 'Failed to Save Lefting Record',
        messagePa: res.messagePa || res.messageEn || 'ਕਿਰਪਾ ਕਰਕੇ ਦਰਜ ਕੀਤੇ ਵੇਰਵੇ ਚੈੱਕ ਕਰੋ।'
      });
      setFormError(res.messagePa || res.messageEn || 'ਰਿਕਾਰਡ ਸੇਵ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: LeftingRecord) => {
    setEditRecord(rec);
    setEditStatus(rec.status);
    setEditRejectedBags(String(rec.rejectedBags || 0));
    setEditShortageKg(String(rec.shortageKg || 0));
    setEditReceivingDate(rec.receivingDate || getTodayFormatted());
    setEditRemarks(rec.remarks || '');
  };

  // Save Edit Updates
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;

    const rejBags = parseInt(editRejectedBags, 10) || 0;
    const shortKg = parseFloat(editShortageKg) || 0;

    updateLeftingRecord(editRecord.id, {
      status: editStatus,
      rejectedBags: rejBags,
      shortageKg: shortKg,
      receivingDate: editStatus === 'DELIVERED' ? editReceivingDate : undefined,
      remarks: editRemarks.trim() || undefined
    });

    notifySaveSuccess({
      titlePa: 'ਲਿਫਟਿੰਗ ਰਿਕਾਰਡ ਅੱਪਡੇਟ ਹੋ ਗਿਆ',
      titleEn: 'Lefting Record Updated',
      messagePa: `ਗੇਟ ਪਾਸ: ${editRecord.gatePassNo || editRecord.id} • ਸਥਿਤੀ: ${editStatus}`
    });

    setEditRecord(null);
  };

  // Delete Action
  const handleDelete = (rec: LeftingRecord) => {
    confirmDelete({
      recordNameEn: `Lefting Dispatch ${rec.id} (${rec.truckNo})`,
      recordNamePa: `ਲਿਫਟਿੰਗ ਰਿਕਾਰਡ ${rec.id} (${rec.truckNo})`,
      recordId: rec.id,
      itemDetails: [
        { labelEn: 'Gate Pass', labelPa: 'ਗੇਟ ਪਾਸ', value: rec.gatePassNo || rec.id },
        { labelEn: 'Truck No', labelPa: 'ਟਰੱਕ ਨੰਬਰ', value: rec.truckNo },
        { labelEn: 'Destination', labelPa: 'ਸ਼ੈਲਰ', value: rec.destination },
        { labelEn: 'Bags', labelPa: 'ਬੋਰੀਆਂ', value: `${rec.bags} Bags (${rec.totalWeightKg} Kg)` }
      ],
      onConfirm: () => {
        deleteLeftingRecord(rec.id);
        notifyDeleteSuccess({
          titlePa: 'ਲਿਫਟਿੰਗ ਰਿਕਾਰਡ ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
          titleEn: 'Lefting Record Deleted',
          messagePa: `ਰਿਕਾਰਡ ${rec.id} ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ ਅਤੇ ਬੋਰੀਆਂ ਵਾਪਸ ਮੰਡੀ ਸਟਾਕ ਵਿੱਚ ਉਪਲਬਧ ਹੋ ਗਈਆਂ ਹਨ।`
        });
      }
    });
  };

  // Total Lefting Aggregates
  const totalDispatchedBags = leftingRecords.reduce((s, l) => s + (Number(l.bags) || 0), 0);
  const totalDispatchedKg = leftingRecords.reduce((s, l) => s + (Number(l.totalWeightKg) || 0), 0);
  const totalDeliveredBags = leftingRecords
    .filter((l) => l.status === 'DELIVERED')
    .reduce((s, l) => s + (Number(l.netDeliveredBags ?? l.bags) || 0), 0);
  const totalShortageKg = leftingRecords.reduce((s, l) => s + (Number(l.shortageKg) || 0), 0);
  const totalRejectedBags = leftingRecords.reduce((s, l) => s + (Number(l.rejectedBags) || 0), 0);

  // Total Agency Purchased Bags across all farmers
  const totalPurchasedInMandi = dailyPurchaseRecords.reduce((s, p) => s + (Number(p.bags) || 0), 0);
  const totalPendingLiftingBags = Math.max(0, totalPurchasedInMandi - totalDispatchedBags);

  // Filtered Lefting Records
  const filteredRecords = leftingRecords.filter((rec) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const mId = rec.id.toLowerCase().includes(q);
      const mGate = rec.gatePassNo?.toLowerCase().includes(q) || false;
      const mTruck = rec.truckNo.toLowerCase().includes(q);
      const mDriver = rec.driverName.toLowerCase().includes(q);
      const mDest = rec.destination.toLowerCase().includes(q);
      const mFarmer = rec.farmerName.toLowerCase().includes(q) || rec.farmerNamePa.toLowerCase().includes(q);
      if (!mId && !mGate && !mTruck && !mDriver && !mDest && !mFarmer) return false;
    }
    if (filterAgency !== 'ALL' && rec.sellerOrAgency !== filterAgency) return false;
    if (filterStatus !== 'ALL' && rec.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & METRIC CARDS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-sm">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>{isEn ? 'Lefting & Dispatch Management' : 'ਲਿਫਟਿੰਗ - ਸ਼ੈਲਰ ਰਵਾਨਗੀ / LEFTING & DISPATCH'}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isEn ? 'Mandi to rice mill / sheller dispatch, gate pass, bilti and delivery tracking register' : 'ਮੰਡੀ ਤੋਂ ਰਾਈਸ ਮਿੱਲਾਂ / ਸ਼ੈਲਰਾਂ ਨੂੰ ਝੋਨੇ ਦੀ ਰਵਾਨਗੀ, ਗੇਟ ਪਾਸ, ਬਿਲਟੀ ਅਤੇ ਡਲਿਵਰੀ ਰਜਿਸਟਰ'}
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'dispatch'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'New Dispatch' : 'ਨਵੀਂ ਰਵਾਨਗੀ (New Dispatch)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isEn ? `Dispatch Register (${leftingRecords.length})` : `ਰਵਾਨਗੀ ਰਜਿਸਟਰ (${leftingRecords.length})`}</span>
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase">{isEn ? 'Pending Lefting Stock' : 'ਮੰਡੀ ਖਰੀਦ ਬਾਕੀ ਲਿਫਟਿੰਗ'}</div>
          <div className="text-xl font-black text-amber-600 mt-1">
            {totalPendingLiftingBags.toLocaleString('en-IN')} Bags
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{isEn ? 'Stock awaiting dispatch to shellers' : 'ਸ਼ੈਲਰ ਰਵਾਨਾ ਹੋਣ ਵਾਲਾ ਸਟਾਕ'}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase">{isEn ? 'Total Dispatched Bags' : 'ਕੁੱਲ ਰਵਾਨਾ ਬੋਰੀਆਂ (Dispatched)'}</div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {totalDispatchedBags.toLocaleString('en-IN')} Bags
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{(totalDispatchedKg / 100).toFixed(1)} {isEn ? 'Qtl Weight' : 'ਕੁਇੰਟਲ ਵਜ਼ਨ'}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase">{isEn ? 'Delivered Bags' : 'ਸਫਲ ਡਲਿਵਰੀ (Delivered)'}</div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {totalDeliveredBags.toLocaleString('en-IN')} Bags
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">{isEn ? 'Goods received at sheller' : 'ਸ਼ੈਲਰ ਵਿਖੇ ਪ੍ਰਾਪਤ ਹੋ ਚੁੱਕਾ ਮਾਲ'}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold uppercase">{isEn ? 'Shortage / Rejection' : 'ਸ਼ਾਰਟੇਜ / ਰੱਦ (Shortage)'}</div>
          <div className="text-xl font-black text-rose-700 mt-1">
            {totalShortageKg > 0 ? `${totalShortageKg} Kg` : `${totalRejectedBags} Bags`}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">{isEn ? 'Deductions or objections by sheller' : 'ਸ਼ੈਲਰ ਵੱਲੋਂ ਕਟੌਤੀ ਜਾਂ ਇਤਰਾਜ਼'}</div>
        </div>
      </div>

      {/* 3. NEW DISPATCH FORM (WHEN TAB === 'dispatch') */}
      {activeTab === 'dispatch' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">ਸ਼ੈਲਰ ਰਵਾਨਗੀ ਫਾਰਮ / NEW DISPATCH BILTI</h2>
              <p className="text-xs text-slate-500">ਟਰੱਕ ਨੰਬਰ, ਗੇਟ ਪਾਸ ਅਤੇ ਬੋਰੀਆਂ ਦੀ ਜਾਣਕਾਰੀ ਭਰੋ</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                ਮੰਡੀ ਸਟਾਕ ਆਟੋ-ਡਿਡਕਸ਼ਨ
              </span>
            </div>
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveLefting} className="space-y-5">
            {/* Top Row: Date, Agency, and Available Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਰਵਾਨਗੀ ਮਿਤੀ (Dispatch Date) <span className="text-rose-500">*</span>
                </label>
                <DateInput
                  value={date || ''}
                  onChange={setDate}
                  required
                />
              </div>

              {/* Procurement Agency */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Procurement Agency' : 'ਖਰੀਦ ਏਜੰਸੀ (Procurement Agency)'} <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  id="lefting-agency"
                  value={agency || ''}
                  onChange={(val) => setAgency(val)}
                  options={agencyOptions}
                  placeholder={isEn ? "Select agency..." : "ਏਜੰਸੀ ਚੁਣੋ..."}
                  searchPlaceholder={isEn ? "Search agency..." : "ਏਜੰਸੀ ਖੋਜੋ..."}
                  emptyMessage={isEn ? "No agency found" : "ਕੋਈ ਏਜੰਸੀ ਨਹੀਂ ਮਿਲੀ"}
                />
                {agency === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customAgency || ''}
                    onChange={(e) => setCustomAgency(e.target.value)}
                    placeholder={isEn ? "Enter agency name" : "ਏਜੰਸੀ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ"}
                    className="w-full mt-1.5 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                )}
              </div>

              {/* Mandi Agency Stock Availability */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                  {isEn ? 'Available Mandi Stock' : 'ਮੰਡੀ ਵਿੱਚ ਉਪਲਬਧ ਖਰੀਦ ਸਟਾਕ'}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-black text-emerald-950 font-mono">
                    {availableBags.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">{isEn ? 'Bags' : 'ਬੋਰੀਆਂ (Bags)'}</span>
                </div>
                <span className="text-[10px] text-emerald-600 truncate">
                  {isEn ? `Total Purchase: ${totalPurchasedForAgency} | Already Dispatched: ${alreadyLiftedForAgency}` : `ਕੁੱਲ ਖਰੀਦ: ${totalPurchasedForAgency} | ਪਹਿਲਾਂ ਰਵਾਨਾ: ${alreadyLiftedForAgency}`}
                </span>
              </div>
            </div>

            {/* Seller Master Selection & Auto-Filled Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>{isEn ? 'Select Seller / Sheller Master' : 'ਸੈਲਰ / ਸ਼ੈਲਰ ਦੀ ਚੋਣ (Select Seller / Sheller Master)'}</span>
                  <span className="text-rose-500">*</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSellerModalOpen(true)}
                  className="px-3 py-1 text-[11px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Add New Seller' : 'ਨਵਾਂ ਸੈਲਰ ਸ਼ਾਮਲ ਕਰੋ (Add New Seller)'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Select Saved Seller' : 'ਸੈਲਰ ਚੁਣੋ (Select Saved Seller)'}
                  </label>
                  <SearchableSelect
                    id="lefting-seller-select"
                    value={selectedSellerId || ''}
                    onChange={(val) => handleSellerSelect(val)}
                    options={sellerOptions}
                    placeholder={isEn ? "Search and select seller..." : "ਸੈਲਰ ਖੋਜੋ ਤੇ ਚੁਣੋ..."}
                    searchPlaceholder={isEn ? "Type seller name, city, licence..." : "ਸੈਲਰ ਨਾਮ, ਸ਼ਹਿਰ ਜਾਂ ਲਾਇਸੈਂਸ ਲਿਖੋ..."}
                    emptyMessage={isEn ? "No seller found" : "ਕੋਈ ਸੈਲਰ ਨਹੀਂ ਮਿਲਿਆ"}
                    allowClear
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ਸ਼ੈਲਰ / ਮਿੱਲ ਦਾ ਨਾਮ (Sheller Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shellerName || ''}
                    onChange={(e) => setShellerName(e.target.value)}
                    placeholder="e.g. Kang Modern Rice Mill, Shahkot"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ਸੰਪਰਕ ਮੋਬਾਈਲ (Mobile)
                  </label>
                  <input
                    type="tel"
                    value={sellerMobile || ''}
                    onChange={(e) => setSellerMobile(e.target.value)}
                    placeholder="e.g. 98147-74651"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ਪੂਰਾ ਪਤਾ ਅਤੇ ਲੋਕੇਸ਼ਨ (Full Address & Location)
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sellerAddress || ''}
                      onChange={(e) => setSellerAddress(e.target.value)}
                      placeholder="e.g. Shahkot Road, Kang Khurd, Teh. Shahkot, Distt. Jalandhar - 144629"
                      className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ਗੇਟ ਪਾਸ ਨੰਬਰ (Gate Pass No.)
                  </label>
                  <input
                    type="text"
                    value={gatePassNo || ''}
                    onChange={(e) => setGatePassNo(e.target.value)}
                    placeholder="e.g. GP-2026-0891"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Selected Seller Details Badge */}
              {selectedSeller && (
                <div className="bg-white border border-emerald-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="space-y-0.5">
                    <div className="font-black text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedSeller.name}</span>
                      {selectedSeller.licenceNo && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          (Lic: {selectedSeller.licenceNo})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600">{selectedSeller.address}</div>
                  </div>
                  {selectedSeller.agencies && selectedSeller.agencies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedSeller.agencies.map((ag) => (
                        <span key={ag} className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                          {ag.split('(')[0].trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vehicle & Driver Details */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-600" />
                  <span>ਟਰਾਂਸਪੋਰਟ ਤੇ ਡਰਾਈਵਰ ਵੇਰਵਾ (Vehicle & Driver Details)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTruckModalOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ਟਰੱਕ ਮਾਸਟਰ (Truck Master)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      ਟਰੱਕ / ਟਰਾਲਾ ਨੰਬਰ (Truck No.) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">ਆਖਰੀ 4 ਅੰਕ ਲਿਖੋ</span>
                  </div>
                  <input
                    type="text"
                    value={truckNo || ''}
                    onFocus={() => setShowTruckSuggestions(true)}
                    onChange={(e) => {
                      setTruckNo(e.target.value.toUpperCase());
                      setShowTruckSuggestions(true);
                    }}
                    placeholder="e.g. PB-10-AZ-1234 ਜਾਂ 1234"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    required
                  />

                  {/* Auto-suggest dropdown for trucks */}
                  {showTruckSuggestions && matchedTrucks.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      <div className="p-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
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
                            if (t.driverMobile) setDriverPhone(t.driverMobile);
                            setShowTruckSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-emerald-50 transition border-b border-slate-50 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-black text-slate-900">{t.truckNo}</span>
                            {t.driverName && <span className="text-slate-600 ml-2 font-medium">({t.driverName})</span>}
                          </div>
                          {t.driverMobile && <span className="text-[11px] text-slate-500 font-mono">{t.driverMobile}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ਡਰਾਈਵਰ ਦਾ ਨਾਮ (Driver Name)</label>
                  <input
                    type="text"
                    value={driverName || ''}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="ਡਰਾਈਵਰ ਦਾ ਨਾਮ"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ਡਰਾਈਵਰ ਮੋਬਾਈਲ (Mobile)</label>
                  <input
                    type="tel"
                    value={driverPhone || ''}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="10 digit mobile"
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bags, Bardana & Weight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਰਵਾਨਾ ਕੀਤੀਆਂ ਬੋਰੀਆਂ (Bags) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableBags || undefined}
                  value={bags || ''}
                  onChange={(e) => {
                    setBags(e.target.value);
                    const b = parseInt(e.target.value, 10);
                    if (!isNaN(b) && b > 0) {
                      setCustomWeightKg(String(b * FIXED_BAG_WEIGHT_KG));
                    }
                  }}
                  placeholder="ਬੋਰੀਆਂ ਦਰਜ ਕਰੋ"
                  className="w-full px-3 py-2 text-xs font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Bardana Type' : 'ਬਾਰਦਾਨਾ ਕਿਸਮ (Bardana Type)'}
                </label>
                <SearchableSelect
                  id="lefting-bardana-type"
                  value={bardanaType || 'NEW'}
                  onChange={(val) => setBardanaType(val as BardanaType)}
                  options={bardanaTypeOptions}
                  placeholder={isEn ? "Select type..." : "ਕਿਸਮ ਚੁਣੋ..."}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਕੁੱਲ ਵਜ਼ਨ ਕਿਲੋ ਵਿੱਚ (Total Weight Kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customWeightKg || ''}
                  onChange={(e) => setCustomWeightKg(e.target.value)}
                  placeholder="37.50 KG ਪ੍ਰਤੀ ਬੋਰੀ"
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {bardanaType === 'BOTH' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">ਨਵੀਆਂ ਬੋਰੀਆਂ ਗਿਣਤੀ</label>
                  <input
                    type="number"
                    value={newBagsCount || ''}
                    onChange={(e) => setNewBagsCount(e.target.value)}
                    placeholder="ਨਵੀਆਂ ਬੋਰੀਆਂ"
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">ਪੁਰਾਣੀਆਂ ਬੋਰੀਆਂ ਗਿਣਤੀ</label>
                  <input
                    type="number"
                    value={oldBagsCount || ''}
                    onChange={(e) => setOldBagsCount(e.target.value)}
                    placeholder="ਪੁਰਾਣੀਆਂ ਬੋਰੀਆਂ"
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Bilti / Receipt Photo Upload (Multi-Photo) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ਬਿਲਟੀ / ਰਸੀਦ / ਗੇਟ ਪਾਸ ਫੋਟੋਆਂ (Photos / Bilti Receipts)
                  </label>
                  {photos.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {photos.length} ਫੋਟੋਆਂ ਸ਼ਾਮਲ
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-200 shadow-2xs">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ (Add Photos)</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotosUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">ਇੱਕ ਜਾਂ ਵੱਧ ਫੋਟੋਆਂ ਚੁਣ ਸਕਦੇ ਹੋ</span>
                  </div>

                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {photos.map((p, idx) => (
                        <div key={idx} className="relative group w-16 h-16 rounded-xl border border-slate-300 overflow-hidden bg-slate-100 shadow-2xs">
                          <img src={p} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-[10px] font-bold opacity-90 group-hover:opacity-100 shadow transition"
                            title="ਹਟਾਓ"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ਟਿੱਪਣੀ (Remarks)</label>
                <input
                  type="text"
                  value={remarks || ''}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="ਕੋਈ ਹੋਰ ਨੋਟ ਜਾਂ ਹਵਾਲਾ"
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition"
              >
                <Check className="w-4 h-4" />
                <span>ਰਵਾਨਗੀ ਸੇਵ ਕਰੋ (Save Dispatch Record)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. DISPATCH REGISTER / HISTORY TABLE */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ਗੇਟ ਪਾਸ, ਟਰੱਕ ਨੰਬਰ, ਕਿਸਾਨ ਜਾਂ ਸ਼ੈਲਰ ਖੋਜੋ..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap min-w-[340px]">
              <div className="w-48">
                <SearchableSelect
                  id="lefting-filter-agency"
                  value={filterAgency || 'ALL'}
                  onChange={(val) => setFilterAgency(val)}
                  options={filterAgencyOptions}
                  placeholder={isEn ? "Filter agency..." : "ਏਜੰਸੀ ਫਿਲਟਰ..."}
                  size="xs"
                />
              </div>

              <div className="w-44">
                <SearchableSelect
                  id="lefting-filter-status"
                  value={filterStatus || 'ALL'}
                  onChange={(val) => setFilterStatus(val)}
                  options={filterStatusOptions}
                  placeholder={isEn ? "Filter status..." : "ਸਥਿਤੀ ਫਿਲਟਰ..."}
                  size="xs"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              ਕੋਈ ਲਿਫਟਿੰਗ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। (No lefting dispatch records found)
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">ਮਿਤੀ (Date)</th>
                    <th className="p-3">ਗੇਟ ਪਾਸ / ID</th>
                    <th className="p-3">ਟਰੱਕ ਤੇ ਡਰਾਈਵਰ</th>
                    <th className="p-3">ਸੈਲਰ / ਸ਼ੈਲਰ (Seller / Sheller)</th>
                    <th className="p-3">ਖਰੀਦ ਏਜੰਸੀ (Agency)</th>
                    <th className="p-3">ਬੋਰੀਆਂ ਤੇ ਵਜ਼ਨ</th>
                    <th className="p-3">ਸਥਿਤੀ (Status)</th>
                    <th className="p-3 text-center print:hidden">ਕਾਰਵਾਈ (Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-900">{rec.dispatchDate}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {rec.gatePassNo || rec.id}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{rec.truckNo}</div>
                        <div className="text-[10px] text-slate-500">
                          {rec.driverName || 'ਡਰਾਈਵਰ ਦਰਜ ਨਹੀਂ'} {rec.driverPhone ? `• ${rec.driverPhone}` : ''}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{rec.farmerName || rec.destination}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {rec.destination}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {rec.sellerOrAgency}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-black text-slate-900">{rec.bags} Bags</div>
                        <div className="text-[10px] text-slate-500">
                          {rec.qul} Qul {rec.kg} Kg
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            rec.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.status === 'DELIVERED' ? 'DELIVERED (ਪਹੁੰਚਿਆ)' : 'DISPATCHED (ਰਵਾਨਾ)'}
                        </span>
                        {rec.shortageKg ? (
                          <div className="text-[10px] text-rose-600 mt-0.5">ਸ਼ਾਰਟੇਜ: {rec.shortageKg} Kg</div>
                        ) : null}
                      </td>
                      <td className="p-3 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewRecord(rec)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                            title="View Dispatch Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            className="p-1 text-slate-400 hover:text-emerald-700 rounded transition-colors"
                            title="Update Status / Receiving"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => exportLeftingVoucherPDF(rec, settings)}
                            className="p-1 text-slate-400 hover:text-indigo-700 rounded transition-colors"
                            title="Download PDF Bilti"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete Lefting Entry"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* 5. VIEW MODAL */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-black text-slate-900">
                  ਗੇਟ ਪਾਸ ਵੇਰਵਾ / GATE PASS {viewRecord.gatePassNo || viewRecord.id}
                </h3>
              </div>
              <button onClick={() => setViewRecord(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl">
                <div>
                  <span className="text-slate-400">ਮਿਤੀ:</span>{' '}
                  <strong className="text-slate-800">{viewRecord.dispatchDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ਸਥਿਤੀ:</span>{' '}
                  <strong className="text-slate-800">{viewRecord.status}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ਟਰੱਕ ਨੰਬਰ:</span>{' '}
                  <strong className="text-slate-900">{viewRecord.truckNo}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ਡਰਾਈਵਰ:</span>{' '}
                  <strong className="text-slate-800">{viewRecord.driverName || '—'}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div>
                  <span className="text-slate-400">ਸੈਲਰ / ਸ਼ੈਲਰ:</span>{' '}
                  <strong className="text-slate-900">{viewRecord.farmerName || viewRecord.destination}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ਖਰੀਦ ਏਜੰਸੀ:</span>{' '}
                  <strong className="text-slate-900">{viewRecord.sellerOrAgency}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ਮੰਜ਼ਿਲ / ਪਤਾ (Destination):</span>{' '}
                  <strong className="text-slate-900">{viewRecord.destination}</strong>
                </div>
                <div>
                  <span className="text-slate-400">ਬੋਰੀਆਂ:</span>{' '}
                  <strong className="text-slate-900">
                    {viewRecord.bags} ਬੋਰੇ ({viewRecord.totalWeightKg} Kg)
                  </strong>
                </div>
              </div>

              {viewRecord.photos && viewRecord.photos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 font-bold">ਬਿਲਟੀ / ਰਸੀਦ ਫੋਟੋਆਂ (Bilti / Receipts):</span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {viewRecord.photos.length} ਫੋਟੋਆਂ
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {viewRecord.photos.map((p, idx) => (
                      <a
                        key={idx}
                        href={p}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 block aspect-4/3 hover:border-slate-400 transition shadow-2xs"
                      >
                        <img
                          src={p}
                          alt={`Receipt ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                          <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {viewRecord.remarks && (
                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600">
                  <span className="font-bold text-slate-800">ਟਿੱਪਣੀ:</span> {viewRecord.remarks}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t">
              <button
                onClick={() => exportLeftingVoucherPDF(viewRecord, settings)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>PDF ਡਾਊਨਲੋਡ ਕਰੋ</span>
              </button>
              <button
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                ਬੰਦ ਕਰੋ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EDIT STATUS / SHORTAGE MODAL */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-slate-900" />
                <h3 className="text-base font-black text-slate-900">ਸਥਿਤੀ ਤੇ ਡਲਿਵਰੀ ਅੱਪਡੇਟ</h3>
              </div>
              <button onClick={() => setEditRecord(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn ? 'Delivery Status' : 'ਸਥਿਤੀ (Delivery Status)'}
                </label>
                <SearchableSelect
                  id="lefting-edit-status"
                  value={editStatus || 'DISPATCHED'}
                  onChange={(val) => setEditStatus(val as any)}
                  options={editStatusOptions}
                  placeholder={isEn ? "Select status..." : "ਸਥਿਤੀ ਚੁਣੋ..."}
                />
              </div>

              {editStatus === 'DELIVERED' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ਪਹੁੰਚਣ ਦੀ ਮਿਤੀ (Receiving Date)</label>
                  <DateInput
                    value={editReceivingDate || ''}
                    onChange={setEditReceivingDate}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ਸ਼ਾਰਟੇਜ ਕਿਲੋ (Shortage Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editShortageKg ?? ''}
                    onChange={(e) => setEditShortageKg(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ਰੱਦ ਬੋਰੀਆਂ (Rejected Bags)</label>
                  <input
                    type="number"
                    value={editRejectedBags ?? ''}
                    onChange={(e) => setEditRejectedBags(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ਟਿੱਪਣੀ (Remarks)</label>
                <input
                  type="text"
                  value={editRemarks || ''}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="ਡਲਿਵਰੀ ਰਸੀਦ ਜਾਂ ਸ਼ਾਰਟੇਜ ਵੇਰਵਾ"
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
                >
                  ਅੱਪਡੇਟ ਸੇਵ ਕਰੋ
                </button>
                <button
                  type="button"
                  onClick={() => setEditRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  ਰੱਦ ਕਰੋ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. SELLER MASTER MODAL */}
      <SellerMasterModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
        onSelectSeller={(s) => handleSellerSelect(s.id)}
      />

      {/* 8. TRUCK MASTER MODAL */}
      <TruckMasterModal
        isOpen={isTruckModalOpen}
        onClose={() => setIsTruckModalOpen(false)}
        onSelectTruck={(t) => {
          setTruckNo(t.truckNo);
          if (t.driverName) setDriverName(t.driverName);
          if (t.driverMobile) setDriverPhone(t.driverMobile);
          setIsTruckModalOpen(false);
          setShowTruckSuggestions(false);
        }}
      />
    </div>
  );
};
