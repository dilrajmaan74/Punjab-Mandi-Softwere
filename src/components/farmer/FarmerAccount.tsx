import React, { useState, useEffect, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Farmer,
  FarmerAccountSummary,
  FarmerAdvanceRecord,
  AdvanceCategory,
  InterestCalculationMode,
  CompoundingFrequency,
  CropType
} from '../../types/mandi';
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
  ArrowRightLeft,
  Send,
  MessageSquare,
  ShieldCheck,
  Share2,
  Camera,
  Receipt,
  Percent,
  UploadCloud,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Package,
  ArrowLeftRight,
  AlertTriangle
} from 'lucide-react';
import { formatCurrencyINR, maskAadhaarNumber, calculateAdvanceInterest, formatCurrency } from '../../utils/calculations';
import { exportFarmerAccountPDF, exportSimpleFarmerAccountPDF, exportThreePageLedgerPDF } from '../../utils/farmerAccountPdfExport';
import { FarmerProfileViewModal } from './FarmerProfileViewModal';
import { FarmerEditModal } from './FarmerEditModal';
import { FarmerAccountStatementA4 } from './FarmerAccountStatementA4';
import { BulkWhatsAppModal } from './BulkWhatsAppModal';
import { AdvanceRepaymentModal } from './AdvanceRepaymentModal';
import { AdvanceVoucherModal } from './AdvanceVoucherModal';
import { FarmerSimpleSummaryCard } from './FarmerSimpleSummaryCard';
import { FarmerMiniSlipModal } from './FarmerMiniSlipModal';
import { BardanaClearanceCard } from './BardanaClearanceCard';
import { FarmerTFormatLedger } from './FarmerTFormatLedger';
import { SeasonSettlementModal } from './SeasonSettlementModal';
import { FarmerThreePageAccount } from './FarmerThreePageAccount';
import {
  savePaymentTransfer,
  saveSameFarmerAdjustment,
  saveBagTransfer
} from '../../utils/farmerAdjustmentsStorage';
import { openWhatsApp, generateAdvanceWhatsAppMessage } from '../../utils/whatsappNotification';

export interface FarmerYearlyProfitLossModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: Farmer;
  accountSummary?: FarmerAccountSummary | null;
}

export const FarmerYearlyProfitLossModal: React.FC<FarmerYearlyProfitLossModalProps> = ({
  isOpen,
  onClose,
  farmer,
  accountSummary
}) => {
  if (!isOpen || !farmer) return null;

  const totalGrossAmount = accountSummary?.totalGrossAmount ?? 0;
  const totalLabourDeductions = accountSummary?.totalLabourDeductions ?? 0;
  const netPayableAmount = accountSummary?.netPayableAmount ?? (totalGrossAmount - totalLabourDeductions);
  const paidAmount = accountSummary?.paidAmount ?? 0;
  const totalAdvanceAmount = accountSummary?.totalAdvanceAmount ?? 0;
  const finalBalance = accountSummary?.finalBalance ?? (netPayableAmount - paidAmount - totalAdvanceAmount);
  const isNetProfit = finalBalance >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Coins className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                ਸਾਲਾਨਾ ਬੱਚਤ / ਨਫ਼ਾ (P&L)
              </h2>
              <p className="text-xs text-emerald-200 font-medium">
                Yearly Profit & Loss Summary • {farmer.farmerNamePa || farmer.farmerName} ({farmer.farmerName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Farmer Info Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">ਕਿਸਾਨ (Farmer): </span>
              <strong className="text-slate-900 font-bold">{farmer.farmerNamePa || farmer.farmerName} ({farmer.farmerName})</strong>
            </div>
            <div>
              <span className="text-slate-500">ਖਾਤਾ ਨੰਬਰ (ID): </span>
              <strong className="text-slate-900 font-mono font-bold">{farmer.id}</strong>
            </div>
            <div>
              <span className="text-slate-500">ਪਿੰਡ (Village): </span>
              <strong className="text-slate-900 font-bold">{farmer.villagePa || farmer.village}</strong>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Total Crop Income */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
              <span className="text-xs font-semibold text-emerald-800">ਕੁੱਲ ਫਸਲ ਰਕਮ / ਆਮਦਨ (Gross Crop Value)</span>
              <div className="text-xl font-black text-emerald-950 mt-1">
                {formatCurrency(totalGrossAmount)}
              </div>
              <span className="text-[11px] text-emerald-700">ਕੁੱਲ ਬੋਰੀਆਂ: {accountSummary?.purchasedBags || accountSummary?.mandiArrivalBags || 0}</span>
            </div>

            {/* Total Labour & Mandi Deductions */}
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4">
              <span className="text-xs font-semibold text-rose-800">ਮੰਡੀ ਖਰਚੇ ਤੇ ਕਟੌਤੀਆਂ (Labour & Deductions)</span>
              <div className="text-xl font-black text-rose-950 mt-1">
                {formatCurrency(totalLabourDeductions)}
              </div>
              <span className="text-[11px] text-rose-700">ਪੱਕੀ ਲੇਬਰ, ਪੱਖਾ, ਸਕਾਈ ਆਦਿ</span>
            </div>

            {/* Net Crop Income */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4">
              <span className="text-xs font-semibold text-blue-800">ਸ਼ੁੱਧ ਫਸਲ ਰਕਮ (Net Crop Payable)</span>
              <div className="text-xl font-black text-blue-950 mt-1">
                {formatCurrency(netPayableAmount)}
              </div>
              <span className="text-[11px] text-blue-700">ਆਮਦਨ ਵਿੱਚੋਂ ਕਟੌਤੀਆਂ ਘਟਾ ਕੇ</span>
            </div>

            {/* Advances + Interest */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
              <span className="text-xs font-semibold text-amber-800">ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ (Advances & Interest)</span>
              <div className="text-xl font-black text-amber-950 mt-1">
                {formatCurrency(totalAdvanceAmount)}
              </div>
              <span className="text-[11px] text-amber-700">ਲਿਆ ਗਿਆ ਪੇਸ਼ਗੀ ਕਰਜ਼ਾ ਤੇ ਵਿਆਜ</span>
            </div>

            {/* Payments Made */}
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 sm:col-span-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-purple-800">ਪਹਿਲਾਂ ਦਿੱਤਾ ਭੁਗਤਾਨ (Payments Disbursed)</span>
                  <div className="text-xl font-black text-purple-950 mt-1">
                    {formatCurrency(paidAmount)}
                  </div>
                </div>
                <span className="text-[11px] text-purple-700 bg-purple-100 px-3 py-1 rounded-xl">ਬੈਂਕ / ਨਕਦ ਭੁਗਤਾਨ</span>
              </div>
            </div>
          </div>

          {/* Final Net Profit / Savings Banner */}
          <div className={`p-5 rounded-2xl border text-center ${
            isNetProfit
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-950'
          }`}>
            <span className="text-xs font-bold uppercase tracking-wider block mb-1">
              {isNetProfit ? 'ਸਾਲਾਨਾ ਸ਼ੁੱਧ ਬੱਚਤ / ਨਫ਼ਾ (Net Profit / Credit Balance)' : 'ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ ਦੇਣਯੋਗ (Due from Farmer / Debit Balance)'}
            </span>
            <div className="text-3xl font-black">
              {formatCurrency(Math.abs(finalBalance))}
            </div>
            <p className="text-xs mt-1 font-medium opacity-80">
              {isNetProfit
                ? 'ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ ਬਾਕੀ ਰਕਮ (Payable to Farmer)'
                : 'ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ (Farmer needs to pay)'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>ਪ੍ਰਿੰਟ ਕਰੋ (Print)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

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
    updateFarmer,
    deleteBagsEntry,
    deleteDailyPurchase,
    farmerPayments,
    addFarmerPayment,
    deleteFarmerPayment,
    addFarmerAdvance,
    updateFarmerAdvance,
    deleteFarmerAdvance,
    activeCrop,
    activeFirm,
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
  const [isProfitLossModalOpen, setIsProfitLossModalOpen] = useState(false);
  const [showPdfOptionsModal, setShowPdfOptionsModal] = useState(false);
  const [showAdditionalRecords, setShowAdditionalRecords] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<FarmerAdvanceRecord | null>(null);
  const [viewingAdvance, setViewingAdvance] = useState<FarmerAdvanceRecord | null>(null);
  const [showMaskedAadhaar, setShowMaskedAadhaar] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);
  const [isMiniSlipOpen, setIsMiniSlipOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'threepage' | 'statement' | 'tformat' | 'records'>('threepage');
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<'ALL' | 'WHEAT' | 'PADDY'>('ALL');
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Print view mode ('simple' or 'full')
  const [printMode, setPrintMode] = useState<'simple' | 'full'>('simple');

  // Repayment & Voucher Modal State
  const [repaymentModalAdvance, setRepaymentModalAdvance] = useState<FarmerAdvanceRecord | null>(null);
  const [voucherModalAdvance, setVoucherModalAdvance] = useState<FarmerAdvanceRecord | null>(null);

  // Advance Form State
  const [advanceForm, setAdvanceForm] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    interestTillDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    amount: '',
    category: 'CASH' as AdvanceCategory,
    itemDescription: '',
    cropSeason: '' as CropType | '',
    isInterestFree: false,
    interestMode: 'MONTHLY' as InterestCalculationMode,
    monthlyInterestRate: '2.0',
    annualInterestRate: '24.0',
    compounding: 'SIMPLE' as CompoundingFrequency,
    guarantorFarmerId: '',
    guarantorName: '',
    guarantorMobile: '',
    voucherPhotoUrl: '',
    voucherPhotoName: '',
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

  // Fetch current farmer and complete account with optional season filter
  const currentFarmer = farmers.find((f) => f.id === selectedFarmerId);
  const accountSummary: FarmerAccountSummary | null = selectedFarmerId
    ? getCompleteFarmerAccount(selectedFarmerId, selectedSeasonFilter)
    : null;

  // Handle Season Settlement & Carrying forward to opening balance
  const handleConfirmSettlement = (settlementData: {
    settlementDate: string;
    closingBalance: number;
    targetSeason: string;
    carryForwardAsOpening: boolean;
    remarks: string;
  }) => {
    if (!currentFarmer) return;

    if (settlementData.carryForwardAsOpening) {
      updateFarmer(currentFarmer.id, {
        openingBalance: settlementData.closingBalance,
        openingBalanceDate: settlementData.settlementDate,
        openingBalanceSeason: settlementData.targetSeason
      });
    }

    notifySaveSuccess({
      titlePa: 'ਸੀਜ਼ਨ ਖਾਤਾ ਪੱਕਾ ਹੋ ਗਿਆ ਹੈ!',
      titleEn: 'Season Settlement Saved',
      messagePa: `${currentFarmer.farmerNamePa} ਦਾ ਅੰਤਿਮ ਬਕਾਇਆ ₹${Math.abs(Math.round(settlementData.closingBalance)).toLocaleString('en-IN')} ${settlementData.carryForwardAsOpening ? 'ਅਗਲੇ ਸੀਜ਼ਨ ਵਿੱਚ ਓਪਨਿੰਗ ਬੈਲੇਂਸ ਵਜੋਂ ਸ਼ਾਮਲ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।' : 'ਸੇਵ ਕਰ ਲਿਆ ਗਿਆ ਹੈ।'}`
    });
  };

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
  const handleExportPDF = async (type: 'simple' | 'full' | 'threepage') => {
    if (!accountSummary) return;
    try {
      setIsExportingPDF(true);
      setShowPdfOptionsModal(false);
      if (type === 'threepage') {
        await exportThreePageLedgerPDF({
          account: accountSummary,
          settings,
          activeCropSeason:
            selectedSeasonFilter === 'WHEAT'
              ? 'ਹਾੜ੍ਹੀ (Wheat) 2026'
              : selectedSeasonFilter === 'PADDY'
              ? 'ਸਾਉਣੀ (Paddy) 2026'
              : 'ਸਾਉਣੀ / ਹਾੜ੍ਹੀ 2026',
          mode: 'all'
        });
        notifySaveSuccess({
          titleEn: '3-Page Mandi Ledger PDF Exported',
          titlePa: '3-ਪੇਜ ਬਹੀ-ਖਾਤਾ PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ',
          messageEn: `3-Page Mandi Ledger PDF for ${accountSummary.farmer.farmerName} generated.`,
          messagePa: `ਕਿਸਾਨ ${accountSummary.farmer.farmerNamePa || accountSummary.farmer.farmerName} ਦਾ 3-ਪੇਜ ਬਹੀ-ਖਾਤਾ PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ ਹੈ।`
        });
      } else if (type === 'simple') {
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
      category: 'CASH',
      itemDescription: '',
      cropSeason: '',
      isInterestFree: false,
      interestMode: 'MONTHLY',
      monthlyInterestRate: '2.0',
      annualInterestRate: '24.0',
      compounding: 'SIMPLE',
      guarantorFarmerId: '',
      guarantorName: '',
      guarantorMobile: '',
      voucherPhotoUrl: '',
      voucherPhotoName: '',
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
    const monthlyRate = adv.monthlyInterestRate !== undefined ? String(adv.monthlyInterestRate) : '2.0';
    const annualRate = adv.annualInterestRate !== undefined ? String(adv.annualInterestRate) : String((Number(monthlyRate) || 2.0) * 12);

    setAdvanceForm({
      date: adv.startDate || adv.date,
      interestTillDate: adv.endDate || adv.interestTillDate || today,
      amount: String(adv.principal ?? adv.amount),
      category: adv.category || 'CASH',
      itemDescription: adv.itemDescription || '',
      cropSeason: adv.cropSeason || '',
      isInterestFree: Boolean(adv.isInterestFree),
      interestMode: adv.interestMode || 'MONTHLY',
      monthlyInterestRate: monthlyRate,
      annualInterestRate: annualRate,
      compounding: adv.compounding || 'SIMPLE',
      guarantorFarmerId: adv.guarantorFarmerId || '',
      guarantorName: adv.guarantorName || '',
      guarantorMobile: adv.guarantorMobile || '',
      voucherPhotoUrl: adv.voucherPhotoUrl || '',
      voucherPhotoName: adv.voucherPhotoName || '',
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
    const monthlyRate = parseFloat(advanceForm.monthlyInterestRate) || 0;
    const annualRate = parseFloat(advanceForm.annualInterestRate) || (monthlyRate * 12);
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

    const payload: Partial<FarmerAdvanceRecord> = {
      date: startDate,
      startDate: startDate,
      interestTillDate: endDate,
      endDate: endDate,
      amount: amt,
      principal: amt,
      category: advanceForm.category,
      itemDescription: advanceForm.itemDescription.trim(),
      cropSeason: (advanceForm.cropSeason as CropType) || undefined,
      isInterestFree: advanceForm.isInterestFree,
      interestMode: advanceForm.interestMode,
      monthlyInterestRate: monthlyRate,
      annualInterestRate: annualRate,
      compounding: advanceForm.compounding,
      guarantorFarmerId: advanceForm.guarantorFarmerId || undefined,
      guarantorName: advanceForm.guarantorName.trim() || undefined,
      guarantorMobile: advanceForm.guarantorMobile.trim() || undefined,
      voucherPhotoUrl: advanceForm.voucherPhotoUrl || undefined,
      voucherPhotoName: advanceForm.voucherPhotoName || undefined,
      paymentMode: advanceForm.paymentMode,
      referenceNumber: advanceForm.referenceNumber.trim(),
      remarks: advanceForm.remarks.trim()
    };

    if (editingAdvance) {
      updateFarmerAdvance(editingAdvance.id, payload);
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
        ...payload,
        status: 'ACTIVE'
      } as any);
      notifySaveSuccess({
        titleEn: 'Advance Recorded',
        titlePa: 'ਨਵੀਂ ਪੇਸ਼ਗੀ ਦਰਜ ਹੋ ਗਈ',
        messageEn: `Advance of ₹${amt} recorded successfully.`,
        messagePa: `ਕਿਸਾਨ ਲਈ ₹${amt} ਪੇਸ਼ਗੀ ਦਰਜ ਹੋ ਗਈ ਹੈ।`
      });
    }

    setIsAdvanceModalOpen(false);
  };

  // WhatsApp Share for specific Advance
  const handleShareAdvanceWhatsApp = (adv: FarmerAdvanceRecord) => {
    if (!currentFarmer) return;
    const farmerName = currentFarmer.farmerNamePa ? `${currentFarmer.farmerNamePa} (${currentFarmer.farmerName})` : currentFarmer.farmerName;
    const msg = generateAdvanceWhatsAppMessage({
      advance: adv,
      farmerName,
      firm: activeFirm,
      settings
    });
    openWhatsApp(currentFarmer.mobile || '', msg);
  };

  // Delete Advance Record with Confirmation
  const handleDeleteAdvanceRecord = (advId: string) => {
    confirmDelete({
      recordNameEn: `Advance Record`,
      recordNamePa: `ਐਡਵਾਂਸ ਰਿਕਾਰਡ`,
      recordId: advId,
      itemDetails: [
        { labelEn: 'Record ID', labelPa: 'ਰਿਕਾਰਡ ਨੰਬਰ', value: advId }
      ],
      onConfirm: () => {
        deleteFarmerAdvance(advId);
        notifyDeleteSuccess({
          titleEn: 'Advance Deleted',
          titlePa: 'ਐਡਵਾਂਸ ਰਿਕਾਰਡ ਹਟਾ ਦਿੱਤਾ ਗਿਆ',
          messageEn: 'The advance record has been removed.',
          messagePa: 'ਐਡਵਾਂਸ ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।'
        });
      }
    });
  };

  // Delete Payment / Receiving Record with Confirmation
  const handleDeletePaymentRecord = (paymentId: string) => {
    const pay = accountSummary?.paymentRecords.find((p) => p.id === paymentId) ||
                farmerPayments.find((p) => p.id === paymentId);
    const amountStr = pay ? `₹${Math.round(pay.amount).toLocaleString('en-IN')}` : '';
    confirmDelete({
      recordNameEn: `Payment / Recovery Record`,
      recordNamePa: `ਭੁਗਤਾਨ / ਰਿਕਵਰੀ ਰਸੀਦ`,
      recordId: paymentId,
      itemDetails: [
        { labelEn: 'Record ID', labelPa: 'ਰਿਕਾਰਡ ਨੰਬਰ', value: paymentId },
        { labelEn: 'Amount', labelPa: 'ਭੁਗਤਾਨ ਰਕਮ', value: amountStr },
        { labelEn: 'Date', labelPa: 'ਮਿਤੀ', value: pay?.date || '—' },
        { labelEn: 'Mode', labelPa: 'ਢੰਗ', value: pay?.paymentMode || '—' },
        { labelEn: 'Agency', labelPa: 'ਏਜੰਸੀ', value: pay?.agency || '—' }
      ],
      onConfirm: () => {
        deleteFarmerPayment(paymentId);
        notifyDeleteSuccess({
          titleEn: 'Payment Deleted',
          titlePa: 'ਭੁਗਤਾਨ / ਰਿਕਵਰੀ ਰਿਕਾਰਡ ਹਟਾ ਦਿੱਤਾ ਗਿਆ',
          messageEn: `Payment of ${amountStr} has been removed.`,
          messagePa: `${amountStr} ਦਾ ਭੁਗਤਾਨ ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
        });
      }
    });
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
    const startDateStr = advanceForm.date.trim();
    const endDateStr = advanceForm.interestTillDate.trim() || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (amt <= 0 || !startDateStr) {
      return { totalDays: 0, months: 0, days: 0, interest: 0, totalPayable: amt };
    }
    const res = calculateAdvanceInterest({
      principal: amt,
      startDate: startDateStr,
      endDate: endDateStr,
      monthlyInterestRate: parseFloat(advanceForm.monthlyInterestRate) || 0,
      annualInterestRate: parseFloat(advanceForm.annualInterestRate) || 0,
      interestMode: advanceForm.interestMode,
      compounding: advanceForm.compounding,
      isInterestFree: advanceForm.isInterestFree
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

          {/* Search & Select Farmer + Bulk Broadcast Action */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            {/* Season Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                <span>🌾</span>
                <span className="hidden sm:inline">ਸੀਜ਼ਨ:</span>
              </span>
              <select
                value={selectedSeasonFilter}
                onChange={(e) => setSelectedSeasonFilter(e.target.value as 'ALL' | 'WHEAT' | 'PADDY')}
                className="bg-transparent text-xs font-black text-amber-950 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ਸਾਰਾ ਹਿਸਾਬ (All Seasons)</option>
                <option value="WHEAT">ਹਾੜ੍ਹੀ (Wheat Season)</option>
                <option value="PADDY">ਸਾਉਣੀ (Paddy Season)</option>
              </select>
            </div>

            <button
              onClick={() => setIsBulkWhatsAppOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              title="ਬਲਕ ਵਿੱਚ ਕਿਸਾਨਾਂ ਨੂੰ ਸੀਜ਼ਨ ਬਕਾਇਆ ਜਾਂ ਤੁਲਾਈ ਸਟੇਟਮੈਂਟ WhatsApp ਭੇਜੋ"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span>ਬਲਕ WhatsApp (Bulk Broadcast)</span>
            </button>

            <div className="w-full sm:w-80">
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

                  {/* One-Click Mini Slip Button */}
                  <button
                    type="button"
                    onClick={() => setIsMiniSlipOpen(true)}
                    className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="ਕਿਸਾਨ ਲਈ ਛੋਟੀ ਮੋਬਾਈਲ/ਥਰਮਲ ਪਰਚੀ (One-Click Mini Slip)"
                  >
                    <Receipt className="w-4 h-4 text-slate-950" />
                    <span>ਛੋਟੀ ਪਰਚੀ (Mini Slip)</span>
                  </button>

                  {/* T-Format Ledger Button */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('tformat')}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      activeTab === 'tformat'
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500'
                        : 'bg-amber-700 hover:bg-amber-800 text-white'
                    }`}
                    title="ਆਹਮੋ-ਸਾਹਮਣੇ ਨਾਮੇ/ਜਮ੍ਹਾਂ T-ਸ਼ਕਲ ਬਹੀ-ਖਾਤਾ (T-Format Munim Ledger)"
                  >
                    <ArrowLeftRight className="w-4 h-4 text-amber-300" />
                    <span>T-ਬਹੀ ਖਾਤਾ (T-Format)</span>
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

                  {/* WhatsApp Statement Share Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const farmerName = accountSummary.farmer.farmerNamePa || accountSummary.farmer.farmerName;
                      const firmTitle = activeFirm?.namePa || activeFirm?.name || settings.firmNamePa || settings.firmNameEn || 'Mandi Commission Agent';
                      const netBalance = accountSummary.finalBalance ?? accountSummary.finalNetSettlementBalance ?? 0;
                      const netBalanceText = netBalance >= 0
                        ? `ਬਾਕੀ ਦੇਣਯੋਗ (Payable to Farmer): ${formatCurrency(netBalance)}`
                        : `ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ (Due from Farmer): ${formatCurrency(Math.abs(netBalance))}`;

                      const lines: string[] = [
                        `🌾 *${firmTitle}*`,
                        `📋 *ਕਿਸਾਨ ਖਾਤਾ ਸਟੇਟਮੈਂਟ ਸੰਖੇਪ (Account Summary)*`,
                        `--------------------------------`,
                        `👤 *ਕਿਸਾਨ (Farmer):* ${farmerName} (${accountSummary.farmer.farmerName})`,
                        `🆔 *ਕਿਸਾਨ ID:* ${accountSummary.farmer.id}`,
                        `🏡 *ਪਿੰਡ (Village):* ${accountSummary.farmer.village || '—'}`,
                        `📅 *ਤਾਰੀਖ:* ${new Date().toLocaleDateString('en-GB')}`,
                        `--------------------------------`,
                        `📦 *ਕੁੱਲ ਬੋਰੀਆਂ (Total Bags):* ${accountSummary.purchasedBags || accountSummary.mandiArrivalBags}`,
                        `⚖️ *ਕੁੱਲ ਵਜ਼ਨ (Total Weight):* ${accountSummary.purchasedWeightDisplay || accountSummary.mandiArrivalDisplay}`,
                        `💰 *ਕੁੱਲ ਫਸਲ ਰਕਮ (Crop Value):* ${formatCurrency(accountSummary.totalGrossAmount)}`,
                        accountSummary.totalLabourDeductions > 0 ? `✂️ *ਕੁੱਲ ਖਰਚਾ/ਕਟੌਤੀ (Expenses):* ${formatCurrency(accountSummary.totalLabourDeductions)}` : '',
                        `💵 *ਸ਼ੁੱਧ ਫਸਲ ਰਕਮ (Net Crop):* ${formatCurrency(accountSummary.netPayableAmount)}`,
                        `--------------------------------`,
                        accountSummary.paidAmount > 0 ? `💳 *ਪਹਿਲਾਂ ਦਿੱਤਾ ਭੁਗਤਾਨ (Paid):* ${formatCurrency(accountSummary.paidAmount)}` : '',
                        accountSummary.totalAdvanceAmount > 0 ? `🤝 *ਐਡਵਾਂਸ + ਵਿਆਜ:* ${formatCurrency(accountSummary.totalAdvanceAmount)}` : '',
                        `--------------------------------`,
                        `⭐ *${netBalanceText}*`,
                        `--------------------------------`,
                        `_ਧੰਨਵਾਦ!_`
                      ].filter(Boolean);

                      openWhatsApp(accountSummary.farmer.mobile, lines.join('\n'));
                    }}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="ਕਿਸਾਨ ਦੇ ਵ੍ਹਟਸਐਪ 'ਤੇ ਸਟੇਟਮੈਂਟ ਭੇਜੋ (Share Statement on WhatsApp)"
                  >
                    <Send className="w-4 h-4 text-white" />
                    <span>WhatsApp Share / ਵ੍ਹਟਸਐਪ</span>
                  </button>

                  {/* Season Settlement / ਖਾਤਾ ਪੱਕਾ ਕਰਨਾ Button */}
                  <button
                    type="button"
                    onClick={() => setIsSettlementModalOpen(true)}
                    className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="ਸੀਜ਼ਨ ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ / ਖਾਤਾ ਪੱਕਾ ਕਰਨਾ (Season Settlement Voucher)"
                  >
                    <Scale className="w-4 h-4 text-slate-950" />
                    <span>ਖਾਤਾ ਪੱਕਾ ਕਰੋ (Settlement)</span>
                  </button>

                  {/* Yearly Profit & Loss (P&L) Button */}
                  <button
                    type="button"
                    onClick={() => setIsProfitLossModalOpen(true)}
                    className="px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="ਸਾਲਾਨਾ ਬੱਚਤ / ਨਫ਼ਾ (P&L)"
                  >
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span>ਸਾਲਾਨਾ ਬੱਚਤ / ਨਫ਼ਾ (P&L)</span>
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

            {/* ============================================================== */}
            {/* 2.2 QUICK ACTION BAR (ਤੇਜ਼ ਐਂਟਰੀ ਸ਼ਾਰਟਕੱਟ - 4 ਰੰਗਦਾਰ ਬਟਨ) */}
            {/* ============================================================== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. Cash Out (ਨਕਦ ਦਿੱਤਾ) */}
              <button
                type="button"
                onClick={() => {
                  setEditingAdvance(null);
                  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  setAdvanceForm({
                    date: today,
                    interestTillDate: today,
                    amount: '',
                    category: 'CASH',
                    itemDescription: 'ਨਕਦ ਪੇਸ਼ਗੀ (Cash Out)',
                    cropSeason: '',
                    isInterestFree: false,
                    interestMode: 'MONTHLY',
                    monthlyInterestRate: '2.0',
                    annualInterestRate: '24.0',
                    compounding: 'SIMPLE',
                    guarantorFarmerId: '',
                    guarantorName: '',
                    guarantorMobile: '',
                    voucherPhotoUrl: '',
                    voucherPhotoName: '',
                    paymentMode: 'CASH',
                    referenceNumber: '',
                    remarks: ''
                  });
                  setIsAdvanceModalOpen(true);
                }}
                className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl shadow-md transition-all active:scale-98 flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <IndianRupee className="w-5 h-5 text-white" />
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm font-black text-white leading-tight">
                    🟢 + ਨਕਦ ਦਿੱਤਾ
                  </strong>
                  <span className="text-[11px] text-emerald-100 font-medium">Cash Out (Advance)</span>
                </div>
              </button>

              {/* 2. Bank Transfer (ਬੈਂਕ ਟਰਾਂਸਫਰ) */}
              <button
                type="button"
                onClick={() => {
                  setPaymentForm({
                    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    amount: '',
                    paymentMode: 'BANK_TRANSFER',
                    agency: '',
                    referenceNumber: '',
                    remarks: 'ਬੈਂਕ ਟਰਾਂਸਫਰ (RTGS/NEFT)'
                  });
                  setIsPaymentModalOpen(true);
                }}
                className="p-3.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl shadow-md transition-all active:scale-98 flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-5 h-5 text-white" />
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm font-black text-white leading-tight">
                    🔵 + ਬੈਂਕ ਟਰਾਂਸਫਰ
                  </strong>
                  <span className="text-[11px] text-blue-100 font-medium">Bank Transfer (Payment)</span>
                </div>
              </button>

              {/* 3. Store Item (ਖਾਦ/ਡੀਜ਼ਲ ਪਰਚੀ) */}
              <button
                type="button"
                onClick={() => {
                  setEditingAdvance(null);
                  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  setAdvanceForm({
                    date: today,
                    interestTillDate: today,
                    amount: '',
                    category: 'FERTILIZER',
                    itemDescription: 'ਖਾਦ / ਡੀਜ਼ਲ / ਬੀਜ',
                    cropSeason: '',
                    isInterestFree: false,
                    interestMode: 'MONTHLY',
                    monthlyInterestRate: '2.0',
                    annualInterestRate: '24.0',
                    compounding: 'SIMPLE',
                    guarantorFarmerId: '',
                    guarantorName: '',
                    guarantorMobile: '',
                    voucherPhotoUrl: '',
                    voucherPhotoName: '',
                    paymentMode: 'CASH',
                    referenceNumber: '',
                    remarks: 'ਸਟੋਰ ਖਾਦ/ਤੇਲ'
                  });
                  setIsAdvanceModalOpen(true);
                }}
                className="p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl shadow-md transition-all active:scale-98 flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="p-2.5 bg-white/30 rounded-xl group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm font-black text-slate-950 leading-tight">
                    🟡 + ਖਾਦ/ਡੀਜ਼ਲ ਪਰਚੀ
                  </strong>
                  <span className="text-[11px] text-amber-950 font-bold">Store Item (Fertilizer/Diesel)</span>
                </div>
              </button>

              {/* 4. Cash Received / Repayment (ਕਿਸ਼ਤ ਵਾਪਸ ਆਈ) */}
              <button
                type="button"
                onClick={() => {
                  if (accountSummary.advances.length > 0) {
                    setRepaymentModalAdvance(accountSummary.advances[0]);
                  } else {
                    notifyError({
                      titlePa: 'ਕੋਈ ਪੇਸ਼ਗੀ ਮੌਜੂਦ ਨਹੀਂ',
                      titleEn: 'No Advance Exists',
                      messagePa: 'ਕਿਸਾਨ ਵੱਲ ਪਹਿਲਾਂ ਹੀ ਕੋਈ ਐਡਵਾਂਸ ਬਕਾਇਆ ਨਹੀਂ ਹੈ।'
                    });
                  }
                }}
                className="p-3.5 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-2xl shadow-md transition-all active:scale-98 flex items-center gap-3 text-left cursor-pointer group"
              >
                <div className="p-2.5 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm font-black text-white leading-tight">
                    🟣 + ਕਿਸ਼ਤ ਵਾਪਸ ਆਈ
                  </strong>
                  <span className="text-[11px] text-purple-100 font-medium">Repayment Received</span>
                </div>
              </button>
            </div>

            {/* ============================================================== */}
            {/* 2.3 CREDIT LIMIT & LAND PROFILE ALERT CARD */}
            {/* ============================================================== */}
            <div className="space-y-3">
              {/* Credit Limit Alert Banner (Red if exceeded, or normal summary) */}
              {accountSummary.creditLimitExceeded && (
                <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-950 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600 text-white rounded-xl">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <strong className="text-sm font-black block">
                        ⚠️ ਚੇਤਾਵਨੀ: ਉਧਾਰ ਲਿਮਿਟ ਪਾਰ ਹੋ ਚੁੱਕੀ ਹੈ! (Credit Limit Exceeded)
                      </strong>
                      <p className="text-xs text-rose-900 mt-0.5">
                        ਕਿਸਾਨ ਨੂੰ ਦਿੱਤਾ ਕੁੱਲ ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ({formatCurrency(accountSummary.totalAdvanceAmount)}) ਤੈਅ ਕੀਤੀ ਉਧਾਰ ਲਿਮਿਟ ({formatCurrency(accountSummary.creditLimit || 0)}) ਤੋਂ 
                        <strong className="font-mono text-rose-950 font-black"> {formatCurrency(Math.abs(accountSummary.creditLimitRemaining || 0))}</strong> ਵੱਧ ਚੁੱਕਾ ਹੈ।
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer shadow-xs"
                  >
                    ਲਿਮਿਟ ਵਧਾਓ (Edit Limit)
                  </button>
                </div>
              )}

              {/* Land Profile & Credit Limit Overview Strip */}
              {(currentFarmer.ownedLandAcres || currentFarmer.leasedLandAcres || currentFarmer.creditLimit || currentFarmer.openingBalance !== undefined) && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-black text-slate-800 flex items-center gap-1.5">
                      <span>🌾</span>
                      <span>ਜ਼ਮੀਨ ਤੇ ਲਿਮਿਟ ਵੇਰਵਾ:</span>
                    </span>

                    {currentFarmer.ownedLandAcres !== undefined && (
                      <span className="text-slate-600">
                        ਆਪਣੀ: <strong className="text-slate-900 font-bold">{currentFarmer.ownedLandAcres} ਏਕੜ</strong>
                      </span>
                    )}

                    {currentFarmer.leasedLandAcres !== undefined && (
                      <span className="text-slate-600">
                        ਠੇਕਾ: <strong className="text-slate-900 font-bold">{currentFarmer.leasedLandAcres} ਕਿੱਲੇ</strong>
                      </span>
                    )}

                    {currentFarmer.expectedWheatBags !== undefined && (
                      <span className="text-amber-800">
                        ਅੰਦਾਜ਼ਨ ਕਣਕ: <strong className="font-mono font-bold">{currentFarmer.expectedWheatBags} ਬੋਰੀਆਂ</strong>
                      </span>
                    )}

                    {currentFarmer.expectedPaddyBags !== undefined && (
                      <span className="text-emerald-800">
                        ਅੰਦਾਜ਼ਨ ਝੋਨਾ: <strong className="font-mono font-bold">{currentFarmer.expectedPaddyBags} ਬੋਰੀਆਂ</strong>
                      </span>
                    )}

                    {currentFarmer.creditLimit ? (
                      <span className={`px-2 py-0.5 rounded font-mono font-black ${
                        accountSummary.creditLimitExceeded ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        ਲਿਮਿਟ: ₹{currentFarmer.creditLimit.toLocaleString('en-IN')}
                      </span>
                    ) : null}

                    {currentFarmer.openingBalance !== undefined && currentFarmer.openingBalance !== 0 && (
                      <span className="text-slate-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ਓਪਨਿੰਗ ਬੈਲੇਂਸ: <strong className={currentFarmer.openingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {currentFarmer.openingBalance >= 0 ? '+' : '-'}₹{Math.abs(currentFarmer.openingBalance).toLocaleString('en-IN')}
                        </strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" />
                    <span>ਵੇਰਵਾ ਸੋਧੋ</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2.5 VIEW SWITCHER: EXACT REFERENCE A4 STATEMENT vs T-FORMAT LEDGER vs DETAILED RECORDS */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('threepage')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'threepage'
                      ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500 scale-[1.02]'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300'
                  }`}
                >
                  <Scale className="w-4 h-4 text-amber-300" />
                  <span>3-ਪੇਜ ਬਹੀ-ਖਾਤਾ (ਫਸਲ / ਐਡਵਾਂਸ / ਨਿਬੇੜਾ)</span>
                </button>

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
                  <span>Exact A4 Statement / ਹੂ-ਬ-ਹੂ A4 ਸਟੇਟਮੈਂਟ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tformat')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'tformat'
                      ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-500'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>⚖️ T-Format Ledger / T-ਸ਼ਕਲ ਬਹੀ-ਖਾਤਾ</span>
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

            {/* TAB VIEW DISPLAY */}
            {activeTab === 'threepage' ? (
              <FarmerThreePageAccount
                farmer={currentFarmer}
                summary={accountSummary}
                settings={settings}
                activeCropSeason={
                  selectedSeasonFilter === 'WHEAT'
                    ? 'ਹਾੜ੍ਹੀ (Wheat) 2026'
                    : selectedSeasonFilter === 'PADDY'
                    ? 'ਸਾਉਣੀ (Paddy) 2026'
                    : 'ਹਾੜ੍ਹੀ (Wheat) 2026'
                }
                onOpenAdvanceModal={handleOpenAddAdvance}
                onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
                onOpenSettlementModal={() => setIsSettlementModalOpen(true)}
                onDeleteAdvance={handleDeleteAdvanceRecord}
                onDeletePayment={handleDeletePaymentRecord}
                onEditAdvance={handleOpenEditAdvance}
                onViewVoucher={(adv) => setVoucherModalAdvance(adv)}
                onOpenRepayment={(adv) => setRepaymentModalAdvance(adv)}
              />
            ) : activeTab === 'statement' ? (
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
            ) : activeTab === 'tformat' ? (
              <div className="bg-slate-100/90 p-3 sm:p-6 rounded-3xl overflow-x-auto border border-slate-300/80 shadow-inner">
                <FarmerTFormatLedger
                  farmer={currentFarmer}
                  account={accountSummary}
                  settings={settings}
                  firmName={activeFirm?.namePa || activeFirm?.name || settings.firmNamePa || settings.firmNameEn}
                  firmMobile={activeFirm?.mobile || settings.firmMobile}
                  onOpenMiniSlip={() => setIsMiniSlipOpen(true)}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. NEW: 4-STEP SIMPLE SUMMARY CARD + AUDIO ASSISTANT (Highest prominence for easy farmer understanding) */}
                <FarmerSimpleSummaryCard
                  farmer={currentFarmer}
                  summary={accountSummary}
                  onOpenMiniSlip={() => setIsMiniSlipOpen(true)}
                  onOpenPL={() => setIsProfitLossModalOpen(true)}
                  onOpenTFormat={() => setActiveTab('tformat')}
                />

                {/* 2. NEW: BARDANA CLEARANCE STATUS BOX */}
                <BardanaClearanceCard
                  summary={accountSummary}
                  onNavigateToBardana={() => setActiveSection('bardana')}
                />

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
                              <th className="p-2.5">Date & Category / ਮਿਤੀ ਤੇ ਮੱਦ</th>
                              <th className="p-2.5">Details & Guarantor / ਵੇਰਵਾ ਤੇ ਜ਼ਾਮਨ</th>
                              <th className="p-2.5">Principal & Repaid / ਮੂਲ ਤੇ ਵਾਪਸੀ</th>
                              <th className="p-2.5">Rate & Rule / ਵਿਆਜ ਦਰ</th>
                              <th className="p-2.5">Duration / ਦਿਨ</th>
                              <th className="p-2.5">Interest / ਵਿਆਜ</th>
                              <th className="p-2.5 text-right">Net Payable / ਕੁੱਲ ਦੇਣਯੋਗ</th>
                              <th className="p-2.5 text-center">ਕਾਰਵਾਈ / Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {accountSummary.advances.map((adv) => {
                              const repayments = Array.isArray(adv.repayments) ? adv.repayments : [];
                              const totalRepaid = adv.totalRepaid || repayments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
                              const origPrincipal = Number(adv.principal ?? adv.amount) || 0;
                              const netPrincipal = adv.netPrincipalRemaining !== undefined ? adv.netPrincipalRemaining : Math.max(0, origPrincipal - totalRepaid);
                              const interestAmount = Number(adv.interestAmount) || 0;
                              const totalPayable = adv.totalPayableWithInterest ?? (netPrincipal + interestAmount);

                              const catBadgeStyle: Record<string, { label: string; cls: string }> = {
                                CASH: { label: 'ਨਕਦ (Cash)', cls: 'bg-emerald-100 text-emerald-800' },
                                FERTILIZER: { label: 'ਖਾਦ/ਦਵਾਈ (Fertilizer)', cls: 'bg-indigo-100 text-indigo-800' },
                                SEED: { label: 'ਬੀਜ (Seed)', cls: 'bg-teal-100 text-teal-800' },
                                DIESEL: { label: 'ਡੀਜ਼ਲ (Diesel)', cls: 'bg-amber-100 text-amber-800' },
                                MACHINERY: { label: 'ਮਸ਼ੀਨਰੀ (Machinery)', cls: 'bg-purple-100 text-purple-800' },
                                PREVIOUS_BALANCE: { label: 'ਪਿਛਲਾ ਬਕਾਇਆ (Prev Bal)', cls: 'bg-rose-100 text-rose-800' },
                                OTHER: { label: 'ਹੋਰ (Other)', cls: 'bg-slate-100 text-slate-800' }
                              };
                              const catInfo = catBadgeStyle[adv.category || 'CASH'] || catBadgeStyle['CASH'];

                              return (
                                <tr key={adv.id} className="hover:bg-amber-50/30">
                                  {/* Date & Category */}
                                  <td className="p-2.5 font-sans">
                                    <div className="font-semibold text-slate-900">{adv.startDate || adv.date}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${catInfo.cls}`}>
                                        {catInfo.label}
                                      </span>
                                      {adv.cropSeason && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                          {adv.cropSeason}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Details & Guarantor */}
                                  <td className="p-2.5 font-sans max-w-xs">
                                    {adv.itemDescription ? (
                                      <div className="text-slate-800 font-medium truncate" title={adv.itemDescription}>
                                        {adv.itemDescription}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 italic text-[11px]">—</span>
                                    )}

                                    {adv.guarantorName && (
                                      <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium mt-0.5">
                                        <ShieldCheck className="w-3 h-3 shrink-0" />
                                        <span>ਜ਼ਾਮਨ: {adv.guarantorName}</span>
                                      </div>
                                    )}

                                    {adv.voucherPhotoUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setVoucherModalAdvance(adv)}
                                        className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-0.5 hover:underline"
                                      >
                                        <Receipt className="w-3 h-3 text-emerald-600" />
                                        <span>ਪਰਚੀ ਫੋਟੋ ਮੌਜੂਦ (View Slip)</span>
                                      </button>
                                    )}
                                  </td>

                                  {/* Principal & Repaid */}
                                  <td className="p-2.5">
                                    <div className="font-bold text-slate-900">{formatCurrencyINR(origPrincipal)}</div>
                                    {totalRepaid > 0 && (
                                      <div className="text-[11px] mt-0.5">
                                        <span className="text-emerald-700 font-medium">ਵਾਪਸੀ: -{formatCurrencyINR(totalRepaid)}</span>
                                        <div className="text-slate-500 font-semibold">ਬਾਕੀ: {formatCurrencyINR(netPrincipal)}</div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Rate & Rule */}
                                  <td className="p-2.5 font-sans">
                                    {adv.isInterestFree || adv.interestMode === 'INTEREST_FREE' ? (
                                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                        0% ਬਿਨਾਂ ਵਿਆਜ
                                      </span>
                                    ) : (
                                      <div>
                                        <div className="text-amber-800 font-bold">
                                          {adv.monthlyInterestRate ?? 2.0}%/ਮਹੀਨਾ
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                          {adv.compounding === 'HALF_YEARLY' ? 'ਛਿਮਾਹੀ ਚੱਕਰਵਰਤੀ' : 'ਸਾਧਾਰਨ ਵਿਆਜ'}
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Duration */}
                                  <td className="p-2.5 font-sans text-slate-600">
                                    <div className="font-bold text-slate-800">{adv.totalDays || 0} ਦਿਨ</div>
                                    {adv.monthsElapsed !== undefined && (
                                      <div className="text-[10px] text-slate-400">
                                        {adv.monthsElapsed} ਮਹੀਨੇ, {adv.daysElapsed || 0} ਦਿਨ
                                      </div>
                                    )}
                                  </td>

                                  {/* Interest */}
                                  <td className="p-2.5 font-sans">
                                    <div className="font-bold text-amber-800">
                                      {formatCurrencyINR(interestAmount)}
                                    </div>
                                    {!adv.isInterestFree && interestAmount > 0 && (
                                      <div className="text-[10px] text-slate-500 font-mono" title="ਵਿਆਜ ਹਿਸਾਬ: ਮੂਲ × ਦਰ% × ਸਮਾਂ">
                                        ({netPrincipal} × {adv.monthlyInterestRate ?? 2}%)
                                      </div>
                                    )}
                                  </td>

                                  {/* Total Net Payable */}
                                  <td className="p-2.5 font-black text-rose-950 text-right text-sm">
                                    {formatCurrencyINR(totalPayable)}
                                  </td>

                                  {/* Actions */}
                                  <td className="p-2.5 text-center font-sans">
                                    <div className="flex items-center justify-center gap-1">
                                      {/* Voucher Print Button */}
                                      <button
                                        onClick={() => setVoucherModalAdvance(adv)}
                                        className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="ਵਾਊਚਰ / ਪ੍ਰੋਨੋਟ ਪਰਚੀ ਪ੍ਰਿੰਟ ਕਰੋ (Print Voucher)"
                                      >
                                        <Receipt className="w-4 h-4" />
                                      </button>

                                      {/* Repayment Modal Button */}
                                      <button
                                        onClick={() => setRepaymentModalAdvance(adv)}
                                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="ਕਿਸ਼ਤ ਵਾਪਸੀ / ਅੰਸ਼ਕ ਅਦਾਇਗੀ (Manage Repayments)"
                                      >
                                        <Coins className="w-4 h-4" />
                                      </button>

                                      {/* WhatsApp Share Button */}
                                      <button
                                        onClick={() => handleShareAdvanceWhatsApp(adv)}
                                        className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="WhatsApp 'ਤੇ ਪੇਸ਼ਗੀ ਹਿਸਾਬ ਭੇਜੋ (Share on WhatsApp)"
                                      >
                                        <Share2 className="w-4 h-4" />
                                      </button>

                                      {/* Breakdown Button */}
                                      <button
                                        onClick={() => setViewingAdvance(adv)}
                                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                        title="ਵਿਆਜ ਗਣਨਾ ਵੇਰਵਾ (View Breakdown)"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>

                                      {/* Edit Button */}
                                      <button
                                        onClick={() => handleOpenEditAdvance(adv)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="ਸੋਧੋ (Edit Advance)"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>

                                      {/* Delete Button */}
                                      <button
                                        onClick={() => deleteFarmerAdvance(adv.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="ਹਟਾਓ (Delete Advance)"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
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
                                <td className="p-2.5 font-sans">
                                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    pay.paymentMode === 'CASH'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : pay.paymentMode === 'BANK_TRANSFER' || (pay.paymentMode as string) === 'RTGS' || (pay.paymentMode as string) === 'NEFT'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                      : pay.paymentMode === 'CHEQUE'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}>
                                    {pay.paymentMode === 'CASH' ? '💵 ਨਕਦ (Cash)' :
                                     pay.paymentMode === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ (Bank)' :
                                     (pay.paymentMode as string) === 'RTGS' || (pay.paymentMode as string) === 'NEFT' ? '⚡ RTGS/NEFT' :
                                     pay.paymentMode === 'CHEQUE' ? '📝 ਚੈੱਕ (Cheque)' :
                                     pay.paymentMode}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  {pay.referenceNumber ? (
                                    <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                      {pay.referenceNumber}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">ਕੋਈ UTR ਨਹੀਂ</span>
                                  )}
                                </td>
                                <td className="p-2.5 font-sans text-slate-700">{pay.agency || '—'}</td>
                                <td className="p-2.5 text-right font-black text-emerald-900">{formatCurrencyINR(pay.amount)}</td>
                                <td className="p-2.5 text-center font-sans">
                                  <button
                                    onClick={() => handleDeletePaymentRecord(pay.id)}
                                    className="p-1 text-slate-400 hover:text-rose-700 rounded cursor-pointer"
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
              {/* Option 0: Complete 3-Page Mandi Ledger PDF */}
              <button
                onClick={() => handleExportPDF('threepage')}
                className="w-full p-3.5 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-left rounded-xl border-2 border-rose-400 shadow-xs transition-all flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-sm text-rose-950 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-black uppercase">ਨਵਾਂ / ਸਿਫਾਰਿਸ਼ੀ</span>
                    <span>3-ਪੇਜ ਬਹੀ-ਖਾਤਾ PDF (3-Page Ledger)</span>
                  </div>
                  <div className="text-[11px] text-rose-800 mt-0.5">
                    ਪੇਜ 1 (ਫਸਲ ਤੇ ਲੇਬਰ) + ਪੇਜ 2 (ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ) + ਪੇਜ 3 (ਅੰਤਿਮ ਨਿਬੇੜਾ ਤੇ ਦਸਤਖਤ)
                  </div>
                </div>
                <FileDown className="w-5 h-5 text-rose-700 shrink-0" />
              </button>

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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingAdvance ? 'ਪੇਸ਼ਗੀ ਸੋਧੋ (Edit Advance)' : 'ਨਵੀਂ ਪੇਸ਼ਗੀ ਦਰਜ ਕਰੋ (Record Advance)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ਕਿਸਾਨ: {currentFarmer.farmerNamePa} ({currentFarmer.farmerName}) • ਖਾਤਾ: {currentFarmer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvanceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="mt-4 space-y-4 text-xs overflow-y-auto flex-1 pr-1">
              {/* Category / Purpose Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  ਪੇਸ਼ਗੀ ਦੀ ਕਿਸਮ / ਮੰਤਵ (Advance Category / Purpose) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'CASH', label: 'ਨਕਦ (Cash)' },
                    { id: 'FERTILIZER', label: 'ਖਾਦ/ਸਪਰੇਅ (Fertilizer)' },
                    { id: 'SEED', label: 'ਬੀਜ (Seed)' },
                    { id: 'DIESEL', label: 'ਡੀਜ਼ਲ (Diesel)' },
                    { id: 'MACHINERY', label: 'ਮਸ਼ੀਨਰੀ (Machinery)' },
                    { id: 'PREVIOUS_BALANCE', label: 'ਪਿਛਲਾ ਬਕਾਇਆ (Prev Bal)' },
                    { id: 'OTHER', label: 'ਹੋਰ ਖਰਚਾ (Other)' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAdvanceForm({ ...advanceForm, category: cat.id as AdvanceCategory })}
                      className={`px-2.5 py-2 rounded-xl border text-center font-bold text-xs transition-all ${
                        advanceForm.category === cat.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-102'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item / Specification Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ਵੇਰਵਾ / ਸਮਾਨ ਦਾ ਨਾਮ (Item / Expense Specifications)
                </label>
                <input
                  type="text"
                  value={advanceForm.itemDescription || ''}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, itemDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. 10 Bags Urea @ 270, 50 Litre Diesel pump slip #452"
                />
              </div>

              {/* Dates & Crop Season */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਫਸਲ / ਸੀਜ਼ਨ (Crop Season)
                  </label>
                  <select
                    value={advanceForm.cropSeason || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, cropSeason: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="">ਸਾਰੇ ਸੀਜ਼ਨ (General / All)</option>
                    <option value="WHEAT">ਹਾੜ੍ਹੀ / ਕਣਕ (Wheat)</option>
                    <option value="PADDY">ਸਾਉਣੀ / ਝੋਨਾ (Paddy)</option>
                    <option value="MAIZE">ਮੱਕੀ (Maize)</option>
                  </select>
                </div>
              </div>

              {/* Principal Amount & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="e.g. 50000"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ਭੁਗਤਾਨ ਢੰਗ (Payment Mode)
                  </label>
                  <SearchableSelect
                    id="advance-payment-mode-select"
                    value={advanceForm.paymentMode || 'CASH'}
                    onChange={(val) => setAdvanceForm({ ...advanceForm, paymentMode: val as any })}
                    options={[
                      { value: 'CASH', label: 'Cash (ਨਕਦ)' },
                      { value: 'BANK_TRANSFER', label: 'Bank Transfer (ਬੈਂਕ)' },
                      { value: 'CHEQUE', label: 'Cheque (ਚੈੱਕ)' },
                      { value: 'RTGS', label: 'RTGS' },
                      { value: 'NEFT', label: 'NEFT' }
                    ]}
                    placeholder="ਢੰਗ ਚੁਣੋ..."
                  />
                </div>
              </div>

              {/* Interest Rules Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-amber-600" />
                    ਵਿਆਜ ਦੀਆਂ ਸ਼ਰਤਾਂ (Interest Calculation Rules)
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                    <input
                      type="checkbox"
                      checked={advanceForm.isInterestFree}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, isInterestFree: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>ਬਿਨਾਂ ਵਿਆਜ (0% Interest-Free)</span>
                  </label>
                </div>

                {!advanceForm.isInterestFree && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    {/* Rate Presets & Input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          ਮਾਸਿਕ ਵਿਆਜ ਦਰ (% Rate / Month) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          required
                          value={advanceForm.monthlyInterestRate || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val) || 0;
                            setAdvanceForm({
                              ...advanceForm,
                              monthlyInterestRate: val,
                              annualInterestRate: String(num * 12)
                            });
                          }}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          placeholder="2.0"
                        />
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">ਸੌਖੇ ਬਟਨ:</span>
                          {['1.5', '2.0', '2.5', '3.0'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                const num = parseFloat(preset);
                                setAdvanceForm({
                                  ...advanceForm,
                                  monthlyInterestRate: preset,
                                  annualInterestRate: String(num * 12)
                                });
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                advanceForm.monthlyInterestRate === preset
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          ਵਿਆਜ ਦਾ ਤਰੀਕਾ (Compounding Rule)
                        </label>
                        <select
                          value={advanceForm.compounding}
                          onChange={(e) => setAdvanceForm({ ...advanceForm, compounding: e.target.value as CompoundingFrequency })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                        >
                          <option value="SIMPLE">ਸਾਧਾਰਨ ਵਿਆਜ (Simple Interest)</option>
                          <option value="HALF_YEARLY">ਛਿਮਾਹੀ ਚੱਕਰਵਰਤੀ (Half-Yearly Compounded - 6 Months)</option>
                          <option value="YEARLY">ਸਾਲਾਨਾ ਚੱਕਰਵਰਤੀ (Yearly Compounded)</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          * ਪੰਜਾਬ ਮੰਡੀ ਵਿੱਚ ਆਮ ਤੌਰ &apos;ਤੇ ਸਾਧਾਰਨ ਜਾਂ ਛਿਮਾਹੀ ਵਿਆਜ ਲਾਗੂ ਹੁੰਦਾ ਹੈ।
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guarantor / Reference Farmer Section */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-3">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  ਜ਼ਾਮਨ / ਗਵਾਹ ਕਿਸਾਨ (Guarantor / Reference Farmer)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ਮੌਜੂਦਾ ਕਿਸਾਨ ਵਿੱਚੋਂ ਚੁਣੋ (Select Registered Farmer)
                    </label>
                    <SearchableSelect
                      id="advance-guarantor-select"
                      value={advanceForm.guarantorFarmerId || ''}
                      onChange={(val) => {
                        const target = farmers.find((f) => f.id === val);
                        setAdvanceForm({
                          ...advanceForm,
                          guarantorFarmerId: val,
                          guarantorName: target ? (target.farmerNamePa ? `${target.farmerNamePa} (${target.farmerName})` : target.farmerName) : '',
                          guarantorMobile: target?.mobile || ''
                        });
                      }}
                      options={farmers
                        .filter((f) => f.id !== currentFarmer.id)
                        .map((f) => ({
                          value: f.id,
                          label: `${f.farmerNamePa} (${f.farmerName})`,
                          subLabel: `A/C: ${f.id} • ਪਿੰਡ: ${f.villagePa || f.village}`
                        }))}
                      placeholder="ਜ਼ਾਮਨ ਕਿਸਾਨ ਚੁਣੋ..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      ਜ਼ਾਮਨ ਦਾ ਨਾਮ (ਜਾਂ ਸਿੱਧਾ ਨਾਮ ਲਿਖੋ)
                    </label>
                    <input
                      type="text"
                      value={advanceForm.guarantorName || ''}
                      onChange={(e) => setAdvanceForm({ ...advanceForm, guarantorName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="e.g. ਜਗਜੀਤ ਸਿੰਘ (Jagjit Singh)"
                    />
                  </div>
                </div>
              </div>

              {/* Pronote / Signed Slip Photo Upload */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-700" />
                  ਦਸਤਖਤਸ਼ੁਦਾ ਪਰਚੀ / ਪ੍ਰੋਨੋਟ ਫੋਟੋ (Slip / Pronote Photo Upload)
                </span>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ (Choose File)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAdvanceForm({
                              ...advanceForm,
                              voucherPhotoUrl: reader.result as string,
                              voucherPhotoName: file.name
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {advanceForm.voucherPhotoUrl && (
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200">
                      <img
                        src={advanceForm.voucherPhotoUrl}
                        alt="Pronote preview"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                      />
                      <span className="text-[11px] text-slate-600 font-medium truncate max-w-xs">
                        {advanceForm.voucherPhotoName || 'Pronote_photo.jpg'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdvanceForm({ ...advanceForm, voucherPhotoUrl: '', voucherPhotoName: '' })}
                        className="p-1 text-rose-500 hover:text-rose-700 ml-1"
                        title="ਫੋਟੋ ਹਟਾਓ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Reference Number & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ਰੈਫਰੈਂਸ / ਪਰਚੀ ਨੰਬਰ (Ref No.)</label>
                  <input
                    type="text"
                    value={advanceForm.referenceNumber || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="e.g. SLIP-8941"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ਟਿੱਪਣੀ (Remarks / Note)</label>
                  <input
                    type="text"
                    value={advanceForm.remarks || ''}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="e.g. ਦਿੱਤਾ ਗਿਆ ਨਕਦ ਪੇਸ਼ਗੀ"
                  />
                </div>
              </div>

              {/* Live Interest Preview */}
              {parseFloat(advanceForm.amount) > 0 && (
                <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="font-bold text-amber-950 flex items-center justify-between">
                    <span>ਲਾਈਵ ਵਿਆਜ ਗਣਨਾ (Live Preview):</span>
                    <span className="font-mono text-amber-900">
                      {previewCalculation.months} ਮਹੀਨੇ + {previewCalculation.days} ਦਿਨ ({previewCalculation.totalDays} ਦਿਨ)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 pt-1 border-t border-amber-200">
                    <span>
                      ਮੂਲ: <strong>{formatCurrencyINR(parseFloat(advanceForm.amount) || 0)}</strong> | ਵਿਆਜ: <strong className="text-amber-800">{formatCurrencyINR(previewCalculation.interest)}</strong>
                    </span>
                    <span className="font-black text-rose-950 text-sm">
                      ਕੁੱਲ ਦੇਣਯੋਗ: {formatCurrencyINR(previewCalculation.totalPayable)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAdvanceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold shadow-sm transition-colors"
                >
                  {editingAdvance ? 'ਅਪਡੇਟ ਕਰੋ (Update)' : 'ਦਰਜ ਕਰੋ (Save Advance)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADVANCE REPAYMENT MODAL */}
      {repaymentModalAdvance && currentFarmer && (
        <AdvanceRepaymentModal
          advance={repaymentModalAdvance}
          farmer={currentFarmer}
          onClose={() => setRepaymentModalAdvance(null)}
        />
      )}

      {/* ADVANCE VOUCHER / PRONOTE MODAL */}
      {voucherModalAdvance && currentFarmer && (
        <AdvanceVoucherModal
          advance={voucherModalAdvance}
          farmer={currentFarmer}
          onClose={() => setVoucherModalAdvance(null)}
        />
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

      {/* Farmer Yearly Profit/Loss (P&L) Modal */}
      {isProfitLossModalOpen && currentFarmer && (
        <FarmerYearlyProfitLossModal
          isOpen={isProfitLossModalOpen}
          onClose={() => setIsProfitLossModalOpen(false)}
          farmer={currentFarmer}
          accountSummary={accountSummary}
        />
      )}

      {/* One-Click Mini Slip Modal */}
      {isMiniSlipOpen && currentFarmer && (
        <FarmerMiniSlipModal
          isOpen={isMiniSlipOpen}
          onClose={() => setIsMiniSlipOpen(false)}
          farmer={currentFarmer}
          summary={accountSummary}
          firmName={activeFirm?.namePa || activeFirm?.name || settings.firmNamePa || settings.firmNameEn}
          firmMobile={activeFirm?.mobile || settings.firmMobile}
        />
      )}

      {/* Bulk WhatsApp Broadcast Modal */}
      <BulkWhatsAppModal
        isOpen={isBulkWhatsAppOpen}
        onClose={() => setIsBulkWhatsAppOpen(false)}
        preSelectedFarmerId={currentFarmer?.id}
      />

      {/* Season Settlement Modal */}
      {isSettlementModalOpen && currentFarmer && accountSummary && (
        <SeasonSettlementModal
          isOpen={isSettlementModalOpen}
          onClose={() => setIsSettlementModalOpen(false)}
          farmer={currentFarmer}
          summary={accountSummary}
          settings={settings}
          activeCropSeason={
            selectedSeasonFilter === 'WHEAT'
              ? 'ਹਾੜ੍ਹੀ (Wheat) 2026'
              : selectedSeasonFilter === 'PADDY'
              ? 'ਸਾਉਣੀ (Paddy) 2026'
              : 'ਹਾੜ੍ਹੀ (Wheat) 2026'
          }
          onConfirmSettlement={handleConfirmSettlement}
        />
      )}
    </>
  );
};
