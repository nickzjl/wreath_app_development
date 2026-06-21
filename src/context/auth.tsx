import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type AuthContextValue = {
  session: Session | null | undefined;
  username: string | null | undefined;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: undefined,
  username: undefined,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [username, setUsername] = useState<string | null | undefined>(undefined);

  async function fetchUsername(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    setUsername(data?.username ?? null);
  }

  async function refreshProfile() {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (s) await fetchUsername(s.user.id);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      if (s) fetchUsername(s.user.id);
      else setUsername(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, s) => {
      setSession(s ?? null);
      if (s) await fetchUsername(s.user.id);
      else setUsername(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, username, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
