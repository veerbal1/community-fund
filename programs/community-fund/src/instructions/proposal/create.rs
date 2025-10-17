use anchor_lang::prelude::*;
use crate::state::{Proposal, ProposalStatus, UserProfile};

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        init,
        seeds = [
            b"proposal",
            user.key().as_ref(),
            user_profile.proposal_count.to_be_bytes().as_ref()
        ],
        bump,
        payer = user,
        space = 8 + Proposal::INIT_SPACE
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_proposal(
    ctx: Context<CreateProposal>,
    title: String,
    description: String,
    amount_requested: u64,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    proposal.id = ctx.accounts.user_profile.proposal_count;
    proposal.owner = ctx.accounts.user.key();
    proposal.title = title;
    proposal.description = description;
    proposal.amount_requested = amount_requested;
    proposal.status = ProposalStatus::Pending;
    proposal.vote_count = 0;
    proposal.bump = ctx.bumps.proposal;
    proposal.created_at = Clock::get()?.unix_timestamp;
    proposal.finalized_at = 0;

    proposal.funding_approvals = Vec::new();

    ctx.accounts.user_profile.proposal_count += 1;
    Ok(())
}

