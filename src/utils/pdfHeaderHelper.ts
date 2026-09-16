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
  compact?: boolean;
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
    startY = options.compact ? 5 : 8,
    compact = false
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const isLandscape = pageWidth > 250;
  const margin = isLandscape ? (compact ? 8 : 10) : 12;
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
  const fontName = (doc as any).__gurmukhiFontRegistered ? 'NotoSansGurmukhi' : 'helvetica';

  // Header Box Top Banner (Deep forest green / slate for official authoritative Mandi look)
  const bannerHeight = compact ? (isLandscape ? 17.5 : 20) : (isLandscape ? 29 : 31);
  doc.setFillColor(15, 23, 42); // Slate-900 / Deep charcoal
  doc.rect(margin, curY, contentWidth, bannerHeight, 'F');

  // Emerald Top Accent Stripe
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(margin, curY, contentWidth, compact ? 1.5 : 2, 'F');

  // 1. FIRM NAME (Centre Aligned at the top, prominent and bold)
  doc.setTextColor(255, 255, 255);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(compact ? (isLandscape ? 12 : 11.5) : (isLandscape ? 15 : 13.5));
  doc.text(firmName, centerX, curY + (compact ? 5.2 : 8.5), { align: 'center' });

  // 2. COMPLETE FIRM ADDRESS (Centre Aligned directly below Firm Name)
  doc.setFont(fontName, 'normal');
  doc.setFontSize(compact ? (isLandscape ? 7.5 : 7) : (isLandscape ? 9 : 8.5));
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(firmAddress, centerX, curY + (compact ? 9.2 : 14.5), { align: 'center' });

  // 3. LICENCE NO, MOBILE NO, PAN CARD NUMBER (Neatly below without crowding)
  doc.setFont(fontName, 'bold');
  doc.setFontSize(compact ? (isLandscape ? 7.2 : 6.8) : (isLandscape ? 8.5 : 8));
  doc.setTextColor(254, 240, 138); // Yellow-200 for high readability
  const creds = `Licence No: ${licenceNo}   •   Mobile: +91 ${mobile}   •   PAN No: ${pan}`;
  doc.text(creds, centerX, curY + (compact ? 13.0 : 20.5), { align: 'center' });

  // 4. Market Committee & Mandi Board Tag (Neatly centered at bottom of header banner)
  doc.setFont(fontName, 'normal');
  doc.setFontSize(compact ? (isLandscape ? 6.8 : 6.5) : (isLandscape ? 8 : 7.5));
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`${marketCommittee} • Punjab Mandi Board (Regd. Govt. Licenced Arthia)`, centerX, curY + (compact ? 16.2 : (isLandscape ? 25.5 : 26.5)), { align: 'center' });

  curY += bannerHeight + (compact ? 2 : 3);

  // 2. AGENCY SECTION - Show ONLY the selected Purchase Agency
  let cleanAgency = agencyName ? cleanPdfText(agencyName).replace(/^PURCHASE\s+AGENCY\s*:\s*/i, '').trim().toUpperCase() : '';

  // Remove generic or hard-coded placeholder strings completely
  if (
    !cleanAgency ||
    cleanAgency === 'ALL' ||
    cleanAgency === 'ALL AGENCIES' ||
    cleanAgency.includes('ALL PROCUREMENT AGENCIES') ||
    cleanAgency.includes('ALL AGENCIES') ||
    cleanAgency.includes('PUNJAB MANDI BOARD') ||
    cleanAgency.includes('MULTIPLE PROCUREMENT') ||
    cleanAgency.includes('PROCUREMENT AGENCY') ||
    cleanAgency.includes('ALLOCATION')
  ) {
    cleanAgency = '';
  }

  const hasAgencyBar = Boolean(cleanAgency);

  if (hasAgencyBar) {
    const agHeight = compact ? 6.5 : 10;
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.roundedRect(margin, curY, contentWidth, agHeight, 1, 1, 'F');
    doc.setDrawColor(52, 211, 153); // Emerald-400 border
    doc.roundedRect(margin, curY, contentWidth, agHeight, 1, 1, 'S');

    doc.setFont(fontName, 'bold');
    doc.setFontSize(compact ? 8.5 : 10);
    doc.setTextColor(6, 78, 59); // Emerald-900
    doc.text(`PURCHASE AGENCY: ${cleanAgency}`, margin + (compact ? 4 : 6), curY + (compact ? 4.5 : 6.6));

    // Badge on the right of Agency bar if provided
    if (badgeValue) {
      const bText = `${(badgeLabel || 'RECORD ID').toUpperCase()}: ${badgeValue}`;
      doc.setFont(fontName, 'bold');
      doc.setFontSize(compact ? 7 : 8);
      const bWidth = doc.getTextWidth(bText) + (compact ? 6 : 8);
      const bX = pageWidth - margin - bWidth - (compact ? 2 : 3);
      doc.setFillColor(16, 185, 129); // Emerald-500
      doc.roundedRect(bX, curY + (compact ? 1.2 : 2), bWidth, compact ? 4.5 : 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(bText, bX + bWidth / 2, curY + (compact ? 4.2 : 6.2), { align: 'center' });
    }

    curY += agHeight + (compact ? 2 : 3);
  }

  // Document Title & Subtitle
  doc.setFont(fontName, 'bold');
  doc.setFontSize(compact ? (isLandscape ? 9.5 : 9) : (isLandscape ? 11 : 10.5));
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), margin + 2, curY + (compact ? 2.8 : 3.5));

  // Badge on the right of Title bar if agency bar was not rendered
  if (badgeValue && !hasAgencyBar) {
    const bText = `${(badgeLabel || 'RECORD ID').toUpperCase()}: ${badgeValue}`;
    doc.setFont(fontName, 'bold');
    doc.setFontSize(compact ? 7 : 8);
    const bWidth = doc.getTextWidth(bText) + (compact ? 6 : 8);
    const bX = pageWidth - margin - bWidth - 2;
    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.roundedRect(bX, curY - (compact ? 0.5 : 1), bWidth, compact ? 4.5 : 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(bText, bX + bWidth / 2, curY + (compact ? 2.8 : 3.2), { align: 'center' });
  }

  if (subtitle) {
    curY += (compact ? 4.5 : 5.5);
    doc.setFont(fontName, 'normal');
    doc.setFontSize(compact ? 7.5 : 8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, margin + 2, curY + (compact ? 2.5 : 3.2));
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, curY + (compact ? 4.5 : 5.5), pageWidth - margin, curY + (compact ? 4.5 : 5.5));

  curY += (compact ? 6.5 : 8.5);
  return curY;
}
