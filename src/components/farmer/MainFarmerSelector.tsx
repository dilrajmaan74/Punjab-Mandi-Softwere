import React, { useState, useMemo } from 'react';
import { Farmer } from '../../types/mandi';
import { Search, UserCheck, X, Check, MapPin, Phone, ShieldCheck } from 'lucide-react';

interface MainFarmerSelectorProps {
  farmers: Farmer[];
  currentFarmerId?: string;
  selectedMainFarmerId?: string;
  onSelectMainFarmer: (mainFarmer: Farmer | null) => void;
}

export const MainFarmerSelector: React.FC<MainFarmerSelectorProps> = ({
  farmers,
  currentFarmerId,
  selectedMainFarmerId,
  onSelectMainFarmer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Available candidate farmers (excluding self if editing)
  const availableFarmers = useMemo(() => {
    return farmers.filter((f) => !currentFarmerId || f.id !== currentFarmerId);
  }, [farmers, currentFarmerId]);

  // Currently selected main farmer object
  const selectedFarmer = useMemo(() => {
    if (!selectedMainFarmerId) return null;
    return farmers.find((f) => f.id === selectedMainFarmerId) || null;
  }, [farmers, selectedMainFarmerId]);

  // Filter based on search query: Name, ID, Village, Aadhaar, Mobile
  const filteredFarmers = useMemo(() => {
    if (!searchQuery.trim()) return availableFarmers;
    const q = searchQuery.toLowerCase().trim();
    const cleanNumbers = q.replace(/[^0-9]/g, '');

    return availableFarmers.filter((f) => {
      const matchNameEn = f.farmerName.toLowerCase().includes(q);
      const matchNamePa = f.farmerNamePa ? f.farmerNamePa.toLowerCase().includes(q) : false;
      const matchFatherEn = f.fatherName ? f.fatherName.toLowerCase().includes(q) : false;
      const matchFatherPa = f.fatherNamePa ? f.fatherNamePa.toLowerCase().includes(q) : false;
      const matchId = f.id.toLowerCase().includes(q);
      const matchVillageEn = f.village.toLowerCase().includes(q);
      const matchVillagePa = f.villagePa ? f.villagePa.toLowerCase().includes(q) : false;
      const matchAddress = f.address ? f.address.toLowerCase().includes(q) : false;

      const matchMobile = cleanNumbers && f.mobile ? f.mobile.replace(/[^0-9]/g, '').includes(cleanNumbers) : false;
      const matchAadhaar = cleanNumbers && f.aadhaar ? f.aadhaar.replace(/[^0-9]/g, '').includes(cleanNumbers) : false;

      return (
        matchNameEn ||
        matchNamePa ||
        matchFatherEn ||
        matchFatherPa ||
        matchId ||
        matchVillageEn ||
        matchVillagePa ||
        matchAddress ||
        matchMobile ||
        matchAadhaar
      );
    });
  }, [availableFarmers, searchQuery]);

  return (
    <div className="bg-amber-50/60 border border-amber-300 rounded-xl p-3.5 space-y-3">
      {/* Header with Title and Remove Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-amber-500 text-slate-950 rounded-md">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <label className="text-xs font-black text-amber-950 block">
              ਮੁੱਖ ਕਿਸਾਨ ਨਾਲ ਲਿੰਕ ਕਰੋ (Link With Main Farmer - Optional)
            </label>
            <span className="text-[11px] text-amber-800 block">
              ਜੇਕਰ ਇਸ ਕਿਸਾਨ ਦੀ ਖਰੀਦ ਕਿਸੇ ਮੁੱਖ ਕਿਸਾਨ ਦੇ ਮੰਡੀ ਆਮਦ ਸਟਾਕ ਵਿੱਚੋਂ ਘਟਾਈ ਜਾਣੀ ਹੈ, ਤਾਂ ਮੁੱਖ ਕਿਸਾਨ ਚੁਣੋ
            </span>
          </div>
        </div>

        {selectedFarmer && (
          <button
            type="button"
            onClick={() => {
              onSelectMainFarmer(null);
              setSearchQuery('');
            }}
            className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition shadow-2xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>ਲਿੰਕ ਹਟਾਓ (Remove Link)</span>
          </button>
        )}
      </div>

      {/* Selected Farmer Card */}
      {selectedFarmer && (
        <div className="bg-white border-2 border-amber-400 rounded-xl p-3 shadow-2xs space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-amber-100 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded font-mono border border-amber-300">
                {selectedFarmer.id}
              </span>
              <span className="text-xs font-black text-slate-900">
                {selectedFarmer.farmerName} s/o {selectedFarmer.fatherName}
              </span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-700" />
              ਲਿੰਕਡ ਮੁੱਖ ਕਿਸਾਨ (Active Link)
            </span>
          </div>

          {/* Punjabi Name & Father Name */}
          <div className="text-xs font-bold text-emerald-900">
            {selectedFarmer.farmerNamePa} ਸ/ਓ {selectedFarmer.fatherNamePa || selectedFarmer.fatherName} • ਪਿੰਡ: {selectedFarmer.villagePa || selectedFarmer.village}
          </div>

          {/* Full Address */}
          <div className="text-[11px] text-slate-600 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>ਪੂਰਾ ਪਤਾ (Full Address):</strong> {selectedFarmer.address ? `${selectedFarmer.address}, ` : ''}
              ਪਿੰਡ {selectedFarmer.village}, PIN: {selectedFarmer.pinCode}
            </span>
          </div>

          {/* Mobile & Aadhaar */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <strong>ਮੋਬਾਈਲ:</strong> {selectedFarmer.mobile || 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              <strong>ਆਧਾਰ:</strong> {selectedFarmer.aadhaar || 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* Search Input Box at Top */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-amber-950 flex items-center justify-between">
          <span>ਮੁੱਖ ਕਿਸਾਨ ਖੋਜੋ (Search Main Farmer by Name, ID, Village, Aadhaar, Mobile):</span>
          <span className="text-[10px] text-slate-500 font-normal">
            ਕੁੱਲ ਕਿਸਾਨ: {availableFarmers.length}
          </span>
        </label>

        <div className="relative">
          <Search className="w-4 h-4 text-amber-700 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ਅੰਗਰੇਜ਼ੀ/ਪੰਜਾਬੀ ਨਾਂ, ਪਿੰਡ, ਕਿਸਾਨ ਆਈ.ਡੀ, ਮੋਬਾਈਲ ਜਾਂ ਆਧਾਰ ਨਾਲ ਖੋਜੋ..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="w-full bg-white border border-amber-300 rounded-lg pl-9 pr-8 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Select Dropdown List (English First + Punjabi Below/Alongside + Full Address) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span>ਕਿਸਾਨ ਸੂਚੀ (Select Farmer to Link):</span>
          {isOpen && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-amber-800 hover:underline"
            >
              ਸੂਚੀ ਬੰਦ ਕਰੋ (Close)
            </button>
          )}
        </div>

        {/* Dropdown Options Container */}
        <div className="max-h-56 overflow-y-auto border border-amber-200 rounded-xl bg-white divide-y divide-slate-100 shadow-inner">
          {/* Default Option for Independent / No Link */}
          <button
            type="button"
            onClick={() => {
              onSelectMainFarmer(null);
              setIsOpen(false);
            }}
            className={`w-full text-left p-2.5 text-xs transition flex items-center justify-between hover:bg-amber-50/70 ${
              !selectedMainFarmerId ? 'bg-amber-100/70 font-black text-amber-950' : 'text-slate-600'
            }`}
          >
            <div>
              <span className="font-bold block">-- ਕੋਈ ਮੁੱਖ ਕਿਸਾਨ ਲਿੰਕ ਨਹੀਂ (Direct / Independent Farmer) --</span>
              <span className="text-[10px] text-slate-500">ਇਸ ਕਿਸਾਨ ਦੀ ਦਾਣਾ ਮੰਡੀ ਆਮਦ ਅਤੇ ਖਰੀਦ ਸਿੱਧੀ ਰਹੇਗੀ।</span>
            </div>
            {!selectedMainFarmerId && <Check className="w-4 h-4 text-emerald-600" />}
          </button>

          {filteredFarmers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ। ਖੋਜ ਸ਼ਬਦ ਬਦਲ ਕੇ ਦੇਖੋ।
            </div>
          ) : (
            filteredFarmers.map((f) => {
              const isCurrentSelected = f.id === selectedMainFarmerId;

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    onSelectMainFarmer(f);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 transition flex items-start justify-between gap-2 hover:bg-amber-50 ${
                    isCurrentSelected ? 'bg-amber-100/80 border-l-4 border-amber-600' : ''
                  }`}
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    {/* English Name first + Father Name + Village */}
                    <div className="text-xs font-black text-slate-900 flex items-center flex-wrap gap-1.5">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                        {f.id}
                      </span>
                      <span>{f.farmerName}</span>
                      <span className="text-slate-500 font-semibold">s/o {f.fatherName}</span>
                      <span className="text-amber-800 font-bold">• Village: {f.village}</span>
                    </div>

                    {/* Punjabi automatically below/alongside */}
                    <div className="text-[11px] font-bold text-emerald-900 flex items-center flex-wrap gap-1.5">
                      <span>{f.farmerNamePa}</span>
                      <span className="text-emerald-700 font-medium">ਸ/ਓ {f.fatherNamePa || f.fatherName}</span>
                      <span className="text-slate-500">• ਪਿੰਡ: {f.villagePa || f.village}</span>
                    </div>

                    {/* Full Address */}
                    <div className="text-[10px] text-slate-600 truncate">
                      <span className="font-semibold text-slate-700">ਪੂਰਾ ਪਤਾ (Address):</span> {f.address ? `${f.address}, ` : ''}
                      ਪਿੰਡ {f.village}, PIN: {f.pinCode} | ਮੋਬਾਈਲ: {f.mobile}
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    {isCurrentSelected ? (
                      <span className="bg-emerald-600 text-white p-1 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded">
                        ਲਿੰਕ ਕਰੋ
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
