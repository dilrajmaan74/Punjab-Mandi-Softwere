import React, { useState } from 'react';
import {
  Farmer,
  FarmerAccountSummary,
  FarmerAdvanceRecord,
  FarmerPaymentRecord,
  MandiSettings
} from '../../types/mandi';
import {
  formatCurrency,
  formatCurrencyINR,
  formatKgToQulKg,
  compareDatesChronological,
  getBagsEntryLabourBreakdown
} from '../../utils/calculations';
import { openWhatsApp } from '../../utils/whatsappNotification';
import {
  exportThreePageLedgerPDF,
  exportFarmerAccountPDF,
  captureAndExportExactA4Pdf
} from '../../utils/farmerAccountPdfExport';
import {
  Scale,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Printer,
  Share2,
  Plus,
  Coins,
  TrendingUp,
  TrendingDown,
  Layers,
  FileText,
  AlertTriangle,
  Receipt,
  Eye,
  Edit,
  Trash2,
  Building2,
  Package,
  ArrowRightLeft,
  FileDown,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  BookOpen,
  Clock,
  Calculator,
  ShieldCheck,
  Check,
  Info,
  ArrowDownRight,
  ArrowUpRight,
  X
} from 'lucide-react';

interface FarmerThreePageAccountProps {
  farmer: Farmer;
  summary: FarmerAccountSummary;
  settings: MandiSettings;
  activeCropSeason: string;
  onOpenAdvanceModal: () => void;
  onOpenPaymentModal: () => void;
  onOpenSettlementModal: () => void;
  onDeleteAdvance?: (id: string) => void;
  onDeletePayment?: (id: string) => void;
  onDeleteRepayment?: (advanceId: string, repaymentId: string, amount?: number) => void;
  onEditAdvance?: (advance: FarmerAdvanceRecord) => void;
  onViewVoucher?: (advance: FarmerAdvanceRecord) => void;
  onOpenRepayment?: (advance: FarmerAdvanceRecord) => void;
}

export const FarmerThreePageAccount: React.FC<FarmerThreePageAccountProps> = ({
  farmer,
  summary,
  settings,
  activeCropSeason,
  onOpenAdvanceModal,
  onOpenPaymentModal,
  onOpenSettlementModal,
  onDeleteAdvance,
  onDeletePayment,
  onDeleteRepayment,
  onEditAdvance,
  onViewVoucher,
  onOpenRepayment
}) => {
  // 3 Distinct Pages / Tabs as requested by user:
  // page1 = ਮੰਡੀ ਫਸਲ ਤੇ ਖਰੀਦ ਖਾਤਾ (Crop Arrival, Purchase & Labour)
  // page2 = ਐਡਵਾਂਸ ਅਤੇ ਵਿਆਜ ਖਾਤਾ (Advance & Interest Ledger)
  // page3 = ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ (Final Settlement: ਪੂਰਾ ਲੈਣ-ਦੇਣ)
  const [currentPage, setCurrentPage] = useState<'page1' | 'page2' | 'page3'>('page1');

  // Page 2 State: Sub-tabs (Cards, Table, Recoveries, Passbook), Filter, Search & Explainer
  const [page2SubTab, setPage2SubTab] = useState<'cards' | 'table' | 'recoveries' | 'passbook'>('cards');
  const [page2CategoryFilter, setPage2CategoryFilter] = useState<string>('ALL');
  const [page2SearchQuery, setPage2SearchQuery] = useState<string>('');
  const [expandedAdvanceIds, setExpandedAdvanceIds] = useState<Record<string, boolean>>({});
  const [explainingAdvance, setExplainingAdvance] = useState<FarmerAdvanceRecord | null>(null);

  const toggleAdvanceExpand = (id: string) => {
    setExpandedAdvanceIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Page 1 Data: Crop Arrivals & Agency Purchases
  const arrivalEntries = summary.mandiArrivalEntries || [];
  const purchaseEntries = summary.purchaseRecords || [];

  const totalArrivalBags = summary.mandiArrivalBags || 0;
  const totalArrivalWeightKg = summary.mandiArrivalWeightKg || 0;
  const totalArrivalWeightDisplay = summary.mandiArrivalDisplay || formatKgToQulKg(totalArrivalWeightKg).displayPa;

  const totalPurchasedBags = summary.purchasedBags || 0;
  const totalPurchasedWeightKg = summary.purchasedWeightKg || 0;
  const totalPurchasedWeightDisplay = summary.purchasedWeightDisplay || formatKgToQulKg(totalPurchasedWeightKg).displayPa;
  const totalPurchasedAmount = summary.purchasedAmount || summary.totalGrossAmount || 0;

  // Remaining Bags in Mandi: Arrival Bags - Purchased Bags
  const remainingBags = Math.max(0, totalArrivalBags - totalPurchasedBags);
  const remainingWeightDisplay = summary.remainingWeightDisplay || `${remainingBags * (settings.fixedBagWeightKg || 37.5)} ਕਿਲੋ`;

  // Labour Deductions (Page 1) - Detailed Breakdown by Bag Count and Rates
  const defaultPakkiRate = settings.defaultPakkiLabourRate ?? 8;
  const defaultDoubleRate = settings.defaultPakkaDoubleLabourRate ?? 14;
  const defaultSukhiRate = settings.defaultSukhiLabourRate ?? 5;

  let pakkiBags = 0;
  let doubleBags = 0;
  let sukkiBags = 0;

  let customPakkiAmt = 0;
  let customDoubleAmt = 0;
  let customSukkiAmt = 0;

  let foundPakkiRate = defaultPakkiRate;
  let foundDoubleRate = defaultDoubleRate;
  let foundSukhiRate = defaultSukhiRate;

  arrivalEntries.forEach((e: any) => {
    const entryBags = Number(e.bags || (e.newBags + e.oldBags) || 0);
    const ld = e.labourDeductions;
    if (ld) {
      if (ld.pakkiLabourEnabled || (ld.pakkiLabourAmount && ld.pakkiLabourAmount > 0)) {
        const b = ld.pakkiBagsCount !== undefined ? Number(ld.pakkiBagsCount) : entryBags;
        pakkiBags += b;
        customPakkiAmt += Number(ld.pakkiLabourAmount) || 0;
        if (ld.pakkiLabourRate) foundPakkiRate = Number(ld.pakkiLabourRate);
      }
      if (ld.pakkaDoubleLabourEnabled || (ld.pakkaDoubleLabourAmount && ld.pakkaDoubleLabourAmount > 0)) {
        const b = ld.doubleBagsCount !== undefined ? Number(ld.doubleBagsCount) : 0;
        doubleBags += b;
        customDoubleAmt += Number(ld.pakkaDoubleLabourAmount) || 0;
        if (ld.pakkaDoubleLabourRate) foundDoubleRate = Number(ld.pakkaDoubleLabourRate);
      }
      if (ld.sukhiLabourEnabled || (ld.sukhiLabourAmount && ld.sukhiLabourAmount > 0)) {
        const b = ld.sukkiBagsCount !== undefined ? Number(ld.sukkiBagsCount) : 0;
        sukkiBags += b;
        customSukkiAmt += Number(ld.sukhiLabourAmount) || 0;
        if (ld.sukhiLabourRate) foundSukhiRate = Number(ld.sukhiLabourRate);
      }
    } else if (e.conditionBreakdown) {
      pakkiBags += Number(e.conditionBreakdown.pakkiBags ?? entryBags);
      doubleBags += Number(e.conditionBreakdown.doubleBags ?? 0);
      sukkiBags += Number(e.conditionBreakdown.sukkiBags ?? 0);
      customPakkiAmt += Number(e.conditionBreakdown.pakkiAmount ?? 0);
      customDoubleAmt += Number(e.conditionBreakdown.doubleAmount ?? 0);
      customSukkiAmt += Number(e.conditionBreakdown.sukkiAmount ?? 0);
    } else {
      // Default: All arrival bags are subject to standard Pakki Labour
      pakkiBags += entryBags;
    }
  });

  // Ensure consistency with summary values if pre-aggregated
  if (pakkiBags === 0 && (summary.totalPakkiLabour || 0) > 0) {
    pakkiBags = totalPurchasedBags || totalArrivalBags;
  }
  if (doubleBags === 0 && (summary.totalPakkaDoubleLabour || 0) > 0) {
    doubleBags = Math.round((summary.totalPakkaDoubleLabour || 0) / foundDoubleRate);
  }
  if (sukkiBags === 0 && (summary.totalSukhiLabour || 0) > 0) {
    sukkiBags = Math.round((summary.totalSukhiLabour || 0) / foundSukhiRate);
  }

  const pakkiRate = foundPakkiRate;
  const doubleRate = foundDoubleRate;
  const sukkiRate = foundSukhiRate;

  const pakkiAmount = customPakkiAmt > 0 ? customPakkiAmt : (summary.totalPakkiLabour ?? (pakkiBags * pakkiRate));
  const doubleAmount = customDoubleAmt > 0 ? customDoubleAmt : (summary.totalPakkaDoubleLabour ?? (doubleBags * doubleRate));
  const sukkiAmount = customSukkiAmt > 0 ? customSukkiAmt : (summary.totalSukhiLabour ?? (sukkiBags * sukkiRate));

  const totalLabourDeductions = summary.totalLabourDeductions ?? (pakkiAmount + doubleAmount + sukkiAmount);

  // Net Crop Proceeds (ਫਸਲ ਦੀ ਸ਼ੁੱਧ ਰਕਮ after labour - without advance)
  const netCropProceeds = Math.max(0, totalPurchasedAmount - totalLabourDeductions);

  // Page 2 Data: Advances, Interest & Payments/Recoveries
  const advances = summary.advances || [];
  const payments = summary.paymentRecords || [];
  const totalAdvancePrincipal = summary.totalAdvancePrincipal || 0;
  const totalAdvanceInterest = summary.totalAdvanceInterest || 0;
  const totalAdvancePayable = summary.totalAdvanceAmount || (totalAdvancePrincipal + totalAdvanceInterest);
  const openingBalance = summary.openingBalance || 0;
  const directPayments = summary.paidAmount || payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Unified recoveries & repayments with exact dates
  const allRecoveries = React.useMemo(() => {
    const direct = payments.map((p) => ({
      id: p.id,
      advanceId: undefined as string | undefined,
      isRepayment: false,
      date: p.date,
      typeLabel: 'ਸਿੱਧਾ ਭੁਗਤਾਨ / ਰਿਕਵਰੀ',
      mode: p.paymentMode,
      ref: p.referenceNumber || '—',
      agency: p.agency || '—',
      remarks: p.remarks || '—',
      amount: p.amount
    }));

    const reps = advances.flatMap((adv) =>
      (adv.repayments || []).map((r) => ({
        id: r.id,
        advanceId: adv.id,
        isRepayment: true,
        date: r.date,
        typeLabel: `ਕਿਸ਼ਤ ਵਾਪਸੀ (ਪੇਸ਼ਗੀ #${adv.id})`,
        mode: r.paymentMode,
        ref: r.referenceNumber || r.referenceNo || adv.id,
        agency: '—',
        remarks: r.remarks || `ਐਡਵਾਂਸ #${adv.id} ਖ਼ਿਲਾਫ਼ ਵਾਪਸ`,
        amount: r.amount
      }))
    );

    return [...direct, ...reps].sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'));
  }, [payments, advances]);

  const totalRecoveriesAmount = allRecoveries.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Net Advance Due: Total Advance Payable (Principal + Interest) minus all Recoveries/Repayments
  const netAdvancePayableRemaining = Math.max(0, totalAdvancePayable - totalRecoveriesAmount);

  // Filtered advances for Page 2
  const filteredAdvances = React.useMemo(() => {
    return advances.filter((adv) => {
      if (page2CategoryFilter !== 'ALL') {
        const cat = (adv.category || '').toUpperCase();
        const mode = (adv.paymentMode || '').toUpperCase();
        if (page2CategoryFilter === 'CASH' && cat !== 'CASH' && mode !== 'CASH') return false;
        if (page2CategoryFilter === 'FERTILIZER' && cat !== 'FERTILIZER') return false;
        if (page2CategoryFilter === 'DIESEL' && cat !== 'DIESEL') return false;
        if (page2CategoryFilter === 'BANK' && !['BANK_TRANSFER', 'RTGS', 'NEFT', 'UPI', 'GOOGLE_PAY', 'CHEQUE'].includes(mode) && !['BANK_TRANSFER', 'RTGS', 'NEFT', 'UPI', 'CHEQUE'].includes(cat)) return false;
        if (page2CategoryFilter === 'PESTICIDE' && cat !== 'PESTICIDE') return false;
      }
      if (page2SearchQuery.trim()) {
        const q = page2SearchQuery.toLowerCase().trim();
        const dateMatch = (adv.date || '').toLowerCase().includes(q);
        const amtMatch = String(adv.amount || '').includes(q);
        const remarkMatch = (adv.itemDescription || adv.remarks || '').toLowerCase().includes(q);
        const modeMatch = (adv.paymentMode || '').toLowerCase().includes(q);
        const catMatch = (adv.category || '').toLowerCase().includes(q);
        return dateMatch || amtMatch || remarkMatch || modeMatch || catMatch;
      }
      return true;
    });
  }, [advances, page2CategoryFilter, page2SearchQuery]);

  // Combined Passbook Chronological Ledger (Debit / Credit / Running Balance)
  interface PassbookEntryItem {
    id: string;
    date: string;
    type: 'OPENING' | 'ADVANCE' | 'REPAYMENT' | 'PAYMENT';
    title: string;
    badgeLabel: string;
    badgeColor: string;
    description: string;
    paymentMode?: string;
    debit: number;
    credit: number;
    interestPortion?: number;
    runningBalance: number;
    rawAdvance?: FarmerAdvanceRecord;
  }

  const combinedPassbook = React.useMemo<PassbookEntryItem[]>(() => {
    const items: Omit<PassbookEntryItem, 'runningBalance'>[] = [];

    // 1. Opening Balance
    if (openingBalance !== 0) {
      items.push({
        id: 'op-bal',
        date: 'ਸ਼ੁਰੂਆਤੀ',
        type: 'OPENING',
        title: 'ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ (Opening Balance)',
        badgeLabel: 'ਓਪਨਿੰਗ',
        badgeColor: openingBalance > 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        description: openingBalance > 0 ? 'ਪਿਛਲੇ ਸਾਲ ਦਾ ਬਕਾਇਆ (ਕਿਸਾਨ ਵੱਲ ਦੇਣਦਾਰੀ ਸੀ)' : 'ਕਿਸਾਨ ਦੇ ਪਿਛਲੇ ਜਮ੍ਹਾਂ ਪੈਸੇ',
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        interestPortion: 0
      });
    }

    // 2. Advances and their direct repayments
    advances.forEach((adv) => {
      const interest = Math.round(adv.interestAmount || 0);
      const totalDebit = Math.round(adv.amount + interest);
      const modeStr = adv.paymentMode === 'CASH' ? '💵 ਨਕਦ' :
        adv.paymentMode === 'CHEQUE' ? '🧾 ਚੈੱਕ' :
        adv.paymentMode === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ' :
        adv.paymentMode === 'GOOGLE_PAY' || adv.paymentMode === 'UPI' ? '📱 UPI' : adv.paymentMode || 'ਨਕਦ';

      items.push({
        id: `adv-${adv.id}`,
        date: adv.date,
        type: 'ADVANCE',
        title: `ਐਡਵਾਂਸ ਲਿਆ #${adv.id} (${modeStr})`,
        badgeLabel: adv.category === 'CASH' ? 'ਨਕਦ' : adv.category === 'FERTILIZER' ? 'ਖਾਦ' : adv.category === 'DIESEL' ? 'ਡੀਜ਼ਲ' : adv.category || 'ਪੇਸ਼ਗੀ',
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        description: `${adv.itemDescription || adv.remarks || 'ਪੇਸ਼ਗੀ ਰਕਮ'} • ਮੂਲ ₹${Math.round(adv.amount).toLocaleString('en-IN')}${interest > 0 ? ` + ਵਿਆਜ ₹${interest.toLocaleString('en-IN')}` : ' (0% ਵਿਆਜ)'}`,
        paymentMode: adv.paymentMode,
        debit: totalDebit,
        credit: 0,
        interestPortion: interest,
        rawAdvance: adv
      });

      (adv.repayments || []).forEach((rep, rIdx) => {
        items.push({
          id: `rep-${adv.id}-${rep.id || rIdx}`,
          date: rep.date,
          type: 'REPAYMENT',
          title: `ਕਿਸ਼ਤ ਵਾਪਸ ਕੀਤੀ (ਐਡਵਾਂਸ #${adv.id})`,
          badgeLabel: 'ਵਾਪਸੀ ਕਿਸ਼ਤ',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          description: rep.remarks ? `ਵਾਪਸੀ: ${rep.remarks}` : `ਐਡਵਾਂਸ #${adv.id} ਖ਼ਿਲਾਫ਼ ਕਿਸ਼ਤ ਵਾਪਸ ਆਈ`,
          paymentMode: rep.paymentMode,
          debit: 0,
          credit: Math.round(rep.amount),
          interestPortion: 0,
          rawAdvance: adv
        });
      });
    });

    // 3. Direct Payments / Recoveries
    payments.forEach((p) => {
      items.push({
        id: `pay-${p.id}`,
        date: p.date,
        type: 'PAYMENT',
        title: 'ਸਿੱਧੀ ਰਿਕਵਰੀ / ਭੁਗਤਾਨ ਰਸੀਦ',
        badgeLabel: 'ਸਿੱਧੀ ਵਾਪਸੀ',
        badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
        description: p.remarks || p.agency || 'ਆੜ੍ਹਤੀਏ ਨੂੰ ਪ੍ਰਾਪਤ ਹੋਈ ਰਕਮ',
        paymentMode: p.paymentMode,
        debit: 0,
        credit: Math.round(p.amount),
        interestPortion: 0
      });
    });

    // Chronological Sort
    items.sort((a, b) => {
      if (a.date === 'ਸ਼ੁਰੂਆਤੀ') return -1;
      if (b.date === 'ਸ਼ੁਰੂਆਤੀ') return 1;
      return compareDatesChronological(a.date, b.date, 'ASC');
    });

    let running = 0;
    return items.map((item) => {
      running = running + item.debit - item.credit;
      return {
        ...item,
        runningBalance: running
      };
    });
  }, [advances, payments, openingBalance]);

  // Plain Gurmukhi Story generator for each advance
  const getEntryPlainPunjabiStory = (adv: FarmerAdvanceRecord) => {
    const amt = Math.round(adv.amount).toLocaleString('en-IN');
    const interest = Math.round(adv.interestAmount || 0).toLocaleString('en-IN');
    const totalRepaid = (adv.repayments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalPayable = adv.totalPayableWithInterest || (adv.amount + (adv.interestAmount || 0));
    const netDue = Math.max(0, Math.round(totalPayable - totalRepaid)).toLocaleString('en-IN');

    const modeText = adv.paymentMode === 'CASH' ? 'ਨਕਦ' :
      adv.paymentMode === 'BANK_TRANSFER' ? 'ਬੈਂਕ ਖਾਤੇ ਰਾਹੀਂ' :
      adv.paymentMode === 'CHEQUE' ? `ਚੈੱਕ #${adv.chequeNumber || ''} ਰਾਹੀਂ` :
      adv.paymentMode === 'GOOGLE_PAY' || adv.paymentMode === 'UPI' ? 'Google Pay / UPI ਰਾਹੀਂ' : 'ਰਾਹੀਂ';

    let interestPart = '';
    if (adv.isInterestFree) {
      interestPart = 'ਇਹ ਪੈਸੇ ਬਿਨਾਂ ਵਿਆਜ (0% Interest Free) ਦਿੱਤੇ ਗਏ ਹਨ।';
    } else {
      const days = adv.totalDays ? `${adv.totalDays} ਦਿਨਾਂ ਦਾ ` : '';
      const rate = adv.monthlyInterestRate ?? 2;
      interestPart = `${days}${rate}% ਮਹੀਨਾਵਾਰ ਹਿਸਾਬ ਨਾਲ +₹${interest} ਵਿਆਜ ਬਣਿਆ।`;
    }

    let repayPart = '';
    if (totalRepaid > 0) {
      repayPart = ` ਜਿਸ ਵਿੱਚੋਂ ਕਿਸਾਨ ਨੇ ₹${totalRepaid.toLocaleString('en-IN')} ਵਾਪਸ ਕਰ ਦਿੱਤੇ ਹਨ।`;
    }

    return `ਮਿਤੀ ${adv.date} ਨੂੰ ${modeText} ₹${amt} ਲਏ। ${interestPart}${repayPart} ਹੁਣ ਇਸ ਐਂਟਰੀ ਦਾ ਬਾਕੀ ਕੁੱਲ ₹${netDue} ਦੇਣਾ ਬਣਦਾ ਹੈ।`;
  };

  // Page 3 Data: Final Settlement Decision
  // Net Crop Proceeds (Cr) - Advances (Dr) - Direct Payments (Dr) + Opening Balance (+/-)
  const finalBalance = summary.finalBalance ?? (netCropProceeds - totalAdvancePayable - directPayments + openingBalance);
  const isPayableToFarmer = finalBalance >= 0;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // PDF Export States
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportStatus, setPdfExportStatus] = useState<string | null>(null);

  // PDF Export Handler
  const handleExportPdf = async (mode: 'all' | 'page1' | 'page2' | 'page3' | 'reference') => {
    setIsExportingPdf(true);
    setPdfExportStatus(
      mode === 'all'
        ? 'ਪੂਰਾ 3-ਪੇਜ ਬਹੀ-ਖਾਤਾ PDF ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...'
        : mode === 'reference'
        ? 'ਰੈਫਰੈਂਸ ਸਟੇਟਮੈਂਟ PDF ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ...'
        : `ਪੇਜ ${mode.replace('page', '')} ਦਾ PDF ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ...`
    );

    try {
      if (mode === 'reference') {
        const captured = await captureAndExportExactA4Pdf(summary, 'Reference');
        if (!captured) {
          await exportFarmerAccountPDF(summary, settings);
        }
      } else {
        await exportThreePageLedgerPDF({
          account: summary,
          settings,
          activeCropSeason,
          mode: mode === 'all' ? 'all' : mode
        });
      }
      setIsPdfModalOpen(false);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExportingPdf(false);
      setPdfExportStatus(null);
    }
  };

  // WhatsApp share of current page
  const handleShareWhatsApp = () => {
    const farmerName = farmer.farmerNamePa || farmer.farmerName;
    const firmTitle = settings.firmNamePa || settings.firmNameEn || 'ਮੰਡੀ ਆੜ੍ਹਤ';

    if (currentPage === 'page1') {
      const msg = [
        `🌾 *${firmTitle}*`,
        `📄 *ਪੇਜ 1: ਮੰਡੀ ਫਸਲ ਤੇ ਖਰੀਦ ਖਾਤਾ*`,
        `👤 *ਕਿਸਾਨ:* ${farmerName} | 🆔 *ਖਾਤਾ ਨੰ:* ${farmer.id}`,
        `🏡 *ਪਿੰਡ:* ${farmer.villagePa || farmer.village}`,
        `📅 *ਸੀਜ਼ਨ:* ${activeCropSeason}`,
        `---------------------------------`,
        `📥 *ਕੁੱਲ ਮੰਡੀ ਆਈਆਂ ਬੋਰੀਆਂ:* ${totalArrivalBags} ਬੋਰੀਆਂ (${totalArrivalWeightDisplay})`,
        `🛒 *ਏਜੰਸੀਆਂ ਵੱਲੋਂ ਤੁਲੀਆਂ ਬੋਰੀਆਂ:* ${totalPurchasedBags} ਬੋਰੀਆਂ`,
        `📦 *ਮੰਡੀ 'ਚ ਬਾਕੀ ਪਈਆਂ ਬੋਰੀਆਂ:* ${remainingBags} ਬੋਰੀਆਂ`,
        `---------------------------------`,
        `💰 *ਫਸਲ ਦੀ ਕੁੱਲ ਰਕਮ:* ₹${Math.round(totalPurchasedAmount).toLocaleString('en-IN')}`,
        `✂️ *ਮਨਫੀ ਲੇਬਰ ਕਟੌਤੀਆਂ (-₹${Math.round(totalLabourDeductions).toLocaleString('en-IN')}):*`,
        `   • ਪੱਕੀ ਲੇਬਰ: ${pakkiBags} ਬੋਰੀਆਂ @ ₹${pakkiRate}/ਬੋਰੀ = -₹${Math.round(pakkiAmount).toLocaleString('en-IN')}`,
        doubleBags > 0 ? `   • ਪੱਕਾ ਡਬਲ: ${doubleBags} ਬੋਰੀਆਂ @ ₹${doubleRate}/ਬੋਰੀ = -₹${Math.round(doubleAmount).toLocaleString('en-IN')}` : '',
        sukkiBags > 0 ? `   • ਸੁੱਕੀ/ਝਾਰਾਈ: ${sukkiBags} ਬੋਰੀਆਂ @ ₹${sukkiRate}/ਬੋਰੀ = -₹${Math.round(sukkiAmount).toLocaleString('en-IN')}` : '',
        `✨ *ਫਸਲ ਦੀ ਸ਼ੁੱਧ ਰਕਮ (Net Crop Proceeds):* ₹${Math.round(netCropProceeds).toLocaleString('en-IN')}`,
        `---------------------------------`,
        `_ਨੋਟ: ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ਦਾ ਹਿਸਾਬ ਪੇਜ 2 'ਤੇ ਵੱਖਰਾ ਹੈ।_`
      ].join('\n');
      openWhatsApp(farmer.mobile, msg);
    } else if (currentPage === 'page2') {
      const msg = [
        `🌾 *${firmTitle}*`,
        `💰 *ਪੇਜ 2: ਐਡਵਾਂਸ ਅਤੇ ਵਿਆਜ ਖਾਤਾ*`,
        `👤 *ਕਿਸਾਨ:* ${farmerName} | 🆔 *ਖਾਤਾ ਨੰ:* ${farmer.id}`,
        `📅 *ਮਿਤੀ:* ${new Date().toLocaleDateString('en-GB')}`,
        `---------------------------------`,
        openingBalance !== 0 ? `• ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ: ₹${Math.round(openingBalance).toLocaleString('en-IN')}` : '',
        `• ਕੁੱਲ ਲਿਆ ਐਡਵਾਂਸ (ਮੂਲ): ₹${Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}`,
        `• ਕੁੱਲ ਬਣਿਆ ਵਿਆਜ: ₹${Math.round(totalAdvanceInterest).toLocaleString('en-IN')}`,
        directPayments > 0 ? `• ਮਨਫੀ ਸਿੱਧੀ ਅਦਾਇਗੀ: -₹${Math.round(directPayments).toLocaleString('en-IN')}` : '',
        `---------------------------------`,
        `⚖️ *ਕੁੱਲ ਦੇਣਦਾਰੀ (Advance + Interest):* ₹${Math.round(totalAdvancePayable).toLocaleString('en-IN')}`,
        `---------------------------------`,
        `_ਐਂਟਰੀਆਂ ਦੀ ਗਿਣਤੀ: ${advances.length}_`
      ].filter(Boolean).join('\n');
      openWhatsApp(farmer.mobile, msg);
    } else {
      const balanceTxt = isPayableToFarmer
        ? `★ ਆੜ੍ਹਤੀ ਵੱਲੋਂ ਕਿਸਾਨ ਨੂੰ ਅੰਤਿਮ ਦੇਣਯੋਗ: ₹${Math.abs(Math.round(finalBalance)).toLocaleString('en-IN')}`
        : `★ ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ: ₹${Math.abs(Math.round(finalBalance)).toLocaleString('en-IN')}`;

      const msg = [
        `🌾 *${firmTitle}*`,
        `📜 *ਪੇਜ 3: ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ (Final Settlement)*`,
        `👤 *ਕਿਸਾਨ:* ${farmerName} | 🆔 *ਖਾਤਾ ਨੰ:* ${farmer.id}`,
        `🏡 *ਪਿੰਡ:* ${farmer.villagePa || farmer.village}`,
        `📅 *ਸੀਜ਼ਨ:* ${activeCropSeason}`,
        `---------------------------------`,
        `1. ਫਸਲ ਦੀ ਸ਼ੁੱਧ ਰਕਮ (ਪੇਜ 1 ਤੋਂ): +₹${Math.round(netCropProceeds).toLocaleString('en-IN')}`,
        `2. ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ (ਪੇਜ 2 ਤੋਂ): -₹${Math.round(totalAdvancePayable).toLocaleString('en-IN')}`,
        directPayments > 0 ? `3. ਸਿੱਧੀ ਅਦਾਇਗੀ: -₹${Math.round(directPayments).toLocaleString('en-IN')}` : '',
        openingBalance !== 0 ? `4. ਪਿਛਲਾ ਬਕਾਇਆ: ₹${Math.round(openingBalance).toLocaleString('en-IN')}` : '',
        `---------------------------------`,
        `⚖️ *ਆਖ਼ਰੀ ਫੈਸਲਾ:*`,
        `${balanceTxt}`,
        `---------------------------------`,
        `_ਦੋਵਾਂ ਧਿਰਾਂ ਦੀ ਆਪਸੀ ਸਹਿਮਤੀ ਨਾਲ ਖਾਤਾ ਚੈੱਕ ਕੀਤਾ ਗਿਆ।_`
      ].filter(Boolean).join('\n');
      openWhatsApp(farmer.mobile, msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 3-PAGE NAVIGATION BAR (Tabs) */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm p-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto flex-1">
            {/* Page 1 Tab */}
            <button
              type="button"
              onClick={() => setCurrentPage('page1')}
              className={`px-3 sm:px-4 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                currentPage === 'page1'
                  ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500 scale-[1.02]'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}
            >
              <Scale className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="font-black leading-tight">ਪੇਜ 1: ਮੰਡੀ ਫਸਲ ਖਾਤਾ</div>
                <div className="text-[10px] opacity-80 hidden sm:block">ਆਮਦ, ਖਰੀਦ ਤੇ ਲੇਬਰ</div>
              </div>
            </button>

            {/* Page 2 Tab */}
            <button
              type="button"
              onClick={() => setCurrentPage('page2')}
              className={`px-3 sm:px-4 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                currentPage === 'page2'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500 scale-[1.02]'
                  : 'bg-amber-50/70 hover:bg-amber-100 text-amber-950 border border-amber-200'
              }`}
            >
              <Coins className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="font-black leading-tight">ਪੇਜ 2: ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ</div>
                <div className="text-[10px] opacity-80 hidden sm:block">ਵੱਖਰਾ ਲੈਣ-ਦੇਣ ਖਾਤਾ</div>
              </div>
            </button>

            {/* Page 3 Tab */}
            <button
              type="button"
              onClick={() => setCurrentPage('page3')}
              className={`px-3 sm:px-4 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                currentPage === 'page3'
                  ? 'bg-indigo-700 text-white shadow-md ring-2 ring-indigo-500 scale-[1.02]'
                  : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 border border-indigo-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div className="font-black leading-tight">ਪੇਜ 3: ਅੰਤਿਮ ਨਿਬੇੜਾ</div>
                <div className="text-[10px] opacity-80 hidden sm:block">ਪੂਰਾ ਲੈਣ-ਦੇਣ ਤੇ ਫੈਸਲਾ</div>
              </div>
            </button>
          </div>

          {/* Quick Actions (Print, PDF Export & WhatsApp) */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 disabled:opacity-50"
              title="3-ਪੇਜ ਬਹੀ-ਖਾਤਾ PDF ਡਾਊਨਲੋਡ ਕਰੋ"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-rose-200" />
              )}
              <span>{isExportingPdf ? 'PDF ਬਣ ਰਿਹਾ ਹੈ...' : 'PDF Export'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="ਇਸ ਪੇਜ ਦਾ ਪ੍ਰਿੰਟ ਕੱਢੋ"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>ਪ੍ਰਿੰਟ (Print)</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="ਕਿਸਾਨ ਦੇ ਮੋਬਾਈਲ 'ਤੇ WhatsApp ਸੁਨੇਹਾ ਭੇਜੋ"
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* PAGE 1: ਮੰਡੀ ਫਸਲ ਤੇ ਖਰੀਦ ਖਾਤਾ (Mandi Arrival & Agency Purchase) */}
      {/* ==================================================================== */}
      {currentPage === 'page1' && (
        <div className="space-y-6">
          {/* Header Notice Banner */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-700 text-white rounded-xl shadow-xs">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white">
                    ਪੇਜ 1 (Page 1)
                  </span>
                  <span className="text-emerald-900 font-bold text-xs sm:text-sm">
                    ਮੰਡੀ ਫਸਲ, ਤੁਲਾਈ, ਖਰੀਦ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਖਾਤਾ
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  ★ ਨੋਟ: ਇਸ ਪੇਜ 'ਤੇ ਸਿਰਫ਼ ਫਸਲ ਦੀ ਤੁਲਾਈ, ਏਜੰਸੀ ਖਰੀਦ ਅਤੇ ਲੇਬਰ ਦਾ ਹਿਸਾਬ ਹੈ। ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ਇਸ ਵਿੱਚ ਸ਼ਾਮਲ ਨਹੀਂ ਹੈ।
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 bg-white/80 px-3.5 py-1.5 rounded-xl border border-emerald-200">
              <div className="text-[10px] text-slate-500 font-medium">ਸੀਜ਼ਨ (Season)</div>
              <div className="text-xs font-black text-emerald-900">{activeCropSeason}</div>
            </div>
          </div>

          {/* TWO COLUMNS: LEFT = ARRIVAL, RIGHT = PURCHASE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ------------------------------------------------------------ */}
            {/* LEFT COLUMN: ਕਿਸਾਨ ਮੰਡੀ ਆਮਦ (Farmer Arrival / ਤੁਲਾਈ) */}
            {/* ------------------------------------------------------------ */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-300" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      ਖੱਬਾ ਪਾਸਾ: ਕਿਸਾਨ ਮੰਡੀ ਆਮਦ (Farmer Arrival)
                    </h3>
                    <p className="text-[10px] text-emerald-200">ਕਿਸਾਨ ਕਿਹੜੀ ਤਾਰੀਖ਼ ਨੂੰ ਕਿੰਨੀਆਂ ਬੋਰੀਆਂ ਲਿਆਇਆ</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-mono font-bold">
                  {arrivalEntries.length} ਐਂਟਰੀਆਂ
                </span>
              </div>

              {/* Table of Arrivals */}
              <div className="p-3 overflow-x-auto flex-1">
                {arrivalEntries.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Scale className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">ਇਸ ਸੀਜ਼ਨ ਵਿੱਚ ਮੰਡੀ ਆਮਦ ਦੀ ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।</p>
                    <p className="text-[11px] text-slate-400 mt-1">ਮੰਡੀ ਤੁਲਾਈ ਐਂਟਰੀ ਕਰਨ 'ਤੇ ਇੱਥੇ ਨਜ਼ਰ ਆਵੇਗੀ।</p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2">ਮਿਤੀ (Date)</th>
                        <th className="py-2.5 px-2 text-center">ਬੋਰੀਆਂ</th>
                        <th className="py-2.5 px-2 text-center">ਪੱਕੀ ਲੇਬਰ</th>
                        <th className="py-2.5 px-2 text-center">ਡਬਲ ਪੱਖਾ</th>
                        <th className="py-2.5 px-2 text-center">ਸੁੱਕ ਲੱਗੀ</th>
                        <th className="py-2.5 px-2 text-right">ਕੁੱਲ ਵਜ਼ਨ</th>
                        <th className="py-2.5 px-2 text-right">ਰੇਟ</th>
                        <th className="py-2.5 px-2 text-right">ਰਕਮ (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {arrivalEntries.map((entry, idx) => {
                        const bagsCount = entry.bags || (entry.newBags + entry.oldBags) || 0;
                        const weightDisplay = entry.grandTotalDisplay || entry.totalBagsWeightDisplay || `${(entry.grandTotalKg || 0) / 100} Qtl`;
                        const brk = getBagsEntryLabourBreakdown(
                          entry,
                          settings.defaultPakkiLabourRate ?? 7,
                          settings.defaultPakkaDoubleLabourRate ?? 14,
                          settings.defaultSukhiLabourRate ?? 5
                        );
                        return (
                          <tr key={entry.id || idx} className="hover:bg-emerald-50/40 transition">
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {entry.date}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="font-mono font-black text-emerald-800 text-xs px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                                {bagsCount}
                              </span>
                              {(entry.newBags > 0 || entry.oldBags > 0) && (
                                <div className="text-[9px] text-slate-400 mt-0.5">
                                  {entry.newBags > 0 ? `ਨ:${entry.newBags} ` : ''}
                                  {entry.oldBags > 0 ? `ਪੁ:${entry.oldBags}` : ''}
                                </div>
                              )}
                            </td>
                            {/* Pakki Bags */}
                            <td className="py-2.5 px-2 text-center">
                              {brk.pakkiBags > 0 ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                                  {brk.pakkiBags} ਬੋ.
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            {/* Double Pakha Bags */}
                            <td className="py-2.5 px-2 text-center">
                              {brk.doubleBags > 0 ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-950 border border-amber-300">
                                  💨 {brk.doubleBags} ਬੋ.
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">ਬਿਨਾਂ ਪੱਖਾ</span>
                              )}
                            </td>
                            {/* Sukh Bags */}
                            <td className="py-2.5 px-2 text-center">
                              {brk.sukkiBags > 0 ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-950 border border-teal-300">
                                  ☀️ {brk.sukkiBags} ਬੋ.
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                              {weightDisplay}
                              {entry.totaKg > 0 && (
                                <span className="block text-[10px] text-amber-700 font-bold">
                                  + ਤੋੜਾ: {entry.totaKg} Kg
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                              ₹{entry.ratePerQtl || settings.fixedRatePerQtl || 2461}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">
                              ₹{Math.round(entry.totalAmount || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Left Sub-Total Box */}
              <div className="bg-emerald-50 p-3.5 border-t-2 border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-emerald-900 font-bold block">ਕੁੱਲ ਮੰਡੀ ਆਮਦ (Total Arrival):</span>
                  <span className="text-[11px] text-emerald-700 font-medium">{totalArrivalWeightDisplay}</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-900 font-mono block">
                    {totalArrivalBags} ਬੋਰੀਆਂ
                  </span>
                  <span className="text-[11px] text-emerald-800 font-mono font-bold">
                    ਕੁੱਲ ਵਜ਼ਨ: {Math.round(totalArrivalWeightKg).toLocaleString('en-IN')} Kg
                  </span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* RIGHT COLUMN: ਏਜੰਸੀ ਖਰੀਦ (Agency Purchase / ਬੋਲੀ) */}
            {/* ------------------------------------------------------------ */}
            <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-300" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      ਸੱਜਾ ਪਾਸਾ: ਏਜੰਸੀ ਖਰੀਦ (Agency Purchase)
                    </h3>
                    <p className="text-[10px] text-blue-200">ਕਿਸਾਨ ਦੇ ਖਾਤੇ 'ਚ ਕਿਹੜੀ ਏਜੰਸੀ ਨੇ ਕਿੰਨਾ ਮਾਲ ਖਰੀਦਿਆ</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-mono font-bold">
                  {purchaseEntries.length} ਖਰੀਦਾਂ
                </span>
              </div>

              {/* Table of Agency Purchases */}
              <div className="p-3 overflow-x-auto flex-1">
                {purchaseEntries.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">ਇਸ ਕਿਸਾਨ ਦੇ ਨਾਮ ਅਜੇ ਕੋਈ ਏਜੰਸੀ ਖਰੀਦ ਦਰਜ ਨਹੀਂ ਹੈ।</p>
                    <p className="text-[11px] text-slate-400 mt-1">ਡੇਲੀ ਪਰਚੇਜ਼ / ਏਜੰਸੀ ਬੋਲੀ ਦਰਜ ਕਰਨ 'ਤੇ ਇੱਥੇ ਨਜ਼ਰ ਆਵੇਗੀ।</p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2">ਮਿਤੀ (Date)</th>
                        <th className="py-2.5 px-2">ਏਜੰਸੀ (Agency)</th>
                        <th className="py-2.5 px-2 text-center">ਬੋਰੀਆਂ (Bags)</th>
                        <th className="py-2.5 px-2 text-right">ਵਜ਼ਨ (Weight)</th>
                        <th className="py-2.5 px-2 text-right">ਰਕਮ (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {purchaseEntries.map((pur, idx) => (
                        <tr key={pur.id || idx} className="hover:bg-blue-50/40 transition">
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                            {pur.date}
                          </td>
                          <td className="py-2.5 px-2 font-black text-blue-900">
                            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                              {pur.agency}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="font-mono font-black text-blue-800 text-xs px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                              {pur.bags}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                            {pur.totalWeightDisplay || `${pur.weightQtl || 0} Qtl ${pur.weightKg || 0} Kg`}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-700">
                            ₹{Math.round(pur.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Right Sub-Total Box */}
              <div className="bg-blue-50 p-3.5 border-t-2 border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-blue-900 font-bold block">ਕੁੱਲ ਏਜੰਸੀ ਖਰੀਦ (Total Purchased):</span>
                  <span className="text-[11px] text-blue-700 font-medium">{totalPurchasedWeightDisplay}</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-blue-900 font-mono block">
                    {totalPurchasedBags} ਬੋਰੀਆਂ
                  </span>
                  <span className="text-[11px] text-blue-800 font-mono font-bold">
                    ਕੁੱਲ ਰਕਮ: ₹{Math.round(totalPurchasedAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BOTTOM SECTION: BAGS RECONCILIATION & LABOUR DEDUCTION */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wider">
                  ਥੱਲੇ ਦਾ ਹਿਸਾਬ-ਕਿਤਾਬ: ਬੋਰੀਆਂ ਦਾ ਬਕਾਇਆ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ
                </h3>
              </div>
              <span className="text-xs text-slate-300 font-mono">
                (Total Arrival - Purchase Bags, Less Labour Deductions)
              </span>
            </div>

            <div className="p-5 space-y-5">
              {/* Step 1: Bags Reconciliation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Total Arrival Bags */}
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                      1. ਕੁੱਲ ਆਈਆਂ ਬੋਰੀਆਂ (Arrival)
                    </span>
                    <span className="text-xs text-slate-500">ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦਾ ਮਾਲ</span>
                  </div>
                  <strong className="text-xl font-black text-emerald-900 font-mono">
                    {totalArrivalBags}
                  </strong>
                </div>

                {/* Purchased Bags */}
                <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-800 uppercase block">
                      2. ਮਨਫੀ (-) ਖਰੀਦੀਆਂ ਬੋਰੀਆਂ
                    </span>
                    <span className="text-xs text-slate-500">ਏਜੰਸੀਆਂ ਵੱਲੋਂ ਤੁਲੀਆਂ</span>
                  </div>
                  <strong className="text-xl font-black text-blue-900 font-mono">
                    - {totalPurchasedBags}
                  </strong>
                </div>

                {/* Remaining / Unsold Bags */}
                <div className={`border-2 rounded-xl p-3.5 flex items-center justify-between ${
                  remainingBags === 0
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                    : 'bg-amber-100 border-amber-400 text-amber-950 animate-pulse'
                }`}>
                  <div>
                    <span className="text-[11px] font-black uppercase block">
                      = ਬਾਕੀ ਮੰਡੀ 'ਚ ਪਈਆਂ ਬੋਰੀਆਂ
                    </span>
                    <span className="text-[10px] font-bold">
                      {remainingBags === 0 ? '✓ ਸਾਰਾ ਮਾਲ ਤੁਲ ਚੁੱਕਾ ਹੈ' : `ਅਜੇ ਤੁਲਣੀਆਂ ਬਾਕੀ ਹਨ (${remainingWeightDisplay})`}
                    </span>
                  </div>
                  <strong className="text-2xl font-black font-mono">
                    {remainingBags}
                  </strong>
                </div>
              </div>

              {/* Step 2: Crop Proceeds & Labour Deduction Math */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
                {/* 2.1 Gross Crop Amount */}
                <div className="p-3.5 bg-slate-50 flex items-center justify-between">
                  <div>
                    <strong className="text-xs text-slate-800 font-bold block">
                      ਫਸਲ ਦੀ ਕੁੱਲ ਰਕਮ (Gross Crop Proceeds):
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      ਤੁਲੀਆਂ {totalPurchasedBags} ਬੋਰੀਆਂ ਦੀ ਬਣੀ ਕੁੱਲ ਰਕਮ
                    </span>
                  </div>
                  <strong className="text-base font-black text-emerald-800 font-mono">
                    + ₹{Math.round(totalPurchasedAmount).toLocaleString('en-IN')}
                  </strong>
                </div>

                {/* 2.2 Labour Deductions Breakdown */}
                <div className="p-3.5 bg-white space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-rose-800">
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                      <span>ਮਨਫੀ (-) ਲੇਬਰ ਅਤੇ ਮਜ਼ਦੂਰੀ ਖਰਚੇ (Labour Deductions):</span>
                    </span>
                    <span className="font-mono text-rose-700 font-black text-sm">
                      - ₹{Math.round(totalLabourDeductions).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* 1. Pakki Labour */}
                    <div className="bg-rose-50/70 p-3 rounded-xl border-2 border-rose-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-xs text-rose-950 block">1. ਪੱਕੀ ਲੇਬਰ (Pakki Labour)</span>
                          <span className="text-[11px] text-rose-800 font-medium">
                            {pakkiBags} ਬੋਰੀਆਂ @ ₹{pakkiRate}/ਬੋਰੀ
                          </span>
                        </div>
                        <strong className="font-mono text-sm text-rose-800 font-black">
                          -₹{Math.round(pakkiAmount).toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-rose-200 flex justify-between text-[10px] text-slate-600">
                        <span>ਕੁੱਲ ਬੋਰੀਆਂ: <strong className="text-slate-900 font-mono font-bold">{pakkiBags}</strong></span>
                        <span>ਰੇਟ: <strong className="text-slate-900 font-mono font-bold">₹{pakkiRate}/ਬੋਰੀ</strong></span>
                      </div>
                    </div>

                    {/* 2. Pakka Double */}
                    <div className="bg-amber-50/70 p-3 rounded-xl border-2 border-amber-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-xs text-amber-950 block">2. ਪੱਕਾ ਡਬਲ (Double Labour)</span>
                          <span className="text-[11px] text-amber-800 font-medium">
                            {doubleBags} ਬੋਰੀਆਂ @ ₹{doubleRate}/ਬੋਰੀ
                          </span>
                        </div>
                        <strong className="font-mono text-sm text-amber-900 font-black">
                          -₹{Math.round(doubleAmount).toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-amber-200 flex justify-between text-[10px] text-slate-600">
                        <span>ਕੁੱਲ ਬੋਰੀਆਂ: <strong className="text-slate-900 font-mono font-bold">{doubleBags}</strong></span>
                        <span>ਰੇਟ: <strong className="text-slate-900 font-mono font-bold">₹{doubleRate}/ਬੋਰੀ</strong></span>
                      </div>
                    </div>

                    {/* 3. Sukhi / Jharai */}
                    <div className="bg-orange-50/70 p-3 rounded-xl border-2 border-orange-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-xs text-orange-950 block">3. ਸੁੱਕੀ / ਝਾਰਾਈ (Sukhi Labour)</span>
                          <span className="text-[11px] text-orange-800 font-medium">
                            {sukkiBags} ਬੋਰੀਆਂ @ ₹{sukkiRate}/ਬੋਰੀ
                          </span>
                        </div>
                        <strong className="font-mono text-sm text-orange-900 font-black">
                          -₹{Math.round(sukkiAmount).toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-orange-200 flex justify-between text-[10px] text-slate-600">
                        <span>ਕੁੱਲ ਬੋਰੀਆਂ: <strong className="text-slate-900 font-mono font-bold">{sukkiBags}</strong></span>
                        <span>ਰੇਟ: <strong className="text-slate-900 font-mono font-bold">₹{sukkiRate}/ਬੋਰੀ</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2.3 Net Crop Proceeds (Big Green Banner) */}
                <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                      <strong className="text-sm font-black uppercase tracking-wider">
                        ਫਸਲ ਦੀ ਸ਼ੁੱਧ ਰਕਮ (Net Crop Proceeds)
                      </strong>
                    </div>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      ਕੁੱਲ ਰਕਮ ਵਿੱਚੋਂ ਲੇਬਰ ਕੱਟਣ ਤੋਂ ਬਾਅਦ ਕਿਸਾਨ ਦੇ ਬਣਦੇ ਸ਼ੁੱਧ ਪੈਸੇ
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black font-mono text-amber-200 block drop-shadow-xs">
                      ₹{Math.round(netCropProceeds).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-emerald-100">
                      (ਕੋਈ ਐਡਵਾਂਸ/ਵਿਆਜ ਕਟੌਤੀ ਇਸ ਵਿੱਚ ਸ਼ਾਮਲ ਨਹੀਂ ਹੈ)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation Button: Go to Page 2 & PDF Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportPdf('page1')}
                    disabled={isExportingPdf}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 disabled:opacity-50"
                    title="ਸਿਰਫ਼ ਇਸ ਪੇਜ 1 ਦਾ PDF ਡਾਊਨਲੋਡ ਕਰੋ"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-200" />
                    <span>ਪੇਜ 1 PDF ਡਾਊਨਲੋਡ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPdf('all')}
                    disabled={isExportingPdf}
                    className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 disabled:opacity-50"
                    title="ਸਾਰੇ 3 ਪੇਜਾਂ ਦਾ ਇਕੱਠਾ PDF ਡਾਊਨਲੋਡ ਕਰੋ"
                  >
                    <Layers className="w-3.5 h-3.5 text-rose-200" />
                    <span>ਪੂਰਾ 3-ਪੇਜ PDF</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage('page2')}
                  className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
                >
                  <span>ਅੱਗੇ ਪੇਜ 2 (ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ਖਾਤਾ) 'ਤੇ ਜਾਓ</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PAGE 2: ਐਡਵਾਂਸ ਅਤੇ ਵਿਆਜ ਖਾਤਾ (Advance & Interest Ledger) */}
      {/* ==================================================================== */}
      {currentPage === 'page2' && (
        <div className="space-y-6">
          {/* Header Notice Banner */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl shadow-inner shrink-0">
                <Coins className="w-7 h-7 text-amber-200" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white text-amber-900 shadow-xs">
                    ਪੇਜ 2 (Page 2)
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    ਕਿਸਾਨ ਐਡਵਾਂਸ, ਉਧਾਰ ਅਤੇ ਵਿਆਜ ਖਾਤਾ (Advance & Interest Ledger)
                  </h2>
                </div>
                <p className="text-xs text-amber-100 font-medium mt-1">
                  ★ ਨੋਟ: ਇਹ ਪੈਸਿਆਂ ਦੇ ਲੈਣ-ਦੇਣ, ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਦਾ ਵੱਖਰਾ ਖਾਤਾ ਹੈ — ਫਸਲ ਦੀ ਤੁਲਾਈ ਤੋਂ ਬਿਲਕੁਲ ਵੱਖ ਰੱਖਿਆ ਗਿਆ ਹੈ।
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenAdvanceModal}
                className="px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-950 rounded-xl text-xs font-black flex items-center gap-2 shadow-md cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4 text-amber-700" />
                <span>+ ਨਵਾਂ ਐਡਵਾਂਸ ਦਰਜ ਕਰੋ</span>
              </button>
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md cursor-pointer transition active:scale-95"
              >
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>+ ਰਿਕਵਰੀ / ਵਾਪਸੀ ਦਰਜ ਕਰੋ</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Cards (5 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Opening Balance */}
            <div className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs transition">
              <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                1. ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ
              </span>
              <strong className={`text-base sm:text-xl font-black font-mono block mt-1 ${
                openingBalance > 0 ? 'text-rose-700' : openingBalance < 0 ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                {openingBalance !== 0 ? `₹${Math.abs(Math.round(openingBalance)).toLocaleString('en-IN')}` : '₹0'}
              </strong>
              <span className="text-[10.5px] font-medium text-slate-500 block mt-0.5">
                {openingBalance > 0 ? '⚠️ ਕਿਸਾਨ ਵੱਲ ਪਿਛਲਾ ਬਕਾਇਆ ਸੀ' : openingBalance < 0 ? '✅ ਕਿਸਾਨ ਦੇ ਪਿਛਲੇ ਜਮ੍ਹਾਂ ਸਨ' : 'ਕੋਈ ਪਿਛਲਾ ਬਕਾਇਆ ਨਹੀਂ'}
              </span>
            </div>

            {/* 2. Total Principal */}
            <div className="bg-white border-2 border-amber-200 hover:border-amber-300 rounded-2xl p-4 shadow-xs transition">
              <span className="text-[11px] font-bold text-amber-800 uppercase block tracking-wider">
                2. ਕੁੱਲ ਦਿੱਤਾ ਐਡਵਾਂਸ (ਮੂਲ)
              </span>
              <strong className="text-base sm:text-xl font-black text-amber-950 font-mono block mt-1">
                ₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10.5px] font-semibold text-amber-700 block mt-0.5">
                ਕੁੱਲ {advances.length} ਐਡਵਾਂਸ ਐਂਟਰੀਆਂ
              </span>
            </div>

            {/* 3. Total Interest */}
            <div className="bg-white border-2 border-rose-200 hover:border-rose-300 rounded-2xl p-4 shadow-xs transition">
              <span className="text-[11px] font-bold text-rose-800 uppercase block tracking-wider">
                3. ਕੁੱਲ ਬਣਿਆ ਵਿਆਜ (+)
              </span>
              <strong className="text-base sm:text-xl font-black text-rose-700 font-mono block mt-1">
                +₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10.5px] font-medium text-rose-600 block mt-0.5">
                ਦਿਨਾਂ ਅਤੇ ਮਹੀਨਿਆਂ ਦਾ ਵਿਆਜ
              </span>
            </div>

            {/* 4. Total Recoveries / Repaid */}
            <div className="bg-white border-2 border-emerald-300 hover:border-emerald-400 rounded-2xl p-4 shadow-xs transition">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block tracking-wider">
                4. ਕੁੱਲ ਵਾਪਸ ਆਏ ਪੈਸੇ (-)
              </span>
              <strong className="text-base sm:text-xl font-black text-emerald-700 font-mono block mt-1">
                -₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10.5px] font-bold text-emerald-700 block mt-0.5">
                {allRecoveries.length} ਵਾਪਸੀਆਂ / ਰਸੀਦਾਂ
              </span>
            </div>

            {/* 5. Net Advance Due */}
            <div className="bg-gradient-to-br from-indigo-800 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 shadow-md col-span-2 sm:col-span-1 border border-indigo-700">
              <span className="text-[11px] font-black uppercase block tracking-wider text-indigo-200">
                5. ਸ਼ੁੱਧ ਬਾਕੀ ਦੇਣਦਾਰੀ (=)
              </span>
              <strong className="text-lg sm:text-2xl font-black font-mono block mt-1 text-amber-300">
                ₹{Math.round(netAdvancePayableRemaining).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-indigo-200 font-medium block mt-0.5">
                ਮੂਲ + ਵਿਆਜ - ਵਾਪਸੀਆਂ
              </span>
            </div>
          </div>

          {/* Transparent Mathematical Equation Banner */}
          <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                  ਪੇਜ 2 ਦਾ ਸਾਫ਼ ਗਣਿਤਿਕ ਸਮੀਕਰਨ (Direct Calculation Formula):
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono mt-0.5">
                  <span className="text-amber-300 font-bold">
                    ਮੂਲ ₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-400">+</span>
                  <span className="text-rose-400 font-bold">
                    ਵਿਆਜ ₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-400">-</span>
                  <span className="text-emerald-400 font-bold">
                    ਵਾਪਸੀਆਂ ₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-400">=</span>
                  <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-lg font-black text-sm sm:text-base">
                    ਸ਼ੁੱਧ ਦੇਣਯੋਗ ₹{Math.round(netAdvancePayableRemaining).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
              💡 ਕਿਸਾਨ ਨੂੰ ਸਮਝਾਉਣਾ ਸਭ ਤੋਂ ਆਸਾਨ: <strong className="text-white">ਜਿੰਨੇ ਲਏ + ਵਿਆਜ, ਵਿੱਚੋਂ ਵਾਪਸ ਦਿੱਤੇ ਕੱਟੇ ਗਏ।</strong>
            </div>
          </div>

          {/* Sub-Tab Navigation Bar & View Selector */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-2 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <button
                type="button"
                onClick={() => setPage2SubTab('cards')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  page2SubTab === 'cards'
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400 scale-[1.01]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>📑 ਸਰਲ ਕਾਰਡ ਵਿਊ (ਇੱਕ-ਇੱਕ ਐਂਟਰੀ ਸੌਖੀ ਸਮਝੋ)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                  {advances.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPage2SubTab('table')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  page2SubTab === 'table'
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400 scale-[1.01]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📊 ਬਹੀ-ਖਾਤਾ ਟੇਬਲ (Ledger Table)</span>
              </button>

              <button
                type="button"
                onClick={() => setPage2SubTab('recoveries')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  page2SubTab === 'recoveries'
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500 scale-[1.01]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                <span>🧾 ਵਾਪਸੀਆਂ ਤੇ ਰਸੀਦਾਂ (Recoveries)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                  {allRecoveries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPage2SubTab('passbook')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  page2SubTab === 'passbook'
                    ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-500 scale-[1.01]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                <span>📖 ਸੰਪੂਰਨ ਪਾਸਬੁੱਕ (Running Ledger)</span>
              </button>
            </div>

            {/* Quick Search & Count */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={page2SearchQuery}
                  onChange={(e) => setPage2SearchQuery(e.target.value)}
                  placeholder="ਮਿਤੀ, ਰਕਮ ਜਾਂ ਵੇਰਵਾ ਖੋਜੋ..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {page2SearchQuery && (
                <button
                  type="button"
                  onClick={() => setPage2SearchQuery('')}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer text-xs font-bold"
                  title="ਖੋਜ ਹਟਾਓ"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-slate-400" />
              ਕਿਸਮ ਫਿਲਟਰ:
            </span>
            {[
              { id: 'ALL', label: 'ਸਾਰੇ ਦਿਖਾਓ (All)', icon: '🔄' },
              { id: 'CASH', label: '💵 ਨਕਦ (Cash)', icon: '💵' },
              { id: 'FERTILIZER', label: '🌱 ਖਾਦ (Fertilizer)', icon: '🌱' },
              { id: 'DIESEL', label: '⛽ ਡੀਜ਼ਲ (Diesel)', icon: '⛽' },
              { id: 'BANK', label: '🏦 ਬੈਂਕ/UPI/ਚੈੱਕ', icon: '🏦' },
              { id: 'PESTICIDE', label: '🧪 ਦਵਾਈਆਂ (Pesticide)', icon: '🧪' }
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setPage2CategoryFilter(chip.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                  page2CategoryFilter === chip.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{chip.label}</span>
              </button>
            ))}
            <span className="text-[11px] text-slate-400 font-mono ml-auto">
              ਕੁੱਲ {filteredAdvances.length} ਐਂਟਰੀਆਂ ਮਿਲੀਆਂ
            </span>
          </div>

          {/* ================================================================= */}
          {/* SUB-TAB 1: ਸਰਲ ਕਾਰਡ ਵਿਊ (Simple Explainer Cards)                   */}
          {/* ================================================================= */}
          {page2SubTab === 'cards' && (
            <div className="space-y-4">
              {filteredAdvances.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-500 space-y-3">
                  <Coins className="w-12 h-12 mx-auto text-amber-400 opacity-60" />
                  <h4 className="text-sm font-black text-slate-800">
                    ਕੋਈ ਐਡਵਾਂਸ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    ਜੇਕਰ ਕਿਸਾਨ ਨੂੰ ਕੋਈ ਨਕਦ ਪੈਸੇ, ਖਾਦ, ਡੀਜ਼ਲ ਜਾਂ ਬੈਂਕ ਟ੍ਰਾਂਸਫਰ ਰਾਹੀਂ ਪੇਸ਼ਗੀ ਦਿੱਤੀ ਹੈ, ਤਾਂ ਨਵੀਂ ਐਂਟਰੀ ਦਰਜ ਕਰੋ।
                  </p>
                  <button
                    type="button"
                    onClick={onOpenAdvanceModal}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>+ ਨਵਾਂ ਐਡਵਾਂਸ ਜੋੜੋ</span>
                  </button>
                </div>
              ) : (
                filteredAdvances.map((adv, idx) => {
                  const interestAmount = Math.round(adv.interestAmount || 0);
                  const totalRepaid = (adv.repayments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                  const totalPayableBeforeRepay = adv.totalPayableWithInterest || (adv.amount + interestAmount);
                  const netDue = Math.max(0, Math.round(totalPayableBeforeRepay - totalRepaid));
                  const isExpanded = !!expandedAdvanceIds[adv.id];
                  const isFullyRepaid = totalRepaid > 0 && netDue === 0;
                  const isPartiallyRepaid = totalRepaid > 0 && netDue > 0;

                  return (
                    <div
                      key={adv.id}
                      className={`bg-white rounded-3xl border-2 transition-all shadow-xs hover:shadow-md overflow-hidden ${
                        isFullyRepaid
                          ? 'border-emerald-200'
                          : isPartiallyRepaid
                          ? 'border-amber-200'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top Bar of the Entry Card */}
                      <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono text-xs font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-950 rounded-lg text-xs font-mono font-bold border border-amber-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-800" />
                            <span>ਮਿਤੀ: {adv.date}</span>
                          </span>

                          {/* Category Badge */}
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            adv.category === 'CASH'
                              ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                              : adv.category === 'FERTILIZER'
                              ? 'bg-teal-50 text-teal-950 border-teal-200'
                              : adv.category === 'DIESEL'
                              ? 'bg-orange-50 text-orange-950 border-orange-200'
                              : adv.category === 'PESTICIDE'
                              ? 'bg-purple-50 text-purple-950 border-purple-200'
                              : 'bg-blue-50 text-blue-950 border-blue-200'
                          }`}>
                            {adv.category === 'CASH' ? '💵 ਨਕਦ (Cash)' :
                             adv.category === 'FERTILIZER' ? '🌱 ਖਾਦ (Fertilizer)' :
                             adv.category === 'DIESEL' ? '⛽ ਡੀਜ਼ਲ (Diesel)' :
                             adv.category === 'PESTICIDE' ? '🧪 ਦਵਾਈਆਂ (Pesticide)' :
                             adv.category === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ (Transfer)' :
                             adv.category === 'CHEQUE' ? '🧾 ਚੈੱਕ (Cheque)' : adv.category}
                          </span>

                          {/* Payment Method Badge */}
                          {adv.paymentMode && (
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-white border border-slate-200 text-slate-700">
                              {adv.paymentMode === 'CASH' ? 'ਨਕਦ ਦਿੱਤੇ' :
                               adv.paymentMode === 'BANK_TRANSFER' ? 'ਬੈਂਕ ਟ੍ਰਾਂਸਫਰ' :
                               adv.paymentMode === 'CHEQUE' ? `ਚੈੱਕ #${adv.chequeNumber || ''}` :
                               adv.paymentMode === 'GOOGLE_PAY' || adv.paymentMode === 'UPI' ? 'UPI / GPay' : adv.paymentMode}
                            </span>
                          )}

                          {/* Repayment Status Pill */}
                          {isFullyRepaid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ਪੂਰਾ ਚੁਕਤਾ (Fully Settled)</span>
                            </span>
                          ) : isPartiallyRepaid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>ਅੰਸ਼ਕ ਵਾਪਸੀ (Partially Repaid)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                              ਬਕਾਇਆ (Due)
                            </span>
                          )}
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {onViewVoucher && (
                            <button
                              type="button"
                              onClick={() => onViewVoucher(adv)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                              title="ਵਾਊਚਰ ਦੇਖੋ"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">ਵਾਊਚਰ</span>
                            </button>
                          )}

                          {onOpenRepayment && (
                            <button
                              type="button"
                              onClick={() => onOpenRepayment(adv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              title="ਕਿਸ਼ਤ ਵਾਪਸ ਲਵੋ"
                            >
                              <Receipt className="w-3.5 h-3.5 text-emerald-200" />
                              <span>+ ਕਿਸ਼ਤ ਵਾਪਸੀ</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExplainingAdvance(adv)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                            title="ਇਸ ਐਂਟਰੀ ਦਾ ਪੂਰਾ ਹਿਸਾਬ ਸਮਝੋ"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>ਹਿਸਾਬ ਸਮਝੋ</span>
                          </button>

                          {onEditAdvance && (
                            <button
                              type="button"
                              onClick={() => onEditAdvance(adv)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition"
                              title="ਸੋਧੋ (Edit)"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onDeleteAdvance && (
                            <button
                              type="button"
                              onClick={() => onDeleteAdvance(adv.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition"
                              title="ਡਿਲੀਟ ਕਰੋ (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Body: 4 Clear Metric Boxes */}
                      <div className="p-4 sm:p-5 space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* Box 1: ਦਿੱਤਾ ਮੂਲ */}
                          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5">
                            <span className="text-[11px] font-bold text-amber-800 uppercase block tracking-wider">
                              1. ਦਿੱਤਾ ਮੂਲ (Principal)
                            </span>
                            <strong className="text-lg sm:text-xl font-black font-mono text-amber-950 block mt-1">
                              ₹{Math.round(adv.amount).toLocaleString('en-IN')}
                            </strong>
                            <span className="text-[10px] text-amber-800 font-medium block mt-0.5">
                              {adv.itemDescription || 'ਕਿਸਾਨ ਨੂੰ ਦਿੱਤੇ ਗਏ ਪੈਸੇ'}
                            </span>
                          </div>

                          {/* Box 2: ਬਣਿਆ ਵਿਆਜ */}
                          <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5">
                            <span className="text-[11px] font-bold text-rose-800 uppercase block tracking-wider">
                              2. ਬਣਿਆ ਵਿਆਜ (Interest)
                            </span>
                            <strong className="text-lg sm:text-xl font-black font-mono text-rose-700 block mt-1">
                              {adv.isInterestFree ? '₹0' : `+₹${interestAmount.toLocaleString('en-IN')}`}
                            </strong>
                            <span className="text-[10px] text-rose-700 font-medium block mt-0.5">
                              {adv.isInterestFree
                                ? '0% ਬਿਨਾਂ ਵਿਆਜ (Interest Free)'
                                : `${adv.monthlyInterestRate ?? 2}% ਪ੍ਰਤੀ ਮਹੀਨਾ • ${adv.totalDays || 0} ਦਿਨ`}
                            </span>
                          </div>

                          {/* Box 3: ਵਾਪਸ ਆਏ ਪੈਸੇ */}
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5">
                            <span className="text-[11px] font-bold text-emerald-800 uppercase block tracking-wider">
                              3. ਵਾਪਸ ਆਏ ਪੈਸੇ (Repaid)
                            </span>
                            <strong className="text-lg sm:text-xl font-black font-mono text-emerald-700 block mt-1">
                              {totalRepaid > 0 ? `-₹${Math.round(totalRepaid).toLocaleString('en-IN')}` : '₹0'}
                            </strong>
                            <span className="text-[10px] text-emerald-800 font-medium block mt-0.5">
                              {(adv.repayments || []).length > 0
                                ? `${(adv.repayments || []).length} ਕਿਸ਼ਤਾਂ ਵਾਪਸ ਆਈਆਂ`
                                : 'ਕੋਈ ਵਾਪਸੀ ਨਹੀਂ ਆਈ'}
                            </span>
                          </div>

                          {/* Box 4: ਸ਼ੁੱਧ ਦੇਣਯੋਗ ਬਾਕੀ */}
                          <div className={`rounded-2xl p-3.5 border ${
                            netDue === 0
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                              : 'bg-gradient-to-br from-amber-600 to-amber-700 text-white border-amber-600 shadow-xs'
                          }`}>
                            <span className={`text-[11px] font-black uppercase block tracking-wider ${netDue === 0 ? 'text-emerald-800' : 'text-amber-100'}`}>
                              4. ਇਸ ਐਂਟਰੀ ਦਾ ਦੇਣਯੋਗ
                            </span>
                            <strong className={`text-lg sm:text-2xl font-black font-mono block mt-1 ${netDue === 0 ? 'text-emerald-900' : 'text-white'}`}>
                              ₹{netDue.toLocaleString('en-IN')}
                            </strong>
                            <span className={`text-[10px] block mt-0.5 ${netDue === 0 ? 'text-emerald-700 font-bold' : 'text-amber-200'}`}>
                              {netDue === 0 ? '✅ ਇਹ ਐਂਟਰੀ ਪੂਰੀ ਚੁਕਤਾ ਹੈ' : '(ਮੂਲ + ਵਿਆਜ - ਵਾਪਸੀ)'}
                            </span>
                          </div>
                        </div>

                        {/* Plain Punjabi Story Box: One-line transparent explanation */}
                        <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
                          <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5 flex-1">
                            <span className="font-black text-amber-900 uppercase text-[10.5px] block tracking-wide">
                              ਸੌਖੀ ਬੋਲੀ 'ਚ ਹਿਸਾਬ (Plain Explanation for Farmer):
                            </span>
                            <p className="text-amber-950 font-medium leading-relaxed">
                              {getEntryPlainPunjabiStory(adv)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAdvanceExpand(adv.id)}
                            className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 rounded-lg border border-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shrink-0"
                          >
                            <span>{isExpanded ? 'ਘੱਟ ਦਿਖਾਓ' : 'ਪੂਰਾ ਵੇਰਵਾ'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Expandable Section: Mathematical Formula and Repayment Timeline */}
                        {isExpanded && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 text-xs animate-in fade-in duration-200">
                            {/* Interest Formula Breakdown */}
                            <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                              <span className="font-bold text-slate-800 uppercase text-[10.5px] flex items-center gap-1.5">
                                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                                <span>ਵਿਆਜ ਦਾ ਸਹੀ ਗਣਿਤਿਕ ਫਾਰਮੂਲਾ (Interest Calculation Steps):</span>
                              </span>
                              <div className="bg-slate-100 p-2.5 rounded-lg font-mono text-[11.5px] text-slate-900 border border-slate-200 space-y-1">
                                {adv.isInterestFree ? (
                                  <div>ਇਹ ਰਕਮ ਬਿਨਾਂ ਵਿਆਜ (0% Interest Free) ਦਿੱਤੀ ਗਈ ਸੀ। ਕੋਈ ਵਿਆਜ ਨਹੀਂ ਜੋੜਿਆ ਗਿਆ।</div>
                                ) : (
                                  <>
                                    <div className="text-slate-600">
                                      • ਫਾਰਮੂਲਾ: (ਮੂਲ ਰਕਮ × ਮਹੀਨਾਵਾਰ ਵਿਆਜ ਦਰ × ਕੁੱਲ ਦਿਨ) ÷ 30 ਦਿਨ
                                    </div>
                                    <div className="font-bold text-indigo-950">
                                      • ਗਿਣਤੀ: (₹{Math.round(adv.amount).toLocaleString('en-IN')} × {adv.monthlyInterestRate ?? 2}% × {adv.totalDays || 0} ਦਿਨ) ÷ 30 ਦਿਨ = <span className="text-rose-700">₹{interestAmount.toLocaleString('en-IN')} ਵਿਆਜ</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      ਮਿਤੀ {adv.date} ਤੋਂ ਹਿਸਾਬ ਲਗਾ ਕੇ ਕੁੱਲ {adv.totalDays || 0} ਦਿਨ (~{((adv.totalDays || 0) / 30).toFixed(1)} ਮਹੀਨੇ) ਬਣਦੇ ਹਨ।
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Additional Payment Info if Available */}
                            {(adv.chequeNumber || adv.fromBankName || adv.toBankName || adv.transactionId || adv.upiId) && (
                              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs text-slate-700">
                                <span className="font-bold text-slate-900">ਟ੍ਰਾਂਸਫਰ ਵੇਰਵਾ:</span>
                                {adv.chequeNumber && <span>ਚੈੱਕ ਨੰਬਰ: <strong className="font-mono text-purple-900">#{adv.chequeNumber}</strong></span>}
                                {adv.chequeBank && <span>ਬੈਂਕ: <strong>{adv.chequeBank}</strong></span>}
                                {adv.fromBankName && <span>ਆੜ੍ਹਤੀਆ ਬੈਂਕ: <strong>{adv.fromBankName}</strong></span>}
                                {adv.toBankName && <span>ਕਿਸਾਨ ਬੈਂਕ: <strong>{adv.toBankName}</strong></span>}
                                {adv.transactionId && <span>UTR/Ref: <strong className="font-mono">{adv.transactionId}</strong></span>}
                                {adv.upiId && <span>UPI: <strong className="font-mono text-emerald-800">{adv.upiId}</strong></span>}
                              </div>
                            )}

                            {/* Repayments Timeline */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-emerald-950 uppercase text-[10.5px] flex items-center gap-1.5">
                                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>ਇਸ ਐਂਟਰੀ ਵਿੱਚੋਂ ਵਾਪਸ ਆਈਆਂ ਕਿਸ਼ਤਾਂ (Repayments Received):</span>
                                </span>
                                {onOpenRepayment && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenRepayment(adv)}
                                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                                  >
                                    + ਹੋਰ ਕਿਸ਼ਤ ਦਰਜ ਕਰੋ
                                  </button>
                                )}
                              </div>

                              {(adv.repayments || []).length === 0 ? (
                                <p className="text-slate-400 italic text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
                                  ਇਸ ਐਂਟਰੀ ਵਿੱਚੋਂ ਅਜੇ ਤੱਕ ਕੋਈ ਕਿਸ਼ਤ ਵਾਪਸ ਨਹੀਂ ਆਈ।
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {(adv.repayments || []).map((rep, rIdx) => (
                                    <div
                                      key={`rep-${adv.id}-${rep.id || rIdx}`}
                                      className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black flex items-center justify-center">
                                          {rIdx + 1}
                                        </span>
                                        <span className="font-mono font-bold text-emerald-950">
                                          ਮਿਤੀ: {rep.date}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 text-[10px] font-bold">
                                          {rep.paymentMode === 'CASH' ? '💵 ਨਕਦ' :
                                           rep.paymentMode === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ' :
                                           rep.paymentMode === 'CHEQUE' ? '🧾 ਚੈੱਕ' : rep.paymentMode}
                                        </span>
                                        {rep.remarks && (
                                          <span className="text-slate-600 text-[11px] italic">
                                            • {rep.remarks}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <strong className="font-mono text-emerald-800 text-sm font-black">
                                          -₹{Math.round(rep.amount).toLocaleString('en-IN')}
                                        </strong>
                                        {onDeleteRepayment && (
                                          <button
                                            type="button"
                                            onClick={() => onDeleteRepayment(adv.id, rep.id, rep.amount)}
                                            className="p-1 text-rose-600 hover:bg-rose-100 rounded-md cursor-pointer transition"
                                            title="ਇਹ ਕਿਸ਼ਤ ਡਿਲੀਟ ਕਰੋ"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-TAB 2: ਸਾਫ਼ ਬਹੀ-ਖਾਤਾ ਟੇਬਲ (Clean Ledger Table)                   */}
          {/* ================================================================= */}
          {page2SubTab === 'table' && (
            <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      ਦਿੱਤੇ ਗਏ ਐਡਵਾਂਸ ਅਤੇ ਵਿਆਜ ਬਹੀ-ਖਾਤਾ (Advance & Interest Ledger)
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      ਹਰ ਇੱਕ ਐਂਟਰੀ ਦਾ ਲਿਆ ਮੂਲ, ਦਰ, ਦਿਨ, ਬਣਿਆ ਵਿਆਜ ਅਤੇ ਵਾਪਸ ਆਈ ਰਕਮ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/15 rounded-lg text-xs font-mono font-bold">
                    {filteredAdvances.length} ਐਂਟਰੀਆਂ
                  </span>
                  <button
                    type="button"
                    onClick={onOpenAdvanceModal}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ ਨਵਾਂ ਐਡਵਾਂਸ</span>
                  </button>
                </div>
              </div>

              <div className="p-3 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] border-b-2 border-slate-200">
                    <tr>
                      <th className="py-3 px-2 text-center w-10">ਲੜੀ</th>
                      <th className="py-3 px-2.5">ਮਿਤੀ (Date)</th>
                      <th className="py-3 px-2.5">ਕਿਸਮ / ਵੇਰਵਾ</th>
                      <th className="py-3 px-2.5 text-right">ਲਿਆ ਮੂਲ (Principal)</th>
                      <th className="py-3 px-2.5 text-center">ਵਿਆਜ ਦਰ ਤੇ ਸਮਾਂ</th>
                      <th className="py-3 px-2.5 text-right">ਬਣਿਆ ਵਿਆਜ</th>
                      <th className="py-3 px-2.5 text-right">ਵਾਪਸ ਆਏ</th>
                      <th className="py-3 px-2.5 text-right">ਸ਼ੁੱਧ ਦੇਣਯੋਗ (Due)</th>
                      <th className="py-3 px-2 text-center w-28">ਕਾਰਵਾਈ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredAdvances.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 font-medium">
                          ਕੋਈ ਐਂਟਰੀ ਨਹੀਂ ਮਿਲੀ।
                        </td>
                      </tr>
                    ) : (
                      filteredAdvances.map((adv, idx) => {
                        const interest = Math.round(adv.interestAmount || 0);
                        const totalRepaid = (adv.repayments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                        const netPayable = Math.max(0, Math.round((adv.totalPayableWithInterest || (adv.amount + interest)) - totalRepaid));
                        return (
                          <React.Fragment key={adv.id}>
                            <tr className="hover:bg-amber-50/50 transition">
                              <td className="py-3 px-2 text-center font-mono font-bold text-slate-500">
                                #{idx + 1}
                              </td>
                              <td className="py-3 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {adv.date}
                                </span>
                              </td>
                              <td className="py-3 px-2.5">
                                <span className="font-bold text-slate-900 block">
                                  {adv.category === 'CASH' ? '💵 ਨਕਦ' :
                                   adv.category === 'FERTILIZER' ? '🌱 ਖਾਦ' :
                                   adv.category === 'DIESEL' ? '⛽ ਡੀਜ਼ਲ' :
                                   adv.category === 'PESTICIDE' ? '🧪 ਦਵਾਈਆਂ' :
                                   adv.category === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ' :
                                   adv.category === 'CHEQUE' ? '🧾 ਚੈੱਕ' : adv.category}
                                </span>
                                {adv.itemDescription && (
                                  <span className="text-[10px] text-slate-500 block truncate max-w-xs">{adv.itemDescription}</span>
                                )}
                              </td>
                              <td className="py-3 px-2.5 text-right font-mono font-black text-slate-900">
                                ₹{Math.round(adv.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-2.5 text-center text-[11px]">
                                {adv.isInterestFree ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                                    0% ਬਿਨਾਂ ਵਿਆਜ
                                  </span>
                                ) : (
                                  <div className="font-mono">
                                    <strong className="text-slate-800">{adv.monthlyInterestRate ?? 2}% / ਮਹੀਨਾ</strong>
                                    <span className="text-slate-500 block text-[10px]">{adv.totalDays || 0} ਦਿਨ</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-2.5 text-right font-mono font-bold text-rose-700">
                                +₹{interest.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-2.5 text-right font-mono font-bold text-emerald-700">
                                {totalRepaid > 0 ? `-₹${Math.round(totalRepaid).toLocaleString('en-IN')}` : '₹0'}
                              </td>
                              <td className="py-3 px-2.5 text-right font-mono font-black text-amber-950 text-sm">
                                ₹{netPayable.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setExplainingAdvance(adv)}
                                    className="p-1 hover:bg-amber-100 rounded text-amber-700 cursor-pointer"
                                    title="ਹਿਸਾਬ ਸਮਝੋ"
                                  >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                  </button>
                                  {onViewVoucher && (
                                    <button
                                      type="button"
                                      onClick={() => onViewVoucher(adv)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                                      title="ਵਾਊਚਰ"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onOpenRepayment && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenRepayment(adv)}
                                      className="p-1 hover:bg-emerald-100 rounded text-emerald-700 cursor-pointer"
                                      title="ਕਿਸ਼ਤ ਵਾਪਸ ਲਵੋ"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onEditAdvance && (
                                    <button
                                      type="button"
                                      onClick={() => onEditAdvance(adv)}
                                      className="p-1 hover:bg-indigo-100 rounded text-indigo-700 cursor-pointer"
                                      title="ਸੋਧੋ"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onDeleteAdvance && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteAdvance(adv.id)}
                                      className="p-1 hover:bg-rose-100 rounded text-rose-700 cursor-pointer"
                                      title="ਡਿਲੀਟ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Plain Gurmukhi Story Note directly under each row in Table view */}
                            <tr className="bg-slate-50/60 text-[10.5px] text-slate-600 border-b border-slate-200">
                              <td className="py-1.5 px-2 text-center text-slate-400">↳</td>
                              <td colSpan={8} className="py-1.5 px-2.5">
                                <span className="font-medium text-slate-800">
                                  {getEntryPlainPunjabiStory(adv)}
                                </span>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Bottom Totals */}
              <div className="bg-amber-50 p-4 border-t-2 border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-amber-950 font-bold space-x-2">
                  <span>ਕੁੱਲ ਮੂਲ: <strong className="font-mono">₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}</strong></span>
                  <span>|</span>
                  <span>ਕੁੱਲ ਵਿਆਜ: <strong className="font-mono text-rose-700">+₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}</strong></span>
                  <span>|</span>
                  <span>ਕੁੱਲ ਵਾਪਸੀਆਂ: <strong className="font-mono text-emerald-700">-₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')}</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-amber-900 font-bold block text-[11px]">ਸ਼ੁੱਧ ਦੇਣਯੋਗ ਰਕਮ (Net Advance Due):</span>
                  <span className="text-lg font-black text-amber-950 font-mono">
                    ₹{Math.round(netAdvancePayableRemaining).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-TAB 3: ਵਾਪਸੀਆਂ ਤੇ ਰਸੀਦਾਂ (Recoveries & Repayments List)          */}
          {/* ================================================================= */}
          {page2SubTab === 'recoveries' && (
            <div className="bg-white rounded-3xl border-2 border-emerald-300 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-5 h-5 text-emerald-300" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      ਪ੍ਰਾਪਤ ਰਕਮ, ਕਿਸ਼ਤ ਵਾਪਸੀ ਅਤੇ ਸਿੱਧੀਆਂ ਰਸੀਦਾਂ (Recoveries & Repayments)
                    </h3>
                    <p className="text-[11px] text-emerald-200 mt-0.5">
                      ਕਿਸਾਨ ਵੱਲੋਂ ਵਾਪਸ ਕੀਤੀ ਰਕਮ ਜਾਂ ਆੜ੍ਹਤੀਏ ਨੂੰ ਪ੍ਰਾਪਤ ਹੋਏ ਪੈਸੇ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-mono font-bold">
                    {allRecoveries.length} ਰਸੀਦਾਂ (ਕੁੱਲ ₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')})
                  </span>
                  <button
                    type="button"
                    onClick={onOpenPaymentModal}
                    className="px-3.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ ਨਵੀਂ ਵਾਪਸੀ ਰਸੀਦ</span>
                  </button>
                </div>
              </div>

              <div className="p-3 overflow-x-auto">
                {allRecoveries.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Receipt className="w-10 h-10 mx-auto opacity-50 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">ਕੋਈ ਵਾਪਸੀ ਜਾਂ ਰਿਕਵਰੀ ਰਸੀਦ ਦਰਜ ਨਹੀਂ ਹੈ।</p>
                    <p className="text-[11px] text-slate-400">ਨਵੀਂ ਰਸੀਦ ਜੋੜਨ ਲਈ ਉੱਪਰ ਦਿੱਤਾ ਬਟਨ ਵਰਤੋ।</p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-emerald-50 text-emerald-950 font-black uppercase text-[11px] border-b border-emerald-200">
                      <tr>
                        <th className="py-3 px-3">ਵਾਪਸੀ ਮਿਤੀ (Date)</th>
                        <th className="py-3 px-3">ਕਿਸਮ / ਖਾਤਾ (Category)</th>
                        <th className="py-3 px-3">ਭੁਗਤਾਨ ਢੰਗ (Payment Mode)</th>
                        <th className="py-3 px-3">ਰਸੀਦ / ਰੈਫਰੈਂਸ / UTR</th>
                        <th className="py-3 px-3">ਵੇਰਵਾ (Remarks)</th>
                        <th className="py-3 px-3 text-right">ਪ੍ਰਾਪਤ ਰਕਮ (Amount ₹)</th>
                        <th className="py-3 px-3 text-center">ਕਾਰਵਾਈ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {allRecoveries.map((rec) => (
                        <tr key={rec.id} className="hover:bg-emerald-50/40 transition">
                          <td className="py-3 px-3 font-mono font-bold text-emerald-950">
                            <span className="bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 inline-block font-mono text-xs">
                              {rec.date}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              rec.isRepayment
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}>
                              {rec.typeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {rec.mode === 'CASH' ? '💵 ਨਕਦ (Cash)' :
                               rec.mode === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ (Bank)' :
                               (rec.mode as string) === 'RTGS' || (rec.mode as string) === 'NEFT' ? '⚡ RTGS/NEFT' :
                               rec.mode === 'CHEQUE' ? '📝 ਚੈੱਕ (Cheque)' : rec.mode}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700">
                            {rec.ref && rec.ref !== '—' ? rec.ref : <span className="text-slate-400 italic">ਕੋਈ ਰੈਫਰੈਂਸ ਨਹੀਂ</span>}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {rec.remarks || '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 text-sm">
                            -₹{Math.round(rec.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {rec.isRepayment && onDeleteRepayment ? (
                              <button
                                type="button"
                                onClick={() => onDeleteRepayment(rec.advanceId!, rec.id, rec.amount)}
                                className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition cursor-pointer"
                                title="ਇਹ ਵਾਪਸੀ ਕਿਸ਼ਤ ਹਟਾਓ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : !rec.isRepayment && onDeletePayment ? (
                              <button
                                type="button"
                                onClick={() => onDeletePayment(rec.id)}
                                className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition cursor-pointer"
                                title="ਇਹ ਰਸੀਦ ਹਟਾਓ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="bg-emerald-50 p-4 border-t-2 border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-950 font-bold">
                  ਕੁੱਲ ਵਾਪਸੀਆਂ ਦੀ ਗਿਣਤੀ: <strong>{allRecoveries.length}</strong>
                </span>
                <span className="text-right">
                  <span className="text-emerald-900 font-bold block text-[11px]">ਕੁੱਲ ਵਾਪਸ ਆਈ ਰਕਮ:</span>
                  <span className="text-lg font-black text-emerald-950 font-mono">
                    ₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-TAB 4: ਸੰਪੂਰਨ ਪਾਸਬੁੱਕ ਲੈੱਜਰ (Combined Running Passbook Ledger)   */}
          {/* ================================================================= */}
          {page2SubTab === 'passbook' && (
            <div className="bg-white rounded-3xl border-2 border-indigo-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      ਕਿਸਾਨ ਰੋਕੜ ਵਹੀ ਤੇ ਪਾਸਬੁੱਕ ਸਟੇਟਮੈਂਟ (Date-wise Chronological Passbook)
                    </h3>
                    <p className="text-[11px] text-indigo-200 mt-0.5">
                      ਹਰ ਲੈਣ-ਦੇਣ ਤੋਂ ਬਾਅਦ ਤੁਰੰਤ ਬਣਿਆ ਬਕਾਇਆ (Running Balance Statement)
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-mono font-bold">
                  {combinedPassbook.length} ਟ੍ਰਾਂਜੈਕਸ਼ਨਾਂ
                </span>
              </div>

              <div className="p-3 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-indigo-50 text-indigo-950 font-black uppercase text-[11px] border-b-2 border-indigo-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">ਕ੍ਰਮ</th>
                      <th className="py-3 px-3">ਮਿਤੀ (Date)</th>
                      <th className="py-3 px-3">ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਵੇਰਵਾ (Particulars)</th>
                      <th className="py-3 px-3 text-center">ਕਿਸਮ</th>
                      <th className="py-3 px-3 text-right text-rose-900">ਨਾਵੇਂ / ਲਿਆ (Debit ₹)</th>
                      <th className="py-3 px-3 text-right text-emerald-900">ਜਮ੍ਹਾਂ / ਵਾਪਸ (Credit ₹)</th>
                      <th className="py-3 px-3 text-right text-indigo-950">ਬਕਾਇਆ (Balance ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {combinedPassbook.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          ਕੋਈ ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਨਹੀਂ ਮਿਲੀ।
                        </td>
                      </tr>
                    ) : (
                      combinedPassbook.map((entry, pIdx) => (
                        <tr key={entry.id} className="hover:bg-indigo-50/40 transition">
                          <td className="py-3 px-3 text-center font-mono text-slate-400 text-[11px]">
                            {pIdx + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {entry.date}
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-900 block">{entry.title}</strong>
                            <span className="text-[11px] text-slate-500 block">{entry.description}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${entry.badgeColor}`}>
                              {entry.badgeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                            {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                            {entry.credit > 0 ? `-₹${entry.credit.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-indigo-950 text-sm">
                            ₹{Math.round(entry.runningBalance).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-indigo-50 p-4 border-t-2 border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-indigo-950 font-bold">
                  ਬਹੀ-ਖਾਤਾ ਆਖਰੀ ਬਕਾਇਆ (Final Advance Ledger Balance):
                </span>
                <span className="text-lg font-black text-indigo-950 font-mono">
                  ₹{Math.round(netAdvancePayableRemaining).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Navigation & PDF Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={() => setCurrentPage('page1')}
              className="w-full sm:w-auto px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>⬅ ਪਿੱਛੇ ਪੇਜ 1 (ਫਸਲ ਖਾਤਾ) 'ਤੇ ਜਾਓ</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportPdf('page2')}
                disabled={isExportingPdf}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 disabled:opacity-50"
                title="ਸਿਰਫ਼ ਇਸ ਪੇਜ 2 ਦਾ PDF ਡਾਊਨਲੋਡ ਕਰੋ"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-200" />
                <span>ਪੇਜ 2 PDF ਡਾਊਨਲੋਡ</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPdf('all')}
                disabled={isExportingPdf}
                className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition active:scale-95 disabled:opacity-50"
                title="ਸਾਰੇ 3 ਪੇਜਾਂ ਦਾ ਇਕੱਠਾ PDF ਡਾਊਨਲੋਡ ਕਰੋ"
              >
                <Layers className="w-3.5 h-3.5 text-rose-200" />
                <span>ਪੂਰਾ 3-ਪੇਜ PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage('page3')}
              className="w-full sm:w-auto px-5 py-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
            >
              <span>ਅੱਗੇ ਪੇਜ 3 (ਅੰਤਿਮ ਨਿਬੇੜਾ ਤੇ ਫੈਸਲਾ) 'ਤੇ ਜਾਓ</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* ================================================================= */}
          {/* MODAL: ਕਿਸੇ ਵੀ ਐਂਟਰੀ ਦਾ ਪੂਰਾ ਹਿਸਾਬ ਸਮਝਾਉਣ ਵਾਲਾ ਮੋਡਲ                */}
          {/* ================================================================= */}
          {explainingAdvance && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-2xl">
                      <HelpCircle className="w-6 h-6 text-amber-200" />
                    </div>
                    <div>
                      <h3 className="text-base font-black">
                        ਐਂਟਰੀ ਦਾ ਪੂਰਾ ਵੇਰਵਾ ਤੇ ਵਿਆਜ ਗਣਨਾ
                      </h3>
                      <p className="text-xs text-amber-100">
                        ਮਿਤੀ {explainingAdvance.date} • ਐਂਟਰੀ #{explainingAdvance.id}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExplainingAdvance(null)}
                    className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                  {/* Farmer Info */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex justify-between">
                    <div>
                      <span className="text-slate-500 block text-[11px]">ਕਿਸਾਨ ਦਾ ਨਾਮ:</span>
                      <strong className="text-slate-900 font-black text-sm">
                        {farmer.farmerNamePa || farmer.farmerName}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[11px]">ਖਾਤਾ ਨੰਬਰ:</span>
                      <strong className="text-slate-900 font-mono font-bold">{farmer.id}</strong>
                    </div>
                  </div>

                  {/* Plain Language Summary */}
                  <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-1 text-amber-950">
                    <span className="font-black text-amber-900 uppercase text-[11px] block">
                      💡 ਸੌਖੀ ਬੋਲੀ 'ਚ ਹਿਸਾਬ (Farmer Explanation):
                    </span>
                    <p className="font-medium text-xs leading-relaxed">
                      {getEntryPlainPunjabiStory(explainingAdvance)}
                    </p>
                  </div>

                  {/* 4 Step Math Breakdown */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-800 uppercase text-[11px] block">
                      ਕਦਮ-ਦਰ-ਕਦਮ ਗਣਨਾ (Step-by-Step Breakdown):
                    </span>

                    <div className="border border-slate-200 rounded-2xl p-3.5 space-y-2 bg-white">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-slate-600 font-medium">1. ਦਿੱਤੀ ਗਈ ਮੂਲ ਰਕਮ:</span>
                        <strong className="font-mono text-slate-900 text-sm font-black">
                          ₹{Math.round(explainingAdvance.amount).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-slate-600 font-medium">
                          2. ਵਿਆਜ ਦਰ ਅਤੇ ਸਮਾਂ:
                        </span>
                        <strong className="font-mono text-slate-800">
                          {explainingAdvance.isInterestFree
                            ? '0% ਬਿਨਾਂ ਵਿਆਜ'
                            : `${explainingAdvance.monthlyInterestRate ?? 2}% / ਮਹੀਨਾ (${explainingAdvance.totalDays || 0} ਦਿਨ)`}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-rose-700 font-medium">3. ਬਣਿਆ ਕੁੱਲ ਵਿਆਜ:</span>
                        <strong className="font-mono text-rose-700 text-sm font-black">
                          +₹{Math.round(explainingAdvance.interestAmount || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <span className="text-emerald-700 font-medium">4. ਵਿੱਚੋਂ ਵਾਪਸ ਆਈਆਂ ਕਿਸ਼ਤਾਂ:</span>
                        <strong className="font-mono text-emerald-700 text-sm font-black">
                          -₹{Math.round((explainingAdvance.repayments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center pt-1 bg-amber-50/70 p-2 rounded-xl">
                        <span className="text-amber-950 font-black text-xs uppercase">
                          ਅੰਤਿਮ ਬਾਕੀ ਦੇਣਯੋਗ (Net Amount Due):
                        </span>
                        <strong className="font-mono text-amber-950 text-base font-black">
                          ₹{Math.max(0, Math.round((explainingAdvance.totalPayableWithInterest || (explainingAdvance.amount + (explainingAdvance.interestAmount || 0))) - (explainingAdvance.repayments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0))).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setExplainingAdvance(null)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition"
                    >
                      ਠੀਕ ਹੈ, ਸਮਝ ਆ ਗਿਆ (Close)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PAGE 3: ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ (Final Settlement: ਪੂਰਾ ਲੈਣ-ਦੇਣ) */}
      {/* ==================================================================== */}
      {currentPage === 'page3' && (
        <div className="space-y-6">
          {/* Header Notice Banner */}
          <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-950">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-700 text-white rounded-xl shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-700 text-white">
                    ਪੇਜ 3 (Page 3)
                  </span>
                  <span className="text-indigo-950 font-bold text-xs sm:text-sm">
                    ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ: ਪੇਜ 1 ਅਤੇ ਪੇਜ 2 ਦਾ ਪੂਰਾ ਲੈਣ-ਦੇਣ
                  </span>
                </div>
                <p className="text-xs text-indigo-800 mt-0.5">
                  ★ ਇੱਥੇ ਫਸਲ ਦੀ ਸ਼ੁੱਧ ਰਕਮ (ਪੇਜ 1) ਅਤੇ ਐਡਵਾਂਸ/ਵਿਆਜ (ਪੇਜ 2) ਦਾ ਆਖ਼ਰੀ ਜੋੜ-ਘਟਾਓ ਕਰਕੇ ਫੈਸਲਾ ਕੀਤਾ ਗਿਆ ਹੈ।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSettlementModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Scale className="w-4 h-4 text-slate-950" />
              <span>ਖਾਤਾ ਪੱਕਾ ਕਰੋ (Settle Season)</span>
            </button>
          </div>

          {/* TWO SIDES RECONCILIATION: CREDIT (FARMER) vs DEBIT (EXPENSES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT: FARMER CREDITS (ਜਮ੍ਹਾਂ ਪੈਸੇ - ਫਸਲ ਦਾ ਹੱਕ) */}
            <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-100 pb-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-black text-sm uppercase">1. ਕਿਸਾਨ ਦੇ ਜਮ੍ਹਾਂ ਪੈਸੇ (Credit / ਫਸਲ ਦਾ ਹੱਕ)</h4>
                  <span className="text-[10px] text-slate-500">ਪੇਜ 1 (ਫਸਲ ਖਾਤੇ) ਤੋਂ</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600">ਫਸਲ ਦੀ ਕੁੱਲ ਰਕਮ (Gross Proceeds):</span>
                  <span className="font-mono font-bold text-slate-900">
                    + ₹{Math.round(totalPurchasedAmount).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 text-rose-700">
                  <div>
                    <span>ਮਨਫੀ (-) ਲੇਬਰ ਕਟੌਤੀਆਂ (Labour Cut):</span>
                    <span className="text-[10px] text-slate-500 block">
                      (ਪੱਕੀ: {pakkiBags} ਬੋ., ਡਬਲ: {doubleBags} ਬੋ., ਸੁੱਕੀ: {sukkiBags} ਬੋ.)
                    </span>
                  </div>
                  <span className="font-mono font-bold">
                    - ₹{Math.round(totalLabourDeductions).toLocaleString('en-IN')}
                  </span>
                </div>

                {openingBalance < 0 && (
                  <div className="flex justify-between items-center py-1 text-emerald-700">
                    <span>ਪਿਛਲਾ ਜਮ੍ਹਾਂ ਬੈਲੇਂਸ (Opening Cr.):</span>
                    <span className="font-mono font-bold">
                      + ₹{Math.round(Math.abs(openingBalance)).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-emerald-200 flex justify-between items-center bg-emerald-50 p-2.5 rounded-xl">
                  <strong className="text-emerald-950 font-bold">
                    ਕੁੱਲ ਜਮ੍ਹਾਂ ਰਕਮ (Net Crop Credit):
                  </strong>
                  <strong className="text-base font-black text-emerald-900 font-mono">
                    ₹{Math.round(netCropProceeds + (openingBalance < 0 ? Math.abs(openingBalance) : 0)).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

            {/* RIGHT: FARMER DEBITS (ਨਾਮੇਂ / ਕਟੌਤੀਆਂ - ਦੇਣਦਾਰੀ) */}
            <div className="bg-white rounded-2xl border-2 border-rose-300 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 border-b border-rose-100 pb-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                <div>
                  <h4 className="font-black text-sm uppercase">2. ਕਿਸਾਨ ਵੱਲ ਨਾਮੇਂ / ਕਟੌਤੀਆਂ (Debit / ਦੇਣਦਾਰੀ)</h4>
                  <span className="text-[10px] text-slate-500">ਪੇਜ 2 (ਐਡਵਾਂਸ ਖਾਤੇ) ਤੋਂ</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {openingBalance > 0 && (
                  <div className="flex justify-between items-center py-1 text-rose-700">
                    <span>ਪਿਛਲਾ ਬਕਾਇਆ (Opening Balance Dr.):</span>
                    <span className="font-mono font-bold">
                      ₹{Math.round(openingBalance).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 text-slate-700">
                  <span>ਦਿੱਤਾ ਐਡਵਾਂਸ (ਮੂਲ ਰਕਮ Principal):</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 text-rose-700">
                  <span>ਕੁੱਲ ਬਣਿਆ ਵਿਆਜ (Interest):</span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}
                  </span>
                </div>

                {directPayments > 0 && (
                  <div className="flex justify-between items-center py-1 text-blue-700">
                    <span>ਸਿੱਧੀ ਅਦਾਇਗੀ / ਬੈਂਕ ਟਰਾਂਸਫਰ:</span>
                    <span className="font-mono font-bold">
                      ₹{Math.round(directPayments).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-rose-200 flex justify-between items-center bg-rose-50 p-2.5 rounded-xl">
                  <strong className="text-rose-950 font-bold">
                    ਕੁੱਲ ਦੇਣਦਾਰੀ (Total Debit):
                  </strong>
                  <strong className="text-base font-black text-rose-900 font-mono">
                    ₹{Math.round(totalAdvancePayable + directPayments + (openingBalance > 0 ? openingBalance : 0)).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* BIG BOLD FINAL DECISION BANNER (The ultimate answer: ਲਏ ਜਾਂ ਦੇਣੇ) */}
          {/* ============================================================== */}
          <div className={`rounded-3xl border-4 p-6 sm:p-8 shadow-xl ${
            isPayableToFarmer
              ? 'bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 border-emerald-400 text-white'
              : 'bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 border-rose-400 text-white'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20">
                  <Scale className="w-4 h-4" />
                  <span>ਆਖ਼ਰੀ ਫੈਸਲਾ (Final Balance Decision)</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black">
                  {isPayableToFarmer ? (
                    <span className="text-amber-300">
                      ★ ਆੜ੍ਹਤੀ ਵੱਲੋਂ ਕਿਸਾਨ ਨੂੰ ਅੰਤਿਮ ਦੇਣਯੋਗ (Payable to Farmer)
                    </span>
                  ) : (
                    <span className="text-rose-200">
                      ★ ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ (Receivable from Farmer)
                    </span>
                  )}
                </h2>

                <p className="text-xs sm:text-sm text-slate-200 max-w-xl">
                  {isPayableToFarmer
                    ? `${farmer.farmerNamePa || farmer.farmerName} ਦੀ ਫਸਲ ਦੇ ਪੈਸੇ ਉਸਦੇ ਸਾਰੇ ਲੇਬਰ ਖਰਚੇ, ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ਕੱਟਣ ਤੋਂ ਬਾਅਦ ਵੀ ਵੱਧ ਹਨ। ਆੜ੍ਹਤੀ ਵੱਲੋਂ ਇਹ ਰਕਮ ਕਿਸਾਨ ਨੂੰ ਦਿੱਤੀ ਜਾਣੀ ਹੈ।`
                    : `${farmer.farmerNamePa || farmer.farmerName} ਦਾ ਲਿਆ ਐਡਵਾਂਸ, ਵਿਆਜ ਅਤੇ ਪਿਛਲਾ ਖਾਤਾ ਉਸਦੀ ਫਸਲ ਦੀ ਰਕਮ ਨਾਲੋਂ ਵੱਧ ਹੈ। ਕਿਸਾਨ ਵੱਲ ਇਹ ਰਕਮ ਬਕਾਇਆ ਨਿਕਲਦੀ ਹੈ।`}
                </p>
              </div>

              {/* Huge Amount Box */}
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-5 border border-white/20 text-center shrink-0 min-w-[240px]">
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-200">
                  {isPayableToFarmer ? 'ਕਿਸਾਨ ਨੂੰ ਦੇਣੇ ਹਨ' : 'ਕਿਸਾਨ ਤੋਂ ਲੈਣੇ ਹਨ'}
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight my-1 text-white">
                  ₹{Math.abs(Math.round(finalBalance)).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] opacity-80">
                  {isPayableToFarmer ? 'Net Payable (Cr)' : 'Net Due (Dr)'}
                </div>
              </div>
            </div>

            {/* Action Buttons Inside Decision Banner */}
            {/* Action Buttons Inside Decision Banner */}
            <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 border-t border-white/20">
              <button
                type="button"
                onClick={onOpenSettlementModal}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>ਖਾਤਾ ਪੱਕਾ ਕਰੋ / ਸੀਜ਼ਨ ਕਲੋਜ਼ਿੰਗ ਵਾਊਚਰ</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportPdf('all')}
                disabled={isExportingPdf}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition active:scale-95 disabled:opacity-50"
                title="ਸਾਰੇ 3 ਪੇਜਾਂ ਦਾ ਇਕੱਠਾ PDF ਡਾਊਨਲੋਡ ਕਰੋ"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <FileDown className="w-4 h-4 text-rose-200" />
                )}
                <span>{isExportingPdf ? 'PDF ਬਣ ਰਿਹਾ ਹੈ...' : 'ਪੂਰਾ ਖਾਤਾ PDF ਡਾਊਨਲੋਡ (3-Page PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>ਪ੍ਰਿੰਟ ਸਲਿੱਪ (Print Slip)</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm cursor-pointer transition"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>ਕਿਸਾਨ ਨੂੰ WhatsApp ਕਰੋ</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ਹੋਰ PDF ਵਿਕਲਪ</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('page1')}
                className="ml-auto text-xs text-white/80 hover:text-white underline cursor-pointer"
              >
                ⬅ ਪੇਜ 1 (ਫਸਲ ਖਾਤਾ) ਦੁਬਾਰਾ ਦੇਖੋ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PDF EXPORT SELECTION MODAL                                           */}
      {/* ==================================================================== */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    ਕਿਸਾਨ ਬਹੀ-ਖਾਤਾ PDF ਡਾਊਨਲੋਡ (Export PDF)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ਕਿਸਾਨ: {farmer.farmerNamePa || farmer.farmerName} | ਖਾਤਾ ਨੰ: {farmer.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {pdfExportStatus && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-bold animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                <span>{pdfExportStatus}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Option 1: Complete 3-Page Mandi Ledger PDF */}
              <button
                type="button"
                onClick={() => handleExportPdf('all')}
                disabled={isExportingPdf}
                className="w-full p-4 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-left rounded-2xl border-2 border-rose-400 shadow-xs transition-all flex items-start justify-between cursor-pointer group disabled:opacity-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-black uppercase">
                      ★ ਸਭ ਤੋਂ ਵਧੀਆ (Full Ledger)
                    </span>
                    <strong className="font-black text-sm text-rose-950">
                      ਪੂਰਾ 3-ਪੇਜ ਬਹੀ-ਖਾਤਾ PDF (Complete 3-Page PDF)
                    </strong>
                  </div>
                  <p className="text-xs text-rose-800">
                    ਇੱਕੋ ਫਾਈਲ ਵਿੱਚ ਸਾਰੇ 3 ਪੇਜ: ਪੇਜ 1 (ਫਸਲ ਤੇ ਲੇਬਰ), ਪੇਜ 2 (ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ), ਪੇਜ 3 (ਅੰਤਿਮ ਨਿਬੇੜਾ ਤੇ ਦਸਤਖਤ)।
                  </p>
                </div>
                <FileDown className="w-6 h-6 text-rose-700 shrink-0 ml-2 group-hover:scale-110 transition" />
              </button>

              {/* Option 2: Current Active Page Only */}
              <button
                type="button"
                onClick={() => handleExportPdf(currentPage)}
                disabled={isExportingPdf}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 text-left rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition flex items-start justify-between cursor-pointer group disabled:opacity-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-700 text-white rounded text-[10px] font-bold">
                      ਮੌਜੂਦਾ ਪੇਜ
                    </span>
                    <strong className="font-bold text-sm text-slate-900">
                      ਸਿਰਫ਼ {currentPage === 'page1' ? 'ਪੇਜ 1 (ਫਸਲ ਖਾਤਾ)' : currentPage === 'page2' ? 'ਪੇਜ 2 (ਐਡਵਾਂਸ ਖਾਤਾ)' : 'ਪੇਜ 3 (ਅੰਤਿਮ ਨਿਬੇੜਾ)'} ਦਾ PDF
                    </strong>
                  </div>
                  <p className="text-xs text-slate-500">
                    ਜੋ ਪੇਜ ਤੁਸੀਂ ਇਸ ਵੇਲੇ ਸਕ੍ਰੀਨ 'ਤੇ ਦੇਖ ਰਹੇ ਹੋ, ਸਿਰਫ਼ ਉਸੇ ਪੇਜ ਦਾ ਸਿੰਗਲ A4 PDF ਡਾਊਨਲੋਡ ਕਰੋ।
                  </p>
                </div>
                <FileDown className="w-5 h-5 text-slate-600 shrink-0 ml-2 group-hover:scale-110 transition" />
              </button>

              {/* Option 3: Classic 1-Sheet Reference Statement */}
              <button
                type="button"
                onClick={() => handleExportPdf('reference')}
                disabled={isExportingPdf}
                className="w-full p-4 bg-emerald-50/60 hover:bg-emerald-100/70 text-left rounded-2xl border-2 border-emerald-200 hover:border-emerald-300 transition flex items-start justify-between cursor-pointer group disabled:opacity-50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-bold">
                      ਕੰਪੈਕਟ A4
                    </span>
                    <strong className="font-bold text-sm text-emerald-950">
                      ਰਵਾਇਤੀ 1-ਪੇਜ ਰੈਫਰੈਂਸ ਸਟੇਟਮੈਂਟ PDF (Single Sheet A4)
                    </strong>
                  </div>
                  <p className="text-xs text-emerald-800">
                    ਸਾਰੀਆਂ ਖਰੀਦਾਂ, ਲੇਬਰ ਕਟੌਤੀਆਂ ਅਤੇ ਬਕਾਇਆ ਇੱਕੋ ਸਿੰਗਲ ਸ਼ੀਟ 'ਤੇ।
                  </p>
                </div>
                <FileDown className="w-5 h-5 text-emerald-700 shrink-0 ml-2 group-hover:scale-110 transition" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                ਗੁਰਮੁਖੀ ਪੰਜਾਬੀ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਦੋਵੇਂ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ ਉਪਲਬਧ
              </span>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ਬੰਦ ਕਰੋ (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* OFFSCREEN MULTI-PAGE CONTAINER FOR HIGH-RESOLUTION PDF CAPTURE       */}
      {/* ==================================================================== */}
      <div
        id="farmer-three-page-offscreen-wrapper"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0',
          width: '850px',
          zIndex: -100,
          pointerEvents: 'none',
          opacity: 1,
          backgroundColor: '#ffffff'
        }}
        aria-hidden="true"
      >
        {/* ================================================================ */}
        {/* PAGE 1 EXPORT SLIP: ਮੰਡੀ ਫਸਲ, ਤੁਲਾਈ, ਖਰੀਦ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਖਾਤਾ       */}
        {/* ================================================================ */}
        <div id="farmer-three-page-p1-export" className="p-8 bg-white text-slate-900 font-sans border-b-8 border-slate-200 space-y-4">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-950">
                {settings.firmNamePa || settings.firmNameEn || 'ਮੰਡੀ ਆੜ੍ਹਤ'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings.mandiNamePa || settings.mandiNameEn || 'ਅਨਾਜ ਮੰਡੀ ਪੰਜਾਬ'} {settings.licenseNumber ? `• ਲਾਇਸੈਂਸ ਨੰ: ${settings.licenseNumber}` : ''}
              </p>
              <p className="text-xs text-slate-500">
                ਮੋਬਾਈਲ: {settings.phone || settings.mobileNumber || '-'}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-black uppercase">
                ਪੇਜ 1: ਮੰਡੀ ਫਸਲ ਖਾਤਾ
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">
                ਸੀਜ਼ਨ: {activeCropSeason}
              </p>
              <p className="text-xs text-slate-400">
                ਮਿਤੀ: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Farmer Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer):</span>
              <strong className="text-sm text-slate-900 font-black">
                {farmer.farmerNamePa || farmer.farmerName} {farmer.fatherNamePa || farmer.fatherName ? `s/o ${farmer.fatherNamePa || farmer.fatherName}` : ''}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਪਿੰਡ (Village):</span>
              <strong className="text-slate-800 font-bold">{farmer.villagePa || farmer.village || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਖਾਤਾ ਨੰਬਰ (ID):</span>
              <strong className="text-slate-900 font-mono font-bold">{farmer.id}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਮੋਬਾਈਲ:</span>
              <strong className="text-slate-800 font-mono">{farmer.mobile || '-'}</strong>
            </div>
          </div>

          {/* Left / Right Tables */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Mandi Arrival */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-800 text-white px-3 py-1.5 text-xs font-black flex justify-between">
                <span>ਕਿਸਾਨ ਮੰਡੀ ਆਮਦ (Arrivals)</span>
                <span>{arrivalEntries.length} ਐਂਟਰੀਆਂ</span>
              </div>
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-1.5">ਮਿਤੀ</th>
                    <th className="p-1.5 text-center">ਬੋਰੀਆਂ</th>
                    <th className="p-1.5 text-right">ਵਜ਼ਨ</th>
                    <th className="p-1.5 text-right">ਰਕਮ (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arrivalEntries.slice(0, 15).map((e, i) => (
                    <tr key={i}>
                      <td className="p-1.5 font-mono">{e.date}</td>
                      <td className="p-1.5 text-center font-bold">{e.bags || (e.newBags + e.oldBags) || 0}</td>
                      <td className="p-1.5 text-right">{e.grandTotalDisplay || `${((e.grandTotalKg || 0) / 100).toFixed(2)}Q`}</td>
                      <td className="p-1.5 text-right font-mono">₹{Math.round(e.totalAmount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right: Agency Purchases */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-blue-800 text-white px-3 py-1.5 text-xs font-black flex justify-between">
                <span>ਏਜੰਸੀ ਖਰੀਦ (Purchases)</span>
                <span>{purchaseEntries.length} ਐਂਟਰੀਆਂ</span>
              </div>
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-1.5">ਏਜੰਸੀ</th>
                    <th className="p-1.5 text-center">ਬੋਰੀਆਂ</th>
                    <th className="p-1.5 text-right">ਵਜ਼ਨ</th>
                    <th className="p-1.5 text-right">ਰਕਮ (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchaseEntries.slice(0, 15).map((p, i) => (
                    <tr key={i}>
                      <td className="p-1.5 font-bold text-slate-800">{p.agencyName || 'ਮੰਡੀ ਖਰੀਦ'}</td>
                      <td className="p-1.5 text-center font-bold">{p.bags || 0}</td>
                      <td className="p-1.5 text-right">{p.weightDisplay || `${((p.totalWeightKg || 0) / 100).toFixed(2)}Q`}</td>
                      <td className="p-1.5 text-right font-mono font-bold text-blue-900">₹{Math.round(p.totalAmount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Calculations */}
          <div className="border-2 border-slate-300 rounded-xl p-3.5 bg-slate-50 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <span className="text-slate-600 block text-[10px]">ਕੁੱਲ ਆਈਆਂ ਬੋਰੀਆਂ</span>
                <strong className="text-emerald-950 font-black text-sm">{totalArrivalBags} ਬੋਰੀਆਂ</strong>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="text-slate-600 block text-[10px]">ਤੁਲੀਆਂ / ਖਰੀਦੀਆਂ</span>
                <strong className="text-blue-950 font-black text-sm">{totalPurchasedBags} ਬੋਰੀਆਂ</strong>
              </div>
              <div className="bg-amber-100 p-2 rounded-lg">
                <span className="text-slate-600 block text-[10px]">ਮੰਡੀ 'ਚ ਬਾਕੀ ਬੋਰੀਆਂ</span>
                <strong className="text-amber-950 font-black text-sm">{remainingBags} ਬੋਰੀਆਂ</strong>
              </div>
            </div>

            {/* Distinct Labour Deduction Breakdown in PDF */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold text-rose-900 border-b border-slate-200 pb-1">
                <span className="uppercase text-[11px] tracking-wide font-black">
                  ਮਨਫੀ (-) ਲੇਬਰ ਅਤੇ ਮਜ਼ਦੂਰੀ ਕਟੌਤੀਆਂ (Labour Deductions):
                </span>
                <span className="font-mono text-xs font-black text-rose-700">
                  -₹{Math.round(totalLabourDeductions).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                <div className="bg-rose-50/70 p-2 rounded border border-rose-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-rose-950 block">1. ਪੱਕੀ ਲੇਬਰ:</span>
                    <span className="text-[10px] text-slate-500 font-medium">{pakkiBags} ਬੋਰੀਆਂ @ ₹{pakkiRate}/ਬੋਰੀ</span>
                  </div>
                  <strong className="font-mono text-rose-800 font-bold">-₹{Math.round(pakkiAmount).toLocaleString('en-IN')}</strong>
                </div>
                <div className="bg-amber-50/70 p-2 rounded border border-amber-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-950 block">2. ਪੱਕਾ ਡਬਲ:</span>
                    <span className="text-[10px] text-slate-500 font-medium">{doubleBags} ਬੋਰੀਆਂ @ ₹{doubleRate}/ਬੋਰੀ</span>
                  </div>
                  <strong className="font-mono text-amber-900 font-bold">-₹{Math.round(doubleAmount).toLocaleString('en-IN')}</strong>
                </div>
                <div className="bg-orange-50/70 p-2 rounded border border-orange-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-orange-950 block">3. ਸੁੱਕੀ / ਝਾਰਾਈ:</span>
                    <span className="text-[10px] text-slate-500 font-medium">{sukkiBags} ਬੋਰੀਆਂ @ ₹{sukkiRate}/ਬੋਰੀ</span>
                  </div>
                  <strong className="font-mono text-orange-900 font-bold">-₹{Math.round(sukkiAmount).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
              <div>
                <span>ਫਸਲ ਦੀ ਕੁੱਲ ਰਕਮ: <strong>₹{Math.round(totalPurchasedAmount).toLocaleString('en-IN')}</strong></span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="text-rose-700">ਕੁੱਲ ਲੇਬਰ ਕਟੌਤੀ: <strong>-₹{Math.round(totalLabourDeductions).toLocaleString('en-IN')}</strong></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">ਫਸਲ ਦੀ ਸ਼ੁੱਧ ਰਕਮ (Net Crop Proceeds):</span>
                <strong className="text-emerald-800 text-base font-black font-mono">
                  ₹{Math.round(netCropProceeds).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-500">
            <div>ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ ਜਾਂ ਅੰਗੂਠਾ: ___________________</div>
            <div>ਆੜ੍ਹਤੀਆ ਦਸਤਖਤ ਤੇ ਮੋਹਰ: ___________________</div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PAGE 2 EXPORT SLIP: ਕਿਸਾਨ ਐਡਵਾਂਸ, ਉਧਾਰ ਅਤੇ ਵਿਆਜ ਖਾਤਾ                  */}
        {/* ================================================================ */}
        <div id="farmer-three-page-p2-export" className="p-8 bg-white text-slate-900 font-sans border-b-8 border-slate-200 space-y-4">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-950">
                {settings.firmNamePa || settings.firmNameEn || 'ਮੰਡੀ ਆੜ੍ਹਤ'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings.mandiNamePa || settings.mandiNameEn || 'ਅਨਾਜ ਮੰਡੀ ਪੰਜਾਬ'}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-black uppercase">
                ਪੇਜ 2: ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ ਖਾਤਾ
              </span>
              <p className="text-xs text-slate-400 mt-1">
                ਮਿਤੀ: {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Farmer Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block">ਕਿਸਾਨ:</span>
              <strong className="text-sm text-slate-900 font-black">{farmer.farmerNamePa || farmer.farmerName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਪਿੰਡ:</span>
              <strong className="text-slate-800">{farmer.villagePa || farmer.village || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਖਾਤਾ ਨੰ:</span>
              <strong className="text-slate-900 font-mono">{farmer.id}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਕੁੱਲ ਐਂਟਰੀਆਂ:</span>
              <strong className="text-slate-800 font-mono">{advances.length}</strong>
            </div>
          </div>

          {/* Summary Badges */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[10px]">1. ਪਿਛਲਾ ਬਕਾਇਆ</span>
              <strong className="text-slate-900 font-bold">₹{Math.round(openingBalance).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <span className="text-amber-800 block text-[10px]">2. ਕੁੱਲ ਮੂਲ ਰਕਮ</span>
              <strong className="text-amber-950 font-bold">₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              <span className="text-rose-800 block text-[10px]">3. ਕੁੱਲ ਵਿਆਜ (+)</span>
              <strong className="text-rose-950 font-bold">+₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-300">
              <span className="text-emerald-800 block text-[10px]">4. ਕੁੱਲ ਵਾਪਸੀਆਂ (-)</span>
              <strong className="text-emerald-950 font-bold">-₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-amber-100 p-2.5 rounded-lg border border-amber-300">
              <span className="text-amber-950 block text-[10px] font-black uppercase">5. ਸ਼ੁੱਧ ਬਾਕੀ ਦੇਣਦਾਰੀ</span>
              <strong className="text-amber-950 font-black text-sm">₹{Math.round(netAdvancePayableRemaining).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Mathematical Formula Banner for PDF */}
          <div className="bg-slate-100 border border-slate-300 rounded-lg p-2 flex justify-between items-center text-[11px] font-mono">
            <span className="font-bold text-slate-800 font-sans">
              ਗਣਿਤਿਕ ਸਮੀਕਰਨ: ਮੂਲ (₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}) + ਵਿਆਜ (+₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}) - ਵਾਪਸੀਆਂ (-₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')})
            </span>
            <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-black text-xs">
              = ਸ਼ੁੱਧ ਦੇਣਯੋਗ ₹{Math.round(netAdvancePayableRemaining).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Advance Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white p-2 text-xs font-bold flex justify-between">
              <span>ਦਿੱਤੇ ਗਏ ਐਡਵਾਂਸ ਅਤੇ ਵਿਆਜ ਹਿਸਾਬ (Advances & Accrued Interest)</span>
              <span>ਸ਼ੁੱਧ ਬਾਕੀ ਦੇਣਯੋਗ: ₹{Math.round(netAdvancePayableRemaining).toLocaleString('en-IN')}</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-2 w-8 text-center">ਲੜੀ</th>
                  <th className="p-2">ਤਾਰੀਖ਼</th>
                  <th className="p-2">ਕਿਸਮ ਤੇ ਵੇਰਵਾ</th>
                  <th className="p-2 text-right">ਲਿਆ ਮੂਲ (₹)</th>
                  <th className="p-2 text-center">ਵਿਆਜ ਦਰ ਤੇ ਸਮਾਂ</th>
                  <th className="p-2 text-right">ਬਣਿਆ ਵਿਆਜ</th>
                  <th className="p-2 text-right">ਵਾਪਸ ਆਏ</th>
                  <th className="p-2 text-right">ਸ਼ੁੱਧ ਦੇਣਯੋਗ (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-400">ਕੋਈ ਐਡਵਾਂਸ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।</td>
                  </tr>
                ) : (
                  advances.map((adv, idx) => {
                    const interest = Math.round(adv.interestAmount || 0);
                    const totalRepaid = (adv.repayments || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    const netPayable = Math.max(0, Math.round((adv.totalPayableWithInterest || (adv.amount + interest)) - totalRepaid));
                    return (
                      <React.Fragment key={idx}>
                        <tr className="bg-white">
                          <td className="p-2 text-center font-mono text-slate-400">#{idx + 1}</td>
                          <td className="p-2 font-mono font-bold text-slate-900">{adv.date}</td>
                          <td className="p-2 font-bold text-slate-700">
                            {adv.category === 'CASH' ? '💵 ਨਕਦ' :
                             adv.category === 'FERTILIZER' ? '🌱 ਖਾਦ' :
                             adv.category === 'DIESEL' ? '⛽ ਡੀਜ਼ਲ' :
                             adv.category === 'PESTICIDE' ? '🧪 ਦਵਾਈਆਂ' :
                             adv.category === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ' :
                             adv.category === 'CHEQUE' ? '🧾 ਚੈੱਕ' : adv.category || 'ਪੇਸ਼ਗੀ'}
                            {adv.itemDescription && (
                              <span className="block text-[10px] text-slate-500 font-normal">{adv.itemDescription}</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-mono font-bold">₹{Math.round(adv.amount || 0).toLocaleString('en-IN')}</td>
                          <td className="p-2 text-center text-[11px]">
                            {adv.isInterestFree ? '0% ਬਿਨਾਂ ਵਿਆਜ' : `${adv.monthlyInterestRate ?? 2}% (${adv.totalDays || 0} ਦਿਨ)`}
                          </td>
                          <td className="p-2 text-right font-mono text-rose-700 font-bold">
                            {interest > 0 ? `+₹${interest.toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="p-2 text-right font-mono text-emerald-700 font-bold">
                            {totalRepaid > 0 ? `-₹${Math.round(totalRepaid).toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="p-2 text-right font-mono font-black text-amber-950">
                            ₹{netPayable.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* Plain Gurmukhi Note directly under each row in PDF */}
                        <tr className="bg-slate-50 text-[10px] text-slate-600 border-b border-slate-200">
                          <td className="p-1 text-center text-slate-400">↳</td>
                          <td colSpan={7} className="p-1 text-slate-800">
                            {getEntryPlainPunjabiStory(adv)}
                          </td>
                        </tr>

                        {/* Repayment details with exact dates in PDF */}
                        {adv.repayments && adv.repayments.length > 0 && adv.repayments.map((rep, rIdx) => (
                          <tr key={`pdf-rep-${idx}-${rIdx}`} className="bg-emerald-50 text-[10px] text-emerald-950">
                            <td className="p-1.5 text-center font-mono font-bold text-emerald-800">✓</td>
                            <td className="p-1.5 font-mono font-bold text-emerald-900">ਵਾਪਸੀ: {rep.date}</td>
                            <td className="p-1.5 font-bold text-emerald-900" colSpan={3}>
                              ਕਿਸਾਨ ਵੱਲੋਂ ਕਿਸ਼ਤ ਵਾਪਸ: -₹{Math.round(rep.amount).toLocaleString('en-IN')} {rep.remarks ? `(${rep.remarks})` : ''} ({rep.paymentMode === 'CASH' ? 'ਨਕਦ' : 'ਬੈਂਕ'})
                            </td>
                            <td className="p-1.5 text-right font-mono text-slate-600">ਕਿਸ਼ਤ #{rIdx + 1}</td>
                            <td className="p-1.5 text-right font-mono font-black text-emerald-900">-₹{Math.round(rep.amount).toLocaleString('en-IN')}</td>
                            <td className="p-1.5 text-right font-mono text-slate-500">—</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Receipts & Recoveries Table in PDF */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
            <div className="bg-emerald-900 text-white p-2 text-xs font-black flex justify-between">
              <span>ਪ੍ਰਾਪਤ ਰਕਮ, ਰਿਕਵਰੀ ਅਤੇ ਸਿੱਧਾ ਭੁਗਤਾਨ ਰਸੀਦਾਂ (Payment Receipts & Recoveries)</span>
              <span>ਕੁੱਲ ਪ੍ਰਾਪਤ: ₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')}</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-emerald-50 text-emerald-950 border-b border-emerald-200 font-bold">
                <tr>
                  <th className="p-2">ਵਾਪਸੀ ਮਿਤੀ</th>
                  <th className="p-2">ਕਿਸਮ / ਖਾਤਾ</th>
                  <th className="p-2">ਭੁਗਤਾਨ ਢੰਗ</th>
                  <th className="p-2">ਰੈਫਰੈਂਸ / UTR</th>
                  <th className="p-2">ਏਜੰਸੀ / ਵੇਰਵਾ</th>
                  <th className="p-2 text-right">ਪ੍ਰਾਪਤ ਰਕਮ (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allRecoveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-center text-slate-400">ਕੋਈ ਵੱਖਰੀ ਰਿਕਵਰੀ ਜਾਂ ਭੁਗਤਾਨ ਰਸੀਦ ਦਰਜ ਨਹੀਂ ਹੈ।</td>
                  </tr>
                ) : (
                  allRecoveries.map((rec, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono font-bold text-emerald-950">{rec.date}</td>
                      <td className="p-2 font-semibold text-slate-800">{rec.typeLabel}</td>
                      <td className="p-2 font-bold text-slate-700">
                        {rec.mode === 'CASH' ? 'ਨਕਦ (Cash)' :
                         rec.mode === 'BANK_TRANSFER' ? 'ਬੈਂਕ (Bank)' :
                         (rec.mode as string) === 'RTGS' || (rec.mode as string) === 'NEFT' ? 'RTGS/NEFT' :
                         rec.mode === 'CHEQUE' ? 'ਚੈੱਕ (Cheque)' : rec.mode}
                      </td>
                      <td className="p-2 font-mono text-slate-600">{rec.ref || '—'}</td>
                      <td className="p-2 text-slate-600">
                        {rec.agency && rec.agency !== '—' ? `${rec.agency} ` : ''}
                        {rec.remarks && rec.remarks !== '—' ? `(${rec.remarks})` : ''}
                      </td>
                      <td className="p-2 text-right font-mono font-black text-emerald-900">
                        ₹{Math.round(rec.amount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-500">
            <div>ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ ਜਾਂ ਅੰਗੂਠਾ: ___________________</div>
            <div>ਆੜ੍ਹਤੀਆ ਦਸਤਖਤ ਤੇ ਮੋਹਰ: ___________________</div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PAGE 3 EXPORT SLIP: ਸੀਜ਼ਨ ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ ਤੇ ਲੈਣ-ਦੇਣ ਫੈਸਲਾ           */}
        {/* ================================================================ */}
        <div id="farmer-three-page-p3-export" className="p-8 bg-white text-slate-900 font-sans space-y-4">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-950">
                {settings.firmNamePa || settings.firmNameEn || 'ਮੰਡੀ ਆੜ੍ਹਤ'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {settings.mandiNamePa || settings.mandiNameEn || 'ਅਨਾਜ ਮੰਡੀ ਪੰਜਾਬ'}
              </p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-indigo-700 text-white rounded-lg text-xs font-black uppercase">
                ਪੇਜ 3: ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ
              </span>
              <p className="text-xs text-slate-400 mt-1">
                ਸੀਜ਼ਨ: {activeCropSeason}
              </p>
            </div>
          </div>

          {/* Farmer Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between text-xs">
            <div>
              <span className="text-slate-500 block">ਕਿਸਾਨ:</span>
              <strong className="text-sm text-slate-900 font-black">{farmer.farmerNamePa || farmer.farmerName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਪਿੰਡ:</span>
              <strong className="text-slate-800">{farmer.villagePa || farmer.village || '-'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਖਾਤਾ ਨੰਬਰ:</span>
              <strong className="text-slate-900 font-mono">{farmer.id}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">ਮੋਬਾਈਲ:</span>
              <strong className="text-slate-800 font-mono">{farmer.mobile || '-'}</strong>
            </div>
          </div>

          {/* 2-Column Ledger Summary */}
          <div className="grid grid-cols-2 gap-4">
            {/* Credit Column */}
            <div className="border-2 border-emerald-300 rounded-xl p-3.5 bg-emerald-50/50">
              <h4 className="font-black text-xs uppercase text-emerald-900 border-b border-emerald-200 pb-1.5 mb-2">
                1. ਕ੍ਰੈਡਿਟ / ਕਿਸਾਨ ਦੇ ਬਣਦੇ ਪੈਸੇ (+)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>ਫਸਲ ਦੀ ਸ਼ੁੱਧ ਰਕਮ (ਪੇਜ 1 ਤੋਂ):</span>
                  <strong className="font-mono text-emerald-900">₹{Math.round(netCropProceeds).toLocaleString('en-IN')}</strong>
                </div>
                {openingBalance < 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>ਪਿਛਲਾ ਜਮ੍ਹਾਂ ਬਕਾਇਆ:</span>
                    <strong className="font-mono">+₹{Math.abs(Math.round(openingBalance)).toLocaleString('en-IN')}</strong>
                  </div>
                )}
                <div className="pt-2 border-t border-emerald-300 flex justify-between font-black text-emerald-950">
                  <span>ਕੁੱਲ ਕ੍ਰੈਡਿਟ:</span>
                  <span className="font-mono text-sm">₹{Math.round(netCropProceeds + (openingBalance < 0 ? Math.abs(openingBalance) : 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Debit Column */}
            <div className="border-2 border-rose-300 rounded-xl p-3.5 bg-rose-50/50">
              <h4 className="font-black text-xs uppercase text-rose-900 border-b border-rose-200 pb-1.5 mb-2">
                2. ਡੈਬਿਟ / ਕਟੌਤੀਆਂ ਤੇ ਦੇਣਦਾਰੀਆਂ (-)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>ਐਡਵਾਂਸ ਤੇ ਵਿਆਜ (ਪੇਜ 2 ਤੋਂ):</span>
                  <strong className="font-mono text-rose-900">-₹{Math.round(totalAdvancePayable).toLocaleString('en-IN')}</strong>
                </div>
                {directPayments > 0 && (
                  <div className="flex justify-between text-blue-700">
                    <span>ਸਿੱਧੀ ਅਦਾਇਗੀ:</span>
                    <strong className="font-mono">-₹{Math.round(directPayments).toLocaleString('en-IN')}</strong>
                  </div>
                )}
                {openingBalance > 0 && (
                  <div className="flex justify-between text-rose-800">
                    <span>ਪਿਛਲਾ ਬਕਾਇਆ ਦੇਣਦਾਰ:</span>
                    <strong className="font-mono">-₹{Math.round(openingBalance).toLocaleString('en-IN')}</strong>
                  </div>
                )}
                <div className="pt-2 border-t border-rose-300 flex justify-between font-black text-rose-950">
                  <span>ਕੁੱਲ ਡੈਬਿਟ:</span>
                  <span className="font-mono text-sm">-₹{Math.round(totalAdvancePayable + directPayments + (openingBalance > 0 ? openingBalance : 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Big Decision Box */}
          <div className={`p-6 rounded-2xl border-4 text-center ${
            isPayableToFarmer
              ? 'bg-emerald-800 text-white border-emerald-400'
              : 'bg-rose-900 text-white border-rose-400'
          }`}>
            <span className="text-xs uppercase tracking-wider font-bold block opacity-90">
              ★ ਅੰਤਿਮ ਖਾਤਾ ਨਿਬੇੜਾ ਫੈਸਲਾ (Final Balance) ★
            </span>
            <h2 className="text-lg font-black mt-1">
              {isPayableToFarmer ? 'ਆੜ੍ਹਤੀ ਵੱਲੋਂ ਕਿਸਾਨ ਨੂੰ ਅੰਤਿਮ ਦੇਣਯੋਗ ਰਕਮ (Payable to Farmer)' : 'ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ (Due from Farmer)'}
            </h2>
            <div className="text-3xl font-black font-mono my-2 text-amber-300 drop-shadow-xs">
              ₹{Math.abs(Math.round(finalBalance)).toLocaleString('en-IN')}
            </div>
            <p className="text-xs opacity-80">
              ਦੋਵਾਂ ਧਿਰਾਂ ਦੀ ਆਪਸੀ ਸਹਿਮਤੀ ਨਾਲ ਖਾਤਾ ਚੈੱਕ ਕਰਕੇ ਸੀਜ਼ਨ ਦਾ ਹਿਸਾਬ ਪੱਕਾ ਕੀਤਾ ਗਿਆ।
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t-2 border-slate-300 flex justify-between text-xs text-slate-600">
            <div>
              <p className="mb-8">ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ ਜਾਂ ਅੰਗੂਠਾ:</p>
              <p className="font-bold">____________________________</p>
            </div>
            <div className="text-right">
              <p className="mb-8">ਆੜ੍ਹਤੀਆ ਦਸਤਖਤ ਤੇ ਮੋਹਰ:</p>
              <p className="font-bold">____________________________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
