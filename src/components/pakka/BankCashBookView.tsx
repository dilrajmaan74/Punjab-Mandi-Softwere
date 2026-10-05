import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Landmark,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { calculateLedgerBalance } from '../../utils/pakkaCalculations';
import { compareDatesChronological } from '../../utils/calculations';

export const BankCashBookView: React.FC = () => {
  const {
    pakkaLedgers,
    pakkaVouchers,
    activeFiscalYear,
    setActiveSection
  } = useMandi();

  const bankAndCashLedgers = pakkaLedgers.filter(
    (l) => l.group === 'BANK_ACCOUNTS' || l.group === 'CASH_IN_HAND'
  );

  const [selectedLedgerId, setSelectedLedgerId] = useState<string>(
    bankAndCashLedgers[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  const currentLedger = pakkaLedgers.find((l) => l.id === selectedLedgerId) || bankAndCashLedgers[0];

  // Calculate live balance for all bank & cash accounts
  const accountsSummary = bankAndCashLedgers.map((acc) => {
    const bal = calculateLedgerBalance(acc, pakkaVouchers, activeFiscalYear);
    return {
      ledger: acc,
      balance: bal.closingBalance,
      balanceType: bal.closingBalanceType
    };
  });

  const totalLiquidity = accountsSummary.reduce((sum, a) => sum + a.balance, 0);

  // Get chronological voucher statement for currently selected ledger
  const ledgerVouchers = currentLedger
    ? pakkaVouchers
        .filter((v) => {
          if (activeFiscalYear && v.fiscalYear !== activeFiscalYear) return false;
          return v.debitLedgerId === currentLedger.id || v.creditLedgerId === currentLedger.id;
        })
        .sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'))
    : [];

  // Filter vouchers by search
  const filteredVouchers = ledgerVouchers.filter((v) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNo = (v.voucherNo || '').toLowerCase().includes(q);
      const matchNarr = v.narration?.toLowerCase().includes(q) || (v.narrationPa && v.narrationPa.includes(q));
      const matchDr = (v.debitLedgerName || '').toLowerCase().includes(q);
      const matchCr = (v.creditLedgerName || '').toLowerCase().includes(q);
      if (!matchNo && !matchNarr && !matchDr && !matchCr) return false;
    }
    return true;
  });

  // Calculate running statement
  let currentRunningBalance = Number(currentLedger?.openingBalance) || 0;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-700/80 text-blue-200 text-xs font-bold rounded-full border border-blue-500/40">
              ਬੈਂਕ ਵਹੀ ਤੇ ਰੋਕੜ ਖਾਤਾ • Bank & Cash Books
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-400" />
            ਬੈਂਕ ਖਾਤੇ ਤੇ ਹੱਥਲੀ ਰੋਕੜ (Passbook & Cash Book)
          </h2>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            ਸਾਰੇ ਬੈਂਕ ਚਾਲੂ ਖਾਤਿਆਂ ਦੀ ਪਾਸਬੁੱਕ, ਰੋਕੜ ਵਹੀ, ਚੈੱਕ/RTGS ਐਂਟਰੀਆਂ ਤੇ ਲਾਈਵ ਬੈਲੇਂਸ
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>ਪਾਸਬੁੱਕ ਪ੍ਰਿੰਟ ਕਰੋ</span>
        </button>
      </div>

      {/* Account Cards Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {accountsSummary.map((item) => {
          const isSelected = item.ledger.id === currentLedger?.id;
          const isBank = item.ledger.group === 'BANK_ACCOUNTS';

          return (
            <div
              key={item.ledger.id}
              onClick={() => setSelectedLedgerId(item.ledger.id)}
              className={`p-3.5 rounded-xl border transition cursor-pointer shadow-2xs ${
                isSelected
                  ? 'bg-blue-900 text-white border-blue-700 shadow-md ring-2 ring-blue-500/50'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBank ? (
                    <Landmark className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-blue-700'}`} />
                  ) : (
                    <Wallet className={`w-4 h-4 ${isSelected ? 'text-amber-300' : 'text-emerald-700'}`} />
                  )}
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                    {isBank ? 'ਬੈਂਕ ਖਾਤਾ' : 'ਰੋਕੜ ਖਾਤਾ'}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                  {item.balanceType}
                </span>
              </div>

              <div className="text-sm font-black mt-1.5 truncate">
                {item.ledger.name}
              </div>
              {item.ledger.accountNumber && (
                <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>
                  A/c: {item.ledger.accountNumber}
                </div>
              )}

              <div className="text-base font-black mt-2 font-mono">
                ₹{Math.round(item.balance).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Account Passbook Statement */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              ਚੁਣੀ ਗਈ ਪਾਸਬੁੱਕ ਸਟੇਟਮੈਂਟ (Passbook Statement)
            </div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mt-0.5">
              <span>{currentLedger?.name}</span>
              {currentLedger?.namePa && <span className="text-slate-500 text-xs">({currentLedger.namePa})</span>}
            </h3>
            {currentLedger?.accountNumber && (
              <div className="text-xs text-slate-600 font-mono mt-0.5">
                ਖਾਤਾ ਨੰਬਰ: {currentLedger.accountNumber} &middot; IFSC: {currentLedger.ifscCode || '---'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ਵਾਊਚਰ ਜਾਂ ਵੇਰਵਾ ਲੱਭੋ..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveSection('pakka-vouchers')}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-2xs whitespace-nowrap"
            >
              + ਨਵਾਂ ਵਾਊਚਰ
            </button>
          </div>
        </div>

        {/* Passbook Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">ਮਿਤੀ / Date</th>
                <th className="p-3">ਵਾਊਚਰ ਨੰਬਰ</th>
                <th className="p-3">ਕਿਸਮ (Type)</th>
                <th className="p-3">ਦੂਜਾ ਖਾਤਾ (Contra Party)</th>
                <th className="p-3">ਵੇਰਵਾ (Narration)</th>
                <th className="p-3 text-right text-emerald-400">ਜਮ੍ਹਾਂ / ਡੈਬਿਟ (Receipt ₹)</th>
                <th className="p-3 text-right text-rose-400">ਕਢਵਾਏ / ਕ੍ਰੈਡਿਟ (Payment ₹)</th>
                <th className="p-3 text-right text-blue-200">ਬਕਾਇਆ (Running Bal ₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {/* Opening Balance Row */}
              <tr className="bg-blue-50/40 font-bold">
                <td className="p-3 font-mono text-slate-600">01/04/2026</td>
                <td className="p-3 text-slate-500 font-mono">OP-BAL</td>
                <td className="p-3 text-slate-500">OPENING</td>
                <td className="p-3 text-slate-700">ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ (Opening Balance)</td>
                <td className="p-3 text-slate-500 font-normal">Starting fiscal year balance</td>
                <td className="p-3 text-right font-mono font-bold text-emerald-700">
                  {currentLedger?.openingBalanceType === 'DR' ? `₹${Number(currentLedger.openingBalance).toLocaleString()}` : '---'}
                </td>
                <td className="p-3 text-right font-mono font-bold text-rose-700">
                  {currentLedger?.openingBalanceType === 'CR' ? `₹${Number(currentLedger.openingBalance).toLocaleString()}` : '---'}
                </td>
                <td className="p-3 text-right font-mono font-black text-blue-900">
                  ₹{Number(currentLedger?.openingBalance || 0).toLocaleString()} {currentLedger?.openingBalanceType}
                </td>
              </tr>

              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    ਇਸ ਖਾਤੇ ਵਿੱਚ ਕੋਈ ਵਾਊਚਰ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v, idx) => {
                  const isDebit = v.debitLedgerId === currentLedger?.id;
                  const amt = Number(v.amount) || 0;

                  if (isDebit) {
                    currentRunningBalance += amt;
                  } else {
                    currentRunningBalance -= amt;
                  }

                  const otherPartyName = isDebit ? v.creditLedgerName : v.debitLedgerName;

                  return (
                    <tr key={`${v.id}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{v.date}</td>
                      <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">{v.voucherNo}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {v.voucherType}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{otherPartyName}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {v.narrationPa || v.narration}
                        {v.chequeNo && <span className="block text-[10px] font-mono text-slate-400">Chq: {v.chequeNo}</span>}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {isDebit ? `₹${amt.toLocaleString()}` : '---'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700">
                        {!isDebit ? `₹${amt.toLocaleString()}` : '---'}
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        ₹{Math.round(Math.abs(currentRunningBalance)).toLocaleString()}{' '}
                        <span className="text-[10px] font-bold text-slate-500">
                          {currentRunningBalance >= 0 ? 'DR' : 'CR'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
