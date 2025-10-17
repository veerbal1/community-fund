// Combined Rust source - all modules inlined
// Generated for LLM sharing - macros NOT expanded

use anchor_lang::prelude::*;

declare_id!("6gE2epaU3z6ySCsnwY9fvWyCCTnUMZ97c4jkzvPg52St");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod community_fund {
    use super::*;

    pub fn initialize_admin(
        ctx: Context<InitializeAdmin>,
        admin2: Pubkey,
        admin3: Pubkey,
    ) -> Result<()> {
        instructions::admin::initialize_admin(ctx, admin2, admin3)
    }

    pub fn transfer_admin(ctx: Context<TransferAdmin>, old_admin: Pubkey, new_admin: Pubkey) -> Result<()> {
        instructions::admin::transfer_admin(ctx, old_admin, new_admin)
    }

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        instructions::proposal::initialize_user(ctx)
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        amount_requested: u64,
    ) -> Result<()> {
        instructions::proposal::create_proposal(ctx, title, description, amount_requested)
    }

    pub fn update_proposal(
        ctx: Context<UpdateProposal>,
        proposal_id: u64,
        new_title: String,
        new_description: String,
    ) -> Result<()> {
        instructions::proposal::update_proposal(ctx, proposal_id, new_title, new_description)
    }

    pub fn reject_proposal(
        ctx: Context<RejectProposal>,
        proposal_id: u64,
        owner: Pubkey,
    ) -> Result<()> {
        instructions::proposal::reject_proposal(ctx, proposal_id, owner)
    }

    pub fn approve_funding(
        ctx: Context<ApproveFunding>,
        proposal_id: u64,
        owner: Pubkey,
    ) -> Result<()> {
        instructions::proposal::approve_funding(ctx, proposal_id, owner)
    }

    pub fn vote_on_proposal(
        ctx: Context<VoteOnProposal>,
        proposal_id: u64,
        owner: Pubkey,
        token_weight: u64
    ) -> Result<()> {
        instructions::proposal::vote_on_proposal(ctx, proposal_id, owner, token_weight)
    }
}

// ===== errors.rs =====
use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the program's upgrade authority can perform this action")]
    Unauthorized,

    #[msg("Invalid program data account provided")]
    InvalidProgramData,

    #[msg("Failed to extract upgrade authority from program data")]
    InvalidUpgradeAuthority,

    #[msg("This admin has already approved this proposal")]
    AlreadyApproved,

    #[msg("Voting Expired")]
    VotingExpired
}

// ===== state.rs =====
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admins: [Pubkey; 3],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub id: u64,
    pub owner: Pubkey,
    #[max_len(50)]
    pub title: String,
    #[max_len(200)]
    pub description: String,
    pub amount_requested: u64,
    pub status: ProposalStatus,
    pub created_at: i64,
    pub vote_count: u64,
    pub bump: u8,

    #[max_len(3)]
    pub funding_approvals: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProposalStatus {
    Pending,
    Approved,
    Rejected,
}

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub proposal_count: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteAccount {
    pub timestamp: i64,
    pub token_weight: u64,
    pub bump: u8,
}

// ===== instructions/mod.rs =====
// pub mod admin;
// pub mod proposal;

pub use admin::*;
pub use proposal::*;


// ===== instructions/admin/mod.rs =====
// pub mod initialize;
// pub mod transfer;

pub use initialize::*;
pub use transfer::*;


// ===== instructions/admin/initialize.rs =====
use anchor_lang::prelude::*;
// use anchor_lang::solana_program::bpf_loader_upgradeable;  // Commented out for local testing
use crate::state::Config;
// use crate::errors::ErrorCode;  // Commented out for local testing

#[derive(Accounts)]
pub struct InitializeAdmin<'info> {
    /// Config account - stores admin info
    #[account(
        init,
        seeds = [b"config"],
        bump,
        payer = user,
        space = 8 + Config::INIT_SPACE
    )]
    pub config: Account<'info, Config>,

    /// User who is trying to initialize (must be upgrade authority)
    #[account(mut)]
    pub user: Signer<'info>,

    /// Program data account - contains upgrade authority
    /// CHECK: We manually verify this is the correct program data account
    pub program_data: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_admin(ctx: Context<InitializeAdmin>, admin2: Pubkey, admin3: Pubkey) -> Result<()> {
    // COMMENTED OUT FOR LOCAL TESTING
    // // Step 1: Derive expected program_data address from this executing program
    // let program_id = ctx.program_id;
    // let (expected_program_data, _bump) = Pubkey::find_program_address(
    //     &[program_id.as_ref()],
    //     &bpf_loader_upgradeable::id()
    // );

    // // Step 2: Verify passed program_data matches expected
    // require!(
    //     ctx.accounts.program_data.key() == expected_program_data,
    //     ErrorCode::InvalidProgramData
    // );

    // // Step 3: Extract upgrade authority from program_data
    // let program_data = ctx.accounts.program_data.try_borrow_data()?;

    // // Program data structure:
    // // Bytes 0-3: Account type
    // // Bytes 4-12: Slot
    // // Bytes 13-45: Upgrade Authority (32 bytes pubkey)
    // // Bytes 46+: Executable code

    // require!(
    //     program_data.len() >= 45,
    //     ErrorCode::InvalidUpgradeAuthority
    // );

    // let upgrade_authority_bytes = &program_data[13..45];
    // let upgrade_authority = Pubkey::new_from_array(
    //     upgrade_authority_bytes
    //         .try_into()
    //         .map_err(|_| ErrorCode::InvalidUpgradeAuthority)?
    // );

    // // Step 4: Verify caller is the upgrade authority
    // require!(
    //     ctx.accounts.user.key() == upgrade_authority,
    //     ErrorCode::Unauthorized
    // );

    // Step 5: Set admin
    let config = &mut ctx.accounts.config;
    config.admins[0] = ctx.accounts.user.key();
    config.admins[1] = admin2;
    config.admins[2] = admin3;
    config.bump = ctx.bumps.config;
    
    msg!("Admin initialized: {}", config.admins.len());
    
    Ok(())
}


// ===== instructions/admin/transfer.rs =====
use anchor_lang::prelude::*;
use crate::state::Config;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    /// Config account
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// Current admin (must sign)
    #[account(mut)]
    pub current_admin: Signer<'info>,
}

pub fn transfer_admin(
    ctx: Context<TransferAdmin>,
    old_admin: Pubkey,
    new_admin: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    // Verify current admin is calling and is in admins array
    let current_admin = ctx.accounts.current_admin.key();
    require!(
        config.admins.contains(&current_admin),
        ErrorCode::Unauthorized
    );
    
    // Find and replace the old admin with new admin in the array
    let mut admin_replaced = false;
    for i in 0..config.admins.len() {
        if config.admins[i] == old_admin {
            config.admins[i] = new_admin;
            admin_replaced = true;
            break;
        }
    }
    
    require!(admin_replaced, ErrorCode::Unauthorized);
    
    msg!("Admin transferred from {} to {}", old_admin, new_admin);
    
    Ok(())
}


// ===== instructions/proposal/mod.rs =====
// pub mod create;
// pub mod initialize_user;
// pub mod reject;
// pub mod update;
// pub mod approve_funding;
// pub mod vote;

pub use create::*;
pub use initialize_user::*;
pub use reject::*;
pub use update::*;
pub use approve_funding::*;
pub use vote::*;

// ===== instructions/proposal/create.rs =====
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

    proposal.funding_approvals = Vec::new();

    ctx.accounts.user_profile.proposal_count += 1;
    Ok(())
}


// ===== instructions/proposal/initialize_user.rs =====
use anchor_lang::prelude::*;
use crate::state::UserProfile;

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        seeds = [b"user_profile", user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    user_profile.proposal_count = 0;
    user_profile.bump = ctx.bumps.user_profile;
    Ok(())
}


// ===== instructions/proposal/reject.rs =====
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


// ===== instructions/proposal/update.rs =====
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


// ===== instructions/proposal/approve_funding.rs =====
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
// ===== instructions/proposal/vote.rs =====
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
