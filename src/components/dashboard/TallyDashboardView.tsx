import React, { useState, useEffect, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { NavigationSection, Farmer } from '../../types/mandi';
import {
  Search,
  Command,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  CreditCard,
  Building2,
  Users,
  FileSpreadsheet,
  Boxes,
  Truck,
  Scale,
  ShoppingBag,
  Gavel,
  History,
  Maximize2
} from 'lucide-react';
import { formatCurrency, formatCurrencyINR } from '../../utils/calculations';

interface TallyDashboardViewProps {
  onExitTallyMode: () => void;
}

export const TallyDashboardView: React.FC<TallyDashboardViewProps> = ({ onExitTallyMode }) => {
  const {
    farmers,
    bagsEntries,
    leftingRecords,
    boliRecords,
    dailyPurchaseRecords,
    farmerAdvances,
    activeFirm,
    activeFiscalYear,
    setActiveSection,
    setSelectedFarmerForAccount,
    language
  } = useMandi();

  const isEn = language === 'en';

  // Alt + G Universal GoTo Search Modal
  const [isGoToOpen, setIsGoToOpen] = useState(false);
  const [goToQuery, setGoToQuery] = useState('');
  const [selectedGatewayIndex, setSelectedGatewayIndex] = useState(0);

  // Today calculations
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Total Bags, Amount, Balance
  const totalBags = useMemo(() => {
    return bagsEntries.reduce((sum, b) => sum + (Number(b.bags) || 0), 0);
  }, [bagsEntries]);

  const totalAmount = useMemo(() => {
    return bagsEntries.reduce((sum, b) => sum + (Number(b.netAmount ?? b.totalAmount) || 0), 0);
  }, [bagsEntries]);

  const totalAdvance = useMemo(() => {
    return (farmerAdvances || []).reduce((sum, a) => sum + (Number(a.amount ?? a.principal) || 0), 0);
  }, [farmerAdvances]);

  // Classic Gateway of Tally Menu Structure
  const gatewayMenu = [
    {
      group: 'MASTERS',
      groupPa: 'ਮਾਸਟਰ (ਖਾਤੇ ਤੇ ਜਾਣਕਾਰੀ)',
      items: [
        { key: 'C', label: 'Create Farmer Master', labelPa: 'ਕਿਸਾਨ ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ', shortcut: 'C', action: 'farmer-registration' as NavigationSection },
        { key: 'A', label: 'Alter / View Farmers', labelPa: 'ਕਿਸਾਨ ਲਿਸਟ ਤੇ ਸੋਧ', shortcut: 'A', action: 'farmer-registration' as NavigationSection },
        { key: 'B', label: 'Bardana Stock Ledger', labelPa: 'ਬਾਰਦਾਨਾ ਸਟਾਕ ਲੇਜਰ', shortcut: 'B', action: 'bardana' as NavigationSection }
      ]
    },
    {
      group: 'TRANSACTIONS (VOUCHERS)',
      groupPa: 'ਵਾਊਚਰ ਐਂਟਰੀ (ਲੈਣ-ਦੇਣ)',
      items: [
        { key: 'V', label: 'Vouchers (ਤੁਲਾਈ 37.5Kg Entry)', labelPa: 'ਤੁਲਾਈ ਵਾਊਚਰ ਐਂਟਰੀ (F8)', shortcut: 'V', action: 'bags-entry' as NavigationSection },
        { key: 'P', label: 'Daily Purchase (ਰੋਜ਼ਾਨਾ ਖਰੀਦ)', labelPa: 'ਰੋਜ਼ਾਨਾ ਸਰਕਾਰੀ ਖਰੀਦ (F9)', shortcut: 'P', action: 'daily-purchase' as NavigationSection },
        { key: 'L', label: 'Boli Register (ਬੋਲੀ ਨਿਲਾਮੀ)', labelPa: 'ਬੋਲੀ ਨਿਲਾਮੀ ਰਜਿਸਟਰ', shortcut: 'L', action: 'boli' as NavigationSection },
        { key: 'T', label: 'Truck Lifting / Gate Pass', labelPa: 'ਟਰੱਕ ਲਿਫਟਿੰਗ ਗੇਟ ਪਾਸ (F7)', shortcut: 'T', action: 'lefting' as NavigationSection }
      ]
    },
    {
      group: 'UTILITIES & REPORTS',
      groupPa: 'ਰਿਪੋਰਟਾਂ ਤੇ ਲੇਖਾ ਜੋਖਾ',
      items: [
        { key: 'D', label: 'Day Book (ਰੋਜ਼ਾਨਾ ਬਹੀ ਖਾਤਾ)', labelPa: 'ਡੇਅ ਬੁੱਕ / ਰੋਕੜ ਵਹੀ', shortcut: 'D', action: 'reports' as NavigationSection },
        { key: 'F', label: 'Farmer Ledger (ਕਿਸਾਨ ਖਾਤਾ)', labelPa: 'ਕਿਸਾਨ ਲੇਜਰ ਖਾਤਾ (Statement)', shortcut: 'F', action: 'farmer-account' as NavigationSection },
        { key: 'R', label: 'Financial & Season Reports', labelPa: 'ਸੀਜ਼ਨ ਕਮਿਸ਼ਨ ਤੇ ਬਹੀ ਰਿਪੋਰਟਾਂ', shortcut: 'R', action: 'reports' as NavigationSection }
      ]
    }
  ];

  // Flatten items for keyboard arrow navigation
  const flatItems = useMemo(() => {
    return gatewayMenu.flatMap(g => g.items);
  }, []);

  // Global Keyboard Shortcuts (Alt+G, Esc, hotkeys C, V, P, B, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + G for GoTo
      if ((e.altKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setIsGoToOpen(true);
        return;
      }

      // If GoTo modal is open, let it handle its own keys
      if (isGoToOpen) {
        if (e.key === 'Escape') {
          setIsGoToOpen(false);
        }
        return;
      }

      // Escape to exit Tally mode
      if (e.key === 'Escape') {
        onExitTallyMode();
        return;
      }

      // Arrow navigation inside Gateway
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedGatewayIndex(prev => (prev + 1) % flatItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedGatewayIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const activeItem = flatItems[selectedGatewayIndex];
        if (activeItem) {
          setActiveSection(activeItem.action);
        }
        return;
      }

      // Check direct hotkeys (C, V, P, B, etc.) if not typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      const pressedKey = e.key.toUpperCase();
      const matched = flatItems.find(item => item.key === pressedKey);
      if (matched) {
        e.preventDefault();
        setActiveSection(matched.action);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGoToOpen, flatItems, selectedGatewayIndex, setActiveSection, onExitTallyMode]);

  // GoTo Filtered Search List
  const filteredGoToList = useMemo(() => {
    if (!goToQuery.trim()) {
      return [
        { label: 'Farmer Ledger (ਕਿਸਾਨ ਖਾਤਾ)', section: 'farmer-account' as NavigationSection, tag: 'Report' },
        { label: 'Bags Entry / Weighment (ਤੁਲਾਈ 37.5Kg)', section: 'bags-entry' as NavigationSection, tag: 'Voucher' },
        { label: 'Daily Purchase (ਰੋਜ਼ਾਨਾ ਖਰੀਦ)', section: 'daily-purchase' as NavigationSection, tag: 'Voucher' },
        { label: 'Bardana Ledger (ਬਾਰਦਾਨਾ ਸਟਾਕ)', section: 'bardana' as NavigationSection, tag: 'Stock' },
        { label: 'Boli Auction Register (ਬੋਲੀ ਰਜਿਸਟਰ)', section: 'boli' as NavigationSection, tag: 'Register' },
        { label: 'Day Book (ਰੋਜ਼ਾਨਾ ਬਹੀ ਖਾਤਾ)', section: 'reports' as NavigationSection, tag: 'Report' }
      ];
    }
    const q = goToQuery.toLowerCase();
    const list: { label: string; section: NavigationSection; tag: string; farmer?: Farmer }[] = [];

    // Search farmers
    farmers.forEach(f => {
      const fName = f.farmerName || '';
      const fNamePa = f.farmerNamePa || '';
      const vName = f.village || '';
      const aNo = f.bankDetails?.accountNumber || f.id;
      if (fName.toLowerCase().includes(q) || fNamePa.includes(q) || aNo.includes(q) || vName.toLowerCase().includes(q)) {
        list.push({
          label: `${fName} (${vName || 'ਪਿੰਡ ਨਾਦਰੁਸਤ'}) - ${f.id}`,
          section: 'farmer-account',
          tag: 'Farmer',
          farmer: f
        });
      }
    });

    // Add sections
    flatItems.forEach(item => {
      if (item.label.toLowerCase().includes(q) || item.labelPa.includes(q)) {
        list.push({
          label: `${item.label} (${item.labelPa})`,
          section: item.action,
          tag: 'Menu'
        });
      }
    });

    return list.slice(0, 10);
  }, [goToQuery, farmers, flatItems]);

  return (
    <div className="bg-[#0f2b38] min-h-[85vh] text-slate-100 rounded-2xl shadow-2xl border-2 border-[#1c4b61] flex flex-col font-sans select-none overflow-hidden animate-fadeIn">
      
      {/* Tally Prime Top Bar (Classic Navy Blue / Mustard Gold) */}
      <div className="bg-[#0a1e28] px-4 py-2.5 border-b border-[#225770] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f59e0b] text-[#0f2b38] font-black rounded text-xs tracking-wider shadow-sm">
            <span>TALLY PRIME</span>
            <span className="text-[10px] bg-[#0f2b38] text-[#f59e0b] px-1 py-0.2 rounded font-mono">MANDI v4</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-300 font-mono text-[11px]">
            <span className="text-amber-400 font-bold">{activeFirm?.name || 'Jammu Trading Company'}</span>
            <span>|</span>
            <span>FY: {activeFiscalYear || '2024-25'}</span>
            <span>|</span>
            <span className="text-emerald-400">{todayDateStr}</span>
          </div>
        </div>

        {/* Go To & Exit Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGoToOpen(true)}
            className="px-3 py-1.5 bg-[#1b4b60] hover:bg-[#256683] text-amber-300 font-black rounded flex items-center gap-1.5 border border-[#327a9c] transition active:scale-95 cursor-pointer text-xs"
            title="Press Alt + G for Universal Search"
          >
            <Command className="w-3.5 h-3.5 text-amber-400" />
            <span>Go To</span>
            <kbd className="bg-[#0f2b38] text-amber-200 px-1 py-0.5 rounded text-[10px] font-mono border border-[#327a9c]">Alt+G</kbd>
          </button>

          <button
            onClick={onExitTallyMode}
            className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold rounded flex items-center gap-1 border border-rose-700 transition active:scale-95 cursor-pointer text-xs"
            title="Press Esc to return to modern view"
          >
            <span>Standard View</span>
            <kbd className="bg-rose-950 px-1 py-0.5 rounded text-[10px] font-mono">Esc</kbd>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Tally Screen: Left (Summary/Status), Right (Gateway of Tally) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#225770] p-3 sm:p-5 gap-4">
        
        {/* LEFT COLUMN: Current Company Status & Live Day Statistics */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          
          <div className="space-y-4">
            {/* Active Company Card */}
            <div className="bg-[#091a24] rounded-xl p-4 border border-[#1e4e64] space-y-2">
              <div className="flex items-center justify-between border-b border-[#1e4e64] pb-2 text-[11px] font-mono text-slate-400">
                <span>CURRENT PERIOD</span>
                <span>CURRENT DATE</span>
              </div>
              <div className="flex items-center justify-between font-mono font-bold text-sm text-amber-300">
                <span>01-Apr-2024 to 31-Mar-2025</span>
                <span>{todayDateStr}</span>
              </div>
              <div className="pt-2">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Name of Company / Mandi Firm</div>
                <div className="text-lg font-black text-white font-mono">{activeFirm?.name || 'Jammu Trading Company'}</div>
                <div className="text-xs text-slate-300">Market Committee: ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ</div>
              </div>
            </div>

            {/* Financial & Stock Glance (Tally Balance Ribbon) */}
            <div className="bg-[#091a24] rounded-xl p-4 border border-[#1e4e64] space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center justify-between border-b border-[#1e4e64] pb-2">
                <span>SEASON FINANCIAL POSITION</span>
                <span className="text-[10px] text-slate-400 font-mono">DR / CR TRIAL BALANCE</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 bg-[#0d222e] rounded border border-[#1e4e64]">
                  <span className="text-slate-300">ਕੁੱਲ ਤੁਲਾਈ ਹੋਈ ਫਸਲ (Crop Purchased):</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(totalAmount)} (Cr)</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-[#0d222e] rounded border border-[#1e4e64]">
                  <span className="text-slate-300">ਕੁੱਲ ਤੁਲੀਆਂ ਬੋਰੀਆਂ (Total Bags):</span>
                  <span className="font-bold text-white">{totalBags} ਬੋਰੀਆਂ</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-[#0d222e] rounded border border-[#1e4e64]">
                  <span className="text-slate-300">ਕੁੱਲ ਕਿਸਾਨ ਐਡਵਾਂਸ (Advance Given):</span>
                  <span className="font-bold text-amber-400">{formatCurrency(totalAdvance)} (Dr)</span>
                </div>

                <div className="flex items-center justify-between p-2 bg-[#0d222e] rounded border border-[#1e4e64]">
                  <span className="text-slate-300">ਕੁੱਲ ਕਿਸਾਨ ਰਜਿਸਟਰਡ (Ledger Masters):</span>
                  <span className="font-bold text-cyan-300">{farmers.length} ਖਾਤੇ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Keyboard Hint Bar */}
          <div className="bg-[#091a24] p-3 rounded-xl border border-[#1e4e64] text-[11px] text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Keyboard Mode Active: <strong>Up/Down</strong> ਕੁੰਜੀਆਂ ਜਾਂ <strong>ਪੀਲੇ ਅੱਖਰ (Hotkeys)</strong> ਦਬਾਓ</span>
            </div>
            <kbd className="px-2 py-0.5 bg-[#173e50] text-amber-300 rounded font-mono font-bold">Enter = Open</kbd>
          </div>

        </div>

        {/* RIGHT COLUMN: The Classic "Gateway of Tally" Centerpiece */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-2 sm:p-4">
          
          <div className="w-full max-w-md bg-[#091a24] rounded-2xl border-2 border-[#f59e0b]/70 shadow-2xl overflow-hidden">
            
            {/* Gateway Header */}
            <div className="bg-[#f59e0b] text-[#0a1e28] px-4 py-2 text-center font-black tracking-wider text-sm shadow-md flex items-center justify-between">
              <span className="text-[11px] opacity-75 font-mono">TALLY GATEWAY</span>
              <span className="uppercase">Gateway of Mandi</span>
              <span className="text-[11px] opacity-75 font-mono">MAIN MENU</span>
            </div>

            {/* Menu Groups */}
            <div className="p-3 sm:p-4 space-y-4 text-xs font-mono">
              {gatewayMenu.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider px-2 py-0.5 border-b border-[#1c4b61]">
                    {group.group}
                  </div>

                  <div className="space-y-0.5 pt-1">
                    {group.items.map((item) => {
                      const itemFlatIndex = flatItems.findIndex(fi => fi.key === item.key);
                      const isSelected = selectedGatewayIndex === itemFlatIndex;

                      return (
                        <button
                          key={item.key}
                          onClick={() => setActiveSection(item.action)}
                          onMouseEnter={() => setSelectedGatewayIndex(itemFlatIndex)}
                          className={`w-full text-left px-3 py-1.5 rounded flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#1b4b60] text-white shadow-inner font-bold border-l-4 border-amber-400 pl-2.5'
                              : 'text-slate-300 hover:bg-[#0d222e] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Hotkey Letter Highlight (Classic Tally Yellow Underline) */}
                            <span className="w-5 text-center font-black text-amber-400 bg-[#0f2b38] px-1 py-0.2 rounded border border-[#235870]">
                              {item.key}
                            </span>
                            <span>{item.label}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="hidden sm:inline text-slate-400 font-sans">{item.labelPa}</span>
                            {isSelected && <ArrowRight className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quit Option */}
              <div className="pt-2 border-t border-[#1c4b61]">
                <button
                  onClick={onExitTallyMode}
                  className="w-full text-left px-3 py-1.5 rounded flex items-center justify-between text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center font-black text-rose-400 bg-rose-950/60 px-1 py-0.2 rounded border border-rose-800">
                      Q
                    </span>
                    <span>Quit Tally View</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Esc</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Tally Prime Bottom Function Key Ribbon (F1 to F12) */}
      <div className="bg-[#07151c] px-3 py-2 border-t border-[#1c4b61] overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max text-[11px] font-mono">
          <button onClick={() => setActiveSection('farmer-registration')} className="px-2 py-1 bg-[#102d3c] hover:bg-[#184257] rounded border border-[#225770] flex items-center gap-1 text-slate-200">
            <span className="text-amber-400 font-bold">F2:</span> <span>Date</span>
          </button>
          <button onClick={() => setActiveSection('farmer-registration')} className="px-2 py-1 bg-[#102d3c] hover:bg-[#184257] rounded border border-[#225770] flex items-center gap-1 text-slate-200">
            <span className="text-amber-400 font-bold">F3:</span> <span>Company</span>
          </button>
          <button onClick={() => setActiveSection('farmer-account')} className="px-2 py-1 bg-[#102d3c] hover:bg-[#184257] rounded border border-[#225770] flex items-center gap-1 text-slate-200">
            <span className="text-amber-400 font-bold">F4:</span> <span>Ledger</span>
          </button>
          <button onClick={() => setActiveSection('bags-entry')} className="px-2 py-1 bg-[#102d3c] hover:bg-[#184257] rounded border border-[#225770] flex items-center gap-1 text-slate-200">
            <span className="text-amber-400 font-bold">F8:</span> <span>Weighment (ਤੁਲਾਈ)</span>
          </button>
          <button onClick={() => setActiveSection('daily-purchase')} className="px-2 py-1 bg-[#102d3c] hover:bg-[#184257] rounded border border-[#225770] flex items-center gap-1 text-slate-200">
            <span className="text-amber-400 font-bold">F9:</span> <span>Purchase (ਖਰੀਦ)</span>
          </button>
          <button onClick={() => setActiveSection('reports')} className="px-2 py-1 bg-[#102d3c] hover:bg-[#184257] rounded border border-[#225770] flex items-center gap-1 text-slate-200">
            <span className="text-amber-400 font-bold">F10:</span> <span>Day Book</span>
          </button>
          <button onClick={() => setActiveSection('settings')} className="px-2 py-1 bg-[#102d3c] hover:bg-[#184257] rounded border border-[#225770] flex items-center gap-1 text-slate-200">
            <span className="text-amber-400 font-bold">F12:</span> <span>Configure</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ALT + G "GO TO" MODAL (Classic Tally Prime Universal Search) */}
      {/* ============================================================== */}
      {isGoToOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-16 p-4">
          <div className="bg-[#091a24] text-white w-full max-w-xl rounded-2xl shadow-2xl border-2 border-amber-400 overflow-hidden animate-fadeIn">
            
            {/* GoTo Header */}
            <div className="bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center justify-between font-black text-sm">
              <div className="flex items-center gap-2">
                <Command className="w-4 h-4" />
                <span>GO TO (Alt + G Universal Mandi Search)</span>
              </div>
              <button
                onClick={() => setIsGoToOpen(false)}
                className="p-1 hover:bg-amber-600 rounded text-slate-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-[#1c4b61] bg-[#0c2230]">
              <div className="relative">
                <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={goToQuery}
                  onChange={(e) => setGoToQuery(e.target.value)}
                  placeholder="ਕਿਸਾਨ ਦਾ ਨਾਮ, ਖਾਤਾ ਨੰਬਰ, ਪਿੰਡ ਜਾਂ ਰਿਪੋਰਟ ਲਿਖੋ (Type to search)..."
                  className="w-full bg-[#081720] border border-[#225770] text-amber-300 font-mono text-sm pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-amber-400"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 font-mono">
                ਸਿੱਧਾ ਕਿਸੇ ਵੀ ਕਿਸਾਨ ਦੇ ਖਾਤੇ ਜਾਂ ਵਾਊਚਰ 'ਤੇ ਜਾਣ ਲਈ ਨਾਮ ਟਾਈਪ ਕਰੋ
              </p>
            </div>

            {/* Search Results List */}
            <div className="p-2 max-h-72 overflow-y-auto divide-y divide-[#183d50] text-xs font-mono">
              {filteredGoToList.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic">
                  ਕੋਈ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ (No results found)
                </div>
              ) : (
                filteredGoToList.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsGoToOpen(false);
                      if (res.farmer) {
                        setSelectedFarmerForAccount(res.farmer);
                      }
                      setActiveSection(res.section);
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-[#1b4b60] rounded flex items-center justify-between group transition cursor-pointer"
                  >
                    <span className="text-slate-200 group-hover:text-amber-300 font-medium">
                      {res.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-[#0f2b38] text-amber-400 rounded text-[10px] border border-[#225770]">
                        {res.tag}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Bottom Modal Hint */}
            <div className="p-2.5 bg-[#07151c] border-t border-[#1c4b61] text-[10px] text-slate-400 text-center">
              Press <strong>Esc</strong> to close | Press <strong>Enter</strong> to jump
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
