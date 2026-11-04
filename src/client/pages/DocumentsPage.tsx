import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, ShieldCheck, Plus, X } from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const { user, language } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pkss_token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" />
          <span>{language === 'bn' ? 'সোসাইটি নথিপত্র ও গঠনতন্ত্র' : 'Society Documents & Bylaws'}</span>
        </h1>
        <p className="text-xs text-slate-500">
          সমবায় অধিদপ্তরের অনুমোদিত উপ-আইন, নিবন্ধন সনদ ও বার্ষিক নিরীক্ষা (Audit) প্রতিবেদন
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase font-mono">
                {doc.category}
              </span>
              <h2 className="font-bold text-slate-900 text-sm mt-1">{doc.title}</h2>
              <p className="text-[11px] text-slate-400">সাইজ: {doc.file_size || '1.5 MB'}</p>
            </div>

            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>ডকুমেন্ট ডাউনলোড</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
