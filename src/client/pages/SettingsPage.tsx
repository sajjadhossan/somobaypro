import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, Download, ShieldCheck, Save, Building2, 
  Users, CheckCircle2, Plus, Sparkles, X 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { society, language, refreshUserData } = useAuth();
  
  // Society Profile Form State
  const [formData, setFormData] = useState<any>({
    nameBn: '',
    nameEn: '',
    shortName: '',
    regNo: '',
    address: '',
    district: '',
    upazila: '',
    phone: '',
    email: '',
    website: '',
    estDate: '',
    description: '',
    receiptFooter: '',
    monthlySubscriptionDefault: 1000,
  });

  // Permissions State
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [allAvailableRoles, setAllAvailableRoles] = useState<any[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Multi-Society Hub State
  const [societies, setSocieties] = useState<any[]>([]);
  const [isNewSocietyModalOpen, setIsNewSocietyModalOpen] = useState(false);
  const [newSocData, setNewSocData] = useState({
    nameBn: '',
    nameEn: '',
    shortName: '',
    regNo: '',
    address: '',
    district: 'ঢাকা',
    phone: '',
    email: '',
    monthlySubscriptionDefault: 1000,
  });

  const [loading, setLoading] = useState(false);

  const fetchSettingsAndPermissions = async () => {
    try {
      const token = localStorage.getItem('pkss_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Permissions
      const permRes = await fetch('/api/settings/permissions', { headers });
      if (permRes.ok) {
        const pData = await permRes.json();
        setAllowedRoles(pData.allowedRoles || []);
        setAllAvailableRoles(pData.allAvailableRoles || []);
      }

      // Societies list
      const socRes = await fetch('/api/settings/societies', { headers });
      if (socRes.ok) {
        const sData = await socRes.json();
        setSocieties(sData.societies || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (society) {
      setFormData({
        nameBn: society.name_bn || '',
        nameEn: society.name_en || '',
        shortName: society.short_name || '',
        regNo: society.reg_no || '',
        address: society.address || '',
        district: society.district || '',
        upazila: society.upazila || '',
        phone: society.phone || '',
        email: society.email || '',
        website: society.website || '',
        estDate: (society as any).est_date || '',
        description: (society as any).description || '',
        receiptFooter: society.receipt_footer || '',
        monthlySubscriptionDefault: society.monthly_subscription_default || 1000,
      });
    }
    fetchSettingsAndPermissions();
  }, [society]);

  // Toggle role permission
  const handleToggleRole = (roleKey: string) => {
    if (roleKey === 'super_admin') return; // Locked
    if (allowedRoles.includes(roleKey)) {
      setAllowedRoles(allowedRoles.filter((r) => r !== roleKey));
    } else {
      setAllowedRoles([...allowedRoles, roleKey]);
    }
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch('/api/settings/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify({ allowedRoles }),
      });

      if (res.ok) {
        alert('সদস্য যুক্ত করার অনুমতি সফলভাবে হালনাগাদ করা হয়েছে!');
        fetchSettingsAndPermissions();
      } else {
        alert('অনুমতি হালনাগাদ করা যায়নি।');
      }
    } catch (err) {
      alert('সার্ভার ত্রুটি।');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Save Society Settings
  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('সোসাইটি প্রোফাইল ও সেটিংস সফলভাবে আপডেট হয়েছে!');
        refreshUserData();
      } else {
        alert('আপডেট ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভার সংযোগ ত্রুটি।');
    } finally {
      setLoading(false);
    }
  };

  // Create New Society Profile
  const handleCreateNewSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings/societies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pkss_token')}`,
        },
        body: JSON.stringify(newSocData),
      });

      if (res.ok) {
        alert('নতুন সমিতি প্রোফাইল তৈরি হয়েছে!');
        setIsNewSocietyModalOpen(false);
        fetchSettingsAndPermissions();
      } else {
        alert('সমিতি তৈরি করা যায়নি।');
      }
    } catch (err) {
      alert('ত্রুটি হয়েছে।');
    }
  };

  // Switch Active Society Profile
  const handleSwitchSociety = async (id: number) => {
    if (!confirm('আপনি কি এই সমিতি প্রোফাইলে সুইচ করতে চান?')) return;
    try {
      const res = await fetch(`/api/settings/societies/${id}/switch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        alert('সক্রিয় সমিতি প্রোফাইল পরিবর্তিত হয়েছে!');
        window.location.reload();
      }
    } catch (err) {
      alert('সুইচ করা যায়নি।');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'সোসাইটি সেটিংস ও পারমিশন কন্ট্রোল' : 'Society Settings & Permissions'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            নতুন সদস্য এন্ট্রি পারমিশন, মাল্টি-সোসাইটি প্রোফাইল ব্যবস্থাপনা ও ব্র্যান্ডিং কনফিগারেশন
          </p>
        </div>

        <a
          href="/api/settings/backup"
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>{language === 'bn' ? 'ডাটাবেস ব্যাকআপ ডাউনলোড' : 'Download DB Backup'}</span>
        </a>
      </div>

      {/* 1. MEMBER CREATION PERMISSION CONTROL PANEL */}
      <div className="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                নতুন সদস্য যুক্ত করার পারমিশন নিয়ন্ত্রণ (Member Creation Authority)
              </h2>
              <p className="text-xs text-slate-500">
                কোন কোন পদের কর্মকর্তা নতুন সদস্য যুক্ত করতে পারবেন তা সুপার এডমিন হিসেবে নির্ধারণ করুন।
              </p>
            </div>
          </div>

          <button
            onClick={handleSavePermissions}
            disabled={savingPermissions}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{savingPermissions ? 'সংরক্ষণ হচ্ছে...' : 'পারমিশন সংরক্ষণ করুন'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {allAvailableRoles.map((r) => {
            const isChecked = allowedRoles.includes(r.key);
            return (
              <label
                key={r.key}
                className={`p-4 rounded-2xl border transition flex items-start gap-3 cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-50/60 border-emerald-400 text-emerald-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={r.locked}
                  onChange={() => handleToggleRole(r.key)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-bold text-xs block text-slate-900">{r.labelBn}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{r.labelEn}</span>
                  {r.locked && (
                    <span className="block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded w-fit">
                      সর্বোচ্চ ক্ষমতা
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. MULTI-SOCIETY PROFILES MANAGER (HUB) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                সোসাইটি প্রোফাইল ম্যানেজার (SomobayPro Hub)
              </h2>
              <p className="text-xs text-slate-500">
                সুপার এডমিনের নিয়ন্ত্রণে একাধিক সমিতি প্রোফাইল তৈরি ও পরিচালনা করুন।
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewSocietyModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>নতুন সমিতি প্রোফাইল তৈরি</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {societies.map((soc) => {
            const isCurrent = society?.name_bn === soc.name_bn;
            return (
              <div
                key={soc.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">ID: #{soc.id}</span>
                    {isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        সক্রিয় প্রোফাইল
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                        সংরক্ষিত
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{soc.name_bn}</h3>
                  <p className="text-xs text-slate-500">{soc.name_en}</p>
                  <p className="text-[11px] text-slate-400 font-mono">নিবন্ধন: {soc.reg_no || 'নিবন্ধিত'}</p>
                  <p className="text-[11px] text-slate-600">মাসিক চাঁদা: ৳{soc.monthly_subscription_default}/মাস</p>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="w-full py-2 bg-emerald-100 text-emerald-800 text-center rounded-xl text-xs font-bold">
                      এই প্রোফাইলটি ওপেন করা আছে
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSwitchSociety(soc.id)}
                      className="w-full py-2 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition"
                    >
                      এই প্রোফাইলে প্রবেশ করুন
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. ACTIVE SOCIETY PROFILE BRANDING DETAILS FORM */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            সক্রিয় সোসাইটির ব্র্যান্ডিং ও দাপ্তরিক তথ্য
          </h2>
          <p className="text-xs text-slate-500">
            লগইন পেজ, সকল ড্যাশবোর্ড, ডিজিটাল রসিদ ও নথিপত্রে এই তথ্য প্রদর্শিত হবে।
          </p>
        </div>

        <form onSubmit={handleSubmitSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold block mb-1">সমিতির পূর্ণ নাম (বাংলায়) *</label>
              <input
                type="text"
                value={formData.nameBn}
                onChange={(e) => setFormData({ ...formData, nameBn: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
                required
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">সমিতির পূর্ণ নাম (ইংরেজি) *</label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
                required
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">সংক্ষিপ্ত নাম (Short Name)</label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">নিবন্ধন নম্বর (Registration No)</label>
              <input
                type="text"
                value={formData.regNo}
                onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">যোগাযোগ ফোন নম্বর</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">অফিসিয়াল ইমেইল</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">ডিফল্ট মাসিক চাঁদার পরিমাণ (BDT)</label>
              <input
                type="number"
                value={formData.monthlySubscriptionDefault}
                onChange={(e) => setFormData({ ...formData, monthlySubscriptionDefault: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">অনুমোদন ওয়ার্কফ্লো</label>
              <select
                value={formData.approvalWorkflow || 'treasurer_only'}
                onChange={(e) => setFormData({ ...formData, approvalWorkflow: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              >
                <option value="treasurer_only">কোষাধ্যক্ষ অনুমোদন (Treasurer Only)</option>
                <option value="treasurer_president">কোষাধ্যক্ষ + সভাপতি যৌথ অনুমোদন</option>
                <option value="treasurer_admin">কোষাধ্যক্ষ + সুপার এডমিন অনুমোদন</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">সমিতির কার্যালয়ের পূর্ণ ঠিকানা</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">ডিজিটাল রসিদের নিচের ফুটার ঘোষণা (Receipt Footer)</label>
              <textarea
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                rows={2}
                className="w-full p-2.5 bg-slate-50 border rounded-xl"
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল সেটিংস সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* New Society Profile Creation Modal */}
      {isNewSocietyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsNewSocietyModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">নতুন সমিতি প্রোফাইল তৈরি ফরম</h2>
              <p className="text-xs text-slate-500">SomobayPro প্ল্যাটফর্মে নতুন একটি সমিতি যুক্ত করুন</p>
            </div>

            <form onSubmit={handleCreateNewSociety} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">সমিতির পূর্ণ নাম (বাংলায়) *</label>
                <input
                  type="text"
                  value={newSocData.nameBn}
                  onChange={(e) => setNewSocData({ ...newSocData, nameBn: e.target.value })}
                  placeholder="e.g. রূপালী আবাসিক সমাজ কল্যাণ সমিতি"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">সমিতির পূর্ণ নাম (ইংরেজি)</label>
                <input
                  type="text"
                  value={newSocData.nameEn}
                  onChange={(e) => setNewSocData({ ...newSocData, nameEn: e.target.value })}
                  placeholder="e.g. Rupali Residential Welfare Society"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">নিবন্ধন নম্বর</label>
                  <input
                    type="text"
                    value={newSocData.regNo}
                    onChange={(e) => setNewSocData({ ...newSocData, regNo: e.target.value })}
                    placeholder="e.g. REG-1092"
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">মাসিক চাঁদা হার (BDT)</label>
                  <input
                    type="number"
                    value={newSocData.monthlySubscriptionDefault}
                    onChange={(e) => setNewSocData({ ...newSocData, monthlySubscriptionDefault: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">কার্যালয়ের ঠিকানা</label>
                <input
                  type="text"
                  value={newSocData.address}
                  onChange={(e) => setNewSocData({ ...newSocData, address: e.target.value })}
                  placeholder="e.g. মিরপুর, ঢাকা"
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSocietyModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow"
                >
                  প্রোফাইল তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
