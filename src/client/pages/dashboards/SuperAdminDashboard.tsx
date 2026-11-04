import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, CreditCard, CheckSquare, Receipt, BookOpen, 
  ShieldCheck, AlertCircle, TrendingUp, Download, Plus, ArrowRight 
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onNavigate: (path: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigate }) => {
  const { society, language } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/settings/overview', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-mono font-semibold">
            {language === 'bn' ? 'সুপার এডমিন কন্ট্রোল সেন্টার' : 'Super Admin Command Center'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            সমিতির সকল কার্যক্রম, সদস্যপদ, দ্বি-প্রবিষ্টি (Double-entry) হিসাবরক্ষণ, ডিজিটাল রসিদ ও কিউআর যাচাই ব্যবস্থার সামগ্রিক চিত্র।
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => onNavigate('members')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'নতুন সদস্য যোগ করুন' : 'Add Member'}</span>
            </button>
            <button
              onClick={() => onNavigate('payments')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 font-semibold rounded-xl flex items-center gap-1.5 transition"
            >
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>{language === 'bn' ? 'পেমেন্ট যাচাই কিউ' : 'Payment Approvals'}</span>
            </button>
            <a
              href="/api/settings/backup"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 font-semibold rounded-xl flex items-center gap-1.5 transition"
              title="Download SQLite Database Backup"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'ডাটাবেস ব্যাকআপ' : 'Backup DB'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'মোট সদস্য' : 'Total Members'}</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {metrics?.memberStats?.total_members || 0}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">
            {metrics?.memberStats?.active_members || 0} সক্রিয় সদস্য
          </p>
        </div>

        {/* Total Collection */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'অনুমোদিত জমা' : 'Total Collection'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">
            ৳{Number(metrics?.collectionStats?.total_approved_collection || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">
            {metrics?.collectionStats?.total_receipts_issued || 0}টি ডিজিটাল রসিদ ইস্যু
          </p>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'মোট বকেয়া চাঁদা' : 'Total Outstanding'}</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 font-mono">
            ৳{Number(metrics?.duesStats?.total_outstanding_dues || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-amber-600 font-medium">পরিশোধের অপেক্ষায়</p>
        </div>

        {/* Bank Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'ব্যাংক মোট স্থিতি' : 'Bank Balance'}</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-800 font-mono">
            ৳{Number(metrics?.bankBalances?.total_bank_balance || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">সোনালী ও ডাচ-বাংলা ব্যাংক</p>
        </div>
      </div>

      {/* Two Column Layout: Pending Submissions Queue + System Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Deposit Submissions (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'যাচাই ও অনুমোদন অপেক্ষমাণ জমা' : 'Pending Bank Deposits'}
              </h2>
              <p className="text-xs text-slate-500">কোষাধ্যক্ষ ও এডমিন কর্তৃক ব্যাংক স্টেটমেন্ট মিলিয়ে অনুমোদন আবশ্যক</p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>সব দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics?.recentSubmissions?.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                কোনো পেন্ডিং ব্যাংক জমা নেই।
              </div>
            ) : (
              metrics?.recentSubmissions?.map((sub: any) => (
                <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{sub.full_name_bn} ({sub.member_id})</p>
                    <p className="text-slate-500 font-mono">
                      মাস: {sub.payment_months} • ট্রানজেকশন আইডি: {sub.transaction_id}
                    </p>
                    <span className="text-[10px] text-slate-400">জমার তারিখ: {sub.deposit_date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-700 text-sm block">
                      ৳{Number(sub.amount).toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => onNavigate('payments')}
                      className="mt-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold transition"
                    >
                      যাচাই করুন
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notices and Policy reminder */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              {language === 'bn' ? 'সাম্প্রতিক বিজ্ঞপ্তি' : 'Recent Notices'}
            </h2>
            <p className="text-xs text-slate-500">সোসাইটি সদস্যদের জন্য প্রকাশিত নোটিশ</p>
          </div>

          <div className="space-y-3">
            {metrics?.recentNotices?.map((n: any) => (
              <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    n.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {n.priority === 'urgent' ? 'জরুরি' : 'সাধারণ'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{n.publish_date}</span>
                </div>
                <p className="font-bold text-slate-800 line-clamp-1">{n.title_bn}</p>
                <p className="text-slate-600 line-clamp-2">{n.content_bn}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
