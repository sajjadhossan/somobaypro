import React, { useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Printer, Download, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';

interface ShareCertificateModalProps {
  member?: any;
  onClose: () => void;
}

export const ShareCertificateModal: React.FC<ShareCertificateModalProps> = ({ member, onClose }) => {
  const { user, society, language } = useAuth();
  const certMember = member || user;
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

  const certNumber = `CERT-${certMember?.memberId || 'SOC-0001'}`;
  const verifyUrl = `${window.location.origin}/verify?memberId=${certMember?.memberId}`;

  React.useEffect(() => {
    QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [verifyUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm tracking-wide">
              অফিসিয়াল সমবায় শেয়ার সনদপত্র (Official Share Certificate)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF সংরক্ষণ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas */}
        <div className="p-4 sm:p-8 bg-slate-100 print:p-0 print:bg-white">
          <div className="relative bg-[#fffdfa] border-[10px] border-double border-emerald-800 p-6 sm:p-10 rounded-2xl shadow-xl overflow-hidden print:border-8 print:shadow-none print:m-0">
            
            {/* Background Watermark Seal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <img
                src="/somobaypro-logo.svg"
                alt="Watermark"
                className="w-[500px] h-[500px] object-contain"
              />
            </div>

            {/* Corner Ornamental Flourishes */}
            <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2 border-amber-600 pointer-events-none" />

            {/* Certificate Header */}
            <div className="text-center space-y-1 relative z-10">
              <p className="text-[11px] sm:text-xs font-serif tracking-widest text-slate-600 uppercase font-semibold">
                গণপ্রজাতন্ত্রী বাংলাদেশ সরকার অনুমোদিত সমবায় সমিতি বিধিমালা
              </p>
              
              <div className="flex items-center justify-center gap-3 pt-1">
                <img
                  src="/somobaypro-logo.svg"
                  alt="Logo"
                  className="w-12 h-12 object-contain"
                />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight font-serif">
                    {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
                  </h1>
                  <p className="text-xs text-slate-500 font-mono">
                    রেজিস্ট্রেশন নং: <strong className="text-slate-800">{society?.reg_no || 'রেজি-ঢাকা-২০২৬-৯৮৪'}</strong> • স্থাপিত: {(society as any)?.est_date || '২০২৬'}
                  </p>
                </div>
              </div>

              {/* Title Badge */}
              <div className="py-2.5">
                <div className="inline-block px-6 py-1.5 rounded-full bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-amber-200 border border-amber-500/40 shadow-sm">
                  <h2 className="text-base sm:text-lg font-bold tracking-wider font-serif uppercase">
                    মূলধন শেয়ার সনদপত্র (Share Certificate)
                  </h2>
                </div>
              </div>
            </div>

            {/* Certificate Meta Details */}
            <div className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 pb-2 mt-2 relative z-10 font-mono">
              <div>সনদ নং: <strong className="text-emerald-800">{certNumber}</strong></div>
              <div>সদস্য আইডি: <strong className="text-emerald-800">{certMember?.memberId || certMember?.member_id}</strong></div>
              <div>ইস্যুর তারিখ: <strong className="text-slate-800">{certMember?.joiningDate || certMember?.joining_date || '০১ জানুয়ারি ২০২৬'}</strong></div>
            </div>

            {/* Certificate Body Text */}
            <div className="my-6 text-slate-800 text-sm sm:text-base leading-relaxed text-center sm:text-justify font-serif relative z-10 px-2 sm:px-6">
              <p className="mb-4">
                এতদ্দ্বারা প্রত্যায়ন করা যাইতেছে যে, জনাব/বেগম{' '}
                <strong className="text-emerald-950 font-bold border-b border-slate-400 px-2 text-base sm:text-lg">
                  {certMember?.fullNameBn || certMember?.full_name_bn || 'সম্মানিত সদস্য'}
                </strong>
                , পিতা/স্বামী: <span className="font-semibold">{certMember?.fatherName || certMember?.father_name || 'মোঃ রফিকুল ইসলাম'}</span>
                , মাতা: <span className="font-semibold">{certMember?.motherName || certMember?.mother_name || 'মোসাম্মৎ আয়েশা বেগম'}</span>
                , জাতীয় পরিচয়পত্র (NID): <span className="font-mono font-semibold">{certMember?.nidNumber || certMember?.nid_number || '১৯৮৯২৬১২৩৪৫৬৭'}</span>
                , মোবাইল: <span className="font-mono font-semibold">{certMember?.mobile}</span>, বর্তমান ঠিকানা: {certMember?.presentAddress || certMember?.present_address || 'ধানমন্ডি, ঢাকা'};
              </p>

              <p className="mb-2">
                তিনি <strong className="text-emerald-900 font-bold">{society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}</strong>-এর একজন নিয়মিত বৈধ ও নিবন্ধিত সাধারণ অংশীদার সদস্য। তিনি সমিতির সাধারণ মূলধনের{' '}
                <strong className="text-slate-900 font-bold bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  ১০ (দশ) টি পরিশোধিত সাধারণ শেয়ার
                </strong>{' '}
                (প্রতিটি শেয়ারের অভিহিত মূল্য ৳১০০/- টাকা হিসেবে মোট <strong>৳১,০০০/- (এক হাজার টাকা মাত্র)</strong>) এর মালিকানা অর্জন করিয়াছেন এবং সমিতির উপ-আইন ও গঠনতন্ত্রের সমস্ত বিধি-বিধান মানিয়া চলিতে বাধ্য থাকিবেন।
              </p>
            </div>

            {/* Share Capital Denomination Table */}
            <div className="my-4 max-w-lg mx-auto bg-emerald-50/60 rounded-xl border border-emerald-200 p-3 text-xs text-slate-700 relative z-10">
              <div className="grid grid-cols-3 text-center divide-x divide-emerald-200">
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">শেয়ার সংখ্যা</p>
                  <p className="text-sm font-bold text-emerald-900 font-mono">১০ টি</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">প্রতি শেয়ারের মূল্য</p>
                  <p className="text-sm font-bold text-slate-900 font-mono">৳১০০.০০</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">মোট শেয়ার মূলধন</p>
                  <p className="text-sm font-bold text-emerald-800 font-mono">৳১,০০০.০০</p>
                </div>
              </div>
            </div>

            {/* Footer with QR Seal and Signatures */}
            <div className="pt-6 mt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
              
              {/* QR Verification Seal */}
              <div className="flex items-center gap-3">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Verification"
                    className="w-16 h-16 p-1 bg-white border border-slate-300 rounded-lg shadow-sm"
                  />
                )}
                <div className="text-[11px] text-slate-500 leading-tight">
                  <div className="flex items-center gap-1 font-bold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ডিজিটাল সত্যতা যাচাই</span>
                  </div>
                  <p className="text-[10px] mt-0.5">কিউআর কোড স্ক্যান করে অনলাইন ডাটাবেজে সনদ যাচাই করুন।</p>
                </div>
              </div>

              {/* Official Society Emblem Badge */}
              <div className="hidden md:flex flex-col items-center">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-amber-600 bg-amber-50 flex items-center justify-center text-amber-800 text-[10px] font-bold text-center leading-none p-1 shadow-inner">
                  অফিসিয়াল<br/>সিলমোহর
                </div>
              </div>

              {/* Signatures */}
              <div className="flex items-center gap-8 text-center text-xs">
                <div>
                  <div className="h-10 flex items-end justify-center mb-1">
                    <span className="font-serif italic font-bold text-emerald-900 text-sm tracking-wide border-b border-slate-400 pb-0.5">
                      সায়েম আহমেদ
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">সাধারণ সম্পাদক</p>
                  <p className="text-[10px] text-slate-500">প্রগতি কল্যাণ সমবায় সমিতি</p>
                </div>

                <div>
                  <div className="h-10 flex items-end justify-center mb-1">
                    <span className="font-serif italic font-bold text-emerald-900 text-sm tracking-wide border-b border-slate-400 pb-0.5">
                      আব্দুর রহমান
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">সভাপতি</p>
                  <p className="text-[10px] text-slate-500">প্রগতি কল্যাণ সমবায় সমিতি</p>
                </div>
              </div>
            </div>

            {/* Strict No-Loan Legal Footnote */}
            <div className="mt-6 pt-2 border-t border-slate-100 text-[10px] text-center text-slate-400 font-mono">
              * এই সনদপত্র শুধুমাত্র সমবায়ের মূলধন মালিকানার প্রমাণ। সমিতি কোনো প্রকার ঋণ বা সুদী লেনদেন পরিচালনা করে না।
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
