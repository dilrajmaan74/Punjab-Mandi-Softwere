import React, { useState, useRef } from 'react';
import { FarmerAdvanceRecord, Farmer } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { formatCurrency, formatDateToDDMMYYYY } from '../../utils/calculations';
import { generateAdvanceWhatsAppMessage, openWhatsApp } from '../../utils/whatsappNotification';
import {
  X,
  Printer,
  Share2,
  FileText,
  Calendar,
  IndianRupee,
  User,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle2,
  Phone,
  Building,
  Tag,
  Clock,
  Eye
} from 'lucide-react';

interface AdvanceVoucherModalProps {
  advance: FarmerAdvanceRecord;
  farmer: Farmer;
  onClose: () => void;
}

export const AdvanceVoucherModal: React.FC<AdvanceVoucherModalProps> = ({
  advance,
  farmer,
  onClose
}) => {
  const { firms, activeFirmId, settings, language } = useMandi();
  const isPa = language === 'pa';
  const printRef = useRef<HTMLDivElement>(null);
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  const activeFirm = firms.find((f) => f.id === activeFirmId) || firms[0];
  const firmName = activeFirm?.name || settings.firmNameEn || 'Jammu Trading Co';
  const firmNamePa = activeFirm?.namePa || settings.firmNamePa || 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ';
  const mandiName = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';
  const firmAddress = activeFirm?.address || settings.firmAddress || 'Dana Mandi Kang Khurd';
  const firmMobile = activeFirm?.mobile || settings.firmMobile || '98147-74651';
  const licenceNo = (activeFirm as any)?.licenceNo || settings.firmLicence || settings.licenceNo || 'JAL/LKH/133';

  const categoryLabels: Record<string, { en: string; pa: string }> = {
    CASH: { en: 'Cash Advance', pa: 'ਨਕਦ ਪੇਸ਼ਗੀ' },
    FERTILIZER: { en: 'Fertilizer / Pesticide', pa: 'ਖਾਦ / ਕੀਟਨਾਸ਼ਕ' },
    SEED: { en: 'Seed Advance', pa: 'ਬੀਜ ਖਰਚਾ' },
    DIESEL: { en: 'Diesel / Fuel', pa: 'ਡੀਜ਼ਲ / ਤੇਲ ਪਰਚੀ' },
    MACHINERY: { en: 'Machinery / Tractor Hire', pa: 'ਟਰੈਕਟਰ / ਮਸ਼ੀਨਰੀ ਕਿਰਾਇਆ' },
    PREVIOUS_BALANCE: { en: 'Previous Season Balance', pa: 'ਪਿਛਲੇ ਸੀਜ਼ਨ ਦਾ ਬਕਾਇਆ' },
    OTHER: { en: 'Other Expense', pa: 'ਹੋਰ ਖਰਚਾ' }
  };

  const catMeta = advance.category ? categoryLabels[advance.category] : categoryLabels['CASH'];
  const repayments = Array.isArray(advance.repayments) ? advance.repayments : [];
  const totalRepaid = advance.totalRepaid || repayments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const originalPrincipal = Number(advance.amount) || 0;
  const netPrincipal = advance.netPrincipalRemaining !== undefined ? advance.netPrincipalRemaining : Math.max(0, originalPrincipal - totalRepaid);
  const interestAmount = Number(advance.interestAmount) || 0;
  const totalPayable = advance.totalPayableWithInterest ?? Math.max(0, netPrincipal + interestAmount);

  let interestRuleDisplay = `${advance.monthlyInterestRate || 0}% / month`;
  if (advance.isInterestFree || advance.interestMode === 'INTEREST_FREE') {
    interestRuleDisplay = isPa ? '0% (ਬਿਨਾਂ ਵਿਆਜ / Interest-Free)' : '0% (Interest-Free)';
  } else if (advance.interestMode === 'YEARLY') {
    interestRuleDisplay = `${advance.annualInterestRate || (advance.monthlyInterestRate * 12)}% ${isPa ? 'ਸਾਲਾਨਾ' : '/ year'} (${advance.compounding === 'HALF_YEARLY' ? (isPa ? 'ਛਿਮਾਹੀ ਚੱਕਰਵਰਤੀ' : 'Half-Yearly Compounded') : (isPa ? 'ਸਾਧਾਰਨ' : 'Simple')})`;
  } else {
    interestRuleDisplay = `${advance.monthlyInterestRate || 0}% ${isPa ? 'ਪ੍ਰਤੀ ਮਹੀਨਾ' : '/ month'} (${isPa ? 'ਸਾਧਾਰਨ' : 'Simple'})`;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const farmerName = farmer.farmerNamePa ? `${farmer.farmerNamePa} (${farmer.farmerName})` : farmer.farmerName;
    const msg = generateAdvanceWhatsAppMessage({
      advance,
      farmerName,
      firm: activeFirm,
      settings
    });
    openWhatsApp(farmer.mobile || '', msg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              {isPa ? 'ਕਿਸਾਨ ਪੇਸ਼ਗੀ ਵਾਊਚਰ / ਪ੍ਰੋਨੋਟ (Advance Voucher)' : 'Farmer Advance Voucher / Pronote'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Voucher #{advance.id} • {advance.date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              {isPa ? 'ਪ੍ਰਿੰਟ ਕਰੋ' : 'Print'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Document */}
        <div ref={printRef} className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 bg-white print-section">
          {/* Print Only CSS */}
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-section, .print-section * { visibility: visible; }
              .print-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 20px !important;
                border: 2px solid #0f172a;
              }
              .no-print { display: none !important; }
            }
          `}</style>

          {/* Firm Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              ਕਮਿਸ਼ਨ ਏਜੰਟ / ਆੜ੍ਹਤੀਆ • COMMISSION AGENT
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {firmNamePa} / {firmName}
            </h1>
            <p className="text-xs text-slate-600 mt-1 font-medium">
              📍 {mandiName} • {firmAddress}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-700 mt-1">
              <span>📞 {firmMobile}</span>
              <span>•</span>
              <span>ਲਾਇਸੰਸ ਨੰਬਰ: {licenceNo}</span>
            </div>
            <div className="mt-3 inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase">
              {isPa ? 'ਪੇਸ਼ਗੀ ਪਰਚੀ / ਵਾਊਚਰ ਰਸੀਦ' : 'ADVANCE PAYMENT VOUCHER / PRONOTE'}
            </div>
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                {isPa ? 'ਵਾਊਚਰ ਨੰਬਰ' : 'Voucher No.'}
              </span>
              <span className="font-mono font-bold text-slate-800 mt-0.5 block">{advance.id}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                {isPa ? 'ਜਾਰੀ ਮਿਤੀ' : 'Issue Date'}
              </span>
              <span className="font-bold text-slate-800 mt-0.5 block">{advance.date}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                {isPa ? 'ਮੰਤਵ / ਮੱਦ' : 'Purpose / Category'}
              </span>
              <span className="font-bold text-indigo-700 mt-0.5 block">
                {isPa ? catMeta?.pa : catMeta?.en}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                {isPa ? 'ਫਸਲ / ਸੀਜ਼ਨ' : 'Crop / Season'}
              </span>
              <span className="font-bold text-emerald-700 mt-0.5 block">
                {advance.cropSeason || (isPa ? 'ਸਾਰੇ ਸੀਜ਼ਨ' : 'General')}
              </span>
            </div>
          </div>

          {/* Farmer & Guarantor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Farmer Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-700" />
                {isPa ? 'ਕਿਸਾਨ ਵੇਰਵਾ (Farmer Details)' : 'Farmer Details'}
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isPa ? 'ਨਾਮ:' : 'Name:'}</span>
                  <span className="font-bold text-slate-800">
                    {farmer.farmerNamePa ? `${farmer.farmerNamePa} (${farmer.farmerName})` : farmer.farmerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isPa ? 'ਖਾਤਾ ਨੰਬਰ:' : 'Farmer ID:'}</span>
                  <span className="font-mono text-slate-700">{farmer.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isPa ? 'ਪਿੰਡ:' : 'Village:'}</span>
                  <span className="text-slate-800">{farmer.villagePa || farmer.village || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isPa ? 'ਮੋਬਾਈਲ:' : 'Mobile:'}</span>
                  <span className="text-slate-800">{farmer.mobile || '—'}</span>
                </div>
                {farmer.aadhaar && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isPa ? 'ਆਧਾਰ ਨੰਬਰ:' : 'Aadhaar:'}</span>
                    <span className="font-mono text-slate-800">
                      •••• •••• {farmer.aadhaar.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Guarantor Card */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                {isPa ? 'ਜ਼ਾਮਨ / ਗਰੰਟਰ (Guarantor / Reference)' : 'Guarantor / Reference'}
              </span>
              {advance.guarantorName ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isPa ? 'ਜ਼ਾਮਨ ਦਾ ਨਾਮ:' : 'Guarantor Name:'}</span>
                    <span className="font-bold text-slate-800">{advance.guarantorName}</span>
                  </div>
                  {advance.guarantorMobile && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isPa ? 'ਮੋਬਾਈਲ:' : 'Mobile:'}</span>
                      <span className="text-slate-800">{advance.guarantorMobile}</span>
                    </div>
                  )}
                  {advance.guarantorFarmerId && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isPa ? 'ਕਿਸਾਨ ਖਾਤਾ:' : 'Farmer ID:'}</span>
                      <span className="font-mono text-slate-700">{advance.guarantorFarmerId}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 italic pt-1">
                    {isPa ? '* ਜ਼ਾਮਨ ਇਸ ਰਕਮ ਦੀ ਵਾਪਸੀ ਲਈ ਜ਼ਿੰਮੇਵਾਰ ਰਹੇਗਾ।' : '* The guarantor acknowledges responsibility for settlement.'}
                  </p>
                </div>
              ) : (
                <div className="py-4 text-center text-slate-400 text-xs">
                  {isPa ? 'ਕੋਈ ਜ਼ਾਮਨ ਦਰਜ ਨਹੀਂ (Direct Advance)' : 'Direct advance (No guarantor specified)'}
                </div>
              )}
            </div>
          </div>

          {/* Item Description (If Any) */}
          {advance.itemDescription && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs">
              <span className="font-bold text-amber-900 block mb-0.5">
                {isPa ? '📝 ਖਰਚਾ ਵੇਰਵਾ / ਸਮਾਨ ਪਰਚੀ:' : '📝 Item / Expense Specification:'}
              </span>
              <p className="text-amber-800">{advance.itemDescription}</p>
            </div>
          )}

          {/* Financial Calculation Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-700">
              {isPa ? 'ਹਿਸਾਬ-ਕਿਤਾਬ ਅਤੇ ਵਿਆਜ ਵੇਰਵਾ (Calculation Breakdown)' : 'Calculation & Interest Breakdown'}
            </div>
            <table className="w-full text-xs text-left">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {isPa ? 'ਮੂਲ ਐਡਵਾਂਸ ਰਕਮ (Original Principal):' : 'Original Principal:'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-slate-900 text-sm">
                    {formatCurrency(originalPrincipal)}
                  </td>
                </tr>

                {totalRepaid > 0 && (
                  <>
                    <tr className="bg-emerald-50/40">
                      <td className="px-4 py-2 text-emerald-800 font-medium">
                        {isPa ? 'ਕੁੱਲ ਅੰਸ਼ਕ ਕਿਸ਼ਤ ਵਾਪਸੀ (Repaid Installments):' : 'Total Repaid Installments:'}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-700">
                        - {formatCurrency(totalRepaid)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-600 font-medium">
                        {isPa ? 'ਬਾਕੀ ਮੂਲ ਰਕਮ (Remaining Principal):' : 'Remaining Principal:'}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-800">
                        {formatCurrency(netPrincipal)}
                      </td>
                    </tr>
                  </>
                )}

                <tr>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {isPa ? 'ਵਿਆਜ ਦਰ ਅਤੇ ਨਿਯਮ (Interest Terms):' : 'Interest Rate & Method:'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {interestRuleDisplay}
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {isPa ? 'ਮਿਤੀ ਤੋਂ ਮਿਤੀ ਸਮਾਂ (Elapsed Duration):' : 'Duration (Start to Till Date):'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-700">
                    <span className="font-bold text-slate-900">{advance.totalDays || 0}</span> {isPa ? 'ਦਿਨ' : 'days'}
                    {advance.monthsElapsed !== undefined && (
                      <span className="text-slate-500 ml-1">
                        ({advance.monthsElapsed} {isPa ? 'ਮਹੀਨੇ' : 'mo'}, {advance.daysElapsed || 0} {isPa ? 'ਦਿਨ' : 'days'})
                      </span>
                    )}
                  </td>
                </tr>

                <tr>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {isPa ? 'ਕੁੱਲ ਵਿਆਜ (Calculated Interest):' : 'Calculated Interest:'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-amber-800">
                    {formatCurrency(interestAmount)}
                  </td>
                </tr>

                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="px-4 py-3">
                    {isPa ? 'ਕੁੱਲ ਦੇਣਯੋਗ ਰਕਮ (Net Total Payable):' : 'NET TOTAL PAYABLE:'}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-300 text-base">
                    {formatCurrency(totalPayable)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Repayments History (If any) */}
          {repayments.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 font-bold text-xs uppercase text-slate-700">
                {isPa ? 'ਕਿਸ਼ਤ ਵਾਪਸੀ ਸੂਚੀ (Installment History)' : 'Installment History'}
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="px-3 py-1.5">#</th>
                    <th className="px-3 py-1.5">{isPa ? 'ਮਿਤੀ' : 'Date'}</th>
                    <th className="px-3 py-1.5">{isPa ? 'ਰਕਮ' : 'Amount'}</th>
                    <th className="px-3 py-1.5">{isPa ? 'ਮੋਡ' : 'Mode'}</th>
                    <th className="px-3 py-1.5">{isPa ? 'ਪਰਚੀ / ਟਿੱਪਣੀ' : 'Ref / Remarks'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repayments.map((r, i) => (
                    <tr key={r.id || i}>
                      <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-700">{r.date}</td>
                      <td className="px-3 py-1.5 font-bold text-emerald-700">{formatCurrency(r.amount)}</td>
                      <td className="px-3 py-1.5 text-slate-600">{r.paymentMode || 'CASH'}</td>
                      <td className="px-3 py-1.5 text-slate-500">{r.remarks || r.referenceNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Attached Slip / Pronote Photo */}
          {advance.voucherPhotoUrl && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 no-print">
              <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                {isPa ? 'ਅਟੈਚ ਕੀਤੀ ਦਸਤਖਤਸ਼ੁਦਾ ਪਰਚੀ / ਪ੍ਰੋਨੋਟ ਫੋਟੋ' : 'Attached Signed Pronote / Receipt Photo'}
              </span>
              <div className="flex items-center gap-3">
                <img
                  src={advance.voucherPhotoUrl}
                  alt="Voucher photo"
                  className="w-24 h-24 object-cover rounded-lg border border-slate-300 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowFullPhoto(true)}
                />
                <div>
                  <button
                    type="button"
                    onClick={() => setShowFullPhoto(true)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isPa ? 'ਵੱਡੀ ਫੋਟੋ ਦੇਖੋ' : 'View Full Image'}
                  </button>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {advance.voucherPhotoName || 'Signed_slip.jpg'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Legal Pronote Declaration */}
          <div className="border-t border-dashed border-slate-300 pt-4 text-[11px] text-slate-600 leading-relaxed">
            <p>
              {isPa
                ? `ਮੈਂ ਹੇਠ ਦਸਤਖਤ ਕਰਤਾ ਕਿਸਾਨ ਤਸਦੀਕ ਕਰਦਾ ਹਾਂ ਕਿ ਮੈਂ ਉਕਤ ਰਕਮ ਮੂਲ ਐਡਵਾਂਸ ਵਜੋਂ ਮਿਤੀ ${advance.date} ਨੂੰ ਪ੍ਰਾਪਤ ਕੀਤੀ ਹੈ। ਮੈਂ ਇਹ ਰਕਮ ਆਉਣ ਵਾਲੀ ਫਸਲ ਦੀ ਤੁਲਾਈ / ਹਿਸਾਬ ਸਮੇਂ ਵਿਆਜ ਸਮੇਤ ਅਦਾ ਕਰਨ ਦਾ ਵਚਨਬੱਧ ਹਾਂ।`
                : `I hereby acknowledge receipt of the aforementioned principal advance on ${advance.date}. I undertake to repay this advance along with agreed interest at the time of crop harvest/settlement.`}
            </p>
          </div>

          {/* Signatures */}
          <div className="pt-10 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="border-t border-slate-800 pt-2 font-bold text-slate-800">
                {isPa ? 'ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ / ਅੰਗੂਠਾ' : "Farmer's Signature / Thumb"}
              </div>
              <span className="text-[10px] text-slate-400">{farmer.farmerName}</span>
            </div>

            <div>
              {advance.guarantorName ? (
                <div>
                  <div className="border-t border-slate-800 pt-2 font-bold text-slate-800">
                    {isPa ? 'ਜ਼ਾਮਨ ਦੇ ਦਸਤਖਤ' : "Guarantor's Signature"}
                  </div>
                  <span className="text-[10px] text-slate-400">{advance.guarantorName}</span>
                </div>
              ) : (
                <div className="border-t border-transparent pt-2"></div>
              )}
            </div>

            <div>
              <div className="border-t border-slate-800 pt-2 font-bold text-slate-800">
                {isPa ? 'ਆੜ੍ਹਤੀਏ / ਮੁਨੀਮ ਦੇ ਦਸਤਖਤ' : 'Authorized Signatory'}
              </div>
              <span className="text-[10px] text-slate-400">{firmName}</span>
            </div>
          </div>
        </div>

        {/* Full Image Modal Lightbox */}
        {showFullPhoto && advance.voucherPhotoUrl && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex flex-col">
              <div className="px-4 py-2 bg-slate-800 text-white flex justify-between items-center text-xs">
                <span>{advance.voucherPhotoName || 'Voucher Slip'}</span>
                <button
                  onClick={() => setShowFullPhoto(false)}
                  className="p-1 rounded-md hover:bg-slate-700 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 overflow-auto flex-1 flex items-center justify-center">
                <img
                  src={advance.voucherPhotoUrl}
                  alt="Full Voucher Slip"
                  className="max-h-[80vh] object-contain rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
          <span className="text-xs text-slate-500">
            {isPa ? 'ਵਾਊਚਰ ਪ੍ਰਿੰਟ ਕਰਕੇ ਕਿਸਾਨ ਅਤੇ ਆੜ੍ਹਤ ਦੋਵਾਂ ਕੋਲ ਰੱਖਿਆ ਜਾ ਸਕਦਾ ਹੈ।' : 'Printed copy can be signed and kept by both parties.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              {isPa ? 'ਪ੍ਰਿੰਟ ਕਰੋ' : 'Print'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
            >
              {isPa ? 'ਬੰਦ ਕਰੋ' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
