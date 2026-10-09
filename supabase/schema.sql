-- ==============================================================================
-- TRUESPOT: DECENTRALIZED PHYSICAL VERIFICATION PROTOCOL (POSTGRESQL + POSTGIS)
-- Solana Devnet Physical Reality Oracle Migration
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. QUERIES: Time-bounded, economically funded requests for physical ground truth
CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id_hex TEXT UNIQUE NOT NULL,
  creator_wallet TEXT NOT NULL,
  question TEXT NOT NULL,
  place_name TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  radius_meters INT DEFAULT 200,
  escrow_lamports BIGINT NOT NULL,
  validity_seconds BIGINT NOT NULL,
  expiry_timestamp TIMESTAMPTZ NOT NULL,
  reference_media_url TEXT,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'EXPIRED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. OBSERVATIONS: Physical evidence submitted by field contributors
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id_hex TEXT REFERENCES queries(query_id_hex) ON DELETE CASCADE,
  contributor_wallet TEXT NOT NULL,
  media_url TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  observed_location GEOGRAPHY(Point, 4326) NOT NULL,
  distance_meters NUMERIC NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  quality_report JSONB NOT NULL,
  ai_evaluation JSONB,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PUBLISHED ANSWERS: Final, machine-readable truth states exposed to AI agents & markets
CREATE TABLE IF NOT EXISTS published_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id_hex TEXT UNIQUE REFERENCES queries(query_id_hex) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('RESOLVED', 'CONFLICTING', 'STALE', 'INCONCLUSIVE')),
  verdict TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL,
  summary TEXT NOT NULL,
  evidence_hashes TEXT[] NOT NULL,
  settlement_signature TEXT,
  freshness_expires_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial & Filter Indices
CREATE INDEX IF NOT EXISTS idx_queries_geo ON queries USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_observations_geo ON observations USING GIST(observed_location);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_observations_query ON observations(query_id_hex);

-- Storage bucket configuration for heavy media evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('truespot_evidence', 'truespot_evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Evidence Access" ON storage.objects;
CREATE POLICY "Public Evidence Access" ON storage.objects FOR SELECT USING (bucket_id = 'truespot_evidence');

DROP POLICY IF EXISTS "Public Evidence Upload" ON storage.objects;
CREATE POLICY "Public Evidence Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'truespot_evidence');

-- Row Level Security
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Queries" ON queries;
CREATE POLICY "Public Read Queries" ON queries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Queries" ON queries;
CREATE POLICY "Public Insert Queries" ON queries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Queries" ON queries;
CREATE POLICY "Public Update Queries" ON queries FOR UPDATE USING (true);

ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Observations" ON observations;
CREATE POLICY "Public Read Observations" ON observations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Observations" ON observations;
CREATE POLICY "Public Insert Observations" ON observations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Observations" ON observations;
CREATE POLICY "Public Update Observations" ON observations FOR UPDATE USING (true);

ALTER TABLE published_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Answers" ON published_answers;
CREATE POLICY "Public Read Answers" ON published_answers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Answers" ON published_answers;
CREATE POLICY "Public Insert Answers" ON published_answers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Answers" ON published_answers;
CREATE POLICY "Public Update Answers" ON published_answers FOR UPDATE USING (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE queries;
ALTER PUBLICATION supabase_realtime ADD TABLE observations;
ALTER PUBLICATION supabase_realtime ADD TABLE published_answers;
