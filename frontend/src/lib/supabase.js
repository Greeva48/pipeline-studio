// lib/supabase.js — singleton Supabase JS client
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://algabtkpubknugugvsrb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZ2FidGtwdWJrbnVndWd2c3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjA2NjAsImV4cCI6MjA5NjMzNjY2MH0.cjBEkPRyA6w8oMBED4GsKAlpie7qyoicvzxNHBIIxT8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}
