import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { NavigationSection } from '../../types/mandi';
import {
  LayoutDashboard,
  User,
  ShoppingBag,
  Truck,
  BarChart3,
  Trash2,
  UserPlus,
  Users,
  CreditCard,
  Boxes,
  PackageCheck,
  CalendarCheck2,
  Search,
  FileSpreadsheet,
  Settings,
  Scale,
  Gavel,
  Briefcase
} from 'lucide-react';
import { GoogleSheetsSyncModal } from '../farmer/GoogleSheetsSyncModal';
import { useGoogleSheetsSync } from '../../context/GoogleSheetsSyncContext';

interface NavItem {
  id: NavigationSection;
  titleEn: string;
  titlePa: string;
  icon: React.ElementType;
  badgeColor?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    titleEn: 'Dashboard',
    titlePa: 'ਡੈਸ਼ਬੋਰਡ',
    icon: LayoutDashboard
  },
  {
    id: 'farmer-registration',
    titleEn: 'Farmer Register',
    titlePa: 'ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ',
    icon: UserPlus,
    badgeColor: 'bg-emerald-600'
  },
  {
    id: 'multi-farmer-add',
    titleEn: 'Multi Farmer Register',
    titlePa: 'ਮਲਟੀ ਕਿਸਾਨ ਰਜਿਸਟਰ',
    icon: Users,
    badgeColor: 'bg-teal-600'
  },
  {
    id: 'bardana',
    titleEn: 'Bardana Received',
    titlePa: 'ਬਾਰਦਾਨਾ ਪ੍ਰਾਪਤ',
    icon: Boxes,
    badgeColor: 'bg-amber-600'
  },
  {
    id: 'boli',
    titleEn: 'Boli (Auction) Register',
    titlePa: 'ਬੋਲੀ (Auction) ਰਜਿਸਟਰ',
    icon: Gavel,
    badgeColor: 'bg-amber-500'
  },
  {
    id: 'bags-entry',
    titleEn: 'Bag (37.50 KG)',
    titlePa: 'ਬੋਰੀਆਂ ਤੁਲਾਈ ਐਂਟਰੀ',
    icon: PackageCheck,
    badgeColor: 'bg-blue-600'
  },
  {
    id: 'same-date-multi-entry',
    titleEn: 'Multi Bag',
    titlePa: 'ਇੱਕੋ ਮਿਤੀ ਮਲਟੀ ਬੋਰੀਆਂ',
    icon: CalendarCheck2,
    badgeColor: 'bg-indigo-600'
  },
  {
    id: 'daily-purchase',
    titleEn: 'Daily Purchase (ਖਰੀਦ)',
    titlePa: 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ',
    icon: ShoppingBag,
    badgeColor: 'bg-emerald-800'
  },
  {
    id: 'farmer-account',
    titleEn: 'Farmer Account (ਖਾਤਾ)',
    titlePa: 'ਕਿਸਾਨ ਖਾਤਾ',
    icon: User,
    badgeColor: 'bg-amber-500'
  },
  {
    id: 'farmer-bag-balance-labour',
    titleEn: 'Bag Balance & Labour',
    titlePa: 'ਬੋਰੀ ਬੈਲੇਂਸ ਅਤੇ ਲੇਬਰ',
    icon: Scale,
    badgeColor: 'bg-emerald-700'
  },
  {
    id: 'labour-ledger',
    titleEn: 'Labour Gang Ledger',
    titlePa: 'ਲੇਬਰ ਗੈਂਗ / ਪੱਲੇਦਾਰ ਖਾਤਾ',
    icon: Briefcase,
    badgeColor: 'bg-indigo-600'
  },
  {
    id: 'lefting',
    titleEn: 'Lefting to Sheller (ਰਵਾਨਗੀ)',
    titlePa: 'ਲਿਫਟਿੰਗ ਪ੍ਰਬੰਧਨ',
    icon: Truck,
    badgeColor: 'bg-blue-600'
  },
  {
    id: 'balance-chart',
    titleEn: 'Stock Balance Chart',
    titlePa: 'ਸਟਾਕ ਬੈਲੇਂਸ ਚਾਰਟ',
    icon: BarChart3
  },
  {
    id: 'bank-details',
    titleEn: 'Bank Details',
    titlePa: 'ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ',
    icon: CreditCard
  },
  {
    id: 'search-farmer',
    titleEn: 'Search Farmer',
    titlePa: 'ਕਿਸਾਨ ਖੋਜ',
    icon: Search
  },
  {
    id: 'reports',
    titleEn: 'Reports & Register',
    titlePa: 'ਰਿਪੋਰਟਾਂ ਤੇ ਰਜਿਸਟਰ',
    icon: FileSpreadsheet
  },
  {
    id: 'recycle-bin',
    titleEn: 'Recycle Bin',
    titlePa: 'ਰੀਸਾਈਕਲ ਬਿਨ',
    icon: Trash2
  },
  {
    id: 'settings',
    titleEn: 'PIN & Settings',
    titlePa: 'ਸੈਟਿੰਗਜ਼ ਤੇ ਏਜੰਸੀਆਂ',
    icon: Settings
  }
];

export const Sidebar: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    farmers,
    bagsEntries,
    bardanaRecords,
    dailyPurchaseRecords,
    leftingRecords,
    recycleBinItems,
    language
  } = useMandi();
  const { syncStatus, autoSyncEnabled, conflicts } = useGoogleSheetsSync();

  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  const isEn = language === 'en';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col justify-between shrink-0 shadow-2xs print:hidden">
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          {isEn ? 'MANDI MODULES' : 'ਮੰਡੀ ਮੌਡਿਊਲ (Mandi Modules)'}
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition font-semibold ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <div className="flex-1 truncate">
                {isEn ? (
                  <div className="truncate text-xs font-bold leading-tight">{item.titleEn}</div>
                ) : (
                  <>
                    <div className="truncate text-xs font-bold leading-tight">{item.titlePa}</div>
                    <div className={`text-[10px] truncate leading-tight ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {item.titleEn}
                    </div>
                  </>
                )}
              </div>

              {item.id === 'daily-purchase' && dailyPurchaseRecords.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 font-bold'
                  }`}
                >
                  {dailyPurchaseRecords.length}
                </span>
              )}

              {item.id === 'farmer-registration' && farmers.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {farmers.length}
                </span>
              )}
              {item.id === 'bardana' && bardanaRecords.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {bardanaRecords.length}
                </span>
              )}
              {item.id === 'bags-entry' && bagsEntries.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {bagsEntries.length}
                </span>
              )}

              {item.id === 'lefting' && leftingRecords.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-blue-800 text-white' : 'bg-blue-100 text-blue-800 font-bold'
                  }`}
                >
                  {leftingRecords.length}
                </span>
              )}

              {item.id === 'recycle-bin' && recycleBinItems.length > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800 font-bold'
                  }`}
                >
                  {recycleBinItems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Google Sheets Quick Access */}
      <div className="p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setIsGoogleSheetsModalOpen(true)}
          className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer group ${
            conflicts.length > 0
              ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
              : syncStatus === 'connected'
              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className={`w-4 h-4 transition-transform group-hover:scale-110 ${
              conflicts.length > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`} />
            <span>{isEn ? 'Google Sheets Sync' : 'ਗੂਗਲ ਸ਼ੀਟਸ ਸਿੰਕ'}</span>
          </div>
          {conflicts.length > 0 ? (
            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
              {conflicts.length} {isEn ? 'Conflict' : 'ਵਿਰੋਧ'}
            </span>
          ) : syncStatus === 'connected' ? (
            <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              {autoSyncEnabled ? 'Auto' : 'Live'}
            </span>
          ) : (
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">Sync</span>
          )}
        </button>
      </div>

      {/* Bottom Status Info */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-1">
        <div className="flex justify-between items-center">
          <span className="font-semibold">{isEn ? 'Fixed Bag Weight:' : 'ਨਿਰਧਾਰਿਤ ਬੋਰੀ ਵਜ਼ਨ:'}</span>
          <strong className="text-slate-900 font-mono font-bold">37.50 KG</strong>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold">{isEn ? 'Govt MSP Rate:' : 'ਸਰਕਾਰੀ ਭਾਅ:'}</span>
          <strong className="text-emerald-700 font-mono font-bold">₹2,461 / Qul</strong>
        </div>
      </div>

      {/* Google Sheets Modal */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />
    </aside>
  );
};
