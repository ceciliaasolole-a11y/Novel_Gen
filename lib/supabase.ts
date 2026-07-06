import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Project = {
  id: string;
  title: string;
  genre: string;
  core_plot: string;
  target_chapters: number;
  tone: string;
  status: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
};

export type StoryBible = {
  id: string;
  project_id: string;
  content: any;
  created_at: string;
  updated_at: string;
};

export type Chapter = {
  id: string;
  project_id: string;
  chapter_number: number;
  title: string | null;
  outline: string | null;
  summary: string | null;
  content: string | null;
  status: string;
  revision_count: number;
  word_count: number;
  created_at: string;
  updated_at: string;
};

export type GenerationLog = {
  id: string;
  project_id: string;
  agent: string;
  message: string;
  level: string;
  chapter_number: number | null;
  created_at: string;
};

export type ApiKeyRow = {
  id: string;
  provider: string;
  api_key: string;
  user_id?: string;
  updated_at: string;
};
