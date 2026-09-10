import React, { useState, useEffect, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { Farmer, FarmerAccountSummary, FarmerAdvanceRecord } from '../../types/mandi';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  User,
  Search,
  Building,
  Phone,
  CreditCard,
  Printer,
  FileDown,
  Edit,
  Trash2,
  PackageCheck,
  ShoppingCart,
  Scale,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Calculator,
  Percent,
  Coins,
  ArrowDownLeft,
  Users,
  Link as LinkIcon,
  CheckCheck,
  Info,
  X
} from 'lucide-react';
import { formatCurrencyINR, maskAadhaarNumber, calculateAdvanceInterest } from '../../utils/calculations';
import { exportFarmerAccountPDF } from '../../utils/farmerAccountPdfExport';
import { FarmerProfileViewModal } from './FarmerProfileViewModal';
import { FarmerEditModal } from './FarmerEditModal';

export const FarmerAccount: React.FC = () => {
  const {
    farmers,
    selectedFarmerForAccount,
    setSelectedFarmerForAccount,
    setSelectedFarmerForBags,
    setActiveSection,
    getCompleteFarmerAccount,
    deleteFarmer,
    deleteBagsEntry,
    deleteDailyPurchase,
    addFarmerPayment,
    deleteFarmerPayment,
    addFarmerAdvance,
    updateFarmerAdvance,
    deleteFarmerAdvance,
    settings,
    language
  } = useMandi();

  const isEn = language === 'en';

  const { confirmDelete, notifyDeleteSuccess, notifySaveSuccess, notifyError } = useNotification();

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(() => {
    if (selectedFarmerForAccount) return selectedFarmerForAccount.id;
    return farmers[0]?.id || '';
  });

  // Sync if selectedFarmerForAccount changes from external clicks
  useEffect(() => {
    if (selectedFarmerForAccount) {
      setSelectedFarmerId(selectedFarmerForAccount.id);
    } else if (farmers.length > 0 && !selectedFarmerId) {
      setSelectedFarmerId(farmers[0].id);
    }
  }, [selectedFarmerForAccount, farmers]);

  // UI Modals State
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<FarmerAdvanceRecord | null>(null);
  const [viewingAdvance, setViewingAdvance] = useState<FarmerAdvanceRecord | null>(null);
  const [showBreakupDetails, setShowBreakupDetails] = useState(true);
  const [showMaskedAadhaar, setShowMaskedAadhaar] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'all' | 'arrival' | 'purchases' | 'linked' | 'advances' | 'boli' | 'payments' | 'statement'
  >('all');

  // Advance Form State
  const [advanceForm, setAdvanceForm] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    interestTillDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    amount: '',
    monthlyInterestRate: '2.0',
    paymentMode: 'CASH' as const,
    referenceNumber: '',
    remarks: ''
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    amount: '',
    paymentMode: 'BANK_TRANSFER' as const,
    referenceNumber: '',
    agency: '',
    remarks: ''
  });

  // Fetch complete farmer account
  const currentFarmer = farmers.find((f) => f.id === selectedFarmerId);
  const accountSummary: FarmerAccountSummary | null = selectedFarmerId
    ? getCompleteFarmerAccount(selectedFarmerId)
    : null;

  // Filtered farmers list for search dropdown
  const filteredFarmers = farmers.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const cleanAadhaar = f.aadhaar.replace(/\s+/g, '');
    return (
      f.farmerName.toLowerCase().includes(q) ||
      f.farmerNamePa.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.villagePa.toLowerCase().includes(q) ||
      (f.fatherName && f.fatherName.toLowerCase().includes(q)) ||
      (f.mobile && f.mobile.includes(q)) ||
      cleanAadhaar.includes(q.replace(/\s+/g, ''))
    );
  });

  const farmerSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return farmers.map((f) => ({
      value: f.id,
      label: isEn ? f.farmerName : `${f.farmerNamePa} (${f.farmerName})`,
      subLabel: `${isEn ? 'Village' : 'ਪਿੰਡ'}: ${isEn ? f.village : f.villagePa} | ${isEn ? 'S/o' : 'ਪਿਤਾ'}: ${f.fatherName || '-'}`,
      badge: f.linkedMainFarmerId ? (isEn ? 'Linked' : 'ਸੰਬੰਧਿਤ') : f.id,
      badgeColor: f.linkedMainFarmerId ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
      keywords: [f.farmerName, f.farmerNamePa, f.village, f.villagePa, f.id, f.mobile || '', f.aadhaar || '']
    }));
  }, [farmers, isEn]);

  const advancePaymentModeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'CASH', label: isEn ? 'Cash' : 'Cash (ਨਕਦ)' },
    { value: 'BANK_TRANSFER', label: isEn ? 'Bank Transfer' : 'Bank Transfer (ਬੈਂਕ)' },
    { value: 'CHEQUE', label: isEn ? 'Cheque' : 'Cheque (ਚੈੱਕ)' },
    { value: 'OTHER', label: isEn ? 'Other' : 'Other (ਹੋਰ)' }
  ], [isEn]);

  const paymentModeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'BANK_TRANSFER', label: isEn ? 'Bank Transfer' : 'Bank Transfer (ਬੈਂਕ)' },
    { value: 'RTGS', label: 'RTGS' },
    { value: 'NEFT', label: 'NEFT' },
    { value: 'CHEQUE', label: isEn ? 'Cheque' : 'Cheque (ਚੈੱਕ)' },
    { value: 'CASH', label: isEn ? 'Cash' : 'Cash (ਨਕਦ)' }
  ], [isEn]);

  // Copy Farmer ID
  const handleCopyFarmerId = () => {
    if (!currentFarmer) return;
    navigator.clipboard.writeText(currentFarmer.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!accountSummary) return;
    try {
      setIsExportingPDF(true);
      await exportFarmerAccountPDF(accountSummary, settings);
      notifySaveSuccess({
        titleEn: 'Farmer Account PDF Exported',
        titlePa: 'ਕਿਸਾਨ ਖਾਤਾ ਪੀ.ਡੀ.ਐਫ ਤਿਆਰ ਹੋ ਗਿਆ',
        messageEn: `Account PDF for ${accountSummary.farmer.farmerName} exported successfully.`,
        messagePa: `ਕਿਸਾਨ ${accountSummary.farmer.farmerNamePa} ਦਾ ਖਾਤਾ ਪੀ.ਡੀ.ਐਫ ਸਫਲਤਾਪੂਰਵਕ ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ ਹੈ।`
      });
    } catch (err) {
      notifyError({
        titleEn: 'PDF Export Failed',
        titlePa: 'ਪੀ.ਡੀ.ਐਫ ਡਾਊਨਲੋਡ ਅਸਫਲ',
        messageEn: 'Could not generate Farmer Account PDF.',
        messagePa: 'ਕਿਸਾਨ ਖਾਤਾ ਪੀ.ਡੀ.ਐਫ ਬਣਾਉਣ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ।'
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Print Farmer Account Statement
  const handlePrint = () => {
    window.print();
  };

  // Delete Farmer Handler with strong warning check
  const handleDeleteFarmer = () => {
    if (!currentFarmer || !accountSummary) return;
    const hasTransactions = accountSummary.transactions.length > 0;

    confirmDelete({
      recordNameEn: `Farmer ${currentFarmer.farmerName}`,
      recordNamePa: `ਕਿਸਾਨ ${currentFarmer.farmerNamePa}`,
      recordId: currentFarmer.id,
      itemDetails: [
        { labelEn: 'Farmer ID', labelPa: 'ਕਿਸਾਨ ਆਈ.ਡੀ', value: currentFarmer.id },
        { labelEn: 'Village', labelPa: 'ਪਿੰਡ', value: `${currentFarmer.villagePa} (${currentFarmer.village})` },
        { labelEn: 'Mandi Arrival Bags', labelPa: 'ਮੰਡੀ ਆਮਦ ਬੋਰੀਆਂ', value: `${accountSummary.mandiArrivalBags} Bags` },
        { labelEn: 'Purchased Bags', labelPa: 'ਖਰੀਦੇ ਗਏ ਬੋਰੇ', value: `${accountSummary.purchasedBags} Bags` },
        {
          labelEn: 'Warning',
          labelPa: 'ਚੇਤਾਵਨੀ',
          value: hasTransactions
            ? 'This farmer has existing mandi transactions. Deleting this farmer will remove all linked records. / ਇਸ ਕਿਸਾਨ ਦੇ ਰਿਕਾਰਡ ਮੌਜੂਦ ਹਨ। ਡਿਲੀਟ ਕਰਨ ਨਾਲ ਸਾਰੇ ਲਿੰਕਡ ਰਿਕਾਰਡ ਹਟ ਜਾਣਗੇ।'
            : 'No transactions found. Safe to delete.'
        }
      ],
      onConfirm: () => {
        const nameEn = currentFarmer.farmerName;
        const namePa = currentFarmer.farmerNamePa;
        deleteFarmer(currentFarmer.id);
        const remaining = farmers.filter((f) => f.id !== currentFarmer.id);
        if (remaining.length > 0) {
          setSelectedFarmerId(remaining[0].id);
        } else {
          setSelectedFarmerId('');
        }
        notifyDeleteSuccess({
          titlePa: 'ਕਿਸਾਨ ਦਾ ਖਾਤਾ ਸਫਲਤਾਪੂਰਵਕ ਡਿਲੀਟ ਹੋ ਗਿਆ ਹੈ।',
          titleEn: 'Farmer Account Deleted Successfully',
          messagePa: `ਕਿਸਾਨ ${namePa} ਦਾ ਖਾਤਾ ਅਤੇ ਸਾਰੇ ਰਿਕਾਰਡ ਹਟਾ ਦਿੱਤੇ ਗਏ ਹਨ।`,
          messageEn: `Farmer ${nameEn} account and all linked records have been removed.`
        });
      }
    });
  };

  // Open Add Advance Modal
  const handleOpenAddAdvance = () => {
    setEditingAdvance(null);
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    setAdvanceForm({
      date: today,
      interestTillDate: today,
      amount: '',
      monthlyInterestRate: '2.0',
      paymentMode: 'CASH',
      referenceNumber: '',
      remarks: ''
    });
    setIsAdvanceModalOpen(true);
  };

  // Open Edit Advance Modal
  const handleOpenEditAdvance = (adv: FarmerAdvanceRecord) => {
    setEditingAdvance(adv);
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    setAdvanceForm({
      date: adv.startDate || adv.date,
      interestTillDate: adv.endDate || adv.interestTillDate || today,
      amount: String(adv.principal ?? adv.amount),
      monthlyInterestRate: String(adv.monthlyInterestRate ?? 2.0),
      paymentMode: (adv.paymentMode as any) || 'CASH',
      referenceNumber: adv.referenceNumber || '',
      remarks: adv.remarks || ''
    });
    setIsAdvanceModalOpen(true);
  };

  // Save Advance Record
  const handleSaveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFarmer) return;

    const amt = parseFloat(advanceForm.amount);
    const rate = parseFloat(advanceForm.monthlyInterestRate) || 0;
    const startDate = advanceForm.date.trim();
    const endDate = advanceForm.interestTillDate.trim() || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (isNaN(amt) || amt <= 0) {
      notifyError({
        titleEn: 'Invalid Amount',
        titlePa: 'ਗਲਤ ਰਕਮ',
        messageEn: 'Please enter a valid advance amount greater than 0.',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ 0 ਤੋਂ ਵੱਧ ਸਹੀ ਪੇਸ਼ਗੀ ਰਕਮ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    if (editingAdvance) {
      updateFarmerAdvance(editingAdvance.id, {
        date: startDate,
        startDate: startDate,
        interestTillDate: endDate,
        endDate: endDate,
        amount: amt,
        principal: amt,
        monthlyInterestRate: rate,
        paymentMode: advanceForm.paymentMode,
        referenceNumber: advanceForm.referenceNumber.trim(),
        remarks: advanceForm.remarks.trim()
      });
      notifySaveSuccess({
        titleEn: 'Advance Updated',
        titlePa: 'ਪੇਸ਼ਗੀ ਰਿਕਾਰਡ ਅਪਡੇਟ ਹੋ ਗਿਆ',
        messageEn: `Advance record of ₹${amt} updated successfully.`,
        messagePa: `ਕਿਸਾਨ ਲਈ ₹${amt} ਦੀ ਪੇਸ਼ਗੀ ਅਪਡੇਟ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ।`
      });
    } else {
      addFarmerAdvance({
        farmerId: currentFarmer.id,
        farmerName: currentFarmer.farmerName,
        farmerNamePa: currentFarmer.farmerNamePa,
        date: startDate,
        startDate: startDate,
        interestTillDate: endDate,
        endDate: endDate,
        amount: amt,
        principal: amt,
        monthlyInterestRate: rate,
        paymentMode: advanceForm.paymentMode,
        referenceNumber: advanceForm.referenceNumber.trim(),
        remarks: advanceForm.remarks.trim(),
        status: 'ACTIVE'
      });
      notifySaveSuccess({
        titleEn: 'Advance Recorded',
        titlePa: 'ਨਵੀਂ ਪੇਸ਼ਗੀ ਦਰਜ ਹੋ ਗਈ',
        messageEn: `Advance of ₹${amt} with ${rate}% interest recorded successfully.`,
        messagePa: `ਕਿਸਾਨ ਲਈ ₹${amt} (${rate}% ਪ੍ਰਤੀ ਮਹੀਨਾ ਵਿਆਜ) ਪੇਸ਼ਗੀ ਦਰਜ ਹੋ ਗਈ ਹੈ।`
      });
    }

    setIsAdvanceModalOpen(false);
  };

  // Delete Advance Record
  const handleDeleteAdvance = (adv: FarmerAdvanceRecord) => {
    confirmDelete({
      recordNameEn: `Advance Entry ${adv.id}`,
      recordNamePa: `ਪੇਸ਼ਗੀ ਰਿਕਾਰਡ ${adv.id}`,
      recordId: adv.id,
      itemDetails: [
        { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ', value: `${adv.farmerNamePa} (${adv.farmerId})` },
        { labelEn: 'Principal Amount', labelPa: 'ਮੂਲ ਰਕਮ', value: formatCurrencyINR(adv.amount) },
        { labelEn: 'Date', labelPa: 'ਮਿਤੀ', value: adv.date },
        { labelEn: 'Interest Accrued', labelPa: 'ਜੁੜਿਆ ਵਿਆਜ', value: formatCurrencyINR(adv.interestAmount || 0) }
      ],
      onConfirm: () => {
        deleteFarmerAdvance(adv.id);
        notifyDeleteSuccess({
          titleEn: 'Advance Deleted',
          titlePa: 'ਪੇਸ਼ਗੀ ਰਿਕਾਰਡ ਹਟਾ ਦਿੱਤਾ ਗਿਆ',
          messageEn: `Advance of ${formatCurrencyINR(adv.amount)} removed.`,
          messagePa: `ਪੇਸ਼ਗੀ ਰਕਮ ${formatCurrencyINR(adv.amount)} ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।`
        });
      }
    });
  };

  // Save New Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFarmer) return;

    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      notifyError({
        titleEn: 'Invalid Amount',
        titlePa: 'ਗਲਤ ਰਕਮ',
        messageEn: 'Please enter a valid payment amount.',
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਭੁਗਤਾਨ ਰਕਮ ਦਰਜ ਕਰੋ।'
      });
      return;
    }

    addFarmerPayment({
      farmerId: currentFarmer.id,
      date: paymentForm.date.trim(),
      amount: amt,
      paymentMode: paymentForm.paymentMode,
      referenceNumber: paymentForm.referenceNumber.trim(),
      agency: paymentForm.agency.trim(),
      remarks: paymentForm.remarks.trim(),
      status: 'PAID'
    });

    setIsPaymentModalOpen(false);
    setPaymentForm({
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      amount: '',
      paymentMode: 'BANK_TRANSFER',
      referenceNumber: '',
      agency: '',
      remarks: ''
    });

    notifySaveSuccess({
      titleEn: 'Payment Recorded',
      titlePa: 'ਭੁਗਤਾਨ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋ ਗਿਆ',
      messageEn: `Payment of ${formatCurrencyINR(amt)} recorded for ${currentFarmer.farmerName}.`,
      messagePa: `ਕਿਸਾਨ ${currentFarmer.farmerNamePa} ਲਈ ${formatCurrencyINR(amt)} ਦਾ ਭੁਗਤਾਨ ਦਰਜ ਹੋ ਗਿਆ ਹੈ।`
    });
  };

  // Advance Live Calculator Preview in Modal
  const previewCalculation = (() => {
    const amt = parseFloat(advanceForm.amount) || 0;
    const rate = parseFloat(advanceForm.monthlyInterestRate) || 0;
    const startDateStr = advanceForm.date.trim();
    const endDateStr = advanceForm.interestTillDate.trim() || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (amt <= 0 || !startDateStr) {
      return { totalDays: 0, months: 0, days: 0, interest: 0, totalPayable: amt };
    }
    const res = calculateAdvanceInterest({
      principal: amt,
      startDateStr: startDateStr,
      endDateStr: endDateStr,
      monthlyInterestRate: rate
    });
    return {
      totalDays: res.totalDays,
      months: res.monthsElapsed,
      days: res.daysElapsed,
      interest: res.interestAmount,
      totalPayable: res.totalPayableWithInterest || res.totalPayable
    };
  })();

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP HEADER & FARMER SEARCH SELECTOR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-800 text-white rounded-2xl shadow-sm">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>{isEn ? 'Farmer Account & Statement' : 'ਕਿਸਾਨ ਖਾਤਾ / FARMER ACCOUNT & STATEMENT'}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isEn ? 'Arrivals, purchase, bardana, labour deductions, advances, interest and final settlement' : 'ਮੰਡੀ ਆਮਦ, ਖਰੀਦ, ਬਾਰਦਾਨਾ, ਲੇਬਰ ਕਟੌਤੀਆਂ, ਪੇਸ਼ਗੀ (ਐਡਵਾਂਸ), ਵਿਆਜ ਅਤੇ ਅੰਤਿਮ ਹਿਸਾਬ-ਕਿਤਾਬ'}
            </p>
          </div>
        </div>

        {/* Searchable Farmer Dropdown */}
        <div className="w-full sm:w-80">
          <SearchableSelect
            id="farmer-account-select"
            value={selectedFarmerId || ''}
            onChange={(val) => {
              setSelectedFarmerId(val);
              const found = farmers.find((f) => f.id === val);
              if (found) setSelectedFarmerForAccount(found);
            }}
            options={farmerSelectOptions}
            placeholder={isEn ? "Search and select farmer..." : "ਕਿਸਾਨ ਖੋਜੋ ਤੇ ਚੁਣੋ..."}
            searchPlaceholder={isEn ? "Type name, village, ID..." : "ਨਾਮ, ਪਿੰਡ, ਆਈ.ਡੀ ਲਿਖੋ..."}
            emptyMessage={isEn ? "No farmer found" : "ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ"}
          />
        </div>
      </div>

      {!currentFarmer || !accountSummary ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <User className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ / Select a Farmer</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            ਕਿਸਾਨ ਦਾ ਸਮੁੱਚਾ ਖਾਤਾ, ਮੰਡੀ ਆਮਦ, ਖਰੀਦ, ਪੇਸ਼ਗੀ ਵਿਆਜ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀਆਂ ਦੇਖਣ ਲਈ ਉੱਪਰ ਦਿੱਤੀ ਸੂਚੀ ਵਿੱਚੋਂ ਕਿਸਾਨ ਚੁਣੋ।
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ============================================================== */}
          {/* 2. FARMER LINKING STATUS BANNER */}
          {/* ============================================================== */}
          {accountSummary.isMainFarmer && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-50 to-emerald-50 rounded-2xl border border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-600 text-white text-[11px] font-black rounded-md">
                      ਮੁੱਖ ਕਿਸਾਨ ਖਾਤਾ (MAIN FARMER POOL)
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      ਲਿੰਕਡ ਸਬ-ਕਿਸਾਨ: {accountSummary.linkedFarmersList?.length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ਇਸ ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਆਮਦ ਸਟਾਕ (<strong>{accountSummary.mandiArrivalBags} ਬੋਰੇ</strong>) ਵਿੱਚੋਂ ਸਬ-ਕਿਸਾਨਾਂ ਦੁਆਰਾ{' '}
                    <strong>{accountSummary.linkedPurchasedBags} ਬੋਰੇ</strong> ਖਰੀਦੇ ਗਏ ਹਨ। ਬਾਕੀ ਅਣਵਿਕਿਆ ਸਟਾਕ:{' '}
                    <strong className="text-rose-700">{accountSummary.remainingBags} ਬੋਰੇ</strong>
                  </p>
                </div>
              </div>

              {accountSummary.linkedFarmersList && accountSummary.linkedFarmersList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {accountSummary.linkedFarmersList.map((lf) => (
                    <button
                      key={lf.id}
                      onClick={() => {
                        setSelectedFarmerId(lf.id);
                        const f = farmers.find((farm) => farm.id === lf.id);
                        if (f) setSelectedFarmerForAccount(f);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 transition-all"
                      title="View Linked Farmer Account"
                    >
                      <LinkIcon className="w-3 h-3 text-amber-700" />
                      <span>{lf.farmerNamePa}</span>
                      <span className="text-[10px] text-amber-700 font-mono">[{lf.id}]</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {accountSummary.isLinkedFarmer && accountSummary.linkedToMainFarmer && (
            <div className="p-4 bg-gradient-to-r from-blue-500/10 via-blue-50 to-indigo-50 rounded-2xl border border-blue-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-[11px] font-black rounded-md">
                      ਲਿੰਕਡ ਸਬ-ਕਿਸਾਨ (LINKED SUB-FARMER)
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      ਮੁੱਖ ਕਿਸਾਨ:{' '}
                      <strong className="text-blue-900">
                        {accountSummary.linkedToMainFarmer.farmerNamePa} ({accountSummary.linkedToMainFarmer.farmerName})
                      </strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ਇਸ ਕਿਸਾਨ ਦੀਆਂ ਖਰੀਦਾਂ ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਮੰਡੀ ਆਮਦ ਸਟਾਕ ਪੂਲ ਵਿੱਚੋਂ ਆਟੋਮੈਟਿਕ ਘਟਾਈਆਂ ਜਾਂਦੀਆਂ ਹਨ। ਕੋਈ ਡਬਲ ਕਾਊਂਟਿੰਗ
                    ਨਹੀਂ ਹੁੰਦੀ।
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (accountSummary.linkedToMainFarmer) {
                    setSelectedFarmerId(accountSummary.linkedToMainFarmer.id);
                    const f = farmers.find((farm) => farm.id === accountSummary.linkedToMainFarmer?.id);
                    if (f) setSelectedFarmerForAccount(f);
                  }
                }}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0 transition-all"
              >
                <span>ਮੁੱਖ ਕਿਸਾਨ ਖਾਤਾ ਦੇਖੋ (Go to Main Farmer)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. FARMER PROFILE & PRIMARY ACTION TOOLBAR */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100">
              <div className="flex items-start gap-4">
                {/* Photo / Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                  {currentFarmer.photoUrl ? (
                    <img
                      src={currentFarmer.photoUrl}
                      alt={currentFarmer.farmerName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900">
                      {currentFarmer.farmerNamePa} ({currentFarmer.farmerName})
                    </h2>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold rounded-lg text-xs border border-slate-200">
                      {currentFarmer.id}
                    </span>
                    <button
                      onClick={handleCopyFarmerId}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copy Farmer ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">ਪਿਤਾ ਦਾ ਨਾਮ: </span>
                      <strong className="text-slate-800">{currentFarmer.fatherNamePa || currentFarmer.fatherName || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">ਪਿੰਡ: </span>
                      <strong className="text-slate-800">{currentFarmer.villagePa} ({currentFarmer.village})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">ਮੋਬਾਈਲ: </span>
                      <strong className="text-slate-800">{currentFarmer.mobile || '—'}</strong>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">ਆਧਾਰ: </span>
                      <strong className="text-slate-800 font-mono">
                        {showMaskedAadhaar ? maskAadhaarNumber(currentFarmer.aadhaar) : currentFarmer.aadhaar}
                      </strong>
                      <button
                        onClick={() => setShowMaskedAadhaar(!showMaskedAadhaar)}
                        className="text-slate-400 hover:text-slate-700"
                        title={showMaskedAadhaar ? 'Show full Aadhaar' : 'Hide Aadhaar'}
                      >
                        {showMaskedAadhaar ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
                <button
                  onClick={() => setIsViewProfileOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>ਪ੍ਰੋਫਾਈਲ (View)</span>
                </button>

                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>ਸੋਧੋ (Edit)</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{isExportingPDF ? 'ਬਣ ਰਿਹਾ ਹੈ...' : 'ਖਾਤਾ PDF'}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>ਪ੍ਰਿੰਟ (Print)</span>
                </button>

                <button
                  onClick={handleDeleteFarmer}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Delete Farmer Account"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>ਡਿਲੀਟ</span>
                </button>
              </div>
            </div>

            {/* Sub-bar: Bank Details, Bardana, and Quick Transaction Launchers */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50/50">
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5 shadow-2xs">
                <Building className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 truncate">
                  <div className="font-bold text-slate-900">ਬੈਂਕ ਖਾਤਾ (Bank Details)</div>
                  <div className="text-slate-600 truncate">{currentFarmer.bankDetails?.bankName || 'ਬੈਂਕ ਨਾਮ ਦਰਜ ਨਹੀਂ'}</div>
                  <div className="font-mono text-slate-800">
                    A/C: {currentFarmer.bankDetails?.accountNumber || '—'} • IFSC: {currentFarmer.bankDetails?.ifscCode || '—'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2.5 shadow-2xs">
                <Layers className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900">ਬਾਰਦਾਨਾ ਵਰਤੋਂ (Bardana Used)</div>
                  <div className="text-slate-600">
                    ਨਵਾਂ: <strong>{accountSummary.newBardanaUsed}</strong> • ਪੁਰਾਣਾ: <strong>{accountSummary.oldBardanaUsed}</strong>
                  </div>
                  <div className="text-indigo-900 font-semibold">
                    ਕੁੱਲ ਵਰਤਿਆ ਬਾਰਦਾਨਾ: {accountSummary.totalBardanaUsed} ਬੋਰੇ
                  </div>
                </div>
              </div>

              {/* Quick Transaction Adders */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between gap-2 print:hidden shadow-2xs">
                <div>
                  <div className="font-bold text-emerald-950">ਨਵਾਂ ਲੈਣ-ਦੇਣ ਦਰਜ ਕਰੋ</div>
                  <div className="text-[11px] text-emerald-700">ਸਿੱਧਾ ਇਸ ਕਿਸਾਨ ਲਈ ਐਂਟਰੀ</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedFarmerForBags(currentFarmer);
                      setActiveSection('bags-entry');
                    }}
                    className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium shadow-2xs transition-all"
                    title="Enter Bags"
                  >
                    + ਤੁਲਾਈ
                  </button>
                  <button
                    onClick={() => setActiveSection('daily-purchase')}
                    className="px-2 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-medium shadow-2xs transition-all"
                    title="Enter Daily Purchase"
                  >
                    + ਖਰੀਦ
                  </button>
                  <button
                    onClick={handleOpenAddAdvance}
                    className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-all"
                    title="Record Advance"
                  >
                    + ਪੇਸ਼ਗੀ
                  </button>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="px-2 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-medium shadow-2xs transition-all"
                    title="Record Payment"
                  >
                    + ਭੁਗਤਾਨ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4. COMPREHENSIVE FINAL ACCOUNTING SUMMARY CARD (KEY RECONCILIATION) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600 shadow-md overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calculator className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm">
                    ਅੰਤਿਮ ਖਾਤਾ ਅਤੇ ਹਿਸਾਬ-ਕਿਤਾਬ ਸਾਰਾਂਸ਼ / FINAL ACCOUNT RECONCILIATION
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    ਮੰਡੀ ਆਮਦ, ਲੇਬਰ ਕਟੌਤੀਆਂ, ਏਜੰਸੀ ਖਰੀਦ, ਪੇਸ਼ਗੀ (ਐਡਵਾਂਸ) ਵਿਆਜ ਅਤੇ ਅੰਤਿਮ ਬਕਾਇਆ
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-emerald-300">ਅੰਤਿਮ ਬਕਾਇਆ (Final Settlement)</div>
                <div className="text-lg font-black text-amber-300">
                  {formatCurrencyINR(accountSummary.finalNetSettlementBalance)}
                </div>
              </div>
            </div>

            {/* Mathematical Step-by-Step Breakdown Grid */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-slate-50/70 border-b border-slate-200">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-medium">1. ਕੁੱਲ ਮੰਡੀ ਆਮਦ</div>
                <div className="text-base font-black text-indigo-900 mt-1">{accountSummary.mandiArrivalBags} Bags</div>
                <div className="text-[11px] text-slate-600 font-semibold">{accountSummary.mandiArrivalDisplay}</div>
                <div className="text-[10px] text-indigo-700 font-bold mt-1">
                  Gross: {formatCurrencyINR(accountSummary.totalGrossAmount)}
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-medium">2. ਲੇਬਰ ਕਟੌਤੀਆਂ</div>
                <div className="text-base font-black text-rose-700 mt-1">
                  -{formatCurrencyINR(accountSummary.totalLabourDeductions)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  <div>ਪੱਕੀ: {formatCurrencyINR(accountSummary.totalPakkiLabour)}</div>
                  <div>ਡਬਲ: {formatCurrencyINR(accountSummary.totalPakkaDoubleLabour)}</div>
                  <div>ਸੁੱਕੀ: {formatCurrencyINR(accountSummary.totalSukhiLabour)}</div>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-medium">3. ਏਜੰਸੀ ਖਰੀਦ</div>
                <div className="text-base font-black text-emerald-800 mt-1">
                  {accountSummary.purchasedBags} Bags
                </div>
                <div className="text-[11px] text-emerald-700 font-bold">
                  {formatCurrencyINR(accountSummary.purchasedAmount)}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  ਬਾਕੀ ਸਟਾਕ: <strong className="text-rose-700">{accountSummary.remainingBags} Bags</strong>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 shadow-2xs">
                <div className="text-indigo-800 font-bold">4. ਸ਼ੁੱਧ ਦੇਣਯੋਗ (Crop)</div>
                <div className="text-base font-black text-indigo-950 mt-1">
                  {formatCurrencyINR(accountSummary.netPayableAmount)}
                </div>
                <div className="text-[10px] text-indigo-600 mt-1 font-medium">
                  Gross − ਲੇਬਰ − ਏਜੰਸੀ ਖਰੀਦ
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 shadow-2xs">
                <div className="text-amber-800 font-bold">5. ਪੇਸ਼ਗੀ + ਵਿਆਜ</div>
                <div className="text-base font-black text-amber-950 mt-1">
                  -{formatCurrencyINR(accountSummary.totalAdvanceRecoverable)}
                </div>
                <div className="text-[10px] text-amber-800 mt-1 space-y-0.5">
                  <div>ਮੂਲ: {formatCurrencyINR(accountSummary.totalAdvancePrincipal)}</div>
                  <div>ਵਿਆਜ: {formatCurrencyINR(accountSummary.totalAdvanceInterest)}</div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border-2 border-emerald-500 shadow-xs">
                <div className="text-emerald-800 font-black uppercase text-[11px]">6. ਅੰਤਿਮ ਨਿਪਟਾਰਾ (Final)</div>
                <div className="text-base font-black text-emerald-950 mt-1">
                  {formatCurrencyINR(accountSummary.finalNetSettlementBalance)}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                  ਅਦਾ ਕੀਤੀ ਰਕਮ: {formatCurrencyINR(accountSummary.paidAmount)}
                </div>
              </div>
            </div>

            {/* A-to-Z Bilingual Complete Khata Summary & Calculation Breakup */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wide">
                    ਸੰਪੂਰਨ ਖਾਤਾ ਹਿਸਾਬ-ਕਿਤਾਬ A-ਤੋਂ-Z / Complete Khata Summary (A to Z)
                  </h4>
                </div>
                <button
                  onClick={() => setShowBreakupDetails(!showBreakupDetails)}
                  className="text-xs text-emerald-800 font-bold hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>{showBreakupDetails ? 'ਗਣਨਾ ਵੇਰਵਾ ਲੁਕਾਓ (Hide Breakup)' : 'ਗਣਨਾ ਵੇਰਵਾ ਦੇਖੋ (Show How Calculated)'}</span>
                </button>
              </div>

              {showBreakupDetails && (
                <div className="space-y-3 text-xs">
                  {/* Step A: Mandi Arrival */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-[10px]">A</span>
                        <span>ਝੋਨਾ ਮੰਡੀ ਆਮਦ ਤੁਲਾਈ (Paddy Mandi Arrival & Gross Amount @ ₹2,461/Qtl)</span>
                      </div>
                      <span className="text-sm font-black text-indigo-900">
                        {formatCurrencyINR(accountSummary.totalGrossAmount)}
                      </span>
                    </div>
                    <div className="mt-2 text-slate-600 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        ਕੁੱਲ ਬੋਰੇ (Total Bags): <strong className="text-slate-900">{accountSummary.mandiArrivalBags}</strong> •
                        ਕੁੱਲ ਵਜ਼ਨ: <strong className="text-slate-900">{accountSummary.mandiArrivalDisplay}</strong> ({(accountSummary.mandiArrivalQtl + accountSummary.mandiArrivalKg / 100).toFixed(2)} ਕੁਇੰਟਲ)
                      </div>
                      <div className="text-indigo-800 font-bold">
                        ਗਣਨਾ: {(accountSummary.mandiArrivalQtl + accountSummary.mandiArrivalKg / 100).toFixed(2)} Qtl × ₹2,461 = {formatCurrencyINR(accountSummary.totalGrossAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Step B: Labour Deductions */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-black text-[10px]">B</span>
                        <span>ਮੰਡੀ ਮਜ਼ਦੂਰੀ / ਲੇਬਰ ਕਟੌਤੀਆਂ (Mandi Labour Deductions)</span>
                      </div>
                      <span className="text-sm font-black text-rose-700">
                        -{formatCurrencyINR(accountSummary.totalLabourDeductions)}
                      </span>
                    </div>
                    <div className="mt-2 text-slate-600 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>ਪੱਕੀ ਲੇਬਰ (₹7/Qtl): <strong className="text-rose-700">-{formatCurrencyINR(accountSummary.totalPakkiLabour)}</strong></div>
                      <div>ਡਬਲ ਲੇਬਰ (₹14/Qtl): <strong className="text-rose-700">-{formatCurrencyINR(accountSummary.totalPakkaDoubleLabour)}</strong></div>
                      <div>ਸੁੱਕੀ ਲੇਬਰ (₹5/Qtl): <strong className="text-rose-700">-{formatCurrencyINR(accountSummary.totalSukhiLabour)}</strong></div>
                    </div>
                  </div>

                  {/* Step C: Agency Purchases & Payments */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[10px]">C</span>
                        <span>ਸਰਕਾਰੀ ਖਰੀਦ ਏਜੰਸੀਆਂ (Agency Purchases & Payments)</span>
                      </div>
                      <span className="text-sm font-black text-emerald-800">
                        {formatCurrencyINR(accountSummary.purchasedAmount)}
                      </span>
                    </div>
                    <div className="mt-2 text-slate-600 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        ਖਰੀਦ ਬੋਰੇ: <strong className="text-slate-900">{accountSummary.purchasedBags}</strong> •
                        ਖਰੀਦ ਵਜ਼ਨ: <strong className="text-slate-900">{accountSummary.purchasedWeightDisplay}</strong>
                      </div>
                      <div className="text-amber-800 font-bold">
                        ਮੰਡੀ ਵਿੱਚ ਬਾਕੀ ਝੋਨਾ ਸਟਾਕ: {accountSummary.remainingBags} ਬੋਰੇ ({accountSummary.remainingWeightDisplay})
                      </div>
                    </div>
                  </div>

                  {/* Step D: Remaining Paddy Crop Balance */}
                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200">
                    <div className="flex items-center justify-between font-bold text-indigo-950">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-200 text-indigo-900 flex items-center justify-center font-black text-[10px]">D</span>
                        <span>ਬਾਕੀ ਝੋਨਾ ਫਸਲ ਸ਼ੁੱਧ ਬਕਾਇਆ (Net Paddy Crop Balance Payable)</span>
                      </div>
                      <span className="text-sm font-black text-indigo-900">
                        {formatCurrencyINR(accountSummary.netPayableAmount)}
                      </span>
                    </div>
                    <div className="mt-2 text-indigo-900 font-mono text-[11px] bg-white p-2 rounded-lg border border-indigo-200">
                      ਫਾਰਮੂਲਾ: ਗ੍ਰਾਸ ਰਕਮ ({formatCurrencyINR(accountSummary.totalGrossAmount)}) − ਲੇਬਰ ({formatCurrencyINR(accountSummary.totalLabourDeductions)}) − ਏਜੰਸੀ ਖਰੀਦ ({formatCurrencyINR(accountSummary.purchasedAmount)}) = <strong className="text-indigo-800 font-black">{formatCurrencyINR(accountSummary.netPayableAmount)}</strong>
                      <span className="block text-[10px] text-slate-500 mt-0.5">*(ਨੋਟ: ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਨੂੰ ਫਸਲ ਹਿਸਾਬ ਵਿੱਚ ਬਿਲਕੁਲ ਮਿਕਸ ਨਹੀਂ ਕੀਤਾ ਗਿਆ)*</span>
                    </div>
                  </div>

                  {/* Step E: Multi-Entry Advances & Separate Interest */}
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                    <div className="flex items-center justify-between font-bold text-amber-950">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-black text-[10px]">E</span>
                        <span>ਪੇਸ਼ਗੀ ਮੂਲ ਅਤੇ ਸੁਤੰਤਰ ਮਹੀਨਾਵਾਰ ਵਿਆਜ (Independent Multi-Entry Advances & Interest)</span>
                      </div>
                      <span className="text-sm font-black text-rose-900">
                        -{formatCurrencyINR(accountSummary.totalAdvanceRecoverable)}
                      </span>
                    </div>

                    {/* Mini table of advances */}
                    {accountSummary.advances.length === 0 ? (
                      <div className="mt-2 text-slate-500 italic text-[11px] bg-white p-2 rounded-lg border border-amber-200">
                        ਕੋਈ ਪੇਸ਼ਗੀ ਦਰਜ ਨਹੀਂ ਹੈ। (No advance records found)
                      </div>
                    ) : (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-left text-[11px] bg-white rounded-lg border border-amber-200 overflow-hidden">
                          <thead className="bg-amber-100/70 text-amber-950 font-bold border-b border-amber-200">
                            <tr>
                              <th className="p-2">ਮੂਲ (Principal)</th>
                              <th className="p-2">ਸ਼ੁਰੂਆਤੀ ਮਿਤੀ</th>
                              <th className="p-2">ਅੰਤਿਮ ਮਿਤੀ</th>
                              <th className="p-2">ਦਰ %</th>
                              <th className="p-2">ਦਿਨ</th>
                              <th className="p-2">ਮਹੀਨੇ+ਦਿਨ</th>
                              <th className="p-2">ਵਿਆਜ (Interest)</th>
                              <th className="p-2 text-right">ਕੁੱਲ ਦੇਣਯੋਗ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-amber-100 font-mono">
                            {accountSummary.advances.map((adv) => (
                              <tr key={adv.id} className="hover:bg-amber-50/50">
                                <td className="p-2 font-bold text-slate-900">{formatCurrencyINR(adv.principal ?? adv.amount)}</td>
                                <td className="p-2 text-slate-700">{adv.startDate || adv.date}</td>
                                <td className="p-2 text-slate-700">{adv.endDate || adv.interestTillDate || '—'}</td>
                                <td className="p-2 text-amber-800">{adv.monthlyInterestRate ?? 2.0}%</td>
                                <td className="p-2 text-slate-700">{adv.totalDays || 0}d</td>
                                <td className="p-2 text-slate-700">{adv.monthsElapsed || 0}M+{adv.daysElapsed || 0}D</td>
                                <td className="p-2 font-bold text-amber-700">{formatCurrencyINR(adv.interestAmount || 0)}</td>
                                <td className="p-2 font-black text-rose-900 text-right">{formatCurrencyINR(adv.totalPayableWithInterest || (adv.amount + (adv.interestAmount || 0)))}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-amber-50/80 font-bold text-slate-900 border-t border-amber-200">
                            <tr>
                              <td className="p-2">ਕੁੱਲ ਮੂਲ: {formatCurrencyINR(accountSummary.totalAdvancePrincipal)}</td>
                              <td colSpan={4} className="p-2 text-center text-slate-500 text-[10px]">
                                30 ਦਿਨ ਮਹੀਨਾ ਕਨਵੈਨਸ਼ਨ ਅਨੁਸਾਰ ਹਰ ਇੱਕ ਐਡਵਾਂਸ ਦਾ ਸੁਤੰਤਰ ਹਿਸਾਬ
                              </td>
                              <td className="p-2 text-amber-800">ਕੁੱਲ ਵਿਆਜ: {formatCurrencyINR(accountSummary.totalAdvanceInterest)}</td>
                              <td colSpan={2} className="p-2 text-right text-rose-950 font-black">
                                ਮੂਲ + ਵਿਆਜ ਕੁੱਲ: {formatCurrencyINR(accountSummary.totalAdvanceRecoverable)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Step F: Direct Payments to Farmer */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-[10px]">F</span>
                        <span>ਕਿਸਾਨ ਨੂੰ ਸਿੱਧੇ ਭੁਗਤਾਨ (Direct Payments Paid to Farmer)</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">
                        -{formatCurrencyINR(accountSummary.paidAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Step G: Final Settlement Balance */}
                  <div className={`p-4 rounded-xl border-2 ${
                    accountSummary.finalNetSettlementBalance >= 0 
                      ? 'bg-emerald-50 border-emerald-500' 
                      : 'bg-rose-50 border-rose-500'
                  }`}>
                    <div className="flex items-center justify-between font-black">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                          accountSummary.finalNetSettlementBalance >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}>G</span>
                        <span className="text-sm">
                          ਅੰਤਿਮ ਹਿਸਾਬ ਬਕਾਇਆ (FINAL SETTLEMENT BALANCE):{' '}
                          <span className={accountSummary.finalNetSettlementBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                            {accountSummary.finalNetSettlementBalance >= 0 ? 'ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ (Payable to Farmer)' : 'ਕਿਸਾਨ ਤੋਂ ਵਸੂਲੀਯੋਗ (Recoverable from Farmer)'}
                          </span>
                        </span>
                      </div>
                      <span className={`text-lg font-black ${
                        accountSummary.finalNetSettlementBalance >= 0 ? 'text-emerald-950' : 'text-rose-950'
                      }`}>
                        {formatCurrencyINR(Math.abs(accountSummary.finalNetSettlementBalance))}
                      </span>
                    </div>
                    <div className="mt-2 text-slate-700 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-300">
                      ਅੰਤਿਮ ਹਿਸਾਬ ਫਾਰਮੂਲਾ: ਸ਼ੁੱਧ ਫਸਲ ਬਕਾਇਆ ({formatCurrencyINR(accountSummary.netPayableAmount)}) − ਕੁੱਲ ਪੇਸ਼ਗੀ+ਵਿਆਜ ({formatCurrencyINR(accountSummary.totalAdvanceRecoverable)}) − ਸਿੱਧਾ ਭੁਗਤਾਨ ({formatCurrencyINR(accountSummary.paidAmount)}) = <strong className="text-slate-900">{formatCurrencyINR(accountSummary.finalNetSettlementBalance)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 5. NAVIGATION TABS BAR */}
          {/* ============================================================== */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-2 text-xs font-semibold print:hidden">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>ਸਮੁੱਚਾ ਰਿਕਾਰਡ (All)</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {accountSummary.transactions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('arrival')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'arrival'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>1. ਮੰਡੀ ਆਮਦ (Arrivals)</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {accountSummary.mandiArrivalEntries.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'purchases'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>2. ਖਰੀਦ & ਏਜੰਸੀਆਂ (Purchases)</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {accountSummary.purchaseRecords.length}
              </span>
            </button>

            {accountSummary.isMainFarmer && (
              <button
                onClick={() => setActiveTab('linked')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'linked'
                    ? 'bg-amber-700 text-white shadow-sm font-bold'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                }`}
              >
                <span>🔗 ਲਿੰਕਡ ਖਰੀਦਾਂ (Linked Sub-Purchases)</span>
                <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                  {accountSummary.linkedPurchasesList?.length || 0}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('advances')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'advances'
                  ? 'bg-amber-800 text-white shadow-sm font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>5. ਪੇਸ਼ਗੀ / ਐਡਵਾਂਸ & ਵਿਆਜ (Advances)</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {accountSummary.advances?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('boli')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'boli'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>3. ਬੋਲੀ (Auctions)</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {accountSummary.boliRecords.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'payments'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>4. ਭੁਗਤਾਨ (Payments)</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {accountSummary.paymentRecords.length}
              </span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* 6A. MANDI ARRIVAL SUMMARY & SLIPS TABLE */}
          {/* ============================================================== */}
          {(activeTab === 'all' || activeTab === 'arrival') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      1. ਮੰਡੀ ਆਮਦ ਤੁਲਾਈ ਸਾਰਾਂਸ਼ / MANDI ARRIVAL SUMMARY
                    </h3>
                    <p className="text-xs text-slate-500">ਕਿਸਾਨ ਦੁਆਰਾ ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਗਈਆਂ ਬੋਰੀਆਂ ਅਤੇ ਵਜ਼ਨ</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-indigo-900">
                    ਕੁੱਲ ਬੋਰੇ: {accountSummary.mandiArrivalBags}
                  </div>
                  <div className="text-[11px] text-slate-500">{accountSummary.mandiArrivalDisplay}</div>
                </div>
              </div>

              {accountSummary.mandiArrivalEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ਇਸ ਕਿਸਾਨ ਲਈ ਅਜੇ ਕੋਈ ਮੰਡੀ ਤੁਲਾਈ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ। (No arrival slips recorded)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">ਮਿਤੀ (Date)</th>
                        <th className="p-3">ਰਸੀਦ ਨੰਬਰ (Slip #)</th>
                        <th className="p-3">ਬੋਰੇ (Bags)</th>
                        <th className="p-3">ਕੁੱਲ ਵਜ਼ਨ (Total Weight)</th>
                        <th className="p-3">ਤੋਤਾ (Tota Kg)</th>
                        <th className="p-3">ਬਾਰਦਾਨਾ (Bardana)</th>
                        <th className="p-3">ਸਰਕਾਰੀ ਰੇਟ (Rate)</th>
                        <th className="p-3 text-right">ਕੁੱਲ ਰਕਮ (Amount)</th>
                        <th className="p-3 text-center print:hidden">ਕਾਰਵਾਈ (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accountSummary.mandiArrivalEntries.map((slip) => (
                        <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium text-slate-900">{slip.date}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{slip.entryNumber}</td>
                          <td className="p-3 font-bold text-slate-900">{slip.bags} Bags</td>
                          <td className="p-3 font-semibold text-slate-800">{slip.grandTotalDisplay}</td>
                          <td className="p-3 text-slate-500">{slip.totaKg} Kg</td>
                          <td className="p-3">
                            {slip.newBags !== undefined || slip.oldBags !== undefined ? (
                              (slip.newBags || 0) > 0 && (slip.oldBags || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-900">
                                  ਨਵਾਂ {slip.newBags} + ਪੁਰਾਣਾ {slip.oldBags}
                                </span>
                              ) : (slip.newBags || 0) > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  ਨਵਾਂ ({slip.newBags})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                  ਪੁਰਾਣਾ ({slip.oldBags})
                                </span>
                              )
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  slip.bardana === 'NEW' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {slip.bardana}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">₹{slip.ratePerQtl || 2461}/Q</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {formatCurrencyINR(slip.totalAmount)}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <button
                              onClick={() => {
                                confirmDelete({
                                  recordNameEn: `Slip ${slip.entryNumber}`,
                                  recordNamePa: `ਰਸੀਦ ${slip.entryNumber}`,
                                  recordId: slip.entryNumber,
                                  itemDetails: [
                                    { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ', value: `${slip.farmerNamePa} (${slip.farmerId})` },
                                    { labelEn: 'Bags', labelPa: 'ਬੋਰੀਆਂ', value: `${slip.bags} Bags` },
                                    { labelEn: 'Weight', labelPa: 'ਵਜ਼ਨ', value: slip.grandTotalDisplay }
                                  ],
                                  onConfirm: () => {
                                    deleteBagsEntry(slip.id);
                                    notifyDeleteSuccess({
                                      titlePa: 'ਤੁਲਾਈ ਰਸੀਦ ਸਫਲਤਾਪੂਰਵਕ ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।',
                                      titleEn: 'Slip Deleted Successfully',
                                      messagePa: `ਰਸੀਦ ${slip.entryNumber} ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ ਅਤੇ ਬਾਕੀ ਸਟਾਕ ਅਪਡੇਟ ਹੋ ਗਿਆ ਹੈ।`
                                    });
                                  }
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete weighment slip"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="p-3 text-right">ਕੁੱਲ ਆਮਦ ਜੋੜ (Total):</td>
                        <td className="p-3">{accountSummary.mandiArrivalBags} Bags</td>
                        <td colSpan={4} className="p-3">{accountSummary.mandiArrivalDisplay}</td>
                        <td className="p-3 text-right">
                          {formatCurrencyINR(accountSummary.totalGrossAmount)}
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 6B. DAILY PURCHASE & AGENCY BREAKDOWN */}
          {/* ============================================================== */}
          {(activeTab === 'all' || activeTab === 'purchases') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      2. ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਅਤੇ ਏਜੰਸੀ-ਵਾਰ ਵੇਰਵਾ / DAILY PURCHASE & AGENCY BREAKDOWN
                    </h3>
                    <p className="text-xs text-slate-500">ਵੱਖ-ਵੱਖ ਖਰੀਦ ਏਜੰਸੀਆਂ ਦੁਆਰਾ ਕੀਤੀ ਗਈ ਖਰੀਦ ਅਤੇ ਬਾਕੀ ਮਾਤਰਾ</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-900">
                    ਖਰੀਦੇ ਬੋਰੇ: {accountSummary.purchasedBags} / ਬਾਕੀ: {accountSummary.remainingBags}
                  </div>
                  <div className="text-[11px] text-slate-500">{accountSummary.purchasedWeightDisplay}</div>
                </div>
              </div>

              {/* Agency Breakdown Cards */}
              {accountSummary.agencyWisePurchases.length > 0 && (
                <div className="p-4 bg-emerald-50/50 border-b border-emerald-100">
                  <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider mb-2">
                    ਏਜੰਸੀ-ਵਾਰ ਖਰੀਦ ਸੰਖੇਪ (Agency Procurement Summary):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {accountSummary.agencyWisePurchases.map((ag) => (
                      <div key={ag.agency} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs">
                        <div className="font-bold text-emerald-900 text-xs">{ag.agency}</div>
                        <div className="text-lg font-black text-slate-900 mt-1">{ag.bags} Bags</div>
                        <div className="text-[11px] text-slate-500">{formatCurrencyINR(ag.amount)}</div>
                      </div>
                    ))}
                    <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200 shadow-2xs">
                      <div className="font-bold text-rose-800 text-xs">ਬਾਕੀ ਅਣਵਿਕਿਆ (Remaining)</div>
                      <div className="text-lg font-black text-rose-950 mt-1">{accountSummary.remainingBags} Bags</div>
                      <div className="text-[11px] text-rose-700">{accountSummary.remainingWeightDisplay}</div>
                    </div>
                  </div>
                </div>
              )}

              {accountSummary.purchaseRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ਇਸ ਕਿਸਾਨ ਦੀ ਅਜੇ ਕੋਈ ਸਿੱਧੀ ਖਰੀਦ ਦਰਜ ਨਹੀਂ ਹੋਈ। (No direct purchase records yet)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">ਮਿਤੀ (Date)</th>
                        <th className="p-3">ਖਰੀਦ ਏਜੰਸੀ (Agency)</th>
                        <th className="p-3">ਵਾਊਚਰ / ਬੋਲੀ (Voucher / Ref)</th>
                        <th className="p-3">ਬੋਰੇ (Bags)</th>
                        <th className="p-3">ਵਜ਼ਨ (Weight)</th>
                        <th className="p-3">ਰੇਟ (Rate)</th>
                        <th className="p-3 text-right">ਰਕਮ (Total Amount)</th>
                        <th className="p-3 text-center print:hidden">ਕਾਰਵਾਈ (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accountSummary.purchaseRecords.map((pur) => (
                        <tr key={pur.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium text-slate-900">{pur.date}</td>
                          <td className="p-3 font-bold text-emerald-800">{pur.agency}</td>
                          <td className="p-3 font-mono text-slate-600">
                            {pur.id} {pur.boliNumber ? `(Boli: ${pur.boliNumber})` : ''}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{pur.bags} Bags</td>
                          <td className="p-3 font-semibold text-slate-800">
                            {pur.totalWeightDisplay || `${pur.qul} Qul ${pur.kg} Kg`}
                          </td>
                          <td className="p-3 text-slate-700">₹{pur.rate}/Q</td>
                          <td className="p-3 text-right font-black text-emerald-950">
                            {formatCurrencyINR(pur.totalAmount)}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <button
                              onClick={() => {
                                confirmDelete({
                                  recordNameEn: `Purchase ${pur.id}`,
                                  recordNamePa: `ਖਰੀਦ ਵਾਊਚਰ ${pur.id}`,
                                  recordId: pur.id,
                                  itemDetails: [
                                    { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ', value: `${pur.farmerNamePa} (${pur.farmerId})` },
                                    { labelEn: 'Agency', labelPa: 'ਏਜੰਸੀ', value: pur.agency },
                                    { labelEn: 'Bags', labelPa: 'ਬੋਰੀਆਂ', value: `${pur.bags} Bags` },
                                    { labelEn: 'Amount', labelPa: 'ਰਕਮ', value: formatCurrencyINR(pur.totalAmount) }
                                  ],
                                  onConfirm: () => {
                                    deleteDailyPurchase(pur.id);
                                    notifyDeleteSuccess({
                                      titlePa: 'ਖਰੀਦ ਵਾਊਚਰ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
                                      titleEn: 'Purchase Deleted Successfully',
                                      messagePa: `ਖਰੀਦ ${pur.id} ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ ਅਤੇ ${pur.bags} ਬੋਰੀਆਂ ਵਾਪਸ ਬਾਕੀ ਸਟਾਕ ਵਿੱਚ ਜਮ੍ਹਾ ਹੋ ਗਈਆਂ ਹਨ।`
                                    });
                                  }
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete purchase and restore bags"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                        <td colSpan={3} className="p-3 text-right">ਕੁੱਲ ਸਿੱਧੀ ਖਰੀਦ ਜੋੜ:</td>
                        <td className="p-3">{accountSummary.directPurchasedBags} Bags</td>
                        <td colSpan={2} className="p-3"></td>
                        <td className="p-3 text-right text-emerald-900">
                          {formatCurrencyINR(accountSummary.totalAgencyPurchasePayment)}
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 6C. LINKED SUB-FARMER PURCHASES (IF MAIN FARMER) */}
          {/* ============================================================== */}
          {accountSummary.isMainFarmer && (activeTab === 'all' || activeTab === 'linked') && (
            <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-sm overflow-hidden">
              <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-amber-700" />
                  <div>
                    <h3 className="font-black text-amber-950 text-sm">
                      ਲਿੰਕਡ ਸਬ-ਕਿਸਾਨਾਂ ਦੁਆਰਾ ਕੀਤੀਆਂ ਖਰੀਦਾਂ / LINKED SUB-FARMER PURCHASES
                    </h3>
                    <p className="text-xs text-amber-800">
                      ਇਹ ਬੋਰੀਆਂ ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਆਮਦ ਸਟਾਕ ਵਿੱਚੋਂ ਕੱਟੀਆਂ ਗਈਆਂ ਹਨ (Main Farmer Account Deduction)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-amber-900">
                    ਕੁੱਲ ਲਿੰਕਡ ਬੋਰੇ: {accountSummary.linkedPurchasedBags} Bags
                  </div>
                </div>
              </div>

              {accountSummary.linkedPurchasesList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ਲਿੰਕ ਕੀਤੇ ਕਿਸਾਨਾਂ ਦੁਆਰਾ ਅਜੇ ਕੋਈ ਖਰੀਦ ਦਰਜ ਨਹੀਂ ਹੋਈ।
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200">
                        <th className="p-3">ਮਿਤੀ (Date)</th>
                        <th className="p-3">ਲਿੰਕਡ ਸਬ-ਕਿਸਾਨ (Linked Sub-Farmer)</th>
                        <th className="p-3">ਖਰੀਦ ਏਜੰਸੀ (Agency)</th>
                        <th className="p-3">ਬੋਰੇ (Bags)</th>
                        <th className="p-3">ਵਜ਼ਨ (Weight)</th>
                        <th className="p-3">ਰੇਟ (Rate)</th>
                        <th className="p-3 text-right">ਕੁੱਲ ਰਕਮ (Amount)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {accountSummary.linkedPurchasesList.map((lp) => (
                        <tr key={lp.id} className="hover:bg-amber-50/50 transition-colors">
                          <td className="p-3 font-medium text-slate-900">{lp.date}</td>
                          <td className="p-3 font-bold text-amber-900">
                            {lp.linkedFarmerNamePa || lp.linkedFarmerName}
                            <span className="font-mono text-[11px] text-amber-700 ml-1">[{lp.linkedFarmerId}]</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{lp.agency}</td>
                          <td className="p-3 font-black text-slate-900">{lp.bags} Bags</td>
                          <td className="p-3 text-slate-700">{lp.qul} Qul {lp.kg} Kg</td>
                          <td className="p-3 text-slate-700">₹{lp.rate}/Q</td>
                          <td className="p-3 text-right font-black text-amber-950">
                            {formatCurrencyINR(lp.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-100 font-black text-amber-950 border-t border-amber-200">
                        <td colSpan={3} className="p-3 text-right">ਕੁੱਲ ਲਿੰਕਡ ਖਰੀਦ ਜੋੜ:</td>
                        <td className="p-3">{accountSummary.linkedPurchasedBags} Bags</td>
                        <td colSpan={2} className="p-3"></td>
                        <td className="p-3 text-right">
                          {formatCurrencyINR(
                            accountSummary.linkedPurchasesList.reduce((s, p) => s + (p.totalAmount || 0), 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 6D. ADVANCES & INTEREST BREAKDOWN */}
          {/* ============================================================== */}
          {(activeTab === 'all' || activeTab === 'advances') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-700" />
                  <div>
                    <h3 className="font-bold text-amber-950 text-sm">
                      5. ਪੇਸ਼ਗੀ / ਐਡਵਾਂਸ & ਵਿਆਜ ਹਿਸਾਬ / FARMER ADVANCE & ACCRUED INTEREST
                    </h3>
                    <p className="text-xs text-amber-800">
                      ਮਿਤੀ-ਦਰ-ਮਿਤੀ (30 ਦਿਨ ਮਹੀਨਾ ਕਨਵੈਨਸ਼ਨ) ਮੁਤਾਬਕ ਪੇਸ਼ਗੀ ਮੂਲ ਰਕਮ ਅਤੇ ਵਿਆਜ ਦੀ ਗਣਨਾ
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenAddAdvance}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all print:hidden"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ਨਵੀਂ ਪੇਸ਼ਗੀ ਦਰਜ ਕਰੋ (+ Record Advance)</span>
                </button>
              </div>

              {/* Advance Summary Highlights */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/30 border-b border-amber-100 text-xs">
                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                  <div className="text-amber-800 font-semibold">ਕੁੱਲ ਪੇਸ਼ਗੀ ਮੂਲ (Total Principal)</div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {formatCurrencyINR(accountSummary.totalAdvancePrincipal)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                  <div className="text-amber-800 font-semibold">ਕੁੱਲ ਜੁੜਿਆ ਵਿਆਜ (Total Interest)</div>
                  <div className="text-lg font-black text-amber-700 mt-1">
                    {formatCurrencyINR(accountSummary.totalAdvanceInterest)}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                  <div className="text-rose-800 font-semibold">ਮੂਲ + ਵਿਆਜ ਕੁੱਲ (Principal + Interest Total)</div>
                  <div className="text-lg font-black text-rose-950 mt-1">
                    {formatCurrencyINR(accountSummary.totalAdvanceRecoverable)}
                  </div>
                </div>
              </div>

              {accountSummary.advances.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ਇਸ ਕਿਸਾਨ ਲਈ ਕੋਈ ਪੇਸ਼ਗੀ / ਐਡਵਾਂਸ ਰਿਕਾਰਡ ਦਰਜ ਨਹੀਂ ਹੈ। (No active advance records)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">ਮੂਲ ਰਕਮ (Principal)</th>
                        <th className="p-3">ਸ਼ੁਰੂਆਤੀ ਮਿਤੀ (Start Date)</th>
                        <th className="p-3">ਅੰਤਿਮ ਮਿਤੀ (End Date)</th>
                        <th className="p-3">ਦਰ % (Rate)</th>
                        <th className="p-3">ਦਿਨ (Days)</th>
                        <th className="p-3">ਮਹੀਨੇ+ਦਿਨ (Months+Days)</th>
                        <th className="p-3">ਜੁੜਿਆ ਵਿਆਜ (Interest)</th>
                        <th className="p-3">ਮੂਲ + ਵਿਆਜ (Total)</th>
                        <th className="p-3">ਢੰਗ / ਟਿੱਪਣੀ (Mode / Remarks)</th>
                        <th className="p-3 text-center print:hidden">ਕਾਰਵਾਈ (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accountSummary.advances.map((adv) => (
                        <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-black text-slate-900">
                            {formatCurrencyINR(adv.principal ?? adv.amount)}
                          </td>
                          <td className="p-3 font-medium text-slate-900">{adv.startDate || adv.date}</td>
                          <td className="p-3 font-medium text-slate-700">
                            {adv.endDate || adv.interestTillDate || '—'}
                          </td>
                          <td className="p-3 font-semibold text-amber-800">
                            {adv.monthlyInterestRate ?? 2.0}% / Mo
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {adv.totalDays || 0} ਦਿਨ
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {adv.monthsElapsed || 0}M + {adv.daysElapsed || 0}D
                          </td>
                          <td className="p-3 font-bold text-amber-700">
                            {formatCurrencyINR(adv.interestAmount || 0)}
                          </td>
                          <td className="p-3 font-black text-rose-900">
                            {formatCurrencyINR(adv.totalPayableWithInterest || (adv.amount + (adv.interestAmount || 0)))}
                          </td>
                          <td className="p-3 text-slate-500">
                            <span className="font-semibold text-slate-700">{adv.paymentMode}</span>
                            {adv.remarks ? ` • ${adv.remarks}` : ''}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewingAdvance(adv)}
                                className="p-1 text-slate-400 hover:text-blue-700 rounded transition-colors"
                                title="ਹਿਸਾਬ ਦੇਖੋ (View full interest calculation)"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditAdvance(adv)}
                                className="p-1 text-slate-400 hover:text-emerald-700 rounded transition-colors"
                                title="ਸੋਧੋ (Edit advance)"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAdvance(adv)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="ਮਿਟਾਓ (Delete advance)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t border-slate-200">
                        <td className="p-3">{formatCurrencyINR(accountSummary.totalAdvancePrincipal)}</td>
                        <td colSpan={5} className="p-3 text-right text-slate-600 font-bold">
                          ਕੁੱਲ ਜੋੜ (Summary Totals):
                        </td>
                        <td className="p-3 text-amber-800 font-black">
                          {formatCurrencyINR(accountSummary.totalAdvanceInterest)}
                        </td>
                        <td className="p-3 text-rose-950 font-black">
                          {formatCurrencyINR(accountSummary.totalAdvanceRecoverable)}
                        </td>
                        <td colSpan={2} className="print:hidden"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 6E. BOLI / AUCTION SUMMARY */}
          {/* ============================================================== */}
          {(activeTab === 'all' || activeTab === 'boli') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      3. ਬੋਲੀ / ਨਿਲਾਮੀ ਵੇਰਵਾ / BOLI & AUCTION SUMMARY
                    </h3>
                    <p className="text-xs text-slate-500">ਕਿਸਾਨ ਦੀ ਫਸਲ ਦੀ ਬੋਲੀ ਅਤੇ ਖਰੀਦਦਾਰ ਏਜੰਸੀਆਂ ਦਾ ਰਿਕਾਰਡ</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-amber-900">
                  ਕੁੱਲ ਬੋਲੀ ਰਿਕਾਰਡ: {accountSummary.boliRecords.length}
                </div>
              </div>

              {accountSummary.boliRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ਇਸ ਕਿਸਾਨ ਲਈ ਕੋਈ ਵੱਖਰੀ ਬੋਲੀ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ। (No auction records found)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">ਮਿਤੀ (Date)</th>
                        <th className="p-3">ਖਰੀਦਦਾਰ ਏਜੰਸੀ (Agency)</th>
                        <th className="p-3">ਬੋਲੀ / ਗੇਟ ਪਾਸ (Boli / Gate Pass)</th>
                        <th className="p-3">ਬੋਰੇ (Bags)</th>
                        <th className="p-3">ਕੁੱਲ ਵਜ਼ਨ (Weight)</th>
                        <th className="p-3">ਰੇਟ (Rate)</th>
                        <th className="p-3 text-right">ਕੁੱਲ ਰਕਮ (Amount)</th>
                        <th className="p-3 text-center">ਸਥਿਤੀ (Status)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accountSummary.boliRecords.map((b, idx) => (
                        <tr key={b.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium text-slate-900">{b.date}</td>
                          <td className="p-3 font-bold text-slate-800">{b.agency}</td>
                          <td className="p-3 font-mono text-slate-600">{b.boliNumber || b.id}</td>
                          <td className="p-3 font-bold text-slate-900">{b.bags} Bags</td>
                          <td className="p-3 font-semibold text-slate-800">{`${b.qul} Qul ${b.kg} Kg`}</td>
                          <td className="p-3 text-slate-700">₹{b.rate}/Q</td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {formatCurrencyINR(b.totalAmount)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {b.status || 'CONFIRMED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 6F. PAYMENTS & TRANSFERS */}
          {/* ============================================================== */}
          {(activeTab === 'all' || activeTab === 'payments') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-700" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      4. ਭੁਗਤਾਨ ਅਤੇ ਅਦਾਇਗੀ ਸਾਰਾਂਸ਼ / PAYMENT & TRANSFERS
                    </h3>
                    <p className="text-xs text-slate-500">ਅਦਾ ਕੀਤੀ ਰਕਮ, ਬਕਾਇਆ ਰਕਮ ਅਤੇ ਬੈਂਕ ਟ੍ਰਾਂਸਫਰ ਰਿਕਾਰਡ</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all print:hidden"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ਨਵਾਂ ਭੁਗਤਾਨ ਦਰਜ ਕਰੋ (+ Record Payment)</span>
                </button>
              </div>

              {/* Payment Summary Header */}
              <div className="p-4 grid grid-cols-3 gap-3 bg-slate-50/70 border-b border-slate-100 text-center text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-slate-500">ਸ਼ੁੱਧ ਦੇਣਯੋਗ (Net Payable)</div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {formatCurrencyINR(accountSummary.netPayableAmount)}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-emerald-800 font-semibold">ਅਦਾ ਕੀਤੀ ਰਕਮ (Paid Amount)</div>
                  <div className="text-lg font-black text-emerald-950 mt-1">
                    {formatCurrencyINR(accountSummary.paidAmount)}
                  </div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-rose-800 font-semibold">ਅੰਤਿਮ ਬਕਾਇਆ (Final Settlement)</div>
                  <div className="text-lg font-black text-rose-950 mt-1">
                    {formatCurrencyINR(accountSummary.finalNetSettlementBalance)}
                  </div>
                </div>
              </div>

              {accountSummary.paymentRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ਕੋਈ ਵੱਖਰੀ ਅਦਾਇਗੀ ਰਿਕਾਰਡ ਦਰਜ ਨਹੀਂ ਹੈ। (No manual payment transactions logged)
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3">ਮਿਤੀ (Date)</th>
                        <th className="p-3">ਅਦਾਇਗੀ ਦਾ ਢੰਗ (Payment Mode)</th>
                        <th className="p-3">ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਨੰਬਰ (Ref #)</th>
                        <th className="p-3">ਏਜੰਸੀ (Agency)</th>
                        <th className="p-3">ਟਿੱਪਣੀ (Remarks)</th>
                        <th className="p-3 text-right">ਰਕਮ (Amount)</th>
                        <th className="p-3 text-center print:hidden">ਕਾਰਵਾਈ (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accountSummary.paymentRecords.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium text-slate-900">{pay.date}</td>
                          <td className="p-3 font-bold text-slate-800">{pay.paymentMode}</td>
                          <td className="p-3 font-mono text-slate-600">{pay.referenceNumber || '—'}</td>
                          <td className="p-3 text-slate-700">{pay.agency || '—'}</td>
                          <td className="p-3 text-slate-500">{pay.remarks || '—'}</td>
                          <td className="p-3 text-right font-black text-emerald-800">
                            {formatCurrencyINR(pay.amount)}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <button
                              onClick={() => {
                                deleteFarmerPayment(pay.id);
                                notifyDeleteSuccess({
                                  titlePa: 'ਭੁਗਤਾਨ ਰਿਕਾਰਡ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
                                  titleEn: 'Payment Deleted',
                                  messagePa: 'ਭੁਗਤਾਨ ਐਂਟਰੀ ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।'
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 6G. COMPLETE UNIFIED CHRONOLOGICAL TRANSACTION LEDGER */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    ਸਮੁੱਚਾ ਲੈਣ-ਦੇਣ ਦਾ ਇਤਿਹਾਸ / COMPLETE CHRONOLOGICAL TRANSACTION LEDGER
                  </h3>
                  <p className="text-xs text-slate-400">
                    ਮੰਡੀ ਆਮਦ, ਖਰੀਦ, ਪੇਸ਼ਗੀ (ਐਡਵਾਂਸ), ਬੋਲੀ ਅਤੇ ਭੁਗਤਾਨ ਐਂਟਰੀਆਂ ਦਾ ਇਕੱਠਾ ਵੇਰਵਾ
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-300 font-mono">
                Total Transactions: {accountSummary.transactions.length}
              </div>
            </div>

            {accountSummary.transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                ਇਸ ਕਿਸਾਨ ਲਈ ਅਜੇ ਕੋਈ ਲੈਣ-ਦੇਣ ਦਰਜ ਨਹੀਂ ਹੋਇਆ।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">ਮਿਤੀ (Date)</th>
                      <th className="p-3">ਲੈਣ-ਦੇਣ ਦੀ ਕਿਸਮ (Type)</th>
                      <th className="p-3">ਏਜੰਸੀ / ਰੈਫਰੈਂਸ (Agency / Ref)</th>
                      <th className="p-3">ਬੋਰੇ (Bags)</th>
                      <th className="p-3">ਵਜ਼ਨ (Weight)</th>
                      <th className="p-3">ਰੇਟ (Rate)</th>
                      <th className="p-3 text-right">ਕੁੱਲ ਰਕਮ (Amount)</th>
                      <th className="p-3 text-center">ਸਥਿਤੀ (Status)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accountSummary.transactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-900">{tx.date}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'MANDI_ARRIVAL'
                                ? 'bg-indigo-100 text-indigo-800'
                                : tx.type === 'DAILY_PURCHASE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'BOLI'
                                ? 'bg-amber-100 text-amber-800'
                                : tx.type === 'ADVANCE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {tx.typeLabelPa} ({tx.typeLabelEn})
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800">
                          {tx.agency !== '—' && <span>{tx.agency} </span>}
                          {tx.reference && <span className="font-mono text-slate-500">[{tx.reference}]</span>}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{tx.bags ? `${tx.bags} Bags` : '—'}</td>
                        <td className="p-3 text-slate-700">
                          {tx.qul !== undefined ? `${tx.qul} Qul ${tx.kg} Kg` : '—'}
                        </td>
                        <td className="p-3 text-slate-600">{tx.rate ? `₹${tx.rate}/Q` : '—'}</td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {tx.totalAmount ? formatCurrencyINR(tx.totalAmount) : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {tx.status || 'COMPLETED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODALS: PROFILE VIEW, EDIT, ADVANCE RECORDING, & PAYMENT */}
      {/* ============================================================== */}
      {currentFarmer && (
        <>
          <FarmerProfileViewModal
            farmer={currentFarmer}
            isOpen={isViewProfileOpen}
            onClose={() => setIsViewProfileOpen(false)}
            onEdit={() => {
              setIsViewProfileOpen(false);
              setIsEditModalOpen(true);
            }}
          />

          <FarmerEditModal
            farmer={currentFarmer}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSaved={() => {
              setIsEditModalOpen(false);
            }}
          />
        </>
      )}

      {/* ADVANCE MODAL WITH REAL-TIME 30-DAY CONVENTION INTEREST CALCULATOR */}
      {isAdvanceModalOpen && currentFarmer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingAdvance ? 'ਪੇਸ਼ਗੀ ਸੋਧੋ (Edit Advance)' : 'ਨਵੀਂ ਪੇਸ਼ਗੀ ਦਰਜ ਕਰੋ (Record Advance)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ਕਿਸਾਨ: {currentFarmer.farmerNamePa} ({currentFarmer.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਸ਼ੁਰੂਆਤੀ ਮਿਤੀ (Start Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={advanceForm.date || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਅੰਤਿਮ / ਵਿਆਜ ਤੱਕ ਮਿਤੀ (End Date / Till Date) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={advanceForm.interestTillDate || ''}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, interestTillDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      placeholder="DD/MM/YYYY"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAdvanceForm({
                          ...advanceForm,
                          interestTillDate: new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        })
                      }
                      className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors"
                      title="Set to today's date"
                    >
                      ਅੱਜ (Today)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਮੂਲ ਰਕਮ (Principal Amount ₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={advanceForm.amount || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="e.g. 50000"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਮਾਸਿਕ ਵਿਆਜ ਦਰ (% Rate / Month) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={advanceForm.monthlyInterestRate || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, monthlyInterestRate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="e.g. 2.0"
                  />
                  <span className="text-[10px] text-slate-500">ਮੰਡੀ ਦਰ: 2% ਪ੍ਰਤੀ ਮਹੀਨਾ (ਸਟੈਂਡਰਡ)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isEn ? 'Payment Mode' : 'ਅਦਾਇਗੀ ਦਾ ਢੰਗ (Mode)'}
                  </label>
                  <SearchableSelect
                    id="advance-payment-mode"
                    value={advanceForm.paymentMode || 'CASH'}
                    onChange={(val) => setAdvanceForm({ ...advanceForm, paymentMode: val as any })}
                    options={advancePaymentModeOptions}
                    placeholder={isEn ? "Select mode..." : "ਢੰਗ ਚੁਣੋ..."}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isEn ? 'Ref / Cheque #' : 'ਟ੍ਰਾਂਜੈਕਸ਼ਨ / ਚੈੱਕ ਨੰਬਰ (Ref / Cheque #)'}
                  </label>
                  <input
                    type="text"
                    value={advanceForm.referenceNumber || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="Optional reference"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ਟਿੱਪਣੀ (Remarks / Notes)</label>
                <input
                  type="text"
                  value={advanceForm.remarks || ''}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. ਫਸਲ ਦੀ ਬਿਜਾਈ ਲਈ ਪੇਸ਼ਗੀ"
                />
              </div>

              {/* Real-time Calculation Preview Box */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-1.5">
                <div className="font-bold text-amber-950 text-xs flex items-center justify-between">
                  <span>30 ਦਿਨ ਮਹੀਨਾ ਕਨਵੈਨਸ਼ਨ ਅਨੁਸਾਰ ਲਾਈਵ ਵਿਆਜ ਗਣਨਾ:</span>
                  <span className="text-[11px] text-amber-800 font-mono">
                    {previewCalculation.months} ਮਹੀਨੇ + {previewCalculation.days} ਦਿਨ ({previewCalculation.totalDays} ਦਿਨ)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 bg-white rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500">ਮੂਲ ਰਕਮ</div>
                    <div className="font-bold text-slate-900 text-xs">
                      {formatCurrencyINR(parseFloat(advanceForm.amount) || 0)}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-amber-200">
                    <div className="text-[10px] text-amber-800 font-semibold">ਜੁੜਿਆ ਵਿਆਜ</div>
                    <div className="font-bold text-amber-700 text-xs">
                      {formatCurrencyINR(previewCalculation.interest)}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-amber-200">
                    <div className="text-[10px] text-rose-800 font-semibold">ਕੁੱਲ ਦੇਣਯੋਗ</div>
                    <div className="font-black text-rose-950 text-xs">
                      {formatCurrencyINR(previewCalculation.totalPayable)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold shadow-sm"
                >
                  {editingAdvance ? 'ਅਪਡੇਟ ਕਰੋ (Update Advance)' : 'ਪੇਸ਼ਗੀ ਸੇਵ ਕਰੋ (Save Advance)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {isPaymentModalOpen && currentFarmer && accountSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  ਨਵਾਂ ਭੁਗਤਾਨ ਦਰਜ ਕਰੋ / Record Payment
                </h3>
                <p className="text-xs text-slate-500">
                  ਕਿਸਾਨ: {currentFarmer.farmerNamePa} ({currentFarmer.id})
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <span className="text-amber-800 font-semibold">ਅੰਤਿਮ ਬਕਾਇਆ (Final Settlement):</span>
                <span className="font-black text-amber-950 text-sm">
                  {formatCurrencyINR(accountSummary.finalNetSettlementBalance)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ਭੁਗਤਾਨ ਮਿਤੀ (Date) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={paymentForm.date || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="DD/MM/YYYY"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ਅਦਾਇਗੀ ਰਕਮ (Amount in ₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g. 50000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {isEn ? 'Payment Mode' : 'ਅਦਾਇਗੀ ਦਾ ਢੰਗ (Mode)'}
                  </label>
                  <SearchableSelect
                    id="settlement-payment-mode"
                    value={paymentForm.paymentMode || 'BANK_TRANSFER'}
                    onChange={(val) => setPaymentForm({ ...paymentForm, paymentMode: val as any })}
                    options={paymentModeOptions}
                    placeholder={isEn ? "Select mode..." : "ਢੰਗ ਚੁਣੋ..."}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ਖਰੀਦ ਏਜੰਸੀ (Agency)</label>
                  <input
                    type="text"
                    value={paymentForm.agency || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, agency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Markfed"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ਟ੍ਰਾਂਜੈਕਸ਼ਨ / ਰੈਫਰੈਂਸ ਨੰਬਰ (Ref / UTR No.)</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g. UTR123456789"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ਟਿੱਪਣੀ (Remarks / Notes)</label>
                <input
                  type="text"
                  value={paymentForm.remarks || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Optional remarks"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-sm"
                >
                  ਭੁਗਤਾਨ ਸੇਵ ਕਰੋ (Save Payment)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Individual Advance Calculation Modal */}
      {viewingAdvance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    ਪੇਸ਼ਗੀ ਅਤੇ ਸੁਤੰਤਰ ਵਿਆਜ ਵੇਰਵਾ / Advance Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ਆਈ.ਡੀ: {viewingAdvance.id} • {viewingAdvance.paymentMode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingAdvance(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              {/* Key Values Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold">ਮੂਲ ਰਕਮ (Principal Amount)</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatCurrencyINR(viewingAdvance.principal ?? viewingAdvance.amount)}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-amber-800 font-semibold">ਮਾਸਿਕ ਵਿਆਜ ਦਰ (Interest Rate)</div>
                  <div className="text-lg font-black text-amber-900 mt-0.5">
                    {viewingAdvance.monthlyInterestRate ?? 2.0}% / Month
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold">ਸ਼ੁਰੂਆਤੀ ਮਿਤੀ (Start Date)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {viewingAdvance.startDate || viewingAdvance.date}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-semibold">ਅੰਤਿਮ ਮਿਤੀ (End Date / Till)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {viewingAdvance.endDate || viewingAdvance.interestTillDate || '—'}
                  </div>
                </div>
              </div>

              {/* Exact Duration Breakdown */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 mb-1">
                  ਸਮਾਂ ਮਿਆਦ (Duration Breakdown - 30-Day Month Convention):
                </div>
                <div className="flex items-center justify-between text-slate-700 font-mono">
                  <span>ਕੁੱਲ ਦਿਨ (Exact Days): <strong>{viewingAdvance.totalDays || 0} ਦਿਨ</strong></span>
                  <span>ਮਹੀਨੇ + ਦਿਨ: <strong>{viewingAdvance.monthsElapsed || 0} ਮਹੀਨੇ + {viewingAdvance.daysElapsed || 0} ਦਿਨ</strong></span>
                </div>
              </div>

              {/* Calculation Formula */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-1 text-slate-700">
                <div className="font-bold text-amber-950">ਗਣਨਾ ਫਾਰਮੂਲਾ (How Interest Was Calculated):</div>
                <div className="text-[11px] font-mono bg-white p-2 rounded-lg border border-amber-200">
                  ਮਾਸਿਕ ਵਿਆਜ = {formatCurrencyINR(viewingAdvance.principal ?? viewingAdvance.amount)} × {(viewingAdvance.monthlyInterestRate ?? 2.0)}% = {formatCurrencyINR(((viewingAdvance.principal ?? viewingAdvance.amount) * (viewingAdvance.monthlyInterestRate ?? 2.0)) / 100)} / ਮਹੀਨਾ<br />
                  ਰੋਜ਼ਾਨਾ ਵਿਆਜ = ਮਾਸਿਕ ਵਿਆਜ ÷ 30 ਦਿਨ = {formatCurrencyINR((((viewingAdvance.principal ?? viewingAdvance.amount) * (viewingAdvance.monthlyInterestRate ?? 2.0)) / 100) / 30)} / ਦਿਨ<br />
                  ਜੁੜਿਆ ਵਿਆਜ = ({viewingAdvance.monthsElapsed || 0} ਮਹੀਨੇ × ਮਾਸਿਕ) + ({viewingAdvance.daysElapsed || 0} ਦਿਨ × ਰੋਜ਼ਾਨਾ) = <strong className="text-amber-800">{formatCurrencyINR(viewingAdvance.interestAmount || 0)}</strong>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 bg-amber-100/60 rounded-xl border border-amber-300">
                  <div className="text-amber-900 font-bold">ਜੁੜਿਆ ਵਿਆਜ (Interest Amount)</div>
                  <div className="text-lg font-black text-amber-900 mt-0.5">
                    {formatCurrencyINR(viewingAdvance.interestAmount || 0)}
                  </div>
                </div>
                <div className="p-3 bg-rose-100/60 rounded-xl border border-rose-300">
                  <div className="text-rose-900 font-bold">ਕੁੱਲ ਦੇਣਯੋਗ (Principal + Interest)</div>
                  <div className="text-lg font-black text-rose-950 mt-0.5">
                    {formatCurrencyINR(viewingAdvance.totalPayableWithInterest || ((viewingAdvance.principal ?? viewingAdvance.amount) + (viewingAdvance.interestAmount || 0)))}
                  </div>
                </div>
              </div>

              {viewingAdvance.remarks && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                  <strong>ਟਿੱਪਣੀ (Remarks):</strong> {viewingAdvance.remarks}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const adv = viewingAdvance;
                  setViewingAdvance(null);
                  handleOpenEditAdvance(adv);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-sm transition-all"
              >
                ਸੋਧੋ (Edit Advance)
              </button>
              <button
                type="button"
                onClick={() => setViewingAdvance(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all"
              >
                ਬੰਦ ਕਰੋ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
