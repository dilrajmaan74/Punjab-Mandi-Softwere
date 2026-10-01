import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  Send,
  CheckCircle2,
  Share2,
  Copy,
  Smartphone,
  FileText,
  Building2,
  User,
  Scale,
  Calendar,
  Layers,
  Check,
  ExternalLink,
  Phone,
  Clock
} from 'lucide-react';
import { BagsEntryRecord, MandiSettings, MandiFirm } from '../../types/mandi';
import { formatCurrency, formatKgToQulKg } from '../../utils/calculations';
import { openWhatsApp, cleanMobileForWhatsApp } from '../../utils/whatsappNotification';

interface BatchPrintAndWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedEntries: BagsEntryRecord[];
  batchDate: string;
  firm: MandiFirm | null;
  settings: MandiSettings;
  language?: string;
}

export const BatchPrintAndWhatsAppModal: React.FC<BatchPrintAndWhatsAppModalProps> = ({
  isOpen,
  onClose,
  savedEntries,
  batchDate,
  firm,
  settings,
  language = 'pa'
}) => {
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'print' | 'whatsapp'>('print');
  const [printLayout, setPrintLayout] = useState<'thermal' | 'a4'>('thermal');
  const [sentFarmerIds, setSentFarmerIds] = useState<Record<string, boolean>>({});
  const [copiedFarmerId, setCopiedFarmerId] = useState<string | null>(null);

  if (!isOpen || savedEntries.length === 0) return null;

  const firmName = firm?.namePa || firm?.name || settings.firmNamePa || settings.firmNameEn || 'JAMMU TRADING CO.';
  const firmMobile = firm?.mobile || settings.firmMobile || '98147-74651';
  const mandiName = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';

  // Batch Aggregates
  const totalBags = savedEntries.reduce((sum, e) => sum + (e.bags || 0), 0);
  const totalNewBags = savedEntries.reduce((sum, e) => sum + (e.newBags || 0), 0);
  const totalOldBags = savedEntries.reduce((sum, e) => sum + (e.oldBags || 0), 0);
  const totalWeightKg = savedEntries.reduce((sum, e) => sum + (e.grandTotalKg || 0), 0);
  const totalWeightDisplay = formatKgToQulKg(totalWeightKg).displayEn;
  const totalNetAmount = savedEntries.reduce((sum, e) => sum + (e.netAmount ?? e.totalAmount ?? 0), 0);

  // Trigger print dialog
  const handlePrintAll = () => {
    window.print();
  };

  // Generate WhatsApp message for single batch entry
  const getWhatsAppMessage = (entry: BagsEntryRecord) => {
    const farmerName = entry.farmerNamePa || entry.farmerName;
    const village = entry.farmerVillagePa || entry.farmerVillage || '—';
    const parchiNo = entry.parchiNo ? `#${entry.parchiNo}` : entry.entryNumber;
    const bagsCount = entry.bags || 0;
    const weightDisplay = entry.grandTotalDisplay || entry.totalBagsWeightDisplay || '—';
    const tota = entry.totaKg ? `${entry.totaKg} Kg` : '0 Kg';
    const rate = entry.ratePerQtl || 2475;
    const netAmt = entry.netAmount ?? entry.totalAmount ?? 0;

    return [
      `🌾 *${firmName}*`,
      `📍 ${mandiName} | 📞 ${firmMobile}`,
      `--------------------------------`,
      `📄 *ਤੁਲਾਈ ਪਰਚੀ (Weighment Slip): ${parchiNo}*`,
      `📅 *ਮਿਤੀ (Date):* ${entry.date || batchDate}`,
      `👤 *ਕਿਸਾਨ:* ${farmerName} (${village})`,
      `📱 *ਮੋਬਾਈਲ:* ${entry.farmerMobile || '—'}`,
      `--------------------------------`,
      `📦 *ਕੁੱਲ ਬੋਰੀਆਂ (Total Bags):* ${bagsCount} (${entry.newBags || 0} ਨਵਾਂ + ${entry.oldBags || 0} ਪੁਰਾਣਾ)`,
      `⚖️ *ਟੋਟਾ (Tota):* ${tota}`,
      `⚖️ *ਕੁੱਲ ਵਜ਼ਨ (Total Weight):* ${weightDisplay}`,
      `💰 *ਰੇਟ (Rate):* ₹${rate}/ਕੁਇੰਟਲ`,
      `💵 *ਸ਼ੁੱਧ ਰਕਮ (Net Amount):* ${formatCurrency(netAmt)}`,
      `--------------------------------`,
      `_ਧੰਨਵਾਦ! ਇਹ ਇੱਕ ਕੰਪਿਊਟਰਾਈਜ਼ਡ ਬੈਚ ਪਰਚੀ ਹੈ।_`
    ].join('\n');
  };

  const handleSendWhatsApp = (entry: BagsEntryRecord) => {
    const text = getWhatsAppMessage(entry);
    openWhatsApp(entry.farmerMobile, text);
    setSentFarmerIds((prev) => ({ ...prev, [entry.id]: true }));
  };

  const handleCopyMessage = (entry: BagsEntryRecord) => {
    const text = getWhatsAppMessage(entry);
    navigator.clipboard.writeText(text);
    setCopiedFarmerId(entry.id);
    setTimeout(() => setCopiedFarmerId(null), 2500);
  };

  const sentCount = Object.keys(sentFarmerIds).length;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Bar (Hidden in Print) */}
        <div className="print:hidden p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-indigo-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight">
                  {isEn ? 'Batch Entry Action Center' : 'ਬੈਚ ਐਂਟਰੀ ਐਕਸ਼ਨ ਸੈਂਟਰ (Print & WhatsApp)'}
                </h3>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {savedEntries.length} {isEn ? 'Slips Saved' : 'ਪਰਚੀਆਂ ਸੇਵ'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                {isEn ? `Date: ${batchDate} • Total Bags: ${totalBags} • Weight: ${totalWeightDisplay}` : `ਮਿਤੀ: ${batchDate} • ਕੁੱਲ ਬੋਰੀਆਂ: ${totalBags} • ਵਜ਼ਨ: ${totalWeightDisplay} • ਕੁੱਲ ਰਕਮ: ${formatCurrency(totalNetAmount)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Quick Action Toolbar (Hidden in Print) */}
        <div className="print:hidden px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('print')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'print'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>{isEn ? 'Bulk Print All Slips' : '🖨️ ਸਾਰੀਆਂ ਪਰਚੀਆਂ ਪ੍ਰਿੰਟ ਕਰੋ'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-4 h-4 text-emerald-600" />
              <span>{isEn ? 'Bulk WhatsApp Dispatch' : '📲 ਬਲਕ ਵਟਸਐਪ (Bulk WhatsApp)'}</span>
              {sentCount > 0 && (
                <span className="bg-emerald-600 text-white text-[9px] font-mono px-1.5 py-0.2 rounded-full">
                  {sentCount}/{savedEntries.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'print' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPrintLayout('thermal')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    printLayout === 'thermal'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn ? 'Thermal Roll (3")' : 'ਥਰਮਲ ਰੋਲ (3")'}
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('a4')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    printLayout === 'a4'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isEn ? 'A4 Multi-Sheet' : 'A4 ਸ਼ੀਟ (2 ਜਾਂ 4 ਪਰਚੀਆਂ)'}
                </button>
              </div>

              <button
                type="button"
                onClick={handlePrintAll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{isEn ? 'Print All Slips Now' : 'ਸਾਰੀਆਂ ਪਰਚੀਆਂ ਪ੍ਰਿੰਟ ਕਰੋ'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
          {/* ===================== TAB 1: BULK PRINT PREVIEW ===================== */}
          {activeTab === 'print' && (
            <div className="space-y-4">
              <div className="print:hidden bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {isEn
                      ? `Ready to print ${savedEntries.length} slips consecutively. Click 'Print All Slips Now' to open system print dialog.`
                      : `ਕੁੱਲ ${savedEntries.length} ਪਰਚੀਆਂ ਲਗਾਤਾਰ ਪ੍ਰਿੰਟ ਹੋਣ ਲਈ ਤਿਆਰ ਹਨ। ਉੱਪਰਲੇ ਬਟਨ ਨਾਲ ਸਿੱਧਾ ਪ੍ਰਿੰਟਰ 'ਤੇ ਭੇਜੋ।`}
                  </span>
                </div>
                <span className="font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded text-[11px]">
                  {savedEntries[0]?.parchiNo ? `#${savedEntries[0].parchiNo}` : savedEntries[0]?.entryNumber} - {savedEntries[savedEntries.length - 1]?.parchiNo ? `#${savedEntries[savedEntries.length - 1].parchiNo}` : savedEntries[savedEntries.length - 1]?.entryNumber}
                </span>
              </div>

              {/* Thermal Continuous Slips Layout */}
              {printLayout === 'thermal' && (
                <div className="max-w-[340px] mx-auto space-y-4">
                  {savedEntries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="bg-white border-2 border-dashed border-slate-400 p-3.5 rounded-xl font-mono text-[11px] text-slate-900 shadow-sm print:shadow-none print:border-slate-800 print:mb-6 print:break-inside-avoid"
                    >
                      {/* Firm Header */}
                      <div className="text-center pb-2 border-b border-dashed border-slate-700 space-y-0.5">
                        <div className="font-black text-sm uppercase tracking-tight">{firmName}</div>
                        <div className="text-[10px] text-slate-600">{mandiName}</div>
                        <div className="text-[10px] font-bold">Mob: {firmMobile}</div>
                        <div className="text-[10px] bg-slate-900 text-white font-black px-2 py-0.5 mt-1 inline-block uppercase rounded-xs">
                          ** ਤੁਲਾਈ ਪਰਚੀ (SLIP) **
                        </div>
                      </div>

                      {/* Entry & Date */}
                      <div className="py-1.5 border-b border-dashed border-slate-300 flex justify-between font-bold text-[10px]">
                        <span>Slip: #{entry.parchiNo || entry.entryNumber}</span>
                        <span>{entry.date || batchDate}</span>
                      </div>

                      {/* Farmer Details */}
                      <div className="py-1.5 border-b border-dashed border-slate-300 space-y-0.5 text-[10px]">
                        <div><span className="text-slate-500">ਕਿਸਾਨ:</span> <strong className="text-slate-950 font-bold">{entry.farmerNamePa || entry.farmerName}</strong></div>
                        <div><span className="text-slate-500">ਪਿੰਡ:</span> <strong>{entry.farmerVillagePa || entry.farmerVillage || '—'}</strong></div>
                        <div><span className="text-slate-500">ਫੋਨ:</span> <strong>{entry.farmerMobile || '—'}</strong></div>
                        <div><span className="text-slate-500">ID:</span> <span className="font-bold text-emerald-800">{entry.farmerId}</span></div>
                      </div>

                      {/* Weighment Details */}
                      <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">ਨਵਾਂ ਬਾਰਦਾਨਾ:</span>
                          <strong>{entry.newBags || 0}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ:</span>
                          <strong>{entry.oldBags || 0}</strong>
                        </div>
                        <div className="flex justify-between font-bold bg-slate-100 p-1 rounded">
                          <span>ਕੁੱਲ ਬੋਰੀਆਂ:</span>
                          <span className="font-black text-xs">{entry.bags} ਬੋਰੀਆਂ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">ਟੋਟਾ (Tota):</span>
                          <strong>{entry.totaKg || 0} Kg</strong>
                        </div>
                        <div className="flex justify-between font-black text-xs text-emerald-950 border-t border-dashed border-slate-300 pt-1">
                          <span>ਕੁੱਲ ਵਜ਼ਨ:</span>
                          <span>{entry.grandTotalDisplay || entry.totalBagsWeightDisplay}</span>
                        </div>
                      </div>

                      {/* Rate and Amount */}
                      <div className="pt-2 text-right space-y-0.5">
                        <div className="text-[10px] text-slate-600">
                          ਦਰ (Rate): ₹{entry.ratePerQtl || 2475}/ਕੁਇੰਟਲ
                        </div>
                        <div className="text-xs font-black text-slate-950">
                          ਕੁੱਲ ਰਕਮ: {formatCurrency(entry.netAmount ?? entry.totalAmount ?? 0)}
                        </div>
                      </div>

                      {/* Footer Note */}
                      <div className="text-center pt-2 mt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500 italic">
                        ਧੰਨਵਾਦ! ਰੋਜ਼ਾਨਾ ਬੈਚ ਐਂਟਰੀ • {idx + 1} of {savedEntries.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* A4 Sheet Grid Layout */}
              {printLayout === 'a4' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedEntries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="bg-white border border-slate-300 p-4 rounded-xl shadow-xs text-xs space-y-2 print:border-slate-800 print:break-inside-avoid"
                    >
                      <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                        <div>
                          <div className="font-black text-sm text-slate-900">{firmName}</div>
                          <div className="text-[10px] text-slate-600">{mandiName} • Mob: {firmMobile}</div>
                        </div>
                        <div className="text-right">
                          <span className="bg-indigo-100 text-indigo-900 font-mono font-black px-2 py-0.5 rounded text-[11px] block">
                            #{entry.parchiNo || entry.entryNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{entry.date || batchDate}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-lg">
                        <div>
                          <span className="text-slate-500 block text-[10px]">ਕਿਸਾਨ (Farmer):</span>
                          <strong className="text-slate-900">{entry.farmerNamePa || entry.farmerName}</strong>
                          <div className="text-[10px] text-slate-600">ਪਿੰਡ: {entry.farmerVillagePa || entry.farmerVillage}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 block text-[10px]">ਮੋਬਾਈਲ (Mobile):</span>
                          <strong className="text-slate-900">{entry.farmerMobile || '—'}</strong>
                          <div className="text-[10px] text-emerald-800 font-mono">ID: {entry.farmerId}</div>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                        <div className="grid grid-cols-4 bg-slate-100 p-1.5 font-bold text-slate-700 text-center text-[10px]">
                          <div>ਨਵਾਂ</div>
                          <div>ਪੁਰਾਣਾ</div>
                          <div>ਕੁੱਲ ਬੋਰੀਆਂ</div>
                          <div>ਟੋਟਾ</div>
                        </div>
                        <div className="grid grid-cols-4 p-1.5 text-center font-mono font-bold text-slate-900 border-t border-slate-200">
                          <div>{entry.newBags || 0}</div>
                          <div>{entry.oldBags || 0}</div>
                          <div className="text-indigo-900 font-black">{entry.bags}</div>
                          <div>{entry.totaKg || 0} Kg</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <div>
                          <span className="text-[10px] text-emerald-800 block">ਕੁੱਲ ਵਜ਼ਨ:</span>
                          <strong className="text-emerald-950 font-black text-xs">
                            {entry.grandTotalDisplay || entry.totalBagsWeightDisplay}
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-800 block">ਸ਼ੁੱਧ ਰਕਮ (@ ₹{entry.ratePerQtl || 2475}):</span>
                          <strong className="text-emerald-950 font-black text-sm">
                            {formatCurrency(entry.netAmount ?? entry.totalAmount ?? 0)}
                          </strong>
                        </div>
                      </div>

                      <div className="text-center text-[9px] text-slate-400 italic">
                        ਪਰਚੀ #{idx + 1} of {savedEntries.length} • ਹਸਤਾਖ਼ਰ ਮੁਨੀਮ / ਆੜ੍ਹਤੀਆ
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 2: BULK WHATSAPP DISPATCH ===================== */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs flex items-center justify-between text-emerald-950">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isEn
                      ? `Click 'Send' on each farmer to dispatch their weighment slip message directly on WhatsApp.`
                      : `ਹਰੇਕ ਕਿਸਾਨ ਦੇ ਅੱਗੇ 'ਵਟਸਐਪ ਭੇਜੋ' 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਤੁਰੰਤ ਪਰਚੀ ਸੁਨੇਹਾ ਭੇਜੋ। ਸੁਨੇਹਾ ਪੰਜਾਬੀ ਵਿੱਚ ਆਪਣੇ ਆਪ ਤਿਆਰ ਹੈ।`}
                  </span>
                </div>
                <div className="font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-800 text-[11px]">
                  ਭੇਜੇ ਗਏ: {sentCount} / {savedEntries.length}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
                {savedEntries.map((entry, idx) => {
                  const isSent = !!sentFarmerIds[entry.id];
                  const hasMobile = Boolean(entry.farmerMobile && entry.farmerMobile.trim());
                  const isCopied = copiedFarmerId === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        isSent ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold font-mono text-indigo-900 text-xs shrink-0 mt-0.5">
                          #{idx + 1}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900">
                              {entry.farmerNamePa || entry.farmerName}
                            </span>
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-300">
                              Slip #{entry.parchiNo || entry.entryNumber}
                            </span>
                            {isSent && (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-300">
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>ਭੇਜਿਆ ਗਿਆ (Sent)</span>
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                            <span>ਪਿੰਡ: <strong>{entry.farmerVillagePa || entry.farmerVillage || '—'}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <strong className={hasMobile ? 'text-slate-800 font-mono' : 'text-rose-600 font-bold'}>
                                {hasMobile ? entry.farmerMobile : 'ਕੋਈ ਨੰਬਰ ਨਹੀਂ'}
                              </strong>
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono pt-0.5">
                            {entry.bags} ਬੋਰੀਆਂ • ਵਜ਼ਨ: {entry.grandTotalDisplay || entry.totalBagsWeightDisplay} • ਰਕਮ: <strong className="text-emerald-900 font-bold">{formatCurrency(entry.netAmount ?? entry.totalAmount ?? 0)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Copy SMS / Text Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(entry)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer border border-slate-300"
                          title="ਸੁਨੇਹਾ ਕਾਪੀ ਕਰੋ"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">ਕਾਪੀ ਹੋ ਗਿਆ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>ਕਾਪੀ</span>
                            </>
                          )}
                        </button>

                        {/* Send WhatsApp Button */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(entry)}
                          disabled={!hasMobile}
                          className={`px-3 py-1.5 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer ${
                            !hasMobile
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : isSent
                              ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5 text-white" />
                          <span>{isSent ? 'ਦੁਬਾਰਾ ਭੇਜੋ' : 'ਵਟਸਐਪ ਭੇਜੋ'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar (Hidden in Print) */}
        <div className="print:hidden p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 text-xs">
            ਕੁੱਲ ਐਂਟਰੀਆਂ: <strong>{savedEntries.length}</strong> • ਬੋਰੀਆਂ: <strong>{totalBags}</strong> • ਵਜ਼ਨ: <strong>{totalWeightDisplay}</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
          >
            {isEn ? 'Close Window' : 'ਬੰਦ ਕਰੋ (Close Window)'}
          </button>
        </div>
      </div>
    </div>
  );
};
