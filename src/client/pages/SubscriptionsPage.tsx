import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, Plus, Calendar, AlertCircle, CheckCircle2, 
  Search, Filter, TrendingUp, ArrowRight, X 
} from 'lucide-react';

export const SubscriptionsPage: React.FC = () => {
  const { user, language } = useAuth();
  const [duesRecords, setDuesRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Auto-generation modal
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [targetMonth, setTargetMonth] = useState('2026-04');

  const canManage = ['super_admin', 'admin', 'treasurer'].includes(user?.role || '');

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/subscriptions/dues?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedMonth) url += `month=${encodeURIComponent(selectedMonth)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDuesRecords(data.records || []);
        setSummary(data.summary || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedMonth, statusFilter]);

  const handleGenerateDues = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subscriptions/generate-monthly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({ billingMonth: targetMonth }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setIsGenerateModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'বকেয়া জেনারেশন ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভারে যোগাযোগ করা যায়নি।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'মাসিক চাঁদা ও বকেয়া ব্যবস্থাপনা' : 'Monthly Subscriptions & Dues'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            নিয়মিত মাসিক চাঁদা বিলিং, বকেয়া পর্যবেক্ষণ ও সদস্যভিত্তিক চাঁদা রেজিস্টার
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Calendar className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন মাসের চাঁদা নির্ধারণ (Generate Dues)' : 'Generate Monthly Dues'}</span>
          </button>
        )}
      </div>

      {/* Month-wise Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.slice(0, 3).map((s) => (
          <div key={s.billing_month} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-slate-900">{s.billing_month}</span>
              <span className="text-[10px] text-slate-400 font-semibold">{s.total_members} জন সদস্য</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>মোট ধার্য:</span>
              <span className="font-mono font-bold">৳{Number(s.total_due_amount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>পরিশোধিত:</span>
              <span className="font-mono font-bold">৳{Number(s.total_paid_amount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-amber-700 border-t pt-1 font-bold">
              <span>বকেয়া স্থিতি:</span>
              <span className="font-mono">৳{Number(s.total_outstanding).toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="সদস্যের নাম বা মেম্বার আইডি দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">সকল মাস</option>
            <option value="2026-03">2026-03 (মার্চ)</option>
            <option value="2026-02">2026-02 (ফেব্রুয়ারি)</option>
            <option value="2026-01">2026-01 (জানুয়ারি)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
          >
            <option value="">সকল অবস্থা</option>
            <option value="paid">পরিশোধিত (Paid)</option>
            <option value="unpaid">বকেয়া (Unpaid)</option>
            <option value="partially_paid">আংশিক (Partial)</option>
          </select>
        </div>
      </div>

      {/* Dues Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">বিলিং মাস</th>
                <th className="p-4">মেম্বার আইডি</th>
                <th className="p-4">সদস্যের নাম</th>
                <th className="p-4">ধার্য চাঁদা</th>
                <th className="p-4">পরিশোধিত</th>
                <th className="p-4">বকেয়া</th>
                <th className="p-4">নির্ধারিত শেষ তারিখ</th>
                <th className="p-4">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {duesRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    কোনো চাঁদা রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                duesRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-slate-800">{r.billing_month}</td>
                    <td className="p-4 font-mono font-bold text-emerald-700">{r.member_id}</td>
                    <td className="p-4 font-semibold text-slate-900">{r.full_name_bn}</td>
                    <td className="p-4 font-mono">৳{r.due_amount}</td>
                    <td className="p-4 font-mono font-bold text-emerald-700">৳{r.paid_amount}</td>
                    <td className="p-4 font-mono font-bold text-amber-700">৳{r.due_amount - r.paid_amount}</td>
                    <td className="p-4 font-mono text-slate-500">{r.due_date}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status === 'paid' ? 'পরিশোধিত' : 'বকেয়া'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-generate monthly dues modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsGenerateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                নতুন মাসের চাঁদা স্বয়ংক্রিয় নির্ধারণ
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                সকল সক্রিয় (Active) সদস্যের জন্য নির্ধারিত মাসের চাঁদা জেনারেট হবে। পূর্ববর্তী কোনো লেনদেন বা রেকর্ডে প্রভাব পড়বে না।
              </p>
            </div>

            <form onSubmit={handleGenerateDues} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">বিলিং মাস (YYYY-MM) *</label>
                <input
                  type="month"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-sm font-bold"
                  required
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <p className="font-bold">সিস্টেম রুল:</p>
                <p className="mt-0.5">প্রতিটি সক্রিয় সদস্যের প্রোফাইলে সংরক্ষিত চাঁদার হার অনুযায়ী স্বয়ংক্রিয় রেকর্ড তৈরি হবে।</p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  চাঁদা জেনারেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
