import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://dnoymxrojvbxebevejrk.supabase.co';
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3lteHJvanZieGViZXZlanJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwOTk3ODQsImV4cCI6MjA1NTY3NTc4NH0.demoKeyForSwachhSetuHackathonPlatform2026';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  tableCount?: number;
}> {
  try {
    const { data, error } = await supabase.from('complaints').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        return {
          connected: true,
          message: 'Connected to Supabase! Tables are pending creation (run schema.sql).',
        };
      }
      return {
        connected: false,
        message: `Supabase returned: ${error.message} (Code: ${error.code})`,
      };
    }
    return {
      connected: true,
      message: 'Active & live connection established with Supabase Cloud project.',
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Connection check failed: ${err?.message || 'Network error'}`,
    };
  }
}
