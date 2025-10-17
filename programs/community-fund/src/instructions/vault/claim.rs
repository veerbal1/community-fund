use anchor_lang::prelude::*;
use crate::state::{Proposal, ProposalStatus, Vault};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct ClaimFunds<'info> {
    #[account(
        mut,
        seeds = [b"proposal", owner.key().as_ref(), proposal_id.to_be_bytes().as_ref()],
        bump = proposal.bump,
        has_one = owner
    )]
    pub proposal: Account<'info, Proposal>,

    /// Proposal owner who will receive funds
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, seeds = [b"vault"], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

pub fn claim_funds(
    ctx: Context<ClaimFunds>,
    _proposal_id: u64,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;

    // Check 1: Proposal must be finalized (passed voting)
    require!(
        proposal.status == ProposalStatus::Finalized,
        ErrorCode::NotApproved
    );

    // Check 2: Vault has enough balance
    let vault = &ctx.accounts.vault;
    let vault_balance = vault.to_account_info().lamports();

    require!(
        vault_balance >= proposal.amount_requested,
        ErrorCode::InsufficientVaultBalance
    );

    // Transfer SOL from vault to owner
    **vault.to_account_info().try_borrow_mut_lamports()? -= proposal.amount_requested;
    **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += proposal.amount_requested;

    // Update state
    proposal.status = ProposalStatus::Claimed;
    let vault_mut = &mut ctx.accounts.vault;
    vault_mut.total_claimed += proposal.amount_requested;

    msg!("Claimed {} lamports from vault", proposal.amount_requested);
    Ok(())
}
