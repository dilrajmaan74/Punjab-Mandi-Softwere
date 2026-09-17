import { jsPDF } from 'jspdf';
import { MandiSettings } from '../types/mandi';
import { cleanPdfText } from './translations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';
import { registerGurmukhiFont } from './gurmukhiPdfFont';

export interface StockLedgerRowPdf {
  sourceType: string;
  totalQty: number;
  totalQtyStr: string;
  usedType: string;
  usedQty: number;
  usedQtyStr: string;
  balance: number;
  balanceStr: string;
  statusDesc: string;
}

export interface StockLedgerSectionPdf {
  categoryTitleEn: string;
  categoryTitlePa: string;
  totalStockStr: string;
  rows: StockLedgerRowPdf[];
}

export interface StockLedgerExportOptions {
  settings: MandiSettings;
  filterDateLabel: string;
  filterAgencyLabel: string;
  filterCategoryLabel: string;
  filterPartyLabel: string;
  summary: {
    totalTolaBags: number;
    totalPurchaseBags: number;
    totalBardanaBags: number;
    totalLeftingBags: number;
  };
  sections: StockLedgerSectionPdf[];
}

/**
 * Generate official A4 Stock Balance Accounting Ledger PDF
 * Follows strict Munim / Mandi Ledger structure: TOTAL -> TRANSACTION/USED -> BALANCE
 */
export async function exportStockLedgerPDF(options: StockLedgerExportOptions) {
  const {
    settings,
    filterDateLabel,
    filterAgencyLabel,
    filterCategoryLabel,
    filterPartyLabel,
    summary,
    sections
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  registerGurmukhiFont(doc);

  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // 1. Standard Header
  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'STOCK BALANCE LEDGER / MANDI STOCK SHEET',
    subtitle: `Every Stock Category Separate Balance | Generated: ${new Date().toLocaleDateString('en-GB')}`,
    badgeLabel: 'LEDGER TYPE',
    badgeValue: 'SEPARATE BALANCE',
    agencyName: filterAgencyLabel !== 'All Agencies' ? filterAgencyLabel : undefined,
    startY: 6
  });

  // 2. Active Filters Ribbon
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  const filterText = `Date: ${cleanPdfText(filterDateLabel)}   |   Category: ${cleanPdfText(filterCategoryLabel)}   |   Agency: ${cleanPdfText(filterAgencyLabel)}   |   Party: ${cleanPdfText(filterPartyLabel)}`;
  doc.text(filterText, margin + 4, currentY + 7.5);

  currentY += 15;

  // 3. 4-Category Master Totals Ribbon
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 10, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, currentY, contentWidth, 10, 'S');

  doc.setFont(fontName, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const quarter = contentWidth / 4;
  doc.text(`TOLA: ${summary.totalTolaBags.toLocaleString()} Bags`, margin + 3, currentY + 6.5);
  doc.text(`PURCHASE: ${summary.totalPurchaseBags.toLocaleString()} Bags`, margin + quarter + 3, currentY + 6.5);
  doc.text(`BARDANA: ${summary.totalBardanaBags.toLocaleString()} Bags`, margin + quarter * 2 + 3, currentY + 6.5);
  doc.text(`LEFTING: ${summary.totalLeftingBags.toLocaleString()} Bags`, margin + quarter * 3 + 3, currentY + 6.5);

  currentY += 14;

  // 4. Render Each Category Ledger Section
  sections.forEach((sec, sIdx) => {
    // Check if new page needed
    if (currentY + 45 > pageHeight - 20) {
      doc.addPage();
      currentY = 15;
    }

    // Section Title Banner
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(margin, currentY, contentWidth, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8.5);

    const titleStr = `${sIdx + 1}. ${sec.categoryTitleEn.toUpperCase()}${sec.categoryTitlePa ? ` / ${sec.categoryTitlePa}` : ''} - TOTAL STOCK: ${sec.totalStockStr}`;
    doc.text(titleStr, margin + 4, currentY + 5.2);

    currentY += 7.5;

    // Table Column Header
    const colWidths = {
      source: 32,
      total: 26,
      usedName: 34,
      usedQty: 26,
      balance: 30,
      status: contentWidth - (32 + 26 + 34 + 26 + 30)
    };

    doc.setFillColor(226, 232, 240); // Slate-200
    doc.rect(margin, currentY, contentWidth, 6.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, currentY, contentWidth, 6.5, 'S');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    let x = margin + 2;
    doc.text('SOURCE / ਸਰੋਤ', x, currentY + 4.5);
    x += colWidths.source;
    doc.text('TOTAL / ਕੁੱਲ', x, currentY + 4.5);
    x += colWidths.total;
    doc.text('USED / ਵਰਤੀ', x, currentY + 4.5);
    x += colWidths.usedName;
    doc.text('DEDUCTED / ਕਟੌਤੀ', x, currentY + 4.5);
    x += colWidths.usedQty;
    doc.text('BALANCE / ਬਕਾਇਆ', x, currentY + 4.5);
    x += colWidths.balance;
    doc.text('STATUS / ਸਥਿਤੀ', x, currentY + 4.5);

    currentY += 6.5;

    // Table Data Rows
    sec.rows.forEach((row, rIdx) => {
      if (currentY + 12 > pageHeight - 20) {
        doc.addPage();
        currentY = 15;
      }

      const isEven = rIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, currentY, contentWidth, 7, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, currentY + 7, margin + contentWidth, currentY + 7);

      doc.setFont(fontName, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);

      let rowX = margin + 2;
      doc.text(cleanPdfText(row.sourceType), rowX, currentY + 4.8);

      rowX += colWidths.source;
      doc.setFont(fontName, 'bold');
      doc.text(cleanPdfText(row.totalQtyStr), rowX, currentY + 4.8);

      rowX += colWidths.total;
      doc.setFont(fontName, 'normal');
      doc.text(cleanPdfText(row.usedType), rowX, currentY + 4.8);

      rowX += colWidths.usedName;
      doc.text(cleanPdfText(row.usedQtyStr), rowX, currentY + 4.8);

      rowX += colWidths.usedQty;
      // Balance formatting: negative clearly marked
      if (row.balance < 0) {
        doc.setFont(fontName, 'bold');
        doc.setTextColor(185, 28, 28); // Bold Red
        doc.text(`${row.balance.toLocaleString('en-IN')} Bags`, rowX, currentY + 4.8);
      } else {
        doc.setFont(fontName, 'bold');
        doc.setTextColor(15, 23, 42); // Bold Black/Slate
        doc.text(`+${row.balance.toLocaleString('en-IN')} Bags`, rowX, currentY + 4.8);
      }

      rowX += colWidths.balance;
      doc.setFont(fontName, 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(cleanPdfText(row.statusDesc), rowX, currentY + 4.8);

      currentY += 7;
    });

    currentY += 5; // spacing between sections
  });

  // Footer Signatures
  if (currentY + 22 > pageHeight - 15) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 6;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, margin + 50, currentY);
  doc.line(pageWidth - margin - 50, currentY, pageWidth - margin, currentY);

  doc.setFont(fontName, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Munim / Accountant Signature', margin + 4, currentY + 5);
  doc.text('Authorized Partner / Arhtiya', pageWidth - margin - 48, currentY + 5);

  // Download PDF
  const filename = `Stock_Balance_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
