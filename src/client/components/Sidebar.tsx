import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, CreditCard, CheckSquare, Receipt, 
  BookOpen, Calendar, Bell, FileText, HelpCircle, Shield, Settings, QrCode, UserCheck, BarChart3
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, isOpen, onClose }) => {
  const { user, t, language } = useAuth();
  if (!user) return null;

  const role = user.role;

  // Build role-tailored navigation items
  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, roles: ['super_admin', 'admin', 'president', 'general_secretary', 'treasurer', 'advisor', 'general_member'] },
    
    // Member-specific items
    { id: 'my-subscription', label: language === 'bn' ? 'আমার মাসিক চাঁদা' : 'My Subscription', icon: CreditCard, roles: ['general_member'] },
    { id: 'submit-deposit', label: language === 'bn' ? 'ব্যাংক জমা দাখিল' : 'Submit Bank Deposit', icon: CheckSquare, roles: ['general_member'] },
    { id: 'my-receipts', label: language === 'bn' ? 'আমার ডিজিটাল রসিদ' : 'My Digital Receipts', icon: Receipt, roles: ['general_member'] },
    
    // Official & Admin items
    { id: 'members', label: t('members'), icon: Users, roles: ['super_admin', 'admin', 'president', 'general_secretary', 'advisor'] },
    { id: 'subscriptions', label: t('subscriptions'), icon: CreditCard, roles: ['super_admin', 'admin', 'treasurer'] },
    { id: 'payments', label: t('payments'), icon: CheckSquare, roles: ['super_admin', 'admin', 'treasurer', 'president'] },
    { id: 'receipts', label: t('receipts'), icon: Receipt, roles: ['super_admin', 'admin', 'treasurer', 'president'] },
    { id: 'accounting', label: t('accounting'), icon: BookOpen, roles: ['super_admin', 'treasurer', 'president', 'advisor'] },
    
    // Reports & Ledger (All roles)
    { id: 'reports', label: language === 'bn' ? 'আর্থিক ও বকেয়া রিপোর্ট' : 'Reports & Ledger', icon: BarChart3, roles: ['super_admin', 'admin', 'president', 'general_secretary', 'treasurer', 'advisor', 'general_member'] },
    
    // Member ID Card (All roles)
    { id: 'id-card', label: language === 'bn' ? 'সদস্য ডিজিটাল আইডি' : 'Member ID Card', icon: UserCheck, roles: ['super_admin', 'admin', 'president', 'general_secretary', 'treasurer', 'advisor', 'general_member'] },

    // Common Society Management items
    { id: 'meetings', label: t('meetings'), icon: Calendar, roles: ['super_admin', 'general_secretary', 'president', 'admin', 'advisor', 'general_member'] },
    { id: 'notices', label: t('notices'), icon: Bell, roles: ['super_admin', 'admin', 'general_secretary', 'president', 'advisor', 'treasurer', 'general_member'] },
    { id: 'documents', label: t('documents'), icon: FileText, roles: ['super_admin', 'admin', 'general_secretary', 'president', 'advisor', 'general_member'] },
    { id: 'support', label: t('support'), icon: HelpCircle, roles: ['super_admin', 'admin', 'general_secretary', 'general_member'] },
    
    // Public Tools
    { id: 'verify', label: t('verifyReceipt'), icon: QrCode, roles: ['super_admin', 'admin', 'president', 'general_secretary', 'treasurer', 'advisor', 'general_member'] },

    // Security & Settings (Super Admin & Admin)
    { id: 'audit', label: t('audit'), icon: Shield, roles: ['super_admin', 'admin'] },
    { id: 'settings', label: t('settings'), icon: Settings, roles: ['super_admin'] },
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User Card */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-inner">
            {user.fullNameBn.slice(0, 1)}
          </div>
          <div className="overflow-hidden">
            <h2 className="font-semibold text-xs sm:text-sm text-white truncate">
              {language === 'bn' ? user.fullNameBn : user.fullNameEn || user.fullNameBn}
            </h2>
            <p className="text-[11px] text-emerald-400 font-medium truncate">{user.designation || t(user.role as any)}</p>
            <span className="text-[10px] text-slate-400 font-mono">{user.memberId}</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          <p className="font-mono text-emerald-500 font-semibold">v1.1.3 Production</p>
          <p className="mt-0.5 text-slate-500">Bangladeshi Kalyan Samity</p>
        </div>
      </aside>
    </>
  );
};
