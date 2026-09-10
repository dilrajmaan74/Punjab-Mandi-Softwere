import React, { useState } from 'react';
import { TruckMasterRecord } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Truck,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Search,
  Upload,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface TruckMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTruck?: (truck: TruckMasterRecord) => void;
}

export const TruckMasterModal: React.FC<TruckMasterModalProps> = ({
  isOpen,
  onClose,
  onSelectTruck
}) => {
  const { trucks, addTruck, addTrucksBulk, updateTruck, deleteTruck } = useMandi();
  const { notifySaveSuccess, notifyDeleteSuccess, notifyError } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'bulk'>('list');

  // Single Add / Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [truckNo, setTruckNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [truckUnion, setTruckUnion] = useState('');
  const [capacityBags, setCapacityBags] = useState('');
  const [notes, setNotes] = useState('');

  // Bulk Import state
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setTruckNo('');
    setDriverName('');
    setDriverMobile('');
    setTruckUnion('');
    setCapacityBags('');
    setNotes('');
  };

  const handleStartEdit = (t: TruckMasterRecord) => {
    setEditingId(t.id);
    setTruckNo(t.truckNo);
    setDriverName(t.driverName || '');
    setDriverMobile(t.driverMobile || t.driverPhone || '');
    setTruckUnion(t.truckUnion || '');
    setCapacityBags(t.capacityBags ? String(t.capacityBags) : '');
    setNotes(t.notes || '');
    setActiveTab('add');
  };

  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckNo.trim()) return;

    if (editingId) {
      updateTruck(editingId, {
        truckNo: truckNo.trim().toUpperCase(),
        driverName: driverName.trim(),
        driverPhone: driverMobile.trim(),
        driverMobile: driverMobile.trim(),
        truckUnion: truckUnion.trim(),
        capacityBags: capacityBags ? parseInt(capacityBags, 10) : undefined,
        notes: notes.trim()
      });
      notifySaveSuccess({
        titlePa: 'ਟਰੱਕ ਰਿਕਾਰਡ ਅੱਪਡੇਟ ਹੋ ਗਿਆ',
        titleEn: 'Truck Record Updated',
        messagePa: `ਟਰੱਕ ਨੰਬਰ: ${truckNo.toUpperCase()}`
      });
    } else {
      addTruck({
        truckNo: truckNo.trim().toUpperCase(),
        driverName: driverName.trim(),
        driverPhone: driverMobile.trim(),
        driverMobile: driverMobile.trim(),
        truckUnion: truckUnion.trim(),
        capacityBags: capacityBags ? parseInt(capacityBags, 10) : undefined,
        notes: notes.trim()
      });
      notifySaveSuccess({
        titlePa: 'ਟਰੱਕ ਮਾਸਟਰ ਵਿੱਚ ਸੇਵ ਹੋ ਗਿਆ',
        titleEn: 'Truck Added to Master',
        messagePa: `ਟਰੱਕ ਨੰਬਰ: ${truckNo.toUpperCase()}`
      });
    }

    resetForm();
    setActiveTab('list');
  };

  const handleBulkImport = () => {
    setBulkError('');
    if (!bulkText.trim()) {
      setBulkError('ਕਿਰਪਾ ਕਰਕੇ ਟਰੱਕਾਂ ਦਾ ਡਾਟਾ ਪੇਸਟ ਕਰੋ (Please paste trucks text).');
      return;
    }

    const lines = bulkText.split('\n');
    const parsedList: Array<Omit<TruckMasterRecord, 'id' | 'createdAt'>> = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Can be comma separated: "PB10AZ9596, Gurmeet Singh, 9814774651, Shahkot Union"
      // or tab separated, or just truck number
      const parts = trimmed.split(/[,|\t]/).map((p) => p.trim());
      const tNo = parts[0]?.toUpperCase().replace(/\s+/g, ' ');
      if (tNo) {
        parsedList.push({
          truckNo: tNo,
          driverName: parts[1] || '',
          driverPhone: parts[2] || '',
          driverMobile: parts[2] || '',
          truckUnion: parts[3] || '',
          capacityBags: parts[4] ? parseInt(parts[4], 10) || undefined : undefined
        });
      }
    });

    if (parsedList.length === 0) {
      setBulkError('ਕੋਈ ਵੈਧ ਟਰੱਕ ਨੰਬਰ ਨਹੀਂ ਮਿਲਿਆ (No valid truck records found).');
      return;
    }

    const res = addTrucksBulk(parsedList);
    notifySaveSuccess({
      titlePa: `${res.added + res.updated} ਟਰੱਕ ਸਫਲਤਾਪੂਰਵਕ ਇੰਪੋਰਟ ਹੋ ਗਏ`,
      titleEn: 'Trucks Imported Successfully',
      messagePa: `ਨਵੇਂ ਸ਼ਾਮਲ: ${res.added} | ਅੱਪਡੇਟ: ${res.updated}`
    });

    setBulkText('');
    setActiveTab('list');
  };

  const filteredTrucks = trucks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[^a-z0-9]/gi, '');
    const cleanTruck = t.truckNo.toLowerCase().replace(/[^a-z0-9]/gi, '');
    return (
      cleanTruck.includes(cleanQ) ||
      t.truckNo.toLowerCase().includes(q) ||
      (t.driverName && t.driverName.toLowerCase().includes(q)) ||
      ((t.driverMobile || t.driverPhone) && (t.driverMobile || t.driverPhone).includes(q)) ||
      (t.truckUnion && t.truckUnion.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                <span>ਟਰੱਕ ਮਾਸਟਰ ਡਾਇਰੈਕਟਰੀ</span>
                <span className="text-xs font-normal text-slate-300 font-mono">
                  ({trucks.length} Trucks)
                </span>
              </h2>
              <p className="text-[11px] text-slate-300">
                ਟਰੱਕ ਨੰਬਰ, ਡਰਾਈਵਰ, ਮੋਬਾਈਲ ਅਤੇ ਟਰੱਕ ਯੂਨੀਅਨ ਮਾਸਟਰ ਲਿਸਟ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('list');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 border-t-2 border-slate-900 border-x border-b-transparent shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ਸਾਰੇ ਟਰੱਕ ({trucks.length})
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('add');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-white text-slate-900 border-t-2 border-slate-900 border-x border-b-transparent shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingId ? 'ਟਰੱਕ ਸੋਧੋ (Edit)' : 'ਨਵਾਂ ਟਰੱਕ ਸ਼ਾਮਲ ਕਰੋ (Add Single)'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('bulk');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'bulk'
                ? 'bg-white text-slate-900 border-t-2 border-slate-900 border-x border-b-transparent shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>ਇਕੱਠੇ 100+ ਟਰੱਕ ਇੰਪੋਰਟ ਕਰੋ (Bulk Import)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* TAB 1: LIST */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ਟਰੱਕ ਨੰਬਰ (ਜਿਵੇਂ 9596), ਡਰਾਈਵਰ ਦਾ ਨਾਮ ਜਾਂ ਯੂਨੀਅਨ ਖੋਜੋ..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              {filteredTrucks.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Truck className="w-10 h-10 mx-auto opacity-30 mb-2" />
                  <p className="text-xs font-bold">ਕੋਈ ਟਰੱਕ ਨਹੀਂ ਮਿਲਿਆ (No Trucks Found)</p>
                  <p className="text-[11px] mt-1">
                    ਉੱਪਰ 'ਨਵਾਂ ਟਰੱਕ ਸ਼ਾਮਲ ਕਰੋ' ਜਾਂ 'ਇਕੱਠੇ 100+ ਟਰੱਕ ਇੰਪੋਰਟ ਕਰੋ' ਦੀ ਵਰਤੋਂ ਕਰੋ।
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {filteredTrucks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {t.truckNo}
                          </span>
                          {t.truckUnion && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                              {t.truckUnion}
                            </span>
                          )}
                          {t.capacityBags && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              (ਸਮਰੱਥਾ: {t.capacityBags} ਬੋਰੀਆਂ)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {t.driverName && (
                            <span>
                              <strong className="text-slate-700">ਡਰਾਈਵਰ:</strong> {t.driverName}
                            </span>
                          )}
                          {(t.driverMobile || t.driverPhone) && (
                            <span>
                              <strong className="text-slate-700">ਮੋਬਾਈਲ:</strong> {t.driverMobile || t.driverPhone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onSelectTruck && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTruck(t);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                          >
                            ਚੁਣੋ (Select)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(t)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="ਸੋਧੋ (Edit)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`ਕੀ ਤੁਸੀਂ ਟਰੱਕ ${t.truckNo} ਨੂੰ ਮਿਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
                              deleteTruck(t.id);
                              notifyDeleteSuccess({
                                titlePa: 'ਟਰੱਕ ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ',
                                titleEn: 'Truck Deleted'
                              });
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="ਮਿਟਾਓ (Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD / EDIT SINGLE */}
          {activeTab === 'add' && (
            <form onSubmit={handleSaveSingle} className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  ਟਰੱਕ / ਟਰਾਲਾ ਨੰਬਰ (Truck No.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={truckNo || ''}
                  onChange={(e) => setTruckNo(e.target.value.toUpperCase())}
                  placeholder="e.g. PB-10-AZ-9596"
                  className="w-full px-3 py-2 text-xs font-black font-mono text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ਡਰਾਈਵਰ ਦਾ ਨਾਮ (Driver Name)
                  </label>
                  <input
                    type="text"
                    value={driverName || ''}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. ਕੁਲਵੰਤ ਸਿੰਘ"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ਡਰਾਈਵਰ ਮੋਬਾਈਲ (Driver Mobile)
                  </label>
                  <input
                    type="tel"
                    value={driverMobile || ''}
                    onChange={(e) => setDriverMobile(e.target.value)}
                    placeholder="e.g. 98147-74651"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ਟਰੱਕ ਯੂਨੀਅਨ (Truck Union)
                  </label>
                  <input
                    type="text"
                    value={truckUnion || ''}
                    onChange={(e) => setTruckUnion(e.target.value)}
                    placeholder="e.g. ਸ਼ਾਹਕੋਟ ਟਰੱਕ ਯੂਨੀਅਨ"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    ਬੋਰੀਆਂ ਸਮਰੱਥਾ (Capacity Bags)
                  </label>
                  <input
                    type="number"
                    value={capacityBags || ''}
                    onChange={(e) => setCapacityBags(e.target.value)}
                    placeholder="e.g. 600"
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">ਨੋਟ (Notes)</label>
                <input
                  type="text"
                  value={notes || ''}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ਕੋਈ ਹੋਰ ਵੇਰਵਾ"
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
                >
                  {editingId ? 'ਅੱਪਡੇਟ ਕਰੋ (Update)' : 'ਸੇਵ ਕਰੋ (Save Truck)'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BULK IMPORT 100+ TRUCKS */}
          {activeTab === 'bulk' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>100+ ਟਰੱਕ ਆਸਾਨੀ ਨਾਲ ਇੱਕੋ ਵਾਰ ਇੰਪੋਰਟ ਕਰੋ</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Excel ਜਾਂ ਕਿਸੇ ਵੀ ਸੂਚੀ ਵਿੱਚੋਂ ਕਾਪੀ ਕਰਕੇ ਹੇਠਾਂ ਪੇਸਟ ਕਰੋ। ਹਰ ਲਾਈਨ ਵਿੱਚ ਇੱਕ ਟਰੱਕ ਹੋਵੇ:
                </p>
                <div className="bg-white/80 p-2 rounded font-mono text-[11px] text-slate-700 border border-emerald-200">
                  PB 10 AZ 9596, ਕੁਲਵੰਤ ਸਿੰਘ, 9814774651, ਸ਼ਾਹਕੋਟ ਯੂਨੀਅਨ, 600
                  <br />
                  PB 08 CW 1234, ਜਗਜੀਤ ਸਿੰਘ, 9876543210, ਲੋਹੀਆਂ ਯੂਨੀਅਨ
                  <br />
                  PB 11 BB 5678
                </div>
              </div>

              {bulkError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              <textarea
                value={bulkText || ''}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="ਇੱਥੇ ਟਰੱਕਾਂ ਦੀ ਲਿਸਟ ਪੇਸਟ ਕਰੋ (Paste list of trucks here)..."
                rows={10}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 font-bold">
                  ਕੁੱਲ ਲਾਈਨਾਂ: {bulkText ? bulkText.split('\n').filter((l) => l.trim()).length : 0}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkText('')}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    ਸਾਫ਼ ਕਰੋ (Clear)
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    className="px-5 py-2 text-xs font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>ਇੰਪੋਰਟ ਕਰੋ (Import Trucks)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
