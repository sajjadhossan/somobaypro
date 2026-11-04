import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, CreditCard, CheckSquare, Receipt, Bell, Plus, ArrowRight } from 'lucide-react';

export const AdminDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
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
      <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-mono font-semibold">
          {language === 'bn' ? 'প্রশাসনিক ড্যাশবোর্ড' : 'Admin Operations Dashboard'}
        </span>
        <h1 className="text-2xl font-black mt-2">
          {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'} - প্রশাসন
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          সদস্য ব্যবস্থাপনা, আবেদন অনুমোদন, পেমেন্ট তদারকি, ডিজিটাল নোটিশ জারি ও সাপোর্ট কার্যক্রম।
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => onNavigate('members')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-xl text-slate-950 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন সদস্য নিবন্ধন</span>
          </button>
          <button
            onClick={() => onNavigate('payments')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 font-semibold rounded-xl flex items-center gap-1.5 transition"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>জমা অনুমোদন ({metrics?.pendingSubmissions?.pending_submissions_count || 0})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট সদস্য</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {metrics?.memberStats?.total_members || 0}
          </p>
          <p className="text-[11px] text-emerald-600">{metrics?.memberStats?.active_members || 0} সক্রিয়</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট চাঁদা সংগ্রহ</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
            ৳{Number(metrics?.collectionStats?.total_approved_collection || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">অনুমোদিত রসিদ</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">বকেয়া চাঁদা</span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">
            ৳{Number(metrics?.duesStats?.total_outstanding_dues || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-amber-600">পরিশোধের অপেক্ষায়</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">খোলা সাপোর্ট টিকিট</span>
          <p className="text-2xl font-black text-blue-700 font-mono mt-1">
            {metrics?.openTicketsCount || 0}
          </p>
          <p className="text-[11px] text-slate-500">সদস্য অভিযোগ</p>
        </div>
      </div>
    </div>
  );
};
