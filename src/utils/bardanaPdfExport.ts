import { jsPDF } from 'jspdf';
import { BardanaReceivedRecord, BardanaInventorySummary, MandiSettings } from '../types/mandi';
import { cleanPdfText } from './translations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';
import { registerGurmukhiFont } from './gurmukhiPdfFont';

function cleanText(text: string | number | null | undefined): string {
  return cleanPdfText(text);
}

/**
 * Generate and download an official Punjab Mandi Bardana Received Voucher PDF
 */
export async function exportBardanaReceivedVoucherPDF(
  record: BardanaReceivedRecord,
  settings: MandiSettings
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  registerGurmukhiFont(doc);
  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Standardized Firm Header
  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'OFFICIAL BARDANA RECEIVING VOUCHER',
    subtitle: `Date: ${cleanText(record.date)} | Source: ${cleanText(record.sourceName || record.receivedFrom)}`,
    badgeLabel: 'VOUCHER ID',
    badgeValue: record.id,
    agencyName: record.agency,
    startY: 8
  });

  // Receiving Details Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 80, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 80, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BARDANA RECEIVING TRANSACTION DETAILS', margin + 6, currentY + 8);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 6, currentY + 11, pageWidth - margin - 6, currentY + 11);

  const drawRow = (label: string, value: string, yPos: number, isHighlight = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 6, yPos);

    doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
    doc.setFontSize(isHighlight ? 10.5 : 9);
    if (isHighlight) {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(value, margin + 70, yPos);
  };

  let rowY = currentY + 19;
  drawRow('Receipt Date:', cleanText(record.date), rowY);
  rowY += 9;
  drawRow(
    'Bardana Received From:',
    record.receivedFrom === 'SELLER' ? 'Seller' : 'Agency',
    rowY
  );
  rowY += 9;
  const newJuthBags = record.newBags !== undefined ? record.newBags : (record.bardanaType === 'NEW' ? record.bags : 0);
  const oldJuthBags = record.oldBags !== undefined ? record.oldBags : (record.bardanaType === 'OLD' ? record.bags : 0);
  const totalBagsCount = Number((record as any).totalBags ?? record.bags ?? (newJuthBags + oldJuthBags)) || 0;
  const sellerInfo = record.sellerId ? `${cleanText(record.sourceName)} (ID: ${record.sellerId})` : cleanText(record.sourceName);

  drawRow(
    record.receivedFrom === 'SELLER' ? 'Seller Name:' : 'Agency / Source Name:',
    sellerInfo,
    rowY,
    true
  );
  rowY += 9;
  drawRow(
    'New Juth (ਨਵੀਂ ਜੂਥ):',
    `${newJuthBags.toLocaleString('en-IN')} Bags (${Math.floor(newJuthBags / 500)} Boxes, ${newJuthBags % 500} Loose)`,
    rowY
  );
  rowY += 9;
  drawRow(
    'Old Juth (ਪੁਰਾਣੀ ਜੂਥ):',
    `${oldJuthBags.toLocaleString('en-IN')} Bags (${Math.floor(oldJuthBags / 50)} Boxes, ${oldJuthBags % 50} Loose)`,
    rowY
  );
  rowY += 9;
  drawRow(
    'Total Bags Received:',
    `${totalBagsCount.toLocaleString('en-IN')} Bags`,
    rowY,
    true
  );
  rowY += 9;
  drawRow('Remarks / Notes:', cleanText(record.remarks) || '-', rowY);

  currentY += 88;

  // Capacity Formula Box
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'S');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CALCULATION BREAKDOWN:', margin + 6, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Formula: New Juth (${newJuthBags} Bags) + Old Juth (${oldJuthBags} Bags) = ${totalBagsCount.toLocaleString('en-IN')} Total Bags Added to Stock.`,
    margin + 6,
    currentY + 12
  );

  currentY += 32;

  // Signatures Section
  const sigBoxWidth = (contentWidth - 10) / 2;

  // Signature 1: Agency/Seller Handover
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 6, currentY + 20, margin + sigBoxWidth - 6, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Handed Over By (Agency / Seller Rep)', margin + 6, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Name: ${cleanText(record.sourceName)}`, margin + 6, currentY + 30);

  // Signature 2: Mandi Receiving Officer
  doc.line(margin + sigBoxWidth + 16, currentY + 20, margin + contentWidth - 6, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Received & Verified By (Mandi Operator)', margin + sigBoxWidth + 16, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Date & Time: ${cleanText(record.date)} | System Verified`, margin + sigBoxWidth + 16, currentY + 30);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by Punjab Mandi Portal | Record ID: ${record.id} | Authenticated Voucher`,
    margin,
    285
  );

  // Save PDF
  doc.save(`Bardana_Voucher_${record.id}_${cleanText(record.date).replace(/[\/\-]/g, '_')}.pdf`);
}

/**
 * Generate and download a comprehensive Bardana Receiving Register PDF
 */
export async function exportBardanaRegisterPDF(
  records: BardanaReceivedRecord[],
  summary: BardanaInventorySummary,
  settings: MandiSettings,
  filterTitle: string = 'All Records'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  registerGurmukhiFont(doc);
  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Determine actual selected purchase agency from filter or records
  let selectedAgency: string | undefined = undefined;
  const fLower = filterTitle.toLowerCase();
  if (fLower.includes('pungrain') || fLower.includes('markfed') || fLower.includes('pswc') || fLower.includes('fci') || fLower.includes('paic')) {
    selectedAgency = filterTitle.replace(/^agency:\s*/i, '').trim();
  } else {
    const recordAgencies = Array.from(new Set(records.map(r => r.agency?.trim()).filter(Boolean)));
    if (recordAgencies.length === 1) {
      selectedAgency = recordAgencies[0];
    }
  }

  // Standardized Firm Header (Landscape)
  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'BARDANA RECEIVING REGISTER & STOCK REPORT',
    subtitle: `Filter: ${cleanText(filterTitle)} | Total Entries: ${records.length}`,
    agencyName: selectedAgency,
    startY: 6
  });

  // Stock Summary Ribbon
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const colW = contentWidth / 3;
  // Box 1: New Juth
  doc.text(
    `NEW JUTH: Recv: ${summary.newBagsReceived.toLocaleString()} | Issued: ${summary.newBagsIssued.toLocaleString()} | Balance: ${summary.newBagsRemaining.toLocaleString()}`,
    margin + 4,
    currentY + 9
  );
  // Box 2: Old Juth
  doc.text(
    `OLD JUTH: Recv: ${summary.oldBagsReceived.toLocaleString()} | Issued: ${summary.oldBagsIssued.toLocaleString()} | Balance: ${summary.oldBagsRemaining.toLocaleString()}`,
    margin + colW + 4,
    currentY + 9
  );
  // Box 3: Total Stock
  doc.text(
    `TOTAL STOCK: Recv: ${summary.totalReceived.toLocaleString()} | Issued: ${summary.totalIssued.toLocaleString()} | Balance: ${summary.totalRemaining.toLocaleString()}`,
    margin + colW * 2 + 4,
    currentY + 9
  );

  currentY += 18;

  // Table Headers
  const columns = [
    { header: 'ID', width: 20 },
    { header: 'Date', width: 22 },
    { header: 'Agency', width: 40 },
    { header: 'Source / Seller', width: 52 },
    { header: 'New Juth', width: 26 },
    { header: 'Old Juth', width: 26 },
    { header: 'Total Bags', width: 28 },
    { header: 'Remarks', width: 38 }
  ];

  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  let currentX = margin + 2;
  columns.forEach((col) => {
    doc.text(col.header, currentX, currentY + 5.5);
    currentX += col.width;
  });

  currentY += 8;

  // Table Rows
  if (records.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('No Bardana Receiving records found for this selection.', margin + 10, currentY + 12);
  } else {
    records.forEach((rec, idx) => {
      if (currentY > 185) {
        doc.addPage();
        currentY = 15;
      }

      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, currentY, contentWidth, 7, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      let rowX = margin + 2;
      // ID
      doc.setFont('helvetica', 'bold');
      doc.text(cleanText(rec.id), rowX, currentY + 4.8);
      rowX += columns[0].width;

      // Date
      doc.setFont('helvetica', 'normal');
      doc.text(cleanText(rec.date), rowX, currentY + 4.8);
      rowX += columns[1].width;

      // Agency
      const agencyStr = cleanText(rec.agency);
      doc.text(agencyStr.length > 22 ? agencyStr.substring(0, 21) + '...' : agencyStr, rowX, currentY + 4.8);
      rowX += columns[2].width;

      // Source / Seller Name
      const sourceStr = rec.sellerId ? `${cleanText(rec.sourceName)} (ID: ${rec.sellerId})` : cleanText(rec.sourceName);
      doc.text(sourceStr.length > 25 ? sourceStr.substring(0, 24) + '...' : sourceStr, rowX, currentY + 4.8);
      rowX += columns[3].width;

      // New Juth Bags
      const rowNewBags = rec.newBags !== undefined ? rec.newBags : (rec.bardanaType === 'NEW' ? rec.bags : 0);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(rowNewBags > 0 ? rowNewBags.toLocaleString('en-IN') : '0', rowX, currentY + 4.8);
      rowX += columns[4].width;

      // Old Juth Bags
      const rowOldBags = rec.oldBags !== undefined ? rec.oldBags : (rec.bardanaType === 'OLD' ? rec.bags : 0);
      doc.setTextColor(217, 119, 6);
      doc.text(rowOldBags > 0 ? rowOldBags.toLocaleString('en-IN') : '0', rowX, currentY + 4.8);
      rowX += columns[5].width;

      // Total Bags
      const rowBags = Number((rec as any).totalBags ?? rec.bags ?? (rowNewBags + rowOldBags)) || 0;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(rowBags.toLocaleString('en-IN'), rowX, currentY + 4.8);
      rowX += columns[6].width;

      // Remarks
      doc.setFont('helvetica', 'normal');
      const remStr = cleanText(rec.remarks);
      doc.text(remStr ? (remStr.length > 20 ? remStr.substring(0, 19) + '...' : remStr) : '-', rowX, currentY + 4.8);

      currentY += 7;
    });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Punjab Mandi Portal | Generated on ${new Date().toLocaleDateString()}`, margin, 200);

  doc.save(`Bardana_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
}
