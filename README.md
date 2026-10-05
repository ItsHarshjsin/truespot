# TrueSpot — Real-Time DePIN Physical Oracle on Solana
> **Colosseum Solana Hackathon Build | DePIN & Consumer Track**  
> GitHub: [https://github.com/ItsHarshjsin/truespot](https://github.com/ItsHarshjsin/truespot)  
> Live Supabase Endpoint: `https://tiaaposvqjeukiclugmd.supabase.co`  
> Solana Anchor Program ID: `TrUEspot11111111111111111111111111111111111` (Devnet)

---

## 1. The Problem: Physical Truth is Stale
Digital information about the physical world is frequently delayed, hallucinated, or fabricated:
- *"Is the EV supercharger station fully occupied or free right now?"*
- *"Is the coffee shop queue out the door?"*
- *"Is the store actually open or closed for renovation?"*

Centralized data feeds (Google Maps, Yelp) suffer from multi-hour or multi-day latency. Autonomous AI agents, DeFi prediction markets, and ride-sharing networks cannot trust stale physical data.

---

## 2. The Solution: Solana-Powered Physical Oracle
TrueSpot bridges on-chain capital with off-chain physical truth through a 5-step decentralized pipeline:

1. **Ask with Escrow:** Users or smart contracts post a localized question and deposit micro-bounties in SOL into an on-chain PDA escrow vault.
2. **200m PostGIS Geofenced Radar:** Mobile spotters within a strict 200m radius discover the bounty using PostgreSQL PostGIS `ST_DWithin` spatial indexing.
3. **Hardware-Attested WebRTC Evidence:** Spotters capture live camera evidence through the in-browser WebRTC viewfinder:
   - **Biometric Tremor Variance:** Hardware accelerometer jitter analysis ($\sigma^2 > 0.005g$) proves an authentic biological human is holding the device (defeating bots & emulator farms).
   - **Physical Nonce:** Live Solana Devnet `recentBlockhash` is cryptographically stamped onto the video frame.
   - **SHA-256 Fingerprint:** Immutable multi-factor digest of image bytes, GPS telemetry, and blockhash anchored on-chain via the **SPL Memo Program** (`MemoSq4gq...`).
4. **Staked Schelling-Point Consensus:** Independent decentralized verifiers stake SOL to audit the report. Anti-Self-Audit protection prevents reporters from auditing their own claims.
5. **Automated Settlement & CPI Release:** Consensus distributes rewards automatically:
   - **80%** awarded to the Physical Spotter.
   - **20%** shared by consensus verifiers.
   - Ground truth is emitted as an event and stored on Solana for Cross-Program Invocation (CPI).

---

## 3. Architecture & Technical Stack

```
           MOBILE REPORTER / BROWSER                     SOLANA DEVNET & STORAGE
   ┌────────────────────────────────────────┐          ┌───────────────────────────┐
   │ In-Browser WebRTC Viewfinder (HUD)     │          │ Anchor Program (Escrow)   │
   │ Accelerometer Jitter (Human Proof)     │          │ SPL Memo (Proof Anchor)   │
   │ GPS Coordinates + Accuracy Bounds      │          │ Phantom / Solflare Wallet │
   └───────────────────┬────────────────────┘          └─────────────┬─────────────┘
                       │                                             │
                       ▼                                             ▼
   ┌────────────────────────────────────────┐          ┌───────────────────────────┐
   │ SHA-256 Evidence Multi-Factor Digest   │ ───────► │ Supabase PostGIS Database │
   │ Solana Devnet Blockhash Freshness Nonce│          │ Realtime Postgres Channel │
   └────────────────────────────────────────┘          └───────────────────────────┘
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (Organic Modern Mint & Forest Web Theme), Leaflet OpenStreetMap.
- **On-Chain Solana Anchor Program (`programs/truespot`):**
  - `initialize_bounty`: Geofenced bounty creation with PDA escrow vault.
  - `submit_attestation`: Validates blockhash freshness and accelerometer tremor variance.
  - `stake_verification`: Schelling-point staking with Anti-Self-Audit enforcement.
  - `settle_oracle_payout`: Automated CPI release (80% spotter, 20% verifier pool).
- **Backend & Spatial Layer:**
  - Supabase PostgreSQL 17 with `postgis` extension enabled.
  - Custom RPC function `get_nearby_bounties(user_lat, user_lng)` computing exact geodesic distance in meters.
  - Live Supabase Realtime channel synchronization across multi-user browsers.
- **Developer Gateway:**
  - Solana Anchor CPI invocation helper (`programs/client/src/consume_oracle.rs`).
  - TypeScript Web3 SDK with PDA derivation helpers.
  - Supabase REST API & PostGIS spatial query support.
  - Real-time JSON Physical Oracle payload exporter.

---

## 4. Solana Anchor Program Instructions

The smart contract is located in [`programs/truespot/src/lib.rs`](programs/truespot/src/lib.rs):

```rust
// 1. Initialize physical bounty with SOL escrow
pub fn initialize_bounty(
    ctx: Context<InitializeBounty>,
    bounty_id: [u8; 16],
    question: String,
    target_lat_e6: i64,
    target_lng_e6: i64,
    radius_meters: u32,
    deposit_lamports: u64,
    expiry_seconds: i64,
) -> Result<()>;

// 2. Submit hardware-attested report
pub fn submit_attestation(
    ctx: Context<SubmitAttestation>,
    evidence_hash: [u8; 32],
    lat_e6: i64,
    lng_e6: i64,
    gyro_variance_micro: u32,
    blockhash_nonce: [u8; 32],
) -> Result<()>;

// 3. Verifier stakes SOL in Schelling pool
pub fn stake_verification(
    ctx: Context<StakeVerification>,
    confirm_truth: bool,
    stake_lamports: u64,
) -> Result<()>;

// 4. Settle physical oracle & release payout
pub fn settle_oracle_payout(ctx: Context<SettleOraclePayout>) -> Result<()>;
```

---

## 5. Judge 60-Second Quick-Flight Walkthrough

1. **Top Bar — Judge Flight Deck:**
   - Location is pre-set to `Colosseum Solana Hackathon Venue (SF)`.
   - Click **"+1 Devnet SOL"** to airdrop test funds directly.
2. **Screen 1 — Radar 200m:**
   - Observe the live circular sonar radar and interactive OpenStreetMap showing nearby open bounties within the 200m geofence.
   - Click on any active venue bounty.
3. **Screen 2 — Report (Hardware Attestation):**
   - Click **"OPEN LIVE CAMERA"** for the in-browser WebRTC viewfinder (or use simulated quick-capture).
   - Review live accelerometer tremor variance, Devnet blockhash nonce, and the 64-character SHA-256 fingerprint.
   - Click **"SUBMIT EVIDENCE & CLAIM BOUNTY"** to anchor proof to Solana Devnet.
4. **Screen 3 — Verify (Staked Schelling Consensus):**
   - Click **"CONFIRM TRUTH"** to stake 0.01 SOL and vote with consensus (enforces Anti-Self-Audit protection).
5. **Screen 4 — State & Settlement:**
   - Watch the dynamic confidence decay score calculate in real time.
   - Click **"EXECUTE PAYOUT"** to trigger the Devnet escrow settlement and view the Solscan receipt!
   - Expand the **Physical Oracle Consumer Gateway** to view Anchor CPI Rust code and copy the live JSON oracle feed!

---

## 6. Local Setup & Verification

```bash
# 1. Clone repository
git clone https://github.com/ItsHarshjsin/truespot.git
cd truespot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Supabase credentials are pre-configured

# 4. Run local development server
npm run dev
```
