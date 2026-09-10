import React, { useState } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { SellerMaster } from '../../types/mandi';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  FileText,
  X,
  Check,
  Search,
  ShieldCheck
} from 'lucide-react';

interface SellerMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSeller?: (seller: SellerMaster) => void;
}

const AVAILABLE_AGENCIES = [
  'Pungrain (ਪਨਗ੍ਰੇਨ)',
  'Markfed (ਮਾਰਕਫੈੱਡ)',
  'Punsup (ਪਨਸਪ)',
  'PSWC (ਪੰਜਾਬ ਸਟੇਟ ਵੇਅਰਹਾਊਸਿੰਗ)',
  'FCI (ਭਾਰਤੀ ਖੁਰਾਕ ਨਿਗਮ)',
  'Punjab Mandi Board Agency'
];

export const SellerMasterModal: React.FC<SellerMasterModalProps> = ({
  isOpen,
  onClose,
  onSelectSeller
}) => {
  const { sellers, addSeller, updateSeller, deleteSeller } = useMandi();
  const { notifySaveSuccess, notifyDeleteSuccess, notifyError } = useNotification();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [name, setName] = useState<string>('');
  const [namePa, setNamePa] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [addressPa, setAddressPa] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [licenceNo, setLicenceNo] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setNamePa('');
    setAddress('');
    setAddressPa('');
    setMobile('');
    setSelectedAgencies([]);
    setLicenceNo('');
    setGstin('');
    setFormError('');
    setIsEditing(false);
    setEditingId(null);
  };

  const startEdit = (seller: SellerMaster) => {
    setIsEditing(true);
    setEditingId(seller.id);
    setName(seller.name);
    setNamePa(seller.namePa || '');
    setAddress(seller.address);
    setAddressPa(seller.addressPa || '');
    setMobile(seller.mobile || '');
    setSelectedAgencies(seller.agencies || []);
    setLicenceNo(seller.licenceNo || '');
    setGstin(seller.gstin || '');
  };

  const toggleAgency = (agency: string) => {
    setSelectedAgencies((prev) =>
      prev.includes(agency) ? prev.filter((a) => a !== agency) : [...prev, agency]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('ਸੈਲਰ ਦਾ ਨਾਂ ਜ਼ਰੂਰੀ ਹੈ (Seller name is required)');
      return;
    }

    if (!address.trim()) {
      setFormError('ਪੂਰਾ ਪਤਾ ਜ਼ਰੂਰੀ ਹੈ (Full address is required)');
      return;
    }

    try {
      if (isEditing && editingId) {
        updateSeller(editingId, {
          name: name.trim(),
          namePa: namePa.trim() || undefined,
          address: address.trim(),
          addressPa: addressPa.trim() || undefined,
          mobile: mobile.trim() || undefined,
          agencies: selectedAgencies,
          licenceNo: licenceNo.trim() || undefined,
          gstin: gstin.trim() || undefined
        });

        notifySaveSuccess({
          titlePa: 'ਸੈਲਰ ਮਾਸਟਰ ਅਪਡੇਟ ਹੋ ਗਿਆ',
          titleEn: 'Seller Master Updated',
          messagePa: `${name.trim()} ਦੇ ਵੇਰਵੇ ਸਫਲਤਾਪੂਰਵਕ ਅਪਡੇਟ ਹੋ ਗਏ।`
        });
      } else {
        const newSeller = addSeller({
          name: name.trim(),
          namePa: namePa.trim() || undefined,
          sellerType: 'SHELLER_MILL',
          address: address.trim(),
          addressPa: addressPa.trim() || undefined,
          mobile: mobile.trim() || undefined,
          agencies: selectedAgencies,
          licenceNo: licenceNo.trim() || undefined,
          gstin: gstin.trim() || undefined
        });

        notifySaveSuccess({
          titlePa: 'ਨਵਾਂ ਸੈਲਰ ਸ਼ਾਮਲ ਹੋ ਗਿਆ',
          titleEn: 'New Seller Added',
          messagePa: `${name.trim()} ਨੂੰ ਸੈਲਰ ਮਾਸਟਰ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰ ਦਿੱਤਾ ਗਿਆ।`
        });

        if (onSelectSeller) {
          onSelectSeller(newSeller);
          onClose();
          return;
        }
      }

      resetForm();
    } catch {
      notifyError({
        titlePa: 'ਗਲਤੀ ਆਈ',
        titleEn: 'Operation Failed'
      });
    }
  };

  const handleDelete = (id: string, sellerName: string) => {
    if (window.confirm(`ਕੀ ਤੁਸੀਂ ਸੱਚਮੁੱਚ "${sellerName}" ਨੂੰ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ?`)) {
      deleteSeller(id);
      notifyDeleteSuccess({
        titlePa: 'ਸੈਲਰ ਹਟਾ ਦਿੱਤਾ ਗਿਆ',
        titleEn: 'Seller Deleted',
        messagePa: `${sellerName} ਨੂੰ ਮਾਸਟਰ ਸੂਚੀ ਵਿੱਚੋਂ ਹਟਾ ਦਿੱਤਾ ਗਿਆ।`
      });
    }
  };

  const filteredSellers = sellers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.namePa && s.namePa.toLowerCase().includes(q)) ||
      s.address.toLowerCase().includes(q) ||
      (s.mobile && s.mobile.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2">
                ਸੈਲਰ ਮਾਸਟਰ ਪ੍ਰਬੰਧਨ (Multi-Seller Master)
              </h2>
              <p className="text-xs text-slate-400">
                ਰਾਈਸ ਸ਼ੈਲਰ, ਮਿੱਲਰ ਅਤੇ ਖਰੀਦ ਏਜੰਸੀਆਂ ਦਾ ਮਾਸਟਰ ਰਿਕਾਰਡ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Add / Edit Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                {isEditing ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                {isEditing ? 'ਸੈਲਰ ਵੇਰਵੇ ਸੋਧੋ (Edit Seller Details)' : 'ਨਵਾਂ ਸੈਲਰ ਸ਼ਾਮਲ ਕਰੋ (Add New Seller / Sheller)'}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  ਰੱਦ ਕਰੋ (Cancel Edit)
                </button>
              )}
            </div>

            {formError && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਸੈਲਰ / ਮਿੱਲ ਦਾ ਨਾਂ (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name || ''}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kang Modern Rice Mill"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਸੈਲਰ ਦਾ ਨਾਂ (ਪੰਜਾਬੀ)
                </label>
                <input
                  type="text"
                  value={namePa || ''}
                  onChange={(e) => setNamePa(e.target.value)}
                  placeholder="ਉਦਾਹਰਣ: ਕੰਗ ਮਾਡਰਨ ਰਾਈਸ ਮਿੱਲ"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਪੂਰਾ ਪਤਾ (Full Address & Location) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={address || ''}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shahkot Road, Kang Khurd, Teh. Shahkot, Distt. Jalandhar - 144629"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਸੰਪਰਕ ਮੋਬਾਈਲ ਨੰਬਰ (Mobile No.)
                </label>
                <input
                  type="tel"
                  value={mobile || ''}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 98147-74651"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ਸ਼ੈਲਰ ਲਾਇਸੰਸ / ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਨੰਬਰ (Licence No.)
                </label>
                <input
                  type="text"
                  value={licenceNo || ''}
                  onChange={(e) => setLicenceNo(e.target.value)}
                  placeholder="e.g. MLR-JAL-2024-88"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              {/* Multi-Agency Selection */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ਸੰਬੰਧਿਤ ਖਰੀਦ ਏਜੰਸੀਆਂ (Associated Procurement Agencies - Multi Select)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_AGENCIES.map((agency) => {
                    const isSelected = selectedAgencies.includes(agency);
                    return (
                      <button
                        key={agency}
                        type="button"
                        onClick={() => toggleAgency(agency)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{agency}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
              >
                ਰੀਸੈੱਟ (Reset)
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 flex items-center gap-2 shadow-xs"
              >
                {isEditing ? 'ਸੇਵ ਕਰੋ (Update Seller)' : 'ਸ਼ਾਮਲ ਕਰੋ (Save Seller)'}
              </button>
            </div>
          </form>

          {/* Seller List */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>ਦਰਜ ਸੈਲਰਾਂ ਦੀ ਸੂਚੀ (Saved Sellers Master)</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-800 rounded-full font-bold">
                  {sellers.length}
                </span>
              </h3>

              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ਸੈਲਰ, ਪਤਾ ਜਾਂ ਫੋਨ ਖੋਜੋ..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSellers.map((seller) => (
                <div
                  key={seller.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {seller.name}
                        {seller.namePa && (
                          <span className="text-slate-500 font-bold ml-1.5">
                            ({seller.namePa})
                          </span>
                        )}
                      </h4>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{seller.address}</span>
                      </div>
                      {seller.mobile && (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-mono">{seller.mobile}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {onSelectSeller && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSeller(seller);
                            onClose();
                          }}
                          className="px-2 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200"
                        >
                          ਚੁਣੋ (Select)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(seller)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(seller.id, seller.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Agencies Tags */}
                  {seller.agencies && seller.agencies.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                      {seller.agencies.map((agency) => (
                        <span
                          key={agency}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold"
                        >
                          {agency.split('(')[0].trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {seller.licenceNo && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3 text-amber-500" />
                      <span>Licence: {seller.licenceNo}</span>
                    </div>
                  )}
                </div>
              ))}

              {filteredSellers.length === 0 && (
                <div className="col-span-2 text-center py-8 text-xs text-slate-400">
                  ਕੋਈ ਸੈਲਰ ਨਹੀਂ ਮਿਲਿਆ (No sellers found).
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            ਬੰਦ ਕਰੋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
