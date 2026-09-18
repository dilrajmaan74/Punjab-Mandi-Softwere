import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { SearchableSelect, SearchableSelectOption } from '../common/SearchableSelect';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  Users,
  Package,
  ShoppingCart,
  Box,
  Coins,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { RecycleBinItem } from '../../types/mandi';
import { FarmerAuditLogModal } from './FarmerAuditLogModal';
import { FarmerPermanentDeleteModal } from './FarmerPermanentDeleteModal';

const TYPE_CONFIG: Record<
  RecycleBinItem['type'],
  { labelEn: string; labelPa: string; icon: any; color: string }
> = {
  FARMER: {
    labelEn: 'Farmer',
    labelPa: 'ਕਿਸਾਨ',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  BAGS_ENTRY: {
    labelEn: 'Mandi Arrival',
    labelPa: 'ਆਮਦ ਤੁਲਾਈ',
    icon: Package,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  DAILY_PURCHASE: {
    labelEn: 'Agency Purchase',
    labelPa: 'ਏਜੰਸੀ ਖਰੀਦ',
    icon: ShoppingCart,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  BARDANA: {
    labelEn: 'Bardana',
    labelPa: 'ਬਾਰਦਾਨਾ',
    icon: Box,
    color: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  ADVANCE: {
    labelEn: 'Advance / Loan',
    labelPa: 'ਪੇਸ਼ਗੀ / ਕਰਜ਼ਾ',
    icon: Coins,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  LEFTING: {
    labelEn: 'Lefting / Transport',
    labelPa: 'ਲਿਫਟਿੰਗ ਰਵਾਨਗੀ',
    icon: Truck,
    color: 'bg-slate-100 text-slate-800 border-slate-200'
  },
  PAYMENT: {
    labelEn: 'Payment Settlement',
    labelPa: 'ਭੁਗਤਾਨ',
    icon: CreditCard,
    color: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  BOLI: {
    labelEn: 'Boli Auction',
    labelPa: 'ਬੋਲੀ',
    icon: Package,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  }
};

export const RecycleBin: React.FC = () => {
  const {
    recycleBinItems,
    restoreRecycleBinItem,
    permanentlyDeleteRecycleBinItem,
    emptyRecycleBin,
    language
  } = useMandi();

  const isEn = language === 'en';

  const { notifySaveSuccess, notifyDeleteSuccess, confirmDelete } = useNotification();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [farmerToPermanentlyDelete, setFarmerToPermanentlyDelete] = useState<RecycleBinItem | null>(null);

  const filterTypeOptions: SearchableSelectOption[] = useMemo(() => [
    { value: 'ALL', label: isEn ? 'All Types' : 'ਸਾਰੀਆਂ ਕਿਸਮਾਂ (All Types)' },
    { value: 'FARMER', label: isEn ? 'Farmers' : 'ਕਿਸਾਨ (Farmers)' },
    { value: 'BAGS_ENTRY', label: isEn ? 'Mandi Arrivals' : 'ਆਮਦ ਤੁਲਾਈ (Mandi Arrivals)' },
    { value: 'DAILY_PURCHASE', label: isEn ? 'Agency Purchases' : 'ਏਜੰਸੀ ਖਰੀਦ (Purchases)' },
    { value: 'BARDANA', label: isEn ? 'Bardana' : 'ਬਾਰਦਾਨਾ (Bardana)' },
    { value: 'ADVANCE', label: isEn ? 'Advances' : 'ਪੇਸ਼ਗੀ (Advances)' },
    { value: 'LEFTING', label: isEn ? 'Lefting Dispatch' : 'ਲਿਫਟਿੰਗ (Lefting Dispatch)' },
    { value: 'PAYMENT', label: isEn ? 'Payments' : 'ਭੁਗਤਾਨ (Payments)' },
  ], [isEn]);

  // Handle Restore Item
  const handleRestore = (item: RecycleBinItem) => {
    const success = restoreRecycleBinItem(item.id);
    if (success) {
      notifySaveSuccess({
        titlePa: item.type === 'FARMER'
          ? 'ਕਿਸਾਨ ਸਫਲਤਾਪੂਰਵਕ ਮੁੜ ਬਹਾਲ ਹੋ ਗਿਆ'
          : 'ਰਿਕਾਰਡ ਸਫਲਤਾਪੂਰਵਕ ਮੁੜ ਬਹਾਲ ਹੋ ਗਿਆ',
        titleEn: item.type === 'FARMER'
          ? `Farmer Restored with ID #${item.originalId}`
          : 'Record Restored Successfully',
        messagePa: item.type === 'FARMER'
          ? `ਕਿਸਾਨ ${item.titlePa} (#${item.originalId}) ਮੁੜ ਐਕਟਿਵ ਰਜਿਸਟਰ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋ ਗਿਆ ਹੈ। ਉਸਦੀ ਪੁਰਾਣੀ ID ਬਰਕਰਾਰ ਹੈ।`
          : `${item.titlePa} ਮੁੜ ਬਹਾਲ ਹੋ ਗਿਆ ਅਤੇ ਸਟਾਕ/ਖਾਤਾ ਰਿਕਾਰਡ ਅੱਪਡੇਟ ਹੋ ਗਏ ਹਨ।`
      });
    }
  };

  // Handle Permanent Delete Item
  const handlePermanentDelete = (item: RecycleBinItem) => {
    if (item.type === 'FARMER') {
      // Require Admin/Owner authorization modal for farmers
      setFarmerToPermanentlyDelete(item);
      return;
    }

    confirmDelete({
      recordNameEn: item.titleEn,
      recordNamePa: item.titlePa,
      recordId: item.originalId,
      itemDetails: [
        { labelEn: 'Type', labelPa: 'ਕਿਸਮ', value: TYPE_CONFIG[item.type]?.labelPa || item.type },
        { labelEn: 'Details', labelPa: 'ਵੇਰਵਾ', value: item.subtitle || item.titleEn },
        { labelEn: 'Deleted At', labelPa: 'ਮਿਟਾਇਆ ਸਮਾਂ', value: item.deletedAt }
      ],
      onConfirm: () => {
        permanentlyDeleteRecycleBinItem(item.id);
        notifyDeleteSuccess({
          titlePa: 'ਰਿਕਾਰਡ ਪੱਕੇ ਤੌਰ ਤੇ ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ',
          titleEn: 'Permanently Deleted',
          messagePa: 'ਇਹ ਰਿਕਾਰਡ ਸਿਸਟਮ ਵਿੱਚੋਂ ਹਮੇਸ਼ਾ ਲਈ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।'
        });
      }
    });
  };

  const handleConfirmPermanentDeleteFarmer = async (item: RecycleBinItem, operator: string) => {
    permanentlyDeleteRecycleBinItem(item.id, operator);
    notifyDeleteSuccess({
      titlePa: 'ਕਿਸਾਨ ਰਿਕਾਰਡ ਪੱਕੇ ਤੌਰ ਤੇ ਮਿਟਾ ਦਿੱਤਾ ਗਿਆ',
      titleEn: 'Farmer Permanently Deleted',
      messagePa: `ਕਿਸਾਨ ${item.titlePa} (#${item.originalId}) ਰੀਸਾਈਕਲ ਬਿਨ ਵਿੱਚੋਂ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਇਤਿਹਾਸਕ ਰਿਕਾਰਡ ਸੁਰੱਖਿਅਤ ਹਨ।`
    });
  };

  // Handle Empty Entire Recycle Bin
  const handleEmptyBin = () => {
    confirmDelete({
      recordNameEn: `All ${recycleBinItems.length} Deleted Items`,
      recordNamePa: `ਸਾਰੇ ${recycleBinItems.length} ਮਿਟਾਏ ਗਏ ਰਿਕਾਰਡ`,
      recordId: 'ALL',
      itemDetails: [
        { labelEn: 'Total Items', labelPa: 'ਕੁੱਲ ਰਿਕਾਰਡ', value: String(recycleBinItems.length) },
        { labelEn: 'Action', labelPa: 'ਕਾਰਵਾਈ', value: 'Permanent Deletion of all items in Recycle Bin' }
      ],
      onConfirm: () => {
        emptyRecycleBin();
        notifyDeleteSuccess({
          titlePa: 'ਕੂੜਾਦਾਨ ਪੂਰੀ ਤਰ੍ਹਾਂ ਸਾਫ਼ ਕਰ ਦਿੱਤਾ ਗਿਆ',
          titleEn: 'Recycle Bin Emptied',
          messagePa: 'ਸਾਰੇ ਪੁਰਾਣੇ ਮਿਟਾਏ ਰਿਕਾਰਡ ਹਮੇਸ਼ਾ ਲਈ ਸਾਫ਼ ਕਰ ਦਿੱਤੇ ਗਏ ਹਨ।'
        });
      }
    });
  };

  // Filter items
  const filteredItems = recycleBinItems.filter((item) => {
    if (filterType !== 'ALL' && item.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const mTitle = item.titleEn.toLowerCase().includes(q) || item.titlePa.toLowerCase().includes(q);
      const mSub = item.subtitle?.toLowerCase().includes(q) || false;
      const mOrig = item.originalId.toLowerCase().includes(q);
      if (!mTitle && !mSub && !mOrig) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>ਰੀਸਾਈਕਲ ਬਿਨ / RECYCLE BIN</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              ਮਿਟਾਏ ਗਏ ਰਿਕਾਰਡ ਵੇਖੋ, ਮੁੜ ਬਹਾਲ (Restore) ਕਰੋ ਜਾਂ ਪੱਕੇ ਤੌਰ 'ਤੇ ਹਟਾਓ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAuditLogOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="View Farmer Audit Log"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>ਕਿਸਾਨ ਆਡਿਟ ਲੌਗ (Audit Log)</span>
          </button>

          {recycleBinItems.length > 0 && (
            <button
              onClick={handleEmptyBin}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>ਸਾਰਾ ਕੂੜਾਦਾਨ ਸਾਫ਼ ਕਰੋ (Empty Bin)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ਮਿਟਾਇਆ ਰਿਕਾਰਡ ਨਾਮ, ID ਜਾਂ ਵੇਰਵੇ ਨਾਲ ਖੋਜੋ..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-64">
          <SearchableSelect
            id="recycle-bin-type-filter"
            value={filterType}
            onChange={(val) => setFilterType(val)}
            options={filterTypeOptions}
            placeholder={isEn ? "Filter by type..." : "ਕਿਸਮ ਅਨੁਸਾਰ ਫਿਲਟਰ..."}
            size="xs"
          />
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">ਰੀਸਾਈਕਲ ਬਿਨ ਖਾਲੀ ਹੈ</h3>
          <p className="text-xs text-slate-400">
            ਕੋਈ ਮਿਟਾਇਆ ਹੋਇਆ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ। ਜਦੋਂ ਤੁਸੀਂ ਕੋਈ ਐਂਟਰੀ ਮਿਟਾਓਗੇ, ਉਹ ਇੱਥੇ ਦਿਖਾਈ ਦੇਵੇਗੀ।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const conf = TYPE_CONFIG[item.type] || {
              labelEn: item.type,
              labelPa: item.type,
              icon: AlertTriangle,
              color: 'bg-slate-100 text-slate-800 border-slate-200'
            };
            const Icon = conf.icon;

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${conf.color}`}>
                        {conf.labelPa} ({conf.labelEn})
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        #{item.originalId}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900">
                      {item.titlePa} / {item.titleEn}
                    </h4>

                    {item.subtitle && (
                      <p className="text-[11px] text-slate-600 font-medium">{item.subtitle}</p>
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>ਮਿਟਾਇਆ ਸਮਾਂ: {item.deletedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleRestore(item)}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    title="Restore back to database"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ਮੁੜ ਬਹਾਲ ਕਰੋ (Restore)</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(item)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    title="Permanently Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ਪੱਕਾ ਮਿਟਾਓ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Farmer Audit Log Modal */}
      <FarmerAuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />

      {/* Admin/Owner Farmer Permanent Delete Modal */}
      <FarmerPermanentDeleteModal
        isOpen={!!farmerToPermanentlyDelete}
        item={farmerToPermanentlyDelete}
        onClose={() => setFarmerToPermanentlyDelete(null)}
        onConfirmPermanentDelete={handleConfirmPermanentDeleteFarmer}
      />
    </div>
  );
};
