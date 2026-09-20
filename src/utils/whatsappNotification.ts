import { BagsEntryRecord, DailyPurchaseRecord, FarmerPaymentRecord, FarmerAdvanceRecord, MandiFirm, MandiSettings } from '../types/mandi';
import { formatCurrency } from './calculations';

/**
 * Format phone number for WhatsApp URL (Indian standard: +91)
 */
export function cleanMobileForWhatsApp(mobile: string): string {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

/**
 * 1. Bags Weighment (ਤੁਲਾਈ) Slip WhatsApp Message
 */
export function generateBagsWeighmentWhatsAppMessage(params: {
  receipt: BagsEntryRecord;
  firm?: MandiFirm | null;
  settings: MandiSettings;
  language?: 'en' | 'pa';
}): string {
  const { receipt, firm, settings } = params;
  const firmName = firm?.name || settings.firmNameEn || 'Jammu Trading Co';
  const mandiName = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';
  const firmPhone = firm?.mobile || settings.firmMobile || '98147-74651';

  const farmerName = receipt.farmerNamePa || receipt.farmerName;
  const village = receipt.farmerVillagePa || receipt.farmerVillage;

  const totalBags = receipt.bags;
  const weightDisplay = receipt.grandTotalDisplay;
  const tota = receipt.totaKg > 0 ? ` (+${receipt.totaKg} Kg ਟੋਟਾ)` : '';
  const netAmount = formatCurrency(receipt.netAmount ?? receipt.totalAmount);

  return (
`🌾 *ਕਿਸਾਨ ਜਿਨਸ ਤੁਲਾਈ ਰਸੀਦ (Weighment Slip)* 🌾
-----------------------------------
🏛 *${firmName.toUpperCase()}*
📍 ${mandiName} | 📞 ${firmPhone}
-----------------------------------
👤 *ਕਿਸਾਨ:* ${farmerName} (${receipt.farmerId})
🏡 *ਪਿੰਡ:* ${village}
📅 *ਮਿਤੀ:* ${receipt.date}
🧾 *ਪਰਚੀ ਨੰਬਰ:* ${receipt.entryNumber}

📦 *ਕੁੱਲ ਬੋਰੀਆਂ:* ${totalBags} ਬੋਰੀਆਂ (37.50 Kg ਹਰ ਬੋਰੀ)
⚖ *ਕੁੱਲ ਵਜ਼ਨ:* ${weightDisplay}${tota}
🌾 *ਬਾਰਦਾਨਾ:* ${receipt.bardana === 'OLD' ? 'ਪੁਰਾਣਾ (Old)' : 'ਨਵਾਂ (New)'}
💰 *ਸਰਕਾਰੀ ਭਾਅ:* ₹2,461 ਪ੍ਰਤੀ ਕੁਇੰਟਲ
💵 *ਕੁੱਲ ਰਕਮ:* ${netAmount}
-----------------------------------
ਜੇਕਰ ਕੋਈ ਸਵਾਲ ਹੋਵੇ ਤਾਂ ਕਿਰਪਾ ਕਰਕੇ ਦੁਕਾਨ 'ਤੇ ਸੰਪਰਕ ਕਰੋ ਜੀ।
ਧੰਨਵਾਦ! 🙏`
  );
}

/**
 * 2. Daily Purchase (ਸਰਕਾਰੀ ਖਰੀਦ) WhatsApp Message
 */
export function generateDailyPurchaseWhatsAppMessage(params: {
  purchase: DailyPurchaseRecord;
  firm?: MandiFirm | null;
  settings: MandiSettings;
}): string {
  const { purchase, firm, settings } = params;
  const firmName = firm?.name || settings.firmNameEn || 'Jammu Trading Co';
  const firmPhone = firm?.mobile || settings.firmMobile || '98147-74651';

  const farmerName = purchase.farmerNamePa || purchase.farmerName;
  const village = purchase.villagePa || purchase.village || purchase.farmerVillage || '';
  const netAmount = formatCurrency(purchase.netAmount ?? purchase.totalAmount);

  return (
`🌾 *ਰੋਜ਼ਾਨਾ ਸਰਕਾਰੀ ਖਰੀਦ ਪੁਸ਼ਟੀ (Purchase Confirmed)* 🌾
-----------------------------------
🏛 *${firmName.toUpperCase()}*
📞 ਸੰਪਰਕ: ${firmPhone}
-----------------------------------
👤 *ਕਿਸਾਨ:* ${farmerName} (${purchase.farmerId})
${village ? `🏡 *ਪਿੰਡ:* ${village}\n` : ''}📅 *ਮਿਤੀ:* ${purchase.date}
🏢 *ਖਰੀਦ ਏਜੰਸੀ:* ${purchase.agencyPa || purchase.agency}

📦 *ਖਰੀਦੀਆਂ ਬੋਰੀਆਂ:* ${purchase.bags} ਬੋਰੀਆਂ
⚖ *ਵਜ਼ਨ:* ${purchase.totalWeightDisplay || `${purchase.qul} ਕੁਇੰਟਲ ${purchase.kg} ਕਿਲੋ`}
💰 *ਸਰਕਾਰੀ ਰੇਟ:* ₹${purchase.rate} ਪ੍ਰਤੀ ਕੁਇੰਟਲ
💵 *ਕੁੱਲ ਰਕਮ:* ${netAmount}
-----------------------------------
ਤੁਹਾਡੀ ਜਿਨਸ ਸਫਲਤਾਪੂਰਵਕ ਸਰਕਾਰੀ ਏਜੰਸੀ ਵੱਲੋਂ ਖਰੀਦੀ ਜਾ ਚੁੱਕੀ ਹੈ।
ਧੰਨਵਾਦ! 🙏`
  );
}

/**
 * 3. Payment Received / Transferred WhatsApp Message
 */
export function generatePaymentWhatsAppMessage(params: {
  payment: FarmerPaymentRecord;
  farmerName: string;
  firm?: MandiFirm | null;
  settings: MandiSettings;
}): string {
  const { payment, farmerName, firm, settings } = params;
  const firmName = firm?.name || settings.firmNameEn || 'Jammu Trading Co';

  return (
`✅ *ਭੁਗਤਾਨ ਸੂਚਨਾ (Payment Update)* ✅
-----------------------------------
🏛 *${firmName.toUpperCase()}*
-----------------------------------
👤 *ਕਿਸਾਨ:* ${farmerName} (${payment.farmerId})
📅 *ਮਿਤੀ:* ${payment.date}
💳 *ਭੁਗਤਾਨ ਦਾ ਤਰੀਕਾ:* ${payment.paymentMode}
${payment.referenceNumber ? `🔢 *ਰੈਫਰੈਂਸ/UTR ਨੰਬਰ:* ${payment.referenceNumber}\n` : ''}💰 *ਅਦਾ ਕੀਤੀ ਰਕਮ:* ${formatCurrency(payment.amount)}
${payment.agency ? `🏢 *ਏਜੰਸੀ:* ${payment.agency}\n` : ''}-----------------------------------
ਤੁਹਾਡਾ ਭੁਗਤਾਨ ਖਾਤੇ ਵਿੱਚ ਦਰਜ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।
ਧੰਨਵਾਦ! 🙏`
  );
}

/**
 * 4. Advance / Loan WhatsApp Message
 */
export function generateAdvanceWhatsAppMessage(params: {
  advance: FarmerAdvanceRecord;
  farmerName: string;
  firm?: MandiFirm | null;
  settings: MandiSettings;
}): string {
  const { advance, farmerName, firm, settings } = params;
  const firmName = firm?.name || settings.firmNameEn || 'Jammu Trading Co';

  return (
`📜 *ਪੇਸ਼ਗੀ / ਐਡਵਾਂਸ ਰਿਕਾਰਡ (Advance Receipt)* 📜
-----------------------------------
🏛 *${firmName.toUpperCase()}*
-----------------------------------
👤 *ਕਿਸਾਨ:* ${farmerName} (${advance.farmerId})
📅 *ਮਿਤੀ:* ${advance.date}
💵 *ਮੂਲ ਰਕਮ (Principal):* ${formatCurrency(advance.amount)}
📈 *ਮਾਸਿਕ ਵਿਆਜ ਦਰ:* ${advance.monthlyInterestRate}% ਪ੍ਰਤੀ ਮਹੀਨਾ
-----------------------------------
ਇਹ ਰਕਮ ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਐਡਵਾਂਸ ਵਜੋਂ ਦਰਜ ਹੈ।
ਧੰਨਵਾਦ! 🙏`
  );
}

/**
 * Helper to open WhatsApp Web or App
 */
export function openWhatsApp(mobile: string, message: string): void {
  const cleanPhone = cleanMobileForWhatsApp(mobile);
  const encodedMsg = encodeURIComponent(message);
  
  if (cleanPhone) {
    const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    // If no mobile provided, open general WhatsApp share link
    const url = `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * 5. Farmer Full Season Account Statement WhatsApp Message
 */
export function generateSeasonStatementWhatsAppMessage(params: {
  accountSummary: any;
  firm?: MandiFirm | null;
  settings: MandiSettings;
  dateStr?: string;
}): string {
  const { accountSummary, firm, settings, dateStr } = params;
  const firmName = firm?.name || settings.firmNameEn || 'Jammu Trading Co';
  const mandiName = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';
  const firmPhone = firm?.mobile || settings.firmMobile || '98147-74651';

  const farmer = accountSummary.farmer;
  const farmerName = farmer.farmerNamePa ? `${farmer.farmerNamePa} (${farmer.farmerName})` : farmer.farmerName;
  const village = farmer.villagePa || farmer.village || '—';
  const todayDate = dateStr || new Date().toLocaleDateString('en-GB');

  const totalBags = accountSummary.purchasedBags || accountSummary.mandiArrivalBags || 0;
  const totalWeight = accountSummary.purchasedWeightDisplay || accountSummary.mandiArrivalDisplay || '0.00 Qul';
  const grossAmount = formatCurrency(accountSummary.totalGrossAmount || 0);
  const deductions = accountSummary.totalLabourDeductions || accountSummary.totalDeductions || 0;
  const netCropValue = formatCurrency(accountSummary.netPayableAmount || 0);
  const totalPaid = accountSummary.paidAmount || 0;
  const totalAdv = accountSummary.totalAdvanceAmount || 0;

  const netBalance = accountSummary.finalBalance ?? accountSummary.finalNetSettlementBalance ?? 0;
  const netBalanceText = netBalance >= 0
    ? `⭐ *ਬਾਕੀ ਦੇਣਯੋਗ ਰਕਮ (Payable to Farmer):* ${formatCurrency(netBalance)}`
    : `⚠️ *ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ (Due from Farmer):* ${formatCurrency(Math.abs(netBalance))}`;

  const lines: string[] = [
    `🌾 *ਕਿਸਾਨ ਖਾਤਾ ਹਿਸਾਬ-ਕਿਤਾਬ ਸਟੇਟਮੈਂਟ* 🌾`,
    `-----------------------------------`,
    `🏛 *${firmName.toUpperCase()}*`,
    `📍 ${mandiName} | 📞 ${firmPhone}`,
    `-----------------------------------`,
    `👤 *ਕਿਸਾਨ:* ${farmerName}`,
    `🆔 *ਖਾਤਾ ਨੰਬਰ:* ${farmer.id}`,
    `🏡 *ਪਿੰਡ:* ${village}`,
    `📅 *ਤਾਰੀਖ:* ${todayDate}`,
    `-----------------------------------`,
    `📦 *ਕੁੱਲ ਆਮਦ ਬੋਰੀਆਂ:* ${totalBags} ਬੋਰੀਆਂ`,
    `⚖ *ਕੁੱਲ ਵਜ਼ਨ:* ${totalWeight}`,
    `💰 *ਕੁੱਲ ਫਸਲ ਰਕਮ:* ${grossAmount}`,
    deductions > 0 ? `✂ *ਕੁੱਲ ਖਰਚਾ/ਕਟੌਤੀ:* ${formatCurrency(deductions)}` : '',
    `💵 *ਸ਼ੁੱਧ ਫਸਲ ਰਕਮ:* ${netCropValue}`,
    `-----------------------------------`,
    totalPaid > 0 ? `💳 *ਪਹਿਲਾਂ ਦਿੱਤਾ ਭੁਗਤਾਨ (Paid):* ${formatCurrency(totalPaid)}` : '',
    totalAdv > 0 ? `🤝 *ਐਡਵਾਂਸ + ਵਿਆਜ (Advance):* ${formatCurrency(totalAdv)}` : '',
    `-----------------------------------`,
    netBalanceText,
    `-----------------------------------`,
    `ਕਿਸੇ ਵੀ ਸ਼ੰਕੇ ਜਾਂ ਜਾਣਕਾਰੀ ਲਈ ਦੁਕਾਨ 'ਤੇ ਸੰਪਰਕ ਕਰੋ ਜੀ।`,
    `ਧੰਨਵਾਦ! 🙏`
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * 6. Today's Weighment Summary WhatsApp Message (for farmers who brought crop today)
 */
export function generateTodayWeighmentSummaryWhatsAppMessage(params: {
  farmerName: string;
  farmerId: string;
  village: string;
  todayEntries: BagsEntryRecord[];
  firm?: MandiFirm | null;
  settings: MandiSettings;
  dateStr?: string;
}): string {
  const { farmerName, farmerId, village, todayEntries, firm, settings, dateStr } = params;
  const firmName = firm?.name || settings.firmNameEn || 'Jammu Trading Co';
  const mandiName = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';
  const firmPhone = firm?.mobile || settings.firmMobile || '98147-74651';
  const dateDisplay = dateStr || new Date().toLocaleDateString('en-GB');

  const totalBags = todayEntries.reduce((sum, e) => sum + (Number(e.bags) || 0), 0);
  const totalWeightKg = todayEntries.reduce((sum, e) => sum + (Number(e.grandTotalKg) || 0), 0);
  const qul = Math.floor(totalWeightKg / 100);
  const kg = Math.round(totalWeightKg % 100);
  const totalAmount = todayEntries.reduce((sum, e) => sum + (Number(e.netAmount ?? e.totalAmount) || 0), 0);
  const parchiNumbers = todayEntries.map(e => `#${e.entryNumber}`).join(', ');

  return (
`🌾 *ਅੱਜ ਦੀ ਤੁਲਾਈ ਪੁਸ਼ਟੀ (Today's Weighment)* 🌾
-----------------------------------
🏛 *${firmName.toUpperCase()}*
📍 ${mandiName} | 📞 ${firmPhone}
-----------------------------------
👤 *ਕਿਸਾਨ:* ${farmerName} (${farmerId})
🏡 *ਪਿੰਡ:* ${village || '—'}
📅 *ਮਿਤੀ:* ${dateDisplay}
🧾 *ਪਰਚੀ ਨੰਬਰ:* ${parchiNumbers}

📦 *ਅੱਜ ਤੁਲੀਆਂ ਬੋਰੀਆਂ:* ${totalBags} ਬੋਰੀਆਂ
⚖ *ਅੱਜ ਦਾ ਵਜ਼ਨ:* ${qul} ਕੁਇੰਟਲ ${kg} ਕਿਲੋ
💰 *ਅੰਦਾਜ਼ਨ ਰਕਮ:* ${formatCurrency(totalAmount)}
-----------------------------------
ਤੁਹਾਡੀ ਜਿਨਸ ਸਫਲਤਾਪੂਰਵਕ ਤੋਲੀ ਜਾ ਚੁੱਕੀ ਹੈ।
ਧੰਨਵਾਦ! 🙏`
  );
}

