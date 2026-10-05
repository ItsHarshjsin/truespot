-- ==============================================================================
-- TRUESPOT: DECENTRALIZED PHYSICAL ORACLE DATABASE SCHEMA (POSTGRESQL + POSTGIS)
-- Colosseum Solana Hackathon Build
-- ==============================================================================

-- 1. Enable PostGIS Extension for high-precision geospatial calculations
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Drop existing tables if re-running
DROP FUNCTION IF EXISTS get_nearby_bounties(DOUBLE PRECISION, DOUBLE PRECISION);
DROP TABLE IF EXISTS verifications CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS bounties CASCADE;

-- 3. Bounties Table: Physical queries escrowed on Solana Devnet
CREATE TABLE bounties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    place_name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    amount_sol NUMERIC NOT NULL DEFAULT 0.1,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ANSWERED', 'PAID', 'EXPIRED')),
    asker_wallet TEXT NOT NULL,
    escrow_tx TEXT,
    payout_tx TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED
);

-- Spatial index on geography point for sub-millisecond 200m bounding-box queries
CREATE INDEX IF NOT EXISTS idx_bounties_location ON bounties USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);

-- 4. Reports Table: Hardware-attested physical observations
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    fingerprint TEXT NOT NULL, -- 64-char SHA-256 (Image + Lat + Lng + Timestamp)
    gps_lat DOUBLE PRECISION NOT NULL,
    gps_lng DOUBLE PRECISION NOT NULL,
    gps_accuracy DOUBLE PRECISION DEFAULT 5.0,
    reporter_wallet TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    gyro_variance DOUBLE PRECISION,
    blockhash_stamp TEXT,
    memo_signature TEXT,
    observed_at TIMESTAMPTZ DEFAULT now(),
    location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(gps_lng, gps_lat), 4326)::geography) STORED
);

CREATE INDEX IF NOT EXISTS idx_reports_bounty_id ON reports(bounty_id);

-- 5. Verifications Table: Staked Schelling-point consensus votes
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    verifier_wallet TEXT NOT NULL,
    agreed BOOLEAN NOT NULL,
    stake_sol NUMERIC NOT NULL DEFAULT 0.01,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verifications_report_id ON verifications(report_id);

-- 6. High-Performance PostGIS Spatial Radius RPC Function: get_nearby_bounties
-- Returns OPEN bounties within strict 200 meters of the caller's coordinates
CREATE OR REPLACE FUNCTION get_nearby_bounties(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    question TEXT,
    place_name TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    amount_sol NUMERIC,
    status TEXT,
    asker_wallet TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION
) 
LANGUAGE sql
STABLE
AS $$
    SELECT 
        b.id,
        b.question,
        b.place_name,
        b.lat,
        b.lng,
        b.amount_sol,
        b.status,
        b.asker_wallet,
        b.created_at,
        b.expires_at,
        ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) AS distance_meters
    FROM bounties b
    WHERE 
        b.status = 'OPEN'
        AND b.expires_at > now()
        AND ST_DWithin(
            b.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            200 -- Strict 200m physical oracle geofence
        )
    ORDER BY distance_meters ASC;
$$;

-- 7. Supabase Storage bucket for photo evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bounty-evidence', 'bounty-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access policy for storage
DROP POLICY IF EXISTS "Public Read Evidence" ON storage.objects;
CREATE POLICY "Public Read Evidence" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'bounty-evidence');

-- Authenticated/Anon upload policy for photo reports
DROP POLICY IF EXISTS "Public Upload Evidence" ON storage.objects;
CREATE POLICY "Public Upload Evidence" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'bounty-evidence');

-- 8. Row Level Security (RLS) Policies for Public DePIN Oracle Access
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Bounties" ON bounties;
CREATE POLICY "Public Read Bounties" ON bounties FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Bounties" ON bounties;
CREATE POLICY "Public Insert Bounties" ON bounties FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Bounties" ON bounties;
CREATE POLICY "Public Update Bounties" ON bounties FOR UPDATE USING (true);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Reports" ON reports;
CREATE POLICY "Public Read Reports" ON reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Reports" ON reports;
CREATE POLICY "Public Insert Reports" ON reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Reports" ON reports;
CREATE POLICY "Public Update Reports" ON reports FOR UPDATE USING (true);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Verifications" ON verifications;
CREATE POLICY "Public Read Verifications" ON verifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Verifications" ON verifications;
CREATE POLICY "Public Insert Verifications" ON verifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Verifications" ON verifications;
CREATE POLICY "Public Update Verifications" ON verifications FOR UPDATE USING (true);
