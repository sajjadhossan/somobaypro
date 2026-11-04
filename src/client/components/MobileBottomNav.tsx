import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CreditCard, CheckSquare, Receipt, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onMenuToggle: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentPath, onNavigate, onMenuToggle }) => {
  const { user, language } = useAuth();
  if (!user) return null;

  const isMember = user.role === 'general_member';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 md:hidden shadow-lg safe-area-pb">
      <div className="flex items-center justify-around">
        {/* Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition ${
            currentPath === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{language === 'bn' ? 'হোম' : 'Home'}</span>
        </button>

        {/* Subscription or Payments depending on role */}
        <button
          onClick={() => onNavigate(isMember ? 'my-subscription' : 'payments')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition ${
            currentPath === (isMember ? 'my-subscription' : 'payments')
              ? 'text-emerald-700 font-bold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">
            {isMember ? (language === 'bn' ? 'চাঁদা' : 'Subscription') : (language === 'bn' ? 'পেমেন্টস' : 'Payments')}
          </span>
        </button>

        {/* Action Button: Submit Bank Deposit (Member) or Approvals (Admin) */}
        {isMember ? (
          <button
            onClick={() => onNavigate('submit-deposit')}
            className="flex flex-col items-center justify-center -mt-4 bg-emerald-600 text-white rounded-full p-2.5 shadow-lg border-2 border-white hover:bg-emerald-700 active:scale-95 transition"
            title="ব্যাংক জমা দাখিল"
          >
            <CheckSquare className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={() => onNavigate('receipts')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition ${
              currentPath === 'receipts' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{language === 'bn' ? 'রসিদ' : 'Receipts'}</span>
          </button>
        )}

        {/* Receipts (Member) or Members (Admin) */}
        {isMember ? (
          <button
            onClick={() => onNavigate('my-receipts')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition ${
              currentPath === 'my-receipts' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{language === 'bn' ? 'রসিদ' : 'Receipts'}</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate('members')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition ${
              currentPath === 'members' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{language === 'bn' ? 'সদস্য' : 'Members'}</span>
          </button>
        )}

        {/* More Menu Drawer */}
        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center py-1 px-2 text-slate-500 hover:text-slate-900 rounded-lg transition"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{language === 'bn' ? 'মেনু' : 'Menu'}</span>
        </button>
      </div>
    </nav>
  );
};
