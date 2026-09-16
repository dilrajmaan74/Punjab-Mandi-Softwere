import React, { useState, useEffect, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { Farmer, FarmerAccountSummary, FarmerAdvanceRecord } from '../../types/mandi';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  User,
  Printer,
  FileDown,
  Edit,
  Trash2,
  PackageCheck,
  ShoppingCart,
  Scale,
  Calendar,
  IndianRupee,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Clock,
  Layers,
  Calculator,
  Coins,
  Users,
  Link as LinkIcon,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileText,
  ArrowRightLeft
} from 'lucide-react';
import { formatCurrencyINR, maskAadhaarNumber, calculateAdvanceInterest } from '../../utils/calculations';
import { exportFarmerAccountPDF, exportSimpleFarmerAccountPDF } from '../../utils/farmerAccountPdfExport';
import { FarmerProfileViewModal } from './FarmerProfileViewModal';
import { FarmerEditModal } from './FarmerEditModal';
import { FarmerAccountStatementA4 } from './FarmerAccountStatementA4';
import {
  savePaymentTransfer,
  saveSameFarmerAdjustment,
  saveBagTransfer
} from '../../utils/farmerAdjustmentsStorage';

export const FarmerAccount: React.FC = () => {
  const {
    farmers,
    selectedFarmerForAccount,
    setSelectedFarmerForAccount,
    setSelectedFarmerForBags,
    setActiveReceipt,
    setActiveBagsEntryToEdit,
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

  // UI Modals & Display State
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [showPdfOptionsModal, setShowPdfOptionsModal] = useState(false);
  const [showAdditionalRecords, setShowAdditionalRecords] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<FarmerAdvanceRecord | null>(null);
  const [viewingAdvance, setViewingAdvance] = useState<FarmerAdvanceRecord | null>(null);
  const [showMaskedAadhaar, setShowMaskedAadhaar] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState<'statement' | 'records'>('statement');

  // Print view mode ('simple' or 'full')
  const [printMode, setPrintMode] = useState<'simple' | 'full'>('simple');

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

  // Adjustments & Bag Transfer Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentTab, setAdjustmentTab] = useState<'payment_transfer' | 'same_adjustment' | 'bag_transfer'>('payment_transfer');
  const [adjustmentRefreshKey, setAdjustmentRefreshKey] = useState(0);

  // Form: Payment Transfer (A)
  const [paymentTransferForm, setPaymentTransferForm] = useState({
    toFarmerId: '',
    amount: '',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    reason: ''
  });

  // Form: Same Farmer Adjustment (B)
  const [sameAdjustmentForm, setSameAdjustmentForm] = useState({
    type: 'ADVANCE_TO_PURCHASE' as 'ADVANCE_TO_PURCHASE' | 'PURCHASE_TO_ADVANCE' | 'LABOUR_ADJUSTMENT' | 'OTHER',
    amount: '',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    reason: ''
  });

  // Form: Bag Transfer
  const [bagTransferForm, setBagTransferForm] = useState({
    toFarmerId: '',
    bags: '',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    reason: ''
  });

  // Fetch current farmer and complete account
  const currentFarmer = farmers.find((f) => f.id === selectedFarmerId);
  const accountSummary: FarmerAccountSummary | null = selectedFarmerId
    ? getCompleteFarmerAccount(selectedFarmerId)
    : null;

  // Search dropdown options
  const farmerSelectOptions: SearchableSelectOption[] = useMemo(() => {
    return farmers.map((f) => ({
      value: f.id,
      label: `${f.farmerNamePa} (${f.farmerName})`,
      subLabel: `A/C: ${f.id} | ਪਿੰਡ (Village): ${f.villagePa || f.village} | ਪਿਤਾ: ${f.fatherName || '-'}`,
      badge: f.linkedMainFarmerId ? 'ਲਿੰਕ (Linked)' : f.id,
      badgeColor: f.linkedMainFarmerId ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
      keywords: [f.farmerName, f.farmerNamePa, f.village, f.villagePa, f.id, f.mobile || '', f.aadhaar || '']
    }));
  }, [farmers]);

  const paymentModeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer (ਬੈਂਕ)' },
    { value: 'RTGS', label: 'RTGS' },
    { value: 'NEFT', label: 'NEFT' },
    { value: 'CHEQUE', label: 'Cheque (ਚੈੱਕ)' },
    { value: 'CASH', label: 'Cash (ਨਕਦ)' }
  ], []);

  // --------------------------------------------------------------------------
  // CALCULATIONS FOR 7 KEY METRICS (Identical formula & parameters)
  // --------------------------------------------------------------------------
  const bagRate = 925; // 1 Bag = 37.5 Kg @ ₹2,461/Qtl = ₹922.88 -> standard rounded ₹925
  const totalBagsBrought = accountSummary ? accountSummary.mandiArrivalBags : 0;
  const ownPurchaseBags = accountSummary ? accountSummary.directPurchasedBags : 0;
  const linkedPurchaseBags = accountSummary ? accountSummary.linkedPurchasedBags : 0;
  const totalPurchaseBags = ownPurchaseBags + linkedPurchaseBags;
  const balanceBeforeLabour = totalBagsBrought - totalPurchaseBags;

  const labourExpense = accountSummary
    ? (accountSummary.totalLabourDeductions > 0
        ? accountSummary.totalLabourDeductions
        : totalBagsBrought * (settings.defaultPakkiLabourRate ?? 7))
    : 0;

  const labourBags = labourExpense > 0 ? Math.ceil(labourExpense / bagRate) : 0;
  const finalBalanceBags = balanceBeforeLabour - labourBags;

  // Total amount for own purchases
  const totalOwnPurchaseAmount = accountSummary
    ? accountSummary.purchaseRecords.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
    : 0;

  // Total amount for linked purchases
  const totalLinkedPurchaseAmount = accountSummary
    ? accountSummary.linkedPurchasesList.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
    : 0;

  // Copy Farmer ID
  const handleCopyFarmerId = () => {
    if (!currentFarmer) return;
    navigator.clipboard.writeText(currentFarmer.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // --------------------------------------------------------------------------
  // PRINT HANDLERS
  // --------------------------------------------------------------------------
  const handleTriggerPrint = (mode: 'simple' | 'full') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // PDF Export Handlers
  const handleExportPDF = async (type: 'simple' | 'full') => {
    if (!accountSummary) return;
    try {
      setIsExportingPDF(true);
      setShowPdfOptionsModal(false);
      if (type === 'simple') {
        await exportSimpleFarmerAccountPDF(accountSummary, settings, {
          labourExpense,
          ratePerBag: bagRate,
          labourBagsAdjustment: labourBags,
          finalBalanceBags
        });
        notifySaveSuccess({
          titleEn: 'Simple PDF Exported',
          titlePa: 'ਸਧਾਰਨ ਖਾਤਾ PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ',
          messageEn: `Simple summary PDF for ${accountSummary.farmer.farmerName} generated.`,
          messagePa: `ਕਿਸਾਨ ${accountSummary.farmer.farmerNamePa} ਦਾ ਸਧਾਰਨ PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ ਹੈ।`
        });
      } else {
        await exportFarmerAccountPDF(accountSummary, settings, {
          labourExpense,
          ratePerBag: bagRate,
          labourBagsAdjustment: labourBags,
          finalBalanceBags
        });
        notifySaveSuccess({
          titleEn: 'Full Details PDF Exported',
          titlePa: 'ਪੂਰੀ ਜਾਣਕਾਰੀ PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ',
          messageEn: `Full account PDF for ${accountSummary.farmer.farmerName} generated.`,
          messagePa: `ਕਿਸਾਨ ${accountSummary.farmer.farmerNamePa} ਦਾ ਪੂਰੀ ਜਾਣਕਾਰੀ PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ ਹੈ।`
        });
      }
    } catch (err) {
      notifyError({
        titleEn: 'PDF Export Failed',
        titlePa: 'PDF ਡਾਊਨਲੋਡ ਅਸਫਲ',
        messageEn: 'Could not generate Farmer Account PDF.',
        messagePa: 'ਕਿਸਾਨ ਖਾਤਾ PDF ਬਣਾਉਣ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ।'
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Delete Farmer Handler
  const handleDeleteFarmer = () => {
    if (!currentFarmer || !accountSummary) return;
    const hasTransactions = accountSummary.transactions.length > 0;

    confirmDelete({
      recordNameEn: `Farmer ${currentFarmer.farmerName}`,
      recordNamePa: `ਕਿਸਾਨ ${currentFarmer.farmerNamePa}`,
      recordId: currentFarmer.id,
      itemDetails: [
        { labelEn: 'Farmer Account No.', labelPa: 'ਖਾਤਾ ਨੰਬਰ', value: currentFarmer.id },
        { labelEn: 'Village', labelPa: 'ਪਿੰਡ', value: `${currentFarmer.villagePa} (${currentFarmer.village})` },
        { labelEn: 'Total Bags Brought', labelPa: 'ਕੁੱਲ ਬੋਰੀਆਂ', value: `${accountSummary.mandiArrivalBags} Bags` },
        {
          labelEn: 'Warning',
          labelPa: 'ਚੇਤਾਵਨੀ',
          value: hasTransactions
            ? 'This farmer has existing mandi records. Deleting will remove all linked records. / ਇਸ ਕਿਸਾਨ ਦੇ ਰਿਕਾਰਡ ਮੌਜੂਦ ਹਨ।'
            : 'No transactions found. Safe to delete.'
        }
      ],
      onConfirm: () => {
        const nameEn = currentFarmer.farmerName;
        const namePa = currentFarmer.farmerNamePa;
        deleteFarmer(currentFarmer.id);
        const remaining = farmers.filter((f) => f.id !== currentFarmer.id);
        setSelectedFarmerId(remaining[0]?.id || '');
        notifyDeleteSuccess({
          titlePa: 'ਕਿਸਾਨ ਦਾ ਖਾਤਾ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
          titleEn: 'Farmer Account Deleted Successfully',
          messagePa: `ਕਿਸਾਨ ${namePa} ਦਾ ਖਾਤਾ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।`,
          messageEn: `Farmer ${nameEn} account removed.`
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
        messagePa: 'ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਪੇਸ਼ਗੀ ਰਕਮ ਦਰਜ ਕਰੋ।'
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
        messagePa: `ਕਿਸਾਨ ਲਈ ₹${amt} ਦੀ ਪੇਸ਼ਗੀ ਅਪਡੇਟ ਹੋ ਗਈ ਹੈ।`
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
        messageEn: `Advance of ₹${amt} recorded successfully.`,
        messagePa: `ਕਿਸਾਨ ਲਈ ₹${amt} ਪੇਸ਼ਗੀ ਦਰਜ ਹੋ ਗਈ ਹੈ।`
      });
    }

    setIsAdvanceModalOpen(false);
  };

  // Save Payment
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
      messageEn: `Payment of ${formatCurrencyINR(amt)} recorded.`,
      messagePa: `ਕਿਸਾਨ ਲਈ ${formatCurrencyINR(amt)} ਦਾ ਭੁਗਤਾਨ ਦਰਜ ਹੋ ਗਿਆ ਹੈ।`
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
    <>
      {/* ==================================================================== */}
      {/* SCREEN UI (Hidden when printing) */}
      {/* ==================================================================== */}
      <div className="space-y-6 print:hidden">
        {/* 1. TOP BAR: TITLE & FARMER SELECTOR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <span>Farmer Account / ਕਿਸਾਨ ਖਾਤਾ</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              ਮੰਡੀ ਆਮਦ, ਖਰੀਦ, ਲੇਬਰ ਅਤੇ ਬਾਕੀ ਬੋਰੀਆਂ ਦਾ ਸਰਲ ਹਿਸਾਬ-ਕਿਤਾਬ / Simple & Clear Farmer Bag Balance
            </p>
          </div>

          {/* Search & Select Farmer */}
          <div className="w-full md:w-96">
            <SearchableSelect
              id="farmer-account-search-select"
              value={selectedFarmerId || ''}
              onChange={(val) => {
                setSelectedFarmerId(val);
                const found = farmers.find((f) => f.id === val);
                if (found) setSelectedFarmerForAccount(found);
              }}
              options={farmerSelectOptions}
              placeholder="ਕਿਸਾਨ ਚੁਣੋ (Select Farmer)..."
              searchPlaceholder="ਨਾਮ, ਪਿੰਡ, ਖਾਤਾ ਨੰਬਰ ਲਿਖੋ..."
              emptyMessage="ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ (No farmer found)"
            />
          </div>
        </div>

        {!currentFarmer || !accountSummary ? (
          <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <User className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ / Select a Farmer</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              ਕਿਸਾਨ ਦਾ ਸਮੁੱਚਾ ਖਾਤਾ ਅਤੇ ਬੋਰੀਆਂ ਦਾ ਹਿਸਾਬ ਦੇਖਣ ਲਈ ਉੱਪਰ ਦਿੱਤੀ ਸੂਚੀ ਵਿੱਚੋਂ ਕਿਸਾਨ ਚੁਣੋ।
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ============================================================== */}
            {/* 2. FARMER PROFILE CARD (Bold, Clear, with prominent Account No.) */}
            {/* ============================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Left: Avatar & Personal Info */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {currentFarmer.photoUrl ? (
                      <img
                        src={currentFarmer.photoUrl}
                        alt={currentFarmer.farmerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-8 h-8 text-emerald-800" />
                    )}
                  </div>

                  <div className="space-y-1">
                    {/* Farmer Name */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900">
                        {currentFarmer.farmerNamePa} ({currentFarmer.farmerName})
                      </h2>
                      {/* Prominent Account Number Badge */}
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-amber-300 font-mono font-black text-xs rounded-xl shadow-xs">
                        <span>Account No / ਖਾਤਾ ਨੰਬਰ: {currentFarmer.id}</span>
                        <button
                          onClick={handleCopyFarmerId}
                          className="hover:text-white transition-colors"
                          title="Copy Account Number"
                        >
                          {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                    </div>

                    {/* Farmer Details */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 font-medium">
                      <div>
                        <span className="text-slate-400">Farmer Name / ਕਿਸਾਨ ਦਾ ਨਾਮ: </span>
                        <strong className="text-slate-800 text-sm">{currentFarmer.farmerNamePa} ({currentFarmer.farmerName})</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Father Name / ਪਿਤਾ ਦਾ ਨਾਮ: </span>
                        <strong className="text-slate-800 text-sm">{currentFarmer.fatherNamePa || currentFarmer.fatherName || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Village / ਪਿੰਡ: </span>
                        <strong className="text-slate-800 text-sm">{currentFarmer.villagePa || currentFarmer.village} ({currentFarmer.village})</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Mobile / ਮੋਬਾਈਲ: </span>
                        <strong className="text-slate-800 text-sm font-mono">{currentFarmer.mobile || '—'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Print & Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Print Button A: Simple Print */}
                  <button
                    onClick={() => handleTriggerPrint('simple')}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Print Simple Summary"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Simple Print / ਸਧਾਰਨ ਪ੍ਰਿੰਟ</span>
                  </button>

                  {/* Print Button B: Full Details Print */}
                  <button
                    onClick={() => handleTriggerPrint('full')}
                    className="px-3.5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Print Full Details Statement"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Full Details Print / ਪੂਰੀ ਜਾਣਕਾਰੀ ਪ੍ਰਿੰਟ</span>
                  </button>

                  {/* Print Button C: PDF Export */}
                  <button
                    onClick={() => setShowPdfOptionsModal(true)}
                    disabled={isExportingPDF}
                    className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    title="Export as Clean A4 PDF"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>{isExportingPDF ? 'ਬਣ ਰਿਹਾ ਹੈ...' : 'PDF Export'}</span>
                  </button>

                  {/* Adjustment & Bag Transfer Button */}
                  <button
                    onClick={() => setIsAdjustmentModalOpen(true)}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer border border-slate-300"
                    title="Record Payment Adjustment, Inter-Farmer Transfer, or Bag Transfer"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    <span>ਐਡਜਸਟਮੈਂਟ / ਟ੍ਰਾਂਸਫਰ</span>
                  </button>

                  {/* Edit Profile */}
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>ਸੋਧੋ (Edit)</span>
                  </button>

                  {/* Delete Farmer */}
                  <button
                    onClick={handleDeleteFarmer}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors"
                    title="Delete Farmer Account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Linked Farmer Banner if applicable */}
              {accountSummary.isMainFarmer && accountSummary.linkedFarmersList && accountSummary.linkedFarmersList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-amber-600 text-white font-black rounded-lg">
                      ਮੁੱਖ ਕਿਸਾਨ / Main Farmer
                    </span>
                    <span className="text-slate-700 font-medium">
                      ਇਸ ਖਾਤੇ ਨਾਲ {accountSummary.linkedFarmersList.length} ਲਿੰਕ ਕਿਸਾਨ (Linked Farmers) ਜੁੜੇ ਹੋਏ ਹਨ:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {accountSummary.linkedFarmersList.map((lf) => (
                      <button
                        key={lf.id}
                        onClick={() => {
                          setSelectedFarmerId(lf.id);
                          const f = farmers.find((farm) => farm.id === lf.id);
                          if (f) setSelectedFarmerForAccount(f);
                        }}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <LinkIcon className="w-3 h-3 text-amber-700" />
                        <span>{lf.farmerNamePa}</span>
                        <span className="text-[10px] text-amber-700 font-mono">[{lf.id}]</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {accountSummary.isLinkedFarmer && accountSummary.linkedToMainFarmer && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 bg-blue-600 text-white font-black rounded-lg">
                      ਲਿੰਕ ਕਿਸਾਨ / Linked Farmer
                    </span>
                    <span className="text-slate-700 font-medium">
                      ਇਹ ਕਿਸਾਨ ਮੁੱਖ ਕਿਸਾਨ ਨਾਲ ਲਿੰਕ ਹੈ:{' '}
                      <strong className="text-blue-900">
                        {accountSummary.linkedToMainFarmer.farmerNamePa} ({accountSummary.linkedToMainFarmer.farmerName}) [
                        {accountSummary.linkedToMainFarmer.id}]
                      </strong>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (accountSummary.linkedToMainFarmer) {
                        setSelectedFarmerId(accountSummary.linkedToMainFarmer.id);
                        const f = farmers.find((farm) => farm.id === accountSummary.linkedToMainFarmer?.id);
                        if (f) setSelectedFarmerForAccount(f);
                      }
                    }}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    ਮੁੱਖ ਕਿਸਾਨ ਖਾਤਾ ਦੇਖੋ →
                  </button>
                </div>
              )}
            </div>

            {/* 2.5 VIEW SWITCHER: EXACT REFERENCE A4 STATEMENT vs DETAILED RECORDS */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('statement')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'statement'
                      ? 'bg-[#0b2b48] text-amber-300 shadow-md ring-2 ring-amber-400/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Exact Reference A4 Statement / ਹੂ-ਬ-ਹੂ A4 ਸਟੇਟਮੈਂਟ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('records')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'records'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Detailed Data Records / ਵਿਸਥਾਰਤ ਰਿਕਾਰਡ ਤੇ ਐਂਟਰੀਆਂ</span>
                </button>
              </div>

              {activeTab === 'statement' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerPrint('full')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print A4 Statement / ਪ੍ਰਿੰਟ ਕਰੋ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPDF('full')}
                    disabled={isExportingPDF}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>{isExportingPDF ? 'ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...' : 'Download A4 PDF'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* EXACT REFERENCE A4 STATEMENT DISPLAY */}
            {activeTab === 'statement' ? (
              <div className="bg-slate-100/90 p-3 sm:p-6 rounded-3xl overflow-x-auto flex flex-col items-center border border-slate-300/80 shadow-inner">
                <div className="mb-3 text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>Exact A4 Reference Layout (Bilingual Punjabi Gurmukhi + English)</span>
                </div>
                <div className="shadow-2xl rounded-2xl overflow-hidden bg-white max-w-full">
                  <FarmerAccountStatementA4
                    key={`preview-${adjustmentRefreshKey}`}
                    id="farmer-account-reference-a4-preview"
                    account={accountSummary}
                    settings={settings}
                    printDate={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    isPrintOnly={false}
                    mode={printMode}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 3. SAB TON PEHLA: 7 KEY METRICS SUMMARY (Large, Bold, Bilingual) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-emerald-700" />
                      <span>Account Summary / ਖਾਤਾ ਸਾਰ</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      ਹਿਸਾਬ ਸਾਰ: ਬੋਰੀਆਂ ਅਤੇ ਮਜ਼ਦੂਰੀ ਖਰਚ ਅਨੁਸਾਰ
                    </span>
                  </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {/* 1. Total Bags Brought to Mandi */}
                <div className="p-4 bg-white rounded-2xl border-2 border-indigo-200 shadow-xs flex flex-col justify-between">
                  <div className="text-slate-600 font-bold text-xs leading-tight">
                    Total Bags Brought to Mandi<br />
                    <span className="text-indigo-900 font-black">ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl lg:text-3xl font-black text-indigo-950 font-mono">
                      {totalBagsBrought}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Quantity / Bags (ਮਾਤਰਾ / ਬੋਰੀਆਂ)</div>
                  </div>
                </div>

                {/* 2. Own Farmer Purchase */}
                <div className="p-4 bg-white rounded-2xl border-2 border-emerald-200 shadow-xs flex flex-col justify-between">
                  <div className="text-slate-600 font-bold text-xs leading-tight">
                    Own Farmer Purchase<br />
                    <span className="text-emerald-800 font-black">ਆਪਣੀ ਖਰੀਦ</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl lg:text-3xl font-black text-emerald-900 font-mono">
                      {ownPurchaseBags}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Quantity / Bags (ਮਾਤਰਾ / ਬੋਰੀਆਂ)</div>
                  </div>
                </div>

                {/* 3. Linked Farmers Purchase */}
                <div className="p-4 bg-white rounded-2xl border-2 border-amber-200 shadow-xs flex flex-col justify-between">
                  <div className="text-slate-600 font-bold text-xs leading-tight">
                    Linked Farmers Purchase<br />
                    <span className="text-amber-800 font-black">ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl lg:text-3xl font-black text-amber-900 font-mono">
                      {linkedPurchaseBags}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Quantity / Bags (ਮਾਤਰਾ / ਬੋਰੀਆਂ)</div>
                  </div>
                </div>

                {/* 4. Total Purchase */}
                <div className="p-4 bg-slate-900 rounded-2xl border-2 border-slate-950 shadow-xs text-white flex flex-col justify-between">
                  <div className="text-slate-300 font-bold text-xs leading-tight">
                    Total Purchase<br />
                    <span className="text-amber-300 font-black">ਕੁੱਲ ਖਰੀਦ</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl lg:text-3xl font-black text-amber-300 font-mono">
                      {totalPurchaseBags}
                    </div>
                    <div className="text-[11px] text-slate-300 font-semibold mt-0.5">Own + Linked Farmers</div>
                  </div>
                </div>

                {/* 5. Labour Expense */}
                <div className="p-4 bg-white rounded-2xl border-2 border-rose-200 shadow-xs flex flex-col justify-between">
                  <div className="text-slate-600 font-bold text-xs leading-tight">
                    Labour Expense<br />
                    <span className="text-rose-800 font-black">ਮਜ਼ਦੂਰੀ ਖਰਚ</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl lg:text-2xl font-black text-rose-900 font-mono">
                      ₹{labourExpense.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">@ ₹{bagRate}/Bag</div>
                  </div>
                </div>

                {/* 6. Labour Bags */}
                <div className="p-4 bg-white rounded-2xl border-2 border-rose-300 shadow-xs flex flex-col justify-between">
                  <div className="text-slate-600 font-bold text-xs leading-tight">
                    Labour Bags<br />
                    <span className="text-rose-800 font-black">ਮਜ਼ਦੂਰੀ ਦੀਆਂ ਬੋਰੀਆਂ</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl lg:text-3xl font-black text-rose-950 font-mono">
                      {labourBags}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-0.5">ਮਜ਼ਦੂਰੀ ਦੀਆਂ ਬੋਰੀਆਂ</div>
                  </div>
                </div>

                {/* 7. Final Balance */}
                <div className={`p-4 rounded-2xl border-2 shadow-md flex flex-col justify-between ${
                  finalBalanceBags >= 0 ? 'bg-emerald-50 border-emerald-500 text-emerald-950' : 'bg-rose-50 border-rose-500 text-rose-950'
                }`}>
                  <div className="font-bold text-xs leading-tight">
                    Final Balance<br />
                    <span className="font-black text-sm">ਆਖਰੀ ਬਕਾਇਆ</span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl lg:text-3xl font-black font-mono">
                      {finalBalanceBags}
                    </div>
                    <div className="text-[11px] font-bold mt-0.5">
                      {finalBalanceBags >= 0 ? 'ਆਖਰੀ ਬਕਾਇਆ (Remaining Bags)' : 'ਵਾਧੂ ਕਟੌਤੀ (Over Bags)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 4. PURCHASE DETAILS: 4 SIMPLE SECTIONS */}
            {/* ============================================================== */}
            <div className="space-y-6">
              {/* SECTION 1: PURCHASE DETAILS: OWN FARMER PURCHASE / ਖਰੀਦ ਵੇਰਵਾ: ਆਪਣੀ ਖਰੀਦ */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h4 className="font-black text-base text-slate-900">
                        Purchase Details: Own Farmer Purchase / ਖਰੀਦ ਵੇਰਵਾ: ਆਪਣੀ ਖਰੀਦ
                      </h4>
                      <p className="text-xs text-slate-500">
                        ਕਿਸਾਨ ਦੇ ਆਪਣੇ ਨਾਮ 'ਤੇ ਕੀਤੀ ਗਈ ਖਰੀਦ
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-black rounded-lg text-xs">
                      ਕੁੱਲ: {ownPurchaseBags} ਬੋਰੀਆਂ (Bags)
                    </span>
                  </div>
                </div>

                {accountSummary.purchaseRecords.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    ਇਸ ਕਿਸਾਨ ਦੀ ਅਜੇ ਕੋਈ ਸਿੱਧੀ ਖਰੀਦ ਦਰਜ ਨਹੀਂ ਹੋਈ / No direct purchases recorded
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3">Date / ਮਿਤੀ</th>
                          <th className="p-3">Agency / ਏਜੰਸੀ</th>
                          <th className="p-3">Voucher / ਰੈਫਰੈਂਸ</th>
                          <th className="p-3">Quantity / Bags / ਮਾਤਰਾ / ਬੋਰੀਆਂ</th>
                          <th className="p-3">Weight / ਵਜ਼ਨ</th>
                          <th className="p-3">Rate / ਰੇਟ</th>
                          <th className="p-3 text-right">Amount / ਰਕਮ</th>
                          <th className="p-3 text-center">ਕਾਰਵਾਈ (Action)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {accountSummary.purchaseRecords.map((pur) => (
                          <tr key={pur.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-semibold text-slate-900">{pur.date}</td>
                            <td className="p-3 font-bold text-emerald-800">{pur.agency}</td>
                            <td className="p-3 font-mono text-slate-600">{pur.id}</td>
                            <td className="p-3 font-bold text-slate-900">{pur.bags} Bags</td>
                            <td className="p-3 font-medium text-slate-700">
                              {pur.totalWeightDisplay || `${pur.qul} Qul ${pur.kg} Kg`}
                            </td>
                            <td className="p-3 text-slate-600 font-mono">₹{pur.rate}/Q</td>
                            <td className="p-3 text-right font-black text-slate-900 font-mono">
                              {formatCurrencyINR(pur.totalAmount)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  confirmDelete({
                                    recordNameEn: `Purchase ${pur.id}`,
                                    recordNamePa: `ਖਰੀਦ ਵਾਊਚਰ ${pur.id}`,
                                    recordId: pur.id,
                                    itemDetails: [
                                      { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ ਦਾ ਨਾਮ', value: `${pur.farmerNamePa}` },
                                      { labelEn: 'Quantity / Bags', labelPa: 'ਮਾਤਰਾ / ਬੋਰੀਆਂ', value: `${pur.bags} Bags` },
                                      { labelEn: 'Agency', labelPa: 'ਏਜੰਸੀ', value: pur.agency }
                                    ],
                                    onConfirm: () => {
                                      deleteDailyPurchase(pur.id);
                                      notifyDeleteSuccess({
                                        titlePa: 'ਖਰੀਦ ਵਾਊਚਰ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
                                        titleEn: 'Purchase Removed',
                                        messagePa: `ਖਰੀਦ ${pur.id} ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ ਅਤੇ ${pur.bags} ਬੋਰੀਆਂ ਵਾਪਸ ਬਾਕੀ ਸਟਾਕ ਵਿੱਚ ਜਮ੍ਹਾ ਹੋ ਗਈਆਂ ਹਨ।`
                                      });
                                    }
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Delete purchase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                          <td colSpan={3} className="p-3 text-right">ਕੁੱਲ ਆਪਣੀ ਖਰੀਦ ਜੋੜ (Total Own Farmer Purchase):</td>
                          <td className="p-3 text-emerald-800">{ownPurchaseBags} Bags</td>
                          <td colSpan={2} className="p-3"></td>
                          <td className="p-3 text-right font-mono text-emerald-900">
                            {formatCurrencyINR(totalOwnPurchaseAmount)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 2: PURCHASE DETAILS: LINKED FARMERS PURCHASE / ਖਰੀਦ ਵੇਰਵਾ: ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ */}
              <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm overflow-hidden">
                <div className="p-4 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-700" />
                    <div>
                      <h4 className="font-black text-base text-amber-950">
                        Purchase Details: Linked Farmers Purchase / ਖਰੀਦ ਵੇਰਵਾ: ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ
                      </h4>
                      <p className="text-xs text-amber-800">
                        ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੁਆਰਾ ਕੀਤੀ ਗਈ ਖਰੀਦ
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-amber-200 text-amber-950 font-black rounded-lg text-xs">
                      ਕੁੱਲ ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ: {linkedPurchaseBags} ਬੋਰੀਆਂ (Bags)
                    </span>
                  </div>
                </div>

                {accountSummary.linkedPurchasesList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੁਆਰਾ ਅਜੇ ਕੋਈ ਖਰੀਦ ਨਹੀਂ ਹੋਈ / No linked farmer purchases recorded
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-amber-100/60 text-amber-950 font-bold border-b border-amber-200">
                          <th className="p-3">Linked Farmer / ਲਿੰਕ ਕਿਸਾਨ</th>
                          <th className="p-3">Date / ਮਿਤੀ</th>
                          <th className="p-3">Agency / ਏਜੰਸੀ</th>
                          <th className="p-3">Quantity / Bags / ਮਾਤਰਾ / ਬੋਰੀਆਂ</th>
                          <th className="p-3">Weight / ਵਜ਼ਨ</th>
                          <th className="p-3">Rate / ਰੇਟ</th>
                          <th className="p-3 text-right">Amount / ਰਕਮ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {accountSummary.linkedPurchasesList.map((lp) => (
                          <tr key={lp.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="p-3 font-bold text-amber-950">
                              {lp.linkedFarmerNamePa || lp.linkedFarmerName}
                              <span className="font-mono text-[11px] text-amber-700 ml-1">[{lp.linkedFarmerId}]</span>
                            </td>
                            <td className="p-3 font-medium text-slate-900">{lp.date}</td>
                            <td className="p-3 font-semibold text-slate-800">{lp.agency}</td>
                            <td className="p-3 font-black text-slate-900">{lp.bags} Bags</td>
                            <td className="p-3 text-slate-700">{lp.qul} Qul {lp.kg} Kg</td>
                            <td className="p-3 text-slate-600 font-mono">₹{lp.rate}/Q</td>
                            <td className="p-3 text-right font-black text-amber-950 font-mono">
                              {formatCurrencyINR(lp.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-100/80 font-black text-amber-950 border-t border-amber-200">
                          <td colSpan={3} className="p-3 text-right">ਕੁੱਲ ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ (Total Linked Farmers Purchase):</td>
                          <td className="p-3 text-amber-950">{linkedPurchaseBags} Bags</td>
                          <td colSpan={2} className="p-3"></td>
                          <td className="p-3 text-right font-mono text-amber-950">
                            {formatCurrencyINR(totalLinkedPurchaseAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 3: LABOUR EXPENSE / ਮਜ਼ਦੂਰੀ ਖਰਚ */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-rose-700" />
                    <div>
                      <h4 className="font-black text-base text-slate-900">
                        Labour Expense / ਮਜ਼ਦੂਰੀ ਖਰਚ
                      </h4>
                      <p className="text-xs text-slate-500">
                        ਮਜ਼ਦੂਰੀ ਖਰਚ ਅਤੇ ਮਜ਼ਦੂਰੀ ਦੀਆਂ ਬੋਰੀਆਂ ਕਟੌਤੀ (Labour Expense & Labour Bags)
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-rose-100 text-rose-900 font-black rounded-lg text-xs">
                    ਮਜ਼ਦੂਰੀ ਦੀਆਂ ਬੋਰੀਆਂ: {labourBags} Bags
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Expense Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-bold uppercase">
                      Labour Expense / ਮਜ਼ਦੂਰੀ ਖਰਚ
                    </div>
                    <div className="text-2xl font-black text-rose-900 font-mono mt-1">
                      ₹{labourExpense.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      ਤੁਲਾਈ, ਭਰਾਈ ਅਤੇ ਮੰਡੀ ਮਜ਼ਦੂਰੀ ਖਰਚ
                    </div>
                  </div>

                  {/* Rate Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-500 font-bold uppercase">
                      Bag Rate / ਪ੍ਰਤੀ ਬੋਰੀ ਰੇਟ
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                      ₹{bagRate}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      1 Bag = 37.5 Kg @ ₹2,461/Qtl
                    </div>
                  </div>

                  {/* Formula / Result Box */}
                  <div className="p-4 bg-rose-50/70 rounded-xl border border-rose-200">
                    <div className="text-xs text-rose-800 font-bold uppercase">
                      Labour Bags / ਮਜ਼ਦੂਰੀ ਦੀਆਂ ਬੋਰੀਆਂ
                    </div>
                    <div className="text-2xl font-black text-rose-950 font-mono mt-1">
                      {labourBags} Bags (ਬੋਰੀਆਂ)
                    </div>
                    <div className="text-[11px] text-rose-800 font-medium mt-1">
                      ₹{labourExpense.toLocaleString('en-IN')} ÷ ₹{bagRate} = {labourBags} ਬੋਰੀਆਂ (ਅਗਲੀ ਪੂਰੀ ਬੋਰੀ 'ਤੇ ਰਾਊਂਡ)
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: CALCULATION SUMMARY / ਹਿਸਾਬ ਸਾਰ */}
              <div className="bg-white rounded-2xl border-2 border-emerald-600 shadow-md overflow-hidden">
                <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-amber-300" />
                    <div>
                      <h4 className="font-black text-base">
                        Calculation Summary / ਹਿਸਾਬ ਸਾਰ
                      </h4>
                      <p className="text-xs text-emerald-200">
                        ਕਦਮ-ਦਰ-ਕਦਮ ਹਿਸਾਬ ਅਤੇ ਆਖਰੀ ਬਕਾਇਆ ਬੋਰੀਆਂ (Step-by-Step Calculation)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-emerald-200">Final Balance / ਆਖਰੀ ਬਕਾਇਆ</div>
                    <div className="text-xl font-black text-amber-300 font-mono">
                      {finalBalanceBags} Bags
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3 bg-slate-50/50">
                  {/* Step 1 */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-sm">
                    <div className="font-semibold text-slate-800">
                      1. Total Bags Brought to Mandi / ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ:
                    </div>
                    <div className="font-black text-slate-900 font-mono text-base">
                      {totalBagsBrought} Bags
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-sm">
                    <div className="font-semibold text-slate-800">
                      2. Less: Total Purchase / ਕੁੱਲ ਖਰੀਦ (ਆਪਣੀ {ownPurchaseBags} + ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ {linkedPurchaseBags}):
                    </div>
                    <div className="font-black text-rose-700 font-mono text-base">
                      - {totalPurchaseBags} Bags
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm">
                    <div className="font-bold text-amber-950">
                      3. Balance Before Labour / ਮਜ਼ਦੂਰੀ ਤੋਂ ਪਹਿਲਾਂ ਬਕਾਇਆ:
                    </div>
                    <div className="font-black text-amber-950 font-mono text-base">
                      {balanceBeforeLabour} Bags
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-sm">
                    <div className="font-semibold text-slate-800">
                      4. Less: Labour Bags / ਮਜ਼ਦੂਰੀ ਦੀਆਂ ਬੋਰੀਆਂ (₹{labourExpense} ÷ ₹{bagRate}):
                    </div>
                    <div className="font-black text-rose-700 font-mono text-base">
                      - {labourBags} Bags
                    </div>
                  </div>

                  {/* Step 5: Final Balance Highlight */}
                  <div className="p-4 bg-emerald-100/70 border-2 border-emerald-500 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-base font-black text-emerald-950">
                        Final Balance / ਆਖਰੀ ਬਕਾਇਆ
                      </div>
                      <div className="text-xs text-emerald-800 font-medium">
                        ਕਿਸਾਨ ਦੀਆਂ ਮੰਡੀ ਵਿੱਚ ਬਾਕੀ ਬਚੀਆਂ ਬੋਰੀਆਂ
                      </div>
                    </div>
                    <div className="text-3xl font-black text-emerald-950 font-mono">
                      {finalBalanceBags} Bags (ਬੋਰੀਆਂ)
                    </div>
                  </div>

                  {/* Rupee Balance Settlement Info */}
                  <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-600">
                    <div>
                      Net Amount / ਕੁੱਲ ਬਕਾਇਆ ਰਕਮ: <strong className="text-slate-900">{formatCurrencyINR(accountSummary.netPayableAmount)}</strong>
                    </div>
                    <div>
                      Final Settlement / ਆਖਰੀ ਨਿਪਟਾਰਾ:{' '}
                      <strong className={accountSummary.finalNetSettlementBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                        {formatCurrencyINR(accountSummary.finalNetSettlementBalance)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* 5. ADDITIONAL RECORDS TOGGLE (Advances, Payments & Ledger) */}
            {/* Keeps all existing features intact without cluttering simple view */}
            {/* ============================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowAdditionalRecords(!showAdditionalRecords)}
                className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-700" />
                  <div>
                    <div className="font-black text-sm text-slate-900">
                      Additional Records: Advances & Payments / ਵਾਧੂ ਰਿਕਾਰਡ: ਪੇਸ਼ਗੀ ਅਤੇ ਭੁਗਤਾਨ
                    </div>
                    <div className="text-xs text-slate-500">
                      ਪੇਸ਼ਗੀ ਮੂਲ, ਵਿਆਜ ਗਣਨਾ, ਅਦਾਇਗੀਆਂ ਅਤੇ ਸਮੁੱਚਾ ਲੈਣ-ਦੇਣ ਖਾਤਾ
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <span>{showAdditionalRecords ? 'ਵੇਰਵਾ ਲੁਕਾਓ (Hide)' : 'ਵੇਰਵਾ ਦੇਖੋ (Show)'}</span>
                  {showAdditionalRecords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdditionalRecords && (
                <div className="p-5 space-y-6 border-t border-slate-200">
                  {/* ADVANCES SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-900 uppercase">
                        Advances & Interest / ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ
                      </h5>
                      <button
                        onClick={handleOpenAddAdvance}
                        className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ ਨਵੀਂ ਪੇਸ਼ਗੀ (Add Advance)</span>
                      </button>
                    </div>

                    {accountSummary.advances.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                        ਕੋਈ ਪੇਸ਼ਗੀ ਦਰਜ ਨਹੀਂ ਹੈ (No advances recorded)
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                          <thead className="bg-amber-50 text-amber-950 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Date / ਮਿਤੀ</th>
                              <th className="p-2.5">Principal / ਮੂਲ</th>
                              <th className="p-2.5">Rate / ਦਰ</th>
                              <th className="p-2.5">Duration / ਦਿਨ</th>
                              <th className="p-2.5">Interest / ਵਿਆਜ</th>
                              <th className="p-2.5 text-right">Total / ਕੁੱਲ ਦੇਣਯੋਗ</th>
                              <th className="p-2.5 text-center">ਕਾਰਵਾਈ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {accountSummary.advances.map((adv) => (
                              <tr key={adv.id} className="hover:bg-amber-50/30">
                                <td className="p-2.5 font-sans font-medium text-slate-900">{adv.startDate || adv.date}</td>
                                <td className="p-2.5 font-bold text-slate-900">{formatCurrencyINR(adv.principal ?? adv.amount)}</td>
                                <td className="p-2.5 text-amber-800">{adv.monthlyInterestRate ?? 2.0}%/ਮਹੀਨਾ</td>
                                <td className="p-2.5 font-sans text-slate-600">{adv.totalDays || 0} ਦਿਨ</td>
                                <td className="p-2.5 font-bold text-amber-700">{formatCurrencyINR(adv.interestAmount || 0)}</td>
                                <td className="p-2.5 font-black text-rose-950 text-right">
                                  {formatCurrencyINR(adv.totalPayableWithInterest || ((adv.principal ?? adv.amount) + (adv.interestAmount || 0)))}
                                </td>
                                <td className="p-2.5 text-center font-sans">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setViewingAdvance(adv)}
                                      className="p-1 text-slate-400 hover:text-amber-700 rounded"
                                      title="View Interest Breakdown"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditAdvance(adv)}
                                      className="p-1 text-slate-400 hover:text-indigo-700 rounded"
                                      title="Edit Advance"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => deleteFarmerAdvance(adv.id)}
                                      className="p-1 text-slate-400 hover:text-rose-700 rounded"
                                      title="Delete Advance"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
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

                  {/* PAYMENTS SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-900 uppercase">
                        Payments to Farmer / ਕਿਸਾਨ ਨੂੰ ਭੁਗਤਾਨ
                      </h5>
                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ ਨਵਾਂ ਭੁਗਤਾਨ (Record Payment)</span>
                      </button>
                    </div>

                    {accountSummary.paymentRecords.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                        ਕੋਈ ਸਿੱਧਾ ਭੁਗਤਾਨ ਦਰਜ ਨਹੀਂ ਹੈ (No direct payments recorded)
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Date / ਮਿਤੀ</th>
                              <th className="p-2.5">Mode / ਢੰਗ</th>
                              <th className="p-2.5">Ref / UTR</th>
                              <th className="p-2.5">Agency / ਏਜੰਸੀ</th>
                              <th className="p-2.5 text-right">Amount / ਰਕਮ</th>
                              <th className="p-2.5 text-center">ਕਾਰਵਾਈ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {accountSummary.paymentRecords.map((pay) => (
                              <tr key={pay.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-sans font-medium text-slate-900">{pay.date}</td>
                                <td className="p-2.5 font-sans font-bold text-slate-800">{pay.paymentMode}</td>
                                <td className="p-2.5 text-slate-600">{pay.referenceNumber || '—'}</td>
                                <td className="p-2.5 font-sans text-slate-700">{pay.agency || '—'}</td>
                                <td className="p-2.5 text-right font-black text-emerald-900">{formatCurrencyINR(pay.amount)}</td>
                                <td className="p-2.5 text-center font-sans">
                                  <button
                                    onClick={() => deleteFarmerPayment(pay.id)}
                                    className="p-1 text-slate-400 hover:text-rose-700 rounded"
                                    title="Delete Payment"
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )}
  </div>

      {/* ==================================================================== */}
      {/* PDF EXPORT SELECTION MODAL */}
      {/* ==================================================================== */}
      {showPdfOptionsModal && currentFarmer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-black text-slate-900">
                  Export PDF / ਕਿਸਾਨ ਖਾਤਾ PDF
                </h3>
              </div>
              <button
                onClick={() => setShowPdfOptionsModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              ਕਿਰਪਾ ਕਰਕੇ PDF ਦੀ ਕਿਸਮ ਚੁਣੋ ਜੋ ਤੁਸੀਂ ਡਾਊਨਲੋਡ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ:
            </p>

            <div className="space-y-3">
              {/* Option 1: Exact Reference A4 Statement PDF */}
              <button
                onClick={() => handleExportPDF('full')}
                className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 text-left rounded-xl border-2 border-emerald-500 shadow-xs transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Exact Reference A4 PDF / ਹੂ-ਬ-ਹੂ A4 ਸਟੇਟਮੈਂਟ</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    100% ਰੈਫਰੈਂਸ ਫਾਰਮੈਟ ਅਨੁਸਾਰ: ਸਾਰੀਆਂ ਖਰੀਦਾਂ, ਲੇਬਰ, ਪੇਸ਼ਗੀ, ਸਮਾਯੋਜਨ ਤੇ ਖਾਤਾ ਸਾਰ (Single Page A4)
                  </div>
                </div>
                <FileDown className="w-5 h-5 text-emerald-700 shrink-0" />
              </button>

              {/* Option 2: Simple Print PDF */}
              <button
                onClick={() => handleExportPDF('simple')}
                className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 text-left rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    Simple Summary PDF / ਸਧਾਰਨ PDF
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ਸਿਰਫ਼ ਮੁੱਖ 7 ਸੰਖੇਪ ਰਿਕਾਰਡ, ਲੇਬਰ ਕਟੌਤੀ ਅਤੇ ਬਕਾਇਆ
                  </div>
                </div>
                <FileDown className="w-5 h-5 text-slate-600 shrink-0" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPdfOptionsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ਰੱਦ ਕਰੋ (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* EXACT REFERENCE A4 PRINT & OFFSCREEN EXPORT VIEW                    */}
      {/* ==================================================================== */}
      {currentFarmer && accountSummary && (
        <>
          {/* Print container for window.print() */}
          <div id="farmer-account-print-container" className="hidden print:block font-sans bg-white p-0 m-0">
            <FarmerAccountStatementA4
              key={`print-${adjustmentRefreshKey}-${printMode}`}
              id="farmer-account-reference-a4-print"
              account={accountSummary}
              settings={settings}
              printDate={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              isPrintOnly={true}
              mode={printMode}
            />
          </div>

          {/* Off-screen fixed element ensures canvas / html-to-image can always capture the exact reference layout */}
          <div
            id="farmer-account-offscreen-wrapper"
            style={{
              position: 'fixed',
              left: '-9999px',
              top: '0',
              width: '210mm',
              zIndex: -100,
              pointerEvents: 'none',
              opacity: 1
            }}
            aria-hidden="true"
          >
            <FarmerAccountStatementA4
              key={`offscreen-${adjustmentRefreshKey}-${printMode}`}
              id="farmer-account-reference-a4-offscreen"
              account={accountSummary}
              settings={settings}
              printDate={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              isPrintOnly={false}
              mode={printMode}
            />
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* MODALS: PROFILE, EDIT, ADVANCE, PAYMENT, & DETAILS */}
      {/* ==================================================================== */}
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

      {/* ADVANCE MODAL */}
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
                    ਅੰਤਿਮ ਮਿਤੀ (Till Date) <span className="text-rose-500">*</span>
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
                    >
                      ਅੱਜ
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="2.0"
                  />
                </div>
              </div>

              {/* Live Interest Preview */}
              {parseFloat(advanceForm.amount) > 0 && (
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>ਵਿਆਜ ਗਣਨਾ (Preview):</span>
                    <span className="font-mono text-amber-900">
                      {previewCalculation.months} ਮਹੀਨੇ + {previewCalculation.days} ਦਿਨ ({previewCalculation.totalDays} ਦਿਨ)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-700 pt-1 border-t border-amber-200">
                    <span>ਜੁੜਿਆ ਵਿਆਜ: <strong>{formatCurrencyINR(previewCalculation.interest)}</strong></span>
                    <span className="font-bold text-rose-900">
                      ਕੁੱਲ ਦੇਣਯੋਗ: {formatCurrencyINR(previewCalculation.totalPayable)}
                    </span>
                  </div>
                </div>
              )}

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
                  {editingAdvance ? 'ਅਪਡੇਟ ਕਰੋ (Update)' : 'ਦਰਜ ਕਰੋ (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && currentFarmer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ਨਵਾਂ ਭੁਗਤਾਨ ਦਰਜ ਕਰੋ (Record Payment)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ਕਿਸਾਨ: {currentFarmer.farmerNamePa} ({currentFarmer.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਮਿਤੀ (Date) <span className="text-rose-500">*</span>
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
                    ਭੁਗਤਾਨ ਰਕਮ (Amount ₹) <span className="text-rose-500">*</span>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਢੰਗ (Payment Mode)
                  </label>
                  <SearchableSelect
                    id="farmer-payment-mode-select"
                    value={paymentForm.paymentMode || 'BANK_TRANSFER'}
                    onChange={(val) => setPaymentForm({ ...paymentForm, paymentMode: val as any })}
                    options={paymentModeOptions}
                    placeholder="ਢੰਗ ਚੁਣੋ..."
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
                <label className="block font-semibold text-slate-700 mb-1">ਰੈਫਰੈਂਸ / UTR ਨੰਬਰ</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g. UTR123456789"
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
                  ਭੁਗਤਾਨ ਸੇਵ ਕਰੋ (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ADVANCE DETAILS MODAL */}
      {viewingAdvance && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-black text-slate-900">
                  ਪੇਸ਼ਗੀ ਵਿਆਜ ਵੇਰਵਾ / Advance Details
                </h3>
              </div>
              <button
                onClick={() => setViewingAdvance(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-600">ਮੂਲ ਰਕਮ (Principal):</span>
                <strong className="font-mono text-slate-900">{formatCurrencyINR(viewingAdvance.principal ?? viewingAdvance.amount)}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-600">ਮਿਆਦ (Days):</span>
                <strong className="text-slate-900">{viewingAdvance.totalDays || 0} ਦਿਨ ({viewingAdvance.monthsElapsed || 0} ਮਹੀਨੇ + {viewingAdvance.daysElapsed || 0} ਦਿਨ)</strong>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between">
                <span className="text-amber-900 font-bold">ਜੁੜਿਆ ਵਿਆਜ (Interest):</span>
                <strong className="font-mono text-amber-900">{formatCurrencyINR(viewingAdvance.interestAmount || 0)}</strong>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex justify-between text-sm">
                <span className="text-rose-900 font-black">ਕੁੱਲ ਦੇਣਯੋਗ (Total Payable):</span>
                <strong className="font-mono text-rose-950 font-black">
                  {formatCurrencyINR(viewingAdvance.totalPayableWithInterest || ((viewingAdvance.principal ?? viewingAdvance.amount) + (viewingAdvance.interestAmount || 0)))}
                </strong>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingAdvance(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ਬੰਦ ਕਰੋ (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: PAYMENT ADJUSTMENT & BAG TRANSFER (Sections 8 & 9)           */}
      {/* ==================================================================== */}
      {currentFarmer && isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Payment Adjustment & Bag Transfer / ਐਡਜਸਟਮੈਂਟ ਤੇ ਟ੍ਰਾਂਸਫਰ
                  </h3>
                  <p className="text-xs text-slate-500">
                    ਕਿਸਾਨ: {currentFarmer.farmerNamePa} ({currentFarmer.farmerName}) [A/C: {currentFarmer.id}]
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-200 my-4">
              <button
                type="button"
                onClick={() => setAdjustmentTab('payment_transfer')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors ${
                  adjustmentTab === 'payment_transfer'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                A. ਕਿਸਾਨ ਤੋਂ ਕਿਸਾਨ ਪੇਮੈਂਟ (Payment Transfer)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentTab('same_adjustment')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors ${
                  adjustmentTab === 'same_adjustment'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                B. ਖਾਤੇ ਵਿੱਚ ਅੰਦਰੂਨੀ (Same A/C)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentTab('bag_transfer')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors ${
                  adjustmentTab === 'bag_transfer'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ (Bag Transfer)
              </button>
            </div>

            {/* TAB 1: PAYMENT TRANSFER (A) */}
            {adjustmentTab === 'payment_transfer' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!paymentTransferForm.toFarmerId || !paymentTransferForm.amount) return;
                  const target = farmers.find(f => f.id === paymentTransferForm.toFarmerId);
                  savePaymentTransfer({
                    fromFarmerId: currentFarmer.id,
                    fromFarmerName: currentFarmer.farmerName,
                    toFarmerId: paymentTransferForm.toFarmerId,
                    toFarmerName: target ? target.farmerName : paymentTransferForm.toFarmerId,
                    amount: parseFloat(paymentTransferForm.amount) || 0,
                    date: paymentTransferForm.date,
                    reason: paymentTransferForm.reason || 'Payment Transfer'
                  });
                  notifySaveSuccess({
                    titleEn: 'Payment Transfer Saved',
                    titlePa: 'ਪੇਮੈਂਟ ਟ੍ਰਾਂਸਫਰ ਦਰਜ ਹੋ ਗਈ',
                    messageEn: `Transferred ₹${paymentTransferForm.amount} to ${target?.farmerName || paymentTransferForm.toFarmerId}`,
                    messagePa: `₹${paymentTransferForm.amount} ਸਫਲਤਾਪੂਰਵਕ ਟ੍ਰਾਂਸਫਰ ਹੋ ਗਿਆ।`
                  });
                  setPaymentTransferForm({
                    toFarmerId: '',
                    amount: '',
                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    reason: ''
                  });
                  setAdjustmentRefreshKey(k => k + 1);
                  setIsAdjustmentModalOpen(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਟ੍ਰਾਂਸਫਰ ਕਿਸ ਕਿਸਾਨ ਨੂੰ ਕਰਨੀ ਹੈ? (Transfer To Farmer):
                  </label>
                  <select
                    value={paymentTransferForm.toFarmerId}
                    onChange={(e) => setPaymentTransferForm({ ...paymentTransferForm, toFarmerId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- ਕਿਸਾਨ ਚੁਣੋ (Select Farmer) --</option>
                    {farmers.filter(f => f.id !== currentFarmer.id).map(f => (
                      <option key={f.id} value={f.id}>
                        {f.farmerNamePa} ({f.farmerName}) - A/C: {f.id} ({f.village})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਰਕਮ (Amount ₹):
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 50000"
                      value={paymentTransferForm.amount}
                      onChange={(e) => setPaymentTransferForm({ ...paymentTransferForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਮਿਤੀ (Date):
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentTransferForm.date}
                      onChange={(e) => setPaymentTransferForm({ ...paymentTransferForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਕਾਰਨ / ਵੇਰਵਾ (Reason / Note):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sandeep ਨੂੰ ਰਕਮ ਟ੍ਰਾਂਸਫਰ ਕੀਤੀ ਗਈ"
                    value={paymentTransferForm.reason}
                    onChange={(e) => setPaymentTransferForm({ ...paymentTransferForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    ਰੱਦ ਕਰੋ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    ਟ੍ਰਾਂਸਫਰ ਦਰਜ ਕਰੋ (Save Transfer)
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SAME FARMER ADJUSTMENT (B) */}
            {adjustmentTab === 'same_adjustment' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!sameAdjustmentForm.amount) return;
                  const typeLabelEn =
                    sameAdjustmentForm.type === 'ADVANCE_TO_PURCHASE'
                      ? 'Advance → Purchase'
                      : sameAdjustmentForm.type === 'PURCHASE_TO_ADVANCE'
                      ? 'Purchase → Advance'
                      : sameAdjustmentForm.type === 'LABOUR_ADJUSTMENT'
                      ? 'Labour Adjustment'
                      : 'Internal Adjustment';
                  const typeLabelPa =
                    sameAdjustmentForm.type === 'ADVANCE_TO_PURCHASE'
                      ? 'ਐਡਵਾਂਸ ਤੋਂ ਖਰੀਦ'
                      : sameAdjustmentForm.type === 'PURCHASE_TO_ADVANCE'
                      ? 'ਖਰੀਦ ਤੋਂ ਐਡਵਾਂਸ'
                      : 'ਮਜ਼ਦੂਰੀ / ਖਾਤਾ ਐਡਜਸਟਮੈਂਟ';

                  saveSameFarmerAdjustment({
                    farmerId: currentFarmer.id,
                    farmerName: currentFarmer.farmerName,
                    type: sameAdjustmentForm.type,
                    typeLabelEn,
                    typeLabelPa,
                    fromAllocation: sameAdjustmentForm.type.split('_TO_')[0] || 'Internal',
                    toAllocation: sameAdjustmentForm.type.split('_TO_')[1] || 'Internal',
                    amount: parseFloat(sameAdjustmentForm.amount) || 0,
                    date: sameAdjustmentForm.date,
                    reason: sameAdjustmentForm.reason || typeLabelEn
                  });
                  notifySaveSuccess({
                    titleEn: 'Account Adjustment Saved',
                    titlePa: 'ਅੰਦਰੂਨੀ ਐਡਜਸਟਮੈਂਟ ਦਰਜ ਹੋ ਗਈ',
                    messageEn: `Adjusted ₹${sameAdjustmentForm.amount} (${typeLabelEn})`,
                    messagePa: `₹${sameAdjustmentForm.amount} ਦੀ ਐਡਜਸਟਮੈਂਟ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ।`
                  });
                  setSameAdjustmentForm({
                    type: 'ADVANCE_TO_PURCHASE',
                    amount: '',
                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    reason: ''
                  });
                  setAdjustmentRefreshKey(k => k + 1);
                  setIsAdjustmentModalOpen(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਐਡਜਸਟਮੈਂਟ ਦੀ ਕਿਸਮ (Adjustment Type):
                  </label>
                  <select
                    value={sameAdjustmentForm.type}
                    onChange={(e) => setSameAdjustmentForm({ ...sameAdjustmentForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ADVANCE_TO_PURCHASE">Advance → Purchase (ਐਡਵਾਂਸ ਤੋਂ ਖਰੀਦ ਖਾਤਾ)</option>
                    <option value="PURCHASE_TO_ADVANCE">Purchase → Advance (ਖਰੀਦ ਤੋਂ ਐਡਵਾਂਸ ਖਾਤਾ)</option>
                    <option value="LABOUR_ADJUSTMENT">Labour Adjustment (ਮਜ਼ਦੂਰੀ ਖਾਤਾ ਐਡਜਸਟਮੈਂਟ)</option>
                    <option value="OTHER">Other Adjustment (ਹੋਰ ਖਾਤਾ ਬਦਲਾਅ)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    * ਅਸਲ ਖਰੀਦ ਜਾਂ ਐਡਵਾਂਸ ਰਿਕਾਰਡ ਡਿਲੀਟ ਨਹੀਂ ਹੋਵੇਗਾ, ਸਿਰਫ਼ ਅਕਾਊਂਟਿੰਗ ਅਲਾਟਮੈਂਟ ਬਦਲੇਗੀ।
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਰਕਮ (Amount ₹):
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 70000"
                      value={sameAdjustmentForm.amount}
                      onChange={(e) => setSameAdjustmentForm({ ...sameAdjustmentForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਮਿਤੀ (Date):
                    </label>
                    <input
                      type="text"
                      required
                      value={sameAdjustmentForm.date}
                      onChange={(e) => setSameAdjustmentForm({ ...sameAdjustmentForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਕਾਰਨ / ਵੇਰਵਾ (Reason / Note):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ਫਸਲ ਖਰੀਦ ਬਦਲੇ ਐਡਵਾਂਸ ਵਿੱਚੋਂ ਕੱਟੀ ਗਈ ਰਕਮ"
                    value={sameAdjustmentForm.reason}
                    onChange={(e) => setSameAdjustmentForm({ ...sameAdjustmentForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    ਰੱਦ ਕਰੋ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    ਐਡਜਸਟਮੈਂਟ ਦਰਜ ਕਰੋ (Save Adjustment)
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: BAG TRANSFER */}
            {adjustmentTab === 'bag_transfer' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!bagTransferForm.toFarmerId || !bagTransferForm.bags) return;
                  const target = farmers.find(f => f.id === bagTransferForm.toFarmerId);
                  saveBagTransfer({
                    fromFarmerId: currentFarmer.id,
                    fromFarmerName: currentFarmer.farmerName,
                    toFarmerId: bagTransferForm.toFarmerId,
                    toFarmerName: target ? target.farmerName : bagTransferForm.toFarmerId,
                    bags: parseInt(bagTransferForm.bags, 10) || 0,
                    date: bagTransferForm.date,
                    reason: bagTransferForm.reason || 'Bag Transfer'
                  });
                  notifySaveSuccess({
                    titleEn: 'Bag Transfer Saved',
                    titlePa: 'ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ ਦਰਜ ਹੋ ਗਈ',
                    messageEn: `Transferred ${bagTransferForm.bags} bags to ${target?.farmerName || bagTransferForm.toFarmerId}`,
                    messagePa: `${bagTransferForm.bags} ਬੋਰੀਆਂ ਸਫਲਤਾਪੂਰਵਕ ਟ੍ਰਾਂਸਫਰ ਹੋ ਗਈਆਂ।`
                  });
                  setBagTransferForm({
                    toFarmerId: '',
                    bags: '',
                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    reason: ''
                  });
                  setAdjustmentRefreshKey(k => k + 1);
                  setIsAdjustmentModalOpen(false);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਬੋਰੀਆਂ ਕਿਸ ਕਿਸਾਨ ਨੂੰ ਟ੍ਰਾਂਸਫਰ ਕਰਨੀਆਂ ਹਨ? (Transfer Bags To Farmer):
                  </label>
                  <select
                    value={bagTransferForm.toFarmerId}
                    onChange={(e) => setBagTransferForm({ ...bagTransferForm, toFarmerId: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- ਕਿਸਾਨ ਚੁਣੋ (Select Farmer) --</option>
                    {farmers.filter(f => f.id !== currentFarmer.id).map(f => (
                      <option key={f.id} value={f.id}>
                        {f.farmerNamePa} ({f.farmerName}) - A/C: {f.id} ({f.village})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ (Number of Bags):
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 600"
                      value={bagTransferForm.bags}
                      onChange={(e) => setBagTransferForm({ ...bagTransferForm, bags: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ਮਿਤੀ (Date):
                    </label>
                    <input
                      type="text"
                      required
                      value={bagTransferForm.date}
                      onChange={(e) => setBagTransferForm({ ...bagTransferForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ਕਾਰਨ / ਵੇਰਵਾ (Reason / Note):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ਬਚਿਆ ਬੋਰੀ ਕੋਟਾ Sandeep ਨੂੰ ਟ੍ਰਾਂਸਫਰ ਕੀਤਾ ਗਿਆ"
                    value={bagTransferForm.reason}
                    onChange={(e) => setBagTransferForm({ ...bagTransferForm, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    ਰੱਦ ਕਰੋ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ ਸੇਵ ਕਰੋ (Save Bag Transfer)
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
