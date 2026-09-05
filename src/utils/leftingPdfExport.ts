import { jsPDF } from 'jspdf';
import { LeftingRecord, MandiSettings } from '../types/mandi';

/**
 * Generate official Punjab Mandi Lefting / Sheller Gate Pass & Dispatch Bilti Voucher PDF
 */
export async function exportLeftingVoucherPDF(
  record: LeftingRecord,
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
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(margin, 12, contentWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((settings.firmNameEn ? `${settings.firmNameEn} • ` : '') + settings.mandiNameEn.toUpperCase(), margin + 6, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${settings.marketCommitteeEn} | Grain Dispatch Division ${settings.firmLicence ? `(Lic: ${settings.firmLicence})` : ''}`, margin + 6, 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('SHELLER LEFTING / GATE PASS DISPATCH BILTI / ਲਿਫਟਿੰਗ ਗੇਟ ਪਾਸ', margin + 6, 32);

  // Gate Pass / Voucher ID Badge
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.roundedRect(pageWidth - margin - 50, 16, 46, 18, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('GATE PASS / LFT NO.', pageWidth - margin - 47, 21);
  doc.setFontSize(11);
  doc.text(record.gatePassNo || record.id, pageWidth - margin - 47, 28);

  let currentY = 44;

  // Key Dispatch Header Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DISPATCH DATE / ਮਿਤੀ:', margin + 6, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(record.dispatchDate, margin + 46, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('PROCUREMENT AGENCY:', margin + 6, currentY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(record.sellerOrAgency, margin + 46, currentY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATION (MILL/SHELLER):', margin + 6, currentY + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(record.destination, margin + 60, currentY + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS:', margin + 110, currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(record.status === 'DELIVERED' ? 'DELIVERED (ਪਹੁੰਚ ਗਿਆ)' : 'DISPATCHED (ਰਵਾਨਾ)', margin + 128, currentY + 7);

  currentY += 34;

  // Vehicle & Driver Details Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text('TRANSPORT & VEHICLE DETAILS / ਟਰੱਕ ਅਤੇ ਡਰਾਈਵਰ ਵੇਰਵਾ', margin + 6, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Truck No (ਟਰੱਕ ਨੰਬਰ): ${record.truckNo}`, margin + 6, currentY + 13);
  doc.text(`Driver Name (ਡਰਾਈਵਰ): ${record.driverName || '—'}`, margin + 6, currentY + 19);

  doc.text(`Driver Phone (ਮੋਬਾਈਲ): ${record.driverPhone || '—'}`, margin + 100, currentY + 13);
  doc.text(`Gate Pass Reference: ${record.gatePassNo || record.id}`, margin + 100, currentY + 19);

  currentY += 30;

  // Farmer or Consignee / Mill Box
  const isMandiDispatch = record.farmerId === 'MANDI-DISPATCH';
  if (isMandiDispatch) {
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 83, 45);
    doc.setFontSize(9);
    doc.text('CONSIGNEE / SHELLER DETAILS / ਸ਼ੈਲਰ ਤੇ ਪਤਾ', margin + 6, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Consignee / Mill Name: ${record.farmerName}`, margin + 6, currentY + 13);
    doc.text(`Delivery Location: ${record.village || record.destination || '—'} • Contact: ${record.mobile || '—'}`, margin + 6, currentY + 18);
  } else {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.setFontSize(9);
    doc.text('FARMER / PRODUCER DETAILS / ਕਿਸਾਨ ਵੇਰਵਾ', margin + 6, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Farmer Name: ${record.farmerName} (${record.farmerId})`, margin + 6, currentY + 13);
    doc.text(`Village: ${record.village || '—'} • Mobile: ${record.mobile || '—'}`, margin + 6, currentY + 18);
  }

  currentY += 28;

  // Weight & Bags Breakdown Table
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ITEM DESCRIPTION / ਵੇਰਵਾ', margin + 4, currentY + 5.5);
  doc.text('BARDANA', margin + 70, currentY + 5.5);
  doc.text('DISPATCHED BAGS', margin + 105, currentY + 5.5);
  doc.text('TOTAL WEIGHT (QTL + KG)', margin + 140, currentY + 5.5);

  currentY += 8;

  // Row 1: Dispatched Quantity
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, currentY, contentWidth, 9, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 9, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Paddy Dispatch (ਝੋਨਾ ਰਵਾਨਗੀ)', margin + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${record.bardanaType} (${record.newBags || 0}N / ${record.oldBags || 0}O)`, margin + 70, currentY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(`${record.bags} Bags`, margin + 105, currentY + 6);
  doc.text(`${record.qul} Qul ${record.kg} Kg (${record.totalWeightKg} Kg)`, margin + 140, currentY + 6);

  currentY += 9;

  // Row 2: Sheller Receiving & Shortage
  if (record.shortageKg || record.rejectedBags) {
    doc.setFillColor(254, 242, 242);
    doc.rect(margin, currentY, contentWidth, 9, 'F');
    doc.setDrawColor(254, 202, 202);
    doc.rect(margin, currentY, contentWidth, 9, 'S');

    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Sheller Shortage / Rejections (ਸ਼ਾਰਟੇਜ):', margin + 4, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rejected: ${record.rejectedBags || 0} Bags`, margin + 70, currentY + 6);
    doc.text(`Shortage: ${record.shortageKg || 0} Kg`, margin + 105, currentY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(`Net: ${record.netDeliveredBags || record.bags} Bags`, margin + 140, currentY + 6);

    currentY += 9;
  }

  currentY += 8;

  // Remarks & Photos
  if (record.remarks) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('REMARKS / ਟਿੱਪਣੀ:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(record.remarks, margin + 30, currentY);
    currentY += 8;
  }

  // Preserve bilti/receipt photo in PDF if present
  if (record.photos && record.photos.length > 0 && record.photos[0].startsWith('data:image')) {
    try {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('BILTI / RECEIPT PHOTO ATTACHMENT:', margin, currentY);
      doc.addImage(record.photos[0], 'JPEG', margin, currentY + 2, 35, 24);
      currentY += 28;
    } catch {
      // Continue without crashing if image format unsupported
    }
  }

  // Signatures Section
  currentY = Math.max(currentY + 14, 235);

  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 6, currentY + 16, margin + 48, currentY + 16);
  doc.line(margin + 65, currentY + 16, margin + 115, currentY + 16);
  doc.line(pageWidth - margin - 48, currentY + 16, pageWidth - margin - 6, currentY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('DRIVER SIGNATURE / ਅੰਗੂਠਾ', margin + 8, currentY + 21);
  doc.text('MANDI IN-CHARGE / ਆੜ੍ਹਤੀ', margin + 70, currentY + 21);
  doc.text('RECEIVER (RICE MILL / SHELLER)', pageWidth - margin - 47, currentY + 21);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated automatically by Punjab Mandi Software • Record ID: ${record.id}`, margin, 285);

  // Download PDF
  doc.save(`Lefting_${record.id}_${record.truckNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
