import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  Trash2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Building2,
  Receipt,
  FileText
} from 'lucide-react';
import { VoucherEntry, VoucherType } from '../../types/pakkaAccounting';
import { formatDateToDDMMYYYY, compareDatesChronological } from '../../utils/calculations';

export const VoucherEntryView: React.FC = () => {
  const {
    pakkaLedgers,
    pakkaVouchers,
    addPakkaVoucher,
    deletePakkaVoucher,
    activeFiscalYear
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    date: string;
    voucherType: VoucherType;
    debitLedgerId: string;
    creditLedgerId: string;
    amount: string;
    narration: string;
    narrationPa: string;
    chequeNo: string;
    chequeDate: string;
    tdsDeducted: string;
    tdsSection: '194H' | '194C' | '194A' | '194Q';
  }>({
    date: formatDateToDDMMYYYY(new Date()),
    voucherType: 'PAYMENT',
    debitLedgerId: '',
    creditLedgerId: '',
    amount: '',
    narration: '',
    narrationPa: '',
    chequeNo: '',
    chequeDate: '',
    tdsDeducted: '0',
    tdsSection: '194C'
  });

  const openAddModal = (type: VoucherType = 'PAYMENT') => {
    // Sensible defaults
    const cashLedger = pakkaLedgers.find((l) => l.group === 'CASH_IN_HAND');
    const bankLedger = pakkaLedgers.find((l) => l.group === 'BANK_ACCOUNTS');
    const expLedger = pakkaLedgers.find((l) => l.group === 'INDIRECT_EXPENSES');

    let dr = '';
    let cr = '';
    if (type === 'PAYMENT') {
      dr = expLedger?.id || pakkaLedgers[0]?.id || '';
      cr = cashLedger?.id || bankLedger?.id || '';
    } else if (type === 'RECEIPT') {
      dr = cashLedger?.id || bankLedger?.id || '';
      cr = pakkaLedgers.find((l) => l.group === 'SUNDRY_DEBTORS')?.id || '';
    } else if (type === 'CONTRA') {
      dr = cashLedger?.id || '';
      cr = bankLedger?.id || '';
    }

    setFormData({
      date: formatDateToDDMMYYYY(new Date()),
      voucherType: type,
      debitLedgerId: dr,
      creditLedgerId: cr,
      amount: '',
      narration: '',
      narrationPa: '',
      chequeNo: '',
      chequeDate: '',
      tdsDeducted: '0',
      tdsSection: '194C'
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਸਹੀ ਰਕਮ (Amount) ਦਰਜ ਕਰੋ!');
      return;
    }
    if (!formData.debitLedgerId || !formData.creditLedgerId) {
      alert('ਡੈਬਿਟ ਅਤੇ ਕ੍ਰੈਡਿਟ ਦੋਵੇਂ ਖਾਤੇ ਚੁਣਨੇ ਲਾਜ਼ਮੀ ਹਨ!');
      return;
    }
    if (formData.debitLedgerId === formData.creditLedgerId) {
      alert('ਡੈਬਿਟ ਅਤੇ ਕ੍ਰੈਡਿਟ ਖਾਤੇ ਵੱਖ-ਵੱਖ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ!');
      return;
    }

    const debitLedger = pakkaLedgers.find((l) => l.id === formData.debitLedgerId);
    const creditLedger = pakkaLedgers.find((l) => l.id === formData.creditLedgerId);

    addPakkaVoucher({
      date: formData.date,
      fiscalYear: activeFiscalYear,
      voucherType: formData.voucherType,
      debitLedgerId: formData.debitLedgerId,
      debitLedgerName: debitLedger?.name || 'Debit A/c',
      creditLedgerId: formData.creditLedgerId,
      creditLedgerName: creditLedger?.name || 'Credit A/c',
      amount: amt,
      narration: formData.narration || `${formData.voucherType} Entry`,
      narrationPa: formData.narrationPa,
      chequeNo: formData.chequeNo || undefined,
      chequeDate: formData.chequeDate || undefined,
      tdsDeducted: Number(formData.tdsDeducted) || undefined,
      tdsSection: Number(formData.tdsDeducted) > 0 ? formData.tdsSection : undefined
    });

    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, voucherNo: string) => {
    if (window.confirm(`ਕੀ ਤੁਸੀਂ ਵਾਊਚਰ ${voucherNo} ਡਿਲੀਟ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
      deletePakkaVoucher(id);
    }
  };

  // Filter vouchers
  const filteredVouchers = pakkaVouchers.filter((v) => {
    if (activeFiscalYear && v.fiscalYear !== activeFiscalYear) return false;
    if (selectedTypeFilter !== 'ALL' && v.voucherType !== selectedTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNo = v.voucherNo.toLowerCase().includes(q);
      const matchDr = v.debitLedgerName.toLowerCase().includes(q);
      const matchCr = v.creditLedgerName.toLowerCase().includes(q);
      const matchNarr = v.narration?.toLowerCase().includes(q) || (v.narrationPa && v.narrationPa.includes(q));
      if (!matchNo && !matchDr && !matchCr && !matchNarr) return false;
    }
    return true;
  }).sort((a, b) => compareDatesChronological(a.date, b.date, 'ASC'));

  const totalAmount = filteredVouchers.reduce((s, v) => s + (Number(v.amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-700/80 text-indigo-200 text-xs font-bold rounded-full border border-indigo-500/40">
              ਡਬਲ-ਐਂਟਰੀ ਵਾਊਚਰ • Double Entry Journal
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-amber-400" />
            ਵਾਊਚਰ ਐਂਟਰੀ (Payment, Receipt, Journal & Contra)
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1">
            ਪੈਸੇ ਆਏ/ਗਏ, ਬੈਂਕ ਤੋਂ ਕੈਸ਼, ਦੁਕਾਨ ਖਰਚੇ ਤੇ I-Form ਐਡਜਸਟਮੈਂਟ ਵਾਊਚਰ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => openAddModal('PAYMENT')}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            - ਭੁਗਤਾਨ (Payment)
          </button>
          <button
            type="button"
            onClick={() => openAddModal('RECEIPT')}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            + ਰਸੀਦ (Receipt)
          </button>
          <button
            type="button"
            onClick={() => openAddModal('CONTRA')}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            ਬੈਂਕ/ਕੈਸ਼ (Contra)
          </button>
          <button
            type="button"
            onClick={() => openAddModal('JOURNAL')}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            ਜਰਨਲ (Journal)
          </button>
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
              placeholder="ਵਾਊਚਰ ਨੰਬਰ, ਖਾਤਾ ਜਾਂ ਵੇਰਵਾ ਲੱਭੋ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
          >
            <option value="ALL">ਸਾਰੇ ਵਾਊਚਰ (All Types)</option>
            <option value="PAYMENT">ਭੁਗਤਾਨ (Payment)</option>
            <option value="RECEIPT">ਰਸੀਦ (Receipt)</option>
            <option value="JOURNAL">ਜਰਨਲ (Journal)</option>
            <option value="CONTRA">ਕੋਂਟਰਾ (Contra)</option>
            <option value="PURCHASE">ਖਰੀਦ (Purchase / I-Form)</option>
            <option value="SALES">ਵਿਕਰੀ (Sales)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          ਕੁੱਲ ਵਾਊਚਰ: <strong className="text-slate-800">{filteredVouchers.length}</strong> • ਕੁੱਲ ਰਕਮ: <strong className="text-indigo-900 font-bold">₹{Math.round(totalAmount).toLocaleString()}</strong>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">ਮਿਤੀ / Date</th>
                <th className="p-3">ਵਾਊਚਰ ਨੰਬਰ</th>
                <th className="p-3">ਕਿਸਮ (Type)</th>
                <th className="p-3">ਡੈਬਿਟ ਖਾਤਾ (Debit Dr)</th>
                <th className="p-3">ਕ੍ਰੈਡਿਟ ਖਾਤਾ (Credit Cr)</th>
                <th className="p-3 text-right">ਰਕਮ (Amount ₹)</th>
                <th className="p-3">ਵੇਰਵਾ (Narration)</th>
                <th className="p-3 text-center">ਐਕਸ਼ਨ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    ਕੋਈ ਵਾਊਚਰ ਨਹੀਂ ਮਿਲਿਆ। ਉੱਪਰਲੇ ਬਟਨਾਂ ਤੋਂ ਨਵਾਂ ਵਾਊਚਰ ਦਰਜ ਕਰੋ।
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v, idx) => (
                  <tr key={`${v.id}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{v.date}</td>
                    <td className="p-3 font-mono font-bold text-indigo-900 whitespace-nowrap">
                      {v.voucherNo}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.voucherType === 'PAYMENT'
                            ? 'bg-rose-100 text-rose-800'
                            : v.voucherType === 'RECEIPT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : v.voucherType === 'CONTRA'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-blue-900 whitespace-nowrap">
                      {v.debitLedgerName}
                      <span className="ml-1 text-[10px] text-blue-600 font-mono">(Dr)</span>
                    </td>
                    <td className="p-3 font-bold text-purple-900 whitespace-nowrap">
                      {v.creditLedgerName}
                      <span className="ml-1 text-[10px] text-purple-600 font-mono">(Cr)</span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">
                      ₹{Math.round(v.amount).toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">
                      {v.narrationPa || v.narration}
                      {v.tdsDeducted ? (
                        <span className="block text-[10px] text-rose-600 font-mono">
                          TDS u/s {v.tdsSection}: ₹{v.tdsDeducted}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(v.id, v.voucherNo)}
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

      {/* Add Voucher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-700" />
                <span>ਨਵਾਂ {formData.voucherType} ਵਾਊਚਰ ਦਰਜ ਕਰੋ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਮਿਤੀ (Date) *</label>
                  <input
                    type="text"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਵਾਊਚਰ ਕਿਸਮ (Type) *</label>
                  <select
                    value={formData.voucherType}
                    onChange={(e) => setFormData({ ...formData, voucherType: e.target.value as VoucherType })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800"
                  >
                    <option value="PAYMENT">PAYMENT (ਭੁਗਤਾਨ - ਪੈਸੇ ਦਿੱਤੇ)</option>
                    <option value="RECEIPT">RECEIPT (ਰਸੀਦ - ਪੈਸੇ ਆਏ)</option>
                    <option value="CONTRA">CONTRA (ਬੈਂਕ ⬌ ਕੈਸ਼)</option>
                    <option value="JOURNAL">JOURNAL (ਜਰਨਲ ਐਡਜਸਟਮੈਂਟ)</option>
                    <option value="PURCHASE">PURCHASE (ਖਰੀਦ)</option>
                    <option value="SALES">SALES (ਵਿਕਰੀ)</option>
                  </select>
                </div>
              </div>

              {/* Debit & Credit Accounts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-200">
                  <label className="block text-blue-900 font-bold mb-1">
                    ਡੈਬਿਟ ਖਾਤਾ (Debit Dr) *
                  </label>
                  <select
                    required
                    value={formData.debitLedgerId}
                    onChange={(e) => setFormData({ ...formData, debitLedgerId: e.target.value })}
                    className="w-full p-1.5 bg-white border border-blue-300 rounded font-bold text-slate-800"
                  >
                    <option value="">-- ਖਾਤਾ ਚੁਣੋ --</option>
                    {pakkaLedgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.group})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-purple-50/50 p-2.5 rounded-lg border border-purple-200">
                  <label className="block text-purple-900 font-bold mb-1">
                    ਕ੍ਰੈਡਿਟ ਖਾਤਾ (Credit Cr) *
                  </label>
                  <select
                    required
                    value={formData.creditLedgerId}
                    onChange={(e) => setFormData({ ...formData, creditLedgerId: e.target.value })}
                    className="w-full p-1.5 bg-white border border-purple-300 rounded font-bold text-slate-800"
                  >
                    <option value="">-- ਖਾਤਾ ਚੁਣੋ --</option>
                    {pakkaLedgers.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.group})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ਕੁੱਲ ਰਕਮ (Amount ₹) *</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-black font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Narration */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ਵੇਰਵਾ (Narration):</label>
                <input
                  type="text"
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  placeholder="e.g. Paid office tea and munim electricity exp"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Cheque / Bank Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਚੈੱਕ / UTR ਨੰਬਰ</label>
                  <input
                    type="text"
                    value={formData.chequeNo}
                    onChange={(e) => setFormData({ ...formData, chequeNo: e.target.value })}
                    placeholder="e.g. 492019"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਚੈੱਕ ਮਿਤੀ (Cheque Date)</label>
                  <input
                    type="text"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
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
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-bold shadow-md"
                >
                  ਵਾਊਚਰ ਸੇਵ ਕਰੋ (Post Voucher)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
