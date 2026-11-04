import React, { useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { OfficialSeal } from './OfficialSeal';
import { Printer, Share2, ShieldCheck, Download, Smartphone, QrCode } from 'lucide-react';

interface MemberIdCardProps {
  member: any;
  onClose?: () => void;
}

export const MemberIdCard: React.FC<MemberIdCardProps> = ({ member, onClose }) => {
  const { society, language } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

  if (!member) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*${society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\n` +
      `ডিজিটাল সদস্য পরিচয়পত্র (Member ID Card)\n` +
      `সদস্যের নাম: ${member.full_name_bn} (${member.member_id})\n` +
      `পদবি: ${member.designation || 'সাধারণ সদস্য'}\n` +
      `মোবাইল: ${member.mobile}\n` +
      `নিবন্ধন নং: ${society?.reg_no || 'REG-DH-2018-0942'}\n` +
      `অনলাইন সত্যতা যাচাই পোর্টাল: ${window.location.origin}`;

    const cleanMobile = member.mobile?.replace(/\D/g, '') || '';
    const waUrl = cleanMobile
      ? `https://wa.me/88${cleanMobile}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleShareTelegram = () => {
    const text = `*${society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\n` +
      `ডিজিটাল সদস্য আইডি কার্ড: ${member.full_name_bn} (${member.member_id})`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800 text-white rounded-2xl print:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-xs sm:text-sm">
            ডিজিটাল সদস্য পরিচয়পত্র (PVC ID Card)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
            title="হোয়াটসঅ্যাপে শেয়ার করুন"
          >
            <span>হোয়াটসঅ্যাপ</span>
          </button>
          <button
            onClick={handleShareTelegram}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition"
            title="টেলিগ্রামে শেয়ার করুন"
          >
            <span>টেলিগ্রাম</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition shadow"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>প্রিন্ট / PDF</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-700 hover:bg-red-600 rounded-xl text-xs font-semibold transition"
            >
              বন্ধ করুন
            </button>
          )}
        </div>
      </div>

      {/* Printable ID Card Container (Standard PVC dimensions: 85.6mm × 53.98mm scaled) */}
      <div ref={cardRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto printable-area p-2">
        
        {/* ================= CARD FRONT ================= */}
        <div className="w-full max-w-[400px] mx-auto bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-3xl shadow-2xl overflow-hidden border-2 border-emerald-500/40 relative flex flex-col justify-between min-h-[500px]">
          {/* Top Banner Ribbon */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 px-4 py-3 border-b-2 border-amber-400/80 text-center relative">
            <div className="flex items-center justify-center gap-2">
              <img
                src={society?.logo_url || '/logo.svg'}
                alt="Logo"
                className="w-12 h-12 object-contain drop-shadow"
              />
              <div className="text-left">
                <span className="text-[8px] uppercase tracking-wider text-amber-300 font-semibold block leading-tight">
                  গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত
                </span>
                <h3 className="text-sm font-black leading-tight text-white tracking-tight">
                  {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
                </h3>
                <p className="text-[9px] text-emerald-200 font-medium">
                  রেজিস্ট্রেশন নং: {society?.reg_no || 'REG-DH-2018-0942'}
                </p>
              </div>
            </div>
          </div>

          {/* Member Photo & Core Details */}
          <div className="p-4 flex-1 flex flex-col items-center justify-center text-center space-y-3 relative z-10">
            {/* Hologram / Chip Decorative Badge */}
            <div className="absolute top-2 right-4 flex items-center gap-1 opacity-80">
              <span className="text-[8px] font-mono text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                ACTIVE
              </span>
            </div>

            {/* Avatar / Photo */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-1 shadow-xl border-2 border-amber-400 overflow-hidden flex items-center justify-center">
                {member.photo_url ? (
                  <img src={member.photo_url} alt="Photo" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-800 font-black text-3xl">
                    {member.full_name_bn?.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2.5 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-wider shadow">
                {member.designation || 'সদস্য'}
              </div>
            </div>

            {/* Name & ID */}
            <div className="pt-2">
              <h4 className="text-base sm:text-lg font-black text-white tracking-wide">
                {member.full_name_bn}
              </h4>
              <p className="text-xs text-emerald-200 font-medium">
                {member.full_name_en || ''}
              </p>
              <div className="mt-1.5 inline-block bg-white text-emerald-950 px-3 py-1 rounded-xl font-mono font-black text-sm shadow">
                আইডি: {member.member_id}
              </div>
            </div>

            {/* Micro Details Grid */}
            <div className="w-full bg-emerald-950/70 border border-emerald-500/30 rounded-2xl p-2.5 grid grid-cols-2 gap-2 text-left text-[11px]">
              <div>
                <span className="text-emerald-300/80 block text-[9px]">মোবাইল নম্বর:</span>
                <span className="font-mono font-semibold text-white">{member.mobile}</span>
              </div>
              <div>
                <span className="text-emerald-300/80 block text-[9px]">রক্তের গ্রুপ:</span>
                <span className="font-bold text-amber-300">{member.blood_group || 'O+'}</span>
              </div>
              <div>
                <span className="text-emerald-300/80 block text-[9px]">যোগদানের তারিখ:</span>
                <span className="font-mono text-white">{member.joining_date}</span>
              </div>
              <div>
                <span className="text-emerald-300/80 block text-[9px]">সদস্যপদ স্ট্যাটাস:</span>
                <span className="font-bold text-emerald-400 uppercase">{member.membership_status || 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Front Footer */}
          <div className="bg-emerald-950 px-4 py-2 border-t border-emerald-600/50 flex items-center justify-between text-[9px] text-emerald-300">
            <span>ডিজিটাল পরিচয়পত্র</span>
            <span className="font-mono text-amber-400">www.progotikalyan.org</span>
          </div>
        </div>

        {/* ================= CARD BACK ================= */}
        <div className="w-full max-w-[400px] mx-auto bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-300 relative flex flex-col justify-between min-h-[500px]">
          {/* Back Top */}
          <div className="bg-slate-900 text-white p-3 text-center border-b-2 border-amber-400">
            <h4 className="text-xs font-bold">জরুরি নির্দেশনাবলী ও শর্তাবলী</h4>
            <p className="text-[9px] text-slate-300">Emergency Contacts & Verification Rules</p>
          </div>

          {/* Back Body */}
          <div className="p-4 space-y-3 flex-1 text-xs">
            {/* Rules reminder */}
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-300 text-[10px] text-amber-950 space-y-1">
              <p className="font-bold">⚠️ গুরুত্বপূর্ণ নীতিমালা:</p>
              <p>১. এই কার্ডটি সমিতির নিজস্ব সম্পত্তি। এটি কোনো ব্যাংক ঋণ বা আর্থিক দায়ের কাজে হস্তান্তরযোগ্য নয়।</p>
              <p>২. এই সমবায় সমিতিতে <strong>কোনো প্রকার ঋণ বা সুদ প্রদান করা হয় না</strong>। এটি সম্পূর্ণ সঞ্চয় ও সামাজিক কল্যাণমুখী কার্যক্রম।</p>
            </div>

            {/* Address & Emergency Info */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1 leading-relaxed">
              <p className="font-bold text-slate-800">প্রধান কার্যালয়:</p>
              <p className="text-slate-600">{society?.address || 'হাউজ #১২, রোড #০৫, ব্লক-ডি, ধানমন্ডি আ/এ, ঢাকা'}</p>
              <p className="font-mono text-emerald-800 font-semibold">হেল্পলাইন: {society?.phone || '+880 1712-345678'}</p>
              {member.emergency_name && (
                <p className="text-slate-600 pt-1 border-t border-slate-200 text-[10px]">
                  জরুরি যোগাযোগ: {member.emergency_name} ({member.emergency_relation}) • {member.emergency_mobile}
                </p>
              )}
            </div>

            {/* QR Code & Verification */}
            <div className="flex items-center gap-3 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-300 flex items-center justify-center shrink-0">
                <QrCode className="w-12 h-12 text-emerald-800" />
              </div>
              <div className="text-[10px] text-slate-600">
                <p className="font-bold text-slate-800">অনলাইন কার্ড যাচাই:</p>
                <p>স্মার্টফোনের ক্যামেরা দিয়ে কিউআর কোড স্ক্যান করে এই কার্ডের কার্যকারিতা যাচাই করুন।</p>
              </div>
            </div>

            {/* Authorized Signatures & Seals */}
            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-4 text-center items-end">
              <div>
                <div className="h-8 flex items-center justify-center">
                  <span className="font-serif italic font-bold text-xs text-emerald-900">M. Hasan</span>
                </div>
                <div className="border-t border-slate-400 pt-0.5 text-[9px] font-bold text-slate-700">
                  সাধারণ সম্পাদক
                </div>
              </div>
              <div>
                <div className="h-8 flex items-center justify-center">
                  <span className="font-serif italic font-bold text-xs text-purple-950">A. Kalam Azad</span>
                </div>
                <div className="border-t border-slate-400 pt-0.5 text-[9px] font-bold text-slate-700">
                  সভাপতি (অনুমোদনকারী)
                </div>
              </div>
            </div>
          </div>

          {/* Back Footer */}
          <div className="bg-slate-100 p-2 text-center text-[9px] text-slate-500 border-t border-slate-200">
            কার্ডটি পাওয়া গেলে নিকটস্থ পোস্ট বক্সে অথবা সমিতির প্রধান কার্যালয়ে ফেরত দেওয়ার অনুরোধ করা হচ্ছে।
          </div>
        </div>
      </div>
    </div>
  );
};
