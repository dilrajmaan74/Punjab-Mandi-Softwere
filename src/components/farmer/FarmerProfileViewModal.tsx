import React, { useState } from 'react';
import { Farmer } from '../../types/mandi';
import { useMandi } from '../../context/MandiContext';
import {
  User,
  ShieldCheck,
  Building,
  Phone,
  CreditCard,
  Printer,
  FileDown,
  Edit,
  PackageCheck,
  X,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { maskAadhaarNumber } from '../../utils/calculations';
import { exportFarmerProfilePDF, openFarmerPrintWindow } from '../../utils/farmerPdfExport';

interface FarmerProfileViewModalProps {
  farmer: Farmer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (farmer: Farmer) => void;
}

export const FarmerProfileViewModal: React.FC<FarmerProfileViewModalProps> = ({
  farmer,
  isOpen,
  onClose,
  onEdit
}) => {
  const { settings, setSelectedFarmerForBags, setActiveSection } = useMandi();
  const [showFullAadhaar, setShowFullAadhaar] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [activeImagePreview, setActiveImagePreview] = useState<{
    url: string;
    title: string;
  } | null>(null);

  if (!isOpen || !farmer) return null;

  const handleExportPDF = async () => {
    try {
      setPdfGenerating(true);
      await exportFarmerProfilePDF(farmer, settings);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePrint = () => {
    openFarmerPrintWindow(farmer, settings);
  };

  const handleEnterBags = () => {
    setSelectedFarmerForBags(farmer);
    onClose();
    setActiveSection('bags-entry');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  ਕਿਸਾਨ ਪ੍ਰੋਫਾਈਲ (Farmer Profile)
                </h3>
                <span className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded shadow-2xs">
                  {farmer.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ਸੰਪੂਰਨ ਕਿਸਾਨ ਵੇਰਵੇ, ਆਧਾਰ ਫੋਟੋਆਂ ਤੇ ਬੈਂਕ ਰਿਕਾਰਡ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-100 p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-2xs"
              title="ਪ੍ਰਿੰਟ ਕਰੋ"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">ਪ੍ਰਿੰਟ (Print)</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={pdfGenerating}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition active:scale-95"
            >
              <FileDown className="w-4 h-4 text-amber-300" />
              <span>{pdfGenerating ? 'ਤਿਆਰ ਹੋ ਰਿਹਾ...' : 'PDF ਡਾਊਨਲੋਡ (PDF Export)'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* Main Top Grid: Farmer Photo + Identity */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Farmer Photo */}
            <div className="shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border-2 border-slate-300 overflow-hidden shadow-xs flex items-center justify-center">
                {farmer.photoUrl ? (
                  <img
                    src={farmer.photoUrl}
                    alt="Farmer"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                    onClick={() =>
                      setActiveImagePreview({
                        url: farmer.photoUrl!,
                        title: `ਕਿਸਾਨ ਫੋਟੋ (${farmer.farmerName})`
                      })
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 p-2 text-center">
                    <User className="w-10 h-10 mb-1" />
                    <span className="text-[10px]">ਕੋਈ ਫੋਟੋ ਨਹੀਂ</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-500">ਕਿਸਾਨ ਦੀ ਫੋਟੋ</span>
            </div>

            {/* Farmer Primary Details */}
            <div className="flex-1 w-full space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {farmer.farmerNamePa} <span className="text-slate-600 font-bold text-sm">({farmer.farmerName})</span>
                  </h4>
                  <div className="text-xs text-slate-600">
                    ਪਿਤਾ: <strong className="text-slate-900">{farmer.fatherNamePa || farmer.fatherName || '—'}</strong>{' '}
                    <span className="text-slate-500">({farmer.fatherName || '—'})</span>
                  </div>
                </div>

                <button
                  onClick={() => onEdit(farmer)}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5 text-blue-600" />
                  <span>ਸੋਧ ਕਰੋ (Edit Farmer)</span>
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">ਪਿੰਡ (Village / Pind):</span>
                  <strong className="text-slate-900 text-xs">
                    {farmer.villagePa || farmer.village} ({farmer.village})
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">ਪਿੰਨ ਕੋਡ (PIN Code):</span>
                  <strong className="text-slate-900 font-mono text-xs">{farmer.pinCode || '141401'}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">ਮੋਬਾਈਲ (Mobile No):</span>
                  <strong className="text-slate-900 font-mono text-xs">+91 {farmer.mobile}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 sm:col-span-2 lg:col-span-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block">ਆਧਾਰ ਨੰਬਰ (Aadhaar No):</span>
                    <strong className="font-mono text-emerald-800 text-sm font-black tracking-wider">
                      {showFullAadhaar ? farmer.aadhaar : maskAadhaarNumber(farmer.aadhaar)}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullAadhaar(!showFullAadhaar)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded flex items-center gap-1"
                    title={showFullAadhaar ? 'ਆਧਾਰ ਨੰਬਰ ਲੁਕਾਓ' : 'ਆਧਾਰ ਨੰਬਰ ਦੇਖੋ'}
                  >
                    {showFullAadhaar ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>ਲੁਕਾਓ (Mask)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>ਦੇਖੋ (Show)</span>
                      </>
                    )}
                  </button>
                </div>

                {farmer.address && (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 sm:col-span-2 lg:col-span-3">
                    <span className="text-[10px] font-bold text-slate-500 block">ਪੂਰਾ ਪਤਾ (Full Address):</span>
                    <p className="text-slate-900 font-medium text-xs mt-0.5">{farmer.address}</p>
                  </div>
                )}

                {farmer.linkedMainFarmerId && (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 sm:col-span-2 lg:col-span-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 block">ਲਿੰਕਡ ਮੁੱਖ ਕਿਸਾਨ (Linked With Main Farmer):</span>
                      <strong className="text-amber-950 font-bold text-xs">
                        {farmer.linkedMainFarmerName || farmer.linkedMainFarmerId} [{farmer.linkedMainFarmerId}]
                      </strong>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded">
                      Linked Sub-Farmer
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Land Record & Credit Limit Overview Card */}
          {(farmer.ownedLandAcres !== undefined || farmer.leasedLandAcres !== undefined || farmer.creditLimit !== undefined || farmer.expectedWheatBags !== undefined || farmer.expectedPaddyBags !== undefined || farmer.openingBalance !== undefined) && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
              <h4 className="font-black text-xs sm:text-sm text-amber-950 flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌾</span>
                  <span>ਜ਼ਮੀਨ, ਫਸਲ ਅੰਦਾਜ਼ਾ ਅਤੇ ਉਧਾਰ ਲਿਮਿਟ (Land, Expected Yield & Credit Limit)</span>
                </div>
                {farmer.creditLimit ? (
                  <span className="text-xs bg-rose-600 text-white font-mono font-bold px-2 py-0.5 rounded-md">
                    ਲਿਮਿਟ: ₹{farmer.creditLimit.toLocaleString('en-IN')}
                  </span>
                ) : null}
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-slate-500 block">ਆਪਣੀ ਜ਼ਮੀਨ:</span>
                  <strong className="text-slate-900 font-black text-sm">{farmer.ownedLandAcres || 0} ਏਕੜ/ਕਿੱਲੇ</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-slate-500 block">ਠੇਕੇ 'ਤੇ ਜ਼ਮੀਨ:</span>
                  <strong className="text-slate-900 font-black text-sm">
                    {farmer.leasedLandAcres || 0} ਕਿੱਲੇ
                    {farmer.leaseRatePerAcre ? <span className="text-[10px] font-normal text-slate-500 block">(₹{farmer.leaseRatePerAcre}/ਏਕੜ)</span> : null}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-slate-500 block">ਅੰਦਾਜ਼ਨ ਕਣਕ:</span>
                  <strong className="text-amber-900 font-black text-sm font-mono">{farmer.expectedWheatBags || 0} ਬੋਰੀਆਂ</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-slate-500 block">ਅੰਦਾਜ਼ਨ ਝੋਨਾ:</span>
                  <strong className="text-emerald-900 font-black text-sm font-mono">{farmer.expectedPaddyBags || 0} ਬੋਰੀਆਂ</strong>
                </div>
              </div>

              {farmer.openingBalance !== undefined && (
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500">ਪਿਛਲਾ ਓਪਨਿੰਗ ਬੈਲੇਂਸ (Opening Balance):</span>
                    <div className="text-xs font-semibold text-slate-700">
                      {farmer.openingBalance >= 0 ? 'ਕਿਸਾਨ ਨੂੰ ਦੇਣਯੋਗ ਜਮ੍ਹਾਂ' : 'ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ ਦੇਣਦਾਰੀ'}
                    </div>
                  </div>
                  <strong className={`font-mono text-sm font-black ${farmer.openingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ₹{Math.abs(farmer.openingBalance).toLocaleString('en-IN')} {farmer.openingBalance >= 0 ? '(Cr)' : '(Dr)'}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Aadhaar Documents Section (Front & Back Photos) */}
          <div className="space-y-2">
            <h4 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ਆਧਾਰ ਕਾਰਡ ਦਸਤਾਵੇਜ਼ (Aadhaar Card Documents - Front & Back)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Aadhaar Front */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    A) ਆਧਾਰ ਮੁੱਖ ਪਾਸਾ (Aadhaar Card FRONT)
                  </span>
                  {(farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl) && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                      ਉਪਲਬਧ (Uploaded)
                    </span>
                  )}
                </div>

                <div className="h-40 bg-white rounded-lg border border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                  {farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl ? (
                    <img
                      src={farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl}
                      alt="Aadhaar Front"
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition"
                      onClick={() =>
                        setActiveImagePreview({
                          url: farmer.aadhaarFrontUrl || farmer.aadhaarPhotoUrl!,
                          title: 'Aadhaar Card FRONT'
                        })
                      }
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 space-y-1">
                      <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
                      <span className="text-xs">ਫਰੰਟ ਕਾਰਡ ਫੋਟੋ ਅਪਲੋਡ ਨਹੀਂ ਹੈ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Aadhaar Back */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    B) ਆਧਾਰ ਪਿਛਲਾ ਪਾਸਾ (Aadhaar Card BACK - Address)
                  </span>
                  {farmer.aadhaarBackUrl && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                      ਉਪਲਬਧ (Uploaded)
                    </span>
                  )}
                </div>

                <div className="h-40 bg-white rounded-lg border border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                  {farmer.aadhaarBackUrl ? (
                    <img
                      src={farmer.aadhaarBackUrl}
                      alt="Aadhaar Back"
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition"
                      onClick={() =>
                        setActiveImagePreview({
                          url: farmer.aadhaarBackUrl!,
                          title: 'Aadhaar Card BACK'
                        })
                      }
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400 space-y-1">
                      <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
                      <span className="text-xs">ਬੈਕ ਕਾਰਡ ਫੋਟੋ ਅਪਲੋਡ ਨਹੀਂ ਹੈ</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

            {/* Bank Account Section */}
          <div className="space-y-2">
            <h4 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>ਬੈਂਕ ਖਾਤਾ ਵੇਰਵੇ (Official Bank & DBT Details)</span>
            </h4>

            {farmer.bankDetails?.accountNumber ? (
              <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-12 bg-white/90 p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-[10px] text-purple-700 font-bold block mb-0.5">ਅਧਿਕਾਰਤ ਬੈਂਕ ਦਾ ਪੂਰਾ ਨਾਂ (Official Registered Bank Name):</span>
                    <strong className="text-purple-950 font-black text-xs sm:text-sm break-words block">{farmer.bankDetails.bankName}</strong>
                  </div>

                  <div className="sm:col-span-4">
                    <span className="text-[10px] text-purple-700 font-bold block">ਖਾਤਾ ਧਾਰਕ (Account Holder):</span>
                    <strong className="text-purple-950 font-bold">
                      {farmer.bankDetails.accountHolderName || farmer.farmerName}
                    </strong>
                  </div>

                  <div className="sm:col-span-4">
                    <span className="text-[10px] text-purple-700 font-bold block">IFSC ਕੋਡ:</span>
                    <strong className="text-purple-950 font-mono font-black">{farmer.bankDetails.ifscCode}</strong>
                  </div>

                  <div className="sm:col-span-4">
                    <span className="text-[10px] text-purple-700 font-bold block">ਖਾਤਾ ਨੰਬਰ (Account No):</span>
                    <strong className="text-purple-950 font-mono font-black">{farmer.bankDetails.accountNumber}</strong>
                  </div>

                  <div className="sm:col-span-6">
                    <span className="text-[10px] text-purple-700 font-bold block">ਸ਼ਾਖਾ ਦਾ ਨਾਂ (Branch Name):</span>
                    <strong className="text-purple-950 break-words block">{farmer.bankDetails.branchName || 'Main Branch'}</strong>
                  </div>

                  <div className="sm:col-span-6">
                    <span className="text-[10px] text-purple-700 font-bold block">ਸ਼ਹਿਰ / ਜ਼ਿਲ੍ਹਾ / ਸੂਬਾ:</span>
                    <strong className="text-purple-950 break-words block">
                      {[farmer.bankDetails.city, farmer.bankDetails.district, farmer.bankDetails.state].filter(Boolean).join(', ') || '—'}
                    </strong>
                  </div>

                  {farmer.bankDetails.branchAddress && (
                    <div className="sm:col-span-12 bg-white/70 p-2.5 rounded-lg border border-purple-100 text-xs text-purple-950 space-y-0.5">
                      <span className="text-purple-800 font-bold block text-[10px]">
                        ਬੈਂਕ ਦਾ ਪੂਰਾ ਅਧਿਕਾਰਤ ਪਤਾ (Complete Official Registered Bank Address):
                      </span>
                      <p className="font-medium leading-relaxed break-words">
                        {farmer.bankDetails.branchAddress}
                      </p>
                    </div>
                  )}

                  {farmer.bankDetails.pinCode && (
                    <div className="sm:col-span-6">
                      <span className="text-[10px] text-purple-700 font-bold block">ਬੈਂਕ ਪਿੰਨ ਕੋਡ (PIN Code):</span>
                      <strong className="text-purple-950 font-mono">{farmer.bankDetails.pinCode}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 flex items-center justify-between">
                <span>ਇਸ ਕਿਸਾਨ ਦੇ ਬੈਂਕ ਵੇਰਵੇ ਅਜੇ ਦਰਜ ਨਹੀਂ ਹੋਏ।</span>
                <button
                  onClick={() => {
                    onClose();
                    setActiveSection('bank-details');
                  }}
                  className="text-purple-700 hover:text-purple-900 font-bold underline"
                >
                  ਬੈਂਕ ਵੇਰਵੇ ਜੋੜੋ →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            ਰਜਿਸਟਰ ਹੋਇਆ: {new Date(farmer.createdAt).toLocaleDateString('en-GB')}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEnterBags}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95"
            >
              <PackageCheck className="w-4 h-4" />
              <span>ਬੋਰੀਆਂ ਦਰਜ ਕਰੋ (Enter Bags)</span>
            </button>
            <button
              onClick={onClose}
              className="bg-white hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs border border-slate-300"
            >
              ਬੰਦ ਕਰੋ (Close)
            </button>
          </div>
        </div>
      </div>

      {/* Full Image Zoom Modal */}
      {activeImagePreview && (
        <div className="fixed inset-0 z-60 bg-black/85 flex flex-col items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl overflow-hidden shadow-2xl space-y-2">
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-xs">{activeImagePreview.title}</span>
              <button
                onClick={() => setActiveImagePreview(null)}
                className="text-white hover:text-rose-400 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-2 max-h-[75vh] flex items-center justify-center overflow-auto bg-slate-900">
              <img
                src={activeImagePreview.url}
                alt="Document Preview"
                className="max-h-[70vh] max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
