# TrueSpot: Complete Project Documentation & Technical Architecture
> **Real-Time DePIN Physical Oracle on Solana**  
> GitHub Repository: [https://github.com/ItsHarshjsin/truespot](https://github.com/ItsHarshjsin/truespot)  
> Live Supabase PostGIS: `https://tiaaposvqjeukiclugmd.supabase.co`  
> Solana Anchor Program ID: `TrUEspot11111111111111111111111111111111111` (Devnet)  
> Design System: **CoinVex Neon Dark Mode Fintech Aesthetic**

---

## Table of Contents
1. [Executive Summary & Vision](#1-executive-summary--vision)
2. [The Core Problem: Stale Physical Ground Truth](#2-the-core-problem-stale-physical-ground-truth)
3. [The TrueSpot Solution & 3-Party Protocol Architecture](#3-the-truespot-solution--3-party-protocol-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Hardware-Attested Proof Pipeline (Anti-Fraud)](#5-hardware-attested-proof-pipeline-anti-fraud)
6. [Design System & UI/UX Aesthetics](#6-design-system--uiux-aesthetics)
7. [Comprehensive Page-by-Page Walkthrough & Interactions](#7-comprehensive-page-by-page-walkthrough--interactions)
   - 7.1 Global Header & Navigation
   - 7.2 Judge Flight Deck & GPS Simulation
   - 7.3 Dashboard (Task Maker Portal)
   - 7.4 Analytics & Radar (Field Earner Portal)
   - 7.5 Verification & Consensus Audit (Verify & State)
   - 7.6 Escrow Vault Protocol Hub
   - 7.7 Modals & Sub-systems
8. [Who Sees What: Role-Based Interaction Matrix](#8-who-sees-what-role-based-interaction-matrix)
9. [Smart Contract & Database Schemas](#9-smart-contract--database-schemas)
10. [Local Development, Deployment & Testing](#10-local-development-deployment--testing)

---

## 1. Executive Summary & Vision

**TrueSpot** is a decentralized physical oracle network (DePIN) built on Solana. It enables on-chain smart contracts, autonomous AI agents, DeFi prediction markets, and everyday users to request and verify real-world, ground-truth physical information in real time with cryptographic proof.

Whether confirming if an EV charging stall is vacant, checking the queue length outside a café, verifying inventory on a retail store shelf, or auditing the operational status of disaster relief facilities, TrueSpot eliminates the multi-hour latency of centralized web indexes (like Google Maps or Yelp) through a trustless incentive network of mobile field spotters and automated Solana escrow settlements.

---

## 2. The Core Problem: Stale Physical Ground Truth

Digital applications are fundamentally blind to real-time physical reality:
- **Centralized Stale Data**: Traditional directories (Google Maps, Yelp, Foursquare) rely on infrequent user reviews or web crawling, creating a 6-to-48-hour delay on fast-changing physical conditions.
- **Autonomous AI Blind Spots**: AI agents can browse the web and execute on-chain transactions, but they cannot look through a window to see if a store is physically open or flooded.
- **Bot & Fake Photo Vulnerability**: Existing crowdsourcing apps can easily be spammed with stock photos, GPS-spoofed emulators, or synthetic AI-generated images.
- **Lack of Trustless Escrow**: In Web2, workers have no guarantee they will get paid after taking a photo, and requesters have no guarantee that submitted data is verified before payment.

---

## 3. The TrueSpot Solution & 3-Party Protocol Architecture

TrueSpot introduces a trustless, hardware-attested, 3-party economic engine:

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           TRUESPOT PROTOCOL                            │
  └────────────────────────────────────────────────────────────────────────┘
          │                                                  ▲
          │ 1. Locks SOL Escrow                              │ 5. 100% or 80/20 Payout
          ▼                                                  │
   ┌───────────────┐        2. Discovers in 200m       ┌───────────────┐
   │  TASK MAKER   │ ────────────────────────────────► │ FIELD WORKER  │
   │  (Asker Role) │                                   │ (Spotter Role)│
   └───────────────┘                                   └───────────────┘
          │                                                  │
          │                                                  │ 3. Captures WebRTC Photo
          │                                                  │    + Gyro Jitter (Human Proof)
          │                                                  │    + Devnet Blockhash Stamp
          ▼                                                  ▼
   ┌───────────────────────────────────────────────────────────┐
   │            AUTONOMOUS SOLANA ESCROW VAULT (PDA)           │
   │            + STAKED VERIFICATION CONSENSUS (4)            │
   └───────────────────────────────────────────────────────────┘
```

### The 3 Core Protocol Entities:
1. **Task Maker (The Asker)**:
   - Posts a location, radius, question, and deposits micro-bounties in SOL.
   - Funds are immediately locked in an on-chain Program Derived Address (PDA) escrow vault.
2. **Task Receiver (The Spotter / Field Earner)**:
   - Discovers bounties within a strict **200m spatial geofence** via PostGIS indexing.
   - Enters the geofence and captures live evidence via the in-browser WebRTC camera.
   - The device captures biological micro-tremors from the accelerometer and stamps the live Solana Devnet `recentBlockhash`.
3. **Escrow Vault & Verifiers (Consensus & Settlement)**:
   - Independent verifiers stake SOL in a Schelling-point consensus pool to audit submitted proof.
   - Built-in **Anti-Self-Audit protection** prevents workers from voting on their own claims.
   - Upon consensus or maker confirmation, the smart contract automatically settles on-chain: **80% to the spotter, 20% to verifiers** (or 100% direct instant payout upon creator approval).

---

## 4. Technology Stack

### Frontend Application
- **Framework**: React 18 with TypeScript.
- **Build Tool**: Vite 6.4.
- **Styling**: Tailwind CSS v3.4 tailored with the **CoinVex Neon Dark Mode** design system.
- **Mapping & Spatial Visualization**: Leaflet 1.9 + OpenStreetMap with custom dark tile invert layers and SVG geofence overlays.
- **Icons**: Lucide React.
- **Delight & Feedback**: Canvas-Confetti for on-chain settlement animations.

### Web3 & Solana Layer
- **Blockchain**: Solana Devnet.
- **Libraries**: `@solana/web3.js` (v1.98), `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`.
- **Supported Wallets**: Real Phantom, Solflare, or 3 built-in simulated Devnet personas.
- **On-Chain Programs**:
  - Custom Anchor Program (`TrUEspot11111111111111111111111111111111111`).
  - Solana System Program (Lamports transfer & PDA escrow).
  - SPL Memo Program (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) for anchoring evidence digests directly to Solana transaction logs.

### Backend & Database Layer
- **Database Engine**: Supabase Cloud PostgreSQL 17 with the **PostGIS** spatial extension.
- **Spatial Queries**: `ST_DWithin` and `ST_Distance` spherical calculations computing sub-meter proximity to geofences.
- **Real-Time Sync**: Supabase Realtime WebSocket channels syncing new bounties, submitted reports, and payouts across multi-user browser sessions.
- **Hybrid Storage Fallback**: LocalStorage fallback engine with identical schema structures for offline / zero-latency hackathon testing.

---

## 5. Hardware-Attested Proof Pipeline (Anti-Fraud)

To prevent GPS spoofing, emulator bots, and AI deepfakes, TrueSpot implements a 4-layer hardware attestation pipeline:

1. **200m PostGIS Spatial Geofence**:
   - The user's device coordinates are calculated against the bounty's coordinates using geodesic math. Submission is strictly disabled if the user is $>200$ meters away.
2. **Biometric Micro-Tremor Variance ($\sigma^2 > 0.005g$)**:
   - Living human hands have an involuntary physiological micro-tremor of 8–12 Hz.
   - The in-browser accelerometer monitors continuous sensor delta while the camera viewfinder is active. Emulators, headless scrapers, and tripod rigs register $\approx 0.000g$ variance and fail validation.
3. **Solana Devnet Blockhash Stamping**:
   - When the shutter button is pressed, the client requests the latest Solana Devnet blockhash (`recentBlockhash`).
   - This cryptographic blockhash is burned into the photo metadata and receipt digest, mathematically proving the photo was captured **after** that block was mined (preventing recycled old photos).
4. **SHA-256 Multi-Factor Digest**:
   - A multi-factor SHA-256 hash is generated from: `Image bytes + GPS Latitude/Longitude + Blockhash + Timestamp + Reporter Wallet`.
   - This fingerprint is anchored to Solana via the SPL Memo Program.

---

## 6. Design System & UI/UX Aesthetics

TrueSpot was completely overhauled to match the **CoinVex "Neon Dark Mode Fintech Dashboard"** benchmark:

### Visual Language & Tokens
- **Global Canvas**: Deep Obsidian Black (`#050505`).
- **Surface Elevation**: Sleek card surfaces (`#0B0B0B`) and elevated inner containers (`#101010`) with subtle borders (`rgba(255, 255, 255, 0.07)`).
- **Corner Radii**: Generous, modern `rounded-[24px]` on primary cards, `rounded-[18px]` on role capsules, and `rounded-full` pills on interactive controls.
- **Primary Accent**: Electric Neon Lime (`#A8FF00`) with high-contrast black bold typography (`text-black font-black`).
- **Action Pucks**: Signature CoinVex circular action pucks (`w-9 h-9 rounded-full bg-white text-black font-black flex items-center justify-center shadow-md`) with black icons and hover scale animations.
- **Tactile Visualizations**:
  - **Activity Flow Chart**: Smooth dual-wave SVG ribbon chart in lime and cyan.
  - **Activity Matrix**: 12-slot tactile heatmap showing historical verification cycles.
  - **Analog Proximity Dial**: Skeuomorphic radar gauge displaying real-time distance from the 200m boundary.
  - **Spectrum Truth Gauge**: Rose-to-Amber-to-Neon Lime gradient bar showing live Bayesian confidence decay.

---

## 7. Comprehensive Page-by-Page Walkthrough & Interactions

### 7.1 Global Header & Navigation (`Navbar.tsx`)
- **Brand Identity**: TrueSpot logo with an electric neon lime shield emblem.
- **Central Navigation**: Floating pill switcher connecting the 3 primary application portals:
  - `Dashboard` (Task Maker Portal)
  - `Analytics & Radar` (Field Earner Portal)
  - `Escrow Vault` (3-Party Settlement Hub)
- **Persona & Wallet Widget**: Displays the connected persona's avatar, name, and live Devnet SOL balance with a real-time status indicator.
- **Utility Quick-Controls**:
  - `?`: Opens the 3-step **How TrueSpot Works** visual modal.
  - Database Icon: Opens the live **Supabase PostGIS Configuration** modal.
  - Wallet Pill: Opens the **Solana Devnet Wallet & Airdrop Faucet** modal.

### 7.2 Web Toolbar / Flight Deck (`JudgeDeck.tsx`)
- **Location Status**: Displays current locked location name and accuracy bounds (e.g., `Satellite Fix ±3.0m`).
- **`Real GPS` Pill**: Activates live HTML5 device geolocation.
- **`Custom Coords` Pill**: Opens manual coordinate inputs for custom testing.
- **`Jump to City...` Selector**: Instant teleporter to pre-configured hackathon testing venues:
  - *Colosseum Solana Hackathon Venue (San Francisco)*
  - *Kathmandu City Center (Thamel)*
  - *Tokyo Shibuya Crossing*
  - *London Piccadilly Circus*
- **`+1 SOL` Airdrop Pill**: 1-click Devnet faucet crediting test SOL to the active persona.
- **Refresh Puck**: Re-syncs hybrid storage with live Supabase database channels.

### 7.3 Dashboard — Task Maker Portal (`MakerPortal.tsx` & `AskScreen.tsx`)
*Designed as a 3-column desktop-first command center for task creators:*
- **Column 1 — Financial Telemetry**:
  - **Worker Payout Card**: Vibrant lime gradient capsule highlighting `100% Instant Release Upon Approval`.
  - **Verification Proof Card**: Purple capsule detailing biometric gyro variance and SHA-256 anchoring.
  - **1-Click Verification Ideas**: Quick prompt capsules (`☕ Coffee line wait?`, `⚡ EV charging stall free?`, `📦 Product on shelf?`, `🚗 Parking lot space?`).
- **Column 2 — Activity Flow & Analytics Matrix**:
  - Dual-wave SVG ribbon chart tracking 24-hour verification velocity.
  - 12-block activity matrix showing recent validation volume.
- **Column 3 — Task Creation Console**:
  - **Search Spot Bar**: Live OpenStreetMap geocoder searching any global address or venue.
  - **Question Input**: Prompt detailing the physical condition to verify.
  - **Escrow Slider**: Amount in SOL to deposit into escrow ($0.05$ to $5.00$ SOL).
  - **Action Button**: Solid neon green pill `+ Lock Funds in Escrow (X.XX SOL)`.

### 7.4 Analytics & Radar — Field Earner Portal (`ReceiverPortal.tsx` & `NearbyScreen.tsx`)
*Dedicated hub for physical spotters to walk, capture proof, and earn SOL:*
- **Sub-Mode Switcher**: Clean pill toggle between `200m Radar`, `Submit Evidence`, and `My Earnings`.
- **Mode 1: 200m Proximity Radar**:
  - **Analog Proximity Dial**: Shows exact distance in meters from the nearest bounty with a color-coded status badge (`WITHIN 200M GEOFENCE` or `OUTSIDE RANGE`).
  - **Interactive Map**: Centered on the user's GPS marker with a dashed 200m geofence circle. Shows pins for open bounties.
  - **Bounty Cards List**: Displays task title, bounty reward in SOL, distance, and direct navigation buttons.
- **Mode 2: Submit Evidence Viewfinder (`ReportScreen.tsx`)**:
  - Live WebRTC camera viewfinder with crosshair HUD overlay and real-time gyro jitter telemetry ($0.045g$).
  - One-click answer presets based on the question (e.g., `Yes, Available`, `No, Crowded`, `Closed`).
  - Primary CTA: Solid `#A8FF00` neon pill `Submit Evidence & Claim X.XX SOL Bounty`.
- **Mode 3: My Earnings & Proof Gallery**:
  - Quick metrics: Total Settled SOL, Total Attestations, Pending Review Count.
  - Submitted Proof Gallery: Displays full photographic evidence, timestamp, GPS coordinates, tremor variance, and on-chain settlement status (`Paid & Settled ✓`).

### 7.5 Verification & Consensus Audit (`VerifyScreen.tsx` & `StateScreen.tsx`)
- **Staked Consensus Audit**: Community members review submitted photos against the original bounty question.
- **Consensus Progress Bar**: Real-time ratio of community agreement.
- **Voting Controls**:
  - `Agree (Verify as Truth)`: Solid neon green pill with arrow puck (stakes 0.01 SOL on consensus).
  - `Disagree (Flag as Inaccurate)`: Sleek dark pill with subtle rose accent.
- **Oracle State & Freshness (`StateScreen.tsx`)**:
  - **Spectrum Truth Gauge**: Multi-color gradient slider showing live consensus score.
  - **Vertical Freshness Ruler**: Tactile skeuomorphic ruler tracking observation age from `Ultra-Fresh (0m)` to `Aging Out (60m)`.
  - **Execute Payout Button**: Triggers the automated 80/20 escrow payout and fires celebratory confetti!
  - **Developer Gateway Panel**: Collapsible drawer exposing Rust Anchor CPI code, TypeScript Web3 SDK, and real-time JSON Oracle feeds.

### 7.6 Escrow Vault Protocol Hub (`ThreeWalletsHub.tsx`)
- **TVL & Network Telemetry**: Total Value Locked in escrow and live Solana Devnet slot/latency ticker.
- **Global Search Bar**: Instant search across Maker wallets, Worker wallets, venue names, or transaction hashes.
- **3 Dedicated Role Navigators**:
  - `1. Task Maker Portal`: Live creator balance, pending worker submissions awaiting creator approval.
  - `2. Task Receiver Portal`: Live worker balance, list of open field missions with `Snap Photo & Earn` CTAs.
  - `3. Escrow Vault Protocol`: Autonomous Solana smart contract vault status, telemetry strip, and full **Escrow Settlement Ledger Table** with direct links to Solscan Devnet.

### 7.7 Modals & Sub-systems
- **`WalletModal.tsx`**:
  - Displays real connected wallet address or allows switching between 3 offline demo personas:
    1. *Spotter (Worker)* — `Spot7r...9XkL`
    2. *Maker (Asker)* — `Ask3r...4Wqz`
    3. *Verifier (Auditor)* — `Veri9...2Pqm`
  - Solid electric neon lime button: `Request +1.00 SOL Devnet Airdrop`.
- **`HowItWorksModal.tsx`**:
  - 3 numbered capsules explaining Maker Escrow, Worker Truth Capture, and Instant 100% Payout.
  - Solid neon green CTA: `Start Exploring →`.
- **`SupabaseModal.tsx`**:
  - Configure live Supabase Project URL and Public Anon Key.
  - 1-click test verifying live connection to PostgreSQL and the PostGIS 200m spatial engine.

---

## 8. Who Sees What: Role-Based Interaction Matrix

| Feature / UI Element | Task Maker (Asker) | Task Receiver (Worker) | Consensus Verifier (Auditor) | Public / Smart Contract |
| :--- | :---: | :---: | :---: | :---: |
| **Bounty Creation Form** | **Full Access** (Create & Fund) | Hidden / View Only | Hidden / View Only | Programmatic API Access |
| **200m Proximity Radar** | View Bounties | **Full Interactive Access** | View Bounties | Read-Only Map |
| **WebRTC Camera & Tremor Capture**| View Only | **Active Capture & Submit** | View Only | View Immutable Hash |
| **Audit Voting (Agree/Disagree)** | Anti-Self-Audit Blocked | Anti-Self-Audit Blocked | **Active Staked Vote** | Public Vote Count |
| **Instant 100% Payout Release** | **Creator Approval Authority** | Recipient | System Automated | System Automated |
| **80/20 Escrow Split Settlement** | Escrow Depositor | 80% Reward Recipient | 20% Staking Yield Pool | Automated CPI Execution |
| **Oracle Consumer Gateway (JSON/CPI)**| View | View | View | **Direct Integration** |

---

## 9. Smart Contract & Database Schemas

### Solana Anchor Smart Contract (`programs/truespot/src/lib.rs`)
```rust
#[program]
pub mod truespot {
    use super::*;

    // 1. Maker initializes bounty and locks SOL in PDA escrow
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

    // 2. Field worker submits hardware-attested evidence
    pub fn submit_attestation(
        ctx: Context<SubmitAttestation>,
        evidence_hash: [u8; 32],
        lat_e6: i64,
        lng_e6: i64,
        gyro_variance_micro: u32,
        blockhash_nonce: [u8; 32],
    ) -> Result<()>;

    // 3. Decentralized auditor stakes SOL in Schelling pool
    pub fn stake_verification(
        ctx: Context<StakeVerification>,
        confirm_truth: bool,
        stake_lamports: u64,
    ) -> Result<()>;

    // 4. Autonomous payout settlement: 80% spotter, 20% verifiers
    pub fn settle_oracle_payout(ctx: Context<SettleOraclePayout>) -> Result<()>;
}
```

### Supabase PostgreSQL + PostGIS Schema (`supabase/schema.sql`)
```sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Bounties Table with Geography point
CREATE TABLE bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT NOT NULL,
  question TEXT NOT NULL,
  place_name TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  amount_sol NUMERIC NOT NULL,
  status TEXT DEFAULT 'OPEN', -- 'OPEN' | 'ANSWERED' | 'PAID'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Spatial Index for Sub-millisecond 200m Queries
CREATE INDEX idx_bounties_location ON bounties USING GIST(location);

-- 3. Stored Procedure: 200m Proximity Search
CREATE OR REPLACE FUNCTION get_nearby_bounties(user_lat FLOAT, user_lng FLOAT)
RETURNS TABLE (
  id UUID,
  place_name TEXT,
  question TEXT,
  amount_sol NUMERIC,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.place_name,
    b.question,
    b.amount_sol,
    ST_Distance(b.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_meters
  FROM bounties b
  WHERE ST_DWithin(b.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, 200.0)
    AND b.status = 'OPEN'
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;
```

---

## 10. Local Development, Deployment & Testing

### Installation & Run
```bash
# 1. Clone repository
git clone https://github.com/ItsHarshjsin/truespot.git
cd truespot

# 2. Install dependencies (matching Tailwind v3.4 and Leaflet)
npm install

# 3. Start local development server
npm run dev
# Application starts at http://localhost:5173/

# 4. Production build verification
npm run build
```

### 60-Second Hackathon Demo Workflow
1. Open [http://localhost:5173/](http://localhost:5173/).
2. On the **Judge Toolbar**, click **`+1 SOL`** to add test funds to your active persona.
3. On the **Dashboard**, use the 1-Click Verification Ideas and click **`+ Lock Funds in Escrow`** to create a live bounty.
4. Switch to **`Analytics & Radar`**:
   - Notice the **Analog Proximity Dial** detecting the venue ($15$ meters away).
   - Click **`Submit Evidence`**, view the live camera HUD with gyro jitter telemetry ($0.045g$).
   - Click **`Submit Evidence & Claim Bounty`**.
5. Switch to **`Escrow Vault`**:
   - View the bounty moved into the **Settlement Ledger**.
   - Click **`Confirm Truth & Release Payout`** to trigger automated Devnet settlement!
6. Expand the **Physical Oracle Consumer Gateway** to view live Rust CPI integration code and copy the live JSON feed.

---
*TrueSpot — Physical Ground Truth for the Solana Ecosystem.*
