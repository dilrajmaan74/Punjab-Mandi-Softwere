import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project URL as provided by user
export const SUPABASE_DEFAULT_URL = 'https://bktiuuxunjadogposalb.supabase.co';

export const getSupabaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  return (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) ? envUrl.trim() : SUPABASE_DEFAULT_URL;
};

export const isKeyServiceRole = (key: string): boolean => {
  if (!key) return false;
  const lower = key.toLowerCase();
  if (lower.includes('service_role') || lower.includes('sb_secret') || lower.includes('secret')) {
    return true;
  }
  // If it's a JWT, inspect claims payload safely without external deps
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === 'service_role') {
        return true;
      }
    }
  } catch {
    // Not a valid JWT or parse error, ignore
  }
  return false;
};

export const getSupabaseAnonKey = (): string => {
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    if (isKeyServiceRole(envKey)) {
      console.error('CRITICAL SECURITY VIOLATION: VITE_SUPABASE_ANON_KEY contains a service_role secret key! Only publishable/anon keys are allowed in client code.');
      return '';
    }
    return envKey.trim();
  }
  // Check if saved in localStorage as a convenience
  try {
    const saved = localStorage.getItem('punjab_mandi_supabase_publishable_key');
    if (saved && saved.trim().length > 0) {
      if (isKeyServiceRole(saved)) {
        console.error('CRITICAL SECURITY VIOLATION: Stored key is a service_role secret key! Rejecting for security.');
        localStorage.removeItem('punjab_mandi_supabase_publishable_key');
        return '';
      }
      return saved.trim();
    }
  } catch {
    // Ignore localStorage read errors
  }
  return '';
};

export const setSupabaseAnonKeyLocal = (key: string) => {
  const trimmed = key.trim();
  if (isKeyServiceRole(trimmed)) {
    throw new Error('SECURITY VIOLATION: Never use or store a Supabase service_role secret key in the frontend! Only the publishable/anon key (sb_publishable_... or anon JWT) is allowed.');
  }
  try {
    if (trimmed) {
      localStorage.setItem('punjab_mandi_supabase_publishable_key', trimmed);
    } else {
      localStorage.removeItem('punjab_mandi_supabase_publishable_key');
    }
    // Recreate client
    cachedClient = null;
  } catch (err) {
    console.error('Failed to set local Supabase key:', err);
  }
};

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && key.length > 10);
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = key;
    return cachedClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
};
