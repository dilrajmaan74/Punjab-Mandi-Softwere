import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { Farmer } from '../../types/mandi';
import {
  Search,
  User,
  CreditCard,
  PackageCheck,
  Building,
  Phone,
  ShieldCheck,
  Printer,
  ArrowRight,
  Filter,
  FileText,
  Eye,
  EyeOff,
  Edit,
  FileDown,
  Trash2
} from 'lucide-react';
import { formatCurrency, maskAadhaarNumber } from '../../utils/calculations';
import { exportFarmerProfilePDF } from '../../utils/farmerPdfExport';
import { FarmerProfileViewModal } from './FarmerProfileViewModal';
import { FarmerEditModal } from './FarmerEditModal';

export const FarmerSearch: React.FC = () => {
  const {
    farmers,
    bagsEntries,
    deleteFarmer,
    deleteBagsEntry,
    setSelectedFarmerForBags,
    setSelectedFarmerForAccount,
    setActiveReceipt,
    setActiveBagsEntryToEdit,
    setActiveSection,
    settings
  } = useMandi();
  const { confirmDelete, notifyDeleteSuccess } = useNotification();

  const [query, setQuery] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(farmers[0]?.id || '');
  const [showMaskedAadhaar, setShowMaskedAadhaar] = useState(true);

  // Modals
  const [viewFarmer, setViewFarmer] = useState<Farmer | null>(null);
  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);

  // Filter farmers by Name, ID, Aadhaar, or Village
  const handleDeleteFarmer = (f: Farmer) => {
    confirmDelete({
      recordNameEn: f.farmerName,
      recordNamePa: f.farmerNamePa,
      recordId: f.id,
      itemDetails: [
        { labelEn: 'Village', labelPa: 'ਪਿੰਡ', value: `${f.villagePa} (${f.village})` },
        { labelEn: 'Aadhaar', labelPa: 'ਆਧਾਰ', value: f.aadhaar }
      ],
      onConfirm: () => {
        deleteFarmer(f.id);
        notifyDeleteSuccess({
          titlePa: 'ਕਿਸਾਨ ਸਫਲਤਾਪੂਰਵਕ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
          titleEn: 'Farmer Deleted Successfully',
          messagePa: `ਕਿਸਾਨ ${f.farmerNamePa} (${f.id}) ਦਾ ਰਿਕਾਰਡ ਹਟਾ ਦਿੱਤਾ ਗਿਆ ਹੈ।`
        });
      }
    });
  };

  const handleDeleteBagsEntry = (entry: any) => {
    confirmDelete({
      recordNameEn: `Slip ${entry.entryNumber}`,
      recordNamePa: `ਰਸੀਦ ${entry.entryNumber}`,
      recordId: entry.entryNumber,
      itemDetails: [
        { labelEn: 'Farmer', labelPa: 'ਕਿਸਾਨ', value: `${entry.farmerNamePa} (${entry.farmerId})` },
        { labelEn: 'Bags', labelPa: 'ਬੋਰੀਆਂ', value: `${entry.bags} Bags (${entry.bardana})` },
        { labelEn: 'Total Weight', labelPa: 'ਕੁੱਲ ਵਜ਼ਨ', value: entry.grandTotalDisplay }
      ],
      onConfirm: () => {
        deleteBagsEntry(entry.id);
        notifyDeleteSuccess({
          titlePa: 'ਰਸੀਦ ਸਫਲਤਾਪੂਰਵਕ ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।',
          titleEn: 'Slip Deleted Successfully',
          messagePa: `ਰਸੀਦ ${entry.entryNumber} ਹਟਾ ਦਿੱਤੀ ਗਈ ਹੈ।`
        });
      }
    });
  };

  const filteredFarmers = farmers.filter((f) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      f.farmerName.toLowerCase().includes(q) ||
      f.farmerNamePa.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q) ||
      f.village.toLowerCase().includes(q) ||
      f.villagePa.toLowerCase().includes(q) ||
      f.aadhaar.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
      f.mobile.includes(q)
    );
  });

  const activeFarmer = farmers.find((f) => f.id === selectedFarmerId) || filteredFarmers[0] || farmers[0];

  const farmerBagsEntries = activeFarmer
    ? bagsEntries.filter((b) => b.farmerId === activeFarmer.id)
    : [];

  const totalFarmerBags = farmerBagsEntries.reduce((sum, b) => sum + b.bags, 0);
  const totalFarmerAmount = farmerBagsEntries.reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-2xs">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900">
              ਕਿਸਾਨ ਖੋਜ ਤੇ ਖਾਤਾ ਰਿਕਾਰਡ (Farmer Search & Ledger)
            </h2>
            <p className="text-[11px] text-slate-500">
              ਨਾਮ, ਪਿੰਡ, ਆਧਾਰ ਜਾਂ ਕਿਸਾਨ ID ਰਾਹੀਂ ਤੁਰੰਤ ਖੋਜ • ਪ੍ਰੋਫਾਈਲ • ਸੋਧ • PDF ਐਕਸਪੋਰਟ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSection('farmer-registration')}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg shadow-2xs transition active:scale-95 flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>ਨਵਾਂ ਕਿਸਾਨ ਦਰਜ ਕਰੋ →</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ਕਿਸਾਨ ਦਾ ਨਾਂ, ਪਿੰਡ, ਆਧਾਰ ਨੰਬਰ ਜਾਂ ID ਦਰਜ ਕਰੋ (Search by Name, Village, Aadhaar, ID)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 shrink-0">
          ਮਿਲੇ ਕਿਸਾਨ: <strong className="text-emerald-700 font-mono">{filteredFarmers.length}</strong>
        </div>
      </div>

      {farmers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 space-y-2">
          <User className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700 text-sm">ਅਜੇ ਕੋਈ ਕਿਸਾਨ ਰਜਿਸਟਰ ਨਹੀਂ ਹੋਇਆ</h3>
          <p className="text-xs">ਕਿਰਪਾ ਕਰਕੇ ਕਿਸਾਨ ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਮੋਡੀਊਲ ਵਿੱਚ ਜਾ ਕੇ ਪਹਿਲਾਂ ਕਿਸਾਨ ਦਰਜ ਕਰੋ।</p>
          <button
            onClick={() => setActiveSection('farmer-registration')}
            className="mt-3 inline-block bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg"
          >
            ਕਿਸਾਨ ਰਜਿਸਟਰ ਕਰੋ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Farmer List */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 max-h-[75vh] overflow-y-auto">
            <h3 className="text-xs font-black text-slate-700 px-1 border-b border-slate-100 pb-1.5 flex items-center justify-between">
              <span>ਕਿਸਾਨ ਸੂਚੀ (Farmers)</span>
              <span className="text-[10px] text-slate-400">{filteredFarmers.length} ਰਿਕਾਰਡ</span>
            </h3>

            {filteredFarmers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ</div>
            ) : (
              <div className="space-y-1.5">
                {filteredFarmers.map((f) => {
                  const isSelected = activeFarmer?.id === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFarmerId(f.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {f.photoUrl ? (
                            <img src={f.photoUrl} alt="Farmer" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {f.farmerNamePa} <span className="font-normal text-slate-500">({f.farmerName})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {f.villagePa || f.village} • <span className="font-mono">{f.pinCode}</span>
                          </div>
                        </div>
                      </div>

                      <span className="font-mono font-black text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {f.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 2 Columns: Selected Farmer Profile & History */}
          <div className="lg:col-span-2 space-y-4">
            {activeFarmer && (
              <>
                {/* Farmer Profile Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                        {activeFarmer.photoUrl ? (
                          <img src={activeFarmer.photoUrl} alt="Farmer" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-900 font-mono font-black text-xs px-2 py-0.5 rounded">
                            {activeFarmer.id}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-900">
                            {activeFarmer.farmerNamePa} ({activeFarmer.farmerName})
                          </h3>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          ਪਿਤਾ: <strong>{activeFarmer.fatherNamePa || activeFarmer.fatherName || '—'}</strong> • ਪਿੰਡ:{' '}
                          <strong>{activeFarmer.villagePa || activeFarmer.village} ({activeFarmer.pinCode})</strong>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons: ACCOUNT, VIEW, EDIT, DELETE, PDF EXPORT, ENTER BAGS */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedFarmerForAccount(activeFarmer);
                          setActiveSection('farmer-account');
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                        title="ਕਿਸਾਨ ਦਾ ਖਾਤਾ ਦੇਖੋ"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>ਕਿਸਾਨ ਖਾਤਾ (Account)</span>
                      </button>

                      <button
                        onClick={() => setViewFarmer(activeFarmer)}
                        className="bg-white hover:bg-slate-100 text-emerald-900 border border-emerald-300 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="ਪੂਰੀ ਪ੍ਰੋਫਾਈਲ ਦੇਖੋ"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>ਦੇਖੋ (View)</span>
                      </button>

                      <button
                        onClick={() => setEditFarmer(activeFarmer)}
                        className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="ਕਿਸਾਨ ਸੋਧੋ"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                        <span>ਸੋਧ (Edit)</span>
                      </button>

                      <button
                        onClick={() => handleDeleteFarmer(activeFarmer)}
                        className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="ਕਿਸਾਨ ਰਿਕਾਰਡ ਹਟਾਓ"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>ਹਟਾਓ (Delete)</span>
                      </button>

                      <button
                        onClick={() => exportFarmerProfilePDF(activeFarmer, settings)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="PDF ਡਾਊਨਲੋਡ"
                      >
                        <FileDown className="w-3.5 h-3.5 text-amber-300" />
                        <span>PDF</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedFarmerForBags(activeFarmer);
                          setActiveSection('bags-entry');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>ਬੋਰੀਆਂ ਦਰਜ ਕਰੋ</span>
                      </button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਮੋਬਾਈਲ (Mobile):</span>
                      <strong className="font-mono text-slate-900">+91 {activeFarmer.mobile}</strong>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px] block">ਆਧਾਰ ਨੰਬਰ:</span>
                        <button
                          type="button"
                          onClick={() => setShowMaskedAadhaar(!showMaskedAadhaar)}
                          className="text-[9px] text-slate-400 hover:text-slate-700"
                        >
                          {showMaskedAadhaar ? 'ਦਿਖਾਓ' : 'ਮਾਸਕ'}
                        </button>
                      </div>
                      <strong className="font-mono text-emerald-800">
                        {showMaskedAadhaar ? maskAadhaarNumber(activeFarmer.aadhaar) : activeFarmer.aadhaar}
                      </strong>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 text-[10px] block">ਅਧਿਕਾਰਤ ਬੈਂਕ ਦਾ ਨਾਂ (Official Bank):</span>
                      <strong className="text-slate-900 font-bold break-words block">
                        {activeFarmer.bankDetails?.bankName || 'ਦਰਜ ਨਹੀਂ (Not Added)'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ (Account No):</span>
                      <strong className="font-mono font-bold text-slate-900">
                        {activeFarmer.bankDetails?.accountNumber || '—'}
                      </strong>
                    </div>
                    <div className={activeFarmer.bankDetails?.branchAddress ? "sm:col-span-3" : ""}>
                      <span className="text-slate-500 text-[10px] block">IFSC ਕੋਡ & ਸ਼ਾਖਾ / ਪਤਾ:</span>
                      <div className="font-medium text-slate-900 break-words">
                        {activeFarmer.bankDetails ? (
                          <>
                            <span className="font-mono font-bold text-purple-900 mr-2">{activeFarmer.bankDetails.ifscCode}</span>
                            {activeFarmer.bankDetails.branchName && (
                              <span className="font-bold mr-2">• {activeFarmer.bankDetails.branchName}</span>
                            )}
                            {activeFarmer.bankDetails.branchAddress && (
                              <span className="text-[11px] text-slate-600 block mt-0.5">{activeFarmer.bankDetails.branchAddress}</span>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Farmer Weighment History */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span>ਕਿਸਾਨ ਦਾ ਬੋਰੀਆਂ ਤੇ ਤੁਲਾਈ ਇਤਿਹਾਸ (Weighment History)</span>
                    </h4>
                    <div className="text-xs font-mono font-bold text-slate-600">
                      ਕੁੱਲ ਬੋਰੀਆਂ: <strong className="text-slate-900">{totalFarmerBags}</strong> • ਰਕਮ:{' '}
                      <strong className="text-emerald-700">{formatCurrency(totalFarmerAmount)}</strong>
                    </div>
                  </div>

                  {farmerBagsEntries.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      ਇਸ ਕਿਸਾਨ ਲਈ ਅਜੇ ਕੋਈ ਬੋਰੀਆਂ ਦੀ ਐਂਟਰੀ ਦਰਜ ਨਹੀਂ ਹੋਈ।
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">ਰਸੀਦ / ਮਿਤੀ</th>
                            <th className="py-2 px-3 text-center">ਬੋਰੀਆਂ</th>
                            <th className="py-2 px-3 text-right">ਬੋਰੀ ਵਜ਼ਨ (Qul+Kg)</th>
                            <th className="py-2 px-3 text-right">ਟੋਟਾ</th>
                            <th className="py-2 px-3 text-right font-black">ਕੁੱਲ ਵਜ਼ਨ (Grand)</th>
                            <th className="py-2 px-3 text-center">ਬਾਰਦਾਨਾ</th>
                            <th className="py-2 px-3 text-right">ਰਕਮ (@ ₹2,461)</th>
                            <th className="py-2 px-3 text-right">ਕਾਰਵਾਈ (Actions)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {farmerBagsEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                {entry.entryNumber}
                                <span className="block text-[10px] text-slate-400 font-normal">{entry.date}</span>
                              </td>
                              <td className="py-2 px-3 text-center font-bold">{entry.bags}</td>
                              <td className="py-2 px-3 text-right font-mono">{entry.totalBagsWeightDisplay}</td>
                              <td className="py-2 px-3 text-right font-mono text-amber-800 font-bold">
                                {entry.totaKg} Kg
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-emerald-950">
                                {entry.grandTotalDisplay}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    entry.bardana === 'OLD'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {entry.bardana === 'OLD' ? 'ਪੁਰਾਣਾ' : 'ਨਵਾਂ'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-slate-950">
                                {formatCurrency(entry.totalAmount)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setActiveBagsEntryToEdit(entry)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-1 rounded-md cursor-pointer transition shadow-2xs"
                                    title="ਐਂਟਰੀ ਸੋਧੋ (Edit Bags Entry)"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-white" />
                                  </button>
                                  <button
                                    onClick={() => setActiveReceipt(entry)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold p-1 rounded-md cursor-pointer"
                                    title="ਪ੍ਰਿੰਟ ਰਸੀਦ (Print Slip)"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBagsEntry(entry)}
                                    className="bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-300 font-bold p-1 rounded-md cursor-pointer"
                                    title="ਰਸੀਦ ਹਟਾਓ (Delete Slip)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Profile View Modal */}
      <FarmerProfileViewModal
        isOpen={!!viewFarmer}
        farmer={viewFarmer}
        onClose={() => setViewFarmer(null)}
        onEdit={(farmerToEdit) => {
          setViewFarmer(null);
          setEditFarmer(farmerToEdit);
        }}
      />

      {/* Farmer Edit Modal */}
      <FarmerEditModal
        isOpen={!!editFarmer}
        farmer={editFarmer}
        onClose={() => setEditFarmer(null)}
        onSaved={(updated) => {
          if (viewFarmer?.id === updated.id) {
            setViewFarmer(updated);
          }
        }}
      />
    </div>
  );
};
