import React from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Scale,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Building2,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';

export const BalanceSheetView: React.FC = () => {
  const {
    getBalanceSheetReport,
    activeFiscalYear,
    activeFirm,
    settings
  } = useMandi();

  const balanceSheet = getBalanceSheetReport(activeFiscalYear);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-700/80 text-blue-200 text-xs font-bold rounded-full border border-blue-500/40">
              CA ਆਡਿਟ ਸਟੇਟਮੈਂਟ • Financial Balance Sheet
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-400" />
            ਪੱਕੀ ਬੈਲੇਂਸ ਸ਼ੀਟ (Balance Sheet Statement)
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1">
            ਦੇਣਦਾਰੀਆਂ (Liabilities & Capital) ਬਨਾਮ ਸੰਪਤੀਆਂ (Assets, Banks & Receivables)
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>ਬੈਲੇਂਸ ਸ਼ੀਟ ਪ੍ਰਿੰਟ ਕਰੋ</span>
        </button>
      </div>

      {/* Balanced Status Bar */}
      <div
        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          balanceSheet.isBalanced
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2">
          {balanceSheet.isBalanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <div className="font-black text-sm">
              {balanceSheet.isBalanced
                ? 'ਬੈਲੇਂਸ ਸ਼ੀਟ 100% ਸੰਤੁਲਿਤ ਹੈ (Tally Balanced)'
                : 'ਬੈਲੇਂਸ ਸ਼ੀਟ ਵਿੱਚ ਫ਼ਰਕ ਹੈ (Unbalanced)'}
            </div>
            <div className="text-[11px] opacity-80">
              ਦੇਣਦਾਰੀਆਂ (Liabilities): ₹{Math.round(balanceSheet.liabilities.grandTotalLiabilities).toLocaleString()} • ਸੰਪਤੀਆਂ (Assets): ₹{Math.round(balanceSheet.assets.grandTotalAssets).toLocaleString()}
            </div>
          </div>
        </div>

        {!balanceSheet.isBalanced && (
          <div className="font-mono font-black text-sm text-rose-700 bg-white px-2.5 py-1 rounded-lg border border-amber-300">
            ਫ਼ਰਕ: ₹{Math.round(balanceSheet.difference).toLocaleString()}
          </div>
        )}
      </div>

      {/* Printable Balance Sheet Layout (T-Format) */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm p-4 sm:p-6 overflow-hidden">
        {/* Printable Header */}
        <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase">
            {activeFirm?.name || settings.firmNameEn}
          </h2>
          <div className="text-xs text-slate-600">
            {activeFirm?.address || settings.firmAddress} • ਲਾਈਸੈਂਸ: {activeFirm?.licenceNo || settings.firmLicence} • PAN: {activeFirm?.pan || settings.firmPan}
          </div>
          <h3 className="text-sm sm:text-base font-black text-blue-900 mt-2 uppercase tracking-wide">
            BALANCE SHEET AS AT 31ST MARCH ({activeFiscalYear})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-slate-300 text-xs">
          {/* Left Column: LIABILITIES */}
          <div className="md:pr-4 space-y-4 pb-4 md:pb-0">
            <div className="bg-slate-900 text-white font-black py-2 px-3 rounded-lg flex justify-between">
              <span>ਦੇਣਦਾਰੀਆਂ ਤੇ ਪੂੰਜੀ (LIABILITIES & CAPITAL)</span>
              <span>ਰਕਮ (₹)</span>
            </div>

            {/* 1. Capital Account */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                <span>ਮਾਲਕ ਦੀ ਪੂੰਜੀ (Capital Account):</span>
              </div>
              {balanceSheet.liabilities.capitalAccount.map((c, i) => (
                <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                  <span>{c.name}</span>
                  <span className="font-mono">₹{Math.round(c.amount).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between pl-3 text-emerald-700 font-bold py-0.5">
                <span>ਜੋੜੋ: ਸਾਲ ਦਾ ਸ਼ੁੱਧ ਮੁਨਾਫ਼ਾ (Net Profit for Year):</span>
                <span className="font-mono">+ ₹{Math.round(balanceSheet.liabilities.netProfitAddition).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pl-2 font-bold text-slate-900 border-t border-slate-200 pt-1">
                <span>ਕੁੱਲ ਪੂੰਜੀ (Total Net Capital):</span>
                <span className="font-mono">₹{Math.round(balanceSheet.liabilities.totalCapital).toLocaleString()}</span>
              </div>
            </div>

            {/* 2. Loans & Bank Liabilities */}
            {balanceSheet.liabilities.loansLiabilities.length > 0 && (
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                  <span>ਕਰਜ਼ੇ ਤੇ ਬੈਂਕ ਲਿਮਿਟ (Loans & CC Limits):</span>
                </div>
                {balanceSheet.liabilities.loansLiabilities.map((l, i) => (
                  <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                    <span>{l.name}</span>
                    <span className="font-mono">₹{Math.round(l.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Sundry Creditors */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                <span>ਸੰਡਰੀ ਕ੍ਰੈਡਿਟਰਜ਼ (Sundry Creditors - Farmers/Suppliers):</span>
              </div>
              {balanceSheet.liabilities.sundryCreditors.length === 0 ? (
                <div className="pl-3 text-slate-400 italic text-[11px]">ਕੋਈ ਪੈਂਡਿੰਗ ਦੇਣਦਾਰੀ ਨਹੀਂ</div>
              ) : (
                balanceSheet.liabilities.sundryCreditors.map((c, i) => (
                  <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                    <span>{c.name}</span>
                    <span className="font-mono">₹{Math.round(c.amount).toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between pl-2 font-bold text-slate-800 border-t border-slate-200 pt-1">
                <span>ਕੁੱਲ ਕ੍ਰੈਡਿਟਰਜ਼:</span>
                <span className="font-mono">₹{Math.round(balanceSheet.liabilities.totalCreditors).toLocaleString()}</span>
              </div>
            </div>

            {/* 4. Current Liabilities */}
            {balanceSheet.liabilities.currentLiabilities.length > 0 && (
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                  <span>ਚਾਲੂ ਦੇਣਦਾਰੀਆਂ (Current Liabilities / Fees / TDS):</span>
                </div>
                {balanceSheet.liabilities.currentLiabilities.map((cl, i) => (
                  <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                    <span>{cl.name}</span>
                    <span className="font-mono">₹{Math.round(cl.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Total Liabilities Footer */}
            <div className="border-t-2 border-slate-800 pt-3 flex justify-between font-black text-sm text-slate-950 bg-slate-100 p-2 rounded">
              <span>ਕੁੱਲ ਦੇਣਦਾਰੀਆਂ (TOTAL LIABILITIES):</span>
              <span className="font-mono text-base">
                ₹{Math.round(balanceSheet.liabilities.grandTotalLiabilities).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Right Column: ASSETS */}
          <div className="md:pl-4 space-y-4 pt-4 md:pt-0">
            <div className="bg-slate-900 text-white font-black py-2 px-3 rounded-lg flex justify-between">
              <span>ਸੰਪਤੀਆਂ ਤੇ ਲੈਣਦਾਰੀਆਂ (ASSETS & PROPERTIES)</span>
              <span>ਰਕਮ (₹)</span>
            </div>

            {/* 1. Fixed Assets */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                <span>ਪੱਕੀ ਜਾਇਦਾਦ (Fixed Assets):</span>
              </div>
              {balanceSheet.assets.fixedAssets.length === 0 ? (
                <div className="pl-3 text-slate-400 italic text-[11px]">ਕੋਈ ਜਾਇਦਾਦ ਦਰਜ ਨਹੀਂ</div>
              ) : (
                balanceSheet.assets.fixedAssets.map((f, i) => (
                  <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                    <span>{f.name}</span>
                    <span className="font-mono">₹{Math.round(f.amount).toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between pl-2 font-bold text-slate-800 border-t border-slate-200 pt-1">
                <span>ਕੁੱਲ ਪੱਕੀ ਸੰਪਤੀ:</span>
                <span className="font-mono">₹{Math.round(balanceSheet.assets.totalFixedAssets).toLocaleString()}</span>
              </div>
            </div>

            {/* 2. Sundry Debtors (Agencies & Buyers) */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                <span>ਸੰਡਰੀ ਡੈਬਟਰਜ਼ (Sundry Debtors - Agencies/Buyers):</span>
              </div>
              {balanceSheet.assets.sundryDebtors.length === 0 ? (
                <div className="pl-3 text-slate-400 italic text-[11px]">ਕੋਈ ਪੈਂਡਿੰਗ ਲੈਣਦਾਰੀ ਨਹੀਂ</div>
              ) : (
                balanceSheet.assets.sundryDebtors.map((d, i) => (
                  <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                    <span>{d.name}</span>
                    <span className="font-mono">₹{Math.round(d.amount).toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between pl-2 font-bold text-slate-800 border-t border-slate-200 pt-1">
                <span>ਕੁੱਲ ਡੈਬਟਰਜ਼:</span>
                <span className="font-mono">₹{Math.round(balanceSheet.assets.totalDebtors).toLocaleString()}</span>
              </div>
            </div>

            {/* 3. Bank Accounts */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                <span>ਬੈਂਕ ਖਾਤੇ (Bank Current Accounts):</span>
              </div>
              {balanceSheet.assets.bankAccounts.map((b, i) => (
                <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                  <span>{b.name}</span>
                  <span className="font-mono">₹{Math.round(b.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* 4. Cash in Hand & Current Assets */}
            <div className="space-y-1">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wide border-b border-slate-200 pb-1 flex justify-between">
                <span>ਰੋਕੜ ਤੇ ਹੋਰ ਚਾਲੂ ਸੰਪਤੀਆਂ (Cash & Current Assets):</span>
              </div>
              <div className="flex justify-between pl-3 text-slate-700 py-0.5">
                <span>ਹੱਥਲੀ ਰੋਕੜ (Cash in Hand / Galla):</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹{Math.round(balanceSheet.assets.cashInHand).toLocaleString()}
                </span>
              </div>
              {balanceSheet.assets.currentAssets.map((ca, i) => (
                <div key={i} className="flex justify-between pl-3 text-slate-700 py-0.5">
                  <span>{ca.name}</span>
                  <span className="font-mono">₹{Math.round(ca.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Total Assets Footer */}
            <div className="border-t-2 border-slate-800 pt-3 flex justify-between font-black text-sm text-slate-950 bg-slate-100 p-2 rounded">
              <span>ਕੁੱਲ ਸੰਪਤੀਆਂ (TOTAL ASSETS):</span>
              <span className="font-mono text-base">
                ₹{Math.round(balanceSheet.assets.grandTotalAssets).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Footer for CA */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-[11px] text-slate-500">
          <div>
            Prepared as per Double-Entry Mandi Accounting Standards &middot; Auto-Audited
          </div>
          <div className="font-mono">
            Date: {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>
    </div>
  );
};
