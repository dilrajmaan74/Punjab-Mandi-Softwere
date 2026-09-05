import { DailyPurchaseRecord, MandiSettings, FarmerPurchaseSummary } from '../types/mandi';
import { formatCurrencyINR, maskAadhaarNumber } from './calculations';

/**
 * Clean string for safe jsPDF rendering
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text.replace(/[^\x00-\x7F]/g, '').trim();
}

/**
 * Export Individual Daily Purchase Voucher PDF
 */
export async function exportDailyPurchaseVoucherPDF(
  record: DailyPurchaseRecord,
  summaryOrSettings?: FarmerPurchaseSummary | MandiSettings,
  maybeSettings?: MandiSettings
): Promise<void> {
  const summary: FarmerPurchaseSummary | undefined =
    summaryOrSettings && 'farmerId' in summaryOrSettings ? (summaryOrSettings as FarmerPurchaseSummary) : undefined;

  const fallbackSettings: MandiSettings = {
    mandiNameEn: 'Dana Mandi',
    mandiNamePa: 'ਦਾਣਾ ਮੰਡੀ',
    marketCommitteeEn: 'Market Committee',
    marketCommitteePa: 'ਮਾਰਕੀਟ ਕਮੇਟੀ',
    fixedRatePerQtl: 2461,
    fixedBagWeightKg: 37.5,
    defaultPakkiLabourRate: 7,
    defaultPakkaDoubleLabourRate: 14,
    defaultSukhiLabourRate: 5
  };

  const settings: MandiSettings =
    maybeSettings ||
    (summaryOrSettings && 'mandiNameEn' in summaryOrSettings ? (summaryOrSettings as MandiSettings) : fallbackSettings);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Box
  doc.setFillColor(245, 247, 250);
  doc.rect(10, y, pageWidth - 20, 32, 'F');
  doc.setDrawColor(20, 83, 45); // emerald dark
  doc.setLineWidth(0.8);
  doc.rect(10, y, pageWidth - 20, 32, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 83, 45);
  doc.text(cleanText(settings.mandiNameEn) || 'PUNJAB GRAIN MARKET YARD', pageWidth / 2, y + 8, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(cleanText(settings.marketCommitteeEn) || 'Market Committee, Punjab', pageWidth / 2, y + 15, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL DAILY PURCHASE & BOLI VOUCHER', pageWidth / 2, y + 23, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Govt MSP Rate: Rs. ${settings.fixedRatePerQtl} / Qtl | Standard Bag: 37.50 KG`, pageWidth / 2, y + 29, { align: 'center' });

  y += 38;

  // Voucher Meta Info Table
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, pageWidth - 20, 16, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`VOUCHER NO: ${record.id}`, 14, y + 6);
  doc.text(`DATE: ${record.date}`, pageWidth - 14, y + 6, { align: 'right' });

  doc.setTextColor(20, 83, 45);
  doc.text(`PROCUREMENT AGENCY: ${cleanText(record.agency)}`, 14, y + 12);
  if (record.boliNumber) {
    doc.setTextColor(71, 85, 105);
    doc.text(`BOLI / LOT NO: ${cleanText(record.boliNumber)}`, pageWidth - 14, y + 12, { align: 'right' });
  }

  y += 22;

  // Farmer Details Section
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, pageWidth - 20, 36, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 83, 45);
  doc.text('FARMER PARTICULARS', 14, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  doc.text(`Farmer ID: ${record.farmerId}`, 14, y + 15);
  doc.text(`Farmer Name: ${cleanText(record.farmerName)}`, 14, y + 22);
  doc.text(`Father's Name: ${cleanText(record.fatherName || '-')}`, 14, y + 29);

  doc.text(`Village: ${cleanText(record.village)}`, 110, y + 15);
  doc.text(`Mobile: ${record.mobile || '-'}`, 110, y + 22);
  doc.text(`Aadhaar: ${maskAadhaarNumber(record.aadhaar)}`, 110, y + 29);

  y += 42;

  // Purchase Details Table
  doc.setFillColor(20, 83, 45);
  doc.rect(10, y, pageWidth - 20, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', 14, y + 5.5);
  doc.text('BAGS', 75, y + 5.5, { align: 'center' });
  doc.text('WEIGHT (QUL / KG)', 115, y + 5.5, { align: 'center' });
  doc.text('RATE / QTL', 150, y + 5.5, { align: 'right' });
  doc.text('TOTAL AMOUNT', pageWidth - 14, y + 5.5, { align: 'right' });

  y += 8;

  // Table Row
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(10, y, pageWidth - 20, 18, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Paddy / Wheat Procurement', 14, y + 6);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Std Bag: 37.50 KG | Total: ${record.totalWeightKg.toFixed(2)} KG`, 14, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.bags}`, 75, y + 9, { align: 'center' });
  doc.text(`${record.qul} Qul ${record.kg} Kg`, 115, y + 9, { align: 'center' });
  doc.text(`Rs. ${record.rate.toFixed(2)}`, 150, y + 9, { align: 'right' });
  doc.setTextColor(20, 83, 45);
  doc.text(`Rs. ${record.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 14, y + 9, { align: 'right' });

  y += 22;

  // Net Payable Row
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.rect(10, y, pageWidth - 20, 11, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 83, 45);
  doc.text('TOTAL PURCHASE VALUE:', 14, y + 7.5);
  doc.text(`Rs. ${record.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 14, y + 7.5, { align: 'right' });
  y += 16;

  // Farmer Mandi Balance Status Box
  if (summary) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, y, pageWidth - 20, 22, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('FARMER MANDI ARRIVAL & STOCK BALANCE AFTER THIS PURCHASE:', 14, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Mandi Arrival: ${summary.mandiArrivalBags} Bags (${summary.mandiArrivalWeightDisplay})`, 14, y + 13);
    doc.text(`Total Purchased: ${summary.alreadyPurchasedBags} Bags (${summary.alreadyPurchasedWeightDisplay})`, 85, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(summary.remainingBags > 0 ? 180 : 20, summary.remainingBags > 0 ? 83 : 83, summary.remainingBags > 0 ? 9 : 45);
    doc.text(`Remaining Mandi Stock: ${summary.remainingBags} Bags (${summary.remainingWeightDisplay})`, 14, y + 19);

    y += 28;
  } else {
    y += 4;
  }

  // Remarks
  if (record.remarks) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Remarks: ${cleanText(record.remarks)}`, 14, y);
    y += 8;
  }

  // Signatures
  y = Math.max(y + 10, 220);

  doc.setDrawColor(148, 163, 184);
  doc.line(14, y + 18, 60, y + 18);
  doc.line(80, y + 18, 130, y + 18);
  doc.line(150, y + 18, pageWidth - 14, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Farmer's Signature / Thumb", 14, y + 22);
  doc.text('Procurement Inspector / Agency', 80, y + 22);
  doc.text('Commission Agent / Kachha Arhtia', 150, y + 22);

  // Footer note
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by Punjab Mandi Software on ${new Date().toLocaleString()} | Official Record`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  doc.save(`Daily_Purchase_${record.id}_${record.date.replace(/\//g, '-')}.pdf`);
}

/**
 * Export Market Committee Daily Purchase Register PDF
 */
export async function exportDailyPurchaseRegisterPDF(
  records: DailyPurchaseRecord[],
  settings: MandiSettings,
  filterAgency = 'All Agencies',
  filterDate = 'All Dates'
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 12;

  // Title & Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 83, 45);
  doc.text(cleanText(settings.mandiNameEn) || 'PUNJAB GRAIN MARKET YARD', pageWidth / 2, y, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(cleanText(settings.marketCommitteeEn) || 'Market Committee Lohian Khas, Punjab', pageWidth / 2, y + 5.5, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('DAILY PROCUREMENT & PURCHASE REGISTER / MARKET COMMITTEE REPORT', pageWidth / 2, y + 12, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Agency: ${cleanText(filterAgency)} | Date Filter: ${filterDate} | Total Entries: ${records.length}`, pageWidth / 2, y + 17, { align: 'center' });

  y += 22;

  // Table Headers
  const totalNewBags = records.reduce((s, r) => s + (Number(r.newBags) || 0), 0);
  const totalOldBags = records.reduce((s, r) => s + (Number(r.oldBags) || 0), 0);
  const totalBags = records.reduce((s, r) => s + (Number(r.bags) || 0), 0);
  const totalWeightKg = records.reduce((s, r) => s + (Number(r.totalWeightKg) || (Number(r.bags) * 37.5) || 0), 0);
  const totalQul = Math.floor(totalWeightKg / 100);
  const totalKg = (totalWeightKg % 100).toFixed(2);

  doc.setFillColor(20, 83, 45);
  doc.rect(10, y, pageWidth - 20, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SR', 12, y + 5.5);
  doc.text('DATE (ਮਿਤੀ)', 22, y + 5.5);
  doc.text('FARMER (ਕਿਸਾਨ)', 45, y + 5.5);
  doc.text('FATHER (ਪਿਤਾ)', 85, y + 5.5);
  doc.text('VILLAGE (ਪਿੰਡ)', 121, y + 5.5);
  doc.text('MOBILE', 155, y + 5.5);
  doc.text('NEW (ਨਵਾਂ)', 198, y + 5.5, { align: 'right' });
  doc.text('OLD (ਪੁਰਾਣਾ)', 218, y + 5.5, { align: 'right' });
  doc.text('TOTAL BAGS', 240, y + 5.5, { align: 'right' });
  doc.text('WEIGHT (Q-KG)', 263, y + 5.5, { align: 'right' });
  doc.text('AGENCY', pageWidth - 12, y + 5.5, { align: 'right' });

  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  records.forEach((rec, idx) => {
    if (y > 185) {
      doc.addPage();
      y = 14;

      // Table Header repeated on new page
      doc.setFillColor(20, 83, 45);
      doc.rect(10, y, pageWidth - 20, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('SR', 12, y + 5.5);
      doc.text('DATE (ਮਿਤੀ)', 22, y + 5.5);
      doc.text('FARMER (ਕਿਸਾਨ)', 45, y + 5.5);
      doc.text('FATHER (ਪਿਤਾ)', 85, y + 5.5);
      doc.text('VILLAGE (ਪਿੰਡ)', 121, y + 5.5);
      doc.text('MOBILE', 155, y + 5.5);
      doc.text('NEW (ਨਵਾਂ)', 198, y + 5.5, { align: 'right' });
      doc.text('OLD (ਪੁਰਾਣਾ)', 218, y + 5.5, { align: 'right' });
      doc.text('TOTAL BAGS', 240, y + 5.5, { align: 'right' });
      doc.text('WEIGHT (Q-KG)', 263, y + 5.5, { align: 'right' });
      doc.text('AGENCY', pageWidth - 12, y + 5.5, { align: 'right' });
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(10, y, pageWidth - 20, 6.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(10, y + 6.5, pageWidth - 10, y + 6.5);

    const recNew = rec.newBags ?? rec.bags;
    const recOld = rec.oldBags ?? 0;

    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}`, 12, y + 4.5);
    doc.text(rec.date, 22, y + 4.5);
    doc.text(cleanText(rec.farmerName).substring(0, 20), 45, y + 4.5);
    doc.text(cleanText(rec.fatherName || '-').substring(0, 18), 85, y + 4.5);
    doc.text(cleanText(rec.village).substring(0, 18), 121, y + 4.5);
    doc.text(rec.mobile || '-', 155, y + 4.5);
    doc.text(`${recNew}`, 198, y + 4.5, { align: 'right' });
    doc.text(`${recOld}`, 218, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${rec.bags}`, 240, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`${rec.qul} Q ${rec.kg} Kg`, 263, y + 4.5, { align: 'right' });
    doc.text(cleanText(rec.agency).substring(0, 12), pageWidth - 12, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  // Total Summary Footer Row
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.rect(10, y, pageWidth - 20, 8.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL PROCUREMENT SUMMARY:', 12, y + 5.5);
  doc.text(`New: ${totalNewBags}`, 198, y + 5.5, { align: 'right' });
  doc.text(`Old: ${totalOldBags}`, 218, y + 5.5, { align: 'right' });
  doc.setTextColor(20, 83, 45);
  doc.text(`Total: ${totalBags} Bags`, 240, y + 5.5, { align: 'right' });
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalQul} Q ${totalKg} Kg`, 263, y + 5.5, { align: 'right' });

  // Signatures on Bottom
  y += 18;
  if (y > 185) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(20, y + 10, 80, y + 10);
  doc.line(115, y + 10, 175, y + 10);
  doc.line(210, y + 10, 270, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Prepared By (Operator)', 30, y + 14);
  doc.text('Verified By (Agency Inspector)', 120, y + 14);
  doc.text('Market Committee Official', 218, y + 14);

  doc.save(`Daily_Purchase_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
}
