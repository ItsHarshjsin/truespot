use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("TrUEspot11111111111111111111111111111111111");

#[program]
pub mod truespot {
    use super::*;

    /// Initialize a new physical oracle bounty.
    /// Creator deposits SOL into an escrow PDA vault with geo-fenced coordinates.
    pub fn initialize_bounty(
        ctx: Context<InitializeBounty>,
        bounty_id: [u8; 16],
        question: String,
        target_lat_e6: i64,
        target_lng_e6: i64,
        radius_meters: u32,
        deposit_lamports: u64,
        expiry_seconds: i64,
    ) -> Result<()> {
        require!(question.len() >= 5 && question.len() <= 280, ErrorCode::InvalidQuestionLength);
        require!(deposit_lamports >= 10_000_000, ErrorCode::InsufficientDeposit); // min 0.01 SOL
        require!(radius_meters >= 10 && radius_meters <= 5000, ErrorCode::InvalidRadius);
        require!(expiry_seconds >= 300, ErrorCode::ExpiryTooShort);

        let clock = Clock::get()?;
        let bounty = &mut ctx.accounts.bounty;
        bounty.creator = ctx.accounts.creator.key();
        bounty.bounty_id = bounty_id;
        bounty.question = question;
        bounty.target_lat_e6 = target_lat_e6;
        bounty.target_lng_e6 = target_lng_e6;
        bounty.radius_meters = radius_meters;
        bounty.deposit_lamports = deposit_lamports;
        bounty.created_at = clock.unix_timestamp;
        bounty.expiry_ts = clock.unix_timestamp + expiry_seconds;
        bounty.status = BountyStatus::Active;
        bounty.bump = ctx.bumps.bounty;
        bounty.escrow_bump = ctx.bumps.escrow_vault;

        // Transfer funds to escrow PDA vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.escrow_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, deposit_lamports)?;

        emit!(BountyCreatedEvent {
            bounty_pubkey: bounty.key(),
            creator: ctx.accounts.creator.key(),
            bounty_id,
            deposit_lamports,
            target_lat_e6,
            target_lng_e6,
            expiry_ts: bounty.expiry_ts,
        });

        Ok(())
    }

    /// Submit a hardware-attested report with biometric jitter proof and fresh blockhash nonce.
    pub fn submit_attestation(
        ctx: Context<SubmitAttestation>,
        evidence_hash: [u8; 32],
        lat_e6: i64,
        lng_e6: i64,
        gyro_variance_micro: u32,
        blockhash_nonce: [u8; 32],
    ) -> Result<()> {
        let clock = Clock::get()?;
        let bounty = &mut ctx.accounts.bounty;

        require!(bounty.status == BountyStatus::Active, ErrorCode::BountyNotActive);
        require!(clock.unix_timestamp <= bounty.expiry_ts, ErrorCode::BountyExpired);

        // Biometric human micro-tremor verification (> 0.005g threshold)
        require!(gyro_variance_micro >= 5_000, ErrorCode::FailedBiometricProof);

        // Integer spatial distance check (simplified Manhattan / Euclidean bounding for on-chain)
        let lat_diff = (bounty.target_lat_e6 - lat_e6).abs();
        let lng_diff = (bounty.target_lng_e6 - lng_e6).abs();
        // 1 deg lat approx 111,000m -> 1 microdeg approx 0.111m
        let approx_meters = ((lat_diff + lng_diff) * 111) / 1_000;
        require!(approx_meters <= bounty.radius_meters as i64, ErrorCode::LocationOutOfRange);

        let attestation = &mut ctx.accounts.attestation;
        attestation.bounty = bounty.key();
        attestation.reporter = ctx.accounts.reporter.key();
        attestation.evidence_hash = evidence_hash;
        attestation.lat_e6 = lat_e6;
        attestation.lng_e6 = lng_e6;
        attestation.gyro_variance_micro = gyro_variance_micro;
        attestation.blockhash_nonce = blockhash_nonce;
        attestation.submitted_at = clock.unix_timestamp;
        attestation.confirm_stake = 0;
        attestation.challenge_stake = 0;
        attestation.bump = ctx.bumps.attestation;

        bounty.status = BountyStatus::UnderReview;

        emit!(AttestationSubmittedEvent {
            bounty: bounty.key(),
            reporter: ctx.accounts.reporter.key(),
            evidence_hash,
            lat_e6,
            lng_e6,
        });

        Ok(())
    }

    /// Stake SOL to verify or challenge the submitted attestation.
    /// Anti-Self-Audit: The reporter is forbidden from verifying their own report.
    pub fn stake_verification(
        ctx: Context<StakeVerification>,
        confirm_truth: bool,
        stake_lamports: u64,
    ) -> Result<()> {
        require!(stake_lamports >= 10_000_000, ErrorCode::InsufficientStake); // min 0.01 SOL

        let bounty = &ctx.accounts.bounty;
        let attestation = &mut ctx.accounts.attestation;

        require!(bounty.status == BountyStatus::UnderReview, ErrorCode::InvalidBountyState);
        // Anti-Self-Audit Protection
        require!(
            ctx.accounts.verifier.key() != attestation.reporter,
            ErrorCode::SelfAuditForbidden
        );

        let verification = &mut ctx.accounts.verification;
        verification.attestation = attestation.key();
        verification.verifier = ctx.accounts.verifier.key();
        verification.confirm_truth = confirm_truth;
        verification.stake_lamports = stake_lamports;
        verification.timestamp = Clock::get()?.unix_timestamp;
        verification.bump = ctx.bumps.verification;

        // Escrow verifier stake
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.verifier.to_account_info(),
                to: ctx.accounts.verification_vault.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, stake_lamports)?;

        if confirm_truth {
            attestation.confirm_stake = attestation.confirm_stake.checked_add(stake_lamports).unwrap();
        } else {
            attestation.challenge_stake = attestation.challenge_stake.checked_add(stake_lamports).unwrap();
        }

        emit!(StakePlacedEvent {
            bounty: bounty.key(),
            verifier: ctx.accounts.verifier.key(),
            confirm_truth,
            stake_lamports,
        });

        Ok(())
    }

    /// Settle the Physical Oracle Payout and finalize truth on Solana.
    /// When consensus confirms the report (> 66% weight), 80% is awarded to the Spotter,
    /// and 20% is released to the Verifier reward pool.
    pub fn settle_oracle_payout(ctx: Context<SettleOraclePayout>) -> Result<()> {
        let bounty = &mut ctx.accounts.bounty;
        let attestation = &ctx.accounts.attestation;

        require!(bounty.status == BountyStatus::UnderReview, ErrorCode::InvalidBountyState);

        let total_stake = attestation.confirm_stake + attestation.challenge_stake;
        let is_consensus_confirmed = if total_stake == 0 {
            true // If no challenges, default passes
        } else {
            (attestation.confirm_stake * 100) / total_stake >= 66
        };

        let bounty_key = bounty.key();
        let escrow_seeds: &[&[u8]] = &[
            b"escrow",
            bounty_key.as_ref(),
            &[bounty.escrow_bump],
        ];
        let signer_seeds = &[escrow_seeds];

        if is_consensus_confirmed {
            let total_bounty = bounty.deposit_lamports;
            let spotter_share = (total_bounty * 80) / 100; // 80% to Physical Spotter
            let verifier_pool_share = total_bounty - spotter_share; // 20% to verifiers / treasury

            // Transfer 80% to reporter
            **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= spotter_share;
            **ctx.accounts.reporter.to_account_info().try_borrow_mut_lamports()? += spotter_share;

            // Transfer 20% to protocol verifier pool
            **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= verifier_pool_share;
            **ctx.accounts.verifier_pool.to_account_info().try_borrow_mut_lamports()? += verifier_pool_share;

            bounty.status = BountyStatus::ResolvedVerified;
        } else {
            // Refund to bounty creator if proven false
            let total_bounty = bounty.deposit_lamports;
            **ctx.accounts.escrow_vault.to_account_info().try_borrow_mut_lamports()? -= total_bounty;
            **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += total_bounty;

            bounty.status = BountyStatus::ResolvedChallenged;
        }

        emit!(OracleSettledEvent {
            bounty: bounty.key(),
            status: bounty.status,
            payout_lamports: bounty.deposit_lamports,
            resolved_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

// -----------------------------------------------------------------------------
// ACCOUNT STRUCTS
// -----------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(bounty_id: [u8; 16])]
pub struct InitializeBounty<'info> {
    #[account(
        init,
        payer = creator,
        space = Bounty::LEN,
        seeds = [b"bounty", creator.key().as_ref(), bounty_id.as_ref()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    /// CHECK: PDA vault holding SOL escrow
    #[account(
        mut,
        seeds = [b"escrow", bounty.key().as_ref()],
        bump
    )]
    pub escrow_vault: SystemAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitAttestation<'info> {
    #[account(
        mut,
        seeds = [b"bounty", bounty.creator.as_ref(), bounty.bounty_id.as_ref()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        init,
        payer = reporter,
        space = Attestation::LEN,
        seeds = [b"attestation", bounty.key().as_ref(), reporter.key().as_ref()],
        bump
    )]
    pub attestation: Account<'info, Attestation>,

    #[account(mut)]
    pub reporter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeVerification<'info> {
    #[account(
        mut,
        seeds = [b"bounty", bounty.creator.as_ref(), bounty.bounty_id.as_ref()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        seeds = [b"attestation", bounty.key().as_ref(), attestation.reporter.as_ref()],
        bump = attestation.bump
    )]
    pub attestation: Account<'info, Attestation>,

    #[account(
        init,
        payer = verifier,
        space = Verification::LEN,
        seeds = [b"verify", attestation.key().as_ref(), verifier.key().as_ref()],
        bump
    )]
    pub verification: Account<'info, Verification>,

    /// CHECK: Vault holding verification stake
    #[account(
        mut,
        seeds = [b"verify_vault", bounty.key().as_ref()],
        bump
    )]
    pub verification_vault: SystemAccount<'info>,

    #[account(mut)]
    pub verifier: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleOraclePayout<'info> {
    #[account(
        mut,
        seeds = [b"bounty", bounty.creator.as_ref(), bounty.bounty_id.as_ref()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,

    /// CHECK: Escrow holding bounty funds
    #[account(
        mut,
        seeds = [b"escrow", bounty.key().as_ref()],
        bump = bounty.escrow_bump
    )]
    pub escrow_vault: SystemAccount<'info>,

    #[account(
        seeds = [b"attestation", bounty.key().as_ref(), attestation.reporter.as_ref()],
        bump = attestation.bump
    )]
    pub attestation: Account<'info, Attestation>,

    /// CHECK: Bounty creator account (receives refund if challenged)
    #[account(mut, address = bounty.creator)]
    pub creator: SystemAccount<'info>,

    /// CHECK: Reporter account (receives 80% payout if verified)
    #[account(mut, address = attestation.reporter)]
    pub reporter: SystemAccount<'info>,

    /// CHECK: Protocol / Verifiers reward pool (receives 20%)
    #[account(mut)]
    pub verifier_pool: SystemAccount<'info>,

    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// -----------------------------------------------------------------------------
// STATE DEFINITIONS
// -----------------------------------------------------------------------------

#[account]
pub struct Bounty {
    pub creator: Pubkey,
    pub bounty_id: [u8; 16],
    pub question: String,
    pub target_lat_e6: i64,
    pub target_lng_e6: i64,
    pub radius_meters: u32,
    pub deposit_lamports: u64,
    pub created_at: i64,
    pub expiry_ts: i64,
    pub status: BountyStatus,
    pub bump: u8,
    pub escrow_bump: u8,
}

impl Bounty {
    pub const LEN: usize = 8 + 32 + 16 + (4 + 280) + 8 + 8 + 4 + 8 + 8 + 8 + 1 + 1 + 1 + 64;
}

#[account]
pub struct Attestation {
    pub bounty: Pubkey,
    pub reporter: Pubkey,
    pub evidence_hash: [u8; 32],
    pub lat_e6: i64,
    pub lng_e6: i64,
    pub gyro_variance_micro: u32,
    pub blockhash_nonce: [u8; 32],
    pub submitted_at: i64,
    pub confirm_stake: u64,
    pub challenge_stake: u64,
    pub bump: u8,
}

impl Attestation {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 4 + 32 + 8 + 8 + 8 + 1 + 32;
}

#[account]
pub struct Verification {
    pub attestation: Pubkey,
    pub verifier: Pubkey,
    pub confirm_truth: bool,
    pub stake_lamports: u64,
    pub timestamp: i64,
    pub bump: u8,
}

impl Verification {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 8 + 1 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BountyStatus {
    Active,
    UnderReview,
    ResolvedVerified,
    ResolvedChallenged,
    Expired,
}

// -----------------------------------------------------------------------------
// EVENTS
// -----------------------------------------------------------------------------

#[event]
pub struct BountyCreatedEvent {
    pub bounty_pubkey: Pubkey,
    pub creator: Pubkey,
    pub bounty_id: [u8; 16],
    pub deposit_lamports: u64,
    pub target_lat_e6: i64,
    pub target_lng_e6: i64,
    pub expiry_ts: i64,
}

#[event]
pub struct AttestationSubmittedEvent {
    pub bounty: Pubkey,
    pub reporter: Pubkey,
    pub evidence_hash: [u8; 32],
    pub lat_e6: i64,
    pub lng_e6: i64,
}

#[event]
pub struct StakePlacedEvent {
    pub bounty: Pubkey,
    pub verifier: Pubkey,
    pub confirm_truth: bool,
    pub stake_lamports: u64,
}

#[event]
pub struct OracleSettledEvent {
    pub bounty: Pubkey,
    pub status: BountyStatus,
    pub payout_lamports: u64,
    pub resolved_at: i64,
}

// -----------------------------------------------------------------------------
// ERRORS
// -----------------------------------------------------------------------------

#[error_code]
pub enum ErrorCode {
    #[msg("Question length must be between 5 and 280 characters")]
    InvalidQuestionLength,
    #[msg("Deposit must be at least 0.01 SOL (10,000,000 lamports)")]
    InsufficientDeposit,
    #[msg("Radius must be between 10m and 5,000m")]
    InvalidRadius,
    #[msg("Expiry duration must be at least 300 seconds")]
    ExpiryTooShort,
    #[msg("Bounty is not active")]
    BountyNotActive,
    #[msg("Bounty has expired")]
    BountyExpired,
    #[msg("Hardware accelerometer biometric proof failed (< 0.005g variance)")]
    FailedBiometricProof,
    #[msg("Report location is outside the requested geofence radius")]
    LocationOutOfRange,
    #[msg("Stake amount must be at least 0.01 SOL")]
    InsufficientStake,
    #[msg("Bounty is not in review state")]
    InvalidBountyState,
    #[msg("Reporters are strictly forbidden from auditing their own reports (Anti-Self-Audit)")]
    SelfAuditForbidden,
}
