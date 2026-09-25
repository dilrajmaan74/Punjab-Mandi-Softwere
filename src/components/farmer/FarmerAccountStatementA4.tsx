import React from 'react';
import { FarmerAccountSummary, MandiSettings } from '../../types/mandi';
import {
  getPaymentTransfers,
  getSameFarmerAdjustments,
  getBagTransfers,
  PaymentTransferRecord,
  SameFarmerAdjustmentRecord,
  BagTransferRecord
} from '../../utils/farmerAdjustmentsStorage';

export interface FarmerAccountStatementA4Props {
  account: FarmerAccountSummary;
  settings: MandiSettings;
  printDate?: string;
  isPrintOnly?: boolean;
  id?: string;
  mode?: 'simple' | 'full';
}

/**
 * Clean helper to format currency in Indian format: ₹ 1,23,456
 */
const fmtINR = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return '₹ 0';
  return `₹ ${Math.round(val).toLocaleString('en-IN')}`;
};

export const FarmerAccountStatementA4: React.FC<FarmerAccountStatementA4Props> = ({
  account,
  settings,
  printDate = new Date().toLocaleDateString('en-GB'),
  isPrintOnly = false,
  id = 'farmer-account-reference-a4',
  mode = 'simple'
}) => {
  const { farmer } = account;

  // =========================================================================
  // 1. DATA CALCULATIONS (Using actual records & settings, no hardcoded rates)
  // =========================================================================

  // Mandi Arrival
  const arrivalEntries = account.mandiArrivalEntries || [];
  const totalArrivalBags = arrivalEntries.reduce((s, e) => s + (Number(e.bags) || 0), 0);
  const totalArrivalWeightKg = arrivalEntries.reduce((s, e) => s + (Number(e.grandTotalKg) || 0), 0);
  const totalArrivalAmount = arrivalEntries.reduce((s, e) => s + (Number(e.totalAmount) || 0), 0);

  // Self Agency Purchase
  const selfPurchases = account.purchaseRecords || [];
  const totalSelfPurchaseBags = selfPurchases.reduce((s, p) => s + (Number(p.bags) || 0), 0);
  const totalSelfPurchaseWeightKg = selfPurchases.reduce((s, p) => s + (Number(p.totalWeightKg) || 0), 0);
  const totalSelfPurchaseAmount = selfPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);

  // Linked Agency Purchase
  const linkedPurchases = account.linkedPurchasesList || [];
  const totalLinkedPurchaseBags = linkedPurchases.reduce((s, p) => s + (Number(p.bags) || 0), 0);
  const totalLinkedPurchaseWeightKg = linkedPurchases.reduce(
    (s, p) => s + ((Number(p.qul) || 0) * 100 + (Number(p.kg) || 0)),
    0
  );
  const totalLinkedPurchaseAmount = linkedPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);

  // Group linked purchases by linked farmer
  const linkedByFarmerMap = new Map<string, {
    nameEn: string;
    namePa?: string;
    id: string;
    records: typeof linkedPurchases;
    totalBags: number;
    totalWeightKg: number;
    totalAmount: number;
  }>();

  linkedPurchases.forEach((lp) => {
    const key = lp.linkedFarmerId || lp.linkedFarmerName;
    const existing = linkedByFarmerMap.get(key) || {
      nameEn: lp.linkedFarmerName,
      namePa: lp.linkedFarmerNamePa,
      id: lp.linkedFarmerId,
      records: [],
      totalBags: 0,
      totalWeightKg: 0,
      totalAmount: 0
    };
    const wtKg = (Number(lp.qul) || 0) * 100 + (Number(lp.kg) || 0);
    existing.records.push(lp);
    existing.totalBags += Number(lp.bags) || 0;
    existing.totalWeightKg += wtKg;
    existing.totalAmount += Number(lp.totalAmount) || 0;
    linkedByFarmerMap.set(key, existing);
  });
  const linkedFarmersGrouped = Array.from(linkedByFarmerMap.values());

  // 5. Remaining Bags Calculation
  // Remaining = Total Mandi Arrival - Self Farmer Purchase - Linked Farmer Purchase
  const remainingBags = Math.max(0, totalArrivalBags - totalSelfPurchaseBags - totalLinkedPurchaseBags);
  const bagWeightKg = settings.fixedBagWeightKg || 37.50;
  const remainingWeightKg = remainingBags * bagWeightKg;
  const remainingWeightQtl = remainingWeightKg / 100;
  // Applicable rate from software settings or arrival record
  const applicableRate =
    arrivalEntries.length > 0 && arrivalEntries[0].ratePerQtl
      ? arrivalEntries[0].ratePerQtl
      : (settings.fixedRatePerQtl || 2461);
  const remainingAmount = Math.round(remainingWeightQtl * applicableRate);

  // 6. Labour Calculation (Using software labour settings)
  const pakkiRate = settings.defaultPakkiLabourRate ?? 7;
  const doubleRate = settings.defaultPakkaDoubleLabourRate ?? 14;
  const sukkiRate = settings.defaultSukhiLabourRate ?? 5;

  let pakkiBags = 0;
  let doubleBags = 0;
  let sukkiBags = 0;
  let customPakkiAmt = 0;
  let customDoubleAmt = 0;
  let customSukkiAmt = 0;

  arrivalEntries.forEach((e) => {
    if (e.labourDeductions) {
      if (e.labourDeductions.pakkiLabourEnabled) {
        pakkiBags += e.labourDeductions.pakkiBagsCount ?? (Number(e.bags) || 0);
        customPakkiAmt += Number(e.labourDeductions.pakkiLabourAmount) || 0;
      }
      if (e.labourDeductions.pakkaDoubleLabourEnabled) {
        doubleBags += e.labourDeductions.doubleBagsCount ?? 0;
        customDoubleAmt += Number(e.labourDeductions.pakkaDoubleLabourAmount) || 0;
      }
      if (e.labourDeductions.sukhiLabourEnabled) {
        sukkiBags += e.labourDeductions.sukkiBagsCount ?? 0;
        customSukkiAmt += Number(e.labourDeductions.sukhiLabourAmount) || 0;
      }
    } else if (e.conditionBreakdown) {
      pakkiBags += e.conditionBreakdown.pakkiBags ?? (Number(e.bags) || 0);
      doubleBags += e.conditionBreakdown.doubleBags ?? 0;
      sukkiBags += e.conditionBreakdown.sukkiBags ?? 0;
      customPakkiAmt += e.conditionBreakdown.pakkiAmount ?? 0;
      customDoubleAmt += e.conditionBreakdown.doubleAmount ?? 0;
      customSukkiAmt += e.conditionBreakdown.sukkiAmount ?? 0;
    } else {
      // Default: all arrival bags pakki
      pakkiBags += Number(e.bags) || 0;
    }
  });

  const pakkiAmount = customPakkiAmt > 0 ? customPakkiAmt : pakkiBags * pakkiRate;
  const doubleAmount = customDoubleAmt > 0 ? customDoubleAmt : doubleBags * doubleRate;
  const sukkiAmount = customSukkiAmt > 0 ? customSukkiAmt : sukkiBags * sukkiRate;
  const totalLabourAmount = pakkiAmount + doubleAmount + sukkiAmount;
  const remainingAfterLabour = remainingAmount - totalLabourAmount;

  // 7. Advance Payment & Interest (Dynamic Date-to-Date calculation)
  const advances = account.advances || [];
  const totalAdvancePrincipal = advances.reduce((s, a) => s + (Number(a.amount) || Number(a.principal) || 0), 0);
  const totalAdvanceInterest = advances.reduce((s, a) => s + (Number(a.interestAmount) || 0), 0);
  const totalAdvanceWithInterest = totalAdvancePrincipal + totalAdvanceInterest;

  // 8. Payment Adjustments & Transfers
  const allPaymentTransfers = getPaymentTransfers();
  const allSameAdjustments = getSameFarmerAdjustments();
  const allBagTransfers = getBagTransfers();

  // Filter for this farmer (by id or name match)
  const farmerTransfersOut = allPaymentTransfers.filter(
    (t) => t.fromFarmerId === farmer.id || t.fromFarmerName.toLowerCase().includes(farmer.farmerName.toLowerCase())
  );
  const farmerTransfersIn = allPaymentTransfers.filter(
    (t) => t.toFarmerId === farmer.id || t.toFarmerName.toLowerCase().includes(farmer.farmerName.toLowerCase())
  );
  const relevantPaymentTransfers: PaymentTransferRecord[] = [...farmerTransfersOut, ...farmerTransfersIn];
  const sameFarmerAdjustments: SameFarmerAdjustmentRecord[] = allSameAdjustments.filter(
    (a) => a.farmerId === farmer.id || a.farmerName.toLowerCase().includes(farmer.farmerName.toLowerCase())
  );

  // Net adjustment amount: Transfers Out are deductions (-), Transfers In are additions (+)
  const totalTransfersOut = farmerTransfersOut.reduce((s, t) => s + t.amount, 0);
  const totalTransfersIn = farmerTransfersIn.reduce((s, t) => s + t.amount, 0);
  const netTransferAmount = totalTransfersIn - totalTransfersOut;

  // 9. Bag Transfers
  const bagTransfersOut = allBagTransfers.filter(
    (t) => t.fromFarmerId === farmer.id || t.fromFarmerName.toLowerCase().includes(farmer.farmerName.toLowerCase())
  );
  const bagTransfersIn = allBagTransfers.filter(
    (t) => t.toFarmerId === farmer.id || t.toFarmerName.toLowerCase().includes(farmer.farmerName.toLowerCase())
  );
  const totalBagsTransferredOut = bagTransfersOut.reduce((s, t) => s + t.bags, 0);
  const totalBagsTransferredIn = bagTransfersIn.reduce((s, t) => s + t.bags, 0);
  const netBagTransfer = totalBagsTransferredIn - totalBagsTransferredOut;

  // 10. Final Account Summary
  // Formula:
  // Remaining Amount
  // - Total Labour Amount
  // - (Advance + Interest)
  // ± Payment Adjustments / Transfers
  // = FINAL BALANCE AMOUNT
  const finalBalanceAmount = remainingAmount - totalLabourAmount - totalAdvanceWithInterest + netTransferAmount;
  const finalBalanceBags = Math.max(0, remainingBags + netBagTransfer);
  const finalBalanceWeightKg = finalBalanceBags * bagWeightKg;
  const finalBalanceWeightQtl = finalBalanceWeightKg / 100;

  // Firm Information
  const firmName = settings.firmNameEn || 'JAMMU TRADING CO.';
  const firmNamePa = settings.firmNamePa || 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ';
  const firmAddress = settings.firmAddress || 'Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629';
  const firmLicence = settings.firmLicence || 'JAL/LKH/133';
  const firmMobile = settings.firmMobile || '98147-74651';
  const firmPan = settings.firmPan || 'AAACJ1234F';
  const firmGstin = settings.firmGstin || '';

  return (
    <div
      id={id}
      className={`bg-white text-slate-900 font-sans mx-auto ${
        isPrintOnly ? '' : 'shadow-md border border-slate-300'
      }`}
      style={{
        width: '202mm',
        minHeight: '287mm',
        padding: '5mm 6mm',
        boxSizing: 'border-box',
        color: '#0f172a',
        backgroundColor: '#ffffff'
      }}
    >
      {/* ===================================================================== */}
      {/* HEADER: JAMMU TRADING CO.                                             */}
      {/* ===================================================================== */}
      <div className="text-center border-b border-slate-400 pb-1.5 mb-2">
        <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 leading-none">
          {firmName}
        </h1>
        {firmNamePa && (
          <div className="text-xs font-bold text-slate-800 mt-0.5 leading-tight">
            {firmNamePa}
          </div>
        )}
        <div className="text-[9px] text-slate-700 mt-0.5 font-medium leading-tight">
          {firmAddress}
        </div>
        <div className="text-[8.5px] text-slate-600 mt-0.5 font-medium flex items-center justify-center gap-2 flex-wrap">
          {firmLicence && <span>License No: <strong>{firmLicence}</strong></span>}
          {firmMobile && <span>| Mobile: <strong>{firmMobile}</strong></span>}
          {firmPan && <span>| PAN: <strong>{firmPan}</strong></span>}
          {firmGstin && <span>| GSTIN: <strong>{firmGstin}</strong></span>}
        </div>

        {/* Title Bar with Date */}
        <div className="mt-1 pt-1 border-t border-slate-300 flex items-center justify-between px-1">
          <span className="text-[9px] font-bold text-slate-700 font-mono">
            A/C NO: <strong className="text-slate-950">{farmer.id}</strong>
          </span>
          <div className="text-xs font-black uppercase tracking-wider text-slate-950">
            FARMER ACCOUNT / ਕਿਸਾਨ ਖਾਤਾ
          </div>
          <span className="text-[9px] font-bold text-slate-700 font-mono">
            Date: <strong className="text-slate-950">{printDate}</strong>
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. FARMER FULL INFORMATION                                            */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>1. FARMER FULL INFORMATION / ਕਿਸਾਨ ਦੀ ਪੂਰੀ ਜਾਣਕਾਰੀ</span>
          <span className="text-[8.5px] font-semibold text-slate-600 font-mono">A/C: {farmer.id}</span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-[18%] py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Farmer Name / ਕਿਸਾਨ ਦਾ ਨਾਮ:
              </td>
              <td className="w-[32%] py-0.5 px-1.5 font-bold text-slate-950 border-r border-slate-300">
                {farmer.farmerName} {farmer.farmerNamePa ? `(${farmer.farmerNamePa})` : ''}
              </td>
              <td className="w-[18%] py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Mobile / ਮੋਬਾਈਲ ਨੰਬਰ:
              </td>
              <td className="w-[32%] py-0.5 px-1.5 font-bold font-mono text-slate-950">
                {farmer.mobile || '—'}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Father Name / ਪਿਤਾ ਦਾ ਨਾਮ:
              </td>
              <td className="py-0.5 px-1.5 font-bold text-slate-950 border-r border-slate-300">
                {farmer.fatherName} {farmer.fatherNamePa ? `(${farmer.fatherNamePa})` : ''}
              </td>
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Aadhaar / ਆਧਾਰ ਨੰਬਰ:
              </td>
              <td className="py-0.5 px-1.5 font-bold font-mono text-slate-950">
                {farmer.aadhaar || '—'}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Village / ਪਿੰਡ:
              </td>
              <td className="py-0.5 px-1.5 font-bold text-slate-950 border-r border-slate-300">
                {farmer.village} {farmer.villagePa ? `(${farmer.villagePa})` : ''}
              </td>
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Bank Name / ਬੈਂਕ ਦਾ ਨਾਮ:
              </td>
              <td className="py-0.5 px-1.5 font-bold text-slate-950">
                {farmer.bankDetails?.bankName || '—'}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Address / ਪਤਾ:
              </td>
              <td className="py-0.5 px-1.5 text-slate-900 border-r border-slate-300">
                {farmer.address || farmer.village || '—'}
              </td>
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Account No / ਖਾਤਾ ਨੰਬਰ:
              </td>
              <td className="py-0.5 px-1.5 font-bold font-mono text-slate-950">
                {farmer.bankDetails?.accountNumber || '—'}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Farmer A/C No. / ਖਾਤਾ ਨੰ.:
              </td>
              <td className="py-0.5 px-1.5 font-black font-mono text-slate-950 border-r border-slate-300">
                {farmer.id}
              </td>
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                IFSC Code:
              </td>
              <td className="py-0.5 px-1.5 font-bold font-mono text-slate-950">
                {farmer.bankDetails?.ifscCode || '—'}
              </td>
            </tr>

            <tr>
              <td className="py-0.5 px-1.5 font-semibold text-slate-700 bg-slate-50 border-r border-slate-200">
                Linked Farmers / ਲਿੰਕ ਕਿਸਾਨ:
              </td>
              <td colSpan={3} className="py-0.5 px-1.5 font-semibold text-slate-900">
                {account.isMainFarmer && account.linkedFarmersList && account.linkedFarmersList.length > 0 ? (
                  <span>
                    {account.linkedFarmersList
                      .map((lf) => `${lf.farmerName}${lf.farmerNamePa ? ` (${lf.farmerNamePa})` : ''} [${lf.id}]`)
                      .join('; ')}
                  </span>
                ) : account.isLinkedFarmer && account.linkedToMainFarmer ? (
                  <span>
                    ਲਿੰਕਡ ਮੁੱਖ ਕਿਸਾਨ / Linked to Main Farmer:{' '}
                    <strong>
                      {account.linkedToMainFarmer.farmerName}{' '}
                      {account.linkedToMainFarmer.farmerNamePa ? `(${account.linkedToMainFarmer.farmerNamePa})` : ''}{' '}
                      [{account.linkedToMainFarmer.id}]
                    </strong>
                  </span>
                ) : (
                  <span className="text-slate-500 italic">ਕੋਈ ਲਿੰਕਡ ਕਿਸਾਨ ਨਹੀਂ / None (Self Account)</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 2. MANDI ARRIVAL / ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦਾ ਮਾਲ (ONLY ARRIVAL - NO PURCHASE)    */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>2. MANDI ARRIVAL / ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦਾ ਮਾਲ</span>
          <span className="text-[8px] font-semibold text-slate-500">(Only Farmer Mandi Arrival - Not Purchase)</span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-center">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[16%]">Date / ਮਿਤੀ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[18%]">Bags / ਬੋਰੀਆਂ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[24%]">Weight (Qtl / Kg) / ਵਜ਼ਨ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[18%]">Rate / ਰੇਟ (₹/Qtl)</th>
              <th className="py-0.5 px-1.5 text-right w-[24%]">Amount / ਰਕਮ (₹)</th>
            </tr>
          </thead>
          <tbody>
            {arrivalEntries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-1 text-center text-slate-500 italic border-b border-slate-200">
                  ਕੋਈ ਮੰਡੀ ਆਮਦ ਰਿਕਾਰਡ ਨਹੀਂ / No Mandi Arrival records found
                </td>
              </tr>
            ) : (
              arrivalEntries.map((e, idx) => (
                <tr key={e.id || idx} className="border-b border-slate-200 text-center">
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    {e.date}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold text-slate-950">
                    {e.bags} Bags
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-900">
                    {(e.grandTotalKg / 100).toFixed(2)} Qtl ({e.grandTotalKg.toFixed(1)} Kg)
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    ₹ {(e.ratePerQtl || settings.fixedRatePerQtl || 2461).toLocaleString('en-IN')}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-bold font-mono text-slate-950">
                    {fmtINR(e.totalAmount)}
                  </td>
                </tr>
              ))
            )}
            {/* TOTALS ROW */}
            <tr className="bg-slate-100 font-black text-slate-950 border-t border-slate-300 text-center">
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-left uppercase">
                TOTAL ARRIVAL:
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                {totalArrivalBags} Bags
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                {(totalArrivalWeightKg / 100).toFixed(2)} Qtl ({totalArrivalWeightKg.toFixed(1)} Kg)
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-slate-600 font-mono font-normal">
                Avg Rate
              </td>
              <td className="py-0.5 px-1.5 text-right font-mono">
                {fmtINR(totalArrivalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 3. SELF FARMER AGENCY PURCHASE / ਆਪਣੀ ਏਜੰਸੀ ਖਰੀਦ                       */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>3. SELF FARMER AGENCY PURCHASE / ਆਪਣੀ ਏਜੰਸੀ ਖਰੀਦ</span>
          <span className="text-[8px] font-semibold text-slate-500">(Direct Government / Agency Purchase)</span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-center">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[14%]">Date / ਮਿਤੀ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[18%]">Agency / ਏਜੰਸੀ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[15%]">Bags / ਬੋਰੀਆਂ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[22%]">Weight (Qtl / Kg)</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[14%]">Rate (₹/Qtl)</th>
              <th className="py-0.5 px-1.5 text-right w-[17%]">Amount / ਰਕਮ (₹)</th>
            </tr>
          </thead>
          <tbody>
            {selfPurchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-1 text-center text-slate-500 italic border-b border-slate-200">
                  ਕੋਈ ਆਪਣੀ ਏਜੰਸੀ ਖਰੀਦ ਦਰਜ ਨਹੀਂ / No Self Agency Purchase records found
                </td>
              </tr>
            ) : (
              selfPurchases.map((p, idx) => (
                <tr key={p.id || idx} className="border-b border-slate-200 text-center">
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    {p.date}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold text-slate-900">
                    {p.agency || '—'}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold text-slate-950 font-mono">
                    {p.bags}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-900">
                    {(p.totalWeightKg / 100).toFixed(2)} Qtl ({p.totalWeightKg.toFixed(1)} Kg)
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    ₹ {p.rate.toLocaleString('en-IN')}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-bold font-mono text-slate-950">
                    {fmtINR(p.totalAmount)}
                  </td>
                </tr>
              ))
            )}
            {/* TOTALS ROW */}
            <tr className="bg-slate-100 font-black text-slate-950 border-t border-slate-300 text-center">
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-left uppercase" colSpan={2}>
                TOTAL SELF PURCHASE:
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                {totalSelfPurchaseBags} Bags
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                {(totalSelfPurchaseWeightKg / 100).toFixed(2)} Qtl
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-slate-500 font-mono font-normal">
                —
              </td>
              <td className="py-0.5 px-1.5 text-right font-mono">
                {fmtINR(totalSelfPurchaseAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 4. LINKED FARMER AGENCY PURCHASE / ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਏਜੰਸੀ ਖਰੀਦ          */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>4. LINKED FARMER AGENCY PURCHASE / ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਏਜੰਸੀ ਖਰੀਦ</span>
          <span className="text-[8px] font-semibold text-slate-500">(Grouped by Each Linked Farmer)</span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-center">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[24%] text-left">Linked Farmer / ਨਾਮ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[12%]">Date</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[14%]">Agency</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[13%]">Bags</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[19%]">Weight (Qtl)</th>
              <th className="py-0.5 px-1.5 text-right w-[18%]">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {linkedPurchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-1 text-center text-slate-500 italic border-b border-slate-200">
                  ਕੋਈ ਲਿੰਕਡ ਕਿਸਾਨ ਖਰੀਦ ਨਹੀਂ / No Linked Farmer Agency Purchases
                </td>
              </tr>
            ) : (
              linkedFarmersGrouped.map((grp) => (
                <React.Fragment key={grp.id}>
                  {/* Linked Farmer Header Sub-row */}
                  <tr className="bg-slate-100/70 font-bold border-b border-slate-200 text-slate-900">
                    <td colSpan={6} className="py-0.5 px-2 text-left">
                      Linked: <strong>{grp.nameEn}</strong> {grp.namePa ? `(${grp.namePa})` : ''} - A/C: {grp.id}
                    </td>
                  </tr>
                  {grp.records.map((r, rIdx) => {
                    const wtKg = (Number(r.qul) || 0) * 100 + (Number(r.kg) || 0);
                    return (
                      <tr key={r.id || rIdx} className="border-b border-slate-200 text-center">
                        <td className="py-0.5 px-1.5 border-r border-slate-200 text-left text-slate-700 pl-4">
                          ↳ Ticket #{r.id}
                        </td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono">{r.date}</td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 font-medium">{r.agency}</td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold font-mono">{r.bags}</td>
                        <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono">
                          {(wtKg / 100).toFixed(2)} Qtl
                        </td>
                        <td className="py-0.5 px-1.5 text-right font-bold font-mono">{fmtINR(r.totalAmount)}</td>
                      </tr>
                    );
                  })}
                  {/* Subtotal for this linked farmer */}
                  <tr className="bg-slate-50 font-bold border-b border-slate-300 text-slate-800 text-center text-[8px]">
                    <td colSpan={3} className="py-0.5 px-2 text-left border-r border-slate-200">
                      Subtotal for {grp.nameEn}:
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono">{grp.totalBags} Bags</td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono">
                      {(grp.totalWeightKg / 100).toFixed(2)} Qtl
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono">{fmtINR(grp.totalAmount)}</td>
                  </tr>
                </React.Fragment>
              ))
            )}
            {/* TOTAL LINKED FARMERS PURCHASE */}
            <tr className="bg-slate-100 font-black text-slate-950 border-t border-slate-300 text-center">
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-left uppercase" colSpan={3}>
                TOTAL LINKED FARMERS PURCHASE:
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                {totalLinkedPurchaseBags} Bags
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                {(totalLinkedPurchaseWeightKg / 100).toFixed(2)} Qtl
              </td>
              <td className="py-0.5 px-1.5 text-right font-mono">
                {fmtINR(totalLinkedPurchaseAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 5. REMAINING BAGS / ਬਚੀਆਂ ਬੋਰੀਆਂ (Automatic Calculation)               */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>5. REMAINING BAGS / ਬਚੀਆਂ ਬੋਰੀਆਂ</span>
          <span className="text-[8px] font-semibold text-slate-500 font-mono">
            Arrival ({totalArrivalBags}) − Self Purchase ({totalSelfPurchaseBags}) − Linked Purchase ({totalLinkedPurchaseBags})
          </span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <tbody>
            <tr className="border-b border-slate-200 text-center">
              <td className="w-[25%] py-0.5 px-1.5 border-r border-slate-200 font-semibold text-slate-700 bg-slate-50">
                Total Mandi Arrival
              </td>
              <td className="w-[25%] py-0.5 px-1.5 border-r border-slate-200 font-semibold text-slate-700 bg-slate-50">
                Less: Self Agency Purchase
              </td>
              <td className="w-[25%] py-0.5 px-1.5 border-r border-slate-200 font-semibold text-slate-700 bg-slate-50">
                Less: Linked Agency Purchase
              </td>
              <td className="w-[25%] py-0.5 px-1.5 font-bold text-slate-950 bg-slate-100">
                REMAINING BALANCE BAGS
              </td>
            </tr>
            <tr className="border-b border-slate-300 text-center font-mono">
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-medium">
                {totalArrivalBags} Bags ({(totalArrivalWeightKg / 100).toFixed(2)} Qtl)
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-medium text-slate-800">
                − {totalSelfPurchaseBags} Bags ({(totalSelfPurchaseWeightKg / 100).toFixed(2)} Qtl)
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-medium text-slate-800">
                − {totalLinkedPurchaseBags} Bags ({(totalLinkedPurchaseWeightKg / 100).toFixed(2)} Qtl)
              </td>
              <td className="py-0.5 px-1.5 font-black text-slate-950 text-[9.5px] bg-slate-50">
                = {remainingBags} Bags
              </td>
            </tr>

            {/* Remaining Quantities & Amount Breakdown Row */}
            <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
              <td className="py-0.5 px-2 border-r border-slate-300">
                Remaining Bags: <span className="font-mono font-black">{remainingBags}</span>
              </td>
              <td className="py-0.5 px-2 border-r border-slate-300">
                Weight: <span className="font-mono font-black">{remainingWeightQtl.toFixed(2)} Qtl ({remainingWeightKg.toFixed(1)} Kg)</span>
              </td>
              <td className="py-0.5 px-2 border-r border-slate-300">
                Applicable Rate: <span className="font-mono font-black">₹ {applicableRate.toLocaleString('en-IN')}/Qtl</span>
              </td>
              <td className="py-0.5 px-2 text-right">
                Remaining Amount: <span className="font-mono font-black text-slate-950">{fmtINR(remainingAmount)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 6. LABOUR / ਮਜ਼ਦੂਰੀ (Completely Separate from Purchase & Advance)      */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>6. LABOUR / ਮਜ਼ਦੂਰੀ</span>
          <span className="text-[8px] font-semibold text-slate-500">(Separate from Purchase and Advance - As Per Labour Settings)</span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-center">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[35%] text-left">Labour Type / ਕਿਸਮ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[20%]">Bags / ਬੋਰੀਆਂ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[20%]">Rate / Bag (₹)</th>
              <th className="py-0.5 px-1.5 text-right w-[25%]">Amount / ਰਕਮ (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200 text-center">
              <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-medium text-slate-800">
                Pakki Labour / ਪੱਕੀ ਮਜ਼ਦੂਰੀ
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono font-medium">{pakkiBags}</td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono">₹ {pakkiRate}</td>
              <td className="py-0.5 px-1.5 text-right font-mono font-bold">{fmtINR(pakkiAmount)}</td>
            </tr>
            <tr className="border-b border-slate-200 text-center">
              <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-medium text-slate-800">
                Double Labour / ਪੱਕੀ ਡਬਲ ਮਜ਼ਦੂਰੀ
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono font-medium">{doubleBags}</td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono">₹ {doubleRate}</td>
              <td className="py-0.5 px-1.5 text-right font-mono font-bold">{fmtINR(doubleAmount)}</td>
            </tr>
            <tr className="border-b border-slate-200 text-center">
              <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-medium text-slate-800">
                Sukki Labour / ਸੁੱਕੀ ਮਜ਼ਦੂਰੀ
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono font-medium">{sukkiBags}</td>
              <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono">₹ {sukkiRate}</td>
              <td className="py-0.5 px-1.5 text-right font-mono font-bold">{fmtINR(sukkiAmount)}</td>
            </tr>
            {/* TOTAL LABOUR AMOUNT */}
            <tr className="bg-slate-100 font-black text-slate-950 border-t border-slate-300">
              <td colSpan={3} className="py-0.5 px-2 text-left border-r border-slate-300 uppercase">
                TOTAL LABOUR AMOUNT (ਕੁੱਲ ਮਜ਼ਦੂਰੀ):
              </td>
              <td className="py-0.5 px-1.5 text-right font-mono">
                {fmtINR(totalLabourAmount)}
              </td>
            </tr>
            {/* Net after Labour deduction info */}
            <tr className="bg-slate-50 font-semibold text-slate-700 text-[8px]">
              <td colSpan={4} className="py-0.5 px-2 text-right">
                Remaining Amount ({fmtINR(remainingAmount)}) − Total Labour ({fmtINR(totalLabourAmount)}) = Net Crop Balance:{' '}
                <strong className="text-slate-950 font-mono">{fmtINR(remainingAfterLabour)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 7. ADVANCE PAYMENT & INTEREST / ਅਡਵਾਂਸ ਪੇਮੈਂਟ ਅਤੇ ਵਿਆਜ                  */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>7. ADVANCE PAYMENT & INTEREST / ਅਡਵਾਂਸ ਪੇਮੈਂਟ ਅਤੇ ਵਿਆਜ</span>
          <span className="text-[8px] font-semibold text-slate-500">(Separate from Purchase and Labour - Dynamic Interest)</span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-center">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[16%]">Date / ਮਿਤੀ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[24%]">Advance Amount / ਮੂਲ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[20%]">Interest Rate / ਦਰ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[20%]">Days / Months / ਮਿਆਦ</th>
              <th className="py-0.5 px-1.5 text-right w-[20%]">Interest Amount / ਵਿਆਜ</th>
            </tr>
          </thead>
          <tbody>
            {advances.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-1 text-center text-slate-500 italic border-b border-slate-200">
                  ਕੋਈ ਪੇਸ਼ਗੀ / ਐਡਵਾਂਸ ਦਰਜ ਨਹੀਂ / No advance payment records found
                </td>
              </tr>
            ) : (
              advances.map((adv, idx) => (
                <tr key={adv.id || idx} className="border-b border-slate-200 text-center">
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    {adv.date || adv.startDate}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold font-mono text-slate-950">
                    {fmtINR(adv.amount || adv.principal)}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    {adv.monthlyInterestRate}% / ਮਹੀਨਾ
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    {adv.totalDays || 0} ਦਿਨ ({adv.monthsElapsed || 0}m {adv.daysElapsed || 0}d)
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-bold font-mono text-slate-950">
                    {fmtINR(adv.interestAmount || 0)}
                  </td>
                </tr>
              ))
            )}
            {/* TOTALS ROW */}
            <tr className="bg-slate-100 font-black text-slate-950 border-t border-slate-300 text-center">
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-left uppercase">
                TOTALS:
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                Total Adv: {fmtINR(totalAdvancePrincipal)}
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 text-slate-600 font-normal">
                —
              </td>
              <td className="py-0.5 px-1.5 border-r border-slate-300 font-mono">
                Total Int: {fmtINR(totalAdvanceInterest)}
              </td>
              <td className="py-0.5 px-1.5 text-right font-mono">
                Total: {fmtINR(totalAdvanceWithInterest)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 7B. DIRECT PAYMENTS & RECOVERIES / ਪ੍ਰਾਪਤ ਰਕਮ ਅਤੇ ਸਿੱਧਾ ਭੁਗਤਾਨ          */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>7B. DIRECT PAYMENTS & RECOVERIES / ਪ੍ਰਾਪਤ ਰਕਮ ਅਤੇ ਸਿੱਧਾ ਭੁਗਤਾਨ</span>
          <span className="text-[8px] font-semibold text-emerald-800">
            Total Paid: {fmtINR(account.paidAmount || 0)}
          </span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-center">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[16%]">Date / ਮਿਤੀ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[20%]">Payment Mode / ਢੰਗ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[22%]">Ref / UTR / ਰੈਫਰੈਂਸ</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[20%]">Agency / ਏਜੰਸੀ</th>
              <th className="py-0.5 px-1.5 text-right w-[22%]">Amount / ਰਕਮ</th>
            </tr>
          </thead>
          <tbody>
            {!account.paymentRecords || account.paymentRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-1 text-center text-slate-500 italic border-b border-slate-200">
                  ਕੋਈ ਸਿੱਧਾ ਭੁਗਤਾਨ ਜਾਂ ਰਿਕਵਰੀ ਦਰਜ ਨਹੀਂ / No direct payments recorded
                </td>
              </tr>
            ) : (
              account.paymentRecords.map((pay, idx) => (
                <tr key={pay.id || idx} className="border-b border-slate-200 text-center">
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                    {pay.date}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold text-slate-900">
                    {pay.paymentMode === 'CASH' ? 'Cash / ਨਕਦ' :
                     pay.paymentMode === 'BANK_TRANSFER' ? 'Bank / ਬੈਂਕ' :
                     (pay.paymentMode as string) === 'RTGS' || (pay.paymentMode as string) === 'NEFT' ? 'RTGS/NEFT' :
                     pay.paymentMode === 'CHEQUE' ? 'Cheque / ਚੈੱਕ' : pay.paymentMode}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-700">
                    {pay.referenceNumber || '—'}
                  </td>
                  <td className="py-0.5 px-1.5 border-r border-slate-200 text-slate-700">
                    {pay.agency || '—'}
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-bold font-mono text-emerald-900">
                    {fmtINR(pay.amount)}
                  </td>
                </tr>
              ))
            )}
            <tr className="bg-slate-100 font-black text-slate-950 border-t border-slate-300 text-center">
              <td colSpan={4} className="py-0.5 px-1.5 border-r border-slate-300 text-left uppercase">
                TOTAL PAYMENTS RECEIVED / ਕੁੱਲ ਪ੍ਰਾਪਤ ਰਕਮ:
              </td>
              <td className="py-0.5 px-1.5 text-right font-mono text-emerald-950">
                {fmtINR(account.paidAmount || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 8. PAYMENT ADJUSTMENT / ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ (Two Separate Options)         */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>8. PAYMENT ADJUSTMENT / ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ</span>
          <span className="text-[8px] font-semibold text-slate-500">(A. Payment Transfer & B. Same Farmer Account Adjustment)</span>
        </div>

        <div className="grid grid-cols-2 border-l border-r border-b border-slate-300 divide-x divide-slate-300 text-[8.5px]">
          {/* Option A: Payment Transfer */}
          <div>
            <div className="bg-slate-50 font-bold px-1.5 py-0.5 border-b border-slate-300 text-slate-900">
              A. PAYMENT TRANSFER / ਕਿਸਾਨ ਤੋਂ ਕਿਸਾਨ ਟ੍ਰਾਂਸਫਰ
            </div>
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold text-[8px]">
                  <th className="py-0.5 px-1 border-r border-slate-200 text-left">From → To Farmer</th>
                  <th className="py-0.5 px-1 border-r border-slate-200 w-[24%]">Amount (₹)</th>
                  <th className="py-0.5 px-1 border-r border-slate-200 w-[18%]">Date</th>
                  <th className="py-0.5 px-1 text-left w-[24%]">Reason</th>
                </tr>
              </thead>
              <tbody>
                {relevantPaymentTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-1 text-center text-slate-400 italic">
                      ਕੋਈ ਟ੍ਰਾਂਸਫਰ ਨਹੀਂ / No payment transfer history
                    </td>
                  </tr>
                ) : (
                  relevantPaymentTransfers.map((t, idx) => (
                    <tr key={t.id || idx} className="border-b border-slate-200">
                      <td className="py-0.5 px-1 border-r border-slate-200 text-left font-medium">
                        {t.fromFarmerName} → {t.toFarmerName}
                      </td>
                      <td className="py-0.5 px-1 border-r border-slate-200 font-mono font-bold">
                        {fmtINR(t.amount)}
                      </td>
                      <td className="py-0.5 px-1 border-r border-slate-200 font-mono">{t.date}</td>
                      <td className="py-0.5 px-1 text-left text-slate-600 truncate max-w-[90px]" title={t.reason}>
                        {t.reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-100 font-bold border-t border-slate-300 text-[8px]">
                  <td className="py-0.5 px-1 text-left border-r border-slate-200">Net Transfer Effect:</td>
                  <td colSpan={3} className="py-0.5 px-1 text-right font-mono font-black">
                    {netTransferAmount >= 0 ? `+ ${fmtINR(netTransferAmount)}` : `− ${fmtINR(Math.abs(netTransferAmount))}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Option B: Same Farmer Account Adjustment */}
          <div>
            <div className="bg-slate-50 font-bold px-1.5 py-0.5 border-b border-slate-300 text-slate-900">
              B. SAME FARMER ACCOUNT ADJUSTMENT / ਆਪਣੇ ਖਾਤੇ ਵਿੱਚ ਐਡਜਸਟਮੈਂਟ
            </div>
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-semibold text-[8px]">
                  <th className="py-0.5 px-1 border-r border-slate-200 text-left">Adjustment Type</th>
                  <th className="py-0.5 px-1 border-r border-slate-200 w-[24%]">Amount (₹)</th>
                  <th className="py-0.5 px-1 border-r border-slate-200 w-[18%]">Date</th>
                  <th className="py-0.5 px-1 text-left w-[24%]">Reason</th>
                </tr>
              </thead>
              <tbody>
                {sameFarmerAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-1 text-center text-slate-400 italic">
                      ਕੋਈ ਅੰਦਰੂਨੀ ਐਡਜਸਟਮੈਂਟ ਨਹੀਂ / No same account adjustment
                    </td>
                  </tr>
                ) : (
                  sameFarmerAdjustments.map((a, idx) => (
                    <tr key={a.id || idx} className="border-b border-slate-200">
                      <td className="py-0.5 px-1 border-r border-slate-200 text-left font-medium truncate max-w-[90px]" title={a.typeLabelEn}>
                        {a.typeLabelEn}
                      </td>
                      <td className="py-0.5 px-1 border-r border-slate-200 font-mono font-bold">
                        {fmtINR(a.amount)}
                      </td>
                      <td className="py-0.5 px-1 border-r border-slate-200 font-mono">{a.date}</td>
                      <td className="py-0.5 px-1 text-left text-slate-600 truncate max-w-[90px]" title={a.reason}>
                        {a.reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-100 font-bold border-t border-slate-300 text-[8px]">
                  <td className="py-0.5 px-1 text-left border-r border-slate-200">Accounting Allocation:</td>
                  <td colSpan={3} className="py-0.5 px-1 text-right text-slate-600 italic">
                    (Original records remain intact)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 9. BAG TRANSFER / ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ (Transferred Out / In)                 */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>9. BAG TRANSFER / ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ</span>
          <span className="text-[8px] font-semibold text-slate-500">(Inter-Farmer Remaining Bags Quota Transfer)</span>
        </div>
        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold text-center">
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[18%]">Transfer Direction</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[24%] text-left">From Farmer</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[24%] text-left">To Farmer</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[12%]">Bags</th>
              <th className="py-0.5 px-1.5 border-r border-slate-300 w-[10%]">Date</th>
              <th className="py-0.5 px-1.5 text-left w-[12%]">Reason</th>
            </tr>
          </thead>
          <tbody>
            {bagTransfersOut.length === 0 && bagTransfersIn.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-1 text-center text-slate-500 italic border-b border-slate-200">
                  ਕੋਈ ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ ਨਹੀਂ / No bag transfer recorded for this farmer
                </td>
              </tr>
            ) : (
              <>
                {bagTransfersOut.map((bt, idx) => (
                  <tr key={`out-${bt.id || idx}`} className="border-b border-slate-200 text-center">
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold text-rose-800">
                      Transferred Out (−)
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-medium text-slate-900">
                      {bt.fromFarmerName}
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-medium text-slate-900">
                      {bt.toFarmerName}
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono font-black text-rose-800">
                      − {bt.bags}
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                      {bt.date}
                    </td>
                    <td className="py-0.5 px-1.5 text-left text-slate-600 truncate max-w-[100px]" title={bt.reason}>
                      {bt.reason || '—'}
                    </td>
                  </tr>
                ))}
                {bagTransfersIn.map((bt, idx) => (
                  <tr key={`in-${bt.id || idx}`} className="border-b border-slate-200 text-center">
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-bold text-emerald-800">
                      Transferred In (+)
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-medium text-slate-900">
                      {bt.fromFarmerName}
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 text-left font-medium text-slate-900">
                      {bt.toFarmerName}
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono font-black text-emerald-800">
                      + {bt.bags}
                    </td>
                    <td className="py-0.5 px-1.5 border-r border-slate-200 font-mono text-slate-800">
                      {bt.date}
                    </td>
                    <td className="py-0.5 px-1.5 text-left text-slate-600 truncate max-w-[100px]" title={bt.reason}>
                      {bt.reason || '—'}
                    </td>
                  </tr>
                ))}
              </>
            )}
            <tr className="bg-slate-100 font-bold text-slate-950 border-t border-slate-300 text-[8px]">
              <td colSpan={3} className="py-0.5 px-2 text-left border-r border-slate-200">
                Net Bag Quota Transfer Impact:
              </td>
              <td className="py-0.5 px-1.5 text-center font-mono font-black border-r border-slate-200">
                {netBagTransfer >= 0 ? `+ ${netBagTransfer} Bags` : `− ${Math.abs(netBagTransfer)} Bags`}
              </td>
              <td colSpan={2} className="py-0.5 px-2 text-right text-slate-600">
                (Original arrival & purchase records remain unmodified)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* 10. FINAL ACCOUNT SUMMARY / ਅੰਤਿਮ ਖਾਤਾ ਸਾਰ (Simple Clear Calculation)    */}
      {/* ===================================================================== */}
      <div className="mb-2">
        <div className="bg-slate-100 border border-slate-300 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide flex justify-between items-center text-slate-900">
          <span>10. FINAL ACCOUNT SUMMARY / ਅੰਤਿਮ ਖਾਤਾ ਸਾਰ</span>
          <span className="text-[8px] font-semibold text-slate-500 font-mono">
            Remaining Amount − Labour − (Adv + Int) ± Adjustments
          </span>
        </div>

        <table className="w-full border-collapse border-l border-r border-b border-slate-300 text-[8.5px]">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-[50%] py-0.5 px-2 font-semibold text-slate-800 border-r border-slate-300">
                1. Remaining Amount / ਬਚੀ ਰਕਮ (Section 5):
              </td>
              <td className="w-[50%] py-0.5 px-2 text-right font-mono font-bold text-slate-900">
                {fmtINR(remainingAmount)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-0.5 px-2 font-semibold text-slate-800 border-r border-slate-300">
                2. Less: Total Labour Amount / ਘਟਾਓ: ਕੁੱਲ ਮਜ਼ਦੂਰੀ (Section 6):
              </td>
              <td className="py-0.5 px-2 text-right font-mono font-bold text-slate-900">
                − {fmtINR(totalLabourAmount)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-0.5 px-2 font-semibold text-slate-800 border-r border-slate-300">
                3. Less: Advance + Interest / ਘਟਾਓ: ਅਡਵਾਂਸ ਤੇ ਵਿਆਜ (Section 7):
              </td>
              <td className="py-0.5 px-2 text-right font-mono font-bold text-slate-900">
                − {fmtINR(totalAdvanceWithInterest)}
              </td>
            </tr>
            <tr className="border-b border-slate-300">
              <td className="py-0.5 px-2 font-semibold text-slate-800 border-r border-slate-300">
                4. ± Payment Adjustments / Transfers (Section 8):
              </td>
              <td className="py-0.5 px-2 text-right font-mono font-bold text-slate-900">
                {netTransferAmount >= 0 ? `+ ${fmtINR(netTransferAmount)}` : `− ${fmtINR(Math.abs(netTransferAmount))}`}
              </td>
            </tr>

            {/* FINAL BALANCE AMOUNT (High Contrast Clean Ledger Row) */}
            <tr className="bg-slate-100 font-black text-slate-950 border-b border-slate-400 text-[10px]">
              <td className="py-1 px-2 border-r border-slate-300 uppercase tracking-tight">
                = FINAL BALANCE AMOUNT / ਅੰਤਿਮ ਬਕਾਇਆ ਰਕਮ:
              </td>
              <td className="py-1 px-2 text-right font-mono text-xs text-slate-950">
                {fmtINR(finalBalanceAmount)}
                <span className="text-[8px] font-bold text-slate-600 ml-1.5 uppercase">
                  {finalBalanceAmount >= 0 ? '(Payable / ਦੇਣਯੋਗ)' : '(Receivable / ਲੈਣਯੋਗ)'}
                </span>
              </td>
            </tr>

            {/* Final Balance Bags and Weight */}
            <tr className="bg-slate-50 font-bold text-slate-900 text-[8.5px]">
              <td className="py-0.5 px-2 border-r border-slate-300">
                Final Balance Bags / ਅੰਤਿਮ ਬਾਕੀ ਬੋਰੀਆਂ: <span className="font-mono font-black">{finalBalanceBags} Bags</span>
              </td>
              <td className="py-0.5 px-2 text-right font-mono">
                Final Balance Weight / ਵਜ਼ਨ: <span className="font-black">{finalBalanceWeightQtl.toFixed(2)} Qtl ({finalBalanceWeightKg.toFixed(1)} Kg)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===================================================================== */}
      {/* SIGNATURES AND FOOTER                                                 */}
      {/* ===================================================================== */}
      <div className="mt-4 pt-3 border-t border-slate-300 flex items-end justify-between text-[8.5px] text-slate-800">
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 w-36 mx-auto"></div>
          <div className="font-bold">Farmer Signature / ਅੰਗੂਠਾ</div>
          <div className="text-[7.5px] text-slate-500">ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ</div>
        </div>

        <div className="text-center text-[8px] text-slate-500 leading-tight">
          Computer Generated Account Statement &nbsp;|&nbsp; {settings.firmNameEn || 'Jammu Trading Co.'}
          <br />
          Generated on {printDate}
        </div>

        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 w-36 mx-auto"></div>
          <div className="font-bold">For {firmName}</div>
          <div className="text-[7.5px] text-slate-500">ਅਧਿਕਾਰਤ ਹਸਤਾਖਰ (Authorized Signatory)</div>
        </div>
      </div>
    </div>
  );
};
