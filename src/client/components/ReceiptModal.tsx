import React, { useRef } from 'react';
import { Printer, Download, X, CheckCircle2, ShieldCheck, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SocietyPad } from './SocietyPad';

interface ReceiptModalProps {
  receipt: any;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  const { society, language } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/verify/${receipt.receipt_number}?token=${receipt.verification_token}`;
    if (navigator.share) {
      navigator.share({
        title: `ডিজিটাল রসিদ: ${receipt.receipt_number}`,
        text: `প্রগতি কল্যাণ সমবায় সমিতি - ডিজিটাল রসিদ নং: ${receipt.receipt_number}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert('রসিদ যাচাই লিংক কপি করা হয়েছে! / Receipt verification URL copied to clipboard!');
    }
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/verify/${receipt.receipt_number}?token=${receipt.verification_token}`;
    const text = `*${society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\n` +
      `ডিজিটাল মানি রসিদ নং: ${receipt.receipt_number}\n` +
      `সদস্য: ${receipt.member_name_bn} (${receipt.member_id})\n` +
      `জমাদানকারী: ${receipt.depositor_name || receipt.member_name_bn} (${receipt.depositor_relation || 'নিজ'})\n` +
      `জমার পরিমাণ: ৳${Number(receipt.amount).toLocaleString('bn-BD')} (${receipt.payment_months})\n` +
      `অনুমোদনের তারিখ: ${receipt.issued_at ? new Date(receipt.issued_at).toLocaleDateString('bn-BD') : ''}\n` +
      `যাচাই লিংক: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareTelegram = () => {
    const url = `${window.location.origin}/verify/${receipt.receipt_number}?token=${receipt.verification_token}`;
    const text = `*${society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\n` +
      `ডিজিটাল মানি রসিদ নং: ${receipt.receipt_number}\n` +
      `সদস্য: ${receipt.member_name_bn} (${receipt.member_id}) - পরিমাণ: ৳${Number(receipt.amount).toLocaleString('bn-BD')}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Modal Controls Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-xs sm:text-sm">
              {language === 'bn' ? 'ডিজিটাল অফিশিয়াল রসিদ' : 'Official Digital Receipt'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              title="হোয়াটসঅ্যাপে পাঠান"
            >
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handleShareTelegram}
              className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              title="টেলিগ্রামে পাঠান"
            >
              <span>Telegram</span>
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
              title="কপি লিংক"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold transition"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt on Official Society Pad */}
        <div ref={receiptRef} className="p-2 sm:p-4 bg-slate-100 max-h-[85vh] overflow-y-auto">
          <SocietyPad
            title="অফিসিয়াল মানি রসিদ (OFFICIAL MONEY RECEIPT)"
            refNo={receipt.receipt_number}
            date={receipt.issued_at ? new Date(receipt.issued_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
            verificationCode={receipt.verification_token || `VER-PKSS-${receipt.receipt_number}`}
            printedBy={`${receipt.approved_by_name || 'কোষাধ্যক্ষ'} (সমবায় প্রশাসন)`}
            approvedBy="নুরুল হক মজুমদার (কোষাধ্যক্ষ) ও ড. আবুল কালাম আজাদ (সভাপতি)"
            showSeals={true}
          >
            {/* Status & Receipt Number Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">রসিদ স্ট্যাটাস:</span>
                {receipt.status === 'valid' ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> অনুমোদিত ও কার্যকর (VALID)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-red-300">
                    বাতিলকৃত (CANCELLED)
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">রসিদ নং: </span>
                <span className="font-mono font-bold text-sm text-emerald-800">{receipt.receipt_number}</span>
              </div>
            </div>

            {/* Member & Depositor & Bank Information Grid */}
            <div className="py-4 space-y-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-500 block text-[11px]">মূল সদস্যের নাম (Member Name):</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {receipt.full_name_bn} {receipt.full_name_en ? `(${receipt.full_name_en})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">সদস্য আইডি (Member ID):</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">{receipt.member_id}</span>
                </div>

                {/* Depositor Info (Who physically deposited at bank) */}
                <div className="sm:col-span-2 p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-emerald-950 font-bold text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      ব্যাংকে জমাদানকারী (Depositor): <span className="text-slate-900 underline font-black">{receipt.depositor_name || receipt.full_name_bn}</span>
                    </span>
                    <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-300 font-semibold text-emerald-800">
                      সম্পর্ক: {receipt.depositor_relation || 'নিজ (Self)'}
                    </span>
                  </div>
                  {(receipt.depositor_nid || receipt.depositor_mobile) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600 font-mono pt-1 border-t border-emerald-200/60">
                      {receipt.depositor_nid && (
                        <span>এনআইডি / আইডি নং: <strong className="text-slate-800">{receipt.depositor_nid}</strong></span>
                      )}
                      {receipt.depositor_mobile && (
                        <span>মোবাইল: <strong className="text-slate-800">{receipt.depositor_mobile}</strong></span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">চাঁদার মাসসমূহ (Subscription Months):</span>
                  <span className="font-semibold text-slate-800">{receipt.payment_months}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">জমাকৃত ব্যাংক (Society Bank Account):</span>
                  <span className="font-medium text-slate-800">{receipt.bank_name || 'সোনালী ব্যাংক পিএলসি'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ব্যাংক ট্রানজেকশন / ডিপোজিট স্লিপ আইডি:</span>
                  <span className="font-mono font-semibold text-emerald-800">{receipt.transaction_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ব্যাংকে জমার তারিখ (Deposit Date):</span>
                  <span className="font-mono text-slate-800">{receipt.deposit_date || 'N/A'}</span>
                </div>
              </div>

              {/* Amount Box */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 border-2 border-emerald-600 rounded-xl">
                <div>
                  <p className="text-xs text-emerald-900 font-bold uppercase tracking-wide">
                    গৃহীত মোট অর্থ / Total Amount Received
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    (সদস্যের মাসিক কল্যাণ ও সঞ্চয় চাঁদা বাবদ গৃহীত • ঋণ বহির্ভূত)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono">
                    ৳{Number(receipt.amount).toLocaleString('en-IN')}/-
                  </span>
                </div>
              </div>

              {/* QR Verification Box */}
              <div className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                {receipt.qr_code_data && (
                  <div className="p-1 bg-white border border-slate-300 rounded-lg shrink-0">
                    <img
                      src={receipt.qr_code_data}
                      alt="Verification QR"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                    />
                  </div>
                )}
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-1 font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>ডিজিটাল কিউআর কোড নিরাপত্তা যাচাই</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    যেকোনো স্মার্টফোনের ক্যামেরা বা কিউআর কোড স্ক্যানার দিয়ে স্ক্যান করে এই রসিদের সার্ভার যাচাই ও সত্যতা নিশ্চিত করা যাবে।
                  </p>
                  <p className="text-[10px] font-mono text-emerald-800 font-semibold">
                    টোকেন: {receipt.verification_token}
                  </p>
                </div>
              </div>
            </div>
          </SocietyPad>
        </div>
      </div>
    </div>
  );
};
