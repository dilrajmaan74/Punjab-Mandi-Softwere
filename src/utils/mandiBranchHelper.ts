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
    id: 'FIRM-001',
    code: 'KK',
    dropdownLabel: '[ MANDI BRANCH: DANA MANDI KANG KHURD (ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ) ]',
    plainLabel: 'DANA MANDI KANG KHURD (ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ)',
    namePa: 'ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ',
    nameEn: 'Dana Mandi Kang Khurd'
  },
  {
    id: 'FIRM-002',
    code: 'MW',
    dropdownLabel: '[ MANDI BRANCH: DANA MANDI MEHRAJWALA (ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ) ]',
    plainLabel: 'DANA MANDI MEHRAJWALA (ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ)',
    namePa: 'ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ',
    nameEn: 'Dana Mandi Mehrajwala'
  },
  {
    id: 'FIRM-003',
    code: 'KP',
    dropdownLabel: '[ MANDI BRANCH: DANA MANDI KAMALPUR (ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ) ]',
    plainLabel: 'DANA MANDI KAMALPUR (ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ)',
    namePa: 'ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ',
    nameEn: 'Dana Mandi Kamalpur'
  }
];

export const ALL_MANDIS_DROPDOWN_LABEL = '🌟 [ ALL MANDIS: ਸਾਰੀਆਂ ਮੰਡੀਆਂ (ਕਾਂਗ ਖੁਰਦ • ਮਹਿਰਾਜਵਾਲਾ • ਕਮਾਲਪੁਰ) ]';

/**
 * Returns formatted dropdown label for any firm or firmId:
 * e.g. "[ MANDI BRANCH: DANA MANDI KANG KHURD (ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ) ]"
 */
export function getMandiBranchDropdownLabel(
  firmOrId: string | { id: string; name?: string; address?: string; namePa?: string } | null | undefined
): string {
  if (!firmOrId) return MANDI_BRANCH_CONFIGS[0].dropdownLabel;

  const id = typeof firmOrId === 'string' ? firmOrId : firmOrId.id;
  const name = typeof firmOrId === 'object' ? (firmOrId.name || '') : '';
  const address = typeof firmOrId === 'object' ? (firmOrId.address || '') : '';

  if (id === 'FIRM-001' || name.includes('Kang') || address.includes('Kang')) {
    return '[ MANDI BRANCH: DANA MANDI KANG KHURD (ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ) ]';
  }
  if (id === 'FIRM-002' || name.includes('Mehrajwala') || address.includes('Mehrajwala')) {
    return '[ MANDI BRANCH: DANA MANDI MEHRAJWALA (ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ) ]';
  }
  if (id === 'FIRM-003' || name.includes('Kamalpur') || address.includes('Kamalpur')) {
    return '[ MANDI BRANCH: DANA MANDI KAMALPUR (ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ) ]';
  }

  if (typeof firmOrId === 'object' && firmOrId.name) {
    return `[ MANDI BRANCH: ${firmOrId.name.toUpperCase()} ]`;
  }
  return `[ MANDI BRANCH: ${id} ]`;
}

/**
 * Returns clean plain label for headers & PDFs:
 * e.g. "DANA MANDI KANG KHURD (ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ)"
 */
export function getMandiBranchPlainLabel(
  firmOrId: string | { id: string; name?: string; address?: string; namePa?: string } | null | undefined
): string {
  if (!firmOrId || firmOrId === 'ALL') {
    return 'ALL MANDIS (ਸਾਰੀਆਂ ਮੰਡੀਆਂ: ਕਾਂਗ ਖੁਰਦ • ਮਹਿਰਾਜਵਾਲਾ • ਕਮਾਲਪੁਰ)';
  }

  const id = typeof firmOrId === 'string' ? firmOrId : firmOrId.id;
  const name = typeof firmOrId === 'object' ? (firmOrId.name || '') : '';
  const address = typeof firmOrId === 'object' ? (firmOrId.address || '') : '';

  if (id === 'FIRM-001' || name.includes('Kang') || address.includes('Kang')) {
    return 'DANA MANDI KANG KHURD (ਦਾਣਾ ਮੰਡੀ ਕਾਂਗ ਖੁਰਦ)';
  }
  if (id === 'FIRM-002' || name.includes('Mehrajwala') || address.includes('Mehrajwala')) {
    return 'DANA MANDI MEHRAJWALA (ਦਾਣਾ ਮੰਡੀ ਮਹਿਰਾਜਵਾਲਾ)';
  }
  if (id === 'FIRM-003' || name.includes('Kamalpur') || address.includes('Kamalpur')) {
    return 'DANA MANDI KAMALPUR (ਦਾਣਾ ਮੰਡੀ ਕਮਾਲਪੁਰ)';
  }

  if (typeof firmOrId === 'object' && firmOrId.name) {
    return firmOrId.name;
  }
  return id;
}
