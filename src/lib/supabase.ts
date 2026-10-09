import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvOrStored = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('truespot_supabase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          return { url: parsed.url, anonKey: parsed.anonKey };
        }
      }
    } catch {}
  }
  return {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://tiaaposvqjeukiclugmd.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpYWFwb3N2cWpldWtpY2x1Z21kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQ1NjcsImV4cCI6MjA1NjgwOTY2N30.demo_anon_key',
  };
};

const config = getEnvOrStored();
export const supabase: SupabaseClient = createClient(config.url, config.anonKey);
