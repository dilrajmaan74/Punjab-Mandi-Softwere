import React from 'react';
import { useMandi } from '../../context/MandiContext';
import { NavigationSection } from '../../types/mandi';
import {
  LayoutDashboard,
  UserPlus,
  ShoppingBag,
  PackageCheck,
  Boxes,
  User,
  Truck,
  Gavel,
  FileSpreadsheet,
  Settings,
  Scale,
  CreditCard,
  Briefcase
} from 'lucide-react';

interface QuickTab {
  id: NavigationSection;
  titlePa: string;
  titleEn: string;
  shortPa: string;
  icon: React.ElementType;
  activeBg: string;
}

const PRIMARY_QUICK_TABS: QuickTab[] = [
  {
    id: 'dashboard',
    titlePa: 'ਡੈਸ਼ਬੋਰਡ',
    titleEn: 'Dashboard',
    shortPa: 'ਡੈਸ਼ਬੋਰਡ',
    icon: LayoutDashboard,
    activeBg: 'bg-emerald-600'
  },
  {
    id: 'farmer-registration',
    titlePa: 'ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ',
    titleEn: 'Farmer Register',
    shortPa: 'ਕਿਸਾਨ (Farmer)',
    icon: UserPlus,
    activeBg: 'bg-emerald-600'
  },
  {
    id: 'daily-purchase',
    titlePa: 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ',
    titleEn: 'Daily Purchase',
    shortPa: 'ਰੋਜ਼ਾਨਾ ਖਰੀਦ (Purchase)',
    icon: ShoppingBag,
    activeBg: 'bg-emerald-600'
  },
  {
    id: 'bardana',
    titlePa: 'ਬਾਰਦਾਨਾ',
    titleEn: 'Bardana',
    shortPa: 'ਬਾਰਦਾਨਾ (Bardana)',
    icon: Boxes,
    activeBg: 'bg-amber-600'
  },
  {
    id: 'boli',
    titlePa: 'ਬੋਲੀ ਰਜਿਸਟਰ',
    titleEn: 'Boli (Auction)',
    shortPa: 'ਬੋਲੀ (Boli)',
    icon: Gavel,
    activeBg: 'bg-amber-500'
  },
  {
    id: 'bags-entry',
    titlePa: 'ਤੁਲਾਈ ਐਂਟਰੀ',
    titleEn: 'Bags Entry',
    shortPa: 'ਤੁਲਾਈ (37.5Kg)',
    icon: PackageCheck,
    activeBg: 'bg-blue-600'
  },
  {
    id: 'farmer-account',
    titlePa: 'ਕਿਸਾਨ ਖਾਤਾ',
    titleEn: 'Farmer Account',
    shortPa: 'ਕਿਸਾਨ ਖਾਤਾ (Ledger)',
    icon: User,
    activeBg: 'bg-amber-500'
  },
  {
    id: 'lefting',
    titlePa: 'ਲਿਫਟਿੰਗ',
    titleEn: 'Lifting (Sheller)',
    shortPa: 'ਲਿਫਟਿੰਗ (Lifting)',
    icon: Truck,
    activeBg: 'bg-blue-600'
  },
  {
    id: 'reports',
    titlePa: 'ਰਿਪੋਰਟਾਂ',
    titleEn: 'Reports',
    shortPa: 'ਰਿਪੋਰਟਾਂ (Reports)',
    icon: FileSpreadsheet,
    activeBg: 'bg-rose-600'
  }
];

export const TopQuickNavigationBar: React.FC = () => {
  const { activeSection, setActiveSection, language, activeCrop, activeCropConfig } = useMandi();
  const isEn = language === 'en';

  const getDynamicTabTitle = (tab: QuickTab) => {
    if (tab.id === 'bags-entry') {
      const weightLabel = `${activeCropConfig.defaultBagWeightKg}Kg`;
      return {
        titlePa: `ਤੁਲਾਈ (${activeCropConfig.namePa.split(' ')[0]} ${weightLabel})`,
        titleEn: `Bags Entry (${weightLabel})`,
        shortPa: `ਤੁਲਾਈ (${activeCrop === 'PADDY' ? '37.5Kg' : activeCrop === 'WHEAT' ? '50Kg' : 'ਮੱਕੀ'})`
      };
    }
    return tab;
  };

  return (
    <div className="w-full bg-slate-950/95 border-t border-b border-slate-800/80 px-2 sm:px-4 py-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden xl:inline-block pr-1 border-r border-slate-800 mr-1 select-none">
          {isEn ? 'QUICK NAV:' : 'ਸਿੱਧਾ ਜਾਓ:'}
        </span>

        {PRIMARY_QUICK_TABS.map((tab) => {
          const dynamic = getDynamicTabTitle(tab);
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer select-none active:scale-95 ${
                isActive
                  ? `${tab.activeBg} text-white shadow-xs font-black ring-1 ring-white/30`
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
              title={`${dynamic.titlePa} (${dynamic.titleEn})`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="text-[11px] sm:text-xs">
                {isEn ? dynamic.titleEn : dynamic.shortPa}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
