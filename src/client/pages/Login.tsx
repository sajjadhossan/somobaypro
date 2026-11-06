import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, Phone, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, 
  UserPlus, QrCode, AlertCircle, CheckCircle, Sparkles, Building2, User,
  ScanFace, Camera, RefreshCw
} from 'lucide-react';

interface LoginProps {
  onNavigateRegister: () => void;
  onNavigateVerify: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigateRegister, onNavigateVerify }) => {
  const { login, society, language, setLanguage, t } = useAuth();
  const [authMode, setAuthMode] = useState<'mobile' | 'face' | 'neon'>('mobile');
  const [neonIsSignUp, setNeonIsSignUp] = useState(false);
  const [neonName, setNeonName] = useState('');
  const [neonEmail, setNeonEmail] = useState('');
  const [neonPassword, setNeonPassword] = useState('');
  const [selectedSocietyId, setSelectedSocietyId] = useState<number>(1);
  const [societiesList, setSocietiesList] = useState<any[]>([]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Face ID State
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [faceIdentifier, setFaceIdentifier] = useState('');
  const [faceScanning, setFaceScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch('/api/settings/public-societies')
      .then((res) => res.json())
      .then((data) => {
        if (data.societies && Array.isArray(data.societies)) {
          setSocietiesList(data.societies);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Cannot connect to server. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleNeonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const endpoint = neonIsSignUp ? '/api/neon/auth/signup' : '/api/neon/auth/signin';
      const body = neonIsSignUp
        ? { email: neonEmail, password: neonPassword, name: neonName, societyId: selectedSocietyId }
        : { email: neonEmail, password: neonPassword };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.pendingApproval) {
        setSuccessMessage(data.message || 'আপনার নিবন্ধন আবেদনটি সফলভাবে জমা হয়েছে! সমিতির সভাপতি বা এডমিন অনুমোদন (Approve) করলে আপনি লগইন করতে পারবেন।');
        setNeonIsSignUp(false);
      } else if (res.ok && data.success && data.token) {
        login(data.token, data.user);
      } else {
        setError(data.error || 'Neon Auth authentication failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startFaceCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      faceStreamRef.current = stream;
      setFaceCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      setError('ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ক্যামেরা অনুমতি দিন।');
    }
  };

  const stopFaceCamera = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((track) => track.stop());
      faceStreamRef.current = null;
    }
    setFaceCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopFaceCamera();
    };
  }, []);

  const handleFaceLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!videoRef.current || !faceCameraActive) {
      startFaceCamera();
      return;
    }
    setError(null);
    setFaceScanning(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const video = videoRef.current;
      const minDim = Math.min(video.videoWidth || 480, video.videoHeight || 480);
      const startX = ((video.videoWidth || 480) - minDim) / 2;
      const startY = ((video.videoHeight || 480) - minDim) / 2;

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      const res = await fetch('/api/auth/face-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: faceIdentifier.trim() || undefined,
          imageBase64: base64Image,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        stopFaceCamera();
        setSuccessMessage(data.message || 'ফেস ভেরিফিকেশন সফল! প্রবেশ করা হচ্ছে...');
        setTimeout(() => {
          login(data.token, data.user);
        }, 500);
      } else {
        setError(data.error || 'ফেস ভেরিফিকেশন ব্যর্থ হয়েছে। আলোর দিকে মুখ রেখে আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setError('সার্ভার যোগাযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setFaceScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-white text-sm font-black">Somobay<span className="text-emerald-400">Pro</span></span>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">Cloud OS</span>
        </div>
        <button
          onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
          className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg text-white font-medium transition"
        >
          {language === 'bn' ? 'English' : 'বাংলা'}
        </button>
      </div>

      {/* Main Card */}
      <div className="max-w-md mx-auto w-full my-6 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Banner with SomobayPro Platform Logo + Active Society Profile */}
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 p-6 text-white text-center relative">
          <div className="w-16 h-16 mx-auto mb-2 bg-white p-2 rounded-2xl shadow-lg flex items-center justify-center">
            <img
              src="/somobaypro-logo.svg"
              alt="SomobayPro"
              className="w-full h-full object-contain"
            />
          </div>
          
          <h2 className="text-xl font-black tracking-tight font-sans">
            Somobay<span className="text-emerald-400">Pro</span>
          </h2>
          <p className="text-xs text-emerald-200">
            স্মার্ট সমবায় ও ডিজিটাল সোসাইটি অপারেটিং সিস্টেম
          </p>

          <div className="mt-3 bg-white/10 backdrop-blur-sm p-2 rounded-xl border border-white/10 text-left flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="text-[10px] text-emerald-300 font-semibold block uppercase">সোসাইটি প্রোফাইল:</span>
              <p className="text-xs font-bold text-white truncate">
                {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
              </p>
            </div>
          </div>

          <div className="mt-2.5 inline-block bg-amber-400 text-slate-950 font-bold px-3 py-0.5 rounded-full text-[10px] uppercase tracking-wide">
            কোনো প্রকার ঋণ প্রদান করা হয় না
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Auth Method Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1">
            <button
              type="button"
              onClick={() => { stopFaceCamera(); setAuthMode('mobile'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                authMode === 'mobile' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'মোবাইল' : 'Mobile'}</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('face'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                authMode === 'face' ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ScanFace className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '🤳 ফেস আইডি' : 'Face ID'}</span>
            </button>
            <button
              type="button"
              onClick={() => { stopFaceCamera(); setAuthMode('neon'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                authMode === 'neon' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ইমেইল' : 'Email'}</span>
            </button>
          </div>

          {/* Face ID Biometric Login View */}
          {authMode === 'face' && (
            <div className="space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">কেওয়াইসি বায়োমেট্রিক ফেস আনলক:</strong>
                  <span>আপনার ফ্রন্ট ক্যামেরা অন করে মুখের স্ক্যান নিন। কেওয়াইসি ছবির সাথে মিলে গেলে তাৎক্ষণিক লগইন হবে।</span>
                </div>
              </div>

              {/* Optional Identifier field */}
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'মোবাইল / মেম্বার আইডি (ঐচ্ছিক)' : 'Mobile or Member ID (Optional)'}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={faceIdentifier}
                    onChange={(e) => setFaceIdentifier(e.target.value)}
                    placeholder="খালি রাখলে স্বয়ংক্রিয় শনাক্ত করবে"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Camera Scanner Viewport */}
              <div className="flex flex-col items-center justify-center my-2">
                {faceCameraActive ? (
                  <div className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-emerald-500 shadow-2xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                    {/* Glowing Biometric HUD Overlay */}
                    <div className="absolute inset-0 border-2 border-emerald-400/50 rounded-full animate-pulse pointer-events-none" />
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[bounce_2s_infinite]" />
                    <div className="absolute bottom-2 inset-x-0 text-center">
                      <span className="text-[10px] bg-black/70 text-emerald-300 px-3 py-0.5 rounded-full font-mono font-bold tracking-wider">
                        {faceScanning ? 'যাচাই করা হচ্ছে...' : 'ক্যামেরায় তাকান'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-full border-4 border-dashed border-emerald-300 bg-emerald-50/50 flex flex-col items-center justify-center p-4 shadow-inner">
                    <ScanFace className="w-16 h-16 text-emerald-500 animate-pulse mb-1" />
                    <span className="text-[11px] font-bold text-emerald-900">ফেস আইডি স্ক্যানার</span>
                    <span className="text-[10px] text-emerald-600 mt-0.5">ক্যামেরা বন্ধ রয়েছে</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {!faceCameraActive ? (
                  <button
                    type="button"
                    onClick={startFaceCamera}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>ক্যামেরা চালু করুন</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={faceScanning}
                      onClick={() => handleFaceLogin()}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {faceScanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>যাচাই হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <ScanFace className="w-4 h-4" />
                          <span>🤳 স্ক্যান ও সরাসরি লগইন</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={stopFaceCamera}
                      className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      বন্ধ
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {authMode === 'mobile' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifier (Mobile or Member ID) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'মোবাইল নম্বর অথবা মেম্বার আইডি' : 'Mobile Number or Member ID'}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 01711000001 বা 01711000007"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-600">{language === 'bn' ? 'আমাকে মনে রাখুন' : 'Remember me'}</span>
                </label>
                <span className="text-emerald-700 font-medium hover:underline cursor-pointer">
                  {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <span>{loading ? 'প্রবেশ করা হচ্ছে...' : t('login')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleNeonSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  {neonIsSignUp
                    ? (language === 'bn' ? 'নতুন সদস্য রেজিস্ট্রেশন (Neon Auth)' : 'New Member Sign Up')
                    : (language === 'bn' ? 'ইমেইল দিয়ে সাইন-ইন' : 'Sign In with Email')}
                </span>
                <button
                  type="button"
                  onClick={() => { setNeonIsSignUp(!neonIsSignUp); setError(null); }}
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                >
                  {neonIsSignUp
                    ? (language === 'bn' ? 'আগে অ্যাকাউন্ট থাকলে লগইন করুন' : 'Already have account? Sign in')
                    : (language === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create new account')}
                </button>
              </div>

              {/* Name (Only on Sign Up) */}
              {neonIsSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'bn' ? 'আপনার পূর্ণ নাম' : 'Full Name'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={neonName}
                        onChange={(e) => setNeonName(e.target.value)}
                        placeholder="e.g. সাদমান সাকিব"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                        required={neonIsSignUp}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'bn' ? 'কোন সমিতির সদস্য হতে আবেদন করছেন?' : 'Select Society to Join'}
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedSocietyId}
                        onChange={(e) => setSelectedSocietyId(Number(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                      >
                        {societiesList.length > 0 ? (
                          societiesList.map((soc) => (
                            <option key={soc.id} value={soc.id}>
                              {soc.name_bn} ({soc.short_name || soc.name_en})
                            </option>
                          ))
                        ) : (
                          <option value={1}>প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড</option>
                        )}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={neonEmail}
                    onChange={(e) => setNeonEmail(e.target.value)}
                    placeholder="member@somobaypro.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={neonPassword}
                    onChange={(e) => setNeonPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <span>
                  {loading
                    ? 'প্রক্রিয়াকরণ হচ্ছে...'
                    : neonIsSignUp
                    ? (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন (Neon Auth)' : 'Sign Up with Neon')
                    : (language === 'bn' ? 'লগইন করুন (Neon Auth)' : 'Sign In with Neon')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}


          {/* Public Action Links */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
            <button
              onClick={onNavigateRegister}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>{language === 'bn' ? 'অনলাইন সদস্য আবেদন' : 'Self-Register'}</span>
            </button>
            <button
              onClick={onNavigateVerify}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              <span>{language === 'bn' ? 'রসিদ অনলাইন যাচাই' : 'Verify QR'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 pb-2">
        <p>© 2026 SomobayPro • ক্লাউড সোসাইটি অপারেটিং প্ল্যাটফর্ম</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          নিরাপদ ডাবল-এন্ট্রি একাউন্টিং ও ডিজিটাল রসিদ সিস্টেম
        </p>
      </div>
    </div>
  );
};
