import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUserAccount } from '../types/mandi';

interface OtpData {
  mobile: string;
  otp: string;
  purpose: 'REGISTER' | 'RESET_PASSWORD';
  expiresAt: number;
}

interface AuthContextType {
  currentUser: AppUserAccount | null;
  isAuthenticated: boolean;
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
  login: (mobile: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>;
  resetPassword: (mobile: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'mandi_auth_current_user',
  REGISTERED_USERS: 'mandi_auth_registered_users',
  REMEMBER_ME: 'mandi_auth_remember_me'
};

const DEFAULT_USERS: AppUserAccount[] = [
  {
    id: 'USR-001',
    fullName: 'ਦਿਲਰਾਜ ਮਾਨ (Dilraj Maan)',
    mobile: '9814774651',
    password: 'Password@123',
    isVerified: true,
    registeredAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load registered users from storage or seed defaults
  const [usersList, setUsersList] = useState<AppUserAccount[]>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.REGISTERED_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(AUTH_STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<AppUserAccount | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      if (stored) {
        return JSON.parse(stored);
      }
      // If user had previous active session or remember me, default to first user or null
      const remember = localStorage.getItem(AUTH_STORAGE_KEYS.REMEMBER_ME);
      if (remember === 'true') {
        const defaultUser = DEFAULT_USERS[0];
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
        return defaultUser;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(!currentUser);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [activeOtpInfo, setActiveOtpInfo] = useState<OtpData | null>(null);

  // Sync users list to storage
  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(usersList));
    } catch (e) {
      console.error('Failed to save users list', e);
    }
  }, [usersList]);

  // Keep modal state in sync with authentication
  useEffect(() => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
    }
  }, [currentUser]);

  // Helper to normalize mobile (digits only, last 10 digits)
  const normalizeMobile = (m: string) => {
    const clean = m.replace(/\D/g, '');
    return clean.length >= 10 ? clean.slice(-10) : clean;
  };

  // Generate and send OTP
  const sendOtp = async (mobileInput: string, purpose: 'REGISTER' | 'RESET_PASSWORD'): Promise<{ success: boolean; otp?: string; message: string }> => {
    const mobile = normalizeMobile(mobileInput);
    if (!mobile || mobile.length !== 10) {
      return { success: false, message: 'ਕਿਰਪਾ ਕਰਕੇ 10 ਅੰਕਾਂ ਦਾ ਸਹੀ ਮੋਬਾਈਲ ਨੰਬਰ ਭਰੋ (Invalid 10-digit mobile).' };
    }

    const existingUser = usersList.find((u) => normalizeMobile(u.mobile) === mobile);

    if (purpose === 'REGISTER' && existingUser) {
      return { success: false, message: 'ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਲੌਗਇਨ ਕਰੋ (Mobile already registered).' };
    }

    if (purpose === 'RESET_PASSWORD' && !existingUser) {
      return { success: false, message: 'ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਸਿਸਟਮ ਵਿੱਚ ਮੌਜੂਦ ਨਹੀਂ ਹੈ (Mobile not registered).' };
    }

    // Generate random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    const newOtpData: OtpData = {
      mobile,
      otp: generatedOtp,
      purpose,
      expiresAt
    };

    setActiveOtpInfo(newOtpData);

    return {
      success: true,
      otp: generatedOtp,
      message: `ਵੈਰੀਫਿਕੇਸ਼ਨ ਕੋਡ (OTP) ਭੇਜਿਆ ਗਿਆ: ${generatedOtp}`
    };
  };

  // Verify OTP
  const verifyOtp = (mobileInput: string, otpInput: string, purpose: 'REGISTER' | 'RESET_PASSWORD'): boolean => {
    const mobile = normalizeMobile(mobileInput);
    const cleanOtp = otpInput.trim();

    if (!activeOtpInfo) return false;
    if (activeOtpInfo.mobile !== mobile) return false;
    if (activeOtpInfo.purpose !== purpose) return false;
    if (Date.now() > activeOtpInfo.expiresAt) return false;

    // Master bypass OTP '123456' for instant demo test, or actual generated OTP
    return activeOtpInfo.otp === cleanOtp || cleanOtp === '123456';
  };

  const clearActiveOtp = () => {
    setActiveOtpInfo(null);
  };

  // Register New User
  const register = async ({
    fullName,
    mobile: mobileInput,
    password,
    email
  }: {
    fullName: string;
    mobile: string;
    password: string;
    email?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const mobile = normalizeMobile(mobileInput);
    if (!fullName.trim()) {
      return { success: false, message: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਪੂਰਾ ਨਾਮ ਭਰੋ (Please enter full name).' };
    }
    if (!mobile || mobile.length !== 10) {
      return { success: false, message: '10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਲਾਜ਼ਮੀ ਹੈ (Valid 10-digit mobile required).' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ (Password must be at least 6 characters).' };
    }

    if (usersList.some((u) => normalizeMobile(u.mobile) === mobile)) {
      return { success: false, message: 'ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਪਹਿਲਾਂ ਹੀ ਰਜਿਸਟਰਡ ਹੈ (Already registered).' };
    }

    const newUser: AppUserAccount = {
      id: `USR-${String(usersList.length + 1).padStart(3, '0')}`,
      fullName: fullName.trim(),
      mobile,
      password,
      isVerified: true,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      email: email?.trim()
    };

    const updated = [...usersList, newUser];
    setUsersList(updated);
    setCurrentUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    localStorage.setItem(AUTH_STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(updated));
    localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
    setIsAuthModalOpen(false);
    clearActiveOtp();

    return {
      success: true,
      message: `ਮੁਬਾਰਕਾਂ! ${newUser.fullName}, ਤੁਹਾਡਾ ਖਾਤਾ ਸਫਲਤਾਪੂਰਵਕ ਬਣ ਗਿਆ ਹੈ।`
    };
  };

  // Login User
  const login = async (mobileInput: string, passwordInput: string, rememberMe = true): Promise<{ success: boolean; message: string }> => {
    const mobile = normalizeMobile(mobileInput);
    const cleanPassword = passwordInput.trim();

    if (!mobile || mobile.length !== 10) {
      return { success: false, message: 'ਕਿਰਪਾ ਕਰਕੇ 10 ਅੰਕਾਂ ਦਾ ਰਜਿਸਟਰਡ ਮੋਬਾਈਲ ਨੰਬਰ ਭਰੋ।' };
    }
    if (!cleanPassword) {
      return { success: false, message: 'ਕਿਰਪਾ ਕਰਕੇ ਪਾਸਵਰਡ ਭਰੋ।' };
    }

    const found = usersList.find((u) => normalizeMobile(u.mobile) === mobile);
    if (!found) {
      return { success: false, message: 'ਇਹ ਮੋਬਾਈਲ ਨੰਬਰ ਰਜਿਸਟਰਡ ਨਹੀਂ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਪਹਿਲਾਂ ਰਜਿਸਟਰ ਕਰੋ।' };
    }

    if (found.password !== cleanPassword) {
      return { success: false, message: 'ਗਲਤ ਪਾਸਵਰਡ! ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ ਜਾਂ ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ।' };
    }

    const updatedUser = {
      ...found,
      lastLoginAt: new Date().toISOString()
    };

    setCurrentUser(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEYS.REMEMBER_ME, 'true');
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER_ME);
    }

    setIsAuthModalOpen(false);
    return {
      success: true,
      message: `ਜੀ ਆਇਆਂ ਨੂੰ, ${updatedUser.fullName}! ਲੌਗਇਨ ਸਫਲ ਰਿਹਾ।`
    };
  };

  // Reset Password
  const resetPassword = async (mobileInput: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const mobile = normalizeMobile(mobileInput);
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'ਨਵਾਂ ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।' };
    }

    const userIndex = usersList.findIndex((u) => normalizeMobile(u.mobile) === mobile);
    if (userIndex === -1) {
      return { success: false, message: 'ਮੋਬਾਈਲ ਨੰਬਰ ਨਹੀਂ ਮਿਲਿਆ।' };
    }

    const updatedUsers = [...usersList];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      password: newPassword
    };

    setUsersList(updatedUsers);
    localStorage.setItem(AUTH_STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(updatedUsers));

    // If current user is the one resetting password, update in memory too
    if (currentUser && normalizeMobile(currentUser.mobile) === mobile) {
      const updatedCurrent = { ...currentUser, password: newPassword };
      setCurrentUser(updatedCurrent);
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrent));
    }

    clearActiveOtp();
    return {
      success: true,
      message: 'ਪਾਸਵਰਡ ਸਫਲਤਾਪੂਰਵਕ ਬਦਲ ਦਿੱਤਾ ਗਿਆ ਹੈ! ਹੁਣ ਤੁਸੀਂ ਨਵੇਂ ਪਾਸਵਰਡ ਨਾਲ ਲੌਗਇਨ ਕਰ ਸਕਦੇ ਹੋ।'
    };
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(AUTH_STORAGE_KEYS.REMEMBER_ME);
    setAuthModalMode('LOGIN');
    setIsAuthModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
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
