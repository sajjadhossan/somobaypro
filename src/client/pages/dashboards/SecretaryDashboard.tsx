import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, Bell, FileText, ArrowRight, UserPlus } from 'lucide-react';

export const SecretaryDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
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
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-full text-xs font-mono font-semibold">
          {language === 'bn' ? 'সাধারণ সম্পাদক ড্যাশবোর্ড' : 'General Secretary Dashboard'}
        </span>
        <h1 className="text-2xl font-black mt-2">
          {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'} - সচিবালয়
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          সদস্যপদ নিবন্ধন, আবেদন যাচাই, সভা আহ্বান, কার্যবিবরণী (Minutes) তৈরি ও সাংগঠনিক চিঠিপত্র পরিচালনা।
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => onNavigate('members')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-slate-950 flex items-center gap-1.5 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>সদস্য আবেদন পর্যালোচনা</span>
          </button>
          <button
            onClick={() => onNavigate('meetings')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>নতুন সভা আহ্বান</span>
          </button>
          <button
            onClick={() => onNavigate('notices')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            <Bell className="w-4 h-4 text-teal-400" />
            <span>নোটিশ প্রকাশ</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট নিবন্ধিত সদস্য</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {metrics?.memberStats?.total_members || 0}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">সদস্য রেজিস্টার সংরক্ষিত</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">পেন্ডিং সদস্যপদ আবেদন</span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">
            {metrics?.memberStats?.pending_members || 0}
          </p>
          <p className="text-[11px] text-amber-600">অনুমোদনের অপেক্ষায়</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">প্রকাশিত নোটিশ</span>
          <p className="text-2xl font-black text-teal-700 font-mono mt-1">
            {metrics?.recentNotices?.length || 0}
          </p>
          <p className="text-[11px] text-slate-500">সকলের জন্য উন্মুক্ত</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">খোলা সহায়তা টিকিট</span>
          <p className="text-2xl font-black text-indigo-700 font-mono mt-1">
            {metrics?.openTicketsCount || 0}
          </p>
          <p className="text-[11px] text-slate-500">উত্তর প্রদান আবশ্যক</p>
        </div>
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('members')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition text-left group"
        >
          <Users className="w-6 h-6 text-emerald-600 mb-2" />
          <h2 className="font-bold text-slate-900 text-sm">সদস্য তথ্য তালিকা</h2>
          <p className="text-xs text-slate-500 mt-1">সকল সদস্যের বিস্তারিত প্রোফাইল, এনআইডি ও নমিনি তথ্য</p>
        </button>

        <button
          onClick={() => onNavigate('meetings')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition text-left group"
        >
          <Calendar className="w-6 h-6 text-teal-600 mb-2" />
          <h2 className="font-bold text-slate-900 text-sm">মিটিং ও কার্যবিবরণী</h2>
          <p className="text-xs text-slate-500 mt-1">উপস্থিতি রেজিস্টার, সিদ্ধান্ত ও মিটিং ডকুমেন্টস</p>
        </button>

        <button
          onClick={() => onNavigate('documents')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition text-left group"
        >
          <FileText className="w-6 h-6 text-blue-600 mb-2" />
          <h2 className="font-bold text-slate-900 text-sm">গঠনতন্ত্র ও নথিপত্র</h2>
          <p className="text-xs text-slate-500 mt-1">সমবায় অধিদপ্তরের অনুমোদনপত্র ও অডিট কপি</p>
        </button>
      </div>
    </div>
  );
};
