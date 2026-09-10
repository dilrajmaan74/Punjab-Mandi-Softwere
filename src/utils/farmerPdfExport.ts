import { jsPDF } from 'jspdf';
import { Farmer, MandiSettings } from '../types/mandi';
import { cleanPdfText } from './translations';
import { renderStandardPdfHeader } from './pdfHeaderHelper';

function cleanText(text: string | number | null | undefined): string {
  return cleanPdfText(text);
}

/**
 * Generate and download a formatted Farmer Profile PDF
 */
export async function exportFarmerProfilePDF(farmer: Farmer, settings: MandiSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Standardized Firm Header
  let currentY = renderStandardPdfHeader({
    doc,
    settings,
    title: 'FARMER REGISTRATION CERTIFICATE / KISAN CARD',
    subtitle: `Registration Date: ${new Date().toLocaleDateString('en-GB')}`,
    badgeLabel: 'FARMER ID',
    badgeValue: farmer.id,
    startY: 8
  });

  // Section 1: Farmer Identity & Photo
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 58, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 58, 2, 2, 'S');

  // Embed Farmer Photo
  const photoSize = 36;
  const photoX = margin + 6;
  const photoY = currentY + 6;

  if (farmer.photoUrl) {
    try {
      doc.addImage(farmer.photoUrl, 'JPEG', photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(203, 213, 225);
      doc.rect(photoX, photoY, photoSize, photoSize, 'S');
    } catch {
      drawPhotoPlaceholder(doc, photoX, photoY, photoSize, 'Farmer Photo');
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoSize, 'No Photo');
  }

  // Farmer Details beside Photo
  const detailsX = photoX + photoSize + 8;
  let textY = currentY + 12;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(cleanText(farmer.farmerName) || 'Farmer Name', detailsX, textY);

  textY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text("Father Name:", detailsX, textY);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(farmer.fatherName) || '-', detailsX + 28, textY);

  textY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Village / District:', detailsX, textY);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(farmer.village) || '-', detailsX + 28, textY);

  textY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('PIN Code:', detailsX, textY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${farmer.pinCode || '141401'}`, detailsX + 28, textY);

  textY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Mobile Number:', detailsX, textY);
  doc.setFont('helvetica', 'bold');
  doc.text(farmer.mobile ? `+91 ${farmer.mobile}` : '-', detailsX + 28, textY);

  textY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Aadhaar Number:', detailsX, textY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text(farmer.aadhaar || '-', detailsX + 28, textY);

  currentY += 64;

  // Address Row if present
  if (farmer.address) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Full Address:', margin + 4, currentY + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(cleanText(farmer.address), margin + 4, currentY + 10);
    currentY += 18;
  }

  // Section 2: Aadhaar Card Images (Front & Back)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AADHAAR CARD DOCUMENTS (FRONT & BACK COPIES)', margin, currentY);

  currentY += 4;
  const aadhaarCardWidth = (contentWidth - 8) / 2;
  const aadhaarCardHeight = 46;

  // Front Aadhaar Box
  const frontX = margin;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(frontX, currentY, aadhaarCardWidth, aadhaarCardHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(frontX, currentY, aadhaarCardWidth, aadhaarCardHeight, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Aadhaar Card - FRONT SIDE', frontX + 4, currentY + 5);

  const frontImgUrl = farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl;
  if (frontImgUrl) {
    try {
      doc.addImage(frontImgUrl, 'JPEG', frontX + 3, currentY + 7, aadhaarCardWidth - 6, aadhaarCardHeight - 10);
    } catch {
      drawPhotoPlaceholder(doc, frontX + 3, currentY + 7, aadhaarCardWidth - 6, 'Aadhaar Front Image');
    }
  } else {
    drawPhotoPlaceholder(doc, frontX + 3, currentY + 7, aadhaarCardWidth - 6, 'No Front Copy Uploaded');
  }

  // Back Aadhaar Box
  const backX = margin + aadhaarCardWidth + 8;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(backX, currentY, aadhaarCardWidth, aadhaarCardHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(backX, currentY, aadhaarCardWidth, aadhaarCardHeight, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Aadhaar Card - BACK SIDE (Address)', backX + 4, currentY + 5);

  const backImgUrl = farmer.aadhaarBackUrl;
  if (backImgUrl) {
    try {
      doc.addImage(backImgUrl, 'JPEG', backX + 3, currentY + 7, aadhaarCardWidth - 6, aadhaarCardHeight - 10);
    } catch {
      drawPhotoPlaceholder(doc, backX + 3, currentY + 7, aadhaarCardWidth - 6, 'Aadhaar Back Image');
    }
  } else {
    drawPhotoPlaceholder(doc, backX + 3, currentY + 7, aadhaarCardWidth - 6, 'No Back Copy Uploaded');
  }

  currentY += aadhaarCardHeight + 8;

  // Section 3: Bank Account Details
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BANK ACCOUNT & DIRECT BENEFIT TRANSFER (DBT) DETAILS', margin, currentY);

  currentY += 4;
  const bankCardHeight = farmer.bankDetails?.branchAddress ? 34 : 26;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, bankCardHeight, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, bankCardHeight, 2, 2, 'S');

  if (farmer.bankDetails?.accountNumber) {
    const col1 = margin + 4;
    const col2 = margin + 55;
    const col3 = margin + 120;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Account Holder:', col1, currentY + 6);
    doc.text('Official Bank Name:', col2, currentY + 6);
    doc.text('IFSC Code:', col3, currentY + 6);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(cleanText(farmer.bankDetails.accountHolderName || farmer.farmerName), col1, currentY + 11);
    
    // Bank name wrapped if needed
    const bankNameLines = doc.splitTextToSize(cleanText(farmer.bankDetails.bankName) || '-', 62);
    doc.text(bankNameLines, col2, currentY + 11);
    doc.text(farmer.bankDetails.ifscCode || '-', col3, currentY + 11);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Account Number:', col1, currentY + 18);
    doc.text('Branch Name:', col2, currentY + 18);
    doc.text('City / District:', col3, currentY + 18);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(farmer.bankDetails.accountNumber || '-', col1, currentY + 23);
    doc.text(cleanText(farmer.bankDetails.branchName) || 'Main Branch', col2, currentY + 23);
    const locStr = [cleanText(farmer.bankDetails.city || farmer.bankDetails.district), cleanText(farmer.bankDetails.state)].filter(Boolean).join(', ');
    doc.text(locStr || 'Punjab', col3, currentY + 23);

    if (farmer.bankDetails.branchAddress) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const addrLines = doc.splitTextToSize(`Complete Bank Address: ${cleanText(farmer.bankDetails.branchAddress)}`, contentWidth - 8);
      doc.text(addrLines, col1, currentY + 29);
    }
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Bank details have not been registered yet. Can be added under Bank Details Manager.', margin + 6, currentY + 13);
  }

  currentY += bankCardHeight + 8;

  // Footer / Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 8;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString()}`, margin, currentY);
  doc.text(`Official Punjab Mandi Portal | System Verified Record`, pageWidth - margin - 75, currentY);

  currentY += 12;
  doc.text('_____________________________', margin + 6, currentY);
  doc.text('_____________________________', pageWidth - margin - 56, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('Farmer Signature / Thumb Impression', margin + 6, currentY);
  doc.text('Authorized Mandi Sign & Stamp', pageWidth - margin - 56, currentY);

  // Save the PDF
  const filename = `Farmer_${farmer.id}_${cleanText(farmer.farmerName).replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, size: number, text: string) {
  doc.setFillColor(241, 245, 249);
  doc.rect(x, y, size, size > 40 ? 36 : size, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(x, y, size, size > 40 ? 36 : size, 'S');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text(text, x + 4, y + 15);
}

/**
 * Open high-resolution printable profile window for direct print / PDF save
 */
export function openFarmerPrintWindow(farmer: Farmer, settings: MandiSettings) {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Farmer Profile - ${farmer.id} - ${farmer.farmerName}</title>
      <meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 12mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 10px;
          line-height: 1.4;
        }
        .header {
          background: #0f382c;
          color: white;
          padding: 14px 18px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .header-title { font-size: 18px; font-weight: 900; margin: 0; }
        .header-sub { font-size: 12px; opacity: 0.9; margin-top: 2px; }
        .badge {
          background: #f59e0b;
          color: #000;
          padding: 6px 14px;
          border-radius: 6px;
          font-weight: 900;
          font-size: 14px;
          text-align: right;
        }
        .section {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 14px;
          background: #f8fafc;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #334155;
          margin-bottom: 10px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .profile-row {
          display: flex;
          gap: 16px;
        }
        .photo-box {
          width: 120px;
          height: 120px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .photo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
          font-size: 12px;
          flex: 1;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px 16px;
          font-size: 12px;
        }
        .field-label {
          color: #64748b;
          font-size: 11px;
          display: block;
        }
        .field-val {
          font-weight: 700;
          color: #0f172a;
        }
        .aadhaar-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .aadhaar-card {
          border: 1px dashed #cbd5e1;
          background: #ffffff;
          padding: 8px;
          border-radius: 6px;
          text-align: center;
        }
        .aadhaar-card img {
          max-height: 140px;
          max-width: 100%;
          object-fit: contain;
          border-radius: 4px;
        }
        .footer {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .sign-box {
          text-align: center;
          margin-top: 30px;
          font-weight: bold;
          color: #334155;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="header-title">${settings.firmNameEn || settings.mandiNameEn}</h1>
          <div class="header-sub">${settings.firmAddress || settings.mandiNameEn}</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 3px;">
            Licence No: <strong>${settings.firmLicence || 'N/A'}</strong> &nbsp;|&nbsp; Mobile: <strong>${settings.firmMobile || 'N/A'}</strong> &nbsp;|&nbsp; PAN: <strong>${settings.firmPan || 'N/A'}</strong>
          </div>
          <div style="font-size: 10px; color: #86efac; margin-top: 2px;">
            ${settings.marketCommitteeEn || 'Market Committee'} • Punjab Mandi Board
          </div>
        </div>
        <div class="badge">
          <div style="font-size: 9px;">FARMER ID</div>
          ${farmer.id}
        </div>
      </div>

      <div class="section">
        <div class="section-title">ਕਿਸਾਨ ਵੇਰਵੇ (Farmer Identity)</div>
        <div class="profile-row">
          <div class="photo-box">
            ${
              farmer.photoUrl
                ? `<img src="${farmer.photoUrl}" alt="Farmer" />`
                : `<span style="font-size: 11px; color: #94a3b8;">ਕੋਈ ਫੋਟੋ ਨਹੀਂ</span>`
            }
          </div>
          <div class="grid-2">
            <div>
              <span class="field-label">ਕਿਸਾਨ ਦਾ ਨਾਂ (Farmer Name):</span>
              <span class="field-val" style="font-size: 14px;">${farmer.farmerNamePa} (${farmer.farmerName})</span>
            </div>
            <div>
              <span class="field-label">ਪਿਤਾ ਦਾ ਨਾਂ (Father Name):</span>
              <span class="field-val">${farmer.fatherNamePa || farmer.fatherName || '—'} (${farmer.fatherName || ''})</span>
            </div>
            <div>
              <span class="field-label">ਪਿੰਡ (Village / Pind):</span>
              <span class="field-val">${farmer.villagePa || farmer.village} (${farmer.village})</span>
            </div>
            <div>
              <span class="field-label">ਪਿੰਨ ਕੋਡ (PIN Code):</span>
              <span class="field-val">${farmer.pinCode || '141401'}</span>
            </div>
            <div>
              <span class="field-label">ਮੋਬਾਈਲ ਨੰਬਰ (Mobile No):</span>
              <span class="field-val">+91 ${farmer.mobile}</span>
            </div>
            <div>
              <span class="field-label">ਆਧਾਰ ਨੰਬਰ (Aadhaar No):</span>
              <span class="field-val" style="color: #0f766e;">${farmer.aadhaar}</span>
            </div>
            ${
              farmer.address
                ? `<div style="grid-column: span 2;">
                    <span class="field-label">ਪੂਰਾ ਪਤਾ (Address):</span>
                    <span class="field-val">${farmer.address}</span>
                  </div>`
                : ''
            }
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">ਆਧਾਰ ਕਾਰਡ ਦਸਤਾਵੇਜ਼ (Aadhaar Card Front & Back)</div>
        <div class="aadhaar-grid">
          <div class="aadhaar-card">
            <span class="field-label" style="font-weight: bold; margin-bottom: 6px;">Aadhaar FRONT (ਮੁੱਖ ਪਾਸਾ)</span>
            ${
              farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl
                ? `<img src="${farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl}" alt="Aadhaar Front" />`
                : `<div style="padding: 30px; color: #94a3b8; font-size: 11px;">ਫਰੰਟ ਫੋਟੋ ਉਪਲਬਧ ਨਹੀਂ</div>`
            }
          </div>
          <div class="aadhaar-card">
            <span class="field-label" style="font-weight: bold; margin-bottom: 6px;">Aadhaar BACK (ਪਿਛਲਾ ਪਾਸਾ - ਪਤਾ)</span>
            ${
              farmer.aadhaarBackUrl
                ? `<img src="${farmer.aadhaarBackUrl}" alt="Aadhaar Back" />`
                : `<div style="padding: 30px; color: #94a3b8; font-size: 11px;">ਬੈਕ ਫੋਟੋ ਉਪਲਬਧ ਨਹੀਂ</div>`
            }
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ (Official Bank & DBT Details)</div>
        ${
          farmer.bankDetails?.accountNumber
            ? `
          <div class="grid-3">
            <div style="grid-column: span 2;">
              <span class="field-label">ਬੈਂਕ ਦਾ ਪੂਰਾ ਅਧਿਕਾਰਤ ਨਾਂ (Official Bank Name):</span>
              <span class="field-val" style="font-weight: bold; font-size: 13px;">${farmer.bankDetails.bankName}</span>
            </div>
            <div>
              <span class="field-label">IFSC ਕੋਡ:</span>
              <span class="field-val" style="font-family: monospace; font-weight: bold;">${farmer.bankDetails.ifscCode}</span>
            </div>
            <div>
              <span class="field-label">ਖਾਤਾ ਧਾਰਕ (Account Holder):</span>
              <span class="field-val">${farmer.bankDetails.accountHolderName || farmer.farmerName}</span>
            </div>
            <div>
              <span class="field-label">ਖਾਤਾ ਨੰਬਰ (Account Number):</span>
              <span class="field-val" style="font-family: monospace; font-weight: bold;">${farmer.bankDetails.accountNumber}</span>
            </div>
            <div>
              <span class="field-label">ਸ਼ਾਖਾ (Branch Name):</span>
              <span class="field-val">${farmer.bankDetails.branchName || 'Main Branch'}</span>
            </div>
            ${
              farmer.bankDetails.branchAddress
                ? `
            <div style="grid-column: span 3; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; margin-top: 4px;">
              <span class="field-label" style="font-weight: bold; color: #475569;">ਬੈਂਕ ਦਾ ਪੂਰਾ ਅਧਿਕਾਰਤ ਪਤਾ (Complete Official Registered Bank Address):</span>
              <span class="field-val" style="font-size: 11px; line-height: 1.4; color: #0f172a;">${farmer.bankDetails.branchAddress}</span>
            </div>
            `
                : ''
            }
          </div>
        `
            : `<div style="color: #94a3b8; font-size: 12px;">ਬੈਂਕ ਵੇਰਵੇ ਦਰਜ ਨਹੀਂ ਕੀਤੇ ਗਏ।</div>`
        }
      </div>

      <div class="footer">
        <div>
          ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਮਿਤੀ: ${new Date(farmer.createdAt || Date.now()).toLocaleDateString('en-GB')}
        </div>
        <div>
          Official System Verified Record • Punjab Mandi Software
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px;">
        <div class="sign-box">
          ____________________________<br />
          ਕਿਸਾਨ ਦਸਤਖਤ / ਅੰਗੂਠਾ<br />
          (Farmer Signature / Thumb)
        </div>
        <div class="sign-box">
          ____________________________<br />
          ਮੰਡੀ ਅਧਿਕਾਰੀ / ਆੜ੍ਹਤੀਆ ਮੋਹਰ<br />
          (Authorized Sign & Stamp)
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
