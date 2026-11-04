import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '../locales/i18n';

export interface User {
  id: number;
  memberId: string;
  mobile: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'president' | 'general_secretary' | 'treasurer' | 'advisor' | 'general_member';
  accountStatus: string;
  permissions: string[];
  fullNameBn: string;
  fullNameEn: string;
  designation?: string;
  membershipStatus?: string;
  membershipType?: string;
  lastLogin?: string;
  unreadNotificationsCount?: number;
}

export interface SocietySettings {
  name_bn: string;
  name_en: string;
  short_name: string;
  reg_no: string;
  address: string;
  district: string;
  upazila: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  official_signature_url: string;
  receipt_footer: string;
  monthly_subscription_default: number;
  approval_workflow: string;
  self_registration_enabled: number;
}

interface AuthContextType {
  user: User | null;
  society: SocietySettings | null;
  token: string | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['bn']) => string;
  login: (token: string, user: User) => void;
  logout: () => void;
  quickSwitchRole: (role: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [society, setSociety] = useState<SocietySettings | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pkss_token'));
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('pkss_lang') as Language) || 'bn'
  );
  const [isLoading, setIsLoading] = useState(true);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('pkss_lang', lang);
  };

  const t = (key: keyof typeof translations['bn']) => {
    return translations[language][key] || translations['bn'][key] || key;
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('pkss_token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('pkss_token');
  };

  const refreshUserData = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSociety(data.society);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick switch role (Convenient for testing all 7 roles with one click!)
  const quickSwitchRole = async (targetRole: string) => {
    const roleMap: Record<string, string> = {
      super_admin: '01711000001',
      admin: '01711000002',
      president: '01711000003',
      general_secretary: '01711000004',
      treasurer: '01711000005',
      advisor: '01711000006',
      general_member: '01711000007',
    };

    const mobile = roleMap[targetRole] || '01711000001';
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: mobile, password: 'Password123!' }),
    });

    if (res.ok) {
      const data = await res.json();
      login(data.token, data.user);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        society,
        token,
        language,
        setLanguage,
        t,
        login,
        logout,
        quickSwitchRole,
        refreshUserData,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
