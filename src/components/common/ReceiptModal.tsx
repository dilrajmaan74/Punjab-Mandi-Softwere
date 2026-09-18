import React from 'react';
import { useMandi } from '../../context/MandiContext';
import { Printer, X, FileText, User } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

export const ReceiptModal: React.FC = () => {
  const { activeReceipt, setActiveReceipt, settings, firms, activeFirm, language } = useMandi();
  const isEn = language === 'en';

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveReceipt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveReceipt]);

  if (!activeReceipt) return null;

  // Resolve firm details from receipt's firmId, activeFirm, or settings
  const receiptFirm = (activeReceipt.firmId ? firms.find((f) => f.id === activeReceipt.firmId) : null) || activeFirm;
  const firmName = receiptFirm?.name || settings.firmNameEn || 'JAMMU TRADING CO.';
  const firmAddress = receiptFirm?.address || settings.firmAddress || 'Dana Mandi Kang Khurd, Lohian Khas, Jalandhar, Punjab - 144629';
  const firmMobile = receiptFirm?.mobile || settings.firmMobile || '98147-74651';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setActiveReceipt(null);
        }
      }}
    >
      <div 
        className="bg-white rounded-xl border border-slate-300 max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3.5 my-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls Header (Hidden during browser print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm leading-tight">
                {isEn ? 'Farmer Bags Weighment Slip' : 'ਕਿਸਾਨ ਜਿਨਸ ਬੋਰੀਆਂ ਵਜ਼ਨ ਸਲਿੱਪ (Weighment Slip)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Entry #{activeReceipt.entryNumber} • {activeReceipt.date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
              title={isEn ? 'Print Slip' : 'ਸਲਿੱਪ ਪ੍ਰਿੰਟ ਕਰੋ'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print' : 'ਪ੍ਰਿੰਟ ਕਰੋ (Print)'}</span>
            </button>
            {/* Prominent TOP-RIGHT X Close Button */}
            <button
              type="button"
              id="close-weighment-slip-x-btn"
              onClick={() => setActiveReceipt(null)}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 flex items-center justify-center font-bold cursor-pointer transition shadow-2xs active:scale-95"
              aria-label="Close"
              title={isEn ? 'Close Slip (Esc)' : 'ਬੰਦ ਕਰੋ (Esc)'}
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Printable Document Box */}
        <div className="bg-white p-4 sm:p-6 border border-slate-300 rounded-lg text-slate-900 text-xs font-sans print:border-none print:p-0 print:m-0">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
            {/* Firm Information (Top of the Slip, above Dana Mandi Kang Khurd) */}
            <div className="mb-2.5 text-center">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase font-sans leading-snug">
                {firmName}
              </h1>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-normal">
                {firmAddress}
              </p>
              <p className="text-xs font-semibold text-slate-800 leading-normal">
                Mobile: <span className="font-mono font-bold text-slate-950">{firmMobile}</span>
              </p>
            </div>

            {/* Existing Mandi, Market Committee, and Weighment Slip Heading */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-0.5">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                {isEn ? settings.mandiNameEn : `${settings.mandiNamePa} / ${settings.mandiNameEn}`}
              </h2>
              <p className="text-xs font-bold text-slate-700">
                {isEn ? settings.marketCommitteeEn : `${settings.marketCommitteePa} (${settings.marketCommitteeEn})`}
              </p>
              <div className="mt-1.5 inline-block bg-slate-900 text-white font-black text-[11px] px-3 py-0.5 rounded-sm uppercase tracking-wide">
                {isEn ? 'FARMER BAGS WEIGHMENT SLIP' : 'ਕਿਸਾਨ ਜਿਨਸ ਬੋਰੀਆਂ ਵਜ਼ਨ ਤੇ ਰਸੀਦ (FARMER BAGS WEIGHMENT SLIP)'}
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] mt-2.5 pt-1.5 border-t border-slate-200 font-mono font-bold text-slate-700">
              <div>{isEn ? 'Slip No:' : 'ਰਸੀਦ ਨੰਬਰ (Slip No):'} <span className="text-slate-950">{activeReceipt.entryNumber}</span></div>
              <div>{isEn ? 'Date:' : 'ਮਿਤੀ (Date):'} <span className="text-slate-950">{activeReceipt.date}</span></div>
            </div>
          </div>

          {/* Farmer Details Box with Photo */}
          <div className="border border-slate-300 rounded-md p-3 bg-slate-50/60 mb-3.5 flex items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-slate-500 font-semibold">{isEn ? 'Farmer Name:' : 'ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name):'}</span>{' '}
                  <strong className="text-slate-950 font-bold">
                    {isEn ? activeReceipt.farmerName : `${activeReceipt.farmerNamePa || activeReceipt.farmerName} (${activeReceipt.farmerName})`}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">{isEn ? 'Farmer ID:' : 'ਕਿਸਾਨ ਆਈ.ਡੀ (Farmer ID):'}</span>{' '}
                  <strong className="text-emerald-800 font-mono font-black">{activeReceipt.farmerId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">{isEn ? 'Village:' : 'ਪਿੰਡ (Village):'}</span>{' '}
                  <strong className="text-slate-950">
                    {isEn ? activeReceipt.farmerVillage : `${activeReceipt.farmerVillagePa || activeReceipt.farmerVillage} (${activeReceipt.farmerVillage})`}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">{isEn ? 'Mobile:' : 'ਮੋਬਾਈਲ (Mobile):'}</span>{' '}
                  <strong className="text-slate-950 font-mono">{activeReceipt.farmerMobile}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold">{isEn ? 'Aadhaar No:' : 'ਆਧਾਰ ਨੰਬਰ (Aadhaar No):'}</span>{' '}
                  <strong className="text-slate-950 font-mono">{activeReceipt.farmerAadhaar}</strong>
                </div>
              </div>
            </div>

            {/* Farmer Photo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-200 border border-slate-300 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center">
              {activeReceipt.farmerPhotoUrl ? (
                <img
                  src={activeReceipt.farmerPhotoUrl}
                  alt={activeReceipt.farmerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
          </div>

          {/* Weighment & Calculation Table */}
          <table className="w-full border-collapse border border-slate-300 text-xs mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <th className="border border-slate-300 py-1.5 px-2 text-left">{isEn ? 'Particulars' : 'ਵੇਰਵਾ (Particulars)'}</th>
                <th className="border border-slate-300 py-1.5 px-2 text-center">{isEn ? 'Rate / Rule' : 'ਮਾਪ / ਦਰ (Rate / Rule)'}</th>
                <th className="border border-slate-300 py-1.5 px-2 text-right">{isEn ? 'Weight / Value' : 'ਕੁੱਲ ਮਾਤਰਾ / ਵਜ਼ਨ (Weight / Value)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="border border-slate-300 py-1.5 px-2 font-medium">
                  {isEn ? 'Total Bags' : 'ਕੁੱਲ ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ (Total Bags)'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-emerald-800">
                  Fixed 37.50 KG / Bag
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-right font-bold text-slate-900 font-mono">
                  {activeReceipt.bags} Bags
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 py-1.5 px-2 font-medium">
                  {isEn ? 'Total Bags Weight' : 'ਬੋਰੀਆਂ ਦਾ ਕੁੱਲ ਵਜ਼ਨ (Total Bags Weight)'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-mono text-slate-600">
                  {activeReceipt.bags} × 37.50 KG
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-right font-black text-slate-950 font-mono">
                  {activeReceipt.totalBagsWeightDisplay}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 py-1.5 px-2 font-medium text-slate-700">
                  {isEn ? 'Separate Tota' : 'ਵੱਖਰਾ ਟੋਟਾ (Separate Tota)'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center text-slate-500">
                  In Kilograms
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-right font-bold text-slate-800 font-mono">
                  {activeReceipt.totaKg} Kg
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="border border-slate-300 py-2 px-2 font-black text-slate-950">
                  {isEn ? 'Grand Total Weight' : 'ਕੁੱਲ ਗ੍ਰੈਂਡ ਟੋਟਲ ਵਜ਼ਨ (Grand Total Weight)'}
                </td>
                <td className="border border-slate-300 py-2 px-2 text-center text-slate-700">
                  Bags Weight + Tota
                </td>
                <td className="border border-slate-300 py-2 px-2 text-right font-black text-sm text-emerald-950 font-mono">
                  {activeReceipt.grandTotalDisplay}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 py-1.5 px-2 font-medium">
                  {isEn ? 'Bardana Type' : 'ਬਾਰਦਾਨਾ ਕਿਸਮ (Bardana Type)'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                  {isEn
                    ? (activeReceipt.bardana === 'OLD' ? 'Old Juth' : 'New Juth')
                    : (activeReceipt.bardana === 'OLD' ? 'Old Juth (ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ)' : 'New Juth (ਨਵਾਂ ਬਾਰਦਾਨਾ)')}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-right font-bold text-slate-800">
                  {isEn
                    ? (activeReceipt.bardana === 'OLD' ? 'Old' : 'New')
                    : (activeReceipt.bardana === 'OLD' ? 'ਪੁਰਾਣਾ (Old)' : 'ਨਵਾਂ (New)')}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 py-1.5 px-2 font-medium">
                  {isEn ? 'Mandi Rate' : 'ਸਰਕਾਰੀ ਭਾਅ / ਦਰ (Mandi Rate)'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-900">
                  ₹2,461 / Qul
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                  ₹2,461.00
                </td>
              </tr>
              <tr className="bg-slate-50 border-t border-slate-300">
                <td colSpan={2} className="border border-slate-300 py-1.5 px-2 text-right font-bold text-slate-800 text-xs">
                  {isEn ? 'Gross Value:' : 'ਕੁੱਲ ਗ੍ਰਾਸ ਰਕਮ (Gross Value):'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(activeReceipt.totalAmount)}
                </td>
              </tr>

              {/* Labour and other deductions if present */}
              {activeReceipt.labourDeductions && (
                <>
                  {activeReceipt.labourDeductions.pakkiLabourEnabled && (
                    <tr className="text-rose-800">
                      <td className="border border-slate-300 py-1 px-2 font-medium">
                        {isEn ? 'Deduction: Pakki Labour' : 'ਕਟੌਤੀ: ਪੱਕੀ ਮਜ਼ਦੂਰੀ (Pakki Labour)'}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                        {activeReceipt.labourDeductions.pakkiBagsCount ?? activeReceipt.bags} ਬੋਰੀਆਂ @ ₹{activeReceipt.labourDeductions.pakkiLabourRate}/ਬੋਰੀ
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-right font-mono font-bold">
                        -{formatCurrency(activeReceipt.labourDeductions.pakkiLabourAmount)}
                      </td>
                    </tr>
                  )}
                  {activeReceipt.labourDeductions.pakkaDoubleLabourEnabled && (
                    <tr className="text-rose-800">
                      <td className="border border-slate-300 py-1 px-2 font-medium">
                        {isEn ? 'Deduction: Pakka Double Labour' : 'ਕਟੌਤੀ: ਡਬਲ ਮਜ਼ਦੂਰੀ (Double Labour)'}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                        {activeReceipt.labourDeductions.doubleBagsCount ?? activeReceipt.bags} ਬੋਰੀਆਂ @ ₹{activeReceipt.labourDeductions.pakkaDoubleLabourRate}/ਬੋਰੀ
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-right font-mono font-bold">
                        -{formatCurrency(activeReceipt.labourDeductions.pakkaDoubleLabourAmount)}
                      </td>
                    </tr>
                  )}
                  {activeReceipt.labourDeductions.sukhiLabourEnabled && (
                    <tr className="text-rose-800">
                      <td className="border border-slate-300 py-1 px-2 font-medium">
                        {isEn ? 'Deduction: Sukki Labour' : 'ਕਟੌਤੀ: ਸੁੱਕੀ ਮਜ਼ਦੂਰੀ (Sukki Labour)'}
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                        {activeReceipt.labourDeductions.sukkiBagsCount ?? activeReceipt.bags} ਬੋਰੀਆਂ @ ₹{activeReceipt.labourDeductions.sukhiLabourRate}/ਬੋਰੀ
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-right font-mono font-bold">
                        -{formatCurrency(activeReceipt.labourDeductions.sukhiLabourAmount)}
                      </td>
                    </tr>
                  )}
                  {activeReceipt.labourDeductions.customDeductions
                    ?.filter((c: any) => c.enabled && c.amount > 0)
                    .map((custom: any) => (
                      <tr key={custom.id} className="text-rose-800">
                        <td className="border border-slate-300 py-1 px-2 font-medium">
                          {isEn ? `Deduction: ${custom.nameEn || custom.namePa}` : `ਕਟੌਤੀ: ${custom.namePa || custom.nameEn}`}
                        </td>
                        <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                          {custom.type === 'PER_QTL' ? `@ ₹${custom.rate}/Qtl` : 'Fixed'}
                        </td>
                        <td className="border border-slate-300 py-1 px-2 text-right font-mono font-bold">
                          -{formatCurrency(custom.amount)}
                        </td>
                      </tr>
                    ))}
                </>
              )}

              <tr className="bg-emerald-50/90 border-t-2 border-slate-900">
                <td colSpan={2} className="border border-slate-300 py-2 px-2 text-right font-black text-slate-900 text-xs">
                  {isEn ? 'Net Payable to Farmer:' : 'ਕਿਸਾਨ ਨੂੰ ਸ਼ੁੱਧ ਅਦਾਇਗੀ (Net Payable to Farmer):'}
                </td>
                <td className="border border-slate-300 py-2 px-2 text-right font-black text-emerald-950 font-mono text-sm">
                  {formatCurrency(activeReceipt.netAmount ?? activeReceipt.totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-4 border-t border-slate-300 text-[11px]">
            <div className="text-center">
              <div className="h-9 border-b border-dashed border-slate-400"></div>
              <div className="font-bold text-slate-700 mt-1">
                {isEn ? 'Farmer Signature / Thumb Impression' : 'ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ / ਅੰਗੂਠਾ'}
              </div>
              {!isEn && <div className="text-[10px] text-slate-400">(Farmer Signature / Thumb)</div>}
            </div>
            <div className="text-center">
              <div className="h-9 border-b border-dashed border-slate-400"></div>
              <div className="font-bold text-slate-700 mt-1">
                {isEn ? 'Arhtiya / Authorized Signatory & Stamp' : 'ਆੜ੍ਹਤੀਆ / ਮੁਨੀਮ ਦਸਤਖਤ ਤੇ ਮੋਹਰ'}
              </div>
              {!isEn && <div className="text-[10px] text-slate-400">(Arhtiya / Authorized Signatory & Stamp)</div>}
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden during browser print) */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200 print:hidden">
          <button
            type="button"
            id="close-receipt-modal-footer-btn"
            onClick={() => setActiveReceipt(null)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-300 cursor-pointer"
          >
            {isEn ? 'Close' : 'ਬੰਦ ਕਰੋ (Close)'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isEn ? 'Print Slip' : 'ਸਲਿੱਪ ਪ੍ਰਿੰਟ ਕਰੋ (Print Slip)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
