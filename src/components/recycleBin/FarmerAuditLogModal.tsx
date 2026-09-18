import React, { useState, useMemo } from 'react';
import {
  FarmerAuditLogEntry,
  getFarmerAuditLogs
} from '../../utils/farmerAuditLog';
import {
  X,
  FileText,
  Search,
  RotateCcw,
  Trash2,
  AlertOctagon,
  ShieldCheck,
  Clock,
  User,
  Calendar
} from 'lucide-react';

interface FarmerAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FarmerAuditLogModal: React.FC<FarmerAuditLogModalProps> = ({
  isOpen,
  onClose
}) => {
  const [search, setSearch] = useState('');
  const logs = useMemo(() => getFarmerAuditLogs(), [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase().trim();
    return logs.filter((log) => {
      return (
        log.farmerId.toLowerCase().includes(q) ||
        log.farmerName.toLowerCase().includes(q) ||
        log.farmerNamePa.toLowerCase().includes(q) ||
        (log.village && log.village.toLowerCase().includes(q)) ||
        (log.performedBy && log.performedBy.toLowerCase().includes(q))
      );
    });
  }, [logs, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                <span>ਕਿਸਾਨ ਆਡਿਟ ਲੌਗ / Farmer Audit Log</span>
                <span className="text-xs bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full border border-slate-700">
                  {logs.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Deleted, Restored, and Permanently Deleted Farmer History & ID Tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ਕਿਸਾਨ ID (#FRM...), ਨਾਮ, ਪਿੰਡ ਜਾਂ ਆਪਰੇਟਰ ਨਾਲ ਖੋਜੋ..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">ਕੋਈ ਆਡਿਟ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ</p>
              <p className="text-xs text-slate-400">
                ਜਦੋਂ ਕੋਈ ਕਿਸਾਨ ਡਿਲੀਟ, ਮੁੜ ਬਹਾਲ ਜਾਂ ਪੱਕਾ ਡਿਲੀਟ ਕੀਤਾ ਜਾਵੇਗਾ, ਉਸਦਾ ਰਿਕਾਰਡ ਇੱਥੇ ਦਰਜ ਹੋਵੇਗਾ।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                let badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                let actionLabelPa = 'ਡਿਲੀਟ (ਸਾਫਟ ਡਿਲੀਟ)';
                let actionLabelEn = 'Soft Deleted to Bin';
                let Icon = Trash2;

                if (item.action === 'FARMER_RESTORED') {
                  badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  actionLabelPa = 'ਮੁੜ ਬਹਾਲ (Restored)';
                  actionLabelEn = 'Restored with Same ID';
                  Icon = RotateCcw;
                } else if (item.action === 'FARMER_PERMANENTLY_DELETED') {
                  badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                  actionLabelPa = 'ਪੱਕਾ ਡਿਲੀਟ (Purged)';
                  actionLabelEn = 'Permanently Purged';
                  Icon = AlertOctagon;
                }

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border flex items-center gap-1 ${badgeClass}`}>
                          <Icon className="w-3 h-3" />
                          <span>{actionLabelPa}</span>
                        </span>
                        <span className="font-mono text-xs font-black text-slate-800 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                          #{item.farmerId}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {item.farmerNamePa}
                          {item.farmerName && (
                            <span className="text-slate-500 font-normal ml-1 font-sans">
                              ({item.farmerName})
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 font-bold">ਪਿੰਡ (Village):</span>{' '}
                        <span className="font-semibold text-slate-800">{item.village || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">ਮੋਬਾਈਲ (Mobile):</span>{' '}
                        <span className="font-semibold text-slate-800">{item.mobile ? `+91 ${item.mobile}` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">ਕਾਰਵਾਈ ਕਰਨ ਵਾਲਾ:</span>{' '}
                        <span className="font-semibold text-slate-900">{item.performedBy}</span>
                      </div>
                    </div>

                    {item.details && (
                      <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-150">
                        {item.details}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            IDs are permanently logged and never re-allocated to any other farmer.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
