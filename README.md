# TrueSpot — Real-Time DePIN Physical Oracle on Solana
> **Colosseum Solana Hackathon Build | DePIN & Consumer Track**

TrueSpot is a peer-to-peer physical oracle and live place-truth bounty board powered by Solana Devnet micro-escrows and hardware cryptographic attestation.

---

## 1. The Problem: Physical Truth is Stale
Digital information about the physical world is frequently delayed, hallucinated, or fabricated:
- *"Is the EV supercharger station fully occupied or free right now?"*
- *"Is the coffee shop queue out the door?"*
- *"Is the store actually open or closed for renovation?"*

Centralized data feeds (Google Maps, Yelp) suffer from multi-hour or multi-day latency. 

---

## 2. The Solution: Solana-Powered Physical Oracle
TrueSpot bridges on-chain capital with off-chain physical truth:
1. **Asker Locks Escrow:** Asker posts a localized question and deposits micro-bounties in SOL on Solana Devnet.
2. **200-Meter Geofenced Radar:** Mobile spotters within a strict 200m radius discover the bounty.
3. **Hardware-Attested Evidence:** The reporter captures live camera evidence with:
   - Involuntary hand-tremor accelerometer analysis ($\sigma^2$ variance to identify real human hands vs. bots/emulators).
   - Live Solana Devnet `recentBlockhash` stamped onto the frame as a physical nonce.
   - SHA-256 multi-factor fingerprint of the image bytes, GPS coordinates, and timestamp.
   - On-chain proof anchored via the **Solana SPL Memo Program** (`MemoSq4gq...`).
4. **Staked Schelling-Point Verification:** Independent decentralized verifiers stake 0.01 SOL to audit the report. Consensus voters split 20% of the bounty; fraudsters are slashed.
5. **Instant Micro-Settlement:** Automated payout releases funds (80% to reporter, 20% to verifiers) with verifiable receipts on Solscan.

---

## 3. Judge 60-Second Quick-Flight Walkthrough
To make evaluation effortless for Colosseum judges anywhere in the world, TrueSpot includes the **Judge Flight Deck**:

1. **Top Bar — Judge Flight Deck:**
   - Location is pre-set to `Colosseum Solana Hackathon Venue (SF)`.
   - Click **"+1 Devnet SOL"** to airdrop test funds directly to your Phantom/Solflare wallet.
2. **Screen 1 — Radar 200m:**
   - Observe the live circular sonar radar scanner showing nearby open bounties within the 200m geofence.
   - Click on the active venue bounty.
3. **Screen 2 — Report (Hardware Attestation):**
   - Click **"DESKTOP/JUDGE QUICK-CAPTURE"** (or use mobile camera).
   - Review live accelerometer tremor variance, Devnet blockhash nonce, and the 64-character SHA-256 fingerprint.
   - Click **"SUBMIT EVIDENCE & CLAIM BOUNTY"** to anchor proof to Solana Devnet.
4. **Screen 3 — Verify (Staked Schelling Consensus):**
   - Click **"AGREE (TRUTH)"** to stake 0.01 SOL and vote with consensus.
5. **Screen 4 — State & Settlement:**
   - Watch the dynamic confidence decay score calculate in real time.
   - Click **"EXECUTE PAYOUT"** to trigger the Devnet escrow settlement and view the Solscan receipt!

---

## 4. Architecture & Technical Stack

```
           MOBILE REPORTER                        SOLANA DEVNET & STORAGE
   ┌─────────────────────────────┐               ┌───────────────────────┐
   │ Real Hardware Camera View   │               │ Devnet Escrow Vault   │
   │ Micro-Tremor Gyro Jitter    │               │ SPL Memo (Evidence)   │
   │ GPS + Solar Azimuth Check   │               │ Phantom / Solflare    │
   └──────────────┬──────────────┘               └───────────┬───────────┘
                  │                                          │
                  ▼                                          ▼
   ┌─────────────────────────────┐               ┌───────────────────────┐
   │ Ed25519 Wallet Signature    │ ────────────► │ PostGIS Spatial DB    │
   │ SHA-256 Multi-Sensor Hash   │               │ Schelling Staking Pool│
   └─────────────────────────────┘               └───────────────────────┘
```

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS (Tactical Cyber-DePIN theme), Lucide Icons.
- **Web3 Layer:** `@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`.
- **Escrow Vault:** `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM` on Solana Devnet.
- **SPL Memo Program:** `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`.
- **Database & Spatial Engine:** PostgreSQL + PostGIS (`ST_DWithin` 200m radius queries) with a zero-fail reactive hybrid fallback.

---

## 5. Local Setup & Verification

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open in browser
http://localhost:5173
```
