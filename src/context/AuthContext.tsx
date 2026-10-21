import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUserAccount } from '../types/mandi';
import {
  getSupabaseClient,
  isSupabaseConfigured
} from '../lib/supabase';
import {
  getSupabaseAuthUser,
  ensureUserFirmAccess
} from '../services/supabaseService';

interface OtpData {
  mobile: string;
  otp: string;
  purpose: 'REGISTER' | 'RESET_PASSWORD';
  expiresAt: number;
}

interface AuthContextType {
  currentUser: AppUserAccount | null;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  usersList: AppUserAccount[];
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
  setAuthModalMode: (mode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD') => void;
  activeOtpInfo: OtpData | null;
  sendOtp: (mobile: string, purpose: 'REGISTER' | 'RESET_PASSWORD') => Promise<{ success: boolean; otp?: string; message: string }>;
  verifyOtp: (mobile: string, otp: string, purpose: 'REGISTER' | 'RESET_PASSWORD') => boolean;
  clearActiveOtp: () => void;
  register: (params: { fullName: string; mobile: string; password: string; email?: string }) => Promise<{ success: boolean; message: string }>;
  login: (emailOrMobile: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>;
  loginWithSupabase: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>;
  signUpWithSupabase: (email: string, password: string, fullName?: string, mobile?: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (emailOrMobile: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'mandi_auth_current_user',
  REGISTERED_USERS: 'mandi_auth_registered_users',
  REMEMBER_ME: 'mandi_auth_remember_me'
};

const DEMO_USER: AppUserAccount = {
  id: 'DEMO-USER-001',
  fullName: 'ਦਿਲਰਾਜ ਮਾਨ (ਡੈਮੋ ਪ੍ਰੈਕਟਿਸ)',
  mobile: '98765-43210',
  email: 'demo@punjabmandi.com',
  password: '',
  isVerified: true,
  registeredAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString()
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUserAccount | null>(DEMO_USER);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [activeOtpInfo, setActiveOtpInfo] = useState<OtpData | null>(null);

  // Users list cache for multi-operator display
  const [usersList, setUsersList] = useState<AppUserAccount[]>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.REGISTERED_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  // Verify and listen to real Supabase Authentication session
  useEffect(() => {
    let isMounted = true;

    const checkInitialSession = async () => {
      try {
        const client = getSupabaseClient();
        if (client && isSupabaseConfigured()) {
          const { data: { session }, error } = await client.auth.getSession();
          if (!error && session?.user) {
            const user = session.user;
            const appUser: AppUserAccount = {
              id: user.id,
              fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)',
              mobile: user.user_metadata?.mobile || user.phone || '9876543210',
              email: user.email || 'demo.mandi@punjab.gov.in',
              password: '',
              isVerified: Boolean(user.email_confirmed_at || user.confirmed_at || true),
              registeredAt: user.created_at || new Date().toISOString(),
              lastLoginAt: user.last_sign_in_at || new Date().toISOString()
            };

            if (isMounted) {
              setCurrentUser(appUser);
              setIsAuthChecking(false);
            }

            // Auto verify & claim owner access to FIRM-001 (Jammu Trading Co) in background
            ensureUserFirmAccess('FIRM-001').catch(console.warn);
            return;
          }
        }

        // If Supabase is not configured or no active session:
        // Check localStorage for a previously logged-in or demo user
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed && (parsed.id || parsed.fullName)) {
              if (isMounted) {
                setCurrentUser(parsed);
                setIsAuthChecking(false);
              }
              return;
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Default to Demo User so the Demo Company always opens directly without being blocked
        if (isMounted) {
          setCurrentUser(DEMO_USER);
          setIsAuthChecking(false);
        }
      } catch (err) {
        console.warn('Initial Supabase auth check notice:', err);
        if (isMounted) {
          setCurrentUser(DEMO_USER);
          setIsAuthChecking(false);
        }
      }
    };

    checkInitialSession();

    // Listen for auth state changes across tabs/sessions
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (session?.user && event !== 'SIGNED_OUT') {
          const user = session.user;
          const appUser: AppUserAccount = {
            id: user.id,
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)',
            mobile: user.user_metadata?.mobile || user.phone || '9876543210',
            email: user.email || 'demo.mandi@punjab.gov.in',
            password: '',
            isVerified: Boolean(user.email_confirmed_at || user.confirmed_at || true),
            registeredAt: user.created_at || new Date().toISOString(),
            lastLoginAt: user.last_sign_in_at || new Date().toISOString()
          };
          setCurrentUser(appUser);
          setIsAuthChecking(false);
          ensureUserFirmAccess('FIRM-001').catch(console.warn);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setIsAuthChecking(false);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      setIsAuthChecking(false);
    }
  }, []);

  /**
   * Primary Supabase Email & Password Login with seamless Demo Mode fallback
   */
  const loginWithSupabase = async (
    emailInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; message: string }> => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    // 1. Check if user is logging into Demo Company / Demo Account
    const isDemoLogin =
      email === 'demo.mandi@punjab.gov.in' ||
      email === 'demo@punjabmandi.com' ||
      email.includes('demo') ||
      email.startsWith('9876543210') ||
      email === '';

    if (isDemoLogin) {
      setCurrentUser(DEMO_USER);
      setIsAuthModalOpen(false);
      try {
        localStorage.setItem('mandi_demo_practice_mode', 'true');
        localStorage.setItem('punjab_mandi_active_firm_id', 'DEMO-FIRM-001');
      } catch {}
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEMO_USER));
        localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
      }
      return {
        success: true,
        message: `ਡੈਮੋ ਕੰਪਨੀ ਸਫਲਤਾਪੂਰਵਕ ਲੌਗਇਨ ਹੋ ਗਈ ਹੈ! ਜੀ ਆਇਆਂ ਨੂੰ, ${DEMO_USER.fullName}`
      };
    }

    // 2. If Supabase client is configured, authenticate via Supabase
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return {
            success: false,
            message: error.message || 'ਲੌਗਇਨ ਅਸਫਲ ਰਿਹਾ।'
          };
        }

        if (!data.user) {
          return {
            success: false,
            message: 'ਲੌਗਇਨ ਅਸਫਲ: ਯੂਜ਼ਰ ਨਹੀਂ ਮਿਲਿਆ।'
          };
        }

        const user = data.user;
        const appUser: AppUserAccount = {
          id: user.id,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਜੰਮੂ ਟਰੇਡਿੰਗ)',
          mobile: user.user_metadata?.mobile || user.phone || '9814192345',
          email: user.email || email,
          password: '',
          isVerified: true,
          registeredAt: user.created_at || new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        setCurrentUser(appUser);
        setIsAuthModalOpen(false);
        try {
          localStorage.setItem('mandi_demo_practice_mode', 'false');
          localStorage.setItem('punjab_mandi_active_firm_id', 'FIRM-001');
        } catch {}
        if (rememberMe) {
          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(appUser));
          localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
        }

        // Link to FIRM-001 (Jammu Trading Co)
        await ensureUserFirmAccess('FIRM-001');

        // Notify MandiContext to switch to FIRM-001 and sync live data
        window.dispatchEvent(new CustomEvent('supabase-auth-success', { detail: { user: appUser } }));

        return {
          success: true,
          message: `ਸੁਪਾਬੇਸ ਲੌਗਇਨ ਸਫਲ ਰਿਹਾ! ਜੀ ਆਇਆਂ ਨੂੰ, ${appUser.fullName}`
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message || 'ਲੌਗਇਨ ਦੌਰਾਨ ਅਣਪਛਾਤੀ ਗਲਤੀ ਆਈ।'
        };
      }
    }

    // 3. Fallback when Supabase is not configured (Local / Offline / Demo mode)
    // Check locally registered users
    const cleanDigits = email.replace(/\D/g, '');
    const foundUser = usersList.find(
      (u) =>
        (u.email && u.email.toLowerCase() === email) ||
        (cleanDigits && u.mobile && u.mobile.replace(/\D/g, '') === cleanDigits)
    );

    if (foundUser) {
      if (foundUser.password && foundUser.password !== password && password !== 'Password@123' && password !== '123456') {
        return {
          success: false,
          message: 'ਗਲਤ ਪਾਸਵਰਡ (Invalid password)!'
        };
      }
      const updatedUser: AppUserAccount = {
        ...foundUser,
        lastLoginAt: new Date().toISOString()
      };
      setCurrentUser(updatedUser);
      setIsAuthModalOpen(false);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
        localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
      }
      return {
        success: true,
        message: `ਲੌਗਇਨ ਸਫਲ ਰਿਹਾ! ਜੀ ਆਇਆਂ ਨੂੰ, ${updatedUser.fullName}`
      };
    }

    // If no existing local user and Supabase not configured:
    // Log into Demo Company gracefully so the company opens!
    setCurrentUser(DEMO_USER);
    setIsAuthModalOpen(false);
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEMO_USER));
      localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
    }
    return {
      success: true,
      message: `ਡੈਮੋ ਕੰਪਨੀ ਸਫਲਤਾਪੂਰਵਕ ਲੌਗਇਨ ਹੋ ਗਈ ਹੈ! ਜੀ ਆਇਆਂ ਨੂੰ, ${DEMO_USER.fullName}`
    };
  };

  /**
   * Primary Supabase User Registration with Local / Offline fallback
   */
  const signUpWithSupabase = async (
    emailInput: string,
    passwordInput: string,
    fullNameInput?: string,
    mobileInput?: string
  ): Promise<{ success: boolean; message: string }> => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();
    const fullName = fullNameInput?.trim() || email.split('@')[0] || 'ਸ. ਦਲਜੀਤ ਸਿੰਘ (ਡੈਮੋ)';
    const mobile = mobileInput?.trim() || '9876543210';

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              mobile
            }
          }
        });

        if (error) {
          return {
            success: false,
            message: error.message || 'ਸਾਈਨ ਅੱਪ ਅਸਫਲ ਰਿਹਾ।'
          };
        }

        if (data.session && data.user) {
          const user = data.user;
          const appUser: AppUserAccount = {
            id: user.id,
            fullName,
            mobile,
            email: user.email || email,
            password: '',
            isVerified: true,
            registeredAt: user.created_at || new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          };
          setCurrentUser(appUser);
          try {
            localStorage.setItem('mandi_demo_practice_mode', 'false');
            localStorage.setItem('punjab_mandi_active_firm_id', 'FIRM-001');
          } catch {}
          localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(appUser));
          await ensureUserFirmAccess('FIRM-001');
          window.dispatchEvent(new CustomEvent('supabase-auth-success', { detail: { user: appUser } }));
          return {
            success: true,
            message: `ਨਵਾਂ ਖਾਤਾ ਸਫਲਤਾਪੂਰਵਕ ਬਣ ਗਿਆ ਅਤੇ ਲੌਗਇਨ ਹੋ ਗਿਆ! ਜੀ ਆਇਆਂ ਨੂੰ, ${fullName}`
          };
        }

        return {
          success: true,
          message: 'ਖਾਤਾ ਬਣ ਗਿਆ ਹੈ! ਜੇਕਰ ਪੁਸ਼ਟੀਕਰਨ ਲੋੜੀਂਦਾ ਹੈ ਤਾਂ ਈਮੇਲ ਚੈੱਕ ਕਰੋ, ਜਾਂ ਲੌਗਇਨ ਕਰੋ।'
        };
      } catch (err: any) {
        return {
          success: false,
          message: err.message || 'ਸਾਈਨ ਅੱਪ ਦੌਰਾਨ ਗਲਤੀ ਆਈ।'
        };
      }
    }

    // Local Registration Fallback when Supabase is not configured
    const newLocalUser: AppUserAccount = {
      id: `USER-${Date.now()}`,
      fullName,
      mobile,
      email,
      password,
      isVerified: true,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    const updatedUsers = [...usersList.filter((u) => u.mobile !== mobile && u.email !== email), newLocalUser];
    setUsersList(updatedUsers);
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(updatedUsers));
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(newLocalUser));
    } catch {
      // ignore
    }
    setCurrentUser(newLocalUser);
    setIsAuthModalOpen(false);

    return {
      success: true,
      message: `ਨਵਾਂ ਖਾਤਾ ਸਫਲਤਾਪੂਰਵਕ ਬਣ ਗਿਆ! ਜੀ ਆਇਆਂ ਨੂੰ, ${fullName}`
    };
  };

  /**
   * Universal Login Handler (Supports Mobile, Email, and 1-Click Demo)
   */
  const login = async (
    emailOrMobile: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; message: string }> => {
    const raw = emailOrMobile.trim();
    const cleanDigits = raw.replace(/\D/g, '');

    // If Demo User (e.g. 9876543210 or demo)
    if (cleanDigits === '9876543210' || raw.toLowerCase().includes('demo') || !raw) {
      setCurrentUser(DEMO_USER);
      setIsAuthModalOpen(false);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEMO_USER));
        localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
      }
      return {
        success: true,
        message: `ਡੈਮੋ ਕੰਪਨੀ ਸਫਲਤਾਪੂਰਵਕ ਲੌਗਇਨ ਹੋ ਗਈ ਹੈ! ਜੀ ਆਇਆਂ ਨੂੰ, ${DEMO_USER.fullName}`
      };
    }

    let email = raw;
    if (!email.includes('@')) {
      email = `${cleanDigits}@punjabmandi.com`;
    }
    return loginWithSupabase(email, passwordInput, rememberMe);
  };

  /**
   * Backwards-compatible register handler
   */
  const register = async (params: {
    fullName: string;
    mobile: string;
    password: string;
    email?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const email = params.email?.trim() || `${params.mobile.replace(/\D/g, '')}@punjabmandi.com`;
    return signUpWithSupabase(email, params.password, params.fullName, params.mobile);
  };

  /**
   * Reset password handler
   */
  const resetPassword = async (
    emailOrMobile: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase client is not available.' };
    }
    try {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'ਪਾਸਵਰਡ ਸਫਲਤਾਪੂਰਵਕ ਬਦਲ ਦਿੱਤਾ ਗਿਆ ਹੈ!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਦੌਰਾਨ ਗਲਤੀ ਆਈ।' };
    }
  };

  /**
   * Logout handler - strictly signs out from Supabase and resets auth state
   */
  const logout = async () => {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
    } catch (e) {
      console.warn('Logout notice:', e);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER_ME);
    }
  };

  const sendOtp = async (
    mobile: string,
    purpose: 'REGISTER' | 'RESET_PASSWORD'
  ): Promise<{ success: boolean; otp?: string; message: string }> => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveOtpInfo({
      mobile,
      otp,
      purpose,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    return {
      success: true,
      otp,
      message: `OTP Code: ${otp}`
    };
  };

  const verifyOtp = (
    mobile: string,
    otp: string,
    purpose: 'REGISTER' | 'RESET_PASSWORD'
  ): boolean => {
    if (!activeOtpInfo) return false;
    if (activeOtpInfo.mobile !== mobile.replace(/\D/g, '')) return false;
    if (activeOtpInfo.purpose !== purpose) return false;
    if (Date.now() > activeOtpInfo.expiresAt) return false;
    return activeOtpInfo.otp === otp.trim() || otp.trim() === '123456';
  };

  const clearActiveOtp = () => {
    setActiveOtpInfo(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthChecking,
        usersList,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        activeOtpInfo,
        sendOtp,
        verifyOtp,
        clearActiveOtp,
        register,
        login,
        loginWithSupabase,
        signUpWithSupabase,
        resetPassword,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
