import React, { useRef } from 'react';
import { Printer, Download, X, CheckCircle2, ShieldCheck, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold transition"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-red-600 text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div ref={receiptRef} className="p-6 sm:p-8 bg-white text-slate-900 printable-area">
          {/* Header */}
          <div className="border-b-2 border-emerald-700 pb-5 text-center relative">
            <div className="flex items-center justify-center gap-3">
              <img
                src={society?.logo_url || '/logo.svg'}
                alt="Logo"
                className="w-16 h-16 object-contain"
              />
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}
                </h2>
                <p className="text-xs font-medium text-slate-600">
                  {society?.name_en || 'Progoti Kalyan Somobay Samity Ltd.'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  নিবন্ধন নং: {society?.reg_no || 'REG-DH-2018-0942'} • {society?.address || 'ধানমন্ডি, ঢাকা'}
                </p>
                <p className="text-xs text-slate-500 font-mono">ফোন: {society?.phone} • ইমেইল: {society?.email}</p>
              </div>
            </div>

            <div className="mt-4 inline-block bg-emerald-100 text-emerald-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-300">
              {receipt.status === 'valid' ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  মানি রিসিদ / MONEY RECEIPT (APPROVED)
                </span>
              ) : (
                <span className="text-red-600 font-bold">বাতিলকৃত রসিদ / CANCELLED RECEIPT</span>
              )}
            </div>
          </div>

          {/* Receipt Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs py-4 border-b border-slate-200">
            <div>
              <p className="text-slate-500 font-medium">রসিদ নম্বর / Receipt No:</p>
              <p className="font-mono font-bold text-sm text-emerald-800">{receipt.receipt_number}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium">ইস্যুর তারিখ / Issue Date:</p>
              <p className="font-mono font-semibold text-slate-800">
                {new Date(receipt.issued_at || Date.now()).toLocaleDateString('bn-BD', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Member & Payment Details Table */}
          <div className="py-4 space-y-3">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">সদস্যের নাম / Member Name:</span>
                <span className="font-bold text-slate-900">{receipt.full_name_bn} ({receipt.full_name_en || ''})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">সদস্য আইডি / Member ID:</span>
                <span className="font-mono font-bold text-emerald-700">{receipt.member_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">চাঁদার মাস / Subscription Month(s):</span>
                <span className="font-semibold text-slate-800">{receipt.payment_months}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">জমাকৃত ব্যাংক / Bank Name:</span>
                <span className="font-medium text-slate-800">{receipt.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ব্যাংক ট্রানজেকশন/স্লিপ আইডি:</span>
                <span className="font-mono font-medium text-slate-800">{receipt.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">জমার তারিখ / Deposit Date:</span>
                <span className="font-mono text-slate-800">{receipt.deposit_date}</span>
              </div>
            </div>

            {/* Amount Box */}
            <div className="flex items-center justify-between p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl">
              <div>
                <p className="text-xs text-emerald-800 font-bold uppercase">গৃহীত মোট অর্থ / Total Amount Received</p>
                <p className="text-[11px] text-emerald-700">কথায়: এক হাজার টাকা মাত্র (অনুমোদিত)</p>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
                  ৳{Number(receipt.amount).toLocaleString('en-IN')}/-
                </span>
              </div>
            </div>
          </div>

          {/* Verification QR & Signatures */}
          <div className="pt-4 flex items-end justify-between border-t border-slate-200">
            {/* QR Code */}
            <div className="flex items-center gap-3">
              <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-sm">
                <img
                  src={receipt.qr_code_data}
                  alt="QR Code"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                />
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 max-w-[150px] leading-tight">
                <p className="font-bold text-slate-700">অনলাইন সত্যতা যাচাই:</p>
                <p>স্মার্টফোনের ক্যামেরা দিয়ে কিউআর কোড স্ক্যান করে এই রসিদের বৈধতা যাচাই করুন।</p>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="flex items-center gap-6 sm:gap-10 text-center">
              <div className="text-center">
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic text-emerald-900 font-bold text-sm">Nurul Haque</span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-600 font-semibold">
                  কোষাধ্যক্ষ / Cashier
                </div>
              </div>

              <div className="text-center">
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif italic text-emerald-900 font-bold text-sm">A. Kalam</span>
                </div>
                <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-600 font-semibold">
                  সভাপতি / President
                </div>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-6 pt-3 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-500">
            <p className="font-medium text-slate-700">
              {society?.receipt_footer || 'এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল রসিদ। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।'}
            </p>
            <p className="text-slate-400 mt-0.5">
              প্রগতি কল্যাণ সমবায় সমিতি • কোনো ঋণ প্রদান করা হয় না • সঞ্চয় ও কল্যাণমুখী কার্যক্রম
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
