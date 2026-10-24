/**
 * Firebase Authentication & Google OAuth Service
 * Handles user sign-in and acquires Google OAuth access tokens with Sheets and Drive scopes
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
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
  prompt: 'select_account'
});

// Flag to indicate if in the middle of a sign-in flow
let isSigningIn = false;
// Cache the access token in memory
let cachedAccessToken: string | null = null;
let cachedTokenExpiry: number = 0;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken && Date.now() < cachedTokenExpiry) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedTokenExpiry = 0;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const requestGoogleAccessTokenViaGis = async (
  clientId: string = firebaseConfig.oAuthClientId,
  scopes: string = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
  loginHint: string = 'dilrajmaan74@gmail.com',
  isSilent: boolean = false
): Promise<{ user: User; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services client is initializing, please try again in a moment.'));
      return;
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes,
        prompt: isSilent ? '' : 'select_account',
        hint: loginHint,
        callback: async (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          if (!resp.access_token) {
            reject(new Error('No access token received from Google'));
            return;
          }

          cachedAccessToken = resp.access_token;
          const expiresIn = resp.expires_in ? parseInt(resp.expires_in, 10) : 3500;
          cachedTokenExpiry = Date.now() + expiresIn * 1000;

          // Attempt to fetch user profile info
          let userEmail = loginHint || 'dilrajmaan74@gmail.com';
          let displayName = 'Google User';
          try {
            const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${resp.access_token}` }
            });
            if (userInfoResp.ok) {
              const uData = await userInfoResp.json();
              if (uData.email) userEmail = uData.email;
              if (uData.name) displayName = uData.name;
            }
          } catch {}

          const syntheticUser = {
            uid: `gis_${Date.now()}`,
            email: userEmail,
            displayName: displayName
          } as unknown as User;

          resolve({
            user: syntheticUser,
            accessToken: resp.access_token
          });
        }
      });
      tokenClient.requestAccessToken({ prompt: isSilent ? '' : 'select_account', hint: loginHint });
    } catch (err) {
      reject(err);
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    // Prefer GIS Token Client directly if available to prevent browser popup blocking
    if ((window as any).google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
      try {
        return await requestGoogleAccessTokenViaGis(firebaseConfig.oAuthClientId, undefined, 'dilrajmaan74@gmail.com', false);
      } catch (gisErr) {
        console.warn('GIS direct sign-in notice, falling back to popup:', gisErr);
      }
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        cachedTokenExpiry = Date.now() + 3500 * 1000;
        return { user: result.user, accessToken: cachedAccessToken };
      }
    } catch (popupErr: any) {
      console.warn('Firebase popup attempt notice:', popupErr?.code || popupErr?.message);
      if ((window as any).google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
        return await requestGoogleAccessTokenViaGis(firebaseConfig.oAuthClientId, undefined, 'dilrajmaan74@gmail.com', false);
      }
      throw popupErr;
    }

    throw new Error('Failed to get Google OAuth access token from Firebase Auth');
  } catch (error: any) {
    console.warn('Google sign-in notice:', error?.code || error?.message);
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/network-request-failed' ||
      error?.code === 'auth/unauthorized-domain' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user' ||
      error?.message?.includes('popup-blocked') ||
      error?.message?.includes('network-request-failed')
    ) {
      error.isPopupBlocked = true;
      error.userFriendlyMessage = 'Browser blocked the Google Sign-in popup. Please click the popup icon in your browser address bar to allow popups, or use GIS/Direct token.';
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
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
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
};

export { firebaseConfig };
