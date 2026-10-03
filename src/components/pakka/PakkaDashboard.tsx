import React from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  FileText,
  FileCheck,
  Landmark,
  Scale,
  TrendingUp,
  Receipt,
  Users,
  ShieldCheck,
  Plus,
  ArrowRight,
  ArrowRightLeft,
  DollarSign,
  Percent,
  CheckCircle2,
  Lock,
  Boxes,
  FileCheck2,
  Calendar
} from 'lucide-react';
import { calculateLedgerBalance } from '../../utils/pakkaCalculations';
import { compareDatesChronological } from '../../utils/calculations';

export const PakkaDashboard: React.FC = () => {
  const {
    iFormRecords,
    jFormRecords,
    pakkaLedgers,
    pakkaVouchers,
    tdsRecords,
    activeFiscalYear,
    setActiveSection,
    getProfitAndLossReport,
    getBalanceSheetReport,
    setAppMode,
    activeFirm,
    settings
  } = useMandi();

  const pnl = getProfitAndLossReport(activeFiscalYear);
  const balanceSheet = getBalanceSheetReport(activeFiscalYear);

  // Financial aggregates
  const totalBagsPurchased = iFormRecords.reduce((sum, r) => sum + r.totalBags, 0);
  const totalWeightQtl = iFormRecords.reduce((sum, r) => sum + r.totalWeightQtl, 0);
  const totalTurnover = iFormRecords.reduce((sum, r) => sum + r.cropGrossAmount, 0);
  const totalDamami = iFormRecords.reduce((sum, r) => sum + r.damamiAmount, 0);
  const totalTdsReceivable = tdsRecords
    .filter((t) => t.type === 'RECEIVABLE')
    .reduce((sum, t) => sum + t.tdsAmount, 0);

  // Bank & Cash Balance
  const bankAccounts = pakkaLedgers.filter((l) => l.group === 'BANK_ACCOUNTS' || l.group === 'CASH_IN_HAND');
  const totalLiquidity = bankAccounts.reduce((sum, b) => {
    const bal = calculateLedgerBalance(b, pakkaVouchers, activeFiscalYear);
    return sum + (bal.closingBalanceType === 'DR' ? bal.closingBalance : -bal.closingBalance);
  }, 0);

  // Recent 5 I-Forms (Chronological)
  const recentIForms = [...iFormRecords]
    .sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'))
    .slice(0, 5);

  // Recent 5 Vouchers (Chronological)
  const recentVouchers = [...pakkaVouchers]
    .sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Header Announcement Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-black rounded-full shadow-xs">
              ਪੱਕਾ ਅਕਾਊਂਟਿੰਗ ਸਾਫਟਵੇਅਰ • Official Accounting System
            </span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold rounded-md border border-amber-500/40">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
            <span className="text-xs text-slate-300">
              ਫਰਮ: <strong className="text-white">{activeFirm?.name || settings.firmNameEn}</strong>
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2.5">
            <Scale className="w-7 h-7 text-amber-400" />
            ਪੱਕਾ ਅਕਾਊਂਟਿੰਗ ਤੇ ਸਰਕਾਰੀ ਪੋਰਟਲ ਸਿਸਟਮ
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-2xl">
            I-Form ਤੇ J-Form ਰਜਿਸਟਰ, ਸਰਕਾਰੀ ਪੋਰਟਲ ਲਾਕ, 2.5% ਆੜ੍ਹਤ ਦਾਮਾਮੀ, ਡਬਲ-ਐਂਟਰੀ ਲੈੱਜਰ, ਬੈਲੇਂਸ ਸ਼ੀਟ ਤੇ ਟੀ.ਡੀ.ਐੱਸ. (TDS) ਰਜਿਸਟਰ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSection('pakka-transfer')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>ਕੱਚੀ ਖਰੀਦ ਤੋਂ I-Form ਬਣਾਓ</span>
          </button>

          <button
            type="button"
            onClick={() => setAppMode('KACHA')}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            title="ਵਾਪਸ ਕੱਚਾ ਮੰਡੀ ਸਿਸਟਮ ਵਿੱਚ ਜਾਓ"
          >
            <span>ਕੱਚਾ ਮੰਡੀ ਕੰਮ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 Core Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Official Mandi Turnover */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਸਰਕਾਰੀ ਟਰਨਓਵਰ (Turnover)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            ₹{Math.round(totalTurnover).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {totalWeightQtl.toLocaleString()} ਕੁਇੰਟਲ ({totalBagsPurchased} ਬੋਰੀਆਂ)
          </div>
        </div>

        {/* 2. Damami / 2.5% Commission */}
        <div className="bg-white p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800">2.5% ਆੜ੍ਹਤ (Commission)</div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
            ₹{Math.round(totalDamami).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
            {iFormRecords.length} ਆਈ-ਫਾਰਮਾਂ ਤੋਂ
          </div>
        </div>

        {/* 3. Net Profit */}
        <div className="bg-white p-3.5 rounded-xl border border-blue-300 bg-blue-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-900">ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ (Net Profit)</div>
          <div className="text-lg sm:text-xl font-black text-blue-800 mt-0.5">
            ₹{Math.round(pnl.netProfit).toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-600 font-semibold mt-1">
            ਬਾਅਦ ਦੁਕਾਨ ਤੇ ਲੇਬਰ ਖਰਚੇ
          </div>
        </div>

        {/* 4. Bank & Cash Liquidity */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਬੈਂਕ ਤੇ ਕੈਸ਼ (Bank & Cash)</div>
          <div className="text-lg sm:text-xl font-black text-indigo-900 mt-0.5">
            ₹{Math.round(totalLiquidity).toLocaleString()}
          </div>
          <div className="text-[10px] text-indigo-600 font-semibold mt-1">
            ਚਾਲੂ ਖਾਤੇ ਤੇ ਹੱਥਲੀ ਰੋਕੜ
          </div>
        </div>

        {/* 5. Sundry Debtors (Receivable from Agencies) */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਏਜੰਸੀਆਂ ਤੋਂ ਲੈਣਯੋਗ (Debtors)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            ₹{Math.round(balanceSheet.assets.totalDebtors).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Pungrain, Markfed, Millers
          </div>
        </div>

        {/* 6. TDS Receivable */}
        <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-900">ਕੱਟਿਆ TDS (Sec 194H)</div>
          <div className="text-lg sm:text-xl font-black text-purple-800 mt-0.5">
            ₹{Math.round(totalTdsReceivable).toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-600 font-semibold mt-1">
            ITR ਰਿਫੰਡ ਯੋਗ ਐਸੇਟ
          </div>
        </div>
      </div>

      {/* Quick Access Menu Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveSection('iform-register')}
          className="p-3 bg-white hover:bg-blue-50/70 border border-slate-200 rounded-xl text-left transition shadow-2xs group cursor-pointer"
        >
          <FileText className="w-5 h-5 text-blue-700 group-hover:scale-110 transition mb-1.5" />
          <div className="font-bold text-xs text-slate-900">ਆਈ-ਫਾਰਮ</div>
          <div className="text-[10px] text-slate-500">ਏਜੰਸੀ ਬਿੱਲ ({iFormRecords.length})</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('jform-register')}
          className="p-3 bg-white hover:bg-emerald-50/70 border border-slate-200 rounded-xl text-left transition shadow-2xs group cursor-pointer"
        >
          <FileCheck className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition mb-1.5" />
          <div className="font-bold text-xs text-slate-900">ਜੇ-ਫਾਰਮ</div>
          <div className="text-[10px] text-slate-500">ਕਿਸਾਨ ਸਰਟੀਫਿਕੇਟ ({jFormRecords.length})</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('pakka-ledgers')}
          className="p-3 bg-white hover:bg-indigo-50/70 border border-slate-200 rounded-xl text-left transition shadow-2xs group cursor-pointer"
        >
          <Landmark className="w-5 h-5 text-indigo-700 group-hover:scale-110 transition mb-1.5" />
          <div className="font-bold text-xs text-slate-900">ਲੈੱਜਰ ਮਾਸਟਰ</div>
          <div className="text-[10px] text-slate-500">ਚਾਰਟ ਆਫ ਅਕਾਊਂਟਸ</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('pakka-vouchers')}
          className="p-3 bg-white hover:bg-purple-50/70 border border-slate-200 rounded-xl text-left transition shadow-2xs group cursor-pointer"
        >
          <Receipt className="w-5 h-5 text-purple-700 group-hover:scale-110 transition mb-1.5" />
          <div className="font-bold text-xs text-slate-900">ਵਾਊਚਰ ਐਂਟਰੀ</div>
          <div className="text-[10px] text-slate-500">ਡਬਲ ਐਂਟਰੀ ਰਸੀਦ/ਭੁਗਤਾਨ</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('pakka-balancesheet')}
          className="p-3 bg-white hover:bg-blue-50/70 border border-slate-200 rounded-xl text-left transition shadow-2xs group cursor-pointer"
        >
          <Scale className="w-5 h-5 text-blue-700 group-hover:scale-110 transition mb-1.5" />
          <div className="font-bold text-xs text-slate-900">ਬੈਲੇਂਸ ਸ਼ੀਟ</div>
          <div className="text-[10px] text-slate-500">ਦੇਣਦਾਰੀਆਂ ਤੇ ਸੰਪਤੀਆਂ</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('pakka-profitloss')}
          className="p-3 bg-white hover:bg-emerald-50/70 border border-slate-200 rounded-xl text-left transition shadow-2xs group cursor-pointer"
        >
          <TrendingUp className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition mb-1.5" />
          <div className="font-bold text-xs text-slate-900">ਨਫ਼ਾ-ਨੁਕਸਾਨ</div>
          <div className="text-[10px] text-slate-500">Trading & P&L A/c</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('pakka-tds')}
          className="p-3 bg-white hover:bg-rose-50/70 border border-slate-200 rounded-xl text-left transition shadow-2xs group cursor-pointer"
        >
          <FileCheck2 className="w-5 h-5 text-rose-700 group-hover:scale-110 transition mb-1.5" />
          <div className="font-bold text-xs text-slate-900">TDS ਰਜਿਸਟਰ</div>
          <div className="text-[10px] text-slate-500">194H / 194C / 194Q</div>
        </button>
      </div>

      {/* Two-Column Overview: Recent I-Forms & Recent Vouchers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent I-Forms */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-700" />
              ਤਾਜ਼ਾ ਆਈ-ਫਾਰਮ (Recent I-Forms)
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('iform-register')}
              className="text-[11px] text-blue-700 hover:text-blue-900 font-bold"
            >
              ਸਾਰੇ ਦੇਖੋ &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentIForms.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                ਕੋਈ ਆਈ-ਫਾਰਮ ਨਹੀਂ ਬਣਿਆ। "ਕੱਚੀ ਖਰੀਦ ਤੋਂ I-Form ਬਣਾਓ" ਦਬਾਓ।
              </div>
            ) : (
              recentIForms.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="p-3 flex items-center justify-between hover:bg-slate-50 transition text-xs">
                  <div>
                    <div className="font-mono font-bold text-blue-900">{item.iFormNo}</div>
                    <div className="text-slate-600 mt-0.5">
                      {item.agency} &middot; {item.date} &middot; {item.cropType}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      ₹{Math.round(item.totalBillAmount).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold">
                      ਦਾਮਾਮੀ: ₹{Math.round(item.damamiAmount).toLocaleString()}
                    </div>
                  </div>

                  <div className="pl-3">
                    {item.isLocked ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>ਲੌਕ</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        ਖੁੱਲ੍ਹਾ
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Vouchers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-indigo-700" />
              ਤਾਜ਼ਾ ਡਬਲ-ਐਂਟਰੀ ਵਾਊਚਰ (Recent Vouchers)
            </h3>
            <button
              type="button"
              onClick={() => setActiveSection('pakka-vouchers')}
              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold"
            >
              ਸਾਰੇ ਦੇਖੋ &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentVouchers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                ਕੋਈ ਵਾਊਚਰ ਐਂਟਰੀ ਨਹੀਂ ਹੈ।
              </div>
            ) : (
              recentVouchers.map((v, idx) => (
                <div key={`${v.id}-${idx}`} className="p-3 flex items-center justify-between hover:bg-slate-50 transition text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-indigo-900">{v.voucherNo}</span>
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[9px] font-bold">
                        {v.voucherType}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5 truncate max-w-xs">
                      Dr: <strong className="text-blue-900">{v.debitLedgerName}</strong> / Cr: <strong className="text-purple-900">{v.creditLedgerName}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-slate-900">
                      ₹{Math.round(v.amount).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{v.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
