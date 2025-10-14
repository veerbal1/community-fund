use anchor_lang::prelude::*;
use crate::state::{Config, Proposal, ProposalStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(proposal_id: u64, owner: Pubkey)]
pub struct RejectProposal<'info> {
    #[account(
        mut,
        seeds = [b"proposal", owner.as_ref(), proposal_id.to_be_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
}

pub fn reject_proposal(
    ctx: Context<RejectProposal>,
    _proposal_id: u64,
    owner: Pubkey,
) -> Result<()> {
    require!(owner == ctx.accounts.proposal.owner, ErrorCode::Unauthorized);
    
    // Verify admin is authorized
    let admin = ctx.accounts.admin.key();
    require!(
        ctx.accounts.config.admins.contains(&admin),
        ErrorCode::Unauthorized
    );
    
    let proposal = &mut ctx.accounts.proposal;
    proposal.status = ProposalStatus::Rejected;
    Ok(())
}

