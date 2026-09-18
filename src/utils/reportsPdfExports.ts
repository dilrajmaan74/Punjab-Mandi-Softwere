import { jsPDF } from 'jspdf';
import {
  MandiSettings,
  Farmer,
  BagsEntryRecord,
  DailyPurchaseRecord,
  LeftingRecord,
  BardanaReceivedRecord,
  FarmerAdvanceRecord,
  FarmerAccountSummary
} from '../types/mandi';
import { cleanPdfText } from './translations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';
import { registerGurmukhiFont } from './gurmukhiPdfFont';
import { formatKgToQulKg } from './calculations';
import {
  PaymentTransferRecord,
  SameFarmerAdjustmentRecord,
  BagTransferRecord
} from './farmerAdjustmentsStorage';
import { exportStockLedgerPDF, StockLedgerExportOptions } from './stockBalancePdfExport';
import { exportFarmerAccountPDF } from './farmerAccountPdfExport';

/**
 * Common Helper to draw standard A4 Page Footers
 */
function drawA4PageFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  reportTitle: string
) {
  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';
  const footY = pageHeight - 8;
  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500

  const now = new Date();
  const dateStr = `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(`Punjab Mandi Portal • ${cleanPdfText(reportTitle)} • Generated: ${dateStr}`, margin, footY);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footY, { align: 'right' });

  // Sign line on last page if space allows
  if (pageNum === totalPages) {
    doc.setFont(fontName, 'bold');
    doc.text('Authorised Signatory / ਲਾਇਸੈਂਸਦਾਰ ਆੜ੍ਹਤੀਆ', pageWidth - margin - 5, pageHeight - 16, { align: 'right' });
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(pageWidth - margin - 55, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  }
}

/**
 * Common Helper to draw standard table header row
 */
function drawTableHeaderRow(
  doc: jsPDF,
  columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[],
  margin: number,
  atY: number,
  rowHeight: number = 7
) {
  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';
  const contentWidth = columns.reduce((s, c) => s + c.width, 0);

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, atY, contentWidth, rowHeight, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, atY, contentWidth, rowHeight, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  columns.forEach((col) => {
    let textX = curX + 2;
    if (col.align === 'center') textX = curX + col.width / 2;
    else if (col.align === 'right') textX = curX + col.width - 2;
    doc.text(col.label, textX, atY + rowHeight - 2.3, { align: col.align });
    curX += col.width;
  });
}

export interface DataRowCell {
  text: string;
  align: 'left' | 'center' | 'right';
  w: number;
  bold?: boolean;
  color?: [number, number, number];
}

export function calculateDataRowHeight(
  doc: jsPDF,
  cells: DataRowCell[],
  fontName: string,
  baseHeight: number = 6.8
): { rowHeight: number; cellLines: string[][] } {
  let maxLines = 1;
  const cellLines: string[][] = [];

  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);

  cells.forEach((c) => {
    const targetW = Math.max(c.w - 3, 4);
    const lines = doc.splitTextToSize(c.text || '', targetW);
    const cleanLines = Array.isArray(lines) ? lines : [lines];
    cellLines.push(cleanLines);
    if (cleanLines.length > maxLines) {
      maxLines = cleanLines.length;
    }
  });

  const lineHeight = 3.6;
  const rowHeight = maxLines > 1 ? Math.max(baseHeight, maxLines * lineHeight + 2.5) : baseHeight;
  return { rowHeight, cellLines };
}

export function renderTableDataRow(
  doc: jsPDF,
  cells: DataRowCell[],
  cellLines: string[][],
  margin: number,
  atY: number,
  rowHeight: number,
  isEven: boolean,
  fontName: string
) {
  const contentWidth = cells.reduce((s, c) => s + c.w, 0);

  doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
  doc.rect(margin, atY, contentWidth, rowHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.rect(margin, atY, contentWidth, rowHeight, 'S');

  let curX = margin;
  const lineHeight = 3.6;

  cells.forEach((c, idx) => {
    const lines = cellLines[idx] || [c.text];
    doc.setFont(fontName, c.bold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    if (c.color) {
      doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    } else {
      doc.setTextColor(30, 41, 59);
    }

    const totalTextHeight = lines.length * lineHeight;
    const startY = atY + (rowHeight - totalTextHeight) / 2 + 2.8;

    lines.forEach((line: string, lIdx: number) => {
      let tX = curX + 1.5;
      if (c.align === 'center') tX = curX + c.w / 2;
      else if (c.align === 'right') tX = curX + c.w - 1.5;
      doc.text(line, tX, startY + lIdx * lineHeight, { align: c.align });
    });

    curX += c.w;
  });
}

// ============================================================================
// 1. FARMER ACCOUNT / ਕਿਸਾਨ ਖਾਤਾ
// Simple Summary PDF & Full Details PDF
// ============================================================================

export async function exportFarmerAccountSummaryListPDF(
  summaries: FarmerAccountSummary[],
  settings: MandiSettings,
  filterTitle: string = 'All Farmers'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277 mm

  const columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { label: 'Sr No', width: 12, align: 'center' },
    { label: 'Farmer ID', width: 22, align: 'center' },
    { label: 'Farmer Name / ਕਿਸਾਨ', width: 45, align: 'left' },
    { label: 'Father Name / ਪਿਤਾ', width: 40, align: 'left' },
    { label: 'Village / ਪਿੰਡ', width: 34, align: 'left' },
    { label: 'Bags / ਬੋਰੀ', width: 20, align: 'right' },
    { label: 'Weight (Qtl/Kg)', width: 30, align: 'right' },
    { label: 'Crop Amount (₹)', width: 26, align: 'right' },
    { label: 'Advance+Int (₹)', width: 24, align: 'right' },
    { label: 'Net Balance (₹)', width: 24, align: 'right' }
  ];

  const rowHeight = 6.8;
  const headerHeight = 7;
  const pageCapY = pageHeight - 22;

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'FARMER ACCOUNT SUMMARY REGISTER / ਕਿਸਾਨ ਖਾਤਾ ਸੰਖੇਪ ਰਜਿਸਟਰ',
    subtitle: `Filter: ${cleanPdfText(filterTitle)} | Total Accounts: ${summaries.length}`,
    badgeLabel: 'REGISTER TYPE',
    badgeValue: 'SIMPLE SUMMARY',
    startY: 6
  });

  drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
  currentY += headerHeight;

  let pageNum = 1;
  const pageHolders: number[] = [1];

  let totalBags = 0;
  let totalWeightKg = 0;
  let totalCropAmount = 0;
  let totalAdvanceInt = 0;
  let totalNetBalance = 0;

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  summaries.forEach((s, idx) => {
    const f = s.farmer;
    const bags = s.mandiArrivalBags || s.purchasedBags || 0;
    const wtKg = s.mandiArrivalWeightKg || s.purchasedWeightKg || 0;
    const cropAmt = s.netPayableAmount || s.totalGrossAmount || 0;
    const advInt = s.totalAdvanceAmount || 0;
    const balance = s.finalBalance !== undefined ? s.finalBalance : cropAmt - advInt;

    totalBags += bags;
    totalWeightKg += wtKg;
    totalCropAmount += cropAmt;
    totalAdvanceInt += advInt;
    totalNetBalance += balance;

    const wtFormatted = formatKgToQulKg(wtKg);

    const values: DataRowCell[] = [
      { text: `${idx + 1}`, align: 'center', w: 12 },
      { text: f.id, align: 'center', w: 22 },
      { text: `${cleanPdfText(f.farmerName)} ${f.farmerNamePa ? `(${cleanPdfText(f.farmerNamePa)})` : ''}`, align: 'left', w: 45 },
      { text: cleanPdfText(f.fatherName || '-'), align: 'left', w: 40 },
      { text: cleanPdfText(f.village), align: 'left', w: 34 },
      { text: `${bags}`, align: 'right', w: 20 },
      { text: `${wtFormatted.qtl} Q ${wtFormatted.kg} K`, align: 'right', w: 30 },
      { text: Math.round(cropAmt).toLocaleString('en-IN'), align: 'right', w: 26 },
      { text: Math.round(advInt).toLocaleString('en-IN'), align: 'right', w: 24 },
      { text: Math.round(balance).toLocaleString('en-IN'), align: 'right', w: 24 }
    ];

    const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, rowHeight);

    if (currentY + thisRowH > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
      drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
      currentY += headerHeight;
    }

    const isEven = idx % 2 === 0;
    renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
    currentY += thisRowH;
  });

  // Grand Total Row
  if (currentY + 8 > pageCapY) {
    doc.addPage();
    pageNum++;
    pageHolders.push(pageNum);
    currentY = 12;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7.5, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, 7.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const wtGrand = formatKgToQulKg(totalWeightKg);
  doc.text('GRAND TOTAL / ਕੁੱਲ ਜੋੜ:', margin + 4, currentY + 5);
  doc.text(`${totalBags} Bags`, margin + 12 + 22 + 45 + 40 + 34 + 20 - 2, currentY + 5, { align: 'right' });
  doc.text(`${wtGrand.qtl} Q ${wtGrand.kg} K`, margin + 12 + 22 + 45 + 40 + 34 + 20 + 30 - 2, currentY + 5, { align: 'right' });
  doc.text(`Rs. ${Math.round(totalCropAmount).toLocaleString('en-IN')}`, margin + 12 + 22 + 45 + 40 + 34 + 20 + 30 + 26 - 2, currentY + 5, { align: 'right' });
  doc.text(`Rs. ${Math.round(totalAdvanceInt).toLocaleString('en-IN')}`, margin + 12 + 22 + 45 + 40 + 34 + 20 + 30 + 26 + 24 - 2, currentY + 5, { align: 'right' });
  doc.text(`Rs. ${Math.round(totalNetBalance).toLocaleString('en-IN')}`, margin + contentWidth - 2, currentY + 5, { align: 'right' });

  // Footers
  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, 'Farmer Account Summary');
  }

  doc.save(`Farmer_Account_Summary_${Date.now()}.pdf`);
}

export async function exportFarmerAccountFullDetailsSingleOrAllPDF(
  summaries: FarmerAccountSummary[],
  settings: MandiSettings,
  selectedFarmerId?: string
) {
  const targetSummaries = selectedFarmerId && selectedFarmerId !== 'ALL'
    ? summaries.filter((s) => s.farmer.id === selectedFarmerId)
    : summaries;

  if (targetSummaries.length === 1) {
    await exportFarmerAccountPDF(targetSummaries[0], settings);
    return;
  }

  // If exporting all farmers' full statements together
  for (let i = 0; i < Math.min(targetSummaries.length, 50); i++) {
    await exportFarmerAccountPDF(targetSummaries[i], settings);
  }
}

// ============================================================================
// 2. MANDI ARRIVAL / ਮੰਡੀ ਆਮਦ ਰਿਪੋਰਟ (Tola / Weighment)
// Date-wise PDF & Full season PDF
// ============================================================================

export async function exportMandiArrivalReportPDF(
  records: BagsEntryRecord[],
  settings: MandiSettings,
  mode: 'DATE_WISE' | 'FULL_SEASON',
  filterDate?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277 mm

  const columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { label: 'Slip No', width: 18, align: 'center' },
    { label: 'Date', width: 22, align: 'center' },
    { label: 'Farmer Name / ਕਿਸਾਨ', width: 44, align: 'left' },
    { label: 'Father Name / ਪਿਤਾ', width: 36, align: 'left' },
    { label: 'Village / ਪਿੰਡ', width: 32, align: 'left' },
    { label: 'Bags / ਬੋਰੀ', width: 20, align: 'right' },
    { label: 'Weight (Qtl/Kg)', width: 32, align: 'right' },
    { label: 'Tota (Kg)', width: 20, align: 'right' },
    { label: 'Bardana', width: 23, align: 'center' },
    { label: 'Amount (₹)', width: 30, align: 'right' }
  ];

  const rowHeight = 6.8;
  const headerHeight = 7;
  const pageCapY = pageHeight - 22;

  const titleEn = mode === 'DATE_WISE'
    ? `MANDI ARRIVAL (TOLA) REPORT - DATE: ${filterDate || 'SELECTED'}`
    : 'FULL SEASON MANDI ARRIVAL (TOLA) REGISTER';
  const subtitlePa = mode === 'DATE_WISE'
    ? `ਮੰਡੀ ਆਮਦ (ਤੋਲ) ਰਿਪੋਰਟ - ਮਿਤੀ: ${cleanPdfText(filterDate || 'ਸਾਰੀਆਂ')}`
    : 'ਪੂਰੇ ਸੀਜ਼ਨ ਦਾ ਮੰਡੀ ਆਮਦ ਅਤੇ ਤੁਲਾਈ ਰਜਿਸਟਰ';

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: `${titleEn} / ${subtitlePa}`,
    subtitle: `Total Arrivals: ${records.length} Entries | Standard 37.5 KG Bags`,
    badgeLabel: 'MODE',
    badgeValue: mode === 'DATE_WISE' ? 'DATE-WISE' : 'FULL SEASON',
    startY: 6
  });

  drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
  currentY += headerHeight;

  let pageNum = 1;
  const pageHolders: number[] = [1];

  let totalBags = 0;
  let totalBagsWeightKg = 0;
  let totalTotaKg = 0;
  let totalAmount = 0;

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  records.forEach((b, idx) => {
    totalBags += b.bags;
    totalBagsWeightKg += b.totalBagsWeightKg;
    totalTotaKg += b.totaKg;
    totalAmount += b.totalAmount;

    const wtBreakdown = formatKgToQulKg(b.grandTotalKg);

    const values: DataRowCell[] = [
      { text: cleanPdfText(b.entryNumber), align: 'center', w: 18 },
      { text: cleanPdfText(b.date), align: 'center', w: 22 },
      { text: `${cleanPdfText(b.farmerName)} ${b.farmerNamePa ? `(${cleanPdfText(b.farmerNamePa)})` : ''}`, align: 'left', w: 44 },
      { text: cleanPdfText(b.farmerFatherName || '-'), align: 'left', w: 36 },
      { text: cleanPdfText(b.farmerVillage), align: 'left', w: 32 },
      { text: `${b.bags}`, align: 'right', w: 20 },
      { text: `${wtBreakdown.qtl} Q ${wtBreakdown.kg} K`, align: 'right', w: 32 },
      { text: `${b.totaKg.toFixed(1)}`, align: 'right', w: 20 },
      { text: b.bardana === 'NEW' ? 'New (ਨਵਾਂ)' : 'Old (ਪੁਰਾਣਾ)', align: 'center', w: 23 },
      { text: Math.round(b.totalAmount).toLocaleString('en-IN'), align: 'right', w: 30 }
    ];

    const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, rowHeight);

    if (currentY + thisRowH > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
      drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
      currentY += headerHeight;
    }

    const isEven = idx % 2 === 0;
    renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
    currentY += thisRowH;
  });

  // Grand Total Row
  if (currentY + 8 > pageCapY) {
    doc.addPage();
    pageNum++;
    pageHolders.push(pageNum);
    currentY = 12;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7.5, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, 7.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const grandGrandKg = totalBagsWeightKg + totalTotaKg;
  const grandBreakdown = formatKgToQulKg(grandGrandKg);

  doc.text('GRAND TOTAL / ਕੁੱਲ ਜੋੜ:', margin + 4, currentY + 5);
  doc.text(`${totalBags} Bags`, margin + 18 + 22 + 44 + 36 + 32 + 20 - 2, currentY + 5, { align: 'right' });
  doc.text(`${grandBreakdown.qtl} Q ${grandBreakdown.kg} K`, margin + 18 + 22 + 44 + 36 + 32 + 20 + 32 - 2, currentY + 5, { align: 'right' });
  doc.text(`${totalTotaKg.toFixed(1)} Kg`, margin + 18 + 22 + 44 + 36 + 32 + 20 + 32 + 20 - 2, currentY + 5, { align: 'right' });
  doc.text(`Rs. ${Math.round(totalAmount).toLocaleString('en-IN')}`, margin + contentWidth - 2, currentY + 5, { align: 'right' });

  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, 'Mandi Arrival Report');
  }

  const fileName = mode === 'DATE_WISE'
    ? `Mandi_Arrival_DateWise_${(filterDate || 'today').replace(/\//g, '-')}.pdf`
    : `Mandi_Arrival_FullSeason_${Date.now()}.pdf`;

  doc.save(fileName);
}

// ============================================================================
// 3. DAILY PURCHASE / ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਰਿਪੋਰਟ
// Date-wise PDF & Full purchase register PDF
// ============================================================================

export async function exportDailyPurchaseReportPDF(
  records: DailyPurchaseRecord[],
  settings: MandiSettings,
  mode: 'DATE_WISE' | 'FULL_REGISTER',
  filterDate?: string,
  filterAgency?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277 mm

  const columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { label: 'Voucher No', width: 22, align: 'center' },
    { label: 'Date', width: 22, align: 'center' },
    { label: 'Agency / ਏਜੰਸੀ', width: 28, align: 'left' },
    { label: 'Farmer / ਕਿਸਾਨ', width: 42, align: 'left' },
    { label: 'Village / ਪਿੰਡ', width: 30, align: 'left' },
    { label: 'Bags / ਬੋਰੀ', width: 20, align: 'right' },
    { label: 'Weight (Qtl/Kg)', width: 32, align: 'right' },
    { label: 'Rate (₹)', width: 22, align: 'right' },
    { label: 'Amount (₹)', width: 28, align: 'right' },
    { label: 'Gate Pass / Remarks', width: 31, align: 'left' }
  ];

  const rowHeight = 6.8;
  const headerHeight = 7;
  const pageCapY = pageHeight - 22;

  const titleEn = mode === 'DATE_WISE'
    ? `DAILY PURCHASE PROCUREMENT REPORT - DATE: ${filterDate || 'SELECTED'}`
    : 'FULL DAILY PURCHASE & PROCUREMENT REGISTER';
  const subtitlePa = mode === 'DATE_WISE'
    ? `ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਰਿਪੋਰਟ - ਮਿਤੀ: ${cleanPdfText(filterDate || 'ਸਾਰੀਆਂ')}`
    : 'ਪੂਰਾ ਸਰਕਾਰੀ ਖਰੀਦ ਤੇ ਮਾਰਕੀਟ ਕਮੇਟੀ ਰਜਿਸਟਰ';

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: `${titleEn} / ${subtitlePa}`,
    subtitle: `Agency: ${cleanPdfText(filterAgency || 'All Agencies')} | Total Records: ${records.length}`,
    agencyName: filterAgency !== 'ALL' && filterAgency !== 'All Agencies' ? filterAgency : undefined,
    badgeLabel: 'REGISTER',
    badgeValue: mode === 'DATE_WISE' ? 'DATE-WISE' : 'FULL REGISTER',
    startY: 6
  });

  drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
  currentY += headerHeight;

  let pageNum = 1;
  const pageHolders: number[] = [1];

  let totalBags = 0;
  let totalWeightKg = 0;
  let totalAmount = 0;

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  records.forEach((p, idx) => {
    const bCount = Number(p.bags) || 0;
    const wtKg = Number(p.totalWeightKg) || 0;
    const amt = Number(p.totalAmount) || 0;

    totalBags += bCount;
    totalWeightKg += wtKg;
    totalAmount += amt;

    const wtBreakdown = formatKgToQulKg(wtKg);

    const farmerLabel = `${cleanPdfText(p.farmerName)}${(p as any).farmerNamePa ? ` (${cleanPdfText((p as any).farmerNamePa)})` : ''}`;

    const values: DataRowCell[] = [
      { text: cleanPdfText(p.id), align: 'center', w: 22 },
      { text: cleanPdfText(p.date), align: 'center', w: 22 },
      { text: cleanPdfText(p.agency), align: 'left', w: 28 },
      { text: farmerLabel, align: 'left', w: 42 },
      { text: cleanPdfText(p.village || p.farmerVillage || '-'), align: 'left', w: 30 },
      { text: `${bCount}`, align: 'right', w: 20 },
      { text: `${wtBreakdown.qtl} Q ${wtBreakdown.kg} K`, align: 'right', w: 32 },
      { text: `${p.rate || 0}`, align: 'right', w: 22 },
      { text: Math.round(amt).toLocaleString('en-IN'), align: 'right', w: 28 },
      { text: cleanPdfText(p.gatePassNumber || p.boliNumber || '-'), align: 'left', w: 31 }
    ];

    const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, rowHeight);

    if (currentY + thisRowH > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
      drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
      currentY += headerHeight;
    }

    const isEven = idx % 2 === 0;
    renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
    currentY += thisRowH;
  });

  // Grand Total Row
  if (currentY + 8 > pageCapY) {
    doc.addPage();
    pageNum++;
    pageHolders.push(pageNum);
    currentY = 12;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7.5, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, 7.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const grandWt = formatKgToQulKg(totalWeightKg);
  doc.text('GRAND TOTAL / ਕੁੱਲ ਜੋੜ:', margin + 4, currentY + 5);
  doc.text(`${totalBags} Bags`, margin + 22 + 22 + 28 + 42 + 30 + 20 - 2, currentY + 5, { align: 'right' });
  doc.text(`${grandWt.qtl} Q ${grandWt.kg} K`, margin + 22 + 22 + 28 + 42 + 30 + 20 + 32 - 2, currentY + 5, { align: 'right' });
  doc.text(`Rs. ${Math.round(totalAmount).toLocaleString('en-IN')}`, margin + 22 + 22 + 28 + 42 + 30 + 20 + 32 + 22 + 28 - 2, currentY + 5, { align: 'right' });

  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, 'Daily Purchase Register');
  }

  const fileName = mode === 'DATE_WISE'
    ? `Purchase_Register_DateWise_${(filterDate || 'date').replace(/\//g, '-')}.pdf`
    : `Daily_Purchase_Register_Full_${Date.now()}.pdf`;

  doc.save(fileName);
}

// ============================================================================
// 4. LEFTING / ਲਿਫਟਿੰਗ ਰਿਪੋਰਟ (Sheller Dispatch)
// Date-wise PDF & Full lefting register PDF
// ============================================================================

export async function exportLeftingReportPDF(
  records: LeftingRecord[],
  settings: MandiSettings,
  mode: 'DATE_WISE' | 'FULL_REGISTER',
  filterDate?: string,
  filterAgency?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277 mm

  const columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { label: 'Dispatch ID', width: 22, align: 'center' },
    { label: 'Date', width: 22, align: 'center' },
    { label: 'Agency / ਏਜੰਸੀ', width: 28, align: 'left' },
    { label: 'Destination / ਸ਼ੈਲਰ', width: 46, align: 'left' },
    { label: 'Truck No / ਗੱਡੀ', width: 28, align: 'center' },
    { label: 'Driver / ਡਰਾਈਵਰ', width: 32, align: 'left' },
    { label: 'Bags / ਬੋਰੀ', width: 20, align: 'right' },
    { label: 'Total Weight / ਕੁੱਲ ਵਜ਼ਨ', width: 34, align: 'right' },
    { label: 'Gate Pass / Bilti', width: 24, align: 'center' },
    { label: 'Status', width: 21, align: 'center' }
  ];

  const rowHeight = 6.8;
  const headerHeight = 7;
  const pageCapY = pageHeight - 22;

  const titleEn = mode === 'DATE_WISE'
    ? `LEFTING & SHELLER DISPATCH REPORT - DATE: ${filterDate || 'SELECTED'}`
    : 'FULL LEFTING & SHELLER DISPATCH REGISTER';
  const subtitlePa = mode === 'DATE_WISE'
    ? `ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ ਰਿਪੋਰਟ - ਮਿਤੀ: ${cleanPdfText(filterDate || 'ਸਾਰੀਆਂ')}`
    : 'ਪੂਰਾ ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ ਤੇ ਗੱਡੀ ਰਵਾਨਗੀ ਰਜਿਸਟਰ';

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: `${titleEn} / ${subtitlePa}`,
    subtitle: `Agency: ${cleanPdfText(filterAgency || 'All')} | Total Dispatches: ${records.length}`,
    agencyName: filterAgency && filterAgency !== 'ALL' ? filterAgency : undefined,
    badgeLabel: 'REGISTER',
    badgeValue: mode === 'DATE_WISE' ? 'DATE-WISE' : 'FULL LEFTING',
    startY: 6
  });

  drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
  currentY += headerHeight;

  let pageNum = 1;
  const pageHolders: number[] = [1];

  let totalBags = 0;
  let totalWeightKg = 0;

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  records.forEach((l, idx) => {
    const bCount = Number(l.bags) || 0;
    const wtKg = Number(l.totalWeightKg) || (bCount * 37.5);

    totalBags += bCount;
    totalWeightKg += wtKg;

    const wtBreakdown = formatKgToQulKg(wtKg);

    const values: DataRowCell[] = [
      { text: cleanPdfText(l.id), align: 'center', w: 22 },
      { text: cleanPdfText(l.date || l.dispatchDate || ''), align: 'center', w: 22 },
      { text: cleanPdfText(l.agency || l.sellerOrAgency || '-'), align: 'left', w: 28 },
      { text: cleanPdfText(l.sellerName || l.destination || '-'), align: 'left', w: 46 },
      { text: cleanPdfText(l.truckNo || '-'), align: 'center', w: 28 },
      { text: cleanPdfText(l.driverName || '-'), align: 'left', w: 32 },
      { text: `${bCount}`, align: 'right', w: 20 },
      { text: `${wtBreakdown.qtl} Qtl ${wtBreakdown.kg} Kg`, align: 'right', w: 34 },
      { text: cleanPdfText(l.gatePassNo || '-'), align: 'center', w: 24 },
      { text: l.status === 'DELIVERED' ? 'Delivered' : 'Dispatched', align: 'center', w: 21 }
    ];

    const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, rowHeight);

    if (currentY + thisRowH > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
      drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
      currentY += headerHeight;
    }

    const isEven = idx % 2 === 0;
    renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
    currentY += thisRowH;
  });

  // Grand Total Row
  if (currentY + 8 > pageCapY) {
    doc.addPage();
    pageNum++;
    pageHolders.push(pageNum);
    currentY = 12;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7.5, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, 7.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const grandWt = formatKgToQulKg(totalWeightKg);
  doc.text('GRAND TOTAL / ਕੁੱਲ ਜੋੜ:', margin + 4, currentY + 5);
  doc.text(`${totalBags} Bags`, margin + 22 + 22 + 28 + 46 + 28 + 32 + 20 - 2, currentY + 5, { align: 'right' });
  doc.text(`${grandWt.qtl} Qtl ${grandWt.kg} Kg`, margin + 22 + 22 + 28 + 46 + 28 + 32 + 20 + 34 - 2, currentY + 5, { align: 'right' });

  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, 'Lefting Dispatch Register');
  }

  const fileName = mode === 'DATE_WISE'
    ? `Lefting_Register_DateWise_${(filterDate || 'date').replace(/\//g, '-')}.pdf`
    : `Lefting_Register_Full_${Date.now()}.pdf`;

  doc.save(fileName);
}

// ============================================================================
// 5. BARDANA / ਬਾਰਦਾਨਾ ਰਿਪੋਰਟ
// New Bardana PDF, Old Bardana PDF & Combined Bardana PDF
// ============================================================================

export async function exportBardanaCategorizedPDF(
  records: BardanaReceivedRecord[],
  settings: MandiSettings,
  type: 'NEW' | 'OLD' | 'COMBINED',
  filterDate?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277 mm

  const columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { label: 'Entry No', width: 22, align: 'center' },
    { label: 'Date', width: 22, align: 'center' },
    { label: 'Agency / ਏਜੰਸੀ', width: 32, align: 'left' },
    { label: 'Source / ਭੇਜਣ ਵਾਲਾ', width: 45, align: 'left' },
    { label: 'Action / ਕਾਰਵਾਈ', width: 26, align: 'center' },
    { label: 'New Juth / ਨਵਾਂ', width: 30, align: 'right' },
    { label: 'Old Juth / ਪੁਰਾਣਾ', width: 30, align: 'right' },
    { label: 'Total Bags / ਕੁੱਲ', width: 30, align: 'right' },
    { label: 'Vehicle / Remarks', width: 40, align: 'left' }
  ];

  const rowHeight = 6.8;
  const headerHeight = 7;
  const pageCapY = pageHeight - 22;

  let titleEn = 'BARDANA REGISTER & STOCK REPORT';
  let subtitlePa = 'ਬਾਰਦਾਨਾ ਆਮਦ ਅਤੇ ਸਟਾਕ ਰਜਿਸਟਰ';
  if (type === 'NEW') {
    titleEn = 'NEW BARDANA (JUTH) REGISTER';
    subtitlePa = 'ਨਵਾਂ ਬਾਰਦਾਨਾ (ਨਵੀਂ ਜੂਠ) ਰਜਿਸਟਰ';
  } else if (type === 'OLD') {
    titleEn = 'OLD BARDANA (JUTH) REGISTER';
    subtitlePa = 'ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (ਪੁਰਾਣੀ ਜੂਠ) ਰਜਿਸਟਰ';
  }

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: `${titleEn} / ${subtitlePa}`,
    subtitle: `Type: ${type} BARDANA | Total Entries: ${records.length}`,
    badgeLabel: 'BARDANA TYPE',
    badgeValue: type,
    startY: 6
  });

  drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
  currentY += headerHeight;

  let pageNum = 1;
  const pageHolders: number[] = [1];

  let totalNew = 0;
  let totalOld = 0;
  let totalAll = 0;

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  records.forEach((b, idx) => {
    const newBags = Number(b.newBags) || 0;
    const oldBags = Number(b.oldBags) || 0;

    // Filter by type if specific
    if (type === 'NEW' && newBags === 0 && b.bardanaType === 'OLD') return;
    if (type === 'OLD' && oldBags === 0 && b.bardanaType === 'NEW') return;

    const sumThis = newBags + oldBags;
    totalNew += newBags;
    totalOld += oldBags;
    totalAll += sumThis;

    const values: DataRowCell[] = [
      { text: cleanPdfText(b.id), align: 'center', w: 22 },
      { text: cleanPdfText(b.date), align: 'center', w: 22 },
      { text: cleanPdfText(b.agency), align: 'left', w: 32 },
      { text: cleanPdfText(b.sourceName || '-'), align: 'left', w: 45 },
      { text: b.actionType === 'GIVE' ? 'Issued' : 'Received', align: 'center', w: 26 },
      { text: `${newBags}`, align: 'right', w: 30 },
      { text: `${oldBags}`, align: 'right', w: 30 },
      { text: `${sumThis}`, align: 'right', w: 30 },
      { text: cleanPdfText((b as any).vehicleNumber || (b as any).truckNo || b.remarks || '-'), align: 'left', w: 40 }
    ];

    const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, rowHeight);

    if (currentY + thisRowH > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
      drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
      currentY += headerHeight;
    }

    const isEven = idx % 2 === 0;
    renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
    currentY += thisRowH;
  });

  // Grand Total Row
  if (currentY + 8 > pageCapY) {
    doc.addPage();
    pageNum++;
    pageHolders.push(pageNum);
    currentY = 12;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7.5, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, 7.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  doc.text('TOTAL BARDANA / ਕੁੱਲ ਜੋੜ:', margin + 4, currentY + 5);
  doc.text(`${totalNew} Bags`, margin + 22 + 22 + 32 + 45 + 26 + 30 - 2, currentY + 5, { align: 'right' });
  doc.text(`${totalOld} Bags`, margin + 22 + 22 + 32 + 45 + 26 + 30 + 30 - 2, currentY + 5, { align: 'right' });
  doc.text(`${totalAll} Bags`, margin + 22 + 22 + 32 + 45 + 26 + 30 + 30 + 30 - 2, currentY + 5, { align: 'right' });

  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, `${type} Bardana Register`);
  }

  doc.save(`Bardana_${type}_Report_${Date.now()}.pdf`);
}

// ============================================================================
// 6. STOCK BALANCE / ਸਟਾਕ ਬੈਲੈਂਸ ਰਿਪੋਰਟ
// Tola, Purchase, Lefting, Bardana, or Full Stock Balance PDF
// ============================================================================

export async function exportStockBalanceCategoryPDF(
  category: 'TOLA' | 'PURCHASE' | 'LEFTING' | 'BARDANA' | 'FULL',
  options: StockLedgerExportOptions
) {
  if (category === 'FULL') {
    await exportStockLedgerPDF(options);
    return;
  }

  // Filter sections down to the requested category
  const filteredSections = options.sections.filter((sec) => {
    const title = sec.categoryTitleEn.toUpperCase();
    if (category === 'TOLA') return title.includes('TOLA') || title.includes('WEIGH');
    if (category === 'PURCHASE') return title.includes('PURCHASE') || title.includes('AGENCY');
    if (category === 'LEFTING') return title.includes('LEFTING') || title.includes('DISPATCH');
    if (category === 'BARDANA') return title.includes('BARDANA');
    return true;
  });

  const specificOptions: StockLedgerExportOptions = {
    ...options,
    filterCategoryLabel: `${category} BALANCE / ${category} ਬੈਲੈਂਸ`,
    sections: filteredSections
  };

  await exportStockLedgerPDF(specificOptions);
}

// ============================================================================
// 7. FARMER REGISTER / ਕਿਸਾਨ ਰਜਿਸਟਰ
// Complete Farmer List PDF
// ============================================================================

export async function exportFarmerRegisterPDF(
  farmers: Farmer[],
  settings: MandiSettings,
  filterVillage?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277 mm

  const columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { label: 'Sr No', width: 12, align: 'center' },
    { label: 'Farmer ID', width: 22, align: 'center' },
    { label: 'Farmer Name / ਕਿਸਾਨ', width: 44, align: 'left' },
    { label: 'Father Name / ਪਿਤਾ', width: 38, align: 'left' },
    { label: 'Village / ਪਿੰਡ', width: 34, align: 'left' },
    { label: 'Mobile / ਫ਼ੋਨ', width: 26, align: 'center' },
    { label: 'Aadhaar / ਆਧਾਰ', width: 28, align: 'center' },
    { label: 'Bank Account / ਖਾਤਾ ਨੰਬਰ', width: 38, align: 'left' },
    { label: 'IFSC / ਬੈਂਕ', width: 35, align: 'left' }
  ];

  const rowHeight = 6.8;
  const headerHeight = 7;
  const pageCapY = pageHeight - 22;

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'OFFICIAL FARMER MASTER REGISTER / ਕਿਸਾਨ ਮਾਸਟਰ ਰਜਿਸਟਰ',
    subtitle: `Village Filter: ${cleanPdfText(filterVillage || 'All Villages')} | Total Registered Farmers: ${farmers.length}`,
    badgeLabel: 'MASTER REGISTER',
    badgeValue: 'FARMER LIST',
    startY: 6
  });

  drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
  currentY += headerHeight;

  let pageNum = 1;
  const pageHolders: number[] = [1];

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  farmers.forEach((f, idx) => {
    const values: DataRowCell[] = [
      { text: `${idx + 1}`, align: 'center', w: 12 },
      { text: f.id, align: 'center', w: 22 },
      { text: `${cleanPdfText(f.farmerName)} ${f.farmerNamePa ? `(${cleanPdfText(f.farmerNamePa)})` : ''}`, align: 'left', w: 44 },
      { text: cleanPdfText(f.fatherName || '-'), align: 'left', w: 38 },
      { text: `${cleanPdfText(f.village)} ${f.villagePa ? `(${cleanPdfText(f.villagePa)})` : ''}`, align: 'left', w: 34 },
      { text: cleanPdfText(f.mobile), align: 'center', w: 26 },
      { text: cleanPdfText(f.aadhaar ? `•••• ${f.aadhaar.slice(-4)}` : '-'), align: 'center', w: 28 },
      { text: cleanPdfText(f.bankDetails?.accountNumber || '-'), align: 'left', w: 38 },
      { text: `${cleanPdfText(f.bankDetails?.ifscCode || '-')} ${f.bankDetails?.bankName ? `(${cleanPdfText(f.bankDetails.bankName)})` : ''}`, align: 'left', w: 35 }
    ];

    const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, rowHeight);

    if (currentY + thisRowH > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
      drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
      currentY += headerHeight;
    }

    const isEven = idx % 2 === 0;
    renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
    currentY += thisRowH;
  });

  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, 'Farmer Master Register');
  }

  doc.save(`Farmer_Register_Complete_${Date.now()}.pdf`);
}

// ============================================================================
// 8. ADVANCE PAYMENT & INTEREST / ਅਡਵਾਂਸ ਪੇਮੈਂਟ ਅਤੇ ਵਿਆਜ
// Farmer-wise, Date-wise, Full Register PDF
// ============================================================================

export async function exportAdvanceInterestPDF(
  advances: FarmerAdvanceRecord[],
  settings: MandiSettings,
  mode: 'FARMER_WISE' | 'DATE_WISE' | 'FULL_REGISTER',
  filterLabel?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277 mm

  const columns: { label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { label: 'Adv ID', width: 20, align: 'center' },
    { label: 'Adv Date', width: 22, align: 'center' },
    { label: 'Farmer / ਕਿਸਾਨ', width: 45, align: 'left' },
    { label: 'Principal (₹)', width: 28, align: 'right' },
    { label: 'Int Till Date', width: 24, align: 'center' },
    { label: 'Period (Days/Mo)', width: 32, align: 'center' },
    { label: 'Rate (%)', width: 18, align: 'right' },
    { label: 'Interest (₹)', width: 26, align: 'right' },
    { label: 'Total Payable (₹)', width: 30, align: 'right' },
    { label: 'Remarks', width: 32, align: 'left' }
  ];

  const rowHeight = 6.8;
  const headerHeight = 7;
  const pageCapY = pageHeight - 22;

  let titleEn = 'ADVANCE PAYMENT & INTEREST REGISTER';
  let subtitlePa = 'ਅਡਵਾਂਸ ਪੇਮੈਂਟ ਅਤੇ ਵਿਆਜ ਲੇਖਾ ਰਜਿਸਟਰ';
  if (mode === 'FARMER_WISE') {
    titleEn = `FARMER ADVANCE STATEMENT - ${filterLabel || ''}`;
    subtitlePa = `ਕਿਸਾਨ ਅਡਵਾਂਸ ਤੇ ਵਿਆਜ ਸਟੇਟਮੈਂਟ - ${cleanPdfText(filterLabel || '')}`;
  } else if (mode === 'DATE_WISE') {
    titleEn = `ADVANCES DATE-WISE REPORT - ${filterLabel || ''}`;
    subtitlePa = `ਮਿਤੀ-ਵਾਰ ਅਡਵਾਂਸ ਲੇਖਾ ਰਿਪੋਰਟ - ${cleanPdfText(filterLabel || '')}`;
  }

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: `${titleEn} / ${subtitlePa}`,
    subtitle: `Filter: ${cleanPdfText(filterLabel || 'All Records')} | Entries: ${advances.length}`,
    badgeLabel: 'REPORT TYPE',
    badgeValue: mode.replace('_', ' '),
    startY: 6
  });

  drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
  currentY += headerHeight;

  let pageNum = 1;
  const pageHolders: number[] = [1];

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalPayable = 0;

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  advances.forEach((adv, idx) => {
    const principal = Number(adv.amount) || 0;
    const interest = Number(adv.interestAmount) || 0;
    const payable = Number(adv.totalPayableWithInterest) || (principal + interest);

    totalPrincipal += principal;
    totalInterest += interest;
    totalPayable += payable;

    const periodStr = `${adv.totalDays || 0} D (${adv.monthsElapsed || 0} M, ${adv.daysElapsed || 0} D)`;

    const values: DataRowCell[] = [
      { text: cleanPdfText(adv.id), align: 'center', w: 20 },
      { text: cleanPdfText(adv.date), align: 'center', w: 22 },
      { text: cleanPdfText(adv.farmerName || adv.farmerId), align: 'left', w: 45 },
      { text: Math.round(principal).toLocaleString('en-IN'), align: 'right', w: 28 },
      { text: cleanPdfText(adv.interestTillDate || '-'), align: 'center', w: 24 },
      { text: periodStr, align: 'center', w: 32 },
      { text: `${adv.monthlyInterestRate}% /mo`, align: 'right', w: 18 },
      { text: Math.round(interest).toLocaleString('en-IN'), align: 'right', w: 26 },
      { text: Math.round(payable).toLocaleString('en-IN'), align: 'right', w: 30 },
      { text: cleanPdfText(adv.remarks || '-'), align: 'left', w: 32 }
    ];

    const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, rowHeight);

    if (currentY + thisRowH > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
      drawTableHeaderRow(doc, columns, margin, currentY, headerHeight);
      currentY += headerHeight;
    }

    const isEven = idx % 2 === 0;
    renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
    currentY += thisRowH;
  });

  // Grand Total Row
  if (currentY + 8 > pageCapY) {
    doc.addPage();
    pageNum++;
    pageHolders.push(pageNum);
    currentY = 12;
  }

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 7.5, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.rect(margin, currentY, contentWidth, 7.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  doc.text('TOTAL ADVANCES / ਕੁੱਲ ਜੋੜ:', margin + 4, currentY + 5);
  doc.text(`Rs. ${Math.round(totalPrincipal).toLocaleString('en-IN')}`, margin + 20 + 22 + 45 + 28 - 2, currentY + 5, { align: 'right' });
  doc.text(`Rs. ${Math.round(totalInterest).toLocaleString('en-IN')}`, margin + 20 + 22 + 45 + 28 + 24 + 32 + 18 + 26 - 2, currentY + 5, { align: 'right' });
  doc.text(`Rs. ${Math.round(totalPayable).toLocaleString('en-IN')}`, margin + 20 + 22 + 45 + 28 + 24 + 32 + 18 + 26 + 30 - 2, currentY + 5, { align: 'right' });

  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, 'Advance Payment & Interest Register');
  }

  doc.save(`Advance_Payment_Interest_${mode}_${Date.now()}.pdf`);
}

// ============================================================================
// 9. PAYMENT ADJUSTMENT / ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ
// Farmer-wise, Full Adjustment Register PDF
// ============================================================================

export async function exportPaymentAdjustmentPDF(
  paymentTransfers: PaymentTransferRecord[],
  sameAdjustments: SameFarmerAdjustmentRecord[],
  settings: MandiSettings,
  mode: 'FARMER_WISE' | 'FULL_REGISTER',
  selectedFarmerId?: string,
  selectedFarmerName?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186 mm

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'PAYMENT ADJUSTMENT & TRANSFER REGISTER / ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ ਲੇਖਾ',
    subtitle: mode === 'FARMER_WISE'
      ? `Farmer: ${cleanPdfText(selectedFarmerName || selectedFarmerId || '')}`
      : 'Complete Mandi Inter-Farmer Transfers and Account Re-allocations',
    badgeLabel: 'ADJUSTMENT TYPE',
    badgeValue: mode === 'FARMER_WISE' ? 'FARMER-WISE' : 'FULL REGISTER',
    startY: 6
  });

  // Filter if farmer-wise
  const filteredTransfers = mode === 'FARMER_WISE' && selectedFarmerId && selectedFarmerId !== 'ALL'
    ? paymentTransfers.filter((t) => t.fromFarmerId === selectedFarmerId || t.toFarmerId === selectedFarmerId)
    : paymentTransfers;

  const filteredSameAdjustments = mode === 'FARMER_WISE' && selectedFarmerId && selectedFarmerId !== 'ALL'
    ? sameAdjustments.filter((a) => a.farmerId === selectedFarmerId)
    : sameAdjustments;

  // SECTION 1: Inter-Farmer Payment Transfers
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('A. INTER-FARMER PAYMENT TRANSFERS / ਕਿਸਾਨ ਤੋਂ ਕਿਸਾਨ ਪੇਮੈਂਟ ਟ੍ਰਾਂਸਫਰ', margin + 3, currentY + 5);

  currentY += 8;

  const ptColumns = [
    { label: 'Transfer ID', width: 22, align: 'center' as const },
    { label: 'Date', width: 22, align: 'center' as const },
    { label: 'From Farmer (ਕਟੌਤੀ −)', width: 44, align: 'left' as const },
    { label: 'To Farmer (ਜਮ੍ਹਾਂ +)', width: 44, align: 'left' as const },
    { label: 'Amount (₹)', width: 26, align: 'right' as const },
    { label: 'Reason / ਵੇਰਵਾ', width: 28, align: 'left' as const }
  ];

  drawTableHeaderRow(doc, ptColumns, margin, currentY, 6.5);
  currentY += 6.5;

  let totalTransferAmount = 0;

  if (filteredTransfers.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, contentWidth, 7, 'S');
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No payment transfers recorded / ਕੋਈ ਟ੍ਰਾਂਸਫਰ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ', margin + contentWidth / 2, currentY + 4.8, { align: 'center' });
    currentY += 9;
  } else {
    filteredTransfers.forEach((t, idx) => {
      totalTransferAmount += t.amount;

      const values: DataRowCell[] = [
        { text: cleanPdfText(t.id), align: 'center', w: 22 },
        { text: cleanPdfText(t.date), align: 'center', w: 22 },
        { text: cleanPdfText(t.fromFarmerName), align: 'left', w: 44 },
        { text: cleanPdfText(t.toFarmerName), align: 'left', w: 44 },
        { text: Math.round(t.amount).toLocaleString('en-IN'), align: 'right', w: 26 },
        { text: cleanPdfText(t.reason || '-'), align: 'left', w: 28 }
      ];

      const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, 6.5);
      if (currentY + thisRowH > 275) {
        doc.addPage();
        currentY = 12;
        drawTableHeaderRow(doc, ptColumns, margin, currentY, 6.5);
        currentY += 6.5;
      }

      const isEven = idx % 2 === 0;
      renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
      currentY += thisRowH;
    });

    // Total Transfer Row
    if (currentY + 7 > 275) {
      doc.addPage();
      currentY = 12;
    }
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.rect(margin, currentY, contentWidth, 7, 'S');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.text('Total Transfers:', margin + 4, currentY + 4.8);
    doc.text(`Rs. ${Math.round(totalTransferAmount).toLocaleString('en-IN')}`, margin + 22 + 22 + 44 + 44 + 26 - 2, currentY + 4.8, { align: 'right' });
    currentY += 10;
  }

  // SECTION 2: Same Farmer Account Adjustments
  if (currentY + 20 > 275) {
    doc.addPage();
    currentY = 12;
  }
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setFont(fontName, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('B. SAME FARMER ACCOUNT ADJUSTMENTS / ਇੱਕੋ ਕਿਸਾਨ ਦੇ ਖਾਤੇ ਦੀ ਐਡਜਸਟਮੈਂਟ', margin + 3, currentY + 5);

  currentY += 8;

  const sfaColumns = [
    { label: 'Adj ID', width: 22, align: 'center' as const },
    { label: 'Date', width: 22, align: 'center' as const },
    { label: 'Farmer Name / ਕਿਸਾਨ', width: 44, align: 'left' as const },
    { label: 'Adjustment Type / ਕਿਸਮ', width: 42, align: 'left' as const },
    { label: 'Amount (₹)', width: 26, align: 'right' as const },
    { label: 'Remarks / ਕਾਰਨ', width: 30, align: 'left' as const }
  ];

  drawTableHeaderRow(doc, sfaColumns, margin, currentY, 6.5);
  currentY += 6.5;

  let totalSameAdjustments = 0;

  if (filteredSameAdjustments.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, contentWidth, 7, 'S');
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No internal adjustments recorded / ਕੋਈ ਅੰਦਰੂਨੀ ਐਡਜਸਟਮੈਂਟ ਨਹੀਂ', margin + contentWidth / 2, currentY + 4.8, { align: 'center' });
    currentY += 9;
  } else {
    filteredSameAdjustments.forEach((a, idx) => {
      totalSameAdjustments += a.amount;

      const values: DataRowCell[] = [
        { text: cleanPdfText(a.id), align: 'center', w: 22 },
        { text: cleanPdfText(a.date), align: 'center', w: 22 },
        { text: cleanPdfText(a.farmerName), align: 'left', w: 44 },
        { text: cleanPdfText(a.typeLabelEn || a.type), align: 'left', w: 42 },
        { text: Math.round(a.amount).toLocaleString('en-IN'), align: 'right', w: 26 },
        { text: cleanPdfText(a.reason || '-'), align: 'left', w: 30 }
      ];

      const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, 6.5);
      if (currentY + thisRowH > 275) {
        doc.addPage();
        currentY = 12;
        drawTableHeaderRow(doc, sfaColumns, margin, currentY, 6.5);
        currentY += 6.5;
      }

      const isEven = idx % 2 === 0;
      renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
      currentY += thisRowH;
    });

    // Total Same Adjustments Row
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.rect(margin, currentY, contentWidth, 7, 'S');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.text('Total Adjustments:', margin + 4, currentY + 4.8);
    doc.text(`Rs. ${Math.round(totalSameAdjustments).toLocaleString('en-IN')}`, margin + 22 + 22 + 44 + 42 + 26 - 2, currentY + 4.8, { align: 'right' });
    currentY += 10;
  }

  drawA4PageFooter(doc, 1, 1, margin, pageWidth, pageHeight, 'Payment Adjustment Register');
  doc.save(`Payment_Adjustment_${mode}_${Date.now()}.pdf`);
}

// ============================================================================
// 10. BAG TRANSFER / ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ
// Farmer-wise, Full Transfer Register PDF
// ============================================================================

export async function exportBagTransferPDF(
  bagTransfers: BagTransferRecord[],
  settings: MandiSettings,
  mode: 'FARMER_WISE' | 'FULL_REGISTER',
  selectedFarmerId?: string,
  selectedFarmerName?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186 mm

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'INTER-FARMER BAG TRANSFER REGISTER / ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ ਰਜਿਸਟਰ',
    subtitle: mode === 'FARMER_WISE'
      ? `Farmer: ${cleanPdfText(selectedFarmerName || selectedFarmerId || '')}`
      : 'Transfer of Remaining Paddy Bags Quota Between Farmer Accounts',
    badgeLabel: 'BAG TRANSFER',
    badgeValue: mode === 'FARMER_WISE' ? 'FARMER-WISE' : 'FULL REGISTER',
    startY: 6
  });

  const filtered = mode === 'FARMER_WISE' && selectedFarmerId && selectedFarmerId !== 'ALL'
    ? bagTransfers.filter((b) => b.fromFarmerId === selectedFarmerId || b.toFarmerId === selectedFarmerId)
    : bagTransfers;

  const columns = [
    { label: 'Transfer ID', width: 24, align: 'center' as const },
    { label: 'Date', width: 24, align: 'center' as const },
    { label: 'From Farmer (ਕਟੌਤੀ −)', width: 44, align: 'left' as const },
    { label: 'To Farmer (ਜਮ੍ਹਾਂ +)', width: 44, align: 'left' as const },
    { label: 'Bags / ਬੋਰੀ', width: 22, align: 'right' as const },
    { label: 'Reason / ਕਾਰਨ', width: 28, align: 'left' as const }
  ];

  drawTableHeaderRow(doc, columns, margin, currentY, 7);
  currentY += 7;

  let totalBags = 0;
  let pageNum = 1;
  const pageHolders: number[] = [1];
  const pageCapY = pageHeight - 16;

  if (filtered.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, contentWidth, 7.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, currentY, contentWidth, 7.5, 'S');
    doc.setFont(fontName, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No bag transfers recorded / ਕੋਈ ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ ਨਹੀਂ ਮਿਲੀ', margin + contentWidth / 2, currentY + 5, { align: 'center' });
    currentY += 10;
  } else {
    filtered.forEach((b, idx) => {
      totalBags += b.bags;

      const values: DataRowCell[] = [
        { text: cleanPdfText(b.id), align: 'center', w: 24 },
        { text: cleanPdfText(b.date), align: 'center', w: 24 },
        { text: cleanPdfText(b.fromFarmerName), align: 'left', w: 44 },
        { text: cleanPdfText(b.toFarmerName), align: 'left', w: 44 },
        { text: `${b.bags}`, align: 'right', w: 22 },
        { text: cleanPdfText(b.reason || '-'), align: 'left', w: 28 }
      ];

      const { rowHeight: thisRowH, cellLines } = calculateDataRowHeight(doc, values, fontName, 6.8);

      if (currentY + thisRowH > pageCapY) {
        doc.addPage();
        pageNum++;
        pageHolders.push(pageNum);
        currentY = 12;
        drawTableHeaderRow(doc, columns, margin, currentY, 7);
        currentY += 7;
      }

      const isEven = idx % 2 === 0;
      renderTableDataRow(doc, values, cellLines, margin, currentY, thisRowH, isEven, fontName);
      currentY += thisRowH;
    });

    // Grand Total Row
    if (currentY + 8 > pageCapY) {
      doc.addPage();
      pageNum++;
      pageHolders.push(pageNum);
      currentY = 12;
    }
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7.5, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.rect(margin, currentY, contentWidth, 7.5, 'S');
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.text('Total Transferred Bags / ਕੁੱਲ ਬੋਰੀਆਂ:', margin + 4, currentY + 5);
    doc.text(`${totalBags} Bags`, margin + 24 + 24 + 44 + 44 + 22 - 2, currentY + 5, { align: 'right' });
    currentY += 10;
  }

  const totalPages = pageHolders.length;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawA4PageFooter(doc, p, totalPages, margin, pageWidth, pageHeight, 'Bag Transfer Register');
  }
  doc.save(`Bag_Transfer_${mode}_${Date.now()}.pdf`);
}

// ============================================================================
// COMBINED PDF / ਸਾਰੀਆਂ ਰਿਪੋਰਟਾਂ ਇੱਕ PDF
// Generates unified multi-report ledger ONLY when explicitly requested
// ============================================================================

export interface CombinedReportsData {
  settings: MandiSettings;
  farmers: Farmer[];
  summaries: FarmerAccountSummary[];
  arrivals: BagsEntryRecord[];
  purchases: DailyPurchaseRecord[];
  leftings: LeftingRecord[];
  bardana: BardanaReceivedRecord[];
  advances: FarmerAdvanceRecord[];
  transfers: PaymentTransferRecord[];
  sameAdjustments: SameFarmerAdjustmentRecord[];
  bagTransfers: BagTransferRecord[];
}

export async function exportCombinedAllReportsPDF(data: CombinedReportsData) {
  const {
    settings,
    farmers,
    summaries,
    arrivals,
    purchases,
    leftings,
    bardana,
    advances,
    transfers,
    bagTransfers
  } = data;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerGurmukhiFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  // COVER / INDEX PAGE
  renderStandardPdfHeader({
    doc,
    settings,
    title: 'COMPREHENSIVE MANDI MASTER LEDGER & ALL REPORTS BOOK',
    subtitle: 'ਸਾਰੀਆਂ ਰਿਪੋਰਟਾਂ ਅਤੇ ਰਜਿਸਟਰਾਂ ਦੀ ਸਾਂਝੀ ਪੁਸਤਕ (Unified Multi-Report Master PDF)',
    badgeLabel: 'MASTER BOOK',
    badgeValue: 'ALL 10 REPORTS',
    startY: 8
  });

  let indexY = 58;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, indexY, contentWidth, 130, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, indexY, contentWidth, 130, 3, 3, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('TABLE OF CONTENTS / ਰਿਪੋਰਟਾਂ ਦੀ ਸੂਚੀ', margin + 8, indexY + 12);

  const reportItems = [
    { title: '1. Farmer Account Summary / ਕਿਸਾਨ ਖਾਤਾ ਸੰਖੇਪ', count: `${summaries.length} Accounts` },
    { title: '2. Mandi Arrival (Tola) Register / ਮੰਡੀ ਆਮਦ (ਤੋਲ) ਰਜਿਸਟਰ', count: `${arrivals.length} Weighments` },
    { title: '3. Daily Purchase Register / ਰੋਜ਼ਾਨਾ ਖਰੀਦ ਤੇ ਮਾਰਕੀਟ ਕਮੇਟੀ ਰਜਿਸਟਰ', count: `${purchases.length} Vouchers` },
    { title: '4. Lefting & Sheller Dispatch / ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ ਤੇ ਗੱਡੀ ਰਵਾਨਗੀ', count: `${leftings.length} Dispatches` },
    { title: '5. Bardana Stock Register / ਬਾਰਦਾਨਾ ਆਮਦ ਤੇ ਸਟਾਕ ਰਜਿਸਟਰ', count: `${bardana.length} Entries` },
    { title: '6. Stock Balance Accounting / ਸਟਾਕ ਬੈਲੈਂਸ ਚਾਰਟ ਤੇ ਲੇਖਾ', count: '4 Categories Verified' },
    { title: '7. Farmer Master Register / ਕਿਸਾਨ ਮਾਸਟਰ ਰਜਿਸਟਰ', count: `${farmers.length} Farmers` },
    { title: '8. Advance & Interest Register / ਅਡਵਾਂਸ ਪੇਮੈਂਟ ਤੇ ਵਿਆਜ ਰਜਿਸਟਰ', count: `${advances.length} Advances` },
    { title: '9. Payment Adjustment & Transfers / ਪੇਮੈਂਟ ਐਡਜਸਟਮੈਂਟ ਤੇ ਟ੍ਰਾਂਸਫਰ', count: `${transfers.length} Transfers` },
    { title: '10. Bag Quota Transfers / ਬੋਰੀ ਟ੍ਰਾਂਸਫਰ ਰਜਿਸਟਰ', count: `${bagTransfers.length} Transfers` }
  ];

  doc.setFont(fontName, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  reportItems.forEach((item, idx) => {
    const rowY = indexY + 24 + idx * 10;
    doc.text(item.title, margin + 10, rowY);
    doc.setFont(fontName, 'bold');
    doc.text(item.count, margin + contentWidth - 12, rowY, { align: 'right' });
    doc.setFont(fontName, 'normal');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 10, rowY + 3, margin + contentWidth - 10, rowY + 3);
  });

  drawA4PageFooter(doc, 1, 2, margin, pageWidth, pageHeight, 'Master Combined Book');

  // Page 2: Summary Snapshot of All Modules
  doc.addPage();
  renderStandardPdfHeader({
    doc,
    settings,
    title: 'SEASON AUDIT SNAPSHOT / ਸੀਜ਼ਨ ਦਾ ਕੁੱਲ ਲੇਖਾ-ਜੋਖਾ',
    subtitle: `Generated: ${new Date().toLocaleDateString('en-GB')}`,
    startY: 8
  });

  let snapY = 56;
  const totArrBags = arrivals.reduce((s, a) => s + a.bags, 0);
  const totArrKg = arrivals.reduce((s, a) => s + a.grandTotalKg, 0);
  const totPurchBags = purchases.reduce((s, p) => s + (Number(p.bags) || 0), 0);
  const totPurchAmt = purchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
  const totLiftBags = leftings.reduce((s, l) => s + (Number(l.bags) || 0), 0);
  const totAdvAmt = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0);

  const snapCards = [
    { title: 'Total Mandi Arrival', val: `${totArrBags.toLocaleString()} Bags (${formatKgToQulKg(totArrKg).qtl} Qtl)` },
    { title: 'Total Purchased', val: `${totPurchBags.toLocaleString()} Bags (Rs. ${Math.round(totPurchAmt).toLocaleString('en-IN')})` },
    { title: 'Total Lefted/Dispatched', val: `${totLiftBags.toLocaleString()} Bags Dispatched` },
    { title: 'Total Advances Given', val: `Rs. ${Math.round(totAdvAmt).toLocaleString('en-IN')}` }
  ];

  const cardW = (contentWidth - 9) / 2;
  snapCards.forEach((c, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = margin + col * (cardW + 9);
    const y = snapY + row * 34;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 28, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, cardW, 28, 2, 2, 'S');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.title, x + 5, y + 8);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(c.val, x + 5, y + 19);
  });

  drawA4PageFooter(doc, 2, 2, margin, pageWidth, pageHeight, 'Master Combined Book');

  doc.save(`Mandi_All_Reports_Combined_Book_${Date.now()}.pdf`);
}
