import * as XLSX from 'xlsx';
import { DailyPurchaseRecord } from '../types/mandi';

/**
 * Export Daily Purchase records directly to Excel (.xlsx) format
 */
export function exportDailyPurchaseRegisterExcel(
  records: DailyPurchaseRecord[],
  firmName = 'JAMMU TRADING CO.',
  dateStr = ''
) {
  if (!records || records.length === 0) return;

  const data = records.map((r, idx) => ({
    'Sr No': idx + 1,
    'Entry No': r.id,
    'Date': r.date,
    'Agency': r.agency,
    'Farmer Name': r.farmerName,
    'Farmer Name (PA)': r.farmerNamePa || '',
    'Father Name': r.farmerFatherName || r.fatherName || '',
    'Village': r.farmerVillage || r.village || '',
    'Village (PA)': r.farmerVillagePa || r.villagePa || '',
    'Mobile': r.farmerMobile || r.mobile || '',
    'New Bags': r.newBags || 0,
    'Old Bags': r.oldBags || 0,
    'Total Bags': r.bags,
    'Weight Display': r.totalWeightDisplay || `${r.qul} Qtl ${r.kg} Kg`,
    'Weight (Kg)': r.totalWeightKg,
    'Rate (Rs/Qtl)': r.rate,
    'Gross Amount (Rs)': r.totalAmount,
    'Labour Deductions (Rs)': r.labourDeductions?.grandTotalDeductions || 0,
    'Net Payable (Rs)': r.netAmount ?? r.totalAmount
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 14 }, // Entry No
    { wch: 12 }, // Date
    { wch: 15 }, // Agency
    { wch: 20 }, // Farmer Name
    { wch: 20 }, // Farmer Name (PA)
    { wch: 18 }, // Father Name
    { wch: 16 }, // Village
    { wch: 16 }, // Village (PA)
    { wch: 14 }, // Mobile
    { wch: 10 }, // New Bags
    { wch: 10 }, // Old Bags
    { wch: 12 }, // Total Bags
    { wch: 18 }, // Weight Display
    { wch: 12 }, // Weight Kg
    { wch: 14 }, // Rate
    { wch: 16 }, // Gross Amount
    { wch: 16 }, // Labour Deductions
    { wch: 16 }  // Net Payable
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Purchase');

  const cleanDate = dateStr ? dateStr.replace(/[\/\-]/g, '_') : new Date().toISOString().split('T')[0];
  const fileName = `Daily_Purchase_${cleanDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
