import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase env missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Policy section will not work."
  );
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = (): boolean => !!supabase;
