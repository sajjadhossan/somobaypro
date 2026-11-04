import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckSquare, Receipt, BookOpen, CreditCard, ArrowRight, TrendingUp } from 'lucide-react';

export const TreasurerDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { society, language } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings/overview', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
    })
      .then((r) => r.json())
      .then(setMetrics)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-mono font-semibold">
          {language === 'bn' ? 'কোষাধ্যক্ষ (অর্থ সম্পাদক) ড্যাশবোর্ড' : 'Treasurer / Cashier Dashboard'}
        </span>
        <h1 className="text-2xl font-black mt-2">
          {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'} - অর্থ বিভাগ
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          সদস্যদের জমাকৃত ব্যাংক ডিপোজিট স্লিপ যাচাই, পেমেন্ট অনুমোদন, ডিজিটাল রসিদ প্রদান, ক্যাশ/ব্যাংক বুক ও সাধারণ জাবেদা সংরক্ষণ।
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => onNavigate('payments')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-slate-950 flex items-center gap-1.5 transition"
          >
            <CheckSquare className="w-4 h-4" />
            <span>ডিপোজিট স্লিপ যাচাই কিউ ({metrics?.pendingSubmissions?.pending_submissions_count || 0})</span>
          </button>
          <button
            onClick={() => onNavigate('accounting')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>ক্যাশ ও ব্যাংক বুক</span>
          </button>
          <button
            onClick={() => onNavigate('receipts')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>ডিজিটাল রসিদ রেজিস্টার</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">যাচাই অপেক্ষমাণ জমা</span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">
            {metrics?.pendingSubmissions?.pending_submissions_count || 0} টি
          </p>
          <p className="text-[11px] text-amber-600">মোট ৳{Number(metrics?.pendingSubmissions?.pending_submissions_amount || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট অনুমোদিত চাঁদা</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
            ৳{Number(metrics?.collectionStats?.total_approved_collection || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">{metrics?.collectionStats?.total_receipts_issued || 0}টি রসিদ ইস্যু</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট বকেয়া চাঁদা</span>
          <p className="text-2xl font-black text-rose-700 font-mono mt-1">
            ৳{Number(metrics?.duesStats?.total_outstanding_dues || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-rose-600">তাগাদা প্রেরণ আবশ্যক</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">ব্যাংক স্থিতির পরিমাণ</span>
          <p className="text-2xl font-black text-blue-800 font-mono mt-1">
            ৳{Number(metrics?.bankBalances?.total_bank_balance || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">অনুমোদিত ব্যাংকসমূহ</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">কোষাধ্যক্ষ কার্যক্রমের দ্রুত লিংক:</h2>
            <p className="text-xs text-slate-500">আর্থিক বিবরণী, ভাউচার এন্ট্রি ও চাঁদা রেজিস্টার</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('payments')}
            className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 hover:bg-emerald-100/60 transition text-left"
          >
            <CheckSquare className="w-5 h-5 text-emerald-700 mb-1" />
            <h3 className="font-bold text-slate-900 text-xs">স্লিপ যাচাই ও অনুমোদন</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">ব্যাংক স্টেটমেন্টের সাথে মিলিয়ে ডিজিটাল রসিদ ইস্যু</p>
          </button>

          <button
            onClick={() => onNavigate('accounting')}
            className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition text-left"
          >
            <BookOpen className="w-5 h-5 text-blue-700 mb-1" />
            <h3 className="font-bold text-slate-900 text-xs">খরচ ভাউচার এন্ট্রি</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">অফিস ভাড়া, বিদ্যুৎ বিল ও স্টাফ বেতন ভাউচার</p>
          </button>

          <button
            onClick={() => onNavigate('subscriptions')}
            className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition text-left"
          >
            <CreditCard className="w-5 h-5 text-amber-700 mb-1" />
            <h3 className="font-bold text-slate-900 text-xs">বকেয়া চাঁদা রেজিস্টার</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">মাসভিত্তিক বিলিং ও সদস্য চাঁদার হিসাব বিবরণী</p>
          </button>
        </div>
      </div>
    </div>
  );
};
