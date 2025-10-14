use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::state::{Config, Proposal, ProposalStatus};


#[derive(Accounts)]
#[instruction(proposal_id: u64, owner: Pubkey)]
pub struct ApproveFunding<'info> {
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

pub fn approve_funding(
    ctx: Context<ApproveFunding>,
    _proposal_id: u64,
    _owner: Pubkey,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let admin = ctx.accounts.admin.key();
    let config = &ctx.accounts.config;

    // Step 1: Verify admin is valid
    require!(config.admins.contains(&admin), ErrorCode::Unauthorized);

    // Step 2: Check amount threshold - 1000 SOL = 1000 * 10^9 lamports
    const MULTISIG_THRESHOLD: u64 = 1_000_000_000_000; // 1000 SOL in lamports

    if proposal.amount_requested >= MULTISIG_THRESHOLD {
        // Large amount: Need 2-of-3 multisig
        
        // Check duplicate
        require!(
            !proposal.funding_approvals.contains(&admin),
            ErrorCode::AlreadyApproved
        );
        
        // Add approval
        proposal.funding_approvals.push(admin);
        
        // Check if threshold met
        if proposal.funding_approvals.len() >= 2 {
            proposal.status = ProposalStatus::Approved;
            msg!("Proposal approved with 2-of-3 multisig");
        } else {
            msg!("1 of 2 approvals received");
        }
        
    } else {
        // Small amount: Single admin can approve directly
        proposal.status = ProposalStatus::Approved;
        msg!("Small amount - approved by single admin");
    }
    
    Ok(())
}