import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, Phone, Eye, EyeOff, ShieldCheck, ArrowRight, 
  UserPlus, QrCode, AlertCircle, Sparkles, Building2 
} from 'lucide-react';

interface LoginProps {
  onNavigateRegister: () => void;
  onNavigateVerify: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateRegister, onNavigateVerify }) => {
  const { login, society, language, setLanguage, t } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Cannot connect to server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  // Demo accounts for instant 1-click testing of all 7 roles
  const testAccounts = [
    { role: 'super_admin', label: 'সুপার এডমিন', phone: '01711000001', pass: 'Password123!' },
    { role: 'admin', label: 'এডমিন', phone: '01711000002', pass: 'Password123!' },
    { role: 'president', label: 'সভাপতি', phone: '01711000003', pass: 'Password123!' },
    { role: 'general_secretary', label: 'সাধারণ সম্পাদক', phone: '01711000004', pass: 'Password123!' },
    { role: 'treasurer', label: 'কোষাধ্যক্ষ', phone: '01711000005', pass: 'Password123!' },
    { role: 'advisor', label: 'উপদেষ্টা', phone: '01711000006', pass: 'Password123!' },
    { role: 'general_member', label: 'সাধারণ সদস্য', phone: '01711000007', pass: 'Password123!' },
  ];

  const handleQuickFill = (acc: typeof testAccounts[0]) => {
    setIdentifier(acc.phone);
    setPassword(acc.pass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-white text-sm font-black">Somobay<span className="text-emerald-400">Pro</span></span>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">Cloud OS</span>
        </div>
        <button
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg text-white font-medium transition"
        >
          {language === 'bn' ? 'English' : 'বাংলা'}
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-md mx-auto w-full my-6 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Banner with SomobayPro Platform Logo + Active Society Profile */}
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 p-6 text-white text-center relative">
          <div className="w-16 h-16 mx-auto mb-2 bg-white p-2 rounded-2xl shadow-lg flex items-center justify-center">
            <img
              src="/somobaypro-logo.svg"
              alt="SomobayPro"
              className="w-full h-full object-contain"
            />
          </div>
          
          <h2 className="text-xl font-black tracking-tight font-sans">
            Somobay<span className="text-emerald-400">Pro</span>
          </h2>
          <p className="text-xs text-emerald-200">
            স্মার্ট সমবায় ও ডিজিটাল সোসাইটি অপারেটিং সিস্টেম
          </p>

          <div className="mt-3 bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10 text-left flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-emerald-300 font-semibold block uppercase">সোসাইটি প্রোফাইল:</span>
              <p className="text-xs font-bold text-white truncate">
                {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 inline-block bg-amber-400 text-slate-950 font-bold px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wide">
            কোনো প্রকার ঋণ প্রদান করা হয় না
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier (Mobile or Member ID) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'bn' ? 'মোবাইল নম্বর অথবা মেম্বার আইডি' : 'Mobile Number or Member ID'}
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 01711000001 বা 01711000007"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-600">{language === 'bn' ? 'আমাকে মনে রাখুন' : 'Remember me'}</span>
              </label>
              <span className="text-emerald-700 font-medium hover:underline cursor-pointer">
                {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <span>{loading ? 'প্রবেশ করা হচ্ছে...' : t('login')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-Fill 1-Click Role Logins for Testing */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'bn' ? 'ওয়ান-ক্লিক ডেমো লগইন (৭টি ভূমিকা):' : 'One-Click Role Login Demo:'}</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {testAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className="px-2 py-1.5 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 rounded-lg border border-slate-200 transition truncate text-left"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Public Action Links */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
            <button
              onClick={onNavigateRegister}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>{language === 'bn' ? 'অনলাইন সদস্য আবেদন' : 'Self-Register'}</span>
            </button>
            <button
              onClick={onNavigateVerify}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              <span>{language === 'bn' ? 'রসিদ অনলাইন যাচাই' : 'Verify QR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-2">
        <p>© 2026 SomobayPro • ক্লাউড সোসাইটি অপারেটিং প্ল্যাটফর্ম</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          নিরাপদ ডাবল-এন্ট্রি একাউন্টিং ও ডিজিটাল রসিদ সিস্টেম
        </p>
      </div>
    </div>
  );
};
