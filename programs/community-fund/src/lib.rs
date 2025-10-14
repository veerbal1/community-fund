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
}
