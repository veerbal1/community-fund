use anchor_lang::prelude::*;
use crate::state::Proposal;

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct UpdateProposal<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"proposal", owner.key().as_ref(), proposal_id.to_be_bytes().as_ref()],
        bump = proposal.bump,
        has_one = owner
    )]
    pub proposal: Account<'info, Proposal>,
}

pub fn update_proposal(
    ctx: Context<UpdateProposal>,
    _proposal_id: u64,
    new_title: String,
    new_description: String,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    proposal.title = new_title;
    proposal.description = new_description;
    Ok(())
}

