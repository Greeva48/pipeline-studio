// lib/auth.js — Supabase Auth provider
// Implements the same interface contract as the mock provider:
//   signIn(email, password)    → Promise<User>
//   signUp(name, email, pass)  → Promise<User>
//   signOut()                  → Promise<void>
//   resetPassword(email)       → Promise<void>

import { supabase } from './supabase';

function mapUser(supabaseUser, profile) {
  const name     = profile?.name     || supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0];
  const initials = profile?.initials || name.slice(0, 2).toUpperCase();
  return {
    id:          supabaseUser.id,
    email:       supabaseUser.email,
    name,
    initials,
    role:        profile?.role      || 'admin',
    workspace:   profile?.workspace_id || '',
    workspaceId: profile?.workspace_id || '',
  };
}

const supabaseProvider = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const user = data.user;
    // Fetch profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('name, initials, role, workspace_id')
      .eq('id', user.id)
      .single();
    return mapUser(user, profile);
  },

  async signUp(name, email, password) {
    if (!name || name.trim().length < 1) throw new Error('Name is required.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) throw new Error(error.message);
    const user = data.user;
    if (!user) throw new Error('Sign up failed. Please try again.');

    // If Supabase requires email confirmation, data.session is null.
    if (!data.session) {
      // Throw a special error that the UI can detect
      const confirmErr = new Error('CHECK_EMAIL');
      confirmErr.needsConfirmation = true;
      throw confirmErr;
    }

    return mapUser(user, null);
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Google (OIDC) needs explicit offline access + consent to reliably
        // return a refresh token; without it Google may omit it on repeat
        // logins, which the implicit parser treats as "no session in URL".
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw new Error(error.message);
  },

  async signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/signin`,
    });
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export const authProvider = supabaseProvider;
