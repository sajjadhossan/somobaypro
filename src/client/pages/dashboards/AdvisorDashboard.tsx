import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, BookOpen, Calendar, HelpCircle, Send } from 'lucide-react';

export const AdvisorDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { society, language } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [recommendation, setRecommendation] = useState('');

  useEffect(() => {
    fetch('/api/settings/overview', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
    })
      .then((r) => r.json())
      .then(setMetrics)
      .catch(console.error);
  }, []);

  const handleSendRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendation.trim()) return;
    alert('উপদেষ্টা মহোদয়ের মূল্যবান পরামর্শ কার্যনির্বাহী পর্ষদের নিকট সফলভাবে প্রেরণ করা হয়েছে।');
    setRecommendation('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl">
        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-xs font-mono font-semibold">
          {language === 'bn' ? 'উপদেষ্টা পরিষদ ড্যাশবোর্ড' : 'Advisory Board Dashboard'}
        </span>
        <h1 className="text-2xl font-black mt-2">
          {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'} - উপদেষ্টা পর্ষদ
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          সমিতির কার্যধারা পর্যবেক্ষণ, আর্থিক স্বচ্ছতা নিরীক্ষা, সদস্য শৃঙ্খলা ও সমাজকল্যাণে দিকনির্দেশনা প্রদান।
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট সদস্য সংখ্যা</span>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {metrics?.memberStats?.total_members || 0}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">নিবন্ধিত কল্যাণকামী</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট সঞ্চিত চাঁদা</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">
            ৳{Number(metrics?.collectionStats?.total_approved_collection || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">অনুমোদিত আয়</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">মোট বকেয়া চাঁদা</span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">
            ৳{Number(metrics?.duesStats?.total_outstanding_dues || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-amber-600">সদস্যদের বকেয়া</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold">নিরাপদ ব্যাংক স্থিতি</span>
          <p className="text-2xl font-black text-blue-800 font-mono mt-1">
            ৳{Number(metrics?.bankBalances?.total_bank_balance || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">সংরক্ষিত তহবিল</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">উপদেষ্টা কর্তৃক পর্যবেক্ষণ লিঙ্ক:</h2>
          <div className="space-y-2 text-xs">
            <button
              onClick={() => onNavigate('members')}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border flex items-center justify-between text-left transition"
            >
              <span className="font-semibold text-slate-800">সদস্য ডিরেক্টরি পর্যালোচনা</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={() => onNavigate('accounting')}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border flex items-center justify-between text-left transition"
            >
              <span className="font-semibold text-slate-800">সোসাইটি ব্যালেন্স শীট ও আয়-ব্যয়</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={() => onNavigate('meetings')}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border flex items-center justify-between text-left transition"
            >
              <span className="font-semibold text-slate-800">বিগত সভার সিদ্ধান্ত ও রেজুলেশন</span>
              <Calendar className="w-4 h-4 text-teal-600" />
            </button>
          </div>
        </div>

        {/* Submit Advisory Recommendations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">কার্যনির্বাহী পর্ষদে পরামর্শ দাখিল:</h2>
          <form onSubmit={handleSendRecommendation} className="space-y-3 text-xs">
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={4}
              placeholder="সমিতির কল্যাণ, আর্থিক ব্যবস্থাপনা বা কার্যক্রম সংক্রান্ত দিকনির্দেশনা লিখুন..."
              className="w-full p-2.5 bg-slate-50 border rounded-xl"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow"
              >
                <Send className="w-3.5 h-3.5" />
                <span>পরামর্শ প্রেরণ করুন</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
