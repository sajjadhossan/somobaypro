import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, History, Search } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { user, language } = useAuth();
  const [activeTab, setActiveTab] = useState<'audit' | 'logins'>('audit');
  const [logs, setLogs] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pkss_token');
      const headers = { Authorization: `Bearer ${token}` };

      if (activeTab === 'audit') {
        const res = await fetch('/api/audit/logs', { headers });
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } else {
        const res = await fetch('/api/audit/logins', { headers });
        if (res.ok) {
          const data = await res.json();
          setLoginHistory(data.loginHistory || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-600" />
          <span>{language === 'bn' ? 'নিরাপত্তা অডিট লগ ও লগইন হিস্ট্রি' : 'Security Audit & Login History'}</span>
        </h1>
        <p className="text-xs text-slate-500">
          সিস্টেমের সকল সংবেদনশীল অ্যাকশন, অনুমতি পর্যালোচনা এবং আইপি ভিত্তিক লগইন ইতিহাস
        </p>
      </div>

      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'audit' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500'
          }`}
        >
          অডিট লগ (Audit Logs)
        </button>
        <button
          onClick={() => setActiveTab('logins')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'logins' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500'
          }`}
        >
          লগইন ইতিহাস (Login History)
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'audit' ? (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b text-[10px] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">অ্যাকশন</th>
                  <th className="p-3">ইউজার / রোল</th>
                  <th className="p-3">মডিউল / এন্টিটি</th>
                  <th className="p-3">আইপি এড্রেস</th>
                  <th className="p-3">সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-emerald-800">{l.action}</td>
                    <td className="p-3 text-slate-800">{l.user_name || l.user_role}</td>
                    <td className="p-3 text-slate-600">{l.entity_type} #{l.entity_id || ''}</td>
                    <td className="p-3 text-slate-500">{l.ip_address || 'local'}</td>
                    <td className="p-3 text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b text-[10px] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">আইডেন্টিফায়ার</th>
                  <th className="p-3">মেম্বার আইডি</th>
                  <th className="p-3">রোল</th>
                  <th className="p-3">আইপি এড্রেস</th>
                  <th className="p-3">ফলাফল</th>
                  <th className="p-3">সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loginHistory.map((lh) => (
                  <tr key={lh.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-bold text-slate-800">{lh.identifier_used}</td>
                    <td className="p-3 text-emerald-700">{lh.member_id || '-'}</td>
                    <td className="p-3 uppercase text-[10px]">{lh.role || '-'}</td>
                    <td className="p-3 text-slate-500">{lh.ip_address || 'local'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lh.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {lh.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{new Date(lh.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
