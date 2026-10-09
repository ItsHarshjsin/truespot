import { PublicKey } from '@solana/web3.js';

export const TRUESPOT_PROGRAM_ID = new PublicKey('TrUEspot11111111111111111111111111111111111');
export const PROTOCOL_TREASURY = new PublicKey('TrUETrEASury1111111111111111111111111111111');
export const PROTOCOL_FEE_BPS = 250; // 2.5% Protocol Fee

/**
 * Derive PDA for a Query Escrow:
 * seeds = [b"query", query_id.as_ref()]
 */
export function getQueryPDA(queryIdBytes: Uint8Array | number[]): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('query'), Buffer.from(queryIdBytes)],
    TRUESPOT_PROGRAM_ID
  );
}

/**
 * Convert UUID or string hex into a 16-byte array for Anchor instruction
 */
export function stringToQueryIdBytes(queryIdHex: string): Uint8Array {
  const cleaned = queryIdHex.replace(/-/g, '').padEnd(32, '0').slice(0, 32);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16) || 0;
  }
  return bytes;
}

/**
 * Backward-compatible helper for legacy references
 */
export function getBountyPDA(_creator: PublicKey, bountyIdBytes: Uint8Array): [PublicKey, number] {
  return getQueryPDA(bountyIdBytes);
}

/**
 * Developer snippets for external AI agents, prediction markets, and Anchor programs
 */
export const CONSUMER_INTEGRATION_CODE = {
  rustCpi: `// Anchor CPI to verify TrueSpot Physical Oracle Ground Truth
use anchor_lang::prelude::*;
use truespot::program::Truespot;
use truespot::QueryEscrowAccount;

#[derive(Accounts)]
pub struct ConsumeGroundTruth<'info> {
    pub truespot_program: Program<'info, Truespot>,
    #[account(
        seeds = [b"query", query_account.query_id.as_ref()],
        seeds::program = truespot_program.key()
    )]
    pub query_account: Account<'info, QueryEscrowAccount>,
}

pub fn execute_with_physical_oracle(ctx: Context<ConsumeGroundTruth>) -> Result<()> {
    let query = &ctx.accounts.query_account;
    
    // Assert physical condition is verified and settled on Solana Devnet
    require!(query.is_settled, ErrorCode::ObservationPending);
    require!(query.settled_evidence_digest != [0u8; 32], ErrorCode::InvalidEvidence);
    
    msg!("Physical reality verified on-chain! Settled digest: {:?}", query.settled_evidence_digest);
    Ok(())
}`,

  typeScriptSdk: `// Autonomous Agent Consumption via @solana/web3.js
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TRUESPOT_PROGRAM_ID = new PublicKey('TrUEspot11111111111111111111111111111111111');

// Derive deterministic Query PDA
const queryIdBytes = Buffer.from('9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d', 'hex');
const [queryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('query'), queryIdBytes],
  TRUESPOT_PROGRAM_ID
);

const accountInfo = await connection.getAccountInfo(queryPda);
console.log('TrueSpot Escrow Verified:', accountInfo ? 'ACTIVE/SETTLED' : 'NOT_FOUND');`,

  restApi: `// Fetch TrueSpot 2.0.0 Open Answer Endpoint
const response = await fetch('https://truespot.network/api/v1/queries/9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d/answer');
const oraclePayload = await response.json();

if (oraclePayload.answer.status === 'RESOLVED') {
  console.log('Ground truth confidence:', oraclePayload.answer.confidence_score);
  console.log('Settlement transaction:', oraclePayload.settlement.settlement_tx);
}`
};
