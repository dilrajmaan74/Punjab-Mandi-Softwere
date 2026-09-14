import { FarmerAccountSummary, MandiSettings } from '../types/mandi';
import { maskAadhaarNumber } from './calculations';
import { cleanPdfText } from './translations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';

function cleanText(text: string | number | null | undefined): string {
  return cleanPdfText(text);
}

function formatPdfCurrency(amount: number): string {
  const safe = Number(amount) || 0;
  const isNeg = safe < 0;
  const formatted = Math.abs(safe).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNeg ? `- Rs. ${formatted}` : `Rs. ${formatted}`;
}

/**
 * Draw placeholder when photo is missing or fails to render
 */
function drawPhotoBox(doc: any, x: number, y: number, size: number, label: string) {
  doc.setFillColor(241, 245, 249);
  doc.rect(x, y, size, size, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y, size, size, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(label, x + size / 2, y + size / 2, { align: 'center' });
}

/**
 * Generate Comprehensive Farmer Account PDF / Kisan Khata
 */
export async function exportFarmerAccountPDF(
  account: FarmerAccountSummary,
  settings: MandiSettings
): Promise<void> {
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
  let y = 12;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 14) {
      doc.addPage();
      y = 14;
      // Mini page header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Punjab Mandi Portal - Farmer Account: ${account.farmer.id} (${cleanText(account.farmer.farmerName)})`, margin, y);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, y, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 8;
    }
  };

  // ==========================================
  // TOP STANDARDIZED FIRM HEADER
  // ==========================================
  const uniqueAgencies = Array.from(new Set(account.purchaseRecords.map(p => cleanText(p.agency)).filter(Boolean)));
  const primaryAgency = uniqueAgencies.length === 1 ? uniqueAgencies[0] : undefined;

  y = renderStandardPdfHeader({
    doc,
    settings,
    title: 'FARMER ACCOUNT / KISAN KHATA STATEMENT',
    subtitle: `Statement Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}`,
    badgeLabel: 'FARMER ID',
    badgeValue: account.farmer.id,
    agencyName: primaryAgency,
    startY: 8
  });

  // ==========================================
  // FARMER PROFILE & BANK DETAILS
  // ==========================================
  checkPageBreak(50);
  const profileCardHeight = 44;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, profileCardHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, profileCardHeight, 2, 2, 'S');

  // Photo
  const photoSize = 34;
  const photoX = margin + 5;
  const photoY = y + 5;

  if (account.farmer.photoUrl) {
    try {
      doc.addImage(account.farmer.photoUrl, 'JPEG', photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(203, 213, 225);
      doc.rect(photoX, photoY, photoSize, photoSize, 'S');
    } catch {
      drawPhotoBox(doc, photoX, photoY, photoSize, 'Farmer Photo');
    }
  } else {
    drawPhotoBox(doc, photoX, photoY, photoSize, 'No Photo');
  }

  // Farmer Information
  const infoX1 = photoX + photoSize + 8;
  let textY = y + 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cleanText(account.farmer.farmerName) || 'Farmer Name', infoX1, textY);

  textY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Father Name:", infoX1, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cleanText(account.farmer.fatherName) || '-', infoX1 + 25, textY);

  textY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Village / District:', infoX1, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${cleanText(account.farmer.village)} (PIN: ${account.farmer.pinCode || '141401'})`, infoX1 + 25, textY);

  textY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Mobile / Aadhaar:', infoX1, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${account.farmer.mobile || '-'}  |  ${maskAadhaarNumber(account.farmer.aadhaar)}`, infoX1 + 25, textY);

  // Bank Column (Right side)
  const bankX = margin + (contentWidth * 0.62);
  let bankY = y + 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text('BANK ACCOUNT DETAILS', bankX, bankY);

  bankY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Bank:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cleanText(account.farmer.bankDetails?.bankName) || '-', bankX + 16, bankY);

  bankY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('A/C No:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(account.farmer.bankDetails?.accountNumber || '-', bankX + 16, bankY);

  bankY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('IFSC:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(account.farmer.bankDetails?.ifscCode || '-', bankX + 16, bankY);

  bankY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Branch:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cleanText(account.farmer.bankDetails?.branchName) || '-', bankX + 16, bankY);

  y += profileCardHeight + 6;

  // ==========================================
  // TOP FINANCIAL KPI SUMMARY CARDS
  // ==========================================
  checkPageBreak(24);
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 18;

  // Card 1: Mandi Arrival
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(22, 101, 52);
  doc.text('MANDI ARRIVAL', margin + cardWidth / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(20, 83, 45);
  doc.text(`${account.mandiArrivalBags} Bags`, margin + cardWidth / 2, y + 11, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(cleanText(account.mandiArrivalDisplay), margin + cardWidth / 2, y + 15, { align: 'center' });

  // Card 2: Purchased Bags
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin + (cardWidth + 3), y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 64, 175);
  doc.text('PURCHASED BAGS', margin + (cardWidth + 3) + cardWidth / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(29, 78, 216);
  doc.text(`${account.purchasedBags} Bags`, margin + (cardWidth + 3) + cardWidth / 2, y + 11, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(cleanText(account.purchasedWeightDisplay), margin + (cardWidth + 3) + cardWidth / 2, y + 15, { align: 'center' });

  // Card 3: Remaining Stock
  doc.setFillColor(account.remainingBags > 0 ? 254 : 241, account.remainingBags > 0 ? 243 : 245, account.remainingBags > 0 ? 199 : 249);
  doc.roundedRect(margin + (cardWidth + 3) * 2, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(account.remainingBags > 0 ? 146 : 71, account.remainingBags > 0 ? 64 : 85, account.remainingBags > 0 ? 14 : 105);
  doc.text('REMAINING STOCK', margin + (cardWidth + 3) * 2 + cardWidth / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(account.remainingBags > 0 ? 180 : 100, account.remainingBags > 0 ? 83 : 116, account.remainingBags > 0 ? 9 : 139);
  doc.text(`${account.remainingBags} Bags`, margin + (cardWidth + 3) * 2 + cardWidth / 2, y + 11, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(cleanText(account.remainingWeightDisplay), margin + (cardWidth + 3) * 2 + cardWidth / 2, y + 15, { align: 'center' });

  // Card 4: Total Value
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin + (cardWidth + 3) * 3, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('TOTAL AMOUNT', margin + (cardWidth + 3) * 3 + cardWidth / 2, y + 5.5, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setTextColor(120, 53, 15);
  doc.text(formatPdfCurrency(account.purchasedAmount), margin + (cardWidth + 3) * 3 + cardWidth / 2, y + 11, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paid: ${formatPdfCurrency(account.paidAmount)}`, margin + (cardWidth + 3) * 3 + cardWidth / 2, y + 15, { align: 'center' });

  y += cardHeight + 6;

  // ==========================================
  // SECTION 1: MANDI ARRIVAL SUMMARY
  // ==========================================
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('1. MANDI ARRIVAL & WEIGHMENT DETAILS', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Date', margin + 3, y + 4.2);
  doc.text('Slip No', margin + 24, y + 4.2);
  doc.text('Bags', margin + 48, y + 4.2);
  doc.text('Total Weight', margin + 68, y + 4.2);
  doc.text('Bardana', margin + 104, y + 4.2);
  doc.text('Rate', margin + 128, y + 4.2);
  doc.text('Total Amount', pageWidth - margin - 4, y + 4.2, { align: 'right' });
  y += 6;

  if (account.mandiArrivalEntries.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No Mandi Arrival records found for this farmer.', margin + 3, y + 5);
    y += 8;
  } else {
    account.mandiArrivalEntries.forEach((entry, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(cleanText(entry.date), margin + 3, y + 4.2);
      doc.text(cleanText(entry.entryNumber), margin + 24, y + 4.2);
      doc.text(`${entry.bags} Bags`, margin + 48, y + 4.2);
      doc.text(cleanText(entry.grandTotalDisplay), margin + 68, y + 4.2);
      doc.text(`${cleanText(entry.bardana)} Bardana`, margin + 104, y + 4.2);
      doc.text(`Rs. ${entry.ratePerQtl}`, margin + 128, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfCurrency(entry.totalAmount), pageWidth - margin - 4, y + 4.2, { align: 'right' });
      y += 6;
    });

    // Total row
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Mandi Arrival:', margin + 3, y + 4.5);
    doc.text(`${account.mandiArrivalBags} Bags`, margin + 48, y + 4.5);
    doc.text(cleanText(account.mandiArrivalDisplay), margin + 68, y + 4.5);
    y += 8;
  }

  // ==========================================
  // SECTION 2: AGENCY-WISE & DAILY PURCHASES
  // ==========================================
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('2. AGENCY-WISE & DAILY PURCHASES', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Date', margin + 3, y + 4.2);
  doc.text('Agency', margin + 24, y + 4.2);
  doc.text('Boli / Ref', margin + 56, y + 4.2);
  doc.text('Bags', margin + 84, y + 4.2);
  doc.text('Weight', margin + 104, y + 4.2);
  doc.text('Rate', margin + 130, y + 4.2);
  doc.text('Amount', pageWidth - margin - 4, y + 4.2, { align: 'right' });
  y += 6;

  if (account.purchaseRecords.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No Daily Purchase records found for this farmer.', margin + 3, y + 5);
    y += 8;
  } else {
    account.purchaseRecords.forEach((pur, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(cleanText(pur.date), margin + 3, y + 4.2);
      doc.text(cleanText(pur.agency), margin + 24, y + 4.2);
      doc.text(cleanText(pur.boliNumber || pur.id), margin + 56, y + 4.2);
      doc.text(`${pur.bags} Bags`, margin + 84, y + 4.2);
      doc.text(cleanText(pur.totalWeightDisplay || `${pur.qul}Q ${pur.kg}K`), margin + 104, y + 4.2);
      doc.text(`Rs. ${pur.rate}`, margin + 130, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfCurrency(pur.totalAmount), pageWidth - margin - 4, y + 4.2, { align: 'right' });
      y += 6;
    });

    // Total row
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Purchased:', margin + 3, y + 4.5);
    doc.text(`${account.purchasedBags} Bags`, margin + 84, y + 4.5);
    doc.text(cleanText(account.purchasedWeightDisplay), margin + 104, y + 4.5);
    doc.text(formatPdfCurrency(account.purchasedAmount), pageWidth - margin - 4, y + 4.5, { align: 'right' });
    y += 8;
  }

  // Agency Breakdown Box
  if (account.agencyWisePurchases && account.agencyWisePurchases.length > 0) {
    checkPageBreak(20);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('AGENCY PROCUREMENT BREAKDOWN:', margin + 4, y + 4.5);

    let agX = margin + 4;
    account.agencyWisePurchases.forEach((ag) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(20, 83, 45);
      doc.text(`${cleanText(ag.agency)}: ${ag.bags} Bags (${formatPdfCurrency(ag.amount)})   |`, agX, y + 10);
      agX += 58;
    });
    y += 18;
  }

  // ==========================================
  // SECTION 3: BARDANA DETAILS
  // ==========================================
  checkPageBreak(22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('3. BARDANA USAGE DETAILS', margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`New Bardana Used: `, margin + 6, y + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${account.newBardanaUsed} Bags`, margin + 38, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Old Bardana Used: `, margin + 70, y + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${account.oldBardanaUsed} Bags`, margin + 98, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Total Bardana Used: `, margin + 130, y + 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 83, 45);
  doc.text(`${account.totalBardanaUsed} Bags`, margin + 160, y + 7.5);

  y += 18;

  // ==========================================
  // SECTION 4: CROP PURCHASES & LABOUR RECONCILIATION
  // ==========================================
  checkPageBreak(42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('4. CROP RECONCILIATION & LABOUR DEDUCTIONS', margin, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 34, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 34, 1.5, 1.5, 'S');

  let crY = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Gross Crop Amount:', margin + 6, crY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(account.totalGrossAmount), margin + 80, crY);

  crY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(185, 28, 28);
  doc.text('Less: Pakki Labour (Rs. 7/Qtl):', margin + 6, crY);
  doc.setFont('helvetica', 'bold');
  doc.text(`- ${formatPdfCurrency(account.totalPakkiLabour)}`, margin + 80, crY);

  crY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Less: Double Labour (Rs. 14/Qtl):', margin + 6, crY);
  doc.setFont('helvetica', 'bold');
  doc.text(`- ${formatPdfCurrency(account.totalPakkaDoubleLabour)}`, margin + 80, crY);

  crY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Less: Sukhi Labour (Rs. 5/Qtl):', margin + 6, crY);
  doc.setFont('helvetica', 'bold');
  doc.text(`- ${formatPdfCurrency(account.totalSukhiLabour)}`, margin + 80, crY);

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 4, crY + 2, margin + contentWidth - 4, crY + 2);

  crY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text('Total Labour Deductions:', margin + 6, crY);
  doc.text(`- ${formatPdfCurrency(account.totalLabourDeductions)}`, margin + 80, crY);

  // Right column: Agency Payments & Net Crop Payable
  const netColX = margin + (contentWidth * 0.56);
  let netY = y + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Agency Payments Paid:', netColX, netY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(account.totalAgencyPurchasePayment), pageWidth - margin - 6, netY, { align: 'right' });

  netY += 9;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(netColX - 2, netY - 2, contentWidth * 0.44, 18, 1.5, 1.5, 'F');
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(netColX - 2, netY - 2, contentWidth * 0.44, 18, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 83, 45);
  doc.text('NET CROP PAYABLE', netColX + 4, netY + 4);
  doc.setFontSize(11.5);
  doc.text(formatPdfCurrency(account.netPayableAmount), netColX + 4, netY + 12);

  y += 40;

  // ==========================================
  // SECTION 5: SEPARATE ADVANCE & MONTHS+DAYS INTEREST STATEMENT
  // ==========================================
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('5. SEPARATE ADVANCE & ACCRUED INTEREST', margin, y);
  y += 4;

  // Table header matching: Principal | Start Date | End Date | Rate | Days | Months+Days | Interest | Total
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('Principal (Rs.)', margin + 3, y + 4.2);
  doc.text('Start Date', margin + 28, y + 4.2);
  doc.text('End Date', margin + 50, y + 4.2);
  doc.text('Rate/Mo', margin + 72, y + 4.2);
  doc.text('Days', margin + 88, y + 4.2);
  doc.text('Months + Days', margin + 104, y + 4.2);
  doc.text('Interest (Rs.)', margin + 140, y + 4.2);
  doc.text('Total (Rs.)', pageWidth - margin - 4, y + 4.2, { align: 'right' });
  y += 6.5;

  if (!account.advances || account.advances.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No separate advance records recorded for this farmer.', margin + 3, y + 5);
    y += 8;
  } else {
    account.advances.forEach((adv, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatPdfCurrency(adv.principal ?? adv.amount), margin + 3, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(cleanText(adv.startDate || adv.date), margin + 28, y + 4.2);
      doc.text(cleanText(adv.endDate || adv.interestTillDate || '-'), margin + 50, y + 4.2);
      doc.text(`${adv.monthlyInterestRate ?? 2.0}%`, margin + 72, y + 4.2);
      doc.text(`${adv.totalDays || 0}d`, margin + 88, y + 4.2);
      doc.text(`${adv.monthsElapsed || 0}M + ${adv.daysElapsed || 0}D`, margin + 104, y + 4.2);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(formatPdfCurrency(adv.interestAmount || 0), margin + 140, y + 4.2);
      doc.setTextColor(159, 18, 57);
      doc.text(formatPdfCurrency(adv.totalPayableWithInterest || (adv.amount + (adv.interestAmount || 0))), pageWidth - margin - 4, y + 4.2, { align: 'right' });
      y += 6;
    });

    // Advance Totals row
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Principal:', margin + 3, y + 4.5);
    doc.text(formatPdfCurrency(account.totalAdvancePrincipal), margin + 28, y + 4.5);

    doc.setTextColor(180, 83, 9);
    doc.text('Total Interest:', margin + 72, y + 4.5);
    doc.text(formatPdfCurrency(account.totalAdvanceInterest), margin + 96, y + 4.5);

    doc.setTextColor(159, 18, 57);
    doc.text('Total Recoverable:', margin + 130, y + 4.5);
    doc.text(formatPdfCurrency(account.totalAdvanceRecoverable), pageWidth - margin - 4, y + 4.5, { align: 'right' });
    y += 8;
  }

  // ==========================================
  // SECTION 6: FINAL NET SETTLEMENT STATEMENT
  // ==========================================
  checkPageBreak(30);
  const isPayable = account.finalNetSettlementBalance >= 0;
  doc.setFillColor(isPayable ? 240 : 254, isPayable ? 253 : 242, isPayable ? 244 : 242);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(isPayable ? 34 : 239, isPayable ? 197 : 68, isPayable ? 94 : 68);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(isPayable ? 20 : 153, isPayable ? 83 : 27, isPayable ? 45 : 27);
  doc.text('6. FINAL NET SETTLEMENT STATEMENT', margin + 6, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Net Crop Payable: ${formatPdfCurrency(account.netPayableAmount)}`, margin + 6, y + 13);
  doc.text(`Less Advance Recoverable: - ${formatPdfCurrency(account.totalAdvanceRecoverable)}`, margin + 68, y + 13);
  doc.text(`Direct Payments: - ${formatPdfCurrency(account.paidAmount)}`, margin + 136, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(isPayable ? 20 : 185, isPayable ? 83 : 28, isPayable ? 45 : 28);
  const settlementLabel = isPayable ? 'FINAL BALANCE PAYABLE TO FARMER:' : 'FINAL RECOVERABLE FROM FARMER:';
  doc.text(settlementLabel, margin + 6, y + 19.5);
  doc.setFontSize(11.5);
  doc.text(formatPdfCurrency(Math.abs(account.finalNetSettlementBalance)), pageWidth - margin - 6, y + 19.5, { align: 'right' });

  y += 30;

  // ==========================================
  // SECTION 7: COMPLETE TRANSACTION LEDGER
  // ==========================================
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text('7. CHRONOLOGICAL TRANSACTION LEDGER', margin, y);
  y += 4;

  // Table header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Date', margin + 3, y + 4.2);
  doc.text('Type', margin + 24, y + 4.2);
  doc.text('Agency / Ref', margin + 56, y + 4.2);
  doc.text('Bags', margin + 98, y + 4.2);
  doc.text('Weight', margin + 116, y + 4.2);
  doc.text('Rate', margin + 138, y + 4.2);
  doc.text('Amount (Rs.)', pageWidth - margin - 4, y + 4.2, { align: 'right' });
  y += 6;

  if (!account.transactions || account.transactions.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No ledger transactions recorded yet.', margin + 3, y + 5);
    y += 8;
  } else {
    account.transactions.forEach((tx, idx) => {
      checkPageBreak(7);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(cleanText(tx.date), margin + 3, y + 4.2);
      doc.text(cleanText(tx.typeLabelEn), margin + 24, y + 4.2);
      doc.text(cleanText(`${tx.agency || ''} ${tx.reference ? `(${tx.reference})` : ''}`), margin + 56, y + 4.2);
      doc.text(tx.bags ? `${tx.bags}` : '-', margin + 98, y + 4.2);
      doc.text(tx.qul !== undefined ? `${tx.qul}Q ${tx.kg}K` : '-', margin + 116, y + 4.2);
      doc.text(tx.rate ? `${tx.rate}` : '-', margin + 138, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(tx.totalAmount ? formatPdfCurrency(tx.totalAmount) : '-', pageWidth - margin - 4, y + 4.2, { align: 'right' });
      y += 6;
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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Verified Mandi Secretary / Auctioneer Signature', margin + 4, y + 10);
  doc.text('Farmer Signature / Thumb Impression', pageWidth - margin - 55, y + 10);

  // Save PDF
  const filename = `Farmer_Account_${account.farmer.id}_${cleanText(account.farmer.farmerName).replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
