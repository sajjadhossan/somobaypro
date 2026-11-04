import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SocietyPad } from '../components/SocietyPad';
import { MemberIdCard } from '../components/MemberIdCard';
import { 
  FileText, Calendar, Filter, Download, Printer, Search, 
  CheckCircle2, AlertTriangle, User, Building2, Send, Share2, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, CreditCard, X
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user, language, society } = useAuth();
  const [loading, setLoading] = useState(true);

  // Filter States
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [reportData, setReportData] = useState<any>(null);
  const [membersList, setMembersList] = useState<any[]>([]);

  // Modals
  const [selectedMemberForCard, setSelectedMemberForCard] = useState<any>(null);
  const [selectedMemberForStatement, setSelectedMemberForStatement] = useState<any>(null);
  const [isPrintPadOpen, setIsPrintPadOpen] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members?limit=200', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembersList(data.members || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year,
        month: selectedMonth,
        memberId: selectedMemberId,
        status: statusFilter,
      });

      const res = await fetch(`/api/subscriptions/reports?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [year, selectedMonth, selectedMemberId, statusFilter]);

  // Send WhatsApp Due Notice for an individual member
  const handleSendWhatsAppNotice = async (m: any) => {
    try {
      const res = await fetch('/api/subscriptions/send-due-notice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({
          memberId: m.memberId,
          dueAmount: m.yearDue,
          dueMonths: `${year} সালের বকেয়া`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        window.open(data.whatsappUrl, '_blank');
      } else {
        alert('বকেয়া নোটিশ পাঠাতে সমস্যা হয়েছে।');
      }
    } catch (e) {
      alert('সার্ভার যোগাযোগ ত্রুটি।');
    }
  };

  // Send Telegram Due Notice
  const handleSendTelegramNotice = async (m: any) => {
    try {
      const res = await fetch('/api/subscriptions/send-due-notice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({
          memberId: m.memberId,
          dueAmount: m.yearDue,
          dueMonths: `${year} সালের বকেয়া`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        window.open(data.telegramUrl, '_blank');
      }
    } catch (e) {
      alert('সার্ভার যোগাযোগ ত্রুটি।');
    }
  };

  const filteredMembers = (reportData?.membersReport || []).filter((m: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.fullNameBn?.toLowerCase().includes(q) ||
      m.fullNameEn?.toLowerCase().includes(q) ||
      m.memberId?.toLowerCase().includes(q) ||
      m.mobile?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'সদস্য চাঁদা ও আর্থিক রিপোর্ট কেন্দ্র' : 'Financial & Dues Reports'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            মাসিক ও বছর ভিত্তিক সম্পূর্ণ সদস্য লেজার, বকেয়া বিশ্লেষণ, এবং হোয়াটসঅ্যাপ/টেলিগ্রাম নোটিফিকেশন
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsPrintPadOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>অফিসিয়াল প্যাডে প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            মোট সংগৃহীত চাঁদা ({year})
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            ৳{Number(reportData?.summary?.grandTotalPaid || 0).toLocaleString('en-IN')}/-
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">আদায়কৃত ও ব্যাংক জমা</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            মোট বকেয়া চাঁদা ({year})
          </span>
          <p className="text-xl sm:text-2xl font-black text-red-600 font-mono">
            ৳{Number(reportData?.summary?.grandTotalDue || 0).toLocaleString('en-IN')}/-
          </p>
          <span className="text-[10px] text-red-500 font-medium">পরিশোধ অপেক্ষমাণ</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            আদায় সম্পন্ন হার
          </span>
          <p className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
            {reportData?.summary?.collectionRate || 0}%
          </p>
          <span className="text-[10px] text-blue-600 font-medium">নির্ধারিত লক্ষ্যমাত্রার বিপরীতে</span>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
            রিপোর্টে মোট সদস্য
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {reportData?.summary?.totalMembers || 0} জন
          </p>
          <span className="text-[10px] text-slate-500 font-medium">সক্রিয় নিবন্ধিত সদস্যবৃন্দ</span>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Year Filter */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">বছর নির্বাচন (Year):</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl font-bold font-mono text-emerald-800"
            >
              <option value="2026">২০২৬ খ্রিষ্টাব্দ (2026)</option>
              <option value="2025">২০২৫ খ্রিষ্টাব্দ (2025)</option>
              <option value="2024">২০২৪ খ্রিষ্টাব্দ (2024)</option>
              <option value="2027">২০২৭ খ্রিষ্টাব্দ (2027)</option>
            </select>
          </div>

          {/* Member Filter */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">সদস্য ফিল্টার:</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl"
            >
              <option value="all">-- সকল সদস্য (All Members) --</option>
              {membersList.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.full_name_bn} ({m.member_id})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">পরিশোধ স্ট্যাটাস:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border rounded-xl"
            >
              <option value="all">সকল স্ট্যাটাস (All)</option>
              <option value="overdue">শুধুমাত্র বকেয়া আছে (Overdue)</option>
              <option value="paid">সম্পূর্ণ পরিশোধিত (Paid)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="lg:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">নাম বা মোবাইল দিয়ে খুঁজুন:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="সদস্যের নাম, আইডি বা মোবাইল লিখুন..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Members Financial Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs sm:text-sm text-slate-800">
            {year} সালের সদস্য চাঁদা লেজার ও ১২ মাসের গ্রিড
          </span>
          <span className="text-xs text-slate-500 font-mono">
            প্রদর্শিত: {filteredMembers.length} জন সদস্য
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">সদস্যের বিবরণ</th>
                <th className="p-3.5 text-center">মাসিক চাঁদা</th>
                <th className="p-3.5 text-center">১২ মাসের স্ট্যাটাস গ্রিড (জানু - ডিসে)</th>
                <th className="p-3.5 text-right">মোট পরিশোধ</th>
                <th className="p-3.5 text-right">বকেয়া</th>
                <th className="p-3.5">সর্বশেষ জমার তথ্য (ব্যাংক ও জমাদানকারী)</th>
                <th className="p-3.5 text-right">একশন ও নোটিশ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    কোনো সদস্যের রিপোর্ট রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m: any) => (
                  <tr key={m.memberId} className="hover:bg-slate-50/80 transition">
                    {/* Member Details */}
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 text-sm">{m.fullNameBn}</p>
                      <p className="text-[10px] text-emerald-700 font-mono font-semibold">
                        {m.memberId} • {m.designation || 'সদস্য'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{m.mobile}</p>
                    </td>

                    {/* Monthly Rate */}
                    <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                      ৳{Number(m.monthlySubscriptionAmount).toLocaleString('en-IN')}
                    </td>

                    {/* 12 Months Matrix */}
                    <td className="p-3.5">
                      <div className="flex items-center justify-center gap-1">
                        {m.monthsMatrix.map((mo: any) => (
                          <div
                            key={mo.monthKey}
                            title={`${mo.monthNameBn}: ${
                              mo.status === 'paid'
                                ? `পরিশোধিত (৳${mo.paidAmount})`
                                : mo.status === 'partially_paid'
                                ? `আংশিক (বকেয়া: ৳${mo.balance})`
                                : `বকেয়া (৳${mo.balance})`
                            }`}
                            className={`w-5 h-7 rounded text-[8px] font-mono font-bold flex flex-col items-center justify-center transition cursor-help ${
                              mo.status === 'paid'
                                ? 'bg-emerald-500 text-white'
                                : mo.status === 'partially_paid'
                                ? 'bg-amber-400 text-slate-950'
                                : mo.status === 'unpaid'
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            <span>{mo.monthNameBn.slice(0, 1)}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Total Paid */}
                    <td className="p-3.5 text-right font-mono font-black text-emerald-700 text-sm">
                      ৳{Number(m.yearPaid).toLocaleString('en-IN')}/-
                    </td>

                    {/* Total Due */}
                    <td className="p-3.5 text-right font-mono font-black text-sm">
                      {m.yearDue > 0 ? (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          ৳{Number(m.yearDue).toLocaleString('en-IN')}/-
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">
                          পরিশোধিত
                        </span>
                      )}
                    </td>

                    {/* Last Payment & Depositor */}
                    <td className="p-3.5 text-xs">
                      {m.lastPayment ? (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800">
                            {m.lastPayment.bankName || 'সোনালী ব্যাংক'}
                          </p>
                          <p className="text-[11px] text-emerald-800 font-mono">
                            রসিদ: {m.lastPayment.receiptNumber} ({m.lastPayment.depositDate})
                          </p>
                          <p className="text-[10px] text-blue-800 font-medium">
                            জমাদানকারী: <strong>{m.lastPayment.depositorName}</strong> ({m.lastPayment.depositorRelation})
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">কোনো জমার রেকর্ড নেই</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="p-3.5 text-right space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.yearDue > 0 && (
                          <>
                            <button
                              onClick={() => handleSendWhatsAppNotice(m)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-300 transition flex items-center gap-1"
                              title="হোয়াটসঅ্যাপে বকেয়া নোটিশ পাঠান"
                            >
                              <span>হোয়াটসঅ্যাপ</span>
                            </button>
                            <button
                              onClick={() => handleSendTelegramNotice(m)}
                              className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-[10px] font-bold border border-sky-300 transition flex items-center gap-1"
                              title="টেলিগ্রামে বকেয়া নোটিশ পাঠান"
                            >
                              <span>টেলিগ্রাম</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedMemberForCard(m)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                          title="ডিজিটাল মেম্বার আইডি কার্ড দেখুন"
                        >
                          <CreditCard className="w-3 h-3 text-emerald-700" />
                          <span>আইডি কার্ড</span>
                        </button>
                        <button
                          onClick={() => setSelectedMemberForStatement(m)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition"
                          title="একক সদস্য লেজার বিবরণ দেখুন"
                        >
                          স্টেটমেন্ট
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member ID Card Modal */}
      {selectedMemberForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-4 sm:p-6 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedMemberForCard(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <MemberIdCard
              member={{
                ...selectedMemberForCard,
                full_name_bn: selectedMemberForCard.fullNameBn,
                full_name_en: selectedMemberForCard.fullNameEn,
                member_id: selectedMemberForCard.memberId,
                mobile: selectedMemberForCard.mobile,
                joining_date: selectedMemberForCard.joiningDate,
                designation: selectedMemberForCard.designation,
                membership_status: selectedMemberForCard.membershipStatus,
              }}
              onClose={() => setSelectedMemberForCard(null)}
            />
          </div>
        </div>
      )}

      {/* Single Member Statement on Official Society Pad Modal */}
      {selectedMemberForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white print:hidden">
              <span className="font-bold text-xs sm:text-sm">
                ব্যক্তিগত সদস্য চাঁদা লেজার স্টেটমেন্ট ({selectedMemberForStatement.fullNameBn})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট / PDF</span>
                </button>
                <button
                  onClick={() => setSelectedMemberForStatement(null)}
                  className="p-1 rounded-lg bg-slate-700 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 bg-slate-100 max-h-[85vh] overflow-y-auto">
              <SocietyPad
                title={`সদস্য ব্যক্তিগত চাঁদা বিবরণী ও লেজার (${year})`}
                refNo={`PKSS/STM/${year}/${selectedMemberForStatement.memberId}`}
                date={new Date().toISOString().split('T')[0]}
                verificationCode={`VER-STM-${selectedMemberForStatement.memberId}-${year}`}
                printedBy={`${user?.fullNameBn || 'কর্তৃপক্ষ'} (অর্থ বিভাগ)`}
                approvedBy="নুরুল হক মজুমদার (কোষাধ্যক্ষ) ও ড. আবুল কালাম আজাদ (সভাপতি)"
                showSeals={true}
              >
                <div className="space-y-4 py-2">
                  {/* Member Meta */}
                  <div className="p-4 bg-slate-50 border rounded-xl grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">সদস্যের নাম:</span>
                      <strong className="text-sm text-slate-900">{selectedMemberForStatement.fullNameBn}</strong>
                      <span className="text-slate-500 font-mono block">{selectedMemberForStatement.memberId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">মোবাইল:</span>
                      <span className="font-mono text-slate-800">{selectedMemberForStatement.mobile}</span>
                      <span className="text-emerald-800 font-semibold block">{selectedMemberForStatement.designation || 'সদস্য'}</span>
                    </div>
                  </div>

                  {/* 12-Month Table */}
                  <table className="w-full text-xs text-left border">
                    <thead className="bg-slate-100 font-bold border-b">
                      <tr>
                        <th className="p-2">মাস</th>
                        <th className="p-2 text-right">নির্ধারিত চাঁদা</th>
                        <th className="p-2 text-right">পরিশোধিত অর্থ</th>
                        <th className="p-2 text-right">বকেয়া</th>
                        <th className="p-2">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedMemberForStatement.monthsMatrix.map((mo: any) => (
                        <tr key={mo.monthKey}>
                          <td className="p-2 font-medium">{mo.monthNameBn} {year}</td>
                          <td className="p-2 text-right font-mono">৳{mo.dueAmount}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800">৳{mo.paidAmount}</td>
                          <td className="p-2 text-right font-mono font-bold text-red-600">৳{mo.balance}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              mo.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {mo.status === 'paid' ? 'পরিশোধিত' : 'বকেয়া'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t">
                      <tr>
                        <td className="p-2">মোট সর্বমোট</td>
                        <td className="p-2 text-right font-mono">৳{selectedMemberForStatement.yearBilled}</td>
                        <td className="p-2 text-right font-mono text-emerald-800">৳{selectedMemberForStatement.yearPaid}</td>
                        <td className="p-2 text-right font-mono text-red-600">৳{selectedMemberForStatement.yearDue}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </SocietyPad>
            </div>
          </div>
        </div>
      )}

      {/* Official Society Pad Full Report Print Modal */}
      {isPrintPadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white print:hidden">
              <span className="font-bold text-xs sm:text-sm">
                অফিসিয়াল প্যাডে বার্ষিক ও মাসিক পূর্ণাঙ্গ রিপোর্ট প্রিন্ট প্রিভিউ
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট / PDF সংরক্ষণ</span>
                </button>
                <button
                  onClick={() => setIsPrintPadOpen(false)}
                  className="p-1 rounded-lg bg-slate-700 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-6 bg-slate-100 max-h-[85vh] overflow-y-auto">
              <SocietyPad
                title={`সমিতির বার্ষিক সাধারণ সদস্য চাঁদা আদায় ও বকেয়া রিপোর্ট (${year})`}
                refNo={`PKSS/REP/${year}/099`}
                date={new Date().toISOString().split('T')[0]}
                verificationCode={`VER-ANNUAL-REP-${year}`}
                printedBy={`${user?.fullNameBn || 'কোষাধ্যক্ষ'} (সমবায় হিসাব বিভাগ)`}
                approvedBy="নুরুল হক মজুমদার (কোষাধ্যক্ষ) ও ড. আবুল কালাম আজাদ (সভাপতি)"
                showSeals={true}
              >
                <div className="py-3 space-y-4">
                  {/* Summary bar */}
                  <div className="p-3 bg-slate-50 border rounded-xl grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">মোট সক্রিয় সদস্য:</span>
                      <strong className="text-slate-900">{reportData?.summary?.totalMembers} জন</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">মোট নির্ধারিত চাঁদা:</span>
                      <strong className="font-mono text-slate-900">৳{Number(reportData?.summary?.grandTotalBilled || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">মোট সংগৃহীত অর্থ:</span>
                      <strong className="font-mono text-emerald-800">৳{Number(reportData?.summary?.grandTotalPaid || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">সর্বমোট বকেয়া:</span>
                      <strong className="font-mono text-red-600">৳{Number(reportData?.summary?.grandTotalDue || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {/* Print table */}
                  <table className="w-full text-[10px] text-left border">
                    <thead className="bg-slate-100 font-bold border-b">
                      <tr>
                        <th className="p-2">সদস্য আইডি</th>
                        <th className="p-2">সদস্যের পূর্ণ নাম</th>
                        <th className="p-2">মোবাইল</th>
                        <th className="p-2 text-right">নির্ধারিত মোট চাঁদা</th>
                        <th className="p-2 text-right">পরিশোধিত অর্থ</th>
                        <th className="p-2 text-right">বকেয়া</th>
                        <th className="p-2 text-center">সর্বশেষ জমার তারিখ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredMembers.map((m: any) => (
                        <tr key={m.memberId}>
                          <td className="p-2 font-mono font-bold text-emerald-900">{m.memberId}</td>
                          <td className="p-2 font-bold text-slate-900">{m.fullNameBn}</td>
                          <td className="p-2 font-mono text-slate-600">{m.mobile}</td>
                          <td className="p-2 text-right font-mono">৳{m.yearBilled}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800">৳{m.yearPaid}</td>
                          <td className="p-2 text-right font-mono font-bold text-red-600">৳{m.yearDue}</td>
                          <td className="p-2 text-center font-mono">{m.lastPayment?.depositDate || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SocietyPad>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
