import { DailyPurchaseRecord, MandiSettings, FarmerPurchaseSummary } from '../types/mandi';
import { formatCurrencyINR, maskAadhaarNumber } from './calculations';
import { cleanPdfText } from './translations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';

/**
 * Clean string for safe jsPDF rendering without broken glyphs
 */
function cleanText(text: string | number | null | undefined): string {
  return cleanPdfText(text);
}

/**
 * Parse various date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) to millisecond timestamp
 */
export function normalizeDateToComparable(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const month = parseInt(m1[2], 10) - 1;
    const year = parseInt(m1[3], 10);
    return new Date(year, month, day).getTime();
  }
  // Match YYYY-MM-DD or YYYY/MM/DD
  const m2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m2) {
    const year = parseInt(m2[1], 10);
    const month = parseInt(m2[2], 10) - 1;
    const day = parseInt(m2[3], 10);
    return new Date(year, month, day).getTime();
  }
  const parsed = Date.parse(s);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format weight into clean Quintal and Kg string
 */
function formatWeightQtlKg(weightKg: number): string {
  const safeKg = Math.max(0, Number(weightKg) || 0);
  const qul = Math.floor(safeKg / 100);
  const remKg = (safeKg % 100).toFixed(2);
  return `${qul} Qtl ${remKg} Kg`;
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
    mandiNameEn: 'Dana Mandi Kang Khurd',
    mandiNamePa: 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ',
    marketCommitteeEn: 'Market Committee Lohian Khas',
    marketCommitteePa: 'ਮਾਰਕੀਟ ਕਮੇਟੀ ਲੋਹੀਆਂ ਖਾਸ',
    firmNameEn: 'Jammu Trading Co',
    firmAddress: 'Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629',
    firmMobile: '98147-74651',
    firmLicence: 'JAL/LKH/133',
    firmPan: 'AAACJ1234F',
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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // 1. Universal Standardized Firm Header
  let y = renderStandardPdfHeader({
    doc,
    settings,
    title: 'OFFICIAL DAILY PURCHASE & BOLI VOUCHER',
    subtitle: `Date: ${cleanText(record.date)} | Boli: ${cleanText(record.boliNumber || '-')}`,
    badgeLabel: 'VOUCHER NO',
    badgeValue: record.id,
    agencyName: record.agency,
    startY: 8
  });

  // Meta Info Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Govt MSP Fixed Rate: Rs. ${settings.fixedRatePerQtl} / Qtl`, margin + 5, y + 7.5);
  doc.text(`Standard Weight: ${(settings.fixedBagWeightKg || 37.5).toFixed(2)} Kg/Bag`, margin + 90, y + 7.5);
  doc.text(`Status: VERIFIED & BOOKED`, pageWidth - margin - 5, y + 7.5, { align: 'right' });

  y += 16;

  // 2. Farmer Particulars Section
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 36, 1.5, 1.5, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 83, 45);
  doc.text('FARMER PARTICULARS & IDENTITY', margin + 5, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  // Left column
  doc.text('Farmer ID:', margin + 5, y + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.text(record.farmerId, margin + 36, y + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.text('Farmer Name:', margin + 5, y + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(record.farmerName), margin + 36, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.text('Father Name:', margin + 5, y + 28.5);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(record.fatherName || '-'), margin + 36, y + 28.5);

  // Right column
  const rightColX = margin + 95;
  doc.setFont('helvetica', 'normal');
  doc.text('Village:', rightColX, y + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(record.village), rightColX + 24, y + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.text('Mobile No:', rightColX, y + 21);
  doc.setFont('helvetica', 'bold');
  doc.text(record.mobile || '-', rightColX + 24, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.text('Aadhaar No:', rightColX, y + 28.5);
  doc.setFont('helvetica', 'bold');
  doc.text(maskAadhaarNumber(record.aadhaar), rightColX + 24, y + 28.5);

  y += 42;

  // 3. Purchase Details Table
  doc.setFillColor(20, 83, 45); // Deep emerald
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPTION', margin + 5, y + 5.5);
  doc.text('BAGS', margin + 65, y + 5.5, { align: 'center' });
  doc.text('WEIGHT (QTL / KG)', margin + 105, y + 5.5, { align: 'center' });
  doc.text('RATE / QTL', margin + 140, y + 5.5, { align: 'right' });
  doc.text('TOTAL AMOUNT', pageWidth - margin - 5, y + 5.5, { align: 'right' });

  y += 8;

  // Table Row
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  doc.text('Paddy / Grain Procurement', margin + 5, y + 6);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Agency: ${cleanText(record.agency)}`, margin + 5, y + 11.5);
  doc.text(`New: ${record.newBags ?? record.bags} | Old: ${record.oldBags ?? 0}`, margin + 5, y + 16.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.bags} Bags`, margin + 65, y + 10, { align: 'center' });

  const totalWeightKg = Number(record.totalWeightKg) || (Number(record.bags) * (settings.fixedBagWeightKg || 37.5));
  doc.text(formatWeightQtlKg(totalWeightKg), margin + 105, y + 10, { align: 'center' });

  const purchaseRate = (record as any).ratePerQtl || record.rate || settings.fixedRatePerQtl;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${purchaseRate.toLocaleString('en-IN')}`, margin + 140, y + 10, { align: 'right' });

  const grossAmount = Number(record.totalAmount) || (totalWeightKg / 100) * purchaseRate;
  doc.text(`Rs. ${grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 5, y + 10, { align: 'right' });

  y += 24;

  // 4. Financial Calculations & Deductions Card
  const calcCardHeight = 44;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, calcCardHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('FINANCIAL BREAKDOWN & STATUTORY DEDUCTIONS', margin + 5, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const totalDeduction = Number(record.labourDeductions?.grandTotalDeductions) || 0;
  const netPayable = Number(record.netAmount) || (grossAmount - totalDeduction);

  const leftCalcX = margin + 5;
  const pakkiVal = Number(record.labourDeductions?.pakkiLabourRate) || 0;
  doc.text(`Labour Charges (Pakki/Sukhi):`, leftCalcX, y + 14);
  doc.text(`Rs. ${(Number(record.labourDeductions?.totalLabourDeduction) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftCalcX + 48, y + 14);

  doc.text(`Other Mandi Deductions:`, leftCalcX, y + 21);
  doc.text(`Rs. ${(Number(record.labourDeductions?.totalOtherDeduction) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftCalcX + 48, y + 21);

  doc.text(`Standard Deduction Total:`, leftCalcX, y + 28);
  doc.text(`Rs. ${totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftCalcX + 48, y + 28);

  // Right Side - Net Payable Highlight Box
  const netBoxX = pageWidth - margin - 75;
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(16, 185, 129); // Emerald-500
  doc.roundedRect(netBoxX, y + 7, 70, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(6, 78, 59);
  doc.text('Gross Amount:', netBoxX + 4, y + 13);
  doc.text(`Rs. ${grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, netBoxX + 66, y + 13, { align: 'right' });

  doc.text('Total Deductions:', netBoxX + 4, y + 19);
  doc.setTextColor(185, 28, 28);
  doc.text(`- Rs. ${totalDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, netBoxX + 66, y + 19, { align: 'right' });

  doc.setDrawColor(16, 185, 129);
  doc.line(netBoxX + 4, y + 22, netBoxX + 66, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 78, 59);
  doc.text('NET PAYABLE:', netBoxX + 4, y + 28);
  doc.setFontSize(10.5);
  doc.text(`Rs. ${netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, netBoxX + 66, y + 28, { align: 'right' });

  y += calcCardHeight + 8;

  // 5. Cumulative Farmer Summary (if available)
  if (summary) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('CUMULATIVE SEASON SUMMARY FOR THIS FARMER', margin + 5, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const sumWKg = Number(summary.alreadyPurchasedWeightKg) || 0;
    const sumBags = Number(summary.alreadyPurchasedBags) || 0;
    const sumLots = summary.agencyWisePurchases?.length || 1;
    const sumNetAmt = summary.agencyWisePurchases?.reduce((s, a) => s + (Number(a.amount) || 0), 0) || 0;
    doc.text(`Agency Lots: ${sumLots} | Purchased: ${sumBags} Bags | Weight: ${cleanText(summary.alreadyPurchasedWeightDisplay || formatWeightQtlKg(sumWKg))}`, margin + 5, y + 11);
    if (sumNetAmt > 0) {
      doc.text(`Total Season Purchase Value: Rs. ${sumNetAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + 5, y + 16.5);
    } else {
      doc.text(`Remaining Balance: ${summary.remainingBags} Bags (${cleanText(summary.remainingWeightDisplay)})`, margin + 5, y + 16.5);
    }

    y += 26;
  }

  // 6. Signatures & Authorization Box
  const sigY = pageHeight - 34;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, sigY, pageWidth - margin, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  doc.text('Farmer / Beneficiary Signature', margin + 12, sigY + 12);
  doc.line(margin + 10, sigY + 9, margin + 60, sigY + 9);

  doc.text('Weighment Clerk / Mandi Munshi', pageWidth / 2, sigY + 12, { align: 'center' });
  doc.line(pageWidth / 2 - 25, sigY + 9, pageWidth / 2 + 25, sigY + 9);

  doc.text('Authorized Firm Signature & Stamp', pageWidth - margin - 12, sigY + 12, { align: 'right' });
  doc.line(pageWidth - margin - 60, sigY + 9, pageWidth - margin - 10, sigY + 9);

  // Bottom Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Punjab Mandi Board Automated System • Voucher ID: ${record.id} • Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}`,
    margin,
    pageHeight - 8
  );

  doc.save(`Purchase_Voucher_${record.id}_${record.farmerName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

/**
 * Export Market Committee Daily Purchase Register PDF
 * Conforms strictly to:
 * Header: Firm Name, Address, License No, Mobile No, PAN No, Agency
 * Columns: Sr No | Date | Farmer Name | Father Name | Village | Mobile | New Bags | Old Bags | Total Bags | Weight (Qtl/Kg) | Agency
 * Under-table clean summary:
 * - Old Total (all purchase dates before selected date)
 * - Pure Total (new/pure bags calculation)
 * - Today Purchase (only selected date)
 * - Total Purchase (Old Total + Today Purchase)
 */
export async function exportDailyPurchaseRegisterPDF(
  records: DailyPurchaseRecord[],
  settings: MandiSettings,
  filterAgency = 'All Agencies',
  filterDate = 'All Dates',
  allDailyPurchaseRecords?: DailyPurchaseRecord[]
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2; // 281 mm

  // 1. Universal Standardized Firm Header
  let y = renderStandardPdfHeader({
    doc,
    settings,
    title: 'MARKET COMMITTEE DAILY PROCUREMENT REGISTER / PURCHASE HISAAB',
    subtitle: `Date Filter: ${cleanText(filterDate)} | Total Entries: ${records.length}`,
    agencyName: filterAgency !== 'All Agencies' ? filterAgency : 'ALL PROCUREMENT AGENCIES (PUNJAB MANDI BOARD)',
    startY: 6
  });

  // 11 Exact Columns specification:
  // Sr No | Date | Farmer Name | Father Name | Village | Mobile | New Bags | Old Bags | Total Bags | Weight (Qtl/Kg) | Agency
  // Total Width = 13 + 22 + 44 + 36 + 30 + 24 + 18 + 18 + 20 + 30 + 26 = 281 mm
  const columns = [
    { label: 'Sr No', width: 13, align: 'center' as const },
    { label: 'Date', width: 22, align: 'center' as const },
    { label: 'Farmer Name', width: 44, align: 'left' as const },
    { label: 'Father Name', width: 36, align: 'left' as const },
    { label: 'Village', width: 30, align: 'left' as const },
    { label: 'Mobile', width: 24, align: 'center' as const },
    { label: 'New Bags', width: 18, align: 'right' as const },
    { label: 'Old Bags', width: 18, align: 'right' as const },
    { label: 'Total Bags', width: 20, align: 'right' as const },
    { label: 'Weight (Qtl/Kg)', width: 30, align: 'right' as const },
    { label: 'Agency', width: 26, align: 'left' as const }
  ];

  const headerHeight = 7.5;
  const rowHeight = 6.8;

  const drawTableHeader = (atY: number) => {
    doc.setFillColor(20, 83, 45); // Deep emerald
    doc.rect(margin, atY, contentWidth, headerHeight, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let curX = margin;
    columns.forEach((col) => {
      let textX = curX + 2;
      if (col.align === 'center') {
        textX = curX + col.width / 2;
      } else if (col.align === 'right') {
        textX = curX + col.width - 2;
      }
      doc.text(col.label, textX, atY + 5.2, { align: col.align });
      curX += col.width;
    });
  };

  drawTableHeader(y);
  y += headerHeight;

  // Render Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  records.forEach((rec, idx) => {
    if (y + rowHeight > pageHeight - 52) {
      doc.addPage();
      y = 10;
      drawTableHeader(y);
      y += headerHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    const recNew = Number(rec.newBags ?? rec.bags) || 0;
    const recOld = Number(rec.oldBags ?? 0) || 0;
    const recBags = Number(rec.bags) || 0;
    const recWeightKg = Number(rec.totalWeightKg) || (recBags * (settings.fixedBagWeightKg || 37.5));
    const recQul = Math.floor(recWeightKg / 100);
    const recKg = (recWeightKg % 100).toFixed(2);
    const weightDisplay = `${recQul} Q ${recKg} K`;

    let curX = margin;
    doc.setTextColor(15, 23, 42);

    // 1. Sr No
    doc.text(`${idx + 1}`, curX + columns[0].width / 2, y + 4.7, { align: 'center' });
    curX += columns[0].width;

    // 2. Date
    doc.text(cleanText(rec.date), curX + columns[1].width / 2, y + 4.7, { align: 'center' });
    curX += columns[1].width;

    // 3. Farmer Name
    doc.setFont('helvetica', 'bold');
    const fName = cleanText(rec.farmerName);
    doc.text(fName.length > 20 ? fName.slice(0, 19) + '...' : fName, curX + 2, y + 4.7);
    doc.setFont('helvetica', 'normal');
    curX += columns[2].width;

    // 4. Father Name
    const fatName = cleanText(rec.fatherName || '-');
    doc.text(fatName.length > 17 ? fatName.slice(0, 16) + '...' : fatName, curX + 2, y + 4.7);
    curX += columns[3].width;

    // 5. Village
    const vName = cleanText(rec.village);
    doc.text(vName.length > 15 ? vName.slice(0, 14) + '...' : vName, curX + 2, y + 4.7);
    curX += columns[4].width;

    // 6. Mobile
    doc.text(rec.mobile || '-', curX + columns[5].width / 2, y + 4.7, { align: 'center' });
    curX += columns[5].width;

    // 7. New Bags
    doc.text(`${recNew}`, curX + columns[6].width - 2, y + 4.7, { align: 'right' });
    curX += columns[6].width;

    // 8. Old Bags
    doc.text(`${recOld}`, curX + columns[7].width - 2, y + 4.7, { align: 'right' });
    curX += columns[7].width;

    // 9. Total Bags (bold)
    doc.setFont('helvetica', 'bold');
    doc.text(`${recBags}`, curX + columns[8].width - 2, y + 4.7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    curX += columns[8].width;

    // 10. Weight (Qtl / Kg)
    doc.setFont('helvetica', 'bold');
    doc.text(weightDisplay, curX + columns[9].width - 2, y + 4.7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    curX += columns[9].width;

    // 11. Agency
    const agencyStr = cleanText(rec.agency);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 83, 45); // emerald color for agency
    doc.text(agencyStr.length > 14 ? agencyStr.slice(0, 13) + '...' : agencyStr, curX + 2, y + 4.7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    y += rowHeight;
  });

  // =========================================================================
  // UNDER TABLE DAILY PURCHASE SUMMARY:
  // Show ONLY 3 rows:
  // - Last Total Purchase
  // - Today Purchase
  // - Total Purchase
  //
  // Last Total Purchase = cumulative purchase from ALL dates BEFORE the selected/current date.
  // Today Purchase = purchase for ONLY the selected/current date.
  // Total Purchase = Last Total Purchase + Today Purchase.
  // Applied to Bags, Weight (Qtl/Kg) and Net Amount.
  // Separate WEIGHT (KG) column completely removed.
  // =========================================================================

  // Source pool: allDailyPurchaseRecords if passed, otherwise records
  const sourcePool = (allDailyPurchaseRecords && allDailyPurchaseRecords.length > 0)
    ? allDailyPurchaseRecords
    : records;

  // Filter pool by agency if agency is specified
  const agencyPool = (filterAgency && filterAgency !== 'All Agencies')
    ? sourcePool.filter(r => cleanText(r.agency).toLowerCase() === cleanText(filterAgency).toLowerCase())
    : sourcePool;

  // Determine target selected date timestamp
  let targetTime = 0;
  if (filterDate && filterDate !== 'All Dates') {
    targetTime = normalizeDateToComparable(filterDate);
  }

  // If no specific date filter provided or targetTime is 0, pick the latest date in records
  if (targetTime === 0 && records.length > 0) {
    const times = records.map(r => normalizeDateToComparable(r.date)).filter(t => t > 0);
    if (times.length > 0) {
      targetTime = Math.max(...times);
    }
  }

  // 1. Last Total Purchase records (strictly before target date)
  const lastTotalRecords = targetTime > 0
    ? agencyPool.filter(r => {
        const t = normalizeDateToComparable(r.date);
        return t > 0 && t < targetTime;
      })
    : [];

  // 2. Today Purchase records (strictly matching target date)
  let todayRecords = targetTime > 0
    ? agencyPool.filter(r => {
        const t = normalizeDateToComparable(r.date);
        return t === targetTime;
      })
    : records;

  // If todayRecords empty but records exist, fallback to records
  if (todayRecords.length === 0 && records.length > 0) {
    todayRecords = records;
  }

  // Calculations for Last Total Purchase
  const lastBags = lastTotalRecords.reduce((s, r) => s + (Number(r.bags) || 0), 0);
  const lastWeightKg = lastTotalRecords.reduce(
    (s, r) => s + (Number(r.totalWeightKg) || (Number(r.bags) * (settings.fixedBagWeightKg || 37.5))),
    0
  );
  const lastNetAmount = lastTotalRecords.reduce(
    (s, r) => s + (r.netAmount !== undefined ? Number(r.netAmount) : (Number(r.totalAmount) || 0)),
    0
  );

  // Calculations for Today Purchase
  const todayBags = todayRecords.reduce((s, r) => s + (Number(r.bags) || 0), 0);
  const todayWeightKg = todayRecords.reduce(
    (s, r) => s + (Number(r.totalWeightKg) || (Number(r.bags) * (settings.fixedBagWeightKg || 37.5))),
    0
  );
  const todayNetAmount = todayRecords.reduce(
    (s, r) => s + (r.netAmount !== undefined ? Number(r.netAmount) : (Number(r.totalAmount) || 0)),
    0
  );

  // Calculations for Total Purchase (Last Total Purchase + Today Purchase)
  const totalPurchaseBags = lastBags + todayBags;
  const totalPurchaseWeightKg = lastWeightKg + todayWeightKg;
  const totalPurchaseNetAmount = lastNetAmount + todayNetAmount;

  // Page break check for summary box
  const summaryBoxHeight = 31;
  if (y + summaryBoxHeight + 14 > pageHeight - 8) {
    doc.addPage();
    y = 10;
  } else {
    y += 4;
  }

  // Summary Container Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 1.5, 1.5, 'S');

  // Header of Summary Box
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  const sCol1 = margin + 8;             // Category Name
  const sCol2 = margin + 85;            // Total Bags
  const sCol3 = margin + 160;           // Weight (Qtl / Kg) - ONLY Qtl/Kg, NO separate KG column
  const sCol4 = pageWidth - margin - 8; // Net Amount

  doc.text('DAILY PURCHASE SUMMARY', sCol1, y + 4.8);
  doc.text('TOTAL BAGS', sCol2, y + 4.8);
  doc.text('WEIGHT (QTL / KG)', sCol3, y + 4.8);
  doc.text('NET AMOUNT', sCol4, y + 4.8, { align: 'right' });

  // ONLY 3 Summary Rows:
  // 1. Last Total Purchase
  // 2. Today Purchase
  // 3. Total Purchase
  const summaryRows = [
    {
      title: 'Last Total Purchase',
      bags: `${lastBags.toLocaleString('en-IN')} Bags`,
      weightQtlKg: formatWeightQtlKg(lastWeightKg),
      amount: `Rs. ${lastNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      isBold: false,
      color: [71, 85, 105] as [number, number, number]
    },
    {
      title: 'Today Purchase',
      bags: `${todayBags.toLocaleString('en-IN')} Bags`,
      weightQtlKg: formatWeightQtlKg(todayWeightKg),
      amount: `Rs. ${todayNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      isBold: true,
      color: [180, 83, 9] as [number, number, number] // amber-700
    },
    {
      title: 'Total Purchase',
      bags: `${totalPurchaseBags.toLocaleString('en-IN')} Bags`,
      weightQtlKg: formatWeightQtlKg(totalPurchaseWeightKg),
      amount: `Rs. ${totalPurchaseNetAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      isBold: true,
      color: [15, 23, 42] as [number, number, number] // bold slate-900
    }
  ];

  let sumY = y + 13;
  summaryRows.forEach((sr, rIdx) => {
    if (rIdx === 2) {
      // Highlight row for Total Purchase
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.rect(margin + 1, sumY - 4.5, contentWidth - 2, 7, 'F');
      doc.setDrawColor(52, 211, 153);
      doc.line(margin + 1, sumY - 4.5, margin + contentWidth - 1, sumY - 4.5);
    }

    doc.setFont('helvetica', sr.isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...sr.color);

    doc.text(sr.title, sCol1, sumY);
    doc.text(sr.bags, sCol2, sumY);
    doc.text(sr.weightQtlKg, sCol3, sumY);
    doc.text(sr.amount, sCol4, sumY, { align: 'right' });

    sumY += 7;
  });

  // Footer text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Punjab Mandi Board Automated Report | Filter: ${cleanText(filterAgency)} (${cleanText(filterDate)}) | Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}`,
    margin,
    pageHeight - 5
  );

  const cleanDate = (filterDate || 'All_Dates').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanAgency = (filterAgency || 'All_Agencies').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Daily_Purchase_Register_${cleanAgency}_${cleanDate}.pdf`);
}
