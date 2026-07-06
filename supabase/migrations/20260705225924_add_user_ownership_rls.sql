/*
# Add user ownership + owner-scoped RLS for multi-user auth

1. Changes
- Add `user_id` column to `projects`, `api_keys` (defaults to auth.uid()).
- `api_keys` unique constraint changed from `provider` alone to `(provider, user_id)` so each user has their own keys.
- Child tables (story_bibles, chapters, generation_logs) scope ownership through the parent project's user_id.

2. Security
- Drop old anon+authenticated open policies.
- Replace with authenticated-only, owner-scoped policies.
- projects + api_keys: direct auth.uid() = user_id.
- children: EXISTS check through parent projects.user_id.
*/

-- Add user_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE projects ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Add user_id to api_keys (per-user)
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE api_keys ALTER COLUMN user_id SET DEFAULT auth.uid();
-- Replace unique(provider) with unique(provider, user_id)
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_key;
DROP INDEX IF EXISTS api_keys_provider_key;
DROP INDEX IF EXISTS api_keys_provider_user_idx;
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_provider_user_idx ON api_keys(provider, user_id);

-- projects policies (owner-scoped)
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;

CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- story_bibles policies (scoped via parent project)
DROP POLICY IF EXISTS "anon_select_story_bibles" ON story_bibles;
DROP POLICY IF EXISTS "anon_insert_story_bibles" ON story_bibles;
DROP POLICY IF EXISTS "anon_update_story_bibles" ON story_bibles;
DROP POLICY IF EXISTS "anon_delete_story_bibles" ON story_bibles;

CREATE POLICY "select_own_story_bibles" ON story_bibles FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = story_bibles.project_id AND p.user_id = auth.uid()));
CREATE POLICY "insert_own_story_bibles" ON story_bibles FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = story_bibles.project_id AND p.user_id = auth.uid()));
CREATE POLICY "update_own_story_bibles" ON story_bibles FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = story_bibles.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = story_bibles.project_id AND p.user_id = auth.uid()));
CREATE POLICY "delete_own_story_bibles" ON story_bibles FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = story_bibles.project_id AND p.user_id = auth.uid()));

-- chapters policies (scoped via parent project)
DROP POLICY IF EXISTS "anon_select_chapters" ON chapters;
DROP POLICY IF EXISTS "anon_insert_chapters" ON chapters;
DROP POLICY IF EXISTS "anon_update_chapters" ON chapters;
DROP POLICY IF EXISTS "anon_delete_chapters" ON chapters;

CREATE POLICY "select_own_chapters" ON chapters FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND p.user_id = auth.uid()));
CREATE POLICY "insert_own_chapters" ON chapters FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND p.user_id = auth.uid()));
CREATE POLICY "update_own_chapters" ON chapters FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND p.user_id = auth.uid()));
CREATE POLICY "delete_own_chapters" ON chapters FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = chapters.project_id AND p.user_id = auth.uid()));

-- generation_logs policies (scoped via parent project)
DROP POLICY IF EXISTS "anon_select_generation_logs" ON generation_logs;
DROP POLICY IF EXISTS "anon_insert_generation_logs" ON generation_logs;
DROP POLICY IF EXISTS "anon_delete_generation_logs" ON generation_logs;

CREATE POLICY "select_own_generation_logs" ON generation_logs FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = generation_logs.project_id AND p.user_id = auth.uid()));
CREATE POLICY "insert_own_generation_logs" ON generation_logs FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = generation_logs.project_id AND p.user_id = auth.uid()));
CREATE POLICY "delete_own_generation_logs" ON generation_logs FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = generation_logs.project_id AND p.user_id = auth.uid()));

-- api_keys policies (owner-scoped)
DROP POLICY IF EXISTS "anon_select_api_keys" ON api_keys;
DROP POLICY IF EXISTS "anon_insert_api_keys" ON api_keys;
DROP POLICY IF EXISTS "anon_update_api_keys" ON api_keys;
DROP POLICY IF EXISTS "anon_delete_api_keys" ON api_keys;

CREATE POLICY "select_own_api_keys" ON api_keys FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_api_keys" ON api_keys FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_api_keys" ON api_keys FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_api_keys" ON api_keys FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
