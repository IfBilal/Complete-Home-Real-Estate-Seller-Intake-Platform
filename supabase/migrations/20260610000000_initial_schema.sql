-- ============================================================
-- Complete Home Real Estate Seller Intake — Initial Schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Sequences ────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS submission_seq START 1000;

-- ── Functions with no table dependencies (safe to create early) ──

CREATE OR REPLACE FUNCTION generate_human_id()
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'MS-' || lpad(nextval('submission_seq')::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS submissions (
  id              uuid        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  human_id        text        NOT NULL UNIQUE DEFAULT generate_human_id(),
  draft           boolean     NOT NULL DEFAULT true,
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  address         text        NOT NULL,
  address_line1   text,
  address_city    text,
  address_state   text,
  address_zip     text,
  address_lat     double precision,
  address_lng     double precision,
  sqft            text,
  beds            integer,
  baths           integer,
  year_built      text,
  lot_size        text,
  condition       text        CHECK (condition = ANY (ARRAY['Excellent','Good','Fair','Needs work'])),
  rooms           text[]      NOT NULL DEFAULT '{}',
  prequal_answers jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'New' CHECK (status = ANY (ARRAY['New','Reviewing','Offer Made','Closed'])),
  is_new          boolean     NOT NULL DEFAULT true,
  ai_summary      jsonb,
  ai_generated_at timestamptz,
  internal_notes  jsonb       NOT NULL DEFAULT '[]',
  rentcast_data   jsonb,
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  ip_address      text,
  user_agent      text
);

CREATE TABLE IF NOT EXISTS submission_files (
  id               uuid        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id    uuid        NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  room             text        NOT NULL,
  file_type        text        NOT NULL CHECK (file_type = ANY (ARRAY['photo','video'])),
  original_name    text        NOT NULL,
  storage_path     text        NOT NULL UNIQUE,
  mime_type        text        NOT NULL,
  size_bytes       bigint,
  ai_detected_room text,
  ai_confidence    real,
  ai_is_mismatch   boolean     DEFAULT false,
  ai_status        text        NOT NULL DEFAULT 'pending' CHECK (ai_status = ANY (ARRAY['pending','analyzing','done','skipped'])),
  ai_analyzed_at   timestamptz,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  ai_is_invalid    boolean     NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS admin_users (
  id         uuid        NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL UNIQUE,
  role       text        NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now(),
  status     text        NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['pending','active']))
);

CREATE TABLE IF NOT EXISTS email_log (
  id            uuid        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id uuid        REFERENCES submissions(id) ON DELETE SET NULL,
  email_type    text        NOT NULL CHECK (email_type = ANY (ARRAY['admin_alert','seller_confirmation'])),
  recipient     text        NOT NULL,
  resend_id     text,
  status        text        NOT NULL DEFAULT 'sent',
  sent_at       timestamptz NOT NULL DEFAULT now(),
  error_message text
);

CREATE TABLE IF NOT EXISTS address_cache (
  id            uuid        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  address_key   text        NOT NULL UNIQUE,
  rentcast_data jsonb       NOT NULL,
  cached_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id         uuid        NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address text        NOT NULL,
  endpoint   text        NOT NULL,
  called_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Functions that reference tables (must come after table creation) ──

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM rate_limits   WHERE called_at  < NOW() - INTERVAL '24 hours';
  DELETE FROM submissions   WHERE draft = true AND created_at < NOW() - INTERVAL '48 hours';
  DELETE FROM address_cache WHERE expires_at  < NOW();
END;
$$;

-- ── Triggers ─────────────────────────────────────────────────

CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX idx_submissions_draft        ON submissions (draft, created_at DESC);
CREATE INDEX idx_submissions_status       ON submissions (status) WHERE draft = false;
CREATE INDEX idx_submissions_submitted_at ON submissions (submitted_at DESC) WHERE draft = false;
CREATE INDEX idx_submissions_email        ON submissions (email);
CREATE INDEX idx_submissions_city         ON submissions (address_city);
CREATE INDEX idx_submissions_human_id     ON submissions (human_id);

CREATE INDEX idx_files_submission_id      ON submission_files (submission_id);
CREATE INDEX idx_files_room               ON submission_files (submission_id, room);
CREATE INDEX idx_files_ai_status          ON submission_files (ai_status) WHERE ai_status = 'pending';

CREATE INDEX idx_email_log_submission_id  ON email_log (submission_id);

CREATE INDEX idx_rate_limits_lookup       ON rate_limits (ip_address, endpoint, called_at DESC);

CREATE INDEX idx_address_cache_expires    ON address_cache (expires_at);
CREATE INDEX idx_address_cache_key        ON address_cache (address_key);

-- ── Storage bucket ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-media',
  'property-media',
  false,
  157286400,
  ARRAY['image/jpeg','image/png','image/heic','image/heif','image/webp','video/mp4','video/quicktime','video/webm']
) ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS policies ─────────────────────────────────────

CREATE POLICY no_public_file_access    ON storage.objects FOR SELECT TO anon          USING (false);
CREATE POLICY admin_read_files_storage ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'property-media' AND is_admin());
CREATE POLICY service_role_upload      ON storage.objects FOR INSERT TO service_role  WITH CHECK (bucket_id = 'property-media');
CREATE POLICY service_role_delete      ON storage.objects FOR DELETE TO service_role  USING (bucket_id = 'property-media');

-- ── Grants ───────────────────────────────────────────────────
-- Required on new projects (auto_expose_new_tables defaults to false post-2026-05-30)

GRANT ALL ON submissions      TO anon, authenticated, service_role;
GRANT ALL ON submission_files TO anon, authenticated, service_role;
GRANT ALL ON admin_users      TO anon, authenticated, service_role;
GRANT ALL ON email_log        TO anon, authenticated, service_role;
GRANT ALL ON address_cache    TO anon, authenticated, service_role;
GRANT ALL ON rate_limits      TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE submission_seq TO anon, authenticated, service_role;

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits      ENABLE ROW LEVEL SECURITY;

-- submissions
CREATE POLICY anon_no_read_submissions  ON submissions FOR SELECT TO anon          USING (false);
CREATE POLICY admin_read_submissions    ON submissions FOR SELECT TO authenticated USING (is_admin() AND draft = false);
CREATE POLICY admin_update_submissions  ON submissions FOR UPDATE TO authenticated USING (is_admin());

-- submission_files
CREATE POLICY anon_no_read_files        ON submission_files FOR SELECT TO anon          USING (false);
CREATE POLICY admin_read_files          ON submission_files FOR SELECT TO authenticated USING (is_admin());

-- admin_users
CREATE POLICY admin_read_own            ON admin_users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY super_admin_all           ON admin_users FOR ALL    TO authenticated USING (is_super_admin());

-- email_log
CREATE POLICY no_client_access_email_log      ON email_log FOR ALL TO anon          USING (false);
CREATE POLICY no_client_access_email_log_auth ON email_log FOR ALL TO authenticated USING (false);

-- address_cache
CREATE POLICY no_client_access_address_cache      ON address_cache FOR ALL TO anon          USING (false);
CREATE POLICY no_client_access_address_cache_auth ON address_cache FOR ALL TO authenticated USING (false);

-- rate_limits
CREATE POLICY no_client_access_rate_limits      ON rate_limits FOR ALL TO anon          USING (false);
CREATE POLICY no_client_access_rate_limits_auth ON rate_limits FOR ALL TO authenticated USING (false);
