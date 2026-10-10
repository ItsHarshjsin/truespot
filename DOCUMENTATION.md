# TrueSpot: Protocol Documentation & Architecture Specification
> **Real-Time DePIN Physical Reality Oracle on Solana**  
> GitHub Repository: [https://github.com/ItsHarshjsin/truespot](https://github.com/ItsHarshjsin/truespot)  
> Live Supabase PostGIS: `https://tiaaposvqjeukiclugmd.supabase.co`  
> Solana Anchor Program ID: `TrUEspot11111111111111111111111111111111111` (Devnet)  
> Design System: **CoinVex Neon Dark Mode (`#050505`, `#0B0B0B`, `#A8FF00`)**

---

## 1. Executive Summary: The TrueSpot Thesis

> *"The internet knows where everything is, but not what's happening right now. AI can search, but it can't stand there and look for the whole time. TrueSpot pays real people to be the sensor so, anyone nearby can verify reality live with GPS-timestamped evidence, no gatekeeper, no signup. Independent reports agree, Solana pays instantly, and answers stay open as freshness scored data anyone can host, query, or build on for apps and AI agents, instead of dying in a chat."*

### The Core Problem:
- **Static Maps vs. Dynamic Reality**: Digital directories (Google Maps, Yelp) map coordinates and static business info, but have zero visibility into physical ground truth occurring *right now*.
- **AI's Physical Blindness**: Autonomous AI agents can execute financial trades and query databases, but cannot physically observe whether a disaster relief supply center is active or if an airport terminal line is overflowing.
- **The Ephemeral Chat Trap**: In traditional crowdsourcing or messaging groups, ground truth is trapped inside a private direct message or ephemeral thread and vanishes.

### The TrueSpot Breakthrough:
- **People as the Sensor**: Anyone with a smartphone nearby acts as a verified physical edge sensor. No gatekeepers, no lengthy sign-up KYC.
- **Hardware-Anchored Cryptographic Proof**: Client-side WebP compression (<400KB), SHA-256 binary hash, and GPS Haversine verification.
- **Sub-Second Solana Escrow Settlement**: Anchor PDAs lock funds upon query creation and automatically distribute 97.5% net to contributors upon verification (2.5% treasury fee, 100% refund upon expiry).
- **Open Ground Truth for AI**: Verified observations are published as **Open Truth Data** with real-time freshness decay scores, exposed via REST APIs and on-chain Anchor CPI for AI swarms, prediction markets, and enterprise applications.

---

## 2. Three-Tier Architectural Domain Model

```
   1. QUERY (Solana PDA Escrow)
   ┌─────────────────────────────────────────────────────────────┐
   │ • Creator Wallet & Economic Bounty (SOL)                    │
   │ • Target Coordinate (Lat / Lng) & Geofence Radius (50-500m) │
   │ • Strict Expiration Deadline                                │
   │ • PDA Escrow: seeds = [b"query", query_id]                  │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   2. OBSERVATION (Field Evidence)
   ┌─────────────────────────────────────────────────────────────┐
   │ • Contributor Wallet (Permissionless, No Sign-up)           │
   │ • GPS-Timestamped Capture with Geodesic Distance Check      │
   │ • Client-side WebP Media (<400 KB) & SHA-256 Digest         │
   │ • 4-Pillar Quality Engine (Spatial, Freshness, Hash, AI)    │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   3. PUBLISHED ANSWER (Open Truth Layer)
   ┌─────────────────────────────────────────────────────────────┐
   │ • Truth Badges: VERIFIED_ACTIVE, STALE, CONFLICTED          │
   │ • Freshness Halflife Decay (15 min / 1 hour / 4 hours)      │
   │ • Instant Solana Payout (97.5% Contributor / 2.5% Treasury) │
   │ • Machine-Readable REST Endpoint & Cross-Program Invocation │
   └─────────────────────────────────────────────────────────────┘
```

---

## 3. Four Dedicated Protocol Hubs

### 3.1 Live Reality Map (`/map`)
- Dark-mode Leaflet vector map with inverted CartoDB tiles.
- Interactive SVG geofence radius circles indicating active query zones.
- Real-time status filters: `ALL`, `OPEN`, `IN_REVIEW`, `RESOLVED`, `EXPIRED`.
- Inspection drawer with direct in-browser photo capture and WebP/SHA-256 evidence pipeline.

### 3.2 Query Studio (`/studio`)
- Geographic search via OpenStreetMap Nominatim with automatic geofence centering.
- Radius slider (50m to 500m) with real-time map preview.
- Economic fee breakdown: 97.5% net contributor reward, 2.5% protocol treasury.
- Anchor PDA escrow derivation and simulated/real Devnet SOL locking.

### 3.3 Evidence Explorer (`/explorer`)
- Maker & community audit queue for pending field observations.
- Visual side-by-side inspection of captured media vs. target prompt.
- 4-Pillar Quality Scorecard breakdown:
  - **Spatial Consistency** (Haversine formula against geofence)
  - **Freshness & Timeliness** (Delta against query validity window)
  - **Data Integrity** (SHA-256 fingerprint verification)
  - **Visual Relevance** (Edge AI scene understanding)
- One-click Anchor `settle_query` execution releasing 97.5% payout with confetti feedback.
- Zero-deduction 100% refund claim button for expired queries.

### 3.4 Protocol & API Gateway (`/developers`)
- Real-time Total Value Locked (TVL) counter across all query PDAs.
- Live Solana Devnet confirmed slot counter and RPC latency monitor.
- Interactive REST API sandbox for `GET /api/v1/queries/:id/answer`.
- Production-ready copyable code snippets in Rust (Anchor CPI) and TypeScript (Web3 SDK).

---

## 4. On-Chain Smart Contract Math & Tokenomics

The Solana Anchor program ([`programs/truespot/src/lib.rs`](programs/truespot/src/lib.rs)) enforces mathematically provable incentives:

```rust
pub const PROTOCOL_FEE_BPS: u64 = 250; // 2.5%
pub const BPS_DENOMINATOR: u64 = 10_000;

// Settlement math:
let treasury_fee = (deposit_lamports * PROTOCOL_FEE_BPS) / BPS_DENOMINATOR;
let contributor_payout = deposit_lamports - treasury_fee; // 97.5%

// Expiration math:
// 100% of deposited lamports refunded to query creator with ZERO fee deductions.
```

---

## 5. Technology Stack Summary

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Leaflet, Lucide React, Canvas Confetti.
- **Styling**: CoinVex Neon Dark Mode (`bg-[#050505]`, cards `bg-[#0B0B0B]`, accents `text-[#A8FF00]`, `rounded-[24px]`).
- **Blockchain**: Solana Devnet, Anchor Framework, `@solana/web3.js`, `@solana/wallet-adapter-react`.
- **Database & Storage**: Supabase PostgreSQL with PostGIS spatial extension (`ST_DWithin`, `ST_Point`), Supabase Storage (`truespot_evidence` bucket).
- **Client Pipeline**: Client-side canvas WebP compression, Web Crypto API SHA-256 hash calculation, Haversine formula calculation.
