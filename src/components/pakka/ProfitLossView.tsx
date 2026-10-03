import React from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  TrendingUp,
  Printer,
  Calendar,
  DollarSign,
  Percent,
  CheckCircle2,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

export const ProfitLossView: React.FC = () => {
  const {
    getProfitAndLossReport,
    activeFiscalYear,
    activeFirm,
    settings
  } = useMandi();

  const pnl = getProfitAndLossReport(activeFiscalYear);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-700/80 text-emerald-200 text-xs font-bold rounded-full border border-emerald-500/40">
              ਵਪਾਰਕ ਤੇ ਲਾਭ-ਹਾਨੀ ਸਟੇਟਮੈਂਟ • Trading & P&L Statement
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            ਨਫ਼ਾ-ਨੁਕਸਾਨ ਖਾਤਾ (Trading & Profit & Loss Account)
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            2.5% ਆੜ੍ਹਤ ਦਾਮਾਮੀ ਆਮਦਨ, ਮੰਡੀ ਲੇਬਰ, ਦੁਕਾਨ ਖਰਚੇ ਤੇ ਕਾਰੋਬਾਰ ਦਾ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ (Net Profit)
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>ਸਟੇਟਮੈਂਟ ਪ੍ਰਿੰਟ ਕਰੋ</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500">ਕੁੱਲ ਸਿੱਧੀ ਆਮਦਨ (2.5% Damami)</div>
          <div className="text-xl font-black text-slate-900 mt-1">
            ₹{Math.round(pnl.totalDirectIncome).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">ਕਮਿਸ਼ਨ ਆੜ੍ਹਤ ਆਮਦਨ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-bold text-slate-500">ਕੁੱਲ ਦਫ਼ਤਰੀ ਤੇ ਮੰਡੀ ਖਰਚੇ (Total Expenses)</div>
          <div className="text-xl font-black text-rose-700 mt-1">
            ₹{Math.round(pnl.totalDirectExpenses + pnl.totalIndirectExpenses).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">ਲੇਬਰ, ਮੁਨੀਮ ਤਨਖਾਹ, ਬਿਜਲੀ ਆਦਿ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 shadow-2xs">
          <div className="text-xs font-bold text-emerald-900">ਸਾਲ ਦਾ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ (Net Profit)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            ₹{Math.round(pnl.netProfit).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold mt-1">ਬੈਲੇਂਸ ਸ਼ੀਟ ਪੂੰਜੀ ਵਿੱਚ ਜਮ੍ਹਾਂ</div>
        </div>
      </div>

      {/* Printable Statement Layout */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm p-4 sm:p-6 overflow-hidden space-y-6">
        <div className="text-center border-b-2 border-slate-800 pb-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
            {activeFirm?.name || settings.firmNameEn}
          </h2>
          <div className="text-xs text-slate-600">
            {activeFirm?.address || settings.firmAddress} • ਲਾਈਸੈਂਸ: {activeFirm?.licenceNo || settings.firmLicence}
          </div>
          <h3 className="text-sm sm:text-base font-black text-emerald-900 mt-2 uppercase tracking-wide">
            TRADING & PROFIT & LOSS ACCOUNT FOR THE YEAR ENDED 31ST MARCH ({activeFiscalYear})
          </h3>
        </div>

        {/* 1. Trading Account (Section A) */}
        <div className="border border-slate-700 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-800 text-white font-black py-2 px-3 flex justify-between">
            <span>ਭਾਗ 1: ਵਪਾਰਕ ਖਾਤਾ (TRADING ACCOUNT)</span>
            <span>ਸਕੂਲ ਮੁਨਾਫ਼ਾ (Gross Profit Calculation)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300">
            {/* Debit: Direct Expenses */}
            <div className="p-3 space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1 flex justify-between">
                <span>ਸਿੱਧੇ ਖਰਚੇ (Direct Expenses):</span>
                <span>ਰਕਮ (₹)</span>
              </div>
              {pnl.directExpenses.length === 0 ? (
                <div className="text-slate-400 italic text-[11px]">ਕੋਈ ਸਿੱਧਾ ਖਰਚਾ ਨਹੀਂ</div>
              ) : (
                pnl.directExpenses.map((e, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 py-0.5">
                    <span>{e.name}</span>
                    <span className="font-mono">₹{Math.round(e.amount).toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                <span>ਕੁੱਲ ਸਿੱਧੇ ਖਰਚੇ:</span>
                <span className="font-mono">₹{Math.round(pnl.totalDirectExpenses).toLocaleString()}</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded border border-emerald-200 flex justify-between font-black text-emerald-900 mt-2">
                <span>ਸਕੂਲ ਮੁਨਾਫ਼ਾ ਅੱਗੇ ਲਿਆਂਦਾ (Gross Profit c/d):</span>
                <span className="font-mono">₹{Math.round(pnl.grossProfit).toLocaleString()}</span>
              </div>
            </div>

            {/* Credit: Direct Incomes */}
            <div className="p-3 space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1 flex justify-between">
                <span>ਸਿੱਧੀ ਆਮਦਨ (Direct Incomes / Commission):</span>
                <span>ਰਕਮ (₹)</span>
              </div>
              {pnl.directIncome.map((i, idx) => (
                <div key={idx} className="flex justify-between text-slate-700 py-0.5">
                  <span>{i.name}</span>
                  <span className="font-mono font-bold">₹{Math.round(i.amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900">
                <span>ਕੁੱਲ ਸਿੱਧੀ ਆਮਦਨ (2.5% Damami):</span>
                <span className="font-mono">₹{Math.round(pnl.totalDirectIncome).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Profit & Loss Account (Section B) */}
        <div className="border border-slate-700 rounded-xl overflow-hidden text-xs">
          <div className="bg-emerald-900 text-white font-black py-2 px-3 flex justify-between">
            <span>ਭਾਗ 2: ਲਾਭ-ਹਾਨੀ ਖਾਤਾ (PROFIT & LOSS ACCOUNT)</span>
            <span>ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ (Net Profit Calculation)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300">
            {/* Debit: Indirect Expenses */}
            <div className="p-3 space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1 flex justify-between">
                <span>ਅਸਿੱਧੇ ਤੇ ਦਫ਼ਤਰੀ ਖਰਚੇ (Indirect Expenses):</span>
                <span>ਰਕਮ (₹)</span>
              </div>
              {pnl.indirectExpenses.length === 0 ? (
                <div className="text-slate-400 italic text-[11px]">ਕੋਈ ਅਸਿੱਧਾ ਖਰਚਾ ਨਹੀਂ</div>
              ) : (
                pnl.indirectExpenses.map((e, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700 py-0.5">
                    <span>{e.name}</span>
                    <span className="font-mono">₹{Math.round(e.amount).toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                <span>ਕੁੱਲ ਅਸਿੱਧੇ ਖਰਚੇ:</span>
                <span className="font-mono">₹{Math.round(pnl.totalIndirectExpenses).toLocaleString()}</span>
              </div>

              {/* Net Profit Line */}
              <div className="bg-emerald-100 p-2.5 rounded-lg border border-emerald-300 flex justify-between font-black text-emerald-950 mt-3 text-sm">
                <span>ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ (NET PROFIT transferred to Capital):</span>
                <span className="font-mono">₹{Math.round(pnl.netProfit).toLocaleString()}</span>
              </div>
            </div>

            {/* Credit: Gross Profit b/f and Indirect Incomes */}
            <div className="p-3 space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1 flex justify-between">
                <span>ਆਮਦਨ ਵੇਰਵਾ (Incomes & Gross Profit):</span>
                <span>ਰਕਮ (₹)</span>
              </div>
              <div className="flex justify-between text-emerald-900 font-bold py-1 bg-emerald-50 px-2 rounded">
                <span>ਸਕੂਲ ਮੁਨਾਫ਼ਾ ਪਿੱਛੋਂ ਲਿਆਂਦਾ (Gross Profit b/d):</span>
                <span className="font-mono">₹{Math.round(pnl.grossProfit).toLocaleString()}</span>
              </div>

              {pnl.indirectIncome.map((i, idx) => (
                <div key={idx} className="flex justify-between text-slate-700 py-0.5">
                  <span>{i.name}</span>
                  <span className="font-mono font-bold">₹{Math.round(i.amount).toLocaleString()}</span>
                </div>
              ))}

              <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900">
                <span>ਕੁੱਲ ਆਮਦਨ:</span>
                <span className="font-mono">
                  ₹{Math.round(pnl.grossProfit + pnl.totalIndirectIncome).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
