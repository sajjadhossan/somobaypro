import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Download, ShieldCheck, Save, Building2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { society, language, refreshUserData } = useAuth();
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
  const [loading, setLoading] = useState(false);

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
  }, [society]);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" />
            <span>{language === 'bn' ? 'সোসাইটি প্রোফাইল ও ব্র্যান্ডিং সেটিংস' : 'Society Profile & Settings'}</span>
          </h1>
          <p className="text-xs text-slate-500">
            সমিতির নাম, নিবন্ধন তথ্য, যোগাযোগ ঠিকানা, রসিদ ফুটার ও ডাটাবেস ব্যাকআপ
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

      {/* Settings Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
              <label className="font-semibold block mb-1">ওয়েবসাইট ঠিকানা</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
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
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
