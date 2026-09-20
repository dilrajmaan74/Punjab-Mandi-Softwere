import React, { useState, useMemo } from 'react';
import { useMandi } from '../../context/MandiContext';
import { useNotification } from '../../context/NotificationContext';
import { Farmer, FarmerAccountSummary, BagsEntryRecord } from '../../types/mandi';
import {
  MessageSquare,
  Send,
  Check,
  Copy,
  Search,
  Filter,
  Users,
  CheckSquare,
  Square,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Phone,
  FileText,
  Building2,
  ExternalLink,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import {
  formatCurrency,
  formatKgToQulKg
} from '../../utils/calculations';
import {
  openWhatsApp,
  cleanMobileForWhatsApp,
  generateSeasonStatementWhatsAppMessage,
  generateTodayWeighmentSummaryWhatsAppMessage
} from '../../utils/whatsappNotification';

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedFarmerId?: string;
}

type TemplateType = 'SEASON_SUMMARY' | 'TODAY_WEIGHMENT' | 'MANDI_NOTICE' | 'CUSTOM';

export const BulkWhatsAppModal: React.FC<BulkWhatsAppModalProps> = ({
  isOpen,
  onClose,
  preSelectedFarmerId
}) => {
  const {
    farmers,
    bagsEntries,
    getCompleteFarmerAccount,
    activeFirm,
    settings,
    language
  } = useMandi();

  const isEn = language === 'en';
  const { notifySaveSuccess, notifyError } = useNotification();

  // Filter States
  const [selectedVillage, setSelectedVillage] = useState<string>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'PAYABLE' | 'DUE' | 'TODAY_WEIGHED' | 'HAS_ADVANCE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Template State
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('SEASON_SUMMARY');
  const [customMessage, setCustomMessage] = useState<string>(
`🌾 *ਕਿਸਾਨ ਭਰਾਵੋ ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਜੀ* 🌾
-----------------------------------
🏛 *${activeFirm?.name || settings.firmNameEn || 'Jammu Trading Co'}*
📍 ${settings.mandiNamePa || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ'}
-----------------------------------
👤 *ਕਿਸਾਨ:* {FARMER_NAME} ({FARMER_ID})
🏡 *ਪਿੰਡ:* {VILLAGE}

ਤੁਹਾਡੇ ਸੀਜ਼ਨ ਦਾ ਕੁੱਲ ਵਜ਼ਨ {TOTAL_WEIGHT} ਹੈ ਅਤੇ ਬਕਾਇਆ ਹਿਸਾਬ {NET_BALANCE} ਹੈ।
ਕਿਸੇ ਵੀ ਜਾਣਕਾਰੀ ਲਈ ਮੰਡੀ ਦੁਕਾਨ 'ਤੇ ਸੰਪਰਕ ਕਰੋ ਜੀ।
ਧੰਨਵਾਦ! 🙏`
  );

  // Selected Farmers Set
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<Set<string>>(() => {
    if (preSelectedFarmerId) {
      return new Set([preSelectedFarmerId]);
    }
    return new Set();
  });

  // Track Sent Status
  const [sentRecords, setSentRecords] = useState<Record<string, { sentAt: string }>>({});
  const [copiedNumbers, setCopiedNumbers] = useState(false);
  const [copiedCurrentMsg, setCopiedCurrentMsg] = useState(false);
  const [previewFarmerId, setPreviewFarmerId] = useState<string | null>(null);

  // Unique Villages List
  const villageList = useMemo(() => {
    const set = new Set<string>();
    farmers.forEach(f => {
      const v = f.villagePa || f.village;
      if (v && v.trim()) set.add(v.trim());
    });
    return Array.from(set).sort();
  }, [farmers]);

  // Today's date normalized
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Map farmer IDs to today's weighment entries
  const todayEntriesByFarmer = useMemo(() => {
    const map = new Map<string, BagsEntryRecord[]>();
    bagsEntries.forEach(entry => {
      if (entry.date === todayFormatted) {
        const list = map.get(entry.farmerId) || [];
        list.push(entry);
        map.set(entry.farmerId, list);
      }
    });
    return map;
  }, [bagsEntries, todayFormatted]);

  // Pre-calculate account summaries for filtering & display
  const farmerDataList = useMemo(() => {
    return farmers.map(f => {
      const summary = getCompleteFarmerAccount(f.id);
      const todayWeighments = todayEntriesByFarmer.get(f.id) || [];
      const netBalance = summary ? (summary.finalBalance ?? summary.finalNetSettlementBalance ?? 0) : 0;
      const totalBags = summary ? (summary.purchasedBags || summary.mandiArrivalBags || 0) : 0;
      const hasAdvance = summary ? (summary.totalAdvanceAmount > 0) : false;

      return {
        farmer: f,
        summary,
        todayWeighments,
        netBalance,
        totalBags,
        hasAdvance
      };
    });
  }, [farmers, getCompleteFarmerAccount, todayEntriesByFarmer]);

  // Filtered List
  const filteredFarmerData = useMemo(() => {
    return farmerDataList.filter(item => {
      const f = item.farmer;
      const village = f.villagePa || f.village || '';

      // Village filter
      if (selectedVillage !== 'ALL' && village !== selectedVillage) {
        return false;
      }

      // Balance / Activity filter
      if (balanceFilter === 'PAYABLE' && item.netBalance <= 0) return false;
      if (balanceFilter === 'DUE' && item.netBalance >= 0) return false;
      if (balanceFilter === 'TODAY_WEIGHED' && item.todayWeighments.length === 0) return false;
      if (balanceFilter === 'HAS_ADVANCE' && !item.hasAdvance) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (f.farmerName || '').toLowerCase().includes(q);
        const matchNamePa = (f.farmerNamePa || '').toLowerCase().includes(q);
        const matchId = (f.id || '').toLowerCase().includes(q);
        const matchMobile = (f.mobile || '').includes(q);
        const matchVillage = village.toLowerCase().includes(q);
        if (!matchName && !matchNamePa && !matchId && !matchMobile && !matchVillage) {
          return false;
        }
      }

      return true;
    });
  }, [farmerDataList, selectedVillage, balanceFilter, searchQuery]);

  // Handle Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedFarmerIds.size === filteredFarmerData.length && filteredFarmerData.length > 0) {
      setSelectedFarmerIds(new Set());
    } else {
      const newSet = new Set<string>();
      filteredFarmerData.forEach(item => newSet.add(item.farmer.id));
      setSelectedFarmerIds(newSet);
    }
  };

  const handleToggleFarmer = (id: string) => {
    const newSet = new Set(selectedFarmerIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedFarmerIds(newSet);
  };

  // Generate customized message for a given farmer
  const generateMessageForFarmer = (item: (typeof farmerDataList)[0]): string => {
    const { farmer, summary, todayWeighments } = item;
    const firmTitle = activeFirm?.name || settings.firmNameEn || 'Jammu Trading Co';
    const mandiTitle = settings.mandiNamePa || settings.mandiNameEn || 'ਦਾਣਾ ਮੰਡੀ ਕੰਗ ਖੁਰਦ';
    const farmerName = farmer.farmerNamePa ? `${farmer.farmerNamePa} (${farmer.farmerName})` : farmer.farmerName;
    const village = farmer.villagePa || farmer.village || '—';

    if (selectedTemplate === 'SEASON_SUMMARY' && summary) {
      return generateSeasonStatementWhatsAppMessage({
        accountSummary: summary,
        firm: activeFirm,
        settings: settings
      });
    }

    if (selectedTemplate === 'TODAY_WEIGHMENT') {
      if (todayWeighments.length > 0) {
        return generateTodayWeighmentSummaryWhatsAppMessage({
          farmerName,
          farmerId: farmer.id,
          village,
          todayEntries: todayWeighments,
          firm: activeFirm,
          settings: settings
        });
      } else {
        return (
`🌾 *ਮੰਡੀ ਸੂਚਨਾ - ${firmTitle.toUpperCase()}* 🌾
👤 ਕਿਸਾਨ: ${farmerName} (${farmer.id})
📍 ${mandiTitle}
ਅੱਜ ਤੁਹਾਡੀ ਕੋਈ ਨਵੀਂ ਤੁਲਾਈ ਐਂਟਰੀ ਨਹੀਂ ਹੈ। ਤੁਹਾਡੇ ਸੀਜ਼ਨ ਦੀਆਂ ਕੁੱਲ ਬੋਰੀਆਂ: ${item.totalBags}।
ਧੰਨਵਾਦ! 🙏`
        );
      }
    }

    if (selectedTemplate === 'MANDI_NOTICE') {
      return (
`📢 *ਮੰਡੀ ਆਮ ਸੂਚਨਾ (Mandi General Notice)* 📢
-----------------------------------
🏛 *${firmTitle.toUpperCase()}*
📍 ${mandiTitle} | 📞 ${activeFirm?.mobile || settings.firmMobile || '98147-74651'}
-----------------------------------
👤 *ਕਿਸਾਨ ਭਰਾ:* ${farmerName} (${farmer.id})
🏡 *ਪਿੰਡ:* ${village}

ਕਿਸਾਨ ਭਰਾਵੋ, ਦਾਣਾ ਮੰਡੀ ਵਿਖੇ ਫਸਲ ਦੀ ਖਰੀਦ ਨਿਰਵਿਘਨ ਜਾਰੀ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਜਿਨਸ ਸਾਫ਼ ਅਤੇ ਨਿਰਧਾਰਿਤ ਨਮੀ (Moisture) ਅਨੁਸਾਰ ਹੀ ਮੰਡੀ ਲਿਆਓ ਜੀ ਤਾਂ ਜੋ ਬੋਲੀ ਅਤੇ ਤੁਲਾਈ ਸਮੇਂ ਸਿਰ ਹੋ ਸਕੇ।

ਬਾਰਦਾਨਾ ਅਤੇ ਤੁਲਾਈ ਸਬੰਧੀ ਕਿਸੇ ਵੀ ਜ਼ਰੂਰਤ ਲਈ ਆੜ੍ਹਤ ਦੀ ਦੁਕਾਨ 'ਤੇ ਸੰਪਰਕ ਕਰੋ ਜੀ।
ਧੰਨਵਾਦ! 🙏`
      );
    }

    // CUSTOM template with merge tags
    const netBalText = item.netBalance >= 0
      ? `ਬਾਕੀ ਦੇਣਯੋਗ: ${formatCurrency(item.netBalance)}`
      : `ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ: ${formatCurrency(Math.abs(item.netBalance))}`;

    const totalWeightStr = summary
      ? (summary.purchasedWeightDisplay || summary.mandiArrivalDisplay || '0.00 Qul')
      : '0.00 Qul';

    return customMessage
      .replace(/{FARMER_NAME}/g, farmer.farmerName)
      .replace(/{FARMER_NAME_PA}/g, farmer.farmerNamePa || farmer.farmerName)
      .replace(/{FARMER_ID}/g, farmer.id)
      .replace(/{VILLAGE}/g, village)
      .replace(/{NET_BALANCE}/g, netBalText)
      .replace(/{TOTAL_BAGS}/g, String(item.totalBags))
      .replace(/{TOTAL_WEIGHT}/g, totalWeightStr)
      .replace(/{FIRM_NAME}/g, firmTitle)
      .replace(/{MANDI_NAME}/g, mandiTitle);
  };

  // Currently focused preview farmer
  const activePreviewFarmerData = useMemo(() => {
    if (previewFarmerId) {
      return farmerDataList.find(d => d.farmer.id === previewFarmerId) || filteredFarmerData[0] || farmerDataList[0];
    }
    const firstSelected = filteredFarmerData.find(d => selectedFarmerIds.has(d.farmer.id));
    return firstSelected || filteredFarmerData[0] || farmerDataList[0];
  }, [previewFarmerId, farmerDataList, filteredFarmerData, selectedFarmerIds]);

  const previewMessageText = useMemo(() => {
    if (!activePreviewFarmerData) return '';
    return generateMessageForFarmer(activePreviewFarmerData);
  }, [activePreviewFarmerData, selectedTemplate, customMessage]);

  // Send single farmer message
  const handleSendToFarmer = (item: (typeof farmerDataList)[0]) => {
    const msg = generateMessageForFarmer(item);
    openWhatsApp(item.farmer.mobile, msg);
    setSentRecords(prev => ({
      ...prev,
      [item.farmer.id]: { sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    }));
  };

  // Find next unsent farmer among selected
  const nextUnsentItem = useMemo(() => {
    return filteredFarmerData.find(item => selectedFarmerIds.has(item.farmer.id) && !sentRecords[item.farmer.id]);
  }, [filteredFarmerData, selectedFarmerIds, sentRecords]);

  // Send to Next Unsent
  const handleSendNext = () => {
    if (nextUnsentItem) {
      handleSendToFarmer(nextUnsentItem);
      setPreviewFarmerId(nextUnsentItem.farmer.id);
    } else {
      notifySaveSuccess({
        titleEn: 'All selected farmers sent!',
        titlePa: 'ਸਾਰੇ ਚੁਣੇ ਹੋਏ ਕਿਸਾਨਾਂ ਨੂੰ ਸੁਨੇਹੇ ਭੇਜੇ ਜਾ ਚੁੱਕੇ ਹਨ!'
      });
    }
  };

  // Copy all phone numbers
  const handleCopyNumbers = () => {
    const selectedList = filteredFarmerData.filter(d => selectedFarmerIds.has(d.farmer.id));
    const phones = selectedList
      .map(d => cleanMobileForWhatsApp(d.farmer.mobile))
      .filter(Boolean)
      .join(', ');

    if (!phones) {
      notifyError({
        titleEn: 'No mobile numbers found',
        titlePa: 'ਕੋਈ ਮੋਬਾਈਲ ਨੰਬਰ ਨਹੀਂ ਮਿਲਿਆ'
      });
      return;
    }

    navigator.clipboard.writeText(phones).then(() => {
      setCopiedNumbers(true);
      setTimeout(() => setCopiedNumbers(false), 2500);
      notifySaveSuccess({
        titleEn: 'Phone numbers copied to clipboard',
        titlePa: 'ਮੋਬਾਈਲ ਨੰਬਰ ਕਾਪੀ ਹੋ ਗਏ ਹਨ'
      });
    });
  };

  // Copy active message
  const handleCopyCurrentMessage = () => {
    if (!previewMessageText) return;
    navigator.clipboard.writeText(previewMessageText).then(() => {
      setCopiedCurrentMsg(true);
      setTimeout(() => setCopiedCurrentMsg(false), 2500);
      notifySaveSuccess({
        titleEn: 'Message text copied',
        titlePa: 'ਸੁਨੇਹਾ ਕਾਪੀ ਕਰ ਲਿਆ ਗਿਆ ਹੈ'
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  ਬਲਕ WhatsApp ਸੁਨੇਹੇ (Bulk WhatsApp Broadcast)
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase rounded-full border border-emerald-400/30">
                  Instant Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-300">
                ਇੱਕੋ ਵਾਰ ਸਾਰੇ ਕਿਸਾਨਾਂ ਨੂੰ ਸੀਜ਼ਨ ਖਾਤਾ ਬਕਾਇਆ, ਤੁਲਾਈ ਪੁਸ਼ਟੀ ਜਾਂ ਮੰਡੀ ਸੂਚਨਾਵਾਂ ਭੇਜੋ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Filter & Toolbar Strip */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Village Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ਪਿੰਡ ਅਨੁਸਾਰ ਫਿਲਟਰ (Village Filter)
            </label>
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="ALL">ਸਾਰੇ ਪਿੰਡ (All Villages)</option>
              {villageList.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Balance / Activity Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ਕਿਸਾਨ ਸਟੇਟਸ (Farmer Status)
            </label>
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
            >
              <option value="ALL">ਸਾਰੇ ਕਿਸਾਨ (All Farmers)</option>
              <option value="PAYABLE">ਬਾਕੀ ਦੇਣਯੋਗ ਵਾਲੇ (Payable to Farmer &gt; 0)</option>
              <option value="DUE">ਕਿਸਾਨ ਵੱਲ ਬਕਾਇਆ (Due from Farmer &lt; 0)</option>
              <option value="TODAY_WEIGHED">ਅੱਜ ਦੀ ਤੁਲਾਈ ਵਾਲੇ (Weighed Today)</option>
              <option value="HAS_ADVANCE">ਐਡਵਾਂਸ ਬਕਾਇਆ ਵਾਲੇ (Has Advance/Interest)</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ਕਿਸਾਨ ਖੋਜ (Search Farmer)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ਨਾਮ, ਪਿੰਡ, ਮੋਬਾਈਲ ਲਿਖੋ..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Counter & Copy Numbers Action */}
          <div className="flex flex-col justify-end">
            <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-slate-600">
              <span>ਚੁਣੇ ਗਏ: <strong className="text-emerald-700">{selectedFarmerIds.size}</strong> / {filteredFarmerData.length}</span>
              <button
                onClick={handleCopyNumbers}
                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-bold transition"
                title="Copy phone numbers"
              >
                {copiedNumbers ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedNumbers ? 'ਨੰਬਰ ਕਾਪੀ ਹੋ ਗਏ' : 'ਨੰਬਰ ਕਾਪੀ ਕਰੋ'}</span>
              </button>
            </div>
            <button
              onClick={handleToggleSelectAll}
              className="w-full py-1.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-800 transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              {selectedFarmerIds.size === filteredFarmerData.length && filteredFarmerData.length > 0 ? (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  <span>ਸਾਰੇ ਅਣ-ਚੁਣੇ ਕਰੋ (Deselect All)</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ਸਾਰੇ ਚੁਣੋ (Select All {filteredFarmerData.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Template Selector Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-slate-700 mr-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>ਸੁਨੇਹਾ ਟੈਮਪਲੇਟ (Template):</span>
          </span>

          <button
            onClick={() => setSelectedTemplate('SEASON_SUMMARY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedTemplate === 'SEASON_SUMMARY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ਸੀਜ਼ਨ ਖਾਤਾ ਬਕਾਇਆ (Season Balance)</span>
          </button>

          <button
            onClick={() => setSelectedTemplate('TODAY_WEIGHMENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedTemplate === 'TODAY_WEIGHMENT'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ਅੱਜ ਦੀ ਤੁਲਾਈ ਪੁਸ਼ਟੀ (Today's Weighment)</span>
          </button>

          <button
            onClick={() => setSelectedTemplate('MANDI_NOTICE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedTemplate === 'MANDI_NOTICE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>ਮੰਡੀ ਆਮ ਸੂਚਨਾ (Mandi Notice)</span>
          </button>

          <button
            onClick={() => setSelectedTemplate('CUSTOM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              selectedTemplate === 'CUSTOM'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>ਕਸਟਮ ਮੈਸੇਜ (Custom Editor)</span>
          </button>

          {/* Quick Auto-Send Next Unsent */}
          <div className="ml-auto">
            <button
              onClick={handleSendNext}
              disabled={!nextUnsentItem}
              className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition shadow-2xs ${
                nextUnsentItem
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>ਅਗਲਾ ਸੁਨੇਹਾ ਭੇਜੋ (Send Next Unsent)</span>
              {nextUnsentItem && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {nextUnsentItem.farmer.farmerNamePa || nextUnsentItem.farmer.farmerName}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content: Split View (Left: Farmers Queue, Right: Message Preview / Custom Editor) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 flex-1 overflow-hidden min-h-[380px]">
          
          {/* LEFT: Farmers Table List (7 Cols) */}
          <div className="lg:col-span-7 border-r border-slate-200 flex flex-col overflow-hidden bg-white">
            <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 flex items-center justify-between">
              <span>ਕਿਸਾਨ ਸੂਚੀ ({filteredFarmerData.length} ਮਿਲੇ)</span>
              <span>ਭੇਜੇ ਗਏ: <strong className="text-emerald-600">{Object.keys(sentRecords).length}</strong></span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredFarmerData.length === 0 ? (
                <div className="p-10 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">ਕੋਈ ਕਿਸਾਨ ਨਹੀਂ ਮਿਲਿਆ (No farmers found)</p>
                  <p className="text-[11px] text-slate-400">ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਫਿਲਟਰ ਜਾਂ ਖੋਜ ਸ਼ਬਦ ਬਦਲੋ।</p>
                </div>
              ) : (
                filteredFarmerData.map((item) => {
                  const f = item.farmer;
                  const isSelected = selectedFarmerIds.has(f.id);
                  const isSent = !!sentRecords[f.id];
                  const hasPhone = !!cleanMobileForWhatsApp(f.mobile);
                  const isPreviewing = activePreviewFarmerData?.farmer.id === f.id;

                  return (
                    <div
                      key={f.id}
                      onClick={() => setPreviewFarmerId(f.id)}
                      className={`p-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                        isPreviewing ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      } ${!hasPhone ? 'opacity-65' : ''}`}
                    >
                      {/* Selection Checkbox & Basic Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFarmer(f.id);
                          }}
                          className="text-slate-400 hover:text-emerald-600 transition shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {f.farmerNamePa || f.farmerName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">({f.id})</span>
                            {item.todayWeighments.length > 0 && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-extrabold rounded">
                                ਅੱਜ ਤੁਲਾਈ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                            <span>{f.villagePa || f.village || 'ਪਿੰਡ —'}</span>
                            <span>•</span>
                            <span className={`flex items-center gap-0.5 ${hasPhone ? 'text-slate-600' : 'text-rose-500 font-bold'}`}>
                              <Phone className="w-2.5 h-2.5" />
                              {f.mobile || 'ਮੋਬਾਈਲ ਨਹੀਂ ਹੈ'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Balance & Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className={`text-xs font-mono font-black ${
                            item.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {formatCurrency(Math.abs(item.netBalance))}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400">
                            {item.netBalance >= 0 ? 'ਦੇਣਯੋਗ (Payable)' : 'ਬਕਾਇਆ (Due)'}
                          </div>
                        </div>

                        {/* Send Button or Sent Status */}
                        {isSent ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black flex items-center gap-1 border border-emerald-300">
                            <Check className="w-3 h-3" />
                            <span>ਭੇਜਿਆ ({sentRecords[f.id].sentAt})</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendToFarmer(item);
                            }}
                            disabled={!hasPhone}
                            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                              hasPhone
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                            title="Open WhatsApp"
                          >
                            <Send className="w-3 h-3" />
                            <span>ਭੇਜੋ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Message Preview / Custom Editor (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col bg-slate-50 overflow-hidden">
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] font-extrabold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>ਲਾਈਵ ਸੁਨੇਹਾ ਝਲਕ (Live Message Preview)</span>
              </span>
              <button
                onClick={handleCopyCurrentMessage}
                className="text-emerald-700 hover:text-emerald-900 text-[10px] font-bold flex items-center gap-1 transition"
                title="Copy current message text"
              >
                {copiedCurrentMsg ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurrentMsg ? 'ਕਾਪੀ ਹੋ ਗਿਆ' : 'ਸੁਨੇਹਾ ਕਾਪੀ'}</span>
              </button>
            </div>

            {/* Custom Template Variable Tags Helper if custom template is chosen */}
            {selectedTemplate === 'CUSTOM' && (
              <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-[11px] space-y-1.5">
                <div className="font-bold text-amber-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>ਵਰਤਣਯੋਗ ਵੇਰੀਏਬਲ (Click to insert merge tags):</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[
                    '{FARMER_NAME}',
                    '{FARMER_NAME_PA}',
                    '{FARMER_ID}',
                    '{VILLAGE}',
                    '{NET_BALANCE}',
                    '{TOTAL_BAGS}',
                    '{TOTAL_WEIGHT}',
                    '{FIRM_NAME}',
                    '{MANDI_NAME}'
                  ].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCustomMessage(prev => prev + ' ' + tag)}
                      className="px-1.5 py-0.5 bg-white border border-amber-300 rounded font-mono text-[10px] text-amber-900 hover:bg-amber-100 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full mt-1 p-2 bg-white border border-amber-300 rounded-lg text-xs font-mono focus:outline-none focus:border-amber-500"
                  placeholder="ਆਪਣਾ ਸੁਨੇਹਾ ਇੱਥੇ ਲਿਖੋ..."
                />
              </div>
            )}

            {/* Preview Box styled like a WhatsApp Chat Bubble */}
            <div className="flex-1 p-4 overflow-y-auto">
              {activePreviewFarmerData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      ਪ੍ਰੀਵਿਊ ਕਿਸਾਨ: <strong className="text-slate-800">{activePreviewFarmerData.farmer.farmerNamePa || activePreviewFarmerData.farmer.farmerName}</strong>
                    </span>
                    <span>ਮੋਬਾਈਲ: {activePreviewFarmerData.farmer.mobile || '—'}</span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs text-xs text-slate-900 whitespace-pre-wrap font-mono leading-relaxed relative">
                    {previewMessageText}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleSendToFarmer(activePreviewFarmerData)}
                      disabled={!cleanMobileForWhatsApp(activePreviewFarmerData.farmer.mobile)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>ਇਸ ਕਿਸਾਨ ਨੂੰ WhatsApp ਭੇਜੋ ({activePreviewFarmerData.farmer.farmerNamePa || activePreviewFarmerData.farmer.farmerName})</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ਕਿਸੇ ਕਿਸਾਨ ਦੀ ਚੋਣ ਕਰੋ ਤਾਂ ਜੋ ਸੁਨੇਹਾ ਦੇਖਿਆ ਜਾ ਸਕੇ
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 text-[11px]">
            💡 <strong>ਸੁਝਾਅ:</strong> ਵ੍ਹਟਸਐਪ ਨਿਯਮਾਂ ਅਨੁਸਾਰ ਬ੍ਰਾਊਜ਼ਰ ਤੋਂ ਸੁਨੇਹਾ ਭੇਜਣ ਵੇਲੇ 'Send Next' ਬਟਨ ਦਬਾਉਂਦੇ ਜਾਓ, ਇਹ ਆਪਣੇ ਆਪ ਹਰ ਕਿਸਾਨ ਦੀ ਚੈਟ ਖੋਲ੍ਹੇਗਾ।
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 transition"
            >
              ਬੰਦ ਕਰੋ (Close)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
