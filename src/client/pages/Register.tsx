import React, { useState } from 'react';
import { 
  UserPlus, ArrowLeft, ShieldCheck, CheckCircle2, 
  AlertCircle, Building2, User, Phone, MapPin, Briefcase, Heart 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegisterProps {
  onBackToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onBackToLogin }) => {
  const { society, language } = useAuth();

  const [formData, setFormData] = useState({
    fullNameBn: '',
    fullNameEn: '',
    fatherName: '',
    motherName: '',
    mobile: '',
    email: '',
    dob: '',
    nidNumber: '',
    presentAddress: '',
    permanentAddress: '',
    occupation: '',
    nomineeName: '',
    nomineeRelation: '',
    nomineeMobile: '',
    nomineeNid: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyMobile: '',
    password: '',
    confirmPassword: '',
  });

  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না!');
      return;
    }

    if (formData.password.length < 6) {
      setError('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(data.memberId);
      } else {
        setError(data.error || 'নিবন্ধন সম্পন্ন করা যায়নি। অনুগ্রহ করে তথ্য যাচাই করুন।');
      }
    } catch (err) {
      setError('সার্ভারে যোগাযোগ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>লগইন পেজে ফিরুন</span>
          </button>
          <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
            মেম্বার সেলফ-রেজিস্ট্রেশন (পদ্ধতি খ)
          </span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <img
              src={society?.logo_url || '/logo.svg'}
              alt="Logo"
              className="w-14 h-14 object-contain"
            />
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900">
                {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
              </h1>
              <p className="text-xs text-slate-500">অনলাইন সদস্যপদ আবেদন ফরম</p>
            </div>
          </div>

          {/* Strict No Loan Notice */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
            ⚠️ <strong>বিশেষ ঘোষণা:</strong> এই সমিতি কোনো প্রকার ঋণ প্রদান করে না। এটি একটি নিবন্ধিত কল্যাণ ও সঞ্চয় সমিতি। শুধুমাত্র নিয়ম মেনে সমাজকল্যাণ ও নিয়মিত মাসিক চাঁদা প্রদানের অঙ্গীকারে আবেদন করুন।
          </div>

          {/* Success State */}
          {submitted ? (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">আপনার আবেদন সফলভাবে জমা হয়েছে!</h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                আপনার মেম্বার আইডি: <strong className="font-mono text-emerald-700 text-base">{submitted}</strong>। সমিতির সাধারণ সম্পাদক ও কার্যনির্বাহী কমিটি আবেদন যাচাই করে অনুমোদন করবেন। অনুমোদনের পর আপনি সরাসরি লগইন করতে পারবেন।
              </p>
              <button
                onClick={onBackToLogin}
                className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow transition hover:bg-emerald-700"
              >
                লগইন পেজে যান
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Personal Information */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>১. ব্যক্তিগত তথ্য</span>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্ণ নাম (বাংলায়) *</label>
                    <input
                      type="text"
                      name="fullNameBn"
                      value={formData.fullNameBn}
                      onChange={handleChange}
                      placeholder="e.g. মোহাম্মদ তানভীর আহমেদ"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্ণ নাম (ইংরেজি)</label>
                    <input
                      type="text"
                      name="fullNameEn"
                      value={formData.fullNameEn}
                      onChange={handleChange}
                      placeholder="e.g. Mohammad Tanvir Ahmed"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">পিতার নাম</label>
                    <input
                      type="text"
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleChange}
                      placeholder="পিতার নাম লিখুন"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">মাতার নাম</label>
                    <input
                      type="text"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleChange}
                      placeholder="মাতার নাম লিখুন"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর (লগইন আইডি হিসেবে ব্যবহৃত হবে) *</label>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="e.g. 01712345678"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">জন্ম তারিখ</label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">জাতীয় পরিচয়পত্র (NID) নম্বর</label>
                    <input
                      type="text"
                      name="nidNumber"
                      value={formData.nidNumber}
                      onChange={handleChange}
                      placeholder="১০ বা ১৭ সংখ্যার এনআইডি নম্বর"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">বর্তমান ঠিকানা</label>
                    <textarea
                      name="presentAddress"
                      value={formData.presentAddress}
                      onChange={handleChange}
                      rows={2}
                      placeholder="বর্তমান ঠিকানা লিখুন"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">স্থায়ী ঠিকানা</label>
                    <textarea
                      name="permanentAddress"
                      value={formData.permanentAddress}
                      onChange={handleChange}
                      rows={2}
                      placeholder="স্থায়ী ঠিকানা লিখুন"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Nominee Information */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>২. নমিনির তথ্য</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">নমিনির নাম</label>
                    <input
                      type="text"
                      name="nomineeName"
                      value={formData.nomineeName}
                      onChange={handleChange}
                      placeholder="নমিনির পুরো নাম"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">সম্পর্ক</label>
                    <input
                      type="text"
                      name="nomineeRelation"
                      value={formData.nomineeRelation}
                      onChange={handleChange}
                      placeholder="e.g. স্ত্রী, পুত্র, ভাই"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">নমিনির মোবাইল নম্বর</label>
                    <input
                      type="tel"
                      name="nomineeMobile"
                      value={formData.nomineeMobile}
                      onChange={handleChange}
                      placeholder="01xxxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Password */}
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>৩. একাউন্ট সিকিউরিটি ও পাসওয়ার্ড</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">পাসওয়ার্ড তৈরি করুন *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="ন্যূনতম ৬ অক্ষর"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">পাসওয়ার্ড নিশ্চিত করুন *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition disabled:opacity-50"
                >
                  {loading ? 'আবেদন জমা হচ্ছে...' : 'সদস্যপদ আবেদন দাখিল করুন'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
