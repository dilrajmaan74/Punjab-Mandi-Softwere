import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Printer,
  Download,
  Filter,
  RotateCcw,
  Calendar,
  Building,
  Users,
  Scale,
  ArrowRight,
  Calculator,
  FileSpreadsheet,
  Minus
} from 'lucide-react';
import { formatKgToQulKg, FIXED_BAG_WEIGHT_KG } from '../../utils/calculations';
import { normalizeDateToComparable } from '../../utils/purchasePdfExport';
import {
  exportStockLedgerPDF,
  StockLedgerSectionPdf,
  StockLedgerRowPdf
} from '../../utils/stockBalancePdfExport';

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'CUSTOM';
type CategoryType = 'TOLA' | 'PURCHASE' | 'BARDANA' | 'LEFTING';

interface LedgerRow {
  id: string;
  sourceTypeEn: string;
  sourceTypePa: string;
  totalQty: number;
  totalWeightKg?: number;
  usedTypeEn: string;
  usedTypePa: string;
  usedQty: number;
  usedWeightKg?: number;
  balance: number;
  balanceWeightKg?: number;
  statusDescEn: string;
  statusDescPa: string;
}

interface CategorySection {
  categoryId: CategoryType;
  categoryTitleEn: string;
  categoryTitlePa: string;
  totalStockBags: number;
  totalStockWeightKg?: number;
  finalBalanceBags: number;
  finalBalanceLabelEn: string;
  finalBalanceLabelPa: string;
  rows: LedgerRow[];
}

export const BalanceChart: React.FC = () => {
  const {
    bagsEntries,
    dailyPurchaseRecords,
    leftingRecords,
    bardanaRecords,
    farmers,
    sellers,
    settings
  } = useMandi();

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | CategoryType>('ALL');
  const [selectedAgency, setSelectedAgency] = useState('ALL');
  const [selectedParty, setSelectedParty] = useState('ALL');

  // Custom Pair Interactive Calculator State
  const [customSource, setCustomSource] = useState<CategoryType>('TOLA');
  const [customDeduction, setCustomDeduction] = useState<CategoryType>('PURCHASE');

  // Compute Agency List
  const availableAgencies = useMemo(() => {
    const set = new Set<string>();
    // From Settings
    if (settings.agencies) {
      settings.agencies.forEach((a) => {
        if (a.nameEn) set.add(a.nameEn);
      });
    }
    // From Purchases
    dailyPurchaseRecords.forEach((p) => {
      if (p.agency) set.add(p.agency);
    });
    // From Lefting
    leftingRecords.forEach((l) => {
      if (l.agency) set.add(l.agency);
      if (l.sellerOrAgency && !l.sellerOrAgency.toLowerCase().includes('sheller')) {
        set.add(l.sellerOrAgency);
      }
    });
    // From Bardana
    bardanaRecords.forEach((b) => {
      if (b.agency) set.add(b.agency);
    });
    return Array.from(set).sort();
  }, [settings.agencies, dailyPurchaseRecords, leftingRecords, bardanaRecords]);

  // Compute Date Boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000 - 1;

    if (datePreset === 'TODAY') {
      return { start: todayStart, end: todayEnd };
    }
    if (datePreset === 'YESTERDAY') {
      const yStart = todayStart - 86400000;
      const yEnd = todayStart - 1;
      return { start: yStart, end: yEnd };
    }
    if (datePreset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(now.setDate(diff)).setHours(0, 0, 0, 0);
      return { start: weekStart, end: todayEnd };
    }
    if (datePreset === 'CUSTOM') {
      const start = customStartDate ? normalizeDateToComparable(customStartDate) : 0;
      const end = customEndDate ? normalizeDateToComparable(customEndDate) + 86400000 - 1 : Infinity;
      return { start, end };
    }
    return { start: 0, end: Infinity };
  }, [datePreset, customStartDate, customEndDate]);

  // 1. Filter Tola / Weighing (Bags Entries)
  const filteredBagsEntries = useMemo(() => {
    return bagsEntries.filter((b) => {
      // Date filter
      const t = normalizeDateToComparable(b.date);
      if (t < dateRange.start || t > dateRange.end) return false;

      // Party filter
      if (selectedParty !== 'ALL') {
        if (selectedParty.startsWith('FARMER:')) {
          const fid = selectedParty.replace('FARMER:', '');
          if (b.farmerId !== fid) return false;
        } else if (selectedParty.startsWith('SELLER:')) {
          return false; // Bags entries belong to farmers, not shellers
        }
      }

      // Agency filter: If agency is selected, check if farmer has purchase with that agency
      if (selectedAgency !== 'ALL') {
        const hasMatchingPurchase = dailyPurchaseRecords.some(
          (p) => p.farmerId === b.farmerId && p.agency === selectedAgency
        );
        if (!hasMatchingPurchase) return false;
      }

      return true;
    });
  }, [bagsEntries, dateRange, selectedParty, selectedAgency, dailyPurchaseRecords]);

  // 2. Filter Purchase Records
  const filteredPurchaseRecords = useMemo(() => {
    return dailyPurchaseRecords.filter((p) => {
      // Date filter
      const t = normalizeDateToComparable(p.date);
      if (t < dateRange.start || t > dateRange.end) return false;

      // Agency filter
      if (selectedAgency !== 'ALL' && p.agency !== selectedAgency) return false;

      // Party filter
      if (selectedParty !== 'ALL') {
        if (selectedParty.startsWith('FARMER:')) {
          const fid = selectedParty.replace('FARMER:', '');
          if (p.farmerId !== fid) return false;
        } else if (selectedParty.startsWith('SELLER:')) {
          return false;
        }
      }

      return true;
    });
  }, [dailyPurchaseRecords, dateRange, selectedAgency, selectedParty]);

  // 3. Filter Bardana Records
  const filteredBardanaRecords = useMemo(() => {
    return bardanaRecords.filter((r) => {
      // Date filter
      const t = normalizeDateToComparable(r.date);
      if (t < dateRange.start || t > dateRange.end) return false;

      // Agency filter
      if (selectedAgency !== 'ALL' && r.agency !== selectedAgency) return false;

      // Party filter
      if (selectedParty !== 'ALL') {
        if (selectedParty.startsWith('SELLER:')) {
          const sid = selectedParty.replace('SELLER:', '');
          if (r.sellerId !== sid && r.sourceName !== sid) return false;
        } else if (selectedParty.startsWith('FARMER:')) {
          const fid = selectedParty.replace('FARMER:', '');
          if (r.sellerId !== fid && r.sourceName !== fid) return false;
        }
      }

      return true;
    });
  }, [bardanaRecords, dateRange, selectedAgency, selectedParty]);

  // 4. Filter Lefting Records
  const filteredLeftingRecords = useMemo(() => {
    return leftingRecords.filter((l) => {
      // Date filter
      const t = normalizeDateToComparable(l.dispatchDate || l.date);
      if (t < dateRange.start || t > dateRange.end) return false;

      // Agency filter
      if (selectedAgency !== 'ALL') {
        const agMatch = l.agency === selectedAgency || l.sellerOrAgency === selectedAgency;
        if (!agMatch) return false;
      }

      // Party filter
      if (selectedParty !== 'ALL') {
        if (selectedParty.startsWith('SELLER:')) {
          const sid = selectedParty.replace('SELLER:', '');
          if (l.sellerId !== sid && l.destination !== sid) return false;
        } else if (selectedParty.startsWith('FARMER:')) {
          const fid = selectedParty.replace('FARMER:', '');
          if (l.farmerId !== fid) return false;
        }
      }

      return true;
    });
  }, [leftingRecords, dateRange, selectedAgency, selectedParty]);

  // Totals for the 4 core categories
  const totalTolaBags = useMemo(() => {
    return filteredBagsEntries.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
  }, [filteredBagsEntries]);

  const totalTolaWeightKg = useMemo(() => {
    return filteredBagsEntries.reduce((sum, b) => {
      return sum + (Number(b.grandTotalKg) || (Number(b.bags) || 0) * FIXED_BAG_WEIGHT_KG);
    }, 0);
  }, [filteredBagsEntries]);

  const totalPurchaseBags = useMemo(() => {
    return filteredPurchaseRecords.reduce((sum, p) => sum + (Number(p.bags) || 0), 0);
  }, [filteredPurchaseRecords]);

  const totalPurchaseWeightKg = useMemo(() => {
    return filteredPurchaseRecords.reduce((sum, p) => {
      return sum + (Number(p.totalWeightKg) || (Number(p.bags) || 0) * FIXED_BAG_WEIGHT_KG);
    }, 0);
  }, [filteredPurchaseRecords]);

  const totalBardanaBags = useMemo(() => {
    return filteredBardanaRecords.reduce((sum, r) => {
      if (r.newBags !== undefined && r.oldBags !== undefined) {
        return sum + (Number(r.newBags) || 0) + (Number(r.oldBags) || 0) + (Number(r.looseBags) || 0);
      }
      return sum + (Number(r.bags) || 0);
    }, 0);
  }, [filteredBardanaRecords]);

  const totalLeftingBags = useMemo(() => {
    return filteredLeftingRecords.reduce((sum, l) => sum + (Number(l.bags) || 0), 0);
  }, [filteredLeftingRecords]);

  const totalLeftingWeightKg = useMemo(() => {
    return filteredLeftingRecords.reduce((sum, l) => {
      return (
        sum +
        (Number(l.totalWeightKg) ||
          (Number(l.qul || 0) * 100 + Number(l.kg || 0)) ||
          (Number(l.bags) || 0) * FIXED_BAG_WEIGHT_KG)
      );
    }, 0);
  }, [filteredLeftingRecords]);

  // Helper to get category quantities
  const getCategoryQty = (cat: CategoryType) => {
    switch (cat) {
      case 'TOLA':
        return { nameEn: 'Tola / Weighing', namePa: 'ਤੋਲ / ਆਮਦ', bags: totalTolaBags, weightKg: totalTolaWeightKg };
      case 'PURCHASE':
        return { nameEn: 'Agency Purchase', namePa: 'ਏਜੰਸੀ ਖਰੀਦ', bags: totalPurchaseBags, weightKg: totalPurchaseWeightKg };
      case 'BARDANA':
        return { nameEn: 'Bardana', namePa: 'ਬਾਰਦਾਨਾ', bags: totalBardanaBags, weightKg: undefined };
      case 'LEFTING':
        return { nameEn: 'Lefting / Dispatch', namePa: 'ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ', bags: totalLeftingBags, weightKg: totalLeftingWeightKg };
    }
  };

  // Build the 4 SEPARATE category ledgers according to exact handwritten specification
  const categorySections: CategorySection[] = useMemo(() => {
    // 1. TOLA / WEIGHING SECTION
    const tolaRows: LedgerRow[] = [
      {
        id: 'tola-purchase',
        sourceTypeEn: 'Tola / Weighing',
        sourceTypePa: 'ਤੋਲ / ਆਮਦ',
        totalQty: totalTolaBags,
        totalWeightKg: totalTolaWeightKg,
        usedTypeEn: 'Purchase (ਖਰੀਦ)',
        usedTypePa: 'ਏਜੰਸੀ ਖਰੀਦ',
        usedQty: totalPurchaseBags,
        usedWeightKg: totalPurchaseWeightKg,
        balance: totalTolaBags - totalPurchaseBags,
        balanceWeightKg: totalTolaWeightKg - totalPurchaseWeightKg,
        statusDescEn: 'Unsold Weighed Paddy remaining in Mandi',
        statusDescPa: 'ਮੰਡੀ ਵਿੱਚ ਅਣ-ਵਿਕਿਆ ਝੋਨਾ (ਵੇਚਣ ਯੋਗ ਬਾਕੀ)'
      },
      {
        id: 'tola-lefting',
        sourceTypeEn: 'Tola / Weighing',
        sourceTypePa: 'ਤੋਲ / ਆਮਦ',
        totalQty: totalTolaBags,
        totalWeightKg: totalTolaWeightKg,
        usedTypeEn: 'Lefting (ਲਿਫਟਿੰਗ)',
        usedTypePa: 'ਸ਼ੈਲਰ ਰਵਾਨਗੀ',
        usedQty: totalLeftingBags,
        usedWeightKg: totalLeftingWeightKg,
        balance: totalTolaBags - totalLeftingBags,
        balanceWeightKg: totalTolaWeightKg - totalLeftingWeightKg,
        statusDescEn: 'Weighed paddy awaiting truck dispatch to sheller',
        statusDescPa: 'ਤੋਲਿਆ ਮਾਲ ਜੋ ਅਜੇ ਸ਼ੈਲਰ ਰਵਾਨਾ ਨਹੀਂ ਹੋਇਆ'
      },
      {
        id: 'tola-bardana',
        sourceTypeEn: 'Tola / Weighing',
        sourceTypePa: 'ਤੋਲ / ਆਮਦ',
        totalQty: totalTolaBags,
        totalWeightKg: totalTolaWeightKg,
        usedTypeEn: 'Bardana (ਬਾਰਦਾਨਾ)',
        usedTypePa: 'ਕੁੱਲ ਬਾਰਦਾਨਾ ਸਟਾਕ',
        usedQty: totalBardanaBags,
        balance: totalTolaBags - totalBardanaBags,
        statusDescEn: 'Tola count compared against total bardana received',
        statusDescPa: 'ਬਾਰਦਾਨੇ ਦੇ ਮੁਕਾਬਲੇ ਤੋਲ ਕੀਤੀਆਂ ਬੋਰੀਆਂ ਦਾ ਬੈਲੇਂਸ'
      }
    ];

    // 2. PURCHASE SECTION
    const purchaseRows: LedgerRow[] = [
      {
        id: 'purchase-lefting',
        sourceTypeEn: 'Agency Purchase',
        sourceTypePa: 'ਏਜੰਸੀ ਖਰੀਦ',
        totalQty: totalPurchaseBags,
        totalWeightKg: totalPurchaseWeightKg,
        usedTypeEn: 'Lefting (ਲਿਫਟਿੰਗ)',
        usedTypePa: 'ਸ਼ੈਲਰ ਰਵਾਨਗੀ',
        usedQty: totalLeftingBags,
        usedWeightKg: totalLeftingWeightKg,
        balance: totalPurchaseBags - totalLeftingBags,
        balanceWeightKg: totalPurchaseWeightKg - totalLeftingWeightKg,
        statusDescEn: 'Purchased paddy lying in Mandi awaiting lifting',
        statusDescPa: 'ਖਰੀਦਿਆ ਝੋਨਾ ਜੋ ਮੰਡੀ ਵਿੱਚ ਲਿਫਟਿੰਗ ਲਈ ਬਕਾਇਆ ਹੈ'
      },
      {
        id: 'purchase-bardana',
        sourceTypeEn: 'Agency Purchase',
        sourceTypePa: 'ਏਜੰਸੀ ਖਰੀਦ',
        totalQty: totalPurchaseBags,
        totalWeightKg: totalPurchaseWeightKg,
        usedTypeEn: 'Bardana (ਬਾਰਦਾਨਾ)',
        usedTypePa: 'ਕੁੱਲ ਬਾਰਦਾਨਾ',
        usedQty: totalBardanaBags,
        balance: totalPurchaseBags - totalBardanaBags,
        statusDescEn: 'Purchased bags compared against bardana stock',
        statusDescPa: 'ਬਾਰਦਾਨਾ ਸਟਾਕ ਦੇ ਮੁਕਾਬਲੇ ਖਰੀਦੀਆਂ ਬੋਰੀਆਂ'
      },
      {
        id: 'purchase-tola',
        sourceTypeEn: 'Agency Purchase',
        sourceTypePa: 'ਏਜੰਸੀ ਖਰੀਦ',
        totalQty: totalPurchaseBags,
        totalWeightKg: totalPurchaseWeightKg,
        usedTypeEn: 'Tola / Weighing (ਤੋਲ)',
        usedTypePa: 'ਕੁੱਲ ਤੋਲ',
        usedQty: totalTolaBags,
        usedWeightKg: totalTolaWeightKg,
        balance: totalPurchaseBags - totalTolaBags,
        balanceWeightKg: totalPurchaseWeightKg - totalTolaWeightKg,
        statusDescEn: 'Purchased quantity vs total weighed arrivals',
        statusDescPa: 'ਤੋਲੇ ਗਏ ਝੋਨੇ ਦੇ ਮੁਕਾਬਲੇ ਏਜੰਸੀ ਵੱਲੋਂ ਖਰੀਦਿਆ ਮਾਲ'
      }
    ];

    // 3. BARDANA SECTION
    const bardanaRows: LedgerRow[] = [
      {
        id: 'bardana-lefting',
        sourceTypeEn: 'Bardana Stock',
        sourceTypePa: 'ਬਾਰਦਾਨਾ ਸਟਾਕ',
        totalQty: totalBardanaBags,
        usedTypeEn: 'Lefting (ਲਿਫਟਿੰਗ)',
        usedTypePa: 'ਸ਼ੈਲਰ ਰਵਾਨਗੀ',
        usedQty: totalLeftingBags,
        balance: totalBardanaBags - totalLeftingBags,
        statusDescEn: 'Bardana stock remaining after sheller dispatches',
        statusDescPa: 'ਸ਼ੈਲਰ ਰਵਾਨਾ ਬਾਰਦਾਨਾ ਕਟੌਤੀ ਉਪਰੰਤ ਬਾਕੀ'
      },
      {
        id: 'bardana-tola',
        sourceTypeEn: 'Bardana Stock',
        sourceTypePa: 'ਬਾਰਦਾਨਾ ਸਟਾਕ',
        totalQty: totalBardanaBags,
        usedTypeEn: 'Tola / Weighing (ਤੋਲ)',
        usedTypePa: 'ਤੋਲ/ਭਰਤੀ ਵਿੱਚ ਵਰਤੋਂ',
        usedQty: totalTolaBags,
        balance: totalBardanaBags - totalTolaBags,
        statusDescEn: 'Unused bardana bags remaining in Mandi yard',
        statusDescPa: 'ਮੰਡੀ ਵਿੱਚ ਬਚਿਆ ਅਣ-ਵਰਤਿਆ ਬਾਰਦਾਨਾ'
      },
      {
        id: 'bardana-purchase',
        sourceTypeEn: 'Bardana Stock',
        sourceTypePa: 'ਬਾਰਦਾਨਾ ਸਟਾਕ',
        totalQty: totalBardanaBags,
        usedTypeEn: 'Purchase (ਖਰੀਦ)',
        usedTypePa: 'ਏਜੰਸੀ ਖਰੀਦ',
        usedQty: totalPurchaseBags,
        balance: totalBardanaBags - totalPurchaseBags,
        statusDescEn: 'Bardana balance relative to purchased bags',
        statusDescPa: 'ਖਰੀਦ ਦੇ ਮੁਕਾਬਲੇ ਬਾਰਦਾਨੇ ਦਾ ਬੈਲੇਂਸ'
      }
    ];

    // 4. LEFTING / DISPATCH SECTION
    const leftingRows: LedgerRow[] = [
      {
        id: 'lefting-purchase',
        sourceTypeEn: 'Lefting / Dispatch',
        sourceTypePa: 'ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ',
        totalQty: totalLeftingBags,
        totalWeightKg: totalLeftingWeightKg,
        usedTypeEn: 'Purchase (ਖਰੀਦ)',
        usedTypePa: 'ਏਜੰਸੀ ਖਰੀਦ',
        usedQty: totalPurchaseBags,
        usedWeightKg: totalPurchaseWeightKg,
        balance: totalLeftingBags - totalPurchaseBags,
        balanceWeightKg: totalLeftingWeightKg - totalPurchaseWeightKg,
        statusDescEn: 'Lifting progress against purchased stock (Deficit = Pending)',
        statusDescPa: 'ਖਰੀਦ ਦੇ ਮੁਕਾਬਲੇ ਲਿਫਟਿੰਗ (ਘਟਣ ਤੇ ਰਵਾਨਗੀ ਬਕਾਇਆ)'
      },
      {
        id: 'lefting-bardana',
        sourceTypeEn: 'Lefting / Dispatch',
        sourceTypePa: 'ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ',
        totalQty: totalLeftingBags,
        usedTypeEn: 'Bardana (ਬਾਰਦਾਨਾ)',
        usedTypePa: 'ਕੁੱਲ ਬਾਰਦਾਨਾ',
        usedQty: totalBardanaBags,
        balance: totalLeftingBags - totalBardanaBags,
        statusDescEn: 'Dispatched bags compared against total bardana',
        statusDescPa: 'ਬਾਰਦਾਨਾ ਸਟਾਕ ਦੇ ਮੁਕਾਬਲੇ ਸ਼ੈਲਰ ਰਵਾਨਾ ਬੋਰੀਆਂ'
      },
      {
        id: 'lefting-tola',
        sourceTypeEn: 'Lefting / Dispatch',
        sourceTypePa: 'ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ',
        totalQty: totalLeftingBags,
        totalWeightKg: totalLeftingWeightKg,
        usedTypeEn: 'Tola / Weighing (ਤੋਲ)',
        usedTypePa: 'ਕੁੱਲ ਤੋਲ',
        usedQty: totalTolaBags,
        usedWeightKg: totalTolaWeightKg,
        balance: totalLeftingBags - totalTolaBags,
        balanceWeightKg: totalLeftingWeightKg - totalTolaWeightKg,
        statusDescEn: 'Dispatched quantity against total weighed mandi arrivals',
        statusDescPa: 'ਕੁੱਲ ਆਮਦ ਦੇ ਮੁਕਾਬਲੇ ਸ਼ੈਲਰ ਰਵਾਨਾ ਹੋਈਆਂ ਬੋਰੀਆਂ'
      }
    ];

    const allSections: CategorySection[] = [
      {
        categoryId: 'TOLA',
        categoryTitleEn: 'Tola / Weighing Stock Balance',
        categoryTitlePa: 'ਤੋਲ / ਆਮਦ ਸਟਾਕ ਲੇਖਾ',
        totalStockBags: totalTolaBags,
        totalStockWeightKg: totalTolaWeightKg,
        finalBalanceBags: totalTolaBags - totalPurchaseBags,
        finalBalanceLabelEn: 'Unsold Mandi Stock (Tola - Purchase)',
        finalBalanceLabelPa: 'ਮੰਡੀ ਅਣ-ਵਿਕਿਆ ਝੋਨਾ (ਤੋਲ - ਖਰੀਦ)',
        rows: tolaRows
      },
      {
        categoryId: 'PURCHASE',
        categoryTitleEn: 'Agency Purchase Stock Balance',
        categoryTitlePa: 'ਏਜੰਸੀ ਖਰੀਦ ਸਟਾਕ ਲੇਖਾ',
        totalStockBags: totalPurchaseBags,
        totalStockWeightKg: totalPurchaseWeightKg,
        finalBalanceBags: totalPurchaseBags - totalLeftingBags,
        finalBalanceLabelEn: 'Purchased Stock Pending Lifting (Purchase - Lefting)',
        finalBalanceLabelPa: 'ਖਰੀਦਿਆ ਝੋਨਾ ਬਾਕੀ ਲਿਫਟਿੰਗ (ਖਰੀਦ - ਲਿਫਟਿੰਗ)',
        rows: purchaseRows
      },
      {
        categoryId: 'BARDANA',
        categoryTitleEn: 'Bardana Stock Balance',
        categoryTitlePa: 'ਬਾਰਦਾਨਾ ਸਟਾਕ ਲੇਖਾ',
        totalStockBags: totalBardanaBags,
        finalBalanceBags: totalBardanaBags - totalTolaBags,
        finalBalanceLabelEn: 'Unused Bardana in Mandi (Bardana - Tola)',
        finalBalanceLabelPa: 'ਮੰਡੀ ਵਿੱਚ ਬਚਿਆ ਅਣ-ਵਰਤਿਆ ਬਾਰਦਾਨਾ (ਬਾਰਦਾਨਾ - ਤੋਲ)',
        rows: bardanaRows
      },
      {
        categoryId: 'LEFTING',
        categoryTitleEn: 'Lefting / Sheller Dispatch Stock Balance',
        categoryTitlePa: 'ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ ਸਟਾਕ ਲੇਖਾ',
        totalStockBags: totalLeftingBags,
        totalStockWeightKg: totalLeftingWeightKg,
        finalBalanceBags: totalLeftingBags - totalPurchaseBags,
        finalBalanceLabelEn: 'Dispatch Variance vs Purchase (Lefting - Purchase)',
        finalBalanceLabelPa: 'ਖਰੀਦ ਦੇ ਮੁਕਾਬਲੇ ਰਵਾਨਗੀ ਅੰਤਰ (ਲਿਫਟਿੰਗ - ਖਰੀਦ)',
        rows: leftingRows
      }
    ];

    if (selectedCategory === 'ALL') return allSections;
    return allSections.filter((s) => s.categoryId === selectedCategory);
  }, [
    totalTolaBags,
    totalTolaWeightKg,
    totalPurchaseBags,
    totalPurchaseWeightKg,
    totalBardanaBags,
    totalLeftingBags,
    totalLeftingWeightKg,
    selectedCategory
  ]);

  // Calculate Custom Pair Comparison
  const customCalc = useMemo(() => {
    const src = getCategoryQty(customSource);
    const ded = getCategoryQty(customDeduction);
    const balance = src.bags - ded.bags;
    const balanceWeightKg =
      src.weightKg !== undefined && ded.weightKg !== undefined
        ? src.weightKg - ded.weightKg
        : undefined;

    return {
      src,
      ded,
      balance,
      balanceWeightKg
    };
  }, [customSource, customDeduction, totalTolaBags, totalPurchaseBags, totalBardanaBags, totalLeftingBags]);

  // Reset all filters
  const handleResetFilters = () => {
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedCategory('ALL');
    setSelectedAgency('ALL');
    setSelectedParty('ALL');
  };

  // PDF Export
  const handleExportPDF = () => {
    const filterDateLabel =
      datePreset === 'ALL'
        ? 'All Season'
        : datePreset === 'TODAY'
        ? 'Today'
        : datePreset === 'YESTERDAY'
        ? 'Yesterday'
        : datePreset === 'THIS_WEEK'
        ? 'This Week'
        : `${customStartDate || 'Start'} to ${customEndDate || 'End'}`;

    const filterAgencyLabel = selectedAgency === 'ALL' ? 'All Agencies' : selectedAgency;
    const filterCategoryLabel =
      selectedCategory === 'ALL'
        ? 'All Categories'
        : selectedCategory === 'TOLA'
        ? 'Tola / Weighing'
        : selectedCategory === 'PURCHASE'
        ? 'Purchase'
        : selectedCategory === 'BARDANA'
        ? 'Bardana'
        : 'Lefting';

    let filterPartyLabel = 'All Farmers / Shellers';
    if (selectedParty !== 'ALL') {
      if (selectedParty.startsWith('FARMER:')) {
        const fid = selectedParty.replace('FARMER:', '');
        const f = farmers.find((x) => x.id === fid);
        filterPartyLabel = f ? `${f.farmerName} (${f.village})` : fid;
      } else if (selectedParty.startsWith('SELLER:')) {
        const sid = selectedParty.replace('SELLER:', '');
        const s = sellers.find((x) => x.id === sid);
        filterPartyLabel = s ? s.name : sid;
      }
    }

    const pdfSections: StockLedgerSectionPdf[] = categorySections.map((sec) => {
      const qtlStr = sec.totalStockWeightKg
        ? ` (${(sec.totalStockWeightKg / 100).toFixed(2)} Qtl)`
        : '';
      const totalStockStr = `${sec.totalStockBags.toLocaleString('en-IN')} Bags${qtlStr}`;

      const pdfRows: StockLedgerRowPdf[] = sec.rows.map((r) => {
        return {
          sourceType: r.sourceTypeEn,
          totalQty: r.totalQty,
          totalQtyStr: `${r.totalQty.toLocaleString('en-IN')} Bags`,
          usedType: r.usedTypeEn,
          usedQty: r.usedQty,
          usedQtyStr: `${r.usedQty.toLocaleString('en-IN')} Bags`,
          balance: r.balance,
          balanceStr: `${r.balance < 0 ? '' : '+'}${r.balance.toLocaleString('en-IN')} Bags`,
          statusDesc: r.statusDescEn
        };
      });

      return {
        categoryTitleEn: sec.categoryTitleEn,
        categoryTitlePa: sec.categoryTitlePa,
        totalStockStr,
        rows: pdfRows
      };
    });

    exportStockLedgerPDF({
      settings,
      filterDateLabel,
      filterAgencyLabel,
      filterCategoryLabel,
      filterPartyLabel,
      summary: {
        totalTolaBags,
        totalPurchaseBags,
        totalBardanaBags,
        totalLeftingBags
      },
      sections: pdfSections
    });
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* 1. Master Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>ਸਟਾਕ ਬੈਲੇਂਸ ਚਾਰਟ / STOCK BALANCE LEDGER</span>
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              ਹਰੇਕ ਸ਼੍ਰੇਣੀ ਦਾ ਵੱਖਰਾ ਬੈਲੇਂਸ ਖਾਤਾ (Separate Balance for Every Stock Category) • TOTAL → USED → BALANCE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
            title="Download Official A4 PDF"
          >
            <Download className="w-4 h-4" />
            <span>PDF ਡਾਊਨਲੋਡ (Export PDF)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            title="Print A4 Office Ledger"
          >
            <Printer className="w-4 h-4" />
            <span>ਪ੍ਰਿੰਟ ਕਰੋ (Print A4)</span>
          </button>
        </div>
      </div>

      {/* 2. Print-Only Official Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-800 pb-3 mb-4">
        <div className="text-base font-black uppercase text-slate-900">{settings.firmNameEn || 'JAMMU TRADING CO'}</div>
        <div className="text-xs text-slate-700">{settings.firmAddress}</div>
        <div className="text-[11px] font-bold text-slate-800 mt-1">
          STOCK BALANCE ACCOUNTING LEDGER • MANDI: {settings.mandiNameEn} • DATE: {new Date().toLocaleDateString('en-GB')}
        </div>
      </div>

      {/* 3. Daily Mandi Office Filter Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-300 shadow-2xs space-y-3.5 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wide">
            <Filter className="w-4 h-4 text-slate-600" />
            <span>ਫਿਲਟਰ ਕੰਟਰੋਲ (Office Filter Controls)</span>
          </div>
          {(datePreset !== 'ALL' || selectedCategory !== 'ALL' || selectedAgency !== 'ALL' || selectedParty !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-700 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ਫਿਲਟਰ ਸਾਫ਼ ਕਰੋ (Reset)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Filter 1: Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>ਤਰੀਕ ਫਿਲਟਰ (Date)</span>
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">ਸਾਰਾ ਸੀਜ਼ਨ (All Season)</option>
              <option value="TODAY">ਅੱਜ (Today)</option>
              <option value="YESTERDAY">ਕੱਲ੍ਹ (Yesterday)</option>
              <option value="THIS_WEEK">ਇਹ ਹਫ਼ਤਾ (This Week)</option>
              <option value="CUSTOM">ਤਰੀਕ ਸੀਮਾ (Custom Range)</option>
            </select>

            {datePreset === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  placeholder="To"
                />
              </div>
            )}
          </div>

          {/* Filter 2: Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>ਸ਼੍ਰੇਣੀ ਫਿਲਟਰ (Category)</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">ਸਾਰੀਆਂ ਸ਼੍ਰੇਣੀਆਂ (All 4 Categories)</option>
              <option value="TOLA">ਤੋਲ / ਆਮਦ (Tola / Weighing)</option>
              <option value="PURCHASE">ਏਜੰਸੀ ਖਰੀਦ (Agency Purchase)</option>
              <option value="BARDANA">ਬਾਰਦਾਨਾ ਸਟਾਕ (Bardana Stock)</option>
              <option value="LEFTING">ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ (Lefting / Dispatch)</option>
            </select>
          </div>

          {/* Filter 3: Agency */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <span>ਏਜੰਸੀ ਫਿਲਟਰ (Agency)</span>
            </label>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)</option>
              {availableAgencies.map((ag) => (
                <option key={ag} value={ag}>
                  {ag}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Farmer / Seller */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>ਕਿਸਾਨ / ਸ਼ੈਲਰ (Farmer / Seller)</span>
            </label>
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">ਸਾਰੇ ਕਿਸਾਨ ਅਤੇ ਸ਼ੈਲਰ (All Parties)</option>
              <optgroup label="ਕਿਸਾਨ (Farmers)">
                {farmers.map((f) => (
                  <option key={f.id} value={`FARMER:${f.id}`}>
                    {f.farmerNamePa} ({f.farmerName}) - {f.village}
                  </option>
                ))}
              </optgroup>
              {sellers.length > 0 && (
                <optgroup label="ਸ਼ੈਲਰ (Shellers / Sellers)">
                  {sellers.map((s) => (
                    <option key={s.id} value={`SELLER:${s.id}`}>
                      {s.name} ({s.city || s.address})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 4. MASTER STOCK TOTALS STRIP (Clean Office Accounting Row) */}
      <div className="bg-slate-100 p-4 rounded-2xl border-2 border-slate-400">
        <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-2.5">
          ਮੁੱਖ ਸਟਾਕ ਕੁੱਲ ਜੋੜ (Master Stock Totals Summary)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Tola Total */}
          <div className="bg-white p-3 rounded-xl border border-slate-300">
            <div className="text-[11px] font-bold text-slate-600">1. ਕੁੱਲ ਤੋਲ (Tola)</div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {totalTolaBags.toLocaleString('en-IN')} <span className="text-xs font-sans">Bags</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-semibold">
              {(totalTolaWeightKg / 100).toFixed(2)} Qtl
            </div>
          </div>

          {/* Purchase Total */}
          <div className="bg-white p-3 rounded-xl border border-slate-300">
            <div className="text-[11px] font-bold text-slate-600">2. ਏਜੰਸੀ ਖਰੀਦ (Purchase)</div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {totalPurchaseBags.toLocaleString('en-IN')} <span className="text-xs font-sans">Bags</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-semibold">
              {(totalPurchaseWeightKg / 100).toFixed(2)} Qtl
            </div>
          </div>

          {/* Bardana Total */}
          <div className="bg-white p-3 rounded-xl border border-slate-300">
            <div className="text-[11px] font-bold text-slate-600">3. ਬਾਰਦਾਨਾ (Bardana)</div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {totalBardanaBags.toLocaleString('en-IN')} <span className="text-xs font-sans">Bags</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 font-medium">
              ਗੱਟੇ ਪ੍ਰਾਪਤ (Received Bags)
            </div>
          </div>

          {/* Lefting Total */}
          <div className="bg-white p-3 rounded-xl border border-slate-300">
            <div className="text-[11px] font-bold text-slate-600">4. ਸ਼ੈਲਰ ਰਵਾਨਗੀ (Lefting)</div>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
              {totalLeftingBags.toLocaleString('en-IN')} <span className="text-xs font-sans">Bags</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 font-semibold">
              {(totalLeftingWeightKg / 100).toFixed(2)} Qtl
            </div>
          </div>
        </div>
      </div>

      {/* 5. SEPARATE STOCK CATEGORY LEDGERS (Exact Handwritten Note Behavior) */}
      <div className="space-y-6">
        {categorySections.map((sec, idx) => {
          return (
            <div
              key={sec.categoryId}
              className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xs overflow-hidden print:border-slate-800 print:break-inside-avoid"
            >
              {/* Category Header Ribbon */}
              <div className="bg-slate-900 text-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-white/20 text-white font-mono font-black text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h2 className="text-sm font-black tracking-wide">
                      {sec.categoryTitlePa} ({sec.categoryTitleEn})
                    </h2>
                    <div className="text-[11px] text-slate-300 font-medium">
                      ਸਰੋਤ ਕੁੱਲ ਸਟਾਕ (Source Total): <strong className="text-white font-mono">{sec.totalStockBags.toLocaleString('en-IN')} Bags</strong>
                      {sec.totalStockWeightKg ? ` • ${(sec.totalStockWeightKg / 100).toFixed(2)} Qtl` : ''}
                    </div>
                  </div>
                </div>

                {/* Final Individual Balance Badge */}
                <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">
                    {sec.finalBalanceLabelPa}
                  </div>
                  <div className="text-sm font-black font-mono">
                    {sec.finalBalanceBags < 0 ? (
                      <span className="text-rose-400 font-bold">{sec.finalBalanceBags.toLocaleString('en-IN')} Bags (ਘਾਟ)</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">+{sec.finalBalanceBags.toLocaleString('en-IN')} Bags (ਬਾਕੀ)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Table: Source | Total | Used/Deducted/Compared With | Formula | Balance */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                      <th className="p-3 w-44">ਸਰੋਤ (Source / Type)</th>
                      <th className="p-3 text-right w-36">ਕੁੱਲ ਸਟਾਕ (Total)</th>
                      <th className="p-3 w-48">ਵਰਤੋਂ / ਕਟੌਤੀ (Used / Deducted / Compared)</th>
                      <th className="p-3 text-center w-36">ਫਾਰਮੂਲਾ (Total − Used)</th>
                      <th className="p-3 text-right w-44">ਬਾਕੀ ਬੈਲੈਂਸ (Balance)</th>
                      <th className="p-3">ਮੰਡੀ ਸਥਿਤੀ / ਵੇਰਵਾ (Mandi Meaning)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sec.rows.map((row, rIdx) => {
                      const isNegative = row.balance < 0;
                      const isZero = row.balance === 0;

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            rIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                          }`}
                        >
                          {/* Source */}
                          <td className="p-3 font-black text-slate-900">
                            <div>{row.sourceTypePa}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{row.sourceTypeEn}</div>
                          </td>

                          {/* Total */}
                          <td className="p-3 text-right font-mono font-black text-slate-900">
                            <div>{row.totalQty.toLocaleString('en-IN')} Bags</div>
                            {row.totalWeightKg !== undefined && (
                              <div className="text-[11px] text-slate-500 font-normal">
                                {(row.totalWeightKg / 100).toFixed(2)} Qtl
                              </div>
                            )}
                          </td>

                          {/* Used / Deducted */}
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{row.usedTypePa}</div>
                            <div className="font-mono font-bold text-slate-700 text-xs">
                              {row.usedQty.toLocaleString('en-IN')} Bags
                              {row.usedWeightKg !== undefined ? ` (${(row.usedWeightKg / 100).toFixed(2)} Qtl)` : ''}
                            </div>
                          </td>

                          {/* Formula */}
                          <td className="p-3 text-center font-mono text-[11px] text-slate-600 font-semibold bg-slate-50/75">
                            {row.totalQty.toLocaleString('en-IN')} − {row.usedQty.toLocaleString('en-IN')}
                          </td>

                          {/* Balance */}
                          <td className="p-3 text-right">
                            {isNegative ? (
                              <div className="inline-block px-2.5 py-1 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 font-mono font-black text-sm">
                                {row.balance.toLocaleString('en-IN')} Bags
                              </div>
                            ) : isZero ? (
                              <div className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-mono font-bold text-xs">
                                0 Bags (ਬਰਾਬਰ)
                              </div>
                            ) : (
                              <div className="inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 font-mono font-black text-sm">
                                +{row.balance.toLocaleString('en-IN')} Bags
                              </div>
                            )}

                            {row.balanceWeightKg !== undefined && (
                              <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                                {(row.balanceWeightKg / 100).toFixed(2)} Qtl
                              </div>
                            )}
                          </td>

                          {/* Description / Status */}
                          <td className="p-3 text-slate-700">
                            <div className="font-semibold text-slate-900">{row.statusDescPa}</div>
                            <div className="text-[11px] text-slate-500">{row.statusDescEn}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. INTERACTIVE CUSTOM PAIR COMPARATOR (Directly reflects handwritten ledger freedom) */}
      <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-2xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-800 text-white rounded-lg">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                ਵਿਸ਼ੇਸ਼ ਸਟਾਕ ਤੁਲਨਾ ਕੈਲਕੁਲੇਟਰ (Custom Stock Pair Comparison)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                ਆਪਣੀ ਮਰਜ਼ੀ ਅਨੁਸਾਰ ਕਿਸੇ ਵੀ ਦੋ ਸ਼੍ਰੇਣੀਆਂ ਦੀ ਆਪਸੀ ਤੁਲਨਾ ਅਤੇ ਬੈਲੇਂਸ ਦੇਖੋ
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          {/* Pick Source */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              1. ਸਰੋਤ ਸ਼੍ਰੇਣੀ ਚੁਣੋ (Select Source)
            </label>
            <select
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value as CategoryType)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="TOLA">ਤੋਲ / ਆਮਦ (Tola / Weighing)</option>
              <option value="PURCHASE">ਏਜੰਸੀ ਖਰੀਦ (Agency Purchase)</option>
              <option value="BARDANA">ਬਾਰਦਾਨਾ ਸਟਾਕ (Bardana Stock)</option>
              <option value="LEFTING">ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ (Lefting / Dispatch)</option>
            </select>
            <div className="text-xs font-mono font-bold text-slate-800 pt-1">
              ਕੁੱਲ ਸਟਾਕ: <span className="text-slate-950 font-black">{customCalc.src.bags.toLocaleString('en-IN')} Bags</span>
            </div>
          </div>

          {/* Pick Deduction */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              2. ਕਟੌਤੀ / ਤੁਲਨਾ ਸ਼੍ਰੇਣੀ (Minus / Compared With)
            </label>
            <select
              value={customDeduction}
              onChange={(e) => setCustomDeduction(e.target.value as CategoryType)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <option value="TOLA">ਤੋਲ / ਆਮਦ (Tola / Weighing)</option>
              <option value="PURCHASE">ਏਜੰਸੀ ਖਰੀਦ (Agency Purchase)</option>
              <option value="BARDANA">ਬਾਰਦਾਨਾ ਸਟਾਕ (Bardana Stock)</option>
              <option value="LEFTING">ਸ਼ੈਲਰ ਲਿਫਟਿੰਗ (Lefting / Dispatch)</option>
            </select>
            <div className="text-xs font-mono font-bold text-slate-800 pt-1">
              ਵਰਤੋਂ / ਤੁਲਨਾ: <span className="text-slate-950 font-black">{customCalc.ded.bags.toLocaleString('en-IN')} Bags</span>
            </div>
          </div>

          {/* Result */}
          <div className="p-3 bg-white rounded-xl border border-slate-300 text-center space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              ਕੁੱਲ ਬੈਲੇਂਸ (Calculated Balance)
            </div>
            <div
              className={`text-xl font-mono font-black ${
                customCalc.balance < 0
                  ? 'text-rose-700'
                  : customCalc.balance === 0
                  ? 'text-slate-800'
                  : 'text-emerald-800'
              }`}
            >
              {customCalc.balance < 0 ? '' : '+'}
              {customCalc.balance.toLocaleString('en-IN')} Bags
            </div>
            <div className="text-[11px] font-mono text-slate-500 font-semibold">
              {customCalc.src.bags.toLocaleString('en-IN')} − {customCalc.ded.bags.toLocaleString('en-IN')} = {customCalc.balance.toLocaleString('en-IN')}
            </div>
            {customCalc.balanceWeightKg !== undefined && (
              <div className="text-[10px] font-mono text-slate-600">
                {(customCalc.balanceWeightKg / 100).toFixed(2)} Qtl
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. MANDI ACCOUNTING RULES & GUIDE RIBBON */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs text-slate-700 space-y-1.5 print:hidden">
        <div className="font-black text-slate-900 flex items-center gap-1.5">
          <span>ਨਿਯਮ ਅਤੇ ਵਿਆਖਿਆ (Accounting Ledger Rules):</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
          <li>
            <strong>ਬੈਲੇਂਸ ਫਾਰਮੂਲਾ (Balance Formula):</strong> ਹਰੇਕ ਲੇਖੇ ਵਿੱਚ ਚੁਣੇ ਹੋਏ ਸਰੋਤ ਦਾ ਕੁੱਲ ਸਟਾਕ − ਸੰਬੰਧਿਤ ਵਰਤੋਂ / ਕਟੌਤੀ = ਨੈੱਟ ਬੈਲੇਂਸ (Balance = Total − Used).
          </li>
          <li>
            <strong>ਮਨਫ਼ੀ ਬੈਲੇਂਸ (Negative Balance):</strong> ਜੇਕਰ ਸਰੋਤ ਦੇ ਮੁਕਾਬਲੇ ਦੂਸਰੀ ਮਾਤਰਾ ਜ਼ਿਆਦਾ ਹੋਵੇ ਤਾਂ ਨਤੀਜਾ ਲਾਲ ਰੰਗ ਵਿੱਚ ਮਨਫ਼ੀ (-) ਨਿਸ਼ਾਨ ਨਾਲ ਦਰਸਾਇਆ ਜਾਂਦਾ ਹੈ।
          </li>
          <li>
            <strong>ਰੀਅਲਟਾਈਮ ਅੱਪਡੇਟ (Realtime Sync):</strong> ਜਦੋਂ ਵੀ ਤੋਲ, ਖਰੀਦ, ਬਾਰਦਾਨਾ ਜਾਂ ਲਿਫਟਿੰਗ ਵਿੱਚ ਕੋਈ ਨਵਾਂ ਇੰਦਰਾਜ ਦਰਜ ਹੁੰਦਾ ਹੈ, ਸਾਰੇ ਖਾਤੇ ਆਪਣੇ ਆਪ ਅੱਪਡੇਟ ਹੋ ਜਾਂਦੇ ਹਨ।
          </li>
        </ul>
      </div>
    </div>
  );
};
