import React from 'react';
import { useMandi } from '../../context/MandiContext';
import { Printer, X, FileText, User } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

export const ReceiptModal: React.FC = () => {
  const { activeReceipt, setActiveReceipt, settings } = useMandi();

  if (!activeReceipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-300 max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3.5 my-6">
        {/* Controls Header (Hidden during browser print) */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                ਬੋਰੀਆਂ ਰਸੀਦ ਪ੍ਰਿੰਟ (Print Bags Entry Receipt)
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Entry #{activeReceipt.entryNumber} • {activeReceipt.date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ਪ੍ਰਿੰਟ ਕਰੋ (Print)</span>
            </button>
            <button
              onClick={() => setActiveReceipt(null)}
              className="p-1 text-slate-400 hover:text-slate-700 font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Box */}
        <div className="bg-white p-4 sm:p-6 border border-slate-300 rounded-lg text-slate-900 text-xs font-sans print:border-none print:p-0 print:m-0">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
            <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
              {settings.mandiNamePa} / {settings.mandiNameEn}
            </h1>
            <p className="text-xs font-bold text-slate-700">
              {settings.marketCommitteePa} ({settings.marketCommitteeEn})
            </p>
            <div className="mt-1.5 inline-block bg-slate-900 text-white font-black text-[11px] px-3 py-0.5 rounded-sm">
              ਕਿਸਾਨ ਜਿਨਸ ਬੋਰੀਆਂ ਵਜ਼ਨ ਤੇ ਰਸੀਦ (FARMER BAGS WEIGHMENT SLIP)
            </div>
            <div className="flex justify-between items-center text-[11px] mt-2 font-mono font-bold text-slate-700">
              <div>ਰਸੀਦ ਨੰਬਰ (Slip No): <span className="text-slate-950">{activeReceipt.entryNumber}</span></div>
              <div>ਮਿਤੀ (Date): <span className="text-slate-950">{activeReceipt.date}</span></div>
            </div>
          </div>

          {/* Farmer Details Box with Photo */}
          <div className="border border-slate-300 rounded-md p-3 bg-slate-50/60 mb-3.5 flex items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="text-slate-500 font-semibold">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name):</span>{' '}
                  <strong className="text-slate-950 font-bold">{activeReceipt.farmerNamePa || activeReceipt.farmerName} ({activeReceipt.farmerName})</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">ਕਿਸਾਨ ਆਈ.ਡੀ (Farmer ID):</span>{' '}
                  <strong className="text-emerald-800 font-mono font-black">{activeReceipt.farmerId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">ਪਿੰਡ (Village):</span>{' '}
                  <strong className="text-slate-950">{activeReceipt.farmerVillagePa || activeReceipt.farmerVillage} ({activeReceipt.farmerVillage})</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">ਮੋਬਾਈਲ (Mobile):</span>{' '}
                  <strong className="text-slate-950 font-mono">{activeReceipt.farmerMobile}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold">ਆਧਾਰ ਨੰਬਰ (Aadhaar No):</span>{' '}
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
                <th className="border border-slate-300 py-1.5 px-2 text-left">ਵੇਰਵਾ (Particulars)</th>
                <th className="border border-slate-300 py-1.5 px-2 text-center">ਮਾਪ / ਦਰ (Rate / Rule)</th>
                <th className="border border-slate-300 py-1.5 px-2 text-right">ਕੁੱਲ ਮਾਤਰਾ / ਵਜ਼ਨ (Weight / Value)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="border border-slate-300 py-1.5 px-2 font-medium">
                  ਕੁੱਲ ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ (Total Bags)
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
                  ਬੋਰੀਆਂ ਦਾ ਕੁੱਲ ਵਜ਼ਨ (Total Bags Weight)
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
                  ਵੱਖਰਾ ਟੋਟਾ (Separate Tota)
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
                  ਕੁੱਲ ਗ੍ਰੈਂਡ ਟੋਟਲ ਵਜ਼ਨ (Grand Total Weight)
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
                  ਬਾਰਦਾਨਾ ਕਿਸਮ (Bardana Type)
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                  {activeReceipt.bardana === 'OLD' ? 'Old Bag (ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ)' : 'New Bag (ਨਵਾਂ ਬਾਰਦਾਨਾ)'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-right font-bold text-slate-800">
                  {activeReceipt.bardana === 'OLD' ? 'ਪੁਰਾਣਾ (Old)' : 'ਨਵਾਂ (New)'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 py-1.5 px-2 font-medium">
                  ਸਰਕਾਰੀ ਭਾਅ / ਦਰ (Mandi Rate)
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
                  ਕੁੱਲ ਗ੍ਰਾਸ ਰਕਮ (Gross Value):
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
                        ਕਟੌਤੀ: ਪੱਕੀ ਮਜ਼ਦੂਰੀ (Pakki Labour)
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                        @ ₹{activeReceipt.labourDeductions.pakkiLabourRate}/Qtl
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-right font-mono font-bold">
                        -{formatCurrency(activeReceipt.labourDeductions.pakkiLabourAmount)}
                      </td>
                    </tr>
                  )}
                  {activeReceipt.labourDeductions.pakkaDoubleLabourEnabled && (
                    <tr className="text-rose-800">
                      <td className="border border-slate-300 py-1 px-2 font-medium">
                        ਕਟੌਤੀ: ਪੱਕੀ ਡਬਲ ਮਜ਼ਦੂਰੀ (Pakka Double Labour)
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                        @ ₹{activeReceipt.labourDeductions.pakkaDoubleLabourRate}/Qtl
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-right font-mono font-bold">
                        -{formatCurrency(activeReceipt.labourDeductions.pakkaDoubleLabourAmount)}
                      </td>
                    </tr>
                  )}
                  {activeReceipt.labourDeductions.sukhiLabourEnabled && (
                    <tr className="text-rose-800">
                      <td className="border border-slate-300 py-1 px-2 font-medium">
                        ਕਟੌਤੀ: ਸੁੱਕੀ ਮਜ਼ਦੂਰੀ (Sukhi Labour)
                      </td>
                      <td className="border border-slate-300 py-1 px-2 text-center font-mono">
                        @ ₹{activeReceipt.labourDeductions.sukhiLabourRate}/Qtl
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
                          ਕਟੌਤੀ: {custom.namePa || custom.nameEn}
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
                  ਕਿਸਾਨ ਨੂੰ ਸ਼ੁੱਧ ਅਦਾਇਗੀ (Net Payable to Farmer):
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
              <div className="font-bold text-slate-700 mt-1">ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ / ਅੰਗੂਠਾ</div>
              <div className="text-[10px] text-slate-400">(Farmer Signature / Thumb)</div>
            </div>
            <div className="text-center">
              <div className="h-9 border-b border-dashed border-slate-400"></div>
              <div className="font-bold text-slate-700 mt-1">ਆੜ੍ਹਤੀਆ / ਮੁਨੀਮ ਦਸਤਖਤ ਤੇ ਮੋਹਰ</div>
              <div className="text-[10px] text-slate-400">(Arhtiya / Authorized Signatory & Stamp)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
