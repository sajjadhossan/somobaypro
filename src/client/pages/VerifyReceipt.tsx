import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck, 
  Search, Building2, Calendar, CreditCard, ArrowLeft 
} from 'lucide-react';

interface VerifyReceiptProps {
  receiptNumberProp?: string;
}

export const VerifyReceipt: React.FC<VerifyReceiptProps> = ({ receiptNumberProp }) => {
  const [receiptNumber, setReceiptNumber] = useState(receiptNumberProp || '');
  const [token, setToken] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract from URL if navigated directly (e.g. /verify/RCP-2026-000001?token=...)
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart.startsWith('RCP-')) {
      setReceiptNumber(lastPart);
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      if (tokenParam) setToken(tokenParam);
      verifyReceipt(lastPart, tokenParam || '');
    } else if (receiptNumberProp) {
      verifyReceipt(receiptNumberProp, '');
    }
  }, [receiptNumberProp]);

  const verifyReceipt = async (rcpNo: string, tok: string) => {
    if (!rcpNo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const url = `/api/receipts/verify/${rcpNo.trim()}${tok ? `?token=${tok}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || 'রসিদটি খুঁজে পাওয়া যায়নি অথবা অবৈধ।');
        setResult(data);
      }
    } catch (err) {
      setError('সার্ভারে যোগাযোগ করা যায়নি। ইন্টারনেট সংযোগ চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanRcp = receiptNumber.trim();
    let cleanTok = token.trim();

    // Support pasting full QR scan text or URL
    const rcpMatch = cleanRcp.match(/RCP-\d{4}-\d+/i);
    if (rcpMatch) {
      cleanRcp = rcpMatch[0].toUpperCase();
    }
    const tokenMatch = cleanRcp.match(/(?:টোকেন|token|token=)\s*:?\s*([a-f0-9]{16,64})/i);
    if (tokenMatch) {
      cleanTok = tokenMatch[1];
    }

    verifyReceipt(cleanRcp, cleanTok);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-xl mx-auto w-full space-y-6">
        
        {/* Navigation Back */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>হোমে ফিরে যান</span>
          </a>
          <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
            পাবলিক ভেরিফিকেশন পোর্টাল
          </span>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            রসিদ সত্যতা যাচাই পোর্টাল
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            প্রগতি কল্যাণ সমবায় সমিতি লিমিটেডের সকল ডিজিটাল রসিদ এই পাবলিক পোর্টাল থেকে যেকোনো সময় যাচাই করা যায়।
          </p>

          {/* Search Input Box */}
          <form onSubmit={handleManualSearch} className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="রসিদ নম্বর লিখুন (e.g. RCP-2026-000001)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-700/20 transition disabled:opacity-50"
            >
              {loading ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
            </button>
          </form>
        </div>

        {/* Verification Result Card */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            {/* Status Header */}
            <div
              className={`p-5 text-center text-white ${
                result.valid
                  ? 'bg-emerald-600'
                  : result.status === 'CANCELLED'
                  ? 'bg-amber-600'
                  : 'bg-red-600'
              }`}
            >
              <div className="inline-flex items-center justify-center p-2 rounded-full bg-white/20 mb-2">
                {result.valid ? (
                  <CheckCircle2 className="w-8 h-8 text-white" />
                ) : result.status === 'CANCELLED' ? (
                  <AlertTriangle className="w-8 h-8 text-white" />
                ) : (
                  <XCircle className="w-8 h-8 text-white" />
                )}
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider">
                {result.status === 'VALID'
                  ? 'বৈধ ও অনুমোদিত রসিদ (VALID)'
                  : result.status === 'CANCELLED'
                  ? 'রসিদটি বাতিল করা হয়েছে (CANCELLED)'
                  : 'অবৈধ বা ভুয়া রসিদ (INVALID)'}
              </h2>
              <p className="text-xs opacity-90 font-mono mt-1">
                রসিদ নং: {result.receiptNumber || receiptNumber}
              </p>
            </div>

            {/* Verified Details */}
            {result.receiptNumber && (
              <div className="p-6 space-y-4 text-xs sm:text-sm">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 divide-y divide-slate-200">
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">সমিতির নাম:</span>
                    <span className="font-bold text-slate-800 text-right">{result.societyNameBn}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">নিবন্ধন নং:</span>
                    <span className="font-mono text-slate-700">{result.societyRegNo}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">সদস্যের নাম:</span>
                    <span className="font-bold text-slate-900">{result.memberNameBn}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">সদস্য আইডি (সুরক্ষিত):</span>
                    <span className="font-mono font-bold text-emerald-700">{result.memberId}</span>
                  </div>
                  <div className="py-2 flex justify-between bg-emerald-50/50 px-2 rounded">
                    <span className="text-emerald-900 font-medium">ব্যাংকে জমাদানকারী:</span>
                    <span className="font-bold text-slate-900">
                      {result.depositorName} <span className="text-xs text-emerald-700 font-normal">({result.depositorRelation})</span>
                    </span>
                  </div>
                  {result.depositorNid && (
                    <div className="py-1 flex justify-between text-[11px] text-slate-500 px-2">
                      <span>জমাদানকারীর এনআইডি/আইডি:</span>
                      <span className="font-mono text-slate-700">{result.depositorNid}</span>
                    </div>
                  )}
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">চাঁদার মাস:</span>
                    <span className="font-semibold text-slate-800">{result.paymentMonths}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">জমাকৃত ব্যাংক:</span>
                    <span className="text-slate-800">{result.bankName}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">জমার তারিখ:</span>
                    <span className="font-mono text-slate-800">{result.depositDate}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-500 font-medium">অনুমোদনের তারিখ:</span>
                    <span className="font-mono text-slate-800">
                      {new Date(result.issuedAt).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between">
                  <span className="font-bold text-emerald-900">অনুমোদিত পরিশোধিত অর্থ:</span>
                  <span className="text-2xl font-black text-emerald-800 font-mono">
                    ৳{Number(result.amount).toLocaleString('en-IN')}/-
                  </span>
                </div>

                {result.cancelledReason && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs">
                    <p className="font-bold">বাতিলকরণের কারণ:</p>
                    <p>{result.cancelledReason}</p>
                  </div>
                )}

                <div className="text-center pt-2 text-[11px] text-slate-400">
                  <p>নিরাপত্তা নীতি: সদস্যের এনআইডি ও ব্যক্তিগত ফোন নম্বর সুরক্ষিত রাখা হয়েছে।</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && !result && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-xs text-center font-medium">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        <p>© 2026 প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড • সর্বস্বত্ব সংরক্ষিত</p>
        <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
          সতর্কীকরণ: সমিতি কোনো প্রকার ঋণ প্রদান করে না।
        </p>
      </footer>
    </div>
  );
};
