import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authProvider } from '../lib/auth';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ps_user';

function persistUser(u) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
}
function clearUser() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
function loadUser() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser());
  // True until Supabase finishes initializing — including parsing the OAuth
  // implicit-flow hash (#access_token) from the URL. ProtectedRoute waits on
  // this so it doesn't redirect to /signin before the session is established.
  const [initializing, setInitializing] = useState(true);

  // Keep auth state in sync with Supabase session changes
  useEffect(() => {
    let active = true;

    const applySession = async (session) => {
      if (!active) return;
      if (!session) {
        clearUser();
        setUser(null);
        return;
      }
      // Re-fetch profile to get latest data
      const { data: profile } = await supabase
        .from('users')
        .select('name, initials, role, workspace_id')
        .eq('id', session.user.id)
        .single();
      if (!active) return;
      const u = {
        id:          session.user.id,
        email:       session.user.email,
        name:        profile?.name     || session.user.user_metadata?.full_name || session.user.email.split('@')[0],
        initials:    profile?.initials || '',
        role:        profile?.role     || 'admin',
        workspace:   profile?.workspace_id || '',
        workspaceId: profile?.workspace_id || '',
      };
      persistUser(u);
      setUser(u);
    };

    // Initial load. getSession() resolves only AFTER Supabase has processed the
    // URL (detectSessionInUrl), so the OAuth hash is already parsed by the time
    // this runs — making it the reliable "initialization complete" signal.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await applySession(session);
      if (active) setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION is already handled by getSession() above — skip it to
      // avoid processing the same session twice on first load.
      if (event === 'INITIAL_SESSION') return;
      await applySession(session);
      if (active) setInitializing(false);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const u = await authProvider.signIn(email, password);
    persistUser(u);
    setUser(u);
    return u;
  }, []);

  const signUp = useCallback(async (name, email, password) => {
    const u = await authProvider.signUp(name, email, password);
    persistUser(u);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await authProvider.signOut();
    clearUser();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    await authProvider.resetPassword(email);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authProvider.signInWithGoogle();
  }, []);

  const signInWithGitHub = useCallback(async () => {
    await authProvider.signInWithGitHub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, signIn, signUp, signOut, resetPassword, signInWithGoogle, signInWithGitHub, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
