import React, { useState, useMemo } from 'react';
import { DailyPurchaseRecord, MandiFirm, MandiSettings } from '../../types/mandi';
import { formatCurrency, formatKgToQulKg } from '../../utils/calculations';
import {
  Building2,
  Calendar,
  Printer,
  X,
  FileText,
  UserCheck,
  CheckCircle2,
  Scale,
  Users
} from 'lucide-react';

interface AgencyProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DailyPurchaseRecord[];
  firm: MandiFirm | null;
  settings: MandiSettings;
  language?: string;
}

export const AgencyProcurementModal: React.FC<AgencyProcurementModalProps> = ({
  isOpen,
  onClose,
  records,
  firm,
  settings,
  language = 'pa'
}) => {
  const isEn = language === 'en';

  // Get distinct dates
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.date) set.add(r.date);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  // Get distinct agencies
  const availableAgencies = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.agency) set.add(r.agency);
    });
    return Array.from(set).sort();
  }, [records]);

  const [selectedDate, setSelectedDate] = useState<string>(
    availableDates[0] || new Date().toISOString().split('T')[0]
  );
  const [selectedAgency, setSelectedAgency] = useState<string>(
    availableAgencies[0] || 'ALL'
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchDate = selectedDate === 'ALL' || r.date === selectedDate;
      const matchAgency = selectedAgency === 'ALL' || r.agency.toLowerCase() === selectedAgency.toLowerCase();
      return matchDate && matchAgency;
    });
  }, [records, selectedDate, selectedAgency]);

  if (!isOpen) return null;

  const firmName = firm?.namePa || firm?.name || settings.firmNamePa || settings.firmNameEn || 'JAMMU TRADING CO.';
  const firmMobile = firm?.mobile || settings.firmMobile || '98147-74651';
  const mandiName = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';

  // Summary Totals
  const totalBags = filteredRecords.reduce((sum, r) => sum + (r.bags || 0), 0);
  const totalNewBags = filteredRecords.reduce((sum, r) => sum + (r.newBags || 0), 0);
  const totalOldBags = filteredRecords.reduce((sum, r) => sum + (r.oldBags || 0), 0);
  const totalWeightKg = filteredRecords.reduce((sum, r) => sum + (r.totalWeightKg || 0), 0);
  const weightBreakdown = formatKgToQulKg(totalWeightKg);
  const totalGrossAmount = filteredRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalDeductions = filteredRecords.reduce(
    (sum, r) => sum + (r.labourDeductions?.grandTotalDeductions || 0),
    0
  );
  const totalNetAmount = filteredRecords.reduce(
    (sum, r) => sum + (r.netAmount ?? r.totalAmount ?? 0),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar (Hidden in Print) */}
        <div className="print:hidden p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-indigo-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 rounded-xl text-slate-950 shadow-xs font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  {isEn ? 'Agency Daily Procurement Voucher & Sign Sheet' : 'ਸਰਕਾਰੀ ਏਜੰਸੀ ਖਰੀਦ ਵਾਊਚਰ ਤੇ ਇੰਸਪੈਕਟਰ ਸ਼ੀਟ'}
                </h3>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredRecords.length} {isEn ? 'Farmers' : 'ਕਿਸਾਨ'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                {isEn
                  ? 'Consolidated agency purchase statement with official inspector verification and sign block'
                  : 'ਏਜੰਸੀ ਅਨੁਸਾਰ ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਦਾ ਮੁਕੰਮਲ ਵੇਰਵਾ ਅਤੇ ਸਰਕਾਰੀ ਇੰਸਪੈਕਟਰ ਦੇ ਦਸਤਖ਼ਤ ਲਈ ਪ੍ਰਮਾਣਿਤ ਸ਼ੀਟ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isEn ? 'Print Sheet' : 'ਸ਼ੀਟ ਪ੍ਰਿੰਟ ਕਰੋ (A4)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden in Print) */}
        <div className="print:hidden p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Selector */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-700">ਮਿਤੀ (Date):</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">ਸਾਰੀਆਂ ਮਿਤੀਆਂ (All Dates)</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Agency Selector */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="font-bold text-slate-700">ਖਰੀਦਦਾਰ ਏਜੰਸੀ (Agency):</span>
              <select
                value={selectedAgency}
                onChange={(e) => setSelectedAgency(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              >
                <option value="ALL">ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)</option>
                {availableAgencies.map((ag) => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
            ਕੁੱਲ ਬੋਰੀਆਂ: <strong>{totalBags}</strong> • ਵਜ਼ਨ: <strong>{weightBreakdown.displayEn}</strong>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white text-slate-900 font-sans print:p-0">
          <div className="border border-slate-300 rounded-xl p-4 sm:p-6 space-y-4 print:border-none print:p-0">
            {/* Top Official Letterhead */}
            <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                {firmName}
              </h1>
              <div className="text-xs font-bold text-slate-700">
                ਕਮਿਸ਼ਨ ਏਜੰਟ ਅਤੇ ਆੜ੍ਹਤੀਆ • {mandiName}
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                ਮੋਬਾਈਲ: {firmMobile} | ਲਾਇਸੈਂਸ ਨੰਬਰ: {settings.marketCommitteeLicenseNo || 'MKT/2026/089'}
              </div>
              <div className="inline-block bg-slate-900 text-white font-black text-xs px-3 py-1 rounded-sm mt-1 uppercase">
                ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਵਾਊਚਰ ਤੇ ਇੰਸਪੈਕਟਰ ਤਸਦੀਕ ਸ਼ੀਟ (Procurement Voucher)
              </div>
            </div>

            {/* Meta Info Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] font-sans font-bold">ਖਰੀਦਦਾਰ ਏਜੰਸੀ:</span>
                <strong className="text-sm font-black text-indigo-900">{selectedAgency}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans font-bold">ਖਰੀਦ ਮਿਤੀ:</span>
                <strong className="text-sm font-black text-slate-900">{selectedDate}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans font-bold">ਕੁੱਲ ਕਿਸਾਨ:</span>
                <strong className="text-sm font-black text-slate-900">{filteredRecords.length}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans font-bold">ਦਾਣਾ ਮੰਡੀ:</span>
                <strong className="text-sm font-black text-slate-900">{mandiName}</strong>
              </div>
            </div>

            {/* Table of Farmers Under Agency */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-10">ਲੜੀ</th>
                    <th className="py-2 px-2 border-r border-slate-300 w-24">ਐਂਟਰੀ / ਪਰਚੀ</th>
                    <th className="py-2 px-3 border-r border-slate-300">ਕਿਸਾਨ ਦਾ ਨਾਂ ਤੇ ਪਿੰਡ</th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-16">ਨਵਾਂ</th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-16">ਪੁਰਾਣਾ</th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-18 font-black">ਕੁੱਲ ਬੋਰੀਆਂ</th>
                    <th className="py-2 px-3 border-r border-slate-300 text-right font-black">ਕੁੱਲ ਵਜ਼ਨ</th>
                    <th className="py-2 px-2 border-r border-slate-300 text-center w-20">ਦਰ (₹/Qtl)</th>
                    <th className="py-2 px-3 text-right font-black">ਕੁੱਲ ਰਕਮ (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400 font-sans italic">
                        ਚੁਣੀ ਗਈ ਮਿਤੀ ਅਤੇ ਏਜੰਸੀ ਲਈ ਕੋਈ ਖਰੀਦ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ।
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                        <td className="py-2 px-2 border-r border-slate-200 font-bold text-slate-700">
                          {r.id}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-sans">
                          <strong className="text-slate-900 block text-xs">{r.farmerNamePa || r.farmerName}</strong>
                          <span className="text-[10px] text-slate-500">ਸ/ਓ {r.farmerFatherName || r.fatherName || '—'} • ਪਿੰਡ: {r.farmerVillagePa || r.farmerVillage || r.village || '—'}</span>
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center">{r.newBags || 0}</td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center">{r.oldBags || 0}</td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-black text-xs text-slate-950">
                          {r.bags}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-emerald-950">
                          {r.totalWeightDisplay || `${r.qul} Qtl ${r.kg} Kg`}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-bold">
                          ₹{r.rate}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-950 text-xs">
                          {formatCurrency(r.totalAmount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Table Footer Totals */}
                {filteredRecords.length > 0 && (
                  <tfoot className="bg-slate-100 font-mono font-bold text-xs border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 border-r border-slate-300 font-sans text-right font-black">
                        ਕੁੱਲ ਜੋੜ (Grand Total):
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-300 text-center font-black">{totalNewBags}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 text-center font-black">{totalOldBags}</td>
                      <td className="py-2.5 px-2 border-r border-slate-300 text-center font-black text-sm text-indigo-950">
                        {totalBags}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-300 text-right font-black text-sm text-emerald-950">
                        {weightBreakdown.displayEn}
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-300 text-center text-slate-500">—</td>
                      <td className="py-2.5 px-3 text-right font-black text-sm text-emerald-950">
                        {formatCurrency(totalGrossAmount)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Official Inspection & Verification Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-300 mt-6 text-xs font-sans">
              <div className="text-center space-y-12">
                <div className="border-b border-dashed border-slate-400 pb-1"></div>
                <div>
                  <strong className="block text-slate-900 text-sm">ਹਸਤਾਖ਼ਰ ਆੜ੍ਹਤੀਆ / ਮੁਨੀਮ</strong>
                  <span className="text-[11px] text-slate-500">{firmName}</span>
                </div>
              </div>

              <div className="text-center space-y-12">
                <div className="border-b border-dashed border-slate-400 pb-1"></div>
                <div>
                  <strong className="block text-slate-900 text-sm">ਹਸਤਾਖ਼ਰ ਏਜੰਸੀ ਖਰੀਦ ਇੰਸਪੈਕਟਰ</strong>
                  <span className="text-[11px] text-slate-500">
                    ਖਰੀਦ ਏਜੰਸੀ: {selectedAgency} • ਮੋਹਰ (Stamp)
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="text-center text-[10px] text-slate-500 italic pt-2 border-t border-slate-200">
              ਇਹ ਪੰਜਾਬ ਮੰਡੀ ਸਾਫਟਵੇਅਰ ਵੱਲੋਂ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਕੰਪਿਊਟਰਾਈਜ਼ਡ ਖਰੀਦ ਵਾਊਚਰ ਹੈ। ਮਿਤੀ: {new Date().toLocaleDateString('en-GB')}.
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer (Hidden in Print) */}
        <div className="print:hidden p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-mono">
            ਏਜੰਸੀ: <strong>{selectedAgency}</strong> • ਰਿਕਾਰਡ: <strong>{filteredRecords.length}</strong> • ਰਕਮ: <strong className="text-emerald-900">{formatCurrency(totalGrossAmount)}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print Sheet' : 'ਸ਼ੀਟ ਪ੍ਰਿੰਟ ਕਰੋ'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {isEn ? 'Close' : 'ਬੰਦ ਕਰੋ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
