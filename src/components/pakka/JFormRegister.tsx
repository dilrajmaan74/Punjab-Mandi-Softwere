import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  FileCheck,
  Lock,
  Unlock,
  Printer,
  Search,
  User,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { JFormRecord } from '../../types/pakkaAccounting';
import { compareDatesChronological } from '../../utils/calculations';

export const JFormRegister: React.FC = () => {
  const {
    jFormRecords,
    toggleLockJForm,
    activeFiscalYear,
    language,
    settings,
    activeFirm
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJFormForModal, setSelectedJFormForModal] = useState<JFormRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'GENERATED'>('ALL');

  const filteredRecords = jFormRecords.filter((rec) => {
    if (activeFiscalYear && rec.fiscalYear !== activeFiscalYear) return false;
    if (statusFilter === 'LOCKED' && !rec.isLocked) return false;
    if (statusFilter === 'GENERATED' && rec.isLocked) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNo = rec.jFormNo.toLowerCase().includes(q);
      const matchFarmer = rec.farmerName.toLowerCase().includes(q) || (rec.farmerNamePa && rec.farmerNamePa.includes(q));
      const matchVillage = rec.village.toLowerCase().includes(q) || (rec.villagePa && rec.villagePa.includes(q));
      const matchIForm = rec.iFormNo.toLowerCase().includes(q);
      if (!matchNo && !matchFarmer && !matchVillage && !matchIForm) return false;
    }
    return true;
  }).sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'));

  const totalBags = filteredRecords.reduce((sum, r) => sum + r.bags, 0);
  const totalWeight = filteredRecords.reduce((sum, r) => sum + r.weightQtl, 0);
  const totalGross = filteredRecords.reduce((sum, r) => sum + r.grossAmount, 0);
  const totalLabour = filteredRecords.reduce((sum, r) => sum + r.labourDeductions, 0);
  const totalNetPayable = filteredRecords.reduce((sum, r) => sum + r.netPayableToFarmer, 0);
  const lockedCount = filteredRecords.filter((r) => r.isLocked).length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-700/80 text-emerald-200 text-xs font-bold rounded-full border border-emerald-500/40">
              ਪੱਕਾ ਸਰਕਾਰੀ ਰਿਕਾਰਡ • Form 'J' Register
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-400" />
            ਸਰਕਾਰੀ ਜੇ-ਫਾਰਮ ਰਜਿਸਟਰ (Farmer Sale Certificates)
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1">
            ਕਿਸਾਨਾਂ ਦੇ ਅਧਿਕਾਰਤ ਵਿਕਰੀ ਸਰਟੀਫਿਕੇਟ (MSP ਰੇਟ, ਬੋਰੀਆਂ, ਲੇਬਰ ਕਟੌਤੀ ਤੇ ਖਾਤਾ ਭੁਗਤਾਨ)
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਕੁੱਲ ਜੇ-ਫਾਰਮ (Total J-Forms)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            {filteredRecords.length}{' '}
            <span className="text-xs font-normal text-slate-500">ਕਿਸਾਨ</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>{lockedCount} ਸਰਕਾਰੀ ਪੋਰਟਲ ਲਾਕ</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਕੁੱਲ ਬੋਰੀਆਂ ਤੇ ਵਜ਼ਨ</div>
          <div className="text-lg sm:text-xl font-black text-emerald-800 mt-0.5">
            {totalBags.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">ਬੋਰੀਆਂ</span>
          </div>
          <div className="text-[10px] text-slate-600 font-mono mt-1">
            {totalWeight.toLocaleString()} ਕੁਇੰਟਲ
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500">ਕੁੱਲ ਫ਼ਸਲ ਮੁੱਲ (Gross)</div>
          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
            ₹{Math.round(totalGross).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">MSP ਰੇਟ ਅਨੁਸਾਰ</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-800">ਕੁੱਲ ਲੇਬਰ ਕਟੌਤੀ (Labour)</div>
          <div className="text-lg sm:text-xl font-black text-rose-700 mt-0.5">
            ₹{Math.round(totalLabour).toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-600 font-semibold mt-1">ਕਿਸਾਨ ਖਾਤੇ 'ਚੋਂ ਕਟੌਤੀ</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-emerald-900">ਸ਼ੁੱਧ ਭੁਗਤਾਨ (Net Payable)</div>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
            ₹{Math.round(totalNetPayable).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ</div>
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
              placeholder="ਕਿਸਾਨ ਦਾ ਨਾਂ, ਪਿੰਡ, ਜਾਂ J-Form ਨੰਬਰ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">ਸਾਰੇ ਸਟੇਟਸ (All Status)</option>
            <option value="LOCKED">🔒 ਲੌਕ / ਫ੍ਰੀਜ਼ (Portal Locked)</option>
            <option value="GENERATED">📝 ਖੁੱਲ੍ਹਾ (Open)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          ਕੁੱਲ ਕਿਸਾਨ: <strong className="text-slate-800">{filteredRecords.length}</strong>
        </div>
      </div>

      {/* J-Forms Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">ਮਿਤੀ / Date</th>
                <th className="p-3">J-Form ਨੰਬਰ</th>
                <th className="p-3">ਕਿਸਾਨ ਦਾ ਨਾਮ (Farmer)</th>
                <th className="p-3">ਪਿੰਡ (Village)</th>
                <th className="p-3">ਲਿੰਕਡ I-Form</th>
                <th className="p-3 text-right">ਬੋਰੀਆਂ</th>
                <th className="p-3 text-right">ਕੁਇੰਟਲ</th>
                <th className="p-3 text-right">ਰੇਟ (₹)</th>
                <th className="p-3 text-right">ਕੁੱਲ ਮੁੱਲ (₹)</th>
                <th className="p-3 text-right text-rose-400">ਲੇਬਰ (₹)</th>
                <th className="p-3 text-right text-emerald-400">ਸ਼ੁੱਧ ਰਕਮ (Net ₹)</th>
                <th className="p-3 text-center">ਸਟੇਟਸ</th>
                <th className="p-3 text-center">ਐਕਸ਼ਨ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-slate-400">
                    <FileCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    ਕੋਈ ਜੇ-ਫਾਰਮ ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। "ਕੱਚੀ ਖਰੀਦ ਤੋਂ I-Form ਬਣਾਓ" ਰਾਹੀਂ ਟਰਾਂਸਫਰ ਕਰੋ।
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-emerald-50/40 transition">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{item.date}</td>
                    <td className="p-3 font-mono font-bold text-emerald-900 whitespace-nowrap">
                      {item.jFormNo}
                    </td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {item.farmerName} {item.farmerNamePa ? `(${item.farmerNamePa})` : ''}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {item.village} {item.villagePa ? `(${item.villagePa})` : ''}
                    </td>
                    <td className="p-3 font-mono text-blue-800 text-[11px] whitespace-nowrap">
                      {item.iFormNo}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-700">{item.bags}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{item.weightQtl}</td>
                    <td className="p-3 text-right font-mono text-slate-700">₹{item.ratePerQtl}</td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      ₹{Math.round(item.grossAmount).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-rose-700">
                      ₹{Math.round(item.labourDeductions).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700">
                      ₹{Math.round(item.netPayableToFarmer).toLocaleString()}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {item.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold rounded-full">
                          <Lock className="w-3 h-3" />
                          <span>ਸਰਕਾਰੀ ਲਾਕ</span>
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
                            setSelectedJFormForModal(item);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          title="ਵੇਰਵਾ ਤੇ ਸਰਕਾਰੀ ਜੇ-ਫਾਰਮ ਪ੍ਰਿੰਟ ਕਰੋ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLockJForm(item.id)}
                          className={`p-1.5 rounded-lg transition ${
                            item.isLocked ? 'text-rose-700 hover:bg-rose-100' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                          title={item.isLocked ? 'ਅਨ-ਲੌਕ ਕਰੋ' : 'ਸਰਕਾਰੀ ਪੋਰਟਲ ਲਾਕ ਕਰੋ'}
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

      {/* Official Government Form 'J' Print Certificate Modal */}
      {isPrintModalOpen && selectedJFormForModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-800" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Official Punjab Mandi Board Form 'J' (ਜੇ-ਫਾਰਮ)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>ਪ੍ਰਿੰਟ ਕਰੋ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintModalOpen(false);
                    setSelectedJFormForModal(null);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  ਬੰਦ ਕਰੋ
                </button>
              </div>
            </div>

            {/* Official Punjab Mandi Board J-Form Certificate */}
            <div className="p-4 sm:p-6 border-2 border-emerald-900 rounded-xl bg-white text-slate-900 space-y-4">
              {/* Header */}
              <div className="text-center border-b-2 border-emerald-900 pb-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">
                  PUNJAB STATE AGRICULTURAL MARKETING BOARD
                </div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-emerald-950">
                  FORM 'J' / ਫਾਰਮ ਜੇ
                </h2>
                <div className="text-xs font-bold text-slate-700">
                  [See Rule 24(2) of the Punjab Agricultural Produce Markets (General) Rules, 1962]
                </div>
                <div className="text-sm font-black text-emerald-800 mt-1">
                  SALE VOUCHER FOR THE SELLER / FARMER (ਕਿਸਾਨ ਵਿਕਰੀ ਸਰਟੀਫਿਕੇਟ)
                </div>
              </div>

              {/* Certificate Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    ਕਮਿਸ਼ਨ ਏਜੰਟ: {activeFirm?.name || settings.firmNameEn}
                  </div>
                  <div className="text-slate-600">{activeFirm?.namePa || settings.firmNamePa}</div>
                  <div className="text-slate-600">ਲਾਈਸੈਂਸ: {activeFirm?.licenceNo || settings.firmLicence}</div>
                  <div className="text-slate-600">ਮੰਡੀ: {settings.mandiNameEn}</div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-900 text-sm">
                    J-Form No: {selectedJFormForModal.jFormNo}
                  </div>
                  <div className="text-slate-700">ਮਿਤੀ (Date): {selectedJFormForModal.date}</div>
                  <div className="font-mono text-slate-600">I-Form Ref: {selectedJFormForModal.iFormNo}</div>
                  <div className="text-slate-600">ਵਿੱਤੀ ਸਾਲ: {selectedJFormForModal.fiscalYear}</div>
                </div>
              </div>

              {/* Farmer Info Box */}
              <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-xs grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">ਕਿਸਾਨ ਦਾ ਨਾਮ:</span>{' '}
                  <strong className="text-slate-900">{selectedJFormForModal.farmerName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">ਪਿਤਾ ਦਾ ਨਾਮ:</span>{' '}
                  <span className="text-slate-900">{selectedJFormForModal.fatherName || '---'}</span>
                </div>
                <div>
                  <span className="text-slate-500">ਪਿੰਡ:</span>{' '}
                  <span className="text-slate-900">{selectedJFormForModal.village}</span>
                </div>
                <div>
                  <span className="text-slate-500">ਮੋਬਾਈਲ:</span>{' '}
                  <span className="text-slate-900 font-mono">{selectedJFormForModal.mobile || '---'}</span>
                </div>
                <div>
                  <span className="text-slate-500">ਆਧਾਰ ਨੰਬਰ:</span>{' '}
                  <span className="text-slate-900 font-mono">{selectedJFormForModal.aadhaar || '---'}</span>
                </div>
                <div>
                  <span className="text-slate-500">ਫ਼ਸਲ:</span>{' '}
                  <span className="text-emerald-900 font-bold">{selectedJFormForModal.cropType}</span>
                </div>
              </div>

              {/* Produce & Calculations Table */}
              <table className="w-full text-xs border border-slate-700">
                <thead className="bg-slate-100 font-bold border-b border-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-700">ਵੇਰਵਾ</th>
                    <th className="p-2 text-right border-r border-slate-700">ਬੋਰੀਆਂ</th>
                    <th className="p-2 text-right border-r border-slate-700">ਕੁਇੰਟਲ</th>
                    <th className="p-2 text-right border-r border-slate-700">MSP ਰੇਟ (₹)</th>
                    <th className="p-2 text-right">ਕੁੱਲ ਰਕਮ (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-2 border-r border-slate-700 font-medium">
                      ਫ਼ਸਲ ਵਿਕਰੀ ({selectedJFormForModal.cropType})
                    </td>
                    <td className="p-2 text-right border-r border-slate-700 font-mono">
                      {selectedJFormForModal.bags}
                    </td>
                    <td className="p-2 text-right border-r border-slate-700 font-mono font-bold">
                      {selectedJFormForModal.weightQtl}
                    </td>
                    <td className="p-2 text-right border-r border-slate-700 font-mono">
                      ₹{selectedJFormForModal.ratePerQtl}
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      ₹{Math.round(selectedJFormForModal.grossAmount).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Deductions & Net */}
              <div className="border border-slate-700 p-3 rounded space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 text-slate-800">
                  <span>ਕੁੱਲ ਫ਼ਸਲ ਮੁੱਲ (Gross Sale Value):</span>
                  <span className="font-mono font-bold">
                    ₹{Math.round(selectedJFormForModal.grossAmount).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-0.5 text-rose-700">
                  <span>ਘਟਾਓ: ਮੰਡੀ ਲੇਬਰ / ਪੱਲੇਦਾਰੀ ਕਟੌਤੀ:</span>
                  <span className="font-mono font-bold">
                    - ₹{Math.round(selectedJFormForModal.labourDeductions).toLocaleString()}
                  </span>
                </div>

                <div className="border-t-2 border-emerald-900 pt-1.5 flex justify-between font-black text-base text-emerald-950">
                  <span>ਕਿਸਾਨ ਨੂੰ ਸ਼ੁੱਧ ਭੁਗਤਾਨ (Net Payable to Farmer):</span>
                  <span className="font-mono text-emerald-800">
                    ₹{Math.round(selectedJFormForModal.netPayableToFarmer).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div className="text-center">
                  <div className="border-t border-slate-500 pt-1 w-44">ਕਿਸਾਨ ਦੇ ਦਸਤਖਤ / ਅੰਗੂਠਾ</div>
                  <div className="text-[10px] text-slate-500">Signature / Thumb Impression of Seller</div>
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
