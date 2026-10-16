import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { claimLegacyPhotos } from '@/../db/repositories/photos';
import { claimLegacyAlbums } from '@/../db/repositories/albums';

type AuthValue = { session: Session | null; isLoading: boolean };
const AuthContext = createContext<AuthValue>({ session: null, isLoading: true });

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!alive) return;
      if (error) console.warn('No se pudo restaurar la sesión:', error.message);
      setSession(data.session);
      if (data.session) { await claimLegacyPhotos(data.session.user.id); await claimLegacyAlbums(data.session.user.id); }
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      if (nextSession) setTimeout(() => { void Promise.all([claimLegacyPhotos(nextSession.user.id), claimLegacyAlbums(nextSession.user.id)]); }, 0);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  return <AuthContext.Provider value={{ session, isLoading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
