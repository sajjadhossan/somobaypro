import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Search, Filter, Plus, CheckCircle, XCircle, 
  AlertTriangle, Phone, Mail, MapPin, Calendar, FileText, X, UserCheck
} from 'lucide-react';
import { MemberIdCard } from '../components/MemberIdCard';

export const MembersPage: React.FC = () => {
  const { user, language } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedMemberForCard, setSelectedMemberForCard] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Member Form State (Method A: Admin creates member account)
  const [newMember, setNewMember] = useState({
    fullNameBn: '',
    fullNameEn: '',
    fatherName: '',
    motherName: '',
    dob: '',
    nidNumber: '',
    mobile: '',
    email: '',
    presentAddress: '',
    permanentAddress: '',
    occupation: '',
    membershipType: 'regular',
    membershipFee: 500,
    monthlySubscriptionAmount: 1000,
    designation: 'সাধারণ সদস্য',
    role: 'general_member',
    nomineeName: '',
    nomineeRelation: '',
    nomineeMobile: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyMobile: '',
    initialPassword: '',
  });

  const [canCurrentUserAddMembers, setCanCurrentUserAddMembers] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pkss_token');
      // Fetch dynamic member creation permissions
      const permRes = await fetch('/api/settings/permissions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (permRes.ok) {
        const pData = await permRes.json();
        setCanCurrentUserAddMembers(pData.canCurrentUserAddMembers);
      }

      let url = `/api/members?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
      if (typeFilter) url += `type=${encodeURIComponent(typeFilter)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search, statusFilter, typeFilter]);

  const [selectedRoleForApproval, setSelectedRoleForApproval] = useState('general_member');
  const [approvalModalMember, setApprovalModalMember] = useState<any>(null);

  const handleStatusChange = async (memberId: string, newStatus: string, newRole?: string) => {
    try {
      const res = await fetch(`/api/members/${memberId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({ 
          status: newStatus, 
          role: newRole,
          remarks: `Updated by ${user?.fullNameBn || user?.role}` 
        }),
      });
      if (res.ok) {
        alert(`সদস্যপদ সফলভাবে '${newStatus === 'active' ? 'অনুমোদিত' : newStatus}' করা হয়েছে।`);
        fetchMembers();
        if (selectedMember) {
          setSelectedMember({ ...selectedMember, membership_status: newStatus });
        }
        setApprovalModalMember(null);
      } else {
        const d = await res.json();
        alert(d.error || 'স্ট্যাটাস আপডেট করা যায়নি।');
      }
    } catch (err) {
      alert('স্ট্যাটাস আপডেট করা যায়নি।');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify(newMember),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`নতুন সদস্য সফলভাবে নিবন্ধিত হয়েছে! মেম্বার আইডি: ${data.memberId}, প্রাথমিক পাসওয়ার্ড: ${data.initialPassword}`);
        setIsAddModalOpen(false);
        fetchMembers();
      } else {
        alert(data.error || 'Failed to add member.');
      }
    } catch (err) {
      alert('Server connection error.');
    }
  };

  const canManage = ['super_admin', 'admin', 'president', 'general_secretary'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'সোসাইটি সদস্য ব্যবস্থাপনা' : 'Member Management'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            সমিতির সকল নিবন্ধিত সদস্যের তথ্য, স্ট্যাটাস ও চাঁদার পরিসংখ্যান (মোট সদস্য: {totalCount})
          </p>
        </div>

        {canCurrentUserAddMembers && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন সদস্য যোগ করুন (অনুমোদিত)' : 'Add New Member'}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, মেম্বার আইডি বা মোবাইল নম্বর দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">সকল স্ট্যাটাস</option>
            <option value="active">সক্রিয় (Active)</option>
            <option value="pending">পেন্ডিং (Pending)</option>
            <option value="suspended">স্থগিত (Suspended)</option>
            <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">সকল সদস্য ধরন</option>
            <option value="regular">নিয়মিত (Regular)</option>
            <option value="life">আজীবন (Life)</option>
            <option value="executive">কার্যনির্বাহী (Executive)</option>
            <option value="honorary">সম্মানিত (Honorary)</option>
          </select>
        </div>
      </div>

      {/* Members Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">সদস্য তথ্য</th>
                <th className="p-4">মেম্বার আইডি</th>
                <th className="p-4">পদবি ও ধরন</th>
                <th className="p-4">মোবাইল</th>
                <th className="p-4">পরিশোধিত</th>
                <th className="p-4">বকেয়া</th>
                <th className="p-4">স্ট্যাটাস</th>
                <th className="p-4 text-right">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    কোনো সদস্য তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.member_id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                          {m.full_name_bn.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{m.full_name_bn}</p>
                          <p className="text-[10px] text-slate-400">{m.full_name_en}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-700">{m.member_id}</td>
                    <td className="p-4">
                      <span className="font-semibold block">{m.designation || 'সাধারণ সদস্য'}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{m.membership_type}</span>
                    </td>
                    <td className="p-4 font-mono">{m.mobile}</td>
                    <td className="p-4 font-mono font-bold text-emerald-700">
                      ৳{Number(m.total_paid || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 font-mono font-bold text-amber-700">
                      ৳{Number(m.total_dues || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        m.membership_status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.membership_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {m.membership_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canManage && m.membership_status === 'pending' && (
                          <>
                            <button
                              onClick={() => { setApprovalModalMember(m); setSelectedRoleForApproval('general_member'); }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                              title="সদস্যপদ অনুমোদন ও পদবী নির্ধারণ"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>অনুমোদন</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`আপনি কি নিশ্চিত যে ${m.member_id} এর আবেদন বাতিল করতে চান?`)) {
                                  handleStatusChange(m.member_id, 'terminated');
                                }
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition"
                              title="আবেদন বাতিল / ডিনাই"
                            >
                              বাতিল
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedMemberForCard(m)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold transition"
                          title="সদস্য ডিজিটাল আইডি কার্ড"
                        >
                          আইডি কার্ড
                        </button>
                        <button
                          onClick={() => setSelectedMember(m)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                        >
                          প্রোফাইল
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

      {/* Member Profile Drawer / Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                {selectedMember.full_name_bn.slice(0, 1)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedMember.full_name_bn}</h2>
                <p className="text-xs text-slate-500">{selectedMember.full_name_en}</p>
                <p className="text-xs font-mono text-emerald-700 font-bold mt-0.5">
                  আইডি: {selectedMember.member_id} • পদবি: {selectedMember.designation}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400">মোবাইল:</span>
                <p className="font-mono font-bold text-slate-800">{selectedMember.mobile}</p>
              </div>
              <div>
                <span className="text-slate-400">এনআইডি:</span>
                <p className="font-mono text-slate-800">{selectedMember.nid_number || 'প্রদত্ত নেই'}</p>
              </div>
              <div>
                <span className="text-slate-400">পিতার নাম:</span>
                <p className="text-slate-800">{selectedMember.father_name || 'প্রদত্ত নেই'}</p>
              </div>
              <div>
                <span className="text-slate-400">মাতার নাম:</span>
                <p className="text-slate-800">{selectedMember.mother_name || 'প্রদত্ত নেই'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">বর্তমান ঠিকানা:</span>
                <p className="text-slate-800">{selectedMember.present_address || 'ধানমন্ডি, ঢাকা'}</p>
              </div>
              <div>
                <span className="text-slate-400">নমিনি:</span>
                <p className="text-slate-800">{selectedMember.nominee_name || 'মোছাঃ সুফিয়া বেগম'} ({selectedMember.nominee_relation || 'স্ত্রী'})</p>
              </div>
              <div>
                <span className="text-slate-400">জরুরি যোগাযোগ:</span>
                <p className="text-slate-800">{selectedMember.emergency_name || 'ভাই'} ({selectedMember.emergency_mobile || '01911000000'})</p>
              </div>
            </div>

            {/* Financial Status in Drawer */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-medium">মোট অনুমোদিত পরিশোধ</span>
                <p className="text-lg font-black text-emerald-800 font-mono">
                  ৳{Number(selectedMember.total_paid || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-amber-700 font-medium">মোট বকেয়া চাঁদা</span>
                <p className="text-lg font-black text-amber-800 font-mono">
                  ৳{Number(selectedMember.total_dues || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Status Change Buttons for Admin */}
            {canManage && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-600 block">সদস্যপদ স্ট্যাটাস পরিবর্তন:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedMember.member_id, 'active')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    সক্রিয় করুন (Active)
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedMember.member_id, 'suspended')}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    স্থগিত (Suspend)
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedMember.member_id, 'inactive')}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    নিষ্ক্রিয় (Deactivate)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add New Member Modal (Admin Method A) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                নতুন সদস্য নিবন্ধন ফরম (পদ্ধতি ক: এডমিন কর্তৃক)
              </h2>
              <p className="text-xs text-slate-500">
                সদস্যের তথ্য পূরণ করে একাউন্ট তৈরি করুন। স্বয়ংক্রিয়ভাবে ইউনিক মেম্বার আইডি বরাদ্দ হবে।
              </p>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">পূর্ণ নাম (বাংলায়) *</label>
                  <input
                    type="text"
                    value={newMember.fullNameBn}
                    onChange={(e) => setNewMember({ ...newMember, fullNameBn: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">পূর্ণ নাম (ইংরেজি)</label>
                  <input
                    type="text"
                    value={newMember.fullNameEn}
                    onChange={(e) => setNewMember({ ...newMember, fullNameEn: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    value={newMember.mobile}
                    onChange={(e) => setNewMember({ ...newMember, mobile: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">জাতীয় পরিচয়পত্র (NID)</label>
                  <input
                    type="text"
                    value={newMember.nidNumber}
                    onChange={(e) => setNewMember({ ...newMember, nidNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">সদস্যপদ ধরন</label>
                  <select
                    value={newMember.membershipType}
                    onChange={(e) => setNewMember({ ...newMember, membershipType: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="regular">নিয়মিত (Regular)</option>
                    <option value="life">আজীবন (Life)</option>
                    <option value="executive">কার্যনির্বাহী (Executive)</option>
                    <option value="honorary">সম্মানিত (Honorary)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">পদবি (Designation)</label>
                  <input
                    type="text"
                    value={newMember.designation}
                    onChange={(e) => setNewMember({ ...newMember, designation: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">মাসিক চাঁদা হার (টাকা)</label>
                  <input
                    type="number"
                    value={newMember.monthlySubscriptionAmount}
                    onChange={(e) => setNewMember({ ...newMember, monthlySubscriptionAmount: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">প্রাথমিক পাসওয়ার্ড (Default: pkss+শেষ ৪ ডিজিট)</label>
                  <input
                    type="text"
                    value={newMember.initialPassword}
                    onChange={(e) => setNewMember({ ...newMember, initialPassword: e.target.value })}
                    placeholder="খালি রাখলে স্বয়ংক্রিয় তৈরি হবে"
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  সদস্য একাউন্ট সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member ID Card Modal */}
      {selectedMemberForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto p-4 sm:p-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 print:hidden">
              <h2 className="text-base font-bold text-slate-900">ডিজিটাল সদস্য পিভিসি আইডি কার্ড</h2>
              <button
                onClick={() => setSelectedMemberForCard(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <MemberIdCard member={selectedMemberForCard} onClose={() => setSelectedMemberForCard(null)} />
          </div>
        </div>
      )}

      {/* Approval & Role Assignment Modal */}
      {approvalModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>সদস্য অনুমোদন ও পদবী নির্ধারণ</span>
              </h3>
              <button
                onClick={() => setApprovalModalMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
              <p className="font-bold text-slate-800 text-sm">
                {approvalModalMember.full_name_bn}
                <span className="ml-2 font-mono text-emerald-700 text-xs font-semibold">({approvalModalMember.member_id})</span>
              </p>
              <p className="text-slate-500 font-mono">মোবাইল/ইমেইল: {approvalModalMember.mobile}</p>
              <p className="text-slate-500">সমিতি আইডি: #{approvalModalMember.society_id || 1}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                সদস্যের পদবী ও ভূমিকা (Role) নির্ধারণ করুন:
              </label>
              <select
                value={selectedRoleForApproval}
                onChange={(e) => setSelectedRoleForApproval(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              >
                <option value="general_member">সাধারণ সদস্য (General Member)</option>
                <option value="treasurer">কোষাধ্যক্ষ (Treasurer)</option>
                <option value="general_secretary">সাধারণ সম্পাদক (General Secretary)</option>
                <option value="president">সভাপতি (President)</option>
                <option value="advisor">উপদেষ্টা (Advisor)</option>
                <option value="admin">সমিতি এডমিন (Admin)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleStatusChange(approvalModalMember.member_id, 'active', selectedRoleForApproval)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>অনুমোদন নিশ্চিত করুন (Approve)</span>
              </button>
              <button
                onClick={() => setApprovalModalMember(null)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                বাতিল
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
