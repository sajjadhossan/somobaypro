import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Plus, Calendar, AlertCircle, FileText, CheckCircle2, X } from 'lucide-react';

export const NoticesPage: React.FC = () => {
  const { user, language } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>জারি করেছেন: সাধারণ সম্পাদক / কার্যনির্বাহী কমিটি</span>
              {n.is_read ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  পঠিত
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">নতুন</span>
              )}
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
    </div>
  );
};
