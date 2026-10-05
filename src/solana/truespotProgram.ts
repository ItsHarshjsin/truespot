import { PublicKey } from '@solana/web3.js';

export const TRUESPOT_PROGRAM_ID = new PublicKey('TrUEspot11111111111111111111111111111111111');

/**
 * Derive PDA for a Bounty
 */
export function getBountyPDA(creator: PublicKey, bountyIdBytes: Uint8Array): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), creator.toBuffer(), Buffer.from(bountyIdBytes)],
    TRUESPOT_PROGRAM_ID
  );
}

/**
 * Derive Escrow Vault PDA for a Bounty
 */
export function getEscrowVaultPDA(bountyPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), bountyPubkey.toBuffer()],
    TRUESPOT_PROGRAM_ID
  );
}

/**
 * Derive PDA for an Attestation
 */
export function getAttestationPDA(bountyPubkey: PublicKey, reporter: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('attestation'), bountyPubkey.toBuffer(), reporter.toBuffer()],
    TRUESPOT_PROGRAM_ID
  );
}

/**
 * Derive PDA for a Verification Stake
 */
export function getVerificationPDA(attestationPubkey: PublicKey, verifier: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('verify'), attestationPubkey.toBuffer(), verifier.toBuffer()],
    TRUESPOT_PROGRAM_ID
  );
}

/**
 * Code snippets for External Developers & DeFi Protocols consuming TrueSpot
 */
export const CONSUMER_INTEGRATION_CODE = {
  rustCpi: `// Cross-Program Invocation (CPI) in Anchor
use anchor_lang::prelude::*;
use truespot::cpi::accounts::ReadOracleState;
use truespot::program::Truespot;

#[derive(Accounts)]
pub struct ConsumePhysicalTruth<'info> {
    pub truespot_program: Program<'info, Truespot>,
    /// CHECK: Target TrueSpot Bounty PDA
    pub bounty_oracle: AccountInfo<'info>,
}

pub fn execute_with_physical_oracle(ctx: Context<ConsumePhysicalTruth>) -> Result<()> {
    // Verify physical state directly from TrueSpot on Solana Devnet
    let oracle_data = &ctx.accounts.bounty_oracle.try_borrow_data()?;
    let status_byte = oracle_data[8 + 32 + 16 + 284 + 8 + 8 + 4 + 8 + 8 + 8]; // Status enum offset
    
    // Status 2 == ResolvedVerified (Quorum consensus attained)
    require!(status_byte == 2, ErrorCode::PhysicalConditionUnmet);
    
    msg!("Physical condition verified! Triggering automated DeFi payout.");
    Ok(())
}`,
  typeScriptSdk: `import { Connection, PublicKey } from '@solana/web3.js';
import { getBountyPDA, TRUESPOT_PROGRAM_ID } from '@truespot/sdk';

const connection = new Connection('https://api.devnet.solana.com');
const bountyPda = new PublicKey('...');

// Fetch raw on-chain state
const accountInfo = await connection.getAccountInfo(bountyPda);
if (accountInfo) {
  console.log('Bounty Escrow Verified On-Chain:', accountInfo.lamports / 1e9, 'SOL');
}`,
  restApi: `// Fetch real-time physical truth via TrueSpot REST Gateway
const response = await fetch('https://tiaaposvqjeukiclugmd.supabase.co/rest/v1/bounties?select=*&status=eq.resolved', {
  headers: {
    'apikey': 'YOUR_ANON_KEY',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
});
const verifiedEvents = await response.json();
console.log('Verified physical spots:', verifiedEvents);`
};
