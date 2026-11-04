import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime, useRealtimeRefresh } from '../../context/RealtimeContext';
import { 
  CreditCard, CheckSquare, Receipt, AlertCircle, 
  CheckCircle2, Clock, QrCode, ArrowRight, UserCheck, ShieldCheck, Download, Wifi, RefreshCw, IdCard,
  BookOpen, Camera
} from 'lucide-react';
import { ReceiptModal } from '../../components/ReceiptModal';
import { PassbookModal } from '../../components/PassbookModal';
import { SelfKycModal } from '../../components/SelfKycModal';

interface MemberDashboardProps {
  onNavigate: (path: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({ onNavigate }) => {
  const { user, society, language } = useAuth();
  const { isConnected, onlineDevices } = useRealtime();
  const [subData, setSubData] = useState<any>(null);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showPassbook, setShowPassbook] = useState(false);
  const [showSelfKyc, setShowSelfKyc] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMemberDashboard = async () => {
    try {
      const token = localStorage.getItem('pkss_token');
      // Subscriptions summary
      const subRes = await fetch('/api/subscriptions/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (subRes.ok) {
        const data = await subRes.json();
        setSubData(data);
      }

      // Receipts
      const recRes = await fetch('/api/receipts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (recRes.ok) {
        const data = await recRes.json();
        setRecentReceipts(data.receipts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberDashboard();
  }, []);

  // Instant real-time multi-device sync: auto re-fetch whenever any payment/receipt changes
  useRealtimeRefresh((detail) => {
    if (!detail?.entity || ['payments', 'submissions', 'receipts', 'dues'].includes(detail.entity)) {
      fetchMemberDashboard();
    }
  });

  return (
    <div className="space-y-6">
      {/* Member Profile Identity Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-emerald-300 shadow-inner">
              {user?.fullNameBn.slice(0, 1)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{language === 'bn' ? 'সক্রিয় সদস্য (Active Member)' : 'Active Member'}</span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isConnected
                      ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                      : 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <span>{isConnected ? `লাইভ ক্লাউড সিঙ্ক (${onlineDevices} ডিভাইস)` : 'পুনঃসংযোগ...'}</span>
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                {language === 'bn' ? user?.fullNameBn : user?.fullNameEn || user?.fullNameBn}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-mono">
                মেম্বার আইডি: <strong className="text-emerald-400 font-bold">{user?.memberId}</strong> • {user?.mobile}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button
              onClick={() => setShowPassbook(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs sm:text-sm border border-white/20 shadow-md backdrop-blur-md flex items-center justify-center gap-2 transition"
              title="ডিজিটাল সঞ্চয় পাসবুক ও খতিয়ান দেখুন বা প্রিন্ট করুন"
            >
              <BookOpen className="w-4 h-4 text-emerald-300" />
              <span>{language === 'bn' ? 'সঞ্চয় পাসবুক' : 'Passbook'}</span>
            </button>
            <button
              onClick={() => setShowSelfKyc(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs sm:text-sm border border-white/20 shadow-md backdrop-blur-md flex items-center justify-center gap-2 transition"
              title="প্রোফাইল ছবি ও নমিনি কেওয়াইসি আপডেট"
            >
              <Camera className="w-4 h-4 text-teal-300" />
              <span>{language === 'bn' ? 'ছবি ও নমিনি' : 'Self-KYC'}</span>
            </button>
            <button
              onClick={() => onNavigate('id-card')}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs sm:text-sm border border-white/20 shadow-md backdrop-blur-md flex items-center justify-center gap-2 transition"
            >
              <IdCard className="w-4 h-4 text-emerald-300" />
              <span>{language === 'bn' ? 'আইডি কার্ড' : 'ID Card'}</span>
            </button>
            <button
              onClick={() => onNavigate('submit-deposit')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 rounded-2xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition"
            >
              <CheckSquare className="w-4 h-4" />
              <span>{language === 'bn' ? 'ব্যাংক জমা দাখিল' : 'Submit Deposit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Financial Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Subscription Obligation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'মাসিক চাঁদা হার' : 'Monthly Rate'}</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ৳{Number(subData?.currentRate || 1000).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">প্রতি মাসের ১৫ তারিখের মধ্যে</p>
        </div>

        {/* Total Paid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'মোট অনুমোদিত পরিশোধ' : 'Total Paid'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            ৳{Number(subData?.totalPaid || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">রসিদ সংবলিত অনুমোদিত</p>
        </div>

        {/* Total Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'মোট বকেয়া চাঁদা' : 'Outstanding Due'}</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
            ৳{Number(subData?.totalDue || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-amber-600 font-medium">
            {subData?.unpaidMonthsCount || 0} মাসের চাঁদা বকেয়া
          </p>
        </div>

        {/* Pending Submissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{language === 'bn' ? 'যাচাইাধীন জমা' : 'Pending Verification'}</span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-blue-800 font-mono">
            ৳{Number(subData?.pendingAmount || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500">কোষাধ্যক্ষের অনুমোদনের অপেক্ষায়</p>
        </div>
      </div>

      {/* Two Column Layout: Monthly Dues Record & Recent Digital Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Month-wise Dues Record */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'মাসভিত্তিক চাঁদার হিসাব' : 'Monthly Subscription Breakdown'}
              </h2>
              <p className="text-xs text-slate-500">প্রতি মাসের চাঁদার অবস্থা ও পরিশোধের বিবরণ</p>
            </div>
            <button
              onClick={() => onNavigate('my-subscription')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>বিস্তারিত</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {subData?.dues?.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">কোনো রেকর্ড পাওয়া যায়নি।</div>
            ) : (
              subData?.dues?.map((d: any) => (
                <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 font-mono">{d.billing_month}</span>
                    <p className="text-[11px] text-slate-500">নির্ধারিত: ৳{d.due_amount} • পরিশোধ: ৳{d.paid_amount}</p>
                  </div>
                  <div>
                    {d.status === 'paid' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        পরিশোধিত
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        বকেয়া (Unpaid)
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Approved Digital Receipts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {language === 'bn' ? 'আমার অনুমোদিত ডিজিটাল রসিদ' : 'My Approved Digital Receipts'}
              </h2>
              <p className="text-xs text-slate-500">কিউআর কোড যুক্ত অফিশিয়াল মানি রিসিট</p>
            </div>
            <button
              onClick={() => onNavigate('my-receipts')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>সব রসিদ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentReceipts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                এখনও কোনো ডিজিটাল রসিদ অনুমোদিত হয়নি।
              </div>
            ) : (
              recentReceipts.map((r: any) => (
                <div key={r.id} className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-slate-900">{r.receipt_number}</p>
                      <p className="text-slate-500">মাস: {r.payment_months} • {r.bank_name}</p>
                      <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                        ৳{Number(r.amount).toLocaleString('en-IN')}/-
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReceipt(r)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>রসিদ দেখুন</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Official Bank Account Information Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>সোসাইটির অফিশিয়াল ব্যাংক হিসাবসমূহ (চাঁদা জমা দেওয়ার মাধ্যম)</span>
        </div>
        <p className="text-xs text-slate-300">
          সদস্যবৃন্দ শুধুমাত্র নিচের ব্যাংক হিসাবে সরাসরি অথবা অনলাইন/অ্যাপ ট্রান্সফারের মাধ্যমে চাঁদা জমা দিবেন। জমা শেষে ডিপোজিট স্লিপের ছবি বা রেফারেন্স নম্বর সিস্টেমে দাখিল করে ডিজিটাল রসিদ গ্রহণ করবেন।
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs space-y-1">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">প্রধান ব্যাংক হিসাব</span>
            <p className="font-bold text-white text-sm">Sonali Bank PLC</p>
            <p className="text-slate-400">হিসাবের নাম: Progoti Kalyan Somobay Samity</p>
            <p className="font-mono text-emerald-300 font-bold">হিসাব নং: 0102030405060</p>
            <p className="text-slate-500 text-[10px]">শাখা: ধানমন্ডি শাখা, ঢাকা • রাউটিং: 200261144</p>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs space-y-1">
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">দ্বিতীয় ব্যাংক হিসাব</span>
            <p className="font-bold text-white text-sm">Dutch-Bangla Bank PLC</p>
            <p className="text-slate-400">হিসাবের নাম: Progoti Kalyan Somobay Samity</p>
            <p className="font-mono text-emerald-300 font-bold">হিসাব নং: 1151200034567</p>
            <p className="text-slate-500 text-[10px]">শাখা: সাতমসজিদ রোড শাখা, ঢাকা • রাউটিং: 090261345</p>
          </div>
        </div>
      </div>

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Digital Savings Passbook Modal */}
      {showPassbook && (
        <PassbookModal onClose={() => setShowPassbook(false)} />
      )}

      {/* Self-KYC Photo & Nominee Modal */}
      {showSelfKyc && (
        <SelfKycModal
          onClose={() => setShowSelfKyc(false)}
          onSuccess={fetchMemberDashboard}
        />
      )}
    </div>
  );
};
