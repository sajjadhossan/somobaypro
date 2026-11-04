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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-3 py-1.5 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 relative ${
            currentPath === 'dashboard' 
              ? 'text-emerald-700 font-black scale-105' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${currentPath === 'dashboard' ? 'bg-emerald-100/70' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">{language === 'bn' ? 'হোম' : 'Home'}</span>
          {currentPath === 'dashboard' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute -bottom-0.5" />
          )}
        </button>

        {/* Subscription or Payments depending on role */}
        <button
          onClick={() => onNavigate(isMember ? 'my-subscription' : 'payments')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 relative ${
            currentPath === (isMember ? 'my-subscription' : 'payments')
              ? 'text-emerald-700 font-black scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-xl transition ${currentPath === (isMember ? 'my-subscription' : 'payments') ? 'bg-emerald-100/70' : ''}`}>
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">
            {isMember ? (language === 'bn' ? 'চাঁদা' : 'Subscription') : (language === 'bn' ? 'পেমেন্টস' : 'Payments')}
          </span>
          {currentPath === (isMember ? 'my-subscription' : 'payments') && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute -bottom-0.5" />
          )}
        </button>

        {/* Action Button: Submit Bank Deposit (Member) or Approvals (Admin) */}
        {isMember ? (
          <button
            onClick={() => onNavigate('submit-deposit')}
            className="flex flex-col items-center justify-center -mt-6 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-2xl p-3 shadow-lg shadow-emerald-900/30 border-4 border-slate-50 hover:from-emerald-500 hover:to-teal-400 active:scale-95 transition-all duration-200"
            title="ব্যাংক জমা দাখিল করুন"
          >
            <CheckSquare className="w-6 h-6" />
          </button>
        ) : (
          <button
            onClick={() => onNavigate('receipts')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 relative ${
              currentPath === 'receipts' ? 'text-emerald-700 font-black scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${currentPath === 'receipts' ? 'bg-emerald-100/70' : ''}`}>
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{language === 'bn' ? 'রসিদ' : 'Receipts'}</span>
            {currentPath === 'receipts' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute -bottom-0.5" />
            )}
          </button>
        )}

        {/* Receipts (Member) or Members (Admin) */}
        {isMember ? (
          <button
            onClick={() => onNavigate('my-receipts')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 relative ${
              currentPath === 'my-receipts' ? 'text-emerald-700 font-black scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${currentPath === 'my-receipts' ? 'bg-emerald-100/70' : ''}`}>
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{language === 'bn' ? 'রসিদ' : 'Receipts'}</span>
            {currentPath === 'my-receipts' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute -bottom-0.5" />
            )}
          </button>
        ) : (
          <button
            onClick={() => onNavigate('members')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 relative ${
              currentPath === 'members' ? 'text-emerald-700 font-black scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${currentPath === 'members' ? 'bg-emerald-100/70' : ''}`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{language === 'bn' ? 'সদস্য' : 'Members'}</span>
            {currentPath === 'members' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute -bottom-0.5" />
            )}
          </button>
        )}

        {/* More Menu Drawer */}
        <button
          onClick={onMenuToggle}
          className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-700 rounded-2xl transition-all duration-200"
          title="সকল মেন্যু"
        >
          <div className="p-1">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">{language === 'bn' ? 'মেনু' : 'Menu'}</span>
        </button>
      </div>
    </nav>
  );
};
