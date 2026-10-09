use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("TrUEspot11111111111111111111111111111111111");

pub const PROTOCOL_TREASURY: Pubkey = pubkey!("TrUETrEASury1111111111111111111111111111111");
pub const PROTOCOL_FEE_BPS: u64 = 250; // 2.5% Protocol Fee

#[program]
pub mod truespot {
    use super::*;

    pub fn initialize_query(
        ctx: Context<InitializeQuery>,
        query_id: [u8; 16],
        question: String,
        target_lat_e6: i64,
        target_lng_e6: i64,
        radius_meters: u32,
        bounty_lamports: u64,
        duration_seconds: i64,
    ) -> Result<()> {
        let query_account = &mut ctx.accounts.query_account;
        query_account.query_id = query_id;
        query_account.creator = ctx.accounts.creator.key();
        query_account.question = question;
        query_account.target_lat_e6 = target_lat_e6;
        query_account.target_lng_e6 = target_lng_e6;
        query_account.radius_meters = radius_meters;
        query_account.escrow_lamports = bounty_lamports;
        query_account.created_at = Clock::get()?.unix_timestamp;
        query_account.expires_at = query_account.created_at + duration_seconds;
        query_account.is_settled = false;
        query_account.bump = ctx.bumps.query_account;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.query_account.to_account_info(),
                },
            ),
            bounty_lamports,
        )?;

        Ok(())
    }

    pub fn settle_query(
        ctx: Context<SettleQuery>,
        evidence_digest: [u8; 32],
    ) -> Result<()> {
        let query = &mut ctx.accounts.query_account;
        require!(!query.is_settled, TrueSpotError::AlreadySettled);

        let total_escrow = query.escrow_lamports;
        let fee_amount = (total_escrow * PROTOCOL_FEE_BPS) / 10_000;
        let contributor_payout = total_escrow - fee_amount;

        query.is_settled = true;
        query.settled_evidence_digest = evidence_digest;

        // 1. Transfer 2.5% to Protocol Treasury
        **ctx.accounts.query_account.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
        **ctx.accounts.treasury.to_account_info().try_borrow_mut_lamports()? += fee_amount;

        // 2. Transfer 97.5% to Contributor
        **ctx.accounts.query_account.to_account_info().try_borrow_mut_lamports()? -= contributor_payout;
        **ctx.accounts.contributor.to_account_info().try_borrow_mut_lamports()? += contributor_payout;

        Ok(())
    }

    pub fn refund_expired_query(ctx: Context<RefundExpiredQuery>) -> Result<()> {
        let query = &mut ctx.accounts.query_account;
        let clock = Clock::get()?;

        require!(!query.is_settled, TrueSpotError::AlreadySettled);
        require!(clock.unix_timestamp > query.expires_at, TrueSpotError::NotExpired);

        query.is_settled = true;
        let refund_lamports = query.escrow_lamports;

        // 100% refund returned to creator with zero fee deduction
        **ctx.accounts.query_account.to_account_info().try_borrow_mut_lamports()? -= refund_lamports;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += refund_lamports;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(query_id: [u8; 16])]
pub struct InitializeQuery<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 16 + 32 + 256 + 8 + 8 + 4 + 8 + 8 + 8 + 1 + 32 + 1,
        seeds = [b"query", query_id.as_ref()],
        bump
    )]
    pub query_account: Account<'info, QueryEscrowAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleQuery<'info> {
    #[account(
        mut,
        seeds = [b"query", query_account.query_id.as_ref()],
        bump = query_account.bump,
        has_one = creator
    )]
    pub query_account: Account<'info, QueryEscrowAccount>,
    pub creator: Signer<'info>,
    /// CHECK: Protocol treasury account verified against fixed address
    #[account(mut, address = PROTOCOL_TREASURY)]
    pub treasury: AccountInfo<'info>,
    /// CHECK: Contributor recipient account
    #[account(mut)]
    pub contributor: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RefundExpiredQuery<'info> {
    #[account(
        mut,
        seeds = [b"query", query_account.query_id.as_ref()],
        bump = query_account.bump,
        has_one = creator
    )]
    pub query_account: Account<'info, QueryEscrowAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
}

#[account]
pub struct QueryEscrowAccount {
    pub query_id: [u8; 16],
    pub creator: Pubkey,
    pub question: String,
    pub target_lat_e6: i64,
    pub target_lng_e6: i64,
    pub radius_meters: u32,
    pub escrow_lamports: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub is_settled: bool,
    pub settled_evidence_digest: [u8; 32],
    pub bump: u8,
}

#[error_code]
pub enum TrueSpotError {
    #[msg("Query escrow is already settled or refunded.")]
    AlreadySettled,
    #[msg("Query validity window has not expired yet.")]
    NotExpired,
}
