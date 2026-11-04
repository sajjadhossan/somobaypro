import React from 'react';
import { useAuth } from '../context/AuthContext';
import { OfficialSeal } from './OfficialSeal';
import { ShieldCheck, QrCode } from 'lucide-react';

interface SocietyPadProps {
  title?: string;
  refNo?: string;
  date?: string;
  verificationCode?: string;
  printedBy?: string;
  approvedBy?: string;
  showSeals?: boolean;
  children: React.ReactNode;
}

export const SocietyPad: React.FC<SocietyPadProps> = ({
  title,
  refNo,
  date = new Date().toISOString().split('T')[0],
  verificationCode,
  printedBy,
  approvedBy,
  showSeals = true,
  children,
}) => {
  const { society, user, language } = useAuth();

  // Auto-generate verification code if not provided
  const effectiveVerificationCode =
    verificationCode ||
    `VER-${society?.short_name || 'PKSS'}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const effectivePrintedBy = printedBy || `${user?.fullNameBn || 'কর্তৃপক্ষ'} (${user?.designation || user?.role || 'কর্মকর্তা'})`;
  const effectiveApprovedBy = approvedBy || 'ড. আবুল কালাম আজাদ (সভাপতি) ও নুরুল হক (কোষাধ্যক্ষ)';

  // Saved signatures from local storage or defaults
  const treasurerSig = localStorage.getItem(`pkss_sig_SOC-2026-0005`) || null;
  const presidentSig = localStorage.getItem(`pkss_sig_SOC-2026-0003`) || null;
  const secretarySig = localStorage.getItem(`pkss_sig_SOC-2026-0004`) || null;

  return (
    <div className="bg-white text-slate-900 border border-slate-300 shadow-xl rounded-2xl overflow-hidden p-6 sm:p-10 max-w-4xl mx-auto printable-area relative font-sans">
      
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] z-0">
        <img
          src={society?.logo_url || '/logo.svg'}
          alt="Watermark"
          className="w-96 h-96 object-contain filter grayscale"
        />
      </div>

      <div className="relative z-10 space-y-6">
        
        {/* ================= OFFICIAL LETTERHEAD PAD HEADER ================= */}
        <header className="border-b-2 border-emerald-800 pb-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            
            {/* Left: Official Colorful Society Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <img
                src={society?.logo_url || '/logo.svg'}
                alt="Society Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow"
              />
            </div>

            {/* Center: Society Name, Reg, and Established Details */}
            <div className="text-center sm:text-left flex-1 px-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত নিবন্ধিত সমবায় সমিতি
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
              </h1>
              <h2 className="text-xs sm:text-sm font-bold text-slate-600 font-sans tracking-wide">
                {society?.name_en || 'Progoti Kalyan Somobay Samity Ltd.'}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                সরকারি নিবন্ধন নং: <strong className="font-mono text-slate-800">{society?.reg_no || 'REG-DH-2018-0942'}</strong> • স্থাপিত: ২০১৮ খ্রিষ্টাব্দ
              </p>
            </div>

            {/* Right: Registered Office Address & Official Contacts */}
            <div className="text-center sm:text-right text-[11px] text-slate-600 sm:max-w-[240px] leading-relaxed shrink-0 border-t sm:border-t-0 sm:border-l sm:pl-3 border-slate-200 pt-2 sm:pt-0">
              <p className="font-bold text-slate-800">প্রধান কার্যালয়:</p>
              <p className="line-clamp-2">{society?.address || 'হাউজ #১২, রোড #০৫, ব্লক-ডি, ধানমন্ডি আ/এ'}</p>
              <p className="font-medium text-slate-700">{society?.upazila || 'ধানমন্ডি'}, {society?.district || 'ঢাকা-১২০৫'}</p>
              <p className="font-mono text-emerald-800 font-semibold mt-1">ফোন: {society?.phone || '+880 1712-345678'}</p>
              <p className="text-slate-500 font-mono text-[10px] truncate">ইমেইল: {society?.email || 'info@progotikalyan.org'}</p>
            </div>
          </div>

          {/* Golden & Emerald Dual Decorative Ribbon Bar */}
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-emerald-600/40 text-[11px] font-mono font-semibold text-slate-700">
            <div>
              <span className="text-slate-500">স্মারক নং / Ref: </span>
              <strong className="text-slate-900 font-mono">{refNo || `PKSS/ADM/${new Date().getFullYear()}/084`}</strong>
            </div>
            <div>
              <span className="text-slate-500">তারিখ / Date: </span>
              <strong className="text-slate-900 font-mono">{date}</strong>
            </div>
            <div>
              <span className="text-slate-500">ভেরিফিকেশন কোড: </span>
              <strong className="text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {effectiveVerificationCode}
              </strong>
            </div>
          </div>
        </header>

        {/* Document Title if provided */}
        {title && (
          <div className="text-center py-2">
            <h2 className="inline-block text-base sm:text-lg font-black text-slate-900 border-b-2 border-slate-800 pb-1 px-4 uppercase tracking-wide">
              {title}
            </h2>
          </div>
        )}

        {/* ================= PAD BODY (CHILDREN CONTENT) ================= */}
        <main className="min-h-[220px]">
          {children}
        </main>

        {/* ================= OFFICIAL SEALS & DIGITAL SIGNATURES ================= */}
        {showSeals && (
          <section className="pt-6 border-t-2 border-slate-300 mt-8">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center mb-4">
              যাচাইকৃত ও অনুমোদিত স্বাক্ষর ও অফিশিয়াল সিল মোহর (Authorized Verification & Official Seals)
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end text-center">
              
              {/* 1. প্রস্তুতকারী / কোষাধ্যক্ষ সিল ও সাইন */}
              <div className="flex flex-col items-center justify-end relative">
                {/* Official Round Stamp / Seal */}
                <div className="absolute -top-12 z-0 opacity-80 pointer-events-none">
                  <OfficialSeal
                    societyName={society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'}
                    designation="কোষাধ্যক্ষ"
                    officialName="নুরুল হক"
                    date={date}
                    verificationCode={effectiveVerificationCode}
                    color="#1e3a8a"
                    size={110}
                  />
                </div>

                {/* Digital Signature */}
                <div className="h-12 flex items-center justify-center relative z-10 mb-1">
                  {treasurerSig ? (
                    <img src={treasurerSig} alt="Treasurer Signature" className="h-10 object-contain" />
                  ) : (
                    <span className="font-serif italic text-lg text-blue-900 font-bold">
                      Nurul Haque
                    </span>
                  )}
                </div>

                {/* Official Title Line */}
                <div className="w-full border-t border-slate-800 pt-1 text-xs">
                  <p className="font-bold text-slate-900">নুরুল হক মজুমদার</p>
                  <p className="text-[10px] text-slate-600 font-semibold">কোষাধ্যক্ষ (অর্থ সম্পাদক)</p>
                  <p className="text-[9px] text-slate-400 font-mono">আইডি: SOC-2026-0005</p>
                </div>
              </div>

              {/* 2. সাধারণ সম্পাদক সিল ও সাইন */}
              <div className="flex flex-col items-center justify-end relative">
                <div className="absolute -top-12 z-0 opacity-80 pointer-events-none">
                  <OfficialSeal
                    societyName={society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'}
                    designation="সাধারণ সম্পাদক"
                    officialName="মাহমুদুল হাসান"
                    date={date}
                    verificationCode={effectiveVerificationCode}
                    color="#047857"
                    size={110}
                  />
                </div>

                <div className="h-12 flex items-center justify-center relative z-10 mb-1">
                  {secretarySig ? (
                    <img src={secretarySig} alt="Secretary Signature" className="h-10 object-contain" />
                  ) : (
                    <span className="font-serif italic text-lg text-emerald-900 font-bold">
                      M. Hasan
                    </span>
                  )}
                </div>

                <div className="w-full border-t border-slate-800 pt-1 text-xs">
                  <p className="font-bold text-slate-900">মাহমুদুল হাসান চৌধুরী</p>
                  <p className="text-[10px] text-slate-600 font-semibold">সাধারণ সম্পাদক (সচিবালয়)</p>
                  <p className="text-[9px] text-slate-400 font-mono">আইডি: SOC-2026-0004</p>
                </div>
              </div>

              {/* 3. সভাপতি সিল ও সাইন (সর্বোচ্চ অনুমোদন) */}
              <div className="flex flex-col items-center justify-end relative">
                <div className="absolute -top-12 z-0 opacity-80 pointer-events-none">
                  <OfficialSeal
                    societyName={society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি'}
                    designation="সভাপতি"
                    officialName="ড. আবুল কালাম"
                    date={date}
                    verificationCode={effectiveVerificationCode}
                    color="#6b21a8" // Royal purple rubber seal
                    size={110}
                  />
                </div>

                <div className="h-12 flex items-center justify-center relative z-10 mb-1">
                  {presidentSig ? (
                    <img src={presidentSig} alt="President Signature" className="h-10 object-contain" />
                  ) : (
                    <span className="font-serif italic text-lg text-purple-950 font-bold">
                      Dr. A. Kalam Azad
                    </span>
                  )}
                </div>

                <div className="w-full border-t border-slate-800 pt-1 text-xs">
                  <p className="font-bold text-slate-900">ড. আবুল কালাম আজাদ</p>
                  <p className="text-[10px] text-slate-600 font-semibold">সভাপতি (কার্যনির্বাহী পরিষদ)</p>
                  <p className="text-[9px] text-slate-400 font-mono">আইডি: SOC-2026-0003</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= OFFICIAL FOOTER & VERIFICATION AUDIT RIBBON ================= */}
        <footer className="mt-6 pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 font-mono">
            <span>
              মুদ্রণকারী (Printed By): <strong className="text-slate-800">{effectivePrintedBy}</strong>
            </span>
            <span>
              অনুমোদনকারী (Approved By): <strong className="text-slate-800">{effectiveApprovedBy}</strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 pt-1 border-t border-slate-100">
            <span className="text-slate-600">
              {society?.receipt_footer || 'এটি একটি সরকারি নিবন্ধিত সমবায় সমিতির কম্পিউটার জেনারেটেড ডিজিটাল নথি।'}
            </span>
            <span className="text-emerald-700 font-bold font-mono">
              অনলাইন সত্যতা যাচাই কোড: {effectiveVerificationCode}
            </span>
          </div>

          <div className="text-center text-slate-400 pt-1 text-[9px]">
            প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড • কোনো প্রকার ঋণ প্রদান করা হয় না • শতভাগ কল্যাণ ও সঞ্চয় কার্যক্রম
          </div>
        </footer>
      </div>
    </div>
  );
};
