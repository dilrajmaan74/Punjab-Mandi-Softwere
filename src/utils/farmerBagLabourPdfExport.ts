import { MandiSettings } from '../types/mandi';
import { cleanPdfText } from './translations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';

export interface FarmerBagBalanceItem {
  farmerId: string;
  farmerName: string;
  farmerNamePa: string;
  fatherName: string;
  fatherNamePa?: string;
  village: string;
  villagePa?: string;
  mobile: string;
  aadhaar?: string;
  linkedFarmers: {
    id: string;
    farmerName: string;
    farmerNamePa: string;
    fatherName: string;
    village: string;
    mobile: string;
  }[];
  totalBagsBrought: number;
  totalWeightBroughtKg: number;
  arrivalEntries: {
    id: string;
    entryNumber: string;
    date: string;
    newBags: number;
    oldBags: number;
    bags: number;
    weightDisplay: string;
    labourAmount: number;
  }[];
  ownPurchasedBags: number;
  ownPurchasedWeightKg: number;
  ownPurchases: {
    id: string;
    date: string;
    agency: string;
    bags: number;
    weightDisplay: string;
    rate: number;
    totalAmount: number;
  }[];
  linkedPurchasedBags: number;
  linkedPurchasedWeightKg: number;
  linkedFarmerPurchases: {
    linkedFarmerId: string;
    linkedFarmerName: string;
    linkedFarmerNamePa?: string;
    fatherName?: string;
    village?: string;
    mobile?: string;
    purchases: {
      id: string;
      date: string;
      agency: string;
      bags: number;
      weightDisplay: string;
      rate: number;
      totalAmount: number;
    }[];
    totalBags: number;
    totalWeightKg: number;
    totalAmount: number;
  }[];
  totalPurchasedBags: number;
  totalPurchasedWeightKg: number;
  totalPurchasedAmount: number;
  balanceBeforeLabourBags: number;
  labourExpense: number;
  applicableBagRate: number;
  rawLabourBags: number;
  labourBagsAdjustment: number;
  finalBalanceBags: number;
}

export interface ReportGrandTotals {
  totalBagsBrought: number;
  totalOwnPurchase: number;
  totalLinkedFarmerPurchase: number;
  totalPurchase: number;
  totalLabourExpense: number;
  totalLabourBags: number;
  finalBalanceBags: number;
}

function cleanText(text: string | number | null | undefined): string {
  return cleanPdfText(text);
}

export async function exportFarmerBagLabourPDF(
  items: FarmerBagBalanceItem[],
  settings: MandiSettings,
  options: {
    dateFilterLabel?: string;
    applicableBagRate: number;
    totals: ReportGrandTotals;
  }
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2; // 194 mm

  // Helper for page headers
  const renderHeader = (isFirstPage: boolean) => {
    let curY = 6;
    if (isFirstPage) {
      curY = renderStandardPdfHeader({
        doc,
        settings,
        title: 'FARMER BAG BALANCE & LABOUR REPORT',
        subtitle: `Applicable Bag Rate: Rs. ${options.applicableBagRate}/Bag | 1 Bag = ${(settings.fixedBagWeightKg || 37.5).toFixed(1)} Kg | Rate/Qtl: Rs. ${settings.fixedRatePerQtl || 2461}`,
        badgeLabel: 'FILTER',
        badgeValue: options.dateFilterLabel || 'ALL RECORDS',
        startY: 6
      });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(cleanText(settings.firmNameEn || 'PUNJAB MANDI'), margin, curY + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('FARMER BAG BALANCE & LABOUR REPORT (Continued)', margin + 70, curY + 4);
      doc.text(`Bag Rate: Rs. ${options.applicableBagRate}`, pageWidth - margin, curY + 4, { align: 'right' });
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + 6, pageWidth - margin, curY + 6);
      curY += 9;
    }
    return curY;
  };

  let y = renderHeader(true);

  // Section 1: Summary Table of All Main Farmers
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('1. MAIN FARMERS SUMMARY TABLE', margin, y);
  y += 3;

  // Table Columns Definition (Sum = 194 mm)
  const cols = [
    { key: 'sr', title: 'Sr', width: 8, align: 'center' as const },
    { key: 'farmer', title: 'Main Farmer Name', width: 34, align: 'left' as const },
    { key: 'village', title: 'Village', width: 22, align: 'left' as const },
    { key: 'brought', title: 'Brought', width: 15, align: 'right' as const },
    { key: 'own', title: 'Own Pur', width: 14, align: 'right' as const },
    { key: 'linked', title: 'Linked Pur', width: 15, align: 'right' as const },
    { key: 'totalPur', title: 'Total Pur', width: 15, align: 'right' as const },
    { key: 'balBefore', title: 'Bal Before', width: 16, align: 'right' as const },
    { key: 'labourExp', title: 'Labour (Rs)', width: 18, align: 'right' as const },
    { key: 'labourBags', title: 'Lab Bags', width: 15, align: 'right' as const },
    { key: 'finalBal', title: 'Final Bal', width: 22, align: 'right' as const }
  ];

  const renderTableHeader = (headerY: number) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, headerY, contentWidth, 7, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin, headerY, contentWidth, 7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);

    let curX = margin;
    cols.forEach((col) => {
      const textX = col.align === 'center' ? curX + col.width / 2 : col.align === 'right' ? curX + col.width - 1.5 : curX + 1.5;
      doc.text(col.title, textX, headerY + 4.6, { align: col.align });
      curX += col.width;
    });
    return headerY + 7;
  };

  y = renderTableHeader(y);

  const rowHeight = 6.2;

  items.forEach((item, index) => {
    // Check page overflow
    if (y + rowHeight > pageHeight - 15) {
      doc.addPage();
      y = renderHeader(false);
      y = renderTableHeader(y);
    }

    // Row border & text
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    let curX = margin;

    // 1. Sr
    doc.text(`${index + 1}`, curX + cols[0].width / 2, y + 4.3, { align: 'center' });
    curX += cols[0].width;

    // 2. Farmer Name
    const farmerTitle = cleanText(item.farmerName);
    const subLabel = item.linkedFarmers.length > 0 ? ` (+${item.linkedFarmers.length})` : '';
    const fullFarmerStr = farmerTitle + subLabel;
    doc.setFont('helvetica', 'bold');
    doc.text(fullFarmerStr.length > 22 ? fullFarmerStr.slice(0, 21) + '..' : fullFarmerStr, curX + 1.5, y + 4.3);
    doc.setFont('helvetica', 'normal');
    curX += cols[1].width;

    // 3. Village
    const vill = cleanText(item.village || '-');
    doc.text(vill.length > 15 ? vill.slice(0, 14) + '..' : vill, curX + 1.5, y + 4.3);
    curX += cols[2].width;

    // 4. Brought
    doc.text(`${item.totalBagsBrought}`, curX + cols[3].width - 1.5, y + 4.3, { align: 'right' });
    curX += cols[3].width;

    // 5. Own
    doc.text(`${item.ownPurchasedBags}`, curX + cols[4].width - 1.5, y + 4.3, { align: 'right' });
    curX += cols[4].width;

    // 6. Linked
    doc.text(`${item.linkedPurchasedBags}`, curX + cols[5].width - 1.5, y + 4.3, { align: 'right' });
    curX += cols[5].width;

    // 7. Total Pur
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.totalPurchasedBags}`, curX + cols[6].width - 1.5, y + 4.3, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    curX += cols[6].width;

    // 8. Bal Before Labour
    doc.text(`${item.balanceBeforeLabourBags}`, curX + cols[7].width - 1.5, y + 4.3, { align: 'right' });
    curX += cols[7].width;

    // 9. Labour Exp
    doc.text(`Rs. ${Math.round(item.labourExpense).toLocaleString('en-IN')}`, curX + cols[8].width - 1.5, y + 4.3, { align: 'right' });
    curX += cols[8].width;

    // 10. Labour Bags
    doc.text(`${item.labourBagsAdjustment}`, curX + cols[9].width - 1.5, y + 4.3, { align: 'right' });
    curX += cols[9].width;

    // 11. Final Balance (Bold)
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.finalBalanceBags} Bags`, curX + cols[10].width - 1.5, y + 4.3, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  // Render Grand Totals Row
  if (y + 8 > pageHeight - 15) {
    doc.addPage();
    y = renderHeader(false);
  }

  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, contentWidth, 7, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);

  // Label
  doc.text('GRAND TOTAL:', margin + 4, y + 4.7);

  // Total Brought
  let curTotX = margin + cols[0].width + cols[1].width + cols[2].width;
  doc.text(`${options.totals.totalBagsBrought}`, curTotX + cols[3].width - 1.5, y + 4.7, { align: 'right' });
  curTotX += cols[3].width;

  // Total Own Pur
  doc.text(`${options.totals.totalOwnPurchase}`, curTotX + cols[4].width - 1.5, y + 4.7, { align: 'right' });
  curTotX += cols[4].width;

  // Total Linked Pur
  doc.text(`${options.totals.totalLinkedFarmerPurchase}`, curTotX + cols[5].width - 1.5, y + 4.7, { align: 'right' });
  curTotX += cols[5].width;

  // Total Pur
  doc.text(`${options.totals.totalPurchase}`, curTotX + cols[6].width - 1.5, y + 4.7, { align: 'right' });
  curTotX += cols[6].width;

  // Bal Before Labour Total
  const totalBalBefore = options.totals.totalBagsBrought - options.totals.totalPurchase;
  doc.text(`${totalBalBefore}`, curTotX + cols[7].width - 1.5, y + 4.7, { align: 'right' });
  curTotX += cols[7].width;

  // Total Labour Exp
  doc.text(`Rs. ${Math.round(options.totals.totalLabourExpense).toLocaleString('en-IN')}`, curTotX + cols[8].width - 1.5, y + 4.7, { align: 'right' });
  curTotX += cols[8].width;

  // Total Labour Bags
  doc.text(`${options.totals.totalLabourBags}`, curTotX + cols[9].width - 1.5, y + 4.7, { align: 'right' });
  curTotX += cols[9].width;

  // Total Final Balance
  doc.text(`${options.totals.finalBalanceBags} Bags`, curTotX + cols[10].width - 1.5, y + 4.7, { align: 'right' });

  y += 12;

  // Section 2: Detailed Farmer-by-Farmer Breakdown
  if (y + 20 > pageHeight - 15) {
    doc.addPage();
    y = renderHeader(false);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('2. DETAILED FARMER-WISE BREAKDOWN & RECONCILIATION', margin, y);
  y += 5;

  items.forEach((item, fIdx) => {
    // Check if new page needed for this farmer's section
    if (y + 40 > pageHeight - 15) {
      doc.addPage();
      y = renderHeader(false);
    }

    // Farmer Header Box
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 7.5, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 7.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    const farmerLine = `${fIdx + 1}. Main Farmer: ${cleanText(item.farmerName)} | S/o: ${cleanText(item.fatherName || '-')} | Village: ${cleanText(item.village)} | Mobile: ${item.mobile || '-'}`;
    doc.text(farmerLine, margin + 2, y + 5);

    y += 9.5;

    // Linked Farmers tag if any
    if (item.linkedFarmers.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      const linkedNames = item.linkedFarmers.map(lf => `${cleanText(lf.farmerName)} (${cleanText(lf.village)})`).join(', ');
      doc.text(`Linked Sub-Farmers (${item.linkedFarmers.length}): ${linkedNames}`, margin + 2, y);
      y += 4;
    }

    // A. Arrival Entries Mini Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Mandi Arrival Weighment: ${item.totalBagsBrought} Bags Brought`, margin + 2, y);
    y += 3;

    // Mini Arrival Table Header
    doc.setFillColor(250, 250, 250);
    doc.rect(margin + 2, y, contentWidth - 4, 5, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.rect(margin + 2, y, contentWidth - 4, 5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Entry #', margin + 4, y + 3.5);
    doc.text('Date', margin + 28, y + 3.5);
    doc.text('New Juths', margin + 55, y + 3.5, { align: 'right' });
    doc.text('Old Juths', margin + 80, y + 3.5, { align: 'right' });
    doc.text('Total Bags', margin + 110, y + 3.5, { align: 'right' });
    doc.text('Weight', margin + 145, y + 3.5, { align: 'right' });
    doc.text('Labour Deductions', margin + contentWidth - 6, y + 3.5, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    item.arrivalEntries.forEach((arr) => {
      if (y + 4.5 > pageHeight - 15) {
        doc.addPage();
        y = renderHeader(false);
      }
      doc.text(arr.entryNumber || '-', margin + 4, y + 3.3);
      doc.text(arr.date || '-', margin + 28, y + 3.3);
      doc.text(`${arr.newBags}`, margin + 55, y + 3.3, { align: 'right' });
      doc.text(`${arr.oldBags}`, margin + 80, y + 3.3, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(`${arr.bags}`, margin + 110, y + 3.3, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(arr.weightDisplay || '-', margin + 145, y + 3.3, { align: 'right' });
      doc.text(`Rs. ${Math.round(arr.labourAmount).toLocaleString('en-IN')}`, margin + contentWidth - 6, y + 3.3, { align: 'right' });
      y += 4.5;
    });

    y += 2;

    // B. Purchases Breakdown: Own Purchases & Linked Purchases
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Purchases: Own (${item.ownPurchasedBags} Bags) + Linked (${item.linkedPurchasedBags} Bags) = Total ${item.totalPurchasedBags} Bags`, margin + 2, y);
    y += 3;

    // Own Purchases table
    if (item.ownPurchases.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`- Own Purchases (${cleanText(item.farmerName)}):`, margin + 4, y + 2.5);
      y += 3.5;

      item.ownPurchases.forEach((p) => {
        if (y + 4.5 > pageHeight - 15) {
          doc.addPage();
          y = renderHeader(false);
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(`  • ${p.id} | Date: ${p.date} | Agency: ${cleanText(p.agency)} | Bags: ${p.bags} | Weight: ${p.weightDisplay} | Rate: Rs. ${p.rate} | Amount: Rs. ${p.totalAmount.toLocaleString('en-IN')}`, margin + 6, y + 2.5);
        y += 4;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.text(`  • No direct purchases recorded for this main farmer.`, margin + 6, y + 2.5);
      y += 4;
    }

    // Linked Purchases table
    if (item.linkedFarmerPurchases.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text(`- Linked Farmers Purchases:`, margin + 4, y + 2.5);
      y += 3.5;

      item.linkedFarmerPurchases.forEach((lfp) => {
        if (y + 4.5 > pageHeight - 15) {
          doc.addPage();
          y = renderHeader(false);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(`  • ${cleanText(lfp.linkedFarmerName)} (${cleanText(lfp.village || '-')}) - Subtotal: ${lfp.totalBags} Bags:`, margin + 6, y + 2.5);
        y += 3.5;

        lfp.purchases.forEach((lp) => {
          if (y + 4.5 > pageHeight - 15) {
            doc.addPage();
            y = renderHeader(false);
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.text(`    - ${lp.id} | Date: ${lp.date} | Agency: ${cleanText(lp.agency)} | Bags: ${lp.bags} | Weight: ${lp.weightDisplay} | Rate: Rs. ${lp.rate} | Rs. ${lp.totalAmount.toLocaleString('en-IN')}`, margin + 8, y + 2.5);
          y += 3.8;
        });
      });
    }

    // C. Mathematical Reconciliation Box
    if (y + 16 > pageHeight - 15) {
      doc.addPage();
      y = renderHeader(false);
    }

    y += 2;
    doc.setFillColor(248, 248, 248);
    doc.rect(margin + 2, y, contentWidth - 4, 13, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, y, contentWidth - 4, 13, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('LABOUR & BALANCE RECONCILIATION:', margin + 4, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const line1 = `Brought: ${item.totalBagsBrought} - Total Purchases: ${item.totalPurchasedBags} (Own: ${item.ownPurchasedBags} + Linked: ${item.linkedPurchasedBags}) = Balance Before Labour: ${item.balanceBeforeLabourBags} Bags`;
    doc.text(line1, margin + 4, y + 7.5);

    const line2 = `Labour Expense: Rs. ${Math.round(item.labourExpense).toLocaleString('en-IN')} ÷ Applicable Bag Rate: Rs. ${item.applicableBagRate} = ${(item.rawLabourBags).toFixed(2)} → Rounded UP: ${item.labourBagsAdjustment} Bags`;
    doc.text(line2, margin + 4, y + 11);

    doc.setFont('helvetica', 'bold');
    doc.text(`FINAL REMAINING BALANCE: ${item.finalBalanceBags} BAGS`, margin + contentWidth - 6, y + 11, { align: 'right' });

    y += 17;
  });

  // Add Page Numbers and Signatures to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')} | Punjab Mandi Management System`, margin, pageHeight - 6);
    doc.text(`Authorized Signatory / Mandi Munshi`, pageWidth / 2, pageHeight - 6, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  // Save the PDF
  const filename = `Farmer_Bag_Balance_and_Labour_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
