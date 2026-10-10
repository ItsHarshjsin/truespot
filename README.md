# TrueSpot — Real-Time DePIN Physical Reality Oracle on Solana
> **Colosseum Solana Hackathon | DePIN & Consumer Track**  
> GitHub: [https://github.com/ItsHarshjsin/truespot](https://github.com/ItsHarshjsin/truespot)  
> Live Supabase Endpoint: `https://tiaaposvqjeukiclugmd.supabase.co`  
> Solana Anchor Program ID: `TrUEspot11111111111111111111111111111111111` (Devnet)  
> Design System: **CoinVex Neon Dark Mode (`#050505`, `#0B0B0B`, `#A8FF00`)**

---

## 1. The Core Thesis: People as the Sensor

> *"The internet knows where everything is, but not what's happening right now. AI can search, but it can't stand there and look for the whole time. TrueSpot pays real people to be the sensor so, anyone nearby can verify reality live with GPS-timestamped evidence, no gatekeeper, no signup. Independent reports agree, Solana pays instantly, and answers stay open as freshness scored data anyone can host, query, or build on for apps and AI agents, instead of dying in a chat."*

### Why TrueSpot Exists:
1. **Maps Are Static Indexes**: Google Maps, Yelp, and street indexes tell you *where* places are, but cannot tell you what is happening *this exact second*. Is the ferry delayed? Is the EV charger blocked? Is the disaster shelter distributing water right now?
2. **AI's Physical Blind Spot**: LLMs and search crawlers synthesize billions of tokens across the web, but they have no physical eyes on the ground. An autonomous AI agent cannot stand at a physical intersection and verify physical ground truth.
3. **Humans Are the Ultimate Decentralized Sensor Network**: Millions of people are already walking past physical locations every minute. TrueSpot turns ordinary smartphones into cryptographic edge sensors with zero signup friction and no gatekeepers.
4. **Instant Solana Settlement**: When independent observations agree with cryptographic proof, Solana settles payments instantly via Program Derived Address (PDA) escrows.
5. **Open Truth vs. Siloed Chats**: In traditional gig apps or group chats, ground truth dies in a private thread. In TrueSpot, verified observations are published as **Open Truth Data** with real-time freshness decay scores that any developer, prediction market (Polymarket), or autonomous AI agent can query 24/7.

---

## 2. Core Protocol Architecture (3-Tier Lifecycle)

TrueSpot replaces legacy task boards with a strict three-tier verification lifecycle:

```
    ┌────────────────────────────────────────────────────────────────────────┐
    │                       1. QUERY (Anchor PDA Escrow)                     │
    │   Asker / AI Agent deposits SOL into deterministic PDA escrow vault    │
    │   Defines geographic point, radius (50-500m), and validity deadline    │
    └───────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │                     2. OBSERVATION (Field Evidence)                    │
    │   Ephemeral mobile spotters nearby capture live field evidence         │
    │   - Client-side WebP compression (<400 KB)                             │
    │   - SHA-256 immutable fingerprint                                      │
    │   - Haversine geodesic distance & 4-pillar quality audit               │
    └───────────────────────────────────┬────────────────────────────────────┘
                                        │
                                        ▼
    ┌────────────────────────────────────────────────────────────────────────┐
    │                  3. PUBLISHED ANSWER (Open Truth Layer)                │
    │   - Maker confirms / Consensus reached                                 │
    │   - Solana PDA releases 97.5% to Spotter, 2.5% to Protocol Treasury   │
    │   - Published with Truth Badge & Freshness Decay Score (halflife)      │
    │   - Exposed via machine-readable REST API and on-chain Anchor CPI      │
    └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Four Core Protocol Hubs

| Hub | Route | Primary Persona | Core Functionality |
| :--- | :--- | :--- | :--- |
| **Live Reality Map** | `/map` | Field Spotters & Public | Real-time Dark Leaflet map with PostGIS spatial circles, geofence radius visualizers, active query inspection, and in-browser camera evidence submission. |
| **Query Studio** | `/studio` | Askers & Agents | Create time-bounded reality requests with Nominatim address search, radius sliders (50–500m), economic fee breakdown (97.5% / 2.5%), and PDA escrow deposit. |
| **Evidence Explorer** | `/explorer` | Requesters & Auditors | Multi-evidence inspection queue, 4-pillar quality scorecard (Spatial, Freshness, Integrity, Visual), Anchor `settle_query` execution, and 100% refund claims. |
| **Protocol & API** | `/developers` | Developers & AI Agents | Real-time TVL, Solana Devnet slot telemetry, live REST API query sandbox (`/api/v1/queries/:id/answer`), and copyable Rust/TypeScript integration snippets. |

---

## 4. Tokenomics & Anchor Smart Contract Math

Located in [`programs/truespot/src/lib.rs`](programs/truespot/src/lib.rs):

- **Deterministic PDA**: Derived with seeds `[b"query", query_id]`.
- **Net Contributor Payout**: $\text{Payout} = \text{Deposit} \times \frac{10000 - 250}{10000} = 97.5\%$.
- **Protocol Treasury Fee**: $\text{Fee} = \text{Deposit} \times \frac{250}{10000} = 2.5\%$.
- **Zero-Fee Expiration Refund**: If a query expires with no verified observation, the creator receives **100%** of their deposited lamports back with zero protocol deductions.

```rust
// 1. Initialize Query with PDA Escrow
pub fn initialize_query(
    ctx: Context<InitializeQuery>,
    query_id: [u8; 16],
    question: String,
    target_lat_e6: i64,
    target_lng_e6: i64,
    radius_meters: u32,
    deposit_lamports: u64,
    validity_duration_seconds: i64,
) -> Result<()>;

// 2. Settle Query (97.5% Contributor / 2.5% Treasury)
pub fn settle_query(
    ctx: Context<SettleQuery>,
    evidence_hash: [u8; 32],
) -> Result<()>;

// 3. Claim Permissionless Refund on Expiry (100% Return)
pub fn claim_refund(
    ctx: Context<ClaimRefund>,
) -> Result<()>;
```

---

## 5. 4-Pillar Quality & Evidence Engine

Every submitted observation passes through our client-side and edge verification pipeline:
1. **Spatial Consistency**: Haversine distance from target coordinates. If distance $\le$ radius, score = 100%; decays linearly beyond threshold.
2. **Freshness & Timeliness**: Computed between capture time and query validity window.
3. **Data Integrity**: SHA-256 digest computed directly over raw binary bytes with duplicate-detection guard.
4. **Visual Relevance**: Non-blocking edge AI analysis assessing clarity and presence of query subjects.

---

## 6. Open Truth REST API for AI Agents

Autonomous agents query ground truth directly via machine-readable JSON:

```bash
# Query live ground truth for a physical location
curl -X GET https://truespot.network/api/v1/queries/4a7f9b2c/answer
```

```json
{
  "protocol": "TrueSpot-v2",
  "query_id": "4a7f9b2c...",
  "status": "RESOLVED",
  "question": "Is the EV charging stall vacant at 500 Howard St?",
  "target_location": { "lat": 37.7891, "lng": -122.3982, "radius_meters": 150 },
  "evidence": {
    "media_url": "https://tiaaposvqjeukiclugmd.supabase.co/storage/v1/object/public/truespot_evidence/...",
    "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "observed_at": "2026-10-10T12:00:00Z",
    "distance_meters": 12.4
  },
  "truth_scorecard": {
    "overall_score": 96,
    "badge": "VERIFIED_ACTIVE",
    "freshness_decay_halflife_minutes": 15
  },
  "settlement": {
    "on_chain_tx": "5wK9rF...",
    "contributor_payout_sol": 0.0975,
    "settled_at": "2026-10-10T12:02:00Z"
  }
}
```

---

## 7. Quickstart & Verification

```bash
# 1. Clone repository
git clone https://github.com/ItsHarshjsin/truespot.git
cd truespot

# 2. Install dependencies
npm install

# 3. Run protocol test suite (PDA derivation, math & fees)
npx tsx tests/protocol-test.ts

# 4. Launch local dev server
npm run dev
```
Visit `http://localhost:5173` to experience TrueSpot V2.
