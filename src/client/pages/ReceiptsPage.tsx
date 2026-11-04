import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeRefresh } from '../context/RealtimeContext';
import { 
  Receipt, Search, QrCode, Printer, CheckCircle2, 
  XCircle, AlertTriangle, ShieldCheck, Share2, X 
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';

export const ReceiptsPage: React.FC = () => {
  const { user, language } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cancellation State
  const [cancellingReceipt, setCancellingReceipt] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  const isOfficial = ['super_admin', 'treasurer', 'president', 'admin'].includes(user?.role || '');

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      let url = `/api/receipts?`;
      if (statusFilter) url += `status=${statusFilter}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter]);

  // Real-time automatic data refresh
  useRealtimeRefresh((detail) => {
    if (!detail?.entity || ['payments', 'receipts'].includes(detail.entity)) {
      fetchReceipts();
    }
  });

  const handleCancelReceipt = async () => {
    if (!cancelReason.trim()) {
      alert('রসিদ বাতিলের সুনির্দিষ্ট কারণ উল্লেখ করতে হবে।');
      return;
    }

    try {
      const res = await fetch(`/api/receipts/${cancellingReceipt.receipt_number}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (res.ok) {
        alert('রসিদ বাতিল করা হয়েছে এবং হিসাবের বিপরীত দাখিলা (Reversal Entry) সম্পন্ন হয়েছে।');
        setCancellingReceipt(null);
        setCancelReason('');
        fetchReceipts();
      } else {
        const data = await res.json();
        alert(data.error || 'রসিদ বাতিল ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভারে যোগাযোগ করা যায়নি।');
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      r.receipt_number.toLowerCase().includes(term) ||
      r.member_id.toLowerCase().includes(term) ||
      (r.full_name_bn && r.full_name_bn.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'ডিজিটাল রসিদ ও কিউআর সিস্টেম' : 'Digital Receipts & QR Verification'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            সমিতির অনুমোদিত সকল ডিজিটাল রসিদ, কিউআর সত্যতা যাচাই ও প্রিন্ট/পিডিএফ ডাউনলোড
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href="/verify"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>{language === 'bn' ? 'পাবলিক কিউআর ভেরিফাই' : 'Public QR Verify'}</span>
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="রসিদ নং (e.g. RCP-2026-000001), মেম্বার আইডি বা নাম দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {['', 'valid', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st === '' ? 'সকল' : st === 'valid' ? 'বৈধ (Valid)' : 'বাতিল (Cancelled)'}
            </button>
          ))}
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">রসিদ নম্বর</th>
                <th className="p-4">সদস্য তথ্য</th>
                <th className="p-4">চাঁদার মাস</th>
                <th className="p-4">ব্যাংক তথ্য</th>
                <th className="p-4">টাকার পরিমাণ</th>
                <th className="p-4">ইস্যুর তারিখ</th>
                <th className="p-4">স্ট্যাটাস</th>
                <th className="p-4 text-right">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    কোনো রসিদ পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-emerald-800 text-sm">
                      {r.receipt_number}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{r.full_name_bn}</p>
                      <span className="font-mono text-emerald-700 text-[10px]">{r.member_id}</span>
                    </td>
                    <td className="p-4 font-mono font-semibold">{r.payment_months}</td>
                    <td className="p-4">
                      <p className="font-medium text-slate-800">{r.bank_name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">TX: {r.transaction_id}</span>
                    </td>
                    <td className="p-4 font-mono font-black text-emerald-700 text-sm">
                      ৳{Number(r.amount).toLocaleString('en-IN')}/-
                    </td>
                    <td className="p-4 font-mono text-slate-600">
                      {new Date(r.issued_at).toLocaleDateString('bn-BD')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'valid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {r.status === 'valid' ? 'বৈধ (VALID)' : 'বাতিল (CANCELLED)'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                      >
                        রসিদ দেখুন
                      </button>

                      {isOfficial && r.status === 'valid' && (
                        <button
                          onClick={() => setCancellingReceipt(r)}
                          className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-semibold transition"
                          title="Cancel receipt"
                        >
                          বাতিল
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancellingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setCancellingReceipt(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs font-mono font-bold text-red-600 uppercase">রসিদ বাতিলকরণ সতর্কতা</span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                রসিদ {cancellingReceipt.receipt_number} বাতিল করতে চান?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                বাতিল করলে ডাবল-এন্ট্রি একাউন্টিং লেজারে স্বয়ংক্রিয় বিপরীত দাখিলা (Reversal Journal Entry) অন্তর্ভুক্ত হবে এবং সদস্যের বকেয়া হিসাব পুনরুজ্জীবিত হবে।
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-slate-700 mb-1">
                  বাতিলের সুনির্দিষ্ট কারণ *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. ভুল ব্যাংক ট্রানজেকশন পোস্টিং বা দ্বৈত এন্ট্রি..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingReceipt(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  onClick={handleCancelReceipt}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  হ্যাঁ, রসিদ বাতিল করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
