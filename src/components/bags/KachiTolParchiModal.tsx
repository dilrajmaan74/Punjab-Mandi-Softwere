import React, { useState, useRef, useEffect } from 'react';
import { useMandi } from '../../context/MandiContext';
import { 
  X, 
  Printer, 
  Download, 
  Send, 
  Copy, 
  Check, 
  Scale, 
  FileText, 
  Smartphone,
  Share2,
  Calendar,
  User,
  MapPin,
  Phone
} from 'lucide-react';
import { openWhatsApp } from '../../utils/whatsappNotification';

export const KachiTolParchiModal: React.FC = () => {
  const { 
    activeKachiReceipt, 
    setActiveKachiReceipt, 
    firms, 
    activeFirm, 
    settings, 
    language 
  } = useMandi();

  const slipRef = useRef<HTMLDivElement>(null);
  const [isExportingJpg, setIsExportingJpg] = useState<boolean>(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied_text' | 'copied_image'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEn = language === 'en';

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveKachiReceipt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveKachiReceipt]);

  if (!activeKachiReceipt) return null;

  const entry = activeKachiReceipt;
  const receiptFirm = (entry.firmId ? firms.find((f) => f.id === entry.firmId) : null) || activeFirm;
  const firmName = receiptFirm?.name || settings.firmNameEn || 'JAMMU TRADING CO.';
  const firmNamePa = receiptFirm?.namePa || settings.firmNamePa || 'ਜੰਮੂ ਟਰੇਡਿੰਗ ਕੰਪਨੀ';
  const firmAddress = receiptFirm?.address || settings.firmAddress || 'Dana Mandi Kang Khurd, Lohian Khas';
  const firmMobile = receiptFirm?.mobile || settings.firmMobile || '98147-74651';
  const mandiName = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';

  const parchiDisplayNo = entry.parchiNo ? `#${entry.parchiNo}` : (entry.entryNumber || '#1');
  const farmerName = entry.farmerNamePa || entry.farmerName || 'ਕਿਸਾਨ';
  const farmerFatherName = entry.farmerFatherName || entry.farmerFatherNamePa || '';
  const farmerVillage = entry.farmerVillagePa || entry.farmerVillage || '';
  const farmerMobile = entry.farmerMobile || '';

  // Bags & Weight details
  const totalBags = entry.bags || ((entry.newBags || 0) + (entry.oldBags || 0));
  const newBags = entry.newBags || 0;
  const oldBags = entry.oldBags || 0;
  const weightPerBag = entry.weightPerBagKg || 37.5;
  const totalBagsWeightDisplay = entry.totalBagsWeightDisplay || `${(totalBags * weightPerBag) / 100} Qul`;
  const totaKg = Number(entry.totaKg) || 0;
  const grandTotalDisplay = entry.grandTotalDisplay || totalBagsWeightDisplay;

  let bardanaText = 'ਨਵਾਂ ਬਾਰਦਾਨਾ';
  if (entry.bardana === 'OLD' || (oldBags > 0 && newBags === 0)) {
    bardanaText = 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ';
  } else if (newBags > 0 && oldBags > 0) {
    bardanaText = `${newBags} ਨਵਾਂ + ${oldBags} ਪੁਰਾਣਾ`;
  }

  // Labour breakdown details
  const cb = entry.conditionBreakdown;
  const ld = entry.labourDeductions;

  const pakkiBags = cb?.pakkiBags ?? ld?.pakkiBagsCount ?? totalBags;
  const pakkiRate = cb?.pakkiRate ?? ld?.pakkiLabourRate ?? 8;
  const pakkiAmount = cb?.pakkiAmount ?? ld?.pakkiLabourAmount ?? Math.round(pakkiBags * pakkiRate);

  const doubleBags = cb?.doubleBags ?? ld?.doubleBagsCount ?? 0;
  const doubleRate = cb?.doubleRate ?? ld?.pakkaDoubleLabourRate ?? 14;
  const doubleAmount = cb?.doubleAmount ?? ld?.pakkaDoubleLabourAmount ?? Math.round(doubleBags * doubleRate);

  const sukkiBags = cb?.sukkiBags ?? ld?.sukkiBagsCount ?? 0;
  const sukkiRate = cb?.sukkiRate ?? ld?.sukhiLabourRate ?? 5;
  const sukkiAmount = cb?.sukkiAmount ?? ld?.sukhiLabourAmount ?? Math.round(sukkiBags * sukkiRate);

  const totalLabourAmount = ld?.totalLabourDeduction ?? (pakkiAmount + doubleAmount + sukkiAmount);

  // Generate short concise Punjabi message for WhatsApp (strictly no paddy price/amount)
  const generateShortWhatsAppMessage = (): string => {
    let msg = `🌾 *ਕੱਚੀ ਤੁਲਾਈ ਪਰਚੀ (Kachi Weighment Slip)*\n`;
    msg += `📄 ਪਰਚੀ ਨੰ: *${parchiDisplayNo}*\n`;
    msg += `📅 ਮਿਤੀ: *${entry.date}*\n`;
    msg += `👤 ਕਿਸਾਨ: *${farmerName}*${farmerFatherName ? ` ਸਪੁੱਤਰ ${farmerFatherName}` : ''}\n`;
    if (farmerVillage) msg += `🏡 ਪਿੰਡ: *${farmerVillage}*\n`;
    msg += `🌾 ਫਸਲ: *ਝੋਨਾ (Paddy - 37.5 KG)*\n\n`;

    msg += `⚖️ *ਤੋਲ ਦਾ ਵੇਰਵਾ:*\n`;
    msg += `• ਕੁੱਲ ਬੋਰੀਆਂ: *${totalBags} ਬੋਰੀਆਂ* (${bardanaText})\n`;
    msg += `• ਕੁੱਲ ਵਜ਼ਨ: *${grandTotalDisplay}*\n`;
    if (totaKg > 0) {
      msg += `• ਟੋਟਾ ਵਜ਼ਨ: *${totaKg} Kg*\n`;
    }

    msg += `\n🔨 *ਲੇਬਰ ਕਟੌਤੀ:* \n`;
    msg += `• ਪੱਕੀ ਲੇਬਰ: ${pakkiBags} ਬੋਰੀਆਂ @ ₹${pakkiRate} = ₹${pakkiAmount}\n`;
    if (doubleBags > 0) {
      msg += `• ਡਬਲ ਪੱਖਾ: ${doubleBags} ਬੋਰੀਆਂ @ ₹${doubleRate} = ₹${doubleAmount}\n`;
    }
    if (sukkiBags > 0) {
      msg += `• ਸੁੱਕੀ ਲੇਬਰ: ${sukkiBags} ਬੋਰੀਆਂ @ ₹${sukkiRate} = ₹${sukkiAmount}\n`;
    }
    msg += `• ਕੁੱਲ ਲੇਬਰ: *₹${totalLabourAmount}*\n\n`;

    msg += `📍 *${firmNamePa || firmName}*\n`;
    msg += `📞 ਮੋਬਾਈਲ: ${firmMobile}\n`;
    msg += `_(ਨੋਟ: ਇਹ ਸਿਰਫ਼ ਤੋਲ ਅਤੇ ਲੇਬਰ ਦੀ ਕੱਚੀ ਪਰਚੀ ਹੈ, ਕੋਈ ਰੇਟ/ਰਕਮ ਨਹੀਂ)_`;

    return msg;
  };

  // 1. Download JPG Image
  const handleDownloadJpg = async () => {
    if (!slipRef.current) return;
    setIsExportingJpg(true);
    setErrorMessage(null);

    try {
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(slipRef.current, {
        quality: 0.95,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true
      });

      const cleanFarmer = (entry.farmerName || 'Farmer').replace(/[^a-zA-Z0-9]/g, '_');
      const parchiNum = (entry.parchiNo || entry.entryNumber || '1').toString().replace(/[^a-zA-Z0-9]/g, '');
      const filename = `Kachi_Parchi_${parchiNum}_${cleanFarmer}.jpg`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Failed to export Kachi Parchi to JPG:', err);
      setErrorMessage(isEn ? 'Failed to generate JPG image. Please try again.' : 'ਜੇਪੀਜੀ ਫੋਟੋ ਬਣਾਉਣ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।');
    } finally {
      setIsExportingJpg(false);
    }
  };

  // 2. Copy JPG Image to Clipboard
  const handleCopyImage = async () => {
    if (!slipRef.current) return;
    setIsExportingJpg(true);
    setErrorMessage(null);

    try {
      const { toBlob } = await import('html-to-image');
      const blob = await toBlob(slipRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true
      });

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopyStatus('copied_image');
        setTimeout(() => setCopyStatus('idle'), 3000);
      } else {
        // Fallback to downloading JPG
        handleDownloadJpg();
      }
    } catch (err: any) {
      console.warn('Clipboard write failed, downloading JPG instead:', err);
      handleDownloadJpg();
    } finally {
      setIsExportingJpg(false);
    }
  };

  // 3. Copy Short Text Message
  const handleCopyTextMessage = () => {
    const msg = generateShortWhatsAppMessage();
    navigator.clipboard.writeText(msg).then(() => {
      setCopyStatus('copied_text');
      setTimeout(() => setCopyStatus('idle'), 3000);
    });
  };

  // 4. Send via WhatsApp
  const handleSendWhatsApp = () => {
    const msg = generateShortWhatsAppMessage();
    openWhatsApp(farmerMobile, msg);
  };

  // 5. Print Slip
  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setActiveKachiReceipt(null);
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl border border-slate-300 max-w-xl w-full p-4 sm:p-5 shadow-2xl space-y-4 my-6 relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls Header (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  {isEn ? 'Kachi Tol Parchi (Weighment Slip)' : 'ਕੱਚੀ ਪਰਚੀ ਤੋਲ ਦੀ (Kachi Tol Slip)'}
                </h3>
                <span className="bg-amber-100 text-amber-900 font-black text-[10px] px-2 py-0.5 rounded-full border border-amber-300">
                  {isEn ? 'Only Weight & Labour' : 'ਸਿਰਫ਼ ਤੋਲ ਤੇ ਲੇਬਰ'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                ਪਰਚੀ: <strong className="text-slate-900 font-mono">{parchiDisplayNo}</strong> • ਮਿਤੀ: <strong className="text-slate-900">{entry.date}</strong>
              </p>
            </div>
          </div>

          {/* Close X Button */}
          <button
            type="button"
            onClick={() => setActiveKachiReceipt(null)}
            className="self-end sm:self-auto w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 flex items-center justify-center font-bold cursor-pointer transition shadow-2xs active:scale-95"
            title="ਬੰਦ ਕਰੋ (Esc)"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Action Toolbar (Hidden in Print) */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* JPG Download Button */}
            <button
              type="button"
              onClick={handleDownloadJpg}
              disabled={isExportingJpg}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              title="JPG ਫੋਟੋ ਡਾਊਨਲੋਡ ਕਰੋ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingJpg ? 'ਬਣ ਰਹੀ ਹੈ...' : 'JPG ਫੋਟੋ ਡਾਊਨਲੋਡ'}</span>
            </button>

            {/* Copy JPG Image Button */}
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isExportingJpg}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              title="ਇਮੇਜ ਕਾਪੀ ਕਰੋ (WhatsApp ਵਿੱਚ Paste ਕਰੋ)"
            >
              <Copy className="w-3.5 h-3.5 text-amber-300" />
              <span>{copyStatus === 'copied_image' ? 'ਫੋਟੋ ਕਾਪੀ ਹੋ ਗਈ!' : 'ਫੋਟੋ ਕਾਪੀ ਕਰੋ'}</span>
            </button>

            {/* Direct WhatsApp Button */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="bg-green-600 hover:bg-green-500 text-white font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              title="ਕਿਸਾਨ ਦੇ WhatsApp ਤੇ ਭੇਜੋ"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>WhatsApp ਭੇਜੋ</span>
            </button>

            {/* Copy Short Text Message Button */}
            <button
              type="button"
              onClick={handleCopyTextMessage}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
              title="ਸੰਖੇਪ ਮੈਸੇਜ ਕਾਪੀ ਕਰੋ"
            >
              {copyStatus === 'copied_text' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">ਕਾਪੀ ਹੋ ਗਿਆ!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>ਮੈਸੇਜ ਕਾਪੀ</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>ਪ੍ਰਿੰਟ ਕਰੋ</span>
          </button>
        </div>

        {/* Status / Notice Pill */}
        {copyStatus === 'copied_image' && (
          <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>✓ ਪਰਚੀ ਦੀ JPG ਫੋਟੋ ਕਾਪੀ ਹੋ ਗਈ ਹੈ! ਤੁਸੀਂ ਹੁਣ WhatsApp ਵਿੱਚ ਸਿੱਧਾ Paste (Ctrl+V) ਕਰ ਸਕਦੇ ਹੋ।</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs px-3 py-1.5 rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        {/* ============================================================== */}
        {/* PARCHI CONTAINER FOR DISPLAY, PRINTING, AND JPG IMAGE CAPTURE */}
        {/* ============================================================== */}
        <div 
          ref={slipRef}
          id="kachi-tol-parchi-capture"
          className="bg-white border-2 border-slate-800 rounded-xl p-5 sm:p-6 text-slate-900 shadow-md font-sans print:border-2 print:border-black print:p-4 print:shadow-none"
          style={{ minWidth: '320px' }}
        >
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
              <span>{mandiName}</span>
              <span>ਮੋਬਾਈਲ: <strong className="font-mono text-slate-900">{firmMobile}</strong></span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight leading-tight">
              {firmNamePa || firmName}
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              {firmAddress}
            </p>

            {/* Big Distinctive Kachi Parchi Badge */}
            <div className="pt-2 flex justify-center">
              <div className="bg-slate-900 text-white font-black text-xs sm:text-sm px-4 py-1 rounded-sm uppercase tracking-wider shadow-2xs">
                🌾 ਕੱਚੀ ਪਰਚੀ ਤੋਲ ਦੀ (KACHI WEIGHMENT SLIP) 🌾
              </div>
            </div>

            <p className="text-[10px] font-bold text-amber-900 tracking-wide pt-0.5">
              [ ਸਿਰਫ਼ ਤੋਲ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਦਾ ਵੇਰਵਾ • ONLY WEIGHMENT & LABOUR ]
            </p>
          </div>

          {/* Slip Number, Date, Crop Banner */}
          <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-100/90 border-b border-slate-300 text-xs font-bold text-slate-800 rounded-md my-3">
            <div>
              <span className="text-slate-500 text-[10px] block">ਪਰਚੀ ਨੰਬਰ (Slip No)</span>
              <span className="text-slate-950 font-black font-mono text-sm">{parchiDisplayNo}</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 text-[10px] block">ਮਿਤੀ (Paddy Date)</span>
              <span className="text-slate-950 font-black">{entry.date}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">ਫਸਲ (Commodity)</span>
              <span className="text-emerald-900 font-black">ਝੋਨਾ (Paddy - 37.5 KG)</span>
            </div>
          </div>

          {/* Farmer Details Box */}
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 mb-3 space-y-1.5 text-xs">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <span className="text-slate-500 text-[11px] font-medium">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name):</span>
                <p className="font-black text-slate-950 text-sm">{farmerName}</p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] font-medium">ਪਿਤਾ ਦਾ ਨਾਂ (Father's Name):</span>
                <p className="font-bold text-slate-900">{farmerFatherName || '-'}</p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] font-medium">ਪਿੰਡ (Village):</span>
                <p className="font-bold text-slate-900">{farmerVillage || '-'}</p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] font-medium">ਮੋਬਾਈਲ (Mobile):</span>
                <p className="font-bold font-mono text-slate-900">{farmerMobile || '-'}</p>
              </div>
            </div>
          </div>

          {/* Section 1: Weighment Breakdown Table */}
          <div className="mb-3.5">
            <div className="bg-slate-800 text-white font-black text-[11px] px-2.5 py-1 rounded-t-md flex items-center justify-between">
              <span>੧. ਤੋਲ ਦਾ ਵੇਰਵਾ (WEIGHMENT DETAILS)</span>
              <span className="font-mono text-[10px] font-normal">37.50 KG / Bag</span>
            </div>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <tbody className="divide-y divide-slate-300">
                <tr className="hover:bg-slate-50">
                  <td className="border border-slate-300 py-1.5 px-2.5 font-medium text-slate-700">
                    ਕੁੱਲ ਬੋਰੀਆਂ ਦੀ ਗਿਣਤੀ (Total Bags)
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2.5 font-bold text-center text-slate-600">
                    {bardanaText}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2.5 text-right font-black text-sm text-slate-950 font-mono">
                    {totalBags} ਬੋਰੀਆਂ
                  </td>
                </tr>

                <tr className="hover:bg-slate-50">
                  <td className="border border-slate-300 py-1.5 px-2.5 font-medium text-slate-700">
                    ਬੋਰੀਆਂ ਦਾ ਵਜ਼ਨ (@37.50 KG)
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2.5 text-center font-mono text-slate-500 text-[11px]">
                    {totalBags} × 37.50 KG
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2.5 text-right font-bold text-slate-900 font-mono">
                    {totalBagsWeightDisplay}
                  </td>
                </tr>

                {totaKg > 0 && (
                  <tr className="hover:bg-slate-50">
                    <td className="border border-slate-300 py-1.5 px-2.5 font-medium text-slate-700">
                      ਵੱਖਰਾ ਟੋਟਾ (Separate Tota Weight)
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 text-center text-slate-500 text-[11px]">
                      ਕਿੱਲੋ ਵਿੱਚ (In KG)
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2.5 text-right font-bold text-slate-900 font-mono">
                      {totaKg} Kg
                    </td>
                  </tr>
                )}

                {/* Grand Total Weight Highlight */}
                <tr className="bg-amber-100/70 border-t-2 border-slate-800 font-black">
                  <td className="border border-slate-400 py-2 px-2.5 text-slate-950 text-xs sm:text-sm">
                    ਕੁੱਲ ਤੋਲ / ਵਜ਼ਨ (Grand Total Weight)
                  </td>
                  <td className="border border-slate-400 py-2 px-2.5 text-center text-slate-700 text-[11px]">
                    ਬੋਰੀਆਂ + ਟੋਟਾ
                  </td>
                  <td className="border border-slate-400 py-2 px-2.5 text-right font-black text-sm sm:text-base text-slate-950 font-mono">
                    {grandTotalDisplay}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Labour Deduction Breakdown Table */}
          <div className="mb-3.5">
            <div className="bg-slate-800 text-white font-black text-[11px] px-2.5 py-1 rounded-t-md flex items-center justify-between">
              <span>੨. ਲੇਬਰ ਕਟੌਤੀ ਦਾ ਵੇਰਵਾ (LABOUR DEDUCTIONS)</span>
              <span className="text-[10px] font-normal">ਦਰ ਪ੍ਰਤੀ ਬੋਰੀ</span>
            </div>
            <table className="w-full border-collapse border border-slate-400 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                  <th className="border border-slate-300 py-1.5 px-2 text-left">ਲੇਬਰ ਕਿਸਮ (Particulars)</th>
                  <th className="border border-slate-300 py-1.5 px-2 text-center">ਬੋਰੀਆਂ (Bags)</th>
                  <th className="border border-slate-300 py-1.5 px-2 text-center">ਰੇਟ (Rate)</th>
                  <th className="border border-slate-300 py-1.5 px-2 text-right">ਰਕਮ (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {/* 1. Pakki Labour */}
                <tr>
                  <td className="border border-slate-300 py-1.5 px-2 font-medium text-slate-900">
                    ਪੱਕੀ ਲੇਬਰ (Fixed Pakki Labour)
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                    {pakkiBags}
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                    ₹{pakkiRate} / ਬੋਰੀ
                  </td>
                  <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                    ₹{pakkiAmount.toLocaleString('en-IN')}
                  </td>
                </tr>

                {/* 2. Double Pakkha Labour */}
                {doubleBags > 0 && (
                  <tr>
                    <td className="border border-slate-300 py-1.5 px-2 font-medium text-slate-900">
                      ਡਬਲ ਪੱਖਾ ਲੇਬਰ (Double Pakkha)
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                      {doubleBags}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                      ₹{doubleRate} / ਬੋਰੀ
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                      ₹{doubleAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {/* 3. Sukhi Labour */}
                {sukkiBags > 0 && (
                  <tr>
                    <td className="border border-slate-300 py-1.5 px-2 font-medium text-slate-900">
                      ਸੁੱਕੀ ਲੇਬਰ (Sukhi / Dry Bags)
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                      {sukkiBags}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                      ₹{sukkiRate} / ਬੋਰੀ
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                      ₹{sukkiAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}

                {/* Total Labour Row */}
                <tr className="bg-slate-100 font-black border-t-2 border-slate-800">
                  <td colSpan={3} className="border border-slate-400 py-2 px-2 text-slate-950 text-right">
                    ਕੁੱਲ ਲੇਬਰ ਕਟੌਤੀ (Total Labour Charges):
                  </td>
                  <td className="border border-slate-400 py-2 px-2 text-right font-mono text-sm text-rose-800 font-black">
                    ₹{totalLabourAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Strict Notice (NO PADDY AMOUNT EXPLANATION) */}
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-center text-[11px] font-bold text-amber-950 space-y-0.5 mb-4">
            <p className="leading-snug">
              ⚠️ *ਨੋਟ: ਇਹ ਸਿਰਫ਼ ਝੋਨੇ ਦੇ ਤੋਲ ਅਤੇ ਲੇਬਰ ਕਟੌਤੀ ਦੀ ਕੱਚੀ ਪਰਚੀ ਹੈ। ਝੋਨੇ ਦੀ ਰਕਮ ਖਾਤਾ ਵਹੀ ਵਿੱਚ ਦਰਜ ਹੋਵੇਗੀ।*
            </p>
            <p className="text-[10px] text-amber-800 font-medium">
              (This is strictly a weighment & labour slip. Paddy payment calculation is handled in the ledger account.)
            </p>
          </div>

          {/* Traditional Signature Area */}
          <div className="pt-4 border-t border-dashed border-slate-400 text-center text-xs text-slate-700">
            <div className="flex justify-between items-end px-2 pt-6">
              <div className="text-center">
                <div className="w-28 border-t border-slate-800 mb-1"></div>
                <span className="font-bold text-[11px]">ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ</span>
              </div>

              <div className="text-center">
                <div className="w-28 border-t border-slate-800 mb-1"></div>
                <span className="font-bold text-[11px]">ਤੋਲਾ / ਪੱਲੇਦਾਰ</span>
              </div>

              <div className="text-center">
                <div className="w-28 border-t border-slate-800 mb-1"></div>
                <span className="font-bold text-[11px]">ਮੋਹਰ ਆੜ੍ਹਤੀਆ</span>
              </div>
            </div>

            <div className="mt-4 text-[10px] text-slate-500 font-mono font-medium">
              *** ਧੰਨਵਾਦ - {firmNamePa || firmName} ***
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
