import { jsPDF } from 'jspdf';
import { MandiSettings } from '../types/mandi';
import { cleanPdfText } from './translations';

export interface StandardPdfHeaderOptions {
  doc: jsPDF;
  settings: MandiSettings;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeValue?: string;
  agencyName?: string;
  startY?: number;
}

/**
 * Universal Standardized PDF Header for ALL Mandi Portal exports
 * Strictly renders:
 * 1. Firm Name (from settings.firmNameEn)
 * 2. Full Firm Address (from settings.firmAddress)
 * 3. License Number (from settings.firmLicence)
 * 4. Mobile Number (from settings.firmMobile)
 * 5. PAN Card Number (from settings.firmPan)
 * 6. Relevant Agency Name clearly displayed below header (when applicable)
 */
export function renderStandardPdfHeader(options: StandardPdfHeaderOptions): number {
  const {
    doc,
    settings,
    title,
    subtitle,
    badgeLabel,
    badgeValue,
    agencyName,
    startY = 8
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const isLandscape = pageWidth > 250;
  const margin = isLandscape ? 10 : 12;
  const contentWidth = pageWidth - margin * 2;

  // Firm Information from Settings / Profile (never hardcoded)
  const firmName = (cleanPdfText(settings.firmNameEn) || 'JAMMU TRADING CO').toUpperCase();
  const firmAddress = cleanPdfText(settings.firmAddress) || 'Dana Mandi Kang Khurd, Teh. Shahkot, Distt. Jalandhar, Punjab - 144629';
  const licenceNo = cleanPdfText(settings.firmLicence) || 'JAL/LKH/133';
  const mobile = cleanPdfText(settings.firmMobile) || '98147-74651';
  const pan = cleanPdfText(settings.firmPan) || 'AAACJ1234F';
  const marketCommittee = cleanPdfText(settings.marketCommitteeEn) || 'Market Committee Lohian Khas';

  let curY = startY;
  const centerX = pageWidth / 2;

  // Header Box Top Banner (Deep forest green / slate for official authoritative Mandi look)
  const bannerHeight = isLandscape ? 29 : 31;
  doc.setFillColor(15, 23, 42); // Slate-900 / Deep charcoal
  doc.rect(margin, curY, contentWidth, bannerHeight, 'F');

  // Emerald Top Accent Stripe
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(margin, curY, contentWidth, 2, 'F');

  // 1. FIRM NAME (Centre Aligned at the top, prominent and bold)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 15 : 13.5);
  doc.text(firmName, centerX, curY + 8.5, { align: 'center' });

  // 2. COMPLETE FIRM ADDRESS (Centre Aligned directly below Firm Name)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 9 : 8.5);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(firmAddress, centerX, curY + 14.5, { align: 'center' });

  // 3. LICENCE NO, MOBILE NO, PAN CARD NUMBER (Neatly below without crowding)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 8.5 : 8);
  doc.setTextColor(254, 240, 138); // Yellow-200 for high readability
  const creds = `Licence No: ${licenceNo}   •   Mobile: +91 ${mobile}   •   PAN No: ${pan}`;
  doc.text(creds, centerX, curY + 20.5, { align: 'center' });

  // 4. Market Committee & Mandi Board Tag (Neatly centered at bottom of header banner)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isLandscape ? 8 : 7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`${marketCommittee} • Punjab Mandi Board (Regd. Govt. Licenced Arthia)`, centerX, curY + (isLandscape ? 25.5 : 26.5), { align: 'center' });

  curY += bannerHeight + 3;

  // 2. AGENCY SECTION - Show ONLY the selected Purchase Agency
  let cleanAgency = agencyName ? cleanPdfText(agencyName).replace(/^PURCHASE\s+AGENCY\s*:\s*/i, '').trim().toUpperCase() : '';

  // Remove generic or hard-coded placeholder strings
  if (
    cleanAgency.includes('ALL PROCUREMENT AGENCIES') ||
    cleanAgency.includes('ALL AGENCIES') ||
    cleanAgency.includes('PUNJAB MANDI BOARD AGENCY') ||
    cleanAgency.includes('MULTIPLE PROCUREMENT AGENCIES')
  ) {
    cleanAgency = '';
  }

  const hasAgencyBar = Boolean(cleanAgency);

  if (hasAgencyBar) {
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.roundedRect(margin, curY, contentWidth, 10, 1.5, 1.5, 'F');
    doc.setDrawColor(52, 211, 153); // Emerald-400 border
    doc.roundedRect(margin, curY, contentWidth, 10, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 78, 59); // Emerald-900
    doc.text(`PURCHASE AGENCY: ${cleanAgency}`, margin + 6, curY + 6.6);

    // Badge on the right of Agency bar if provided
    if (badgeValue) {
      const bText = `${(badgeLabel || 'RECORD ID').toUpperCase()}: ${badgeValue}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const bWidth = doc.getTextWidth(bText) + 8;
      const bX = pageWidth - margin - bWidth - 3;
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.roundedRect(bX, curY + 2, bWidth, 6, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(bText, bX + bWidth / 2, curY + 6.2, { align: 'center' });
    }

    curY += 13;
  }

  // Document Title & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isLandscape ? 11 : 10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), margin + 2, curY + 3.5);

  // Badge on the right of Title bar if agency bar was not rendered
  if (badgeValue && !hasAgencyBar) {
    const bText = `${(badgeLabel || 'RECORD ID').toUpperCase()}: ${badgeValue}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const bWidth = doc.getTextWidth(bText) + 8;
    const bX = pageWidth - margin - bWidth - 2;
    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.roundedRect(bX, curY - 1, bWidth, 6, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(bText, bX + bWidth / 2, curY + 3.2, { align: 'center' });
  }

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const subX = badgeValue && !agencyName ? pageWidth - margin - 50 : pageWidth - margin - 2;
    doc.text(subtitle, subX, curY + 3.5, { align: 'right' });
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, curY + 6.5, pageWidth - margin, curY + 6.5);

  curY += 9.5;
  return curY;
}
