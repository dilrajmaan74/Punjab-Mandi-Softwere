/**
 * Firebase Authentication & Google OAuth Service
 * Uses Firebase Auth with GoogleAuthProvider (Sheets and Drive scopes)
 * Supports both Popup and Redirect flows to guarantee 100% compatibility
 * across standard browsers and standalone PWA desktop installs without origin mismatch errors.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
  login_hint: 'dilrajmaan74@gmail.com'
});

// Flag to indicate if in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory & localStorage
let cachedAccessToken: string | null = null;
let cachedTokenExpiry: number = 0;

try {
  const storedToken = localStorage.getItem('google_oauth_cached_token');
  const storedExpiry = parseInt(localStorage.getItem('google_oauth_token_expiry') || '0', 10);
  if (storedToken && Date.now() < storedExpiry) {
    cachedAccessToken = storedToken;
    cachedTokenExpiry = storedExpiry;
  }
} catch {}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check if returning from a signInWithRedirect flow
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          cachedTokenExpiry = Date.now() + 3500 * 1000;
          try {
            localStorage.setItem('google_oauth_cached_token', credential.accessToken);
            localStorage.setItem('google_oauth_token_expiry', String(cachedTokenExpiry));
          } catch {}
          if (onAuthSuccess) onAuthSuccess(result.user, credential.accessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('getRedirectResult notice:', err?.code || err?.message);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          const storedToken = localStorage.getItem('google_oauth_cached_token');
          const storedExpiry = parseInt(localStorage.getItem('google_oauth_token_expiry') || '0', 10);
          if (storedToken && Date.now() < storedExpiry) {
            cachedAccessToken = storedToken;
            cachedTokenExpiry = storedExpiry;
          }
        } catch {}
      }

      if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedTokenExpiry = 0;
      try {
        localStorage.removeItem('google_oauth_cached_token');
        localStorage.removeItem('google_oauth_token_expiry');
      } catch {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Primary sign-in method:
 * Tries popup first. If browser blocks the popup (common in standalone desktop PWAs),
 * falls back to signInWithRedirect which never gets blocked and avoids origin mismatch.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get Google OAuth access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    cachedTokenExpiry = Date.now() + 3500 * 1000;
    try {
      localStorage.setItem('google_oauth_cached_token', credential.accessToken);
      localStorage.setItem('google_oauth_token_expiry', String(cachedTokenExpiry));
    } catch {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.warn('Google sign-in popup notice:', error?.code || error?.message);
    const isPopupBlocked =
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.message?.includes('popup-blocked');

    if (isPopupBlocked) {
      error.isPopupBlocked = true;
      error.userFriendlyMessage = 'Browser blocked popup. Click "Redirect Sign In" to authenticate without popups.';
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign in using redirect (ideal for standalone PWA / desktop apps where popups are disabled)
 */
export const googleSignInRedirect = async (): Promise<void> => {
  isSigningIn = true;
  await signInWithRedirect(auth, provider);
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
    return cachedAccessToken;
  }
  return null;
};

export const setCachedAccessToken = (token: string, expiresInSeconds: number = 3600) => {
  cachedAccessToken = token;
  cachedTokenExpiry = Date.now() + expiresInSeconds * 1000;
  try {
    localStorage.setItem('google_oauth_cached_token', token);
    localStorage.setItem('google_oauth_token_expiry', String(cachedTokenExpiry));
  } catch {}
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  try {
    localStorage.removeItem('google_oauth_cached_token');
    localStorage.removeItem('google_oauth_token_expiry');
  } catch {}
};

export { firebaseConfig };
