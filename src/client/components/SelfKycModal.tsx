import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, User, UserCheck, ShieldCheck, X, CheckCircle2, RefreshCw, Sparkles, ScanFace } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SelfKycModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const SelfKycModal: React.FC<SelfKycModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [nomineeData, setNomineeData] = useState({
    nomineeName: '',
    nomineeRelation: 'স্ত্রী/স্বামী',
    nomineeNid: '',
    nomineeMobile: '',
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'photo' | 'nominee'>('photo');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Close modal on Android hardware back press
  useEffect(() => {
    const handleBack = (e: Event) => {
      e.preventDefault();
      stopCamera();
      onClose();
    };
    window.addEventListener('pkss:backpress', handleBack);
    return () => {
      window.removeEventListener('pkss:backpress', handleBack);
      stopCamera();
    };
  }, [onClose]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert('ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ব্রাউজার পারমিশন দিন বা ফাইল সিলেক্ট করুন।');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop square
    const video = videoRef.current;
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // Mirror image for natural selfie feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `kyc-face-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoFile(file);
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) {
      alert('অনুগ্রহ করে একটি ছবি নির্বাচন বা ক্যামেরা দিয়ে স্ক্যান করুন।');
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
        alert('আপনার কেওয়াইসি (KYC) ফেস আইডি সফলভাবে নিবন্ধিত হয়েছে! এখন থেকে ফেস স্ক্যান করে সরাসরি লগইন করতে পারবেন।');
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
            <ScanFace className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">সদস্য কেওয়াইসি ও ফেস আইডি (Face ID)</h3>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }} 
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => { stopCamera(); setActiveTab('photo'); }}
            className={`flex-1 py-3 text-center transition ${
              activeTab === 'photo'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            ফেস আইডি ও ছবি
          </button>
          <button
            onClick={() => { stopCamera(); setActiveTab('nominee'); }}
            className={`flex-1 py-3 text-center transition ${
              activeTab === 'nominee'
                ? 'border-b-2 border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            নমিনি তথ্য
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'photo' ? (
            <form onSubmit={handleUploadPhoto} className="space-y-4 text-center">
              {/* Biometric Shield Info */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-left text-xs text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>ফেস আইডি এনরোলমেন্ট:</strong> ফ্রন্ট ক্যামেরা দিয়ে একটি স্পষ্ট সেলফি তুলুন। পরবর্তীতে পাসওয়ার্ড ছাড়াই এই মুখ স্ক্যান করে অ্যাপে লগইন করতে পারবেন।
                </p>
              </div>

              {/* Camera Preview or Photo Viewfinder */}
              <div className="flex flex-col items-center justify-center">
                {isCameraActive ? (
                  <div className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute inset-0 border-2 border-emerald-400/50 rounded-full animate-pulse pointer-events-none" />
                    <div className="absolute bottom-2 inset-x-0 text-center">
                      <span className="text-[10px] bg-black/60 text-white px-2.5 py-0.5 rounded-full font-semibold">
                        ক্যামেরার দিকে তাকান
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center relative shadow-inner group">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-1.5 p-2">
                        <ScanFace className="w-10 h-10 text-slate-300" />
                        <span className="text-[10px] font-semibold">সেলফি বা ছবি নেই</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Camera vs File */}
              {isCameraActive ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>ছবি তুলুন ও সেভ করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition"
                  >
                    বাতিল
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📸 ফ্রন্ট ক্যামেরা দিয়ে ফেস তুলুন</span>
                  </button>

                  <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>গ্যালারি থেকে ছবি আপলোড</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Save Button */}
              {!isCameraActive && previewUrl && (
                <button
                  type="submit"
                  disabled={saving || !photoFile}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'ফেস আইডি নিশ্চিত ও সংরক্ষণ করুন'}</span>
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleSaveNominee} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির পূর্ণ নাম *</label>
                <input
                  type="text"
                  value={nomineeData.nomineeName}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeName: e.target.value })}
                  placeholder="যেমন: মোছাঃ সুফিয়া বেগম"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">সদস্যের সাথে সম্পর্ক *</label>
                <select
                  value={nomineeData.nomineeRelation}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeRelation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="স্ত্রী/স্বামী">স্ত্রী/স্বামী</option>
                  <option value="পুত্র/কন্যা">পুত্র/কন্যা</option>
                  <option value="পিতা/মাতা">পিতা/মাতা</option>
                  <option value="ভাই/বোন">ভাই/বোন</option>
                  <option value="অন্যান্য">অন্যান্য</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির জাতীয় পরিচয়পত্র (NID) নম্বর</label>
                <input
                  type="text"
                  value={nomineeData.nomineeNid}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeNid: e.target.value })}
                  placeholder="১০/১৩/১৭ ডিজিট NID"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">নমিনির মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={nomineeData.nomineeMobile}
                  onChange={(e) => setNomineeData({ ...nomineeData, nomineeMobile: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow transition mt-2"
              >
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'নমিনি তথ্য সংরক্ষণ করুন'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
