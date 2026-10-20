/**
 * Mandi Branch Helper
 * Centralised labels and options for Mandi Branch Dropdown Selectors across the application.
 */

export interface MandiBranchConfig {
  id: string;
  code: string;
  dropdownLabel: string;
  plainLabel: string;
  namePa: string;
  nameEn: string;
}

export const MANDI_BRANCH_CONFIGS: MandiBranchConfig[] = [
  {
    id: 'DEMO-FIRM-001',
    code: 'MF',
    dropdownLabel: '[ MANDI BRANCH: MAIN GRAIN MARKET (ਮੁੱਖ ਦਾਣਾ ਮੰਡੀ) ]',
    plainLabel: 'MAIN GRAIN MARKET (ਮੁੱਖ ਦਾਣਾ ਮੰਡੀ)',
    namePa: 'ਮੁੱਖ ਦਾਣਾ ਮੰਡੀ',
    nameEn: 'Main Grain Market'
  },
  {
    id: 'DEMO-FIRM-002',
    code: 'B2',
    dropdownLabel: '[ MANDI BRANCH: DANA MANDI BRANCH 2 (ਦਾਣਾ ਮੰਡੀ ਬ੍ਰਾਂਚ 2) ]',
    plainLabel: 'DANA MANDI BRANCH 2 (ਦਾਣਾ ਮੰਡੀ ਬ੍ਰਾਂਚ 2)',
    namePa: 'ਦਾਣਾ ਮੰਡੀ ਬ੍ਰਾਂਚ 2',
    nameEn: 'Dana Mandi Branch 2'
  }
];

export const ALL_MANDIS_DROPDOWN_LABEL = '🌟 [ ALL MANDIS: ਸਾਰੀਆਂ ਮੰਡੀਆਂ (ਮੁੱਖ ਮੰਡੀ • ਬ੍ਰਾਂਚ 2) ]';

/**
 * Returns formatted dropdown label for any firm or firmId:
 * e.g. "[ MANDI BRANCH: MAIN GRAIN MARKET (ਮੁੱਖ ਦਾਣਾ ਮੰਡੀ) ]"
 */
export function getMandiBranchDropdownLabel(
  firmOrId: string | { id: string; name?: string; address?: string; namePa?: string } | null | undefined
): string {
  if (!firmOrId) return MANDI_BRANCH_CONFIGS[0].dropdownLabel;

  const id = typeof firmOrId === 'string' ? firmOrId : firmOrId.id;
  const name = typeof firmOrId === 'object' ? (firmOrId.name || '') : '';
  const namePa = typeof firmOrId === 'object' ? (firmOrId.namePa || '') : '';

  if (id === 'DEMO-FIRM-001' || id === 'FIRM-001') {
    return '[ MANDI BRANCH: MAIN GRAIN MARKET (ਮੁੱਖ ਦਾਣਾ ਮੰਡੀ) ]';
  }
  if (id === 'DEMO-FIRM-002' || id === 'FIRM-002' || name.toLowerCase().includes('branch 2')) {
    return '[ MANDI BRANCH: DANA MANDI BRANCH 2 (ਦਾਣਾ ਮੰਡੀ ਬ੍ਰਾਂਚ 2) ]';
  }

  if (typeof firmOrId === 'object' && firmOrId.name) {
    const labelPa = namePa ? ` (${namePa})` : '';
    return `[ MANDI BRANCH: ${firmOrId.name.toUpperCase()}${labelPa} ]`;
  }
  return `[ MANDI BRANCH: ${id} ]`;
}

/**
 * Returns clean plain label for headers & PDFs:
 * e.g. "MAIN GRAIN MARKET (ਮੁੱਖ ਦਾਣਾ ਮੰਡੀ)"
 */
export function getMandiBranchPlainLabel(
  firmOrId: string | { id: string; name?: string; address?: string; namePa?: string } | null | undefined
): string {
  if (!firmOrId || firmOrId === 'ALL') {
    return 'ALL MANDIS (ਸਾਰੀਆਂ ਮੰਡੀਆਂ: ਮੁੱਖ ਮੰਡੀ • ਬ੍ਰਾਂਚ 2)';
  }

  const id = typeof firmOrId === 'string' ? firmOrId : firmOrId.id;
  const name = typeof firmOrId === 'object' ? (firmOrId.name || '') : '';
  const namePa = typeof firmOrId === 'object' ? (firmOrId.namePa || '') : '';

  if (id === 'DEMO-FIRM-001' || id === 'FIRM-001') {
    return 'MAIN GRAIN MARKET (ਮੁੱਖ ਦਾਣਾ ਮੰਡੀ)';
  }
  if (id === 'DEMO-FIRM-002' || id === 'FIRM-002' || name.toLowerCase().includes('branch 2')) {
    return 'DANA MANDI BRANCH 2 (ਦਾਣਾ ਮੰਡੀ ਬ੍ਰਾਂਚ 2)';
  }

  if (typeof firmOrId === 'object' && firmOrId.name) {
    return namePa ? `${firmOrId.name} (${namePa})` : firmOrId.name;
  }
  return id;
}
