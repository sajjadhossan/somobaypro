import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Printer, Download, X, BookOpen, CheckCircle2, ShieldCheck, UserCheck, Calendar } from 'lucide-react';

interface PassbookModalProps {
  memberId?: string;
  onClose: () => void;
}

export const PassbookModal: React.FC<PassbookModalProps> = ({ memberId, onClose }) => {
  const { user, society } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPassbook = async () => {
      try {
        const token = localStorage.getItem('pkss_token');
        const query = memberId ? `?memberId=${memberId}` : '';
        const res = await fetch(`/api/members/me/passbook${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPassbook();
  }, [memberId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl shadow-xl text-center font-bold text-slate-700 animate-pulse">
          ডিজিটাল পাসবুক ও খতিয়ান লোড হচ্ছে...
        </div>
      </div>
    );
  }

  const member = data?.member;
  const ledger = data?.ledger || [];
  const summary = data?.summary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">সদস্য সঞ্চয় পাসবুক ও বার্ষিক জমার বিবরণী</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF সংরক্ষণ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Passbook Body */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-900 bg-white" id="passbook-print-area">
          
          {/* Header Pad */}
          <div className="text-center border-b-2 border-slate-900/10 pb-4 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত সমবায় সমিতি</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
            </h1>
            <p className="text-xs text-slate-600">
              নিবন্ধন নং: {society?.reg_no || 'REG-DH-2018-0942'} • ঠিকানা: {society?.address || 'বাড়ি নং ১২, রোড নং ৪, ধানমন্ডি, ঢাকা'}
            </p>
            <div className="pt-2">
              <span className="inline-block px-4 py-1 bg-slate-900 text-white text-xs font-bold rounded-md uppercase tracking-wider">
                সদস্য সঞ্চয় খতিয়ান ও অফিশিয়াল পাসবুক (SAVINGS PASSBOOK)
              </span>
            </div>
          </div>

          {/* Member Bio & Summary 2-Col Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <p>সদস্যের নাম: <strong className="text-slate-900 font-bold">{member?.full_name_bn}</strong></p>
              <p>মেম্বার আইডি: <strong className="font-mono text-emerald-700 font-bold">{member?.member_id}</strong></p>
              <p>মোবাইল নম্বর: <span className="font-mono">{member?.mobile}</span></p>
              <p>এনআইডি নং: <span className="font-mono">{member?.nid_number || 'যাচাইকৃত'}</span></p>
              <p>সদস্যপদ স্ট্যাটাস: <span className="font-bold text-emerald-700 uppercase">{member?.membership_status}</span></p>
            </div>
            <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
              <p>মাসিক সঞ্চয় চাঁদা হার: <strong className="font-mono text-slate-900 font-bold">৳{Number(summary?.currentMonthlyRate || 1000).toLocaleString('bn-BD')}/-</strong></p>
              <p>মোট পুঞ্জীভূত সঞ্চয় জমা: <strong className="font-mono text-emerald-700 text-sm font-black">৳{Number(summary?.totalSavings || 0).toLocaleString('bn-BD')}/-</strong></p>
              <p>বর্তমান বকেয়া চাঁদা: <strong className="font-mono text-amber-700 font-bold">৳{Number(summary?.totalDue || 0).toLocaleString('bn-BD')}/-</strong></p>
              <p>মোট জমার সংখ্যা: <strong className="font-bold">{summary?.totalEntries || 0} টি রসিদ</strong></p>
              <p>স্টেটমেন্ট প্রস্তুতের তারিখ: <span className="font-mono">{new Date().toLocaleDateString('bn-BD')}</span></p>
            </div>
          </div>

          {/* Savings Ledger Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-white font-semibold">
                <tr>
                  <th className="p-2.5 text-center border-r border-slate-700 w-10">ক্র.</th>
                  <th className="p-2.5 border-r border-slate-700">জমা তারিখ</th>
                  <th className="p-2.5 border-r border-slate-700">হিসাবের মাস</th>
                  <th className="p-2.5 border-r border-slate-700">রসিদ ও ট্রানজেকশন</th>
                  <th className="p-2.5 border-r border-slate-700">জমা প্রদানকারী</th>
                  <th className="p-2.5 text-right border-r border-slate-700">জমা (টাকা)</th>
                  <th className="p-2.5 text-right font-bold text-emerald-300">মোট পুঞ্জীভূত সঞ্চয়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      কোনো অনুমোদিত সঞ্চয় জমার তথ্য পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  ledger.map((row: any) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono border-r border-slate-200">{row.sl}</td>
                      <td className="p-2.5 font-mono border-r border-slate-200 whitespace-nowrap">{row.depositDate}</td>
                      <td className="p-2.5 font-bold border-r border-slate-200">{row.paymentMonths}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <span className="font-mono font-bold text-slate-900 block">{row.receiptNumber}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{row.bankName} • {row.transactionId}</span>
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-[11px]">{row.depositorName}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                        ৳{Number(row.amount).toLocaleString('bn-BD')}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                        ৳{Number(row.runningBalance).toLocaleString('bn-BD')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="p-3 text-right">সর্বমোট পুঞ্জীভূত সঞ্চয় ব্যালেন্স:</td>
                  <td colSpan={2} className="p-3 text-right text-sm font-black font-mono text-emerald-800">
                    ৳{Number(summary?.totalSavings || 0).toLocaleString('bn-BD')}/-
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signatures & Seal */}
          <div className="pt-10 flex items-end justify-between text-center text-xs">
            <div className="space-y-1">
              <div className="w-36 border-t border-slate-400 pt-1 font-bold text-slate-800">
                কোষাধ্যক্ষ
              </div>
              <p className="text-[10px] text-slate-500">প্রগতি কল্যাণ সমবায় সমিতি</p>
            </div>

            {/* Society Seal Stamp */}
            <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-700 flex flex-col items-center justify-center text-[9px] font-bold text-emerald-800 rotate-[-8deg] p-1 shadow-inner">
              <span className="uppercase text-[8px] tracking-tight">অফিশিয়াল সিল</span>
              <span className="text-center font-black">প্রগতি কল্যাণ সমবায়</span>
              <span className="text-[7px]">REG-DH-2018</span>
            </div>

            <div className="space-y-1">
              <div className="w-36 border-t border-slate-400 pt-1 font-bold text-slate-800">
                সাধারণ সম্পাদক / সভাপতি
              </div>
              <p className="text-[10px] text-slate-500">প্রগতি কল্যাণ সমবায় সমিতি</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 text-center flex items-center justify-between">
            <span>সমবায় প্রো ডিজিটাল সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে জেনারেটকৃত।</span>
            <span className="font-mono">যাচাইকৃত নথি • কোনো ঋণ প্রদান করা হয় না</span>
          </div>
        </div>

      </div>
    </div>
  );
};
