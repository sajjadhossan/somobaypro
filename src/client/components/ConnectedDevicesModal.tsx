import React, { useEffect } from 'react';
import { Smartphone, Laptop, Monitor, Wifi, RefreshCw, X, Shield, Clock } from 'lucide-react';
import { useRealtime, ConnectedDeviceInfo } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';

interface ConnectedDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectedDevicesModal: React.FC<ConnectedDevicesModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, onlineDevices, connectedDevices, refreshDevices } = useRealtime();
  const { language } = useAuth();

  useEffect(() => {
    if (isOpen) {
      refreshDevices();
    }
  }, [isOpen, refreshDevices]);

  // Intercept Android hardware back button
  useEffect(() => {
    const handleBack = (e: Event) => {
      if (isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('pkss:backpress', handleBack);
    return () => window.removeEventListener('pkss:backpress', handleBack);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getDeviceIcon = (type: ConnectedDeviceInfo['deviceType']) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-emerald-600" />;
      case 'tablet':
        return <Laptop className="w-5 h-5 text-blue-600" />;
      case 'desktop':
        return <Monitor className="w-5 h-5 text-purple-600" />;
      default:
        return <Smartphone className="w-5 h-5 text-slate-600" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'এখনই';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Wifi className="w-5 h-5 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {language === 'bn' ? 'সংযুক্ত ডিভাইস ও লাইভ সিঙ্ক' : 'Connected Devices & Live Sync'}
              </h3>
              <p className="text-xs text-emerald-200 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{language === 'bn' ? `${onlineDevices}টি ডিভাইস সক্রিয় রয়েছে` : `${onlineDevices} active device(s)`}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => refreshDevices()}
              className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs">
          <span className="text-emerald-900 font-medium flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>{language === 'bn' ? 'রিয়েল-টাইম ক্লাউড সিঙ্ক চালু আছে' : 'Real-time Cloud Sync Active'}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 font-mono">
            SSL 256-bit
          </span>
        </div>

        {/* Device List */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {connectedDevices.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Smartphone className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">
                {language === 'bn' ? 'বর্তমান ডিভাইসটি সংযুক্ত রয়েছে' : 'Current device is connected'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'bn' ? 'অন্য কোনো ডিভাইস থেকে লগইন করলে তা এখানে প্রদর্শিত হবে।' : 'New logins will appear here automatically.'}
              </p>
            </div>
          ) : (
            connectedDevices.map((dev, idx) => (
              <div
                key={dev.id || idx}
                className="p-3.5 rounded-2xl border border-slate-100 hover:border-emerald-200 bg-slate-50/70 hover:bg-emerald-50/30 transition flex items-start gap-3"
              >
                <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-200 shrink-0">
                  {getDeviceIcon(dev.deviceType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {dev.deviceName || 'স্মার্ট ডিভাইস'}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>অনলাইন</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>IP: {dev.ip || '127.0.0.1'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatTime(dev.connectedAt)}</span>
                    </span>
                  </div>
                  {dev.role && (
                    <div className="mt-1.5">
                      <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded bg-slate-200/80 text-slate-700 uppercase tracking-wider">
                        {dev.role}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {language === 'bn' ? 'সকল ডাটা তাৎক্ষণিক সিঙ্ক হয়' : 'All data synchronizes instantly'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            {language === 'bn' ? 'ঠিক আছে' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
