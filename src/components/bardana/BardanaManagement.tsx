import React, { useState, useMemo } from 'react';
import {
  BardanaReceivedRecord,
  BardanaSourceType,
  BardanaType
} from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  Boxes,
  Building2,
  Calendar,
  Layers,
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Tag,
  Clock,
  UserCheck,
  Users,
  Repeat
} from 'lucide-react';
import { BardanaViewModal } from './BardanaViewModal';
import { BardanaEditModal } from './BardanaEditModal';
import { SellerMasterModal } from '../seller/SellerMasterModal';
import {
  exportBardanaReceivedVoucherPDF,
  exportBardanaRegisterPDF
} from '../../utils/bardanaPdfExport';

const STANDARD_AGENCIES = [
  'Punjab Mandi Board Agency',
  'Pungrain (ਪਨਗ੍ਰੇਨ)',
  'Markfed (ਮਾਰਕਫੈੱਡ)',
  'Punsup (ਪਨਸਪ)',
  'PSWC (ਪੰਜਾਬ ਸਟੇਟ ਵੇਅਰਹਾਊਸਿੰਗ)',
  'FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)'
];

export const BardanaManagement: React.FC = () => {
  const {
    bardanaRecords,
    bagsEntries,
    sellers,
    settings,
    addBardanaRecord,
    deleteBardanaRecord,
    getBardanaSummary,
    language
  } = useMandi();

  const isEn = language === 'en';

  const {
    notifySaveSuccess,
    notifyDeleteSuccess,
    notifyError,
    confirmDelete
  } = useNotification();

  // Tab State
  const [activeTab, setActiveTab] = useState<'receiving' | 'history' | 'inventory'>('receiving');

  // Top Fixed Agency Selection State
  const [fixedAgency, setFixedAgency] = useState<string>('Punjab Mandi Board Agency');
  const [customFixedAgency, setCustomFixedAgency] = useState<string>('');

  // Form State
  const [date, setDate] = useState<string>(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });

  const [receivedFrom, setReceivedFrom] = useState<BardanaSourceType>('SELLER');
  const [actionType, setActionType] = useState<'RECEIVE' | 'RETURN' | 'GIVE'>('RECEIVE');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('');
  const [otherPartyMobile, setOtherPartyMobile] = useState<string>('');
  const [bardanaType, setBardanaType] = useState<BardanaType>('NEW');
  const [boxes, setBoxes] = useState<number>(2);
  const [bags, setBags] = useState<number>(1000); // 2 * 500
  const [remarks, setRemarks] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Seller Master Modal
  const [isSellerModalOpen, setIsSellerModalOpen] = useState<boolean>(false);

  // Table Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterSourceType, setFilterSourceType] = useState<string>('ALL');
  const [filterBardanaType, setFilterBardanaType] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');

  // History Tab Filter
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'RECEIVED' | 'ISSUED'>('ALL');
  const [historyBardanaFilter, setHistoryBardanaFilter] = useState<'ALL' | 'NEW' | 'OLD'>('ALL');

  // Modal States
  const [viewRecord, setViewRecord] = useState<BardanaReceivedRecord | null>(null);
  const [editRecord, setEditRecord] = useState<BardanaReceivedRecord | null>(null);

  // Computed Inventory Summary
  const summary = getBardanaSummary();

  // Handle Box or Type change
  const handleBoxesChange = (val: number) => {
    const numBoxes = Math.max(0, val);
    setBoxes(numBoxes);
    const capacity = bardanaType === 'NEW' ? 500 : 50;
    setBags(numBoxes * capacity);
  };

  const handleTypeChange = (newType: BardanaType) => {
    setBardanaType(newType);
    const capacity = newType === 'NEW' ? 500 : 50;
    setBags(boxes * capacity);
  };

  const agencyOptions: SearchableSelectOption[] = useMemo(() => {
    const opts: SearchableSelectOption[] = STANDARD_AGENCIES.map((ag) => ({
      value: ag,
      label: isEn ? ag.split('(')[0].trim() : ag,
      subLabel: isEn ? ag.split('(')[1]?.replace(')', '') : undefined,
      keywords: [ag]
    }));
    opts.push({
      value: 'CUSTOM',
      label: isEn ? '+ Other Custom Agency...' : '+ ਹੋਰ ਕਸਟਮ ਏਜੰਸੀ (Other Custom Agency)...',
      keywords: ['custom', 'other']
    });
    return opts;
  }, [isEn]);

  const sellerOptions: SearchableSelectOption[] = useMemo(() => {
    return sellers.map((s) => ({
      value: s.id,
      label: s.firmName,
      subLabel: `${isEn ? 'Code/City' : 'ਕੋਡ/ਸ਼ਹਿਰ'}: ${s.code || s.city || '-'}`,
      badge: s.licenceNo || undefined,
      keywords: [s.firmName, s.code || '', s.city || '', s.phone || '', s.mobile || '']
    }));
  }, [sellers, isEn]);

  const filterSourceTypeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'ALL', label: isEn ? 'All Sources (Seller & Agency)' : 'ਸਾਰੇ ਸਰੋਤ (Seller & Agency)' },
    { value: 'SELLER', label: isEn ? 'Seller Only' : 'ਸਿਰਫ਼ ਸੈਲਰ (Seller Only)' },
    { value: 'AGENCY', label: isEn ? 'Agency Only' : 'ਸਿਰਫ਼ ਏਜੰਸੀ (Agency Only)' }
  ], [isEn]);

  const filterBardanaTypeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'ALL', label: isEn ? 'All Types' : 'ਸਾਰਾ ਬਾਰਦਾਨਾ (All Types)' },
    { value: 'NEW', label: isEn ? 'New Juth (500)' : 'ਨਵਾਂ ਬੋਰਾ (New Juth - 500)' },
    { value: 'OLD', label: isEn ? 'Old Juth (50)' : 'ਪੁਰਾਣਾ ਬੋਰਾ (Old Juth - 50)' }
  ], [isEn]);

  // Form Submit Handler
  const handleSaveReceiving = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const effectiveAgency =
      fixedAgency === 'CUSTOM' ? customFixedAgency.trim() : fixedAgency.trim();

    if (!effectiveAgency) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਪ੍ਰਮੁੱਖ ਏਜੰਸੀ ਨਿਰਧਾਰਿਤ ਕਰੋ (Please select/enter Agency).');
      return;
    }

    const effectiveSourceName = sourceName.trim();
    if (!effectiveSourceName) {
      setFormError(
        receivedFrom === 'SELLER'
          ? 'ਕਿਰਪਾ ਕਰਕੇ ਸੈਲਰ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ ਜਾਂ ਚੁਣੋ (Please select or enter Seller Name).'
          : receivedFrom === 'OTHER_PARTY'
          ? 'ਕਿਰਪਾ ਕਰਕੇ ਹੋਰ ਆੜ੍ਹਤੀਆ / ਪਾਰਟੀ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ (Please enter Other Party Name).'
          : 'ਕਿਰਪਾ ਕਰਕੇ ਏਜੰਸੀ / ਸਰੋਤ ਦਾ ਨਾਂ ਦਰਜ ਕਰੋ (Please enter Agency Source Name).'
      );
      return;
    }

    if (boxes <= 0 || bags <= 0) {
      setFormError('ਬਕਸਿਆਂ ਤੇ ਬੋਰਿਆਂ ਦੀ ਗਿਣਤੀ 0 ਤੋਂ ਵੱਧ ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ (Boxes and Bags must be > 0).');
      return;
    }

    setIsSaving(true);

    try {
      const newRec = addBardanaRecord({
        date: date.trim(),
        agency: effectiveAgency,
        actionType,
        receivedFrom,
        sourceName: effectiveSourceName,
        otherPartyName: receivedFrom === 'OTHER_PARTY' ? effectiveSourceName : undefined,
        partyMobile: otherPartyMobile.trim() || undefined,
        bardanaType,
        boxes,
        capacityPerBox: bardanaType === 'NEW' ? 500 : 50,
        bags,
        remarks: remarks.trim() || undefined
      });

      const actionLabel = actionType === 'RETURN' ? 'ਵਾਪਸ ਕੀਤਾ (Returned)' : actionType === 'GIVE' ? 'ਉਧਾਰ ਦਿੱਤਾ (Lent)' : 'ਪ੍ਰਾਪਤ ਕੀਤਾ (Received)';

      notifySaveSuccess({
        titlePa: 'ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਸੇਵ ਹੋ ਗਈ ਹੈ।',
        titleEn: 'Bardana Entry Saved Successfully',
        messagePa: `ਏਜੰਸੀ: ${effectiveAgency} | ਸਰੋਤ: ${effectiveSourceName} | ਕਾਰਵਾਈ: ${actionLabel} | ${bags} ਬੋਰੇ।`,
        details: `${newRec.id} • ${bardanaType === 'NEW' ? 'New Juth (ਨਵਾਂ)' : 'Old Juth (ਪੁਰਾਣਾ)'} • ${boxes} ਬਕਸੇ (${bags} ਬੋਰੇ)`
      });

      // Reset specific fields but keep agency
      setSourceName('');
      setSelectedSellerId('');
      setOtherPartyMobile('');
      setRemarks('');
      setBoxes(bardanaType === 'NEW' ? 2 : 2);
      setBags(bardanaType === 'NEW' ? 1000 : 100);
    } catch {
      notifyError({
        titlePa: 'ਐਂਟਰੀ ਸੇਵ ਕਰਨ ਵਿੱਚ ਗਲਤੀ ਆਈ',
        titleEn: 'Failed to save Bardana entry'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Action Handler
  const handleDelete = (rec: BardanaReceivedRecord) => {
    confirmDelete({
      recordNameEn: `Bardana Receiving Voucher ${rec.id}`,
      recordNamePa: `ਬਾਰਦਾਨਾ ਵਾਊਚਰ ${rec.id}`,
      recordId: rec.id,
      itemDetails: [
        { labelEn: 'Agency', labelPa: 'ਏਜੰਸੀ', value: rec.agency },
        {
          labelEn: 'Received From',
          labelPa: 'ਸਰੋਤ',
          value: `${rec.receivedFrom === 'SELLER' ? 'Seller' : 'Agency'}: ${rec.sourceName}`
        },
        {
          labelEn: 'Quantity',
          labelPa: 'ਮਾਤਰਾ',
          value: `${rec.boxes} Boxes = ${rec.bags.toLocaleString('en-IN')} Bags (${rec.bardanaType})`
        },
        { labelEn: 'Date', labelPa: 'ਮਿਤੀ', value: rec.date }
      ],
      onConfirm: () => {
        deleteBardanaRecord(rec.id);
        notifyDeleteSuccess({
          titlePa: 'ਐਂਟਰੀ ਸਫਲਤਾਪੂਰਵਕ ਮਿਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।',
          titleEn: 'Entry Deleted Successfully',
          messagePa: `ਵਾਊਚਰ ${rec.id} ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ ਅਤੇ ਸਟਾਕ ਸਹੀ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
        });
      }
    });
  };

  // Filtered Bardana Received Records
  const filteredRecords = bardanaRecords.filter((rec) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = rec.id.toLowerCase().includes(q);
      const matchAgency = rec.agency.toLowerCase().includes(q);
      const matchSource = rec.sourceName.toLowerCase().includes(q);
      const matchRemarks = rec.remarks?.toLowerCase().includes(q) || false;
      const matchDate = rec.date.includes(q);
      if (!matchId && !matchAgency && !matchSource && !matchRemarks && !matchDate) {
        return false;
      }
    }

    // Agency filter
    if (filterAgency !== 'ALL' && rec.agency !== filterAgency) {
      return false;
    }

    // Source type filter
    if (filterSourceType !== 'ALL' && rec.receivedFrom !== filterSourceType) {
      return false;
    }

    // Bardana type filter
    if (filterBardanaType !== 'ALL' && rec.bardanaType !== filterBardanaType) {
      return false;
    }

    // Date filter
    if (filterDate.trim() && rec.date !== filterDate.trim()) {
      return false;
    }

    return true;
  });

  // Unique Agencies in Records
  const recordedAgencies = Array.from(
    new Set([...STANDARD_AGENCIES, ...bardanaRecords.map((r) => r.agency)])
  );

  const filterAgencyOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'ALL', label: isEn ? 'All Agencies' : 'ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)' },
    ...recordedAgencies.map((ag) => ({
      value: ag,
      label: isEn ? ag.split('(')[0].trim() : ag,
      keywords: [ag]
    }))
  ], [recordedAgencies, isEn]);

  // Unified Transaction History List (Received + Issued)
  interface UnifiedTransaction {
    id: string;
    type: 'RECEIVED' | 'ISSUED';
    date: string;
    bardanaType: BardanaType;
    boxes?: number;
    bags: number;
    agency?: string;
    receivedFrom?: BardanaSourceType;
    sourceName?: string;
    farmerId?: string;
    farmerName?: string;
    farmerNamePa?: string;
    farmerVillage?: string;
    farmerVillagePa?: string;
    remarks?: string;
    createdAt: string;
    originalReceived?: BardanaReceivedRecord;
  }

  const unifiedHistory: UnifiedTransaction[] = [
    ...bardanaRecords.map((r) => ({
      id: r.id,
      type: 'RECEIVED' as const,
      date: r.date,
      bardanaType: r.bardanaType,
      boxes: r.boxes,
      bags: r.bags,
      agency: r.agency,
      receivedFrom: r.receivedFrom,
      sourceName: r.sourceName,
      remarks: r.remarks,
      createdAt: r.createdAt,
      originalReceived: r
    })),
    ...bagsEntries.flatMap((b) => {
      const results: UnifiedTransaction[] = [];
      const hasSplit = b.newBags !== undefined || b.oldBags !== undefined;
      if (hasSplit) {
        if ((b.newBags || 0) > 0) {
          results.push({
            id: `${b.entryNumber || b.id}-NEW`,
            type: 'ISSUED' as const,
            date: b.date,
            bardanaType: 'NEW' as BardanaType,
            bags: b.newBags || 0,
            farmerId: b.farmerId,
            farmerName: b.farmerName,
            farmerNamePa: b.farmerNamePa,
            farmerVillage: b.farmerVillage,
            farmerVillagePa: b.farmerVillagePa,
            remarks: `ਨਵਾਂ ਬਾਰਦਾਨਾ • Slip: ${b.entryNumber} (${b.grandTotalDisplay})`,
            createdAt: b.createdAt
          });
        }
        if ((b.oldBags || 0) > 0) {
          results.push({
            id: `${b.entryNumber || b.id}-OLD`,
            type: 'ISSUED' as const,
            date: b.date,
            bardanaType: 'OLD' as BardanaType,
            bags: b.oldBags || 0,
            farmerId: b.farmerId,
            farmerName: b.farmerName,
            farmerNamePa: b.farmerNamePa,
            farmerVillage: b.farmerVillage,
            farmerVillagePa: b.farmerVillagePa,
            remarks: `ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ • Slip: ${b.entryNumber} (${b.grandTotalDisplay})`,
            createdAt: b.createdAt
          });
        }
        if (results.length === 0 && b.bags > 0) {
          results.push({
            id: b.entryNumber || b.id,
            type: 'ISSUED' as const,
            date: b.date,
            bardanaType: b.bardana || 'NEW',
            bags: b.bags,
            farmerId: b.farmerId,
            farmerName: b.farmerName,
            farmerNamePa: b.farmerNamePa,
            farmerVillage: b.farmerVillage,
            farmerVillagePa: b.farmerVillagePa,
            remarks: `Slip: ${b.entryNumber} (${b.grandTotalDisplay})`,
            createdAt: b.createdAt
          });
        }
      } else {
        results.push({
          id: b.entryNumber || b.id,
          type: 'ISSUED' as const,
          date: b.date,
          bardanaType: b.bardana || 'NEW',
          bags: b.bags,
          farmerId: b.farmerId,
          farmerName: b.farmerName,
          farmerNamePa: b.farmerNamePa,
          farmerVillage: b.farmerVillage,
          farmerVillagePa: b.farmerVillagePa,
          remarks: `Slip: ${b.entryNumber} (${b.grandTotalDisplay})`,
          createdAt: b.createdAt
        });
      }
      return results;
    })
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredHistory = unifiedHistory.filter((item) => {
    if (historyTypeFilter !== 'ALL' && item.type !== historyTypeFilter) {
      return false;
    }
    if (historyBardanaFilter !== 'ALL' && item.bardanaType !== historyBardanaFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = item.id.toLowerCase().includes(q);
      const matchDate = item.date.includes(q);
      const matchAgency = item.agency?.toLowerCase().includes(q) || false;
      const matchSource = item.sourceName?.toLowerCase().includes(q) || false;
      const matchFarmer = item.farmerName?.toLowerCase().includes(q) || false;
      const matchFarmerPa = item.farmerNamePa?.toLowerCase().includes(q) || false;
      const matchFarmerId = item.farmerId?.toLowerCase().includes(q) || false;
      if (
        !matchId &&
        !matchDate &&
        !matchAgency &&
        !matchSource &&
        !matchFarmer &&
        !matchFarmerPa &&
        !matchFarmerId
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Page Top Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-2xs">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ (Bardana Management Module)
            </h2>
            <p className="text-[11px] text-slate-500">
              ਏਜੰਸੀ ਤੇ ਸੈਲਰ ਵਾਈਜ਼ ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ, ਨਵਾਂ/ਪੁਰਾਣਾ ਸਟਾਕ ਤੇ ਜਾਰੀ ਰਜਿਸਟਰ
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('receiving')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'receiving'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤ (Received Entry)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਹਿਸਟਰੀ (History)</span>
            <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {unifiedHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ਸਟਾਕ ਰਿਪੋਰਟ (Stock Summary)</span>
          </button>
        </div>
      </div>

      {/* Real-time Inventory KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: New Juth Stock */}
        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-black text-emerald-950">
                ਨਵਾਂ ਬਾਰਦਾਨਾ (New Juth Stock)
              </span>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
              1 Box = 500 Bags
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-semibold">ਪ੍ਰਾਪਤ (Recv)</span>
              <strong className="font-mono text-xs font-bold text-slate-900">
                {summary.newBagsReceived.toLocaleString('en-IN')}
              </strong>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-semibold">ਜਾਰੀ (Issued)</span>
              <strong className="font-mono text-xs font-bold text-amber-800">
                {summary.newBagsIssued.toLocaleString('en-IN')}
              </strong>
            </div>

            <div
              className={`p-2 rounded-lg border font-bold ${
                summary.newBagsRemaining >= 0
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <span className="text-[10px] text-slate-600 block font-semibold">ਬਾਕੀ (Stock)</span>
              <strong className="font-mono text-sm font-black">
                {summary.newBagsRemaining.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 2: Old Juth Stock */}
        <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-black text-amber-950">
                ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Juth Stock)
              </span>
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
              1 Box = 50 Bags
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-semibold">ਪ੍ਰਾਪਤ (Recv)</span>
              <strong className="font-mono text-xs font-bold text-slate-900">
                {summary.oldBagsReceived.toLocaleString('en-IN')}
              </strong>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-semibold">ਜਾਰੀ (Issued)</span>
              <strong className="font-mono text-xs font-bold text-amber-800">
                {summary.oldBagsIssued.toLocaleString('en-IN')}
              </strong>
            </div>

            <div
              className={`p-2 rounded-lg border font-bold ${
                summary.oldBagsRemaining >= 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <span className="text-[10px] text-slate-600 block font-semibold">ਬਾਕੀ (Stock)</span>
              <strong className="font-mono text-sm font-black">
                {summary.oldBagsRemaining.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Total Stock Balance */}
        <div className="bg-white border border-slate-300 rounded-xl p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="text-xs font-black text-slate-900">
                ਕੁੱਲ ਬਾਰਦਾਨਾ ਸੰਤੁਲਨ (Total Stock)
              </span>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
              All Bags Combined
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-semibold">ਕੁੱਲ ਪ੍ਰਾਪਤ</span>
              <strong className="font-mono text-xs font-bold text-slate-900">
                {summary.totalReceived.toLocaleString('en-IN')}
              </strong>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 block font-semibold">ਕੁੱਲ ਜਾਰੀ</span>
              <strong className="font-mono text-xs font-bold text-amber-800">
                {summary.totalIssued.toLocaleString('en-IN')}
              </strong>
            </div>

            <div className="bg-blue-50 text-blue-950 p-2 rounded-lg border border-blue-200 font-bold">
              <span className="text-[10px] text-blue-700 block font-semibold">ਕੁੱਲ ਬਾਕੀ</span>
              <strong className="font-mono text-sm font-black">
                {summary.totalRemaining.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: RECEIVING TAB */}
      {activeTab === 'receiving' && (
        <div className="space-y-4">
          {/* ==================================================
              1. FIXED AGENCY SECTION AT THE TOP
              ================================================== */}
          <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-800/80 pb-2.5">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  AGENCY
                </div>
                <div className="text-sm font-bold text-emerald-200">
                  ਏਜੰਸੀ (FIXED MANDI AGENCY SELECTION)
                </div>
              </div>
              <span className="text-[11px] bg-emerald-800/80 text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-700 font-medium">
                ਇਹ ਏਜੰਸੀ ਸਾਰੇ ਪ੍ਰਾਪਤੀ ਇੰਦਰਾਜ਼ਾਂ 'ਤੇ ਲਾਗੂ ਹੋਵੇਗੀ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">
                  {isEn ? 'Select Mandi Agency' : 'ਏਜੰਸੀ ਚੁਣੋ (Select Mandi Agency)'} <span className="text-amber-400">*</span>
                </label>
                <SearchableSelect
                  id="bardana-fixed-agency"
                  value={STANDARD_AGENCIES.includes(fixedAgency) ? fixedAgency : (fixedAgency ? 'CUSTOM' : '')}
                  onChange={(val) => {
                    if (val === 'CUSTOM') {
                      setFixedAgency('CUSTOM');
                    } else {
                      setFixedAgency(val);
                    }
                  }}
                  options={agencyOptions}
                  placeholder={isEn ? "Select Mandi Agency..." : "ਏਜੰਸੀ ਚੁਣੋ..."}
                  searchPlaceholder={isEn ? "Search agency..." : "ਏਜੰਸੀ ਖੋਜੋ..."}
                />
              </div>

              {fixedAgency === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-bold text-emerald-200 mb-1">
                    {isEn ? 'Enter Custom Agency Name' : 'ਕਸਟਮ ਏਜੰਸੀ ਦਾ ਨਾਂ (Enter Custom Agency Name)'} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={isEn ? "Enter custom agency name" : "ਕਸਟਮ ਏਜੰਸੀ ਦਾ ਨਾਂ ਲਿਖੋ"}
                    value={customFixedAgency}
                    onChange={(e) => setCustomFixedAgency(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            <div className="bg-emerald-950/60 rounded-lg p-2 text-[11px] text-emerald-300 flex items-center gap-2 border border-emerald-800/40">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                ਨਿਰਧਾਰਿਤ ਏਜੰਸੀ: <strong>{fixedAgency === 'CUSTOM' ? customFixedAgency || 'Custom Agency' : fixedAgency}</strong>
              </span>
            </div>
          </div>

          {/* ==================================================
              2. BARDANA RECEIVED ENTRY FORM
              ================================================== */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    ਨਵੀਂ ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ ਐਂਟਰੀ (New Bardana Receiving Entry)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ਸੈਲਰ ਜਾਂ ਏਜੰਸੀ ਤੋਂ ਪ੍ਰਾਪਤ ਬਾਰਦਾਨੇ ਦਾ ਇੰਦਰਾਜ ਦਰਜ ਕਰੋ
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                Date: {date}
              </span>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveReceiving} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 1. Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ਮਿਤੀ (Date) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Bardana Source: SELLER vs AGENCY vs OTHER_PARTY */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    ਬਾਰਦਾਨਾ ਲੈਣ-ਦੇਣ ਸਰੋਤ (Bardana Source / Party) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReceivedFrom('SELLER')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-black border transition flex items-center justify-center gap-1.5 ${
                        receivedFrom === 'SELLER'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>ਸੈਲਰ (Seller)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReceivedFrom('AGENCY')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-black border transition flex items-center justify-center gap-1.5 ${
                        receivedFrom === 'AGENCY'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>ਏਜੰਸੀ (Agency)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReceivedFrom('OTHER_PARTY')}
                      className={`py-2 px-2.5 rounded-lg text-xs font-black border transition flex items-center justify-center gap-1.5 ${
                        receivedFrom === 'OTHER_PARTY'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>ਹੋਰ ਪਾਰਟੀ (Other)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Type when Other Party selected */}
              {receivedFrom === 'OTHER_PARTY' && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2">
                  <label className="block text-xs font-bold text-amber-900">
                    ਲੈਣ-ਦੇਣ ਦੀ ਕਿਸਮ (Transaction Type with Other Party) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActionType('RECEIVE')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 ${
                        actionType === 'RECEIVE'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>ਪ੍ਰਾਪਤ ਕੀਤਾ (Borrow/Receive)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionType('RETURN')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 ${
                        actionType === 'RETURN'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>ਵਾਪਸ ਕੀਤਾ (Return)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionType('GIVE')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 ${
                        actionType === 'GIVE'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>ਉਧਾਰ ਦਿੱਤਾ (Lend/Give)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Source Name Details */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">
                    {receivedFrom === 'SELLER' ? (
                      <span>ਸੈਲਰ ਦਾ ਨਾਂ (Seller / Sheller Name) <span className="text-rose-500">*</span></span>
                    ) : receivedFrom === 'OTHER_PARTY' ? (
                      <span>ਦੂਜੀ ਪਾਰਟੀ / ਆੜ੍ਹਤੀਆ ਦਾ ਨਾਂ (Party / Arhtiya Name) <span className="text-rose-500">*</span></span>
                    ) : (
                      <span>ਏਜੰਸੀ / ਸਰੋਤ ਦਾ ਨਾਂ (Agency Source Name) <span className="text-rose-500">*</span></span>
                    )}
                  </label>

                  {receivedFrom === 'SELLER' && (
                    <button
                      type="button"
                      onClick={() => setIsSellerModalOpen(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>ਸੈਲਰ ਮਾਸਟਰ (Manage Sellers)</span>
                    </button>
                  )}
                </div>

                {receivedFrom === 'SELLER' && sellers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableSelect
                      id="bardana-seller-select"
                      value={selectedSellerId}
                      onChange={(sid) => {
                        setSelectedSellerId(sid);
                        const match = sellers.find(s => s.id === sid);
                        if (match) {
                          setSourceName(match.firmName);
                        } else {
                          setSourceName('');
                        }
                      }}
                      options={sellerOptions}
                      placeholder={isEn ? "Search saved seller..." : "ਸੈਲਰ ਖੋਜੋ ਤੇ ਚੁਣੋ..."}
                      searchPlaceholder={isEn ? "Type seller firm name..." : "ਸੈਲਰ ਫਰਮ ਦਾ ਨਾਂ ਲਿਖੋ..."}
                      allowClear
                    />

                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder={isEn ? "Or enter seller name directly..." : "ਜਾਂ ਸੈਲਰ ਦਾ ਨਾਂ ਸਿੱਧਾ ਲਿਖੋ..."}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                ) : receivedFrom === 'OTHER_PARTY' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="ਜਿਵੇਂ Khalsa Commission Agent, Gill Traders..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <input
                      type="tel"
                      value={otherPartyMobile}
                      onChange={(e) => setOtherPartyMobile(e.target.value)}
                      placeholder="ਸੰਪਰਕ ਨੰਬਰ (Mobile No.)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="ਜਿਵੇਂ Punjab Mandi Board Agency, FCI Store..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                )}
              </div>

              {/* 4. Bardana Type, Boxes, Bags */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <label className="block font-bold text-slate-700">
                  ਬਾਰਦਾਨਾ ਕਿਸਮ ਤੇ ਗਿਣਤੀ (Bardana Type & Box Capacity) <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Type 1: New Juth */}
                  <button
                    type="button"
                    onClick={() => handleTypeChange('NEW')}
                    className={`p-3 rounded-xl border text-left transition ${
                      bardanaType === 'NEW'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">New Juth (ਨਵਾਂ ਬੋਰਾ)</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          bardanaType === 'NEW'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        1 Box = 500 Bags
                      </span>
                    </div>
                    <p className={`text-[10px] mt-1 ${bardanaType === 'NEW' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      ਹਰੇਕ ਬਕਸੇ ਵਿੱਚ 500 ਨਵੇਂ ਬੋਰੇ ਹੁੰਦੇ ਹਨ
                    </p>
                  </button>

                  {/* Type 2: Old Juth */}
                  <button
                    type="button"
                    onClick={() => handleTypeChange('OLD')}
                    className={`p-3 rounded-xl border text-left transition ${
                      bardanaType === 'OLD'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">Old Juth (ਪੁਰਾਣਾ ਬੋਰਾ)</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          bardanaType === 'OLD'
                            ? 'bg-amber-700 text-white'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        1 Box = 50 Bags
                      </span>
                    </div>
                    <p className={`text-[10px] mt-1 ${bardanaType === 'OLD' ? 'text-amber-100' : 'text-slate-500'}`}>
                      ਹਰੇਕ ਬਕਸੇ ਵਿੱਚ 50 ਪੁਰਾਣੇ ਬੋਰੇ ਹੁੰਦੇ ਹਨ
                    </p>
                  </button>
                </div>

                {/* Boxes & Bags Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ਬਕਸਿਆਂ ਦੀ ਗਿਣਤੀ (Number of Boxes) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={boxes || ''}
                      onChange={(e) => handleBoxesChange(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      ਕੁੱਲ ਬੋਰਿਆਂ ਦੀ ਗਿਣਤੀ (Total Bags) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={bags || ''}
                      onChange={(e) => setBags(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-white border border-emerald-400 rounded-lg px-3 py-2 text-xs font-mono font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      ਹਿਸਾਬ: {boxes} ਬਕਸੇ × {bardanaType === 'NEW' ? 500 : 50} = {boxes * (bardanaType === 'NEW' ? 500 : 50)} ਬੋਰੇ ({bardanaType === 'NEW' ? 'New Juth' : 'Old Juth'} Stock)
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ਟਿੱਪਣੀਆਂ / ਨੋਟਿਸ (Remarks & Details)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="ਜਿਵੇਂ ਟਰੱਕ ਨੰਬਰ PB-10-..., ਗੇਟ ਪਾਸ, ਚਲਾਨ ਨੰਬਰ ਆਦਿ..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isSaving ? 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ...' : 'ਬਾਰਦਾਨਾ ਐਂਟਰੀ ਸੇਵ ਕਰੋ (Save Bardana Entry)'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* ==================================================
              3. BARDANA RECEIVED TABLE & FILTERS
              ================================================== */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>ਪ੍ਰਾਪਤ ਬਾਰਦਾਨਾ ਰਜਿਸਟਰ (Bardana Received Register)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  ਕੁੱਲ ਪ੍ਰਾਪਤ ਐਂਟਰੀਆਂ: <strong className="text-slate-900 font-mono">{bardanaRecords.length}</strong> | ਫਿਲਟਰ ਕੀਤੀਆਂ:{' '}
                  <strong className="text-emerald-700 font-mono">{filteredRecords.length}</strong>
                </p>
              </div>

              {/* PDF Register Export Button */}
              {bardanaRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    exportBardanaRegisterPDF(
                      filteredRecords,
                      summary,
                      settings,
                      filterAgency === 'ALL' ? 'All Agencies' : filterAgency
                    )
                  }
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ਰਜਿਸਟਰ PDF ਐਕਸਪੋਰਟ (Export Register PDF)</span>
                </button>
              )}
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="ਖੋਜੋ: ਸੈਲਰ, ਏਜੰਸੀ, ID ਜਾਂ ਮਿਤੀ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Agency Filter */}
              <div>
                <SearchableSelect
                  id="bardana-filter-agency"
                  value={filterAgency}
                  onChange={(val) => setFilterAgency(val)}
                  options={filterAgencyOptions}
                  placeholder={isEn ? "All Agencies" : "ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ"}
                  size="xs"
                />
              </div>

              {/* Source Type Filter */}
              <div>
                <SearchableSelect
                  id="bardana-filter-source"
                  value={filterSourceType}
                  onChange={(val) => setFilterSourceType(val)}
                  options={filterSourceTypeOptions}
                  placeholder={isEn ? "All Sources" : "ਸਾਰੇ ਸਰੋਤ"}
                  size="xs"
                />
              </div>

              {/* Bardana Type Filter */}
              <div>
                <SearchableSelect
                  id="bardana-filter-type"
                  value={filterBardanaType}
                  onChange={(val) => setFilterBardanaType(val)}
                  options={filterBardanaTypeOptions}
                  placeholder={isEn ? "All Types" : "ਸਾਰਾ ਬਾਰਦਾਨਾ"}
                  size="xs"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">ਮਿਤੀ (Date)</th>
                    <th className="py-2.5 px-3">ਵਾਊਚਰ ID</th>
                    <th className="py-2.5 px-3">ਏਜੰਸੀ (Agency)</th>
                    <th className="py-2.5 px-3">ਕਿੱਥੋਂ ਪ੍ਰਾਪਤ (From)</th>
                    <th className="py-2.5 px-3">ਸੈਲਰ / ਸਰੋਤ ਦਾ ਨਾਂ</th>
                    <th className="py-2.5 px-3 text-center">ਬਾਰਦਾਨਾ ਕਿਸਮ</th>
                    <th className="py-2.5 px-3 text-right">ਬਕਸੇ</th>
                    <th className="py-2.5 px-3 text-right">ਕੁੱਲ ਬੋਰੇ</th>
                    <th className="py-2.5 px-3 text-center">ਐਕਸ਼ਨ (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 bg-slate-50/50">
                        <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                        <span className="font-bold text-slate-600 block">
                          ਕੋਈ ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤੀ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ (No Bardana Records Yet)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ਉੱਪਰ ਦਿੱਤੇ ਫਾਰਮ ਰਾਹੀਂ ਨਵੀਂ ਐਂਟਰੀ ਸ਼ਾਮਲ ਕਰੋ।
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-900 font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                            {rec.id}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {rec.agency}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              rec.receivedFrom === 'SELLER'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-purple-100 text-purple-900'
                            }`}
                          >
                            {rec.receivedFrom === 'SELLER' ? 'Seller (ਸੈਲਰ)' : 'Agency (ਏਜੰਸੀ)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {rec.sourceName}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              rec.bardanaType === 'NEW'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.bardanaType === 'NEW' ? 'New Juth (500)' : 'Old Juth (50)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                          {rec.boxes}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-950 whitespace-nowrap">
                          +{rec.bags.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* View */}
                            <button
                              type="button"
                              onClick={() => setViewRecord(rec)}
                              title="ਵੇਖੋ (View)"
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => setEditRecord(rec)}
                              title="ਸੋਧੋ (Edit)"
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* PDF */}
                            <button
                              type="button"
                              onClick={() => exportBardanaReceivedVoucherPDF(rec, settings)}
                              title="PDF ਐਕਸਪੋਰਟ"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDelete(rec)}
                              title="ਮਿਟਾਓ (Delete)"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRANSACTION HISTORY TAB (RECEIVED + ISSUED) */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>ਬਾਰਦਾਨਾ ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਹਿਸਟਰੀ (Complete Transaction History)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                ਪ੍ਰਾਪਤ (Received) ਅਤੇ ਕਿਸਾਨਾਂ ਨੂੰ ਜਾਰੀ (Issued) ਬਾਰਦਾਨੇ ਦਾ ਮੁਕੰਮਲ ਲੇਖਾ-ਜੋਖਾ
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setHistoryTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    historyTypeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  ਸਭ (All)
                </button>
                <button
                  onClick={() => setHistoryTypeFilter('RECEIVED')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    historyTypeFilter === 'RECEIVED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  + ਪ੍ਰਾਪਤ (Received)
                </button>
                <button
                  onClick={() => setHistoryTypeFilter('ISSUED')}
                  className={`px-2.5 py-1 rounded-md transition ${
                    historyTypeFilter === 'ISSUED' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  - ਜਾਰੀ (Issued)
                </button>
              </div>

              {/* Bardana Type Filter */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setHistoryBardanaFilter('ALL')}
                  className={`px-2 py-1 rounded-md transition ${
                    historyBardanaFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHistoryBardanaFilter('NEW')}
                  className={`px-2 py-1 rounded-md transition ${
                    historyBardanaFilter === 'NEW' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => setHistoryBardanaFilter('OLD')}
                  className={`px-2 py-1 rounded-md transition ${
                    historyBardanaFilter === 'OLD' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Old
                </button>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-black text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਕਿਸਮ</th>
                  <th className="py-2.5 px-3">ਮਿਤੀ (Date)</th>
                  <th className="py-2.5 px-3">ਰਿਕਾਰਡ / ਵਾਊਚਰ ID</th>
                  <th className="py-2.5 px-3">ਸੰਬੰਧਿਤ ਪਾਰਟੀ (Party / Source / Farmer)</th>
                  <th className="py-2.5 px-3 text-center">ਬਾਰਦਾਨਾ ਕਿਸਮ</th>
                  <th className="py-2.5 px-3 text-right">ਮਾਤਰਾ (ਬੋਰੇ / Bags)</th>
                  <th className="py-2.5 px-3">ਵੇਰਵੇ / ਟਿੱਪਣੀ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 bg-slate-50/50">
                      <Clock className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <span className="font-bold text-slate-600 block">
                        ਕੋਈ ਟ੍ਰਾਂਜੈਕਸ਼ਨ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ (No Transactions Found)
                      </span>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item, idx) => (
                    <tr key={`${item.type}-${item.id}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.type === 'RECEIVED' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px] px-2 py-0.5 rounded">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-700" />
                            <span>RECEIVED (+ ਪ੍ਰਾਪਤ)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] px-2 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3 text-amber-700" />
                            <span>ISSUED (- ਜਾਰੀ)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600 whitespace-nowrap">
                        {item.id}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {item.type === 'RECEIVED' ? (
                          <div>
                            <div className="font-bold text-slate-900">
                              {item.sourceName} ({item.receivedFrom === 'SELLER' ? 'Seller' : 'Agency'})
                            </div>
                            <div className="text-[10px] text-slate-500">Agency: {item.agency}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900">
                              {item.farmerNamePa} ({item.farmerName})
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {item.farmerId} • {item.farmerVillagePa || item.farmerVillage}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            item.bardanaType === 'NEW'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.bardanaType === 'NEW' ? 'New Juth' : 'Old Juth'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black whitespace-nowrap">
                        {item.type === 'RECEIVED' ? (
                          <span className="text-emerald-700 font-black">
                            +{item.bags.toLocaleString('en-IN')}{' '}
                            <span className="text-[10px] font-normal text-slate-500">
                              ({item.boxes} ਬਕਸੇ)
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-800 font-black">
                            -{item.bags.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {item.remarks || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: INVENTORY SUMMARY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>ਵਿਸਤ੍ਰਿਤ ਬਾਰਦਾਨਾ ਸਟਾਕ ਰਿਪੋਰਟ (Detailed Inventory Breakdown)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Juth Card */}
              <div className="bg-emerald-50/50 border border-emerald-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="font-black text-emerald-950 text-sm">
                    ਨਵਾਂ ਬਾਰਦਾਨਾ (New Juths - 500 Bags/Box)
                  </span>
                  <span className="bg-emerald-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded">
                    NEW
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-slate-600">ਕੁੱਲ ਪ੍ਰਾਪਤ ਬਕਸੇ (Received Boxes):</span>
                    <strong className="font-mono text-slate-900">
                      {bardanaRecords
                        .filter((r) => r.bardanaType === 'NEW')
                        .reduce((s, r) => s + r.boxes, 0)}{' '}
                      ਬਕਸੇ
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-slate-600">ਕੁੱਲ ਪ੍ਰਾਪਤ ਬੋਰੇ (Total Received Bags):</span>
                    <strong className="font-mono text-emerald-800 font-bold">
                      +{summary.newBagsReceived.toLocaleString('en-IN')} ਬੋਰੇ
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-slate-600">ਕਿਸਾਨਾਂ ਨੂੰ ਜਾਰੀ (Issued to Farmers):</span>
                    <strong className="font-mono text-amber-800 font-bold">
                      -{summary.newBagsIssued.toLocaleString('en-IN')} ਬੋਰੇ
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5 bg-emerald-100/70 px-2 rounded-lg text-emerald-950 font-bold">
                    <span>ਬਾਕੀ ਬਚਿਆ ਸਟਾਕ (Current Remaining Balance):</span>
                    <strong className="font-mono text-base font-black">
                      {summary.newBagsRemaining.toLocaleString('en-IN')} ਬੋਰੇ
                    </strong>
                  </div>
                </div>
              </div>

              {/* Old Juth Card */}
              <div className="bg-amber-50/50 border border-amber-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-black text-amber-950 text-sm">
                    ਪੁਰਾਣਾ ਬਾਰਦਾਨਾ (Old Juths - 50 Bags/Box)
                  </span>
                  <span className="bg-amber-600 text-white font-mono font-black text-xs px-2 py-0.5 rounded">
                    OLD
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-amber-100">
                    <span className="text-slate-600">ਕੁੱਲ ਪ੍ਰਾਪਤ ਬਕਸੇ (Received Boxes):</span>
                    <strong className="font-mono text-slate-900">
                      {bardanaRecords
                        .filter((r) => r.bardanaType === 'OLD')
                        .reduce((s, r) => s + r.boxes, 0)}{' '}
                      ਬਕਸੇ
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-amber-100">
                    <span className="text-slate-600">ਕੁੱਲ ਪ੍ਰਾਪਤ ਬੋਰੇ (Total Received Bags):</span>
                    <strong className="font-mono text-amber-900 font-bold">
                      +{summary.oldBagsReceived.toLocaleString('en-IN')} ਬੋਰੇ
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-amber-100">
                    <span className="text-slate-600">ਕਿਸਾਨਾਂ ਨੂੰ ਜਾਰੀ (Issued to Farmers):</span>
                    <strong className="font-mono text-amber-800 font-bold">
                      -{summary.oldBagsIssued.toLocaleString('en-IN')} ਬੋਰੇ
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5 bg-amber-100/70 px-2 rounded-lg text-amber-950 font-bold">
                    <span>ਬਾਕੀ ਬਚਿਆ ਸਟਾਕ (Current Remaining Balance):</span>
                    <strong className="font-mono text-base font-black">
                      {summary.oldBagsRemaining.toLocaleString('en-IN')} ਬੋਰੇ
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Parties / Arhtiyas Bardana Ledger & Balance */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span className="font-black text-slate-900 text-sm">
                    ਹੋਰ ਆੜ੍ਹਤੀਆਂ / ਪਾਰਟੀਆਂ ਦਾ ਬਾਰਦਾਨਾ ਖਾਤਾ (Other Arhtiyas / Parties Bardana Ledger)
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  ਉਧਾਰ ਦਿੱਤਾ / ਲਿਆ ਬਾਰਦਾਨਾ ਬਕਾਇਆ
                </span>
              </div>

              {summary.otherPartyBalances && summary.otherPartyBalances.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-200/80 text-slate-700 font-black text-[11px] uppercase">
                      <tr>
                        <th className="py-2 px-3">ਪਾਰਟੀ / ਆੜ੍ਹਤੀਆ ਦਾ ਨਾਂ</th>
                        <th className="py-2 px-3">ਮੋਬਾਈਲ</th>
                        <th className="py-2 px-3 text-right">ਪ੍ਰਾਪਤ / ਲਿਆ (Received)</th>
                        <th className="py-2 px-3 text-right">ਵਾਪਸ ਕੀਤਾ (Returned)</th>
                        <th className="py-2 px-3 text-right">ਉਧਾਰ ਦਿੱਤਾ (Lent)</th>
                        <th className="py-2 px-3 text-right font-black">ਬਾਕੀ ਬਕਾਇਆ (Net Balance)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {summary.otherPartyBalances.map((party, idx) => (
                        <tr key={idx} className="hover:bg-slate-100/60 transition">
                          <td className="py-2 px-3 font-bold text-slate-900">{party.partyName}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono">{party.partyMobile || '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">
                            {party.borrowedOrReceivedBags.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-blue-700 font-bold">
                            {party.returnedBags.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-700 font-bold">
                            {party.givenOrLoanedBags.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-sm">
                            {party.netBalance > 0 ? (
                              <span className="text-emerald-700">+{party.netBalance} (ਅਸੀਂ ਦੇਣੇ ਹਨ)</span>
                            ) : party.netBalance < 0 ? (
                              <span className="text-rose-700">{party.netBalance} (ਉਨ੍ਹਾਂ ਵੱਲ ਬਾਕੀ)</span>
                            ) : (
                              <span className="text-slate-500">0 (ਬਰਾਬਰ)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 font-medium">
                  ਕੋਈ ਹੋਰ ਪਾਰਟੀ ਲੈਣ-ਦੇਣ ਦਰਜ ਨਹੀਂ ਹੈ। (No other party transactions recorded yet).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      <BardanaViewModal
        record={viewRecord}
        isOpen={!!viewRecord}
        onClose={() => setViewRecord(null)}
        onEdit={(rec) => setEditRecord(rec)}
      />

      {/* Edit Modal */}
      <BardanaEditModal
        record={editRecord}
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
      />

      {/* Seller Master Modal */}
      <SellerMasterModal
        isOpen={isSellerModalOpen}
        onClose={() => setIsSellerModalOpen(false)}
        onSelectSeller={(s) => {
          setSelectedSellerId(s.id);
          setSourceName(s.firmName);
        }}
      />
    </div>
  );
};
