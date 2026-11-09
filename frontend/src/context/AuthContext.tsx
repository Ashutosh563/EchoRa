import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  auth_provider: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isGuest: boolean;
  continueAsGuest: () => void;
  signInWithSpotify: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'echora_guest_mode';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const isTestEnv = import.meta.env.MODE === 'test';
  const [isLoading, setIsLoading] = useState(!isTestEnv);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (isTestEnv) return true;
    return localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
  });

  const fetchProfile = useCallback(async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[Auth] Error fetching profile:', error.message);
      }

      // Fallback gracefully to user_metadata if profile row is still syncing
      const meta = currentUser.user_metadata || {};
      const appMeta = currentUser.app_metadata || {};
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email ?? null,
        display_name:
          data?.display_name ||
          meta.full_name ||
          meta.name ||
          (currentUser.email ? currentUser.email.split('@')[0] : 'EchoRa Listener'),
        avatar_url: data?.avatar_url || meta.avatar_url || meta.picture || null,
        auth_provider: data?.auth_provider || appMeta.provider || 'oauth',
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      };

      setProfile(fallbackProfile);
    } catch (err) {
      console.error('[Auth] Unexpected error resolving profile:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        fetchProfile(session.user);
      }
      setIsLoading(false);
    });

    // 2. Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        await fetchProfile(currentSession.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    localStorage.setItem(GUEST_STORAGE_KEY, 'true');
  }, []);

  const signInWithSpotify = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}`,
          scopes: 'user-read-email user-top-read playlist-read-private',
          queryParams: {
            show_dialog: 'true',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: any) {
      return { error: err };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsGuest(false);
    localStorage.removeItem(GUEST_STORAGE_KEY);
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isGuest,
        continueAsGuest,
        signInWithSpotify,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
