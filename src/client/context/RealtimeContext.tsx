import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Wifi, WifiOff, Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface RealtimeAlert {
  id: string;
  type: 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED' | 'PAYMENT_SUBMITTED' | 'NOTICE_PUBLISHED' | 'MEETING_SCHEDULED' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
}

export interface ConnectedDeviceInfo {
  id: string;
  userId: number;
  memberId: string;
  role: string;
  ip: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  connectedAt: string;
}

interface RealtimeContextType {
  isConnected: boolean;
  onlineDevices: number;
  connectedDevices: ConnectedDeviceInfo[];
  refreshDevices: () => Promise<void>;
  lastSyncAt: string | null;
  alerts: RealtimeAlert[];
  dismissAlert: (id: string) => void;
  playNotificationSound: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Web Audio API synthesised soft chime (zero external audio files needed)
function playMelodicChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {
    // Audio context may be restricted by browser before user interaction
  }
}

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineDevices, setOnlineDevices] = useState(1);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDeviceInfo[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshDevices = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/realtime/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.devices)) {
          setConnectedDevices(data.devices);
          setOnlineDevices(data.devices.length);
        }
      }
    } catch {}
  }, [token]);

  const addAlert = useCallback((type: RealtimeAlert['type'], title: string, message: string) => {
    const newAlert: RealtimeAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
    playMelodicChime();

    // Auto dismiss after 6.5 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
    }, 6500);
  }, []);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    if (!token || !user) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isUnmounted = false;

    const connectSSE = () => {
      if (isUnmounted) return;

      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        const sseUrl = `/api/realtime/events?token=${encodeURIComponent(token)}`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (isUnmounted) return;
          setIsConnected(true);
          setLastSyncAt(new Date().toISOString());
        };

        es.addEventListener('CONNECTED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.onlineDevices) setOnlineDevices(data.onlineDevices);
            if (Array.isArray(data.devices)) setConnectedDevices(data.devices);
            setLastSyncAt(data.timestamp || new Date().toISOString());
          } catch {}
        });

        es.addEventListener('DEVICE_STATS', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.onlineDevices) setOnlineDevices(data.onlineDevices);
            if (Array.isArray(data.devices)) setConnectedDevices(data.devices);
          } catch {}
        });

        es.addEventListener('PAYMENT_APPROVED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            addAlert('PAYMENT_APPROVED', data.title || 'পেমেন্ট অনুমোদিত! 🎉', data.message || `রসিদ নং: ${data.receiptNumber}`);
            window.dispatchEvent(new CustomEvent('pkss:datarefresh', { detail: { entity: 'payments', ...data } }));
          } catch {}
        });

        es.addEventListener('PAYMENT_REJECTED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            addAlert('PAYMENT_REJECTED', data.title || 'পেমেন্ট বাতিল', data.message);
            window.dispatchEvent(new CustomEvent('pkss:datarefresh', { detail: { entity: 'submissions', ...data } }));
          } catch {}
        });

        es.addEventListener('PAYMENT_SUBMITTED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            addAlert('PAYMENT_SUBMITTED', 'নতুন পেমেন্ট জমা', data.message || `আইডি: ${data.submissionNumber}`);
            window.dispatchEvent(new CustomEvent('pkss:datarefresh', { detail: { entity: 'submissions', ...data } }));
          } catch {}
        });

        es.addEventListener('NOTICE_PUBLISHED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            addAlert('NOTICE_PUBLISHED', 'নতুন জরুরি বিজ্ঞপ্তি 📢', data.title);
            window.dispatchEvent(new CustomEvent('pkss:datarefresh', { detail: { entity: 'notices', ...data } }));
          } catch {}
        });

        es.addEventListener('MEETING_SCHEDULED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            addAlert('MEETING_SCHEDULED', 'মিটিং নোটিশ 🗓️', `${data.title} (${data.location})`);
            window.dispatchEvent(new CustomEvent('pkss:datarefresh', { detail: { entity: 'meetings', ...data } }));
          } catch {}
        });

        es.addEventListener('DATA_REFRESH', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setLastSyncAt(new Date().toISOString());
            window.dispatchEvent(new CustomEvent('pkss:datarefresh', { detail: data }));
          } catch {}
        });

        es.onerror = () => {
          setIsConnected(false);
          es.close();
          // Auto reconnect in 4 seconds
          if (!isUnmounted) {
            reconnectTimeoutRef.current = setTimeout(connectSSE, 4000);
          }
        };
      } catch (err) {
        setIsConnected(false);
        if (!isUnmounted) {
          reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [token, user?.id, addAlert]);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        onlineDevices,
        connectedDevices,
        refreshDevices,
        lastSyncAt,
        alerts,
        dismissAlert,
        playNotificationSound: playMelodicChime,
      }}
    >
      {children}

      {/* Floating Real-time Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border text-white transform transition-all duration-300 animate-slide-up flex items-start gap-3 backdrop-blur-md ${
              alert.type === 'PAYMENT_APPROVED'
                ? 'bg-emerald-900/95 border-emerald-500 shadow-emerald-950/50'
                : alert.type === 'PAYMENT_REJECTED'
                ? 'bg-rose-900/95 border-rose-500 shadow-rose-950/50'
                : alert.type === 'NOTICE_PUBLISHED'
                ? 'bg-blue-900/95 border-blue-500 shadow-blue-950/50'
                : 'bg-slate-900/95 border-emerald-500/40 shadow-black/50'
            }`}
          >
            <div className="p-2 rounded-lg bg-white/10 shrink-0">
              {alert.type === 'PAYMENT_APPROVED' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : alert.type === 'PAYMENT_REJECTED' ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : alert.type === 'NOTICE_PUBLISHED' ? (
                <Bell className="w-5 h-5 text-blue-400" />
              ) : (
                <Info className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <h4 className="font-semibold text-sm leading-tight text-white truncate">{alert.title}</h4>
                <span className="text-[10px] text-white/70 font-mono shrink-0">{alert.timestamp}</span>
              </div>
              <p className="text-xs text-white/90 leading-relaxed break-words">{alert.message}</p>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="p-1 text-white/60 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

/**
 * Convenient React Hook for components to automatically re-fetch data on real-time changes
 */
export function useRealtimeRefresh(onRefresh: (eventDetail: any) => void) {
  const callbackRef = useRef(onRefresh);
  callbackRef.current = onRefresh;

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (callbackRef.current) {
        callbackRef.current(customEvent.detail);
      }
    };

    window.addEventListener('pkss:datarefresh', handler);
    return () => {
      window.removeEventListener('pkss:datarefresh', handler);
    };
  }, []);
}
