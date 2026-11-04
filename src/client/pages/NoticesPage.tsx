import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeRefresh } from '../context/RealtimeContext';
import { Bell, Plus, Calendar, AlertCircle, FileText, CheckCircle2, X, Printer, ShieldCheck } from 'lucide-react';
import { SocietyPad } from '../components/SocietyPad';

export const NoticesPage: React.FC = () => {
  const { user, language, society } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNoticeForPrint, setSelectedNoticeForPrint] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [newNotice, setNewNotice] = useState({
    titleBn: '',
    titleEn: '',
    contentBn: '',
    priority: 'normal',
    targetRole: 'all',
  });

  const canCreate = ['super_admin', 'general_secretary', 'admin', 'president'].includes(user?.role || '');

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // Real-time automatic data refresh across devices
  useRealtimeRefresh((detail) => {
    if (!detail?.entity || detail.entity === 'notices') {
      fetchNotices();
    }
  });

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify(newNotice),
      });

      if (res.ok) {
        alert('বিজ্ঞপ্তি প্রকাশিত হয়েছে!');
        setIsCreateModalOpen(false);
        fetchNotices();
      } else {
        const data = await res.json();
        alert(data.error || 'বিজ্ঞপ্তি প্রকাশ ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভার সংযোগ ত্রুটি।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'সোসাইটি নোটিশ বোর্ড' : 'Society Notice Board'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            সমিতির সকল দাপ্তরিক ঘোষণা, চাঁদা বিলিং নোটিশ ও জরুরি নির্দেশনা
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন নোটিশ জারি করুন' : 'Publish Notice'}</span>
          </button>
        )}
      </div>

      {/* Notices Grid */}
      <div className="space-y-4">
        {notices.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-sm space-y-3 transition ${
              n.priority === 'urgent' ? 'border-red-300 bg-red-50/20' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400 font-bold">{n.notice_number}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    n.priority === 'urgent'
                      ? 'bg-red-100 text-red-800'
                      : n.priority === 'important'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {n.priority === 'urgent' ? 'জরুরি বিজ্ঞপ্তি' : n.priority === 'important' ? 'গুরুত্বপূর্ণ' : 'সাধারণ'}
                </span>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase font-mono">
                  প্রাপক: {n.target_role}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{n.publish_date}</span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {n.title_bn}
            </h2>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {n.content_bn}
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-slate-500">
                <span>জারি করেছেন: সাধারণ সম্পাদক / কার্যনির্বাহী পরিষদ</span>
                {n.is_read ? (
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    পঠিত
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">নতুন</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    const text = `*${society?.fullNameBn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\n` +
                      `বিজ্ঞপ্তি নং: ${n.notice_number}\n` +
                      `বিষয়: ${n.title_bn}\n` +
                      `তারিখ: ${n.publish_date}\n\n` +
                      `${n.content_bn}\n\n` +
                      `অনলাইন পোর্টাল: ${window.location.origin}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                  title="হোয়াটসঅ্যাপে শেয়ার করুন"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    const text = `*${society?.fullNameBn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\nবিজ্ঞপ্তি: ${n.title_bn}\n${n.content_bn}`;
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                  title="টেলিগ্রামে শেয়ার করুন"
                >
                  Telegram
                </button>
                <button
                  onClick={() => setSelectedNoticeForPrint(n)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition"
                  title="সমিতির অফিশিয়াল প্যাডে প্রিন্ট করুন"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>প্যাডে প্রিন্ট</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Publish Notice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">নতুন অফিশিয়াল নোটিশ প্রকাশ</h2>
              <p className="text-xs text-slate-500">নোটিশ প্রকাশের সাথে সাথে সংশ্লিষ্ট সদস্যরা বিজ্ঞপ্তি পাবেন</p>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">নোটিশের শিরোনাম (বাংলায়) *</label>
                <input
                  type="text"
                  value={newNotice.titleBn}
                  onChange={(e) => setNewNotice({ ...newNotice, titleBn: e.target.value })}
                  placeholder="e.g. এপ্রিল মাসের চাঁদা পরিশোধের বিজ্ঞপ্তি"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">গুরুত্ব (Priority)</label>
                  <select
                    value={newNotice.priority}
                    onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="normal">সাধারণ (Normal)</option>
                    <option value="important">গুরুত্বপূর্ণ (Important)</option>
                    <option value="urgent">জরুরি (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">প্রাপক সদস্যবৃন্দ</label>
                  <select
                    value={newNotice.targetRole}
                    onChange={(e) => setNewNotice({ ...newNotice, targetRole: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="all">সকল সদস্য ও কর্মকর্তা</option>
                    <option value="general_member">শুধুমাত্র সাধারণ সদস্যবৃন্দ</option>
                    <option value="executive">শুধুমাত্র কার্যনির্বাহী পরিষদ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">নোটিশের বিষয়বস্তু *</label>
                <textarea
                  value={newNotice.contentBn}
                  onChange={(e) => setNewNotice({ ...newNotice, contentBn: e.target.value })}
                  rows={5}
                  placeholder="বিজ্ঞপ্তির বিস্তারিত বিবরণ লিখুন..."
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  বিজ্ঞপ্তি জারি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print on Official Society Pad Modal */}
      {selectedNoticeForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white print:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-xs sm:text-sm">
                  অফিসিয়াল বিজ্ঞপ্তির প্যাড প্রিভিউ ও প্রিন্ট
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    const text = `*${society?.fullNameBn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\n` +
                      `বিজ্ঞপ্তি নং: ${selectedNoticeForPrint.notice_number}\n` +
                      `বিষয়: ${selectedNoticeForPrint.title_bn}\n` +
                      `তারিখ: ${selectedNoticeForPrint.publish_date}\n\n` +
                      `${selectedNoticeForPrint.content_bn}\n\n` +
                      `অনলাইন পোর্টাল: ${window.location.origin}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                  title="হোয়াটসঅ্যাপে পাঠান"
                >
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => {
                    const text = `*${society?.fullNameBn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\nবিজ্ঞপ্তি: ${selectedNoticeForPrint.title_bn}\n${selectedNoticeForPrint.content_bn}`;
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                  title="টেলিগ্রামে পাঠান"
                >
                  <span>Telegram</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট / PDF</span>
                </button>
                <button
                  onClick={() => setSelectedNoticeForPrint(null)}
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body with Official Society Pad */}
            <div className="p-3 sm:p-6 bg-slate-100 max-h-[85vh] overflow-y-auto">
              <SocietyPad
                title={`অফিসিয়াল বিজ্ঞপ্তি (OFFICIAL NOTICE)`}
                refNo={selectedNoticeForPrint.notice_number}
                date={selectedNoticeForPrint.publish_date}
                verificationCode={`VER-NOTICE-${selectedNoticeForPrint.id}-${new Date().getFullYear()}`}
                printedBy={`${user?.fullNameBn || 'সাধারণ সম্পাদক'} (সমবায় প্রশাসন)`}
                approvedBy="মাহমুদুল হাসান চৌধুরী (সাধারণ সম্পাদক) ও ড. আবুল কালাম আজাদ (সভাপতি)"
                showSeals={true}
              >
                <div className="py-4 space-y-4">
                  {/* Notice Priority & Recipient Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold">বিজ্ঞপ্তি ধরন: </span>
                      <span className="font-bold text-emerald-800 uppercase">
                        {selectedNoticeForPrint.priority === 'urgent' ? 'জরুরি বিজ্ঞপ্তি (URGENT NOTICE)' : 'সাধারণ অফিশিয়াল নোটিশ'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold">প্রাপক: </span>
                      <span className="font-bold text-slate-800">
                        {selectedNoticeForPrint.target_role === 'all'
                          ? 'সমিতির সকল সম্মানিত সদস্য ও কর্মকর্তা'
                          : selectedNoticeForPrint.target_role === 'general_member'
                          ? 'সকল সাধারণ সদস্যবৃন্দ'
                          : 'কার্যনির্বাহী পরিষদ সদস্যবৃন্দ'}
                      </span>
                    </div>
                  </div>

                  {/* Notice Subject */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 block">বিষয় / Subject:</span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {selectedNoticeForPrint.title_bn}
                    </h3>
                    {selectedNoticeForPrint.title_en && (
                      <p className="text-xs font-semibold text-slate-600 font-sans mt-0.5">
                        {selectedNoticeForPrint.title_en}
                      </p>
                    )}
                  </div>

                  {/* Notice Detailed Content */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      বিজ্ঞপ্তির বিবরণ ও বিস্তারিত নির্দেশনা:
                    </p>
                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                      {selectedNoticeForPrint.content_bn}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                    <strong>দৃষ্টি আকর্ষণ:</strong> এই বিজ্ঞপ্তিটি সমিতির কার্যনির্বাহী পরিষদের অনুমোদনে প্রাতিষ্ঠানিক ডিজিটাল পোর্টালে প্রকাশ করা হয়েছে। সকল সদস্যকে যথাযথ নির্দেশনা অনুসরণের অনুরোধ করা হচ্ছে।
                  </div>
                </div>
              </SocietyPad>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
