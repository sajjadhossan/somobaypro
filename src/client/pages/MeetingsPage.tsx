import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Plus, MapPin, Clock, FileText, CheckCircle2, 
  Users, AlertCircle, X 
} from 'lucide-react';

export const MeetingsPage: React.FC = () => {
  const { user, language } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    meetingType: 'general',
    dateTime: '',
    location: '',
    meetingLink: '',
    agenda: '',
  });

  const canManage = ['super_admin', 'general_secretary', 'president', 'admin'].includes(user?.role || '');

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/meetings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify(newMeeting),
      });

      if (res.ok) {
        alert('সভা সফলভাবে নির্ধারিত হয়েছে এবং সদস্যদের বিজ্ঞপ্তি পাঠানো হয়েছে।');
        setIsScheduleModalOpen(false);
        fetchMeetings();
      } else {
        const data = await res.json();
        alert(data.error || 'মিটিং নির্ধারণ ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভার ত্রুটি।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'সভা ও মিটিং ব্যবস্থাপনা' : 'Meeting Management'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            সমিতির সাধারণ সভা (AGM), কার্যনির্বাহী সভা, আলোচ্যসূচি (Agenda) ও রেজুলেশন
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন সভা আহ্বান করুন' : 'Schedule Meeting'}</span>
          </button>
        )}
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {meetings.length === 0 ? (
          <div className="col-span-2 p-10 bg-white rounded-2xl border text-center text-slate-400 text-xs">
            কোনো নির্ধারিত সভা নেই।
          </div>
        ) : (
          meetings.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                  {m.meeting_type}
                </span>
                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(m.date_time).toLocaleString()}
                </span>
              </div>

              <h2 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{m.title}</h2>
              
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{m.location}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">আলোচ্যসূচি (Agenda):</span>
                <p className="text-slate-600 whitespace-pre-line line-clamp-3">{m.agenda}</p>
              </div>

              {m.resolutions && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
                  <span className="font-bold text-emerald-900 block">গৃহীত সিদ্ধান্ত / রেজুলেশন:</span>
                  <p className="text-emerald-800 line-clamp-2">{m.resolutions}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedMeeting(m)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-lg text-xs font-semibold transition"
                >
                  পূর্ণ বিবরণ দেখুন
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedMeeting(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                {selectedMeeting.meeting_type}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedMeeting.title}</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                তারিখ ও সময়: {new Date(selectedMeeting.date_time).toLocaleString()}
              </p>
              <p className="text-xs text-slate-600">স্থান: {selectedMeeting.location}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">আলোচ্যসূচি (Agenda):</span>
                <p className="bg-slate-50 p-3 rounded-xl border whitespace-pre-line text-slate-700">
                  {selectedMeeting.agenda}
                </p>
              </div>

              {selectedMeeting.minutes && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">কার্যবিবরণী (Minutes):</span>
                  <p className="bg-slate-50 p-3 rounded-xl border whitespace-pre-line text-slate-700">
                    {selectedMeeting.minutes}
                  </p>
                </div>
              )}

              {selectedMeeting.resolutions && (
                <div>
                  <span className="font-bold text-emerald-900 block mb-1">গৃহীত সিদ্ধান্ত ও রেজুলেশন:</span>
                  <p className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-800 font-medium">
                    {selectedMeeting.resolutions}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">নতুন সভা আহ্বান ফরম</h2>
              <p className="text-xs text-slate-500">সভার বিস্তারিত তথ্য পূরণ করে নোটিশ জারি করুন</p>
            </div>

            <form onSubmit={handleScheduleMeeting} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">সভার শিরোনাম *</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  placeholder="e.g. কার্যনির্বাহী পরিষদের মাসিক সাধারণ সভা"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">সভার ধরন</label>
                  <select
                    value={newMeeting.meetingType}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meetingType: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="general">সাধারণ সভা (General)</option>
                    <option value="executive">কার্যনির্বাহী সভা (Executive)</option>
                    <option value="agm">বার্ষিক সাধারণ সভা (AGM)</option>
                    <option value="emergency">জরুরি সভা (Emergency)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">তারিখ ও সময় *</label>
                  <input
                    type="datetime-local"
                    value={newMeeting.dateTime}
                    onChange={(e) => setNewMeeting({ ...newMeeting, dateTime: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">সভার স্থান *</label>
                <input
                  type="text"
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                  placeholder="e.g. সমিতির প্রধান কার্যালয়, ধানমন্ডি"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">আলোচ্যসূচি (Agenda) *</label>
                <textarea
                  value={newMeeting.agenda}
                  onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                  rows={4}
                  placeholder="১. বিগত সভার অনুমোদন&#10;২. আয়-ব্যয় পর্যালোচনা..."
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  সভা নোটিশ প্রকাশ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
