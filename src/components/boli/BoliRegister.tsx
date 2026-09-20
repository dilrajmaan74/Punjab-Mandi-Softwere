import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { BoliRecord } from '../../types/mandi';
import { DateInput } from '../common/DateInput';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import { VoiceWeighmentAssistant, ParsedVoiceData } from '../common/VoiceWeighmentAssistant';
import { formatCurrency } from '../../utils/calculations';
import {
  Gavel,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Send,
  Calendar,
  Layers,
  TrendingUp,
  X
} from 'lucide-react';

const COMMON_CROPS = [
  { id: 'Paddy PR-126', labelEn: 'Paddy (PR-126)', labelPa: 'ਝੋਨਾ (ਪੀ.ਆਰ 126)' },
  { id: '1509 Basmati', labelEn: '1509 Basmati', labelPa: '1509 ਬਾਸਮਤੀ' },
  { id: '1121 Basmati', labelEn: '1121 Basmati', labelPa: '1121 ਬਾਸਮਤੀ' },
  { id: 'Paddy PR-131', labelEn: 'Paddy (PR-131)', labelPa: 'ਝੋਨਾ (ਪੀ.ਆਰ 131)' },
  { id: 'Wheat (Kanak)', labelEn: 'Wheat (Kanak)', labelPa: 'ਕਣਕ (Wheat)' },
  { id: 'Sarson (Mustard)', labelEn: 'Mustard (Sarson)', labelPa: 'ਸਰ੍ਹੋਂ (Sarson)' }
];

export const BoliRegister: React.FC = () => {
  const {
    farmers,
    boliRecords,
    addBoliRecord,
    updateBoliRecord,
    deleteBoliRecord,
    agencies,
    settings,
    activeFirm,
    setActiveSection,
    setSelectedFarmerForBags,
    language
  } = useMandi();

  const isEn = language === 'en';
  const { notifySaveSuccess, notifyDeleteSuccess, confirmDelete } = useNotification();

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBoliId, setEditingBoliId] = useState<string | null>(null);

  // Form Fields
  const getTodayFormatted = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const [date, setDate] = useState(getTodayFormatted());
  const [heapNumber, setHeapNumber] = useState(`DH-${boliRecords.length + 1}`);
  const [selectedFarmerId, setSelectedFarmerId] = useState(farmers[0]?.id || '');
  const [crop, setCrop] = useState('Paddy PR-126');
  const [bags, setBags] = useState<string>('100');
  const [rate, setRate] = useState<string>('2320');
  const [agency, setAgency] = useState(agencies[0]?.nameEn || 'Pungrain');
  const [buyerName, setBuyerName] = useState('');
  const [gatePassNumber, setGatePassNumber] = useState('');
  const [status, setStatus] = useState<'CONFIRMED' | 'PENDING' | 'COMPLETED'>('CONFIRMED');

  const farmerOptions: SearchableSelectOption[] = useMemo(() => {
    return farmers.map((f) => ({
      value: f.id,
      label: `${f.farmerNamePa || f.farmerName} (${f.village})`,
      subLabel: `${f.id} • Mob: ${f.mobile} • S/o ${f.fatherName || '—'}`
    }));
  }, [farmers]);

  // Voice assistant auto-fill
  const handleVoiceApply = (data: ParsedVoiceData) => {
    if (data.farmer) {
      setSelectedFarmerId(data.farmer.id);
    }
    if (data.totalBags) {
      setBags(String(data.totalBags));
    } else if (data.newBags) {
      setBags(String(data.newBags));
    }
    if (data.ratePerQtl) {
      setRate(String(data.ratePerQtl));
    }
    setIsFormOpen(true);
  };

  // Open edit modal
  const handleEditClick = (record: BoliRecord) => {
    setEditingBoliId(record.id);
    setDate(record.date);
    setHeapNumber(record.heapNumber || '');
    setSelectedFarmerId(record.farmerId);
    setCrop(record.crop);
    setBags(String(record.bags));
    setRate(String(record.rate));
    setAgency(record.agency);
    setBuyerName(record.buyerName || '');
    setGatePassNumber(record.gatePassNumber || '');
    setStatus(record.status);
    setIsFormOpen(true);
  };

  // Open create form
  const handleOpenCreate = () => {
    setEditingBoliId(null);
    setDate(getTodayFormatted());
    setHeapNumber(`DH-${boliRecords.length + 1}`);
    setSelectedFarmerId(farmers[0]?.id || '');
    setBags('100');
    setRate('2320');
    setBuyerName('');
    setGatePassNumber('');
    setStatus('CONFIRMED');
    setIsFormOpen(true);
  };

  // Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const farmer = farmers.find((f) => f.id === selectedFarmerId);
    const bagsNum = parseInt(bags, 10) || 0;
    const rateNum = parseFloat(rate) || 0;
    // Standard Mandi bag weight = 37.50 kg
    const totalWeightKg = bagsNum * (settings?.fixedBagWeightKg || 37.5);
    const qul = Math.floor(totalWeightKg / 100);
    const kg = Math.round(totalWeightKg % 100);
    const totalAmount = Math.round((totalWeightKg / 100) * rateNum);

    if (editingBoliId) {
      updateBoliRecord(editingBoliId, {
        date,
        farmerId: selectedFarmerId,
        farmerName: farmer?.farmerName || '',
        farmerNamePa: farmer?.farmerNamePa || '',
        farmerVillage: farmer?.village || '',
        farmerMobile: farmer?.mobile || '',
        crop,
        heapNumber,
        bags: bagsNum,
        qul,
        kg,
        totalWeightKg,
        rate: rateNum,
        agency,
        buyerName: buyerName.trim() || agency,
        totalAmount,
        gatePassNumber,
        status
      });
      notifySaveSuccess({
        titleEn: 'Boli Record Updated',
        titlePa: 'ਬੋਲੀ ਰਿਕਾਰਡ ਸੋਧਿਆ ਗਿਆ'
      });
    } else {
      addBoliRecord({
        date,
        farmerId: selectedFarmerId,
        farmerName: farmer?.farmerName || '',
        farmerNamePa: farmer?.farmerNamePa || '',
        farmerVillage: farmer?.village || '',
        farmerMobile: farmer?.mobile || '',
        crop,
        heapNumber,
        bags: bagsNum,
        qul,
        kg,
        totalWeightKg,
        rate: rateNum,
        agency,
        buyerName: buyerName.trim() || agency,
        totalAmount,
        gatePassNumber,
        status
      });
      notifySaveSuccess({
        titleEn: 'New Boli Auction Saved',
        titlePa: 'ਨਵੀਂ ਬੋਲੀ ਦਰਜ ਕੀਤੀ ਗਈ'
      });
    }

    setIsFormOpen(false);
    setEditingBoliId(null);
  };

  const handleDelete = (record: BoliRecord) => {
    confirmDelete({
      recordNameEn: `Boli Heap ${record.heapNumber || record.id}`,
      recordNamePa: `ਬੋਲੀ ਢੇਰੀ ${record.heapNumber || record.id}`,
      recordId: record.id,
      itemDetails: [
        { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ', value: record.farmerNamePa || record.farmerName || '—' },
        { labelEn: 'Bags', labelPa: 'ਬੋਰੀਆਂ', value: `${record.bags} Bags @ ₹${record.rate}` }
      ],
      onConfirm: () => {
        deleteBoliRecord(record.id);
        notifyDeleteSuccess({
          titleEn: 'Boli entry deleted',
          titlePa: 'ਬੋਲੀ ਐਂਟਰੀ ਹਟਾਈ ਗਈ'
        });
      }
    });
  };

  // Transfer directly to Weighment Slip (ਤੁਲਾਈ ਲਈ ਭੇਜੋ)
  const handleSendToWeighment = (record: BoliRecord) => {
    const farmer = farmers.find((f) => f.id === record.farmerId);
    if (farmer) {
      setSelectedFarmerForBags(farmer);
    }
    setActiveSection('bags-entry');
  };

  // Filtered List
  const filteredBoli = useMemo(() => {
    return boliRecords.filter((b) => {
      const matchesCrop = selectedCropFilter === 'ALL' || b.crop === selectedCropFilter;
      if (!matchesCrop) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (b.heapNumber && b.heapNumber.toLowerCase().includes(q)) ||
        (b.farmerName && b.farmerName.toLowerCase().includes(q)) ||
        (b.farmerNamePa && b.farmerNamePa.includes(q)) ||
        (b.farmerVillage && b.farmerVillage.toLowerCase().includes(q)) ||
        (b.buyerName && b.buyerName.toLowerCase().includes(q)) ||
        (b.agency && b.agency.toLowerCase().includes(q)) ||
        b.date.includes(q)
      );
    });
  }, [boliRecords, selectedCropFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalDheris = filteredBoli.length;
    const totalBags = filteredBoli.reduce((sum, b) => sum + (b.bags || 0), 0);
    const totalValue = filteredBoli.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const confirmedCount = filteredBoli.filter((b) => b.status === 'CONFIRMED').length;
    const avgRate = totalBags > 0 ? Math.round(totalValue / ((totalBags * 37.5) / 100)) : 0;
    return { totalDheris, totalBags, totalValue, confirmedCount, avgRate };
  }, [filteredBoli]);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>{isEn ? 'Boli (Auction) Register' : 'ਮੰਡੀ ਬੋਲੀ ਰਜਿਸਟਰ (Boli Auction Register)'}</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                {activeFirm?.name || settings?.firmNameEn}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              {isEn
                ? 'Daily heap (dheri) auction bidding, purchaser allocation, and MSP tracking'
                : 'ਰੋਜ਼ਾਨਾ ਢੇਰੀਆਂ ਦੀ ਬੋਲੀ, ਖਰੀਦਦਾਰ ਏਜੰਸੀਆਂ/ਮਿੱਲਰਾਂ ਦੀ ਵੰਡ ਅਤੇ ਸਰਕਾਰੀ ਰੇਟ ਰਜਿਸਟਰ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-300 flex items-center gap-1.5 cursor-pointer"
            title="Print Auction Register"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isEn ? 'Print Boli Sheet' : 'ਬੋਲੀ ਸ਼ੀਟ ਪ੍ਰਿੰਟ ਕਰੋ'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? '+ New Boli Entry' : '+ ਨਵੀਂ ਢੇਰੀ ਬੋਲੀ ਦਰਜ ਕਰੋ'}</span>
          </button>
        </div>
      </div>

      {/* Voice Assistant for Boli */}
      <VoiceWeighmentAssistant onApplyData={handleVoiceApply} />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>{isEn ? 'Total Dheris (Heaps)' : 'ਕੁੱਲ ਢੇਰੀਆਂ'}</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">{stats.totalDheris}</div>
          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">{stats.confirmedCount} ਵੇਚੀਆਂ / ਪਾਸ</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>{isEn ? 'Estimated Bags' : 'ਲਗਭਗ ਬੋਰੀਆਂ'}</span>
          </div>
          <div className="text-xl font-black text-blue-900 mt-1 font-mono">{stats.totalBags}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">
            {((stats.totalBags * 37.5) / 100).toFixed(1)} Qtl (ਕੁਇੰਟਲ)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <Gavel className="w-3.5 h-3.5 text-purple-600" />
            <span>{isEn ? 'Avg Boli Rate' : 'ਔਸਤ ਬੋਲੀ ਭਾਅ'}</span>
          </div>
          <div className="text-xl font-black text-purple-900 mt-1 font-mono">₹{stats.avgRate || '2,320'}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">ਪ੍ਰਤੀ ਕੁਇੰਟਲ (/Qtl)</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isEn ? 'Total Auction Value' : 'ਕੁੱਲ ਅਨੁਮਾਨਿਤ ਰਕਮ'}</span>
          </div>
          <div className="text-xl font-black text-emerald-900 mt-1 font-mono">{formatCurrency(stats.totalValue)}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-0.5">ਮੰਡੀ ਬੋਲੀ ਕੁੱਲ ਮੁੱਲ</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search heap #, farmer, village, agency...' : 'ਢੇਰੀ ਨੰਬਰ, ਕਿਸਾਨ, ਪਿੰਡ ਜਾਂ ਏਜੰਸੀ ਖੋਜੋ...'}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Crop Filter */}
          <select
            value={selectedCropFilter}
            onChange={(e) => setSelectedCropFilter(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">{isEn ? 'All Crops' : 'ਸਾਰੀਆਂ ਫ਼ਸਲਾਂ (All Crops)'}</option>
            {COMMON_CROPS.map((c) => (
              <option key={c.id} value={c.id}>
                {isEn ? c.labelEn : c.labelPa}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-bold">
          {filteredBoli.length} {isEn ? 'Entries' : 'ਢੇਰੀਆਂ'}
        </div>
      </div>

      {/* Boli Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                <th className="py-2.5 px-3">ਢੇਰੀ ਨੰ: (Heap)</th>
                <th className="py-2.5 px-3">ਮਿਤੀ (Date)</th>
                <th className="py-2.5 px-3">ਕਿਸਾਨ ਤੇ ਪਿੰਡ (Farmer)</th>
                <th className="py-2.5 px-3">ਫ਼ਸਲ (Crop)</th>
                <th className="py-2.5 px-3 text-right">ਬੋਰੀਆਂ (Bags)</th>
                <th className="py-2.5 px-3 text-right">ਬੋਲੀ ਭਾਅ (Rate/Qtl)</th>
                <th className="py-2.5 px-3">ਖਰੀਦਦਾਰ ਏਜੰਸੀ (Buyer)</th>
                <th className="py-2.5 px-3 text-right">ਕੁੱਲ ਮੁੱਲ (Value)</th>
                <th className="py-2.5 px-3 text-center">ਸਟੇਟਸ (Status)</th>
                <th className="py-2.5 px-3 text-center">ਐਕਸ਼ਨ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBoli.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-400">
                    <Gavel className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-xs">
                      {isEn ? 'No Boli auction records found' : 'ਕੋਈ ਬੋਲੀ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isEn ? 'Click "+ New Boli Entry" to add auction record' : 'ਨਵੀਂ ਬੋਲੀ ਦਰਜ ਕਰਨ ਲਈ ਉੱਪਰ ਦਿੱਤਾ ਬਟਨ ਦਬਾਓ'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBoli.map((b) => (
                  <tr key={b.id} className="hover:bg-amber-50/40 transition">
                    <td className="py-2 px-3 font-mono font-black text-amber-900">{b.heapNumber || b.id.slice(-6)}</td>
                    <td className="py-2 px-3 font-medium text-slate-600">{b.date}</td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{b.farmerNamePa || b.farmerName || '—'}</div>
                      <div className="text-[10px] text-slate-500">{b.farmerVillage} • {b.farmerId}</div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        {b.crop}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {b.bags} <span className="text-[10px] text-slate-400">Bags</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                      ₹{b.rate} <span className="text-[10px] text-slate-400">/Qtl</span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      <div className="font-bold">{b.agency}</div>
                      {b.buyerName && b.buyerName !== b.agency && (
                        <div className="text-[10px] text-slate-500">{b.buyerName}</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : b.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {b.status === 'CONFIRMED' ? 'ਵੇਚੀ ਗਈ (Sold)' : b.status === 'COMPLETED' ? 'ਮੁਕੰਮਲ' : 'ਜਾਰੀ (Pending)'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSendToWeighment(b)}
                          className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-300 transition"
                          title="ਤੁਲਾਈ ਲਈ ਭੇਜੋ (Send to Weighment Slip)"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(b)}
                          className="p-1 bg-slate-50 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition"
                          title="ਸੋਧੋ (Edit)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition"
                          title="ਹਟਾਓ (Delete)"
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

      {/* Create / Edit Boli Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Gavel className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {editingBoliId
                    ? (isEn ? 'Edit Boli Auction Record' : 'ਬੋਲੀ ਐਂਟਰੀ ਸੋਧੋ (Edit Boli)')
                    : (isEn ? 'New Mandi Boli (Auction) Entry' : 'ਨਵੀਂ ਮੰਡੀ ਬੋਲੀ ਐਂਟਰੀ (New Boli Entry)')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateInput
                  label={isEn ? 'Date' : 'ਮਿਤੀ (Date)'}
                  value={date}
                  onChange={setDate}
                  required
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Heap / Dheri Number' : 'ਢੇਰੀ ਨੰਬਰ (Dheri No)'}
                  </label>
                  <input
                    type="text"
                    value={heapNumber}
                    onChange={(e) => setHeapNumber(e.target.value)}
                    placeholder="DH-1"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Farmer Selection */}
              <div>
                <SearchableSelect
                  id="boli-farmer-select"
                  label={isEn ? 'Select Farmer' : 'ਕਿਸਾਨ ਚੁਣੋ (Select Farmer)'}
                  value={selectedFarmerId}
                  onChange={setSelectedFarmerId}
                  options={farmerOptions}
                  placeholder="ਕਿਸਾਨ ਖੋਜੋ..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Crop' : 'ਫ਼ਸਲ (Crop)'}
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {COMMON_CROPS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.labelPa} ({c.labelEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Estimated Bags' : 'ਲਗਭਗ ਬੋਰੀਆਂ (Estimated Bags)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bags}
                    onChange={(e) => setBags(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Boli Rate (₹/Qtl)' : 'ਬੋਲੀ ਭਾਅ (₹ ਪ੍ਰਤੀ ਕੁਇੰਟਲ)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="100"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="2320"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-black font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Procurement Agency' : 'ਖਰੀਦ ਏਜੰਸੀ (Procurement Agency)'}
                  </label>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  >
                    {agencies.map((a) => (
                      <option key={a.id} value={a.nameEn}>
                        {a.namePa} ({a.nameEn})
                      </option>
                    ))}
                    <option value="Private Miller / Trader">ਪ੍ਰਾਈਵੇਟ ਮਿੱਲਰ / ਵਪਾਰੀ (Private)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Purchaser / Trader Name' : 'ਖਰੀਦਦਾਰ / ਮਿੱਲ ਦਾ ਨਾਂ (Buyer / Trader)'}
                  </label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="e.g. Kang Modern Rice Sheller"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {isEn ? 'Auction Status' : 'ਬੋਲੀ ਸਟੇਟਸ (Status)'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="CONFIRMED">ਵੇਚੀ ਗਈ (CONFIRMED / SOLD)</option>
                    <option value="PENDING">ਬੋਲੀ ਜਾਰੀ (PENDING)</option>
                    <option value="COMPLETED">ਤੁਲਾਈ ਮੁਕੰਮਲ (COMPLETED)</option>
                  </select>
                </div>
              </div>

              {/* Live Estimated Value calculation */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-900 font-bold uppercase block">
                    ਅਨੁਮਾਨਿਤ ਕੁੱਲ ਵਜ਼ਨ ਤੇ ਰਕਮ
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {((parseInt(bags, 10) || 0) * (settings?.fixedBagWeightKg || 37.5) / 100).toFixed(2)} ਕੁਇੰਟਲ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-900 font-bold uppercase block">ਕੁੱਲ ਅਨੁਮਾਨਿਤ ਰਕਮ</span>
                  <span className="text-base font-black font-mono text-emerald-900">
                    {formatCurrency(
                      Math.round(
                        (((parseInt(bags, 10) || 0) * (settings?.fixedBagWeightKg || 37.5)) / 100) *
                          (parseFloat(rate) || 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
                >
                  {isEn ? 'Cancel' : 'ਰੱਦ ਕਰੋ'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-xs shadow-md transition active:scale-95"
                >
                  {editingBoliId ? (isEn ? 'Update Boli' : 'ਬੋਲੀ ਸੋਧੋ') : (isEn ? 'Save Boli Record' : 'ਬੋਲੀ ਦਰਜ ਕਰੋ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
