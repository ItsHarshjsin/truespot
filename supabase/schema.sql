-- ==============================================================================
-- TRUESPOT: DECENTRALIZED PHYSICAL VERIFICATION PROTOCOL (POSTGRESQL + POSTGIS)
-- Solana Devnet Physical Reality Oracle Migration & Multi-Role Governance Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. QUERIES: Time-bounded, economically funded requests for physical ground truth (Maker Role)
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
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'EXPIRED', 'CANCELLED', 'PAID')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. OBSERVATIONS: Physical evidence submitted by field contributors (Spotter Role)
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
  rejection_reason TEXT,
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
CREATE INDEX IF NOT EXISTS idx_observations_contributor ON observations(contributor_wallet);
CREATE INDEX IF NOT EXISTS idx_queries_creator ON queries(creator_wallet);

-- Storage bucket configuration for heavy media evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('truespot_evidence', 'truespot_evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Public Evidence Access" ON storage.objects;
CREATE POLICY "Public Evidence Access" ON storage.objects FOR SELECT USING (bucket_id = 'truespot_evidence');

DROP POLICY IF EXISTS "Public Evidence Upload" ON storage.objects;
CREATE POLICY "Public Evidence Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'truespot_evidence');

-- ==============================================================================
-- ANTI-SELF-VERIFICATION & SETTLEMENT INTEGRITY DATABASE TRIGGER
-- Rule: A user may act as both Maker and Spotter across the network, but CANNOT
-- verify or settle an observation where they are the evidence contributor.
-- ==============================================================================
CREATE OR REPLACE FUNCTION truespot_enforce_independent_settlement()
RETURNS TRIGGER AS $$
DECLARE
  v_creator TEXT;
BEGIN
  -- When an observation is marked as ACCEPTED (settled), ensure contributor != query creator
  IF NEW.status = 'ACCEPTED' THEN
    SELECT creator_wallet INTO v_creator 
    FROM queries 
    WHERE query_id_hex = NEW.query_id_hex;

    IF v_creator IS NOT NULL AND LOWER(TRIM(v_creator)) = LOWER(TRIM(NEW.contributor_wallet)) THEN
      RAISE EXCEPTION 'Self-verification violation: Maker (%) cannot verify or settle their own physical evidence submission.', v_creator;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_truespot_anti_self_verification ON observations;
CREATE TRIGGER trg_truespot_anti_self_verification
BEFORE UPDATE OF status ON observations
FOR EACH ROW
EXECUTE FUNCTION truespot_enforce_independent_settlement();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Queries" ON queries;
CREATE POLICY "Public Read Queries" ON queries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Maker Insert Queries" ON queries;
CREATE POLICY "Maker Insert Queries" ON queries FOR INSERT WITH CHECK (
  creator_wallet IS NOT NULL AND LENGTH(creator_wallet) >= 8
);

DROP POLICY IF EXISTS "Maker Update Queries" ON queries;
CREATE POLICY "Maker Update Queries" ON queries FOR UPDATE USING (true);

ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Observations" ON observations;
CREATE POLICY "Public Read Observations" ON observations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Spotter Insert Observations" ON observations;
CREATE POLICY "Spotter Insert Observations" ON observations FOR INSERT WITH CHECK (
  contributor_wallet IS NOT NULL AND LENGTH(contributor_wallet) >= 8
);

-- Anti-Self-Verification RLS Update Rule:
-- Observations can only transition to ACCEPTED if contributor != query creator
DROP POLICY IF EXISTS "Independent Settlement Update Observations" ON observations;
CREATE POLICY "Independent Settlement Update Observations" ON observations FOR UPDATE USING (
  -- General updates or rejections allowed
  status != 'ACCEPTED' 
  OR 
  -- When accepting/settling, contributor must NOT match the query creator
  NOT EXISTS (
    SELECT 1 FROM queries q 
    WHERE q.query_id_hex = observations.query_id_hex 
    AND LOWER(TRIM(q.creator_wallet)) = LOWER(TRIM(observations.contributor_wallet))
  )
);

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
