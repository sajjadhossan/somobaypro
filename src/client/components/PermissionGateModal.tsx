import React, { useState } from 'react';
import { ShieldCheck, Mic, Camera, Bell, HardDrive, CheckCircle2, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface PermissionGateModalProps {
  onComplete: () => void;
}

export const PermissionGateModal: React.FC<PermissionGateModalProps> = ({ onComplete }) => {
  const [requesting, setRequesting] = useState(false);
  const [grantedItems, setGrantedItems] = useState<{ [key: string]: boolean }>({
    mic: false,
    camera: false,
    notifications: false,
    storage: false,
  });

  const handleGrantAll = async () => {
    setRequesting(true);
    const updated = { ...grantedItems };

    // 1. Microphone & Camera permission
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        updated.mic = true;
        updated.camera = true;
        // Release hardware immediately
        stream.getTracks().forEach((track) => track.stop());
      } else {
        updated.mic = true;
        updated.camera = true;
      }
    } catch (e) {
      console.warn('Camera/Mic permission prompt handled:', e);
      // Even if partially rejected, allow proceeding
      updated.mic = true;
      updated.camera = true;
    }

    // 2. Notification permission
    try {
      if ('Notification' in window) {
        const res = await Notification.requestPermission();
        updated.notifications = res === 'granted';
      } else {
        updated.notifications = true;
      }
    } catch (e) {
      updated.notifications = true;
    }

    // 3. Storage permission
    updated.storage = true;
    setGrantedItems(updated);

    // Save to storage
    localStorage.setItem('pkss_permissions_granted', 'true');

    // Small delay to show feedback checkmarks
    setTimeout(() => {
      setRequesting(false);
      onComplete();
    }, 600);
  };

  const handleSkip = () => {
    localStorage.setItem('pkss_permissions_granted', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-auto border border-emerald-100 animate-in fade-in zoom-in-95">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              অ্যাপের প্রয়োজনীয় অনুমতি প্রদান
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              অ্যাপ্লিকেশনটি সুষ্ঠু ও সম্পূর্ণ কার্যকরভাবে ব্যবহারের জন্য লগইন করার পূর্বে নিচের অনুমতিগুলো গ্রহণ করা আবশ্যক।
            </p>
          </div>
        </div>

        {/* Permissions List */}
        <div className="space-y-3">
          {/* Microphone */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 transition hover:bg-emerald-50/50 hover:border-emerald-200">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm flex-shrink-0 mt-0.5">
              <Mic className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">মাইক্রোফোন (Microphone)</h3>
                {grantedItems.mic ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">প্রয়োজনীয়</span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Somobay AI স্মার্ট ভয়েস সহকারী এবং মুখে বাংলায় কথা বলে ডিপোজিট স্লিপ পূরণের জন্য।
              </p>
            </div>
          </div>

          {/* Camera */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 transition hover:bg-teal-50/50 hover:border-teal-200">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm flex-shrink-0 mt-0.5">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">ক্যামেরা (Camera)</h3>
                {grantedItems.camera ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full">প্রয়োজনীয়</span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                ব্যাংক জমা স্লিপের তাত্ক্ষণিক ছবি তোলা ও সদস্য প্রোফাইল/নমিনি কেওয়াইসি ভেরিফিকেশনের জন্য।
              </p>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 transition hover:bg-indigo-50/50 hover:border-indigo-200">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm flex-shrink-0 mt-0.5">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">পুশ নোটিফিকেশন (Notifications)</h3>
                {grantedItems.notifications ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">সুপারিশকৃত</span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                জমা অনুমোদন, রসিদ তৈরি, জরুরি নোটিশ এবং রিয়েল-টাইম ক্লাউড সতর্কবার্তার জন্য।
              </p>
            </div>
          </div>

          {/* Storage & Files */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 transition hover:bg-amber-50/50 hover:border-amber-200">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-sm flex-shrink-0 mt-0.5">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">ফাইল ও ডাউনলোড (Storage)</h3>
                {grantedItems.storage ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">প্রয়োজনীয়</span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                সঞ্চয় পাসবুক লেজার, পেমেন্ট রসিদ এবং ডিজিটাল শেয়ার সনদ প্রিন্ট ও পিডিএফ ডাউনলোডের জন্য।
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleGrantAll}
            disabled={requesting}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-75"
          >
            {requesting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>অনুমতি যাচাই করা হচ্ছে...</span>
              </>
            ) : (
              <>
                <span>সব অনুমতি দিন ও লগইনে যান</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold transition"
          >
            সরাসরি লগইনে যান (পরে অনুমতি দিব)
          </button>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>আপনার কোনো গোপনীয় তথ্য বাইরে শেয়ার করা হয় না। শতভাগ নিরাপদ।</span>
        </div>
      </div>
    </div>
  );
};
