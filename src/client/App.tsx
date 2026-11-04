import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';

// Public Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyReceipt } from './pages/VerifyReceipt';

// Dashboards
import { SuperAdminDashboard } from './pages/dashboards/SuperAdminDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { PresidentDashboard } from './pages/dashboards/PresidentDashboard';
import { SecretaryDashboard } from './pages/dashboards/SecretaryDashboard';
import { TreasurerDashboard } from './pages/dashboards/TreasurerDashboard';
import { AdvisorDashboard } from './pages/dashboards/AdvisorDashboard';
import { MemberDashboard } from './pages/dashboards/MemberDashboard';

// Module Pages
import { MembersPage } from './pages/MembersPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReceiptsPage } from './pages/ReceiptsPage';
import { AccountingPage } from './pages/AccountingPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { NoticesPage } from './pages/NoticesPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { SupportPage } from './pages/SupportPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [publicView, setPublicView] = useState<'login' | 'register' | 'verify'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify')) return 'verify';
    if (path.startsWith('/register')) return 'register';
    return 'login';
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-emerald-400">ডিজিটাল সোসাইটি সিস্টেম লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Not logged in: Show Login, Public Self-Registration, or Public QR Verification
  if (!user) {
    if (publicView === 'verify') {
      return <VerifyReceipt />;
    }
    if (publicView === 'register') {
      return <Register onBackToLogin={() => setPublicView('login')} />;
    }
    return (
      <Login
        onNavigateRegister={() => setPublicView('register')}
        onNavigateVerify={() => setPublicView('verify')}
      />
    );
  }

  // Role-Specific Dashboard Renderer
  const renderDashboard = () => {
    switch (user.role) {
      case 'super_admin':
        return <SuperAdminDashboard onNavigate={setCurrentPath} />;
      case 'admin':
        return <AdminDashboard onNavigate={setCurrentPath} />;
      case 'president':
        return <PresidentDashboard onNavigate={setCurrentPath} />;
      case 'general_secretary':
        return <SecretaryDashboard onNavigate={setCurrentPath} />;
      case 'treasurer':
        return <TreasurerDashboard onNavigate={setCurrentPath} />;
      case 'advisor':
        return <AdvisorDashboard onNavigate={setCurrentPath} />;
      case 'general_member':
      default:
        return <MemberDashboard onNavigate={setCurrentPath} />;
    }
  };

  // Main Page Content Router
  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard':
        return renderDashboard();
      case 'members':
        return <MembersPage />;
      case 'subscriptions':
      case 'my-subscription':
        return <SubscriptionsPage />;
      case 'payments':
      case 'submit-deposit':
        return <PaymentsPage />;
      case 'receipts':
      case 'my-receipts':
        return <ReceiptsPage />;
      case 'accounting':
        return <AccountingPage />;
      case 'meetings':
        return <MeetingsPage />;
      case 'notices':
        return <NoticesPage />;
      case 'documents':
        return <DocumentsPage />;
      case 'support':
        return <SupportPage />;
      case 'audit':
        return <AuditPage />;
      case 'settings':
        return <SettingsPage />;
      case 'verify':
        return <VerifyReceipt />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar with Logo, No-Loan Banner, Language Toggle, and Role Switcher */}
      <Navbar
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobileMenuOpen={isSidebarOpen}
      />

      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <Sidebar
          currentPath={currentPath}
          onNavigate={setCurrentPath}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Thumb Navigation */}
      <MobileBottomNav
        currentPath={currentPath}
        onNavigate={setCurrentPath}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />
    </div>
  );
};
