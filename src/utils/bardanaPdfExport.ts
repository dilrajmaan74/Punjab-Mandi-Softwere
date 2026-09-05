import { jsPDF } from 'jspdf';
import { BardanaReceivedRecord, BardanaInventorySummary, MandiSettings } from '../types/mandi';

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

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(16, 44, 38); // Forest dark green
  doc.rect(margin, 12, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.mandiNameEn.toUpperCase(), margin + 6, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${settings.marketCommitteeEn} | Punjab Mandi Board`, margin + 6, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('OFFICIAL BARDANA RECEIVING VOUCHER / ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ ਵਾਊਚਰ', margin + 6, 32);

  // Voucher ID Badge
  doc.setFillColor(245, 158, 11); // Amber
  doc.roundedRect(pageWidth - margin - 46, 16, 42, 16, 2, 2, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('VOUCHER / ID', pageWidth - margin - 44, 21);
  doc.setFontSize(11);
  doc.text(record.id, pageWidth - margin - 44, 28);

  let currentY = 42;

  // Fixed Agency Section Box
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'F');
  doc.setDrawColor(52, 211, 153);
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'S');

  doc.setTextColor(6, 78, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('AGENCY / ਏਜੰਸੀ (FIXED ALLOCATION):', margin + 6, currentY + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(record.agency || 'Punjab Mandi Board Agency', margin + 6, currentY + 14);

  currentY += 26;

  // Receiving Details Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 80, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 80, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('BARDANA RECEIVING TRANSACTION DETAILS', margin + 6, currentY + 8);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 6, currentY + 11, pageWidth - margin - 6, currentY + 11);

  const drawRow = (label: string, value: string, yPos: number, isHighlight = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 6, yPos);

    doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
    doc.setFontSize(isHighlight ? 11 : 9.5);
    if (isHighlight) {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(value, margin + 70, yPos);
  };

  let rowY = currentY + 19;
  drawRow('Receipt Date (ਮਿਤੀ):', record.date, rowY);
  rowY += 9;
  drawRow(
    'Bardana Received From (ਕਿੱਥੋਂ ਪ੍ਰਾਪਤ):',
    record.receivedFrom === 'SELLER' ? 'Seller / ਸੈਲਰ' : 'Agency / ਏਜੰਸੀ',
    rowY
  );
  rowY += 9;
  drawRow(
    record.receivedFrom === 'SELLER' ? 'Seller Name (ਸੈਲਰ ਦਾ ਨਾਂ):' : 'Agency / Source Name (ਸਰੋਤ):',
    record.sourceName,
    rowY,
    true
  );
  rowY += 9;
  drawRow(
    'Bardana Type (ਬਾਰਦਾਨਾ ਕਿਸਮ):',
    record.bardanaType === 'NEW'
      ? 'New Bag / ਨਵਾਂ ਬੋਰਾ (1 Box = 500 Bags)'
      : 'Old Bag / ਪੁਰਾਣਾ ਬੋਰਾ (1 Box = 50 Bags)',
    rowY
  );
  rowY += 9;
  drawRow('Number of Boxes (ਬਕਸਿਆਂ ਦੀ ਗਿਣਤੀ):', `${record.boxes} Boxes`, rowY);
  rowY += 9;
  drawRow(
    'Total Bags Received (ਕੁੱਲ ਬੋਰਿਆਂ ਦੀ ਗਿਣਤੀ):',
    `${record.bags.toLocaleString('en-IN')} Bags (${record.bardanaType === 'NEW' ? 'New' : 'Old'})`,
    rowY,
    true
  );
  rowY += 9;
  drawRow('Remarks / Notes (ਟਿੱਪਣੀਆਂ):', record.remarks || 'None / ਕੋਈ ਨਹੀਂ', rowY);

  currentY += 88;

  // Capacity Formula Box
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'S');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL SPECIFICATION & CALCULATION:', margin + 6, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Formula: ${record.boxes} Boxes × ${record.capacityPerBox} Bags/Box = ${record.bags.toLocaleString('en-IN')} Total Bags Added to ${record.bardanaType} Stock.`,
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
  doc.text(`Name: ${record.sourceName}`, margin + 6, currentY + 30);

  // Signature 2: Mandi Receiving Officer
  doc.line(margin + sigBoxWidth + 16, currentY + 20, margin + contentWidth - 6, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Received & Verified By (Mandi Operator)', margin + sigBoxWidth + 16, currentY + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Date & Time: ${record.date} • System Verified`, margin + sigBoxWidth + 16, currentY + 30);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by Punjab Mandi Software • Record ID: ${record.id} • Authenticated Voucher`,
    margin,
    285
  );

  // Save PDF
  doc.save(`Bardana_Voucher_${record.id}_${record.date.replace(/[\/\-]/g, '_')}.pdf`);
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(16, 44, 38);
  doc.rect(margin, 10, contentWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(settings.mandiNameEn.toUpperCase(), margin + 5, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${settings.marketCommitteeEn} | BARDANA RECEIVING REGISTER & STOCK REPORT`, margin + 5, 24);

  doc.setFont('helvetica', 'bold');
  doc.text(`Filter: ${filterTitle} • Total Entries: ${records.length}`, pageWidth - margin - 75, 24);

  let currentY = 35;

  // Stock Summary Ribbon
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  const colW = contentWidth / 3;
  // Box 1: New Bag
  doc.text(
    `NEW BAG: Recv: ${summary.newBagsReceived.toLocaleString()} | Issued: ${summary.newBagsIssued.toLocaleString()} | Balance: ${summary.newBagsRemaining.toLocaleString()}`,
    margin + 4,
    currentY + 9
  );
  // Box 2: Old Bag
  doc.text(
    `OLD BAG: Recv: ${summary.oldBagsReceived.toLocaleString()} | Issued: ${summary.oldBagsIssued.toLocaleString()} | Balance: ${summary.oldBagsRemaining.toLocaleString()}`,
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
    { header: 'ID', width: 22 },
    { header: 'Date', width: 24 },
    { header: 'Agency (ਏਜੰਸੀ)', width: 50 },
    { header: 'Source Type', width: 24 },
    { header: 'Seller / Agency Name', width: 50 },
    { header: 'Type', width: 20 },
    { header: 'Boxes', width: 18 },
    { header: 'Bags Recv', width: 25 },
    { header: 'Remarks', width: 40 }
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
      doc.text(rec.id, rowX, currentY + 4.8);
      rowX += columns[0].width;

      // Date
      doc.setFont('helvetica', 'normal');
      doc.text(rec.date, rowX, currentY + 4.8);
      rowX += columns[1].width;

      // Agency
      doc.text(rec.agency.length > 25 ? rec.agency.substring(0, 24) + '…' : rec.agency, rowX, currentY + 4.8);
      rowX += columns[2].width;

      // Source Type
      doc.text(rec.receivedFrom === 'SELLER' ? 'Seller' : 'Agency', rowX, currentY + 4.8);
      rowX += columns[3].width;

      // Source Name
      doc.text(rec.sourceName.length > 25 ? rec.sourceName.substring(0, 24) + '…' : rec.sourceName, rowX, currentY + 4.8);
      rowX += columns[4].width;

      // Type
      doc.setFont('helvetica', 'bold');
      if (rec.bardanaType === 'NEW') {
        doc.setTextColor(5, 150, 105);
      } else {
        doc.setTextColor(217, 119, 6);
      }
      doc.text(rec.bardanaType, rowX, currentY + 4.8);
      rowX += columns[5].width;

      // Boxes
      doc.setTextColor(15, 23, 42);
      doc.text(String(rec.boxes), rowX, currentY + 4.8);
      rowX += columns[6].width;

      // Bags
      doc.setFont('helvetica', 'bold');
      doc.text(rec.bags.toLocaleString('en-IN'), rowX, currentY + 4.8);
      rowX += columns[7].width;

      // Remarks
      doc.setFont('helvetica', 'normal');
      doc.text(rec.remarks ? (rec.remarks.length > 20 ? rec.remarks.substring(0, 19) + '…' : rec.remarks) : '-', rowX, currentY + 4.8);

      currentY += 7;
    });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Punjab Mandi Software • Generated on ${new Date().toLocaleDateString()}`, margin, 200);

  doc.save(`Bardana_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
}
