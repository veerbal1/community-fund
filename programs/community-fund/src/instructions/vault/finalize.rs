use anchor_lang::prelude::*;
use crate::state::{Proposal, ProposalStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(proposal_id: u64, owner: Pubkey)]
pub struct FinalizeProposal<'info> {
    #[account(
        mut,
        seeds = [b"proposal", owner.as_ref(), proposal_id.to_be_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,

    /// Anyone can call this function
    #[account(mut)]
    pub caller: Signer<'info>,
}

pub fn finalize_proposal(
    ctx: Context<FinalizeProposal>,
    _proposal_id: u64,
    _owner: Pubkey,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let current_time = Clock::get()?.unix_timestamp;

    // Check 1: Voting deadline must be over (7 days = 604800 seconds)
    let voting_deadline = proposal.created_at + 604800;
    require!(
        current_time >= voting_deadline,
        ErrorCode::VotingStillActive
    );

    // Check 2: Not already finalized
    require!(
        proposal.status == ProposalStatus::Pending,
        ErrorCode::AlreadyFinalized
    );

    // Check 3: Minimum vote threshold (let's say 100 votes minimum)
    const MIN_VOTES: u64 = 100;

    if proposal.vote_count >= MIN_VOTES {
        proposal.status = ProposalStatus::Finalized;
        proposal.finalized_at = current_time;
        msg!("Proposal finalized with {} votes", proposal.vote_count);
    } else {
        proposal.status = ProposalStatus::Rejected;
        proposal.finalized_at = current_time;
        msg!("Proposal rejected - insufficient votes ({}/{})", proposal.vote_count, MIN_VOTES);
    }

    Ok(())
}
