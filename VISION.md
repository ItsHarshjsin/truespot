---
status: active
project: saas
type: plan
created: 2026-10-05
updated: 2026-10-05
---

# TrueSpot — Complete Vision & 10/10 Build Specification

---

## The Core Concept (One Paragraph)

**The internet knows where everything is, but not what's happening right now.** AI can search, but it can't stand there and look. TrueSpot pays real people to be the sensor: anyone nearby verifies reality live with GPS-timestamped evidence, no gatekeeper, no signup. Independent reports agree, Solana pays instantly, and answers stay open as freshness-scored data anyone can host, query, or build on for apps and AI agents — instead of dying in a chat.

---

## The Complete Loop (How It Works)

```
Ask → Bounty (USDC) → Nearby phones see it → 
Live camera + GPS + timestamp + structured answer → 
SHA-256 fingerprint → Second phone blind-verifies → 
Consensus + freshness score → State page lives until decay → 
API/feed for anyone to query → Auto-refresh when stale
```

---

## The 5 Core Screens (MVP)

1. **Ask** — Question picker (Open/Stock/Queue/Custom) + preset place + USDC bounty + expiry
2. **Nearby** — 200m radius feed sorted by distance, shows bounty, question, distance
3. **Report** — Live camera only (no gallery), auto GPS/time, structured answer, SHA-256 fingerprint
4. **Verify** — Blind agree/disagree on someone else's evidence
5. **State** — Live answer, agree count, minutes ago, confidence score, TEST payout receipt

---

## The Data Layer (What Persists)

Every verified observation becomes a **freshness-scored data point**:
- `place_id` + `question_type` + `answer` + `confidence` + `observed_at` + `fingerprint`
- **Freshness decay**: 100% at 0 min → 0% at 60 min (configurable per question type)
- **Confidence** = agreement_ratio × freshness_factor × reporter_trust
- **Anyone can query**: `GET /v1/places/{place_id}/truth?question_type=stock&min_confidence=80`
- **Anyone can host**: Open dataset, anyone can mirror, index, or serve it
- **Anyone can build**: Apps, AI agents, dashboards, analytics on top

---

## Question Types (Standardized for Analysis)

| Type | Freshness Half-Life | Answer Schema | Use Cases |
|------|---------------------|---------------|-----------|
| `queue` | 10 min | `{count: number}` | Cafeteria, DMV, club, pharmacy |
| `stock` | 30 min | `{item_id, available: boolean, quantity?}` | Pharmacy, grocery, electronics, sneakers |
| `open` | 60 min | `{open: boolean, hours?}` | Shops, offices, govt offices, ATMs |
| `road` | 15 min | `{blocked: boolean, reason?}` | Flood, landslide, accident, construction |
| `charger` | 10 min | `{free: boolean, power_kw?}` | EV chargers, phone charging stations |
| `transit` | 5 min | `{arrived: boolean, delay_min?}` | Bus, train, ferry, rideshare |
| `custom` | configurable | free-form JSON | Anything else |

---

## The Open Data Layer (Anyone Can Host/Query/Build)

### Protocol-Level Openness
- **Dataset schema is public** (JSON Schema published)
- **Fingerprints are verifiable** (anyone can recompute SHA-256 from photo+metadata)
- **Freshness logic is deterministic** (published algorithm, anyone can recompute)
- **No API keys required** for read access
- **Dataset mirrors encouraged** (IPFS, Arweave, Filecoin, S3, any cloud)

### Query Examples (Anyone Can Run)
```bash
# All pharmacies within 2km with medicine X in stock, confidence > 80%
curl "https://api.truespot.io/v1/places?type=pharmacy&radius=2000&q=stock&item=ibuprofen&min_conf=80"

# Real-time queue feed for a mall
curl "https://api.truespot.io/v1/places/place_mall_123/truth?type=queue"

# Road status for logistics routing
curl "https://api.truespot.io/v1/corridors/highway_101/truth?type=road"
```

### Build-On Examples
- **Delivery apps**: Route around blocked roads, skip stores with stockouts
- **EV apps**: Show only free chargers right now
- **Transit apps**: Real bus arrival vs schedule
- **AI agents**: "Find me an open pharmacy with amoxicillin within 1km" → agent queries TrueSpot, gets answer
- **City dashboards**: Real-time road/flood status for emergency ops
- **Retail analytics**: Competitor stock/queue monitoring at scale

---

## Who Uses This (Beyond AI Agents)

### 1. **Logistics & Delivery** ($400B+ market)
- **Last-mile routing**: Skip blocked roads, avoid stores with stockouts, route to free EV chargers
- **Proof of delivery**: Customer verifies package at door with photo + GPS + timestamp
- **Warehouse yard management**: Truck queue times, dock availability, trailer locations

### 2. **Retail & FMCG** ($10T+ market)
- **Shelf audits at scale**: 100,000 stores checked weekly for $0.50 each vs $20/mystery shop
- **Competitor pricing**: Real-time price monitoring across cities
- **Promotional compliance**: Is the end-cap display actually up? Photo proof.
- **Stockout alerts**: Manufacturer knows instantly when SKU hits zero at key accounts

### 3. **Real Estate & Property** ($300B+ market)
- **Construction progress**: Daily photo verification of milestone completion
- **Property condition**: Remote inspection of 10,000 units/year per inspector
- **Occupancy verification**: Is the unit actually vacant? Photo + GPS proof

### 4. **Insurance & Claims** ($1T+ market)
- **Auto claims**: Damage photo + GPS + timestamp = instant verification
- **Property claims**: Flood/fire/wind damage verified by 3 nearby phones in 10 minutes
- **Crop insurance**: Satellite + ground truth photos for yield validation

### 5. **Government & Public Sector**
- **Infrastructure**: Pothole, streetlight, bridge condition reported by citizens
- **Emergency response**: Flood extent, road clearance, shelter capacity in real-time
- **Permit compliance**: Construction site actually following approved plans?

### 6. **Events & Venue Operations**
- **Crowd management**: Queue times at entry, restroom, concessions, merch
- **Safety**: Overcrowding alerts, exit blockage, medical incidents
- **Vendor compliance**: Food safety, license display, capacity limits

### 7. **EV & Energy Infrastructure**
- **Charger reliability**: Real uptime data for 100,000+ chargers
- **Grid monitoring**: Transformer status, outage verification, solar farm output
- **Demand response**: Real-time EV charging demand signals

### 8. **Agriculture & Supply Chain**
- **Crop health**: Field-level disease/pest reports from farmers/agents
- **Cold chain**: Temperature verification at every handoff (photo of thermometer + GPS)
- **Harvest timing**: Field readiness verified by drone/ground photos

### 9. **Physical AI / Robotics** (The Emerging Giant)
- **Sim-to-real gap**: Robots need ground truth — "Is the door actually open? Is the pallet there?"
- **Training data**: Millions of labeled real-world states for vision models
- **Teleoperation verification**: Human operator confirms robot completed task
- **Digital twins**: Real-time physical state sync for factory/warehouse/city twins

### 10. **Marketing & OOH Attribution**
- **Billboard verification**: Is the creative actually up? Lit at night? Vandalized?
- **Experiential events**: Foot traffic, queue times, engagement at pop-ups
- **Store visit attribution**: Did the ad actually drive foot traffic? Verified check-ins.

---

## The "Campaigns" Layer (Business-Grade Tooling)

### Campaign Builder (No-Code)
- Define: question set, geographic polygon, quota per location, budget
- Launch: 10,000 bounties across 50 cities in 3 clicks
- Monitor: Real-time dashboard — completion rate, confidence heatmap, cost per answer
- Export: CSV, API, webhook to internal systems

### Campaign Templates (Pre-Built)
| Template | Use Case | Typical Budget |
|----------|----------|----------------|
| Pharmacy stock audit | Pharma manufacturer | $5K–$50K/week |
| EV charger uptime | Network operator | $2K–$20K/month |
| Road condition mapping | Logistics/DOT | $10K–$100K/event |
| Billboard verification | Media agency | $5K–$25K/campaign |
| Construction progress | Developer/GC | $20K–$200K/project |
| Crop health monitoring | Agri-insurance | $1K–$10K/season |

---

## The Physical AI Vision Layer (Next 2–3 Years)

### What Physical AI Needs That Doesn't Exist
| Need | Current State | TrueSpot Provides |
|------|---------------|-------------------|
| "Is the loading dock door open?" | Robot tries, fails, retries | Verified open/closed in 30 sec |
| "Where is the empty pallet?" | Vision model guesses | Human-verified location + photo |
| "Is the conveyor jammed?" | Sensor says yes/no | Human confirms + photo of jam |
| "Did the robot place it correctly?" | Force sensor only | Human verifies placement photo |
| "Is the safety gate closed?" | Binary sensor (lies often) | Photo + GPS + timestamp proof |

### The Data Flywheel
```
Robots need ground truth → TrueSpot pays humans for it →
Millions of labeled states → Better vision models →
Robots work better → More robots deployed →
More edge cases need verification → More TrueSpot demand
```

### Revenue at Scale (Physical AI)
- **Per-robot subscription**: $50–$200/month for verified reality API
- **Per-query**: $0.01–$0.10 per verification call
- **Dataset licensing**: $10K–$1M/year for training datasets
- **TAM**: 10M robots by 2030 × $100/mo = $12B/year

---

## The "Anyone Can Host" Architecture

### Decentralized Indexer Network
- **Anyone runs an indexer**: Ingests TrueSpot events, builds local query engine
- **Incentive**: Query fees (tiny) + token rewards (if token exists)
- **Consensus**: Multiple indexers serve same query, client compares results
- **No central API bottleneck**: Client queries 3 indexers, takes majority

### Data Availability
- **Raw events**: On-chain (Solana) or via data availability layer (Celestia, EigenDA)
- **Photos**: IPFS/Filecoin/Arweave with content-addressed CIDs
- **Fingerprints**: On-chain (tiny) or in DA layer
- **State roots**: Merkle roots of dataset state posted periodically

### Client-Side Verification (Zero Trust)
- Client downloads: answer + fingerprint + photo CID + verifier signatures
- Client verifies: hash matches, signatures valid, freshness acceptable
- **No trusted server required** — anyone can run a light client

---

## 10/10 Build Checklist (Everything Needed)

### Phase 1: Hackathon MVP (Week 1)
- [ ] Ask / Nearby / Report / Verify / State screens
- [ ] Supabase + PostGIS + Storage
- [ ] Phantom wallet (devnet) + mock USDC ledger
- [ ] SHA-256 fingerprinting + live camera + GPS
- [ ] Double-match verify + state page + mock payout
- [ ] 60-second demo video + 50 test answers

### Phase 2: Open Data Layer (Week 2–4)
- [ ] Public REST API (read-only, no auth)
- [ ] JSON Schema for all data types
- [ ] Freshness/reconfidence recomputation service
- [ ] IPFS/Filecoin photo pinning pipeline
- [ ] Dataset mirrors (IPFS, S3, Arweave)
- [ ] Client SDK (TypeScript, Python, Rust)

### Phase 3: Campaigns & Business (Month 2)
- [ ] Campaign builder UI (polygon draw, budget, quota)
- [ ] Real-time dashboard (heatmap, completion, cost)
- [ ] Webhook + CSV export + API keys for businesses
- [ ] Team workspaces + billing (USDC on Solana mainnet)

### Phase 4: Physical AI Integration (Month 3+)
- [ ] Robotics SDK (ROS2, ROS1, ISAAC ROS plugins)
- [ ] Vision model training pipeline (export to YOLO/COCO format)
- [ ] Digital twin sync (ROS topic ↔ TrueSpot state)
- [ ] Teleop verification workflow (human-in-the-loop)

### Phase 5: Decentralized Infrastructure (Month 6+)
- [ ] Indexer network spec + reference implementation
- [ ] DA layer integration (Celestia/EigenDA)
- [ ] Incentive mechanism for indexers
- [ ] Light client + ZK proofs for mobile

---

## The One-Liner for Each Audience

| Audience | Pitch |
|----------|-------|
| **Hackathon Judge** | "Live place truth on Solana — bounty → verify → reusable data layer" |
| **Investor** | "The physical oracle layer for AI, logistics, retail — $100B+ TAM" |
| **Business (Retail)** | "Check 10,000 stores for stock tomorrow for $5K, not $200K" |
| **Business (Logistics)** | "Real-time road + charger + queue data for routing, no sensors needed" |
| **AI/Robotics** | "Ground truth API for physical world — sim-to-real gap closed" |
| **Government** | "Citizen-verified infrastructure at 1/100th the cost of sensors" |
| **Developer** | "One API for every live place fact — open, fresh, queryable" |
| **Citizen** | "Earn USDC verifying your neighborhood, data stays open forever" |

---

## The North Star Metric

**Fresh Verified Observations Per Day (FVOPD)**

- Week 1: 50 (campus pilot)
- Month 1: 5,000 (3 campuses + 1 market street)
- Month 3: 50,000 (10 cities, first business campaigns)
- Month 6: 500,000 (open network, indexers running, AI agents querying)
- Year 1: 5,000,000 (physical AI integration, global coverage)

---

## Why This Wins (Summary)

1. **Uncontested lane**: No one combines bounty + verification + open data layer + freshness scoring
2. **Right timing**: Physical AI explosion + Solana micropayments + consumer camera ubiquity
3. **Network effects**: More answers → better data → more buyers → higher bounties → more reporters
4. **Defensible**: Dataset + fingerprinting + trust scores + indexer network = compounding moat
5. **Mission**: "The internet's eyes and ears, owned by everyone" — recruits missionaries, not mercenaries

---

**Bottom line, sir**: This isn't a campus app. It's the **physical oracle layer for the internet**. The hackathon MVP proves the loop; the 5-year build makes it infrastructure. Every line of code from Day 1 should serve the 10/10 vision.