import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, DollarSign, TrendingUp, TrendingDown, 
  FileText, Plus, Calendar, ArrowRight, ShieldCheck, X 
} from 'lucide-react';

export const AccountingPage: React.FC = () => {
  const { user, language } = useAuth();
  const [activeTab, setActiveTab] = useState<'summary' | 'cashbook' | 'bankbook' | 'ledger' | 'expenses'>('summary');
  const [summary, setSummary] = useState<any>(null);
  const [cashbook, setCashbook] = useState<any[]>([]);
  const [bankbook, setBankbook] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense Voucher Form Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'office_rent',
    amount: 5000,
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank',
    bankAccountId: 1,
    payeeName: '',
    description: '',
  });

  const isTreasurerOrAdmin = ['super_admin', 'treasurer', 'president', 'admin'].includes(user?.role || '');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pkss_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Financial Summary
      const sumRes = await fetch('/api/accounting/summary', { headers });
      if (sumRes.ok) setSummary(await sumRes.json());

      // Cashbook
      const cashRes = await fetch('/api/accounting/cashbook', { headers });
      if (cashRes.ok) {
        const data = await cashRes.json();
        setCashbook(data.entries || []);
      }

      // Bankbook
      const bankRes = await fetch('/api/accounting/bankbook', { headers });
      if (bankRes.ok) {
        const data = await bankRes.json();
        setBankbook(data.entries || []);
      }

      // General Ledger Journals
      const jrnlRes = await fetch('/api/accounting/journal-entries', { headers });
      if (jrnlRes.ok) {
        const data = await jrnlRes.json();
        setJournalEntries(data.journalEntries || []);
      }

      // Expenses
      const expRes = await fetch('/api/accounting/expenses', { headers });
      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
      }

      // Bank accounts for selection
      const baRes = await fetch('/api/payments/bank-accounts', { headers });
      if (baRes.ok) {
        const data = await baRes.json();
        setBankAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.payeeName || !newExpense.description) {
      alert('প্রাপকের নাম ও ব্যয়ের বিবরণ আবশ্যক।');
      return;
    }

    try {
      const res = await fetch('/api/accounting/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify(newExpense),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`খরচ ভাউচার সংরক্ষিত এবং ডাবল-এন্ট্রি লেজার আপডেট হয়েছে! ভাউচার নং: ${data.voucherNumber}`);
        setIsExpenseModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'খরচ সংরক্ষণ ব্যর্থ হয়েছে।');
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
            <BookOpen className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'দ্বি-প্রবিষ্টি হিসাবরক্ষণ ও আর্থিক বিবরণী' : 'Accounting & Double-Entry Ledger'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            ক্যাশ বুক, ব্যাংক বুক, চার্ট অব একাউন্টস, জার্নাল লেজার ও ভাউচার ট্র্যাকিং
          </p>
        </div>

        {isTreasurerOrAdmin && (
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন খরচ ভাউচার এন্ট্রি' : 'New Expense Voucher'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {[
          { id: 'summary', label: 'আর্থিক সারসংক্ষেপ (Balance Sheet)' },
          { id: 'cashbook', label: 'ক্যাশ বুক (Cashbook)' },
          { id: 'bankbook', label: 'ব্যাংক বুক (Bankbook)' },
          { id: 'ledger', label: 'জেনারেল লেজার (Double-Entry Journals)' },
          { id: 'expenses', label: 'খরচ ভাউচারসমূহ (Expenses)' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === t.id
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Financial Summary (Balance Sheet & Income Statement) */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-semibold">মোট সম্পদ (Total Assets)</span>
              <p className="text-2xl font-black text-emerald-800 font-mono">
                ৳{Number(summary?.totalAssets || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-500">ব্যাংক ও ক্যাশ স্থিতি</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-semibold">মোট দায় (Liabilities)</span>
              <p className="text-2xl font-black text-slate-700 font-mono">
                ৳{Number(summary?.totalLiabilities || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-500">প্রদেয় বিলসমূহ</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-semibold">মোট আয় (Total Revenue)</span>
              <p className="text-2xl font-black text-emerald-700 font-mono">
                ৳{Number(summary?.totalRevenue || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium">চাঁদা ও অন্যান্য আয়</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs text-slate-500 font-semibold">মোট ব্যয় (Total Expenses)</span>
              <p className="text-2xl font-black text-rose-700 font-mono">
                ৳{Number(summary?.totalExpenses || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-rose-600 font-medium">ভাড়া, বিদ্যুৎ, স্টাফ বেতন</p>
            </div>
          </div>

          {/* Chart of Accounts Balance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900">
              হিসাব তালিকা ও বর্তমান জের (Chart of Accounts Balances)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">হিসাব কোড</th>
                    <th className="p-3">খাত / হিসাবের নাম (বাংলা ও ইংরেজি)</th>
                    <th className="p-3">শ্রেণীবিভাগ (Type)</th>
                    <th className="p-3 text-right">বর্তমান ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary?.accounts?.map((acc: any) => (
                    <tr key={acc.code} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-emerald-800">{acc.code}</td>
                      <td className="p-3">
                        <span className="font-semibold block">{acc.name_bn}</span>
                        <span className="text-[10px] text-slate-400">{acc.name_en}</span>
                      </td>
                      <td className="p-3 uppercase font-mono text-[10px] text-slate-500">{acc.type}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ৳{Number(acc.balance || 0).toLocaleString('en-IN')}/-
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Cashbook */}
      {activeTab === 'cashbook' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">দৈনিক ক্যাশ বই (Cashbook)</h2>
              <p className="text-xs text-slate-500">নগদ প্রাপ্তি ও পরিশোধের দৈনিক হিসাব</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">দাখিলা নং</th>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">বিবরণ</th>
                  <th className="p-3">ক্যাশ ইন (ডেবিট)</th>
                  <th className="p-3">ক্যাশ আউট (ক্রেডিট)</th>
                  <th className="p-3">পোস্টিং কর্মকর্তা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashbook.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      ক্যাশ বইয়ে কোনো সরাসরি নগদ লেনদেন পাওয়া যায়নি (সমিতির সকল অর্থ সরাসরি ব্যাংকে জমা হয়)।
                    </td>
                  </tr>
                ) : (
                  cashbook.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-emerald-800">{c.entry_number}</td>
                      <td className="p-3 font-mono">{c.entry_date}</td>
                      <td className="p-3">{c.description}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">৳{c.cash_in}</td>
                      <td className="p-3 font-mono font-bold text-rose-700">৳{c.cash_out}</td>
                      <td className="p-3 text-slate-500 font-mono">{c.created_by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Bankbook */}
      {activeTab === 'bankbook' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">অফিসিয়াল ব্যাংক বই (Bankbook)</h2>
              <p className="text-xs text-slate-500">ব্যাংক জমা ও উত্তোলনের সম্পূর্ণ হিসাব</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">দাখিলা নং</th>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">রেফারেন্স / রসিদ</th>
                  <th className="p-3">বিবরণ</th>
                  <th className="p-3">ব্যাংক জমা (ডেবিট)</th>
                  <th className="p-3">ব্যাংক খরচ (ক্রেডিট)</th>
                  <th className="p-3">অনুমোদনকারী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankbook.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      কোনো রেকর্ড নেই।
                    </td>
                  </tr>
                ) : (
                  bankbook.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-emerald-800">{b.entry_number}</td>
                      <td className="p-3 font-mono">{b.entry_date}</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">{b.reference_id || 'N/A'}</td>
                      <td className="p-3 font-medium text-slate-900">{b.description}</td>
                      <td className="p-3 font-mono font-black text-emerald-700">
                        {b.bank_deposit > 0 ? `৳${Number(b.bank_deposit).toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 font-mono font-black text-rose-700">
                        {b.bank_withdrawal > 0 ? `৳${Number(b.bank_withdrawal).toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{b.created_by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: General Ledger Journals */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">দ্বি-প্রবিষ্টি সাধারণ জাবেদা (General Ledger Journal)</h2>
              <p className="text-xs text-slate-500">প্রতিটি লেনদেনের ডেবিট ও ক্রেডিট সমতা এবং হিসাবের অখণ্ডতা</p>
            </div>
          </div>

          <div className="space-y-4">
            {journalEntries.map((je) => (
              <div key={je.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-800 text-sm">{je.entry_number}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono uppercase">
                      {je.reference_type}
                    </span>
                    {je.is_reversal === 1 && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                        রিভার্সাল দাখিলা
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-slate-500">{je.entry_date}</div>
                </div>

                <p className="font-semibold text-slate-800">{je.description}</p>

                {/* Debit / Credit Lines */}
                <div className="pt-2">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-200">
                        <th className="text-left pb-1">হিসাবের নাম ও কোড</th>
                        <th className="text-right pb-1">ডেবিট (Debit)</th>
                        <th className="text-right pb-1">ক্রেডিট (Credit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 font-mono">
                      {je.lines?.map((line: any, idx: number) => (
                        <tr key={idx} className="py-1">
                          <td className="py-1 text-slate-800">
                            {line.code} - {line.name_bn}
                          </td>
                          <td className="py-1 text-right text-emerald-700 font-bold">
                            {line.debit > 0 ? `৳${Number(line.debit).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-1 text-right text-slate-900 font-bold">
                            {line.credit > 0 ? `৳${Number(line.credit).toLocaleString('en-IN')}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Expenses */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">সোসাইটি খরচ ভাউচার তালিকা</h2>
              <p className="text-xs text-slate-500">অনুমোদিত সকল অফিস, পরিচালনা ও ইভেন্ট খরচ</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">ভাউচার নং</th>
                  <th className="p-3">তারিখ</th>
                  <th className="p-3">ব্যয় খাত (Category)</th>
                  <th className="p-3">প্রাপকের নাম</th>
                  <th className="p-3">বিবরণ</th>
                  <th className="p-3">টাকার পরিমাণ</th>
                  <th className="p-3">পরিশোধ মাধ্যম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">কোনো খরচ ভাউচার নেই।</td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-emerald-800">{e.voucher_number}</td>
                      <td className="p-3 font-mono">{e.expense_date}</td>
                      <td className="p-3 font-semibold uppercase text-[11px] text-slate-700">{e.category}</td>
                      <td className="p-3 font-medium text-slate-900">{e.payee_name}</td>
                      <td className="p-3 text-slate-600">{e.description}</td>
                      <td className="p-3 font-mono font-black text-rose-700 text-sm">
                        ৳{Number(e.amount).toLocaleString('en-IN')}/-
                      </td>
                      <td className="p-3 uppercase font-mono text-[10px] text-slate-500">{e.payment_method}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Expense Voucher Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsExpenseModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                নতুন ব্যয় / খরচ ভাউচার দাখিলা
              </h2>
              <p className="text-xs text-slate-500">
                ভাউচার তৈরির সাথে সাথে স্বয়ংক্রিয়ভাবে দ্বি-প্রবিষ্টি জার্নাল লেজার আপডেট হবে।
              </p>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">ব্যয়ের খাত (Category) *</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                >
                  <option value="office_rent">অফিস ভাড়া (Office Rent)</option>
                  <option value="utility">বিদ্যুৎ ও ইউটিলিটি বিল (Utility)</option>
                  <option value="salary">স্টাফ বেতন ও সম্মানী (Salary)</option>
                  <option value="stationery">মুদ্রণ ও স্টেশনারি (Stationery)</option>
                  <option value="meeting_entertainment">সভা ও আপ্যায়ন (Meeting)</option>
                  <option value="event">বার্ষিক সাধারণ সভা / ইভেন্ট (AGM/Event)</option>
                  <option value="maintenance">মেরামত ও রক্ষণাবেক্ষণ (Maintenance)</option>
                  <option value="other">বিবিধ ব্যয় (Other)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">টাকার পরিমাণ (BDT) *</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">প্রাপক / ব্যক্তি / প্রতিষ্ঠানের নাম *</label>
                <input
                  type="text"
                  value={newExpense.payeeName}
                  onChange={(e) => setNewExpense({ ...newExpense, payeeName: e.target.value })}
                  placeholder="e.g. ডিপিডিসি (বিদ্যুৎ বিল) বা ভবন মালিক"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">পরিশোধের মাধ্যম</label>
                  <select
                    value={newExpense.paymentMethod}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="bank">ব্যাংক একাউন্ট হতে (Bank)</option>
                    <option value="cash">নগদ তহবিল হতে (Cash)</option>
                  </select>
                </div>
                {newExpense.paymentMethod === 'bank' && (
                  <div>
                    <label className="font-semibold block mb-1">ব্যাংক একাউন্ট</label>
                    <select
                      value={newExpense.bankAccountId}
                      onChange={(e) => setNewExpense({ ...newExpense, bankAccountId: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 border rounded-xl"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>{b.bank_name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-1">ব্যয়ের পূর্ণ বিবরণ *</label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  rows={2}
                  placeholder="খরচের বিবরণ ও উদ্দেশ্য লিখুন..."
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  খরচ ভাউচার নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
