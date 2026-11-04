import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MemberIdCard } from '../components/MemberIdCard';
import { UserCheck, Users, Search } from 'lucide-react';

export const IdCardPage: React.FC = () => {
  const { user, language } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isOfficial = ['super_admin', 'admin', 'president', 'general_secretary', 'treasurer', 'advisor'].includes(user?.role || '');

  useEffect(() => {
    const fetchMemberData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('pkss_token');
        if (isOfficial) {
          const res = await fetch('/api/members?limit=200', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.members || [];
            setMembers(list);
            // Default to current logged in user member or first member
            const self = list.find((m: any) => m.member_id === user?.memberId);
            setSelectedMember(self || list[0] || null);
          }
        } else {
          // For general member, fetch own profile
          const res = await fetch('/api/members/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setSelectedMember(data.member);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [user, isOfficial]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'ডিজিটাল সদস্য পরিচয়পত্র (PVC ID Card)' : 'Digital Member ID Card'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            সমিতির অফিশিয়াল সিল, বারকোড/QR কোড ও অনুমোদিত স্বাক্ষরযুক্ত আধুনিক পিভিসি আইডি কার্ড
          </p>
        </div>

        {/* Member Selector for Officials */}
        {isOfficial && members.length > 0 && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <Users className="w-4 h-4 text-emerald-700" />
            <select
              value={selectedMember?.member_id || ''}
              onChange={(e) => {
                const found = members.find((m) => m.member_id === e.target.value);
                if (found) setSelectedMember(found);
              }}
              className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.member_id} value={m.member_id}>
                  {m.full_name_bn} ({m.member_id}) - {m.designation || 'সদস্য'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">আইডি কার্ড প্রস্তুত হচ্ছে...</div>
      ) : selectedMember ? (
        <div className="bg-slate-100/60 p-4 sm:p-6 rounded-3xl border border-slate-200">
          <MemberIdCard member={selectedMember} />
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400">কোনো সদস্য তথ্য পাওয়া যায়নি।</div>
      )}
    </div>
  );
};
