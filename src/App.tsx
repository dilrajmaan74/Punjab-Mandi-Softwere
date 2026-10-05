import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MandiProvider, useMandi } from './context/MandiContext';
import { NotificationProvider } from './context/NotificationContext';
import { GoogleSheetsSyncProvider } from './context/GoogleSheetsSyncContext';
import { AuthPortalModal } from './components/auth/AuthPortalModal';
import { ToastContainer } from './components/common/ToastContainer';
import { ConfirmationModal } from './components/common/ConfirmationModal';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { FarmerRegistration } from './components/farmer/FarmerRegistration';
import { MultiFarmerAdd } from './components/farmer/MultiFarmerAdd';
import { BankDetailsManager } from './components/farmer/BankDetailsManager';
import { BagsEntry } from './components/bags/BagsEntry';
import { SameDateMultiFarmerEntry } from './components/bags/SameDateMultiFarmerEntry';
import { FarmerSearch } from './components/farmer/FarmerSearch';
import { BardanaManagement } from './components/bardana/BardanaManagement';
import { DailyPurchase } from './components/purchase/DailyPurchase';
import { LeftingManagement } from './components/lefting/LeftingManagement';
import { BalanceChart } from './components/chart/BalanceChart';
import { RecycleBin } from './components/recycleBin/RecycleBin';
import { FarmerAccount } from './components/farmer/FarmerAccount';
import { MandiReports } from './components/reports/MandiReports';
import { FarmerBagBalanceReport } from './components/reports/FarmerBagBalanceReport';
import { BoliRegister } from './components/boli/BoliRegister';
import { LabourGangLedger } from './components/labour/LabourGangLedger';
import { SettingsManager } from './components/settings/SettingsManager';
import { ReceiptModal } from './components/common/ReceiptModal';
import { BagsEntryEditModal } from './components/bags/BagsEntryEditModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PakkaDashboard } from './components/pakka/PakkaDashboard';
import { IFormRegister } from './components/pakka/IFormRegister';
import { JFormRegister } from './components/pakka/JFormRegister';
import { KachaToPakkaTransferView } from './components/pakka/KachaToPakkaTransferView';
import { LedgerMasterView } from './components/pakka/LedgerMasterView';
import { VoucherEntryView } from './components/pakka/VoucherEntryView';
import { BalanceSheetView } from './components/pakka/BalanceSheetView';
import { ProfitLossView } from './components/pakka/ProfitLossView';
import { BankCashBookView } from './components/pakka/BankCashBookView';
import { DebtorsCreditorsView } from './components/pakka/DebtorsCreditorsView';
import { TDSRegisterView } from './components/pakka/TDSRegisterView';
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  UserPlus,
  Boxes,
  PackageCheck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  FileCheck,
  Scale,
  Landmark
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeSection, setActiveSection, activeReceipt, setActiveReceipt, appMode } = useMandi();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Global Toast Container */}
      <ToastContainer />

      {/* Global Confirmation Modal */}
      <ConfirmationModal />

      {/* Top Header */}
      <Header />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Viewport */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 max-w-7xl w-full mx-auto pb-16 lg:pb-5">
          {/* Kacha Mandi Sections */}
          {activeSection === 'dashboard' && <Dashboard />}
          {activeSection === 'farmer-account' && <FarmerAccount />}
          {activeSection === 'daily-purchase' && <DailyPurchase />}
          {activeSection === 'lefting' && <LeftingManagement />}
          {activeSection === 'balance-chart' && <BalanceChart />}
          {activeSection === 'recycle-bin' && <RecycleBin />}
          {activeSection === 'farmer-registration' && <FarmerRegistration />}
          {activeSection === 'multi-farmer-add' && <MultiFarmerAdd />}
          {activeSection === 'bank-details' && <BankDetailsManager />}
          {activeSection === 'bardana' && <BardanaManagement />}
          {activeSection === 'boli' && <BoliRegister />}
          {activeSection === 'bags-entry' && <BagsEntry />}
          {activeSection === 'same-date-multi-entry' && <SameDateMultiFarmerEntry />}
          {activeSection === 'search-farmer' && <FarmerSearch />}
          {activeSection === 'reports' && <MandiReports />}
          {activeSection === 'farmer-bag-balance-labour' && <FarmerBagBalanceReport />}
          {activeSection === 'labour-ledger' && <LabourGangLedger />}
          {activeSection === 'settings' && <SettingsManager />}

          {/* Pakka (Official & CA Mandi Accounting) Sections */}
          {activeSection === 'pakka-dashboard' && <PakkaDashboard />}
          {activeSection === 'iform-register' && <IFormRegister />}
          {activeSection === 'jform-register' && <JFormRegister />}
          {activeSection === 'pakka-transfer' && <KachaToPakkaTransferView />}
          {activeSection === 'pakka-ledgers' && <LedgerMasterView />}
          {activeSection === 'pakka-vouchers' && <VoucherEntryView />}
          {activeSection === 'pakka-balancesheet' && <BalanceSheetView />}
          {activeSection === 'pakka-profitloss' && <ProfitLossView />}
          {activeSection === 'pakka-bankcash' && <BankCashBookView />}
          {activeSection === 'pakka-debtors-creditors' && <DebtorsCreditorsView />}
          {activeSection === 'pakka-tds' && <TDSRegisterView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around z-30 shadow-md print:hidden">
        {appMode === 'PAKKA' ? (
          <>
            <button
              onClick={() => setActiveSection('pakka-dashboard')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'pakka-dashboard' ? 'text-blue-700 font-black' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ਪੱਕਾ ਬੋਰਡ</span>
            </button>

            <button
              onClick={() => setActiveSection('iform-register')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'iform-register' ? 'text-blue-700 font-black' : 'text-slate-500'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>I-Form</span>
            </button>

            <button
              onClick={() => setActiveSection('jform-register')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'jform-register' ? 'text-emerald-700 font-black' : 'text-slate-500'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>J-Form</span>
            </button>

            <button
              onClick={() => setActiveSection('pakka-ledgers')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'pakka-ledgers' ? 'text-indigo-700 font-black' : 'text-slate-500'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>ਲੈੱਜਰ</span>
            </button>

            <button
              onClick={() => setActiveSection('pakka-balancesheet')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'pakka-balancesheet' ? 'text-amber-700 font-black' : 'text-slate-500'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>ਬੈਲੇਂਸ ਸ਼ੀਟ</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
                activeSection === 'dashboard' ? 'text-emerald-700 font-black' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>ਡੈਸ਼ਬੋਰਡ</span>
            </button>

            <button
              onClick={() => setActiveSection('daily-purchase')}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
                activeSection === 'daily-purchase' ? 'text-emerald-700 font-black' : 'text-slate-500'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ਖਰੀਦ</span>
            </button>

            <button
              onClick={() => setActiveSection('bags-entry')}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-bold ${
                activeSection === 'bags-entry' ? 'text-amber-600 font-black' : 'text-slate-500'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>ਬੋਰੀਆਂ</span>
            </button>

            <button
              onClick={() => setActiveSection('farmer-registration')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'farmer-registration' ? 'text-emerald-700 font-black' : 'text-slate-500'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>ਕਿਸਾਨ</span>
            </button>

            <button
              onClick={() => setActiveSection('farmer-account')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'farmer-account' ? 'text-emerald-700 font-black' : 'text-slate-500'
              }`}
            >
              <User className="w-4 h-4" />
              <span>ਖਾਤਾ</span>
            </button>

            <button
              onClick={() => setActiveSection('reports')}
              className={`flex flex-col items-center py-1 px-1.5 rounded-lg text-[10px] font-bold ${
                activeSection === 'reports' ? 'text-rose-700 font-black' : 'text-slate-500'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ਰਿਪੋਰਟਾਂ</span>
            </button>
          </>
        )}
      </div>


      {/* Official Weighment Slip / Receipt Print Modal */}
      <ReceiptModal />

      {/* Farmer Bags Entry Edit Modal */}
      <BagsEntryEditModal />

      {/* Multi-Firm Pro Authentication & Registration Portal */}
      <AuthPortalModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MandiProvider>
          <NotificationProvider>
            <GoogleSheetsSyncProvider>
              <MainAppContent />
            </GoogleSheetsSyncProvider>
          </NotificationProvider>
        </MandiProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
