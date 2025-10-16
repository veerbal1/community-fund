use crate::errors::ErrorCode;
use crate::state::{Proposal, VoteAccount};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(proposal_id: u64, owner: Pubkey)]
pub struct VoteOnProposal<'info> {
    #[account(init, seeds=[b"vote", user.key().as_ref(), owner.as_ref(), proposal_id.to_be_bytes().as_ref()], bump, payer = user, space = 8 + VoteAccount::INIT_SPACE)]
    pub vote_account: Account<'info, VoteAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [
        b"proposal",
        owner.as_ref(),
        proposal_id.to_be_bytes().as_ref()
    ], bump = proposal.bump)]
    pub proposal: Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
}

pub fn vote_on_proposal(
    ctx: Context<VoteOnProposal>,
    _proposal_id: u64,
    _owner: Pubkey,
    token_weight: u64,
) -> Result<()> {
    let vote = &mut ctx.accounts.vote_account;
    let current_time = Clock::get()?.unix_timestamp;
    let proposal_created_at = ctx.accounts.proposal.created_at;
    require!(
        current_time - proposal_created_at < 604800,
        ErrorCode::VotingExpired
    );
    vote.bump = ctx.bumps.vote_account;
    vote.timestamp = current_time;
    vote.token_weight = token_weight;

    let proposal = &mut ctx.accounts.proposal;
    proposal.vote_count += token_weight;
    Ok(())
}
