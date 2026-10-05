import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import {
  Users,
  Plus,
  Search,
  Filter,
  Building,
  DollarSign,
  TrendingUp,
  Tag,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Landmark,
  Scale
} from 'lucide-react';
import { AccountGroup, ACCOUNT_GROUPS, LedgerAccount } from '../../types/pakkaAccounting';
import { calculateLedgerBalance } from '../../utils/pakkaCalculations';

export const LedgerMasterView: React.FC = () => {
  const {
    pakkaLedgers,
    pakkaVouchers,
    addPakkaLedger,
    updatePakkaLedger,
    deletePakkaLedger,
    activeFiscalYear,
    language
  } = useMandi();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<LedgerAccount | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    namePa: string;
    group: AccountGroup;
    openingBalance: string;
    openingBalanceType: 'DR' | 'CR';
    pan: string;
    gstin: string;
    mobile: string;
    address: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  }>({
    name: '',
    namePa: '',
    group: 'SUNDRY_DEBTORS',
    openingBalance: '0',
    openingBalanceType: 'DR',
    pan: '',
    gstin: '',
    mobile: '',
    address: '',
    bankName: '',
    accountNumber: '',
    ifscCode: ''
  });

  const openAddModal = () => {
    setEditingLedger(null);
    setFormData({
      name: '',
      namePa: '',
      group: 'SUNDRY_DEBTORS',
      openingBalance: '0',
      openingBalanceType: 'DR',
      pan: '',
      gstin: '',
      mobile: '',
      address: '',
      bankName: '',
      accountNumber: '',
      ifscCode: ''
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (ledger: LedgerAccount) => {
    setEditingLedger(ledger);
    setFormData({
      name: ledger.name,
      namePa: ledger.namePa || '',
      group: ledger.group,
      openingBalance: String(ledger.openingBalance || 0),
      openingBalanceType: ledger.openingBalanceType,
      pan: ledger.pan || '',
      gstin: ledger.gstin || '',
      mobile: ledger.mobile || '',
      address: ledger.address || '',
      bankName: ledger.bankName || '',
      accountNumber: ledger.accountNumber || '',
      ifscCode: ledger.ifscCode || ''
    });
    setIsAddModalOpen(true);
  };

  const handleGroupSelect = (group: AccountGroup) => {
    const meta = ACCOUNT_GROUPS.find((g) => g.key === group);
    setFormData((prev) => ({
      ...prev,
      group,
      openingBalanceType: meta ? meta.normalBalance : 'DR'
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਖਾਤੇ ਦਾ ਨਾਮ ਭਰੋ!');
      return;
    }

    if (editingLedger) {
      updatePakkaLedger(editingLedger.id, {
        name: formData.name.trim(),
        namePa: formData.namePa.trim() || undefined,
        group: formData.group,
        openingBalance: Number(formData.openingBalance) || 0,
        openingBalanceType: formData.openingBalanceType,
        pan: formData.pan.trim() || undefined,
        gstin: formData.gstin.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        address: formData.address.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
        ifscCode: formData.ifscCode.trim() || undefined
      });
    } else {
      addPakkaLedger({
        name: formData.name.trim(),
        namePa: formData.namePa.trim() || undefined,
        group: formData.group,
        openingBalance: Number(formData.openingBalance) || 0,
        openingBalanceType: formData.openingBalanceType,
        fiscalYear: activeFiscalYear,
        pan: formData.pan.trim() || undefined,
        gstin: formData.gstin.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        address: formData.address.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
        ifscCode: formData.ifscCode.trim() || undefined
      });
    }

    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`ਕੀ ਤੁਸੀਂ ਖਾਤਾ "${name}" ਡਿਲੀਟ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
      deletePakkaLedger(id);
    }
  };

  // Filter ledgers
  const filteredLedgers = pakkaLedgers.filter((l) => {
    if (selectedGroupFilter !== 'ALL' && l.group !== selectedGroupFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (l.name || '').toLowerCase().includes(q);
      const matchNamePa = l.namePa && l.namePa.includes(q);
      const matchPan = l.pan && l.pan.toLowerCase().includes(q);
      if (!matchName && !matchNamePa && !matchPan) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-700/80 text-indigo-200 text-xs font-bold rounded-full border border-indigo-500/40">
              ਚਾਰਟ ਆਫ ਅਕਾਊਂਟਸ • Chart of Accounts
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              ਵਿੱਤੀ ਸਾਲ: {activeFiscalYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-400" />
            ਪੱਕਾ ਲੈੱਜਰ ਮਾਸਟਰ ਤੇ ਗਰੁੱਪ (Ledger Master)
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1">
            ਡੈਬਿਟ/ਕ੍ਰੈਡਿਟ ਖਾਤੇ ਬਣਾਓ, ਗਰੁੱਪ (ਸੰਡਰੀ ਡੈਬਟਰਜ਼, ਕ੍ਰੈਡਿਟਰਜ਼, ਖਰਚੇ, ਸੰਪਤੀਆਂ) ਤੇ ਲਾਈਵ ਬੈਲੇਂਸ
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ਨਵਾਂ ਖਾਤਾ / ਲੈੱਜਰ ਜੋੜੋ</span>
        </button>
      </div>

      {/* Group Badges Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ਖਾਤਾ ਨਾਮ, ਪੰਜਾਬੀ ਨਾਮ ਜਾਂ PAN ਨੰਬਰ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            ਕੁੱਲ ਖਾਤੇ: <strong className="text-slate-800">{filteredLedgers.length}</strong> / {pakkaLedgers.length}
          </div>
        </div>

        {/* Quick Group Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedGroupFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
              selectedGroupFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ਸਾਰੇ ਗਰੁੱਪ (All)
          </button>
          {ACCOUNT_GROUPS.map((grp) => (
            <button
              key={grp.key}
              type="button"
              onClick={() => setSelectedGroupFilter(grp.key)}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                selectedGroupFilter === grp.key
                  ? 'bg-indigo-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {grp.titlePa.split('(')[0]}
              <span className="ml-1 text-[10px] opacity-75 font-mono">
                ({grp.normalBalance})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ledgers Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">ਖਾਤੇ ਦਾ ਨਾਮ (Ledger Name)</th>
                <th className="p-3">ਗਰੁੱਪ (Account Group)</th>
                <th className="p-3 text-center">ਸ਼੍ਰੇਣੀ (Category)</th>
                <th className="p-3 text-center">ਕਿਸਮ (Dr/Cr)</th>
                <th className="p-3 text-right">ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ (Opening)</th>
                <th className="p-3 text-right">ਚੱਲਦਾ ਬੈਲੇਂਸ (Live Balance)</th>
                <th className="p-3 text-center">PAN / GSTIN</th>
                <th className="p-3 text-center">ਐਕਸ਼ਨ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    ਕੋਈ ਲੈੱਜਰ ਨਹੀਂ ਮਿਲਿਆ। "ਨਵਾਂ ਖਾਤਾ / ਲੈੱਜਰ ਜੋੜੋ" ਬਟਨ ਦਬਾਓ।
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((l, idx) => {
                  const meta = ACCOUNT_GROUPS.find((g) => g.key === l.group);
                  const bal = calculateLedgerBalance(l, pakkaVouchers, activeFiscalYear);

                  return (
                    <tr key={`${l.id}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{l.name}</div>
                        {l.namePa && (
                          <div className="text-[11px] text-slate-500">{l.namePa}</div>
                        )}
                        {l.isSystemLedger && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                            ਸਿਸਟਮ ਡਿਫਾਲਟ
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800">
                          {meta?.titlePa || l.group}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {meta?.titleEn}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            meta?.category === 'ASSET'
                              ? 'bg-blue-100 text-blue-800'
                              : meta?.category === 'LIABILITY'
                              ? 'bg-purple-100 text-purple-800'
                              : meta?.category === 'INCOME'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {meta?.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            l.openingBalanceType === 'DR'
                              ? 'text-blue-700 bg-blue-50'
                              : 'text-purple-700 bg-purple-50'
                          }`}
                        >
                          {l.openingBalanceType}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        ₹{Number(l.openingBalance).toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-500">{l.openingBalanceType}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        ₹{Math.round(bal.closingBalance).toLocaleString()}{' '}
                        <span
                          className={`text-[10px] font-bold ${
                            bal.closingBalanceType === 'DR' ? 'text-blue-700' : 'text-purple-700'
                          }`}
                        >
                          {bal.closingBalanceType}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-slate-600">
                        {l.pan || l.gstin ? (
                          <div>
                            {l.pan && <div>PAN: {l.pan}</div>}
                            {l.gstin && <div className="text-[10px] text-slate-500">GST: {l.gstin}</div>}
                          </div>
                        ) : (
                          <span className="text-slate-300">---</span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(l)}
                            className="p-1 text-slate-600 hover:text-indigo-600 rounded transition"
                            title="ਸੋਧੋ (Edit)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!l.isSystemLedger && (
                            <button
                              type="button"
                              onClick={() => handleDelete(l.id, l.name)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="ਡਿਲੀਟ ਕਰੋ (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Ledger Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-700" />
                <span>{editingLedger ? 'ਖਾਤਾ ਸੋਧੋ (Edit Ledger)' : 'ਨਵਾਂ ਖਾਤਾ ਜੋੜੋ (Add New Ledger)'}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    ਖਾਤੇ ਦਾ ਅੰਗਰੇਜ਼ੀ ਨਾਮ (Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Gurmail Singh (Buyer)"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    ਪੰਜਾਬੀ ਵਿੱਚ ਨਾਮ (Name in Punjabi)
                  </label>
                  <input
                    type="text"
                    value={formData.namePa}
                    onChange={(e) => setFormData({ ...formData, namePa: e.target.value })}
                    placeholder="e.g. ਗੁਰਮੇਲ ਸਿੰਘ"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Group Selector with explanation */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ਅਕਾਊਂਟਿੰਗ ਗਰੁੱਪ (Account Group) *
                </label>
                <select
                  value={formData.group}
                  onChange={(e) => handleGroupSelect(e.target.value as AccountGroup)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800"
                >
                  {ACCOUNT_GROUPS.map((grp) => (
                    <option key={grp.key} value={grp.key}>
                      {grp.titlePa} • {grp.category} ({grp.normalBalance})
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-slate-500 mt-1">
                  ਚੁਣੇ ਗਰੁੱਪ ਦਾ ਸੁਭਾਅ:{' '}
                  <strong className="text-indigo-900">
                    {ACCOUNT_GROUPS.find((g) => g.key === formData.group)?.titleEn}
                  </strong>{' '}
                  (ਸਧਾਰਨ ਬਕਾਇਆ: {ACCOUNT_GROUPS.find((g) => g.key === formData.group)?.normalBalance})
                </div>
              </div>

              {/* Opening Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    ਸ਼ੁਰੂਆਤੀ ਬਕਾਇਆ (Opening Balance ₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    ਬੈਲੇਂਸ ਕਿਸਮ (Dr / Cr)
                  </label>
                  <select
                    value={formData.openingBalanceType}
                    onChange={(e) =>
                      setFormData({ ...formData, openingBalanceType: e.target.value as 'DR' | 'CR' })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="DR">DR (ਲੈਣਦਾਰ / ਡੈਬਿਟ - Assets/Expenses)</option>
                    <option value="CR">CR (ਦੇਣਦਾਰ / ਕ੍ਰੈਡਿਟ - Liabilities/Income)</option>
                  </select>
                </div>
              </div>

              {/* Statutory details (PAN / GSTIN / Mobile) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">PAN ਨੰਬਰ</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">GSTIN ਨੰਬਰ</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="03AAAAA0000A1Z5"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਮੋਬਾਈਲ ਨੰਬਰ</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="98765-43210"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ਸ਼ਹਿਰ / ਪਤਾ</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. Khanna Mandi"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Bank Details (if applicable) */}
              {(formData.group === 'BANK_ACCOUNTS' ||
                formData.group === 'SUNDRY_DEBTORS' ||
                formData.group === 'SUNDRY_CREDITORS') && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-blue-700" />
                    <span>ਬੈਂਕ ਵੇਰਵਾ (Bank Account Details)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="ਬੈਂਕ ਦਾ ਨਾਮ (SBI, PNB...)"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="ਖਾਤਾ ਨੰਬਰ (A/c No)"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="IFSC ਕੋਡ"
                        value={formData.ifscCode}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  {editingLedger ? 'ਖਾਤਾ ਅੱਪਡੇਟ ਕਰੋ' : 'ਖਾਤਾ ਸੇਵ ਕਰੋ (Save Ledger)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
