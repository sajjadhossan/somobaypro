import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, Plus, MessageSquare, CheckCircle2, Clock, X } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const { user, language } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'general',
    message: '',
    priority: 'normal',
  });

  const isOfficial = ['super_admin', 'general_secretary', 'admin', 'president'].includes(user?.role || '');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify(newTicket),
      });

      if (res.ok) {
        alert('আপনার টিকিট জমা দেওয়া হয়েছে। কর্তৃপক্ষ দ্রুত উত্তর প্রদান করবেন।');
        setIsNewTicketOpen(false);
        fetchTickets();
      } else {
        const data = await res.json();
        alert(data.error || 'টিকিট জমা ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভার ত্রুটি।');
    }
  };

  const handleSendResponse = async (id: number) => {
    if (!replyText.trim()) return;

    try {
      const res = await fetch(`/api/support/${id}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({ adminResponse: replyText, status: 'resolved' }),
      });

      if (res.ok) {
        alert('উত্তর পাঠানো হয়েছে এবং টিকিট নিষ্পন্ন হয়েছে।');
        setSelectedTicket(null);
        setReplyText('');
        fetchTickets();
      }
    } catch (err) {
      alert('উত্তর পাঠানো যায়নি।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'সদস্য সহায়তা ও অভিযোগ হেল্পডেস্ক' : 'Member Help & Support Desk'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            পেমেন্ট সংক্রান্ত জিজ্ঞাসা, প্রোফাইল সংশোধন ও সমিতির প্রশাসনের সাথে সরাসরি যোগাযোগ
          </p>
        </div>

        <button
          onClick={() => setIsNewTicketOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'bn' ? 'নতুন টিকিট খুলুন' : 'Open New Ticket'}</span>
        </button>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-500">{t.ticket_number}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 font-semibold uppercase">{t.category}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {t.status === 'resolved' ? 'নিষ্পন্ন (Resolved)' : 'প্রক্রিয়াধীন (Open)'}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{new Date(t.created_at).toLocaleDateString()}</span>
            </div>

            <h2 className="text-sm font-bold text-slate-900">{t.subject}</h2>
            <p className="text-slate-600">{t.message}</p>

            {t.admin_response && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  প্রশাসনের উত্তর:
                </span>
                <p>{t.admin_response}</p>
              </div>
            )}

            {isOfficial && t.status !== 'resolved' && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedTicket(t)}
                  className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold"
                >
                  উত্তর দিন
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Admin Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 my-auto">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-5 right-5 text-slate-400 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-slate-900">টিকিট নং {selectedTicket.ticket_number}-এর উত্তর দিন</h2>
            <p className="text-xs text-slate-600">{selectedTicket.message}</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="সদস্যের জন্য আনুষ্ঠানিক উত্তর লিখুন..."
              className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedTicket(null)} className="px-3 py-1.5 border rounded-xl text-xs">বাতিল</button>
              <button onClick={() => handleSendResponse(selectedTicket.id)} className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold">উত্তর প্রেরণ করুন</button>
            </div>
          </div>
        </div>
      )}

      {/* Open Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto">
            <button
              onClick={() => setIsNewTicketOpen(false)}
              className="absolute top-5 right-5 text-slate-400 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-slate-900">নতুন সহায়তা বা অভিযোগ দাখিল</h2>
            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">বিষয় (Subject) *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="e.g. চাঁদা জমা বা রসিদ সংক্রান্ত অনুসন্ধান"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">ক্যাটাগরি</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                >
                  <option value="payment">পেমেন্ট / চাঁদা সংক্রান্ত</option>
                  <option value="profile">প্রোফাইল তথ্য সংশোধন</option>
                  <option value="general">সাধারণ জিজ্ঞাসা</option>
                  <option value="complaint">অভিযোগ</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">বিস্তারিত বিবরণ *</label>
                <textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  rows={4}
                  placeholder="আপনার জিজ্ঞাসা বা সমস্যার বিস্তারিত লিখুন..."
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsNewTicketOpen(false)} className="px-4 py-2 border rounded-xl">বাতিল</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">টিকিট জমা দিন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
