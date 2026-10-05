import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  Download,
  Trash2
} from 'lucide-react';
import { TDSRecord } from '../../types/pakkaAccounting';
import { formatDateToDDMMYYYY, compareDatesChronological } from '../../utils/calculations';

export const TDSRegisterView: React.FC = () => {
  const {
    tdsRecords,
    addTDSRecord,
    updateTDSRecord,
    deleteTDSRecord,
    activeFiscalYear
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [selectedQuarterFilter, setSelectedQuarterFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    date: string;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    section: '194H' | '194C' | '194A' | '194Q';
    type: 'RECEIVABLE' | 'PAYABLE';
    partyName: string;
    partyPan: string;
    grossAmount: string;
    tdsRatePercent: string;
    tdsAmount: string;
    challanNo: string;
    challanDate: string;
    status: 'PENDING' | 'DEPOSITED' | 'CLAIMED';
  }>({
    date: formatDateToDDMMYYYY(new Date()),
    quarter: 'Q3',
    section: '194H',
    type: 'RECEIVABLE',
    partyName: '',
    partyPan: '',
    grossAmount: '',
    tdsRatePercent: '2.0',
    tdsAmount: '',
    challanNo: '',
    challanDate: '',
    status: 'PENDING'
  });

  const handleGrossOrRateChange = (gross: string, rate: string) => {
    const g = parseFloat(gross) || 0;
    const r = parseFloat(rate) || 0;
    const amt = Math.round(((g * r) / 100) * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      grossAmount: gross,
      tdsRatePercent: rate,
      tdsAmount: amt > 0 ? String(amt) : ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyName.trim() || !Number(formData.tdsAmount)) {
      alert('ਪਾਰਟੀ ਦਾ ਨਾਮ ਅਤੇ ਸਹੀ TDS ਰਕਮ ਭਰਨੀ ਲਾਜ਼ਮੀ ਹੈ!');
      return;
    }

    addTDSRecord({
      date: formData.date,
      fiscalYear: activeFiscalYear,
      quarter: formData.quarter,
      section: formData.section,
      type: formData.type,
      partyName: formData.partyName.trim(),
      partyPan: formData.partyPan.trim().toUpperCase() || undefined,
      grossAmount: Number(formData.grossAmount) || 0,
      tdsRatePercent: Number(formData.tdsRatePercent) || 0,
      tdsAmount: Number(formData.tdsAmount) || 0,
      challanNo: formData.challanNo.trim() || undefined,
      challanDate: formData.challanDate.trim() || undefined,
      status: formData.status
    });

    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`ਕੀ ਤੁਸੀਂ ਇਹ TDS ਰਿਕਾਰਡ (${name}) ਡਿਲੀਟ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
      deleteTDSRecord(id);
    }
  };

  // Filter TDS Records
  const filteredRecords = tdsRecords.filter((rec) => {
    if (activeFiscalYear && rec.fiscalYear !== activeFiscalYear) return false;
    if (selectedSectionFilter !== 'ALL' && rec.section !== selectedSectionFilter) return false;
    if (selectedQuarterFilter !== 'ALL' && rec.quarter !== selectedQuarterFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchParty = (rec.partyName || '').toLowerCase().includes(q);
      const matchPan = rec.partyPan && rec.partyPan.toLowerCase().includes(q);
      const matchChallan = rec.challanNo && rec.challanNo.toLowerCase().includes(q);
      if (!matchParty && !matchPan && !matchChallan) return false;
    }
    return true;
  }).sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'));

  const totalReceivable = filteredRecords
    .filter((r) => r.type === 'RECEIVABLE')
    .reduce((s, r) => s + (Number(r.tdsAmount) || 0), 0);

  const totalPayable = filteredRecords
    .filter((r) => r.type === 'PAYABLE')
    .reduce((s, r) => s + (Number(r.tdsAmount) || 0), 0);

  const totalDeposited = filteredRecords
    .filter((r) => r.status === 'DEPOSITED')
    .reduce((s, r) => s + (Number(r.tdsAmount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-rose-700/80 text-rose-200 text-xs font-bold rounded-full border border-rose-500/40">
              ਇਨਕਮ ਟੈਕਸ ਰਜਿਸਟਰ • TDS Register
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-amber-400" />
            ਸਰਕਾਰੀ ਟੀ.ਡੀ.ਐੱਸ. ਰਜਿਸਟਰ (Section 194H, 194C, 194Q)
          </h2>
          <p className="text-xs sm:text-sm text-rose-200 mt-1">
            2.5% ਦਾਮਾਮੀ 'ਤੇ ਏਜੰਸੀਆਂ ਵੱਲੋਂ ਕੱਟਿਆ TDS (194H) ਤੇ ਲੇਬਰ/ਟਰਾਂਸਪੋਰਟ 'ਤੇ ਕੱਟਿਆ TDS (194C)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>ਨਵਾਂ TDS ਰਿਕਾਰਡ ਦਰਜ ਕਰੋ</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <div className="text-xs font-bold text-blue-900">
            ਸਾਡਾ ਕੱਟਿਆ TDS (TDS Receivable - Asset)
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-800 mt-1">
            ₹{Math.round(totalReceivable).toLocaleString()}
          </div>
          <div className="text-[10px] text-blue-700 font-semibold mt-1">
            Sec 194H (2% on Damami Commission) - ਰਿਫੰਡ ਲੈਣਯੋਗ
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-2xs">
          <div className="text-xs font-bold text-rose-900">
            ਅਸੀਂ ਕੱਟਿਆ TDS (TDS Payable - Liability)
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-800 mt-1">
            ₹{Math.round(totalPayable).toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-700 font-semibold mt-1">
            Sec 194C (Labour/Transport Contractors)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="text-xs font-bold text-emerald-900">
            ਸਰਕਾਰ ਕੋਲ ਜਮ੍ਹਾਂ ਕਰਵਾਇਆ (Challan Deposited)
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
            ₹{Math.round(totalDeposited).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-1">
            Form 26Q ਫਾਈਲਿੰਗ ਲਈ ਤਿਆਰ
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ਪਾਰਟੀ ਨਾਮ, PAN ਜਾਂ ਚਲਾਨ ਨੰਬਰ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <select
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
          >
            <option value="ALL">ਸਾਰੇ ਸੈਕਸ਼ਨ (All Sections)</option>
            <option value="194H">Sec 194H (ਆੜ੍ਹਤ ਕਮਿਸ਼ਨ 2%)</option>
            <option value="194C">Sec 194C (ਮੰਡੀ ਲੇਬਰ ਤੇ ਟਰੱਕ 1%/2%)</option>
            <option value="194Q">Sec 194Q (ਖਰੀਦ 'ਤੇ 0.1%)</option>
            <option value="194A">Sec 194A (ਵਿਆਜ ਕਟੌਤੀ)</option>
          </select>

          <select
            value={selectedQuarterFilter}
            onChange={(e) => setSelectedQuarterFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
          >
            <option value="ALL">ਸਾਰੇ ਤਿਮਾਹੀ (All Quarters)</option>
            <option value="Q1">Q1 (ਅਪ੍ਰੈਲ - ਜੂਨ / ਕਣਕ ਸੀਜ਼ਨ)</option>
            <option value="Q2">Q2 (ਜੁਲਾਈ - ਸਤੰਬਰ)</option>
            <option value="Q3">Q3 (ਅਕਤੂਬਰ - ਦਸੰਬਰ / ਝੋਨਾ ਸੀਜ਼ਨ)</option>
            <option value="Q4">Q4 (ਜਨਵਰੀ - ਮਾਰਚ)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          ਕੁੱਲ ਰਿਕਾਰਡ: <strong className="text-slate-800">{filteredRecords.length}</strong>
        </div>
      </div>

      {/* TDS Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">ਮਿਤੀ / Date</th>
                <th className="p-3">ਸੈਕਸ਼ਨ (Section)</th>
                <th className="p-3">ਕਿਸਮ (Type)</th>
                <th className="p-3">ਪਾਰਟੀ ਦਾ ਨਾਮ (Party / Agency)</th>
                <th className="p-3">PAN ਨੰਬਰ</th>
                <th className="p-3 text-right">ਕੁੱਲ ਰਕਮ (Gross ₹)</th>
                <th className="p-3 text-center">ਦਰ %</th>
                <th className="p-3 text-right text-amber-400">ਕੱਟਿਆ TDS (₹)</th>
                <th className="p-3">ਚਲਾਨ ਨੰਬਰ / ਮਿਤੀ</th>
                <th className="p-3 text-center">ਸਟੇਟਸ</th>
                <th className="p-3 text-center">ਐਕਸ਼ਨ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    ਕੋਈ TDS ਰਿਕਾਰਡ ਨਹੀਂ ਮਿਲਿਆ। "ਨਵਾਂ TDS ਰਿਕਾਰਡ ਦਰਜ ਕਰੋ" ਜਾਂ I-Form ਟਰਾਂਸਫਰ ਕਰੋ।
                  </td>
                </tr>
              ) : (
                filteredRecords.map((t, idx) => (
                  <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{t.date}</td>
                    <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                      {t.section}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.type === 'RECEIVABLE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.type === 'RECEIVABLE' ? 'ਲੈਣਯੋਗ (Receivable)' : 'ਦੇਣਯੋਗ (Payable)'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{t.partyName}</td>
                    <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                      {t.partyPan || '---'}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      ₹{Math.round(t.grossAmount).toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {t.tdsRatePercent}%
                    </td>
                    <td className="p-3 text-right font-mono font-black text-rose-700">
                      ₹{Math.round(t.tdsAmount).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {t.challanNo ? (
                        <div>
                          <div>{t.challanNo}</div>
                          {t.challanDate && <div className="text-[10px] text-slate-400">{t.challanDate}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-300">Pending Challan</span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'DEPOSITED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'CLAIMED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.partyName)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="ਡਿਲੀਟ ਕਰੋ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add TDS Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-rose-700" />
                <span>ਨਵਾਂ TDS ਰਿਕਾਰਡ ਸ਼ਾਮਲ ਕਰੋ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਮਿਤੀ (Date) *</label>
                  <input
                    type="text"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਤਿਮਾਹੀ (Quarter)</label>
                  <select
                    value={formData.quarter}
                    onChange={(e) => setFormData({ ...formData, quarter: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Q1">Q1 (Apr - Jun)</option>
                    <option value="Q2">Q2 (Jul - Sep)</option>
                    <option value="Q3">Q3 (Oct - Dec)</option>
                    <option value="Q4">Q4 (Jan - Mar)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">TDS ਸੈਕਸ਼ਨ *</label>
                  <select
                    value={formData.section}
                    onChange={(e) => {
                      const sec = e.target.value as any;
                      const defaultRate = sec === '194H' ? '2.0' : sec === '194C' ? '1.0' : sec === '194Q' ? '0.1' : '10.0';
                      setFormData({
                        ...formData,
                        section: sec,
                        type: sec === '194H' ? 'RECEIVABLE' : 'PAYABLE',
                        tdsRatePercent: defaultRate
                      });
                      handleGrossOrRateChange(formData.grossAmount, defaultRate);
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="194H">Sec 194H (ਆੜ੍ਹਤ ਕਮਿਸ਼ਨ 2%)</option>
                    <option value="194C">Sec 194C (ਮੰਡੀ ਲੇਬਰ/ਠੇਕੇਦਾਰ 1%/2%)</option>
                    <option value="194Q">Sec 194Q (ਖਰੀਦ 'ਤੇ 0.1%)</option>
                    <option value="194A">Sec 194A (ਵਿਆਜ 10%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਕਿਸਮ (Type)</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="RECEIVABLE">ਲੈਣਯੋਗ (Receivable - Agency deducted)</option>
                    <option value="PAYABLE">ਦੇਣਯੋਗ (Payable - We deducted)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਪਾਰਟੀ / ਏਜੰਸੀ ਦਾ ਨਾਮ *</label>
                  <input
                    type="text"
                    required
                    value={formData.partyName}
                    onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                    placeholder="e.g. Pungrain / Kalu Mate"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">PAN ਨੰਬਰ</label>
                  <input
                    type="text"
                    value={formData.partyPan}
                    onChange={(e) => setFormData({ ...formData, partyPan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਕੁੱਲ ਰਕਮ (Gross ₹)</label>
                  <input
                    type="number"
                    value={formData.grossAmount}
                    onChange={(e) => handleGrossOrRateChange(e.target.value, formData.tdsRatePercent)}
                    placeholder="0.00"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਦਰ % (Rate)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tdsRatePercent}
                    onChange={(e) => handleGrossOrRateChange(formData.grossAmount, e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">TDS ਰਕਮ (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.tdsAmount}
                    onChange={(e) => setFormData({ ...formData, tdsAmount: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਚਲਾਨ / BSR ਕੋਡ</label>
                  <input
                    type="text"
                    value={formData.challanNo}
                    onChange={(e) => setFormData({ ...formData, challanNo: e.target.value })}
                    placeholder="e.g. 0510304/00192"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਚਲਾਨ ਮਿਤੀ</label>
                  <input
                    type="text"
                    value={formData.challanDate}
                    onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-bold shadow-md"
                >
                  TDS ਰਿਕਾਰਡ ਸੇਵ ਕਰੋ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
