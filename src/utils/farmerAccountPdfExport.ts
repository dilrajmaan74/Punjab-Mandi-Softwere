import { FarmerAccountSummary, MandiSettings } from '../types/mandi';
import { maskAadhaarNumber } from './calculations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';
import { registerGurmukhiFont } from './gurmukhiPdfFont';

export interface SimpleFarmerLabourInfo {
  labourExpense: number;
  ratePerBag: number;
  labourBagsAdjustment: number;
  finalBalanceBags: number;
}

/**
 * Safe text formatter that retains Unicode Punjabi Gurmukhi characters,
 * English Latin characters, digits, and common punctuation without stripping.
 */
function safeText(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\u2014\u2013\u2015]/g, '-')
    .replace(/[\u2018\u2019`]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Currency formatter with Indian Rupee symbol & commas
 */
function formatPdfCurrency(amount: number): string {
  const safe = Number(amount) || 0;
  const isNeg = safe < 0;
  const formatted = Math.abs(safe).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNeg ? `- Rs. ${formatted}` : `Rs. ${formatted}`;
}

/**
 * Helper to display English and Punjabi bilingual names/villages nicely
 */
function getBilingualDisplay(en?: string | null, pa?: string | null): string {
  const cleanEn = safeText(en);
  const cleanPa = safeText(pa);
  if (cleanEn && cleanPa && cleanEn !== cleanPa) {
    return `${cleanEn} / ${cleanPa}`;
  }
  return cleanPa || cleanEn || '-';
}

/**
 * Draw placeholder when photo is missing or fails to render
 */
function drawPhotoBox(doc: any, x: number, y: number, size: number, labelEn: string, labelPa: string) {
  doc.setFillColor(241, 245, 249);
  doc.rect(x, y, size, size, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y, size, size, 'S');
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(labelEn, x + size / 2, y + size / 2 - 2, { align: 'center' });
  doc.text(labelPa, x + size / 2, y + size / 2 + 3, { align: 'center' });
}

/**
 * Capture and export the exact A4 reference statement from DOM
 * with 100% pixel fidelity, exact colors, tables, and Punjabi Gurmukhi text.
 */
export async function captureAndExportExactA4Pdf(
  account: FarmerAccountSummary,
  filenameSuffix: string = 'Statement'
): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el =
    document.getElementById('farmer-account-reference-a4-preview') ||
    document.getElementById('farmer-account-reference-a4') ||
    document.getElementById('farmer-account-reference-a4-offscreen');

  if (!el) {
    return false;
  }

  try {
    const { toPng } = await import('html-to-image');
    const { jsPDF } = await import('jspdf');

    const offscreenWrapper = document.getElementById('farmer-account-offscreen-wrapper');
    const prevLeft = offscreenWrapper?.style.left;
    const prevZIndex = offscreenWrapper?.style.zIndex;
    if (offscreenWrapper && el.id === 'farmer-account-reference-a4-offscreen') {
      offscreenWrapper.style.left = '0px';
      offscreenWrapper.style.zIndex = '-1';
    }

    const imgData = await toPng(el, {
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
    });

    if (offscreenWrapper && prevLeft !== undefined) {
      offscreenWrapper.style.left = prevLeft;
      offscreenWrapper.style.zIndex = prevZIndex || '-100';
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Exact A4 sheet dimensions: 210mm x 297mm
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    const safeName = (account.farmer.farmerName || 'Farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`Farmer_Account_${filenameSuffix}_${account.farmer.id}_${safeName}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to capture exact A4 statement via html-to-image:', err);
    return false;
  }
}

/**
 * Generate Simple 1-Page Clean Bilingual Farmer Account Summary PDF
 * (English + Proper Punjabi Gurmukhi)
 */
export async function exportSimpleFarmerAccountPDF(
  account: FarmerAccountSummary,
  settings: MandiSettings,
  labourInfo?: SimpleFarmerLabourInfo
): Promise<void> {
  // 1. Try exact pixel-faithful reference A4 export first
  const captured = await captureAndExportExactA4Pdf(account, 'Simple');
  if (captured) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Register embedded Unicode Noto Sans Gurmukhi font (Regular & Bold)
  registerGurmukhiFont(doc);
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setLineHeightFactor(1.35);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 10;

  // Header with bilingual title
  y = renderStandardPdfHeader({
    doc,
    settings,
    title: 'FARMER ACCOUNT / ਕਿਸਾਨ ਖਾਤਾ (Account Summary / ਖਾਤਾ ਸਾਰ)',
    subtitle: `Date / ਮਿਤੀ: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    badgeLabel: 'ACCOUNT NO / ਖਾਤਾ ਨੰਬਰ',
    badgeValue: account.farmer.id,
    startY: 8
  });

  // Farmer Details Box
  const leftColWidth = 98;
  const rightColWidth = contentWidth - leftColWidth - 4;
  const rightColX = margin + leftColWidth + 4;
  const boxHeight = 36;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'S');

  // Left column: Farmer Profile (Constrained within leftColWidth to eliminate collision)
  const leftX = margin + 4;
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const nameStr = getBilingualDisplay(account.farmer.farmerName, account.farmer.farmerNamePa);
  doc.text(`Farmer Name / ਕਿਸਾਨ ਦਾ ਨਾਮ: ${nameStr}`, leftX, y + 6.5, { maxWidth: leftColWidth - 4 });

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const fatherStr = getBilingualDisplay(account.farmer.fatherName, account.farmer.fatherNamePa);
  doc.text(`Father Name / ਪਿਤਾ ਦਾ ਨਾਮ: ${fatherStr}`, leftX, y + 13.5, { maxWidth: leftColWidth - 4 });

  const villageStr = getBilingualDisplay(account.farmer.village, account.farmer.villagePa);
  doc.text(`Village / ਪਿੰਡ: ${villageStr} (PIN: ${account.farmer.pinCode || '141401'})`, leftX, y + 20.5, { maxWidth: leftColWidth - 4 });

  doc.text(`Mobile / ਮੋਬਾਈਲ: ${account.farmer.mobile || '-'}  |  Aadhaar / ਆਧਾਰ: ${maskAadhaarNumber(account.farmer.aadhaar)}`, leftX, y + 27.5, { maxWidth: leftColWidth - 4 });

  // Right column: Account No & Linking & Bank (Constrained within rightColWidth)
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text(`Account No / ਖਾਤਾ ਨੰਬਰ: ${account.farmer.id}`, rightColX, y + 6.5);

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  if (account.isMainFarmer && account.linkedFarmersList && account.linkedFarmersList.length > 0) {
    doc.text(`Main Farmer / ਮੁੱਖ ਕਿਸਾਨ (${account.linkedFarmersList.length} Linked / ਲਿੰਕ ਕਿਸਾਨ)`, rightColX, y + 13.5, { maxWidth: rightColWidth });
  } else if (account.isLinkedFarmer && account.linkedToMainFarmer) {
    const mainFarmerName = getBilingualDisplay(account.linkedToMainFarmer.farmerName, account.linkedToMainFarmer.farmerNamePa);
    doc.text(`Linked Farmer / ਲਿੰਕ ਕਿਸਾਨ: ${mainFarmerName} (${account.linkedToMainFarmer.id})`, rightColX, y + 13.5, { maxWidth: rightColWidth });
  }

  if (account.farmer.bankDetails?.bankName) {
    doc.text(`Bank / ਬੈਂਕ: ${safeText(account.farmer.bankDetails.bankName)}`, rightColX, y + 20.5, { maxWidth: rightColWidth });
    doc.text(`A/C / ਖਾਤਾ ਨੰਬਰ: ${account.farmer.bankDetails.accountNumber || '-'} | IFSC: ${account.farmer.bankDetails.ifscCode || '-'}`, rightColX, y + 27.5, { maxWidth: rightColWidth });
  }

  y += boxHeight + 6;

  // Key Metrics Computation
  const totalBagsBrought = account.mandiArrivalBags ?? (account as any).totalBagsArrived ?? 0;
  const ownPurchaseBags = account.directPurchasedBags ?? (account as any).totalPurchasedBags ?? ((account.purchaseRecords || (account as any).purchaseEntries || []) as any[]).reduce((s, r) => s + (Number(r.bags) || 0), 0);
  const linkedPurchaseBags = account.linkedPurchasedBags || 0;
  const totalPurchaseBags = ownPurchaseBags + linkedPurchaseBags;
  const balanceBeforeLabour = totalBagsBrought - totalPurchaseBags;

  const bagRate = labourInfo?.ratePerBag || 925;
  const labourExp = labourInfo?.labourExpense ?? ((account.totalLabourDeductions || (account as any).totalLabourCharges || 0) > 0 ? (account.totalLabourDeductions || (account as any).totalLabourCharges) : (totalBagsBrought * (settings.defaultPakkiLabourRate ?? 7)));
  const labourBags = labourInfo?.labourBagsAdjustment ?? Math.ceil(labourExp / bagRate);
  const finalBags = labourInfo?.finalBalanceBags ?? (balanceBeforeLabour - labourBags);
  const bagWeight = settings.fixedBagWeightKg || settings.bagWeightStandard || 37.5;
  const arrivalDisplay = account.mandiArrivalDisplay || `${((totalBagsBrought * bagWeight) / 100).toFixed(2)} Qtl`;

  // Table of 7 Key Metrics (Dual Language)
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ACCOUNT SUMMARY / ਖਾਤਾ ਸਾਰ (7 KEY METRICS)', margin, y);
  y += 4.5;

  const tableRows = [
    {
      sr: '1',
      titleEn: 'Total Bags Brought to Mandi',
      titlePa: 'ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ',
      details: `${totalBagsBrought} Bags / ਬੋਰੀਆਂ (${arrivalDisplay})`,
      value: `${totalBagsBrought} Bags`,
      highlight: false
    },
    {
      sr: '2',
      titleEn: 'Own Farmer Purchase',
      titlePa: 'ਆਪਣੀ ਖਰੀਦ',
      details: `${ownPurchaseBags} Bags / ਬੋਰੀਆਂ (${(account.purchaseRecords || (account as any).purchaseEntries || []).length} Entries)`,
      value: `${ownPurchaseBags} Bags`,
      highlight: false
    },
    {
      sr: '3',
      titleEn: 'Linked Farmers Purchase',
      titlePa: 'ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ',
      details: `${linkedPurchaseBags} Bags / ਬੋਰੀਆਂ (${account.linkedPurchasesList?.length || 0} Entries)`,
      value: `${linkedPurchaseBags} Bags`,
      highlight: false
    },
    {
      sr: '4',
      titleEn: 'Total Purchase',
      titlePa: 'ਕੁੱਲ ਖਰੀਦ',
      details: `${ownPurchaseBags} + ${linkedPurchaseBags} = ${totalPurchaseBags} Bags / ਬੋਰੀਆਂ`,
      value: `${totalPurchaseBags} Bags`,
      highlight: true
    },
    {
      sr: '5',
      titleEn: 'Balance Before Labour',
      titlePa: 'ਮਜ਼ਦੂਰੀ ਤੋਂ ਪਹਿਲਾਂ ਬਕਾਇਆ',
      details: `${totalBagsBrought} - ${totalPurchaseBags} = ${balanceBeforeLabour} Bags / ਬੋਰੀਆਂ`,
      value: `${balanceBeforeLabour} Bags`,
      highlight: false
    },
    {
      sr: '6',
      titleEn: 'Labour Expense',
      titlePa: 'ਮਜ਼ਦੂਰੀ ਖਰਚ',
      details: `Rs. ${labourExp.toLocaleString('en-IN')} ÷ Rs. ${bagRate}/ਬੋਰੀ = ${labourBags} Bags / ਬੋਰੀਆਂ`,
      value: `${labourBags} Bags`,
      highlight: false
    },
    {
      sr: '7',
      titleEn: 'Final Balance',
      titlePa: 'ਆਖਰੀ ਬਕਾਇਆ',
      details: `${balanceBeforeLabour} - ${labourBags} = ${finalBags} Bags / ਬੋਰੀਆਂ`,
      value: `${finalBags} Bags`,
      highlight: true
    }
  ];

  // Table header with ample height and two lines for Description
  const tableHeaderHeight = 8.5;
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, tableHeaderHeight, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentWidth, tableHeaderHeight, 'S');

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Sr / ਲੜੀ', margin + 3, y + 5.5);
  doc.text('Description / ਵੇਰਵਾ (English + ਪੰਜਾਬੀ)', margin + 16, y + 5.5);
  doc.text('Calculation / ਹਿਸਾਬ', margin + 94, y + 5.5);
  doc.text('Quantity / Bags / ਮਾਤਰਾ / ਬੋਰੀਆਂ', margin + contentWidth - 4, y + 5.5, { align: 'right' });
  y += tableHeaderHeight;

  const tableStartY = y;

  tableRows.forEach((row) => {
    // Wrap description lines safely
    const titleEnLines = doc.splitTextToSize(row.titleEn, 74);
    const titlePaLines = doc.splitTextToSize(row.titlePa, 74);
    const descLinesCount = titleEnLines.length + titlePaLines.length;

    // Wrap calculation details safely within 60mm column
    const detailLines = doc.splitTextToSize(row.details, 60);

    // Compute dynamic row height so no text or matra ever overlaps or gets cut off
    const maxLines = Math.max(descLinesCount, detailLines.length, 2);
    const rowHeight = Math.max(maxLines * 4.6 + 3.5, 11.5);

    if (row.highlight) {
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(187, 247, 208);
      doc.rect(margin, y, contentWidth, rowHeight, 'S');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    }

    // Col 1: Sr No
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(row.highlight ? 20 : 15, row.highlight ? 83 : 23, row.highlight ? 45 : 42);
    doc.text(row.sr, margin + 3, y + 5.5);

    // Col 2: English title + Punjabi Gurmukhi title cleanly stacked with comfortable line height
    let descY = y + 4.5;
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(row.highlight ? 20 : 15, row.highlight ? 83 : 23, row.highlight ? 45 : 42);
    titleEnLines.forEach((line: string) => {
      doc.text(line, margin + 16, descY);
      descY += 4.2;
    });

    doc.setFont('NotoSansGurmukhi', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(row.highlight ? 22 : 71, row.highlight ? 101 : 85, row.highlight ? 52 : 105);
    titlePaLines.forEach((line: string) => {
      doc.text(line, margin + 16, descY);
      descY += 4.2;
    });

    // Col 3: Calculation details wrapped cleanly with proper vertical spacing
    let detY = y + 4.5;
    doc.setFont('NotoSansGurmukhi', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    detailLines.forEach((line: string) => {
      doc.text(line, margin + 94, detY);
      detY += 4.2;
    });

    // Col 4: Value on the right
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(row.highlight ? 20 : 15, row.highlight ? 83 : 23, row.highlight ? 45 : 42);
    doc.text(row.value, margin + contentWidth - 4, y + (rowHeight / 2) + 1.2, { align: 'right' });

    y += rowHeight;
  });

  // Outer border around summary table
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.rect(margin, tableStartY - tableHeaderHeight, contentWidth, (y - tableStartY) + tableHeaderHeight, 'S');

  y += 6;

  // Bilingual Formula Card (Step-by-Step with automatic text wrapping & dynamic height)
  const step1 = `1. Total Purchase / ਕੁੱਲ ਖਰੀਦ = ਆਪਣੀ ਖਰੀਦ (${ownPurchaseBags}) + ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ (${linkedPurchaseBags}) = ${totalPurchaseBags} Bags / ਬੋਰੀਆਂ`;
  const step2 = `2. Balance Before Labour / ਮਜ਼ਦੂਰੀ ਤੋਂ ਪਹਿਲਾਂ ਬਕਾਇਆ = ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ (${totalBagsBrought}) - ਕੁੱਲ ਖਰੀਦ (${totalPurchaseBags}) = ${balanceBeforeLabour} Bags / ਬੋਰੀਆਂ`;
  const step3 = `3. Labour Bags / ਮਜ਼ਦੂਰੀ ਦੀਆਂ ਬੋਰੀਆਂ = ਮਜ਼ਦੂਰੀ ਖਰਚ Rs. ${labourExp.toLocaleString('en-IN')} ÷ Rs. ${bagRate}/ਬੋਰੀ = ${labourBags} Bags / ਬੋਰੀਆਂ (Rounded up)`;

  const step1Lines = doc.splitTextToSize(step1, contentWidth - 8);
  const step2Lines = doc.splitTextToSize(step2, contentWidth - 8);
  const step3Lines = doc.splitTextToSize(step3, contentWidth - 8);
  const totalStepLines = step1Lines.length + step2Lines.length + step3Lines.length;
  const formulaCardHeight = 7.5 + (totalStepLines * 4.8) + 3;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, formulaCardHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, formulaCardHeight, 2, 2, 'S');

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text('CALCULATION SUMMARY / ਹਿਸਾਬ ਸਾਰ (STEP-BY-STEP):', margin + 4, y + 5);

  let formY = y + 9.5;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);

  [step1Lines, step2Lines, step3Lines].forEach((lines) => {
    lines.forEach((line: string) => {
      doc.text(line, margin + 4, formY);
      formY += 4.8;
    });
  });

  y += formulaCardHeight + 5;

  // Financial Rupees Overview
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'S');

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text('CALCULATION / ਹਿਸਾਬ: FINANCIAL OVERVIEW / ਰੁਪਏ ਦਾ ਹਿਸਾਬ:', margin + 4, y + 5.5);

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const netPayable = account.netPayableAmount ?? (account as any).netPayableToFarmer ?? 0;
  const finalNetSettlement = account.finalNetSettlementBalance ?? netPayable;
  doc.text(`Net Amount / ਕੁੱਲ ਬਕਾਇਆ ਰਕਮ: Rs. ${netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + 4, y + 12.5);

  const isNetPayable = finalNetSettlement >= 0;
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setTextColor(isNetPayable ? 20 : 185, isNetPayable ? 83 : 28, isNetPayable ? 45 : 28);
  const settlementText = isNetPayable
    ? `Final Settlement / ਆਖਰੀ ਨਿਪਟਾਰਾ: Rs. ${finalNetSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    : `Final Settlement / ਆਖਰੀ ਨਿਪਟਾਰਾ (ਵਾਪਸੀ): Rs. ${Math.abs(finalNetSettlement).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  doc.text(settlementText, margin + contentWidth - 4, y + 12.5, { align: 'right' });

  y += 23;

  // Signatures
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 4, y + 7, margin + 65, y + 7);
  doc.line(margin + contentWidth - 65, y + 7, margin + contentWidth - 4, y + 7);

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Verified Mandi Secretary / Arhtiya / ਆੜ੍ਹਤੀਆ ਦਸਤਖਤ', margin + 4, y + 12);
  doc.text('Farmer Signature / Thumb / ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ ਜਾਂ ਅੰਗੂਠਾ', margin + contentWidth - 4, y + 12, { align: 'right' });

  // Save PDF
  const cleanName = safeText(account.farmer.farmerName).replace(/\s+/g, '_') || 'Farmer';
  const filename = `Farmer_Summary_${account.farmer.id}_${cleanName}.pdf`;
  doc.save(filename);
}

/**
 * Generate Comprehensive Bilingual Farmer Account PDF / Kisan Khata (Full Details)
 * (English + Proper Punjabi Gurmukhi across all sections)
 */
export async function exportFarmerAccountPDF(
  account: FarmerAccountSummary,
  settings: MandiSettings,
  labourInfo?: SimpleFarmerLabourInfo
): Promise<void> {
  // 1. Try exact pixel-faithful reference A4 export first
  const captured = await captureAndExportExactA4Pdf(account, 'Complete');
  if (captured) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Register embedded Unicode Noto Sans Gurmukhi font (Regular & Bold)
  registerGurmukhiFont(doc);
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setLineHeightFactor(1.35);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  const farmerNameBilingual = getBilingualDisplay(account.farmer.farmerName, account.farmer.farmerNamePa);

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 14) {
      doc.addPage();
      y = 14;
      // Mini bilingual page header
      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Punjab Mandi Portal - Farmer Account / ਕਿਸਾਨ ਖਾਤਾ: ${account.farmer.id} (${farmerNameBilingual})`, margin, y);
      doc.text(`Page / ਸਫ਼ਾ ${doc.getNumberOfPages()}`, pageWidth - margin, y, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 8;
    }
  };

  // Normalization for robust data handling across different report callers
  const mandiArrivalEntries = (account.mandiArrivalEntries || (account as any).weighmentEntries || []) as any[];
  const purchaseRecords = (account.purchaseRecords || (account as any).purchaseEntries || []) as any[];
  const advances = (account.advances || (account as any).advanceEntries || []) as any[];
  const transactions = (account.transactions || []) as any[];
  const linkedPurchasesList = (account.linkedPurchasesList || []) as any[];
  const agencyWisePurchases = (account.agencyWisePurchases || []) as any[];

  const mandiArrivalBags = account.mandiArrivalBags ?? (account as any).totalBagsArrived ?? mandiArrivalEntries.reduce((s, r) => s + (Number(r.bags) || 0), 0);
  const directPurchasedBags = account.directPurchasedBags ?? (account as any).totalPurchasedBags ?? purchaseRecords.reduce((s, r) => s + (Number(r.bags) || 0), 0);
  const purchasedBags = account.purchasedBags ?? directPurchasedBags;
  const remainingBags = account.remainingBags ?? Math.max(0, mandiArrivalBags - purchasedBags);
  const directPurchasedAmount = account.directPurchasedAmount ?? (account as any).totalCropValue ?? purchaseRecords.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
  const purchasedAmount = account.purchasedAmount ?? directPurchasedAmount;
  const linkedPurchasedBags = account.linkedPurchasedBags || 0;
  const linkedPurchasedAmount = account.linkedPurchasedAmount || 0;
  const paidAmount = account.paidAmount || 0;

  const stdBagWeight = settings.fixedBagWeightKg || settings.bagWeightStandard || 37.5;
  const mandiArrivalDisplay = account.mandiArrivalDisplay || `${((account.mandiArrivalWeightKg || (mandiArrivalBags * stdBagWeight)) / 100).toFixed(2)} Qtl`;
  const purchasedWeightDisplay = account.purchasedWeightDisplay || `${((account.purchasedWeightKg || (purchasedBags * stdBagWeight)) / 100).toFixed(2)} Qtl`;
  const remainingWeightDisplay = account.remainingWeightDisplay || `${((remainingBags * stdBagWeight) / 100).toFixed(2)} Qtl`;

  const newBardanaUsed = account.newBardanaUsed || 0;
  const oldBardanaUsed = account.oldBardanaUsed || 0;
  const totalBardanaUsed = account.totalBardanaUsed || (newBardanaUsed + oldBardanaUsed);

  const totalGrossAmount = account.totalGrossAmount ?? directPurchasedAmount;
  const totalPakkiLabour = account.totalPakkiLabour ?? (account as any).totalLabourCharges ?? (account.totalLabourDeductions || 0);
  const totalPakkaDoubleLabour = account.totalPakkaDoubleLabour || 0;
  const totalSukhiLabour = account.totalSukhiLabour || 0;
  const totalLabourDeductions = account.totalLabourDeductions ?? totalPakkiLabour;
  const totalAgencyPurchasePayment = account.totalAgencyPurchasePayment ?? directPurchasedAmount;
  const netPayableAmount = account.netPayableAmount ?? (account as any).netPayableToFarmer ?? (totalGrossAmount - totalLabourDeductions);

  const totalAdvancePrincipal = account.totalAdvancePrincipal ?? (account as any).totalAdvancesPrincipal ?? 0;
  const totalAdvanceInterest = account.totalAdvanceInterest ?? (account as any).totalAdvancesInterest ?? 0;
  const totalAdvanceRecoverable = account.totalAdvanceRecoverable ?? (account as any).totalPayableAdvances ?? (totalAdvancePrincipal + totalAdvanceInterest);
  const finalNetSettlementBalance = account.finalNetSettlementBalance ?? (netPayableAmount - totalAdvanceRecoverable - paidAmount);

  // Top Firm Header
  const uniqueAgencies = Array.from(new Set(purchaseRecords.map(p => safeText(p.agency)).filter(Boolean)));
  const primaryAgency = uniqueAgencies.length === 1 ? uniqueAgencies[0] : undefined;

  y = renderStandardPdfHeader({
    doc,
    settings,
    title: 'FARMER ACCOUNT / ਕਿਸਾਨ ਖਾਤਾ',
    subtitle: `Date / ਮਿਤੀ: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    badgeLabel: 'ACCOUNT NO / ਖਾਤਾ ਨੰਬਰ',
    badgeValue: account.farmer.id,
    agencyName: primaryAgency,
    startY: 8
  });

  // ==========================================
  // FARMER PROFILE & BANK DETAILS
  // ==========================================
  checkPageBreak(52);
  const profileCardHeight = 46;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, profileCardHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, profileCardHeight, 2, 2, 'S');

  // Photo
  const photoSize = 34;
  const photoX = margin + 5;
  const photoY = y + 6;

  if (account.farmer.photoUrl) {
    try {
      doc.addImage(account.farmer.photoUrl, 'JPEG', photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(203, 213, 225);
      doc.rect(photoX, photoY, photoSize, photoSize, 'S');
    } catch {
      drawPhotoBox(doc, photoX, photoY, photoSize, 'Farmer Photo', 'ਕਿਸਾਨ ਦੀ ਫੋਟੋ');
    }
  } else {
    drawPhotoBox(doc, photoX, photoY, photoSize, 'Farmer Photo', 'ਕਿਸਾਨ ਦੀ ਫੋਟੋ');
  }

  // Farmer Information (Constrained within middle column to prevent collision with bank column)
  const infoX1 = photoX + photoSize + 7;
  const middleColWidth = (contentWidth * 0.55) - photoSize - 9;
  let textY = y + 8;

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Farmer Name / ਕਿਸਾਨ ਦਾ ਨਾਮ: ${farmerNameBilingual}`, infoX1, textY, { maxWidth: middleColWidth });

  textY += 6.5;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const fatherText = `Father Name / ਪਿਤਾ ਦਾ ਨਾਮ: ${getBilingualDisplay(account.farmer.fatherName, account.farmer.fatherNamePa)}`;
  doc.text(fatherText, infoX1, textY, { maxWidth: middleColWidth });

  textY += 6;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setTextColor(71, 85, 105);
  const villageText = `Village / ਪਿੰਡ: ${getBilingualDisplay(account.farmer.village, account.farmer.villagePa)} (PIN: ${account.farmer.pinCode || '141401'})`;
  doc.text(villageText, infoX1, textY, { maxWidth: middleColWidth });

  textY += 6;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setTextColor(71, 85, 105);
  const mobileText = `Mobile / ਮੋਬਾਈਲ: ${account.farmer.mobile || '-'} | Aadhaar: ${maskAadhaarNumber(account.farmer.aadhaar)}`;
  doc.text(mobileText, infoX1, textY, { maxWidth: middleColWidth });

  // Bank Column (Right side, with dedicated width)
  const bankX = margin + (contentWidth * 0.58);
  const bankWidth = (contentWidth * 0.42) - 4;
  let bankY = y + 8;

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text('BANK ACCOUNT / ਬੈਂਕ ਖਾਤੇ ਦਾ ਵੇਰਵਾ', bankX, bankY);

  bankY += 6;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank / ਬੈਂਕ: ${safeText(account.farmer.bankDetails?.bankName) || '-'}`, bankX, bankY, { maxWidth: bankWidth });

  bankY += 5.5;
  doc.text(`Account No / ਖਾਤਾ ਨੰਬਰ: ${account.farmer.bankDetails?.accountNumber || '-'}`, bankX, bankY, { maxWidth: bankWidth });

  bankY += 5.5;
  doc.text(`IFSC / ਕੋਡ: ${account.farmer.bankDetails?.ifscCode || '-'}`, bankX, bankY, { maxWidth: bankWidth });

  bankY += 5.5;
  doc.text(`Branch / ਸ਼ਾਖਾ: ${safeText(account.farmer.bankDetails?.branchName) || '-'}`, bankX, bankY, { maxWidth: bankWidth });

  y += profileCardHeight + 6;

  // ==========================================
  // TOP FINANCIAL KPI SUMMARY CARDS
  // ==========================================
  checkPageBreak(26);
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 22;

  // Card 1: Mandi Arrival
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'S');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(22, 101, 52);
  doc.text('TOTAL BAGS BROUGHT', margin + cardWidth / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(6.2);
  doc.text('ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ', margin + cardWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text(`${mandiArrivalBags} Bags / ਬੋਰੀਆਂ`, margin + cardWidth / 2, y + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text(safeText(mandiArrivalDisplay), margin + cardWidth / 2, y + 18.5, { align: 'center' });

  // Card 2: Purchased Bags
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin + (cardWidth + 3), y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 64, 175);
  doc.text('TOTAL PURCHASE', margin + (cardWidth + 3) + cardWidth / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(6.8);
  doc.text('ਕੁੱਲ ਖਰੀਦ', margin + (cardWidth + 3) + cardWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(29, 78, 216);
  doc.text(`${purchasedBags} Bags / ਬੋਰੀਆਂ`, margin + (cardWidth + 3) + cardWidth / 2, y + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text(safeText(purchasedWeightDisplay), margin + (cardWidth + 3) + cardWidth / 2, y + 18.5, { align: 'center' });

  // Card 3: Remaining Stock
  doc.setFillColor(remainingBags > 0 ? 254 : 241, remainingBags > 0 ? 243 : 245, remainingBags > 0 ? 199 : 249);
  doc.roundedRect(margin + (cardWidth + 3) * 2, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(remainingBags > 0 ? 146 : 71, remainingBags > 0 ? 64 : 85, remainingBags > 0 ? 14 : 105);
  doc.text('BALANCE', margin + (cardWidth + 3) * 2 + cardWidth / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(6.8);
  doc.text('ਬਾਕੀ ਬੋਰੀਆਂ', margin + (cardWidth + 3) * 2 + cardWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(remainingBags > 0 ? 180 : 100, remainingBags > 0 ? 83 : 116, remainingBags > 0 ? 9 : 139);
  doc.text(`${remainingBags} Bags / ਬੋਰੀਆਂ`, margin + (cardWidth + 3) * 2 + cardWidth / 2, y + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text(safeText(remainingWeightDisplay), margin + (cardWidth + 3) * 2 + cardWidth / 2, y + 18.5, { align: 'center' });

  // Card 4: Total Value
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin + (cardWidth + 3) * 3, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text('AMOUNT', margin + (cardWidth + 3) * 3 + cardWidth / 2, y + 4.5, { align: 'center' });
  doc.setFontSize(6.8);
  doc.text('ਰਕਮ', margin + (cardWidth + 3) * 3 + cardWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(9.2);
  doc.setTextColor(120, 53, 15);
  doc.text(formatPdfCurrency(purchasedAmount), margin + (cardWidth + 3) * 3 + cardWidth / 2, y + 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text(`Paid / ਅਦਾਇਗੀ: ${formatPdfCurrency(paidAmount)}`, margin + (cardWidth + 3) * 3 + cardWidth / 2, y + 18.5, { align: 'center' });

  y += cardHeight + 6;

  // ==========================================
  // SECTION 1: MANDI ARRIVAL SUMMARY
  // ==========================================
  checkPageBreak(38);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('1. MANDI ARRIVAL & WEIGHMENT / ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ ਦਾ ਵੇਰਵਾ', margin, y);
  y += 4;

  // Table header with two lines for Quantity / Bags / ਮਾਤਰਾ / ਬੋਰੀਆਂ to prevent collision
  const s1HeaderHeight = 8.5;
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, s1HeaderHeight, 'F');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text('Date / ਮਿਤੀ', margin + 2, y + 5.2);
  doc.text('Slip / ਪਰਚੀ', margin + 23, y + 5.2);

  // Split Quantity / Bags across 2 lines
  doc.text('Quantity / Bags', margin + 46, y + 3.8);
  doc.text('ਮਾਤਰਾ / ਬੋਰੀਆਂ', margin + 46, y + 7.2);

  doc.text('Weight / ਵਜ਼ਨ', margin + 76, y + 5.2);
  doc.text('Bardana / ਬਾਰਦਾਨਾ', margin + 112, y + 5.2);
  doc.text('Rate / ਰੇਟ', margin + 138, y + 5.2);
  doc.text('Amount / ਰਕਮ', pageWidth - margin - 3, y + 5.2, { align: 'right' });
  y += s1HeaderHeight;

  if (mandiArrivalEntries.length === 0) {
    doc.setFont('NotoSansGurmukhi', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No Mandi Arrival records found / ਕੋਈ ਆਮਦ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ।', margin + 3, y + 5);
    y += 8;
  } else {
    mandiArrivalEntries.forEach((entry, idx) => {
      checkPageBreak(8);
      const rowH = 7;
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
      doc.setFont('NotoSansGurmukhi', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(safeText(entry.date), margin + 2, y + 4.8);
      doc.text(safeText(entry.entryNumber), margin + 23, y + 4.8);
      doc.text(`${entry.bags} Bags`, margin + 46, y + 4.8);
      doc.text(safeText(entry.grandTotalDisplay), margin + 76, y + 4.8);
      doc.text(`${safeText(entry.bardana)}`, margin + 112, y + 4.8);
      doc.text(`Rs. ${entry.ratePerQtl}`, margin + 138, y + 4.8);
      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.text(formatPdfCurrency(entry.totalAmount), pageWidth - margin - 3, y + 4.8, { align: 'right' });
      y += rowH;
    });

    // Total row
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Bags Brought to Mandi / ਮੰਡੀ ਵਿੱਚ ਲਿਆਂਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ:', margin + 2, y + 5);
    doc.text(`${mandiArrivalBags} Bags / ਬੋਰੀਆਂ`, margin + 76, y + 5);
    doc.text(safeText(mandiArrivalDisplay), margin + 112, y + 5);
    y += 8.5;
  }

  // ==========================================
  // SECTION 2: OWN PURCHASES (AGENCY-WISE)
  // ==========================================
  checkPageBreak(38);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('2. PURCHASE DETAILS: OWN FARMER PURCHASE / ਖਰੀਦ ਵੇਰਵਾ: ਆਪਣੀ ਖਰੀਦ', margin, y);
  y += 4;

  // Table header
  const s2HeaderHeight = 8.5;
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, s2HeaderHeight, 'F');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text('Date / ਮਿਤੀ', margin + 2, y + 5.2);
  doc.text('Agency / ਏਜੰਸੀ', margin + 23, y + 5.2);
  doc.text('Boli / ਬੋਲੀ ਨੰ', margin + 56, y + 5.2);

  // Split Quantity / Bags
  doc.text('Quantity / Bags', margin + 79, y + 3.8);
  doc.text('ਮਾਤਰਾ / ਬੋਰੀਆਂ', margin + 79, y + 7.2);

  doc.text('Weight / ਵਜ਼ਨ', margin + 110, y + 5.2);
  doc.text('Rate / ਰੇਟ', margin + 143, y + 5.2);
  doc.text('Amount / ਰਕਮ', pageWidth - margin - 3, y + 5.2, { align: 'right' });
  y += s2HeaderHeight;

  if (purchaseRecords.length === 0) {
    doc.setFont('NotoSansGurmukhi', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No Daily Purchase records found / ਕੋਈ ਆਪਣੀ ਖਰੀਦ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ।', margin + 3, y + 5);
    y += 8;
  } else {
    purchaseRecords.forEach((pur, idx) => {
      checkPageBreak(8);
      const rowH = 7;
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
      doc.setFont('NotoSansGurmukhi', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(safeText(pur.date), margin + 2, y + 4.8);
      doc.text(safeText(pur.agency), margin + 23, y + 4.8);
      doc.text(safeText(pur.boliNumber || pur.id), margin + 56, y + 4.8);
      doc.text(`${pur.bags} Bags`, margin + 79, y + 4.8);
      doc.text(safeText(pur.totalWeightDisplay || `${pur.qul}Q ${pur.kg}K`), margin + 110, y + 4.8);
      doc.text(`Rs. ${pur.rate}`, margin + 143, y + 4.8);
      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.text(formatPdfCurrency(pur.totalAmount), pageWidth - margin - 3, y + 4.8, { align: 'right' });
      y += rowH;
    });

    // Total row
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Own Farmer Purchase / ਕੁੱਲ ਆਪਣੀ ਖਰੀਦ:', margin + 2, y + 5);
    doc.text(`${directPurchasedBags} Bags / ਬੋਰੀਆਂ`, margin + 79, y + 5);
    doc.text(formatPdfCurrency(directPurchasedAmount || 0), pageWidth - margin - 3, y + 5, { align: 'right' });
    y += 8.5;
  }

  // ==========================================
  // SECTION 2B: LINKED FARMERS PURCHASES
  // ==========================================
  if (linkedPurchasesList && linkedPurchasesList.length > 0) {
    checkPageBreak(38);
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(20, 83, 45);
    doc.text('2B. PURCHASE DETAILS: LINKED FARMERS PURCHASE / ਖਰੀਦ ਵੇਰਵਾ: ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ', margin, y);
    y += 4;

    const s2bHeaderHeight = 8.5;
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, s2bHeaderHeight, 'F');
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text('Linked Farmer / ਲਿੰਕ ਕਿਸਾਨ', margin + 2, y + 5.2);
    doc.text('Date / ਮਿਤੀ', margin + 48, y + 5.2);
    doc.text('Agency / ਏਜੰਸੀ', margin + 70, y + 5.2);

    // Split Quantity / Bags
    doc.text('Quantity / Bags', margin + 96, y + 3.8);
    doc.text('ਮਾਤਰਾ / ਬੋਰੀਆਂ', margin + 96, y + 7.2);

    doc.text('Weight / ਵਜ਼ਨ', margin + 126, y + 5.2);
    doc.text('Rate / ਰੇਟ', margin + 152, y + 5.2);
    doc.text('Amount / ਰਕਮ', pageWidth - margin - 3, y + 5.2, { align: 'right' });
    y += s2bHeaderHeight;

    linkedPurchasesList.forEach((lpur, idx) => {
      const lName = getBilingualDisplay(lpur.linkedFarmerName, lpur.linkedFarmerNamePa);
      const lNameLines = doc.splitTextToSize(lName, 44);
      const rowH = Math.max(lNameLines.length * 4.4 + 3, 7);

      checkPageBreak(rowH + 1);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
      doc.setFont('NotoSansGurmukhi', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      let nameY = y + 4.6;
      lNameLines.forEach((line: string) => {
        doc.text(line, margin + 2, nameY);
        nameY += 4.2;
      });

      doc.text(safeText(lpur.date), margin + 48, y + 4.8);
      doc.text(safeText(lpur.agency), margin + 70, y + 4.8);
      doc.text(`${lpur.bags} Bags`, margin + 96, y + 4.8);
      doc.text(`${lpur.qul}Q ${lpur.kg}K`, margin + 126, y + 4.8);
      doc.text(`Rs. ${lpur.rate}`, margin + 152, y + 4.8);
      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.text(formatPdfCurrency(lpur.totalAmount), pageWidth - margin - 3, y + 4.8, { align: 'right' });
      y += rowH;
    });

    // Total row for linked
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Linked Farmers Purchase / ਕੁੱਲ ਲਿੰਕ ਕਿਸਾਨਾਂ ਦੀ ਖਰੀਦ:', margin + 2, y + 5);
    doc.text(`${linkedPurchasedBags} Bags / ਬੋਰੀਆਂ`, margin + 96, y + 5);
    doc.text(formatPdfCurrency(linkedPurchasedAmount || 0), pageWidth - margin - 3, y + 5, { align: 'right' });
    y += 8.5;
  }

  // Agency Breakdown Box
  if (agencyWisePurchases && agencyWisePurchases.length > 0) {
    checkPageBreak(22);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 15, 1.5, 1.5, 'F');
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('AGENCY PROCUREMENT BREAKDOWN / ਏਜੰਸੀ ਖਰੀਦ ਵੰਡ:', margin + 4, y + 5);

    let agX = margin + 4;
    agencyWisePurchases.forEach((ag) => {
      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(20, 83, 45);
      doc.text(`${safeText(ag.agency)}: ${ag.bags} Bags (${formatPdfCurrency(ag.amount)})   |`, agX, y + 10.5);
      agX += 58;
    });
    y += 19;
  }

  // ==========================================
  // SECTION 3: BARDANA DETAILS
  // ==========================================
  checkPageBreak(24);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('3. BARDANA USAGE DETAILS / ਬਾਰਦਾਨਾ ਵੇਰਵਾ', margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'S');

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('New Bardana / ਨਵਾਂ ਬਾਰਦਾਨਾ:', margin + 6, y + 8.5);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.text(`${newBardanaUsed} Bags / ਬੋਰੀਆਂ`, margin + 46, y + 8.5);

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text('Old Bardana / ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ:', margin + 74, y + 8.5);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.text(`${oldBardanaUsed} Bags / ਬੋਰੀਆਂ`, margin + 114, y + 8.5);

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text('Total / ਕੁੱਲ ਬਾਰਦਾਨਾ:', margin + 140, y + 8.5);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setTextColor(20, 83, 45);
  doc.text(`${totalBardanaUsed} Bags`, margin + 168, y + 8.5);

  y += 20;

  // ==========================================
  // SECTION 4: CROP PURCHASES & LABOUR RECONCILIATION
  // ==========================================
  checkPageBreak(46);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('4. CROP RECONCILIATION & LABOUR EXPENSE / ਫਸਲ ਹਿਸਾਬ ਅਤੇ ਮਜ਼ਦੂਰੀ ਖਰਚ', margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 38, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 38, 1.5, 1.5, 'S');

  let crY = y + 6.5;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Gross Crop Amount / ਕੁੱਲ ਫਸਲ ਰਕਮ:', margin + 6, crY);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(totalGrossAmount), margin + 76, crY);

  crY += 6;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setTextColor(185, 28, 28);
  doc.text('Less: Pakki Labour / ਪੱਕੀ ਲੇਬਰ (Rs. 7/Qtl):', margin + 6, crY);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.text(`- ${formatPdfCurrency(totalPakkiLabour)}`, margin + 76, crY);

  crY += 6;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text('Less: Double Labour / ਡਬਲ ਲੇਬਰ (Rs. 14/Qtl):', margin + 6, crY);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.text(`- ${formatPdfCurrency(totalPakkaDoubleLabour)}`, margin + 76, crY);

  crY += 6;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.text('Less: Sukhi Labour / ਸੁੱਕੀ ਲੇਬਰ (Rs. 5/Qtl):', margin + 6, crY);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.text(`- ${formatPdfCurrency(totalSukhiLabour)}`, margin + 76, crY);

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 4, crY + 2.5, margin + (contentWidth * 0.52), crY + 2.5);

  crY += 7.5;
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text('Labour Expense / ਮਜ਼ਦੂਰੀ ਖਰਚ:', margin + 6, crY);
  doc.text(`- ${formatPdfCurrency(totalLabourDeductions)}`, margin + 76, crY);

  // Right column: Agency Payments & Net Crop Payable
  const netColX = margin + (contentWidth * 0.54);
  let netY = y + 6.5;
  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Agency Payments / ਸਰਕਾਰੀ ਭੁਗਤਾਨ:', netColX, netY);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(totalAgencyPurchasePayment), pageWidth - margin - 6, netY, { align: 'right' });

  netY += 9.5;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(netColX - 2, netY - 2, contentWidth * 0.46, 20, 1.5, 1.5, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(netColX - 2, netY - 2, contentWidth * 0.46, 20, 1.5, 1.5, 'S');

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 83, 45);
  doc.text('NET AMOUNT / ਕੁੱਲ ਬਕਾਇਆ ਰਕਮ', netColX + 4, netY + 4.5);
  doc.setFontSize(11);
  doc.text(formatPdfCurrency(netPayableAmount), netColX + 4, netY + 13.5);

  y += 44;

  // ==========================================
  // SECTION 5: SEPARATE ADVANCE & INTEREST
  // ==========================================
  checkPageBreak(42);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('5. SEPARATE ADVANCE & ACCRUED INTEREST / ਪੇਸ਼ਗੀ ਅਤੇ ਵਿਆਜ ਹਿਸਾਬ', margin, y);
  y += 4;

  const s5HeaderHeight = 8.5;
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, s5HeaderHeight, 'F');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Principal / ਮੂਲ (Rs.)', margin + 2, y + 5.2);
  doc.text('Start / ਸ਼ੁਰੂ ਮਿਤੀ', margin + 29, y + 5.2);
  doc.text('End / ਆਖਰੀ ਮਿਤੀ', margin + 50, y + 5.2);
  doc.text('Rate/Mo / ਦਰ', margin + 71, y + 5.2);
  doc.text('Days / ਦਿਨ', margin + 90, y + 5.2);
  doc.text('Months+Days / ਸਮਾਂ', margin + 107, y + 5.2);
  doc.text('Interest / ਵਿਆਜ', margin + 137, y + 5.2);
  doc.text('Amount / ਰਕਮ', pageWidth - margin - 3, y + 5.2, { align: 'right' });
  y += s5HeaderHeight;

  if (!advances || advances.length === 0) {
    doc.setFont('NotoSansGurmukhi', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No separate advance records recorded / ਕੋਈ ਪੇਸ਼ਗੀ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।', margin + 3, y + 5);
    y += 8;
  } else {
    advances.forEach((adv, idx) => {
      checkPageBreak(8);
      const rowH = 7;
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatPdfCurrency(adv.principal ?? adv.amount), margin + 2, y + 4.8);

      doc.setFont('NotoSansGurmukhi', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(safeText(adv.startDate || adv.date), margin + 29, y + 4.8);
      doc.text(safeText(adv.endDate || adv.interestTillDate || '-'), margin + 50, y + 4.8);
      doc.text(`${adv.monthlyInterestRate ?? 2.0}%`, margin + 71, y + 4.8);
      doc.text(`${adv.totalDays || 0}d`, margin + 90, y + 4.8);
      doc.text(`${adv.monthsElapsed || 0}M + ${adv.daysElapsed || 0}D`, margin + 107, y + 4.8);

      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(formatPdfCurrency(adv.interestAmount || 0), margin + 137, y + 4.8);
      doc.setTextColor(159, 18, 57);
      doc.text(formatPdfCurrency(adv.totalPayableWithInterest || (adv.amount + (adv.interestAmount || 0))), pageWidth - margin - 3, y + 4.8, { align: 'right' });
      y += rowH;
    });

    // Advance Totals row
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('NotoSansGurmukhi', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Principal / ਕੁੱਲ ਮੂਲ:', margin + 2, y + 5);
    doc.text(formatPdfCurrency(totalAdvancePrincipal), margin + 33, y + 5);

    doc.setTextColor(180, 83, 9);
    doc.text('Total Interest / ਕੁੱਲ ਵਿਆਜ:', margin + 71, y + 5);
    doc.text(formatPdfCurrency(totalAdvanceInterest), margin + 103, y + 5);

    doc.setTextColor(159, 18, 57);
    doc.text('Total Recoverable / ਕੁੱਲ ਵਾਪਸੀ:', margin + 134, y + 5);
    doc.text(formatPdfCurrency(totalAdvanceRecoverable), pageWidth - margin - 3, y + 5, { align: 'right' });
    y += 8.5;
  }

  // ==========================================
  // SECTION 6: FINAL NET SETTLEMENT STATEMENT
  // ==========================================
  checkPageBreak(32);
  const isPayable = finalNetSettlementBalance >= 0;
  doc.setFillColor(isPayable ? 240 : 254, isPayable ? 253 : 242, isPayable ? 244 : 242);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(isPayable ? 34 : 239, isPayable ? 197 : 68, isPayable ? 94 : 68);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'S');

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(isPayable ? 20 : 153, isPayable ? 83 : 27, isPayable ? 45 : 27);
  doc.text('6. FINAL SETTLEMENT / ਆਖਰੀ ਨਿਪਟਾਰਾ', margin + 6, y + 6);

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Net Amount / ਕੁੱਲ ਬਕਾਇਆ ਰਕਮ: ${formatPdfCurrency(netPayableAmount)}`, margin + 6, y + 13);
  doc.text(`Less Advance / ਪੇਸ਼ਗੀ ਵਾਪਸੀ: - ${formatPdfCurrency(totalAdvanceRecoverable)}`, margin + 68, y + 13);
  doc.text(`Direct Paid / ਸਿੱਧਾ ਭੁਗਤਾਨ: - ${formatPdfCurrency(paidAmount)}`, margin + 134, y + 13);

  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(isPayable ? 20 : 185, isPayable ? 83 : 28, isPayable ? 45 : 28);
  const settlementLabel = isPayable
    ? 'Final Settlement / ਆਖਰੀ ਨਿਪਟਾਰਾ (Payable to Farmer / ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ):'
    : 'Final Settlement / ਆਖਰੀ ਨਿਪਟਾਰਾ (Recoverable from Farmer / ਕਿਸਾਨ ਤੋਂ ਵਸੂਲੀ ਯੋਗ):';
  doc.text(settlementLabel, margin + 6, y + 20.5);
  doc.setFontSize(11);
  doc.text(formatPdfCurrency(Math.abs(finalNetSettlementBalance)), pageWidth - margin - 6, y + 20.5, { align: 'right' });

  y += 32;

  // ==========================================
  // SECTION 7: TRANSACTION LEDGER
  // ==========================================
  checkPageBreak(38);
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('7. CHRONOLOGICAL TRANSACTION LEDGER / ਲੈਣ-ਦੇਣ ਖਾਤਾ ਵਹੀ', margin, y);
  y += 4;

  const s7HeaderHeight = 8.5;
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, s7HeaderHeight, 'F');
  doc.setFont('NotoSansGurmukhi', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 41, 59);
  doc.text('Date / ਮਿਤੀ', margin + 2, y + 5.2);
  doc.text('Type / ਕਿਸਮ', margin + 23, y + 5.2);
  doc.text('Agency / ਏਜੰਸੀ (Ref)', margin + 58, y + 5.2);

  // Split Quantity / Bags
  doc.text('Quantity / Bags', margin + 95, y + 3.8);
  doc.text('ਮਾਤਰਾ / ਬੋਰੀਆਂ', margin + 95, y + 7.2);

  doc.text('Weight / ਵਜ਼ਨ', margin + 124, y + 5.2);
  doc.text('Rate / ਰੇਟ', margin + 150, y + 5.2);
  doc.text('Amount / ਰਕਮ', pageWidth - margin - 3, y + 5.2, { align: 'right' });
  y += s7HeaderHeight;

  if (!transactions || transactions.length === 0) {
    doc.setFont('NotoSansGurmukhi', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No ledger transactions recorded yet / ਕੋਈ ਲੈਣ-ਦੇਣ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।', margin + 3, y + 5);
    y += 8;
  } else {
    transactions.forEach((tx, idx) => {
      const typeDisplay = tx.typeLabelPa ? `${safeText(tx.typeLabelEn)} / ${safeText(tx.typeLabelPa)}` : safeText(tx.typeLabelEn);
      const typeLines = doc.splitTextToSize(typeDisplay, 34);
      const agencyRef = safeText(`${tx.agency || ''} ${tx.reference ? `(${tx.reference})` : ''}`);
      const agencyLines = doc.splitTextToSize(agencyRef, 35);
      const maxL = Math.max(typeLines.length, agencyLines.length, 1);
      const rowH = Math.max(maxL * 4.4 + 3, 7);

      checkPageBreak(rowH + 1);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowH, 'F');
      }
      doc.setFont('NotoSansGurmukhi', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(safeText(tx.date), margin + 2, y + 4.8);

      let tyY = y + 4.6;
      typeLines.forEach((line: string) => {
        doc.text(line, margin + 23, tyY);
        tyY += 4.2;
      });

      let agY = y + 4.6;
      agencyLines.forEach((line: string) => {
        doc.text(line, margin + 58, agY);
        agY += 4.2;
      });

      doc.text(tx.bags ? `${tx.bags}` : '-', margin + 95, y + 4.8);
      doc.text(tx.qul !== undefined ? `${tx.qul}Q ${tx.kg}K` : '-', margin + 124, y + 4.8);
      doc.text(tx.rate ? `Rs. ${tx.rate}` : '-', margin + 150, y + 4.8);
      doc.setFont('NotoSansGurmukhi', 'bold');
      doc.text(tx.totalAmount ? formatPdfCurrency(tx.totalAmount) : '-', pageWidth - margin - 3, y + 4.8, { align: 'right' });
      y += rowH;
    });
  }

  // ==========================================
  // SIGNATURE FOOTER
  // ==========================================
  checkPageBreak(25);
  y += 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont('NotoSansGurmukhi', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Verified Mandi Secretary / Arhtiya / ਆੜ੍ਹਤੀਆ ਜਾਂ ਸਕੱਤਰ ਦਸਤਖਤ', margin + 4, y + 8);
  doc.text('Farmer Signature / Thumb / ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ ਜਾਂ ਅੰਗੂਠਾ', pageWidth - margin - 65, y + 8);

  // Save PDF
  const cleanName = safeText(account.farmer.farmerName).replace(/\s+/g, '_') || 'Farmer';
  const filename = `Farmer_Account_${account.farmer.id}_${cleanName}.pdf`;
  doc.save(filename);
}

