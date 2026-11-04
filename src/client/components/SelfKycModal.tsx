import React, { useState } from 'react';
import { Camera, Upload, User, UserCheck, ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SelfKycModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SelfKycModal: React.FC<SelfKycModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nomineeData, setNomineeData] = useState({
    nomineeName: '',
    nomineeRelation: 'স্ত্রী/স্বামী',
    nomineeNid: '',
    nomineeMobile: '',
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'photo' | 'nominee'>('photo');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      alert('অনুগ্রহ করে একটি ছবি নির্বাচন করুন।');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('pkss_token');
      const formData = new FormData();
      formData.append('photo', photoFile);

      const res = await fetch('/api/members/me/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        alert('প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে!');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'ছবি আপলোড ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভার এরর');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomineeData.nomineeName.trim()) {
      alert('নমিনির নাম আবশ্যক।');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('pkss_token');
      const res = await fetch('/api/members/me/nominee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nomineeData),
      });

      if (res.ok) {
        alert('নমিনির তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      alert('সার্ভার এরর');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">সদস্য প্রোফাইল ও কেওয়াইসি (KYC)</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('photo')}
            className={`flex-1 py-3 text-center transition ${
              activeTab === 'photo'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            প্রোফাইল ছবি পরিবর্তন
          </button>
          <button
            onClick={() => setActiveTab('nominee')}
            className={`flex-1 py-3 text-center transition ${
              activeTab === 'nominee'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            নমিনি আপডেট
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'photo' ? (
            <form onSubmit={handleUploadPhoto} className="space-y-4 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center relative shadow-inner group">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-1">
                      <Camera className="w-8 h-8" />
                      <span className="text-[10px]">ছবি নির্বাচন করুন</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  ক্যামেরা বা গ্যালারি থেকে পাসপোর্ট সাইজের স্পষ্ট ছবি সিলেক্ট করুন (সর্বোচ্চ ৪ এমবি)
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || !photoFile}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>{saving ? 'আপলোড হচ্ছে...' : 'প্রোফাইল ছবি সেভ করুন'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSaveNominee} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির পূর্ণ নাম *</label>
                <input
                  type="text"
                  value={nomineeData.nomineeName}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeName: e.target.value })}
                  placeholder="e.g. মোছাঃ ফাতেমা খাতুন"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">সদস্যের সাথে সম্পর্ক *</label>
                <select
                  value={nomineeData.nomineeRelation}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeRelation: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="স্ত্রী/স্বামী">স্ত্রী / স্বামী</option>
                  <option value="পিতা">পিতা</option>
                  <option value="মাতা">মাতা</option>
                  <option value="পুত্র">পুত্র</option>
                  <option value="কন্যা">কন্যা</option>
                  <option value="ভাই/বোন">ভাই / বোন</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির জাতীয় পরিচয়পত্র (NID) নম্বর</label>
                <input
                  type="text"
                  value={nomineeData.nomineeNid}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeNid: e.target.value })}
                  placeholder="১০, ১৩ বা ১৭ ডিজিটের এনআইডি"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির মোবাইল নম্বর</label>
                <input
                  type="tel"
                  value={nomineeData.nomineeMobile}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeMobile: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'নমিনি তথ্য আপডেট করুন'}</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
