import React, { useState } from 'react';
import { 
  Printer, 
  ArrowLeftRight, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  FileDown, 
  Calendar,
  Share2,
  Receipt
} from 'lucide-react';
import { FarmerAccountSummary, Farmer, MandiSettings } from '../../types/mandi';
import { formatCurrency, formatCurrencyINR } from '../../utils/calculations';
import { openWhatsApp } from '../../utils/whatsappNotification';

interface FarmerTFormatLedgerProps {
  farmer: Farmer;
  account: FarmerAccountSummary;
  settings: MandiSettings;
  firmName?: string;
  firmMobile?: string;
  onClose?: () => void;
  onOpenMiniSlip?: () => void;
}

interface DebitEntry {
  id: string;
  date: string;
  title: string;
  subTitle?: string;
  category: 'ADVANCE' | 'LABOUR' | 'PAYMENT' | 'ADJUSTMENT' | 'OTHER';
  amount: number;
  bags?: number;
  weight?: string;
  ref?: string;
}

interface CreditEntry {
  id: string;
  date: string;
  title: string;
  subTitle?: string;
  category: 'PURCHASE' | 'ARRIVAL' | 'ADJUSTMENT' | 'OTHER';
  amount: number;
  bags?: number;
  weight?: string;
  rate?: number;
  agency?: string;
}

export const FarmerTFormatLedger: React.FC<FarmerTFormatLedgerProps> = ({
  farmer,
  account,
  settings,
  firmName = settings.firmNamePa || settings.firmNameEn || 'ਮੰਡੀ ਆੜ੍ਹਤ (Mandi Commission Agent)',
  firmMobile = settings.firmMobile,
  onClose,
  onOpenMiniSlip
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'crop'>('all');

  // 1. Build Debit (ਨਾਮੇ / Dr.) Entries:
  // Farmer draws cash/advances, deductions/labour cut, and payments issued to farmer.
  const debitList: DebitEntry[] = [];

  // A. Mandi Labour & Deductions
  if (account.labourRecords && account.labourRecords.length > 0) {
    account.labourRecords.forEach((lr) => {
      if (lr.totalLabourAmount > 0) {
        debitList.push({
          id: `labour-${lr.id}`,
          date: lr.date || '—',
          title: 'ਮੰਡੀ ਮਜ਼ਦੂਰੀ / ਲੇਬਰ ਕਟੌਤੀ',
          subTitle: `${lr.bags || 0} ਬੋਰੀਆਂ (ਦਰ ₹${lr.labourRatePerBag || 0}/ਬੋਰੀ)`,
          category: 'LABOUR',
          amount: lr.totalLabourAmount,
          bags: lr.bags
        });
      }
    });
  } else if ((account.totalLabourDeductions || 0) > 0) {
    debitList.push({
      id: 'labour-total',
      date: 'ਕੁੱਲ ਸੀਜ਼ਨ',
      title: 'ਮੰਡੀ ਲੇਬਰ ਤੇ ਕਟੌਤੀਆਂ (Labour Deductions)',
      subTitle: 'ਪੱਕੀ ਲੇਬਰ, ਝਾਰਾਈ, ਸਿਲਾਈ ਆਦਿ',
      category: 'LABOUR',
      amount: account.totalLabourDeductions
    });
  }

  // B. Advance Records (Principal + Interest)
  if (account.advances && account.advances.length > 0) {
    account.advances.forEach((adv) => {
      const remainingPrincipal = Math.max(0, adv.amount - (adv.repaidPrincipal || 0));
      const interest = adv.interestAmount || 0;
      const totalAdvance = remainingPrincipal + interest;

      if (totalAdvance > 0) {
        debitList.push({
          id: `adv-${adv.id}`,
          date: adv.date || '—',
          title: `ਲਿਆ ਪੇਸ਼ਗੀ ਐਡਵਾਂਸ (${adv.category || 'ਨਕਦ'})`,
          subTitle: interest > 0 
            ? `ਮੂਲ: ₹${remainingPrincipal.toLocaleString('en-IN')} + ਵਿਆਜ: ₹${Math.round(interest).toLocaleString('en-IN')}`
            : `ਮੂਲ ਰਕਮ: ₹${remainingPrincipal.toLocaleString('en-IN')} (ਬਿਨਾਂ ਵਿਆਜ)`,
          category: 'ADVANCE',
          amount: totalAdvance,
          ref: adv.itemDescription
        });
      }
    });
  }

  // C. Direct Payments Made to Farmer (Cash, Bank, RTGS)
  if (account.paymentRecords && account.paymentRecords.length > 0) {
    account.paymentRecords.forEach((pay) => {
      debitList.push({
        id: `pay-${pay.id}`,
        date: pay.date || '—',
        title: `ਭੁਗਤਾਨ / ਰਕਮ ਅਦਾਇਗੀ (${pay.paymentMode})`,
        subTitle: pay.referenceNumber ? `UTR/Ref: ${pay.referenceNumber}` : pay.agency || 'ਅਦਾਇਗੀ ਕੀਤੀ',
        category: 'PAYMENT',
        amount: pay.amount,
        ref: pay.referenceNumber
      });
    });
  }

  // D. Payment Transfer adjustments (Debit transfers)
  if (account.paymentAdjustments && account.paymentAdjustments.length > 0) {
    account.paymentAdjustments.forEach((adj) => {
      if (adj.toFarmerId === farmer.id && adj.amount > 0) {
        // Transfer received or adjusted
        debitList.push({
          id: `adj-${adj.id}`,
          date: adj.date || '—',
          title: `ਖਾਤਾ ਬਦਲੀ / ਐਡਜਸਟਮੈਂਟ (${adj.notes || 'ਟਰਾਂਸਫਰ'})`,
          subTitle: `ਤੋਂ: ${adj.fromFarmerName || adj.fromFarmerId}`,
          category: 'ADJUSTMENT',
          amount: adj.amount
        });
      }
    });
  }

  // 2. Build Credit (ਜਮ੍ਹਾਂ / Cr.) Entries:
  // Farmer sells crops/grains (Purchases/Arrivals)
  const creditList: CreditEntry[] = [];

  // A. Purchased Grain (From Agencies or Direct Arhtiya)
  if (account.agencyPurchases && account.agencyPurchases.length > 0) {
    account.agencyPurchases.forEach((p) => {
      creditList.push({
        id: `purch-${p.id}`,
        date: p.date || '—',
        title: `ਫਸਲ ਵਿਕਰੀ (${p.cropType || 'ਕਣਕ/ਝੋਨਾ'})`,
        subTitle: `${p.agency ? `ਏਜੰਸੀ: ${p.agency} • ` : ''}${p.bags} ਬੋਰੀਆਂ (${p.weightDisplay || (p.weightKg ? (p.weightKg / 100).toFixed(2) + ' ਕੁ.' : '')})`,
        category: 'PURCHASE',
        amount: p.totalAmount,
        bags: p.bags,
        weight: p.weightDisplay || (p.weightKg ? (p.weightKg / 100).toFixed(2) + ' ਕੁ.' : undefined),
        rate: p.ratePerQtl,
        agency: p.agency
      });
    });
  } else if (account.arrivalRecords && account.arrivalRecords.length > 0) {
    // If only arrival records exist
    account.arrivalRecords.forEach((arr) => {
      creditList.push({
        id: `arr-${arr.id}`,
        date: arr.date || '—',
        title: `ਮੰਡੀ ਆਮਦ ਤੁਲਾਈ (${arr.cropType || 'ਜਿਣਸ'})`,
        subTitle: `${arr.bags} ਬੋਰੀਆਂ (${arr.totalWeightDisplay || ''})`,
        category: 'ARRIVAL',
        amount: arr.totalAmount,
        bags: arr.bags,
        weight: arr.totalWeightDisplay,
        rate: arr.ratePerQtl
      });
    });
  } else if ((account.totalGrossAmount || 0) > 0) {
    creditList.push({
      id: 'gross-total',
      date: 'ਕੁੱਲ ਸੀਜ਼ਨ',
      title: 'ਕੁੱਲ ਫਸਲ ਵਿਕਰੀ ਰਕਮ (Crop Proceeds)',
      subTitle: `${account.purchasedBags || account.mandiArrivalBags || 0} ਬੋਰੀਆਂ`,
      category: 'PURCHASE',
      amount: account.totalGrossAmount,
      bags: account.purchasedBags || account.mandiArrivalBags
    });
  }

  // Equalize row counts so left & right align like a real Munim book
  const maxRows = Math.max(debitList.length, creditList.length, 1);
  const alignedRows = Array.from({ length: maxRows });

  // Totals
  const totalDebit = debitList.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCredit = creditList.reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalCredit - totalDebit;
  const isPayableToFarmer = netBalance >= 0;

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const farmerName = farmer.farmerNamePa || farmer.farmerName;
    const balanceText = isPayableToFarmer
      ? `★ ਆੜ੍ਹਤੀ ਵੱਲੋਂ ਕਿਸਾਨ ਨੂੰ ਬਾਕੀ ਦੇਣਯੋਗ: ₹${Math.abs(Math.round(netBalance)).toLocaleString('en-IN')}`
      : `★ ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ: ₹${Math.abs(Math.round(netBalance)).toLocaleString('en-IN')}`;

    const text = [
      `🌾 *${firmName}*`,
      `⚖️ *ਰਵਾਇਤੀ T-Format ਵਹੀ-ਖਾਤਾ / Ledger*`,
      `---------------------------------`,
      `👤 *ਕਿਸਾਨ:* ${farmerName} (${farmer.farmerName})`,
      `🏡 *ਪਿੰਡ:* ${farmer.village || '—'} | 🆔 *ਖਾਤਾ:* ${farmer.id}`,
      `📅 *ਮਿਤੀ:* ${new Date().toLocaleDateString('en-GB')}`,
      `---------------------------------`,
      `👉 *ਸੱਜਾ ਪਾਸਾ (ਜਮ੍ਹਾਂ / Cr. - ਫਸਲ ਕਮਾਈ):*`,
      `   ਕੁੱਲ ਫਸਲ ਰਕਮ: ₹${Math.round(totalCredit).toLocaleString('en-IN')}`,
      `   ਕੁੱਲ ਬੋਰੀਆਂ: ${account.purchasedBags || account.mandiArrivalBags || 0}`,
      `👈 *ਖੱਬਾ ਪਾਸਾ (ਨਾਮੇ / Dr. - ਐਡਵਾਂਸ/ਖਰਚੇ):*`,
      `   ਕੁੱਲ ਨਾਮੇ ਰਕਮ: ₹${Math.round(totalDebit).toLocaleString('en-IN')}`,
      `---------------------------------`,
      `⚖️ *ਆਖਰੀ ਨਿਬੇੜਾ (Net Balance):*`,
      `${balanceText}`,
      `---------------------------------`,
      `_ਧੰਨਵਾਦ!_`
    ].join('\n');

    openWhatsApp(farmer.mobile, text);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Controls (Hidden on Print) */}
      <div className="bg-gradient-to-r from-amber-700 via-yellow-800 to-amber-900 text-white rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                ਰਵਾਇਤੀ ਮੁਨੀਮੀ ਬਹੀ-ਖਾਤਾ
              </span>
              <span className="text-amber-200 text-xs font-semibold">T-Format Ledger View</span>
            </div>
            <h2 className="text-base sm:text-lg font-black mt-0.5">
              {farmer.farmerNamePa || farmer.farmerName} ({farmer.farmerName}) — ਆਹਮੋ-ਸਾਹਮਣੇ ਨਾਮੇ/ਜਮ੍ਹਾਂ ਹਿਸਾਬ
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onOpenMiniSlip && (
            <button
              type="button"
              onClick={onOpenMiniSlip}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/15"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ਛੋਟੀ ਪਰਚੀ</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>ਵ੍ਹਟਸਐਪ</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ਪ੍ਰਿੰਟ T-ਲੇਜ਼ਰ</span>
          </button>
        </div>
      </div>

      {/* T-FORMAT LEDGER BOARD */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-300 overflow-hidden font-sans">
        {/* Ledger Header (Traditional Look) */}
        <div className="bg-[#fefce8] border-b-2 border-slate-400 p-4 text-center space-y-1">
          <div className="text-xs uppercase font-extrabold tracking-widest text-amber-900">
            ।। ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ।।
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
            {firmName}
          </h1>
          <p className="text-xs text-slate-700 font-medium">
            {settings.firmAddress || 'ਮੰਡੀ ਆੜ੍ਹਤ ਤੇ ਕਮਿਸ਼ਨ ਏਜੰਟ • ਕਣਕ, ਝੋਨਾ, ਸਰ੍ਹੋਂ ਖਰੀਦ'}
            {firmMobile && <span> • ਮੋਬਾਈਲ: {firmMobile}</span>}
          </p>

          <div className="inline-block mt-1 px-4 py-1 rounded-full bg-slate-900 text-amber-300 font-mono text-xs font-bold">
            ਕਿਸਾਨ ਵਹੀ-ਖਾਤਾ ਲੇਜ਼ਰ (T-SHAPE MUNIM ACCOUNT)
          </div>

          <div className="pt-2 flex flex-wrap justify-between items-center text-xs text-slate-700 border-t border-dashed border-amber-300 mt-2 px-2">
            <div>
              <span>ਕਿਸਾਨ: </span>
              <strong className="text-slate-950 font-black text-sm">
                {farmer.farmerNamePa || farmer.farmerName}
              </strong>{' '}
              ({farmer.farmerName}) | ਪਿੰਡ: <strong>{farmer.village || '—'}</strong>
            </div>
            <div className="font-mono">
              ਖਾਤਾ ਨੰ: <strong className="text-slate-950">{farmer.id}</strong> | ਮਿਤੀ: <strong>{new Date().toLocaleDateString('en-GB')}</strong>
            </div>
          </div>
        </div>

        {/* T-SHAPE DUAL COLUMN TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              {/* T-Header Titles */}
              <tr className="border-b-2 border-slate-400">
                {/* DEBIT / DR HEADER */}
                <th colSpan={3} className="w-1/2 bg-rose-50 text-rose-950 border-r-4 border-slate-800 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 font-black text-sm uppercase">
                    <TrendingDown className="w-4 h-4 text-rose-700" />
                    <span>👈 ਨਾਮੇ ਪਾਸਾ / DEBIT (Dr.)</span>
                  </div>
                  <div className="text-[10px] font-normal text-rose-800 mt-0.5">
                    (ਕਿਸਾਨ ਨੇ ਜੋ ਲਿਆ: ਐਡਵਾਂਸ, ਵਿਆਜ, ਲੇਬਰ ਕਟੌਤੀ, ਬੈਂਕ/ਨਕਦ ਅਦਾਇਗੀ)
                  </div>
                </th>

                {/* CREDIT / CR HEADER */}
                <th colSpan={3} className="w-1/2 bg-emerald-50 text-emerald-950 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 font-black text-sm uppercase">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    <span>👉 ਜਮ੍ਹਾਂ ਪਾਸਾ / CREDIT (Cr.)</span>
                  </div>
                  <div className="text-[10px] font-normal text-emerald-800 mt-0.5">
                    (ਕਿਸਾਨ ਦੀ ਜੋ ਕਮਾਈ ਬਣੀ: ਕਣਕ, ਝੋਨਾ, ਤੁਲੀ ਫਸਲ ਦੀ ਕੁੱਲ ਰਕਮ)
                  </div>
                </th>
              </tr>

              {/* Sub-column Headers */}
              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700 text-center">
                {/* Left Sub-headers */}
                <th className="py-2 px-2 border-r border-slate-300 w-[15%]">ਮਿਤੀ (Date)</th>
                <th className="py-2 px-3 border-r border-slate-300 text-left w-[60%]">ਵੇਰਵਾ (Dr. Particulars)</th>
                <th className="py-2 px-3 border-r-4 border-slate-800 text-right w-[25%] text-rose-900">ਰਕਮ ₹ (Amount)</th>

                {/* Right Sub-headers */}
                <th className="py-2 px-2 border-r border-slate-300 w-[15%]">ਮਿਤੀ (Date)</th>
                <th className="py-2 px-3 border-r border-slate-300 text-left w-[60%]">ਵੇਰਵਾ (Cr. Particulars)</th>
                <th className="py-2 px-3 text-right w-[25%] text-emerald-900">ਰਕਮ ₹ (Amount)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {alignedRows.map((_, index) => {
                const debit = debitList[index];
                const credit = creditList[index];

                return (
                  <tr key={`row-${index}`} className="hover:bg-amber-50/30 transition">
                    {/* --- DEBIT (LEFT) CELL 1: DATE --- */}
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-600 align-top">
                      {debit?.date || ''}
                    </td>
                    {/* --- DEBIT (LEFT) CELL 2: PARTICULARS --- */}
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      {debit ? (
                        <div>
                          <div className="font-bold text-slate-900">{debit.title}</div>
                          {debit.subTitle && (
                            <div className="text-[10px] text-slate-500 font-medium">{debit.subTitle}</div>
                          )}
                          {debit.ref && (
                            <span className="inline-block mt-0.5 text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono">
                              {debit.ref}
                            </span>
                          )}
                        </div>
                      ) : null}
                    </td>
                    {/* --- DEBIT (LEFT) CELL 3: AMOUNT --- */}
                    <td className="py-2 px-3 border-r-4 border-slate-800 text-right font-black font-mono text-slate-900 align-top bg-rose-50/20">
                      {debit ? formatCurrency(debit.amount) : ''}
                    </td>

                    {/* --- CREDIT (RIGHT) CELL 1: DATE --- */}
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-600 align-top">
                      {credit?.date || ''}
                    </td>
                    {/* --- CREDIT (RIGHT) CELL 2: PARTICULARS --- */}
                    <td className="py-2 px-3 border-r border-slate-200 align-top">
                      {credit ? (
                        <div>
                          <div className="font-bold text-slate-900">{credit.title}</div>
                          {credit.subTitle && (
                            <div className="text-[10px] text-emerald-800 font-medium">{credit.subTitle}</div>
                          )}
                          {credit.rate && (
                            <span className="inline-block mt-0.5 text-[10px] text-slate-600">
                              ਰੇਟ: ₹{credit.rate}/ਕੁ.
                            </span>
                          )}
                        </div>
                      ) : null}
                    </td>
                    {/* --- CREDIT (RIGHT) CELL 3: AMOUNT --- */}
                    <td className="py-2 px-3 text-right font-black font-mono text-slate-900 align-top bg-emerald-50/20">
                      {credit ? formatCurrency(credit.amount) : ''}
                    </td>
                  </tr>
                );
              })}

              {/* If no entries in either */}
              {maxRows === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-400 italic border-r-4 border-slate-800">
                    ਕੋਈ ਨਾਮੇ ਐਂਟਰੀ ਨਹੀਂ (No Debits)
                  </td>
                  <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                    ਕੋਈ ਜਮ੍ਹਾਂ ਐਂਟਰੀ ਨਹੀਂ (No Credits)
                  </td>
                </tr>
              )}
            </tbody>

            {/* SUBTOTALS ROW */}
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-400 font-black">
                <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-right uppercase text-slate-700">
                  ਕੁੱਲ ਨਾਮੇ (TOTAL DEBIT):
                </td>
                <td className="py-2.5 px-3 border-r-4 border-slate-800 text-right font-mono text-rose-900 text-sm bg-rose-100/50">
                  {formatCurrency(totalDebit)}
                </td>

                <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-right uppercase text-slate-700">
                  ਕੁੱਲ ਜਮ੍ਹਾਂ (TOTAL CREDIT):
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-900 text-sm bg-emerald-100/50">
                  {formatCurrency(totalCredit)}
                </td>
              </tr>

              {/* FINAL NET BALANCE / CARRY DOWN (ਨਿਬੇੜਾ) */}
              <tr className="border-b-4 border-slate-900">
                <td colSpan={6} className="p-0">
                  <div className={`p-4 flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isPayableToFarmer
                      ? 'bg-emerald-900 text-white'
                      : 'bg-rose-900 text-white'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        isPayableToFarmer ? 'bg-emerald-800 text-emerald-200' : 'bg-rose-800 text-rose-200'
                      }`}>
                        {isPayableToFarmer ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-rose-300" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs uppercase font-extrabold tracking-wider opacity-80 block">
                          T-Format ਆਖਰੀ ਹਿਸਾਬ ਨਿਬੇੜਾ (Net Balance Ledger Closing)
                        </span>
                        <div className="text-sm font-black">
                          {isPayableToFarmer
                            ? '★ ਬਾਕੀ ਰਕਮ ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ ਹੈ (Balance Payable to Farmer)'
                            : '★ ਕਿਸਾਨ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ ਖੜ੍ਹੀ ਹੈ (Balance Due from Farmer)'}
                        </div>
                      </div>
                    </div>

                    <div className="text-center sm:text-right">
                      <div className="text-xs opacity-80">ਨੈੱਟ ਰਕਮ (Net Closing):</div>
                      <div className="text-2xl sm:text-3xl font-black font-mono">
                        {formatCurrency(Math.abs(netBalance))}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Traditional Signatures Footnote */}
        <div className="p-6 bg-slate-50 border-t border-slate-300 grid grid-cols-2 text-center text-xs font-semibold text-slate-700">
          <div className="pt-6 border-t border-slate-300 mx-8">
            ਦਸਤਖਤ / ਅੰਗੂਠਾ ਕਿਸਾਨ (Farmer Signature)
          </div>
          <div className="pt-6 border-t border-slate-300 mx-8">
            ਦਸਤਖਤ ਆੜ੍ਹਤੀਆ (Authorized Signatory)
          </div>
        </div>
      </div>
    </div>
  );
};
