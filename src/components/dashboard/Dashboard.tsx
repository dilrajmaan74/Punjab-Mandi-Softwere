import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { TodayGlanceBanner } from './TodayGlanceBanner';
import { TallyDashboardView } from './TallyDashboardView';
import {
  User,
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
  DollarSign,
  Package,
  Printer,
  Edit,
  ChevronRight,
  Sparkles,
  Wheat,
  ShoppingBag,
  Truck,
  BarChart3,
  Trash2
} from 'lucide-react';
import {
  formatKgToQulKg,
  formatCurrency,
  FIXED_BAG_WEIGHT_KG,
  FIXED_RATE_PER_QTL
} from '../../utils/calculations';

export const Dashboard: React.FC = () => {
  const {
    farmers,
    bagsEntries,
    dailyPurchaseRecords,
    leftingRecords,
    recycleBinItems,
    setActiveSection,
    setActiveReceipt,
    setActiveBagsEntryToEdit,
    setSelectedFarmerForBags
  } = useMandi();

  const [isTallyMode, setIsTallyMode] = useState(false);

  // Calculate actual aggregates from real entered records (starts empty if no records)
  const totalBagsCount = bagsEntries.reduce((sum, b) => sum + (b.bags || 0), 0);
  const totalBagsWeightKg = bagsEntries.reduce((sum, b) => sum + (b.totalBagsWeightKg || 0), 0);
  const totalTotaKg = bagsEntries.reduce((sum, b) => sum + (b.totaKg || 0), 0);
  const combinedGrandTotalKg = totalBagsWeightKg + totalTotaKg;
  const totalAmountPayable = bagsEntries.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const bagsWeightBreakdown = formatKgToQulKg(totalBagsWeightKg);
  const grandTotalBreakdown = formatKgToQulKg(combinedGrandTotalKg);

  if (isTallyMode) {
    return <TallyDashboardView onExitTallyMode={() => setIsTallyMode(false)} />;
  }

  return (
    <div className="space-y-4">
      {/* 1-Second Live Mandi Pulse & Today's Activity Banner */}
      <TodayGlanceBanner
        onOpenBoli={() => setActiveSection('boli')}
        onOpenBags={() => setActiveSection('bags-entry')}
        onOpenLifting={() => setActiveSection('lefting')}
      />

      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-2xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Punjab Mandi Software • ਪੰਜਾਬ ਮੰਡੀ ਸਾਫਟਵੇਅਰ
              </h2>
              <p className="text-xs text-slate-300">
                ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ, ਆਧਾਰ ਪੜਤਾਲ, ਬੈਂਕ ਵੇਰਵੇ, 37.50 KG ਬੋਰੀ ਵਜ਼ਨ ਤੇ ₹2,461/ਕੁਇੰਟਲ ਭਾਅ ਪ੍ਰਬੰਧਨ
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons with Tally Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsTallyMode(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs transition shadow-2xs active:scale-95 border border-amber-300"
            title="Switch to Tally Prime Keyboard Style View (ਟੈਲੀ ਮੋਡ)"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>ਟੈਲੀ ਮੋਡ (Tally Prime View)</span>
          </button>
          <button
            onClick={() => setActiveSection('farmer-registration')}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs transition shadow-2xs active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ (Register Farmer)</span>
          </button>
          <button
            onClick={() => setActiveSection('bags-entry')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-2xs active:scale-95"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>+ ਬੋਰੀਆਂ ਐਂਟਰੀ (Bags Entry)</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip (Calculated purely from actual entered data) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Farmers */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>ਕੁੱਲ ਕਿਸਾਨ</span>
            <Users className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono">{farmers.length}</div>
          <div className="text-[10px] text-slate-400">Total Registered</div>
        </div>

        {/* Total Bags */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>ਕੁੱਲ ਬੋਰੀਆਂ</span>
            <Package className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono">{totalBagsCount}</div>
          <div className="text-[10px] text-slate-400">@ 37.50 KG / Bag</div>
        </div>

        {/* Total Bags Weight (Qul + Kg) */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>ਬੋਰੀਆਂ ਦਾ ਵਜ਼ਨ</span>
            <Scale className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-1 font-mono truncate">
            {bagsWeightBreakdown.displayEn}
          </div>
          <div className="text-[10px] text-slate-400 truncate">{bagsWeightBreakdown.displayPa}</div>
        </div>

        {/* Separate Tota in Kg */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>ਵੱਖਰਾ ਟੋਟਾ</span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1 rounded">Tota</span>
          </div>
          <div className="text-lg font-black text-amber-800 mt-1 font-mono">{totalTotaKg} Kg</div>
          <div className="text-[10px] text-slate-400">Separate Tota (Kg)</div>
        </div>

        {/* Grand Total Weight (Qul + Kg) */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>ਗ੍ਰੈਂਡ ਟੋਟਲ ਵਜ਼ਨ</span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-1 rounded">Grand</span>
          </div>
          <div className="text-sm sm:text-base font-black text-emerald-900 mt-1 font-mono truncate">
            {grandTotalBreakdown.displayEn}
          </div>
          <div className="text-[10px] text-slate-400 truncate">Bags + Tota</div>
        </div>

        {/* Total Value at ₹2,461 / Qul */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
            <span>ਕੁੱਲ ਰਕਮ (Value)</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-1 font-mono truncate">
            {formatCurrency(totalAmountPayable)}
          </div>
          <div className="text-[10px] text-slate-400">@ ₹2,461 / Qul</div>
        </div>
      </div>

      {/* Quick Access Modules Navigation Cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>ਮੁੱਖ ਕਾਰਜ ਤੇ ਮੌਡਿਊਲ (Quick Access Modules)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Card 0: Farmer Account */}
          <button
            onClick={() => setActiveSection('farmer-account')}
            className="p-3 bg-amber-50/50 rounded-xl border border-amber-300 hover:border-amber-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                <User className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 group-hover:text-amber-800 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਕਿਸਾਨ ਖਾਤਾ (Farmer Account)</div>
              <div className="text-[11px] text-amber-900 font-medium">ਆਮਦ, ਖਰੀਦ, ਬੋਲੀ, ਬਾਰਦਾਨਾ ਤੇ ਲੈਣ-ਦੇਣ</div>
            </div>
          </button>

          {/* Card 1: Farmer Registration */}
          <button
            onClick={() => setActiveSection('farmer-registration')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
                <UserPlus className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ</div>
              <div className="text-[11px] text-slate-500">Farmer Registration (Aadhaar/OCR)</div>
            </div>
          </button>

          {/* Card 2: Multi Farmer Add */}
          <button
            onClick={() => setActiveSection('multi-farmer-add')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                <Users className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਮਲਟੀ ਕਿਸਾਨ ਐਂਟਰੀ</div>
              <div className="text-[11px] text-slate-500">Multi Farmer Add & Fast Batch</div>
            </div>
          </button>

          {/* Card 3: Bank Details */}
          <button
            onClick={() => setActiveSection('bank-details')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-50 text-purple-700 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition">
                <CreditCard className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ</div>
              <div className="text-[11px] text-slate-500">Bank Details & IFSC Auto Lookup</div>
            </div>
          </button>

          {/* Card 4: Daily Purchase */}
          <button
            onClick={() => setActiveSection('daily-purchase')}
            className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-300 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-700 text-white rounded-lg group-hover:bg-emerald-800 transition">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:text-emerald-800 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਰੋਜ਼ਾਨਾ ਖਰੀਦ (Daily Purchase)</div>
              <div className="text-[11px] text-emerald-900 font-medium">ਏਜੰਸੀ ਖਰੀਦ, ਬੋਲੀ & ਸਟਾਕ ਕਟੌਤੀ</div>
            </div>
          </button>

          {/* Card 5: Lefting to Sheller */}
          <button
            onClick={() => setActiveSection('lefting')}
            className="p-3 bg-blue-50/50 rounded-xl border border-blue-300 hover:border-blue-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-600 text-white rounded-lg group-hover:bg-blue-700 transition">
                <Truck className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600 group-hover:text-blue-800 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਲਿਫਟਿੰਗ ਰਵਾਨਗੀ (Lefting)</div>
              <div className="text-[11px] text-blue-900 font-medium">ਟਰੱਕ, ਗੇਟ ਪਾਸ ਤੇ ਸ਼ੈਲਰ ਰਵਾਨਗੀ</div>
            </div>
          </button>

          {/* Card 6: Balance Chart */}
          <button
            onClick={() => setActiveSection('balance-chart')}
            className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-300 hover:border-indigo-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-600 text-white rounded-lg group-hover:bg-indigo-700 transition">
                <BarChart3 className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:text-indigo-800 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਸਟਾਕ ਬੈਲੇਂਸ ਚਾਰਟ (Balance)</div>
              <div className="text-[11px] text-indigo-900 font-medium">ਆਮਦ, ਖਰੀਦ, ਲਿਫਟਿੰਗ ਤੇ ਬਾਕੀ ਸਟਾਕ</div>
            </div>
          </button>

          {/* Card 7: Bardana Management */}
          <button
            onClick={() => setActiveSection('bardana')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
                <Boxes className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਬਾਰਦਾਨਾ ਪ੍ਰਬੰਧਨ</div>
              <div className="text-[11px] text-slate-500">Bardana (Agency & Seller Stock)</div>
            </div>
          </button>

          {/* Card 5: Bags Entry */}
          <button
            onClick={() => setActiveSection('bags-entry')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                <PackageCheck className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਬੋਰੀਆਂ ਐਂਟਰੀ (37.50 KG)</div>
              <div className="text-[11px] text-slate-500">Bags Entry (Qul+Kg, Tota, ₹2461)</div>
            </div>
          </button>

          {/* Card 5: Same Date Multi Farmer */}
          <button
            onClick={() => setActiveSection('same-date-multi-entry')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਇੱਕੋ ਮਿਤੀ ਮਲਟੀ ਕਿਸਾਨ</div>
              <div className="text-[11px] text-slate-500">Same Date Multi Farmer Batch</div>
            </div>
          </button>

          {/* Card 6: Search Farmer */}
          <button
            onClick={() => setActiveSection('search-farmer')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition">
                <Search className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਕਿਸਾਨ ਖੋਜ (Search)</div>
              <div className="text-[11px] text-slate-500">Search by Name, ID, Aadhaar, Village</div>
            </div>
          </button>

          {/* Card 7: Reports */}
          <button
            onClick={() => setActiveSection('reports')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਰਿਪੋਰਟਾਂ ਤੇ ਰਜਿਸਟਰ</div>
              <div className="text-[11px] text-slate-500">Reports, Registers & CSV Export</div>
            </div>
          </button>

          {/* Card 8: Settings & PIN Codes */}
          <button
            onClick={() => setActiveSection('settings')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition">
                <Settings className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਸੈਟਿੰਗਜ਼ ਤੇ ਪਿੰਨ ਕੋਡ</div>
              <div className="text-[11px] text-slate-500">PIN to Village DB & Preferences</div>
            </div>
          </button>

          {/* Card 9: Recycle Bin */}
          <button
            onClick={() => setActiveSection('recycle-bin')}
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-rose-500 hover:shadow-xs transition text-left group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-lg group-hover:bg-rose-700 group-hover:text-white transition">
                <Trash2 className="w-4 h-4" />
              </div>
              {recycleBinItems.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full font-mono">
                  {recycleBinItems.length}
                </span>
              )}
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">ਰੀਸਾਈਕਲ ਬਿਨ (Recycle Bin)</div>
              <div className="text-[11px] text-slate-500">ਡਿਲੀਟ ਕੀਤੇ ਰਿਕਾਰਡ ਰੀਸਟੋਰ ਕਰੋ</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Bags Entries / Empty State */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              ਤਾਜ਼ਾ ਬੋਰੀਆਂ ਐਂਟਰੀਆਂ (Recent Bags Entries)
            </h3>
            <p className="text-[11px] text-slate-500">
              37.50 KG ਫਿਕਸਡ ਵਜ਼ਨ, ਵੱਖਰਾ ਟੋਟਾ ਤੇ ₹2,461/ਕੁਇੰਟਲ ਹਿਸਾਬ
            </p>
          </div>
          {bagsEntries.length > 0 && (
            <button
              onClick={() => setActiveSection('reports')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              ਸਾਰੀਆਂ ਦੇਖੋ (View All) →
            </button>
          )}
        </div>

        {bagsEntries.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700">ਕੋਈ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੈ (No Entries Yet)</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                ਪਹਿਲਾਂ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ ਅਤੇ ਫਿਰ ਉਸਦੀਆਂ ਬੋਰੀਆਂ ਦੀ ਐਂਟਰੀ ਦਰਜ ਕਰੋ।
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => setActiveSection('farmer-registration')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-2xs"
              >
                + ਪਹਿਲਾ ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">ਰਸੀਦ / ਮਿਤੀ</th>
                  <th className="py-2 px-3">ਕਿਸਾਨ ਦਾ ਵੇਰਵਾ (Farmer Details)</th>
                  <th className="py-2 px-3 text-center">ਬੋਰੀਆਂ</th>
                  <th className="py-2 px-3 text-right">ਬੋਰੀ ਵਜ਼ਨ (Qul+Kg)</th>
                  <th className="py-2 px-3 text-right">ਟੋਟਾ</th>
                  <th className="py-2 px-3 text-right font-black">ਕੁੱਲ ਵਜ਼ਨ (Grand)</th>
                  <th className="py-2 px-3 text-center">ਬਾਰਦਾਨਾ</th>
                  <th className="py-2 px-3 text-right">ਕੁੱਲ ਰਕਮ (₹)</th>
                  <th className="py-2 px-3 text-right">ਰਸੀਦ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {bagsEntries.slice(0, 5).map((entry) => {
                  const matchedFarmer = farmers.find((f) => f.id === entry.farmerId);
                  const farmerNameEn = entry.farmerName || matchedFarmer?.farmerName || '';
                  const farmerId = entry.farmerId || matchedFarmer?.id || '';
                  const fatherNameEn = entry.farmerFatherName || matchedFarmer?.fatherName || '';
                  const villageEn = entry.farmerVillage || matchedFarmer?.village || '';

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                        {entry.entryNumber}
                        <span className="block text-[10px] text-slate-400 font-normal">{entry.date}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="space-y-0.5 min-w-[160px]">
                          {/* 1. Farmer Name: English Farmer Name FIRST and prominently */}
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
                            {farmerNameEn}
                          </div>

                          {/* 2. Father Name: English Father Name */}
                          <div className="text-[11px] text-slate-600">
                            Father: <span className="font-medium text-slate-800">{fatherNameEn || '—'}</span>
                          </div>

                          {/* 3. Village: English Village */}
                          <div className="text-[11px] text-slate-600">
                            Village: <span className="font-medium text-slate-800">{villageEn || '—'}</span>
                          </div>

                          {/* 4. Farmer ID: Show Farmer ID clearly */}
                          <div className="text-[11px] text-slate-600 font-mono">
                            Farmer ID: <span className="font-semibold text-slate-800">{farmerId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-xs">{entry.bags}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-slate-900">
                      {entry.totalBagsWeightDisplay}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-amber-800 font-bold">
                      {entry.totaKg} Kg
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-xs text-emerald-950">
                      {entry.grandTotalDisplay}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          entry.bardana === 'OLD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {entry.bardana === 'OLD' ? 'ਪੁਰਾਣਾ (Old)' : 'ਨਵਾਂ (New)'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-xs text-slate-950">
                      {formatCurrency(entry.totalAmount)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setActiveBagsEntryToEdit(entry)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-1 rounded-md transition shadow-2xs cursor-pointer"
                          title="ਸੋਧੋ (Edit Entry)"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveReceipt(entry)}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-1 rounded-md transition shadow-2xs cursor-pointer"
                          title="ਪ੍ਰਿੰਟ ਰਸੀਦ (Print Slip)"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
