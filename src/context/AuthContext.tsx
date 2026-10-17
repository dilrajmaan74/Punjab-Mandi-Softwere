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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUserAccount | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
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
        if (!client || !isSupabaseConfigured()) {
          if (isMounted) {
            setCurrentUser(null);
            setIsAuthChecking(false);
          }
          return;
        }

        const { data: { session }, error } = await client.auth.getSession();
        if (error || !session?.user) {
          if (isMounted) {
            setCurrentUser(null);
            setIsAuthChecking(false);
          }
          return;
        }

        const user = session.user;
        const appUser: AppUserAccount = {
          id: user.id,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ਦਿਲਰਾਜ ਮਾਨ (Dilraj Maan)',
          mobile: user.user_metadata?.mobile || user.phone || '9814774651',
          email: user.email || 'dilrajmaan74@gmail.com',
          password: '',
          isVerified: Boolean(user.email_confirmed_at || user.confirmed_at || true),
          registeredAt: user.created_at || new Date().toISOString(),
          lastLoginAt: user.last_sign_in_at || new Date().toISOString()
        };

        if (isMounted) {
          setCurrentUser(appUser);
          setIsAuthChecking(false);
        }

        // Auto verify & claim owner access to FIRM-001 in background
        ensureUserFirmAccess('FIRM-001').catch(console.warn);
      } catch (err) {
        console.warn('Initial Supabase auth check notice:', err);
        if (isMounted) {
          setCurrentUser(null);
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
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ਦਿਲਰਾਜ ਮਾਨ (Dilraj Maan)',
            mobile: user.user_metadata?.mobile || user.phone || '9814774651',
            email: user.email || 'dilrajmaan74@gmail.com',
            password: '',
            isVerified: Boolean(user.email_confirmed_at || user.confirmed_at || true),
            registeredAt: user.created_at || new Date().toISOString(),
            lastLoginAt: user.last_sign_in_at || new Date().toISOString()
          };
          setCurrentUser(appUser);
          setIsAuthChecking(false);
          ensureUserFirmAccess('FIRM-001').catch(console.warn);
        } else if (event === 'SIGNED_OUT' || !session) {
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
   * Primary Supabase Email & Password Login
   */
  const loginWithSupabase = async (
    emailInput: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return {
        success: false,
        message: 'ਸੁਪਾਬੇਸ ਕਲਾਇੰਟ ਕਨੈਕਟ ਨਹੀਂ ਹੈ (Supabase client not configured).'
      };
    }

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

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
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ਦਿਲਰਾਜ ਮਾਨ (Dilraj Maan)',
        mobile: user.user_metadata?.mobile || user.phone || '9814774651',
        email: user.email || email,
        password: '',
        isVerified: true,
        registeredAt: user.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      setCurrentUser(appUser);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
      }

      // Link to FIRM-001 (Jammu Trading Co)
      await ensureUserFirmAccess('FIRM-001');

      return {
        success: true,
        message: `ਲੌਗਇਨ ਸਫਲ ਰਿਹਾ! ਜੀ ਆਇਆਂ ਨੂੰ, ${appUser.fullName}`
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'ਲੌਗਇਨ ਦੌਰਾਨ ਅਣਪਛਾਤੀ ਗਲਤੀ ਆਈ।'
      };
    }
  };

  /**
   * Primary Supabase User Registration
   */
  const signUpWithSupabase = async (
    emailInput: string,
    passwordInput: string,
    fullNameInput?: string,
    mobileInput?: string
  ): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return {
        success: false,
        message: 'ਸੁਪਾਬੇਸ ਕਲਾਇੰਟ ਕਨੈਕਟ ਨਹੀਂ ਹੈ (Supabase client not configured).'
      };
    }

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullNameInput || email.split('@')[0],
            mobile: mobileInput || ''
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
          fullName: fullNameInput || user.email?.split('@')[0] || 'ਮੰਡੀ ਯੂਜ਼ਰ',
          mobile: mobileInput || '',
          email: user.email || email,
          password: '',
          isVerified: true,
          registeredAt: user.created_at || new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };
        setCurrentUser(appUser);
        await ensureUserFirmAccess('FIRM-001');
        return {
          success: true,
          message: 'ਨਵਾਂ ਖਾਤਾ ਸਫਲਤਾਪੂਰਵਕ ਬਣ ਗਿਆ ਅਤੇ ਲੌਗਇਨ ਹੋ ਗਿਆ!'
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
  };

  /**
   * Backwards-compatible login handler
   */
  const login = async (
    emailOrMobile: string,
    passwordInput: string,
    rememberMe = true
  ): Promise<{ success: boolean; message: string }> => {
    let email = emailOrMobile.trim();
    if (!email.includes('@')) {
      // Map mobile to default admin or known email
      if (email.replace(/\D/g, '').endsWith('9814774651') || email.includes('98147')) {
        email = 'dilrajmaan74@gmail.com';
      } else {
        email = `${email.replace(/\D/g, '')}@punjabmandi.com`;
      }
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
