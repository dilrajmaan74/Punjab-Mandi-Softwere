import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  FileText,
  Lock,
  Unlock,
  Printer,
  Search,
  Calendar,
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShieldCheck,
  ArrowRight,
  Filter,
  Plus
} from 'lucide-react';
import { IFormRecord } from '../../types/pakkaAccounting';
import { compareDatesChronological } from '../../utils/calculations';

export const IFormRegister: React.FC = () => {
  const {
    iFormRecords,
    toggleLockIForm,
    activeFiscalYear,
    language,
    setActiveSection,
    settings,
    activeFirm
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'GENERATED'>('ALL');
  const [selectedIFormForModal, setSelectedIFormForModal] = useState<IFormRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [lockReasonInput, setLockReasonInput] = useState('');
  const [lockingRecordId, setLockingRecordId] = useState<string | null>(null);

  // Filter records
  const filteredRecords = iFormRecords.filter((rec) => {
    if (activeFiscalYear && rec.fiscalYear !== activeFiscalYear) return false;
    if (selectedAgency !== 'ALL' && rec.agency !== selectedAgency) return false;
    if (statusFilter === 'LOCKED' && !rec.isLocked) return false;
    if (statusFilter === 'GENERATED' && rec.isLocked) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNo = rec.iFormNo.toLowerCase().includes(q);
      const matchAgency = rec.agency.toLowerCase().includes(q);
      const matchDate = rec.date.includes(q);
      if (!matchNo && !matchAgency && !matchDate) return false;
    }
    return true;
  }).sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'));

  const agenciesList = Array.from(new Set(iFormRecords.map((r) => r.agency)));

  // Aggregate stats
  const totalBags = filteredRecords.reduce((sum, r) => sum + r.totalBags, 0);
  const totalWeight = filteredRecords.reduce((sum, r) => sum + r.totalWeightQtl, 0);
  const totalGross = filteredRecords.reduce((sum, r) => sum + r.cropGrossAmount, 0);
  const totalDamami = filteredRecords.reduce((sum, r) => sum + r.damamiAmount, 0);
  const totalReceivable = filteredRecords.reduce((sum, r) => sum + r.netReceivableFromAgency, 0);
  const lockedCount = filteredRecords.filter((r) => r.isLocked).length;

  const handleToggleLock = (id: string, currentlyLocked: boolean) => {
    if (currentlyLocked) {
      if (window.confirm('ਕੀ ਤੁਸੀਂ ਵਾਕਈ ਇਸ ਆਈ-ਫਾਰਮ ਨੂੰ ਅਨ-ਲੌਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? (CA Audit Record will be editable)')) {
        toggleLockIForm(id);
      }
    } else {
      setLockingRecordId(id);
      setLockReasonInput('Official Punjab Mandi Board Portal Freeze');
    }
  };

  const confirmLock = () => {
    if (lockingRecordId) {
      toggleLockIForm(lockingRecordId, lockReasonInput);
      setLockingRecordId(null);
      setLockReasonInput('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-blue-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-700/80 text-blue-200 text-xs font-bold rounded-full border border-blue-500/40">
              ਪੱਕਾ ਸਰਕਾਰੀ ਰਿਕਾਰਡ • Form 'I' Register
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            ਸਰਕਾਰੀ ਆਈ-ਫਾਰਮ ਰਜਿਸਟਰ (Agency Sales Bills)
          </h2>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            ਖਰੀਦ ਏਜੰਸੀਆਂ (Pungrain, Markfed ਆਦਿ) ਦੇ ਅਧਿਕਾਰਤ ਬਿੱਲ, 2.5% ਦਾਮਾਮੀ, ਮੰਡੀ ਲੇਬਰ ਤੇ 3% ਫੀਸਾਂ ਸਮੇਤ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSection('pakka-transfer')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ਕੱਚੀ ਖਰੀਦ ਤੋਂ I-Form ਬਣਾਓ</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਕੁੱਲ ਆਈ-ਫਾਰਮ (Total I-Forms)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            {filteredRecords.length}{' '}
            <span className="text-xs font-normal text-slate-500">ਬਿੱਲ</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>{lockedCount} ਪੋਰਟਲ 'ਤੇ ਲੌਕ/ਫ੍ਰੀਜ਼</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਕੁੱਲ ਬੋਰੀਆਂ ਤੇ ਵਜ਼ਨ</div>
          <div className="text-lg sm:text-xl font-black text-blue-900 mt-0.5">
            {totalBags.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">ਬੋਰੀਆਂ</span>
          </div>
          <div className="text-[10px] text-slate-600 font-mono mt-1">
            {totalWeight.toLocaleString()} ਕੁਇੰਟਲ
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਕੁੱਲ ਫ਼ਸਲ ਮੁੱਲ (Crop Gross)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            ₹{Math.round(totalGross).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">MSP ਰੇਟ ਅਨੁਸਾਰ</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800">2.5% ਆੜ੍ਹਤ ਦਾਮਾਮੀ (Commission)</div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
            ₹{Math.round(totalDamami).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">ਆੜ੍ਹਤੀਏ ਦੀ ਸ਼ੁੱਧ ਆਮਦਨ</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-indigo-900">ਏਜੰਸੀ ਤੋਂ ਲੈਣਯੋਗ (Receivable)</div>
          <div className="text-lg sm:text-xl font-black text-indigo-700 mt-0.5">
            ₹{Math.round(totalReceivable).toLocaleString()}
          </div>
          <div className="text-[10px] text-indigo-600 font-semibold mt-1">ਬਾਅਦ 2% TDS ਕਟੌਤੀ</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="I-Form ਨੰਬਰ, ਏਜੰਸੀ ਜਾਂ ਮਿਤੀ ਲੱਭੋ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">ਸਾਰੀਆਂ ਏਜੰਸੀਆਂ (All Agencies)</option>
            {agenciesList.map((agy) => (
              <option key={agy} value={agy}>
                {agy}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">ਸਾਰੇ ਸਟੇਟਸ (All Status)</option>
            <option value="LOCKED">🔒 ਲੌਕ / ਫ੍ਰੀਜ਼ (Portal Locked)</option>
            <option value="GENERATED">📝 ਖੁੱਲ੍ਹਾ (Editable)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          ਕੁੱਲ ਰਿਕਾਰਡ: <strong className="text-slate-800">{filteredRecords.length}</strong>
        </div>
      </div>

      {/* I-Forms Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">ਮਿਤੀ / Date</th>
                <th className="p-3">I-Form ਨੰਬਰ</th>
                <th className="p-3">ਖਰੀਦ ਏਜੰਸੀ</th>
                <th className="p-3">ਫ਼ਸਲ / Crop</th>
                <th className="p-3 text-right">ਬੋਰੀਆਂ</th>
                <th className="p-3 text-right">ਕੁਇੰਟਲ</th>
                <th className="p-3 text-right">ਫ਼ਸਲ ਮੁੱਲ (₹)</th>
                <th className="p-3 text-right text-emerald-400">2.5% ਦਾਮਾਮੀ</th>
                <th className="p-3 text-right">ਲੇਬਰ (₹)</th>
                <th className="p-3 text-right text-indigo-300">ਕੁੱਲ ਬਿੱਲ</th>
                <th className="p-3 text-center">ਸਟੇਟਸ</th>
                <th className="p-3 text-center">ਐਕਸ਼ਨ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    ਕੋਈ ਆਈ-ਫਾਰਮ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। "ਕੱਚੀ ਖਰੀਦ ਤੋਂ I-Form ਬਣਾਓ" ਬਟਨ ਦਬਾਓ।
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-blue-50/40 transition">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{item.date}</td>
                    <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                      {item.iFormNo}
                    </td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                      {item.agency} {item.agencyPa ? `(${item.agencyPa})` : ''}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">
                        {item.cropType}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-700">
                      {item.totalBags}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {item.totalWeightQtl}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      ₹{Math.round(item.cropGrossAmount).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                      ₹{Math.round(item.damamiAmount).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      ₹{Math.round(item.labourCharges.totalLabourAmount).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-indigo-900">
                      ₹{Math.round(item.totalBillAmount).toLocaleString()}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {item.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>ਲੌਕ / ਫ੍ਰੀਜ਼</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold rounded-full">
                          <Unlock className="w-3 h-3" />
                          <span>ਖੁੱਲ੍ਹਾ</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIFormForModal(item);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                          title="ਵੇਰਵਾ ਤੇ ਅਧਿਕਾਰਤ ਸਰਕਾਰੀ ਪ੍ਰਿੰਟ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLock(item.id, item.isLocked)}
                          className={`p-1.5 rounded-lg transition ${
                            item.isLocked
                              ? 'text-rose-700 hover:bg-rose-100'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                          title={item.isLocked ? 'ਅਨ-ਲੌਕ ਕਰੋ' : 'ਸਰਕਾਰੀ ਪੋਰਟਲ ਫ੍ਰੀਜ਼/ਲੌਕ ਕਰੋ'}
                        >
                          {item.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lock Confirmation Reason Modal */}
      {lockingRecordId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-rose-600 mb-3">
              <Lock className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">
                ਆਈ-ਫਾਰਮ ਸਰਕਾਰੀ ਪੋਰਟਲ ਲਾਕ (Freeze Record)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              ਇਸ ਆਈ-ਫਾਰਮ ਨੂੰ ਲਾਕ ਕਰਨ ਤੋਂ ਬਾਅਦ CA ਆਡਿਟ ਤੇ ਸਰਕਾਰੀ ਪੋਰਟਲ ਦੇ ਰਿਕਾਰਡ ਵਾਂਗ ਕੋਈ ਵੀ ਗਲਤੀ ਜਾਂ ਬਦਲਾਅ ਰੋਕਿਆ ਜਾਵੇਗਾ।
            </p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ਲਾਕ ਕਰਨ ਦਾ ਕਾਰਨ ਜਾਂ ਹਵਾਲਾ (Reason / Reference):
              </label>
              <input
                type="text"
                value={lockReasonInput}
                onChange={(e) => setLockReasonInput(e.target.value)}
                className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500"
                placeholder="e.g. Uploaded to Punjab Mandi Board Anaaj Kharid Portal"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLockingRecordId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
              >
                ਰੱਦ ਕਰੋ
              </button>
              <button
                type="button"
                onClick={confirmLock}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow"
              >
                ਲੌਕ ਪੁਸ਼ਟੀ ਕਰੋ (Freeze I-Form)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Government Form 'I' Print & Details Modal */}
      {isPrintModalOpen && selectedIFormForModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-900" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Official Punjab Mandi Board Form 'I' (ਆਈ-ਫਾਰਮ)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>ਪ੍ਰਿੰਟ ਕਰੋ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintModalOpen(false);
                    setSelectedIFormForModal(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  ਬੰਦ ਕਰੋ
                </button>
              </div>
            </div>

            {/* Official Printable Form 'I' Layout */}
            <div className="p-4 sm:p-6 border-2 border-slate-800 rounded-xl bg-white text-slate-900 space-y-4">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  PUNJAB STATE AGRICULTURAL MARKETING BOARD
                </div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900">
                  FORM 'I' / ਫਾਰਮ ਆਈ
                </h2>
                <div className="text-xs font-bold text-slate-700">
                  [See Rule 24(1) of the Punjab Agricultural Produce Markets (General) Rules, 1962]
                </div>
                <div className="text-sm font-black text-blue-900 mt-1">
                  BILL OF ARHTIYA / COMMISSION AGENT TO PURCHASER / AGENCY
                </div>
              </div>

              {/* Firm & Bill Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    ਕਮਿਸ਼ਨ ਏਜੰਟ: {activeFirm?.name || settings.firmNameEn}
                  </div>
                  <div className="text-slate-600">{activeFirm?.namePa || settings.firmNamePa}</div>
                  <div className="text-slate-600">ਲਾਈਸੈਂਸ ਨੰਬਰ: {activeFirm?.licenceNo || settings.firmLicence}</div>
                  <div className="text-slate-600">ਮੰਡੀ: {settings.mandiNameEn} ({settings.marketCommitteeEn})</div>
                  <div className="text-slate-600">PAN: {activeFirm?.pan || settings.firmPan}</div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-blue-900">
                    I-Form No: {selectedIFormForModal.iFormNo}
                  </div>
                  <div className="text-slate-700">ਮਿਤੀ (Date): {selectedIFormForModal.date}</div>
                  <div className="font-bold text-slate-900 mt-1">
                    ਖਰੀਦਦਾਰ ਏਜੰਸੀ: {selectedIFormForModal.agency}
                  </div>
                  <div className="text-slate-600">ਵਿੱਤੀ ਸਾਲ: {selectedIFormForModal.fiscalYear}</div>
                  <div className="text-slate-600">ਫ਼ਸਲ: {selectedIFormForModal.cropType}</div>
                </div>
              </div>

              {/* Produce Details Table */}
              <table className="w-full text-xs border border-slate-700">
                <thead className="bg-slate-100 font-bold border-b border-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-700">ਵੇਰਵਾ (Particulars)</th>
                    <th className="p-2 text-right border-r border-slate-700">ਬੋਰੀਆਂ (Bags)</th>
                    <th className="p-2 text-right border-r border-slate-700">ਵਜ਼ਨ (ਕੁਇੰਟਲ)</th>
                    <th className="p-2 text-right border-r border-slate-700">MSP ਰੇਟ (₹/Qtl)</th>
                    <th className="p-2 text-right">ਕੁੱਲ ਮੁੱਲ (Amount ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-2 border-r border-slate-700 font-medium">
                      ਖਰੀਦੀ ਗਈ ਫ਼ਸਲ ({selectedIFormForModal.cropType})
                    </td>
                    <td className="p-2 text-right border-r border-slate-700 font-mono">
                      {selectedIFormForModal.totalBags}
                    </td>
                    <td className="p-2 text-right border-r border-slate-700 font-mono font-bold">
                      {selectedIFormForModal.totalWeightQtl}
                    </td>
                    <td className="p-2 text-right border-r border-slate-700 font-mono">
                      ₹{selectedIFormForModal.mspRatePerQtl}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      ₹{Math.round(selectedIFormForModal.cropGrossAmount).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Statutory Charges Breakdown */}
              <div className="border border-slate-700 p-3 rounded space-y-1.5 text-xs">
                <div className="font-bold text-slate-800 border-b border-slate-300 pb-1">
                  ਸਰਕਾਰੀ ਖਰਚੇ ਤੇ ਆੜ੍ਹਤ ਵੇਰਵਾ (Statutory Charges & Commission):
                </div>

                <div className="flex justify-between py-0.5">
                  <span>1. ਆੜ੍ਹਤੀਏ ਦੀ ਦਾਮਾਮੀ (Damami @ 2.50%):</span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(selectedIFormForModal.damamiAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-0.5 text-slate-700">
                  <span>
                    2. ਮੰਡੀ ਲੇਬਰ (ਉਤਰਾਈ, ਛਣਾਈ, ਤੁਲਾਈ, ਸਿਲਾਈ, ਲੋਡਿੰਗ):
                  </span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(selectedIFormForModal.labourCharges.totalLabourAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-0.5 text-slate-700">
                  <span>3. ਮਾਰਕੀਟ ਕਮੇਟੀ ਫੀਸ (Market Development Fee @ {selectedIFormForModal.mdfRatePercent}%):</span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(selectedIFormForModal.mdfAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-0.5 text-slate-700">
                  <span>4. ਪੇਂਡੂ ਵਿਕਾਸ ਫੰਡ (Rural Development Fund @ {selectedIFormForModal.rdfRatePercent}%):</span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(selectedIFormForModal.rdfAmount).toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-slate-400 pt-1.5 flex justify-between font-black text-sm text-slate-900">
                  <span>ਕੁੱਲ ਬਿੱਲ ਰਕਮ (Total Bill Amount):</span>
                  <span className="font-mono">
                    ₹{Math.round(selectedIFormForModal.totalBillAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-0.5 text-rose-700">
                  <span>ਘਟਾਓ: 2% TDS u/s 194H on Damami:</span>
                  <span className="font-mono font-bold">
                    - ₹{Math.round(selectedIFormForModal.tdsAmount).toLocaleString()}
                  </span>
                </div>

                <div className="border-t-2 border-slate-800 pt-1.5 flex justify-between font-black text-base text-blue-900">
                  <span>ਏਜੰਸੀ ਵੱਲੋਂ ਸ਼ੁੱਧ ਦੇਣਯੋਗ (Net Receivable):</span>
                  <span className="font-mono">
                    ₹{Math.round(selectedIFormForModal.netReceivableFromAgency).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div className="text-center">
                  <div className="border-t border-slate-500 pt-1 w-44">
                    ਖਰੀਦਦਾਰ ਏਜੰਸੀ ਇੰਸਪੈਕਟਰ ਦੇ ਦਸਤਖਤ
                  </div>
                  <div className="text-[10px] text-slate-500">Sign of Purchaser / Agency</div>
                </div>

                <div className="text-center">
                  <div className="border-t border-slate-500 pt-1 w-48 font-bold">
                    ਵਾਸਤੇ: {activeFirm?.name || settings.firmNameEn}
                  </div>
                  <div className="text-[10px] text-slate-500">Authorized Signatory / Arhtiya</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
