import React from 'react';
import { Package, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { FarmerAccountSummary } from '../../types/mandi';

interface BardanaClearanceCardProps {
  summary: FarmerAccountSummary;
  onNavigateToBardana?: () => void;
}

export const BardanaClearanceCard: React.FC<BardanaClearanceCardProps> = ({
  summary,
  onNavigateToBardana
}) => {
  const totalBagsUsed = summary.totalBardanaUsed || 0;
  const newUsed = summary.newBardanaUsed || 0;
  const oldUsed = summary.oldBardanaUsed || 0;
  const purchasedBags = summary.purchasedBags || summary.mandiArrivalBags || 0;

  // Clearance check: In Mandi ops, bags used in arrival should match or balance with filled bags
  const isCleared = totalBagsUsed >= purchasedBags && purchasedBags > 0;
  const pendingBags = Math.max(0, purchasedBags - totalBagsUsed);

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-emerald-50/70 rounded-2xl border-2 border-amber-200/90 p-4 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Title & Status */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-900 rounded-2xl border border-amber-300 shrink-0">
            <Package className="w-6 h-6 text-amber-800" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-slate-900">
                ਬਾਰਦਾਨਾ ਕਲੀਅਰੈਂਸ ਸਥਿਤੀ (Gunny Bags Inventory Status)
              </h4>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${
                isCleared
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {isCleared ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>ਬਾਰਦਾਨਾ ਕਲੀਅਰ (All Cleared)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>ਚੱਲ ਰਿਹਾ ਸਟਾਕ (Active)</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              ਕਿਸਾਨ ਵੱਲੋਂ ਵਰਤਿਆ ਗਿਆ ਬਾਰਦਾਨਾ (ਨਵਾਂ ਤੇ ਪੁਰਾਣਾ) ਅਤੇ ਖਰੀਦ ਬੋਰੀਆਂ ਦਾ ਤਾਲਮੇਲ
            </p>
          </div>
        </div>

        {/* Right: Metrics Numbers */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap shrink-0">
          <div className="bg-white/90 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs text-center min-w-[75px]">
            <span className="text-[10px] font-bold text-slate-500 block">ਨਵਾਂ (New)</span>
            <span className="text-base font-black text-slate-900 font-mono">{newUsed}</span>
          </div>

          <div className="bg-white/90 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs text-center min-w-[75px]">
            <span className="text-[10px] font-bold text-slate-500 block">ਪੁਰਾਣਾ (Old)</span>
            <span className="text-base font-black text-slate-900 font-mono">{oldUsed}</span>
          </div>

          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-xs text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-amber-300 block">ਕੁੱਲ ਵਰਤਿਆ</span>
            <span className="text-lg font-black text-white font-mono">{totalBagsUsed}</span>
          </div>

          {onNavigateToBardana && (
            <button
              type="button"
              onClick={onNavigateToBardana}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition cursor-pointer shrink-0"
              title="ਬਾਰਦਾਨਾ ਖਾਤੇ ਵਿੱਚ ਜਾਓ"
            >
              <span>ਬਾਰਦਾਨਾ ਖਾਤਾ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
