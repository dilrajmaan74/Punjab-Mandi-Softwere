/**
 * Firebase Authentication & Google OAuth Service
 * Strictly follows Google Workspace Integration skill guidelines:
 * - In-memory caching only for access token (NO localStorage persistence)
 * - Uses Firebase Auth with GoogleAuthProvider (Sheets and Drive scopes)
 * - Supports popup and redirect flows
 * - Auto-cleans legacy expired tokens
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
  prompt: 'consent select_account'
});

// Clear any stale/expired tokens stored by earlier versions in localStorage
try {
  localStorage.removeItem('google_oauth_cached_token');
  localStorage.removeItem('google_oauth_token_expiry');
  localStorage.removeItem('punjab_mandi_google_auth_v1');
} catch {}

// Flag to indicate if currently in the middle of an interactive sign-in flow
let isSigningIn = false;
// Strict in-memory cache for OAuth access token
let cachedAccessToken: string | null = null;
let cachedTokenExpiry: number = 0;

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  try {
    localStorage.removeItem('google_oauth_cached_token');
    localStorage.removeItem('google_oauth_token_expiry');
    localStorage.removeItem('punjab_mandi_google_auth_v1');
  } catch {}
};

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
          if (onAuthSuccess) onAuthSuccess(result.user, credential.accessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('getRedirectResult notice:', err?.code || err?.message);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token is not in memory or expired: prompt user to sign in
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedTokenExpiry = 0;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Primary sign-in method:
 * Requests fresh Google OAuth Access Token with spreadsheets & drive.file scopes
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
 * Sign in using redirect (fallback for environments where popups are completely disabled)
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
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  cachedAccessToken = clean;
  cachedTokenExpiry = Date.now() + expiresInSeconds * 1000;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  clearCachedAccessToken();
};

export { firebaseConfig };
