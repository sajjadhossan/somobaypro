import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, TrendingUp, BookOpen, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';

export const PresidentDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
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
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-mono font-semibold">
          {language === 'bn' ? 'সভাপতি মহোদয়ের ড্যাশবোর্ড' : 'President Dashboard'}
        </span>
        <h1 className="text-2xl font-black mt-2">
          {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'} - কার্যনির্বাহী পর্ষদ
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          সমিতির সর্বোচ্চ নীতি-নির্ধারণ, আয়-ব্যয় পর্যালোচনা, রেজুলেশন ও আর্থিক স্বচ্ছতার উচ্চপর্যায়ের তদারকি।
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">সক্রিয় সদস্য সংখ্যা</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {metrics?.memberStats?.active_members || 0}
          </p>
          <p className="text-[11px] text-emerald-600">মোট সদস্য: {metrics?.memberStats?.total_members || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট অনুমোদিত চাঁদা</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
            ৳{Number(metrics?.collectionStats?.total_approved_collection || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">ডিজিটাল রসিদ জারিকৃত</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">বকেয়া চাঁদা স্থিতি</span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">
            ৳{Number(metrics?.duesStats?.total_outstanding_dues || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-amber-600">আদায়ের অপেক্ষায়</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট ব্যাংক স্থিতি</span>
          <p className="text-2xl font-black text-blue-800 font-mono mt-1">
            ৳{Number(metrics?.bankBalances?.total_bank_balance || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">সোনালী ও ডাচ-বাংলা ব্যাংক</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">কার্যনির্বাহী পর্ষদের দায়িত্ব ও ক্ষমতা:</h2>
          <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
            <li>সমিতির সকল সদস্যের সক্রিয়তা ও মাসিক চাঁদা আদায়ের অগ্রগতি পর্যবেক্ষণ।</li>
            <li>কোষাধ্যক্ষ কর্তৃক যাচাইকৃত গুরুত্বপূর্ণ আর্থিক লেনদেনের অনুমোদন।</li>
            <li>বার্ষিক সাধারণ সভা (AGM) ও দ্বি-মাসিক সভার সিদ্ধান্তের রেজুলেশন পর্যালোচনা।</li>
            <li>সোসাইটির নিয়ম ও উপ-আইনের সুষ্ঠু বাস্তবায়ন নিশ্চিতকরণ।</li>
          </ul>
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => onNavigate('accounting')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
            >
              আর্থিক লেজার দেখুন
            </button>
            <button
              onClick={() => onNavigate('meetings')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition"
            >
              সভা রেজুলেশন
            </button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">অনুমোদন অপেক্ষমাণ জমা তথ্য:</h2>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <p className="font-bold">কোষাধ্যক্ষ কর্তৃক জমাকৃত স্লিপ যাচাই চলছে।</p>
            <p>মোট পেন্ডিং আবেদন: {metrics?.pendingSubmissions?.pending_submissions_count || 0} টি (৳{Number(metrics?.pendingSubmissions?.pending_submissions_amount || 0).toLocaleString('en-IN')})</p>
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <span>পেমেন্ট অনুমোদন তালিকায় যান</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
