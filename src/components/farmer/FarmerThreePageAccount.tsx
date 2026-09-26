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
  formatKgToQulKg
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
  Loader2
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

    return [...direct, ...reps].sort((a, b) => {
      const dateA = a.date.split('/').reverse().join('-');
      const dateB = b.date.split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    });
  }, [payments, advances]);

  const totalRecoveriesAmount = allRecoveries.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

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
                    <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2">ਮਿਤੀ (Date)</th>
                        <th className="py-2.5 px-2 text-center">ਬੋਰੀਆਂ (Bags)</th>
                        <th className="py-2.5 px-2 text-right">ਕੁੱਲ ਵਜ਼ਨ (Weight)</th>
                        <th className="py-2.5 px-2 text-right">ਰੇਟ (Rate)</th>
                        <th className="py-2.5 px-2 text-right">ਰਕਮ (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {arrivalEntries.map((entry, idx) => {
                        const bagsCount = entry.bags || (entry.newBags + entry.oldBags) || 0;
                        const weightDisplay = entry.grandTotalDisplay || entry.totalBagsWeightDisplay || `${(entry.grandTotalKg || 0) / 100} Qtl`;
                        return (
                          <tr key={entry.id || idx} className="hover:bg-emerald-50/40 transition">
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                              {entry.date}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="font-mono font-black text-emerald-800 text-xs px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                                {bagsCount}
                              </span>
                              {(entry.newBags > 0 || entry.oldBags > 0) && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {entry.newBags > 0 ? `ਨਵਾਂ: ${entry.newBags} ` : ''}
                                  {entry.oldBags > 0 ? `ਪੁਰਾਣਾ: ${entry.oldBags}` : ''}
                                </div>
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
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white">
                    ਪੇਜ 2 (Page 2)
                  </span>
                  <span className="text-amber-950 font-bold text-xs sm:text-sm">
                    ਕਿਸਾਨ ਐਡਵਾਂਸ, ਉਧਾਰ ਅਤੇ ਵਿਆਜ ਖਾਤਾ (Advance & Interest)
                  </span>
                </div>
                <p className="text-xs text-amber-900 mt-0.5">
                  ★ ਨੋਟ: ਇਹ ਪੈਸਿਆਂ ਦਾ ਲੈਣ-ਦੇਣ ਖਾਤਾ ਫਸਲ ਦੀ ਤੁਲਾਈ ਤੋਂ ਬਿਲਕੁਲ ਵੱਖਰਾ ਰੱਖਿਆ ਗਿਆ ਹੈ।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAdvanceModal}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>+ ਨਵਾਂ ਐਡਵਾਂਸ ਦਰਜ ਕਰੋ</span>
              </button>
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>+ ਰਿਕਵਰੀ / ਅਦਾਇਗੀ</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Cards (5 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Opening Balance */}
            <div className="bg-white border-2 border-slate-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">
                ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ
              </span>
              <strong className={`text-base sm:text-lg font-black font-mono block mt-1 ${
                openingBalance > 0 ? 'text-rose-700' : openingBalance < 0 ? 'text-emerald-700' : 'text-slate-700'
              }`}>
                {openingBalance !== 0 ? `₹${Math.abs(Math.round(openingBalance)).toLocaleString('en-IN')}` : '₹0'}
              </strong>
              <span className="text-[10px] text-slate-400">
                {openingBalance > 0 ? '(ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ ਸੀ)' : openingBalance < 0 ? '(ਕਿਸਾਨ ਦੇ ਜਮ੍ਹਾਂ ਸਨ)' : 'ਕੋਈ ਪਿਛਲਾ ਬਕਾਇਆ ਨਹੀਂ'}
              </span>
            </div>

            {/* Total Principal */}
            <div className="bg-white border-2 border-amber-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">
                ਕੁੱਲ ਐਡਵਾਂਸ (ਮੂਲ ਰਕਮ)
              </span>
              <strong className="text-base sm:text-lg font-black text-amber-900 font-mono block mt-1">
                ₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-slate-400">
                ਕੁੱਲ {advances.length} ਐਂਟਰੀਆਂ
              </span>
            </div>

            {/* Total Interest */}
            <div className="bg-white border-2 border-rose-200 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase block">
                ਕੁੱਲ ਬਣਿਆ ਵਿਆਜ (Interest)
              </span>
              <strong className="text-base sm:text-lg font-black text-rose-700 font-mono block mt-1">
                ₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-slate-400">
                ਮਿਤੀ ਅਨੁਸਾਰ ਦਿਨ/ਮਹੀਨੇ ਹਿਸਾਬ
              </span>
            </div>

            {/* Total Payable with Interest */}
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-black uppercase block text-amber-100">
                ਕੁੱਲ ਦੇਣਦਾਰੀ (ਵਿਆਜ ਸਮੇਤ)
              </span>
              <strong className="text-lg sm:text-xl font-black font-mono block mt-1 text-white">
                ₹{Math.round(totalAdvancePayable).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-amber-200">
                ਮੂਲ ਰਕਮ + ਵਿਆਜ
              </span>
            </div>

            {/* Total Recoveries & Direct Payments Received */}
            <div className="bg-white border-2 border-emerald-300 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                ਕੁੱਲ ਪ੍ਰਾਪਤ / ਵਾਪਸ ਆਏ ਪੈਸੇ (Total Recovered)
              </span>
              <strong className="text-base sm:text-lg font-black text-emerald-700 font-mono block mt-1">
                ₹{Math.round(totalRecoveriesAmount).toLocaleString('en-IN')}
              </strong>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {allRecoveries.length} ਵਾਪਸੀਆਂ / ਰਸੀਦਾਂ ਦਰਜ
              </span>
            </div>
          </div>

          {/* Advances Table */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  ਦਿੱਤੇ ਗਏ ਐਡਵਾਂਸ ਅਤੇ ਵਿਆਜ ਦੀ ਪੂਰੀ ਸੂਚੀ (Date-wise Advances)
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-mono font-bold">
                {advances.length} ਐਂਟਰੀਆਂ
              </span>
            </div>

            <div className="p-3 overflow-x-auto">
              {advances.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Coins className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">ਇਸ ਕਿਸਾਨ ਦੇ ਨਾਮ ਕੋਈ ਐਡਵਾਂਸ ਜਾਂ ਉਧਾਰ ਦਰਜ ਨਹੀਂ ਹੈ।</p>
                  <p className="text-[11px] text-slate-400 mt-1">ਨਵਾਂ ਐਡਵਾਂਸ ਜੋੜਨ ਲਈ ਉੱਪਰ ਦਿੱਤਾ ਬਟਨ ਵਰਤੋ।</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2">ਮਿਤੀ (Date)</th>
                      <th className="py-2.5 px-2">ਕਿਸਮ / ਵੇਰਵਾ (Category)</th>
                      <th className="py-2.5 px-2 text-right">ਮੂਲ ਰਕਮ (Principal)</th>
                      <th className="py-2.5 px-2 text-center">ਵਿਆਜ ਦਰ (Rate)</th>
                      <th className="py-2.5 px-2 text-center">ਦਿਨ / ਮਹੀਨੇ</th>
                      <th className="py-2.5 px-2 text-right">ਵਿਆਜ (Interest)</th>
                      <th className="py-2.5 px-2 text-right">ਕੁੱਲ ਰਕਮ (Total)</th>
                      <th className="py-2.5 px-2 text-center">ਕਾਰਵਾਈ (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {advances.map((adv) => {
                      const netPayable = adv.totalPayableWithInterest || (adv.amount + (adv.interestAmount || 0));
                      return (
                        <React.Fragment key={adv.id}>
                          <tr className="hover:bg-amber-50/40 transition">
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                              {adv.date}
                            </td>
                            <td className="py-2.5 px-2">
                              <span className="font-bold text-slate-900 block">
                                {adv.category === 'CASH' ? '💵 ਨਕਦ (Cash)' :
                                 adv.category === 'FERTILIZER' ? '🌱 ਖਾਦ (Fertilizer)' :
                                 adv.category === 'DIESEL' ? '⛽ ਡੀਜ਼ਲ (Diesel)' :
                                 adv.category === 'PESTICIDE' ? '🧪 ਦਵਾਈਆਂ (Pesticide)' :
                                 adv.category === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ (Transfer)' :
                                 adv.category === 'CHEQUE' ? '🧾 ਚੈੱਕ (Cheque)' : adv.category}
                              </span>
                              {adv.itemDescription && (
                                <span className="text-[10px] text-slate-500 block">{adv.itemDescription}</span>
                              )}
                              {adv.repayments && adv.repayments.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {adv.repayments.map((rep, rIdx) => (
                                    <span key={rIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded border border-emerald-300 mr-1">
                                      <span>📅 ਵਾਪਸੀ ਮਿਤੀ: {rep.date}</span>
                                      <span className="text-emerald-950 font-black">₹{Math.round(rep.amount).toLocaleString('en-IN')} ਵਾਪਸ</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900">
                              ₹{Math.round(adv.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              {adv.isInterestFree ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  ਬਿਨਾਂ ਵਿਆਜ
                                </span>
                              ) : (
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  {adv.monthlyInterestRate || 2}% / ਮਹੀਨਾ
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px]">
                              {adv.totalDays ? `${adv.totalDays} ਦਿਨ` : '-'}
                              {adv.monthsElapsed ? ` (${adv.monthsElapsed} ਮਹੀਨੇ)` : ''}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-700">
                              ₹{Math.round(adv.interestAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-black text-amber-900 text-xs">
                              ₹{Math.round(netPayable).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {onViewVoucher && (
                                  <button
                                    type="button"
                                    onClick={() => onViewVoucher(adv)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                                    title="ਵਾਊਚਰ ਦੇਖੋ"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onOpenRepayment && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenRepayment(adv)}
                                    className="p-1 hover:bg-emerald-100 rounded text-emerald-700 cursor-pointer"
                                    title="ਕਿਸ਼ਤ ਵਾਪਸੀ / ਰਿਕਵਰੀ ਦਰਜ ਕਰੋ"
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
                                    title="ਡਿਲੀਟ ਕਰੋ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Detailed Farmer Repayment Sub-Rows showing Exact Date and Amount returned */}
                          {adv.repayments && adv.repayments.length > 0 && adv.repayments.map((rep, rIdx) => (
                            <tr key={`adv-rep-${adv.id}-${rep.id || rIdx}`} className="bg-emerald-50/80 border-b border-emerald-100 text-xs">
                              <td className="py-2 px-2 font-mono font-bold text-emerald-900 text-center bg-emerald-100/50">
                                ↳ ਵਾਪਸੀ: {rep.date}
                              </td>
                              <td className="py-2 px-2" colSpan={2}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-emerald-950">
                                    ਕਿਸਾਨ ਵੱਲੋਂ ਕਿਸ਼ਤ ਵਾਪਸ:
                                  </span>
                                  <span className="font-black font-mono text-emerald-800 text-sm">
                                    -₹{Math.round(rep.amount).toLocaleString('en-IN')}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                                    {rep.paymentMode === 'CASH' ? '💵 ਨਕਦ (Cash)' :
                                     rep.paymentMode === 'BANK_TRANSFER' ? '🏦 ਬੈਂਕ' :
                                     (rep.paymentMode as string) === 'RTGS' || (rep.paymentMode as string) === 'NEFT' ? '⚡ RTGS/NEFT' :
                                     rep.paymentMode === 'CHEQUE' ? '📝 ਚੈੱਕ' : rep.paymentMode}
                                  </span>
                                  {rep.remarks && (
                                    <span className="text-[11px] text-emerald-700 italic">
                                      • {rep.remarks}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-center text-[11px] text-emerald-800 font-bold">
                                ਕਿਸ਼ਤ #{rIdx + 1}
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-slate-700 text-[11px]">
                                ਮਿਤੀ: <strong className="text-emerald-950">{rep.date}</strong>
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-slate-700 text-xs">
                                ਬਾਕੀ ਮੂਲ: <strong className="text-slate-950">₹{Math.round(adv.netPrincipalRemaining ?? (adv.amount - (adv.totalRepaid || 0))).toLocaleString('en-IN')}</strong>
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-black text-emerald-900">
                                -₹{Math.round(rep.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {onDeleteRepayment && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteRepayment(adv.id, rep.id, rep.amount)}
                                    className="p-1 hover:bg-rose-100 rounded text-rose-600 cursor-pointer"
                                    title="ਇਹ ਵਾਪਸੀ ਕਿਸ਼ਤ ਹਟਾਓ (Delete Repayment)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Sub-Total */}
            <div className="bg-amber-50 p-3.5 border-t-2 border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-amber-950 font-bold">
                ਕੁੱਲ ਐਡਵਾਂਸ ਮੂਲ ਰਕਮ: <strong className="font-mono">₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}</strong> | 
                ਕੁੱਲ ਵਿਆਜ: <strong className="font-mono text-rose-700">₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}</strong>
              </div>
              <div className="text-right">
                <span className="text-amber-900 font-bold block">ਕੁੱਲ ਦੇਣਦਾਰੀ (Total Payable):</span>
                <span className="text-base font-black text-amber-950 font-mono">
                  ₹{Math.round(totalAdvancePayable).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 2.4 PAYMENTS & RECEIVING TABLE (ਰਿਕਵਰੀ, ਪ੍ਰਾਪਤੀ ਤੇ ਭੁਗਤਾਨ ਰਸੀਦਾਂ) */}
          {/* ========================================================== */}
          <div className="bg-white rounded-2xl border-2 border-emerald-300 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    ਪ੍ਰਾਪਤ ਰਕਮ, ਰਿਕਵਰੀ ਅਤੇ ਸਿੱਧਾ ਭੁਗਤਾਨ ਰਸੀਦਾਂ (Payment Receipts & Recoveries)
                  </h3>
                  <p className="text-[11px] text-emerald-200 mt-0.5">
                    ਕਿਸਾਨ ਵੱਲੋਂ ਵਾਪਸ ਕੀਤੀ ਰਕਮ, ਬੈਂਕ ਟ੍ਰਾਂਸਫਰ ਜਾਂ ਆੜ੍ਹਤੀਏ ਵੱਲੋਂ ਕੀਤੀ ਗਈ ਅਦਾਇਗੀ ਰਸੀਦਾਂ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-mono font-bold">
                  {payments.length} ਰਸੀਦਾਂ (ਕੁੱਲ ₹{Math.round(directPayments).toLocaleString('en-IN')})
                </span>
                <button
                  type="button"
                  onClick={onOpenPaymentModal}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ਨਵੀਂ ਰਿਕਵਰੀ / ਭੁਗਤਾਨ</span>
                </button>
              </div>
            </div>

            <div className="p-3 overflow-x-auto">
              {payments.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">ਇਸ ਕਿਸਾਨ ਲਈ ਕੋਈ ਸਿੱਧੀ ਰਿਕਵਰੀ ਜਾਂ ਭੁਗਤਾਨ ਰਸੀਦ ਦਰਜ ਨਹੀਂ ਹੈ।</p>
                  <p className="text-[11px] text-slate-400 mt-1">ਨਵੀਂ ਰਿਕਵਰੀ ਜਾਂ ਭੁਗਤਾਨ ਦਰਜ ਕਰਨ ਲਈ ਉੱਪਰ ਦਿੱਤਾ ਬਟਨ ਵਰਤੋ।</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-emerald-50 text-emerald-950 font-black uppercase text-[11px] border-b border-emerald-200">
                    <tr>
                      <th className="py-2.5 px-3">ਮਿਤੀ (Date)</th>
                      <th className="py-2.5 px-3">ਢੰਗ (Payment Mode)</th>
                      <th className="py-2.5 px-3">ਰਸੀਦ / ਰੈਫਰੈਂਸ / UTR</th>
                      <th className="py-2.5 px-3">ਖਰੀਦ ਏਜੰਸੀ (Agency)</th>
                      <th className="py-2.5 px-3">ਵੇਰਵਾ (Remarks)</th>
                      <th className="py-2.5 px-3 text-right">ਪ੍ਰਾਪਤ ਰਕਮ (Amount ₹)</th>
                      <th className="py-2.5 px-3 text-center">ਕਾਰਵਾਈ (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-emerald-50/40 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {pay.date}
                        </td>
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3">
                          {pay.referenceNumber ? (
                            <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {pay.referenceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">ਕੋਈ ਰੈਫਰੈਂਸ ਨਹੀਂ</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {pay.agency || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {pay.remarks || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 text-sm">
                          ₹{Math.round(pay.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {onDeletePayment && (
                            <button
                              type="button"
                              onClick={() => onDeletePayment(pay.id)}
                              className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition cursor-pointer"
                              title="ਇਹ ਭੁਗਤਾਨ / ਰਿਕਵਰੀ ਰਿਕਾਰਡ ਹਟਾਓ (Delete Payment)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Sub-Total */}
            <div className="bg-emerald-50 p-3.5 border-t-2 border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-emerald-950 font-bold">
                ਕੁੱਲ ਪ੍ਰਾਪਤ / ਰਿਕਵਰੀ ਐਂਟਰੀਆਂ: <strong className="font-mono">{payments.length}</strong> | 
                ਆਖਰੀ ਅੱਪਡੇਟ: <strong className="font-mono text-slate-700">{payments[0]?.date || '—'}</strong>
              </div>
              <div className="text-right">
                <span className="text-emerald-900 font-bold block">ਕੁੱਲ ਪ੍ਰਾਪਤ ਰਕਮ (Total Paid / Recovered):</span>
                <span className="text-base font-black text-emerald-950 font-mono">
                  ₹{Math.round(directPayments).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation & PDF Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentPage('page1')}
              className="w-full sm:w-auto px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition"
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
              className="w-full sm:w-auto px-5 py-3 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-95"
            >
              <span>ਅੱਗੇ ਪੇਜ 3 (ਅੰਤਿਮ ਨਿਬੇੜਾ ਤੇ ਫੈਸਲਾ) 'ਤੇ ਜਾਓ</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
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
              <span className="text-slate-500 block text-[10px]">ਪਿਛਲਾ ਬਕਾਇਆ</span>
              <strong className="text-slate-900 font-bold">₹{Math.round(openingBalance).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <span className="text-amber-800 block text-[10px]">ਕੁੱਲ ਮੂਲ ਰਕਮ</span>
              <strong className="text-amber-950 font-bold">₹{Math.round(totalAdvancePrincipal).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              <span className="text-rose-800 block text-[10px]">ਕੁੱਲ ਵਿਆਜ</span>
              <strong className="text-rose-950 font-bold">₹{Math.round(totalAdvanceInterest).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-amber-100 p-2.5 rounded-lg border border-amber-300">
              <span className="text-amber-950 block text-[10px]">ਕੁੱਲ ਦੇਣਦਾਰੀ</span>
              <strong className="text-amber-950 font-black text-sm">₹{Math.round(totalAdvancePayable).toLocaleString('en-IN')}</strong>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-300">
              <span className="text-emerald-800 block text-[10px]">ਕੁੱਲ ਪ੍ਰਾਪਤ / ਰਿਕਵਰੀ</span>
              <strong className="text-emerald-950 font-black text-sm">₹{Math.round(directPayments).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Advance Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-800 text-white p-2 text-xs font-bold flex justify-between">
              <span>ਦਿੱਤੇ ਗਏ ਐਡਵਾਂਸ ਅਤੇ ਵਿਆਜ ਹਿਸਾਬ (Advances & Accrued Interest)</span>
              <span>ਕੁੱਲ ਦੇਣਯੋਗ: ₹{Math.round(totalAdvancePayable).toLocaleString('en-IN')}</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-2">ਤਾਰੀਖ਼</th>
                  <th className="p-2">ਕਿਸਮ</th>
                  <th className="p-2">ਵੇਰਵਾ</th>
                  <th className="p-2 text-right">ਮੂਲ ਰਕਮ (₹)</th>
                  <th className="p-2 text-center">ਵਿਆਜ ਦਰ</th>
                  <th className="p-2 text-right">ਬਣਿਆ ਵਿਆਜ</th>
                  <th className="p-2 text-right">ਕੁੱਲ ਦੇਣਯੋਗ (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400">ਕੋਈ ਐਡਵਾਂਸ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।</td>
                  </tr>
                ) : (
                  advances.map((adv, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono">{adv.date}</td>
                      <td className="p-2 font-bold text-slate-700">{adv.type || 'ਨਗਦ'}</td>
                      <td className="p-2 text-slate-600">
                        {adv.remarks || '-'}
                        {adv.repayments && adv.repayments.length > 0 && (
                          <span className="block text-[10px] text-emerald-700 font-bold">
                            ₹{(adv.totalRepaid || 0).toLocaleString('en-IN')} ਵਾਪਸ ({adv.repayments.length} ਕਿਸ਼ਤਾਂ)
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono font-bold">₹{Math.round(adv.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="p-2 text-center text-[11px]">{adv.interestRate || adv.monthlyInterestRate || 0}%</td>
                      <td className="p-2 text-right font-mono text-rose-700">₹{Math.round(adv.calculatedInterest || adv.interestAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="p-2 text-right font-mono font-black text-amber-950">₹{Math.round(adv.totalPayableWithInterest || ((adv.amount || 0) + (adv.calculatedInterest || adv.interestAmount || 0))).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Receipts & Recoveries Table in PDF */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
            <div className="bg-emerald-900 text-white p-2 text-xs font-black flex justify-between">
              <span>ਪ੍ਰਾਪਤ ਰਕਮ, ਰਿਕਵਰੀ ਅਤੇ ਸਿੱਧਾ ਭੁਗਤਾਨ ਰਸੀਦਾਂ (Payment Receipts & Recoveries)</span>
              <span>ਕੁੱਲ ਪ੍ਰਾਪਤ: ₹{Math.round(directPayments).toLocaleString('en-IN')}</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-emerald-50 text-emerald-950 border-b border-emerald-200 font-bold">
                <tr>
                  <th className="p-2">ਤਾਰੀਖ਼</th>
                  <th className="p-2">ਭੁਗਤਾਨ ਢੰਗ</th>
                  <th className="p-2">ਰੈਫਰੈਂਸ / UTR</th>
                  <th className="p-2">ਏਜੰਸੀ</th>
                  <th className="p-2">ਵੇਰਵਾ</th>
                  <th className="p-2 text-right">ਪ੍ਰਾਪਤ ਰਕਮ (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-center text-slate-400">ਕੋਈ ਵੱਖਰੀ ਰਿਕਵਰੀ ਜਾਂ ਭੁਗਤਾਨ ਰਸੀਦ ਦਰਜ ਨਹੀਂ ਹੈ।</td>
                  </tr>
                ) : (
                  payments.map((pay, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono">{pay.date}</td>
                      <td className="p-2 font-bold text-slate-700">
                        {pay.paymentMode === 'CASH' ? 'ਨਕਦ (Cash)' :
                         pay.paymentMode === 'BANK_TRANSFER' ? 'ਬੈਂਕ (Bank)' :
                         (pay.paymentMode as string) === 'RTGS' || (pay.paymentMode as string) === 'NEFT' ? 'RTGS/NEFT' :
                         pay.paymentMode === 'CHEQUE' ? 'ਚੈੱਕ (Cheque)' : pay.paymentMode}
                      </td>
                      <td className="p-2 font-mono text-slate-600">{pay.referenceNumber || '—'}</td>
                      <td className="p-2 text-slate-600">{pay.agency || '—'}</td>
                      <td className="p-2 text-slate-600">{pay.remarks || '—'}</td>
                      <td className="p-2 text-right font-mono font-black text-emerald-900">
                        ₹{Math.round(pay.amount || 0).toLocaleString('en-IN')}
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
