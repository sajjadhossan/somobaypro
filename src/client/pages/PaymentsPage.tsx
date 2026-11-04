import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, Plus, Clock, CheckCircle2, XCircle, 
  Upload, FileText, Building2, Calendar, QrCode, ShieldCheck, X,
  User, Users 
} from 'lucide-react';
import { ReceiptModal } from '../components/ReceiptModal';

export const PaymentsPage: React.FC = () => {
  const { user, language } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<any>(null);

  // Saved Depositors profiles
  const [savedDepositors, setSavedDepositors] = useState<any[]>([]);
  const [selectedSavedDepositorId, setSelectedSavedDepositorId] = useState('self');
  const [membersList, setMembersList] = useState<any[]>([]);

  // Deposit Submission Form
  const [formData, setFormData] = useState({
    targetMemberId: user?.memberId || '',
    amount: 1000,
    paymentMonths: '2026-03',
    societyBankAccountId: 1,
    memberBankName: '',
    memberBranchName: '',
    depositDate: new Date().toISOString().split('T')[0],
    transactionId: '',
    depositorType: 'self', // 'self' or 'family_member'
    depositorName: user?.fullNameBn || '',
    depositorRelation: 'নিজ',
    depositorNid: '',
    depositorMobile: user?.mobile || '',
    saveDepositor: true,
    notes: '',
  });
  const [slipFile, setSlipFile] = useState<File | null>(null);

  const isOfficial = ['super_admin', 'treasurer', 'president', 'admin'].includes(user?.role || '');

  const fetchDepositors = async (mId?: string) => {
    try {
      const token = localStorage.getItem('pkss_token');
      const target = mId || formData.targetMemberId || user?.memberId;
      const url = target ? `/api/payments/depositors?memberId=${target}` : '/api/payments/depositors';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSavedDepositors(data.depositors || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pkss_token');
      // Submissions
      const url = `/api/payments/submissions${statusFilter ? `?status=${statusFilter}` : ''}`;
      const subRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (subRes.ok) {
        const data = await subRes.json();
        setSubmissions(data.submissions || []);
      }

      // Bank Accounts
      const bankRes = await fetch('/api/payments/bank-accounts', { headers: { Authorization: `Bearer ${token}` } });
      if (bankRes.ok) {
        const bData = await bankRes.json();
        setBankAccounts(bData.accounts || []);
      }

      // Members directory for officials
      if (isOfficial) {
        const memRes = await fetch('/api/members?limit=200', { headers: { Authorization: `Bearer ${token}` } });
        if (memRes.ok) {
          const mData = await memRes.json();
          setMembersList(mData.members || []);
          if (mData.members && mData.members.length > 0 && !formData.targetMemberId) {
            setFormData((prev) => ({ ...prev, targetMemberId: mData.members[0].member_id }));
          }
        }
      }

      fetchDepositors();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSelectSavedDepositor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSavedDepositorId(val);

    if (val === 'self') {
      const currentMember = membersList.find((m) => m.member_id === formData.targetMemberId);
      setFormData((prev) => ({
        ...prev,
        depositorType: 'self',
        depositorName: currentMember?.full_name_bn || user?.fullNameBn || '',
        depositorRelation: 'নিজ',
        depositorNid: '',
        depositorMobile: currentMember?.mobile || user?.mobile || '',
      }));
    } else if (val === 'new_family') {
      setFormData((prev) => ({
        ...prev,
        depositorType: 'family_member',
        depositorName: '',
        depositorRelation: 'ভাই',
        depositorNid: '',
        depositorMobile: '',
        saveDepositor: true,
      }));
    } else {
      const found = savedDepositors.find((d) => String(d.id) === val);
      if (found) {
        setFormData((prev) => ({
          ...prev,
          depositorType: found.depositor_relation === 'নিজ' ? 'self' : 'family_member',
          depositorName: found.depositor_name,
          depositorRelation: found.depositor_relation,
          depositorNid: found.depositor_nid || '',
          depositorMobile: found.depositor_mobile || '',
        }));
      }
    }
  };

  // Submit Bank Deposit (Member or Official on behalf of member)
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.transactionId) {
      alert('ব্যাংক ট্রানজেকশন/স্লিপ নম্বর আবশ্যক।');
      return;
    }

    const payload = new FormData();
    if (isOfficial && formData.targetMemberId) {
      payload.append('memberId', formData.targetMemberId);
    }
    payload.append('amount', String(formData.amount));
    payload.append('paymentMonths', formData.paymentMonths);
    payload.append('societyBankAccountId', String(formData.societyBankAccountId));
    payload.append('memberBankName', formData.memberBankName);
    payload.append('memberBranchName', formData.memberBranchName);
    payload.append('depositDate', formData.depositDate);
    payload.append('transactionId', formData.transactionId);
    payload.append('depositorType', formData.depositorType);
    payload.append('depositorName', formData.depositorName);
    payload.append('depositorRelation', formData.depositorRelation);
    payload.append('depositorNid', formData.depositorNid);
    payload.append('depositorMobile', formData.depositorMobile);
    payload.append('saveDepositor', String(formData.saveDepositor));
    payload.append('notes', formData.notes);
    if (slipFile) {
      payload.append('slip', slipFile);
    }

    try {
      const res = await fetch('/api/payments/submissions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
        body: payload,
      });

      const data = await res.json();
      if (res.ok) {
        alert('ব্যাংক জমার তথ্য দাখিল সম্পন্ন হয়েছে। কোষাধ্যক্ষ মহোদয় যাচাই করে অনুমোদন করবেন।');
        setIsSubmitModalOpen(false);
        fetchData();
      } else {
        alert(data.error || 'জমা দাখিল ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভারে যোগাযোগ ত্রুটি।');
    }
  };

  // Verify Deposit Slip (Treasurer)
  const handleVerifySlip = async (id: number) => {
    try {
      const res = await fetch(`/api/payments/submissions/${id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        alert('স্লিপ যাচাই সম্পন্ন হয়েছে। এখন চূড়ান্ত অনুমোদন প্রদান করা যাবে।');
        fetchData();
        setSelectedSubmission(null);
      }
    } catch (err) {
      alert('যাচাই ব্যর্থ হয়েছে।');
    }
  };

  // Approve Payment (Treasurer / President / Super Admin)
  const handleApprovePayment = async (id: number) => {
    if (!confirm('আপনি কি নিশ্চিত যে ব্যাংকে এই অর্থ জমা হয়েছে এবং পেমেন্ট অনুমোদন করতে চান?')) return;

    try {
      const res = await fetch(`/api/payments/submissions/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });

      const data = await res.json();
      if (res.ok) {
        alert(`পেমেন্ট অনুমোদিত! ডিজিটাল রসিদ নং: ${data.receiptNumber}`);
        fetchData();
        setSelectedSubmission(null);

        // Fetch newly generated receipt to display
        const recRes = await fetch(`/api/receipts/${data.receiptNumber}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
        });
        if (recRes.ok) {
          const recData = await recRes.json();
          setGeneratedReceipt(recData.receipt);
        }
      } else {
        alert(data.error || 'অনুমোদন ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('অনুমোদন প্রক্রিয়ায় ত্রুটি।');
    }
  };

  // Reject Payment
  const handleRejectPayment = async (id: number) => {
    if (!rejectionReason) {
      alert('বাতিলকরণের কারণ লিখুন।');
      return;
    }

    try {
      const res = await fetch(`/api/payments/submissions/${id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (res.ok) {
        alert('পেমেন্ট সাবমিশন বাতিল করা হয়েছে।');
        fetchData();
        setSelectedSubmission(null);
        setShowRejectBox(false);
        setRejectionReason('');
      }
    } catch (err) {
      alert('বাতিল করা যায়নি।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'ব্যাংক জমা ও অনুমোদন ওয়ার্কফ্লো' : 'Bank Deposits & Approvals'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            ব্যাংক স্টেটমেন্ট ও ডিপোজিট স্লিপ যাচাইকরণ, অনুমোদন ও ডিজিটাল রসিদ প্রদান ব্যবস্থা
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'bn' ? 'ব্যাংক জমা সাবমিট করুন' : 'Submit Bank Deposit'}</span>
        </button>
      </div>

      {/* Official Society Bank Accounts Quick Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {bankAccounts.map((b) => (
          <div key={b.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                {b.is_primary ? 'প্রধান হিসাব' : 'সঞ্চয়ী হিসাব'}
              </span>
              <p className="font-bold text-slate-900 text-sm mt-1">{b.bank_name}</p>
              <p className="text-slate-500 font-mono">হিসাব নং: {b.account_number} ({b.branch_name})</p>
            </div>
            {isOfficial && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">বর্তমান ব্যাংক স্থিতি:</span>
                <span className="text-base font-black text-emerald-700 font-mono">
                  ৳{Number(b.current_balance || 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'pending', 'verified_by_treasurer', 'approved', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === st
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st === '' ? 'সকল সাবমিশন' : st === 'pending' ? 'পেন্ডিং (Pending)' : st === 'verified_by_treasurer' ? 'কোষাধ্যক্ষ যাচাইকৃত' : st === 'approved' ? 'অনুমোদিত' : 'বাতিলকৃত'}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">আইডি ও সদস্য</th>
                <th className="p-4">চাঁদার মাস</th>
                <th className="p-4">জমাকৃত ব্যাংক</th>
                <th className="p-4">ট্রানজেকশন/স্লিপ নং</th>
                <th className="p-4">টাকার পরিমাণ</th>
                <th className="p-4">স্ট্যাটাস</th>
                <th className="p-4 text-right">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    কোনো ব্যাংক জমা সাবমিশন পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{s.full_name_bn}</p>
                      <p className="text-[10px] text-emerald-700 font-mono">{s.member_id} • {s.submission_number}</p>
                      {s.depositor_name && s.depositor_name !== s.full_name_bn && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-[10px] border border-blue-200 font-semibold">
                          <User className="w-3 h-3 text-blue-600" />
                          জমাদানকারী: {s.depositor_name} ({s.depositor_relation || 'প্রতিনিধি'})
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono font-semibold">{s.payment_months}</td>
                    <td className="p-4">
                      <span className="font-semibold block">{s.society_bank_name}</span>
                      <span className="text-[10px] text-slate-400">তারিখ: {s.deposit_date}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-800">{s.transaction_id}</td>
                    <td className="p-4 font-mono font-black text-emerald-700 text-sm">
                      ৳{Number(s.amount).toLocaleString('en-IN')}/-
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        s.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'verified_by_treasurer'
                          ? 'bg-blue-100 text-blue-800'
                          : s.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {s.status === 'approved' ? 'অনুমোদিত' : s.status === 'verified_by_treasurer' ? 'স্লিপ যাচাইকৃত' : s.status === 'pending' ? 'যাচাই অপেক্ষমাণ' : 'বাতিল'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedSubmission(s)}
                        className="px-3 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-lg text-xs font-semibold transition"
                      >
                        বিস্তারিত
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Review Drawer / Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => { setSelectedSubmission(null); setShowRejectBox(false); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold">
                {selectedSubmission.submission_number}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                ব্যাংক জমা পর্যালোচনা ও অনুমোদন
              </h2>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">সদস্যের নাম:</span>
                <span className="font-bold text-slate-900">{selectedSubmission.full_name_bn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মেম্বার আইডি:</span>
                <span className="font-mono font-bold text-emerald-700">{selectedSubmission.member_id}</span>
              </div>

              {/* Depositor details (Who deposited at bank) */}
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 my-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-950 font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    ব্যাংকে জমাদানকারী: <strong className="text-slate-900 underline">{selectedSubmission.depositor_name || selectedSubmission.full_name_bn}</strong>
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold text-emerald-800">
                    {selectedSubmission.depositor_relation || 'নিজ সদস্য'}
                  </span>
                </div>
                {(selectedSubmission.depositor_nid || selectedSubmission.depositor_mobile) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600 font-mono pt-1 border-t border-emerald-200/60">
                    {selectedSubmission.depositor_nid && (
                      <span>এনআইডি/আইডি নং: <strong className="text-slate-800">{selectedSubmission.depositor_nid}</strong></span>
                    )}
                    {selectedSubmission.depositor_mobile && (
                      <span>মোবাইল: <strong className="text-slate-800">{selectedSubmission.depositor_mobile}</strong></span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">জমার পরিমাণ:</span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  ৳{Number(selectedSubmission.amount).toLocaleString('en-IN')}/-
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">চাঁদার মাস:</span>
                <span className="font-mono font-semibold">{selectedSubmission.payment_months}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">জমাকৃত ব্যাংক:</span>
                <span>{selectedSubmission.society_bank_name} ({selectedSubmission.society_account_number})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ট্রানজেকশন/স্লিপ আইডি:</span>
                <span className="font-mono font-bold text-slate-800">{selectedSubmission.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">জমার তারিখ:</span>
                <span className="font-mono">{selectedSubmission.deposit_date}</span>
              </div>
              {selectedSubmission.notes && (
                <div className="pt-2 border-t">
                  <span className="text-slate-500">সদস্যের নোট:</span>
                  <p className="text-slate-700 mt-0.5">{selectedSubmission.notes}</p>
                </div>
              )}
            </div>

            {/* Slip attachment */}
            {selectedSubmission.slip_image_url && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">সংযুক্ত ডিপোজিট স্লিপ:</span>
                <a
                  href={selectedSubmission.slip_image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold underline"
                >
                  <FileText className="w-4 h-4" />
                  <span>স্লিপ ডকুমেন্ট ওপেন করুন</span>
                </a>
              </div>
            )}

            {/* Official Workflow Actions */}
            {isOfficial && selectedSubmission.status !== 'approved' && selectedSubmission.status !== 'rejected' && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex gap-2">
                  {selectedSubmission.status === 'pending' && (
                    <button
                      onClick={() => handleVerifySlip(selectedSubmission.id)}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>কোষাধ্যক্ষ স্লিপ যাচাই (Verify)</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleApprovePayment(selectedSubmission.id)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>চূড়ান্ত অনুমোদন ও রসিদ তৈরি</span>
                  </button>

                  <button
                    onClick={() => setShowRejectBox(!showRejectBox)}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition"
                  >
                    বাতিল
                  </button>
                </div>

                {showRejectBox && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs space-y-2">
                    <label className="font-bold text-red-900 block">বাতিলকরণের কারণ লিখুন:</label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. ব্যাংক স্টেটমেন্টে টাকা জমা পাওয়া যায়নি"
                      className="w-full p-2 bg-white border border-red-300 rounded-lg text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowRejectBox(false)}
                        className="px-3 py-1 text-slate-600 hover:bg-white rounded"
                      >
                        ফিরে যান
                      </button>
                      <button
                        onClick={() => handleRejectPayment(selectedSubmission.id)}
                        className="px-3 py-1 bg-red-600 text-white font-bold rounded"
                      >
                        বাতিল নিশ্চিত করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Bank Deposit Submission Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                ব্যাংক জমা তথ্য দাখিল ফরম
              </h2>
              <p className="text-xs text-slate-500">
                সমিতির ব্যাংক একাউন্টে টাকা জমা দিয়ে জমার তথ্য ও স্লিপ দাখিল করুন।
              </p>
            </div>

            <form onSubmit={handleSubmitDeposit} className="space-y-3.5 text-xs">
              {/* Member Selection for Officials */}
              {isOfficial && (
                <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-700" />
                      <span>কোন সম্মানিত সদস্যের চাঁদা জমা হচ্ছে? (Select Member) *</span>
                    </label>
                    <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      অফিসিয়াল এন্ট্রি
                    </span>
                  </div>
                  <select
                    value={formData.targetMemberId}
                    onChange={(e) => {
                      const mId = e.target.value;
                      const selMember = membersList.find((m) => m.member_id === mId);
                      setFormData((prev) => ({
                        ...prev,
                        targetMemberId: mId,
                        depositorName: selMember?.full_name_bn || '',
                        depositorMobile: selMember?.mobile || '',
                      }));
                      setSelectedSavedDepositorId('self');
                      fetchDepositors(mId);
                    }}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-slate-900 text-xs shadow-sm focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">-- সদস্য নির্বাচন করুন ({membersList.length} জন সদস্য) --</option>
                    {membersList.map((m) => (
                      <option key={m.member_id} value={m.member_id}>
                        {m.full_name_bn} ({m.member_id}) • {m.mobile} • {m.designation || 'সদস্য'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Depositor Information Block */}
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>ব্যাংকে টাকা কে জমা দিয়েছেন? (Depositor)</span>
                  </label>
                  <div className="flex items-center gap-3 text-xs bg-white px-2.5 py-1 rounded-xl border border-emerald-200 self-start sm:self-auto">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="depositorType"
                        checked={formData.depositorType === 'self'}
                        onChange={() => {
                          setFormData({
                            ...formData,
                            depositorType: 'self',
                            depositorName: user?.fullNameBn || '',
                            depositorRelation: 'নিজ',
                            depositorNid: '',
                            depositorMobile: user?.mobile || '',
                          });
                          setSelectedSavedDepositorId('self');
                        }}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>নিজ সদস্য</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="depositorType"
                        checked={formData.depositorType === 'family_member'}
                        onChange={() => {
                          setFormData({
                            ...formData,
                            depositorType: 'family_member',
                            depositorName: '',
                            depositorRelation: 'ভাই',
                            depositorNid: '',
                            depositorMobile: '',
                            saveDepositor: true,
                          });
                          setSelectedSavedDepositorId('new_family');
                        }}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>পরিবারের অন্য সদস্য / প্রতিনিধি</span>
                    </label>
                  </div>
                </div>

                {/* Quick select from saved depositors */}
                {savedDepositors.length > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      সংরক্ষিত জমাদানকারী প্রোফাইল নির্বাচন করুন (Saved Profiles):
                    </label>
                    <select
                      value={selectedSavedDepositorId}
                      onChange={handleSelectSavedDepositor}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-800"
                    >
                      <option value="self">-- নিজ সদস্য ({user?.fullNameBn}) --</option>
                      {savedDepositors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.depositor_name} ({d.depositor_relation}{d.depositor_nid ? ` • NID: ${d.depositor_nid}` : ''})
                        </option>
                      ))}
                      <option value="new_family">+ পরিবারের নতুন জমাদানকারীর তথ্য যুক্ত করুন</option>
                    </select>
                  </div>
                )}

                {/* If Family Member / Representative Deposited */}
                {formData.depositorType === 'family_member' && (
                  <div className="space-y-2 pt-2 border-t border-emerald-200/60 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold block mb-1">জমাদানকারীর পূর্ণ নাম *</label>
                        <input
                          type="text"
                          value={formData.depositorName}
                          onChange={(e) => setFormData({ ...formData, depositorName: e.target.value })}
                          placeholder="e.g. মো: রফিকুল ইসলাম"
                          className="w-full p-2 bg-white border rounded-xl"
                          required
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">সদস্যের সাথে সম্পর্ক *</label>
                        <select
                          value={formData.depositorRelation}
                          onChange={(e) => setFormData({ ...formData, depositorRelation: e.target.value })}
                          className="w-full p-2 bg-white border rounded-xl"
                          required
                        >
                          <option value="ভাই">ভাই (Brother)</option>
                          <option value="পিতা">পিতা (Father)</option>
                          <option value="মাতা">মাতা (Mother)</option>
                          <option value="পুত্র">পুত্র (Son)</option>
                          <option value="কন্যা">কন্যা (Daughter)</option>
                          <option value="স্ত্রী">স্ত্রী (Wife)</option>
                          <option value="স্বামী">স্বামী (Husband)</option>
                          <option value="বোন">বোন (Sister)</option>
                          <option value="চাচা/মামা">চাচা / মামা</option>
                          <option value="অন্যান্য আত্মীয়/প্রতিনিধি">অন্যান্য আত্মীয় বা প্রতিনিধি</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold block mb-1">জমাদানকারীর আইডি কার্ড / এনআইডি নম্বর</label>
                        <input
                          type="text"
                          value={formData.depositorNid}
                          onChange={(e) => setFormData({ ...formData, depositorNid: e.target.value })}
                          placeholder="এনআইডি / জন্ম নিবন্ধন নম্বর"
                          className="w-full p-2 bg-white border rounded-xl font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1">জমাদানকারীর মোবাইল নম্বর</label>
                        <input
                          type="text"
                          value={formData.depositorMobile}
                          onChange={(e) => setFormData({ ...formData, depositorMobile: e.target.value })}
                          placeholder="017xxxxxxxx"
                          className="w-full p-2 bg-white border rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 pt-1 text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.saveDepositor}
                        onChange={(e) => setFormData({ ...formData, saveDepositor: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>ভবিষ্যতে ব্যবহারের জন্য এই জমাদানকারীর তথ্য সেভ রাখুন</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold block mb-1">জমাকৃত অর্থ (টাকা) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">চাঁদার মাস (একাধিক মাসের জন্য কমা দিয়ে লিখুন) *</label>
                <input
                  type="text"
                  value={formData.paymentMonths}
                  onChange={(e) => setFormData({ ...formData, paymentMonths: e.target.value })}
                  placeholder="e.g. 2026-03 অথবা 2026-02, 2026-03"
                  className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">সমিতির যে ব্যাংক একাউন্টে জমা দিয়েছেন *</label>
                <select
                  value={formData.societyBankAccountId}
                  onChange={(e) => setFormData({ ...formData, societyBankAccountId: Number(e.target.value) })}
                  className="w-full p-2 bg-slate-50 border rounded-xl font-medium"
                  required
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} - {b.account_number} ({b.branch_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">জমার তারিখ *</label>
                  <input
                    type="date"
                    value={formData.depositDate}
                    onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">ব্যাংক ট্রানজেকশন/স্লিপ নম্বর *</label>
                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    placeholder="e.g. DEP-998822"
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">ডিপোজিট স্লিপ ছবি / ডকুমেন্ট (JPG/PNG/PDF)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setSlipFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="যেকোনো প্রয়োজনীয় তথ্য"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  জমা দাখিল করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-open Generated Receipt Modal upon approval */}
      {generatedReceipt && (
        <ReceiptModal
          receipt={generatedReceipt}
          onClose={() => setGeneratedReceipt(null)}
        />
      )}
    </div>
  );
};
