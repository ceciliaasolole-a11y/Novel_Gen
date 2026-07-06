/*
# AI Webnovel Generator - Core Schema

1. New Tables
- `projects`: novel projects (title, genre, core_plot, target chapters, tone, status)
- `story_bibles`: JSON story bible from Agent 1
- `chapters`: per-chapter outline + content + status + revision count + summary
- `generation_logs`: real-time activity log for the monitor
- `api_keys`: provider API keys (groq, gemini, openrouter)

2. Security
- Single-tenant personal app, no sign-in. RLS enabled on all tables.
- anon + authenticated full CRUD (intentionally shared single-owner data).
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  genre text NOT NULL,
  core_plot text NOT NULL,
  target_chapters integer NOT NULL DEFAULT 10,
  tone text NOT NULL DEFAULT 'Standard',
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS story_bibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE story_bibles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title text,
  outline text,
  summary text,
  content text,
  status text NOT NULL DEFAULT 'pending',
  revision_count integer NOT NULL DEFAULT 0,
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (project_id, chapter_number)
);
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent text NOT NULL,
  message text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  chapter_number integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text UNIQUE NOT NULL,
  api_key text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_logs_project ON generation_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bible_project ON story_bibles(project_id);

-- projects policies
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE TO anon, authenticated USING (true);

-- story_bibles policies
DROP POLICY IF EXISTS "anon_select_story_bibles" ON story_bibles;
CREATE POLICY "anon_select_story_bibles" ON story_bibles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_story_bibles" ON story_bibles;
CREATE POLICY "anon_insert_story_bibles" ON story_bibles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_story_bibles" ON story_bibles;
CREATE POLICY "anon_update_story_bibles" ON story_bibles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_story_bibles" ON story_bibles;
CREATE POLICY "anon_delete_story_bibles" ON story_bibles FOR DELETE TO anon, authenticated USING (true);

-- chapters policies
DROP POLICY IF EXISTS "anon_select_chapters" ON chapters;
CREATE POLICY "anon_select_chapters" ON chapters FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chapters" ON chapters;
CREATE POLICY "anon_insert_chapters" ON chapters FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chapters" ON chapters;
CREATE POLICY "anon_update_chapters" ON chapters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_chapters" ON chapters;
CREATE POLICY "anon_delete_chapters" ON chapters FOR DELETE TO anon, authenticated USING (true);

-- generation_logs policies
DROP POLICY IF EXISTS "anon_select_generation_logs" ON generation_logs;
CREATE POLICY "anon_select_generation_logs" ON generation_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_generation_logs" ON generation_logs;
CREATE POLICY "anon_insert_generation_logs" ON generation_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_generation_logs" ON generation_logs;
CREATE POLICY "anon_delete_generation_logs" ON generation_logs FOR DELETE TO anon, authenticated USING (true);

-- api_keys policies
DROP POLICY IF EXISTS "anon_select_api_keys" ON api_keys;
CREATE POLICY "anon_select_api_keys" ON api_keys FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_api_keys" ON api_keys;
CREATE POLICY "anon_insert_api_keys" ON api_keys FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_api_keys" ON api_keys;
CREATE POLICY "anon_update_api_keys" ON api_keys FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_api_keys" ON api_keys;
CREATE POLICY "anon_delete_api_keys" ON api_keys FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_touch ON projects;
CREATE TRIGGER trg_projects_touch BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_chapters_touch ON chapters;
CREATE TRIGGER trg_chapters_touch BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_bible_touch ON story_bibles;
CREATE TRIGGER trg_bible_touch BEFORE UPDATE ON story_bibles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
