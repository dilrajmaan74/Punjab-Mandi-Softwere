import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Users,
  Search,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Building,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { calculateLedgerBalance } from '../../utils/pakkaCalculations';

export const DebtorsCreditorsView: React.FC = () => {
  const {
    pakkaLedgers,
    pakkaVouchers,
    activeFiscalYear,
    setActiveSection
  } = useMandi();

  const [activeTab, setActiveTab] = useState<'DEBTORS' | 'CREDITORS'>('DEBTORS');
  const [searchQuery, setSearchQuery] = useState('');

  const targetGroup = activeTab === 'DEBTORS' ? 'SUNDRY_DEBTORS' : 'SUNDRY_CREDITORS';
  const partyLedgers = pakkaLedgers.filter((l) => l.group === targetGroup);

  const partyList = partyLedgers.map((p) => {
    const bal = calculateLedgerBalance(p, pakkaVouchers, activeFiscalYear);
    return {
      ledger: p,
      opening: p.openingBalance,
      totalDebit: bal.totalDebit,
      totalCredit: bal.totalCredit,
      balance: bal.closingBalance,
      balanceType: bal.closingBalanceType
    };
  });

  const filteredParties = partyList.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.ledger.name.toLowerCase().includes(q);
      const matchNamePa = p.ledger.namePa && p.ledger.namePa.includes(q);
      const matchMobile = p.ledger.mobile && p.ledger.mobile.includes(q);
      if (!matchName && !matchNamePa && !matchMobile) return false;
    }
    return true;
  });

  const totalOutstanding = filteredParties.reduce((sum, p) => sum + p.balance, 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-700/80 text-indigo-200 text-xs font-bold rounded-full border border-indigo-500/40">
              ਲੈਣਦਾਰੀਆਂ ਤੇ ਦੇਣਦਾਰੀਆਂ • Debtors & Creditors
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            ਸੰਡਰੀ ਡੈਬਟਰਜ਼ ਤੇ ਕ੍ਰੈਡਿਟਰਜ਼ ਰਿਪੋਰਟ (Outstanding Balances)
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1">
            ਖਰੀਦਦਾਰ ਏਜੰਸੀਆਂ ਤੋਂ ਲੈਣਯੋਗ ਰਕਮ (Debtors) ਅਤੇ ਕਿਸਾਨਾਂ/ਸਪਲਾਇਰਾਂ ਨੂੰ ਦੇਣਯੋਗ ਰਕਮ (Creditors)
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>ਲਿਸਟ ਪ੍ਰਿੰਟ ਕਰੋ</span>
        </button>
      </div>

      {/* Tabs Switcher: Debtors vs Creditors */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('DEBTORS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'DEBTORS'
              ? 'bg-blue-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>ਸੰਡਰੀ ਡੈਬਟਰਜ਼ (Sundry Debtors - ਲੈਣਦਾਰੀਆਂ / ਏਜੰਸੀਆਂ)</span>
          <span className="px-1.5 py-0.2 bg-blue-700 text-white rounded-full text-[10px] font-mono">
            {pakkaLedgers.filter((l) => l.group === 'SUNDRY_DEBTORS').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CREDITORS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'CREDITORS'
              ? 'bg-purple-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>ਸੰਡਰੀ ਕ੍ਰੈਡਿਟਰਜ਼ (Sundry Creditors - ਦੇਣਦਾਰੀਆਂ / ਕਿਸਾਨ)</span>
          <span className="px-1.5 py-0.2 bg-purple-700 text-white rounded-full text-[10px] font-mono">
            {pakkaLedgers.filter((l) => l.group === 'SUNDRY_CREDITORS').length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'DEBTORS'
                ? 'ਏਜੰਸੀ ਜਾਂ ਖਰੀਦਦਾਰ ਦਾ ਨਾਮ ਲੱਭੋ...'
                : 'ਕਿਸਾਨ ਜਾਂ ਸਪਲਾਇਰ ਦਾ ਨਾਮ ਲੱਭੋ...'
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-600">
          ਕੁੱਲ ਬਕਾਇਆ ({activeTab === 'DEBTORS' ? 'ਲੈਣਯੋਗ' : 'ਦੇਣਯੋਗ'}):{' '}
          <strong className="text-base font-black font-mono text-slate-900">
            ₹{Math.round(totalOutstanding).toLocaleString()}
          </strong>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">ਪਾਰਟੀ ਦਾ ਨਾਮ (Party Name)</th>
                <th className="p-3">ਸੰਪਰਕ / ਸ਼ਹਿਰ</th>
                <th className="p-3 text-right">ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ (Opening ₹)</th>
                <th className="p-3 text-right text-blue-300">ਕੁੱਲ ਡੈਬਿਟ (Debit ₹)</th>
                <th className="p-3 text-right text-purple-300">ਕੁੱਲ ਕ੍ਰੈਡਿਟ (Credit ₹)</th>
                <th className="p-3 text-right text-amber-400">ਬਕਾਇਆ (Net Balance ₹)</th>
                <th className="p-3 text-center">ਕਿਸਮ</th>
                <th className="p-3 text-center">ਐਕਸ਼ਨ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    ਕੋਈ ਪਾਰਟੀ ਨਹੀਂ ਮਿਲੀ।
                  </td>
                </tr>
              ) : (
                filteredParties.map((p, idx) => (
                  <tr key={`${p.ledger.id}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">
                      <div>{p.ledger.name}</div>
                      {p.ledger.namePa && (
                        <div className="text-[11px] text-slate-500 font-normal">{p.ledger.namePa}</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">
                      {p.ledger.mobile && <div className="font-mono">{p.ledger.mobile}</div>}
                      {p.ledger.address && <div className="text-[11px] text-slate-400">{p.ledger.address}</div>}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      ₹{Number(p.opening).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-800">
                      ₹{Math.round(p.totalDebit).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-purple-800">
                      ₹{Math.round(p.totalCredit).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                      ₹{Math.round(p.balance).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.balanceType === 'DR'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {p.balanceType}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveSection('pakka-vouchers')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold transition cursor-pointer"
                      >
                        ਵਾਊਚਰ ਪਾਓ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
