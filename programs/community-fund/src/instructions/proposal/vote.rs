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

pub fn vote_on_proposal(ctx: Context<VoteOnProposal>, _proposal_id: u64, _owner: Pubkey) -> Result<()> {
    let vote = &mut ctx.accounts.vote_account;
    vote.bump = ctx.bumps.vote_account;
    vote.timestamp = Clock::get()?.unix_timestamp;

    let proposal = &mut ctx.accounts.proposal;
    proposal.vote_count += 1;
    Ok(())
}
