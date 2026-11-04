import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, Bell, Globe, LogOut, User as UserIcon, 
  Menu, X, CheckCircle, ChevronDown 
} from 'lucide-react';

interface NavbarProps {
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, isMobileMenuOpen }) => {
  const { user, society, logout, language, setLanguage, t, quickSwitchRole } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
  };

  const roles = [
    { key: 'super_admin', label: 'Super Admin', bn: 'সুপার এডমিন' },
    { key: 'admin', label: 'Admin', bn: 'এডমিন' },
    { key: 'president', label: 'President', bn: 'সভাপতি' },
    { key: 'general_secretary', label: 'General Secretary', bn: 'সাধারণ সম্পাদক' },
    { key: 'treasurer', label: 'Treasurer', bn: 'কোষাধ্যক্ষ' },
    { key: 'advisor', label: 'Advisor', bn: 'উপদেষ্টা' },
    { key: 'general_member', label: 'General Member', bn: 'সাধারণ সদস্য' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Banner: Strict No-Loan Requirement */}
      <div className="bg-amber-500 text-slate-900 px-4 py-1 text-xs font-semibold flex items-center justify-center gap-2 text-center">
        <ShieldAlert className="w-4 h-4 shrink-0 text-slate-950" />
        <span>{t('noLoansBanner')}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Society Name */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={onMenuToggle}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
                aria-label="Toggle Navigation"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
            
            <a href="/" className="flex items-center gap-3">
              <img
                src={society?.logo_url || '/logo.svg'}
                alt="Logo"
                className="w-10 h-10 object-contain drop-shadow"
              />
              <div className="leading-tight">
                <h1 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight line-clamp-1">
                  {language === 'bn' ? society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি' : society?.name_en || 'Progoti Kalyan Somobay Samity'}
                </h1>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {t('tagline')} • {society?.reg_no || 'নিবন্ধিত সমবায়'}
                </p>
              </div>
            </a>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Role Switcher (Crucial for testing all 7 primary dashboards) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                  title="Switch between 7 roles"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold">{t(user.role as any)}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showRoleSwitcher && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {language === 'bn' ? 'টেস্ট রোল পরিবর্তন করুন' : 'Switch Role (Test Mode)'}
                    </div>
                    {roles.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => {
                          quickSwitchRole(r.key);
                          setShowRoleSwitcher(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition ${
                          user.role === r.key ? 'bg-emerald-100/60 font-bold text-emerald-900' : 'text-slate-700'
                        }`}
                      >
                        <span>{language === 'bn' ? r.bn : r.label}</span>
                        {user.role === r.key && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
              title="Toggle English / বাংলা"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Notifications */}
            {user && (
              <div className="relative">
                <button
                  onClick={handleNotificationClick}
                  className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {(user.unreadNotificationsCount || 0) > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {user.unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700">{t('notifications')}</span>
                      <button
                        onClick={async () => {
                          await fetch('/api/notifications/mark-all-read', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
                          });
                          fetchNotifications();
                        }}
                        className="text-[11px] text-emerald-600 hover:underline"
                      >
                        {language === 'bn' ? 'সব পঠিত হিসেবে চিহ্নিত করুন' : 'Mark all as read'}
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          {language === 'bn' ? 'কোনো নতুন বিজ্ঞপ্তি নেই' : 'No new notifications'}
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-3 text-xs ${n.is_read ? 'opacity-70' : 'bg-emerald-50/50'}`}>
                            <p className="font-semibold text-slate-800">{n.title}</p>
                            <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile / Logout */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-bold text-slate-800 leading-none">
                    {language === 'bn' ? user.fullNameBn : user.fullNameEn || user.fullNameBn}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.memberId}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title={t('logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
              >
                {t('login')}
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
